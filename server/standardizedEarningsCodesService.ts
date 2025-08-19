// Standardized Earnings Codes System for Greek Payroll
// Implements taxation, EFKA contributions, APD reporting, and stacking rules

import { db } from "./db";
import { wageComponents } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface EarningsCodeRule {
  code: string;
  name: string;
  description: string;
  calculation: 'hourly_rate' | 'premium_percentage' | 'fixed_amount' | 'hours_times_rate';
  premiumRate?: number; // For premium calculations (e.g., 0.25 for 25%)
  taxable: boolean;
  contributoryEFKA: boolean;
  includedAPD: boolean;
  stackable: boolean;
  applicableHours?: {
    nightBand?: { start: string; end: string }; // e.g., "22:00" to "06:00"
    weekends?: boolean;
    holidays?: boolean;
  };
  constraints?: {
    maxHoursPerWeek?: number;
    maxHoursPerMonth?: number;
    maxHoursPerYear?: number;
  };
  baseWage: boolean; // True for REG, false for premiums
  dependsOn?: string[]; // Other codes this can stack with
}

// 2025 Greek Earnings Codes with Compliance Rules
export const STANDARDIZED_EARNINGS_CODES: Record<string, EarningsCodeRule> = {
  // Base Wages
  REG: {
    code: 'REG',
    name: 'Regular Hours',
    description: 'Represents the employee\'s base wage. Calculated as hours multiplied by the agreed hourly rate. Fully taxable, contributory to EFKA, and included in APD. This code does not stack with any other earnings type.',
    calculation: 'hours_times_rate',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: false, // This code does not stack with any other earnings type
    baseWage: true,
    constraints: {
      maxHoursPerWeek: 40,
      maxHoursPerMonth: 173,
      maxHoursPerYear: 2080
    }
  },

  // Night Work Premium (Primary focus from user requirement)
  NIGHT_25: {
    code: 'NIGHT_25',
    name: 'Night Work Premium',
    description: 'Applies to hours worked between 22:00 and 06:00, paid at a 25% premium over the base hourly rate. Taxable, contributory, included in APD, and may stack with Sunday, Holiday, or Overtime premiums.',
    calculation: 'premium_percentage',
    premiumRate: 0.25, // 25% premium over hourly rate
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true, // May stack with Sunday, Holiday, or Overtime premiums
    baseWage: false,
    applicableHours: {
      nightBand: { start: "22:00", end: "06:00" }
    },
    dependsOn: ['REG'], // References base hourly rate for calculation
    constraints: {
      maxHoursPerWeek: 40, // Same as regular hours limit
    }
  },

  // Overtime Tiers (Updated rates per Greek law)
  OT_TIER1_40: {
    code: 'OT_TIER1_40',
    name: 'Legal Overtime Within Cap (40%)',
    description: 'Overtime hours up to the legal cap are paid at a 40% premium. Taxable, contributory, included in APD, and stackable.',
    calculation: 'premium_percentage',
    premiumRate: 0.40,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false,
    constraints: {
      maxHoursPerYear: 150 // Legal annual overtime cap
    },
    dependsOn: ['REG']
  },

  OT_TIER2_60: {
    code: 'OT_TIER2_60',
    name: 'Overtime Above Cap (60%)',
    description: 'Overtime beyond the cap, with the appropriate permit, is paid at a 60% premium. Taxable, contributory, reported in APD, and stackable.',
    calculation: 'premium_percentage',
    premiumRate: 0.60,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false,
    dependsOn: ['REG']
  },

  OT_EXCEPTIONAL_80: {
    code: 'OT_EXCEPTIONAL_80',
    name: 'Non-Authorised Overtime (80%)',
    description: 'Paid at an 80% premium, but only used in exceptional cases through compliance workflows. Triggers a compliance alert.',
    calculation: 'premium_percentage',
    premiumRate: 0.80,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false,
    dependsOn: ['REG']
  },

  // Sunday and Holiday Premiums (Stackable with night work)
  SUNDAY_75: {
    code: 'SUNDAY_75',
    name: 'Sunday Premium',
    description: 'Hours worked on Sundays are paid at a 75% premium. Requires a legal work permit where applicable. Fully taxable, contributory, included in APD, and stackable.',
    calculation: 'premium_percentage',
    premiumRate: 0.75,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true, // Stackable with other premiums
    baseWage: false,
    applicableHours: {
      weekends: true
    },
    dependsOn: ['REG']
  },

  HOLIDAY_75: {
    code: 'HOLIDAY_75',
    name: 'Public Holiday Premium',
    description: 'Hours worked on public holidays are paid at a 75% premium. Fully taxable, contributory, included in APD, and stackable.',
    calculation: 'premium_percentage',
    premiumRate: 0.75,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true, // Stackable with other premiums
    baseWage: false,
    applicableHours: {
      holidays: true
    },
    dependsOn: ['REG']
  },

  // Sixth Working Day Premium
  SIXTH_DAY_40: {
    code: 'SIXTH_DAY_40',
    name: 'Sixth Working Day Premium',
    description: 'Sixth-day hours, where legally permitted, are paid at a 40% premium. Taxable, contributory, and included in APD. This code is disabled by default for hospitality and tourism, but may be enabled by specific entities if eligible.',
    calculation: 'premium_percentage',
    premiumRate: 0.40,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false,
    dependsOn: ['REG'],
    constraints: {
      maxHoursPerWeek: 8 // Typical sixth day limit
    }
  },



  TRANSPORT: {
    code: 'TRANSPORT',
    name: 'Transport Allowance',
    description: 'Transportation reimbursement',
    calculation: 'fixed_amount',
    taxable: true, // Generally taxable unless specific exemption
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  HOUSING: {
    code: 'HOUSING',
    name: 'Housing Allowance',
    description: 'Accommodation benefits or reimbursement',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  HAZARD_PAY: {
    code: 'HAZARD_PAY',
    name: 'Hazardous Work Premium',
    description: 'Additional compensation for dangerous or unhealthy work',
    calculation: 'premium_percentage',
    premiumRate: 0.20, // 20% premium typical for hazard work
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false,
    dependsOn: ['REG']
  },

  // Greek Mandatory Bonuses (Updated with tenure-based calculations)
  BONUS_EASTER: {
    code: 'BONUS_EASTER',
    name: 'Easter Bonus (Δώρο Πάσχα)',
    description: 'Calculated based on tenure and earnings, prorated for partial service. Taxable, contributory, and reported in APD.',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  BONUS_CHRISTMAS: {
    code: 'BONUS_CHRISTMAS',
    name: 'Christmas Bonus (Δώρο Χριστουγέννων)',
    description: 'Similar to Easter bonus, based on tenure and prorated. Fully taxable, contributory, and included in APD.',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  ALLOWANCE_LEAVE: {
    code: 'ALLOWANCE_LEAVE',
    name: 'Leave Allowance (Επίδομα Άδειας)',
    description: 'Calculated per tenure and earnings, prorated if leave is partial. Taxable, contributory, included in APD, and not stackable.',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: false, // Not stackable as specified
    baseWage: false
  },

  // Tips (Updated with Greek compliance rules)
  TIPS_DISTRIBUTED: {
    code: 'TIPS_DISTRIBUTED',
    name: 'Tips Distributed',
    description: 'Tips allocated through employer pooling rules. Always taxable, but EFKA contribution may be set as true/false depending on role or arrangement. Reported in APD and not stackable.',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true, // May be configurable per arrangement
    includedAPD: true,
    stackable: false, // Not stackable as specified
    baseWage: false
  },

  // Allowances (Updated with Greek tax limits)
  MEAL_VOUCHER: {
    code: 'MEAL_VOUCHER',
    name: 'Meal Vouchers',
    description: 'Non-taxable and non-contributory up to €6 per workday; any excess is taxable and contributory. System automatically splits exempt and taxable amounts. Partially included in APD.',
    calculation: 'fixed_amount',
    taxable: false, // Up to €6/day limit, excess is taxable
    contributoryEFKA: false, // Up to limit, excess is contributory
    includedAPD: true, // Partially included
    stackable: true,
    baseWage: false,
    constraints: {
      maxHoursPerMonth: 22 // ~22 work days per month, €6 per day limit
    }
  },

  TRAVEL_PER_DIEM: {
    code: 'TRAVEL_PER_DIEM',
    name: 'Travel Per Diem',
    description: 'Domestic and foreign per diems are non-taxable and non-contributory within statutory limits. Excess amounts are reclassified as taxable wages.',
    calculation: 'fixed_amount',
    taxable: false, // Within statutory limits, excess is taxable
    contributoryEFKA: false, // Within limits, excess is contributory
    includedAPD: false, // Generally not included unless excess
    stackable: true,
    baseWage: false
  },

  // Sick Pay and Benefits
  SICK_EMP_50: {
    code: 'SICK_EMP_50',
    name: 'Employer Sick Pay (50%)',
    description: 'Employer sick pay covers the first three days at 50%. Taxable, contributory, and included in APD. EFKA offsets beyond day three are recorded separately.',
    calculation: 'premium_percentage',
    premiumRate: 0.50, // 50% of regular pay
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: false, // Standalone sick pay
    baseWage: false,
    constraints: {
      maxHoursPerWeek: 24 // 3 days × 8 hours
    },
    dependsOn: ['REG']
  },

  SICK_EFKA: {
    code: 'SICK_EFKA',
    name: 'EFKA Sick Benefits',
    description: 'Benefits paid directly by EFKA. Not considered wages, hence non-taxable, non-contributory, and not included in APD (informational only).',
    calculation: 'fixed_amount',
    taxable: false,
    contributoryEFKA: false,
    includedAPD: false,
    stackable: false,
    baseWage: false
  },

  HOLIDAY_NOT_WORKED: {
    code: 'HOLIDAY_NOT_WORKED',
    name: 'Public Holiday Pay (Not Worked)',
    description: 'Salaried employees are entitled to paid public holidays at their daily wage. Taxable, contributory, and reported in APD.',
    calculation: 'hours_times_rate',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: false, // Standalone holiday pay
    baseWage: false,
    dependsOn: ['REG']
  }
};

export class StandardizedEarningsCodesService {
  
  // Get earnings code rule
  getEarningsCodeRule(code: string): EarningsCodeRule | null {
    return STANDARDIZED_EARNINGS_CODES[code] || null;
  }
  
  // Get all earnings codes
  getAllEarningsCodesRules(): Record<string, EarningsCodeRule> {
    return STANDARDIZED_EARNINGS_CODES;
  }
  
  // Validate if codes can be stacked together
  validateCodeStacking(primaryCode: string, stackedCodes: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const primaryRule = this.getEarningsCodeRule(primaryCode);
    
    if (!primaryRule) {
      errors.push(`Unknown primary earnings code: ${primaryCode}`);
      return { valid: false, errors };
    }
    
    // REG (Regular Hours) cannot stack with any other earnings type
    if (primaryCode === 'REG') {
      if (stackedCodes.length > 0) {
        errors.push(`REG (Regular Hours) does not stack with any other earnings type. Premiums must be separate payroll lines.`);
      }
      return { valid: errors.length === 0, errors };
    }
    
    // No other code can have REG as a stacked code
    if (stackedCodes.includes('REG')) {
      errors.push(`REG (Regular Hours) cannot be used as a stacked code. It must be a separate payroll line.`);
    }
    
    for (const stackedCode of stackedCodes) {
      const stackedRule = this.getEarningsCodeRule(stackedCode);
      
      if (!stackedRule) {
        errors.push(`Unknown stacked earnings code: ${stackedCode}`);
        continue;
      }
      
      // Check if the stacked code can actually be stacked
      if (!stackedRule.stackable) {
        errors.push(`${stackedCode} (${stackedRule.name}) cannot be stacked with other codes`);
      }
      
      // Check dependencies (premiums reference REG but as separate lines)
      if (stackedRule.dependsOn && stackedRule.dependsOn.includes('REG')) {
        // This is handled separately - premiums reference REG for calculation but are separate entries
        continue;
      }
      
      // Special case: NIGHT_25 can stack with Sunday, holiday, or overtime
      if (stackedCode === 'NIGHT_25') {
        const validStackingCodes = ['SUNDAY_75', 'HOLIDAY_75', 'SIXTH_DAY_40', 'OT_TIER1_40', 'OT_TIER2_60', 'OT_EXCEPTIONAL_80'];
        const otherStackedCodes = stackedCodes.filter(c => c !== 'NIGHT_25');
        const invalidStacking = otherStackedCodes.filter(c => !validStackingCodes.includes(c));
        
        if (invalidStacking.length > 0) {
          errors.push(`NIGHT_25 can only be stacked with overtime, Sunday, holiday, or sixth day premiums, not with: ${invalidStacking.join(', ')}`);
        }
      }

      // Special case: OT_EXCEPTIONAL_80 triggers compliance alert
      if (stackedCode === 'OT_EXCEPTIONAL_80' || primaryCode === 'OT_EXCEPTIONAL_80') {
        errors.push(`WARNING: OT_EXCEPTIONAL_80 triggers a compliance alert and should only be used in exceptional cases through compliance workflows`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Calculate earnings amount based on code rule
  calculateEarningsAmount(
    code: string, 
    hourlyRate: number, 
    hours: number, 
    fixedAmount?: number
  ): { amount: number; calculation: string } {
    const rule = this.getEarningsCodeRule(code);
    if (!rule) {
      throw new Error(`Unknown earnings code: ${code}`);
    }
    
    let amount = 0;
    let calculation = '';
    
    switch (rule.calculation) {
      case 'hours_times_rate':
        amount = hours * hourlyRate;
        calculation = `${hours} hours × €${hourlyRate}/hr = €${amount.toFixed(2)}`;
        break;
        
      case 'premium_percentage':
        if (!rule.premiumRate) {
          throw new Error(`Premium rate not defined for ${code}`);
        }
        const premiumAmount = hours * hourlyRate * rule.premiumRate;
        amount = premiumAmount;
        calculation = `${hours} hours × €${hourlyRate}/hr × ${(rule.premiumRate * 100)}% premium = €${amount.toFixed(2)}`;
        break;
        
      case 'fixed_amount':
        if (fixedAmount === undefined) {
          throw new Error(`Fixed amount must be provided for ${code}`);
        }
        amount = fixedAmount;
        calculation = `Fixed amount = €${amount.toFixed(2)}`;
        break;
        
      default:
        throw new Error(`Unknown calculation method: ${rule.calculation}`);
    }
    
    return { amount, calculation };
  }
  
  // Check if earnings code is subject to specific tax/contribution
  isTaxable(code: string): boolean {
    const rule = this.getEarningsCodeRule(code);
    return rule?.taxable || false;
  }
  
  isContributoryEFKA(code: string): boolean {
    const rule = this.getEarningsCodeRule(code);
    return rule?.contributoryEFKA || false;
  }
  
  isIncludedAPD(code: string): boolean {
    const rule = this.getEarningsCodeRule(code);
    return rule?.includedAPD || false;
  }
  
  // Get applicable time constraints
  getTimeConstraints(code: string): EarningsCodeRule['constraints'] | null {
    const rule = this.getEarningsCodeRule(code);
    return rule?.constraints || null;
  }
  
  // Validate hours against constraints
  validateHoursConstraints(
    code: string, 
    hours: number, 
    period: 'week' | 'month' | 'year'
  ): { valid: boolean; maxAllowed?: number; error?: string } {
    const constraints = this.getTimeConstraints(code);
    if (!constraints) {
      return { valid: true };
    }
    
    let maxAllowed: number | undefined;
    let constraint: number | undefined;
    
    switch (period) {
      case 'week':
        constraint = constraints.maxHoursPerWeek;
        break;
      case 'month':
        constraint = constraints.maxHoursPerMonth;
        break;
      case 'year':
        constraint = constraints.maxHoursPerYear;
        break;
    }
    
    if (constraint !== undefined) {
      maxAllowed = constraint;
      if (hours > constraint) {
        return {
          valid: false,
          maxAllowed,
          error: `Hours (${hours}) exceed maximum allowed for ${code} in ${period}: ${constraint}`
        };
      }
    }
    
    return { valid: true, maxAllowed };
  }
  
  // Generate earnings breakdown report
  generateEarningsBreakdown(earnings: Array<{
    code: string;
    hours: number;
    hourlyRate: number;
    fixedAmount?: number;
  }>): {
    totalGross: number;
    taxableAmount: number;
    efkaContributoryAmount: number;
    apdIncludedAmount: number;
    breakdown: Array<{
      code: string;
      name: string;
      amount: number;
      calculation: string;
      taxable: boolean;
      contributoryEFKA: boolean;
      includedAPD: boolean;
    }>;
  } {
    let totalGross = 0;
    let taxableAmount = 0;
    let efkaContributoryAmount = 0;
    let apdIncludedAmount = 0;
    
    const breakdown = earnings.map(earning => {
      const rule = this.getEarningsCodeRule(earning.code);
      if (!rule) {
        throw new Error(`Unknown earnings code: ${earning.code}`);
      }
      
      const { amount, calculation } = this.calculateEarningsAmount(
        earning.code,
        earning.hourlyRate,
        earning.hours,
        earning.fixedAmount
      );
      
      totalGross += amount;
      
      if (rule.taxable) taxableAmount += amount;
      if (rule.contributoryEFKA) efkaContributoryAmount += amount;
      if (rule.includedAPD) apdIncludedAmount += amount;
      
      return {
        code: earning.code,
        name: rule.name,
        amount,
        calculation,
        taxable: rule.taxable,
        contributoryEFKA: rule.contributoryEFKA,
        includedAPD: rule.includedAPD
      };
    });
    
    return {
      totalGross,
      taxableAmount,
      efkaContributoryAmount,
      apdIncludedAmount,
      breakdown
    };
  }
}