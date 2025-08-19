/**
 * Payments Operations API - SEPA batch monitoring cockpit
 */

import type { Express } from "express";
import { PaymentsOpsService } from "../services/paymentsOpsService";

export function paymentsOpsRoutes(app: Express) {

  // =============================================================================
  // PAYMENTS COCKPIT OVERVIEW
  // =============================================================================

  /**
   * Get Payments Cockpit Summary
   * GET /v1/payments-ops/cockpit/summary?entity_id=...&start_date=...&end_date=...
   */
  app.get('/v1/payments-ops/cockpit/summary', async (req, res) => {
    try {
      const { entity_id, start_date, end_date } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entity_id is required',
          hint: 'Provide entity ID for payments summary'
        });
      }

      let dateRange;
      if (start_date || end_date) {
        dateRange = {
          start: start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: end_date ? new Date(end_date as string) : new Date(),
        };
      }

      const summary = await PaymentsOpsService.getCockpitSummary(
        entity_id as string,
        dateRange
      );

      res.json({
        entity_id,
        date_range: dateRange,
        summary,
        generated_at: new Date().toISOString(),
        cockpit_status: 'OPERATIONAL',
        real_time_data: true,
      });
    } catch (error) {
      console.error('Cockpit summary error:', error);
      res.status(500).json({
        error: 'COCKPIT_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to generate cockpit summary'
      });
    }
  });

  // =============================================================================
  // BATCH MONITORING
  // =============================================================================

  /**
   * Get Batch Details with Real-time Status
   * GET /v1/payments-ops/batches/:batch_id/details
   */
  app.get('/v1/payments-ops/batches/:batch_id/details', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const batchDetails = await PaymentsOpsService.getBatchDetails(batch_id);

      if (!batchDetails) {
        return res.status(404).json({
          error: 'BATCH_NOT_FOUND',
          detail: `Payment batch ${batch_id} not found`,
          hint: 'Verify the batch ID and try again'
        });
      }

      res.json({
        batch_id,
        batch_details: batchDetails,
        monitoring_active: true,
        last_updated: new Date().toISOString(),
        reconciliation_complete: batchDetails.reconciliation.pain002Received && batchDetails.reconciliation.camt054Received,
        action_required: batchDetails.exceptions.filter(e => e.canReissue).length > 0,
      });
    } catch (error) {
      console.error('Batch details error:', error);
      res.status(500).json({
        error: 'BATCH_DETAILS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve batch details'
      });
    }
  });

  /**
   * Get Live Reconciliation Status
   * GET /v1/payments-ops/batches/:batch_id/reconciliation
   */
  app.get('/v1/payments-ops/batches/:batch_id/reconciliation', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const batchDetails = await PaymentsOpsService.getBatchDetails(batch_id);

      if (!batchDetails) {
        return res.status(404).json({
          error: 'BATCH_NOT_FOUND',
          detail: `Payment batch ${batch_id} not found`
        });
      }

      const reconciliation = batchDetails.reconciliation;
      const isComplete = reconciliation.pain002Received && reconciliation.camt054Received;
      
      res.json({
        batch_id,
        reconciliation_status: {
          ...reconciliation,
          is_complete: isComplete,
          completion_percentage: Math.round(
            (reconciliation.matchedTransactions / batchDetails.totalTransactions) * 100
          ),
          pending_settlements: batchDetails.totalTransactions - reconciliation.matchedTransactions,
        },
        bank_messages: {
          pain002_status: reconciliation.pain002Received ? 'RECEIVED' : 'PENDING',
          camt054_status: reconciliation.camt054Received ? 'RECEIVED' : 'PENDING',
          last_message: new Date().toISOString(),
        },
        settlement_summary: {
          expected_amount: batchDetails.totalAmount,
          settled_amount: reconciliation.settledAmount,
          variance: (parseFloat(batchDetails.totalAmount) - parseFloat(reconciliation.settledAmount)).toFixed(2),
          variance_percentage: Math.round(
            ((parseFloat(batchDetails.totalAmount) - parseFloat(reconciliation.settledAmount)) / parseFloat(batchDetails.totalAmount)) * 100 * 100
          ) / 100,
        },
      });
    } catch (error) {
      console.error('Reconciliation status error:', error);
      res.status(500).json({
        error: 'RECONCILIATION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve reconciliation status'
      });
    }
  });

  // =============================================================================
  // PAYMENT METHOD BREAKDOWN
  // =============================================================================

  /**
   * Get SCT vs SCT Instant Breakdown
   * GET /v1/payments-ops/payment-methods/breakdown?entity_id=...&date_range=...
   */
  app.get('/v1/payments-ops/payment-methods/breakdown', async (req, res) => {
    try {
      const { entity_id, start_date, end_date } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entity_id is required'
        });
      }

      let dateRange;
      if (start_date || end_date) {
        dateRange = {
          start: start_date ? new Date(start_date as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: end_date ? new Date(end_date as string) : new Date(),
        };
      }

      const summary = await PaymentsOpsService.getCockpitSummary(entity_id as string, dateRange);

      const breakdown = summary.paymentMethodBreakdown;
      const totalCount = breakdown.sct.count + breakdown.sct_inst.count;
      const totalAmount = parseFloat(breakdown.sct.amount) + parseFloat(breakdown.sct_inst.amount);

      res.json({
        entity_id,
        date_range: dateRange,
        payment_method_breakdown: {
          sct: {
            ...breakdown.sct,
            percentage_of_count: totalCount > 0 ? Math.round((breakdown.sct.count / totalCount) * 100) : 0,
            percentage_of_amount: totalAmount > 0 ? Math.round((parseFloat(breakdown.sct.amount) / totalAmount) * 100) : 0,
            average_amount: breakdown.sct.count > 0 ? (parseFloat(breakdown.sct.amount) / breakdown.sct.count).toFixed(2) : '0.00',
          },
          sct_instant: {
            ...breakdown.sct_inst,
            percentage_of_count: totalCount > 0 ? Math.round((breakdown.sct_inst.count / totalCount) * 100) : 0,
            percentage_of_amount: totalAmount > 0 ? Math.round((parseFloat(breakdown.sct_inst.amount) / totalAmount) * 100) : 0,
            average_amount: breakdown.sct_inst.count > 0 ? (parseFloat(breakdown.sct_inst.amount) / breakdown.sct_inst.count).toFixed(2) : '0.00',
          },
        },
        totals: {
          count: totalCount,
          amount: totalAmount.toFixed(2),
        },
        method_adoption: {
          instant_adoption_rate: totalCount > 0 ? Math.round((breakdown.sct_inst.count / totalCount) * 100) : 0,
          recommendation: breakdown.sct_inst.count < breakdown.sct.count ? 'Consider SCT Instant for faster settlement' : 'Good SCT Instant adoption',
        },
      });
    } catch (error) {
      console.error('Payment method breakdown error:', error);
      res.status(500).json({
        error: 'BREAKDOWN_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to generate payment method breakdown'
      });
    }
  });

  // =============================================================================
  // EXCEPTION HANDLING
  // =============================================================================

  /**
   * Get Payment Exceptions Dashboard
   * GET /v1/payments-ops/exceptions?entity_id=...&severity=...&status=...
   */
  app.get('/v1/payments-ops/exceptions', async (req, res) => {
    try {
      const { entity_id, severity, status, reissue_eligible } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entity_id is required'
        });
      }

      const summary = await PaymentsOpsService.getCockpitSummary(entity_id as string);

      res.json({
        entity_id,
        exceptions_summary: summary.exceptionsSummary,
        filters_applied: { severity, status, reissue_eligible },
        priority_actions: [
          ...(summary.exceptionsSummary.critical > 0 ? ['Review critical exceptions immediately'] : []),
          ...(summary.exceptionsSummary.reissueEligible > 0 ? [`${summary.exceptionsSummary.reissueEligible} transactions eligible for SCT Instant re-issue`] : []),
          ...(summary.cutOffStatus.breached > 0 ? [`${summary.cutOffStatus.breached} batches past cut-off time`] : []),
        ],
        recommended_actions: {
          reissue_as_instant: summary.exceptionsSummary.reissueEligible,
          review_cut_offs: summary.cutOffStatus.recommendInstant,
          investigate_rejects: summary.exceptionsSummary.open,
        },
        exception_trends: {
          total_exceptions: summary.exceptionsSummary.total,
          resolution_rate: summary.exceptionsSummary.total > 0 
            ? Math.round(((summary.exceptionsSummary.total - summary.exceptionsSummary.open) / summary.exceptionsSummary.total) * 100)
            : 100,
        },
      });
    } catch (error) {
      console.error('Exceptions error:', error);
      res.status(500).json({
        error: 'EXCEPTIONS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve exception details'
      });
    }
  });

  // =============================================================================
  // RE-ISSUE AS SCT INSTANT
  // =============================================================================

  /**
   * Re-issue Failed Payments as SCT Instant
   * POST /v1/payments-ops/reissue/sct-instant
   */
  app.post('/v1/payments-ops/reissue/sct-instant', async (req, res) => {
    try {
      const { entity_id, transaction_ids, urgency = 'HIGH', double_pay_protection = true, reason = 'Failed transaction re-issue' } = req.body;

      if (!entity_id || !transaction_ids || !Array.isArray(transaction_ids)) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          detail: 'entity_id and transaction_ids array are required',
          hint: 'Provide list of failed transaction IDs to re-issue as SCT Instant'
        });
      }

      const reissueRequest = {
        originalTransactionIds: transaction_ids,
        targetMethod: 'SCT_INST' as const,
        reason,
        urgency: urgency as 'HIGH' | 'URGP',
        doublePayProtection: double_pay_protection,
      };

      const result = await PaymentsOpsService.reissueAsInstant(entity_id, reissueRequest);

      res.json({
        reissue_request: {
          entity_id,
          original_transactions: transaction_ids.length,
          target_method: 'SCT_INSTANT',
          urgency,
          double_pay_protection,
        },
        reissue_result: result,
        success: result.reissuedTransactions > 0,
        next_steps: result.reissuedTransactions > 0 ? [
          '1. Review new SCT Instant batch',
          '2. Monitor bank acceptance',
          '3. Track settlement status',
        ] : [
          '1. Review rejected transactions',
          '2. Resolve eligibility issues',
          '3. Retry reissue if applicable',
        ],
        warnings: [
          ...(result.protectedTransactions.length > 0 ? [`${result.protectedTransactions.length} transactions protected from double-pay`] : []),
          ...(result.rejectedTransactions.length > 0 ? [`${result.rejectedTransactions.length} transactions rejected for re-issue`] : []),
        ],
      });
    } catch (error) {
      console.error('Re-issue error:', error);
      res.status(500).json({
        error: 'REISSUE_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to re-issue transactions as SCT Instant'
      });
    }
  });

  // =============================================================================
  // CUT-OFF MANAGEMENT
  // =============================================================================

  /**
   * Get Cut-off Status and Recommendations
   * GET /v1/payments-ops/cut-offs/status?entity_id=...
   */
  app.get('/v1/payments-ops/cut-offs/status', async (req, res) => {
    try {
      const { entity_id } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entity_id is required'
        });
      }

      const summary = await PaymentsOpsService.getCockpitSummary(entity_id as string);
      const bankProfiles = await PaymentsOpsService.getBankProfiles();

      const cutOffStatus = summary.cutOffStatus;
      
      res.json({
        entity_id,
        cut_off_summary: cutOffStatus,
        bank_profiles: bankProfiles.map(profile => ({
          profile_id: profile.profileId,
          bank_name: profile.bankName,
          sct_cut_off: profile.sctCutOffTime,
          sct_inst_cut_off: profile.sctInstCutOffTime,
          supports_instant: profile.supportsSctInst,
          timezone: profile.timezone,
        })),
        recommendations: {
          immediate_action_required: cutOffStatus.breached > 0,
          consider_instant_payments: cutOffStatus.recommendInstant > 0,
          total_batches_at_risk: cutOffStatus.approaching + cutOffStatus.breached,
        },
        next_cut_offs: bankProfiles.map(profile => {
          const now = new Date();
          const [hours, minutes] = profile.sctCutOffTime.split(':');
          const todaysCutOff = new Date(now);
          todaysCutOff.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          const nextCutOff = todaysCutOff > now ? todaysCutOff : new Date(todaysCutOff.getTime() + 24 * 60 * 60 * 1000);
          
          return {
            bank_profile: profile.profileId,
            next_cut_off: nextCutOff.toISOString(),
            time_remaining: `${Math.max(0, Math.floor((nextCutOff.getTime() - now.getTime()) / (60 * 1000)))} minutes`,
          };
        }),
      });
    } catch (error) {
      console.error('Cut-off status error:', error);
      res.status(500).json({
        error: 'CUT_OFF_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve cut-off status'
      });
    }
  });

  // =============================================================================
  // BANK RECONCILIATION
  // =============================================================================

  /**
   * Process Bank Reconciliation Message
   * POST /v1/payments-ops/reconciliation/process-message
   */
  app.post('/v1/payments-ops/reconciliation/process-message', async (req, res) => {
    try {
      const { message_type, original_message_id, message_data } = req.body;

      if (!message_type || !original_message_id || !message_data) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'message_type, original_message_id, and message_data are required',
          hint: 'Provide complete bank reconciliation message details'
        });
      }

      if (!['pain.002', 'camt.054', 'camt.053'].includes(message_type)) {
        return res.status(400).json({
          error: 'INVALID_MESSAGE_TYPE',
          detail: `Message type ${message_type} not supported`,
          hint: 'Supported types: pain.002, camt.054, camt.053'
        });
      }

      const result = await PaymentsOpsService.processReconciliationMessage(
        message_type,
        original_message_id,
        message_data
      );

      res.json({
        message_type,
        original_message_id,
        processing_result: result,
        reconciliation_status: result.processed ? 'SUCCESS' : 'FAILED',
        batch_updated: result.batchId || null,
        updates_applied: result.updates,
        message: result.processed 
          ? `Successfully processed ${message_type} message with ${result.updates} updates`
          : `Failed to process ${message_type} message - batch not found`,
      });
    } catch (error) {
      console.error('Reconciliation processing error:', error);
      res.status(500).json({
        error: 'RECONCILIATION_PROCESSING_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to process reconciliation message'
      });
    }
  });
}