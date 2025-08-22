import type { Employee, WageComponent, PayrollCalculation } from "@shared/schema";

// Greek Tax Brackets for 2025
export const GREEK_TAX_BRACKETS = [
  { min: 0, max: 10000, rate: 0.09 }, // 9% up to €10,000
  { min: 10000, max: 20000, rate: 0.22 }, // 22% from €10,000 to €20,000
  { min: 20000, max: 30000, rate: 0.28 }, // 28% from €20,000 to €30,000
  { min: 30000, max: 40000, rate: 0.36 }, // 36% from €30,000 to €40,000
  { min: 40000, max: Infinity, rate: 0.44 } // 44% above €40,000
];

// EFKA Rates for 2025
export const EFKA_RATES = {
  employee: {
    main: 0.1067, // 10.67% main pension
    auxiliary: 0.0333, // 3.33% auxiliary pension
    unemployment: 0.0213 // 2.13% unemployment fund
  },
  employer: {
    main: 0.1542, // 15.42% main pension
    auxiliary: 0.0333, // 3.33% auxiliary pension
    unemployment: 0.0503, // 5.03% unemployment fund
    sickness: 0.0287, // 2.87% sickness benefits
    workAccident: 0.0067 // 0.67% work accident insurance
  }
};

// Special Solidarity Tax Rates
export const SOLIDARITY_TAX_BRACKETS = [
  { min: 0, max: 12000, rate: 0 }, // No solidarity tax up to €12,000
  { min: 12000, max: 20000, rate: 0.022 }, // 2.2% from €12,000 to €20,000
  { min: 20000, max: 30000, rate: 0.05 }, // 5% from €20,000 to €30,000
  { min: 30000, max: 40000, rate: 0.065 }, // 6.5% from €30,000 to €40,000
  { min: 40000, max: 65000, rate: 0.075 }, // 7.5% from €40,000 to €65,000
  { min: 65000, max: Infinity, rate: 0.09 } // 9% above €65,000
];

// Greek National Holidays and Bonus Calculations
export const GREEK_BONUSES = {
  christmas: {
    fullTimeMonthly: 1.0417, // 25/24 of monthly salary
    partTimeHourly: 0.0417 // 1/24 of monthly for part-time
  },
  easter: {
    fullTimeMonthly: 0.5, // Half month salary
    partTimeHourly: 0.02083 // Pro-rated for part-time
  },
  vacation: {
    fullTimeMonthly: 0.5, // Half month salary
    partTimeHourly: 0.02083 // Pro-rated for part-time
  }
};

// Premium Rates for Greek Labor Law
export const PREMIUM_RATES = {
  overtime: {
    tier1: 1.25, // First 2 hours: 25% premium
    tier2: 1.50, // Hours 3-4: 50% premium
    tier3: 1.75  // Beyond 4 hours: 75% premium
  },
  night: 0.25, // 25% night premium (10 PM - 6 AM)
  sunday: 0.75, // 75% Sunday premium
  holiday: 1.00, // 100% holiday premium
  dangerous: 0.15 // 15% dangerous work premium
};

export interface PayrollCalculationInput {
  employee: Employee;
  wageComponents: WageComponent;
  periodStartDate: Date;
  periodEndDate: Date;
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
  tips?: number;
  benefitsInKind?: {
    mealVouchers?: number;
    companyCar?: number;
    housing?: number;
  };
  contractType: 'indefinite' | 'fixed-term' | 'seasonal';
  isFullTime: boolean;
}

export class GreekPayrollCalculator {
  // Calculate Greek income tax based on progressive brackets
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

  // Calculate special solidarity tax
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

  // Calculate EFKA contributions
  calculateEfkaContributions(grossPay: number): {
    employee: { main: number; auxiliary: number; unemployment: number; total: number };
    employer: { main: number; auxiliary: number; unemployment: number; sickness: number; workAccident: number; total: number };
  } {
    const employee = {
      main: grossPay * EFKA_RATES.employee.main,
      auxiliary: grossPay * EFKA_RATES.employee.auxiliary,
      unemployment: grossPay * EFKA_RATES.employee.unemployment,
      total: 0
    };
    employee.total = employee.main + employee.auxiliary + employee.unemployment;

    const employer = {
      main: grossPay * EFKA_RATES.employer.main,
      auxiliary: grossPay * EFKA_RATES.employer.auxiliary,
      unemployment: grossPay * EFKA_RATES.employer.unemployment,
      sickness: grossPay * EFKA_RATES.employer.sickness,
      workAccident: grossPay * EFKA_RATES.employer.workAccident,
      total: 0
    };
    employer.total = employer.main + employer.auxiliary + employer.unemployment + employer.sickness + employer.workAccident;

    return { employee, employer };
  }

  // Calculate Greek bonuses with pro-ration
  calculateGreekBonuses(
    baseSalary: number, 
    startDate: Date, 
    endDate: Date, 
    isFullTime: boolean,
    contractType: 'indefinite' | 'fixed-term' | 'seasonal'
  ): { christmas: number; easter: number; vacation: number } {
    const monthsWorked = this.calculateMonthsWorked(startDate, endDate);
    const proRationFactor = Math.min(monthsWorked / 12, 1);

    // Seasonal workers get reduced bonuses
    const seasonalFactor = contractType === 'seasonal' ? 0.5 : 1;
    
    return {
      christmas: baseSalary * GREEK_BONUSES.christmas.fullTimeMonthly * proRationFactor * seasonalFactor,
      easter: baseSalary * GREEK_BONUSES.easter.fullTimeMonthly * proRationFactor * seasonalFactor,
      vacation: baseSalary * GREEK_BONUSES.vacation.fullTimeMonthly * proRationFactor * seasonalFactor
    };
  }

  // Calculate overtime premiums according to Greek law
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
    const hourlyRate = baseSalary / 173.33; // Standard monthly hours in Greece

    // Overtime tiers
    const tier1Hours = Math.min(overtimeHours, 2);
    const tier2Hours = Math.min(Math.max(overtimeHours - 2, 0), 2);
    const tier3Hours = Math.max(overtimeHours - 4, 0);

    const overtimeAmount = 
      (tier1Hours * hourlyRate * PREMIUM_RATES.overtime.tier1) +
      (tier2Hours * hourlyRate * PREMIUM_RATES.overtime.tier2) +
      (tier3Hours * hourlyRate * PREMIUM_RATES.overtime.tier3);

    const nightPremium = nightHours * hourlyRate * PREMIUM_RATES.night;
    const sundayPremium = sundayHours * hourlyRate * PREMIUM_RATES.sunday;
    const holidayPremium = holidayHours * hourlyRate * PREMIUM_RATES.holiday;

    return {
      overtimeAmount,
      nightPremium,
      sundayPremium,
      holidayPremium
    };
  }

  // Calculate leave pay (annual, sick, maternity/paternity)
  calculateLeavePay(
    baseSalary: number,
    leaveHours: { annual?: number; sick?: number; maternity?: number; paternity?: number } = {}
  ): {
    paidLeave: number;
    sickPay: number;
    maternityPay: number;
    paternityPay: number;
  } {
    const hourlyRate = baseSalary / 173.33;

    return {
      paidLeave: (leaveHours.annual || 0) * hourlyRate,
      sickPay: (leaveHours.sick || 0) * hourlyRate * 0.5, // 50% pay for sick leave
      maternityPay: (leaveHours.maternity || 0) * hourlyRate, // Full pay for maternity
      paternityPay: (leaveHours.paternity || 0) * hourlyRate // Full pay for paternity
    };
  }

  // Calculate benefits in kind and imputed income
  calculateBenefitsInKind(
    benefitsInKind: { mealVouchers?: number; companyCar?: number; housing?: number } = {}
  ): {
    mealVouchers: number;
    companyCarBenefit: number;
    imputedIncome: number;
  } {
    // Meal vouchers up to €11/day are tax-free
    const taxFreeMealLimit = 11;
    const mealVouchers = benefitsInKind.mealVouchers || 0;
    const taxableMealBenefit = Math.max(0, mealVouchers - taxFreeMealLimit);

    // Company car: 20% of car value per year as imputed income
    const companyCarBenefit = (benefitsInKind.companyCar || 0) * 0.20 / 12;

    // Housing benefit: full value as imputed income
    const housingBenefit = benefitsInKind.housing || 0;

    const imputedIncome = taxableMealBenefit + companyCarBenefit + housingBenefit;

    return {
      mealVouchers,
      companyCarBenefit,
      imputedIncome
    };
  }

  // Calculate tips taxation (15% flat rate for declared tips)
  calculateTipsTax(tips: number, employerTopUp: number = 0): {
    totalTips: number;
    tipsTax: number;
    netTips: number;
  } {
    const totalTips = tips + employerTopUp;
    const tipsTax = totalTips * 0.15; // 15% flat tax rate on tips
    const netTips = totalTips - tipsTax;

    return {
      totalTips,
      tipsTax,
      netTips
    };
  }

  // Main calculation method
  calculatePayroll(input: PayrollCalculationInput): PayrollCalculation {
    const {
      wageComponents,
      regularHours,
      overtimeHours,
      nightHours,
      sundayHours,
      holidayHours,
      leaveHours = {},
      tips = 0,
      benefitsInKind = {},
      contractType,
      isFullTime
    } = input;

    // Base calculations
    const baseSalary = parseFloat(wageComponents.baseSalary);
    const hourlyRate = parseFloat(wageComponents.hourlyRate || '0');

    // Calculate premiums
    const premiums = this.calculateOvertimePremiums(
      baseSalary, regularHours, overtimeHours, nightHours, sundayHours, holidayHours
    );

    // Calculate allowances
    const allowances = {
      food: parseFloat(wageComponents.foodAllowance || '0'),
      transport: parseFloat(wageComponents.transportAllowance || '0'),
      housing: parseFloat(wageComponents.housingAllowance || '0'),
      marriage: parseFloat(wageComponents.marriageAllowance || '0'),
      family: parseFloat(wageComponents.familyAllowance || '0'),
      education: parseFloat(wageComponents.educationAllowance || '0'),
      experience: parseFloat(wageComponents.experienceAllowance || '0'),
      position: parseFloat(wageComponents.positionAllowance || '0')
    };

    // Calculate bonuses (pro-rated)
    const bonuses = this.calculateGreekBonuses(
      baseSalary,
      new Date(input.periodStartDate),
      new Date(input.periodEndDate),
      isFullTime,
      contractType
    );

    // Calculate leave pay
    const leavePay = this.calculateLeavePay(baseSalary, leaveHours);

    // Calculate benefits in kind
    const benefits = this.calculateBenefitsInKind(benefitsInKind);

    // Calculate tips
    const tipsCalculation = this.calculateTipsTax(tips);

    // Calculate gross pay
    const regularPay = (regularHours * (hourlyRate > 0 ? hourlyRate : baseSalary / 173.33));
    const grossPay = regularPay +
      premiums.overtimeAmount +
      premiums.nightPremium +
      premiums.sundayPremium +
      premiums.holidayPremium +
      Object.values(allowances).reduce((sum, val) => sum + val, 0) +
      Object.values(bonuses).reduce((sum, val) => sum + val, 0) +
      Object.values(leavePay).reduce((sum, val) => sum + val, 0) +
      benefits.mealVouchers;

    // Calculate taxable income (includes imputed income)
    const taxableIncome = grossPay + benefits.imputedIncome + tipsCalculation.totalTips;

    // Calculate annual taxable income for tax brackets
    const annualTaxableIncome = taxableIncome * 12;

    // Calculate taxes
    const monthlyIncomeTax = this.calculateIncomeTax(annualTaxableIncome) / 12;
    const monthlySolidarityTax = this.calculateSolidarityTax(annualTaxableIncome) / 12;

    // Calculate EFKA contributions
    const efkaContributions = this.calculateEfkaContributions(grossPay);

    // Calculate total deductions
    const totalDeductions = monthlyIncomeTax + 
      monthlySolidarityTax + 
      efkaContributions.employee.total +
      tipsCalculation.tipsTax;

    // Calculate net pay
    const netPay = grossPay - totalDeductions + tipsCalculation.netTips;

    // Calculate total employer cost
    const totalEmployerCost = grossPay + efkaContributions.employer.total;

    // Return PayrollCalculation object
    return {
      calculationId: '', // Will be set by database
      periodId: '', // Will be set by caller
      employeeId: input.employee.employeeId,
      
      // Gross Pay Components
      baseSalary: baseSalary.toString(),
      regularHours: regularHours.toString(),
      overtimeHours: overtimeHours.toString(),
      overtimeAmount: premiums.overtimeAmount.toString(),
      
      // Greek Premiums
      nightPremium: premiums.nightPremium.toString(),
      sundayPremium: premiums.sundayPremium.toString(),
      holidayPremium: premiums.holidayPremium.toString(),
      
      // Greek Allowances
      foodAllowance: allowances.food.toString(),
      transportAllowance: allowances.transport.toString(),
      housingAllowance: allowances.housing.toString(),
      marriageAllowance: allowances.marriage.toString(),
      familyAllowance: allowances.family.toString(),
      educationAllowance: allowances.education.toString(),
      experienceAllowance: allowances.experience.toString(),
      positionAllowance: allowances.position.toString(),
      
      // Greek Bonuses (Δώρα)
      christmasBonus: bonuses.christmas.toString(),
      easterBonus: bonuses.easter.toString(),
      vacationBonus: bonuses.vacation.toString(),
      
      // Leave Pay
      paidLeave: leavePay.paidLeave.toString(),
      sickPay: leavePay.sickPay.toString(),
      maternityPay: leavePay.maternityPay.toString(),
      paternityPay: leavePay.paternityPay.toString(),
      
      // Benefits in Kind
      mealVouchers: benefits.mealVouchers.toString(),
      companyCarBenefit: benefits.companyCarBenefit.toString(),
      imputedIncome: benefits.imputedIncome.toString(),
      
      // Tips and Commissions
      tips: tips.toString(),
      tipsPoolShare: '0.00',
      employerTipTopUp: '0.00',
      commissions: '0.00',
      
      // Totals
      grossPay: grossPay.toString(),
      taxableIncome: taxableIncome.toString(),
      
      // Tax Deductions (Greek Tax System)
      incomeTax: monthlyIncomeTax.toString(),
      solidarityTax: monthlySolidarityTax.toString(),
      
      // Social Insurance (EFKA)
      employeeEfkaMain: efkaContributions.employee.main.toString(),
      employeeEfkaAux: efkaContributions.employee.auxiliary.toString(),
      employeeUnemployment: efkaContributions.employee.unemployment.toString(),
      
      // Employer Contributions
      employerEfkaMain: efkaContributions.employer.main.toString(),
      employerEfkaAux: efkaContributions.employer.auxiliary.toString(),
      employerUnemployment: efkaContributions.employer.unemployment.toString(),
      
      // Final Amounts
      totalDeductions: totalDeductions.toString(),
      netPay: netPay.toString(),
      totalEmployerCost: totalEmployerCost.toString(),
      
      // Calculation Metadata
      calculatedAt: new Date(),
      calculatedBy: null,
      calculationVersion: '2025.1',
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Utility method to calculate months worked for bonus pro-ration
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

// Export a singleton instance
export const greekPayrollCalculator = new GreekPayrollCalculator();