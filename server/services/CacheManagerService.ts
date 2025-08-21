/**
 * Cache Manager Service
 * High-level cache management with intelligent invalidation strategies
 */

import { redisCacheService } from './RedisCacheService';
import { errorTrackingService } from './ErrorTrackingService';

export interface CacheStrategy {
  ttl: number;
  invalidateOnUpdate: boolean;
  invalidatePatterns: string[];
  refreshThreshold?: number; // Refresh cache when TTL is below this percentage
}

export interface CacheKey {
  prefix: string;
  identifier: string;
  version?: string;
}

export class CacheManagerService {
  private strategies = new Map<string, CacheStrategy>();
  private refreshQueue = new Set<string>();

  constructor() {
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default caching strategies for common data types
   */
  private initializeDefaultStrategies(): void {
    // Employee data - moderate TTL, invalidate on updates
    this.setStrategy('employees', {
      ttl: 1800, // 30 minutes
      invalidateOnUpdate: true,
      invalidatePatterns: ['employees:*', 'payroll:*'],
      refreshThreshold: 20 // Refresh when 20% TTL remaining
    });

    // Payroll calculations - long TTL, version-based invalidation
    this.setStrategy('payroll', {
      ttl: 7200, // 2 hours
      invalidateOnUpdate: true,
      invalidatePatterns: ['payroll:*', 'calculations:*'],
      refreshThreshold: 10
    });

    // Company settings - very long TTL
    this.setStrategy('company', {
      ttl: 86400, // 24 hours
      invalidateOnUpdate: true,
      invalidatePatterns: ['company:*', 'settings:*']
    });

    // Collective agreements - long TTL, rarely change
    this.setStrategy('agreements', {
      ttl: 43200, // 12 hours
      invalidateOnUpdate: true,
      invalidatePatterns: ['agreements:*', 'cba:*']
    });

    // User sessions - short TTL, security sensitive
    this.setStrategy('sessions', {
      ttl: 900, // 15 minutes
      invalidateOnUpdate: false,
      invalidatePatterns: ['sessions:*']
    });

    // Government system status - moderate TTL
    this.setStrategy('government', {
      ttl: 1800, // 30 minutes
      invalidateOnUpdate: false,
      invalidatePatterns: ['government:*', 'ergani:*']
    });

    // Reports and analytics - long TTL
    this.setStrategy('reports', {
      ttl: 3600, // 1 hour
      invalidateOnUpdate: true,
      invalidatePatterns: ['reports:*', 'analytics:*']
    });

    console.log('✅ Cache strategies initialized');
  }

  /**
   * Set caching strategy for a data type
   */
  setStrategy(dataType: string, strategy: CacheStrategy): void {
    this.strategies.set(dataType, strategy);
  }

  /**
   * Get caching strategy for a data type
   */
  getStrategy(dataType: string): CacheStrategy | undefined {
    return this.strategies.get(dataType);
  }

  /**
   * Generate cache key
   */
  generateKey(prefix: string, identifier: string, version?: string): string {
    const baseKey = `${prefix}:${identifier}`;
    return version ? `${baseKey}:v${version}` : baseKey;
  }

  /**
   * Get cached data with strategy
   */
  async get<T>(dataType: string, identifier: string, version?: string): Promise<T | null> {
    try {
      const key = this.generateKey(dataType, identifier, version);
      const strategy = this.getStrategy(dataType);
      
      const data = await redisCacheService.get<T>(key);
      
      // Check if we should refresh this cache proactively
      if (data && strategy?.refreshThreshold) {
        const ttl = await redisCacheService.ttl(key);
        const originalTtl = strategy.ttl;
        const remainingPercentage = (ttl / originalTtl) * 100;
        
        if (remainingPercentage <= strategy.refreshThreshold) {
          this.refreshQueue.add(key);
        }
      }
      
      return data;

    } catch (error) {
      console.error(`Cache get error for ${dataType}:${identifier}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with strategy
   */
  async set(dataType: string, identifier: string, data: any, version?: string): Promise<boolean> {
    try {
      const key = this.generateKey(dataType, identifier, version);
      const strategy = this.getStrategy(dataType) || { ttl: 3600, invalidateOnUpdate: false, invalidatePatterns: [] };
      
      return await redisCacheService.set(key, data, strategy.ttl);

    } catch (error) {
      console.error(`Cache set error for ${dataType}:${identifier}:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache for data type and identifier
   */
  async invalidate(dataType: string, identifier: string, version?: string): Promise<boolean> {
    try {
      const key = this.generateKey(dataType, identifier, version);
      const strategy = this.getStrategy(dataType);
      
      let deletedCount = 0;
      
      // Delete the specific key
      if (await redisCacheService.del(key)) {
        deletedCount++;
      }
      
      // Invalidate related patterns if strategy defines them
      if (strategy?.invalidatePatterns) {
        for (const pattern of strategy.invalidatePatterns) {
          const patternKey = pattern.replace('*', identifier);
          const deleted = await redisCacheService.delPattern(patternKey);
          deletedCount += deleted;
        }
      }
      
      console.log(`Cache invalidated for ${dataType}:${identifier}, deleted ${deletedCount} keys`);
      return deletedCount > 0;

    } catch (error) {
      console.error(`Cache invalidate error for ${dataType}:${identifier}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all cache for a data type
   */
  async invalidateDataType(dataType: string): Promise<number> {
    try {
      const pattern = `${dataType}:*`;
      const deletedCount = await redisCacheService.delPattern(pattern);
      
      console.log(`Cache invalidated for data type ${dataType}, deleted ${deletedCount} keys`);
      return deletedCount;

    } catch (error) {
      console.error(`Cache invalidate data type error for ${dataType}:`, error);
      return 0;
    }
  }

  /**
   * Cache wrapper with automatic strategy application
   */
  async cached<T>(
    dataType: string,
    identifier: string,
    fetchFunction: () => Promise<T>,
    version?: string
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(dataType, identifier, version);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetchFunction();
    
    // Cache the result with strategy
    await this.set(dataType, identifier, freshData, version);
    
    return freshData;
  }

  /**
   * Warm up cache for critical data
   */
  async warmUp(dataType: string, identifiers: string[], fetchFunction: (id: string) => Promise<any>): Promise<void> {
    try {
      console.log(`Warming up cache for ${dataType} with ${identifiers.length} items`);
      
      const promises = identifiers.map(async (identifier) => {
        try {
          const exists = await redisCacheService.exists(this.generateKey(dataType, identifier));
          if (!exists) {
            const data = await fetchFunction(identifier);
            await this.set(dataType, identifier, data);
          }
        } catch (error) {
          console.error(`Cache warm-up error for ${dataType}:${identifier}:`, error);
        }
      });
      
      await Promise.allSettled(promises);
      console.log(`Cache warm-up completed for ${dataType}`);

    } catch (error) {
      console.error(`Cache warm-up error for ${dataType}:`, error);
      errorTrackingService.captureError(error as Error, {
        tags: { component: 'cache_manager', operation: 'warm_up' },
        extra: { dataType, identifierCount: identifiers.length }
      });
    }
  }

  /**
   * Get cache statistics by data type
   */
  async getStatsByDataType(): Promise<Map<string, { keyCount: number; totalSize: number }>> {
    const stats = new Map<string, { keyCount: number; totalSize: number }>();
    
    for (const dataType of this.strategies.keys()) {
      try {
        const keys = await redisCacheService.keys(`${dataType}:*`);
        stats.set(dataType, {
          keyCount: keys.length,
          totalSize: 0 // Would need Redis MEMORY USAGE command for accurate size
        });
      } catch (error) {
        console.error(`Error getting stats for ${dataType}:`, error);
      }
    }
    
    return stats;
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpired(): Promise<number> {
    let cleanedCount = 0;
    
    for (const dataType of this.strategies.keys()) {
      try {
        const keys = await redisCacheService.keys(`${dataType}:*`);
        
        for (const key of keys) {
          const ttl = await redisCacheService.ttl(key);
          if (ttl === -2) { // Key doesn't exist (expired)
            cleanedCount++;
          }
        }
      } catch (error) {
        console.error(`Error cleaning expired cache for ${dataType}:`, error);
      }
    }
    
    return cleanedCount;
  }

  /**
   * Refresh cache entries in the refresh queue
   */
  async processRefreshQueue(fetchFunctions: Map<string, () => Promise<any>>): Promise<void> {
    const keysToRefresh = Array.from(this.refreshQueue);
    this.refreshQueue.clear();
    
    for (const key of keysToRefresh) {
      try {
        const [dataType, identifier] = key.split(':');
        const fetchFunction = fetchFunctions.get(dataType);
        
        if (fetchFunction) {
          const freshData = await fetchFunction();
          await this.set(dataType, identifier, freshData);
          console.log(`Refreshed cache for ${key}`);
        }
      } catch (error) {
        console.error(`Error refreshing cache for ${key}:`, error);
      }
    }
  }

  /**
   * Get all cache strategies
   */
  getStrategies(): Map<string, CacheStrategy> {
    return new Map(this.strategies);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const redisHealth = await redisCacheService.healthCheck();
      const stats = await this.getStatsByDataType();
      
      return {
        status: redisHealth.status,
        details: {
          redis: redisHealth.details,
          strategies: Array.from(this.strategies.keys()),
          dataTypeStats: Object.fromEntries(stats),
          refreshQueueSize: this.refreshQueue.size
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          strategies: Array.from(this.strategies.keys())
        }
      };
    }
  }
}

// Export singleton instance
export const cacheManagerService = new CacheManagerService();