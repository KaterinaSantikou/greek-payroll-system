import { db } from '../db';
import { 
  dunningCampaigns, 
  dunningActions,
  invoices,
  subscriptions,
  serviceRestrictions,
  type DunningCampaign,
  type NewDunningCampaign,
  type DunningAction,
  type NewDunningAction,
  type ServiceRestriction,
  type NewServiceRestriction,
  type Invoice,
  type Subscription
} from '@shared/billingSchema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { paymentService } from './PaymentService';

export interface DunningStep {
  step: number;
  daysAfterDue: number;
  actionType: 'email' | 'payment_retry' | 'service_suspension' | 'final_notice';
  emailTemplate?: string;
  emailSubject?: string;
}

export interface DunningConfig {
  steps: DunningStep[];
  serviceAccessRevocationStep: number; // Which step revokes service access
  finalNoticeStep: number; // Final step before collection
}

export class DunningService {
  
  private readonly defaultDunningConfig: DunningConfig = {
    steps: [
      {
        step: 1,
        daysAfterDue: 0, // D0: charge fails, send email #1 + retry same day
        actionType: 'email',
        emailTemplate: 'payment_failed_d0',
        emailSubject: 'Payment Failed - Invoice {invoiceNumber} - Action Required'
      },
      {
        step: 2,
        daysAfterDue: 3, // D3: retry + email #2 (SEPA: represent)
        actionType: 'payment_retry',
      },
      {
        step: 3,
        daysAfterDue: 3, // D3: Send email after retry
        actionType: 'email',
        emailTemplate: 'payment_retry_d3',
        emailSubject: 'Payment Retry - Invoice {invoiceNumber}'
      },
      {
        step: 4,
        daysAfterDue: 7, // D7: retry + email #3; flag past due; restrict filings
        actionType: 'payment_retry',
      },
      {
        step: 5,
        daysAfterDue: 7, // D7: Email and restrict filings
        actionType: 'email',
        emailTemplate: 'past_due_d7',
        emailSubject: 'Past Due - Service Restrictions Applied - Invoice {invoiceNumber}'
      },
      {
        step: 6,
        daysAfterDue: 14, // D14: final notice; suspend payments features; keep data read-only
        actionType: 'service_suspension',
      },
      {
        step: 7,
        daysAfterDue: 14, // D14: Final notice email
        actionType: 'final_notice',
        emailTemplate: 'final_notice_d14',
        emailSubject: 'FINAL NOTICE - Payment Features Suspended - Invoice {invoiceNumber}'
      }
    ],
    serviceAccessRevocationStep: 6,
    finalNoticeStep: 7
  };

  /**
   * Start dunning campaign for overdue invoice
   */
  async startDunningCampaign(invoiceId: string): Promise<DunningCampaign> {
    const invoice = await db.select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .then(rows => rows[0]);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'overdue') {
      throw new Error('Can only start dunning for overdue invoices');
    }

    // Check if campaign already exists
    const existingCampaign = await db.select()
      .from(dunningCampaigns)
      .where(and(
        eq(dunningCampaigns.invoiceId, invoiceId),
        eq(dunningCampaigns.status, 'active')
      ))
      .then(rows => rows[0]);

    if (existingCampaign) {
      return existingCampaign;
    }

    const config = this.defaultDunningConfig;
    const firstStep = config.steps[0];
    const nextActionDate = new Date();
    nextActionDate.setDate(nextActionDate.getDate() + firstStep.daysAfterDue);

    const newCampaign: NewDunningCampaign = {
      invoiceId,
      subscriptionId: invoice.subscriptionId,
      status: 'active',
      currentStep: 0, // Will be incremented when first action is scheduled
      maxSteps: config.steps.length,
      startedAt: new Date(),
      nextActionAt: nextActionDate
    };

    const [campaign] = await db.insert(dunningCampaigns)
      .values(newCampaign)
      .returning();

    // Schedule first action
    await this.scheduleNextAction(campaign.id);

    return campaign;
  }

  /**
   * Process due dunning actions
   */
  async processDueDunningActions(): Promise<void> {
    const dueActions = await db.select()
      .from(dunningActions)
      .leftJoin(dunningCampaigns, eq(dunningActions.campaignId, dunningCampaigns.id))
      .leftJoin(invoices, eq(dunningCampaigns.invoiceId, invoices.id))
      .leftJoin(subscriptions, eq(dunningCampaigns.subscriptionId, subscriptions.id))
      .where(and(
        lte(dunningActions.scheduledAt, new Date()),
        eq(dunningActions.status, 'pending'),
        eq(dunningCampaigns.status, 'active')
      ));

    for (const row of dueActions) {
      const action = row.dunning_actions;
      const campaign = row.dunning_campaigns!;
      const invoice = row.invoices!;
      const subscription = row.subscriptions!;

      await this.executeAction(action, campaign, invoice, subscription);
    }
  }

  /**
   * Execute a specific dunning action
   */
  private async executeAction(
    action: DunningAction,
    campaign: DunningCampaign,
    invoice: Invoice,
    subscription: Subscription
  ): Promise<void> {
    try {
      let success = false;

      switch (action.type) {
        case 'email':
          success = await this.sendDunningEmail(action, invoice, subscription);
          break;
        
        case 'payment_retry':
          success = await this.retryPayment(action, invoice);
          break;
        
        case 'service_suspension':
          success = await this.applyServiceRestrictions(campaign, action.step);
          break;
        
        case 'final_notice':
          success = await this.sendFinalNotice(action, invoice, subscription);
          break;
      }

      if (success) {
        await db.update(dunningActions)
          .set({
            status: 'completed',
            executedAt: new Date()
          })
          .where(eq(dunningActions.id, action.id));

        // Update campaign progress
        await db.update(dunningCampaigns)
          .set({
            currentStep: action.step
          })
          .where(eq(dunningCampaigns.id, campaign.id));

        // Schedule next action if not at max steps
        if (action.step < campaign.maxSteps) {
          await this.scheduleNextAction(campaign.id);
        } else {
          // Campaign complete
          await db.update(dunningCampaigns)
            .set({
              status: 'completed',
              completedAt: new Date()
            })
            .where(eq(dunningCampaigns.id, campaign.id));
        }

      } else {
        await db.update(dunningActions)
          .set({
            status: 'failed',
            failedAt: new Date(),
            errorMessage: 'Action execution failed'
          })
          .where(eq(dunningActions.id, action.id));
      }

    } catch (error) {
      console.error(`Failed to execute dunning action ${action.id}:`, error);
      
      await db.update(dunningActions)
        .set({
          status: 'failed',
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(dunningActions.id, action.id));
    }
  }

  /**
   * Schedule next action in dunning campaign
   */
  private async scheduleNextAction(campaignId: string): Promise<void> {
    const campaign = await db.select()
      .from(dunningCampaigns)
      .where(eq(dunningCampaigns.id, campaignId))
      .then(rows => rows[0]);

    if (!campaign) return;

    const nextStep = campaign.currentStep + 1;
    if (nextStep > campaign.maxSteps) return;

    const config = this.defaultDunningConfig;
    const stepConfig = config.steps[nextStep - 1]; // steps are 0-indexed in config

    if (!stepConfig) return;

    const invoice = await db.select()
      .from(invoices)
      .where(eq(invoices.id, campaign.invoiceId))
      .then(rows => rows[0]);

    if (!invoice) return;

    // Calculate schedule date based on due date + step days
    const dueDate = new Date(invoice.dueDate);
    const scheduledDate = new Date(dueDate);
    scheduledDate.setDate(dueDate.getDate() + stepConfig.daysAfterDue);

    const subscription = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, campaign.subscriptionId))
      .then(rows => rows[0]);

    const newAction: NewDunningAction = {
      campaignId,
      step: nextStep,
      type: stepConfig.actionType,
      status: 'pending',
      scheduledAt: scheduledDate,
      emailTo: subscription?.billingEmail,
      emailSubject: stepConfig.emailSubject?.replace('{invoiceNumber}', invoice.invoiceNumber),
      emailTemplate: stepConfig.emailTemplate
    };

    await db.insert(dunningActions)
      .values(newAction);

    // Update campaign next action time
    await db.update(dunningCampaigns)
      .set({
        nextActionAt: scheduledDate
      })
      .where(eq(dunningCampaigns.id, campaignId));
  }

  /**
   * Send dunning email
   */
  private async sendDunningEmail(
    action: DunningAction,
    invoice: Invoice,
    subscription: Subscription
  ): Promise<boolean> {
    try {
      // This would integrate with your email service (SendGrid, SES, etc.)
      console.log(`Sending dunning email to ${action.emailTo}`);
      console.log(`Template: ${action.emailTemplate}`);
      console.log(`Subject: ${action.emailSubject}`);
      console.log(`Invoice: ${invoice.invoiceNumber}, Amount: €${invoice.totalCents / 100}`);

      // Mock email sending - replace with actual email service integration
      const emailContent = this.generateEmailContent(action.emailTemplate!, invoice, subscription);
      
      // Update action with email details
      await db.update(dunningActions)
        .set({
          emailSentAt: new Date()
        })
        .where(eq(dunningActions.id, action.id));

      return true;

    } catch (error) {
      console.error('Failed to send dunning email:', error);
      return false;
    }
  }

  /**
   * Retry payment for overdue invoice
   */
  private async retryPayment(action: DunningAction, invoice: Invoice): Promise<boolean> {
    try {
      const result = await paymentService.processPayment(invoice.id);
      
      // Update action with payment attempt details
      await db.update(dunningActions)
        .set({
          paymentAttemptId: result.paymentAttemptId
        })
        .where(eq(dunningActions.id, action.id));

      return result.success;

    } catch (error) {
      console.error('Failed to retry payment:', error);
      return false;
    }
  }

  /**
   * Apply service restrictions based on dunning step
   */
  private async applyServiceRestrictions(campaign: DunningCampaign, step: number): Promise<boolean> {
    try {
      const now = new Date();

      // D7: Restrict filings
      if (step === 5 && !campaign.filingsRestricted) {
        await db.update(dunningCampaigns)
          .set({
            filingsRestricted: true,
            filingsRestrictedAt: now
          })
          .where(eq(dunningCampaigns.id, campaign.id));

        // Create service restriction record
        await db.insert(serviceRestrictions)
          .values({
            subscriptionId: campaign.subscriptionId,
            restrictionType: 'filings_restricted',
            restrictionLevel: 2,
            restrictFilings: true,
            appliedAt: now,
            reason: 'overdue_payment'
          });

        console.log(`Filings restricted for subscription ${campaign.subscriptionId} (D7)`);
      }

      // D14: Suspend payments features (keep data read-only)
      if (step === 6 && !campaign.paymentsRestricted) {
        await db.update(dunningCampaigns)
          .set({
            paymentsRestricted: true,
            paymentsRestrictedAt: now,
            serviceAccessRevoked: true,
            serviceAccessRevokedAt: now
          })
          .where(eq(dunningCampaigns.id, campaign.id));

        // Create service restriction record
        await db.insert(serviceRestrictions)
          .values({
            subscriptionId: campaign.subscriptionId,
            restrictionType: 'payments_suspended',
            restrictionLevel: 3,
            restrictFilings: true,
            restrictPayments: true,
            appliedAt: now,
            reason: 'overdue_payment'
          });

        console.log(`Payment features suspended for subscription ${campaign.subscriptionId} (D14)`);
      }

      return true;

    } catch (error) {
      console.error('Failed to apply service restrictions:', error);
      return false;
    }
  }

  /**
   * Check if subscription has active service restrictions
   */
  async getActiveServiceRestrictions(subscriptionId: string): Promise<ServiceRestriction[]> {
    return db.select()
      .from(serviceRestrictions)
      .where(and(
        eq(serviceRestrictions.subscriptionId, subscriptionId),
        eq(serviceRestrictions.isActive, true)
      ));
  }

  /**
   * Check if specific functionality is restricted
   */
  async isFilingsRestricted(subscriptionId: string): Promise<boolean> {
    const restrictions = await this.getActiveServiceRestrictions(subscriptionId);
    return restrictions.some(r => r.restrictFilings);
  }

  async isPaymentsRestricted(subscriptionId: string): Promise<boolean> {
    const restrictions = await this.getActiveServiceRestrictions(subscriptionId);
    return restrictions.some(r => r.restrictPayments);
  }

  /**
   * Suspend service access (legacy method, now uses applyServiceRestrictions)
   */
  private async suspendServiceAccess(campaign: DunningCampaign): Promise<boolean> {
    return this.applyServiceRestrictions(campaign, 6);
  }

  /**
   * Send final notice before collection
   */
  private async sendFinalNotice(
    action: DunningAction,
    invoice: Invoice,
    subscription: Subscription
  ): Promise<boolean> {
    // Similar to dunning email but with more urgent tone
    return this.sendDunningEmail(action, invoice, subscription);
  }

  /**
   * Stop dunning campaign (when invoice is paid)
   */
  async stopDunningCampaign(invoiceId: string): Promise<void> {
    await db.update(dunningCampaigns)
      .set({
        status: 'completed',
        completedAt: new Date()
      })
      .where(and(
        eq(dunningCampaigns.invoiceId, invoiceId),
        eq(dunningCampaigns.status, 'active')
      ));

    // Cancel pending actions
    const campaigns = await db.select()
      .from(dunningCampaigns)
      .where(eq(dunningCampaigns.invoiceId, invoiceId));

    for (const campaign of campaigns) {
      await db.update(dunningActions)
        .set({ status: 'cancelled' })
        .where(and(
          eq(dunningActions.campaignId, campaign.id),
          eq(dunningActions.status, 'pending')
        ));
    }
  }

  /**
   * Lift service restrictions (when payment is made)
   */
  async liftAllServiceRestrictions(subscriptionId: string): Promise<void> {
    const now = new Date();

    // Update dunning campaigns to lift restrictions
    await db.update(dunningCampaigns)
      .set({
        serviceAccessRevoked: false,
        serviceAccessRevokedAt: null,
        filingsRestricted: false,
        filingsRestrictedAt: null,
        paymentsRestricted: false,
        paymentsRestrictedAt: null
      })
      .where(eq(dunningCampaigns.subscriptionId, subscriptionId));

    // Mark all active service restrictions as lifted
    await db.update(serviceRestrictions)
      .set({
        isActive: false,
        liftedAt: now,
        updatedAt: now
      })
      .where(and(
        eq(serviceRestrictions.subscriptionId, subscriptionId),
        eq(serviceRestrictions.isActive, true)
      ));

    console.log(`All service restrictions lifted for subscription ${subscriptionId}`);
  }

  /**
   * Restore service access (legacy method)
   */
  async restoreServiceAccess(subscriptionId: string): Promise<void> {
    await this.liftAllServiceRestrictions(subscriptionId);
  }

  /**
   * Get active dunning campaigns for a subscription
   */
  async getActiveCampaigns(subscriptionId: string): Promise<DunningCampaign[]> {
    return db.select()
      .from(dunningCampaigns)
      .where(and(
        eq(dunningCampaigns.subscriptionId, subscriptionId),
        eq(dunningCampaigns.status, 'active')
      ));
  }

  /**
   * Generate email content based on template
   */
  private generateEmailContent(template: string, invoice: Invoice, subscription: Subscription): string {
    const templates: Record<string, string> = {
      payment_failed_d0: `
        Dear ${subscription.companyName},
        
        Your payment for invoice ${invoice.invoiceNumber} (€${invoice.totalCents / 100}) has failed.
        
        We will retry the payment automatically. Please ensure your payment method is valid and has sufficient funds.
        
        If the issue persists, please update your payment method or contact our billing team.
        
        Thank you for your prompt attention.
      `,
      payment_retry_d3: `
        Dear ${subscription.companyName},
        
        We attempted to retry payment for invoice ${invoice.invoiceNumber} (€${invoice.totalCents / 100}) but it failed again.
        
        Please review and update your payment method immediately to avoid service disruptions.
        
        Our billing team is available to assist you with payment processing.
      `,
      past_due_d7: `
        Dear ${subscription.companyName},
        
        Invoice ${invoice.invoiceNumber} for €${invoice.totalCents / 100} is now past due.
        
        IMPORTANT: To prevent further service disruptions, we have temporarily restricted:
        - Payroll filing submissions to government systems
        
        Your data remains accessible, but filing capabilities are limited until payment is received.
        
        Please settle this invoice immediately to restore full service access.
      `,
      final_notice_d14: `
        FINAL NOTICE - PAYMENT FEATURES SUSPENDED
        
        Dear ${subscription.companyName},
        
        Invoice ${invoice.invoiceNumber} for €${invoice.totalCents / 100} remains unpaid after multiple attempts.
        
        EFFECTIVE IMMEDIATELY, the following features are suspended:
        - Payment processing capabilities
        - Payroll filing submissions
        - New employee onboarding
        
        Your data remains accessible in read-only mode for compliance purposes.
        
        Payment must be made within 48 hours to restore full service access.
        Contact our billing team immediately: billing@payrollsync.gr
      `,
      // Legacy templates for backward compatibility
      payment_reminder_1: `
        Dear ${subscription.companyName},
        
        We hope this message finds you well. This is a friendly reminder that your invoice ${invoice.invoiceNumber} 
        for €${invoice.totalCents / 100} was due on ${invoice.dueDate}.
        
        Please process the payment at your earliest convenience to avoid any service interruptions.
        
        If you have already made this payment, please disregard this message.
        
        Thank you for your business.
      `,
      payment_reminder_2: `
        Dear ${subscription.companyName},
        
        This is an urgent reminder that your invoice ${invoice.invoiceNumber} for €${invoice.totalCents / 100} 
        remains unpaid and is now significantly overdue.
        
        Please settle this invoice immediately to avoid service suspension.
        
        If you are experiencing payment difficulties, please contact our billing team immediately.
      `,
      final_notice: `
        FINAL NOTICE
        
        Dear ${subscription.companyName},
        
        Your account is seriously delinquent. Invoice ${invoice.invoiceNumber} for €${invoice.totalCents / 100} 
        must be paid immediately.
        
        Failure to pay within 5 business days will result in:
        - Complete suspension of service access
        - Referral to collection agency
        - Additional fees and legal costs
        
        Please contact us immediately to resolve this matter.
      `
    };

    return templates[template] || `Payment reminder for invoice ${invoice.invoiceNumber}`;
  }
}

export const dunningService = new DunningService();