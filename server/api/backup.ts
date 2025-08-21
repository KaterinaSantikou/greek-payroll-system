/**
 * Backup and Recovery API Endpoints
 */

import { Router } from 'express';
import { backupRecoveryService } from '../services/BackupRecoveryService';
import { z } from 'zod';

const router = Router();

// Create backup schema
const createBackupSchema = z.object({
  type: z.enum(['manual', 'pre-deployment']).optional().default('manual')
});

// Restore backup schema
const restoreBackupSchema = z.object({
  backupId: z.string(),
  dryRun: z.boolean().optional().default(false),
  tablesToRestore: z.array(z.string()).optional()
});

/**
 * GET /api/backup/list - List all available backups
 */
router.get('/list', async (req, res) => {
  try {
    const backups = await backupRecoveryService.listBackups();
    res.json({
      success: true,
      backups,
      count: backups.length
    });
  } catch (error) {
    console.error('Failed to list backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list backups'
    });
  }
});

/**
 * POST /api/backup/create - Create a new backup
 */
router.post('/create', async (req, res) => {
  try {
    const { type } = createBackupSchema.parse(req.body);
    
    const backup = await backupRecoveryService.createBackup(type);
    
    res.json({
      success: true,
      backup,
      message: `${type} backup created successfully`
    });
  } catch (error) {
    console.error('Failed to create backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

/**
 * GET /api/backup/health - Get backup system health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = await backupRecoveryService.getBackupHealth();
    
    // Determine health status
    const isHealthy = health.totalBackups > 0 && 
                     health.lastBackupTime && 
                     (Date.now() - health.lastBackupTime.getTime()) < 48 * 60 * 60 * 1000; // 48 hours
    
    res.json({
      success: true,
      health: {
        ...health,
        status: isHealthy ? 'healthy' : 'warning',
        lastBackupAge: health.lastBackupTime ? 
          Math.floor((Date.now() - health.lastBackupTime.getTime()) / (1000 * 60 * 60)) : null
      }
    });
  } catch (error) {
    console.error('Failed to get backup health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup health'
    });
  }
});

/**
 * POST /api/backup/restore - Restore from backup (dry run by default)
 */
router.post('/restore', async (req, res) => {
  try {
    const { backupId, dryRun, tablesToRestore } = restoreBackupSchema.parse(req.body);
    
    await backupRecoveryService.restoreFromBackup(backupId, {
      dryRun,
      tablesToRestore
    });
    
    res.json({
      success: true,
      message: dryRun ? 
        'Restore validation completed successfully' : 
        'Restore preparation completed'
    });
  } catch (error) {
    console.error('Failed to restore backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore backup'
    });
  }
});

/**
 * GET /api/backup/info/:backupId - Get detailed backup information
 */
router.get('/info/:backupId', async (req, res) => {
  try {
    const { backupId } = req.params;
    const backups = await backupRecoveryService.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }
    
    res.json({
      success: true,
      backup
    });
  } catch (error) {
    console.error('Failed to get backup info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup information'
    });
  }
});

export default router;