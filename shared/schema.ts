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

// Employees table - Updated for 2025 Greek Labor Law Compliance
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Personal Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: varchar("gender", { length: 10 }).notNull(),
  birthPlace: text("birth_place"),
  nationality: varchar("nationality", { length: 5 }).default("GR"),
  maritalStatus: varchar("marital_status", { length: 20 }),
  
  // Greek Compliance Fields (Law 4808/2021 - Digital Labor Cards)
  afm: varchar("afm", { length: 9 }).notNull().unique(), // Tax ID
  amka: varchar("amka", { length: 11 }).notNull().unique(), // Social Security Number
  idNumber: varchar("id_number", { length: 20 }).notNull(),
  digitalLaborCard: varchar("digital_labor_card"), // New requirement for 2025
  
  // Contact Information
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  mobile: varchar("mobile"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: varchar("postal_code", { length: 5 }).notNull(),
  
  // Employment Information
  employeeNumber: varchar("employee_number").unique(),
  hireDate: date("hire_date").notNull(),
  department: text("department").notNull(),
  position: text("position").notNull(),
  employmentType: varchar("employment_type").notNull(), // full-time, part-time, contract
  status: varchar("status").default("active"), // active, inactive, terminated
  
  // Compensation (Updated minimum wage €760 as of 2025)
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  
  // Legal Documents & Compliance
  efkaRegistry: varchar("efka_registry"),
  taxOffice: text("tax_office"),
  workPermit: varchar("work_permit"),
  disabilityCertificate: boolean("disability_certificate").default(false),
  collectiveAgreementId: varchar("collective_agreement_id").references(() => collectiveAgreements.id),
  
  // EFKA Insurance System (Comprehensive Coverage)
  efkaInsuranceCategory: varchar("efka_insurance_category"), // IKA, OAEE, ETAA, OTHER
  efkaInsurancePackage: varchar("efka_insurance_package"), // FULL_COVERAGE, BASIC_COVERAGE, etc.
  specialInsuranceCategory: varchar("special_insurance_category"), // HEAVY_UNHEALTHY, HAZARDOUS, etc.
  efkaFundAffiliation: varchar("efka_fund_affiliation"), // MAIN_FUND, AUXILIARY_FUND, etc.
  erganiRegistration: varchar("ergani_registration"), // Labor inspection system
  tekaEnrollment: varchar("teka_enrollment"), // Engineers/technicians fund
  
  // Employment Compliance & Worker Classifications
  workerClassification: varchar("worker_classification").notNull(), // EMPLOYEE, INDEPENDENT_CONTRACTOR, SEASONAL
  youngWorkerStatus: boolean("young_worker_status").default(false), // Under 25 protection
  seasonalWorkerDesignation: boolean("seasonal_worker_designation").default(false),
  independentContractorClass: varchar("independent_contractor_class"), // For freelance classifications
  
  // Disability Support & Compliance
  disabilityPercentage: integer("disability_percentage").default(0), // 0-100%
  disabilityCertificateNumber: varchar("disability_certificate_number"),
  disabilityCertificateIssuer: varchar("disability_certificate_issuer"),
  disabilityCertificateExpiryDate: date("disability_certificate_expiry_date"),
  disabilityType: varchar("disability_type"), // PHYSICAL, MENTAL, SENSORY, MULTIPLE
  disabilitySupport: text("disability_support"), // Required accommodations
  
  // Foreign Worker Requirements
  residencyStatus: varchar("residency_status"), // EU_CITIZEN, NON_EU_PERMANENT, NON_EU_TEMPORARY, REFUGEE
  passportNumber: varchar("passport_number"),
  passportCountry: varchar("passport_country"),
  passportExpiryDate: date("passport_expiry_date"),
  visaType: varchar("visa_type"), // TOURIST, BUSINESS, STUDENT, WORK, FAMILY_REUNION
  visaNumber: varchar("visa_number"),
  visaExpiryDate: date("visa_expiry_date"),
  workPermitNumber: varchar("work_permit_number"),
  workPermitExpiryDate: date("work_permit_expiry_date"),
  residencePermitNumber: varchar("residence_permit_number"),
  residencePermitExpiryDate: date("residence_permit_expiry_date"),
  
  // Military Service Information (Greek Military Service Requirements)
  militaryServiceStatus: varchar("military_service_status"), // COMPLETED, POSTPONED, EXEMPT, PENDING, NOT_APPLICABLE
  militaryServiceCompletionDate: date("military_service_completion_date"),
  militaryServiceBranch: varchar("military_service_branch"), // ARMY, NAVY, AIR_FORCE, ALTERNATIVE_SERVICE
  militaryServiceNotes: text("military_service_notes"),
  
  // Employment Contract (Law 4808/2021 amendments)
  contractType: varchar("contract_type").notNull(), // indefinite, fixed-term, apprenticeship, internship, seasonal, freelance
  contractStartDate: date("contract_start_date").notNull(),
  contractEndDate: date("contract_end_date"), // For fixed-term contracts
  
  // Trial Period Management
  trialPeriodStartDate: date("trial_period_start_date"),
  trialPeriodEndDate: date("trial_period_end_date"), // 2-12 months based on position
  trialPeriodStatus: varchar("trial_period_status").default("active"), // active, completed, extended, terminated
  trialPeriodDuration: integer("trial_period_duration"), // Months
  
  // Working Time Arrangements (EU Working Time Directive Compliance)
  standardWeeklyHours: decimal("standard_weekly_hours", { precision: 5, scale: 2 }).default("40"), // EU 40h standard
  contractedHours: decimal("contracted_hours", { precision: 5, scale: 2 }), // For part-time workers
  maxWeeklyHours: decimal("max_weekly_hours", { precision: 5, scale: 2 }).default("48"), // EU working time directive
  scheduleType: varchar("schedule_type").default("predictable"), // predictable, unpredictable, rotating, on-call, shift
  workingTimeArrangement: varchar("working_time_arrangement").default("standard"), // standard, flexible, remote, hybrid, compressed
  
  // Schedule Flexibility & Remote Work (Law 4808/2021)
  flexibleWorkArrangement: boolean("flexible_work_arrangement").default(false), // Remote work law
  remoteWorkDays: integer("remote_work_days").default(0), // Days per week allowed remote
  flexibleStartTime: varchar("flexible_start_time"), // e.g., "07:00-10:00"
  flexibleEndTime: varchar("flexible_end_time"), // e.g., "15:00-18:00"
  coreWorkingHours: varchar("core_working_hours"), // e.g., "10:00-15:00"
  compressedWorkweek: boolean("compressed_workweek").default(false), // 4x10 schedule
  
  // Rest and Break Entitlements
  minRestPeriod: integer("min_rest_period").default(11), // Hours between shifts
  maxConsecutiveDays: integer("max_consecutive_days").default(6), // Before rest day required
  lunchBreakDuration: integer("lunch_break_duration").default(30), // Minutes
  shortBreakDuration: integer("short_break_duration").default(15), // Minutes per 4h period
  
  // Premium Rates for Special Working Conditions
  nightWorkCompensation: decimal("night_work_compensation", { precision: 5, scale: 4 }).default("0.25"), // 25% premium
  weekendWorkCompensation: decimal("weekend_work_compensation", { precision: 5, scale: 4 }).default("0.75"), // 75% premium
  overtimeRate: decimal("overtime_rate", { precision: 5, scale: 4 }).default("0.25"), // 25% premium
  
  // Legacy fields for compatibility
  workingHours: integer("working_hours").default(40),
  probationPeriod: integer("probation_period"), // Max 12 months for indefinite contracts
  
  // Right to Disconnect (Law 4808/2021)
  rightToDisconnect: boolean("right_to_disconnect").default(true),
  afterHoursContact: boolean("after_hours_contact").default(false),
  
  // Experience & Education
  previousExperience: text("previous_experience"),
  education: text("education"),
  
  // Emergency Contacts
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll records table - Updated for 2025 Greek Tax Rates with Enhanced Tax Compliance
export const payrollRecords = pgTable("payroll_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  payrollMonth: varchar("payroll_month", { length: 7 }).notNull(), // YYYY-MM format
  
  // Earnings Components
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  overtime: decimal("overtime", { precision: 10, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  sundayWork: decimal("sunday_work", { precision: 10, scale: 2 }).default("0"), // 75% premium
  sundayHours: decimal("sunday_hours", { precision: 5, scale: 2 }).default("0"),
  nightShift: decimal("night_shift", { precision: 10, scale: 2 }).default("0"),
  holidayPay: decimal("holiday_pay", { precision: 10, scale: 2 }).default("0"),
  allowances: decimal("allowances", { precision: 10, scale: 2 }).default("0"),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).default("0"),
  thirteenthSalary: decimal("thirteenth_salary", { precision: 10, scale: 2 }).default("0"), // Greek bonus
  fourteenthSalary: decimal("fourteenth_salary", { precision: 10, scale: 2 }).default("0"), // Holiday bonus
  
  // Collective Agreement Adjustments
  experienceBonus: decimal("experience_bonus", { precision: 10, scale: 2 }).default("0"),
  educationBonus: decimal("education_bonus", { precision: 10, scale: 2 }).default("0"),
  maritalBonus: decimal("marital_bonus", { precision: 10, scale: 2 }).default("0"),
  collectiveAgreementId: varchar("collective_agreement_id"),
  
  grossTotal: decimal("gross_total", { precision: 10, scale: 2 }).notNull(),
  
  // Progressive Tax Deductions (2025 brackets: 9%, 22%, 28%, 36%, 44%)
  incomeTax: decimal("income_tax", { precision: 10, scale: 2 }).notNull(),
  taxBracket9: decimal("tax_bracket_9", { precision: 10, scale: 2 }).default("0"), // 9% bracket
  taxBracket22: decimal("tax_bracket_22", { precision: 10, scale: 2 }).default("0"), // 22% bracket
  taxBracket28: decimal("tax_bracket_28", { precision: 10, scale: 2 }).default("0"), // 28% bracket
  taxBracket36: decimal("tax_bracket_36", { precision: 10, scale: 2 }).default("0"), // 36% bracket
  taxBracket44: decimal("tax_bracket_44", { precision: 10, scale: 2 }).default("0"), // 44% bracket
  taxFreeAllowance: decimal("tax_free_allowance", { precision: 10, scale: 2 }).default("0"),
  
  // EFKA Insurance Contributions (Enhanced)
  employeeInsurance: decimal("employee_insurance", { precision: 10, scale: 2 }).notNull(), // 16%
  employerInsurance: decimal("employer_insurance", { precision: 10, scale: 2 }).notNull(), // 24.78%
  unemploymentEmployee: decimal("unemployment_employee", { precision: 10, scale: 2 }).default("0"), // 0.5%
  unemploymentEmployer: decimal("unemployment_employer", { precision: 10, scale: 2 }).default("0"), // 2.55%
  healthInsurance: decimal("health_insurance", { precision: 10, scale: 2 }).default("0"),
  familyBenefits: decimal("family_benefits", { precision: 10, scale: 2 }).default("0"), // 0.7%
  supplementaryFund: decimal("supplementary_fund", { precision: 10, scale: 2 }).default("0"),
  
  // Special Insurance Categories
  heavyWorkInsurance: decimal("heavy_work_insurance", { precision: 10, scale: 2 }).default("0"),
  hazardousWorkInsurance: decimal("hazardous_work_insurance", { precision: 10, scale: 2 }).default("0"),
  
  // Special Taxes
  solidarityTax: decimal("solidarity_tax", { precision: 10, scale: 2 }).default("0"), // 2.2% for income >€12,000
  
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull(),
  
  // Net pay
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  
  // Employer costs (2025 rates)
  totalEmployerCost: decimal("total_employer_cost", { precision: 10, scale: 2 }).notNull(), // 24.78%
  employerUnemployment: decimal("employer_unemployment", { precision: 10, scale: 2 }).default("0"), // 2.55%
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  
  // Working hours tracking
  totalOvertimeHours: decimal("total_overtime_hours", { precision: 5, scale: 2 }).default("0"),
  nightHours: decimal("night_hours", { precision: 5, scale: 2 }).default("0"),
  holidayHours: decimal("holiday_hours", { precision: 5, scale: 2 }).default("0"),
  regularHours: decimal("regular_hours", { precision: 5, scale: 2 }).default("168"), // Monthly standard
  
  // Tax calculation breakdown
  taxBracket1: decimal("tax_bracket_1", { precision: 10, scale: 2 }).default("0"), // 9% up to €10,000
  taxBracket2: decimal("tax_bracket_2", { precision: 10, scale: 2 }).default("0"), // 22% €10,001-€20,000
  taxBracket3: decimal("tax_bracket_3", { precision: 10, scale: 2 }).default("0"), // 28% €20,001-€30,000
  taxBracket4: decimal("tax_bracket_4", { precision: 10, scale: 2 }).default("0"), // 36% €30,001-€40,000
  taxBracket5: decimal("tax_bracket_5", { precision: 10, scale: 2 }).default("0"), // 44% over €40,000
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Working Time Schedules table - Detailed schedule management
export const workingTimeSchedules = pgTable("working_time_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  
  // Schedule Information
  scheduleName: varchar("schedule_name").notNull(), // e.g., "Standard Office Hours", "Shift A", "Flexible Remote"
  scheduleType: varchar("schedule_type").notNull(), // predictable, unpredictable, rotating, on-call, shift
  isActive: boolean("is_active").default(true),
  effectiveDate: date("effective_date").notNull(),
  endDate: date("end_date"), // For temporary schedules
  
  // Daily Schedule Pattern (JSON for flexibility)
  weeklyPattern: jsonb("weekly_pattern"), // Day-by-day schedule with start/end times
  rotationCycle: integer("rotation_cycle"), // Days in rotation cycle (for rotating shifts)
  
  // Working Hours Configuration
  standardDailyHours: decimal("standard_daily_hours", { precision: 4, scale: 2 }).default("8"),
  standardWeeklyHours: decimal("standard_weekly_hours", { precision: 5, scale: 2 }).default("40"),
  minHoursPerWeek: decimal("min_hours_per_week", { precision: 5, scale: 2 }),
  maxHoursPerWeek: decimal("max_hours_per_week", { precision: 5, scale: 2 }).default("48"),
  
  // Flexibility Settings
  allowFlexibleStart: boolean("allow_flexible_start").default(false),
  flexibleStartWindow: varchar("flexible_start_window"), // e.g., "07:00-10:00"
  allowFlexibleEnd: boolean("allow_flexible_end").default(false),
  flexibleEndWindow: varchar("flexible_end_window"), // e.g., "15:00-18:00"
  coreHours: varchar("core_hours"), // e.g., "10:00-15:00"
  
  // Remote Work Configuration
  remoteWorkAllowed: boolean("remote_work_allowed").default(false),
  maxRemoteDaysPerWeek: integer("max_remote_days_per_week").default(0),
  hybridSchedule: jsonb("hybrid_schedule"), // Which days can be remote
  
  // Break and Rest Periods
  lunchBreakMinutes: integer("lunch_break_minutes").default(30),
  shortBreaksPerDay: integer("short_breaks_per_day").default(2),
  shortBreakMinutes: integer("short_break_minutes").default(15),
  minRestBetweenShifts: integer("min_rest_between_shifts").default(11), // Hours
  
  // Weekend and Holiday Configuration
  weekendWork: boolean("weekend_work").default(false),
  saturdayWork: boolean("saturday_work").default(false),
  sundayWork: boolean("sunday_work").default(false),
  holidayWork: boolean("holiday_work").default(false),
  
  // Overtime Configuration
  overtimeAllowed: boolean("overtime_allowed").default(true),
  maxOvertimeDaily: decimal("max_overtime_daily", { precision: 4, scale: 2 }).default("2"),
  maxOvertimeWeekly: decimal("max_overtime_weekly", { precision: 5, scale: 2 }).default("10"),
  overtimeApprovalRequired: boolean("overtime_approval_required").default(true),
  
  // Special Conditions
  nightShiftWork: boolean("night_shift_work").default(false),
  hazardousWork: boolean("hazardous_work").default(false),
  shiftPremiumRate: decimal("shift_premium_rate", { precision: 5, scale: 4 }).default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trial Period Tracking table
export const trialPeriods = pgTable("trial_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  
  // Trial Period Details
  startDate: date("start_date").notNull(),
  originalEndDate: date("original_end_date").notNull(),
  currentEndDate: date("current_end_date").notNull(), // May be extended
  durationMonths: integer("duration_months").notNull(), // 2-12 months max
  
  // Status Tracking
  status: varchar("status").default("active"), // active, completed, extended, terminated, failed
  extensionCount: integer("extension_count").default(0),
  maxExtensions: integer("max_extensions").default(1), // Legal limit
  
  // Performance Tracking
  reviewScheduled: boolean("review_scheduled").default(false),
  reviewDate: date("review_date"),
  reviewOutcome: varchar("review_outcome"), // satisfactory, needs_improvement, unsatisfactory
  reviewNotes: text("review_notes"),
  
  // Legal Compliance
  notificationGiven: boolean("notification_given").default(false), // 2 weeks notice before end
  notificationDate: date("notification_date"),
  contractConversion: boolean("contract_conversion").default(false), // To permanent
  conversionDate: date("conversion_date"),
  
  // Documentation
  evaluationCriteria: text("evaluation_criteria"),
  performanceMetrics: jsonb("performance_metrics"), // Measurable goals
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contract Types Configuration table
export const contractTypeDefinitions = pgTable("contract_type_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Contract Type Details
  contractTypeName: varchar("contract_type_name").notNull(), // full-time, part-time, temporary, seasonal, freelance
  displayName: varchar("display_name").notNull(), // Greek name for UI
  description: text("description"),
  
  // Legal Framework
  legalBasis: text("legal_basis"), // Reference to Greek labor law
  maxDuration: integer("max_duration"), // Maximum contract duration in months
  renewalAllowed: boolean("renewal_allowed").default(false),
  maxRenewals: integer("max_renewals").default(0),
  
  // Working Time Requirements
  minWeeklyHours: decimal("min_weekly_hours", { precision: 5, scale: 2 }),
  maxWeeklyHours: decimal("max_weekly_hours", { precision: 5, scale: 2 }),
  standardWeeklyHours: decimal("standard_weekly_hours", { precision: 5, scale: 2 }),
  
  // Trial Period Rules
  trialPeriodAllowed: boolean("trial_period_allowed").default(true),
  minTrialPeriodMonths: integer("min_trial_period_months").default(2),
  maxTrialPeriodMonths: integer("max_trial_period_months").default(12),
  
  // Benefits and Entitlements
  fullBenefitsEligible: boolean("full_benefits_eligible").default(true),
  proRatedBenefits: boolean("pro_rated_benefits").default(false),
  annualLeaveEntitlement: integer("annual_leave_entitlement").default(24),
  sickLeaveEntitlement: integer("sick_leave_entitlement").default(15),
  
  // Notice Periods (in days)
  employeeNoticeRequired: integer("employee_notice_required").default(30),
  employerNoticeRequired: integer("employer_notice_required").default(30),
  
  // Special Conditions
  seasonalWork: boolean("seasonal_work").default(false),
  temporaryWork: boolean("temporary_work").default(false),
  requiresWorkPermit: boolean("requires_work_permit").default(false),
  
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Collective agreements table - Updated for 2025 Greek Labor Standards
export const collectiveAgreements = pgTable("collective_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  minimumWage: decimal("minimum_wage", { precision: 10, scale: 2 }).notNull(), // €760 minimum for 2025
  overtimeRate: decimal("overtime_rate", { precision: 5, scale: 2 }).default("1.25"), // 25% increase
  nightRate: decimal("night_rate", { precision: 5, scale: 2 }).default("1.25"), // 25% night shift
  holidayRate: decimal("holiday_rate", { precision: 5, scale: 2 }).default("1.75"), // 75% holiday premium
  sundayRate: decimal("sunday_rate", { precision: 5, scale: 2 }).default("1.75"), // Sunday work premium
  dangerousWorkRate: decimal("dangerous_work_rate", { precision: 5, scale: 2 }).default("1.20"), // Hazardous work
  maxWeeklyHours: integer("max_weekly_hours").default(40), // EU working time directive
  maxDailyHours: integer("max_daily_hours").default(8),
  annualLeave: integer("annual_leave").default(24), // Minimum 24 days in Greece
  sickLeave: integer("sick_leave").default(30), // Days per year
  maternityLeave: integer("maternity_leave").default(119), // 17 weeks
  paternityLeave: integer("paternity_leave").default(14), // 2 weeks
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const employeesRelations = relations(employees, ({ many, one }) => ({
  payrollRecords: many(payrollRecords),
  workingTimeSchedules: many(workingTimeSchedules),
  trialPeriods: many(trialPeriods),
  collectiveAgreement: one(collectiveAgreements, {
    fields: [employees.collectiveAgreementId],
    references: [collectiveAgreements.id],
  }),
}));

export const payrollRecordsRelations = relations(payrollRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [payrollRecords.employeeId],
    references: [employees.id],
  }),
}));

export const workingTimeSchedulesRelations = relations(workingTimeSchedules, ({ one }) => ({
  employee: one(employees, {
    fields: [workingTimeSchedules.employeeId],
    references: [employees.id],
  }),
}));

export const trialPeriodsRelations = relations(trialPeriods, ({ one }) => ({
  employee: one(employees, {
    fields: [trialPeriods.employeeId],
    references: [employees.id],
  }),
}));

export const collectiveAgreementsRelations = relations(collectiveAgreements, ({ many }) => ({
  employees: many(employees),
}));

// Schemas for validation - Updated for 2025 Greek Labor Law Compliance
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  afm: z.string().length(9, "ΑΦΜ πρέπει να έχει ακριβώς 9 ψηφία"),
  amka: z.string().length(11, "ΑΜΚΑ πρέπει να έχει ακριβώς 11 ψηφία"),
  email: z.string().email("Μη έγκυρη διεύθυνση email"),
  basicSalary: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 760, "Ο μισθός πρέπει να είναι τουλάχιστον €760 (κατώτατος μισθός 2025)"),
  digitalLaborCard: z.string().optional(),
  contractType: z.enum(["indefinite", "fixed-term", "apprenticeship", "internship"], {
    errorMap: () => ({ message: "Μη έγκυρος τύπος σύμβασης" })
  }),
  employmentType: z.enum(["full-time", "part-time", "contract"], {
    errorMap: () => ({ message: "Μη έγκυρος τύπος απασχόλησης" })
  }),
  probationPeriod: z.number().max(12, "Η περίοδος δοκιμασίας δεν μπορεί να υπερβαίνει τους 12 μήνες").optional(),
});

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type CollectiveAgreement = typeof collectiveAgreements.$inferSelect;
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
