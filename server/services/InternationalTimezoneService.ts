/**
 * International Timezone Service - Multi-region timezone support for global operations
 */

import { DSTTransitionService } from './DSTTransitionService';
import { addHours, format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

export interface TimezoneProfile {
  id: string;
  name: string;
  iana: string; // IANA timezone identifier
  country: string;
  region: string;
  utcOffset: number; // Standard time offset in minutes
  dstOffset: number; // DST offset in minutes
  hasDST: boolean;
  dstRules?: {
    startRule: string; // e.g., "last Sunday of March"
    endRule: string;   // e.g., "last Sunday of October"
    startTime: string; // e.g., "02:00"
    endTime: string;   // e.g., "03:00"
  };
  businessHours: {
    start: string;
    end: string;
    workdays: number[]; // 0=Sunday, 1=Monday, etc.
  };
  laborLaws: {
    maxDailyHours: number;
    maxWeeklyHours: number;
    overtimeRate: number;
    nightShiftRate: number;
    holidayRate: number;
  };
}

export interface MultiTimezoneShift {
  employeeId: string;
  localStart: Date;
  localEnd: Date;
  timezone: string;
  remoteTimezone?: string; // If employee works remotely from different timezone
  hourlyRate: number;
  currency: string;
}

export interface TimezoneConversionResult {
  originalTime: Date;
  convertedTime: Date;
  originalTimezone: string;
  targetTimezone: string;
  timezoneDifference: number; // in minutes
  conversionWarnings: string[];
}

export interface GlobalWorkforceReport {
  reportDate: Date;
  employees: Array<{
    employeeId: string;
    homeTimezone: string;
    workTimezone: string;
    totalHours: number;
    localBusinessHours: number;
    crossTimezoneHours: number;
    timezoneAdjustments: number;
  }>;
  timezoneDistribution: Map<string, number>;
  coordinationChallenges: string[];
  recommendations: string[];
}

export class InternationalTimezoneService {
  private dstService = new DSTTransitionService();
  
  // Supported timezone profiles for international operations
  private readonly TIMEZONE_PROFILES: Map<string, TimezoneProfile> = new Map([
    ['Europe/Athens', {
      id: 'eet',
      name: 'Eastern European Time',
      iana: 'Europe/Athens',
      country: 'Greece',
      region: 'Europe',
      utcOffset: 120, // UTC+2
      dstOffset: 180,  // UTC+3
      hasDST: true,
      dstRules: {
        startRule: 'last Sunday of March',
        endRule: 'last Sunday of October',
        startTime: '03:00',
        endTime: '04:00'
      },
      businessHours: { start: '09:00', end: '17:00', workdays: [1, 2, 3, 4, 5] },
      laborLaws: { maxDailyHours: 8, maxWeeklyHours: 40, overtimeRate: 1.25, nightShiftRate: 1.25, holidayRate: 2.0 }
    }],
    ['Europe/London', {
      id: 'gmt',
      name: 'Greenwich Mean Time / British Summer Time',
      iana: 'Europe/London',
      country: 'United Kingdom',
      region: 'Europe',
      utcOffset: 0,    // UTC+0
      dstOffset: 60,   // UTC+1
      hasDST: true,
      dstRules: {
        startRule: 'last Sunday of March',
        endRule: 'last Sunday of October',
        startTime: '01:00',
        endTime: '02:00'
      },
      businessHours: { start: '09:00', end: '17:00', workdays: [1, 2, 3, 4, 5] },
      laborLaws: { maxDailyHours: 8, maxWeeklyHours: 48, overtimeRate: 1.5, nightShiftRate: 1.2, holidayRate: 2.0 }
    }],
    ['America/New_York', {
      id: 'est',
      name: 'Eastern Standard Time / Eastern Daylight Time',
      iana: 'America/New_York',
      country: 'United States',
      region: 'North America',
      utcOffset: -300, // UTC-5
      dstOffset: -240, // UTC-4
      hasDST: true,
      dstRules: {
        startRule: 'second Sunday of March',
        endRule: 'first Sunday of November',
        startTime: '02:00',
        endTime: '02:00'
      },
      businessHours: { start: '09:00', end: '17:00', workdays: [1, 2, 3, 4, 5] },
      laborLaws: { maxDailyHours: 8, maxWeeklyHours: 40, overtimeRate: 1.5, nightShiftRate: 1.1, holidayRate: 1.5 }
    }],
    ['Asia/Tokyo', {
      id: 'jst',
      name: 'Japan Standard Time',
      iana: 'Asia/Tokyo',
      country: 'Japan',
      region: 'Asia',
      utcOffset: 540,  // UTC+9
      dstOffset: 540,  // No DST
      hasDST: false,
      businessHours: { start: '09:00', end: '17:00', workdays: [1, 2, 3, 4, 5] },
      laborLaws: { maxDailyHours: 8, maxWeeklyHours: 40, overtimeRate: 1.25, nightShiftRate: 1.25, holidayRate: 1.35 }
    }],
    ['Australia/Sydney', {
      id: 'aest',
      name: 'Australian Eastern Standard Time / Australian Eastern Daylight Time',
      iana: 'Australia/Sydney',
      country: 'Australia',
      region: 'Oceania',
      utcOffset: 600,  // UTC+10
      dstOffset: 660,  // UTC+11
      hasDST: true,
      dstRules: {
        startRule: 'first Sunday of October',
        endRule: 'first Sunday of April',
        startTime: '02:00',
        endTime: '03:00'
      },
      businessHours: { start: '09:00', end: '17:00', workdays: [1, 2, 3, 4, 5] },
      laborLaws: { maxDailyHours: 8, maxWeeklyHours: 38, overtimeRate: 1.5, nightShiftRate: 1.15, holidayRate: 2.5 }
    }]
  ]);

  /**
   * Convert time between any two supported timezones
   */
  convertBetweenTimezones(
    dateTime: Date | string,
    fromTimezone: string,
    toTimezone: string
  ): TimezoneConversionResult {
    const sourceDate = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;
    const warnings: string[] = [];

    // Validate timezone support
    if (!this.TIMEZONE_PROFILES.has(fromTimezone)) {
      warnings.push(`Source timezone ${fromTimezone} not in supported profiles - using generic conversion`);
    }
    if (!this.TIMEZONE_PROFILES.has(toTimezone)) {
      warnings.push(`Target timezone ${toTimezone} not in supported profiles - using generic conversion`);
    }

    // Perform conversion
    const utcTime = fromZonedTime(sourceDate, fromTimezone);
    const convertedTime = toZonedTime(utcTime, toTimezone);

    // Calculate timezone difference
    const sourceProfile = this.TIMEZONE_PROFILES.get(fromTimezone);
    const targetProfile = this.TIMEZONE_PROFILES.get(toTimezone);
    
    let timezoneDifference = 0;
    if (sourceProfile && targetProfile) {
      const sourceOffset = this.getCurrentOffset(sourceDate, fromTimezone);
      const targetOffset = this.getCurrentOffset(convertedTime, toTimezone);
      timezoneDifference = targetOffset - sourceOffset;
    }

    // Check for potential DST issues
    if (sourceProfile?.hasDST || targetProfile?.hasDST) {
      warnings.push('Conversion involves DST-observing timezone - verify accuracy around transition dates');
    }

    return {
      originalTime: sourceDate,
      convertedTime,
      originalTimezone: fromTimezone,
      targetTimezone: toTimezone,
      timezoneDifference,
      conversionWarnings: warnings
    };
  }

  /**
   * Calculate working hours for remote employees across timezones
   */
  calculateRemoteWorkingHours(
    shift: MultiTimezoneShift
  ): {
    localHours: number;
    homeOfficeHours: number;
    businessHoursOverlap: number;
    timezoneAdjustmentPay: number;
    workingDuringUnsocialHours: boolean;
    recommendations: string[];
  } {
    const result = {
      localHours: 0,
      homeOfficeHours: 0,
      businessHoursOverlap: 0,
      timezoneAdjustmentPay: 0,
      workingDuringUnsocialHours: false,
      recommendations: [] as string[]
    };

    // Convert shift times to both timezones
    const homeOfficeStart = this.convertBetweenTimezones(
      shift.localStart,
      shift.timezone,
      shift.remoteTimezone || 'Europe/Athens'
    );

    const homeOfficeEnd = this.convertBetweenTimezones(
      shift.localEnd,
      shift.timezone,
      shift.remoteTimezone || 'Europe/Athens'
    );

    // Calculate hours in each timezone
    const shiftDurationMinutes = (shift.localEnd.getTime() - shift.localStart.getTime()) / (1000 * 60);
    result.localHours = shiftDurationMinutes / 60;
    result.homeOfficeHours = result.localHours; // Same duration, different local times

    // Check business hours overlap
    const homeProfile = this.TIMEZONE_PROFILES.get(shift.remoteTimezone || 'Europe/Athens');
    if (homeProfile) {
      result.businessHoursOverlap = this.calculateBusinessHoursOverlap(
        homeOfficeStart.convertedTime,
        homeOfficeEnd.convertedTime,
        homeProfile
      );

      // Check if working during unsocial hours in home timezone
      result.workingDuringUnsocialHours = this.isUnsocialHours(
        homeOfficeStart.convertedTime,
        homeOfficeEnd.convertedTime,
        homeProfile
      );
    }

    // Calculate timezone adjustment compensation
    if (result.workingDuringUnsocialHours) {
      result.timezoneAdjustmentPay = result.localHours * shift.hourlyRate * 0.15; // 15% premium
      result.recommendations.push('Consider 15% timezone adjustment premium for unsocial hours');
    }

    // Generate recommendations
    if (result.businessHoursOverlap < result.localHours * 0.5) {
      result.recommendations.push('Low business hours overlap - consider adjusting shift times for better collaboration');
    }

    if (Math.abs(homeOfficeStart.timezoneDifference) > 360) { // More than 6 hours difference
      result.recommendations.push('Significant timezone difference may impact work-life balance');
    }

    return result;
  }

  /**
   * Coordinate meeting times across multiple timezones
   */
  findOptimalMeetingTime(
    participants: Array<{
      employeeId: string;
      timezone: string;
      workingHours: { start: string; end: string };
      availability: Array<{ start: Date; end: Date }>;
    }>,
    duration: number, // in minutes
    preferredDate: Date
  ): {
    optimalTimes: Array<{
      utcTime: Date;
      participantTimes: Array<{
        employeeId: string;
        localTime: Date;
        timezone: string;
        withinBusinessHours: boolean;
      }>;
      overallScore: number;
    }>;
    challenges: string[];
    recommendations: string[];
  } {
    const optimalTimes = [];
    const challenges = [];
    const recommendations = [];

    // Find timezone spread
    const timezones = [...new Set(participants.map(p => p.timezone))];
    const timezoneSpread = this.calculateTimezoneSpread(timezones, preferredDate);

    if (timezoneSpread > 12 * 60) { // More than 12 hours spread
      challenges.push('Participants span more than 12 time zones - consider asynchronous communication');
    }

    // Generate potential meeting times (every hour during business hours)
    const baseTimezone = 'Europe/Athens'; // Use Greece as base
    const potentialTimes = [];

    for (let hour = 8; hour <= 18; hour++) {
      const potentialTime = new Date(preferredDate);
      potentialTime.setHours(hour, 0, 0, 0);
      potentialTimes.push(potentialTime);
    }

    // Evaluate each potential time
    for (const potentialTime of potentialTimes) {
      const participantTimes = [];
      let totalScore = 0;
      let businessHoursCount = 0;

      for (const participant of participants) {
        const conversion = this.convertBetweenTimezones(
          potentialTime,
          baseTimezone,
          participant.timezone
        );

        const withinBusinessHours = this.isWithinBusinessHours(
          conversion.convertedTime,
          participant.workingHours
        );

        participantTimes.push({
          employeeId: participant.employeeId,
          localTime: conversion.convertedTime,
          timezone: participant.timezone,
          withinBusinessHours
        });

        // Score calculation
        if (withinBusinessHours) {
          businessHoursCount++;
          totalScore += 3;
        } else {
          const hour = conversion.convertedTime.getHours();
          if (hour >= 7 && hour <= 20) { // Reasonable hours
            totalScore += 1;
          } else {
            totalScore -= 2; // Penalize very early/late hours
          }
        }
      }

      const overallScore = totalScore / participants.length;

      optimalTimes.push({
        utcTime: fromZonedTime(potentialTime, baseTimezone),
        participantTimes,
        overallScore
      });
    }

    // Sort by score and return top options
    optimalTimes.sort((a, b) => b.overallScore - a.overallScore);

    // Generate recommendations
    const bestOption = optimalTimes[0];
    if (bestOption) {
      const businessHoursParticipants = bestOption.participantTimes.filter(p => p.withinBusinessHours).length;
      const businessHoursPercentage = (businessHoursParticipants / participants.length) * 100;

      if (businessHoursPercentage < 50) {
        recommendations.push('Consider multiple meetings or asynchronous updates due to timezone challenges');
      }

      if (businessHoursPercentage >= 80) {
        recommendations.push('Good timezone alignment found - most participants in business hours');
      }
    }

    return {
      optimalTimes: optimalTimes.slice(0, 5), // Return top 5 options
      challenges,
      recommendations
    };
  }

  /**
   * Generate global workforce timezone report
   */
  generateGlobalWorkforceReport(
    employees: Array<{
      employeeId: string;
      homeTimezone: string;
      workTimezone: string;
      weeklyShifts: MultiTimezoneShift[];
    }>,
    reportPeriod: { start: Date; end: Date }
  ): GlobalWorkforceReport {
    const employeeReports = [];
    const timezoneDistribution = new Map<string, number>();
    const coordinationChallenges = [];
    const recommendations = [];

    for (const employee of employees) {
      let totalHours = 0;
      let localBusinessHours = 0;
      let crossTimezoneHours = 0;
      let timezoneAdjustments = 0;

      // Analyze each shift
      for (const shift of employee.weeklyShifts) {
        const shiftHours = (shift.localEnd.getTime() - shift.localStart.getTime()) / (1000 * 60 * 60);
        totalHours += shiftHours;

        if (shift.remoteTimezone && shift.remoteTimezone !== shift.timezone) {
          crossTimezoneHours += shiftHours;
          
          const remoteCalc = this.calculateRemoteWorkingHours(shift);
          if (remoteCalc.workingDuringUnsocialHours) {
            timezoneAdjustments += remoteCalc.timezoneAdjustmentPay;
          }
        } else {
          localBusinessHours += shiftHours;
        }
      }

      employeeReports.push({
        employeeId: employee.employeeId,
        homeTimezone: employee.homeTimezone,
        workTimezone: employee.workTimezone,
        totalHours,
        localBusinessHours,
        crossTimezoneHours,
        timezoneAdjustments
      });

      // Update timezone distribution
      const count = timezoneDistribution.get(employee.homeTimezone) || 0;
      timezoneDistribution.set(employee.homeTimezone, count + 1);
    }

    // Analyze coordination challenges
    const uniqueTimezones = timezoneDistribution.size;
    if (uniqueTimezones > 5) {
      coordinationChallenges.push(`High timezone diversity: ${uniqueTimezones} different timezones`);
    }

    const remoteWorkers = employeeReports.filter(e => e.crossTimezoneHours > 0).length;
    const remotePercentage = (remoteWorkers / employees.length) * 100;
    if (remotePercentage > 30) {
      coordinationChallenges.push(`${remotePercentage.toFixed(1)}% of workforce works across timezones`);
    }

    // Generate recommendations
    if (uniqueTimezones > 3) {
      recommendations.push('Consider establishing regional coordination hubs');
    }

    if (remotePercentage > 20) {
      recommendations.push('Implement timezone-aware communication policies');
    }

    const avgTimezoneAdjustments = employeeReports.reduce((sum, e) => sum + e.timezoneAdjustments, 0) / employees.length;
    if (avgTimezoneAdjustments > 100) {
      recommendations.push('High timezone adjustment costs - review remote work policies');
    }

    return {
      reportDate: new Date(),
      employees: employeeReports,
      timezoneDistribution,
      coordinationChallenges,
      recommendations
    };
  }

  /**
   * Private helper methods
   */
  private getCurrentOffset(date: Date, timezone: string): number {
    const profile = this.TIMEZONE_PROFILES.get(timezone);
    if (!profile) return 0;

    if (!profile.hasDST) return profile.utcOffset;

    // Simple DST check - in production, use proper timezone library
    const month = date.getMonth();
    const isDSTPeriod = (timezone === 'Europe/Athens' && month >= 2 && month <= 9) ||
                        (timezone === 'Australia/Sydney' && (month >= 9 || month <= 2));
    
    return isDSTPeriod ? profile.dstOffset : profile.utcOffset;
  }

  private calculateBusinessHoursOverlap(
    start: Date,
    end: Date,
    profile: TimezoneProfile
  ): number {
    const businessStart = this.parseTimeOnDate(start, profile.businessHours.start);
    const businessEnd = this.parseTimeOnDate(start, profile.businessHours.end);

    const overlapStart = new Date(Math.max(start.getTime(), businessStart.getTime()));
    const overlapEnd = new Date(Math.min(end.getTime(), businessEnd.getTime()));

    if (overlapStart >= overlapEnd) return 0;

    return (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
  }

  private isUnsocialHours(start: Date, end: Date, profile: TimezoneProfile): boolean {
    const startHour = start.getHours();
    const endHour = end.getHours();

    // Consider unsocial if starts before 6 AM or ends after 10 PM
    return startHour < 6 || endHour > 22 || (startHour >= 22 && endHour <= 6);
  }

  private calculateTimezoneSpread(timezones: string[], date: Date): number {
    const offsets = timezones.map(tz => this.getCurrentOffset(date, tz));
    const minOffset = Math.min(...offsets);
    const maxOffset = Math.max(...offsets);
    return maxOffset - minOffset;
  }

  private isWithinBusinessHours(time: Date, workingHours: { start: string; end: string }): boolean {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    const [startHour, startMin] = workingHours.start.split(':').map(Number);
    const [endHour, endMin] = workingHours.end.split(':').map(Number);
    
    const startInMinutes = startHour * 60 + startMin;
    const endInMinutes = endHour * 60 + endMin;

    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  }

  private parseTimeOnDate(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

export const internationalTimezoneService = new InternationalTimezoneService();