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

// Employees table
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
  
  // Greek Compliance Fields
  afm: varchar("afm", { length: 9 }).notNull().unique(), // Tax ID
  amka: varchar("amka", { length: 11 }).notNull().unique(), // Social Security Number
  idNumber: varchar("id_number", { length: 20 }).notNull(),
  
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
  
  // Compensation
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  
  // Legal Documents
  efkaRegistry: varchar("efka_registry"),
  taxOffice: text("tax_office"),
  workPermit: varchar("work_permit"),
  disabilityCertificate: boolean("disability_certificate").default(false),
  
  // Employment Contract
  contractType: varchar("contract_type").notNull(),
  workingHours: integer("working_hours").default(40),
  probationPeriod: integer("probation_period"),
  
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

// Payroll records table
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
  grossTotal: decimal("gross_total", { precision: 10, scale: 2 }).notNull(),
  
  // Deductions
  incomeTax: decimal("income_tax", { precision: 10, scale: 2 }).notNull(),
  employeeInsurance: decimal("employee_insurance", { precision: 10, scale: 2 }).notNull(),
  solidarityTax: decimal("solidarity_tax", { precision: 10, scale: 2 }).default("0"),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull(),
  
  // Net pay
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  
  // Employer costs
  employerInsurance: decimal("employer_insurance", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  
  // Additional fields
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  nightHours: decimal("night_hours", { precision: 5, scale: 2 }).default("0"),
  holidayHours: decimal("holiday_hours", { precision: 5, scale: 2 }).default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Collective agreements table
export const collectiveAgreements = pgTable("collective_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  minimumWage: decimal("minimum_wage", { precision: 10, scale: 2 }).notNull(),
  overtimeRate: decimal("overtime_rate", { precision: 5, scale: 2 }).default("1.25"),
  nightRate: decimal("night_rate", { precision: 5, scale: 2 }).default("1.25"),
  holidayRate: decimal("holiday_rate", { precision: 5, scale: 2 }).default("1.75"),
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

// Schemas for validation
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  afm: z.string().length(9, "ΑΦΜ πρέπει να έχει ακριβώς 9 ψηφία"),
  amka: z.string().length(11, "ΑΜΚΑ πρέπει να έχει ακριβώς 11 ψηφία"),
  email: z.string().email("Μη έγκυρη διεύθυνση email"),
  basicSalary: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Ο μισθός πρέπει να είναι θετικός αριθμός"),
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
