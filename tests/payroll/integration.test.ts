/**
 * Payroll Integration Tests
 * 
 * End-to-end tests for complete Greek payroll calculations combining:
 * - Overtime calculations with all premium types
 * - Complex allowance packages
 * - Prorated salaries and bonuses
 * - Complete tax and EFKA calculations
 * - Rounding consistency across all calculations
 * - Real-world payroll scenarios
 */

import { PayrollCalculator, type PayrollCalculationInput } from '../../lib/payroll/calculators/payroll-calculator';
import { SeveranceRulesService } from '../../server/services/SeveranceRulesService';
import scenarios from '../payroll_scenarios.json';

// Mock the database for severance service
jest.mock('../../server/db');

describe('Payroll Integration Tests', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
    jest.clearAllMocks();
  });

  describe('Complete Payroll Scenarios', () => {
    test('should calculate comprehensive payroll with all components', () => {
      const input: PayrollCalculationInput = {
        employeeId: 'integration-test-001',
        periodId: '2025-01',
        baseSalary: 2000,
        regularHours: 160,
        overtimeHours: 6, // Mixed tiers
        nightHours: 20,   // Night shift premium
        sundayHours: 8,   // Sunday premium
        holidayHours: 4,  // Holiday premium
        leaveHours: {
          annual: 16,     // 2 days annual leave
          sick: 8         // 1 day sick leave
        },
        allowances: {
          food: 120,
          transport: 100,
          housing: 200,
          marriage: 60,
          family: 150,
          education: 80,
          experience: 180,
          position: 250
        },
        benefitsInKind: {
          mealVouchers: 350,
          companyCar: 20000,
          housing: 300
        },
        tips: 200,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2023-01-01'),
        periodStartDate: new Date('2025-01-01'),
        periodEndDate: new Date('2025-01-31')
      };

      const result = calculator.calculatePayroll(input);

      // Verify all major components are calculated
      expect(result.baseSalary).toBe(2000);
      expect(result.regularPay).toBeGreaterThan(0);
      expect(result.overtimeAmount).toBeGreaterThan(0);
      expect(result.nightPremium).toBeGreaterThan(0);
      expect(result.sundayPremium).toBeGreaterThan(0);
      expect(result.holidayPremium).toBeGreaterThan(0);
      
      // Verify allowances
      expect(result.totalAllowances).toBe(1140); // Sum of all allowances
      expect(result.allowancesBreakdown.food).toBe(120);
      expect(result.allowancesBreakdown.position).toBe(250);

      // Verify Greek bonuses (prorated for 2+ years employment)
      expect(result.christmasBonus).toBeGreaterThan(0);
      expect(result.easterBonus).toBeGreaterThan(0);
      expect(result.vacationBonus).toBeGreaterThan(0);
      expect(result.totalBonuses).toBeGreaterThan(0);

      // Verify leave calculations
      expect(result.paidLeave).toBeGreaterThan(0);
      expect(result.sickPay).toBeGreaterThan(0);
      expect(result.totalLeavePay).toBeGreaterThan(0);

      // Verify benefits in kind
      expect(result.taxFreeBenefits).toBeGreaterThan(0);
      expect(result.taxableBenefits).toBeGreaterThan(0);
      expect(result.imputedIncome).toBeGreaterThan(0);

      // Verify tips
      expect(result.totalTips).toBe(200);
      expect(result.tipsTax).toBeGreaterThan(0);
      expect(result.netTips).toBeLessThan(200);

      // Verify taxes and contributions
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.solidarityTax).toBeGreaterThanOrEqual(0);
      expect(result.employeeEfkaMain).toBeGreaterThan(0);
      expect(result.employeeEfkaAux).toBeGreaterThan(0);
      expect(result.employeeUnemployment).toBeGreaterThan(0);

      // Verify employer costs
      expect(result.employerEfkaMain).toBeGreaterThan(0);
      expect(result.totalEmployerCost).toBeGreaterThan(result.grossPay);

      // Verify final calculations
      expect(result.grossPay).toBeGreaterThan(result.baseSalary);
      expect(result.taxableIncome).toBeGreaterThan(result.grossPay); // Includes imputed income
      expect(result.netPay).toBeGreaterThan(0);
      expect(result.netPay).toBeLessThan(result.grossPay);

      // Verify calculation consistency
      const expectedNetPay = result.grossPay - result.totalDeductions + result.netTips;
      expect(result.netPay).toBeCloseTo(expectedNetPay, 2);

      // Verify all amounts are properly rounded
      expect(Number.isInteger(result.grossPay * 100)).toBe(true);
      expect(Number.isInteger(result.netPay * 100)).toBe(true);
      expect(Number.isInteger(result.totalDeductions * 100)).toBe(true);
    });

    test('should handle part-time employee with minimal benefits', () => {
      const input: PayrollCalculationInput = {
        employeeId: 'part-time-test-001',
        periodId: '2025-01',
        baseSalary: 800,
        regularHours: 80, // Half-time
        overtimeHours: 2,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        allowances: {
          transport: 40
        },
        contractType: 'fixed-term',
        isFullTime: false,
        employmentStartDate: new Date('2024-06-01'), // 7 months employment
        periodStartDate: new Date('2025-01-01'),
        periodEndDate: new Date('2025-01-31')
      };

      const result = calculator.calculatePayroll(input);

      // Part-time calculations should still be accurate
      expect(result.baseSalary).toBe(800);
      expect(result.regularPay).toBeGreaterThan(0);
      expect(result.overtimeAmount).toBeGreaterThan(0);
      expect(result.totalAllowances).toBe(40);

      // Bonuses should be prorated
      expect(result.christmasBonus).toBeGreaterThan(0);
      expect(result.christmasBonus).toBeLessThan(result.baseSalary); // Less than full bonus

      // All calculations should be consistent
      expect(result.netPay).toBeGreaterThan(0);
      expect(result.netPay).toBeLessThan(result.grossPay);
    });

    test('should handle new employee with minimal service', () => {
      const input: PayrollCalculationInput = {
        employeeId: 'new-employee-001',
        periodId: '2025-01',
        baseSalary: 1000,
        regularHours: 120, // Started mid-month
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2025-01-10'), // Very new employee
        periodStartDate: new Date('2025-01-10'),
        periodEndDate: new Date('2025-01-31')
      };

      const result = calculator.calculatePayroll(input);

      // Basic calculations should work
      expect(result.baseSalary).toBe(1000);
      expect(result.regularPay).toBeGreaterThan(0);

      // Bonuses should be minimal due to short service
      expect(result.christmasBonus).toBeGreaterThanOrEqual(0);
      expect(result.christmasBonus).toBeLessThan(100); // Very small due to short tenure

      // Should still have proper tax calculations
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.employeeEfkaMain).toBeGreaterThan(0);
    });

    test('should handle seasonal employee with reduced bonuses', () => {
      const input: PayrollCalculationInput = {
        employeeId: 'seasonal-001',
        periodId: '2025-01',
        baseSalary: 1200,
        regularHours: 160,
        overtimeHours: 4,
        nightHours: 10,
        sundayHours: 8,
        holidayHours: 0,
        allowances: {
          food: 100,
          transport: 60
        },
        contractType: 'seasonal',
        isFullTime: true,
        employmentStartDate: new Date('2024-05-01'), // 8 months employment
        periodStartDate: new Date('2025-01-01'),
        periodEndDate: new Date('2025-01-31')
      };

      const result = calculator.calculatePayroll(input);

      // Should calculate all components
      expect(result.baseSalary).toBe(1200);
      expect(result.overtimeAmount).toBeGreaterThan(0);
      expect(result.nightPremium).toBeGreaterThan(0);
      expect(result.sundayPremium).toBeGreaterThan(0);
      expect(result.totalAllowances).toBe(160);

      // Seasonal workers should get reduced bonuses (50% reduction)
      expect(result.christmasBonus).toBeGreaterThan(0);
      expect(result.christmasBonus).toBeLessThan(result.baseSalary * 0.6); // Less than normal bonus
    });
  });

  describe('Historical Scenario Validation', () => {
    test('should match expected basic monthly salary calculation', () => {
      // Based on payroll_scenarios.json - basic_monthly_salary
      const input: PayrollCalculationInput = {
        employeeId: 'scenario-basic',
        periodId: '2024-01',
        baseSalary: 1000,
        regularHours: 160,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2023-01-01'),
        periodStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2024-01-31')
      };

      const result = calculator.calculatePayroll(input);

      // Verify against expected values with tolerance
      expect(result.grossPay).toBeCloseTo(1000, 1);
      expect(result.netPay).toBeGreaterThan(800); // Should be roughly in expected range
      expect(result.employeeEfkaMain + result.employeeEfkaAux + result.employeeUnemployment).toBeGreaterThan(70);
    });

    test('should handle overtime calculation scenario', () => {
      // Based on payroll_scenarios.json - overtime_calculation  
      const input: PayrollCalculationInput = {
        employeeId: 'scenario-overtime',
        periodId: '2024-01',
        baseSalary: 1200,
        regularHours: 160,
        overtimeHours: 5, // 5 hours overtime
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2023-01-01'),
        periodStartDate: new Date('2024-01-01'),
        periodEndDate: new Date('2024-01-31')
      };

      const result = calculator.calculatePayroll(input);

      // Verify overtime is calculated
      expect(result.overtimeAmount).toBeGreaterThan(40); // Should be around 50+ based on tiers
      expect(result.grossPay).toBeGreaterThan(1200); // Should include overtime
      expect(result.netPay).toBeGreaterThan(1000); // Should be in expected range
    });

    test('should handle Christmas bonus calculation', () => {
      // Based on payroll_scenarios.json - christmas_bonus
      const input: PayrollCalculationInput = {
        employeeId: 'scenario-christmas',
        periodId: '2024-12',
        baseSalary: 1300,
        regularHours: 160,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2023-01-01'), // Full year employment
        periodStartDate: new Date('2024-12-01'),
        periodEndDate: new Date('2024-12-31')
      };

      const result = calculator.calculatePayroll(input);

      // Should include full Christmas bonus
      expect(result.christmasBonus).toBeGreaterThan(1000); // Should be roughly 1083 as per scenario
      expect(result.grossPay).toBeGreaterThan(2200); // Base + bonus + other components
    });
  });

  describe('Complex Integration Scenarios', () => {
    test('should handle high-earning manager with all components', () => {
      const input: PayrollCalculationInput = {
        employeeId: 'manager-001',
        periodId: '2025-01',
        baseSalary: 4000, // High salary
        regularHours: 160,
        overtimeHours: 8, // All three tiers
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        allowances: {
          position: 500,    // Management allowance
          experience: 300,  // Senior experience
          education: 150,   // Advanced degree
          transport: 150,
          food: 200
        },
        benefitsInKind: {
          companyCar: 35000, // Expensive car
          housing: 800,      // Housing benefit
          mealVouchers: 400
        },
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2020-01-01'), // Long-term employee
        periodStartDate: new Date('2025-01-01'),
        periodEndDate: new Date('2025-01-31')
      };

      const result = calculator.calculatePayroll(input);

      // High earner should have significant taxes
      expect(result.incomeTax).toBeGreaterThan(800); // Progressive tax system
      expect(result.solidarityTax).toBeGreaterThan(0); // Should trigger solidarity tax
      
      // Should have full bonuses for long-term employment
      expect(result.christmasBonus).toBeCloseTo(result.baseSalary * 1.0417, 1);
      
      // Benefits should be properly split between taxable and tax-free
      expect(result.taxFreeBenefits).toBeGreaterThan(0);
      expect(result.taxableBenefits).toBeGreaterThan(500);
      
      // Net pay should still be substantial
      expect(result.netPay).toBeGreaterThan(3000);
    });

    test('should handle complex hotel worker scenario', () => {
      const input: PayrollCalculationInput = {
        employeeId: 'hotel-worker-001',
        periodId: '2025-01',
        baseSalary: 900,
        regularHours: 160,
        overtimeHours: 12, // Lots of overtime
        nightHours: 40,   // Many night shifts
        sundayHours: 16,  // Weekend work
        holidayHours: 8,  // Holiday work
        allowances: {
          food: 80,
          transport: 60,
          position: 100 // Service position allowance
        },
        tips: 350, // Significant tips
        contractType: 'seasonal',
        isFullTime: true,
        employmentStartDate: new Date('2024-03-01'), // 10 months employment
        periodStartDate: new Date('2025-01-01'),
        periodEndDate: new Date('2025-01-31')
      };

      const result = calculator.calculatePayroll(input);

      // Should calculate all premium types
      expect(result.overtimeAmount).toBeGreaterThan(100); // Significant overtime
      expect(result.nightPremium).toBeGreaterThan(80);   // 40 hours * 25% premium
      expect(result.sundayPremium).toBeGreaterThan(80);  // 16 hours * 75% premium
      expect(result.holidayPremium).toBeGreaterThan(40); // 8 hours * 100% premium

      // Tips should be taxed
      expect(result.tipsTax).toBeGreaterThan(0);
      expect(result.netTips).toBeLessThan(350);

      // Seasonal contract should reduce bonuses
      expect(result.christmasBonus).toBeGreaterThan(0);
      expect(result.christmasBonus).toBeLessThan(result.baseSalary * 0.6);

      // Final calculation should be consistent
      const expectedGrossPay = 
        result.baseSalary +
        result.overtimeAmount +
        result.nightPremium +
        result.sundayPremium +
        result.holidayPremium +
        result.totalAllowances +
        result.totalBonuses +
        result.taxFreeBenefits;
      
      expect(result.grossPay).toBeCloseTo(expectedGrossPay, 2);
    });
  });

  describe('Termination Integration', () => {
    const mockSeveranceRules = {
      id: 'test-rules',
      version: 'greek-v2025.1',
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: null,
      isActive: true,
      bands: [
        { minMonths: 0, maxMonths: 12, severanceMonths: 0 },
        { minMonths: 12, maxMonths: 24, severanceMonths: 2 },
        { minMonths: 24, maxMonths: 60, severanceMonths: 3 },
        { minMonths: 60, maxMonths: 120, severanceMonths: 4 },
        { minMonths: 120, maxMonths: 180, severanceMonths: 5 },
        { minMonths: 180, maxMonths: 240, severanceMonths: 6 },
        { minMonths: 240, maxMonths: 300, severanceMonths: 12 },
        { minMonths: 300, maxMonths: 999, severanceMonths: 17 }
      ],
      legalReference: 'Ν. 4093/2012, άρθρα 1-3',
      description: 'Test severance rules',
      descriptionGr: 'Κανόνες αποζημίωσης δοκιμής',
      createdAt: new Date(),
      createdBy: 'test',
      approvedAt: null,
      approvedBy: null
    };

    test('should calculate final payroll with severance for terminated employee', () => {
      // Final month payroll for terminated employee
      const input: PayrollCalculationInput = {
        employeeId: 'terminated-001',
        periodId: '2025-01',
        baseSalary: 1500,
        regularHours: 80, // Half month due to termination
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        allowances: {
          transport: 40, // Prorated
          food: 50
        },
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2021-01-01'), // 4 years employment
        periodStartDate: new Date('2025-01-01'),
        periodEndDate: new Date('2025-01-15') // Terminated mid-month
      };

      const payrollResult = calculator.calculatePayroll(input);
      
      // Calculate severance separately
      const monthsOfService = 48; // 4 years
      const terminationType = 'dismissal';
      const severanceEligible = SeveranceRulesService.isSeveranceEligible(terminationType);
      
      expect(severanceEligible).toBe(true);

      const severanceResult = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        input.baseSalary,
        mockSeveranceRules
      );

      // Should get 3 months severance for 4 years service
      expect(severanceResult.severanceAmount).toBe(4500); // 3 * 1500
      expect(severanceResult.severanceMonths).toBe(3);

      // Regular payroll should be prorated
      expect(payrollResult.grossPay).toBeLessThan(input.baseSalary); // Partial month
      expect(payrollResult.netPay).toBeGreaterThan(0);

      // Total final payment would be payroll + severance
      const totalFinalPayment = payrollResult.netPay + severanceResult.severanceAmount;
      expect(totalFinalPayment).toBeGreaterThan(4500);
    });

    test('should handle dismissal for cause (no severance)', () => {
      const monthsOfService = 60; // 5 years
      const monthlyWage = 1800;
      const terminationType = 'dismissal';
      const terminationCause = 'SERIOUS_MISCONDUCT';

      const severanceEligible = SeveranceRulesService.isSeveranceEligible(terminationType, terminationCause);
      
      expect(severanceEligible).toBe(false);
      
      // Employee would only get regular final payroll, no severance
    });

    test('should handle constructive dismissal with severance', () => {
      const monthsOfService = 84; // 7 years
      const monthlyWage = 1600;
      const terminationType = 'resignation';
      const terminationCause = 'EMPLOYER_BREACH';

      const severanceEligible = SeveranceRulesService.isSeveranceEligible(terminationType, terminationCause);
      
      expect(severanceEligible).toBe(true);

      const severanceResult = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockSeveranceRules
      );

      // Should get 4 months severance for 7 years service
      expect(severanceResult.severanceAmount).toBe(6400); // 4 * 1600
      expect(severanceResult.severanceMonths).toBe(4);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle employee with zero salary gracefully', () => {
      const input: PayrollCalculationInput = {
        employeeId: 'zero-salary-001',
        periodId: '2025-01',
        baseSalary: 0,
        regularHours: 0,
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

      const result = calculator.calculatePayroll(input);

      // Should handle gracefully without throwing errors
      expect(result.grossPay).toBe(0);
      expect(result.netPay).toBe(0);
      expect(result.totalDeductions).toBe(0);
    });

    test('should maintain consistency across multiple calculations', () => {
      const input: PayrollCalculationInput = {
        employeeId: 'consistency-test-001',
        periodId: '2025-01',
        baseSalary: 1333.33, // Odd amount
        regularHours: 160,
        overtimeHours: 3.5,
        nightHours: 7.25,
        sundayHours: 0,
        holidayHours: 0,
        allowances: {
          transport: 77.77,
          food: 88.88
        },
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2023-06-15'),
        periodStartDate: new Date('2025-01-01'),
        periodEndDate: new Date('2025-01-31')
      };

      // Run calculation multiple times
      const result1 = calculator.calculatePayroll(input);
      const result2 = calculator.calculatePayroll(input);

      // Results should be identical (deterministic)
      expect(result1.grossPay).toBe(result2.grossPay);
      expect(result1.netPay).toBe(result2.netPay);
      expect(result1.totalDeductions).toBe(result2.totalDeductions);
    });
  });
});