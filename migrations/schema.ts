import { pgTable, index, varchar, jsonb, timestamp, foreignKey, text, date, numeric, boolean, integer, unique, serial, inet } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const properties = pgTable("properties", {
	propertyId: varchar("property_id").default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	address: text(),
	geofences: jsonb().default([]),
	costCenterCode: varchar("cost_center_code", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	companyId: varchar("company_id", { length: 50 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.companyId],
			name: "fk_properties_company"
		}).onDelete("cascade"),
]);

export const shifts = pgTable("shifts", {
	shiftId: varchar("shift_id").default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	startPlanned: timestamp("start_planned", { mode: 'string' }).notNull(),
	endPlanned: timestamp("end_planned", { mode: 'string' }).notNull(),
	role: varchar({ length: 100 }).notNull(),
	propertyId: varchar("property_id").notNull(),
	mealBreakPolicy: jsonb("meal_break_policy"),
	tags: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "shifts_employee_id_employees_employee_id_fk"
		}),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "shifts_property_id_properties_property_id_fk"
		}),
]);

export const employees = pgTable("employees", {
	employeeId: varchar("employee_id").default(gen_random_uuid()).primaryKey().notNull(),
	afm: varchar({ length: 9 }),
	name: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 100 }).notNull(),
	employmentType: varchar("employment_type", { length: 50 }).notNull(),
	hireDate: date("hire_date").notNull(),
	termDate: date("term_date"),
	defaultPropertyId: varchar("default_property_id"),
	unionCbaRef: varchar("union_cba_ref", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	employeeNumber: varchar("employee_number"),
	companyId: varchar("company_id", { length: 50 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.defaultPropertyId],
			foreignColumns: [properties.propertyId],
			name: "employees_default_property_id_properties_property_id_fk"
		}),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.companyId],
			name: "fk_employees_company"
		}).onDelete("cascade"),
]);

export const punchEvents = pgTable("punch_events", {
	eventId: varchar("event_id").default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	propertyId: varchar("property_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	type: varchar({ length: 20 }).notNull(),
	sourceDeviceId: varchar("source_device_id", { length: 100 }),
	method: varchar({ length: 20 }).notNull(),
	latitude: numeric({ precision: 10, scale:  8 }),
	longitude: numeric({ precision: 11, scale:  8 }),
	offlineFlag: boolean("offline_flag").default(false),
	signatureHash: varchar("signature_hash", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_punch_events_employee_timestamp").using("btree", table.employeeId.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("text_ops")),
	index("idx_punch_events_property_timestamp").using("btree", table.propertyId.asc().nullsLast().op("timestamp_ops"), table.timestamp.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "punch_events_employee_id_employees_employee_id_fk"
		}),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "punch_events_property_id_properties_property_id_fk"
		}),
]);

export const exceptions = pgTable("exceptions", {
	exceptionId: varchar("exception_id").default(gen_random_uuid()).primaryKey().notNull(),
	type: varchar({ length: 50 }).notNull(),
	detectedAt: timestamp("detected_at", { mode: 'string' }).notNull(),
	employeeId: varchar("employee_id"),
	propertyId: varchar("property_id"),
	shiftId: varchar("shift_id"),
	resolvedBy: varchar("resolved_by"),
	resolutionCode: varchar("resolution_code", { length: 50 }),
	comments: text(),
	attachments: jsonb().default([]),
	status: varchar({ length: 20 }).default('open'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_exceptions_detected_at").using("btree", table.detectedAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_exceptions_employee").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
	index("idx_exceptions_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "exceptions_employee_id_employees_employee_id_fk"
		}),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "exceptions_property_id_properties_property_id_fk"
		}),
	foreignKey({
			columns: [table.shiftId],
			foreignColumns: [shifts.shiftId],
			name: "exceptions_shift_id_shifts_shift_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [users.id],
			name: "exceptions_resolved_by_users_id_fk"
		}),
]);

export const timesheets = pgTable("timesheets", {
	timesheetId: varchar("timesheet_id").default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	regularHours: numeric("regular_hours", { precision: 8, scale:  2 }).default('0'),
	nightHours: numeric("night_hours", { precision: 8, scale:  2 }).default('0'),
	overtimeHoursByTier: jsonb("overtime_hours_by_tier").default({}),
	breakMinutes: integer("break_minutes").default(0),
	leaveMinutesByType: jsonb("leave_minutes_by_type").default({}),
	costCenterAllocations: jsonb("cost_center_allocations").default([]),
	payrollStatus: varchar("payroll_status", { length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_timesheets_employee_period").using("btree", table.employeeId.asc().nullsLast().op("date_ops"), table.periodStart.asc().nullsLast().op("date_ops"), table.periodEnd.asc().nullsLast().op("text_ops")),
	index("idx_timesheets_payroll_status").using("btree", table.payrollStatus.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "timesheets_employee_id_employees_employee_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	email: varchar(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	emailVerified: boolean("email_verified").default(false),
	emailVerifiedAt: timestamp("email_verified_at", { mode: 'string' }),
	passwordHash: varchar("password_hash"),
	locale: varchar().default('en'),
	timezone: varchar().default('Europe/Athens'),
	mfaEnabled: boolean("mfa_enabled").default(false),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	loginAttempts: integer("login_attempts").default(0),
	lockedUntil: timestamp("locked_until", { mode: 'string' }),
	gdprConsentAt: timestamp("gdpr_consent_at", { mode: 'string' }),
	tosAcceptedAt: timestamp("tos_accepted_at", { mode: 'string' }),
	privacyAcceptedAt: timestamp("privacy_accepted_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const dataRetentionPolicy = pgTable("data_retention_policy", {
	policyId: varchar("policy_id").default(gen_random_uuid()).primaryKey().notNull(),
	tableName: varchar("table_name", { length: 100 }).notNull(),
	retentionYears: integer("retention_years").notNull(),
	description: text(),
	legalBasis: text("legal_basis"),
	lastPurgeDate: timestamp("last_purge_date", { mode: 'string' }),
	nextPurgeDate: timestamp("next_purge_date", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const auditLog = pgTable("audit_log", {
	logId: varchar("log_id").default(gen_random_uuid()).primaryKey().notNull(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: varchar("entity_id", { length: 255 }).notNull(),
	userId: varchar("user_id"),
	changes: jsonb().notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	hashChain: varchar("hash_chain", { length: 255 }).notNull(),
	signature: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_audit_log_entity").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("idx_audit_log_event_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("idx_audit_log_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
	index("idx_audit_log_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_log_user_id_users_id_fk"
		}),
]);

export const complianceAlerts = pgTable("compliance_alerts", {
	alertId: varchar("alert_id").default(gen_random_uuid()).primaryKey().notNull(),
	type: varchar({ length: 50 }).notNull(),
	severity: varchar({ length: 20 }).notNull(),
	employeeId: varchar("employee_id"),
	propertyId: varchar("property_id"),
	message: text().notNull(),
	details: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: varchar("resolved_by"),
	resolutionNotes: text("resolution_notes"),
}, (table) => [
	index("idx_compliance_alerts_created").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_compliance_alerts_employee").using("btree", table.employeeId.asc().nullsLast().op("text_ops")),
	index("idx_compliance_alerts_severity").using("btree", table.severity.asc().nullsLast().op("text_ops")),
	index("idx_compliance_alerts_unresolved").using("btree", table.resolvedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "compliance_alerts_employee_id_employees_employee_id_fk"
		}),
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "compliance_alerts_property_id_properties_property_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [users.id],
			name: "compliance_alerts_resolved_by_users_id_fk"
		}),
]);

export const erganiSubmissionLog = pgTable("ergani_submission_log", {
	submissionId: varchar("submission_id").default(gen_random_uuid()).primaryKey().notNull(),
	eventId: varchar("event_id").notNull(),
	submissionOrder: integer("submission_order").notNull(),
	idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
	status: varchar({ length: 20 }).notNull(),
	erganiId: varchar("ergani_id", { length: 255 }),
	errorCode: varchar("error_code", { length: 100 }),
	errorMessage: text("error_message"),
	retryCount: integer("retry_count").default(0),
	requestPayload: jsonb("request_payload").notNull(),
	responsePayload: jsonb("response_payload"),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow(),
	lastAttemptAt: timestamp("last_attempt_at", { mode: 'string' }).defaultNow(),
	receiptStored: boolean("receipt_stored").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ergani_submission_event").using("btree", table.eventId.asc().nullsLast().op("text_ops")),
	index("idx_ergani_submission_order").using("btree", table.submissionOrder.asc().nullsLast().op("int4_ops")),
	index("idx_ergani_submission_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_ergani_submission_timestamp").using("btree", table.submittedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [punchEvents.eventId],
			name: "ergani_submission_log_event_id_punch_events_event_id_fk"
		}),
	unique("ergani_submission_log_idempotency_key_unique").on(table.idempotencyKey),
]);

export const analyticsMetrics = pgTable("analytics_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	metricType: varchar("metric_type").notNull(),
	employeeId: varchar("employee_id"),
	propertyId: varchar("property_id").notNull(),
	department: varchar(),
	metricDate: timestamp("metric_date", { mode: 'string' }).notNull(),
	value: numeric().notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const complianceKpis = pgTable("compliance_kpis", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id").notNull(),
	kpiDate: timestamp("kpi_date", { mode: 'string' }).notNull(),
	erganiSubmissionSuccess: numeric("ergani_submission_success").notNull(),
	erganiExceptionRate: numeric("ergani_exception_rate").notNull(),
	maxHoursViolations: integer("max_hours_violations").notNull(),
	restPeriodViolations: integer("rest_period_violations").notNull(),
	digitalCardCompliance: numeric("digital_card_compliance").notNull(),
	dataRetentionCompliance: numeric("data_retention_compliance").notNull(),
	overallScore: numeric("overall_score").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const laborCostForecast = pgTable("labor_cost_forecast", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id").notNull(),
	department: varchar().notNull(),
	forecastDate: timestamp("forecast_date", { mode: 'string' }).notNull(),
	scheduledHours: numeric("scheduled_hours").notNull(),
	projectedHours: numeric("projected_hours").notNull(),
	baseLaborCost: numeric("base_labor_cost").notNull(),
	overtimeCost: numeric("overtime_cost").notNull(),
	totalCost: numeric("total_cost").notNull(),
	variancePercentage: numeric("variance_percentage").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const liveOccupancy = pgTable("live_occupancy", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	propertyId: varchar("property_id").notNull(),
	department: varchar().notNull(),
	status: varchar().notNull(),
	lastPunchTime: timestamp("last_punch_time", { mode: 'string' }).notNull(),
	shiftStart: timestamp("shift_start", { mode: 'string' }),
	expectedShiftEnd: timestamp("expected_shift_end", { mode: 'string' }),
	location: varchar(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const successMetricAlerts = pgTable("success_metric_alerts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id").notNull(),
	metricType: varchar("metric_type").notNull(),
	alertLevel: varchar("alert_level").notNull(),
	threshold: numeric().notNull(),
	actualValue: numeric("actual_value").notNull(),
	message: text().notNull(),
	isResolved: boolean("is_resolved").default(false).notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolvedBy: varchar("resolved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const successMetrics = pgTable("success_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id").notNull(),
	metricDate: timestamp("metric_date", { mode: 'string' }).notNull(),
	payPeriodStart: timestamp("pay_period_start", { mode: 'string' }).notNull(),
	payPeriodEnd: timestamp("pay_period_end", { mode: 'string' }).notNull(),
	erganiSubmissionTotal: integer("ergani_submission_total").default(0).notNull(),
	erganiSubmissionSuccess: integer("ergani_submission_success").default(0).notNull(),
	erganiSubmissionRate: numeric("ergani_submission_rate").default('0').notNull(),
	totalExceptions: integer("total_exceptions").default(0).notNull(),
	resolvedExceptions: integer("resolved_exceptions").default(0).notNull(),
	unresolvedExceptions: integer("unresolved_exceptions").default(0).notNull(),
	unresolvedExceptionRate: numeric("unresolved_exception_rate").default('0').notNull(),
	totalPunches: integer("total_punches").default(0).notNull(),
	geoVerifiedPunches: integer("geo_verified_punches").default(0).notNull(),
	geoVerificationRate: numeric("geo_verification_rate").default('0').notNull(),
	manualPayrollEntries: integer("manual_payroll_entries").default(0).notNull(),
	scheduledOvertimeHours: numeric("scheduled_overtime_hours").default('0').notNull(),
	actualOvertimeHours: numeric("actual_overtime_hours").default('0').notNull(),
	overtimeVariance: numeric("overtime_variance").default('0').notNull(),
	overtimePolicyCompliance: boolean("overtime_policy_compliance").default(true).notNull(),
	auditPackGenerationTime: integer("audit_pack_generation_time").default(0).notNull(),
	auditPackSize: integer("audit_pack_size").default(0).notNull(),
	auditPackSuccess: boolean("audit_pack_success").default(true).notNull(),
	overallComplianceScore: numeric("overall_compliance_score").default('0').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const wageComponents = pgTable("wage_components", {
	componentId: varchar("component_id").default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	baseSalary: varchar("base_salary").notNull(),
	hourlyRate: varchar("hourly_rate"),
	foodAllowance: varchar("food_allowance").default('0.00'),
	housingAllowance: varchar("housing_allowance").default('0.00'),
	transportAllowance: varchar("transport_allowance").default('0.00'),
	marriageAllowance: varchar("marriage_allowance").default('0.00'),
	familyAllowance: varchar("family_allowance").default('0.00'),
	educationAllowance: varchar("education_allowance").default('0.00'),
	experienceAllowance: varchar("experience_allowance").default('0.00'),
	positionAllowance: varchar("position_allowance").default('0.00'),
	uniformAllowance: varchar("uniform_allowance").default('0.00'),
	tipsEligible: boolean("tips_eligible").default(false),
	tipsPoolPercentage: varchar("tips_pool_percentage").default('0.00'),
	perDiemRate: varchar("per_diem_rate").default('0.00'),
	overtimeEligible: boolean("overtime_eligible").default(true),
	overtimeTier1Rate: varchar("overtime_tier1_rate").default('1.25'),
	overtimeTier2Rate: varchar("overtime_tier2_rate").default('1.50'),
	overtimeTier3Rate: varchar("overtime_tier3_rate").default('1.75'),
	nightPremiumRate: varchar("night_premium_rate").default('0.25'),
	sundayPremiumRate: varchar("sunday_premium_rate").default('0.75'),
	holidayPremiumRate: varchar("holiday_premium_rate").default('1.00'),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "wage_components_employee_id_fkey"
		}).onDelete("cascade"),
]);

export const departments = pgTable("departments", {
	departmentId: varchar("department_id").default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id"),
	name: varchar().notNull(),
	description: text(),
	departmentCode: varchar("department_code", { length: 10 }),
	managerEmployeeId: varchar("manager_employee_id"),
	costCenterCode: varchar("cost_center_code", { length: 20 }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "departments_property_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.managerEmployeeId],
			foreignColumns: [employees.employeeId],
			name: "departments_manager_employee_id_fkey"
		}).onDelete("set null"),
	unique("departments_department_code_key").on(table.departmentCode),
]);

export const payrollRules = pgTable("payroll_rules", {
	ruleId: varchar("rule_id").default(gen_random_uuid()).primaryKey().notNull(),
	ruleName: varchar("rule_name", { length: 100 }).notNull(),
	version: varchar({ length: 20 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	priority: integer().default(100),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	ruleDefinition: jsonb("rule_definition").notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payroll_rules_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_payroll_rules_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_payroll_rules_effective").using("btree", table.effectiveFrom.asc().nullsLast().op("date_ops"), table.effectiveTo.asc().nullsLast().op("date_ops")),
	unique("payroll_rules_rule_name_version_key").on(table.ruleName, table.version),
]);

export const notifications = pgTable("notifications", {
	notificationId: varchar("notification_id").default(gen_random_uuid()).primaryKey().notNull(),
	type: varchar().notNull(),
	title: varchar().notNull(),
	message: text().notNull(),
	category: varchar().notNull(),
	priority: varchar().default('medium').notNull(),
	userId: varchar("user_id"),
	employeeId: varchar("employee_id"),
	propertyId: varchar("property_id"),
	relatedEntityType: varchar("related_entity_type"),
	relatedEntityId: varchar("related_entity_id"),
	channels: text(),
	actionRequired: boolean("action_required").default(false),
	actionType: varchar("action_type"),
	actionData: text("action_data"),
	actionUrl: varchar("action_url"),
	status: varchar().default('pending'),
	readAt: timestamp("read_at", { mode: 'string' }),
	actedAt: timestamp("acted_at", { mode: 'string' }),
	actionBy: varchar("action_by"),
	actionResult: varchar("action_result"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
	userId: varchar("user_id").primaryKey().notNull(),
	slackEnabled: boolean("slack_enabled").default(false),
	slackChannelId: varchar("slack_channel_id"),
	teamsEnabled: boolean("teams_enabled").default(false),
	teamsWebhookUrl: varchar("teams_webhook_url"),
	emailEnabled: boolean("email_enabled").default(true),
	smsEnabled: boolean("sms_enabled").default(false),
	phoneNumber: varchar("phone_number"),
	overtimeApprovals: text("overtime_approvals"),
	erganiAlerts: text("ergani_alerts"),
	complianceAlerts: text("compliance_alerts"),
	payrollDigests: text("payroll_digests"),
	quietHoursStart: varchar("quiet_hours_start").default('22:00'),
	quietHoursEnd: varchar("quiet_hours_end").default('08:00'),
	timezone: varchar().default('Europe/Athens'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const integrationLogs = pgTable("integration_logs", {
	logId: varchar("log_id").default(gen_random_uuid()).primaryKey().notNull(),
	integration: varchar().notNull(),
	action: varchar().notNull(),
	requestPayload: text("request_payload"),
	responsePayload: text("response_payload"),
	status: varchar().notNull(),
	duration: integer().default(0),
	notificationId: varchar("notification_id"),
	userId: varchar("user_id"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const jobPostingSalaryRanges = pgTable("job_posting_salary_ranges", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id").notNull(),
	jobTitle: varchar("job_title", { length: 255 }).notNull(),
	departmentId: varchar("department_id"),
	minSalary: numeric("min_salary", { precision: 10, scale:  2 }).notNull(),
	maxSalary: numeric("max_salary", { precision: 10, scale:  2 }).notNull(),
	salaryBasis: varchar("salary_basis", { length: 20 }).notNull(),
	currency: varchar({ length: 3 }).default('EUR'),
	benefitsDescription: text("benefits_description"),
	payFactors: jsonb("pay_factors").default([]),
	isActive: boolean("is_active").default(true),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "job_posting_salary_ranges_property_id_fkey"
		}),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.departmentId],
			name: "job_posting_salary_ranges_department_id_fkey"
		}),
]);

export const paycheckHistory = pgTable("paycheck_history", {
	paycheckId: varchar("paycheck_id").default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	payPeriodStart: date("pay_period_start").notNull(),
	payPeriodEnd: date("pay_period_end").notNull(),
	payDate: date("pay_date").notNull(),
	grossPay: numeric("gross_pay", { precision: 10, scale:  2 }).notNull(),
	netPay: numeric("net_pay", { precision: 10, scale:  2 }).notNull(),
	taxWithheld: numeric("tax_withheld", { precision: 10, scale:  2 }).default('0'),
	efkaContributions: numeric("efka_contributions", { precision: 10, scale:  2 }).default('0'),
	solidarityTax: numeric("solidarity_tax", { precision: 10, scale:  2 }).default('0'),
	otherDeductions: numeric("other_deductions", { precision: 10, scale:  2 }).default('0'),
	payslipData: jsonb("payslip_data"),
	status: varchar().default('paid'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "paycheck_history_employee_id_fkey"
		}),
]);

export const digitalWorkCardLogs = pgTable("digital_work_card_logs", {
	logId: varchar("log_id").default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	workDate: date("work_date").notNull(),
	clockInTime: timestamp("clock_in_time", { mode: 'string' }),
	clockOutTime: timestamp("clock_out_time", { mode: 'string' }),
	totalHours: numeric("total_hours", { precision: 5, scale:  2 }),
	breakMinutes: integer("break_minutes").default(0),
	overtimeHours: numeric("overtime_hours", { precision: 5, scale:  2 }).default('0'),
	location: varchar(),
	clockMethod: varchar("clock_method"),
	gpsCoordinates: varchar("gps_coordinates"),
	deviceInfo: jsonb("device_info"),
	erganiSyncStatus: varchar("ergani_sync_status").default('pending'),
	erganiSubmissionId: varchar("ergani_submission_id"),
	notes: text(),
	status: varchar().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "digital_work_card_logs_employee_id_fkey"
		}),
]);

export const timeCorrectionRequests = pgTable("time_correction_requests", {
	requestId: varchar("request_id").default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	workCardLogId: varchar("work_card_log_id"),
	requestType: varchar("request_type").notNull(),
	originalValue: varchar("original_value"),
	requestedValue: varchar("requested_value").notNull(),
	reason: text().notNull(),
	photoEvidence: varchar("photo_evidence"),
	location: varchar(),
	submittedVia: varchar("submitted_via").default('mobile'),
	managerNotes: text("manager_notes"),
	status: varchar().default('pending'),
	reviewedBy: varchar("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "time_correction_requests_employee_id_fkey"
		}),
	foreignKey({
			columns: [table.workCardLogId],
			foreignColumns: [digitalWorkCardLogs.logId],
			name: "time_correction_requests_work_card_log_id_fkey"
		}),
]);

export const laborNewsfeedItems = pgTable("labor_newsfeed_items", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	externalId: varchar("external_id", { length: 100 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	headline: text().notNull(),
	summary: text().notNull(),
	source: varchar({ length: 255 }).notNull(),
	sourceUrl: text("source_url").notNull(),
	publishedDate: date("published_date").notNull(),
	lastChecked: timestamp("last_checked", { mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true),
	needsReview: boolean("needs_review").default(false),
	reviewReason: text("review_reason"),
	aiSummaryHash: varchar("ai_summary_hash", { length: 64 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("labor_newsfeed_items_external_id_key").on(table.externalId),
]);

export const laborNewsfeedCitations = pgTable("labor_newsfeed_citations", {
	id: serial().primaryKey().notNull(),
	newsItemId: varchar("news_item_id").notNull(),
	citationId: varchar("citation_id", { length: 50 }).notNull(),
	sourceType: varchar("source_type", { length: 50 }).notNull(),
	sourceDescription: text("source_description"),
	sourceUrl: text("source_url"),
	isVerified: boolean("is_verified").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.newsItemId],
			foreignColumns: [laborNewsfeedItems.id],
			name: "labor_newsfeed_citations_news_item_id_fkey"
		}).onDelete("cascade"),
]);

export const laborNewsfeedConfig = pgTable("labor_newsfeed_config", {
	id: serial().primaryKey().notNull(),
	refreshIntervalMinutes: integer("refresh_interval_minutes").default(240),
	lastRefresh: timestamp("last_refresh", { mode: 'string' }),
	nextRefresh: timestamp("next_refresh", { mode: 'string' }),
	maxItems: integer("max_items").default(6),
	isEnabled: boolean("is_enabled").default(true),
	aiModel: varchar("ai_model", { length: 50 }).default('gpt-4o'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const payEquityAnalysis = pgTable("pay_equity_analysis", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id").notNull(),
	analysisDate: date("analysis_date").notNull(),
	analysisType: varchar("analysis_type", { length: 50 }).notNull(),
	jobCategory: varchar("job_category", { length: 100 }),
	departmentId: varchar("department_id"),
	maleEmployees: integer("male_employees").default(0),
	femaleEmployees: integer("female_employees").default(0),
	otherGenderEmployees: integer("other_gender_employees").default(0),
	maleAvgSalary: numeric("male_avg_salary", { precision: 10, scale:  2 }),
	femaleAvgSalary: numeric("female_avg_salary", { precision: 10, scale:  2 }),
	otherAvgSalary: numeric("other_avg_salary", { precision: 10, scale:  2 }),
	genderPayGapPercent: numeric("gender_pay_gap_percent", { precision: 5, scale:  2 }),
	medianMaleSalary: numeric("median_male_salary", { precision: 10, scale:  2 }),
	medianFemaleSalary: numeric("median_female_salary", { precision: 10, scale:  2 }),
	adjustedPayGap: numeric("adjusted_pay_gap", { precision: 5, scale:  2 }),
	analysisMethodology: text("analysis_methodology"),
	controlFactors: jsonb("control_factors").default([]),
	complianceStatus: varchar("compliance_status", { length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "pay_equity_analysis_property_id_fkey"
		}),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.departmentId],
			name: "pay_equity_analysis_department_id_fkey"
		}),
]);

export const payTransparencyRequests = pgTable("pay_transparency_requests", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	requestType: varchar("request_type", { length: 50 }).notNull(),
	requestDate: timestamp("request_date", { mode: 'string' }).defaultNow(),
	requestDetails: text("request_details").notNull(),
	status: varchar({ length: 20 }).default('pending'),
	responseDeadline: timestamp("response_deadline", { mode: 'string' }).notNull(),
	responseDate: timestamp("response_date", { mode: 'string' }),
	responseDetails: text("response_details"),
	responseDocuments: jsonb("response_documents").default([]),
	handledBy: varchar("handled_by"),
	rejectionReason: text("rejection_reason"),
	followUpRequired: boolean("follow_up_required").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "pay_transparency_requests_employee_id_fkey"
		}),
]);

export const payDecisionExplanations = pgTable("pay_decision_explanations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	employeeId: varchar("employee_id").notNull(),
	decisionType: varchar("decision_type", { length: 50 }).notNull(),
	decisionDate: date("decision_date").notNull(),
	oldSalary: numeric("old_salary", { precision: 10, scale:  2 }),
	newSalary: numeric("new_salary", { precision: 10, scale:  2 }).notNull(),
	salaryChange: numeric("salary_change", { precision: 10, scale:  2 }),
	performanceRating: varchar("performance_rating", { length: 20 }),
	experienceYears: numeric("experience_years", { precision: 4, scale:  1 }),
	educationLevel: varchar("education_level", { length: 50 }),
	skillsAssessment: jsonb("skills_assessment").default({}),
	marketComparison: numeric("market_comparison", { precision: 10, scale:  2 }),
	explanation: text().notNull(),
	contributingFactors: jsonb("contributing_factors").default([]),
	comparisonGroup: varchar("comparison_group", { length: 100 }),
	approvedBy: varchar("approved_by").notNull(),
	hrReviewed: boolean("hr_reviewed").default(false),
	auditTrail: jsonb("audit_trail").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "pay_decision_explanations_employee_id_fkey"
		}),
]);

export const payEquityCompliance = pgTable("pay_equity_compliance", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id").notNull(),
	transpositionDeadline: date("transposition_deadline").default('2026-06-07').notNull(),
	nextReportingDeadline: date("next_reporting_deadline"),
	readinessScore: numeric("readiness_score", { precision: 5, scale:  2 }).default('0'),
	lastAssessmentDate: timestamp("last_assessment_date", { mode: 'string' }),
	salaryRangesPublished: boolean("salary_ranges_published").default(false),
	genderPayGapReported: boolean("gender_pay_gap_reported").default(false),
	payTransparencyPolicyActive: boolean("pay_transparency_policy_active").default(false),
	rightToInfoProcessActive: boolean("right_to_info_process_active").default(false),
	payDecisionsCriteriaPublished: boolean("pay_decisions_criteria_published").default(false),
	lastGenderPayGapReport: date("last_gender_pay_gap_report"),
	employeeCount: integer("employee_count").default(0),
	reportingThresholdMet: boolean("reporting_threshold_met").default(false),
	outstandingActions: jsonb("outstanding_actions").default([]),
	complianceNotes: text("compliance_notes"),
	riskLevel: varchar("risk_level", { length: 20 }).default('medium'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "pay_equity_compliance_property_id_fkey"
		}),
]);

export const csrdReportingPeriods = pgTable("csrd_reporting_periods", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	propertyId: varchar("property_id").notNull(),
	reportingYear: integer("reporting_year").notNull(),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	esrsVersion: varchar("esrs_version", { length: 20 }).default('1.0'),
	implementationWave: integer("implementation_wave").default(1),
	stopTheClockApplied: boolean("stop_the_clock_applied").default(false),
	materialityAssessmentDate: date("materiality_assessment_date"),
	s1WorkforceMaterial: boolean("s1_workforce_material").default(true),
	materialityJustification: text("materiality_justification"),
	reportingStatus: varchar("reporting_status", { length: 20 }).default('draft'),
	submissionDate: timestamp("submission_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.propertyId],
			foreignColumns: [properties.propertyId],
			name: "csrd_reporting_periods_property_id_fkey"
		}),
]);

export const s1WorkforceCharacteristics = pgTable("s1_workforce_characteristics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	measurementDate: date("measurement_date").notNull(),
	totalEmployees: integer("total_employees").notNull(),
	totalFte: numeric("total_fte", { precision: 8, scale:  2 }).notNull(),
	nonEmployeeWorkers: integer("non_employee_workers").default(0),
	employeesMale: integer("employees_male").default(0),
	employeesFemale: integer("employees_female").default(0),
	employeesNonBinary: integer("employees_non_binary").default(0),
	employeesUndisclosed: integer("employees_undisclosed").default(0),
	employeesUnder30: integer("employees_under_30").default(0),
	employees30To50: integer("employees_30_to_50").default(0),
	employeesOver50: integer("employees_over_50").default(0),
	permanentContracts: integer("permanent_contracts").default(0),
	temporaryContracts: integer("temporary_contracts").default(0),
	partTimeEmployees: integer("part_time_employees").default(0),
	fullTimeEmployees: integer("full_time_employees").default(0),
	employeesEu: integer("employees_eu").default(0),
	employeesNonEu: integer("employees_non_eu").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "s1_workforce_characteristics_reporting_period_id_fkey"
		}),
]);

export const s1TurnoverMetrics = pgTable("s1_turnover_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	totalLeavers: integer("total_leavers").notNull(),
	voluntaryLeavers: integer("voluntary_leavers").default(0),
	involuntaryLeavers: integer("involuntary_leavers").default(0),
	turnoverRate: numeric("turnover_rate", { precision: 5, scale:  2 }).notNull(),
	leaversMale: integer("leavers_male").default(0),
	leaversFemale: integer("leavers_female").default(0),
	leaversNonBinary: integer("leavers_non_binary").default(0),
	leaversUnder30: integer("leavers_under_30").default(0),
	leavers30To50: integer("leavers_30_to_50").default(0),
	leaversOver50: integer("leavers_over_50").default(0),
	totalHires: integer("total_hires").default(0),
	hireMale: integer("hire_male").default(0),
	hireFemale: integer("hire_female").default(0),
	hireRate: numeric("hire_rate", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "s1_turnover_metrics_reporting_period_id_fkey"
		}),
]);

export const s1CollectiveBargaining = pgTable("s1_collective_bargaining", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	employeesCoveredByAgreements: integer("employees_covered_by_agreements").notNull(),
	coveragePercentage: numeric("coverage_percentage", { precision: 5, scale:  2 }).notNull(),
	activeAgreements: integer("active_agreements").default(0),
	agreementTypes: jsonb("agreement_types").default([]),
	workersRepresentationExists: boolean("workers_representation_exists").default(false),
	consultationProcesses: jsonb("consultation_processes").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "s1_collective_bargaining_reporting_period_id_fkey"
		}),
]);

export const s1HealthSafetyIncidents = pgTable("s1_health_safety_incidents", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	incidentDate: date("incident_date").notNull(),
	incidentType: varchar("incident_type", { length: 50 }).notNull(),
	severity: varchar({ length: 20 }).notNull(),
	affectedWorkerType: varchar("affected_worker_type", { length: 30 }).notNull(),
	workerGender: varchar("worker_gender", { length: 20 }),
	workerAge: integer("worker_age"),
	location: varchar({ length: 100 }).notNull(),
	department: varchar({ length: 100 }),
	incidentDescription: text("incident_description"),
	rootCause: text("root_cause"),
	workDaysLost: integer("work_days_lost").default(0),
	medicalTreatmentRequired: boolean("medical_treatment_required").default(false),
	correctiveActions: text("corrective_actions"),
	preventiveActions: text("preventive_actions"),
	investigationCompleted: boolean("investigation_completed").default(false),
	reportedToAuthorities: boolean("reported_to_authorities").default(false),
	reportingDate: date("reporting_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "s1_health_safety_incidents_reporting_period_id_fkey"
		}),
]);

export const s1TrainingMetrics = pgTable("s1_training_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	employeeId: varchar("employee_id"),
	trainingType: varchar("training_type", { length: 50 }).notNull(),
	trainingHours: numeric("training_hours", { precision: 6, scale:  2 }).notNull(),
	trainingCost: numeric("training_cost", { precision: 10, scale:  2 }),
	participantGender: varchar("participant_gender", { length: 20 }),
	participantAge: integer("participant_age"),
	participantLevel: varchar("participant_level", { length: 30 }),
	completionStatus: varchar("completion_status", { length: 20 }).default('completed'),
	competencyGained: boolean("competency_gained").default(false),
	trainingDate: date("training_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "s1_training_metrics_reporting_period_id_fkey"
		}),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.employeeId],
			name: "s1_training_metrics_employee_id_fkey"
		}),
]);

export const s1WorkLifeBalance = pgTable("s1_work_life_balance", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	employeesEligibleMaternityLeave: integer("employees_eligible_maternity_leave").default(0),
	employeesEligiblePaternityLeave: integer("employees_eligible_paternity_leave").default(0),
	employeesEligibleParentalLeave: integer("employees_eligible_parental_leave").default(0),
	employeesEligibleFlexibleWork: integer("employees_eligible_flexible_work").default(0),
	maternityLeaveTaken: integer("maternity_leave_taken").default(0),
	paternityLeaveTaken: integer("paternity_leave_taken").default(0),
	parentalLeaveTaken: integer("parental_leave_taken").default(0),
	employeesRemoteWork: integer("employees_remote_work").default(0),
	employeesFlexibleHours: integer("employees_flexible_hours").default(0),
	employeesJobSharing: integer("employees_job_sharing").default(0),
	returnRateAfterMaternityLeave: numeric("return_rate_after_maternity_leave", { precision: 5, scale:  2 }),
	returnRateAfterParentalLeave: numeric("return_rate_after_parental_leave", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "s1_work_life_balance_reporting_period_id_fkey"
		}),
]);

export const s1PayMetrics = pgTable("s1_pay_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	highestPaidIndividualTotal: numeric("highest_paid_individual_total", { precision: 12, scale:  2 }).notNull(),
	medianEmployeeCompensation: numeric("median_employee_compensation", { precision: 10, scale:  2 }).notNull(),
	ceoPayRatio: numeric("ceo_pay_ratio", { precision: 8, scale:  2 }).notNull(),
	maleGrossHourlyPay: numeric("male_gross_hourly_pay", { precision: 8, scale:  2 }).notNull(),
	femaleGrossHourlyPay: numeric("female_gross_hourly_pay", { precision: 8, scale:  2 }).notNull(),
	genderPayGapPercentage: numeric("gender_pay_gap_percentage", { precision: 5, scale:  2 }).notNull(),
	calculationMethodology: text("calculation_methodology").notNull(),
	contextualFactors: text("contextual_factors"),
	nonBinaryGrossHourlyPay: numeric("non_binary_gross_hourly_pay", { precision: 8, scale:  2 }),
	payEquityActions: jsonb("pay_equity_actions").default([]),
	calculationDate: date("calculation_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "s1_pay_metrics_reporting_period_id_fkey"
		}),
]);

export const csrdAuditTrail = pgTable("csrd_audit_trail", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	auditDate: timestamp("audit_date", { mode: 'string' }).defaultNow(),
	auditType: varchar("audit_type", { length: 30 }).notNull(),
	tableName: varchar("table_name", { length: 100 }),
	recordId: varchar("record_id"),
	dataSource: varchar("data_source", { length: 100 }).notNull(),
	calculationMethod: text("calculation_method"),
	inputParameters: jsonb("input_parameters").default({}),
	oldValue: jsonb("old_value"),
	newValue: jsonb("new_value"),
	changeReason: text("change_reason"),
	userId: varchar("user_id"),
	systemVersion: varchar("system_version", { length: 20 }),
	esrsVersion: varchar("esrs_version", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "csrd_audit_trail_reporting_period_id_fkey"
		}),
]);

export const csrdExportLog = pgTable("csrd_export_log", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportingPeriodId: varchar("reporting_period_id").notNull(),
	exportType: varchar("export_type", { length: 30 }).notNull(),
	exportFormat: varchar("export_format", { length: 10 }).default('json'),
	exportDate: timestamp("export_date", { mode: 'string' }).defaultNow(),
	s1MetricsIncluded: jsonb("s1_metrics_included").default([]),
	materialityApplied: boolean("materiality_applied").default(false),
	dataQualityScore: numeric("data_quality_score", { precision: 3, scale:  1 }),
	fileName: varchar("file_name", { length: 200 }),
	fileSizeBytes: integer("file_size_bytes"),
	checksum: varchar({ length: 64 }),
	esrsComplianceStatus: varchar("esrs_compliance_status", { length: 20 }).default('compliant'),
	validationErrors: jsonb("validation_errors").default([]),
	exportedBy: varchar("exported_by").notNull(),
	exportPurpose: varchar("export_purpose", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.reportingPeriodId],
			foreignColumns: [csrdReportingPeriods.id],
			name: "csrd_export_log_reporting_period_id_fkey"
		}),
]);

export const emailVerificationTokens = pgTable("email_verification_tokens", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	email: varchar().notNull(),
	token: varchar().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "email_verification_tokens_user_id_fkey"
		}).onDelete("cascade"),
	unique("email_verification_tokens_token_key").on(table.token),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	token: varchar().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_fkey"
		}).onDelete("cascade"),
	unique("password_reset_tokens_token_key").on(table.token),
]);

export const magicLinkTokens = pgTable("magic_link_tokens", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	email: varchar().notNull(),
	token: varchar().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean().default(false),
	ipAddress: varchar("ip_address"),
	userAgent: varchar("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("magic_link_tokens_token_key").on(table.token),
]);

export const userSessions = pgTable("user_sessions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	sessionToken: varchar("session_token").notNull(),
	refreshToken: varchar("refresh_token"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	refreshExpiresAt: timestamp("refresh_expires_at", { mode: 'string' }),
	ipAddress: varchar("ip_address"),
	userAgent: varchar("user_agent"),
	deviceFingerprint: varchar("device_fingerprint"),
	lastActivityAt: timestamp("last_activity_at", { mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_sessions_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_sessions_session_token_key").on(table.sessionToken),
	unique("user_sessions_refresh_token_key").on(table.refreshToken),
]);

export const authAuditLogs = pgTable("auth_audit_logs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	sessionId: varchar("session_id"),
	action: varchar().notNull(),
	method: varchar(),
	result: varchar().notNull(),
	ipAddress: varchar("ip_address"),
	userAgent: varchar("user_agent"),
	metadata: jsonb(),
	riskScore: integer("risk_score"),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "auth_audit_logs_user_id_fkey"
		}).onDelete("set null"),
]);

export const cbaPacks = pgTable("cba_packs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar().notNull(),
	sector: varchar().notNull(),
	authorityRef: varchar("authority_ref"),
	effectiveFrom: date("effective_from"),
	effectiveTo: date("effective_to"),
	version: varchar(),
	docHash: varchar("doc_hash"),
	status: varchar().default('draft'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const wageTables = pgTable("wage_tables", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	packId: varchar("pack_id").notNull(),
	category: varchar().notNull(),
	grade: varchar().notNull(),
	seniorityStep: integer("seniority_step").default(0),
	baseMonthly: numeric("base_monthly", { precision: 10, scale:  2 }),
	baseDaily: numeric("base_daily", { precision: 10, scale:  2 }),
	baseHourly: numeric("base_hourly", { precision: 10, scale:  2 }),
	unit: varchar(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.packId],
			foreignColumns: [cbaPacks.id],
			name: "wage_tables_pack_id_fkey"
		}).onDelete("cascade"),
]);

export const packAssignments = pgTable("pack_assignments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	packId: varchar("pack_id").notNull(),
	propertyId: varchar("property_id").notNull(),
	assignedBy: varchar("assigned_by").notNull(),
	priority: integer().default(0),
	effectiveFrom: timestamp("effective_from", { mode: 'string' }).defaultNow(),
	effectiveTo: timestamp("effective_to", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.packId],
			foreignColumns: [cbaPacks.id],
			name: "pack_assignments_pack_id_fkey"
		}),
]);

export const premiumRules = pgTable("premium_rules", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	packId: varchar("pack_id").notNull(),
	code: varchar().notNull(),
	name: varchar().notNull(),
	rateType: varchar("rate_type"),
	value: numeric({ precision: 10, scale:  4 }),
	bands: jsonb(),
	stackable: boolean().default(true),
	appliesTo: varchar("applies_to"),
	priority: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.packId],
			foreignColumns: [cbaPacks.id],
			name: "premium_rules_pack_id_fkey"
		}).onDelete("cascade"),
]);

export const calcProvenance = pgTable("calc_provenance", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
});

export const schedulingConstraints = pgTable("scheduling_constraints", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	packId: varchar("pack_id").notNull(),
	maxHoursDay: integer("max_hours_day"),
	maxHoursWeekAvg: integer("max_hours_week_avg"),
	restMinHours: integer("rest_min_hours"),
	weeklyRest: integer("weekly_rest"),
	splitShift: varchar("split_shift"),
	breakMinMinutes: integer("break_min_minutes"),
	sixthDay: varchar("sixth_day"),
	specialRules: jsonb("special_rules"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.packId],
			foreignColumns: [cbaPacks.id],
			name: "scheduling_constraints_pack_id_fkey"
		}).onDelete("cascade"),
]);

export const erganiProfiles = pgTable("ergani_profiles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	packId: varchar("pack_id").notNull(),
	eventMap: jsonb("event_map"),
	requiredLeadTimes: jsonb("required_lead_times"),
	reasonCodes: jsonb("reason_codes"),
	documentTemplates: jsonb("document_templates"),
	autoSubmission: boolean("auto_submission").default(false),
	validationRules: jsonb("validation_rules"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.packId],
			foreignColumns: [cbaPacks.id],
			name: "ergani_profiles_pack_id_fkey"
		}).onDelete("cascade"),
]);

export const tipPolicies = pgTable("tip_policies", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	packId: varchar("pack_id").notNull(),
	poolSource: varchar("pool_source"),
	sourcePercentage: numeric("source_percentage", { precision: 5, scale:  2 }),
	distributionMethod: varchar("distribution_method"),
	rolePoints: jsonb("role_points"),
	employerTopup: numeric("employer_topup", { precision: 5, scale:  2 }),
	taxMapping: jsonb("tax_mapping"),
	contribMapping: jsonb("contrib_mapping"),
	payoutFrequency: varchar("payout_frequency"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.packId],
			foreignColumns: [cbaPacks.id],
			name: "tip_policies_pack_id_fkey"
		}).onDelete("cascade"),
]);

export const packOverrides = pgTable("pack_overrides", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	packId: varchar("pack_id").notNull(),
	propertyId: varchar("property_id"),
	ruleType: varchar("rule_type"),
	ruleId: varchar("rule_id"),
	overrideData: jsonb("override_data"),
	reason: text(),
	approvedBy: varchar("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.packId],
			foreignColumns: [cbaPacks.id],
			name: "pack_overrides_pack_id_fkey"
		}),
]);

export const allowanceRules = pgTable("allowance_rules", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	packId: varchar("pack_id").notNull(),
	code: varchar().notNull(),
	name: varchar().notNull(),
	calc: varchar(),
	amount: numeric({ precision: 10, scale:  2 }),
	cap: numeric({ precision: 10, scale:  2 }),
	taxTreatment: varchar("tax_treatment"),
	contributory: varchar(),
	conditions: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	percentage: numeric({ precision: 5, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.packId],
			foreignColumns: [cbaPacks.id],
			name: "allowance_rules_pack_id_fkey"
		}).onDelete("cascade"),
]);

export const severanceRules = pgTable("severance_rules", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	version: varchar().notNull(),
	effectiveFrom: timestamp("effective_from", { mode: 'string' }).notNull(),
	effectiveTo: timestamp("effective_to", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	bands: jsonb().notNull(),
	legalReference: varchar("legal_reference").notNull(),
	description: text(),
	descriptionGr: text("description_gr"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	createdBy: varchar("created_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	approvedBy: varchar("approved_by"),
}, (table) => [
	unique("severance_rules_version_key").on(table.version),
]);

export const webhookEvents = pgTable("webhook_events", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	eventType: varchar("event_type").notNull(),
	payload: jsonb(),
	status: varchar().default('pending'),
	retryCount: integer("retry_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
});

export const bankProfilesCanonical = pgTable("bank_profiles_canonical", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	painVersion: varchar("pain_version", { length: 20 }).notNull(),
	supportsInstant: boolean("supports_instant").notNull(),
	sctInstAmountLimit: integer("sct_inst_amount_limit"),
	cutoffs: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const userRoles = pgTable("user_roles", {
	id: varchar({ length: 50 }).default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	role: varchar({ length: 50 }).notNull(),
	propertyId: varchar("property_id", { length: 50 }),
	grantedBy: varchar("granted_by", { length: 255 }),
	grantedAt: timestamp("granted_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const employeeImportBatches = pgTable("employee_import_batches", {
	batchId: varchar("batch_id", { length: 50 }).default(gen_random_uuid()).primaryKey().notNull(),
	uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
	filename: varchar({ length: 255 }),
	totalRecords: integer("total_records").notNull(),
	processedRecords: integer("processed_records").default(0),
	successfulImports: integer("successful_imports").default(0),
	failedImports: integer("failed_imports").default(0),
	validationErrors: jsonb("validation_errors"),
	importData: jsonb("import_data").notNull(),
	status: varchar({ length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const userTrainingProgress = pgTable("user_training_progress", {
	id: varchar({ length: 50 }).default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	role: varchar({ length: 50 }).notNull(),
	moduleId: varchar("module_id", { length: 100 }).notNull(),
	moduleName: varchar("module_name", { length: 255 }).notNull(),
	completionPercentage: integer("completion_percentage").default(0),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	timeSpentMinutes: integer("time_spent_minutes").default(0),
	quizScore: integer("quiz_score"),
	certificationEarned: boolean("certification_earned").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const payrollImportBatches = pgTable("payroll_import_batches", {
	batchId: varchar("batch_id", { length: 50 }).default(gen_random_uuid()).primaryKey().notNull(),
	uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
	filename: varchar({ length: 255 }),
	payrollPeriod: varchar("payroll_period", { length: 20 }),
	propertyId: varchar("property_id", { length: 50 }),
	totalPayslips: integer("total_payslips").notNull(),
	processedPayslips: integer("processed_payslips").default(0),
	totalAmount: numeric("total_amount", { precision: 12, scale:  2 }),
	validationErrors: jsonb("validation_errors"),
	payrollData: jsonb("payroll_data").notNull(),
	status: varchar({ length: 20 }).default('pending'),
	importType: varchar("import_type", { length: 20 }).default('historical'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const testScenarios = pgTable("test_scenarios", {
	scenarioId: varchar("scenario_id", { length: 50 }).primaryKey().notNull(),
	testType: varchar("test_type", { length: 50 }).notNull(),
	description: text().notNull(),
	inputData: jsonb("input_data").notNull(),
	expectedOutput: jsonb("expected_output").notNull(),
	testStatus: varchar("test_status", { length: 20 }).default('pending'),
	actualOutput: jsonb("actual_output"),
	errorDetails: text("error_details"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const companies = pgTable("companies", {
	companyId: varchar("company_id", { length: 50 }).default(gen_random_uuid()).primaryKey().notNull(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	legalName: varchar("legal_name", { length: 255 }).notNull(),
	taxId: varchar("tax_id", { length: 20 }),
	registrationNumber: varchar("registration_number", { length: 50 }),
	industrySector: varchar("industry_sector", { length: 100 }),
	companySize: varchar("company_size", { length: 20 }),
	address: jsonb(),
	contactInfo: jsonb("contact_info"),
	billingInfo: jsonb("billing_info"),
	subscriptionPlan: varchar("subscription_plan", { length: 50 }).default('basic'),
	subscriptionStatus: varchar("subscription_status", { length: 20 }).default('active'),
	licenseLimits: jsonb("license_limits"),
	featureFlags: jsonb("feature_flags").default({}),
	timezone: varchar({ length: 50 }).default('Europe/Athens'),
	defaultCurrency: varchar("default_currency", { length: 3 }).default('EUR'),
	defaultLocale: varchar("default_locale", { length: 5 }).default('el'),
	gdprSettings: jsonb("gdpr_settings"),
	auditSettings: jsonb("audit_settings"),
	integrationSettings: jsonb("integration_settings"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("companies_tax_id_key").on(table.taxId),
]);

export const companyUsers = pgTable("company_users", {
	id: varchar({ length: 50 }).default(gen_random_uuid()).primaryKey().notNull(),
	companyId: varchar("company_id", { length: 50 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	role: varchar({ length: 50 }).notNull(),
	department: varchar({ length: 100 }),
	employeeId: varchar("employee_id", { length: 50 }),
	permissions: jsonb().default({}),
	accessLevel: varchar("access_level", { length: 20 }).default('standard'),
	propertyAccess: jsonb("property_access"),
	dateJoined: timestamp("date_joined", { mode: 'string' }).defaultNow(),
	lastActive: timestamp("last_active", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	invitedBy: varchar("invited_by", { length: 255 }),
	invitedAt: timestamp("invited_at", { mode: 'string' }),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.companyId],
			name: "company_users_company_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "company_users_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "company_users_invited_by_fkey"
		}),
	unique("company_users_company_id_user_id_key").on(table.companyId, table.userId),
]);

export const companyRoleTemplates = pgTable("company_role_templates", {
	id: varchar({ length: 50 }).default(gen_random_uuid()).primaryKey().notNull(),
	companyId: varchar("company_id", { length: 50 }).notNull(),
	roleName: varchar("role_name", { length: 50 }).notNull(),
	displayName: varchar("display_name", { length: 100 }).notNull(),
	description: text(),
	permissions: jsonb().notNull(),
	defaultAccessLevel: varchar("default_access_level", { length: 20 }).default('standard'),
	canInviteUsers: boolean("can_invite_users").default(false),
	canManageRoles: boolean("can_manage_roles").default(false),
	maxPropertiesAccess: integer("max_properties_access"),
	isSystemRole: boolean("is_system_role").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.companyId],
			name: "company_role_templates_company_id_fkey"
		}).onDelete("cascade"),
	unique("company_role_templates_company_id_role_name_key").on(table.companyId, table.roleName),
]);

export const dataAccessAudit = pgTable("data_access_audit", {
	id: varchar({ length: 50 }).default(gen_random_uuid()).primaryKey().notNull(),
	companyId: varchar("company_id", { length: 50 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	resourceType: varchar("resource_type", { length: 50 }).notNull(),
	resourceId: varchar("resource_id", { length: 50 }),
	accessedData: jsonb("accessed_data"),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	sessionId: varchar("session_id", { length: 255 }),
	success: boolean().default(true),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.companyId],
			name: "data_access_audit_company_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "data_access_audit_user_id_fkey"
		}),
]);
