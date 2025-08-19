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
  personId: varchar("person_id", { length: 50 }).unique().notNull(), // Unique person identifier for ESRS S1
  name: varchar("name", { length: 200 }).notNull(), // Full name
  afm: varchar("afm", { length: 9 }).unique(), // Greek Tax ID
  amka: varchar("amka", { length: 11 }).unique(), // Social Security Number
  paaypa: varchar("paaypa", { length: 20 }), // Unified Social Security Registry
  bankIban: varchar("bank_iban", { length: 34 }), // Bank account for salary
  dateOfBirth: date("date_of_birth"),
  birthYear: integer("birth_year"), // Year of birth for ESRS S1 age segmentation
  gender: varchar("gender", { length: 20 }), // M, F, Non-binary, Not disclosed - for pay gap analysis
  nationalityCode: varchar("nationality_code", { length: 3 }).default("GRC"),
  country: varchar("country", { length: 3 }).default("GRC"), // Country for ESRS S1 segmentation
  
  // Employment Contract Data & ESRS S1 Classification
  employeeFlag: boolean("employee_flag").default(true), // True for employees, false for non-employees
  nonEmployeeFlag: boolean("non_employee_flag").default(false), // Contractors, consultants
  employmentType: varchar("employment_type", { length: 50 }).notNull(), // indefinite, fixed-term, seasonal
  contractType: varchar("contract_type", { length: 50 }).notNull(), // ESRS S1 contract type classification
  ftePct: decimal("fte_pct", { precision: 5, scale: 2 }).default("100.00"), // FTE percentage (e.g., 100.00, 50.00)
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
  
  // Health & Safety Coverage for ESRS S1
  hsCoverageFlag: boolean("hs_coverage_flag").default(true), // Covered by H&S management system
  
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

// Punch Events table - Enhanced for offline-first mobile operations
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
  
  // Offline-First Support
  offlineFlag: boolean("offline_flag").default(false),
  clientEventId: varchar("client_event_id"), // Client-side UUID for offline tracking
  syncStatus: varchar("sync_status", { length: 20 }).default("synced"), // pending, synced, failed, conflict
  syncAttempts: integer("sync_attempts").default(0),
  syncError: text("sync_error"),
  lastSyncAttempt: timestamp("last_sync_attempt"),
  syncConflictData: jsonb("sync_conflict_data"), // Store conflicting data for resolution
  
  signatureHash: varchar("signature_hash", { length: 255 }), // For tamper-evident logging
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_punch_events_employee_timestamp").on(table.employeeId, table.timestamp),
  index("idx_punch_events_property_timestamp").on(table.propertyId, table.timestamp),
  index("idx_punch_events_sync_status").on(table.syncStatus),
  index("idx_punch_events_client_id").on(table.clientEventId),
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

// Self-Service Portal tables
export const paycheckHistory = pgTable("paycheck_history", {
  paycheckId: varchar("paycheck_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  payPeriodStart: date("pay_period_start").notNull(),
  payPeriodEnd: date("pay_period_end").notNull(),
  payDate: date("pay_date").notNull(),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  taxWithheld: decimal("tax_withheld", { precision: 10, scale: 2 }).default("0"),
  efkaContributions: decimal("efka_contributions", { precision: 10, scale: 2 }).default("0"),
  solidarityTax: decimal("solidarity_tax", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 10, scale: 2 }).default("0"),
  payslipData: jsonb("payslip_data"), // Complete payslip breakdown
  status: varchar("status").default("paid"), // pending, paid, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const digitalWorkCardLogs = pgTable("digital_work_card_logs", {
  logId: varchar("log_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  workDate: date("work_date").notNull(),
  clockInTime: timestamp("clock_in_time"),
  clockOutTime: timestamp("clock_out_time"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  breakMinutes: integer("break_minutes").default(0),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  location: varchar("location"), // Work location/property
  clockMethod: varchar("clock_method"), // mobile, kiosk, web, manual
  gpsCoordinates: varchar("gps_coordinates"),
  deviceInfo: jsonb("device_info"),
  erganiSyncStatus: varchar("ergani_sync_status").default("pending"), // pending, synced, failed
  erganiSubmissionId: varchar("ergani_submission_id"),
  notes: text("notes"),
  status: varchar("status").default("active"), // active, corrected, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeCorrectionRequests = pgTable("time_correction_requests", {
  requestId: varchar("request_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  workCardLogId: varchar("work_card_log_id").references(() => digitalWorkCardLogs.logId),
  requestType: varchar("request_type").notNull(), // clock_in, clock_out, break, overtime
  originalValue: varchar("original_value"),
  requestedValue: varchar("requested_value").notNull(),
  reason: text("reason").notNull(),
  photoEvidence: varchar("photo_evidence"), // URL to uploaded photo
  location: varchar("location"),
  submittedVia: varchar("submitted_via").default("mobile"), // mobile, web
  managerNotes: text("manager_notes"),
  status: varchar("status").default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PaycheckHistory = typeof paycheckHistory.$inferSelect;
export type DigitalWorkCardLog = typeof digitalWorkCardLogs.$inferSelect;
export type TimeCorrectionRequest = typeof timeCorrectionRequests.$inferSelect;
export type InsertTimeCorrectionRequest = typeof timeCorrectionRequests.$inferInsert;
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

// Notifications system for smart alerts and approvals
export const notifications = pgTable("notifications", {
  notificationId: varchar("notification_id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Target and source
  userId: varchar("user_id").references(() => users.id),
  employeeId: varchar("employee_id").references(() => employees.employeeId),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  
  // Notification content
  type: varchar("type", { length: 50 }).notNull(), // overtime_approval, ergani_failure, compliance_alert, payroll_ready
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, urgent
  category: varchar("category", { length: 50 }).notNull(), // approval, alert, digest, system
  
  // Related entities
  relatedEntityType: varchar("related_entity_type", { length: 50 }), // overtime_request, shift, payroll_run
  relatedEntityId: varchar("related_entity_id", { length: 36 }),
  
  // Delivery channels and status
  channels: jsonb("channels").default('["web"]'), // web, email, slack, teams, sms
  deliveryStatus: jsonb("delivery_status").default('{}'), // {slack: "sent", email: "failed"}
  
  // Action and workflow
  actionRequired: boolean("action_required").default(false),
  actionType: varchar("action_type", { length: 50 }), // approve, reject, acknowledge, retry
  actionData: jsonb("action_data"), // Button configs, approval context
  actionUrl: varchar("action_url", { length: 500 }), // Deep link for mobile/web
  
  // Status tracking
  status: varchar("status", { length: 20 }).default("pending"), // pending, sent, delivered, read, acted_upon, expired
  readAt: timestamp("read_at"),
  actedAt: timestamp("acted_at"),
  actionBy: varchar("action_by").references(() => users.id),
  actionResult: varchar("action_result", { length: 50 }), // approved, rejected, acknowledged
  
  // Scheduling and expiry
  scheduledFor: timestamp("scheduled_for"),
  expiresAt: timestamp("expires_at"),
  
  // Digest aggregation
  digestGroup: varchar("digest_group", { length: 100 }), // weekly_compliance, payroll_summary
  includeInDigest: boolean("include_in_digest").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_status").on(table.status),
  index("idx_notifications_type").on(table.type),
  index("idx_notifications_scheduled").on(table.scheduledFor),
  index("idx_notifications_digest").on(table.digestGroup, table.includeInDigest),
]);

// Notification preferences per user
export const notificationPreferences = pgTable("notification_preferences", {
  preferenceId: varchar("preference_id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Channel preferences
  slackEnabled: boolean("slack_enabled").default(false),
  slackChannelId: varchar("slack_channel_id", { length: 100 }),
  teamsEnabled: boolean("teams_enabled").default(false),
  teamsWebhookUrl: varchar("teams_webhook_url", { length: 500 }),
  emailEnabled: boolean("email_enabled").default(true),
  smsEnabled: boolean("sms_enabled").default(false),
  phoneNumber: varchar("phone_number", { length: 20 }),
  
  // Notification type preferences
  overtimeApprovals: jsonb("overtime_approvals").default('{"enabled": true, "channels": ["slack", "email"]}'),
  erganiAlerts: jsonb("ergani_alerts").default('{"enabled": true, "channels": ["slack", "email"]}'),
  complianceAlerts: jsonb("compliance_alerts").default('{"enabled": true, "channels": ["email"]}'),
  payrollDigests: jsonb("payroll_digests").default('{"enabled": true, "channels": ["email"], "frequency": "weekly"}'),
  
  // Timing preferences
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default("22:00"), // HH:MM
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default("08:00"), // HH:MM
  timezone: varchar("timezone", { length: 50 }).default("Europe/Athens"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Slack/Teams integration logs
export const integrationLogs = pgTable("integration_logs", {
  logId: varchar("log_id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Integration details
  integration: varchar("integration", { length: 20 }).notNull(), // slack, teams, email
  action: varchar("action", { length: 50 }).notNull(), // send_message, create_approval, webhook_received
  
  // Request/Response
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  status: varchar("status", { length: 20 }).notNull(), // success, error, timeout
  errorMessage: text("error_message"),
  
  // Related entities
  notificationId: varchar("notification_id").references(() => notifications.notificationId),
  userId: varchar("user_id").references(() => users.id),
  
  // Timing
  duration: integer("duration_ms"), // Processing time in milliseconds
  retryCount: integer("retry_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_integration_logs_status").on(table.status),
  index("idx_integration_logs_integration").on(table.integration),
  index("idx_integration_logs_notification").on(table.notificationId),
]);

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

// Notification system types
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = typeof integrationLogs.$inferInsert;

// Notification insert schemas
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  notificationId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  preferenceId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrationLogSchema = createInsertSchema(integrationLogs).omit({
  logId: true,
  createdAt: true,
});

// Notification relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  employee: one(employees, {
    fields: [notifications.employeeId],
    references: [employees.employeeId],
  }),
  property: one(properties, {
    fields: [notifications.propertyId],
    references: [properties.propertyId],
  }),
  actionByUser: one(users, {
    fields: [notifications.actionBy],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  notification: one(notifications, {
    fields: [integrationLogs.notificationId],
    references: [notifications.notificationId],
  }),
  user: one(users, {
    fields: [integrationLogs.userId],
    references: [users.id],
  }),
}));

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

// Approval Context and Actions tables for Slack/Teams approvals
export const approvalContexts = pgTable("approval_contexts", {
  id: varchar("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // overtime, exception, filing
  propertyId: varchar("property_id").references(() => properties.propertyId),
  employeeId: varchar("employee_id").references(() => employees.employeeId),
  managerId: varchar("manager_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  urgency: varchar("urgency", { length: 20 }).notNull(), // low, medium, high, critical
  metadata: jsonb("metadata").default('{}'),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'approved', 'rejected', 'expired'
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const approvalActions = pgTable("approval_actions", {
  id: serial("id").primaryKey(),
  approvalId: varchar("approval_id").references(() => approvalContexts.id).notNull(),
  action: varchar("action", { length: 20 }).notNull(), // 'approve', 'reject', 'view'
  userId: varchar("user_id").notNull(),
  reason: text("reason"),
  source: varchar("source", { length: 20 }).notNull(), // 'slack', 'teams', 'web'
  timestamp: timestamp("timestamp").defaultNow(),
  auditTrail: jsonb("audit_trail").default('[]'),
});

export type ApprovalContext = typeof approvalContexts.$inferSelect;
export type InsertApprovalContext = typeof approvalContexts.$inferInsert;
export type ApprovalAction = typeof approvalActions.$inferSelect;
export type InsertApprovalAction = typeof approvalActions.$inferInsert;

export const insertApprovalContextSchema = createInsertSchema(approvalContexts);
export const insertApprovalActionSchema = createInsertSchema(approvalActions);

// Labor Newsfeed tables for Greek labor news widget
export const laborNewsfeedItems = pgTable("labor_newsfeed_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  externalId: varchar("external_id", { length: 100 }).unique().notNull(), // for deduplication
  category: varchar("category", { length: 50 }).notNull(), // Minimum Wage, Digital Work Card, etc.
  headline: text("headline").notNull(), // Greek headline
  summary: text("summary").notNull(), // AI-generated Greek summary
  source: varchar("source", { length: 255 }).notNull(), // Source name like "Ministry of Labour"
  sourceUrl: text("source_url").notNull(), // Original article URL
  publishedDate: date("published_date").notNull(),
  lastChecked: timestamp("last_checked").defaultNow(),
  isActive: boolean("is_active").default(true),
  needsReview: boolean("needs_review").default(false), // flag for 404s or other issues
  reviewReason: text("review_reason"), // reason why it needs review
  aiSummaryHash: varchar("ai_summary_hash", { length: 64 }), // to detect changes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const laborNewsfeedCitations = pgTable("labor_newsfeed_citations", {
  id: serial("id").primaryKey(),
  newsItemId: varchar("news_item_id").references(() => laborNewsfeedItems.id, { onDelete: "cascade" }).notNull(),
  citationId: varchar("citation_id", { length: 50 }).notNull(), // e.g., "turn0search13"
  sourceType: varchar("source_type", { length: 50 }).notNull(), // "search", "news", "official"
  sourceDescription: text("source_description"), // human-readable description of the source
  sourceUrl: text("source_url"), // URL if applicable
  isVerified: boolean("is_verified").default(false), // whether the citation has been verified
  createdAt: timestamp("created_at").defaultNow(),
});

// Widget configuration for newsfeed refresh settings
export const laborNewsfeedConfig = pgTable("labor_newsfeed_config", {
  id: serial("id").primaryKey(),
  refreshIntervalMinutes: integer("refresh_interval_minutes").default(240), // 4 hours
  lastRefresh: timestamp("last_refresh"),
  nextRefresh: timestamp("next_refresh"),
  maxItems: integer("max_items").default(6),
  isEnabled: boolean("is_enabled").default(true),
  aiModel: varchar("ai_model", { length: 50 }).default("gpt-4o"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type LaborNewsfeedItem = typeof laborNewsfeedItems.$inferSelect;
export type InsertLaborNewsfeedItem = z.infer<typeof insertLaborNewsfeedItemSchema>;
export type LaborNewsfeedCitation = typeof laborNewsfeedCitations.$inferSelect;
export type InsertLaborNewsfeedCitation = z.infer<typeof insertLaborNewsfeedCitationSchema>;
export type LaborNewsfeedConfig = typeof laborNewsfeedConfig.$inferSelect;
export type InsertLaborNewsfeedConfig = z.infer<typeof insertLaborNewsfeedConfigSchema>;

export const insertLaborNewsfeedItemSchema = createInsertSchema(laborNewsfeedItems);
export const insertLaborNewsfeedCitationSchema = createInsertSchema(laborNewsfeedCitations);
export const insertLaborNewsfeedConfigSchema = createInsertSchema(laborNewsfeedConfig);

// Pay Transparency & Equity Module (EU Directive 2023/970)
// Job posting salary ranges and transparency requirements
export const jobPostingSalaryRanges = pgTable("job_posting_salary_ranges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  departmentId: varchar("department_id").references(() => departments.departmentId),
  minSalary: decimal("min_salary", { precision: 10, scale: 2 }).notNull(),
  maxSalary: decimal("max_salary", { precision: 10, scale: 2 }).notNull(),
  salaryBasis: varchar("salary_basis", { length: 20 }).notNull(), // monthly, annual, hourly
  currency: varchar("currency", { length: 3 }).default("EUR"),
  benefitsDescription: text("benefits_description"),
  payFactors: jsonb("pay_factors").default('[]'), // factors affecting pay (experience, education, etc.)
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employee pay equity analysis and gender pay gap tracking
export const payEquityAnalysis = pgTable("pay_equity_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  analysisDate: date("analysis_date").notNull(),
  analysisType: varchar("analysis_type", { length: 50 }).notNull(), // gender_gap, equal_work, category
  jobCategory: varchar("job_category", { length: 100 }),
  departmentId: varchar("department_id").references(() => departments.departmentId),
  
  // Gender pay gap metrics
  maleEmployees: integer("male_employees").default(0),
  femaleEmployees: integer("female_employees").default(0),
  otherGenderEmployees: integer("other_gender_employees").default(0),
  maleAvgSalary: decimal("male_avg_salary", { precision: 10, scale: 2 }),
  femaleAvgSalary: decimal("female_avg_salary", { precision: 10, scale: 2 }),
  otherAvgSalary: decimal("other_avg_salary", { precision: 10, scale: 2 }),
  genderPayGapPercent: decimal("gender_pay_gap_percent", { precision: 5, scale: 2 }),
  
  // Additional metrics
  medianMaleSalary: decimal("median_male_salary", { precision: 10, scale: 2 }),
  medianFemaleSalary: decimal("median_female_salary", { precision: 10, scale: 2 }),
  adjustedPayGap: decimal("adjusted_pay_gap", { precision: 5, scale: 2 }), // after controlling for factors
  
  // Analysis metadata
  analysisMethodology: text("analysis_methodology"),
  controlFactors: jsonb("control_factors").default('[]'), // factors controlled for in analysis
  complianceStatus: varchar("compliance_status", { length: 20 }).default("pending"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee right-to-information requests (Article 8 EU 2023/970)
export const payTransparencyRequests = pgTable("pay_transparency_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  requestType: varchar("request_type", { length: 50 }).notNull(), // pay_criteria, pay_levels, progression
  requestDate: timestamp("request_date").defaultNow(),
  requestDetails: text("request_details").notNull(),
  
  // Response tracking
  status: varchar("status", { length: 20 }).default("pending"), // pending, in_progress, completed, rejected
  responseDeadline: timestamp("response_deadline").notNull(), // 2 months from request
  responseDate: timestamp("response_date"),
  responseDetails: text("response_details"),
  responseDocuments: jsonb("response_documents").default('[]'),
  
  // Compliance tracking
  handledBy: varchar("handled_by"),
  rejectionReason: text("rejection_reason"),
  followUpRequired: boolean("follow_up_required").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pay decision explanations and justifications
export const payDecisionExplanations = pgTable("pay_decision_explanations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  decisionType: varchar("decision_type", { length: 50 }).notNull(), // hire, promotion, raise, review
  decisionDate: date("decision_date").notNull(),
  oldSalary: decimal("old_salary", { precision: 10, scale: 2 }),
  newSalary: decimal("new_salary", { precision: 10, scale: 2 }).notNull(),
  salaryChange: decimal("salary_change", { precision: 10, scale: 2 }),
  
  // Justification factors
  performanceRating: varchar("performance_rating", { length: 20 }),
  experienceYears: decimal("experience_years", { precision: 4, scale: 1 }),
  educationLevel: varchar("education_level", { length: 50 }),
  skillsAssessment: jsonb("skills_assessment").default('{}'),
  marketComparison: decimal("market_comparison", { precision: 10, scale: 2 }),
  
  // Decision explanation
  explanation: text("explanation").notNull(),
  contributingFactors: jsonb("contributing_factors").default('[]'),
  comparisonGroup: varchar("comparison_group", { length: 100 }),
  
  // Approval and audit
  approvedBy: varchar("approved_by").notNull(),
  hrReviewed: boolean("hr_reviewed").default(false),
  auditTrail: jsonb("audit_trail").default('[]'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// EU 2023/970 compliance tracking per entity
export const payEquityCompliance = pgTable("pay_equity_compliance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  
  // Compliance deadlines
  transpositionDeadline: date("transposition_deadline").notNull().default('2026-06-07'),
  nextReportingDeadline: date("next_reporting_deadline"),
  
  // Readiness scoring
  readinessScore: decimal("readiness_score", { precision: 5, scale: 2 }).default('0'),
  lastAssessmentDate: timestamp("last_assessment_date"),
  
  // Compliance components
  salaryRangesPublished: boolean("salary_ranges_published").default(false),
  genderPayGapReported: boolean("gender_pay_gap_reported").default(false),
  payTransparencyPolicyActive: boolean("pay_transparency_policy_active").default(false),
  rightToInfoProcessActive: boolean("right_to_info_process_active").default(false),
  payDecisionsCriteriaPublished: boolean("pay_decisions_criteria_published").default(false),
  
  // Reporting metrics
  lastGenderPayGapReport: date("last_gender_pay_gap_report"),
  employeeCount: integer("employee_count").default(0),
  reportingThresholdMet: boolean("reporting_threshold_met").default(false), // 250+ employees
  
  // Action items and notes
  outstandingActions: jsonb("outstanding_actions").default('[]'),
  complianceNotes: text("compliance_notes"),
  riskLevel: varchar("risk_level", { length: 20 }).default("medium"), // low, medium, high
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type JobPostingSalaryRange = typeof jobPostingSalaryRanges.$inferSelect;
export type InsertJobPostingSalaryRange = z.infer<typeof insertJobPostingSalaryRangeSchema>;
export type PayEquityAnalysis = typeof payEquityAnalysis.$inferSelect;
export type InsertPayEquityAnalysis = z.infer<typeof insertPayEquityAnalysisSchema>;
export type PayTransparencyRequest = typeof payTransparencyRequests.$inferSelect;
export type InsertPayTransparencyRequest = z.infer<typeof insertPayTransparencyRequestSchema>;
export type PayDecisionExplanation = typeof payDecisionExplanations.$inferSelect;
export type InsertPayDecisionExplanation = z.infer<typeof insertPayDecisionExplanationSchema>;
export type PayEquityCompliance = typeof payEquityCompliance.$inferSelect;
export type InsertPayEquityCompliance = z.infer<typeof insertPayEquityComplianceSchema>;

export const insertJobPostingSalaryRangeSchema = createInsertSchema(jobPostingSalaryRanges);
export const insertPayEquityAnalysisSchema = createInsertSchema(payEquityAnalysis);
export const insertPayTransparencyRequestSchema = createInsertSchema(payTransparencyRequests);
export const insertPayDecisionExplanationSchema = createInsertSchema(payDecisionExplanations);
export const insertPayEquityComplianceSchema = createInsertSchema(payEquityCompliance);

// CSRD / ESRS S1 "Own Workforce" Sustainability Reporting
// Corporate Sustainability Reporting Directive compliance
export const csrdReportingPeriods = pgTable("csrd_reporting_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  reportingYear: integer("reporting_year").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  
  // ESRS version and wave management
  esrsVersion: varchar("esrs_version", { length: 20 }).default("1.0"), // Track July 2025 updates
  implementationWave: integer("implementation_wave").default(1), // Wave 1, 2, 3
  stopTheClockApplied: boolean("stop_the_clock_applied").default(false),
  
  // Materiality assessment
  materialityAssessmentDate: date("materiality_assessment_date"),
  s1WorkforceMaterial: boolean("s1_workforce_material").default(true),
  materialityJustification: text("materiality_justification"),
  
  // Reporting status
  reportingStatus: varchar("reporting_status", { length: 20 }).default("draft"), // draft, review, final, submitted
  submissionDate: timestamp("submission_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ESRS S1 Workforce Characteristics (S1-6)
export const s1WorkforceCharacteristics = pgTable("s1_workforce_characteristics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  
  // Data collection date
  measurementDate: date("measurement_date").notNull(),
  
  // Employee categories (own workforce scope)
  totalEmployees: integer("total_employees").notNull(),
  totalFTE: decimal("total_fte", { precision: 8, scale: 2 }).notNull(),
  nonEmployeeWorkers: integer("non_employee_workers").default(0), // Contractors, agency workers
  
  // Gender breakdown
  employeesMale: integer("employees_male").default(0),
  employeesFemale: integer("employees_female").default(0),
  employeesNonBinary: integer("employees_non_binary").default(0),
  employeesUndisclosed: integer("employees_undisclosed").default(0),
  
  // Age groups
  employeesUnder30: integer("employees_under_30").default(0),
  employees30to50: integer("employees_30_to_50").default(0),
  employeesOver50: integer("employees_over_50").default(0),
  
  // Contract types
  permanentContracts: integer("permanent_contracts").default(0),
  temporaryContracts: integer("temporary_contracts").default(0),
  partTimeEmployees: integer("part_time_employees").default(0),
  fullTimeEmployees: integer("full_time_employees").default(0),
  
  // Geographic distribution (simplified)
  employeesEU: integer("employees_eu").default(0),
  employeesNonEU: integer("employees_non_eu").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ESRS S1 Turnover and Recruitment Metrics
export const s1TurnoverMetrics = pgTable("s1_turnover_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  
  // Turnover data
  totalLeavers: integer("total_leavers").notNull(),
  voluntaryLeavers: integer("voluntary_leavers").default(0),
  involuntaryLeavers: integer("involuntary_leavers").default(0),
  turnoverRate: decimal("turnover_rate", { precision: 5, scale: 2 }).notNull(), // Percentage
  
  // Turnover by gender
  leaversMale: integer("leavers_male").default(0),
  leaversFemale: integer("leavers_female").default(0),
  leaversNonBinary: integer("leavers_non_binary").default(0),
  
  // Turnover by age group
  leaversUnder30: integer("leavers_under_30").default(0),
  leavers30to50: integer("leavers_30_to_50").default(0),
  leaversOver50: integer("leavers_over_50").default(0),
  
  // New hires
  totalHires: integer("total_hires").default(0),
  hireMale: integer("hire_male").default(0),
  hireFemale: integer("hire_female").default(0),
  hireRate: decimal("hire_rate", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// ESRS S1 Collective Bargaining Coverage
export const s1CollectiveBargaining = pgTable("s1_collective_bargaining", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  
  // Coverage metrics
  employeesCoveredByAgreements: integer("employees_covered_by_agreements").notNull(),
  coveragePercentage: decimal("coverage_percentage", { precision: 5, scale: 2 }).notNull(),
  
  // Agreement details
  activeAgreements: integer("active_agreements").default(0),
  agreementTypes: jsonb("agreement_types").default('[]'), // Company, sectoral, national
  
  // Rights and consultation
  workersRepresentationExists: boolean("workers_representation_exists").default(false),
  consultationProcesses: jsonb("consultation_processes").default('[]'),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// ESRS S1 Health & Safety Incidents (S1-16)
export const s1HealthSafetyIncidents = pgTable("s1_health_safety_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  
  // Incident data
  incidentDate: date("incident_date").notNull(),
  incidentType: varchar("incident_type", { length: 50 }).notNull(), // injury, illness, near_miss, fatality
  severity: varchar("severity", { length: 20 }).notNull(), // minor, major, fatal
  
  // Affected person
  affectedWorkerType: varchar("affected_worker_type", { length: 30 }).notNull(), // employee, contractor, visitor
  workerGender: varchar("worker_gender", { length: 20 }),
  workerAge: integer("worker_age"),
  
  // Incident details
  location: varchar("location", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  incidentDescription: text("incident_description"),
  rootCause: text("root_cause"),
  
  // Impact metrics
  workDaysLost: integer("work_days_lost").default(0),
  medicalTreatmentRequired: boolean("medical_treatment_required").default(false),
  
  // Follow-up
  correctiveActions: text("corrective_actions"),
  preventiveActions: text("preventive_actions"),
  investigationCompleted: boolean("investigation_completed").default(false),
  
  // Reporting compliance
  reportedToAuthorities: boolean("reported_to_authorities").default(false),
  reportingDate: date("reporting_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ESRS S1 Training and Development
export const s1TrainingMetrics = pgTable("s1_training_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  employeeId: varchar("employee_id").references(() => employees.employeeId),
  
  // Training data
  trainingType: varchar("training_type", { length: 50 }).notNull(), // safety, skills, leadership, compliance
  trainingHours: decimal("training_hours", { precision: 6, scale: 2 }).notNull(),
  trainingCost: decimal("training_cost", { precision: 10, scale: 2 }),
  
  // Demographics
  participantGender: varchar("participant_gender", { length: 20 }),
  participantAge: integer("participant_age"),
  participantLevel: varchar("participant_level", { length: 30 }), // entry, mid, senior, executive
  
  // Training outcome
  completionStatus: varchar("completion_status", { length: 20 }).default("completed"),
  competencyGained: boolean("competency_gained").default(false),
  
  trainingDate: date("training_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ESRS S1 Work-Life Balance (Family-Related Leave)
export const s1WorkLifeBalance = pgTable("s1_work_life_balance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  
  // Leave eligibility
  employeesEligibleMaternityLeave: integer("employees_eligible_maternity_leave").default(0),
  employeesEligiblePaternityLeave: integer("employees_eligible_paternity_leave").default(0),
  employeesEligibleParentalLeave: integer("employees_eligible_parental_leave").default(0),
  employeesEligibleFlexibleWork: integer("employees_eligible_flexible_work").default(0),
  
  // Leave usage
  maternityLeaveTaken: integer("maternity_leave_taken").default(0),
  paternityLeaveTaken: integer("paternity_leave_taken").default(0),
  parentalLeaveTaken: integer("parental_leave_taken").default(0),
  
  // Flexible work arrangements
  employeesRemoteWork: integer("employees_remote_work").default(0),
  employeesFlexibleHours: integer("employees_flexible_hours").default(0),
  employeesJobSharing: integer("employees_job_sharing").default(0),
  
  // Return rates
  returnRateAfterMaternityLeave: decimal("return_rate_after_maternity_leave", { precision: 5, scale: 2 }),
  returnRateAfterParentalLeave: decimal("return_rate_after_parental_leave", { precision: 5, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// ESRS S1 Pay Metrics (CEO Pay Ratio + Gender Pay Gap)
export const s1PayMetrics = pgTable("s1_pay_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  
  // CEO Pay Ratio (highest-paid individual to median employee)
  highestPaidIndividualTotal: decimal("highest_paid_individual_total", { precision: 12, scale: 2 }).notNull(),
  medianEmployeeCompensation: decimal("median_employee_compensation", { precision: 10, scale: 2 }).notNull(),
  ceoPayRatio: decimal("ceo_pay_ratio", { precision: 8, scale: 2 }).notNull(), // Ratio calculation
  
  // Gender Pay Gap (gross hourly)
  maleGrossHourlyPay: decimal("male_gross_hourly_pay", { precision: 8, scale: 2 }).notNull(),
  femaleGrossHourlyPay: decimal("female_gross_hourly_pay", { precision: 8, scale: 2 }).notNull(),
  genderPayGapPercentage: decimal("gender_pay_gap_percentage", { precision: 5, scale: 2 }).notNull(),
  
  // Pay gap methodology disclosure
  calculationMethodology: text("calculation_methodology").notNull(),
  contextualFactors: text("contextual_factors"),
  
  // Additional pay equity metrics
  nonBinaryGrossHourlyPay: decimal("non_binary_gross_hourly_pay", { precision: 8, scale: 2 }),
  payEquityActions: jsonb("pay_equity_actions").default('[]'),
  
  calculationDate: date("calculation_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// CSRD Audit Trail and Data Lineage
export const csrdAuditTrail = pgTable("csrd_audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  
  // Audit metadata
  auditDate: timestamp("audit_date").defaultNow(),
  auditType: varchar("audit_type", { length: 30 }).notNull(), // calculation, data_source, export
  tableName: varchar("table_name", { length: 100 }),
  recordId: varchar("record_id"),
  
  // Data lineage
  dataSource: varchar("data_source", { length: 100 }).notNull(), // payroll, time_attendance, manual_entry
  calculationMethod: text("calculation_method"),
  inputParameters: jsonb("input_parameters").default('{}'),
  
  // Changes tracking
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  changeReason: text("change_reason"),
  
  // User and system info
  userId: varchar("user_id"),
  systemVersion: varchar("system_version", { length: 20 }),
  esrsVersion: varchar("esrs_version", { length: 20 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// CSRD Export Log and Compliance Tracking
export const csrdExportLog = pgTable("csrd_export_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").references(() => csrdReportingPeriods.id).notNull(),
  
  // Export details
  exportType: varchar("export_type", { length: 30 }).notNull(), // full_report, s1_only, metrics_only
  exportFormat: varchar("export_format", { length: 10 }).default("json"), // json, xml, csv
  exportDate: timestamp("export_date").defaultNow(),
  
  // Content summary
  s1MetricsIncluded: jsonb("s1_metrics_included").default('[]'),
  materialityApplied: boolean("materiality_applied").default(false),
  dataQualityScore: decimal("data_quality_score", { precision: 3, scale: 1 }),
  
  // File details
  fileName: varchar("file_name", { length: 200 }),
  fileSizeBytes: integer("file_size_bytes"),
  checksum: varchar("checksum", { length: 64 }),
  
  // Compliance status
  esrsComplianceStatus: varchar("esrs_compliance_status", { length: 20 }).default("compliant"),
  validationErrors: jsonb("validation_errors").default('[]'),
  
  // User tracking
  exportedBy: varchar("exported_by").notNull(),
  exportPurpose: varchar("export_purpose", { length: 100 }), // internal_review, audit, submission
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced Compensation Tracking for ESRS S1 (annual total compensation, gross pay period)
export const s1CompensationTracking = pgTable("s1_compensation_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").notNull().references(() => csrdReportingPeriods.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  
  // Annual and periodic compensation data for S1 calculations
  annualTotalCompensation: decimal("annual_total_compensation", { precision: 12, scale: 2 }), // Full year compensation
  grossPayPeriod: decimal("gross_pay_period", { precision: 10, scale: 2 }), // Gross pay for reporting period
  hoursWorkedPeriod: decimal("hours_worked_period", { precision: 8, scale: 2 }), // Total hours from Digital Work Card
  
  // Pay equity analysis fields
  calculationDate: date("calculation_date").notNull(),
  country: varchar("country", { length: 3 }).notNull(),
  entity: varchar("entity", { length: 100 }), // Entity/property for segmentation
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Leave Eligibility & Usage Tracking for ESRS S1 Work-Life Balance
export const s1LeaveEligibility = pgTable("s1_leave_eligibility", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").notNull().references(() => csrdReportingPeriods.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  
  // Leave type and eligibility
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // maternity, paternity, parental, carer, force-majeure
  eligibleFlag: boolean("eligible_flag").notNull(), // Eligible for this leave type
  takenMinutes: integer("taken_minutes").default(0), // Minutes of leave taken (precise tracking)
  entitlementMinutes: integer("entitlement_minutes"), // Total entitlement in minutes
  
  // Usage rate calculation fields
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  country: varchar("country", { length: 3 }).notNull(),
  entity: varchar("entity", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Materiality Assessment per S1 Topic (ESRS 1 Appendix E)
export const s1MaterialityAssessment = pgTable("s1_materiality_assessment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").notNull().references(() => csrdReportingPeriods.id),
  
  // S1 Topic areas
  topicArea: varchar("topic_area", { length: 50 }).notNull(), // policies, actions, metrics
  topicCode: varchar("topic_code", { length: 20 }).notNull(), // S1-1, S1-6, S1-16, etc.
  topicDescription: text("topic_description").notNull(),
  
  // Materiality determination
  isMaterial: boolean("is_material").notNull(),
  materialityRationale: text("materiality_rationale").notNull(), // Required justification
  flowchartArtefact: jsonb("flowchart_artefact"), // ESRS 1 Appendix E flowchart evidence
  
  // Assessment metadata
  assessmentDate: date("assessment_date").notNull(),
  assessedBy: varchar("assessed_by").notNull(),
  reviewedBy: varchar("reviewed_by"),
  approvedBy: varchar("approved_by"),
  
  // Impact and stakeholder analysis
  impactMagnitude: varchar("impact_magnitude", { length: 20 }), // low, medium, high
  impactLikelihood: varchar("impact_likelihood", { length: 20 }), // low, medium, high
  stakeholderInterest: varchar("stakeholder_interest", { length: 20 }), // low, medium, high
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Versioned ESRS S1 Calculation Rulesets (runtime switchable)
export const s1CalculationRulesets = pgTable("s1_calculation_rulesets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Ruleset versioning
  rulesetName: varchar("ruleset_name", { length: 50 }).notNull(), // esrs_s1.v2023, esrs_s1.v2025_quickfix
  version: varchar("version", { length: 20 }).notNull(),
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date"),
  
  // Calculation function definitions
  functionName: varchar("function_name", { length: 100 }).notNull(), // gender_pay_gap, highest_to_median_ratio, etc.
  functionCode: text("function_code").notNull(), // JavaScript/SQL function body
  parameters: jsonb("parameters").default('{}'), // Function parameter definitions
  
  // Segmentation requirements
  requiresCountrySegmentation: boolean("requires_country_segmentation").default(true),
  requiresEntitySegmentation: boolean("requires_entity_segmentation").default(true),
  supportsRollup: boolean("supports_rollup").default(true),
  
  // Metadata
  description: text("description"),
  esrsReference: varchar("esrs_reference", { length: 20 }), // S1-16, S1-17, etc.
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced H&S Fatalities Tracking (own workforce + other workers on sites)
export const s1HSFatalities = pgTable("s1_hs_fatalities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").notNull().references(() => csrdReportingPeriods.id),
  
  // Fatality classification
  workerType: varchar("worker_type", { length: 20 }).notNull(), // own_workforce, other_on_site
  fatalityDate: date("fatality_date").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  
  // Person details (if applicable)
  employeeId: varchar("employee_id").references(() => employees.employeeId), // Only for own workforce
  externalWorkerDetails: jsonb("external_worker_details"), // For other workers on site
  
  // Incident details
  incidentDescription: text("incident_description"),
  rootCause: text("root_cause"),
  preventiveMeasures: text("preventive_measures"),
  
  // Regulatory reporting
  reportedToAuthorities: boolean("reported_to_authorities").default(false),
  authorityReference: varchar("authority_reference", { length: 100 }),
  
  // ESRS S1 categorization
  country: varchar("country", { length: 3 }).notNull(),
  entity: varchar("entity", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for CSRD/ESRS S1
export type CsrdReportingPeriod = typeof csrdReportingPeriods.$inferSelect;
export type InsertCsrdReportingPeriod = z.infer<typeof insertCsrdReportingPeriodSchema>;
export type S1WorkforceCharacteristics = typeof s1WorkforceCharacteristics.$inferSelect;
export type InsertS1WorkforceCharacteristics = z.infer<typeof insertS1WorkforceCharacteristicsSchema>;
export type S1TurnoverMetrics = typeof s1TurnoverMetrics.$inferSelect;
export type InsertS1TurnoverMetrics = z.infer<typeof insertS1TurnoverMetricsSchema>;
export type S1CollectiveBargaining = typeof s1CollectiveBargaining.$inferSelect;
export type InsertS1CollectiveBargaining = z.infer<typeof insertS1CollectiveBargainingSchema>;
export type S1HealthSafetyIncidents = typeof s1HealthSafetyIncidents.$inferSelect;
export type InsertS1HealthSafetyIncidents = z.infer<typeof insertS1HealthSafetyIncidentsSchema>;
export type S1TrainingMetrics = typeof s1TrainingMetrics.$inferSelect;
export type InsertS1TrainingMetrics = z.infer<typeof insertS1TrainingMetricsSchema>;
export type S1WorkLifeBalance = typeof s1WorkLifeBalance.$inferSelect;
export type InsertS1WorkLifeBalance = z.infer<typeof insertS1WorkLifeBalanceSchema>;
export type S1PayMetrics = typeof s1PayMetrics.$inferSelect;
export type InsertS1PayMetrics = z.infer<typeof insertS1PayMetricsSchema>;
export type CsrdAuditTrail = typeof csrdAuditTrail.$inferSelect;
export type InsertCsrdAuditTrail = z.infer<typeof insertCsrdAuditTrailSchema>;
export type CsrdExportLog = typeof csrdExportLog.$inferSelect;
export type InsertCsrdExportLog = z.infer<typeof insertCsrdExportLogSchema>;
export type S1CompensationTracking = typeof s1CompensationTracking.$inferSelect;
export type InsertS1CompensationTracking = z.infer<typeof insertS1CompensationTrackingSchema>;
export type S1LeaveEligibility = typeof s1LeaveEligibility.$inferSelect;
export type InsertS1LeaveEligibility = z.infer<typeof insertS1LeaveEligibilitySchema>;
export type S1MaterialityAssessment = typeof s1MaterialityAssessment.$inferSelect;
export type InsertS1MaterialityAssessment = z.infer<typeof insertS1MaterialityAssessmentSchema>;
export type S1CalculationRulesets = typeof s1CalculationRulesets.$inferSelect;
export type InsertS1CalculationRulesets = z.infer<typeof insertS1CalculationRulesetsSchema>;
export type S1HSFatalities = typeof s1HSFatalities.$inferSelect;
export type InsertS1HSFatalities = z.infer<typeof insertS1HSFatalitiesSchema>;
export type S1DataLineage = typeof s1DataLineage.$inferSelect;
export type InsertS1DataLineage = z.infer<typeof insertS1DataLineageSchema>;
export type S1EvidencePacks = typeof s1EvidencePacks.$inferSelect;
export type InsertS1EvidencePacks = z.infer<typeof insertS1EvidencePacksSchema>;
export type EsrsTaxonomy = typeof esrsTaxonomy.$inferSelect;
export type InsertEsrsTaxonomy = z.infer<typeof insertEsrsTaxonomySchema>;
export type S1XbrlInstances = typeof s1XbrlInstances.$inferSelect;
export type InsertS1XbrlInstances = z.infer<typeof insertS1XbrlInstancesSchema>;
export type S1ReportSections = typeof s1ReportSections.$inferSelect;
export type InsertS1ReportSections = z.infer<typeof insertS1ReportSectionsSchema>;

// Insert schemas for CSRD/ESRS S1
export const insertCsrdReportingPeriodSchema = createInsertSchema(csrdReportingPeriods);
export const insertS1WorkforceCharacteristicsSchema = createInsertSchema(s1WorkforceCharacteristics);
export const insertS1TurnoverMetricsSchema = createInsertSchema(s1TurnoverMetrics);
export const insertS1CollectiveBargainingSchema = createInsertSchema(s1CollectiveBargaining);
export const insertS1HealthSafetyIncidentsSchema = createInsertSchema(s1HealthSafetyIncidents);
export const insertS1TrainingMetricsSchema = createInsertSchema(s1TrainingMetrics);
export const insertS1WorkLifeBalanceSchema = createInsertSchema(s1WorkLifeBalance);
export const insertS1PayMetricsSchema = createInsertSchema(s1PayMetrics);
export const insertCsrdAuditTrailSchema = createInsertSchema(csrdAuditTrail);
export const insertCsrdExportLogSchema = createInsertSchema(csrdExportLog);
export const insertS1CompensationTrackingSchema = createInsertSchema(s1CompensationTracking);
export const insertS1LeaveEligibilitySchema = createInsertSchema(s1LeaveEligibility);
export const insertS1MaterialityAssessmentSchema = createInsertSchema(s1MaterialityAssessment);
export const insertS1CalculationRulesetsSchema = createInsertSchema(s1CalculationRulesets);
export const insertS1HSFatalitiesSchema = createInsertSchema(s1HSFatalities);

// Enhanced Data Lineage Tracking for Audit & Assurance
export const s1DataLineage = pgTable("s1_data_lineage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").notNull().references(() => csrdReportingPeriods.id),
  metricCode: varchar("metric_code", { length: 20 }).notNull(), // S1-6, S1-16, etc.
  
  // Complete data lineage: person → lines → filters
  sourcePersonId: varchar("source_person_id").references(() => employees.employeeId),
  sourceDataType: varchar("source_data_type", { length: 50 }).notNull(), // payroll_line, timesheet, leave_record
  sourceRecordId: varchar("source_record_id").notNull(), // ID of the source record
  sourceTableName: varchar("source_table_name", { length: 100 }).notNull(),
  
  // Filters and transformations applied
  filtersApplied: jsonb("filters_applied").default('{}'), // Date ranges, employee criteria, etc.
  transformationSteps: jsonb("transformation_steps").default('[]'), // Step-by-step calc process
  calculationInputs: jsonb("calculation_inputs").default('{}'), // Raw input values
  calculationOutputs: jsonb("calculation_outputs").default('{}'), // Calculated results
  
  // Calculation version and method tracking
  calculationVersion: varchar("calculation_version", { length: 50 }).notNull(), // esrs_s1.v2025_quickfix
  calculationMethod: text("calculation_method").notNull(), // Full formula description
  explanatoryNote: text("explanatory_note"), // Human-readable explanation
  
  // Audit metadata
  calculationDate: timestamp("calculation_date").notNull(),
  calculatedBy: varchar("calculated_by").notNull(),
  reviewedBy: varchar("reviewed_by"),
  approvedBy: varchar("approved_by"),
  
  // Data quality indicators
  confidenceLevel: varchar("confidence_level", { length: 20 }), // high, medium, low
  dataQualityScore: decimal("data_quality_score", { precision: 5, scale: 2 }), // 0-100
  limitationsNotes: text("limitations_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Evidence Pack Management for Limited Assurance
export const s1EvidencePacks = pgTable("s1_evidence_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").notNull().references(() => csrdReportingPeriods.id),
  
  // Evidence pack metadata
  packType: varchar("pack_type", { length: 50 }).notNull(), // limited_assurance, full_audit, compliance_check
  packName: varchar("pack_name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Scope of evidence
  metricsIncluded: jsonb("metrics_included").default('[]'), // Array of S1 metric codes
  periodCovered: jsonb("period_covered").notNull(), // Start/end dates
  entitiesIncluded: jsonb("entities_included").default('[]'), // Properties/entities
  
  // Evidence files and extracts
  csvExtracts: jsonb("csv_extracts").default('[]'), // File paths/URLs to CSV extracts
  methodNotes: text("method_notes").notNull(), // Detailed calculation methods
  supportingDocuments: jsonb("supporting_documents").default('[]'), // Additional evidence
  
  // Assurance level
  assuranceLevel: varchar("assurance_level", { length: 20 }).notNull(), // limited, reasonable, none
  assuranceProvider: varchar("assurance_provider", { length: 255 }), // External auditor
  assuranceDate: date("assurance_date"),
  assuranceOpinion: text("assurance_opinion"),
  
  // Status and workflow
  status: varchar("status", { length: 20 }).default("draft"), // draft, review, approved, submitted
  generatedBy: varchar("generated_by").notNull(),
  reviewedBy: varchar("reviewed_by"),
  approvedBy: varchar("approved_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ESRS Set 1 Taxonomy and XBRL Tagging
export const esrsTaxonomy = pgTable("esrs_taxonomy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Taxonomy versioning
  taxonomyVersion: varchar("taxonomy_version", { length: 50 }).notNull(), // ESRS_Set1_2024, ESRS_Set1_2025
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date"),
  isActive: boolean("is_active").default(true),
  
  // XBRL element details
  elementId: varchar("element_id", { length: 200 }).notNull(), // XBRL element identifier
  elementName: varchar("element_name", { length: 500 }).notNull(),
  elementType: varchar("element_type", { length: 50 }), // monetary, percent, count, text
  
  // ESRS mapping
  esrsStandard: varchar("esrs_standard", { length: 20 }).notNull(), // ESRS S1
  esrsSection: varchar("esrs_section", { length: 50 }), // S1-6, S1-16, S1-17
  metricCode: varchar("metric_code", { length: 20 }), // Maps to our internal codes
  
  // XBRL technical details
  namespace: varchar("namespace", { length: 200 }),
  dataType: varchar("data_type", { length: 50 }), // xbrli:monetary, num:percent
  periodType: varchar("period_type", { length: 20 }), // instant, duration
  balance: varchar("balance", { length: 20 }), // debit, credit
  
  // Human-readable details
  label: text("label").notNull(),
  documentation: text("documentation"),
  calculationFormula: text("calculation_formula"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// S1 XBRL Instance Documents
export const s1XbrlInstances = pgTable("s1_xbrl_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").notNull().references(() => csrdReportingPeriods.id),
  taxonomyId: varchar("taxonomy_id").notNull().references(() => esrsTaxonomy.id),
  
  // XBRL instance details
  elementId: varchar("element_id", { length: 200 }).notNull(),
  contextRef: varchar("context_ref", { length: 100 }).notNull(), // Period and entity context
  unitRef: varchar("unit_ref", { length: 50 }), // EUR, percent, pure
  
  // Value and metadata
  xbrlValue: text("xbrl_value").notNull(), // The tagged value
  originalValue: jsonb("original_value"), // Source calculation result
  valueType: varchar("value_type", { length: 20 }), // numeric, text, boolean
  
  // Data lineage reference
  lineageId: varchar("lineage_id").references(() => s1DataLineage.id),
  
  // Validation and quality
  isValid: boolean("is_valid").default(true),
  validationNotes: text("validation_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Human-readable S1 Report Sections
export const s1ReportSections = pgTable("s1_report_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportingPeriodId: varchar("reporting_period_id").notNull().references(() => csrdReportingPeriods.id),
  
  // Section organization
  sectionCode: varchar("section_code", { length: 20 }).notNull(), // S1-6, S1-16, etc.
  sectionTitle: varchar("section_title", { length: 500 }).notNull(),
  sectionType: varchar("section_type", { length: 50 }), // narrative, metrics, policies
  sortOrder: integer("sort_order").default(0),
  
  // Content generation
  humanReadableText: text("human_readable_text").notNull(), // Generated narrative
  metricsIncluded: jsonb("metrics_included").default('[]'), // Referenced metrics
  templatesUsed: jsonb("templates_used").default('[]'), // Template references
  
  // Language and localization
  language: varchar("language", { length: 5 }).default("en"), // en, el (Greek)
  generationMethod: varchar("generation_method", { length: 50 }), // template, ai_generated, manual
  
  // Quality and review
  contentStatus: varchar("content_status", { length: 20 }).default("draft"), // draft, review, approved
  reviewedBy: varchar("reviewed_by"),
  approvedBy: varchar("approved_by"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================================================
// EMBEDDED PAYROLL + GL API SCHEMA
// =====================================================

// Partners/API Keys Management
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  clientId: varchar("client_id", { length: 255 }).notNull().unique(),
  clientSecret: varchar("client_secret", { length: 255 }).notNull(),
  allowedOrigins: jsonb("allowed_origins").default('[]'), // Array of allowed origins
  scopes: jsonb("scopes").default('[]'), // Array of allowed scopes
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, suspended, inactive
  webhookUrl: varchar("webhook_url", { length: 500 }),
  webhookSecret: varchar("webhook_secret", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OAuth2 Access Tokens
export const accessTokens = pgTable("access_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 255 }).notNull().references(() => partners.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: varchar("token_type", { length: 20 }).notNull().default("Bearer"),
  scopes: jsonb("scopes").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Idempotency Keys
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  partnerId: varchar("partner_id", { length: 255 }).notNull().references(() => partners.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
  responseData: jsonb("response_data"),
  responseStatus: integer("response_status"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueKey: index("idempotency_unique").on(table.idempotencyKey, table.partnerId, table.endpoint),
}));

// Hash-Chained Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 255 }).references(() => partners.id, { onDelete: "cascade" }),
  sequenceNumber: integer("sequence_number").notNull(),
  previousHash: varchar("previous_hash", { length: 64 }),
  currentHash: varchar("current_hash", { length: 64 }).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  action: varchar("action", { length: 50 }).notNull(),
  payload: jsonb("payload"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

// GL Connections (Xero, QBO, Generic)
export const glConnections = pgTable("gl_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 255 }).notNull().references(() => partners.id, { onDelete: "cascade" }),
  glProvider: varchar("gl_provider", { length: 20 }).notNull(), // xero, quickbooks, generic
  connectionName: varchar("connection_name", { length: 255 }).notNull(),
  tenantId: varchar("tenant_id", { length: 255 }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, expired, error, disconnected
  lastSyncAt: timestamp("last_sync_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GL Account Mappings
export const glMappings = pgTable("gl_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id", { length: 255 }).notNull().references(() => glConnections.id, { onDelete: "cascade" }),
  payrollComponent: varchar("payroll_component", { length: 100 }).notNull(),
  componentType: varchar("component_type", { length: 20 }).notNull(), // earning, deduction, tax, benefit
  glAccountCode: varchar("gl_account_code", { length: 50 }).notNull(),
  glAccountName: varchar("gl_account_name", { length: 255 }),
  debitAccount: varchar("debit_account", { length: 50 }),
  creditAccount: varchar("credit_account", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GL Journal Entries
export const glJournals = pgTable("gl_journals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id", { length: 255 }).notNull().references(() => glConnections.id, { onDelete: "cascade" }),
  payrollRunId: varchar("payroll_run_id", { length: 255 }),
  journalReference: varchar("journal_reference", { length: 100 }).notNull(),
  journalDate: date("journal_date").notNull(),
  description: text("description").notNull(),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).notNull().default("0.00"),
  externalId: varchar("external_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, posted, error, reversed
  errorMessage: text("error_message"),
  journalData: jsonb("journal_data"),
  createdAt: timestamp("created_at").defaultNow(),
  postedAt: timestamp("posted_at"),
});

// GL Journal Lines
export const glJournalLines = pgTable("gl_journal_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  journalId: varchar("journal_id", { length: 255 }).notNull().references(() => glJournals.id, { onDelete: "cascade" }),
  lineNumber: integer("line_number").notNull(),
  accountCode: varchar("account_code", { length: 50 }).notNull(),
  accountName: varchar("account_name", { length: 255 }),
  description: text("description").notNull(),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0.00"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0.00"),
  reference: varchar("reference", { length: 100 }),
  employeeId: varchar("employee_id", { length: 255 }),
  departmentCode: varchar("department_code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Webhook Events
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 255 }).notNull().references(() => partners.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }).notNull(),
  payload: jsonb("payload").notNull(),
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, delivered, failed, cancelled
  lastAttemptAt: timestamp("last_attempt_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Embedded Sessions (JWT)
export const embeddedSessions = pgTable("embedded_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id", { length: 255 }).notNull().references(() => partners.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull(),
  employeeId: varchar("employee_id", { length: 255 }),
  allowedRoutes: jsonb("allowed_routes").notNull(),
  originDomain: varchar("origin_domain", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for embedded payroll system
export const partnerRelations = relations(partners, ({ many }) => ({
  accessTokens: many(accessTokens),
  auditLogs: many(auditLogs),
  glConnections: many(glConnections),
  webhookEvents: many(webhookEvents),
  embeddedSessions: many(embeddedSessions),
}));

export const accessTokenRelations = relations(accessTokens, ({ one }) => ({
  partner: one(partners, {
    fields: [accessTokens.partnerId],
    references: [partners.id],
  }),
}));

export const glConnectionRelations = relations(glConnections, ({ one, many }) => ({
  partner: one(partners, {
    fields: [glConnections.partnerId],
    references: [partners.id],
  }),
  mappings: many(glMappings),
  journals: many(glJournals),
}));

export const glMappingRelations = relations(glMappings, ({ one }) => ({
  connection: one(glConnections, {
    fields: [glMappings.connectionId],
    references: [glConnections.id],
  }),
}));

export const glJournalRelations = relations(glJournals, ({ one, many }) => ({
  connection: one(glConnections, {
    fields: [glJournals.connectionId],
    references: [glConnections.id],
  }),
  lines: many(glJournalLines),
}));

export const glJournalLineRelations = relations(glJournalLines, ({ one }) => ({
  journal: one(glJournals, {
    fields: [glJournalLines.journalId],
    references: [glJournals.id],
  }),
}));

// Insert schemas for audit & XBRL system (placed after all table definitions)
export const insertS1DataLineageSchema = createInsertSchema(s1DataLineage);
export const insertS1EvidencePacksSchema = createInsertSchema(s1EvidencePacks);
export const insertEsrsTaxonomySchema = createInsertSchema(esrsTaxonomy);
export const insertS1XbrlInstancesSchema = createInsertSchema(s1XbrlInstances);
export const insertS1ReportSectionsSchema = createInsertSchema(s1ReportSections);

// Insert schemas for embedded payroll + GL API
export const insertPartnerSchema = createInsertSchema(partners).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAccessTokenSchema = createInsertSchema(accessTokens).omit({ id: true, createdAt: true });
export const insertGLConnectionSchema = createInsertSchema(glConnections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGLMappingSchema = createInsertSchema(glMappings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGLJournalSchema = createInsertSchema(glJournals).omit({ id: true, createdAt: true, postedAt: true });
export const insertGLJournalLineSchema = createInsertSchema(glJournalLines).omit({ id: true, createdAt: true });
export const insertEmbeddedSessionSchema = createInsertSchema(embeddedSessions).omit({ id: true, createdAt: true });
export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, createdAt: true });

// Types for embedded payroll + GL API
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type AccessToken = typeof accessTokens.$inferSelect;
export type InsertAccessToken = z.infer<typeof insertAccessTokenSchema>;
export type GLConnection = typeof glConnections.$inferSelect;
export type InsertGLConnection = z.infer<typeof insertGLConnectionSchema>;
export type GLMapping = typeof glMappings.$inferSelect;
export type InsertGLMapping = z.infer<typeof insertGLMappingSchema>;
export type GLJournal = typeof glJournals.$inferSelect;
export type InsertGLJournal = z.infer<typeof insertGLJournalSchema>;
export type GLJournalLine = typeof glJournalLines.$inferSelect;
export type InsertGLJournalLine = z.infer<typeof insertGLJournalLineSchema>;
export type EmbeddedSession = typeof embeddedSessions.$inferSelect;
export type InsertEmbeddedSession = z.infer<typeof insertEmbeddedSessionSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;

// =============================================================================
// GL DATA MODEL (CANONICAL)
// =============================================================================

// Journal Header - Main journal entries with payroll context
export const glJournalHeaders = pgTable("gl_journal_headers", {
  journalId: uuid("journal_id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(), // Legal entity or company code
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM format
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  
  // Journal Status and Control
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft|posted|reversed
  source: varchar("source", { length: 50 }).notNull().default("payroll"), // Source system identifier
  runId: varchar("run_id").references(() => payrollRuns.runId), // Link to payroll run
  
  // Metadata and References
  description: text("description"), // Journal description
  externalRefs: jsonb("external_refs").default('[]'), // Array of external system references
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  postedAt: timestamp("posted_at"), // When journal was posted to GL
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Journal Lines - Individual debit/credit entries with dimensions
export const glJournalLinesCanonical = pgTable("gl_journal_lines_canonical", {
  lineId: uuid("line_id").primaryKey().default(sql`gen_random_uuid()`),
  journalId: uuid("journal_id").references(() => glJournalHeaders.journalId).notNull(),
  
  // GL Account and Amounts
  accountCode: varchar("account_code", { length: 50 }).notNull(), // Chart of accounts code
  debit: decimal("debit", { precision: 12, scale: 2 }).default("0.00"), // Debit amount
  credit: decimal("credit", { precision: 12, scale: 2 }).default("0.00"), // Credit amount
  description: text("description").notNull(), // Line description
  
  // Dimensional Accounting - Core Dimensions
  costCenter: varchar("cost_center", { length: 20 }), // Cost center code
  department: varchar("department", { length: 20 }), // Department code
  propertyId: varchar("property_id").references(() => properties.propertyId), // Property/location
  project: varchar("project", { length: 20 }), // Project code
  
  // Employee/Payroll Specific Dimensions (optional)
  employeeId: varchar("employee_id").references(() => employees.employeeId), // Employee reference
  earningsCode: varchar("earnings_code", { length: 20 }), // Payroll earnings/deduction code
  
  // Tax Fields (rarely used in payroll journals but available)
  taxCode: varchar("tax_code", { length: 20 }), // Tax code if applicable
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }), // Tax amount if applicable
  
  // System fields
  lineNumber: integer("line_number").notNull(), // Sequence within journal
  createdAt: timestamp("created_at").defaultNow(),
});

// GL Account Master - Chart of Accounts
export const glAccounts = pgTable("gl_accounts", {
  accountId: varchar("account_id").primaryKey().default(sql`gen_random_uuid()`),
  accountCode: varchar("account_code", { length: 50 }).notNull().unique(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull(), // Asset, Liability, Equity, Revenue, Expense
  parentAccountId: varchar("parent_account_id").references(() => glAccounts.accountId),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Earnings Code to GL Account Mappings
export const glEarningsCodeMappings = pgTable("gl_earnings_code_mappings", {
  mappingId: varchar("mapping_id").primaryKey().default(sql`gen_random_uuid()`),
  earningsCode: varchar("earnings_code", { length: 20 }).notNull(), // REG, OT1, OT2, NIGHT, SUNDAY, HOLIDAY, BONUS, TIPS
  earningsType: varchar("earnings_type", { length: 50 }).notNull(), // regular, overtime, allowance, bonus, deduction
  accountCode: varchar("account_code", { length: 50 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Deduction/Liability Code to GL Account Mappings
export const glDeductionMappings = pgTable("gl_deduction_mappings", {
  mappingId: varchar("mapping_id").primaryKey().default(sql`gen_random_uuid()`),
  deductionCode: varchar("deduction_code", { length: 20 }).notNull(), // EFKA_EE, EFKA_ER, TAX_WHT, IKA, etc.
  deductionType: varchar("deduction_type", { length: 50 }).notNull(), // social_security, tax_withholding, insurance, other
  accountCode: varchar("account_code", { length: 50 }).notNull(), // Payable account
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employer Cost to GL Account Mappings
export const glEmployerCostMappings = pgTable("gl_employer_cost_mappings", {
  mappingId: varchar("mapping_id").primaryKey().default(sql`gen_random_uuid()`),
  costCode: varchar("cost_code", { length: 20 }).notNull(), // EFKA_EMPLOYER, INSURANCE, BENEFITS, PROVISIONS
  costType: varchar("cost_type", { length: 50 }).notNull(), // social_security, insurance, benefits, provisions
  accountCode: varchar("account_code", { length: 50 }).notNull(), // Expense account
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bank/Clearing Account Mappings
export const glBankMappings = pgTable("gl_bank_mappings", {
  mappingId: varchar("mapping_id").primaryKey().default(sql`gen_random_uuid()`),
  bankCode: varchar("bank_code", { length: 20 }).notNull(), // PAYROLL_CLEARING, ALPHA_BANK, PIRAEUS, etc.
  bankType: varchar("bank_type", { length: 50 }).notNull(), // clearing, bank_account
  accountCode: varchar("account_code", { length: 50 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }),
  iban: varchar("iban", { length: 34 }), // For bank accounts
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dimensional Mappings - Cost Center and Department Mappings
export const glDimensionMappings = pgTable("gl_dimension_mappings", {
  mappingId: varchar("mapping_id").primaryKey().default(sql`gen_random_uuid()`),
  dimensionType: varchar("dimension_type", { length: 20 }).notNull(), // cost_center, department, property
  dimensionCode: varchar("dimension_code", { length: 50 }).notNull(), // The actual code value
  dimensionName: varchar("dimension_name", { length: 255 }).notNull(), // Display name
  propertyId: varchar("property_id").references(() => properties.propertyId), // For property-based cost centers
  parentDimension: varchar("parent_dimension", { length: 50 }), // Hierarchical structure
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// GL CANONICAL RELATIONS
// =============================================================================

export const glJournalHeadersRelations = relations(glJournalHeaders, ({ one, many }) => ({
  payrollRun: one(payrollRuns, {
    fields: [glJournalHeaders.runId],
    references: [payrollRuns.runId],
  }),
  journalLines: many(glJournalLinesCanonical),
}));

export const glJournalLinesCanonicalRelations = relations(glJournalLinesCanonical, ({ one }) => ({
  journal: one(glJournalHeaders, {
    fields: [glJournalLinesCanonical.journalId],
    references: [glJournalHeaders.journalId],
  }),
  property: one(properties, {
    fields: [glJournalLinesCanonical.propertyId],
    references: [properties.propertyId],
  }),
  employee: one(employees, {
    fields: [glJournalLinesCanonical.employeeId],
    references: [employees.employeeId],
  }),
}));

export const glAccountsRelations = relations(glAccounts, ({ one, many }) => ({
  parentAccount: one(glAccounts, {
    fields: [glAccounts.parentAccountId],
    references: [glAccounts.accountId],
  }),
  childAccounts: many(glAccounts),
}));

// =============================================================================
// GL CANONICAL SCHEMA EXPORTS
// =============================================================================

// Journal Header schemas
export const insertGLJournalHeaderSchema = createInsertSchema(glJournalHeaders).omit({
  journalId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGLJournalHeader = z.infer<typeof insertGLJournalHeaderSchema>;
export type GLJournalHeader = typeof glJournalHeaders.$inferSelect;

// Journal Line schemas
export const insertGLJournalLineCanonicalSchema = createInsertSchema(glJournalLinesCanonical).omit({
  lineId: true,
  createdAt: true,
});
export type InsertGLJournalLineCanonical = z.infer<typeof insertGLJournalLineCanonicalSchema>;
export type GLJournalLineCanonical = typeof glJournalLinesCanonical.$inferSelect;

// GL Account schemas
export const insertGLAccountSchema = createInsertSchema(glAccounts).omit({
  accountId: true,
  createdAt: true,
});
export type InsertGLAccount = z.infer<typeof insertGLAccountSchema>;
export type GLAccount = typeof glAccounts.$inferSelect;

// Mapping schemas
export const insertGLEarningsCodeMappingSchema = createInsertSchema(glEarningsCodeMappings).omit({
  mappingId: true,
  createdAt: true,
});
export type InsertGLEarningsCodeMapping = z.infer<typeof insertGLEarningsCodeMappingSchema>;
export type GLEarningsCodeMapping = typeof glEarningsCodeMappings.$inferSelect;

export const insertGLDeductionMappingSchema = createInsertSchema(glDeductionMappings).omit({
  mappingId: true,
  createdAt: true,
});
export type InsertGLDeductionMapping = z.infer<typeof insertGLDeductionMappingSchema>;
export type GLDeductionMapping = typeof glDeductionMappings.$inferSelect;

export const insertGLEmployerCostMappingSchema = createInsertSchema(glEmployerCostMappings).omit({
  mappingId: true,
  createdAt: true,
});
export type InsertGLEmployerCostMapping = z.infer<typeof insertGLEmployerCostMappingSchema>;
export type GLEmployerCostMapping = typeof glEmployerCostMappings.$inferSelect;

export const insertGLBankMappingSchema = createInsertSchema(glBankMappings).omit({
  mappingId: true,
  createdAt: true,
});
export type InsertGLBankMapping = z.infer<typeof insertGLBankMappingSchema>;
export type GLBankMapping = typeof glBankMappings.$inferSelect;

export const insertGLDimensionMappingSchema = createInsertSchema(glDimensionMappings).omit({
  mappingId: true,
  createdAt: true,
});
export type InsertGLDimensionMapping = z.infer<typeof insertGLDimensionMappingSchema>;
export type GLDimensionMapping = typeof glDimensionMappings.$inferSelect;
