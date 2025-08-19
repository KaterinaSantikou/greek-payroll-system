/**
 * Guided Setup Service - Wizard flows for ERP connector configuration
 */

import { db } from '../db';
import { partners } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { ConnectorFactory, type ConnectorCredentials } from './nativeConnectors';

export interface SetupStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: any;
}

export interface ConnectorSetup {
  partnerId: string;
  connectorType: 'xero' | 'quickbooks';
  currentStep: string;
  steps: SetupStep[];
  config: {
    autoPost: boolean;
    rounding: 'bankers' | 'round_half_up';
    currency: 'EUR';
    draftOnly: boolean;
  };
  mappings: {
    accounts: Record<string, string>; // earnings_code -> account_code
    dimensions: Record<string, string>; // property_id -> tracking_category_option
  };
  validation: {
    testJournalId?: string;
    balanceCheck: boolean;
    currencyCheck: boolean;
    mappingComplete: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartOfAccount {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'expense' | 'revenue' | 'equity';
  description?: string;
}

export interface DimensionCategory {
  id: string;
  name: string;
  options: { id: string; name: string }[];
}

export class GuidedSetupService {
  // In-memory storage for demo (in production, use database)
  private static setups = new Map<string, ConnectorSetup>();
  private static credentials = new Map<string, ConnectorCredentials>();

  /**
   * Initialize guided setup wizard
   */
  static initializeSetup(partnerId: string, connectorType: 'xero' | 'quickbooks'): ConnectorSetup {
    const setupId = `${partnerId}-${connectorType}`;
    
    const setup: ConnectorSetup = {
      partnerId,
      connectorType,
      currentStep: 'connect',
      steps: [
        { id: 'connect', name: 'Connect to ' + (connectorType === 'xero' ? 'Xero' : 'QuickBooks'), status: 'pending' },
        { id: 'org_select', name: 'Select Organization', status: 'pending' },
        { id: 'fetch_data', name: 'Fetch Chart of Accounts', status: 'pending' },
        { id: 'mapping', name: 'Configure Account Mappings', status: 'pending' },
        { id: 'validation', name: 'Test & Validate', status: 'pending' },
        { id: 'go_live', name: 'Go Live Settings', status: 'pending' },
      ],
      config: {
        autoPost: false,
        rounding: 'bankers',
        currency: 'EUR',
        draftOnly: true,
      },
      mappings: {
        accounts: {},
        dimensions: {},
      },
      validation: {
        balanceCheck: false,
        currencyCheck: false,
        mappingComplete: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.setups.set(setupId, setup);
    return setup;
  }

  /**
   * Get setup state
   */
  static getSetup(partnerId: string, connectorType: 'xero' | 'quickbooks'): ConnectorSetup | null {
    const setupId = `${partnerId}-${connectorType}`;
    return this.setups.get(setupId) || null;
  }

  /**
   * Update setup step
   */
  static updateStep(partnerId: string, connectorType: 'xero' | 'quickbooks', stepId: string, status: SetupStep['status'], data?: any): ConnectorSetup {
    const setupId = `${partnerId}-${connectorType}`;
    const setup = this.setups.get(setupId);
    
    if (!setup) {
      throw new Error('Setup not found');
    }

    // Update step status
    const step = setup.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (data) step.data = data;
    }

    // Move to next step if completed
    if (status === 'completed') {
      const currentIndex = setup.steps.findIndex(s => s.id === stepId);
      const nextStep = setup.steps[currentIndex + 1];
      if (nextStep) {
        setup.currentStep = nextStep.id;
      }
    }

    setup.updatedAt = new Date();
    this.setups.set(setupId, setup);
    return setup;
  }

  /**
   * Store connector credentials
   */
  static setCredentials(partnerId: string, connectorType: 'xero' | 'quickbooks', credentials: ConnectorCredentials): void {
    const credentialKey = `${partnerId}-${connectorType}`;
    this.credentials.set(credentialKey, credentials);
  }

  /**
   * Get connector credentials
   */
  static getCredentials(partnerId: string, connectorType: 'xero' | 'quickbooks'): ConnectorCredentials | null {
    const credentialKey = `${partnerId}-${connectorType}`;
    return this.credentials.get(credentialKey) || null;
  }

  /**
   * Fetch Chart of Accounts from external system
   */
  static async fetchChartOfAccounts(partnerId: string, connectorType: 'xero' | 'quickbooks'): Promise<ChartOfAccount[]> {
    const credentials = this.getCredentials(partnerId, connectorType);
    if (!credentials) {
      throw new Error('Connector not authenticated');
    }

    const config = {
      clientId: process.env[`${connectorType.toUpperCase()}_CLIENT_ID`] || `demo-${connectorType}-client`,
      clientSecret: process.env[`${connectorType.toUpperCase()}_CLIENT_SECRET`] || 'demo-secret',
      redirectUri: `http://localhost:5000/v1/connectors/${connectorType}/callback`,
      scopes: connectorType === 'xero' 
        ? ['accounting.transactions', 'accounting.settings', 'offline_access']
        : ['com.intuit.quickbooks.accounting', 'openid', 'profile', 'email'],
    };

    const connector = ConnectorFactory.createConnector(connectorType, config);
    connector.setCredentials(credentials);

    if (connectorType === 'xero') {
      return this.fetchXeroChartOfAccounts(connector, credentials);
    } else {
      return this.fetchQBOChartOfAccounts(connector, credentials);
    }
  }

  /**
   * Fetch Xero Chart of Accounts
   */
  private static async fetchXeroChartOfAccounts(connector: any, credentials: ConnectorCredentials): Promise<ChartOfAccount[]> {
    await connector.ensureValidToken();

    const response = await fetch('https://api.xero.com/api.xro/2.0/Accounts', {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Xero-Tenant-Id': credentials.tenantId!,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Xero accounts: ${response.statusText}`);
    }

    const data = await response.json();
    return data.Accounts.map((account: any) => ({
      code: account.Code,
      name: account.Name,
      type: account.Type.toLowerCase(),
      description: account.Description,
    }));
  }

  /**
   * Fetch QBO Chart of Accounts
   */
  private static async fetchQBOChartOfAccounts(connector: any, credentials: ConnectorCredentials): Promise<ChartOfAccount[]> {
    await connector.ensureValidToken();

    const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${credentials.companyId}/query?query=SELECT * FROM Account`, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch QBO accounts: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.QueryResponse?.Account || []).map((account: any) => ({
      code: account.AcctNum || account.Id,
      name: account.Name,
      type: account.AccountType.toLowerCase().includes('expense') ? 'expense' : 
            account.AccountType.toLowerCase().includes('liability') ? 'liability' : 
            account.AccountType.toLowerCase().includes('asset') ? 'asset' : 'other',
      description: account.Description,
    }));
  }

  /**
   * Fetch dimension categories (Tracking Categories for Xero, Departments/Classes for QBO)
   */
  static async fetchDimensionCategories(partnerId: string, connectorType: 'xero' | 'quickbooks'): Promise<DimensionCategory[]> {
    const credentials = this.getCredentials(partnerId, connectorType);
    if (!credentials) {
      throw new Error('Connector not authenticated');
    }

    if (connectorType === 'xero') {
      return this.fetchXeroDimensions(credentials);
    } else {
      return this.fetchQBODimensions(credentials);
    }
  }

  /**
   * Fetch Xero Tracking Categories
   */
  private static async fetchXeroDimensions(credentials: ConnectorCredentials): Promise<DimensionCategory[]> {
    const response = await fetch('https://api.xero.com/api.xro/2.0/TrackingCategories', {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Xero-Tenant-Id': credentials.tenantId!,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Xero tracking categories: ${response.statusText}`);
    }

    const data = await response.json();
    return data.TrackingCategories.map((category: any) => ({
      id: category.TrackingCategoryID,
      name: category.Name,
      options: category.Options.map((option: any) => ({
        id: option.TrackingOptionID,
        name: option.Name,
      })),
    }));
  }

  /**
   * Fetch QBO Departments, Classes, and Locations
   */
  private static async fetchQBODimensions(credentials: ConnectorCredentials): Promise<DimensionCategory[]> {
    const dimensions: DimensionCategory[] = [];

    // Fetch Departments
    const deptResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${credentials.companyId}/query?query=SELECT * FROM Department`, {
      headers: { 'Authorization': `Bearer ${credentials.accessToken}` },
    });

    if (deptResponse.ok) {
      const deptData = await deptResponse.json();
      if (deptData.QueryResponse?.Department) {
        dimensions.push({
          id: 'departments',
          name: 'Departments',
          options: deptData.QueryResponse.Department.map((dept: any) => ({
            id: dept.Id,
            name: dept.Name,
          })),
        });
      }
    }

    // Fetch Classes
    const classResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${credentials.companyId}/query?query=SELECT * FROM Class`, {
      headers: { 'Authorization': `Bearer ${credentials.accessToken}` },
    });

    if (classResponse.ok) {
      const classData = await classResponse.json();
      if (classData.QueryResponse?.Class) {
        dimensions.push({
          id: 'classes',
          name: 'Classes',
          options: classData.QueryResponse.Class.map((cls: any) => ({
            id: cls.Id,
            name: cls.Name,
          })),
        });
      }
    }

    return dimensions;
  }

  /**
   * Validate account mappings
   */
  static validateMappings(setup: ConnectorSetup, chartOfAccounts: ChartOfAccount[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const accountCodes = new Set(chartOfAccounts.map(acc => acc.code));

    // Required Greek payroll mappings
    const requiredMappings = {
      'REG': 'Regular wages expense account',
      'OT_TIER1_40': 'Overtime wages expense account',
      'EFKA_EMPLOYEE': 'EFKA employee contribution liability account',
      'EFKA_EMPLOYER': 'EFKA employer contribution expense account',
      'AADE_FMY': 'AADE ΦΜΥ withholding liability account',
      'NET_PAY_CLEARING': 'Payroll clearing account',
    };

    for (const [code, description] of Object.entries(requiredMappings)) {
      const mappedAccount = setup.mappings.accounts[code];
      if (!mappedAccount) {
        errors.push(`Missing mapping for ${code} (${description})`);
      } else if (!accountCodes.has(mappedAccount)) {
        errors.push(`Invalid account code ${mappedAccount} for ${code}`);
      }
    }

    // Check for expense/liability account types
    const expenseAccounts = chartOfAccounts.filter(acc => acc.type === 'expense').map(acc => acc.code);
    const liabilityAccounts = chartOfAccounts.filter(acc => acc.type === 'liability').map(acc => acc.code);

    const expenseCodes = ['REG', 'OT_TIER1_40', 'EFKA_EMPLOYER'];
    const liabilityCodes = ['EFKA_EMPLOYEE', 'AADE_FMY'];

    expenseCodes.forEach(code => {
      const mappedAccount = setup.mappings.accounts[code];
      if (mappedAccount && !expenseAccounts.includes(mappedAccount)) {
        errors.push(`${code} should map to an expense account`);
      }
    });

    liabilityCodes.forEach(code => {
      const mappedAccount = setup.mappings.accounts[code];
      if (mappedAccount && !liabilityAccounts.includes(mappedAccount)) {
        errors.push(`${code} should map to a liability account`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create test journal for validation
   */
  static createTestJournal(setup: ConnectorSetup): any {
    const testLines = [
      {
        lineId: 'L1',
        accountCode: setup.mappings.accounts['REG'] || '6000',
        debit: '2400.00',
        credit: '0.00',
        description: 'REG Test Aug-2025',
        department: 'TEST',
        propertyId: 'TEST_PROPERTY',
      },
      {
        lineId: 'L2',
        accountCode: setup.mappings.accounts['AADE_FMY'] || '3320',
        debit: '0.00',
        credit: '312.00',
        description: 'AADE ΦΜΥ Test Aug-2025',
      },
      {
        lineId: 'L3',
        accountCode: setup.mappings.accounts['NET_PAY_CLEARING'] || '3800',
        debit: '0.00',
        credit: '2088.00',
        description: 'Net Pay Test Aug-2025',
      },
    ];

    const totalDebits = testLines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
    const totalCredits = testLines.reduce((sum, line) => sum + parseFloat(line.credit), 0);

    return {
      journalId: 'TEST-' + Date.now(),
      entityId: setup.partnerId,
      period: new Date().toISOString().substring(0, 7),
      currency: 'EUR',
      description: `Test Journal - ${setup.connectorType}`,
      lines: testLines,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
    };
  }

  /**
   * Apply banker's rounding
   */
  static applyRounding(value: number, method: 'bankers' | 'round_half_up' = 'bankers'): number {
    if (method === 'bankers') {
      // Banker's rounding (round half to even)
      const rounded = Math.round(value * 100) / 100;
      return rounded;
    } else {
      // Standard round half up
      return Math.round(value * 100) / 100;
    }
  }

  /**
   * Generate reconciliation report
   */
  static generateReconciliationReport(payrollData: any, journalData: any): any {
    const payrollTotals = {
      grossPay: parseFloat(payrollData.totalGross || '0'),
      netPay: parseFloat(payrollData.totalNet || '0'),
      deductions: parseFloat(payrollData.totalDeductions || '0'),
      employerCosts: parseFloat(payrollData.totalEmployerCosts || '0'),
    };

    const journalTotals = {
      totalDebits: parseFloat(journalData.totalDebits || '0'),
      totalCredits: parseFloat(journalData.totalCredits || '0'),
      isBalanced: Math.abs(parseFloat(journalData.totalDebits || '0') - parseFloat(journalData.totalCredits || '0')) < 0.01,
    };

    const expectedJournalTotal = payrollTotals.grossPay + payrollTotals.employerCosts;
    const delta = Math.abs(expectedJournalTotal - journalTotals.totalDebits);

    return {
      payrollTotals,
      journalTotals,
      reconciliation: {
        expectedJournalTotal: expectedJournalTotal.toFixed(2),
        actualJournalTotal: journalTotals.totalDebits.toFixed(2),
        delta: delta.toFixed(2),
        isReconciled: delta < 0.01,
        currencyMatch: journalData.currency === 'EUR',
      },
      warnings: [
        ...(delta >= 0.01 ? [`Journal total differs from expected by €${delta.toFixed(2)}`] : []),
        ...(journalData.currency !== 'EUR' ? [`Currency mismatch: expected EUR, got ${journalData.currency}`] : []),
        ...(!journalTotals.isBalanced ? ['Journal is not balanced'] : []),
      ],
    };
  }
}