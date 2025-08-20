/**
 * DST Transition Service - Comprehensive daylight saving time handling for Greek payroll
 * Handles EET/EEST transitions, night shift calculations, and international timezone support
 */

import { addHours, addMinutes, differenceInMinutes, format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

export interface DSTTransition {
  date: Date;
  type: 'spring_forward' | 'fall_back';
  fromOffset: number; // UTC offset in minutes before transition
  toOffset: number; // UTC offset in minutes after transition
  timezone: string;
  clockChange: {
    time: string; // When the clock change occurs (e.g., "03:00")
    skipHour?: string; // Hour that doesn't exist (spring forward)
    duplicateHour?: string; // Hour that occurs twice (fall back)
  };
}

export interface TimezonePeriod {
  start: Date;
  end: Date;
  timezone: string;
  offset: number; // UTC offset in minutes
  isDST: boolean;
  abbreviation: string;
}

export interface ShiftCalculationResult {
  actualWorkedMinutes: number;
  standardWorkedMinutes: number;
  payableMinutes: number;
  dstAdjustment: number;
  transitions: DSTTransition[];
  periods: TimezonePeriod[];
  warnings: string[];
  nightShiftPremiums: Array<{
    start: Date;
    end: Date;
    minutes: number;
    rate: number;
  }>;
}

export class DSTTransitionService {
  // Greek timezone: Eastern European Time (EET) / Eastern European Summer Time (EEST)
  private readonly GREEK_TIMEZONE = 'Europe/Athens';
  private readonly EET_OFFSET = 120; // UTC+2 in minutes
  private readonly EEST_OFFSET = 180; // UTC+3 in minutes

  /**
   * Get DST transitions for a specific year in Greek timezone
   */
  getDSTTransitions(year: number): DSTTransition[] {
    const transitions: DSTTransition[] = [];

    // Spring transition (last Sunday in March, 03:00 -> 04:00)
    const springDate = this.getLastSundayOfMarch(year);
    transitions.push({
      date: springDate,
      type: 'spring_forward',
      fromOffset: this.EET_OFFSET,
      toOffset: this.EEST_OFFSET,
      timezone: this.GREEK_TIMEZONE,
      clockChange: {
        time: '03:00',
        skipHour: '03:00-04:00'
      }
    });

    // Fall transition (last Sunday in October, 04:00 -> 03:00)
    const fallDate = this.getLastSundayOfOctober(year);
    transitions.push({
      date: fallDate,
      type: 'fall_back',
      fromOffset: this.EEST_OFFSET,
      toOffset: this.EET_OFFSET,
      timezone: this.GREEK_TIMEZONE,
      clockChange: {
        time: '04:00',
        duplicateHour: '03:00-04:00'
      }
    });

    return transitions;
  }

  /**
   * Calculate DST-aware working time for a shift period
   */
  calculateDSTAwareWorkingTime(
    shiftStart: Date | string,
    shiftEnd: Date | string,
    timezone: string = this.GREEK_TIMEZONE
  ): ShiftCalculationResult {
    const startDate = typeof shiftStart === 'string' ? parseISO(shiftStart) : shiftStart;
    const endDate = typeof shiftEnd === 'string' ? parseISO(shiftEnd) : shiftEnd;

    const result: ShiftCalculationResult = {
      actualWorkedMinutes: 0,
      standardWorkedMinutes: 0,
      payableMinutes: 0,
      dstAdjustment: 0,
      transitions: [],
      periods: [],
      warnings: [],
      nightShiftPremiums: []
    };

    // Get all relevant DST transitions
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const allTransitions: DSTTransition[] = [];

    for (let year = startYear; year <= endYear; year++) {
      allTransitions.push(...this.getDSTTransitions(year));
    }

    // Find transitions that occur during the shift
    const shiftTransitions = allTransitions.filter(transition => 
      transition.date >= startDate && transition.date <= endDate
    );

    result.transitions = shiftTransitions;

    // Calculate timezone periods during the shift
    result.periods = this.calculateTimezonePeriods(startDate, endDate, timezone, shiftTransitions);

    // Calculate actual worked time considering DST transitions
    const timeCalculation = this.calculateActualTime(startDate, endDate, result.periods);
    result.actualWorkedMinutes = timeCalculation.actualMinutes;
    result.standardWorkedMinutes = timeCalculation.standardMinutes;
    result.dstAdjustment = timeCalculation.dstAdjustment;

    // Determine payable time based on Greek labor law
    result.payableMinutes = this.calculatePayableTime(result.actualWorkedMinutes, shiftTransitions);

    // Calculate night shift premiums
    result.nightShiftPremiums = this.calculateNightShiftPremiums(startDate, endDate, result.periods);

    // Add warnings for unusual situations
    result.warnings = this.generateDSTWarnings(shiftTransitions, startDate, endDate);

    return result;
  }

  /**
   * Validate if a time exists on a specific date (accounting for DST)
   */
  validateTimeExists(date: Date, time: string, timezone: string = this.GREEK_TIMEZONE): {
    exists: boolean;
    reason?: string;
    alternatives?: string[];
  } {
    const year = date.getFullYear();
    const transitions = this.getDSTTransitions(year);
    
    const springTransition = transitions.find(t => t.type === 'spring_forward');
    
    if (springTransition && this.isSameDay(date, springTransition.date)) {
      // Check if time falls in the skipped hour (03:00-04:00)
      if (time >= '03:00' && time < '04:00') {
        return {
          exists: false,
          reason: 'Time falls in skipped hour during spring DST transition',
          alternatives: ['02:59', '04:00']
        };
      }
    }

    return { exists: true };
  }

  /**
   * Convert time between timezones with DST awareness
   */
  convertTimezone(
    date: Date | string,
    fromTimezone: string,
    toTimezone: string
  ): {
    convertedDate: Date;
    fromOffset: number;
    toOffset: number;
    isDSTActive: boolean;
  } {
    const sourceDate = typeof date === 'string' ? parseISO(date) : date;
    
    // Convert to UTC first, then to target timezone
    const utcDate = fromZonedTime(sourceDate, fromTimezone);
    const convertedDate = toZonedTime(utcDate, toTimezone);
    
    // Calculate offsets
    const fromOffset = this.getTimezoneOffset(sourceDate, fromTimezone);
    const toOffset = this.getTimezoneOffset(convertedDate, toTimezone);
    
    // Check if DST is active in either timezone
    const isDSTActive = this.isDSTActive(convertedDate, toTimezone);

    return {
      convertedDate,
      fromOffset,
      toOffset,
      isDSTActive
    };
  }

  /**
   * Get comprehensive timezone information for a specific date
   */
  getTimezoneInfo(date: Date, timezone: string = this.GREEK_TIMEZONE): {
    localTime: Date;
    utcTime: Date;
    offset: number;
    isDST: boolean;
    abbreviation: string;
    nextTransition?: DSTTransition;
    prevTransition?: DSTTransition;
  } {
    const localTime = toZonedTime(date, timezone);
    const utcTime = fromZonedTime(date, timezone);
    const offset = this.getTimezoneOffset(date, timezone);
    const isDST = this.isDSTActive(date, timezone);
    const abbreviation = isDST ? 'EEST' : 'EET';

    const year = date.getFullYear();
    const transitions = this.getDSTTransitions(year);
    
    const nextTransition = transitions.find(t => t.date > date);
    const prevTransition = transitions.slice().reverse().find(t => t.date <= date);

    return {
      localTime,
      utcTime,
      offset,
      isDST,
      abbreviation,
      nextTransition,
      prevTransition
    };
  }

  /**
   * Calculate night shift hours with DST awareness
   */
  calculateNightShiftHours(
    shiftStart: Date,
    shiftEnd: Date,
    nightPeriod: { start: string; end: string } = { start: '22:00', end: '06:00' }
  ): {
    totalNightMinutes: number;
    nightPeriods: Array<{
      start: Date;
      end: Date;
      minutes: number;
      crossesDST: boolean;
    }>;
    dstAdjustment: number;
  } {
    const result = {
      totalNightMinutes: 0,
      nightPeriods: [] as Array<{
        start: Date;
        end: Date;
        minutes: number;
        crossesDST: boolean;
      }>,
      dstAdjustment: 0
    };

    // Handle shifts that span multiple days
    let currentStart = shiftStart;
    const maxDays = 3; // Limit to prevent infinite loops

    for (let day = 0; day < maxDays && currentStart < shiftEnd; day++) {
      const dayStart = startOfDay(addHours(currentStart, 24 * day));
      const dayEnd = endOfDay(dayStart);
      
      // Calculate night period for this day
      const nightStart = this.parseTimeOnDate(dayStart, nightPeriod.start);
      const nightEnd = this.parseTimeOnDate(addHours(dayStart, 24), nightPeriod.end);
      
      // Find intersection with actual shift
      const periodStart = new Date(Math.max(currentStart.getTime(), nightStart.getTime()));
      const periodEnd = new Date(Math.min(shiftEnd.getTime(), nightEnd.getTime()));
      
      if (periodStart < periodEnd) {
        // Check for DST transitions in this period
        const year = periodStart.getFullYear();
        const transitions = this.getDSTTransitions(year);
        const hasTransition = transitions.some(t => 
          t.date >= periodStart && t.date <= periodEnd
        );

        const minutes = this.calculateActualMinutesBetween(periodStart, periodEnd);
        
        result.nightPeriods.push({
          start: periodStart,
          end: periodEnd,
          minutes,
          crossesDST: hasTransition
        });

        result.totalNightMinutes += minutes;

        // Add DST adjustment if needed
        if (hasTransition) {
          const transition = transitions.find(t => t.date >= periodStart && t.date <= periodEnd)!;
          const adjustment = transition.type === 'spring_forward' ? -60 : 60;
          result.dstAdjustment += adjustment;
        }
      }

      currentStart = addHours(dayStart, 24);
    }

    return result;
  }

  /**
   * Generate DST-aware schedule recommendations
   */
  generateDSTAwareSchedule(
    baseSchedule: {
      startTime: string;
      endTime: string;
      workDays: number[];
    },
    startDate: Date,
    endDate: Date
  ): Array<{
    date: Date;
    scheduledStart: Date;
    scheduledEnd: Date;
    adjustments: string[];
    warnings: string[];
  }> {
    const schedule = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      if (baseSchedule.workDays.includes(currentDate.getDay())) {
        const scheduledStart = this.parseTimeOnDate(currentDate, baseSchedule.startTime);
        const scheduledEnd = this.parseTimeOnDate(currentDate, baseSchedule.endTime);
        
        // Handle next-day end times
        if (baseSchedule.endTime < baseSchedule.startTime) {
          scheduledEnd.setDate(scheduledEnd.getDate() + 1);
        }

        const adjustments: string[] = [];
        const warnings: string[] = [];

        // Check for DST transitions
        const year = currentDate.getFullYear();
        const transitions = this.getDSTTransitions(year);
        
        for (const transition of transitions) {
          if (this.isSameDay(currentDate, transition.date)) {
            if (transition.type === 'spring_forward') {
              if (baseSchedule.startTime >= '03:00' && baseSchedule.startTime < '04:00') {
                adjustments.push('Start time adjusted to 04:00 due to DST spring forward');
                scheduledStart.setHours(4, 0, 0, 0);
              }
              warnings.push('DST spring forward: 03:00-04:00 hour does not exist');
            } else {
              warnings.push('DST fall back: 03:00-04:00 hour occurs twice');
              if (baseSchedule.startTime >= '03:00' && baseSchedule.startTime < '04:00') {
                adjustments.push('Ambiguous start time during DST fall back - using first occurrence');
              }
            }
          }
        }

        schedule.push({
          date: new Date(currentDate),
          scheduledStart,
          scheduledEnd,
          adjustments,
          warnings
        });
      }

      currentDate = addHours(currentDate, 24);
    }

    return schedule;
  }

  /**
   * Private helper methods
   */
  private getLastSundayOfMarch(year: number): Date {
    const march31 = new Date(year, 2, 31); // March 31
    const dayOfWeek = march31.getDay(); // 0 = Sunday, 6 = Saturday
    const lastSunday = new Date(march31);
    lastSunday.setDate(31 - dayOfWeek);
    lastSunday.setHours(3, 0, 0, 0); // 03:00 local time
    return lastSunday;
  }

  private getLastSundayOfOctober(year: number): Date {
    const october31 = new Date(year, 9, 31); // October 31
    const dayOfWeek = october31.getDay();
    const lastSunday = new Date(october31);
    lastSunday.setDate(31 - dayOfWeek);
    lastSunday.setHours(4, 0, 0, 0); // 04:00 local time (EEST)
    return lastSunday;
  }

  private calculateTimezonePeriods(
    start: Date,
    end: Date,
    timezone: string,
    transitions: DSTTransition[]
  ): TimezonePeriod[] {
    const periods: TimezonePeriod[] = [];
    let currentStart = start;

    // Sort transitions by date
    const sortedTransitions = transitions.sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const transition of sortedTransitions) {
      if (transition.date > currentStart) {
        // Add period before transition
        periods.push({
          start: currentStart,
          end: transition.date,
          timezone,
          offset: transition.fromOffset,
          isDST: transition.fromOffset === this.EEST_OFFSET,
          abbreviation: transition.fromOffset === this.EEST_OFFSET ? 'EEST' : 'EET'
        });
        currentStart = transition.date;
      }
    }

    // Add final period
    if (currentStart < end) {
      const finalOffset = sortedTransitions.length > 0 
        ? sortedTransitions[sortedTransitions.length - 1].toOffset
        : this.getTimezoneOffset(currentStart, timezone);
      
      periods.push({
        start: currentStart,
        end,
        timezone,
        offset: finalOffset,
        isDST: finalOffset === this.EEST_OFFSET,
        abbreviation: finalOffset === this.EEST_OFFSET ? 'EEST' : 'EET'
      });
    }

    return periods;
  }

  private calculateActualTime(
    start: Date,
    end: Date,
    periods: TimezonePeriod[]
  ): {
    actualMinutes: number;
    standardMinutes: number;
    dstAdjustment: number;
  } {
    let actualMinutes = 0;
    let dstAdjustment = 0;

    for (const period of periods) {
      const periodStart = new Date(Math.max(start.getTime(), period.start.getTime()));
      const periodEnd = new Date(Math.min(end.getTime(), period.end.getTime()));
      
      if (periodStart < periodEnd) {
        const minutes = differenceInMinutes(periodEnd, periodStart);
        actualMinutes += minutes;
      }
    }

    // Calculate what the time would be without DST
    const standardMinutes = differenceInMinutes(end, start);
    dstAdjustment = actualMinutes - standardMinutes;

    return { actualMinutes, standardMinutes, dstAdjustment };
  }

  private calculatePayableTime(actualMinutes: number, transitions: DSTTransition[]): number {
    let payableMinutes = actualMinutes;

    // Greek labor law: Workers are paid for scheduled hours during DST transitions
    for (const transition of transitions) {
      if (transition.type === 'spring_forward') {
        // Spring forward: Workers get paid for full scheduled shift even though they work 1 hour less
        payableMinutes += 60;
      }
      // Fall back: Workers work extra hour but get paid standard rate (no penalty to employer)
    }

    return payableMinutes;
  }

  private calculateNightShiftPremiums(
    start: Date,
    end: Date,
    periods: TimezonePeriod[]
  ): Array<{ start: Date; end: Date; minutes: number; rate: number }> {
    const premiums = [];
    const nightStart = '22:00';
    const nightEnd = '06:00';

    for (const period of periods) {
      const periodStart = new Date(Math.max(start.getTime(), period.start.getTime()));
      const periodEnd = new Date(Math.min(end.getTime(), period.end.getTime()));
      
      if (periodStart < periodEnd) {
        const nightCalc = this.calculateNightShiftHours(periodStart, periodEnd, {
          start: nightStart,
          end: nightEnd
        });

        for (const nightPeriod of nightCalc.nightPeriods) {
          premiums.push({
            start: nightPeriod.start,
            end: nightPeriod.end,
            minutes: nightPeriod.minutes,
            rate: 0.25 // 25% premium for night work
          });
        }
      }
    }

    return premiums;
  }

  private generateDSTWarnings(
    transitions: DSTTransition[],
    start: Date,
    end: Date
  ): string[] {
    const warnings: string[] = [];

    for (const transition of transitions) {
      if (transition.type === 'spring_forward') {
        warnings.push(`DST Spring Forward on ${format(transition.date, 'yyyy-MM-dd')}: 03:00-04:00 hour skipped`);
      } else {
        warnings.push(`DST Fall Back on ${format(transition.date, 'yyyy-MM-dd')}: 03:00-04:00 hour occurs twice`);
      }
    }

    return warnings;
  }

  private getTimezoneOffset(date: Date, timezone: string): number {
    // This is a simplified implementation. In production, use a proper timezone library
    const isDST = this.isDSTActive(date, timezone);
    return timezone === this.GREEK_TIMEZONE 
      ? (isDST ? this.EEST_OFFSET : this.EET_OFFSET)
      : 0;
  }

  private isDSTActive(date: Date, timezone: string): boolean {
    if (timezone !== this.GREEK_TIMEZONE) return false;
    
    const year = date.getFullYear();
    const transitions = this.getDSTTransitions(year);
    const springTransition = transitions.find(t => t.type === 'spring_forward');
    const fallTransition = transitions.find(t => t.type === 'fall_back');
    
    if (!springTransition || !fallTransition) return false;
    
    return date >= springTransition.date && date < fallTransition.date;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private parseTimeOnDate(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private calculateActualMinutesBetween(start: Date, end: Date): number {
    // This should account for DST transitions
    return differenceInMinutes(end, start);
  }
}

export const dstTransitionService = new DSTTransitionService();