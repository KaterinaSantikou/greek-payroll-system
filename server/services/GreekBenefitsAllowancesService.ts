/**
 * Greek Benefits and Allowances Service
 * 
 * Handles specialized Greek benefits with proper tax treatment:
 * 1. Meal vouchers (non-tax up to €6/day)
 * 2. Travel per diems with statutory exemption limits
 * 3. Tips distribution for hotels/restaurants
 * 4. In-kind benefits with AADE valuation rules
 */

interface MealVoucherCalculation {
  totalAmount: number;
  dailyAmount: number;
  daysWorked: number;
  exemptAmount: number; // Up to €6/day
  taxableAmount: number; // Excess over €6/day
  taxFreeThreshold: number; // €6/day
  isFullyExempt: boolean;
}

interface TravelPerDiemCalculation {
  totalAmount: number;
  daysEligible: number;
  domesticRate: number;
  internationalRate: number;
  exemptAmount: number; // Up to statutory limits
  taxableAmount: number; // Excess
  statutoryLimits: {
    domestic: number; // €30/day for domestic travel
    international: number; // €60/day for international travel
  };
}

interface TipsDistributionCalculation {
  totalTipsCollected: number;
  employeeShare: number;
  poolPercentage: number;
  isContributory: boolean; // If part of payroll
  isServiceCharge: boolean; // Service charges sometimes exempt
  taxableAmount: number;
  exemptAmount: number;
  efkaContributions: number;
}

interface InKindBenefitCalculation {
  benefitType: 'company_car' | 'accommodation' | 'stock_options' | 'other';
  marketValue: number;
  aadeAssessedValue: number;
  taxableValue: number;
  efkaExempt: boolean;
  taxDescription: string;
  valuationMethod: string;
}

export class GreekBenefitsAllowancesService {
  private static readonly MEAL_VOUCHER_DAILY_EXEMPT = 6.00; // €6 per day tax-free
  private static readonly TRAVEL_PER_DIEM_DOMESTIC = 30.00; // €30/day domestic
  private static readonly TRAVEL_PER_DIEM_INTERNATIONAL = 60.00; // €60/day international
  private static readonly TIPS_TAX_RATE = 0.15; // 15% tax rate on tips
  private static readonly SERVICE_CHARGE_EXEMPT_THRESHOLD = 0.08; // 8% of turnover exempt

  /**
   * Calculate meal voucher tax treatment
   * Non-taxable up to €6/day, excess is taxable
   */
  calculateMealVouchers(
    totalAmount: number,
    daysWorked: number
  ): MealVoucherCalculation {
    const dailyAmount = totalAmount / daysWorked;
    const dailyExemptAmount = Math.min(dailyAmount, GreekBenefitsAllowancesService.MEAL_VOUCHER_DAILY_EXEMPT);
    const dailyTaxableAmount = Math.max(0, dailyAmount - GreekBenefitsAllowancesService.MEAL_VOUCHER_DAILY_EXEMPT);
    
    const exemptAmount = dailyExemptAmount * daysWorked;
    const taxableAmount = dailyTaxableAmount * daysWorked;
    
    return {
      totalAmount,
      dailyAmount,
      daysWorked,
      exemptAmount,
      taxableAmount,
      taxFreeThreshold: GreekBenefitsAllowancesService.MEAL_VOUCHER_DAILY_EXEMPT,
      isFullyExempt: dailyAmount <= GreekBenefitsAllowancesService.MEAL_VOUCHER_DAILY_EXEMPT
    };
  }

  /**
   * Calculate travel per diem tax treatment
   * Exempt up to statutory limits (€30 domestic, €60 international)
   */
  calculateTravelPerDiem(
    totalAmount: number,
    daysEligible: number,
    isInternational: boolean = false
  ): TravelPerDiemCalculation {
    const statutoryLimits = {
      domestic: GreekBenefitsAllowancesService.TRAVEL_PER_DIEM_DOMESTIC,
      international: GreekBenefitsAllowancesService.TRAVEL_PER_DIEM_INTERNATIONAL
    };
    
    const applicableRate = isInternational ? statutoryLimits.international : statutoryLimits.domestic;
    const dailyAmount = totalAmount / daysEligible;
    
    const dailyExemptAmount = Math.min(dailyAmount, applicableRate);
    const dailyTaxableAmount = Math.max(0, dailyAmount - applicableRate);
    
    const exemptAmount = dailyExemptAmount * daysEligible;
    const taxableAmount = dailyTaxableAmount * daysEligible;
    
    return {
      totalAmount,
      daysEligible,
      domesticRate: statutoryLimits.domestic,
      internationalRate: statutoryLimits.international,
      exemptAmount,
      taxableAmount,
      statutoryLimits
    };
  }

  /**
   * Calculate tips distribution for hotels/restaurants
   * Employer-managed pool: contributory if part of payroll
   */
  calculateTipsDistribution(
    totalTipsCollected: number,
    employeePointsOrHours: number,
    totalPointsOrHours: number,
    distributionMethod: 'points' | 'hours' | 'equal' = 'points',
    isPartOfPayroll: boolean = true,
    isServiceCharge: boolean = false
  ): TipsDistributionCalculation {
    let employeeShare = 0;
    let poolPercentage = 0;
    
    switch (distributionMethod) {
      case 'points':
      case 'hours':
        poolPercentage = employeePointsOrHours / totalPointsOrHours;
        employeeShare = totalTipsCollected * poolPercentage;
        break;
      case 'equal':
        poolPercentage = 1 / totalPointsOrHours; // totalPointsOrHours = number of employees
        employeeShare = totalTipsCollected * poolPercentage;
        break;
    }
    
    // Tax treatment
    let taxableAmount = employeeShare;
    let exemptAmount = 0;
    
    // Service charges up to 8% of turnover may be exempt
    if (isServiceCharge) {
      // This would require turnover data to calculate exact exemption
      // For now, assuming standard treatment
      taxableAmount = employeeShare;
    }
    
    // EFKA contributions apply if part of payroll
    const efkaContributions = isPartOfPayroll ? employeeShare * 0.0933 : 0; // 9.33% employee EFKA
    
    return {
      totalTipsCollected,
      employeeShare,
      poolPercentage,
      isContributory: isPartOfPayroll,
      isServiceCharge,
      taxableAmount,
      exemptAmount,
      efkaContributions
    };
  }

  /**
   * Calculate in-kind benefits with AADE valuation rules
   * Company car, accommodation, stock options
   */
  calculateInKindBenefit(
    benefitType: 'company_car' | 'accommodation' | 'stock_options' | 'other',
    marketValue: number,
    benefitDetails: any = {}
  ): InKindBenefitCalculation {
    let aadeAssessedValue = marketValue;
    let taxableValue = marketValue;
    let efkaExempt = false;
    let taxDescription = '';
    let valuationMethod = 'market_value';

    switch (benefitType) {
      case 'company_car':
        // AADE rules: 1.2% of car value per month, minimum €50/month
        const monthlyRate = Math.max(marketValue * 0.012, 50);
        aadeAssessedValue = monthlyRate * 12; // Annual value
        taxableValue = aadeAssessedValue;
        taxDescription = 'Company car benefit - 1.2% of value per month (min €50)';
        valuationMethod = 'aade_automotive_1.2%';
        efkaExempt = false;
        break;

      case 'accommodation':
        // AADE rules: Market rent value or 0.3% of property value per month
        const propertyValue = benefitDetails.propertyValue || marketValue;
        const marketRent = benefitDetails.marketRent || (propertyValue * 0.003);
        aadeAssessedValue = Math.min(marketRent * 12, propertyValue * 0.036);
        taxableValue = aadeAssessedValue;
        taxDescription = 'Accommodation benefit - market rent or 0.3% property value monthly';
        valuationMethod = 'aade_accommodation_market_rent';
        efkaExempt = false;
        break;

      case 'stock_options':
        // Stock options: taxable at exercise, value = market price - exercise price
        const exercisePrice = benefitDetails.exercisePrice || 0;
        const marketPrice = benefitDetails.marketPrice || marketValue;
        aadeAssessedValue = Math.max(0, marketPrice - exercisePrice);
        taxableValue = aadeAssessedValue;
        taxDescription = 'Stock options benefit - market value minus exercise price at vesting';
        valuationMethod = 'aade_stock_options_exercise_value';
        efkaExempt = true; // Stock options often exempt from EFKA
        break;

      case 'other':
        // Other benefits: generally at market value
        aadeAssessedValue = marketValue;
        taxableValue = marketValue;
        taxDescription = 'Other in-kind benefit - market value assessment';
        valuationMethod = 'aade_market_value';
        efkaExempt = benefitDetails.efkaExempt || false;
        break;
    }

    return {
      benefitType,
      marketValue,
      aadeAssessedValue,
      taxableValue,
      efkaExempt,
      taxDescription,
      valuationMethod
    };
  }

  /**
   * Calculate total benefits impact on payroll
   */
  calculateTotalBenefitsImpact(
    mealVouchers: MealVoucherCalculation,
    travelPerDiem: TravelPerDiemCalculation,
    tips: TipsDistributionCalculation,
    inKindBenefits: InKindBenefitCalculation[]
  ): {
    totalBenefitsValue: number;
    totalTaxableAmount: number;
    totalExemptAmount: number;
    totalEfkaContributions: number;
    incomeTaxImpact: number;
    benefitsSummary: any;
  } {
    const totalInKindTaxable = inKindBenefits.reduce((sum, benefit) => sum + benefit.taxableValue, 0);
    const totalInKindEfka = inKindBenefits
      .filter(benefit => !benefit.efkaExempt)
      .reduce((sum, benefit) => sum + benefit.taxableValue * 0.0933, 0);

    const totalTaxableAmount = 
      mealVouchers.taxableAmount +
      travelPerDiem.taxableAmount +
      tips.taxableAmount +
      totalInKindTaxable;

    const totalExemptAmount =
      mealVouchers.exemptAmount +
      travelPerDiem.exemptAmount +
      tips.exemptAmount;

    const totalEfkaContributions =
      tips.efkaContributions +
      totalInKindEfka;

    // Estimate income tax impact (using progressive rates)
    const incomeTaxImpact = this.calculateIncomeTaxImpact(totalTaxableAmount);

    return {
      totalBenefitsValue: totalTaxableAmount + totalExemptAmount,
      totalTaxableAmount,
      totalExemptAmount,
      totalEfkaContributions,
      incomeTaxImpact,
      benefitsSummary: {
        mealVouchers: {
          total: mealVouchers.totalAmount,
          exempt: mealVouchers.exemptAmount,
          taxable: mealVouchers.taxableAmount
        },
        travelPerDiem: {
          total: travelPerDiem.totalAmount,
          exempt: travelPerDiem.exemptAmount,
          taxable: travelPerDiem.taxableAmount
        },
        tips: {
          total: tips.employeeShare,
          taxable: tips.taxableAmount,
          efkaContributions: tips.efkaContributions
        },
        inKindBenefits: inKindBenefits.map(benefit => ({
          type: benefit.benefitType,
          marketValue: benefit.marketValue,
          taxableValue: benefit.taxableValue,
          efkaExempt: benefit.efkaExempt
        }))
      }
    };
  }

  /**
   * Validate benefits eligibility
   */
  validateBenefitsEligibility(
    benefitType: string,
    employeeData: any,
    benefitAmount: number
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (benefitType) {
      case 'meal_vouchers':
        if (benefitAmount <= 0) {
          errors.push('Meal voucher amount must be positive');
        }
        if (benefitAmount > GreekBenefitsAllowancesService.MEAL_VOUCHER_DAILY_EXEMPT * 30) {
          warnings.push(`High meal voucher amount - consider tax implications above €${GreekBenefitsAllowancesService.MEAL_VOUCHER_DAILY_EXEMPT}/day`);
        }
        break;

      case 'travel_per_diem':
        if (!employeeData.travelEligible) {
          warnings.push('Employee may not be eligible for travel per diems');
        }
        break;

      case 'tips':
        if (!employeeData.tipsEligible) {
          errors.push('Employee is not eligible for tips distribution');
        }
        break;

      case 'company_car':
        if (!employeeData.drivingLicense) {
          errors.push('Valid driving license required for company car benefit');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get Greek benefits statutory limits and rates
   */
  getGreekBenefitsLimits(): {
    mealVoucherDailyLimit: number;
    travelPerDiemLimits: { domestic: number; international: number };
    tipsMinimumWage: number;
    aadeValuationRates: any;
  } {
    return {
      mealVoucherDailyLimit: GreekBenefitsAllowancesService.MEAL_VOUCHER_DAILY_EXEMPT,
      travelPerDiemLimits: {
        domestic: GreekBenefitsAllowancesService.TRAVEL_PER_DIEM_DOMESTIC,
        international: GreekBenefitsAllowancesService.TRAVEL_PER_DIEM_INTERNATIONAL
      },
      tipsMinimumWage: 830, // €830 minimum wage 2025
      aadeValuationRates: {
        companyCar: { rate: 0.012, minimum: 50 }, // 1.2% per month, min €50
        accommodation: { rate: 0.003 }, // 0.3% per month
        stockOptions: { method: 'exercise_value' }
      }
    };
  }

  /**
   * Calculate estimated income tax impact
   */
  private calculateIncomeTaxImpact(taxableAmount: number): number {
    // Simplified Greek progressive tax calculation
    if (taxableAmount <= 10000) {
      return taxableAmount * 0.09; // 9%
    } else if (taxableAmount <= 20000) {
      return 900 + (taxableAmount - 10000) * 0.22; // 22%
    } else if (taxableAmount <= 30000) {
      return 3100 + (taxableAmount - 20000) * 0.28; // 28%
    } else {
      return 5900 + (taxableAmount - 30000) * 0.36; // 36%
    }
  }
}

export const greekBenefitsAllowancesService = new GreekBenefitsAllowancesService();