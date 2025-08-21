/**
 * Load Balancer Service
 * Advanced load balancing with health checks, failover, and traffic distribution
 */

import { errorTrackingService } from './ErrorTrackingService';
import { envConfig } from '../lib/envConfig';

export interface BackendInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  status: 'healthy' | 'unhealthy' | 'draining';
  region?: string;
  lastHealthCheck: Date;
  responseTime: number;
  activeConnections: number;
  totalRequests: number;
  errorRate: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface LoadBalancerConfig {
  strategy: 'round_robin' | 'weighted_round_robin' | 'least_connections' | 'weighted_least_connections' | 'ip_hash' | 'geographic' | 'response_time';
  healthCheckInterval: number;
  healthCheckTimeout: number;
  healthCheckPath: string;
  maxRetries: number;
  retryTimeout: number;
  sessionStickiness: boolean;
  enableFailover: boolean;
  maxActiveConnections: number;
  connectionTimeout: number;
  keepAliveTimeout: number;
}

export interface LoadBalancerMetrics {
  totalRequests: number;
  totalResponses: number;
  activeConnections: number;
  avgResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  uptime: number;
  lastActivity: Date;
  trafficDistribution: Record<string, number>;
}

export class LoadBalancerService {
  private instances = new Map<string, BackendInstance>();
  private config!: LoadBalancerConfig;
  private metrics!: LoadBalancerMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private currentIndex = 0;
  private sessionMap = new Map<string, string>(); // session -> instance mapping
  private requestHistory: Array<{ timestamp: Date; instanceId: string; responseTime: number; status: number }> = [];

  constructor() {
    this.config = this.getOptimalLoadBalancerConfig();
    this.initializeMetrics();
    this.initializeDefaultInstances();
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Get optimal load balancer configuration
   */
  private getOptimalLoadBalancerConfig(): LoadBalancerConfig {
    const isProduction = envConfig.NODE_ENV === 'production';
    
    return {
      strategy: isProduction ? 'weighted_least_connections' : 'round_robin',
      healthCheckInterval: 30000, // 30 seconds
      healthCheckTimeout: 5000, // 5 seconds
      healthCheckPath: '/api/health',
      maxRetries: 3,
      retryTimeout: 1000, // 1 second
      sessionStickiness: false, // Disabled for better distribution
      enableFailover: true,
      maxActiveConnections: isProduction ? 1000 : 100,
      connectionTimeout: 30000, // 30 seconds
      keepAliveTimeout: 65000 // 65 seconds
    };
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalResponses: 0,
      activeConnections: 0,
      avgResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      uptime: Date.now(),
      lastActivity: new Date(),
      trafficDistribution: {}
    };
  }

  /**
   * Initialize default instances (in production, these would be configured externally)
   */
  private initializeDefaultInstances(): void {
    const isProduction = envConfig.NODE_ENV === 'production';
    
    if (isProduction) {
      // Production instances would be configured via environment variables or service discovery
      const instances = process.env.BACKEND_INSTANCES ? JSON.parse(process.env.BACKEND_INSTANCES) : [];
      instances.forEach((instance: any) => this.addInstance(instance));
    } else {
      // Development: Single instance (current app)
      this.addInstance({
        id: 'primary',
        host: 'localhost',
        port: 5000,
        weight: 100,
        region: 'local'
      });
    }

    console.log('✅ Load balancer initialized with', this.instances.size, 'instances');
  }

  /**
   * Add backend instance
   */
  addInstance(config: Partial<BackendInstance>): void {
    const instance: BackendInstance = {
      id: config.id || `instance_${Date.now()}`,
      host: config.host || 'localhost',
      port: config.port || 5000,
      weight: config.weight || 100,
      status: 'healthy',
      region: config.region,
      lastHealthCheck: new Date(),
      responseTime: 0,
      activeConnections: 0,
      totalRequests: 0,
      errorRate: 0,
      cpuUsage: config.cpuUsage,
      memoryUsage: config.memoryUsage
    };

    this.instances.set(instance.id, instance);
    this.metrics.trafficDistribution[instance.id] = 0;
    
    console.log(`Added backend instance: ${instance.id} at ${instance.host}:${instance.port}`);
  }

  /**
   * Remove backend instance
   */
  removeInstance(instanceId: string): boolean {
    const removed = this.instances.delete(instanceId);
    delete this.metrics.trafficDistribution[instanceId];
    
    if (removed) {
      console.log(`Removed backend instance: ${instanceId}`);
    }
    
    return removed;
  }

  /**
   * Get next instance based on load balancing strategy
   */
  getNextInstance(clientIp?: string, sessionId?: string): BackendInstance | null {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');

    if (healthyInstances.length === 0) {
      console.warn('No healthy instances available');
      return null;
    }

    // Check session stickiness
    if (this.config.sessionStickiness && sessionId) {
      const stickyInstanceId = this.sessionMap.get(sessionId);
      if (stickyInstanceId) {
        const stickyInstance = this.instances.get(stickyInstanceId);
        if (stickyInstance && stickyInstance.status === 'healthy') {
          return stickyInstance;
        } else {
          // Remove invalid session mapping
          this.sessionMap.delete(sessionId);
        }
      }
    }

    let selectedInstance: BackendInstance;

    switch (this.config.strategy) {
      case 'round_robin':
        selectedInstance = this.roundRobinSelection(healthyInstances);
        break;
      
      case 'weighted_round_robin':
        selectedInstance = this.weightedRoundRobinSelection(healthyInstances);
        break;
      
      case 'least_connections':
        selectedInstance = this.leastConnectionsSelection(healthyInstances);
        break;
      
      case 'weighted_least_connections':
        selectedInstance = this.weightedLeastConnectionsSelection(healthyInstances);
        break;
      
      case 'ip_hash':
        selectedInstance = this.ipHashSelection(healthyInstances, clientIp);
        break;
      
      case 'response_time':
        selectedInstance = this.responseTimeSelection(healthyInstances);
        break;
      
      case 'geographic':
        selectedInstance = this.geographicSelection(healthyInstances, clientIp);
        break;
      
      default:
        selectedInstance = this.roundRobinSelection(healthyInstances);
    }

    // Set session stickiness if enabled
    if (this.config.sessionStickiness && sessionId) {
      this.sessionMap.set(sessionId, selectedInstance.id);
    }

    return selectedInstance;
  }

  /**
   * Round robin selection
   */
  private roundRobinSelection(instances: BackendInstance[]): BackendInstance {
    const instance = instances[this.currentIndex % instances.length];
    this.currentIndex++;
    return instance;
  }

  /**
   * Weighted round robin selection
   */
  private weightedRoundRobinSelection(instances: BackendInstance[]): BackendInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let random = Math.floor(Math.random() * totalWeight);
    
    for (const instance of instances) {
      random -= instance.weight;
      if (random < 0) {
        return instance;
      }
    }
    
    return instances[0]; // Fallback
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelection(instances: BackendInstance[]): BackendInstance {
    return instances.reduce((min, instance) => 
      instance.activeConnections < min.activeConnections ? instance : min
    );
  }

  /**
   * Weighted least connections selection
   */
  private weightedLeastConnectionsSelection(instances: BackendInstance[]): BackendInstance {
    return instances.reduce((best, instance) => {
      const bestRatio = best.activeConnections / best.weight;
      const instanceRatio = instance.activeConnections / instance.weight;
      return instanceRatio < bestRatio ? instance : best;
    });
  }

  /**
   * IP hash selection
   */
  private ipHashSelection(instances: BackendInstance[], clientIp?: string): BackendInstance {
    if (!clientIp) {
      return this.roundRobinSelection(instances);
    }
    
    const hash = this.hashString(clientIp);
    const index = Math.abs(hash) % instances.length;
    return instances[index];
  }

  /**
   * Response time based selection
   */
  private responseTimeSelection(instances: BackendInstance[]): BackendInstance {
    return instances.reduce((fastest, instance) => 
      instance.responseTime < fastest.responseTime ? instance : fastest
    );
  }

  /**
   * Geographic selection (simplified - would need geo-location in production)
   */
  private geographicSelection(instances: BackendInstance[], clientIp?: string): BackendInstance {
    // For now, prefer instances in the same region
    // In production, this would use geo-location services
    const localInstances = instances.filter(i => i.region === 'local' || !i.region);
    return localInstances.length > 0 
      ? this.leastConnectionsSelection(localInstances)
      : this.leastConnectionsSelection(instances);
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Record request metrics
   */
  recordRequest(instanceId: string, responseTime: number, status: number): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.totalRequests++;
      instance.responseTime = (instance.responseTime + responseTime) / 2; // Moving average
      
      if (status >= 400) {
        instance.errorRate = (instance.errorRate + 1) / 2; // Moving average
      } else {
        instance.errorRate = instance.errorRate * 0.9; // Decay errors
      }
    }

    // Global metrics
    this.metrics.totalRequests++;
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime + responseTime) / 2;
    this.metrics.trafficDistribution[instanceId] = (this.metrics.trafficDistribution[instanceId] || 0) + 1;
    this.metrics.lastActivity = new Date();

    // Record in history
    this.requestHistory.push({
      timestamp: new Date(),
      instanceId,
      responseTime,
      status
    });

    // Keep only last 1000 requests
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }
  }

  /**
   * Increment active connections for instance
   */
  incrementConnections(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.activeConnections++;
      this.metrics.activeConnections++;
    }
  }

  /**
   * Decrement active connections for instance
   */
  decrementConnections(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.activeConnections = Math.max(0, instance.activeConnections - 1);
      this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    console.log('⏰ Load balancer health checks started');
  }

  /**
   * Perform health checks on all instances
   */
  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(instance => 
      this.checkInstanceHealth(instance)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Check health of a specific instance
   */
  private async checkInstanceHealth(instance: BackendInstance): Promise<void> {
    try {
      const startTime = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheckTimeout);

      const response = await fetch(`http://${instance.host}:${instance.port}${this.config.healthCheckPath}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = performance.now() - startTime;

      if (response.ok) {
        const previousStatus = instance.status;
        instance.status = 'healthy';
        instance.responseTime = responseTime;
        instance.lastHealthCheck = new Date();

        if (previousStatus !== 'healthy') {
          console.log(`Instance ${instance.id} is now healthy`);
        }
      } else {
        this.markInstanceUnhealthy(instance, `HTTP ${response.status}`);
      }

    } catch (error) {
      this.markInstanceUnhealthy(instance, (error as Error).message);
    }
  }

  /**
   * Mark instance as unhealthy
   */
  private markInstanceUnhealthy(instance: BackendInstance, reason: string): void {
    const previousStatus = instance.status;
    instance.status = 'unhealthy';
    instance.lastHealthCheck = new Date();

    if (previousStatus !== 'unhealthy') {
      console.warn(`Instance ${instance.id} marked unhealthy: ${reason}`);
      errorTrackingService.captureMessage(
        `Backend instance ${instance.id} failed health check`,
        'warning',
        {
          tags: { component: 'load_balancer' },
          extra: { instanceId: instance.id, reason, host: instance.host, port: instance.port }
        }
      );
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 10000); // Every 10 seconds

    console.log('📊 Load balancer metrics collection started');
  }

  /**
   * Update load balancer metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const windowSize = 60000; // 1 minute window
    const recentRequests = this.requestHistory.filter(
      req => now - req.timestamp.getTime() < windowSize
    );

    // Calculate requests per second
    this.metrics.requestsPerSecond = recentRequests.length / (windowSize / 1000);

    // Calculate error rate
    const errorRequests = recentRequests.filter(req => req.status >= 400);
    this.metrics.errorRate = recentRequests.length > 0 
      ? (errorRequests.length / recentRequests.length) * 100 
      : 0;

    // Calculate uptime
    this.metrics.uptime = (now - this.metrics.uptime) / 1000; // seconds
  }

  /**
   * Get load balancer metrics
   */
  getMetrics(): LoadBalancerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all instances
   */
  getInstances(): BackendInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get healthy instances
   */
  getHealthyInstances(): BackendInstance[] {
    return Array.from(this.instances.values())
      .filter(instance => instance.status === 'healthy');
  }

  /**
   * Get load balancer configuration
   */
  getConfig(): LoadBalancerConfig {
    return { ...this.config };
  }

  /**
   * Update load balancer configuration
   */
  updateConfig(newConfig: Partial<LoadBalancerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Load balancer configuration updated');
  }

  /**
   * Get request history
   */
  getRequestHistory(): Array<{ timestamp: Date; instanceId: string; responseTime: number; status: number }> {
    return [...this.requestHistory];
  }

  /**
   * Health check for the load balancer itself
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const healthyInstances = this.getHealthyInstances();
      const totalInstances = this.instances.size;
      const healthyPercentage = totalInstances > 0 ? (healthyInstances.length / totalInstances) * 100 : 0;

      const isHealthy = healthyInstances.length > 0 && healthyPercentage >= 50;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          totalInstances,
          healthyInstances: healthyInstances.length,
          healthyPercentage,
          metrics: this.getMetrics(),
          config: this.config,
          recentRequests: this.requestHistory.slice(-5)
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          totalInstances: this.instances.size
        }
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = null;
      }

      console.log('✅ Load balancer service gracefully shutdown');

    } catch (error) {
      console.error('❌ Error during load balancer shutdown:', error);
      errorTrackingService.captureError(error as Error, {
        tags: { component: 'load_balancer', event: 'shutdown_error' }
      });
    }
  }

  /**
   * Drain instance (stop sending new requests, allow existing to complete)
   */
  drainInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = 'draining';
      console.log(`Instance ${instanceId} is now draining`);
      return true;
    }
    return false;
  }

  /**
   * Get traffic distribution statistics
   */
  getTrafficDistribution(): Record<string, { requests: number; percentage: number }> {
    const total = this.metrics.totalRequests;
    const distribution: Record<string, { requests: number; percentage: number }> = {};

    for (const [instanceId, requests] of Object.entries(this.metrics.trafficDistribution)) {
      distribution[instanceId] = {
        requests,
        percentage: total > 0 ? (requests / total) * 100 : 0
      };
    }

    return distribution;
  }
}

// Export singleton instance
export const loadBalancerService = new LoadBalancerService();