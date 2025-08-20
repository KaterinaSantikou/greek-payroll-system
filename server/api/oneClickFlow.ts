/**
 * One-Click Flow API Routes (Disaster Mode: Offline Payroll Kit)
 * Implements emergency payroll kit generation and download
 */

import { Request, Response } from 'express';
import { OneClickFlowService } from '../services/OneClickFlowService';
import { SafetyComplianceService } from '../services/safetyComplianceService';
import { z } from 'zod';

// Validation schemas
const freezeRequestSchema = z.object({
  runId: z.string().min(1, "Run ID is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  emergencyPassword: z.string().min(8, "Emergency password must be at least 8 characters"),
  includeSepaXml: z.boolean().optional().default(false)
});

const disasterStatusSchema = z.object({
  runId: z.string().min(1, "Run ID is required")
});

/**
 * POST /api/one-click-flow/freeze
 * Enter Disaster Mode - Freeze run and generate offline kit
 */
export async function freezeRunAndGenerateKit(req: Request, res: Response) {
  try {
    // Get operator ID from auth
    const operatorId = req.user?.email || 'unknown';
    
    // Validate request
    const validation = freezeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.issues
      });
    }
    
    const { runId, reason, emergencyPassword, includeSepaXml } = validation.data;
    
    // Check permissions
    const authResult = await SafetyComplianceService.authorizePaymentOperation(
      operatorId,
      'submit',
      runId
    );
    
    if (!authResult.authorized) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        reason: authResult.reason
      });
    }
    
    // Execute One-Click Flow
    const result = await OneClickFlowService.freezeRunAndGenerateKit({
      runId,
      operatorId,
      reason,
      emergencyPassword,
      includeSepaXml
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('One-Click Flow API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * GET /api/one-click-flow/status/:runId
 * Get disaster mode status for a run
 */
export async function getDisasterModeStatus(req: Request, res: Response) {
  try {
    const { runId } = req.params;
    
    if (!runId) {
      return res.status(400).json({
        error: 'Run ID is required'
      });
    }
    
    const status = await OneClickFlowService.getDisasterModeStatus(runId);
    res.json(status);
    
  } catch (error) {
    console.error('Disaster mode status error:', error);
    res.status(500).json({
      error: 'Failed to get disaster mode status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * GET /api/one-click-flow/download/:freezeId
 * Download encrypted offline kit
 */
export async function downloadOfflineKit(req: Request, res: Response) {
  try {
    const { freezeId } = req.params;
    const operatorId = req.user?.email || 'unknown';
    
    if (!freezeId) {
      return res.status(400).json({
        error: 'Freeze ID is required'
      });
    }
    
    // Log download attempt
    await SafetyComplianceService.logAuditEvent({
      eventType: 'offline_kit_download_attempt',
      operatorId,
      entityId: freezeId,
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        downloadedAt: new Date().toISOString()
      }
    });
    
    // In production, this would retrieve from secure storage
    // For now, return a placeholder response
    const kitFilename = `offline_kit_${freezeId}_${Date.now()}.zip`;
    
    // Set download headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${kitFilename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // In production, stream the actual encrypted kit file
    const placeholderContent = Buffer.from(`Offline Kit ${freezeId} - Generated for emergency payroll processing`);
    res.send(placeholderContent);
    
  } catch (error) {
    console.error('Offline kit download error:', error);
    res.status(500).json({
      error: 'Failed to download offline kit',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * POST /api/one-click-flow/reconcile/:freezeId
 * Upload reconciliation data after manual payments
 */
export async function uploadReconciliation(req: Request, res: Response) {
  try {
    const { freezeId } = req.params;
    const operatorId = req.user?.email || 'unknown';
    const reconciliationData = req.body;
    
    if (!freezeId) {
      return res.status(400).json({
        error: 'Freeze ID is required'
      });
    }
    
    // Log reconciliation upload
    await SafetyComplianceService.logAuditEvent({
      eventType: 'offline_kit_reconciliation_uploaded',
      operatorId,
      entityId: freezeId,
      metadata: {
        reconciliationLines: reconciliationData?.length || 0,
        uploadedAt: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Reconciliation data uploaded successfully',
      processedLines: reconciliationData?.length || 0
    });
    
  } catch (error) {
    console.error('Reconciliation upload error:', error);
    res.status(500).json({
      error: 'Failed to upload reconciliation data',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * GET /api/one-click-flow/pre-checks/:runId
 * Pre-flight checks before entering disaster mode
 */
export async function performPreChecks(req: Request, res: Response) {
  try {
    const { runId } = req.params;
    
    if (!runId) {
      return res.status(400).json({
        error: 'Run ID is required'
      });
    }
    
    // This would implement the pre-checks from the disaster mode spec:
    // - Run status = finalized
    // - No open blocking exceptions
    // - Bank channel health checks
    
    const preChecks = {
      runStatus: 'finalized', // Would check actual status
      blockingExceptions: 0,   // Would count actual exceptions
      bankChannelHealth: 'green', // Would check bank API status
      eligibleForFreeze: true,
      warnings: [] as string[],
      errors: [] as string[]
    };
    
    // Add warnings for demo
    if (Math.random() > 0.7) {
      preChecks.warnings.push('Some payment lines have missing bank references');
    }
    
    res.json(preChecks);
    
  } catch (error) {
    console.error('Pre-checks error:', error);
    res.status(500).json({
      error: 'Failed to perform pre-checks',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Export route handlers
export const oneClickFlowRoutes = {
  freezeRunAndGenerateKit,
  getDisasterModeStatus,
  downloadOfflineKit,
  uploadReconciliation,
  performPreChecks
};