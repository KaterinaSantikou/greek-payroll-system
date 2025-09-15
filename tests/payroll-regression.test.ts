/**
 * Payroll Regression Test Suite
 * 
 * Comprehensive snapshot tests with 15+ sample employees to prevent
 * regression in payroll calculation logic.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { PayrollEngine } from '../engine/PayrollEngine.js';
import { PayrollRepositoryService } from '../services/PayrollRepositoryService.js';
import { ComplianceConnectorService } from '../services/ComplianceConnectorService.js';
import { GREEK_LAW_2024_1 } from '../shared/law-constants.js';
import { 
  PayrollCalculationInput,
  EmploymentType,
  ContractType 
} from '../shared/payrollDomain.js';

// =============================================================================
// TEST DATA - 15+ SAMPLE EMPLOYEES
// =============================================================================

const SAMPLE_EMPLOYEES: Array<{
  name: string;
  input: PayrollCalculationInput;
  expectedGross: number;
  expectedNet: number;
  description: string;
}> = [
  // 1. Minimum wage full-time employee
  {
    name: 'Maria Papadopoulos - Minimum Wage',
    description: 'Full-time employee earning minimum wage with standard hours',
    input: {
      employeeId: 'EMP001',
      periodId: '2024-01',
      baseSalary: 760,
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
    },
    expectedGross: 760.00,
    expectedNet: 645.12
  },

  // 2. Mid-level salary with overtime
  {
    name: 'Kostas Dimitriou - Mid-Level with Overtime',
    description: 'Mid-level employee with overtime and night work',
    input: {
      employeeId: 'EMP002',
      periodId: '2024-01',
      baseSalary: 1500,
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 20,
        nightHours: 15,
        sundayHours: 8,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {
        food: 120,
        transport: 80
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2022-03-15'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 1987.50,
    expectedNet: 1587.23
  },

  // 3. High earner with bonuses
  {
    name: 'Elena Konstantinou - High Earner',
    description: 'High-earning employee with bonuses and allowances',
    input: {
      employeeId: 'EMP003',
      periodId: '2024-01',
      baseSalary: 3500,
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {
        food: 150,
        transport: 100,
        position: 300
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2020-06-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 4050.00,
    expectedNet: 2834.75
  },

  // 4. Part-time employee
  {
    name: 'Nikos Georgiou - Part-Time',
    description: 'Part-time employee with reduced hours',
    input: {
      employeeId: 'EMP004',
      periodId: '2024-01',
      baseSalary: 450,
      workingHours: {
        regularHours: 86.66, // Half-time
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {},
      contractType: ContractType.INDEFINITE,
      isFullTime: false,
      employmentStartDate: new Date('2023-09-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 450.00,
    expectedNet: 398.25
  },

  // 5. Seasonal hotel worker
  {
    name: 'Anna Michalopoulos - Seasonal',
    description: 'Seasonal hotel worker with tips and irregular hours',
    input: {
      employeeId: 'EMP005',
      periodId: '2024-01',
      baseSalary: 900,
      workingHours: {
        regularHours: 180,
        overtimeHours: 25,
        nightHours: 30,
        sundayHours: 16,
        holidayHours: 8
      },
      leaveHours: {},
      allowances: {
        food: 100
      },
      tips: 350,
      contractType: ContractType.SEASONAL,
      isFullTime: true,
      employmentStartDate: new Date('2024-01-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 1598.75,
    expectedNet: 1289.45
  },

  // 6. Employee with family allowances
  {
    name: 'Dimitris Papadakis - Family Man',
    description: 'Employee with marriage and family allowances',
    input: {
      employeeId: 'EMP006',
      periodId: '2024-01',
      baseSalary: 1200,
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 5,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {
        marriage: 100,
        family: 150
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2021-11-15'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 1483.33,
    expectedNet: 1187.89
  },

  // 7. New hire mid-month
  {
    name: 'Sofia Alexandrou - New Hire Mid-Month',
    description: 'Employee hired mid-month requiring proration',
    input: {
      employeeId: 'EMP007',
      periodId: '2024-01',
      baseSalary: 1000,
      workingHours: {
        regularHours: 86.66, // Half month
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {},
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2024-01-16'), // Mid-month hire
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 500.00,
    expectedNet: 440.50
  },

  // 8. Employee with sick leave
  {
    name: 'Yannis Stavros - Sick Leave',
    description: 'Employee with paid sick leave hours',
    input: {
      employeeId: 'EMP008',
      periodId: '2024-01',
      baseSalary: 1100,
      workingHours: {
        regularHours: 150,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {
        sick: 23.33 // Paid sick leave
      },
      allowances: {},
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2022-08-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 1100.00,
    expectedNet: 936.75
  },

  // 9. Contract worker
  {
    name: 'Theodoros Katsaros - Contract Worker',
    description: 'Fixed-term contract worker with project allowance',
    input: {
      employeeId: 'EMP009',
      periodId: '2024-01',
      baseSalary: 2200,
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {
        position: 200
      },
      contractType: ContractType.FIXED_TERM,
      isFullTime: true,
      employmentStartDate: new Date('2023-10-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 2400.00,
    expectedNet: 1824.00
  },

  // 10. Employee with annual leave
  {
    name: 'Katerina Nikolaou - Annual Leave',
    description: 'Employee taking paid annual leave',
    input: {
      employeeId: 'EMP010',
      periodId: '2024-01',
      baseSalary: 1400,
      workingHours: {
        regularHours: 140,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {
        annual: 33.33 // Paid annual leave
      },
      allowances: {
        food: 80
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2021-04-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 1480.00,
    expectedNet: 1196.40
  },

  // 11. Senior employee with experience allowance
  {
    name: 'Petros Ioannou - Senior Employee',
    description: 'Senior employee with experience and education allowances',
    input: {
      employeeId: 'EMP011',
      periodId: '2024-01',
      baseSalary: 2800,
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {
        experience: 250,
        education: 180,
        position: 150
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2015-02-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 3380.00,
    expectedNet: 2404.10
  },

  // 12. Employee with benefits in kind
  {
    name: 'Ioanna Christou - Benefits Package',
    description: 'Employee with company car and meal vouchers',
    input: {
      employeeId: 'EMP012',
      periodId: '2024-01',
      baseSalary: 1800,
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {},
      benefitsInKind: {
        mealVouchers: 120, // Tax-free
        companyCar: 300   // Taxable
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2020-09-15'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 2220.00,
    expectedNet: 1687.20
  },

  // 13. Night shift worker
  {
    name: 'Alexandros Sotirou - Night Shift',
    description: 'Employee working primarily night shifts',
    input: {
      employeeId: 'EMP013',
      periodId: '2024-01',
      baseSalary: 1000,
      workingHours: {
        regularHours: 100,
        overtimeHours: 0,
        nightHours: 73.33, // Most hours at night
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {
        food: 100
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2023-05-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 1315.97,
    expectedNet: 1089.24
  },

  // 14. Employee with mixed shift patterns
  {
    name: 'Christina Vasileiou - Mixed Shifts',
    description: 'Employee with complex shift pattern including holidays',
    input: {
      employeeId: 'EMP014',
      periodId: '2024-01',
      baseSalary: 1300,
      workingHours: {
        regularHours: 150,
        overtimeHours: 15,
        nightHours: 20,
        sundayHours: 12,
        holidayHours: 8
      },
      leaveHours: {},
      allowances: {
        transport: 90
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2022-12-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 1788.46,
    expectedNet: 1411.54
  },

  // 15. Termination mid-month
  {
    name: 'Michalis Kouris - Terminated Mid-Month',
    description: 'Employee terminated mid-month with severance',
    input: {
      employeeId: 'EMP015',
      periodId: '2024-01',
      baseSalary: 1600,
      workingHours: {
        regularHours: 86.66, // Half month
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {},
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2020-01-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-15') // Terminated mid-month
    },
    expectedGross: 800.00,
    expectedNet: 684.00
  },

  // 16. Complex case with everything
  {
    name: 'Georgios Antoniou - Complex Case',
    description: 'Complex employee with all types of compensation and deductions',
    input: {
      employeeId: 'EMP016',
      periodId: '2024-01',
      baseSalary: 2500,
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 18,
        nightHours: 25,
        sundayHours: 16,
        holidayHours: 8
      },
      leaveHours: {
        annual: 8
      },
      allowances: {
        food: 140,
        transport: 110,
        marriage: 80,
        family: 120,
        experience: 200,
        position: 180
      },
      tips: 280,
      benefitsInKind: {
        mealVouchers: 100,
        companyCar: 250
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2018-03-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    },
    expectedGross: 4343.25,
    expectedNet: 3094.34
  }
];

// =============================================================================
// TEST SETUP
// =============================================================================

describe('Payroll Regression Tests', () => {
  let payrollEngine: PayrollEngine;
  
  beforeAll(() => {
    // Mock repository and compliance services
    const mockRepository = {
      getEmployeePayrollInfo: jest.fn(),
      getTimesheetData: jest.fn(),
      getPayrollScope: jest.fn(),
      savePayrollResults: jest.fn()
    } as any;
    
    const mockCompliance = {
      validateOvertimeCaps: jest.fn().mockResolvedValue([]),
      getLawVersionForDate: jest.fn().mockResolvedValue('2024.1'),
      submitDigitalWorkCard: jest.fn().mockResolvedValue(true),
      validateTaxIdentifiers: jest.fn().mockResolvedValue([])
    } as any;
    
    payrollEngine = new PayrollEngine(
      mockRepository,
      mockCompliance,
      { validateInputs: false } // Disable validation for tests
    );
  });

  // =============================================================================
  // INDIVIDUAL EMPLOYEE TESTS
  // =============================================================================

  test.each(SAMPLE_EMPLOYEES)('$name - Payroll Calculation', async (employee) => {
    const result = await payrollEngine.calculateEmployeePayroll(employee.input, GREEK_LAW_2024_1);
    
    // Test gross pay calculation
    expect(result.grossPay).toBeCloseTo(employee.expectedGross, 2);
    
    // Test net pay calculation
    expect(result.netPay).toBeCloseTo(employee.expectedNet, 2);
    
    // Test basic structure
    expect(result.employeeId).toBe(employee.input.employeeId);
    expect(result.periodId).toBe(employee.input.periodId);
    expect(result.lawVersionId).toBe('2024.1');
    
    // Test that all required fields are present
    expect(result.baseSalary).toBeGreaterThanOrEqual(0);
    expect(result.totalDeductions).toBeGreaterThanOrEqual(0);
    expect(result.totalEmployerCost).toBeGreaterThanOrEqual(result.grossPay);
    
    // Test mathematical consistency
    const calculatedNet = result.grossPay - result.totalDeductions;
    expect(result.netPay).toBeCloseTo(calculatedNet, 2);
    
    // Test EFKA calculations are reasonable
    expect(result.employeeEfkaMain + result.employeeEfkaAux + result.employeeUnemployment).toBeLessThan(result.grossPay * 0.15);
    
    // Test tax calculations are reasonable
    expect(result.incomeTax + result.solidarityTax).toBeLessThan(result.grossPay * 0.5);
  });

  // =============================================================================
  // BATCH PROCESSING TESTS
  // =============================================================================

  test('Batch Processing - All Employees', async () => {
    const inputs = SAMPLE_EMPLOYEES.map(emp => emp.input);
    
    const batchResult = await payrollEngine.calculateBatchPayroll(inputs, GREEK_LAW_2024_1);
    
    expect(batchResult.success).toBe(true);
    expect(batchResult.results).toHaveLength(SAMPLE_EMPLOYEES.length);
    expect(batchResult.errors).toHaveLength(0);
    
    // Test that each result matches expected values
    for (let i = 0; i < batchResult.results.length; i++) {
      const result = batchResult.results[i];
      const expected = SAMPLE_EMPLOYEES[i];
      
      expect(result.grossPay).toBeCloseTo(expected.expectedGross, 2);
      expect(result.netPay).toBeCloseTo(expected.expectedNet, 2);
    }
    
    // Test aggregate statistics
    const totalGross = batchResult.results.reduce((sum, r) => sum + r.grossPay, 0);
    const totalNet = batchResult.results.reduce((sum, r) => sum + r.netPay, 0);
    const averageGross = totalGross / batchResult.results.length;
    
    expect(totalGross).toBeGreaterThan(0);
    expect(totalNet).toBeGreaterThan(0);
    expect(totalNet).toBeLessThan(totalGross);
    expect(averageGross).toBeGreaterThan(500); // Sanity check
    
    console.log(`\n📊 Batch Processing Summary:`);
    console.log(`   Employees processed: ${batchResult.results.length}`);
    console.log(`   Total gross pay: €${totalGross.toFixed(2)}`);
    console.log(`   Total net pay: €${totalNet.toFixed(2)}`);
    console.log(`   Average gross: €${averageGross.toFixed(2)}`);
    console.log(`   Processing time: ${batchResult.metrics.processingTimeMs}ms`);
    console.log(`   Memory used: ${batchResult.metrics.memoryUsedMB}MB`);
  });

  // =============================================================================
  // EDGE CASES TESTS
  // =============================================================================

  test('Edge Case - Zero Hours Employee', async () => {
    const zeroHoursInput: PayrollCalculationInput = {
      employeeId: 'ZERO001',
      periodId: '2024-01',
      baseSalary: 0,
      workingHours: {
        regularHours: 0,
        overtimeHours: 0,
        nightHours: 0,
        sundayHours: 0,
        holidayHours: 0
      },
      leaveHours: {},
      allowances: {},
      contractType: ContractType.INDEFINITE,
      isFullTime: false,
      employmentStartDate: new Date('2024-01-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    };
    
    const result = await payrollEngine.calculateEmployeePayroll(zeroHoursInput, GREEK_LAW_2024_1);
    
    expect(result.grossPay).toBe(0);
    expect(result.netPay).toBe(0);
    expect(result.totalDeductions).toBe(0);
  });

  test('Edge Case - Maximum Allowed Values', async () => {
    const maxValuesInput: PayrollCalculationInput = {
      employeeId: 'MAX001',
      periodId: '2024-01',
      baseSalary: 50000, // Very high salary
      workingHours: {
        regularHours: 173.33,
        overtimeHours: 60, // Maximum overtime
        nightHours: 80,
        sundayHours: 32,
        holidayHours: 16
      },
      leaveHours: {},
      allowances: {
        position: 5000
      },
      contractType: ContractType.INDEFINITE,
      isFullTime: true,
      employmentStartDate: new Date('2024-01-01'),
      periodStartDate: new Date('2024-01-01'),
      periodEndDate: new Date('2024-01-31')
    };
    
    const result = await payrollEngine.calculateEmployeePayroll(maxValuesInput, GREEK_LAW_2024_1);
    
    expect(result.grossPay).toBeGreaterThan(50000);
    expect(result.netPay).toBeLessThan(result.grossPay);
    expect(result.totalEmployerCost).toBeGreaterThan(result.grossPay);
    
    // High earners should hit tax brackets
    expect(result.incomeTax + result.solidarityTax).toBeGreaterThan(15000);
  });

  // =============================================================================
  // CONSISTENCY TESTS
  // =============================================================================

  test('Calculation Consistency - Same Input Twice', async () => {
    const input = SAMPLE_EMPLOYEES[5].input; // Pick a representative case
    
    const result1 = await payrollEngine.calculateEmployeePayroll(input, GREEK_LAW_2024_1);
    const result2 = await payrollEngine.calculateEmployeePayroll(input, GREEK_LAW_2024_1);
    
    // Results should be identical
    expect(result1.grossPay).toBe(result2.grossPay);
    expect(result1.netPay).toBe(result2.netPay);
    expect(result1.totalDeductions).toBe(result2.totalDeductions);
    expect(result1.incomeTax).toBe(result2.incomeTax);
    expect(result1.solidarityTax).toBe(result2.solidarityTax);
  });

  test('Mathematical Consistency - All Employees', async () => {
    const inputs = SAMPLE_EMPLOYEES.map(emp => emp.input);
    const batchResult = await payrollEngine.calculateBatchPayroll(inputs, GREEK_LAW_2024_1);
    
    for (const result of batchResult.results) {
      // Net pay calculation consistency
      const calculatedNet = result.grossPay - result.totalDeductions;
      expect(result.netPay).toBeCloseTo(calculatedNet, 2);
      
      // Total deductions consistency
      const calculatedDeductions = 
        result.incomeTax + 
        result.solidarityTax + 
        result.employeeEfkaMain + 
        result.employeeEfkaAux + 
        result.employeeUnemployment;
      expect(result.totalDeductions).toBeCloseTo(calculatedDeductions, 2);
      
      // Employer cost consistency
      const calculatedEmployerCost = 
        result.grossPay +
        result.employerEfkaMain +
        result.employerEfkaAux +
        result.employerUnemployment +
        result.employerSickness +
        result.employerWorkAccident;
      expect(result.totalEmployerCost).toBeCloseTo(calculatedEmployerCost, 2);
      
      // Reasonableness checks
      expect(result.netPay).toBeGreaterThanOrEqual(0);
      expect(result.totalDeductions).toBeGreaterThanOrEqual(0);
      expect(result.grossPay).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// SNAPSHOT TESTS FOR REGRESSION PREVENTION
// =============================================================================

describe('Payroll Snapshot Tests', () => {
  test('Complete Payroll Results Snapshot', async () => {
    const mockRepository = {
      getEmployeePayrollInfo: jest.fn(),
      getTimesheetData: jest.fn(),
      getPayrollScope: jest.fn(),
      savePayrollResults: jest.fn()
    } as any;
    
    const mockCompliance = {
      validateOvertimeCaps: jest.fn().mockResolvedValue([]),
      getLawVersionForDate: jest.fn().mockResolvedValue('2024.1'),
      submitDigitalWorkCard: jest.fn().mockResolvedValue(true),
      validateTaxIdentifiers: jest.fn().mockResolvedValue([])
    } as any;
    
    const payrollEngine = new PayrollEngine(mockRepository, mockCompliance, { validateInputs: false });
    
    const inputs = SAMPLE_EMPLOYEES.map(emp => emp.input);
    const batchResult = await payrollEngine.calculateBatchPayroll(inputs, GREEK_LAW_2024_1);
    
    // Create snapshot-friendly format
    const snapshot = batchResult.results.map(result => ({
      employeeId: result.employeeId,
      periodId: result.periodId,
      lawVersionId: result.lawVersionId,
      
      // Main amounts (rounded for stability)
      grossPay: Math.round(result.grossPay * 100) / 100,
      netPay: Math.round(result.netPay * 100) / 100,
      totalDeductions: Math.round(result.totalDeductions * 100) / 100,
      totalEmployerCost: Math.round(result.totalEmployerCost * 100) / 100,
      
      // Tax breakdown
      incomeTax: Math.round(result.incomeTax * 100) / 100,
      solidarityTax: Math.round(result.solidarityTax * 100) / 100,
      
      // EFKA breakdown
      employeeEfkaMain: Math.round(result.employeeEfkaMain * 100) / 100,
      employeeEfkaAux: Math.round(result.employeeEfkaAux * 100) / 100,
      employeeUnemployment: Math.round(result.employeeUnemployment * 100) / 100,
      
      // Employer costs
      employerEfkaMain: Math.round(result.employerEfkaMain * 100) / 100,
      employerEfkaAux: Math.round(result.employerEfkaAux * 100) / 100,
      employerUnemployment: Math.round(result.employerUnemployment * 100) / 100,
      employerSickness: Math.round(result.employerSickness * 100) / 100,
      employerWorkAccident: Math.round(result.employerWorkAccident * 100) / 100
    }));
    
    expect(snapshot).toMatchSnapshot('payroll-calculations-complete-2024-1');
  });
});