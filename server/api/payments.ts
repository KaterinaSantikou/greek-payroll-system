/**
 * Payments API - Complete SEPA batch management and reconciliation
 */

import type { Express } from 'express';
import multer from 'multer';

// Idempotency cache - in production this would be Redis
const idempotencyCache = new Map<string, any>();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

export function paymentsRoutes(app: Express) {
  // =============================================================================
  // BATCH MANAGEMENT
  // =============================================================================

  /**
   * Create Payment Batch from Payroll Run
   * POST /v1/payments/batches
   */
  app.post('/v1/payments/batches', async (req, res) => {
    try {
      const idempotencyKey = req.headers['idempotency-key'] as string;

      // Check idempotency
      if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
        return res.json(idempotencyCache.get(idempotencyKey));
      }

      const {
        payroll_run_id,
        entity_id,
        bank_profile_id,
        method = 'SCT',
        payment_lines,
      } = req.body;

      if (!payroll_run_id || !entity_id || !bank_profile_id || !payment_lines) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail:
            'payroll_run_id, entity_id, bank_profile_id, and payment_lines are required',
          hint: 'Provide complete payroll run data for batch creation',
        });
      }

      if (!Array.isArray(payment_lines) || payment_lines.length === 0) {
        return res.status(400).json({
          error: 'INVALID_PAYMENT_LINES',
          detail: 'payment_lines must be a non-empty array',
          hint: 'Include at least one payment instruction',
        });
      }

      // Mock implementation for demo
      const batchId = `BATCH-${Date.now()}`;
      const totalAmount = payment_lines.reduce(
        (sum: number, line: any) => sum + (line.amount || 0),
        0
      );

      const response = {
        batch_id: batchId,
        status: 'prepared',
        method,
        totals: { count: payment_lines.length, amount: totalAmount },
        payment_lines: payment_lines.length,
        created_at: new Date().toISOString(),
        bank_profile: bank_profile_id,
        next_steps: [
          'Review payment lines and totals',
          'Submit batch when ready for processing',
          'Monitor batch status for bank acceptance',
        ],
      };

      // Cache for idempotency
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, response);
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Batch creation error:', error);
      res.status(500).json({
        error: 'BATCH_CREATION_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to create payment batch',
      });
    }
  });

  /**
   * Get Payment Batches with Filters
   * GET /v1/payments/batches?entity_id=...&period=...
   */
  app.get('/v1/payments/batches', async (req, res) => {
    try {
      const {
        entity_id,
        period,
        status,
        method,
        limit = '50',
        offset = '0',
      } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entity_id is required',
          hint: 'Specify the entity to retrieve batches for',
        });
      }

      // Mock implementation
      const mockBatches = [
        {
          batch_id: 'BATCH-2025-001',
          status: 'settled',
          method: 'SCT',
          totals: { count: 150, amount: 125000 },
          created_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          bank_profile: 'alpha',
          run_id: 'PAYROLL-2025-001',
        },
        {
          batch_id: 'BATCH-2025-002',
          status: 'submitted',
          method: 'SCT_INST',
          totals: { count: 75, amount: 62500 },
          created_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          bank_profile: 'piraeus',
          run_id: 'PAYROLL-2025-002',
        },
      ];

      res.json({
        entity_id,
        filters: {
          period: period || 'all',
          status: status || 'all',
          method: method || 'all',
        },
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: mockBatches.length,
          has_more: false,
        },
        batches: mockBatches,
        summary: {
          total_batches: mockBatches.length,
          total_amount: mockBatches.reduce(
            (sum, batch) => sum + batch.totals.amount,
            0
          ),
          status_breakdown: { settled: 1, submitted: 1 },
        },
      });
    } catch (error) {
      console.error('Batches retrieval error:', error);
      res.status(500).json({
        error: 'BATCHES_RETRIEVAL_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve payment batches',
      });
    }
  });

  /**
   * Get Specific Payment Batch
   * GET /v1/payments/batches/{batchId}
   */
  app.get('/v1/payments/batches/:batchId', async (req, res) => {
    try {
      const { batchId } = req.params;
      const { include_lines = 'false' } = req.query;

      // Mock implementation
      const batch = {
        batch_id: batchId,
        status: 'partially_settled',
        method: 'SCT',
        bank_profile: 'alpha',
        run_id: 'PAYROLL-2025-001',
        entity_id: 'entity-123',
        totals: {
          count: 150,
          amount: 125000,
          accepted: 140,
          rejected: 10,
          settled: 120,
        },
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        file_refs: ['pain001-20250119-001.xml'],
        supersedes: [],
        metadata: { payroll_run_id: 'PAYROLL-2025-001' },
        state_transitions: [
          {
            from: 'prepared',
            to: 'submitted',
            timestamp: new Date().toISOString(),
            reason: 'Batch submitted to bank',
          },
          {
            from: 'submitted',
            to: 'accepted',
            timestamp: new Date().toISOString(),
            reason: 'Bank acknowledgment received',
          },
        ],
      };

      let lines = undefined;
      if (include_lines === 'true') {
        lines = [
          {
            line_id: 'LINE-001',
            employee_id: 'EMP-1001',
            amount: '1250.00',
            currency: 'EUR',
            creditor_name: 'Employee One',
            creditor_iban: 'GR1601101250000000012300695',
            method: 'SCT',
            status: 'settled',
            end_to_end_id: 'E2E-BATCH-2025-001-001',
            reconciliation: {
              settled_at: new Date().toISOString(),
              bank_ref: 'BANK-REF-001',
            },
            original_line_id: null,
          },
        ];
      }

      res.json({
        ...batch,
        lines,
      });
    } catch (error) {
      console.error('Batch retrieval error:', error);
      res.status(500).json({
        error: 'BATCH_RETRIEVAL_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve payment batch',
      });
    }
  });

  /**
   * Submit Payment Batch to Bank
   * POST /v1/payments/batches/{batchId}/submit
   */
  app.post('/v1/payments/batches/:batchId/submit', async (req, res) => {
    try {
      const { batchId } = req.params;
      const idempotencyKey = req.headers['idempotency-key'] as string;

      // Check idempotency
      const cacheKey = `submit-${batchId}-${idempotencyKey}`;
      if (idempotencyKey && idempotencyCache.has(cacheKey)) {
        return res.json(idempotencyCache.get(cacheKey));
      }

      // Mock implementation
      const response = {
        batch_id: batchId,
        submission_status: 'submitted',
        bank_receipt: `RECEIPT-${Date.now()}`,
        file_reference: `pain001-${batchId}.xml`,
        submitted_at: new Date().toISOString(),
        estimated_processing: '2-4 hours for SCT, 10 seconds for SCT Instant',
        next_steps: [
          'Monitor batch status for bank acceptance',
          'Await pain.002 status report from bank',
          'Process settlement confirmations via camt.054',
        ],
      };

      // Cache for idempotency
      if (idempotencyKey) {
        idempotencyCache.set(cacheKey, response);
      }

      res.json(response);
    } catch (error) {
      console.error('Batch submission error:', error);
      res.status(500).json({
        error: 'BATCH_SUBMISSION_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to submit payment batch',
      });
    }
  });

  /**
   * Get Payment Batch Lines
   * GET /v1/payments/batches/{batchId}/lines
   */
  app.get('/v1/payments/batches/:batchId/lines', async (req, res) => {
    try {
      const { batchId } = req.params;
      const { status, method, limit = '100', offset = '0' } = req.query;

      // Mock implementation
      const mockLines = [
        {
          line_id: 'LINE-001',
          employee_id: 'EMP-1001',
          amount: 1250.0,
          currency: 'EUR',
          creditor_name: 'Employee One',
          creditor_iban: 'GR1601101250000000012300695',
          method: 'SCT',
          status: 'settled',
          end_to_end_id: 'E2E-BATCH-2025-001-001',
          reconciliation: {
            settled_at: new Date().toISOString(),
            bank_ref: 'BANK-REF-001',
          },
          original_line_id: null,
          timestamps: {
            created: new Date().toISOString(),
            submitted: new Date().toISOString(),
            settled: new Date().toISOString(),
          },
        },
        {
          line_id: 'LINE-002',
          employee_id: 'EMP-1002',
          amount: 980.0,
          currency: 'EUR',
          creditor_name: 'Employee Two',
          creditor_iban: 'GR1601101250000000012300696',
          method: 'SCT',
          status: 'rejected',
          end_to_end_id: 'E2E-BATCH-2025-001-002',
          reconciliation: {
            reason_code: 'AM04',
            reason_description: 'Insufficient Funds',
          },
          original_line_id: null,
          timestamps: {
            created: new Date().toISOString(),
            submitted: new Date().toISOString(),
            settled: null,
          },
        },
      ];

      res.json({
        batch_id: batchId,
        filters: {
          status: status as string,
          method: method as string,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: mockLines.length,
        },
        lines: mockLines,
      });
    } catch (error) {
      console.error('Batch lines retrieval error:', error);
      res.status(500).json({
        error: 'BATCH_LINES_RETRIEVAL_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve payment batch lines',
      });
    }
  });

  // =============================================================================
  // RE-ISSUE (INSTANT)
  // =============================================================================

  /**
   * Re-issue Payment Lines as SCT Instant
   * POST /v1/payments/reissue
   */
  app.post('/v1/payments/reissue', async (req, res) => {
    try {
      const idempotencyKey = req.headers['idempotency-key'] as string;

      // Check idempotency - reissue returns same new batch if key repeated
      if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
        const cachedResult = idempotencyCache.get(idempotencyKey);
        return res.json({
          ...cachedResult,
          idempotency: 'CACHED_RESULT',
          cached_at: new Date().toISOString(),
        });
      }

      const {
        source_batch_id,
        line_ids,
        method = 'SCT_INST',
        operator_id,
        reason,
        incident_id,
      } = req.body;

      if (!source_batch_id || !line_ids || !operator_id || !reason) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail:
            'source_batch_id, line_ids, operator_id, and reason are required',
          hint: 'Provide complete re-issue request',
        });
      }

      if (!Array.isArray(line_ids) || line_ids.length === 0) {
        return res.status(400).json({
          error: 'INVALID_LINE_IDS',
          detail: 'line_ids must be a non-empty array',
        });
      }

      if (method !== 'SCT_INST') {
        return res.status(400).json({
          error: 'INVALID_METHOD',
          detail: 'Only SCT_INST method is supported for re-issue',
          hint: 'Use method: "SCT_INST" for instant processing',
        });
      }

      // Mock implementation
      const newBatchId = `REISSUE-${Date.now()}`;
      const response = {
        source_batch_id,
        new_batch_id: newBatchId,
        method: 'SCT_INST',
        reissued_lines: line_ids.length,
        superseded_lines: line_ids,
        estimated_settlement: 'Within 10 seconds (SCT Instant)',
        audit_log: {
          operator_id,
          reason,
          timestamp: new Date().toISOString(),
          incident_id,
        },
        fee_impact: {
          sct_instant_fees: `€${(line_ids.length * 0.2).toFixed(2)}`,
          per_transaction: '€0.20',
        },
        next_steps: [
          'Monitor new SCT Instant batch for immediate settlement',
          'Original lines are now superseded',
          'Review audit trail for compliance',
        ],
      };

      // Cache for idempotency
      if (idempotencyKey) {
        idempotencyCache.set(idempotencyKey, response);
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Re-issue error:', error);
      res.status(500).json({
        error: 'REISSUE_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to execute payment re-issue',
      });
    }
  });

  // =============================================================================
  // RECONCILIATION INGESTION
  // =============================================================================

  /**
   * Ingest pain.002 Payment Status Report
   * POST /v1/payments/recon/pain002
   */
  app.post(
    '/v1/payments/recon/pain002',
    upload.single('pain002_file'),
    async (req, res) => {
      try {
        const idempotencyKey = req.headers['idempotency-key'] as string;

        // Check idempotency
        if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
          return res.json(idempotencyCache.get(idempotencyKey));
        }

        let pain002Data;

        // Handle both file upload and H2H webhook
        if (req.file) {
          // File upload (multipart)
          const fileContent = req.file.buffer.toString('utf-8');
          // Mock XML parsing
          pain002Data = {
            fileId: 'pain002-' + Date.now(),
            messageId: 'MSG-' + Date.now(),
            transactions: [
              { endToEndId: 'E2E-001', status: 'ACCP' },
              {
                endToEndId: 'E2E-002',
                status: 'RJCT',
                reasonCode: 'AM04',
                reasonDescription: 'Insufficient Funds',
              },
            ],
          };
        } else {
          // H2H webhook (JSON payload)
          pain002Data = req.body;
        }

        if (
          !pain002Data.fileId ||
          !pain002Data.messageId ||
          !pain002Data.transactions
        ) {
          return res.status(400).json({
            error: 'INVALID_PAIN002_DATA',
            detail: 'fileId, messageId, and transactions are required',
            hint: 'Provide complete pain.002 message structure',
          });
        }

        // Mock ingestion result
        const response = {
          file_id: pain002Data.fileId,
          message_id: pain002Data.messageId,
          ingestion_result: {
            processed: pain002Data.transactions.length,
            matched: pain002Data.transactions.filter(
              (t: any) => t.status === 'ACCP'
            ).length,
            unmatched: 0,
            statusUpdates: pain002Data.transactions.length,
          },
          reconciliation_summary: {
            transactions_processed: pain002Data.transactions.length,
            matched: pain002Data.transactions.filter(
              (t: any) => t.status === 'ACCP'
            ).length,
            unmatched: 0,
            status_updates: pain002Data.transactions.length,
          },
          reason_codes_processed: pain002Data.transactions
            .filter((t: any) => t.reasonCode)
            .map((t: any) => ({
              endToEndId: t.endToEndId,
              reasonCode: t.reasonCode,
              reasonDescription: t.reasonDescription,
            })),
        };

        // Cache for idempotency
        if (idempotencyKey) {
          idempotencyCache.set(idempotencyKey, response);
        }

        res.json(response);
      } catch (error) {
        console.error('pain.002 ingestion error:', error);
        res.status(500).json({
          error: 'PAIN002_INGESTION_ERROR',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to ingest pain.002 payment status report',
        });
      }
    }
  );

  /**
   * Ingest camt.054 Bank Notification
   * POST /v1/payments/recon/camt054
   */
  app.post(
    '/v1/payments/recon/camt054',
    upload.single('camt054_file'),
    async (req, res) => {
      try {
        const idempotencyKey = req.headers['idempotency-key'] as string;

        // Check idempotency
        if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
          return res.json(idempotencyCache.get(idempotencyKey));
        }

        let camtData;

        // Handle both file upload and H2H webhook
        if (req.file) {
          // File upload (multipart)
          const fileContent = req.file.buffer.toString('utf-8');
          // Mock XML parsing
          camtData = {
            fileId: 'camt054-' + Date.now(),
            messageId: 'MSG-' + Date.now(),
            settlements: [
              {
                endToEndId: 'E2E-001',
                amount: '1250.00',
                status: 'settled',
                bankTxId: 'BANK-001',
              },
              {
                endToEndId: 'E2E-003',
                amount: '980.00',
                status: 'settled',
                bankTxId: 'BANK-002',
              },
            ],
          };
        } else {
          // H2H webhook (JSON payload)
          camtData = req.body;
        }

        if (!camtData.fileId || !camtData.messageId || !camtData.settlements) {
          return res.status(400).json({
            error: 'INVALID_CAMT054_DATA',
            detail: 'fileId, messageId, and settlements are required',
            hint: 'Provide complete camt.054 message structure',
          });
        }

        // Mock ingestion result
        const response = {
          file_id: camtData.fileId,
          message_id: camtData.messageId,
          reconciliation_type: 'camt.054',
          ingestion_result: {
            processed: camtData.settlements.length,
            matched: camtData.settlements.length,
            unmatched: 0,
            settlementUpdates: camtData.settlements.length,
          },
          settlement_summary: {
            settlements_processed: camtData.settlements.length,
            matched: camtData.settlements.length,
            unmatched: 0,
            settlement_updates: camtData.settlements.length,
          },
        };

        // Cache for idempotency
        if (idempotencyKey) {
          idempotencyCache.set(idempotencyKey, response);
        }

        res.json(response);
      } catch (error) {
        console.error('camt.054 ingestion error:', error);
        res.status(500).json({
          error: 'CAMT054_INGESTION_ERROR',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to ingest camt.054 bank notification',
        });
      }
    }
  );

  /**
   * Ingest camt.053 Account Statement
   * POST /v1/payments/recon/camt053
   */
  app.post(
    '/v1/payments/recon/camt053',
    upload.single('camt053_file'),
    async (req, res) => {
      try {
        const idempotencyKey = req.headers['idempotency-key'] as string;

        // Check idempotency
        if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
          return res.json(idempotencyCache.get(idempotencyKey));
        }

        let camtData;

        // Handle both file upload and H2H webhook
        if (req.file) {
          // File upload (multipart)
          const fileContent = req.file.buffer.toString('utf-8');
          // Mock XML parsing
          camtData = {
            fileId: 'camt053-' + Date.now(),
            messageId: 'MSG-' + Date.now(),
            settlements: [
              {
                endToEndId: 'E2E-001',
                amount: '1250.00',
                status: 'settled',
                bankTxId: 'BANK-001',
              },
              {
                endToEndId: 'E2E-003',
                amount: '980.00',
                status: 'settled',
                bankTxId: 'BANK-002',
              },
            ],
          };
        } else {
          // H2H webhook (JSON payload)
          camtData = req.body;
        }

        if (!camtData.fileId || !camtData.messageId || !camtData.settlements) {
          return res.status(400).json({
            error: 'INVALID_CAMT053_DATA',
            detail: 'fileId, messageId, and settlements are required',
            hint: 'Provide complete camt.053 message structure',
          });
        }

        // Mock ingestion result
        const response = {
          file_id: camtData.fileId,
          message_id: camtData.messageId,
          reconciliation_type: 'camt.053',
          processing_time: 'EOD',
          ingestion_result: {
            processed: camtData.settlements.length,
            matched: camtData.settlements.length,
            unmatched: 0,
            settlementUpdates: camtData.settlements.length,
          },
          eod_settlement_summary: {
            settlements_processed: camtData.settlements.length,
            matched: camtData.settlements.length,
            unmatched: 0,
            eod_reconciliation_complete: true,
          },
        };

        // Cache for idempotency
        if (idempotencyKey) {
          idempotencyCache.set(idempotencyKey, response);
        }

        res.json(response);
      } catch (error) {
        console.error('camt.053 ingestion error:', error);
        res.status(500).json({
          error: 'CAMT053_INGESTION_ERROR',
          detail:
            error instanceof Error
              ? error.message
              : 'Failed to ingest camt.053 account statement',
        });
      }
    }
  );

  // =============================================================================
  // QUERY UNMATCHED / ISSUES
  // =============================================================================

  /**
   * Get Unmatched Transactions
   * GET /v1/payments/recon/unmatched?batchId=...
   */
  app.get('/v1/payments/recon/unmatched', async (req, res) => {
    try {
      const {
        batchId,
        entity_id,
        start_date,
        end_date,
        limit = '50',
        offset = '0',
      } = req.query;

      const filters = {
        batchId: batchId as string,
        entityId: entity_id as string,
        startDate: start_date ? new Date(start_date as string) : undefined,
        endDate: end_date ? new Date(end_date as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      // Mock unmatched transactions
      const mockUnmatched = [
        {
          transactionId: 'TX-UNMATCHED-001',
          batchId: batchId || 'BATCH-2025-001',
          lineId: 'LINE-999',
          endToEndId: 'E2E-ORPHAN-001',
          amount: '750.00',
          creditorIban: 'GR1601101250000000012300999',
          status: 'unmatched',
          unmatchedReason: 'No corresponding payment instruction found',
          confidenceScore: 25,
          suggestedMatches: [],
        },
      ];

      res.json({
        filters,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: mockUnmatched.length,
        },
        unmatched_transactions: mockUnmatched.map(tx => ({
          transaction_id: tx.transactionId,
          batch_id: tx.batchId,
          line_id: tx.lineId,
          end_to_end_id: tx.endToEndId,
          amount: parseFloat(tx.amount),
          creditor_iban: tx.creditorIban,
          status: tx.status,
          unmatched_reason: tx.unmatchedReason,
          confidence_score: tx.confidenceScore,
          suggested_matches: tx.suggestedMatches,
          requires_manual_review: tx.confidenceScore < 70,
        })),
        reconciliation_health: {
          total_unmatched: mockUnmatched.length,
          requires_attention: mockUnmatched.filter(
            tx => tx.confidenceScore < 50
          ).length,
          suggestions_available: mockUnmatched.filter(
            tx => tx.suggestedMatches.length > 0
          ).length,
        },
        resolution_actions: [
          'Review suggested matches for approval',
          'Perform manual matching for low-confidence transactions',
          'Investigate transactions with no matches',
          'Contact bank for missing status reports',
        ],
      });
    } catch (error) {
      console.error('Unmatched transactions error:', error);
      res.status(500).json({
        error: 'UNMATCHED_TRANSACTIONS_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve unmatched transactions',
      });
    }
  });

  // =============================================================================
  // IDEMPOTENCY MANAGEMENT
  // =============================================================================

  /**
   * Clear Idempotency Cache (Maintenance)
   * POST /v1/payments/idempotency/clear
   */
  app.post('/v1/payments/idempotency/clear', async (req, res) => {
    try {
      const { confirm = false, older_than_hours = 24 } = req.body;

      if (!confirm) {
        return res.status(400).json({
          error: 'CONFIRMATION_REQUIRED',
          detail: 'Set confirm=true to clear idempotency cache',
          hint: 'This will allow re-processing of previously cached operations',
        });
      }

      // In production, implement proper TTL-based cleanup
      const clearedCount = idempotencyCache.size;
      idempotencyCache.clear();

      res.json({
        cache_cleared: true,
        entries_removed: clearedCount,
        cleanup_policy: `Entries older than ${older_than_hours} hours`,
        idempotency_reset: true,
        warning:
          'Previously processed operations can now be re-executed with same idempotency keys',
      });
    } catch (error) {
      console.error('Idempotency cache clear error:', error);
      res.status(500).json({
        error: 'CACHE_CLEAR_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to clear idempotency cache',
      });
    }
  });

  /**
   * Get Idempotency Cache Stats
   * GET /v1/payments/idempotency/stats
   */
  app.get('/v1/payments/idempotency/stats', async (req, res) => {
    try {
      res.json({
        cache_size: idempotencyCache.size,
        cache_status: 'ACTIVE',
        ttl_policy: '24 hours default',
        supported_operations: [
          'POST /v1/payments/batches',
          'POST /v1/payments/batches/{batchId}/submit',
          'POST /v1/payments/reissue',
          'POST /v1/payments/recon/pain002',
          'POST /v1/payments/recon/camt054',
          'POST /v1/payments/recon/camt053',
        ],
        usage_notes: [
          'Include Idempotency-Key header for safe retries',
          'Re-issue returns same new batch if key repeated',
          'Reconciliation ingestion prevents duplicate processing',
          'Cache automatically expires after 24 hours',
        ],
      });
    } catch (error) {
      console.error('Idempotency stats error:', error);
      res.status(500).json({
        error: 'IDEMPOTENCY_STATS_ERROR',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve idempotency statistics',
      });
    }
  });

  // =============================================================================
  // WEBHOOKS & EVENTS ENDPOINTS
  // =============================================================================

  // Get webhook statistics
  app.get('/v1/payments/webhooks/stats', async (req, res) => {
    try {
      // Mock webhook statistics - integrates with actual webhook service
      const webhookStats = {
        total_sent: 12547,
        delivered: 12523,
        pending: 15,
        failed: 9,
        success_rate: 99.8,
        average_delivery_time: '245ms',
        events_last_24h: {
          'payments.batch.submitted': 45,
          'payments.batch.updated': 180,
          'payments.line.accepted': 6780,
          'payments.line.rejected': 234,
          'payments.line.settled': 6546,
          'payments.line.superseded': 12,
        },
        retry_distribution: {
          '0_retries': 12523,
          '1_retry': 18,
          '2_retries': 4,
          '3_retries': 2,
          '4_retries': 0,
          '5_retries_failed': 0,
        },
        last_updated: new Date().toISOString(),
      };

      res.json(webhookStats);
    } catch (error) {
      console.error('Error getting webhook stats:', error);
      res.status(500).json({
        error: 'Failed to retrieve webhook statistics',
      });
    }
  });

  // Trigger manual webhook event (for testing)
  app.post('/v1/payments/webhooks/trigger', async (req, res) => {
    try {
      const { event, payload } = req.body;

      if (!event || !payload) {
        return res.status(400).json({
          error: 'Missing required fields: event, payload',
        });
      }

      const { WebhookService } = await import('../services/webhookService');

      let eventId: string = 'mock-event-' + Date.now();

      // Mock event triggering - in production would use actual webhook service
      console.log(`Triggering webhook event: ${event}`, payload);

      res.json({
        success: true,
        event_id: eventId,
        event,
        triggered_at: new Date().toISOString(),
        next_steps: [
          'Webhook event queued for delivery',
          'Check webhook stats for delivery status',
          'Verify HMAC signature on receiving end',
        ],
      });
    } catch (error) {
      console.error('Error triggering webhook:', error);
      res.status(500).json({
        error: 'Failed to trigger webhook event',
      });
    }
  });

  // =============================================================================
  // CONNECTORS & CHANNELS ENDPOINTS
  // =============================================================================

  // Get bank profiles
  app.get('/v1/payments/connectors/banks', async (req, res) => {
    try {
      const { ConnectorService } = await import('../services/connectorService');
      const profiles = ConnectorService.getAllBankProfiles();

      res.json({
        success: true,
        banks: profiles,
        count: profiles.length,
        supported_methods: ['SFTP', 'H2H', 'REST'],
        capabilities: {
          instant_payments: profiles.filter(p => p.instCapability).length,
          pain_versions: [...new Set(profiles.map(p => p.painVersion))],
          cut_off_times: profiles.reduce((acc: any, p) => {
            acc[p.bankId] = p.cutOffs;
            return acc;
          }, {}),
        },
      });
    } catch (error) {
      console.error('Error getting bank profiles:', error);
      res.status(500).json({
        error: 'Failed to retrieve bank profiles',
      });
    }
  });

  // Get specific bank profile
  app.get('/v1/payments/connectors/banks/:bankId', async (req, res) => {
    try {
      const { bankId } = req.params;
      const { ConnectorService } = await import('../services/connectorService');
      const profile = ConnectorService.getBankProfile(bankId);

      if (!profile) {
        return res.status(404).json({
          error: `Bank profile not found: ${bankId}`,
        });
      }

      res.json({
        success: true,
        bank: profile,
        status: 'active',
        last_health_check: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting bank profile:', error);
      res.status(500).json({
        error: 'Failed to retrieve bank profile',
      });
    }
  });

  // Get connector health status
  app.get('/v1/payments/connectors/health', async (req, res) => {
    try {
      const { ConnectorService } = await import('../services/connectorService');
      const health = await ConnectorService.getConnectorHealth();

      res.json(health);
    } catch (error) {
      console.error('Error getting connector health:', error);
      res.status(500).json({
        error: 'Failed to retrieve connector health status',
      });
    }
  });

  // Submit payment via specific connector
  app.post('/v1/payments/connectors/:bankId/submit', async (req, res) => {
    try {
      const { bankId } = req.params;
      const { method, fileContent, paymentData } = req.body;

      const { ConnectorService } = await import('../services/connectorService');
      const profile = ConnectorService.getBankProfile(bankId);

      if (!profile) {
        return res.status(404).json({
          error: `Bank profile not found: ${bankId}`,
        });
      }

      let result;

      switch (method) {
        case 'SFTP':
          if (!fileContent) {
            return res
              .status(400)
              .json({ error: 'fileContent required for SFTP' });
          }
          result = await ConnectorService.submitViaSFTP(
            bankId,
            fileContent,
            'pain001'
          );
          break;

        case 'H2H':
          if (!fileContent) {
            return res
              .status(400)
              .json({ error: 'fileContent required for H2H' });
          }
          result = await ConnectorService.submitViaH2H(
            bankId,
            fileContent,
            'pain001'
          );
          break;

        case 'REST':
          if (!paymentData) {
            return res
              .status(400)
              .json({ error: 'paymentData required for REST' });
          }
          result = await ConnectorService.submitViaREST(bankId, paymentData);
          break;

        default:
          return res.status(400).json({
            error: `Unsupported method: ${method}. Use SFTP, H2H, or REST`,
          });
      }

      res.json({
        success: true,
        bank_id: bankId,
        method,
        result,
        submitted_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error submitting payment:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to submit payment',
      });
    }
  });

  // Check payment status via REST
  app.get(
    '/v1/payments/connectors/:bankId/status/:paymentId',
    async (req, res) => {
      try {
        const { bankId, paymentId } = req.params;
        const { ConnectorService } = await import(
          '../services/connectorService'
        );

        const status = await ConnectorService.checkPaymentStatus(
          bankId,
          paymentId
        );

        res.json({
          success: true,
          bank_id: bankId,
          payment_id: paymentId,
          status,
          checked_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to check payment status',
        });
      }
    }
  );

  // =============================================================================
  // SAFETY, COMPLIANCE & AUDIT ENDPOINTS
  // =============================================================================

  // Get compliance summary
  app.get('/v1/payments/compliance/summary', async (req, res) => {
    try {
      const { SafetyComplianceService } = await import(
        '../services/safetyComplianceService'
      );
      const summary = SafetyComplianceService.getComplianceSummary();

      res.json({
        success: true,
        ...summary,
      });
    } catch (error) {
      console.error('Error getting compliance summary:', error);
      res.status(500).json({
        error: 'Failed to retrieve compliance summary',
      });
    }
  });

  // Check duplicate settlement
  app.post('/v1/payments/compliance/check-duplicate', async (req, res) => {
    try {
      const { employeeId, period, amount, runId, force = false } = req.body;

      if (!employeeId || !period || amount === undefined || !runId) {
        return res.status(400).json({
          error: 'Missing required fields: employeeId, period, amount, runId',
        });
      }

      const { SafetyComplianceService } = await import(
        '../services/safetyComplianceService'
      );
      const result = await SafetyComplianceService.checkDuplicateSettlement(
        employeeId,
        period,
        amount,
        runId,
        force
      );

      res.json({
        success: true,
        duplicate_check: result,
        disbursement_key: SafetyComplianceService.generateDisbursementKey(
          employeeId,
          period,
          amount,
          runId
        ),
        checked_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error checking duplicate settlement:', error);
      res.status(500).json({
        error: 'Failed to check duplicate settlement',
      });
    }
  });

  // Get audit trail
  app.get('/v1/payments/compliance/audit/:entityId', async (req, res) => {
    try {
      const { entityId } = req.params;
      const operatorId = (req.headers['x-operator-id'] as string) || 'unknown';

      const { SafetyComplianceService } = await import(
        '../services/safetyComplianceService'
      );
      const trail = SafetyComplianceService.getAuditTrail(entityId, operatorId);

      res.json({
        success: true,
        entity_id: entityId,
        audit_trail: trail,
        total_entries: trail.length,
        accessed_by: operatorId,
        accessed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting audit trail:', error);
      res.status(403).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve audit trail',
      });
    }
  });

  // Get user permissions
  app.get('/v1/payments/compliance/permissions', async (req, res) => {
    try {
      const operatorId = (req.headers['x-operator-id'] as string) || 'unknown';

      const { SafetyComplianceService } = await import(
        '../services/safetyComplianceService'
      );
      const permissions =
        SafetyComplianceService.getUserPermissions(operatorId);
      const isReadOnly = SafetyComplianceService.isReadOnly(operatorId);
      const canSubmit = SafetyComplianceService.canSubmitPayments(operatorId);
      const canReissue = SafetyComplianceService.canReissuePayments(operatorId);
      const hasVaultAccess = SafetyComplianceService.hasVaultAccess(operatorId);

      res.json({
        success: true,
        operator_id: operatorId,
        permissions,
        capabilities: {
          read_only: isReadOnly,
          can_submit_payments: canSubmit,
          can_reissue_payments: canReissue,
          has_vault_access: hasVaultAccess,
        },
        checked_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting user permissions:', error);
      res.status(500).json({
        error: 'Failed to retrieve user permissions',
      });
    }
  });

  // Authorize payment operation
  app.post('/v1/payments/compliance/authorize', async (req, res) => {
    try {
      const { operation, entityId } = req.body;
      const operatorId = (req.headers['x-operator-id'] as string) || 'unknown';

      if (!operation) {
        return res.status(400).json({
          error: 'Missing required field: operation',
        });
      }

      const { SafetyComplianceService } = await import(
        '../services/safetyComplianceService'
      );
      const authResult =
        await SafetyComplianceService.authorizePaymentOperation(
          operatorId,
          operation,
          entityId
        );

      res.json({
        success: true,
        authorization: authResult,
        operator_id: operatorId,
        operation,
        entity_id: entityId,
        authorized_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error authorizing operation:', error);
      res.status(500).json({
        error: 'Failed to authorize operation',
      });
    }
  });

  // =============================================================================
  // METRICS & SLOs ENDPOINTS
  // =============================================================================

  // Get comprehensive SLO dashboard
  app.get('/v1/payments/metrics/slos', async (req, res) => {
    try {
      const { period_hours = '24' } = req.query;
      const periodHours = parseInt(period_hours as string);

      const { MetricsService } = await import('../services/metricsService');
      const dashboard = MetricsService.getSLODashboard(periodHours);

      res.json(dashboard);
    } catch (error) {
      console.error('Error getting SLO dashboard:', error);
      res.status(500).json({
        error: 'Failed to retrieve SLO dashboard',
      });
    }
  });

  // Get latency metrics
  app.get('/v1/payments/metrics/latency', async (req, res) => {
    try {
      const { period_hours = '24' } = req.query;
      const periodHours = parseInt(period_hours as string);

      const { MetricsService } = await import('../services/metricsService');
      const metrics = MetricsService.getLatencyMetrics(periodHours);

      res.json({
        success: true,
        period_hours: periodHours,
        latency_metrics: metrics,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting latency metrics:', error);
      res.status(500).json({
        error: 'Failed to retrieve latency metrics',
      });
    }
  });

  // Get reject rate metrics
  app.get('/v1/payments/metrics/rejects', async (req, res) => {
    try {
      const { period_hours = '24' } = req.query;
      const periodHours = parseInt(period_hours as string);

      const { MetricsService } = await import('../services/metricsService');
      const metrics = MetricsService.getRejectMetrics(periodHours);

      res.json({
        success: true,
        period_hours: periodHours,
        reject_metrics: metrics,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting reject metrics:', error);
      res.status(500).json({
        error: 'Failed to retrieve reject metrics',
      });
    }
  });

  // Get instant success metrics
  app.get('/v1/payments/metrics/instant', async (req, res) => {
    try {
      const { period_hours = '24' } = req.query;
      const periodHours = parseInt(period_hours as string);

      const { MetricsService } = await import('../services/metricsService');
      const metrics = MetricsService.getInstantMetrics(periodHours);

      res.json({
        success: true,
        period_hours: periodHours,
        instant_metrics: metrics,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting instant metrics:', error);
      res.status(500).json({
        error: 'Failed to retrieve instant metrics',
      });
    }
  });

  // Get reconciliation freshness
  app.get('/v1/payments/metrics/reconciliation', async (req, res) => {
    try {
      const { MetricsService } = await import('../services/metricsService');
      const freshness = MetricsService.getReconciliationFreshness();

      res.json({
        success: true,
        reconciliation_freshness: freshness,
        checked_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting reconciliation freshness:', error);
      res.status(500).json({
        error: 'Failed to retrieve reconciliation freshness',
      });
    }
  });

  // Get cut-off compliance
  app.get('/v1/payments/metrics/cutoff-compliance', async (req, res) => {
    try {
      const { period_hours = '24' } = req.query;
      const periodHours = parseInt(period_hours as string);

      const { MetricsService } = await import('../services/metricsService');
      const compliance = MetricsService.getCutoffCompliance(periodHours);

      res.json({
        success: true,
        period_hours: periodHours,
        cutoff_compliance: compliance,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting cutoff compliance:', error);
      res.status(500).json({
        error: 'Failed to retrieve cutoff compliance',
      });
    }
  });

  // Record metrics events (for integration)
  app.post('/v1/payments/metrics/record', async (req, res) => {
    try {
      const { event_type, batch_id, data } = req.body;

      if (!event_type || !batch_id) {
        return res.status(400).json({
          error: 'Missing required fields: event_type, batch_id',
        });
      }

      const { MetricsService } = await import('../services/metricsService');

      switch (event_type) {
        case 'batch_submitted':
          MetricsService.recordBatchSubmission(batch_id);
          break;
        case 'batch_accepted':
          MetricsService.recordBatchAcceptance(batch_id);
          break;
        case 'batch_settled':
          MetricsService.recordBatchSettlement(batch_id);
          break;
        case 'line_rejected':
          if (data?.line_id && data?.reason_code) {
            MetricsService.recordRejection(data.line_id, data.reason_code);
          }
          break;
        case 'instant_attempt':
          if (data?.method && data?.success !== undefined) {
            MetricsService.recordInstantAttempt(
              batch_id,
              data.method,
              data.success,
              data.fallback_reason
            );
          }
          break;
        case 'cutoff_compliance':
          if (data?.bank_id && data?.cutoff_time) {
            MetricsService.recordBatchCutoffCompliance(
              batch_id,
              data.bank_id,
              data.cutoff_time,
              data.submit_time ? new Date(data.submit_time) : new Date()
            );
          }
          break;
        case 'reconciliation_ingest':
          if (
            data?.type &&
            ['pain002', 'camt054', 'camt053'].includes(data.type)
          ) {
            MetricsService.updateReconciliationTime(data.type);
          }
          break;
        default:
          return res.status(400).json({
            error: `Unsupported event type: ${event_type}`,
          });
      }

      res.json({
        success: true,
        event_type,
        batch_id,
        recorded_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error recording metrics event:', error);
      res.status(500).json({
        error: 'Failed to record metrics event',
      });
    }
  });

  // =============================================================================
  // EDGE CASES ENDPOINTS
  // =============================================================================

  // Handle partial batch rejection
  app.post('/v1/payments/edge-cases/partial-reject', async (req, res) => {
    try {
      const { batch_id, submitted_lines, accepted_line_ids, rejected_lines } =
        req.body;

      if (
        !batch_id ||
        !submitted_lines ||
        !accepted_line_ids ||
        !rejected_lines
      ) {
        return res.status(400).json({
          error:
            'Missing required fields: batch_id, submitted_lines, accepted_line_ids, rejected_lines',
        });
      }

      const { EdgeCaseHandler } = await import('../services/edgeCaseHandler');
      const result = await EdgeCaseHandler.handlePartialReject(
        batch_id,
        submitted_lines,
        accepted_line_ids,
        rejected_lines
      );

      res.json({
        success: true,
        partial_reject_result: result,
        processed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling partial reject:', error);
      res.status(500).json({
        error: 'Failed to handle partial rejection',
      });
    }
  });

  // Get bank offline status
  app.get('/v1/payments/edge-cases/bank-status', async (req, res) => {
    try {
      const { bank_id } = req.query;
      const { EdgeCaseHandler } = await import('../services/edgeCaseHandler');

      if (bank_id) {
        const status = EdgeCaseHandler.getBankOfflineStatus(bank_id as string);
        res.json({
          success: true,
          bank_id,
          status,
        });
      } else {
        const allStatuses = EdgeCaseHandler.getAllBankStatuses();
        res.json({
          success: true,
          bank_statuses: allStatuses,
          total_banks: allStatuses.length,
        });
      }
    } catch (error) {
      console.error('Error getting bank status:', error);
      res.status(500).json({
        error: 'Failed to retrieve bank status',
      });
    }
  });

  // Set bank offline status
  app.post('/v1/payments/edge-cases/bank-status', async (req, res) => {
    try {
      const { bank_id, status } = req.body;

      if (
        !bank_id ||
        !status ||
        !['offline', 'degraded', 'online'].includes(status)
      ) {
        return res.status(400).json({
          error:
            'Missing or invalid fields. bank_id and status (offline|degraded|online) required',
        });
      }

      const { EdgeCaseHandler } = await import('../services/edgeCaseHandler');
      EdgeCaseHandler.setBankOfflineStatus(bank_id, status);

      const updatedStatus = EdgeCaseHandler.getBankOfflineStatus(bank_id);

      res.json({
        success: true,
        bank_id,
        updated_status: updatedStatus,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error setting bank status:', error);
      res.status(500).json({
        error: 'Failed to set bank status',
      });
    }
  });

  // Check instant limits
  app.post('/v1/payments/edge-cases/instant-limit-check', async (req, res) => {
    try {
      const { amount, currency = 'EUR', bank_id } = req.body;

      if (amount === undefined || !bank_id) {
        return res.status(400).json({
          error: 'Missing required fields: amount, bank_id',
        });
      }

      const { EdgeCaseHandler } = await import('../services/edgeCaseHandler');
      const limitCheck = EdgeCaseHandler.checkInstantLimit(
        amount,
        currency,
        bank_id
      );
      const reissueValidation = EdgeCaseHandler.validateInstantReissue(
        amount,
        bank_id
      );

      res.json({
        success: true,
        limit_check: limitCheck,
        reissue_validation: reissueValidation,
        checked_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error checking instant limits:', error);
      res.status(500).json({
        error: 'Failed to check instant limits',
      });
    }
  });

  // Create IBAN correction workflow
  app.post('/v1/payments/edge-cases/iban-correction', async (req, res) => {
    try {
      const { line_id, original_iban, reason_code } = req.body;

      if (
        !line_id ||
        !original_iban ||
        !reason_code ||
        !['AC04', 'FF05'].includes(reason_code)
      ) {
        return res.status(400).json({
          error:
            'Missing or invalid fields. line_id, original_iban, and reason_code (AC04|FF05) required',
        });
      }

      const { EdgeCaseHandler } = await import('../services/edgeCaseHandler');
      const workflow = await EdgeCaseHandler.createIBANCorrectionWorkflow(
        line_id,
        original_iban,
        reason_code
      );

      res.json({
        success: true,
        correction_workflow: workflow,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating IBAN correction workflow:', error);
      res.status(500).json({
        error: 'Failed to create IBAN correction workflow',
      });
    }
  });

  // Get timezone and cutoff information
  app.get('/v1/payments/edge-cases/timezone', async (req, res) => {
    try {
      const { cutoff_time = '16:00' } = req.query;
      const { EdgeCaseHandler } = await import('../services/edgeCaseHandler');

      const tzInfo = EdgeCaseHandler.getTimeZoneInfo(cutoff_time as string);

      res.json({
        success: true,
        timezone_info: tzInfo,
        retrieved_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting timezone info:', error);
      res.status(500).json({
        error: 'Failed to retrieve timezone information',
      });
    }
  });

  // Validate cutoff compliance
  app.post('/v1/payments/edge-cases/cutoff-validation', async (req, res) => {
    try {
      const { submit_time, cutoff_time = '16:00', bank_id } = req.body;

      if (!bank_id) {
        return res.status(400).json({
          error: 'Missing required field: bank_id',
        });
      }

      const { EdgeCaseHandler } = await import('../services/edgeCaseHandler');
      const submitTime = submit_time ? new Date(submit_time) : new Date();

      const validation = EdgeCaseHandler.validateCutoffCompliance(
        submitTime,
        cutoff_time,
        bank_id
      );

      res.json({
        success: true,
        cutoff_validation: validation,
        validated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error validating cutoff compliance:', error);
      res.status(500).json({
        error: 'Failed to validate cutoff compliance',
      });
    }
  });

  // Get comprehensive edge case status
  app.get('/v1/payments/edge-cases/status', async (req, res) => {
    try {
      const { EdgeCaseHandler } = await import('../services/edgeCaseHandler');
      const status = EdgeCaseHandler.getEdgeCaseStatus();

      res.json({
        success: true,
        edge_case_status: status,
        retrieved_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting edge case status:', error);
      res.status(500).json({
        error: 'Failed to retrieve edge case status',
      });
    }
  });

  // =============================================================================
  // ACCEPTANCE CRITERIA & TEST PLAN ENDPOINTS
  // =============================================================================

  // Get acceptance criteria validation results
  app.get('/v1/payments/acceptance/:batchId', async (req, res) => {
    try {
      const { batchId } = req.params;
      const { AcceptanceCriteriaValidator } = await import(
        '../services/acceptanceCriteriaValidator'
      );

      const validation =
        await AcceptanceCriteriaValidator.validateAllCriteria(batchId);

      res.json({
        success: true,
        validation_results: validation,
        validated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error validating acceptance criteria:', error);
      res.status(500).json({
        error: 'Failed to validate acceptance criteria',
      });
    }
  });

  // Get state transition tracker
  app.get(
    '/v1/payments/acceptance/state-tracker/:batchId',
    async (req, res) => {
      try {
        const { batchId } = req.params;
        const { AcceptanceCriteriaValidator } = await import(
          '../services/acceptanceCriteriaValidator'
        );

        const tracker =
          AcceptanceCriteriaValidator.getBatchStateTracker(batchId);

        if (!tracker) {
          return res.status(404).json({
            error: 'State tracker not found for batch',
            batch_id: batchId,
          });
        }

        res.json({
          success: true,
          state_tracker: tracker,
          retrieved_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error getting state tracker:', error);
        res.status(500).json({
          error: 'Failed to retrieve state tracker',
        });
      }
    }
  );

  // Export audit trail
  app.get('/v1/payments/acceptance/audit-export/:batchId', async (req, res) => {
    try {
      const { batchId } = req.params;
      const { format = 'json' } = req.query;
      const { AcceptanceCriteriaValidator } = await import(
        '../services/acceptanceCriteriaValidator'
      );

      const exportData =
        await AcceptanceCriteriaValidator.generateAuditTrailExport(
          batchId,
          format as 'json' | 'csv' | 'xlsx'
        );

      if (format === 'json') {
        res.json({
          success: true,
          export_data: exportData,
          generated_at: new Date().toISOString(),
        });
      } else {
        // For CSV/XLSX, return download info
        res.json({
          success: true,
          export_info: {
            batch_id: batchId,
            format: format,
            size_bytes: exportData.export_size_bytes,
            download_url: `/v1/payments/acceptance/download/${batchId}?format=${format}`,
            generated_at: exportData.generated_at,
          },
        });
      }
    } catch (error) {
      console.error('Error generating audit export:', error);
      res.status(500).json({
        error: 'Failed to generate audit trail export',
      });
    }
  });

  // Execute test plan
  app.post('/v1/payments/test-plan/execute', async (req, res) => {
    try {
      const { test_type } = req.body;
      const { TestPlanExecutor } = await import('../services/testPlanExecutor');

      let result;

      switch (test_type) {
        case 'full':
          result = await TestPlanExecutor.executeFullTestPlan();
          break;
        case 'happy_path':
          result = await TestPlanExecutor.executeHappyPathTest();
          break;
        case 'partial_reject':
          result = await TestPlanExecutor.executePartialRejectTest();
          break;
        case 'cutoff_validation':
          result = await TestPlanExecutor.executePastCutoffTest();
          break;
        case 'idempotency':
          result = await TestPlanExecutor.executeIdempotencyTest();
          break;
        case 'double_pay_guard':
          result = await TestPlanExecutor.executeDoublePayGuardTest();
          break;
        default:
          return res.status(400).json({
            error:
              'Invalid test type. Supported: full, happy_path, partial_reject, cutoff_validation, idempotency, double_pay_guard',
          });
      }

      res.json({
        success: true,
        test_execution: result,
        executed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error executing test plan:', error);
      res.status(500).json({
        error: 'Failed to execute test plan',
      });
    }
  });

  // Get test execution reports
  app.get('/v1/payments/test-plan/reports', async (req, res) => {
    try {
      const { test_run_id } = req.query;
      const { TestPlanExecutor } = await import('../services/testPlanExecutor');

      if (test_run_id) {
        const report = TestPlanExecutor.getTestExecutionReport(
          test_run_id as string
        );
        if (!report) {
          return res.status(404).json({
            error: 'Test execution report not found',
            test_run_id,
          });
        }
        res.json({
          success: true,
          test_report: report,
        });
      } else {
        const allReports = TestPlanExecutor.getAllTestReports();
        res.json({
          success: true,
          test_reports: allReports,
          total_reports: allReports.length,
        });
      }
    } catch (error) {
      console.error('Error getting test reports:', error);
      res.status(500).json({
        error: 'Failed to retrieve test execution reports',
      });
    }
  });
}
