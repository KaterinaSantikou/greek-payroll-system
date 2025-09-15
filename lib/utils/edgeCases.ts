/**
 * Edge Cases Handler for Payroll Calculations
 * 
 * Handles complex payroll scenarios including mid-period employment changes,
 * shift conversions, split shifts, and other edge cases.
 */

import { 
  safeAdd, 
  safeSubtract, 
  safeMultiply, 
  safeDivide, 
  PayrollMathError 
} from './safeMath.js';

import {
  calculateProratedAmount,
  calculateMultipleChangesProration,
  calculateSplitShiftProration,
  calculateUnpaidLeaveDeduction,
  convertWorkWeekProration,
  type EmploymentChange,
  type ProrationResult
} from './prorationLogic.js';

// =============================================================================
// EDGE CASE TYPES
// =============================================================================

export interface HireTerminationCase {
  type: 'hire' | 'termination';
  employeeId: string;
  effectiveDate: Date;
  salary: number;
  periodStart: Date;
  periodEnd: Date;
  severanceAmount?: number;
  noticePeriod?: number; // days
}

export interface ShiftConversionCase {
  fromPattern: '5-day' | '6-day';
  toPattern: '5-day' | '6-day';
  conversionDate: Date;
  baseSalary: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface SplitShiftCase {
  shiftStart: Date;
  shiftEnd: Date;
  breakStart?: Date;
  breakEnd?: Date;
  regularRate: number;
  nightRate: number;
  overtimeRate: number;
  nightStartHour?: number;
  nightEndHour?: number;
}

export interface UnpaidLeaveCase {
  employeeId: string;
  baseSalary: number;
  leaveStart: Date;
  leaveEnd: Date;
  periodStart: Date;
  periodEnd: Date;
  allowPartialDeduction: boolean;
}

export interface NegativeBalanceCase {
  employeeId: string;
  grossAmount: number;
  deductions: number;
  allowNegativeBalance: boolean;
  minimumNetPay?: number;
}

// =============================================================================
// HIRE/TERMINATION MID-PERIOD HANDLING
// =============================================================================

/**
 * Calculate salary adjustments for mid-period hire or termination
 */
export function handleHireTerminationMidPeriod(
  hireTermCase: HireTerminationCase
): {
  baseSalaryAdjustment: number;
  severancePayment: number;
  noticePeriodPay: number;
  vacationAccrual: number;
  bonusAdjustments: {
    christmas: number;
    easter: number;
    vacation: number;
  };
  prorationDetails: ProrationResult;
} {
  const { 
    type, 
    salary, 
    effectiveDate, 
    periodStart, 
    periodEnd, 
    severanceAmount = 0,
    noticePeriod = 0 
  } = hireTermCase;

  let employmentStart = effectiveDate;
  let employmentEnd = periodEnd;

  if (type === 'hire') {
    // New hire during the period
    employmentStart = effectiveDate;
    employmentEnd = periodEnd;
  } else if (type === 'termination') {
    // Termination during the period
    employmentStart = periodStart;
    employmentEnd = effectiveDate;
  }

  // Calculate prorated base salary
  const prorationResult = calculateProratedAmount(
    salary,
    periodStart,
    periodEnd,
    employmentStart,
    employmentEnd,
    'calendar'
  );

  // Calculate notice period pay (if applicable for termination)
  let noticePeriodPay = 0;
  if (type === 'termination' && noticePeriod > 0) {
    const dailyRate = safeDivide(salary, 30); // 30-day month standard
    noticePeriodPay = safeMultiply(dailyRate, noticePeriod);
  }

  // Calculate vacation accrual adjustment
  const monthsWorked = calculateMonthsInPeriod(employmentStart, employmentEnd);
  const vacationAccrualRate = safeDivide(1.67, 12); // 20 days per year / 12 months
  const vacationAccrual = safeMultiply(salary, safeMultiply(monthsWorked, vacationAccrualRate));

  // Calculate bonus adjustments (pro-rated based on employment period)
  const yearStart = new Date(effectiveDate.getFullYear(), 0, 1);
  const yearEnd = new Date(effectiveDate.getFullYear(), 11, 31);
  
  const bonusEmploymentStart = type === 'hire' ? effectiveDate : yearStart;
  const bonusEmploymentEnd = type === 'termination' ? effectiveDate : yearEnd;

  const christmasProration = calculateProratedAmount(
    salary, // Full Christmas bonus = 1 month
    yearStart,
    yearEnd,
    bonusEmploymentStart,
    bonusEmploymentEnd,
    'calendar'
  );

  const easterDate = calculateEasterDate(effectiveDate.getFullYear());
  const easterProration = calculateProratedAmount(
    safeMultiply(salary, 0.5), // Easter bonus = 0.5 months
    yearStart,
    easterDate,
    bonusEmploymentStart,
    bonusEmploymentEnd,
    'calendar'
  );

  const vacationProration = calculateProratedAmount(
    safeMultiply(salary, 0.5), // Vacation bonus = 0.5 months
    yearStart,
    yearEnd,
    bonusEmploymentStart,
    bonusEmploymentEnd,
    'working'
  );

  return {
    baseSalaryAdjustment: prorationResult.proRatedAmount,
    severancePayment: severanceAmount,
    noticePeriodPay,
    vacationAccrual,
    bonusAdjustments: {
      christmas: christmasProration.proRatedAmount,
      easter: easterProration.proRatedAmount,
      vacation: vacationProration.proRatedAmount
    },
    prorationDetails: prorationResult
  };
}

// =============================================================================
// 5-DAY TO 6-DAY WORK WEEK CONVERSION
// =============================================================================

/**
 * Handle conversion between 5-day and 6-day work weeks
 */
export function handleWorkWeekConversion(
  conversionCase: ShiftConversionCase
): {
  periodBeforeConversion: {
    salary: number;
    workingDays: number;
    dailyRate: number;
  };
  periodAfterConversion: {
    salary: number;
    workingDays: number;
    dailyRate: number;
  };
  totalPeriodSalary: number;
  conversionAdjustment: number;
} {
  const { 
    fromPattern, 
    toPattern, 
    conversionDate, 
    baseSalary, 
    periodStart, 
    periodEnd 
  } = conversionCase;

  // Calculate days before and after conversion
  const daysBeforeConversion = Math.max(0, Math.ceil(
    (conversionDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  ));
  
  const daysAfterConversion = Math.max(0, Math.ceil(
    (periodEnd.getTime() - conversionDate.getTime()) / (1000 * 60 * 60 * 24)
  ));

  const totalPeriodDays = daysBeforeConversion + daysAfterConversion;

  // Calculate working days for each pattern
  const fromWorkingDays = fromPattern === '5-day' ? 5 : 6;
  const toWorkingDays = toPattern === '5-day' ? 5 : 6;

  // Calculate salary adjustments for each period
  const beforeConversionSalary = convertWorkWeekProration(
    safeMultiply(baseSalary, safeDivide(daysBeforeConversion, totalPeriodDays)),
    6, // Base calculation on 6-day week
    fromWorkingDays
  );

  const afterConversionSalary = convertWorkWeekProration(
    safeMultiply(baseSalary, safeDivide(daysAfterConversion, totalPeriodDays)),
    6, // Base calculation on 6-day week
    toWorkingDays
  );

  const totalPeriodSalary = safeAdd(beforeConversionSalary, afterConversionSalary);
  const conversionAdjustment = safeSubtract(totalPeriodSalary, baseSalary);

  return {
    periodBeforeConversion: {
      salary: beforeConversionSalary,
      workingDays: fromWorkingDays,
      dailyRate: safeDivide(baseSalary, fromWorkingDays * 4.33) // Average weeks per month
    },
    periodAfterConversion: {
      salary: afterConversionSalary,
      workingDays: toWorkingDays,
      dailyRate: safeDivide(baseSalary, toWorkingDays * 4.33)
    },
    totalPeriodSalary,
    conversionAdjustment
  };
}

// =============================================================================
// SPLIT SHIFT ACROSS MIDNIGHT HANDLING
// =============================================================================

/**
 * Handle split shifts that cross midnight with proper time calculations
 */
export function handleSplitShiftAcrossMidnight(
  splitShiftCase: SplitShiftCase
): {
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  totalHours: number;
  regularPay: number;
  overtimePay: number;
  nightPremium: number;
  totalPay: number;
  timeBreakdown: Array<{
    period: string;
    startTime: Date;
    endTime: Date;
    hours: number;
    rate: number;
    pay: number;
    type: 'regular' | 'overtime' | 'night';
  }>;
} {
  const { 
    shiftStart, 
    shiftEnd, 
    breakStart, 
    breakEnd, 
    regularRate, 
    nightRate, 
    overtimeRate,
    nightStartHour = 22,
    nightEndHour = 6 
  } = splitShiftCase;

  // Handle break time if specified
  let effectiveShiftEnd = shiftEnd;
  let breakDuration = 0;
  
  if (breakStart && breakEnd) {
    breakDuration = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
  }

  // Use existing split shift calculation from prorationLogic
  const splitResult = calculateSplitShiftProration(
    shiftStart,
    effectiveShiftEnd,
    regularRate,
    nightRate,
    nightStartHour,
    nightEndHour
  );

  // Adjust for break time
  const adjustedRegularHours = Math.max(0, splitResult.regularHours - breakDuration);
  const adjustedNightHours = Math.max(0, splitResult.nightHours);
  
  const totalWorkedHours = adjustedRegularHours + adjustedNightHours;

  // Calculate overtime (hours over 8 per day)
  const standardDailyHours = 8;
  let regularHours = Math.min(adjustedRegularHours, standardDailyHours);
  let overtimeHours = Math.max(0, totalWorkedHours - standardDailyHours);
  
  // Adjust night hours if they contribute to overtime
  const nightHoursRegular = Math.min(adjustedNightHours, Math.max(0, standardDailyHours - regularHours));
  const nightHoursOvertime = Math.max(0, adjustedNightHours - nightHoursRegular);
  
  // Calculate payments
  const regularPay = safeMultiply(regularHours, regularRate);
  const overtimePay = safeMultiply(overtimeHours, overtimeRate);
  const nightPremium = safeMultiply(
    adjustedNightHours, 
    safeMultiply(regularRate, 0.25) // 25% night premium
  );
  
  const totalPay = safeAdd(safeAdd(regularPay, overtimePay), nightPremium);

  // Create time breakdown for audit trail
  const timeBreakdown = [
    {
      period: 'Regular Hours',
      startTime: shiftStart,
      endTime: new Date(shiftStart.getTime() + (regularHours * 60 * 60 * 1000)),
      hours: regularHours,
      rate: regularRate,
      pay: regularPay,
      type: 'regular' as const
    },
    {
      period: 'Overtime Hours', 
      startTime: new Date(shiftStart.getTime() + (standardDailyHours * 60 * 60 * 1000)),
      endTime: shiftEnd,
      hours: overtimeHours,
      rate: overtimeRate,
      pay: overtimePay,
      type: 'overtime' as const
    },
    {
      period: 'Night Hours Premium',
      startTime: shiftStart,
      endTime: shiftEnd,
      hours: adjustedNightHours,
      rate: safeMultiply(regularRate, 0.25),
      pay: nightPremium,
      type: 'night' as const
    }
  ];

  return {
    regularHours,
    overtimeHours,
    nightHours: adjustedNightHours,
    totalHours: totalWorkedHours,
    regularPay,
    overtimePay,
    nightPremium,
    totalPay,
    timeBreakdown
  };
}

// =============================================================================
// UNPAID LEAVE DEDUCTION HANDLING
// =============================================================================

/**
 * Handle unpaid leave deductions with partial period support
 */
export function handleUnpaidLeaveDeductions(
  leaveCase: UnpaidLeaveCase
): {
  deductionAmount: number;
  effectiveDaysLost: number;
  adjustedSalary: number;
  partialPeriodHandling: {
    fullDeduction: boolean;
    prorationApplied: boolean;
    deductionMethod: string;
  };
  prorationResult: ProrationResult;
} {
  const { 
    baseSalary, 
    leaveStart, 
    leaveEnd, 
    periodStart, 
    periodEnd, 
    allowPartialDeduction 
  } = leaveCase;

  // Use centralized unpaid leave calculation
  const leaveResult = calculateUnpaidLeaveDeduction(
    baseSalary,
    periodStart,
    periodEnd,
    leaveStart,
    leaveEnd
  );

  // Handle partial period logic
  let fullDeduction = true;
  let prorationApplied = false;
  let deductionMethod = 'full_days';

  if (!allowPartialDeduction) {
    // Round up to full days if partial deductions not allowed
    const roundedDays = Math.ceil(leaveResult.daysDeducted);
    const dailyRate = safeDivide(baseSalary, 30); // 30-day month
    leaveResult.deductionAmount = safeMultiply(dailyRate, roundedDays);
    fullDeduction = false;
    deductionMethod = 'rounded_up_days';
  } else {
    prorationApplied = true;
    deductionMethod = 'proportional_hours';
  }

  const adjustedSalary = safeSubtract(baseSalary, leaveResult.deductionAmount);

  return {
    deductionAmount: leaveResult.deductionAmount,
    effectiveDaysLost: leaveResult.daysDeducted,
    adjustedSalary,
    partialPeriodHandling: {
      fullDeduction,
      prorationApplied,
      deductionMethod
    },
    prorationResult: leaveResult.prorationResult
  };
}

// =============================================================================
// NEGATIVE BALANCE PREVENTION
// =============================================================================

/**
 * Prevent negative net pay by adjusting deductions
 */
export function handleNegativeBalancePrevention(
  balanceCase: NegativeBalanceCase
): {
  originalNetPay: number;
  adjustedNetPay: number;
  deductionReduction: number;
  adjustedDeductions: number;
  preventionApplied: boolean;
  adjustmentReason: string;
  legalCompliance: {
    meetsMinimumWage: boolean;
    deductionLimitCompliant: boolean;
    adjustmentJustification: string;
  };
} {
  const { 
    grossAmount, 
    deductions, 
    allowNegativeBalance, 
    minimumNetPay = 0 
  } = balanceCase;

  const originalNetPay = safeSubtract(grossAmount, deductions);
  let adjustedNetPay = originalNetPay;
  let adjustedDeductions = deductions;
  let preventionApplied = false;
  let adjustmentReason = 'No adjustment needed';

  if (originalNetPay < 0 && !allowNegativeBalance) {
    // Reduce deductions to prevent negative balance
    adjustedDeductions = Math.max(0, grossAmount - minimumNetPay);
    adjustedNetPay = safeSubtract(grossAmount, adjustedDeductions);
    preventionApplied = true;
    adjustmentReason = 'Deductions reduced to prevent negative net pay';
  } else if (originalNetPay < minimumNetPay) {
    // Ensure minimum net pay is met
    adjustedDeductions = Math.max(0, grossAmount - minimumNetPay);
    adjustedNetPay = safeSubtract(grossAmount, adjustedDeductions);
    preventionApplied = true;
    adjustmentReason = `Deductions reduced to meet minimum net pay of €${minimumNetPay}`;
  }

  const deductionReduction = safeSubtract(deductions, adjustedDeductions);

  // Legal compliance checks
  const deductionRate = grossAmount > 0 ? safeDivide(adjustedDeductions, grossAmount) : 0;
  const meetsMinimumWage = adjustedNetPay >= 760; // 2024 Greek minimum wage
  const deductionLimitCompliant = deductionRate <= 0.5; // 50% maximum deduction rate

  let adjustmentJustification = 'Standard payroll calculation';
  if (preventionApplied) {
    adjustmentJustification = `Applied Greek labor law protection: ${adjustmentReason}. ` +
      `Deduction rate reduced from ${(safeDivide(deductions, grossAmount) * 100).toFixed(1)}% ` +
      `to ${(deductionRate * 100).toFixed(1)}% to comply with legal limits.`;
  }

  return {
    originalNetPay,
    adjustedNetPay: Math.max(0, adjustedNetPay),
    deductionReduction,
    adjustedDeductions,
    preventionApplied,
    adjustmentReason,
    legalCompliance: {
      meetsMinimumWage,
      deductionLimitCompliant,
      adjustmentJustification
    }
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate months between two dates with precision
 */
function calculateMonthsInPeriod(startDate: Date, endDate: Date): number {
  if (startDate >= endDate) return 0;
  
  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  const dayDiff = endDate.getDate() - startDate.getDate();
  
  let months = yearDiff * 12 + monthDiff;
  
  // Add fractional month for partial months
  if (dayDiff > 0) {
    const daysInMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
    months += dayDiff / daysInMonth;
  } else if (dayDiff < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
    months += (daysInPrevMonth + dayDiff) / daysInPrevMonth;
  }
  
  return Math.max(0, months);
}

/**
 * Calculate Greek Orthodox Easter date for a given year
 */
function calculateEasterDate(year: number): Date {
  // Simplified Easter calculation for Greek Orthodox church
  // This is an approximation - use a proper liturgical calendar for production
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  
  // Add 13 days for Julian to Gregorian conversion
  const easterDate = new Date(year, month - 1, day + 13);
  
  return easterDate;
}

/**
 * Comprehensive edge case validator
 */
export function validateEdgeCaseInputs(
  edgeCase: HireTerminationCase | ShiftConversionCase | SplitShiftCase | UnpaidLeaveCase | NegativeBalanceCase
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type-specific validations
  if ('type' in edgeCase && (edgeCase.type === 'hire' || edgeCase.type === 'termination')) {
    const hireTermCase = edgeCase as HireTerminationCase;
    
    if (hireTermCase.effectiveDate < hireTermCase.periodStart || 
        hireTermCase.effectiveDate > hireTermCase.periodEnd) {
      errors.push('Effective date must be within the payroll period');
    }
    
    if (hireTermCase.salary <= 0) {
      errors.push('Salary must be positive');
    }
    
    if (hireTermCase.type === 'termination' && hireTermCase.severanceAmount && hireTermCase.severanceAmount < 0) {
      errors.push('Severance amount cannot be negative');
    }
  }

  if ('fromPattern' in edgeCase) {
    const conversionCase = edgeCase as ShiftConversionCase;
    
    if (conversionCase.conversionDate < conversionCase.periodStart || 
        conversionCase.conversionDate > conversionCase.periodEnd) {
      errors.push('Conversion date must be within the payroll period');
    }
    
    if (conversionCase.baseSalary <= 0) {
      errors.push('Base salary must be positive');
    }
  }

  if ('shiftStart' in edgeCase) {
    const splitCase = edgeCase as SplitShiftCase;
    
    if (splitCase.shiftStart >= splitCase.shiftEnd) {
      errors.push('Shift start must be before shift end');
    }
    
    if (splitCase.regularRate <= 0 || splitCase.nightRate <= 0) {
      errors.push('Hourly rates must be positive');
    }
    
    if (splitCase.nightRate <= splitCase.regularRate) {
      warnings.push('Night rate should typically be higher than regular rate');
    }
  }

  if ('leaveStart' in edgeCase) {
    const leaveCase = edgeCase as UnpaidLeaveCase;
    
    if (leaveCase.leaveStart >= leaveCase.leaveEnd) {
      errors.push('Leave start must be before leave end');
    }
    
    if (leaveCase.baseSalary <= 0) {
      errors.push('Base salary must be positive');
    }
  }

  if ('grossAmount' in edgeCase) {
    const balanceCase = edgeCase as NegativeBalanceCase;
    
    if (balanceCase.grossAmount < 0) {
      errors.push('Gross amount cannot be negative');
    }
    
    if (balanceCase.deductions < 0) {
      errors.push('Deductions cannot be negative');
    }
    
    if (balanceCase.deductions > balanceCase.grossAmount * 2) {
      warnings.push('Deductions are unusually high compared to gross amount');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}