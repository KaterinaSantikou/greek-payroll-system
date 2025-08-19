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

// Success Metrics tables
export const successMetrics = pgTable("success_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  metricDate: timestamp("metric_date").notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  
  // ERGANI Submission Metrics
  erganiSubmissionTotal: integer("ergani_submission_total").notNull().default(0),
  erganiSubmissionSuccess: integer("ergani_submission_success").notNull().default(0),
  erganiSubmissionRate: decimal("ergani_submission_rate").notNull().default("0"), // Percentage
  
  // Exception Metrics
  totalExceptions: integer("total_exceptions").notNull().default(0),
  resolvedExceptions: integer("resolved_exceptions").notNull().default(0),
  unresolvedExceptions: integer("unresolved_exceptions").notNull().default(0),
  unresolvedExceptionRate: decimal("unresolved_exception_rate").notNull().default("0"), // Percentage
  
  // Punch Verification Metrics
  totalPunches: integer("total_punches").notNull().default(0),
  geoVerifiedPunches: integer("geo_verified_punches").notNull().default(0),
  geoVerificationRate: decimal("geo_verification_rate").notNull().default("0"), // Percentage
  manualPayrollEntries: integer("manual_payroll_entries").notNull().default(0),
  
  // Overtime Metrics
  scheduledOvertimeHours: decimal("scheduled_overtime_hours").notNull().default("0"),
  actualOvertimeHours: decimal("actual_overtime_hours").notNull().default("0"),
  overtimeVariance: decimal("overtime_variance").notNull().default("0"), // Percentage
  overtimePolicyCompliance: boolean("overtime_policy_compliance").notNull().default(true),
  
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