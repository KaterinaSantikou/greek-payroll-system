import { type ChatPostMessageArguments, WebClient } from "@slack/web-api";

if (!process.env.SLACK_BOT_TOKEN) {
  console.warn("SLACK_BOT_TOKEN environment variable not set. Slack integration disabled.");
}

if (!process.env.SLACK_CHANNEL_ID) {
  console.warn("SLACK_CHANNEL_ID environment variable not set. Using default channel.");
}

const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

/**
 * Sends a structured message to a Slack channel using the Slack Web API
 * Prefer using Channel ID to Channel names because they don't change when the
 * channel is renamed.
 * @param message - Structured message to send
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | undefined> {
  if (!slack) {
    console.warn("Slack not configured - skipping message");
    return undefined;
  }

  try {
    // Send the message
    const response = await slack.chat.postMessage(message);

    // Return the timestamp of the sent message
    return response.ts;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}

/**
 * Reads the history of a channel
 * @param channel_id - Channel ID to read message history from
 * @param messageLimit - Number of messages to retrieve
 * @returns Promise resolving to the messages
 */
export async function readSlackHistory(
  channel_id: string,
  messageLimit: number = 100,
): Promise<any> {
  if (!slack) {
    console.warn("Slack not configured - cannot read history");
    return { messages: [] };
  }

  try {
    // Get messages
    return await slack.conversations.history({
      channel: channel_id,
      limit: messageLimit,
    });
  } catch (error) {
    console.error('Error reading Slack history:', error);
    throw error;
  }
}

/**
 * Sends overtime approval request to Slack with action buttons
 */
export async function sendOvertimeApprovalToSlack(
  channelId: string,
  employeeName: string,
  requestedHours: string,
  reason: string,
  notificationId: string
): Promise<string | undefined> {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Overtime Approval Required*\n${employeeName} requests ${requestedHours} overtime: ${reason}`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Approve'
          },
          value: JSON.stringify({
            action: 'approve',
            notificationId
          }),
          action_id: 'approve_overtime',
          style: 'primary'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Reject'
          },
          value: JSON.stringify({
            action: 'reject',
            notificationId
          }),
          action_id: 'reject_overtime',
          style: 'danger'
        }
      ]
    }
  ];

  return await sendSlackMessage({
    channel: channelId,
    blocks,
    text: `Overtime approval required for ${employeeName}`
  });
}

/**
 * Sends ERGANI failure alert to Slack with retry button
 */
export async function sendErganiFailureToSlack(
  channelId: string,
  errorMessage: string,
  submissionType: string,
  notificationId: string
): Promise<string | undefined> {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🚨 *ERGANI Submission Failed*\n${submissionType} submission failed: ${errorMessage}`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Retry Now'
          },
          value: JSON.stringify({
            action: 'retry',
            notificationId
          }),
          action_id: 'retry_ergani',
          style: 'primary'
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Acknowledge'
          },
          value: JSON.stringify({
            action: 'acknowledge',
            notificationId
          }),
          action_id: 'acknowledge_ergani'
        }
      ]
    }
  ];

  return await sendSlackMessage({
    channel: channelId,
    blocks,
    text: `ERGANI submission failed - retry now?`
  });
}

/**
 * Sends compliance digest to Slack
 */
export async function sendComplianceDigestToSlack(
  channelId: string,
  digestData: any
): Promise<string | undefined> {
  const { erganiSubmissions, overtimeRequests, complianceAlerts, payrollReadiness } = digestData;
  
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*📊 Weekly Compliance & Payroll Summary*'
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*ERGANI Submissions*\n✅ ${erganiSubmissions.successful} successful\n❌ ${erganiSubmissions.failed} failed`
        },
        {
          type: 'mrkdwn',
          text: `*Overtime Requests*\n⏳ ${overtimeRequests.pending} pending\n✅ ${overtimeRequests.approved} approved`
        },
        {
          type: 'mrkdwn',
          text: `*Compliance Alerts*\n🔴 ${complianceAlerts.pending} need attention\n✅ ${complianceAlerts.resolved} resolved`
        },
        {
          type: 'mrkdwn',
          text: `*Payroll Readiness*\n📋 ${payrollReadiness.complete}% complete\n⚠️ ${payrollReadiness.missing}% missing data`
        }
      ]
    }
  ];

  return await sendSlackMessage({
    channel: channelId,
    blocks,
    text: 'Weekly compliance and payroll summary'
  });
}