/**
 * Load Balancer Management API
 * Endpoints for load balancer configuration, monitoring, and management
 */

import { Router } from 'express';
import { loadBalancerService } from '../services/LoadBalancerService';

const router = Router();

/**
 * GET /api/load-balancer/status - Get load balancer status and metrics
 */
router.get('/status', async (req, res) => {
  try {
    const metrics = loadBalancerService.getMetrics();
    const config = loadBalancerService.getConfig();
    const instances = loadBalancerService.getInstances();
    const healthyInstances = loadBalancerService.getHealthyInstances();
    const health = await loadBalancerService.healthCheck();

    res.json({
      success: true,
      status: health.status,
      timestamp: new Date().toISOString(),
      metrics,
      config,
      instances: {
        total: instances.length,
        healthy: healthyInstances.length,
        unhealthy: instances.length - healthyInstances.length,
        list: instances
      },
      health: health.details
    });
  } catch (error) {
    console.error('Failed to get load balancer status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get load balancer status'
    });
  }
});

/**
 * GET /api/load-balancer/instances - Get all backend instances
 */
router.get('/instances', (req, res) => {
  try {
    const instances = loadBalancerService.getInstances();
    const trafficDistribution = loadBalancerService.getTrafficDistribution();

    const enrichedInstances = instances.map(instance => ({
      ...instance,
      traffic: trafficDistribution[instance.id] || { requests: 0, percentage: 0 }
    }));

    res.json({
      success: true,
      instances: enrichedInstances,
      summary: {
        total: instances.length,
        healthy: instances.filter(i => i.status === 'healthy').length,
        unhealthy: instances.filter(i => i.status === 'unhealthy').length,
        draining: instances.filter(i => i.status === 'draining').length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get instances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get instances'
    });
  }
});

/**
 * POST /api/load-balancer/instances - Add new backend instance
 */
router.post('/instances', (req, res) => {
  try {
    const { host, port, weight, region } = req.body;

    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Host and port are required'
      });
    }

    const instanceConfig = {
      host,
      port: parseInt(port),
      weight: weight ? parseInt(weight) : 100,
      region
    };

    loadBalancerService.addInstance(instanceConfig);

    res.json({
      success: true,
      message: 'Instance added successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to add instance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add instance'
    });
  }
});

/**
 * DELETE /api/load-balancer/instances/:id - Remove backend instance
 */
router.delete('/instances/:id', (req, res) => {
  try {
    const { id } = req.params;
    const removed = loadBalancerService.removeInstance(id);

    if (removed) {
      res.json({
        success: true,
        message: 'Instance removed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
  } catch (error) {
    console.error('Failed to remove instance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove instance'
    });
  }
});

/**
 * POST /api/load-balancer/instances/:id/drain - Drain instance
 */
router.post('/instances/:id/drain', (req, res) => {
  try {
    const { id } = req.params;
    const success = loadBalancerService.drainInstance(id);

    if (success) {
      res.json({
        success: true,
        message: 'Instance is now draining',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Instance not found'
      });
    }
  } catch (error) {
    console.error('Failed to drain instance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to drain instance'
    });
  }
});

/**
 * GET /api/load-balancer/metrics - Get detailed load balancer metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = loadBalancerService.getMetrics();
    const trafficDistribution = loadBalancerService.getTrafficDistribution();
    const requestHistory = loadBalancerService.getRequestHistory();
    const instances = loadBalancerService.getInstances();

    // Calculate additional metrics
    const recentHistory = requestHistory.slice(-100); // Last 100 requests
    const avgResponseTime = recentHistory.length > 0
      ? recentHistory.reduce((sum, req) => sum + req.responseTime, 0) / recentHistory.length
      : 0;

    const errorRate = recentHistory.length > 0
      ? (recentHistory.filter(req => req.status >= 400).length / recentHistory.length) * 100
      : 0;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      trafficDistribution,
      performance: {
        avgResponseTime,
        errorRate,
        recentRequests: recentHistory.length
      },
      instances: {
        total: instances.length,
        byStatus: {
          healthy: instances.filter(i => i.status === 'healthy').length,
          unhealthy: instances.filter(i => i.status === 'unhealthy').length,
          draining: instances.filter(i => i.status === 'draining').length
        }
      },
      alerts: {
        noHealthyInstances: instances.filter(i => i.status === 'healthy').length === 0,
        highErrorRate: errorRate > 5,
        slowResponseTime: avgResponseTime > 1000
      }
    });
  } catch (error) {
    console.error('Failed to get load balancer metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get load balancer metrics'
    });
  }
});

/**
 * GET /api/load-balancer/health - Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await loadBalancerService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Load balancer health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/load-balancer/config - Get load balancer configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = loadBalancerService.getConfig();
    
    res.json({
      success: true,
      config,
      availableStrategies: [
        'round_robin',
        'weighted_round_robin',
        'least_connections',
        'weighted_least_connections',
        'ip_hash',
        'geographic',
        'response_time'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get load balancer config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get load balancer configuration'
    });
  }
});

/**
 * PUT /api/load-balancer/config - Update load balancer configuration
 */
router.put('/config', (req, res) => {
  try {
    const allowedFields = [
      'strategy',
      'healthCheckInterval',
      'healthCheckTimeout',
      'maxRetries',
      'retryTimeout',
      'sessionStickiness',
      'enableFailover',
      'maxActiveConnections',
      'connectionTimeout',
      'keepAliveTimeout'
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid configuration fields provided'
      });
    }

    loadBalancerService.updateConfig(updates);

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to update load balancer config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

/**
 * GET /api/load-balancer/traffic - Get traffic distribution
 */
router.get('/traffic', (req, res) => {
  try {
    const trafficDistribution = loadBalancerService.getTrafficDistribution();
    const instances = loadBalancerService.getInstances();
    const metrics = loadBalancerService.getMetrics();

    const trafficData = instances.map(instance => ({
      instanceId: instance.id,
      host: instance.host,
      port: instance.port,
      status: instance.status,
      traffic: trafficDistribution[instance.id] || { requests: 0, percentage: 0 },
      activeConnections: instance.activeConnections,
      responseTime: instance.responseTime,
      errorRate: instance.errorRate
    }));

    res.json({
      success: true,
      totalRequests: metrics.totalRequests,
      requestsPerSecond: metrics.requestsPerSecond,
      trafficData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get traffic distribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get traffic distribution'
    });
  }
});

/**
 * GET /api/load-balancer/history - Get request history
 */
router.get('/history', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const history = loadBalancerService.getRequestHistory();
    
    res.json({
      success: true,
      history: history.slice(-parseInt(limit as string)),
      total: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get request history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get request history'
    });
  }
});

/**
 * POST /api/load-balancer/test - Test load balancing (get next instance)
 */
router.post('/test', (req, res) => {
  try {
    const { clientIp, sessionId } = req.body;
    
    const nextInstance = loadBalancerService.getNextInstance(clientIp, sessionId);
    
    if (nextInstance) {
      res.json({
        success: true,
        selectedInstance: {
          id: nextInstance.id,
          host: nextInstance.host,
          port: nextInstance.port,
          status: nextInstance.status,
          activeConnections: nextInstance.activeConnections,
          responseTime: nextInstance.responseTime
        },
        strategy: loadBalancerService.getConfig().strategy,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'No healthy instances available',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to test load balancing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test load balancing'
    });
  }
});

export default router;