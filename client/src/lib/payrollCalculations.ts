export interface PayrollInput {
  employeeId: string;
  basicSalary: number;
  bonuses: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  collectiveAgreement: string;
}

export interface PayrollResult {
  basicSalary: number;
  overtime: number;
  nightShift: number;
  holidayPay: number;
  bonuses: number;
  grossTotal: number;
  incomeTax: number;
  employeeInsurance: number;
  solidarityTax: number;
  totalDeductions: number;
  netPay: number;
  employerInsurance: number;
  totalCost: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
}

// Greek tax brackets for 2024
const TAX_BRACKETS = [
  { min: 0, max: 10000, rate: 0.09 },
  { min: 10000, max: 20000, rate: 0.22 },
  { min: 20000, max: 30000, rate: 0.28 },
  { min: 30000, max: 40000, rate: 0.36 },
  { min: 40000, max: Infinity, rate: 0.44 },
];

// EFKA insurance rates
const INSURANCE_RATES = {
  employee: 0.16, // 16% for employee
  employer: 0.245, // 24.5% for employer
};

// Solidarity tax rate (applies to income over €12,000)
const SOLIDARITY_TAX_RATE = 0.022; // 2.2%
const SOLIDARITY_TAX_THRESHOLD = 12000;

// Collective agreement rates
const COLLECTIVE_AGREEMENT_RATES = {
  general: { overtime: 1.25, night: 1.25, holiday: 1.75 },
  private: { overtime: 1.25, night: 1.25, holiday: 1.75 },
  banks: { overtime: 1.30, night: 1.30, holiday: 2.0 },
  technical: { overtime: 1.25, night: 1.25, holiday: 1.75 },
  commerce: { overtime: 1.25, night: 1.25, holiday: 1.75 },
};

/**
 * Calculate Greek income tax based on progressive tax brackets
 */
export function calculateIncomeTax(annualIncome: number): number {
  let tax = 0;
  
  for (const bracket of TAX_BRACKETS) {
    if (annualIncome > bracket.min) {
      const taxableInThisBracket = Math.min(annualIncome - bracket.min, bracket.max - bracket.min);
      tax += taxableInThisBracket * bracket.rate;
    }
  }
  
  return tax;
}

/**
 * Calculate solidarity tax (applies to income over €12,000)
 */
export function calculateSolidarityTax(annualIncome: number): number {
  if (annualIncome <= SOLIDARITY_TAX_THRESHOLD) {
    return 0;
  }
  
  return (annualIncome - SOLIDARITY_TAX_THRESHOLD) * SOLIDARITY_TAX_RATE;
}

/**
 * Calculate EFKA insurance contributions
 */
export function calculateInsuranceContributions(grossSalary: number) {
  return {
    employee: grossSalary * INSURANCE_RATES.employee,
    employer: grossSalary * INSURANCE_RATES.employer,
  };
}

/**
 * Calculate overtime, night shift, and holiday pay
 */
export function calculateSpecialHours(
  basicSalary: number,
  overtimeHours: number,
  nightHours: number,
  holidayHours: number,
  collectiveAgreement: string = "general"
) {
  const rates = COLLECTIVE_AGREEMENT_RATES[collectiveAgreement as keyof typeof COLLECTIVE_AGREEMENT_RATES] 
    || COLLECTIVE_AGREEMENT_RATES.general;
  
  // Assuming 40 hours per week, 4.33 weeks per month = 173.3 hours per month
  const hourlyRate = basicSalary / 173.3;
  
  return {
    overtime: hourlyRate * overtimeHours * rates.overtime,
    nightShift: hourlyRate * nightHours * rates.night,
    holidayPay: hourlyRate * holidayHours * rates.holiday,
  };
}

/**
 * Main payroll calculation function
 */
export function calculatePayroll(input: PayrollInput): PayrollResult {
  const {
    basicSalary,
    bonuses,
    overtimeHours,
    nightHours,
    holidayHours,
    collectiveAgreement,
  } = input;

  // Calculate special hours
  const specialHours = calculateSpecialHours(
    basicSalary,
    overtimeHours,
    nightHours,
    holidayHours,
    collectiveAgreement
  );

  // Calculate gross total
  const grossTotal = basicSalary + bonuses + specialHours.overtime + specialHours.nightShift + specialHours.holidayPay;

  // Calculate annual gross for tax calculations
  const annualGross = grossTotal * 12;

  // Calculate taxes
  const annualIncomeTax = calculateIncomeTax(annualGross);
  const monthlyIncomeTax = annualIncomeTax / 12;
  
  const annualSolidarityTax = calculateSolidarityTax(annualGross);
  const monthlySolidarityTax = annualSolidarityTax / 12;

  // Calculate insurance contributions
  const insurance = calculateInsuranceContributions(grossTotal);

  // Calculate total deductions
  const totalDeductions = monthlyIncomeTax + insurance.employee + monthlySolidarityTax;

  // Calculate net pay
  const netPay = grossTotal - totalDeductions;

  // Calculate total employer cost
  const totalCost = grossTotal + insurance.employer;

  return {
    basicSalary,
    overtime: specialHours.overtime,
    nightShift: specialHours.nightShift,
    holidayPay: specialHours.holidayPay,
    bonuses,
    grossTotal,
    incomeTax: monthlyIncomeTax,
    employeeInsurance: insurance.employee,
    solidarityTax: monthlySolidarityTax,
    totalDeductions,
    netPay,
    employerInsurance: insurance.employer,
    totalCost,
    overtimeHours,
    nightHours,
    holidayHours,
  };
}

/**
 * Get tax bracket information for display
 */
export function getTaxBrackets() {
  return TAX_BRACKETS.map(bracket => ({
    min: bracket.min,
    max: bracket.max === Infinity ? null : bracket.max,
    rate: bracket.rate,
    percentage: `${(bracket.rate * 100).toFixed(0)}%`,
  }));
}

/**
 * Get insurance rates for display
 */
export function getInsuranceRates() {
  return {
    employee: {
      rate: INSURANCE_RATES.employee,
      percentage: `${(INSURANCE_RATES.employee * 100).toFixed(1)}%`,
    },
    employer: {
      rate: INSURANCE_RATES.employer,
      percentage: `${(INSURANCE_RATES.employer * 100).toFixed(1)}%`,
    },
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
