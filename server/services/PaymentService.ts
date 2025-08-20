import { db } from '../db';
import { 
  paymentMethods, 
  paymentAttempts, 
  invoices,
  subscriptions,
  type PaymentMethod,
  type NewPaymentMethod,
  type PaymentAttempt,
  type NewPaymentAttempt,
  type Invoice
} from '@shared/billingSchema';
import { eq, and, desc, sql } from 'drizzle-orm';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not configured. Payment processing will not work.');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil'
}) : null;

export interface CardPaymentMethod {
  type: 'card';
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvc: string;
  holderName: string;
}

export interface SepaPaymentMethod {
  type: 'sepa_debit';
  iban: string;
  accountHolder: string;
  bankName?: string;
  mandateAccepted: boolean;
}

export interface PaymentResult {
  success: boolean;
  paymentAttemptId: string;
  stripePaymentIntentId?: string;
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

export class PaymentService {
  
  /**
   * Add a card payment method for a subscription
   */
  async addCardPaymentMethod(
    subscriptionId: string,
    cardDetails: CardPaymentMethod,
    isDefault: boolean = false
  ): Promise<PaymentMethod> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      // Create Stripe payment method
      const stripePaymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: cardDetails.cardNumber,
          exp_month: cardDetails.expiryMonth,
          exp_year: cardDetails.expiryYear,
          cvc: cardDetails.cvc,
        },
        billing_details: {
          name: cardDetails.holderName,
        },
      });

      // If setting as default, mark all other methods as non-default
      if (isDefault) {
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.subscriptionId, subscriptionId));
      }

      const newPaymentMethod: NewPaymentMethod = {
        subscriptionId,
        type: 'card',
        status: 'active',
        cardLast4: stripePaymentMethod.card?.last4,
        cardBrand: stripePaymentMethod.card?.brand,
        cardExpiry: `${stripePaymentMethod.card?.exp_month}/${stripePaymentMethod.card?.exp_year}`,
        stripePaymentMethodId: stripePaymentMethod.id,
        isDefault
      };

      const [paymentMethod] = await db.insert(paymentMethods)
        .values(newPaymentMethod)
        .returning();

      return paymentMethod;

    } catch (error) {
      console.error('Failed to add card payment method:', error);
      throw new Error('Failed to add payment method');
    }
  }

  /**
   * Add a SEPA Direct Debit payment method
   */
  async addSepaPaymentMethod(
    subscriptionId: string,
    sepaDetails: SepaPaymentMethod,
    isDefault: boolean = false
  ): Promise<PaymentMethod> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    if (!sepaDetails.mandateAccepted) {
      throw new Error('SEPA mandate must be accepted');
    }

    try {
      // Create Stripe SEPA payment method
      const stripePaymentMethod = await stripe.paymentMethods.create({
        type: 'sepa_debit',
        sepa_debit: {
          iban: sepaDetails.iban,
        },
        billing_details: {
          name: sepaDetails.accountHolder,
        },
      });

      // Generate mandate ID
      const mandateId = `SEPA-${subscriptionId.slice(-8)}-${Date.now()}`;

      if (isDefault) {
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.subscriptionId, subscriptionId));
      }

      const newPaymentMethod: NewPaymentMethod = {
        subscriptionId,
        type: 'sepa_debit',
        status: 'active',
        sepaIban: sepaDetails.iban,
        sepaBankName: sepaDetails.bankName,
        sepaAccountHolder: sepaDetails.accountHolder,
        sepaMandateId: mandateId,
        sepaMandateDate: new Date().toISOString().split('T')[0] as any,
        stripePaymentMethodId: stripePaymentMethod.id,
        isDefault
      };

      const [paymentMethod] = await db.insert(paymentMethods)
        .values(newPaymentMethod)
        .returning();

      return paymentMethod;

    } catch (error) {
      console.error('Failed to add SEPA payment method:', error);
      throw new Error('Failed to add SEPA payment method');
    }
  }

  /**
   * Attempt payment for an invoice
   */
  async processPayment(
    invoiceId: string,
    paymentMethodId?: string
  ): Promise<PaymentResult> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const invoice = await db.select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .then(rows => rows[0]);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get payment method
    let paymentMethod: PaymentMethod | undefined;
    
    if (paymentMethodId) {
      paymentMethod = await db.select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, paymentMethodId))
        .then(rows => rows[0]);
    } else {
      // Use default payment method
      paymentMethod = await db.select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.subscriptionId, invoice.subscriptionId),
          eq(paymentMethods.isDefault, true),
          eq(paymentMethods.status, 'active')
        ))
        .then(rows => rows[0]);
    }

    if (!paymentMethod || !paymentMethod.stripePaymentMethodId) {
      throw new Error('No valid payment method found');
    }

    // Create payment attempt record
    const newPaymentAttempt: NewPaymentAttempt = {
      invoiceId,
      paymentMethodId: paymentMethod.id,
      status: 'pending',
      amountCents: invoice.totalCents,
      attemptedAt: new Date()
    };

    const [paymentAttempt] = await db.insert(paymentAttempts)
      .values(newPaymentAttempt)
      .returning();

    try {
      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: invoice.totalCents,
        currency: 'eur',
        payment_method: paymentMethod.stripePaymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        description: `Invoice ${invoice.invoiceNumber}`,
        metadata: {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscriptionId
        }
      });

      // Update payment attempt with Stripe details
      await db.update(paymentAttempts)
        .set({
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending'
        })
        .where(eq(paymentAttempts.id, paymentAttempt.id));

      if (paymentIntent.status === 'succeeded') {
        // Mark invoice as paid
        await db.update(invoices)
          .set({
            status: 'paid'
          })
          .where(eq(invoices.id, invoice.id));

        await db.update(paymentAttempts)
          .set({
            status: 'succeeded',
            succeededAt: new Date(),
            stripeChargeId: paymentIntent.latest_charge as string
          })
          .where(eq(paymentAttempts.id, paymentAttempt.id));

        return {
          success: true,
          paymentAttemptId: paymentAttempt.id,
          stripePaymentIntentId: paymentIntent.id
        };
      } else if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          paymentAttemptId: paymentAttempt.id,
          stripePaymentIntentId: paymentIntent.id,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret || undefined
        };
      } else {
        await db.update(paymentAttempts)
          .set({
            status: 'failed',
            failedAt: new Date(),
            failureCode: paymentIntent.last_payment_error?.code,
            failureMessage: paymentIntent.last_payment_error?.message
          })
          .where(eq(paymentAttempts.id, paymentAttempt.id));

        return {
          success: false,
          paymentAttemptId: paymentAttempt.id,
          error: paymentIntent.last_payment_error?.message || 'Payment failed'
        };
      }

    } catch (error) {
      console.error('Payment processing failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await db.update(paymentAttempts)
        .set({
          status: 'failed',
          failedAt: new Date(),
          failureMessage: errorMessage
        })
        .where(eq(paymentAttempts.id, paymentAttempt.id));

      return {
        success: false,
        paymentAttemptId: paymentAttempt.id,
        error: errorMessage
      };
    }
  }

  /**
   * Retry payment for a failed attempt
   */
  async retryPayment(paymentAttemptId: string): Promise<PaymentResult> {
    const attempt = await db.select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.id, paymentAttemptId))
      .then(rows => rows[0]);

    if (!attempt) {
      throw new Error('Payment attempt not found');
    }

    return this.processPayment(attempt.invoiceId, attempt.paymentMethodId || undefined);
  }

  /**
   * Get payment methods for a subscription
   */
  async getPaymentMethods(subscriptionId: string): Promise<PaymentMethod[]> {
    return db.select()
      .from(paymentMethods)
      .where(and(
        eq(paymentMethods.subscriptionId, subscriptionId),
        eq(paymentMethods.status, 'active')
      ))
      .orderBy(desc(paymentMethods.isDefault), paymentMethods.createdAt);
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    const paymentMethod = await db.select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, paymentMethodId))
      .then(rows => rows[0]);

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Remove from Stripe if configured
    if (stripe && paymentMethod.stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
      } catch (error) {
        console.warn('Failed to detach Stripe payment method:', error);
      }
    }

    // Mark as inactive
    await db.update(paymentMethods)
      .set({ status: 'expired' })
      .where(eq(paymentMethods.id, paymentMethodId));
  }

  /**
   * Set payment method as default
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    const paymentMethod = await db.select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, paymentMethodId))
      .then(rows => rows[0]);

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Unset current default
    await db.update(paymentMethods)
      .set({ isDefault: false })
      .where(eq(paymentMethods.subscriptionId, paymentMethod.subscriptionId));

    // Set new default
    await db.update(paymentMethods)
      .set({ isDefault: true })
      .where(eq(paymentMethods.id, paymentMethodId));
  }

  /**
   * Get payment history for a subscription
   */
  async getPaymentHistory(subscriptionId: string, limit: number = 50): Promise<PaymentAttempt[]> {
    return db.select()
      .from(paymentAttempts)
      .leftJoin(invoices, eq(paymentAttempts.invoiceId, invoices.id))
      .where(eq(invoices.subscriptionId, subscriptionId))
      .orderBy(desc(paymentAttempts.attemptedAt))
      .limit(limit)
      .then(rows => rows.map(row => row.payment_attempts));
  }

  /**
   * Validate IBAN format for SEPA payments
   */
  validateIban(iban: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Check basic format (2 letters + 2 digits + up to 30 alphanumeric)
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
      return false;
    }
    
    // Check length (varies by country, but typically 15-34 characters)
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      return false;
    }

    // IBAN checksum validation (simplified)
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    let converted = '';
    
    for (const char of rearranged) {
      if (/[A-Z]/.test(char)) {
        converted += (char.charCodeAt(0) - 55).toString();
      } else {
        converted += char;
      }
    }
    
    // Calculate mod 97
    let remainder = 0;
    for (let i = 0; i < converted.length; i++) {
      remainder = (remainder * 10 + parseInt(converted[i])) % 97;
    }
    
    return remainder === 1;
  }
}

export const paymentService = new PaymentService();