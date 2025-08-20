import { Router, type Request, type Response } from "express";
import { CBAGovernanceService } from "../services/CBAGovernanceService";
import { z } from "zod";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// Validation schemas
const ingestDocumentSchema = z.object({
  documentName: z.string().min(1),
  effectiveDate: z.string().datetime(),
  sector: z.enum(['tourism', 'fnb']),
  sourceType: z.enum(['pdf_upload', 'manual_entry', 'api_import']),
  rawContent: z.object({
    pdfText: z.string().optional(),
    manualData: z.any().optional(),
    apiPayload: z.any().optional()
  }).optional(),
  extractedRules: z.object({
    wageTable: z.array(z.object({
      category: z.string(),
      grade: z.string(),
      step: z.number(),
      monthlyWage: z.number()
    })),
    allowances: z.array(z.object({
      code: z.string(),
      name: z.string(),
      amount: z.number().optional(),
      percentage: z.number().optional(),
      calculation: z.string(),
      taxTreatment: z.string()
    })),
    premiums: z.array(z.object({
      code: z.string(),
      name: z.string(),
      rate: z.number(),
      timeConditions: z.string().optional(),
      stackable: z.boolean()
    })),
    constraints: z.array(z.object({
      type: z.string(),
      value: z.number(),
      unit: z.string(),
      description: z.string()
    }))
  })
});

const generateDiffSchema = z.object({
  currentVersionId: z.string(),
  newRules: z.any(),
  propertyIds: z.array(z.string())
});

const createRolloutSchema = z.object({
  cbaVersionId: z.string(),
  targetProperties: z.array(z.string()),
  rolloutConfig: z.object({
    pilotProperties: z.array(z.string()).optional(),
    rolloutStartDate: z.string().datetime(),
    phaseGapDays: z.number().int().min(1).max(30)
  })
});

/**
 * Ingest new CBA document (admin/legal only)
 * POST /api/cba-governance/ingest
 */
router.post("/ingest", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const validatedData = ingestDocumentSchema.parse(req.body);
    
    // Get user role (mock - would fetch from database)
    const userRole = 'admin'; // user.role || 'employee';

    const result = await CBAGovernanceService.ingestCBADocument(
      validatedData,
      user.claims.sub,
      userRole
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error
      });
      return;
    }

    res.json({
      success: true,
      data: {
        documentId: result.documentId,
        validationResults: result.validationResults
      },
      meta: {
        ingested_at: new Date().toISOString(),
        ingested_by: user.claims.sub,
        requires_admin_approval: !result.validationResults?.valid
      }
    });

  } catch (error: any) {
    console.error("Error in CBA document ingestion:", error);
    res.status(400).json({
      success: false,
      error: "Document ingestion failed",
      details: error.message,
      validation_errors: error.issues || []
    });
  }
});

/**
 * Generate sandbox diff for new version
 * POST /api/cba-governance/diff
 */
router.post("/diff", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = generateDiffSchema.parse(req.body);

    const diff = await CBAGovernanceService.generateSandboxDiff(
      validatedData.currentVersionId,
      validatedData.newRules,
      validatedData.propertyIds
    );

    res.json({
      success: true,
      data: diff,
      meta: {
        generated_at: new Date().toISOString(),
        sandbox_mode: true,
        impact_summary: {
          total_affected_employees: diff.totalImpact.totalAffectedEmployees,
          monthly_cost_delta: `€${diff.totalImpact.totalMonthlyCostDelta.toLocaleString()}`,
          annual_cost_delta: `€${diff.totalImpact.totalAnnualCostDelta.toLocaleString()}`
        }
      }
    });

  } catch (error: any) {
    console.error("Error generating CBA diff:", error);
    res.status(400).json({
      success: false,
      error: "Diff generation failed",
      details: error.message
    });
  }
});

/**
 * Create rollout strategy with impact report
 * POST /api/cba-governance/rollout
 */
router.post("/rollout", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = createRolloutSchema.parse(req.body);

    const strategy = await CBAGovernanceService.createRolloutStrategy(
      validatedData.cbaVersionId,
      validatedData.targetProperties,
      validatedData.rolloutConfig
    );

    res.json({
      success: true,
      data: strategy,
      meta: {
        strategy_created: new Date().toISOString(),
        phases: strategy.phases.length,
        estimated_completion: strategy.phases[strategy.phases.length - 1]?.plannedStartDate
      }
    });

  } catch (error: any) {
    console.error("Error creating rollout strategy:", error);
    res.status(400).json({
      success: false,
      error: "Rollout strategy creation failed",
      details: error.message
    });
  }
});

/**
 * Execute rollout phase
 * POST /api/cba-governance/rollout/:strategyId/phase/:phaseNumber
 */
router.post("/rollout/:strategyId/phase/:phaseNumber", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { strategyId, phaseNumber } = req.params;

    const result = await CBAGovernanceService.executeRolloutPhase(
      strategyId,
      parseInt(phaseNumber)
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
        phase_status: result.phaseStatus
      });
      return;
    }

    res.json({
      success: true,
      data: {
        phase_status: result.phaseStatus,
        validation_results: result.validationResults
      },
      meta: {
        executed_at: new Date().toISOString(),
        strategy_id: strategyId,
        phase_number: phaseNumber
      }
    });

  } catch (error: any) {
    console.error("Error executing rollout phase:", error);
    res.status(500).json({
      success: false,
      error: "Rollout phase execution failed",
      details: error.message
    });
  }
});

/**
 * Get impact report for version/properties
 * GET /api/cba-governance/impact-report/:versionId
 */
router.get("/impact-report/:versionId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;
    const { properties } = req.query;
    
    const propertyIds = typeof properties === 'string' 
      ? properties.split(',')
      : ['prop-princess']; // default

    const impactReport = await CBAGovernanceService.generateImpactReport(
      versionId,
      propertyIds
    );

    res.json({
      success: true,
      data: impactReport,
      meta: {
        version_id: versionId,
        properties_analyzed: propertyIds.length,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("Error generating impact report:", error);
    res.status(500).json({
      success: false,
      error: "Impact report generation failed",
      details: error.message
    });
  }
});

/**
 * Get governance dashboard data
 * GET /api/cba-governance/dashboard
 */
router.get("/dashboard", isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Mock dashboard data
    const dashboardData = {
      pending_ingestions: [
        {
          documentId: "CBA-2025-001",
          documentName: "Tourism Hotels CBA 2025 Update",
          uploadedBy: "legal@company.com",
          uploadedAt: "2025-01-15T10:30:00Z",
          status: "pending_validation",
          sector: "tourism"
        }
      ],
      active_rollouts: [
        {
          strategyId: "ROLLOUT-1234567890",
          cbaVersionId: "tourism-v2025.2",
          currentPhase: "pilot",
          progress: 60,
          targetProperties: 3,
          completedProperties: 1
        }
      ],
      version_history: [
        {
          versionId: "tourism-v2025.1",
          effectiveDate: "2025-01-01",
          status: "active",
          propertiesUsing: 5
        },
        {
          versionId: "tourism-v2024.3",
          effectiveDate: "2024-09-01", 
          status: "deprecated",
          propertiesUsing: 0
        }
      ],
      compliance_status: {
        compliant_properties: 5,
        total_properties: 5,
        last_audit: "2025-01-10T00:00:00Z"
      }
    };

    res.json({
      success: true,
      data: dashboardData,
      meta: {
        dashboard_refreshed: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("Error fetching governance dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Dashboard data fetch failed"
    });
  }
});

export default router;