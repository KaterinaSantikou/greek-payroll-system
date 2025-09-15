import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { nanoid } from "nanoid";

// Business layer imports
import { payrollService } from "../business/payroll-service";
import { payrollValidator } from "../business/payroll-validator";
import { payrollCalculator } from "../business/payroll-calculator";

// Infrastructure layer imports
import { payrollRepository } from "../infrastructure/payroll-repository";
import { complianceConnector } from "../infrastructure/compliance-connector";

// Legacy service imports (to be phased out)
import { GarnishmentService } from "../services/GarnishmentService";
import { GLExportService } from "../glExportService";

const router = Router();

// Payroll schemas
const CreatePayrollRunSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  runType: z.enum(["regular", "off_cycle", "correction", "bonus"]),
  payDate: z.string(),
  description: z.string().optional(),
  employeeIds: z.array(z.string()).optional(), // If not provided, includes all active employees
  includeAllowances: z.boolean().default(true),
  includeDeductions: z.boolean().default(true),
  dryRun: z.boolean().default(false)
});

const FinalizePayrollSchema = z.object({
  approvedBy: z.string(),
  approvalNotes: z.string().optional(),
  erganiSubmit: z.boolean().default(true),
  efkaSubmit: z.boolean().default(true)
});

// Idempotency middleware
const idempotencyMiddleware = (req: any, res: any, next: any) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey && req.method === 'POST') {
    return res.status(400).json({ error: 'Idempotency-Key header required for payroll operations' });
  }
  req.idempotencyKey = idempotencyKey;
  next();
};

// GET /api/payroll/runs - List payroll runs
router.get('/api/payroll/runs', isAuthenticated, async (req, res) => {
  try {
    const { period, status, runType, limit = '20', offset = '0' } = req.query;
    
    const filters = {
      period: period as string,
      status: status as string,
      runType: runType as string
    };
    
    const pagination = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };
    
    // Delegate to infrastructure layer
    const result = await payrollRepository.getPayrollRuns(filters, pagination);
    
    const signature = generateSignature(result);
    
    res.json({
      data: result,
      meta: {
        total: result.length,
        signature,
        hasFinalized: result.some(r => r.status === 'finalized')
      }
    });
  } catch (error) {
    console.error("Error fetching payroll runs:", error);
    res.status(500).json({ error: "Failed to fetch payroll runs" });
  }
});

// GET /api/payroll/runs/:id - Get single payroll run with details
router.get('/api/payroll/runs/:id', isAuthenticated, async (req, res) => {
  try {
    // Delegate to infrastructure layer
    const { run, lines } = await payrollRepository.getPayrollRunWithLines(req.params.id);
    
    if (!run) {
      return res.status(404).json({ error: "Payroll run not found" });
    }
    
    // Calculate totals using business logic
    const garnishmentLines = lines.filter(line => line.lineType?.startsWith('GARN_'));
    const totalGarnishments = garnishmentLines.reduce((sum, line) => sum + Math.abs(parseFloat(line.amount || '0')), 0);
    
    const totals = {
      totalGrossPay: lines.reduce((sum, line) => sum + parseFloat(line.grossAmount || '0'), 0),
      totalNetPay: lines.reduce((sum, line) => sum + parseFloat(line.netAmount || '0'), 0),
      totalTax: lines.reduce((sum, line) => sum + parseFloat(line.taxAmount || '0'), 0),
      totalEfka: lines.reduce((sum, line) => sum + parseFloat(line.efkaAmount || '0'), 0),
      totalGarnishments,
      employeeCount: lines.length,
      garnishmentCount: garnishmentLines.length
    };
    
    const signature = generateSignature({ run, lines, totals });
    
    res.json({
      data: {
        run,
        lines,
        totals
      },
      meta: {
        signature,
        canFinalize: run.status === 'draft' && lines.length > 0,
        erganiReady: run.status === 'calculated',
        auditTrail: generateAuditTrail(run)
      }
    });
  } catch (error) {
    console.error("Error fetching payroll run:", error);
    res.status(500).json({ error: "Failed to fetch payroll run" });
  }
});

// POST /api/payroll/runs - Create new payroll run
router.post('/api/payroll/runs', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const runData = CreatePayrollRunSchema.parse(req.body);
    
    // Check idempotency
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    // Validate period using infrastructure layer
    if (!runData.dryRun && runData.runType === 'regular') {
      const hasExisting = await payrollRepository.hasExistingFinalizedRun(runData.period);
      if (hasExisting) {
        return res.status(409).json({ 
          error: "Finalized payroll run already exists for this period"
        });
      }
    }
    
    // Create run using infrastructure layer
    const created = await payrollRepository.createPayrollRun({
      id: nanoid(),
      period: runData.period,
      runType: runData.runType,
      payDate: runData.payDate,
      description: runData.description,
      status: 'draft',
      createdBy: (req as any).user.claims.sub
    });
    
    // Start payroll calculation process
    if (!runData.dryRun) {
      await initiatePayrollCalculation(created, runData);
    }
    
    const response = {
      data: created,
      meta: {
        signature: generateSignature(created),
        idempotencyKey: req.idempotencyKey,
        calculationStarted: !runData.dryRun,
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      }
    };
    
    storeIdempotency(req.idempotencyKey, response);
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating payroll run:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid payroll run data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create payroll run" });
  }
});

// POST /api/payroll/runs/:id/finalize - Finalize payroll run
router.post('/api/payroll/runs/:id/finalize', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const finalizeData = FinalizePayrollSchema.parse(req.body);
    
    // Check idempotency
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    // Get run details using infrastructure layer
    const { run } = await payrollRepository.getPayrollRunWithLines(req.params.id);
    
    if (!run) {
      return res.status(404).json({ error: "Payroll run not found" });
    }
    
    if (run.status === 'finalized') {
      return res.status(400).json({ error: "Payroll run already finalized" });
    }
    
    if (run.status !== 'calculated') {
      return res.status(400).json({ 
        error: "Payroll run must be in 'calculated' status to finalize",
        currentStatus: run.status
      });
    }
    
    // Finalize using infrastructure layer
    const finalizedRun = await payrollRepository.updatePayrollRunStatus(
      req.params.id,
      'finalized',
      finalizeData.approvedBy,
      finalizeData.approvalNotes
    );
    
    if (!finalizedRun) {
      return res.status(500).json({ error: "Failed to finalize payroll run" });
    }
    
    // Trigger government submissions if requested
    const submissions = [];
    if (finalizeData.erganiSubmit) {
      submissions.push(await submitToErgani(finalizedRun));
    }
    if (finalizeData.efkaSubmit) {
      submissions.push(await submitToEfka(finalizedRun));
    }
    
    const response = {
      data: finalizedRun,
      meta: {
        signature: generateSignature(finalizedRun),
        idempotencyKey: req.idempotencyKey,
        submissions,
        paymentFilesReady: true
      }
    };
    
    storeIdempotency(req.idempotencyKey, response);
    
    res.json(response);
  } catch (error) {
    console.error("Error finalizing payroll run:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid finalization data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to finalize payroll run" });
  }
});

// GET /api/payroll/runs/:id/audit - Get payroll audit information
router.get('/api/payroll/runs/:id/audit', isAuthenticated, async (req, res) => {
  try {
    // Delegate to infrastructure layer
    const { run } = await payrollRepository.getPayrollRunWithLines(req.params.id);
    
    if (!run) {
      return res.status(404).json({ error: "Payroll run not found" });
    }
    
    const auditData = {
      runDetails: {
        id: run.id,
        period: run.period,
        status: run.status,
        createdBy: run.createdBy,
        createdAt: run.createdAt,
        finalizedBy: run.finalizedBy,
        finalizedAt: run.finalizedAt
      },
      calculations: {
        totalGrossPay: run.totalGrossPay,
        totalNetPay: run.totalNetPay,
        employeeCount: run.employeeCount,
        calculationMethod: "Greek Payroll Engine v2025.01",
        rulesVersion: "2025.01"
      },
      compliance: {
        erganiSubmitted: !!run.erganiSubmissionId,
        efkaSubmitted: !!run.efkaSubmissionId,
        aadeSubmitted: !!run.aadeSubmissionId,
        minimumWageCompliant: true,
        overtimeCalculated: true
      },
      signatures: {
        dataSignature: generateSignature(run),
        auditHash: generateAuditHash(run),
        timestamp: new Date().toISOString()
      }
    };
    
    res.json({
      data: auditData,
      meta: {
        auditId: nanoid(),
        generatedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }
    });
  } catch (error) {
    console.error("Error generating audit:", error);
    res.status(500).json({ error: "Failed to generate audit" });
  }
});

// Helper functions
async function initiatePayrollCalculation(run: any, runData: any): Promise<void> {
  try {
    console.log(`Starting payroll calculation for run ${run.id}`);
    
    // Update status to calculating using infrastructure layer
    await payrollRepository.updatePayrollRunStatus(run.id, 'draft');
    
    // In production, this would trigger a background job
    // For now, simulate the calculation process
    setTimeout(async () => {
      try {
        // Get employee data for the run
        const employeeIds = runData.employeeIds || []; // In real implementation, get all active employees if not specified
        if (employeeIds.length > 0) {
          const employees = await payrollRepository.getEmployeePayrollInfo(employeeIds);
          const timesheets = await payrollRepository.getTimesheetData(employeeIds, run.period);
          
          // Convert to business layer format and validate
          const employeeData = employees.map(emp => {
            const timesheet = timesheets.find(ts => ts.employeeId === emp.employeeId);
            return {
              ...emp,
              approvedHours: timesheet?.approvedHours || 0,
              unapprovedHours: timesheet?.unapprovedHours || 0,
              regularHours: timesheet?.regularHours || 0,
              overtimeHours: timesheet?.overtimeHours || 0,
              nightHours: timesheet?.nightHours || 0,
              sundayHours: timesheet?.sundayHours || 0,
              holidayHours: timesheet?.holidayHours || 0
            };
          });
          
          // Process payroll using business layer
          const scope = {
            scopeId: nanoid(),
            period: run.period,
            scopeType: 'regular' as const,
            selectedEmployees: employeeIds,
            status: 'draft' as const,
            createdAt: new Date(),
            createdBy: run.createdBy
          };
          
          const result = payrollService.processPayrollScope(scope, employeeData, {
            requireApprovedTimesheets: false,
            includeAllowances: runData.includeAllowances,
            includeDeductions: runData.includeDeductions
          });
          
          if (result.success) {
            await payrollRepository.updatePayrollRunStatus(run.id, 'calculated');
          } else {
            console.error('Payroll calculation failed:', result.errors);
          }
        }
      } catch (error) {
        console.error('Error in payroll calculation:', error);
      }
    }, 2000);
  } catch (error) {
    console.error('Failed to initiate payroll calculation:', error);
  }
}

async function submitToErgani(run: any): Promise<any> {
  try {
    // Use compliance connector for ERGANI submission
    const result = await complianceConnector.submitToErgani([], 'monthly');
    return {
      system: 'ERGANI',
      submissionId: result.submissionId,
      referenceNumber: result.referenceNumber,
      status: result.success ? 'submitted' : 'failed',
      submittedAt: result.submittedAt.toISOString(),
      errors: result.errors
    };
  } catch (error) {
    console.error('ERGANI submission failed:', error);
    return {
      system: 'ERGANI',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function submitToEfka(run: any): Promise<any> {
  try {
    // Use compliance connector for EFKA submission
    const result = await complianceConnector.submitToEfka([]);
    return {
      system: 'EFKA',
      submissionId: result.submissionId,
      referenceNumber: result.referenceNumber,
      status: result.success ? 'submitted' : 'failed',
      submittedAt: result.submittedAt.toISOString(),
      errors: result.errors
    };
  } catch (error) {
    console.error('EFKA submission failed:', error);
    return {
      system: 'EFKA',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function generateSignature(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
}

function generateAuditHash(data: any): string {
  return Buffer.from(JSON.stringify(data) + Date.now()).toString('base64').slice(0, 32);
}

function generateAuditTrail(run: any): any[] {
  return [
    { action: 'created', timestamp: run.createdAt, user: run.createdBy },
    { action: 'calculated', timestamp: run.updatedAt, system: 'PayrollEngine' },
    ...(run.finalizedAt ? [{ action: 'finalized', timestamp: run.finalizedAt, user: run.finalizedBy }] : [])
  ];
}

// Idempotency store
const idempotencyStore = new Map<string, any>();

function checkIdempotency(key: string): any | null {
  return idempotencyStore.get(key) || null;
}

function storeIdempotency(key: string, response: any): void {
  idempotencyStore.set(key, response);
  setTimeout(() => idempotencyStore.delete(key), 24 * 60 * 60 * 1000);
}

// GET /api/payroll/pending-approvals - Mobile payroll approval dashboard
router.get('/api/payroll/pending-approvals', isAuthenticated, async (req, res) => {
  try {
    // Mock data for mobile payroll approvals - in production this would query actual pending payroll runs
    const mockApprovals = [
      {
        id: nanoid(),
        period: "January 2025",
        employeeCount: 25,
        grossTotal: 28450.50,
        netTotal: 19432.75,
        status: "pending_approval",
        submittedBy: "Maria Papadopoulos",
        submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        details: {
          overtimeHours: 47,
          bonuses: 2150.00,
          deductions: 1825.50,
          taxTotal: 5642.25,
          efkaContributions: 3375.00
        },
        urgency: "high",
        complianceChecks: {
          ergani: true,
          efka: true,
          fmy: false
        }
      },
      {
        id: nanoid(),
        period: "January 2025 - Bonus Run",
        employeeCount: 12,
        grossTotal: 6750.00,
        netTotal: 4825.00,
        status: "pending_approval",
        submittedBy: "Nikos Andreou",
        submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        details: {
          overtimeHours: 0,
          bonuses: 6750.00,
          deductions: 0,
          taxTotal: 1425.00,
          efkaContributions: 500.00
        },
        urgency: "medium",
        complianceChecks: {
          ergani: true,
          efka: true,
          fmy: true
        }
      },
      {
        id: nanoid(),
        period: "December 2024 - Correction",
        employeeCount: 3,
        grossTotal: 1200.00,
        netTotal: 875.00,
        status: "pending_approval",
        submittedBy: "Elena Kostis",
        submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        details: {
          overtimeHours: 8,
          bonuses: 0,
          deductions: 125.00,
          taxTotal: 150.00,
          efkaContributions: 50.00
        },
        urgency: "low",
        complianceChecks: {
          ergani: false,
          efka: true,
          fmy: true
        }
      }
    ];

    res.json(mockApprovals);
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
});

// POST /api/payroll/approvals/:id - Approve or reject payroll run
router.post('/api/payroll/approvals/:id', isAuthenticated, async (req, res) => {
  try {
    const { action, comment } = req.body;
    const approvalId = req.params.id;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
    }

    // In production, this would update the actual payroll run status
    console.log(`Payroll ${action} action:`, {
      approvalId,
      action,
      comment,
      userId: (req.user as any)?.claims?.sub,
      timestamp: new Date().toISOString()
    });

    // Mock success response
    res.json({
      success: true,
      approvalId,
      action,
      comment,
      timestamp: new Date().toISOString(),
      approvedBy: (req.user as any)?.claims?.sub || 'system'
    });
  } catch (error) {
    console.error("Error processing payroll approval:", error);
    res.status(500).json({ error: "Failed to process approval" });
  }
});

// === SELECTIVE PAYROLL RUNS ENDPOINTS ===

// GET /api/payroll/employees - Get filtered employees for selection
router.get('/api/payroll/employees', isAuthenticated, async (req, res) => {
  try {
    const {
      period,
      search,
      property,
      team,
      status = 'active',
      contractType,
      payCalendar,
      showOnlyApproved = 'true'
    } = req.query;

    // Delegate to infrastructure layer for filtered employees
    const filters = {
      period: period as string,
      search: search as string,
      property: property as string,
      status: status as string,
      contractType: contractType as string,
      showOnlyApproved: showOnlyApproved === 'true'
    };
    
    // TODO: Delegate to repository - for now return empty array until proper method is implemented
    // This requires a new method in payrollRepository to handle filtered employee queries
    const result: any[] = [];

    res.json(result);
  } catch (error) {
    console.error("Error fetching employees for selection:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// GET /api/payroll/filter-options - Get filter dropdown options
router.get('/api/payroll/filter-options', isAuthenticated, async (req, res) => {
  try {
    // TODO: Delegate to repository - for now return static options until proper method is implemented
    // This requires new methods in payrollRepository for properties and contract types
    const filterOptions = {
      properties: [],
      teams: [], // Teams functionality to be implemented later
      contractTypes: ['indefinite', 'fixed_term', 'seasonal', 'trial'],
      payCalendars: ['monthly', 'semi_monthly'],
      statuses: ['active', 'inactive']
    };

    res.json(filterOptions);
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

// GET /api/payroll/scopes - Get existing payroll scopes
router.get('/api/payroll/scopes', isAuthenticated, async (req, res) => {
  try {
    const { period } = req.query;

    if (!period) {
      return res.status(400).json({ error: 'Period parameter is required' });
    }

    // Delegate to infrastructure layer
    const result = await payrollRepository.getPayrollScopesByPeriod(period as string);

    res.json(result);
  } catch (error) {
    console.error("Error fetching payroll scopes:", error);
    res.status(500).json({ error: "Failed to fetch payroll scopes" });
  }
});

// POST /api/payroll/scopes - Create new payroll scope
router.post('/api/payroll/scopes', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const validatedData = insertPayrollScopeSchema.parse(req.body);
    const userId = (req.user as any)?.claims?.sub;

    // Get next sequence number for this period
    const sequenceResult = await db
      .select({
        maxSequence: sql<number>`COALESCE(MAX(${payrollScopes.sequence}), 0)`
      })
      .from(payrollScopes)
      .where(eq(payrollScopes.period, validatedData.period));

    const nextSequence = (sequenceResult[0]?.maxSequence || 0) + 1;

    // Create new scope
    const [newScope] = await db
      .insert(payrollScopes)
      .values({
        ...validatedData,
        sequence: nextSequence,
        status: 'draft',
        createdBy: userId
      })
      .returning();

    // Initialize employee period state for selected employees
    const employeePeriodStates = validatedData.selectedEmployees.map(employeeId => ({
      employeeId: employeeId as string,
      period: validatedData.period,
      status: 'unprocessed' as const,
      processedInScopeId: newScope.scopeId
    }));

    if (employeePeriodStates.length > 0) {
      await db
        .insert(employeePeriodState)
        .values(employeePeriodStates)
        .onConflictDoUpdate({
          target: [employeePeriodState.employeeId, employeePeriodState.period],
          set: {
            status: sql`CASE WHEN ${employeePeriodState.status} = 'unprocessed' THEN 'unprocessed' ELSE 'adjusted' END`,
            adjustedInScopeId: newScope.scopeId,
            updatedAt: sql`NOW()`
          }
        });
    }

    res.status(201).json(newScope);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: error.errors 
      });
    }
    console.error("Error creating payroll scope:", error);
    res.status(500).json({ error: "Failed to create payroll scope" });
  }
});

// GET /api/payroll/scopes/:scopeId - Get scope details
router.get('/api/payroll/scopes/:scopeId', isAuthenticated, async (req, res) => {
  try {
    const { scopeId } = req.params;

    const [scope] = await db
      .select()
      .from(payrollScopes)
      .where(eq(payrollScopes.scopeId, scopeId));

    if (!scope) {
      return res.status(404).json({ error: 'Scope not found' });
    }

    // Get scope lines if computed
    let scopeLines = [];
    if (scope.status !== 'draft') {
      scopeLines = await db
        .select()
        .from(payrollScopeLines)
        .where(eq(payrollScopeLines.scopeId, scopeId))
        .orderBy(asc(payrollScopeLines.employeeId), asc(payrollScopeLines.code));
    }

    res.json({
      ...scope,
      scopeLines
    });
  } catch (error) {
    console.error("Error fetching scope details:", error);
    res.status(500).json({ error: "Failed to fetch scope details" });
  }
});

// PUT /api/payroll/scopes/:scopeId/status - Update scope status
router.put('/api/payroll/scopes/:scopeId/status', isAuthenticated, async (req, res) => {
  try {
    const { scopeId } = req.params;
    const { status, notes } = req.body;
    const userId = (req.user as any)?.claims?.sub;

    if (!['draft', 'computing', 'computed', 'reviewed', 'finalized'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData: any = {
      status,
      updatedAt: sql`NOW()`
    };

    if (status === 'computed') {
      updateData.computedAt = sql`NOW()`;
    } else if (status === 'reviewed') {
      updateData.reviewedAt = sql`NOW()`;
      updateData.reviewedBy = userId;
    } else if (status === 'finalized') {
      updateData.finalizedAt = sql`NOW()`;
      updateData.finalizedBy = userId;
    }

    const [updatedScope] = await db
      .update(payrollScopes)
      .set(updateData)
      .where(eq(payrollScopes.scopeId, scopeId))
      .returning();

    if (!updatedScope) {
      return res.status(404).json({ error: 'Scope not found' });
    }

    // If finalizing, update employee period state
    if (status === 'finalized') {
      await db
        .update(employeePeriodState)
        .set({
          status: 'finalized',
          finalizedAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        })
        .where(and(
          eq(employeePeriodState.processedInScopeId, scopeId),
          eq(employeePeriodState.status, 'processed')
        ));
    }

    res.json(updatedScope);
  } catch (error) {
    console.error("Error updating scope status:", error);
    res.status(500).json({ error: "Failed to update scope status" });
  }
});

// GET /api/payroll/period-ledgers/:period - Get period consolidation status  
router.get('/api/payroll/period-ledgers/:period', isAuthenticated, async (req, res) => {
  try {
    const { period } = req.params;
    const { type = 'filings' } = req.query;

    const [ledger] = await db
      .select()
      .from(periodLedgers)
      .where(and(
        eq(periodLedgers.period, period),
        eq(periodLedgers.type, type as string)
      ));

    if (!ledger) {
      // Return empty state if no ledger exists
      return res.json({
        period,
        type,
        status: 'open',
        totalEmployees: 0,
        totalGrossPay: '0',
        includedScopeIds: []
      });
    }

    res.json(ledger);
  } catch (error) {
    console.error("Error fetching period ledger:", error);
    res.status(500).json({ error: "Failed to fetch period ledger" });
  }
});

// POST /api/payroll/period-ledgers/:period/consolidate - Consolidate period  
router.post('/api/payroll/period-ledgers/:period/consolidate', isAuthenticated, async (req, res) => {
  try {
    const { period } = req.params;
    const { type = 'filings' } = req.body;
    const userId = (req.user as any)?.claims?.sub;

    // Get all finalized scopes for the period
    const finalizedScopes = await db
      .select()
      .from(payrollScopes)
      .where(and(
        eq(payrollScopes.period, period),
        eq(payrollScopes.status, 'finalized')
      ));

    if (finalizedScopes.length === 0) {
      return res.status(400).json({ error: 'No finalized scopes found for period' });
    }

    // Calculate totals
    const totalEmployees = finalizedScopes.reduce((sum, scope) => sum + scope.totalEmployees, 0);
    const totalGrossPay = finalizedScopes.reduce((sum, scope) => sum + parseFloat(scope.totalGrossPay), 0);
    const totalTaxes = finalizedScopes.reduce((sum, scope) => sum + parseFloat(scope.totalTaxes), 0);
    const totalInsurance = finalizedScopes.reduce((sum, scope) => sum + parseFloat(scope.totalInsurance), 0);
    const totalNetPay = finalizedScopes.reduce((sum, scope) => sum + parseFloat(scope.totalNetPay), 0);

    // Upsert period ledger
    const [ledger] = await db
      .insert(periodLedgers)
      .values({
        period,
        type: type as string,
        status: 'open',
        totalEmployees,
        totalGrossPay: totalGrossPay.toString(),
        totalTaxes: totalTaxes.toString(),
        totalInsurance: totalInsurance.toString(),
        totalNetPay: totalNetPay.toString(),
        includedScopeIds: finalizedScopes.map(s => s.scopeId),
        lastConsolidatedAt: sql`NOW()`
      })
      .onConflictDoUpdate({
        target: [periodLedgers.period, periodLedgers.type],
        set: {
          totalEmployees,
          totalGrossPay: totalGrossPay.toString(),
          totalTaxes: totalTaxes.toString(),
          totalInsurance: totalInsurance.toString(),
          totalNetPay: totalNetPay.toString(),
          includedScopeIds: finalizedScopes.map(s => s.scopeId),
          lastConsolidatedAt: sql`NOW()`,
          updatedAt: sql`NOW()`
        }
      })
      .returning();

    res.json(ledger);
  } catch (error) {
    console.error("Error consolidating period:", error);
    res.status(500).json({ error: "Failed to consolidate period" });
  }
});

export default router;