/**
 * BDD-style Acceptance Tests for IBAN Validation
 * 
 * Implements test scenarios from specification:
 * - Valid IBAN, close name → save succeeds
 * - Invalid IBAN length/checksum → save blocked
 * - Low similarity → warning + override flow
 * - QoQ reject drop metrics tracking
 */

import { validateIbanEnhanced, type EnhancedIbanValidationResult } from './ibanValidationEnhanced';
import { matchGreekNames } from './greekNameNormalization';

export interface BddTestScenario {
  scenario: string;
  given: string;
  when: string;
  then: string;
  testData: {
    iban?: string;
    employeeName?: string;
    accountHolderName?: string;
    expectedDecision?: 'pass' | 'warn' | 'fail';
    expectedScore?: number;
    maxValidationTime?: number;
  };
}

/**
 * BDD Test Scenarios as per specification
 */
export const BDD_TEST_SCENARIOS: BddTestScenario[] = [
  {
    scenario: 'Valid IBAN with close name match',
    given: 'IBAN Mod-97=1 and name similarity=0.92',
    when: 'saving employee banking details',
    then: 'save succeeds, validated=true, no warning',
    testData: {
      iban: 'GR1601400000000012345678901', // Valid Alpha Bank IBAN
      employeeName: 'ΜΑΡΙΑ ΠΑΠΑΔΟΠΟΥΛΟΥ',
      accountHolderName: 'MARIA PAPADOPOULOU',
      expectedDecision: 'pass',
      expectedScore: 0.92,
      maxValidationTime: 150
    }
  },
  {
    scenario: 'Invalid IBAN length',
    given: 'Greek IBAN with incorrect length (26 characters instead of 27)',
    when: 'attempting to save',
    then: 'save is blocked with "Invalid IBAN"',
    testData: {
      iban: 'GR160140000000001234567890', // 26 chars - invalid
      employeeName: 'ΓΙΑΝΝΗΣ ΚΩΝΣΤΑΝΤΙΝΟΥ',
      accountHolderName: 'IOANNIS KONSTANTINOU',
      expectedDecision: 'fail'
    }
  },
  {
    scenario: 'Invalid IBAN checksum',
    given: 'Greek IBAN with wrong checksum digits',
    when: 'attempting validation',
    then: 'save is blocked with checksum error',
    testData: {
      iban: 'GR9901400000000012345678901', // Invalid checksum (99 instead of correct)
      employeeName: 'ΕΛΕΝΗ ΔΗΜΗΤΡΙΟΥ',
      accountHolderName: 'ELENI DIMITRIOU',
      expectedDecision: 'fail'
    }
  },
  {
    scenario: 'Low name similarity with override',
    given: 'Valid IBAN but name similarity=0.62 (below threshold)',
    when: 'saving with override reason',
    then: 'warning appears, override accepted, save succeeds with audit log',
    testData: {
      iban: 'GR3601710020006789012345678', // Valid Piraeus Bank IBAN
      employeeName: 'ΑΝΝΑ ΓΕΩΡΓΙΟΥ',
      accountHolderName: 'ANNA SMITH', // Different surname - low similarity
      expectedDecision: 'warn',
      expectedScore: 0.62
    }
  },
  {
    scenario: 'Double surname edge case',
    given: 'Employee with double surname and account with single surname',
    when: 'validating names',
    then: 'edge case detected, override allowed',
    testData: {
      iban: 'GR4401100000000001234567890',
      employeeName: 'ΜΑΡΙΑ ΚΩΝΣΤΑΝΤΙΝΟΥ ΠΑΠΑΔΟΠΟΥΛΟΥ', // Double surname
      accountHolderName: 'MARIA KONSTANTINOU',
      expectedDecision: 'warn' // Should allow override
    }
  },
  {
    scenario: 'Maiden vs spouse name',
    given: 'Account in maiden name, employee record in married name',
    when: 'validating with override reason "Different marital name"',
    then: 'warning logged, save succeeds with warn_override audit',
    testData: {
      iban: 'GR1601400000000012345678901',
      employeeName: 'ΕΛΕΝΗ ΠΑΠΑΔΟΠΟΥΛΟΥ', // Married name
      accountHolderName: 'ELENI NIKOLAOU', // Maiden name
      expectedDecision: 'warn'
    }
  },
  {
    scenario: 'Greek-Latin transliteration',
    given: 'Employee name in Greek script, account holder in Latin script',
    when: 'validating transliterated names',
    then: 'transliteration detected, high similarity score achieved',
    testData: {
      iban: 'GR3601710020006789012345678',
      employeeName: 'ΔΗΜΗΤΡΙΟΣ ΑΘΑΝΑΣΙΟΥ',
      accountHolderName: 'DIMITRIOS ATHANASIOU',
      expectedDecision: 'pass',
      expectedScore: 0.95 // Should be high due to transliteration
    }
  },
  {
    scenario: 'Initials alignment test',
    given: 'Names with matching initials and core name parts',
    when: 'validating "MARIA K PAPADOPOULOU" vs "MARIA PAPADOPOULOU"',
    then: 'initials alignment detected, validation passes',
    testData: {
      iban: 'GR4401100000000001234567890',
      employeeName: 'MARIA K PAPADOPOULOU',
      accountHolderName: 'MARIA PAPADOPOULOU',
      expectedDecision: 'pass'
    }
  },
  {
    scenario: 'Performance validation under 150ms',
    given: 'Complex name matching scenario',
    when: 'performing full validation',
    then: 'p95 validation time < 150ms server-side',
    testData: {
      iban: 'GR1601400000000012345678901',
      employeeName: 'ΑΝΑΣΤΑΣΙΟΣ ΠΑΝΑΓΙΩΤΟΠΟΥΛΟΣ ΚΩΝΣΤΑΝΤΙΝΙΔΗΣ',
      accountHolderName: 'ANASTASIOS PANAGIOTOPOYLOS KONSTANTINIDIS',
      maxValidationTime: 150
    }
  }
];

/**
 * BDD Test Runner
 */
export class BddIbanTestRunner {
  
  private testResults: Array<{
    scenario: string;
    passed: boolean;
    actualResult: EnhancedIbanValidationResult;
    expectedResult: any;
    errors: string[];
    validationTime: number;
  }> = [];
  
  /**
   * Run all BDD scenarios
   */
  async runAllScenarios(): Promise<{
    totalTests: number;
    passed: number;
    failed: number;
    results: typeof this.testResults;
    performanceMetrics: {
      averageValidationTime: number;
      p95ValidationTime: number;
      allUnder150ms: boolean;
    };
  }> {
    
    this.testResults = [];
    const validationTimes: number[] = [];
    
    for (const scenario of BDD_TEST_SCENARIOS) {
      const result = await this.runScenario(scenario);
      this.testResults.push(result);
      validationTimes.push(result.validationTime);
    }
    
    // Calculate performance metrics
    validationTimes.sort((a, b) => a - b);
    const averageTime = validationTimes.reduce((sum, time) => sum + time, 0) / validationTimes.length;
    const p95Index = Math.floor(validationTimes.length * 0.95);
    const p95Time = validationTimes[p95Index] || 0;
    const allUnder150ms = validationTimes.every(time => time < 150);
    
    return {
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.passed).length,
      failed: this.testResults.filter(r => !r.passed).length,
      results: this.testResults,
      performanceMetrics: {
        averageValidationTime: averageTime,
        p95ValidationTime: p95Time,
        allUnder150ms
      }
    };
  }
  
  /**
   * Run individual BDD scenario
   */
  private async runScenario(scenario: BddTestScenario): Promise<{
    scenario: string;
    passed: boolean;
    actualResult: EnhancedIbanValidationResult;
    expectedResult: any;
    errors: string[];
    validationTime: number;
  }> {
    
    const errors: string[] = [];
    const startTime = Date.now();
    
    try {
      // Execute the validation
      const actualResult = validateIbanEnhanced(
        scenario.testData.iban || '',
        scenario.testData.employeeName,
        scenario.testData.accountHolderName
      );
      
      const validationTime = Date.now() - startTime;
      
      // Check expected decision
      if (scenario.testData.expectedDecision && 
          actualResult.decision !== scenario.testData.expectedDecision) {
        errors.push(
          `Expected decision '${scenario.testData.expectedDecision}' but got '${actualResult.decision}'`
        );
      }
      
      // Check expected score
      if (scenario.testData.expectedScore && actualResult.nameMatch) {
        const scoreDiff = Math.abs(actualResult.nameMatch.score - scenario.testData.expectedScore);
        if (scoreDiff > 0.1) { // Allow 10% tolerance
          errors.push(
            `Expected name match score ~${scenario.testData.expectedScore} but got ${actualResult.nameMatch.score.toFixed(3)}`
          );
        }
      }
      
      // Check performance requirement
      if (scenario.testData.maxValidationTime && 
          validationTime > scenario.testData.maxValidationTime) {
        errors.push(
          `Validation took ${validationTime}ms, exceeded max ${scenario.testData.maxValidationTime}ms`
        );
      }
      
      // Specific scenario validations
      if (scenario.scenario.includes('save is blocked') && actualResult.decision !== 'fail') {
        errors.push('Expected save to be blocked but decision allows saving');
      }
      
      if (scenario.scenario.includes('no warning') && actualResult.warnings.length > 0) {
        errors.push(`Expected no warnings but got ${actualResult.warnings.length} warnings`);
      }
      
      return {
        scenario: scenario.scenario,
        passed: errors.length === 0,
        actualResult,
        expectedResult: scenario.testData,
        errors,
        validationTime
      };
      
    } catch (error: any) {
      const validationTime = Date.now() - startTime;
      errors.push(`Test execution failed: ${error}`);
      
      return {
        scenario: scenario.scenario,
        passed: false,
        actualResult: {} as EnhancedIbanValidationResult,
        expectedResult: scenario.testData,
        errors,
        validationTime
      };
    }
  }
  
  /**
   * Generate test report
   */
  generateReport(): string {
    if (this.testResults.length === 0) {
      return 'No tests have been run. Call runAllScenarios() first.';
    }
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.length - passed;
    
    let report = '\n=== BDD IBAN Validation Test Report ===\n';
    report += `Total Tests: ${this.testResults.length}\n`;
    report += `Passed: ${passed}\n`;
    report += `Failed: ${failed}\n`;
    report += `Success Rate: ${(passed / this.testResults.length * 100).toFixed(1)}%\n\n`;
    
    // Performance summary
    const times = this.testResults.map(r => r.validationTime);
    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
    const maxTime = Math.max(...times);
    
    report += '=== Performance Metrics ===\n';
    report += `Average Validation Time: ${avgTime.toFixed(1)}ms\n`;
    report += `Max Validation Time: ${maxTime}ms\n`;
    report += `All Under 150ms: ${maxTime < 150 ? 'YES' : 'NO'}\n\n`;
    
    // Detailed results
    report += '=== Detailed Results ===\n';
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      report += `${index + 1}. ${status} - ${result.scenario} (${result.validationTime}ms)\n`;
      
      if (!result.passed) {
        result.errors.forEach(error => {
          report += `   Error: ${error}\n`;
        });
      }
      report += '\n';
    });
    
    return report;
  }
}

/**
 * Quick validation test for development
 */
export function quickValidationTest(
  iban: string,
  employeeName: string,
  accountHolderName: string
): void {
  console.log('\\n=== Quick IBAN Validation Test ===');
  console.log(`IBAN: ${iban}`);
  console.log(`Employee: ${employeeName}`);
  console.log(`Account Holder: ${accountHolderName}\\n`);
  
  const result = validateIbanEnhanced(iban, employeeName, accountHolderName);
  
  console.log(`Decision: ${result.decision.toUpperCase()}`);
  console.log(`Valid: ${result.isValid}`);
  console.log(`Validation Time: ${result.validationTimeMs}ms`);
  console.log(`Masked IBAN: ${result.maskedIban}`);
  
  if (result.nameMatch) {
    console.log(`\\nName Match Score: ${(result.nameMatch.score * 100).toFixed(1)}%`);
    console.log(`Acceptable: ${result.nameMatch.isAcceptable}`);
    console.log(`Reason: ${result.nameMatch.reason}`);
    console.log(`Jaro-Winkler: ${(result.nameMatch.jaroWinklerScore * 100).toFixed(1)}%`);
    console.log(`Trigram: ${(result.nameMatch.trigramScore * 100).toFixed(1)}%`);
    console.log(`Initials Match: ${result.nameMatch.initialsMatch}`);
  }
  
  if (result.errors.length > 0) {
    console.log(`\\nErrors:`);
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log(`\\nWarnings:`);
    result.warnings.forEach(warning => console.log(`  - ${warning.message} (${warning.severity})`));
  }
  
  console.log('=====================================\\n');
}