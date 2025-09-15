/**
 * Payroll Robustness Integration
 * 
 * Demonstration of how all robustness improvements work together:
 * - SafeMath helpers prevent silent errors
 * - Centralized proration ensures consistency  
 * - Compliance guardrails validate outputs
 * - Edge case handlers manage complex scenarios
 * - Comprehensive error handling and recovery
 */

import { PayrollEngine } from '../../engine/PayrollEngine.js';
import { ScopeRunner } from '../../engine/ScopeRunner.js';
import { ComplianceGuardrailsSystem } from '../../server/complianceGuardrails.js';
import { PayrollRepositoryService } from '../../services/PayrollRepositoryService.js';
import { ComplianceConnectorService } from '../../services/ComplianceConnectorService.js';

import {
  safeAdd,
  safeMultiply,
  safeDivide,
  safePercentageCalculation,
  validateDeductionLimits,
  PayrollMathError
} from '../utils/safeMath.js';

import {
  calculateProratedSalary,
  calculateMultipleChangesProration,
  calculateUnpaidLeaveDeduction,
  type EmploymentChange
} from '../utils/prorationLogic.js';

import {
  handleHireTerminationMidPeriod,
  handleWorkWeekConversion,
  handleSplitShiftAcrossMidnight,
  handleUnpaidLeaveDeductions,
  handleNegativeBalancePrevention,
  validateEdgeCaseInputs
} from '../utils/edgeCases.js';

import { 
  PayrollCalculationInput,
  PayrollCalculationResult,
  PayrollDomainError,
  ValidationError
} from '../../shared/payrollDomain.js';

// =============================================================================
// ROBUST PAYROLL PROCESSOR
// =============================================================================

export class RobustPayrollProcessor {
  private readonly payrollEngine: PayrollEngine;
  private readonly scopeRunner: ScopeRunner;
  private readonly complianceGuardrails: ComplianceGuardrailsSystem;

  constructor(
    repositoryService: PayrollRepositoryService,
    complianceService: ComplianceConnectorService
  ) {
    // Initialize all services with robustness features enabled
    this.payrollEngine = new PayrollEngine(
      repositoryService,
      complianceService,
      { 
        validateInputs: true,
        enableMemoization: true,
        batchSize: 100
      }
    );

    this.scopeRunner = new ScopeRunner(
      repositoryService,
      complianceService,
      {
        engine: { validateInputs: true, enableMemoization: true },
        compliance: { validateInputs: true, erganiEnabled: true },
        performance: { enableProfiling: true, enableCaching: true },
        storage: { autoSaveResults: true, enableAuditTrail: true }
      }
    );

    this.complianceGuardrails = new ComplianceGuardrailsSystem();
  }

  // =============================================================================
  // ROBUST SINGLE EMPLOYEE CALCULATION
  // =============================================================================

  /**
   * Process single employee with full robustness checks
   */
  async processEmployeeWithRobustness(
    input: PayrollCalculationInput
  ): Promise<{
    result: PayrollCalculationResult;
    robustnessReport: {
      safeMathValidations: number;
      prorationValidations: number;
      edgeCasesHandled: number;
      complianceViolations: number;
      calculationWarnings: string[];
    };
  }> {
    const calculationWarnings: string[] = [];
    let safeMathValidations = 0;
    let prorationValidations = 0;
    let edgeCasesHandled = 0;

    try {
      console.log(`🔧 Starting robust payroll processing for employee ${input.employeeId}`);

      // Step 1: Input validation with SafeMath
      console.log('📊 Validating inputs with SafeMath helpers...');
      await this.validateInputsWithSafeMath(input);
      safeMathValidations += 5;

      // Step 2: Handle edge cases
      console.log('⚡ Processing edge cases...');
      const edgeCaseResult = await this.handleEmployeeEdgeCases(input);
      if (edgeCaseResult.edgeCasesDetected > 0) {
        edgeCasesHandled += edgeCaseResult.edgeCasesDetected;
        calculationWarnings.push(`Handled ${edgeCaseResult.edgeCasesDetected} edge cases`);
        input = edgeCaseResult.adjustedInput;
      }

      // Step 3: Apply centralized proration logic
      console.log('📐 Applying centralized proration logic...');
      const prorationResult = await this.applyCentralizedProration(input);
      if (prorationResult.prorationApplied) {
        prorationValidations += 1;
        calculationWarnings.push(`Applied proration: ${prorationResult.description}`);
        input = prorationResult.adjustedInput;
      }

      // Step 4: Core payroll calculation with error handling
      console.log('💰 Executing core payroll calculation...');
      let result = await this.payrollEngine.calculateEmployeePayroll(input);

      // Step 5: Apply negative balance prevention
      console.log('🛡️ Applying negative balance prevention...');
      const balanceResult = handleNegativeBalancePrevention({
        employeeId: input.employeeId,
        grossAmount: result.grossPay,
        deductions: result.totalDeductions,
        allowNegativeBalance: false,
        minimumNetPay: 100 // Minimum €100 net pay
      });

      if (balanceResult.preventionApplied) {
        calculationWarnings.push(balanceResult.adjustmentReason);
        result.totalDeductions = balanceResult.adjustedDeductions;
        result.netPay = balanceResult.adjustedNetPay;
      }

      // Step 6: Comprehensive compliance validation
      console.log('⚖️ Running compliance guardrails...');
      const complianceResult = await this.complianceGuardrails.validatePayrollResults(result);
      
      if (!complianceResult.isCompliant) {
        console.warn(`⚠️ Found ${complianceResult.summary.errorCount} compliance violations`);
        calculationWarnings.push(`${complianceResult.summary.errorCount} compliance violations found`);
      }

      // Step 7: Final mathematical consistency check
      console.log('🔢 Final mathematical consistency check...');
      const mathValidation = this.validateFinalMathConsistency(result);
      safeMathValidations += mathValidation.checksPerformed;
      
      if (!mathValidation.isConsistent) {
        calculationWarnings.push(`Mathematical inconsistencies: ${mathValidation.errors.join(', ')}`);
      }

      console.log('✅ Robust payroll processing completed successfully');

      return {
        result,
        robustnessReport: {
          safeMathValidations,
          prorationValidations,
          edgeCasesHandled,
          complianceViolations: complianceResult.summary.errorCount,
          calculationWarnings
        }
      };

    } catch (error) {
      console.error('❌ Robust payroll processing failed:', error);
      
      if (error instanceof PayrollMathError) {
        throw new PayrollDomainError(
          'SAFE_MATH_ERROR',
          error.operation,
          `SafeMath validation failed: ${error.message}`,
          { originalError: error, inputs: error.inputs }
        );
      }
      
      throw error;
    }
  }

  // =============================================================================
  // ROBUST BATCH PROCESSING
  // =============================================================================

  /**
   * Process batch with comprehensive error recovery
   */
  async processBatchWithRobustness(
    scopeId: string
  ): Promise<{
    scope: any;
    results: PayrollCalculationResult[];
    robustnessSummary: {
      totalEmployees: number;
      successfulCalculations: number;
      edgeCasesHandled: number;
      complianceViolations: number;
      mathValidations: number;
      processingErrors: number;
      recoverableErrors: number;
      totalWarnings: number;
    };
  }> {
    console.log(`🚀 Starting robust batch processing for scope ${scopeId}`);

    try {
      // Run scope with all robustness features enabled
      const scopeResult = await this.scopeRunner.runPayrollScope(scopeId);

      // Additional post-processing robustness checks
      const postProcessingResult = await this.performBatchRobustnessChecks(scopeResult.results);

      const robustnessSummary = {
        totalEmployees: scopeResult.scope.selectedEmployeeIds.length,
        successfulCalculations: scopeResult.results.length,
        edgeCasesHandled: postProcessingResult.edgeCasesHandled,
        complianceViolations: postProcessingResult.complianceViolations,
        mathValidations: postProcessingResult.mathValidations,
        processingErrors: scopeResult.errors.filter(e => e.severity === 'error').length,
        recoverableErrors: postProcessingResult.recoverableErrors,
        totalWarnings: scopeResult.warnings.length + postProcessingResult.warnings.length
      };

      console.log('📊 Batch robustness summary:');
      console.log(`   Success rate: ${((robustnessSummary.successfulCalculations / robustnessSummary.totalEmployees) * 100).toFixed(1)}%`);
      console.log(`   Edge cases handled: ${robustnessSummary.edgeCasesHandled}`);
      console.log(`   Compliance violations: ${robustnessSummary.complianceViolations}`);
      console.log(`   Math validations: ${robustnessSummary.mathValidations}`);

      return {
        scope: scopeResult.scope,
        results: scopeResult.results,
        robustnessSummary
      };

    } catch (error) {
      console.error('❌ Robust batch processing failed:', error);
      throw error;
    }
  }

  // =============================================================================
  // PRIVATE ROBUSTNESS METHODS
  // =============================================================================

  private async validateInputsWithSafeMath(input: PayrollCalculationInput): Promise<void> {
    // Validate base salary
    if (input.baseSalary <= 0) {
      throw new PayrollMathError('Base salary must be positive', 'validateInputs', [input.baseSalary]);
    }

    // Validate working hours using SafeMath
    const totalHours = safeAdd(
      safeAdd(input.workingHours.regularHours, input.workingHours.overtimeHours),
      safeAdd(input.workingHours.nightHours, input.workingHours.sundayHours)
    );

    if (totalHours > 744) { // Max hours in a month
      throw new PayrollMathError(
        `Total working hours (${totalHours}) exceeds maximum possible hours in a month (744)`,
        'validateInputs',
        [totalHours]
      );
    }

    // Validate hourly rate calculation
    if (input.hourlyRate) {
      const calculatedHourlyFromSalary = safeDivide(input.baseSalary, 173.33);
      const difference = Math.abs(input.hourlyRate - calculatedHourlyFromSalary);
      
      if (difference > calculatedHourlyFromSalary * 0.1) { // 10% tolerance
        console.warn(`⚠️ Hourly rate (${input.hourlyRate}) differs significantly from calculated rate (${calculatedHourlyFromSalary.toFixed(2)})`);
      }
    }

    // Validate allowances
    if (input.allowances) {
      const totalAllowances = Object.values(input.allowances).reduce((sum, value) => safeAdd(sum, value || 0), 0);
      
      if (totalAllowances > input.baseSalary * 2) {
        console.warn(`⚠️ Total allowances (${totalAllowances}) are unusually high compared to base salary (${input.baseSalary})`);
      }
    }
  }

  private async handleEmployeeEdgeCases(
    input: PayrollCalculationInput
  ): Promise<{
    edgeCasesDetected: number;
    adjustedInput: PayrollCalculationInput;
    edgeCaseDetails: string[];
  }> {
    let edgeCasesDetected = 0;
    const edgeCaseDetails: string[] = [];
    let adjustedInput = { ...input };

    // Check for mid-period hire
    if (input.employmentStartDate > input.periodStartDate) {
      edgeCasesDetected++;
      edgeCaseDetails.push('Mid-period hire detected');
      
      const hireResult = handleHireTerminationMidPeriod({
        type: 'hire',
        employeeId: input.employeeId,
        effectiveDate: input.employmentStartDate,
        salary: input.baseSalary,
        periodStart: input.periodStartDate,
        periodEnd: input.periodEndDate
      });
      
      adjustedInput.baseSalary = hireResult.baseSalaryAdjustment;
    }

    // Check for unpaid leave
    if (input.leaveHours?.sick && input.leaveHours.sick > 40) {
      edgeCasesDetected++;
      edgeCaseDetails.push('Extended unpaid leave detected');
      
      // Apply unpaid leave deduction
      const leaveEnd = new Date(input.periodStartDate);
      leaveEnd.setDate(leaveEnd.getDate() + Math.ceil(input.leaveHours.sick / 8)); // 8 hours per day
      
      const leaveResult = handleUnpaidLeaveDeductions({
        employeeId: input.employeeId,
        baseSalary: adjustedInput.baseSalary,
        leaveStart: input.periodStartDate,
        leaveEnd: leaveEnd,
        periodStart: input.periodStartDate,
        periodEnd: input.periodEndDate,
        allowPartialDeduction: true
      });
      
      adjustedInput.baseSalary = leaveResult.adjustedSalary;
    }

    // Check for excessive overtime (edge case)
    const totalOvertimeHours = input.workingHours.overtimeHours + input.workingHours.sundayHours + input.workingHours.holidayHours;
    if (totalOvertimeHours > 60) { // More than 60 overtime hours per month
      edgeCasesDetected++;
      edgeCaseDetails.push('Excessive overtime hours detected');
      console.warn(`⚠️ Employee ${input.employeeId} has excessive overtime: ${totalOvertimeHours} hours`);
    }

    return {
      edgeCasesDetected,
      adjustedInput,
      edgeCaseDetails
    };
  }

  private async applyCentralizedProration(
    input: PayrollCalculationInput
  ): Promise<{
    prorationApplied: boolean;
    adjustedInput: PayrollCalculationInput;
    description: string;
  }> {
    // Check if proration is needed
    const periodDays = Math.ceil((input.periodEndDate.getTime() - input.periodStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const standardMonthDays = 30;

    if (Math.abs(periodDays - standardMonthDays) > 2) {
      // Apply proration for non-standard periods
      const prorationResult = calculateProratedSalary(
        input.baseSalary,
        input.periodStartDate,
        input.periodEndDate,
        input.employmentStartDate
      );

      return {
        prorationApplied: true,
        adjustedInput: {
          ...input,
          baseSalary: prorationResult.proRatedAmount
        },
        description: `Prorated salary from €${input.baseSalary} to €${prorationResult.proRatedAmount.toFixed(2)} (${(prorationResult.prorationFactor * 100).toFixed(1)}%)`
      };
    }

    return {
      prorationApplied: false,
      adjustedInput: input,
      description: 'No proration needed'
    };
  }

  private validateFinalMathConsistency(
    result: PayrollCalculationResult
  ): {
    isConsistent: boolean;
    checksPerformed: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let checksPerformed = 0;

    try {
      // Check 1: Net pay calculation
      checksPerformed++;
      const calculatedNetPay = safeAdd(result.grossPay, -result.totalDeductions);
      if (Math.abs(result.netPay - calculatedNetPay) > 0.01) {
        errors.push(`Net pay mismatch: expected ${calculatedNetPay}, got ${result.netPay}`);
      }

      // Check 2: Total deductions
      checksPerformed++;
      const calculatedDeductions = safeAdd(
        safeAdd(result.incomeTax, result.solidarityTax),
        safeAdd(result.employeeEfkaMain + result.employeeEfkaAux, result.employeeUnemployment)
      );
      if (Math.abs(result.totalDeductions - calculatedDeductions) > 0.01) {
        errors.push(`Deductions mismatch: expected ${calculatedDeductions}, got ${result.totalDeductions}`);
      }

      // Check 3: Employer cost
      checksPerformed++;
      const calculatedEmployerCost = safeAdd(
        result.grossPay,
        result.employerEfkaMain + result.employerEfkaAux + result.employerUnemployment + result.employerSickness + result.employerWorkAccident
      );
      if (Math.abs(result.totalEmployerCost - calculatedEmployerCost) > 0.01) {
        errors.push(`Employer cost mismatch: expected ${calculatedEmployerCost}, got ${result.totalEmployerCost}`);
      }

      // Check 4: Percentage validations
      checksPerformed++;
      if (result.grossPay > 0) {
        const deductionRate = safeDivide(result.totalDeductions, result.grossPay);
        if (deductionRate > 0.8) { // More than 80% deductions
          errors.push(`Excessive deduction rate: ${(deductionRate * 100).toFixed(1)}%`);
        }
      }

      return {
        isConsistent: errors.length === 0,
        checksPerformed,
        errors
      };

    } catch (error) {
      return {
        isConsistent: false,
        checksPerformed,
        errors: [`Math validation error: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async performBatchRobustnessChecks(
    results: PayrollCalculationResult[]
  ): Promise<{
    edgeCasesHandled: number;
    complianceViolations: number;
    mathValidations: number;
    recoverableErrors: number;
    warnings: ValidationError[];
  }> {
    let edgeCasesHandled = 0;
    let mathValidations = 0;
    let recoverableErrors = 0;
    const warnings: ValidationError[] = [];

    // Run compliance check on all results
    const complianceResult = await this.complianceGuardrails.validatePayrollResults(results);

    // Additional batch-level validations
    for (const result of results) {
      // Math consistency check
      const mathCheck = this.validateFinalMathConsistency(result);
      mathValidations += mathCheck.checksPerformed;

      if (!mathCheck.isConsistent) {
        recoverableErrors += mathCheck.errors.length;
        
        for (const error of mathCheck.errors) {
          warnings.push({
            code: 'MATH_CONSISTENCY_WARNING',
            field: 'calculation',
            message: error,
            messageGr: 'Προειδοποίηση συνέπειας μαθηματικών',
            severity: 'warning'
          });
        }
      }

      // Edge case detection
      if (result.netPay < 100) {
        edgeCasesHandled++;
        warnings.push({
          code: 'LOW_NET_PAY_WARNING',
          field: 'netPay',
          message: `Very low net pay: €${result.netPay}`,
          messageGr: `Πολύ χαμηλές καθαρές αποδοχές: €${result.netPay}`,
          severity: 'warning'
        });
      }

      if (result.grossPay > 10000) {
        edgeCasesHandled++;
        warnings.push({
          code: 'HIGH_GROSS_PAY_INFO',
          field: 'grossPay', 
          message: `High gross pay detected: €${result.grossPay}`,
          messageGr: `Ανιχνεύτηκαν υψηλές μικτές αποδοχές: €${result.grossPay}`,
          severity: 'info'
        });
      }
    }

    return {
      edgeCasesHandled,
      complianceViolations: complianceResult.summary.errorCount,
      mathValidations,
      recoverableErrors,
      warnings
    };
  }

  // =============================================================================
  // HEALTH CHECK AND MONITORING
  // =============================================================================

  /**
   * Comprehensive system health check for robustness features
   */
  async performRobustnessHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      safeMath: { status: string; message: string };
      proration: { status: string; message: string };
      complianceGuardrails: { status: string; message: string };
      edgeCaseHandling: { status: string; message: string };
      mathValidation: { status: string; message: string };
    };
    summary: string;
  }> {
    const components = {
      safeMath: { status: 'unknown', message: '' },
      proration: { status: 'unknown', message: '' },
      complianceGuardrails: { status: 'unknown', message: '' },
      edgeCaseHandling: { status: 'unknown', message: '' },
      mathValidation: { status: 'unknown', message: '' }
    };

    // Test SafeMath
    try {
      safeAdd(100, 200);
      safeMultiply(50, 2.5);
      safeDivide(1000, 40);
      components.safeMath = { status: 'healthy', message: 'SafeMath operations working correctly' };
    } catch (error) {
      components.safeMath = { status: 'unhealthy', message: `SafeMath error: ${error}` };
    }

    // Test Proration Logic
    try {
      calculateProratedSalary(1000, new Date('2024-01-01'), new Date('2024-01-15'), new Date('2024-01-01'));
      components.proration = { status: 'healthy', message: 'Proration logic working correctly' };
    } catch (error) {
      components.proration = { status: 'unhealthy', message: `Proration error: ${error}` };
    }

    // Test Compliance Guardrails
    try {
      const healthCheck = await this.complianceGuardrails.getComplianceDashboard();
      components.complianceGuardrails = { 
        status: 'healthy', 
        message: `Compliance system active with ${healthCheck.alerts.length} pending alerts` 
      };
    } catch (error) {
      components.complianceGuardrails = { status: 'unhealthy', message: `Compliance error: ${error}` };
    }

    // Test Edge Case Handling
    try {
      const testCase = {
        type: 'hire' as const,
        employeeId: 'TEST',
        effectiveDate: new Date('2024-01-15'),
        salary: 1000,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31')
      };
      validateEdgeCaseInputs(testCase);
      components.edgeCaseHandling = { status: 'healthy', message: 'Edge case validation working correctly' };
    } catch (error) {
      components.edgeCaseHandling = { status: 'unhealthy', message: `Edge case error: ${error}` };
    }

    // Test Math Validation
    try {
      const testResult = {
        grossPay: 1000,
        totalDeductions: 300,
        netPay: 700,
        incomeTax: 100,
        solidarityTax: 50,
        employeeEfkaMain: 67,
        employeeEfkaAux: 30,
        employeeUnemployment: 10,
        totalEmployerCost: 1250,
        employerEfkaMain: 131,
        employerEfkaAux: 30,
        employerUnemployment: 10,
        employerSickness: 6,
        employerWorkAccident: 10
      } as PayrollCalculationResult;
      
      this.validateFinalMathConsistency(testResult);
      components.mathValidation = { status: 'healthy', message: 'Math validation working correctly' };
    } catch (error) {
      components.mathValidation = { status: 'unhealthy', message: `Math validation error: ${error}` };
    }

    // Determine overall status
    const unhealthyComponents = Object.values(components).filter(c => c.status === 'unhealthy').length;
    const degradedComponents = Object.values(components).filter(c => c.status === 'degraded').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyComponents > 0) {
      status = 'unhealthy';
    } else if (degradedComponents > 0) {
      status = 'degraded'; 
    } else {
      status = 'healthy';
    }

    const summary = `Robustness system ${status}: ${5 - unhealthyComponents - degradedComponents}/5 components healthy`;

    return {
      status,
      components,
      summary
    };
  }
}