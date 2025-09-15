/**
 * Overtime Calculations Unit Tests
 * 
 * Tests for Greek labor law overtime premium calculations including:
 * - Multi-tier overtime rates (25%, 50%, 75%)
 * - Night shift premiums (25%)
 * - Sunday work premiums (75%)
 * - Holiday work premiums (100%)
 * - Premium stacking combinations
 */

import { PayrollCalculator } from '../../lib/payroll/calculators/payroll-calculator';
import { WORKING_TIME_LIMITS } from '../../lib/payroll/domain/greek-labor-law';
import { PREMIUM_RATES } from '../../lib/payroll/rules/payroll-rules';

describe('Overtime Calculations', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
  });

  describe('Regular Overtime Tiers', () => {
    test('should calculate Tier 1 overtime (first 2 hours at 25%)', () => {
      const baseSalary = 1200;
      const regularHours = 160;
      const overtimeHours = 2;

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        regularHours,
        overtimeHours,
        0, // night hours
        0, // sunday hours
        0  // holiday hours
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedOvertimeAmount = overtimeHours * hourlyRate * PREMIUM_RATES.overtime.tier1;

      expect(result.overtimeAmount).toBeCloseTo(expectedOvertimeAmount, 2);
      expect(result.nightPremium).toBe(0);
      expect(result.sundayPremium).toBe(0);
      expect(result.holidayPremium).toBe(0);
    });

    test('should calculate Tier 2 overtime (hours 3-4 at 50%)', () => {
      const baseSalary = 1200;
      const regularHours = 160;
      const overtimeHours = 4; // 2 hours tier 1 + 2 hours tier 2

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        regularHours,
        overtimeHours,
        0, 0, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedTier1 = 2 * hourlyRate * PREMIUM_RATES.overtime.tier1;
      const expectedTier2 = 2 * hourlyRate * PREMIUM_RATES.overtime.tier2;
      const expectedTotal = expectedTier1 + expectedTier2;

      expect(result.overtimeAmount).toBeCloseTo(expectedTotal, 2);
    });

    test('should calculate Tier 3 overtime (beyond 4 hours at 75%)', () => {
      const baseSalary = 1200;
      const regularHours = 160;
      const overtimeHours = 6; // 2 tier 1 + 2 tier 2 + 2 tier 3

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        regularHours,
        overtimeHours,
        0, 0, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedTier1 = 2 * hourlyRate * PREMIUM_RATES.overtime.tier1;
      const expectedTier2 = 2 * hourlyRate * PREMIUM_RATES.overtime.tier2;
      const expectedTier3 = 2 * hourlyRate * PREMIUM_RATES.overtime.tier3;
      const expectedTotal = expectedTier1 + expectedTier2 + expectedTier3;

      expect(result.overtimeAmount).toBeCloseTo(expectedTotal, 2);
    });

    test('should handle fractional overtime hours', () => {
      const baseSalary = 1200;
      const regularHours = 160;
      const overtimeHours = 2.5; // 2 hours tier 1 + 0.5 hours tier 2

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        regularHours,
        overtimeHours,
        0, 0, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedTier1 = 2 * hourlyRate * PREMIUM_RATES.overtime.tier1;
      const expectedTier2 = 0.5 * hourlyRate * PREMIUM_RATES.overtime.tier2;
      const expectedTotal = expectedTier1 + expectedTier2;

      expect(result.overtimeAmount).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Night Shift Premiums', () => {
    test('should calculate night premium at 25%', () => {
      const baseSalary = 1200;
      const nightHours = 8;

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        160, // regular hours
        0,   // overtime hours
        nightHours,
        0, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedNightPremium = nightHours * hourlyRate * PREMIUM_RATES.night;

      expect(result.nightPremium).toBeCloseTo(expectedNightPremium, 2);
      expect(result.overtimeAmount).toBe(0);
    });

    test('should handle partial night hours', () => {
      const baseSalary = 1000;
      const nightHours = 4.5;

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        160, 0, nightHours, 0, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedNightPremium = nightHours * hourlyRate * PREMIUM_RATES.night;

      expect(result.nightPremium).toBeCloseTo(expectedNightPremium, 2);
    });
  });

  describe('Sunday Work Premiums', () => {
    test('should calculate Sunday premium at 75%', () => {
      const baseSalary = 1200;
      const sundayHours = 8;

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        160, 0, 0, sundayHours, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedSundayPremium = sundayHours * hourlyRate * PREMIUM_RATES.sunday;

      expect(result.sundayPremium).toBeCloseTo(expectedSundayPremium, 2);
    });
  });

  describe('Holiday Work Premiums', () => {
    test('should calculate holiday premium at 100%', () => {
      const baseSalary = 1200;
      const holidayHours = 8;

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        160, 0, 0, 0, holidayHours
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedHolidayPremium = holidayHours * hourlyRate * PREMIUM_RATES.holiday;

      expect(result.holidayPremium).toBeCloseTo(expectedHolidayPremium, 2);
    });
  });

  describe('Premium Stacking', () => {
    test('should calculate combined overtime and night premiums', () => {
      const baseSalary = 1200;
      const overtimeHours = 2;
      const nightHours = 8;

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        160, 
        overtimeHours,
        nightHours,
        0, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      
      // Separate calculations
      const expectedOvertimeAmount = overtimeHours * hourlyRate * PREMIUM_RATES.overtime.tier1;
      const expectedNightPremium = nightHours * hourlyRate * PREMIUM_RATES.night;

      expect(result.overtimeAmount).toBeCloseTo(expectedOvertimeAmount, 2);
      expect(result.nightPremium).toBeCloseTo(expectedNightPremium, 2);
    });

    test('should calculate all premium types together', () => {
      const baseSalary = 1500;
      const overtimeHours = 3; // tier 1 + tier 2
      const nightHours = 4;
      const sundayHours = 6;
      const holidayHours = 2;

      const result = calculator.calculateOvertimePremiums(
        baseSalary,
        160,
        overtimeHours,
        nightHours,
        sundayHours,
        holidayHours
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      
      // Calculate each premium separately
      const expectedOvertimeAmount = 
        (2 * hourlyRate * PREMIUM_RATES.overtime.tier1) + 
        (1 * hourlyRate * PREMIUM_RATES.overtime.tier2);
      const expectedNightPremium = nightHours * hourlyRate * PREMIUM_RATES.night;
      const expectedSundayPremium = sundayHours * hourlyRate * PREMIUM_RATES.sunday;
      const expectedHolidayPremium = holidayHours * hourlyRate * PREMIUM_RATES.holiday;

      expect(result.overtimeAmount).toBeCloseTo(expectedOvertimeAmount, 2);
      expect(result.nightPremium).toBeCloseTo(expectedNightPremium, 2);
      expect(result.sundayPremium).toBeCloseTo(expectedSundayPremium, 2);
      expect(result.holidayPremium).toBeCloseTo(expectedHolidayPremium, 2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero hours', () => {
      const baseSalary = 1200;
      
      const result = calculator.calculateOvertimePremiums(
        baseSalary, 160, 0, 0, 0, 0
      );

      expect(result.overtimeAmount).toBe(0);
      expect(result.nightPremium).toBe(0);
      expect(result.sundayPremium).toBe(0);
      expect(result.holidayPremium).toBe(0);
    });

    test('should handle large overtime hours', () => {
      const baseSalary = 1200;
      const overtimeHours = 20; // Extreme case

      const result = calculator.calculateOvertimePremiums(
        baseSalary, 160, overtimeHours, 0, 0, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedOvertimeAmount = 
        (2 * hourlyRate * PREMIUM_RATES.overtime.tier1) +  // First 2 hours
        (2 * hourlyRate * PREMIUM_RATES.overtime.tier2) +  // Next 2 hours 
        (16 * hourlyRate * PREMIUM_RATES.overtime.tier3);  // Remaining 16 hours

      expect(result.overtimeAmount).toBeCloseTo(expectedOvertimeAmount, 2);
    });

    test('should handle minimum wage calculations', () => {
      const baseSalary = 650; // Near minimum wage
      const overtimeHours = 2;

      const result = calculator.calculateOvertimePremiums(
        baseSalary, 160, overtimeHours, 0, 0, 0
      );

      const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedOvertimeAmount = overtimeHours * hourlyRate * PREMIUM_RATES.overtime.tier1;

      expect(result.overtimeAmount).toBeCloseTo(expectedOvertimeAmount, 2);
      expect(result.overtimeAmount).toBeGreaterThan(0);
    });
  });

  describe('Hourly Rate Calculations', () => {
    test('should use correct hourly rate from standard monthly hours', () => {
      const baseSalary = 1600;
      const overtimeHours = 1;

      const result = calculator.calculateOvertimePremiums(
        baseSalary, 160, overtimeHours, 0, 0, 0
      );

      const expectedHourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;
      const expectedOvertimeAmount = overtimeHours * expectedHourlyRate * PREMIUM_RATES.overtime.tier1;

      expect(result.overtimeAmount).toBeCloseTo(expectedOvertimeAmount, 2);
      
      // Verify hourly rate calculation
      const actualHourlyRate = baseSalary / 160; // Assuming 160 standard monthly hours
      expect(actualHourlyRate).toBeGreaterThan(0);
    });
  });

  describe('Rounding Behavior', () => {
    test('should handle precise decimal calculations', () => {
      const baseSalary = 1333.33; // Odd amount to test rounding
      const overtimeHours = 1.33;

      const result = calculator.calculateOvertimePremiums(
        baseSalary, 160, overtimeHours, 0, 0, 0
      );

      // Should not throw errors and should produce reasonable results
      expect(result.overtimeAmount).toBeGreaterThan(0);
      expect(Number.isFinite(result.overtimeAmount)).toBe(true);
      
      // Should maintain precision to cents
      const rounded = Math.round(result.overtimeAmount * 100) / 100;
      expect(Math.abs(result.overtimeAmount - rounded)).toBeLessThan(0.001);
    });
  });
});