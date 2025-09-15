/**
 * PayrollSync Core Library
 * 
 * Centralized library for all payroll-related functionality
 */

// Export everything from payroll module
export * from './payroll';

// Re-export for convenience - main payroll exports
export {
  // Rules and constants
  GREEK_TAX_BRACKETS,
  EFKA_RATES,
  SOLIDARITY_TAX_BRACKETS,
  PREMIUM_RATES,
  GREEK_BONUSES,
  MINIMUM_WAGE,
  WORKING_TIME_LIMITS,
  
  // Calculators
  payrollCalculator,
  payrollValidator,
  
  // Services
  payrollService
} from './payroll';