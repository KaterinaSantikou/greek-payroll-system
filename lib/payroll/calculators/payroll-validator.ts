/**
 * Payroll Validator - Business Logic
 *
 * Contains business validation rules and eligibility checks.
 * No database access - validation logic only.
 */

import {
  EMPLOYEE_ELIGIBILITY_RULES,
  PAYROLL_PERIOD_RULES,
  ERGANI_COMPLIANCE,
  EFKA_COMPLIANCE,
  PAYMENT_METHOD_RULES,
  ERROR_HANDLING_RULES,
  type PaymentMethod,
  type ErrorCategory,
  type CriticalError,
} from '../domain/compliance-rules';

import { WORKING_TIME_LIMITS, MINIMUM_WAGE } from '../domain/greek-labor-law';

import {
  CONTRACT_TYPE_RULES,
  LEAVE_ENTITLEMENTS,
} from '../domain/payroll-rules';

export interface ValidationError {
  field: string;
  category: ErrorCategory;
  message: string;
  isCritical: boolean;
}

export interface EmployeeEligibility {
  employeeId: string;
  isEligible: boolean;
  violations: ValidationError[];
}

export interface TimesheetValidation {
  employeeId: string;
  isValid: boolean;
  approvedHours: number;
  unapprovedHours: number;
  totalHours: number;
  effectiveHours: number;
  warnings: ValidationError[];
}

export interface PayrollPeriodValidation {
  period: string;
  isValid: boolean;
  canProcess: boolean;
  warnings: ValidationError[];
  criticalErrors: ValidationError[];
}

export interface ScopeValidation {
  canCreateScope: boolean;
  eligibilityResults: EmployeeEligibility[];
  timesheetValidations: TimesheetValidation[];
  periodValidation: PayrollPeriodValidation;
  overallErrors: ValidationError[];
}

export class PayrollValidator {
  /**
   * Validate employee eligibility for payroll processing
   */
  validateEmployeeEligibility(employee: {
    employeeId: string;
    age?: number;
    contractType: string;
    hireDate: Date;
    terminationDate?: Date;
  }): EmployeeEligibility {
    const violations: ValidationError[] = [];

    // Age validation
    if (employee.age !== undefined) {
      if (employee.age < EMPLOYEE_ELIGIBILITY_RULES.minAge) {
        violations.push({
          field: 'age',
          category: 'BUSINESS_RULE_VIOLATION',
          message: `Employee age ${employee.age} is below minimum working age of ${EMPLOYEE_ELIGIBILITY_RULES.minAge}`,
          isCritical: true,
        });
      }

      if (employee.age > EMPLOYEE_ELIGIBILITY_RULES.maxAge) {
        violations.push({
          field: 'age',
          category: 'BUSINESS_RULE_VIOLATION',
          message: `Employee age ${employee.age} is above retirement age of ${EMPLOYEE_ELIGIBILITY_RULES.maxAge}`,
          isCritical: false,
        });
      }
    }

    // Contract type validation
    const validContractTypes = Object.keys(CONTRACT_TYPE_RULES);
    if (!validContractTypes.includes(employee.contractType)) {
      violations.push({
        field: 'contractType',
        category: 'FIELD_INVALID_FORMAT',
        message: `Invalid contract type: ${employee.contractType}. Must be one of: ${validContractTypes.join(', ')}`,
        isCritical: true,
      });
    }

    // Employment status validation
    const now = new Date();
    if (employee.terminationDate && employee.terminationDate < now) {
      violations.push({
        field: 'terminationDate',
        category: 'BUSINESS_RULE_VIOLATION',
        message:
          'Employee is terminated and cannot be processed in regular payroll',
        isCritical: true,
      });
    }

    return {
      employeeId: employee.employeeId,
      isEligible: violations.filter(v => v.isCritical).length === 0,
      violations,
    };
  }

  /**
   * Validate working hours against Greek labor law
   */
  validateWorkingHours(
    employeeId: string,
    regularHours: number,
    overtimeHours: number,
    totalMonthlyHours: number
  ): ValidationError[] {
    const violations: ValidationError[] = [];

    // Daily hours validation (assuming 22 working days per month)
    const avgDailyHours = totalMonthlyHours / 22;
    if (avgDailyHours > EMPLOYEE_ELIGIBILITY_RULES.maxWorkingHoursPerDay) {
      violations.push({
        field: 'dailyHours',
        category: 'COMPLIANCE_VIOLATION',
        message: `Average daily hours ${avgDailyHours.toFixed(2)} exceeds maximum of ${EMPLOYEE_ELIGIBILITY_RULES.maxWorkingHoursPerDay}`,
        isCritical: false,
      });
    }

    // Weekly hours validation (assuming 4.33 weeks per month)
    const avgWeeklyHours = totalMonthlyHours / 4.33;
    if (avgWeeklyHours > EMPLOYEE_ELIGIBILITY_RULES.maxWorkingHoursPerWeek) {
      violations.push({
        field: 'weeklyHours',
        category: 'COMPLIANCE_VIOLATION',
        message: `Average weekly hours ${avgWeeklyHours.toFixed(2)} exceeds maximum of ${EMPLOYEE_ELIGIBILITY_RULES.maxWorkingHoursPerWeek}`,
        isCritical: false,
      });
    }

    // Monthly overtime validation
    if (
      overtimeHours >
      EMPLOYEE_ELIGIBILITY_RULES.maxAnnualOvertimeHours / 12
    ) {
      violations.push({
        field: 'monthlyOvertime',
        category: 'COMPLIANCE_VIOLATION',
        message: `Monthly overtime hours ${overtimeHours} exceeds annual limit average of ${(EMPLOYEE_ELIGIBILITY_RULES.maxAnnualOvertimeHours / 12).toFixed(2)}`,
        isCritical: false,
      });
    }

    // Standard monthly hours validation
    if (regularHours > WORKING_TIME_LIMITS.standardMonthlyHours) {
      violations.push({
        field: 'regularHours',
        category: 'FIELD_OUT_OF_RANGE',
        message: `Regular hours ${regularHours} exceeds standard monthly hours of ${WORKING_TIME_LIMITS.standardMonthlyHours}`,
        isCritical: false,
      });
    }

    return violations;
  }

  /**
   * Validate salary against minimum wage requirements
   */
  validateSalary(
    employeeId: string,
    salary: number,
    contractType: string,
    isFullTime: boolean
  ): ValidationError[] {
    const violations: ValidationError[] = [];

    const minimumRequired = isFullTime
      ? MINIMUM_WAGE.monthly
      : MINIMUM_WAGE.daily * 22;

    if (salary < minimumRequired) {
      violations.push({
        field: 'salary',
        category: 'COMPLIANCE_VIOLATION',
        message: `Salary ${salary} is below minimum wage requirement of ${minimumRequired} for ${isFullTime ? 'full-time' : 'part-time'} employee`,
        isCritical: true,
      });
    }

    return violations;
  }

  /**
   * Validate timesheet data
   */
  validateTimesheet(
    employeeId: string,
    approvedHours: number,
    unapprovedHours: number,
    requireApproved: boolean = false
  ): TimesheetValidation {
    const warnings: ValidationError[] = [];
    const totalHours = approvedHours + unapprovedHours;

    // Check if unapproved hours exceed threshold
    if (unapprovedHours > 0 && requireApproved) {
      warnings.push({
        field: 'unapprovedHours',
        category: 'BUSINESS_RULE_VIOLATION',
        message: `Employee has ${unapprovedHours} unapproved hours but approval is required`,
        isCritical: true,
      });
    }

    // Check for excessive hours
    if (totalHours > WORKING_TIME_LIMITS.standardMonthlyHours * 1.5) {
      warnings.push({
        field: 'totalHours',
        category: 'FIELD_OUT_OF_RANGE',
        message: `Total hours ${totalHours} seems excessive (150% over standard)`,
        isCritical: false,
      });
    }

    const effectiveHours = requireApproved ? approvedHours : totalHours;
    const isValid = !warnings.some(w => w.isCritical);

    return {
      employeeId,
      isValid,
      approvedHours,
      unapprovedHours,
      totalHours,
      effectiveHours,
      warnings,
    };
  }

  /**
   * Validate payroll period
   */
  validatePayrollPeriod(
    period: string,
    payDate: string,
    hasExistingFinalizedRun: boolean = false
  ): PayrollPeriodValidation {
    const warnings: ValidationError[] = [];
    const criticalErrors: ValidationError[] = [];

    // Period format validation
    const periodRegex = /^\d{4}-\d{2}$/;
    if (!periodRegex.test(period)) {
      criticalErrors.push({
        field: 'period',
        category: 'FIELD_INVALID_FORMAT',
        message: 'Period must be in YYYY-MM format',
        isCritical: true,
      });
    }

    // Check for existing finalized run
    if (hasExistingFinalizedRun) {
      criticalErrors.push({
        field: 'period',
        category: 'BUSINESS_RULE_VIOLATION',
        message: 'Finalized payroll run already exists for this period',
        isCritical: true,
      });
    }

    // Pay date validation
    const payDateObj = new Date(payDate);
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (payDateObj > monthEnd) {
      warnings.push({
        field: 'payDate',
        category: 'BUSINESS_RULE_VIOLATION',
        message: 'Pay date is after month end - may cause compliance issues',
        isCritical: false,
      });
    }

    // Check if processing close to deadline
    const deadline = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      PAYROLL_PERIOD_RULES.payrollCutoffDay
    );
    if (now > deadline) {
      warnings.push({
        field: 'processingDate',
        category: 'COMPLIANCE_VIOLATION',
        message: `Processing after cutoff date (${PAYROLL_PERIOD_RULES.payrollCutoffDay}th)`,
        isCritical: false,
      });
    }

    return {
      period,
      isValid: criticalErrors.length === 0,
      canProcess: criticalErrors.length === 0,
      warnings,
      criticalErrors,
    };
  }

  /**
   * Validate payment method
   */
  validatePaymentMethod(
    paymentMethod: string,
    paymentAmount: number,
    bankDetails?: {
      iban?: string;
      bankName?: string;
      accountHolder?: string;
    }
  ): ValidationError[] {
    const violations: ValidationError[] = [];

    // Check if payment method is allowed
    if (
      !PAYMENT_METHOD_RULES.allowedMethods.includes(
        paymentMethod as PaymentMethod
      )
    ) {
      violations.push({
        field: 'paymentMethod',
        category: 'FIELD_INVALID_FORMAT',
        message: `Invalid payment method: ${paymentMethod}. Must be one of: ${PAYMENT_METHOD_RULES.allowedMethods.join(', ')}`,
        isCritical: true,
      });
    }

    // Cash payment validation
    if (
      paymentMethod === 'cash' &&
      paymentAmount > PAYMENT_METHOD_RULES.maxCashPayment
    ) {
      violations.push({
        field: 'paymentAmount',
        category: 'COMPLIANCE_VIOLATION',
        message: `Cash payment ${paymentAmount} exceeds maximum allowed ${PAYMENT_METHOD_RULES.maxCashPayment}`,
        isCritical: true,
      });
    }

    // Bank transfer validation
    if (paymentMethod === 'bankTransfer') {
      if (!bankDetails?.iban) {
        violations.push({
          field: 'iban',
          category: 'FIELD_REQUIRED',
          message: 'IBAN is required for bank transfer payments',
          isCritical: true,
        });
      }

      if (!bankDetails?.bankName) {
        violations.push({
          field: 'bankName',
          category: 'FIELD_REQUIRED',
          message: 'Bank name is required for bank transfer payments',
          isCritical: true,
        });
      }

      if (!bankDetails?.accountHolder) {
        violations.push({
          field: 'accountHolder',
          category: 'FIELD_REQUIRED',
          message: 'Account holder name is required for bank transfer payments',
          isCritical: true,
        });
      }
    }

    return violations;
  }

  /**
   * Comprehensive scope validation
   */
  validatePayrollScope(
    employeeData: Array<{
      employeeId: string;
      age?: number;
      contractType: string;
      hireDate: Date;
      terminationDate?: Date;
      salary: number;
      isFullTime: boolean;
      approvedHours: number;
      unapprovedHours: number;
    }>,
    period: string,
    options: {
      requireApprovedTimesheets?: boolean;
      hasExistingFinalizedRun?: boolean;
    } = {}
  ): ScopeValidation {
    const eligibilityResults: EmployeeEligibility[] = [];
    const timesheetValidations: TimesheetValidation[] = [];
    const overallErrors: ValidationError[] = [];

    // Validate each employee
    for (const emp of employeeData) {
      // Employee eligibility
      const eligibility = this.validateEmployeeEligibility(emp);
      eligibilityResults.push(eligibility);

      // Salary validation
      const salaryErrors = this.validateSalary(
        emp.employeeId,
        emp.salary,
        emp.contractType,
        emp.isFullTime
      );
      eligibility.violations.push(...salaryErrors);

      // Working hours validation
      const totalHours = emp.approvedHours + emp.unapprovedHours;
      const regularHours = Math.min(
        totalHours,
        WORKING_TIME_LIMITS.standardMonthlyHours
      );
      const overtimeHours = Math.max(
        0,
        totalHours - WORKING_TIME_LIMITS.standardMonthlyHours
      );

      const hoursErrors = this.validateWorkingHours(
        emp.employeeId,
        regularHours,
        overtimeHours,
        totalHours
      );
      overallErrors.push(...hoursErrors);

      // Timesheet validation
      const timesheetValidation = this.validateTimesheet(
        emp.employeeId,
        emp.approvedHours,
        emp.unapprovedHours,
        options.requireApprovedTimesheets
      );
      timesheetValidations.push(timesheetValidation);
    }

    // Period validation
    const periodValidation = this.validatePayrollPeriod(
      period,
      new Date().toISOString(),
      options.hasExistingFinalizedRun
    );

    // Check if scope can be created
    const hasCriticalErrors = [
      ...eligibilityResults.flatMap(e => e.violations),
      ...timesheetValidations.flatMap(t => t.warnings),
      ...periodValidation.criticalErrors,
      ...overallErrors,
    ].some(error => error.isCritical);

    return {
      canCreateScope: !hasCriticalErrors,
      eligibilityResults,
      timesheetValidations,
      periodValidation,
      overallErrors,
    };
  }

  /**
   * Validate ERGANI compliance requirements
   */
  validateErganiCompliance(employeeData: {
    employeeId: string;
    afm?: string;
    amka?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    hireDate?: Date;
    salary?: number;
    contractType?: string;
  }): ValidationError[] {
    const violations: ValidationError[] = [];

    // Check required fields
    for (const field of ERGANI_COMPLIANCE.requiredFields) {
      if (!employeeData[field as keyof typeof employeeData]) {
        violations.push({
          field,
          category: 'FIELD_REQUIRED',
          message: `${field} is required for ERGANI compliance`,
          isCritical: true,
        });
      }
    }

    return violations;
  }
}

// Export singleton instance
export const payrollValidator = new PayrollValidator();
