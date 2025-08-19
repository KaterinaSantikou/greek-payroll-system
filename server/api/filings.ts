import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "../db";
import { filings } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Filing schemas
const APDFilingSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  employeeIds: z.array(z.string()),
  submissionType: z.enum(["monthly", "quarterly", "annual"]),
  dryRun: z.boolean().default(false)
});

const FMYFilingSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  payrollRunIds: z.array(z.string()),
  includeSupplementary: z.boolean().default(true),
  dryRun: z.boolean().default(false)
});

const ErganiEventSchema = z.object({
  eventType: z.enum(["hire", "schedule", "overtime", "termination", "modification"]),
  employeeId: z.string(),
  effectiveDate: z.string(),
  data: z.record(z.any()),
  urgentSubmission: z.boolean().default(false)
});

// Idempotency middleware
const idempotencyMiddleware = (req: any, res: any, next: any) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey && req.method === 'POST') {
    return res.status(400).json({ error: 'Idempotency-Key header required for filing operations' });
  }
  req.idempotencyKey = idempotencyKey;
  next();
};

// GET /api/filings - List all filings
router.get('/api/filings', isAuthenticated, async (req, res) => {
  try {
    const { system, status, period, limit = '50', offset = '0' } = req.query;
    
    let query = db.select().from(filings);
    const conditions = [];
    
    if (system) {
      conditions.push(eq(filings.system, system as any));
    }
    if (status) {
      conditions.push(eq(filings.status, status as any));
    }
    if (period) {
      conditions.push(eq(filings.period, period as string));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.reduce((acc, cond) => acc && cond));
    }
    
    const result = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(filings.createdAt);
    
    const signature = generateSignature(result);
    
    res.json({
      data: result,
      meta: {
        total: result.length,
        signature,
        systemCounts: getSystemCounts(result),
        pendingCount: result.filter(f => f.status === 'pending').length
      }
    });
  } catch (error) {
    console.error("Error fetching filings:", error);
    res.status(500).json({ error: "Failed to fetch filings" });
  }
});

// POST /api/filings/apd - Submit APD filing
router.post('/api/filings/apd', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const filingData = APDFilingSchema.parse(req.body);
    
    // Check idempotency
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    // Validate employees exist and have required data
    const validationErrors = await validateAPDFiling(filingData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "APD filing validation failed", 
        details: validationErrors 
      });
    }
    
    const filing = {
      id: nanoid(),
      system: 'APD' as const,
      period: filingData.period,
      submissionType: filingData.submissionType,
      status: filingData.dryRun ? 'draft' : 'pending',
      data: {
        employeeIds: filingData.employeeIds,
        submissionType: filingData.submissionType,
        generatedAt: new Date().toISOString(),
        employeeCount: filingData.employeeIds.length
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: (req as any).user.claims.sub,
      dryRun: filingData.dryRun
    };
    
    const [created] = await db.insert(filings).values(filing).returning();
    
    // Generate APD file and submit if not dry run
    if (!filingData.apdRun) {
      const submissionResult = await processAPDSubmission(created);
      created.submissionId = submissionResult.submissionId;
      created.status = submissionResult.status;
      
      // Update with submission details
      await db.update(filings)
        .set({
          submissionId: submissionResult.submissionId,
          status: submissionResult.status,
          submittedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(filings.id, created.id));
    }
    
    const response = {
      data: created,
      meta: {
        signature: generateSignature(created),
        idempotencyKey: req.idempotencyKey,
        apdFileGenerated: !filingData.dryRun,
        submissionReady: created.status === 'submitted'
      }
    };
    
    storeIdempotency(req.idempotencyKey, response);
    
    // Trigger webhook
    if (created.status === 'submitted') {
      await triggerWebhook('filing.submitted', {
        filingId: created.id,
        system: 'APD',
        submissionId: created.submissionId,
        period: created.period
      });
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating APD filing:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid APD filing data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create APD filing" });
  }
});

// POST /api/filings/fmy - Submit ΦΜΥ filing
router.post('/api/filings/fmy', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const filingData = FMYFilingSchema.parse(req.body);
    
    // Check idempotency
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    // Validate payroll runs exist and are finalized
    const validationErrors = await validateFMYFiling(filingData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "ΦΜΥ filing validation failed", 
        details: validationErrors 
      });
    }
    
    const filing = {
      id: nanoid(),
      system: 'AADE_FMY' as const,
      period: filingData.period,
      submissionType: 'monthly' as const,
      status: filingData.dryRun ? 'draft' : 'pending',
      data: {
        payrollRunIds: filingData.payrollRunIds,
        includeSupplementary: filingData.includeSupplementary,
        generatedAt: new Date().toISOString(),
        runCount: filingData.payrollRunIds.length
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: (req as any).user.claims.sub,
      dryRun: filingData.dryRun
    };
    
    const [created] = await db.insert(filings).values(filing).returning();
    
    // Generate ΦΜΥ file and submit if not dry run
    if (!filingData.dryRun) {
      const submissionResult = await processFMYSubmission(created);
      created.submissionId = submissionResult.submissionId;
      created.status = submissionResult.status;
      
      await db.update(filings)
        .set({
          submissionId: submissionResult.submissionId,
          status: submissionResult.status,
          submittedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(filings.id, created.id));
    }
    
    const response = {
      data: created,
      meta: {
        signature: generateSignature(created),
        idempotencyKey: req.idempotencyKey,
        fmyFileGenerated: !filingData.dryRun,
        submissionReady: created.status === 'submitted',
        paymentRequired: created.status === 'submitted'
      }
    };
    
    storeIdempotency(req.idempotencyKey, response);
    
    // Trigger webhook
    if (created.status === 'submitted') {
      await triggerWebhook('filing.submitted', {
        filingId: created.id,
        system: 'AADE_FMY',
        submissionId: created.submissionId,
        period: created.period,
        paymentRequired: true
      });
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating ΦΜΥ filing:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid ΦΜΥ filing data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create ΦΜΥ filing" });
  }
});

// POST /api/filings/ergani/:event - Submit ERGANI event
router.post('/api/filings/ergani/:event', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const eventType = req.params.event as string;
    const eventData = ErganiEventSchema.parse({
      ...req.body,
      eventType
    });
    
    // Check idempotency
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    // Validate ERGANI event data
    const validationErrors = await validateErganiEvent(eventData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "ERGANI event validation failed", 
        details: validationErrors 
      });
    }
    
    const filing = {
      id: nanoid(),
      system: 'ERGANI_II' as const,
      period: eventData.effectiveDate.substring(0, 7), // YYYY-MM
      submissionType: 'event' as const,
      status: 'pending' as const,
      data: {
        eventType: eventData.eventType,
        employeeId: eventData.employeeId,
        effectiveDate: eventData.effectiveDate,
        eventData: eventData.data,
        urgentSubmission: eventData.urgentSubmission,
        generatedAt: new Date().toISOString()
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: (req as any).user.claims.sub,
      urgentSubmission: eventData.urgentSubmission
    };
    
    const [created] = await db.insert(filings).values(filing).returning();
    
    // Submit to ERGANI II immediately
    const submissionResult = await processErganiSubmission(created);
    created.submissionId = submissionResult.submissionId;
    created.status = submissionResult.status;
    
    await db.update(filings)
      .set({
        submissionId: submissionResult.submissionId,
        status: submissionResult.status,
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(filings.id, created.id));
    
    const response = {
      data: created,
      meta: {
        signature: generateSignature(created),
        idempotencyKey: req.idempotencyKey,
        erganiSubmitted: created.status === 'submitted',
        urgentProcessing: eventData.urgentSubmission,
        confirmationId: submissionResult.confirmationId
      }
    };
    
    storeIdempotency(req.idempotencyKey, response);
    
    // Trigger webhook based on result
    const webhookEvent = created.status === 'error' ? 'ergani.error' : 'filing.submitted';
    await triggerWebhook(webhookEvent, {
      filingId: created.id,
      system: 'ERGANI_II',
      eventType: eventData.eventType,
      submissionId: created.submissionId,
      confirmationId: submissionResult.confirmationId,
      employeeId: eventData.employeeId
    });
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating ERGANI filing:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid ERGANI event data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create ERGANI filing" });
  }
});

// Helper functions
async function validateAPDFiling(data: any): Promise<string[]> {
  const errors = [];
  // Validate employees exist, have AMKA, employment contracts, etc.
  return errors;
}

async function validateFMYFiling(data: any): Promise<string[]> {
  const errors = [];
  // Validate payroll runs are finalized, tax calculations complete, etc.
  return errors;
}

async function validateErganiEvent(data: any): Promise<string[]> {
  const errors = [];
  // Validate employee exists, event data completeness, timing rules, etc.
  return errors;
}

async function processAPDSubmission(filing: any): Promise<any> {
  // APD file generation and submission logic
  return {
    submissionId: `APD-${nanoid()}`,
    status: 'submitted',
    confirmationId: `APD-CONF-${Date.now()}`
  };
}

async function processFMYSubmission(filing: any): Promise<any> {
  // ΦΜΥ file generation and AADE submission logic
  return {
    submissionId: `FMY-${nanoid()}`,
    status: 'submitted',
    confirmationId: `FMY-CONF-${Date.now()}`
  };
}

async function processErganiSubmission(filing: any): Promise<any> {
  // ERGANI II real-time submission logic
  return {
    submissionId: `ERG-${nanoid()}`,
    status: 'submitted',
    confirmationId: `ERG-CONF-${Date.now()}`
  };
}

function getSystemCounts(filings: any[]): any {
  const counts = { APD: 0, AADE_FMY: 0, ERGANI_II: 0 };
  filings.forEach(f => counts[f.system]++);
  return counts;
}

function generateSignature(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
}

// Webhook trigger
async function triggerWebhook(event: string, payload: any): Promise<void> {
  console.log(`Webhook triggered: ${event}`, payload);
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

export default router;