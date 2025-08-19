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
    description: 'Standard work hours at base hourly rate',
    calculation: 'hours_times_rate',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: false, // Base wage doesn't stack
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
    name: 'Night Work Premium (25%)',
    description: 'Premium for hours worked during night band (22:00-06:00)',
    calculation: 'premium_percentage',
    premiumRate: 0.25, // 25% premium over hourly rate
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true, // Can stack with Sunday, holiday, or overtime
    baseWage: false,
    applicableHours: {
      nightBand: { start: "22:00", end: "06:00" }
    },
    dependsOn: ['REG'], // Must have regular hours to calculate premium
    constraints: {
      maxHoursPerWeek: 40, // Same as regular hours limit
    }
  },

  // Overtime Tiers (Building on night premium concept)
  OT_T1_25PCT: {
    code: 'OT_T1_25PCT',
    name: 'Overtime Tier 1 (25%)',
    description: 'First overtime tier: 41-45 hours per week at 25% premium',
    calculation: 'premium_percentage',
    premiumRate: 0.25,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false,
    constraints: {
      maxHoursPerWeek: 5, // Hours 41-45
      maxHoursPerYear: 150 // Annual OT cap
    },
    dependsOn: ['REG']
  },

  OT_T2_50PCT: {
    code: 'OT_T2_50PCT',
    name: 'Overtime Tier 2 (50%)',
    description: 'Second overtime tier: 46+ hours per week at 50% premium',
    calculation: 'premium_percentage',
    premiumRate: 0.50,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false,
    constraints: {
      maxHoursPerWeek: 5, // Hours 46-50 (legal max)
      maxHoursPerYear: 150 // Annual OT cap
    },
    dependsOn: ['REG']
  },

  // Sunday and Holiday Premiums (Stackable with night work)
  SUNDAY_75PCT: {
    code: 'SUNDAY_75PCT',
    name: 'Sunday Work Premium (75%)',
    description: 'Premium for Sunday work at 75% over hourly rate',
    calculation: 'premium_percentage',
    premiumRate: 0.75,
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true, // Can stack with night premium
    baseWage: false,
    applicableHours: {
      weekends: true
    },
    dependsOn: ['REG']
  },

  HOLIDAY_PREMIUM: {
    code: 'HOLIDAY_PREMIUM',
    name: 'Public Holiday Premium',
    description: 'Premium for work on public holidays',
    calculation: 'premium_percentage',
    premiumRate: 0.75, // Same as Sunday rate
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true, // Can stack with night premium
    baseWage: false,
    applicableHours: {
      holidays: true
    },
    dependsOn: ['REG']
  },

  // Allowances (Tax treatment varies)
  MEAL_VOUCHER: {
    code: 'MEAL_VOUCHER',
    name: 'Meal Vouchers',
    description: 'Tax-free meal allowance up to €6.00 per work day',
    calculation: 'fixed_amount',
    taxable: false, // Tax-free up to €6/day
    contributoryEFKA: false,
    includedAPD: false,
    stackable: true,
    baseWage: false,
    constraints: {
      maxHoursPerMonth: 22 // Approximately 22 work days per month
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

  // Greek Mandatory Bonuses
  EASTER_BONUS: {
    code: 'EASTER_BONUS',
    name: 'Easter Bonus (Δώρο Πάσχα)',
    description: 'Mandatory Easter bonus equal to half monthly salary',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  CHRISTMAS_BONUS: {
    code: 'CHRISTMAS_BONUS',
    name: 'Christmas Bonus (Δώρο Χριστουγέννων)',
    description: 'Mandatory Christmas bonus equal to one monthly salary',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  VACATION_PAY: {
    code: 'VACATION_PAY',
    name: 'Vacation Pay (Επίδομα Άδειας)',
    description: 'Mandatory vacation allowance equal to half monthly salary',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  // Tips (Special handling for hotel industry)
  CASH_TIPS: {
    code: 'CASH_TIPS',
    name: 'Cash Tips',
    description: 'Direct cash tips received from customers',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  CARD_TIPS: {
    code: 'CARD_TIPS',
    name: 'Card Tips',
    description: 'Tips received through card payments',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
  },

  TIP_POOL_DIST: {
    code: 'TIP_POOL_DIST',
    name: 'Tip Pool Distribution',
    description: 'Share of pooled tips based on role and performance',
    calculation: 'fixed_amount',
    taxable: true,
    contributoryEFKA: true,
    includedAPD: true,
    stackable: true,
    baseWage: false
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
      
      // Check dependencies
      if (stackedRule.dependsOn && !stackedRule.dependsOn.includes(primaryCode)) {
        errors.push(`${stackedCode} depends on ${stackedRule.dependsOn?.join(', ')} but primary code is ${primaryCode}`);
      }
      
      // Special case: NIGHT_25 can stack with Sunday, holiday, or overtime
      if (stackedCode === 'NIGHT_25') {
        const validStackingCodes = ['SUNDAY_75PCT', 'HOLIDAY_PREMIUM', 'OT_T1_25PCT', 'OT_T2_50PCT'];
        const otherStackedCodes = stackedCodes.filter(c => c !== 'NIGHT_25');
        const invalidStacking = otherStackedCodes.filter(c => !validStackingCodes.includes(c));
        
        if (invalidStacking.length > 0) {
          errors.push(`NIGHT_25 can only be stacked with overtime, Sunday, or holiday premiums, not with: ${invalidStacking.join(', ')}`);
        }
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