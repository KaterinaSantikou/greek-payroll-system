/**
 * Payroll Repository - Infrastructure Layer
 * 
 * Handles all database access for payroll operations.
 * Provides clean interface for business layer to access data.
 */

import { db } from "../db";
import { 
  payrollScopes,
  employeePeriodState,
  periodLedgers,
  payrollScopeLines,
  paymentBatches,
  employees,
  contracts,
  timesheets,
  payrollRuns,
  payrollLines,
  type PayrollScope,
  type Employee,
  type Contract,
  type Timesheet,
  type PayrollRun,
  type PayrollLine,
  type InsertEmployeePeriodState,
  type InsertPeriodLedger,
  type InsertPayrollScopeLine,
  type InsertPaymentBatch
} from "@shared/schema";
import { eq, and, inArray, sql, desc, like } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface EmployeePayrollInfo {
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
}

export interface TimesheetData {
  employeeId: string;
  period: string;
  approvedHours: number;
  unapprovedHours: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  sundayHours: number;
  holidayHours: number;
  leaveHours?: {
    annual?: number;
    sick?: number;
    maternity?: number;
    paternity?: number;
  };
}

export interface PayrollScopeData {
  scopeId: string;
  period: string;
  scopeType: 'regular' | 'termination' | 'bonus';
  selectedEmployees: string[];
  status: 'draft' | 'calculated' | 'approved' | 'finalized';
  createdAt: Date;
  createdBy: string;
  calculationHash?: string;
  totalGross?: number;
  totalNet?: number;
  totalTax?: number;
  totalInsurance?: number;
}

export interface PayrollCalculationPersistence {
  calculationId: string;
  employeeId: string;
  periodId: string;
  baseSalary: number;
  grossPay: number;
  netPay: number;
  totalDeductions: number;
  incomeTax: number;
  solidarityTax: number;
  employeeEfkaMain: number;
  employeeEfkaAux: number;
  employeeUnemployment: number;
  employerEfkaMain: number;
  employerEfkaAux: number;
  employerUnemployment: number;
  employerSickness: number;
  employerWorkAccident: number;
  totalEmployerCost: number;
  calculationData: Record<string, any>; // Store full calculation details as JSON
  calculatedAt: Date;
  calculationVersion: string;
}

export class PayrollRepository {

  /**
   * Get employee information for payroll processing
   * PERFORMANCE OPTIMIZED: Now uses bulk operations and Map lookups
   */
  async getEmployeePayrollInfo(employeeIds: string[]): Promise<EmployeePayrollInfo[]> {
    // Use optimized bulk fetch for large datasets
    if (employeeIds.length > 100) {
      const { DatabaseOptimizations } = await import('./database-optimizations');
      const employeeMap = await DatabaseOptimizations.getBulkEmployeeData(employeeIds);
      return Array.from(employeeMap.values());
    }
    
    // Fallback to original implementation for small datasets
    const employeeData = await db
      .select({
        employeeId: employees.employeeId,
        name: employees.name,
        dateOfBirth: employees.dateOfBirth,
        defaultPropertyId: employees.defaultPropertyId
      })
      .from(employees)
      .where(inArray(employees.employeeId, employeeIds));

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
          inArray(contracts.employeeId, employeeIds),
          eq(contracts.isActive, true)
        )
      );

    // PERFORMANCE OPTIMIZATION: Use Map for O(1) contract lookups instead of O(n) Array.find()
    const contractMap = new Map(contractData.map(c => [c.employeeId, c]));
    const result: EmployeePayrollInfo[] = [];
    
    for (const emp of employeeData) {
      const contract = contractMap.get(emp.employeeId);
      if (contract) {
        // Calculate age if birth date available
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

        result.push({
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

    return result;
  }

  /**
   * Get timesheet data for employees in a period  
   * PERFORMANCE OPTIMIZED: Uses bulk operations for large employee sets
   */
  async getTimesheetData(employeeIds: string[], period: string): Promise<TimesheetData[]> {
    // Use optimized bulk fetch for large datasets
    if (employeeIds.length > 100) {
      const { DatabaseOptimizations } = await import('./database-optimizations');
      const timesheetMap = await DatabaseOptimizations.getBulkTimesheetData(employeeIds, period);
      return Array.from(timesheetMap.values());
    }
    
    // Fallback to original implementation for small datasets
    const timesheetRecords = await db
      .select()
      .from(timesheets)
      .where(
        and(
          inArray(timesheets.employeeId, employeeIds),
          eq(timesheets.payrollPeriod, period)
        )
      );

    return timesheetRecords.map(ts => ({
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
    }));
  }

  /**
   * Create payroll scope
   */
  async createPayrollScope(scopeData: PayrollScopeData): Promise<PayrollScope> {
    const [scope] = await db
      .insert(payrollScopes)
      .values({
        scopeId: scopeData.scopeId,
        period: scopeData.period,
        scopeType: scopeData.scopeType,
        selectedEmployees: JSON.stringify(scopeData.selectedEmployees),
        status: scopeData.status,
        createdAt: scopeData.createdAt,
        createdBy: scopeData.createdBy,
        calculationHash: scopeData.calculationHash,
        totalGross: scopeData.totalGross?.toString(),
        totalNet: scopeData.totalNet?.toString(),
        totalTax: scopeData.totalTax?.toString(),
        totalInsurance: scopeData.totalInsurance?.toString()
      })
      .returning();

    return scope;
  }

  /**
   * Update payroll scope
   */
  async updatePayrollScope(
    scopeId: string, 
    updates: Partial<PayrollScopeData>
  ): Promise<PayrollScope | null> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.status) updateData.status = updates.status;
    if (updates.calculationHash) updateData.calculationHash = updates.calculationHash;
    if (updates.totalGross !== undefined) updateData.totalGross = updates.totalGross.toString();
    if (updates.totalNet !== undefined) updateData.totalNet = updates.totalNet.toString();
    if (updates.totalTax !== undefined) updateData.totalTax = updates.totalTax.toString();
    if (updates.totalInsurance !== undefined) updateData.totalInsurance = updates.totalInsurance.toString();

    const [scope] = await db
      .update(payrollScopes)
      .set(updateData)
      .where(eq(payrollScopes.scopeId, scopeId))
      .returning();

    return scope || null;
  }

  /**
   * Get payroll scope by ID
   */
  async getPayrollScope(scopeId: string): Promise<PayrollScope | null> {
    const [scope] = await db
      .select()
      .from(payrollScopes)
      .where(eq(payrollScopes.scopeId, scopeId));

    return scope || null;
  }

  /**
   * Get payroll scopes by period
   */
  async getPayrollScopesByPeriod(period: string): Promise<PayrollScope[]> {
    return await db
      .select()
      .from(payrollScopes)
      .where(eq(payrollScopes.period, period))
      .orderBy(desc(payrollScopes.createdAt));
  }

  /**
   * Save payroll calculations
   */
  async savePayrollCalculations(calculations: PayrollCalculationPersistence[]): Promise<void> {
    for (const calc of calculations) {
      await db
        .insert(employeePeriodState)
        .values({
          stateId: calc.calculationId,
          employeeId: calc.employeeId,
          periodId: calc.periodId,
          grossPay: calc.grossPay.toString(),
          netPay: calc.netPay.toString(),
          totalDeductions: calc.totalDeductions.toString(),
          calculatedAt: calc.calculatedAt,
          calculationData: JSON.stringify(calc.calculationData),
          calculationVersion: calc.calculationVersion
        })
        .onConflictDoUpdate({
          target: [employeePeriodState.employeeId, employeePeriodState.periodId],
          set: {
            grossPay: calc.grossPay.toString(),
            netPay: calc.netPay.toString(),
            totalDeductions: calc.totalDeductions.toString(),
            calculatedAt: calc.calculatedAt,
            calculationData: JSON.stringify(calc.calculationData),
            calculationVersion: calc.calculationVersion
          }
        });
    }
  }

  /**
   * Get payroll calculations for a period
   */
  async getPayrollCalculations(
    employeeIds: string[], 
    period: string
  ): Promise<PayrollCalculationPersistence[]> {
    const calculations = await db
      .select()
      .from(employeePeriodState)
      .where(
        and(
          inArray(employeePeriodState.employeeId, employeeIds),
          eq(employeePeriodState.periodId, period)
        )
      );

    return calculations.map(calc => ({
      calculationId: calc.stateId,
      employeeId: calc.employeeId,
      periodId: calc.periodId,
      baseSalary: 0, // Would need to extract from calculationData
      grossPay: parseFloat(calc.grossPay || '0'),
      netPay: parseFloat(calc.netPay || '0'),
      totalDeductions: parseFloat(calc.totalDeductions || '0'),
      incomeTax: 0, // Would need to extract from calculationData
      solidarityTax: 0,
      employeeEfkaMain: 0,
      employeeEfkaAux: 0,
      employeeUnemployment: 0,
      employerEfkaMain: 0,
      employerEfkaAux: 0,
      employerUnemployment: 0,
      employerSickness: 0,
      employerWorkAccident: 0,
      totalEmployerCost: 0,
      calculationData: calc.calculationData ? JSON.parse(calc.calculationData) : {},
      calculatedAt: calc.calculatedAt || new Date(),
      calculationVersion: calc.calculationVersion || '1.0'
    }));
  }

  /**
   * Check if finalized payroll run exists for period
   */
  async hasExistingFinalizedRun(period: string): Promise<boolean> {
    const [run] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payrollRuns)
      .where(
        and(
          eq(payrollRuns.period, period),
          eq(payrollRuns.status, 'finalized')
        )
      );

    return (run?.count || 0) > 0;
  }

  /**
   * Get payroll runs with pagination
   */
  async getPayrollRuns(
    filters: {
      period?: string;
      status?: string;
      runType?: string;
    } = {},
    pagination: {
      limit: number;
      offset: number;
    } = { limit: 20, offset: 0 }
  ): Promise<PayrollRun[]> {
    let query = db.select().from(payrollRuns);
    
    const conditions = [];
    if (filters.period) {
      conditions.push(eq(payrollRuns.period, filters.period));
    }
    if (filters.status) {
      conditions.push(eq(payrollRuns.status, filters.status));
    }
    if (filters.runType) {
      conditions.push(eq(payrollRuns.runType, filters.runType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query
      .limit(pagination.limit)
      .offset(pagination.offset)
      .orderBy(desc(payrollRuns.createdAt));
  }

  /**
   * Get payroll run with lines
   */
  async getPayrollRunWithLines(runId: string): Promise<{
    run: PayrollRun | null;
    lines: PayrollLine[];
  }> {
    const [run] = await db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.id, runId));

    if (!run) {
      return { run: null, lines: [] };
    }

    const lines = await db
      .select()
      .from(payrollLines)
      .where(eq(payrollLines.payrollRunId, runId));

    return { run, lines };
  }

  /**
   * Create payroll run
   */
  async createPayrollRun(runData: {
    id: string;
    period: string;
    runType: 'regular' | 'off_cycle' | 'correction' | 'bonus';
    payDate: string;
    description?: string;
    status: 'draft' | 'calculated' | 'approved' | 'finalized';
    createdBy: string;
  }): Promise<PayrollRun> {
    const [run] = await db
      .insert(payrollRuns)
      .values({
        id: runData.id,
        period: runData.period,
        runType: runData.runType,
        payDate: runData.payDate,
        description: runData.description,
        status: runData.status,
        createdBy: runData.createdBy,
        createdAt: new Date()
      })
      .returning();

    return run;
  }

  /**
   * Update payroll run status
   */
  async updatePayrollRunStatus(
    runId: string, 
    status: 'draft' | 'calculated' | 'approved' | 'finalized',
    approvedBy?: string,
    approvalNotes?: string
  ): Promise<PayrollRun | null> {
    const updateData: Record<string, unknown> = { 
      status,
      updatedAt: new Date()
    };
    
    if (approvedBy) updateData.approvedBy = approvedBy;
    if (approvalNotes) updateData.approvalNotes = approvalNotes;

    const [run] = await db
      .update(payrollRuns)
      .set(updateData)
      .where(eq(payrollRuns.id, runId))
      .returning();

    return run || null;
  }

  /**
   * Save payroll lines for a run
   */
  async savePayrollLines(runId: string, lines: Array<{
    employeeId: string;
    grossAmount: number;
    netAmount: number;
    taxAmount: number;
    efkaAmount: number;
    lineType?: string;
    description?: string;
  }>): Promise<void> {
    const payrollLineData = lines.map(line => ({
      id: nanoid(),
      payrollRunId: runId,
      employeeId: line.employeeId,
      grossAmount: line.grossAmount.toString(),
      netAmount: line.netAmount.toString(),
      taxAmount: line.taxAmount.toString(),
      efkaAmount: line.efkaAmount.toString(),
      lineType: line.lineType,
      description: line.description,
      createdAt: new Date()
    }));

    await db.insert(payrollLines).values(payrollLineData);
  }
}

// Export singleton instance
export const payrollRepository = new PayrollRepository();