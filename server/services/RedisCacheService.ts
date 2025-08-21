/**
 * Redis Caching Service
 * High-performance caching layer with intelligent invalidation and monitoring
 */

import Redis from 'ioredis';
import { envConfig } from '../lib/envConfig';
import { errorTrackingService } from './ErrorTrackingService';

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  avgResponseTime: number;
  memoryUsage: number;
  connectedClients: number;
  keysCount: number;
  lastActivity: Date;
}

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTtl: number;
  maxRetries: number;
  retryDelayOnFailover: number;
  enableOfflineQueue: boolean;
  maxRetriesPerRequest: number;
}

export interface CacheItem {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export class RedisCacheService {
  private redis!: Redis;
  private config!: CacheConfig;
  private metrics!: CacheMetrics;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private cacheHistory: Array<{ timestamp: Date; operation: string; key?: string; hit?: boolean }> = [];

  constructor() {
    this.config = this.getOptimalCacheConfig();
    this.initializeMetrics();
    // Skip Redis initialization in development - use fallback mode
    if (process.env.NODE_ENV === 'production') {
      this.initializeRedis();
      this.startMonitoring();
    } else {
      console.log('🚀 Redis cache service running in fallback mode (no Redis)');
      this.isConnected = false;
    }
  }

  /**
   * Get optimal cache configuration
   */
  private getOptimalCacheConfig(): CacheConfig {
    const isProduction = envConfig.NODE_ENV === 'production';
    
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: `payrollsync:${envConfig.NODE_ENV}:`,
      defaultTtl: isProduction ? 3600 : 300, // 1 hour prod, 5 minutes dev
      maxRetries: 3,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3
    };
  }

  /**
   * Initialize cache metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      connectedClients: 0,
      keysCount: 0,
      lastActivity: new Date()
    };
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    try {
      const redisOptions = {
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: 1, // Reduce retries to minimize noise
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        enableOfflineQueue: false, // Disable offline queue
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        enableReadyCheck: true
      };

      this.redis = new Redis(redisOptions);

      // Set up event listeners
      this.setupRedisEventListeners();

      // Attempt connection
      this.connectToRedis();

      console.log('✅ Redis cache service initialized', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        environment: envConfig.NODE_ENV
      });

    } catch (error) {
      console.error('❌ Failed to initialize Redis cache service:', error);
      errorTrackingService.captureError(error as Error, {
        tags: { component: 'redis_cache' },
        extra: { config: this.config }
      });
    }
  }

  /**
   * Set up Redis event listeners
   */
  private setupRedisEventListeners(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logCacheOperation('redis_connected');
      console.log('✅ Connected to Redis');
    });

    this.redis.on('ready', () => {
      this.logCacheOperation('redis_ready');
      console.log('✅ Redis is ready');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      this.logCacheOperation('redis_error', undefined, undefined, { error: error.message });
      console.error('❌ Redis error:', error);
      errorTrackingService.captureError(error, {
        tags: { component: 'redis_cache', event: 'connection_error' }
      });
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logCacheOperation('redis_disconnected');
      console.warn('⚠️ Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logCacheOperation('redis_reconnecting');
      console.log('🔄 Reconnecting to Redis...');
    });
  }

  /**
   * Connect to Redis with error handling
   */
  private async connectToRedis(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      console.warn('⚠️ Redis connection failed, running in fallback mode. Cache will be disabled.');
      this.isConnected = false;
      // Don't rethrow the error - just continue without Redis
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.updateCacheMetrics();
    }, 10000); // Every 10 seconds

    console.log('⏰ Redis cache monitoring started');
  }

  /**
   * Update cache metrics
   */
  private async updateCacheMetrics(): Promise<void> {
    if (!this.isConnected) return;

    try {
      // Get Redis info
      const info = await this.redis.info();
      const memoryInfo = this.parseRedisInfo(info, 'memory');
      const statsInfo = this.parseRedisInfo(info, 'stats');
      const clientsInfo = this.parseRedisInfo(info, 'clients');

      // Update metrics
      this.metrics.memoryUsage = parseInt(memoryInfo.used_memory || '0');
      this.metrics.connectedClients = parseInt(clientsInfo.connected_clients || '0');
      
      // Get key count
      this.metrics.keysCount = await this.redis.dbsize();

      // Calculate hit rate
      if (this.metrics.totalRequests > 0) {
        this.metrics.hitRate = (this.metrics.hits / this.metrics.totalRequests) * 100;
      }

      this.metrics.lastActivity = new Date();

    } catch (error) {
      console.error('Failed to update cache metrics:', error);
    }
  }

  /**
   * Parse Redis INFO output
   */
  private parseRedisInfo(info: string, section: string): Record<string, string> {
    const lines = info.split('\r\n');
    const sectionData: Record<string, string> = {};
    let inSection = false;

    for (const line of lines) {
      if (line.startsWith(`# ${section}`)) {
        inSection = true;
        continue;
      }
      
      if (line.startsWith('#') && inSection) {
        break;
      }
      
      if (inSection && line.includes(':')) {
        const [key, value] = line.split(':');
        sectionData[key] = value;
      }
    }

    return sectionData;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      if (!this.isConnected) {
        this.recordCacheMiss(key, performance.now() - startTime);
        return null;
      }

      const value = await this.redis.get(key);
      const duration = performance.now() - startTime;

      if (value !== null) {
        this.recordCacheHit(key, duration);
        return JSON.parse(value);
      } else {
        this.recordCacheMiss(key, duration);
        return null;
      }

    } catch (error) {
      this.recordCacheMiss(key, performance.now() - startTime);
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      if (!this.isConnected) {
        return false;
      }

      const serializedValue = JSON.stringify(value);
      const cacheTtl = ttl || this.config.defaultTtl;

      await this.redis.setex(key, cacheTtl, serializedValue);
      
      const duration = performance.now() - startTime;
      this.logCacheOperation('set', key, undefined, { ttl: cacheTtl, duration });
      
      return true;

    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.logCacheOperation('set_error', key, undefined, { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const result = await this.redis.del(key);
      this.logCacheOperation('delete', key, undefined, { deleted: result > 0 });
      
      return result > 0;

    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      if (!this.isConnected) return 0;

      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await this.redis.del(...keys);
      this.logCacheOperation('delete_pattern', pattern, undefined, { deleted: result, keysCount: keys.length });
      
      return result;

    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const result = await this.redis.exists(key);
      return result === 1;

    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) return -1;
      
      return await this.redis.ttl(key);

    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Set expiration for key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      const result = await this.redis.expire(key, seconds);
      return result === 1;

    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) return [];
      
      return await this.redis.keys(pattern);

    } catch (error) {
      console.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Flush all cache data
   */
  async flushAll(): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      
      await this.redis.flushdb();
      this.logCacheOperation('flush_all');
      
      return true;

    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Cache wrapper for functions
   */
  async cached<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetchFunction();
    
    // Cache the result
    await this.set(key, freshData, ttl);
    
    return freshData;
  }

  /**
   * Record cache hit
   */
  private recordCacheHit(key: string, duration: number): void {
    this.metrics.hits++;
    this.metrics.totalRequests++;
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime + duration) / 2;
    this.metrics.lastActivity = new Date();
    this.logCacheOperation('hit', key, true, { duration });
  }

  /**
   * Record cache miss
   */
  private recordCacheMiss(key: string, duration: number): void {
    this.metrics.misses++;
    this.metrics.totalRequests++;
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime + duration) / 2;
    this.metrics.lastActivity = new Date();
    this.logCacheOperation('miss', key, false, { duration });
  }

  /**
   * Log cache operation
   */
  private logCacheOperation(operation: string, key?: string, hit?: boolean, details?: any): void {
    this.cacheHistory.push({
      timestamp: new Date(),
      operation,
      key,
      hit,
      ...details
    });

    // Keep only last 200 operations
    if (this.cacheHistory.length > 200) {
      this.cacheHistory = this.cacheHistory.slice(-200);
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Get cache history
   */
  getCacheHistory(): Array<{ timestamp: Date; operation: string; key?: string; hit?: boolean }> {
    return [...this.cacheHistory];
  }

  /**
   * Get cache info
   */
  async getCacheInfo(): Promise<any> {
    if (!this.isConnected) {
      return { connected: false, error: 'Not connected to Redis' };
    }

    try {
      const info = await this.redis.info();
      const keyCount = await this.redis.dbsize();
      
      return {
        connected: true,
        info: this.parseRedisInfo(info, 'server'),
        memory: this.parseRedisInfo(info, 'memory'),
        stats: this.parseRedisInfo(info, 'stats'),
        keyCount
      };

    } catch (error) {
      return { connected: false, error: (error as Error).message };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          details: {
            connected: false,
            error: 'Not connected to Redis'
          }
        };
      }

      // Test connection with ping
      const startTime = performance.now();
      await this.redis.ping();
      const responseTime = performance.now() - startTime;

      const metrics = this.getMetrics();
      const isHealthy = responseTime < 100 && metrics.hitRate > 20; // Good response time and reasonable hit rate

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          connected: true,
          responseTime,
          metrics,
          config: this.config,
          recentOperations: this.cacheHistory.slice(-5)
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: (error as Error).message,
          metrics: this.getMetrics()
        }
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      if (this.isConnected) {
        await this.redis.quit();
      }

      this.logCacheOperation('shutdown');
      console.log('✅ Redis cache service gracefully shutdown');

    } catch (error) {
      console.error('❌ Error during cache shutdown:', error);
      errorTrackingService.captureError(error as Error, {
        tags: { component: 'redis_cache', event: 'shutdown_error' }
      });
    }
  }
}

// Export singleton instance
export const redisCacheService = new RedisCacheService();