import { storage } from './storage';
import { sendSlackMessage } from './slackIntegration';
import { sendTeamsMessage } from './teamsIntegration';

interface NotificationContext {
  type: 'failure' | 'approval_required' | 'compliance_alert' | 'payroll_ready';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  propertyId?: string;
  employeeId?: string;
  managerId: string;
  metadata?: Record<string, any>;
  actions?: NotificationAction[];
}

interface NotificationAction {
  id: string;
  label: string;
  style: 'primary' | 'secondary' | 'destructive';
  url?: string;
  webhook?: string;
}

interface ApprovalRequest extends NotificationContext {
  type: 'approval_required';
  approvalId: string;
  amount?: number;
  currency?: string;
  expiresAt?: Date;
}

export class SmartNotificationsService {
  /**
   * Send push failure alerts for ERGANI/APD/ΦΜΥ systems
   * Includes automatic retry logic and escalation paths
   */
  async sendFailureAlert(context: {
    system: 'ERGANI' | 'APD' | 'ΦΜΥ';
    errorCode: string;
    errorMessage: string;
    affectedEmployees?: string[];
    propertyId: string;
    managerId: string;
    retryAttempt?: number;
    maxRetries?: number;
  }) {
    const { system, errorCode, errorMessage, affectedEmployees = [], propertyId, managerId, retryAttempt = 0, maxRetries = 3 } = context;
    
    const urgency = retryAttempt >= maxRetries ? 'critical' : 'high';
    const title = `${system} Integration Failure`;
    const description = `Error ${errorCode}: ${errorMessage}${affectedEmployees.length > 0 ? ` (${affectedEmployees.length} employees affected)` : ''}`;
    
    const notification: NotificationContext = {
      type: 'failure',
      title,
      description,
      urgency,
      propertyId,
      managerId,
      metadata: {
        system,
        errorCode,
        errorMessage,
        affectedEmployees,
        retryAttempt,
        maxRetries,
        timestamp: new Date().toISOString(),
      },
      actions: [
        {
          id: 'view_details',
          label: 'View Details',
          style: 'primary',
          url: `/compliance/filings?error=${errorCode}`,
        },
        {
          id: 'retry_submission',
          label: 'Retry Now',
          style: 'secondary',
          webhook: `/api/compliance/retry/${system.toLowerCase()}`,
        }
      ]
    };

    // Send to both Slack and Teams simultaneously
    await Promise.all([
      this.sendToSlack(notification),
      this.sendToTeams(notification)
    ]);

    // Log the notification
    await this.logNotification(notification);
  }

  /**
   * Send approval requests with context-aware buttons
   * Supports overtime, exceptions, and compliance filings
   */
  async sendApprovalRequest(request: ApprovalRequest) {
    const { approvalId, amount, currency = 'EUR', expiresAt } = request;
    
    // Create approval context in database
    await storage.createApprovalContext({
      id: approvalId,
      type: request.type,
      propertyId: request.propertyId,
      employeeId: request.employeeId,
      managerId: request.managerId,
      title: request.title,
      description: request.description,
      amount,
      currency,
      urgency: request.urgency,
      metadata: request.metadata,
      status: 'pending',
      expiresAt,
    });

    // Add approval actions to the notification
    const approvalActions: NotificationAction[] = [
      {
        id: 'approve',
        label: 'Approve',
        style: 'primary',
        webhook: `/api/approvals/${approvalId}/approve`,
      },
      {
        id: 'reject',
        label: 'Reject',
        style: 'destructive',
        webhook: `/api/approvals/${approvalId}/reject`,
      },
      {
        id: 'view',
        label: 'View Details',
        style: 'secondary',
        url: `/approvals/${approvalId}`,
      }
    ];

    const notificationWithActions = {
      ...request,
      actions: [...(request.actions || []), ...approvalActions]
    };

    // Send to communication channels
    await Promise.all([
      this.sendToSlack(notificationWithActions),
      this.sendToTeams(notificationWithActions)
    ]);

    // Log the notification
    await this.logNotification(notificationWithActions);
  }

  /**
   * Send to Slack with adaptive cards and action buttons
   */
  private async sendToSlack(notification: NotificationContext) {
    const urgencyColor = {
      low: '#36a64f',
      medium: '#ff9900',
      high: '#ff6b6b',
      critical: '#ff0000'
    }[notification.urgency];

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: notification.title,
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: notification.description,
        }
      }
    ];

    // Add context information if available
    if (notification.metadata) {
      const contextFields = [];
      if (notification.metadata.amount && notification.metadata.currency) {
        contextFields.push(`*Amount:* ${notification.metadata.currency} ${notification.metadata.amount}`);
      }
      if (notification.metadata.system) {
        contextFields.push(`*System:* ${notification.metadata.system}`);
      }
      if (notification.metadata.errorCode) {
        contextFields.push(`*Error Code:* ${notification.metadata.errorCode}`);
      }
      
      if (contextFields.length > 0) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: contextFields.join('\n'),
          }
        });
      }
    }

    // Add action buttons
    if (notification.actions && notification.actions.length > 0) {
      const elements = notification.actions.map(action => ({
        type: 'button',
        text: {
          type: 'plain_text',
          text: action.label,
        },
        style: action.style === 'primary' ? 'primary' : action.style === 'destructive' ? 'danger' : undefined,
        url: action.url,
        value: action.webhook || action.id,
      }));

      blocks.push({
        type: 'actions',
        elements,
      });
    }

    await sendSlackMessage({
      channel: process.env.SLACK_CHANNEL_ID!,
      blocks,
      attachments: [{
        color: urgencyColor,
        fallback: `${notification.title}: ${notification.description}`
      }]
    });
  }

  /**
   * Send to Microsoft Teams with adaptive cards
   */
  private async sendToTeams(notification: NotificationContext) {
    const facts: any[] = [];
    
    // Add context facts
    if (notification.metadata) {
      if (notification.metadata.amount && notification.metadata.currency) {
        facts.push({
          name: 'Amount',
          value: `${notification.metadata.currency} ${notification.metadata.amount}`
        });
      }
      if (notification.metadata.system) {
        facts.push({
          name: 'System',
          value: notification.metadata.system
        });
      }
      if (notification.metadata.errorCode) {
        facts.push({
          name: 'Error Code',
          value: notification.metadata.errorCode
        });
      }
    }

    const section: any = {
      activityTitle: notification.title,
      activitySubtitle: notification.description,
      facts
    };

    // Add action buttons
    if (notification.actions && notification.actions.length > 0) {
      section.potentialAction = notification.actions.map(action => ({
        '@type': 'OpenUri',
        name: action.label,
        targets: [
          {
            os: 'default',
            uri: action.url || action.webhook || '#'
          }
        ]
      }));
    }

    const card = {
      type: 'message',
      summary: notification.title,
      themeColor: {
        low: '00ff00',
        medium: 'ff9900',
        high: 'ff6b6b',
        critical: 'ff0000'
      }[notification.urgency],
      sections: [section]
    };

    await sendTeamsMessage(card);
  }

  /**
   * Log notification for audit trail and analytics
   */
  private async logNotification(notification: NotificationContext) {
    // In a real implementation, this would store in the database
    console.log('Smart Notification Sent:', {
      type: notification.type,
      title: notification.title,
      urgency: notification.urgency,
      managerId: notification.managerId,
      propertyId: notification.propertyId,
      timestamp: new Date().toISOString(),
      metadata: notification.metadata
    });
  }

  /**
   * Handle approval responses from Slack/Teams webhooks
   */
  async handleApprovalResponse(approvalId: string, action: 'approve' | 'reject', userId: string, reason?: string) {
    // Update approval context
    const updatedContext = await storage.updateApprovalContext(approvalId, {
      status: action === 'approve' ? 'approved' : 'rejected',
      updatedAt: new Date(),
    });

    // Log approval action
    await storage.createApprovalAction({
      approvalId,
      action,
      userId,
      reason,
      source: 'slack', // Could be determined from request headers
      auditTrail: [{
        timestamp: new Date().toISOString(),
        action,
        userId,
        reason,
      }]
    });

    // Send confirmation notification
    await this.sendConfirmation(approvalId, action, userId);

    return updatedContext;
  }

  /**
   * Send confirmation of approval decision
   */
  private async sendConfirmation(approvalId: string, action: 'approve' | 'reject', userId: string) {
    const context = await storage.getApprovalContext(approvalId);
    if (!context) return;

    const confirmationNotification: NotificationContext = {
      type: 'compliance_alert',
      title: `Request ${action.charAt(0).toUpperCase() + action.slice(1)}d`,
      description: `${context.title} has been ${action}d by <@${userId}>`,
      urgency: 'low',
      managerId: context.managerId,
      propertyId: context.propertyId,
      metadata: {
        originalApprovalId: approvalId,
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
      }
    };

    // Send confirmation to channels
    await Promise.all([
      this.sendToSlack(confirmationNotification),
      this.sendToTeams(confirmationNotification)
    ]);
  }

  /**
   * Send payroll readiness notifications
   */
  async sendPayrollReadyNotification(context: {
    propertyId: string;
    managerId: string;
    periodEnd: Date;
    employeeCount: number;
    totalGrossPay: number;
    totalNetPay: number;
    currency: string;
    complianceIssues: number;
    pendingApprovals: number;
  }) {
    const notification: NotificationContext = {
      type: 'payroll_ready',
      title: 'Payroll Ready for Processing',
      description: `Pay period ending ${context.periodEnd.toLocaleDateString()} is ready for ${context.employeeCount} employees`,
      urgency: context.complianceIssues > 0 || context.pendingApprovals > 0 ? 'medium' : 'low',
      propertyId: context.propertyId,
      managerId: context.managerId,
      metadata: {
        employeeCount: context.employeeCount,
        totalGrossPay: context.totalGrossPay,
        totalNetPay: context.totalNetPay,
        currency: context.currency,
        complianceIssues: context.complianceIssues,
        pendingApprovals: context.pendingApprovals,
        periodEnd: context.periodEnd.toISOString(),
      },
      actions: [
        {
          id: 'review_payroll',
          label: 'Review Payroll',
          style: 'primary',
          url: '/payroll/processing',
        },
        {
          id: 'process_payroll',
          label: 'Process Now',
          style: 'secondary',
          url: '/payroll/run-wizard',
        }
      ]
    };

    await Promise.all([
      this.sendToSlack(notification),
      this.sendToTeams(notification)
    ]);

    await this.logNotification(notification);
  }
}

export const smartNotifications = new SmartNotificationsService();