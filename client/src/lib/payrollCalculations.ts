/**
 * Greek Payroll & Tax Calculation Engine
 * Updated for 2025 tax rates and EFKA contributions
 */

// 2025 Greek Income Tax Brackets
export const GREEK_TAX_BRACKETS = [
  { min: 0, max: 10000, rate: 0.09 },        // 9% up to €10,000
  { min: 10000, max: 20000, rate: 0.22 },    // 22% from €10,001 to €20,000
  { min: 20000, max: 30000, rate: 0.28 },    // 28% from €20,001 to €30,000
  { min: 30000, max: 40000, rate: 0.36 },    // 36% from €30,001 to €40,000
  { min: 40000, max: Infinity, rate: 0.44 }  // 44% above €40,000
];

// EFKA Insurance Rates 2025
export const EFKA_RATES = {
  employee: {
    main: 0.16,           // 16% main insurance
    unemployment: 0.005,   // 0.5% unemployment fund
    total: 0.165          // 16.5% total employee contribution
  },
  employer: {
    main: 0.2478,         // 24.78% main insurance
    unemployment: 0.0255, // 2.55% unemployment fund
    family: 0.007,        // 0.7% family benefits
    total: 0.2803         // 28.03% total employer contribution
  }
};

// Special Insurance Categories with Additional Rates
export const SPECIAL_INSURANCE_RATES = {
  HEAVY_UNHEALTHY: { additionalRate: 0.02 },    // +2% for heavy/unhealthy work
  HAZARDOUS: { additionalRate: 0.035 },         // +3.5% for hazardous work
  MARITIME: { additionalRate: 0.015 },          // +1.5% for maritime work
  MILITARY: { additionalRate: 0.0 },            // Special rates handled separately
  POLICE: { additionalRate: 0.0 },              // Special rates handled separately
  FIREFIGHTER: { additionalRate: 0.025 }        // +2.5% for firefighters
};

// Solidarity Tax Rate (on annual income > €12,000)
export const SOLIDARITY_TAX_RATE = 0.022; // 2.2%
export const SOLIDARITY_TAX_THRESHOLD = 12000;

// Tax-Free Allowances
export const TAX_FREE_ALLOWANCES = {
  personal: 3900,        // Personal allowance €3,900
  married: 3900,         // Additional for married
  child: 777,            // Per child allowance €777
  disability: 1400       // Disability allowance €1,400
};

// Minimum Wage 2025
export const MINIMUM_WAGE_2025 = 760; // €760/month

// Sunday Work Premium
export const SUNDAY_WORK_PREMIUM = 0.75; // 75% premium

// Overtime Rates
export const OVERTIME_RATES = {
  daily: 0.25,           // 25% for first 2 hours
  dailyExtended: 0.50,   // 50% after 2 hours
  weekly: 0.25,          // 25% for weekly overtime
  holiday: 0.75          // 75% for holiday work
};

/**
 * Calculate Greek income tax based on progressive brackets
 */
export function calculateIncomeTax(annualIncome: number, allowances: number = 0): number {
  const taxableIncome = Math.max(0, annualIncome - allowances);
  let tax = 0;

  for (const bracket of GREEK_TAX_BRACKETS) {
    if (taxableIncome > bracket.min) {
      const taxableAtThisBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
      tax += taxableAtThisBracket * bracket.rate;
    }
  }

  return Math.round(tax * 100) / 100;
}

/**
 * Calculate solidarity tax (2.2% on income > €12,000)
 */
export function calculateSolidarityTax(annualIncome: number): number {
  if (annualIncome <= SOLIDARITY_TAX_THRESHOLD) {
    return 0;
  }
  return Math.round((annualIncome - SOLIDARITY_TAX_THRESHOLD) * SOLIDARITY_TAX_RATE * 100) / 100;
}

/**
 * Calculate total tax-free allowances
 */
export function calculateTaxFreeAllowances(
  maritalStatus: string,
  children: number = 0,
  hasDisability: boolean = false
): number {
  let allowances = TAX_FREE_ALLOWANCES.personal;
  
  if (maritalStatus === 'MARRIED') {
    allowances += TAX_FREE_ALLOWANCES.married;
  }
  
  allowances += children * TAX_FREE_ALLOWANCES.child;
  
  if (hasDisability) {
    allowances += TAX_FREE_ALLOWANCES.disability;
  }
  
  return allowances;
}

/**
 * Calculate EFKA insurance contributions
 */
export function calculateEfkaContributions(
  grossSalary: number,
  specialCategory: string | null = null
): {
  employee: number;
  employer: number;
  unemploymentEmployee: number;
  unemploymentEmployer: number;
  total: number;
} {
  let employeeRate = EFKA_RATES.employee.main;
  let employerRate = EFKA_RATES.employer.main;

  // Add special category rates
  if (specialCategory && SPECIAL_INSURANCE_RATES[specialCategory]) {
    const additionalRate = SPECIAL_INSURANCE_RATES[specialCategory].additionalRate;
    employeeRate += additionalRate * 0.4; // Employee pays 40% of additional
    employerRate += additionalRate * 0.6;  // Employer pays 60% of additional
  }

  const employeeMain = Math.round(grossSalary * employeeRate * 100) / 100;
  const employerMain = Math.round(grossSalary * employerRate * 100) / 100;
  const unemploymentEmployee = Math.round(grossSalary * EFKA_RATES.employee.unemployment * 100) / 100;
  const unemploymentEmployer = Math.round(grossSalary * EFKA_RATES.employer.unemployment * 100) / 100;

  return {
    employee: employeeMain,
    employer: employerMain,
    unemploymentEmployee,
    unemploymentEmployer,
    total: employeeMain + employerMain + unemploymentEmployee + unemploymentEmployer
  };
}

/**
 * Calculate overtime pay
 */
export function calculateOvertimePay(
  baseSalary: number,
  overtimeHours: number,
  overtimeType: 'daily' | 'weekly' | 'holiday' = 'daily'
): number {
  const hourlyRate = baseSalary / 173.33; // Standard monthly hours
  let rate = OVERTIME_RATES.daily;

  switch (overtimeType) {
    case 'weekly':
      rate = OVERTIME_RATES.weekly;
      break;
    case 'holiday':
      rate = OVERTIME_RATES.holiday;
      break;
    case 'daily':
      // First 2 hours at 25%, then 50%
      if (overtimeHours <= 2) {
        rate = OVERTIME_RATES.daily;
      } else {
        const firstTwoHours = 2 * hourlyRate * OVERTIME_RATES.daily;
        const remainingHours = (overtimeHours - 2) * hourlyRate * OVERTIME_RATES.dailyExtended;
        return Math.round((firstTwoHours + remainingHours) * 100) / 100;
      }
      break;
  }

  return Math.round(overtimeHours * hourlyRate * rate * 100) / 100;
}

/**
 * Calculate Sunday work premium
 */
export function calculateSundayPremium(baseSalary: number, sundayHours: number): number {
  const hourlyRate = baseSalary / 173.33;
  return Math.round(sundayHours * hourlyRate * SUNDAY_WORK_PREMIUM * 100) / 100;
}

/**
 * Collective Agreement Wage Adjustments
 */
export const COLLECTIVE_AGREEMENTS = {
  GENERAL: {
    name: 'Γενική Συλλογική Σύμβαση',
    minimumWage: 760,
    experienceBonus: [
      { years: 0, bonus: 0 },
      { years: 3, bonus: 30 },
      { years: 6, bonus: 60 },
      { years: 9, bonus: 90 },
      { years: 12, bonus: 120 }
    ],
    educationBonus: {
      'HIGH_SCHOOL': 0,
      'TECHNICAL': 25,
      'UNIVERSITY': 50,
      'MASTERS': 75,
      'PHD': 100
    },
    maritalBonus: {
      'MARRIED': 40,
      'MARRIED_WITH_CHILDREN': 80
    }
  },
  BANKING: {
    name: 'Τραπεζικός Κλάδος',
    minimumWage: 950,
    experienceBonus: [
      { years: 0, bonus: 0 },
      { years: 2, bonus: 50 },
      { years: 5, bonus: 120 },
      { years: 10, bonus: 250 },
      { years: 15, bonus: 400 }
    ],
    educationBonus: {
      'HIGH_SCHOOL': 0,
      'TECHNICAL': 40,
      'UNIVERSITY': 100,
      'MASTERS': 150,
      'PHD': 200
    },
    maritalBonus: {
      'MARRIED': 60,
      'MARRIED_WITH_CHILDREN': 120
    }
  },
  TOURISM: {
    name: 'Τουρισμός',
    minimumWage: 760,
    seasonalBonus: 0.15, // 15% seasonal bonus
    experienceBonus: [
      { years: 0, bonus: 0 },
      { years: 3, bonus: 25 },
      { years: 6, bonus: 50 },
      { years: 10, bonus: 100 }
    ],
    educationBonus: {
      'HIGH_SCHOOL': 0,
      'TECHNICAL': 20,
      'UNIVERSITY': 40,
      'MASTERS': 60,
      'PHD': 80
    }
  },
  CONSTRUCTION: {
    name: 'Οικοδομικά Έργα',
    minimumWage: 800,
    hazardBonus: 0.20, // 20% hazard bonus
    experienceBonus: [
      { years: 0, bonus: 0 },
      { years: 5, bonus: 80 },
      { years: 10, bonus: 160 },
      { years: 15, bonus: 240 }
    ],
    educationBonus: {
      'HIGH_SCHOOL': 0,
      'TECHNICAL': 60,
      'UNIVERSITY': 100,
      'MASTERS': 140,
      'PHD': 180
    }
  },
  COMMERCE: {
    name: 'Εμπορικοί Υπάλληλοι',
    minimumWage: 760,
    experienceBonus: [
      { years: 0, bonus: 0 },
      { years: 3, bonus: 35 },
      { years: 6, bonus: 70 },
      { years: 9, bonus: 105 },
      { years: 12, bonus: 140 }
    ],
    educationBonus: {
      'HIGH_SCHOOL': 0,
      'TECHNICAL': 30,
      'UNIVERSITY': 60,
      'MASTERS': 90,
      'PHD': 120
    },
    maritalBonus: {
      'MARRIED': 50,
      'MARRIED_WITH_CHILDREN': 100
    }
  }
};

/**
 * Calculate collective agreement wage adjustments
 */
export function calculateCollectiveAgreementWage(
  agreement: keyof typeof COLLECTIVE_AGREEMENTS,
  experienceYears: number,
  education: string,
  maritalStatus: string,
  children: number = 0
): {
  baseWage: number;
  experienceBonus: number;
  educationBonus: number;
  maritalBonus: number;
  totalWage: number;
} {
  const ca = COLLECTIVE_AGREEMENTS[agreement];
  let baseWage = ca.minimumWage;
  
  // Experience bonus
  let experienceBonus = 0;
  for (const bonus of ca.experienceBonus) {
    if (experienceYears >= bonus.years) {
      experienceBonus = bonus.bonus;
    }
  }
  
  // Education bonus
  const educationBonus = ca.educationBonus[education] || 0;
  
  // Marital bonus
  let maritalBonus = 0;
  if (ca.maritalBonus) {
    if (children > 0 && ca.maritalBonus['MARRIED_WITH_CHILDREN']) {
      maritalBonus = ca.maritalBonus['MARRIED_WITH_CHILDREN'];
    } else if (maritalStatus === 'MARRIED' && ca.maritalBonus['MARRIED']) {
      maritalBonus = ca.maritalBonus['MARRIED'];
    }
  }
  
  const totalWage = baseWage + experienceBonus + educationBonus + maritalBonus;
  
  return {
    baseWage,
    experienceBonus,
    educationBonus,
    maritalBonus,
    totalWage
  };
}

/**
 * Complete payroll calculation
 */
export function calculateCompletePayroll(params: {
  grossSalary: number;
  annualIncome: number;
  maritalStatus: string;
  children: number;
  hasDisability: boolean;
  specialInsuranceCategory?: string;
  overtimeHours?: number;
  sundayHours?: number;
  allowances?: number;
  bonuses?: number;
}): {
  gross: {
    salary: number;
    overtime: number;
    sunday: number;
    allowances: number;
    bonuses: number;
    total: number;
  };
  deductions: {
    incomeTax: number;
    solidarityTax: number;
    efkaEmployee: number;
    unemployment: number;
    total: number;
  };
  employer: {
    efkaEmployer: number;
    unemployment: number;
    family: number;
    total: number;
  };
  net: number;
} {
  const {
    grossSalary,
    annualIncome,
    maritalStatus,
    children,
    hasDisability,
    specialInsuranceCategory,
    overtimeHours = 0,
    sundayHours = 0,
    allowances = 0,
    bonuses = 0
  } = params;

  // Calculate gross components
  const overtimePay = calculateOvertimePay(grossSalary, overtimeHours);
  const sundayPay = calculateSundayPremium(grossSalary, sundayHours);
  const grossTotal = grossSalary + overtimePay + sundayPay + allowances + bonuses;

  // Calculate tax allowances
  const taxAllowances = calculateTaxFreeAllowances(maritalStatus, children, hasDisability);
  
  // Calculate taxes
  const incomeTax = calculateIncomeTax(annualIncome, taxAllowances) / 12; // Monthly
  const solidarityTax = calculateSolidarityTax(annualIncome) / 12; // Monthly

  // Calculate insurance contributions
  const efka = calculateEfkaContributions(grossTotal, specialInsuranceCategory);

  // Calculate totals
  const totalDeductions = incomeTax + solidarityTax + efka.employee + efka.unemploymentEmployee;
  const totalEmployerCosts = efka.employer + efka.unemploymentEmployer + (grossTotal * EFKA_RATES.employer.family);
  const netSalary = grossTotal - totalDeductions;

  return {
    gross: {
      salary: grossSalary,
      overtime: overtimePay,
      sunday: sundayPay,
      allowances,
      bonuses,
      total: grossTotal
    },
    deductions: {
      incomeTax: Math.round(incomeTax * 100) / 100,
      solidarityTax: Math.round(solidarityTax * 100) / 100,
      efkaEmployee: efka.employee,
      unemployment: efka.unemploymentEmployee,
      total: Math.round(totalDeductions * 100) / 100
    },
    employer: {
      efkaEmployer: efka.employer,
      unemployment: efka.unemploymentEmployer,
      family: Math.round(grossTotal * EFKA_RATES.employer.family * 100) / 100,
      total: Math.round(totalEmployerCosts * 100) / 100
    },
    net: Math.round(netSalary * 100) / 100
  };
}

/**
 * Get industry sectors for collective agreements
 */
export function getIndustrySectors() {
  return Object.keys(COLLECTIVE_AGREEMENTS).map(key => ({
    value: key,
    label: COLLECTIVE_AGREEMENTS[key as keyof typeof COLLECTIVE_AGREEMENTS].name
  }));
}

/**
 * Validate minimum wage compliance
 */
export function validateMinimumWage(salary: number, agreement?: string): {
  isCompliant: boolean;
  minimumRequired: number;
  difference: number;
} {
  const minimumWage = agreement && COLLECTIVE_AGREEMENTS[agreement as keyof typeof COLLECTIVE_AGREEMENTS]
    ? COLLECTIVE_AGREEMENTS[agreement as keyof typeof COLLECTIVE_AGREEMENTS].minimumWage
    : MINIMUM_WAGE_2025;

  return {
    isCompliant: salary >= minimumWage,
    minimumRequired: minimumWage,
    difference: Math.max(0, minimumWage - salary)
  };
}