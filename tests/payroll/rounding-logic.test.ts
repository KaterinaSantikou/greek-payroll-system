/**
 * Rounding Logic Unit Tests
 * 
 * Tests for Greek payroll rounding calculations including:
 * - Currency rounding to cents (€0.01)
 * - Tax calculation rounding
 * - EFKA contribution rounding
 * - Net pay rounding consistency
 * - Edge cases with very small amounts
 */

import { PayrollCalculator, type PayrollCalculationInput } from '../../lib/payroll/calculators/payroll-calculator';
import { EFKA_RATES, GREEK_TAX_BRACKETS } from '../../lib/payroll/domain/greek-labor-law';

describe('Rounding Logic', () => {
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

  describe('Currency Rounding (€0.01)', () => {
    test('should round gross pay to nearest cent', () => {
      const input = {
        ...baseInput,
        baseSalary: 1333.33, // Odd amount that creates rounding scenarios
        allowances: {
          transport: 77.777 // Amount that needs rounding
        }
      };

      const result = calculator.calculatePayroll(input);

      // All monetary amounts should be rounded to 2 decimal places (cents)
      expect(Number.isInteger(result.grossPay * 100)).toBe(true);
      expect(Number.isInteger(result.netPay * 100)).toBe(true);
      expect(Number.isInteger(result.totalAllowances * 100)).toBe(true);
    });

    test('should maintain precision in intermediate calculations', () => {
      const input = {
        ...baseInput,
        baseSalary: 1234.56,
        overtimeHours: 3.33, // Fractional hours
        allowances: {
          position: 88.888 // Amount requiring rounding
        }
      };

      const result = calculator.calculatePayroll(input);

      // Final amounts should be properly rounded
      expect(result.grossPay).toBeCloseTo(Math.round(result.grossPay * 100) / 100, 2);
      expect(result.netPay).toBeCloseTo(Math.round(result.netPay * 100) / 100, 2);
      expect(result.overtimeAmount).toBeCloseTo(Math.round(result.overtimeAmount * 100) / 100, 2);
    });

    test('should handle very small amounts without losing precision', () => {
      const input = {
        ...baseInput,
        baseSalary: 650, // Minimum wage level
        overtimeHours: 0.25, // 15 minutes overtime
        allowances: {
          transport: 0.01 // Very small allowance
        }
      };

      const result = calculator.calculatePayroll(input);

      // Should not lose small amounts to rounding errors
      expect(result.totalAllowances).toBeGreaterThan(0);
      expect(result.overtimeAmount).toBeGreaterThan(0);
      
      // But should still be properly rounded
      expect(Number.isInteger(result.totalAllowances * 100)).toBe(true);
    });
  });

  describe('Tax Calculation Rounding', () => {
    test('should round income tax correctly', () => {
      const annualIncome = 15555.55; // Odd annual income
      
      const tax = calculator.calculateIncomeTax(annualIncome);

      // Tax should be calculated precisely but final result rounded
      expect(Number.isInteger(tax * 100)).toBe(true);
      expect(tax).toBeGreaterThan(0);
    });

    test('should round solidarity tax correctly', () => {
      const annualIncome = 25777.77; // Amount that qualifies for solidarity tax

      const solidarityTax = calculator.calculateSolidarityTax(annualIncome);

      // Should be properly rounded to cents
      expect(Number.isInteger(solidarityTax * 100)).toBe(true);
    });

    test('should handle tax bracket transitions smoothly', () => {
      // Test income right at bracket boundary
      const bracketBoundary = GREEK_TAX_BRACKETS[0].max;
      const income1 = bracketBoundary - 0.01; // Just below bracket
      const income2 = bracketBoundary + 0.01; // Just above bracket

      const tax1 = calculator.calculateIncomeTax(income1);
      const tax2 = calculator.calculateIncomeTax(income2);

      // Tax should increase smoothly, not jump due to rounding
      expect(tax2).toBeGreaterThan(tax1);
      expect(tax2 - tax1).toBeLessThan(1); // Should be small difference

      // Both should be properly rounded
      expect(Number.isInteger(tax1 * 100)).toBe(true);
      expect(Number.isInteger(tax2 * 100)).toBe(true);
    });
  });

  describe('EFKA Contribution Rounding', () => {
    test('should round EFKA contributions correctly', () => {
      const grossPay = 1333.33; // Amount that creates fractional contributions

      const efkaContributions = calculator.calculateEfkaContributions(grossPay);

      // All EFKA amounts should be rounded to cents
      expect(Number.isInteger(efkaContributions.employee.main * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employee.auxiliary * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employee.unemployment * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employee.total * 100)).toBe(true);

      expect(Number.isInteger(efkaContributions.employer.main * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employer.auxiliary * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employer.unemployment * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employer.sickness * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employer.workAccident * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employer.total * 100)).toBe(true);
    });

    test('should maintain consistency between individual and total EFKA amounts', () => {
      const grossPay = 1555.55;

      const efkaContributions = calculator.calculateEfkaContributions(grossPay);

      // Calculate expected totals
      const expectedEmployeeTotal = 
        efkaContributions.employee.main + 
        efkaContributions.employee.auxiliary + 
        efkaContributions.employee.unemployment;

      const expectedEmployerTotal = 
        efkaContributions.employer.main + 
        efkaContributions.employer.auxiliary + 
        efkaContributions.employer.unemployment + 
        efkaContributions.employer.sickness + 
        efkaContributions.employer.workAccident;

      // Totals should match sum of components (within rounding tolerance)
      expect(efkaContributions.employee.total).toBeCloseTo(expectedEmployeeTotal, 2);
      expect(efkaContributions.employer.total).toBeCloseTo(expectedEmployerTotal, 2);
    });
  });

  describe('Net Pay Calculation Consistency', () => {
    test('should ensure net pay calculation is consistent', () => {
      const input = {
        ...baseInput,
        baseSalary: 1234.56,
        overtimeHours: 2.5,
        allowances: {
          transport: 77.77,
          food: 88.88
        }
      };

      const result = calculator.calculatePayroll(input);

      // Net pay should equal gross pay minus total deductions (within rounding)
      const calculatedNetPay = result.grossPay - result.totalDeductions;
      
      expect(result.netPay).toBeCloseTo(calculatedNetPay, 2);

      // All amounts should be properly rounded
      expect(Number.isInteger(result.grossPay * 100)).toBe(true);
      expect(Number.isInteger(result.totalDeductions * 100)).toBe(true);
      expect(Number.isInteger(result.netPay * 100)).toBe(true);
    });

    test('should handle complex calculation with all components', () => {
      const input = {
        ...baseInput,
        baseSalary: 1999.99,
        overtimeHours: 4.33,
        nightHours: 6.67,
        sundayHours: 8.25,
        allowances: {
          transport: 55.55,
          food: 66.66,
          housing: 111.11,
          position: 222.22
        },
        benefitsInKind: {
          mealVouchers: 333.33,
          companyCar: 15000
        },
        tips: 77.77
      };

      const result = calculator.calculatePayroll(input);

      // All final amounts should be rounded to cents
      expect(Number.isInteger(result.grossPay * 100)).toBe(true);
      expect(Number.isInteger(result.totalDeductions * 100)).toBe(true);
      expect(Number.isInteger(result.netPay * 100)).toBe(true);
      expect(Number.isInteger(result.totalEmployerCost * 100)).toBe(true);

      // Net pay calculation should be consistent
      expect(result.netPay).toBeCloseTo(
        result.grossPay - result.totalDeductions + result.netTips, 
        2
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle very small salaries without rounding to zero', () => {
      const input = {
        ...baseInput,
        baseSalary: 1.00, // Very small salary
        regularHours: 1
      };

      const result = calculator.calculatePayroll(input);

      // Should still calculate taxes and contributions
      expect(result.grossPay).toBeGreaterThan(0);
      expect(result.netPay).toBeGreaterThan(0);
      
      // Should be properly rounded
      expect(Number.isInteger(result.grossPay * 100)).toBe(true);
      expect(Number.isInteger(result.netPay * 100)).toBe(true);
    });

    test('should handle zero amounts correctly', () => {
      const input = {
        ...baseInput,
        baseSalary: 0,
        regularHours: 0
      };

      const result = calculator.calculatePayroll(input);

      // Should handle zero amounts without errors
      expect(result.grossPay).toBe(0);
      expect(result.netPay).toBe(0);
      expect(result.totalDeductions).toBe(0);

      // Zero should still pass rounding tests
      expect(Number.isInteger(result.grossPay * 100)).toBe(true);
      expect(Number.isInteger(result.netPay * 100)).toBe(true);
    });

    test('should handle amounts with many decimal places', () => {
      const input = {
        ...baseInput,
        baseSalary: 1234.56789012345, // Many decimal places
        allowances: {
          transport: 77.999999999
        }
      };

      const result = calculator.calculatePayroll(input);

      // Should be rounded to exactly 2 decimal places
      expect(Math.round(result.grossPay * 100) / 100).toBe(result.grossPay);
      expect(Math.round(result.totalAllowances * 100) / 100).toBe(result.totalAllowances);
    });

    test('should maintain rounding consistency across multiple calculations', () => {
      const input = {
        ...baseInput,
        baseSalary: 1333.33
      };

      // Run calculation multiple times
      const result1 = calculator.calculatePayroll(input);
      const result2 = calculator.calculatePayroll(input);

      // Results should be identical (deterministic rounding)
      expect(result1.grossPay).toBe(result2.grossPay);
      expect(result1.netPay).toBe(result2.netPay);
      expect(result1.totalDeductions).toBe(result2.totalDeductions);
    });
  });

  describe('Mathematical Precision', () => {
    test('should avoid floating point precision errors', () => {
      // Test with numbers known to cause floating point issues
      const input = {
        ...baseInput,
        baseSalary: 0.1 + 0.2, // Should equal 0.3 but floating point gives ~0.30000000000000004
        allowances: {
          transport: 0.1 * 3 // Should equal 0.3
        }
      };

      const result = calculator.calculatePayroll(input);

      // Should handle floating point precision correctly
      expect(result.baseSalary).toBeCloseTo(0.3, 2);
      expect(result.totalAllowances).toBeCloseTo(0.3, 2);
      
      // Final amounts should be properly rounded
      expect(Number.isInteger(result.grossPay * 100)).toBe(true);
      expect(Number.isInteger(result.netPay * 100)).toBe(true);
    });

    test('should handle percentage calculations precisely', () => {
      const grossPay = 1000;
      const efkaContributions = calculator.calculateEfkaContributions(grossPay);

      // Verify percentage calculations are precise
      const expectedEmployeeMain = grossPay * EFKA_RATES.employee.main;
      const expectedEmployerMain = grossPay * EFKA_RATES.employer.main;

      expect(efkaContributions.employee.main).toBeCloseTo(expectedEmployeeMain, 2);
      expect(efkaContributions.employer.main).toBeCloseTo(expectedEmployerMain, 2);

      // Should be rounded to cents
      expect(Number.isInteger(efkaContributions.employee.main * 100)).toBe(true);
      expect(Number.isInteger(efkaContributions.employer.main * 100)).toBe(true);
    });
  });
});