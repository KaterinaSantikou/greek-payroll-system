import { CbaPackService } from "./CbaPackService";
import { PayrollCalculationEngine, type PayrollCalculationContext } from "./PayrollCalculationEngine";

export interface ErganiPayloadContext {
  employeeId: string;
  propertyId: string;
  scheduleType: 'regular' | 'overtime' | 'holiday' | 'sick_leave' | 'vacation';
  startDate: Date;
  endDate: Date;
  totalHours: number;
  cbaPackId?: string;
  category?: string;
  grade?: string;
}

export interface ErganiDeclarationPayload {
  workerId: string;
  employerCode: string;
  declarationType: string;
  workDate: string;
  startTime: string;
  endTime: string;
  totalMinutes: number;
  overtimeMinutes?: number;
  reasonCode: string;
  cbaReference?: string;
  additionalInfo?: {
    category: string;
    grade: string;
    seniorityStep: number;
    baseWage: number;
    premiumCodes: string[];
  };
}

/**
 * Enhanced ERGANI Integration with CBA-aware payload generation
 */
export class ErganiIntegrationEnhanced {

  /**
   * Pre-generate ERGANI payload with CBA reason codes
   */
  static async generateCbaCompliantPayload(context: ErganiPayloadContext): Promise<ErganiDeclarationPayload> {
    // Get active CBA pack for the property
    const activePacks = await CbaPackService.getActivePacksForProperty(context.propertyId);
    const primaryPack = activePacks[0]; // Use first active pack

    // Get ERGANI profile from pack
    const erganiProfile = primaryPack?.erganiProfiles?.[0];
    if (!erganiProfile) {
      throw new Error(`No ERGANI profile found for property ${context.propertyId}`);
    }

    // Determine reason code based on schedule type and CBA rules
    const reasonCode = this.getCbaReasonCode(context.scheduleType, erganiProfile);

    // Calculate work minutes
    const totalMinutes = context.totalHours * 60;
    let overtimeMinutes = 0;

    // Check for overtime based on CBA constraints
    if (primaryPack) {
      const constraints = await CbaPackService.getSchedulingConstraints(context.propertyId);
      const dailyLimit = constraints[0]?.maxHoursDay || 8;
      
      if (context.totalHours > dailyLimit) {
        overtimeMinutes = (context.totalHours - dailyLimit) * 60;
      }
    }

    // Get applicable premium codes
    const premiumCodes = await this.getApplicablePremiumCodes(context, primaryPack);

    // Get employee wage information
    const wageInfo = context.cbaPackId && context.category && context.grade 
      ? await CbaPackService.calculateEffectiveWage(
          context.propertyId,
          context.category,
          context.grade,
          0 // Default to step 0, should be fetched from employee contract
        )
      : null;

    const payload: ErganiDeclarationPayload = {
      workerId: context.employeeId,
      employerCode: process.env.ERGANI_EMPLOYER_CODE || "DEFAULT_EMPLOYER",
      declarationType: this.getDeclarationType(context.scheduleType),
      workDate: context.startDate.toISOString().split('T')[0],
      startTime: this.formatTime(context.startDate),
      endTime: this.formatTime(context.endDate),
      totalMinutes,
      overtimeMinutes: overtimeMinutes > 0 ? overtimeMinutes : undefined,
      reasonCode,
      cbaReference: primaryPack?.id,
      additionalInfo: wageInfo ? {
        category: context.category || 'general',
        grade: context.grade || 'A',
        seniorityStep: 0, // Should be fetched from contract
        baseWage: wageInfo.baseWage,
        premiumCodes
      } : undefined
    };

    return payload;
  }

  /**
   * Get CBA-specific reason code for ERGANI declaration
   */
  private static getCbaReasonCode(scheduleType: string, erganiProfile: any): string {
    const reasonCodes = erganiProfile.reasonCodes || {};

    switch (scheduleType) {
      case 'regular':
        return reasonCodes.regular || '01'; // Standard work
      case 'overtime':
        return reasonCodes.overtime || '02'; // Overtime work
      case 'holiday':
        return reasonCodes.holiday || '03'; // Holiday work
      case 'sick_leave':
        return reasonCodes.sickLeave || '04'; // Sick leave
      case 'vacation':
        return reasonCodes.vacation || '05'; // Paid leave
      default:
        return reasonCodes.default || '01';
    }
  }

  /**
   * Determine ERGANI declaration type
   */
  private static getDeclarationType(scheduleType: string): string {
    switch (scheduleType) {
      case 'regular':
        return 'MAIN_WORK';
      case 'overtime':
        return 'OVERTIME';
      case 'holiday':
        return 'HOLIDAY_WORK';
      case 'sick_leave':
        return 'SICK_LEAVE';
      case 'vacation':
        return 'PAID_LEAVE';
      default:
        return 'MAIN_WORK';
    }
  }

  /**
   * Get applicable premium codes for the work period
   */
  private static async getApplicablePremiumCodes(
    context: ErganiPayloadContext, 
    cbapack: any
  ): Promise<string[]> {
    if (!cbapack) return [];

    const premiumRules = await CbaPackService.getApplicablePremiums(context.propertyId);
    const applicableCodes = [];

    // Check which premiums apply based on context
    for (const rule of premiumRules) {
      if (this.premiumAppliesToContext(rule, context)) {
        applicableCodes.push(rule.code);
      }
    }

    return applicableCodes;
  }

  /**
   * Check if premium rule applies to the work context
   */
  private static premiumAppliesToContext(rule: any, context: ErganiPayloadContext): boolean {
    // Holiday premiums
    if (rule.code.includes('HOLIDAY') && context.scheduleType === 'holiday') {
      return true;
    }

    // Sunday premiums
    if (rule.code.includes('SUNDAY') && context.startDate.getDay() === 0) {
      return true;
    }

    // Night premiums
    if (rule.code.includes('NIGHT')) {
      const startHour = context.startDate.getHours();
      const endHour = context.endDate.getHours();
      
      // Check if work falls within night hours (22:00-06:00)
      if (startHour >= 22 || endHour <= 6) {
        return true;
      }
    }

    // Overtime premiums
    if (rule.code.includes('OVERTIME') && context.scheduleType === 'overtime') {
      return true;
    }

    return false;
  }

  /**
   * Format time for ERGANI (HH:MM format)
   */
  private static formatTime(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }

  /**
   * Submit payload to ERGANI system
   */
  static async submitToErgani(payload: ErganiDeclarationPayload): Promise<{
    success: boolean;
    submissionId?: string;
    error?: string;
  }> {
    try {
      // Mock implementation - would integrate with actual ERGANI API
      console.log("ERGANI Payload:", JSON.stringify(payload, null, 2));
      
      // Simulate API call
      const response = {
        success: true,
        submissionId: `ERG_${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      return response;

    } catch (error: any) {
      console.error("ERGANI submission failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate multiple ERGANI payloads for a payroll calculation
   */
  static async generatePayrollErganiPayloads(
    calculationContext: PayrollCalculationContext
  ): Promise<ErganiDeclarationPayload[]> {
    const payloads = [];

    for (const shift of calculationContext.hoursWorked) {
      const erganiContext: ErganiPayloadContext = {
        employeeId: calculationContext.employeeId,
        propertyId: calculationContext.propertyId,
        scheduleType: shift.shiftType === 'holiday' ? 'holiday' : 
                     shift.shiftType === 'sunday' ? 'regular' : 
                     shift.hours > 8 ? 'overtime' : 'regular',
        startDate: shift.date,
        endDate: new Date(shift.date.getTime() + (shift.hours * 60 * 60 * 1000)),
        totalHours: shift.hours
      };

      const payload = await this.generateCbaCompliantPayload(erganiContext);
      payloads.push(payload);
    }

    return payloads;
  }

  /**
   * Batch submit multiple ERGANI declarations
   */
  static async batchSubmitToErgani(payloads: ErganiDeclarationPayload[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{
      payload: ErganiDeclarationPayload;
      result: { success: boolean; submissionId?: string; error?: string; };
    }>;
  }> {
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const payload of payloads) {
      const result = await this.submitToErgani(payload);
      results.push({ payload, result });
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    return { successful, failed, results };
  }
}