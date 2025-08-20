/**
 * Timezone Test Service - Comprehensive test cases for DST transitions and EET/EEST edge scenarios
 */

import { DSTTransitionService, ShiftCalculationResult } from './DSTTransitionService';

export interface TimezoneTestCase {
  id: string;
  name: string;
  description: string;
  scenario: string;
  inputs: {
    shiftStart: Date;
    shiftEnd: Date;
    timezone?: string;
  };
  expectedResults: {
    actualWorkedMinutes: number;
    payableMinutes: number;
    dstAdjustment: number;
    warnings: string[];
    nightShiftMinutes?: number;
  };
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
  payrollImpact: string;
}

export interface TestExecutionResult {
  testCase: TimezoneTestCase;
  actualResults: ShiftCalculationResult;
  passed: boolean;
  deviations: Array<{
    field: string;
    expected: any;
    actual: any;
    deviation: number | string;
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class TimezoneTestService {
  private dstService = new DSTTransitionService();

  /**
   * Get all DST edge case test scenarios
   */
  getDSTEdgeCaseTests(): TimezoneTestCase[] {
    return [
      // Spring Forward Edge Cases
      {
        id: 'DST_SPRING_001',
        name: 'Night Shift During Spring Forward',
        description: 'Night shift worker starting at 22:00 and ending at 06:00 on DST spring forward day',
        scenario: 'Employee works regular night shift (22:00-06:00) on March 26, 2025 when clocks spring forward at 03:00',
        inputs: {
          shiftStart: new Date('2025-03-26T22:00:00'),
          shiftEnd: new Date('2025-03-27T06:00:00'),
          timezone: 'Europe/Athens'
        },
        expectedResults: {
          actualWorkedMinutes: 420, // 7 hours instead of 8 (lost 1 hour)
          payableMinutes: 480, // Paid for full 8 hours per Greek labor law
          dstAdjustment: -60, // 1 hour lost
          warnings: ['DST Spring Forward on 2025-03-26: 03:00-04:00 hour skipped'],
          nightShiftMinutes: 420
        },
        criticalityLevel: 'critical',
        payrollImpact: 'Worker gets paid for 8 hours but only works 7 hours'
      },

      {
        id: 'DST_SPRING_002',
        name: 'Early Morning Shift During Spring Forward',
        description: 'Early morning shift starting at 02:00 and ending at 10:00 on DST spring forward day',
        scenario: 'Employee works early morning shift (02:00-10:00) on March 26, 2025',
        inputs: {
          shiftStart: new Date('2025-03-26T02:00:00'),
          shiftEnd: new Date('2025-03-26T10:00:00'),
          timezone: 'Europe/Athens'
        },
        expectedResults: {
          actualWorkedMinutes: 420, // 7 hours (02:00-03:00, then 04:00-10:00)
          payableMinutes: 480, // Paid for scheduled 8 hours
          dstAdjustment: -60,
          warnings: ['DST Spring Forward on 2025-03-26: 03:00-04:00 hour skipped'],
          nightShiftMinutes: 60 // Only 02:00-03:00 qualifies as night work
        },
        criticalityLevel: 'critical',
        payrollImpact: 'Worker gets paid for full scheduled shift despite DST hour loss'
      },

      {
        id: 'DST_SPRING_003',
        name: 'Shift Starting in Skipped Hour',
        description: 'Shift scheduled to start at 03:30 (which doesn\'t exist) on DST spring forward day',
        scenario: 'Employee scheduled to start at 03:30 on March 26, 2025 (non-existent time)',
        inputs: {
          shiftStart: new Date('2025-03-26T03:30:00'),
          shiftEnd: new Date('2025-03-26T11:30:00'),
          timezone: 'Europe/Athens'
        },
        expectedResults: {
          actualWorkedMinutes: 450, // 7.5 hours (04:00-11:30)
          payableMinutes: 480, // 8 hours scheduled
          dstAdjustment: -30, // Lost 30 minutes of intended start
          warnings: ['DST Spring Forward on 2025-03-26: 03:00-04:00 hour skipped'],
          nightShiftMinutes: 0
        },
        criticalityLevel: 'high',
        payrollImpact: 'Automatic adjustment to valid start time at 04:00'
      },

      // Fall Back Edge Cases
      {
        id: 'DST_FALL_001',
        name: 'Night Shift During Fall Back',
        description: 'Night shift worker during fall back when 03:00-04:00 occurs twice',
        scenario: 'Employee works night shift (22:00-06:00) on October 27, 2024 when clocks fall back at 04:00',
        inputs: {
          shiftStart: new Date('2024-10-26T22:00:00'),
          shiftEnd: new Date('2024-10-27T06:00:00'),
          timezone: 'Europe/Athens'
        },
        expectedResults: {
          actualWorkedMinutes: 540, // 9 hours (extra hour gained)
          payableMinutes: 540, // Paid for actual hours worked
          dstAdjustment: 60, // 1 hour gained
          warnings: ['DST Fall Back on 2024-10-27: 03:00-04:00 hour occurs twice'],
          nightShiftMinutes: 540
        },
        criticalityLevel: 'critical',
        payrollImpact: 'Worker works and gets paid for extra hour during fall back'
      },

      {
        id: 'DST_FALL_002',
        name: 'Split Shift Across Fall Back',
        description: 'Split shift with break during the duplicated hour period',
        scenario: 'Employee works 22:00-02:00, breaks, then 05:00-09:00 on fall back day',
        inputs: {
          shiftStart: new Date('2024-10-26T22:00:00'),
          shiftEnd: new Date('2024-10-27T02:00:00'),
          timezone: 'Europe/Athens'
        },
        expectedResults: {
          actualWorkedMinutes: 240, // 4 hours (no DST impact in this period)
          payableMinutes: 240,
          dstAdjustment: 0,
          warnings: [],
          nightShiftMinutes: 240
        },
        criticalityLevel: 'medium',
        payrollImpact: 'No impact as shift ends before duplicated hour'
      },

      // International Timezone Edge Cases
      {
        id: 'INTL_TZ_001',
        name: 'Remote Worker in Different Timezone',
        description: 'Greek company employee working remotely from London',
        scenario: 'Employee in London (GMT/BST) working for Greek company, shift 09:00-17:00 London time',
        inputs: {
          shiftStart: new Date('2025-06-15T09:00:00'), // London time
          shiftEnd: new Date('2025-06-15T17:00:00'),
          timezone: 'Europe/London'
        },
        expectedResults: {
          actualWorkedMinutes: 480, // 8 hours
          payableMinutes: 480,
          dstAdjustment: 0,
          warnings: [],
          nightShiftMinutes: 0
        },
        criticalityLevel: 'medium',
        payrollImpact: 'Need to convert to Athens time for Greek payroll compliance'
      },

      // Multi-Day Shift Edge Cases
      {
        id: 'MULTI_DAY_001',
        name: 'Multi-Day Shift Spanning DST Transition',
        description: '24-hour shift spanning both DST spring forward transition',
        scenario: 'Security guard works 24-hour shift from March 25 18:00 to March 26 18:00',
        inputs: {
          shiftStart: new Date('2025-03-25T18:00:00'),
          shiftEnd: new Date('2025-03-26T18:00:00'),
          timezone: 'Europe/Athens'
        },
        expectedResults: {
          actualWorkedMinutes: 1380, // 23 hours (lost 1 hour to DST)
          payableMinutes: 1440, // Paid for scheduled 24 hours
          dstAdjustment: -60,
          warnings: ['DST Spring Forward on 2025-03-26: 03:00-04:00 hour skipped'],
          nightShiftMinutes: 480 // 8 hours of night work (22:00-06:00)
        },
        criticalityLevel: 'critical',
        payrollImpact: 'Complex calculation involving DST transition and night premiums'
      },

      // Extreme Edge Cases
      {
        id: 'EDGE_001',
        name: 'Shift Ending Exactly at DST Transition',
        description: 'Shift ending exactly when clocks spring forward',
        scenario: 'Night shift ending precisely at 03:00 on DST spring forward day',
        inputs: {
          shiftStart: new Date('2025-03-25T23:00:00'),
          shiftEnd: new Date('2025-03-26T03:00:00'),
          timezone: 'Europe/Athens'
        },
        expectedResults: {
          actualWorkedMinutes: 240, // 4 hours (23:00-03:00, no DST impact)
          payableMinutes: 240,
          dstAdjustment: 0,
          warnings: [],
          nightShiftMinutes: 240
        },
        criticalityLevel: 'high',
        payrollImpact: 'Edge case: shift ends precisely at DST transition point'
      },

      {
        id: 'EDGE_002',
        name: 'Shift Starting Exactly at DST Transition',
        description: 'Shift starting exactly when clocks fall back',
        scenario: 'Early morning shift starting precisely at 04:00 on DST fall back day',
        inputs: {
          shiftStart: new Date('2024-10-27T04:00:00'),
          shiftEnd: new Date('2024-10-27T12:00:00'),
          timezone: 'Europe/Athens'
        },
        expectedResults: {
          actualWorkedMinutes: 480, // 8 hours (starts after transition)
          payableMinutes: 480,
          dstAdjustment: 0,
          warnings: [],
          nightShiftMinutes: 120 // 04:00-06:00 qualifies as night work
        },
        criticalityLevel: 'high',
        payrollImpact: 'Shift starts after fall back transition completes'
      }
    ];
  }

  /**
   * Execute all DST test cases and return comprehensive results
   */
  async executeAllDSTTests(): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    criticalFailures: number;
    results: TestExecutionResult[];
    summary: {
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
      actionRequired: boolean;
    };
  }> {
    const testCases = this.getDSTEdgeCaseTests();
    const results: TestExecutionResult[] = [];

    for (const testCase of testCases) {
      const result = await this.executeTestCase(testCase);
      results.push(result);
    }

    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    const criticalFailures = results.filter(r => !r.passed && r.riskLevel === 'critical').length;

    // Determine overall risk level
    let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalFailures > 0) {
      overallRiskLevel = 'critical';
    } else if (failedTests > passedTests / 2) {
      overallRiskLevel = 'high';
    } else if (failedTests > 0) {
      overallRiskLevel = 'medium';
    }

    const summary = {
      riskLevel: overallRiskLevel,
      recommendation: this.generateRecommendation(overallRiskLevel, criticalFailures),
      actionRequired: overallRiskLevel === 'critical' || overallRiskLevel === 'high'
    };

    return {
      totalTests: testCases.length,
      passedTests,
      failedTests,
      criticalFailures,
      results,
      summary
    };
  }

  /**
   * Execute a single test case
   */
  private async executeTestCase(testCase: TimezoneTestCase): Promise<TestExecutionResult> {
    try {
      const actualResults = this.dstService.calculateDSTAwareWorkingTime(
        testCase.inputs.shiftStart,
        testCase.inputs.shiftEnd,
        testCase.inputs.timezone
      );

      const deviations = this.compareResults(testCase.expectedResults, actualResults);
      const passed = deviations.length === 0;
      const riskLevel = this.assessRiskLevel(testCase, deviations);

      return {
        testCase,
        actualResults,
        passed,
        deviations,
        riskLevel
      };

    } catch (error) {
      return {
        testCase,
        actualResults: {
          actualWorkedMinutes: 0,
          standardWorkedMinutes: 0,
          payableMinutes: 0,
          dstAdjustment: 0,
          transitions: [],
          periods: [],
          warnings: [`Test execution failed: ${error.message}`],
          nightShiftPremiums: []
        },
        passed: false,
        deviations: [{ field: 'execution', expected: 'success', actual: 'error', deviation: error.message }],
        riskLevel: 'critical'
      };
    }
  }

  /**
   * Compare expected vs actual results
   */
  private compareResults(expected: any, actual: ShiftCalculationResult): Array<{
    field: string;
    expected: any;
    actual: any;
    deviation: number | string;
  }> {
    const deviations = [];

    // Check numeric fields
    const numericFields = ['actualWorkedMinutes', 'payableMinutes', 'dstAdjustment'];
    for (const field of numericFields) {
      if (expected[field] !== undefined && expected[field] !== actual[field]) {
        deviations.push({
          field,
          expected: expected[field],
          actual: actual[field],
          deviation: Math.abs(expected[field] - actual[field])
        });
      }
    }

    // Check warnings
    if (expected.warnings) {
      const expectedWarnings = expected.warnings.sort();
      const actualWarnings = actual.warnings.sort();
      
      if (JSON.stringify(expectedWarnings) !== JSON.stringify(actualWarnings)) {
        deviations.push({
          field: 'warnings',
          expected: expectedWarnings,
          actual: actualWarnings,
          deviation: 'Warning messages do not match'
        });
      }
    }

    // Check night shift minutes
    if (expected.nightShiftMinutes !== undefined) {
      const actualNightShiftMinutes = actual.nightShiftPremiums.reduce((sum, premium) => sum + premium.minutes, 0);
      if (expected.nightShiftMinutes !== actualNightShiftMinutes) {
        deviations.push({
          field: 'nightShiftMinutes',
          expected: expected.nightShiftMinutes,
          actual: actualNightShiftMinutes,
          deviation: Math.abs(expected.nightShiftMinutes - actualNightShiftMinutes)
        });
      }
    }

    return deviations;
  }

  /**
   * Assess risk level based on test results
   */
  private assessRiskLevel(
    testCase: TimezoneTestCase,
    deviations: Array<{ field: string; expected: any; actual: any; deviation: number | string }>
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (deviations.length === 0) return 'low';

    // Critical if payroll calculation is wrong
    const payrollDeviations = deviations.filter(d => 
      d.field === 'payableMinutes' || d.field === 'actualWorkedMinutes'
    );

    if (payrollDeviations.length > 0) {
      const maxDeviation = Math.max(...payrollDeviations.map(d => Number(d.deviation) || 0));
      if (maxDeviation >= 60) return 'critical'; // 1+ hour difference
      if (maxDeviation >= 30) return 'high';     // 30+ minute difference
      if (maxDeviation >= 15) return 'medium';   // 15+ minute difference
    }

    return testCase.criticalityLevel as 'low' | 'medium' | 'high' | 'critical';
  }

  /**
   * Generate recommendation based on test results
   */
  private generateRecommendation(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    criticalFailures: number
  ): string {
    switch (riskLevel) {
      case 'critical':
        return `CRITICAL: ${criticalFailures} critical DST test failures detected. Immediate action required to prevent payroll calculation errors. Do not deploy to production.`;
      
      case 'high':
        return 'HIGH RISK: Significant DST handling issues detected. Review and fix before production deployment.';
      
      case 'medium':
        return 'MEDIUM RISK: Minor DST calculation deviations found. Consider fixing before next DST transition.';
      
      default:
        return 'LOW RISK: All DST edge cases handled correctly. System ready for DST transitions.';
    }
  }

  /**
   * Generate detailed test report
   */
  generateTestReport(results: TestExecutionResult[]): string {
    const report = `
DST TRANSITION TEST REPORT
==========================
Generated: ${new Date().toISOString()}

SUMMARY
-------
Total Tests: ${results.length}
Passed: ${results.filter(r => r.passed).length}
Failed: ${results.filter(r => !r.passed).length}
Critical Failures: ${results.filter(r => !r.passed && r.riskLevel === 'critical').length}

DETAILED RESULTS
----------------
${results.map(result => `
Test: ${result.testCase.id} - ${result.testCase.name}
Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}
Risk Level: ${result.riskLevel.toUpperCase()}
Scenario: ${result.testCase.scenario}
Payroll Impact: ${result.testCase.payrollImpact}

Expected Results:
- Worked Minutes: ${result.testCase.expectedResults.actualWorkedMinutes}
- Payable Minutes: ${result.testCase.expectedResults.payableMinutes}
- DST Adjustment: ${result.testCase.expectedResults.dstAdjustment}

Actual Results:
- Worked Minutes: ${result.actualResults.actualWorkedMinutes}
- Payable Minutes: ${result.actualResults.payableMinutes}
- DST Adjustment: ${result.actualResults.dstAdjustment}

${result.deviations.length > 0 ? `Deviations:
${result.deviations.map(d => `- ${d.field}: Expected ${d.expected}, Got ${d.actual} (Deviation: ${d.deviation})`).join('\n')}` : 'No deviations found.'}

${'='.repeat(80)}
`).join('')}

RECOMMENDATIONS
---------------
${results.filter(r => !r.passed).length === 0 
  ? '✅ All DST edge cases handled correctly. System ready for production.'
  : `❌ ${results.filter(r => !r.passed).length} test failures require attention before production deployment.`
}
`;

    return report.trim();
  }
}

export const timezoneTestService = new TimezoneTestService();