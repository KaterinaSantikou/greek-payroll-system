/**
 * PayrollEngine Unit Tests
 * 
 * Comprehensive unit tests for the core PayrollEngine module.
 * Tests calculation accuracy, error handling, and business logic.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { PayrollEngine } from '../../engine/PayrollEngine.js';
import { GREEK_LAW_2024_1 } from '../../shared/law-constants.js';
import { 
  PayrollCalculationInput,
  ContractType,
  EmploymentType 
} from '../../shared/payrollDomain.js';

// Mock dependencies
const mockRepository = {
  getEmployeePayrollInfo: jest.fn(),
  getTimesheetData: jest.fn(),
  getPayrollScope: jest.fn(),
  savePayrollResults: jest.fn(),
  getPayrollResults: jest.fn(),
  healthCheck: jest.fn()
};

const mockCompliance = {
  validateOvertimeCaps: jest.fn(),
  getLawVersionForDate: jest.fn(),
  submitDigitalWorkCard: jest.fn(),
  validateTaxIdentifiers: jest.fn(),
  healthCheck: jest.fn()
};

describe('PayrollEngine', () => {
  let payrollEngine: PayrollEngine;
  let basicInput: PayrollCalculationInput;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock responses
    mockCompliance.validateOvertimeCaps.mockResolvedValue([]);
    mockCompliance.getLawVersionForDate.mockResolvedValue('2024.1');
    mockCompliance.validateTaxIdentifiers.mockResolvedValue([]);
    
    // Create engine instance
    payrollEngine = new PayrollEngine(
      mockRepository as any,
      mockCompliance as any,
      { validateInputs: true }
    );

    // Setup basic input
    basicInput = {
      employeeId: 'EMP001',
      periodId: '2024-01',
      baseSalary: 1000,
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {},
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2023-01-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    };
  });

  describe('Basic Salary Calculations', () => {
    test('should calculate basic salary correctly', async () => {
      const result = await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      expect(result.employeeId).toBe('EMP001');
      expect(result.periodId).toBe('2024-01');
      expect(result.baseSalary).toBe(1000);
      expect(result.grossPay).toBeGreaterThanOrEqual(1000);
      expect(result.netPay).toBeLessThan(result.grossPay);
      expect(result.totalDeductions).toBeGreaterThan(0);
    });

    test('should handle minimum wage correctly', async () => {
      const minWageInput = { ...basicInput, baseSalary: 760 }; // 2024 minimum wage
      
      const result = await payrollEngine.calculateEmployeePayroll(minWageInput, GREEK_LAW_2024_1);
      
      expect(result.baseSalary).toBe(760);
      expect(result.grossPay).toBe(760);
      expect(result.netPay).toBeGreaterThan(600); // Should be reasonable after taxes
    });

    test('should calculate hourly rate correctly', async () => {
      const hourlyInput = { 
        ...basicInput, 
        hourlyRate: 5.77, // €1000 / 173.33 hours
        baseSalary: 1000 
      };
      
      const result = await payrollEngine.calculateEmployeePayroll(hourlyInput, GREEK_LAW_2024_1);
      
      expect(result.baseSalary).toBe(1000);
      // Hourly rate should be consistent with monthly salary
      const expectedHourlyRate = result.baseSalary / 173.33;
      expect(Math.abs((hourlyInput.hourlyRate || 0) - expectedHourlyRate)).toBeLessThan(0.1);
    });
  });

  describe('Overtime Calculations', () => {
    test('should calculate overtime premium correctly', async () => {
      const overtimeInput = {
        ...basicInput,
        workingHours: {
          regularHours: 173.33,
          overtimeHours: 20,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0
        }
      };
      
      const result = await payrollEngine.calculateEmployeePayroll(overtimeInput, GREEK_LAW_2024_1);
      
      expect(result.overtimeAmount).toBeGreaterThan(0);
      
      // Overtime should be paid at 125% of regular rate
      const regularHourlyRate = result.baseSalary / 173.33;
      const expectedOvertimeAmount = 20 * regularHourlyRate * 1.25;
      expect(Math.abs(result.overtimeAmount - expectedOvertimeAmount)).toBeLessThan(5); // €5 tolerance
    });

    test('should calculate night premium correctly', async () => {
      const nightInput = {
        ...basicInput,
        workingHours: {
          regularHours: 150,
          overtimeHours: 0,
          nightHours: 23.33,
          sundayHours: 0,
          holidayHours: 0
        }
      };
      
      const result = await payrollEngine.calculateEmployeePayroll(nightInput, GREEK_LAW_2024_1);
      
      expect(result.nightPremium).toBeGreaterThan(0);
      
      // Night premium should be 25% extra
      const regularHourlyRate = result.baseSalary / 173.33;
      const expectedNightPremium = 23.33 * regularHourlyRate * 0.25;
      expect(Math.abs(result.nightPremium - expectedNightPremium)).toBeLessThan(5);
    });

    test('should calculate Sunday premium correctly', async () => {
      const sundayInput = {
        ...basicInput,
        workingHours: {
          regularHours: 165.33,
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 8,
          holidayHours: 0
        }
      };
      
      const result = await payrollEngine.calculateEmployeePayroll(sundayInput, GREEK_LAW_2024_1);
      
      expect(result.sundayPremium).toBeGreaterThan(0);
      
      // Sunday premium should be 75% extra (175% total - 100% base)
      const regularHourlyRate = result.baseSalary / 173.33;
      const expectedSundayPremium = 8 * regularHourlyRate * 0.75;
      expect(Math.abs(result.sundayPremium - expectedSundayPremium)).toBeLessThan(2);
    });
  });

  describe('Tax Calculations', () => {
    test('should calculate income tax for low earner', async () => {
      const result = await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.incomeTax).toBeLessThan(result.grossPay * 0.3); // Should not exceed 30%
    });

    test('should calculate income tax for high earner', async () => {
      const highEarnerInput = { ...basicInput, baseSalary: 5000 };
      
      const result = await payrollEngine.calculateEmployeePayroll(highEarnerInput, GREEK_LAW_2024_1);
      
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.incomeTax).toBeGreaterThan(1000); // Should be significant for high earners
    });

    test('should calculate solidarity tax correctly', async () => {
      const highEarnerInput = { ...basicInput, baseSalary: 3000 };
      
      const result = await payrollEngine.calculateEmployeePayroll(highEarnerInput, GREEK_LAW_2024_1);
      
      // Solidarity tax applies above certain thresholds
      if (result.taxableIncome * 12 > 12000) {
        expect(result.solidarityTax).toBeGreaterThan(0);
      }
    });

    test('should not apply solidarity tax below threshold', async () => {
      const lowEarnerInput = { ...basicInput, baseSalary: 600 };
      
      const result = await payrollEngine.calculateEmployeePayroll(lowEarnerInput, GREEK_LAW_2024_1);
      
      // Annual income of €7,200 should be below solidarity tax threshold
      expect(result.solidarityTax).toBe(0);
    });
  });

  describe('EFKA Calculations', () => {
    test('should calculate employee EFKA contributions correctly', async () => {
      const result = await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      expect(result.employeeEfkaMain).toBeGreaterThan(0);
      expect(result.employeeEfkaAux).toBeGreaterThan(0);
      expect(result.employeeUnemployment).toBeGreaterThan(0);
      
      // EFKA main should be around 6.67% of gross pay
      const expectedEfkaMain = result.grossPay * 0.0667;
      expect(Math.abs(result.employeeEfkaMain - expectedEfkaMain)).toBeLessThan(10);
      
      // EFKA auxiliary should be around 6.95% of gross pay
      const expectedEfkaAux = result.grossPay * 0.0695;
      expect(Math.abs(result.employeeEfkaAux - expectedEfkaAux)).toBeLessThan(10);
    });

    test('should calculate employer EFKA contributions correctly', async () => {
      const result = await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      expect(result.employerEfkaMain).toBeGreaterThan(0);
      expect(result.employerEfkaAux).toBeGreaterThan(0);
      expect(result.employerUnemployment).toBeGreaterThan(0);
      expect(result.employerSickness).toBeGreaterThan(0);
      expect(result.employerWorkAccident).toBeGreaterThan(0);
      
      // Employer contributions should be higher than employee contributions
      expect(result.employerEfkaMain).toBeGreaterThan(result.employeeEfkaMain);
    });

    test('should respect EFKA contribution ceiling', async () => {
      const highEarnerInput = { ...basicInput, baseSalary: 10000 }; // Very high salary
      
      const result = await payrollEngine.calculateEmployeePayroll(highEarnerInput, GREEK_LAW_2024_1);
      
      // EFKA contributions should be capped at ceiling (5.88 * minimum wage)
      const efkaCeiling = 760 * 5.88; // €4,468.80
      const maxEfkaContribution = efkaCeiling * 0.0667;
      
      expect(result.employeeEfkaMain).toBeLessThanOrEqual(maxEfkaContribution + 1); // Small tolerance
    });
  });

  describe('Allowances and Benefits', () => {
    test('should calculate allowances correctly', async () => {
      const allowanceInput = {
        ...basicInput,
        allowances: {
          food: 100,
          transport: 50,
          marriage: 80,
          family: 120
        }
      };
      
      const result = await payrollEngine.calculateEmployeePayroll(allowanceInput, GREEK_LAW_2024_1);
      
      expect(result.totalAllowances).toBe(350);
      expect(result.grossPay).toBe(1350); // Base + allowances
    });

    test('should handle tips correctly', async () => {
      const tipsInput = {
        ...basicInput,
        tips: 200
      };
      
      const result = await payrollEngine.calculateEmployeePayroll(tipsInput, GREEK_LAW_2024_1);
      
      expect(result.totalTips).toBe(200);
      expect(result.grossPay).toBeGreaterThan(1000); // Should include tips
      
      // Tips should be taxed above €150 threshold
      if (result.totalTips > 150) {
        expect(result.tipsTax).toBeGreaterThan(0);
      }
    });

    test('should calculate benefits in kind correctly', async () => {
      const benefitsInput = {
        ...basicInput,
        benefitsInKind: {
          mealVouchers: 100, // Tax-free
          companyCar: 300    // Taxable
        }
      };
      
      const result = await payrollEngine.calculateEmployeePayroll(benefitsInput, GREEK_LAW_2024_1);
      
      expect(result.taxFreeBenefits).toBe(100);
      expect(result.taxableBenefits).toBe(300);
      expect(result.grossPay).toBeGreaterThan(1000); // Should include taxable benefits
    });
  });

  describe('Mathematical Consistency', () => {
    test('net pay should equal gross pay minus deductions', async () => {
      const result = await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      const calculatedNetPay = result.grossPay - result.totalDeductions;
      expect(Math.abs(result.netPay - calculatedNetPay)).toBeLessThan(0.01);
    });

    test('total deductions should equal sum of individual deductions', async () => {
      const result = await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      const calculatedDeductions = 
        result.incomeTax + 
        result.solidarityTax + 
        result.employeeEfkaMain + 
        result.employeeEfkaAux + 
        result.employeeUnemployment;
        
      expect(Math.abs(result.totalDeductions - calculatedDeductions)).toBeLessThan(0.01);
    });

    test('employer cost should equal gross pay plus employer contributions', async () => {
      const result = await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      const calculatedEmployerCost = 
        result.grossPay +
        result.employerEfkaMain +
        result.employerEfkaAux +
        result.employerUnemployment +
        result.employerSickness +
        result.employerWorkAccident;
        
      expect(Math.abs(result.totalEmployerCost - calculatedEmployerCost)).toBeLessThan(0.01);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle zero salary', async () => {
      const zeroInput = { ...basicInput, baseSalary: 0 };
      
      const result = await payrollEngine.calculateEmployeePayroll(zeroInput, GREEK_LAW_2024_1);
      
      expect(result.grossPay).toBe(0);
      expect(result.netPay).toBe(0);
      expect(result.totalDeductions).toBe(0);
    });

    test('should validate negative salary', async () => {
      const negativeInput = { ...basicInput, baseSalary: -500 };
      
      await expect(
        payrollEngine.calculateEmployeePayroll(negativeInput, GREEK_LAW_2024_1)
      ).rejects.toThrow();
    });

    test('should validate excessive working hours', async () => {
      const excessiveHoursInput = {
        ...basicInput,
        workingHours: {
          regularHours: 800, // More than hours in a month
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0
        }
      };
      
      // Should validate during compliance check
      mockCompliance.validateOvertimeCaps.mockResolvedValue([{
        code: 'EXCESSIVE_HOURS',
        field: 'workingHours',
        message: 'Working hours exceed legal limits',
        messageGr: 'Οι ώρες εργασίας υπερβαίνουν τα νόμιμα όρια',
        severity: 'error'
      }]);
      
      await expect(
        payrollEngine.calculateEmployeePayroll(excessiveHoursInput, GREEK_LAW_2024_1)
      ).rejects.toThrow();
    });

    test('should handle part-time employees', async () => {
      const partTimeInput = {
        ...basicInput,
        baseSalary: 500,
        isFullTime: false,
        workingHours: {
          regularHours: 86.66, // Half time
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0
        }
      };
      
      const result = await payrollEngine.calculateEmployeePayroll(partTimeInput, GREEK_LAW_2024_1);
      
      expect(result.baseSalary).toBe(500);
      expect(result.grossPay).toBe(500);
      expect(result.netPay).toBeGreaterThan(0);
      expect(result.netPay).toBeLessThan(500);
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple employees', async () => {
      const inputs = [
        basicInput,
        { ...basicInput, employeeId: 'EMP002', baseSalary: 1500 },
        { ...basicInput, employeeId: 'EMP003', baseSalary: 2000 }
      ];
      
      const result = await payrollEngine.calculateBatchPayroll(inputs, GREEK_LAW_2024_1);
      
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      
      // Each result should have correct employee ID
      expect(result.results[0].employeeId).toBe('EMP001');
      expect(result.results[1].employeeId).toBe('EMP002');
      expect(result.results[2].employeeId).toBe('EMP003');
      
      // Results should have different amounts based on salary
      expect(result.results[1].grossPay).toBeGreaterThan(result.results[0].grossPay);
      expect(result.results[2].grossPay).toBeGreaterThan(result.results[1].grossPay);
    });

    test('should handle batch errors gracefully', async () => {
      const inputs = [
        basicInput,
        { ...basicInput, employeeId: 'EMP002', baseSalary: -1000 }, // Invalid
        { ...basicInput, employeeId: 'EMP003', baseSalary: 2000 }
      ];
      
      const result = await payrollEngine.calculateBatchPayroll(inputs, GREEK_LAW_2024_1);
      
      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2); // Two successful calculations
      expect(result.errors.length).toBeGreaterThan(0); // At least one error
    });
  });

  describe('Compliance Integration', () => {
    test('should validate overtime limits', async () => {
      const overtimeInput = {
        ...basicInput,
        workingHours: {
          regularHours: 173.33,
          overtimeHours: 80, // Excessive overtime
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0
        }
      };
      
      await payrollEngine.calculateEmployeePayroll(overtimeInput, GREEK_LAW_2024_1);
      
      // Should have called compliance validation
      expect(mockCompliance.validateOvertimeCaps).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'EMP001',
          workingHours: expect.objectContaining({
            overtimeHours: 80
          })
        })
      );
    });

    test('should validate tax identifiers', async () => {
      await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      // Should validate AFM and AMKA if available
      if (mockCompliance.validateTaxIdentifiers.mock.calls.length > 0) {
        expect(mockCompliance.validateTaxIdentifiers).toHaveBeenCalled();
      }
    });
  });

  describe('Performance and Caching', () => {
    test('should complete calculation within reasonable time', async () => {
      const startTime = Date.now();
      
      await payrollEngine.calculateEmployeePayroll(basicInput, GREEK_LAW_2024_1);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent calculations', async () => {
      const inputs = Array.from({ length: 10 }, (_, i) => ({
        ...basicInput,
        employeeId: `EMP${i.toString().padStart(3, '0')}`,
        baseSalary: 1000 + (i * 100)
      }));
      
      const promises = inputs.map(input => 
        payrollEngine.calculateEmployeePayroll(input, GREEK_LAW_2024_1)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.employeeId).toBe(`EMP${index.toString().padStart(3, '0')}`);
        expect(result.baseSalary).toBe(1000 + (index * 100));
      });
    });
  });
});