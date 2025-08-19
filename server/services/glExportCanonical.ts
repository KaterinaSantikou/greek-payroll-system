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
    const journalLines = await this.buildJournalLines(
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
}