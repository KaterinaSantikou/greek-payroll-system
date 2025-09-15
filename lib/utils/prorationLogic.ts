/**
 * Centralized Proration Logic
 * 
 * Standardized proration calculations for all payroll components including
 * salary, vacation, bonuses, and mid-period employment changes.
 */

import { safeAdd, safeSubtract, safeMultiply, safeDivide, PayrollMathError } from './safeMath.js';

// =============================================================================
// PRORATION TYPES
// =============================================================================

export interface ProrationPeriod {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  workingDays: number;
}

export interface ProrationResult {
  fullAmount: number;
  proRatedAmount: number;
  prorationFactor: number;
  daysWorked: number;
  totalDays: number;
  calculationMethod: 'calendar' | 'working' | 'monthly';
  details: {
    periodStart: Date;
    periodEnd: Date;
    employmentStart: Date;
    employmentEnd?: Date;
  };
}

export interface EmploymentChange {
  type: 'hire' | 'termination' | 'leave_start' | 'leave_end' | 'salary_change';
  date: Date;
  previousAmount?: number;
  newAmount?: number;
}

// =============================================================================
// CORE PRORATION CALCULATIONS
// =============================================================================

/**
 * Calculate proration factor based on calendar days
 */
export function calculateCalendarProration(
  periodStart: Date,
  periodEnd: Date,
  employmentStart: Date,
  employmentEnd?: Date
): ProrationResult['prorationFactor'] {
  const operation = 'calculateCalendarProration';
  
  // Validate dates
  if (periodStart >= periodEnd) {
    throw new PayrollMathError(
      'Period start date must be before end date',
      operation,
      [periodStart, periodEnd, employmentStart, employmentEnd]
    );
  }
  
  if (employmentStart > periodEnd) {
    return 0; // Employee didn't work during this period
  }
  
  // Calculate actual working period within the payroll period
  const actualStart = employmentStart > periodStart ? employmentStart : periodStart;
  const actualEnd = (employmentEnd && employmentEnd < periodEnd) ? employmentEnd : periodEnd;
  
  if (actualStart >= actualEnd) {
    return 0; // No overlap
  }
  
  // Calculate days
  const totalPeriodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const workedDays = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));
  
  const prorationFactor = safeDivide(workedDays, totalPeriodDays, 'calendar proration');
  
  return Math.min(1, Math.max(0, prorationFactor)); // Clamp between 0 and 1
}

/**
 * Calculate proration factor based on working days (excluding weekends)
 */
export function calculateWorkingDaysProration(
  periodStart: Date,
  periodEnd: Date,
  employmentStart: Date,
  employmentEnd?: Date
): ProrationResult['prorationFactor'] {
  const operation = 'calculateWorkingDaysProration';
  
  // Validate dates
  if (periodStart >= periodEnd) {
    throw new PayrollMathError(
      'Period start date must be before end date',
      operation,
      [periodStart, periodEnd, employmentStart, employmentEnd]
    );
  }
  
  const actualStart = employmentStart > periodStart ? employmentStart : periodStart;
  const actualEnd = (employmentEnd && employmentEnd < periodEnd) ? employmentEnd : periodEnd;
  
  if (actualStart >= actualEnd) {
    return 0;
  }
  
  const totalWorkingDays = calculateWorkingDays(periodStart, periodEnd);
  const workedWorkingDays = calculateWorkingDays(actualStart, actualEnd);
  
  if (totalWorkingDays === 0) {
    return 0;
  }
  
  const prorationFactor = safeDivide(workedWorkingDays, totalWorkingDays, 'working days proration');
  
  return Math.min(1, Math.max(0, prorationFactor));
}

/**
 * Calculate number of working days (Monday-Friday) between two dates
 */
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calculate monthly proration (standard 30-day month)
 */
export function calculateMonthlyProration(
  periodStart: Date,
  periodEnd: Date,
  employmentStart: Date,
  employmentEnd?: Date
): ProrationResult['prorationFactor'] {
  const operation = 'calculateMonthlyProration';
  
  // Use 30-day month standard for Greek payroll
  const standardMonthDays = 30;
  
  const actualStart = employmentStart > periodStart ? employmentStart : periodStart;
  const actualEnd = (employmentEnd && employmentEnd < periodEnd) ? employmentEnd : periodEnd;
  
  if (actualStart >= actualEnd) {
    return 0;
  }
  
  // Calculate days in the month
  const daysInMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate();
  const workedDays = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));
  
  // Use actual month days or 30-day standard, whichever is more favorable to employee
  const divisor = Math.max(daysInMonth, standardMonthDays);
  const prorationFactor = safeDivide(workedDays, divisor, 'monthly proration');
  
  return Math.min(1, Math.max(0, prorationFactor));
}

// =============================================================================
// MAIN PRORATION FUNCTION
// =============================================================================

/**
 * Calculate prorated amount with full details
 */
export function calculateProratedAmount(
  fullAmount: number,
  periodStart: Date,
  periodEnd: Date,
  employmentStart: Date,
  employmentEnd?: Date,
  method: 'calendar' | 'working' | 'monthly' = 'calendar'
): ProrationResult {
  const operation = 'calculateProratedAmount';
  
  // Validate amount
  if (typeof fullAmount !== 'number' || isNaN(fullAmount) || fullAmount < 0) {
    throw new PayrollMathError(
      `Full amount must be a non-negative number: ${fullAmount}`,
      operation,
      [fullAmount, periodStart, periodEnd, employmentStart, employmentEnd]
    );
  }
  
  let prorationFactor: number;
  
  switch (method) {
    case 'working':
      prorationFactor = calculateWorkingDaysProration(periodStart, periodEnd, employmentStart, employmentEnd);
      break;
    case 'monthly':
      prorationFactor = calculateMonthlyProration(periodStart, periodEnd, employmentStart, employmentEnd);
      break;
    case 'calendar':
    default:
      prorationFactor = calculateCalendarProration(periodStart, periodEnd, employmentStart, employmentEnd);
      break;
  }
  
  const proRatedAmount = safeMultiply(fullAmount, prorationFactor, 'proration calculation');
  
  // Calculate days for reporting
  const actualStart = employmentStart > periodStart ? employmentStart : periodStart;
  const actualEnd = (employmentEnd && employmentEnd < periodEnd) ? employmentEnd : periodEnd;
  const daysWorked = Math.max(0, Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    fullAmount,
    proRatedAmount,
    prorationFactor,
    daysWorked,
    totalDays,
    calculationMethod: method,
    details: {
      periodStart,
      periodEnd,
      employmentStart,
      employmentEnd
    }
  };
}

// =============================================================================
// SPECIALIZED PRORATION FUNCTIONS
// =============================================================================

/**
 * Calculate prorated salary for mid-month hire/termination
 */
export function calculateProratedSalary(
  monthlySalary: number,
  periodStart: Date,
  periodEnd: Date,
  employmentStart: Date,
  employmentEnd?: Date
): ProrationResult {
  return calculateProratedAmount(
    monthlySalary,
    periodStart,
    periodEnd,
    employmentStart,
    employmentEnd,
    'calendar'
  );
}

/**
 * Calculate prorated vacation bonus
 */
export function calculateProratedVacationBonus(
  fullVacationBonus: number,
  yearStart: Date,
  yearEnd: Date,
  employmentStart: Date,
  employmentEnd?: Date
): ProrationResult {
  return calculateProratedAmount(
    fullVacationBonus,
    yearStart,
    yearEnd,
    employmentStart,
    employmentEnd,
    'working'
  );
}

/**
 * Calculate prorated Christmas/Easter bonus
 */
export function calculateProratedBonus(
  fullBonus: number,
  bonusEligibilityStart: Date,
  bonusEligibilityEnd: Date,
  employmentStart: Date,
  employmentEnd?: Date
): ProrationResult {
  return calculateProratedAmount(
    fullBonus,
    bonusEligibilityStart,
    bonusEligibilityEnd,
    employmentStart,
    employmentEnd,
    'calendar'
  );
}

/**
 * Calculate prorated severance pay
 */
export function calculateProratedSeverance(
  fullSeveranceAmount: number,
  serviceStart: Date,
  serviceEnd: Date,
  lastYearStart: Date
): ProrationResult {
  // Severance is typically calculated for the last year of service
  return calculateProratedAmount(
    fullSeveranceAmount,
    lastYearStart,
    serviceEnd,
    Math.max(serviceStart, lastYearStart),
    serviceEnd,
    'calendar'
  );
}

// =============================================================================
// MID-PERIOD EMPLOYMENT CHANGES
// =============================================================================

/**
 * Handle multiple employment changes within a single period
 */
export function calculateMultipleChangesProration(
  changes: EmploymentChange[],
  periodStart: Date,
  periodEnd: Date
): Array<{
  period: { start: Date; end: Date };
  amount: number;
  prorationResult: ProrationResult;
}> {
  const operation = 'calculateMultipleChangesProration';
  
  if (changes.length === 0) {
    throw new PayrollMathError(
      'At least one employment change is required',
      operation,
      [changes]
    );
  }
  
  // Sort changes by date
  const sortedChanges = [...changes].sort((a, b) => a.date.getTime() - b.date.getTime());
  const results: Array<{
    period: { start: Date; end: Date };
    amount: number;
    prorationResult: ProrationResult;
  }> = [];
  
  let currentStart = periodStart;
  let currentAmount = sortedChanges[0].previousAmount || 0;
  
  for (let i = 0; i < sortedChanges.length; i++) {
    const change = sortedChanges[i];
    const segmentEnd = change.date;
    
    // Calculate proration for the current segment if it's within the period
    if (currentStart < segmentEnd && currentAmount > 0) {
      const segmentEnd_adj = segmentEnd > periodEnd ? periodEnd : segmentEnd;
      
      const prorationResult = calculateProratedAmount(
        currentAmount,
        currentStart,
        segmentEnd_adj,
        currentStart,
        segmentEnd_adj,
        'calendar'
      );
      
      results.push({
        period: { start: currentStart, end: segmentEnd_adj },
        amount: currentAmount,
        prorationResult
      });
    }
    
    // Update for next segment
    currentStart = change.date;
    currentAmount = change.newAmount || currentAmount;
  }
  
  // Handle final segment if there's remaining period
  if (currentStart < periodEnd && currentAmount > 0) {
    const prorationResult = calculateProratedAmount(
      currentAmount,
      currentStart,
      periodEnd,
      currentStart,
      periodEnd,
      'calendar'
    );
    
    results.push({
      period: { start: currentStart, end: periodEnd },
      amount: currentAmount,
      prorationResult
    });
  }
  
  return results;
}

// =============================================================================
// SPECIAL CASES
// =============================================================================

/**
 * Handle 5-day to 6-day work week conversion
 */
export function convertWorkWeekProration(
  amount: number,
  fromDays: 5 | 6,
  toDays: 5 | 6
): number {
  const operation = 'convertWorkWeekProration';
  
  if (fromDays === toDays) {
    return amount;
  }
  
  if (fromDays !== 5 && fromDays !== 6) {
    throw new PayrollMathError(
      `Invalid 'from' work days: ${fromDays}. Must be 5 or 6`,
      operation,
      [amount, fromDays, toDays]
    );
  }
  
  if (toDays !== 5 && toDays !== 6) {
    throw new PayrollMathError(
      `Invalid 'to' work days: ${toDays}. Must be 5 or 6`,
      operation,
      [amount, fromDays, toDays]
    );
  }
  
  const conversionFactor = safeDivide(toDays, fromDays, 'work week conversion');
  return safeMultiply(amount, conversionFactor, 'work week conversion');
}

/**
 * Handle split shifts across midnight
 */
export function calculateSplitShiftProration(
  shiftStart: Date,
  shiftEnd: Date,
  regularRate: number,
  nightRate: number,
  nightStartHour: number = 22,
  nightEndHour: number = 6
): {
  regularHours: number;
  nightHours: number;
  regularPay: number;
  nightPay: number;
  totalPay: number;
} {
  const operation = 'calculateSplitShiftProration';
  
  if (shiftStart >= shiftEnd) {
    throw new PayrollMathError(
      'Shift start must be before shift end',
      operation,
      [shiftStart, shiftEnd, regularRate, nightRate]
    );
  }
  
  const totalHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
  let regularHours = 0;
  let nightHours = 0;
  
  // Check each hour of the shift
  const current = new Date(shiftStart);
  while (current < shiftEnd) {
    const hour = current.getHours();
    const nextHour = new Date(current.getTime() + 60 * 60 * 1000);
    const segmentEnd = nextHour > shiftEnd ? shiftEnd : nextHour;
    const segmentHours = (segmentEnd.getTime() - current.getTime()) / (1000 * 60 * 60);
    
    if (hour >= nightStartHour || hour < nightEndHour) {
      nightHours = safeAdd(nightHours, segmentHours, 'night hours calculation');
    } else {
      regularHours = safeAdd(regularHours, segmentHours, 'regular hours calculation');
    }
    
    current.setTime(nextHour.getTime());
  }
  
  const regularPay = safeMultiply(regularHours, regularRate, 'regular pay calculation');
  const nightPay = safeMultiply(nightHours, nightRate, 'night pay calculation');
  const totalPay = safeAdd(regularPay, nightPay, 'total shift pay');
  
  return {
    regularHours,
    nightHours,
    regularPay,
    nightPay,
    totalPay
  };
}

/**
 * Calculate unpaid leave deductions
 */
export function calculateUnpaidLeaveDeduction(
  monthlySalary: number,
  periodStart: Date,
  periodEnd: Date,
  leaveStart: Date,
  leaveEnd: Date
): {
  deductionAmount: number;
  daysDeducted: number;
  prorationResult: ProrationResult;
} {
  const operation = 'calculateUnpaidLeaveDeduction';
  
  // Find overlap between leave period and pay period
  const overlapStart = new Date(Math.max(periodStart.getTime(), leaveStart.getTime()));
  const overlapEnd = new Date(Math.min(periodEnd.getTime(), leaveEnd.getTime()));
  
  if (overlapStart >= overlapEnd) {
    return {
      deductionAmount: 0,
      daysDeducted: 0,
      prorationResult: calculateProratedAmount(0, periodStart, periodEnd, periodStart, periodEnd, 'calendar')
    };
  }
  
  // Calculate daily rate
  const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const dailyRate = safeDivide(monthlySalary, daysInPeriod, 'daily rate calculation');
  
  // Calculate days to deduct
  const daysDeducted = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
  
  const deductionAmount = safeMultiply(dailyRate, daysDeducted, 'unpaid leave deduction');
  
  const prorationResult = calculateProratedAmount(
    deductionAmount,
    overlapStart,
    overlapEnd,
    overlapStart,
    overlapEnd,
    'calendar'
  );
  
  return {
    deductionAmount,
    daysDeducted,
    prorationResult
  };
}