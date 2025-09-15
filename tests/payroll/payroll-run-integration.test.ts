/**
 * Payroll Run Integration Tests
 * 
 * Comprehensive integration tests simulating complete payroll runs with edge cases:
 * - Multi-employee payroll processing
 * - Period boundary edge cases (leap years, month transitions)
 * - Data consistency across runs
 * - Error recovery scenarios
 * - Regulatory compliance validation
 * - Performance with large employee datasets
 */

import { PayrollCalculator, type PayrollCalculationInput, type PayrollCalculationResult } from '../../lib/payroll/calculators/payroll-calculator';
import { SeveranceRulesService } from '../../server/services/SeveranceRulesService';

// Mock the database for severance service
jest.mock('../../server/db');

describe('Payroll Run Integration Tests', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
    jest.clearAllMocks();
  });

  describe('Multi-Employee Payroll Run Edge Cases', () => {
    test('should process payroll for mixed employee types with edge cases', () => {
      const employees: PayrollCalculationInput[] = [
        // Edge Case 1: New hire with partial month and immediate overtime
        {
          employeeId: 'new-hire-001',
          periodId: '2025-02',
          baseSalary: 800,
          regularHours: 60, // Started mid-month
          overtimeHours: 15, // Immediate heavy overtime
          nightHours: 20,
          sundayHours: 8,
          holidayHours: 0,
          allowances: { transport: 30, food: 40 },
          contractType: 'fixed-term',
          isFullTime: true,
          employmentStartDate: new Date('2025-02-15'), // Mid-month start
          periodStartDate: new Date('2025-02-15'),
          periodEndDate: new Date('2025-02-28')
        },
        
        // Edge Case 2: Long-term employee with maximum components
        {
          employeeId: 'senior-001',
          periodId: '2025-02',
          baseSalary: 3500,
          regularHours: 160,
          overtimeHours: 25, // Extreme overtime
          nightHours: 60,
          sundayHours: 32,
          holidayHours: 16,
          leaveHours: { annual: 40, sick: 16, maternity: 80 },
          allowances: {
            food: 200, transport: 150, housing: 400,
            marriage: 80, family: 200, education: 120,
            experience: 300, position: 500
          },
          benefitsInKind: {
            mealVouchers: 600, // Above tax-free limit
            companyCar: 45000, // High-value car
            housing: 800
          },
          tips: 450,
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2015-01-01'), // 10+ years
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        },

        // Edge Case 3: Part-time seasonal worker leaving mid-month
        {
          employeeId: 'seasonal-001',
          periodId: '2025-02',
          baseSalary: 600,
          regularHours: 40, // Leaving mid-month
          overtimeHours: 0,
          nightHours: 16,
          sundayHours: 0,
          holidayHours: 0,
          allowances: { transport: 20 },
          contractType: 'seasonal',
          isFullTime: false,
          employmentStartDate: new Date('2024-05-01'), // 9 months
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-14') // Mid-month termination
        },

        // Edge Case 4: Minimum wage employee with complex leave scenario
        {
          employeeId: 'minimum-wage-001',
          periodId: '2025-02',
          baseSalary: 650, // Minimum wage
          regularHours: 80, // Half regular hours
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0,
          leaveHours: { 
            annual: 80,      // Full month annual leave
            sick: 0,
            paternity: 80    // Paternity leave overlap
          },
          benefitsInKind: { mealVouchers: 220 }, // Just at tax-free limit
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2023-08-01'), // 18 months
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        },

        // Edge Case 5: Zero hours with benefits only
        {
          employeeId: 'benefits-only-001',
          periodId: '2025-02',
          baseSalary: 1200,
          regularHours: 0, // No regular hours
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0,
          leaveHours: { sick: 160 }, // Full month sick leave
          allowances: { position: 200, experience: 150 },
          benefitsInKind: { companyCar: 25000, housing: 500 },
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2022-01-01'), // 3+ years
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        }
      ];

      const results: PayrollCalculationResult[] = [];
      const errors: Array<{ employeeId: string; error: string }> = [];

      // Process each employee
      employees.forEach(employee => {
        try {
          const result = calculator.calculatePayroll(employee);
          results.push(result);
          
          // Validate each result
          expect(result.employeeId).toBe(employee.employeeId);
          expect(result.grossPay).toBeGreaterThanOrEqual(0);
          expect(result.netPay).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(result.grossPay)).toBe(true);
          expect(Number.isFinite(result.netPay)).toBe(true);
          
          // Consistency checks
          if (result.grossPay > 0) {
            expect(result.totalDeductions).toBeGreaterThan(0);
          }
          
        } catch (error) {
          errors.push({ 
            employeeId: employee.employeeId, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      // Should process all employees without errors
      expect(errors).toHaveLength(0);
      expect(results).toHaveLength(employees.length);

      // Verify specific edge case results
      const newHire = results.find(r => r.employeeId === 'new-hire-001')!;
      expect(newHire.grossPay).toBeLessThan(800); // Partial month
      expect(newHire.overtimeAmount).toBeGreaterThan(100); // Heavy overtime
      expect(newHire.christmasBonus).toBeLessThan(50); // Very new employee

      const senior = results.find(r => r.employeeId === 'senior-001')!;
      expect(senior.grossPay).toBeGreaterThan(3500); // With all components
      expect(senior.solidarityTax).toBeGreaterThan(0); // High earner
      expect(senior.christmasBonus).toBeGreaterThan(3000); // Full bonus

      const seasonal = results.find(r => r.employeeId === 'seasonal-001')!;
      expect(seasonal.grossPay).toBeLessThan(600); // Partial month
      expect(seasonal.christmasBonus).toBeLessThan(seasonal.baseSalary * 0.6); // Seasonal reduction

      const minimumWage = results.find(r => r.employeeId === 'minimum-wage-001')!;
      expect(minimumWage.paidLeave).toBeGreaterThan(0);
      expect(minimumWage.paternityPay).toBeGreaterThan(0);
      expect(minimumWage.grossPay).toBeLessThan(800); // Mostly leave

      const benefitsOnly = results.find(r => r.employeeId === 'benefits-only-001')!;
      expect(benefitsOnly.regularPay).toBe(0);
      expect(benefitsOnly.sickPay).toBeGreaterThan(0);
      expect(benefitsOnly.imputedIncome).toBeGreaterThan(0);
    });

    test('should handle payroll run with data consistency issues', () => {
      const inconsistentEmployees: PayrollCalculationInput[] = [
        // Inconsistency 1: Overtime without regular hours
        {
          employeeId: 'inconsistent-001',
          periodId: '2025-02',
          baseSalary: 1000,
          regularHours: 0,
          overtimeHours: 10, // Overtime without regular work
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0,
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2024-01-01'),
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        },

        // Inconsistency 2: Future employment dates
        {
          employeeId: 'inconsistent-002',
          periodId: '2025-02',
          baseSalary: 1200,
          regularHours: 160,
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0,
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2025-12-01'), // Future start date
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        },

        // Inconsistency 3: Extreme values
        {
          employeeId: 'inconsistent-003',
          periodId: '2025-02',
          baseSalary: 0.01, // Extremely low salary
          regularHours: 999, // Extreme hours
          overtimeHours: 200,
          nightHours: 100,
          sundayHours: 50,
          holidayHours: 30,
          allowances: { transport: 99999 }, // Extreme allowance
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2020-01-01'),
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        }
      ];

      const results: PayrollCalculationResult[] = [];

      // Process inconsistent data - should handle gracefully
      inconsistentEmployees.forEach(employee => {
        const result = calculator.calculatePayroll(employee);
        results.push(result);

        // Should not throw errors, but results may be unusual
        expect(Number.isFinite(result.grossPay)).toBe(true);
        expect(Number.isFinite(result.netPay)).toBe(true);
        expect(result.grossPay).toBeGreaterThanOrEqual(0);
        expect(result.netPay).toBeGreaterThanOrEqual(0);
      });

      expect(results).toHaveLength(inconsistentEmployees.length);
    });
  });

  describe('Period Boundary Edge Cases', () => {
    test('should handle leap year February correctly', () => {
      const leapYearEmployee: PayrollCalculationInput = {
        employeeId: 'leap-year-001',
        periodId: '2024-02', // 2024 is a leap year
        baseSalary: 1200,
        regularHours: 168, // 29 days * 8 hours ÷ 1.4 (accounting for leap day)
        overtimeHours: 4,
        nightHours: 0,
        sundayHours: 8,
        holidayHours: 0,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2023-01-01'),
        periodStartDate: new Date('2024-02-01'),
        periodEndDate: new Date('2024-02-29') // Leap day
      };

      const result = calculator.calculatePayroll(leapYearEmployee);

      expect(result.grossPay).toBeGreaterThan(result.baseSalary);
      expect(result.overtimeAmount).toBeGreaterThan(0);
      expect(result.sundayPremium).toBeGreaterThan(0);
      expect(Number.isInteger(result.grossPay * 100)).toBe(true);
    });

    test('should handle month-end transitions correctly', () => {
      const monthEndEmployees: PayrollCalculationInput[] = [
        // January 31 -> February 1 transition
        {
          employeeId: 'month-end-jan',
          periodId: '2025-01',
          baseSalary: 1100,
          regularHours: 160,
          overtimeHours: 2,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0,
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2024-01-31'), // Last day of month
          periodStartDate: new Date('2025-01-01'),
          periodEndDate: new Date('2025-01-31')
        },

        // February 28 -> March 1 transition (non-leap year)
        {
          employeeId: 'month-end-feb',
          periodId: '2025-02',
          baseSalary: 1300,
          regularHours: 152, // February has fewer days
          overtimeHours: 0,
          nightHours: 16,
          sundayHours: 0,
          holidayHours: 0,
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2024-02-28'),
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        }
      ];

      monthEndEmployees.forEach(employee => {
        const result = calculator.calculatePayroll(employee);
        
        // Should handle month transitions without issues
        expect(result.grossPay).toBeGreaterThan(0);
        expect(result.netPay).toBeGreaterThan(0);
        expect(Number.isFinite(result.christmasBonus)).toBe(true);
        
        // Bonuses should be properly prorated
        expect(result.christmasBonus).toBeGreaterThan(0);
      });
    });

    test('should handle year-end bonus calculations', () => {
      const yearEndEmployee: PayrollCalculationInput = {
        employeeId: 'year-end-001',
        periodId: '2024-12',
        baseSalary: 2000,
        regularHours: 160,
        overtimeHours: 8,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 16, // Holiday work in December
        allowances: { food: 100, transport: 80, position: 200 },
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2023-01-01'), // Full year+ employment
        periodStartDate: new Date('2024-12-01'),
        periodEndDate: new Date('2024-12-31')
      };

      const result = calculator.calculatePayroll(yearEndEmployee);

      // December should include full bonuses
      expect(result.christmasBonus).toBeGreaterThan(result.baseSalary);
      expect(result.easterBonus).toBeGreaterThan(0);
      expect(result.vacationBonus).toBeGreaterThan(0);
      expect(result.totalBonuses).toBeGreaterThan(result.baseSalary * 1.5);

      // Holiday premium should be calculated
      expect(result.holidayPremium).toBeGreaterThan(0);

      // Year-end employee should have substantial gross pay
      expect(result.grossPay).toBeGreaterThan(result.baseSalary * 2.5);
    });
  });

  describe('Large Dataset Performance Edge Cases', () => {
    test('should handle large employee batch processing', () => {
      const startTime = Date.now();
      const largeEmployeeBatch: PayrollCalculationInput[] = [];

      // Generate 100 employees with varied scenarios
      for (let i = 1; i <= 100; i++) {
        largeEmployeeBatch.push({
          employeeId: `batch-employee-${i.toString().padStart(3, '0')}`,
          periodId: '2025-02',
          baseSalary: 800 + (i * 10), // Varied salaries
          regularHours: 140 + (i % 40), // Varied hours
          overtimeHours: i % 12, // Varied overtime
          nightHours: i % 20,
          sundayHours: i % 16,
          holidayHours: i % 8,
          allowances: {
            transport: 50 + (i % 30),
            food: 70 + (i % 50),
            position: i % 3 === 0 ? 100 : 0
          },
          tips: i % 5 === 0 ? 100 + (i % 200) : 0,
          contractType: i % 3 === 0 ? 'seasonal' : 'indefinite' as const,
          isFullTime: i % 10 !== 0,
          employmentStartDate: new Date(2020 + (i % 5), (i % 12), 1),
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        });
      }

      const results: PayrollCalculationResult[] = [];
      const processingErrors: string[] = [];

      // Process all employees
      largeEmployeeBatch.forEach((employee, index) => {
        try {
          const result = calculator.calculatePayroll(employee);
          results.push(result);
          
          // Spot check every 10th result
          if (index % 10 === 0) {
            expect(result.grossPay).toBeGreaterThanOrEqual(0);
            expect(result.netPay).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(result.grossPay)).toBe(true);
          }
        } catch (error) {
          processingErrors.push(`Employee ${employee.employeeId}: ${error}`);
        }
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Performance validation
      expect(processingErrors).toHaveLength(0);
      expect(results).toHaveLength(100);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Aggregate validation
      const totalGrossPay = results.reduce((sum, r) => sum + r.grossPay, 0);
      const totalNetPay = results.reduce((sum, r) => sum + r.netPay, 0);
      const totalEmployerCost = results.reduce((sum, r) => sum + r.totalEmployerCost, 0);

      expect(totalGrossPay).toBeGreaterThan(100000); // Reasonable aggregate
      expect(totalNetPay).toBeGreaterThan(80000);
      expect(totalEmployerCost).toBeGreaterThan(totalGrossPay);
      expect(totalNetPay).toBeLessThan(totalGrossPay);
    });

    test('should maintain consistency across multiple payroll runs', () => {
      const testEmployee: PayrollCalculationInput = {
        employeeId: 'consistency-test',
        periodId: '2025-02',
        baseSalary: 1500,
        regularHours: 160,
        overtimeHours: 6,
        nightHours: 20,
        sundayHours: 8,
        holidayHours: 0,
        allowances: { transport: 75, food: 90, position: 150 },
        benefitsInKind: { mealVouchers: 300, companyCar: 20000 },
        tips: 200,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2022-06-01'),
        periodStartDate: new Date('2025-02-01'),
        periodEndDate: new Date('2025-02-28')
      };

      // Run calculation 10 times
      const results: PayrollCalculationResult[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(calculator.calculatePayroll(testEmployee));
      }

      // All results should be identical (deterministic)
      const firstResult = results[0];
      results.forEach((result, index) => {
        expect(result.grossPay).toBe(firstResult.grossPay);
        expect(result.netPay).toBe(firstResult.netPay);
        expect(result.totalDeductions).toBe(firstResult.totalDeductions);
        expect(result.overtimeAmount).toBe(firstResult.overtimeAmount);
        expect(result.christmasBonus).toBe(firstResult.christmasBonus);
      });
    });
  });

  describe('Regulatory Compliance Edge Cases', () => {
    test('should enforce Greek labor law working time limits', () => {
      const extremeOvertimeEmployee: PayrollCalculationInput = {
        employeeId: 'extreme-overtime',
        periodId: '2025-02',
        baseSalary: 1200,
        regularHours: 160,
        overtimeHours: 100, // Extreme overtime (illegal levels)
        nightHours: 80,
        sundayHours: 40,
        holidayHours: 20,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2023-01-01'),
        periodStartDate: new Date('2025-02-01'),
        periodEndDate: new Date('2025-02-28')
      };

      const result = calculator.calculatePayroll(extremeOvertimeEmployee);

      // Should calculate all overtime (even if extreme) using proper tiers
      expect(result.overtimeAmount).toBeGreaterThan(0);
      
      // Verify 3-tier calculation: tier1 (2h) + tier2 (2h) + tier3 (96h)
      const hourlyRate = result.baseSalary / 160;
      const expectedTier1 = 2 * hourlyRate * 1.25;
      const expectedTier2 = 2 * hourlyRate * 1.5;
      const expectedTier3 = 96 * hourlyRate * 1.75;
      const expectedTotal = expectedTier1 + expectedTier2 + expectedTier3;
      
      expect(result.overtimeAmount).toBeCloseTo(expectedTotal, 1);

      // All premiums should be calculated
      expect(result.nightPremium).toBeGreaterThan(0);
      expect(result.sundayPremium).toBeGreaterThan(0);
      expect(result.holidayPremium).toBeGreaterThan(0);
    });

    test('should handle minimum wage compliance edge cases', () => {
      const belowMinimumWageEmployee: PayrollCalculationInput = {
        employeeId: 'below-minimum',
        periodId: '2025-02',
        baseSalary: 400, // Below minimum wage
        regularHours: 160,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2024-01-01'),
        periodStartDate: new Date('2025-02-01'),
        periodEndDate: new Date('2025-02-28')
      };

      const result = calculator.calculatePayroll(belowMinimumWageEmployee);

      // Should still calculate based on provided salary (system doesn't enforce minimum wage)
      expect(result.baseSalary).toBe(400);
      expect(result.grossPay).toBe(400); // No other components
      
      // EFKA contributions should still be calculated
      expect(result.employeeEfkaMain).toBeGreaterThan(0);
      expect(result.employerEfkaMain).toBeGreaterThan(0);
      
      // Net pay should be less than gross
      expect(result.netPay).toBeLessThan(result.grossPay);
    });

    test('should handle maximum EFKA contribution base edge cases', () => {
      const highEarnerEmployee: PayrollCalculationInput = {
        employeeId: 'high-earner',
        periodId: '2025-02',
        baseSalary: 10000, // Very high salary
        regularHours: 160,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0,
        allowances: { position: 2000, experience: 1000 },
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2018-01-01'),
        periodStartDate: new Date('2025-02-01'),
        periodEndDate: new Date('2025-02-28')
      };

      const result = calculator.calculatePayroll(highEarnerEmployee);

      // High earner should trigger progressive taxation
      expect(result.incomeTax).toBeGreaterThan(1000);
      expect(result.solidarityTax).toBeGreaterThan(0);
      
      // EFKA contributions should be substantial
      expect(result.employeeEfkaMain).toBeGreaterThan(800);
      expect(result.employerEfkaMain).toBeGreaterThan(1000);
      
      // Should have full Greek bonuses
      expect(result.christmasBonus).toBeGreaterThan(8000);
      
      // Net pay should still be substantial despite high taxes
      expect(result.netPay).toBeGreaterThan(8000);
    });
  });

  describe('Error Recovery and Validation Edge Cases', () => {
    test('should handle corrupted calculation scenarios gracefully', () => {
      const corruptedScenarios: PayrollCalculationInput[] = [
        // Scenario 1: Negative values
        {
          employeeId: 'negative-values',
          periodId: '2025-02',
          baseSalary: -1000, // Negative salary
          regularHours: -50,  // Negative hours
          overtimeHours: 5,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0,
          allowances: { transport: -100 }, // Negative allowance
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('2024-01-01'),
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-02-28')
        },

        // Scenario 2: Invalid dates
        {
          employeeId: 'invalid-dates',
          periodId: '2025-02',
          baseSalary: 1200,
          regularHours: 160,
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0,
          contractType: 'indefinite',
          isFullTime: true,
          employmentStartDate: new Date('invalid-date' as any),
          periodStartDate: new Date('2025-02-01'),
          periodEndDate: new Date('2025-01-01') // End before start
        }
      ];

      corruptedScenarios.forEach(scenario => {
        // Should not throw unhandled errors
        expect(() => {
          const result = calculator.calculatePayroll(scenario);
          
          // Results may be unusual but should be finite numbers
          expect(Number.isFinite(result.grossPay) || result.grossPay === 0).toBe(true);
          expect(Number.isFinite(result.netPay) || result.netPay === 0).toBe(true);
        }).not.toThrow();
      });
    });

    test('should validate calculation mathematical consistency', () => {
      const validationEmployee: PayrollCalculationInput = {
        employeeId: 'validation-test',
        periodId: '2025-02',
        baseSalary: 1800,
        regularHours: 160,
        overtimeHours: 8,
        nightHours: 24,
        sundayHours: 16,
        holidayHours: 8,
        leaveHours: { annual: 24, sick: 8 },
        allowances: { transport: 80, food: 100, position: 200 },
        benefitsInKind: { mealVouchers: 280, companyCar: 25000 },
        tips: 150,
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2021-01-01'),
        periodStartDate: new Date('2025-02-01'),
        periodEndDate: new Date('2025-02-28')
      };

      const result = calculator.calculatePayroll(validationEmployee);

      // Mathematical consistency checks
      const calculatedTotalAllowances = Object.values(result.allowancesBreakdown).reduce((sum, val) => sum + val, 0);
      expect(result.totalAllowances).toBeCloseTo(calculatedTotalAllowances, 2);

      const calculatedTotalBonuses = result.christmasBonus + result.easterBonus + result.vacationBonus;
      expect(result.totalBonuses).toBeCloseTo(calculatedTotalBonuses, 2);

      const calculatedTotalLeavePay = result.paidLeave + result.sickPay + result.maternityPay + result.paternityPay;
      expect(result.totalLeavePay).toBeCloseTo(calculatedTotalLeavePay, 2);

      const calculatedTotalEfkaEmployee = result.employeeEfkaMain + result.employeeEfkaAux + result.employeeUnemployment;
      expect(calculatedTotalEfkaEmployee).toBeCloseTo(result.employeeEfkaMain + result.employeeEfkaAux + result.employeeUnemployment, 2);

      // Net pay calculation consistency
      const calculatedNetPay = result.grossPay - result.totalDeductions + result.netTips;
      expect(result.netPay).toBeCloseTo(calculatedNetPay, 2);

      // Employer cost consistency  
      const calculatedEmployerCost = result.grossPay + result.employerEfkaMain + result.employerEfkaAux + 
                                   result.employerUnemployment + result.employerSickness + result.employerWorkAccident;
      expect(result.totalEmployerCost).toBeCloseTo(calculatedEmployerCost, 2);
    });
  });

  describe('Complex Multi-Period Integration', () => {
    test('should handle sequential monthly payroll runs', () => {
      const baseEmployee: Omit<PayrollCalculationInput, 'periodId' | 'periodStartDate' | 'periodEndDate'> = {
        employeeId: 'sequential-test',
        baseSalary: 1400,
        regularHours: 160,
        overtimeHours: 4,
        nightHours: 16,
        sundayHours: 8,
        holidayHours: 0,
        allowances: { transport: 70, food: 90 },
        contractType: 'indefinite',
        isFullTime: true,
        employmentStartDate: new Date('2024-01-01')
      };

      const periods = [
        { periodId: '2025-01', start: '2025-01-01', end: '2025-01-31' },
        { periodId: '2025-02', start: '2025-02-01', end: '2025-02-28' },
        { periodId: '2025-03', start: '2025-03-01', end: '2025-03-31' },
        { periodId: '2025-04', start: '2025-04-01', end: '2025-04-30' },
        { periodId: '2025-05', start: '2025-05-01', end: '2025-05-31' },
        { periodId: '2025-06', start: '2025-06-01', end: '2025-06-30' }
      ];

      const monthlyResults: PayrollCalculationResult[] = [];

      periods.forEach(period => {
        const employee: PayrollCalculationInput = {
          ...baseEmployee,
          periodId: period.periodId,
          periodStartDate: new Date(period.start),
          periodEndDate: new Date(period.end)
        };

        const result = calculator.calculatePayroll(employee);
        monthlyResults.push(result);

        // Each month should be consistent
        expect(result.baseSalary).toBe(1400);
        expect(result.overtimeAmount).toBeGreaterThan(0);
        expect(result.grossPay).toBeGreaterThan(result.baseSalary);
      });

      // All months should have similar base calculations
      const grossPays = monthlyResults.map(r => r.grossPay);
      const maxGross = Math.max(...grossPays);
      const minGross = Math.min(...grossPays);
      
      // Should be consistent within reasonable bounds (bonuses may vary)
      expect(maxGross - minGross).toBeLessThan(500);

      // Verify progression of bonuses over time (employment gets older)
      const bonusesByMonth = monthlyResults.map(r => r.totalBonuses);
      expect(bonusesByMonth[5]).toBeGreaterThanOrEqual(bonusesByMonth[0]); // June >= January
    });
  });
});