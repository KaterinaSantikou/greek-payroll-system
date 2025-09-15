/**
 * Payroll Repository Service - Infrastructure Layer
 * 
 * Concrete implementation of RepositoryPort that handles database operations
 * for payroll data. This is the Infrastructure layer of the 3-layer architecture.
 */

import { 
  RepositoryPort,
  Employee,
  WorkingHours,
  PayrollScope,
  PayrollCalculationResult,
  PayrollDomainError
} from '../shared/payrollDomain.js';

import { db } from '../server/db.js';
import { 
  employees, 
  timesheets, 
  payrollScopes,
  payrollResults 
} from '../shared/schema.js';
import { eq, inArray, and, between } from 'drizzle-orm';

// =============================================================================
// PAYROLL REPOSITORY SERVICE IMPLEMENTATION
// =============================================================================

export class PayrollRepositoryService implements RepositoryPort {
  
  constructor(private database = db) {}

  // =============================================================================
  // EMPLOYEE DATA METHODS
  // =============================================================================

  /**
   * Get employee payroll information for calculations
   */
  async getEmployeePayrollInfo(employeeIds: string[]): Promise<Employee[]> {
    try {
      if (employeeIds.length === 0) {
        return [];
      }

      const employeeData = await this.database
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          phone: employees.phone,
          dateOfBirth: employees.dateOfBirth,
          afm: employees.afm,
          amka: employees.amka,
          employeeNumber: employees.employeeNumber,
          department: employees.department,
          position: employees.position,
          contractType: employees.contractType,
          employmentType: employees.employmentType,
          hireDate: employees.hireDate,
          terminationDate: employees.terminationDate,
          isActive: employees.isActive,
          baseSalary: employees.baseSalary,
          hourlyRate: employees.hourlyRate,
          paymentMethod: employees.paymentMethod,
          bankAccount: employees.bankAccount
        })
        .from(employees)
        .where(inArray(employees.id, employeeIds));

      // Transform database records to domain objects
      return employeeData.map(emp => ({
        id: emp.id,
        personalInfo: {
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email || undefined,
          phone: emp.phone || undefined,
          dateOfBirth: emp.dateOfBirth || undefined
        },
        taxIdentifiers: {
          afm: emp.afm,
          amka: emp.amka
        },
        employment: {
          employeeNumber: emp.employeeNumber,
          department: emp.department,
          position: emp.position,
          contractType: emp.contractType as any, // Convert enum
          employmentType: emp.employmentType as any, // Convert enum
          hireDate: emp.hireDate,
          terminationDate: emp.terminationDate || undefined,
          isActive: emp.isActive
        },
        compensation: {
          baseSalary: emp.baseSalary,
          hourlyRate: emp.hourlyRate || undefined,
          paymentMethod: emp.paymentMethod as any, // Convert enum
          bankAccount: emp.bankAccount || undefined
        }
      }));

    } catch (error) {
      throw new PayrollDomainError(
        'REPOSITORY_ERROR',
        'employeeData',
        `Failed to fetch employee payroll info: ${error instanceof Error ? error.message : String(error)}`,
        { employeeIds, originalError: error }
      );
    }
  }

  // =============================================================================
  // TIMESHEET DATA METHODS
  // =============================================================================

  /**
   * Get timesheet data for payroll period
   */
  async getTimesheetData(employeeIds: string[], period: string): Promise<WorkingHours[]> {
    try {
      if (employeeIds.length === 0) {
        return [];
      }

      // Parse period (expecting YYYY-MM format)
      const [year, month] = period.split('-').map(Number);
      if (!year || !month || month < 1 || month > 12) {
        throw new Error(`Invalid period format: ${period}. Expected YYYY-MM`);
      }

      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0); // Last day of month

      const timesheetData = await this.database
        .select({
          employeeId: timesheets.employeeId,
          regularHours: timesheets.regularHours,
          overtimeHours: timesheets.overtimeHours,
          nightHours: timesheets.nightHours,
          sundayHours: timesheets.sundayHours,
          holidayHours: timesheets.holidayHours
        })
        .from(timesheets)
        .where(
          and(
            inArray(timesheets.employeeId, employeeIds),
            between(timesheets.workDate, periodStart, periodEnd)
          )
        );

      // Aggregate hours by employee
      const hoursMap = new Map<string, WorkingHours>();

      // Initialize all employees with zero hours
      for (const employeeId of employeeIds) {
        hoursMap.set(employeeId, {
          regularHours: 0,
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0
        });
      }

      // Sum hours for each employee
      for (const record of timesheetData) {
        const existing = hoursMap.get(record.employeeId);
        if (existing) {
          existing.regularHours += record.regularHours || 0;
          existing.overtimeHours += record.overtimeHours || 0;
          existing.nightHours += record.nightHours || 0;
          existing.sundayHours += record.sundayHours || 0;
          existing.holidayHours += record.holidayHours || 0;
        }
      }

      return Array.from(hoursMap.values());

    } catch (error) {
      throw new PayrollDomainError(
        'REPOSITORY_ERROR',
        'timesheetData',
        `Failed to fetch timesheet data: ${error instanceof Error ? error.message : String(error)}`,
        { employeeIds, period, originalError: error }
      );
    }
  }

  // =============================================================================
  // PAYROLL SCOPE METHODS
  // =============================================================================

  /**
   * Get payroll scope by ID
   */
  async getPayrollScope(scopeId: string): Promise<PayrollScope | null> {
    try {
      const scopeData = await this.database
        .select({
          scopeId: payrollScopes.scopeId,
          period: payrollScopes.period,
          selectedEmployeeIds: payrollScopes.selectedEmployeeIds,
          status: payrollScopes.status,
          createdBy: payrollScopes.createdBy,
          createdAt: payrollScopes.createdAt,
          computedAt: payrollScopes.computedAt,
          approvedAt: payrollScopes.approvedAt,
          employeeCount: payrollScopes.employeeCount,
          totalGrossAmount: payrollScopes.totalGrossAmount,
          totalNetAmount: payrollScopes.totalNetAmount,
          computationHash: payrollScopes.computationHash
        })
        .from(payrollScopes)
        .where(eq(payrollScopes.scopeId, scopeId))
        .limit(1);

      if (scopeData.length === 0) {
        return null;
      }

      const scope = scopeData[0];
      return {
        scopeId: scope.scopeId,
        period: scope.period,
        selectedEmployeeIds: scope.selectedEmployeeIds,
        status: scope.status as any, // Convert enum
        createdBy: scope.createdBy,
        createdAt: scope.createdAt,
        computedAt: scope.computedAt || undefined,
        approvedAt: scope.approvedAt || undefined,
        employeeCount: scope.employeeCount || undefined,
        totalGrossAmount: scope.totalGrossAmount || undefined,
        totalNetAmount: scope.totalNetAmount || undefined,
        computationHash: scope.computationHash || undefined
      };

    } catch (error) {
      throw new PayrollDomainError(
        'REPOSITORY_ERROR',
        'payrollScope',
        `Failed to fetch payroll scope: ${error instanceof Error ? error.message : String(error)}`,
        { scopeId, originalError: error }
      );
    }
  }

  // =============================================================================
  // PAYROLL RESULTS METHODS
  // =============================================================================

  /**
   * Save payroll calculation results
   */
  async savePayrollResults(scopeId: string, results: PayrollCalculationResult[]): Promise<void> {
    try {
      if (results.length === 0) {
        return;
      }

      // Use transaction for data consistency
      await this.database.transaction(async (tx) => {
        // Delete existing results for this scope
        await tx
          .delete(payrollResults)
          .where(eq(payrollResults.scopeId, scopeId));

        // Insert new results
        const resultRecords = results.map(result => ({
          scopeId,
          employeeId: result.employeeId,
          periodId: result.periodId,
          calculationDate: result.calculationDate,
          calculationVersion: result.calculationVersion,
          lawVersionId: result.lawVersionId,
          
          // Earnings
          baseSalary: result.baseSalary,
          regularPay: result.regularPay,
          overtimeAmount: result.overtimeAmount,
          nightPremium: result.nightPremium,
          sundayPremium: result.sundayPremium,
          holidayPremium: result.holidayPremium,
          totalAllowances: result.totalAllowances,
          allowancesBreakdown: result.allowancesBreakdown,
          christmasBonus: result.christmasBonus,
          easterBonus: result.easterBonus,
          vacationBonus: result.vacationBonus,
          totalBonuses: result.totalBonuses,
          annualLeavePay: result.annualLeavePay,
          sickLeavePay: result.sickLeavePay,
          maternityLeavePay: result.maternityLeavePay,
          paternityLeavePay: result.paternityLeavePay,
          totalLeavePay: result.totalLeavePay,
          taxFreeBenefits: result.taxFreeBenefits,
          taxableBenefits: result.taxableBenefits,
          imputedIncome: result.imputedIncome,
          totalTips: result.totalTips,
          tipsTax: result.tipsTax,
          netTips: result.netTips,
          grossPay: result.grossPay,
          taxableIncome: result.taxableIncome,
          
          // Deductions
          incomeTax: result.incomeTax,
          solidarityTax: result.solidarityTax,
          employeeEfkaMain: result.employeeEfkaMain,
          employeeEfkaAux: result.employeeEfkaAux,
          employeeUnemployment: result.employeeUnemployment,
          totalDeductions: result.totalDeductions,
          
          // Employer costs
          employerEfkaMain: result.employerEfkaMain,
          employerEfkaAux: result.employerEfkaAux,
          employerUnemployment: result.employerUnemployment,
          employerSickness: result.employerSickness,
          employerWorkAccident: result.employerWorkAccident,
          totalEmployerCost: result.totalEmployerCost,
          
          // Final amounts
          netPay: result.netPay,
          
          // Metadata
          capConsumption: result.capConsumption || {},
          formattedValues: result.formatted || {}
        }));

        await tx.insert(payrollResults).values(resultRecords);

        // Update payroll scope with summary data
        const totalGross = results.reduce((sum, r) => sum + r.grossPay, 0);
        const totalNet = results.reduce((sum, r) => sum + r.netPay, 0);
        
        await tx
          .update(payrollScopes)
          .set({
            computedAt: new Date(),
            employeeCount: results.length,
            totalGrossAmount: totalGross.toFixed(2),
            totalNetAmount: totalNet.toFixed(2),
            status: 'calculated'
          })
          .where(eq(payrollScopes.scopeId, scopeId));
      });

    } catch (error) {
      throw new PayrollDomainError(
        'REPOSITORY_ERROR',
        'saveResults',
        `Failed to save payroll results: ${error instanceof Error ? error.message : String(error)}`,
        { scopeId, resultCount: results.length, originalError: error }
      );
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get payroll results for a scope
   */
  async getPayrollResults(scopeId: string): Promise<PayrollCalculationResult[]> {
    try {
      const resultData = await this.database
        .select()
        .from(payrollResults)
        .where(eq(payrollResults.scopeId, scopeId));

      return resultData.map(result => ({
        employeeId: result.employeeId,
        periodId: result.periodId,
        calculationDate: result.calculationDate,
        calculationVersion: result.calculationVersion,
        lawVersionId: result.lawVersionId,
        
        // Earnings
        baseSalary: result.baseSalary,
        regularPay: result.regularPay,
        overtimeAmount: result.overtimeAmount,
        nightPremium: result.nightPremium,
        sundayPremium: result.sundayPremium,
        holidayPremium: result.holidayPremium,
        totalAllowances: result.totalAllowances,
        allowancesBreakdown: result.allowancesBreakdown || {},
        christmasBonus: result.christmasBonus,
        easterBonus: result.easterBonus,
        vacationBonus: result.vacationBonus,
        totalBonuses: result.totalBonuses,
        annualLeavePay: result.annualLeavePay,
        sickLeavePay: result.sickLeavePay,
        maternityLeavePay: result.maternityLeavePay,
        paternityLeavePay: result.paternityLeavePay,
        totalLeavePay: result.totalLeavePay,
        taxFreeBenefits: result.taxFreeBenefits,
        taxableBenefits: result.taxableBenefits,
        imputedIncome: result.imputedIncome,
        totalTips: result.totalTips,
        tipsTax: result.tipsTax,
        netTips: result.netTips,
        grossPay: result.grossPay,
        taxableIncome: result.taxableIncome,
        
        // Deductions
        incomeTax: result.incomeTax,
        solidarityTax: result.solidarityTax,
        employeeEfkaMain: result.employeeEfkaMain,
        employeeEfkaAux: result.employeeEfkaAux,
        employeeUnemployment: result.employeeUnemployment,
        totalDeductions: result.totalDeductions,
        
        // Employer costs
        employerEfkaMain: result.employerEfkaMain,
        employerEfkaAux: result.employerEfkaAux,
        employerUnemployment: result.employerUnemployment,
        employerSickness: result.employerSickness,
        employerWorkAccident: result.employerWorkAccident,
        totalEmployerCost: result.totalEmployerCost,
        
        // Final amounts
        netPay: result.netPay,
        
        // Metadata
        capConsumption: result.capConsumption || {},
        formatted: result.formattedValues || {}
      } as PayrollCalculationResult));

    } catch (error) {
      throw new PayrollDomainError(
        'REPOSITORY_ERROR',
        'getResults',
        `Failed to fetch payroll results: ${error instanceof Error ? error.message : String(error)}`,
        { scopeId, originalError: error }
      );
    }
  }

  /**
   * Check database connectivity
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      // Simple query to test database connectivity
      await this.database.select({ count: employees.id }).from(employees).limit(1);
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : String(error) 
      };
    }
  }
}