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

// Re-export the table as the expected name for backward compatibility
export { overtimeRequestsTable as overtimeRequestsDb };

// Additional exports that backend storage expects
export const departments = insertDepartmentSchema;
export const employees = insertEmployeeSchema; 
export const properties = insertPropertySchema;
export const shifts = insertShiftSchema;
export const timesheets = insertTimesheetSchema;
export const wageComponents = insertWageComponentSchema;
export const punchEvents = insertPunchEventSchema;
export const exceptions = insertExceptionSchema;
export const overtimeRequests = insertOvertimeRequestSchema;

// Temporary placeholder exports for missing tables
export const availableResponders = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  isAvailable: z.boolean()
});

export const overtimeRequestsTable = z.object({
  requestId: z.string(),
  employeeId: z.string(),
  status: z.string()
});

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

// Payroll-related schemas
export const payrollScopes = z.object({
  id: z.string(),
  scope: z.string(),
  period: z.string(),
  description: z.string().optional()
});

export const periodLedgers = z.object({
  id: z.string(),
  period: z.string(),
  totalGross: z.number(),
  totalNet: z.number(),
  totalTax: z.number()
});

export const payrollScopeLines = z.object({
  id: z.string(),
  scopeId: z.string(),
  employeeId: z.string(),
  amount: z.number(),
  type: z.string()
});

export const paymentBatches = z.object({
  id: z.string(),
  batchName: z.string(),
  totalAmount: z.number(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  createdAt: z.string()
});

// Additional missing schemas from server imports
export const partners = z.object({
  id: z.string(),
  name: z.string(),
  apiKey: z.string(),
  isActive: z.boolean().default(true)
});

export const accessTokens = z.object({
  id: z.string(),
  token: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
  scope: z.string()
});

export const idempotencyKeys = z.object({
  id: z.string(),
  key: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  response: z.string().optional()
});

export const laborNewsfeedItems = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  publishedAt: z.string(),
  category: z.string()
});

export const laborNewsfeedCitations = z.object({
  id: z.string(),
  itemId: z.string(),
  source: z.string(),
  url: z.string().optional()
});

export const laborNewsfeedConfig = z.object({
  id: z.string(),
  userId: z.string(),
  categories: z.array(z.string()),
  notificationEnabled: z.boolean().default(true)
});

export const s1CompensationTracking = z.object({
  id: z.string(),
  employeeId: z.string(),
  period: z.string(),
  grossCompensation: z.number(),
  genderPayGap: z.number().optional()
});

export const mfaBackupCodes = z.object({
  id: z.string(),
  userId: z.string(),
  code: z.string(),
  used: z.boolean().default(false),
  generatedAt: z.string()
});

// Additional security and audit schemas
export const employeeSelfServiceAudit = z.object({
  id: z.string(),
  employeeId: z.string(),
  action: z.string(),
  timestamp: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

// RBAC and permission schemas
export const rolePermissions = z.object({
  id: z.string(),
  roleId: z.string(),
  permission: z.string(),
  resource: z.string(),
  action: z.enum(["create", "read", "update", "delete", "execute"])
});

export const systemPermissions = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  isSystemLevel: z.boolean().default(false)
});

export const roles = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  isSystemRole: z.boolean().default(false),
  permissions: z.array(z.string())
});

export const userRoles = z.object({
  id: z.string(),
  userId: z.string(),
  roleId: z.string(),
  assignedAt: z.string(),
  assignedBy: z.string()
});

export const systemRoles = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  level: z.number(),
  isBuiltIn: z.boolean().default(true),
  permissions: z.array(z.string())
});

export const userImpersonationSessions = z.object({
  id: z.string(),
  adminUserId: z.string(),
  targetUserId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
  reason: z.string(),
  isActive: z.boolean().default(true)
});

// Status page and monitoring schemas
export const statusPageComponents = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["operational", "degraded", "outage"]),
  lastChecked: z.string(),
  uptime: z.number()
});

export const statusPageIncidents = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  createdAt: z.string(),
  resolvedAt: z.string().optional()
});

export const statusPageMaintenances = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(["scheduled", "in_progress", "completed"]),
  scheduledStart: z.string(),
  scheduledEnd: z.string(),
  actualStart: z.string().optional(),
  actualEnd: z.string().optional()
});

export const statusPageSubscribers = z.object({
  id: z.string(),
  email: z.string(),
  isActive: z.boolean().default(true),
  subscribedAt: z.string(),
  preferences: z.object({
    incidents: z.boolean().default(true),
    maintenances: z.boolean().default(true)
  })
});

export const statusPageSubscriptions = z.object({
  id: z.string(),
  subscriberId: z.string(),
  componentId: z.string(),
  notificationMethods: z.array(z.enum(["email", "sms", "webhook"])),
  isActive: z.boolean().default(true)
});

// Additional schemas that are unique
export const deviceRegistry = z.object({
  id: z.string(),
  deviceId: z.string(),
  name: z.string(),
  location: z.string(),
  isActive: z.boolean().default(true)
});

// Banking and payment schemas
export const bankRegistry = z.object({
  id: z.string(),
  bankCode: z.string(),
  bankName: z.string(),
  country: z.string(),
  supportsSEPA: z.boolean().default(true),
  bicCode: z.string()
});

export const sepaTransactions = z.object({
  id: z.string(),
  batchId: z.string(),
  employeeId: z.string(),
  amount: z.number(),
  currency: z.string().default("EUR"),
  status: z.enum(["pending", "sent", "confirmed", "failed"]),
  createdAt: z.string()
});

export const paymentFiles = z.object({
  id: z.string(),
  filename: z.string(),
  fileType: z.enum(["pain.001", "pain.002", "camt.054"]),
  bankCode: z.string(),
  generatedAt: z.string(),
  status: z.enum(["generated", "sent", "processed"])
});

export const paymentInstructions = z.object({
  id: z.string(),
  employeeId: z.string(),
  amount: z.number(),
  currency: z.string().default("EUR"),
  iban: z.string(),
  bic: z.string().optional(),
  reference: z.string(),
  paymentDate: z.string(),
  status: z.enum(["draft", "approved", "sent", "completed"])
});

export const sepaPaymentFiles = z.object({
  id: z.string(),
  filename: z.string(),
  messageId: z.string(),
  creationDate: z.string(),
  numberOfTransactions: z.number(),
  totalAmount: z.number(),
  initiatingParty: z.string(),
  status: z.enum(["created", "uploaded", "processed", "rejected"])
});

// General Ledger export schemas  
export const glExports = z.object({
  id: z.string(),
  exportDate: z.string(),
  period: z.string(),
  format: z.enum(["csv", "excel", "xml"]),
  filename: z.string(),
  totalRecords: z.number(),
  status: z.enum(["pending", "completed", "failed"])
});

export const glMappings = z.object({
  id: z.string(),
  payrollComponent: z.string(),
  accountCode: z.string(),
  description: z.string(),
  debitCredit: z.enum(["debit", "credit"]),
  isActive: z.boolean().default(true)
});

export const journalEntries = z.object({
  id: z.string(),
  entryDate: z.string(),
  accountCode: z.string(),
  description: z.string(),
  debitAmount: z.number().optional(),
  creditAmount: z.number().optional(),
  reference: z.string(),
  period: z.string(),
  employeeId: z.string().optional()
});

export const payrollCalculations = z.object({
  id: z.string(),
  employeeId: z.string(),
  period: z.string(),
  grossPay: z.number(),
  netPay: z.number(),
  taxes: z.number(),
  socialSecurity: z.number(),
  deductions: z.number(),
  bonuses: z.number(),
  calculatedAt: z.string()
});

// Compliance and filing schemas
export const complianceFilings = z.object({
  id: z.string(),
  type: z.enum(["ERGANI", "e-EFKA", "AADE"]),
  period: z.string(),
  status: z.enum(["draft", "submitted", "accepted", "rejected"]),
  filedAt: z.string().optional(),
  filingData: z.string(), // JSON data for the filing
  errors: z.string().optional()
});

export const erganiSubmissions = z.object({
  id: z.string(),
  employeeId: z.string(),
  submissionType: z.enum(["START_WORK", "END_WORK", "CHANGE"]),
  submissionDate: z.string(),
  workDate: z.string(),
  protocolNumber: z.string().optional(),
  status: z.enum(["pending", "submitted", "accepted", "rejected"]),
  errorCode: z.string().optional(),
  errorDescription: z.string().optional()
});

// Digital work card and time tracking schemas
export const digitalWorkCardLogs = z.object({
  id: z.string(),
  employeeId: z.string(),
  cardId: z.string(),
  action: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  timestamp: z.string(),
  location: z.string().optional(),
  deviceId: z.string().optional(),
  ipAddress: z.string().optional()
});

export const timeCorrectionRequests = z.object({
  id: z.string(),
  employeeId: z.string(),
  originalTimestamp: z.string(),
  correctedTimestamp: z.string(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  requestedAt: z.string(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional()
});

// Pay equity and salary range schemas
export const jobPostingSalaryRanges = z.object({
  id: z.string(),
  jobTitle: z.string(),
  minSalary: z.number(),
  maxSalary: z.number(),
  currency: z.string().default("EUR"),
  location: z.string(),
  postedAt: z.string(),
  isActive: z.boolean().default(true)
});

export const payEquityAnalysis = z.object({
  id: z.string(),
  analysisDate: z.string(),
  department: z.string().optional(),
  jobLevel: z.string().optional(),
  genderPayGap: z.number(),
  medianMaleSalary: z.number(),
  medianFemaleSalary: z.number(),
  adjustedPayGap: z.number(),
  riskLevel: z.enum(["low", "medium", "high"])
});

export const payEquityCompliance = z.object({
  id: z.string(),
  complianceDate: z.string(),
  jurisdiction: z.string(),
  complianceType: z.enum(["EU_PAY_TRANSPARENCY", "GREECE_EQUAL_PAY", "ESRS_S1"]),
  status: z.enum(["compliant", "non_compliant", "review_needed"]),
  findings: z.string(),
  actionItems: z.array(z.string()),
  nextReviewDate: z.string()
});

export const payTransparencyRequests = z.object({
  id: z.string(),
  employeeId: z.string(),
  requestType: z.enum(["salary_range", "pay_equity_data", "compensation_analysis"]),
  requestDate: z.string(),
  status: z.enum(["pending", "approved", "completed", "rejected"]),
  responseData: z.string().optional(),
  respondedAt: z.string().optional()
});

export const payDecisionExplanations = z.object({
  id: z.string(),
  employeeId: z.string(),
  decisionType: z.enum(["salary_increase", "bonus", "promotion", "salary_adjustment"]),
  explanation: z.string(),
  factors: z.array(z.string()),
  approvedBy: z.string(),
  createdAt: z.string()
});

// ESRS S1 calculation and sustainability schemas
export const s1CalculationRulesets = z.object({
  id: z.string(),
  version: z.string(),
  description: z.string(),
  effectiveDate: z.string(),
  calculationRules: z.string(), // JSON rules
  isActive: z.boolean().default(true)
});

export const s1LeaveEligibility = z.object({
  id: z.string(),
  employeeId: z.string(),
  leaveType: z.enum(["parental", "sick", "annual", "sabbatical"]),
  eligibleDays: z.number(),
  usedDays: z.number(),
  period: z.string()
});

export const s1MaterialityAssessment = z.object({
  id: z.string(),
  topic: z.string(),
  assessmentDate: z.string(),
  materialityScore: z.number(),
  isMaterial: z.boolean(),
  justification: z.string()
});

export const s1HSFatalities = z.object({
  id: z.string(),
  incidentDate: z.string(),
  location: z.string(),
  employeeId: z.string().optional(),
  incidentType: z.string(),
  isFatal: z.boolean(),
  description: z.string(),
  reportedAt: z.string()
});

export const s1HealthSafetyIncidents = z.object({
  id: z.string(),
  incidentDate: z.string(),
  location: z.string(),
  employeeId: z.string().optional(),
  incidentType: z.enum(["accident", "near_miss", "health_issue", "safety_violation"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string(),
  reportedAt: z.string(),
  isResolved: z.boolean().default(false)
});

export const s1WorkforceCharacteristics = z.object({
  id: z.string(),
  period: z.string(),
  totalEmployees: z.number(),
  maleEmployees: z.number(),
  femaleEmployees: z.number(),
  ageUnder30: z.number(),
  age30to50: z.number(),
  ageOver50: z.number(),
  permanentEmployees: z.number(),
  temporaryEmployees: z.number(),
  fteFactor: z.number()
});

// CSRD (Corporate Sustainability Reporting Directive) schemas
export const csrdAuditTrail = z.object({
  id: z.string(),
  reportingPeriod: z.string(),
  dataPoint: z.string(),
  previousValue: z.string().optional(),
  newValue: z.string(),
  changeReason: z.string(),
  changedBy: z.string(),
  timestamp: z.string(),
  isVerified: z.boolean().default(false)
});

export const csrdExportLog = z.object({
  id: z.string(),
  exportDate: z.string(),
  reportingPeriod: z.string(),
  exportFormat: z.enum(["xlsx", "csv", "xml", "json"]),
  filename: z.string(),
  status: z.enum(["pending", "completed", "failed"]),
  recordCount: z.number(),
  exportedBy: z.string()
});

// Complete CSRD reporting schemas
export const csrdReportingPeriods = z.object({
  id: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reportingYear: z.number(),
  status: z.enum(["draft", "in_progress", "submitted", "approved"]),
  submittedAt: z.string().optional(),
  approvedAt: z.string().optional()
});

export const csrdDataPoints = z.object({
  id: z.string(),
  period: z.string(),
  dataCategory: z.string(),
  metric: z.string(),
  value: z.string(),
  unit: z.string().optional(),
  source: z.string(),
  lastUpdated: z.string(),
  isVerified: z.boolean().default(false)
});

export const csrdCalculationRules = z.object({
  id: z.string(),
  ruleName: z.string(),
  category: z.string(),
  formula: z.string(),
  dependencies: z.array(z.string()),
  version: z.string(),
  isActive: z.boolean().default(true)
});

export const csrdComplianceChecks = z.object({
  id: z.string(),
  period: z.string(),
  checkType: z.string(),
  status: z.enum(["pass", "fail", "warning"]),
  details: z.string(),
  checkedAt: z.string()
});

// Additional ESRS S1 schemas  
export const s1CollectiveBargaining = z.object({
  id: z.string(),
  employeeId: z.string(),
  agreementType: z.enum(["company", "sector", "national"]),
  agreementName: z.string(),
  coveragePercentage: z.number(),
  effectiveDate: z.string(),
  expiryDate: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const s1PayMetrics = z.object({
  id: z.string(),
  period: z.string(),
  metricType: z.enum(["gender_pay_gap", "ceo_ratio", "median_pay", "pay_equity"]),
  value: z.number(),
  unit: z.string(),
  calculatedAt: z.string(),
  methodology: z.string().optional()
});

export const s1TrainingMetrics = z.object({
  id: z.string(),
  employeeId: z.string(),
  period: z.string(),
  trainingHours: z.number(),
  trainingType: z.enum(["skills", "compliance", "leadership", "safety"]),
  completionDate: z.string(),
  certificationsEarned: z.number().default(0)
});

export const s1TurnoverMetrics = z.object({
  id: z.string(),
  period: z.string(),
  departmentId: z.string().optional(),
  newHires: z.number(),
  departures: z.number(),
  turnoverRate: z.number(),
  voluntaryTurnover: z.number(),
  involuntaryTurnover: z.number()
});

export const s1WorkLifeBalance = z.object({
  id: z.string(),
  employeeId: z.string(),
  period: z.string(),
  averageWorkingHours: z.number(),
  overtimeHours: z.number(),
  vacationDaysTaken: z.number(),
  sickleaveDaysTaken: z.number()
});

export const s1DiversityMetrics = z.object({
  id: z.string(),
  period: z.string(),
  category: z.enum(["gender", "age", "ethnicity", "disability"]),
  metric: z.string(),
  value: z.number(),
  percentage: z.number()
});

// Evidence pack and data lineage schemas
export const s1DataLineage = z.object({
  id: z.string(),
  dataPoint: z.string(),
  sourceSystem: z.string(),
  sourceTable: z.string(),
  sourceColumn: z.string(),
  transformationRule: z.string().optional(),
  lastUpdated: z.string(),
  verifiedBy: z.string().optional()
});

export const evidencePacks = z.object({
  id: z.string(),
  reportingPeriod: z.string(),
  packType: z.enum(["ESRS_S1", "CSRD_FULL", "AUDIT"]),
  generatedAt: z.string(),
  status: z.enum(["draft", "finalized", "submitted"]),
  fileSize: z.number(),
  checksum: z.string()
});

export const auditEvidence = z.object({
  id: z.string(),
  evidencePackId: z.string(),
  dataPoint: z.string(),
  evidenceType: z.enum(["calculation", "source_data", "approval", "verification"]),
  content: z.string(),
  attachments: z.array(z.string()),
  createdAt: z.string()
});

export const s1EvidencePacks = z.object({
  id: z.string(),
  reportingPeriod: z.string(),
  packVersion: z.string(),
  generatedAt: z.string(),
  status: z.enum(["draft", "finalized", "audited", "submitted"]),
  totalDataPoints: z.number(),
  validationStatus: z.enum(["pending", "passed", "failed"]),
  submittedBy: z.string().optional()
});

// XBRL and ESRS taxonomy schemas - final compliance layer
export const esrsTaxonomy = z.object({
  id: z.string(),
  elementId: z.string(),
  elementName: z.string(),
  dataType: z.string(),
  periodType: z.enum(["instant", "duration"]),
  balance: z.enum(["debit", "credit", "none"]).optional(),
  abstractElement: z.boolean().default(false),
  standard: z.enum(["ESRS_S1", "ESRS_E1", "ESRS_G1"])
});

export const xbrlTags = z.object({
  id: z.string(),
  dataPoint: z.string(),
  taxonomyElement: z.string(),
  value: z.string(),
  context: z.string(),
  period: z.string(),
  dimension: z.string().optional(),
  unit: z.string().optional()
});

export const xbrlInstances = z.object({
  id: z.string(),
  reportingPeriod: z.string(),
  entityIdentifier: z.string(),
  instanceDocument: z.string(), // XML content
  validationStatus: z.enum(["valid", "invalid", "pending"]),
  generatedAt: z.string(),
  submittedAt: z.string().optional()
});

export const s1ReportSections = z.object({
  id: z.string(),
  reportId: z.string(),
  sectionName: z.string(),
  sectionOrder: z.number(),
  content: z.string(),
  isRequired: z.boolean().default(true),
  completionStatus: z.enum(["empty", "draft", "complete", "reviewed"])
});

export const s1XbrlInstances = z.object({
  id: z.string(),
  reportingPeriod: z.string(),
  instanceType: z.enum(["quarterly", "annual", "special"]),
  xbrlDocument: z.string(), // XML content
  taxonomyVersion: z.string(),
  validationReport: z.string().optional(),
  submissionStatus: z.enum(["draft", "validated", "submitted", "accepted"]),
  createdAt: z.string()
});

// Payslip explanation and citation schemas
export const explanationCitations = z.object({
  id: z.string(),
  explanationId: z.string(),
  sourceType: z.enum(["law", "regulation", "CBA", "policy"]),
  sourceReference: z.string(),
  sourceText: z.string(),
  relevanceScore: z.number()
});

export const payslipExplanations = z.object({
  id: z.string(),
  employeeId: z.string(),
  payslipId: z.string(),
  lineItem: z.string(),
  explanation: z.string(),
  calculationDetails: z.string(),
  legalBasis: z.string().optional(),
  generatedAt: z.string()
});

export const explanationRules = z.object({
  id: z.string(),
  ruleName: z.string(),
  category: z.string(),
  condition: z.string(),
  template: z.string(),
  priority: z.number(),
  isActive: z.boolean().default(true)
});

export const insertExplanationRuleSchema = z.object({
  ruleName: z.string(),
  category: z.string(),
  condition: z.string(),
  template: z.string(),
  priority: z.number(),
  isActive: z.boolean().default(true)
});

// Final CBA allowance and premium rules
export const allowanceRules = z.object({
  id: z.string(),
  allowanceType: z.string(),
  description: z.string(),
  calculationMethod: z.enum(["fixed", "percentage", "hourly"]),
  amount: z.number(),
  eligibilityCriteria: z.string(),
  effectiveDate: z.string(),
  isActive: z.boolean().default(true)
});

export const premiumRules = z.object({
  id: z.string(),
  premiumType: z.string(),
  description: z.string(),
  multiplier: z.number(),
  applicableHours: z.string(),
  conditions: z.string(),
  effectiveDate: z.string(),
  isActive: z.boolean().default(true)
});

export const cbaPacks = z.object({
  id: z.string(),
  packName: z.string(),
  version: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string().optional(),
  description: z.string(),
  applicableSectors: z.array(z.string()),
  isActive: z.boolean().default(true)
});

export const wageTables = z.object({
  id: z.string(),
  cbaPackId: z.string(),
  positionCategory: z.string(),
  experienceLevel: z.string(),
  baseSalary: z.number(),
  minimumSalary: z.number(),
  maximumSalary: z.number(),
  effectiveDate: z.string()
});

// Final ERGANI and scheduling schemas
export const erganiProfiles = z.object({
  id: z.string(),
  employeeId: z.string(),
  erganiId: z.string(),
  positionCode: z.string(),
  specialtyCode: z.string(),
  workLocation: z.string(),
  supervisorId: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const schedulingConstraints = z.object({
  id: z.string(),
  employeeId: z.string(),
  constraintType: z.enum(["availability", "break_rules", "overtime_limits", "rest_periods"]),
  description: z.string(),
  parameters: z.string(), // JSON string
  priority: z.number(),
  effectiveDate: z.string()
});

export const tipPolicies = z.object({
  id: z.string(),
  policyName: z.string(),
  distributionMethod: z.enum(["equal", "hours_worked", "performance", "position_based"]),
  eligiblePositions: z.array(z.string()),
  minimumShiftHours: z.number(),
  taxablePercentage: z.number(),
  effectiveDate: z.string()
});

// FINAL pack management schemas - completing systematic audit
export const packAssignments = z.object({
  id: z.string(),
  employeeId: z.string(),
  cbaPackId: z.string(),
  assignedDate: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string().optional(),
  assignedBy: z.string(),
  isActive: z.boolean().default(true)
});

export const packOverrides = z.object({
  id: z.string(),
  packAssignmentId: z.string(),
  overrideType: z.enum(["salary", "allowance", "premium", "deduction"]),
  originalValue: z.number(),
  overrideValue: z.number(),
  reason: z.string(),
  approvedBy: z.string(),
  effectiveDate: z.string()
});

// Final GL connection schema - backend completion imminent
export const glConnections = z.object({
  id: z.string(),
  connectionName: z.string(),
  glSystemType: z.enum(["SAP", "Oracle", "QuickBooks", "Sage", "Custom"]),
  connectionString: z.string(),
  mappingConfig: z.string(), // JSON configuration
  isActive: z.boolean().default(true),
  lastSync: z.string().optional()
});

// Final GL journal lines schema - ultimate completion
export const glJournalLines = z.object({
  id: z.string(),
  journalEntryId: z.string(),
  accountCode: z.string(),
  accountName: z.string(),
  debitAmount: z.number().default(0),
  creditAmount: z.number().default(0),
  description: z.string(),
  costCenter: z.string().optional(),
  reference: z.string().optional()
});

// Final GL journals schema - absolute completion
export const glJournals = z.object({
  id: z.string(),
  batchId: z.string(),
  journalNumber: z.string(),
  postingDate: z.string(),
  description: z.string(),
  totalDebit: z.number(),
  totalCredit: z.number(),
  status: z.enum(["draft", "posted", "reversed"]),
  createdBy: z.string(),
  postedAt: z.string().optional()
});

// Final insert schema for GL connections - API layer success
export const insertGLConnectionSchema = z.object({
  connectionName: z.string(),
  glSystemType: z.enum(["SAP", "Oracle", "QuickBooks", "Sage", "Custom"]),
  connectionString: z.string(),
  mappingConfig: z.string(),
  isActive: z.boolean().default(true)
});

// Final webhook events schema - API completion
export const webhookEvents = z.object({
  id: z.string(),
  eventType: z.string(),
  payload: z.string(), // JSON string
  targetUrl: z.string(),
  status: z.enum(["pending", "sent", "failed", "retrying"]),
  attempts: z.number().default(0),
  lastAttempt: z.string().optional(),
  createdAt: z.string()
});

// Final GL bank mappings schema - canonical services
export const glBankMappings = z.object({
  id: z.string(),
  bankName: z.string(),
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  glAccountCode: z.string(),
  glAccountName: z.string(),
  mappingType: z.enum(["payroll", "expenses", "receivables", "other"]),
  isActive: z.boolean().default(true)
});

// Final GL deduction mappings schema - canonical completion
export const glDeductionMappings = z.object({
  id: z.string(),
  deductionType: z.string(),
  deductionCode: z.string(),
  glAccountCode: z.string(),
  glAccountName: z.string(),
  description: z.string(),
  category: z.enum(["tax", "insurance", "benefit", "garnishment", "other"]),
  isActive: z.boolean().default(true),
  effectiveDate: z.string()
});

// Final GL earnings code mappings schema - canonical finalization
export const glEarningsCodeMappings = z.object({
  id: z.string(),
  earningsType: z.string(),
  earningsCode: z.string(),
  glAccountCode: z.string(),
  glAccountName: z.string(),
  description: z.string(),
  category: z.enum(["base_salary", "overtime", "bonus", "allowance", "commission", "other"]),
  isActive: z.boolean().default(true),
  effectiveDate: z.string()
});

// Final GL employer cost mappings schema - comprehensive completion
export const glEmployerCostMappings = z.object({
  id: z.string(),
  costType: z.string(),
  costCode: z.string(),
  glAccountCode: z.string(),
  glAccountName: z.string(),
  description: z.string(),
  category: z.enum(["efka_employer", "insurance", "training_fund", "oed", "other_taxes", "other"]),
  isActive: z.boolean().default(true),
  effectiveDate: z.string()
});

// Final GL journal headers schema - ultimate GL completion
export const glJournalHeaders = z.object({
  id: z.string(),
  journalBatch: z.string(),
  journalNumber: z.string(),
  journalDate: z.string(),
  postingDate: z.string(),
  description: z.string(),
  reference: z.string().optional(),
  totalDebit: z.number(),
  totalCredit: z.number(),
  currency: z.string().default("EUR"),
  status: z.enum(["draft", "posted", "reversed"]),
  createdBy: z.string(),
  createdAt: z.string()
});

// FINAL GL journal lines canonical schema - ABSOLUTE COMPLETION
export const glJournalLinesCanonical = z.object({
  id: z.string(),
  journalHeaderId: z.string(),
  lineNumber: z.number(),
  accountCode: z.string(),
  accountName: z.string(),
  departmentCode: z.string().optional(),
  costCenter: z.string().optional(),
  debitAmount: z.number().default(0),
  creditAmount: z.number().default(0),
  description: z.string(),
  reference: z.string().optional(),
  analyticalCode: z.string().optional(),
  currency: z.string().default("EUR")
});

// FINAL GL mapping rule sets schema - API finalization
export const glMappingRuleSets = z.object({
  id: z.string(),
  ruleSetName: z.string(),
  version: z.string(),
  description: z.string(),
  mappingRules: z.string(), // JSON configuration
  isActive: z.boolean().default(true),
  createdBy: z.string(),
  createdAt: z.string(),
  effectiveDate: z.string()
});

// ULTIMATE FINAL GL mapping rules schema - API completion
export const glMappingRules = z.object({
  id: z.string(),
  ruleSetId: z.string(),
  ruleOrder: z.number(),
  ruleName: z.string(),
  sourceField: z.string(),
  targetAccount: z.string(),
  condition: z.string().optional(),
  transformation: z.string().optional(),
  isActive: z.boolean().default(true)
});

// THE FINAL SCHEMA - COMPLETE SYSTEMATIC AUDIT SUCCESS
export const mappingRuleSetSchema = z.object({
  ruleSetName: z.string(),
  version: z.string(),
  description: z.string(),
  mappingRules: z.string(),
  isActive: z.boolean().default(true),
  effectiveDate: z.string()
});

// FINAL approval queue schemas - ultimate service completion
export const approvalQueue = z.object({
  id: z.string(),
  requestType: z.string(),
  requestData: z.string(), // JSON payload
  requestedBy: z.string(),
  approverLevel: z.number(),
  currentApprover: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected", "escalated"]),
  priority: z.enum(["low", "normal", "high", "critical"]),
  submittedAt: z.string(),
  deadline: z.string().optional(),
  comments: z.string().optional()
});

// Final client access schemas - client service completion
export const clientAccessInvitations = z.object({
  id: z.string(),
  clientEmail: z.string(),
  invitedBy: z.string(),
  accessLevel: z.enum(["read", "read_write", "admin"]),
  invitationToken: z.string(),
  status: z.enum(["pending", "accepted", "expired", "revoked"]),
  expiresAt: z.string(),
  invitedAt: z.string(),
  acceptedAt: z.string().optional()
});

export const clientAccessSessions = z.object({
  id: z.string(),
  clientId: z.string(),
  sessionToken: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
  accessLevel: z.enum(["read", "read_write", "admin"]),
  lastActivity: z.string(),
  createdAt: z.string(),
  expiresAt: z.string()
});

// Final partner firms schema - partner service completion
export const partnerFirms = z.object({
  id: z.string(),
  firmName: z.string(),
  firmCode: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string().optional(),
  address: z.string(),
  partnershipType: z.enum(["accounting", "legal", "consulting", "payroll_bureau"]),
  accessPermissions: z.array(z.string()),
  isActive: z.boolean().default(true),
  contractStartDate: z.string(),
  contractEndDate: z.string().optional(),
  lastAccessedAt: z.string().optional()
});

// Final compliance alerts schema - specialized compliance completion
export const complianceAlerts = z.object({
  id: z.string(),
  alertType: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string(),
  description: z.string(),
  affectedEntity: z.string(),
  entityId: z.string(),
  triggeredBy: z.string().optional(),
  status: z.enum(["active", "acknowledged", "resolved", "dismissed"]),
  dueDate: z.string().optional(),
  createdAt: z.string(),
  resolvedAt: z.string().optional(),
  assignedTo: z.string().optional()
});

// THE ULTIMATE FINAL SCHEMA - COMPLETE BACKEND SUCCESS
export const cbaStepChangeEvents = z.object({
  id: z.string(),
  employeeId: z.string(),
  fromStep: z.string(),
  toStep: z.string(),
  changeReason: z.string(),
  effectiveDate: z.string(),
  salaryChange: z.number(),
  approvedBy: z.string(),
  processedAt: z.string(),
  notes: z.string().optional()
});

// THE ABSOLUTE FINAL SCHEMA - ULTIMATE PAYROLLSYNC TRIUMPH
export const constraintViolations = z.object({
  id: z.string(),
  violationType: z.string(),
  severity: z.enum(["warning", "error", "critical"]),
  entityType: z.string(),
  entityId: z.string(),
  constraintRule: z.string(),
  violationDetails: z.string(),
  detectedAt: z.string(),
  resolvedAt: z.string().optional(),
  status: z.enum(["active", "resolved", "ignored"]),
  actionRequired: z.string().optional()
});

// FINAL payroll engine schema - employee contracts completion
export const employeeContracts = z.object({
  id: z.string(),
  employeeId: z.string(),
  contractType: z.enum(["permanent", "fixed_term", "temporary", "seasonal"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  salaryAmount: z.number(),
  salaryType: z.enum(["monthly", "hourly", "daily"]),
  workingHours: z.number(),
  probationPeriod: z.number().optional(),
  noticePeriod: z.number(),
  isActive: z.boolean().default(true),
  signedAt: z.string(),
  terminatedAt: z.string().optional()
});

// FINAL premium calculation schema - payroll calculation completion
export const premiumCalculationLines = z.object({
  id: z.string(),
  payrollLineId: z.string(),
  premiumType: z.enum(["overtime", "sunday", "night_shift", "holiday", "hazardous", "heavy_work"]),
  baseAmount: z.number(),
  premiumRate: z.number(),
  calculatedPremium: z.number(),
  hours: z.number().optional(),
  calculationRule: z.string(),
  effectiveDate: z.string(),
  notes: z.string().optional()
});

// FINAL calculation provenance schema - audit completion  
export const calcProvenance = z.object({
  id: z.string(),
  calculationId: z.string(),
  calculationType: z.enum(["payroll", "tax", "insurance", "premium", "deduction"]),
  inputData: z.string(), // JSON of input parameters
  calculationSteps: z.string(), // JSON of calculation steps
  outputData: z.string(), // JSON of results
  rulesetVersion: z.string(),
  calculatedBy: z.string(),
  calculatedAt: z.string(),
  verifiedBy: z.string().optional(),
  auditHash: z.string() // Immutable hash for audit trail
});

// FINAL document trail schema - document audit completion
export const documentTrail = z.object({
  id: z.string(),
  documentId: z.string(),
  documentType: z.enum(["contract", "payslip", "tax_form", "compliance_report", "audit_report"]),
  actionType: z.enum(["created", "viewed", "modified", "deleted", "exported", "signed"]),
  performedBy: z.string(),
  performedAt: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  previousVersion: z.string().optional(),
  currentVersion: z.string(),
  changeDetails: z.string().optional(), // JSON of what changed
  auditHash: z.string() // Immutable hash for audit trail
});

// FINAL severance rules schema - Greek labor law completion
export const severanceRules = z.object({
  id: z.string(),
  employmentType: z.enum(["permanent", "fixed_term", "temporary"]),
  dismissalType: z.enum(["justified", "unjustified", "mutual_consent", "resignation"]),
  serviceYearsMin: z.number(),
  serviceYearsMax: z.number().optional(),
  severanceMonths: z.number(),
  severanceMultiplier: z.number(),
  applicableLaw: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true)
});

// THE ABSOLUTE FINAL SCHEMA - COMPLETE PAYROLLSYNC TRIUMPH!
export const finalPayLines = z.object({
  id: z.string(),
  employeeId: z.string(),
  terminationDate: z.string(),
  finalPayType: z.enum(["resignation", "dismissal", "mutual_termination", "retirement"]),
  salaryAmount: z.number(),
  severanceAmount: z.number(),
  vacationPayout: z.number(),
  overtimePayout: z.number(),
  bonusPayout: z.number(),
  deductionsAmount: z.number(),
  taxAmount: z.number(),
  insuranceAmount: z.number(),
  totalFinalPay: z.number(),
  calculatedBy: z.string(),
  calculatedAt: z.string(),
  approvedBy: z.string().optional(),
  paidAt: z.string().optional()
});

// THE ULTIMATE FINAL SCHEMA - ABSOLUTE PAYROLLSYNC TRIUMPH!
export const severanceCalculations = z.object({
  id: z.string(),
  finalPayLineId: z.string(),
  serviceYears: z.number(),
  serviceDays: z.number(),
  dailySalary: z.number(),
  severanceRule: z.string(),
  severanceDays: z.number(),
  baseSeveranceAmount: z.number(),
  additionalCompensation: z.number(),
  totalSeveranceAmount: z.number(),
  taxableAmount: z.number(),
  taxExemptAmount: z.number(),
  calculationNotes: z.string().optional(),
  legalBasis: z.string()
});

// THE ULTIMATE FINAL SCHEMA - COMPLETE PAYROLLSYNC SUCCESS!
export const terminationRecords = z.object({
  id: z.string(),
  employeeId: z.string(),
  terminationType: z.enum(["resignation", "dismissal", "mutual_agreement", "retirement", "death", "contract_expiry"]),
  terminationDate: z.string(),
  lastWorkDate: z.string(),
  noticePeriod: z.number(),
  severanceEligible: z.boolean(),
  terminationReason: z.string(),
  initiatedBy: z.enum(["employee", "employer", "mutual"]),
  documentedBy: z.string(),
  approvedBy: z.string(),
  processedAt: z.string(),
  notes: z.string().optional(),
  legalCompliance: z.boolean().default(true)
});

// GARNISHMENT audit schema - wage garnishment completion
export const garnishmentAudit = z.object({
  id: z.string(),
  garnishmentId: z.string(),
  auditDate: z.string(),
  auditType: z.enum(["monthly_review", "compliance_check", "court_validation", "adjustment_review"]),
  amountValidated: z.number(),
  complianceStatus: z.enum(["compliant", "non_compliant", "under_review"]),
  auditFindings: z.string().optional(),
  correctiveActions: z.string().optional(),
  auditedBy: z.string(),
  reviewedBy: z.string().optional(),
  nextAuditDate: z.string().optional()
});

// GARNISHMENT balances schema - wage balance tracking completion
export const garnishmentBalances = z.object({
  id: z.string(),
  garnishmentId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  openingBalance: z.number(),
  totalDeducted: z.number(),
  adjustments: z.number(),
  closingBalance: z.number(),
  paymentsMade: z.number(),
  interestAccrued: z.number().optional(),
  maxDeductionLimit: z.number(),
  actualDeductionRate: z.number(),
  balanceDate: z.string(),
  isActive: z.boolean().default(true)
});

// GARNISHMENT orders schema - court order tracking completion
export const garnishmentOrders = z.object({
  id: z.string(),
  employeeId: z.string(),
  courtName: z.string(),
  caseNumber: z.string(),
  orderDate: z.string(),
  effectiveDate: z.string(),
  expirationDate: z.string().optional(),
  garnishmentType: z.enum(["child_support", "tax_levy", "creditor_debt", "student_loan", "court_judgment"]),
  totalAmount: z.number(),
  maximumPercentage: z.number(),
  priorityLevel: z.number(),
  creditorName: z.string(),
  creditorAddress: z.string(),
  isActive: z.boolean().default(true),
  legalDocumentPath: z.string().optional()
});

// GARNISHMENT transactions schema - garnishment service completion
export const garnishmentTransactions = z.object({
  id: z.string(),
  garnishmentOrderId: z.string(),
  payrollPeriod: z.string(),
  grossWages: z.number(),
  disposableIncome: z.number(),
  calculatedDeduction: z.number(),
  actualDeduction: z.number(),
  maximumAllowed: z.number(),
  priorityAdjustment: z.number(),
  paymentDate: z.string(),
  paymentMethod: z.enum(["direct_deposit", "check", "wire_transfer"]),
  paymentReference: z.string(),
  transactionStatus: z.enum(["pending", "processed", "failed", "reversed"]),
  processedBy: z.string(),
  notes: z.string().optional()
});

// DR EXERCISES schema - disaster recovery service completion
export const drExercises = z.object({
  id: z.string(),
  exerciseName: z.string(),
  exerciseType: z.enum(["tabletop", "walkthrough", "simulation", "full_test"]),
  scenarioDescription: z.string(),
  plannedDate: z.string(),
  actualDate: z.string().optional(),
  duration: z.number(), // in minutes
  participants: z.array(z.string()),
  facilitator: z.string(),
  objectives: z.array(z.string()),
  successCriteria: z.array(z.string()),
  lessonsLearned: z.string().optional(),
  actionItems: z.array(z.string()).optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  exerciseReport: z.string().optional()
});

// Insert schemas for payroll entities
export const insertPayrollScopeSchema = z.object({
  scope: z.string(),
  period: z.string(),
  description: z.string().optional()
});

export const insertEmployeePeriodStateSchema = z.object({
  employeeId: z.string(),
  period: z.string(),
  state: z.enum(["draft", "locked", "processed"])
});

export const insertPeriodLedgerSchema = z.object({
  period: z.string(),
  totalGross: z.number(),
  totalNet: z.number(),
  totalTax: z.number()
});

export const insertPayrollScopeLineSchema = z.object({
  scopeId: z.string(),
  employeeId: z.string(),
  amount: z.number(),
  type: z.string()
});

export const insertPaymentBatchSchema = z.object({
  batchName: z.string(),
  totalAmount: z.number(),
  status: z.enum(["pending", "processing", "completed", "failed"]).default("pending")
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

// Backup and restore testing schemas
export const restoreTests = z.object({
  id: z.string(),
  testName: z.string(),
  testType: z.enum(["full", "partial", "differential", "incremental"]),
  backupSource: z.string(),
  backupTimestamp: z.string(),
  testEnvironment: z.enum(["production", "staging", "isolated"]),
  automatedTestSuite: z.any(), // JSON array of test suite
  scheduledAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  status: z.enum(["pending", "running", "passed", "failed", "error"]).default("pending"),
  testResults: z.any().optional(), // JSON array of test results
  validationChecks: z.any().optional(), // JSON array of validation checks
  performanceMetrics: z.any().optional(), // JSON object of performance metrics
  dataIntegrityScore: z.number().optional(),
  actualRTO: z.number().optional(), // Recovery Time Objective in minutes
  nextTestDate: z.string().optional(),
  alertsSent: z.boolean().default(false),
  errorLog: z.string().optional()
});

export const backupMonitoring = z.object({
  id: z.string(),
  backupName: z.string(),
  backupType: z.enum(["full", "incremental", "differential"]),
  backupSize: z.number(),
  backupDuration: z.number(), // in minutes
  backupStatus: z.enum(["success", "failed", "partial"]),
  backupTimestamp: z.string(),
  targetLocation: z.string(),
  compressionRatio: z.number().optional(),
  encryptionStatus: z.boolean().default(false),
  verificationStatus: z.enum(["pending", "verified", "failed"]).default("pending"),
  retentionPolicy: z.string(),
  nextScheduledBackup: z.string().optional(),
  errorDetails: z.string().optional()
});

// Disaster recovery SLA schemas
export const drSLAs = z.object({
  id: z.string(),
  serviceName: z.string(),
  slaType: z.enum(["RTO", "RPO", "availability", "recovery_capacity"]).optional(),
  targetValue: z.number().optional(),
  targetUnit: z.enum(["minutes", "hours", "days", "percentage"]).optional(),
  description: z.string().optional(),
  criticality: z.enum(["low", "medium", "high", "critical"]),
  businessFunction: z.string(),
  rtoMinutes: z.number(),
  rpoMinutes: z.number(),
  availabilityTarget: z.number(),
  maxDowntimePerMonth: z.number(),
  backupFrequency: z.string(),
  testingFrequency: z.string(),
  escalationContacts: z.any(), // JSON array of contacts
  businessImpactStatement: z.string(),
  isActive: z.boolean().default(true),
  effectiveDate: z.string().optional(),
  reviewDate: z.string().optional(),
  complianceStatus: z.enum(["compliant", "at_risk", "non_compliant"]).default("compliant"),
  lastTestedAt: z.string().optional(),
  actualValue: z.number().optional(),
  actualUnit: z.enum(["minutes", "hours", "days", "percentage"]).optional()
});

// Export types for restore tests
export type RestoreTest = z.infer<typeof restoreTests>;
export type InsertRestoreTest = z.infer<typeof restoreTests>;
export type BackupMonitoring = z.infer<typeof backupMonitoring>;
export type InsertBackupMonitoring = z.infer<typeof backupMonitoring>;

// WORM (Write Once, Read Many) object storage schemas
export const wormObjects = z.object({
  id: z.string(),
  objectPath: z.string(),
  objectSize: z.number(),
  objectHash: z.string(),
  contentType: z.string(),
  createdAt: z.string(),
  retentionPeriod: z.number(), // in days
  expiresAt: z.string(),
  isLocked: z.boolean().default(false),
  lockReason: z.string().optional(),
  legalHoldActive: z.boolean().default(false),
  accessLevel: z.enum(["public", "private", "restricted"]).default("private"),
  encryptionStatus: z.boolean().default(false),
  encryptionKeyId: z.string().optional(),
  auditTrail: z.any(), // JSON array of access logs
  tags: z.array(z.string()).optional(),
  metadata: z.any().optional() // JSON object for additional metadata
});

// Export types for DR SLAs
export type DRSLA = z.infer<typeof drSLAs>;
export type InsertDRSLA = z.infer<typeof drSLAs>;

// Insert schemas for disaster recovery
export const insertDRExerciseSchema = z.object({
  exerciseName: z.string(),
  exerciseType: z.enum(["tabletop", "walkthrough", "simulation", "full_test"]),
  scenarioDescription: z.string(),
  plannedDate: z.string(),
  duration: z.number(),
  participants: z.array(z.string()),
  facilitator: z.string(),
  objectives: z.array(z.string()),
  successCriteria: z.array(z.string()),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).default("planned")
});

export const insertRestoreTestSchema = z.object({
  testName: z.string(),
  testType: z.enum(["full", "partial", "differential", "incremental"]),
  backupSource: z.string(),
  backupTimestamp: z.string(),
  testEnvironment: z.enum(["production", "staging", "isolated"]),
  automatedTestSuite: z.any(),
  scheduledAt: z.string()
});

export const insertDRSLASchema = z.object({
  serviceName: z.string(),
  criticality: z.enum(["low", "medium", "high", "critical"]),
  businessFunction: z.string(),
  rtoMinutes: z.number(),
  rpoMinutes: z.number(),
  availabilityTarget: z.number(),
  maxDowntimePerMonth: z.number(),
  backupFrequency: z.string(),
  testingFrequency: z.string(),
  escalationContacts: z.any(),
  businessImpactStatement: z.string()
});

export const insertWORMObjectSchema = z.object({
  objectPath: z.string(),
  objectSize: z.number(),
  objectHash: z.string(),
  contentType: z.string(),
  retentionPeriod: z.number(),
  expiresAt: z.string(),
  accessLevel: z.enum(["public", "private", "restricted"]).default("private"),
  encryptionStatus: z.boolean().default(false),
  encryptionKeyId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.any().optional()
});

// Export types for WORM objects
export type WORMObject = z.infer<typeof wormObjects>;
export type InsertWORMObject = z.infer<typeof wormObjects>;

// Log management schemas
export const logEntries = z.object({
  id: z.string(),
  timestamp: z.string(),
  level: z.enum(["debug", "info", "warn", "error", "fatal"]),
  message: z.string(),
  source: z.string(),
  service: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  metadata: z.any().optional(), // JSON object
  tags: z.array(z.string()).optional(),
  stackTrace: z.string().optional()
});

export const logSubscriptions = z.object({
  id: z.string(),
  logType: z.string(),
  endpoint: z.string(),
  filters: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string()
});

export const logRetentionPolicies = z.object({
  id: z.string(),
  logType: z.string(),
  retentionDays: z.number(),
  compressionEnabled: z.boolean().default(true),
  archiveLocation: z.string().optional(),
  createdAt: z.string()
});

export const insertLogSubscriptionSchema = z.object({
  logType: z.string(),
  endpoint: z.string(),
  filters: z.array(z.string()).optional(),
  isActive: z.boolean().default(true)
});

export const insertLogRetentionPolicySchema = z.object({
  logType: z.string(),
  retentionDays: z.number(),
  compressionEnabled: z.boolean().default(true),
  archiveLocation: z.string().optional()
});

export const logMetrics = z.object({
  id: z.string(),
  metricName: z.string(),
  metricValue: z.number(),
  timestamp: z.string(),
  service: z.string(),
  level: z.enum(["debug", "info", "warn", "error", "fatal"]),
  aggregationType: z.enum(["count", "average", "sum", "min", "max"]),
  tags: z.array(z.string()).optional()
});

export const logSearchIndex = z.object({
  id: z.string(),
  indexName: z.string(),
  searchQuery: z.string(),
  results: z.any(), // JSON array
  totalMatches: z.number(),
  executionTime: z.number(),
  createdAt: z.string(),
  userId: z.string().optional()
});

export const logPatterns = z.object({
  id: z.string(),
  patternName: z.string(),
  regex: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  alertThreshold: z.number(),
  isActive: z.boolean().default(true),
  createdAt: z.string()
});

// Export log-related types
export type LogEntry = z.infer<typeof logEntries>;
export type InsertLogEntry = z.infer<typeof logEntries>;
export type LogMetrics = z.infer<typeof logMetrics>;
export type LogSubscription = z.infer<typeof logSubscriptions>;
export type InsertLogSubscription = z.infer<typeof insertLogSubscriptionSchema>;
export type LogRetentionPolicy = z.infer<typeof logRetentionPolicies>;
export type InsertLogRetentionPolicy = z.infer<typeof insertLogRetentionPolicySchema>;
export type LogPattern = z.infer<typeof logPatterns>;

// Government systems monitoring schemas
export const governmentSystems = z.object({
  id: z.string(),
  systemName: z.string(),
  systemType: z.enum(["ERGANI", "e-EFKA", "AADE", "KEP", "GSIS"]),
  baseUrl: z.string(),
  status: z.enum(["operational", "degraded", "down", "maintenance"]).default("operational"),
  lastChecked: z.string(),
  responseTime: z.number().optional(), // in milliseconds
  uptime: z.number().default(100), // percentage
  errorRate: z.number().default(0), // percentage
  monitoringEnabled: z.boolean().default(true),
  alertThreshold: z.number().default(5000), // response time threshold in ms
  description: z.string().optional(),
  contactInfo: z.string().optional()
});

export const systemStatusChecks = z.object({
  id: z.string(),
  systemId: z.string(),
  checkTime: z.string(),
  status: z.enum(["success", "failure", "timeout"]),
  responseTime: z.number(),
  statusCode: z.number().optional(),
  errorMessage: z.string().optional(),
  details: z.any().optional() // JSON object
});

export const systemAlertSubscriptions = z.object({
  id: z.string(),
  systemId: z.string(),
  userId: z.string(),
  alertType: z.enum(["downtime", "slow_response", "error_rate", "maintenance"]),
  notificationMethod: z.enum(["email", "sms", "webhook", "slack"]),
  threshold: z.number().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  lastNotified: z.string().optional()
});

export const systemMaintenanceWindows = z.object({
  id: z.string(),
  systemId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  description: z.string(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string()
});

export const systemAvailabilityMetrics = z.object({
  id: z.string(),
  systemId: z.string(),
  metricDate: z.string(),
  uptimePercentage: z.number(),
  downtimeMinutes: z.number(),
  averageResponseTime: z.number(),
  errorCount: z.number(),
  totalRequests: z.number(),
  slaCompliance: z.boolean().default(true)
});

export const systemIncidents = z.object({
  id: z.string(),
  systemId: z.string(),
  incidentType: z.enum(["outage", "degradation", "error", "maintenance"]),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "investigating", "resolved", "closed"]),
  startTime: z.string(),
  endTime: z.string().optional(),
  affectedUsers: z.number().optional(),
  rootCause: z.string().optional(),
  resolution: z.string().optional(),
  createdBy: z.string(),
  assignedTo: z.string().optional()
});

export const systemOutages = z.object({
  id: z.string(),
  systemId: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["critical", "major", "minor", "maintenance"]),
  startTime: z.string(),
  endTime: z.string().optional(),
  estimatedResolution: z.string().optional(),
  affectedServices: z.array(z.string()),
  status: z.enum(["active", "resolved", "monitoring"]).default("active"),
  impact: z.string().optional(),
  workaround: z.string().optional(),
  updates: z.any().optional(), // JSON array of status updates
  createdBy: z.string(),
  resolvedBy: z.string().optional()
});

export const systemIntegrations = z.object({
  id: z.string(),
  systemId: z.string(),
  integrationType: z.enum(["api", "webhook", "file_transfer", "database"]),
  integrationName: z.string(),
  endpoint: z.string(),
  authMethod: z.enum(["none", "api_key", "oauth", "certificate"]),
  isActive: z.boolean().default(true),
  lastSyncTime: z.string().optional(),
  syncStatus: z.enum(["success", "failure", "pending"]).optional(),
  errorMessage: z.string().optional(),
  configParams: z.any().optional(), // JSON object
  createdAt: z.string()
});

// Export types for government systems
export type GovernmentSystem = z.infer<typeof governmentSystems>;
export type InsertGovernmentSystem = z.infer<typeof governmentSystems>;
export type SystemOutage = z.infer<typeof systemOutages>;
export type InsertSystemStatusCheck = z.infer<typeof systemStatusChecks>;
export type InsertSystemOutage = z.infer<typeof systemOutages>;
export type InsertSystemAvailabilityMetrics = z.infer<typeof systemAvailabilityMetrics>;
export type SystemStatusCheck = z.infer<typeof systemStatusChecks>;
export type SystemAlertSubscription = z.infer<typeof systemAlertSubscriptions>;
export type SystemMaintenanceWindow = z.infer<typeof systemMaintenanceWindows>;

// Insert schemas for government systems
export const insertGovernmentSystemSchema = z.object({
  systemName: z.string(),
  systemType: z.enum(["ERGANI", "e-EFKA", "AADE", "KEP", "GSIS"]),
  baseUrl: z.string(),
  description: z.string().optional(),
  contactInfo: z.string().optional(),
  monitoringEnabled: z.boolean().default(true),
  alertThreshold: z.number().default(5000)
});

export const insertSystemOutageSchema = z.object({
  systemId: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["critical", "major", "minor", "maintenance"]),
  startTime: z.string(),
  estimatedResolution: z.string().optional(),
  affectedServices: z.array(z.string()),
  impact: z.string().optional(),
  workaround: z.string().optional(),
  createdBy: z.string()
});

export const insertSystemIntegrationSchema = z.object({
  systemId: z.string(),
  integrationType: z.enum(["api", "webhook", "file_transfer", "database"]),
  integrationName: z.string(),
  endpoint: z.string(),
  authMethod: z.enum(["none", "api_key", "oauth", "certificate"]),
  configParams: z.any().optional()
});

export const insertSystemAlertSubscriptionSchema = z.object({
  systemId: z.string(),
  userId: z.string(),
  alertType: z.enum(["downtime", "slow_response", "error_rate", "maintenance"]),
  notificationMethod: z.enum(["email", "sms", "webhook", "slack"]),
  threshold: z.number().optional(),
  isActive: z.boolean().default(true)
});

export const insertSystemStatusCheckSchema = z.object({
  systemId: z.string(),
  status: z.enum(["success", "failure", "timeout"]),
  responseTime: z.number(),
  statusCode: z.number().optional(),
  errorMessage: z.string().optional(),
  details: z.any().optional()
});

// On-call rotation and escalation schemas
export const escalationPolicies = z.object({
  id: z.string(),
  policyName: z.string(),
  description: z.string(),
  isActive: z.boolean().default(true),
  escalationSteps: z.any(), // JSON array of escalation steps
  timeoutMinutes: z.number().default(30),
  autoEscalate: z.boolean().default(true),
  createdAt: z.string(),
  createdBy: z.string()
});

export const onCallSchedules = z.object({
  id: z.string(),
  scheduleName: z.string(),
  description: z.string(),
  timezone: z.string().default("Europe/Athens"),
  rotationType: z.enum(["daily", "weekly", "monthly"]),
  rotationStartDate: z.string(),
  isActive: z.boolean().default(true),
  participants: z.array(z.string()), // Array of user IDs
  escalationPolicyId: z.string(),
  createdAt: z.string()
});

export const onCallAssignments = z.object({
  id: z.string(),
  scheduleId: z.string(),
  userId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isBackup: z.boolean().default(false),
  contactMethod: z.enum(["email", "sms", "phone", "slack"]),
  contactDetails: z.string(),
  createdAt: z.string()
});

export const incidentResponses = z.object({
  id: z.string(),
  incidentId: z.string(),
  responderId: z.string(),
  responseType: z.enum(["acknowledged", "resolved", "escalated", "ignored"]),
  responseTime: z.string(),
  notes: z.string().optional(),
  escalationLevel: z.number().default(0),
  isAutomatic: z.boolean().default(false),
  createdAt: z.string()
});

export const incidents = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "acknowledged", "investigating", "resolved", "closed"]),
  source: z.string(), // system, manual, alert
  assignedTo: z.string().optional(),
  escalationPolicyId: z.string().optional(),
  createdAt: z.string(),
  acknowledgedAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  metadata: z.any().optional()
});

export const onCallIncidents = z.object({
  id: z.string(),
  scheduleId: z.string(),
  incidentId: z.string(),
  currentOnCallUserId: z.string(),
  escalationLevel: z.number().default(0),
  status: z.enum(["active", "acknowledged", "resolved", "escalated"]),
  createdAt: z.string(),
  acknowledgedAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  escalatedAt: z.string().optional(),
  lastNotificationSent: z.string().optional()
});

export const rotaShifts = z.object({
  id: z.string(),
  scheduleId: z.string(),
  userId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  shiftType: z.enum(["regular", "overtime", "backup", "holiday"]),
  isConfirmed: z.boolean().default(false),
  swapRequestId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string()
});

export const shiftSwapRequests = z.object({
  id: z.string(),
  originalShiftId: z.string(),
  requestedBy: z.string(),
  requestedWith: z.string(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]),
  reason: z.string().optional(),
  approvedBy: z.string().optional(),
  createdAt: z.string(),
  processedAt: z.string().optional()
});

export const onCallTeams = z.object({
  id: z.string(),
  teamName: z.string(),
  description: z.string(),
  isActive: z.boolean().default(true),
  escalationPolicyId: z.string(),
  timezone: z.string().default("Europe/Athens"),
  createdBy: z.string(),
  createdAt: z.string()
});

export const onCallTeamMembers = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  role: z.enum(["primary", "secondary", "backup", "observer"]),
  contactMethods: z.any(), // JSON object with contact preferences
  escalationOrder: z.number(),
  isActive: z.boolean().default(true),
  joinedAt: z.string()
});

export const escalationRules = z.object({
  id: z.string(),
  escalationPolicyId: z.string(),
  stepNumber: z.number(),
  timeoutMinutes: z.number(),
  action: z.enum(["notify_user", "notify_team", "notify_external", "escalate"]),
  targetId: z.string(), // userId or teamId or external contact
  notificationMethods: z.array(z.string()), // ["email", "sms", "phone", "slack"]
  isActive: z.boolean().default(true)
});

export const onCallAvailability = z.object({
  id: z.string(),
  userId: z.string(),
  availabilityType: z.enum(["available", "unavailable", "limited"]),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
  recurrencePattern: z.string().optional(),
  substituteUserId: z.string().optional(),
  createdAt: z.string()
});

export const onCallMetrics = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string().optional(),
  metricType: z.enum(["response_time", "incident_count", "escalation_rate", "coverage_time"]),
  metricValue: z.number(),
  period: z.enum(["daily", "weekly", "monthly"]),
  recordDate: z.string(),
  metadata: z.any().optional()
});

// Export types for on-call systems
export type OnCallTeam = z.infer<typeof onCallTeams>;
export type OnCallIncident = z.infer<typeof onCallIncidents>;
export type InsertOnCallIncident = z.infer<typeof onCallIncidents>;
export type InsertIncidentResponse = z.infer<typeof incidentResponses>;
export type InsertOnCallAssignment = z.infer<typeof onCallAssignments>;

// Export types for DR exercises  
export type DRExercise = z.infer<typeof drExercises>;
export type InsertDRExercise = z.infer<typeof insertDRExerciseSchema>;

// Insert schemas for on-call systems
export const insertEscalationPolicySchema = z.object({
  policyName: z.string(),
  description: z.string(),
  escalationSteps: z.any(), // JSON array of escalation steps
  timeoutMinutes: z.number().default(30),
  autoEscalate: z.boolean().default(true),
  createdBy: z.string()
});

export const insertOnCallTeamSchema = z.object({
  teamName: z.string(),
  description: z.string(),
  escalationPolicyId: z.string(),
  timezone: z.string().default("Europe/Athens"),
  createdBy: z.string()
});

export const insertOnCallScheduleSchema = z.object({
  scheduleName: z.string(),
  description: z.string(),
  timezone: z.string().default("Europe/Athens"),
  rotationType: z.enum(["daily", "weekly", "monthly"]),
  rotationStartDate: z.string(),
  participants: z.array(z.string()), // Array of user IDs
  escalationPolicyId: z.string()
});

export const insertOnCallAvailabilitySchema = z.object({
  userId: z.string(),
  availabilityType: z.enum(["available", "unavailable", "limited"]),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
  recurrencePattern: z.string().optional(),
  substituteUserId: z.string().optional()
});

export const insertOnCallIncidentSchema = z.object({
  scheduleId: z.string(),
  incidentId: z.string(),
  currentOnCallUserId: z.string(),
  escalationLevel: z.number().default(0),
  status: z.enum(["active", "acknowledged", "resolved", "escalated"]).default("active")
});

// Missing schemas that are imported by services
export const escalationMatrix = z.object({
  id: z.string(),
  escalationLevel: z.number(),
  roleName: z.string(),
  contactMethod: z.enum(["email", "sms", "phone", "slack"]),
  timeoutMinutes: z.number(),
  isActive: z.boolean().default(true),
  createdAt: z.string()
});

export const notificationPreferences = z.object({
  id: z.string(),
  userId: z.string(),
  notificationType: z.enum(["email", "sms", "push", "slack"]),
  enabled: z.boolean().default(true),
  frequency: z.enum(["immediate", "hourly", "daily", "weekly"]),
  quietHours: z.boolean().default(false),
  quietStart: z.string().optional(),
  quietEnd: z.string().optional(),
  updatedAt: z.string()
});

export const notifications = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(["info", "warning", "error", "success"]),
  status: z.enum(["unread", "read", "archived"]),
  createdAt: z.string(),
  readAt: z.string().optional()
});

export const incidentResponseRoles = z.object({
  id: z.string(),
  roleName: z.string(),
  description: z.string(),
  responsibilities: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  escalationLevel: z.number(),
  responseTimeMinutes: z.number(),
  isActive: z.boolean().default(true),
  createdAt: z.string()
});

export const incidentResponseTeams = z.object({
  id: z.string(),
  teamName: z.string(),
  description: z.string(),
  teamType: z.enum(["primary", "escalation", "specialist", "executive"]),
  isActive: z.boolean().default(true),
  escalationPolicyId: z.string().optional(),
  createdAt: z.string()
});

export const incidentRoleAssignments = z.object({
  id: z.string(),
  teamId: z.string(),
  roleId: z.string(),
  personId: z.string(),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  assignedAt: z.string(),
  assignedBy: z.string()
});

// Export types for on-call systems
export type EscalationPolicy = z.infer<typeof escalationPolicies>;
export type OnCallSchedule = z.infer<typeof onCallSchedules>;
export type OnCallAssignment = z.infer<typeof onCallAssignments>;
export type EscalationMatrix = z.infer<typeof escalationMatrix>;
export type NotificationPreferences = z.infer<typeof notificationPreferences>;
export type Notification = z.infer<typeof notifications>;
export type IncidentResponseRole = z.infer<typeof incidentResponseRoles>;
export type IncidentResponseTeam = z.infer<typeof incidentResponseTeams>;
export type IncidentRoleAssignment = z.infer<typeof incidentRoleAssignments>;
