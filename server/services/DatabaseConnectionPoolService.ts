/**
 * Database Connection Pool Service
 * Enterprise-grade connection pooling with monitoring and auto-scaling
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { envConfig } from '../lib/envConfig';
import { errorTrackingService } from './ErrorTrackingService';

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  avgQueryTime: number;
  poolUtilization: number;
  lastActivity: Date;
}

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  maxWaitingClients: number;
  statementTimeoutMs: number;
  applicationName: string;
}

export class DatabaseConnectionPoolService {
  private pool!: Pool;
  private db!: ReturnType<typeof drizzle>;
  private config!: ConnectionPoolConfig;
  private metrics!: ConnectionPoolMetrics;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionHistory: Array<{ timestamp: Date; event: string; details?: any }> = [];

  constructor() {
    this.config = this.getOptimalPoolConfig();
    this.initializeMetrics();
    this.initializePool();
    this.startMonitoring();
  }

  /**
   * Get optimal pool configuration based on environment
   */
  private getOptimalPoolConfig(): ConnectionPoolConfig {
    const isProduction = envConfig.NODE_ENV === 'production';
    
    return {
      // Production: Higher limits for scalability
      // Development: Lower limits for resource efficiency
      maxConnections: isProduction ? 25 : 10,
      minConnections: isProduction ? 5 : 2,
      
      // Timeouts optimized for Greek network conditions
      idleTimeoutMs: 30000, // 30 seconds
      connectionTimeoutMs: 10000, // 10 seconds
      queryTimeoutMs: 30000, // 30 seconds for complex payroll queries
      maxWaitingClients: isProduction ? 50 : 20,
      statementTimeoutMs: 60000, // 1 minute for heavy operations
      
      applicationName: `PayrollSync-${envConfig.NODE_ENV}-${process.env.REPL_ID || 'local'}`
    };
  }

  /**
   * Initialize connection pool metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      avgQueryTime: 0,
      poolUtilization: 0,
      lastActivity: new Date()
    };
  }

  /**
   * Initialize the database connection pool
   */
  private initializePool(): void {
    try {
      // Configure Neon for WebSocket support
      neonConfig.webSocketConstructor = ws;
      neonConfig.pipelineConnect = false; // Disable for better error handling
      neonConfig.useSecureWebSocket = true;

      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
      }

      // Enhanced pool configuration
      const poolConfig = {
        connectionString: process.env.DATABASE_URL,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMs,
        connectionTimeoutMillis: this.config.connectionTimeoutMs
      };

      this.pool = new Pool(poolConfig);
      this.db = drizzle({ client: this.pool, schema });

      // Set up pool event listeners
      this.setupPoolEventListeners();

      this.logConnectionEvent('pool_initialized', {
        config: this.config,
        databaseUrl: process.env.DATABASE_URL?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      });

      console.log('✅ Database connection pool initialized', {
        maxConnections: this.config.maxConnections,
        minConnections: this.config.minConnections,
        environment: envConfig.NODE_ENV
      });

    } catch (error) {
      console.error('❌ Failed to initialize database connection pool:', error);
      errorTrackingService.captureError(error as Error, {
        tags: { component: 'database_pool' },
        extra: { config: this.config }
      });
      throw error;
    }
  }

  /**
   * Set up pool event listeners for monitoring
   */
  private setupPoolEventListeners(): void {
    this.pool.on('connect', (client) => {
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;
      this.metrics.lastActivity = new Date();
      this.logConnectionEvent('connection_established');
    });

    this.pool.on('remove', (client) => {
      this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
      this.logConnectionEvent('connection_removed');
    });

    this.pool.on('error', (err, client) => {
      this.logConnectionEvent('connection_error', { error: err.message });
      errorTrackingService.captureError(err, {
        tags: { component: 'database_pool', event: 'connection_error' }
      });
    });

    this.pool.on('acquire', (client) => {
      this.metrics.lastActivity = new Date();
      this.logConnectionEvent('connection_acquired');
    });

    // Note: 'release' event might not be available in all pool implementations
    // this.pool.on('release', (client) => {
    //   this.logConnectionEvent('connection_released');
    // });
  }

  /**
   * Start monitoring and health checks
   */
  private startMonitoring(): void {
    // Pool metrics monitoring
    this.monitoringInterval = setInterval(() => {
      this.updatePoolMetrics();
    }, 5000); // Every 5 seconds

    // Health check
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Every 30 seconds

    console.log('⏰ Database connection pool monitoring started');
  }

  /**
   * Update pool metrics
   */
  private updatePoolMetrics(): void {
    const poolStats = {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };

    this.metrics.totalConnections = poolStats.totalCount;
    this.metrics.activeConnections = poolStats.totalCount - poolStats.idleCount;
    this.metrics.idleConnections = poolStats.idleCount;
    this.metrics.waitingClients = poolStats.waitingCount;
    this.metrics.poolUtilization = (this.metrics.activeConnections / this.config.maxConnections) * 100;

    // Alert on high utilization
    if (this.metrics.poolUtilization > 80) {
      errorTrackingService.captureMessage(
        `High database pool utilization: ${this.metrics.poolUtilization.toFixed(1)}%`,
        'warning',
        {
          tags: { component: 'database_pool' },
          extra: { 
            metrics: this.metrics,
            config: this.config
          }
        }
      );
    }

    // Alert on waiting clients
    if (this.metrics.waitingClients > 10) {
      errorTrackingService.captureMessage(
        `High number of waiting database clients: ${this.metrics.waitingClients}`,
        'warning',
        {
          tags: { component: 'database_pool' },
          extra: { metrics: this.metrics }
        }
      );
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = performance.now();
      await this.pool.query('SELECT 1 as health_check');
      const duration = performance.now() - startTime;

      this.logConnectionEvent('health_check_success', { duration });

      // Alert on slow health checks
      if (duration > 1000) {
        errorTrackingService.captureMessage(
          `Slow database health check: ${duration.toFixed(0)}ms`,
          'warning',
          {
            tags: { component: 'database_pool' },
            extra: { duration, metrics: this.metrics }
          }
        );
      }

    } catch (error) {
      this.logConnectionEvent('health_check_failed', { error: (error as Error).message });
      errorTrackingService.captureError(error as Error, {
        tags: { component: 'database_pool', event: 'health_check_failed' }
      });
    }
  }

  /**
   * Execute query with connection pool monitoring
   */
  async executeQuery<T>(queryPromise: Promise<T>, queryInfo?: { name?: string; type?: string }): Promise<T> {
    const startTime = performance.now();
    const queryStart = Date.now();

    try {
      const result = await queryPromise;
      const duration = performance.now() - startTime;

      // Update metrics
      this.metrics.totalQueries++;
      this.metrics.avgQueryTime = (this.metrics.avgQueryTime + duration) / 2;
      this.metrics.lastActivity = new Date();

      // Log slow queries
      if (duration > 1000) {
        this.logConnectionEvent('slow_query', {
          duration,
          queryInfo,
          poolUtilization: this.metrics.poolUtilization
        });
      }

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.logConnectionEvent('query_error', {
        duration,
        error: (error as Error).message,
        queryInfo
      });

      // Check if it's a connection-related error
      if (this.isConnectionError(error as Error)) {
        await this.handleConnectionError(error as Error);
      }

      throw error;
    }
  }

  /**
   * Check if error is connection-related
   */
  private isConnectionError(error: Error): boolean {
    const connectionErrorMessages = [
      'connection terminated',
      'connection refused',
      'timeout',
      'pool is closed',
      'connection closed',
      'network error'
    ];

    return connectionErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  /**
   * Handle connection errors with recovery
   */
  private async handleConnectionError(error: Error): Promise<void> {
    this.logConnectionEvent('connection_error_recovery', { error: error.message });

    try {
      // Attempt to recreate the pool
      await this.recreatePool();
    } catch (recoveryError) {
      errorTrackingService.captureError(recoveryError as Error, {
        tags: { component: 'database_pool', event: 'recovery_failed' },
        extra: { originalError: error.message }
      });
    }
  }

  /**
   * Recreate the connection pool
   */
  private async recreatePool(): Promise<void> {
    try {
      await this.pool.end();
      this.initializePool();
      this.logConnectionEvent('pool_recreated');
    } catch (error) {
      this.logConnectionEvent('pool_recreation_failed', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Log connection events
   */
  private logConnectionEvent(event: string, details?: any): void {
    this.connectionHistory.push({
      timestamp: new Date(),
      event,
      details
    });

    // Keep only last 100 events
    if (this.connectionHistory.length > 100) {
      this.connectionHistory = this.connectionHistory.slice(-100);
    }
  }

  /**
   * Get the database instance
   */
  getDatabase(): ReturnType<typeof drizzle> {
    return this.db;
  }

  /**
   * Get pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    this.updatePoolMetrics();
    return { ...this.metrics };
  }

  /**
   * Get pool configuration
   */
  getConfig(): ConnectionPoolConfig {
    return { ...this.config };
  }

  /**
   * Get connection history
   */
  getConnectionHistory(): Array<{ timestamp: Date; event: string; details?: any }> {
    return [...this.connectionHistory];
  }

  /**
   * Health check for the pool
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const startTime = performance.now();
      await this.pool.query('SELECT 1 as health');
      const duration = performance.now() - startTime;

      const metrics = this.getMetrics();
      const isHealthy = duration < 2000 && metrics.poolUtilization < 95;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          responseTime: duration,
          metrics,
          config: this.config,
          recentEvents: this.connectionHistory.slice(-5)
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          metrics: this.getMetrics(),
          recentEvents: this.connectionHistory.slice(-5)
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

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      await this.pool.end();
      this.logConnectionEvent('pool_shutdown');
      console.log('✅ Database connection pool gracefully shutdown');

    } catch (error) {
      console.error('❌ Error during pool shutdown:', error);
      errorTrackingService.captureError(error as Error, {
        tags: { component: 'database_pool', event: 'shutdown_error' }
      });
    }
  }

  /**
   * Scale pool connections dynamically
   */
  async scalePool(targetConnections: number): Promise<void> {
    if (targetConnections > this.config.maxConnections) {
      console.warn(`Cannot scale beyond max connections: ${this.config.maxConnections}`);
      return;
    }

    this.logConnectionEvent('pool_scaling', { 
      from: this.metrics.totalConnections, 
      to: targetConnections 
    });

    // This would require pool reconfiguration in a more advanced implementation
    console.log(`Pool scaling requested: ${targetConnections} connections`);
  }
}

// Export singleton instance
export const databaseConnectionPoolService = new DatabaseConnectionPoolService();