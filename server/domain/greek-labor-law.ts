/**
 * Greek Labor Law Domain Rules - 2025
 * 
 * This module contains pure domain rules for Greek tax and social security law.
 * No business logic, database access, or external dependencies should be in this file.
 */

// Greek Income Tax Brackets for 2025
export const GREEK_TAX_BRACKETS = [
  { min: 0, max: 10000, rate: 0.09 }, // 9% up to €10,000
  { min: 10000, max: 20000, rate: 0.22 }, // 22% from €10,000 to €20,000
  { min: 20000, max: 30000, rate: 0.28 }, // 28% from €20,000 to €30,000
  { min: 30000, max: 40000, rate: 0.36 }, // 36% from €30,000 to €40,000
  { min: 40000, max: Infinity, rate: 0.44 } // 44% above €40,000
] as const;

// EFKA Social Security Rates for 2025
export const EFKA_RATES = {
  employee: {
    main: 0.1067, // 10.67% main pension
    auxiliary: 0.0333, // 3.33% auxiliary pension
    unemployment: 0.0213 // 2.13% unemployment fund
  },
  employer: {
    main: 0.1542, // 15.42% main pension
    auxiliary: 0.0333, // 3.33% auxiliary pension
    unemployment: 0.0503, // 5.03% unemployment fund
    sickness: 0.0287, // 2.87% sickness benefits
    workAccident: 0.0067 // 0.67% work accident insurance
  }
} as const;

// Special Solidarity Tax Brackets
export const SOLIDARITY_TAX_BRACKETS = [
  { min: 0, max: 12000, rate: 0 }, // No solidarity tax up to €12,000
  { min: 12000, max: 20000, rate: 0.022 }, // 2.2% from €12,000 to €20,000
  { min: 20000, max: 30000, rate: 0.05 }, // 5% from €20,000 to €30,000
  { min: 30000, max: 40000, rate: 0.065 }, // 6.5% from €30,000 to €40,000
  { min: 40000, max: 65000, rate: 0.075 }, // 7.5% from €40,000 to €65,000
  { min: 65000, max: Infinity, rate: 0.09 } // 9% above €65,000
] as const;

// Minimum Wage Regulations
export const MINIMUM_WAGE = {
  monthly: 830, // €830 per month for 2025
  daily: 27.65, // €27.65 per day
  hourly: 3.45 // €3.45 per hour (calculated from daily rate)
} as const;

// Working Time Limits
export const WORKING_TIME_LIMITS = {
  standardMonthlyHours: 173.33, // Standard monthly working hours in Greece
  maxDailyHours: 8, // Maximum daily working hours
  maxWeeklyHours: 40, // Maximum weekly working hours
  maxOvertimeDaily: 2, // Maximum overtime hours per day (normal circumstances)
  maxOvertimeWeekly: 5, // Maximum overtime hours per week
  maxAnnualOvertime: 150 // Maximum annual overtime hours
} as const;

// Tax-Free Benefits Limits
export const TAX_FREE_LIMITS = {
  mealVouchers: 11, // €11 per day tax-free meal vouchers
  transportAllowance: 150, // €150 per month tax-free transport allowance
  educationAllowance: 200 // €200 per month tax-free education allowance
} as const;

// Tips Taxation Rules
export const TIPS_TAX_RULES = {
  flatTaxRate: 0.15, // 15% flat tax rate on declared tips
  minimumDeclaredPercentage: 0.08 // 8% of gross revenue must be declared as tips
} as const;

export type TaxBracket = typeof GREEK_TAX_BRACKETS[number];
export type SolidarityTaxBracket = typeof SOLIDARITY_TAX_BRACKETS[number];