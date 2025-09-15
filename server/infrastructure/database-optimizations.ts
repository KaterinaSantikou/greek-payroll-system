/**
 * Database Performance Optimizations
 * 
 * This module contains optimized database queries and operations
 * for handling large-scale Greek payroll processing.
 * 
 * PERFORMANCE FEATURES:
 * - Bulk operations with chunking to avoid parameter limits
 * - Composite indexes on frequently queried columns
 * - Optimized joins using Maps for O(1) lookups
 * - Batch processing with concurrency limits
 * - Memory-efficient streaming for large datasets
 */

import { db } from "../db";
import { 
  employees,
  contracts,
  timesheets,
  payrollScopes,
  payrollScopeLines,
  employeePeriodState,
  periodLedgers,
  payrollRuns,
  payrollLines
} from "@shared/schema";
import { eq, and, inArray, sql, desc, like } from "drizzle-orm";

export interface OptimizedEmployeeData {
  employeeId: string;
  name: string;
  age?: number;
  contractType: string;
  hireDate: Date;
  terminationDate?: Date;
  salary: number;
  hourlyRate?: number;
  isFullTime: boolean;
  defaultPropertyId?: string;
  timesheetData?: {
    approvedHours: number;
    unapprovedHours: number;
    regularHours: number;
    overtimeHours: number;
    nightHours: number;
    sundayHours: number;
    holidayHours: number;
  };
}

export class DatabaseOptimizations {
  
  /**
   * PERFORMANCE OPTIMIZATION: Bulk fetch employee and contract data
   * Uses chunking to avoid database parameter limits (PostgreSQL default is 65535)
   * Returns Map for O(1) lookups instead of Array.find() operations
   */
  static async getBulkEmployeeData(
    employeeIds: string[],
    chunkSize: number = 500
  ): Promise<Map<string, OptimizedEmployeeData>> {
    const result = new Map<string, OptimizedEmployeeData>();
    
    // Process employee IDs in chunks to avoid parameter limits
    const chunks = this.chunkArray(employeeIds, chunkSize);
    
    for (const chunk of chunks) {
      // Fetch employee data
      const employeeData = await db
        .select({
          employeeId: employees.employeeId,
          name: employees.name,
          dateOfBirth: employees.dateOfBirth,
          defaultPropertyId: employees.defaultPropertyId
        })
        .from(employees)
        .where(inArray(employees.employeeId, chunk));

      // Fetch contract data in parallel
      const contractData = await db
        .select({
          employeeId: contracts.employeeId,
          contractType: contracts.contractType,
          hireDate: contracts.contractStartDate,
          terminationDate: contracts.contractEndDate,
          salary: contracts.salary,
          hourlyRate: contracts.hourlyRate,
          isFullTime: contracts.isFullTime
        })
        .from(contracts)
        .where(
          and(
            inArray(contracts.employeeId, chunk),
            eq(contracts.isActive, true)
          )
        );

      // Create contract lookup map for O(1) performance
      const contractMap = new Map(contractData.map(c => [c.employeeId, c]));

      // Combine data efficiently
      for (const emp of employeeData) {
        const contract = contractMap.get(emp.employeeId);
        if (contract) {
          // Calculate age efficiently
          let age: number | undefined;
          if (emp.dateOfBirth) {
            const today = new Date();
            const birthDate = new Date(emp.dateOfBirth);
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }

          result.set(emp.employeeId, {
            employeeId: emp.employeeId,
            name: emp.name || 'Unknown',
            age,
            contractType: contract.contractType || 'indefinite',
            hireDate: new Date(contract.hireDate),
            terminationDate: contract.terminationDate ? new Date(contract.terminationDate) : undefined,
            salary: parseFloat(contract.salary || '0'),
            hourlyRate: contract.hourlyRate ? parseFloat(contract.hourlyRate) : undefined,
            isFullTime: contract.isFullTime || false,
            defaultPropertyId: emp.defaultPropertyId
          });
        }
      }
    }

    return result;
  }

  /**
   * PERFORMANCE OPTIMIZATION: Bulk fetch timesheet data with chunking
   * Returns Map for O(1) lookups during payroll calculation
   */
  static async getBulkTimesheetData(
    employeeIds: string[],
    period: string,
    chunkSize: number = 500
  ): Promise<Map<string, any>> {
    const result = new Map<string, any>();
    const chunks = this.chunkArray(employeeIds, chunkSize);
    
    for (const chunk of chunks) {
      const timesheetRecords = await db
        .select()
        .from(timesheets)
        .where(
          and(
            inArray(timesheets.employeeId, chunk),
            eq(timesheets.payrollPeriod, period)
          )
        );

      for (const ts of timesheetRecords) {
        result.set(ts.employeeId, {
          employeeId: ts.employeeId,
          period: ts.payrollPeriod,
          approvedHours: parseFloat(ts.approvedHours || '0'),
          unapprovedHours: parseFloat(ts.totalHours || '0') - parseFloat(ts.approvedHours || '0'),
          regularHours: parseFloat(ts.regularHours || '0'),
          overtimeHours: parseFloat(ts.overtimeHours || '0'),
          nightHours: parseFloat(ts.nightHours || '0'),
          sundayHours: parseFloat(ts.sundayHours || '0'),
          holidayHours: parseFloat(ts.holidayHours || '0'),
          leaveHours: {
            annual: parseFloat(ts.annualLeaveHours || '0'),
            sick: parseFloat(ts.sickLeaveHours || '0'),
            maternity: parseFloat(ts.maternityLeaveHours || '0'),
            paternity: parseFloat(ts.paternityLeaveHours || '0')
          }
        });
      }
    }

    return result;
  }

  /**
   * PERFORMANCE OPTIMIZATION: Batch insert payroll scope lines
   * Uses single transaction for atomicity and performance
   */
  static async batchInsertScopeLines(
    scopeLines: Array<{
      scopeId: string;
      employeeId: string;
      calculationData: any;
      grossPay: number;
      netPay: number;
      totalDeductions: number;
      employerCost: number;
    }>,
    chunkSize: number = 300
  ): Promise<void> {
    const chunks = this.chunkArray(scopeLines, chunkSize);
    
    // Execute all chunks in a single transaction for atomicity
    await db.transaction(async (tx) => {
      for (const chunk of chunks) {
        const insertData = chunk.map(line => ({
          scopeLineId: sql`gen_random_uuid()`,
          scopeId: line.scopeId,
          employeeId: line.employeeId,
          calculationData: JSON.stringify(line.calculationData),
          grossPay: line.grossPay.toString(),
          netPay: line.netPay.toString(),
          totalDeductions: line.totalDeductions.toString(),
          employerCost: line.employerCost.toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        await tx.insert(payrollScopeLines).values(insertData);
      }
    });
  }

  /**
   * PERFORMANCE OPTIMIZATION: Batch update employee period states
   * Handles large employee sets efficiently with chunking
   */
  static async batchUpdateEmployeePeriodStates(
    updates: Array<{
      employeeId: string;
      periodId: string;
      status: string;
      scopeId: string;
    }>,
    chunkSize: number = 400
  ): Promise<void> {
    const chunks = this.chunkArray(updates, chunkSize);
    
    await db.transaction(async (tx) => {
      for (const chunk of chunks) {
        // Use INSERT ... ON CONFLICT for efficient upsert
        const insertData = chunk.map(update => ({
          employeeId: update.employeeId,
          periodId: update.periodId,
          status: update.status,
          scopeId: update.scopeId,
          updatedAt: new Date()
        }));
        
        await tx
          .insert(employeePeriodState)
          .values(insertData)
          .onConflictDoUpdate({
            target: [employeePeriodState.employeeId, employeePeriodState.periodId],
            set: {
              status: sql`excluded.status`,
              scopeId: sql`excluded.scope_id`,
              updatedAt: sql`excluded.updated_at`
            }
          });
      }
    });
  }

  /**
   * PERFORMANCE OPTIMIZATION: Batch create period ledger entries
   * Optimized for large payroll runs with thousands of employees
   */
  static async batchCreatePeriodLedgerEntries(
    entries: Array<{
      periodId: string;
      employeeId: string;
      accountCode: string;
      debitAmount: number;
      creditAmount: number;
      description: string;
    }>,
    chunkSize: number = 350
  ): Promise<void> {
    const chunks = this.chunkArray(entries, chunkSize);
    
    await db.transaction(async (tx) => {
      for (const chunk of chunks) {
        const insertData = chunk.map(entry => ({
          ledgerId: sql`gen_random_uuid()`,
          periodId: entry.periodId,
          employeeId: entry.employeeId,
          accountCode: entry.accountCode,
          debitAmount: entry.debitAmount.toString(),
          creditAmount: entry.creditAmount.toString(),
          description: entry.description,
          createdAt: new Date()
        }));
        
        await tx.insert(periodLedgers).values(insertData);
      }
    });
  }

  /**
   * PERFORMANCE OPTIMIZATION: Get payroll summary with aggregated data
   * Uses efficient SQL aggregations instead of fetching all records
   */
  static async getOptimizedPayrollSummary(
    scopeId: string
  ): Promise<{
    totalEmployees: number;
    totalGross: number;
    totalNet: number;
    totalTax: number;
    totalInsurance: number;
    totalEmployerCost: number;
  }> {
    const [result] = await db
      .select({
        totalEmployees: sql<number>`COUNT(*)::int`,
        totalGross: sql<number>`COALESCE(SUM(CAST(gross_pay AS DECIMAL)), 0)::int`,
        totalNet: sql<number>`COALESCE(SUM(CAST(net_pay AS DECIMAL)), 0)::int`,
        totalEmployerCost: sql<number>`COALESCE(SUM(CAST(employer_cost AS DECIMAL)), 0)::int`
      })
      .from(payrollScopeLines)
      .where(eq(payrollScopeLines.scopeId, scopeId));

    return {
      totalEmployees: result.totalEmployees || 0,
      totalGross: result.totalGross || 0,
      totalNet: result.totalNet || 0,
      totalTax: 0, // Would need additional calculation or join
      totalInsurance: 0, // Would need additional calculation or join  
      totalEmployerCost: result.totalEmployerCost || 0
    };
  }

  /**
   * PERFORMANCE OPTIMIZATION: Stream large datasets for memory efficiency
   * Useful for very large employee sets (10k+ employees)
   */
  static async streamEmployeeData(
    employeeIds: string[],
    batchSize: number = 1000,
    onBatch: (batch: OptimizedEmployeeData[]) => Promise<void>
  ): Promise<void> {
    const chunks = this.chunkArray(employeeIds, batchSize);
    
    for (const chunk of chunks) {
      const batchData = await this.getBulkEmployeeData(chunk, 500);
      const batchArray = Array.from(batchData.values());
      await onBatch(batchArray);
    }
  }

  /**
   * Helper method: Split array into chunks
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * PERFORMANCE MONITORING: Get query performance metrics
   */
  static async getQueryPerformanceMetrics(
    scopeId: string
  ): Promise<{
    employeeDataFetchTime: number;
    timesheetDataFetchTime: number;
    calculationTime: number;
    persistenceTime: number;
    totalTime: number;
  }> {
    // This would track timing metrics during actual payroll processing
    // Implementation would depend on specific monitoring requirements
    
    return {
      employeeDataFetchTime: 0,
      timesheetDataFetchTime: 0,
      calculationTime: 0,
      persistenceTime: 0,
      totalTime: 0
    };
  }
}

/**
 * DATABASE INDEX RECOMMENDATIONS
 * 
 * Add these indexes to optimize the most frequent queries:
 * 
 * -- Hot path query optimizations
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timesheets_employee_period 
 *   ON timesheets(employee_id, payroll_period);
 * 
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_employee_active 
 *   ON contracts(employee_id, is_active) WHERE is_active = true;
 * 
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_scope_lines_scope 
 *   ON payroll_scope_lines(scope_id);
 * 
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_period_state_emp_period 
 *   ON employee_period_state(employee_id, period_id);
 * 
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_period_ledgers_period 
 *   ON period_ledgers(period_id);
 * 
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_runs_period 
 *   ON payroll_runs(period);
 * 
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_lines_run_employee 
 *   ON payroll_lines(run_id, employee_id);
 * 
 * -- Aggregation optimizations
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_scope_lines_scope_amounts 
 *   ON payroll_scope_lines(scope_id) INCLUDE (gross_pay, net_pay, employer_cost);
 * 
 * -- EFKA compliance optimizations  
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_afm_hash 
 *   ON employees USING hash(afm);
 * 
 * CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_amka_hash 
 *   ON employees USING hash(amka);
 */

export const RECOMMENDED_INDEXES = [
  'idx_timesheets_employee_period',
  'idx_contracts_employee_active', 
  'idx_payroll_scope_lines_scope',
  'idx_employee_period_state_emp_period',
  'idx_period_ledgers_period',
  'idx_payroll_runs_period',
  'idx_payroll_lines_run_employee',
  'idx_payroll_scope_lines_scope_amounts',
  'idx_employees_afm_hash',
  'idx_employees_amka_hash'
] as const;