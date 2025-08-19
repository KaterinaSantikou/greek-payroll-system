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
  
  // Employment Contract (Law 4808/2021 amendments)
  contractType: varchar("contract_type").notNull(), // indefinite, fixed-term, apprenticeship, internship
  workingHours: integer("working_hours").default(40),
  probationPeriod: integer("probation_period"), // Max 12 months for indefinite contracts
  flexibleWorkArrangement: boolean("flexible_work_arrangement").default(false), // Remote work law
  
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

// Payroll records table - Updated for 2025 Greek Tax Rates
export const payrollRecords = pgTable("payroll_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id).notNull(),
  payrollMonth: varchar("payroll_month", { length: 7 }).notNull(), // YYYY-MM format
  
  // Earnings
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  overtime: decimal("overtime", { precision: 10, scale: 2 }).default("0"),
  nightShift: decimal("night_shift", { precision: 10, scale: 2 }).default("0"),
  holidayPay: decimal("holiday_pay", { precision: 10, scale: 2 }).default("0"),
  allowances: decimal("allowances", { precision: 10, scale: 2 }).default("0"),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).default("0"),
  thirteenthSalary: decimal("thirteenth_salary", { precision: 10, scale: 2 }).default("0"), // Greek bonus
  fourteenthSalary: decimal("fourteenth_salary", { precision: 10, scale: 2 }).default("0"), // Holiday bonus
  grossTotal: decimal("gross_total", { precision: 10, scale: 2 }).notNull(),
  
  // Deductions (2025 rates)
  incomeTax: decimal("income_tax", { precision: 10, scale: 2 }).notNull(),
  employeeInsurance: decimal("employee_insurance", { precision: 10, scale: 2 }).notNull(), // 16%
  solidarityTax: decimal("solidarity_tax", { precision: 10, scale: 2 }).default("0"), // 2.2% for income >12,000
  unemploymentFund: decimal("unemployment_fund", { precision: 10, scale: 2 }).default("0"), // 0.5%
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull(),
  
  // Net pay
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  
  // Employer costs (2025 rates)
  employerInsurance: decimal("employer_insurance", { precision: 10, scale: 2 }).notNull(), // 24.78%
  employerUnemployment: decimal("employer_unemployment", { precision: 10, scale: 2 }).default("0"), // 2.55%
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  
  // Working hours tracking
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
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
export const employeesRelations = relations(employees, ({ many }) => ({
  payrollRecords: many(payrollRecords),
}));

export const payrollRecordsRelations = relations(payrollRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [payrollRecords.employeeId],
    references: [employees.id],
  }),
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
