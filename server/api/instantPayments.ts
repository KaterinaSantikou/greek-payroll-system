import type { Express, Request, Response } from "express";
import { SepaInstantPaymentService } from "../sepaInstantPaymentService";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

// Validation schemas
const processInstantPayrollSchema = z.object({
  payrollRunId: z.string().min(1),
  forceInstant: z.boolean().optional(),
  maxInstantAmount: z.number().min(1).max(100000).optional(),
  fallbackEnabled: z.boolean().optional(),
  urgencyLevel: z.enum(['URGENT', 'CORRECTION', 'OFF_CYCLE', 'REGULAR']).optional()
});

const processPain002Schema = z.object({
  statusXml: z.string().min(1),
  messageId: z.string().min(1)
});

const processCamt054Schema = z.object({
  camtXml: z.string().min(1),
  reconciliationId: z.string().min(1)
});

/**
 * SEPA Instant Payment API Routes
 * 
 * Provides endpoints for instant payroll processing with SCT Inst priority,
 * auto-fallback to regular SCT, and real-time reconciliation.
 */
export function registerInstantPaymentRoutes(app: Express): void {
  const service = new SepaInstantPaymentService();

  /**
   * Process instant payroll with SCT Inst priority
   */
  app.post("/api/instant-payments/process", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = processInstantPayrollSchema.parse(req.body);
      
      console.log(`🚀 Processing instant payroll request:`, {
        payrollRunId: validatedData.payrollRunId,
        urgencyLevel: validatedData.urgencyLevel || 'REGULAR'
      });

      const result = await service.processInstantPayroll(
        validatedData.payrollRunId,
        {
          forceInstant: validatedData.forceInstant,
          maxInstantAmount: validatedData.maxInstantAmount,
          fallbackEnabled: validatedData.fallbackEnabled,
          urgencyLevel: validatedData.urgencyLevel
        }
      );

      res.json({
        success: true,
        message: 'Instant payroll processing completed',
        data: result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error processing instant payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process instant payroll',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Get instant payment capabilities for current bank setup
   */
  app.get("/api/instant-payments/capabilities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const capabilities = await service.getInstantPaymentCapabilities();

      res.json({
        success: true,
        data: capabilities,
        recommendations: this.generateCapabilityRecommendations(capabilities),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error fetching instant payment capabilities:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch instant payment capabilities',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Process pain.002 status report for real-time reconciliation
   */
  app.post("/api/instant-payments/pain002", async (req: Request, res: Response) => {
    try {
      const validatedData = processPain002Schema.parse(req.body);

      console.log(`📊 Processing pain.002 status report for message: ${validatedData.messageId}`);

      const result = await service.processPain002StatusReport(validatedData.statusXml);

      res.json({
        success: true,
        message: 'pain.002 status report processed',
        data: result,
        messageId: validatedData.messageId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error processing pain.002:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process pain.002 status report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Process camt.054 credit notification for final reconciliation
   */
  app.post("/api/instant-payments/camt054", async (req: Request, res: Response) => {
    try {
      const validatedData = processCamt054Schema.parse(req.body);

      console.log(`💰 Processing camt.054 notification for reconciliation: ${validatedData.reconciliationId}`);

      const result = await service.processCamt054Notification(validatedData.camtXml);

      res.json({
        success: true,
        message: 'camt.054 credit notification processed',
        data: result,
        reconciliationId: validatedData.reconciliationId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error processing camt.054:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process camt.054 notification',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get EU 2025 compliance status for instant payments
   */
  app.get("/api/instant-payments/compliance-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const phase1Deadline = new Date('2025-01-09');
      const phase2Deadline = new Date('2025-10-09');

      const complianceStatus = {
        currentDate: now.toISOString(),
        phase1Status: {
          deadline: phase1Deadline.toISOString(),
          description: 'PSPs must be reachable for SCT Inst',
          isCompliant: now > phase1Deadline,
          daysRemaining: Math.max(0, Math.ceil((phase1Deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        },
        phase2Status: {
          deadline: phase2Deadline.toISOString(),
          description: 'All payment service providers must support SCT Inst',
          isCompliant: now > phase2Deadline,
          daysRemaining: Math.max(0, Math.ceil((phase2Deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        },
        readinessScore: this.calculateReadinessScore(now, phase1Deadline, phase2Deadline),
        recommendations: this.generateComplianceRecommendations(now, phase1Deadline, phase2Deadline)
      };

      res.json({
        success: true,
        data: complianceStatus,
        timestamp: now.toISOString()
      });

    } catch (error) {
      console.error('❌ Error fetching compliance status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch compliance status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Simulate instant payment for testing (development only)
   */
  if (process.env.NODE_ENV === 'development') {
    app.post("/api/instant-payments/simulate", isAuthenticated, async (req: Request, res: Response) => {
      try {
        const { amount, employeeName, iban, urgencyLevel = 'URGENT' } = req.body;

        const simulationResult = {
          paymentId: `SIM-${Date.now()}`,
          amount: parseFloat(amount),
          employeeName,
          iban,
          urgencyLevel,
          processingTime: '8.4 seconds',
          status: 'COMPLETED',
          method: 'SCT_INST',
          fee: 0.50,
          reconciliation: {
            pain002Status: 'ACCP',
            camt054Received: true,
            settlementTime: '2025-01-19T21:23:45.123Z'
          }
        };

        console.log(`🧪 Simulated instant payment:`, simulationResult);

        res.json({
          success: true,
          message: 'Instant payment simulated successfully',
          data: simulationResult,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid simulation parameters',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // Helper methods for recommendations
  function generateCapabilityRecommendations(capabilities: any): string[] {
    const recommendations: string[] = [];

    if (!capabilities.instantSupported) {
      recommendations.push("Consider upgrading to banks that support SEPA Instant transfers");
    }

    if (capabilities.supportedBanks.length < 3) {
      recommendations.push("Diversify banking relationships to increase instant payment coverage");
    }

    if (capabilities.complianceStatus !== '2025_COMPLIANT') {
      recommendations.push("Prepare for EU 2025 instant payment requirements");
    }

    recommendations.push("Use instant payments for urgent corrections and off-cycle payroll");
    recommendations.push("Monitor pain.002 status reports for real-time payment tracking");

    return recommendations;
  }

  function calculateReadinessScore(now: Date, phase1: Date, phase2: Date): number {
    if (now > phase2) return 100; // Fully compliant
    if (now > phase1) return 75;  // Phase 1 compliant
    
    const totalTime = phase2.getTime() - new Date('2024-01-01').getTime();
    const elapsedTime = now.getTime() - new Date('2024-01-01').getTime();
    return Math.min(50, Math.floor((elapsedTime / totalTime) * 50));
  }

  function generateComplianceRecommendations(now: Date, phase1: Date, phase2: Date): string[] {
    const recommendations: string[] = [];

    if (now < phase1) {
      recommendations.push("Urgently implement SCT Inst connectivity before January 9, 2025");
      recommendations.push("Test instant payment processing with major Greek banks");
    } else if (now < phase2) {
      recommendations.push("Ensure all banking partners support SCT Inst by October 9, 2025");
      recommendations.push("Optimize instant payment workflows for all payroll scenarios");
    } else {
      recommendations.push("Maintain compliance monitoring for regulatory updates");
      recommendations.push("Leverage instant payments for competitive advantage");
    }

    recommendations.push("Implement pain.002/camt.054 real-time reconciliation");
    recommendations.push("Train payroll teams on instant payment procedures");

    return recommendations;
  }
}