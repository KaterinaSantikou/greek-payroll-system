/**
 * Greek Employment Types Service
 * 
 * Handles specialized payroll calculations for:
 * 1. Apprenticeships (Μαθητεία ΕΠΑΛ/ΙΕΚ) - Law 3475/2006
 * 2. Part-time with variable hours (εκ περιτροπής εργασία)
 * 3. Seasonal employees (ξενοδοχεία/τουρισμός) - Law 1346/1983
 * 4. Multiple employers (πολλαπλή απασχόληση)
 */

interface ApprenticeshipCalculation {
  baseSalary: number;
  adjustedSalary: number; // 75% of minimum wage
  efkaReduction: number;
  efkaEmployeeRate: number;
  efkaEmployerRate: number;
}

interface VariableHoursCalculation {
  contractedHours: number;
  actualHours: number;
  prorationFactor: number;
  baseSalary: number;
  proratedSalary: number;
  nightPremium: number;
  sundayPremium: number;
  overtimePremium: number;
}

interface SeasonalEmployeeCalculation {
  contractStart: Date;
  contractEnd: Date;
  actualTermination?: Date;
  earlyTermination: boolean;
  severanceAmount: number;
  severanceReason: string;
}

interface MultipleEmployersData {
  employeeAfm: string;
  taxYear: number;
  allEmployers: Array<{
    employerAfm: string;
    grossEarnings: number;
    taxDeducted: number;
    efkaContributions: number;
    isPrimary: boolean;
  }>;
  cumulativeGross: number;
  cumulativeTax: number;
  taxFreeThresholdUsed: number;
}

export class GreekEmploymentTypesService {
  private static readonly MINIMUM_WAGE_2025 = 830; // €830 gross/month
  private static readonly APPRENTICE_WAGE_RATE = 0.75; // 75% of minimum wage
  private static readonly TAX_FREE_THRESHOLD_2025 = 9200; // Annual tax-free threshold
  
  /**
   * Calculate apprenticeship wages and EFKA contributions
   * Law 3475/2006 - 75% of minimum wage, reduced EFKA contributions
   */
  calculateApprenticeshipWages(
    baseSalary: number,
    monthsCompleted: number = 0
  ): ApprenticeshipCalculation {
    // Apprentices get 75% of minimum wage
    const adjustedSalary = Math.max(
      baseSalary,
      GreekEmploymentTypesService.MINIMUM_WAGE_2025 * GreekEmploymentTypesService.APPRENTICE_WAGE_RATE
    );

    // Reduced EFKA rates for apprentices (Law 3475/2006)
    const efkaEmployeeRate = 0.0667; // 6.67% (reduced from normal 9.33%)
    const efkaEmployerRate = 0.1350; // 13.50% (reduced from normal 22.29%)
    
    const efkaReduction = (adjustedSalary * 0.0266); // 2.66% reduction for employee

    return {
      baseSalary,
      adjustedSalary,
      efkaReduction,
      efkaEmployeeRate,
      efkaEmployerRate
    };
  }

  /**
   * Calculate variable hours part-time wages
   * Prorated salary based on actual hours worked, premiums only on actual hours
   */
  calculateVariableHours(
    contractedHours: number,
    actualHours: number,
    baseSalary: number,
    nightHours: number = 0,
    sundayHours: number = 0,
    overtimeHours: number = 0
  ): VariableHoursCalculation {
    const prorationFactor = actualHours / contractedHours;
    const proratedSalary = baseSalary * prorationFactor;
    
    // Calculate premiums only on actual worked hours
    const hourlyRate = baseSalary / contractedHours;
    const nightPremium = nightHours * hourlyRate * 0.25; // 25% night premium
    const sundayPremium = sundayHours * hourlyRate * 0.75; // 75% Sunday premium
    const overtimePremium = overtimeHours * hourlyRate * 0.25; // 25% overtime premium

    return {
      contractedHours,
      actualHours,
      prorationFactor,
      baseSalary,
      proratedSalary,
      nightPremium,
      sundayPremium,
      overtimePremium
    };
  }

  /**
   * Calculate seasonal employee severance
   * Law 1346/1983 - Early termination severance rules
   */
  calculateSeasonalSeverance(
    contractStart: Date,
    contractEnd: Date,
    actualTermination: Date | null,
    monthlySalary: number,
    terminationReason: 'employer' | 'employee' | 'mutual' | 'natural'
  ): SeasonalEmployeeCalculation {
    const actualTerm = actualTermination || contractEnd;
    const earlyTermination = actualTerm < contractEnd;
    
    let severanceAmount = 0;
    let severanceReason = '';

    if (earlyTermination && terminationReason === 'employer') {
      // Employer-initiated early termination requires severance
      const contractDurationMonths = this.getMonthsBetween(contractStart, contractEnd);
      const workedMonths = this.getMonthsBetween(contractStart, actualTerm);
      
      if (contractDurationMonths >= 6 && workedMonths >= 2) {
        // Law 1346/1983: Severance for seasonal workers
        severanceAmount = monthlySalary * 0.5; // Half month salary
        severanceReason = 'Early termination severance per Law 1346/1983';
      }
    }

    return {
      contractStart,
      contractEnd,
      actualTermination: actualTerm,
      earlyTermination,
      severanceAmount,
      severanceReason
    };
  }

  /**
   * Calculate cumulative tax for multiple employers
   * Tax-free threshold applies per person, not per employer
   */
  calculateMultipleEmployersTax(
    employeeAfm: string,
    currentGross: number,
    existingData: MultipleEmployersData
  ): { taxDue: number; cumulativeTax: number; taxFreeRemaining: number } {
    const newCumulativeGross = existingData.cumulativeGross + currentGross;
    
    // Calculate total tax due on cumulative income
    const totalTaxDue = this.calculateGreekIncomeTax(newCumulativeGross);
    
    // Tax due for current employer is difference minus what others already paid
    const taxDue = Math.max(0, totalTaxDue - existingData.cumulativeTax);
    
    const taxFreeRemaining = Math.max(0, GreekEmploymentTypesService.TAX_FREE_THRESHOLD_2025 - newCumulativeGross);

    return {
      taxDue,
      cumulativeTax: totalTaxDue,
      taxFreeRemaining
    };
  }

  /**
   * Calculate Greek income tax using progressive rates
   */
  private calculateGreekIncomeTax(annualGross: number): number {
    // 2025 Greek tax brackets
    if (annualGross <= 9200) return 0; // Tax-free threshold
    if (annualGross <= 20000) return (annualGross - 9200) * 0.09; // 9%
    if (annualGross <= 30000) return (20000 - 9200) * 0.09 + (annualGross - 20000) * 0.22; // 22%
    if (annualGross <= 40000) return (20000 - 9200) * 0.09 + 10000 * 0.22 + (annualGross - 30000) * 0.28; // 28%
    
    // Higher brackets continue...
    return (20000 - 9200) * 0.09 + 10000 * 0.22 + 10000 * 0.28 + (annualGross - 40000) * 0.36; // 36%
  }

  /**
   * Get months between two dates
   */
  private getMonthsBetween(startDate: Date, endDate: Date): number {
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    return years * 12 + months;
  }

  /**
   * Validate employment type specific requirements
   */
  validateEmploymentType(
    employmentType: string,
    contractData: any,
    employeeAge?: number
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (employmentType) {
      case 'apprenticeship':
        if (!contractData.apprenticeshipDuration) {
          errors.push('Apprenticeship duration is required');
        }
        if (contractData.apprenticeshipDuration > 24) {
          warnings.push('Apprenticeship duration exceeds typical 24-month limit');
        }
        if (employeeAge && employeeAge < 15) {
          errors.push('Employee must be at least 15 years old for apprenticeship');
        }
        break;

      case 'part_time_variable':
        if (!contractData.variableHoursMin || !contractData.variableHoursMax) {
          errors.push('Variable hours minimum and maximum must be specified');
        }
        if (contractData.variableHoursMax > 40) {
          errors.push('Variable hours maximum cannot exceed 40 hours per week');
        }
        break;

      case 'seasonal':
        if (!contractData.seasonalEndDate) {
          errors.push('Seasonal end date is required');
        }
        const seasonalDuration = contractData.seasonalEndDate && contractData.effectiveFrom ? 
          this.getMonthsBetween(new Date(contractData.effectiveFrom), new Date(contractData.seasonalEndDate)) : 0;
        if (seasonalDuration > 8) {
          warnings.push('Seasonal contract exceeds typical 8-month duration');
        }
        break;

      case 'multiple_employers':
        if (!contractData.otherEmployersAfm || contractData.otherEmployersAfm.length === 0) {
          warnings.push('Other employers should be specified for multiple employers contract');
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
   * Get employment type display information
   */
  getEmploymentTypeInfo(employmentType: string): {
    name: string;
    nameGreek: string;
    description: string;
    legalBasis: string;
  } {
    const types = {
      apprenticeship: {
        name: 'Apprenticeship',
        nameGreek: 'Μαθητεία ΕΠΑΛ/ΙΕΚ',
        description: '75% of minimum wage, reduced EFKA contributions, time-limited contract',
        legalBasis: 'Law 3475/2006'
      },
      part_time_variable: {
        name: 'Part-time Variable Hours',
        nameGreek: 'Εκ περιτροπής εργασία',
        description: 'Prorated salary by actual hours worked, premiums on actual hours only',
        legalBasis: 'Greek Labor Law'
      },
      seasonal: {
        name: 'Seasonal Employment',
        nameGreek: 'Εποχιακή απασχόληση ξενοδοχεία/τουρισμός',
        description: '6-8 month contracts, early termination severance rules',
        legalBasis: 'Law 1346/1983'
      },
      multiple_employers: {
        name: 'Multiple Employers',
        nameGreek: 'Πολλαπλή απασχόληση',
        description: 'EFKA per employer, tax-free threshold per person',
        legalBasis: 'Greek Tax Code'
      }
    };

    return types[employmentType as keyof typeof types] || {
      name: 'Unknown',
      nameGreek: 'Άγνωστο',
      description: 'Unknown employment type',
      legalBasis: 'N/A'
    };
  }
}

export const greekEmploymentTypesService = new GreekEmploymentTypesService();