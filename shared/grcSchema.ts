/**
 * GRC Schema Extension - ISO 27001 + SOC 2 Compliance
 * Extends the main schema with compliance-specific tables
 */

import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
// import { users } from "./schema"; // Disabled to avoid circular import issues

// Controls Framework (ISO 27001:2022 Annex A + SOC 2 TSC)
export const controlsFramework = pgTable('controls_framework', {
  id: varchar('id').primaryKey(),
  framework: varchar('framework', { length: 50 }).notNull(), // 'ISO27001', 'SOC2'
  domain: varchar('domain', { length: 100 }).notNull(), // 'A.5', 'A.6', 'CC6.1', etc.
  controlId: varchar('control_id', { length: 50 }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 100 }).notNull(), // 'Security', 'Availability', etc.
  riskLevel: varchar('risk_level', { length: 20 }).notNull(), // 'Critical', 'High', 'Medium', 'Low'
  automatable: boolean('automatable').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Statement of Applicability (SoA) - Tenant-specific control implementation
export const statementOfApplicability = pgTable('statement_of_applicability', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  controlId: varchar('control_id').references(() => controlsFramework.id),
  status: varchar('status', { length: 20 }).notNull(), // 'Applicable', 'NotApplicable', 'InProgress', 'Implemented'
  implementationStatus: varchar('implementation_status', { length: 20 }).notNull(), // 'NotStarted', 'InProgress', 'Implemented', 'Verified'
  justification: text('justification'),
  owner: varchar('owner'),
  targetDate: timestamp('target_date'),
  lastReviewed: timestamp('last_reviewed'),
  reviewedBy: varchar('reviewed_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Evidence Library with freshness SLAs
export const evidenceLibrary = pgTable('evidence_library', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  controlId: varchar('control_id').references(() => controlsFramework.id),
  evidenceType: varchar('evidence_type', { length: 50 }).notNull(), // 'Document', 'Screenshot', 'LogFile', 'AutomatedCheck', 'Configuration'
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  filePath: varchar('file_path'),
  contentHash: varchar('content_hash', { length: 64 }), // SHA-256 for immutability
  owner: varchar('owner'),
  collectedAt: timestamp('collected_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // Freshness SLA
  freshnessStatus: varchar('freshness_status', { length: 20 }).default('Fresh'), // 'Fresh', 'Warning', 'Expired'
  tags: text('tags').array(),
  metadata: jsonb('metadata'), // Additional evidence metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Automated Control Checks (Control-as-Code)
export const automatedChecks = pgTable('automated_checks', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  controlId: varchar('control_id').references(() => controlsFramework.id),
  checkName: varchar('check_name', { length: 200 }).notNull(),
  checkType: varchar('check_type', { length: 50 }).notNull(), // 'AWS', 'Azure', 'GCP', 'GitHub', 'Okta', 'Code', 'Endpoint'
  checkScript: text('check_script'), // The actual check logic/query
  schedule: varchar('schedule', { length: 50 }).default('daily'), // 'hourly', 'daily', 'weekly', 'monthly'
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  status: varchar('status', { length: 20 }).default('Active'), // 'Active', 'Disabled', 'Failed'
  createdBy: varchar('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Automated Check Results
export const checkResults = pgTable('check_results', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  checkId: varchar('check_id').references(() => automatedChecks.id),
  runId: varchar('run_id').notNull(), // Unique ID for each check run
  result: varchar('result', { length: 20 }).notNull(), // 'Pass', 'Fail', 'Warning', 'Error'
  score: integer('score'), // 0-100 compliance score
  findings: jsonb('findings'), // Detailed findings/violations
  evidence: jsonb('evidence'), // Auto-collected evidence
  executionTime: integer('execution_time'), // milliseconds
  runAt: timestamp('run_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Vulnerability & Pen-test Findings Management
export const vulnerabilityFindings = pgTable('vulnerability_findings', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  findingId: varchar('finding_id').unique().notNull(), // External pen-test tool ID
  source: varchar('source', { length: 50 }).notNull(), // 'PenTest', 'VulnScan', 'CodeScan', 'Manual'
  severity: varchar('severity', { length: 20 }).notNull(), // 'Critical', 'High', 'Medium', 'Low', 'Info'
  cvssScore: decimal('cvss_score', { precision: 3, scale: 1 }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  recommendation: text('recommendation'),
  affectedAssets: text('affected_assets').array(),
  status: varchar('status', { length: 20 }).default('Open'), // 'Open', 'InProgress', 'Resolved', 'Accepted', 'FalsePositive'
  assignee: varchar('assignee'),
  dueDate: timestamp('due_date'), // SLA-based
  discoveredAt: timestamp('discovered_at').notNull(),
  resolvedAt: timestamp('resolved_at'),
  retestRequested: boolean('retest_requested').default(false),
  retestCompletedAt: timestamp('retest_completed_at'),
  riskAcceptance: jsonb('risk_acceptance'), // Risk acceptance details if applicable
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Remediation Tracking
export const remediationTracking = pgTable('remediation_tracking', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  findingId: varchar('finding_id').references(() => vulnerabilityFindings.id),
  action: text('action').notNull(), // Remediation action taken
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'Code', 'Config', 'Policy', 'Process'
  evidence: jsonb('evidence'), // Proof of remediation
  performedBy: varchar('performed_by'),
  performedAt: timestamp('performed_at').defaultNow(),
  verified: boolean('verified').default(false),
  verifiedBy: varchar('verified_by'),
  verifiedAt: timestamp('verified_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Risk Register
export const riskRegister = pgTable('risk_register', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  riskId: varchar('risk_id').unique().notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'Technical', 'Operational', 'Strategic', 'Compliance'
  likelihood: integer('likelihood').notNull(), // 1-5 scale
  impact: integer('impact').notNull(), // 1-5 scale
  inherentRisk: integer('inherent_risk').notNull(), // likelihood * impact
  residualRisk: integer('residual_risk'), // After controls
  owner: varchar('owner'),
  status: varchar('status', { length: 20 }).default('Open'), // 'Open', 'Mitigated', 'Accepted', 'Transferred', 'Avoided'
  treatmentPlan: text('treatment_plan'),
  reviewDate: timestamp('review_date'),
  lastReviewed: timestamp('last_reviewed'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Integration Configurations
export const integrationConfigs = pgTable('integration_configs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  integrationType: varchar('integration_type', { length: 50 }).notNull(), // 'AWS', 'Azure', 'GCP', 'Okta', 'GitHub', 'Jira'
  name: varchar('name', { length: 100 }).notNull(),
  configuration: jsonb('configuration').notNull(), // Encrypted connection details
  status: varchar('status', { length: 20 }).default('Active'), // 'Active', 'Disabled', 'Error'
  lastSync: timestamp('last_sync'),
  syncStatus: varchar('sync_status', { length: 20 }).default('Never'), // 'Never', 'Success', 'Failed', 'InProgress'
  errorMessage: text('error_message'),
  createdBy: varchar('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// WORM (Write-Once-Read-Many) Audit Store for immutable evidence
export const auditStore = pgTable('audit_store', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'Evidence', 'Control', 'Finding', 'Check', 'Risk'
  entityId: varchar('entity_id').notNull(), // ID of the related entity
  eventAction: varchar('event_action', { length: 50 }).notNull(), // 'Created', 'Updated', 'Deleted', 'Verified'
  eventData: jsonb('event_data').notNull(), // Immutable snapshot
  contentHash: varchar('content_hash', { length: 64 }).notNull(), // SHA-256 for integrity
  actor: varchar('actor'),
  actorType: varchar('actor_type', { length: 20 }).default('user'), // 'user', 'system', 'integration'
  timestamp: timestamp('timestamp').defaultNow(),
  ipAddress: varchar('ip_address'),
  userAgent: text('user_agent'),
});

// Partner/Auditor Access Control (extends existing OBO)
export const auditAccess = pgTable('audit_access', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').notNull(),
  partnerFirmId: varchar('partner_firm_id'),
  auditorEmail: varchar('auditor_email'),
  accessType: varchar('access_type', { length: 20 }).notNull(), // 'ReadOnly', 'Limited'
  scopes: text('scopes').array(), // ['SoA', 'Evidence', 'Findings', 'Risks']
  grantedBy: varchar('granted_by'),
  validFrom: timestamp('valid_from').defaultNow(),
  validUntil: timestamp('valid_until').notNull(),
  lastUsed: timestamp('last_used'),
  status: varchar('status', { length: 20 }).default('Active'), // 'Active', 'Suspended', 'Revoked'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// GRC Relations
export const controlsFrameworkRelations = relations(controlsFramework, ({ many }) => ({
  soaEntries: many(statementOfApplicability),
  evidence: many(evidenceLibrary),
  checks: many(automatedChecks),
}));

export const soaRelations = relations(statementOfApplicability, ({ one, many }) => ({
  control: one(controlsFramework, {
    fields: [statementOfApplicability.controlId],
    references: [controlsFramework.id],
  }),
  owner: one(users, {
    fields: [statementOfApplicability.owner],
    // references: [users.id], // Disabled for now
  }),
  evidence: many(evidenceLibrary),
}));

export const evidenceRelations = relations(evidenceLibrary, ({ one }) => ({
  control: one(controlsFramework, {
    fields: [evidenceLibrary.controlId],
    references: [controlsFramework.id],
  }),
  owner: one(users, {
    fields: [evidenceLibrary.owner],
    // references: [users.id], // Disabled for now
  }),
}));

export const checksRelations = relations(automatedChecks, ({ one, many }) => ({
  control: one(controlsFramework, {
    fields: [automatedChecks.controlId],
    references: [controlsFramework.id],
  }),
  results: many(checkResults),
}));

export const vulnerabilityRelations = relations(vulnerabilityFindings, ({ one, many }) => ({
  assignee: one(users, {
    fields: [vulnerabilityFindings.assignee],
    // references: [users.id], // Disabled for now
  }),
  remediations: many(remediationTracking),
}));

// GRC Type exports
export type ControlsFramework = typeof controlsFramework.$inferSelect;
export type InsertControlsFramework = typeof controlsFramework.$inferInsert;

export type StatementOfApplicability = typeof statementOfApplicability.$inferSelect;
export type InsertStatementOfApplicability = typeof statementOfApplicability.$inferInsert;

export type EvidenceLibrary = typeof evidenceLibrary.$inferSelect;
export type InsertEvidenceLibrary = typeof evidenceLibrary.$inferInsert;

export type AutomatedCheck = typeof automatedChecks.$inferSelect;
export type InsertAutomatedCheck = typeof automatedChecks.$inferInsert;

export type CheckResult = typeof checkResults.$inferSelect;
export type InsertCheckResult = typeof checkResults.$inferInsert;

export type VulnerabilityFinding = typeof vulnerabilityFindings.$inferSelect;
export type InsertVulnerabilityFinding = typeof vulnerabilityFindings.$inferInsert;

export type RemediationTracking = typeof remediationTracking.$inferSelect;
export type InsertRemediationTracking = typeof remediationTracking.$inferInsert;

export type RiskRegister = typeof riskRegister.$inferSelect;
export type InsertRiskRegister = typeof riskRegister.$inferInsert;

export type IntegrationConfig = typeof integrationConfigs.$inferSelect;
export type InsertIntegrationConfig = typeof integrationConfigs.$inferInsert;

export type AuditStore = typeof auditStore.$inferSelect;
export type InsertAuditStore = typeof auditStore.$inferInsert;

export type AuditAccess = typeof auditAccess.$inferSelect;
export type InsertAuditAccess = typeof auditAccess.$inferInsert;