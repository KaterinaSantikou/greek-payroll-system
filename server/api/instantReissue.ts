/**
 * IRIS/SCT Instant Re-issue API Endpoints
 * Story 2 - Re-issue failed/pending payments via IRIS/SCT Inst within 30s
 */

import type { Express } from "express";
import { InstantReissueService } from "../services/InstantReissueService";
import { z } from "zod";

// Validation schemas
const eligibilityCheckSchema = z.object({
  lineIds: z.array(z.string()).min(1).max(100),
  targetBankProfile: z.string().optional(),
});

const instantReissueSchema = z.object({
  originalLineIds: z.array(z.string()).min(1).max(50),
  reason: z.string().min(10).max(500),
  operatorId: z.string(),
  urgency: z.enum(['HIGH', 'URGP']).default('HIGH'),
  overrideFees: z.boolean().default(false),
  doublePayProtection: z.boolean().default(true),
});

export function instantReissueRoutes(app: Express) {

  /**
   * Check eligibility for SCT Instant re-issue
   * POST /v1/instant-reissue/eligibility-check
   */
  app.post('/v1/instant-reissue/eligibility-check', async (req, res) => {
    try {
      const validation = eligibilityCheckSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: validation.error.errors,
          hint: 'Provide valid lineIds array (1-100 items)'
        });
      }

      const { lineIds, targetBankProfile } = validation.data;

      const startTime = Date.now();
      const eligibilityResults = await InstantReissueService.checkBulkEligibility(
        lineIds, 
        targetBankProfile
      );
      const processingTime = Date.now() - startTime;

      // Aggregate results
      const summary = {
        totalLines: eligibilityResults.length,
        eligibleLines: eligibilityResults.filter(r => r.eligible).length,
        ineligibleLines: eligibilityResults.filter(r => !r.eligible).length,
        totalFees: eligibilityResults
          .filter(r => r.eligible && r.instantFees)
          .reduce((sum, r) => sum + (r.instantFees?.total || 0), 0),
        riskBreakdown: {
          low: eligibilityResults.filter(r => r.riskLevel === 'LOW').length,
          medium: eligibilityResults.filter(r => r.riskLevel === 'MEDIUM').length,
          high: eligibilityResults.filter(r => r.riskLevel === 'HIGH').length,
        },
      };

      res.json({
        eligibility_check: {
          summary,
          results: eligibilityResults,
          processing_time: `${processingTime}ms`,
          target_met: processingTime < 150, // Target: <150ms
        },
        recommendations: {
          proceed_with_reissue: summary.eligibleLines > 0,
          estimated_settlement_time: 'Within 10 seconds',
          total_fees: `€${summary.totalFees.toFixed(2)}`,
          risk_assessment: summary.riskBreakdown.high > 0 ? 'HIGH' : 
                          summary.riskBreakdown.medium > 0 ? 'MEDIUM' : 'LOW',
        },
        cut_off_context: {
          within_cut_off: true, // Instant payments don't have traditional cut-offs
          next_sct_cut_off: 'Not applicable for instant payments',
          recommendation: 'Process immediately for instant settlement',
        },
      });

    } catch (error) {
      console.error('Eligibility check error:', error);
      res.status(500).json({
        error: 'ELIGIBILITY_CHECK_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to check eligibility'
      });
    }
  });

  /**
   * Execute instant re-issue
   * POST /v1/instant-reissue/execute
   */
  app.post('/v1/instant-reissue/execute', async (req, res) => {
    try {
      const validation = instantReissueSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          details: validation.error.errors,
          hint: 'Provide valid reissue request with required fields'
        });
      }

      const request = validation.data;

      // Execute instant re-issue with 30s target
      const result = await InstantReissueService.executeInstantReissue(request);

      // Determine response status based on success
      const statusCode = result.success ? 200 : 
                        result.failedLines.length > 0 ? 207 : // Multi-status for partial success
                        400;

      res.status(statusCode).json({
        execution_result: result,
        performance: {
          processing_time: `${result.processingTime}ms`,
          target_met: result.processingTime < 30000, // Target: 30s
          target: '30 seconds',
        },
        status_summary: {
          success: result.success,
          reissued: result.reissuedLines,
          superseded: result.supersededLines.length,
          failed: result.failedLines.length,
          protected: result.protectedLines.length,
        },
        next_steps: result.success ? [
          '✅ Monitor settlement progress',
          '✅ Track bank acceptance',
          '✅ Verify beneficiary receipt',
          '✅ Update payroll records',
        ] : [
          '❌ Review failed transactions',
          '🔍 Resolve eligibility issues', 
          '🔄 Retry if applicable',
        ],
        real_time_tracking: result.success ? {
          batch_id: result.newBatchId,
          status_endpoint: `/v1/instant-reissue/${result.newBatchId}/status`,
          expected_settlement: result.estimatedSettlement,
          monitoring_active: true,
        } : null,
      });

    } catch (error) {
      console.error('Instant re-issue execution error:', error);
      res.status(500).json({
        error: 'EXECUTION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to execute instant re-issue'
      });
    }
  });

  /**
   * Get real-time re-issue status
   * GET /v1/instant-reissue/:batchId/status
   */
  app.get('/v1/instant-reissue/:batchId/status', async (req, res) => {
    try {
      const { batchId } = req.params;

      if (!batchId.startsWith('IRIS-')) {
        return res.status(400).json({
          error: 'INVALID_BATCH_ID',
          detail: 'Batch ID must be an instant re-issue batch (IRIS-*)',
          hint: 'Use batch ID from instant re-issue execution response'
        });
      }

      const status = await InstantReissueService.getReissueStatus(batchId);

      res.json({
        batch_id: batchId,
        real_time_status: status,
        settlement_progress: {
          percentage: status.progress,
          estimated_completion: status.estimatedCompletion,
          real_time_updates: true,
        },
        timeline: status.timeline,
        monitoring: {
          active: status.progress < 100,
          refresh_interval: status.progress < 100 ? '5 seconds' : 'Completed',
          next_update: status.progress < 100 ? new Date(Date.now() + 5000).toISOString() : null,
        },
      });

    } catch (error) {
      console.error('Status check error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'BATCH_NOT_FOUND',
          detail: `Instant re-issue batch ${req.params.batchId} not found`,
          hint: 'Verify the batch ID and ensure it\'s an instant re-issue batch'
        });
      }

      res.status(500).json({
        error: 'STATUS_CHECK_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to check status'
      });
    }
  });

  /**
   * Get instant re-issue dashboard
   * GET /v1/instant-reissue/dashboard?entityId=...&period=...
   */
  app.get('/v1/instant-reissue/dashboard', async (req, res) => {
    try {
      const { entityId, period = '24h' } = req.query;

      if (!entityId) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entityId is required',
          hint: 'Provide entity ID for dashboard data'
        });
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      // Mock dashboard data - in production this would query actual data
      const dashboardData = {
        period: period as string,
        instant_reissue_stats: {
          total_reissues: 23,
          successful_reissues: 21,
          failed_reissues: 2,
          success_rate: 91.3,
          average_settlement_time: '8.2 seconds',
          total_amount_reissued: '€45,230.50',
          double_pay_protections: 18,
        },
        performance_metrics: {
          average_processing_time: '12.4 seconds',
          target_achievement: 95.7, // % of reissues within 30s target
          eligibility_check_time: '89ms',
          api_response_time: '145ms',
        },
        bank_breakdown: {
          alpha: { reissues: 8, success_rate: 100, avg_settlement: '7.8s' },
          piraeus: { reissues: 6, success_rate: 83.3, avg_settlement: '9.1s' },
          eurobank: { reissues: 5, success_rate: 100, avg_settlement: '8.0s' },
          nbg: { reissues: 4, success_rate: 75.0, avg_settlement: '8.9s' },
        },
        recent_activity: [
          {
            timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
            batch_id: 'IRIS-ABC12345',
            lines: 3,
            amount: '€2,456.78',
            status: 'settled',
            settlement_time: '8.2s',
          },
          {
            timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
            batch_id: 'IRIS-XYZ67890',
            lines: 1,
            amount: '€1,234.56',
            status: 'settled',
            settlement_time: '7.9s',
          },
        ],
      };

      res.json({
        entity_id: entityId,
        period,
        dashboard_data: dashboardData,
        last_updated: now.toISOString(),
        real_time: true,
      });

    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        error: 'DASHBOARD_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to load dashboard'
      });
    }
  });

  /**
   * Cancel in-flight instant re-issue (if possible)
   * POST /v1/instant-reissue/:batchId/cancel
   */
  app.post('/v1/instant-reissue/:batchId/cancel', async (req, res) => {
    try {
      const { batchId } = req.params;
      const { reason, operatorId } = req.body;

      if (!reason || !operatorId) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'reason and operatorId are required for cancellation',
          hint: 'Provide cancellation reason and operator ID'
        });
      }

      // In practice, cancellation of instant payments is very limited
      // Once submitted to TIPS, they cannot typically be cancelled
      res.json({
        batch_id: batchId,
        cancellation_result: {
          success: false,
          reason: 'INSTANT_PAYMENT_NON_CANCELLABLE',
          message: 'SCT Instant payments cannot be cancelled once submitted to TIPS',
          alternative_actions: [
            'Wait for settlement completion',
            'Request beneficiary to return funds (separate process)',
            'Contact bank for exceptional handling',
          ],
        },
        status: {
          current_status: 'in_progress',
          cancellable: false,
          estimated_completion: 'Within 10 seconds',
        },
      });

    } catch (error) {
      console.error('Cancellation error:', error);
      res.status(500).json({
        error: 'CANCELLATION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to process cancellation request'
      });
    }
  });
}