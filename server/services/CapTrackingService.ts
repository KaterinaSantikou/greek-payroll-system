import { db } from "../db";
import { 
  periodCapTracker,
  employees,
  insertPeriodCapTrackerSchema,
  type PeriodCapTracker,
  type InsertPeriodCapTracker
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

// Greek payroll caps for 2025 (amounts in EUR)
export const GREEK_CAPS_2025 = {
  EFKA_BASE_MONTHLY: 6915.60, // Monthly EFKA contribution base
  UNEMPLOYMENT_INSURANCE_MONTHLY: 6915.60,
  SOLIDARITY_TAX_ANNUAL: 100000, // Special solidarity tax threshold
  HOUSING_ALLOWANCE_MONTHLY: 210, // Tax-free housing allowance
  MEAL_ALLOWANCE_DAILY: 11, // Tax-free meal allowance per day
  TRANSPORT_ALLOWANCE_MONTHLY: 130 // Tax-free transport allowance
};

export interface CapConsumption {
  employeeId: string;
  period: string;
  capType: string;
  amountToConsume: number;
  remainingBeforeConsumption: number;
  remainingAfterConsumption: number;
  isOverCap: boolean;
  overCapAmount?: number;
}

export interface CapValidationResult {
  isValid: boolean;
  violations: Array<{
    employeeId: string;
    capType: string;
    requestedAmount: number;
    availableAmount: number;
    overageAmount: number;
  }>;
}

export class CapTrackingService {
  
  /**
   * Initialize or get existing cap tracker for an employee in a period
   */
  async ensureCapTracker(employeeId: string, period: string): Promise<PeriodCapTracker> {
    // Try to get existing tracker
    const [existing] = await db
      .select()
      .from(periodCapTracker)
      .where(and(
        eq(periodCapTracker.employeeId, employeeId),
        eq(periodCapTracker.period, period)
      ));

    if (existing) {
      return existing;
    }

    // Create new tracker with full caps for the period
    const newTracker: InsertPeriodCapTracker = {
      employeeId,
      period,
      efkaBaseRemaining: GREEK_CAPS_2025.EFKA_BASE_MONTHLY.toString(),
      unemploymentInsuranceRemaining: GREEK_CAPS_2025.UNEMPLOYMENT_INSURANCE_MONTHLY.toString(),
      housingAllowanceRemaining: GREEK_CAPS_2025.HOUSING_ALLOWANCE_MONTHLY.toString(),
      mealAllowanceRemaining: (GREEK_CAPS_2025.MEAL_ALLOWANCE_DAILY * 30).toString(), // Assume 30 days
      transportAllowanceRemaining: GREEK_CAPS_2025.TRANSPORT_ALLOWANCE_MONTHLY.toString(),
      solidarityTaxRemaining: (GREEK_CAPS_2025.SOLIDARITY_TAX_ANNUAL / 12).toString(), // Monthly portion
      lastResetAt: sql`NOW()`,
      createdBy: 'system'
    };

    const [created] = await db
      .insert(periodCapTracker)
      .values(newTracker)
      .onConflictDoNothing()
      .returning();

    // If insert was skipped due to race condition, fetch the existing one
    if (!created) {
      const [existing] = await db
        .select()
        .from(periodCapTracker)
        .where(and(
          eq(periodCapTracker.employeeId, employeeId),
          eq(periodCapTracker.period, period)
        ));
      return existing!;
    }

    return created;
  }

  /**
   * Get remaining caps for multiple employees in a period
   */
  async getRemainingCaps(employeeIds: string[], period: string): Promise<Map<string, PeriodCapTracker>> {
    const trackers = await db
      .select()
      .from(periodCapTracker)
      .where(and(
        sql`${periodCapTracker.employeeId} = ANY(${employeeIds})`,
        eq(periodCapTracker.period, period)
      ));

    const result = new Map<string, PeriodCapTracker>();
    
    // Initialize trackers for employees that don't have them yet
    for (const employeeId of employeeIds) {
      const existing = trackers.find(t => t.employeeId === employeeId);
      if (existing) {
        result.set(employeeId, existing);
      } else {
        const newTracker = await this.ensureCapTracker(employeeId, period);
        result.set(employeeId, newTracker);
      }
    }

    return result;
  }

  /**
   * Validate if requested cap consumption is possible
   */
  async validateCapConsumption(
    employeeId: string,
    period: string,
    requestedConsumption: Record<string, number>
  ): Promise<CapValidationResult> {
    const tracker = await this.ensureCapTracker(employeeId, period);
    const violations = [];

    for (const [capType, requestedAmount] of Object.entries(requestedConsumption)) {
      let availableAmount = 0;
      
      switch (capType) {
        case 'efka_base':
          availableAmount = parseFloat(tracker.efkaBaseRemaining);
          break;
        case 'unemployment_insurance':
          availableAmount = parseFloat(tracker.unemploymentInsuranceRemaining);
          break;
        case 'housing_allowance':
          availableAmount = parseFloat(tracker.housingAllowanceRemaining);
          break;
        case 'meal_allowance':
          availableAmount = parseFloat(tracker.mealAllowanceRemaining);
          break;
        case 'transport_allowance':
          availableAmount = parseFloat(tracker.transportAllowanceRemaining);
          break;
        case 'solidarity_tax':
          availableAmount = parseFloat(tracker.solidarityTaxRemaining);
          break;
        default:
          continue; // Skip unknown cap types
      }

      if (requestedAmount > availableAmount) {
        violations.push({
          employeeId,
          capType,
          requestedAmount,
          availableAmount,
          overageAmount: requestedAmount - availableAmount
        });
      }
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Consume caps for an employee (atomic operation)
   */
  async consumeCaps(
    employeeId: string,
    period: string,
    consumption: Record<string, number>,
    scopeId: string
  ): Promise<CapConsumption[]> {
    const tracker = await this.ensureCapTracker(employeeId, period);
    const consumptionResults: CapConsumption[] = [];
    const updateData: Partial<InsertPeriodCapTracker> = {};

    // Calculate new remaining amounts for each cap type
    for (const [capType, amountToConsume] of Object.entries(consumption)) {
      if (amountToConsume <= 0) continue;

      let currentRemaining = 0;
      let newRemaining = 0;
      let fieldToUpdate = '';

      switch (capType) {
        case 'efka_base':
          currentRemaining = parseFloat(tracker.efkaBaseRemaining);
          newRemaining = Math.max(0, currentRemaining - amountToConsume);
          updateData.efkaBaseRemaining = newRemaining.toString();
          fieldToUpdate = 'efkaBaseRemaining';
          break;
        case 'unemployment_insurance':
          currentRemaining = parseFloat(tracker.unemploymentInsuranceRemaining);
          newRemaining = Math.max(0, currentRemaining - amountToConsume);
          updateData.unemploymentInsuranceRemaining = newRemaining.toString();
          fieldToUpdate = 'unemploymentInsuranceRemaining';
          break;
        case 'housing_allowance':
          currentRemaining = parseFloat(tracker.housingAllowanceRemaining);
          newRemaining = Math.max(0, currentRemaining - amountToConsume);
          updateData.housingAllowanceRemaining = newRemaining.toString();
          fieldToUpdate = 'housingAllowanceRemaining';
          break;
        case 'meal_allowance':
          currentRemaining = parseFloat(tracker.mealAllowanceRemaining);
          newRemaining = Math.max(0, currentRemaining - amountToConsume);
          updateData.mealAllowanceRemaining = newRemaining.toString();
          fieldToUpdate = 'mealAllowanceRemaining';
          break;
        case 'transport_allowance':
          currentRemaining = parseFloat(tracker.transportAllowanceRemaining);
          newRemaining = Math.max(0, currentRemaining - amountToConsume);
          updateData.transportAllowanceRemaining = newRemaining.toString();
          fieldToUpdate = 'transportAllowanceRemaining';
          break;
        case 'solidarity_tax':
          currentRemaining = parseFloat(tracker.solidarityTaxRemaining);
          newRemaining = Math.max(0, currentRemaining - amountToConsume);
          updateData.solidarityTaxRemaining = newRemaining.toString();
          fieldToUpdate = 'solidarityTaxRemaining';
          break;
        default:
          continue;
      }

      const isOverCap = amountToConsume > currentRemaining;
      const overCapAmount = isOverCap ? amountToConsume - currentRemaining : undefined;

      consumptionResults.push({
        employeeId,
        period,
        capType,
        amountToConsume,
        remainingBeforeConsumption: currentRemaining,
        remainingAfterConsumption: newRemaining,
        isOverCap,
        overCapAmount
      });
    }

    // Update the tracker atomically
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = sql`NOW()`;
      updateData.lastConsumedAt = sql`NOW()`;
      updateData.lastConsumedByScopeId = scopeId;

      await db
        .update(periodCapTracker)
        .set(updateData)
        .where(and(
          eq(periodCapTracker.employeeId, employeeId),
          eq(periodCapTracker.period, period)
        ));
    }

    return consumptionResults;
  }

  /**
   * Get cap consumption history for an employee in a period
   */
  async getCapConsumptionHistory(employeeId: string, period: string): Promise<any[]> {
    // This would typically query a cap_consumption_log table
    // For now, we'll return the current tracker state
    const tracker = await this.ensureCapTracker(employeeId, period);
    
    return [{
      employeeId,
      period,
      efkaBaseConsumed: (GREEK_CAPS_2025.EFKA_BASE_MONTHLY - parseFloat(tracker.efkaBaseRemaining)).toString(),
      unemploymentInsuranceConsumed: (GREEK_CAPS_2025.UNEMPLOYMENT_INSURANCE_MONTHLY - parseFloat(tracker.unemploymentInsuranceRemaining)).toString(),
      housingAllowanceConsumed: (GREEK_CAPS_2025.HOUSING_ALLOWANCE_MONTHLY - parseFloat(tracker.housingAllowanceRemaining)).toString(),
      lastUpdated: tracker.updatedAt
    }];
  }

  /**
   * Reset caps for a new period (typically run monthly)
   */
  async resetCapsForNewPeriod(period: string): Promise<void> {
    await db
      .delete(periodCapTracker)
      .where(eq(periodCapTracker.period, period));
    
    console.log(`Reset all cap trackers for period ${period}`);
  }

  /**
   * Get employees approaching cap limits (for warnings)
   */
  async getEmployeesNearingCaps(
    period: string,
    thresholdPercent: number = 90
  ): Promise<Array<{
    employeeId: string;
    capType: string;
    remainingAmount: number;
    usedPercent: number;
  }>> {
    const trackers = await db
      .select()
      .from(periodCapTracker)
      .where(eq(periodCapTracker.period, period));

    const warnings = [];

    for (const tracker of trackers) {
      const caps = [
        { type: 'efka_base', remaining: parseFloat(tracker.efkaBaseRemaining), total: GREEK_CAPS_2025.EFKA_BASE_MONTHLY },
        { type: 'unemployment_insurance', remaining: parseFloat(tracker.unemploymentInsuranceRemaining), total: GREEK_CAPS_2025.UNEMPLOYMENT_INSURANCE_MONTHLY },
        { type: 'housing_allowance', remaining: parseFloat(tracker.housingAllowanceRemaining), total: GREEK_CAPS_2025.HOUSING_ALLOWANCE_MONTHLY }
      ];

      for (const cap of caps) {
        const usedPercent = ((cap.total - cap.remaining) / cap.total) * 100;
        if (usedPercent >= thresholdPercent) {
          warnings.push({
            employeeId: tracker.employeeId,
            capType: cap.type,
            remainingAmount: cap.remaining,
            usedPercent: Math.round(usedPercent)
          });
        }
      }
    }

    return warnings;
  }
}

export const capTrackingService = new CapTrackingService();