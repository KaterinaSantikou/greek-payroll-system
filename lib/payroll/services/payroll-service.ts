/**
 * Payroll Service - High-level Business Operations
 *
 * Orchestrates payroll processing using calculator and validator.
 * No database access - delegates to infrastructure layer.
 */

import {
  payrollCalculator,
  type PayrollCalculationInput,
  type PayrollCalculationResult,
} from '../calculators/payroll-calculator';
import {
  payrollValidator,
  type ScopeValidation,
  type ValidationError,
} from '../calculators/payroll-validator';

export interface PayrollScope {
  scopeId: string;
  period: string;
  scopeType: 'regular' | 'termination' | 'bonus';
  selectedEmployees: string[];
  status: 'draft' | 'calculated' | 'approved' | 'finalized';
  createdAt: Date;
  createdBy: string;
}

export interface PayrollProcessingOptions {
  requireApprovedTimesheets?: boolean;
  calculateTerminalBenefits?: boolean;
  includeAllowances?: boolean;
  includeDeductions?: boolean;
  dryRun?: boolean;
}

export interface PayrollProcessingResult {
  success: boolean;
  scopeId: string;
  employeesProcessed: number;
  calculations: PayrollCalculationResult[];
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalInsurance: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  metadata: {
    processingTime: number;
    calculationHash: string;
  };
}

export interface EmployeePayrollData {
  employeeId: string;
  age?: number;
  contractType: string;
  hireDate: Date;
  terminationDate?: Date;
  salary: number;
  hourlyRate?: number;
  isFullTime: boolean;
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
  allowances?: {
    food?: number;
    transport?: number;
    housing?: number;
    marriage?: number;
    family?: number;
    education?: number;
    experience?: number;
    position?: number;
  };
  tips?: number;
  benefitsInKind?: {
    mealVouchers?: number;
    companyCar?: number;
    housing?: number;
  };
}

export class PayrollService {
  /**
   * Validate payroll scope before processing
   */
  validatePayrollScope(
    employees: EmployeePayrollData[],
    period: string,
    options: PayrollProcessingOptions = {}
  ): ScopeValidation {
    const employeeValidationData = employees.map(emp => ({
      employeeId: emp.employeeId,
      age: emp.age,
      contractType: emp.contractType,
      hireDate: emp.hireDate,
      terminationDate: emp.terminationDate,
      salary: emp.salary,
      isFullTime: emp.isFullTime,
      approvedHours: emp.approvedHours,
      unapprovedHours: emp.unapprovedHours,
    }));

    return payrollValidator.validatePayrollScope(
      employeeValidationData,
      period,
      {
        requireApprovedTimesheets: options.requireApprovedTimesheets,
        hasExistingFinalizedRun: false, // This would be checked by infrastructure layer
      }
    );
  }

  /**
   * Process payroll calculations for a scope
   */
  processPayrollScope(
    scope: PayrollScope,
    employees: EmployeePayrollData[],
    options: PayrollProcessingOptions = {}
  ): PayrollProcessingResult {
    const startTime = Date.now();
    const calculations: PayrollCalculationResult[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate scope first
    const validation = this.validatePayrollScope(
      employees,
      scope.period,
      options
    );

    if (!validation.canCreateScope) {
      const criticalErrors = validation.overallErrors.filter(e => e.isCritical);
      return {
        success: false,
        scopeId: scope.scopeId,
        employeesProcessed: 0,
        calculations: [],
        totalGross: 0,
        totalNet: 0,
        totalTax: 0,
        totalInsurance: 0,
        errors: criticalErrors,
        warnings: validation.overallErrors.filter(e => !e.isCritical),
        metadata: {
          processingTime: Date.now() - startTime,
          calculationHash: '',
        },
      };
    }

    // PERFORMANCE OPTIMIZATION: Process employees in batches with limited concurrency
    const BATCH_SIZE = 300; // Process 300 employees at a time
    const employeeBatches = this.chunkArray(employees, BATCH_SIZE);
    
    for (const batch of employeeBatches) {
      // Process batch with limited concurrency (12 parallel calculations)
      const batchPromises = batch.map(async (employee) => {
        try {
          // Prepare calculation input
          const calculationInput: PayrollCalculationInput = {
          employeeId: employee.employeeId,
          periodId: scope.period,
          baseSalary: employee.salary,
          hourlyRate: employee.hourlyRate,
          regularHours: employee.regularHours,
          overtimeHours: employee.overtimeHours,
          nightHours: employee.nightHours,
          sundayHours: employee.sundayHours,
          holidayHours: employee.holidayHours,
          leaveHours: employee.leaveHours,
          allowances: options.includeAllowances
            ? employee.allowances
            : undefined,
          tips: employee.tips,
          benefitsInKind: employee.benefitsInKind,
          contractType: employee.contractType as
            | 'indefinite'
            | 'fixed-term'
            | 'seasonal',
          isFullTime: employee.isFullTime,
          employmentStartDate: employee.hireDate,
          periodStartDate: this.getPeriodStartDate(scope.period),
          periodEndDate: this.getPeriodEndDate(scope.period),
        };

          // Calculate payroll
          const calculation =
            payrollCalculator.calculatePayroll(calculationInput);
          return { success: true, calculation };
        } catch (error) {
          return {
            success: false,
            error: {
              field: `employee_${employee.employeeId}`,
              category: 'CALCULATION_ERROR',
              message: `Failed to calculate payroll for employee ${employee.employeeId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              isCritical: false,
            }
          };
        }
      });
      
      // Process batch with concurrency limit
      const batchResults = await this.processWithConcurrencyLimit(batchPromises, 12);
      
      // Collect results
      for (const result of batchResults) {
        if (result.success) {
          calculations.push(result.calculation!);
        } else {
          errors.push(result.error!);
        }
      }
    }

    // Calculate totals
    const totals = this.calculateTotals(calculations);

    // Generate calculation hash for verification
    const calculationHash = this.generateCalculationHash(calculations);

    return {
      success: errors.filter(e => e.isCritical).length === 0,
      scopeId: scope.scopeId,
      employeesProcessed: calculations.length,
      calculations,
      totalGross: totals.grossPay,
      totalNet: totals.netPay,
      totalTax: totals.totalTax,
      totalInsurance: totals.totalInsurance,
      errors,
      warnings,
      metadata: {
        processingTime: Date.now() - startTime,
        calculationHash,
      },
    };
  }

  /**
   * Calculate individual employee payroll
   */
  calculateEmployeePayroll(
    employee: EmployeePayrollData,
    period: string
  ): PayrollCalculationResult | null {
    try {
      const calculationInput: PayrollCalculationInput = {
        employeeId: employee.employeeId,
        periodId: period,
        baseSalary: employee.salary,
        hourlyRate: employee.hourlyRate,
        regularHours: employee.regularHours,
        overtimeHours: employee.overtimeHours,
        nightHours: employee.nightHours,
        sundayHours: employee.sundayHours,
        holidayHours: employee.holidayHours,
        leaveHours: employee.leaveHours,
        allowances: employee.allowances,
        tips: employee.tips,
        benefitsInKind: employee.benefitsInKind,
        contractType: employee.contractType as
          | 'indefinite'
          | 'fixed-term'
          | 'seasonal',
        isFullTime: employee.isFullTime,
        employmentStartDate: employee.hireDate,
        periodStartDate: this.getPeriodStartDate(period),
        periodEndDate: this.getPeriodEndDate(period),
      };

      return payrollCalculator.calculatePayroll(calculationInput);
    } catch (error) {
      console.error(
        `Failed to calculate payroll for employee ${employee.employeeId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Validate employee data for payroll processing
   */
  validateEmployee(employee: EmployeePayrollData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic validation
    if (!employee.employeeId) {
      errors.push({
        field: 'employeeId',
        category: 'FIELD_REQUIRED',
        message: 'Employee ID is required',
        isCritical: true,
      });
    }

    if (!employee.salary || employee.salary <= 0) {
      errors.push({
        field: 'salary',
        category: 'FIELD_REQUIRED',
        message: 'Valid salary is required',
        isCritical: true,
      });
    }

    if (!employee.contractType) {
      errors.push({
        field: 'contractType',
        category: 'FIELD_REQUIRED',
        message: 'Contract type is required',
        isCritical: true,
      });
    }

    // Business rule validation
    const eligibility = payrollValidator.validateEmployeeEligibility({
      employeeId: employee.employeeId,
      age: employee.age,
      contractType: employee.contractType,
      hireDate: employee.hireDate,
      terminationDate: employee.terminationDate,
    });

    errors.push(...eligibility.violations);

    // Salary validation
    const salaryErrors = payrollValidator.validateSalary(
      employee.employeeId,
      employee.salary,
      employee.contractType,
      employee.isFullTime
    );
    errors.push(...salaryErrors);

    return errors;
  }

  /**
   * Calculate aggregate totals from individual calculations
   */
  private calculateTotals(calculations: PayrollCalculationResult[]): {
    grossPay: number;
    netPay: number;
    totalTax: number;
    totalInsurance: number;
  } {
    return calculations.reduce(
      (totals, calc) => ({
        grossPay: totals.grossPay + calc.grossPay,
        netPay: totals.netPay + calc.netPay,
        totalTax: totals.totalTax + calc.incomeTax + calc.solidarityTax,
        totalInsurance:
          totals.totalInsurance +
          calc.employeeEfkaMain +
          calc.employeeEfkaAux +
          calc.employeeUnemployment,
      }),
      { grossPay: 0, netPay: 0, totalTax: 0, totalInsurance: 0 }
    );
  }

  /**
   * Generate hash for calculation verification
   */
  private generateCalculationHash(
    calculations: PayrollCalculationResult[]
  ): string {
    const hashData = calculations.map(calc => ({
      employeeId: calc.employeeId,
      grossPay: calc.grossPay,
      netPay: calc.netPay,
      totalDeductions: calc.totalDeductions,
    }));

    // Simple hash generation (in production, use crypto)
    return btoa(JSON.stringify(hashData)).slice(0, 16);
  }

  /**
   * Get period start date from period string
   */
  private getPeriodStartDate(period: string): Date {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }

  /**
   * Get period end date from period string
   */
  private getPeriodEndDate(period: string): Date {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month, 0); // Last day of the month
  }
}

// Export singleton instance
export const payrollService = new PayrollService();
