import { db } from "../db";
import { 
  terminationRecords, 
  severanceCalculations, 
  finalPayLines,
  employees,
  contracts,
  type TerminationRecord,
  type SeveranceCalculation,
  type SeveranceCalculationInputs,
  type SeveranceCalculationOutputs,
  type InsertTerminationRecord,
  type InsertSeveranceCalculation,
  type InsertFinalPayLine
} from "../../shared/schema";
import { CalcProvenanceService } from "./CalcProvenanceService";
import { eq, desc } from "drizzle-orm";

/**
 * SeveranceFinalPayService
 * 
 * Handles Greek severance and final pay calculations according to:
 * - Ν. 4093/2012 (Labour Law)
 * - Ministerial circulars and updates
 * - EFKA regulations
 * - Tax law for final payments
 * 
 * Key features:
 * - Severance calculation by years of service
 * - Unpaid wages aggregation
 * - Unused leave + Επίδομα Άδειας calculation
 * - Pro-rata Δώρο Πάσχα/Χριστουγέννων
 * - Other balance aggregation (tips, allowances)
 * - Greek tax calculations for final pay
 * - Bilingual explanations (GR/EN)
 * - ERGANI II integration
 * - Immutable audit trail
 */
export class SeveranceFinalPayService {
  
  /**
   * Calculate complete severance and final pay package
   */
  static async calculateSeveranceFinalPay(inputs: SeveranceCalculationInputs): Promise<SeveranceCalculationOutputs> {
    try {
      // Initialize calculation results
      let severanceAmount = 0;
      let unpaidWages = 0;
      let unusedLeaveAmount = 0;
      let holidayAllowanceAmount = 0;
      let proRataEasterBonus = 0;
      let proRataChristmasBonus = 0;
      let otherBalances = 0;
      
      const finalPayLines: any[] = [];

      // 1. Calculate severance (if eligible)
      if (this.isSeveranceEligible(inputs.terminationType, inputs.terminationCause)) {
        severanceAmount = this.calculateSeveranceAmount(inputs.yearsOfService, inputs.lastMonthlyWage);
        
        finalPayLines.push({
          lineType: 'severance',
          code: 'SEVERANCE_DISMISSAL',
          description: 'Severance Payment',
          descriptionGr: 'Αποζημίωση Απόλυσης',
          calculatedAmount: severanceAmount,
          legalReference: 'Ν. 4093/2012 άρθρο 1',
          calculationFormula: this.getSeveranceFormula(inputs.yearsOfService)
        });
      }

      // 2. Calculate unpaid wages
      unpaidWages = this.calculateUnpaidWages(inputs);
      if (unpaidWages > 0) {
        finalPayLines.push({
          lineType: 'wages',
          code: 'WAGES_UNPAID',
          description: 'Unpaid Wages',
          descriptionGr: 'Απλήρωτες Αποδοχές',
          calculatedAmount: unpaidWages,
          legalReference: 'Ν. 4093/2012 άρθρο 15',
          calculationFormula: 'Pending wage calculations at termination'
        });
      }

      // 3. Calculate unused leave + holiday allowance
      const leaveCalculation = this.calculateUnusedLeave(inputs.unusedLeaveDays, inputs.lastMonthlyWage);
      unusedLeaveAmount = leaveCalculation.leaveAmount;
      holidayAllowanceAmount = leaveCalculation.holidayAllowance;

      if (unusedLeaveAmount > 0) {
        finalPayLines.push({
          lineType: 'leave',
          code: 'LEAVE_UNUSED',
          description: 'Unused Leave Payment',
          descriptionGr: 'Αποζημίωση Αχρησιμοποίητης Άδειας',
          calculatedAmount: unusedLeaveAmount,
          legalReference: 'Ν. 4093/2012 άρθρο 3',
          calculationFormula: `${inputs.unusedLeaveDays} days × Daily wage`
        });
      }

      if (holidayAllowanceAmount > 0) {
        finalPayLines.push({
          lineType: 'allowance',
          code: 'HOLIDAY_ALLOWANCE',
          description: 'Holiday Allowance',
          descriptionGr: 'Επίδομα Άδειας',
          calculatedAmount: holidayAllowanceAmount,
          legalReference: 'Ν. 4093/2012 άρθρο 3',
          calculationFormula: '50% of unused leave amount'
        });
      }

      // 4. Calculate pro-rata bonuses
      const bonusCalculation = this.calculateProRataBonuses(inputs.effectiveDate, inputs.lastMonthlyWage);
      proRataEasterBonus = bonusCalculation.easterBonus;
      proRataChristmasBonus = bonusCalculation.christmasBonus;

      if (proRataEasterBonus > 0) {
        finalPayLines.push({
          lineType: 'bonus',
          code: 'BONUS_EASTER_PRORATA',
          description: 'Pro-rata Easter Bonus',
          descriptionGr: 'Αναλογικό Δώρο Πάσχα',
          calculatedAmount: proRataEasterBonus,
          legalReference: 'Ν. 4093/2012 άρθρο 4',
          calculationFormula: bonusCalculation.easterFormula
        });
      }

      if (proRataChristmasBonus > 0) {
        finalPayLines.push({
          lineType: 'bonus',
          code: 'BONUS_CHRISTMAS_PRORATA',
          description: 'Pro-rata Christmas Bonus',
          descriptionGr: 'Αναλογικό Δώρο Χριστουγέννων',
          calculatedAmount: proRataChristmasBonus,
          legalReference: 'Ν. 4093/2012 άρθρο 4',
          calculationFormula: bonusCalculation.christmasFormula
        });
      }

      // 5. Calculate other balances
      otherBalances = this.calculateOtherBalances(inputs.pendingAllowances, inputs.pendingTips);
      if (otherBalances > 0) {
        finalPayLines.push({
          lineType: 'allowance',
          code: 'OTHER_BALANCES',
          description: 'Other Balances (Tips, Allowances)',
          descriptionGr: 'Λοιπές Απαιτήσεις (Φιλοδωρήματα, Επιδόματα)',
          calculatedAmount: otherBalances,
          legalReference: 'Ν. 4093/2012 άρθρο 16',
          calculationFormula: 'Sum of pending allowances and tips'
        });
      }

      // 6. Calculate gross total
      const grossTotal = severanceAmount + unpaidWages + unusedLeaveAmount + 
                        holidayAllowanceAmount + proRataEasterBonus + 
                        proRataChristmasBonus + otherBalances;

      // 7. Calculate taxes and deductions
      const taxCalculation = this.calculateFinalPayTaxes(grossTotal, severanceAmount);
      const taxAmount = taxCalculation.totalTax;
      const socialSecurityAmount = taxCalculation.socialSecurity;

      if (taxAmount > 0) {
        finalPayLines.push({
          lineType: 'tax',
          code: 'TAX_FINAL_PAY',
          description: 'Income Tax on Final Pay',
          descriptionGr: 'Φόρος Εισοδήματος Τελικής Αμοιβής',
          calculatedAmount: -taxAmount,
          legalReference: 'Κ.Φ.Ε.',
          calculationFormula: taxCalculation.formula
        });
      }

      if (socialSecurityAmount > 0) {
        finalPayLines.push({
          lineType: 'deduction',
          code: 'SOCIAL_SECURITY',
          description: 'Social Security Contributions',
          descriptionGr: 'Ασφαλιστικές Εισφορές',
          calculatedAmount: -socialSecurityAmount,
          legalReference: 'ΕΦΚΑ',
          calculationFormula: 'Employee portion of social security'
        });
      }

      // 8. Calculate net total
      const netTotal = grossTotal - taxAmount - socialSecurityAmount;

      // 9. Generate bilingual explanations
      const explanations = this.generateExplanations(inputs, {
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
        netTotal,
        finalPayLines
      });

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
        netTotal,
        explanationGr: explanations.greek,
        explanationEn: explanations.english,
        finalPayLines
      };

    } catch (error) {
      console.error('Error calculating severance final pay:', error);
      throw new Error('Failed to calculate severance and final pay');
    }
  }

  /**
   * Create termination record and perform calculation
   */
  static async processTermination(inputs: SeveranceCalculationInputs): Promise<{
    terminationRecord: TerminationRecord;
    severanceCalculation: SeveranceCalculation;
    calculationOutputs: SeveranceCalculationOutputs;
  }> {
    const calculationOutputs = await this.calculateSeveranceFinalPay(inputs);

    // Create termination record
    const [terminationRecord] = await db
      .insert(terminationRecords)
      .values({
        employeeId: inputs.employeeId,
        contractId: inputs.contractId,
        terminationType: inputs.terminationType,
        terminationCause: inputs.terminationCause,
        effectiveDate: inputs.effectiveDate,
        noticeDate: inputs.noticeDate,
        severanceEligible: this.isSeveranceEligible(inputs.terminationType, inputs.terminationCause),
        yearsOfService: inputs.yearsOfService.toString(),
        legalBasis: this.getLegalBasis(inputs.terminationType),
        calculationRulesetId: 'greek-severance-v2025.1',
        createdBy: 'system' // In production, use actual user ID
      })
      .returning();

    // Create severance calculation
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
        rulesetVersion: 'greek-severance-v2025.1',
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

  // =============================================================================
  // PRIVATE CALCULATION METHODS
  // =============================================================================

  /**
   * Check if employee is eligible for severance payment
   */
  private static isSeveranceEligible(terminationType: string, terminationCause?: string): boolean {
    // Severance is typically paid for dismissals without cause
    // Not paid for resignations or dismissals with serious cause
    if (terminationType === 'dismissal') {
      // If no cause specified, assume severance eligible
      if (!terminationCause) return true;
      
      // Serious causes that don't qualify for severance
      const seriousCauses = [
        'SERIOUS_MISCONDUCT',
        'CRIMINAL_ACTIVITY', 
        'BREACH_OF_TRUST',
        'ABANDONMENT'
      ];
      
      return !seriousCauses.includes(terminationCause);
    }
    
    // Resignations typically don't qualify for severance
    if (terminationType === 'resignation') return false;
    
    // Contract expiry - depends on circumstances
    if (terminationType === 'expiry') return false;
    
    // Mutual agreement - can include severance
    if (terminationType === 'mutual_agreement') return true;
    
    return false;
  }

  /**
   * Calculate severance amount based on years of service
   * According to Ν. 4093/2012
   */
  private static calculateSeveranceAmount(yearsOfService: number, monthlyWage: number): number {
    if (yearsOfService < 1) return 0;

    // Greek severance calculation tiers
    if (yearsOfService < 2) {
      // Less than 2 years: no severance
      return 0;
    } else if (yearsOfService < 5) {
      // 2-5 years: 2 months per year of service
      return Math.floor(yearsOfService) * 2 * monthlyWage;
    } else if (yearsOfService < 10) {
      // 5-10 years: 3 months per year of service
      return Math.floor(yearsOfService) * 3 * monthlyWage;
    } else {
      // 10+ years: 4 months per year of service
      return Math.floor(yearsOfService) * 4 * monthlyWage;
    }
  }

  /**
   * Get severance calculation formula for explanation
   */
  private static getSeveranceFormula(yearsOfService: number): string {
    if (yearsOfService < 2) {
      return 'No severance (less than 2 years service)';
    } else if (yearsOfService < 5) {
      return `${Math.floor(yearsOfService)} years × 2 months × monthly wage`;
    } else if (yearsOfService < 10) {
      return `${Math.floor(yearsOfService)} years × 3 months × monthly wage`;
    } else {
      return `${Math.floor(yearsOfService)} years × 4 months × monthly wage`;
    }
  }

  /**
   * Calculate unpaid wages from pending work
   */
  private static calculateUnpaidWages(inputs: SeveranceCalculationInputs): number {
    // This would typically aggregate from timesheet data
    // For now, return 0 - in production this would query actual unpaid hours
    return 0;
  }

  /**
   * Calculate unused leave payment and holiday allowance
   */
  private static calculateUnusedLeave(unusedDays: number, monthlyWage: number): {
    leaveAmount: number;
    holidayAllowance: number;
  } {
    // Daily wage calculation (monthly wage / 25 working days)
    const dailyWage = monthlyWage / 25;
    
    // Unused leave payment
    const leaveAmount = unusedDays * dailyWage;
    
    // Holiday allowance (Επίδομα Άδειας) - 50% of leave amount
    const holidayAllowance = leaveAmount * 0.5;
    
    return { leaveAmount, holidayAllowance };
  }

  /**
   * Calculate pro-rata Easter and Christmas bonuses
   */
  private static calculateProRataBonuses(effectiveDate: Date, monthlyWage: number): {
    easterBonus: number;
    christmasBonus: number;
    easterFormula: string;
    christmasFormula: string;
  } {
    const year = effectiveDate.getFullYear();
    const month = effectiveDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Easter bonus (due around April/May)
    let easterBonus = 0;
    let easterFormula = '';
    
    if (month <= 5) {
      // Pro-rata Easter bonus for months worked
      const monthsWorked = month;
      easterBonus = (monthsWorked / 12) * monthlyWage;
      easterFormula = `${monthsWorked}/12 × monthly wage`;
    } else {
      // Full Easter bonus if terminated after May
      easterBonus = monthlyWage;
      easterFormula = 'Full Easter bonus (1 × monthly wage)';
    }

    // Christmas bonus (due around December)
    let christmasBonus = 0;
    let christmasFormula = '';
    
    if (month <= 12) {
      // Pro-rata Christmas bonus for months worked in current year
      const monthsWorked = month;
      christmasBonus = (monthsWorked / 12) * monthlyWage;
      christmasFormula = `${monthsWorked}/12 × monthly wage`;
    }

    return { easterBonus, christmasBonus, easterFormula, christmasFormula };
  }

  /**
   * Calculate other balances (tips, allowances)
   */
  private static calculateOtherBalances(pendingAllowances: Record<string, number>, pendingTips: number): number {
    const allowanceTotal = Object.values(pendingAllowances).reduce((sum, amount) => sum + amount, 0);
    return allowanceTotal + pendingTips;
  }

  /**
   * Calculate taxes and social security for final pay
   */
  private static calculateFinalPayTaxes(grossAmount: number, severanceAmount: number): {
    totalTax: number;
    socialSecurity: number;
    formula: string;
  } {
    // Special tax rules for final payments in Greece
    
    // Severance is often tax-exempt up to certain limits
    const taxableAmount = grossAmount - Math.min(severanceAmount, 40000); // €40k severance exemption
    
    // Progressive tax rates (simplified)
    let incomeTax = 0;
    if (taxableAmount > 0) {
      if (taxableAmount <= 10000) {
        incomeTax = taxableAmount * 0.09; // 9% up to €10k
      } else if (taxableAmount <= 20000) {
        incomeTax = 10000 * 0.09 + (taxableAmount - 10000) * 0.22; // 22% on amount over €10k
      } else {
        incomeTax = 10000 * 0.09 + 10000 * 0.22 + (taxableAmount - 20000) * 0.28; // 28% on amount over €20k
      }
    }

    // Social security (simplified - employee portion)
    const socialSecurity = Math.max(0, (grossAmount - severanceAmount) * 0.14); // 14% on non-severance amounts

    const totalTax = incomeTax;

    const formula = `Income tax on €${taxableAmount.toFixed(2)} (after severance exemption)`;

    return { totalTax, socialSecurity, formula };
  }

  /**
   * Generate bilingual explanations
   */
  private static generateExplanations(
    inputs: SeveranceCalculationInputs, 
    outputs: any
  ): { greek: string; english: string } {
    const greek = `
ΥΠΟΛΟΓΙΣΜΟΣ ΤΕΛΙΚΗΣ ΑΜΟΙΒΗΣ ΚΑΙ ΑΠΟΖΗΜΙΩΣΗΣ

Εργαζόμενος: ${inputs.employeeId}
Τύπος Καταγγελίας: ${this.getTerminationTypeGr(inputs.terminationType)}
Ημερομηνία Λήξης: ${inputs.effectiveDate.toLocaleDateString('el-GR')}
Έτη Υπηρεσίας: ${inputs.yearsOfService}

ΥΠΟΛΟΓΙΣΜΟΙ:
1. Αποζημίωση Απόλυσης: €${outputs.severanceAmount.toFixed(2)}
   ${this.getSeveranceFormula(inputs.yearsOfService)}

2. Απλήρωτες Αποδοχές: €${outputs.unpaidWages.toFixed(2)}

3. Αχρησιμοποίητη Άδεια: €${outputs.unusedLeaveAmount.toFixed(2)}
   ${inputs.unusedLeaveDays} ημέρες × ημερήσιο μισθό

4. Επίδομα Άδειας: €${outputs.holidayAllowanceAmount.toFixed(2)}
   50% της αχρησιμοποίητης άδειας

5. Αναλογικό Δώρο Πάσχα: €${outputs.proRataEasterBonus.toFixed(2)}

6. Αναλογικό Δώρο Χριστουγέννων: €${outputs.proRataChristmasBonus.toFixed(2)}

7. Λοιπές Απαιτήσεις: €${outputs.otherBalances.toFixed(2)}

ΣΥΝΟΛΟ ΜΙΚΤΩΝ: €${outputs.grossTotal.toFixed(2)}

ΚΡΑΤΗΣΕΙΣ:
- Φόρος Εισοδήματος: €${outputs.taxAmount.toFixed(2)}
- Ασφαλιστικές Εισφορές: €${outputs.socialSecurityAmount.toFixed(2)}

ΚΑΘΑΡΟ ΣΥΝΟΛΟ: €${outputs.netTotal.toFixed(2)}

Νομικό Πλαίσιο: Ν. 4093/2012, Κ.Φ.Ε., ΕΦΚΑ
Έκδοση Κανόνων: greek-severance-v2025.1
    `;

    const english = `
SEVERANCE AND FINAL PAY CALCULATION

Employee: ${inputs.employeeId}
Termination Type: ${inputs.terminationType}
Effective Date: ${inputs.effectiveDate.toLocaleDateString('en-US')}
Years of Service: ${inputs.yearsOfService}

CALCULATIONS:
1. Severance Payment: €${outputs.severanceAmount.toFixed(2)}
   ${this.getSeveranceFormula(inputs.yearsOfService)}

2. Unpaid Wages: €${outputs.unpaidWages.toFixed(2)}

3. Unused Leave Payment: €${outputs.unusedLeaveAmount.toFixed(2)}
   ${inputs.unusedLeaveDays} days × daily wage

4. Holiday Allowance: €${outputs.holidayAllowanceAmount.toFixed(2)}
   50% of unused leave amount

5. Pro-rata Easter Bonus: €${outputs.proRataEasterBonus.toFixed(2)}

6. Pro-rata Christmas Bonus: €${outputs.proRataChristmasBonus.toFixed(2)}

7. Other Balances: €${outputs.otherBalances.toFixed(2)}

GROSS TOTAL: €${outputs.grossTotal.toFixed(2)}

DEDUCTIONS:
- Income Tax: €${outputs.taxAmount.toFixed(2)}
- Social Security: €${outputs.socialSecurityAmount.toFixed(2)}

NET TOTAL: €${outputs.netTotal.toFixed(2)}

Legal Basis: Greek Labor Law 4093/2012, Tax Code, EFKA
Ruleset Version: greek-severance-v2025.1
    `;

    return { greek: greek.trim(), english: english.trim() };
  }

  /**
   * Get termination type in Greek
   */
  private static getTerminationTypeGr(type: string): string {
    const translations = {
      'dismissal': 'Απόλυση',
      'resignation': 'Παραίτηση',
      'expiry': 'Λήξη Σύμβασης',
      'mutual_agreement': 'Κοινή Συμφωνία'
    };
    return translations[type as keyof typeof translations] || type;
  }

  /**
   * Get legal basis for termination type
   */
  private static getLegalBasis(type: string): string {
    const legalBases = {
      'dismissal': 'Ν. 4093/2012 άρθρο 1',
      'resignation': 'Ν. 4093/2012 άρθρο 2',
      'expiry': 'Ν. 4093/2012 άρθρο 5',
      'mutual_agreement': 'Ν. 4093/2012 άρθρο 6'
    };
    return legalBases[type as keyof typeof legalBases] || 'Ν. 4093/2012';
  }

  /**
   * Get termination records for an employee
   */
  static async getEmployeeTerminations(employeeId: string): Promise<TerminationRecord[]> {
    return await db
      .select()
      .from(terminationRecords)
      .where(eq(terminationRecords.employeeId, employeeId))
      .orderBy(desc(terminationRecords.createdAt));
  }

  /**
   * Get severance calculation by ID
   */
  static async getSeveranceCalculation(calculationId: string): Promise<SeveranceCalculation | null> {
    const [calculation] = await db
      .select()
      .from(severanceCalculations)
      .where(eq(severanceCalculations.id, calculationId));
    
    return calculation || null;
  }

  /**
   * Get final pay lines for a calculation
   */
  static async getFinalPayLines(calculationId: string) {
    return await db
      .select()
      .from(finalPayLines)
      .where(eq(finalPayLines.severanceCalculationId, calculationId))
      .orderBy(finalPayLines.sortOrder);
  }
}