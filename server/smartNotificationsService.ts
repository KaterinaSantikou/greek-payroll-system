import { db } from "./db";
import { 
  notifications, 
  notificationPreferences, 
  integrationLogs,
  employees,
  users,
  overtimeRequests,
  type Notification,
  type InsertNotification,
  type NotificationPreference,
  type InsertIntegrationLog 
} from "@shared/schema";
import { eq, and, isNull, lte, gte, desc } from "drizzle-orm";
// Import functions will be defined inline to avoid module dependencies for now

export interface NotificationContext {
  userId?: string;
  employeeId?: string;
  propertyId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionData?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ApprovalAction {
  action: 'approve' | 'reject' | 'acknowledge';
  comments?: string;
  userId: string;
}

export class SmartNotificationsService {
  
  /**
   * Creates and sends a notification across configured channels
   */
  async createNotification(
    type: string,
    title: string,
    message: string,
    context: NotificationContext,
    channels: string[] = ['web']
  ): Promise<string> {
    try {
      // Create notification record
      const [notification] = await db.insert(notifications).values({
        type,
        title,
        message,
        category: this.getCategoryForType(type),
        priority: context.priority || 'medium',
        userId: context.userId,
        employeeId: context.employeeId,
        propertyId: context.propertyId,
        relatedEntityType: context.relatedEntityType,
        relatedEntityId: context.relatedEntityId,
        channels: JSON.stringify(channels),
        actionRequired: this.isActionRequired(type),
        actionType: this.getActionType(type),
        actionData: context.actionData ? JSON.stringify(context.actionData) : null,
        actionUrl: this.generateActionUrl(type, context.relatedEntityId),
        status: 'pending',
        expiresAt: this.calculateExpiry(type),
      }).returning();

      // Send across all configured channels
      await this.deliverNotification(notification, channels);

      return notification.notificationId;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Creates overtime approval request notification
   */
  async createOvertimeApprovalRequest(
    overtimeRequestId: string,
    employeeId: string,
    requestedMinutes: number,
    reason: string,
    managerId: string
  ): Promise<string> {
    const employee = await db.select().from(employees).where(eq(employees.employeeId, employeeId)).limit(1);
    const employeeName = employee[0] ? `${employee[0].firstName} ${employee[0].lastName}` : 'Employee';
    
    const hours = Math.floor(requestedMinutes / 60);
    const minutes = requestedMinutes % 60;
    const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return await this.createNotification(
      'overtime_approval',
      `Overtime Approval Required`,
      `${employeeName} requests ${timeString} overtime: ${reason}`,
      {
        userId: managerId,
        employeeId,
        relatedEntityType: 'overtime_request',
        relatedEntityId: overtimeRequestId,
        priority: 'high',
        actionData: {
          overtimeRequestId,
          requestedMinutes,
          employeeName,
          reason,
          buttons: [
            { action: 'approve', label: 'Approve', style: 'primary' },
            { action: 'reject', label: 'Reject', style: 'danger' }
          ]
        }
      },
      ['slack', 'email']
    );
  }

  /**
   * Creates ERGANI submission failure alert
   */
  async createErganiFailureAlert(
    errorMessage: string,
    submissionType: string,
    propertyId: string,
    retryCount: number = 0
  ): Promise<string> {
    const severity = retryCount > 2 ? 'urgent' : 'high';
    
    return await this.createNotification(
      'ergani_failure',
      `ERGANI Submission Failed`,
      `${submissionType} submission failed: ${errorMessage}`,
      {
        propertyId,
        relatedEntityType: 'ergani_submission',
        priority: severity,
        actionData: {
          errorMessage,
          submissionType,
          retryCount,
          buttons: [
            { action: 'retry', label: 'Retry Now', style: 'primary' },
            { action: 'acknowledge', label: 'Acknowledge', style: 'secondary' }
          ]
        }
      },
      ['slack', 'email']
    );
  }

  /**
   * Creates weekly compliance digest
   */
  async createComplianceDigest(userId: string, propertyIds: string[]): Promise<string> {
    // Aggregate compliance data for the week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const digestData = await this.generateComplianceDigestData(propertyIds, weekStart, new Date());
    
    return await this.createNotification(
      'compliance_digest',
      'Weekly Compliance & Payroll Summary',
      this.formatComplianceDigest(digestData),
      {
        userId,
        priority: 'medium',
        actionData: digestData
      },
      ['email']
    );
  }

  /**
   * Processes approval action from Slack/Teams
   */
  async processApprovalAction(
    notificationId: string,
    action: ApprovalAction
  ): Promise<boolean> {
    try {
      const notification = await db.select()
        .from(notifications)
        .where(eq(notifications.notificationId, notificationId))
        .limit(1);

      if (!notification[0] || notification[0].status === 'acted_upon') {
        return false;
      }

      // Update notification status
      await db.update(notifications)
        .set({
          status: 'acted_upon',
          actedAt: new Date(),
          actionBy: action.userId,
          actionResult: action.action,
          updatedAt: new Date()
        })
        .where(eq(notifications.notificationId, notificationId));

      // Process the specific approval
      await this.executeApprovalAction(notification[0], action);

      // Send confirmation notification
      await this.sendApprovalConfirmation(notification[0], action);

      return true;
    } catch (error) {
      console.error('Failed to process approval action:', error);
      return false;
    }
  }

  /**
   * Delivers notification across configured channels
   */
  private async deliverNotification(
    notification: Notification,
    channels: string[]
  ): Promise<void> {
    const preferences = await this.getUserPreferences(notification.userId);
    
    for (const channel of channels) {
      try {
        let delivered = false;
        const startTime = Date.now();

        switch (channel) {
          case 'slack':
            if (preferences?.slackEnabled) {
              delivered = await this.sendSlackNotification(notification, preferences);
            }
            break;
          case 'teams':
            if (preferences?.teamsEnabled) {
              delivered = await this.sendTeamsNotification(notification, preferences);
            }
            break;
          case 'email':
            if (preferences?.emailEnabled) {
              delivered = await this.sendEmailNotification(notification);
            }
            break;
        }

        // Log delivery attempt
        await this.logIntegration(
          channel,
          'send_notification',
          { notificationId: notification.notificationId },
          delivered ? 'success' : 'failed',
          Date.now() - startTime,
          notification.notificationId,
          notification.userId
        );

      } catch (error) {
        console.error(`Failed to deliver ${channel} notification:`, error);
        await this.logIntegration(
          channel,
          'send_notification',
          { notificationId: notification.notificationId, error: error.message },
          'error',
          0,
          notification.notificationId,
          notification.userId
        );
      }
    }
  }

  /**
   * Sends Slack notification with approval buttons
   */
  private async sendSlackNotification(
    notification: Notification,
    preferences: NotificationPreference
  ): Promise<boolean> {
    try {
      if (!process.env.SLACK_BOT_TOKEN || !preferences.slackChannelId) {
        return false;
      }

      const blocks = this.buildSlackBlocks(notification);
      
      await sendSlackMessage({
        channel: preferences.slackChannelId,
        blocks,
        text: notification.title // Fallback text
      });

      return true;
    } catch (error) {
      console.error('Slack notification failed:', error);
      return false;
    }
  }

  /**
   * Sends Teams notification with adaptive cards
   */
  private async sendTeamsNotification(
    notification: Notification,
    preferences: NotificationPreference
  ): Promise<boolean> {
    try {
      if (!preferences.teamsWebhookUrl) {
        return false;
      }

      const card = this.buildTeamsCard(notification);
      
      await sendTeamsMessage(preferences.teamsWebhookUrl, card);
      return true;
    } catch (error) {
      console.error('Teams notification failed:', error);
      return false;
    }
  }

  /**
   * Sends email notification
   */
  private async sendEmailNotification(notification: Notification): Promise<boolean> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return false;
      }

      const user = await db.select().from(users).where(eq(users.id, notification.userId!)).limit(1);
      if (!user[0]?.email) {
        return false;
      }

      const html = this.buildEmailTemplate(notification);
      
      return await sendEmail(process.env.SENDGRID_API_KEY, {
        to: user[0].email,
        from: 'noreply@payrollsync.gr',
        subject: notification.title,
        html
      });
    } catch (error) {
      console.error('Email notification failed:', error);
      return false;
    }
  }

  /**
   * Builds Slack message blocks with action buttons
   */
  private buildSlackBlocks(notification: Notification): any[] {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${notification.title}*\n${notification.message}`
        }
      }
    ];

    // Add action buttons if required
    if (notification.actionRequired && notification.actionData) {
      const actionData = typeof notification.actionData === 'string' 
        ? JSON.parse(notification.actionData) 
        : notification.actionData;

      if (actionData.buttons) {
        blocks.push({
          type: 'actions',
          elements: actionData.buttons.map((button: any) => ({
            type: 'button',
            text: {
              type: 'plain_text',
              text: button.label
            },
            value: JSON.stringify({
              action: button.action,
              notificationId: notification.notificationId
            }),
            action_id: `approval_${button.action}`,
            style: button.style === 'primary' ? 'primary' : 
                   button.style === 'danger' ? 'danger' : undefined
          }))
        });
      }
    }

    return blocks;
  }

  /**
   * Builds Teams adaptive card
   */
  private buildTeamsCard(notification: Notification): any {
    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.2',
          body: [
            {
              type: 'TextBlock',
              text: notification.title,
              weight: 'Bolder',
              size: 'Medium'
            },
            {
              type: 'TextBlock',
              text: notification.message,
              wrap: true
            }
          ]
        }
      }]
    };

    // Add action buttons if required
    if (notification.actionRequired && notification.actionData) {
      const actionData = typeof notification.actionData === 'string' 
        ? JSON.parse(notification.actionData) 
        : notification.actionData;

      if (actionData.buttons) {
        card.attachments[0].content.actions = actionData.buttons.map((button: any) => ({
          type: 'Action.Submit',
          title: button.label,
          data: {
            action: button.action,
            notificationId: notification.notificationId
          }
        }));
      }
    }

    return card;
  }

  /**
   * Builds email HTML template
   */
  private buildEmailTemplate(notification: Notification): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .actions { margin-top: 20px; text-align: center; }
          .btn { display: inline-block; padding: 10px 20px; margin: 5px; text-decoration: none; border-radius: 5px; }
          .btn-primary { background: #007bff; color: white; }
          .btn-danger { background: #dc3545; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${notification.title}</h1>
          </div>
          <div class="content">
            <p>${notification.message}</p>
            ${notification.actionRequired && notification.actionUrl ? 
              `<div class="actions">
                <a href="${notification.actionUrl}" class="btn btn-primary">Take Action</a>
              </div>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Helper methods
   */
  private getCategoryForType(type: string): string {
    if (type.includes('approval')) return 'approval';
    if (type.includes('alert') || type.includes('failure')) return 'alert';
    if (type.includes('digest')) return 'digest';
    return 'system';
  }

  private isActionRequired(type: string): boolean {
    return ['overtime_approval', 'ergani_failure'].includes(type);
  }

  private getActionType(type: string): string | null {
    switch (type) {
      case 'overtime_approval': return 'approve';
      case 'ergani_failure': return 'retry';
      default: return null;
    }
  }

  private generateActionUrl(type: string, entityId?: string): string | null {
    if (!entityId) return null;
    
    switch (type) {
      case 'overtime_approval':
        return `/approvals/overtime/${entityId}`;
      case 'ergani_failure':
        return `/compliance/ergani/retry/${entityId}`;
      default:
        return null;
    }
  }

  private calculateExpiry(type: string): Date | null {
    const now = new Date();
    switch (type) {
      case 'overtime_approval':
        // Expire after 24 hours
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'ergani_failure':
        // Expire after 7 days
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  private async getUserPreferences(userId?: string): Promise<NotificationPreference | null> {
    if (!userId) return null;
    
    const prefs = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    
    return prefs[0] || null;
  }

  private async executeApprovalAction(
    notification: Notification,
    action: ApprovalAction
  ): Promise<void> {
    switch (notification.type) {
      case 'overtime_approval':
        await this.processOvertimeApproval(notification, action);
        break;
      case 'ergani_failure':
        await this.processErganiRetry(notification, action);
        break;
    }
  }

  private async processOvertimeApproval(
    notification: Notification,
    action: ApprovalAction
  ): Promise<void> {
    if (notification.relatedEntityId) {
      await db.update(overtimeRequests)
        .set({
          status: action.action === 'approve' ? 'approved' : 'rejected',
          approvedBy: action.userId,
          approvedAt: new Date(),
          approvalComments: action.comments,
          updatedAt: new Date()
        })
        .where(eq(overtimeRequests.requestId, notification.relatedEntityId));
    }
  }

  private async processErganiRetry(
    notification: Notification,
    action: ApprovalAction
  ): Promise<void> {
    if (action.action === 'retry') {
      // Trigger ERGANI resubmission
      // This would integrate with your ERGANI connector
      console.log('Triggering ERGANI retry for:', notification.relatedEntityId);
    }
  }

  private async sendApprovalConfirmation(
    notification: Notification,
    action: ApprovalAction
  ): Promise<void> {
    const confirmationTitle = `${action.action === 'approve' ? 'Approved' : 'Rejected'}: ${notification.title}`;
    const confirmationMessage = `Action completed by user. ${action.comments ? `Comments: ${action.comments}` : ''}`;

    // Send confirmation to the original requestor if available
    if (notification.employeeId) {
      const employee = await db.select().from(employees).where(eq(employees.employeeId, notification.employeeId)).limit(1);
      // You could send a confirmation notification here
    }
  }

  private async generateComplianceDigestData(
    propertyIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // This would aggregate compliance data from various tables
    return {
      period: { start: startDate, end: endDate },
      erganiSubmissions: { successful: 98, failed: 2 },
      overtimeRequests: { pending: 5, approved: 23, rejected: 2 },
      complianceAlerts: { resolved: 12, pending: 3 },
      payrollReadiness: { complete: 85, missing: 15 }
    };
  }

  private formatComplianceDigest(data: any): string {
    return `
Weekly Summary:
• ERGANI: ${data.erganiSubmissions.successful} successful, ${data.erganiSubmissions.failed} failed
• Overtime: ${data.overtimeRequests.pending} pending approvals
• Compliance: ${data.complianceAlerts.pending} alerts need attention
• Payroll: ${data.payrollReadiness.complete}% employees ready
    `.trim();
  }

  private async logIntegration(
    integration: string,
    action: string,
    payload: any,
    status: string,
    duration: number,
    notificationId?: string,
    userId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(integrationLogs).values({
        integration,
        action,
        requestPayload: JSON.stringify(payload),
        status,
        duration,
        notificationId,
        userId,
        errorMessage
      });
    } catch (error) {
      console.error('Failed to log integration:', error);
    }
  }
}

export const smartNotificationsService = new SmartNotificationsService();