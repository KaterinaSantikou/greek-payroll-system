/**
 * Payroll Pipeline Integration for Garnishments
 * 
 * Provides integration between payroll calculation engine and garnishment processing.
 * Called during payroll runs to calculate and apply garnishment deductions.
 */

import { GarnishmentService } from './GarnishmentService';
import { GLExportService } from '../glExportService';
import { nanoid } from 'nanoid';

export interface PayrollGarnishmentInput {
  employeeId: string;
  payrollRunId: string;
  period: string;
  runType: 'regular' | 'bonus' | 'offcycle' | 'correction';
  grossPay: number;
  taxes: number;
  socialInsuranceContributions: number;
  netBeforeGarnishments: number;
  propertyId?: string;
  departmentId?: string;
}

export interface PayrollGarnishmentResult {
  employeeId: string;
  payrollRunId: string;
  garnishmentLines: Array<{
    lineId: string;
    code: string;
    description: string;
    amount: number;
    glAccount: string;
    orderRef: string;
    creditorName: string;
    remainingBalance: number;
  }>;
  netAfterGarnishments: number;
  glEntries: Array<{
    account: string;
    debit?: number;
    credit?: number;
    description: string;
    reference: string;
    dimensions: {
      property?: string;
      department?: string;
      employee: string;
    };
  }>;
  warnings: Array<{
    type: 'capped' | 'skipped';
    message: string;
    orderRef: string;
    reason: string;
  }>;
  auditInfo: {
    calculatedAt: string;
    calculatedBy: string;
    idempotencyKey?: string;
  };
}

/**
 * Payroll-Garnishment Integration Service
 */
export class PayrollGarnishmentIntegration {
  
  /**
   * Main integration point - called during payroll calculation
   */
  static async calculateGarnishmentsForPayroll(
    input: PayrollGarnishmentInput,
    actor: string,
    idempotencyKey?: string
  ): Promise<PayrollGarnishmentResult> {
    
    // Convert to garnishment calculation format
    const garnishmentInput = {
      employeeId: input.employeeId,
      runContext: {
        period: input.period,
        runType: input.runType
      },
      preTax: input.grossPay,
      taxes: input.taxes,
      contribs: input.socialInsuranceContributions,
      netBeforeGarnishments: input.netBeforeGarnishments,
      actor,
      payrollRunId: input.payrollRunId
    };
    
    // Calculate garnishments
    const garnishmentResult = await GarnishmentService.calculateGarnishments(garnishmentInput);
    
    // Convert to payroll line format
    const payrollLines = garnishmentResult.garnishmentLines.map(line => ({
      lineId: nanoid(),
      code: line.type,
      description: line.description,
      amount: -line.amount, // Negative for deduction
      glAccount: line.glAccount,
      orderRef: line.orderRef,
      creditorName: line.creditor,
      remainingBalance: line.remainingBalance
    }));
    
    // Generate GL entries with proper dimensions
    const glEntries = GarnishmentService.generateGLEntries(
      garnishmentResult.garnishmentLines,
      input.employeeId,
      input.propertyId || 'DEFAULT',
      input.departmentId || 'DEFAULT'
    );
    
    return {
      employeeId: input.employeeId,
      payrollRunId: input.payrollRunId,
      garnishmentLines: payrollLines,
      netAfterGarnishments: garnishmentResult.netAfterGarnishments,
      glEntries,
      warnings: garnishmentResult.warnings,
      auditInfo: {
        calculatedAt: new Date().toISOString(),
        calculatedBy: actor,
        idempotencyKey
      }
    };
  }
  
  /**
   * Batch process garnishments for multiple employees in a payroll run
   */
  static async calculateGarnishmentsForBatch(
    inputs: PayrollGarnishmentInput[],
    actor: string,
    idempotencyKey?: string
  ): Promise<{
    results: PayrollGarnishmentResult[];
    summary: {
      employeesProcessed: number;
      totalGarnishmentLines: number;
      totalGarnishmentAmount: number;
      totalGLEntries: number;
      warningCount: number;
      hasErrors: boolean;
    };
  }> {
    
    const results: PayrollGarnishmentResult[] = [];
    const errors: Array<{ employeeId: string; error: string }> = [];
    
    // Process each employee
    for (const input of inputs) {
      try {
        const result = await this.calculateGarnishmentsForPayroll(input, actor, idempotencyKey);
        results.push(result);
      } catch (error: any) {
        console.error(`Garnishment calculation failed for employee ${input.employeeId}:`, error);
        errors.push({
          employeeId: input.employeeId,
          error: error?.message || 'Unknown error'
        });
      }
    }
    
    // Calculate summary
    const summary = {
      employeesProcessed: results.length,
      totalGarnishmentLines: results.reduce((sum, r) => sum + r.garnishmentLines.length, 0),
      totalGarnishmentAmount: results.reduce((sum, r) => 
        sum + r.garnishmentLines.reduce((lineSum, line) => lineSum + Math.abs(line.amount), 0), 0
      ),
      totalGLEntries: results.reduce((sum, r) => sum + r.glEntries.length, 0),
      warningCount: results.reduce((sum, r) => sum + r.warnings.length, 0),
      hasErrors: errors.length > 0
    };
    
    return {
      results,
      summary
    };
  }
  
  /**
   * Export GL entries for garnishments to general ledger system
   */
  static async exportGarnishmentGLEntries(
    payrollRunId: string,
    results: PayrollGarnishmentResult[],
    exportType: string = 'garnishments'
  ): Promise<{ batchId: string; entryCount: number }> {
    
    // Flatten all GL entries
    const allGLEntries = results.flatMap(result => result.glEntries);
    
    if (allGLEntries.length === 0) {
      return { batchId: '', entryCount: 0 };
    }
    
    // Export to GL system
    const batchId = nanoid();
    
    try {
      await GLExportService.exportGLBatch({
        batchId,
        runId: payrollRunId,
        entries: allGLEntries,
        exportType,
        createdBy: 'garnishment-service'
      });
      
      return {
        batchId,
        entryCount: allGLEntries.length
      };
    } catch (error) {
      console.error('Failed to export garnishment GL entries:', error);
      throw error;
    }
  }
  
  /**
   * Validate payroll run can include garnishments
   */
  static async validatePayrollRunForGarnishments(
    payrollRunId: string,
    runType: string,
    status: string
  ): Promise<{
    canProcess: boolean;
    reasons: string[];
  }> {
    
    const reasons: string[] = [];
    
    // Check run status
    if (status === 'finalized' || status === 'paid') {
      reasons.push('Cannot modify finalized or paid payroll run');
    }
    
    // Check run type compatibility
    if (runType === 'correction') {
      reasons.push('Garnishments cannot be applied to correction runs');
    }
    
    return {
      canProcess: reasons.length === 0,
      reasons
    };
  }
}