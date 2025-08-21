/**
 * Database Connection Pool Management API
 * Monitoring and management endpoints for connection pool
 */

import { Router } from 'express';
import { databaseConnectionPoolService } from '../services/DatabaseConnectionPoolService';

const router = Router();

/**
 * GET /api/database-pool/status - Get connection pool status
 */
router.get('/status', async (req, res) => {
  try {
    const metrics = databaseConnectionPoolService.getMetrics();
    const config = databaseConnectionPoolService.getConfig();
    const health = await databaseConnectionPoolService.healthCheck();

    res.json({
      success: true,
      status: health.status,
      timestamp: new Date().toISOString(),
      metrics,
      config,
      health: health.details
    });
  } catch (error) {
    console.error('Failed to get pool status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pool status'
    });
  }
});

/**
 * GET /api/database-pool/metrics - Get detailed pool metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = databaseConnectionPoolService.getMetrics();
    const history = databaseConnectionPoolService.getConnectionHistory();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      recentActivity: history.slice(-20), // Last 20 events
      alerts: {
        highUtilization: metrics.poolUtilization > 80,
        manyWaitingClients: metrics.waitingClients > 10,
        slowQueries: metrics.avgQueryTime > 1000
      }
    });
  } catch (error) {
    console.error('Failed to get pool metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pool metrics'
    });
  }
});

/**
 * GET /api/database-pool/health - Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await databaseConnectionPoolService.healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database pool health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/database-pool/scale - Scale connection pool (admin only)
 */
router.post('/scale', async (req, res) => {
  try {
    const { targetConnections } = req.body;

    if (!targetConnections || typeof targetConnections !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Target connections must be a number'
      });
    }

    await databaseConnectionPoolService.scalePool(targetConnections);

    res.json({
      success: true,
      message: `Pool scaling initiated to ${targetConnections} connections`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to scale pool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scale pool'
    });
  }
});

/**
 * GET /api/database-pool/config - Get pool configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = databaseConnectionPoolService.getConfig();
    
    res.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get pool config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pool configuration'
    });
  }
});

/**
 * GET /api/database-pool/history - Get connection history
 */
router.get('/history', (req, res) => {
  try {
    const history = databaseConnectionPoolService.getConnectionHistory();
    const limit = parseInt(req.query.limit as string) || 50;
    
    res.json({
      success: true,
      history: history.slice(-limit),
      total: history.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get connection history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connection history'
    });
  }
});

export default router;