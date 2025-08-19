import { WebClient } from "@slack/web-api";
import { storage } from "./storage";
import { workflowManager } from "./workflowManager";

interface SlackTeamsConfig {
  slackBotToken?: string;
  slackChannelId?: string;
  teamsWebhookUrl?: string;
  enableSlack: boolean;
  enableTeams: boolean;
}

interface ApprovalContext {
  id: string;
  type: 'overtime' | 'exception' | 'filing';
  propertyId: string;
  employeeId?: string;
  managerId: string;
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

interface ApprovalAction {
  approvalId: string;
  action: 'approve' | 'reject' | 'view';
  userId: string;
  reason?: string;
  timestamp: Date;
  source: 'slack' | 'teams' | 'web';
  auditTrail: string[];
}

export class SlackTeamsApprovalService {
  private slack?: WebClient;
  private config: SlackTeamsConfig;

  constructor(config?: Partial<SlackTeamsConfig>) {
    this.config = {
      enableSlack: !!process.env.SLACK_BOT_TOKEN,
      enableTeams: !!process.env.TEAMS_WEBHOOK_URL,
      slackBotToken: process.env.SLACK_BOT_TOKEN,
      slackChannelId: process.env.SLACK_CHANNEL_ID,
      teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL,
      ...config
    };

    if (this.config.enableSlack && this.config.slackBotToken) {
      this.slack = new WebClient(this.config.slackBotToken);
    }
  }

  // Send overtime approval request
  async sendOvertimeApproval(context: {
    employeeId: string;
    employeeName: string;
    requestedHours: number;
    regularHours: number;
    overtimeHours: number;
    rate: number;
    totalCost: number;
    reason: string;
    managerId: string;
    propertyName: string;
    weekStarting: string;
  }): Promise<string> {
    const approvalId = `overtime-${Date.now()}-${context.employeeId}`;
    
    const approvalContext: ApprovalContext = {
      id: approvalId,
      type: 'overtime',
      propertyId: context.propertyName,
      employeeId: context.employeeId,
      managerId: context.managerId,
      title: `Overtime Approval: ${context.employeeName}`,
      description: `${context.employeeName} requesting ${context.requestedHours}h overtime (${context.overtimeHours}h over limit)`,
      amount: context.totalCost,
      currency: 'EUR',
      urgency: context.overtimeHours > 10 ? 'high' : 'medium',
      metadata: context,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    await this.storeApprovalContext(approvalContext);

    if (this.config.enableSlack) {
      await this.sendSlackOvertimeCard(approvalContext);
    }

    if (this.config.enableTeams) {
      await this.sendTeamsOvertimeCard(approvalContext);
    }

    return approvalId;
  }

  // Send exception resolution request
  async sendExceptionApproval(context: {
    exceptionId: string;
    employeeId: string;
    employeeName: string;
    exceptionType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    proposedFix: string;
    confidence: number;
    managerId: string;
    propertyName: string;
    date: string;
  }): Promise<string> {
    const approvalId = `exception-${Date.now()}-${context.exceptionId}`;
    
    const approvalContext: ApprovalContext = {
      id: approvalId,
      type: 'exception',
      propertyId: context.propertyName,
      employeeId: context.employeeId,
      managerId: context.managerId,
      title: `Exception Resolution: ${context.employeeName}`,
      description: `${context.exceptionType} exception for ${context.employeeName} - ${context.description}`,
      urgency: context.severity,
      metadata: context,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
    };

    await this.storeApprovalContext(approvalContext);

    if (this.config.enableSlack) {
      await this.sendSlackExceptionCard(approvalContext);
    }

    if (this.config.enableTeams) {
      await this.sendTeamsExceptionCard(approvalContext);
    }

    return approvalId;
  }

  // Send filing failure alert
  async sendFilingFailureAlert(context: {
    filingType: 'ERGANI' | 'APD' | 'ΦΜΥ';
    propertyName: string;
    errorCode: string;
    errorMessage: string;
    affectedEmployees: number;
    retryCount: number;
    maxRetries: number;
    nextRetry?: Date;
    escalateAfter?: Date;
  }): Promise<void> {
    const urgency: 'low' | 'medium' | 'high' | 'critical' = 
      context.retryCount >= context.maxRetries ? 'critical' : 
      context.filingType === 'ERGANI' ? 'high' : 'medium';

    if (this.config.enableSlack) {
      await this.sendSlackFilingAlert(context, urgency);
    }

    if (this.config.enableTeams) {
      await this.sendTeamsFilingAlert(context, urgency);
    }
  }

  // Handle approval action from Slack/Teams
  async handleApprovalAction(action: Omit<ApprovalAction, 'timestamp' | 'auditTrail'>): Promise<{
    success: boolean;
    message: string;
    redirectUrl?: string;
  }> {
    const approvalContext = await this.getApprovalContext(action.approvalId);
    if (!approvalContext) {
      return { success: false, message: "Approval request not found" };
    }

    // Check expiration
    if (approvalContext.expiresAt && approvalContext.expiresAt < new Date()) {
      return { success: false, message: "Approval request has expired" };
    }

    const fullAction: ApprovalAction = {
      ...action,
      timestamp: new Date(),
      auditTrail: [
        `Action initiated by ${action.userId} via ${action.source}`,
        `Previous state: pending approval`,
        `New state: ${action.action}`,
      ]
    };

    await this.logApprovalAction(fullAction);

    let result: { success: boolean; message: string; redirectUrl?: string };

    try {
      switch (approvalContext.type) {
        case 'overtime':
          result = await this.processOvertimeAction(approvalContext, fullAction);
          break;
        case 'exception':
          result = await this.processExceptionAction(approvalContext, fullAction);
          break;
        case 'filing':
          result = await this.processFilingAction(approvalContext, fullAction);
          break;
        default:
          result = { success: false, message: "Unknown approval type" };
      }
    } catch (error) {
      console.error("Error processing approval action:", error);
      result = { success: false, message: "Failed to process approval action" };
    }

    // Update the original message with the result
    if (result.success) {
      await this.updateApprovalMessage(approvalContext, fullAction, result);
    }

    return result;
  }

  private async sendSlackOvertimeCard(context: ApprovalContext): Promise<void> {
    if (!this.slack || !this.config.slackChannelId) return;

    const metadata = context.metadata;
    const variance = metadata.overtimeHours;
    const variantColor = variance > 10 ? '#ff4444' : variance > 5 ? '#ff8800' : '#ffaa00';

    try {
      await this.slack.chat.postMessage({
        channel: this.config.slackChannelId,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🕐 Overtime Approval Required`,
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Employee:*\n${metadata.employeeName}`
              },
              {
                type: "mrkdwn",
                text: `*Property:*\n${metadata.propertyName}`
              },
              {
                type: "mrkdwn",
                text: `*Week Starting:*\n${new Date(metadata.weekStarting).toLocaleDateString()}`
              },
              {
                type: "mrkdwn",
                text: `*Requested Hours:*\n${metadata.requestedHours}h`
              }
            ]
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Regular Hours:*\n${metadata.regularHours}h`
              },
              {
                type: "mrkdwn",
                text: `*Overtime Hours:*\n${metadata.overtimeHours}h`
              },
              {
                type: "mrkdwn",
                text: `*Hourly Rate:*\n€${metadata.rate.toFixed(2)}`
              },
              {
                type: "mrkdwn",
                text: `*Total Cost:*\n€${metadata.totalCost.toFixed(2)}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Reason:*\n${metadata.reason}`
            }
          },
          {
            type: "actions",
            block_id: "overtime_approval_actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "✅ Approve"
                },
                style: "primary",
                action_id: "approve_overtime",
                value: context.id
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "❌ Reject"
                },
                style: "danger",
                action_id: "reject_overtime",
                value: context.id
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "👁️ View Details"
                },
                action_id: "view_overtime",
                value: context.id,
                url: `${process.env.BASE_URL}/overtime?approval=${context.id}`
              }
            ]
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Expires: ${context.expiresAt?.toLocaleString()} | Priority: ${context.urgency.toUpperCase()}`
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error("Error sending Slack overtime card:", error);
    }
  }

  private async sendSlackExceptionCard(context: ApprovalContext): Promise<void> {
    if (!this.slack || !this.config.slackChannelId) return;

    const metadata = context.metadata;
    const confidenceColor = metadata.confidence > 0.8 ? '#00aa44' : metadata.confidence > 0.6 ? '#ffaa00' : '#ff4444';

    try {
      await this.slack.chat.postMessage({
        channel: this.config.slackChannelId,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `⚠️ Exception Resolution Required`,
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Employee:*\n${metadata.employeeName}`
              },
              {
                type: "mrkdwn",
                text: `*Property:*\n${metadata.propertyName}`
              },
              {
                type: "mrkdwn",
                text: `*Exception Type:*\n${metadata.exceptionType}`
              },
              {
                type: "mrkdwn",
                text: `*Severity:*\n${metadata.severity.toUpperCase()}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Description:*\n${metadata.description}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Proposed Fix:*\n${metadata.proposedFix}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*AI Confidence:* ${(metadata.confidence * 100).toFixed(0)}%`
            }
          },
          {
            type: "actions",
            block_id: "exception_approval_actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "✅ Approve Fix"
                },
                style: "primary",
                action_id: "approve_exception",
                value: context.id
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "❌ Reject Fix"
                },
                style: "danger",
                action_id: "reject_exception",
                value: context.id
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "👁️ View Details"
                },
                action_id: "view_exception",
                value: context.id,
                url: `${process.env.BASE_URL}/manager-workflows?exception=${context.id}`
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error("Error sending Slack exception card:", error);
    }
  }

  private async sendSlackFilingAlert(context: any, urgency: string): Promise<void> {
    if (!this.slack || !this.config.slackChannelId) return;

    const urgencyEmoji = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    }[urgency] || '⚠️';

    try {
      await this.slack.chat.postMessage({
        channel: this.config.slackChannelId,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${urgencyEmoji} Filing Failure Alert: ${context.filingType}`,
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Property:*\n${context.propertyName}`
              },
              {
                type: "mrkdwn",
                text: `*Filing Type:*\n${context.filingType}`
              },
              {
                type: "mrkdwn",
                text: `*Error Code:*\n${context.errorCode}`
              },
              {
                type: "mrkdwn",
                text: `*Affected Employees:*\n${context.affectedEmployees}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Error Message:*\n${context.errorMessage}`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Retry Attempts:*\n${context.retryCount}/${context.maxRetries}`
              },
              {
                type: "mrkdwn",
                text: `*Next Retry:*\n${context.nextRetry ? context.nextRetry.toLocaleString() : 'Manual intervention required'}`
              }
            ]
          },
          ...(urgency === 'critical' ? [{
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🚨 *CRITICAL: Maximum retries exceeded. Manual intervention required.*`
            }
          }] : []),
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "🔄 Retry Now"
                },
                style: "primary",
                action_id: "retry_filing",
                value: `${context.filingType}-${context.propertyName}`
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "👁️ View Filing"
                },
                action_id: "view_filing",
                url: `${process.env.BASE_URL}/compliance?filing=${context.filingType}`
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error("Error sending Slack filing alert:", error);
    }
  }

  private async sendTeamsOvertimeCard(context: ApprovalContext): Promise<void> {
    if (!this.config.teamsWebhookUrl) return;

    const metadata = context.metadata;
    
    const card = {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: `Overtime Approval: ${metadata.employeeName}`,
      themeColor: metadata.overtimeHours > 10 ? "attention" : "warning",
      sections: [
        {
          activityTitle: "🕐 Overtime Approval Required",
          activitySubtitle: `${metadata.employeeName} - ${metadata.propertyName}`,
          facts: [
            { name: "Employee", value: metadata.employeeName },
            { name: "Property", value: metadata.propertyName },
            { name: "Week Starting", value: new Date(metadata.weekStarting).toLocaleDateString() },
            { name: "Requested Hours", value: `${metadata.requestedHours}h` },
            { name: "Overtime Hours", value: `${metadata.overtimeHours}h` },
            { name: "Total Cost", value: `€${metadata.totalCost.toFixed(2)}` },
            { name: "Reason", value: metadata.reason }
          ]
        }
      ],
      potentialAction: [
        {
          "@type": "ActionCard",
          name: "Approve",
          actions: [
            {
              "@type": "HttpPOST",
              name: "✅ Approve",
              target: `${process.env.BASE_URL}/api/approvals/action`,
              body: JSON.stringify({
                approvalId: context.id,
                action: "approve",
                source: "teams"
              }),
              headers: [
                { name: "Content-Type", value: "application/json" }
              ]
            }
          ]
        },
        {
          "@type": "ActionCard", 
          name: "Reject",
          actions: [
            {
              "@type": "HttpPOST",
              name: "❌ Reject",
              target: `${process.env.BASE_URL}/api/approvals/action`,
              body: JSON.stringify({
                approvalId: context.id,
                action: "reject", 
                source: "teams"
              })
            }
          ]
        },
        {
          "@type": "OpenUri",
          name: "👁️ View Details",
          targets: [
            {
              os: "default",
              uri: `${process.env.BASE_URL}/overtime?approval=${context.id}`
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(this.config.teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });

      if (!response.ok) {
        console.error("Failed to send Teams card:", response.statusText);
      }
    } catch (error) {
      console.error("Error sending Teams overtime card:", error);
    }
  }

  private async sendTeamsExceptionCard(context: ApprovalContext): Promise<void> {
    // Similar implementation for Teams exception cards
    // Following the same pattern as Slack but with Teams adaptive card format
  }

  private async sendTeamsFilingAlert(context: any, urgency: string): Promise<void> {
    // Similar implementation for Teams filing alerts
    // Following the same pattern as Slack but with Teams adaptive card format
  }

  private async processOvertimeAction(
    context: ApprovalContext, 
    action: ApprovalAction
  ): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
    try {
      const metadata = context.metadata;
      
      if (action.action === 'approve') {
        await workflowManager.approveRejectOvertime(
          context.id,
          'approved',
          action.userId,
          metadata.requestedHours,
          action.reason || 'Approved via ' + action.source
        );
        
        return {
          success: true,
          message: `Overtime approved for ${metadata.employeeName} (${metadata.requestedHours}h)`,
          redirectUrl: `${process.env.BASE_URL}/overtime`
        };
      } else if (action.action === 'reject') {
        await workflowManager.approveRejectOvertime(
          context.id,
          'rejected',
          action.userId,
          0,
          action.reason || 'Rejected via ' + action.source
        );
        
        return {
          success: true,
          message: `Overtime rejected for ${metadata.employeeName}`,
          redirectUrl: `${process.env.BASE_URL}/overtime`
        };
      }
      
      return { success: false, message: "Invalid action" };
    } catch (error) {
      console.error("Error processing overtime action:", error);
      return { success: false, message: "Failed to process overtime action" };
    }
  }

  private async processExceptionAction(
    context: ApprovalContext,
    action: ApprovalAction
  ): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
    try {
      const metadata = context.metadata;
      
      if (action.action === 'approve') {
        await workflowManager.approveRejectException(
          metadata.exceptionId,
          'approved',
          action.userId,
          action.reason || 'Approved via ' + action.source,
          null // correctedValue handled by AI engine
        );
        
        return {
          success: true,
          message: `Exception resolution approved for ${metadata.employeeName}`,
          redirectUrl: `${process.env.BASE_URL}/manager-workflows`
        };
      } else if (action.action === 'reject') {
        await workflowManager.approveRejectException(
          metadata.exceptionId,
          'rejected',
          action.userId,
          action.reason || 'Rejected via ' + action.source,
          null
        );
        
        return {
          success: true,
          message: `Exception resolution rejected for ${metadata.employeeName}`,
          redirectUrl: `${process.env.BASE_URL}/manager-workflows`
        };
      }
      
      return { success: false, message: "Invalid action" };
    } catch (error) {
      console.error("Error processing exception action:", error);
      return { success: false, message: "Failed to process exception action" };
    }
  }

  private async processFilingAction(
    context: ApprovalContext,
    action: ApprovalAction
  ): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
    // Implementation for filing-related actions (retry, escalate, etc.)
    return {
      success: true,
      message: `Filing action processed: ${action.action}`,
      redirectUrl: `${process.env.BASE_URL}/compliance`
    };
  }

  private async storeApprovalContext(context: ApprovalContext): Promise<void> {
    // Store approval context in database for retrieval and audit
    await storage.createApprovalContext({
      id: context.id,
      type: context.type,
      propertyId: context.propertyId,
      employeeId: context.employeeId,
      managerId: context.managerId,
      title: context.title,
      description: context.description,
      amount: context.amount,
      currency: context.currency,
      urgency: context.urgency,
      metadata: JSON.stringify(context.metadata),
      status: 'pending',
      createdAt: context.createdAt,
      expiresAt: context.expiresAt,
    });
  }

  private async getApprovalContext(approvalId: string): Promise<ApprovalContext | null> {
    const stored = await storage.getApprovalContext(approvalId);
    if (!stored) return null;

    return {
      id: stored.id,
      type: stored.type as 'overtime' | 'exception' | 'filing',
      propertyId: stored.propertyId,
      employeeId: stored.employeeId,
      managerId: stored.managerId,
      title: stored.title,
      description: stored.description,
      amount: stored.amount,
      currency: stored.currency,
      urgency: stored.urgency as 'low' | 'medium' | 'high' | 'critical',
      metadata: JSON.parse(stored.metadata || '{}'),
      createdAt: stored.createdAt,
      expiresAt: stored.expiresAt,
    };
  }

  private async logApprovalAction(action: ApprovalAction): Promise<void> {
    await storage.createApprovalAction({
      approvalId: action.approvalId,
      action: action.action,
      userId: action.userId,
      reason: action.reason,
      source: action.source,
      timestamp: action.timestamp,
      auditTrail: JSON.stringify(action.auditTrail),
    });
  }

  private async updateApprovalMessage(
    context: ApprovalContext,
    action: ApprovalAction,
    result: { success: boolean; message: string }
  ): Promise<void> {
    // Update the original Slack/Teams message to show the result
    if (this.config.enableSlack && this.slack) {
      // Implementation to update Slack message
    }
    
    if (this.config.enableTeams) {
      // Implementation to update Teams message
    }
  }
}

// Export singleton instance
export const slackTeamsApprovalService = new SlackTeamsApprovalService();