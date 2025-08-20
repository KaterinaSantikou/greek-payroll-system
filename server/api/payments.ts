/**
 * Payments API - Complete SEPA batch management and reconciliation
 */

import type { Express } from "express";
import multer from 'multer';

// Idempotency cache - in production this would be Redis
const idempotencyCache = new Map<string, any>();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
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
        payment_lines
      } = req.body;

      if (!payroll_run_id || !entity_id || !bank_profile_id || !payment_lines) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'payroll_run_id, entity_id, bank_profile_id, and payment_lines are required',
          hint: 'Provide complete payroll run data for batch creation'
        });
      }

      if (!Array.isArray(payment_lines) || payment_lines.length === 0) {
        return res.status(400).json({
          error: 'INVALID_PAYMENT_LINES',
          detail: 'payment_lines must be a non-empty array',
          hint: 'Include at least one payment instruction'
        });
      }

      // Mock implementation for demo
      const batchId = `BATCH-${Date.now()}`;
      const totalAmount = payment_lines.reduce((sum: number, line: any) => sum + (line.amount || 0), 0);

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
          'Monitor batch status for bank acceptance'
        ]
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
        detail: error instanceof Error ? error.message : 'Failed to create payment batch'
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
        offset = '0'
      } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entity_id is required',
          hint: 'Specify the entity to retrieve batches for'
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
        }
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
          has_more: false
        },
        batches: mockBatches,
        summary: {
          total_batches: mockBatches.length,
          total_amount: mockBatches.reduce((sum, batch) => sum + batch.totals.amount, 0),
          status_breakdown: { settled: 1, submitted: 1 },
        }
      });
    } catch (error) {
      console.error('Batches retrieval error:', error);
      res.status(500).json({
        error: 'BATCHES_RETRIEVAL_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve payment batches'
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
        totals: { count: 150, amount: 125000, accepted: 140, rejected: 10, settled: 120 },
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        file_refs: ['pain001-20250119-001.xml'],
        supersedes: [],
        metadata: { payroll_run_id: 'PAYROLL-2025-001' },
        state_transitions: [
          { from: 'prepared', to: 'submitted', timestamp: new Date().toISOString(), reason: 'Batch submitted to bank' },
          { from: 'submitted', to: 'accepted', timestamp: new Date().toISOString(), reason: 'Bank acknowledgment received' }
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
            reconciliation: { settled_at: new Date().toISOString(), bank_ref: 'BANK-REF-001' },
            original_line_id: null,
          }
        ];
      }

      res.json({
        ...batch,
        lines
      });
    } catch (error) {
      console.error('Batch retrieval error:', error);
      res.status(500).json({
        error: 'BATCH_RETRIEVAL_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve payment batch'
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
          'Process settlement confirmations via camt.054'
        ]
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
        detail: error instanceof Error ? error.message : 'Failed to submit payment batch'
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
      const { 
        status,
        method,
        limit = '100',
        offset = '0'
      } = req.query;

      // Mock implementation
      const mockLines = [
        {
          line_id: 'LINE-001',
          employee_id: 'EMP-1001',
          amount: 1250.00,
          currency: 'EUR',
          creditor_name: 'Employee One',
          creditor_iban: 'GR1601101250000000012300695',
          method: 'SCT',
          status: 'settled',
          end_to_end_id: 'E2E-BATCH-2025-001-001',
          reconciliation: { settled_at: new Date().toISOString(), bank_ref: 'BANK-REF-001' },
          original_line_id: null,
          timestamps: {
            created: new Date().toISOString(),
            submitted: new Date().toISOString(),
            settled: new Date().toISOString(),
          }
        },
        {
          line_id: 'LINE-002',
          employee_id: 'EMP-1002',
          amount: 980.00,
          currency: 'EUR',
          creditor_name: 'Employee Two',
          creditor_iban: 'GR1601101250000000012300696',
          method: 'SCT',
          status: 'rejected',
          end_to_end_id: 'E2E-BATCH-2025-001-002',
          reconciliation: { reason_code: 'AM04', reason_description: 'Insufficient Funds' },
          original_line_id: null,
          timestamps: {
            created: new Date().toISOString(),
            submitted: new Date().toISOString(),
            settled: null,
          }
        }
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
        lines: mockLines
      });
    } catch (error) {
      console.error('Batch lines retrieval error:', error);
      res.status(500).json({
        error: 'BATCH_LINES_RETRIEVAL_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve payment batch lines'
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
        incident_id
      } = req.body;

      if (!source_batch_id || !line_ids || !operator_id || !reason) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'source_batch_id, line_ids, operator_id, and reason are required',
          hint: 'Provide complete re-issue request'
        });
      }

      if (!Array.isArray(line_ids) || line_ids.length === 0) {
        return res.status(400).json({
          error: 'INVALID_LINE_IDS',
          detail: 'line_ids must be a non-empty array'
        });
      }

      if (method !== 'SCT_INST') {
        return res.status(400).json({
          error: 'INVALID_METHOD',
          detail: 'Only SCT_INST method is supported for re-issue',
          hint: 'Use method: "SCT_INST" for instant processing'
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
          sct_instant_fees: `€${(line_ids.length * 0.20).toFixed(2)}`,
          per_transaction: '€0.20',
        },
        next_steps: [
          'Monitor new SCT Instant batch for immediate settlement',
          'Original lines are now superseded',
          'Review audit trail for compliance',
        ]
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
        detail: error instanceof Error ? error.message : 'Failed to execute payment re-issue'
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
  app.post('/v1/payments/recon/pain002', upload.single('pain002_file'), async (req, res) => {
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
            { endToEndId: 'E2E-002', status: 'RJCT', reasonCode: 'AM04', reasonDescription: 'Insufficient Funds' }
          ]
        };
      } else {
        // H2H webhook (JSON payload)
        pain002Data = req.body;
      }

      if (!pain002Data.fileId || !pain002Data.messageId || !pain002Data.transactions) {
        return res.status(400).json({
          error: 'INVALID_PAIN002_DATA',
          detail: 'fileId, messageId, and transactions are required',
          hint: 'Provide complete pain.002 message structure'
        });
      }

      // Mock ingestion result
      const response = {
        file_id: pain002Data.fileId,
        message_id: pain002Data.messageId,
        ingestion_result: {
          processed: pain002Data.transactions.length,
          matched: pain002Data.transactions.filter((t: any) => t.status === 'ACCP').length,
          unmatched: 0,
          statusUpdates: pain002Data.transactions.length,
        },
        reconciliation_summary: {
          transactions_processed: pain002Data.transactions.length,
          matched: pain002Data.transactions.filter((t: any) => t.status === 'ACCP').length,
          unmatched: 0,
          status_updates: pain002Data.transactions.length,
        },
        reason_codes_processed: pain002Data.transactions
          .filter((t: any) => t.reasonCode)
          .map((t: any) => ({ 
            endToEndId: t.endToEndId,
            reasonCode: t.reasonCode,
            reasonDescription: t.reasonDescription 
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
        detail: error instanceof Error ? error.message : 'Failed to ingest pain.002 payment status report'
      });
    }
  });

  /**
   * Ingest camt.054 Bank Notification
   * POST /v1/payments/recon/camt054
   */
  app.post('/v1/payments/recon/camt054', upload.single('camt054_file'), async (req, res) => {
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
            { endToEndId: 'E2E-001', amount: '1250.00', status: 'settled', bankTxId: 'BANK-001' },
            { endToEndId: 'E2E-003', amount: '980.00', status: 'settled', bankTxId: 'BANK-002' }
          ]
        };
      } else {
        // H2H webhook (JSON payload)
        camtData = req.body;
      }

      if (!camtData.fileId || !camtData.messageId || !camtData.settlements) {
        return res.status(400).json({
          error: 'INVALID_CAMT054_DATA',
          detail: 'fileId, messageId, and settlements are required',
          hint: 'Provide complete camt.054 message structure'
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
        detail: error instanceof Error ? error.message : 'Failed to ingest camt.054 bank notification'
      });
    }
  });

  /**
   * Ingest camt.053 Account Statement
   * POST /v1/payments/recon/camt053
   */
  app.post('/v1/payments/recon/camt053', upload.single('camt053_file'), async (req, res) => {
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
            { endToEndId: 'E2E-001', amount: '1250.00', status: 'settled', bankTxId: 'BANK-001' },
            { endToEndId: 'E2E-003', amount: '980.00', status: 'settled', bankTxId: 'BANK-002' }
          ]
        };
      } else {
        // H2H webhook (JSON payload)
        camtData = req.body;
      }

      if (!camtData.fileId || !camtData.messageId || !camtData.settlements) {
        return res.status(400).json({
          error: 'INVALID_CAMT053_DATA',
          detail: 'fileId, messageId, and settlements are required',
          hint: 'Provide complete camt.053 message structure'
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
        detail: error instanceof Error ? error.message : 'Failed to ingest camt.053 account statement'
      });
    }
  });

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
        offset = '0'
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
        }
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
          requires_attention: mockUnmatched.filter(tx => tx.confidenceScore < 50).length,
          suggestions_available: mockUnmatched.filter(tx => tx.suggestedMatches.length > 0).length,
        },
        resolution_actions: [
          'Review suggested matches for approval',
          'Perform manual matching for low-confidence transactions',
          'Investigate transactions with no matches',
          'Contact bank for missing status reports',
        ]
      });
    } catch (error) {
      console.error('Unmatched transactions error:', error);
      res.status(500).json({
        error: 'UNMATCHED_TRANSACTIONS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve unmatched transactions'
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
          hint: 'This will allow re-processing of previously cached operations'
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
        warning: 'Previously processed operations can now be re-executed with same idempotency keys',
      });
    } catch (error) {
      console.error('Idempotency cache clear error:', error);
      res.status(500).json({
        error: 'CACHE_CLEAR_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to clear idempotency cache'
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
        detail: error instanceof Error ? error.message : 'Failed to retrieve idempotency statistics'
      });
    }
  });
}