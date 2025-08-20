/**
 * Dunning Email Service
 * Handles progressive dunning communications with Greek/English templates
 */

import { EventEmitter } from 'events';
import { addHours, format, isWithinInterval, setHours, setMinutes } from 'date-fns';
import { zonedTimeToUtc, toZonedTime } from 'date-fns-tz';

export interface DunningEmailConfig {
  globalSettings: {
    timezone: string;
    sendWindows: {
      D0: { immediate: boolean };
      D3_D7: { 
        hours: [number, number]; // [10, 12] for 10:00-12:00
        days: number[]; // [2,3,4,5] for Tue-Fri
      };
      D14: {
        hours: [number, number]; // [9.5, 11] for 09:30-11:00
        days: number[]; // [1,2] for Mon/Tue
      };
    };
    utm: {
      source: string;
      medium: string;
      campaign: string; // uses {{trigger_id}}
    };
    sender: {
      fromNameTemplate: string; // "{{supplier_name}} Billing"
      fromEmailTemplate: string; // "billing@{{supplier_domain}}"
      replyToTemplate: string; // "accounts@{{supplier_domain}}"
    };
  };
}

export interface DunningVariables {
  // Customer info
  customer_name: string;
  tenant_name: string;
  
  // Invoice details
  invoice_number: string;
  invoice_series: string;
  invoice_issue_date: string; // ISO date
  amount_due: number;
  currency: string; // "EUR"
  due_date: string;
  days_past_due: number;
  
  // Payment
  pay_link: string;
  invoice_pdf_url: string;
  payment_method: 'card' | 'sepa_dd';
  last4?: string; // for card
  sepa_mandate_ref?: string; // for SEPA
  next_retry_date: string;
  grace_suspend_date: string;
  
  // Support
  support_email: string;
  support_phone: string;
  
  // Supplier/Legal
  supplier_name: string;
  supplier_vat: string; // ΑΦΜ
  supplier_tax_office: string; // ΔΟΥ
  supplier_address: string;
  supplier_domain: string;
  legal_footer: string;
  
  // Localization
  is_el: boolean; // true for Greek, false for English
  
  // System
  trigger_id: string;
}

export interface DunningStage {
  stage: 'D0' | 'D3' | 'D7' | 'D14' | 'SUCCESS';
  scheduledAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  templateId: string;
  variables: DunningVariables;
}

export class DunningEmailService extends EventEmitter {
  private static instance: DunningEmailService;
  private config: DunningEmailConfig;
  private scheduledEmails: Map<string, DunningStage[]> = new Map();
  private scheduleTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.config = {
      globalSettings: {
        timezone: 'Europe/Athens',
        sendWindows: {
          D0: { immediate: true },
          D3_D7: { 
            hours: [10, 12], // 10:00-12:00
            days: [2, 3, 4, 5] // Tue-Fri
          },
          D14: {
            hours: [9.5, 11], // 09:30-11:00
            days: [1, 2] // Mon/Tue
          }
        },
        utm: {
          source: 'dunning',
          medium: 'email',
          campaign: '{{trigger_id}}'
        },
        sender: {
          fromNameTemplate: '{{supplier_name}} Billing',
          fromEmailTemplate: 'billing@{{supplier_domain}}',
          replyToTemplate: 'accounts@{{supplier_domain}}'
        }
      }
    };
  }

  public static getInstance(): DunningEmailService {
    if (!DunningEmailService.instance) {
      DunningEmailService.instance = new DunningEmailService();
    }
    return DunningEmailService.instance;
  }

  /**
   * Initialize dunning sequence for an overdue invoice
   */
  public async initializeDunningSequence(
    invoiceId: string,
    variables: DunningVariables
  ): Promise<DunningStage[]> {
    console.log(`🔔 Initializing dunning sequence for invoice ${invoiceId}`);

    const stages: DunningStage[] = [];
    const baseDate = new Date();

    // D0 - Immediate
    stages.push({
      stage: 'D0',
      scheduledAt: baseDate, // Send immediately
      status: 'pending',
      templateId: this.getTemplateId('D0', variables.is_el),
      variables: this.enrichVariables(variables, 'D0')
    });

    // D3 - 3 days later, within send window
    stages.push({
      stage: 'D3',
      scheduledAt: this.calculateSendTime(addHours(baseDate, 72), 'D3_D7'),
      status: 'pending',
      templateId: this.getTemplateId('D3', variables.is_el),
      variables: this.enrichVariables(variables, 'D3')
    });

    // D7 - 7 days later, within send window
    stages.push({
      stage: 'D7',
      scheduledAt: this.calculateSendTime(addHours(baseDate, 168), 'D3_D7'),
      status: 'pending',
      templateId: this.getTemplateId('D7', variables.is_el),
      variables: this.enrichVariables(variables, 'D7')
    });

    // D14 - 14 days later, within send window
    stages.push({
      stage: 'D14',
      scheduledAt: this.calculateSendTime(addHours(baseDate, 336), 'D14'),
      status: 'pending',
      templateId: this.getTemplateId('D14', variables.is_el),
      variables: this.enrichVariables(variables, 'D14')
    });

    this.scheduledEmails.set(invoiceId, stages);
    
    // Start processing if not already running
    this.startScheduleProcessor();

    console.log(`📅 Scheduled ${stages.length} dunning stages for invoice ${invoiceId}`);
    return stages;
  }

  /**
   * Calculate send time within allowed windows
   */
  private calculateSendTime(
    targetDate: Date,
    windowType: 'D3_D7' | 'D14'
  ): Date {
    const athensTime = toZonedTime(targetDate, this.config.globalSettings.timezone);
    const window = this.config.globalSettings.sendWindows[windowType];
    
    let candidateDate = new Date(athensTime);
    let attempts = 0;
    const maxAttempts = 14; // Look ahead up to 2 weeks

    while (attempts < maxAttempts) {
      const dayOfWeek = candidateDate.getDay();
      
      // Check if day is allowed
      if (window.days.includes(dayOfWeek)) {
        // Set to start of send window
        const [startHour, endHour] = window.hours;
        const startMinutes = Math.floor(startHour % 1 * 60);
        const endMinutes = Math.floor(endHour % 1 * 60);
        
        const windowStart = setMinutes(setHours(candidateDate, Math.floor(startHour)), startMinutes);
        const windowEnd = setMinutes(setHours(candidateDate, Math.floor(endHour)), endMinutes);
        
        // If current time is before window, schedule for window start
        if (candidateDate < windowStart) {
          return zonedTimeToUtc(windowStart, this.config.globalSettings.timezone);
        }
        
        // If current time is within window, schedule immediately
        if (isWithinInterval(candidateDate, { start: windowStart, end: windowEnd })) {
          return zonedTimeToUtc(candidateDate, this.config.globalSettings.timezone);
        }
      }
      
      // Move to next day and try again
      candidateDate.setDate(candidateDate.getDate() + 1);
      candidateDate.setHours(Math.floor(window.hours[0]), Math.floor(window.hours[0] % 1 * 60), 0, 0);
      attempts++;
    }

    // Fallback: just use the target date
    return targetDate;
  }

  /**
   * Get template ID based on stage and language
   */
  private getTemplateId(stage: string, isGreek: boolean): string {
    const langCode = isGreek ? 'el' : 'en';
    return `dunning_${stage.toLowerCase()}_${langCode}`;
  }

  /**
   * Enrich variables with UTM parameters and computed values
   */
  private enrichVariables(variables: DunningVariables, stage: string): DunningVariables {
    const utmParams = `?utm_source=${this.config.globalSettings.utm.source}&utm_medium=${this.config.globalSettings.utm.medium}&utm_campaign=${variables.trigger_id}`;
    
    return {
      ...variables,
      pay_link: `${variables.pay_link}${utmParams}`,
      stage_name: stage,
      formatted_amount: this.formatCurrency(variables.amount_due, variables.currency, variables.is_el),
      formatted_due_date: this.formatDate(variables.due_date, variables.is_el),
      formatted_issue_date: this.formatDate(variables.invoice_issue_date, variables.is_el),
      formatted_retry_date: this.formatDate(variables.next_retry_date, variables.is_el),
      formatted_suspend_date: this.formatDate(variables.grace_suspend_date, variables.is_el)
    };
  }

  /**
   * Format currency based on locale
   */
  private formatCurrency(amount: number, currency: string, isGreek: boolean): string {
    const locale = isGreek ? 'el-GR' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Format date based on locale
   */
  private formatDate(dateString: string, isGreek: boolean): string {
    const date = new Date(dateString);
    const locale = isGreek ? 'el-GR' : 'en-US';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Process scheduled emails
   */
  private startScheduleProcessor(): void {
    if (this.scheduleTimer) return;

    this.scheduleTimer = setInterval(async () => {
      await this.processScheduledEmails();
    }, 60000); // Check every minute

    console.log('📧 Dunning email scheduler started');
  }

  /**
   * Process all scheduled emails that are due
   */
  private async processScheduledEmails(): Promise<void> {
    const now = new Date();
    const processed: string[] = [];

    for (const [invoiceId, stages] of this.scheduledEmails.entries()) {
      for (const stage of stages) {
        if (stage.status === 'pending' && stage.scheduledAt <= now) {
          try {
            await this.sendDunningEmail(invoiceId, stage);
            stage.status = 'sent';
            stage.sentAt = now;
            processed.push(`${invoiceId}-${stage.stage}`);
          } catch (error) {
            console.error(`Failed to send dunning email ${invoiceId}-${stage.stage}:`, error);
            stage.status = 'failed';
          }
        }
      }
    }

    if (processed.length > 0) {
      console.log(`📤 Processed ${processed.length} dunning emails: ${processed.join(', ')}`);
    }
  }

  /**
   * Send individual dunning email
   */
  private async sendDunningEmail(invoiceId: string, stage: DunningStage): Promise<void> {
    const variables = stage.variables;
    
    // Render sender information
    const fromName = this.renderTemplate(this.config.globalSettings.sender.fromNameTemplate, variables);
    const fromEmail = this.renderTemplate(this.config.globalSettings.sender.fromEmailTemplate, variables);
    const replyTo = this.renderTemplate(this.config.globalSettings.sender.replyToTemplate, variables);

    // Get email template
    const template = this.getDunningEmailTemplate(stage.templateId, variables);

    const emailData = {
      to: `${variables.customer_name} <customer@example.com>`, // This would come from customer data
      from: `${fromName} <${fromEmail}>`,
      replyTo: replyTo,
      subject: template.subject,
      html: template.html,
      text: template.text,
      metadata: {
        invoice_id: invoiceId,
        stage: stage.stage,
        template_id: stage.templateId,
        sent_at: new Date().toISOString()
      }
    };

    // This would integrate with your email service (SendGrid, etc.)
    console.log(`📧 Sending ${stage.stage} dunning email for invoice ${invoiceId}`);
    console.log(`   To: ${emailData.to}`);
    console.log(`   Subject: ${emailData.subject}`);
    
    // Emit event for tracking
    this.emit('email_sent', {
      invoiceId,
      stage: stage.stage,
      templateId: stage.templateId,
      sentAt: new Date()
    });
  }

  /**
   * Simple template rendering (Handlebars-style)
   */
  private renderTemplate(template: string, variables: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Get dunning email templates
   */
  private getDunningEmailTemplate(templateId: string, variables: DunningVariables): {
    subject: string;
    html: string;
    text: string;
  } {
    const templates = this.getDunningEmailTemplates();
    const template = templates[templateId];
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    return {
      subject: this.renderTemplate(template.subject, variables),
      html: this.renderTemplate(template.html, variables),
      text: this.renderTemplate(template.text, variables)
    };
  }

  /**
   * Email templates for all stages and languages
   */
  private getDunningEmailTemplates(): Record<string, { subject: string; html: string; text: string }> {
    return {
      // D0 Templates - Immediate notification
      'dunning_d0_en': {
        subject: 'Payment Due: Invoice {{invoice_number}} - {{formatted_amount}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Payment Due Notice</h2>
            
            <p>Dear {{customer_name}},</p>
            
            <p>This is a friendly reminder that your payment for invoice <strong>{{invoice_number}}</strong> is now due.</p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Invoice Details</h3>
              <table style="width: 100%;">
                <tr><td><strong>Invoice Number:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Issue Date:</strong></td><td>{{formatted_issue_date}}</td></tr>
                <tr><td><strong>Amount Due:</strong></td><td><strong style="color: #c53030;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Due Date:</strong></td><td>{{formatted_due_date}}</td></tr>
                <tr><td><strong>Days Past Due:</strong></td><td>{{days_past_due}}</td></tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{pay_link}}" style="background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a>
            </div>
            
            <p>You can also <a href="{{invoice_pdf_url}}">download your invoice</a> for your records.</p>
            
            <p>If you have any questions, please contact us at <a href="mailto:{{support_email}}">{{support_email}}</a> or {{support_phone}}.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `Payment Due Notice

Dear {{customer_name}},

This is a friendly reminder that your payment for invoice {{invoice_number}} is now due.

Invoice Details:
- Invoice Number: {{invoice_series}}-{{invoice_number}}
- Issue Date: {{formatted_issue_date}}
- Amount Due: {{formatted_amount}}
- Due Date: {{formatted_due_date}}
- Days Past Due: {{days_past_due}}

Pay now: {{pay_link}}

Download invoice: {{invoice_pdf_url}}

If you have questions, contact us at {{support_email}} or {{support_phone}}.

{{legal_footer}}`
      },

      'dunning_d0_el': {
        subject: 'Οφειλόμενη Πληρωμή: Τιμολόγιο {{invoice_number}} - {{formatted_amount}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Ειδοποίηση Οφειλόμενης Πληρωμής</h2>
            
            <p>Αγαπητέ/ή {{customer_name}},</p>
            
            <p>Αυτή είναι μια φιλική υπενθύμιση ότι η πληρωμή σας για το τιμολόγιο <strong>{{invoice_number}}</strong> έχει καταστεί οφειλόμενη.</p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Στοιχεία Τιμολογίου</h3>
              <table style="width: 100%;">
                <tr><td><strong>Αριθμός Τιμολογίου:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Ημερομηνία Έκδοσης:</strong></td><td>{{formatted_issue_date}}</td></tr>
                <tr><td><strong>Οφειλόμενο Ποσό:</strong></td><td><strong style="color: #c53030;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Ημερομηνία Λήξης:</strong></td><td>{{formatted_due_date}}</td></tr>
                <tr><td><strong>Ημέρες Καθυστέρησης:</strong></td><td>{{days_past_due}}</td></tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{pay_link}}" style="background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Πληρώστε Τώρα</a>
            </div>
            
            <p>Μπορείτε επίσης να <a href="{{invoice_pdf_url}}">κατεβάσετε το τιμολόγιό σας</a> για τα αρχεία σας.</p>
            
            <p>Για οποιεσδήποτε ερωτήσεις, επικοινωνήστε μαζί μας στο <a href="mailto:{{support_email}}">{{support_email}}</a> ή {{support_phone}}.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `Ειδοποίηση Οφειλόμενης Πληρωμής

Αγαπητέ/ή {{customer_name}},

Αυτή είναι μια φιλική υπενθύμιση ότι η πληρωμή σας για το τιμολόγιο {{invoice_number}} έχει καταστεί οφειλόμενη.

Στοιχεία Τιμολογίου:
- Αριθμός Τιμολογίου: {{invoice_series}}-{{invoice_number}}
- Ημερομηνία Έκδοσης: {{formatted_issue_date}}
- Οφειλόμενο Ποσό: {{formatted_amount}}
- Ημερομηνία Λήξης: {{formatted_due_date}}
- Ημέρες Καθυστέρησης: {{days_past_due}}

Πληρώστε τώρα: {{pay_link}}

Κατεβάστε τιμολόγιο: {{invoice_pdf_url}}

Για ερωτήσεις, επικοινωνήστε στο {{support_email}} ή {{support_phone}}.

{{legal_footer}}`
      },

      // D3 Templates - First reminder
      'dunning_d3_en': {
        subject: 'Payment Reminder: Invoice {{invoice_number}} - {{days_past_due}} days overdue',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c53030;">Payment Reminder</h2>
            
            <p>Dear {{customer_name}},</p>
            
            <p>We notice that invoice <strong>{{invoice_number}}</strong> is now <strong>{{days_past_due}} days overdue</strong>. We wanted to follow up to ensure you received our previous notice.</p>
            
            <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c53030;">
              <h3 style="margin-top: 0;">Outstanding Payment</h3>
              <table style="width: 100%;">
                <tr><td><strong>Invoice:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Amount Due:</strong></td><td><strong style="color: #c53030; font-size: 1.2em;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Original Due Date:</strong></td><td>{{formatted_due_date}}</td></tr>
                <tr><td><strong>Days Overdue:</strong></td><td><strong style="color: #c53030;">{{days_past_due}}</strong></td></tr>
              </table>
            </div>
            
            <p><strong>Please pay immediately to avoid service disruption.</strong></p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{pay_link}}" style="background: #c53030; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Pay {{formatted_amount}} Now</a>
            </div>
            
            <div style="background: #e6fffa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Payment Methods:</strong></p>
              <p style="margin: 5px 0;">• Online payment: Use the link above</p>
              <p style="margin: 5px 0;">• Download invoice: <a href="{{invoice_pdf_url}}">{{invoice_pdf_url}}</a></p>
              {{#if sepa_mandate_ref}}<p style="margin: 5px 0;">• SEPA Direct Debit: Will retry on {{formatted_retry_date}}</p>{{/if}}
            </div>
            
            <p>If there are any issues with your account or payment, please contact us immediately at <a href="mailto:{{support_email}}">{{support_email}}</a> or {{support_phone}}.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `Payment Reminder

Dear {{customer_name}},

Invoice {{invoice_number}} is now {{days_past_due}} days overdue.

Outstanding Payment:
- Invoice: {{invoice_series}}-{{invoice_number}}
- Amount Due: {{formatted_amount}}
- Original Due Date: {{formatted_due_date}}
- Days Overdue: {{days_past_due}}

PLEASE PAY IMMEDIATELY TO AVOID SERVICE DISRUPTION.

Pay now: {{pay_link}}

Download invoice: {{invoice_pdf_url}}

Contact us immediately if there are issues: {{support_email}} or {{support_phone}}.

{{legal_footer}}`
      },

      'dunning_d3_el': {
        subject: 'Υπενθύμιση Πληρωμής: Τιμολόγιο {{invoice_number}} - {{days_past_due}} ημέρες καθυστέρηση',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c53030;">Υπενθύμιση Πληρωμής</h2>
            
            <p>Αγαπητέ/ή {{customer_name}},</p>
            
            <p>Παρατηρούμε ότι το τιμολόγιο <strong>{{invoice_number}}</strong> έχει τώρα <strong>{{days_past_due}} ημέρες καθυστέρηση</strong>. Θέλαμε να επικοινωνήσουμε για να διασφαλίσουμε ότι έχετε λάβει την προηγούμενη ειδοποίησή μας.</p>
            
            <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c53030;">
              <h3 style="margin-top: 0;">Εκκρεμής Πληρωμή</h3>
              <table style="width: 100%;">
                <tr><td><strong>Τιμολόγιο:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Οφειλόμενο Ποσό:</strong></td><td><strong style="color: #c53030; font-size: 1.2em;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Αρχική Ημ. Λήξης:</strong></td><td>{{formatted_due_date}}</td></tr>
                <tr><td><strong>Ημέρες Καθυστέρησης:</strong></td><td><strong style="color: #c53030;">{{days_past_due}}</strong></td></tr>
              </table>
            </div>
            
            <p><strong>Παρακαλούμε πληρώστε άμεσα για να αποφύγετε διακοπή υπηρεσιών.</strong></p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{pay_link}}" style="background: #c53030; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Πληρώστε {{formatted_amount}} Τώρα</a>
            </div>
            
            <div style="background: #e6fffa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Μέθοδοι Πληρωμής:</strong></p>
              <p style="margin: 5px 0;">• Online πληρωμή: Χρησιμοποιήστε τον παραπάνω σύνδεσμο</p>
              <p style="margin: 5px 0;">• Κατεβάστε τιμολόγιο: <a href="{{invoice_pdf_url}}">{{invoice_pdf_url}}</a></p>
              {{#if sepa_mandate_ref}}<p style="margin: 5px 0;">• SEPA Άμεση Χρέωση: Θα επαναληφθεί στις {{formatted_retry_date}}</p>{{/if}}
            </div>
            
            <p>Εάν υπάρχουν προβλήματα με τον λογαριασμό ή την πληρωμή σας, επικοινωνήστε μαζί μας άμεσα στο <a href="mailto:{{support_email}}">{{support_email}}</a> ή {{support_phone}}.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `Υπενθύμιση Πληρωμής

Αγαπητέ/ή {{customer_name}},

Το τιμολόγιο {{invoice_number}} έχει τώρα {{days_past_due}} ημέρες καθυστέρηση.

Εκκρεμής Πληρωμή:
- Τιμολόγιο: {{invoice_series}}-{{invoice_number}}
- Οφειλόμενο Ποσό: {{formatted_amount}}
- Αρχική Ημ. Λήξης: {{formatted_due_date}}
- Ημέρες Καθυστέρησης: {{days_past_due}}

ΠΑΡΑΚΑΛΟΥΜΕ ΠΛΗΡΩΣΤΕ ΑΜΕΣΑ ΓΙΑ ΝΑ ΑΠΟΦΥΓΕΤΕ ΔΙΑΚΟΠΗ ΥΠΗΡΕΣΙΩΝ.

Πληρώστε τώρα: {{pay_link}}

Κατεβάστε τιμολόγιο: {{invoice_pdf_url}}

Επικοινωνήστε άμεσα για προβλήματα: {{support_email}} ή {{support_phone}}.

{{legal_footer}}`
      },

      // D7 Templates - Second reminder
      'dunning_d7_en': {
        subject: 'URGENT: Payment Required - Invoice {{invoice_number}} ({{days_past_due}} days overdue)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #c53030; color: white; padding: 15px; text-align: center; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 1.5em;">URGENT PAYMENT REQUIRED</h2>
            </div>
            
            <p>Dear {{customer_name}},</p>
            
            <p><strong style="color: #c53030;">Your account is seriously past due.</strong> Invoice {{invoice_number}} has been outstanding for <strong>{{days_past_due}} days</strong> and requires immediate attention.</p>
            
            <div style="background: #c53030; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: white;">OVERDUE INVOICE</h3>
              <table style="width: 100%; color: white;">
                <tr><td><strong>Invoice:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Amount Due:</strong></td><td><strong style="font-size: 1.3em;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Days Overdue:</strong></td><td><strong style="font-size: 1.2em;">{{days_past_due}}</strong></td></tr>
                <tr><td><strong>Grace Period Ends:</strong></td><td><strong>{{formatted_suspend_date}}</strong></td></tr>
              </table>
            </div>
            
            <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #c53030;">
              <h3 style="color: #c53030; margin-top: 0;">⚠️ ACTION REQUIRED</h3>
              <p style="margin: 0; font-size: 1.1em;"><strong>Pay by {{formatted_suspend_date}} to avoid service suspension.</strong></p>
              <p style="margin: 10px 0 0 0;">After this date, access to your {{tenant_name}} account may be restricted until payment is received.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{pay_link}}" style="background: #c53030; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 1.1em;">EMERGENCY PAYMENT - {{formatted_amount}}</a>
            </div>
            
            <div style="background: #fffaf0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ed8936;">
              <h4 style="margin-top: 0; color: #c05621;">Payment Options</h4>
              <p style="margin: 5px 0;">• <strong>Immediate:</strong> <a href="{{pay_link}}">Pay online now</a></p>
              <p style="margin: 5px 0;">• <strong>Invoice PDF:</strong> <a href="{{invoice_pdf_url}}">Download for bank transfer</a></p>
              <p style="margin: 5px 0;">• <strong>Support:</strong> Call {{support_phone}} for assistance</p>
            </div>
            
            <p><strong>If payment has already been made, please ignore this notice or contact us immediately at <a href="mailto:{{support_email}}">{{support_email}}</a>.</strong></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `URGENT PAYMENT REQUIRED

Dear {{customer_name}},

YOUR ACCOUNT IS SERIOUSLY PAST DUE. Invoice {{invoice_number}} has been outstanding for {{days_past_due}} days.

OVERDUE INVOICE:
- Invoice: {{invoice_series}}-{{invoice_number}}
- Amount Due: {{formatted_amount}}
- Days Overdue: {{days_past_due}}
- Grace Period Ends: {{formatted_suspend_date}}

⚠️ ACTION REQUIRED: Pay by {{formatted_suspend_date}} to avoid service suspension.

EMERGENCY PAYMENT: {{pay_link}}

Payment Options:
• Immediate: Pay online now
• Invoice PDF: {{invoice_pdf_url}}
• Support: Call {{support_phone}}

If payment made, contact {{support_email}} immediately.

{{legal_footer}}`
      },

      'dunning_d7_el': {
        subject: 'ΕΠΕΙΓΟΝ: Απαιτείται Πληρωμή - Τιμολόγιο {{invoice_number}} ({{days_past_due}} ημέρες καθυστέρηση)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #c53030; color: white; padding: 15px; text-align: center; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 1.5em;">ΕΠΕΙΓΟΝ - ΑΠΑΙΤΕΙΤΑΙ ΠΛΗΡΩΜΗ</h2>
            </div>
            
            <p>Αγαπητέ/ή {{customer_name}},</p>
            
            <p><strong style="color: #c53030;">Ο λογαριασμός σας έχει σοβαρή καθυστέρηση.</strong> Το τιμολόγιο {{invoice_number}} είναι ανεξόφλητο για <strong>{{days_past_due}} ημέρες</strong> και χρειάζεται άμεση προσοχή.</p>
            
            <div style="background: #c53030; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: white;">ΛΗΞΙΠΡΟΘΕΣΜΟ ΤΙΜΟΛΟΓΙΟ</h3>
              <table style="width: 100%; color: white;">
                <tr><td><strong>Τιμολόγιο:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Οφειλόμενο Ποσό:</strong></td><td><strong style="font-size: 1.3em;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Ημέρες Καθυστέρησης:</strong></td><td><strong style="font-size: 1.2em;">{{days_past_due}}</strong></td></tr>
                <tr><td><strong>Λήξη Περ. Χάριτος:</strong></td><td><strong>{{formatted_suspend_date}}</strong></td></tr>
              </table>
            </div>
            
            <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #c53030;">
              <h3 style="color: #c53030; margin-top: 0;">⚠️ ΑΠΑΙΤΕΙΤΑΙ ΔΡΑΣΗ</h3>
              <p style="margin: 0; font-size: 1.1em;"><strong>Πληρώστε μέχρι {{formatted_suspend_date}} για να αποφύγετε αναστολή υπηρεσιών.</strong></p>
              <p style="margin: 10px 0 0 0;">Μετά από αυτήν την ημερομηνία, η πρόσβαση στον λογαριασμό σας {{tenant_name}} μπορεί να περιοριστεί μέχρι την εξόφληση.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{pay_link}}" style="background: #c53030; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 1.1em;">ΕΠΕΙΓΟΥΣΑ ΠΛΗΡΩΜΗ - {{formatted_amount}}</a>
            </div>
            
            <div style="background: #fffaf0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ed8936;">
              <h4 style="margin-top: 0; color: #c05621;">Επιλογές Πληρωμής</h4>
              <p style="margin: 5px 0;">• <strong>Άμεση:</strong> <a href="{{pay_link}}">Πληρώστε online τώρα</a></p>
              <p style="margin: 5px 0;">• <strong>PDF Τιμολογίου:</strong> <a href="{{invoice_pdf_url}}">Κατεβάστε για τραπεζικό έμβασμα</a></p>
              <p style="margin: 5px 0;">• <strong>Υποστήριξη:</strong> Καλέστε {{support_phone}} για βοήθεια</p>
            </div>
            
            <p><strong>Εάν η πληρωμή έχει ήδη γίνει, παρακαλούμε αγνοήστε αυτήν την ειδοποίηση ή επικοινωνήστε μαζί μας άμεσα στο <a href="mailto:{{support_email}}">{{support_email}}</a>.</strong></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `ΕΠΕΙΓΟΝ - ΑΠΑΙΤΕΙΤΑΙ ΠΛΗΡΩΜΗ

Αγαπητέ/ή {{customer_name}},

Ο ΛΟΓΑΡΙΑΣΜΟΣ ΣΑΣ ΕΧΕΙ ΣΟΒΑΡΗ ΚΑΘΥΣΤΕΡΗΣΗ. Το τιμολόγιο {{invoice_number}} είναι ανεξόφλητο για {{days_past_due}} ημέρες.

ΛΗΞΙΠΡΟΘΕΣΜΟ ΤΙΜΟΛΟΓΙΟ:
- Τιμολόγιο: {{invoice_series}}-{{invoice_number}}
- Οφειλόμενο Ποσό: {{formatted_amount}}
- Ημέρες Καθυστέρησης: {{days_past_due}}
- Λήξη Περ. Χάριτος: {{formatted_suspend_date}}

⚠️ ΑΠΑΙΤΕΙΤΑΙ ΔΡΑΣΗ: Πληρώστε μέχρι {{formatted_suspend_date}} για να αποφύγετε αναστολή υπηρεσιών.

ΕΠΕΙΓΟΥΣΑ ΠΛΗΡΩΜΗ: {{pay_link}}

Επιλογές Πληρωμής:
• Άμεση: Πληρώστε online τώρα
• PDF Τιμολογίου: {{invoice_pdf_url}}
• Υποστήριξη: Καλέστε {{support_phone}}

Εάν έχετε πληρώσει, επικοινωνήστε {{support_email}} άμεσα.

{{legal_footer}}`
      },

      // D14 Templates - Final notice
      'dunning_d14_en': {
        subject: 'FINAL NOTICE: Account Suspension Imminent - Invoice {{invoice_number}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #742a2a; color: white; padding: 20px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 1.8em;">⚠️ FINAL NOTICE ⚠️</h1>
              <p style="margin: 10px 0 0 0; font-size: 1.2em;">ACCOUNT SUSPENSION IMMINENT</p>
            </div>
            
            <p>Dear {{customer_name}},</p>
            
            <p><strong style="color: #742a2a; font-size: 1.2em;">This is your final notice.</strong> Your account is {{days_past_due}} days past due and faces immediate suspension.</p>
            
            <div style="background: #742a2a; color: white; padding: 25px; border-radius: 8px; margin: 25px 0;">
              <h2 style="margin-top: 0; color: white; text-align: center;">CRITICAL ACCOUNT STATUS</h2>
              <table style="width: 100%; color: white; font-size: 1.1em;">
                <tr><td><strong>Invoice:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Amount Due:</strong></td><td><strong style="font-size: 1.4em;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Days Overdue:</strong></td><td><strong style="font-size: 1.3em; color: #fed7d7;">{{days_past_due}} DAYS</strong></td></tr>
                <tr><td><strong>Suspension Date:</strong></td><td><strong style="font-size: 1.2em; color: #fed7d7;">{{formatted_suspend_date}}</strong></td></tr>
              </table>
            </div>
            
            <div style="background: #742a2a; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <h3 style="margin: 0 0 10px 0; color: white; font-size: 1.4em;">🚨 IMMEDIATE ACTION REQUIRED 🚨</h3>
              <p style="margin: 0; font-size: 1.2em; font-weight: bold;">Payment must be received by {{formatted_suspend_date}}</p>
              <p style="margin: 10px 0 0 0; font-size: 1.1em;">or your {{tenant_name}} account will be suspended</p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="{{pay_link}}" style="background: #742a2a; color: white; padding: 20px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 1.2em; border: 3px solid #fed7d7;">🚨 EMERGENCY PAYMENT - {{formatted_amount}} 🚨</a>
            </div>
            
            <div style="background: #fffaf0; padding: 20px; border-radius: 8px; margin: 25px 0; border: 2px solid #ed8936;">
              <h3 style="margin-top: 0; color: #c05621;">Account Suspension Consequences</h3>
              <ul style="margin: 0; padding-left: 20px; color: #c05621;">
                <li><strong>Immediate:</strong> Access to {{tenant_name}} services suspended</li>
                <li><strong>Data:</strong> Account data preserved but inaccessible</li>
                <li><strong>Restoration:</strong> Full payment + reactivation fee required</li>
                <li><strong>Collection:</strong> Account may be forwarded to collection agency</li>
              </ul>
            </div>
            
            <div style="background: #e6fffa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #319795;">
              <h3 style="margin-top: 0; color: #2c7a7b;">Last Chance Payment Options</h3>
              <p style="margin: 5px 0;"><strong>🔥 Emergency Hotline:</strong> {{support_phone}} (immediate assistance)</p>
              <p style="margin: 5px 0;"><strong>💳 Instant Payment:</strong> <a href="{{pay_link}}">{{pay_link}}</a></p>
              <p style="margin: 5px 0;"><strong>📄 Invoice Download:</strong> <a href="{{invoice_pdf_url}}">{{invoice_pdf_url}}</a></p>
              <p style="margin: 5px 0;"><strong>📧 Critical Support:</strong> <a href="mailto:{{support_email}}">{{support_email}}</a></p>
            </div>
            
            <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 2px solid #c53030; text-align: center;">
              <p style="margin: 0; font-size: 1.1em; color: #742a2a;"><strong>If you believe this notice is in error or have already made payment, contact us IMMEDIATELY at {{support_phone}} or {{support_email}}.</strong></p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 2px solid #742a2a;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `⚠️ FINAL NOTICE - ACCOUNT SUSPENSION IMMINENT ⚠️

Dear {{customer_name}},

THIS IS YOUR FINAL NOTICE. Your account is {{days_past_due}} days past due and faces immediate suspension.

CRITICAL ACCOUNT STATUS:
- Invoice: {{invoice_series}}-{{invoice_number}}
- Amount Due: {{formatted_amount}}
- Days Overdue: {{days_past_due}} DAYS
- Suspension Date: {{formatted_suspend_date}}

🚨 IMMEDIATE ACTION REQUIRED 🚨
Payment must be received by {{formatted_suspend_date}} or your {{tenant_name}} account will be suspended.

EMERGENCY PAYMENT: {{pay_link}}

Account Suspension Consequences:
• Immediate access to {{tenant_name}} suspended
• Account data preserved but inaccessible
• Full payment + reactivation fee required
• Account may go to collection agency

Last Chance Payment Options:
🔥 Emergency Hotline: {{support_phone}}
💳 Instant Payment: {{pay_link}}
📄 Invoice: {{invoice_pdf_url}}
📧 Critical Support: {{support_email}}

If this is in error or payment made, contact IMMEDIATELY: {{support_phone}} or {{support_email}}

{{legal_footer}}`
      },

      'dunning_d14_el': {
        subject: 'ΤΕΛΕΥΤΑΙΑ ΕΙΔΟΠΟΙΗΣΗ: Επικείμενη Αναστολή Λογαριασμού - Τιμολόγιο {{invoice_number}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #742a2a; color: white; padding: 20px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 1.8em;">⚠️ ΤΕΛΕΥΤΑΙΑ ΕΙΔΟΠΟΙΗΣΗ ⚠️</h1>
              <p style="margin: 10px 0 0 0; font-size: 1.2em;">ΕΠΙΚΕΙΜΕΝΗ ΑΝΑΣΤΟΛΗ ΛΟΓΑΡΙΑΣΜΟΥ</p>
            </div>
            
            <p>Αγαπητέ/ή {{customer_name}},</p>
            
            <p><strong style="color: #742a2a; font-size: 1.2em;">Αυτή είναι η τελευταία σας ειδοποίηση.</strong> Ο λογαριασμός σας έχει {{days_past_due}} ημέρες καθυστέρηση και αντιμετωπίζει άμεση αναστολή.</p>
            
            <div style="background: #742a2a; color: white; padding: 25px; border-radius: 8px; margin: 25px 0;">
              <h2 style="margin-top: 0; color: white; text-align: center;">ΚΡΙΣΙΜΗ ΚΑΤΑΣΤΑΣΗ ΛΟΓΑΡΙΑΣΜΟΥ</h2>
              <table style="width: 100%; color: white; font-size: 1.1em;">
                <tr><td><strong>Τιμολόγιο:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Οφειλόμενο Ποσό:</strong></td><td><strong style="font-size: 1.4em;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Ημέρες Καθυστέρησης:</strong></td><td><strong style="font-size: 1.3em; color: #fed7d7;">{{days_past_due}} ΗΜΕΡΕΣ</strong></td></tr>
                <tr><td><strong>Ημ. Αναστολής:</strong></td><td><strong style="font-size: 1.2em; color: #fed7d7;">{{formatted_suspend_date}}</strong></td></tr>
              </table>
            </div>
            
            <div style="background: #742a2a; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <h3 style="margin: 0 0 10px 0; color: white; font-size: 1.4em;">🚨 ΑΠΑΙΤΕΙΤΑΙ ΑΜΕΣΗ ΔΡΑΣΗ 🚨</h3>
              <p style="margin: 0; font-size: 1.2em; font-weight: bold;">Η πληρωμή πρέπει να εισπραχθεί μέχρι {{formatted_suspend_date}}</p>
              <p style="margin: 10px 0 0 0; font-size: 1.1em;">διαφορετικά ο λογαριασμός σας {{tenant_name}} θα ανασταλεί</p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="{{pay_link}}" style="background: #742a2a; color: white; padding: 20px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 1.2em; border: 3px solid #fed7d7;">🚨 ΕΠΕΙΓΟΥΣΑ ΠΛΗΡΩΜΗ - {{formatted_amount}} 🚨</a>
            </div>
            
            <div style="background: #fffaf0; padding: 20px; border-radius: 8px; margin: 25px 0; border: 2px solid #ed8936;">
              <h3 style="margin-top: 0; color: #c05621;">Συνέπειες Αναστολής Λογαριασμού</h3>
              <ul style="margin: 0; padding-left: 20px; color: #c05621;">
                <li><strong>Άμεσα:</strong> Αναστολή πρόσβασης στις υπηρεσίες {{tenant_name}}</li>
                <li><strong>Δεδομένα:</strong> Τα δεδομένα διατηρούνται αλλά δεν είναι προσβάσιμα</li>
                <li><strong>Αποκατάσταση:</strong> Απαιτείται πλήρης πληρωμή + χρέωση επανενεργοποίησης</li>
                <li><strong>Είσπραξη:</strong> Ο λογαριασμός μπορεί να προωθηθεί σε εταιρεία εισπράξεων</li>
              </ul>
            </div>
            
            <div style="background: #e6fffa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #319795;">
              <h3 style="margin-top: 0; color: #2c7a7b;">Τελευταίες Επιλογές Πληρωμής</h3>
              <p style="margin: 5px 0;"><strong>🔥 Γραμμή Έκτακτης Ανάγκης:</strong> {{support_phone}} (άμεση βοήθεια)</p>
              <p style="margin: 5px 0;"><strong>💳 Άμεση Πληρωμή:</strong> <a href="{{pay_link}}">{{pay_link}}</a></p>
              <p style="margin: 5px 0;"><strong>📄 Λήψη Τιμολογίου:</strong> <a href="{{invoice_pdf_url}}">{{invoice_pdf_url}}</a></p>
              <p style="margin: 5px 0;"><strong>📧 Κρίσιμη Υποστήριξη:</strong> <a href="mailto:{{support_email}}">{{support_email}}</a></p>
            </div>
            
            <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 2px solid #c53030; text-align: center;">
              <p style="margin: 0; font-size: 1.1em; color: #742a2a;"><strong>Εάν πιστεύετε ότι αυτή η ειδοποίηση είναι λάθος ή έχετε ήδη πληρώσει, επικοινωνήστε ΑΜΕΣΑ στο {{support_phone}} ή {{support_email}}.</strong></p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 2px solid #742a2a;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `⚠️ ΤΕΛΕΥΤΑΙΑ ΕΙΔΟΠΟΙΗΣΗ - ΕΠΙΚΕΙΜΕΝΗ ΑΝΑΣΤΟΛΗ ΛΟΓΑΡΙΑΣΜΟΥ ⚠️

Αγαπητέ/ή {{customer_name}},

ΑΥΤΗ ΕΙΝΑΙ Η ΤΕΛΕΥΤΑΙΑ ΣΑΣ ΕΙΔΟΠΟΙΗΣΗ. Ο λογαριασμός σας έχει {{days_past_due}} ημέρες καθυστέρηση και αντιμετωπίζει άμεση αναστολή.

ΚΡΙΣΙΜΗ ΚΑΤΑΣΤΑΣΗ ΛΟΓΑΡΙΑΣΜΟΥ:
- Τιμολόγιο: {{invoice_series}}-{{invoice_number}}
- Οφειλόμενο Ποσό: {{formatted_amount}}
- Ημέρες Καθυστέρησης: {{days_past_due}} ΗΜΕΡΕΣ
- Ημ. Αναστολής: {{formatted_suspend_date}}

🚨 ΑΠΑΙΤΕΙΤΑΙ ΑΜΕΣΗ ΔΡΑΣΗ 🚨
Η πληρωμή πρέπει να εισπραχθεί μέχρι {{formatted_suspend_date}} διαφορετικά ο λογαριασμός σας {{tenant_name}} θα ανασταλεί.

ΕΠΕΙΓΟΥΣΑ ΠΛΗΡΩΜΗ: {{pay_link}}

Συνέπειες Αναστολής:
• Άμεση αναστολή πρόσβασης {{tenant_name}}
• Δεδομένα διατηρούνται αλλά μη προσβάσιμα
• Πλήρης πληρωμή + χρέωση επανενεργοποίησης
• Προώθηση σε εταιρεία εισπράξεων

Τελευταίες Επιλογές:
🔥 Έκτακτη Γραμμή: {{support_phone}}
💳 Άμεση Πληρωμή: {{pay_link}}
📄 Τιμολόγιο: {{invoice_pdf_url}}
📧 Κρίσιμη Υποστήριξη: {{support_email}}

Εάν λάθος ή έχετε πληρώσει, επικοινωνήστε ΑΜΕΣΑ: {{support_phone}} ή {{support_email}}

{{legal_footer}}`
      },

      // Success Templates - Payment received
      'dunning_success_en': {
        subject: 'Payment Received - Thank You! Invoice {{invoice_number}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #22543d; color: white; padding: 15px; text-align: center; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 1.5em;">✅ PAYMENT RECEIVED</h2>
            </div>
            
            <p>Dear {{customer_name}},</p>
            
            <p><strong style="color: #22543d;">Thank you for your payment!</strong> We have successfully received your payment for invoice {{invoice_number}}.</p>
            
            <div style="background: #c6f6d5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22543d;">
              <h3 style="margin-top: 0; color: #22543d;">Payment Confirmation</h3>
              <table style="width: 100%;">
                <tr><td><strong>Invoice:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Amount Paid:</strong></td><td><strong style="color: #22543d;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Payment Date:</strong></td><td>{{formatted_issue_date}}</td></tr>
                <tr><td><strong>Payment Method:</strong></td><td>{{payment_method}}</td></tr>
              </table>
            </div>
            
            <p>Your {{tenant_name}} account is now in good standing and all services remain active.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{invoice_pdf_url}}" style="background: #22543d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Receipt</a>
            </div>
            
            <p>If you have any questions about this payment or your account, please don't hesitate to contact us at <a href="mailto:{{support_email}}">{{support_email}}</a> or {{support_phone}}.</p>
            
            <p>Thank you for your business!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `✅ PAYMENT RECEIVED - Thank You!

Dear {{customer_name}},

Thank you for your payment! We have successfully received your payment for invoice {{invoice_number}}.

Payment Confirmation:
- Invoice: {{invoice_series}}-{{invoice_number}}
- Amount Paid: {{formatted_amount}}
- Payment Date: {{formatted_issue_date}}
- Payment Method: {{payment_method}}

Your {{tenant_name}} account is now in good standing and all services remain active.

Download receipt: {{invoice_pdf_url}}

Questions? Contact {{support_email}} or {{support_phone}}.

Thank you for your business!

{{legal_footer}}`
      },

      'dunning_success_el': {
        subject: 'Πληρωμή Εισπράχθηκε - Ευχαριστούμε! Τιμολόγιο {{invoice_number}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #22543d; color: white; padding: 15px; text-align: center; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 1.5em;">✅ ΠΛΗΡΩΜΗ ΕΙΣΠΡΑΧΘΗΚΕ</h2>
            </div>
            
            <p>Αγαπητέ/ή {{customer_name}},</p>
            
            <p><strong style="color: #22543d;">Ευχαριστούμε για την πληρωμή σας!</strong> Έχουμε εισπράξει επιτυχώς την πληρωμή σας για το τιμολόγιο {{invoice_number}}.</p>
            
            <div style="background: #c6f6d5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22543d;">
              <h3 style="margin-top: 0; color: #22543d;">Επιβεβαίωση Πληρωμής</h3>
              <table style="width: 100%;">
                <tr><td><strong>Τιμολόγιο:</strong></td><td>{{invoice_series}}-{{invoice_number}}</td></tr>
                <tr><td><strong>Ποσό Πληρωμής:</strong></td><td><strong style="color: #22543d;">{{formatted_amount}}</strong></td></tr>
                <tr><td><strong>Ημ. Πληρωμής:</strong></td><td>{{formatted_issue_date}}</td></tr>
                <tr><td><strong>Μέθοδος Πληρωμής:</strong></td><td>{{payment_method}}</td></tr>
              </table>
            </div>
            
            <p>Ο λογαριασμός σας {{tenant_name}} είναι τώρα σε καλή κατάσταση και όλες οι υπηρεσίες παραμένουν ενεργές.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{invoice_pdf_url}}" style="background: #22543d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Κατεβάστε Απόδειξη</a>
            </div>
            
            <p>Εάν έχετε οποιεσδήποτε ερωτήσεις για αυτήν την πληρωμή ή τον λογαριασμό σας, μη διστάσετε να επικοινωνήσετε μαζί μας στο <a href="mailto:{{support_email}}">{{support_email}}</a> ή {{support_phone}}.</p>
            
            <p>Ευχαριστούμε για τη συνεργασία σας!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
            <small style="color: #718096;">{{legal_footer}}</small>
          </div>
        `,
        text: `✅ ΠΛΗΡΩΜΗ ΕΙΣΠΡΑΧΘΗΚΕ - Ευχαριστούμε!

Αγαπητέ/ή {{customer_name}},

Ευχαριστούμε για την πληρωμή σας! Έχουμε εισπράξει επιτυχώς την πληρωμή σας για το τιμολόγιο {{invoice_number}}.

Επιβεβαίωση Πληρωμής:
- Τιμολόγιο: {{invoice_series}}-{{invoice_number}}
- Ποσό Πληρωμής: {{formatted_amount}}
- Ημ. Πληρωμής: {{formatted_issue_date}}
- Μέθοδος Πληρωμής: {{payment_method}}

Ο λογαριασμός σας {{tenant_name}} είναι τώρα σε καλή κατάσταση και όλες οι υπηρεσίες παραμένουν ενεργές.

Κατεβάστε απόδειξη: {{invoice_pdf_url}}

Ερωτήσεις; Επικοινωνήστε {{support_email}} ή {{support_phone}}.

Ευχαριστούμε για τη συνεργασία σας!

{{legal_footer}}`
      }
    };
  }

  /**
   * Cancel dunning sequence (e.g., when payment is received)
   */
  public cancelDunningSequence(invoiceId: string): void {
    const stages = this.scheduledEmails.get(invoiceId);
    
    if (stages) {
      // Cancel all pending stages
      stages.forEach(stage => {
        if (stage.status === 'pending') {
          stage.status = 'cancelled';
        }
      });
      
      console.log(`❌ Cancelled dunning sequence for invoice ${invoiceId}`);
      
      // Send success email instead
      const firstStage = stages[0];
      if (firstStage) {
        const successVariables = {
          ...firstStage.variables,
          stage_name: 'SUCCESS'
        };
        
        this.sendSuccessEmail(invoiceId, successVariables);
      }
    }
  }

  /**
   * Send payment success notification
   */
  private async sendSuccessEmail(invoiceId: string, variables: DunningVariables): Promise<void> {
    const templateId = `dunning_success_${variables.is_el ? 'el' : 'en'}`;
    
    try {
      const template = this.getDunningEmailTemplate(templateId, variables);
      
      // This would integrate with your email service
      console.log(`🎉 Sending payment success email for invoice ${invoiceId}`);
      console.log(`   Subject: ${template.subject}`);
      
      this.emit('success_email_sent', {
        invoiceId,
        templateId,
        sentAt: new Date()
      });
      
    } catch (error) {
      console.error(`Failed to send success email for ${invoiceId}:`, error);
    }
  }

  /**
   * Get dunning statistics
   */
  public getDunningStatistics(): {
    totalSequences: number;
    activeSequences: number;
    pendingEmails: number;
    sentEmails: number;
    failedEmails: number;
  } {
    let totalSequences = 0;
    let activeSequences = 0;
    let pendingEmails = 0;
    let sentEmails = 0;
    let failedEmails = 0;

    for (const stages of this.scheduledEmails.values()) {
      totalSequences++;
      
      const hasActiveStages = stages.some(stage => stage.status === 'pending');
      if (hasActiveStages) activeSequences++;
      
      for (const stage of stages) {
        switch (stage.status) {
          case 'pending':
            pendingEmails++;
            break;
          case 'sent':
            sentEmails++;
            break;
          case 'failed':
            failedEmails++;
            break;
        }
      }
    }

    return {
      totalSequences,
      activeSequences,
      pendingEmails,
      sentEmails,
      failedEmails
    };
  }

  /**
   * Stop the scheduler
   */
  public stopScheduler(): void {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
      this.scheduleTimer = undefined;
      console.log('📧 Dunning email scheduler stopped');
    }
  }
}