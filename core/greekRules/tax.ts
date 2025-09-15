/**
 * Greek Tax Rules - Pure Domain Logic
 * 
 * Pure functions for calculating Greek income tax and solidarity tax
 * based on current law versions. No database access or external dependencies.
 */

import { 
  GreekLawConstants, 
  TaxBracket, 
  SolidarityTaxBracket,
  lawRegistry 
} from '../../shared/law-constants.js';

// =============================================================================
// INCOME TAX CALCULATIONS
// =============================================================================

/**
 * Calculate annual income tax using progressive tax brackets
 */
export function calculateAnnualIncomeTax(
  annualIncome: number, 
  lawVersion?: GreekLawConstants
): {
  tax: number;
  effectiveRate: number;
  marginalRate: number;
  bracketsUsed: Array<{ bracket: TaxBracket; taxableAmount: number; tax: number }>;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const brackets = law.taxBrackets;
  
  if (annualIncome <= 0) {
    return {
      tax: 0,
      effectiveRate: 0,
      marginalRate: brackets[0].rate,
      bracketsUsed: []
    };
  }
  
  let totalTax = 0;
  let remainingIncome = annualIncome;
  const bracketsUsed: Array<{ bracket: TaxBracket; taxableAmount: number; tax: number }> = [];
  let marginalRate = 0;
  
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const bracketMin = bracket.min;
    const bracketMax = bracket.max || Infinity;
    const bracketWidth = bracketMax - bracketMin + (bracket.max ? 0 : 1);
    
    // Skip brackets below current income level
    if (annualIncome <= bracketMin) continue;
    
    // Calculate taxable amount in this bracket
    const taxableInThisBracket = Math.min(
      remainingIncome,
      bracketMax - Math.max(bracketMin, annualIncome - remainingIncome)
    );
    
    if (taxableInThisBracket > 0) {
      const bracketTax = taxableInThisBracket * bracket.rate;
      totalTax += bracketTax;
      remainingIncome -= taxableInThisBracket;
      marginalRate = bracket.rate;
      
      bracketsUsed.push({
        bracket,
        taxableAmount: taxableInThisBracket,
        tax: bracketTax
      });
    }
  }
  
  const effectiveRate = annualIncome > 0 ? totalTax / annualIncome : 0;
  
  return {
    tax: Math.round(totalTax * 100) / 100, // Round to cents
    effectiveRate,
    marginalRate,
    bracketsUsed
  };
}

/**
 * Calculate monthly income tax (1/12 of annual)
 */
export function calculateMonthlyIncomeTax(
  monthlyIncome: number,
  lawVersion?: GreekLawConstants
): {
  tax: number;
  effectiveRate: number;
  marginalRate: number;
} {
  const annualIncome = monthlyIncome * 12;
  const annualResult = calculateAnnualIncomeTax(annualIncome, lawVersion);
  
  return {
    tax: Math.round((annualResult.tax / 12) * 100) / 100,
    effectiveRate: annualResult.effectiveRate,
    marginalRate: annualResult.marginalRate
  };
}

/**
 * Calculate income tax with family deductions
 */
export function calculateIncomeTaxWithDeductions(
  annualIncome: number,
  maritalStatus: 'single' | 'married',
  numberOfChildren: number = 0,
  lawVersion?: GreekLawConstants
): {
  grossTax: number;
  deductions: number;
  netTax: number;
  effectiveRate: number;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const taxFreeLimits = law.taxFreeLimits;
  
  // Calculate gross tax first
  const grossTaxResult = calculateAnnualIncomeTax(annualIncome, law);
  const grossTax = grossTaxResult.tax;
  
  // Calculate deductions
  let totalDeductions = taxFreeLimits.annual; // Base annual deduction
  
  if (maritalStatus === 'married') {
    totalDeductions += taxFreeLimits.marriageBonus;
  }
  
  totalDeductions += (numberOfChildren * taxFreeLimits.childBonus);
  
  // Apply deductions (cannot reduce tax below zero)
  const netTax = Math.max(0, grossTax - totalDeductions);
  const effectiveRate = annualIncome > 0 ? netTax / annualIncome : 0;
  
  return {
    grossTax,
    deductions: Math.min(grossTax, totalDeductions),
    netTax,
    effectiveRate
  };
}

// =============================================================================
// SOLIDARITY TAX CALCULATIONS
// =============================================================================

/**
 * Calculate annual solidarity tax (special contribution)
 */
export function calculateAnnualSolidarityTax(
  annualIncome: number,
  lawVersion?: GreekLawConstants
): {
  tax: number;
  effectiveRate: number;
  marginalRate: number;
  bracketsUsed: Array<{ bracket: SolidarityTaxBracket; taxableAmount: number; tax: number }>;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const brackets = law.solidarityTaxBrackets;
  
  if (annualIncome <= 0) {
    return {
      tax: 0,
      effectiveRate: 0,
      marginalRate: 0,
      bracketsUsed: []
    };
  }
  
  let totalTax = 0;
  let remainingIncome = annualIncome;
  const bracketsUsed: Array<{ bracket: SolidarityTaxBracket; taxableAmount: number; tax: number }> = [];
  let marginalRate = 0;
  
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const bracketMin = bracket.min;
    const bracketMax = bracket.max || Infinity;
    
    // Skip brackets below current income level
    if (annualIncome <= bracketMin) continue;
    
    // Calculate taxable amount in this bracket
    const taxableInThisBracket = Math.min(
      remainingIncome,
      bracketMax - Math.max(bracketMin, annualIncome - remainingIncome)
    );
    
    if (taxableInThisBracket > 0) {
      const bracketTax = taxableInThisBracket * bracket.rate;
      totalTax += bracketTax;
      remainingIncome -= taxableInThisBracket;
      marginalRate = bracket.rate;
      
      bracketsUsed.push({
        bracket,
        taxableAmount: taxableInThisBracket,
        tax: bracketTax
      });
    }
  }
  
  const effectiveRate = annualIncome > 0 ? totalTax / annualIncome : 0;
  
  return {
    tax: Math.round(totalTax * 100) / 100,
    effectiveRate,
    marginalRate,
    bracketsUsed
  };
}

/**
 * Calculate monthly solidarity tax
 */
export function calculateMonthlySolidarityTax(
  monthlyIncome: number,
  lawVersion?: GreekLawConstants
): {
  tax: number;
  effectiveRate: number;
  marginalRate: number;
} {
  const annualIncome = monthlyIncome * 12;
  const annualResult = calculateAnnualSolidarityTax(annualIncome, lawVersion);
  
  return {
    tax: Math.round((annualResult.tax / 12) * 100) / 100,
    effectiveRate: annualResult.effectiveRate,
    marginalRate: annualResult.marginalRate
  };
}

// =============================================================================
// COMBINED TAX CALCULATIONS
// =============================================================================

/**
 * Calculate combined income tax and solidarity tax
 */
export function calculateCombinedTax(
  annualIncome: number,
  maritalStatus: 'single' | 'married' = 'single',
  numberOfChildren: number = 0,
  lawVersion?: GreekLawConstants
): {
  incomeTax: {
    gross: number;
    deductions: number;
    net: number;
  };
  solidarityTax: number;
  totalTax: number;
  effectiveRate: number;
  breakdown: {
    incomeTaxRate: number;
    solidarityTaxRate: number;
    combinedRate: number;
  };
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  
  // Calculate income tax with deductions
  const incomeTaxResult = calculateIncomeTaxWithDeductions(
    annualIncome, 
    maritalStatus, 
    numberOfChildren, 
    law
  );
  
  // Calculate solidarity tax (no family deductions)
  const solidarityTaxResult = calculateAnnualSolidarityTax(annualIncome, law);
  
  const totalTax = incomeTaxResult.netTax + solidarityTaxResult.tax;
  const effectiveRate = annualIncome > 0 ? totalTax / annualIncome : 0;
  
  return {
    incomeTax: {
      gross: incomeTaxResult.grossTax,
      deductions: incomeTaxResult.deductions,
      net: incomeTaxResult.netTax
    },
    solidarityTax: solidarityTaxResult.tax,
    totalTax,
    effectiveRate,
    breakdown: {
      incomeTaxRate: incomeTaxResult.effectiveRate,
      solidarityTaxRate: solidarityTaxResult.effectiveRate,
      combinedRate: effectiveRate
    }
  };
}

// =============================================================================
// TAX WITHHOLDING CALCULATIONS
// =============================================================================

/**
 * Calculate monthly tax withholding for payroll
 */
export function calculateMonthlyWithholding(
  monthlyIncome: number,
  maritalStatus: 'single' | 'married' = 'single',
  numberOfChildren: number = 0,
  lawVersion?: GreekLawConstants
): {
  incomeTax: number;
  solidarityTax: number;
  totalWithholding: number;
  effectiveRate: number;
} {
  const annualIncome = monthlyIncome * 12;
  const combinedResult = calculateCombinedTax(
    annualIncome, 
    maritalStatus, 
    numberOfChildren, 
    lawVersion
  );
  
  const monthlyIncomeTax = Math.round((combinedResult.incomeTax.net / 12) * 100) / 100;
  const monthlySolidarityTax = Math.round((combinedResult.solidarityTax / 12) * 100) / 100;
  const totalWithholding = monthlyIncomeTax + monthlySolidarityTax;
  const effectiveRate = monthlyIncome > 0 ? totalWithholding / monthlyIncome : 0;
  
  return {
    incomeTax: monthlyIncomeTax,
    solidarityTax: monthlySolidarityTax,
    totalWithholding,
    effectiveRate
  };
}

// =============================================================================
// TAX-FREE INCOME CALCULATIONS
// =============================================================================

/**
 * Calculate tax-free portion of income
 */
export function calculateTaxFreeIncome(
  annualIncome: number,
  maritalStatus: 'single' | 'married' = 'single',
  numberOfChildren: number = 0,
  lawVersion?: GreekLawConstants
): {
  baseTaxFree: number;
  marriageBonus: number;
  childrenBonus: number;
  totalTaxFree: number;
  taxableIncome: number;
} {
  const law = lawVersion || lawRegistry.getCurrentConstants();
  const taxFreeLimits = law.taxFreeLimits;
  
  const baseTaxFree = taxFreeLimits.annual;
  const marriageBonus = maritalStatus === 'married' ? taxFreeLimits.marriageBonus : 0;
  const childrenBonus = numberOfChildren * taxFreeLimits.childBonus;
  const totalTaxFree = baseTaxFree + marriageBonus + childrenBonus;
  
  const taxableIncome = Math.max(0, annualIncome - totalTaxFree);
  
  return {
    baseTaxFree,
    marriageBonus,
    childrenBonus,
    totalTaxFree,
    taxableIncome
  };
}