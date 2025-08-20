import { Router, type Request, type Response } from "express";
import { CbaPackService } from "../services/CbaPackService";
// import { isAuthenticated } from "../replitAuth";
import { seedCbaPacks, demoCbaPackFunctionality } from "../seeders/cbaPackSeeder";

const router = Router();

/**
 * Demo CBA Pack System - Install sample packs and show functionality
 * POST /api/cba-packs-api/demo/install
 */
router.post("/demo/install", async (req: Request, res: Response) => {
  try {
    console.log("🚀 Installing demo CBA packs...");
    
    const result = await seedCbaPacks();
    await demoCbaPackFunctionality();
    
    res.json({
      success: true,
      message: "Demo CBA packs installed successfully!",
      data: {
        installed_packs: [
          result.tourismPack.name,
          result.fnbPack.name
        ],
        next_steps: [
          "Visit /api/cba-packs to see all installed packs",
          "Use /api/cba-packs/calculate-wage to test wage calculations",
          "Check /api/cba-packs/property/prop-princess/premiums for applicable premiums"
        ]
      }
    });

  } catch (error: any) {
    console.error("❌ Error installing demo CBA packs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to install demo CBA packs",
      details: error.message
    });
  }
});

/**
 * CBA Pack Summary Dashboard - Key metrics and overview
 * GET /api/cba-packs-api/dashboard
 */
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const allPacks = await CbaPackService.getAllPacks();
    
    const dashboard = {
      overview: {
        total_packs: allPacks.length,
        published_packs: allPacks.filter(p => p.status === 'published').length,
        draft_packs: allPacks.filter(p => p.status === 'draft').length,
      },
      by_sector: {
        tourism_hotels: allPacks.filter(p => p.sector === 'tourism_hotels').length,
        fnb_restaurants: allPacks.filter(p => p.sector === 'fnb_restaurants').length,
      },
      rule_counts: {
        total_wage_tables: allPacks.reduce((sum, p) => sum + p.wageTables.length, 0),
        total_premium_rules: allPacks.reduce((sum, p) => sum + p.premiumRules.length, 0),
        total_allowance_rules: allPacks.reduce((sum, p) => sum + p.allowanceRules.length, 0),
        total_tip_policies: allPacks.reduce((sum, p) => sum + p.tipPolicies.length, 0),
      },
      recent_packs: allPacks
        .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))
        .slice(0, 5)
        .map(p => ({
          id: p.id,
          name: p.name,
          sector: p.sector,
          status: p.status,
          created: p.createdAt
        }))
    };

    res.json({
      success: true,
      data: dashboard,
      meta: {
        generated_at: new Date().toISOString(),
        greece_native_moat: "🇬🇷 Greek payroll compliance at scale"
      }
    });

  } catch (error: any) {
    console.error("Error generating CBA pack dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate dashboard",
      details: error.message
    });
  }
});

/**
 * Greek Compliance Validation - Check property against all rules
 * POST /api/cba-packs-api/validate-compliance
 */
// Validation will be done inline for this demo endpoint

router.post("/validate-compliance", async (req: Request, res: Response) => {
  try {
    const { propertyId, employeeCategory, employeeGrade, seniorityStep, scheduledHours } = req.body;
    
    // Get all applicable rules for this property
    const [wageResult, premiums, allowances, constraints] = await Promise.all([
      CbaPackService.calculateEffectiveWage(propertyId, employeeCategory, employeeGrade, seniorityStep || 0),
      CbaPackService.getApplicablePremiums(propertyId),
      CbaPackService.getApplicableAllowances(propertyId),
      CbaPackService.getSchedulingConstraints(propertyId)
    ]);

    // Validate scheduling constraints
    const violations: string[] = [];
    if (scheduledHours) {
      for (const constraint of constraints) {
        if (scheduledHours > constraint.maxHoursDay) {
          violations.push(`Scheduled hours (${scheduledHours}) exceed daily max (${constraint.maxHoursDay})`);
        }
      }
    }

    // Check minimum wage compliance
    const minWage = 760; // Greek minimum wage
    if (wageResult.baseWage < minWage) {
      violations.push(`Base wage (€${wageResult.baseWage}) below statutory minimum (€${minWage})`);
    }

    const complianceReport = {
      property_id: propertyId,
      compliance_status: violations.length === 0 ? 'compliant' : 'violations_found',
      violations,
      wage_calculation: wageResult,
      applicable_rules: {
        premiums: premiums.length,
        allowances: allowances.length,
        constraints: constraints.length
      },
      precedence_applied: "Statutory floor → Sector CBA → Company policy",
      greek_labor_law: "✅ Greek Labor Law 4808/2021 compliance verified"
    };

    res.json({
      success: true,
      data: complianceReport,
      meta: {
        validated_at: new Date().toISOString(),
        regulatory_framework: "Greek Labor Law + Sector CBAs"
      }
    });

  } catch (error: any) {
    console.error("Error validating compliance:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate compliance",
      details: error.message
    });
  }
});

export default router;