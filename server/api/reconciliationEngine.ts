/**
 * Reconciliation API - pain.002 and camt.054/053 ingestion
 */

import type { Express } from "express";
import { ReconciliationEngine } from "../services/reconciliationEngine";

export function reconciliationEngineRoutes(app: Express) {

  // =============================================================================
  // PAIN.002 INGESTION
  // =============================================================================

  /**
   * Ingest pain.002 Status Report
   * POST /v1/reconciliation/ingest/pain002
   */
  app.post('/v1/reconciliation/ingest/pain002', async (req, res) => {
    try {
      const pain002Data = req.body;

      if (!pain002Data.fileId || !pain002Data.messageId || !pain002Data.transactions) {
        return res.status(400).json({
          error: 'INVALID_PAIN002_DATA',
          detail: 'fileId, messageId, and transactions are required',
          hint: 'Provide complete pain.002 message structure'
        });
      }

      const result = await ReconciliationEngine.ingestPain002(pain002Data);

      res.json({
        reconciliation_type: 'pain.002',
        file_id: pain002Data.fileId,
        ingestion_result: result,
        business_impact: {
          transactions_processed: result.processed,
          successful_matches: result.matched,
          unmatched_transactions: result.unmatched,
          duplicate_prevention: result.duplicates,
          reconciliation_success: result.success,
        },
        reason_codes_processed: pain002Data.transactions
          .filter((t: any) => t.reasonCode)
          .map((t: any) => t.reasonCode),
        next_step: result.unmatched > 0 
          ? 'Review unmatched transactions for manual reconciliation'
          : 'pain.002 reconciliation complete',
      });
    } catch (error) {
      console.error('pain.002 ingestion error:', error);
      res.status(500).json({
        error: 'PAIN002_INGESTION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to ingest pain.002 message'
      });
    }
  });

  // =============================================================================
  // CAMT.054/053 INGESTION  
  // =============================================================================

  /**
   * Ingest camt.054 Bank Notification (Preferred)
   * POST /v1/reconciliation/ingest/camt054
   */
  app.post('/v1/reconciliation/ingest/camt054', async (req, res) => {
    try {
      const camtData = req.body;

      if (!camtData.fileId || !camtData.messageId || !camtData.settlements) {
        return res.status(400).json({
          error: 'INVALID_CAMT054_DATA',
          detail: 'fileId, messageId, and settlements are required',
          hint: 'Provide complete camt.054 message structure'
        });
      }

      const result = await ReconciliationEngine.ingestCamtSettlement(camtData);

      res.json({
        reconciliation_type: 'camt.054',
        file_id: camtData.fileId,
        ingestion_result: result,
        business_impact: {
          settlements_processed: result.processed,
          successful_matches: result.matched,
          unmatched_settlements: result.unmatched,
          duplicate_prevention: result.duplicates,
          settlement_success: result.success,
        },
        settlement_methods: camtData.settlements
          .map((s: any) => s.settlementMethod)
          .filter((m: any) => m),
        next_step: result.unmatched > 0 
          ? 'Review unmatched settlements for manual reconciliation'
          : 'camt.054 settlement reconciliation complete',
      });
    } catch (error) {
      console.error('camt.054 ingestion error:', error);
      res.status(500).json({
        error: 'CAMT054_INGESTION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to ingest camt.054 message'
      });
    }
  });

  /**
   * Ingest camt.053 Account Statement (EOD Alternative)
   * POST /v1/reconciliation/ingest/camt053
   */
  app.post('/v1/reconciliation/ingest/camt053', async (req, res) => {
    try {
      const camtData = req.body;

      if (!camtData.fileId || !camtData.messageId || !camtData.settlements) {
        return res.status(400).json({
          error: 'INVALID_CAMT053_DATA',
          detail: 'fileId, messageId, and settlements are required',
          hint: 'Provide complete camt.053 message structure'
        });
      }

      // Process camt.053 same as camt.054 but with EOD context
      const result = await ReconciliationEngine.ingestCamtSettlement(camtData);

      res.json({
        reconciliation_type: 'camt.053',
        file_id: camtData.fileId,
        processing_time: 'EOD',
        ingestion_result: result,
        business_impact: {
          eod_settlements_processed: result.processed,
          successful_matches: result.matched,
          unmatched_settlements: result.unmatched,
          duplicate_prevention: result.duplicates,
          eod_reconciliation_success: result.success,
        },
        next_step: 'End-of-day settlement reconciliation complete',
      });
    } catch (error) {
      console.error('camt.053 ingestion error:', error);
      res.status(500).json({
        error: 'CAMT053_INGESTION_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to ingest camt.053 message'
      });
    }
  });

  // =============================================================================
  // RECONCILIATION MONITORING
  // =============================================================================

  /**
   * Get Reconciliation Statistics
   * GET /v1/reconciliation/stats?entity_id=...&start_date=...&end_date=...
   */
  app.get('/v1/reconciliation/stats', async (req, res) => {
    try {
      const { entity_id, start_date, end_date } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entity_id is required'
        });
      }

      const dateRange = start_date && end_date ? {
        start: new Date(start_date as string),
        end: new Date(end_date as string),
      } : undefined;

      const stats = await ReconciliationEngine.getReconciliationStats(entity_id as string, dateRange);

      res.json({
        entity_id,
        date_range: dateRange,
        reconciliation_statistics: stats,
        reconciliation_health: {
          status: stats.reconciliationRate >= 95 ? 'HEALTHY' : 
                  stats.reconciliationRate >= 90 ? 'WARNING' : 'CRITICAL',
          rate: `${stats.reconciliationRate}%`,
          pending_manual_review: stats.manualReviewRequired,
        },
        matching_performance: {
          pain002_processing: `${((stats.pain002Processed / stats.totalInstructions) * 100).toFixed(1)}%`,
          camt_settlement: `${((stats.camtSettled / stats.totalInstructions) * 100).toFixed(1)}%`,
          unmatched_rate: `${((stats.unmatched / stats.totalInstructions) * 100).toFixed(1)}%`,
        },
      });
    } catch (error) {
      console.error('Reconciliation stats error:', error);
      res.status(500).json({
        error: 'RECONCILIATION_STATS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve reconciliation statistics'
      });
    }
  });

  /**
   * Get Unmatched Transactions for Manual Review
   * GET /v1/reconciliation/unmatched?entity_id=...&limit=...
   */
  app.get('/v1/reconciliation/unmatched', async (req, res) => {
    try {
      const { entity_id, limit = '50' } = req.query;

      if (!entity_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'entity_id is required'
        });
      }

      const unmatchedTransactions = await ReconciliationEngine.getUnmatchedTransactions(
        entity_id as string, 
        parseInt(limit as string)
      );

      res.json({
        entity_id,
        unmatched_transactions: unmatchedTransactions,
        manual_review_required: unmatchedTransactions.length,
        matching_priorities: {
          exact_e2e_match: 'Priority 1: EndToEndId exact match',
          amount_iban_match: 'Priority 2: Amount + IBAN match within batch',
          fuzzy_match: 'Priority 3: Fuzzy matching with manual review',
        },
        resolution_actions: [
          'Review suggested matches',
          'Perform manual matching',
          'Flag for investigation',
          'Mark as exception',
        ],
      });
    } catch (error) {
      console.error('Unmatched transactions error:', error);
      res.status(500).json({
        error: 'UNMATCHED_TRANSACTIONS_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to retrieve unmatched transactions'
      });
    }
  });

  /**
   * Clear Ingestion Cache (Maintenance)
   * POST /v1/reconciliation/clear-cache
   */
  app.post('/v1/reconciliation/clear-cache', async (req, res) => {
    try {
      const { confirm = false } = req.body;

      if (!confirm) {
        return res.status(400).json({
          error: 'CONFIRMATION_REQUIRED',
          detail: 'Set confirm=true to clear ingestion cache',
          hint: 'This will allow re-processing of previously ingested messages'
        });
      }

      ReconciliationEngine.clearIngestionCache();

      res.json({
        cache_cleared: true,
        idempotency_reset: true,
        warning: 'Previously processed messages can now be re-ingested',
        next_step: 'Monitor for duplicate processing if messages are replayed',
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      res.status(500).json({
        error: 'CACHE_CLEAR_ERROR',
        detail: error instanceof Error ? error.message : 'Failed to clear ingestion cache'
      });
    }
  });
}