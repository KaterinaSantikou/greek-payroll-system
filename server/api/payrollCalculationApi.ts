import { Router, type Request, type Response } from "express";
import { PayrollCalculationEngine, type PayrollCalculationContext } from "../services/PayrollCalculationEngine";
import { z } from "zod";

const router = Router();

// Validation schemas
const calculatePayrollSchema = z.object({
  employeeId: z.string().uuid(),
  contractId: z.string().uuid(),
  periodId: z.string(),
  propertyId: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  hoursWorked: z.array(z.object({
    date: z.string().datetime(),
    startTime: z.string(),
    endTime: z.string(),
    hours: z.number(),
    breakMinutes: z.number().optional(),
    shiftType: z.enum(['normal', 'night', 'sunday', 'holiday']).optional()
  }))
});

const stepAdvancementSchema = z.object({
  contractId: z.string().uuid(),
  eventType: z.enum(['hire', 'anniversary', 'promotion', 'manual']),
  effectiveDate: z.string().datetime(),
  processedBy: z.string().optional(),
  notes: z.string().optional()
});

/**
 * Calculate complete payroll for employee period
 * POST /api/payroll/calculate
 */
router.post("/calculate", async (req: Request, res: Response) => {
  try {
    const validatedData = calculatePayrollSchema.parse(req.body);
    
    const context: PayrollCalculationContext = {
      employeeId: validatedData.employeeId,
      contractId: validatedData.contractId,
      periodId: validatedData.periodId,
      propertyId: validatedData.propertyId,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      hoursWorked: validatedData.hoursWorked.map(h => ({
        ...h,
        date: new Date(h.date)
      }))
    };

    const result = await PayrollCalculationEngine.calculatePayroll(context);

    res.json({
      success: true,
      data: result,
      meta: {
        calculation_engine: "v2025.1",
        calculated_at: new Date().toISOString(),
        period: `${validatedData.startDate} to ${validatedData.endDate}`,
        compliance_checked: true
      }
    });

  } catch (error: any) {
    console.error("Error in payroll calculation:", error);
    res.status(400).json({
      success: false,
      error: "Payroll calculation failed",
      details: error.message,
      validation_errors: error.issues || []
    });
  }
});

/**
 * Process seniority step advancement
 * POST /api/payroll/advance-step
 */
router.post("/advance-step", async (req: Request, res: Response) => {
  try {
    const validatedData = stepAdvancementSchema.parse(req.body);

    const result = await PayrollCalculationEngine.processStepAdvancement(
      validatedData.contractId,
      validatedData.eventType,
      new Date(validatedData.effectiveDate),
      validatedData.processedBy,
      validatedData.notes
    );

    if (!result) {
      res.json({
        success: true,
        data: null,
        message: "No step advancement available (already at maximum or no wage increase)"
      });
      return;
    }

    res.json({
      success: true,
      data: result,
      meta: {
        advancement_processed: true,
        next_review_date: result.nextStepDate,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("Error in step advancement:", error);
    res.status(400).json({
      success: false,
      error: "Step advancement failed",
      details: error.message
    });
  }
});

/**
 * Get payroll breakdown preview (without saving)
 * POST /api/payroll/preview
 */
router.post("/preview", async (req: Request, res: Response) => {
  try {
    const validatedData = calculatePayrollSchema.parse(req.body);
    
    const context: PayrollCalculationContext = {
      employeeId: validatedData.employeeId,
      contractId: validatedData.contractId,
      periodId: "preview",
      propertyId: validatedData.propertyId,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      hoursWorked: validatedData.hoursWorked.map(h => ({
        ...h,
        date: new Date(h.date)
      }))
    };

    const result = await PayrollCalculationEngine.calculatePayroll(context);

    res.json({
      success: true,
      data: result,
      meta: {
        preview_mode: true,
        calculations_not_saved: true,
        calculated_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("Error in payroll preview:", error);
    res.status(400).json({
      success: false,
      error: "Payroll preview failed",
      details: error.message
    });
  }
});

/**
 * Get constraint violations for employee
 * GET /api/payroll/constraints/:employeeId
 */
router.get("/constraints/:employeeId", async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { propertyId } = req.query;

    // This would typically query the constraint violations table
    // For now, return a placeholder structure
    res.json({
      success: true,
      data: {
        violations: [],
        compliance_score: 100,
        last_check: new Date().toISOString()
      },
      meta: {
        employee_id: employeeId,
        property_id: propertyId
      }
    });

  } catch (error: any) {
    console.error("Error fetching constraint violations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch constraint violations"
    });
  }
});

export default router;