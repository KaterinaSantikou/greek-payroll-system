/**
 * Greek Payroll Rules Domain - Configurable Version
 *
 * Contains configurable domain rules for Greek payroll calculations including
 * bonuses, premiums, and overtime calculations. All values are externalized
 * and can be updated when labor laws change.
 */

import { CachedConstants } from '../cache/LegalConstantsCache.js';

// =============================================================================
// HIGH-PERFORMANCE CACHED PAYROLL RULES
// =============================================================================

/**
 * Premium Rates for Greek Labor Law - High-Performance Cached
 */
export async function getPremiumRates() {
  const constants = await CachedConstants.getAllConstants();
  return constants.premiumRates;
}

/**
 * Severance Pay Rules - High-Performance Cached
 */
export async function getSeveranceRules() {
  const constants = await CachedConstants.getAllConstants();
  return constants.severanceRules;
}

// Greek National Holidays and Bonus Calculations (Δώρα) - Configurable
export async function getGreekBonuses() {
  // For now, return hardcoded values but these should eventually be configurable too
  return {
    christmas: {
      fullTimeMonthly: 1.0417, // 25/24 of monthly salary
      partTimeHourly: 0.0417, // 1/24 of monthly for part-time
    },
    easter: {
      fullTimeMonthly: 0.5, // Half month salary
      partTimeHourly: 0.02083, // Pro-rated for part-time
    },
    vacation: {
      fullTimeMonthly: 0.5, // Half month salary
      partTimeHourly: 0.02083, // Pro-rated for part-time
    },
  };
}

// =============================================================================
// BACKWARD COMPATIBILITY - DEPRECATED CONSTANTS
// =============================================================================

/** @deprecated Use getGreekBonuses() instead */
export const GREEK_BONUSES = {
  christmas: {
    fullTimeMonthly: 1.0417, // 25/24 of monthly salary
    partTimeHourly: 0.0417, // 1/24 of monthly for part-time
  },
  easter: {
    fullTimeMonthly: 0.5, // Half month salary
    partTimeHourly: 0.02083, // Pro-rated for part-time
  },
  vacation: {
    fullTimeMonthly: 0.5, // Half month salary
    partTimeHourly: 0.02083, // Pro-rated for part-time
  },
} as const;

/** @deprecated Use getPremiumRates() instead */
export const PREMIUM_RATES = {
  overtime: {
    tier1: 1.25, // First 2 hours: 25% premium
    tier2: 1.5, // Hours 3-4: 50% premium
    tier3: 1.75, // Beyond 4 hours: 75% premium
  },
  night: 0.25, // 25% night premium (10 PM - 6 AM)
  sunday: 0.75, // 75% Sunday premium
  holiday: 1.0, // 100% holiday premium
  dangerous: 0.15, // 15% dangerous work premium
} as const;

// Night Shift Time Periods
export const NIGHT_SHIFT_HOURS = {
  start: 22, // 10 PM
  end: 6, // 6 AM
} as const;

/** @deprecated Use getSeveranceRules() instead */
export const SEVERANCE_PAY_RULES = {
  // Months of salary based on years of service
  yearsBrackets: [
    { minYears: 0, maxYears: 1, monthsOfPay: 0 }, // No severance for less than 1 year
    { minYears: 1, maxYears: 2, monthsOfPay: 1 }, // 1 month for 1-2 years
    { minYears: 2, maxYears: 5, monthsOfPay: 2 }, // 2 months for 2-5 years
    { minYears: 5, maxYears: 10, monthsOfPay: 3 }, // 3 months for 5-10 years
    { minYears: 10, maxYears: 15, monthsOfPay: 4 }, // 4 months for 10-15 years
    { minYears: 15, maxYears: 20, monthsOfPay: 5 }, // 5 months for 15-20 years
    { minYears: 20, maxYears: 25, monthsOfPay: 6 }, // 6 months for 20-25 years
    { minYears: 25, maxYears: Infinity, monthsOfPay: 12 }, // 12 months for 25+ years
  ],
  // Severance pay is based on last monthly salary
  basedOnLastSalary: true,
  // Maximum severance cap (24 months of salary)
  maxMonthsCap: 24,
} as const;

// Leave Entitlements
export const LEAVE_ENTITLEMENTS = {
  annual: {
    // Annual leave days based on years of service
    baseDays: 20, // Minimum 20 days
    additionalAfter10Years: 1, // +1 day after 10 years
    additionalAfter15Years: 1, // +1 more day after 15 years
    maxDays: 25, // Maximum 25 days
  },
  sick: {
    maxDaysPerYear: 30, // Maximum 30 sick days per year
    payPercentage: 0.5, // 50% pay for sick leave (after first 3 days)
  },
  maternity: {
    totalDays: 119, // 17 weeks total
    paidDays: 119, // Fully paid
    beforeBirth: 56, // 8 weeks before birth
    afterBirth: 63, // 9 weeks after birth
  },
  paternity: {
    totalDays: 14, // 2 weeks
    paidDays: 14, // Fully paid
  },
} as const;

// Benefits in Kind Rules
export const BENEFITS_IN_KIND = {
  companyCar: {
    annualTaxablePercentage: 0.2, // 20% of car value per year as imputed income
  },
  housing: {
    fullyTaxable: true, // Housing benefit is fully taxable
  },
  mealVouchers: {
    taxFreeLimit: 11, // €11 per day tax-free
  },
} as const;

// Contract Type Rules
export const CONTRACT_TYPE_RULES = {
  seasonal: {
    bonusReduction: 0.5, // 50% bonus reduction for seasonal workers
    minContractMonths: 2, // Minimum 2 months for seasonal contracts
    maxContractMonths: 8, // Maximum 8 months for seasonal contracts
  },
  fixedTerm: {
    maxRenewals: 2, // Maximum 2 renewals
    maxTotalDuration: 36, // Maximum 36 months total duration
  },
  indefinite: {
    probationPeriod: 2, // 2 months probation period
  },
} as const;

export type BonusType = keyof typeof GREEK_BONUSES;
export type PremiumType = keyof typeof PREMIUM_RATES;
export type ContractType = keyof typeof CONTRACT_TYPE_RULES;
