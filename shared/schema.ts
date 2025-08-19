import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  decimal,
  integer,
  boolean,
  date,
  jsonb,
  index,
  uuid,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties / Cost Centers table
export const properties = pgTable("properties", {
  propertyId: varchar("property_id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  geofences: jsonb("geofences").default('[]'), // Array of geofence coordinates
  costCenterCode: varchar("cost_center_code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Master Data - Complete personal and employment details
export const employees = pgTable("employees", {
  employeeId: varchar("employee_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeNumber: varchar("employee_number", { length: 50 }).unique().notNull(), // Internal employee number
  
  // Personal Data
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  afm: varchar("afm", { length: 9 }).unique(), // Greek Tax ID
  amka: varchar("amka", { length: 11 }).unique(), // Social Security Number
  paaypa: varchar("paaypa", { length: 20 }), // Unified Social Security Registry
  bankIban: varchar("bank_iban", { length: 34 }), // Bank account for salary
  dateOfBirth: date("date_of_birth"),
  nationalityCode: varchar("nationality_code", { length: 3 }).default("GRC"),
  
  // Employment Contract Data
  employmentType: varchar("employment_type", { length: 50 }).notNull(), // indefinite, fixed-term, seasonal
  grade: varchar("grade", { length: 50 }), // Job grade/level
  unionCbaRef: varchar("union_cba_ref", { length: 100 }), // Collective Bargaining Agreement reference
  hireDate: date("hire_date").notNull(),
  termDate: date("term_date"), // Termination date, null if active
  probationEndDate: date("probation_end_date"), // End of probation period
  
  // Multi-entity/Property Assignment
  defaultPropertyId: varchar("default_property_id").references(() => properties.propertyId),
  multiPropertyAccess: jsonb("multi_property_access").default('[]'), // Array of property IDs
  costCenterAllocations: jsonb("cost_center_allocations").default('[]'), // Default cost center splits
  
  // Personal Circumstances (affects allowances/taxes)
  maritalStatus: varchar("marital_status", { length: 20 }), // single, married, divorced, widowed
  dependents: integer("dependents").default(0), // Number of dependent children
  disabilityPercentage: integer("disability_percentage").default(0), // For special tax/insurance treatment
  
  // Emergency Contact
  emergencyContactName: varchar("emergency_contact_name", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 20 }),
  
  // System fields
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wage Components table - Base salary and allowances per employee
export const wageComponents = pgTable("wage_components", {
  componentId: varchar("component_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  
  // Base Wage
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(), // Monthly base salary
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }), // For hourly workers
  
  // Fixed Allowances (monthly amounts)
  foodAllowance: decimal("food_allowance", { precision: 8, scale: 2 }).default("0"),
  housingAllowance: decimal("housing_allowance", { precision: 8, scale: 2 }).default("0"),
  transportAllowance: decimal("transport_allowance", { precision: 8, scale: 2 }).default("0"),
  marriageAllowance: decimal("marriage_allowance", { precision: 8, scale: 2 }).default("0"),
  familyAllowance: decimal("family_allowance", { precision: 8, scale: 2 }).default("0"),
  educationAllowance: decimal("education_allowance", { precision: 8, scale: 2 }).default("0"),
  experienceAllowance: decimal("experience_allowance", { precision: 8, scale: 2 }).default("0"),
  positionAllowance: decimal("position_allowance", { precision: 8, scale: 2 }).default("0"),
  uniformAllowance: decimal("uniform_allowance", { precision: 8, scale: 2 }).default("0"),
  
  // Variable Pay Configuration
  tipsEligible: boolean("tips_eligible").default(false),
  tipsPoolPercentage: decimal("tips_pool_percentage", { precision: 5, scale: 2 }).default("0"), // % of tips pool
  perDiemRate: decimal("per_diem_rate", { precision: 8, scale: 2 }).default("0"), // Daily per diem amount
  
  // Overtime Configuration
  overtimeEligible: boolean("overtime_eligible").default(true),
  overtimeTier1Rate: decimal("overtime_tier1_rate", { precision: 5, scale: 2 }).default("1.25"), // 25% premium
  overtimeTier2Rate: decimal("overtime_tier2_rate", { precision: 5, scale: 2 }).default("1.50"), // 50% premium
  overtimeTier3Rate: decimal("overtime_tier3_rate", { precision: 5, scale: 2 }).default("1.75"), // 75% premium
  
  // Premium Rates
  nightPremiumRate: decimal("night_premium_rate", { precision: 5, scale: 2 }).default("0.25"), // 25% night premium
  sundayPremiumRate: decimal("sunday_premium_rate", { precision: 5, scale: 2 }).default("0.75"), // 75% Sunday premium
  holidayPremiumRate: decimal("holiday_premium_rate", { precision: 5, scale: 2 }).default("1.00"), // 100% holiday premium
  
  // Effective dates
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"), // null means current
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Department Templates for hotel operations  
export const departments = pgTable("departments", {
  departmentId: varchar("department_id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  code: varchar("code", { length: 20 }).notNull(), // FO, HK, FB, MAINT, SPA
  name: varchar("name", { length: 100 }).notNull(), // Front Office, Housekeeping, F&B, etc.
  parentDepartmentId: varchar("parent_department_id", { length: 36 }), // Will reference departmentId
  costCenterCode: varchar("cost_center_code", { length: 50 }),
  
  // Schedule Templates
  defaultShiftPatterns: jsonb("default_shift_patterns").default('[]'), // Common shift templates
  breakPolicies: jsonb("break_policies").default('{}'), // Default break rules
  overtimePolicies: jsonb("overtime_policies").default('{}'), // OT approval rules
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shift Templates and Rota Builder
export const shiftTemplates = pgTable("shift_templates", {
  templateId: varchar("template_id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").references(() => departments.departmentId).notNull(),
  name: varchar("name", { length: 100 }).notNull(), // "Morning Housekeeping", "Night Audit"
  
  // Time Configuration
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format
  duration: integer("duration_minutes").notNull(), // Total minutes
  
  // Break Configuration
  paidBreakMinutes: integer("paid_break_minutes").default(0),
  unpaidBreakMinutes: integer("unpaid_break_minutes").default(0),
  maxBreaks: integer("max_breaks").default(2),
  
  // Staffing
  minStaff: integer("min_staff").default(1),
  maxStaff: integer("max_staff").default(10),
  preferredStaff: integer("preferred_staff").default(1),
  
  // Tags for classification
  tags: jsonb("tags").default('[]'), // night, split, overtime, weekend
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shifts table - Enhanced for scheduling and overtime management
export const shifts = pgTable("shifts", {
  shiftId: varchar("shift_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  departmentId: varchar("department_id", { length: 36 }),
  templateId: varchar("template_id", { length: 36 }),
  
  // Scheduled Time
  startPlanned: timestamp("start_planned").notNull(),
  endPlanned: timestamp("end_planned").notNull(),
  
  // Actual Time (populated from punch events)
  startActual: timestamp("start_actual"),
  endActual: timestamp("end_actual"),
  
  // Assignment Details
  role: varchar("role", { length: 100 }).notNull(),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  costCenterCode: varchar("cost_center_code", { length: 50 }),
  
  // Break Configuration
  mealBreakPolicy: jsonb("meal_break_policy"), // {paidMinutes: 15, unpaidMinutes: 30, maxBreaks: 2}
  
  // Overtime and Premium Configuration
  overtimePreApproved: boolean("overtime_pre_approved").default(false),
  overtimeRequestedMinutes: integer("overtime_requested_minutes").default(0),
  overtimeApprovedMinutes: integer("overtime_approved_minutes").default(0),
  nightShiftPremium: boolean("night_shift_premium").default(false),
  sundayPremium: boolean("sunday_premium").default(false),
  holidayPremium: boolean("holiday_premium").default(false),
  
  // Status and Classification
  status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, in_progress, completed, cancelled
  tags: jsonb("tags").default('[]'), // night, split, overtime, weekend
  notes: text("notes"),
  
  // Publishing (for staff visibility)
  publishedAt: timestamp("published_at"),
  publishedBy: varchar("published_by", { length: 36 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Device Registry for anti-fraud and binding
export const deviceRegistry = pgTable("device_registry", {
  deviceId: varchar("device_id").primaryKey().default(sql`gen_random_uuid()`),
  deviceType: varchar("device_type", { length: 20 }).notNull(), // mobile, kiosk, tablet
  deviceIdentifier: varchar("device_identifier", { length: 255 }).notNull().unique(), // IMEI, MAC, etc.
  deviceName: varchar("device_name", { length: 100 }).notNull(),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  departmentId: varchar("department_id", { length: 36 }),
  
  // Geofencing Configuration
  allowedGeofences: jsonb("allowed_geofences").default('[]'), // Array of geofence IDs
  strictGeofencing: boolean("strict_geofencing").default(true),
  
  // Device Binding (for kiosks/dedicated devices)
  boundEmployees: jsonb("bound_employees").default('[]'), // Array of employee IDs for dedicated devices
  
  // Security
  lastSeenAt: timestamp("last_seen_at"),
  lastSeenLocation: jsonb("last_seen_location"), // {lat, lng}
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }),
  
  // Status
  isActive: boolean("is_active").default(true),
  isBlocked: boolean("is_blocked").default(false),
  blockReason: text("block_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Overtime Requests and Approvals
export const overtimeRequests = pgTable("overtime_requests", {
  requestId: varchar("request_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  shiftId: varchar("shift_id", { length: 36 }),
  
  // Request Details
  requestedMinutes: integer("requested_minutes").notNull(),
  reason: text("reason").notNull(),
  justification: text("justification"), // Business justification
  
  // Approval Workflow
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected, auto_approved
  approvedBy: varchar("approved_by", { length: 36 }),
  approvedAt: timestamp("approved_at"),
  approvalComments: text("approval_comments"),
  
  // Auto-approval rules
  withinPolicyLimits: boolean("within_policy_limits").default(false),
  autoApprovalRule: varchar("auto_approval_rule", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Punch Events table
export const punchEvents = pgTable("punch_events", {
  eventId: varchar("event_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // in, out, break_in, break_out
  sourceDeviceId: varchar("source_device_id", { length: 100 }),
  method: varchar("method", { length: 20 }).notNull(), // qr, nfc, kiosk, mobile, web
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  offlineFlag: boolean("offline_flag").default(false),
  signatureHash: varchar("signature_hash", { length: 255 }), // For tamper-evident logging
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_punch_events_employee_timestamp").on(table.employeeId, table.timestamp),
  index("idx_punch_events_property_timestamp").on(table.propertyId, table.timestamp),
]);

// Exceptions table
export const exceptions = pgTable("exceptions", {
  exceptionId: varchar("exception_id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // missed_in, missed_out, long_break, OT_without_approval, wrong_site
  detectedAt: timestamp("detected_at").notNull(),
  employeeId: varchar("employee_id").references(() => employees.employeeId),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  shiftId: varchar("shift_id").references(() => shifts.shiftId),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolutionCode: varchar("resolution_code", { length: 50 }),
  comments: text("comments"),
  attachments: jsonb("attachments").default('[]'), // File attachments/references
  status: varchar("status", { length: 20 }).default("open"), // open, resolved, dismissed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_exceptions_employee").on(table.employeeId),
  index("idx_exceptions_detected_at").on(table.detectedAt),
  index("idx_exceptions_status").on(table.status),
]);

// Timesheets table (derived)
export const timesheets = pgTable("timesheets", {
  timesheetId: varchar("timesheet_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  regularHours: decimal("regular_hours", { precision: 8, scale: 2 }).default("0"),
  nightHours: decimal("night_hours", { precision: 8, scale: 2 }).default("0"),
  overtimeHoursByTier: jsonb("overtime_hours_by_tier").default('{}'), // {tier1: hours, tier2: hours}
  breakMinutes: integer("break_minutes").default(0),
  leaveMinutesByType: jsonb("leave_minutes_by_type").default('{}'), // {annual: minutes, sick: minutes}
  costCenterAllocations: jsonb("cost_center_allocations").default('[]'), // [{propertyId, hours, percentage}]
  payrollStatus: varchar("payroll_status", { length: 20 }).default("pending"), // pending, approved, processed, paid
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_timesheets_employee_period").on(table.employeeId, table.periodStart, table.periodEnd),
  index("idx_timesheets_payroll_status").on(table.payrollStatus),
]);

// Compliance Alerts table
export const complianceAlerts = pgTable("compliance_alerts", {
  alertId: varchar("alert_id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // MAX_HOURS_APPROACHING, REST_PERIOD_VIOLATION, etc.
  severity: varchar("severity", { length: 20 }).notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  employeeId: varchar("employee_id").references(() => employees.employeeId),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  message: text("message").notNull(),
  details: jsonb("details").default('{}'),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
}, (table) => [
  index("idx_compliance_alerts_employee").on(table.employeeId),
  index("idx_compliance_alerts_severity").on(table.severity),
  index("idx_compliance_alerts_created").on(table.createdAt),
  index("idx_compliance_alerts_unresolved").on(table.resolvedAt),
]);

// Immutable Audit Log table
export const auditLog = pgTable("audit_log", {
  logId: varchar("log_id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  changes: jsonb("changes").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  hashChain: varchar("hash_chain", { length: 255 }).notNull(), // Hash of previous entry
  signature: varchar("signature", { length: 255 }).notNull(), // Digital signature
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_log_timestamp").on(table.timestamp),
  index("idx_audit_log_entity").on(table.entityType, table.entityId),
  index("idx_audit_log_user").on(table.userId),
  index("idx_audit_log_event_type").on(table.eventType),
]);

// ERGANI Submission Log table
export const erganiSubmissionLog = pgTable("ergani_submission_log", {
  submissionId: varchar("submission_id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").references(() => punchEvents.eventId).notNull(),
  submissionOrder: integer("submission_order").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull(), // SUCCESS, PENDING, FAILED, QUARANTINED
  erganiId: varchar("ergani_id", { length: 255 }),
  errorCode: varchar("error_code", { length: 100 }),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  requestPayload: jsonb("request_payload").notNull(),
  responsePayload: jsonb("response_payload"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow(),
  receiptStored: boolean("receipt_stored").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ergani_submission_event").on(table.eventId),
  index("idx_ergani_submission_status").on(table.status),
  index("idx_ergani_submission_order").on(table.submissionOrder),
  index("idx_ergani_submission_timestamp").on(table.submittedAt),
]);

// Data Retention Policy table
export const dataRetentionPolicy = pgTable("data_retention_policy", {
  policyId: varchar("policy_id").primaryKey().default(sql`gen_random_uuid()`),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  retentionYears: integer("retention_years").notNull(),
  description: text("description"),
  legalBasis: text("legal_basis"), // Greek law reference
  lastPurgeDate: timestamp("last_purge_date"),
  nextPurgeDate: timestamp("next_purge_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contracts table - Employment contract details
export const contracts = pgTable("contracts", {
  contractId: varchar("contract_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // indefinite, fixed_term, seasonal, trial
  grade: varchar("grade", { length: 50 }), // Job grade/level from CBA
  basePay: decimal("base_pay", { precision: 10, scale: 2 }).notNull(),
  allowancesJson: jsonb("allowances_json").default('{}'), // Structured allowances
  ftePct: decimal("fte_pct", { precision: 5, scale: 2 }).default("100"), // FTE percentage
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  cbaId: varchar("cba_id", { length: 100 }), // Collective Bargaining Agreement ID
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"), // null means current
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll Runs table - Master payroll processing batches
export const payrollRuns = pgTable("payroll_runs", {
  runId: varchar("run_id").primaryKey().default(sql`gen_random_uuid()`),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM format
  runType: varchar("run_type", { length: 20 }).notNull(), // regular, bonus, correction
  status: varchar("status", { length: 20 }).default("draft"), // draft, calculated, validated, finalized, posted
  propertyIds: jsonb("property_ids").default('[]'), // Array of property IDs included
  totalEmployees: integer("total_employees").default(0),
  totalGrossPay: decimal("total_gross_pay", { precision: 12, scale: 2 }).default("0"),
  totalTaxes: decimal("total_taxes", { precision: 12, scale: 2 }).default("0"),
  totalInsurance: decimal("total_insurance", { precision: 12, scale: 2 }).default("0"),
  totalNetPay: decimal("total_net_pay", { precision: 12, scale: 2 }).default("0"),
  calculatedAt: timestamp("calculated_at"),
  finalizedAt: timestamp("finalized_at"),
  postedAt: timestamp("posted_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll Lines table - Individual employee payroll calculations
export const payrollLines = pgTable("payroll_lines", {
  lineId: varchar("line_id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").references(() => payrollRuns.runId).notNull(),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  code: varchar("code", { length: 20 }).notNull(), // BASIC, OT1, NIGHT, FOOD_ALL, TAX, INS_EMP
  description: varchar("description", { length: 200 }).notNull(),
  hours: decimal("hours", { precision: 8, scale: 2 }).default("0"),
  units: decimal("units", { precision: 8, scale: 2 }).default("0"),
  rate: decimal("rate", { precision: 10, scale: 4 }).default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  costCenter: varchar("cost_center", { length: 50 }),
  notes: text("notes"),
  isDeduction: boolean("is_deduction").default(false),
  isTaxable: boolean("is_taxable").default(true),
  isInsurable: boolean("is_insurable").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payroll_lines_run").on(table.runId),
  index("idx_payroll_lines_employee").on(table.employeeId),
  index("idx_payroll_lines_code").on(table.code),
]);

// Filings table - Government compliance submissions
export const filings = pgTable("filings", {
  filingId: varchar("filing_id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // ERGANI_HIRE, ERGANI_SCHEDULE, EFKA_APD, AADE_FMY
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM format
  status: varchar("status", { length: 20 }).default("draft"), // draft, built, validated, submitted, confirmed, rejected
  receiptRef: varchar("receipt_ref", { length: 100 }), // Government receipt reference
  payloadHash: varchar("payload_hash", { length: 64 }), // SHA256 hash of submission payload
  submissionUrl: varchar("submission_url", { length: 500 }),
  submittedAt: timestamp("submitted_at"),
  confirmedAt: timestamp("confirmed_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  propertyIds: jsonb("property_ids").default('[]'), // Properties included in filing
  employeeCount: integer("employee_count").default(0),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"), // For tax/insurance filings
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_filings_type_period").on(table.type, table.period),
  index("idx_filings_status").on(table.status),
  index("idx_filings_receipt").on(table.receiptRef),
]);

// Relations
export const propertiesRelations = relations(properties, ({ many }) => ({
  employees: many(employees),
  shifts: many(shifts),
  punchEvents: many(punchEvents),
  exceptions: many(exceptions),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  defaultProperty: one(properties, {
    fields: [employees.defaultPropertyId],
    references: [properties.propertyId],
  }),
  shifts: many(shifts),
  punchEvents: many(punchEvents),
  exceptions: many(exceptions),
  timesheets: many(timesheets),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  employee: one(employees, {
    fields: [shifts.employeeId],
    references: [employees.employeeId],
  }),
  property: one(properties, {
    fields: [shifts.propertyId],
    references: [properties.propertyId],
  }),
  exceptions: many(exceptions),
}));

export const punchEventsRelations = relations(punchEvents, ({ one }) => ({
  employee: one(employees, {
    fields: [punchEvents.employeeId],
    references: [employees.employeeId],
  }),
  property: one(properties, {
    fields: [punchEvents.propertyId],
    references: [properties.propertyId],
  }),
}));

export const exceptionsRelations = relations(exceptions, ({ one }) => ({
  employee: one(employees, {
    fields: [exceptions.employeeId],
    references: [employees.employeeId],
  }),
  property: one(properties, {
    fields: [exceptions.propertyId],
    references: [properties.propertyId],
  }),
  shift: one(shifts, {
    fields: [exceptions.shiftId],
    references: [shifts.shiftId],
  }),
  resolvedByUser: one(users, {
    fields: [exceptions.resolvedBy],
    references: [users.id],
  }),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  employee: one(employees, {
    fields: [timesheets.employeeId],
    references: [employees.employeeId],
  }),
}));

export const complianceAlertsRelations = relations(complianceAlerts, ({ one }) => ({
  employee: one(employees, {
    fields: [complianceAlerts.employeeId],
    references: [employees.employeeId],
  }),
  property: one(properties, {
    fields: [complianceAlerts.propertyId],
    references: [properties.propertyId],
  }),
  resolvedByUser: one(users, {
    fields: [complianceAlerts.resolvedBy],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

export const erganiSubmissionLogRelations = relations(erganiSubmissionLog, ({ one }) => ({
  punchEvent: one(punchEvents, {
    fields: [erganiSubmissionLog.eventId],
    references: [punchEvents.eventId],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  resolvedExceptions: many(exceptions),
}));

// Insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  propertyId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  employeeId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  shiftId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPunchEventSchema = createInsertSchema(punchEvents).omit({
  eventId: true,
  createdAt: true,
});

export const insertExceptionSchema = createInsertSchema(exceptions).omit({
  exceptionId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  timesheetId: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

// Add new data model relations
export const contractsRelations = relations(contracts, ({ one }) => ({
  employee: one(employees, {
    fields: [contracts.employeeId],
    references: [employees.employeeId],
  }),
  property: one(properties, {
    fields: [contracts.propertyId],
    references: [properties.propertyId],
  }),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [payrollRuns.createdBy],
    references: [users.id],
  }),
  payrollLines: many(payrollLines),
}));

export const payrollLinesRelations = relations(payrollLines, ({ one }) => ({
  run: one(payrollRuns, {
    fields: [payrollLines.runId],
    references: [payrollRuns.runId],
  }),
  employee: one(employees, {
    fields: [payrollLines.employeeId],
    references: [employees.employeeId],
  }),
}));

export const filingsRelations = relations(filings, ({ one }) => ({
  createdByUser: one(users, {
    fields: [filings.createdBy],
    references: [users.id],
  }),
}));

// Additional type definitions for new data model
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type InsertPayrollRun = typeof payrollRuns.$inferInsert;

export type PayrollLine = typeof payrollLines.$inferSelect;
export type InsertPayrollLine = typeof payrollLines.$inferInsert;

export type Filing = typeof filings.$inferSelect;
export type InsertFiling = typeof filings.$inferInsert;

// Add additional insert schemas
export const insertContractSchema = createInsertSchema(contracts).omit({
  contractId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollRunSchema = createInsertSchema(payrollRuns).omit({
  runId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollLineSchema = createInsertSchema(payrollLines).omit({
  lineId: true,
  createdAt: true,
});

export const insertFilingSchema = createInsertSchema(filings).omit({
  filingId: true,
  createdAt: true,
  updatedAt: true,
});

// Insert types already defined above, removing duplicates

export type PunchEvent = typeof punchEvents.$inferSelect;
export type InsertPunchEvent = z.infer<typeof insertPunchEventSchema>;

export type Exception = typeof exceptions.$inferSelect;
export type InsertException = z.infer<typeof insertExceptionSchema>;

export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

// Add missing schemas for compliance tables
export const insertComplianceAlertSchema = createInsertSchema(complianceAlerts).omit({
  alertId: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  logId: true,
  timestamp: true,
  createdAt: true,
});

export const insertErganiSubmissionLogSchema = createInsertSchema(erganiSubmissionLog).omit({
  submissionId: true,
  submittedAt: true,
  lastAttemptAt: true,
  createdAt: true,
});

export const insertDataRetentionPolicySchema = createInsertSchema(dataRetentionPolicy).omit({
  policyId: true,
  createdAt: true,
  updatedAt: true,
});

// New table insert schemas
export const insertWageComponentSchema = createInsertSchema(wageComponents).omit({
  componentId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  departmentId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates).omit({
  templateId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeviceRegistrySchema = createInsertSchema(deviceRegistry).omit({
  deviceId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOvertimeRequestSchema = createInsertSchema(overtimeRequests).omit({
  requestId: true,
  createdAt: true,
  updatedAt: true,
});

export type ComplianceAlert = typeof complianceAlerts.$inferSelect;
export type InsertComplianceAlert = z.infer<typeof insertComplianceAlertSchema>;

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type ErganiSubmissionLog = typeof erganiSubmissionLog.$inferSelect;
export type InsertErganiSubmissionLog = z.infer<typeof insertErganiSubmissionLogSchema>;

export type DataRetentionPolicy = typeof dataRetentionPolicy.$inferSelect;
export type InsertDataRetentionPolicy = z.infer<typeof insertDataRetentionPolicySchema>;

// New table types
export type WageComponent = typeof wageComponents.$inferSelect;
export type InsertWageComponent = z.infer<typeof insertWageComponentSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type ShiftTemplate = typeof shiftTemplates.$inferSelect;
export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;

export type DeviceRegistry = typeof deviceRegistry.$inferSelect;
export type InsertDeviceRegistry = z.infer<typeof insertDeviceRegistrySchema>;

export type OvertimeRequest = typeof overtimeRequests.$inferSelect;
export type InsertOvertimeRequest = z.infer<typeof insertOvertimeRequestSchema>;

// Analytics views for live tracking and reporting
export const liveOccupancy = pgTable("live_occupancy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  propertyId: varchar("property_id").notNull(),
  department: varchar("department").notNull(),
  status: varchar("status").notNull(), // "on_site", "off_site", "break", "lunch"
  lastPunchTime: timestamp("last_punch_time").notNull(),
  shiftStart: timestamp("shift_start"),
  expectedShiftEnd: timestamp("expected_shift_end"),
  location: varchar("location"), // GPS coords or zone
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const laborCostForecast = pgTable("labor_cost_forecast", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  department: varchar("department").notNull(),
  forecastDate: timestamp("forecast_date").notNull(),
  scheduledHours: decimal("scheduled_hours").notNull(),
  projectedHours: decimal("projected_hours").notNull(),
  baseLaborCost: decimal("base_labor_cost").notNull(),
  overtimeCost: decimal("overtime_cost").notNull(),
  totalCost: decimal("total_cost").notNull(),
  variancePercentage: decimal("variance_percentage").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const analyticsMetrics = pgTable("analytics_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: varchar("metric_type").notNull(), // "overtime", "absence", "compliance", "variance"
  employeeId: varchar("employee_id"),
  propertyId: varchar("property_id").notNull(),
  department: varchar("department"),
  metricDate: timestamp("metric_date").notNull(),
  value: decimal("value").notNull(),
  metadata: jsonb("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const complianceKpis = pgTable("compliance_kpis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  kpiDate: timestamp("kpi_date").notNull(),
  erganiSubmissionSuccess: decimal("ergani_submission_success").notNull(),
  erganiExceptionRate: decimal("ergani_exception_rate").notNull(),
  maxHoursViolations: integer("max_hours_violations").notNull(),
  restPeriodViolations: integer("rest_period_violations").notNull(),
  digitalCardCompliance: decimal("digital_card_compliance").notNull(),
  dataRetentionCompliance: decimal("data_retention_compliance").notNull(),
  overallScore: decimal("overall_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Success Metrics tables - Enhanced for 2025 KPIs
export const successMetrics = pgTable("success_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  metricDate: timestamp("metric_date").notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  employeeCount: integer("employee_count").notNull().default(0),
  
  // KPI 1: Government Submission Success (≥99% ERGANI/APD/ΦΜΥ)
  erganiSubmissionTotal: integer("ergani_submission_total").notNull().default(0),
  erganiSubmissionSuccess: integer("ergani_submission_success").notNull().default(0),
  erganiSubmissionRate: decimal("ergani_submission_rate").notNull().default("0"), // Combined ERGANI/APD/ΦΜΥ rate
  
  // KPI 2: Unresolved Exceptions (<1% per pay period)
  totalExceptions: integer("total_exceptions").notNull().default(0),
  resolvedExceptions: integer("resolved_exceptions").notNull().default(0),
  unresolvedExceptions: integer("unresolved_exceptions").notNull().default(0),
  unresolvedExceptionRate: decimal("unresolved_exception_rate").notNull().default("0"), // Must be <1%
  
  // KPI 3: Payroll Runtime (≤15 min for 200 employees)
  payrollRuntimeMinutes: integer("payroll_runtime_minutes").notNull().default(0),
  payrollRuntimeSeconds: integer("payroll_runtime_seconds").notNull().default(0),
  payrollEmployeeCount: integer("payroll_employee_count").notNull().default(0),
  
  // KPI 4: ERP/SEPA Automation (100% automation, zero manual re-key)
  totalERPEntries: integer("total_erp_entries").notNull().default(0),
  manualERPEntries: integer("manual_erp_entries").notNull().default(0),
  automatedERPEntries: integer("automated_erp_entries").notNull().default(0),
  erpAutomationRate: decimal("erp_automation_rate").notNull().default("0"), // Must be 100%
  totalSEPAPayments: integer("total_sepa_payments").notNull().default(0),
  autoReconciledSEPA: integer("auto_reconciled_sepa").notNull().default(0),
  sepaAutomationRate: decimal("sepa_automation_rate").notNull().default("0"), // Must be 100%
  overallAutomationRate: decimal("overall_automation_rate").notNull().default("0"),
  
  // Supporting Metrics
  totalPunches: integer("total_punches").notNull().default(0),
  geoVerifiedPunches: integer("geo_verified_punches").notNull().default(0),
  geoVerificationRate: decimal("geo_verification_rate").notNull().default("0"),
  manualPunchEntries: integer("manual_punch_entries").notNull().default(0),
  
  // Audit Performance
  auditPackGenerationTime: integer("audit_pack_generation_time").notNull().default(0), // Seconds
  auditPackSize: integer("audit_pack_size").notNull().default(0), // MB
  auditPackSuccess: boolean("audit_pack_success").notNull().default(true),
  
  // Overall Compliance Score
  overallComplianceScore: decimal("overall_compliance_score").notNull().default("0"), // Percentage
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const successMetricAlerts = pgTable("success_metric_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  metricType: varchar("metric_type").notNull(), // 'ergani_submission', 'exceptions', 'geo_verification', 'overtime_variance', 'audit_performance'
  alertLevel: varchar("alert_level").notNull(), // 'warning', 'critical'
  threshold: decimal("threshold").notNull(),
  actualValue: decimal("actual_value").notNull(),
  message: text("message").notNull(),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Analytics insert schemas
export const insertLiveOccupancySchema = createInsertSchema(liveOccupancy).omit({
  id: true,
  updatedAt: true,
});

export const insertLaborCostForecastSchema = createInsertSchema(laborCostForecast).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsMetricsSchema = createInsertSchema(analyticsMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertComplianceKpisSchema = createInsertSchema(complianceKpis).omit({
  id: true,
  createdAt: true,
});

export const insertSuccessMetricsSchema = createInsertSchema(successMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertSuccessMetricAlertsSchema = createInsertSchema(successMetricAlerts).omit({
  id: true,
  createdAt: true,
});

// Payroll Periods Table
export const payrollPeriods = pgTable("payroll_periods", {
  periodId: varchar("period_id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  periodType: varchar("period_type", { length: 20 }).notNull(), // monthly, semi-monthly, off-cycle
  periodName: varchar("period_name", { length: 100 }).notNull(), // "January 2025", "Mid-January 2025"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  payDate: date("pay_date").notNull(),
  status: varchar("status", { length: 20 }).default("draft"), // draft, calculating, calculated, paid, closed
  cutoffDate: date("cutoff_date"), // Timesheet cutoff date
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll Calculations Table - Core payroll results
export const payrollCalculations = pgTable("payroll_calculations", {
  calculationId: varchar("calculation_id").primaryKey().default(sql`gen_random_uuid()`),
  periodId: varchar("period_id").notNull().references(() => payrollPeriods.periodId),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  
  // Gross Pay Components
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).default("0.00"),
  regularHours: decimal("regular_hours", { precision: 8, scale: 2 }).default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 8, scale: 2 }).default("0.00"),
  overtimeAmount: decimal("overtime_amount", { precision: 10, scale: 2 }).default("0.00"),
  
  // Greek Premiums
  nightPremium: decimal("night_premium", { precision: 10, scale: 2 }).default("0.00"),
  sundayPremium: decimal("sunday_premium", { precision: 10, scale: 2 }).default("0.00"),
  holidayPremium: decimal("holiday_premium", { precision: 10, scale: 2 }).default("0.00"),
  
  // Greek Allowances
  foodAllowance: decimal("food_allowance", { precision: 10, scale: 2 }).default("0.00"),
  transportAllowance: decimal("transport_allowance", { precision: 10, scale: 2 }).default("0.00"),
  housingAllowance: decimal("housing_allowance", { precision: 10, scale: 2 }).default("0.00"),
  marriageAllowance: decimal("marriage_allowance", { precision: 10, scale: 2 }).default("0.00"),
  familyAllowance: decimal("family_allowance", { precision: 10, scale: 2 }).default("0.00"),
  educationAllowance: decimal("education_allowance", { precision: 10, scale: 2 }).default("0.00"),
  experienceAllowance: decimal("experience_allowance", { precision: 10, scale: 2 }).default("0.00"),
  positionAllowance: decimal("position_allowance", { precision: 10, scale: 2 }).default("0.00"),
  
  // Greek Bonuses (Δώρα)
  christmasBonus: decimal("christmas_bonus", { precision: 10, scale: 2 }).default("0.00"),
  easterBonus: decimal("easter_bonus", { precision: 10, scale: 2 }).default("0.00"),
  vacationBonus: decimal("vacation_bonus", { precision: 10, scale: 2 }).default("0.00"),
  
  // Leave Pay
  paidLeave: decimal("paid_leave", { precision: 10, scale: 2 }).default("0.00"),
  sickPay: decimal("sick_pay", { precision: 10, scale: 2 }).default("0.00"),
  maternityPay: decimal("maternity_pay", { precision: 10, scale: 2 }).default("0.00"),
  paternityPay: decimal("paternity_pay", { precision: 10, scale: 2 }).default("0.00"),
  
  // Benefits in Kind
  mealVouchers: decimal("meal_vouchers", { precision: 10, scale: 2 }).default("0.00"),
  companyCarBenefit: decimal("company_car_benefit", { precision: 10, scale: 2 }).default("0.00"),
  imputedIncome: decimal("imputed_income", { precision: 10, scale: 2 }).default("0.00"),
  
  // Tips and Commissions
  tips: decimal("tips", { precision: 10, scale: 2 }).default("0.00"),
  tipsPoolShare: decimal("tips_pool_share", { precision: 10, scale: 2 }).default("0.00"),
  employerTipTopUp: decimal("employer_tip_top_up", { precision: 10, scale: 2 }).default("0.00"),
  commissions: decimal("commissions", { precision: 10, scale: 2 }).default("0.00"),
  
  // Totals
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  taxableIncome: decimal("taxable_income", { precision: 10, scale: 2 }).notNull(),
  
  // Tax Deductions (Greek Tax System)
  incomeTax: decimal("income_tax", { precision: 10, scale: 2 }).default("0.00"),
  solidarityTax: decimal("solidarity_tax", { precision: 10, scale: 2 }).default("0.00"),
  
  // Social Insurance (EFKA)
  employeeEfkaMain: decimal("employee_efka_main", { precision: 10, scale: 2 }).default("0.00"),
  employeeEfkaAux: decimal("employee_efka_aux", { precision: 10, scale: 2 }).default("0.00"),
  employeeUnemployment: decimal("employee_unemployment", { precision: 10, scale: 2 }).default("0.00"),
  
  // Employer Contributions
  employerEfkaMain: decimal("employer_efka_main", { precision: 10, scale: 2 }).default("0.00"),
  employerEfkaAux: decimal("employer_efka_aux", { precision: 10, scale: 2 }).default("0.00"),
  employerUnemployment: decimal("employer_unemployment", { precision: 10, scale: 2 }).default("0.00"),
  
  // Final Amounts
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull(),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  totalEmployerCost: decimal("total_employer_cost", { precision: 10, scale: 2 }).notNull(),
  
  // Calculation Metadata
  calculatedAt: timestamp("calculated_at").defaultNow(),
  calculatedBy: varchar("calculated_by").references(() => users.id),
  calculationVersion: varchar("calculation_version", { length: 20 }).default("2025.1"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee Contracts Table - Multi-contract support
export const employeeContracts = pgTable("employee_contracts", {
  contractId: varchar("contract_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  departmentId: varchar("department_id").references(() => departments.departmentId),
  
  contractType: varchar("contract_type", { length: 50 }).notNull(), // primary, secondary, seasonal
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  costCenterCode: varchar("cost_center_code", { length: 20 }),
  
  // Contract Terms
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // null for indefinite
  hoursPerWeek: decimal("hours_per_week", { precision: 5, scale: 2 }).default("40.00"),
  workSchedule: jsonb("work_schedule"), // Flexible schedule definition
  
  // Compensation
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  salaryFrequency: varchar("salary_frequency", { length: 20 }).default("monthly"), // monthly, bi-weekly, weekly
  
  // Status
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false), // Primary contract for employee
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leave Records Table
export const leaveRecords = pgTable("leave_records", {
  leaveId: varchar("leave_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // annual, sick, maternity, paternity, parental, unpaid
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).notNull(),
  
  // Pay Details
  isPaid: boolean("is_paid").default(true),
  payRate: decimal("pay_rate", { precision: 5, scale: 4 }).default("1.0000"), // 100% of salary
  totalPay: decimal("total_pay", { precision: 10, scale: 2 }).default("0.00"),
  
  // Approval
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Greek Specific
  erganiSubmitted: boolean("ergani_submitted").default(false),
  erganiReferenceId: varchar("ergani_reference_id", { length: 100 }),
  
  reason: text("reason"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tips Pool Table
export const tipsPools = pgTable("tips_pools", {
  poolId: varchar("pool_id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.propertyId),
  periodId: varchar("period_id").notNull().references(() => payrollPeriods.periodId),
  
  poolName: varchar("pool_name", { length: 255 }).notNull(), // "Restaurant Tips", "Hotel Service Tips"
  totalTipsCollected: decimal("total_tips_collected", { precision: 12, scale: 2 }).notNull(),
  employerTopUp: decimal("employer_top_up", { precision: 12, scale: 2 }).default("0.00"),
  totalDistribution: decimal("total_distribution", { precision: 12, scale: 2 }).notNull(),
  
  distributionMethod: varchar("distribution_method", { length: 50 }).default("points"), // points, hours, equal
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tips Distribution Table
export const tipsDistributions = pgTable("tips_distributions", {
  distributionId: varchar("distribution_id").primaryKey().default(sql`gen_random_uuid()`),
  poolId: varchar("pool_id").notNull().references(() => tipsPools.poolId),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  
  points: decimal("points", { precision: 8, scale: 2 }).default("0.00"), // Service points earned
  hoursWorked: decimal("hours_worked", { precision: 8, scale: 2 }).default("0.00"),
  distributionAmount: decimal("distribution_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Tax Treatment
  isTaxable: boolean("is_taxable").default(true),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).default("0.1500"), // 15% tips tax rate
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPayrollPeriodsSchema = createInsertSchema(payrollPeriods).omit({
  periodId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollCalculationsSchema = createInsertSchema(payrollCalculations).omit({
  calculationId: true,
  calculatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmployeeContractsSchema = createInsertSchema(employeeContracts).omit({
  contractId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveRecordsSchema = createInsertSchema(leaveRecords).omit({
  leaveId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTipsPoolsSchema = createInsertSchema(tipsPools).omit({
  poolId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTipsDistributionsSchema = createInsertSchema(tipsDistributions).omit({
  distributionId: true,
  createdAt: true,
  updatedAt: true,
});

// Analytics type exports
export type LiveOccupancy = typeof liveOccupancy.$inferSelect;
export type InsertLiveOccupancy = z.infer<typeof insertLiveOccupancySchema>;
export type LaborCostForecast = typeof laborCostForecast.$inferSelect;
export type InsertLaborCostForecast = z.infer<typeof insertLaborCostForecastSchema>;
export type AnalyticsMetrics = typeof analyticsMetrics.$inferSelect;
export type InsertAnalyticsMetrics = z.infer<typeof insertAnalyticsMetricsSchema>;
export type ComplianceKpis = typeof complianceKpis.$inferSelect;
export type InsertComplianceKpis = z.infer<typeof insertComplianceKpisSchema>;
export type SuccessMetrics = typeof successMetrics.$inferSelect;
export type InsertSuccessMetrics = z.infer<typeof insertSuccessMetricsSchema>;
export type SuccessMetricAlerts = typeof successMetricAlerts.$inferSelect;
export type InsertSuccessMetricAlerts = z.infer<typeof insertSuccessMetricAlertsSchema>;

// Payroll type exports
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type InsertPayrollPeriod = z.infer<typeof insertPayrollPeriodsSchema>;
export type PayrollCalculation = typeof payrollCalculations.$inferSelect;
export type InsertPayrollCalculation = z.infer<typeof insertPayrollCalculationsSchema>;
export type EmployeeContract = typeof employeeContracts.$inferSelect;
export type InsertEmployeeContract = z.infer<typeof insertEmployeeContractsSchema>;
export type LeaveRecord = typeof leaveRecords.$inferSelect;
export type InsertLeaveRecord = z.infer<typeof insertLeaveRecordsSchema>;
export type TipsPool = typeof tipsPools.$inferSelect;
export type InsertTipsPool = z.infer<typeof insertTipsPoolsSchema>;
export type TipsDistribution = typeof tipsDistributions.$inferSelect;
export type InsertTipsDistribution = z.infer<typeof insertTipsDistributionsSchema>;

// ==================== PAYMENTS & ACCOUNTING INFRASTRUCTURE ====================

// Payment Instructions table for SEPA pain.001 generation
export const paymentInstructions = pgTable("payment_instructions", {
  paymentId: varchar("payment_id").primaryKey().default(sql`gen_random_uuid()`),
  payrollPeriodId: varchar("payroll_period_id").references(() => payrollPeriods.periodId).notNull(),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  
  // Payment Details
  netPayAmount: decimal("net_pay_amount", { precision: 10, scale: 2 }).notNull(),
  paymentType: varchar("payment_type", { length: 20 }).default("salary"), // salary, bonus, expenses, off_cycle
  urgentPayment: boolean("urgent_payment").default(false), // For SEPA Instant
  
  // IBAN Split (support for multiple accounts)
  primaryIban: varchar("primary_iban", { length: 34 }).notNull(),
  primaryAmount: decimal("primary_amount", { precision: 10, scale: 2 }).notNull(),
  secondaryIban: varchar("secondary_iban", { length: 34 }),
  secondaryAmount: decimal("secondary_amount", { precision: 10, scale: 2 }).default("0"),
  tertiaryIban: varchar("tertiary_iban", { length: 34 }),
  tertiaryAmount: decimal("tertiary_amount", { precision: 10, scale: 2 }).default("0"),
  
  // Bank Details
  bankCode: varchar("bank_code", { length: 10 }), // Greek bank codes (Alpha, Eurobank, NBG, Piraeus)
  bankName: varchar("bank_name", { length: 100 }),
  beneficiaryName: varchar("beneficiary_name", { length: 140 }).notNull(),
  
  // Payment Reference
  remittanceInfo: varchar("remittance_info", { length: 140 }), // Payment reference
  endToEndId: varchar("end_to_end_id", { length: 35 }).notNull(), // Unique payment ID
  
  // SEPA pain.001 Details
  pain001Generated: boolean("pain001_generated").default(false),
  pain001FilePath: varchar("pain001_file_path", { length: 500 }),
  pain001GeneratedAt: timestamp("pain001_generated_at"),
  
  // Status Tracking
  status: varchar("status", { length: 20 }).default("pending"), // pending, queued, sent, confirmed, failed
  sentToBank: timestamp("sent_to_bank"),
  confirmationReceived: timestamp("confirmation_received"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payment_instructions_period").on(table.payrollPeriodId),
  index("idx_payment_instructions_employee").on(table.employeeId),
  index("idx_payment_instructions_status").on(table.status),
]);

// SEPA Payment Files table
export const sepaPaymentFiles = pgTable("sepa_payment_files", {
  fileId: varchar("file_id").primaryKey().default(sql`gen_random_uuid()`),
  payrollPeriodId: varchar("payroll_period_id").references(() => payrollPeriods.periodId).notNull(),
  
  // File Details
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  messageId: varchar("message_id", { length: 35 }).notNull(), // SEPA message ID
  
  // Payment Summary
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  totalTransactions: integer("total_transactions").notNull(),
  urgentTransactions: integer("urgent_transactions").default(0),
  
  // Bank Details
  debitAccount: varchar("debit_account", { length: 34 }).notNull(), // Company IBAN
  creditorId: varchar("creditor_id", { length: 35 }), // SEPA Direct Debit Identifier
  
  // Request Details
  requestedExecutionDate: date("requested_execution_date").notNull(),
  paymentMethod: varchar("payment_method", { length: 10 }).default("TRF"), // TRF or INST
  
  // Status
  status: varchar("status", { length: 20 }).default("generated"), // generated, submitted, processed, failed
  bankResponse: jsonb("bank_response"),
  submittedAt: timestamp("submitted_at"),
  processedAt: timestamp("processed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// General Ledger Export table
export const glExports = pgTable("gl_exports", {
  exportId: varchar("export_id").primaryKey().default(sql`gen_random_uuid()`),
  payrollPeriodId: varchar("payroll_period_id").references(() => payrollPeriods.periodId).notNull(),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  
  // Export Configuration
  exportType: varchar("export_type", { length: 20 }).notNull(), // journal, summary, detailed
  format: varchar("format", { length: 20 }).notNull(), // csv, xml, json, excel
  erpSystem: varchar("erp_system", { length: 50 }), // SoftOne, Epsilon, SAP, Navision, Custom
  
  // File Details
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size"),
  
  // GL Summary
  totalDebits: decimal("total_debits", { precision: 12, scale: 2 }).notNull(),
  totalCredits: decimal("total_credits", { precision: 12, scale: 2 }).notNull(),
  totalEntries: integer("total_entries").notNull(),
  
  // Mapping Configuration
  accountMappings: jsonb("account_mappings"), // GL account mapping rules
  costCenterMappings: jsonb("cost_center_mappings"),
  departmentMappings: jsonb("department_mappings"),
  
  // Status
  status: varchar("status", { length: 20 }).default("generated"), // generated, exported, imported, failed
  exportedAt: timestamp("exported_at"),
  importedAt: timestamp("imported_at"),
  errorDetails: text("error_details"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Journal Entries table (detailed GL transactions)
export const journalEntries = pgTable("journal_entries", {
  entryId: varchar("entry_id").primaryKey().default(sql`gen_random_uuid()`),
  glExportId: varchar("gl_export_id").references(() => glExports.exportId).notNull(),
  payrollPeriodId: varchar("payroll_period_id").references(() => payrollPeriods.periodId).notNull(),
  
  // Entry Details
  lineNumber: integer("line_number").notNull(),
  accountCode: varchar("account_code", { length: 20 }).notNull(),
  accountName: varchar("account_name", { length: 100 }).notNull(),
  
  // Transaction Details
  debitAmount: decimal("debit_amount", { precision: 12, scale: 2 }).default("0"),
  creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).default("0"),
  description: varchar("description", { length: 255 }).notNull(),
  reference: varchar("reference", { length: 50 }),
  
  // Dimensions
  propertyId: varchar("property_id").references(() => properties.propertyId),
  costCenter: varchar("cost_center", { length: 20 }),
  department: varchar("department", { length: 50 }),
  project: varchar("project", { length: 50 }),
  
  // Source Details
  sourceType: varchar("source_type", { length: 20 }).notNull(), // salary, tax, insurance, benefits
  sourceEmployeeId: varchar("source_employee_id").references(() => employees.employeeId),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_journal_entries_export").on(table.glExportId),
  index("idx_journal_entries_period").on(table.payrollPeriodId),
  index("idx_journal_entries_account").on(table.accountCode),
]);

// Bank Registry (Greek banks configuration)
export const bankRegistry = pgTable("bank_registry", {
  bankId: varchar("bank_id").primaryKey().default(sql`gen_random_uuid()`),
  bankCode: varchar("bank_code", { length: 10 }).unique().notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  bic: varchar("bic", { length: 11 }).notNull(), // SWIFT BIC code
  
  // SEPA Configuration
  supportsSepaInstant: boolean("supports_sepa_instant").default(false),
  maxInstantAmount: decimal("max_instant_amount", { precision: 10, scale: 2 }),
  sepaEndpoint: varchar("sepa_endpoint", { length: 500 }), // Bank API endpoint
  
  // File Format Preferences
  pain001Version: varchar("pain001_version", { length: 20 }).default("pain.001.001.03"),
  characterEncoding: varchar("character_encoding", { length: 20 }).default("UTF-8"),
  fileNamingPattern: varchar("file_naming_pattern", { length: 100 }),
  
  // Processing Times
  standardProcessingHours: integer("standard_processing_hours").default(24),
  instantProcessingSeconds: integer("instant_processing_seconds").default(10),
  cutoffTime: varchar("cutoff_time", { length: 8 }), // HH:MM:SS format
  
  // Status
  isActive: boolean("is_active").default(true),
  lastTestedAt: timestamp("last_tested_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for payment tables
export const insertPaymentInstructionsSchema = createInsertSchema(paymentInstructions).omit({
  paymentId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSepaPaymentFilesSchema = createInsertSchema(sepaPaymentFiles).omit({
  fileId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGlExportsSchema = createInsertSchema(glExports).omit({
  exportId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntriesSchema = createInsertSchema(journalEntries).omit({
  entryId: true,
  createdAt: true,
});

export const insertBankRegistrySchema = createInsertSchema(bankRegistry).omit({
  bankId: true,
  createdAt: true,
  updatedAt: true,
});

// Payment type exports
export type PaymentInstruction = typeof paymentInstructions.$inferSelect;
export type InsertPaymentInstruction = z.infer<typeof insertPaymentInstructionsSchema>;
export type SepaPaymentFile = typeof sepaPaymentFiles.$inferSelect;
export type InsertSepaPaymentFile = z.infer<typeof insertSepaPaymentFilesSchema>;
export type GlExport = typeof glExports.$inferSelect;
export type InsertGlExport = z.infer<typeof insertGlExportsSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntriesSchema>;
export type BankRegistry = typeof bankRegistry.$inferSelect;
export type InsertBankRegistry = z.infer<typeof insertBankRegistrySchema>;

// Additional Compliance Filings Tables

export const complianceFilings = pgTable("compliance_filings", {
  filingId: varchar("filing_id").primaryKey(),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  filingType: varchar("filing_type"), // APD, FMY, VAT, etc.
  period: varchar("period"), // YYYY-MM
  status: varchar("status"), // draft, generated, submitted, accepted, rejected
  filingData: jsonb("filing_data"),
  totalAmount: varchar("total_amount"),
  submissionReference: varchar("submission_reference"),
  receiptNumber: varchar("receipt_number"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
});

export const erganiSubmissions = pgTable("ergani_submissions", {
  submissionId: varchar("submission_id").primaryKey(),
  employeeId: varchar("employee_id").references(() => employees.employeeId),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  eventType: varchar("event_type"), // hire, schedule, overtime, change, termination
  formData: jsonb("form_data"),
  status: varchar("status"), // draft, submitted, accepted, rejected
  erganiEventId: varchar("ergani_event_id"),
  submissionReference: varchar("submission_reference"),
  createdAt: timestamp("created_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
});

export const digitalWorkCardEvents = pgTable("digital_work_card_events", {
  eventId: varchar("event_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  eventType: varchar("event_type"), // clock_in, clock_out, break_start, break_end
  timestamp: timestamp("timestamp").defaultNow(),
  location: jsonb("location"), // GPS coordinates, geofence data
  deviceInfo: jsonb("device_info"),
  cardStatus: varchar("card_status"), // active, inactive, expired, pending
  submissionStatus: varchar("submission_status"), // pending, submitted, accepted, failed
  erganiSyncStatus: varchar("ergani_sync_status"), // synced, pending, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for additional compliance tables
export const insertComplianceFilingsSchema = createInsertSchema(complianceFilings);
export const insertErganiSubmissionsSchema = createInsertSchema(erganiSubmissions);
export const insertDigitalWorkCardEventsSchema = createInsertSchema(digitalWorkCardEvents).omit({
  eventId: true,
  createdAt: true,
});

// Additional compliance type exports
export type ComplianceFiling = typeof complianceFilings.$inferSelect;
export type InsertComplianceFiling = z.infer<typeof insertComplianceFilingsSchema>;
export type ErganiSubmission = typeof erganiSubmissions.$inferSelect;
export type InsertErganiSubmission = z.infer<typeof insertErganiSubmissionsSchema>;
export type DigitalWorkCardEvent = typeof digitalWorkCardEvents.$inferSelect;
export type InsertDigitalWorkCardEvent = z.infer<typeof insertDigitalWorkCardEventsSchema>;