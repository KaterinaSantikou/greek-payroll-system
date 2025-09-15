/**
 * Greek Payroll Calculator - Business Logic
 *
 * Contains pure payroll calculation logic using domain rules.
 * No database access or external dependencies.
 */

import {
  GREEK_TAX_BRACKETS,
  EFKA_RATES,
  SOLIDARITY_TAX_BRACKETS,
  MINIMUM_WAGE,
  WORKING_TIME_LIMITS,
  TAX_FREE_LIMITS,
  TIPS_TAX_RULES,
} from '../domain/greek-labor-law';

import {
  GREEK_BONUSES,
  PREMIUM_RATES,
  SEVERANCE_PAY_RULES,
  LEAVE_ENTITLEMENTS,
  BENEFITS_IN_KIND,
  CONTRACT_TYPE_RULES,
} from '../domain/payroll-rules';

export interface PayrollCalculationInput {
  employeeId: string;
  periodId: string;
  baseSalary: number;
  hourlyRate?: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  sundayHours: number;
  holidayHours: number;
  leaveHours?: {
    annual?: number;
    sick?: number;
    maternity?: number;
    paternity?: number;
  };
  allowances?: {
    food?: number;
    transport?: number;
    housing?: number;
    marriage?: number;
    family?: number;
    education?: number;
    experience?: number;
    position?: number;
  };
  tips?: number;
  benefitsInKind?: {
    mealVouchers?: number;
    companyCar?: number;
    housing?: number;
  };
  contractType: 'indefinite' | 'fixed-term' | 'seasonal';
  isFullTime: boolean;
  employmentStartDate: Date;
  periodStartDate: Date;
  periodEndDate: Date;
}

export interface PayrollCalculationResult {
  employeeId: string;
  periodId: string;

  // Gross Pay Components
  baseSalary: number;
  regularPay: number;
  overtimeAmount: number;
  nightPremium: number;
  sundayPremium: number;
  holidayPremium: number;

  // Allowances
  totalAllowances: number;
  allowancesBreakdown: Record<string, number>;

  // Greek Bonuses (Δώρα)
  christmasBonus: number;
  easterBonus: number;
  vacationBonus: number;
  totalBonuses: number;

  // Leave Pay
  paidLeave: number;
  sickPay: number;
  maternityPay: number;
  paternityPay: number;
  totalLeavePay: number;

  // Benefits
  taxFreeBenefits: number;
  taxableBenefits: number;
  imputedIncome: number;

  // Tips
  totalTips: number;
  tipsTax: number;
  netTips: number;

  // Totals
  grossPay: number;
  taxableIncome: number;

  // Deductions
  incomeTax: number;
  solidarityTax: number;
  employeeEfkaMain: number;
  employeeEfkaAux: number;
  employeeUnemployment: number;
  totalDeductions: number;

  // Employer Costs
  employerEfkaMain: number;
  employerEfkaAux: number;
  employerUnemployment: number;
  employerSickness: number;
  employerWorkAccident: number;
  totalEmployerCost: number;

  // Final Amount
  netPay: number;

  // Metadata
  calculationDate: Date;
  calculationVersion: string;
}

export class PayrollCalculator {
  /**
   * Calculate Greek income tax based on progressive brackets
   */
  calculateIncomeTax(annualTaxableIncome: number): number {
    let tax = 0;

    for (const bracket of GREEK_TAX_BRACKETS) {
      const taxableInBracket = Math.min(
        Math.max(0, annualTaxableIncome - bracket.min),
        bracket.max - bracket.min
      );

      tax += taxableInBracket * bracket.rate;

      if (annualTaxableIncome <= bracket.max) break;
    }

    return tax;
  }

  /**
   * Calculate special solidarity tax
   */
  calculateSolidarityTax(annualTaxableIncome: number): number {
    let tax = 0;

    for (const bracket of SOLIDARITY_TAX_BRACKETS) {
      const taxableInBracket = Math.min(
        Math.max(0, annualTaxableIncome - bracket.min),
        bracket.max - bracket.min
      );

      tax += taxableInBracket * bracket.rate;

      if (annualTaxableIncome <= bracket.max) break;
    }

    return tax;
  }

  /**
   * Calculate EFKA social security contributions
   */
  calculateEfkaContributions(grossPay: number): {
    employee: {
      main: number;
      auxiliary: number;
      unemployment: number;
      total: number;
    };
    employer: {
      main: number;
      auxiliary: number;
      unemployment: number;
      sickness: number;
      workAccident: number;
      total: number;
    };
  } {
    const employee = {
      main: grossPay * EFKA_RATES.employee.main,
      auxiliary: grossPay * EFKA_RATES.employee.auxiliary,
      unemployment: grossPay * EFKA_RATES.employee.unemployment,
      total: 0,
    };
    employee.total = employee.main + employee.auxiliary + employee.unemployment;

    const employer = {
      main: grossPay * EFKA_RATES.employer.main,
      auxiliary: grossPay * EFKA_RATES.employer.auxiliary,
      unemployment: grossPay * EFKA_RATES.employer.unemployment,
      sickness: grossPay * EFKA_RATES.employer.sickness,
      workAccident: grossPay * EFKA_RATES.employer.workAccident,
      total: 0,
    };
    employer.total =
      employer.main +
      employer.auxiliary +
      employer.unemployment +
      employer.sickness +
      employer.workAccident;

    return { employee, employer };
  }

  /**
   * Calculate Greek bonuses with pro-ration
   */
  calculateGreekBonuses(
    baseSalary: number,
    startDate: Date,
    endDate: Date,
    isFullTime: boolean,
    contractType: 'indefinite' | 'fixed-term' | 'seasonal'
  ): { christmas: number; easter: number; vacation: number } {
    const monthsWorked = this.calculateMonthsWorked(startDate, endDate);
    const proRationFactor = Math.min(monthsWorked / 12, 1);

    // Apply contract type reduction for seasonal workers
    const contractFactor =
      contractType === 'seasonal'
        ? CONTRACT_TYPE_RULES.seasonal.bonusReduction
        : 1;

    return {
      christmas:
        baseSalary *
        GREEK_BONUSES.christmas.fullTimeMonthly *
        proRationFactor *
        contractFactor,
      easter:
        baseSalary *
        GREEK_BONUSES.easter.fullTimeMonthly *
        proRationFactor *
        contractFactor,
      vacation:
        baseSalary *
        GREEK_BONUSES.vacation.fullTimeMonthly *
        proRationFactor *
        contractFactor,
    };
  }

  /**
   * Calculate overtime premiums according to Greek Labor Law (P.D. 156/1994)
   * 
   * LEGAL BASIS:
   * - Presidential Decree 156/1994, Article 1: Overtime compensation rates
   * - Working Time Directive implementation for Greece
   * - 3-tier progressive overtime system to discourage excessive overtime
   * 
   * OVERTIME TIER SYSTEM (P.D. 156/1994, Article 1):
   * - Tier 1: First 2 hours = 25% premium (1.25x normal rate)
   * - Tier 2: Hours 3-4 = 50% premium (1.50x normal rate)  
   * - Tier 3: Beyond 4 hours = 75% premium (1.75x normal rate)
   * 
   * PREMIUM WORK CONDITIONS:
   * - Night work (22:00-06:00): 25% premium, stackable with overtime
   * - Sunday work: 75% premium, maximum 2 Sundays/month without consent
   * - Holiday work: 100% premium (double pay), compensatory rest required
   * 
   * CALCULATION METHODOLOGY:
   * - Base hourly rate = Monthly salary ÷ 160 standard hours
   * - Each premium type calculated separately and can stack
   * - All premiums paid in addition to regular hourly rate
   */
  calculateOvertimePremiums(
    baseSalary: number,
    regularHours: number,
    overtimeHours: number,
    nightHours: number,
    sundayHours: number,
    holidayHours: number
  ): {
    overtimeAmount: number;
    nightPremium: number;
    sundayPremium: number;
    holidayPremium: number;
  } {
    // Standard monthly hours per Greek labor law (160 hours = 8 hours × 20 working days)
    const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;

    // OVERTIME TIER CALCULATION (P.D. 156/1994)
    // Tier 1: First 2 hours at 25% premium (encouraging minimal overtime)
    const tier1Hours = Math.min(overtimeHours, 2);
    
    // Tier 2: Hours 3-4 at 50% premium (discouraging extended overtime)
    const tier2Hours = Math.min(Math.max(overtimeHours - 2, 0), 2);
    
    // Tier 3: Beyond 4 hours at 75% premium (heavily discouraging excessive overtime)
    const tier3Hours = Math.max(overtimeHours - 4, 0);

    // Total overtime compensation using progressive tier system
    // Each tier multiplied by base hourly rate and respective premium percentage
    const overtimeAmount =
      tier1Hours * hourlyRate * PREMIUM_RATES.overtime.tier1 +  // 1.25x
      tier2Hours * hourlyRate * PREMIUM_RATES.overtime.tier2 +  // 1.50x
      tier3Hours * hourlyRate * PREMIUM_RATES.overtime.tier3;   // 1.75x

    // NIGHT SHIFT PREMIUM (P.D. 156/1994, Article 4)
    // 25% premium for work between 22:00-06:00
    // Can stack with overtime premiums (night overtime gets both premiums)
    const nightPremium = nightHours * hourlyRate * PREMIUM_RATES.night;

    // SUNDAY WORK PREMIUM (P.D. 156/1994, Article 6)  
    // 75% premium for Sunday work
    // Legal limit: Maximum 2 Sundays per month without employee written consent
    // Does not stack with overtime (Sunday overtime uses overtime rates only)
    const sundayPremium = sundayHours * hourlyRate * PREMIUM_RATES.sunday;

    // HOLIDAY WORK PREMIUM (P.D. 156/1994, Article 7)
    // 100% premium (double pay) for work on public holidays
    // Mandatory compensatory rest day must be provided within following month
    // Holiday work requires prior written employee consent
    const holidayPremium = holidayHours * hourlyRate * PREMIUM_RATES.holiday;

    return {
      overtimeAmount,
      nightPremium,
      sundayPremium,
      holidayPremium,
    };
  }

  /**
   * Calculate leave pay
   */
  calculateLeavePay(
    baseSalary: number,
    leaveHours: {
      annual?: number;
      sick?: number;
      maternity?: number;
      paternity?: number;
    } = {}
  ): {
    paidLeave: number;
    sickPay: number;
    maternityPay: number;
    paternityPay: number;
  } {
    const hourlyRate = baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;

    return {
      paidLeave: (leaveHours.annual || 0) * hourlyRate,
      sickPay:
        (leaveHours.sick || 0) *
        hourlyRate *
        LEAVE_ENTITLEMENTS.sick.payPercentage,
      maternityPay: (leaveHours.maternity || 0) * hourlyRate, // Full pay
      paternityPay: (leaveHours.paternity || 0) * hourlyRate, // Full pay
    };
  }

  /**
   * Calculate benefits in kind and imputed income
   */
  calculateBenefitsInKind(
    benefitsInKind: {
      mealVouchers?: number;
      companyCar?: number;
      housing?: number;
    } = {}
  ): {
    taxFreeBenefits: number;
    taxableBenefits: number;
    imputedIncome: number;
  } {
    const mealVouchers = benefitsInKind.mealVouchers || 0;
    const taxFreeMeals = Math.min(mealVouchers, TAX_FREE_LIMITS.mealVouchers);
    const taxableMeals = Math.max(
      0,
      mealVouchers - TAX_FREE_LIMITS.mealVouchers
    );

    // Company car: percentage of car value as imputed income
    const companyCarBenefit =
      ((benefitsInKind.companyCar || 0) *
        BENEFITS_IN_KIND.companyCar.annualTaxablePercentage) /
      12;

    // Housing benefit: fully taxable
    const housingBenefit = benefitsInKind.housing || 0;

    const imputedIncome = taxableMeals + companyCarBenefit + housingBenefit;

    return {
      taxFreeBenefits: taxFreeMeals,
      taxableBenefits: taxableMeals + companyCarBenefit + housingBenefit,
      imputedIncome,
    };
  }

  /**
   * Calculate tips taxation
   */
  calculateTipsTax(
    tips: number,
    employerTopUp: number = 0
  ): {
    totalTips: number;
    tipsTax: number;
    netTips: number;
  } {
    const totalTips = tips + employerTopUp;
    const tipsTax = totalTips * TIPS_TAX_RULES.flatTaxRate;
    const netTips = totalTips - tipsTax;

    return {
      totalTips,
      tipsTax,
      netTips,
    };
  }

  /**
   * Main payroll calculation method
   */
  calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    const {
      baseSalary,
      hourlyRate,
      regularHours,
      overtimeHours,
      nightHours,
      sundayHours,
      holidayHours,
      leaveHours = {},
      allowances = {},
      tips = 0,
      benefitsInKind = {},
      contractType,
      isFullTime,
      employmentStartDate,
      periodStartDate,
      periodEndDate,
    } = input;

    // Calculate hourly rate if not provided
    const effectiveHourlyRate =
      hourlyRate || baseSalary / WORKING_TIME_LIMITS.standardMonthlyHours;

    // Calculate regular pay
    const regularPay = regularHours * effectiveHourlyRate;

    // Calculate premiums
    const premiums = this.calculateOvertimePremiums(
      baseSalary,
      regularHours,
      overtimeHours,
      nightHours,
      sundayHours,
      holidayHours
    );

    // Calculate allowances
    const allowancesBreakdown = {
      food: allowances.food || 0,
      transport: allowances.transport || 0,
      housing: allowances.housing || 0,
      marriage: allowances.marriage || 0,
      family: allowances.family || 0,
      education: allowances.education || 0,
      experience: allowances.experience || 0,
      position: allowances.position || 0,
    };
    const totalAllowances = Object.values(allowancesBreakdown).reduce(
      (sum, val) => sum + val,
      0
    );

    // Calculate bonuses
    const bonuses = this.calculateGreekBonuses(
      baseSalary,
      employmentStartDate,
      periodEndDate,
      isFullTime,
      contractType
    );
    const totalBonuses = bonuses.christmas + bonuses.easter + bonuses.vacation;

    // Calculate leave pay
    const leavePay = this.calculateLeavePay(baseSalary, leaveHours);
    const totalLeavePay =
      leavePay.paidLeave +
      leavePay.sickPay +
      leavePay.maternityPay +
      leavePay.paternityPay;

    // Calculate benefits
    const benefits = this.calculateBenefitsInKind(benefitsInKind);

    // Calculate tips
    const tipsCalculation = this.calculateTipsTax(tips);

    // Calculate gross pay
    const grossPay =
      regularPay +
      premiums.overtimeAmount +
      premiums.nightPremium +
      premiums.sundayPremium +
      premiums.holidayPremium +
      totalAllowances +
      totalBonuses +
      totalLeavePay +
      benefits.taxFreeBenefits;

    // Calculate taxable income
    const taxableIncome =
      grossPay + benefits.imputedIncome + tipsCalculation.totalTips;

    // Calculate annual taxable income for tax brackets
    const annualTaxableIncome = taxableIncome * 12;

    // Calculate taxes
    const monthlyIncomeTax = this.calculateIncomeTax(annualTaxableIncome) / 12;
    const monthlySolidarityTax =
      this.calculateSolidarityTax(annualTaxableIncome) / 12;

    // Calculate EFKA contributions
    const efkaContributions = this.calculateEfkaContributions(grossPay);

    // Calculate total deductions
    const totalDeductions =
      monthlyIncomeTax +
      monthlySolidarityTax +
      efkaContributions.employee.total +
      tipsCalculation.tipsTax;

    // Calculate net pay
    const netPay = grossPay - totalDeductions + tipsCalculation.netTips;

    // Calculate total employer cost
    const totalEmployerCost = grossPay + efkaContributions.employer.total;

    return {
      employeeId: input.employeeId,
      periodId: input.periodId,

      // Gross Pay Components
      baseSalary,
      regularPay,
      overtimeAmount: premiums.overtimeAmount,
      nightPremium: premiums.nightPremium,
      sundayPremium: premiums.sundayPremium,
      holidayPremium: premiums.holidayPremium,

      // Allowances
      totalAllowances,
      allowancesBreakdown,

      // Greek Bonuses
      christmasBonus: bonuses.christmas,
      easterBonus: bonuses.easter,
      vacationBonus: bonuses.vacation,
      totalBonuses,

      // Leave Pay
      paidLeave: leavePay.paidLeave,
      sickPay: leavePay.sickPay,
      maternityPay: leavePay.maternityPay,
      paternityPay: leavePay.paternityPay,
      totalLeavePay,

      // Benefits
      taxFreeBenefits: benefits.taxFreeBenefits,
      taxableBenefits: benefits.taxableBenefits,
      imputedIncome: benefits.imputedIncome,

      // Tips
      totalTips: tipsCalculation.totalTips,
      tipsTax: tipsCalculation.tipsTax,
      netTips: tipsCalculation.netTips,

      // Totals
      grossPay,
      taxableIncome,

      // Deductions
      incomeTax: monthlyIncomeTax,
      solidarityTax: monthlySolidarityTax,
      employeeEfkaMain: efkaContributions.employee.main,
      employeeEfkaAux: efkaContributions.employee.auxiliary,
      employeeUnemployment: efkaContributions.employee.unemployment,
      totalDeductions,

      // Employer Costs
      employerEfkaMain: efkaContributions.employer.main,
      employerEfkaAux: efkaContributions.employer.auxiliary,
      employerUnemployment: efkaContributions.employer.unemployment,
      employerSickness: efkaContributions.employer.sickness,
      employerWorkAccident: efkaContributions.employer.workAccident,
      totalEmployerCost,

      // Final Amount
      netPay,

      // Metadata
      calculationDate: new Date(),
      calculationVersion: '2025.1',
    };
  }

  /**
   * Utility method to calculate months worked for bonus pro-ration
   */
  private calculateMonthsWorked(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    const dayDiff = endDate.getDate() - startDate.getDate();

    let months = yearDiff * 12 + monthDiff;

    // If the end date is before the start date in the month, subtract one month
    if (dayDiff < 0) {
      months -= 1;
    }

    return Math.max(0, months);
  }
}

// Export singleton instance
export const payrollCalculator = new PayrollCalculator();
