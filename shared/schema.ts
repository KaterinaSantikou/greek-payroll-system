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

// Employees table - Essential fields only
export const employees = pgTable("employees", {
  employeeId: varchar("employee_id").primaryKey().default(sql`gen_random_uuid()`),
  afm: varchar("afm", { length: 9 }), // Optional as specified
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(),
  employmentType: varchar("employment_type", { length: 50 }).notNull(), // full-time, part-time, contract, seasonal
  hireDate: date("hire_date").notNull(),
  termDate: date("term_date"), // Termination date, null if active
  defaultPropertyId: varchar("default_property_id").references(() => properties.propertyId),
  unionCbaRef: varchar("union_cba_ref", { length: 100 }), // Union/CBA reference
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shifts table
export const shifts = pgTable("shifts", {
  shiftId: varchar("shift_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.employeeId).notNull(),
  startPlanned: timestamp("start_planned").notNull(), // Planned start time
  endPlanned: timestamp("end_planned").notNull(), // Planned end time
  role: varchar("role", { length: 100 }).notNull(),
  propertyId: varchar("property_id").references(() => properties.propertyId).notNull(),
  mealBreakPolicy: jsonb("meal_break_policy"), // Break policy configuration
  tags: jsonb("tags").default('[]'), // night, split, overtime, etc.
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

export type ComplianceAlert = typeof complianceAlerts.$inferSelect;
export type InsertComplianceAlert = z.infer<typeof insertComplianceAlertSchema>;

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type ErganiSubmissionLog = typeof erganiSubmissionLog.$inferSelect;
export type InsertErganiSubmissionLog = z.infer<typeof insertErganiSubmissionLogSchema>;

export type DataRetentionPolicy = typeof dataRetentionPolicy.$inferSelect;
export type InsertDataRetentionPolicy = z.infer<typeof insertDataRetentionPolicySchema>;