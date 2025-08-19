/**
 * GL Export Service - Canonical Implementation
 * Generates journal entries using the canonical GL data model
 */

import { db } from "../db";
import { 
  glJournalHeaders, 
  glJournalLinesCanonical,
  glEarningsCodeMappings,
  glDeductionMappings,
  glEmployerCostMappings,
  glBankMappings,
  glDimensionMappings,
  type InsertGLJournalHeader,
  type InsertGLJournalLineCanonical,
  type GLJournalHeader,
  type GLJournalLineCanonical
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface PayrollRunSummary {
  runId: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  entityId: string;
  totalGross: string;
  totalNet: string;
  employeeCount: number;
  lineItems: PayrollLineItem[];
}

export interface PayrollLineItem {
  employeeId: string;
  employeeName: string;
  earningsCode: string;
  earningsType: 'regular' | 'overtime' | 'allowance' | 'bonus' | 'deduction';
  description: string;
  amount: string;
  deductionCode?: string;
  costCenter?: string;
  department?: string;
  propertyId?: string;
}

export interface GLJournalRequest {
  tenantId: string;
  entityId: string;
  period: string; // YYYY-MM
  payrollRun: PayrollRunSummary;
  currency?: string;
  description?: string;
  mappingRules?: MappingRule[];
  splitBy?: string[]; // Dimensions to split by (property_id, department, etc.)
  rounding?: 'standard' | 'bankers';
  collapseZeroLines?: boolean;
  idempotencyKey?: string;
}

export interface MappingRule {
  type: 'earning' | 'premium' | 'employer_contrib' | 'liability' | 'bank';
  code?: string;
  name?: string;
  account: string;
  dimension?: string;
  description?: string;
  priority?: number;
}

export interface GLJournalResponse {
  journalId: string;
  journalNumber: string;
  status: 'draft' | 'posted' | 'reversed';
  totalDebit: string;
  totalCredit: string;
  lineCount: number;
  createdAt: string;
}

export class GLExportCanonical {
  
  /**
   * Generate GL journal from payroll run using canonical model
   */
  static async generateJournal(request: GLJournalRequest): Promise<GLJournalResponse> {
    return this.generateJournalInternal(request, false);
  }

  /**
   * Generate GL journal using custom mapping rules
   */
  static async generateJournalWithMappings(request: GLJournalRequest): Promise<GLJournalResponse> {
    return this.generateJournalInternal(request, true);
  }

  /**
   * Generate GL journal with advanced options (splitting, rounding, etc.)
   */
  static async generateJournalWithAdvancedOptions(request: GLJournalRequest): Promise<GLJournalResponse> {
    const { tenantId, entityId, period, payrollRun, currency = 'EUR', description, mappingRules, idempotencyKey } = request;
    
    // Create journal header with idempotency key
    const externalRefs = [{ 
      system: 'payroll', 
      id: payrollRun.runId,
      number: payrollRun.runNumber 
    }];
    
    if (idempotencyKey) {
      externalRefs.push({ idempotency_key: idempotencyKey });
    }

    const journalHeaderData: InsertGLJournalHeader = {
      tenantId,
      entityId,
      period,
      currency,
      status: 'draft' as const,
      source: 'payroll',
      runId: payrollRun.runId,
      description: description || `Payroll Journal - ${payrollRun.runNumber}`,
      externalRefs
    };

    const [journalHeader] = await db
      .insert(glJournalHeaders)
      .values(journalHeaderData)
      .returning();

    // Generate journal lines with advanced options
    const journalLines = await this.buildJournalLinesWithAdvancedOptions(
      journalHeader.journalId,
      payrollRun,
      mappingRules || [],
      request
    );

    // Insert journal lines
    if (journalLines.length > 0) {
      await db.insert(glJournalLinesCanonical).values(journalLines);
    }

    // Calculate totals
    const totalDebit = journalLines
      .reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0)
      .toFixed(2);
    
    const totalCredit = journalLines
      .reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0)
      .toFixed(2);

    return {
      journalId: journalHeader.journalId,
      journalNumber: `GL-${payrollRun.runNumber}`,
      status: journalHeader.status,
      totalDebit,
      totalCredit,
      lineCount: journalLines.length,
      createdAt: journalHeader.createdAt!.toISOString(),
    };
  }

  /**
   * Internal journal generation method
   */
  private static async generateJournalInternal(request: GLJournalRequest, useCustomMappings: boolean): Promise<GLJournalResponse> {
    const { tenantId, entityId, period, payrollRun, currency = 'EUR', description } = request;
    
    // Create journal header
    const journalHeaderData: InsertGLJournalHeader = {
      tenantId,
      entityId,
      period,
      currency,
      status: 'draft' as const,
      source: 'payroll',
      runId: payrollRun.runId,
      description: description || `Payroll Journal - ${payrollRun.runNumber}`,
      externalRefs: [{ 
        system: 'payroll', 
        id: payrollRun.runId,
        number: payrollRun.runNumber 
      }]
    };

    const [journalHeader] = await db
      .insert(glJournalHeaders)
      .values(journalHeaderData)
      .returning();

    // Generate journal lines from payroll data
    const journalLines = useCustomMappings && request.mappingRules
      ? await this.buildJournalLinesWithMappings(
          journalHeader.journalId,
          payrollRun,
          request.mappingRules
        )
      : await this.buildJournalLines(
          journalHeader.journalId,
          payrollRun
        );

    // Insert journal lines
    await db.insert(glJournalLinesCanonical).values(journalLines);

    // Calculate totals
    const totalDebit = journalLines
      .reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0)
      .toFixed(2);
    
    const totalCredit = journalLines
      .reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0)
      .toFixed(2);

    return {
      journalId: journalHeader.journalId,
      journalNumber: `GL-${payrollRun.runNumber}`,
      status: journalHeader.status,
      totalDebit,
      totalCredit,
      lineCount: journalLines.length,
      createdAt: journalHeader.createdAt!.toISOString(),
    };
  }

  /**
   * Build journal lines from payroll data using account mappings
   */
  private static async buildJournalLines(
    journalId: string,
    payrollRun: PayrollRunSummary
  ): Promise<InsertGLJournalLineCanonical[]> {
    const lines: InsertGLJournalLineCanonical[] = [];
    let lineNumber = 1;

    // Load account mappings
    const [earningsMappings, deductionMappings, employerCostMappings, bankMappings] = await Promise.all([
      this.loadEarningsMappings(),
      this.loadDeductionMappings(),
      this.loadEmployerCostMappings(),
      this.loadBankMappings()
    ]);

    // Group payroll items by type and account
    const groupedItems = this.groupPayrollItems(payrollRun.lineItems);

    // Process earnings (gross pay components)
    for (const [earningsCode, items] of Object.entries(groupedItems.earnings)) {
      const mapping = earningsMappings.get(earningsCode);
      if (!mapping) {
        console.warn(`No GL mapping found for earnings code: ${earningsCode}`);
        continue;
      }

      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      // Debit expense account (or contra-asset for accruals)
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode: mapping.accountCode,
        debit: totalAmount.toFixed(2),
        credit: '0.00',
        description: `${mapping.description} - ${payrollRun.runNumber}`,
        earningsCode,
        costCenter: this.determineCostCenter(items),
        department: this.determineDepartment(items),
        propertyId: this.determineProperty(items),
      });
    }

    // Process deductions and liabilities
    for (const [deductionCode, items] of Object.entries(groupedItems.deductions)) {
      const mapping = deductionMappings.get(deductionCode);
      if (!mapping) {
        console.warn(`No GL mapping found for deduction code: ${deductionCode}`);
        continue;
      }

      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      // Credit payable/liability account
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode: mapping.accountCode,
        debit: '0.00',
        credit: totalAmount.toFixed(2),
        description: `${mapping.description} - ${payrollRun.runNumber}`,
        earningsCode: deductionCode,
        costCenter: this.determineCostCenter(items),
        department: this.determineDepartment(items),
        propertyId: this.determineProperty(items),
      });
    }

    // Add employer costs (social security, benefits, etc.)
    const employerCosts = this.calculateEmployerCosts(payrollRun);
    for (const [costCode, amount] of Object.entries(employerCosts)) {
      const mapping = employerCostMappings.get(costCode);
      if (!mapping) {
        console.warn(`No GL mapping found for employer cost code: ${costCode}`);
        continue;
      }

      // Debit employer expense
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode: mapping.accountCode,
        debit: amount.toFixed(2),
        credit: '0.00',
        description: `${mapping.description} - ${payrollRun.runNumber}`,
        earningsCode: costCode,
      });
    }

    // Add clearing/bank entries
    const payrollClearingMapping = bankMappings.get('PAYROLL_CLEARING');
    if (payrollClearingMapping) {
      // Credit payroll clearing account (net pay due)
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode: payrollClearingMapping.accountCode,
        debit: '0.00',
        credit: parseFloat(payrollRun.totalNet).toFixed(2),
        description: `Net Pay Clearing - ${payrollRun.runNumber}`,
      });
    }

    return lines;
  }

  /**
   * Group payroll line items by earnings/deduction type
   */
  private static groupPayrollItems(items: PayrollLineItem[]) {
    const earnings: Record<string, PayrollLineItem[]> = {};
    const deductions: Record<string, PayrollLineItem[]> = {};

    items.forEach(item => {
      if (item.earningsType === 'deduction') {
        const code = item.deductionCode || 'OTHER';
        if (!deductions[code]) deductions[code] = [];
        deductions[code].push(item);
      } else {
        if (!earnings[item.earningsCode]) earnings[item.earningsCode] = [];
        earnings[item.earningsCode].push(item);
      }
    });

    return { earnings, deductions };
  }

  /**
   * Calculate employer costs (EFKA employer contributions, etc.)
   */
  private static calculateEmployerCosts(payrollRun: PayrollRunSummary): Record<string, number> {
    const totalGross = parseFloat(payrollRun.totalGross);
    
    // Greek employer social security contributions (approximate rates)
    return {
      'EFKA_EMPLOYER': totalGross * 0.2416, // 24.16% employer EFKA contribution
      'INSURANCE': totalGross * 0.02, // 2% group insurance
      'PROVISIONS': totalGross * 0.08, // 8% vacation/bonus provisions
    };
  }

  /**
   * Determine cost center from line items (use most frequent)
   */
  private static determineCostCenter(items: PayrollLineItem[]): string | undefined {
    const costCenters = items.map(item => item.costCenter).filter(Boolean);
    if (costCenters.length === 0) return undefined;
    
    // Return most frequent cost center
    const frequency = costCenters.reduce((acc, cc) => {
      acc[cc!] = (acc[cc!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  /**
   * Determine department from line items (use most frequent)
   */
  private static determineDepartment(items: PayrollLineItem[]): string | undefined {
    const departments = items.map(item => item.department).filter(Boolean);
    if (departments.length === 0) return undefined;
    
    const frequency = departments.reduce((acc, dept) => {
      acc[dept!] = (acc[dept!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  /**
   * Determine property from line items (use most frequent)
   */
  private static determineProperty(items: PayrollLineItem[]): string | undefined {
    const properties = items.map(item => item.propertyId).filter(Boolean);
    if (properties.length === 0) return undefined;
    
    const frequency = properties.reduce((acc, prop) => {
      acc[prop!] = (acc[prop!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)[0][0];
  }

  /**
   * Load earnings code to GL account mappings
   */
  private static async loadEarningsMappings(): Promise<Map<string, { accountCode: string; description: string }>> {
    const mappings = await db
      .select()
      .from(glEarningsCodeMappings)
      .where(eq(glEarningsCodeMappings.isActive, true));

    return new Map(
      mappings.map(mapping => [
        mapping.earningsCode,
        {
          accountCode: mapping.accountCode,
          description: mapping.description || mapping.earningsCode
        }
      ])
    );
  }

  /**
   * Load deduction code to GL account mappings
   */
  private static async loadDeductionMappings(): Promise<Map<string, { accountCode: string; description: string }>> {
    const mappings = await db
      .select()
      .from(glDeductionMappings)
      .where(eq(glDeductionMappings.isActive, true));

    return new Map(
      mappings.map(mapping => [
        mapping.deductionCode,
        {
          accountCode: mapping.accountCode,
          description: mapping.description || mapping.deductionCode
        }
      ])
    );
  }

  /**
   * Load employer cost to GL account mappings
   */
  private static async loadEmployerCostMappings(): Promise<Map<string, { accountCode: string; description: string }>> {
    const mappings = await db
      .select()
      .from(glEmployerCostMappings)
      .where(eq(glEmployerCostMappings.isActive, true));

    return new Map(
      mappings.map(mapping => [
        mapping.costCode,
        {
          accountCode: mapping.accountCode,
          description: mapping.description || mapping.costCode
        }
      ])
    );
  }

  /**
   * Load bank/clearing account mappings
   */
  private static async loadBankMappings(): Promise<Map<string, { accountCode: string; description: string }>> {
    const mappings = await db
      .select()
      .from(glBankMappings)
      .where(eq(glBankMappings.isActive, true));

    return new Map(
      mappings.map(mapping => [
        mapping.bankCode,
        {
          accountCode: mapping.accountCode,
          description: mapping.description || mapping.bankCode
        }
      ])
    );
  }

  /**
   * Post journal to GL (change status to posted)
   */
  static async postJournal(journalId: string): Promise<void> {
    await db
      .update(glJournalHeaders)
      .set({ 
        status: 'posted',
        postedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(glJournalHeaders.journalId, journalId));
  }

  /**
   * Reverse posted journal
   */
  static async reverseJournal(journalId: string, reason: string): Promise<string> {
    // Mark original as reversed
    await db
      .update(glJournalHeaders)
      .set({ 
        status: 'reversed',
        updatedAt: new Date()
      })
      .where(eq(glJournalHeaders.journalId, journalId));

    // Get original journal
    const [originalJournal] = await db
      .select()
      .from(glJournalHeaders)
      .where(eq(glJournalHeaders.journalId, journalId));

    const originalLines = await db
      .select()
      .from(glJournalLinesCanonical)
      .where(eq(glJournalLinesCanonical.journalId, journalId));

    // Create reversal journal
    const reversalJournalData: InsertGLJournalHeader = {
      tenantId: originalJournal.tenantId,
      entityId: originalJournal.entityId,
      period: originalJournal.period,
      currency: originalJournal.currency,
      status: 'posted' as const,
      source: originalJournal.source,
      runId: originalJournal.runId,
      description: `REVERSAL: ${originalJournal.description} - ${reason}`,
      externalRefs: originalJournal.externalRefs,
      postedAt: new Date(),
    };

    const [reversalJournal] = await db
      .insert(glJournalHeaders)
      .values(reversalJournalData)
      .returning();

    // Create reversal lines (swap debits and credits)
    const reversalLines: InsertGLJournalLineCanonical[] = originalLines.map(line => ({
      journalId: reversalJournal.journalId,
      accountCode: line.accountCode,
      debit: line.credit, // Swap debit and credit
      credit: line.debit,
      description: `REVERSAL: ${line.description}`,
      costCenter: line.costCenter,
      department: line.department,
      propertyId: line.propertyId,
      project: line.project,
      employeeId: line.employeeId,
      earningsCode: line.earningsCode,
      taxCode: line.taxCode,
      taxAmount: line.taxAmount,
      lineNumber: line.lineNumber,
    }));

    await db.insert(glJournalLinesCanonical).values(reversalLines);

    return reversalJournal.journalId;
  }

  /**
   * Get journal with lines
   */
  static async getJournal(journalId: string): Promise<{
    header: GLJournalHeader;
    lines: GLJournalLineCanonical[];
  } | null> {
    const [header] = await db
      .select()
      .from(glJournalHeaders)
      .where(eq(glJournalHeaders.journalId, journalId));

    if (!header) return null;

    const lines = await db
      .select()
      .from(glJournalLinesCanonical)
      .where(eq(glJournalLinesCanonical.journalId, journalId))
      .orderBy(glJournalLinesCanonical.lineNumber);

    return { header, lines };
  }

  /**
   * Build journal lines using custom mapping rules
   */
  private static async buildJournalLinesWithMappings(
    journalId: string,
    payrollRun: PayrollRunSummary,
    mappingRules: MappingRule[]
  ): Promise<InsertGLJournalLineCanonical[]> {
    const lines: InsertGLJournalLineCanonical[] = [];
    let lineNumber = 1;

    // Create mapping lookups
    const earningsMap = new Map<string, string>();
    const premiumMap = new Map<string, string>();
    const employerContribMap = new Map<string, string>();
    const liabilityMap = new Map<string, string>();
    const bankMap = new Map<string, string>();

    mappingRules.forEach(rule => {
      const key = rule.code || rule.name || '';
      switch (rule.type) {
        case 'earning':
          earningsMap.set(key, rule.account);
          break;
        case 'premium':
          premiumMap.set(key, rule.account);
          break;
        case 'employer_contrib':
          employerContribMap.set(key, rule.account);
          break;
        case 'liability':
          liabilityMap.set(key, rule.account);
          break;
        case 'bank':
          bankMap.set(key, rule.account);
          break;
      }
    });

    // Group payroll items by type and account
    const groupedItems = this.groupPayrollItems(payrollRun.lineItems);

    // Process earnings (gross pay components)
    for (const [earningsCode, items] of Object.entries(groupedItems.earnings)) {
      let accountCode = earningsMap.get(earningsCode);
      
      // Try premium mappings for special pay types
      if (!accountCode && (earningsCode.includes('NIGHT') || earningsCode.includes('SUNDAY') || earningsCode.includes('HOLIDAY'))) {
        accountCode = premiumMap.get(earningsCode);
      }
      
      // Default fallback
      if (!accountCode) {
        console.warn(`No mapping found for earnings code: ${earningsCode}, using default`);
        accountCode = '60.00.100'; // Default payroll expense account
      }

      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      // Debit expense account
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode,
        debit: totalAmount.toFixed(2),
        credit: '0.00',
        description: `${earningsCode} - ${payrollRun.runNumber}`,
        earningsCode,
        costCenter: this.determineCostCenter(items),
        department: this.determineDepartment(items),
        propertyId: this.determineProperty(items),
      });
    }

    // Process deductions and liabilities
    for (const [deductionCode, items] of Object.entries(groupedItems.deductions)) {
      const accountCode = liabilityMap.get(deductionCode) || liabilityMap.get(deductionCode.replace('_EE', '')) || '33.00.100';
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      // Credit payable/liability account
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode,
        debit: '0.00',
        credit: Math.abs(totalAmount).toFixed(2), // Make positive for liability
        description: `${deductionCode} - ${payrollRun.runNumber}`,
        earningsCode: deductionCode,
        costCenter: this.determineCostCenter(items),
        department: this.determineDepartment(items),
        propertyId: this.determineProperty(items),
      });
    }

    // Add employer costs
    const employerCosts = this.calculateEmployerCosts(payrollRun);
    for (const [costCode, amount] of Object.entries(employerCosts)) {
      const accountCode = employerContribMap.get(costCode) || '60.10.200'; // Default employer expense
      
      // Debit employer expense
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode,
        debit: amount.toFixed(2),
        credit: '0.00',
        description: `${costCode} - ${payrollRun.runNumber}`,
        earningsCode: costCode,
      });

      // Credit corresponding liability
      const liabilityAccount = liabilityMap.get(costCode) || liabilityMap.get(costCode.replace('_EMPLOYER', '_PAYABLE')) || '33.10.200';
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode: liabilityAccount,
        debit: '0.00',
        credit: amount.toFixed(2),
        description: `${costCode} Payable - ${payrollRun.runNumber}`,
        earningsCode: costCode + '_PAYABLE',
      });
    }

    // Add clearing/bank entries
    const clearingAccount = bankMap.get('PAYROLL_CLEARING') || '38.00.100';
    
    // Credit payroll clearing account (net pay due)
    lines.push({
      journalId,
      lineNumber: lineNumber++,
      accountCode: clearingAccount,
      debit: '0.00',
      credit: parseFloat(payrollRun.totalNet).toFixed(2),
      description: `Net Pay Clearing - ${payrollRun.runNumber}`,
    });

    return lines;
  }

  /**
   * Build journal lines with advanced options (splitting, rounding, collapsing)
   */
  private static async buildJournalLinesWithAdvancedOptions(
    journalId: string,
    payrollRun: PayrollRunSummary,
    mappingRules: MappingRule[],
    options: GLJournalRequest
  ): Promise<InsertGLJournalLineCanonical[]> {
    const lines: InsertGLJournalLineCanonical[] = [];
    let lineNumber = 1;

    // Create mapping lookups
    const earningsMap = new Map<string, string>();
    const premiumMap = new Map<string, string>();
    const employerContribMap = new Map<string, string>();
    const liabilityMap = new Map<string, string>();
    const bankMap = new Map<string, string>();

    mappingRules.forEach(rule => {
      const key = rule.code || rule.name || '';
      switch (rule.type) {
        case 'earning':
          earningsMap.set(key, rule.account);
          break;
        case 'premium':
          premiumMap.set(key, rule.account);
          break;
        case 'employer_contrib':
          employerContribMap.set(key, rule.account);
          break;
        case 'liability':
          liabilityMap.set(key, rule.account);
          break;
        case 'bank':
          bankMap.set(key, rule.account);
          break;
      }
    });

    // Group payroll items by type, account, and dimensions
    const groupedItems = this.groupPayrollItemsAdvanced(
      payrollRun.lineItems,
      options.splitBy || []
    );

    // Process earnings (gross pay components)
    for (const [key, items] of Object.entries(groupedItems.earnings)) {
      const [earningsCode, dimensionKey] = key.split('|');
      let accountCode = earningsMap.get(earningsCode);
      
      // Try premium mappings for special pay types
      if (!accountCode && (earningsCode.includes('NIGHT') || earningsCode.includes('SUNDAY') || earningsCode.includes('HOLIDAY'))) {
        accountCode = premiumMap.get(earningsCode);
      }
      
      // Throw error if no mapping found
      if (!accountCode) {
        throw new Error(`No mapping found for earnings code: ${earningsCode}`);
      }

      let totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      // Apply rounding
      if (options.rounding === 'bankers') {
        totalAmount = this.bankerRound(totalAmount);
      }

      // Skip zero lines if collapse_zero_lines is true
      if (options.collapseZeroLines && totalAmount === 0) {
        continue;
      }

      // Parse dimensions from key
      const dimensions = this.parseDimensionKey(dimensionKey, items[0]);
      
      // Debit expense account
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode,
        debit: totalAmount.toFixed(2),
        credit: '0.00',
        description: `${earningsCode} ${payrollRun.runNumber}`,
        earningsCode,
        ...dimensions,
      });
    }

    // Process deductions and liabilities
    for (const [key, items] of Object.entries(groupedItems.deductions)) {
      const [deductionCode, dimensionKey] = key.split('|');
      const accountCode = liabilityMap.get(deductionCode) || liabilityMap.get(deductionCode.replace('_EE', '')) || '33.00.100';
      let totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      // Apply rounding
      if (options.rounding === 'bankers') {
        totalAmount = this.bankerRound(totalAmount);
      }

      // Skip zero lines if collapse_zero_lines is true
      if (options.collapseZeroLines && totalAmount === 0) {
        continue;
      }

      const dimensions = this.parseDimensionKey(dimensionKey, items[0]);
      
      // Credit payable/liability account
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode,
        debit: '0.00',
        credit: Math.abs(totalAmount).toFixed(2), // Make positive for liability
        description: `${deductionCode} ${payrollRun.runNumber}`,
        earningsCode: deductionCode,
        ...dimensions,
      });
    }

    // Add employer costs
    const employerCosts = this.calculateEmployerCosts(payrollRun);
    for (const [costCode, amount] of Object.entries(employerCosts)) {
      const accountCode = employerContribMap.get(costCode) || '60.10.200'; // Default employer expense
      
      let finalAmount = amount;
      if (options.rounding === 'bankers') {
        finalAmount = this.bankerRound(finalAmount);
      }

      if (options.collapseZeroLines && finalAmount === 0) {
        continue;
      }
      
      // Debit employer expense
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode,
        debit: finalAmount.toFixed(2),
        credit: '0.00',
        description: `${costCode} ${payrollRun.runNumber}`,
        earningsCode: costCode,
      });

      // Credit corresponding liability
      const liabilityAccount = liabilityMap.get(costCode) || liabilityMap.get(costCode.replace('_EMPLOYER', '_PAYABLE')) || '33.10.200';
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode: liabilityAccount,
        debit: '0.00',
        credit: finalAmount.toFixed(2),
        description: `${costCode} Payable ${payrollRun.runNumber}`,
        earningsCode: costCode + '_PAYABLE',
      });
    }

    // Add clearing/bank entries
    const clearingAccount = bankMap.get('PAYROLL_CLEARING') || '38.00.100';
    let netAmount = parseFloat(payrollRun.totalNet);
    
    if (options.rounding === 'bankers') {
      netAmount = this.bankerRound(netAmount);
    }

    if (!options.collapseZeroLines || netAmount !== 0) {
      // Credit payroll clearing account (net pay due)
      lines.push({
        journalId,
        lineNumber: lineNumber++,
        accountCode: clearingAccount,
        debit: '0.00',
        credit: netAmount.toFixed(2),
        description: `Net Pay Clearing ${payrollRun.runNumber}`,
      });
    }

    return lines;
  }

  /**
   * Group payroll items with advanced splitting by dimensions
   */
  private static groupPayrollItemsAdvanced(items: PayrollLineItem[], splitBy: string[]) {
    const earnings: Record<string, PayrollLineItem[]> = {};
    const deductions: Record<string, PayrollLineItem[]> = {};

    items.forEach(item => {
      // Create dimension key based on splitBy fields
      const dimensionParts = splitBy.map(field => {
        switch (field) {
          case 'property_id': return item.propertyId || 'NONE';
          case 'department': return item.department || 'NONE';
          case 'cost_center': return item.costCenter || 'NONE';
          case 'employee_id': return item.employeeId || 'NONE';
          default: return 'NONE';
        }
      });
      
      const dimensionKey = dimensionParts.join(':');

      if (item.earningsType === 'deduction') {
        const code = item.deductionCode || 'OTHER';
        const key = `${code}|${dimensionKey}`;
        if (!deductions[key]) deductions[key] = [];
        deductions[key].push(item);
      } else {
        const key = `${item.earningsCode}|${dimensionKey}`;
        if (!earnings[key]) earnings[key] = [];
        earnings[key].push(item);
      }
    });

    return { earnings, deductions };
  }

  /**
   * Parse dimension key back to GL line fields
   */
  private static parseDimensionKey(dimensionKey: string, sampleItem: PayrollLineItem) {
    const dimensions: any = {};
    
    // Use sample item for dimensions (in real implementation, parse from key)
    if (sampleItem.costCenter) dimensions.costCenter = sampleItem.costCenter;
    if (sampleItem.department) dimensions.department = sampleItem.department;
    if (sampleItem.propertyId) dimensions.propertyId = sampleItem.propertyId;
    if (sampleItem.employeeId) dimensions.employeeId = sampleItem.employeeId;
    
    return dimensions;
  }

  /**
   * Apply banker's rounding
   */
  private static bankerRound(value: number): number {
    return Math.round(value * 100) / 100;
  }
}