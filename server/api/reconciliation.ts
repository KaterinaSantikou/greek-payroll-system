/**
 * Reconciliation API - Compare payroll vs journal totals
 */

import type { Express } from "express";
import { RoundingService } from '../services/roundingService';
import { GLExportCanonical } from '../services/glExportCanonical';

export function reconciliationRoutes(app: Express) {

  /**
   * Generate Reconciliation Report
   * POST /v1/reconciliation/generate
   */
  app.post('/v1/reconciliation/generate', async (req, res) => {
    try {
      const { payroll_summary, journal_id, currency = 'EUR', rounding_method = 'bankers' } = req.body;

      if (!payroll_summary || !journal_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'payroll_summary and journal_id are required',
          hint: 'Provide both payroll data and journal ID for reconciliation'
        });
      }

      // Fetch journal data
      const journal = await GLExportCanonical.getJournal(journal_id);
      if (!journal) {
        return res.status(404).json({
          error: 'JOURNAL_NOT_FOUND',
          detail: `Journal with ID ${journal_id} not found`,
          hint: 'Verify the journal ID is correct'
        });
      }

      // Generate reconciliation report
      const reconciliation = RoundingService.generateReconciliationReport(
        payroll_summary,
        journal.lines,
        { currency, rounding_method }
      );

      res.json({
        journal_id,
        reconciliation,
        summary: {
          total_entries: reconciliation.entries.length,
          reconciled_entries: reconciliation.entries.filter(e => e.isReconciled).length,
          total_variance: reconciliation.overallDelta.toFixed(2),
          is_fully_reconciled: reconciliation.isFullyReconciled,
          warnings_count: reconciliation.warnings.length,
        },
        generated_at: reconciliation.generatedAt,
      });
    } catch (error) {
      console.error('Reconciliation generation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to generate reconciliation report',
        hint: 'Contact system administrator if the problem persists'
      });
    }
  });

  /**
   * Get Rounding Configuration
   * GET /v1/reconciliation/rounding-config
   */
  app.get('/v1/reconciliation/rounding-config', async (req, res) => {
    try {
      const defaultConfig = RoundingService.getDefaultConfig();
      
      res.json({
        default_method: defaultConfig.method,
        precision: defaultConfig.precision,
        enforce_balance: defaultConfig.enforceBalance,
        available_methods: [
          {
            id: 'bankers',
            name: 'Banker\'s Rounding',
            description: 'Round half to even (recommended for financial calculations)',
          },
          {
            id: 'round_half_up',
            name: 'Round Half Up',
            description: 'Standard mathematical rounding',
          }
        ],
        examples: {
          bankers: [
            { input: 1.125, output: RoundingService.round(1.125, defaultConfig) },
            { input: 1.135, output: RoundingService.round(1.135, defaultConfig) },
            { input: 2.225, output: RoundingService.round(2.225, defaultConfig) },
          ],
          round_half_up: [
            { input: 1.125, output: RoundingService.round(1.125, { ...defaultConfig, method: 'round_half_up' }) },
            { input: 1.135, output: RoundingService.round(1.135, { ...defaultConfig, method: 'round_half_up' }) },
            { input: 2.225, output: RoundingService.round(2.225, { ...defaultConfig, method: 'round_half_up' }) },
          ],
        },
      });
    } catch (error) {
      console.error('Rounding config error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to get rounding configuration'
      });
    }
  });

  /**
   * Validate Currency Configuration
   * POST /v1/reconciliation/validate-currency
   */
  app.post('/v1/reconciliation/validate-currency', async (req, res) => {
    try {
      const { journal_currency, system_currency = 'EUR' } = req.body;

      if (!journal_currency) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'journal_currency is required',
          hint: 'Provide the currency code for validation'
        });
      }

      const validation = RoundingService.validateCurrency(journal_currency, system_currency);

      res.json({
        journal_currency,
        system_currency,
        is_valid: validation.isValid,
        warning: validation.warning,
        supported_currency: system_currency,
        requires_conversion: !validation.isValid,
      });
    } catch (error) {
      console.error('Currency validation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to validate currency'
      });
    }
  });

  /**
   * Apply Rounding to Lines
   * POST /v1/reconciliation/apply-rounding
   */
  app.post('/v1/reconciliation/apply-rounding', async (req, res) => {
    try {
      const { lines, rounding_method = 'bankers', precision = 2, enforce_balance = true } = req.body;

      if (!lines || !Array.isArray(lines)) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'lines array is required',
          hint: 'Provide an array of journal lines with debit/credit amounts'
        });
      }

      const config = { method: rounding_method, precision, enforceBalance: enforce_balance };
      const result = RoundingService.roundJournalLines(lines, config);

      res.json({
        original_lines: lines,
        rounded_lines: result.lines,
        totals: {
          debits: result.totalDebits,
          credits: result.totalCredits,
          is_balanced: result.isBalanced,
        },
        adjustments: {
          adjustment_made: result.adjustmentMade,
          rounding_method,
          precision,
        },
      });
    } catch (error) {
      console.error('Rounding application error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to apply rounding to lines'
      });
    }
  });

  /**
   * Collapse Zero Lines
   * POST /v1/reconciliation/collapse-zeros
   */
  app.post('/v1/reconciliation/collapse-zeros', async (req, res) => {
    try {
      const { lines } = req.body;

      if (!lines || !Array.isArray(lines)) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'lines array is required'
        });
      }

      const originalCount = lines.length;
      const collapsedLines = RoundingService.collapseZeroLines(lines);
      const removedCount = originalCount - collapsedLines.length;

      res.json({
        original_count: originalCount,
        collapsed_count: collapsedLines.lines.length,
        removed_count: removedCount,
        collapsed_lines: collapsedLines,
        optimization: removedCount > 0 ? `Removed ${removedCount} zero-value lines` : 'No zero lines found',
      });
    } catch (error) {
      console.error('Zero line collapse error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to collapse zero lines'
      });
    }
  });
}