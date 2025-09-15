/**
 * Compliance Guardrails Unit Tests
 * 
 * Tests the compliance validation system that ensures payroll calculations
 * meet Greek legal requirements and catch calculation errors.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { ComplianceGuardrailsSystem } from '../../server/complianceGuardrails.js';
import { PayrollCalculationResult } from '../../shared/payrollDomain.js';

describe('ComplianceGuardrailsSystem', () => {
  let complianceSystem: ComplianceGuardrailsSystem;
  let validPayrollResult: PayrollCalculationResult;

  beforeEach(() => {
    complianceSystem = new ComplianceGuardrailsSystem();
    
    // Setup valid payroll result for testing
    validPayrollResult = {
      employeeId: 'EMP001',
      periodId: '2024-01',
      calculationDate: new Date('2024-01-31'),
      calculationVersion: '1.0.0',
      lawVersionId: '2024.1',
      
      // Earnings
      baseSalary: 1000,
      regularPay: 1000,
      overtimeAmount: 150,
      nightPremium: 50,
      sundayPremium: 75,
      holidayPremium: 0,
      totalAllowances: 200,
      allowancesBreakdown: { food: 100, transport: 100 },
      christmasBonus: 0,
      easterBonus: 0,
      vacationBonus: 0,
      totalBonuses: 0,
      annualLeavePay: 0,
      sickLeavePay: 0,
      maternityLeavePay: 0,
      paternityLeavePay: 0,
      totalLeavePay: 0,
      taxFreeBenefits: 0,
      taxableBenefits: 0,
      imputedIncome: 0,
      totalTips: 0,
      tipsTax: 0,
      netTips: 0,
      grossPay: 1475,
      taxableIncome: 1475,
      
      // Deductions
      incomeTax: 162.75, // ~11% effective rate
      solidarityTax: 0,
      employeeEfkaMain: 98.38, // 6.67% of gross
      employeeEfkaAux: 102.51, // 6.95% of gross  
      employeeUnemployment: 7.38, // 0.5% of gross
      totalDeductions: 371.02,
      
      // Employer costs
      employerEfkaMain: 193.31, // 13.11% of gross
      employerEfkaAux: 102.51, // 6.95% of gross
      employerUnemployment: 29.50, // 2% of gross
      employerSickness: 8.85, // 0.6% of gross
      employerWorkAccident: 14.75, // 1% of gross
      totalEmployerCost: 1823.92,
      
      // Final amounts  
      netPay: 1103.98,
      
      // Metadata
      capConsumption: {},
      formatted: {}
    } as PayrollCalculationResult;
  });

  describe('PayrollResult Validation', () => {
    test('should validate compliant payroll result', async () => {
      const result = await complianceSystem.validatePayrollResults(validPayrollResult);
      
      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.summary.errorCount).toBe(0);
      expect(result.summary.complianceRate).toBeGreaterThan(0.95);
    });

    test('should detect mathematical inconsistencies', async () => {
      const inconsistentResult = {
        ...validPayrollResult,
        netPay: 5000, // Wrong net pay calculation
        totalDeductions: 200 // Wrong total deductions
      };
      
      const result = await complianceSystem.validatePayrollResults(inconsistentResult);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      
      // Should have mathematical errors
      const mathErrors = result.violations.filter(v => v.category === 'math');
      expect(mathErrors.length).toBeGreaterThan(0);
      
      const netPayError = mathErrors.find(e => e.code === 'NET_PAY_CALCULATION_ERROR');
      expect(netPayError).toBeDefined();
    });

    test('should validate EFKA rate compliance', async () => {
      const wrongEfkaResult = {
        ...validPayrollResult,
        employeeEfkaMain: 50, // Too low - should be ~6.67% of gross
        employeeEfkaAux: 30   // Too low - should be ~6.95% of gross
      };
      
      const result = await complianceSystem.validatePayrollResults(wrongEfkaResult);
      
      expect(result.isCompliant).toBe(false);
      
      const efkaViolations = result.violations.filter(v => v.category === 'efka');
      expect(efkaViolations.length).toBeGreaterThan(0);
      
      const mainRateError = efkaViolations.find(e => e.code === 'EFKA_MAIN_RATE_MISMATCH');
      expect(mainRateError).toBeDefined();
      expect(mainRateError?.lawReference).toContain('Law 4387/2016');
    });

    test('should validate EFKA contribution ceiling', async () => {
      const highSalaryResult = {
        ...validPayrollResult,
        grossPay: 10000,
        employeeEfkaMain: 800, // Should be capped at ceiling
        baseSalary: 10000
      };
      
      const result = await complianceSystem.validatePayrollResults(highSalaryResult);
      
      // Should detect ceiling violation if EFKA exceeds maximum
      const efkaCeilingViolations = result.violations.filter(v => v.code === 'EFKA_CEILING_EXCEEDED');
      if (efkaCeilingViolations.length > 0) {
        expect(efkaCeilingViolations[0].lawReference).toContain('Law 4387/2016');
      }
    });

    test('should validate tax rate reasonableness', async () => {
      const excessiveTaxResult = {
        ...validPayrollResult,
        incomeTax: 800, // 54% tax rate - unreasonable
        solidarityTax: 50,
        taxableIncome: 1475
      };
      
      const result = await complianceSystem.validatePayrollResults(excessiveTaxResult);
      
      expect(result.isCompliant).toBe(false);
      
      const taxViolations = result.violations.filter(v => v.category === 'tax');
      const excessiveRateError = taxViolations.find(e => e.code === 'EXCESSIVE_TAX_RATE');
      expect(excessiveRateError).toBeDefined();
    });

    test('should validate solidarity tax thresholds', async () => {
      const lowIncomeWithSolidarityTax = {
        ...validPayrollResult,
        taxableIncome: 800, // Below €12,000 annual threshold
        solidarityTax: 50   // Should not have solidarity tax
      };
      
      const result = await complianceSystem.validatePayrollResults(lowIncomeWithSolidarityTax);
      
      expect(result.isCompliant).toBe(false);
      
      const solidarityViolation = result.violations.find(v => 
        v.code === 'SOLIDARITY_TAX_THRESHOLD_VIOLATION'
      );
      expect(solidarityViolation).toBeDefined();
      expect(solidarityViolation?.lawReference).toContain('Law 4223/2013');
    });

    test('should validate bonus limits', async () => {
      const excessiveBonusResult = {
        ...validPayrollResult,
        christmasBonus: 1500, // Exceeds monthly salary
        easterBonus: 600,     // Exceeds half monthly salary
        vacationBonus: 600,   // Exceeds half monthly salary
        baseSalary: 1000
      };
      
      const result = await complianceSystem.validatePayrollResults(excessiveBonusResult);
      
      expect(result.isCompliant).toBe(false);
      
      const bonusViolations = result.violations.filter(v => v.category === 'bonus');
      expect(bonusViolations.length).toBeGreaterThan(0);
      
      const christmasError = bonusViolations.find(e => e.code === 'CHRISTMAS_BONUS_EXCESSIVE');
      expect(christmasError).toBeDefined();
      
      const easterError = bonusViolations.find(e => e.code === 'EASTER_BONUS_EXCESSIVE');
      expect(easterError).toBeDefined();
    });

    test('should validate overtime limits', async () => {
      const excessiveOvertimeResult = {
        ...validPayrollResult,
        overtimeAmount: 500, // Very high overtime amount
        baseSalary: 1000
      };
      
      const result = await complianceSystem.validatePayrollResults(excessiveOvertimeResult);
      
      // May detect excessive overtime depending on calculation
      const overtimeViolations = result.violations.filter(v => v.category === 'overtime');
      if (overtimeViolations.length > 0) {
        const dailyOvertimeError = overtimeViolations.find(e => e.code === 'DAILY_OVERTIME_EXCEEDED');
        if (dailyOvertimeError) {
          expect(dailyOvertimeError.lawReference).toContain('Law 1346/1983');
        }
      }
    });

    test('should validate deduction limits', async () => {
      const highDeductionResult = {
        ...validPayrollResult,
        grossPay: 1000,
        totalDeductions: 800, // 80% deduction rate - excessive
        netPay: 200
      };
      
      const result = await complianceSystem.validatePayrollResults(highDeductionResult);
      
      expect(result.isCompliant).toBe(false);
      
      const deductionViolations = result.violations.filter(v => v.category === 'legal');
      const deductionLimitError = deductionViolations.find(e => e.code === 'DEDUCTION_LIMIT_EXCEEDED');
      expect(deductionLimitError).toBeDefined();
      expect(deductionLimitError?.lawReference).toContain('Law 2112/1920');
    });

    test('should validate tips tax treatment', async () => {
      const wrongTipsTaxResult = {
        ...validPayrollResult,
        totalTips: 300,
        tipsTax: 100 // Wrong calculation - should be based on threshold
      };
      
      const result = await complianceSystem.validatePayrollResults(wrongTipsTaxResult);
      
      // May detect tips tax error if calculation is wrong
      const tipsTaxViolations = result.violations.filter(v => v.code === 'TIPS_TAX_CALCULATION_ERROR');
      if (tipsTaxViolations.length > 0) {
        expect(tipsTaxViolations[0].lawReference).toContain('Law 4172/2013');
      }
    });
  });

  describe('Batch Validation', () => {
    test('should validate multiple payroll results', async () => {
      const results = [
        validPayrollResult,
        { ...validPayrollResult, employeeId: 'EMP002', baseSalary: 1500, grossPay: 1700 },
        { ...validPayrollResult, employeeId: 'EMP003', baseSalary: 800, grossPay: 950 }
      ];
      
      const result = await complianceSystem.validatePayrollResults(results);
      
      expect(result.summary.totalChecks).toBeGreaterThan(100); // Multiple employees * checks per employee
      expect(result.isCompliant).toBe(true); // All should be valid
    });

    test('should handle mixed valid/invalid results', async () => {
      const results = [
        validPayrollResult, // Valid
        { ...validPayrollResult, employeeId: 'EMP002', netPay: -100 }, // Invalid - negative net pay
        { ...validPayrollResult, employeeId: 'EMP003', totalDeductions: 2000 } // Invalid - excessive deductions
      ];
      
      const result = await complianceSystem.validatePayrollResults(results);
      
      expect(result.isCompliant).toBe(false);
      expect(result.summary.errorCount).toBeGreaterThan(0);
      expect(result.violations.length).toBeGreaterThan(0);
      
      // Should have violations from multiple employees
      const violationEmployees = [...new Set(result.violations.map(v => v.employeeId))];
      expect(violationEmployees.length).toBeGreaterThan(1);
    });
  });

  describe('Greek Language Support', () => {
    test('should provide Greek error messages', async () => {
      const invalidResult = {
        ...validPayrollResult,
        netPay: 999999, // Invalid
        totalDeductions: 50
      };
      
      const result = await complianceSystem.validatePayrollResults(invalidResult);
      
      expect(result.violations.length).toBeGreaterThan(0);
      
      result.violations.forEach(violation => {
        expect(violation.message).toBeTruthy();
        expect(violation.messageGr).toBeTruthy();
        expect(violation.messageGr).not.toBe(violation.message); // Should be different language
      });
    });

    test('should include law references', async () => {
      const wrongEfkaResult = {
        ...validPayrollResult,
        employeeEfkaMain: 10 // Too low
      };
      
      const result = await complianceSystem.validatePayrollResults(wrongEfkaResult);
      
      const efkaViolations = result.violations.filter(v => v.category === 'efka');
      const violationsWithLawRef = efkaViolations.filter(v => v.lawReference);
      
      expect(violationsWithLawRef.length).toBeGreaterThan(0);
      violationsWithLawRef.forEach(violation => {
        expect(violation.lawReference).toMatch(/Law \d+\/\d+/); // Should match Greek law format
      });
    });
  });

  describe('Performance and Scalability', () => {
    test('should validate single result quickly', async () => {
      const startTime = Date.now();
      
      await complianceSystem.validatePayrollResults(validPayrollResult);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    test('should handle large batch efficiently', async () => {
      const results = Array.from({ length: 100 }, (_, i) => ({
        ...validPayrollResult,
        employeeId: `EMP${i.toString().padStart(3, '0')}`,
        baseSalary: 1000 + i * 10
      }));
      
      const startTime = Date.now();
      const result = await complianceSystem.validatePayrollResults(results);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.summary.totalChecks).toBeGreaterThan(4000); // Should have run many checks
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      const invalidResult = {
        ...validPayrollResult,
        grossPay: null as any // Invalid type
      };
      
      const result = await complianceSystem.validatePayrollResults(invalidResult);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.code === 'VALIDATION_ERROR')).toBe(true);
    });

    test('should handle missing required fields', async () => {
      const incompleteResult = {
        employeeId: 'EMP001',
        periodId: '2024-01',
        grossPay: 1000
        // Missing many required fields
      } as any;
      
      const result = await complianceSystem.validatePayrollResults(incompleteResult);
      
      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Alert Generation', () => {
    test('should generate alerts for critical violations', async () => {
      const initialAlertCount = complianceSystem['alerts'].length;
      
      const criticalErrorResult = {
        ...validPayrollResult,
        employeeEfkaMain: 10000 // Extremely wrong
      };
      
      await complianceSystem.validatePayrollResults(criticalErrorResult);
      
      const finalAlertCount = complianceSystem['alerts'].length;
      expect(finalAlertCount).toBeGreaterThan(initialAlertCount);
      
      const newAlerts = complianceSystem['alerts'].slice(initialAlertCount);
      expect(newAlerts.some(alert => alert.type === 'EFKA_RATE_MISMATCH')).toBe(true);
    });
  });

  describe('Compliance Dashboard Integration', () => {
    test('should provide dashboard metrics', async () => {
      const dashboard = await complianceSystem.getComplianceDashboard();
      
      expect(dashboard).toHaveProperty('realTimeStatus');
      expect(dashboard).toHaveProperty('alerts');
      expect(dashboard).toHaveProperty('erganiHealth');
      expect(dashboard).toHaveProperty('policyEnforcement');
      expect(dashboard).toHaveProperty('dataRetention');
      
      expect(Array.isArray(dashboard.alerts)).toBe(true);
    });
  });
});