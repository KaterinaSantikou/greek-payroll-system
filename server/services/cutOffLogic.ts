/**
 * Cut-Off Logic & Recommendations - Bank timing and routing decisions
 */

import { db } from '../db';
import { bankProfiles } from '@shared/payments-canonical-schema';
import { eq } from 'drizzle-orm';

// =============================================================================
// CUT-OFF TYPES
// =============================================================================

export interface CutOffStatus {
  bankProfileId: string;
  currentTime: Date;
  sctCutOffTime: Date;
  timeZone: string;
  isPastCutOff: boolean;
  timeRemaining: {
    hours: number;
    minutes: number;
    seconds: number;
    totalMinutes: number;
    displayString: string;
  } | null;
  nextCutOff: Date;
  businessDay: boolean;
}

export interface PaymentRecommendation {
  recommendedMethod: 'SCT' | 'SCT_INST';
  reason: string;
  warnings: string[];
  fallbackOptions: Array<{
    method: 'SCT' | 'SCT_INST';
    reason: string;
    available: boolean;
  }>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  cutOffImpact: boolean;
}

export interface ReissueEligibility {
  eligible: boolean;
  reason: string;
  recommendedMethod: 'SCT_INST';
  urgency: 'NORM' | 'HIGH' | 'URGP';
  estimatedSettlement: string;
  limitations: string[];
}

export interface CutOffDecision {
  amount: number;
  currentMethod: 'SCT' | 'SCT_INST';
  bankProfileId: string;
  recommendation: PaymentRecommendation;
  cutOffStatus: CutOffStatus;
  reissueEligibility?: ReissueEligibility;
}

// =============================================================================
// CUT-OFF LOGIC ENGINE
// =============================================================================

export class CutOffLogic {

  /**
   * Get cut-off status for bank profile
   */
  static async getCutOffStatus(bankProfileId: string, timezone: string = 'Europe/Athens'): Promise<CutOffStatus> {
    // Get bank profile
    const [bankProfile] = await db
      .select()
      .from(bankProfiles)
      .where(eq(bankProfiles.id, bankProfileId))
      .limit(1);

    if (!bankProfile) {
      throw new Error(`Bank profile ${bankProfileId} not found`);
    }

    const cutoffs = bankProfile.cutoffs as any;
    const currentTime = new Date();
    
    // Parse cut-off time (e.g., "16:00")
    const [cutOffHours, cutOffMinutes] = cutoffs.sct.time.split(':').map(Number);
    
    // Create today's cut-off datetime
    const todaysCutOff = new Date(currentTime);
    todaysCutOff.setHours(cutOffHours, cutOffMinutes, 0, 0);
    
    // If past today's cut-off, calculate next business day cut-off
    const isPastCutOff = currentTime > todaysCutOff;
    const nextCutOff = isPastCutOff 
      ? this.getNextBusinessDayCutOff(todaysCutOff, cutoffs.sct.weekdays)
      : todaysCutOff;

    // Calculate time remaining
    let timeRemaining = null;
    if (!isPastCutOff) {
      const diffMs = todaysCutOff.getTime() - currentTime.getTime();
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      timeRemaining = {
        hours,
        minutes,
        seconds,
        totalMinutes,
        displayString: `${hours}h ${minutes}m`,
      };
    }

    const businessDay = this.isBusinessDay(currentTime, cutoffs.sct.weekdays);

    return {
      bankProfileId,
      currentTime,
      sctCutOffTime: todaysCutOff,
      timeZone: timezone,
      isPastCutOff,
      timeRemaining,
      nextCutOff,
      businessDay,
    };
  }

  /**
   * Get payment method recommendation with cut-off awareness
   */
  static async getPaymentRecommendation(
    amount: number,
    bankProfileId: string,
    currentMethod?: 'SCT' | 'SCT_INST',
    isReissue: boolean = false
  ): Promise<PaymentRecommendation> {
    
    const [bankProfile] = await db
      .select()
      .from(bankProfiles)
      .where(eq(bankProfiles.id, bankProfileId))
      .limit(1);

    if (!bankProfile) {
      throw new Error(`Bank profile ${bankProfileId} not found`);
    }

    const cutOffStatus = await this.getCutOffStatus(bankProfileId);
    const supportsInstant = bankProfile.supportsInstant;
    const instantLimit = bankProfile.sctInstAmountLimit || 100000;

    let recommendedMethod: 'SCT' | 'SCT_INST' = 'SCT';
    let reason = 'Default SCT for standard processing';
    const warnings: string[] = [];
    const fallbackOptions: Array<{ method: 'SCT' | 'SCT_INST'; reason: string; available: boolean }> = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let cutOffImpact = false;

    // Rule 1: If past cut-off and instant supported → recommend SCT Inst
    if (cutOffStatus.isPastCutOff && supportsInstant) {
      if (amount <= instantLimit) {
        recommendedMethod = 'SCT_INST';
        reason = 'Past SCT cut-off time - SCT Instant recommended for immediate processing';
        cutOffImpact = true;
        riskLevel = 'MEDIUM';
      } else {
        recommendedMethod = 'SCT';
        reason = 'Past SCT cut-off but amount exceeds SCT Instant limit - using SCT for next business day';
        warnings.push(`Amount €${amount.toFixed(2)} exceeds SCT Instant limit €${instantLimit.toFixed(2)}`);
        cutOffImpact = true;
        riskLevel = 'HIGH';
      }
    }

    // Rule 2: If within 30 minutes of cut-off → suggest instant
    else if (cutOffStatus.timeRemaining && cutOffStatus.timeRemaining.totalMinutes <= 30) {
      if (amount <= instantLimit && supportsInstant) {
        recommendedMethod = 'SCT_INST';
        reason = 'Approaching SCT cut-off (< 30 min) - SCT Instant recommended for guaranteed same-day processing';
        riskLevel = 'MEDIUM';
        cutOffImpact = true;
      } else {
        recommendedMethod = 'SCT';
        reason = 'Approaching cut-off but continuing with SCT';
        warnings.push('Risk of missing today\'s SCT cut-off - consider SCT Instant if urgent');
        riskLevel = 'MEDIUM';
        cutOffImpact = true;
      }
    }

    // Rule 3: High amount preference for instant (when available)
    else if (amount > 5000 && amount <= instantLimit && supportsInstant) {
      recommendedMethod = 'SCT_INST';
      reason = 'High-value payment - SCT Instant recommended for faster settlement';
      riskLevel = 'LOW';
    }

    // Rule 4: Re-issue logic - prefer instant for failed SCT
    else if (isReissue && currentMethod === 'SCT' && supportsInstant && amount <= instantLimit) {
      recommendedMethod = 'SCT_INST';
      reason = 'Re-issuing failed SCT payment as SCT Instant for faster resolution';
      riskLevel = 'MEDIUM';
    }

    // Build fallback options
    if (recommendedMethod === 'SCT' && supportsInstant && amount <= instantLimit) {
      fallbackOptions.push({
        method: 'SCT_INST',
        reason: 'Instant alternative available',
        available: true,
      });
    } else if (recommendedMethod === 'SCT_INST') {
      fallbackOptions.push({
        method: 'SCT',
        reason: 'Standard SCT alternative (next business day)',
        available: true,
      });
    }

    // Add warnings for limitations
    if (amount > instantLimit) {
      warnings.push(`Amount exceeds SCT Instant limit of €${instantLimit.toFixed(2)}`);
    }

    if (!supportsInstant) {
      warnings.push(`Bank ${bankProfileId} does not support SCT Instant`);
    }

    if (!cutOffStatus.businessDay) {
      warnings.push('Today is not a business day - SCT will process next business day');
      riskLevel = 'HIGH';
    }

    return {
      recommendedMethod,
      reason,
      warnings,
      fallbackOptions,
      riskLevel,
      cutOffImpact,
    };
  }

  /**
   * Check re-issue eligibility for pending/rejected payments
   */
  static async checkReissueEligibility(
    lineId: string,
    newAmount?: number
  ): Promise<ReissueEligibility> {
    
    // This would fetch actual payment instruction - simplified for demo
    const mockInstruction = {
      lineId,
      batchId: 'BATCH-123',
      amount: newAmount || 1500,
      status: 'rejected',
      method: 'SCT',
      bankProfileId: 'alpha',
    };

    const amount = mockInstruction.amount;
    const recommendation = await this.getPaymentRecommendation(
      amount, 
      mockInstruction.bankProfileId, 
      mockInstruction.method as any, 
      true
    );

    const cutOffStatus = await this.getCutOffStatus(mockInstruction.bankProfileId);
    
    const eligible = mockInstruction.status in ['rejected', 'submitted'] && recommendation.recommendedMethod === 'SCT_INST';
    
    let urgency: 'NORM' | 'HIGH' | 'URGP' = 'HIGH';
    let estimatedSettlement = 'Within 10 seconds';
    const limitations: string[] = [];

    if (cutOffStatus.isPastCutOff) {
      urgency = 'URGP';
      estimatedSettlement = 'Immediate (< 10 seconds)';
    }

    if (amount > 100000) {
      limitations.push('Amount exceeds standard SCT Instant limit');
      eligible && (urgency = 'NORM');
    }

    if (!cutOffStatus.businessDay) {
      limitations.push('Non-business day - settlement subject to bank processing');
    }

    return {
      eligible,
      reason: eligible 
        ? 'Payment eligible for SCT Instant re-issue'
        : 'Payment not eligible for SCT Instant re-issue',
      recommendedMethod: 'SCT_INST',
      urgency,
      estimatedSettlement,
      limitations,
    };
  }

  /**
   * Get comprehensive cut-off decision for cockpit
   */
  static async getCutOffDecision(
    amount: number,
    bankProfileId: string,
    currentMethod?: 'SCT' | 'SCT_INST',
    isReissue: boolean = false
  ): Promise<CutOffDecision> {
    
    const cutOffStatus = await this.getCutOffStatus(bankProfileId);
    const recommendation = await this.getPaymentRecommendation(amount, bankProfileId, currentMethod, isReissue);
    
    let reissueEligibility;
    if (isReissue) {
      reissueEligibility = await this.checkReissueEligibility('MOCK-LINE-ID', amount);
    }

    return {
      amount,
      currentMethod: currentMethod || 'SCT',
      bankProfileId,
      recommendation,
      cutOffStatus,
      reissueEligibility,
    };
  }

  /**
   * Get cut-off countdown for cockpit display
   */
  static async getCutOffCountdown(bankProfileId: string): Promise<{
    countdown: string;
    status: 'ACTIVE' | 'PAST_CUTOFF' | 'NON_BUSINESS_DAY';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    banner: {
      show: boolean;
      message: string;
      variant: 'info' | 'warning' | 'error';
    };
  }> {
    
    const cutOffStatus = await this.getCutOffStatus(bankProfileId);
    
    let status: 'ACTIVE' | 'PAST_CUTOFF' | 'NON_BUSINESS_DAY' = 'ACTIVE';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let countdown = '';
    
    if (!cutOffStatus.businessDay) {
      status = 'NON_BUSINESS_DAY';
      riskLevel = 'HIGH';
      countdown = 'Non-business day';
    } else if (cutOffStatus.isPastCutOff) {
      status = 'PAST_CUTOFF';
      riskLevel = 'HIGH';
      countdown = 'Past cut-off';
    } else if (cutOffStatus.timeRemaining) {
      countdown = cutOffStatus.timeRemaining.displayString;
      if (cutOffStatus.timeRemaining.totalMinutes <= 30) {
        riskLevel = 'MEDIUM';
      }
    }

    const banner = {
      show: riskLevel !== 'LOW',
      message: status === 'PAST_CUTOFF' 
        ? 'Past SCT cut-off; use SCT Instant for same-day processing'
        : status === 'NON_BUSINESS_DAY'
        ? 'Non-business day - SCT will process next business day'
        : cutOffStatus.timeRemaining && cutOffStatus.timeRemaining.totalMinutes <= 30
        ? `Approaching SCT cut-off (${cutOffStatus.timeRemaining.displayString} remaining) - consider SCT Instant`
        : '',
      variant: riskLevel === 'HIGH' ? 'error' as const : 'warning' as const,
    };

    return {
      countdown,
      status,
      riskLevel,
      banner,
    };
  }

  /**
   * Get next business day cut-off time
   */
  private static getNextBusinessDayCutOff(currentCutOff: Date, weekdaysStr: string): Date {
    const nextDay = new Date(currentCutOff);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Simple business day logic (1-5 = Mon-Fri)
    const weekdays = weekdaysStr.split('-').map(Number);
    const dayOfWeek = nextDay.getDay();
    
    // If weekend, move to Monday
    if (dayOfWeek === 0) { // Sunday
      nextDay.setDate(nextDay.getDate() + 1);
    } else if (dayOfWeek === 6) { // Saturday  
      nextDay.setDate(nextDay.getDate() + 2);
    }
    
    return nextDay;
  }

  /**
   * Check if current date is a business day
   */
  private static isBusinessDay(date: Date, weekdaysStr: string): boolean {
    const dayOfWeek = date.getDay();
    // 1-5 = Monday-Friday for Greek banks
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }

  /**
   * Get all bank cut-off statuses for multi-bank cockpit
   */
  static async getAllBankCutOffStatuses(): Promise<Record<string, CutOffStatus>> {
    const bankIds = ['alpha', 'piraeus', 'eurobank', 'nbg'];
    const statuses: Record<string, CutOffStatus> = {};
    
    for (const bankId of bankIds) {
      try {
        statuses[bankId] = await this.getCutOffStatus(bankId);
      } catch (error) {
        // Handle missing bank profiles gracefully
        console.warn(`Could not get cut-off status for bank ${bankId}:`, error);
      }
    }
    
    return statuses;
  }
}