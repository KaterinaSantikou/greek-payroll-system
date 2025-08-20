import { db } from '../db';
import { 
  billingPlans, 
  subscriptions, 
  invoices, 
  employeeMetering, 
  creditNotes, 
  invoiceSequences,
  type BillingPlan,
  type Subscription,
  type Invoice,
  type NewInvoice,
  type EmployeeMetering,
  type NewEmployeeMetering,
  type CreditNote,
  type NewCreditNote
} from '@shared/billingSchema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface BillingMetrics {
  subscriptionId: string;
  year: number;
  month: number;
  uniqueActiveEmployees: number;
  employeesWithPayActivity: number;
  meteringMethod: 'active_headcount' | 'pay_activity';
}

export interface ProrationCalculation {
  fullMonthDays: number;
  prorationDays: number;
  prorationFactor: number;
  baseAmount: number;
  prorationAmount: number;
}

export interface VATCalculation {
  subtotalCents: number;
  vatRate: number;
  vatAmountCents: number;
  totalCents: number;
  vatTreatment: 'standard' | 'reverse_charge' | 'exempt';
  vatNote?: string;
}

export interface InvoiceLineItem {
  description: string;
  periodStart: string;
  periodEnd: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  isProrated: boolean;
  prorationDetails?: ProrationCalculation;
}

export class BillingService {
  
  /**
   * Calculate billable employees for a given period
   * Supports both active headcount and pay activity methods
   */
  async calculateBillableEmployees(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date,
    meteringMethod: 'active_headcount' | 'pay_activity' = 'active_headcount'
  ): Promise<BillingMetrics> {
    // This would integrate with your existing employee data
    // For now, using mock data structure
    
    // Mock implementation - replace with actual employee queries
    const uniqueActiveEmployees = await this.getUniqueActiveEmployees(subscriptionId, periodStart, periodEnd);
    const employeesWithPayActivity = await this.getEmployeesWithPayActivity(subscriptionId, periodStart, periodEnd);
    
    const billableCount = meteringMethod === 'active_headcount' 
      ? uniqueActiveEmployees 
      : employeesWithPayActivity;

    return {
      subscriptionId,
      year: periodStart.getFullYear(),
      month: periodStart.getMonth() + 1,
      uniqueActiveEmployees,
      employeesWithPayActivity,
      meteringMethod
    };
  }

  /**
   * Calculate proration for mid-cycle changes
   */
  calculateProration(
    baseAmountCents: number,
    periodStart: Date,
    periodEnd: Date,
    prorationStart?: Date,
    prorationEnd?: Date
  ): ProrationCalculation {
    const fullPeriodStart = periodStart;
    const fullPeriodEnd = periodEnd;
    
    const actualStart = prorationStart || fullPeriodStart;
    const actualEnd = prorationEnd || fullPeriodEnd;
    
    const fullMonthMs = fullPeriodEnd.getTime() - fullPeriodStart.getTime();
    const fullMonthDays = Math.round(fullMonthMs / (1000 * 60 * 60 * 24));
    
    const prorationMs = actualEnd.getTime() - actualStart.getTime();
    const prorationDays = Math.round(prorationMs / (1000 * 60 * 60 * 24));
    
    const prorationFactor = prorationDays / fullMonthDays;
    const prorationAmount = Math.round(baseAmountCents * prorationFactor);
    
    return {
      fullMonthDays,
      prorationDays,
      prorationFactor,
      baseAmount: baseAmountCents,
      prorationAmount
    };
  }

  /**
   * Calculate Greek VAT based on business rules
   */
  calculateVAT(
    subtotalCents: number,
    customerVatNumber?: string,
    customerCountry: string = 'GR',
    isB2B: boolean = true
  ): VATCalculation {
    let vatRate = 0.24; // 24% standard Greek VAT
    let vatTreatment: 'standard' | 'reverse_charge' | 'exempt' = 'standard';
    let vatNote: string | undefined;

    // Greek domestic B2B - standard VAT
    if (customerCountry === 'GR' && isB2B) {
      vatRate = 0.24;
      vatTreatment = 'standard';
    }
    // EU B2B with valid VAT number - reverse charge
    else if (customerCountry !== 'GR' && this.isEUCountry(customerCountry) && isB2B && customerVatNumber) {
      vatRate = 0;
      vatTreatment = 'reverse_charge';
      vatNote = 'Reverse charge applies - Customer liable for VAT in country of establishment';
    }
    // Non-EU or other cases
    else if (!this.isEUCountry(customerCountry)) {
      vatRate = 0;
      vatTreatment = 'exempt';
      vatNote = 'Export of services - VAT exempt';
    }

    const vatAmountCents = Math.round(subtotalCents * vatRate);
    const totalCents = subtotalCents + vatAmountCents;

    return {
      subtotalCents,
      vatRate,
      vatAmountCents,
      totalCents,
      vatTreatment,
      vatNote
    };
  }

  /**
   * Generate invoice for subscription period
   */
  async generateInvoice(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date,
    metrics?: BillingMetrics,
    prorationDetails?: {
      isUpgrade: boolean;
      changeDate: Date;
      oldEmployeeCount: number;
      newEmployeeCount: number;
    }
  ): Promise<Invoice> {
    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .then(rows => rows[0]);

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const plan = await db.select()
      .from(billingPlans)
      .where(eq(billingPlans.id, subscription.planId))
      .then(rows => rows[0]);

    if (!plan) {
      throw new Error(`Plan ${subscription.planId} not found`);
    }

    // Get or calculate metrics
    const billingMetrics = metrics || await this.calculateBillableEmployees(
      subscriptionId,
      periodStart,
      periodEnd
    );

    // Build invoice line items
    const items: InvoiceLineItem[] = [];

    // Base subscription fee
    const baseFeeItem: InvoiceLineItem = {
      description: subscription.invoiceLanguage === 'el' 
        ? `${plan.displayName} - Βασικό πακέτο` 
        : `${plan.displayName} - Base subscription`,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      quantity: 1,
      unitPriceCents: Math.round(parseFloat(plan.baseFeeEur) * 100),
      subtotalCents: Math.round(parseFloat(plan.baseFeeEur) * 100),
      isProrated: false
    };

    // Handle proration for base fee if mid-cycle change
    if (prorationDetails && prorationDetails.changeDate > periodStart) {
      const baseProration = this.calculateProration(
        baseFeeItem.subtotalCents,
        periodStart,
        periodEnd,
        prorationDetails.changeDate,
        periodEnd
      );
      baseFeeItem.isProrated = true;
      baseFeeItem.prorationDetails = baseProration;
      baseFeeItem.subtotalCents = baseProration.prorationAmount;
    }

    items.push(baseFeeItem);

    // Per-employee fees
    const perEmployeeFeeItem: InvoiceLineItem = {
      description: subscription.invoiceLanguage === 'el'
        ? 'Κόστος ανά εργαζόμενο'
        : 'Per-employee fee',
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      quantity: billingMetrics.uniqueActiveEmployees,
      unitPriceCents: Math.round(parseFloat(plan.perEmployeeFeeEur) * 100),
      subtotalCents: Math.round(parseFloat(plan.perEmployeeFeeEur) * 100 * billingMetrics.uniqueActiveEmployees),
      isProrated: false
    };

    // Handle employee count changes
    if (prorationDetails) {
      if (prorationDetails.isUpgrade) {
        // Charge for additional employees from change date
        const additionalEmployees = prorationDetails.newEmployeeCount - prorationDetails.oldEmployeeCount;
        const upgradeProration = this.calculateProration(
          Math.round(parseFloat(plan.perEmployeeFeeEur) * 100 * additionalEmployees),
          periodStart,
          periodEnd,
          prorationDetails.changeDate,
          periodEnd
        );
        
        const upgradeItem: InvoiceLineItem = {
          description: subscription.invoiceLanguage === 'el'
            ? `Αναβάθμιση - ${additionalEmployees} επιπλέον εργαζόμενοι`
            : `Upgrade - ${additionalEmployees} additional employees`,
          periodStart: prorationDetails.changeDate.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
          quantity: additionalEmployees,
          unitPriceCents: Math.round(parseFloat(plan.perEmployeeFeeEur) * 100),
          subtotalCents: upgradeProration.prorationAmount,
          isProrated: true,
          prorationDetails: upgradeProration
        };
        items.push(upgradeItem);
      }
    }

    items.push(perEmployeeFeeItem);

    // Calculate totals
    const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);

    // Calculate VAT
    const vatCalculation = this.calculateVAT(
      subtotalCents,
      subscription.vatNumber || undefined,
      this.getCountryFromVatNumber(subscription.vatNumber || undefined) || 'GR'
    );

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(periodStart.getFullYear(), 'INV');

    // Create invoice
    const newInvoice: NewInvoice = {
      subscriptionId,
      invoiceNumber,
      type: 'invoice',
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0] as any,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as any, // 30 days
      periodStart: periodStart.toISOString().split('T')[0] as any,
      periodEnd: periodEnd.toISOString().split('T')[0] as any,
      subtotalCents: vatCalculation.subtotalCents,
      vatAmountCents: vatCalculation.vatAmountCents,
      totalCents: vatCalculation.totalCents,
      vatRate: vatCalculation.vatRate.toString(),
      vatTreatment: vatCalculation.vatTreatment,
      vatNote: vatCalculation.vatNote,
      language: subscription.invoiceLanguage,
      items: items as any,
      notes: subscription.invoiceNotes
    };

    const [invoice] = await db.insert(invoices)
      .values(newInvoice)
      .returning();

    return invoice;
  }

  /**
   * Create credit note for downgrades or refunds
   */
  async createCreditNote(
    originalInvoiceId: string,
    reason: 'downgrade' | 'refund' | 'correction' | 'cancellation',
    creditAmountCents: number,
    reasonNotes?: string
  ): Promise<CreditNote> {
    const originalInvoice = await db.select()
      .from(invoices)
      .where(eq(invoices.id, originalInvoiceId))
      .then(rows => rows[0]);

    if (!originalInvoice) {
      throw new Error(`Invoice ${originalInvoiceId} not found`);
    }

    // Calculate VAT on credit amount
    const vatRate = parseFloat(originalInvoice.vatRate);
    const creditSubtotalCents = Math.round(creditAmountCents / (1 + vatRate));
    const vatAmountCents = creditAmountCents - creditSubtotalCents;

    const creditNoteNumber = await this.generateInvoiceNumber(
      new Date().getFullYear(), 
      'CN'
    );

    const newCreditNote: NewCreditNote = {
      originalInvoiceId,
      subscriptionId: originalInvoice.subscriptionId,
      creditNoteNumber,
      reason,
      reasonNotes,
      creditAmountCents: creditSubtotalCents,
      vatAmountCents,
      totalCreditCents: creditAmountCents,
      issueDate: new Date().toISOString().split('T')[0] as any,
      appliedToBalance: reason !== 'refund',
      refundRequested: reason === 'refund'
    };

    const [creditNote] = await db.insert(creditNotes)
      .values(newCreditNote)
      .returning();

    return creditNote;
  }

  /**
   * Store employee metering data
   */
  async storeEmployeeMetering(
    subscriptionId: string,
    metrics: BillingMetrics,
    periodStart: Date,
    periodEnd: Date,
    isPartialMonth: boolean = false
  ): Promise<EmployeeMetering> {
    const daysInPeriod = Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    
    const newMetering: NewEmployeeMetering = {
      subscriptionId: metrics.subscriptionId,
      year: metrics.year,
      month: metrics.month,
      periodStart: periodStart.toISOString().split('T')[0] as any,
      periodEnd: periodEnd.toISOString().split('T')[0] as any,
      uniqueActiveEmployees: metrics.uniqueActiveEmployees,
      employeesWithPayActivity: metrics.employeesWithPayActivity,
      billableEmployees: metrics.meteringMethod === 'active_headcount' 
        ? metrics.uniqueActiveEmployees 
        : metrics.employeesWithPayActivity,
      meteringMethod: metrics.meteringMethod,
      isPartialMonth,
      daysInPeriod,
      snapshot: {} // Store employee details for audit
    };

    const [metering] = await db.insert(employeeMetering)
      .values(newMetering)
      .returning();

    return metering;
  }

  // Private helper methods
  private async getUniqueActiveEmployees(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    // Mock implementation - replace with actual employee query
    // This would query your employee tables based on active status during period
    return Math.floor(Math.random() * 50) + 10; // 10-60 employees
  }

  private async getEmployeesWithPayActivity(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    // Mock implementation - replace with actual payroll activity query
    // This would query payroll records for employees with pay events during period
    const activeEmployees = await this.getUniqueActiveEmployees(subscriptionId, periodStart, periodEnd);
    return Math.floor(activeEmployees * 0.85); // ~85% typically have pay activity
  }

  /**
   * Generate gapless sequential invoice number per legal entity series
   */
  private async generateInvoiceNumber(
    organizationId: string, 
    type: 'invoice' | 'credit_note' = 'invoice'
  ): Promise<{ invoiceNumber: string; series: string; sequentialNumber: number }> {
    const now = new Date();
    const year = now.getFullYear();
    const yearSuffix = year.toString().slice(-2); // Last 2 digits
    
    // Determine series based on type
    const seriesPrefix = type === 'credit_note' ? 'CN' : 'SALES';
    const series = `${seriesPrefix}-${yearSuffix}`;
    
    // Use transaction to ensure gapless numbering
    const result = await db.transaction(async (tx) => {
      // Get or create sequence for this legal entity/series/year
      let sequence = await tx.select()
        .from(invoiceSequences)
        .where(and(
          eq(invoiceSequences.legalEntityId, organizationId),
          eq(invoiceSequences.series, series),
          eq(invoiceSequences.year, year)
        ))
        .then(rows => rows[0]);

      if (!sequence) {
        [sequence] = await tx.insert(invoiceSequences)
          .values({
            legalEntityId: organizationId,
            series,
            year,
            lastNumber: 0
          })
          .returning();
      }

      // Increment and update atomically
      const nextNumber = sequence.lastNumber + 1;
      await tx.update(invoiceSequences)
        .set({ 
          lastNumber: nextNumber,
          updatedAt: new Date()
        })
        .where(eq(invoiceSequences.id, sequence.id));

      const invoiceNumber = `${series}-${String(nextNumber).padStart(6, '0')}`;
      
      return {
        invoiceNumber,
        series,
        sequentialNumber: nextNumber
      };
    });

    return result;
  }

  private isEUCountry(countryCode: string): boolean {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
    ];
    return euCountries.includes(countryCode);
  }

  private getCountryFromVatNumber(vatNumber?: string): string | undefined {
    if (!vatNumber || vatNumber.length < 2) return undefined;
    
    // Extract country prefix from VAT number
    const prefix = vatNumber.substring(0, 2).toUpperCase();
    
    // Special case for Greece - can be EL or GR
    if (prefix === 'EL') return 'GR';
    
    return prefix;
  }
}

export const billingService = new BillingService();