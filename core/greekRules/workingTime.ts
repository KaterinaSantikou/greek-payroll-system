/**
 * Greek Working Time Rules - Pure Domain Logic
 * 
 * Pure functions for calculating overtime, night premiums, Sunday work,
 * and holiday premiums based on Greek labor law working time regulations.
 */

import { 
  GreekLawConstants, 
  WorkingTimeLimits,
  PremiumRates,
  lawRegistry 
} from '../../shared/law-constants.js';
import { WorkingHours } from '../../shared/payrollDomain.js';

// =============================================================================
// OVERTIME CALCULATIONS
// =============================================================================

/**
 * Calculate overtime hours and premiums with Greek labor law tiers
 */
export function calculateOvertimePremiums(
  workingHours: WorkingHours,
  hourlyRate: number,
  lawVersion?: GreekLawConstants
): {
  regularPay: number;
  overtimePay: {
    firstTier: { hours: number; rate: number; amount: number };
    secondTier: { hours: number; rate: number; amount: number };
    total: number;
  };
  nightPremium: number;
  sundayPremium: number;
  holidayPremium: number;
  totalPremiums: number;
  totalPay: number;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const limits = law.workingTimeLimits;
  const premiums = law.premiumRates;
  
  // Validate input hours
  if (hourlyRate <= 0) {
    throw new Error('Hourly rate must be positive');
  }
  
  const regularHours = Math.max(0, workingHours.regularHours);
  const overtimeHours = Math.max(0, workingHours.overtimeHours);
  const nightHours = Math.max(0, workingHours.nightHours);
  const sundayHours = Math.max(0, workingHours.sundayHours);
  const holidayHours = Math.max(0, workingHours.holidayHours);
  
  // Calculate regular pay
  const regularPay = regularHours * hourlyRate;
  
  // Calculate overtime with Greek two-tier system
  const firstTierHours = Math.min(overtimeHours, 2); // First 2 hours at 125%
  const secondTierHours = Math.max(0, overtimeHours - 2); // Additional hours at 150%
  
  const firstTierRate = hourlyRate * premiums.overtime.firstTier;
  const secondTierRate = hourlyRate * premiums.overtime.secondTier;
  
  const firstTierAmount = firstTierHours * firstTierRate;
  const secondTierAmount = secondTierHours * secondTierRate;
  const totalOvertimePay = firstTierAmount + secondTierAmount;
  
  // Calculate other premiums
  const nightPremium = nightHours * hourlyRate * (premiums.night - 1); // Additional 25%
  const sundayPremium = sundayHours * hourlyRate * (premiums.sunday - 1); // Additional 75%
  const holidayPremium = holidayHours * hourlyRate * (premiums.holiday - 1); // Additional 100%
  
  const totalPremiums = totalOvertimePay + nightPremium + sundayPremium + holidayPremium;
  const totalPay = regularPay + totalPremiums;
  
  return {
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: {
      firstTier: { 
        hours: firstTierHours, 
        rate: firstTierRate, 
        amount: Math.round(firstTierAmount * 100) / 100 
      },
      secondTier: { 
        hours: secondTierHours, 
        rate: secondTierRate, 
        amount: Math.round(secondTierAmount * 100) / 100 
      },
      total: Math.round(totalOvertimePay * 100) / 100
    },
    nightPremium: Math.round(nightPremium * 100) / 100,
    sundayPremium: Math.round(sundayPremium * 100) / 100,
    holidayPremium: Math.round(holidayPremium * 100) / 100,
    totalPremiums: Math.round(totalPremiums * 100) / 100,
    totalPay: Math.round(totalPay * 100) / 100
  };
}

/**
 * Validate working hours against Greek labor law limits
 */
export function validateWorkingHours(
  workingHours: WorkingHours,
  lawVersion?: GreekLawConstants
): {
  isValid: boolean;
  violations: Array<{
    type: 'DAILY_LIMIT' | 'WEEKLY_LIMIT' | 'OVERTIME_LIMIT' | 'NEGATIVE_HOURS';
    message: string;
    messageGr: string;
    limit: number;
    actual: number;
  }>;
  warnings: Array<{
    type: 'APPROACHING_LIMIT' | 'UNUSUAL_PATTERN';
    message: string;
    messageGr: string;
  }>;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const limits = law.workingTimeLimits;
  
  const violations = [];
  const warnings = [];
  
  const totalDailyHours = workingHours.regularHours + workingHours.overtimeHours;
  const totalWeeklyHours = totalDailyHours * 5; // Approximate weekly hours
  
  // Check for negative hours
  const hourTypes = [
    { value: workingHours.regularHours, name: 'regular' },
    { value: workingHours.overtimeHours, name: 'overtime' },
    { value: workingHours.nightHours, name: 'night' },
    { value: workingHours.sundayHours, name: 'sunday' },
    { value: workingHours.holidayHours, name: 'holiday' }
  ];
  
  for (const hourType of hourTypes) {
    if (hourType.value < 0) {
      violations.push({
        type: 'NEGATIVE_HOURS',
        message: `${hourType.name} hours cannot be negative`,
        messageGr: `Οι ${hourType.name} ώρες δεν μπορούν να είναι αρνητικές`,
        limit: 0,
        actual: hourType.value
      });
    }
  }
  
  // Check daily limits
  if (totalDailyHours > limits.maxDailyHours) {
    violations.push({
      type: 'DAILY_LIMIT',
      message: `Daily working hours (${totalDailyHours}) exceed legal limit of ${limits.maxDailyHours} hours`,
      messageGr: `Οι ημερήσιες ώρες εργασίας (${totalDailyHours}) υπερβαίνουν το νόμιμο όριο των ${limits.maxDailyHours} ωρών`,
      limit: limits.maxDailyHours,
      actual: totalDailyHours
    });
  }
  
  // Check weekly limits (approximate)
  if (totalWeeklyHours > limits.maxWeeklyHours) {
    violations.push({
      type: 'WEEKLY_LIMIT',
      message: `Weekly working hours (${totalWeeklyHours}) exceed legal limit of ${limits.maxWeeklyHours} hours`,
      messageGr: `Οι εβδομαδιαίες ώρες εργασίας (${totalWeeklyHours}) υπερβαίνουν το νόμιμο όριο των ${limits.maxWeeklyHours} ωρών`,
      limit: limits.maxWeeklyHours,
      actual: totalWeeklyHours
    });
  }
  
  // Check overtime limits (maximum 3 hours per day)
  const maxOvertimeDaily = 3;
  if (workingHours.overtimeHours > maxOvertimeDaily) {
    violations.push({
      type: 'OVERTIME_LIMIT',
      message: `Daily overtime hours (${workingHours.overtimeHours}) exceed legal limit of ${maxOvertimeDaily} hours`,
      messageGr: `Οι ημερήσιες υπερωρίες (${workingHours.overtimeHours}) υπερβαίνουν το νόμιμο όριο των ${maxOvertimeDaily} ωρών`,
      limit: maxOvertimeDaily,
      actual: workingHours.overtimeHours
    });
  }
  
  // Warnings for approaching limits
  if (totalDailyHours > limits.maxDailyHours * 0.9 && totalDailyHours <= limits.maxDailyHours) {
    warnings.push({
      type: 'APPROACHING_LIMIT',
      message: `Daily hours approaching legal limit (${totalDailyHours}/${limits.maxDailyHours})`,
      messageGr: `Οι ημερήσιες ώρες πλησιάζουν το νόμιμο όριο (${totalDailyHours}/${limits.maxDailyHours})`
    });
  }
  
  // Warning for unusual night work patterns
  if (workingHours.nightHours > workingHours.regularHours) {
    warnings.push({
      type: 'UNUSUAL_PATTERN',
      message: 'Night hours exceed regular hours - verify schedule accuracy',
      messageGr: 'Οι νυχτερινές ώρες υπερβαίνουν τις κανονικές - επιβεβαιώστε την ακρίβεια του προγράμματος'
    });
  }
  
  return {
    isValid: violations.length === 0,
    violations,
    warnings
  };
}

// =============================================================================
// NIGHT WORK CALCULATIONS
// =============================================================================

/**
 * Determine if work hours fall within night shift period
 */
export function calculateNightHours(
  startTime: Date,
  endTime: Date,
  lawVersion?: GreekLawConstants
): {
  totalHours: number;
  nightHours: number;
  regularHours: number;
  nightPeriods: Array<{
    start: Date;
    end: Date;
    hours: number;
  }>;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const limits = law.workingTimeLimits;
  
  if (startTime >= endTime) {
    throw new Error('Start time must be before end time');
  }
  
  const totalMilliseconds = endTime.getTime() - startTime.getTime();
  const totalHours = totalMilliseconds / (1000 * 60 * 60);
  
  // Night shift is from 22:00 to 06:00
  const nightStart = limits.nightStartHour; // 22
  const nightEnd = limits.nightEndHour;     // 6
  
  let nightHours = 0;
  const nightPeriods: Array<{ start: Date; end: Date; hours: number }> = [];
  
  // Handle work periods that span multiple days
  const current = new Date(startTime);
  const end = new Date(endTime);
  
  while (current < end) {
    const dayStart = new Date(current);
    dayStart.setHours(0, 0, 0, 0);
    
    const nightStartTime = new Date(dayStart);
    nightStartTime.setHours(nightStart, 0, 0, 0);
    
    const nightEndTime = new Date(dayStart);
    nightEndTime.setDate(nightEndTime.getDate() + 1);
    nightEndTime.setHours(nightEnd, 0, 0, 0);
    
    // Calculate overlap with night period
    const periodStart = new Date(Math.max(current.getTime(), nightStartTime.getTime()));
    const periodEnd = new Date(Math.min(end.getTime(), nightEndTime.getTime()));
    
    if (periodStart < periodEnd) {
      const periodHours = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60);
      nightHours += periodHours;
      
      nightPeriods.push({
        start: new Date(periodStart),
        end: new Date(periodEnd),
        hours: periodHours
      });
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }
  
  const regularHours = totalHours - nightHours;
  
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    nightHours: Math.round(nightHours * 100) / 100,
    regularHours: Math.round(regularHours * 100) / 100,
    nightPeriods
  };
}

// =============================================================================
// BREAK AND REST PERIOD CALCULATIONS
// =============================================================================

/**
 * Calculate mandatory break periods based on Greek labor law
 */
export function calculateMandatoryBreaks(
  totalWorkingHours: number,
  lawVersion?: GreekLawConstants
): {
  requiredBreakMinutes: number;
  breakPeriods: Array<{
    type: 'SHORT_BREAK' | 'LUNCH_BREAK' | 'EXTENDED_BREAK';
    durationMinutes: number;
    timing: string;
    mandatory: boolean;
  }>;
} {
  const breakPeriods: Array<{
    type: 'SHORT_BREAK' | 'LUNCH_BREAK' | 'EXTENDED_BREAK';
    durationMinutes: number;
    timing: string;
    mandatory: boolean;
  }> = [];
  
  let totalBreakMinutes = 0;
  
  // Greek labor law break requirements
  if (totalWorkingHours >= 4) {
    // 15-minute break for 4+ hours
    breakPeriods.push({
      type: 'SHORT_BREAK',
      durationMinutes: 15,
      timing: 'Mid-morning',
      mandatory: true
    });
    totalBreakMinutes += 15;
  }
  
  if (totalWorkingHours >= 6) {
    // 30-minute lunch break for 6+ hours
    breakPeriods.push({
      type: 'LUNCH_BREAK',
      durationMinutes: 30,
      timing: 'Midday',
      mandatory: true
    });
    totalBreakMinutes += 30;
  }
  
  if (totalWorkingHours >= 9) {
    // Additional 15-minute break for 9+ hours
    breakPeriods.push({
      type: 'SHORT_BREAK',
      durationMinutes: 15,
      timing: 'Mid-afternoon',
      mandatory: true
    });
    totalBreakMinutes += 15;
  }
  
  if (totalWorkingHours >= 12) {
    // Extended break for very long shifts
    breakPeriods.push({
      type: 'EXTENDED_BREAK',
      durationMinutes: 45,
      timing: 'Evening',
      mandatory: true
    });
    totalBreakMinutes += 45;
  }
  
  return {
    requiredBreakMinutes: totalBreakMinutes,
    breakPeriods
  };
}

// =============================================================================
// REST PERIOD BETWEEN SHIFTS
// =============================================================================

/**
 * Calculate minimum rest period between shifts
 */
export function calculateMinimumRestPeriod(
  previousShiftEnd: Date,
  nextShiftStart: Date,
  lawVersion?: GreekLawConstants
): {
  actualRestHours: number;
  minimumRestHours: number;
  isCompliant: boolean;
  violation?: {
    message: string;
    messageGr: string;
    shortfallHours: number;
  };
} {
  const minimumRestHours = 11; // Greek law requires 11 hours between shifts
  
  const actualRestMilliseconds = nextShiftStart.getTime() - previousShiftEnd.getTime();
  const actualRestHours = actualRestMilliseconds / (1000 * 60 * 60);
  
  const isCompliant = actualRestHours >= minimumRestHours;
  
  let violation;
  if (!isCompliant) {
    const shortfallHours = minimumRestHours - actualRestHours;
    violation = {
      message: `Insufficient rest period: ${actualRestHours.toFixed(1)} hours (minimum ${minimumRestHours} required)`,
      messageGr: `Ανεπαρκής περίοδος ανάπαυσης: ${actualRestHours.toFixed(1)} ώρες (ελάχιστες ${minimumRestHours} απαιτούνται)`,
      shortfallHours
    };
  }
  
  return {
    actualRestHours: Math.round(actualRestHours * 100) / 100,
    minimumRestHours,
    isCompliant,
    violation
  };
}

// =============================================================================
// WEEKLY REST CALCULATIONS
// =============================================================================

/**
 * Calculate weekly rest period compliance
 */
export function calculateWeeklyRest(
  workDays: Date[],
  lawVersion?: GreekLawConstants
): {
  totalWorkDays: number;
  consecutiveWorkDays: number;
  hasWeeklyRest: boolean;
  restDays: Date[];
  isCompliant: boolean;
  violation?: {
    message: string;
    messageGr: string;
  };
} {
  if (workDays.length === 0) {
    return {
      totalWorkDays: 0,
      consecutiveWorkDays: 0,
      hasWeeklyRest: true,
      restDays: [],
      isCompliant: true
    };
  }
  
  // Sort work days
  const sortedDays = [...workDays].sort((a, b) => a.getTime() - b.getTime());
  
  // Calculate consecutive work days
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  
  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = sortedDays[i - 1];
    const currentDay = sortedDays[i];
    
    const diffDays = Math.floor((currentDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 1;
    }
  }
  
  // Greek law requires at least 24 consecutive hours of rest per week
  // Maximum 6 consecutive working days
  const maxConsecutiveWorkDays = 6;
  const isCompliant = maxConsecutive <= maxConsecutiveWorkDays;
  
  // Find rest days (gaps in work schedule)
  const restDays: Date[] = [];
  for (let i = 1; i < sortedDays.length; i++) {
    const prevDay = sortedDays[i - 1];
    const currentDay = sortedDays[i];
    
    const diffDays = Math.floor((currentDay.getTime() - prevDay.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) {
      for (let d = 1; d < diffDays; d++) {
        const restDay = new Date(prevDay);
        restDay.setDate(restDay.getDate() + d);
        restDays.push(restDay);
      }
    }
  }
  
  const hasWeeklyRest = restDays.length > 0 || sortedDays.length <= 6;
  
  let violation;
  if (!isCompliant) {
    violation = {
      message: `Excessive consecutive work days: ${maxConsecutive} (maximum ${maxConsecutiveWorkDays} allowed)`,
      messageGr: `Υπερβολικές διαδοχικές εργάσιμες ημέρες: ${maxConsecutive} (μέγιστες ${maxConsecutiveWorkDays} επιτρέπονται)`
    };
  }
  
  return {
    totalWorkDays: workDays.length,
    consecutiveWorkDays: maxConsecutive,
    hasWeeklyRest,
    restDays,
    isCompliant,
    violation
  };
}