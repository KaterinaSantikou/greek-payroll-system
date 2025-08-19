/**
 * Microsoft Teams integration for notifications and approvals
 */

export interface TeamsMessage {
  type: string;
  attachments?: TeamsAttachment[];
  text?: string;
}

export interface TeamsAttachment {
  contentType: string;
  content: any;
}

/**
 * Sends a message to Microsoft Teams via webhook
 */
export async function sendTeamsMessage(
  webhookUrl: string,
  message: TeamsMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending Teams message:', error);
    return false;
  }
}

/**
 * Sends overtime approval request to Teams with action buttons
 */
export async function sendOvertimeApprovalToTeams(
  webhookUrl: string,
  employeeName: string,
  requestedHours: string,
  reason: string,
  notificationId: string
): Promise<boolean> {
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
            text: 'Overtime Approval Required',
            weight: 'Bolder',
            size: 'Medium',
            color: 'Attention'
          },
          {
            type: 'TextBlock',
            text: `**Employee:** ${employeeName}`,
            wrap: true
          },
          {
            type: 'TextBlock',
            text: `**Requested Time:** ${requestedHours}`,
            wrap: true
          },
          {
            type: 'TextBlock',
            text: `**Reason:** ${reason}`,
            wrap: true
          }
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: 'Approve',
            data: {
              action: 'approve',
              notificationId,
              type: 'overtime_approval'
            },
            style: 'positive'
          },
          {
            type: 'Action.Submit',
            title: 'Reject',
            data: {
              action: 'reject',
              notificationId,
              type: 'overtime_approval'
            },
            style: 'destructive'
          }
        ]
      }
    }]
  };

  return await sendTeamsMessage(webhookUrl, card);
}

/**
 * Sends ERGANI failure alert to Teams with retry button
 */
export async function sendErganiFailureToTeams(
  webhookUrl: string,
  errorMessage: string,
  submissionType: string,
  notificationId: string
): Promise<boolean> {
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
            text: '🚨 ERGANI Submission Failed',
            weight: 'Bolder',
            size: 'Medium',
            color: 'Attention'
          },
          {
            type: 'TextBlock',
            text: `**Submission Type:** ${submissionType}`,
            wrap: true
          },
          {
            type: 'TextBlock',
            text: `**Error:** ${errorMessage}`,
            wrap: true
          },
          {
            type: 'TextBlock',
            text: 'Please retry the submission or acknowledge this alert.',
            wrap: true
          }
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: 'Retry Now',
            data: {
              action: 'retry',
              notificationId,
              type: 'ergani_failure'
            },
            style: 'positive'
          },
          {
            type: 'Action.Submit',
            title: 'Acknowledge',
            data: {
              action: 'acknowledge',
              notificationId,
              type: 'ergani_failure'
            }
          }
        ]
      }
    }]
  };

  return await sendTeamsMessage(webhookUrl, card);
}

/**
 * Sends compliance digest to Teams
 */
export async function sendComplianceDigestToTeams(
  webhookUrl: string,
  digestData: any
): Promise<boolean> {
  const { erganiSubmissions, overtimeRequests, complianceAlerts, payrollReadiness } = digestData;
  
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
            text: '📊 Weekly Compliance & Payroll Summary',
            weight: 'Bolder',
            size: 'Large'
          },
          {
            type: 'FactSet',
            facts: [
              {
                title: 'ERGANI Submissions',
                value: `✅ ${erganiSubmissions.successful} successful, ❌ ${erganiSubmissions.failed} failed`
              },
              {
                title: 'Overtime Requests',
                value: `⏳ ${overtimeRequests.pending} pending, ✅ ${overtimeRequests.approved} approved`
              },
              {
                title: 'Compliance Alerts',
                value: `🔴 ${complianceAlerts.pending} need attention, ✅ ${complianceAlerts.resolved} resolved`
              },
              {
                title: 'Payroll Readiness',
                value: `📋 ${payrollReadiness.complete}% complete, ⚠️ ${payrollReadiness.missing}% missing data`
              }
            ]
          }
        ]
      }
    }]
  };

  return await sendTeamsMessage(webhookUrl, card);
}

/**
 * Creates a simple Teams notification
 */
export async function sendSimpleTeamsNotification(
  webhookUrl: string,
  title: string,
  message: string,
  color: 'Good' | 'Warning' | 'Attention' = 'Good'
): Promise<boolean> {
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
            text: title,
            weight: 'Bolder',
            size: 'Medium',
            color
          },
          {
            type: 'TextBlock',
            text: message,
            wrap: true
          }
        ]
      }
    }]
  };

  return await sendTeamsMessage(webhookUrl, card);
}