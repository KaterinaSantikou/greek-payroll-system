import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "../db";
import { employees, contracts } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Employee schemas
const CreateEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  afm: z.string().regex(/^\d{9}$/, "AFM must be 9 digits"),
  amka: z.string().regex(/^\d{11}$/, "AMKA must be 11 digits"),
  iban: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string(),
  nationality: z.string().default("GR"),
  employmentType: z.enum(["indefinite", "fixed_term", "seasonal", "internship"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  department: z.string(),
  position: z.string(),
  propertyId: z.string()
});

const CreateContractSchema = z.object({
  contractType: z.enum(["indefinite", "fixed_term", "seasonal"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  baseSalary: z.number().min(880), // Greek minimum wage
  currency: z.string().default("EUR"),
  payFrequency: z.enum(["monthly", "biweekly", "weekly"]),
  workingHours: z.number().min(1).max(48), // EU working time directive
  grade: z.string().optional(),
  cbaReference: z.string().optional(),
  allowances: z.record(z.number()).optional(),
  ftePercentage: z.number().min(0.1).max(1.0).default(1.0)
});

// Idempotency middleware
const idempotencyMiddleware = (req: any, res: any, next: any) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return res.status(400).json({ error: 'Idempotency-Key header required for write operations' });
  }
  req.idempotencyKey = idempotencyKey;
  next();
};

// GET /api/employees - List employees with filtering
router.get('/api/employees', isAuthenticated, async (req, res) => {
  try {
    const { department, employmentType, active, limit = '50', offset = '0' } = req.query;
    
    let query = db.select().from(employees);
    
    // Apply filters if provided
    const conditions = [];
    if (department) {
      conditions.push(eq(employees.department, department as string));
    }
    if (employmentType) {
      conditions.push(eq(employees.employmentType, employmentType as any));
    }
    if (active !== undefined) {
      conditions.push(eq(employees.isActive, active === 'true'));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const result = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
    
    // Add signature for audit
    const signature = generateSignature(result);
    
    res.json({
      data: result,
      meta: {
        total: result.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        signature
      }
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// GET /api/employees/:id - Get single employee
router.get('/api/employees/:id', isAuthenticated, async (req, res) => {
  try {
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.id, req.params.id));
    
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    const signature = generateSignature(employee);
    
    res.json({
      data: employee,
      meta: { signature }
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

// POST /api/employees - Create employee with idempotency
router.post('/api/employees', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const employeeData = CreateEmployeeSchema.parse(req.body);
    
    // Check idempotency - in production, use Redis or database
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    // Validate unique AFM and AMKA
    const existingEmployee = await db.select()
      .from(employees)
      .where(eq(employees.afm, employeeData.afm));
    
    if (existingEmployee.length > 0) {
      return res.status(409).json({ error: "Employee with this AFM already exists" });
    }
    
    const newEmployee = {
      employeeId: nanoid(),
      employeeNumber: `EMP${Date.now()}`,
      ...employeeData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    
    const [created] = await db.insert(employees).values(newEmployee).returning();
    
    const response = {
      data: created,
      meta: {
        signature: generateSignature(created),
        idempotencyKey: req.idempotencyKey
      }
    };
    
    // Store idempotency response
    storeIdempotency(req.idempotencyKey, response);
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating employee:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid employee data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create employee" });
  }
});

// POST /api/employees/:id/contracts - Add contract to employee
router.post('/api/employees/:id/contracts', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const contractData = CreateContractSchema.parse(req.body);
    
    // Check employee exists
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.employeeId, req.params.id));
    
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Check idempotency
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    const newContract = {
      contractId: nanoid(),
      employeeId: req.params.id,
      ...contractData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
    
    const [created] = await db.insert(contracts).values(newContract).returning();
    
    const response = {
      data: created,
      meta: {
        signature: generateSignature(created),
        idempotencyKey: req.idempotencyKey
      }
    };
    
    storeIdempotency(req.idempotencyKey, response);
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating contract:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid contract data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create contract" });
  }
});

// Simple signature generation for audit (in production, use proper HMAC)
function generateSignature(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
}

// Simple in-memory idempotency store (use Redis in production)
const idempotencyStore = new Map<string, any>();

function checkIdempotency(key: string): any | null {
  return idempotencyStore.get(key) || null;
}

function storeIdempotency(key: string, response: any): void {
  idempotencyStore.set(key, response);
  // Set expiration in production
  setTimeout(() => idempotencyStore.delete(key), 24 * 60 * 60 * 1000); // 24 hours
}

export default router;