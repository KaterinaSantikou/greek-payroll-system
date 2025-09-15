/**
 * APD Filing Workflow & Inspector/Audit Pack Generation (Flows 7.2 & 7.3)
 */

import type { Express } from 'express';
import { isAuthenticated } from '../replitAuth';
import { AuditService } from '../services/AuditService';

export function registerFilingWorkflowRoutes(app: Express) {
  // APD Filing Preparation Workflow (Flow 7.2)
  app.post(
    '/api/partners/filings/apd/prepare',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;
        const tenantId = (req.session as any).currentTenant;
        const partnerFirmId = (req.session as any).currentPartnerFirm;
        const { period, employeeData, validationOverrides } = req.body;

        if (!tenantId || !partnerFirmId) {
          return res.status(400).json({ error: 'No active tenant context' });
        }

        if (!period) {
          return res
            .status(400)
            .json({ error: 'Period is required (e.g., "12/2024")' });
        }

        // Run validators (min wage guardrails, coverage, contribution caps)
        const validationResults = await validateAPDSubmission({
          period,
          employeeData: employeeData || [],
          tenantId,
        });

        // Create draft filing
        const filingId = `apd_${tenantId}_${period.replace('/', '')}_${Date.now()}`;
        const draftFiling = {
          id: filingId,
          type: 'APD',
          period,
          status: 'draft',
          tenantId,
          partnerFirmId,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          data: {
            employeeData: employeeData || [],
            validationResults,
            validationOverrides: validationOverrides || {},
          },
        };

        // Store draft in session/cache for now (would use database in production)
        if (!(req.session as any).drafts) {
          (req.session as any).drafts = {};
        }
        (req.session as any).drafts[filingId] = draftFiling;

        // Log draft creation
        await AuditService.logEvent({
          eventType: 'user_action',
          eventCategory: 'filing',
          eventAction: 'apd_draft_prepared',
          tenantId,
          partnerFirmId,
          userId,
          eventData: {
            filingId,
            period,
            validationStatus: validationResults.isValid ? 'passed' : 'failed',
            errorCount: validationResults.errors.length,
            warningCount: validationResults.warnings.length,
          },
        });

        res.json({
          filingId,
          status: 'draft',
          period,
          validationResults,
          canProceed:
            validationResults.isValid ||
            Object.keys(validationOverrides || {}).length > 0,
          nextStep: validationResults.isValid
            ? 'send_for_approval'
            : 'fix_validation_errors',
        });
      } catch (error) {
        console.error('Error preparing APD filing:', error);
        res.status(500).json({ error: 'Failed to prepare APD filing' });
      }
    }
  );

  // Send APD for approval (Flow 7.2)
  app.post(
    '/api/partners/filings/apd/:filingId/send-for-approval',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;
        const tenantId = (req.session as any).currentTenant;
        const partnerFirmId = (req.session as any).currentPartnerFirm;
        const { filingId } = req.params;
        const { comments } = req.body;

        const draftFiling = (req.session as any).drafts?.[filingId];
        if (!draftFiling || draftFiling.status !== 'draft') {
          return res
            .status(404)
            .json({ error: 'Draft filing not found or already processed' });
        }

        // Create approval request
        const approvalRequestId = `approval_${filingId}_${Date.now()}`;
        const approvalRequest = {
          id: approvalRequestId,
          type: 'filing_submit',
          action: 'apd.submit',
          filingId,
          title: `APD ${draftFiling.period} Submission`,
          requestedBy: userId,
          requestedAt: new Date().toISOString(),
          status: 'pending',
          priority:
            new Date() < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              ? 'high'
              : 'normal',
          tenantId,
          partnerFirmId,
          makerCheckerMode: 'client_checker', // Would get from client access
          comments,
          changes: draftFiling.data,
          diffs: {
            previousTotal: 118750,
            newTotal: 125200,
            headcountChange: +2,
            contributionsChange: +6450,
          },
        };

        // Store approval request
        if (!(req.session as any).approvals) {
          (req.session as any).approvals = {};
        }
        (req.session as any).approvals[approvalRequestId] = approvalRequest;

        // Update filing status
        draftFiling.status = 'pending_approval';
        draftFiling.approvalRequestId = approvalRequestId;
        (req.session as any).drafts[filingId] = draftFiling;

        // Log approval request
        await AuditService.logEvent({
          eventType: 'user_action',
          eventCategory: 'approval',
          eventAction: 'approval_requested',
          tenantId,
          partnerFirmId,
          userId,
          eventData: {
            filingId,
            approvalRequestId,
            action: 'apd.submit',
            period: draftFiling.period,
            makerCheckerMode: approvalRequest.makerCheckerMode,
            priority: approvalRequest.priority,
          },
        });

        res.json({
          approvalRequestId,
          status: 'pending_approval',
          message: `APD ${draftFiling.period} sent for approval`,
          approvalMode: approvalRequest.makerCheckerMode,
          estimatedApprovalTime: '24-48 hours',
        });
      } catch (error) {
        console.error('Error sending filing for approval:', error);
        res.status(500).json({ error: 'Failed to send filing for approval' });
      }
    }
  );

  // Get approval queue
  app.get('/api/partners/approvals', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = (req.session as any).currentTenant;
      const partnerFirmId = (req.session as any).currentPartnerFirm;

      const approvals = Object.values(
        (req.session as any).approvals || {}
      ).filter(
        (approval: any) =>
          approval.tenantId === tenantId &&
          approval.partnerFirmId === partnerFirmId &&
          approval.status === 'pending'
      );

      res.json({ approvals });
    } catch (error) {
      console.error('Error fetching approvals:', error);
      res.status(500).json({ error: 'Failed to fetch approvals' });
    }
  });

  // Approve/Reject filing submission
  app.post(
    '/api/partners/approvals/:approvalId/decision',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;
        const { approvalId } = req.params;
        const { decision, comments } = req.body;

        if (!['approve', 'reject'].includes(decision)) {
          return res
            .status(400)
            .json({ error: 'Decision must be "approve" or "reject"' });
        }

        const approval = (req.session as any).approvals?.[approvalId];
        if (!approval || approval.status !== 'pending') {
          return res
            .status(404)
            .json({ error: 'Approval request not found or already processed' });
        }

        // Update approval status
        approval.status = decision === 'approve' ? 'approved' : 'rejected';
        approval.reviewedBy = userId;
        approval.reviewedAt = new Date().toISOString();
        approval.reviewComments = comments;
        (req.session as any).approvals[approvalId] = approval;

        // Update filing status
        const filing = (req.session as any).drafts?.[approval.filingId];
        if (filing) {
          filing.status = decision === 'approve' ? 'ready' : 'rejected';
          filing.reviewedAt = new Date().toISOString();
          (req.session as any).drafts[approval.filingId] = filing;
        }

        // Log approval decision
        await AuditService.logEvent({
          eventType: 'user_action',
          eventCategory: 'approval',
          eventAction: `approval_${decision}d`,
          tenantId: approval.tenantId,
          partnerFirmId: approval.partnerFirmId,
          userId,
          eventData: {
            approvalId,
            filingId: approval.filingId,
            decision,
            comments,
            originalRequester: approval.requestedBy,
            reviewTime:
              new Date().getTime() - new Date(approval.requestedAt).getTime(),
          },
        });

        res.json({
          decision,
          status: approval.status,
          message: `Filing ${decision}d successfully`,
          nextStep:
            decision === 'approve' ? 'submit_to_aade' : 'revise_and_resubmit',
        });
      } catch (error) {
        console.error('Error processing approval decision:', error);
        res.status(500).json({ error: 'Failed to process approval decision' });
      }
    }
  );

  // Submit APD to AADE (after approval)
  app.post(
    '/api/partners/filings/apd/:filingId/submit',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;
        const tenantId = (req.session as any).currentTenant;
        const partnerFirmId = (req.session as any).currentPartnerFirm;
        const { filingId } = req.params;

        const filing = (req.session as any).drafts?.[filingId];
        if (!filing || filing.status !== 'ready') {
          return res
            .status(400)
            .json({ error: 'Filing not ready for submission or not found' });
        }

        // Mock AADE submission
        const submissionId = `AADE_${Date.now()}`;
        const receiptId = `RCPT_${Date.now()}`;

        // Update filing status
        filing.status = 'submitted';
        filing.submittedBy = userId;
        filing.submittedAt = new Date().toISOString();
        filing.aadeSubmissionId = submissionId;
        filing.aadeReceiptId = receiptId;
        (req.session as any).drafts[filingId] = filing;

        // Create receipt document
        const receiptDocument = {
          id: receiptId,
          type: 'aade_receipt',
          filingId,
          filename: `APD_${filing.period}_Receipt.pdf`,
          createdAt: new Date().toISOString(),
          content: `AADE Submission Receipt\nFiling: APD ${filing.period}\nSubmission ID: ${submissionId}\nStatus: Accepted\nTimestamp: ${new Date().toLocaleString()}`,
        };

        // Store receipt in documents
        if (!(req.session as any).documents) {
          (req.session as any).documents = {};
        }
        (req.session as any).documents[receiptId] = receiptDocument;

        // Full audit trail with OBO claims
        await AuditService.logEvent({
          eventType: 'user_action',
          eventCategory: 'filing',
          eventAction: 'apd_submitted',
          tenantId,
          partnerFirmId,
          userId,
          eventData: {
            filingId,
            period: filing.period,
            aadeSubmissionId: submissionId,
            receiptId,
            preparedBy: filing.createdBy,
            approvedBy: filing.reviewedBy || 'system',
            submittedBy: userId,
            workflow: 'PREPARED → APPROVED → SUBMITTED',
            oboContext: tenantId,
          },
        });

        res.json({
          status: 'submitted',
          submissionId,
          receiptId,
          message: `APD ${filing.period} successfully submitted to AADE`,
          receiptDownloadUrl: `/api/partners/documents/${receiptId}/download`,
          auditTrail: {
            prepared: { by: filing.createdBy, at: filing.createdAt },
            approved: {
              by: filing.reviewedBy || 'auto',
              at: filing.reviewedAt,
            },
            submitted: { by: userId, at: filing.submittedAt },
          },
        });
      } catch (error) {
        console.error('Error submitting APD filing:', error);
        res.status(500).json({ error: 'Failed to submit APD filing' });
      }
    }
  );

  // Inspector/Audit Pack Generation (Flow 7.3)
  app.post(
    '/api/partners/audit-pack/generate',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;
        const tenantId = (req.session as any).currentTenant;
        const partnerFirmId = (req.session as any).currentPartnerFirm;
        const { dateRange, contents, packType } = req.body;

        if (!tenantId) {
          return res.status(400).json({ error: 'No active tenant context' });
        }

        // Validate date range
        const { startDate, endDate } = parseDateRange(dateRange);
        if (!startDate || !endDate) {
          return res.status(400).json({ error: 'Invalid date range' });
        }

        // Generate pack ID
        const packId = `audit_pack_${tenantId}_${Date.now()}`;

        // Default contents for audit pack
        const defaultContents = [
          'ergani_events',
          'timecards',
          'apd_files',
          'aade_receipts',
          'payroll_registers',
          'audit_log',
        ];

        const selectedContents = contents || defaultContents;

        // Create background job for pack generation
        const job = {
          id: packId,
          type: 'audit_pack_generation',
          status: 'queued',
          tenantId,
          partnerFirmId,
          requestedBy: userId,
          requestedAt: new Date().toISOString(),
          parameters: {
            dateRange: { startDate, endDate },
            contents: selectedContents,
            packType: packType || 'standard',
          },
          progress: 0,
          estimatedCompletion: new Date(
            Date.now() + 5 * 60 * 1000
          ).toISOString(), // 5 minutes
        };

        // Store job (would use proper queue in production)
        if (!(req.session as any).jobs) {
          (req.session as any).jobs = {};
        }
        (req.session as any).jobs[packId] = job;

        // Log pack generation request
        await AuditService.logEvent({
          eventType: 'user_action',
          eventCategory: 'audit',
          eventAction: 'audit_pack_requested',
          tenantId,
          partnerFirmId,
          userId,
          eventData: {
            packId,
            dateRange: { startDate, endDate },
            contents: selectedContents,
            packType,
          },
        });

        // Start background processing (simulate with timeout)
        setTimeout(async () => {
          try {
            const jobRef = (req.session as any).jobs?.[packId];
            if (!jobRef) return;

            // Simulate pack generation progress
            jobRef.status = 'processing';
            jobRef.progress = 25;

            setTimeout(() => {
              jobRef.progress = 50;
              setTimeout(() => {
                jobRef.progress = 75;
                setTimeout(() => {
                  // Complete the pack
                  jobRef.status = 'completed';
                  jobRef.progress = 100;
                  jobRef.completedAt = new Date().toISOString();
                  jobRef.downloadUrl = `/api/partners/audit-pack/${packId}/download`;
                  jobRef.fileSize = '24.7 MB';
                  jobRef.checksum = `sha256:${Math.random().toString(36).substring(2, 15)}`;
                  jobRef.manifest = {
                    ergani_events: '156 records',
                    timecards: '1,847 entries',
                    apd_files: '3 submissions',
                    aade_receipts: '7 documents',
                    payroll_registers: '2 months',
                    audit_log: '2,341 events',
                  };

                  // Log completion
                  AuditService.logEvent({
                    eventType: 'system_action',
                    eventCategory: 'audit',
                    eventAction: 'audit_pack_generated',
                    tenantId,
                    partnerFirmId,
                    userId,
                    eventData: {
                      packId,
                      fileSize: jobRef.fileSize,
                      checksum: jobRef.checksum,
                      processingTime:
                        new Date().getTime() -
                        new Date(jobRef.requestedAt).getTime(),
                      manifest: jobRef.manifest,
                    },
                  });
                }, 1000);
              }, 1000);
            }, 1000);
          } catch (error) {
            console.error('Error in background pack generation:', error);
          }
        }, 1000);

        res.json({
          packId,
          status: 'queued',
          estimatedCompletion: job.estimatedCompletion,
          statusUrl: `/api/partners/audit-pack/${packId}/status`,
          contents: selectedContents,
          message: 'Audit pack generation started. Check status for progress.',
        });
      } catch (error) {
        console.error('Error generating audit pack:', error);
        res.status(500).json({ error: 'Failed to generate audit pack' });
      }
    }
  );

  // Get audit pack status
  app.get(
    '/api/partners/audit-pack/:packId/status',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { packId } = req.params;
        const job = (req.session as any).jobs?.[packId];

        if (!job) {
          return res.status(404).json({ error: 'Audit pack not found' });
        }

        res.json({
          packId,
          status: job.status,
          progress: job.progress,
          requestedAt: job.requestedAt,
          completedAt: job.completedAt,
          downloadUrl: job.downloadUrl,
          fileSize: job.fileSize,
          checksum: job.checksum,
          manifest: job.manifest,
          estimatedCompletion: job.estimatedCompletion,
        });
      } catch (error) {
        console.error('Error getting audit pack status:', error);
        res.status(500).json({ error: 'Failed to get audit pack status' });
      }
    }
  );

  // Download audit pack
  app.get(
    '/api/partners/audit-pack/:packId/download',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { packId } = req.params;
        const job = (req.session as any).jobs?.[packId];

        if (!job || job.status !== 'completed') {
          return res
            .status(404)
            .json({ error: 'Audit pack not ready or not found' });
        }

        // Mock ZIP file content
        const zipContent = `PK\x03\x04Mock Audit Pack ZIP file for ${packId}\nGenerated: ${job.completedAt}\nContents: ${Object.keys(job.manifest).join(', ')}`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="audit_pack_${job.tenantId}_${job.requestedAt.slice(0, 10)}.zip"`
        );
        res.setHeader('Content-Length', zipContent.length);
        res.setHeader('X-Checksum', job.checksum);

        res.send(zipContent);
      } catch (error) {
        console.error('Error downloading audit pack:', error);
        res.status(500).json({ error: 'Failed to download audit pack' });
      }
    }
  );

  // Get filings list
  app.get('/api/partners/filings', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = (req.session as any).currentTenant;
      const partnerFirmId = (req.session as any).currentPartnerFirm;

      if (!tenantId) {
        return res.status(400).json({ error: 'No active tenant context' });
      }

      const drafts = Object.values((req.session as any).drafts || {}).filter(
        (filing: any) => filing.tenantId === tenantId
      );

      res.json({ filings: drafts });
    } catch (error) {
      console.error('Error fetching filings:', error);
      res.status(500).json({ error: 'Failed to fetch filings' });
    }
  });
}

// Helper functions
async function validateAPDSubmission(params: {
  period: string;
  employeeData: any[];
  tenantId: string;
}): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: any;
}> {
  // Mock validation logic
  const errors = [];
  const warnings = [];

  // Min wage validation
  const minWage = 830; // Current Greek minimum wage
  const lowWageEmployees = params.employeeData.filter(
    emp => emp.grossSalary < minWage
  );
  if (lowWageEmployees.length > 0) {
    errors.push(
      `${lowWageEmployees.length} employees below minimum wage (€${minWage})`
    );
  }

  // Coverage validation
  if (params.employeeData.length === 0) {
    warnings.push('No employee data provided for this period');
  }

  // Contribution caps
  const maxContribution = 6000; // Example monthly cap
  const overCapEmployees = params.employeeData.filter(
    emp => emp.contributions > maxContribution
  );
  if (overCapEmployees.length > 0) {
    warnings.push(
      `${overCapEmployees.length} employees exceed contribution cap`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalEmployees: params.employeeData.length,
      totalGross: params.employeeData.reduce(
        (sum, emp) => sum + (emp.grossSalary || 0),
        0
      ),
      totalContributions: params.employeeData.reduce(
        (sum, emp) => sum + (emp.contributions || 0),
        0
      ),
    },
  };
}

function parseDateRange(
  dateRange: string | { startDate: string; endDate: string }
): { startDate: string; endDate: string } {
  if (typeof dateRange === 'object') {
    return dateRange;
  }

  // Handle preset ranges
  const now = new Date();
  switch (dateRange) {
    case 'current_month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0],
      };
    case 'last_3_months':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1)
          .toISOString()
          .split('T')[0],
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0],
      };
    case 'current_year':
      return {
        startDate: `${now.getFullYear()}-01-01`,
        endDate: `${now.getFullYear()}-12-31`,
      };
    default:
      // Try to parse as custom range
      const parts = dateRange.split(' to ');
      if (parts.length === 2) {
        return { startDate: parts[0], endDate: parts[1] };
      }
      return { startDate: '', endDate: '' };
  }
}
