/**
 * Greek Labor Law Compliance Rules
 *
 * Contains validation rules and constraints for Greek labor law compliance.
 * These are pure domain rules without any implementation logic.
 */

// Employee Eligibility Rules
export const EMPLOYEE_ELIGIBILITY_RULES = {
  minAge: 15, // Minimum working age in Greece
  maxAge: 67, // Retirement age
  maxWorkingHoursPerDay: 8,
  maxWorkingHoursPerWeek: 40,
  maxOvertimeHoursPerDay: 2,
  maxOvertimeHoursPerWeek: 5,
  maxAnnualOvertimeHours: 150,
  minRestPeriodBetweenShifts: 12, // 12 hours minimum rest
} as const;

// Payroll Period Rules
export const PAYROLL_PERIOD_RULES = {
  maxPayrollPeriodDays: 31, // Maximum days in a payroll period
  minPayrollPeriodDays: 28, // Minimum days in a payroll period
  payrollCutoffDay: 25, // Payroll must be processed by 25th of month
  salaryPaymentDeadline: 30, // Salary must be paid by 30th of month
  bonusPaymentDeadlines: {
    christmas: { month: 12, day: 31 }, // Christmas bonus by Dec 31
    easter: { relativeTo: 'easter', daysBefore: 0 }, // Easter bonus by Easter
    vacation: { month: 7, day: 31 }, // Vacation bonus by July 31
  },
} as const;

// ERGANI Compliance Rules
export const ERGANI_COMPLIANCE = {
  // Submission deadlines
  monthlySubmissionDeadline: 15, // 15th of following month
  quarterlySubmissionDeadline: 15, // 15th of month following quarter
  annualSubmissionDeadline: { month: 1, day: 31 }, // January 31st

  // Required employee data
  requiredFields: [
    'employeeId',
    'afm', // Tax identification number
    'amka', // Social security number
    'firstName',
    'lastName',
    'dateOfBirth',
    'hireDate',
    'salary',
    'contractType',
  ],

  // Working time constraints
  maxDailyHours: 8,
  maxWeeklyHours: 40,
  maxMonthlyHours: 173.33,
  overtimeRequiresPreApproval: true,
} as const;

// EFKA Compliance Rules
export const EFKA_COMPLIANCE = {
  // Contribution submission deadlines
  monthlyContributionDeadline: 10, // 10th of following month
  quarterlyReportDeadline: 15, // 15th of month following quarter

  // Minimum contribution thresholds
  minimumContributionBase: 830, // Minimum wage as contribution base
  maximumContributionBase: 6500, // Maximum contribution ceiling

  // Required documentation
  requiredDocuments: [
    'employmentContract',
    'timeSheets',
    'payrollCalculations',
    'bankTransferProofs',
  ],
} as const;

// Data Protection (GDPR) Rules
export const DATA_PROTECTION_RULES = {
  // Data retention periods (in months)
  payrollDataRetention: 60, // 5 years
  timesheetDataRetention: 60, // 5 years
  contractDataRetention: 120, // 10 years
  taxDataRetention: 60, // 5 years

  // Required consents
  requiredConsents: [
    'payrollProcessing',
    'taxReporting',
    'socialSecurityReporting',
    'bankingDetails',
  ],

  // Access rights
  employeeAccessRights: [
    'viewPersonalData',
    'correctPersonalData',
    'deletePersonalData',
    'exportPersonalData',
  ],
} as const;

// Audit Trail Requirements
export const AUDIT_REQUIREMENTS = {
  // Required audit events
  auditableEvents: [
    'payrollCalculation',
    'payrollApproval',
    'payrollPayment',
    'salaryAdjustment',
    'bonusPayment',
    'deductionApplication',
    'dataAccess',
    'dataModification',
  ],

  // Audit data retention
  auditLogRetention: 84, // 7 years in months

  // Required audit fields
  requiredAuditFields: [
    'timestamp',
    'userId',
    'action',
    'entityType',
    'entityId',
    'oldValue',
    'newValue',
    'ipAddress',
  ],
} as const;

// Payment Method Rules
export const PAYMENT_METHOD_RULES = {
  // Allowed payment methods
  allowedMethods: ['bankTransfer', 'cash'] as const,

  // Cash payment limits
  maxCashPayment: 500, // Maximum €500 cash payment

  // Bank transfer requirements
  bankTransfer: {
    requiresIBAN: true,
    requiresBankName: true,
    requiresAccountHolder: true,
    maxProcessingDays: 3,
  },
} as const;

// Error Handling Rules
export const ERROR_HANDLING_RULES = {
  // Validation error categories
  errorCategories: [
    'FIELD_REQUIRED',
    'FIELD_INVALID_FORMAT',
    'FIELD_OUT_OF_RANGE',
    'BUSINESS_RULE_VIOLATION',
    'COMPLIANCE_VIOLATION',
    'CALCULATION_ERROR',
    'DATA_CONSISTENCY_ERROR',
  ] as const,

  // Critical errors that block processing
  criticalErrors: [
    'MISSING_EMPLOYEE_DATA',
    'INVALID_TAX_CALCULATION',
    'EFKA_COMPLIANCE_VIOLATION',
    'ERGANI_SUBMISSION_FAILURE',
  ] as const,
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHOD_RULES.allowedMethods)[number];
export type ErrorCategory =
  (typeof ERROR_HANDLING_RULES.errorCategories)[number];
export type CriticalError =
  (typeof ERROR_HANDLING_RULES.criticalErrors)[number];
