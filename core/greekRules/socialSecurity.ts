/**
 * Greek Social Security (EFKA) Rules - Pure Domain Logic
 * 
 * Pure functions for calculating EFKA contributions, unemployment insurance,
 * sickness benefits, and work accident insurance based on Greek labor law.
 */

import { 
  GreekLawConstants, 
  EfkaRates,
  lawRegistry 
} from '../../shared/law-constants.js';

// =============================================================================
// EFKA CONTRIBUTION CALCULATIONS
// =============================================================================

/**
 * Calculate monthly EFKA contributions for employee and employer
 */
export function calculateEfkaContributions(
  monthlyGrossIncome: number,
  lawVersion?: GreekLawConstants
): {
  employee: {
    main: number;
    auxiliary: number;
    unemployment: number;
    total: number;
  };
  employer: {
    main: number;
    auxiliary: number;
    unemployment: number;
    sickness: number;
    workAccident: number;
    total: number;
  };
  totalContributions: number;
  totalEmployerCost: number;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const rates = law.efkaRates;
  
  if (monthlyGrossIncome <= 0) {
    return {
      employee: { main: 0, auxiliary: 0, unemployment: 0, total: 0 },
      employer: { main: 0, auxiliary: 0, unemployment: 0, sickness: 0, workAccident: 0, total: 0 },
      totalContributions: 0,
      totalEmployerCost: monthlyGrossIncome
    };
  }
  
  // Employee contributions
  const employeeMain = Math.round(monthlyGrossIncome * rates.employee.main * 100) / 100;
  const employeeAux = Math.round(monthlyGrossIncome * rates.employee.auxiliary * 100) / 100;
  const employeeUnemployment = Math.round(monthlyGrossIncome * rates.employee.unemployment * 100) / 100;
  const employeeTotal = employeeMain + employeeAux + employeeUnemployment;
  
  // Employer contributions
  const employerMain = Math.round(monthlyGrossIncome * rates.employer.main * 100) / 100;
  const employerAux = Math.round(monthlyGrossIncome * rates.employer.auxiliary * 100) / 100;
  const employerUnemployment = Math.round(monthlyGrossIncome * rates.employer.unemployment * 100) / 100;
  const employerSickness = Math.round(monthlyGrossIncome * rates.employer.sickness * 100) / 100;
  const employerWorkAccident = Math.round(monthlyGrossIncome * rates.employer.workAccident * 100) / 100;
  const employerTotal = employerMain + employerAux + employerUnemployment + employerSickness + employerWorkAccident;
  
  const totalContributions = employeeTotal + employerTotal;
  const totalEmployerCost = monthlyGrossIncome + employerTotal;
  
  return {
    employee: {
      main: employeeMain,
      auxiliary: employeeAux,
      unemployment: employeeUnemployment,
      total: employeeTotal
    },
    employer: {
      main: employerMain,
      auxiliary: employerAux,
      unemployment: employerUnemployment,
      sickness: employerSickness,
      workAccident: employerWorkAccident,
      total: employerTotal
    },
    totalContributions,
    totalEmployerCost
  };
}

/**
 * Calculate annual EFKA contributions
 */
export function calculateAnnualEfkaContributions(
  annualGrossIncome: number,
  lawVersion?: GreekLawConstants
) {
  const monthlyResult = calculateEfkaContributions(annualGrossIncome / 12, lawVersion);
  
  return {
    employee: {
      main: monthlyResult.employee.main * 12,
      auxiliary: monthlyResult.employee.auxiliary * 12,
      unemployment: monthlyResult.employee.unemployment * 12,
      total: monthlyResult.employee.total * 12
    },
    employer: {
      main: monthlyResult.employer.main * 12,
      auxiliary: monthlyResult.employer.auxiliary * 12,
      unemployment: monthlyResult.employer.unemployment * 12,
      sickness: monthlyResult.employer.sickness * 12,
      workAccident: monthlyResult.employer.workAccident * 12,
      total: monthlyResult.employer.total * 12
    },
    totalContributions: monthlyResult.totalContributions * 12,
    totalEmployerCost: monthlyResult.totalEmployerCost * 12
  };
}

// =============================================================================
// EFKA CEILINGS AND FLOORS
// =============================================================================

/**
 * Apply EFKA contribution ceilings and floors
 * Note: These limits change annually and should be part of law constants
 */
export function applyEfkaLimits(
  monthlyGrossIncome: number,
  contributionType: 'main' | 'auxiliary' | 'unemployment',
  lawVersion?: GreekLawConstants
): {
  originalIncome: number;
  cappedIncome: number;
  limitApplied: boolean;
  limitType: 'floor' | 'ceiling' | 'none';
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const minWage = law.minimumWage.monthly;
  
  // EFKA contribution limits (these should be in law constants)
  const limits = {
    main: {
      floor: minWage,           // Minimum contribution base
      ceiling: minWage * 5.88   // Maximum contribution base (5.88 times minimum wage)
    },
    auxiliary: {
      floor: minWage,
      ceiling: minWage * 3
    },
    unemployment: {
      floor: minWage,
      ceiling: minWage * 3
    }
  };
  
  const contributionLimits = limits[contributionType];
  let cappedIncome = monthlyGrossIncome;
  let limitApplied = false;
  let limitType: 'floor' | 'ceiling' | 'none' = 'none';
  
  if (monthlyGrossIncome < contributionLimits.floor) {
    cappedIncome = contributionLimits.floor;
    limitApplied = true;
    limitType = 'floor';
  } else if (monthlyGrossIncome > contributionLimits.ceiling) {
    cappedIncome = contributionLimits.ceiling;
    limitApplied = true;
    limitType = 'ceiling';
  }
  
  return {
    originalIncome: monthlyGrossIncome,
    cappedIncome,
    limitApplied,
    limitType
  };
}

/**
 * Calculate EFKA contributions with ceiling/floor limits applied
 */
export function calculateEfkaContributionsWithLimits(
  monthlyGrossIncome: number,
  lawVersion?: GreekLawConstants
) {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const rates = law.efkaRates;
  
  // Apply limits for each contribution type
  const mainLimits = applyEfkaLimits(monthlyGrossIncome, 'main', law);
  const auxLimits = applyEfkaLimits(monthlyGrossIncome, 'auxiliary', law);
  const unemploymentLimits = applyEfkaLimits(monthlyGrossIncome, 'unemployment', law);
  
  // Calculate contributions on capped amounts
  const employeeMain = Math.round(mainLimits.cappedIncome * rates.employee.main * 100) / 100;
  const employeeAux = Math.round(auxLimits.cappedIncome * rates.employee.auxiliary * 100) / 100;
  const employeeUnemployment = Math.round(unemploymentLimits.cappedIncome * rates.employee.unemployment * 100) / 100;
  const employeeTotal = employeeMain + employeeAux + employeeUnemployment;
  
  const employerMain = Math.round(mainLimits.cappedIncome * rates.employer.main * 100) / 100;
  const employerAux = Math.round(auxLimits.cappedIncome * rates.employer.auxiliary * 100) / 100;
  const employerUnemployment = Math.round(unemploymentLimits.cappedIncome * rates.employer.unemployment * 100) / 100;
  const employerSickness = Math.round(monthlyGrossIncome * rates.employer.sickness * 100) / 100; // No ceiling for sickness
  const employerWorkAccident = Math.round(monthlyGrossIncome * rates.employer.workAccident * 100) / 100; // No ceiling for work accident
  const employerTotal = employerMain + employerAux + employerUnemployment + employerSickness + employerWorkAccident;
  
  return {
    employee: {
      main: employeeMain,
      auxiliary: employeeAux,
      unemployment: employeeUnemployment,
      total: employeeTotal
    },
    employer: {
      main: employerMain,
      auxiliary: employerAux,
      unemployment: employerUnemployment,
      sickness: employerSickness,
      workAccident: employerWorkAccident,
      total: employerTotal
    },
    totalContributions: employeeTotal + employerTotal,
    totalEmployerCost: monthlyGrossIncome + employerTotal,
    limitsApplied: {
      main: mainLimits,
      auxiliary: auxLimits,
      unemployment: unemploymentLimits
    }
  };
}

// =============================================================================
// SPECIALIZED EFKA CALCULATIONS
// =============================================================================

/**
 * Calculate EFKA contributions for part-time employees
 */
export function calculatePartTimeEfkaContributions(
  monthlyGrossIncome: number,
  hoursWorked: number,
  standardMonthlyHours: number = 173.33,
  lawVersion?: GreekLawConstants
) {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const fullTimeEquivalent = (hoursWorked / standardMonthlyHours) * monthlyGrossIncome;
  
  // Part-time employees have minimum contribution requirements
  const minWage = law.minimumWage.monthly;
  const minPartTimeBase = Math.max(monthlyGrossIncome, minWage * (hoursWorked / standardMonthlyHours));
  
  return calculateEfkaContributions(minPartTimeBase, law);
}

/**
 * Calculate EFKA for seasonal employees
 */
export function calculateSeasonalEfkaContributions(
  monthlyGrossIncome: number,
  monthsWorkedInYear: number,
  lawVersion?: GreekLawConstants
) {
  // Seasonal workers may have different minimum bases
  const baseResult = calculateEfkaContributions(monthlyGrossIncome, lawVersion);
  
  // Apply seasonal adjustments if needed
  const seasonalAdjustment = monthsWorkedInYear / 12;
  
  return {
    ...baseResult,
    seasonalAdjustment,
    annualizedContributions: {
      employee: baseResult.employee.total * monthsWorkedInYear,
      employer: baseResult.employer.total * monthsWorkedInYear
    }
  };
}

// =============================================================================
// EFKA EXEMPTIONS AND SPECIAL CASES
// =============================================================================

/**
 * Calculate EFKA exemptions for certain types of income
 */
export function calculateEfkaExemptions(
  monthlyGrossIncome: number,
  exemptIncome: {
    tips?: number;
    benefitsInKind?: number;
    mealVouchers?: number;
  } = {},
  lawVersion?: GreekLawConstants
): {
  totalGrossIncome: number;
  exemptAmount: number;
  efkaSubjectIncome: number;
  contributions: ReturnType<typeof calculateEfkaContributions>;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  
  // Tips are exempt from EFKA based on law constants
  const tipsExempt = law.tipsTaxRules.efkaExempt ? (exemptIncome.tips || 0) : 0;
  
  // Certain benefits in kind may be exempt (up to specific limits)
  const benefitsExempt = exemptIncome.benefitsInKind || 0;
  const mealVouchersExempt = exemptIncome.mealVouchers || 0;
  
  const totalExempt = tipsExempt + benefitsExempt + mealVouchersExempt;
  const efkaSubjectIncome = Math.max(0, monthlyGrossIncome - totalExempt);
  
  const contributions = calculateEfkaContributions(efkaSubjectIncome, law);
  
  return {
    totalGrossIncome: monthlyGrossIncome,
    exemptAmount: totalExempt,
    efkaSubjectIncome,
    contributions
  };
}

// =============================================================================
// EFKA RATES HISTORY AND VALIDATION
// =============================================================================

/**
 * Get EFKA rates for a specific date
 */
export function getEfkaRatesForDate(date: Date): EfkaRates {
  const law = lawRegistry.getActiveVersion(date);
  return law.efkaRates;
}

/**
 * Compare EFKA rates between two law versions
 */
export function compareEfkaRates(
  version1: string,
  version2: string
): {
  version1Rates: EfkaRates;
  version2Rates: EfkaRates;
  differences: {
    employee: Record<string, { old: number; new: number; change: number }>;
    employer: Record<string, { old: number; new: number; change: number }>;
  };
} {
  const law1 = lawRegistry.getConstants(version1);
  const law2 = lawRegistry.getConstants(version2);
  
  if (!law1 || !law2) {
    throw new Error(`Law version not found: ${!law1 ? version1 : version2}`);
  }
  
  const rates1 = law1.efkaRates;
  const rates2 = law2.efkaRates;
  
  const employeeDiffs: Record<string, { old: number; new: number; change: number }> = {};
  const employerDiffs: Record<string, { old: number; new: number; change: number }> = {};
  
  // Compare employee rates
  for (const [key, rate1] of Object.entries(rates1.employee)) {
    const rate2 = rates2.employee[key as keyof typeof rates2.employee];
    if (rate1 !== rate2) {
      employeeDiffs[key] = {
        old: rate1,
        new: rate2,
        change: rate2 - rate1
      };
    }
  }
  
  // Compare employer rates  
  for (const [key, rate1] of Object.entries(rates1.employer)) {
    const rate2 = rates2.employer[key as keyof typeof rates2.employer];
    if (rate1 !== rate2) {
      employerDiffs[key] = {
        old: rate1,
        new: rate2,
        change: rate2 - rate1
      };
    }
  }
  
  return {
    version1Rates: rates1,
    version2Rates: rates2,
    differences: {
      employee: employeeDiffs,
      employer: employerDiffs
    }
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format EFKA contribution breakdown for display
 */
export function formatEfkaBreakdown(
  contributions: ReturnType<typeof calculateEfkaContributions>,
  lawVersion?: GreekLawConstants
): {
  employee: Array<{ name: string; rate: string; amount: number }>;
  employer: Array<{ name: string; rate: string; amount: number }>;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const rates = law.efkaRates;
  
  const employeeBreakdown = [
    { name: 'Main Pension', rate: `${(rates.employee.main * 100).toFixed(2)}%`, amount: contributions.employee.main },
    { name: 'Auxiliary Pension', rate: `${(rates.employee.auxiliary * 100).toFixed(2)}%`, amount: contributions.employee.auxiliary },
    { name: 'Unemployment', rate: `${(rates.employee.unemployment * 100).toFixed(2)}%`, amount: contributions.employee.unemployment }
  ];
  
  const employerBreakdown = [
    { name: 'Main Pension', rate: `${(rates.employer.main * 100).toFixed(2)}%`, amount: contributions.employer.main },
    { name: 'Auxiliary Pension', rate: `${(rates.employer.auxiliary * 100).toFixed(2)}%`, amount: contributions.employer.auxiliary },
    { name: 'Unemployment', rate: `${(rates.employer.unemployment * 100).toFixed(2)}%`, amount: contributions.employer.unemployment },
    { name: 'Sickness', rate: `${(rates.employer.sickness * 100).toFixed(2)}%`, amount: contributions.employer.sickness },
    { name: 'Work Accident', rate: `${(rates.employer.workAccident * 100).toFixed(2)}%`, amount: contributions.employer.workAccident }
  ];
  
  return {
    employee: employeeBreakdown,
    employer: employerBreakdown
  };
}