import { db } from '../db';
import { 
  subscriptions,
  invoices,
  type Subscription,
  type Invoice,
  type NewInvoice
} from '@shared/billingSchema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { billingService } from './BillingService';
import { creditNoteService } from './CreditNoteService';

export interface ProrationPeriod {
  start: Date;
  end: Date;
  daysInPeriod: number;
  totalDaysInMonth: number;
  prorationRatio: number;
}

export interface ProrationCalculation {
  periodStart: Date;
  periodEnd: Date;
  baseFeeCents: number;
  perEmployeeCents: number;
  oldEmployeeCount: number;
  newEmployeeCount: number;
  proratedBaseCents: number;
  proratedPerEmployeeCents: number;
  totalProratedCents: number;
  isUpgrade: boolean;
  changeEffectiveDate: Date;
  remainingDays: number;
  totalDays: number;
}

export interface EmployeeUsageTracking {
  subscriptionId: string;
  billingPeriod: string; // YYYY-MM format
  employeeCount: number;
  usageEmployeeMonths: number;
  lastReconciled: Date;
  dailySnapshots: Array<{
    date: string;
    employeeCount: number;
  }>;
}

export class ProrationService {

  /**
   * Calculate proration for upgrade on specific date
   * Example: Upgrade on 2025-09-10: remaining days = 20/30 → charge (delta_base + delta_per_emp*count) * 20/30
   */
  async calculateUpgradeProration(
    subscriptionId: string,
    changeDate: Date,
    oldPlanCents: { baseCents: number; perEmployeeCents: number },
    newPlanCents: { baseCents: number; perEmployeeCents: number },
    employeeCount: number
  ): Promise<ProrationCalculation> {

    const prorationPeriod = this.calculateProrationPeriod(changeDate);

    // Calculate plan deltas
    const deltaBaseCents = newPlanCents.baseCents - oldPlanCents.baseCents;
    const deltaPerEmployeeCents = newPlanCents.perEmployeeCents - oldPlanCents.perEmployeeCents;

    // Apply proration ratio to deltas
    const proratedBaseCents = Math.round(deltaBaseCents * prorationPeriod.prorationRatio);
    const proratedPerEmployeeCents = Math.round(deltaPerEmployeeCents * employeeCount * prorationPeriod.prorationRatio);
    const totalProratedCents = proratedBaseCents + proratedPerEmployeeCents;

    return {
      periodStart: prorationPeriod.start,
      periodEnd: prorationPeriod.end,
      baseFeeCents: deltaBaseCents,
      perEmployeeCents: deltaPerEmployeeCents,
      oldEmployeeCount: employeeCount,
      newEmployeeCount: employeeCount,
      proratedBaseCents,
      proratedPerEmployeeCents,
      totalProratedCents,
      isUpgrade: true,
      changeEffectiveDate: changeDate,
      remainingDays: prorationPeriod.daysInPeriod,
      totalDays: prorationPeriod.totalDaysInMonth
    };
  }

  /**
   * Calculate proration for downgrade on specific date
   * Example: Downgrade on 2025-09-20: unused 10/30 → credit note for (delta)*10/30
   */
  async calculateDowngradeProration(
    subscriptionId: string,
    changeDate: Date,
    oldPlanCents: { baseCents: number; perEmployeeCents: number },
    newPlanCents: { baseCents: number; perEmployeeCents: number },
    employeeCount: number
  ): Promise<ProrationCalculation> {

    const prorationPeriod = this.calculateProrationPeriod(changeDate, true); // true = unused days for credit

    // Calculate plan deltas (negative for downgrade)
    const deltaBaseCents = oldPlanCents.baseCents - newPlanCents.baseCents;
    const deltaPerEmployeeCents = oldPlanCents.perEmployeeCents - newPlanCents.perEmployeeCents;

    // Apply proration ratio to deltas for credit
    const proratedBaseCents = Math.round(deltaBaseCents * prorationPeriod.prorationRatio);
    const proratedPerEmployeeCents = Math.round(deltaPerEmployeeCents * employeeCount * prorationPeriod.prorationRatio);
    const totalProratedCents = proratedBaseCents + proratedPerEmployeeCents;

    return {
      periodStart: prorationPeriod.start,
      periodEnd: prorationPeriod.end,
      baseFeeCents: deltaBaseCents,
      perEmployeeCents: deltaPerEmployeeCents,
      oldEmployeeCount: employeeCount,
      newEmployeeCount: employeeCount,
      proratedBaseCents,
      proratedPerEmployeeCents,
      totalProratedCents,
      isUpgrade: false,
      changeEffectiveDate: changeDate,
      remainingDays: prorationPeriod.daysInPeriod,
      totalDays: prorationPeriod.totalDaysInMonth
    };
  }

  /**
   * Calculate proration period from change date
   */
  private calculateProrationPeriod(changeDate: Date, forCredit: boolean = false): ProrationPeriod {
    const year = changeDate.getFullYear();
    const month = changeDate.getMonth();
    
    // Get billing period bounds (start and end of month)
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0); // Last day of month
    
    const totalDaysInMonth = periodEnd.getDate();
    
    let daysInPeriod: number;
    let prorationStart: Date;
    let prorationEnd: Date;

    if (forCredit) {
      // For credit: calculate unused days from change date to end of month
      daysInPeriod = periodEnd.getDate() - changeDate.getDate() + 1;
      prorationStart = changeDate;
      prorationEnd = periodEnd;
    } else {
      // For charges: calculate remaining days from change date to end of month
      daysInPeriod = periodEnd.getDate() - changeDate.getDate() + 1;
      prorationStart = changeDate;
      prorationEnd = periodEnd;
    }
    
    const prorationRatio = daysInPeriod / totalDaysInMonth;

    return {
      start: prorationStart,
      end: prorationEnd,
      daysInPeriod,
      totalDaysInMonth,
      prorationRatio
    };
  }

  /**
   * Calculate employee usage for mid-month changes
   * This computes usage_employee_month for nightly reconciliation
   */
  async calculateEmployeeUsage(
    subscriptionId: string,
    billingPeriod: Date // First day of billing month
  ): Promise<EmployeeUsageTracking> {

    const year = billingPeriod.getFullYear();
    const month = billingPeriod.getMonth();
    const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    // For now, simulate subscription changes tracking
    // In production, you would track employee count changes in a subscriptionChanges table
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0);
    
    // Mock changes for demonstration - in real implementation, query actual change log
    const changes: Array<{
      effectiveDate: string;
      changeType: string;
      newEmployeeCount?: number;
    }> = [];

    // Get current subscription for baseline
    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .then(rows => rows[0]);

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    // Build daily snapshots - using default employee count as baseline
    // In production, you would store actual employee count changes in a separate table
    const dailySnapshots: Array<{ date: string; employeeCount: number }> = [];
    let currentEmployeeCount = 25; // Default employee count - would come from actual tracking
    
    // Track changes by date
    const changesByDate = new Map<string, number>();
    changes.forEach(change => {
      if (change.changeType === 'employee_count_change' && change.newEmployeeCount) {
        changesByDate.set(change.effectiveDate, change.newEmployeeCount);
      }
    });

    // Generate daily snapshots for the entire month
    const totalDays = periodEnd.getDate();
    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(year, month, day);
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // Check if there's a change on this date
      if (changesByDate.has(dateKey)) {
        currentEmployeeCount = changesByDate.get(dateKey)!;
      }
      
      dailySnapshots.push({
        date: dateKey,
        employeeCount: currentEmployeeCount
      });
    }

    // Calculate usage_employee_month as sum of daily employee counts / days in month
    const totalEmployeeDays = dailySnapshots.reduce((sum, snapshot) => sum + snapshot.employeeCount, 0);
    const usageEmployeeMonths = totalEmployeeDays / totalDays;

    return {
      subscriptionId,
      billingPeriod: periodKey,
      employeeCount: currentEmployeeCount, // Current count from tracking
      usageEmployeeMonths,
      lastReconciled: new Date(),
      dailySnapshots
    };
  }

  /**
   * Generate proration invoice line item
   */
  async generateProrationLineItem(
    calculation: ProrationCalculation,
    description: string,
    reason: 'upgrade' | 'downgrade' | 'employee_change'
  ) {
    const isGreek = true; // You can pass language preference

    let itemDescription = description;
    if (reason === 'upgrade') {
      itemDescription = isGreek 
        ? `Αναβάθμιση υπηρεσίας (αναλογικά ${calculation.remainingDays}/${calculation.totalDays} ημέρες)`
        : `Service upgrade (prorated ${calculation.remainingDays}/${calculation.totalDays} days)`;
    } else if (reason === 'downgrade') {
      itemDescription = isGreek 
        ? `Υποβάθμιση υπηρεσίας (επιστροφή ${calculation.remainingDays}/${calculation.totalDays} ημέρες)`
        : `Service downgrade (refund ${calculation.remainingDays}/${calculation.totalDays} days)`;
    } else {
      itemDescription = isGreek 
        ? `Αλλαγή αριθμού εργαζομένων (αναλογικά)`
        : `Employee count change (prorated)`;
    }

    return {
      description: itemDescription,
      periodStart: calculation.periodStart.toISOString().split('T')[0],
      periodEnd: calculation.periodEnd.toISOString().split('T')[0],
      quantity: 1,
      unitPriceCents: calculation.totalProratedCents,
      subtotalCents: Math.round(calculation.totalProratedCents / 1.24), // Excluding VAT
      isProrated: true,
      prorationRatio: calculation.remainingDays / calculation.totalDays,
      changeType: reason,
      effectiveDate: calculation.changeEffectiveDate.toISOString().split('T')[0]
    };
  }

  /**
   * Auto-generate upgrade invoice with proration
   */
  async createUpgradeInvoice(
    subscriptionId: string,
    changeDate: Date,
    oldPlanCents: { baseCents: number; perEmployeeCents: number },
    newPlanCents: { baseCents: number; perEmployeeCents: number },
    employeeCount: number
  ): Promise<Invoice> {

    const calculation = await this.calculateUpgradeProration(
      subscriptionId,
      changeDate,
      oldPlanCents,
      newPlanCents,
      employeeCount
    );

    const lineItem = await this.generateProrationLineItem(
      calculation,
      'Service Upgrade',
      'upgrade'
    );

    // Generate upgrade invoice using BillingService
    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .then(rows => rows[0]);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Use billing service to create invoice with proper numbering and VAT
    return (billingService as any).createInvoice({
      subscriptionId,
      type: 'invoice',
      periodStart: calculation.periodStart,
      periodEnd: calculation.periodEnd,
      items: [lineItem],
      notes: `Upgrade effective ${changeDate.toISOString().split('T')[0]} - prorated for remaining ${calculation.remainingDays} days`
    });
  }

  /**
   * Auto-generate downgrade credit note with proration
   */
  async createDowngradeCreditNote(
    subscriptionId: string,
    originalInvoiceId: string,
    changeDate: Date,
    oldPlanCents: { baseCents: number; perEmployeeCents: number },
    newPlanCents: { baseCents: number; perEmployeeCents: number },
    employeeCount: number
  ): Promise<Invoice> {

    const calculation = await this.calculateDowngradeProration(
      subscriptionId,
      changeDate,
      oldPlanCents,
      newPlanCents,
      employeeCount
    );

    return creditNoteService.createDowngradeCreditNote(
      subscriptionId,
      originalInvoiceId,
      calculation.totalProratedCents,
      changeDate,
      employeeCount,
      employeeCount
    );
  }

  /**
   * Nightly reconciliation of employee usage
   */
  async runNightlyEmployeeUsageReconciliation(date: Date = new Date()): Promise<void> {
    // Get all active subscriptions
    const activeSubscriptions = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));

    console.log(`Running nightly employee usage reconciliation for ${activeSubscriptions.length} subscriptions`);

    for (const subscription of activeSubscriptions) {
      try {
        // Calculate usage for the billing period containing the reconciliation date
        const billingPeriodStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const usage = await this.calculateEmployeeUsage(subscription.id, billingPeriodStart);
        
        console.log(`Subscription ${subscription.id}: ${usage.usageEmployeeMonths.toFixed(2)} employee-months usage`);

        // Store usage tracking for invoice generation
        // This would typically be saved to a usage_tracking table
        
      } catch (error) {
        console.error(`Failed to reconcile usage for subscription ${subscription.id}:`, error);
      }
    }
  }

  /**
   * Calculate days between two dates
   */
  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // Include both start and end dates
  }

  /**
   * Get proration examples for testing
   */
  getProrationExamples() {
    return {
      upgradeExample: {
        description: "Upgrade on 2025-09-10: remaining days = 20/30",
        calculation: "charge (delta_base + delta_per_emp*count) * 20/30",
        changeDate: new Date('2025-09-10'),
        remainingDays: 20,
        totalDays: 30,
        prorationRatio: 20/30
      },
      downgradeExample: {
        description: "Downgrade on 2025-09-20: unused 10/30",
        calculation: "credit note for (delta)*10/30",
        changeDate: new Date('2025-09-20'),
        unusedDays: 10,
        totalDays: 30,
        prorationRatio: 10/30
      },
      employeeChangeExample: {
        description: "Mid-month employee changes: recompute usage_employee_month nightly",
        process: "Daily snapshots → monthly reconciliation → usage billing"
      }
    };
  }
}

export const prorationService = new ProrationService();