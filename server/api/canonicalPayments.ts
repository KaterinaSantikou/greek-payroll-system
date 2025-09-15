/**
 * Canonical Payments API - Using the canonical data model
 */

import type { Express } from 'express';
import { CanonicalPaymentsService } from '../services/canonicalPaymentsService';

export function canonicalPaymentsRoutes(app: Express) {
  // =============================================================================
  // BANK PROFILES MANAGEMENT
  // =============================================================================

  /**
   * Initialize Bank Profiles
   * POST /v1/canonical-payments/initialize-bank-profiles
   */
  app.post(
    '/v1/canonical-payments/initialize-bank-profiles',
    async (req, res) => {
      try {
        await CanonicalPaymentsService.initializeBankProfiles();

        res.json({
          message: 'Bank profiles initialized successfully',
          profiles: [
            {
              id: 'alpha',
              painVersion: 'pain.001.001.03',
              supportsInstant: true,
              cutoff: '16:00',
            },
            {
              id: 'piraeus',
              painVersion: 'pain.001.001.03',
              supportsInstant: true,
              cutoff: '15:30',
            },
            {
              id: 'eurobank',
              painVersion: 'pain.001.001.03',
              supportsInstant: true,
              cutoff: '17:00',
            },
            {
              id: 'nbg',
              painVersion: 'pain.001.001.09',
              supportsInstant: true,
              cutoff: '16:15',
            },
          ],
          canonical_model: 'LOADED',
        });
      } catch (error) {
        console.error('Bank profiles initialization error:', error);
        res.status(500).json({
          error: 'INITIALIZATION_FAILED',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to initialize bank profiles',
        });
      }
    }
  );

  // =============================================================================
  // PAYMENT BATCH CREATION
  // =============================================================================

  /**
   * Build Canonical Payment Batch
   * POST /v1/canonical-payments/build-batch
   */
  app.post('/v1/canonical-payments/build-batch', async (req, res) => {
    try {
      const {
        tenant_id,
        entity_id,
        run_id,
        bank_profile_id = 'alpha',
        method = 'AUTO',
      } = req.body;

      if (!tenant_id || !entity_id || !run_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'tenant_id, entity_id, and run_id are required',
          hint: 'Provide payroll run details for canonical batch creation',
        });
      }

      if (!['alpha', 'piraeus', 'eurobank', 'nbg'].includes(bank_profile_id)) {
        return res.status(400).json({
          error: 'INVALID_BANK_PROFILE',
          detail: `Bank profile ${bank_profile_id} not supported`,
          hint: 'Supported profiles: alpha, piraeus, eurobank, nbg',
        });
      }

      const request = {
        tenantId: tenant_id,
        entityId: entity_id,
        runId: run_id,
        bankProfileId: bank_profile_id as
          | 'alpha'
          | 'piraeus'
          | 'eurobank'
          | 'nbg',
        method: method as 'SCT' | 'SCT_INST' | 'AUTO',
      };

      const result =
        await CanonicalPaymentsService.buildCanonicalPaymentBatch(request);

      res.json({
        canonical_batch: {
          batch_id: result.batchId,
          method: result.method,
          totals: result.totals,
          instructions_count: result.instructions.length,
          bank_profile_id,
        },
        data_model: 'CANONICAL',
        status: 'prepared',
        next_steps: [
          '1. Review batch details',
          '2. Submit to bank',
          '3. Monitor reconciliation',
        ],
        pain001_generated: true,
        instructions_summary: {
          total_amount: `€${result.totals.amount.toFixed(2)}`,
          payment_method: result.method,
          instruction_count: result.instructions.length,
        },
      });
    } catch (error) {
      console.error('Canonical batch creation error:', error);
      res.status(500).json({
        error: 'CANONICAL_BATCH_CREATION_FAILED',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to create canonical payment batch',
      });
    }
  });

  // =============================================================================
  // BATCH DETAILS & STATUS
  // =============================================================================

  /**
   * Get Canonical Batch Details
   * GET /v1/canonical-payments/batches/:batch_id
   */
  app.get('/v1/canonical-payments/batches/:batch_id', async (req, res) => {
    try {
      const { batch_id } = req.params;
      const { include_instructions = 'false' } = req.query;

      const batchDetails =
        await CanonicalPaymentsService.getBatchWithInstructions(batch_id);

      if (!batchDetails) {
        return res.status(404).json({
          error: 'BATCH_NOT_FOUND',
          detail: `Canonical batch ${batch_id} not found`,
        });
      }

      const response: any = {
        canonical_batch: {
          batch_id: batchDetails.batch.batchId,
          tenant_id: batchDetails.batch.tenantId,
          entity_id: batchDetails.batch.entityId,
          bank_profile_id: batchDetails.batch.bankProfileId,
          run_id: batchDetails.batch.runId,
          method: batchDetails.batch.method,
          status: batchDetails.batch.status,
          totals: batchDetails.totals,
          submitted_at: batchDetails.batch.submittedAt,
          file_refs: batchDetails.fileRefs,
          supersedes: batchDetails.batch.supersedes,
          metadata: batchDetails.metadata,
        },
        data_model: 'CANONICAL',
        instructions_count: batchDetails.instructions.length,
      };

      if (include_instructions === 'true') {
        response.instructions = batchDetails.instructions.map(inst => ({
          line_id: inst.lineId,
          employee_id: inst.employeeId,
          end_to_end_id: inst.endToEndId,
          amount: parseFloat(inst.amount),
          creditor_name: inst.creditorName,
          creditor_iban: inst.creditorIban,
          method: inst.method,
          status: inst.status,
          reason_code: inst.reasonCode,
          original_line_id: inst.originalLineId,
          reconciliation: inst.reconciliation,
        }));
      }

      res.json(response);
    } catch (error) {
      console.error('Canonical batch details error:', error);
      res.status(500).json({
        error: 'CANONICAL_BATCH_DETAILS_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve canonical batch details',
      });
    }
  });

  // =============================================================================
  // RE-ISSUE FUNCTIONALITY
  // =============================================================================

  /**
   * Re-issue Failed Instructions as SCT Instant
   * POST /v1/canonical-payments/reissue-instant
   */
  app.post('/v1/canonical-payments/reissue-instant', async (req, res) => {
    try {
      const {
        original_batch_id,
        failed_line_ids,
        reason = 'Failed instruction re-issue as SCT Instant',
      } = req.body;

      if (
        !original_batch_id ||
        !failed_line_ids ||
        !Array.isArray(failed_line_ids)
      ) {
        return res.status(400).json({
          error: 'INVALID_REQUEST',
          detail: 'original_batch_id and failed_line_ids array are required',
          hint: 'Provide original batch ID and array of failed line IDs for re-issue',
        });
      }

      const request = {
        originalBatchId: original_batch_id,
        failedLineIds: failed_line_ids,
        targetMethod: 'SCT_INST' as const,
        reason,
      };

      const result = await CanonicalPaymentsService.reissueAsInstant(request);

      res.json({
        reissue_result: {
          new_batch_id: result.newBatchId,
          original_batch_superseded: result.originalBatchSuperseded,
          reissued_instructions: result.reissuedInstructions,
          superseded_line_ids: result.supersededLineIds,
        },
        canonical_model: 'SUPERSEDED_TRANSACTIONS_MARKED',
        data_flow_step: 'MINI_BATCH_CREATED',
        next_steps: [
          '1. Review new SCT Instant batch',
          '2. Submit mini-batch to bank',
          '3. Monitor instant settlement',
        ],
        double_pay_protection: {
          enabled: true,
          original_lines_status: 'SUPERSEDED',
          new_batch_method: 'SCT_INST',
        },
      });
    } catch (error) {
      console.error('Canonical reissue error:', error);
      res.status(500).json({
        error: 'CANONICAL_REISSUE_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to reissue instructions as SCT Instant',
      });
    }
  });

  // =============================================================================
  // RECONCILIATION PROCESSING
  // =============================================================================

  /**
   * Process pain.002 Status Report (Canonical)
   * POST /v1/canonical-payments/reconciliation/pain002
   */
  app.post(
    '/v1/canonical-payments/reconciliation/pain002',
    async (req, res) => {
      try {
        const { batch_id, file_id, batch_status, transactions } = req.body;

        if (!batch_id || !file_id || !batch_status || !transactions) {
          return res.status(400).json({
            error: 'MISSING_PARAMETERS',
            detail:
              'batch_id, file_id, batch_status, and transactions are required',
            hint: 'Provide complete pain.002 reconciliation data',
          });
        }

        const pain002Data = {
          fileId: file_id,
          status: batch_status as 'ACCP' | 'RJCT',
          transactions: transactions.map((txn: any) => ({
            endToEndId: txn.end_to_end_id,
            status: txn.status,
            reasonCode: txn.reason_code,
          })),
        };

        const result =
          await CanonicalPaymentsService.processPain002Reconciliation(
            batch_id,
            pain002Data
          );

        res.json({
          reconciliation_type: 'pain.002',
          batch_id,
          processing_result: result,
          canonical_model: 'PAIN002_PROCESSED',
          business_impact: {
            instructions_updated: result.updated,
            accepted_instructions: result.accepted,
            rejected_instructions: result.rejected,
            batch_status: batch_status,
          },
          next_step: 'Monitor for camt.054 settlement notifications',
        });
      } catch (error) {
        console.error('Canonical pain.002 processing error:', error);
        res.status(500).json({
          error: 'CANONICAL_PAIN002_ERROR',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to process canonical pain.002 reconciliation',
        });
      }
    }
  );

  /**
   * Process camt.054 Bank Notification (Canonical)
   * POST /v1/canonical-payments/reconciliation/camt054
   */
  app.post(
    '/v1/canonical-payments/reconciliation/camt054',
    async (req, res) => {
      try {
        const { batch_id, file_id, settlements } = req.body;

        if (!batch_id || !file_id || !settlements) {
          return res.status(400).json({
            error: 'MISSING_PARAMETERS',
            detail: 'batch_id, file_id, and settlements are required',
            hint: 'Provide complete camt.054 settlement data',
          });
        }

        const camt054Data = {
          fileId: file_id,
          settlements: settlements.map((settlement: any) => ({
            endToEndId: settlement.end_to_end_id,
            amount: settlement.amount,
            bookingDate: settlement.booking_date,
            bankTxId: settlement.bank_tx_id,
            uetr: settlement.uetr,
          })),
        };

        const result =
          await CanonicalPaymentsService.processCamt054Reconciliation(
            batch_id,
            camt054Data
          );

        res.json({
          reconciliation_type: 'camt.054',
          batch_id,
          settlement_result: result,
          canonical_model: 'CAMT054_PROCESSED',
          business_impact: {
            settled_instructions: result.settled,
            total_settled_amount: `€${result.totalSettledAmount.toFixed(2)}`,
            reconciliation_complete: true,
          },
          next_step: 'Batch settlement processing complete',
        });
      } catch (error) {
        console.error('Canonical camt.054 processing error:', error);
        res.status(500).json({
          error: 'CANONICAL_CAMT054_ERROR',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to process canonical camt.054 reconciliation',
        });
      }
    }
  );

  // =============================================================================
  // CANONICAL DATA MODEL VALIDATION
  // =============================================================================

  /**
   * Validate Canonical Data Model
   * POST /v1/canonical-payments/validate-model
   */
  app.post('/v1/canonical-payments/validate-model', async (req, res) => {
    try {
      const { model_type, data } = req.body;

      if (!model_type || !data) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'model_type and data are required',
        });
      }

      let validationResult;
      let isValid = true;
      let errors: string[] = [];

      switch (model_type) {
        case 'bank_profile':
          try {
            // Validate against canonical BankProfile type
            const requiredFields = [
              'id',
              'painVersion',
              'supportsInstant',
              'cutoffs',
            ];
            for (const field of requiredFields) {
              if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
                isValid = false;
              }
            }

            if (
              data.id &&
              !['alpha', 'piraeus', 'eurobank', 'nbg'].includes(data.id)
            ) {
              errors.push('Invalid bank profile id');
              isValid = false;
            }
          } catch (error) {
            isValid = false;
            errors.push(
              error instanceof Error ? error.message : 'Validation error'
            );
          }
          break;

        case 'payment_batch':
          try {
            const requiredFields = [
              'batchId',
              'tenantId',
              'entityId',
              'bankProfileId',
              'runId',
              'method',
              'status',
              'totals',
            ];
            for (const field of requiredFields) {
              if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
                isValid = false;
              }
            }
          } catch (error) {
            isValid = false;
            errors.push(
              error instanceof Error ? error.message : 'Validation error'
            );
          }
          break;

        case 'payment_instruction':
          try {
            const requiredFields = [
              'lineId',
              'batchId',
              'employeeId',
              'endToEndId',
              'amount',
              'currency',
              'creditorName',
              'creditorIban',
              'method',
              'status',
              'reconciliation',
            ];
            for (const field of requiredFields) {
              if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
                isValid = false;
              }
            }

            if (data.currency && data.currency !== 'EUR') {
              errors.push('Currency must be EUR');
              isValid = false;
            }
          } catch (error) {
            isValid = false;
            errors.push(
              error instanceof Error ? error.message : 'Validation error'
            );
          }
          break;

        default:
          return res.status(400).json({
            error: 'INVALID_MODEL_TYPE',
            detail: `Model type ${model_type} not supported`,
            hint: 'Supported types: bank_profile, payment_batch, payment_instruction',
          });
      }

      res.json({
        model_type,
        validation_result: {
          is_valid: isValid,
          errors,
          fields_validated: Object.keys(data).length,
        },
        canonical_compliance: isValid ? 'COMPLIANT' : 'NON_COMPLIANT',
        data_model: 'CANONICAL',
      });
    } catch (error) {
      console.error('Canonical validation error:', error);
      res.status(500).json({
        error: 'CANONICAL_VALIDATION_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to validate canonical data model',
      });
    }
  });
}
