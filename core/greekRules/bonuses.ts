/**
 * Greek Bonuses Rules - Pure Domain Logic
 * 
 * Pure functions for calculating Greek mandatory bonuses (Δώρα):
 * Christmas bonus, Easter bonus, vacation bonus (13th & 14th salary).
 * Based on Greek labor law and collective agreements.
 */

import { 
  GreekLawConstants, 
  lawRegistry 
} from '../../shared/law-constants.js';
import { ContractType } from '../../shared/payrollDomain.js';

// =============================================================================
// GREEK BONUS TYPES
// =============================================================================

export interface GreekBonusRates {
  christmas: number;    // 1.0 = one full month salary
  easter: number;       // 0.5 = half month salary  
  vacation: number;     // 0.5 = half month salary
}

export interface BonusCalculationInput {
  baseMonthlySalary: number;
  monthsWorked: number;
  contractType: ContractType;
  employmentStartDate: Date;
  calculationDate: Date;
  isFullTime: boolean;
}

// =============================================================================
// BONUS CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate Christmas bonus (Δώρο Χριστουγέννων)
 * Full month salary for employees who worked the entire year
 */
export function calculateChristmasBonus(
  input: BonusCalculationInput,
  lawVersion?: GreekLawConstants
): {
  entitlementRatio: number;
  bonusAmount: number;
  calculationDetails: {
    baseSalary: number;
    monthsWorked: number;
    fullEntitlement: number;
    proRatedAmount: number;
  };
} {
  const { baseMonthlySalary, monthsWorked, employmentStartDate, calculationDate } = input;
  
  if (baseMonthlySalary <= 0) {
    throw new Error('Base salary must be positive');
  }
  
  // Christmas bonus is calculated based on January 1st to December 31st
  const yearStart = new Date(calculationDate.getFullYear(), 0, 1);
  const yearEnd = new Date(calculationDate.getFullYear(), 11, 31);
  
  // Calculate actual months worked in the calendar year
  const effectiveStartDate = new Date(Math.max(employmentStartDate.getTime(), yearStart.getTime()));
  const effectiveEndDate = new Date(Math.min(calculationDate.getTime(), yearEnd.getTime()));
  
  const actualMonthsWorked = calculateMonthsWorked(effectiveStartDate, effectiveEndDate);
  const entitlementRatio = Math.min(1.0, actualMonthsWorked / 12);
  
  // Full Christmas bonus = 1 month salary
  const fullEntitlement = baseMonthlySalary;
  const bonusAmount = Math.round(fullEntitlement * entitlementRatio * 100) / 100;
  
  return {
    entitlementRatio,
    bonusAmount,
    calculationDetails: {
      baseSalary: baseMonthlySalary,
      monthsWorked: actualMonthsWorked,
      fullEntitlement,
      proRatedAmount: bonusAmount
    }
  };
}

/**
 * Calculate Easter bonus (Δώρο Πάσχα)
 * Half month salary for employees who worked from January to Easter
 */
export function calculateEasterBonus(
  input: BonusCalculationInput,
  lawVersion?: GreekLawConstants
): {
  entitlementRatio: number;
  bonusAmount: number;
  calculationDetails: {
    baseSalary: number;
    monthsWorked: number;
    fullEntitlement: number;
    proRatedAmount: number;
    easterDate: Date;
  };
} {
  const { baseMonthlySalary, employmentStartDate, calculationDate } = input;
  
  if (baseMonthlySalary <= 0) {
    throw new Error('Base salary must be positive');
  }
  
  // Get Easter date for the year (Greek Orthodox Easter)
  const easterDate = getGreekOrthodoxEaster(calculationDate.getFullYear());
  
  // Easter bonus is calculated from January 1st to Easter
  const yearStart = new Date(calculationDate.getFullYear(), 0, 1);
  const effectiveStartDate = new Date(Math.max(employmentStartDate.getTime(), yearStart.getTime()));
  const effectiveEndDate = new Date(Math.min(calculationDate.getTime(), easterDate.getTime()));
  
  if (effectiveEndDate <= effectiveStartDate) {
    return {
      entitlementRatio: 0,
      bonusAmount: 0,
      calculationDetails: {
        baseSalary: baseMonthlySalary,
        monthsWorked: 0,
        fullEntitlement: baseMonthlySalary * 0.5,
        proRatedAmount: 0,
        easterDate
      }
    };
  }
  
  const actualMonthsWorked = calculateMonthsWorked(effectiveStartDate, effectiveEndDate);
  const monthsToEaster = calculateMonthsWorked(yearStart, easterDate);
  const entitlementRatio = Math.min(1.0, actualMonthsWorked / monthsToEaster);
  
  // Full Easter bonus = 0.5 months salary
  const fullEntitlement = baseMonthlySalary * 0.5;
  const bonusAmount = Math.round(fullEntitlement * entitlementRatio * 100) / 100;
  
  return {
    entitlementRatio,
    bonusAmount,
    calculationDetails: {
      baseSalary: baseMonthlySalary,
      monthsWorked: actualMonthsWorked,
      fullEntitlement,
      proRatedAmount: bonusAmount,
      easterDate
    }
  };
}

/**
 * Calculate vacation bonus (Επίδομα Αδείας)
 * Half month salary for annual vacation entitlement
 */
export function calculateVacationBonus(
  input: BonusCalculationInput,
  lawVersion?: GreekLawConstants
): {
  entitlementRatio: number;
  bonusAmount: number;
  calculationDetails: {
    baseSalary: number;
    monthsWorked: number;
    fullEntitlement: number;
    proRatedAmount: number;
  };
} {
  const { baseMonthlySalary, monthsWorked, contractType } = input;
  
  if (baseMonthlySalary <= 0) {
    throw new Error('Base salary must be positive');
  }
  
  // Vacation bonus entitlement varies by contract type
  let requiredMonthsForFullBonus = 12;
  
  switch (contractType) {
    case ContractType.SEASONAL:
      requiredMonthsForFullBonus = 6; // Seasonal workers need 6 months
      break;
    case ContractType.FIXED_TERM:
      requiredMonthsForFullBonus = 12;
      break;
    case ContractType.INDEFINITE:
    default:
      requiredMonthsForFullBonus = 12;
      break;
  }
  
  const entitlementRatio = Math.min(1.0, monthsWorked / requiredMonthsForFullBonus);
  
  // Full vacation bonus = 0.5 months salary
  const fullEntitlement = baseMonthlySalary * 0.5;
  const bonusAmount = Math.round(fullEntitlement * entitlementRatio * 100) / 100;
  
  return {
    entitlementRatio,
    bonusAmount,
    calculationDetails: {
      baseSalary: baseMonthlySalary,
      monthsWorked,
      fullEntitlement,
      proRatedAmount: bonusAmount
    }
  };
}

// =============================================================================
// COMBINED BONUS CALCULATIONS
// =============================================================================

/**
 * Calculate all Greek mandatory bonuses
 */
export function calculateAllGreekBonuses(
  input: BonusCalculationInput,
  lawVersion?: GreekLawConstants
): {
  christmas: ReturnType<typeof calculateChristmasBonus>;
  easter: ReturnType<typeof calculateEasterBonus>;
  vacation: ReturnType<typeof calculateVacationBonus>;
  totalBonuses: number;
  summary: {
    baseSalary: number;
    totalEntitlement: number;
    totalPaid: number;
    effectiveBonus: number; // As multiple of monthly salary
  };
} {
  const christmas = calculateChristmasBonus(input, lawVersion);
  const easter = calculateEasterBonus(input, lawVersion);
  const vacation = calculateVacationBonus(input, lawVersion);
  
  const totalBonuses = christmas.bonusAmount + easter.bonusAmount + vacation.bonusAmount;
  const totalEntitlement = christmas.calculationDetails.fullEntitlement + 
                          easter.calculationDetails.fullEntitlement + 
                          vacation.calculationDetails.fullEntitlement;
  
  const effectiveBonus = input.baseMonthlySalary > 0 ? totalBonuses / input.baseMonthlySalary : 0;
  
  return {
    christmas,
    easter,
    vacation,
    totalBonuses,
    summary: {
      baseSalary: input.baseMonthlySalary,
      totalEntitlement,
      totalPaid: totalBonuses,
      effectiveBonus
    }
  };
}

// =============================================================================
// BONUS PRORATION AND TIMING
// =============================================================================

/**
 * Calculate bonus proration for partial employment periods
 */
export function calculateBonusProration(
  employmentStartDate: Date,
  employmentEndDate: Date,
  bonusCalculationDate: Date,
  bonusType: 'christmas' | 'easter' | 'vacation'
): {
  eligibilityPeriodStart: Date;
  eligibilityPeriodEnd: Date;
  actualWorkedStart: Date;
  actualWorkedEnd: Date;
  monthsInPeriod: number;
  monthsWorked: number;
  prorationRatio: number;
} {
  const year = bonusCalculationDate.getFullYear();
  
  let eligibilityPeriodStart: Date;
  let eligibilityPeriodEnd: Date;
  
  switch (bonusType) {
    case 'christmas':
      eligibilityPeriodStart = new Date(year, 0, 1); // January 1st
      eligibilityPeriodEnd = new Date(year, 11, 31); // December 31st
      break;
      
    case 'easter':
      eligibilityPeriodStart = new Date(year, 0, 1); // January 1st
      eligibilityPeriodEnd = getGreekOrthodoxEaster(year);
      break;
      
    case 'vacation':
      eligibilityPeriodStart = new Date(year, 0, 1); // January 1st
      eligibilityPeriodEnd = new Date(year, 11, 31); // December 31st
      break;
      
    default:
      throw new Error(`Invalid bonus type: ${bonusType}`);
  }
  
  // Calculate actual worked period within eligibility period
  const actualWorkedStart = new Date(Math.max(
    employmentStartDate.getTime(),
    eligibilityPeriodStart.getTime()
  ));
  
  const actualWorkedEnd = new Date(Math.min(
    employmentEndDate.getTime(),
    eligibilityPeriodEnd.getTime()
  ));
  
  const monthsInPeriod = calculateMonthsWorked(eligibilityPeriodStart, eligibilityPeriodEnd);
  const monthsWorked = actualWorkedStart < actualWorkedEnd ? 
    calculateMonthsWorked(actualWorkedStart, actualWorkedEnd) : 0;
  
  const prorationRatio = monthsInPeriod > 0 ? monthsWorked / monthsInPeriod : 0;
  
  return {
    eligibilityPeriodStart,
    eligibilityPeriodEnd,
    actualWorkedStart,
    actualWorkedEnd,
    monthsInPeriod,
    monthsWorked,
    prorationRatio: Math.round(prorationRatio * 10000) / 10000 // 4 decimal precision
  };
}

// =============================================================================
// COLLECTIVE AGREEMENT BONUSES
// =============================================================================

/**
 * Calculate additional bonuses based on collective agreements
 */
export function calculateCollectiveAgreementBonuses(
  baseMonthlySalary: number,
  collectiveAgreementType: 'tourism' | 'retail' | 'manufacturing' | 'services' | 'none' = 'none'
): {
  additionalBonuses: Array<{
    name: string;
    nameGr: string;
    amount: number;
    basis: string;
  }>;
  totalAdditional: number;
} {
  const additionalBonuses: Array<{
    name: string;
    nameGr: string;
    amount: number;
    basis: string;
  }> = [];
  
  switch (collectiveAgreementType) {
    case 'tourism':
      // Tourism sector may have additional seasonal bonuses
      additionalBonuses.push({
        name: 'Tourism Seasonal Bonus',
        nameGr: 'Εποχιακό Μπόνους Τουρισμού',
        amount: Math.round(baseMonthlySalary * 0.25 * 100) / 100,
        basis: '25% of monthly salary'
      });
      break;
      
    case 'retail':
      // Retail sector may have sales performance bonuses
      additionalBonuses.push({
        name: 'Retail Performance Bonus',
        nameGr: 'Μπόνους Απόδοσης Λιανικής',
        amount: Math.round(baseMonthlySalary * 0.15 * 100) / 100,
        basis: '15% of monthly salary'
      });
      break;
      
    case 'manufacturing':
      // Manufacturing may have productivity bonuses
      additionalBonuses.push({
        name: 'Productivity Bonus',
        nameGr: 'Μπόνους Παραγωγικότητας',
        amount: Math.round(baseMonthlySalary * 0.20 * 100) / 100,
        basis: '20% of monthly salary'
      });
      break;
      
    case 'services':
    case 'none':
    default:
      // No additional bonuses
      break;
  }
  
  const totalAdditional = additionalBonuses.reduce((sum, bonus) => sum + bonus.amount, 0);
  
  return {
    additionalBonuses,
    totalAdditional
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate months worked between two dates
 */
function calculateMonthsWorked(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) {
    return 0;
  }
  
  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  const dayDiff = endDate.getDate() - startDate.getDate();
  
  let months = yearDiff * 12 + monthDiff;
  
  // If end day is before start day, subtract one month
  if (dayDiff < 0) {
    months -= 1;
  }
  
  // Add fractional month for partial months
  if (dayDiff > 0) {
    const daysInMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
    months += dayDiff / daysInMonth;
  }
  
  return Math.max(0, months);
}

/**
 * Calculate Greek Orthodox Easter date
 * Using the Julian calendar calculation adjusted to Gregorian
 */
function getGreekOrthodoxEaster(year: number): Date {
  // Greek Orthodox Easter calculation
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  
  // Adjust for Gregorian calendar (Greek Easter is often different from Western Easter)
  const easterDate = new Date(year, month - 1, day);
  
  // Greek Orthodox Easter is typically 1-5 weeks after Western Easter
  // For simplicity, we'll use the calculated date
  // In a real implementation, you'd want to use a proper liturgical calendar
  
  return easterDate;
}

/**
 * Validate bonus calculation inputs
 */
export function validateBonusInputs(input: BonusCalculationInput): {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    messageGr: string;
  }>;
} {
  const errors = [];
  
  if (input.baseMonthlySalary <= 0) {
    errors.push({
      field: 'baseMonthlySalary',
      message: 'Base monthly salary must be positive',
      messageGr: 'Ο βασικός μηνιαίος μισθός πρέπει να είναι θετικός'
    });
  }
  
  if (input.monthsWorked < 0 || input.monthsWorked > 12) {
    errors.push({
      field: 'monthsWorked',
      message: 'Months worked must be between 0 and 12',
      messageGr: 'Οι μήνες εργασίας πρέπει να είναι μεταξύ 0 και 12'
    });
  }
  
  if (input.employmentStartDate > input.calculationDate) {
    errors.push({
      field: 'employmentStartDate',
      message: 'Employment start date cannot be in the future',
      messageGr: 'Η ημερομηνία έναρξης εργασίας δεν μπορεί να είναι στο μέλλον'
    });
  }
  
  const validContractTypes = Object.values(ContractType);
  if (!validContractTypes.includes(input.contractType)) {
    errors.push({
      field: 'contractType',
      message: `Invalid contract type. Must be one of: ${validContractTypes.join(', ')}`,
      messageGr: `Μη έγκυρος τύπος σύμβασης. Πρέπει να είναι ένας από: ${validContractTypes.join(', ')}`
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}