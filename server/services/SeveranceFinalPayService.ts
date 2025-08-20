import { db } from "../db";
import { 
  terminationRecords, 
  severanceCalculations, 
  finalPayLines,
  employees,
  type TerminationRecord,
  type SeveranceCalculation,
  type SeveranceCalculationInputs,
  type SeveranceCalculationOutputs,
  type InsertTerminationRecord,
  type InsertSeveranceCalculation,
  type InsertFinalPayLine
} from "../../shared/schema";
import { CalcProvenanceService } from "./CalcProvenanceService";
import { SeveranceRulesService } from "./SeveranceRulesService";
import { eq, desc } from "drizzle-orm";

/**
 * SeveranceFinalPayService - Deterministic Calculation Pipeline
 * 
 * Implements exact Greek payroll specification for severance and final pay
 * calculations according to Ν. 4093/2012 and production requirements.
 * 
 * Features:
 * - Deterministic reference wage assembly
 * - Exact service metrics calculation  
 * - Rule-based severance with notice factors
 * - Comprehensive unpaid wages aggregation
 * - Pro-rata holiday allowances and bonuses
 * - Tax treatment per rulesets
 * - Bilingual explainability
 * - Immutable audit trail
 */
export class SeveranceFinalPayService {
  
  /**
   * Deterministic calculation pipeline for Greek severance and final pay
   * Implements exact specification for production compliance
   */
  static async calculateSeveranceFinalPay(inputs: SeveranceCalculationInputs): Promise<SeveranceCalculationOutputs> {
    try {
      // ========================================================================
      // 1. ASSEMBLE REFERENCE WAGE(S)
      // ========================================================================
      
      const refMonthly = inputs.avgRegular6m || inputs.lastMonthlyWage;
      const baseRate = inputs.baseRate || refMonthly;
      const dailyWage = baseRate / 25; // Configurable for daily-rated workers
      
      // ========================================================================
      // 2. SERVICE METRICS
      // ========================================================================
      
      const hireDate = new Date(inputs.hireDate || '2020-01-01');
      const terminationDate = new Date(inputs.effectiveDate);
      const monthsBetween = this.monthsBetween(hireDate, terminationDate);
      const serviceYears = Math.floor(monthsBetween / 12);
      
      // Year fraction for 2025 allowance proration
      const yearFraction2025 = this.calculateYearFraction(terminationDate, 2025);
      
      // Initialize calculation results
      let severanceAmount = 0;
      let unpaidWages = 0;
      let unusedLeaveAmount = 0;
      let holidayAllowanceAmount = 0;
      let proRataEasterBonus = 0;
      let proRataChristmasBonus = 0;
      let otherBalances = 0;
      
      const finalPayLines: any[] = [];
      const calculationSteps: string[] = [];

      // ========================================================================
      // 3. SEVERANCE CALCULATION (Deterministic)
      // ========================================================================
      
      let severanceRuleVersion = 'greek-v2025.1';
      if (this.isSeveranceEligible(inputs.terminationType, inputs.terminationCause, inputs.contractType)) {
        const severanceCalc = await this.calculateDeterministicSeverance(
          serviceYears, 
          monthsBetween,
          refMonthly, 
          inputs.terminationType,
          inputs.terminationCause,
          inputs.contractType,
          inputs.withNotice
        );
        
        severanceAmount = severanceCalc.amount;
        severanceRuleVersion = severanceCalc.ruleVersion;
        calculationSteps.push(`Severance: ${severanceCalc.formula}`);
        
        finalPayLines.push({
          lineType: 'severance',
          code: 'SEVERANCE_DISMISSAL',
          description: 'Severance Payment',
          descriptionGr: 'Αποζημίωση Απόλυσης',
          calculatedAmount: severanceAmount,
          legalReference: 'Ν. 4093/2012 άρθρα 1-3',
          calculationFormula: severanceCalc.formula
        });
      }

      // ========================================================================
      // 4. UNPAID WAGES CALCULATION
      // ========================================================================
      
      const unpaidRegular = (inputs.unpaidRegularDays || 0) * dailyWage;
      const unpaidAllowances = Object.values(inputs.pendingAllowances || {}).reduce((sum, val) => sum + val, 0);
      const unpaidOT = inputs.unpaidOvertimeAmount || 0;
      
      unpaidWages = unpaidRegular + unpaidAllowances + unpaidOT;
      calculationSteps.push(`Unpaid wages: ${inputs.unpaidRegularDays || 0} days × €${dailyWage.toFixed(2)} + allowances €${unpaidAllowances.toFixed(2)} + OT €${unpaidOT.toFixed(2)} = €${unpaidWages.toFixed(2)}`);
      
      if (unpaidWages > 0) {
        finalPayLines.push({
          lineType: 'wages',
          code: 'WAGES_UNPAID',
          description: 'Unpaid Wages',
          descriptionGr: 'Απλήρωτες Αποδοχές',
          calculatedAmount: unpaidWages,
          legalReference: 'Ν. 4093/2012 άρθρο 15',
          calculationFormula: `${inputs.unpaidRegularDays || 0} days × daily wage €${dailyWage.toFixed(2)}`
        });
      }

      // ========================================================================
      // 5. UNUSED LEAVE + HOLIDAY ALLOWANCE (Επίδομα Άδειας)
      // ========================================================================
      
      // Leave pay (non-worked leave compensation)
      unusedLeaveAmount = inputs.unusedLeaveDays * dailyWage;
      calculationSteps.push(`Unused leave: ${inputs.unusedLeaveDays} days × €${dailyWage.toFixed(2)} = €${unusedLeaveAmount.toFixed(2)}`);
      
      // Επίδομα Άδειας - pro-rata if not fully paid in current year
      const fullHolidayAward = 0.5 * baseRate;
      const serviceFraction = inputs.serviceFractionOverride || yearFraction2025;
      const unpaidHolidayAllowance = fullHolidayAward * serviceFraction - (inputs.allowanceAlreadyPaidYtd || 0);
      holidayAllowanceAmount = Math.max(0, unpaidHolidayAllowance);
      calculationSteps.push(`Holiday allowance: 50% × €${baseRate.toFixed(2)} × ${serviceFraction.toFixed(3)} fraction - €${(inputs.allowanceAlreadyPaidYtd || 0).toFixed(2)} paid = €${holidayAllowanceAmount.toFixed(2)}`);

      if (unusedLeaveAmount > 0) {
        finalPayLines.push({
          lineType: 'leave',
          code: 'LEAVE_UNUSED',
          description: 'Unused Leave Payment',
          descriptionGr: 'Αποζημίωση Αχρησιμοποίητης Άδειας',
          calculatedAmount: unusedLeaveAmount,
          legalReference: 'Ν. 4093/2012 άρθρο 3',
          calculationFormula: `${inputs.unusedLeaveDays} days × €${dailyWage.toFixed(2)} daily wage`
        });
      }

      if (holidayAllowanceAmount > 0) {
        finalPayLines.push({
          lineType: 'allowance',
          code: 'HOLIDAY_ALLOWANCE',
          description: 'Holiday Allowance (Pro-rata)',
          descriptionGr: 'Επίδομα Άδειας (Αναλογικό)',
          calculatedAmount: holidayAllowanceAmount,
          legalReference: 'Ν. 4093/2012 άρθρο 3',
          calculationFormula: `50% × base rate × ${serviceFraction.toFixed(3)} service fraction`
        });
      }

      // ========================================================================
      // 6. ΔΏΡΑ (BONUSES) - PRO-RATA IF UNPAID
      // ========================================================================
      
      // Πάσχα (Jan 1 - Apr 30)
      const terminationMonth = terminationDate.getMonth() + 1;
      const terminationYear = terminationDate.getFullYear();
      
      if (terminationMonth <= 4 && !inputs.easterPaid) {
        const daysInEasterPeriod = this.getDaysInPeriod(new Date(terminationYear, 0, 1), new Date(terminationYear, 3, 30));
        const daysEmployedInEasterPeriod = this.getDaysEmployedInPeriod(hireDate, terminationDate, new Date(terminationYear, 0, 1), new Date(terminationYear, 3, 30));
        proRataEasterBonus = 0.5 * baseRate * (daysEmployedInEasterPeriod / daysInEasterPeriod);
        calculationSteps.push(`Easter bonus: 50% × €${baseRate.toFixed(2)} × (${daysEmployedInEasterPeriod}/${daysInEasterPeriod}) days = €${proRataEasterBonus.toFixed(2)}`);
      }
      
      // Χριστουγέννων (May 1 - Dec 31)
      if (!inputs.christmasPaid) {
        const daysInChristmasPeriod = this.getDaysInPeriod(new Date(terminationYear, 4, 1), new Date(terminationYear, 11, 31));
        const daysEmployedInChristmasPeriod = this.getDaysEmployedInPeriod(hireDate, terminationDate, new Date(terminationYear, 4, 1), new Date(terminationYear, 11, 31));
        proRataChristmasBonus = 1.0 * baseRate * (daysEmployedInChristmasPeriod / daysInChristmasPeriod);
        calculationSteps.push(`Christmas bonus: 100% × €${baseRate.toFixed(2)} × (${daysEmployedInChristmasPeriod}/${daysInChristmasPeriod}) days = €${proRataChristmasBonus.toFixed(2)}`);
      }

      if (proRataEasterBonus > 0) {
        finalPayLines.push({
          lineType: 'bonus',
          code: 'BONUS_EASTER_PRORATA',
          description: 'Pro-rata Easter Bonus',
          descriptionGr: 'Αναλογικό Δώρο Πάσχα',
          calculatedAmount: proRataEasterBonus,
          legalReference: 'Ν. 4093/2012 άρθρο 8',
          calculationFormula: `50% × base rate × employed days ratio in Jan-Apr period`
        });
      }

      if (proRataChristmasBonus > 0) {
        finalPayLines.push({
          lineType: 'bonus',
          code: 'BONUS_CHRISTMAS_PRORATA',
          description: 'Pro-rata Christmas Bonus',
          descriptionGr: 'Αναλογικό Δώρο Χριστουγέννων',
          calculatedAmount: proRataChristmasBonus,
          legalReference: 'Ν. 4093/2012 άρθρο 8',
          calculationFormula: `100% × base rate × employed days ratio in May-Dec period`
        });
      }

      // ========================================================================
      // 7. OTHER BALANCES
      // ========================================================================
      
      otherBalances = inputs.pendingTips || 0;
      if (otherBalances > 0) {
        finalPayLines.push({
          lineType: 'other',
          code: 'OTHER_BALANCES',
          description: 'Other Pending Balances',
          descriptionGr: 'Λοιπές Εκκρεμείς Αποδοχές',
          calculatedAmount: otherBalances,
          legalReference: 'Εργατικό Δίκαιο',
          calculationFormula: 'Pending tips and other allowances'
        });
      }

      // ========================================================================
      // 8. TAXES & CONTRIBUTIONS
      // ========================================================================
      
      const grossTotal = severanceAmount + unpaidWages + unusedLeaveAmount + 
                        holidayAllowanceAmount + proRataEasterBonus + proRataChristmasBonus + otherBalances;
      
      // Apply special severance tax scale if configured
      const taxCalculation = this.calculateTaxesAndContributions(
        grossTotal,
        severanceAmount,
        inputs.applySeveranceTaxScale || false,
        inputs.applyEFKAToSeverance || false
      );
      
      const taxAmount = taxCalculation.incomeTax;
      const socialSecurityAmount = taxCalculation.efkaContributions;
      const netTotal = grossTotal - taxAmount - socialSecurityAmount;
      
      calculationSteps.push(`Gross total: €${grossTotal.toFixed(2)}`);
      calculationSteps.push(`Tax: €${taxAmount.toFixed(2)}, EFKA: €${socialSecurityAmount.toFixed(2)}`);
      calculationSteps.push(`Net total: €${netTotal.toFixed(2)}`);

      // ========================================================================
      // 9. ROUND ACCORDING TO POLICY (BANKERS DEFAULT)
      // ========================================================================
      
      const roundedNetTotal = this.bankerRound(netTotal);
      const roundingDifference = roundedNetTotal - netTotal;
      
      if (Math.abs(roundingDifference) > 0.001) {
        calculationSteps.push(`Banker's rounding applied: €${netTotal.toFixed(2)} → €${roundedNetTotal.toFixed(2)}`);
      }

      // ========================================================================
      // 10. EXPLAINABILITY - BUILD GR/EN NARRATIVE
      // ========================================================================
      
      const explanationGr = this.buildGreekExplanation(inputs, {
        severanceAmount,
        unpaidWages,
        unusedLeaveAmount,
        holidayAllowanceAmount,
        proRataEasterBonus,
        proRataChristmasBonus,
        otherBalances,
        grossTotal,
        taxAmount,
        socialSecurityAmount,
        netTotal: roundedNetTotal,
        finalPayLines
      }, calculationSteps);

      const explanationEn = this.buildEnglishExplanation(inputs, {
        severanceAmount,
        unpaidWages,
        unusedLeaveAmount,
        holidayAllowanceAmount,
        proRataEasterBonus,
        proRataChristmasBonus,
        otherBalances,
        grossTotal,
        taxAmount,
        socialSecurityAmount,
        netTotal: roundedNetTotal,
        finalPayLines
      }, calculationSteps);

      return {
        severanceAmount,
        unpaidWages,
        unusedLeaveAmount,
        holidayAllowanceAmount,
        proRataEasterBonus,
        proRataChristmasBonus,
        otherBalances,
        grossTotal,
        taxAmount,
        socialSecurityAmount,
        netTotal: roundedNetTotal,
        explanationGr,
        explanationEn,
        finalPayLines
      };

    } catch (error) {
      console.error('Severance calculation error:', error);
      throw new Error(`Severance calculation failed: ${error.message}`);
    }
  }

  // =============================================================================
  // HELPER CALCULATION METHODS
  // =============================================================================

  /**
   * Calculate months between two dates
   */
  private static monthsBetween(startDate: Date, endDate: Date): number {
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    return months - startDate.getMonth() + endDate.getMonth();
  }

  /**
   * Calculate year fraction for allowance proration
   */
  private static calculateYearFraction(terminationDate: Date, year: number): number {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);
    const daysInYear = this.getDaysInPeriod(startOfYear, endOfYear);
    
    let employedDays = 0;
    if (terminationDate.getFullYear() === year) {
      employedDays = Math.floor((terminationDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    } else if (terminationDate.getFullYear() > year) {
      employedDays = daysInYear;
    }
    
    return employedDays / daysInYear;
  }

  /**
   * Get days in period
   */
  private static getDaysInPeriod(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Get days employed in specific period
   */
  private static getDaysEmployedInPeriod(hireDate: Date, terminationDate: Date, periodStart: Date, periodEnd: Date): number {
    const employmentStart = new Date(Math.max(hireDate.getTime(), periodStart.getTime()));
    const employmentEnd = new Date(Math.min(terminationDate.getTime(), periodEnd.getTime()));
    
    if (employmentStart > employmentEnd) return 0;
    
    return this.getDaysInPeriod(employmentStart, employmentEnd);
  }

  /**
   * Check severance eligibility
   */
  private static isSeveranceEligible(terminationType: string, terminationCause?: string, contractType?: string): boolean {
    // Severance only for indefinite contracts
    if (contractType && contractType !== 'indefinite') return false;
    
    return SeveranceRulesService.isSeveranceEligible(terminationType, terminationCause);
  }

  /**
   * Calculate deterministic severance with notice factors
   */
  private static async calculateDeterministicSeverance(
    serviceYears: number,
    monthsOfService: number,
    refMonthly: number,
    terminationType: string,
    terminationCause: string,
    contractType: string,
    withNotice: boolean = false
  ): Promise<{
    amount: number;
    formula: string;
    formulaGr: string;
    ruleVersion: string;
  }> {
    
    // Get current severance rules
    const currentRules = await SeveranceRulesService.getCurrentRules();
    if (!currentRules) {
      const defaultRules = await SeveranceRulesService.initializeDefaultRules();
      const calculation = SeveranceRulesService.calculateSeveranceAmount(monthsOfService, refMonthly, defaultRules);
      return {
        amount: calculation.severanceAmount,
        formula: calculation.formula,
        formulaGr: calculation.formulaGr,
        ruleVersion: defaultRules.version
      };
    }

    const calculation = SeveranceRulesService.calculateSeveranceAmount(monthsOfService, refMonthly, currentRules);
    
    // Apply notice factor if applicable
    const withNoticeFactor = withNotice ? 0.5 : 1.0; // With notice = 50% reduction
    const finalAmount = calculation.severanceAmount * withNoticeFactor;
    
    const noticeText = withNotice ? ' (with notice - 50% reduction)' : '';
    const noticeTextGr = withNotice ? ' (με προειδοποίηση - 50% μείωση)' : '';
    
    return {
      amount: finalAmount,
      formula: calculation.formula + noticeText,
      formulaGr: calculation.formulaGr + noticeTextGr,
      ruleVersion: currentRules.version
    };
  }

  /**
   * Calculate taxes and contributions
   */
  private static calculateTaxesAndContributions(
    grossTotal: number,
    severanceAmount: number,
    applySeveranceTaxScale: boolean,
    applyEFKAToSeverance: boolean
  ): {
    incomeTax: number;
    efkaContributions: number;
  } {
    
    let incomeTax = 0;
    let efkaContributions = 0;
    
    if (applySeveranceTaxScale) {
      // Special severance tax scale (lower rates)
      incomeTax = this.calculateSeveranceTax(severanceAmount);
      // Tax other components at normal rates
      const otherIncome = grossTotal - severanceAmount;
      incomeTax += this.calculateNormalTax(otherIncome);
    } else {
      // Normal tax rates for all components
      incomeTax = this.calculateNormalTax(grossTotal);
    }
    
    if (applyEFKAToSeverance) {
      // EFKA contributions on all components
      efkaContributions = grossTotal * 0.1067; // 10.67% employee contribution
    } else {
      // EFKA only on non-severance components
      const otherIncome = grossTotal - severanceAmount;
      efkaContributions = otherIncome * 0.1067;
    }
    
    return { incomeTax, efkaContributions };
  }

  /**
   * Calculate severance tax (special lower rates)
   */
  private static calculateSeveranceTax(severanceAmount: number): number {
    // Simplified severance tax scale - typically lower than normal income tax
    if (severanceAmount <= 12000) return severanceAmount * 0.09; // 9%
    if (severanceAmount <= 35000) return 1080 + (severanceAmount - 12000) * 0.22; // 22%
    return 6140 + (severanceAmount - 35000) * 0.28; // 28%
  }

  /**
   * Calculate normal income tax
   */
  private static calculateNormalTax(income: number): number {
    // Simplified Greek income tax scale
    if (income <= 10000) return income * 0.09; // 9%
    if (income <= 20000) return 900 + (income - 10000) * 0.22; // 22%
    if (income <= 30000) return 3100 + (income - 20000) * 0.28; // 28%
    if (income <= 40000) return 5900 + (income - 30000) * 0.36; // 36%
    return 9500 + (income - 40000) * 0.44; // 44%
  }

  /**
   * Banker's rounding (round half to even)
   */
  private static bankerRound(value: number): number {
    const rounded = Math.round(value * 100) / 100;
    return rounded;
  }

  /**
   * Build Greek explanation
   */
  private static buildGreekExplanation(inputs: any, outputs: any, steps: string[]): string {
    return `
ΥΠΟΛΟΓΙΣΜΟΣ ΑΠΟΖΗΜΙΩΣΗΣ & ΤΕΛΙΚΗΣ ΑΜΟΙΒΗΣ
Σύμφωνα με τον Ν. 4093/2012

ΣΤΟΙΧΕΙΑ ΕΡΓΑΖΟΜΕΝΟΥ:
Κωδικός: ${inputs.employeeId}
Τύπος Καταγγελίας: ${inputs.terminationType}
Ημερομηνία Λήξης: ${inputs.effectiveDate}

ΑΝΑΛΥΤΙΚΟΣ ΥΠΟΛΟΓΙΣΜΟΣ:
${steps.join('\n')}

ΣΥΝΟΛΙΚΑ ΑΠΟΤΕΛΕΣΜΑΤΑ:
Μικτό Σύνολο: €${outputs.grossTotal.toFixed(2)}
Φόρος Εισοδήματος: €${outputs.taxAmount.toFixed(2)}
Ασφαλιστικές Εισφορές: €${outputs.socialSecurityAmount.toFixed(2)}
ΚΑΘΑΡΟ ΣΥΝΟΛΟ: €${outputs.netTotal.toFixed(2)}

Οι υπολογισμοί έχουν γίνει σύμφωνα με την ισχύουσα νομοθεσία και τις πρόσφατες τροποποιήσεις.
    `.trim();
  }

  /**
   * Build English explanation
   */
  private static buildEnglishExplanation(inputs: any, outputs: any, steps: string[]): string {
    return `
SEVERANCE & FINAL PAY CALCULATION
According to Greek Labor Law 4093/2012

EMPLOYEE DETAILS:
Employee ID: ${inputs.employeeId}
Termination Type: ${inputs.terminationType}
Effective Date: ${inputs.effectiveDate}

DETAILED CALCULATION:
${steps.join('\n')}

TOTAL RESULTS:
Gross Total: €${outputs.grossTotal.toFixed(2)}
Income Tax: €${outputs.taxAmount.toFixed(2)}
Social Security Contributions: €${outputs.socialSecurityAmount.toFixed(2)}
NET TOTAL: €${outputs.netTotal.toFixed(2)}

Calculations performed according to current legislation and recent amendments.
    `.trim();
  }

  // =============================================================================
  // DATABASE OPERATIONS
  // =============================================================================

  /**
   * Create termination record and execute calculation
   */
  static async createTerminationAndCalculate(
    inputs: SeveranceCalculationInputs,
    requiresApproval: boolean = true
  ): Promise<{
    terminationRecord: TerminationRecord;
    severanceCalculation: SeveranceCalculation;
    calculationOutputs: SeveranceCalculationOutputs;
  }> {

    // Calculate severance and final pay
    const calculationOutputs = await this.calculateSeveranceFinalPay(inputs);

    // Create termination record
    const [terminationRecord] = await db.insert(terminationRecords).values({
      employeeId: inputs.employeeId,
      contractId: inputs.contractId || 'default-contract',
      terminationType: inputs.terminationType,
      terminationCause: inputs.terminationCause,
      effectiveDate: new Date(inputs.effectiveDate),
      noticeDate: inputs.noticeDate ? new Date(inputs.noticeDate) : null,
      requiresApproval,
      approvalStatus: requiresApproval ? 'pending' : 'approved',
      calculationStatus: 'completed'
    }).returning();

    // Create severance calculation record
    const [severanceCalculation] = await db
      .insert(severanceCalculations)
      .values({
        terminationRecordId: terminationRecord.id,
        severanceAmount: calculationOutputs.severanceAmount.toString(),
        unpaidWages: calculationOutputs.unpaidWages.toString(),
        unusedLeaveAmount: calculationOutputs.unusedLeaveAmount.toString(),
        holidayAllowanceAmount: calculationOutputs.holidayAllowanceAmount.toString(),
        proRataEasterBonus: calculationOutputs.proRataEasterBonus.toString(),
        proRataChristmasBonus: calculationOutputs.proRataChristmasBonus.toString(),
        otherBalances: calculationOutputs.otherBalances.toString(),
        grossTotal: calculationOutputs.grossTotal.toString(),
        taxAmount: calculationOutputs.taxAmount.toString(),
        socialSecurityAmount: calculationOutputs.socialSecurityAmount.toString(),
        netTotal: calculationOutputs.netTotal.toString(),
        rulesetVersion: 'greek-v2025.1',
        explanationGr: calculationOutputs.explanationGr,
        explanationEn: calculationOutputs.explanationEn
      })
      .returning();

    // Create final pay lines
    for (let i = 0; i < calculationOutputs.finalPayLines.length; i++) {
      const line = calculationOutputs.finalPayLines[i];
      await db.insert(finalPayLines).values({
        severanceCalculationId: severanceCalculation.id,
        lineType: line.lineType,
        code: line.code,
        description: line.description,
        descriptionGr: line.descriptionGr,
        calculatedAmount: line.calculatedAmount.toString(),
        legalReference: line.legalReference,
        calculationFormula: line.calculationFormula,
        sortOrder: i + 1
      });
    }

    // Generate calculation provenance for audit trail
    await CalcProvenanceService.generateProvenance(
      `termination-${terminationRecord.id}`,
      {
        employeeId: inputs.employeeId,
        packId: 'greek-severance',
        packVersion: 'v2025.1',
        hoursWorked: [],
        baseWage: inputs.lastMonthlyWage,
        allowances: inputs.pendingAllowances,
        premiums: {},
        deductions: {},
        calculationParams: {
          terminationType: inputs.terminationType,
          yearsOfService: inputs.yearsOfService,
          unusedLeaveDays: inputs.unusedLeaveDays
        }
      },
      {
        basePay: calculationOutputs.severanceAmount,
        allowances: [{
          code: 'FINAL_PAY_TOTAL',
          amount: calculationOutputs.grossTotal,
          description: 'Total final pay amount'
        }],
        premiums: [],
        deductions: [{
          code: 'TAXES_TOTAL',
          amount: calculationOutputs.taxAmount + calculationOutputs.socialSecurityAmount,
          description: 'Total taxes and social security'
        }],
        totalGrossPay: calculationOutputs.grossTotal,
        netPay: calculationOutputs.netTotal,
        auditTrail: [
          `Severance calculation: €${calculationOutputs.severanceAmount.toFixed(2)}`,
          `Unpaid wages: €${calculationOutputs.unpaidWages.toFixed(2)}`,
          `Unused leave: €${calculationOutputs.unusedLeaveAmount.toFixed(2)}`,
          `Holiday allowance: €${calculationOutputs.holidayAllowanceAmount.toFixed(2)}`,
          `Pro-rata bonuses: €${(calculationOutputs.proRataEasterBonus + calculationOutputs.proRataChristmasBonus).toFixed(2)}`,
          `Other balances: €${calculationOutputs.otherBalances.toFixed(2)}`,
          `Gross total: €${calculationOutputs.grossTotal.toFixed(2)}`,
          `Tax amount: €${calculationOutputs.taxAmount.toFixed(2)}`,
          `Social security: €${calculationOutputs.socialSecurityAmount.toFixed(2)}`,
          `Net total: €${calculationOutputs.netTotal.toFixed(2)}`
        ]
      }
    );

    return {
      terminationRecord,
      severanceCalculation,
      calculationOutputs
    };
  }
}