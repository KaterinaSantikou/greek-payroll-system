/**
 * PayrollSync Core Payroll Library
 * 
 * Centralized Greek payroll rules, calculations, and services
 * following Greek labor law and EFKA compliance requirements.
 */

// Export all Greek labor law rules and constants
export * from './rules/greek-labor-law';
export * from './rules/payroll-rules';
export * from './rules/compliance-rules';

// Export payroll calculators and validators
export * from './calculators/payroll-calculator';
export * from './calculators/payroll-validator';

// Export high-level payroll services
export * from './services/payroll-service';

// Re-export commonly used types for convenience
export type {
  PayrollCalculationInput,
  TaxCalculation,
  EfkaContribution,
  BonusCalculation,
  OvertimeCalculation,
  PayrollResult
} from './calculators/payroll-calculator';

export type {
  ValidationResult,
  ComplianceCheck,
  EligibilityCheck
} from './calculators/payroll-validator';