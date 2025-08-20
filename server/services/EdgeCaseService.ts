import { CbaPackService } from "./CbaPackService";

/**
 * Edge Cases Service - Handles complex payroll scenarios
 * 
 * Covers:
 * - Seasonal contracts (proration, mass flows)
 * - Split shifts (premium handling, break enforcement)
 * - Sixth day constraints
 * - Min wage floor guardrails  
 * - Multi-property operations
 * - Apprentice/minor constraints
 */

export interface SeasonalContract {
  employeeId: string;
  contractType: 'seasonal_fixed' | 'regular';
  startDate: Date;
  endDate?: Date;
  durationMonths: number;
  proratedBenefits: {
    deltaGifts: number; // δώρα proration
    vacationDays: number; // άδειας proration
  };
}

export interface SplitShift {
  shiftId: string;
  employeeId: string;
  date: Date;
  segments: Array<{
    startTime: string;
    endTime: string;
    hours: number;
    breakAfterMinutes?: number;
  }>;
  totalHours: number;
  totalBreakTime: number;
  validBreakPattern: boolean;
}

export interface MultiPropertyWork {
  employeeId: string;
  date: Date;
  outlets: Array<{
    propertyId: string;
    department: string;
    hours: number;
    premiums: string[];
    allowances: string[];
  }>;
  consolidatedPay: {
    totalHours: number;
    premiumsSplit: Record<string, { hours: number; outlets: string[] }>;
    allowancesSplit: Record<string, { amount: number; outlets: string[] }>;
  };
}

export interface MinWageAdjustment {
  employeeId: string;
  cbaWage: number;
  statutoryMinWage: number;
  topUpAmount: number;
  flagged: boolean;
  reason: string;
}

export class EdgeCaseService {

  /**
   * Handle seasonal contract proration
   */
  static calculateSeasonalProration(
    contract: SeasonalContract,
    payPeriod: { start: Date; end: Date }
  ): {
    deltaGifts: number;
    vacationAccrual: number;
    severanceEntitlement: number;
    adjustments: Array<{ type: string; amount: number; reason: string }>;
  } {
    const contractDays = this.getContractDurationDays(contract.startDate, contract.endDate || payPeriod.end);
    const yearDays = 365;
    const prorataFactor = contractDays / yearDays;

    // Greek law: δώρα (Christmas/Easter/vacation gifts)
    const annualDeltaGifts = 2080; // €2080 annual (one monthly salary equivalent)
    const proratedDeltaGifts = annualDeltaGifts * prorataFactor;

    // Vacation days (20 days annual for first 2 years, 25 thereafter)
    const baseVacationDays = 20;
    const proratedVacationDays = baseVacationDays * prorataFactor;

    // Severance (if termination)
    const severanceEntitlement = this.calculateSeveranceEntitlement(contract, payPeriod.end);

    return {
      deltaGifts: Math.round(proratedDeltaGifts * 100) / 100,
      vacationAccrual: Math.round(proratedVacationDays * 100) / 100,
      severanceEntitlement,
      adjustments: [
        {
          type: 'seasonal_prorata_delta',
          amount: proratedDeltaGifts,
          reason: `Seasonal proration: ${contractDays}/${yearDays} days`
        },
        {
          type: 'seasonal_prorata_vacation',
          amount: proratedVacationDays,
          reason: `Vacation proration: ${contractDays} contract days`
        }
      ]
    };
  }

  /**
   * Handle split shift validation and premium calculation
   */
  static validateSplitShift(splitShift: SplitShift, packId: string): {
    valid: boolean;
    violations: string[];
    adjustedPremiums: Array<{
      type: string;
      hours: number;
      rate: number;
      amount: number;
    }>;
    enforceBreak: {
      required: boolean;
      minimumMinutes: number;
      actualMinutes: number;
      compliant: boolean;
    };
  } {
    const violations = [];
    const adjustedPremiums = [];

    // Check break requirements between shifts
    const breakRequirement = this.getBreakRequirements(packId);
    const actualBreakTime = splitShift.totalBreakTime;
    const requiredBreakTime = breakRequirement.minimumMinutes;

    if (actualBreakTime < requiredBreakTime) {
      violations.push(`Insufficient break: ${actualBreakTime}min < required ${requiredBreakTime}min`);
    }

    // Prevent double-counting premiums across segments
    const consolidatedHours = this.consolidateShiftHours(splitShift);
    
    for (const [premiumType, hours] of Object.entries(consolidatedHours)) {
      if (premiumType === 'night' && hours > 0) {
        adjustedPremiums.push({
          type: 'NIGHT_25',
          hours,
          rate: 0.25,
          amount: hours * 0.25 * this.getBaseHourlyRate(splitShift.employeeId, packId)
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      adjustedPremiums,
      enforceBreak: {
        required: true,
        minimumMinutes: requiredBreakTime,
        actualMinutes: actualBreakTime,
        compliant: actualBreakTime >= requiredBreakTime
      }
    };
  }

  /**
   * Handle sixth day constraint enforcement
   */
  static validateSixthDay(
    employeeId: string, 
    proposedDate: Date, 
    packId: string
  ): {
    allowed: boolean;
    reason: string;
    overrideRequired: boolean;
    consecutiveDays: number;
    previousWorkDays: Date[];
  } {
    // Get consecutive work days before proposed date
    const previousDays = this.getPreviousWorkDays(employeeId, proposedDate, 7);
    const consecutiveDays = previousDays.length + 1; // Including proposed day

    // Check pack constraints
    const sixthDayAllowed = this.isSixthDayAllowed(packId);

    if (consecutiveDays >= 6 && !sixthDayAllowed) {
      return {
        allowed: false,
        reason: `Sixth day disallowed by ${packId} pack (Greek tourism/F&B restrictions)`,
        overrideRequired: true,
        consecutiveDays,
        previousWorkDays: previousDays
      };
    }

    if (consecutiveDays >= 6 && sixthDayAllowed) {
      return {
        allowed: true,
        reason: `Sixth day permitted with 40% premium per pack ${packId}`,
        overrideRequired: false,
        consecutiveDays,
        previousWorkDays: previousDays
      };
    }

    return {
      allowed: true,
      reason: 'Within consecutive day limits',
      overrideRequired: false,
      consecutiveDays,
      previousWorkDays: previousDays
    };
  }

  /**
   * Apply minimum wage floor guardrail
   */
  static applyMinWageFloor(
    employeeId: string,
    cbaWage: number,
    statutoryDate: Date = new Date()
  ): MinWageAdjustment {
    // Get current Greek minimum wage (€760/month as of 2025)
    const statutoryMinWage = this.getStatutoryMinWage(statutoryDate);
    
    if (cbaWage < statutoryMinWage) {
      const topUpAmount = statutoryMinWage - cbaWage;
      
      return {
        employeeId,
        cbaWage,
        statutoryMinWage,
        topUpAmount,
        flagged: true,
        reason: `CBA wage €${cbaWage} below statutory floor €${statutoryMinWage}`
      };
    }

    return {
      employeeId,
      cbaWage,
      statutoryMinWage,
      topUpAmount: 0,
      flagged: false,
      reason: 'CBA wage meets statutory minimum'
    };
  }

  /**
   * Handle multi-property work distribution
   */
  static distributeMultiPropertyWork(multiWork: MultiPropertyWork): {
    distribution: Array<{
      propertyId: string;
      department: string;
      hoursAllocated: number;
      premiumsAllocated: Array<{ code: string; hours: number; amount: number }>;
      allowancesAllocated: Array<{ code: string; amount: number; basis: string }>;
    }>;
    consolidatedTotals: {
      totalHours: number;
      totalPremiums: number;
      totalAllowances: number;
    };
    crossPropertyRules: string[];
  } {
    const distribution = [];
    let totalPremiums = 0;
    let totalAllowances = 0;
    const crossPropertyRules = [];

    for (const outlet of multiWork.outlets) {
      const hoursRatio = outlet.hours / multiWork.consolidatedPay.totalHours;
      
      // Distribute premiums proportionally by hours worked
      const premiumsAllocated = [];
      for (const premiumCode of outlet.premiums) {
        if (multiWork.consolidatedPay.premiumsSplit[premiumCode]) {
          const premiumData = multiWork.consolidatedPay.premiumsSplit[premiumCode];
          const allocatedHours = premiumData.hours * hoursRatio;
          const amount = allocatedHours * 0.25 * 12; // Mock base rate
          
          premiumsAllocated.push({
            code: premiumCode,
            hours: allocatedHours,
            amount
          });
          totalPremiums += amount;
        }
      }

      // Distribute allowances (typically per-outlet for meal allowances)
      const allowancesAllocated = [];
      for (const allowanceCode of outlet.allowances) {
        if (multiWork.consolidatedPay.allowancesSplit[allowanceCode]) {
          const allowanceData = multiWork.consolidatedPay.allowancesSplit[allowanceCode];
          const amount = allowanceData.amount / allowanceData.outlets.length; // Split evenly
          
          allowancesAllocated.push({
            code: allowanceCode,
            amount,
            basis: 'per_outlet_split'
          });
          totalAllowances += amount;
        }
      }

      distribution.push({
        propertyId: outlet.propertyId,
        department: outlet.department,
        hoursAllocated: outlet.hours,
        premiumsAllocated,
        allowancesAllocated
      });

      // Check cross-property rules
      if (outlet.hours < 4) {
        crossPropertyRules.push(`Short shift at ${outlet.propertyId}: ${outlet.hours}h`);
      }
    }

    return {
      distribution,
      consolidatedTotals: {
        totalHours: multiWork.consolidatedPay.totalHours,
        totalPremiums,
        totalAllowances
      },
      crossPropertyRules
    };
  }

  /**
   * Handle apprentice/minor constraints
   */
  static validateApprenticeMinorWork(
    employeeId: string,
    birthDate: Date,
    proposedShift: { startTime: string; endTime: string; date: Date },
    packId: string
  ): {
    allowed: boolean;
    violations: string[];
    restrictions: {
      maxDailyHours: number;
      maxWeeklyHours: number;
      nightWorkProhibited: boolean;
      hazardousWorkProhibited: boolean;
    };
    ageCategory: 'adult' | 'minor_16_18' | 'minor_under_16' | 'apprentice';
  } {
    const age = this.calculateAge(birthDate);
    const violations = [];
    
    let ageCategory: 'adult' | 'minor_16_18' | 'minor_under_16' | 'apprentice' = 'adult';
    let restrictions = {
      maxDailyHours: 8,
      maxWeeklyHours: 40,
      nightWorkProhibited: false,
      hazardousWorkProhibited: false
    };

    // Determine age category and restrictions
    if (age < 16) {
      ageCategory = 'minor_under_16';
      restrictions = {
        maxDailyHours: 6,
        maxWeeklyHours: 30,
        nightWorkProhibited: true,
        hazardousWorkProhibited: true
      };
    } else if (age < 18) {
      ageCategory = 'minor_16_18';
      restrictions = {
        maxDailyHours: 8,
        maxWeeklyHours: 40,
        nightWorkProhibited: true,
        hazardousWorkProhibited: true
      };
    }

    // Check night work (22:00 - 06:00)
    const startHour = parseInt(proposedShift.startTime.split(':')[0]);
    const endHour = parseInt(proposedShift.endTime.split(':')[0]);
    
    if (restrictions.nightWorkProhibited && (startHour >= 22 || endHour <= 6)) {
      violations.push(`Night work prohibited for ${ageCategory}`);
    }

    // Check daily hours
    const shiftDuration = this.calculateShiftDuration(proposedShift.startTime, proposedShift.endTime);
    if (shiftDuration > restrictions.maxDailyHours) {
      violations.push(`Shift duration ${shiftDuration}h exceeds daily limit ${restrictions.maxDailyHours}h`);
    }

    // Check hazardous work (tourism: pool, maintenance; F&B: hot kitchen)
    const hazardousRoles = this.getHazardousRoles(packId);
    if (restrictions.hazardousWorkProhibited && hazardousRoles.length > 0) {
      violations.push(`Hazardous work roles prohibited: ${hazardousRoles.join(', ')}`);
    }

    return {
      allowed: violations.length === 0,
      violations,
      restrictions,
      ageCategory
    };
  }

  /**
   * Process mass termination batch (seasonal end)
   */
  static async processMassTerminationBatch(
    employeeIds: string[],
    terminationDate: Date,
    reason: 'seasonal_end' | 'economic' | 'restructure'
  ): Promise<{
    processed: number;
    failed: number;
    results: Array<{
      employeeId: string;
      success: boolean;
      finalPay: {
        regularPay: number;
        proratedDelta: number;
        vacationPayout: number;
        severance: number;
        total: number;
      };
      erganiSubmitted: boolean;
      error?: string;
    }>;
    batchStats: {
      totalProcessingTime: number;
      averagePerEmployee: number;
      erganiSubmissions: number;
    };
  }> {
    const startTime = Date.now();
    const results = [];
    let processed = 0;
    let failed = 0;
    let erganiSubmissions = 0;

    // Process in parallel batches of 50
    const batchSize = 50;
    for (let i = 0; i < employeeIds.length; i += batchSize) {
      const batch = employeeIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (employeeId) => {
        try {
          // Calculate final pay
          const finalPay = await this.calculateFinalPay(employeeId, terminationDate, reason);
          
          // Submit to ERGANI
          const erganiSubmitted = await this.submitErganiTermination(employeeId, terminationDate, reason);
          if (erganiSubmitted) erganiSubmissions++;
          
          processed++;
          return {
            employeeId,
            success: true,
            finalPay,
            erganiSubmitted
          };

        } catch (error: any) {
          failed++;
          return {
            employeeId,
            success: false,
            finalPay: { regularPay: 0, proratedDelta: 0, vacationPayout: 0, severance: 0, total: 0 },
            erganiSubmitted: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const totalProcessingTime = Date.now() - startTime;

    return {
      processed,
      failed,
      results,
      batchStats: {
        totalProcessingTime,
        averagePerEmployee: totalProcessingTime / employeeIds.length,
        erganiSubmissions
      }
    };
  }

  // Helper methods

  private static getContractDurationDays(startDate: Date, endDate: Date): number {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private static calculateSeveranceEntitlement(contract: SeasonalContract, terminationDate: Date): number {
    // Greek law: No severance for seasonal contracts < 12 months
    if (contract.contractType === 'seasonal_fixed' && contract.durationMonths < 12) {
      return 0;
    }
    
    // Regular severance calculation would go here
    return 0;
  }

  private static getBreakRequirements(packId: string): { minimumMinutes: number } {
    // Tourism: 4 hours between split shifts
    // F&B: 3 hours minimum
    return packId === 'tourism-hotels' ? { minimumMinutes: 240 } : { minimumMinutes: 180 };
  }

  private static consolidateShiftHours(splitShift: SplitShift): Record<string, number> {
    const consolidated: Record<string, number> = {};
    
    for (const segment of splitShift.segments) {
      const startHour = parseInt(segment.startTime.split(':')[0]);
      const endHour = parseInt(segment.endTime.split(':')[0]);
      
      // Night hours (22:00-06:00)
      if (startHour >= 22 || endHour <= 6) {
        consolidated.night = (consolidated.night || 0) + segment.hours;
      }
    }
    
    return consolidated;
  }

  private static getBaseHourlyRate(employeeId: string, packId: string): number {
    // Mock - would fetch from employee contract
    return 12.0; // €12/hour base
  }

  private static getPreviousWorkDays(employeeId: string, date: Date, lookbackDays: number): Date[] {
    // Mock - would query actual work history
    const workDays = [];
    for (let i = 1; i <= 5; i++) {
      const workDate = new Date(date);
      workDate.setDate(date.getDate() - i);
      workDays.push(workDate);
    }
    return workDays;
  }

  private static isSixthDayAllowed(packId: string): boolean {
    // Tourism/F&B: generally not allowed due to Greek labor law
    return !['tourism-hotels', 'fnb-restaurants'].includes(packId);
  }

  private static getStatutoryMinWage(date: Date): number {
    // Greek minimum wage as of 2025: €760/month
    return 760;
  }

  private static calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private static calculateShiftDuration(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }

  private static getHazardousRoles(packId: string): string[] {
    if (packId === 'tourism-hotels') {
      return ['pool_maintenance', 'boiler_room', 'electrical_maintenance'];
    }
    if (packId === 'fnb-restaurants') {
      return ['hot_kitchen', 'fryer_station', 'dishwasher_chemicals'];
    }
    return [];
  }

  private static async calculateFinalPay(
    employeeId: string, 
    terminationDate: Date, 
    reason: string
  ): Promise<{
    regularPay: number;
    proratedDelta: number;
    vacationPayout: number;
    severance: number;
    total: number;
  }> {
    // Mock final pay calculation
    const regularPay = 920; // Monthly salary
    const proratedDelta = 150; // Prorated Christmas bonus
    const vacationPayout = 300; // Unused vacation
    const severance = 0; // No severance for seasonal
    
    return {
      regularPay,
      proratedDelta,
      vacationPayout,
      severance,
      total: regularPay + proratedDelta + vacationPayout + severance
    };
  }

  private static async submitErganiTermination(
    employeeId: string,
    terminationDate: Date,
    reason: string
  ): Promise<boolean> {
    // Mock ERGANI submission
    console.log(`ERGANI termination submitted for ${employeeId}: ${reason} on ${terminationDate.toISOString()}`);
    return true;
  }
}