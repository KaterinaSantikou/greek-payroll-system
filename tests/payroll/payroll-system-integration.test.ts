/**
 * Payroll System Integration Tests
 * 
 * Full system integration tests simulating real-world payroll processing:
 * - Complete payroll cycles with database integration
 * - Multi-company payroll processing
 * - Concurrent processing edge cases
 * - System performance under load
 * - Data integrity across system components
 */

import { PayrollCalculationEngine, type PayrollCalculationContext, type PayrollCalculationResult } from '../../server/services/PayrollCalculationEngine';
import { SeveranceRulesService } from '../../server/services/SeveranceRulesService';
import { PayrollCalculator } from '../../lib/payroll/calculators/payroll-calculator';

// Mock database and external services
jest.mock('../../server/db');
jest.mock('../../server/services/CbaPackService');

describe('Payroll System Integration Tests', () => {
  let calculator: PayrollCalculator;

  beforeEach(() => {
    calculator = new PayrollCalculator();
    jest.clearAllMocks();
  });

  describe('Multi-Company Payroll Processing', () => {
    test('should process payroll for multiple companies with different rules', async () => {
      const company1Employees: PayrollCalculationContext[] = [
        // Hotel company with tourism CBA
        {
          employeeId: 'hotel-emp-001',
          contractId: 'contract-hotel-001',
          periodId: '2025-02',
          propertyId: 'hotel-property-001',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-28'),
          hoursWorked: [
            { date: new Date('2025-02-01'), startTime: '06:00', endTime: '14:00', hours: 8 },
            { date: new Date('2025-02-02'), startTime: '22:00', endTime: '06:00', hours: 8, shiftType: 'night' },
            { date: new Date('2025-02-03'), startTime: '06:00', endTime: '16:00', hours: 10 }, // 2h overtime
            { date: new Date('2025-02-04'), startTime: '06:00', endTime: '14:00', hours: 8 },
            { date: new Date('2025-02-05'), startTime: '06:00', endTime: '14:00', hours: 8, shiftType: 'sunday' }
          ]
        }
      ];

      const company2Employees: PayrollCalculationContext[] = [
        // Restaurant with F&B CBA
        {
          employeeId: 'restaurant-emp-001', 
          contractId: 'contract-restaurant-001',
          periodId: '2025-02',
          propertyId: 'restaurant-property-001',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-28'),
          hoursWorked: [
            { date: new Date('2025-02-01'), startTime: '17:00', endTime: '01:00', hours: 8, shiftType: 'night' },
            { date: new Date('2025-02-02'), startTime: '17:00', endTime: '03:00', hours: 10, shiftType: 'night' }, // 2h OT
            { date: new Date('2025-02-03'), startTime: '10:00', endTime: '18:00', hours: 8 },
            { date: new Date('2025-02-04'), startTime: '17:00', endTime: '01:00', hours: 8, shiftType: 'night' },
            { date: new Date('2025-02-05'), startTime: '10:00', endTime: '20:00', hours: 10, shiftType: 'sunday' } // Sunday + 2h OT
          ]
        }
      ];

      // Mock CBA pack responses for different industries
      const mockCbaPackService = require('../../server/services/CbaPackService');
      
      // Hotel industry mock
      mockCbaPackService.CbaPackService.calculateEffectiveWage.mockImplementation((propertyId: string) => {
        if (propertyId.includes('hotel')) {
          return Promise.resolve({ baseWage: 1200, allowances: [], premiums: [] });
        } else if (propertyId.includes('restaurant')) {
          return Promise.resolve({ baseWage: 900, allowances: [], premiums: [] });
        }
        return Promise.resolve({ baseWage: 1000, allowances: [], premiums: [] });
      });

      mockCbaPackService.CbaPackService.getApplicableAllowances.mockResolvedValue([
        { code: 'MEAL', name: 'Meal Allowance', calc: 'per_day', amount: '12.00', taxTreatment: 'exempt', contributory: 'no' }
      ]);

      mockCbaPackService.CbaPackService.getApplicablePremiums.mockResolvedValue([
        { code: 'NIGHT', name: 'Night Premium', value: '25', stackable: true, bands: { start: '22:00', end: '06:00' } },
        { code: 'SUNDAY', name: 'Sunday Premium', value: '75', stackable: false, appliesTo: 'sundays' }
      ]);

      mockCbaPackService.CbaPackService.getSchedulingConstraints.mockResolvedValue([
        { maxHoursDay: 8, maxHoursWeekAvg: 40, restMinHours: 11 }
      ]);

      // Process both companies
      const results: { [company: string]: PayrollCalculationResult[] } = {
        hotel: [],
        restaurant: []
      };

      // Process hotel employees
      for (const context of company1Employees) {
        try {
          const result = await PayrollCalculationEngine.calculatePayroll(context);
          results.hotel.push(result);
          
          // Hotel should have higher base wage
          expect(result.baseWage.monthlyRate).toBe(1200);
          expect(result.premiums.length).toBeGreaterThan(0); // Should have night/sunday premiums
          expect(result.allowances.length).toBeGreaterThan(0); // Should have meal allowance
          
        } catch (error) {
          throw new Error(`Hotel payroll calculation failed: ${error}`);
        }
      }

      // Process restaurant employees  
      for (const context of company2Employees) {
        try {
          const result = await PayrollCalculationEngine.calculatePayroll(context);
          results.restaurant.push(result);
          
          // Restaurant should have different base wage
          expect(result.baseWage.monthlyRate).toBe(900);
          expect(result.premiums.length).toBeGreaterThan(0); // Should have night/sunday premiums
          
        } catch (error) {
          throw new Error(`Restaurant payroll calculation failed: ${error}`);
        }
      }

      // Verify different industries have different calculations
      expect(results.hotel[0].baseWage.monthlyRate).not.toBe(results.restaurant[0].baseWage.monthlyRate);
      expect(results.hotel[0].totals.grossPay).not.toBe(results.restaurant[0].totals.grossPay);

      // Both should have valid calculations
      expect(results.hotel[0].totals.grossPay).toBeGreaterThan(0);
      expect(results.restaurant[0].totals.grossPay).toBeGreaterThan(0);
    });

    test('should handle complex multi-property hotel chain payroll', async () => {
      const hotelChainEmployees: PayrollCalculationContext[] = [
        // Property 1: Luxury hotel
        {
          employeeId: 'luxury-emp-001',
          contractId: 'contract-luxury-001',
          periodId: '2025-02',
          propertyId: 'luxury-hotel-001',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-28'),
          hoursWorked: Array.from({ length: 22 }, (_, i) => ({
            date: new Date(2025, 1, i + 1),
            startTime: '07:00',
            endTime: i % 7 === 6 ? '17:00' : '15:00', // Sunday longer shifts
            hours: i % 7 === 6 ? 10 : 8,
            shiftType: i % 7 === 6 ? 'sunday' as const : 'normal' as const
          }))
        },

        // Property 2: Budget hotel  
        {
          employeeId: 'budget-emp-001',
          contractId: 'contract-budget-001',
          periodId: '2025-02',
          propertyId: 'budget-hotel-001',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-28'),
          hoursWorked: Array.from({ length: 20 }, (_, i) => ({
            date: new Date(2025, 1, i + 1),
            startTime: i % 3 === 0 ? '22:00' : '08:00',
            endTime: i % 3 === 0 ? '06:00' : '16:00',
            hours: 8,
            shiftType: i % 3 === 0 ? 'night' as const : 'normal' as const
          }))
        },

        // Property 3: Seasonal resort
        {
          employeeId: 'resort-emp-001',
          contractId: 'contract-resort-001', 
          periodId: '2025-02',
          propertyId: 'seasonal-resort-001',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-28'),
          hoursWorked: Array.from({ length: 28 }, (_, i) => ({
            date: new Date(2025, 1, i + 1),
            startTime: '06:00',
            endTime: i % 2 === 0 ? '18:00' : '14:00', // Alternating long/short days
            hours: i % 2 === 0 ? 12 : 8, // 4h OT every other day
            breakMinutes: 60
          }))
        }
      ];

      // Mock different wage structures for different properties
      const mockCbaPackService = require('../../server/services/CbaPackService');
      mockCbaPackService.CbaPackService.calculateEffectiveWage.mockImplementation((propertyId: string) => {
        if (propertyId.includes('luxury')) {
          return Promise.resolve({ baseWage: 1800, allowances: [], premiums: [] });
        } else if (propertyId.includes('budget')) {
          return Promise.resolve({ baseWage: 1000, allowances: [], premiums: [] });
        } else if (propertyId.includes('seasonal')) {
          return Promise.resolve({ baseWage: 1300, allowances: [], premiums: [] });
        }
        return Promise.resolve({ baseWage: 1200, allowances: [], premiums: [] });
      });

      const results: PayrollCalculationResult[] = [];
      
      for (const context of hotelChainEmployees) {
        const result = await PayrollCalculationEngine.calculatePayroll(context);
        results.push(result);
      }

      // Verify different properties have appropriate wage levels
      const luxuryResult = results.find(r => r.baseWage.monthlyRate === 1800);
      const budgetResult = results.find(r => r.baseWage.monthlyRate === 1000);
      const seasonalResult = results.find(r => r.baseWage.monthlyRate === 1300);

      expect(luxuryResult).toBeDefined();
      expect(budgetResult).toBeDefined();
      expect(seasonalResult).toBeDefined();

      // Luxury hotel should have highest total pay
      expect(luxuryResult!.totals.grossPay).toBeGreaterThan(budgetResult!.totals.grossPay);
      
      // Seasonal resort should have significant overtime
      expect(seasonalResult!.totals.premiumPay).toBeGreaterThan(luxuryResult!.totals.premiumPay);

      // All should have valid constraint checking
      results.forEach(result => {
        expect(result.constraints).toBeDefined();
        expect(Array.isArray(result.constraints.violations)).toBe(true);
      });
    });
  });

  describe('Concurrent Processing Edge Cases', () => {
    test('should handle simultaneous payroll calculations', async () => {
      const simultaneousContexts: PayrollCalculationContext[] = Array.from({ length: 20 }, (_, i) => ({
        employeeId: `concurrent-emp-${i.toString().padStart(3, '0')}`,
        contractId: `contract-${i}`,
        periodId: '2025-02',
        propertyId: 'test-property',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        hoursWorked: Array.from({ length: 22 }, (_, j) => ({
          date: new Date(2025, 1, j + 1),
          startTime: '09:00',
          endTime: j % 3 === 0 ? '19:00' : '17:00', // Some overtime
          hours: j % 3 === 0 ? 10 : 8,
          shiftType: j % 7 === 0 ? 'sunday' as const : 'normal' as const
        }))
      }));

      // Mock consistent responses
      const mockCbaPackService = require('../../server/services/CbaPackService');
      mockCbaPackService.CbaPackService.calculateEffectiveWage.mockResolvedValue({ baseWage: 1400 });
      mockCbaPackService.CbaPackService.getApplicableAllowances.mockResolvedValue([]);
      mockCbaPackService.CbaPackService.getApplicablePremiums.mockResolvedValue([
        { code: 'SUNDAY', name: 'Sunday Premium', value: '75', stackable: false, appliesTo: 'sundays' }
      ]);
      mockCbaPackService.CbaPackService.getSchedulingConstraints.mockResolvedValue([
        { maxHoursDay: 8, maxHoursWeekAvg: 40, restMinHours: 11 }
      ]);

      const startTime = Date.now();

      // Process all simultaneously
      const promises = simultaneousContexts.map(context => 
        PayrollCalculationEngine.calculatePayroll(context)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should complete successfully
      expect(results).toHaveLength(20);
      results.forEach((result, index) => {
        expect(result.baseWage.monthlyRate).toBe(1400);
        expect(result.totals.grossPay).toBeGreaterThan(0);
        expect(Number.isFinite(result.totals.grossPay)).toBe(true);
      });

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max

      // Results should be consistent across concurrent executions
      const firstGrossPay = results[0].totals.grossPay;
      results.forEach(result => {
        expect(result.totals.grossPay).toBeCloseTo(firstGrossPay, 1);
      });
    });

    test('should maintain data integrity under race conditions', async () => {
      // Simulate race condition scenarios
      const raceConditionContexts: PayrollCalculationContext[] = [
        // Employee with changing contract mid-calculation
        {
          employeeId: 'race-emp-001',
          contractId: 'race-contract-001',
          periodId: '2025-02',
          propertyId: 'race-property',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-02-15'), // Mid-month termination
          hoursWorked: [
            { date: new Date('2025-02-01'), startTime: '09:00', endTime: '17:00', hours: 8 },
            { date: new Date('2025-02-02'), startTime: '09:00', endTime: '19:00', hours: 10 }, // 2h OT
            { date: new Date('2025-02-03'), startTime: '21:00', endTime: '05:00', hours: 8, shiftType: 'night' }
          ]
        }
      ];

      // Mock service to simulate changing data
      const mockCbaPackService = require('../../server/services/CbaPackService');
      let callCount = 0;
      mockCbaPackService.CbaPackService.calculateEffectiveWage.mockImplementation(() => {
        callCount++;
        // Simulate data change during processing
        return Promise.resolve({ baseWage: callCount === 1 ? 1200 : 1300 });
      });

      mockCbaPackService.CbaPackService.getApplicableAllowances.mockResolvedValue([]);
      mockCbaPackService.CbaPackService.getApplicablePremiums.mockResolvedValue([
        { code: 'NIGHT', name: 'Night Premium', value: '25', stackable: true, bands: { start: '21:00', end: '05:00' } }
      ]);
      mockCbaPackService.CbaPackService.getSchedulingConstraints.mockResolvedValue([
        { maxHoursDay: 8, maxHoursWeekAvg: 40, restMinHours: 11 }
      ]);

      // Run multiple calculations in parallel
      const promises = Array.from({ length: 5 }, () => 
        PayrollCalculationEngine.calculatePayroll(raceConditionContexts[0])
      );

      const results = await Promise.all(promises);

      // All calculations should complete
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.baseWage.monthlyRate).toBeGreaterThan(0);
        expect(result.totals.grossPay).toBeGreaterThan(0);
        expect(Number.isFinite(result.totals.grossPay)).toBe(true);
      });

      // May have different base wages due to race condition simulation
      const baseWages = results.map(r => r.baseWage.monthlyRate);
      const uniqueBaseWages = [...new Set(baseWages)];
      expect(uniqueBaseWages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('System Performance Under Load', () => {
    test('should handle large scale payroll processing', async () => {
      // Generate large dataset
      const largeScaleContexts: PayrollCalculationContext[] = Array.from({ length: 500 }, (_, i) => ({
        employeeId: `scale-emp-${i.toString().padStart(4, '0')}`,
        contractId: `contract-${i}`,
        periodId: '2025-02',
        propertyId: `property-${Math.floor(i / 50)}`, // 10 properties
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        hoursWorked: Array.from({ length: Math.floor(Math.random() * 25) + 15 }, (_, j) => ({
          date: new Date(2025, 1, j + 1),
          startTime: ['06:00', '14:00', '22:00'][j % 3],
          endTime: ['14:00', '22:00', '06:00'][j % 3],
          hours: 8 + (Math.random() > 0.7 ? Math.floor(Math.random() * 4) : 0), // Random overtime
          shiftType: j % 7 === 0 ? 'sunday' as const : 
                    j % 3 === 2 ? 'night' as const : 'normal' as const
        }))
      }));

      // Mock consistent but varied responses
      const mockCbaPackService = require('../../server/services/CbaPackService');
      mockCbaPackService.CbaPackService.calculateEffectiveWage.mockImplementation((propertyId: string) => {
        const propertyNum = parseInt(propertyId.split('-')[1] || '0');
        const baseWage = 1000 + (propertyNum * 100); // Different wages per property
        return Promise.resolve({ baseWage });
      });

      mockCbaPackService.CbaPackService.getApplicableAllowances.mockResolvedValue([
        { code: 'TRANSPORT', name: 'Transport', calc: 'fixed_monthly', amount: '75', taxTreatment: 'taxable', contributory: 'yes' }
      ]);

      mockCbaPackService.CbaPackService.getApplicablePremiums.mockResolvedValue([
        { code: 'NIGHT', name: 'Night Premium', value: '25', stackable: true, bands: { start: '22:00', end: '06:00' } },
        { code: 'SUNDAY', name: 'Sunday Premium', value: '75', stackable: false, appliesTo: 'sundays' }
      ]);

      mockCbaPackService.CbaPackService.getSchedulingConstraints.mockResolvedValue([
        { maxHoursDay: 8, maxHoursWeekAvg: 40, restMinHours: 11 }
      ]);

      const startTime = Date.now();
      const batchSize = 50;
      const results: PayrollCalculationResult[] = [];
      const errors: string[] = [];

      // Process in batches to avoid overwhelming system
      for (let i = 0; i < largeScaleContexts.length; i += batchSize) {
        const batch = largeScaleContexts.slice(i, i + batchSize);
        
        try {
          const batchPromises = batch.map(context => 
            PayrollCalculationEngine.calculatePayroll(context)
          );
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
          
        } catch (error) {
          errors.push(`Batch ${Math.floor(i/batchSize)} failed: ${error}`);
        }
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Performance validations
      expect(errors).toHaveLength(0);
      expect(results).toHaveLength(500);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Data quality validations
      const invalidResults = results.filter(r => 
        !Number.isFinite(r.totals.grossPay) || 
        r.totals.grossPay < 0 ||
        !Number.isFinite(r.baseWage.monthlyRate)
      );
      expect(invalidResults).toHaveLength(0);

      // Aggregate validations
      const totalGrossPay = results.reduce((sum, r) => sum + r.totals.grossPay, 0);
      const avgGrossPay = totalGrossPay / results.length;
      expect(totalGrossPay).toBeGreaterThan(500000); // Reasonable aggregate
      expect(avgGrossPay).toBeGreaterThan(800); // Reasonable average
      expect(avgGrossPay).toBeLessThan(3000); // Not unreasonably high

      console.log(`Processed ${results.length} employees in ${processingTime}ms (${(processingTime/results.length).toFixed(2)}ms per employee)`);
    });

    test('should maintain memory efficiency during processing', async () => {
      const memoryTestContexts: PayrollCalculationContext[] = Array.from({ length: 100 }, (_, i) => ({
        employeeId: `memory-test-${i}`,
        contractId: `contract-${i}`,
        periodId: '2025-02',
        propertyId: 'memory-test-property',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        hoursWorked: Array.from({ length: 28 }, (_, j) => ({
          date: new Date(2025, 1, j + 1),
          startTime: '08:00',
          endTime: j % 5 === 0 ? '20:00' : '16:00', // Some long days
          hours: j % 5 === 0 ? 12 : 8,
          shiftType: j % 7 === 0 ? 'sunday' as const : 'normal' as const
        }))
      }));

      // Mock services
      const mockCbaPackService = require('../../server/services/CbaPackService');
      mockCbaPackService.CbaPackService.calculateEffectiveWage.mockResolvedValue({ baseWage: 1200 });
      mockCbaPackService.CbaPackService.getApplicableAllowances.mockResolvedValue([]);
      mockCbaPackService.CbaPackService.getApplicablePremiums.mockResolvedValue([]);
      mockCbaPackService.CbaPackService.getSchedulingConstraints.mockResolvedValue([
        { maxHoursDay: 8, maxHoursWeekAvg: 40, restMinHours: 11 }
      ]);

      // Monitor memory usage (basic check)
      const initialMemory = process.memoryUsage();
      
      // Process sequentially to test memory cleanup
      for (const context of memoryTestContexts) {
        const result = await PayrollCalculationEngine.calculatePayroll(context);
        expect(result.baseWage.monthlyRate).toBe(1200);
        
        // Force garbage collection if available (for testing)
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      
      // Memory usage should not grow excessively
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });
  });

  describe('Cross-System Integration Validation', () => {
    test('should integrate with termination processing', async () => {
      const terminatingEmployee: PayrollCalculationContext = {
        employeeId: 'terminating-emp-001',
        contractId: 'terminating-contract',
        periodId: '2025-02',
        propertyId: 'termination-property',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-15'), // Mid-month termination
        hoursWorked: [
          { date: new Date('2025-02-01'), startTime: '09:00', endTime: '17:00', hours: 8 },
          { date: new Date('2025-02-02'), startTime: '09:00', endTime: '17:00', hours: 8 },
          { date: new Date('2025-02-03'), startTime: '09:00', endTime: '19:00', hours: 10 }, // 2h OT
        ]
      };

      // Mock services for termination scenario
      const mockCbaPackService = require('../../server/services/CbaPackService');
      mockCbaPackService.CbaPackService.calculateEffectiveWage.mockResolvedValue({ baseWage: 1500 });
      mockCbaPackService.CbaPackService.getApplicableAllowances.mockResolvedValue([]);
      mockCbaPackService.CbaPackService.getApplicablePremiums.mockResolvedValue([]);
      mockCbaPackService.CbaPackService.getSchedulingConstraints.mockResolvedValue([]);

      // Calculate final payroll
      const payrollResult = await PayrollCalculationEngine.calculatePayroll(terminatingEmployee);

      // Verify payroll calculation
      expect(payrollResult.baseWage.monthlyRate).toBe(1500);
      expect(payrollResult.baseWage.prorationFactor).toBeLessThan(1); // Partial month
      expect(payrollResult.totals.grossPay).toBeGreaterThan(0);
      expect(payrollResult.totals.grossPay).toBeLessThan(1500); // Partial pay

      // Mock severance rules
      const mockSeveranceRules = {
        id: 'test-rules',
        version: 'greek-v2025.1',
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null,
        isActive: true,
        bands: [
          { minMonths: 0, maxMonths: 12, severanceMonths: 0 },
          { minMonths: 12, maxMonths: 24, severanceMonths: 2 },
          { minMonths: 24, maxMonths: 60, severanceMonths: 3 }
        ],
        legalReference: 'Ν. 4093/2012',
        description: 'Test rules',
        descriptionGr: 'Κανόνες δοκιμής',
        createdAt: new Date(),
        createdBy: 'test',
        approvedAt: null,
        approvedBy: null
      };

      // Calculate severance (assuming 2 years employment)
      const monthsOfService = 24;
      const severanceResult = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        payrollResult.baseWage.monthlyRate,
        mockSeveranceRules
      );

      // Verify severance calculation
      expect(severanceResult.severanceAmount).toBe(4500); // 3 months * 1500
      expect(severanceResult.severanceMonths).toBe(3);

      // Total final payment
      const totalFinalPayment = payrollResult.totals.grossPay + severanceResult.severanceAmount;
      expect(totalFinalPayment).toBeGreaterThan(4500);
    });

    test('should validate end-to-end calculation consistency', async () => {
      // Create comprehensive test scenario
      const comprehensiveContext: PayrollCalculationContext = {
        employeeId: 'comprehensive-test',
        contractId: 'comprehensive-contract',
        periodId: '2025-02',
        propertyId: 'comprehensive-property',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        hoursWorked: [
          // Regular work days
          ...Array.from({ length: 15 }, (_, i) => ({
            date: new Date(2025, 1, i * 2 + 1),
            startTime: '09:00',
            endTime: '17:00',
            hours: 8,
            shiftType: 'normal' as const
          })),
          // Night shifts
          ...Array.from({ length: 5 }, (_, i) => ({
            date: new Date(2025, 1, i * 4 + 2),
            startTime: '22:00',
            endTime: '06:00',
            hours: 8,
            shiftType: 'night' as const
          })),
          // Sunday shifts with overtime
          { date: new Date(2025, 1, 7), startTime: '10:00', endTime: '20:00', hours: 10, shiftType: 'sunday' as const },
          { date: new Date(2025, 1, 14), startTime: '10:00', endTime: '22:00', hours: 12, shiftType: 'sunday' as const },
        ]
      };

      // Mock comprehensive service responses
      const mockCbaPackService = require('../../server/services/CbaPackService');
      mockCbaPackService.CbaPackService.calculateEffectiveWage.mockResolvedValue({ baseWage: 1600 });
      mockCbaPackService.CbaPackService.getApplicableAllowances.mockResolvedValue([
        { code: 'MEAL', name: 'Meal Allowance', calc: 'per_day', amount: '15', taxTreatment: 'exempt', contributory: 'no' },
        { code: 'TRANSPORT', name: 'Transport', calc: 'fixed_monthly', amount: '85', taxTreatment: 'taxable', contributory: 'yes' }
      ]);
      mockCbaPackService.CbaPackService.getApplicablePremiums.mockResolvedValue([
        { code: 'NIGHT', name: 'Night Premium', value: '25', stackable: true, bands: { start: '22:00', end: '06:00' } },
        { code: 'SUNDAY', name: 'Sunday Premium', value: '75', stackable: false, appliesTo: 'sundays' }
      ]);
      mockCbaPackService.CbaPackService.getSchedulingConstraints.mockResolvedValue([
        { maxHoursDay: 8, maxHoursWeekAvg: 40, restMinHours: 11 }
      ]);

      // Calculate payroll
      const result = await PayrollCalculationEngine.calculatePayroll(comprehensiveContext);

      // Comprehensive validations
      expect(result.baseWage.monthlyRate).toBe(1600);
      expect(result.baseWage.totalBasePay).toBeCloseTo(1600, 0); // Full month

      // Should have allowances
      expect(result.allowances.length).toBe(2);
      const mealAllowance = result.allowances.find(a => a.code === 'MEAL');
      const transportAllowance = result.allowances.find(a => a.code === 'TRANSPORT');
      expect(mealAllowance).toBeDefined();
      expect(transportAllowance).toBeDefined();
      expect(mealAllowance!.amount).toBeGreaterThan(0);
      expect(transportAllowance!.amount).toBe(85);

      // Should have premiums
      expect(result.premiums.length).toBeGreaterThan(0);
      const nightPremiums = result.premiums.filter(p => p.code === 'NIGHT');
      const sundayPremiums = result.premiums.filter(p => p.code === 'SUNDAY');
      expect(nightPremiums.length).toBeGreaterThan(0);
      expect(sundayPremiums.length).toBeGreaterThan(0);

      // Should detect constraint violations (overtime and Sunday work)
      expect(result.constraints.violations.length).toBeGreaterThan(0);
      expect(result.constraints.compliance).toBe(false);

      // Totals should be consistent
      const expectedGrossPay = 
        result.baseWage.totalBasePay + 
        result.allowances.reduce((sum, a) => sum + a.amount, 0) + 
        result.premiums.reduce((sum, p) => sum + p.amount, 0);
      
      expect(result.totals.grossPay).toBeCloseTo(expectedGrossPay, 1);
      expect(result.totals.allowancePay).toBeCloseTo(result.allowances.reduce((sum, a) => sum + a.amount, 0), 1);
      expect(result.totals.premiumPay).toBeCloseTo(result.premiums.reduce((sum, p) => sum + p.amount, 0), 1);

      // All monetary values should be properly rounded
      expect(Number.isInteger(result.totals.grossPay * 100)).toBe(true);
      expect(Number.isInteger(result.totals.allowancePay * 100)).toBe(true);
      expect(Number.isInteger(result.totals.premiumPay * 100)).toBe(true);
    });
  });
});