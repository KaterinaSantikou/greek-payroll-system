/**
 * Performance Optimizer Service - High-speed journal building
 */

import { performance } from 'perf_hooks';
import { db } from '../db';
import { payrollLines, employees } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  employeeCount: number;
  lineCount: number;
  splitDimensions: string[];
  processingRate: number; // employees per second
}

export interface OptimizedJournalLine {
  lineId: string;
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
  dimensions: Record<string, string>;
  earningsCode: string;
}

export interface JournalBuildResult {
  journalId: string;
  lines: OptimizedJournalLine[];
  metrics: PerformanceMetrics;
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  splitSummary: Record<string, { lines: number; debits: number; credits: number }>;
}

export class PerformanceOptimizer {
  private static cache = new Map<string, any>();
  private static mappingCache = new Map<string, any>();

  /**
   * High-performance journal building with caching and batching
   */
  static async buildJournalOptimized(
    runId: string,
    entityId: string,
    splitBy: string[] = [],
    rounding: 'bankers' | 'round_half_up' = 'bankers'
  ): Promise<JournalBuildResult> {
    const startTime = performance.now();
    
    // Step 1: Batch fetch all data with single queries
    const [payrollData, employeeData, mappingRules] = await Promise.all([
      this.fetchPayrollDataBatch(runId),
      this.fetchEmployeeDataBatch(runId),
      this.getCachedMappingRules(entityId),
    ]);

    // Step 2: Build lookup maps for O(1) access
    const employeeLookup = new Map(employeeData.map(emp => [emp.employeeId, emp]));
    const mappingLookup = this.buildMappingLookup(mappingRules);

    // Step 3: Process lines in parallel chunks
    const chunkSize = 50; // Process 50 employees at a time
    const chunks = this.chunkArray(payrollData, chunkSize);
    
    const allLines: OptimizedJournalLine[] = [];
    const splitSummary: Record<string, { lines: number; debits: number; credits: number }> = {};

    // Process chunks in parallel
    const chunkResults = chunks.map(chunk => 
      this.processPayrollChunk(chunk, employeeLookup, mappingLookup, splitBy, rounding)
    );
    
    // Step 4: Combine results and calculate splits
    for (const chunkResult of chunkResults) {
      allLines.push(...chunkResult.lines);
      this.mergeSplitSummary(splitSummary, chunkResult.splitSummary);
    }

    // Step 5: Final balance validation
    const totalDebits = allLines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
    const totalCredits = allLines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    const endTime = performance.now();
    const duration = endTime - startTime;

    const metrics: PerformanceMetrics = {
      startTime,
      endTime,
      duration,
      employeeCount: payrollData.length,
      lineCount: allLines.length,
      splitDimensions: splitBy,
      processingRate: payrollData.length / (duration / 1000), // employees per second
    };

    return {
      journalId: `JRN-${runId}-${Date.now()}`,
      lines: allLines,
      metrics,
      isBalanced,
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      splitSummary,
    };
  }

  /**
   * Batch fetch payroll data
   */
  private static async fetchPayrollDataBatch(runId: string): Promise<any[]> {
    const cacheKey = `payroll_${runId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const payrollData = await db
      .select({
        employeeId: payrollLines.employeeId,
        earningsCode: payrollLines.earningCode,
        amount: payrollLines.grossAmount,
        propertyId: payrollLines.propertyId,
        department: payrollLines.departmentId,
        costCenter: payrollLines.costCenterId,
        description: payrollLines.description,
      })
      .from(payrollLines)
      .where(eq(payrollLines.runId, runId));

    this.cache.set(cacheKey, payrollData);
    return payrollData;
  }

  /**
   * Batch fetch employee data
   */
  private static async fetchEmployeeDataBatch(runId: string): Promise<any[]> {
    // Get unique employee IDs from payroll lines
    const payrollData = await this.fetchPayrollDataBatch(runId);
    const employeeIds = Array.from(new Set(payrollData.map(p => p.employeeId)));

    const cacheKey = `employees_${employeeIds.join(',')}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const employeeData = await db
      .select({
        employeeId: employees.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        propertyId: employees.propertyId,
        department: employees.departmentId,
      })
      .from(employees)
      .where(inArray(employees.employeeId, employeeIds));

    this.cache.set(cacheKey, employeeData);
    return employeeData;
  }

  /**
   * Get cached mapping rules
   */
  private static async getCachedMappingRules(entityId: string): Promise<any[]> {
    const cacheKey = `mapping_${entityId}`;
    
    if (this.mappingCache.has(cacheKey)) {
      return this.mappingCache.get(cacheKey);
    }

    // Mock mapping rules (in production, fetch from database)
    const rules = [
      { code: 'REG', account: '6000', type: 'expense' },
      { code: 'OT_TIER1_40', account: '6001', type: 'expense' },
      { code: 'EFKA_EMPLOYEE', account: '3310', type: 'liability' },
      { code: 'EFKA_EMPLOYER', account: '6200', type: 'expense' },
      { code: 'AADE_FMY', account: '3320', type: 'liability' },
      { code: 'NET_PAY_CLEARING', account: '3800', type: 'asset' },
    ];

    this.mappingCache.set(cacheKey, rules);
    return rules;
  }

  /**
   * Build mapping lookup for O(1) access
   */
  private static buildMappingLookup(rules: any[]): Map<string, string> {
    return new Map(rules.map(rule => [rule.code, rule.account]));
  }

  /**
   * Process payroll chunk in parallel
   */
  private static processPayrollChunk(
    payrollChunk: any[],
    employeeLookup: Map<string, any>,
    mappingLookup: Map<string, string>,
    splitBy: string[],
    rounding: 'bankers' | 'round_half_up'
  ): { lines: OptimizedJournalLine[]; splitSummary: Record<string, any> } {
    const lines: OptimizedJournalLine[] = [];
    const splitSummary: Record<string, { lines: number; debits: number; credits: number }> = {};

    for (const payrollLine of payrollChunk) {
      const employee = employeeLookup.get(payrollLine.employeeId);
      const accountCode = mappingLookup.get(payrollLine.earningsCode);
      
      if (!accountCode || !employee) continue;

      const amount = parseFloat(payrollLine.amount);
      const roundedAmount = this.applyRounding(amount, rounding);

      // Build dimensions based on splitBy
      const dimensions: Record<string, string> = {};
      if (splitBy.includes('property_id')) {
        dimensions.property_id = payrollLine.propertyId || employee.propertyId;
      }
      if (splitBy.includes('department')) {
        dimensions.department = payrollLine.department || employee.department;
      }
      if (splitBy.includes('cost_center')) {
        dimensions.cost_center = payrollLine.costCenter || 'DEFAULT';
      }

      // Determine debit/credit based on account type
      const isExpense = ['6000', '6001', '6200'].includes(accountCode);
      const debit = isExpense ? roundedAmount.toFixed(2) : '0.00';
      const credit = !isExpense ? roundedAmount.toFixed(2) : '0.00';

      const line: OptimizedJournalLine = {
        lineId: `L-${payrollLine.employeeId}-${payrollLine.earningsCode}-${Date.now()}`,
        accountCode,
        debit,
        credit,
        description: payrollLine.description || `${payrollLine.earningsCode} - ${employee.firstName} ${employee.lastName}`,
        dimensions,
        earningsCode: payrollLine.earningsCode,
      };

      lines.push(line);

      // Update split summary
      const splitKey = this.getSplitKey(dimensions, splitBy);
      if (!splitSummary[splitKey]) {
        splitSummary[splitKey] = { lines: 0, debits: 0, credits: 0 };
      }
      splitSummary[splitKey].lines++;
      splitSummary[splitKey].debits += parseFloat(debit);
      splitSummary[splitKey].credits += parseFloat(credit);
    }

    return { lines, splitSummary };
  }

  /**
   * Chunk array for parallel processing
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Apply rounding method
   */
  private static applyRounding(value: number, method: 'bankers' | 'round_half_up'): number {
    if (method === 'bankers') {
      // Banker's rounding
      const scaled = value * 100;
      const truncated = Math.trunc(scaled);
      const fractional = scaled - truncated;
      
      if (Math.abs(fractional) === 0.5) {
        return truncated % 2 === 0 ? truncated / 100 : (truncated + Math.sign(fractional)) / 100;
      }
      return Math.round(scaled) / 100;
    } else {
      return Math.round(value * 100) / 100;
    }
  }

  /**
   * Generate split key for summary
   */
  private static getSplitKey(dimensions: Record<string, string>, splitBy: string[]): string {
    const parts = splitBy.map(dim => `${dim}:${dimensions[dim] || 'DEFAULT'}`);
    return parts.join('|') || 'DEFAULT';
  }

  /**
   * Merge split summaries
   */
  private static mergeSplitSummary(
    target: Record<string, { lines: number; debits: number; credits: number }>,
    source: Record<string, { lines: number; debits: number; credits: number }>
  ): void {
    for (const [key, value] of Object.entries(source)) {
      if (!target[key]) {
        target[key] = { lines: 0, debits: 0, credits: 0 };
      }
      target[key].lines += value.lines;
      target[key].debits += value.debits;
      target[key].credits += value.credits;
    }
  }

  /**
   * Clear caches
   */
  static clearCaches(): void {
    this.cache.clear();
    this.mappingCache.clear();
  }

  /**
   * Get performance benchmark for 200 employees
   */
  static getBenchmarkTarget(): { maxDuration: number; maxEmployees: number; targetRate: number } {
    return {
      maxDuration: 3000, // 3 seconds in milliseconds
      maxEmployees: 200,
      targetRate: 66.67, // 200 employees / 3 seconds
    };
  }
}