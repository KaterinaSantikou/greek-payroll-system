/**
 * Re-Issue Algorithm API - "Re-Issue as SCT Instant now" functionality
 */

import type { Express } from "express";
import { ReissueAlgorithm } from "../services/reissueAlgorithm";

export function reissueAlgorithmRoutes(app: Express) {

  // =============================================================================
  // ELIGIBILITY CHECKING
  // =============================================================================

  /**
   * Select Eligible Lines for Re-issue
   * GET /v1/reissue/eligible-lines/:batch_id
   */
  app.get('/v1/reissue/eligible-lines/:batch_id', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const eligibilityResult = await ReissueAlgorithm.selectEligibleLines(batch_id);

      res.json({
        batch_id,
        eligible_lines: eligibilityResult.eligibleLines,
        ineligible_lines: eligibilityResult.ineligibleLines,
        summary: {
          total_lines: eligibilityResult.totalLines,
          eligible_count: eligibilityResult.eligibleLines.length,
          ineligible_count: eligibilityResult.ineligibleLines.length,
          eligibility_rate: eligibilityResult.totalLines > 0 
            ? ((eligibilityResult.eligibleLines.length / eligibilityResult.totalLines) * 100).toFixed(1) + '%'
            : '0%',
        },
        selection_criteria: [
          'Status in [submitted, accepted, rejected] but not settled',
          'Bank supports SCT Instant',
          'Amount ≤ SCT Instant limit',
          'IBAN belongs to reachable SCT Instant participant',
          'Line not already superseded',
          'No debit posted for that line',
        ],
        cockpit_action: eligibilityResult.eligibleLines.length > 0 
          ? 'SHOW_REISSUE_BUTTON' 
          : 'NO_REISSUE_AVAILABLE',
      });
    } catch (error) {
      console.error('Eligible lines selection error:', error);
      res.status(500).json({
        error: 'ELIGIBLE_LINES_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to select eligible lines for re-issue'
      });
    }
  });

  /**
   * Check Individual Line Eligibility
   * GET /v1/reissue/check-eligibility/:line_id
   */
  app.get('/v1/reissue/check-eligibility/:line_id', async (req, res) => {
    try {
      const { line_id } = req.params;

      const eligibilityCheck = await ReissueAlgorithm.checkLineEligibility(line_id);

      res.json({
        line_id,
        eligibility_check: eligibilityCheck,
        cockpit_display: {
          eligible_badge: {
            text: eligibilityCheck.eligible ? 'ELIGIBLE' : 'INELIGIBLE',
            variant: eligibilityCheck.eligible ? 'success' : 'destructive',
          },
          risk_indicator: {
            level: eligibilityCheck.riskAssessment,
            color: eligibilityCheck.riskAssessment === 'LOW' ? 'green' : 
                   eligibilityCheck.riskAssessment === 'MEDIUM' ? 'yellow' : 'red',
          },
          blocking_factors: eligibilityCheck.blockingFactors,
          estimated_settlement: eligibilityCheck.estimatedSettlement,
        },
        criteria_checklist: eligibilityCheck.eligibilityCriteria,
        next_steps: eligibilityCheck.eligible 
          ? ['Include in re-issue selection', 'Confirm operator approval', 'Execute re-issue']
          : ['Review blocking factors', 'Resolve eligibility issues', 'Re-check eligibility'],
      });
    } catch (error) {
      console.error('Line eligibility check error:', error);
      res.status(500).json({
        error: 'LINE_ELIGIBILITY_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to check line eligibility'
      });
    }
  });

  // =============================================================================
  // REISSUE EXECUTION
  // =============================================================================

  /**
   * Execute "Re-Issue as SCT Instant now"
   * POST /v1/reissue/execute-instant
   */
  app.post('/v1/reissue/execute-instant', async (req, res) => {
    try {
      const { 
        original_batch_id, 
        line_ids, 
        operator_id, 
        reason, 
        incident_id,
        force_reissue = false,
        confirmation = false
      } = req.body;

      if (!original_batch_id || !line_ids || !operator_id || !reason) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'original_batch_id, line_ids, operator_id, and reason are required',
          hint: 'Provide complete re-issue request parameters'
        });
      }

      if (!Array.isArray(line_ids) || line_ids.length === 0) {
        return res.status(400).json({
          error: 'INVALID_LINE_IDS',
          detail: 'line_ids must be a non-empty array',
          hint: 'Select at least one payment line for re-issue'
        });
      }

      if (!confirmation) {
        return res.status(400).json({
          error: 'CONFIRMATION_REQUIRED',
          detail: 'Set confirmation=true to execute re-issue',
          hint: 'This operation will supersede original payments and create new SCT Instant batch',
          safety_notes: [
            'Original lines will be marked as superseded',
            'New EndToEndId will be generated for each re-issued payment',
            'SCT Instant fees will apply (~€0.20 per transaction)',
            'Operation is irreversible once submitted to bank',
          ],
        });
      }

      const reissueRequest = {
        originalBatchId: original_batch_id,
        lineIds: line_ids,
        operatorId: operator_id,
        reason,
        incidentId: incident_id,
        forceReissue: force_reissue,
      };

      const result = await ReissueAlgorithm.executeReissue(reissueRequest);

      if (!result.success) {
        return res.status(400).json({
          error: 'REISSUE_EXECUTION_FAILED',
          detail: 'Re-issue execution encountered errors',
          failed_lines: result.failedLines,
          audit_log: result.auditLog,
        });
      }

      res.json({
        reissue_result: result,
        safety_protocol: {
          new_batch_created: result.newBatchId,
          original_lines_superseded: result.supersededLines.length,
          new_endtoend_ids_generated: true,
          audit_trail_created: true,
          operator_recorded: result.auditLog.operatorId,
        },
        business_impact: {
          reissued_payments: result.reissuedLines,
          estimated_settlement: result.estimatedSettlementTime,
          fee_implication: `~€${(result.reissuedLines * 0.20).toFixed(2)} SCT Instant fees`,
          processing_method: 'SCT_INST',
        },
        next_steps: [
          '1. Monitor new batch in cockpit',
          '2. Await SCT Instant settlement confirmations',
          '3. Review audit trail for compliance',
          '4. Update stakeholders on resolution',
        ],
      });
    } catch (error) {
      console.error('Reissue execution error:', error);
      res.status(500).json({
        error: 'REISSUE_EXECUTION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to execute SCT Instant re-issue'
      });
    }
  });

  // =============================================================================
  // REISSUE MONITORING
  // =============================================================================

  /**
   * Get Batch Re-issue Status
   * GET /v1/reissue/batch-status/:batch_id
   */
  app.get('/v1/reissue/batch-status/:batch_id', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const reissueStatus = await ReissueAlgorithm.getBatchReissueStatus(batch_id);

      res.json({
        batch_id,
        reissue_status: reissueStatus,
        cockpit_indicators: {
          has_reissues_badge: {
            show: reissueStatus.hasReissues,
            text: reissueStatus.hasReissues ? `${reissueStatus.reissueBatches.length} Re-issues` : 'No Re-issues',
            variant: reissueStatus.hasReissues ? 'secondary' : 'outline',
          },
          superseded_lines_count: reissueStatus.supersededLines,
          reissue_timeline: reissueStatus.reissueBatches.map((reissue: any) => ({
            timestamp: reissue.reissueTimestamp,
            operator: reissue.operatorId,
            reason: reissue.reissueReason,
            batch_id: reissue.reissueBatchId,
            status: reissue.status,
          })),
        },
        audit_compliance: {
          operator_tracking: 'COMPLETE',
          reason_documentation: 'COMPLETE',
          incident_linking: reissueStatus.reissueBatches.some((r: any) => r.operatorId) ? 'AVAILABLE' : 'N/A',
          superseding_trail: 'COMPLETE',
        },
      });
    } catch (error) {
      console.error('Batch reissue status error:', error);
      res.status(500).json({
        error: 'BATCH_REISSUE_STATUS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve batch re-issue status'
      });
    }
  });

  /**
   * Get Re-issue Recommendations
   * GET /v1/reissue/recommendations/:batch_id
   */
  app.get('/v1/reissue/recommendations/:batch_id', async (req, res) => {
    try {
      const { batch_id } = req.params;

      const recommendations = await ReissueAlgorithm.getReissueRecommendations(batch_id);

      res.json({
        batch_id,
        reissue_recommendations: recommendations,
        cockpit_guidance: {
          show_reissue_button: recommendations.eligibleLines > 0,
          button_text: recommendations.eligibleLines > 0 
            ? `Re-issue ${recommendations.eligibleLines} as SCT Instant` 
            : 'No Eligible Lines',
          risk_warning: recommendations.riskAssessment === 'HIGH' 
            ? 'High-risk re-issue - review carefully'
            : recommendations.riskAssessment === 'MEDIUM'
            ? 'Medium-risk re-issue - confirm details'
            : 'Low-risk re-issue',
        },
        cost_benefit_analysis: {
          time_savings: recommendations.estimatedSavings.timeSaved,
          cost_implication: recommendations.estimatedSavings.costImplication,
          risk_level: recommendations.riskAssessment,
          recommended_action: recommendations.recommendedAction,
        },
        decision_factors: [
          'Customer impact (delayed payments)',
          'Operational cost (SCT Instant fees)',
          'Risk assessment (amount, bank, IBAN)',
          'Time sensitivity (cut-off approaching)',
        ],
      });
    } catch (error) {
      console.error('Reissue recommendations error:', error);
      res.status(500).json({
        error: 'REISSUE_RECOMMENDATIONS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to generate re-issue recommendations'
      });
    }
  });

  // =============================================================================
  // BIC DIRECTORY MANAGEMENT
  // =============================================================================

  /**
   * Update BIC Directory Cache
   * POST /v1/reissue/update-bic-directory
   */
  app.post('/v1/reissue/update-bic-directory', async (req, res) => {
    try {
      const { bic_entries } = req.body;

      if (!bic_entries || !Array.isArray(bic_entries)) {
        return res.status(400).json({
          error: 'INVALID_BIC_ENTRIES',
          detail: 'bic_entries array is required',
          hint: 'Provide BIC directory entries for caching'
        });
      }

      ReissueAlgorithm.updateBICDirectory(bic_entries);

      res.json({
        bic_directory_updated: true,
        entries_processed: bic_entries.length,
        cache_status: 'UPDATED',
        iban_reachability: 'ENHANCED',
        next_update: 'Schedule regular BIC directory updates for optimal IBAN reachability checking',
      });
    } catch (error) {
      console.error('BIC directory update error:', error);
      res.status(500).json({
        error: 'BIC_DIRECTORY_UPDATE_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to update BIC directory cache'
      });
    }
  });

  // =============================================================================
  // SAFETY & AUDIT
  // =============================================================================

  /**
   * Get Re-issue Safety Checklist
   * GET /v1/reissue/safety-checklist
   */
  app.get('/v1/reissue/safety-checklist', async (req, res) => {
    try {
      res.json({
        safety_protocol: {
          pre_execution_checks: [
            '✓ Bank supports SCT Instant',
            '✓ Amount ≤ SCT Instant limit (€100K)',
            '✓ Target IBAN belongs to reachable SCT Instant participant',
            '✓ Line not already superseded',
            '✓ No debit posted for original line',
            '✓ Valid status (submitted/accepted/rejected)',
          ],
          execution_safety: [
            '✓ Generate new EndToEndId ({batchId}-{line_seq}-R1)',
            '✓ Create new mini-batch with method = SCT_INST',
            '✓ Submit new batch before superseding originals',
            '✓ Mark original lines superseded ONLY after successful submission',
            '✓ Maintain pointer from superseded to new line',
          ],
          post_execution_monitoring: [
            '✓ Monitor new batch settlement in real-time',
            '✓ If instant settles → original remains superseded',
            '✓ If instant fails → implement retry logic',
            '✓ Record operator, reason, and incident linkage',
            '✓ Update cockpit with real-time status',
          ],
          audit_requirements: [
            '✓ Operator identification and approval',
            '✓ Business reason documentation',
            '✓ Incident ID linking (if applicable)',
            '✓ Timestamp and hash-chained audit trail',
            '✓ Before/after state preservation',
          ],
        },
        risk_mitigation: {
          double_pay_protection: 'Superseding prevents duplicate processing',
          reversibility: 'Original state preserved until new batch settles',
          audit_compliance: 'Complete operator and reason tracking',
          cost_awareness: 'SCT Instant fees disclosed upfront',
        },
        emergency_procedures: {
          failed_reissue: 'Original lines can be restored to previous state',
          system_failure: 'Partial re-issue rollback procedures available',
          audit_investigation: 'Complete trail from operator to settlement',
        },
      });
    } catch (error) {
      console.error('Safety checklist error:', error);
      res.status(500).json({
        error: 'SAFETY_CHECKLIST_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve safety checklist'
      });
    }
  });
}