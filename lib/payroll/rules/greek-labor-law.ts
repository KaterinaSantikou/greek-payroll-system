/**
 * Greek Labor Law Domain Rules - Configurable Version
 *
 * This module provides access to Greek tax and social security law constants
 * through a configurable system. All values are externalized and can be
 * updated when labor laws change without code modifications.
 */

import { getGreekLawConfig } from '../config/greek-law-config.js';

// =============================================================================
// CONFIGURABLE CONSTANTS - LOADED FROM EXTERNAL CONFIGURATION
// =============================================================================

let configCache: Awaited<ReturnType<typeof getGreekLawConfig>> | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get current configuration with caching
 */
async function getCurrentConfig() {
  const now = Date.now();
  if (!configCache || now > cacheExpiry) {
    configCache = await getGreekLawConfig();
    cacheExpiry = now + CACHE_TTL;
  }
  return configCache;
}

/**
 * Greek Income Tax Brackets - Configurable
 * Updates automatically when GREEK_LAW_VERSION changes
 */
export async function getGreekTaxBrackets() {
  const config = await getCurrentConfig();
  return config.taxBrackets;
}

/**
 * EFKA Social Security Rates - Configurable
 * Updates automatically when EFKA_RATES_VERSION changes
 */
export async function getEfkaRates() {
  const config = await getCurrentConfig();
  return config.efkaRates;
}

/**
 * Solidarity Tax Brackets - Configurable
 */
export async function getSolidarityTaxBrackets() {
  const config = await getCurrentConfig();
  return config.solidarityTaxBrackets;
}

/**
 * Minimum Wage Regulations - Configurable
 * Updates automatically when MINIMUM_WAGE_VERSION changes
 */
export async function getMinimumWage() {
  const config = await getCurrentConfig();
  return config.minimumWage;
}

/**
 * Working Time Limits - Configurable
 */
export async function getWorkingTimeLimits() {
  const config = await getCurrentConfig();
  return config.workingTimeLimits;
}

/**
 * Tax-Free Benefits Limits - Configurable
 */
export async function getTaxFreeLimits() {
  const config = await getCurrentConfig();
  return config.taxFreeLimits;
}

/**
 * Tips Taxation Rules - Configurable
 */
export async function getTipsRules() {
  const config = await getCurrentConfig();
  return config.tipsRules;
}

// =============================================================================
// BACKWARD COMPATIBILITY - DEPRECATED CONSTANTS
// =============================================================================
// These constants are kept for backward compatibility but should be replaced
// with the async functions above in new code.

/** @deprecated Use getGreekTaxBrackets() instead */
export const GREEK_TAX_BRACKETS = [
  { min: 0, max: 10000, rate: 0.09 },
  { min: 10000, max: 20000, rate: 0.22 },
  { min: 20000, max: 30000, rate: 0.28 },
  { min: 30000, max: 40000, rate: 0.36 },
  { min: 40000, max: Infinity, rate: 0.44 },
] as const;

/** @deprecated Use getEfkaRates() instead */
export const EFKA_RATES = {
  employee: {
    main: 0.1067,
    auxiliary: 0.0333,
    unemployment: 0.0213,
  },
  employer: {
    main: 0.1542,
    auxiliary: 0.0333,
    unemployment: 0.0503,
    sickness: 0.0287,
    workAccident: 0.0067,
  },
} as const;

/** @deprecated Use getSolidarityTaxBrackets() instead */
export const SOLIDARITY_TAX_BRACKETS = [
  { min: 0, max: 12000, rate: 0 },
  { min: 12000, max: 20000, rate: 0.022 },
  { min: 20000, max: 30000, rate: 0.05 },
  { min: 30000, max: 40000, rate: 0.065 },
  { min: 40000, max: 65000, rate: 0.075 },
  { min: 65000, max: Infinity, rate: 0.09 },
] as const;

/** @deprecated Use getMinimumWage() instead */
export const MINIMUM_WAGE = {
  monthly: 830,
  daily: 27.65,
  hourly: 3.45,
} as const;

/** @deprecated Use getWorkingTimeLimits() instead */
export const WORKING_TIME_LIMITS = {
  standardMonthlyHours: 173.33,
  maxDailyHours: 8,
  maxWeeklyHours: 40,
  maxOvertimeDaily: 2,
  maxOvertimeWeekly: 5,
  maxAnnualOvertime: 150,
} as const;

/** @deprecated Use getTaxFreeLimits() instead */
export const TAX_FREE_LIMITS = {
  mealVouchers: 11,
  transportAllowance: 150,
  educationAllowance: 200,
} as const;

/** @deprecated Use getTipsRules() instead */
export const TIPS_TAX_RULES = {
  flatTaxRate: 0.15,
  minimumDeclaredPercentage: 0.08,
} as const;

export type TaxBracket = (typeof GREEK_TAX_BRACKETS)[number];
export type SolidarityTaxBracket = (typeof SOLIDARITY_TAX_BRACKETS)[number];
