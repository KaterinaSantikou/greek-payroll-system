import { relations } from "drizzle-orm/relations";
import { companies, properties, employees, shifts, punchEvents, exceptions, users, timesheets, auditLog, complianceAlerts, erganiSubmissionLog, wageComponents, departments, jobPostingSalaryRanges, paycheckHistory, digitalWorkCardLogs, timeCorrectionRequests, laborNewsfeedItems, laborNewsfeedCitations, payEquityAnalysis, payTransparencyRequests, payDecisionExplanations, payEquityCompliance, csrdReportingPeriods, s1WorkforceCharacteristics, s1TurnoverMetrics, s1CollectiveBargaining, s1HealthSafetyIncidents, s1TrainingMetrics, s1WorkLifeBalance, s1PayMetrics, csrdAuditTrail, csrdExportLog, emailVerificationTokens, passwordResetTokens, userSessions, authAuditLogs, cbaPacks, wageTables, packAssignments, premiumRules, schedulingConstraints, erganiProfiles, tipPolicies, packOverrides, allowanceRules, companyUsers, companyRoleTemplates, dataAccessAudit } from "./schema";

export const propertiesRelations = relations(properties, ({one, many}) => ({
	company: one(companies, {
		fields: [properties.companyId],
		references: [companies.companyId]
	}),
	shifts: many(shifts),
	employees: many(employees),
	punchEvents: many(punchEvents),
	exceptions: many(exceptions),
	complianceAlerts: many(complianceAlerts),
	departments: many(departments),
	jobPostingSalaryRanges: many(jobPostingSalaryRanges),
	payEquityAnalyses: many(payEquityAnalysis),
	payEquityCompliances: many(payEquityCompliance),
	csrdReportingPeriods: many(csrdReportingPeriods),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	properties: many(properties),
	employees: many(employees),
	companyUsers: many(companyUsers),
	companyRoleTemplates: many(companyRoleTemplates),
	dataAccessAudits: many(dataAccessAudit),
}));

export const shiftsRelations = relations(shifts, ({one, many}) => ({
	employee: one(employees, {
		fields: [shifts.employeeId],
		references: [employees.employeeId]
	}),
	property: one(properties, {
		fields: [shifts.propertyId],
		references: [properties.propertyId]
	}),
	exceptions: many(exceptions),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	shifts: many(shifts),
	property: one(properties, {
		fields: [employees.defaultPropertyId],
		references: [properties.propertyId]
	}),
	company: one(companies, {
		fields: [employees.companyId],
		references: [companies.companyId]
	}),
	punchEvents: many(punchEvents),
	exceptions: many(exceptions),
	timesheets: many(timesheets),
	complianceAlerts: many(complianceAlerts),
	wageComponents: many(wageComponents),
	departments: many(departments),
	paycheckHistories: many(paycheckHistory),
	digitalWorkCardLogs: many(digitalWorkCardLogs),
	timeCorrectionRequests: many(timeCorrectionRequests),
	payTransparencyRequests: many(payTransparencyRequests),
	payDecisionExplanations: many(payDecisionExplanations),
	s1TrainingMetrics: many(s1TrainingMetrics),
}));

export const punchEventsRelations = relations(punchEvents, ({one, many}) => ({
	employee: one(employees, {
		fields: [punchEvents.employeeId],
		references: [employees.employeeId]
	}),
	property: one(properties, {
		fields: [punchEvents.propertyId],
		references: [properties.propertyId]
	}),
	erganiSubmissionLogs: many(erganiSubmissionLog),
}));

export const exceptionsRelations = relations(exceptions, ({one}) => ({
	employee: one(employees, {
		fields: [exceptions.employeeId],
		references: [employees.employeeId]
	}),
	property: one(properties, {
		fields: [exceptions.propertyId],
		references: [properties.propertyId]
	}),
	shift: one(shifts, {
		fields: [exceptions.shiftId],
		references: [shifts.shiftId]
	}),
	user: one(users, {
		fields: [exceptions.resolvedBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	exceptions: many(exceptions),
	auditLogs: many(auditLog),
	complianceAlerts: many(complianceAlerts),
	emailVerificationTokens: many(emailVerificationTokens),
	passwordResetTokens: many(passwordResetTokens),
	userSessions: many(userSessions),
	authAuditLogs: many(authAuditLogs),
	companyUsers_userId: many(companyUsers, {
		relationName: "companyUsers_userId_users_id"
	}),
	companyUsers_invitedBy: many(companyUsers, {
		relationName: "companyUsers_invitedBy_users_id"
	}),
	dataAccessAudits: many(dataAccessAudit),
}));

export const timesheetsRelations = relations(timesheets, ({one}) => ({
	employee: one(employees, {
		fields: [timesheets.employeeId],
		references: [employees.employeeId]
	}),
}));

export const auditLogRelations = relations(auditLog, ({one}) => ({
	user: one(users, {
		fields: [auditLog.userId],
		references: [users.id]
	}),
}));

export const complianceAlertsRelations = relations(complianceAlerts, ({one}) => ({
	employee: one(employees, {
		fields: [complianceAlerts.employeeId],
		references: [employees.employeeId]
	}),
	property: one(properties, {
		fields: [complianceAlerts.propertyId],
		references: [properties.propertyId]
	}),
	user: one(users, {
		fields: [complianceAlerts.resolvedBy],
		references: [users.id]
	}),
}));

export const erganiSubmissionLogRelations = relations(erganiSubmissionLog, ({one}) => ({
	punchEvent: one(punchEvents, {
		fields: [erganiSubmissionLog.eventId],
		references: [punchEvents.eventId]
	}),
}));

export const wageComponentsRelations = relations(wageComponents, ({one}) => ({
	employee: one(employees, {
		fields: [wageComponents.employeeId],
		references: [employees.employeeId]
	}),
}));

export const departmentsRelations = relations(departments, ({one, many}) => ({
	property: one(properties, {
		fields: [departments.propertyId],
		references: [properties.propertyId]
	}),
	employee: one(employees, {
		fields: [departments.managerEmployeeId],
		references: [employees.employeeId]
	}),
	jobPostingSalaryRanges: many(jobPostingSalaryRanges),
	payEquityAnalyses: many(payEquityAnalysis),
}));

export const jobPostingSalaryRangesRelations = relations(jobPostingSalaryRanges, ({one}) => ({
	property: one(properties, {
		fields: [jobPostingSalaryRanges.propertyId],
		references: [properties.propertyId]
	}),
	department: one(departments, {
		fields: [jobPostingSalaryRanges.departmentId],
		references: [departments.departmentId]
	}),
}));

export const paycheckHistoryRelations = relations(paycheckHistory, ({one}) => ({
	employee: one(employees, {
		fields: [paycheckHistory.employeeId],
		references: [employees.employeeId]
	}),
}));

export const digitalWorkCardLogsRelations = relations(digitalWorkCardLogs, ({one, many}) => ({
	employee: one(employees, {
		fields: [digitalWorkCardLogs.employeeId],
		references: [employees.employeeId]
	}),
	timeCorrectionRequests: many(timeCorrectionRequests),
}));

export const timeCorrectionRequestsRelations = relations(timeCorrectionRequests, ({one}) => ({
	employee: one(employees, {
		fields: [timeCorrectionRequests.employeeId],
		references: [employees.employeeId]
	}),
	digitalWorkCardLog: one(digitalWorkCardLogs, {
		fields: [timeCorrectionRequests.workCardLogId],
		references: [digitalWorkCardLogs.logId]
	}),
}));

export const laborNewsfeedCitationsRelations = relations(laborNewsfeedCitations, ({one}) => ({
	laborNewsfeedItem: one(laborNewsfeedItems, {
		fields: [laborNewsfeedCitations.newsItemId],
		references: [laborNewsfeedItems.id]
	}),
}));

export const laborNewsfeedItemsRelations = relations(laborNewsfeedItems, ({many}) => ({
	laborNewsfeedCitations: many(laborNewsfeedCitations),
}));

export const payEquityAnalysisRelations = relations(payEquityAnalysis, ({one}) => ({
	property: one(properties, {
		fields: [payEquityAnalysis.propertyId],
		references: [properties.propertyId]
	}),
	department: one(departments, {
		fields: [payEquityAnalysis.departmentId],
		references: [departments.departmentId]
	}),
}));

export const payTransparencyRequestsRelations = relations(payTransparencyRequests, ({one}) => ({
	employee: one(employees, {
		fields: [payTransparencyRequests.employeeId],
		references: [employees.employeeId]
	}),
}));

export const payDecisionExplanationsRelations = relations(payDecisionExplanations, ({one}) => ({
	employee: one(employees, {
		fields: [payDecisionExplanations.employeeId],
		references: [employees.employeeId]
	}),
}));

export const payEquityComplianceRelations = relations(payEquityCompliance, ({one}) => ({
	property: one(properties, {
		fields: [payEquityCompliance.propertyId],
		references: [properties.propertyId]
	}),
}));

export const csrdReportingPeriodsRelations = relations(csrdReportingPeriods, ({one, many}) => ({
	property: one(properties, {
		fields: [csrdReportingPeriods.propertyId],
		references: [properties.propertyId]
	}),
	s1WorkforceCharacteristics: many(s1WorkforceCharacteristics),
	s1TurnoverMetrics: many(s1TurnoverMetrics),
	s1CollectiveBargainings: many(s1CollectiveBargaining),
	s1HealthSafetyIncidents: many(s1HealthSafetyIncidents),
	s1TrainingMetrics: many(s1TrainingMetrics),
	s1WorkLifeBalances: many(s1WorkLifeBalance),
	s1PayMetrics: many(s1PayMetrics),
	csrdAuditTrails: many(csrdAuditTrail),
	csrdExportLogs: many(csrdExportLog),
}));

export const s1WorkforceCharacteristicsRelations = relations(s1WorkforceCharacteristics, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [s1WorkforceCharacteristics.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
}));

export const s1TurnoverMetricsRelations = relations(s1TurnoverMetrics, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [s1TurnoverMetrics.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
}));

export const s1CollectiveBargainingRelations = relations(s1CollectiveBargaining, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [s1CollectiveBargaining.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
}));

export const s1HealthSafetyIncidentsRelations = relations(s1HealthSafetyIncidents, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [s1HealthSafetyIncidents.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
}));

export const s1TrainingMetricsRelations = relations(s1TrainingMetrics, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [s1TrainingMetrics.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
	employee: one(employees, {
		fields: [s1TrainingMetrics.employeeId],
		references: [employees.employeeId]
	}),
}));

export const s1WorkLifeBalanceRelations = relations(s1WorkLifeBalance, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [s1WorkLifeBalance.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
}));

export const s1PayMetricsRelations = relations(s1PayMetrics, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [s1PayMetrics.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
}));

export const csrdAuditTrailRelations = relations(csrdAuditTrail, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [csrdAuditTrail.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
}));

export const csrdExportLogRelations = relations(csrdExportLog, ({one}) => ({
	csrdReportingPeriod: one(csrdReportingPeriods, {
		fields: [csrdExportLog.reportingPeriodId],
		references: [csrdReportingPeriods.id]
	}),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({one}) => ({
	user: one(users, {
		fields: [emailVerificationTokens.userId],
		references: [users.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));

export const authAuditLogsRelations = relations(authAuditLogs, ({one}) => ({
	user: one(users, {
		fields: [authAuditLogs.userId],
		references: [users.id]
	}),
}));

export const wageTablesRelations = relations(wageTables, ({one}) => ({
	cbaPack: one(cbaPacks, {
		fields: [wageTables.packId],
		references: [cbaPacks.id]
	}),
}));

export const cbaPacksRelations = relations(cbaPacks, ({many}) => ({
	wageTables: many(wageTables),
	packAssignments: many(packAssignments),
	premiumRules: many(premiumRules),
	schedulingConstraints: many(schedulingConstraints),
	erganiProfiles: many(erganiProfiles),
	tipPolicies: many(tipPolicies),
	packOverrides: many(packOverrides),
	allowanceRules: many(allowanceRules),
}));

export const packAssignmentsRelations = relations(packAssignments, ({one}) => ({
	cbaPack: one(cbaPacks, {
		fields: [packAssignments.packId],
		references: [cbaPacks.id]
	}),
}));

export const premiumRulesRelations = relations(premiumRules, ({one}) => ({
	cbaPack: one(cbaPacks, {
		fields: [premiumRules.packId],
		references: [cbaPacks.id]
	}),
}));

export const schedulingConstraintsRelations = relations(schedulingConstraints, ({one}) => ({
	cbaPack: one(cbaPacks, {
		fields: [schedulingConstraints.packId],
		references: [cbaPacks.id]
	}),
}));

export const erganiProfilesRelations = relations(erganiProfiles, ({one}) => ({
	cbaPack: one(cbaPacks, {
		fields: [erganiProfiles.packId],
		references: [cbaPacks.id]
	}),
}));

export const tipPoliciesRelations = relations(tipPolicies, ({one}) => ({
	cbaPack: one(cbaPacks, {
		fields: [tipPolicies.packId],
		references: [cbaPacks.id]
	}),
}));

export const packOverridesRelations = relations(packOverrides, ({one}) => ({
	cbaPack: one(cbaPacks, {
		fields: [packOverrides.packId],
		references: [cbaPacks.id]
	}),
}));

export const allowanceRulesRelations = relations(allowanceRules, ({one}) => ({
	cbaPack: one(cbaPacks, {
		fields: [allowanceRules.packId],
		references: [cbaPacks.id]
	}),
}));

export const companyUsersRelations = relations(companyUsers, ({one}) => ({
	company: one(companies, {
		fields: [companyUsers.companyId],
		references: [companies.companyId]
	}),
	user_userId: one(users, {
		fields: [companyUsers.userId],
		references: [users.id],
		relationName: "companyUsers_userId_users_id"
	}),
	user_invitedBy: one(users, {
		fields: [companyUsers.invitedBy],
		references: [users.id],
		relationName: "companyUsers_invitedBy_users_id"
	}),
}));

export const companyRoleTemplatesRelations = relations(companyRoleTemplates, ({one}) => ({
	company: one(companies, {
		fields: [companyRoleTemplates.companyId],
		references: [companies.companyId]
	}),
}));

export const dataAccessAuditRelations = relations(dataAccessAudit, ({one}) => ({
	company: one(companies, {
		fields: [dataAccessAudit.companyId],
		references: [companies.companyId]
	}),
	user: one(users, {
		fields: [dataAccessAudit.userId],
		references: [users.id]
	}),
}));