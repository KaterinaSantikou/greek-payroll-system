import type { Express } from "express";
import { GarnishmentService } from "../services/GarnishmentService";
import { isAuthenticated } from "../replitAuth";
import { 
  garnishmentCalculationInputsSchema,
  type InsertGarnishmentOrder,
  type GarnishmentCalculationInputs 
} from "../../shared/schema";
import { z } from "zod";

// Calc hook input schema
const calcHookInputSchema = z.object({
  employeeId: z.string(),
  runContext: z.object({
    period: z.string(),
    runType: z.string()
  }),
  preTax: z.number(),
  taxes: z.number(),
  contribs: z.number(),
  netBeforeGarnishments: z.number(),
  activeGarnishments: z.array(z.any()).optional()
});

/**
 * Garnishment & Court Orders API Endpoints
 * 
 * Handles CRUD operations for garnishment orders and integration
 * with payroll calculation engine for automatic deductions.
 */

export function registerGarnishmentRoutes(app: Express) {
  
  /**
   * GET /api/garnishments/:employeeId
   * Get all garnishment orders for an employee
   */
  app.get('/api/garnishments/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const garnishments = await GarnishmentService.getActiveGarnishments(employeeId);
      
      res.json({
        success: true,
        data: garnishments
      });
    } catch (error) {
      console.error('Error fetching garnishments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch garnishments'
      });
    }
  });
  
  /**
   * POST /api/garnishments
   * Create a new garnishment order
   */
  app.post('/api/garnishments', isAuthenticated, async (req, res) => {
    try {
      const orderData: InsertGarnishmentOrder = req.body;
      
      // Add creator information
      orderData.createdBy = (req.user as any)?.claims?.sub || 'system';
      
      // Validate the order data
      const validation = GarnishmentService.validateGarnishmentOrder(orderData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }
      
      const garnishmentOrder = await GarnishmentService.createGarnishmentOrder(orderData);
      
      res.json({
        success: true,
        data: garnishmentOrder,
        message: 'Garnishment order created successfully'
      });
    } catch (error) {
      console.error('Error creating garnishment order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create garnishment order'
      });
    }
  });
  
  /**
   * PUT /api/garnishments/:id
   * Update a garnishment order
   */
  app.put('/api/garnishments/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates: Partial<InsertGarnishmentOrder> = req.body;
      
      const updatedOrder = await GarnishmentService.updateGarnishmentOrder(id, updates);
      
      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          error: 'Garnishment order not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedOrder,
        message: 'Garnishment order updated successfully'
      });
    } catch (error) {
      console.error('Error updating garnishment order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update garnishment order'
      });
    }
  });
  
  /**
   * GET /api/garnishments/:employeeId/transactions
   * Get garnishment transaction history for an employee
   */
  app.get('/api/garnishments/:employeeId/transactions', isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const transactions = await GarnishmentService.getGarnishmentTransactions(employeeId, limit);
      
      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Error fetching garnishment transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch garnishment transactions'
      });
    }
  });
  
  /**
   * POST /api/garnishments/calc-hook
   * Calc Hook (Engine Internal) - Main payroll integration endpoint
   * 
   * Input: employee_id, run_context (period, run_type), pre_tax, taxes, contribs, net_before_garnishments.
   * Output: garnishment_lines[], net_after_garnishments.
   */
  app.post('/api/garnishments/calc-hook', isAuthenticated, async (req, res) => {
    try {
      const input = calcHookInputSchema.parse(req.body);
      
      const result = await GarnishmentService.calculateGarnishments(input);
      
      res.json({
        success: true,
        data: result,
        message: 'Garnishment calculation completed'
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid input',
          details: error.errors
        });
      }
      
      console.error('Garnishment calc hook error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to calculate garnishments' 
      });
    }
  });
  
  /**
   * POST /api/garnishments/calculate
   * Legacy calculate endpoint (for backward compatibility)
   */
  app.post('/api/garnishments/calculate', isAuthenticated, async (req, res) => {
    try {
      const { employeeId, grossPay, disposableIncome, netPayBeforeGarnishments, payPeriodStart, payPeriodEnd } = req.body;
      
      if (!employeeId || grossPay === undefined || disposableIncome === undefined || netPayBeforeGarnishments === undefined) {
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: employeeId, grossPay, disposableIncome, netPayBeforeGarnishments' 
        });
      }
      
      // Convert legacy format to new calc hook format
      const calcInput = {
        employeeId,
        runContext: {
          period: payPeriodStart && payPeriodEnd ? `${payPeriodStart} to ${payPeriodEnd}` : 'current',
          runType: 'regular'
        },
        preTax: Number(grossPay),
        taxes: Number(grossPay) - Number(disposableIncome), // Approximate
        contribs: 0, // Not provided in legacy format
        netBeforeGarnishments: Number(netPayBeforeGarnishments)
      };
      
      const result = await GarnishmentService.calculateGarnishments(calcInput);
      
      // Convert new format back to legacy format
      const totalGarnishmentAmount = result.garnishmentLines.reduce((sum, line) => sum + line.amount, 0);
      
      res.json({
        success: true,
        data: {
          totalGarnishmentAmount,
          netPayAfterGarnishments: result.netAfterGarnishments,
          garnishmentDetails: result.garnishmentLines.map(line => ({
            garnishmentId: line.orderRef,
            orderNumber: line.orderRef,
            creditorName: line.creditor,
            calculatedAmount: line.amount,
            deductedAmount: line.amount,
            carriedForwardAmount: 0,
            protectedAmount: 0,
            calculationMethod: line.description,
            glAccount: line.glAccount
          })),
          protectionSummary: {
            totalProtectedAmount: 0,
            netPayFloorApplied: false,
            carriedForwardTotal: 0
          },
          calculationLog: result.calculationLog
        },
        message: 'Garnishment calculation completed'
      });
      
    } catch (error) {
      console.error('Legacy garnishment calculation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to calculate garnishments' 
      });
    }
  });
  
  /**
   * POST /api/garnishments/process-payroll
   * Process garnishments for a payroll run and create transactions
   */
  app.post('/api/garnishments/process-payroll', isAuthenticated, async (req, res) => {
    try {
      const {
        employeeId,
        payrollRunId,
        calculationResult,
        payPeriodStart,
        payPeriodEnd,
        grossPay,
        disposableIncome,
        netPayBefore
      } = req.body;
      
      // Validate required fields
      if (!employeeId || !payrollRunId || !calculationResult) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: employeeId, payrollRunId, calculationResult'
        });
      }
      
      const transactions = await GarnishmentService.processGarnishmentTransactions(
        employeeId,
        payrollRunId,
        calculationResult,
        payPeriodStart,
        payPeriodEnd,
        grossPay,
        disposableIncome,
        netPayBefore
      );
      
      // Generate GL entries for the transactions
      const glEntries = GarnishmentService.generateGLEntries(transactions);
      
      res.json({
        success: true,
        data: {
          transactions,
          glEntries
        },
        message: `Processed ${transactions.length} garnishment transactions`
      });
    } catch (error) {
      console.error('Error processing garnishment payroll:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process garnishment payroll'
      });
    }
  });
  
  /**
   * GET /api/garnishments/order/:id
   * Get a specific garnishment order by ID
   */
  app.get('/api/garnishments/order/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const garnishmentOrder = await GarnishmentService.getGarnishmentOrder(id);
      
      if (!garnishmentOrder) {
        return res.status(404).json({
          success: false,
          error: 'Garnishment order not found'
        });
      }
      
      res.json({
        success: true,
        data: garnishmentOrder
      });
    } catch (error) {
      console.error('Error fetching garnishment order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch garnishment order'
      });
    }
  });
  
  /**
   * POST /api/garnishments/validate
   * Validate garnishment order data without saving
   */
  app.post('/api/garnishments/validate', isAuthenticated, async (req, res) => {
    try {
      const orderData: InsertGarnishmentOrder = req.body;
      const validation = GarnishmentService.validateGarnishmentOrder(orderData);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating garnishment order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate garnishment order'
      });
    }
  });
  
  /**
   * POST /api/garnishments/:id/suspend
   * Suspend a garnishment order
   */
  app.post('/api/garnishments/:id/suspend', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const updatedOrder = await GarnishmentService.updateGarnishmentOrder(id, {
        status: 'suspended',
        notes: reason ? `Suspended: ${reason}` : 'Suspended'
      });
      
      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          error: 'Garnishment order not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedOrder,
        message: 'Garnishment order suspended'
      });
    } catch (error) {
      console.error('Error suspending garnishment order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to suspend garnishment order'
      });
    }
  });
  
  /**
   * POST /api/garnishments/:id/reactivate
   * Reactivate a suspended garnishment order
   */
  app.post('/api/garnishments/:id/reactivate', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const updatedOrder = await GarnishmentService.updateGarnishmentOrder(id, {
        status: 'active'
      });
      
      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          error: 'Garnishment order not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedOrder,
        message: 'Garnishment order reactivated'
      });
    } catch (error) {
      console.error('Error reactivating garnishment order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reactivate garnishment order'
      });
    }
  });
  
  /**
   * POST /api/garnishments/gl-entries
   * Generate GL journal entries for garnishment lines
   */
  app.post('/api/garnishments/gl-entries', isAuthenticated, async (req, res) => {
    try {
      const { garnishmentLines, employeeId, property, department } = req.body;
      
      if (!garnishmentLines || !employeeId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: garnishmentLines, employeeId'
        });
      }
      
      const glEntries = GarnishmentService.generateGLEntries(
        garnishmentLines,
        employeeId,
        property,
        department
      );
      
      res.json({ 
        success: true,
        data: { glEntries },
        message: 'GL entries generated successfully'
      });
      
    } catch (error) {
      console.error('GL entries generation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to generate GL entries' 
      });
    }
  });
  
  /**
   * POST /api/garnishments/reverse/:payrollRunId/:employeeId
   * Handle payroll run reversal - restore collected_ytd and reopen balance
   */
  app.post('/api/garnishments/reverse/:payrollRunId/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const { payrollRunId, employeeId } = req.params;
      
      await GarnishmentService.reversePayrollRun(payrollRunId, employeeId);
      
      res.json({ 
        success: true,
        data: {
          message: 'Payroll run reversed successfully',
          payrollRunId,
          employeeId
        }
      });
      
    } catch (error) {
      console.error('Payroll reversal error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to reverse payroll run' 
      });
    }
  });
  
  /**
   * GET /api/garnishments/demo
   * Demo endpoint showcasing the calculation engine with sample data
   */
  app.get('/api/garnishments/demo', async (req, res) => {
    try {
      // Sample payroll scenario for demo
      const demoInput = {
        employeeId: 'EMP-DEMO',
        runContext: {
          period: '2025-01-15 to 2025-01-31',
          runType: 'regular'
        },
        preTax: 3500.00,
        taxes: 650.00,
        contribs: 525.00,
        netBeforeGarnishments: 2325.00,
        activeGarnishments: [
          {
            id: 'demo-001',
            type: 'wage_garnishment',
            creditorName: 'ABC Collections',
            creditorIban: '2200-GARN-WAGE',
            orderRef: 'WG-2025-001',
            priority: 1,
            method: 'percent_of_disposable_net',
            percent: '25',
            maxPercentCap: '50',
            protectedNetFloor: 600,
            totalBalance: 5000,
            createdAt: new Date('2025-01-15T10:00:00Z')
          },
          {
            id: 'demo-002',
            type: 'child_support',
            creditorName: 'Family Support Division',
            creditorIban: '2200-GARN-CHILD',
            orderRef: 'CS-2025-002',
            priority: 2,
            method: 'fixed_amount',
            amount: '400',
            protectedNetFloor: 600,
            totalBalance: 8000,
            createdAt: new Date('2025-01-16T14:30:00Z')
          }
        ]
      };
      
      // Run calculation
      const result = await GarnishmentService.calculateGarnishments(demoInput);
      
      // Generate GL entries
      const glEntries = GarnishmentService.generateGLEntries(
        result.garnishmentLines,
        demoInput.employeeId,
        'HOTEL-PRINCESS',
        'FRONT-DESK'
      );
      
      res.json({
        success: true,
        demo: {
          description: 'Garnishment Calculation Engine Demo',
          input: demoInput,
          result: {
            ...result,
            totalDeducted: result.garnishmentLines.reduce((sum, line) => sum + line.amount, 0)
          },
          glEntries,
          summary: {
            grossPay: demoInput.preTax,
            taxes: demoInput.taxes,
            contributions: demoInput.contribs,
            disposableNet: demoInput.netBeforeGarnishments,
            totalGarnishments: result.garnishmentLines.reduce((sum, line) => sum + line.amount, 0),
            netAfterGarnishments: result.netAfterGarnishments,
            payslipLines: result.garnishmentLines.length,
            glEntries: glEntries.length
          }
        }
      });
      
    } catch (error) {
      console.error('Demo calculation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run demo calculation'
      });
    }
  });
}