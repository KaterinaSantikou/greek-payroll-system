import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY environment variable not set. Email notifications disabled.");
}

export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: any;
}

/**
 * Sends an email using SendGrid
 */
export async function sendEmail(
  apiKey: string | undefined,
  params: EmailParams
): Promise<boolean> {
  if (!mailService) {
    console.warn("SendGrid not configured - skipping email");
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
      templateId: params.templateId,
      dynamicTemplateData: params.dynamicTemplateData,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Sends overtime approval email
 */
export async function sendOvertimeApprovalEmail(
  managerEmail: string,
  employeeName: string,
  requestedHours: string,
  reason: string,
  approvalUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Overtime Approval Required</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
        .info-table .label { font-weight: bold; background: #e9ecef; width: 150px; }
        .actions { margin-top: 30px; text-align: center; }
        .btn { display: inline-block; padding: 12px 24px; margin: 5px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Overtime Approval Required</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>A new overtime request has been submitted and requires your approval:</p>
          
          <table class="info-table">
            <tr>
              <td class="label">Employee:</td>
              <td>${employeeName}</td>
            </tr>
            <tr>
              <td class="label">Requested Time:</td>
              <td>${requestedHours}</td>
            </tr>
            <tr>
              <td class="label">Reason:</td>
              <td>${reason}</td>
            </tr>
          </table>
          
          <div class="actions">
            <a href="${approvalUrl}" class="btn btn-primary">Review & Approve</a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This request was submitted through PayrollSync and requires your immediate attention.
            Please review and take action within 24 hours.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!process.env.SENDGRID_API_KEY) {
    return false;
  }

  return await sendEmail(process.env.SENDGRID_API_KEY, {
    to: managerEmail,
    from: 'noreply@payrollsync.gr',
    subject: `Overtime Approval Required - ${employeeName}`,
    html
  });
}

/**
 * Sends ERGANI failure alert email
 */
export async function sendErganiFailureEmail(
  recipientEmail: string,
  errorMessage: string,
  submissionType: string,
  retryUrl: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ERGANI Submission Failed</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
        .alert { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .actions { margin-top: 30px; text-align: center; }
        .btn { display: inline-block; padding: 12px 24px; margin: 5px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .btn-primary { background: #007bff; color: white; }
        .btn-warning { background: #ffc107; color: #212529; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 ERGANI Submission Failed</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>An ERGANI submission has failed and requires your attention:</p>
          
          <div class="alert">
            <strong>Submission Type:</strong> ${submissionType}<br>
            <strong>Error Message:</strong> ${errorMessage}
          </div>
          
          <p>This submission failure may impact compliance reporting. Please retry the submission or contact support if the issue persists.</p>
          
          <div class="actions">
            <a href="${retryUrl}" class="btn btn-primary">Retry Submission</a>
            <a href="/compliance/ergani" class="btn btn-warning">View All Submissions</a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            This alert was generated automatically by PayrollSync. Please take action promptly to maintain compliance.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!process.env.SENDGRID_API_KEY) {
    return false;
  }

  return await sendEmail(process.env.SENDGRID_API_KEY, {
    to: recipientEmail,
    from: 'noreply@payrollsync.gr',
    subject: `🚨 ERGANI Submission Failed - ${submissionType}`,
    html
  });
}

/**
 * Sends weekly compliance digest email
 */
export async function sendComplianceDigestEmail(
  recipientEmail: string,
  digestData: any
): Promise<boolean> {
  const { period, erganiSubmissions, overtimeRequests, complianceAlerts, payrollReadiness } = digestData;
  const weekOf = new Date(period.start).toLocaleDateString('en-GB');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Weekly Compliance & Payroll Summary</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
        .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
        .summary-table th, .summary-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .summary-table th { background: #e9ecef; font-weight: bold; }
        .status-good { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-danger { color: #dc3545; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Weekly Compliance Summary</h1>
          <p>Week of ${weekOf}</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Here's your weekly compliance and payroll readiness summary:</p>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${erganiSubmissions.successful}</div>
              <div class="stat-label">ERGANI Submissions Success</div>
            </div>
            <div class="stat-card">
              <div class="stat-number status-warning">${erganiSubmissions.failed}</div>
              <div class="stat-label">ERGANI Failures</div>
            </div>
            <div class="stat-card">
              <div class="stat-number status-warning">${overtimeRequests.pending}</div>
              <div class="stat-label">Pending Overtime Approvals</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${payrollReadiness.complete}%</div>
              <div class="stat-label">Payroll Readiness</div>
            </div>
          </div>
          
          <table class="summary-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Status</th>
                <th>Action Required</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>ERGANI Submissions</td>
                <td class="${erganiSubmissions.failed > 0 ? 'status-warning' : 'status-good'}">
                  ${erganiSubmissions.failed > 0 ? `${erganiSubmissions.failed} failed` : 'All successful'}
                </td>
                <td>${erganiSubmissions.failed > 0 ? 'Review & retry failed submissions' : 'None'}</td>
              </tr>
              <tr>
                <td>Overtime Approvals</td>
                <td class="${overtimeRequests.pending > 0 ? 'status-warning' : 'status-good'}">
                  ${overtimeRequests.pending} pending
                </td>
                <td>${overtimeRequests.pending > 0 ? 'Review pending requests' : 'None'}</td>
              </tr>
              <tr>
                <td>Compliance Alerts</td>
                <td class="${complianceAlerts.pending > 0 ? 'status-danger' : 'status-good'}">
                  ${complianceAlerts.pending} unresolved
                </td>
                <td>${complianceAlerts.pending > 0 ? 'Address compliance issues' : 'None'}</td>
              </tr>
              <tr>
                <td>Payroll Readiness</td>
                <td class="${payrollReadiness.complete < 100 ? 'status-warning' : 'status-good'}">
                  ${payrollReadiness.complete}% complete
                </td>
                <td>${payrollReadiness.complete < 100 ? 'Complete missing employee data' : 'Ready for payroll'}</td>
              </tr>
            </tbody>
          </table>
          
          <p style="margin-top: 30px;">
            <a href="/compliance/dashboard" style="color: #007bff; text-decoration: none;">
              → View detailed compliance dashboard
            </a>
          </p>
          
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            This summary is generated automatically every Monday morning. 
            For immediate alerts, ensure your notification preferences are configured in PayrollSync.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!process.env.SENDGRID_API_KEY) {
    return false;
  }

  return await sendEmail(process.env.SENDGRID_API_KEY, {
    to: recipientEmail,
    from: 'noreply@payrollsync.gr',
    subject: `📊 Weekly Compliance Summary - Week of ${weekOf}`,
    html
  });
}