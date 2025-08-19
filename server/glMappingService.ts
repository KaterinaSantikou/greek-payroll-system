import { db } from "./db";
import { payrollLines, employees } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface GLEntry {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  costCenter: string;
  employeeId?: string;
  reference: string;
}

interface GLMappingResult {
  journalEntries: GLEntry[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  payrollRunId: string;
  generatedAt: string;
}

// Greek Chart of Accounts for Payroll (Standard Greek Accounting)
export const GREEK_GL_ACCOUNTS = {
  // Expense Accounts (60.xx)
  WAGES_REGULAR: "60.00.01", // Regular wages
  WAGES_OVERTIME: "60.01.01", // Overtime premiums  
  WAGES_NIGHT: "60.01.02", // Night shift premiums
  WAGES_SUNDAY: "60.01.03", // Sunday premiums
  WAGES_HOLIDAY: "60.01.04", // Holiday premiums
  WAGES_ALLOWANCES: "60.02.01", // Various allowances
  WAGES_BONUSES: "60.03.01", // Bonuses (Easter, Christmas, vacation)
  WAGES_TIPS: "60.04.01", // Tips (pass-through)
  
  // Employer Contributions (60.1x)
  EMPLOYER_EFKA: "60.10.01", // EFKA employer contributions
  EMPLOYER_AUX_INS: "60.10.02", // Auxiliary insurance employer
  EMPLOYER_UNEMPLOYMENT: "60.10.03", // Unemployment insurance employer
  EMPLOYER_OAED: "60.10.04", // OAED contributions
  
  // Liability Accounts (33.xx)
  LIABILITY_INCOME_TAX: "33.01.01", // Income tax withholding
  LIABILITY_SOLIDARITY_TAX: "33.01.02", // Solidarity tax withholding
  LIABILITY_EFKA_EMPLOYEE: "33.02.01", // EFKA employee portion
  LIABILITY_EFKA_EMPLOYER: "33.02.02", // EFKA employer portion
  LIABILITY_AUX_INS_EMPLOYEE: "33.02.03", // Auxiliary insurance employee
  LIABILITY_AUX_INS_EMPLOYER: "33.02.04", // Auxiliary insurance employer
  LIABILITY_UNEMPLOYMENT_EE: "33.02.05", // Unemployment insurance employee
  LIABILITY_UNEMPLOYMENT_ER: "33.02.06", // Unemployment insurance employer
  LIABILITY_NET_PAY: "33.03.01", // Net pay payable
  
  // Bank/Cash Accounts (38.xx)
  BANK_CLEARING: "38.01.01", // Bank clearing account for payroll
  CASH_TIPS: "38.02.01", // Cash tips clearing
  
  // Cost Centers
  COST_CENTER_FRONT_OFFICE: "CC-FO",
  COST_CENTER_HOUSEKEEPING: "CC-HK", 
  COST_CENTER_FB: "CC-FB",
  COST_CENTER_ADMIN: "CC-ADMIN"
};

export class GLMappingService {
  
  // Generate GL entries for payroll run
  async generateGLMapping(payrollRunId: string): Promise<GLMappingResult> {
    // Fetch all payroll data for the run
    const payrollData = await db
      .select({
        employeeId: payrollLines.employeeId,
        employeeName: employees.firstName,
        employeeLastName: employees.lastName,
        department: employees.currentDepartment,
        earningsCode: payrollLines.earningsCode,
        earningsType: payrollLines.earningsType,
        amount: payrollLines.amount,
        costCenter: payrollLines.costCenter
      })
      .from(payrollLines)
      .innerJoin(employees, eq(payrollLines.employeeId, employees.employeeId))
      .where(eq(payrollLines.runId, payrollRunId));
    
    if (payrollData.length === 0) {
      throw new Error(`No payroll data found for run: ${payrollRunId}`);
    }
    
    const journalEntries: GLEntry[] = [];
    
    // Group by earnings codes for aggregation
    const aggregatedEntries = this.aggregateByEarningsCode(payrollData);
    
    // Generate GL entries for each earnings code
    for (const [earningsCode, data] of aggregatedEntries) {
      const glEntries = this.mapEarningsCodeToGL(earningsCode, data, payrollRunId);
      journalEntries.push(...glEntries);
    }
    
    // Calculate totals
    const totalDebit = journalEntries.reduce((sum, entry) => sum + entry.debitAmount, 0);
    const totalCredit = journalEntries.reduce((sum, entry) => sum + entry.creditAmount, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01; // Allow for rounding
    
    return {
      journalEntries,
      totalDebit,
      totalCredit,
      isBalanced,
      payrollRunId,
      generatedAt: new Date().toISOString()
    };
  }
  
  private aggregateByEarningsCode(payrollData: any[]): Map<string, any> {
    const aggregated = new Map();
    
    for (const row of payrollData) {
      const key = row.earningsCode;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          earningsCode: row.earningsCode,
          earningsType: row.earningsType,
          totalAmount: 0,
          employees: [],
          departments: new Set(),
          costCenters: new Set()
        });
      }
      
      const entry = aggregated.get(key);
      entry.totalAmount += parseFloat(row.amount || 0);
      entry.employees.push({
        id: row.employeeId,
        name: `${row.employeeName} ${row.employeeLastName}`,
        amount: parseFloat(row.amount || 0)
      });
      entry.departments.add(row.department);
      entry.costCenters.add(row.costCenter || 'GENERAL');
    }
    
    return aggregated;
  }
  
  private mapEarningsCodeToGL(earningsCode: string, data: any, payrollRunId: string): GLEntry[] {
    const entries: GLEntry[] = [];
    const amount = data.totalAmount;
    const costCenter = Array.from(data.costCenters)[0] || 'GENERAL';
    
    switch (earningsCode) {
      // Base Salary
      case 'BASE_SALARY':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_REGULAR,
          accountName: "Regular Wages",
          debitAmount: amount,
          creditAmount: 0,
          description: `Base salary - Payroll ${payrollRunId}`,
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Overtime Tiers
      case 'OT_T1_25PCT':
      case 'OT_T2_50PCT':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_OVERTIME,
          accountName: "Overtime Premiums", 
          debitAmount: amount,
          creditAmount: 0,
          description: `Overtime premiums - ${earningsCode}`,
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Night Premium
      case 'NIGHT_25PCT':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_NIGHT,
          accountName: "Night Shift Premium",
          debitAmount: amount,
          creditAmount: 0,
          description: "Night work premium (22:00-06:00)",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Sunday Premium  
      case 'SUNDAY_75PCT':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_SUNDAY,
          accountName: "Sunday Premium",
          debitAmount: amount,
          creditAmount: 0,
          description: "Sunday/Holiday work premium",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Holiday Premium
      case 'HOLIDAY_PREMIUM':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_HOLIDAY,
          accountName: "Holiday Premium",
          debitAmount: amount,
          creditAmount: 0,
          description: "Public holiday work premium",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Allowances
      case 'MEAL_VOUCHER':
      case 'TRANSPORT':
      case 'HOUSING':
      case 'HAZARD_PAY':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_ALLOWANCES,
          accountName: "Employee Allowances",
          debitAmount: amount,
          creditAmount: 0,
          description: `Allowance - ${earningsCode}`,
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Bonuses
      case 'EASTER_BONUS':
      case 'CHRISTMAS_BONUS': 
      case 'VACATION_PAY':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_BONUSES,
          accountName: "Employee Bonuses",
          debitAmount: amount,
          creditAmount: 0,
          description: `Greek mandatory bonus - ${earningsCode}`,
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Tips (Pass-through)
      case 'CASH_TIPS':
      case 'CARD_TIPS':
      case 'TIP_POOL_DIST':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_TIPS,
          accountName: "Employee Tips",
          debitAmount: amount,
          creditAmount: 0,
          description: `Tips distribution - ${earningsCode}`,
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Employee Deductions (Credit to Liabilities)
      case 'EFKA_EE':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.LIABILITY_EFKA_EMPLOYEE,
          accountName: "EFKA Employee Contributions",
          debitAmount: 0,
          creditAmount: amount,
          description: "EFKA employee portion (6.67%)",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      case 'INCOME_TAX':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.LIABILITY_INCOME_TAX,
          accountName: "Income Tax Withholding",
          debitAmount: 0,
          creditAmount: amount,
          description: "Employee income tax withholding",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      case 'SOLIDARITY_TAX':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.LIABILITY_SOLIDARITY_TAX,
          accountName: "Solidarity Tax",
          debitAmount: 0,
          creditAmount: amount,
          description: "Special solidarity contribution",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Net Pay
      case 'NET_PAY':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.LIABILITY_NET_PAY,
          accountName: "Net Pay Payable",
          debitAmount: 0,
          creditAmount: amount,
          description: "Net salary payable to employees",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      // Employer Contributions (Expenses)
      case 'EFKA_ER':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.EMPLOYER_EFKA,
          accountName: "EFKA Employer Contributions",
          debitAmount: amount,
          creditAmount: 0,
          description: "EFKA employer portion (24.06%)",
          costCenter,
          reference: payrollRunId
        },
        {
          accountCode: GREEK_GL_ACCOUNTS.LIABILITY_EFKA_EMPLOYER,
          accountName: "EFKA Employer Payable",
          debitAmount: 0,
          creditAmount: amount,
          description: "EFKA employer contributions payable",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      case 'UNEMP_ER':
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.EMPLOYER_UNEMPLOYMENT,
          accountName: "Unemployment Insurance Employer",
          debitAmount: amount,
          creditAmount: 0,
          description: "Unemployment insurance employer (1.66%)",
          costCenter,
          reference: payrollRunId
        },
        {
          accountCode: GREEK_GL_ACCOUNTS.LIABILITY_UNEMPLOYMENT_ER,
          accountName: "Unemployment Employer Payable",
          debitAmount: 0,
          creditAmount: amount,
          description: "Unemployment insurance employer payable",
          costCenter,
          reference: payrollRunId
        });
        break;
        
      default:
        // Unknown earnings code - map to general wages
        entries.push({
          accountCode: GREEK_GL_ACCOUNTS.WAGES_REGULAR,
          accountName: "General Wages",
          debitAmount: data.earningsType === 'earning' ? amount : 0,
          creditAmount: data.earningsType === 'deduction' ? amount : 0,
          description: `${earningsCode} - ${payrollRunId}`,
          costCenter,
          reference: payrollRunId
        });
        break;
    }
    
    return entries;
  }
  
  // Generate summary by account
  generateAccountSummary(glResult: GLMappingResult): any[] {
    const summary = new Map();
    
    for (const entry of glResult.journalEntries) {
      const key = entry.accountCode;
      if (!summary.has(key)) {
        summary.set(key, {
          accountCode: key,
          accountName: entry.accountName,
          totalDebit: 0,
          totalCredit: 0,
          netAmount: 0,
          entryCount: 0
        });
      }
      
      const account = summary.get(key);
      account.totalDebit += entry.debitAmount;
      account.totalCredit += entry.creditAmount;
      account.netAmount = account.totalDebit - account.totalCredit;
      account.entryCount++;
    }
    
    return Array.from(summary.values()).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }
  
  // Export GL entries to various formats
  exportToCSV(glResult: GLMappingResult): string {
    const headers = "Account Code,Account Name,Debit,Credit,Description,Cost Center,Reference\n";
    const rows = glResult.journalEntries.map(entry => 
      `"${entry.accountCode}","${entry.accountName}",${entry.debitAmount.toFixed(2)},${entry.creditAmount.toFixed(2)},"${entry.description}","${entry.costCenter}","${entry.reference}"`
    ).join('\n');
    
    return headers + rows;
  }
  
  // Validate GL mapping
  validateGLMapping(glResult: GLMappingResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if entries are balanced
    if (!glResult.isBalanced) {
      errors.push(`GL entries are not balanced. Debit: €${glResult.totalDebit.toFixed(2)}, Credit: €${glResult.totalCredit.toFixed(2)}`);
    }
    
    // Check for missing cost centers
    const entriesWithoutCostCenter = glResult.journalEntries.filter(entry => !entry.costCenter || entry.costCenter === '');
    if (entriesWithoutCostCenter.length > 0) {
      errors.push(`${entriesWithoutCostCenter.length} entries are missing cost center assignments`);
    }
    
    // Check for zero-amount entries
    const zeroEntries = glResult.journalEntries.filter(entry => entry.debitAmount === 0 && entry.creditAmount === 0);
    if (zeroEntries.length > 0) {
      errors.push(`${zeroEntries.length} entries have zero amounts`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}