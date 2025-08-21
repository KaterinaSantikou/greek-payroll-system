/**
 * Cache Management API
 * Endpoints for cache monitoring, management, and operations
 */

import { Router } from 'express';
import { redisCacheService } from '../services/RedisCacheService';
import { cacheManagerService } from '../services/CacheManagerService';

const router = Router();

/**
 * GET /api/cache/status - Get cache status and metrics
 */
router.get('/status', async (req, res) => {
  try {
    const metrics = redisCacheService.getMetrics();
    const config = redisCacheService.getConfig();
    const health = await redisCacheService.healthCheck();
    const cacheInfo = await redisCacheService.getCacheInfo();

    res.json({
      success: true,
      status: health.status,
      timestamp: new Date().toISOString(),
      metrics,
      config,
      health: health.details,
      info: cacheInfo
    });
  } catch (error) {
    console.error('Failed to get cache status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache status'
    });
  }
});

/**
 * GET /api/cache/metrics - Get detailed cache metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = redisCacheService.getMetrics();
    const history = redisCacheService.getCacheHistory();
    const strategies = cacheManagerService.getStrategies();
    const stats = await cacheManagerService.getStatsByDataType();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      recentActivity: history.slice(-30), // Last 30 operations
      strategies: Object.fromEntries(strategies),
      dataTypeStats: Object.fromEntries(stats),
      alerts: {
        lowHitRate: metrics.hitRate < 50,
        highMemoryUsage: metrics.memoryUsage > 100 * 1024 * 1024, // 100MB
        manyMisses: metrics.misses > metrics.hits
      }
    });
  } catch (error) {
    console.error('Failed to get cache metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache metrics'
    });
  }
});

/**
 * GET /api/cache/health - Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await redisCacheService.healthCheck();
    const managerHealth = await cacheManagerService.healthCheck();
    
    const overallStatus = health.status === 'healthy' && managerHealth.status === 'healthy' 
      ? 'healthy' 
      : 'unhealthy';
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      redis: health,
      manager: managerHealth
    });
  } catch (error) {
    console.error('Cache health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/cache/keys - Get cache keys by pattern
 */
router.get('/keys', async (req, res) => {
  try {
    const { pattern = '*', limit = 100 } = req.query;
    
    const keys = await redisCacheService.keys(pattern as string);
    const limitedKeys = keys.slice(0, parseInt(limit as string));
    
    // Get key details
    const keyDetails = await Promise.all(
      limitedKeys.map(async (key) => {
        const ttl = await redisCacheService.ttl(key);
        return {
          key,
          ttl,
          hasExpiry: ttl > 0
        };
      })
    );

    res.json({
      success: true,
      pattern,
      total: keys.length,
      returned: keyDetails.length,
      keys: keyDetails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get cache keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache keys'
    });
  }
});

/**
 * GET /api/cache/key/:key - Get specific key info
 */
router.get('/key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const exists = await redisCacheService.exists(key);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'Key not found'
      });
    }

    const value = await redisCacheService.get(key);
    const ttl = await redisCacheService.ttl(key);

    res.json({
      success: true,
      key,
      value,
      ttl,
      hasExpiry: ttl > 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Failed to get key ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get key'
    });
  }
});

/**
 * DELETE /api/cache/key/:key - Delete specific key
 */
router.delete('/key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const deleted = await redisCacheService.del(key);
    
    res.json({
      success: true,
      deleted,
      message: deleted ? 'Key deleted successfully' : 'Key not found',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Failed to delete key ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete key'
    });
  }
});

/**
 * POST /api/cache/invalidate - Invalidate cache by pattern or data type
 */
router.post('/invalidate', async (req, res) => {
  try {
    const { pattern, dataType, identifier } = req.body;
    
    let deletedCount = 0;
    
    if (dataType && identifier) {
      // Invalidate specific data
      const success = await cacheManagerService.invalidate(dataType, identifier);
      deletedCount = success ? 1 : 0;
    } else if (dataType) {
      // Invalidate entire data type
      deletedCount = await cacheManagerService.invalidateDataType(dataType);
    } else if (pattern) {
      // Invalidate by pattern
      deletedCount = await redisCacheService.delPattern(pattern);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Must provide either pattern, dataType, or dataType+identifier'
      });
    }

    res.json({
      success: true,
      deletedCount,
      message: `Invalidated ${deletedCount} cache entries`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache'
    });
  }
});

/**
 * POST /api/cache/flush - Flush all cache (admin only)
 */
router.post('/flush', async (req, res) => {
  try {
    // In production, you'd want proper admin authentication here
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Cache flush is restricted in production'
      });
    }

    const success = await redisCacheService.flushAll();
    
    res.json({
      success,
      message: success ? 'All cache data flushed' : 'Failed to flush cache',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to flush cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flush cache'
    });
  }
});

/**
 * GET /api/cache/strategies - Get cache strategies
 */
router.get('/strategies', (req, res) => {
  try {
    const strategies = cacheManagerService.getStrategies();
    
    res.json({
      success: true,
      strategies: Object.fromEntries(strategies),
      count: strategies.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get cache strategies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache strategies'
    });
  }
});

/**
 * POST /api/cache/warm-up - Warm up cache for specific data type
 */
router.post('/warm-up', async (req, res) => {
  try {
    const { dataType, identifiers } = req.body;
    
    if (!dataType || !Array.isArray(identifiers)) {
      return res.status(400).json({
        success: false,
        error: 'Must provide dataType and identifiers array'
      });
    }

    // This is a placeholder - in real implementation, you'd have
    // specific fetch functions for each data type
    const mockFetchFunction = async (id: string) => {
      return { id, data: `mock_data_for_${id}`, timestamp: new Date() };
    };

    await cacheManagerService.warmUp(dataType, identifiers, mockFetchFunction);
    
    res.json({
      success: true,
      message: `Cache warmed up for ${dataType} with ${identifiers.length} items`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to warm up cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to warm up cache'
    });
  }
});

/**
 * GET /api/cache/history - Get cache operation history
 */
router.get('/history', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = redisCacheService.getCacheHistory();
    
    res.json({
      success: true,
      history: history.slice(-parseInt(limit as string)),
      total: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get cache history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache history'
    });
  }
});

export default router;