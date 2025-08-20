import { db } from '../db';
import { 
  dunningCampaigns, 
  dunningActions,
  invoices,
  subscriptions,
  type DunningCampaign,
  type NewDunningCampaign,
  type DunningAction,
  type NewDunningAction,
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
        daysAfterDue: 7, // 7 days after due date
        actionType: 'email',
        emailTemplate: 'payment_reminder_1',
        emailSubject: 'Payment Reminder - Invoice {invoiceNumber}'
      },
      {
        step: 2,
        daysAfterDue: 14, // 14 days after due date
        actionType: 'payment_retry',
      },
      {
        step: 3,
        daysAfterDue: 21, // 21 days after due date
        actionType: 'email',
        emailTemplate: 'payment_reminder_2',
        emailSubject: 'Urgent: Payment Required - Invoice {invoiceNumber}'
      },
      {
        step: 4,
        daysAfterDue: 30, // 30 days after due date
        actionType: 'service_suspension',
      },
      {
        step: 5,
        daysAfterDue: 45, // 45 days after due date
        actionType: 'final_notice',
        emailTemplate: 'final_notice',
        emailSubject: 'Final Notice - Account will be suspended - Invoice {invoiceNumber}'
      }
    ],
    serviceAccessRevocationStep: 4,
    finalNoticeStep: 5
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
          success = await this.suspendServiceAccess(campaign);
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
   * Suspend service access
   */
  private async suspendServiceAccess(campaign: DunningCampaign): Promise<boolean> {
    try {
      await db.update(dunningCampaigns)
        .set({
          serviceAccessRevoked: true,
          serviceAccessRevokedAt: new Date()
        })
        .where(eq(dunningCampaigns.id, campaign.id));

      // Here you would integrate with your application's access control system
      // to actually revoke service access for the subscription
      console.log(`Service access revoked for subscription ${campaign.subscriptionId}`);

      return true;

    } catch (error) {
      console.error('Failed to suspend service access:', error);
      return false;
    }
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
   * Restore service access (when payment is made)
   */
  async restoreServiceAccess(subscriptionId: string): Promise<void> {
    await db.update(dunningCampaigns)
      .set({
        serviceAccessRevoked: false,
        serviceAccessRevokedAt: null
      })
      .where(eq(dunningCampaigns.subscriptionId, subscriptionId));

    console.log(`Service access restored for subscription ${subscriptionId}`);
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