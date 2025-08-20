import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { SeveranceFinalPayService } from "../services/SeveranceFinalPayService";
import { ErganiTerminationService } from "../services/ErganiTerminationService";
import { MakerCheckerService } from "../services/MakerCheckerService";
import { isAuthenticated } from "../replitAuth";

const router = express.Router();

// =============================================================================
// SEVERANCE CALCULATION ENDPOINTS
// =============================================================================

/**
 * POST /calculate-severance
 * Calculate severance and final pay (preview mode)
 */
router.post("/calculate-severance", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      employeeId: z.string(),
      contractId: z.string(),
      terminationType: z.enum(['dismissal', 'resignation', 'expiry', 'mutual_agreement']),
      terminationCause: z.string().optional(),
      effectiveDate: z.string().transform(str => new Date(str)),
      noticeDate: z.string().transform(str => new Date(str)).optional(),
      yearsOfService: z.number().min(0),
      lastMonthlyWage: z.number().min(0),
      unusedLeaveDays: z.number().min(0),
      pendingAllowances: z.record(z.number()).default({}),
      pendingTips: z.number().default(0)
    });

    const inputs = schema.parse(req.body);

    // Calculate severance and final pay
    const calculationOutputs = await SeveranceFinalPayService.calculateSeveranceFinalPay(inputs);

    res.json({
      success: true,
      calculation: calculationOutputs,
      preview: true
    });

  } catch (error) {
    console.error('Error calculating severance:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? 
        'Invalid input data' : 
        'Failed to calculate severance'
    });
  }
});

/**
 * POST /process-termination
 * Process complete termination with severance calculation
 */
router.post("/process-termination", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      employeeId: z.string(),
      contractId: z.string(),
      terminationType: z.enum(['dismissal', 'resignation', 'expiry', 'mutual_agreement']),
      terminationCause: z.string().optional(),
      effectiveDate: z.string().transform(str => new Date(str)),
      noticeDate: z.string().transform(str => new Date(str)).optional(),
      yearsOfService: z.number().min(0),
      lastMonthlyWage: z.number().min(0),
      unusedLeaveDays: z.number().min(0),
      pendingAllowances: z.record(z.number()).default({}),
      pendingTips: z.number().default(0),
      requireApproval: z.boolean().default(true)
    });

    const inputs = schema.parse(req.body);
    const user = req.user as any;

    // For high-value severance, require maker-checker approval
    const previewCalculation = await SeveranceFinalPayService.calculateSeveranceFinalPay(inputs);
    
    if (inputs.requireApproval && previewCalculation.grossTotal > 10000) { // €10k threshold
      // Create approval request for high-value severance
      const approvalId = await MakerCheckerService.createApprovalRequest({
        requestType: 'severance_execute',
        requestId: `severance-${inputs.employeeId}-${Date.now()}`,
        requestData: {
          ...inputs,
          previewCalculation
        },
        makerUserId: user.id || 'unknown-user',
        makerRole: 'hr_manager',
        requiredApprovers: ['legal', 'payroll_admin']
      });

      res.json({
        success: true,
        status: 'pending_approval',
        approvalId,
        message: 'High-value severance requires legal and payroll admin approval',
        previewCalculation
      });

    } else {
      // Process termination directly
      const result = await SeveranceFinalPayService.processTermination(inputs);

      res.json({
        success: true,
        status: 'completed',
        terminationRecord: result.terminationRecord,
        severanceCalculation: result.severanceCalculation,
        calculationOutputs: result.calculationOutputs
      });
    }

  } catch (error) {
    console.error('Error processing termination:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? 
        'Invalid input data' : 
        'Failed to process termination'
    });
  }
});

/**
 * GET /terminations/:employeeId
 * Get termination history for an employee
 */
router.get("/terminations/:employeeId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.employeeId;
    
    const terminations = await SeveranceFinalPayService.getEmployeeTerminations(employeeId);

    res.json({
      success: true,
      terminations
    });

  } catch (error) {
    console.error('Error fetching terminations:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch termination history'
    });
  }
});

/**
 * GET /calculation/:calculationId
 * Get severance calculation details
 */
router.get("/calculation/:calculationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const calculationId = req.params.calculationId;
    
    const [calculation, finalPayLines] = await Promise.all([
      SeveranceFinalPayService.getSeveranceCalculation(calculationId),
      SeveranceFinalPayService.getFinalPayLines(calculationId)
    ]);

    if (!calculation) {
      return res.status(404).json({
        success: false,
        error: 'Severance calculation not found'
      });
    }

    res.json({
      success: true,
      calculation,
      finalPayLines
    });

  } catch (error) {
    console.error('Error fetching calculation:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch severance calculation'
    });
  }
});

// =============================================================================
// ERGANI II & DOCUMENT GENERATION ENDPOINTS
// =============================================================================

/**
 * POST /generate-ergani-payload/:terminationId
 * Generate ERGANI II termination XML payload
 */
router.post("/generate-ergani-payload/:terminationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const terminationId = req.params.terminationId;
    
    const schema = z.object({
      employeeData: z.object({
        companyVat: z.string(),
        amka: z.string(),
        afm: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        fullName: z.string()
      })
    });

    const { employeeData } = schema.parse(req.body);

    // Get termination record
    const terminations = await SeveranceFinalPayService.getEmployeeTerminations(employeeData.amka);
    const terminationRecord = terminations.find(t => t.id === terminationId);

    if (!terminationRecord) {
      return res.status(404).json({
        success: false,
        error: 'Termination record not found'
      });
    }

    // Generate ERGANI payload
    const erganiPayload = await ErganiTerminationService.generateErganiTerminationPayload(
      terminationRecord,
      employeeData
    );

    res.json({
      success: true,
      erganiPayload
    });

  } catch (error) {
    console.error('Error generating ERGANI payload:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to generate ERGANI II payload'
    });
  }
});

/**
 * POST /generate-termination-letter/:terminationId
 * Generate termination letter (dismissal/resignation/expiry)
 */
router.post("/generate-termination-letter/:terminationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const terminationId = req.params.terminationId;
    
    const schema = z.object({
      employeeData: z.object({
        amka: z.string(),
        fullName: z.string()
      }),
      includeSeveranceDetails: z.boolean().default(true)
    });

    const { employeeData, includeSeveranceDetails } = schema.parse(req.body);

    // Get termination record
    const terminations = await SeveranceFinalPayService.getEmployeeTerminations(employeeData.amka);
    const terminationRecord = terminations.find(t => t.id === terminationId);

    if (!terminationRecord) {
      return res.status(404).json({
        success: false,
        error: 'Termination record not found'
      });
    }

    // Get severance calculation if needed
    let severanceCalculation = null;
    if (includeSeveranceDetails && terminationRecord.severanceEligible) {
      severanceCalculation = await SeveranceFinalPayService.getSeveranceCalculation(
        terminationRecord.id
      );
    }

    // Generate appropriate letter based on termination type
    let letter;
    switch (terminationRecord.terminationType) {
      case 'dismissal':
        letter = ErganiTerminationService.generateDismissalLetter(
          terminationRecord,
          employeeData,
          severanceCalculation || undefined
        );
        break;
      case 'resignation':
        letter = ErganiTerminationService.generateResignationLetter(
          terminationRecord,
          employeeData
        );
        break;
      case 'expiry':
        letter = ErganiTerminationService.generateExpiryLetter(
          terminationRecord,
          employeeData
        );
        break;
      default:
        throw new Error(`Unsupported termination type: ${terminationRecord.terminationType}`);
    }

    res.json({
      success: true,
      letter,
      terminationType: terminationRecord.terminationType
    });

  } catch (error) {
    console.error('Error generating termination letter:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to generate termination letter'
    });
  }
});

/**
 * GET /validation/termination-rules
 * Get termination validation rules and legal requirements
 */
router.get("/validation/termination-rules", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const rules = {
      noticePeriods: {
        dismissal: {
          under1Year: 0,
          oneToFiveYears: 30, // days
          fiveToTenYears: 60,
          overTenYears: 90
        },
        resignation: {
          employees: 30,
          executives: 90
        }
      },
      severanceRules: {
        minimumService: 2, // years
        tiers: [
          { minYears: 2, maxYears: 5, monthsPerYear: 2 },
          { minYears: 5, maxYears: 10, monthsPerYear: 3 },
          { minYears: 10, maxYears: 999, monthsPerYear: 4 }
        ],
        exemptCauses: [
          'SERIOUS_MISCONDUCT',
          'CRIMINAL_ACTIVITY',
          'BREACH_OF_TRUST',
          'ABANDONMENT'
        ]
      },
      legalBases: {
        dismissal: 'Ν. 4093/2012 άρθρο 1',
        resignation: 'Ν. 4093/2012 άρθρο 2',
        expiry: 'Ν. 4093/2012 άρθρο 5',
        mutual_agreement: 'Ν. 4093/2012 άρθρο 6'
      },
      erganiEventCodes: {
        dismissal: 'TERM_DISMISSAL',
        resignation: 'TERM_RESIGNATION',
        expiry: 'TERM_CONTRACT_EXPIRY',
        mutual_agreement: 'TERM_MUTUAL_AGREEMENT'
      }
    };

    res.json({
      success: true,
      rules
    });

  } catch (error) {
    console.error('Error fetching validation rules:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch termination rules'
    });
  }
});

export default router;