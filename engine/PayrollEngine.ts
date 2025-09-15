/**
 * Payroll Engine - Pure Business Logic Orchestration
 * 
 * The core payroll engine that orchestrates payroll calculations using domain rules
 * and ports for external dependencies. Contains no database access or external I/O.
 * This is the heart of the 3-layer architecture's Engine layer.
 */

import { 
  PayrollCalculationInput,
  PayrollCalculationResult,
  Employee,
  WorkingHours,
  ValidationError,
  BusinessRuleResult,
  RepositoryPort,
  CompliancePort,
  CachePort,
  PayrollDomainError
} from '../shared/payrollDomain.js';

import { 
  GreekLawConstants,
  lawRegistry 
} from '../shared/law-constants.js';

// Domain rules imports
import { 
  calculateCombinedTax,
  calculateMonthlyWithholding 
} from '../core/greekRules/tax.js';

import { 
  calculateEfkaContributions,
  calculateEfkaExemptions 
} from '../core/greekRules/socialSecurity.js';

import { 
  calculateOvertimePremiums,
  validateWorkingHours 
} from '../core/greekRules/workingTime.js';

import { 
  calculateAllGreekBonuses,
  BonusCalculationInput 
} from '../core/greekRules/bonuses.js';

// Cached calculations for performance
import { MemoizedCalculations } from '../lib/payroll/calculators/MemoizedCalculations.js';

// =============================================================================
// PAYROLL ENGINE INTERFACE
// =============================================================================

export interface PayrollEngineConfig {
  batchSize: number;
  enableMemoization: boolean;
  validateInputs: boolean;
  lawVersionDate?: Date;
}

export interface PayrollEngineResult {
  success: boolean;
  results: PayrollCalculationResult[];
  errors: ValidationError[];
  warnings: ValidationError[];
  metrics: {
    processedCount: number;
    errorCount: number;
    warningCount: number;
    processingTimeMs: number;
    memoryUsedMB: number;
  };
}

// =============================================================================
// MAIN PAYROLL ENGINE CLASS
// =============================================================================

export class PayrollEngine {
  private readonly repositoryPort: RepositoryPort;
  private readonly compliancePort: CompliancePort;
  private readonly cachePort?: CachePort;
  private readonly config: PayrollEngineConfig;
  
  constructor(
    repositoryPort: RepositoryPort,
    compliancePort: CompliancePort,
    config: Partial<PayrollEngineConfig> = {},
    cachePort?: CachePort
  ) {
    this.repositoryPort = repositoryPort;
    this.compliancePort = compliancePort;
    this.cachePort = cachePort;
    
    this.config = {
      batchSize: 500,
      enableMemoization: true,
      validateInputs: true,
      ...config
    };
  }

  // =============================================================================
  // MAIN CALCULATION METHODS
  // =============================================================================

  /**
   * Calculate payroll for a single employee
   */
  async calculateEmployeePayroll(
    input: PayrollCalculationInput,
    lawVersion?: GreekLawConstants
  ): Promise<PayrollCalculationResult> {
    const startTime = Date.now();
    
    try {
      // Get law version for the calculation period
      const law = lawVersion || 
        (this.config.lawVersionDate ? 
          lawRegistry.getActiveVersion(this.config.lawVersionDate) : 
          lawRegistry.getCurrentConstants());
      
      // Validate inputs if enabled
      if (this.config.validateInputs) {
        await this.validateCalculationInput(input);
      }
      
      // Calculate base salary components
      const baseSalaryResult = await this.calculateBaseSalary(input, law);
      
      // Calculate working time premiums
      const workingTimeResult = await this.calculateWorkingTimePremiums(input, law);
      
      // Calculate allowances
      const allowancesResult = await this.calculateAllowances(input, law);
      
      // Calculate Greek bonuses
      const bonusesResult = await this.calculateBonuses(input, law);
      
      // Calculate benefits and tips
      const benefitsResult = await this.calculateBenefitsAndTips(input, law);
      
      // Calculate gross pay
      const grossPay = this.calculateGrossPay({
        baseSalary: baseSalaryResult,
        workingTime: workingTimeResult,
        allowances: allowancesResult,
        bonuses: bonusesResult,
        benefits: benefitsResult
      });
      
      // Calculate deductions (taxes and social security)
      const deductionsResult = await this.calculateDeductions(grossPay, input, law);
      
      // Calculate net pay
      const netPay = grossPay.totalGross - deductionsResult.totalDeductions;
      
      // Calculate employer costs
      const employerCostResult = await this.calculateEmployerCosts(grossPay, input, law);
      
      // Build result object
      const result: PayrollCalculationResult = {
        employeeId: input.employeeId,
        periodId: input.periodId,
        
        // Metadata
        calculationDate: new Date(),
        calculationVersion: '2025.1',
        lawVersionId: law.version.versionId,
        
        // Base salary components
        baseSalary: baseSalaryResult.baseSalary,
        regularPay: baseSalaryResult.regularPay,
        overtimeAmount: workingTimeResult.overtimePay.total,
        nightPremium: workingTimeResult.nightPremium,
        sundayPremium: workingTimeResult.sundayPremium,
        holidayPremium: workingTimeResult.holidayPremium,
        
        // Allowances and bonuses
        totalAllowances: allowancesResult.total,
        allowancesBreakdown: allowancesResult.breakdown,
        christmasBonus: bonusesResult.christmas.bonusAmount,
        easterBonus: bonusesResult.easter.bonusAmount,
        vacationBonus: bonusesResult.vacation.bonusAmount,
        totalBonuses: bonusesResult.totalBonuses,
        
        // Leave pay
        annualLeavePay: benefitsResult.leavePay.annual,
        sickLeavePay: benefitsResult.leavePay.sick,
        maternityLeavePay: benefitsResult.leavePay.maternity,
        paternityLeavePay: benefitsResult.leavePay.paternity,
        totalLeavePay: benefitsResult.leavePay.total,
        
        // Benefits and tips
        taxFreeBenefits: benefitsResult.benefits.taxFree,
        taxableBenefits: benefitsResult.benefits.taxable,
        imputedIncome: benefitsResult.benefits.imputed,
        totalTips: benefitsResult.tips.total,
        tipsTax: benefitsResult.tips.tax,
        netTips: benefitsResult.tips.net,
        
        // Gross totals
        grossPay: grossPay.totalGross,
        taxableIncome: grossPay.taxableIncome,
        
        // Deductions
        incomeTax: deductionsResult.incomeTax,
        solidarityTax: deductionsResult.solidarityTax,
        employeeEfkaMain: deductionsResult.efka.employee.main,
        employeeEfkaAux: deductionsResult.efka.employee.auxiliary,
        employeeUnemployment: deductionsResult.efka.employee.unemployment,
        totalDeductions: deductionsResult.totalDeductions,
        
        // Employer costs
        employerEfkaMain: employerCostResult.efka.employer.main,
        employerEfkaAux: employerCostResult.efka.employer.auxiliary,
        employerUnemployment: employerCostResult.efka.employer.unemployment,
        employerSickness: employerCostResult.efka.employer.sickness,
        employerWorkAccident: employerCostResult.efka.employer.workAccident,
        totalEmployerCost: employerCostResult.totalCost,
        
        // Final amount
        netPay: Math.round(netPay * 100) / 100,
        
        // Cap consumption (to be filled by service layer)
        capConsumption: {},
        
        // Formatted values (to be filled by localization layer)
        formatted: {
          baseSalary: '',
          netPay: '',
          grossTotal: '',
          workingPeriod: '',
          calculationDate: '',
          taxAmount: '',
          efkaAmount: ''
        }
      };
      
      return result;
      
    } catch (error) {
      throw new PayrollDomainError(
        'CALCULATION_FAILED',
        'payrollCalculation',
        `Payroll calculation failed for employee ${input.employeeId}: ${error instanceof Error ? error.message : String(error)}`,
        { 
          input, 
          processingTimeMs: Date.now() - startTime,
          originalError: error
        }
      );
    }
  }

  /**
   * Calculate payroll for multiple employees
   */
  async calculateBatchPayroll(
    inputs: PayrollCalculationInput[],
    lawVersion?: GreekLawConstants
  ): Promise<PayrollEngineResult> {
    const startTime = Date.now();
    const results: PayrollCalculationResult[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    try {
      // Process in batches for memory efficiency
      const batches = this.createBatches(inputs, this.config.batchSize);
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (input) => {
          try {
            const result = await this.calculateEmployeePayroll(input, lawVersion);
            results.push(result);
          } catch (error) {
            const validationError: ValidationError = {
              code: error instanceof PayrollDomainError ? error.code : 'UNKNOWN_ERROR',
              field: 'employeeId',
              message: error instanceof Error ? error.message : String(error),
              messageGr: 'Σφάλμα στον υπολογισμό μισθοδοσίας',
              severity: 'error'
            };
            errors.push(validationError);
          }
        });
        
        await Promise.all(batchPromises);
      }
      
      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      
      return {
        success: errors.length === 0,
        results,
        errors,
        warnings,
        metrics: {
          processedCount: results.length,
          errorCount: errors.length,
          warningCount: warnings.length,
          processingTimeMs,
          memoryUsedMB: this.getMemoryUsage()
        }
      };
      
    } catch (error) {
      throw new PayrollDomainError(
        'BATCH_CALCULATION_FAILED',
        'batchCalculation',
        `Batch payroll calculation failed: ${error instanceof Error ? error.message : String(error)}`,
        { 
          inputCount: inputs.length,
          processingTimeMs: Date.now() - startTime,
          originalError: error
        }
      );
    }
  }

  // =============================================================================
  // CALCULATION COMPONENT METHODS
  // =============================================================================

  private async calculateBaseSalary(
    input: PayrollCalculationInput,
    law: GreekLawConstants
  ) {
    const { baseSalary, hourlyRate, workingHours } = input;
    
    // Use provided hourly rate or calculate from base salary
    const effectiveHourlyRate = hourlyRate || (baseSalary / law.workingTimeLimits.standardMonthlyHours);
    
    const regularPay = workingHours.regularHours * effectiveHourlyRate;
    
    return {
      baseSalary,
      regularPay: Math.round(regularPay * 100) / 100,
      hourlyRate: effectiveHourlyRate
    };
  }

  private async calculateWorkingTimePremiums(
    input: PayrollCalculationInput,
    law: GreekLawConstants
  ) {
    const { workingHours } = input;
    const effectiveHourlyRate = input.hourlyRate || (input.baseSalary / law.workingTimeLimits.standardMonthlyHours);
    
    // Use memoized calculation if available
    if (this.config.enableMemoization) {
      return MemoizedCalculations.calculateOvertimePremiums(
        workingHours,
        effectiveHourlyRate,
        law.version.versionId
      );
    }
    
    return calculateOvertimePremiums(workingHours, effectiveHourlyRate, law);
  }

  private async calculateAllowances(
    input: PayrollCalculationInput,
    law: GreekLawConstants
  ) {
    const allowances = input.allowances || {};
    
    const breakdown: Record<string, number> = {};
    let total = 0;
    
    for (const [key, value] of Object.entries(allowances)) {
      if (value && value > 0) {
        breakdown[key] = value;
        total += value;
      }
    }
    
    return {
      breakdown,
      total: Math.round(total * 100) / 100
    };
  }

  private async calculateBonuses(
    input: PayrollCalculationInput,
    law: GreekLawConstants
  ) {
    const bonusInput: BonusCalculationInput = {
      baseMonthlySalary: input.baseSalary,
      monthsWorked: this.calculateMonthsWorked(input.employmentStartDate, input.periodEndDate),
      contractType: input.contractType,
      employmentStartDate: input.employmentStartDate,
      calculationDate: new Date(),
      isFullTime: input.isFullTime
    };
    
    return calculateAllGreekBonuses(bonusInput, law);
  }

  private async calculateBenefitsAndTips(
    input: PayrollCalculationInput,
    law: GreekLawConstants
  ) {
    const tips = input.tips || 0;
    const benefitsInKind = input.benefitsInKind || {};
    const leaveHours = input.leaveHours || {};
    
    // Calculate tips tax
    const tipsTaxFreeThreshold = law.tipsTaxRules.taxFreeThreshold;
    const taxableTips = Math.max(0, tips - tipsTaxFreeThreshold);
    const tipsTax = taxableTips * law.tipsTaxRules.taxRate;
    const netTips = tips - tipsTax;
    
    // Calculate leave pay (simplified - should use proper leave rules)
    const hourlyRate = input.hourlyRate || (input.baseSalary / law.workingTimeLimits.standardMonthlyHours);
    const annualLeavePay = (leaveHours.annual || 0) * hourlyRate;
    const sickLeavePay = (leaveHours.sick || 0) * hourlyRate;
    const maternityLeavePay = (leaveHours.maternity || 0) * hourlyRate;
    const paternityLeavePay = (leaveHours.paternity || 0) * hourlyRate;
    const totalLeavePay = annualLeavePay + sickLeavePay + maternityLeavePay + paternityLeavePay;
    
    // Calculate benefits in kind
    const taxFreeBenefits = (benefitsInKind.mealVouchers || 0);
    const taxableBenefits = (benefitsInKind.companyCar || 0) + (benefitsInKind.housing || 0);
    const imputedIncome = taxableBenefits; // Simplified
    
    return {
      tips: {
        total: tips,
        tax: Math.round(tipsTax * 100) / 100,
        net: Math.round(netTips * 100) / 100
      },
      leavePay: {
        annual: Math.round(annualLeavePay * 100) / 100,
        sick: Math.round(sickLeavePay * 100) / 100,
        maternity: Math.round(maternityLeavePay * 100) / 100,
        paternity: Math.round(paternityLeavePay * 100) / 100,
        total: Math.round(totalLeavePay * 100) / 100
      },
      benefits: {
        taxFree: Math.round(taxFreeBenefits * 100) / 100,
        taxable: Math.round(taxableBenefits * 100) / 100,
        imputed: Math.round(imputedIncome * 100) / 100
      }
    };
  }

  private calculateGrossPay(components: {
    baseSalary: { regularPay: number };
    workingTime: { overtimePay: { total: number }; nightPremium: number; sundayPremium: number; holidayPremium: number };
    allowances: { total: number };
    bonuses: { totalBonuses: number };
    benefits: { 
      tips: { total: number }; 
      leavePay: { total: number }; 
      benefits: { taxable: number; taxFree: number } 
    };
  }) {
    const totalGross = 
      components.baseSalary.regularPay +
      components.workingTime.overtimePay.total +
      components.workingTime.nightPremium +
      components.workingTime.sundayPremium +
      components.workingTime.holidayPremium +
      components.allowances.total +
      components.bonuses.totalBonuses +
      components.benefits.tips.total +
      components.benefits.leavePay.total +
      components.benefits.benefits.taxable +
      components.benefits.benefits.taxFree;
    
    // Taxable income excludes tax-free benefits and tips below threshold
    const taxableIncome = totalGross - components.benefits.benefits.taxFree;
    
    return {
      totalGross: Math.round(totalGross * 100) / 100,
      taxableIncome: Math.round(taxableIncome * 100) / 100
    };
  }

  private async calculateDeductions(
    grossPay: { totalGross: number; taxableIncome: number },
    input: PayrollCalculationInput,
    law: GreekLawConstants
  ) {
    // Calculate tax withholding
    const taxResult = calculateMonthlyWithholding(
      grossPay.taxableIncome,
      'single', // Simplified - should come from employee data
      0,        // Simplified - should come from employee data
      law
    );
    
    // Calculate EFKA contributions with exemptions
    const efkaResult = calculateEfkaExemptions(
      grossPay.totalGross,
      {
        tips: input.tips,
        benefitsInKind: (input.benefitsInKind?.companyCar || 0) + (input.benefitsInKind?.housing || 0),
        mealVouchers: input.benefitsInKind?.mealVouchers
      },
      law
    );
    
    const totalDeductions = 
      taxResult.incomeTax +
      taxResult.solidarityTax +
      efkaResult.contributions.employee.total;
    
    return {
      incomeTax: Math.round(taxResult.incomeTax * 100) / 100,
      solidarityTax: Math.round(taxResult.solidarityTax * 100) / 100,
      efka: efkaResult.contributions,
      totalDeductions: Math.round(totalDeductions * 100) / 100
    };
  }

  private async calculateEmployerCosts(
    grossPay: { totalGross: number },
    input: PayrollCalculationInput,
    law: GreekLawConstants
  ) {
    const efkaResult = calculateEfkaContributions(grossPay.totalGross, law);
    
    const totalCost = grossPay.totalGross + efkaResult.employer.total;
    
    return {
      efka: efkaResult,
      totalCost: Math.round(totalCost * 100) / 100
    };
  }

  // =============================================================================
  // VALIDATION METHODS
  // =============================================================================

  private async validateCalculationInput(input: PayrollCalculationInput): Promise<void> {
    const errors: ValidationError[] = [];
    
    // Basic validation
    if (!input.employeeId) {
      errors.push({
        code: 'MISSING_EMPLOYEE_ID',
        field: 'employeeId',
        message: 'Employee ID is required',
        messageGr: 'Το ID του εργαζομένου είναι υποχρεωτικό',
        severity: 'error'
      });
    }
    
    if (input.baseSalary <= 0) {
      errors.push({
        code: 'INVALID_BASE_SALARY',
        field: 'baseSalary',
        message: 'Base salary must be positive',
        messageGr: 'Ο βασικός μισθός πρέπει να είναι θετικός',
        severity: 'error'
      });
    }
    
    // Working hours validation
    const workingHoursValidation = validateWorkingHours(input.workingHours);
    if (!workingHoursValidation.isValid) {
      for (const violation of workingHoursValidation.violations) {
        errors.push({
          code: violation.type,
          field: 'workingHours',
          message: violation.message,
          messageGr: violation.messageGr,
          severity: 'error'
        });
      }
    }
    
    // Use compliance port for additional validation
    if (this.compliancePort) {
      const complianceErrors = await this.compliancePort.validateOvertimeCaps(input);
      errors.push(...complianceErrors);
    }
    
    if (errors.length > 0) {
      throw new PayrollDomainError(
        'INPUT_VALIDATION_FAILED',
        'validation',
        `Input validation failed: ${errors.map(e => e.message).join(', ')}`,
        { errors, input }
      );
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private calculateMonthsWorked(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    const dayDiff = endDate.getDate() - startDate.getDate();
    
    let months = yearDiff * 12 + monthDiff;
    
    if (dayDiff < 0) {
      months -= 1;
    }
    
    return Math.max(0, months);
  }

  private getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100; // MB
  }
}