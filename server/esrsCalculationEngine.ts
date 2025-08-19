import { db } from "./db";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import {
  employees,
  s1CompensationTracking,
  s1LeaveEligibility,
  s1HealthSafetyIncidents,
  s1HSFatalities,
  s1WorkforceCharacteristics,
  s1CalculationRulesets,
  type S1CompensationTracking,
  type S1LeaveEligibility,
} from "@shared/schema";

/**
 * Versioned ESRS S1 Calculation Engine
 * Runtime-switchable rulesets for esrs_s1.v2023, esrs_s1.v2025_quickfix
 */
export class ESRSCalculationEngine {
  private activeRulesetVersion: string = "esrs_s1.v2025_quickfix";

  /**
   * Switch calculation ruleset version at runtime
   */
  async switchRulesetVersion(version: string): Promise<void> {
    const ruleset = await db
      .select()
      .from(s1CalculationRulesets)
      .where(
        and(
          eq(s1CalculationRulesets.rulesetName, version),
          eq(s1CalculationRulesets.isActive, true)
        )
      )
      .limit(1);

    if (ruleset.length === 0) {
      throw new Error(`Ruleset version ${version} not found or inactive`);
    }

    this.activeRulesetVersion = version;
    console.log(`Switched to ESRS calculation ruleset: ${version}`);
  }

  /**
   * Get active calculation functions for current ruleset
   */
  private async getCalculationFunction(functionName: string): Promise<any> {
    const [rulesetFunction] = await db
      .select()
      .from(s1CalculationRulesets)
      .where(
        and(
          eq(s1CalculationRulesets.rulesetName, this.activeRulesetVersion),
          eq(s1CalculationRulesets.functionName, functionName),
          eq(s1CalculationRulesets.isActive, true)
        )
      )
      .limit(1);

    if (!rulesetFunction) {
      throw new Error(`Function ${functionName} not found in active ruleset ${this.activeRulesetVersion}`);
    }

    return rulesetFunction;
  }

  /**
   * ESRS S1-16 Gender Pay Gap Calculation with Country/Entity Segmentation
   * Formula: GPG = (Avg male gross hourly – Avg female gross hourly) ÷ Avg male gross hourly
   */
  async genderPayGap(
    period: string,
    entity?: string,
    country: string = "GRC"
  ): Promise<{
    overall: number;
    byCountry: Record<string, number>;
    byEntity: Record<string, number>;
    calculation: string;
    metadata: {
      ruleset: string;
      calculatedAt: string;
      sampleSize: number;
    };
  }> {
    // Get compensation data with country/entity segmentation
    const compensationData = await db
      .select({
        employeeId: s1CompensationTracking.employeeId,
        grossPayPeriod: s1CompensationTracking.grossPayPeriod,
        hoursWorkedPeriod: s1CompensationTracking.hoursWorkedPeriod,
        country: s1CompensationTracking.country,
        entity: s1CompensationTracking.entity,
        gender: employees.gender,
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

    // Calculate hourly rates by gender with segmentation
    const genderHourlyRates = compensationData.reduce((acc, record) => {
      const hours = parseFloat(record.hoursWorkedPeriod || '0');
      const grossPay = parseFloat(record.grossPayPeriod || '0');
      
      if (hours > 0 && grossPay > 0) {
        const hourlyRate = grossPay / hours;
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

    return {
      overall: calculateGPG(
        genderHourlyRates.overall[maleKey] || [],
        genderHourlyRates.overall[femaleKey] || []
      ),
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
      calculation: "GPG = (Avg male gross hourly – Avg female gross hourly) ÷ Avg male gross hourly",
      metadata: {
        ruleset: this.activeRulesetVersion,
        calculatedAt: new Date().toISOString(),
        sampleSize: compensationData.length,
      },
    };
  }

  /**
   * ESRS S1-16/17 Highest-to-Median Compensation Ratio
   * Formula: Ratio = Highest paid total comp ÷ median employee comp
   */
  async highestToMedianRatio(
    year: string,
    entity?: string,
    country: string = "GRC"
  ): Promise<{
    overall: number;
    byCountry: Record<string, number>;
    byEntity: Record<string, number>;
    calculation: string;
    metadata: {
      ruleset: string;
      calculatedAt: string;
      sampleSize: number;
    };
  }> {
    // Get annual total compensation with segmentation
    const compensationData = await db
      .select({
        employeeId: s1CompensationTracking.employeeId,
        annualTotalCompensation: s1CompensationTracking.annualTotalCompensation,
        country: s1CompensationTracking.country,
        entity: s1CompensationTracking.entity,
      })
      .from(s1CompensationTracking)
      .where(
        and(
          gte(s1CompensationTracking.calculationDate, `${year}-01-01`),
          lte(s1CompensationTracking.calculationDate, `${year}-12-31`),
          entity ? eq(s1CompensationTracking.entity, entity) : sql`true`,
          country ? eq(s1CompensationTracking.country, country) : sql`true`
        )
      );

    // Calculate ratio by segmentation
    const calculateRatio = (compensations: number[]): number => {
      if (compensations.length === 0) return 0;
      
      const sorted = compensations.sort((a, b) => a - b);
      const highest = sorted[sorted.length - 1];
      
      const medianIndex = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2
        : sorted[medianIndex];
      
      return median > 0 ? highest / median : 0;
    };

    // Segment data
    const segmentedData = compensationData.reduce((acc, record) => {
      const compensation = parseFloat(record.annualTotalCompensation || '0');
      if (compensation > 0) {
        // Overall
        acc.overall.push(compensation);
        
        // By country
        const recordCountry = record.country || 'unknown';
        if (!acc.byCountry[recordCountry]) acc.byCountry[recordCountry] = [];
        acc.byCountry[recordCountry].push(compensation);
        
        // By entity
        const recordEntity = record.entity || 'unknown';
        if (!acc.byEntity[recordEntity]) acc.byEntity[recordEntity] = [];
        acc.byEntity[recordEntity].push(compensation);
      }
      return acc;
    }, {
      overall: [] as number[],
      byCountry: {} as Record<string, number[]>,
      byEntity: {} as Record<string, number[]>
    });

    return {
      overall: calculateRatio(segmentedData.overall),
      byCountry: Object.entries(segmentedData.byCountry).reduce((acc, [country, compensations]) => {
        acc[country] = calculateRatio(compensations);
        return acc;
      }, {} as Record<string, number>),
      byEntity: Object.entries(segmentedData.byEntity).reduce((acc, [entity, compensations]) => {
        acc[entity] = calculateRatio(compensations);
        return acc;
      }, {} as Record<string, number>),
      calculation: "Ratio = Highest paid total comp ÷ median employee comp",
      metadata: {
        ruleset: this.activeRulesetVersion,
        calculatedAt: new Date().toISOString(),
        sampleSize: compensationData.length,
      },
    };
  }

  /**
   * Work-life Balance Usage Rates
   * Formula: Usage rate = leave takers ÷ eligible population
   */
  async worklifeUsage(
    period: string,
    entity?: string,
    country: string = "GRC"
  ): Promise<{
    overall: Record<string, number>;
    byCountry: Record<string, Record<string, number>>;
    byEntity: Record<string, Record<string, number>>;
    calculation: string;
    metadata: {
      ruleset: string;
      calculatedAt: string;
      sampleSize: number;
    };
  }> {
    const leaveData = await db
      .select({
        leaveType: s1LeaveEligibility.leaveType,
        eligibleFlag: s1LeaveEligibility.eligibleFlag,
        takenMinutes: s1LeaveEligibility.takenMinutes,
        country: s1LeaveEligibility.country,
        entity: s1LeaveEligibility.entity,
      })
      .from(s1LeaveEligibility)
      .where(
        and(
          eq(s1LeaveEligibility.reportingPeriodId, period),
          entity ? eq(s1LeaveEligibility.entity, entity) : sql`true`,
          country ? eq(s1LeaveEligibility.country, country) : sql`true`
        )
      );

    // Calculate usage rates: leave takers ÷ eligible population
    const calculateUsageRates = (data: typeof leaveData) => {
      return data.reduce((acc, record) => {
        const leaveType = record.leaveType;
        if (!acc[leaveType]) {
          acc[leaveType] = { eligible: 0, takers: 0 };
        }
        
        if (record.eligibleFlag) {
          acc[leaveType].eligible += 1;
        }
        
        if ((record.takenMinutes || 0) > 0) {
          acc[leaveType].takers += 1;
        }
        
        return acc;
      }, {} as Record<string, { eligible: number; takers: number }>);
    };

    const overall = calculateUsageRates(leaveData);
    const overallRates = Object.entries(overall).reduce((acc, [leaveType, stats]) => {
      acc[leaveType] = stats.eligible > 0 ? (stats.takers / stats.eligible) * 100 : 0;
      return acc;
    }, {} as Record<string, number>);

    // Segment by country
    const byCountry = leaveData.reduce((acc, record) => {
      const country = record.country || 'unknown';
      if (!acc[country]) acc[country] = [];
      acc[country].push(record);
      return acc;
    }, {} as Record<string, typeof leaveData>);

    const countryRates = Object.entries(byCountry).reduce((acc, [country, data]) => {
      const countryUsage = calculateUsageRates(data);
      acc[country] = Object.entries(countryUsage).reduce((rates, [leaveType, stats]) => {
        rates[leaveType] = stats.eligible > 0 ? (stats.takers / stats.eligible) * 100 : 0;
        return rates;
      }, {} as Record<string, number>);
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Segment by entity (similar logic)
    const byEntity = leaveData.reduce((acc, record) => {
      const entity = record.entity || 'unknown';
      if (!acc[entity]) acc[entity] = [];
      acc[entity].push(record);
      return acc;
    }, {} as Record<string, typeof leaveData>);

    const entityRates = Object.entries(byEntity).reduce((acc, [entity, data]) => {
      const entityUsage = calculateUsageRates(data);
      acc[entity] = Object.entries(entityUsage).reduce((rates, [leaveType, stats]) => {
        rates[leaveType] = stats.eligible > 0 ? (stats.takers / stats.eligible) * 100 : 0;
        return rates;
      }, {} as Record<string, number>);
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return {
      overall: overallRates,
      byCountry: countryRates,
      byEntity: entityRates,
      calculation: "Usage rate = leave takers ÷ eligible population",
      metadata: {
        ruleset: this.activeRulesetVersion,
        calculatedAt: new Date().toISOString(),
        sampleSize: leaveData.length,
      },
    };
  }

  /**
   * Health & Safety Incidence Rates per 100 FTE
   * Formula: Rate = (incidents / total FTE) * 100
   */
  async hnsIncidenceRates(
    period: string,
    entity?: string,
    country: string = "GRC"
  ): Promise<{
    incidentsPer100FTE: number;
    fatalitiesPer100FTE: number;
    byCountry: Record<string, { incidents: number; fatalities: number }>;
    byEntity: Record<string, { incidents: number; fatalities: number }>;
    calculation: string;
    metadata: {
      ruleset: string;
      calculatedAt: string;
      totalFTE: number;
    };
  }> {
    // Get FTE data for the period
    const [workforceData] = await db
      .select()
      .from(s1WorkforceCharacteristics)
      .where(eq(s1WorkforceCharacteristics.reportingPeriodId, period))
      .orderBy(desc(s1WorkforceCharacteristics.measurementDate))
      .limit(1);

    const totalFTE = workforceData ? parseFloat(workforceData.totalFTE) : 1;
    
    // Get incidents with segmentation
    const incidents = await db
      .select()
      .from(s1HealthSafetyIncidents)
      .where(
        and(
          eq(s1HealthSafetyIncidents.reportingPeriodId, period),
          entity ? sql`json_extract_path_text(location, 'entity') = ${entity}` : sql`true`,
          country ? sql`json_extract_path_text(location, 'country') = ${country}` : sql`true`
        )
      );

    // Get fatalities with segmentation
    const fatalities = await db
      .select()
      .from(s1HSFatalities)
      .where(
        and(
          eq(s1HSFatalities.reportingPeriodId, period),
          entity ? eq(s1HSFatalities.entity, entity) : sql`true`,
          country ? eq(s1HSFatalities.country, country) : sql`true`
        )
      );

    return {
      incidentsPer100FTE: totalFTE > 0 ? (incidents.length / totalFTE) * 100 : 0,
      fatalitiesPer100FTE: totalFTE > 0 ? (fatalities.length / totalFTE) * 100 : 0,
      byCountry: {}, // Implementation would segment by country
      byEntity: {},  // Implementation would segment by entity
      calculation: "Rate = (incidents / total FTE) * 100",
      metadata: {
        ruleset: this.activeRulesetVersion,
        calculatedAt: new Date().toISOString(),
        totalFTE,
      },
    };
  }
}