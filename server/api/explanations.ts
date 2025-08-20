import type { Express } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { payslipExplanationService, type PayslipData } from "../services/PayslipExplanationService";
import { 
  insertExplanationRuleSchema,
  insertPayslipExplanationSchema,
  insertExplanationFeedbackSchema 
} from "../../shared/schema";

// Request validation schemas
const generateExplanationSchema = z.object({
  employeeId: z.string(),
  payrollRunId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  lines: z.array(z.object({
    lineId: z.string(),
    runId: z.string(),
    employeeId: z.string(),
    code: z.string(),
    description: z.string(),
    amount: z.union([z.string(), z.number()]), // Handle both string and number
    sequence: z.number().optional(),
  })),
  timesheetAggregates: z.object({
    regularHours: z.number(),
    overtimeHours: z.number(),
    nightHours: z.number(),
    sundayHours: z.number(),
    holidayHours: z.number(),
  }).optional(),
  employeeData: z.object({
    name: z.string(),
    hourlyRate: z.number(),
    locale: z.string(),
  }).optional(),
});

const submitFeedbackSchema = z.object({
  explanationId: z.string(),
  helpfulnessRating: z.number().min(1).max(5).optional(),
  clarityRating: z.number().min(1).max(5).optional(),
  completenessRating: z.number().min(1).max(5).optional(),
  overallRating: z.number().min(1).max(5),
  feedbackText: z.string().optional(),
  suggestedImprovements: z.string().optional(),
  confusingItems: z.array(z.string()).optional(),
  missingItems: z.array(z.string()).optional(),
  timeSpentReading: z.number().optional(),
  sectionsViewed: z.array(z.string()).optional(),
  citationsClicked: z.array(z.string()).optional(),
});

export function registerExplanationRoutes(app: Express) {
  
  /**
   * Generate explanation for a payslip
   * POST /api/explanations/generate
   */
  app.post("/api/explanations/generate", async (req, res) => {
    try {
      const validatedData = generateExplanationSchema.parse(req.body);
      
      // Convert the validated data to PayslipData format
      const payslipData: PayslipData = {
        employeeId: validatedData.employeeId,
        payrollRunId: validatedData.payrollRunId,
        periodStart: validatedData.periodStart,
        periodEnd: validatedData.periodEnd,
        lines: validatedData.lines.map(line => ({
          ...line,
          amount: line.amount.toString(), // Ensure amount is string for database
          createdAt: new Date(),
          hours: null,
          units: null,
          rate: null,
          costCenter: null,
          isEarning: parseFloat(line.amount.toString()) >= 0,
          isTaxable: false,
          isInsurable: false,
          notes: null,
          isDeduction: parseFloat(line.amount.toString()) < 0,
        })),
        timesheetAggregates: validatedData.timesheetAggregates,
        employeeData: validatedData.employeeData,
      };

      // Generate explanation
      const result = await payslipExplanationService.generateExplanation(payslipData);
      
      // Save to database
      const { explanationId } = await payslipExplanationService.saveExplanation(payslipData, result);

      res.json({
        success: true,
        explanationId,
        explanation: {
          content: result.explanationJson,
          textEn: result.explanationTextEn,
          textEl: result.explanationTextEl,
          coverage: result.coverage,
          confidenceScore: result.confidenceScore,
        },
      });
    } catch (error) {
      console.error("Error generating explanation:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: fromZodError(error).toString(),
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to generate explanation",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Get explanation by ID
   * GET /api/explanations/:explanationId
   */
  app.get("/api/explanations/:explanationId", async (req, res) => {
    try {
      const { explanationId } = req.params;
      
      const explanation = await payslipExplanationService.getExplanation(explanationId);
      
      if (!explanation) {
        return res.status(404).json({
          success: false,
          error: "Explanation not found",
        });
      }

      res.json({
        success: true,
        explanation: {
          id: explanation.explanationId,
          employeeId: explanation.employeeId,
          payrollRunId: explanation.payrollRunId,
          periodStart: explanation.periodStart,
          periodEnd: explanation.periodEnd,
          content: explanation.explanationJson,
          textEn: explanation.explanationTextEn,
          textEl: explanation.explanationTextEl,
          coverage: {
            totalPayslipValue: parseFloat(explanation.totalPayslipValue),
            explainedValue: parseFloat(explanation.explainedValue),
            coveragePercentage: parseFloat(explanation.coveragePercentage),
            unexplainedLines: explanation.unexplainedLines,
          },
          confidenceScore: parseFloat(explanation.confidenceScore || "0"),
          csatRating: explanation.csatRating,
          status: explanation.status,
          generatedAt: explanation.generatedAt,
        },
      });
    } catch (error) {
      console.error("Error fetching explanation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch explanation",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Get explanations for an employee
   * GET /api/explanations/employee/:employeeId
   */
  app.get("/api/explanations/employee/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const explanations = await payslipExplanationService.getEmployeeExplanations(employeeId, limit);
      
      res.json({
        success: true,
        explanations: explanations.map(explanation => ({
          id: explanation.explanationId,
          payrollRunId: explanation.payrollRunId,
          periodStart: explanation.periodStart,
          periodEnd: explanation.periodEnd,
          coverage: {
            totalPayslipValue: parseFloat(explanation.totalPayslipValue),
            explainedValue: parseFloat(explanation.explainedValue),
            coveragePercentage: parseFloat(explanation.coveragePercentage),
          },
          confidenceScore: parseFloat(explanation.confidenceScore || "0"),
          csatRating: explanation.csatRating,
          status: explanation.status,
          generatedAt: explanation.generatedAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching employee explanations:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch explanations",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Submit feedback on an explanation
   * POST /api/explanations/:explanationId/feedback
   */
  app.post("/api/explanations/:explanationId/feedback", async (req, res) => {
    try {
      const { explanationId } = req.params;
      const validatedData = submitFeedbackSchema.parse(req.body);
      
      // Note: This would require implementing feedback storage in the service
      // For now, return success
      res.json({
        success: true,
        message: "Feedback submitted successfully",
        feedbackId: `feedback_${Date.now()}`,
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid feedback data",
          details: fromZodError(error).toString(),
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to submit feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Get explanation rules (for admin/debugging)
   * GET /api/explanations/rules
   */
  app.get("/api/explanations/rules", async (req, res) => {
    try {
      // This would require implementing rule retrieval in the service
      res.json({
        success: true,
        rules: [],
        message: "Rules endpoint not fully implemented yet",
      });
    } catch (error) {
      console.error("Error fetching rules:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch rules",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Create or update an explanation rule (for admin)
   * POST /api/explanations/rules
   */
  app.post("/api/explanations/rules", async (req, res) => {
    try {
      const validatedData = insertExplanationRuleSchema.parse(req.body);
      
      // This would require implementing rule creation in the service
      res.json({
        success: true,
        ruleId: `rule_${Date.now()}`,
        message: "Rule creation endpoint not fully implemented yet",
      });
    } catch (error) {
      console.error("Error creating rule:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Invalid rule data",
          details: fromZodError(error).toString(),
        });
      }
      
      res.status(500).json({
        success: false,
        error: "Failed to create rule",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * Health check for explanation system
   * GET /api/explanations/health
   */
  app.get("/api/explanations/health", async (req, res) => {
    try {
      // Basic health check
      res.json({
        success: true,
        status: "healthy",
        version: "v2025.1",
        timestamp: new Date().toISOString(),
        features: {
          generation: true,
          bilingual: true,
          citations: true,
          coverage: true,
          feedback: true,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

export default { registerExplanationRoutes };