/**
 * Memoized Payroll Calculations
 * 
 * High-performance memoization for expensive Greek payroll calculations.
 * Caches computation results to avoid recalculating the same values during
 * large payroll processing runs.
 * 
 * FEATURES:
 * - Tax bracket calculations with memoization
 * - EFKA contribution calculations with caching
 * - Overtime tier calculations optimized
 * - Severance pay calculations cached
 * - Memory-efficient with automatic cleanup
 */

import { CachedConstants } from '../cache/LegalConstantsCache.js';
import { logger } from '../../../server/observability/logging.js';

export interface TaxCalculationInput {
  annualIncome: number;
  taxBrackets: Array<{ min: number; max: number; rate: number }>;
}

export interface EfkaCalculationInput {
  grossSalary: number;
  rates: {
    employee: { main: number; auxiliary: number; unemployment: number };
    employer: { main: number; auxiliary: number; unemployment: number; sickness: number; workAccident: number };
  };
}

export interface OvertimeCalculationInput {
  baseHourlyRate: number;
  overtimeHours: number;
  premiumRates: { tier1: number; tier2: number; tier3: number };
}

export interface SeveranceCalculationInput {
  yearsOfService: number;
  lastMonthlySalary: number;
  severanceRules: {
    yearsBrackets: Array<{ minYears: number; maxYears: number; monthsOfPay: number }>;
    maxMonthsCap: number;
  };
}

/**
 * Memoized Greek Tax Calculations
 * Optimized for high-frequency tax bracket calculations during payroll processing
 */
export class MemoizedTaxCalculations {
  
  /**
   * Calculate income tax with memoization
   * PERFORMANCE: Caches results for identical income amounts and tax brackets
   */
  static calculateIncomeTax = CachedConstants.memoizeTaxCalculation(
    (input: TaxCalculationInput): { tax: number; effectiveRate: number; marginalRate: number } => {
      const { annualIncome, taxBrackets } = input;
      
      if (annualIncome <= 0) {
        return { tax: 0, effectiveRate: 0, marginalRate: 0 };
      }
      
      let totalTax = 0;
      let marginalRate = 0;
      
      for (const bracket of taxBrackets) {
        const bracketMin = bracket.min;
        const bracketMax = bracket.max === -1 ? Infinity : bracket.max;
        
        if (annualIncome > bracketMin) {
          const taxableInBracket = Math.min(annualIncome, bracketMax) - bracketMin;
          totalTax += taxableInBracket * bracket.rate;
          marginalRate = bracket.rate;
          
          if (annualIncome <= bracketMax) break;
        }
      }
      
      const effectiveRate = totalTax / annualIncome;
      
      return {
        tax: Math.round(totalTax * 100) / 100,
        effectiveRate: Math.round(effectiveRate * 10000) / 10000,
        marginalRate: Math.round(marginalRate * 10000) / 10000
      };
    }
  );

  /**
   * Calculate solidarity tax with memoization
   * PERFORMANCE: Caches results for identical income amounts
   */
  static calculateSolidarityTax = CachedConstants.memoizeTaxCalculation(
    (annualIncome: number, brackets: Array<{ min: number; max: number; rate: number }>): number => {
      if (annualIncome <= 12000) return 0; // Below solidarity tax threshold
      
      let solidarityTax = 0;
      
      for (const bracket of brackets) {
        const bracketMin = bracket.min;
        const bracketMax = bracket.max === -1 ? Infinity : bracket.max;
        
        if (annualIncome > bracketMin) {
          const taxableInBracket = Math.min(annualIncome, bracketMax) - bracketMin;
          solidarityTax += taxableInBracket * bracket.rate;
          
          if (annualIncome <= bracketMax) break;
        }
      }
      
      return Math.round(solidarityTax * 100) / 100;
    }
  );

  /**
   * Calculate tax withholding for monthly salary
   * PERFORMANCE: Uses memoized annual calculations with scaling
   */
  static calculateMonthlyWithholding = CachedConstants.memoizeTaxCalculation(
    (monthlySalary: number, taxBrackets: Array<{ min: number; max: number; rate: number }>): number => {
      const annualSalary = monthlySalary * 12;
      const annualTax = MemoizedTaxCalculations.calculateIncomeTax({ 
        annualIncome: annualSalary, 
        taxBrackets 
      }).tax;
      
      return Math.round((annualTax / 12) * 100) / 100;
    }
  );
}

/**
 * Memoized EFKA Social Security Calculations
 * Optimized for high-frequency social insurance calculations
 */
export class MemoizedEfkaCalculations {
  
  /**
   * Calculate employee EFKA contributions with memoization
   * PERFORMANCE: Caches results for identical salary and rate combinations
   */
  static calculateEmployeeEfka = CachedConstants.memoizeTaxCalculation(
    (input: EfkaCalculationInput): { main: number; auxiliary: number; unemployment: number; total: number } => {
      const { grossSalary, rates } = input;
      
      const main = grossSalary * rates.employee.main;
      const auxiliary = grossSalary * rates.employee.auxiliary;
      const unemployment = grossSalary * rates.employee.unemployment;
      const total = main + auxiliary + unemployment;
      
      return {
        main: Math.round(main * 100) / 100,
        auxiliary: Math.round(auxiliary * 100) / 100,
        unemployment: Math.round(unemployment * 100) / 100,
        total: Math.round(total * 100) / 100
      };
    }
  );

  /**
   * Calculate employer EFKA contributions with memoization
   * PERFORMANCE: Caches results to avoid redundant calculations
   */
  static calculateEmployerEfka = CachedConstants.memoizeTaxCalculation(
    (input: EfkaCalculationInput): { 
      main: number; 
      auxiliary: number; 
      unemployment: number; 
      sickness: number; 
      workAccident: number; 
      total: number 
    } => {
      const { grossSalary, rates } = input;
      
      const main = grossSalary * rates.employer.main;
      const auxiliary = grossSalary * rates.employer.auxiliary;
      const unemployment = grossSalary * rates.employer.unemployment;
      const sickness = grossSalary * rates.employer.sickness;
      const workAccident = grossSalary * rates.employer.workAccident;
      const total = main + auxiliary + unemployment + sickness + workAccident;
      
      return {
        main: Math.round(main * 100) / 100,
        auxiliary: Math.round(auxiliary * 100) / 100,
        unemployment: Math.round(unemployment * 100) / 100,
        sickness: Math.round(sickness * 100) / 100,
        workAccident: Math.round(workAccident * 100) / 100,
        total: Math.round(total * 100) / 100
      };
    }
  );

  /**
   * Calculate total EFKA burden (employee + employer) with memoization
   * PERFORMANCE: Combines both calculations efficiently
   */
  static calculateTotalEfkaBurden = CachedConstants.memoizeTaxCalculation(
    (input: EfkaCalculationInput): { employeeTotal: number; employerTotal: number; totalBurden: number } => {
      const employee = MemoizedEfkaCalculations.calculateEmployeeEfka(input);
      const employer = MemoizedEfkaCalculations.calculateEmployerEfka(input);
      
      const totalBurden = employee.total + employer.total;
      
      return {
        employeeTotal: employee.total,
        employerTotal: employer.total,
        totalBurden: Math.round(totalBurden * 100) / 100
      };
    }
  );
}

/**
 * Memoized Overtime Calculations  
 * Optimized for complex overtime tier calculations
 */
export class MemoizedOvertimeCalculations {
  
  /**
   * Calculate overtime premiums with tier-based rates and memoization
   * PERFORMANCE: Caches complex tier calculations for identical inputs
   */
  static calculateOvertimePremium = CachedConstants.memoizeTaxCalculation(
    (input: OvertimeCalculationInput): { 
      tier1Hours: number; 
      tier2Hours: number; 
      tier3Hours: number; 
      totalPremium: number; 
      effectiveRate: number 
    } => {
      const { baseHourlyRate, overtimeHours, premiumRates } = input;
      
      if (overtimeHours <= 0) {
        return { tier1Hours: 0, tier2Hours: 0, tier3Hours: 0, totalPremium: 0, effectiveRate: 0 };
      }
      
      let remainingHours = overtimeHours;
      let totalPremium = 0;
      
      // Tier 1: First 2 hours at tier1 rate (typically 1.25x)
      const tier1Hours = Math.min(remainingHours, 2);
      const tier1Premium = tier1Hours * baseHourlyRate * (premiumRates.tier1 - 1);
      totalPremium += tier1Premium;
      remainingHours -= tier1Hours;
      
      // Tier 2: Next 2 hours at tier2 rate (typically 1.5x)  
      const tier2Hours = remainingHours > 0 ? Math.min(remainingHours, 2) : 0;
      const tier2Premium = tier2Hours * baseHourlyRate * (premiumRates.tier2 - 1);
      totalPremium += tier2Premium;
      remainingHours -= tier2Hours;
      
      // Tier 3: Remaining hours at tier3 rate (typically 1.75x)
      const tier3Hours = remainingHours > 0 ? remainingHours : 0;
      const tier3Premium = tier3Hours * baseHourlyRate * (premiumRates.tier3 - 1);
      totalPremium += tier3Premium;
      
      const effectiveRate = overtimeHours > 0 ? (totalPremium / (overtimeHours * baseHourlyRate)) + 1 : 0;
      
      return {
        tier1Hours,
        tier2Hours,
        tier3Hours,
        totalPremium: Math.round(totalPremium * 100) / 100,
        effectiveRate: Math.round(effectiveRate * 1000) / 1000
      };
    }
  );

  /**
   * Calculate night shift premium with memoization
   * PERFORMANCE: Caches results for identical rate and hour combinations
   */
  static calculateNightPremium = CachedConstants.memoizeTaxCalculation(
    (baseHourlyRate: number, nightHours: number, nightPremiumRate: number): number => {
      if (nightHours <= 0) return 0;
      
      const nightPremium = nightHours * baseHourlyRate * nightPremiumRate;
      return Math.round(nightPremium * 100) / 100;
    }
  );

  /**
   * Calculate weekend/holiday premiums with memoization
   */
  static calculateWeekendHolidayPremium = CachedConstants.memoizeTaxCalculation(
    (baseHourlyRate: number, specialHours: number, premiumRate: number): number => {
      if (specialHours <= 0) return 0;
      
      const premium = specialHours * baseHourlyRate * premiumRate;
      return Math.round(premium * 100) / 100;
    }
  );
}

/**
 * Memoized Severance Pay Calculations
 * Optimized for Greek labor law severance calculations
 */
export class MemoizedSeveranceCalculations {
  
  /**
   * Calculate severance pay with memoization
   * PERFORMANCE: Caches results for identical service periods and salaries
   */
  static calculateSeverancePay = CachedConstants.memoizeTaxCalculation(
    (input: SeveranceCalculationInput): { 
      monthsOfPay: number; 
      severanceAmount: number; 
      cappedAmount: number; 
      isCapped: boolean 
    } => {
      const { yearsOfService, lastMonthlySalary, severanceRules } = input;
      
      if (yearsOfService < 1) {
        return { monthsOfPay: 0, severanceAmount: 0, cappedAmount: 0, isCapped: false };
      }
      
      // Find applicable severance bracket
      let monthsOfPay = 0;
      for (const bracket of severanceRules.yearsBrackets) {
        if (yearsOfService >= bracket.minYears && yearsOfService < bracket.maxYears) {
          monthsOfPay = bracket.monthsOfPay;
          break;
        }
      }
      
      const severanceAmount = monthsOfPay * lastMonthlySalary;
      const maxAllowed = severanceRules.maxMonthsCap * lastMonthlySalary;
      const cappedAmount = Math.min(severanceAmount, maxAllowed);
      const isCapped = severanceAmount > maxAllowed;
      
      return {
        monthsOfPay,
        severanceAmount: Math.round(severanceAmount * 100) / 100,
        cappedAmount: Math.round(cappedAmount * 100) / 100,
        isCapped
      };
    }
  );

  /**
   * Calculate prorated severance for partial years with memoization
   */
  static calculateProratedSeverance = CachedConstants.memoizeTaxCalculation(
    (yearsOfService: number, monthsInFinalYear: number, lastMonthlySalary: number, severanceRules: any): number => {
      const fullYearsSeverance = MemoizedSeveranceCalculations.calculateSeverancePay({
        yearsOfService: Math.floor(yearsOfService),
        lastMonthlySalary,
        severanceRules
      });
      
      const partialYearSeverance = (monthsInFinalYear / 12) * lastMonthlySalary;
      const totalSeverance = fullYearsSeverance.cappedAmount + partialYearSeverance;
      
      return Math.round(totalSeverance * 100) / 100;
    }
  );
}

/**
 * Performance monitoring for memoized calculations
 */
export class MemoizedCalculationMonitor {
  
  /**
   * Get performance statistics for all memoized calculations
   */
  static getPerformanceStats(): {
    cacheStats: any;
    estimatedTimeSaved: number;
    calculationsPerformed: number;
  } {
    const cacheStats = CachedConstants.getStats();
    
    // Estimate time saved based on cache hits (rough calculation)
    const avgCalculationTime = 0.5; // milliseconds per calculation
    const estimatedTimeSaved = cacheStats.hitRate * avgCalculationTime;
    
    return {
      cacheStats,
      estimatedTimeSaved: Math.round(estimatedTimeSaved * 100) / 100,
      calculationsPerformed: Math.round((cacheStats.hitRate + cacheStats.missRate))
    };
  }

  /**
   * Log performance summary for debugging
   */
  static logPerformanceSummary(): void {
    const stats = MemoizedCalculationMonitor.getPerformanceStats();
    
    logger.info('Memoized Calculations Performance Summary', {
      hitRate: `${stats.cacheStats.hitRate}%`,
      missRate: `${stats.cacheStats.missRate}%`,
      totalEntries: stats.cacheStats.totalEntries,
      memoryUsage: `${stats.cacheStats.memoryUsage}KB`,
      estimatedTimeSaved: `${stats.estimatedTimeSaved}ms`,
      calculationsPerformed: stats.calculationsPerformed
    });
  }
}

/**
 * Convenience exports for easy access to memoized calculations
 */
export const MemoizedCalculations = {
  Tax: MemoizedTaxCalculations,
  Efka: MemoizedEfkaCalculations,
  Overtime: MemoizedOvertimeCalculations,
  Severance: MemoizedSeveranceCalculations,
  Monitor: MemoizedCalculationMonitor
};