/**
 * Prorated Salaries Unit Tests
 * 
 * Tests for Greek payroll proration calculations including:
 * - Partial month employment (new hires, terminations)
 * - Part-time vs full-time calculations
 * - Mid-month contract changes
 * - Greek bonus proration (Δώρα)
 * - Leave proration calculations
 */

import { PayrollCalculator, type PayrollCalculationInput } from '../../lib/payroll/calculators/payroll-calculator';
import { GREEK_BONUSES } from '../../lib/payroll/rules/payroll-rules';

describe('Prorated Salaries', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
  });

  const baseInput: PayrollCalculationInput = {
    employeeId: 'test-employee-001',
    periodId: '2025-01',
    baseSalary: 1200,
    regularHours: 160,
    overtimeHours: 0,
    nightHours: 0,
    sundayHours: 0,
    holidayHours: 0,
    contractType: 'indefinite',
    isFullTime: true,
    employmentStartDate: new Date('2024-01-01'),
    periodStartDate: new Date('2025-01-01'),
    periodEndDate: new Date('2025-01-31')
  };

  describe('Greek Bonus Proration (Δώρα)', () => {
    test('should calculate full Christmas bonus for full year employment', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2024-12-31')
      };

      const result = calculator.calculatePayroll(input);

      const expectedChristmasBonus = input.baseSalary * GREEK_BONUSES.christmas.fullTimeMonthly;

      expect(result.christmasBonus).toBeCloseTo(expectedChristmasBonus, 2);
      expect(result.easterBonus).toBeCloseTo(input.baseSalary * GREEK_BONUSES.easter.fullTimeMonthly, 2);
      expect(result.vacationBonus).toBeCloseTo(input.baseSalary * GREEK_BONUSES.vacation.fullTimeMonthly, 2);
    });

    test('should prorate Christmas bonus for partial year employment', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2024-07-01'), // Started mid-year (6 months)
        periodEndDate: new Date('2024-12-31')
      };

      const result = calculator.calculatePayroll(input);

      // Should be prorated to 6/12 = 0.5 of full bonus
      const expectedProration = 6 / 12;
      const expectedChristmasBonus = input.baseSalary * GREEK_BONUSES.christmas.fullTimeMonthly * expectedProration;

      expect(result.christmasBonus).toBeCloseTo(expectedChristmasBonus, 2);
    });

    test('should prorate Easter bonus correctly', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2024-10-01'), // Started 3 months ago
        periodEndDate: new Date('2025-03-31') // 6 months total employment
      };

      const result = calculator.calculatePayroll(input);

      const monthsWorked = 6; // From Oct 1 to Mar 31
      const proRationFactor = Math.min(monthsWorked / 12, 1);
      const expectedEasterBonus = input.baseSalary * GREEK_BONUSES.easter.fullTimeMonthly * proRationFactor;

      expect(result.easterBonus).toBeCloseTo(expectedEasterBonus, 2);
    });

    test('should prorate vacation bonus for new employees', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2024-09-15'), // Started mid-month
        periodEndDate: new Date('2025-07-31') // Nearly 11 months
      };

      const result = calculator.calculatePayroll(input);

      // Calculate months worked more precisely
      const startDate = new Date('2024-09-15');
      const endDate = new Date('2025-07-31');
      const monthsWorked = calculator['calculateMonthsWorked'](startDate, endDate);
      const proRationFactor = Math.min(monthsWorked / 12, 1);
      
      const expectedVacationBonus = input.baseSalary * GREEK_BONUSES.vacation.fullTimeMonthly * proRationFactor;

      expect(result.vacationBonus).toBeCloseTo(expectedVacationBonus, 2);
    });

    test('should apply contract type reduction for seasonal workers', () => {
      const input = {
        ...baseInput,
        contractType: 'seasonal' as const,
        employmentStartDate: new Date('2024-06-01'), // 6 months of work
        periodEndDate: new Date('2024-12-31')
      };

      const result = calculator.calculatePayroll(input);

      // Seasonal workers get reduced bonuses (50% reduction)
      const proRationFactor = 6 / 12; // 6 months worked
      const contractFactor = 0.5; // Seasonal reduction
      
      const expectedChristmasBonus = input.baseSalary * GREEK_BONUSES.christmas.fullTimeMonthly * proRationFactor * contractFactor;

      expect(result.christmasBonus).toBeCloseTo(expectedChristmasBonus, 2);
    });
  });

  describe('Part-time Employment Proration', () => {
    test('should handle part-time employees with reduced hours', () => {
      const input = {
        ...baseInput,
        isFullTime: false,
        regularHours: 80, // Half-time
        baseSalary: 600 // Proportionally reduced salary
      };

      const result = calculator.calculatePayroll(input);

      // For part-time, bonuses should still be based on their actual salary
      const expectedChristmasBonus = input.baseSalary * GREEK_BONUSES.christmas.fullTimeMonthly;

      expect(result.christmasBonus).toBeCloseTo(expectedChristmasBonus, 2);
      expect(result.regularPay).toBe(80 * (input.baseSalary / 160)); // Based on hours worked
    });

    test('should calculate correct hourly rates for part-time workers', () => {
      const input = {
        ...baseInput,
        isFullTime: false,
        regularHours: 120, // 75% time
        baseSalary: 900 // 75% of full salary
      };

      const result = calculator.calculatePayroll(input);

      // Regular pay should be based on hours worked at the correct rate
      const expectedHourlyRate = input.baseSalary / 160; // Standard calculation
      const expectedRegularPay = input.regularHours * expectedHourlyRate;

      expect(result.regularPay).toBeCloseTo(expectedRegularPay, 2);
    });
  });

  describe('Mid-Month Employment Changes', () => {
    test('should handle new hire starting mid-month', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2025-01-15'), // Started on 15th
        periodStartDate: new Date('2025-01-15'), // First period starts from hire date
        periodEndDate: new Date('2025-01-31'),
        regularHours: 80 // Approximately half month
      };

      const result = calculator.calculatePayroll(input);

      // Bonuses should be prorated for partial year (started in January)
      const monthsWorked = calculator['calculateMonthsWorked'](
        new Date('2025-01-15'), 
        new Date('2025-01-31')
      );
      const proRationFactor = Math.min(monthsWorked / 12, 1);
      
      expect(result.christmasBonus).toBeCloseTo(
        input.baseSalary * GREEK_BONUSES.christmas.fullTimeMonthly * proRationFactor, 
        2
      );
    });

    test('should handle termination mid-month', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2023-01-01'), // Long-term employee
        periodStartDate: new Date('2025-01-01'),
        periodEndDate: new Date('2025-01-15'), // Terminated on 15th
        regularHours: 80 // Half month of work
      };

      const result = calculator.calculatePayroll(input);

      // Should get full year bonuses since employed for over a year
      const monthsWorked = 24; // 2+ years
      const proRationFactor = Math.min(monthsWorked / 12, 1); // Should be 1 (full)
      
      const expectedChristmasBonus = input.baseSalary * GREEK_BONUSES.christmas.fullTimeMonthly * proRationFactor;

      expect(result.christmasBonus).toBeCloseTo(expectedChristmasBonus, 2);
    });

    test('should handle contract changes within period', () => {
      // Simulate a promotion/salary change mid-period by using current salary
      const input = {
        ...baseInput,
        baseSalary: 1500, // New higher salary
        employmentStartDate: new Date('2023-06-01'), // Well-established employee
        regularHours: 160 // Full month
      };

      const result = calculator.calculatePayroll(input);

      // Bonuses should be based on current salary and full proration
      const monthsWorked = 20; // About 1.5+ years
      const proRationFactor = Math.min(monthsWorked / 12, 1); // Should be 1
      
      const expectedChristmasBonus = input.baseSalary * GREEK_BONUSES.christmas.fullTimeMonthly * proRationFactor;

      expect(result.christmasBonus).toBeCloseTo(expectedChristmasBonus, 2);
    });
  });

  describe('Leave Proration', () => {
    test('should calculate prorated leave pay', () => {
      const input = {
        ...baseInput,
        leaveHours: {
          annual: 40 // 1 week of annual leave
        }
      };

      const result = calculator.calculatePayroll(input);

      const hourlyRate = input.baseSalary / 160;
      const expectedLeavePay = 40 * hourlyRate;

      expect(result.paidLeave).toBeCloseTo(expectedLeavePay, 2);
      expect(result.totalLeavePay).toBeCloseTo(expectedLeavePay, 2);
    });

    test('should calculate partial sick pay correctly', () => {
      const input = {
        ...baseInput,
        leaveHours: {
          sick: 16 // 2 days sick leave
        }
      };

      const result = calculator.calculatePayroll(input);

      // Sick leave is typically at 50% pay after first few days
      const hourlyRate = input.baseSalary / 160;
      const sickPayPercentage = 0.5; // From LEAVE_ENTITLEMENTS
      const expectedSickPay = 16 * hourlyRate * sickPayPercentage;

      expect(result.sickPay).toBeCloseTo(expectedSickPay, 2);
    });

    test('should handle maternity leave at full pay', () => {
      const input = {
        ...baseInput,
        leaveHours: {
          maternity: 80 // Partial maternity period
        }
      };

      const result = calculator.calculatePayroll(input);

      const hourlyRate = input.baseSalary / 160;
      const expectedMaternityPay = 80 * hourlyRate; // Full pay

      expect(result.maternityPay).toBeCloseTo(expectedMaternityPay, 2);
    });

    test('should handle paternity leave at full pay', () => {
      const input = {
        ...baseInput,
        leaveHours: {
          paternity: 16 // 2 days paternity leave
        }
      };

      const result = calculator.calculatePayroll(input);

      const hourlyRate = input.baseSalary / 160;
      const expectedPaternityPay = 16 * hourlyRate; // Full pay

      expect(result.paternityPay).toBeCloseTo(expectedPaternityPay, 2);
    });

    test('should combine different types of leave', () => {
      const input = {
        ...baseInput,
        leaveHours: {
          annual: 24, // 3 days annual
          sick: 8,    // 1 day sick
          maternity: 40 // 5 days maternity
        }
      };

      const result = calculator.calculatePayroll(input);

      const hourlyRate = input.baseSalary / 160;
      const expectedPaidLeave = 24 * hourlyRate;
      const expectedSickPay = 8 * hourlyRate * 0.5; // 50% pay
      const expectedMaternityPay = 40 * hourlyRate; // Full pay
      const expectedTotal = expectedPaidLeave + expectedSickPay + expectedMaternityPay;

      expect(result.paidLeave).toBeCloseTo(expectedPaidLeave, 2);
      expect(result.sickPay).toBeCloseTo(expectedSickPay, 2);
      expect(result.maternityPay).toBeCloseTo(expectedMaternityPay, 2);
      expect(result.totalLeavePay).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle employment periods less than one month', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2025-01-25'),
        periodStartDate: new Date('2025-01-25'),
        periodEndDate: new Date('2025-01-31'),
        regularHours: 32 // Few days of work
      };

      const result = calculator.calculatePayroll(input);

      // Even very short employment should get some proration
      expect(result.christmasBonus).toBeGreaterThanOrEqual(0);
      expect(result.easterBonus).toBeGreaterThanOrEqual(0);
      expect(result.vacationBonus).toBeGreaterThanOrEqual(0);
      
      // But bonuses should be very small due to short tenure
      expect(result.totalBonuses).toBeLessThan(input.baseSalary * 0.1);
    });

    test('should handle future employment end date', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2026-12-31') // Future date
      };

      const result = calculator.calculatePayroll(input);

      // Should calculate based on current employment length, not future projections
      expect(result.christmasBonus).toBeGreaterThan(0);
      expect(Number.isFinite(result.christmasBonus)).toBe(true);
    });

    test('should handle same start and end date', () => {
      const input = {
        ...baseInput,
        employmentStartDate: new Date('2025-01-15'),
        periodStartDate: new Date('2025-01-15'),
        periodEndDate: new Date('2025-01-15'),
        regularHours: 8 // Single day
      };

      const result = calculator.calculatePayroll(input);

      // Should not crash and should produce minimal but valid results
      expect(Number.isFinite(result.christmasBonus)).toBe(true);
      expect(result.christmasBonus).toBeGreaterThanOrEqual(0);
    });

    test('should handle zero regular hours with leave hours', () => {
      const input = {
        ...baseInput,
        regularHours: 0,
        leaveHours: {
          annual: 40 // Only leave hours
        }
      };

      const result = calculator.calculatePayroll(input);

      // Should calculate leave pay even with no regular hours
      expect(result.regularPay).toBe(0);
      expect(result.paidLeave).toBeGreaterThan(0);
      expect(result.grossPay).toBeGreaterThan(0);
    });
  });

  describe('Months Worked Calculation', () => {
    test('should calculate months worked correctly for full months', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const monthsWorked = calculator['calculateMonthsWorked'](startDate, endDate);

      expect(monthsWorked).toBe(11); // Jan 1 to Dec 31 is 11 full months
    });

    test('should handle partial months correctly', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-06-10');
      const monthsWorked = calculator['calculateMonthsWorked'](startDate, endDate);

      // Should be less than 5 full months due to partial start and end
      expect(monthsWorked).toBeLessThan(5);
      expect(monthsWorked).toBeGreaterThanOrEqual(4);
    });

    test('should handle cross-year calculations', () => {
      const startDate = new Date('2023-10-15');
      const endDate = new Date('2024-05-20');
      const monthsWorked = calculator['calculateMonthsWorked'](startDate, endDate);

      // October 15, 2023 to May 20, 2024 should be about 7 months
      expect(monthsWorked).toBeGreaterThanOrEqual(6);
      expect(monthsWorked).toBeLessThanOrEqual(8);
    });
  });
});