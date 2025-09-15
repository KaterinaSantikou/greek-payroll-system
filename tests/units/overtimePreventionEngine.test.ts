/**
 * Overtime Prevention Engine Unit Tests
 * 
 * Tests the overtime prevention system that monitors and prevents
 * excessive working hours in compliance with Greek labor law.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { 
  OvertimePreventionEngine,
  type WorkingHoursValidation,
  type EmployeeShiftData,
  type OverTimePeriod
} from '../../server/overtimePreventionEngine.js';

describe('OvertimePreventionEngine', () => {
  let engine: OvertimePreventionEngine;
  
  beforeEach(() => {
    engine = new OvertimePreventionEngine();
  });

  describe('Daily Hours Validation', () => {
    test('should allow normal 8-hour workday', () => {
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T17:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const result = engine.validateDailyHours(shiftData);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should flag excessive daily hours', () => {
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001', 
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T07:00:00Z'),
        clockOut: new Date('2024-01-15T21:00:00Z'), // 14 hours
        breaks: [{ start: new Date('2024-01-15T12:00:00Z'), end: new Date('2024-01-15T13:00:00Z') }],
        totalHours: 13, // 14 - 1 hour break
        regularHours: 8,
        overtimeHours: 5
      };

      const result = engine.validateDailyHours(shiftData);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      
      const excessiveHoursViolation = result.violations.find(v => 
        v.type === 'DAILY_HOURS_EXCEEDED'
      );
      expect(excessiveHoursViolation).toBeDefined();
      expect(excessiveHoursViolation?.message).toContain('13 hours');
    });

    test('should enforce 3-hour daily overtime limit', () => {
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T20:30:00Z'), // 11.5 hours
        breaks: [],
        totalHours: 11.5,
        regularHours: 8,
        overtimeHours: 3.5 // Exceeds 3-hour limit
      };

      const result = engine.validateDailyHours(shiftData);
      
      expect(result.isValid).toBe(false);
      
      const overtimeLimitViolation = result.violations.find(v => 
        v.type === 'OVERTIME_LIMIT_EXCEEDED'
      );
      expect(overtimeLimitViolation).toBeDefined();
      expect(overtimeLimitViolation?.lawReference).toContain('Article 4');
    });

    test('should warn when approaching overtime limit', () => {
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T19:45:00Z'), // 10.75 hours
        breaks: [],
        totalHours: 10.75,
        regularHours: 8,
        overtimeHours: 2.75 // Close to 3-hour limit
      };

      const result = engine.validateDailyHours(shiftData);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const approachingLimitWarning = result.warnings.find(w => 
        w.type === 'APPROACHING_OVERTIME_LIMIT'
      );
      expect(approachingLimitWarning).toBeDefined();
    });
  });

  describe('Weekly Hours Validation', () => {
    test('should allow standard 40-hour work week', () => {
      const weekData: EmployeeShiftData[] = Array.from({ length: 5 }, (_, i) => ({
        employeeId: 'EMP001',
        date: new Date(2024, 0, 15 + i), // Monday to Friday
        clockIn: new Date(2024, 0, 15 + i, 9, 0),
        clockOut: new Date(2024, 0, 15 + i, 17, 0),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      }));

      const result = engine.validateWeeklyHours('EMP001', weekData);
      
      expect(result.isValid).toBe(true);
      expect(result.totalHours).toBe(40);
      expect(result.violations).toHaveLength(0);
    });

    test('should flag excessive weekly hours', () => {
      const weekData: EmployeeShiftData[] = Array.from({ length: 6 }, (_, i) => ({
        employeeId: 'EMP001',
        date: new Date(2024, 0, 15 + i), // Monday to Saturday
        clockIn: new Date(2024, 0, 15 + i, 8, 0),
        clockOut: new Date(2024, 0, 15 + i, 18, 0), // 10 hours per day
        breaks: [{ start: new Date(2024, 0, 15 + i, 12, 0), end: new Date(2024, 0, 15 + i, 13, 0) }],
        totalHours: 9,
        regularHours: 8,
        overtimeHours: 1
      }));

      const result = engine.validateWeeklyHours('EMP001', weekData);
      
      expect(result.isValid).toBe(false);
      expect(result.totalHours).toBe(54);
      
      const weeklyLimitViolation = result.violations.find(v => 
        v.type === 'WEEKLY_HOURS_EXCEEDED'
      );
      expect(weeklyLimitViolation).toBeDefined();
      expect(weeklyLimitViolation?.message).toContain('54 hours');
    });

    test('should calculate weekly overtime correctly', () => {
      const weekData: EmployeeShiftData[] = [
        // Monday to Friday - normal hours
        ...Array.from({ length: 5 }, (_, i) => ({
          employeeId: 'EMP001',
          date: new Date(2024, 0, 15 + i),
          clockIn: new Date(2024, 0, 15 + i, 9, 0),
          clockOut: new Date(2024, 0, 15 + i, 17, 0),
          breaks: [],
          totalHours: 8,
          regularHours: 8,
          overtimeHours: 0
        })),
        // Saturday - overtime
        {
          employeeId: 'EMP001',
          date: new Date(2024, 0, 20), // Saturday
          clockIn: new Date(2024, 0, 20, 9, 0),
          clockOut: new Date(2024, 0, 20, 15, 0), // 6 hours
          breaks: [],
          totalHours: 6,
          regularHours: 0,
          overtimeHours: 6
        }
      ];

      const result = engine.validateWeeklyHours('EMP001', weekData);
      
      expect(result.totalHours).toBe(46);
      expect(result.totalOvertimeHours).toBe(6);
      expect(result.isValid).toBe(true); // Within 48-hour limit
    });
  });

  describe('Rest Period Validation', () => {
    test('should enforce 11-hour minimum rest between shifts', () => {
      const previousShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T22:00:00Z'), // End at 22:00
        breaks: [],
        totalHours: 13,
        regularHours: 8,
        overtimeHours: 5
      };

      const nextShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-16'),
        clockIn: new Date('2024-01-16T06:00:00Z'), // Start at 06:00 - only 8 hours rest
        clockOut: new Date('2024-01-16T14:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const result = engine.validateRestPeriod(previousShift, nextShift);
      
      expect(result.isValid).toBe(false);
      expect(result.restHours).toBe(8);
      
      const restViolation = result.violations.find(v => 
        v.type === 'INSUFFICIENT_REST_PERIOD'
      );
      expect(restViolation).toBeDefined();
      expect(restViolation?.message).toContain('8 hours');
      expect(restViolation?.lawReference).toContain('11-hour minimum');
    });

    test('should allow adequate rest period', () => {
      const previousShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T17:00:00Z'), // End at 17:00
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const nextShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-16'),
        clockIn: new Date('2024-01-16T07:00:00Z'), // Start at 07:00 - 14 hours rest
        clockOut: new Date('2024-01-16T15:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const result = engine.validateRestPeriod(previousShift, nextShift);
      
      expect(result.isValid).toBe(true);
      expect(result.restHours).toBe(14);
      expect(result.violations).toHaveLength(0);
    });

    test('should handle shifts spanning midnight', () => {
      const previousShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T22:00:00Z'),
        clockOut: new Date('2024-01-16T02:00:00Z'), // Night shift ending at 02:00
        breaks: [],
        totalHours: 4,
        regularHours: 4,
        overtimeHours: 0
      };

      const nextShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-16'),
        clockIn: new Date('2024-01-16T15:00:00Z'), // Start at 15:00 - 13 hours rest
        clockOut: new Date('2024-01-16T23:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const result = engine.validateRestPeriod(previousShift, nextShift);
      
      expect(result.isValid).toBe(true);
      expect(result.restHours).toBe(13);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Monthly Overtime Limits', () => {
    test('should track monthly overtime accumulation', () => {
      const period: OverTimePeriod = {
        employeeId: 'EMP001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        totalHours: 180, // Normal monthly hours
        overtimeHours: 25, // Under 30-hour monthly limit
        nightHours: 15,
        sundayHours: 8,
        holidayHours: 0
      };

      const result = engine.validateMonthlyLimits(period);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should flag excessive monthly overtime', () => {
      const period: OverTimePeriod = {
        employeeId: 'EMP001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        totalHours: 220,
        overtimeHours: 45, // Exceeds reasonable monthly limit
        nightHours: 20,
        sundayHours: 16,
        holidayHours: 8
      };

      const result = engine.validateMonthlyLimits(period);
      
      expect(result.isValid).toBe(false);
      
      const monthlyOvertimeViolation = result.violations.find(v => 
        v.type === 'MONTHLY_OVERTIME_EXCEEDED'
      );
      expect(monthlyOvertimeViolation).toBeDefined();
      expect(monthlyOvertimeViolation?.message).toContain('45 hours');
    });

    test('should warn when approaching monthly limits', () => {
      const period: OverTimePeriod = {
        employeeId: 'EMP001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        totalHours: 205,
        overtimeHours: 28, // Close to 30-hour limit
        nightHours: 18,
        sundayHours: 12,
        holidayHours: 4
      };

      const result = engine.validateMonthlyLimits(period);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const approachingLimitWarning = result.warnings.find(w => 
        w.type === 'APPROACHING_MONTHLY_LIMIT'
      );
      expect(approachingLimitWarning).toBeDefined();
    });
  });

  describe('Break Period Validation', () => {
    test('should enforce mandatory break for long shifts', () => {
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T08:00:00Z'),
        clockOut: new Date('2024-01-15T16:30:00Z'), // 8.5 hours
        breaks: [], // No breaks
        totalHours: 8.5,
        regularHours: 8,
        overtimeHours: 0.5
      };

      const result = engine.validateBreakPeriods(shiftData);
      
      expect(result.isValid).toBe(false);
      
      const missingBreakViolation = result.violations.find(v => 
        v.type === 'MANDATORY_BREAK_MISSING'
      );
      expect(missingBreakViolation).toBeDefined();
      expect(missingBreakViolation?.message).toContain('6 hours');
    });

    test('should allow adequate break periods', () => {
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T08:00:00Z'),
        clockOut: new Date('2024-01-15T17:00:00Z'), // 9 hours
        breaks: [
          { start: new Date('2024-01-15T12:00:00Z'), end: new Date('2024-01-15T13:00:00Z') } // 1-hour break
        ],
        totalHours: 8, // 9 - 1 hour break
        regularHours: 8,
        overtimeHours: 0
      };

      const result = engine.validateBreakPeriods(shiftData);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should validate minimum break duration', () => {
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T08:00:00Z'),
        clockOut: new Date('2024-01-15T17:30:00Z'),
        breaks: [
          { start: new Date('2024-01-15T12:00:00Z'), end: new Date('2024-01-15T12:15:00Z') } // Only 15 minutes
        ],
        totalHours: 9.25,
        regularHours: 8,
        overtimeHours: 1.25
      };

      const result = engine.validateBreakPeriods(shiftData);
      
      expect(result.isValid).toBe(false);
      
      const insufficientBreakViolation = result.violations.find(v => 
        v.type === 'INSUFFICIENT_BREAK_DURATION'
      );
      expect(insufficientBreakViolation).toBeDefined();
      expect(insufficientBreakViolation?.message).toContain('15 minutes');
    });
  });

  describe('Sunday and Holiday Work Validation', () => {
    test('should limit Sunday work hours', () => {
      const sundayShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-21'), // Sunday
        clockIn: new Date('2024-01-21T08:00:00Z'),
        clockOut: new Date('2024-01-21T18:00:00Z'), // 10 hours on Sunday
        breaks: [{ start: new Date('2024-01-21T12:00:00Z'), end: new Date('2024-01-21T13:00:00Z') }],
        totalHours: 9,
        regularHours: 0,
        overtimeHours: 9, // All hours on Sunday count as overtime
        isSunday: true
      };

      const result = engine.validateSundayHours(sundayShift);
      
      expect(result.isValid).toBe(false);
      
      const sundayLimitViolation = result.violations.find(v => 
        v.type === 'SUNDAY_HOURS_EXCEEDED'
      );
      expect(sundayLimitViolation).toBeDefined();
      expect(sundayLimitViolation?.message).toContain('9 hours');
    });

    test('should allow reasonable Sunday work', () => {
      const sundayShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-21'), // Sunday
        clockIn: new Date('2024-01-21T10:00:00Z'),
        clockOut: new Date('2024-01-21T16:00:00Z'), // 6 hours
        breaks: [],
        totalHours: 6,
        regularHours: 0,
        overtimeHours: 6,
        isSunday: true
      };

      const result = engine.validateSundayHours(sundayShift);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    test('should track consecutive Sunday work', () => {
      const sundayShifts: EmployeeShiftData[] = Array.from({ length: 4 }, (_, i) => ({
        employeeId: 'EMP001',
        date: new Date(2024, 0, 7 + (i * 7)), // 4 consecutive Sundays
        clockIn: new Date(2024, 0, 7 + (i * 7), 10, 0),
        clockOut: new Date(2024, 0, 7 + (i * 7), 16, 0),
        breaks: [],
        totalHours: 6,
        regularHours: 0,
        overtimeHours: 6,
        isSunday: true
      }));

      const result = engine.validateConsecutiveSundayWork('EMP001', sundayShifts);
      
      expect(result.isValid).toBe(false);
      
      const consecutiveSundayViolation = result.violations.find(v => 
        v.type === 'CONSECUTIVE_SUNDAY_WORK'
      );
      expect(consecutiveSundayViolation).toBeDefined();
      expect(consecutiveSundayViolation?.message).toContain('4 consecutive');
    });
  });

  describe('Special Sector Rules', () => {
    test('should apply tourism sector overtime limits', () => {
      const tourismEngine = new OvertimePreventionEngine({ sector: 'tourism' });
      
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-07-15'), // Summer season
        clockIn: new Date('2024-07-15T06:00:00Z'),
        clockOut: new Date('2024-07-15T22:00:00Z'), // 16 hours - excessive for normal sector
        breaks: [
          { start: new Date('2024-07-15T10:00:00Z'), end: new Date('2024-07-15T11:00:00Z') },
          { start: new Date('2024-07-15T15:00:00Z'), end: new Date('2024-07-15T17:00:00Z') }
        ],
        totalHours: 13, // 16 - 3 hours breaks
        regularHours: 8,
        overtimeHours: 5
      };

      const result = tourismEngine.validateDailyHours(shiftData);
      
      // Tourism sector may have more lenient limits during peak season
      expect(result.isValid).toBe(true); // Or false depending on specific rules
    });

    test('should enforce healthcare sector restrictions', () => {
      const healthcareEngine = new OvertimePreventionEngine({ sector: 'healthcare' });
      
      const nightShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T22:00:00Z'),
        clockOut: new Date('2024-01-16T06:00:00Z'), // 8-hour night shift
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0,
        isNightShift: true
      };

      const result = healthcareEngine.validateNightShiftLimits(nightShift);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Emergency Override System', () => {
    test('should allow emergency overtime with proper authorization', () => {
      const emergencyShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T08:00:00Z'),
        clockOut: new Date('2024-01-15T23:00:00Z'), // 15 hours - normally prohibited
        breaks: [],
        totalHours: 15,
        regularHours: 8,
        overtimeHours: 7,
        isEmergency: true,
        emergencyAuthorization: 'MGR001',
        emergencyReason: 'System outage requiring extended maintenance'
      };

      const result = engine.validateDailyHours(emergencyShift);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0); // Should still warn
      
      const emergencyWarning = result.warnings.find(w => 
        w.type === 'EMERGENCY_OVERTIME_APPROVED'
      );
      expect(emergencyWarning).toBeDefined();
    });

    test('should reject emergency overtime without authorization', () => {
      const unauthorizedShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T08:00:00Z'),
        clockOut: new Date('2024-01-15T23:00:00Z'), // 15 hours
        breaks: [],
        totalHours: 15,
        regularHours: 8,
        overtimeHours: 7,
        isEmergency: true
        // Missing emergencyAuthorization
      };

      const result = engine.validateDailyHours(unauthorizedShift);
      
      expect(result.isValid).toBe(false);
      
      const unauthorizedViolation = result.violations.find(v => 
        v.type === 'UNAUTHORIZED_EMERGENCY_OVERTIME'
      );
      expect(unauthorizedViolation).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    test('should validate single shift quickly', () => {
      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T17:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const startTime = Date.now();
      engine.validateDailyHours(shiftData);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10); // Should complete within 10ms
    });

    test('should handle large batch validation efficiently', () => {
      const shifts: EmployeeShiftData[] = Array.from({ length: 1000 }, (_, i) => ({
        employeeId: `EMP${i.toString().padStart(3, '0')}`,
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T17:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      }));

      const startTime = Date.now();
      const results = shifts.map(shift => engine.validateDailyHours(shift));
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(results).toHaveLength(1000);
      expect(results.every(r => r.isValid)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid shift data gracefully', () => {
      const invalidShift: EmployeeShiftData = {
        employeeId: '',
        date: new Date('invalid'),
        clockIn: new Date('2024-01-15T17:00:00Z'),
        clockOut: new Date('2024-01-15T09:00:00Z'), // End before start
        breaks: [],
        totalHours: -5,
        regularHours: 8,
        overtimeHours: 0
      };

      const result = engine.validateDailyHours(invalidShift);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      
      const dataValidationError = result.violations.find(v => 
        v.type === 'INVALID_SHIFT_DATA'
      );
      expect(dataValidationError).toBeDefined();
    });

    test('should handle missing employee ID', () => {
      const shiftWithoutEmployee: EmployeeShiftData = {
        employeeId: '',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T17:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const result = engine.validateDailyHours(shiftWithoutEmployee);
      
      expect(result.isValid).toBe(false);
      
      const missingEmployeeError = result.violations.find(v => 
        v.type === 'MISSING_EMPLOYEE_ID'
      );
      expect(missingEmployeeError).toBeDefined();
    });
  });

  describe('Configuration and Customization', () => {
    test('should allow custom daily hour limits', () => {
      const customEngine = new OvertimePreventionEngine({
        dailyHourLimit: 10, // Custom 10-hour limit instead of default
        overtimeDailyLimit: 4 // 4 hours overtime instead of 3
      });

      const shiftData: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T08:00:00Z'),
        clockOut: new Date('2024-01-15T20:00:00Z'), // 12 hours
        breaks: [],
        totalHours: 12,
        regularHours: 8,
        overtimeHours: 4
      };

      const result = customEngine.validateDailyHours(shiftData);
      
      expect(result.isValid).toBe(false); // Still exceeds total limit
      expect(result.violations.some(v => v.type === 'DAILY_HOURS_EXCEEDED')).toBe(true);
    });

    test('should support different rest period requirements', () => {
      const customEngine = new OvertimePreventionEngine({
        minimumRestHours: 12 // 12-hour rest instead of 11
      });

      const previousShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-15'),
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T17:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const nextShift: EmployeeShiftData = {
        employeeId: 'EMP001',
        date: new Date('2024-01-16'),
        clockIn: new Date('2024-01-16T06:00:00Z'), // 11 hours rest - insufficient for custom rule
        clockOut: new Date('2024-01-16T14:00:00Z'),
        breaks: [],
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0
      };

      const result = customEngine.validateRestPeriod(previousShift, nextShift);
      
      expect(result.isValid).toBe(false);
      expect(result.restHours).toBe(11);
    });
  });
});