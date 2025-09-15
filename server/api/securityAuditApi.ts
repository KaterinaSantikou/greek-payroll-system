import express from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CalcProvenanceService } from '../services/CalcProvenanceService';
import { MakerCheckerService } from '../services/MakerCheckerService';
import { DocumentTrailService } from '../services/DocumentTrailService';

const router = express.Router();

// =============================================================================
// CALCULATION PROVENANCE ENDPOINTS
// =============================================================================

/**
 * POST /generate-provenance
 * Generate immutable provenance record for a payroll calculation
 */
router.post('/generate-provenance', async (req, res) => {
  try {
    const schema = z.object({
      payslipId: z.string(),
      inputs: z.object({
        employeeId: z.string(),
        packId: z.string(),
        packVersion: z.string(),
        hoursWorked: z.array(
          z.object({
            date: z.string().transform(str => new Date(str)),
            startTime: z.string(),
            endTime: z.string(),
            hours: z.number(),
            shiftType: z.string().optional(),
          })
        ),
        baseWage: z.number(),
        allowances: z.record(z.any()),
        premiums: z.record(z.any()),
        deductions: z.record(z.any()),
        calculationParams: z.record(z.any()),
      }),
      outputs: z.object({
        basePay: z.number(),
        allowances: z.array(
          z.object({
            code: z.string(),
            amount: z.number(),
            description: z.string(),
          })
        ),
        premiums: z.array(
          z.object({
            code: z.string(),
            hours: z.number().optional(),
            rate: z.number().optional(),
            amount: z.number(),
            description: z.string(),
          })
        ),
        deductions: z.array(
          z.object({
            code: z.string(),
            amount: z.number(),
            description: z.string(),
          })
        ),
        totalGrossPay: z.number(),
        netPay: z.number(),
        auditTrail: z.array(z.string()),
      }),
    });

    const { payslipId, inputs, outputs } = schema.parse(req.body);

    const provenanceId = await CalcProvenanceService.generateProvenance(
      payslipId,
      inputs,
      outputs
    );

    res.json({
      success: true,
      data: {
        provenanceId,
        message: 'Calculation provenance generated successfully',
      },
    });
  } catch (error: any) {
    console.error('Error generating provenance:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate calculation provenance',
    });
  }
});

/**
 * GET /verify-provenance/:provenanceId
 * Verify integrity of a calculation record
 */
router.get('/verify-provenance/:provenanceId', async (req, res) => {
  try {
    const { provenanceId } = req.params;

    const verification =
      await CalcProvenanceService.verifyProvenance(provenanceId);

    res.json({
      success: true,
      data: verification,
    });
  } catch (error: any) {
    console.error('Error verifying provenance:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to verify calculation provenance',
    });
  }
});

/**
 * GET /employee-calculation-history/:employeeId
 * Get calculation history for an employee
 */
router.get('/employee-calculation-history/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await CalcProvenanceService.getEmployeeCalculationHistory(
      employeeId,
      limit
    );

    res.json({
      success: true,
      data: {
        employeeId,
        calculations: history,
        totalRecords: history.length,
      },
    });
  } catch (error: any) {
    console.error('Error getting calculation history:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to retrieve calculation history',
    });
  }
});

// =============================================================================
// MAKER-CHECKER WORKFLOW ENDPOINTS
// =============================================================================

/**
 * POST /create-approval-request
 * Create a new maker-checker approval request
 */
router.post('/create-approval-request', async (req, res) => {
  try {
    const schema = z.object({
      requestType: z.enum([
        'pack_change',
        'version_publish',
        'rollout_execute',
      ]),
      requestId: z.string(),
      requestData: z.any(),
      makerUserId: z.string(),
      makerRole: z.enum(['payroll_admin', 'hr_manager', 'legal']),
      requiredApprovers: z.array(z.enum(['legal', 'payroll_admin'])),
    });

    const parsedRequest = schema.parse(req.body);

    const approvalId = await MakerCheckerService.createApprovalRequest({
      ...parsedRequest,
      requestData: parsedRequest.requestData || {},
    });

    res.json({
      success: true,
      data: {
        approvalId,
        message: 'Approval request created - awaiting approvals',
      },
    });
  } catch (error: any) {
    console.error('Error creating approval request:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create approval request',
    });
  }
});

/**
 * POST /process-approval/:approvalId
 * Process an approval or rejection
 */
router.post('/process-approval/:approvalId', async (req, res) => {
  try {
    const { approvalId } = req.params;

    const schema = z.object({
      checkerUserId: z.string(),
      checkerRole: z.enum(['legal', 'payroll_admin']),
      action: z.enum(['approve', 'reject']),
      reason: z.string(),
    });

    const action = schema.parse(req.body);

    const result = await MakerCheckerService.processApproval(
      approvalId,
      action
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error processing approval:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process approval',
    });
  }
});

/**
 * GET /pending-approvals/:userRole
 * Get pending approvals for a user role
 */
router.get('/pending-approvals/:userRole', async (req, res) => {
  try {
    const userRole = req.params.userRole as 'legal' | 'payroll_admin';

    if (!['legal', 'payroll_admin'].includes(userRole)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user role. Must be 'legal' or 'payroll_admin'",
      });
    }

    const pendingApprovals =
      await MakerCheckerService.getPendingApprovals(userRole);

    res.json({
      success: true,
      data: {
        userRole,
        pendingApprovals,
        count: pendingApprovals.length,
      },
    });
  } catch (error: any) {
    console.error('Error getting pending approvals:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to retrieve pending approvals',
    });
  }
});

/**
 * GET /approval-history
 * Get approval history for audit purposes
 */
router.get('/approval-history', async (req, res) => {
  try {
    const requestId = req.query.requestId as string;
    const dateFrom = req.query.dateFrom
      ? new Date(req.query.dateFrom as string)
      : undefined;
    const dateTo = req.query.dateTo
      ? new Date(req.query.dateTo as string)
      : undefined;

    const history = await MakerCheckerService.getApprovalHistory(
      requestId,
      dateFrom,
      dateTo
    );

    res.json({
      success: true,
      data: {
        history,
        filters: { requestId, dateFrom, dateTo },
        totalRecords: history.length,
      },
    });
  } catch (error: any) {
    console.error('Error getting approval history:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to retrieve approval history',
    });
  }
});

/**
 * GET /request-status/:requestId
 * Check if a request has been approved
 */
router.get('/request-status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const status = await MakerCheckerService.isRequestApproved(requestId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Error checking request status:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to check request status',
    });
  }
});

// =============================================================================
// DOCUMENT TRAIL ENDPOINTS
// =============================================================================

/**
 * POST /upload-document
 * Upload and store a document with cryptographic verification
 */
router.post('/upload-document', async (req, res) => {
  try {
    // In production, would use multer or similar for file uploads
    // For now, expecting base64 encoded file in request body

    const schema = z.object({
      packId: z.string(),
      packVersion: z.string(),
      documentType: z.enum([
        'cba_pdf',
        'encoding_diff',
        'impact_report',
        'legal_opinion',
      ]),
      fileName: z.string(),
      fileData: z.string(), // base64 encoded
      mimeType: z.string(),
      uploadedBy: z.string(),
      metadata: z.any().optional(),
    });

    const upload = schema.parse(req.body);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(upload.fileData, 'base64');

    const documentId = await DocumentTrailService.uploadDocument({
      ...upload,
      fileBuffer,
    });

    res.json({
      success: true,
      data: {
        documentId,
        message: 'Document uploaded and secured successfully',
      },
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload document',
    });
  }
});

/**
 * POST /generate-encoding-diff
 * Generate and store encoding diff between CBA pack versions
 */
router.post('/generate-encoding-diff', async (req, res) => {
  try {
    const schema = z.object({
      packId: z.string(),
      fromVersion: z.string(),
      toVersion: z.string(),
      changes: z.array(
        z.object({
          changeType: z.enum(['add', 'modify', 'delete']),
          section: z.string(),
          field: z.string(),
          oldValue: z.any().optional(),
          newValue: z.any().optional(),
          reason: z.string(),
        })
      ),
      impactAnalysis: z.object({
        affectedEmployees: z.number(),
        costDelta: z.number(),
        effectiveDate: z.string().transform(str => new Date(str)),
        riskLevel: z.enum(['low', 'medium', 'high']),
      }),
      generatedBy: z.string(),
    });

    const diff = schema.parse(req.body);

    const documentId = await DocumentTrailService.generateEncodingDiff(diff);

    res.json({
      success: true,
      data: {
        documentId,
        message: 'Encoding diff generated and stored successfully',
      },
    });
  } catch (error: any) {
    console.error('Error generating encoding diff:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate encoding diff',
    });
  }
});

/**
 * GET /verify-document/:documentId
 * Verify document integrity
 */
router.get('/verify-document/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    const verification = await DocumentTrailService.verifyDocument(documentId);

    res.json({
      success: true,
      data: verification,
    });
  } catch (error: any) {
    console.error('Error verifying document:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to verify document',
    });
  }
});

/**
 * GET /pack-documents/:packId
 * Get document history for a CBA pack
 */
router.get('/pack-documents/:packId', async (req, res) => {
  try {
    const { packId } = req.params;
    const documentType = req.query.type as string;

    const history = await DocumentTrailService.getPackDocumentHistory(
      packId,
      documentType
    );

    res.json({
      success: true,
      data: {
        packId,
        documentType: documentType || 'all',
        documents: history,
        totalDocuments: history.length,
      },
    });
  } catch (error: any) {
    console.error('Error getting pack documents:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to retrieve pack documents',
    });
  }
});

/**
 * GET /encoding-diff/:packId/:fromVersion/:toVersion
 * Get encoding diff between two versions
 */
router.get(
  '/encoding-diff/:packId/:fromVersion/:toVersion',
  async (req, res) => {
    try {
      const { packId, fromVersion, toVersion } = req.params;

      const diff = await DocumentTrailService.getEncodingDiff(
        packId,
        fromVersion,
        toVersion
      );

      res.json({
        success: true,
        data: {
          packId,
          fromVersion,
          toVersion,
          ...diff,
        },
      });
    } catch (error: any) {
      console.error('Error getting encoding diff:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to retrieve encoding diff',
      });
    }
  }
);

/**
 * GET /compliance-summary
 * Get compliance summary for audit reporting
 */
router.get('/compliance-summary', async (req, res) => {
  try {
    const summary = await DocumentTrailService.getComplianceSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('Error getting compliance summary:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to generate compliance summary',
    });
  }
});

export default router;
