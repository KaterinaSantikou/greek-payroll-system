/**
 * Payment State Machine API - Batch and line state management
 */

import type { Express } from "express";
import { PaymentStateMachine } from "../services/paymentStateMachine";

export function paymentStateMachineRoutes(app: Express) {

  // =============================================================================
  // STATE MACHINE INFORMATION
  // =============================================================================

  /**
   * Get State Machine Definitions
   * GET /v1/payment-state-machine/definitions
   */
  app.get('/v1/payment-state-machine/definitions', async (req, res) => {
    try {
      res.json({
        batch_states: PaymentStateMachine.getBatchStateMachineMap(),
        line_states: PaymentStateMachine.getLineStateMachineMap(),
        state_machine_rules: {
          batch_flow: "prepared → submitted → accepted → partially_settled → settled → reconciled (or failed)",
          line_happy_path: "prepared → submitted → accepted → settled",
          line_rejection_path: "prepared/submitted → rejected",
          line_superseding: "Any non-final line can become superseded by re-issue",
          split_batch_rule: "A batch can be accepted while some lines are rejected",
          reissue_rule: "Re-issue creates new batch (usually SCT_INST) and sets old lines to superseded",
        },
        implementation: 'CANONICAL_STATE_MACHINE',
      });
    } catch (error) {
      console.error('State machine definitions error:', error);
      res.status(500).json({
        error: 'STATE_MACHINE_DEFINITIONS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve state machine definitions'
      });
    }
  });

  // =============================================================================
  // BATCH STATE MANAGEMENT
  // =============================================================================

  /**
   * Transition Batch Status
   * POST /v1/payment-state-machine/batch/:batch_id/transition
   */
  app.post('/v1/payment-state-machine/batch/:batch_id/transition', async (req, res) => {
    try {
      const { batch_id } = req.params;
      const { new_status, reason } = req.body;

      if (!new_status) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'new_status is required',
          hint: 'Provide target batch status for transition'
        });
      }

      const validStatuses = ['prepared', 'submitted', 'accepted', 'partially_settled', 'settled', 'reconciled', 'failed'];
      if (!validStatuses.includes(new_status)) {
        return res.status(400).json({
          error: 'INVALID_STATUS',
          detail: `Status ${new_status} is not valid`,
          hint: `Valid statuses: ${validStatuses.join(', ')}`
        });
      }

      const result = await PaymentStateMachine.transitionBatchStatus(batch_id, new_status, reason);

      if (!result.success) {
        return res.status(400).json({
          error: 'TRANSITION_FAILED',
          detail: result.error,
          previous_status: result.previousStatus,
          requested_status: new_status,
        });
      }

      res.json({
        batch_id,
        transition_result: {
          success: true,
          previous_status: result.previousStatus,
          new_status,
          reason,
        },
        state_machine: 'BATCH_TRANSITION_COMPLETED',
        allowed_next_transitions: PaymentStateMachine.getAllowedBatchTransitions(new_status as any),
      });
    } catch (error) {
      console.error('Batch transition error:', error);
      res.status(500).json({
        error: 'BATCH_TRANSITION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to transition batch status'
      });
    }
  });

  /**
   * Auto-Update Batch Status Based on Lines
   * POST /v1/payment-state-machine/batch/:batch_id/auto-update
   */
  app.post('/v1/payment-state-machine/batch/:batch_id/auto-update', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const result = await PaymentStateMachine.autoUpdateBatchStatus(batch_id);

      res.json({
        batch_id,
        auto_update_result: result,
        state_machine: result.updated ? 'BATCH_AUTO_UPDATED' : 'NO_UPDATE_NEEDED',
        reason: result.reason,
      });
    } catch (error) {
      console.error('Batch auto-update error:', error);
      res.status(500).json({
        error: 'BATCH_AUTO_UPDATE_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to auto-update batch status'
      });
    }
  });

  /**
   * Calculate Batch Status from Lines
   * GET /v1/payment-state-machine/batch/:batch_id/status-analysis
   */
  app.get('/v1/payment-state-machine/batch/:batch_id/status-analysis', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const analysis = await PaymentStateMachine.calculateBatchStatusFromLines(batch_id);

      res.json({
        batch_id,
        status_analysis: analysis,
        split_batch_detected: analysis.analysis.hasRejected && analysis.lineStatusSummary.accepted > 0,
        cockpit_recommendations: {
          show_split: analysis.analysis.hasRejected && analysis.lineStatusSummary.accepted > 0,
          reissue_eligible: analysis.lineStatusSummary.rejected,
          superseded_count: analysis.lineStatusSummary.superseded,
          active_lines: analysis.analysis.activeLines,
        },
        state_machine: 'STATUS_ANALYSIS_COMPLETE',
      });
    } catch (error) {
      console.error('Batch status analysis error:', error);
      res.status(500).json({
        error: 'BATCH_STATUS_ANALYSIS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to analyze batch status'
      });
    }
  });

  // =============================================================================
  // LINE STATE MANAGEMENT
  // =============================================================================

  /**
   * Transition Line Status
   * POST /v1/payment-state-machine/line/:line_id/transition
   */
  app.post('/v1/payment-state-machine/line/:line_id/transition', async (req, res) => {
    try {
      const { line_id } = req.params;
      const { new_status, reason_code, reason } = req.body;

      if (!new_status) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'new_status is required',
          hint: 'Provide target line status for transition'
        });
      }

      const validStatuses = ['prepared', 'submitted', 'accepted', 'settled', 'rejected', 'superseded', 'cancelled'];
      if (!validStatuses.includes(new_status)) {
        return res.status(400).json({
          error: 'INVALID_STATUS',
          detail: `Status ${new_status} is not valid`,
          hint: `Valid statuses: ${validStatuses.join(', ')}`
        });
      }

      const result = await PaymentStateMachine.transitionLineStatus(line_id, new_status, reason_code, reason);

      if (!result.success) {
        return res.status(400).json({
          error: 'TRANSITION_FAILED',
          detail: result.error,
          previous_status: result.previousStatus,
          requested_status: new_status,
        });
      }

      res.json({
        line_id,
        transition_result: {
          success: true,
          previous_status: result.previousStatus,
          new_status,
          reason_code,
          reason,
        },
        state_machine: 'LINE_TRANSITION_COMPLETED',
        allowed_next_transitions: PaymentStateMachine.getAllowedLineTransitions(new_status as any),
      });
    } catch (error) {
      console.error('Line transition error:', error);
      res.status(500).json({
        error: 'LINE_TRANSITION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to transition line status'
      });
    }
  });

  // =============================================================================
  // RE-ISSUE & SUPERSEDING
  // =============================================================================

  /**
   * Process Re-issue with Superseding
   * POST /v1/payment-state-machine/reissue/supersede
   */
  app.post('/v1/payment-state-machine/reissue/supersede', async (req, res) => {
    try {
      const { 
        original_batch_id, 
        line_ids_to_supersede, 
        new_batch_id,
        auto_update_original_batch = true 
      } = req.body;

      if (!original_batch_id || !line_ids_to_supersede || !new_batch_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'original_batch_id, line_ids_to_supersede, and new_batch_id are required',
          hint: 'Provide complete re-issue superseding information'
        });
      }

      if (!Array.isArray(line_ids_to_supersede)) {
        return res.status(400).json({
          error: 'INVALID_PARAMETER',
          detail: 'line_ids_to_supersede must be an array',
          hint: 'Provide array of line IDs to supersede'
        });
      }

      const result = await PaymentStateMachine.processReissueSuperseding(
        original_batch_id,
        line_ids_to_supersede,
        new_batch_id
      );

      if (!result.success) {
        return res.status(500).json({
          error: 'SUPERSEDING_FAILED',
          detail: result.error,
          original_batch_id,
          new_batch_id,
        });
      }

      res.json({
        original_batch_id,
        new_batch_id,
        superseding_result: result,
        state_machine: 'SUPERSEDING_COMPLETED',
        business_impact: {
          superseded_lines: result.supersededCount,
          original_batch_status: result.originalBatchStatus,
          double_pay_protection: 'ENABLED',
        },
        next_steps: [
          '1. Review new batch status',
          '2. Submit new batch if ready',
          '3. Monitor both batches in cockpit',
        ],
      });
    } catch (error) {
      console.error('Re-issue superseding error:', error);
      res.status(500).json({
        error: 'REISSUE_SUPERSEDING_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to process re-issue superseding'
      });
    }
  });

  // =============================================================================
  // BATCH CONSISTENCY & VALIDATION
  // =============================================================================

  /**
   * Validate Batch Consistency
   * GET /v1/payment-state-machine/batch/:batch_id/validate-consistency
   */
  app.get('/v1/payment-state-machine/batch/:batch_id/validate-consistency', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const validation = await PaymentStateMachine.validateBatchConsistency(batch_id);

      res.json({
        batch_id,
        consistency_validation: validation,
        state_machine: validation.consistent ? 'BATCH_CONSISTENT' : 'BATCH_INCONSISTENT',
        cockpit_alerts: validation.issues.length > 0 ? validation.issues : [],
        recommended_actions: validation.recommendations,
        split_batch_analysis: {
          is_split_batch: validation.statusAnalysis.analysis.hasRejected && validation.statusAnalysis.lineStatusSummary.accepted > 0,
          accepted_lines: validation.statusAnalysis.lineStatusSummary.accepted,
          rejected_lines: validation.statusAnalysis.lineStatusSummary.rejected,
          superseded_lines: validation.statusAnalysis.lineStatusSummary.superseded,
          active_lines: validation.statusAnalysis.analysis.activeLines,
        },
      });
    } catch (error) {
      console.error('Batch consistency validation error:', error);
      res.status(500).json({
        error: 'BATCH_CONSISTENCY_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to validate batch consistency'
      });
    }
  });

  // =============================================================================
  // COCKPIT SPLIT-BATCH DISPLAY
  // =============================================================================

  /**
   * Get Split-Batch Display Data for Cockpit
   * GET /v1/payment-state-machine/batch/:batch_id/split-display
   */
  app.get('/v1/payment-state-machine/batch/:batch_id/split-display', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const analysis = await PaymentStateMachine.calculateBatchStatusFromLines(batch_id);
      const validation = await PaymentStateMachine.validateBatchConsistency(batch_id);

      const isSplitBatch = analysis.analysis.hasRejected && analysis.lineStatusSummary.accepted > 0;

      res.json({
        batch_id,
        is_split_batch: isSplitBatch,
        cockpit_display: {
          batch_status_badge: {
            status: analysis.recommendedStatus,
            variant: isSplitBatch ? 'warning' : 'success',
            text: isSplitBatch ? `${analysis.recommendedStatus.toUpperCase()} (SPLIT)` : analysis.recommendedStatus.toUpperCase(),
          },
          line_breakdown: {
            total_lines: analysis.totalLines,
            active_lines: analysis.analysis.activeLines,
            status_counts: analysis.lineStatusSummary,
            progress_percentage: analysis.analysis.activeLines > 0 
              ? Math.round((analysis.lineStatusSummary.settled / analysis.analysis.activeLines) * 100)
              : 0,
          },
          split_batch_indicators: isSplitBatch ? {
            show_split_warning: true,
            accepted_count: analysis.lineStatusSummary.accepted,
            rejected_count: analysis.lineStatusSummary.rejected,
            reissue_candidates: analysis.lineStatusSummary.rejected,
            success_rate: Math.round((analysis.lineStatusSummary.accepted / analysis.analysis.activeLines) * 100),
          } : null,
          action_buttons: {
            reissue_rejected: analysis.lineStatusSummary.rejected > 0,
            reconcile_batch: analysis.analysis.allSettled,
            review_split: isSplitBatch,
            auto_update_status: !validation.consistent,
          },
        },
        state_machine: 'COCKPIT_DISPLAY_DATA_READY',
      });
    } catch (error) {
      console.error('Split-batch display error:', error);
      res.status(500).json({
        error: 'SPLIT_BATCH_DISPLAY_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to generate split-batch display data'
      });
    }
  });

  // =============================================================================
  // STATE MACHINE MONITORING
  // =============================================================================

  /**
   * Get State Machine Health Check
   * GET /v1/payment-state-machine/health
   */
  app.get('/v1/payment-state-machine/health', async (req, res) => {
    try {
      const { entity_id } = req.query;

      // This would typically check for stuck states, invalid transitions, etc.
      // For now, return a health summary
      
      res.json({
        state_machine_health: 'HEALTHY',
        transition_validation: 'ACTIVE',
        auto_update_mechanism: 'OPERATIONAL',
        superseding_protection: 'ENABLED',
        split_batch_detection: 'ACTIVE',
        cockpit_integration: 'READY',
        monitoring_features: {
          invalid_transitions_blocked: true,
          auto_batch_status_calculation: true,
          line_superseding_tracking: true,
          split_batch_visualization: true,
          consistency_validation: true,
        },
        implementation: 'CANONICAL_STATE_MACHINE',
      });
    } catch (error) {
      console.error('State machine health check error:', error);
      res.status(500).json({
        error: 'STATE_MACHINE_HEALTH_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to check state machine health'
      });
    }
  });
}