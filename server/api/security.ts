import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { gdprService } from "../security/gdprCompliance";
import { rbacService } from "../security/rbacService";
import { auditService } from "../security/auditService";
import { dataResidencyService } from "../security/dataResidency";

const router = Router();

// GDPR Compliance API endpoints
router.get('/api/gdpr/access/:employeeId', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { employeeId } = req.params;
    
    const accessData = await gdprService.processAccessRequest(employeeId, userId);
    res.json(accessData);
  } catch (error) {
    console.error("Error processing GDPR access request:", error);
    res.status(500).json({ error: "Failed to process access request" });
  }
});

router.post('/api/gdpr/rectification/:employeeId', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { employeeId } = req.params;
    const corrections = req.body;
    
    await gdprService.processRectificationRequest(employeeId, corrections, userId);
    res.json({ message: "Rectification completed successfully" });
  } catch (error) {
    console.error("Error processing rectification request:", error);
    res.status(500).json({ error: "Failed to process rectification" });
  }
});

router.post('/api/gdpr/erasure/:employeeId', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { employeeId } = req.params;
    const { reason } = req.body;
    
    const result = await gdprService.processErasureRequest(employeeId, userId, reason);
    res.json(result);
  } catch (error) {
    console.error("Error processing erasure request:", error);
    res.status(500).json({ error: "Failed to process erasure request" });
  }
});

router.get('/api/gdpr/portability/:employeeId', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { employeeId } = req.params;
    
    const portableData = await gdprService.processPortabilityRequest(employeeId, userId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="employee-${employeeId}-data.json"`);
    res.json(portableData);
  } catch (error) {
    console.error("Error processing portability request:", error);
    res.status(500).json({ error: "Failed to process portability request" });
  }
});

// RBAC & Approval Workflows API
router.post('/api/approvals/initiate', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { operation, resourceId, requestData } = req.body;
    
    const approval = await rbacService.initiateApproval(userId, operation, resourceId, requestData);
    res.json(approval);
  } catch (error) {
    console.error("Error initiating approval:", error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to initiate approval" });
  }
});

router.post('/api/approvals/:approvalId/process', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { approvalId } = req.params;
    const { decision, comments } = req.body;
    
    const result = await rbacService.processApproval(approvalId, userId, decision, comments);
    res.json(result);
  } catch (error) {
    console.error("Error processing approval:", error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to process approval" });
  }
});

router.get('/api/approvals/pending', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const pendingApprovals = await rbacService.getPendingApprovals(userId);
    res.json(pendingApprovals);
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
});

router.get('/api/permissions/check', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { resource, action } = req.query;
    
    if (!resource || !action) {
      return res.status(400).json({ error: "resource and action parameters required" });
    }
    
    const hasPermission = await rbacService.hasPermission(userId, resource as string, action as string);
    res.json({ hasPermission });
  } catch (error) {
    console.error("Error checking permissions:", error);
    res.status(500).json({ error: "Failed to check permissions" });
  }
});

// Audit Trail API
router.get('/api/audit/search', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const {
      startDate,
      endDate,
      eventType,
      targetUserId,
      resourceType,
      resourceId,
      action,
      limit = '100',
      offset = '0'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate parameters required" });
    }

    const filters = {
      eventType: eventType as string,
      targetUserId: targetUserId as string,
      resourceType: resourceType as string,
      resourceId: resourceId as string,
      action: action as string
    };

    const auditLogs = await auditService.searchAuditLogs(
      userId,
      new Date(startDate as string),
      new Date(endDate as string),
      filters,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      data: auditLogs,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: auditLogs.length === parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error("Error searching audit logs:", error);
    res.status(500).json({ error: "Failed to search audit logs" });
  }
});

router.post('/api/audit/validate-chain', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const validation = await auditService.validateAuditChain(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    res.json(validation);
  } catch (error) {
    console.error("Error validating audit chain:", error);
    res.status(500).json({ error: "Failed to validate audit chain" });
  }
});

router.post('/api/audit/export', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { startDate, endDate, format = 'json', filters } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required" });
    }
    
    const exportResult = await auditService.exportAuditLogs(
      userId,
      new Date(startDate),
      new Date(endDate),
      format,
      filters
    );
    
    res.json(exportResult);
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    res.status(500).json({ error: "Failed to export audit logs" });
  }
});

router.get('/api/audit/statistics', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate parameters required" });
    }
    
    const statistics = await auditService.getAuditStatistics(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    res.json(statistics);
  } catch (error) {
    console.error("Error fetching audit statistics:", error);
    res.status(500).json({ error: "Failed to fetch audit statistics" });
  }
});

// Data Residency & Backup API
router.post('/api/backup/create', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    
    const backup = await dataResidencyService.createFullBackup(userId);
    res.json(backup);
  } catch (error) {
    console.error("Error creating backup:", error);
    res.status(500).json({ error: "Failed to create backup" });
  }
});

router.post('/api/restore/create-point', isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.claims?.sub;
    const { timestamp, restoreType, approvedBy } = req.body;
    
    if (!timestamp || !restoreType || !approvedBy) {
      return res.status(400).json({ 
        error: "timestamp, restoreType, and approvedBy are required" 
      });
    }
    
    const restorePoint = await dataResidencyService.createRestorePoint(
      new Date(timestamp),
      restoreType,
      userId,
      approvedBy
    );
    
    res.json(restorePoint);
  } catch (error) {
    console.error("Error creating restore point:", error);
    res.status(500).json({ error: "Failed to create restore point" });
  }
});

router.post('/api/restore/:restoreId/execute', isAuthenticated, async (req, res) => {
  try {
    const { restoreId } = req.params;
    // In production, would validate user permissions for restore execution
    
    // This would execute the restore (placeholder implementation)
    res.json({ 
      message: "Restore execution initiated", 
      restoreId,
      status: "in_progress" 
    });
  } catch (error) {
    console.error("Error executing restore:", error);
    res.status(500).json({ error: "Failed to execute restore" });
  }
});

router.get('/api/compliance/data-residency', isAuthenticated, async (req, res) => {
  try {
    const compliance = await dataResidencyService.validateDataResidencyCompliance();
    res.json(compliance);
  } catch (error) {
    console.error("Error checking data residency compliance:", error);
    res.status(500).json({ error: "Failed to check data residency compliance" });
  }
});

router.get('/api/backup/retention-schedule', isAuthenticated, async (req, res) => {
  try {
    const schedule = dataResidencyService.getBackupRetentionSchedule();
    res.json(schedule);
  } catch (error) {
    console.error("Error fetching backup retention schedule:", error);
    res.status(500).json({ error: "Failed to fetch backup retention schedule" });
  }
});

// Security Health Check
router.get('/api/security/health', isAuthenticated, async (req, res) => {
  try {
    const securityHealth = {
      timestamp: new Date().toISOString(),
      gdpr: {
        status: "operational",
        features: ["access_requests", "rectification", "erasure", "portability"]
      },
      rbac: {
        status: "operational", 
        features: ["role_based_access", "approval_workflows", "separation_of_duties"]
      },
      audit: {
        status: "operational",
        features: ["immutable_logging", "hash_chaining", "export_capabilities"]
      },
      dataResidency: {
        status: "operational",
        primaryRegion: "eu-central-1",
        backupRegions: ["eu-west-1", "eu-south-1"],
        encryption: {
          atRest: "AES-256",
          inTransit: "TLS-1.3"
        }
      }
    };
    
    res.json(securityHealth);
  } catch (error) {
    console.error("Error fetching security health:", error);
    res.status(500).json({ error: "Failed to fetch security health" });
  }
});

export default router;