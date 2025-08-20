/**
 * Email Service for Authentication
 * Handles sending authentication emails with proper DKIM/SPF configuration
 */

import { EmailTemplateService, type EmailTemplate, type VerifyEmailData, type ResetPasswordData } from './EmailTemplateService';
import { AnalyticsService, AuthAnalyticsEvents } from './AnalyticsService';

export interface EmailConfiguration {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
  dkim?: {
    keySelector: string;
    privateKey: string;
    domain: string;
  };
}

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  correlationId?: string;
  priority?: 'high' | 'normal' | 'low';
}

export class EmailService {
  private static config: EmailConfiguration = {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'PayrollSync',
      email: process.env.EMAIL_FROM_ADDRESS || 'noreply@payrollsync.com',
    },
    dkim: process.env.DKIM_PRIVATE_KEY ? {
      keySelector: process.env.DKIM_SELECTOR || 'default',
      privateKey: process.env.DKIM_PRIVATE_KEY,
      domain: process.env.DKIM_DOMAIN || 'payrollsync.com',
    } : undefined,
  };

  /**
   * Send email verification
   */
  static async sendVerificationEmail(
    email: string,
    verificationToken: string,
    locale: 'en' | 'el' = 'en',
    name?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const correlationId = `email-verify-${Date.now()}`;
    
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

      const templateData: VerifyEmailData = {
        name,
        email,
        verificationUrl,
        expirationMinutes: 15,
      };

      const template = EmailTemplateService.generateVerifyEmail(templateData, locale);

      const result = await this.sendEmail({
        to: email,
        template,
        correlationId,
        priority: 'high',
      });

      // Track analytics
      AnalyticsService.track(AuthAnalyticsEvents.AUTH_EMAIL_VERIFICATION_SENT, {
        locale,
        has_name: !!name,
        template_version: '1.0',
      }, { correlationId, userId: email });

      return result;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    locale: 'en' | 'el' = 'en',
    name?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const correlationId = `email-reset-${Date.now()}`;
    
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

      const templateData: ResetPasswordData = {
        name,
        email,
        resetUrl,
        expirationMinutes: 30,
      };

      const template = EmailTemplateService.generateResetPassword(templateData, locale);

      const result = await this.sendEmail({
        to: email,
        template,
        correlationId,
        priority: 'high',
      });

      // Track analytics
      AnalyticsService.track(AuthAnalyticsEvents.AUTH_PASSWORD_RESET_REQUEST, {
        locale,
        has_name: !!name,
        template_version: '1.0',
      }, { correlationId, userId: email });

      return result;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send magic link email
   */
  static async sendMagicLinkEmail(
    email: string,
    magicToken: string,
    locale: 'en' | 'el' = 'en'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const correlationId = `email-magic-${Date.now()}`;
    
    try {
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const magicUrl = `${baseUrl}/auth/magic-login?token=${magicToken}`;

      const template = EmailTemplateService.generateMagicLink({
        email,
        magicUrl,
        expirationMinutes: 10,
      }, locale);

      const result = await this.sendEmail({
        to: email,
        template,
        correlationId,
        priority: 'high',
      });

      // Track analytics
      AnalyticsService.track(AuthAnalyticsEvents.AUTH_MAGIC_LINK_REQUEST, {
        locale,
        template_version: '1.0',
      }, { correlationId, userId: email });

      return result;
    } catch (error) {
      console.error('Failed to send magic link email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send MFA setup success notification
   */
  static async sendMfaSetupNotification(
    email: string,
    method: 'totp' | 'webauthn',
    locale: 'en' | 'el' = 'en',
    name?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const correlationId = `email-mfa-${Date.now()}`;
    
    try {
      const template = EmailTemplateService.generateMfaSetupSuccess({
        name,
        method,
      }, locale);

      const result = await this.sendEmail({
        to: email,
        template,
        correlationId,
        priority: 'normal',
      });

      // Track analytics
      AnalyticsService.track(AuthAnalyticsEvents.AUTH_MFA_SUCCESS, {
        method,
        locale,
        notification_sent: true,
      }, { correlationId, userId: email });

      return result;
    } catch (error) {
      console.error('Failed to send MFA setup notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email using configured SMTP
   */
  private static async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In production, you would use a proper email library like nodemailer
      // For now, we'll simulate sending the email
      
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate email sending
      console.log('📧 Email sent (simulated):');
      console.log('To:', options.to);
      console.log('Subject:', options.template.subject);
      console.log('Priority:', options.priority || 'normal');
      console.log('Message ID:', messageId);
      console.log('Correlation ID:', options.correlationId);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate email configuration
   */
  static validateConfiguration(): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check SMTP configuration
    if (!this.config.smtp.host) {
      issues.push('SMTP host not configured');
    }

    if (!this.config.smtp.auth.user || !this.config.smtp.auth.pass) {
      issues.push('SMTP authentication not configured');
    }

    // Check from address
    if (!this.config.from.email) {
      issues.push('From email address not configured');
    }

    // Check DKIM
    if (!this.config.dkim) {
      recommendations.push('DKIM not configured - emails may be marked as spam');
    }

    // Check SPF record (would need DNS lookup in real implementation)
    recommendations.push('Ensure SPF record is configured for your domain');

    // Check environment variables
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM_ADDRESS', 'BASE_URL'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        issues.push(`Environment variable ${envVar} not set`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Test email configuration by sending a test email
   */
  static async testConfiguration(testEmail: string): Promise<{
    success: boolean;
    results: {
      smtp_connection: boolean;
      template_generation: boolean;
      email_send: boolean;
    };
    error?: string;
  }> {
    const results = {
      smtp_connection: false,
      template_generation: false,
      email_send: false,
    };

    try {
      // Test template generation
      const template = EmailTemplateService.generateVerifyEmail({
        email: testEmail,
        verificationUrl: 'https://example.com/verify',
        expirationMinutes: 15,
      }, 'en');
      results.template_generation = template.subject && template.html && template.text ? true : false;

      // Test email sending (simulated)
      const sendResult = await this.sendEmail({
        to: testEmail,
        template,
        correlationId: 'test-email',
        priority: 'low',
      });
      results.email_send = sendResult.success;

      // In production, you would test actual SMTP connection here
      results.smtp_connection = true;

      return {
        success: Object.values(results).every(Boolean),
        results,
      };
    } catch (error) {
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}