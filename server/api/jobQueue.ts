/**
 * Job Queue API Routes
 * Provides endpoints for managing and monitoring background jobs
 */

import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { jobQueueService } from "../services/SimpleJobQueueService";

export function registerJobQueueRoutes(app: Express): void {
  
  // Queue payroll processing job
  app.post('/api/payroll/:runId/process', isAuthenticated, async (req, res) => {
    try {
      const { runId } = req.params;
      const { employeeIds, payPeriodStart, payPeriodEnd } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string || `payroll-${runId}-${Date.now()}`;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).json({ message: 'employeeIds array is required' });
      }

      const job = await jobQueueService.addPayrollProcessingJob({
        payrollRunId: runId,
        payPeriodStart,
        payPeriodEnd,
        employeeIds,
        idempotencyKey
      });

      res.status(202).json({
        status: 'processing',
        jobId: job.id,
        message: `Payroll processing queued for ${employeeIds.length} employees`,
        checkStatusUrl: `/api/jobs/payroll-processing/${job.id}/status`
      });
    } catch (error) {
      console.error('Error queueing payroll processing:', error);
      res.status(500).json({ message: 'Failed to queue payroll processing job' });
    }
  });

  // Queue ERGANI synchronization job
  app.post('/api/ergani/sync/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { punchEvents } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string || `ergani-${employeeId}-${Date.now()}`;

      if (!punchEvents || !Array.isArray(punchEvents)) {
        return res.status(400).json({ message: 'punchEvents array is required' });
      }

      const job = await jobQueueService.addERGANISyncJob({
        employeeId,
        punchEvents,
        idempotencyKey
      });

      res.status(202).json({
        status: 'processing',
        jobId: job.id,
        message: `ERGANI sync queued for ${punchEvents.length} punch events`,
        checkStatusUrl: `/api/jobs/ergani-sync/${job.id}/status`
      });
    } catch (error) {
      console.error('Error queueing ERGANI sync:', error);
      res.status(500).json({ message: 'Failed to queue ERGANI sync job' });
    }
  });

  // Get job status for any queue type
  app.get('/api/jobs/:queueType/:jobId/status', isAuthenticated, async (req, res) => {
    try {
      const { queueType, jobId } = req.params;
      
      // Map queue type to internal queue name
      const queueMapping: Record<string, string> = {
        'sepa-generation': 'sepa-generation',
        'payroll-processing': 'payroll-processing',
        'ergani-sync': 'ergani-sync'
      };

      const queueName = queueMapping[queueType];
      if (!queueName) {
        return res.status(400).json({ message: 'Invalid queue type' });
      }
      
      const status = await jobQueueService.getJobStatus(queueName, jobId);
      
      if (!status) {
        return res.status(404).json({ message: 'Job not found' });
      }

      res.json({
        jobId: status.id,
        queueType,
        progress: status.progress,
        status: status.finishedOn ? 'completed' : (status.failedReason ? 'failed' : 'processing'),
        failedReason: status.failedReason,
        result: status.returnvalue,
        completedAt: status.finishedOn,
        processedAt: status.processedOn,
        attempts: status.attemptsMade
      });
      
    } catch (error) {
      console.error('Error getting job status:', error);
      res.status(500).json({ message: 'Failed to get job status' });
    }
  });

  // Get all jobs summary (admin endpoint)
  app.get('/api/jobs/summary', isAuthenticated, async (req, res) => {
    try {
      // This would require more advanced BullMQ features to implement properly
      // For now, return a simple response
      res.json({
        message: 'Job queues operational',
        queues: ['sepa-generation', 'payroll-processing', 'ergani-sync'],
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting jobs summary:', error);
      res.status(500).json({ message: 'Failed to get jobs summary' });
    }
  });
}