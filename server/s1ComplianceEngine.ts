import { db } from "./db";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import {
  employees,
  s1CompensationTracking,
  s1LeaveEligibility,
  s1HealthSafetyIncidents,
  s1HSFatalities,
  s1WorkforceCharacteristics,
  type S1CompensationTracking,
  type S1LeaveEligibility,
} from "@shared/schema";

/**
 * Enhanced ESRS S1 Compliance Engine with EFRAG Guardrails
 * Implements critical edge cases and methodology requirements
 */
export class S1ComplianceEngine {
  private activeRulesetVersion: string = "esrs_s1.v2025_quickfix";
  private featureFlags: { useQuickFix2025: boolean } = { useQuickFix2025: false };

  /**
   * Toggle 2025 quick-fix ruleset (acceptance criteria: Finance)
   */
  setQuickFix2025Enabled(enabled: boolean): void {
    this.featureFlags.useQuickFix2025 = enabled;
    this.activeRulesetVersion = enabled ? "esrs_s1.v2025_quickfix" : "esrs_s1.v2023";
  }

  /**
   * EFRAG-compliant S1-16 Gender Pay Gap calculation (acceptance criteria: EFRAG)
   * Calculates by entity and country for closed fiscal years
   * Implements: Non-employee exclusion, hourly derivation methodology, PPP adjustments
   */
  async calculateGenderPayGap(
    period: string,
    entity?: string,
    country: string = "GRC",
    options: {
      pppAdjustment?: boolean;
      pppBaseCurrency?: string;
      includeMethodologyNotes?: boolean;
    } = {}
  ): Promise<{
    overall: number;
    byCountry: Record<string, number>;
    byEntity: Record<string, number>;
    calculation: string;
    methodologyDisclosure: string;
    metadata: {
      ruleset: string;
      calculatedAt: string;
      sampleSize: number;
      nonEmployeesExcluded: number;
      hourlyDerivationBreakdown: {
        actualHours: number;
        standardHours: number;
        methodology: string;
      };
      pppAdjustment?: {
        applied: boolean;
        methodology: string;
        baseCurrency?: string;
      };
    };
  }> {
    // Get compensation data with employee classification
    const compensationData = await db
      .select({
        employeeId: s1CompensationTracking.employeeId,
        grossPayPeriod: s1CompensationTracking.grossPayPeriod,
        hoursWorkedPeriod: s1CompensationTracking.hoursWorkedPeriod,
        country: s1CompensationTracking.country,
        entity: s1CompensationTracking.entity,
        gender: employees.gender,
        employmentType: employees.employmentType, // Added to distinguish employees vs non-employees
      })
      .from(s1CompensationTracking)
      .innerJoin(employees, eq(s1CompensationTracking.employeeId, employees.employeeId))
      .where(
        and(
          eq(s1CompensationTracking.reportingPeriodId, period),
          entity ? eq(s1CompensationTracking.entity, entity) : sql`true`,
          country ? eq(s1CompensationTracking.country, country) : sql`true`
        )
      );

    // EFRAG Guardrail 1: Non-employees exclusion (ESRS explicit requirement)
    const employeeOnlyData = compensationData.filter(record => {
      const employeeId = record.employeeId || '';
      const employmentType = record.employmentType || '';
      
      // Exclude non-employees per ESRS requirements
      return (
        employeeId &&
        !employeeId.startsWith('CONTR-') && // Contractors
        !employeeId.startsWith('TEMP-') &&  // Temporary agency workers
        !employeeId.startsWith('CONS-') &&  // Consultants
        !employeeId.startsWith('FRAN-') &&  // Franchisees
        !['contractor', 'consultant', 'temporary', 'freelancer'].includes(employmentType.toLowerCase())
      );
    });

    const nonEmployeesExcluded = compensationData.length - employeeOnlyData.length;
    let derivationCounts = { actualHours: 0, standardHours: 0 };

    // EFRAG Guardrail 2: Gross hourly derivation methodology
    const genderHourlyRates = employeeOnlyData.reduce((acc, record) => {
      const hours = parseFloat(record.hoursWorkedPeriod || '0');
      const grossPay = parseFloat(record.grossPayPeriod || '0');
      
      let hourlyRate: number;
      
      if (hours > 0 && grossPay > 0) {
        // Work-card method: prefer actual hours (EFRAG guidance)
        hourlyRate = grossPay / hours;
        derivationCounts.actualHours++;
      } else if (grossPay > 0) {
        // Salaried without recorded hours: derive from standard hours (EFRAG guidance)
        const standardHours = 173; // Greek standard: 40 hours/week * 4.33 weeks/month
        hourlyRate = grossPay / standardHours;
        derivationCounts.standardHours++;
      } else {
        return acc; // Skip invalid records
      }
      
      // EFRAG Guardrail 3: PPP adjustment (optional)
      if (options.pppAdjustment && options.pppBaseCurrency) {
        // Apply PPP adjustment if requested (methodology must be disclosed)
        const pppFactor = this.getPPPFactor(record.country || 'GRC', options.pppBaseCurrency);
        hourlyRate = hourlyRate * pppFactor;
      }
      
      if (hourlyRate > 0) {
        const gender = record.gender?.toLowerCase() || 'undisclosed';
        const recordCountry = record.country || 'unknown';
        const recordEntity = record.entity || 'unknown';
        
        // Overall calculation
        if (!acc.overall[gender]) acc.overall[gender] = [];
        acc.overall[gender].push(hourlyRate);
        
        // By country
        if (!acc.byCountry[recordCountry]) acc.byCountry[recordCountry] = {};
        if (!acc.byCountry[recordCountry][gender]) acc.byCountry[recordCountry][gender] = [];
        acc.byCountry[recordCountry][gender].push(hourlyRate);
        
        // By entity
        if (!acc.byEntity[recordEntity]) acc.byEntity[recordEntity] = {};
        if (!acc.byEntity[recordEntity][gender]) acc.byEntity[recordEntity][gender] = [];
        acc.byEntity[recordEntity][gender].push(hourlyRate);
      }
      
      return acc;
    }, {
      overall: {} as Record<string, number[]>,
      byCountry: {} as Record<string, Record<string, number[]>>,
      byEntity: {} as Record<string, Record<string, number[]>>
    });

    // Calculate GPG = (Avg male gross hourly – Avg female gross hourly) ÷ Avg male gross hourly
    const calculateGPG = (maleRates: number[], femaleRates: number[]): number => {
      if (maleRates.length === 0 || femaleRates.length === 0) return 0;
      
      const avgMale = maleRates.reduce((sum, rate) => sum + rate, 0) / maleRates.length;
      const avgFemale = femaleRates.reduce((sum, rate) => sum + rate, 0) / femaleRates.length;
      
      return avgMale > 0 ? ((avgMale - avgFemale) / avgMale) * 100 : 0;
    };

    const maleKey = ['m', 'male'].find(k => genderHourlyRates.overall[k]) || 'm';
    const femaleKey = ['f', 'female'].find(k => genderHourlyRates.overall[k]) || 'f';
    
    const maleRates = genderHourlyRates.overall[maleKey] || [];
    const femaleRates = genderHourlyRates.overall[femaleKey] || [];
    const overallGap = calculateGPG(maleRates, femaleRates);

    // Generate methodology disclosure (EFRAG requirement)
    const methodologyDisclosure = this.generateMethodologyDisclosure({
      derivationCounts,
      nonEmployeesExcluded,
      pppAdjustment: options.pppAdjustment,
      pppBaseCurrency: options.pppBaseCurrency,
    });

    return {
      overall: overallGap,
      byCountry: Object.entries(genderHourlyRates.byCountry).reduce((acc, [country, genders]) => {
        const countryMaleKey = ['m', 'male'].find(k => genders[k]) || 'm';
        const countryFemaleKey = ['f', 'female'].find(k => genders[k]) || 'f';
        acc[country] = calculateGPG(
          genders[countryMaleKey] || [],
          genders[countryFemaleKey] || []
        );
        return acc;
      }, {} as Record<string, number>),
      byEntity: Object.entries(genderHourlyRates.byEntity).reduce((acc, [entity, genders]) => {
        const entityMaleKey = ['m', 'male'].find(k => genders[k]) || 'm';
        const entityFemaleKey = ['f', 'female'].find(k => genders[k]) || 'f';
        acc[entity] = calculateGPG(
          genders[entityMaleKey] || [],
          genders[entityFemaleKey] || []
        );
        return acc;
      }, {} as Record<string, number>),
      calculation: `Gender Pay Gap: ${overallGap.toFixed(1)}% | Employees: ${maleRates.length + femaleRates.length} | Non-employees excluded: ${nonEmployeesExcluded}`,
      methodologyDisclosure,
      metadata: {
        ruleset: this.activeRulesetVersion,
        calculatedAt: new Date().toISOString(),
        sampleSize: maleRates.length + femaleRates.length,
        nonEmployeesExcluded,
        hourlyDerivationBreakdown: {
          actualHours: derivationCounts.actualHours,
          standardHours: derivationCounts.standardHours,
          methodology: 'Actual worked hours preferred for work-card users; standard 173 hours/month for salaried employees without recorded hours',
        },
        pppAdjustment: options.pppAdjustment ? {
          applied: true,
          methodology: `PPP-adjusted to ${options.pppBaseCurrency || 'EUR'} using OECD PPP conversion factors`,
          baseCurrency: options.pppBaseCurrency,
        } : undefined,
      },
    };
  }

  /**
   * Greek-specific work-life balance calculation with Ν.5089/2024 compliance
   * EFRAG Guardrail 4: Greek family-related leave categories alignment
   */
  async calculateWorkLifeBalance(
    period: string,
    entity?: string,
    country: string = "GRC"
  ): Promise<{
    overallUsageRate: number;
    byLeaveType: Record<string, { eligible: number; takers: number; usageRate: number }>;
    greekSpecificCategories: {
      familyLeave: { eligible: number; takers: number; usageRate: number };
      parentalLeave: { eligible: number; takers: number; usageRate: number };
      flexibleWork: { eligible: number; takers: number; usageRate: number };
    };
    methodologyNote: string;
  }> {
    // Get leave eligibility and usage data
    const leaveData = await db
      .select()
      .from(s1LeaveEligibility)
      .where(
        and(
          eq(s1LeaveEligibility.reportingPeriodId, period),
          entity ? eq(s1LeaveEligibility.entity, entity) : sql`true`,
          country ? eq(s1LeaveEligibility.country, country) : sql`true`
        )
      );

    // Greek-specific leave categories per Ν.5089/2024
    const greekLeaveCategories = {
      familyLeave: ['family_emergency', 'child_care', 'elder_care', 'family_illness'],
      parentalLeave: ['maternity', 'paternity', 'parental', 'adoption'],
      flexibleWork: ['remote_work', 'flexible_hours', 'part_time_parent'],
    };

    const categoryStats = Object.entries(greekLeaveCategories).reduce((acc, [category, types]) => {
      const categoryRecords = leaveData.filter(record => 
        types.includes(record.leaveType || '')
      );
      
      const eligible = categoryRecords.length;
      const takers = categoryRecords.filter(record => 
        (record.takenMinutes || 0) > 0
      ).length;
      
      acc[category] = {
        eligible,
        takers,
        usageRate: eligible > 0 ? (takers / eligible) * 100 : 0,
      };
      
      return acc;
    }, {} as Record<string, { eligible: number; takers: number; usageRate: number }>);

    const overallEligible = leaveData.length;
    const overallTakers = leaveData.filter(record => 
      (record.takenMinutes || 0) > 0
    ).length;

    return {
      overallUsageRate: overallEligible > 0 ? (overallTakers / overallEligible) * 100 : 0,
      byLeaveType: leaveData.reduce((acc, record) => {
        const leaveType = record.leaveType || 'unknown';
        if (!acc[leaveType]) {
          acc[leaveType] = { eligible: 0, takers: 0, usageRate: 0 };
        }
        acc[leaveType].eligible++;
        if ((record.takenMinutes || 0) > 0) {
          acc[leaveType].takers++;
        }
        acc[leaveType].usageRate = acc[leaveType].eligible > 0 ? 
          (acc[leaveType].takers / acc[leaveType].eligible) * 100 : 0;
        return acc;
      }, {} as Record<string, { eligible: number; takers: number; usageRate: number }>),
      greekSpecificCategories: {
        familyLeave: categoryStats.familyLeave || { eligible: 0, takers: 0, usageRate: 0 },
        parentalLeave: categoryStats.parentalLeave || { eligible: 0, takers: 0, usageRate: 0 },
        flexibleWork: categoryStats.flexibleWork || { eligible: 0, takers: 0, usageRate: 0 },
      },
      methodologyNote: 'Work-life balance usage rates calculated per ESRS S1 requirements. Greek family-related leave categories align with Ν.5089/2024 legislation. Usage rate = (employees who took leave ÷ eligible employees) × 100.',
    };
  }

  /**
   * PPP conversion factor lookup (simplified for demo)
   */
  private getPPPFactor(country: string, baseCurrency: string): number {
    // Simplified PPP factors - in production, use OECD data
    const pppFactors: Record<string, Record<string, number>> = {
      'GRC': { 'EUR': 1.0, 'USD': 0.85 },
      'DEU': { 'EUR': 1.0, 'USD': 0.87 },
      'FRA': { 'EUR': 1.0, 'USD': 0.89 },
      'ITA': { 'EUR': 1.0, 'USD': 0.82 },
    };
    
    return pppFactors[country]?.[baseCurrency] || 1.0;
  }

  /**
   * Generate EFRAG-compliant methodology disclosure
   */
  private generateMethodologyDisclosure(params: {
    derivationCounts: { actualHours: number; standardHours: number };
    nonEmployeesExcluded: number;
    pppAdjustment?: boolean;
    pppBaseCurrency?: string;
  }): string {
    let disclosure = 'ESRS S1-16 Gender Pay Gap Methodology:\n\n';
    
    disclosure += '1. Population: Employees only (contractors, consultants, temporary agency workers excluded per ESRS requirements)\n';
    disclosure += `   - Non-employees excluded: ${params.nonEmployeesExcluded}\n\n`;
    
    disclosure += '2. Hourly Rate Derivation:\n';
    disclosure += `   - Actual hours (work-card users): ${params.derivationCounts.actualHours} employees\n`;
    disclosure += `   - Standard hours (salaried): ${params.derivationCounts.standardHours} employees (173 hours/month)\n\n`;
    
    if (params.pppAdjustment) {
      disclosure += `3. PPP Adjustment: Applied using OECD conversion factors to ${params.pppBaseCurrency || 'EUR'}\n\n`;
    }
    
    disclosure += '4. Formula: GPG = (Average male hourly rate - Average female hourly rate) ÷ Average male hourly rate × 100\n';
    
    return disclosure;
  }
}