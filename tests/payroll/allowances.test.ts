/**
 * Allowances Unit Tests
 * 
 * Tests for Greek payroll allowance calculations including:
 * - Family allowances (marriage, children)
 * - Position allowances (management, dangerous work)
 * - Experience/seniority allowances
 * - Transport and meal allowances
 * - Education allowances
 * - Benefits in kind taxation
 */

import { PayrollCalculator, type PayrollCalculationInput } from '../../lib/payroll/calculators/payroll-calculator';
import { TAX_FREE_LIMITS } from '../../lib/payroll/domain/greek-labor-law';

describe('Allowances Calculations', () => {
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

  describe('Family Allowances', () => {
    test('should calculate marriage allowance', () => {
      const input = {
        ...baseInput,
        allowances: {
          marriage: 50
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.marriage).toBe(50);
      expect(result.totalAllowances).toBe(50);
      expect(result.grossPay).toBeGreaterThan(result.baseSalary);
    });

    test('should calculate family allowance with children', () => {
      const input = {
        ...baseInput,
        allowances: {
          marriage: 40,
          family: 80 // For children
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.marriage).toBe(40);
      expect(result.allowancesBreakdown.family).toBe(80);
      expect(result.totalAllowances).toBe(120);
    });

    test('should handle combined family allowances', () => {
      const input = {
        ...baseInput,
        allowances: {
          marriage: 30,
          family: 60,
          housing: 100
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.totalAllowances).toBe(190);
      expect(result.allowancesBreakdown.marriage).toBe(30);
      expect(result.allowancesBreakdown.family).toBe(60);
      expect(result.allowancesBreakdown.housing).toBe(100);
    });
  });

  describe('Position Allowances', () => {
    test('should calculate position allowance for management roles', () => {
      const input = {
        ...baseInput,
        allowances: {
          position: 200 // Management allowance
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.position).toBe(200);
      expect(result.totalAllowances).toBe(200);
    });

    test('should calculate experience allowance based on seniority', () => {
      const input = {
        ...baseInput,
        allowances: {
          experience: 150 // Seniority-based
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.experience).toBe(150);
      expect(result.totalAllowances).toBe(150);
    });

    test('should combine position and experience allowances', () => {
      const input = {
        ...baseInput,
        allowances: {
          position: 200,
          experience: 100
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.totalAllowances).toBe(300);
      expect(result.allowancesBreakdown.position).toBe(200);
      expect(result.allowancesBreakdown.experience).toBe(100);
    });
  });

  describe('Transport and Meal Allowances', () => {
    test('should calculate transport allowance', () => {
      const input = {
        ...baseInput,
        allowances: {
          transport: 75 // Monthly transport allowance
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.transport).toBe(75);
      expect(result.totalAllowances).toBe(75);
    });

    test('should calculate food allowance', () => {
      const input = {
        ...baseInput,
        allowances: {
          food: 120 // Monthly food allowance
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.food).toBe(120);
      expect(result.totalAllowances).toBe(120);
    });

    test('should combine transport and food allowances', () => {
      const input = {
        ...baseInput,
        allowances: {
          transport: 80,
          food: 100
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.totalAllowances).toBe(180);
      expect(result.allowancesBreakdown.transport).toBe(80);
      expect(result.allowancesBreakdown.food).toBe(100);
    });
  });

  describe('Education Allowances', () => {
    test('should calculate education allowance', () => {
      const input = {
        ...baseInput,
        allowances: {
          education: 60 // Education/qualification allowance
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.education).toBe(60);
      expect(result.totalAllowances).toBe(60);
    });

    test('should handle education with experience allowances', () => {
      const input = {
        ...baseInput,
        allowances: {
          education: 80,
          experience: 120
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.totalAllowances).toBe(200);
      expect(result.allowancesBreakdown.education).toBe(80);
      expect(result.allowancesBreakdown.experience).toBe(120);
    });
  });

  describe('Benefits in Kind', () => {
    test('should calculate tax-free meal vouchers within limit', () => {
      const input = {
        ...baseInput,
        benefitsInKind: {
          mealVouchers: 200 // Within tax-free limit
        }
      };

      const result = calculator.calculatePayroll(input);
      const benefits = calculator.calculateBenefitsInKind(input.benefitsInKind);

      expect(benefits.taxFreeBenefits).toBe(Math.min(200, TAX_FREE_LIMITS.mealVouchers));
      expect(result.taxFreeBenefits).toBeGreaterThan(0);
    });

    test('should calculate taxable meal vouchers above limit', () => {
      const input = {
        ...baseInput,
        benefitsInKind: {
          mealVouchers: 400 // Above tax-free limit
        }
      };

      const result = calculator.calculatePayroll(input);
      const benefits = calculator.calculateBenefitsInKind(input.benefitsInKind);

      const expectedTaxFree = Math.min(400, TAX_FREE_LIMITS.mealVouchers);
      const expectedTaxable = Math.max(0, 400 - TAX_FREE_LIMITS.mealVouchers);

      expect(benefits.taxFreeBenefits).toBe(expectedTaxFree);
      expect(benefits.taxableBenefits).toBeGreaterThanOrEqual(expectedTaxable);
      expect(benefits.imputedIncome).toBeGreaterThan(0);
    });

    test('should calculate company car benefit', () => {
      const input = {
        ...baseInput,
        benefitsInKind: {
          companyCar: 15000 // Annual car value
        }
      };

      const result = calculator.calculatePayroll(input);
      const benefits = calculator.calculateBenefitsInKind(input.benefitsInKind);

      // Company car benefit should be calculated as percentage of car value per month
      expect(benefits.taxableBenefits).toBeGreaterThan(0);
      expect(benefits.imputedIncome).toBeGreaterThan(0);
      expect(result.imputedIncome).toBeGreaterThan(0);
    });

    test('should calculate housing benefit (fully taxable)', () => {
      const input = {
        ...baseInput,
        benefitsInKind: {
          housing: 300 // Monthly housing benefit
        }
      };

      const result = calculator.calculatePayroll(input);
      const benefits = calculator.calculateBenefitsInKind(input.benefitsInKind);

      expect(benefits.taxableBenefits).toBe(300);
      expect(benefits.imputedIncome).toBe(300);
      expect(result.imputedIncome).toBe(300);
    });

    test('should combine multiple benefits in kind', () => {
      const input = {
        ...baseInput,
        benefitsInKind: {
          mealVouchers: 250,
          companyCar: 20000,
          housing: 400
        }
      };

      const result = calculator.calculatePayroll(input);
      const benefits = calculator.calculateBenefitsInKind(input.benefitsInKind);

      // Should have both tax-free and taxable components
      expect(benefits.taxFreeBenefits).toBeGreaterThan(0);
      expect(benefits.taxableBenefits).toBeGreaterThan(0);
      expect(benefits.imputedIncome).toBeGreaterThan(400); // At least housing amount
    });
  });

  describe('Complete Allowances Package', () => {
    test('should calculate comprehensive allowances package', () => {
      const input = {
        ...baseInput,
        allowances: {
          food: 100,
          transport: 80,
          housing: 200,
          marriage: 50,
          family: 120,
          education: 60,
          experience: 150,
          position: 180
        },
        benefitsInKind: {
          mealVouchers: 300,
          companyCar: 18000,
          housing: 250
        }
      };

      const result = calculator.calculatePayroll(input);

      // Total cash allowances
      const expectedTotalAllowances = 100 + 80 + 200 + 50 + 120 + 60 + 150 + 180;
      expect(result.totalAllowances).toBe(expectedTotalAllowances);

      // Should have benefits calculated
      expect(result.taxFreeBenefits).toBeGreaterThan(0);
      expect(result.taxableBenefits).toBeGreaterThan(0);

      // Gross pay should include allowances but not taxable benefits
      expect(result.grossPay).toBeGreaterThan(result.baseSalary + expectedTotalAllowances);
      
      // Taxable income should include imputed income from benefits
      expect(result.taxableIncome).toBeGreaterThan(result.grossPay);
    });

    test('should handle zero allowances', () => {
      const input = {
        ...baseInput
        // No allowances specified
      };

      const result = calculator.calculatePayroll(input);

      expect(result.totalAllowances).toBe(0);
      expect(result.allowancesBreakdown.food).toBe(0);
      expect(result.allowancesBreakdown.transport).toBe(0);
      expect(result.allowancesBreakdown.housing).toBe(0);
      expect(result.allowancesBreakdown.marriage).toBe(0);
      expect(result.allowancesBreakdown.family).toBe(0);
      expect(result.allowancesBreakdown.education).toBe(0);
      expect(result.allowancesBreakdown.experience).toBe(0);
      expect(result.allowancesBreakdown.position).toBe(0);
    });

    test('should handle partial allowances', () => {
      const input = {
        ...baseInput,
        allowances: {
          food: 50,
          position: 100
          // Other allowances not specified (should be 0)
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.totalAllowances).toBe(150);
      expect(result.allowancesBreakdown.food).toBe(50);
      expect(result.allowancesBreakdown.position).toBe(100);
      expect(result.allowancesBreakdown.transport).toBe(0);
      expect(result.allowancesBreakdown.housing).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle negative allowances (deductions)', () => {
      const input = {
        ...baseInput,
        allowances: {
          food: -25 // Could be a deduction
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.food).toBe(-25);
      expect(result.totalAllowances).toBe(-25);
      expect(result.grossPay).toBeLessThan(result.baseSalary);
    });

    test('should handle very large allowances', () => {
      const input = {
        ...baseInput,
        allowances: {
          position: 5000 // Very large position allowance
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.position).toBe(5000);
      expect(result.totalAllowances).toBe(5000);
      expect(result.grossPay).toBe(result.baseSalary + 5000);
    });

    test('should handle decimal allowances', () => {
      const input = {
        ...baseInput,
        allowances: {
          food: 75.50,
          transport: 62.25
        }
      };

      const result = calculator.calculatePayroll(input);

      expect(result.allowancesBreakdown.food).toBe(75.50);
      expect(result.allowancesBreakdown.transport).toBe(62.25);
      expect(result.totalAllowances).toBe(137.75);
    });
  });

  describe('Tax Treatment', () => {
    test('should include cash allowances in gross pay', () => {
      const input = {
        ...baseInput,
        allowances: {
          food: 100,
          transport: 50
        }
      };

      const result = calculator.calculatePayroll(input);

      // Cash allowances should be included in gross pay
      expect(result.grossPay).toBe(result.baseSalary + result.totalAllowances);
    });

    test('should properly separate taxable and non-taxable benefits', () => {
      const input = {
        ...baseInput,
        benefitsInKind: {
          mealVouchers: 500 // Partially tax-free
        }
      };

      const result = calculator.calculatePayroll(input);

      // Should have both tax-free and taxable portions
      expect(result.taxFreeBenefits).toBeGreaterThan(0);
      expect(result.imputedIncome).toBeGreaterThanOrEqual(0);
      
      // Tax-free benefits should be included in gross pay
      expect(result.grossPay).toBeGreaterThanOrEqual(result.baseSalary + result.taxFreeBenefits);
    });
  });
});