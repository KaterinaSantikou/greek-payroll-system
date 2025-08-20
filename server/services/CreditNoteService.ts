import { db } from '../db';
import { 
  invoices,
  subscriptions,
  type Invoice,
  type NewInvoice,
  type Subscription
} from '@shared/billingSchema';
import { eq, and } from 'drizzle-orm';
import { billingService } from './BillingService';
import { currencyService } from './CurrencyService';

export interface CreditNoteRequest {
  originalInvoiceId: string;
  reason: 'downgrade' | 'refund' | 'correction' | 'cancellation';
  creditAmountCents: number;
  reasonNotes?: string;
  currency?: string; // Original invoice currency
}

export class CreditNoteService {

  /**
   * Create credit note (Πιστωτικό Τιμολόγιο) for refund/adjustment
   */
  async createCreditNote(request: CreditNoteRequest): Promise<Invoice> {
    const originalInvoice = await db.select()
      .from(invoices)
      .where(eq(invoices.id, request.originalInvoiceId))
      .then(rows => rows[0]);

    if (!originalInvoice) {
      throw new Error(`Original invoice ${request.originalInvoiceId} not found`);
    }

    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, originalInvoice.subscriptionId))
      .then(rows => rows[0]);

    if (!subscription) {
      throw new Error(`Subscription ${originalInvoice.subscriptionId} not found`);
    }

    // Calculate credit amounts in original currency
    const creditCurrency = request.currency || originalInvoice.originalCurrency;
    const vatRate = parseFloat(originalInvoice.vatRate);
    
    // Calculate subtotal (excluding VAT)
    const creditSubtotalCents = Math.round(request.creditAmountCents / (1 + vatRate));
    const creditVatCents = request.creditAmountCents - creditSubtotalCents;

    // Convert to EUR for VAT compliance if needed
    let creditSubtotalEurCents = creditSubtotalCents;
    let creditVatEurCents = creditVatCents;
    let exchangeRate = 1.0;
    let exchangeRateDate = new Date();

    if (creditCurrency !== 'EUR') {
      const conversion = await currencyService.convertCurrency(
        request.creditAmountCents,
        creditCurrency,
        'EUR',
        new Date() // Use current date for credit note
      );

      if (!conversion) {
        throw new Error(`Unable to convert ${creditCurrency} to EUR for VAT compliance`);
      }

      exchangeRate = conversion.exchangeRate;
      exchangeRateDate = conversion.exchangeRateDate;
      
      const creditSubtotalEurConversion = await currencyService.convertCurrency(
        creditSubtotalCents,
        creditCurrency,
        'EUR',
        exchangeRateDate
      );
      
      const creditVatEurConversion = await currencyService.convertCurrency(
        creditVatCents,
        creditCurrency,
        'EUR',
        exchangeRateDate
      );

      if (creditSubtotalEurConversion && creditVatEurConversion) {
        creditSubtotalEurCents = creditSubtotalEurConversion.eurAmountCents;
        creditVatEurCents = creditVatEurConversion.eurAmountCents;
      }
    }

    // Generate credit note number
    const numberingInfo = await (billingService as any).generateInvoiceNumber(
      subscription.organizationId,
      'credit_note'
    );

    // Create credit note line items
    const creditLineItems = [
      {
        description: subscription.invoiceLanguage === 'el' 
          ? `Πίστωση για τιμολόγιο ${originalInvoice.invoiceNumber}` 
          : `Credit for invoice ${originalInvoice.invoiceNumber}`,
        periodStart: originalInvoice.periodStart,
        periodEnd: originalInvoice.periodEnd,
        quantity: -1,
        unitPriceCents: request.creditAmountCents,
        subtotalCents: -creditSubtotalCents,
        isProrated: false,
        creditReason: request.reason,
        originalInvoiceReference: originalInvoice.invoiceNumber
      }
    ];

    // Determine credit note type description
    const creditNoteTypeEl = this.getCreditNoteTypeGreek(request.reason);
    const creditNoteTypeEn = this.getCreditNoteTypeEnglish(request.reason);

    // Create credit note invoice
    const creditNoteInvoice: NewInvoice = {
      subscriptionId: originalInvoice.subscriptionId,
      invoiceNumber: numberingInfo.invoiceNumber,
      series: numberingInfo.series,
      sequentialNumber: numberingInfo.sequentialNumber,
      type: 'credit_note',
      status: 'draft',
      
      // Reference original invoice
      originalInvoiceId: request.originalInvoiceId,
      creditReason: `${creditNoteTypeEl} / ${creditNoteTypeEn}: ${request.reasonNotes || ''}`,
      
      // Dates
      issueDate: new Date().toISOString().split('T')[0] as any,
      dueDate: new Date().toISOString().split('T')[0] as any, // Credit notes are immediately applicable
      periodStart: originalInvoice.periodStart,
      periodEnd: originalInvoice.periodEnd,
      
      // Currency information
      originalCurrency: creditCurrency,
      exchangeRate: exchangeRate.toString(),
      exchangeRateDate: exchangeRateDate.toISOString().split('T')[0] as any,
      
      // Amounts (negative for credit)
      subtotalCents: -creditSubtotalCents,
      vatAmountCents: -creditVatCents,
      totalCents: -request.creditAmountCents,
      
      // EUR amounts for VAT compliance
      subtotalEurCents: -creditSubtotalEurCents,
      vatAmountEurCents: -creditVatEurCents,
      totalEurCents: -(creditSubtotalEurCents + creditVatEurCents),
      
      vatRate: originalInvoice.vatRate,
      vatTreatment: originalInvoice.vatTreatment,
      vatNote: originalInvoice.vatNote,
      
      // Invoice details
      language: subscription.invoiceLanguage,
      items: creditLineItems as any,
      notes: `${subscription.invoiceLanguage === 'el' ? 'Πιστωτικό Τιμολόγιο' : 'Credit Note'} - ${creditNoteTypeEl}\n\n${request.reasonNotes || ''}`
    };

    const creditNoteResult = await db.insert(invoices)
      .values(creditNoteInvoice)
      .returning();

    const creditNote = creditNoteResult[0];
    console.log(`Created credit note ${creditNote.invoiceNumber} for invoice ${originalInvoice.invoiceNumber} (${request.reason})`);

    return creditNote;
  }

  /**
   * Get Greek description for credit note type
   */
  private getCreditNoteTypeGreek(reason: string): string {
    const types: Record<string, string> = {
      'downgrade': 'Υποβάθμιση υπηρεσίας',
      'refund': 'Επιστροφή χρημάτων',
      'correction': 'Διόρθωση τιμολογίου',
      'cancellation': 'Ακύρωση τιμολογίου'
    };
    
    return types[reason] || 'Πίστωση';
  }

  /**
   * Get English description for credit note type
   */
  private getCreditNoteTypeEnglish(reason: string): string {
    const types: Record<string, string> = {
      'downgrade': 'Service downgrade',
      'refund': 'Money refund',
      'correction': 'Invoice correction',
      'cancellation': 'Invoice cancellation'
    };
    
    return types[reason] || 'Credit';
  }

  /**
   * Get credit notes for a subscription
   */
  async getCreditNotes(subscriptionId: string): Promise<Invoice[]> {
    const result = await db.select()
      .from(invoices)
      .where(and(
        eq(invoices.subscriptionId, subscriptionId),
        eq(invoices.type, 'credit_note')
      ));
    return result;
  }

  /**
   * Get credit notes for a specific original invoice
   */
  async getCreditNotesForInvoice(originalInvoiceId: string): Promise<Invoice[]> {
    const result = await db.select()
      .from(invoices)
      .where(eq(invoices.originalInvoiceId, originalInvoiceId));
    return result;
  }

  /**
   * Calculate remaining balance after credit notes
   */
  async calculateRemainingBalance(invoiceId: string): Promise<number> {
    const originalInvoice = await db.select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .then(rows => rows[0]);

    if (!originalInvoice) {
      throw new Error('Invoice not found');
    }

    const creditNotes = await this.getCreditNotesForInvoice(invoiceId);
    const totalCredits = creditNotes.reduce((sum, cn) => sum + Math.abs(cn.totalCents), 0);

    return originalInvoice.totalCents - totalCredits;
  }

  /**
   * Auto-create credit note for subscription downgrades
   */
  async createDowngradeCreditNote(
    subscriptionId: string,
    originalInvoiceId: string,
    proratedRefundCents: number,
    changeDate: Date,
    oldEmployeeCount: number,
    newEmployeeCount: number
  ): Promise<Invoice> {
    const reasonNotes = `Downgrade from ${oldEmployeeCount} to ${newEmployeeCount} employees effective ${changeDate.toISOString().split('T')[0]}`;

    return this.createCreditNote({
      originalInvoiceId,
      reason: 'downgrade',
      creditAmountCents: proratedRefundCents,
      reasonNotes
    });
  }
}

export const creditNoteService = new CreditNoteService();