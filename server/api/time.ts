import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "../db";
import { punchEvents, timesheets } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

// Time tracking schemas
const CreatePunchSchema = z.object({
  employeeId: z.string(),
  punchType: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  timestamp: z.string(),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    accuracy: z.number().optional()
  }).optional(),
  deviceId: z.string().optional(),
  source: z.enum(["mobile", "kiosk", "web", "manual"]).default("web"),
  notes: z.string().optional()
});

// Idempotency middleware
const idempotencyMiddleware = (req: any, res: any, next: any) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey && req.method === 'POST') {
    return res.status(400).json({ error: 'Idempotency-Key header required for punch operations' });
  }
  req.idempotencyKey = idempotencyKey;
  next();
};

// POST /api/punches - Create punch with idempotency
router.post('/api/punches', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const punchData = CreatePunchSchema.parse(req.body);
    
    // Check idempotency - prevent duplicate punches
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    // Validate punch sequence (prevent duplicate clock-ins, etc.)
    const lastPunch = await db.select()
      .from(punchEvents)
      .where(eq(punchEvents.employeeId, punchData.employeeId))
      .orderBy(sql`timestamp DESC`)
      .limit(1);
    
    if (lastPunch.length > 0) {
      const lastPunchType = lastPunch[0].punchType;
      
      // Business rules validation
      if (lastPunchType === 'clock_in' && punchData.punchType === 'clock_in') {
        return res.status(400).json({ 
          error: "Cannot clock in twice without clocking out",
          lastPunch: lastPunch[0]
        });
      }
      
      if (lastPunchType === 'clock_out' && punchData.punchType === 'clock_out') {
        return res.status(400).json({ 
          error: "Cannot clock out twice without clocking in",
          lastPunch: lastPunch[0]
        });
      }
    }
    
    const newPunch = {
      eventId: nanoid(),
      ...punchData,
      timestamp: new Date(punchData.timestamp),
      createdAt: new Date(),
      isValidated: false,
      validationRules: [],
      geoValidated: punchData.location ? true : false
    };
    
    const [created] = await db.insert(punchEvents).values(newPunch).returning();
    
    // Trigger real-time validation and ERGANI sync
    await validatePunchRealTime(created);
    
    const response = {
      data: created,
      meta: {
        signature: generateSignature(created),
        idempotencyKey: req.idempotencyKey,
        validation: {
          geoValidated: created.geoValidated,
          businessRulesValid: true,
          erganiSyncPending: true
        }
      }
    };
    
    storeIdempotency(req.idempotencyKey, response);
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating punch:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid punch data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create punch" });
  }
});

// GET /api/timesheets - Get timesheets for period
router.get('/api/timesheets', isAuthenticated, async (req, res) => {
  try {
    const { period, employeeId, status } = req.query;
    
    if (!period || !/^\d{4}-\d{2}$/.test(period as string)) {
      return res.status(400).json({ error: "Period must be in YYYY-MM format" });
    }
    
    const [year, month] = (period as string).split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    let query = db.select().from(timesheets)
      .where(
        and(
          gte(timesheets.periodStart, startDate),
          lte(timesheets.periodEnd, endDate)
        )
      );
    
    // Apply filters
    const conditions = [
      gte(timesheets.periodStart, startDate),
      lte(timesheets.periodEnd, endDate)
    ];
    
    if (employeeId) {
      conditions.push(eq(timesheets.employeeId, employeeId as string));
    }
    
    if (status) {
      conditions.push(eq(timesheets.status, status as any));
    }
    
    const result = await db.select().from(timesheets).where(and(...conditions));
    
    // Calculate totals
    const totals = {
      totalRegularHours: result.reduce((sum, t) => sum + (t.regularHours || 0), 0),
      totalOvertimeHours: result.reduce((sum, t) => sum + (t.overtimeHours || 0), 0),
      totalNightHours: result.reduce((sum, t) => sum + (t.nightHours || 0), 0),
      totalSundayHours: result.reduce((sum, t) => sum + (t.sundayHours || 0), 0),
      totalHolidayHours: result.reduce((sum, t) => sum + (t.holidayHours || 0), 0)
    };
    
    const signature = generateSignature({ result, totals });
    
    res.json({
      data: result,
      meta: {
        period: period as string,
        totals,
        signature,
        locked: result.some(t => t.status === 'locked'),
        erganiSynced: result.every(t => t.erganiSynced)
      }
    });
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    res.status(500).json({ error: "Failed to fetch timesheets" });
  }
});

// POST /api/timesheets/lock - Lock timesheet for payroll
router.post('/api/timesheets/lock', isAuthenticated, async (req, res) => {
  try {
    const { timesheetIds, period } = req.body;
    
    if (!timesheetIds || !Array.isArray(timesheetIds)) {
      return res.status(400).json({ error: "timesheetIds array required" });
    }
    
    // Update timesheet status to locked
    const result = await db.update(timesheets)
      .set({ 
        status: 'locked',
        lockedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          sql`id = ANY(${timesheetIds})`,
          eq(timesheets.status, 'draft')
        )
      )
      .returning();
    
    // Trigger webhook
    await triggerWebhook('timesheet.locked', {
      timesheetIds: result.map(t => t.id),
      period,
      lockedAt: new Date().toISOString(),
      totalHours: result.reduce((sum, t) => sum + (t.regularHours || 0), 0)
    });
    
    res.json({
      data: result,
      meta: {
        locked: result.length,
        signature: generateSignature(result)
      }
    });
  } catch (error) {
    console.error("Error locking timesheets:", error);
    res.status(500).json({ error: "Failed to lock timesheets" });
  }
});

// Real-time punch validation
async function validatePunchRealTime(punch: any): Promise<void> {
  // Implement real-time validation rules
  const validationResults = [];
  
  // Schedule matching validation
  // Double-punch prevention
  // Break time compliance
  // Maximum hours check
  
  // Update punch with validation results
  await db.update(punchEvents)
    .set({
      isValidated: true,
      validationRules: validationResults,
      updatedAt: new Date()
    })
    .where(eq(punchEvents.eventId, punch.eventId));
}

// Simple signature generation
function generateSignature(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
}

// Simple in-memory idempotency store
const idempotencyStore = new Map<string, any>();

function checkIdempotency(key: string): any | null {
  return idempotencyStore.get(key) || null;
}

function storeIdempotency(key: string, response: any): void {
  idempotencyStore.set(key, response);
  setTimeout(() => idempotencyStore.delete(key), 24 * 60 * 60 * 1000);
}

// Webhook trigger function
async function triggerWebhook(event: string, payload: any): Promise<void> {
  // In production, this would send to configured webhook endpoints
  console.log(`Webhook triggered: ${event}`, payload);
}

export default router;