import { Router, type Request, type Response } from "express";
import { CbaPackService } from "../services/CbaPackService";
import { 
  getAllSectorPackDefinitions, 
  getSectorPackBySector 
} from "../services/SectorPackDefinitions";
import {
  insertCbaPackSchema,
  insertWageTableSchema,
  insertPremiumRuleSchema,
  insertAllowanceRuleSchema,
  insertSchedulingConstraintSchema,
  insertErganiProfileSchema,
  insertTipPolicySchema,
  insertPackAssignmentSchema
} from "../../shared/schema";
import { z } from "zod";

const router = Router();

/**
 * Get all available CBA packs
 * GET /api/cba-packs
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const packs = await CbaPackService.getAllPacks();
    res.json({
      success: true,
      data: packs,
      meta: {
        count: packs.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error("Error fetching CBA packs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch CBA packs",
      details: error.message
    });
  }
});

/**
 * Get CBA pack by ID
 * GET /api/cba-packs/:packId
 */
router.get("/:packId", async (req: Request, res: Response) => {
  try {
    const { packId } = req.params;
    const pack = await CbaPackService.getPackById(packId);
    
    if (!pack) {
      return res.status(404).json({
        success: false,
        error: "CBA pack not found"
      });
    }

    res.json({
      success: true,
      data: pack
    });
  } catch (error: any) {
    console.error("Error fetching CBA pack:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch CBA pack",
      details: error.message
    });
  }
});

/**
 * Get active CBA packs for a property
 * GET /api/cba-packs/property/:propertyId
 */
router.get("/property/:propertyId", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const packs = await CbaPackService.getActivePacksForProperty(propertyId);
    
    res.json({
      success: true,
      data: packs,
      meta: {
        count: packs.length,
        propertyId
      }
    });
  } catch (error: any) {
    console.error("Error fetching active packs for property:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch active packs for property",
      details: error.message
    });
  }
});

/**
 * Get all available sector pack definitions (predefined packs)
 * GET /api/cba-packs/sector-definitions
 */
router.get("/sector-definitions/all", async (req: Request, res: Response) => {
  try {
    const definitions = getAllSectorPackDefinitions();
    
    res.json({
      success: true,
      data: definitions,
      meta: {
        available_sectors: definitions.map(d => d.pack.sector),
        count: definitions.length
      }
    });
  } catch (error: any) {
    console.error("Error fetching sector pack definitions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sector pack definitions",
      details: error.message
    });
  }
});

/**
 * Install a predefined sector pack
 * POST /api/cba-packs/install-sector/:sector
 */
router.post("/install-sector/:sector", async (req: Request, res: Response) => {
  try {
    const { sector } = req.params;
    const sectorPackDef = getSectorPackBySector(sector);
    
    if (!sectorPackDef) {
      return res.status(404).json({
        success: false,
        error: `Sector pack definition not found for: ${sector}`,
        available_sectors: getAllSectorPackDefinitions().map(d => d.pack.sector)
      });
    }

    const installedPack = await CbaPackService.installSectorPack(sectorPackDef);
    
    res.status(201).json({
      success: true,
      message: `Successfully installed ${sector} CBA pack`,
      data: installedPack
    });
  } catch (error: any) {
    console.error("Error installing sector pack:", error);
    res.status(500).json({
      success: false,
      error: "Failed to install sector pack",
      details: error.message
    });
  }
});

/**
 * Assign a CBA pack to a property
 * POST /api/cba-packs/:packId/assign
 */
const assignPackSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  assignedBy: z.string().min(1, "Assigned by is required"),
  priority: z.number().min(0).default(0)
});

router.post("/:packId/assign", async (req: Request, res: Response) => {
  try {
    const { packId } = req.params;
    const validatedData = assignPackSchema.parse(req.body);

    // Validate pack assignment doesn't violate statutory floors
    const validation = await CbaPackService.validatePackAssignment(packId, validatedData.propertyId);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: "Pack assignment violates statutory requirements",
        violations: validation.violations
      });
    }

    const assignment = await CbaPackService.assignPackToProperty(
      packId,
      validatedData.propertyId,
      validatedData.assignedBy,
      validatedData.priority
    );

    res.status(201).json({
      success: true,
      message: "CBA pack successfully assigned to property",
      data: assignment
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }

    console.error("Error assigning pack to property:", error);
    res.status(500).json({
      success: false,
      error: "Failed to assign pack to property",
      details: error.message
    });
  }
});

/**
 * Calculate effective wage for an employee
 * POST /api/cba-packs/calculate-wage
 */
const calculateWageSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  category: z.string().min(1, "Category is required"),
  grade: z.string().min(1, "Grade is required"),
  seniorityStep: z.number().min(0).default(0)
});

router.post("/calculate-wage", async (req: Request, res: Response) => {
  try {
    const validatedData = calculateWageSchema.parse(req.body);

    const wageCalculation = await CbaPackService.calculateEffectiveWage(
      validatedData.propertyId,
      validatedData.category,
      validatedData.grade,
      validatedData.seniorityStep
    );

    res.json({
      success: true,
      data: wageCalculation,
      meta: {
        precedence_order: ["statutory", "sector_cba", "company_policy"],
        calculated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }

    console.error("Error calculating effective wage:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate effective wage",
      details: error.message
    });
  }
});

/**
 * Get applicable premium rules for a property
 * GET /api/cba-packs/property/:propertyId/premiums
 */
router.get("/property/:propertyId/premiums", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const premiums = await CbaPackService.getApplicablePremiums(propertyId);
    
    res.json({
      success: true,
      data: premiums,
      meta: {
        count: premiums.length,
        propertyId,
        sorted_by_priority: true
      }
    });
  } catch (error: any) {
    console.error("Error fetching applicable premiums:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch applicable premiums",
      details: error.message
    });
  }
});

/**
 * Get applicable allowance rules for a property
 * GET /api/cba-packs/property/:propertyId/allowances
 */
router.get("/property/:propertyId/allowances", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const allowances = await CbaPackService.getApplicableAllowances(propertyId);
    
    res.json({
      success: true,
      data: allowances,
      meta: {
        count: allowances.length,
        propertyId
      }
    });
  } catch (error: any) {
    console.error("Error fetching applicable allowances:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch applicable allowances",
      details: error.message
    });
  }
});

/**
 * Get scheduling constraints for a property
 * GET /api/cba-packs/property/:propertyId/constraints
 */
router.get("/property/:propertyId/constraints", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const constraints = await CbaPackService.getSchedulingConstraints(propertyId);
    
    res.json({
      success: true,
      data: constraints,
      meta: {
        count: constraints.length,
        propertyId
      }
    });
  } catch (error: any) {
    console.error("Error fetching scheduling constraints:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch scheduling constraints",
      details: error.message
    });
  }
});

/**
 * Get tip policies for F&B properties
 * GET /api/cba-packs/property/:propertyId/tip-policies
 */
router.get("/property/:propertyId/tip-policies", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const tipPolicies = await CbaPackService.getTipPolicies(propertyId);
    
    res.json({
      success: true,
      data: tipPolicies,
      meta: {
        count: tipPolicies.length,
        propertyId,
        fnb_only: true
      }
    });
  } catch (error: any) {
    console.error("Error fetching tip policies:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tip policies",
      details: error.message
    });
  }
});

/**
 * Publish a draft CBA pack
 * POST /api/cba-packs/:packId/publish
 */
router.post("/:packId/publish", async (req: Request, res: Response) => {
  try {
    const { packId } = req.params;
    const publishedPack = await CbaPackService.publishPack(packId);
    
    res.json({
      success: true,
      message: "CBA pack published successfully",
      data: publishedPack
    });
  } catch (error: any) {
    console.error("Error publishing CBA pack:", error);
    res.status(500).json({
      success: false,
      error: "Failed to publish CBA pack",
      details: error.message
    });
  }
});

/**
 * Validate pack assignment before applying
 * POST /api/cba-packs/:packId/validate-assignment
 */
const validateAssignmentSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required")
});

router.post("/:packId/validate-assignment", async (req: Request, res: Response) => {
  try {
    const { packId } = req.params;
    const validatedData = validateAssignmentSchema.parse(req.body);

    const validation = await CbaPackService.validatePackAssignment(packId, validatedData.propertyId);
    
    res.json({
      success: true,
      data: validation,
      meta: {
        packId,
        propertyId: validatedData.propertyId,
        validated_at: new Date().toISOString()
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors
      });
    }

    console.error("Error validating pack assignment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate pack assignment",
      details: error.message
    });
  }
});

export default router;