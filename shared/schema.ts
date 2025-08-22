import { z } from "zod";

// Basic employee schema
export const insertEmployeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  department: z.string().optional(),
  startDate: z.string(),
  position: z.string(),
  salary: z.number().positive().optional()
});

export const insertPropertySchema = z.object({
  name: z.string().min(1),
  address: z.string(),
  type: z.enum(["hotel", "office", "warehouse"]).default("office")
});

export const insertShiftSchema = z.object({
  employeeId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  date: z.string(),
  position: z.string().optional()
});

export const insertPunchEventSchema = z.object({
  employeeId: z.string(),
  type: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  timestamp: z.string(),
  location: z.string().optional()
});

export const insertExceptionSchema = z.object({
  employeeId: z.string(),
  type: z.string(),
  description: z.string(),
  date: z.string(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending")
});

export const insertTimesheetSchema = z.object({
  employeeId: z.string(),
  weekStarting: z.string(),
  regularHours: z.number().min(0),
  overtimeHours: z.number().min(0).optional(),
  totalHours: z.number().min(0)
});

export const insertWageComponentSchema = z.object({
  name: z.string(),
  type: z.enum(["hourly", "salary", "bonus", "allowance"]),
  amount: z.number(),
  frequency: z.enum(["hourly", "monthly", "yearly"]).default("hourly")
});

export const insertDepartmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  managerId: z.string().optional()
});

export const insertShiftTemplateSchema = z.object({
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  daysOfWeek: z.array(z.number().min(0).max(6))
});

export const insertDeviceRegistrySchema = z.object({
  deviceId: z.string(),
  location: z.string(),
  type: z.enum(["kiosk", "mobile", "web"]),
  isActive: z.boolean().default(true)
});

export const insertOvertimeRequestSchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  hours: z.number().positive(),
  reason: z.string(),
  managerApproval: z.boolean().default(false)
});

// Export types for use in backend
export type Employee = z.infer<typeof insertEmployeeSchema>;
export type Property = z.infer<typeof insertPropertySchema>;
export type Shift = z.infer<typeof insertShiftSchema>;
export type PunchEvent = z.infer<typeof insertPunchEventSchema>;
export type Exception = z.infer<typeof insertExceptionSchema>;
export type Timesheet = z.infer<typeof insertTimesheetSchema>;
export type WageComponent = z.infer<typeof insertWageComponentSchema>;
export type Department = z.infer<typeof insertDepartmentSchema>;
export type ShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type DeviceRegistry = z.infer<typeof insertDeviceRegistrySchema>;
export type OvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;

// Additional exports that backend storage expects
export const departments = insertDepartmentSchema;
export const employees = insertEmployeeSchema; 
export const properties = insertPropertySchema;
export const shifts = insertShiftSchema;
export const timesheets = insertTimesheetSchema;
export const wageComponents = insertWageComponentSchema;
export const punchEvents = insertPunchEventSchema;
export const exceptions = insertExceptionSchema;

// User-related schemas
export const users = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["admin", "hr", "manager", "employee"]).default("employee")
});

export const paycheckHistory = z.object({
  id: z.string(),
  employeeId: z.string(),
  period: z.string(),
  grossPay: z.number(),
  netPay: z.number(),
  deductions: z.number()
});

// Export additional types  
export type User = z.infer<typeof users>;
export type UpsertUser = Partial<User> & { id: string };
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertPunchEvent = z.infer<typeof insertPunchEventSchema>;
export type InsertException = z.infer<typeof insertExceptionSchema>;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type InsertWageComponent = z.infer<typeof insertWageComponentSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

// Audit and security schemas
export const authAuditLogs = z.object({
  id: z.string(),
  userId: z.string(),
  action: z.string(),
  timestamp: z.string(),
  ipAddress: z.string().optional()
});

export const hashChainedAuditLog = z.object({
  id: z.string(),
  previousHash: z.string(),
  currentHash: z.string(),
  data: z.string(),
  timestamp: z.string()
});

// Filing and compliance schemas
export const filing = z.object({
  id: z.string(),
  type: z.enum(["apd", "fmy", "ergani"]),
  status: z.enum(["pending", "submitted", "processed", "failed"]),
  data: z.string(),
  submittedAt: z.string().optional()
});

export const filings = filing;

// All additional schemas the backend expects
export const payrollLines = z.object({
  id: z.string(),
  employeeId: z.string(),
  component: z.string(),
  amount: z.number(),
  period: z.string()
});

export const payrollRuns = z.object({
  id: z.string(),
  period: z.string(),
  status: z.enum(["pending", "processing", "completed"]),
  runDate: z.string()
});

export const companies = z.object({
  id: z.string(),
  name: z.string(),
  vatNumber: z.string(),
  address: z.string()
});

export const companyUsers = z.object({
  id: z.string(),
  companyId: z.string(),
  userId: z.string(),
  role: z.string()
});

export const dataAccessAudit = z.object({
  id: z.string(),
  userId: z.string(),
  resource: z.string(),
  action: z.string(),
  timestamp: z.string()
});

export const contracts = z.object({
  id: z.string(),
  employeeId: z.string(),
  type: z.string(),
  startDate: z.string(),
  endDate: z.string().optional()
});

export const secureIbanVault = z.object({
  id: z.string(),
  employeeId: z.string(),
  encryptedIban: z.string(),
  bankCode: z.string()
});

export const auditLog = z.object({
  id: z.string(),
  action: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  details: z.string()
});

export const emailVerificationTokens = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string()
});

export const passwordResetTokens = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string()
});

export const magicLinkTokens = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string()
});

export const clientAccessGrants = z.object({
  id: z.string(),
  clientId: z.string(),
  userId: z.string(),
  scope: z.string(),
  grantedAt: z.string()
});

export const oboTokens = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.string(),
  scope: z.string()
});

export const partnerMembers = z.object({
  id: z.string(),
  partnerId: z.string(),
  userId: z.string(),
  role: z.string(),
  joinedAt: z.string()
});

export const ibanValidationHistory = z.object({
  id: z.string(),
  iban: z.string(),
  validationResult: z.boolean(),
  timestamp: z.string(),
  validationDetails: z.string().optional()
});

export const userSessions = z.object({
  id: z.string(),
  userId: z.string(),
  sessionToken: z.string(),
  expiresAt: z.string(),
  lastActivity: z.string()
});

// MFA and authentication schemas
export const mfaTotpSecrets = z.object({
  id: z.string(),
  userId: z.string(),
  secret: z.string(),
  backupCodes: z.array(z.string()),
  enabled: z.boolean().default(false)
});

export const webauthnCredentials = z.object({
  id: z.string(),
  userId: z.string(),
  credentialId: z.string(),
  publicKey: z.string(),
  counter: z.number(),
  transports: z.array(z.string())
});

// SSO and additional schemas
export const userSsoConnections = z.object({
  id: z.string(),
  userId: z.string(),
  providerId: z.string(),
  externalId: z.string(),
  accessToken: z.string().optional()
});

export const ssoProviders = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["oauth2", "saml", "oidc"]),
  config: z.string(),
  enabled: z.boolean().default(true)
});

// Additional required schemas
export const auditLogs = z.object({
  id: z.string(),
  action: z.string(),
  userId: z.string(),
  timestamp: z.string(),
  details: z.string(),
  ipAddress: z.string().optional()
});

export const sessions = z.object({
  id: z.string(),
  userId: z.string(),
  sessionData: z.string(),
  expiresAt: z.string(),
  createdAt: z.string()
});

export const rateLimits = z.object({
  id: z.string(),
  identifier: z.string(),
  limit: z.number(),
  windowMs: z.number(),
  requests: z.number(),
  resetTime: z.string()
});

// Payroll-related schemas
export const employeePeriodState = z.object({
  id: z.string(),
  employeeId: z.string(),
  period: z.string(),
  state: z.enum(["draft", "locked", "processed"]),
  lastModified: z.string()
});

// Types for payroll calculations
export type PayrollCalculation = {
  employeeId: string;
  grossPay: number;
  netPay: number;
  taxes: number;
  socialSecurity: number;
  deductions: number;
  bonuses: number;
};
export const insertPayrollScopeSchema = z.object({ scope: z.string(), period: z.string() });
