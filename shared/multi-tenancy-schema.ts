/**
 * Multi-Tenancy Schema Extensions for PayrollSync
 * Provides enterprise-grade tenant isolation and role-based access control
 */

import { pgTable, varchar, text, jsonb, boolean, timestamp, integer, inet } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth-schema";

// Companies (Tenants) - Each employer is a separate company
export const companies = pgTable("companies", {
  companyId: varchar("company_id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }).notNull(),
  taxId: varchar("tax_id", { length: 20 }).unique(), // AFM for Greek companies
  registrationNumber: varchar("registration_number", { length: 50 }),
  industrySector: varchar("industry_sector", { length: 100 }),
  companySize: varchar("company_size", { length: 20 }), // small, medium, large, enterprise
  address: jsonb("address"), // Full address structure
  contactInfo: jsonb("contact_info"), // Phone, email, website
  billingInfo: jsonb("billing_info"), // Billing address, payment methods
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).default('basic'), // basic, professional, enterprise
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default('active'), // active, suspended, cancelled
  licenseLimits: jsonb("license_limits"), // {employees: 100, properties: 5, users: 20}
  featureFlags: jsonb("feature_flags").default({}), // Enabled features per company
  timezone: varchar("timezone", { length: 50 }).default('Europe/Athens'),
  defaultCurrency: varchar("default_currency", { length: 3 }).default('EUR'),
  defaultLocale: varchar("default_locale", { length: 5 }).default('el'),
  gdprSettings: jsonb("gdpr_settings"), // Data retention, privacy policies
  auditSettings: jsonb("audit_settings"), // Audit log retention, compliance settings
  integrationSettings: jsonb("integration_settings"), // API keys, webhook URLs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company-User Relationship - Maps users to companies with roles
export const companyUsers = pgTable("company_users", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id", { length: 50 }).notNull().references(() => companies.companyId, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 50 }).notNull(), // company_admin, hr_admin, payroll_admin, manager, employee
  department: varchar("department", { length: 100 }),
  employeeId: varchar("employee_id", { length: 50 }), // Internal employee ID within company
  permissions: jsonb("permissions").default({}), // Granular permissions
  accessLevel: varchar("access_level", { length: 20 }).default('standard'), // standard, restricted, full
  propertyAccess: jsonb("property_access"), // Which properties user can access
  dateJoined: timestamp("date_joined").defaultNow(),
  lastActive: timestamp("last_active"),
  isActive: boolean("is_active").default(true),
  invitedBy: varchar("invited_by", { length: 255 }).references(() => users.id),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company Role Templates - Define permissions per role per company
export const companyRoleTemplates = pgTable("company_role_templates", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id", { length: 50 }).notNull().references(() => companies.companyId, { onDelete: 'cascade' }),
  roleName: varchar("role_name", { length: 50 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: jsonb("permissions").notNull(), // Detailed permissions structure
  defaultAccessLevel: varchar("default_access_level", { length: 20 }).default('standard'),
  canInviteUsers: boolean("can_invite_users").default(false),
  canManageRoles: boolean("can_manage_roles").default(false),
  maxPropertiesAccess: integer("max_properties_access"), // NULL = unlimited
  isSystemRole: boolean("is_system_role").default(false), // Cannot be deleted if true
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data Access Audit - Track all data access for compliance
export const dataAccessAudit = pgTable("data_access_audit", {
  id: varchar("id", { length: 50 }).primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id", { length: 50 }).notNull().references(() => companies.companyId),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // view, create, update, delete, export
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // employee, payroll, timesheet, etc.
  resourceId: varchar("resource_id", { length: 50 }),
  accessedData: jsonb("accessed_data"), // What data was accessed/modified
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(companyUsers),
  roleTemplates: many(companyRoleTemplates),
  auditLogs: many(dataAccessAudit),
}));

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, {
    fields: [companyUsers.companyId],
    references: [companies.companyId],
  }),
  user: one(users, {
    fields: [companyUsers.userId],
    references: [users.id],
  }),
}));

export const companyRoleTemplatesRelations = relations(companyRoleTemplates, ({ one }) => ({
  company: one(companies, {
    fields: [companyRoleTemplates.companyId],
    references: [companies.companyId],
  }),
}));

export const dataAccessAuditRelations = relations(dataAccessAudit, ({ one }) => ({
  company: one(companies, {
    fields: [dataAccessAudit.companyId],
    references: [companies.companyId],
  }),
  user: one(users, {
    fields: [dataAccessAudit.userId],
    references: [users.id],
  }),
}));

// Zod Schemas for validation
export const insertCompanySchema = createInsertSchema(companies, {
  companyName: z.string().min(1, "Company name is required"),
  legalName: z.string().min(1, "Legal name is required"),
  taxId: z.string().optional(),
  industrySector: z.string().optional(),
  companySize: z.enum(["small", "medium", "large", "enterprise"]).optional(),
  subscriptionPlan: z.enum(["basic", "professional", "enterprise"]).optional(),
  subscriptionStatus: z.enum(["active", "suspended", "cancelled"]).optional(),
  defaultCurrency: z.string().length(3).default("EUR"),
  defaultLocale: z.enum(["en", "el"]).default("el"),
});

export const insertCompanyUserSchema = createInsertSchema(companyUsers, {
  companyId: z.string().min(1, "Company ID is required"),
  userId: z.string().min(1, "User ID is required"),
  role: z.string().min(1, "Role is required"),
  accessLevel: z.enum(["standard", "restricted", "full"]).default("standard"),
});

export const insertRoleTemplateSchema = createInsertSchema(companyRoleTemplates, {
  companyId: z.string().min(1, "Company ID is required"),
  roleName: z.string().min(1, "Role name is required"),
  displayName: z.string().min(1, "Display name is required"),
  permissions: z.object({}).passthrough(), // Allow any permissions structure
});

// Types
export type Company = typeof companies.$inferSelect;
export type NewCompany = z.infer<typeof insertCompanySchema>;
export type CompanyUser = typeof companyUsers.$inferSelect;
export type NewCompanyUser = z.infer<typeof insertCompanyUserSchema>;
export type CompanyRoleTemplate = typeof companyRoleTemplates.$inferSelect;
export type NewCompanyRoleTemplate = z.infer<typeof insertRoleTemplateSchema>;
export type DataAccessAudit = typeof dataAccessAudit.$inferSelect;

// Permission structure types
export interface PermissionModule {
  [key: string]: 'view' | 'edit' | 'full' | 'create' | 'delete' | string[];
}

export interface CompanyPermissions {
  all?: boolean; // System admin flag
  modules?: {
    payroll?: 'view' | 'edit' | 'full';
    hr?: 'view' | 'edit' | 'full';
    employees?: 'view' | 'edit' | 'full';
    compliance?: 'view' | 'edit' | 'full';
    settings?: 'view' | 'edit' | 'full';
    users?: 'view' | 'edit' | 'full';
    properties?: 'view' | 'edit' | 'full';
    reports?: 'view' | 'edit' | 'full';
    timesheets?: 'view' | 'edit' | 'full';
    banking?: 'view' | 'edit' | 'full';
    ergani?: 'view' | 'edit' | 'full';
    [key: string]: any;
  };
  scope?: 'self' | 'department' | 'property' | 'company';
}

// Company size limits
export const COMPANY_SIZE_LIMITS = {
  small: { employees: 50, properties: 3, users: 10 },
  medium: { employees: 500, properties: 10, users: 50 },
  large: { employees: 1500, properties: 25, users: 150 },
  enterprise: { employees: -1, properties: -1, users: -1 } // Unlimited
} as const;

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<string, CompanyPermissions> = {
  system_admin: {
    all: true,
    modules: {
      payroll: 'full',
      hr: 'full',
      employees: 'full',
      compliance: 'full',
      settings: 'full',
      users: 'full',
      properties: 'full',
      reports: 'full'
    }
  },
  hr_admin: {
    modules: {
      hr: 'full',
      employees: 'full',
      compliance: 'view',
      reports: 'view',
      users: 'edit'
    }
  },
  payroll_admin: {
    modules: {
      payroll: 'full',
      timesheets: 'full',
      banking: 'full',
      compliance: 'view',
      reports: 'full',
      ergani: 'full'
    }
  },
  property_manager: {
    modules: {
      employees: 'view',
      timesheets: 'edit',
      reports: 'view'
    },
    scope: 'property'
  },
  employee: {
    modules: {
      employees: 'view', // Only own data
      timesheets: 'view', // Only own data
      reports: 'view' // Only own data
    },
    scope: 'self'
  }
} as const;