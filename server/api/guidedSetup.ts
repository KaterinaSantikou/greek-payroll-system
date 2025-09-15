/**
 * Guided Setup API - Wizard flows for ERP connector configuration
 */

import type { Express } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { partners } from '@shared/schema';
import {
  GuidedSetupService,
  type ConnectorSetup,
  type ChartOfAccount,
} from '../services/guidedSetupService';

export function guidedSetupRoutes(app: Express) {
  // =============================================================================
  // SETUP WIZARD FLOW ENDPOINTS
  // =============================================================================

  /**
   * Initialize Guided Setup Wizard
   * POST /v1/setup/initialize
   */
  app.post('/v1/setup/initialize', async (req, res) => {
    try {
      const { partner_id, connector_type } = req.body;

      if (!partner_id || !connector_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and connector_type are required',
          hint: 'Provide both partner_id and connector_type (xero or quickbooks)',
        });
      }

      if (!['xero', 'quickbooks'].includes(connector_type)) {
        return res.status(400).json({
          error: 'INVALID_CONNECTOR',
          detail: 'connector_type must be xero or quickbooks',
          hint: 'Use xero or quickbooks as connector_type',
        });
      }

      // Verify partner exists
      const [partner] = await db
        .select()
        .from(partners)
        .where(eq(partners.id, partner_id))
        .limit(1);

      if (!partner) {
        return res.status(404).json({
          error: 'PARTNER_NOT_FOUND',
          detail: `Partner with ID ${partner_id} not found`,
          hint: 'Verify the partner_id is correct',
        });
      }

      const setup = GuidedSetupService.initializeSetup(
        partner_id,
        connector_type
      );

      res.status(201).json({
        setup_id: `${partner_id}-${connector_type}`,
        partner_id,
        connector_type,
        current_step: setup.currentStep,
        steps: setup.steps,
        config: setup.config,
        created_at: setup.createdAt,
      });
    } catch (error) {
      console.error('Setup initialization error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to initialize guided setup',
        hint: 'Contact system administrator if the problem persists',
      });
    }
  });

  /**
   * Get Setup Status
   * GET /v1/setup/status?partner_id=...&connector_type=...
   */
  app.get('/v1/setup/status', async (req, res) => {
    try {
      const { partner_id, connector_type } = req.query;

      if (!partner_id || !connector_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and connector_type are required',
        });
      }

      const setup = GuidedSetupService.getSetup(
        partner_id as string,
        connector_type as 'xero' | 'quickbooks'
      );

      if (!setup) {
        return res.status(404).json({
          error: 'SETUP_NOT_FOUND',
          detail: 'No setup found for this partner and connector',
          hint: 'Initialize setup first using POST /v1/setup/initialize',
        });
      }

      res.json({
        setup_id: `${partner_id}-${connector_type}`,
        partner_id: setup.partnerId,
        connector_type: setup.connectorType,
        current_step: setup.currentStep,
        steps: setup.steps,
        config: setup.config,
        mappings: setup.mappings,
        validation: setup.validation,
        progress_percentage: Math.round(
          (setup.steps.filter(s => s.status === 'completed').length /
            setup.steps.length) *
            100
        ),
        updated_at: setup.updatedAt,
      });
    } catch (error) {
      console.error('Setup status error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to get setup status',
      });
    }
  });

  // =============================================================================
  // STEP 1: CONNECTION (OAuth completed via connector API)
  // =============================================================================

  /**
   * Mark Connection Step Complete
   * POST /v1/setup/connect-complete
   */
  app.post('/v1/setup/connect-complete', async (req, res) => {
    try {
      const { partner_id, connector_type, tenant_id, company_id } = req.body;

      if (!partner_id || !connector_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and connector_type are required',
        });
      }

      const setup = GuidedSetupService.updateStep(
        partner_id,
        connector_type,
        'connect',
        'completed',
        { tenant_id, company_id }
      );

      res.json({
        message: 'Connection step completed',
        current_step: setup.currentStep,
        next_step_url: `/v1/setup/organizations?partner_id=${partner_id}&connector_type=${connector_type}`,
      });
    } catch (error) {
      console.error('Connect complete error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to mark connection complete',
      });
    }
  });

  // =============================================================================
  // STEP 2: ORGANIZATION SELECTION
  // =============================================================================

  /**
   * Get Organizations/Companies
   * GET /v1/setup/organizations?partner_id=...&connector_type=...
   */
  app.get('/v1/setup/organizations', async (req, res) => {
    try {
      const { partner_id, connector_type } = req.query;

      if (!partner_id || !connector_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and connector_type are required',
        });
      }

      const credentials = GuidedSetupService.getCredentials(
        partner_id as string,
        connector_type as 'xero' | 'quickbooks'
      );

      if (!credentials) {
        return res.status(400).json({
          error: 'NOT_CONNECTED',
          detail: 'Complete OAuth connection first',
          hint: 'Use the connector API to authenticate first',
        });
      }

      // For demo purposes, return mock organization data
      // In production, fetch from actual ERP APIs
      const organizations =
        connector_type === 'xero'
          ? [
              {
                id: credentials.tenantId,
                name: 'Princess Hotel SA',
                currency: 'EUR',
                country: 'Greece',
                fiscal_year_end: '2025-12-31',
              },
            ]
          : [
              {
                id: credentials.companyId,
                name: 'Princess Hotel Company',
                currency: 'USD',
                country: 'United States',
                fiscal_year_end: '2025-12-31',
              },
            ];

      res.json({
        organizations,
        connector_type,
        partner_id,
      });
    } catch (error) {
      console.error('Organizations fetch error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to fetch organizations',
      });
    }
  });

  /**
   * Select Organization
   * POST /v1/setup/select-organization
   */
  app.post('/v1/setup/select-organization', async (req, res) => {
    try {
      const {
        partner_id,
        connector_type,
        organization_id,
        organization_name,
        base_currency,
      } = req.body;

      if (!partner_id || !connector_type || !organization_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail:
            'partner_id, connector_type, and organization_id are required',
        });
      }

      // Currency validation
      const currencyWarning =
        base_currency !== 'EUR'
          ? `Warning: Base currency is ${base_currency}, but payroll system uses EUR. Currency conversion may be needed.`
          : null;

      const setup = GuidedSetupService.updateStep(
        partner_id,
        connector_type,
        'org_select',
        'completed',
        {
          organization_id,
          organization_name,
          base_currency,
          currency_warning: currencyWarning,
        }
      );

      res.json({
        message: 'Organization selected successfully',
        current_step: setup.currentStep,
        currency_warning: currencyWarning,
        next_step_url: `/v1/setup/fetch-data?partner_id=${partner_id}&connector_type=${connector_type}`,
      });
    } catch (error) {
      console.error('Organization selection error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to select organization',
      });
    }
  });

  // =============================================================================
  // STEP 3: FETCH CHART OF ACCOUNTS & DIMENSIONS
  // =============================================================================

  /**
   * Fetch Chart of Accounts and Dimensions
   * GET /v1/setup/fetch-data?partner_id=...&connector_type=...
   */
  app.get('/v1/setup/fetch-data', async (req, res) => {
    try {
      const { partner_id, connector_type } = req.query;

      if (!partner_id || !connector_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and connector_type are required',
        });
      }

      // Update step to in_progress
      GuidedSetupService.updateStep(
        partner_id as string,
        connector_type as 'xero' | 'quickbooks',
        'fetch_data',
        'in_progress'
      );

      try {
        // Fetch chart of accounts
        const chartOfAccounts = await GuidedSetupService.fetchChartOfAccounts(
          partner_id as string,
          connector_type as 'xero' | 'quickbooks'
        );

        // Fetch dimensions
        const dimensions = await GuidedSetupService.fetchDimensionCategories(
          partner_id as string,
          connector_type as 'xero' | 'quickbooks'
        );

        // Mark step complete
        const setup = GuidedSetupService.updateStep(
          partner_id as string,
          connector_type as 'xero' | 'quickbooks',
          'fetch_data',
          'completed',
          { chart_of_accounts: chartOfAccounts, dimensions }
        );

        res.json({
          message: 'Data fetched successfully',
          current_step: setup.currentStep,
          data: {
            chart_of_accounts: chartOfAccounts,
            dimensions,
            accounts_count: chartOfAccounts.length,
            expense_accounts: chartOfAccounts.filter(
              acc => acc.type === 'expense'
            ).length,
            liability_accounts: chartOfAccounts.filter(
              acc => acc.type === 'liability'
            ).length,
          },
          next_step_url: `/v1/setup/mapping?partner_id=${partner_id}&connector_type=${connector_type}`,
        });
      } catch (fetchError) {
        // Mark step as failed
        GuidedSetupService.updateStep(
          partner_id as string,
          connector_type as 'xero' | 'quickbooks',
          'fetch_data',
          'failed'
        );
        throw fetchError;
      }
    } catch (error) {
      console.error('Data fetch error:', error);
      res.status(500).json({
        error: 'FETCH_FAILED',
        detail:
          error instanceof Error ? error.message : 'Failed to fetch ERP data',
        hint: 'Check connector authentication and network connectivity',
      });
    }
  });

  // =============================================================================
  // STEP 4: ACCOUNT MAPPINGS
  // =============================================================================

  /**
   * Get Mapping Templates and Current Mappings
   * GET /v1/setup/mapping?partner_id=...&connector_type=...
   */
  app.get('/v1/setup/mapping', async (req, res) => {
    try {
      const { partner_id, connector_type } = req.query;

      if (!partner_id || !connector_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and connector_type are required',
        });
      }

      const setup = GuidedSetupService.getSetup(
        partner_id as string,
        connector_type as 'xero' | 'quickbooks'
      );

      if (!setup) {
        return res.status(404).json({
          error: 'SETUP_NOT_FOUND',
          detail: 'Setup not found - initialize first',
        });
      }

      // Get chart of accounts from step data
      const fetchDataStep = setup.steps.find(s => s.id === 'fetch_data');
      const chartOfAccounts: ChartOfAccount[] =
        fetchDataStep?.data?.chart_of_accounts || [];

      // Greek payroll mapping template
      const mappingTemplate = {
        earnings: [
          {
            code: 'REG',
            name: 'Regular Wages',
            type: 'expense',
            required: true,
          },
          {
            code: 'OT_TIER1_40',
            name: 'Overtime Tier 1 (40%)',
            type: 'expense',
            required: true,
          },
          {
            code: 'OT_TIER2_60',
            name: 'Overtime Tier 2 (60%)',
            type: 'expense',
            required: false,
          },
          {
            code: 'NIGHT_25',
            name: 'Night Shift Premium (25%)',
            type: 'expense',
            required: false,
          },
          {
            code: 'SUNDAY_75',
            name: 'Sunday Premium (75%)',
            type: 'expense',
            required: false,
          },
          {
            code: 'HOLIDAY_100',
            name: 'Holiday Premium (100%)',
            type: 'expense',
            required: false,
          },
        ],
        employer_contributions: [
          {
            code: 'EFKA_EMPLOYER',
            name: 'EFKA Employer Contribution',
            type: 'expense',
            required: true,
          },
          {
            code: 'UNEMPLOYMENT_EMPLOYER',
            name: 'Unemployment Employer',
            type: 'expense',
            required: false,
          },
        ],
        liabilities: [
          {
            code: 'EFKA_EMPLOYEE',
            name: 'EFKA Employee Deduction',
            type: 'liability',
            required: true,
          },
          {
            code: 'AADE_FMY',
            name: 'AADE ΦΜΥ Tax Withholding',
            type: 'liability',
            required: true,
          },
          {
            code: 'SPECIAL_SOLIDARITY',
            name: 'Special Solidarity Tax',
            type: 'liability',
            required: false,
          },
        ],
        clearing: [
          {
            code: 'NET_PAY_CLEARING',
            name: 'Payroll Clearing Account',
            type: 'asset',
            required: true,
          },
          {
            code: 'BANK_TRANSFER',
            name: 'Bank Transfer Account',
            type: 'asset',
            required: false,
          },
        ],
      };

      // Suggest account mappings based on account names/codes
      const suggestedMappings: Record<string, string> = {};

      chartOfAccounts.forEach(account => {
        const nameUpper = account.name.toUpperCase();
        const codeUpper = account.code.toUpperCase();

        // Wage accounts
        if (
          (nameUpper.includes('WAGE') ||
            nameUpper.includes('SALARY') ||
            codeUpper.startsWith('60')) &&
          account.type === 'expense'
        ) {
          if (!suggestedMappings['REG'])
            suggestedMappings['REG'] = account.code;
        }

        // EFKA
        if (
          (nameUpper.includes('EFKA') ||
            nameUpper.includes('SOCIAL SECURITY')) &&
          account.type === 'liability'
        ) {
          if (!suggestedMappings['EFKA_EMPLOYEE'])
            suggestedMappings['EFKA_EMPLOYEE'] = account.code;
        }

        // Tax withholding
        if (
          (nameUpper.includes('TAX') ||
            nameUpper.includes('WITHHOLD') ||
            codeUpper.startsWith('332')) &&
          account.type === 'liability'
        ) {
          if (!suggestedMappings['AADE_FMY'])
            suggestedMappings['AADE_FMY'] = account.code;
        }

        // Clearing/Bank
        if (
          (nameUpper.includes('PAYROLL') ||
            nameUpper.includes('CLEARING') ||
            codeUpper.startsWith('380')) &&
          account.type === 'asset'
        ) {
          if (!suggestedMappings['NET_PAY_CLEARING'])
            suggestedMappings['NET_PAY_CLEARING'] = account.code;
        }
      });

      res.json({
        partner_id,
        connector_type,
        mapping_template: mappingTemplate,
        current_mappings: setup.mappings.accounts,
        suggested_mappings: suggestedMappings,
        chart_of_accounts: chartOfAccounts.map(acc => ({
          code: acc.code,
          name: acc.name,
          type: acc.type,
        })),
        dimensions: fetchDataStep?.data?.dimensions || [],
        dimension_mappings: setup.mappings.dimensions,
      });
    } catch (error) {
      console.error('Mapping get error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to get mapping configuration',
      });
    }
  });

  /**
   * Save Account Mappings
   * POST /v1/setup/mapping
   */
  app.post('/v1/setup/mapping', async (req, res) => {
    try {
      const {
        partner_id,
        connector_type,
        account_mappings,
        dimension_mappings,
      } = req.body;

      if (!partner_id || !connector_type || !account_mappings) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail:
            'partner_id, connector_type, and account_mappings are required',
        });
      }

      const setup = GuidedSetupService.getSetup(partner_id, connector_type);

      if (!setup) {
        return res.status(404).json({
          error: 'SETUP_NOT_FOUND',
          detail: 'Setup not found - initialize first',
        });
      }

      // Update mappings
      setup.mappings.accounts = {
        ...setup.mappings.accounts,
        ...account_mappings,
      };
      if (dimension_mappings) {
        setup.mappings.dimensions = {
          ...setup.mappings.dimensions,
          ...dimension_mappings,
        };
      }

      // Validate mappings
      const fetchDataStep = setup.steps.find(s => s.id === 'fetch_data');
      const chartOfAccounts: ChartOfAccount[] =
        fetchDataStep?.data?.chart_of_accounts || [];
      const validation = GuidedSetupService.validateMappings(
        setup,
        chartOfAccounts
      );

      if (validation.isValid) {
        // Mark mapping step complete
        const updatedSetup = GuidedSetupService.updateStep(
          partner_id,
          connector_type,
          'mapping',
          'completed',
          { validation_passed: true }
        );

        updatedSetup.validation.mappingComplete = true;

        res.json({
          message: 'Mappings saved and validated successfully',
          current_step: updatedSetup.currentStep,
          validation: {
            is_valid: true,
            errors: [],
            mappings_count: Object.keys(account_mappings).length,
          },
          next_step_url: `/v1/setup/validate?partner_id=${partner_id}&connector_type=${connector_type}`,
        });
      } else {
        res.status(400).json({
          error: 'VALIDATION_FAILED',
          detail: 'Account mappings are incomplete or invalid',
          validation: {
            is_valid: false,
            errors: validation.errors,
            mappings_count: Object.keys(account_mappings).length,
          },
          hint: 'Fix the mapping errors and try again',
        });
      }
    } catch (error) {
      console.error('Mapping save error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to save mappings',
      });
    }
  });

  // =============================================================================
  // STEP 5: VALIDATION & TEST JOURNAL
  // =============================================================================

  /**
   * Create and Validate Test Journal
   * POST /v1/setup/validate
   */
  app.post('/v1/setup/validate', async (req, res) => {
    try {
      const { partner_id, connector_type } = req.body;

      if (!partner_id || !connector_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and connector_type are required',
        });
      }

      const setup = GuidedSetupService.getSetup(partner_id, connector_type);
      if (!setup) {
        return res.status(404).json({
          error: 'SETUP_NOT_FOUND',
          detail: 'Setup not found',
        });
      }

      // Create test journal
      const testJournal = GuidedSetupService.createTestJournal(setup);

      // Validate balance and currency
      const balanceCheck = testJournal.isBalanced;
      const currencyCheck = testJournal.currency === 'EUR';

      // Generate reconciliation report
      const mockPayrollData = {
        totalGross: '2400.00',
        totalNet: '2088.00',
        totalDeductions: '312.00',
        totalEmployerCosts: '0.00',
      };

      const reconciliation = GuidedSetupService.generateReconciliationReport(
        mockPayrollData,
        testJournal
      );

      if (
        balanceCheck &&
        currencyCheck &&
        reconciliation.reconciliation.isReconciled
      ) {
        // Mark validation step complete
        const updatedSetup = GuidedSetupService.updateStep(
          partner_id,
          connector_type,
          'validation',
          'completed',
          {
            test_journal_id: testJournal.journalId,
            validation_passed: true,
            reconciliation,
          }
        );

        updatedSetup.validation.balanceCheck = true;
        updatedSetup.validation.currencyCheck = true;
        updatedSetup.validation.testJournalId = testJournal.journalId;

        res.json({
          message: 'Test journal validation successful',
          current_step: updatedSetup.currentStep,
          test_journal: testJournal,
          validation: {
            balance_check: balanceCheck,
            currency_check: currencyCheck,
            is_reconciled: reconciliation.reconciliation.isReconciled,
            warnings: reconciliation.warnings,
          },
          reconciliation,
          next_step_url: `/v1/setup/go-live?partner_id=${partner_id}&connector_type=${connector_type}`,
        });
      } else {
        res.status(400).json({
          error: 'VALIDATION_FAILED',
          detail: 'Test journal validation failed',
          test_journal: testJournal,
          validation: {
            balance_check: balanceCheck,
            currency_check: currencyCheck,
            is_reconciled: reconciliation.reconciliation.isReconciled,
            warnings: reconciliation.warnings,
          },
          reconciliation,
          hint: 'Review mappings and ensure all accounts are properly configured',
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to validate test journal',
      });
    }
  });

  // =============================================================================
  // STEP 6: GO LIVE SETTINGS
  // =============================================================================

  /**
   * Configure Go Live Settings
   * POST /v1/setup/go-live
   */
  app.post('/v1/setup/go-live', async (req, res) => {
    try {
      const {
        partner_id,
        connector_type,
        auto_post = false,
        draft_only = true,
        rounding = 'bankers',
      } = req.body;

      if (!partner_id || !connector_type) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and connector_type are required',
        });
      }

      const setup = GuidedSetupService.getSetup(partner_id, connector_type);
      if (!setup) {
        return res.status(404).json({
          error: 'SETUP_NOT_FOUND',
          detail: 'Setup not found',
        });
      }

      // Update configuration
      setup.config.autoPost = auto_post;
      setup.config.draftOnly = draft_only;
      setup.config.rounding = rounding;

      // Mark go-live step complete
      const updatedSetup = GuidedSetupService.updateStep(
        partner_id,
        connector_type,
        'go_live',
        'completed',
        {
          auto_post,
          draft_only,
          rounding,
          configured_at: new Date().toISOString(),
        }
      );

      res.json({
        message: 'Setup completed successfully',
        setup_complete: true,
        current_step: updatedSetup.currentStep,
        config: updatedSetup.config,
        summary: {
          partner_id,
          connector_type,
          auto_post_enabled: auto_post,
          draft_only_mode: draft_only,
          rounding_method: rounding,
          currency: 'EUR',
          steps_completed: updatedSetup.steps.filter(
            s => s.status === 'completed'
          ).length,
          total_steps: updatedSetup.steps.length,
        },
        next_action: auto_post
          ? 'Journals will automatically post to ERP on payroll finalization'
          : 'Journals will be created as drafts for manual review in ERP',
      });
    } catch (error) {
      console.error('Go live configuration error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to configure go live settings',
      });
    }
  });

  // =============================================================================
  // RECONCILIATION ENDPOINTS
  // =============================================================================

  /**
   * Generate Reconciliation Report
   * POST /v1/setup/reconciliation
   */
  app.post('/v1/setup/reconciliation', async (req, res) => {
    try {
      const { payroll_data, journal_data } = req.body;

      if (!payroll_data || !journal_data) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'payroll_data and journal_data are required',
        });
      }

      const reconciliation = GuidedSetupService.generateReconciliationReport(
        payroll_data,
        journal_data
      );

      res.json({
        reconciliation,
        generated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Reconciliation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to generate reconciliation report',
      });
    }
  });
}
