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

// Enhanced User authentication table (backward compatible with Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  emailVerified: boolean("email_verified").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  locale: varchar("locale").default('en').notNull(), // 'en' or 'el' (Greek)
  timezone: varchar("timezone").default('Europe/Athens'),
  mfaEnabled: boolean("mfa_enabled").default(false),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  gdprConsentAt: timestamp("gdpr_consent_at"),
  tosAcceptedAt: timestamp("tos_accepted_at"),
  privacyAcceptedAt: timestamp("privacy_accepted_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email verification tokens
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Magic link tokens
export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// MFA TOTP secrets
export const mfaTotpSecrets = pgTable("mfa_totp_secrets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  secret: varchar("secret").notNull(),
  backupCodes: jsonb("backup_codes"), // Array of hashed backup codes
  enabled: boolean("enabled").default(false),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// MFA backup codes (separate table for better management)
export const mfaBackupCodes = pgTable("mfa_backup_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  codeHash: varchar("code_hash").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

// WebAuthn credentials (passkeys)
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  credentialId: varchar("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").default(0),
  transports: text("transports"), // JSON array of transports
  name: varchar("name"), // User-friendly name
  deviceName: varchar("device_name"), // Keep backward compatibility
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// SSO providers configuration
export const ssoProviders = pgTable("sso_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // e.g., 'Google', 'Microsoft', 'Custom SAML'
  type: varchar("type").notNull(), // 'oidc' or 'saml'
  domain: varchar("domain"), // Auto-discover by email domain
  clientId: varchar("client_id"),
  clientSecret: varchar("client_secret"),
  issuer: varchar("issuer"), // OIDC issuer URL
  samlMetadata: text("saml_metadata"), // SAML metadata XML
  config: jsonb("config"), // Additional provider-specific config
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User SSO connections
export const userSsoConnections = pgTable("user_sso_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  providerId: varchar("provider_id").references(() => ssoProviders.id, { onDelete: 'cascade' }),
  externalId: varchar("external_id").notNull(), // User ID from SSO provider
  email: varchar("email"),
  displayName: varchar("display_name"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced session management
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: varchar("session_token").notNull().unique(),
  refreshToken: varchar("refresh_token").unique(),
  expiresAt: timestamp("expires_at").notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  deviceFingerprint: varchar("device_fingerprint"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Authentication audit log
export const authAuditLogs = pgTable("auth_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  sessionId: varchar("session_id").references(() => userSessions.id, { onDelete: 'set null' }),
  action: varchar("action").notNull(), // login, logout, signup, password_reset, mfa_setup, etc.
  method: varchar("method"), // password, sso, magic_link, mfa
  result: varchar("result").notNull(), // success, failure, blocked
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  metadata: jsonb("metadata"), // Additional context data
  riskScore: integer("risk_score"), // 0-100, for fraud detection
  timestamp: timestamp("timestamp").defaultNow(),
});

// Rate limiting table
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  identifier: varchar("identifier").notNull(), // IP address, user ID, or email
  endpoint: varchar("endpoint").notNull(), // API endpoint or action type
  count: integer("count").default(1),
  windowStart: timestamp("window_start").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_rate_limits_identifier_endpoint").on(table.identifier, table.endpoint)]);

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

// =====================================================
// DISASTER RECOVERY AND BUSINESS CONTINUITY TABLES
// =====================================================

// Tabletop Disaster Recovery Exercises
export const disasterRecoveryExercises = pgTable("disaster_recovery_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  exerciseType: varchar("exercise_type", { length: 50 }).notNull(), // "tabletop", "walkthrough", "simulation", "full_test"
  scenario: text("scenario").notNull(), // Disaster scenario description
  scope: jsonb("scope").notNull(), // {systems: [], departments: [], recovery_sites: []}
  participants: jsonb("participants").notNull(), // [{userId, role, department}]
  facilitator: varchar("facilitator").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  status: varchar("status", { length: 20 }).default("scheduled"), // scheduled, in_progress, completed, cancelled
  results: jsonb("results"), // {objectives_met: [], gaps_identified: [], action_items: []}
  findings: text("findings"),
  actionItems: jsonb("action_items"), // [{item, owner, dueDate, status}]
  nextExerciseDate: timestamp("next_exercise_date"),
  complianceRequirement: varchar("compliance_requirement"), // "SOX", "ISO27001", "custom"
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Automated Restore Testing
export const automatedRestoreTests = pgTable("automated_restore_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testName: varchar("test_name", { length: 200 }).notNull(),
  backupSource: varchar("backup_source", { length: 100 }).notNull(), // "database", "object_storage", "application_data"
  backupTimestamp: timestamp("backup_timestamp").notNull(),
  restoreTarget: varchar("restore_target", { length: 100 }).notNull(), // "test_env", "staging", "sandbox"
  testType: varchar("test_type", { length: 50 }).notNull(), // "full_restore", "partial_restore", "point_in_time"
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 20 }).default("running"), // running, completed, failed, cancelled
  result: varchar("result", { length: 20 }), // success, failure, warning
  validationChecks: jsonb("validation_checks").notNull(), // [{check: "data_integrity", status: "pass", details: ""}]
  metricsCollected: jsonb("metrics_collected"), // {restore_time_mins, data_size_gb, integrity_score}
  errorLogs: text("error_logs"),
  restoredDataSample: jsonb("restored_data_sample"), // Sample data for verification
  nextScheduledTest: timestamp("next_scheduled_test"),
  automationScript: text("automation_script"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RPO/RTO SLA Monitoring
export const rpoRtoSlaTracking = pgTable("rpo_rto_sla_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  serviceCategory: varchar("service_category", { length: 50 }).notNull(), // "critical", "important", "standard"
  rpoTargetMinutes: integer("rpo_target_minutes").notNull(), // Recovery Point Objective in minutes
  rtoTargetMinutes: integer("rto_target_minutes").notNull(), // Recovery Time Objective in minutes
  actualRpoMinutes: integer("actual_rpo_minutes"),
  actualRtoMinutes: integer("actual_rto_minutes"),
  slaStatus: varchar("sla_status", { length: 20 }).default("compliant"), // compliant, breach, warning
  incidentId: varchar("incident_id"),
  breachReason: text("breach_reason"),
  breachStartTime: timestamp("breach_start_time"),
  breachEndTime: timestamp("breach_end_time"),
  mitigationActions: jsonb("mitigation_actions"), // [{action, timestamp, responsible}]
  businessImpact: text("business_impact"),
  alertsSent: jsonb("alerts_sent"), // [{channel, timestamp, recipient}]
  escalationLevel: integer("escalation_level").default(0), // 0-4 escalation levels
  ownerTeam: varchar("owner_team", { length: 100 }),
  lastCheckedAt: timestamp("last_checked_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Object Storage WORM (Write Once Read Many) Registry
export const wormObjectRegistry = pgTable("worm_object_registry", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectPath: varchar("object_path", { length: 500 }).notNull().unique(),
  bucketName: varchar("bucket_name", { length: 100 }).notNull(),
  objectKey: varchar("object_key", { length: 400 }).notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(), // SHA-256 hash
  contentSize: integer("content_size").notNull(),
  contentType: varchar("content_type", { length: 100 }),
  wormStatus: varchar("worm_status", { length: 20 }).default("protected"), // protected, verified, corrupted
  retentionPeriodDays: integer("retention_period_days").notNull(),
  retentionExpiresAt: timestamp("retention_expires_at").notNull(),
  legalHoldStatus: boolean("legal_hold_status").default(false),
  legalHoldReason: text("legal_hold_reason"),
  complianceRequirement: varchar("compliance_requirement"), // "SOX", "GDPR", "audit", "regulatory"
  auditTrailRef: varchar("audit_trail_ref"), // Reference to audit log entry
  createdBy: varchar("created_by").notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
  verificationStatus: varchar("verification_status", { length: 20 }).default("pending"), // pending, verified, failed
  tamperAttempts: integer("tamper_attempts").default(0),
  accessLog: jsonb("access_log"), // [{timestamp, userId, action, result}]
  createdAt: timestamp("created_at").defaultNow(),
});

// Disaster Recovery SLA Agreements (Formal documentation)
export const disasterRecoverySLAs = pgTable("disaster_recovery_slas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceName: varchar("service_name", { length: 100 }).notNull(),
  businessUnit: varchar("business_unit", { length: 100 }),
  criticality: varchar("criticality", { length: 20 }).notNull(), // "critical", "high", "medium", "low"
  rpoHours: decimal("rpo_hours", { precision: 6, scale: 2 }).notNull(),
  rtoHours: decimal("rto_hours", { precision: 6, scale: 2 }).notNull(),
  availabilityTarget: decimal("availability_target", { precision: 5, scale: 2 }).notNull(), // 99.99%
  recoveryLocation: varchar("recovery_location", { length: 100 }),
  backupFrequency: varchar("backup_frequency", { length: 50 }), // "real-time", "hourly", "daily", "weekly"
  testingFrequency: varchar("testing_frequency", { length: 50 }), // "monthly", "quarterly", "annually"
  businessImpactPerHour: decimal("business_impact_per_hour", { precision: 12, scale: 2 }),
  escalationMatrix: jsonb("escalation_matrix"), // [{level, role, contact, timeframe}]
  dependencies: jsonb("dependencies"), // {upstream: [], downstream: [], external: []}
  complianceFramework: varchar("compliance_framework"), // "SOX", "ISO27001", "custom"
  approvedBy: varchar("approved_by").notNull(),
  approvedAt: timestamp("approved_at").notNull(),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveUntil: timestamp("effective_until"),
  lastReviewDate: timestamp("last_review_date"),
  nextReviewDate: timestamp("next_review_date").notNull(),
  version: varchar("version", { length: 10 }).default("1.0"),
  status: varchar("status", { length: 20 }).default("active"), // active, draft, expired, superseded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// GARNISHMENTS & COURT ORDERS SCHEMA
// =============================================================================

// Garnishment orders for court-mandated deductions
export const garnishmentOrders = pgTable("garnishment_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  orderNumber: varchar("order_number").notNull(), // Court order number
  creditorName: varchar("creditor_name").notNull(),
  creditorAccountCode: varchar("creditor_account_code"), // GL account for liability posting
  orderType: varchar("order_type").notNull(), // 'child_support', 'tax_levy', 'wage_garnishment', 'student_loan'
  priority: integer("priority").notNull().default(1), // 1 = highest priority
  status: varchar("status").notNull().default('active'), // 'active', 'suspended', 'satisfied', 'terminated'
  
  // Deduction configuration
  deductionType: varchar("deduction_type").notNull(), // 'fixed_amount', 'percentage', 'percentage_with_cap'
  deductionAmount: decimal("deduction_amount", { precision: 10, scale: 2 }),
  deductionPercentage: decimal("deduction_percentage", { precision: 5, scale: 4 }),
  maximumAmount: decimal("maximum_amount", { precision: 10, scale: 2 }), // Per-pay-period cap
  
  // Balance tracking
  totalOrderAmount: decimal("total_order_amount", { precision: 12, scale: 2 }), // Total owed (if known)
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default('0.00'),
  totalDeducted: decimal("total_deducted", { precision: 12, scale: 2 }).default('0.00'),
  
  // Net pay protection
  protectedNetAmount: decimal("protected_net_amount", { precision: 10, scale: 2 }), // Minimum net pay to preserve
  protectedPercentage: decimal("protected_percentage", { precision: 5, scale: 4 }), // % of gross to protect
  
  // Legal details
  courtName: varchar("court_name"),
  orderDate: date("order_date").notNull(),
  effectiveDate: date("effective_date").notNull(),
  expirationDate: date("expiration_date"),
  
  // Administrative
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
  notes: text("notes")
});

// Individual garnishment transactions per payroll run
export const garnishmentTransactions = pgTable("garnishment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  garnishmentOrderId: varchar("garnishment_order_id").notNull().references(() => garnishmentOrders.id),
  employeeId: varchar("employee_id").notNull(),
  payrollRunId: varchar("payroll_run_id"),
  payPeriodStart: date("pay_period_start").notNull(),
  payPeriodEnd: date("pay_period_end").notNull(),
  
  // Calculation details
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  disposableIncome: decimal("disposable_income", { precision: 10, scale: 2 }).notNull(), // After taxes/mandatory deductions
  calculatedAmount: decimal("calculated_amount", { precision: 10, scale: 2 }).notNull(), // Before caps/protection
  deductedAmount: decimal("deducted_amount", { precision: 10, scale: 2 }).notNull(), // Actual amount deducted
  carriedForwardAmount: decimal("carried_forward_amount", { precision: 10, scale: 2 }).default('0.00'), // Amount that couldn't be deducted
  
  // Net pay protection details
  netPayBeforeGarnishment: decimal("net_pay_before_garnishment", { precision: 10, scale: 2 }).notNull(),
  protectedAmount: decimal("protected_amount", { precision: 10, scale: 2 }).notNull(), // Amount protected from garnishment
  netPayAfterGarnishment: decimal("net_pay_after_garnishment", { precision: 10, scale: 2 }).notNull(),
  
  // GL posting reference
  glTransactionId: varchar("gl_transaction_id"), // Reference to GL posting
  
  // Status and audit
  status: varchar("status").notNull().default('processed'), // 'processed', 'reversed', 'adjusted'
  processedAt: timestamp("processed_at").defaultNow(),
  calculationLog: jsonb("calculation_log") // Detailed calculation breakdown
});

// Running balance and carry-forward tracking
export const garnishmentBalances = pgTable("garnishment_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  garnishmentOrderId: varchar("garnishment_order_id").notNull().references(() => garnishmentOrders.id),
  employeeId: varchar("employee_id").notNull(),
  
  // Balance tracking
  totalOrderAmount: decimal("total_order_amount", { precision: 12, scale: 2 }),
  totalDeducted: decimal("total_deducted", { precision: 12, scale: 2 }).default('0.00'),
  currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default('0.00'),
  carriedForwardAmount: decimal("carried_forward_amount", { precision: 12, scale: 2 }).default('0.00'),
  
  // Status
  status: varchar("status").notNull().default('active'), // 'active', 'satisfied', 'suspended'
  lastUpdated: timestamp("last_updated").defaultNow(),
  lastTransactionId: varchar("last_transaction_id").references(() => garnishmentTransactions.id)
});

// Type definitions for garnishments
export type GarnishmentOrder = typeof garnishmentOrders.$inferSelect;
export type InsertGarnishmentOrder = typeof garnishmentOrders.$inferInsert;
export type GarnishmentTransaction = typeof garnishmentTransactions.$inferSelect;
export type InsertGarnishmentTransaction = typeof garnishmentTransactions.$inferInsert;
export type GarnishmentBalance = typeof garnishmentBalances.$inferSelect;
export type InsertGarnishmentBalance = typeof garnishmentBalances.$inferInsert;

// Garnishment calculation input schema
export const garnishmentCalculationInputsSchema = z.object({
  employeeId: z.string(),
  grossPay: z.number().min(0),
  disposableIncome: z.number().min(0),
  netPayBeforeGarnishments: z.number().min(0),
  payPeriodStart: z.string(),
  payPeriodEnd: z.string(),
  payrollRunId: z.string().optional(),
  activeGarnishments: z.array(z.object({
    id: z.string(),
    orderNumber: z.string(),
    creditorName: z.string(),
    orderType: z.string(),
    priority: z.number(),
    deductionType: z.string(),
    deductionAmount: z.number().optional(),
    deductionPercentage: z.number().optional(),
    maximumAmount: z.number().optional(),
    protectedNetAmount: z.number().optional(),
    protectedPercentage: z.number().optional(),
    currentBalance: z.number(),
    carriedForwardAmount: z.number().default(0)
  }))
});

export type GarnishmentCalculationInputs = z.infer<typeof garnishmentCalculationInputsSchema>;

// =============================================================================
// SECURE IBAN VAULT & BANKING VALIDATION SCHEMA  
// =============================================================================

// Secure IBAN Vault for sensitive banking data
export const secureIbanVault = pgTable("secure_iban_vault", {
  vaultId: varchar("vault_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId, { onDelete: 'cascade' }),
  
  // Full IBAN (encrypted at rest)
  fullIban: varchar("full_iban", { length: 34 }).notNull(),
  ibanCountryCode: varchar("iban_country_code", { length: 2 }).notNull(),
  bankCode: varchar("bank_code", { length: 10 }),
  bankName: varchar("bank_name", { length: 100 }),
  
  // Account holder information
  accountHolderName: varchar("account_holder_name", { length: 140 }).notNull(),
  nameMatchScore: integer("name_match_score"), // 0-100 similarity score
  nameMatchStatus: varchar("name_match_status").default('pending'), // 'match', 'warning', 'override', 'pending'
  nameOverrideReason: varchar("name_override_reason"), // When name match failed but was overridden
  
  // Validation status
  ibanValidated: boolean("iban_validated").default(false),
  validatedAt: timestamp("validated_at"),
  validatedBy: varchar("validated_by"),
  
  // Usage tracking
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_secure_iban_employee").on(table.employeeId),
  index("idx_secure_iban_country").on(table.ibanCountryCode),
]);

// IBAN Validation History for audit trail
export const ibanValidationHistory = pgTable("iban_validation_history", {
  validationId: varchar("validation_id").primaryKey().default(sql`gen_random_uuid()`),
  vaultId: varchar("vault_id").references(() => secureIbanVault.vaultId),
  employeeId: varchar("employee_id").references(() => employees.employeeId),
  
  // Validation details
  maskedIban: varchar("masked_iban", { length: 50 }), // For logging (GR** **** **** **34)
  validationType: varchar("validation_type").notNull(), // 'format', 'checksum', 'name_match', 'manual_override'
  validationResult: varchar("validation_result").notNull(), // 'pass', 'fail', 'warning'
  errors: jsonb("errors"), // Array of error messages
  warnings: jsonb("warnings"), // Array of warning messages
  
  // Name matching details
  employeeNameUsed: varchar("employee_name_used", { length: 200 }),
  accountHolderNameProvided: varchar("account_holder_name_provided", { length: 140 }),
  nameSimilarityScore: integer("name_similarity_score"),
  
  // Validation context
  validatedBy: varchar("validated_by").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_iban_validation_vault").on(table.vaultId),
  index("idx_iban_validation_employee").on(table.employeeId),
  index("idx_iban_validation_date").on(table.createdAt),
]);

// IBAN Vault relations
export const secureIbanVaultRelations = relations(secureIbanVault, ({ one, many }) => ({
  employee: one(employees, {
    fields: [secureIbanVault.employeeId],
    references: [employees.employeeId],
  }),
  validationHistory: many(ibanValidationHistory),
}));

export const ibanValidationHistoryRelations = relations(ibanValidationHistory, ({ one }) => ({
  vault: one(secureIbanVault, {
    fields: [ibanValidationHistory.vaultId],
    references: [secureIbanVault.vaultId],
  }),
  employee: one(employees, {
    fields: [ibanValidationHistory.employeeId],
    references: [employees.employeeId],
  }),
}));

// IBAN Vault Zod schemas
export const insertSecureIbanVaultSchema = createInsertSchema(secureIbanVault).omit({
  vaultId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIbanValidationHistorySchema = createInsertSchema(ibanValidationHistory).omit({
  validationId: true,
  createdAt: true,
});

// Type definitions for IBAN vault
export type SecureIbanVault = typeof secureIbanVault.$inferSelect;
export type InsertSecureIbanVault = typeof secureIbanVault.$inferInsert;
export type IbanValidationHistory = typeof ibanValidationHistory.$inferSelect;
export type InsertIbanValidationHistory = typeof ibanValidationHistory.$inferInsert;

// Garnishment calculation output schema
export interface GarnishmentCalculationResult {
  totalGarnishmentAmount: number;
  netPayAfterGarnishments: number;
  garnishmentDetails: {
    garnishmentId: string;
    orderNumber: string;
    creditorName: string;
    calculatedAmount: number;
    deductedAmount: number;
    carriedForwardAmount: number;
    protectedAmount: number;
    calculationMethod: string;
    glAccount: string;
  }[];
  protectionSummary: {
    totalProtectedAmount: number;
    netPayFloorApplied: boolean;
    carriedForwardTotal: number;
  };
  calculationLog: string[];
}
export type UpdateUser = Partial<InsertUser>;

// Authentication type exports
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = typeof magicLinkTokens.$inferInsert;

export type MfaTotpSecret = typeof mfaTotpSecrets.$inferSelect;
export type InsertMfaTotpSecret = typeof mfaTotpSecrets.$inferInsert;

export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebauthnCredential = typeof webauthnCredentials.$inferInsert;

export type SsoProvider = typeof ssoProviders.$inferSelect;
export type InsertSsoProvider = typeof ssoProviders.$inferInsert;

export type UserSsoConnection = typeof userSsoConnections.$inferSelect;
export type InsertUserSsoConnection = typeof userSsoConnections.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

export type AuthAuditLog = typeof authAuditLogs.$inferSelect;
export type InsertAuthAuditLog = typeof authAuditLogs.$inferInsert;

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
  
  // CBA Assignment Fields
  cbaPackId: varchar("cba_pack_id").references(() => cbaPacks.id),
  category: varchar("category", { length: 100 }), // Front Office, Housekeeping, etc.
  grade: varchar("grade", { length: 10 }), // A, B, C
  seniorityStep: integer("seniority_step").default(0),
  nextStepDate: date("next_step_date"), // Auto-calculated anniversary date
  
  // Status
  isActive: boolean("is_active").default(true),
  isPrimary: boolean("is_primary").default(false), // Primary contract for employee
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CBA Step Change Events - Track seniority advancements
export const cbaStepChangeEvents = pgTable("cba_step_change_events", {
  eventId: varchar("event_id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => employeeContracts.contractId),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  
  // Change Details
  eventType: varchar("event_type", { length: 50 }).notNull(), // hire, anniversary, promotion, manual
  fromStep: integer("from_step").default(0),
  toStep: integer("to_step").notNull(),
  fromWage: decimal("from_wage", { precision: 10, scale: 2 }),
  toWage: decimal("to_wage", { precision: 10, scale: 2 }).notNull(),
  
  // Timing
  effectiveDate: date("effective_date").notNull(),
  nextStepDate: date("next_step_date"), // Calculated next advancement
  
  // Audit
  triggeredBy: varchar("triggered_by", { length: 50 }).default("auto"), // auto, manual
  processedBy: varchar("processed_by").references(() => users.id),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Premium Calculation Lines - Detailed premium breakdowns
export const premiumCalculationLines = pgTable("premium_calculation_lines", {
  lineId: varchar("line_id").primaryKey().default(sql`gen_random_uuid()`),
  payrollLineId: varchar("payroll_line_id").references(() => payrollLines.lineId),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  periodId: varchar("period_id").notNull(),
  
  // Premium Details
  premiumCode: varchar("premium_code", { length: 50 }).notNull(), // NIGHT_25, SUNDAY_75, etc.
  premiumName: varchar("premium_name", { length: 255 }).notNull(),
  premiumRate: decimal("premium_rate", { precision: 5, scale: 4 }).notNull(), // 0.25 for 25%
  
  // Time Breakdown
  startDateTime: timestamp("start_date_time").notNull(),
  endDateTime: timestamp("end_date_time").notNull(),
  totalHours: decimal("total_hours", { precision: 8, scale: 2 }).notNull(),
  applicableHours: decimal("applicable_hours", { precision: 8, scale: 2 }).notNull(),
  
  // Stacking Support
  baseRate: decimal("base_rate", { precision: 8, scale: 2 }).notNull(),
  premiumAmount: decimal("premium_amount", { precision: 10, scale: 2 }).notNull(),
  stackedWith: jsonb("stacked_with"), // Array of other premium codes for same hours
  
  // Audit Trail
  calculatedAt: timestamp("calculated_at").defaultNow(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Constraint Violations - Track and propose fixes
export const constraintViolations = pgTable("constraint_violations", {
  violationId: varchar("violation_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  propertyId: varchar("property_id").references(() => properties.propertyId),
  
  // Violation Details
  violationType: varchar("violation_type", { length: 50 }).notNull(), // rest_period, weekly_hours, daily_hours
  constraintRule: varchar("constraint_rule", { length: 100 }).notNull(), // min_rest_11h, max_daily_10h
  violationDate: date("violation_date").notNull(),
  
  // Current vs Required
  currentValue: decimal("current_value", { precision: 8, scale: 2 }).notNull(),
  requiredValue: decimal("required_value", { precision: 8, scale: 2 }).notNull(),
  severity: varchar("severity", { length: 20 }).default("medium"), // low, medium, high, critical
  
  // Proposed Solutions
  suggestedFix: varchar("suggested_fix", { length: 50 }), // reschedule, declare_overtime, split_shift
  fixDetails: jsonb("fix_details"), // Specific fix parameters
  
  // Resolution
  status: varchar("status", { length: 20 }).default("open"), // open, acknowledged, resolved, ignored
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
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

// New insert schemas for CBA engine tables
export const insertEmployeeContractSchema = createInsertSchema(employeeContracts).omit({
  contractId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCbaStepChangeEventSchema = createInsertSchema(cbaStepChangeEvents).omit({
  eventId: true,
  createdAt: true,
});

export const insertPremiumCalculationLineSchema = createInsertSchema(premiumCalculationLines).omit({
  lineId: true,
  calculatedAt: true,
  createdAt: true,
});

export const insertConstraintViolationSchema = createInsertSchema(constraintViolations).omit({
  violationId: true,
  createdAt: true,
});

// Types for the new tables
export type EmployeeContract = typeof employeeContracts.$inferSelect;
export type InsertEmployeeContract = z.infer<typeof insertEmployeeContractSchema>;

export type CbaStepChangeEvent = typeof cbaStepChangeEvents.$inferSelect;
export type InsertCbaStepChangeEvent = z.infer<typeof insertCbaStepChangeEventSchema>;

export type PremiumCalculationLine = typeof premiumCalculationLines.$inferSelect;
export type InsertPremiumCalculationLine = z.infer<typeof insertPremiumCalculationLineSchema>;

export type ConstraintViolation = typeof constraintViolations.$inferSelect;
export type InsertConstraintViolation = z.infer<typeof insertConstraintViolationSchema>;

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
  parentAccountId: varchar("parent_account_id").references((): any => glAccounts.accountId),
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

// =============================================================================
// GENERIC GL MAPPING RULES
// =============================================================================

// Generic GL Mapping Rules for any ERP system
export const glMappingRules = pgTable("gl_mapping_rules", {
  ruleId: varchar("rule_id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  
  // Rule Configuration
  type: varchar("type", { length: 50 }).notNull(), // earning, premium, employer_contrib, liability, bank
  code: varchar("code", { length: 50 }), // REG, OT_TIER1_40, NIGHT_25, etc.
  name: varchar("name", { length: 100 }), // EFKA, EFKA_PAYABLE, etc.
  account: varchar("account", { length: 50 }).notNull(), // GL account code
  
  // Dimensional Mapping
  dimension: varchar("dimension", { length: 255 }), // cost_center=property, department=fixed, etc.
  
  // Metadata
  description: text("description"),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(100), // For rule precedence
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// GL Mapping Rule sets for entities
export const glMappingRuleSets = pgTable("gl_mapping_rule_sets", {
  ruleSetId: varchar("rule_set_id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  version: varchar("version", { length: 20 }).default("1.0"),
  isActive: boolean("is_active").default(true),
  rules: jsonb("rules").notNull(), // Array of mapping rules
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// GENERIC GL RELATIONS
// =============================================================================

export const glMappingRulesRelations = relations(glMappingRules, ({ one }) => ({
  // Could add relations to entities/properties if needed
}));

// =============================================================================
// EVENT QUEUE SYSTEM - EVENTED PLATFORM
// =============================================================================

// Event Queue - Persistent event queue with retry logic
export const eventQueue = pgTable("event_queue", {
  eventId: varchar("event_id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type", { length: 100 }).notNull(), // payroll.run.finalized, payment.completed
  idempotencyKey: varchar("idempotency_key", { length: 255 }).unique().notNull(), // For replay safety
  
  // Event Payload and Context
  payload: jsonb("payload").notNull(), // Event data
  metadata: jsonb("metadata").default('{}'), // Additional context
  sourceSystem: varchar("source_system", { length: 50 }).default("payroll"),
  correlationId: varchar("correlation_id", { length: 255 }), // For event correlation
  
  // Processing Status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending|processing|completed|failed|dead_letter
  priority: integer("priority").default(0), // Higher = more urgent
  
  // Retry Logic
  attemptCount: integer("attempt_count").default(0),
  maxAttempts: integer("max_attempts").default(5),
  nextAttemptAt: timestamp("next_attempt_at"),
  lastAttemptAt: timestamp("last_attempt_at"),
  
  // Processing Results
  processingResult: jsonb("processing_result"), // Success/failure details
  errorMessage: text("error_message"),
  
  // Performance Tracking
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingDurationMs: integer("processing_duration_ms"),
  
  // Timestamps
  scheduledFor: timestamp("scheduled_for").defaultNow(), // When to process
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_event_queue_status_scheduled").on(table.status, table.scheduledFor),
  index("idx_event_queue_type_status").on(table.eventType, table.status),
  index("idx_event_queue_priority").on(table.priority),
  index("idx_event_queue_correlation_id").on(table.correlationId),
]);

// Event Handlers - Configuration for event processing
export const eventHandlers = pgTable("event_handlers", {
  handlerId: varchar("handler_id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  handlerName: varchar("handler_name", { length: 100 }).notNull(), // GLAutoPostHandler, WebhookDeliveryHandler
  
  // Handler Configuration
  isActive: boolean("is_active").default(true),
  config: jsonb("config").default('{}'), // Handler-specific configuration
  
  // Performance Requirements
  targetProcessingTimeMs: integer("target_processing_time_ms").default(30000), // 30 seconds
  timeoutMs: integer("timeout_ms").default(120000), // 2 minutes
  
  // Retry Configuration
  retryPolicy: jsonb("retry_policy").default('{"initialDelayMs": 1000, "maxDelayMs": 300000, "backoffMultiplier": 2.0, "maxAttempts": 5}'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_event_handlers_type_active").on(table.eventType, table.isActive),
]);

// Event Processing Log - Detailed processing history
export const eventProcessingLog = pgTable("event_processing_log", {
  logId: varchar("log_id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  handlerId: varchar("handler_id"),
  
  // Processing Attempt
  attemptNumber: integer("attempt_number").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // started|completed|failed|timeout
  
  // Processing Details
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  
  // Results
  result: jsonb("result"), // Processing result data
  errorDetails: jsonb("error_details"), // Structured error information
  stackTrace: text("stack_trace"),
  
  // Performance Metrics
  memoryUsageMb: integer("memory_usage_mb"),
  cpuTimeMs: integer("cpu_time_ms"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_event_processing_log_event_id").on(table.eventId),
  index("idx_event_processing_log_status").on(table.status),
]);

// Dead Letter Queue - Failed events for manual review
export const deadLetterQueue = pgTable("dead_letter_queue", {
  deadLetterId: varchar("dead_letter_id").primaryKey().default(sql`gen_random_uuid()`),
  originalEventId: varchar("original_event_id").notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  
  // Original Event Data
  originalPayload: jsonb("original_payload").notNull(),
  originalMetadata: jsonb("original_metadata"),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  
  // Failure Information
  failureReason: text("failure_reason").notNull(),
  lastError: text("last_error"),
  totalAttempts: integer("total_attempts").notNull(),
  firstFailedAt: timestamp("first_failed_at").notNull(),
  lastFailedAt: timestamp("last_failed_at").notNull(),
  
  // Resolution
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending|investigating|resolved|discarded
  resolution: text("resolution"), // What was done to resolve
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_dead_letter_queue_status").on(table.status),
  index("idx_dead_letter_queue_event_type").on(table.eventType),
]);

// =============================================================================
// EVENT QUEUE RELATIONS
// =============================================================================

export const eventQueueRelations = relations(eventQueue, ({ many }) => ({
  processingLogs: many(eventProcessingLog),
}));

export const eventHandlersRelations = relations(eventHandlers, ({ many }) => ({
  processingLogs: many(eventProcessingLog),
}));

export const eventProcessingLogRelations = relations(eventProcessingLog, ({ one }) => ({
  event: one(eventQueue, {
    fields: [eventProcessingLog.eventId],
    references: [eventQueue.eventId],
  }),
  handler: one(eventHandlers, {
    fields: [eventProcessingLog.handlerId],
    references: [eventHandlers.handlerId],
  }),
}));

// =============================================================================
// EVENT QUEUE SCHEMA EXPORTS
// =============================================================================

// Event Queue schemas
export const insertEventQueueSchema = createInsertSchema(eventQueue).omit({
  eventId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEventQueue = z.infer<typeof insertEventQueueSchema>;
export type EventQueue = typeof eventQueue.$inferSelect;

// Event Handler schemas
export const insertEventHandlerSchema = createInsertSchema(eventHandlers).omit({
  handlerId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEventHandler = z.infer<typeof insertEventHandlerSchema>;
export type EventHandler = typeof eventHandlers.$inferSelect;

// Event Processing Log schemas
export const insertEventProcessingLogSchema = createInsertSchema(eventProcessingLog).omit({
  logId: true,
  createdAt: true,
});
export type InsertEventProcessingLog = z.infer<typeof insertEventProcessingLogSchema>;
export type EventProcessingLog = typeof eventProcessingLog.$inferSelect;

// Dead Letter Queue schemas
export const insertDeadLetterQueueSchema = createInsertSchema(deadLetterQueue).omit({
  deadLetterId: true,
  createdAt: true,
});
export type InsertDeadLetterQueue = z.infer<typeof insertDeadLetterQueueSchema>;
export type DeadLetterQueue = typeof deadLetterQueue.$inferSelect;

// Event processing validation schemas
export const eventQueueStatusSchema = z.enum(["pending", "processing", "completed", "failed", "dead_letter"]);
export const eventProcessingStatusSchema = z.enum(["started", "completed", "failed", "timeout"]);
export const deadLetterStatusSchema = z.enum(["pending", "investigating", "resolved", "discarded"]);

// =============================================================================
// GENERIC GL SCHEMA EXPORTS
// =============================================================================

// Mapping Rules schemas
export const insertGLMappingRuleSchema = createInsertSchema(glMappingRules).omit({
  ruleId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGLMappingRule = z.infer<typeof insertGLMappingRuleSchema>;
export type GLMappingRule = typeof glMappingRules.$inferSelect;

export const insertGLMappingRuleSetSchema = createInsertSchema(glMappingRuleSets).omit({
  ruleSetId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGLMappingRuleSet = z.infer<typeof insertGLMappingRuleSetSchema>;
export type GLMappingRuleSet = typeof glMappingRuleSets.$inferSelect;

// Generic mapping rule validation schema
export const mappingRuleSchema = z.object({
  type: z.enum(["earning", "premium", "employer_contrib", "liability", "bank"]),
  code: z.string().optional(),
  name: z.string().optional(),
  account: z.string(),
  dimension: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().default(100),
});

export const mappingRuleSetSchema = z.object({
  entity_id: z.string(),
  name: z.string().optional(),
  version: z.string().optional(),
  rules: z.array(mappingRuleSchema),
});

export type MappingRule = z.infer<typeof mappingRuleSchema>;
export type MappingRuleSet = z.infer<typeof mappingRuleSetSchema>;

// Re-export SDK types for convenience
export type {
  BuildJournalRequest,
  JournalLine,
  Journal,
  ConnectorStatus,
  SetupStatus,
  ReconciliationReport,
  PayrollSummary,
  RoundingConfig,
  PayrollSyncSDK
} from './sdk-types';

// Re-export payments schema types
export type {
  PaymentBatch,
  PaymentTransaction,
  BankProfile,
  BankMessage,
  PaymentException,
  InsertPaymentBatch,
  InsertPaymentTransaction,
  InsertBankProfile,
  InsertBankMessage,
  InsertPaymentException
} from './payments-schema';

// CBA & Sector Packs - Greek Industry-Specific Rules
// =================================================

// CBA Pack - Versioned, installable rulesets for sectors
export const cbaPacks = pgTable("cba_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  sector: varchar("sector", { length: 100 }).notNull(), // "tourism_hotels" | "fnb_restaurants"
  authorityRef: varchar("authority_ref", { length: 255 }),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  version: varchar("version", { length: 50 }).notNull(),
  docHash: varchar("doc_hash", { length: 128 }),
  status: varchar("status", { length: 20 }).notNull().default('draft'), // draft | published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wage Tables - Sector-specific pay scales
export const wageTables = pgTable("wage_tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").references(() => cbaPacks.id, { onDelete: 'cascade' }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // role family
  grade: varchar("grade", { length: 10 }).notNull(), // A/B/C...
  seniorityStep: integer("seniority_step").notNull().default(0),
  baseMonthly: decimal("base_monthly", { precision: 10, scale: 2 }),
  baseDaily: decimal("base_daily", { precision: 8, scale: 2 }),
  baseHourly: decimal("base_hourly", { precision: 6, scale: 2 }),
  unit: varchar("unit", { length: 20 }).notNull().default('monthly'), // monthly | daily | hourly
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Premium Rules - Night, Sunday, Holiday premiums
export const premiumRules = pgTable("premium_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").references(() => cbaPacks.id, { onDelete: 'cascade' }).notNull(),
  code: varchar("code", { length: 50 }).notNull(), // NIGHT_25, SUNDAY_75, etc.
  name: varchar("name", { length: 255 }).notNull(),
  rateType: varchar("rate_type", { length: 20 }).notNull(), // percent | fixed
  value: decimal("value", { precision: 8, scale: 4 }).notNull(),
  bands: jsonb("bands"), // time bands, e.g., night 22:00-06:00
  stackable: boolean("stackable").notNull().default(false),
  appliesTo: varchar("applies_to", { length: 50 }).notNull(), // hours_worked | holidays | ot
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Allowance Rules - Meal, accommodation, uniform allowances
export const allowanceRules = pgTable("allowance_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").references(() => cbaPacks.id, { onDelete: 'cascade' }).notNull(),
  code: varchar("code", { length: 50 }).notNull(), // MEAL_ALLOW, ACCOM_ALLOW
  name: varchar("name", { length: 255 }).notNull(),
  calc: varchar("calc", { length: 30 }).notNull(), // per_day | per_shift | fixed_monthly | percent_base
  amount: decimal("amount", { precision: 8, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  cap: decimal("cap", { precision: 8, scale: 2 }),
  taxTreatment: varchar("tax_treatment", { length: 20 }).notNull().default('taxable'), // exempt | taxable | split
  contributory: varchar("contributory", { length: 20 }).notNull().default('yes'), // yes | no | split
  conditions: jsonb("conditions"), // eligibility conditions
  createdAt: timestamp("created_at").defaultNow(),
});

// Scheduling Constraints - Greek labor law constraints
export const schedulingConstraints = pgTable("scheduling_constraints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").references(() => cbaPacks.id, { onDelete: 'cascade' }).notNull(),
  maxHoursDay: integer("max_hours_day").notNull().default(8),
  maxHoursWeekAvg: integer("max_hours_week_avg").notNull().default(40),
  restMinHours: integer("rest_min_hours").notNull().default(11), // daily rest
  weeklyRest: integer("weekly_rest").notNull().default(24), // weekly rest hours
  splitShift: varchar("split_shift", { length: 20 }).notNull().default('allowed'), // allowed | disallowed
  breakMinMinutes: integer("break_min_minutes").notNull().default(15),
  sixthDay: varchar("sixth_day", { length: 30 }).notNull().default('allowed'), // allowed | disallowed | sector_exemption
  specialRules: jsonb("special_rules"), // sector-specific rules
  createdAt: timestamp("created_at").defaultNow(),
});

// ERGANI Profiles - Sector-specific ERGANI requirements
export const erganiProfiles = pgTable("ergani_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").references(() => cbaPacks.id, { onDelete: 'cascade' }).notNull(),
  eventMap: jsonb("event_map").notNull(), // hires, schedules, overtime, terminations
  requiredLeadTimes: jsonb("required_lead_times"), // advance notice requirements
  reasonCodes: jsonb("reason_codes"), // sector-specific codes
  documentTemplates: jsonb("document_templates"),
  autoSubmission: boolean("auto_submission").notNull().default(true),
  validationRules: jsonb("validation_rules"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tip Policy - F&B specific tip pooling and distribution
export const tipPolicies = pgTable("tip_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").references(() => cbaPacks.id, { onDelete: 'cascade' }).notNull(),
  poolSource: varchar("pool_source", { length: 50 }).notNull(), // pos_revenue_pct | service_charge
  sourcePercentage: decimal("source_percentage", { precision: 5, scale: 2 }),
  distributionMethod: varchar("distribution_method", { length: 30 }).notNull(), // points | hours | equal
  rolePoints: jsonb("role_points"), // points by role for distribution
  employerTopup: decimal("employer_topup", { precision: 5, scale: 2 }),
  taxMapping: jsonb("tax_mapping"),
  contribMapping: jsonb("contrib_mapping"),
  payoutFrequency: varchar("payout_frequency", { length: 20 }).notNull().default('weekly'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pack Overrides - Company and property customizations
export const packOverrides = pgTable("pack_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").references(() => cbaPacks.id, { onDelete: 'cascade' }).notNull(),
  propertyId: varchar("property_id").references(() => properties.propertyId, { onDelete: 'cascade' }),
  companyId: varchar("company_id"), // if property is null, applies company-wide
  overrideType: varchar("override_type", { length: 30 }).notNull(), // wage | premium | allowance | constraint
  targetId: varchar("target_id").notNull(), // ID of rule being overridden
  overrideData: jsonb("override_data").notNull(),
  reason: text("reason"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pack Assignments - Which packs are active for which properties
export const packAssignments = pgTable("pack_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").references(() => cbaPacks.id, { onDelete: 'cascade' }).notNull(),
  propertyId: varchar("property_id").references(() => properties.propertyId, { onDelete: 'cascade' }).notNull(),
  assignedBy: varchar("assigned_by").notNull(),
  priority: integer("priority").notNull().default(0), // Higher number = higher priority
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pack_assignments_property_active").on(table.propertyId, table.isActive),
]);

// CBA & Sector Packs Type Definitions
export type CbaPack = typeof cbaPacks.$inferSelect;
export type InsertCbaPack = typeof cbaPacks.$inferInsert;
export type WageTable = typeof wageTables.$inferSelect;
export type InsertWageTable = typeof wageTables.$inferInsert;
export type PremiumRule = typeof premiumRules.$inferSelect;
export type InsertPremiumRule = typeof premiumRules.$inferInsert;
export type AllowanceRule = typeof allowanceRules.$inferSelect;
export type InsertAllowanceRule = typeof allowanceRules.$inferInsert;
export type SchedulingConstraint = typeof schedulingConstraints.$inferSelect;
export type InsertSchedulingConstraint = typeof schedulingConstraints.$inferInsert;
export type ErganiProfile = typeof erganiProfiles.$inferSelect;
export type InsertErganiProfile = typeof erganiProfiles.$inferInsert;
export type TipPolicy = typeof tipPolicies.$inferSelect;
export type InsertTipPolicy = typeof tipPolicies.$inferInsert;
export type PackOverride = typeof packOverrides.$inferSelect;
export type InsertPackOverride = typeof packOverrides.$inferInsert;
export type PackAssignment = typeof packAssignments.$inferSelect;
export type InsertPackAssignment = typeof packAssignments.$inferInsert;

// CBA Packs Zod Schemas for API validation
export const insertCbaPackSchema = createInsertSchema(cbaPacks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWageTableSchema = createInsertSchema(wageTables).omit({
  id: true,
  createdAt: true,
});

export const insertPremiumRuleSchema = createInsertSchema(premiumRules).omit({
  id: true,
  createdAt: true,
});

export const insertAllowanceRuleSchema = createInsertSchema(allowanceRules).omit({
  id: true,
  createdAt: true,
});

export const insertSchedulingConstraintSchema = createInsertSchema(schedulingConstraints).omit({
  id: true,
  createdAt: true,
});

export const insertErganiProfileSchema = createInsertSchema(erganiProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertTipPolicySchema = createInsertSchema(tipPolicies).omit({
  id: true,
  createdAt: true,
});

export const insertPackOverrideSchema = createInsertSchema(packOverrides).omit({
  id: true,
  createdAt: true,
});

export const insertPackAssignmentSchema = createInsertSchema(packAssignments).omit({
  id: true,
  createdAt: true,
});

// Security & Audit Tables

// Immutable calculation provenance - records which pack/version calculated each payslip
export const calcProvenance = pgTable("calc_provenance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payslipId: varchar("payslip_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  packId: varchar("pack_id").notNull(), // e.g., "tourism-hotels"
  packVersion: varchar("pack_version").notNull(), // e.g., "v2025.1"
  calculationDate: timestamp("calculation_date").defaultNow().notNull(),
  calculationEngine: varchar("calculation_engine").default("payroll-engine-v1").notNull(),
  inputHash: varchar("input_hash").notNull(), // SHA-256 of calculation inputs
  outputHash: varchar("output_hash").notNull(), // SHA-256 of calculation outputs
  auditTrail: jsonb("audit_trail").notNull(), // Complete step-by-step calculation log
  immutableSignature: varchar("immutable_signature").notNull(), // HMAC signature to prevent tampering
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// EXPLAIN-YOUR-PAY SYSTEM TABLES
// =============================================================================

// Explanation Rules - Master catalog of how to explain each earnings/deduction code
export const explanationRules = pgTable("explanation_rules", {
  ruleId: varchar("rule_id").primaryKey().default(sql`gen_random_uuid()`),
  earningsCode: varchar("earnings_code", { length: 20 }).notNull(), // REG, OT1, NIGHT_25, SUNDAY_75, BONUS, TAX_WHT, EFKA_EE
  ruleVersion: varchar("rule_version", { length: 20 }).notNull(), // v2025.1
  
  // Bilingual Labels
  labelEn: varchar("label_en", { length: 100 }).notNull(), // "Regular Hours"
  labelEl: varchar("label_el", { length: 100 }).notNull(), // "Κανονικές Ώρες"
  
  // Formula Template with placeholders
  formulaTemplateEn: text("formula_template_en").notNull(), // "{hours} hours × €{hourly_rate} = €{amount}"
  formulaTemplateEl: text("formula_template_el").notNull(), // "{hours} ώρες × €{hourly_rate} = €{amount}"
  
  // Explanation Template 
  explanationTemplateEn: text("explanation_template_en").notNull(),
  explanationTemplateEl: text("explanation_template_el").notNull(),
  
  // Calculation metadata
  calculationType: varchar("calculation_type", { length: 50 }).notNull(), // hourly, percentage, fixed, tiered
  variables: jsonb("variables"), // {hours: "timesheet.regular", rate: "contract.hourly_rate"}
  
  // Policy reference
  policyRef: varchar("policy_ref", { length: 100 }), // Reference to policy document
  regulationRef: varchar("regulation_ref", { length: 100 }), // Greek law reference
  
  isActive: boolean("is_active").default(true),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payslip Explanations - Generated explanations for each payslip
export const payslipExplanations = pgTable("payslip_explanations", {
  explanationId: varchar("explanation_id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  payrollRunId: varchar("payroll_run_id").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  
  // Generated explanation content
  explanationJson: jsonb("explanation_json").notNull(), // Structured explanation data
  explanationTextEn: text("explanation_text_en"),
  explanationTextEl: text("explanation_text_el"),
  
  // Coverage metrics
  totalPayslipValue: decimal("total_payslip_value", { precision: 10, scale: 2 }).notNull(),
  explainedValue: decimal("explained_value", { precision: 10, scale: 2 }).notNull(),
  coveragePercentage: decimal("coverage_percentage", { precision: 5, scale: 2 }).notNull(), // 95.5
  unexplainedLines: jsonb("unexplained_lines"), // Array of line items that couldn't be explained
  
  // Generation metadata
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generatedBy: varchar("generated_by").default("system").notNull(), // system, llm-rewrite
  rulePackVersion: varchar("rule_pack_version", { length: 20 }).notNull(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }), // 0.0-1.0
  
  // Quality metrics
  csatRating: integer("csat_rating"), // 1-5 scale
  csatFeedback: text("csat_feedback"),
  csatSubmittedAt: timestamp("csat_submitted_at"),
  
  status: varchar("status", { length: 20 }).default("generated"), // generated, reviewed, published, flagged
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Explanation Citations - Links explanation sections to specific rules and formulas
export const explanationCitations = pgTable("explanation_citations", {
  citationId: varchar("citation_id").primaryKey().default(sql`gen_random_uuid()`),
  explanationId: varchar("explanation_id").notNull(),
  
  // Citation details
  sectionType: varchar("section_type", { length: 50 }).notNull(), // earnings, deductions, summary
  lineItem: varchar("line_item", { length: 100 }).notNull(), // Specific payslip line
  ruleId: varchar("rule_id").notNull(),
  
  // Calculated values used in this citation
  calculatedAmount: decimal("calculated_amount", { precision: 10, scale: 2 }).notNull(),
  variables: jsonb("variables"), // Actual values used: {hours: 40, rate: 15.50}
  formulaUsed: text("formula_used"), // Rendered formula: "40 hours × €15.50 = €620.00"
  
  // Display position
  displayOrder: integer("display_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Explanation Feedback - Employee feedback on explanation quality
export const explanationFeedback = pgTable("explanation_feedback", {
  feedbackId: varchar("feedback_id").primaryKey().default(sql`gen_random_uuid()`),
  explanationId: varchar("explanation_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  
  // Feedback details
  helpfulnessRating: integer("helpfulness_rating"), // 1-5 scale
  clarityRating: integer("clarity_rating"), // 1-5 scale  
  completenessRating: integer("completeness_rating"), // 1-5 scale
  overallRating: integer("overall_rating"), // 1-5 scale (CSAT)
  
  feedbackText: text("feedback_text"),
  suggestedImprovements: text("suggested_improvements"),
  
  // Specific issues
  confusingItems: jsonb("confusing_items"), // Array of items that were confusing
  missingItems: jsonb("missing_items"), // Items employee expected to see explained
  
  // Engagement metrics
  timeSpentReading: integer("time_spent_reading"), // Seconds
  sectionsViewed: jsonb("sections_viewed"), // Which sections were expanded/viewed
  citationsClicked: jsonb("citations_clicked"), // Which citations were clicked for details
  
  submittedAt: timestamp("submitted_at").defaultNow(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
});

// Explanation Templates - Reusable templates for common scenarios
export const explanationTemplates = pgTable("explanation_templates", {
  templateId: varchar("template_id").primaryKey().default(sql`gen_random_uuid()`),
  templateName: varchar("template_name", { length: 100 }).notNull(),
  templateType: varchar("template_type", { length: 50 }).notNull(), // section, summary, intro, formula
  
  // Template content
  templateEn: text("template_en").notNull(),
  templateEl: text("template_el").notNull(),
  
  // Template variables and usage
  variables: jsonb("variables"), // Required variables for this template
  usageNotes: text("usage_notes"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maker-Checker approval workflow
export const makerCheckerApprovals = pgTable("maker_checker_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestType: varchar("request_type").notNull(), // "pack_change", "version_publish", "rollout_execute", "severance_execute"
  requestId: varchar("request_id").notNull(), // ID of the change request
  requestData: jsonb("request_data").notNull(), // Full request payload
  makerUserId: varchar("maker_user_id").notNull(), // User who initiated the change
  makerRole: varchar("maker_role").notNull(), // "payroll_admin", "hr_manager"
  checkerUserId: varchar("checker_user_id"), // User who approved/rejected
  checkerRole: varchar("checker_role"), // "legal", "payroll_admin"
  status: varchar("status").default("pending").notNull(), // "pending", "approved", "rejected"
  approvalReason: text("approval_reason"),
  rejectionReason: text("rejection_reason"),
  requiredApprovers: jsonb("required_approvers").notNull(), // ["legal", "payroll_admin"]
  currentApprovers: jsonb("current_approvers").default(sql`'[]'::jsonb`).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document trail for CBA PDFs and encoding diffs
export const documentTrail = pgTable("document_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  packId: varchar("pack_id").notNull(),
  packVersion: varchar("pack_version").notNull(),
  documentType: varchar("document_type").notNull(), // "cba_pdf", "encoding_diff", "impact_report"
  originalFileName: varchar("original_file_name"),
  fileHash: varchar("file_hash").notNull(), // SHA-256 of the document
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  uploadedBy: varchar("uploaded_by").notNull(),
  diffMetadata: jsonb("diff_metadata"), // For encoding diffs: changes, affected rules, etc.
  storageLocation: varchar("storage_location"), // S3/GCS path or local path
  documentSignature: varchar("document_signature").notNull(), // HMAC signature
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// SEVERANCE & FINAL PAY TABLES
// =============================================================================

// Versioned severance rules table for Greek legal compliance
export const severanceRules = pgTable("severance_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  version: varchar("version").notNull(), // e.g., 'v2025.1', 'v2024.3'
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"), // null for current version
  isActive: boolean("is_active").default(true),
  
  // Severance bands according to Ν. 4093/2012
  bands: jsonb("bands").notNull(), // Array of {minMonths, maxMonths, severanceMonths}
  
  // Legal references and notes
  legalReference: varchar("legal_reference").notNull(),
  description: text("description"),
  descriptionGr: text("description_gr"),
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by")
});

// Termination records with Greek legal compliance
export const terminationRecords = pgTable("termination_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.employeeId),
  contractId: varchar("contract_id").notNull(), // Reference to employment contract/record
  terminationType: varchar("termination_type").notNull(), // 'dismissal', 'resignation', 'expiry', 'mutual_agreement'
  terminationCause: varchar("termination_cause"), // Greek legal cause codes
  effectiveDate: timestamp("effective_date").notNull(),
  noticeDate: timestamp("notice_date"),
  noticePeriodDays: integer("notice_period_days").default(0),
  severanceEligible: boolean("severance_eligible").default(false),
  yearsOfService: decimal("years_of_service", { precision: 10, scale: 2 }),
  lastWorkingDay: timestamp("last_working_day"),
  erganiEventId: varchar("ergani_event_id"), // ERGANI II termination event reference
  legalBasis: varchar("legal_basis"), // Ν. 4093/2012 article reference
  calculationRulesetId: varchar("calculation_ruleset_id"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
});

// Severance calculations with detailed breakdown
export const severanceCalculations = pgTable("severance_calculations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  terminationRecordId: varchar("termination_record_id").notNull().references(() => terminationRecords.id),
  severanceAmount: decimal("severance_amount", { precision: 10, scale: 2 }).default("0.00"),
  unpaidWages: decimal("unpaid_wages", { precision: 10, scale: 2 }).default("0.00"),
  unusedLeaveAmount: decimal("unused_leave_amount", { precision: 10, scale: 2 }).default("0.00"),
  holidayAllowanceAmount: decimal("holiday_allowance_amount", { precision: 10, scale: 2 }).default("0.00"),
  proRataEasterBonus: decimal("pro_rata_easter_bonus", { precision: 10, scale: 2 }).default("0.00"),
  proRataChristmasBonus: decimal("pro_rata_christmas_bonus", { precision: 10, scale: 2 }).default("0.00"),
  otherBalances: decimal("other_balances", { precision: 10, scale: 2 }).default("0.00"),
  grossTotal: decimal("gross_total", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  socialSecurityAmount: decimal("social_security_amount", { precision: 10, scale: 2 }).default("0.00"),
  netTotal: decimal("net_total", { precision: 10, scale: 2 }).notNull(),
  calculationDate: timestamp("calculation_date").defaultNow(),
  rulesetVersion: varchar("ruleset_version").notNull(),
  explanationGr: text("explanation_gr"), // Greek explanation with legal citations
  explanationEn: text("explanation_en"), // English explanation
});

// Final pay line items for detailed breakdown
export const finalPayLines = pgTable("final_pay_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  severanceCalculationId: varchar("severance_calculation_id").notNull().references(() => severanceCalculations.id),
  lineType: varchar("line_type").notNull(), // 'severance', 'wages', 'leave', 'bonus', 'allowance', 'deduction', 'tax'
  code: varchar("code").notNull(), // e.g., 'SEVERANCE_DISMISSAL', 'LEAVE_UNUSED', 'BONUS_EASTER_PRORATA'
  description: varchar("description").notNull(),
  descriptionGr: varchar("description_gr"),
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }),
  rate: decimal("rate", { precision: 10, scale: 4 }),
  quantity: decimal("quantity", { precision: 10, scale: 2 }),
  calculatedAmount: decimal("calculated_amount", { precision: 10, scale: 2 }).notNull(),
  legalReference: varchar("legal_reference"), // e.g., "Ν. 4093/2012 άρθρο 1"
  calculationFormula: text("calculation_formula"),
  sortOrder: integer("sort_order").default(0),
});

// Relations for severance tables
// Severance rules relations
export const severanceRulesRelations = relations(severanceRules, ({ many }) => ({
  calculations: many(severanceCalculations)
}));

export const terminationRecordsRelations = relations(terminationRecords, ({ one, many }) => ({
  employee: one(employees, {
    fields: [terminationRecords.employeeId],
    references: [employees.employeeId],
  }),
  severanceCalculation: one(severanceCalculations, {
    fields: [terminationRecords.id],
    references: [severanceCalculations.terminationRecordId],
  }),
}));

export const severanceCalculationsRelations = relations(severanceCalculations, ({ one, many }) => ({
  terminationRecord: one(terminationRecords, {
    fields: [severanceCalculations.terminationRecordId],
    references: [terminationRecords.id],
  }),
  severanceRule: one(severanceRules, {
    fields: [severanceCalculations.rulesetVersion],
    references: [severanceRules.version],
  }),
  finalPayLines: many(finalPayLines),
}));

export const finalPayLinesRelations = relations(finalPayLines, ({ one }) => ({
  severanceCalculation: one(severanceCalculations, {
    fields: [finalPayLines.severanceCalculationId],
    references: [severanceCalculations.id],
  }),
}));

// Types for severance system
export type TerminationRecord = typeof terminationRecords.$inferSelect;
export type InsertTerminationRecord = typeof terminationRecords.$inferInsert;
export type SeveranceCalculation = typeof severanceCalculations.$inferSelect;
export type InsertSeveranceCalculation = typeof severanceCalculations.$inferInsert;
export type FinalPayLine = typeof finalPayLines.$inferSelect;
export type InsertFinalPayLine = typeof finalPayLines.$inferInsert;

// Severance calculation interfaces
export interface SeveranceCalculationInputs {
  employeeId: string;
  contractId: string;
  terminationType: 'dismissal' | 'resignation' | 'expiry' | 'mutual_agreement';
  terminationCause?: string;
  effectiveDate: Date;
  noticeDate?: Date;
  yearsOfService: number;
  lastMonthlyWage: number;
  unusedLeaveDays: number;
  pendingAllowances: Record<string, number>;
  pendingTips: number;
}

export interface SeveranceCalculationOutputs {
  severanceAmount: number;
  unpaidWages: number;
  unusedLeaveAmount: number;
  holidayAllowanceAmount: number;
  proRataEasterBonus: number;
  proRataChristmasBonus: number;
  otherBalances: number;
  grossTotal: number;
  taxAmount: number;
  socialSecurityAmount: number;
  netTotal: number;
  explanationGr: string;
  explanationEn: string;
  finalPayLines: Array<{
    lineType: string;
    code: string;
    description: string;
    descriptionGr: string;
    calculatedAmount: number;
    legalReference?: string;
    calculationFormula?: string;
  }>;
}

// Severance Zod schemas
export const insertTerminationRecordSchema = createInsertSchema(terminationRecords).omit({
  id: true,
  createdAt: true,
});

export const insertSeveranceCalculationSchema = createInsertSchema(severanceCalculations).omit({
  id: true,
  calculationDate: true,
});

export const insertFinalPayLineSchema = createInsertSchema(finalPayLines).omit({
  id: true,
});

// Explain-Your-Pay Type Definitions
export type ExplanationRule = typeof explanationRules.$inferSelect;
export type InsertExplanationRule = typeof explanationRules.$inferInsert;
export type PayslipExplanation = typeof payslipExplanations.$inferSelect;
export type InsertPayslipExplanation = typeof payslipExplanations.$inferInsert;
export type ExplanationCitation = typeof explanationCitations.$inferSelect;
export type InsertExplanationCitation = typeof explanationCitations.$inferInsert;
export type ExplanationFeedback = typeof explanationFeedback.$inferSelect;
export type InsertExplanationFeedback = typeof explanationFeedback.$inferInsert;
export type ExplanationTemplate = typeof explanationTemplates.$inferSelect;
export type InsertExplanationTemplate = typeof explanationTemplates.$inferInsert;

// Security & Audit Type Definitions
export type CalcProvenance = typeof calcProvenance.$inferSelect;
export type InsertCalcProvenance = typeof calcProvenance.$inferInsert;
export type MakerCheckerApproval = typeof makerCheckerApprovals.$inferSelect;
export type InsertMakerCheckerApproval = typeof makerCheckerApprovals.$inferInsert;
export type DocumentTrail = typeof documentTrail.$inferSelect;
export type InsertDocumentTrail = typeof documentTrail.$inferInsert;

// Explain-Your-Pay Zod Schemas
export const insertExplanationRuleSchema = createInsertSchema(explanationRules).omit({
  ruleId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayslipExplanationSchema = createInsertSchema(payslipExplanations).omit({
  explanationId: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExplanationCitationSchema = createInsertSchema(explanationCitations).omit({
  citationId: true,
  createdAt: true,
});

export const insertExplanationFeedbackSchema = createInsertSchema(explanationFeedback).omit({
  feedbackId: true,
  submittedAt: true,
});

export const insertExplanationTemplateSchema = createInsertSchema(explanationTemplates).omit({
  templateId: true,
  createdAt: true,
  updatedAt: true,
});

// Security & Audit Zod Schemas
export const insertCalcProvenanceSchema = createInsertSchema(calcProvenance).omit({
  id: true,
  createdAt: true,
});

export const insertMakerCheckerApprovalSchema = createInsertSchema(makerCheckerApprovals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentTrailSchema = createInsertSchema(documentTrail).omit({
  id: true,
  createdAt: true,
});

// Relations for garnishments
export const garnishmentOrdersRelations = relations(garnishmentOrders, ({ many }) => ({
  transactions: many(garnishmentTransactions),
  balances: many(garnishmentBalances),
}));

export const garnishmentTransactionsRelations = relations(garnishmentTransactions, ({ one }) => ({
  garnishmentOrder: one(garnishmentOrders, {
    fields: [garnishmentTransactions.garnishmentOrderId],
    references: [garnishmentOrders.id],
  }),
}));

export const garnishmentBalancesRelations = relations(garnishmentBalances, ({ one }) => ({
  garnishmentOrder: one(garnishmentOrders, {
    fields: [garnishmentBalances.garnishmentOrderId],
    references: [garnishmentOrders.id],
  }),
  lastTransaction: one(garnishmentTransactions, {
    fields: [garnishmentBalances.lastTransactionId],
    references: [garnishmentTransactions.id],
  }),
}));

// Garnishment Zod schemas
export const insertGarnishmentOrderSchema = createInsertSchema(garnishmentOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGarnishmentTransactionSchema = createInsertSchema(garnishmentTransactions).omit({
  id: true,
  processedAt: true,
});

export const insertGarnishmentBalanceSchema = createInsertSchema(garnishmentBalances).omit({
  id: true,
  lastUpdated: true,
});

// Garnishment audit log for error tracking and compliance
export const garnishmentAudit = pgTable("garnishment_audit", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  garnishmentOrderId: varchar("garnishment_order_id").references(() => garnishmentOrders.id),
  payrollRunId: varchar("payroll_run_id"),
  
  // Event tracking
  eventType: varchar("event_type").notNull(), // 'create', 'update', 'apply', 'stop', 'reverse', 'calculate'
  eventReason: text("event_reason"),
  actor: varchar("actor").notNull(), // User ID who triggered the event
  
  // Calculation snapshot
  disposableNetBefore: decimal("disposable_net_before", { precision: 10, scale: 2 }),
  disposableNetAfter: decimal("disposable_net_after", { precision: 10, scale: 2 }),
  requestedAmount: decimal("requested_amount", { precision: 10, scale: 2 }),
  appliedAmount: decimal("applied_amount", { precision: 10, scale: 2 }),
  
  // Cap and protection details
  capReason: varchar("cap_reason"), // 'protected_floor', 'per_run_cap', 'balance_exhausted', 'scope_filter'
  protectedFloorUsed: decimal("protected_floor_used", { precision: 10, scale: 2 }),
  wasSkipped: boolean("was_skipped").default(false),
  wasCapped: boolean("was_capped").default(false),
  
  // Additional context
  runType: varchar("run_type"), // 'regular', 'bonus', 'offcycle'
  applyScope: varchar("apply_scope"), // 'all_runs', 'regular_only'
  priority: integer("priority"),
  
  // Audit metadata
  timestamp: timestamp("timestamp").defaultNow(),
  sessionId: varchar("session_id"),
  ipAddress: varchar("ip_address")
});

export type GarnishmentAudit = typeof garnishmentAudit.$inferSelect;
export type InsertGarnishmentAudit = typeof garnishmentAudit.$inferInsert;

export const insertGarnishmentAuditSchema = createInsertSchema(garnishmentAudit).omit({
  id: true,
  timestamp: true,
});

export const garnishmentAuditRelations = relations(garnishmentAudit, ({ one }) => ({
  garnishmentOrder: one(garnishmentOrders, {
    fields: [garnishmentAudit.garnishmentOrderId],
    references: [garnishmentOrders.id],
  }),
}));

// ========================================
// MULTI-TENANT ACCOUNTING FIRMS SYSTEM
// ========================================

// Partner accounting firms
export const partnerFirms = pgTable("partner_firms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  displayName: varchar("display_name"),
  taxId: varchar("tax_id"), // AFM for Greek firms
  businessLicense: varchar("business_license"),
  
  // Contact information
  email: varchar("email"),
  phone: varchar("phone"),
  website: varchar("website"),
  
  // Address
  address: text("address"),
  city: varchar("city"),
  postalCode: varchar("postal_code"),
  region: varchar("region"),
  country: varchar("country").default("GR"),
  
  // Business settings
  firmType: varchar("firm_type").notNull().default("accounting"), // 'accounting', 'payroll', 'consulting'
  certificationNumber: varchar("certification_number"), // Professional certification
  
  // Branding and customization
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color"),
  secondaryColor: varchar("secondary_color"),
  
  // System settings
  defaultTimezone: varchar("default_timezone").default("Europe/Athens"),
  defaultLocale: varchar("default_locale").default("el"),
  makerCheckerEnabled: boolean("maker_checker_enabled").default(true),
  
  // Status and lifecycle
  isActive: boolean("is_active").default(true),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"),
});

// Partner firm members and their roles
export const partnerMembers = pgTable("partner_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerFirmId: varchar("partner_firm_id").notNull().references(() => partnerFirms.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Role within the partner firm
  role: varchar("role").notNull(), // 'partner_admin', 'partner_staff', 'partner_reviewer', 'partner_viewer'
  title: varchar("title"), // Custom job title
  department: varchar("department"),
  
  // Permissions and access
  permissions: jsonb("permissions"), // Granular permissions array
  canManageClients: boolean("can_manage_clients").default(false),
  canSubmitFilings: boolean("can_submit_filings").default(false),
  canApproveActions: boolean("can_approve_actions").default(false),
  maxClientsAccess: integer("max_clients_access"), // Null = unlimited
  
  // Work settings
  employeeId: varchar("employee_id"), // Internal employee ID
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  billableRate: decimal("billable_rate", { precision: 10, scale: 2 }),
  
  // Status
  isActive: boolean("is_active").default(true),
  startDate: date("start_date"),
  endDate: date("end_date"),
  lastActiveAt: timestamp("last_active_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  invitedBy: varchar("invited_by"),
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at"),
});

// Client access invitations - sent to clients for approval before granting access
export const clientAccessInvitations = pgTable("client_access_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerFirmId: varchar("partner_firm_id").notNull().references(() => partnerFirms.id, { onDelete: 'cascade' }),
  clientTenantId: varchar("client_tenant_id").notNull(),
  clientAdminEmail: varchar("client_admin_email").notNull(),
  
  // Requested permissions
  requestedScopes: jsonb("requested_scopes").notNull().default(sql`'["filings:prepare", "runs:view", "audit:download"]'::jsonb`), // Default least privilege
  suggestedMakerCheckerMode: varchar("suggested_maker_checker_mode").notNull().default('client_checker'), // client_checker, partner_checker, dual
  
  // Invitation details
  invitationToken: varchar("invitation_token").notNull().unique(),
  message: text("message"), // Optional message from partner
  serviceType: varchar("service_type").notNull().default('payroll'), // 'payroll', 'filings', 'compliance', 'all'
  
  // Status and lifecycle
  status: varchar("status").notNull().default('pending'), // 'pending', 'approved', 'rejected', 'expired'
  expiresAt: timestamp("expires_at").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(), // Partner user who sent invitation
  approvedBy: varchar("approved_by"), // Client user who approved
});

// Client tenant access grants - manages which partner firms can access which client tenants
export const clientAccessGrants = pgTable("client_access_grants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invitationId: varchar("invitation_id"), // Reference to invitation that created this grant
  clientTenantId: varchar("client_tenant_id").notNull(), // References client's tenant/property ID
  partnerFirmId: varchar("partner_firm_id").notNull().references(() => partnerFirms.id, { onDelete: 'cascade' }),
  
  // Granular permission scopes with least privilege defaults
  grantedScopes: jsonb("granted_scopes").notNull().default(sql`'["filings:prepare", "runs:view", "audit:download"]'::jsonb`), // Granular scopes
  restrictedActions: jsonb("restricted_actions").default(sql`'[]'::jsonb`), // Actions that require client approval
  
  // Maker-checker configuration
  makerCheckerMode: varchar("maker_checker_mode").notNull().default('client_checker'), // client_checker, partner_checker, dual
  
  // Service configuration
  serviceType: varchar("service_type").notNull(), // 'payroll', 'filings', 'compliance', 'all'
  includedServices: jsonb("included_services"), // Specific services included
  excludedServices: jsonb("excluded_services"), // Specific services excluded
  
  // Approval and workflow settings
  requiresClientApproval: boolean("requires_client_approval").default(true),
  clientApproverUserId: varchar("client_approver_user_id"), // Who can approve on client side
  partnerReviewerRequired: boolean("partner_reviewer_required").default(false),
  
  // Time and billing
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  monthlyRetainer: decimal("monthly_retainer", { precision: 10, scale: 2 }),
  billingCycle: varchar("billing_cycle").default("monthly"), // 'monthly', 'quarterly', 'annual'
  
  // Validity and status
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  grantedBy: varchar("granted_by").notNull(), // Client user who granted access
  lastUsedAt: timestamp("last_used_at"),
});

// On-Behalf-Of (OBO) tokens for temporary delegation
export const oboTokens = pgTable("obo_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenHash: varchar("token_hash").notNull().unique(), // Hashed token for security
  
  // Token subject (who the token represents)
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  partnerFirmId: varchar("partner_firm_id").references(() => partnerFirms.id, { onDelete: 'cascade' }),
  asTenantId: varchar("as_tenant_id").notNull(), // The tenant being acted upon
  
  // Authorization details
  scopes: jsonb("scopes").notNull(), // Array of granted scopes
  permissions: jsonb("permissions"), // Specific permissions granted
  oboContext: jsonb("obo_context").notNull(), // Contains obo=true and context
  
  // Access constraints
  allowedActions: jsonb("allowed_actions"), // Specific actions allowed
  restrictedActions: jsonb("restricted_actions"), // Actions that are forbidden
  ipRestrictions: jsonb("ip_restrictions"), // IP addresses allowed to use token
  userAgentRestrictions: text("user_agent_restrictions"),
  
  // Lifecycle
  issuedAt: timestamp("issued_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  usageCount: integer("usage_count").default(0),
  maxUsage: integer("max_usage"), // Null = unlimited
  
  // Status
  isActive: boolean("is_active").default(true),
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by"),
  revocationReason: text("revocation_reason"),
  
  // Audit context
  issuedBy: varchar("issued_by").notNull(),
  issuedFor: varchar("issued_for"), // Purpose or reason for token
  sessionId: varchar("session_id"),
  requestId: varchar("request_id"),
});

// Maker-checker approval queue
export const approvalQueue = pgTable("approval_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Request details
  requestType: varchar("request_type").notNull(), // 'filing_submit', 'payroll_run', 'payment_batch', 'data_correction'
  requestSubtype: varchar("request_subtype"), // More specific type like 'apd_filing', 'fmy_filing'
  requestData: jsonb("request_data").notNull(), // The actual data/action being requested
  
  // Tenant and actor context
  tenantId: varchar("tenant_id").notNull(),
  partnerFirmId: varchar("partner_firm_id").references(() => partnerFirms.id),
  
  // Maker (requester)
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  makerRole: varchar("maker_role"), // Role of the person making the request
  makerComments: text("maker_comments"),
  
  // Checker/Approver
  assignedToRole: varchar("assigned_to_role"), // 'partner_reviewer', 'client_owner', 'payroll_admin'
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  
  // Approval workflow
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'cancelled', 'expired'
  priority: varchar("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  
  // Checker response
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  checkerComments: text("checker_comments"),
  rejectionReason: text("rejection_reason"),
  
  // Execution
  executedAt: timestamp("executed_at"),
  executedBy: varchar("executed_by").references(() => users.id),
  executionResult: jsonb("execution_result"),
  executionError: text("execution_error"),
  
  // Expiration and lifecycle
  expiresAt: timestamp("expires_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: varchar("cancelled_by").references(() => users.id),
  cancellationReason: text("cancellation_reason"),
  
  // Metadata
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }), // Risk assessment score
  estimatedImpact: varchar("estimated_impact"), // 'low', 'medium', 'high'
  relatedEntityIds: jsonb("related_entity_ids"), // IDs of related entities (employees, etc)
  
  // System fields
  correlationId: varchar("correlation_id"), // For tracking related requests
  parentRequestId: varchar("parent_request_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hash-chained audit log for immutable audit trail
export const hashChainedAuditLog = pgTable("hash_chained_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceNumber: serial("sequence_number"), // Monotonic sequence for chain verification
  
  // Hash chain integrity
  eventHash: varchar("event_hash").notNull(), // SHA-256 hash of this event
  previousHash: varchar("previous_hash"), // Hash of previous event in chain
  chainHash: varchar("chain_hash").notNull(), // Combined hash for chain validation
  
  // Event details
  eventType: varchar("event_type").notNull(), // 'user_action', 'system_event', 'data_change', 'access_grant'
  eventCategory: varchar("event_category").notNull(), // 'authentication', 'authorization', 'data_modification', 'filing', 'payment'
  eventAction: varchar("event_action").notNull(), // Specific action taken
  
  // Context
  tenantId: varchar("tenant_id"),
  partnerFirmId: varchar("partner_firm_id"),
  userId: varchar("user_id"),
  
  // OBO (On-Behalf-Of) context
  isOboAction: boolean("is_obo_action").default(false),
  oboActorUserId: varchar("obo_actor_user_id"), // Who actually performed the action
  oboTargetUserId: varchar("obo_target_user_id"), // On whose behalf
  oboTokenId: varchar("obo_token_id").references(() => oboTokens.id),
  
  // Event data
  eventData: jsonb("event_data"), // Structured event data
  beforeState: jsonb("before_state"), // State before the change
  afterState: jsonb("after_state"), // State after the change
  
  // Request context
  requestId: varchar("request_id"),
  sessionId: varchar("session_id"),
  correlationId: varchar("correlation_id"),
  
  // Network and device context
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint"),
  
  // Timing
  timestamp: timestamp("timestamp").defaultNow(),
  processingDuration: integer("processing_duration"), // Processing time in milliseconds
  
  // Compliance and risk
  riskLevel: varchar("risk_level"), // 'low', 'medium', 'high', 'critical'
  complianceFlags: jsonb("compliance_flags"), // Compliance-related flags
  dataClassification: varchar("data_classification"), // 'public', 'internal', 'confidential', 'restricted'
  
  // Verification
  isVerified: boolean("is_verified").default(false),
  verificationMethod: varchar("verification_method"), // How the event was verified
  digitalSignature: text("digital_signature"), // Optional digital signature
});

// Document and audit pack generation
export const documentPacks = pgTable("document_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Pack metadata
  packType: varchar("pack_type").notNull(), // 'inspector_pack', 'audit_pack', 'compliance_pack', 'filing_pack'
  packName: varchar("pack_name").notNull(),
  description: text("description"),
  
  // Scope
  tenantId: varchar("tenant_id").notNull(),
  partnerFirmId: varchar("partner_firm_id").references(() => partnerFirms.id),
  
  // Time range
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  generatedFor: varchar("generated_for"), // 'tax_audit', 'labor_inspection', 'internal_review', 'client_request'
  
  // Contents
  includedDocuments: jsonb("included_documents").notNull(), // Array of document types included
  excludedDocuments: jsonb("excluded_documents"), // Documents explicitly excluded
  customInclusions: jsonb("custom_inclusions"), // Custom data inclusions
  
  // Filters and criteria
  filterCriteria: jsonb("filter_criteria"), // Filtering criteria applied
  employeeScope: jsonb("employee_scope"), // Which employees included
  departmentScope: jsonb("department_scope"), // Which departments included
  
  // Generation details
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  generatedBy: varchar("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at"),
  
  // File details
  fileUrl: varchar("file_url"),
  fileName: varchar("file_name"),
  fileSize: integer("file_size"), // Size in bytes
  fileMimeType: varchar("file_mime_type"),
  fileChecksum: varchar("file_checksum"), // SHA-256 checksum
  
  // Status and lifecycle
  status: varchar("status").notNull().default("requested"), // 'requested', 'generating', 'ready', 'downloaded', 'expired', 'error'
  expiresAt: timestamp("expires_at"),
  downloadCount: integer("download_count").default(0),
  maxDownloads: integer("max_downloads"),
  
  // Access control
  accessLevel: varchar("access_level").default("requester_only"), // 'requester_only', 'tenant_users', 'partner_firm', 'public'
  downloadToken: varchar("download_token"), // Secure download token
  passwordProtected: boolean("password_protected").default(false),
  
  // Error handling
  generationError: text("generation_error"),
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  
  // Metadata
  tags: jsonb("tags"), // Searchable tags
  customMetadata: jsonb("custom_metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document pack downloads log
export const documentPackDownloads = pgTable("document_pack_downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentPackId: varchar("document_pack_id").notNull().references(() => documentPacks.id, { onDelete: 'cascade' }),
  
  downloadedBy: varchar("downloaded_by").notNull().references(() => users.id),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
  
  // Download context
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  downloadMethod: varchar("download_method"), // 'direct', 'api', 'email_link'
  
  // File verification
  checksumVerified: boolean("checksum_verified").default(false),
  downloadComplete: boolean("download_complete").default(true),
  bytesDownloaded: integer("bytes_downloaded"),
  
  // OBO context if applicable
  isOboDownload: boolean("is_obo_download").default(false),
  oboTokenId: varchar("obo_token_id").references(() => oboTokens.id),
  
  sessionId: varchar("session_id"),
  requestId: varchar("request_id"),
});

// Type exports for multi-tenant system
export type PartnerFirm = typeof partnerFirms.$inferSelect;
export type InsertPartnerFirm = typeof partnerFirms.$inferInsert;

export type PartnerMember = typeof partnerMembers.$inferSelect;
export type InsertPartnerMember = typeof partnerMembers.$inferInsert;

export type ClientAccessInvitation = typeof clientAccessInvitations.$inferSelect;
export type InsertClientAccessInvitation = typeof clientAccessInvitations.$inferInsert;

export type ClientAccessGrant = typeof clientAccessGrants.$inferSelect;
export type InsertClientAccessGrant = typeof clientAccessGrants.$inferInsert;

export type OboToken = typeof oboTokens.$inferSelect;
export type InsertOboToken = typeof oboTokens.$inferInsert;

export type ApprovalQueue = typeof approvalQueue.$inferSelect;
export type InsertApprovalQueue = typeof approvalQueue.$inferInsert;

export type HashChainedAuditLog = typeof hashChainedAuditLog.$inferSelect;
export type InsertHashChainedAuditLog = typeof hashChainedAuditLog.$inferInsert;

export type DocumentPack = typeof documentPacks.$inferSelect;
export type InsertDocumentPack = typeof documentPacks.$inferInsert;

export type DocumentPackDownload = typeof documentPackDownloads.$inferSelect;
export type InsertDocumentPackDownload = typeof documentPackDownloads.$inferInsert;

// Schema validation for multi-tenant system
export const insertPartnerFirmSchema = createInsertSchema(partnerFirms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPartnerMemberSchema = createInsertSchema(partnerMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastActiveAt: true,
});

export const insertClientAccessInvitationSchema = createInsertSchema(clientAccessInvitations).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  respondedAt: true,
  invitationToken: true,
});

export const insertClientAccessGrantSchema = createInsertSchema(clientAccessGrants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});

export const insertOboTokenSchema = createInsertSchema(oboTokens).omit({
  id: true,
  tokenHash: true,
  issuedAt: true,
  lastUsedAt: true,
  usageCount: true,
});

export const insertApprovalQueueSchema = createInsertSchema(approvalQueue).omit({
  id: true,
  requestedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHashChainedAuditLogSchema = createInsertSchema(hashChainedAuditLog).omit({
  id: true,
  sequenceNumber: true,
  eventHash: true,
  previousHash: true,
  chainHash: true,
  timestamp: true,
});

export const insertDocumentPackSchema = createInsertSchema(documentPacks).omit({
  id: true,
  requestedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentPackDownloadSchema = createInsertSchema(documentPackDownloads).omit({
  id: true,
  downloadedAt: true,
});

// Relations for multi-tenant system
export const partnerFirmRelations = relations(partnerFirms, ({ many }) => ({
  members: many(partnerMembers),
  clientGrants: many(clientAccessGrants),
  oboTokens: many(oboTokens),
}));

export const partnerMemberRelations = relations(partnerMembers, ({ one, many }) => ({
  partnerFirm: one(partnerFirms, {
    fields: [partnerMembers.partnerFirmId],
    references: [partnerFirms.id],
  }),
  user: one(users, {
    fields: [partnerMembers.userId],
    references: [users.id],
  }),
}));

export const clientAccessGrantRelations = relations(clientAccessGrants, ({ one }) => ({
  partnerFirm: one(partnerFirms, {
    fields: [clientAccessGrants.partnerFirmId],
    references: [partnerFirms.id],
  }),
}));

export const oboTokenRelations = relations(oboTokens, ({ one }) => ({
  user: one(users, {
    fields: [oboTokens.userId],
    references: [users.id],
  }),
  partnerFirm: one(partnerFirms, {
    fields: [oboTokens.partnerFirmId],
    references: [partnerFirms.id],
  }),
}));

export const approvalQueueRelations = relations(approvalQueue, ({ one }) => ({
  requestedByUser: one(users, {
    fields: [approvalQueue.requestedBy],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [approvalQueue.assignedToUserId],
    references: [users.id],
  }),
  reviewedByUser: one(users, {
    fields: [approvalQueue.reviewedBy],
    references: [users.id],
  }),
  partnerFirm: one(partnerFirms, {
    fields: [approvalQueue.partnerFirmId],
    references: [partnerFirms.id],
  }),
  parentRequest: one(approvalQueue, {
    fields: [approvalQueue.parentRequestId],
    references: [approvalQueue.id],
  }),
}));

export const documentPackRelations = relations(documentPacks, ({ one, many }) => ({
  requestedByUser: one(users, {
    fields: [documentPacks.requestedBy],
    references: [users.id],
  }),
  generatedByUser: one(users, {
    fields: [documentPacks.generatedBy],
    references: [users.id],
  }),
  partnerFirm: one(partnerFirms, {
    fields: [documentPacks.partnerFirmId],
    references: [partnerFirms.id],
  }),
  downloads: many(documentPackDownloads),
}));

export const documentPackDownloadRelations = relations(documentPackDownloads, ({ one }) => ({
  documentPack: one(documentPacks, {
    fields: [documentPackDownloads.documentPackId],
    references: [documentPacks.id],
  }),
  downloadedByUser: one(users, {
    fields: [documentPackDownloads.downloadedBy],
    references: [users.id],
  }),
  oboToken: one(oboTokens, {
    fields: [documentPackDownloads.oboTokenId],
    references: [oboTokens.id],
  }),
}));

// Disaster Recovery Schema

// Tabletop DR Exercise Management
export const drExercises = pgTable("dr_exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exerciseName: varchar("exercise_name").notNull(),
  exerciseType: varchar("exercise_type").notNull(), // 'tabletop', 'walkthrough', 'simulation', 'live'
  scenario: text("scenario").notNull(),
  objectives: jsonb("objectives").notNull(), // Array of objectives
  scope: varchar("scope").notNull(), // 'full', 'partial', 'component-specific'
  targetRTO: integer("target_rto_minutes").notNull(), // Recovery Time Objective in minutes
  targetRPO: integer("target_rpo_minutes").notNull(), // Recovery Point Objective in minutes
  plannedDate: timestamp("planned_date").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  status: varchar("status").default('planned').notNull(), // 'planned', 'in_progress', 'completed', 'cancelled'
  facilitatorId: varchar("facilitator_id").references(() => users.id),
  participants: jsonb("participants").notNull(), // Array of participant user IDs
  findings: jsonb("findings"), // Array of findings/issues discovered
  actionItems: jsonb("action_items"), // Array of remediation tasks
  overallScore: integer("overall_score"), // 1-100 score
  lessonsLearned: text("lessons_learned"),
  nextExerciseDate: timestamp("next_exercise_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Automated Restore Testing
export const restoreTests = pgTable("restore_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testName: varchar("test_name").notNull(),
  testType: varchar("test_type").notNull(), // 'full', 'partial', 'validation', 'synthetic'
  backupSource: varchar("backup_source").notNull(), // identifier of backup being tested
  backupTimestamp: timestamp("backup_timestamp").notNull(),
  testEnvironment: varchar("test_environment").notNull(), // 'production', 'staging', 'isolated'
  automatedTestSuite: jsonb("automated_test_suite").notNull(), // Test definitions
  scheduledAt: timestamp("scheduled_at").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  status: varchar("status").default('pending').notNull(), // 'pending', 'running', 'passed', 'failed', 'error'
  testResults: jsonb("test_results"), // Detailed test execution results
  validationChecks: jsonb("validation_checks"), // Data integrity checks
  performanceMetrics: jsonb("performance_metrics"), // Restore speed, etc.
  dataIntegrityScore: integer("data_integrity_score"), // 0-100
  actualRTO: integer("actual_rto_minutes"), // Measured recovery time
  actualRPO: integer("actual_rpo_minutes"), // Measured data loss
  errorLog: text("error_log"),
  alertsSent: boolean("alerts_sent").default(false),
  nextTestDate: timestamp("next_test_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// RPO/RTO SLA Management
export const drSLAs = pgTable("dr_slas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceName: varchar("service_name").notNull(),
  criticality: varchar("criticality").notNull(), // 'critical', 'high', 'medium', 'low'
  businessFunction: varchar("business_function").notNull(),
  rtoMinutes: integer("rto_minutes").notNull(), // Recovery Time Objective
  rpoMinutes: integer("rpo_minutes").notNull(), // Recovery Point Objective
  availabilityTarget: decimal("availability_target", { precision: 5, scale: 4 }).notNull(), // 99.99%
  maxDowntimePerMonth: integer("max_downtime_per_month_minutes").notNull(),
  backupFrequency: varchar("backup_frequency").notNull(), // 'continuous', 'hourly', 'daily', etc.
  testingFrequency: varchar("testing_frequency").notNull(), // 'monthly', 'quarterly', etc.
  lastTestedAt: timestamp("last_tested_at"),
  lastIncidentAt: timestamp("last_incident_at"),
  lastRTOBreach: timestamp("last_rto_breach"),
  lastRPOBreach: timestamp("last_rpo_breach"),
  currentStatus: varchar("current_status").default('compliant').notNull(), // 'compliant', 'warning', 'breach'
  complianceScore: integer("compliance_score").default(100), // 0-100
  escalationContacts: jsonb("escalation_contacts").notNull(), // Contact hierarchy
  businessImpactStatement: text("business_impact_statement").notNull(),
  isActive: boolean("is_active").default(true),
  reviewDate: timestamp("review_date").notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Object Storage WORM (Write-Once Read-Many)
export const wormObjects = pgTable("worm_objects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  objectPath: varchar("object_path").notNull().unique(),
  objectHash: varchar("object_hash").notNull(), // SHA-256 hash for integrity
  bucketName: varchar("bucket_name").notNull(),
  originalSize: integer("original_size").notNull(),
  contentType: varchar("content_type"),
  retentionPeriodDays: integer("retention_period_days").notNull(),
  legalHoldStatus: boolean("legal_hold_status").default(false),
  compliancePolicy: varchar("compliance_policy").notNull(), // 'audit', 'regulatory', 'legal', 'operational'
  accessRestrictions: jsonb("access_restrictions").notNull(), // Role-based access
  immutableUntil: timestamp("immutable_until").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
  accessCount: integer("access_count").default(0),
  tamperAttempts: integer("tamper_attempts").default(0),
  integrityChecks: jsonb("integrity_checks"), // History of integrity validations
  complianceFlags: jsonb("compliance_flags"), // Regulatory compliance markers
  status: varchar("status").default('active').notNull(), // 'active', 'expired', 'archived', 'deleted'
  createdAt: timestamp("created_at").defaultNow(),
  lastVerifiedAt: timestamp("last_verified_at").defaultNow(),
});

// Backup Monitoring and SLA Tracking
export const backupMonitoring = pgTable("backup_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceName: varchar("service_name").notNull(),
  backupType: varchar("backup_type").notNull(), // 'full', 'incremental', 'differential'
  backupJobId: varchar("backup_job_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  status: varchar("status").notNull(), // 'running', 'success', 'failed', 'warning'
  dataSize: integer("data_size_bytes"),
  backupDuration: integer("backup_duration_minutes"),
  compressionRatio: decimal("compression_ratio", { precision: 5, scale: 2 }),
  verificationStatus: varchar("verification_status"), // 'passed', 'failed', 'skipped'
  slaCompliance: boolean("sla_compliance"),
  errorDetails: text("error_details"),
  performanceMetrics: jsonb("performance_metrics"),
  nextScheduledBackup: timestamp("next_scheduled_backup"),
  retentionExpiresAt: timestamp("retention_expires_at"),
  drSlaId: varchar("dr_sla_id").references(() => drSLAs.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for disaster recovery
export type DRExercise = typeof drExercises.$inferSelect;
export type InsertDRExercise = typeof drExercises.$inferInsert;
export type RestoreTest = typeof restoreTests.$inferSelect;
export type InsertRestoreTest = typeof restoreTests.$inferInsert;
export type DRSLA = typeof drSLAs.$inferSelect;
export type InsertDRSLA = typeof drSLAs.$inferInsert;
export type WORMObject = typeof wormObjects.$inferSelect;
export type InsertWORMObject = typeof wormObjects.$inferInsert;
export type BackupMonitoring = typeof backupMonitoring.$inferSelect;
export type InsertBackupMonitoring = typeof backupMonitoring.$inferInsert;

// Insert schemas for disaster recovery
export const insertDRExerciseSchema = createInsertSchema(drExercises).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRestoreTestSchema = createInsertSchema(restoreTests).omit({
  id: true,
  createdAt: true,
});

export const insertDRSLASchema = createInsertSchema(drSLAs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWORMObjectSchema = createInsertSchema(wormObjects).omit({
  id: true,
  createdAt: true,
  lastVerifiedAt: true,
});

export const insertBackupMonitoringSchema = createInsertSchema(backupMonitoring).omit({
  id: true,
  createdAt: true,
});

// Central Log Aggregation Schema

// Core log entries table with partitioning support
export const logEntries = pgTable("log_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: varchar("level").notNull(), // 'debug', 'info', 'warn', 'error', 'fatal'
  service: varchar("service").notNull(), // Service/component name
  component: varchar("component"), // Specific component within service
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"),
  requestId: varchar("request_id"), // Correlation ID for request tracing
  message: text("message").notNull(),
  details: jsonb("details"), // Structured log data
  tags: jsonb("tags"), // Searchable tags array
  source: varchar("source").notNull(), // 'application', 'system', 'security', 'audit'
  category: varchar("category"), // 'payroll', 'hr', 'compliance', 'billing', etc.
  severity: integer("severity").default(0), // 0-100 severity score
  environment: varchar("environment").default('development'), // 'development', 'staging', 'production'
  hostname: varchar("hostname"),
  processId: varchar("process_id"),
  threadId: varchar("thread_id"),
  stackTrace: text("stack_trace"),
  duration: integer("duration_ms"), // For performance logs
  statusCode: integer("status_code"), // For HTTP logs
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  metadata: jsonb("metadata"), // Additional structured metadata
  indexed: boolean("indexed").default(false), // For search indexing
  archived: boolean("archived").default(false),
  retentionExpiresAt: timestamp("retention_expires_at"),
});

// Log aggregation views and metrics
export const logMetrics = pgTable("log_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timeWindow: timestamp("time_window").notNull(), // Start of time window
  windowSize: integer("window_size_minutes").default(60), // Size of aggregation window
  service: varchar("service").notNull(),
  level: varchar("level").notNull(),
  category: varchar("category"),
  entryCount: integer("entry_count").default(0),
  errorCount: integer("error_count").default(0),
  warnCount: integer("warn_count").default(0),
  avgSeverity: decimal("avg_severity", { precision: 5, scale: 2 }),
  avgDuration: decimal("avg_duration_ms", { precision: 10, scale: 2 }),
  uniqueUsers: integer("unique_users").default(0),
  uniqueSessions: integer("unique_sessions").default(0),
  topErrors: jsonb("top_errors"), // Most frequent error messages
  performanceP95: decimal("performance_p95_ms", { precision: 10, scale: 2 }),
  performanceP99: decimal("performance_p99_ms", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Real-time log streaming subscriptions
export const logSubscriptions = pgTable("log_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(),
  filters: jsonb("filters").notNull(), // Search criteria
  isActive: boolean("is_active").default(true),
  alertThreshold: integer("alert_threshold"), // Alert after N matching logs
  lastTriggered: timestamp("last_triggered"),
  notificationChannels: jsonb("notification_channels"), // email, slack, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Log retention policies
export const logRetentionPolicies = pgTable("log_retention_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service").notNull(),
  level: varchar("level"),
  category: varchar("category"),
  retentionDays: integer("retention_days").notNull().default(90),
  archiveAfterDays: integer("archive_after_days").default(30),
  compressionEnabled: boolean("compression_enabled").default(true),
  backupEnabled: boolean("backup_enabled").default(true),
  complianceFramework: varchar("compliance_framework"), // 'GDPR', 'SOX', 'PCI', etc.
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // Higher priority policies override lower
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Search index for fast log queries
export const logSearchIndex = pgTable("log_search_index", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  logEntryId: varchar("log_entry_id").references(() => logEntries.id).notNull(),
  searchTerms: text("search_terms").notNull(), // Tokenized searchable text
  serviceTerms: varchar("service_terms"),
  messageTerms: text("message_terms"),
  detailsTerms: text("details_terms"),
  indexedAt: timestamp("indexed_at").defaultNow(),
});

// Log analysis patterns and anomaly detection
export const logPatterns = pgTable("log_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: varchar("pattern_type").notNull(), // 'anomaly', 'trend', 'correlation'
  service: varchar("service").notNull(),
  pattern: jsonb("pattern").notNull(), // Pattern definition
  confidence: decimal("confidence", { precision: 5, scale: 4 }), // 0-1 confidence score
  frequency: varchar("frequency"), // 'hourly', 'daily', 'weekly'
  lastDetected: timestamp("last_detected"),
  occurrenceCount: integer("occurrence_count").default(0),
  severity: varchar("severity").default('medium'), // 'low', 'medium', 'high', 'critical'
  description: text("description"),
  recommendedAction: text("recommended_action"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for log aggregation
export type LogEntry = typeof logEntries.$inferSelect;
export type InsertLogEntry = typeof logEntries.$inferInsert;
export type LogMetrics = typeof logMetrics.$inferSelect;
export type InsertLogMetrics = typeof logMetrics.$inferInsert;
export type LogSubscription = typeof logSubscriptions.$inferSelect;
export type InsertLogSubscription = typeof logSubscriptions.$inferInsert;
export type LogRetentionPolicy = typeof logRetentionPolicies.$inferSelect;
export type InsertLogRetentionPolicy = typeof logRetentionPolicies.$inferInsert;
export type LogSearchIndex = typeof logSearchIndex.$inferSelect;
export type InsertLogSearchIndex = typeof logSearchIndex.$inferInsert;
export type LogPattern = typeof logPatterns.$inferSelect;
export type InsertLogPattern = typeof logPatterns.$inferInsert;

// Insert schemas for log aggregation
export const insertLogEntrySchema = createInsertSchema(logEntries).omit({
  id: true,
  timestamp: true,
});

export const insertLogMetricsSchema = createInsertSchema(logMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertLogSubscriptionSchema = createInsertSchema(logSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLogRetentionPolicySchema = createInsertSchema(logRetentionPolicies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLogSearchIndexSchema = createInsertSchema(logSearchIndex).omit({
  id: true,
  indexedAt: true,
});

export const insertLogPatternSchema = createInsertSchema(logPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Government System Monitoring Schema

// Government systems status tracking
export const governmentSystems = pgTable("government_systems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemCode: varchar("system_code").notNull().unique(), // 'ergani_ii', 'e_efka', 'aade_fmy', etc.
  displayName: varchar("display_name").notNull(), // Human-readable name
  description: text("description"),
  baseUrl: varchar("base_url").notNull(), // Base URL for health checks
  healthCheckEndpoint: varchar("health_check_endpoint").default('/health'), // Specific endpoint to check
  systemType: varchar("system_type").notNull(), // 'labor_reporting', 'social_security', 'tax_authority'
  isActive: boolean("is_active").default(true),
  priority: varchar("priority").default('high'), // 'critical', 'high', 'medium', 'low'
  timeout: integer("timeout_ms").default(30000), // Request timeout in milliseconds
  retryAttempts: integer("retry_attempts").default(3),
  checkInterval: integer("check_interval_minutes").default(5), // How often to check
  maintenanceWindows: jsonb("maintenance_windows"), // Known maintenance periods
  contactInfo: jsonb("contact_info"), // Support contacts and escalation
  documentation: jsonb("documentation"), // Links to system documentation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Real-time status monitoring
export const systemStatusChecks = pgTable("system_status_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemId: varchar("system_id").references(() => governmentSystems.id).notNull(),
  checkTime: timestamp("check_time").notNull().defaultNow(),
  status: varchar("status").notNull(), // 'online', 'offline', 'degraded', 'maintenance'
  responseTime: integer("response_time_ms"), // Response time in milliseconds
  httpStatusCode: integer("http_status_code"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"), // Stack trace, connection details, etc.
  checkMethod: varchar("check_method").default('http'), // 'http', 'ping', 'custom'
  checkedBy: varchar("checked_by").default('automated'), // 'automated', 'manual', user_id
  isSuccessful: boolean("is_successful").notNull(),
  retryCount: integer("retry_count").default(0),
  nextRetryAt: timestamp("next_retry_at"),
  metadata: jsonb("metadata"), // Additional check-specific data
});

// Outage incidents and tracking
export const systemOutages = pgTable("system_outages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemId: varchar("system_id").references(() => governmentSystems.id).notNull(),
  incidentId: varchar("incident_id").notNull(), // External incident ID if available
  title: varchar("title").notNull(),
  description: text("description"),
  severity: varchar("severity").notNull(), // 'critical', 'major', 'minor', 'maintenance'
  status: varchar("status").default('active'), // 'active', 'resolved', 'investigating', 'monitoring'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration_minutes"),
  affectedServices: jsonb("affected_services"), // List of affected functionality
  rootCause: text("root_cause"),
  resolution: text("resolution"),
  impact: varchar("impact"), // 'total_outage', 'partial_outage', 'performance_degradation'
  estimatedResolution: timestamp("estimated_resolution"),
  communicationStatus: varchar("communication_status").default('pending'), // 'pending', 'communicated', 'escalated'
  reportedBy: varchar("reported_by"), // 'system', 'user', 'external'
  assignedTo: varchar("assigned_to"), // Support team member
  priority: integer("priority").default(1), // 1 = highest
  tags: jsonb("tags"),
  externalReferences: jsonb("external_references"), // Links to government announcements
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Alert subscriptions and notifications
export const systemAlertSubscriptions = pgTable("system_alert_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  systemId: varchar("system_id").references(() => governmentSystems.id),
  alertType: varchar("alert_type").notNull(), // 'outage', 'degradation', 'maintenance', 'recovery'
  severity: jsonb("severity"), // Array of severities to alert on
  notificationChannels: jsonb("notification_channels"), // 'email', 'sms', 'slack', 'webhook'
  isActive: boolean("is_active").default(true),
  quietHours: jsonb("quiet_hours"), // Time periods to suppress notifications
  escalationDelay: integer("escalation_delay_minutes").default(15),
  lastTriggered: timestamp("last_triggered"),
  triggerCount: integer("trigger_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Historical metrics and SLA tracking
export const systemAvailabilityMetrics = pgTable("system_availability_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemId: varchar("system_id").references(() => governmentSystems.id).notNull(),
  metricDate: timestamp("metric_date").notNull(), // Date for this metric period
  periodType: varchar("period_type").notNull(), // 'hourly', 'daily', 'weekly', 'monthly'
  totalChecks: integer("total_checks").notNull().default(0),
  successfulChecks: integer("successful_checks").notNull().default(0),
  failedChecks: integer("failed_checks").notNull().default(0),
  avgResponseTime: decimal("avg_response_time_ms", { precision: 10, scale: 2 }),
  maxResponseTime: integer("max_response_time_ms"),
  minResponseTime: integer("min_response_time_ms"),
  uptime: decimal("uptime_percentage", { precision: 5, scale: 2 }), // 0-100%
  slaTarget: decimal("sla_target", { precision: 5, scale: 2 }).default('99.9'), // SLA target %
  slaStatus: varchar("sla_status"), // 'met', 'missed', 'at_risk'
  outageCount: integer("outage_count").default(0),
  totalOutageMinutes: integer("total_outage_minutes").default(0),
  incidentCount: integer("incident_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// System integration points and dependencies
export const systemIntegrations = pgTable("system_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemId: varchar("system_id").references(() => governmentSystems.id).notNull(),
  integrationType: varchar("integration_type").notNull(), // 'api', 'file_transfer', 'web_service', 'manual'
  endpoint: varchar("endpoint"),
  authMethod: varchar("auth_method"), // 'certificate', 'api_key', 'oauth', 'basic_auth'
  dataFormat: varchar("data_format"), // 'xml', 'json', 'csv', 'fixed_width'
  frequency: varchar("frequency"), // 'real_time', 'hourly', 'daily', 'weekly', 'monthly', 'on_demand'
  businessFunction: varchar("business_function").notNull(), // 'payroll_submission', 'employee_registration', 'tax_filing'
  isEnabled: boolean("is_enabled").default(true),
  lastSuccessfulSync: timestamp("last_successful_sync"),
  lastSyncAttempt: timestamp("last_sync_attempt"),
  syncStatus: varchar("sync_status"), // 'success', 'failed', 'in_progress', 'pending'
  errorCount: integer("error_count").default(0),
  configuration: jsonb("configuration"), // Integration-specific settings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for government system monitoring
export type GovernmentSystem = typeof governmentSystems.$inferSelect;
export type InsertGovernmentSystem = typeof governmentSystems.$inferInsert;
export type SystemStatusCheck = typeof systemStatusChecks.$inferSelect;
export type InsertSystemStatusCheck = typeof systemStatusChecks.$inferInsert;
export type SystemOutage = typeof systemOutages.$inferSelect;
export type InsertSystemOutage = typeof systemOutages.$inferInsert;
export type SystemAlertSubscription = typeof systemAlertSubscriptions.$inferSelect;
export type InsertSystemAlertSubscription = typeof systemAlertSubscriptions.$inferInsert;
export type SystemAvailabilityMetrics = typeof systemAvailabilityMetrics.$inferSelect;
export type InsertSystemAvailabilityMetrics = typeof systemAvailabilityMetrics.$inferInsert;
export type SystemIntegration = typeof systemIntegrations.$inferSelect;
export type InsertSystemIntegration = typeof systemIntegrations.$inferInsert;

// Insert schemas for government system monitoring
export const insertGovernmentSystemSchema = createInsertSchema(governmentSystems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemStatusCheckSchema = createInsertSchema(systemStatusChecks).omit({
  id: true,
  checkTime: true,
});

export const insertSystemOutageSchema = createInsertSchema(systemOutages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemAlertSubscriptionSchema = createInsertSchema(systemAlertSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemAvailabilityMetricsSchema = createInsertSchema(systemAvailabilityMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertSystemIntegrationSchema = createInsertSchema(systemIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Import canonical payment schema tables
export * from './payments-canonical-schema';
