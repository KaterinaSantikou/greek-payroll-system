import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  decimal,
  integer,
  timestamp,
  boolean,
  text,
  jsonb,
  date,
  uuid,
  index,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Billing Plans
export const billingPlans = pgTable("billing_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  description: text("description"),
  baseFeeEur: decimal("base_fee_eur", { precision: 10, scale: 2 }).notNull(),
  perEmployeeFeeEur: decimal("per_employee_fee_eur", { precision: 10, scale: 2 }).notNull(),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"), // monthly, annual
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  isActive: boolean("is_active").notNull().default(true),
  features: jsonb("features"), // JSON array of feature flags
  maxEmployees: integer("max_employees"), // null = unlimited
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull().default("0.24"), // 24% Greek VAT
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("billing_plans_name_idx").on(table.name),
  index("billing_plans_active_idx").on(table.isActive)
]);

// Organization Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 50 }).notNull(), // External org reference
  planId: uuid("plan_id").references(() => billingPlans.id).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // active, suspended, cancelled, trial
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  trialEnd: timestamp("trial_end"), // null if not on trial
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancelledAt: timestamp("cancelled_at"),
  // Greek billing details
  companyName: varchar("company_name", { length: 200 }).notNull(),
  vatNumber: varchar("vat_number", { length: 12 }), // Greek VAT number (AFM)
  taxOffice: varchar("tax_office", { length: 100 }),
  billingAddress: jsonb("billing_address"), // Full address structure
  billingEmail: varchar("billing_email", { length: 200 }).notNull(),
  // Invoice preferences
  invoiceLanguage: varchar("invoice_language", { length: 2 }).notNull().default("el"), // el, en
  invoiceNotes: text("invoice_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("subscriptions_org_idx").on(table.organizationId),
  index("subscriptions_status_idx").on(table.status),
  index("subscriptions_period_idx").on(table.currentPeriodStart, table.currentPeriodEnd)
]);

// Invoice Sequences (for Greek sequential numbering)
export const invoiceSequences = pgTable("invoice_sequences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  year: integer("year").notNull(),
  series: varchar("series", { length: 10 }).notNull().default("INV"), // INV, CN (credit note)
  lastNumber: integer("last_number").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.year, table.series)
]);

// Invoices
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(), // e.g., INV-2024-00001
  type: varchar("type", { length: 20 }).notNull().default("invoice"), // invoice, credit_note
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, sent, paid, overdue, cancelled
  
  // Invoice dates
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  
  // Amounts (in EUR cents to avoid decimal precision issues)
  subtotalCents: integer("subtotal_cents").notNull(),
  vatAmountCents: integer("vat_amount_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 4 }).notNull(),
  
  // VAT compliance
  vatTreatment: varchar("vat_treatment", { length: 20 }).notNull().default("standard"), // standard, reverse_charge, exempt
  vatNote: text("vat_note"), // e.g., "Reverse charge applies"
  
  // Invoice details
  language: varchar("language", { length: 2 }).notNull().default("el"),
  items: jsonb("items").notNull(), // Array of invoice line items
  notes: text("notes"),
  
  // myDATA integration
  mydataTransmitted: boolean("mydata_transmitted").notNull().default(false),
  mydataTransmissionDate: timestamp("mydata_transmission_date"),
  mydataInvoiceUid: varchar("mydata_invoice_uid", { length: 100 }),
  mydataQrCode: text("mydata_qr_code"), // Base64 QR code
  
  // PDF generation
  pdfGenerated: boolean("pdf_generated").notNull().default(false),
  pdfUrl: varchar("pdf_url", { length: 500 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.invoiceNumber),
  index("invoices_subscription_idx").on(table.subscriptionId),
  index("invoices_status_idx").on(table.status),
  index("invoices_issue_date_idx").on(table.issueDate),
  index("invoices_mydata_idx").on(table.mydataTransmitted)
]);

// Monthly Employee Metering
export const employeeMetering = pgTable("employee_metering", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id).notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  
  // Metering methods
  uniqueActiveEmployees: integer("unique_active_employees").notNull(), // Headcount method
  employeesWithPayActivity: integer("employees_with_pay_activity").notNull(), // Pay activity method
  
  // The chosen method for billing
  billableEmployees: integer("billable_employees").notNull(),
  meteringMethod: varchar("metering_method", { length: 20 }).notNull(), // active_headcount, pay_activity
  
  // Proration tracking
  isPartialMonth: boolean("is_partial_month").notNull().default(false),
  daysInPeriod: integer("days_in_period").notNull(),
  prioratedDays: integer("prorated_days"), // null for full months
  
  // Raw data
  snapshot: jsonb("snapshot"), // Store employee list for audit trail
  
  createdAt: timestamp("created_at").defaultNow(),
  isFinalized: boolean("is_finalized").notNull().default(false),
}, (table) => [
  unique().on(table.subscriptionId, table.year, table.month),
  index("employee_metering_period_idx").on(table.subscriptionId, table.periodStart, table.periodEnd)
]);

// Payment Methods
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // card, sepa_debit
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, expired, failed
  
  // Card details (tokenized)
  cardLast4: varchar("card_last4", { length: 4 }),
  cardBrand: varchar("card_brand", { length: 20 }),
  cardExpiry: varchar("card_expiry", { length: 7 }), // MM/YYYY
  
  // SEPA details
  sepaIban: varchar("sepa_iban", { length: 34 }),
  sepaBankName: varchar("sepa_bank_name", { length: 100 }),
  sepaAccountHolder: varchar("sepa_account_holder", { length: 200 }),
  sepaMandateId: varchar("sepa_mandate_id", { length: 35 }),
  sepaMandateDate: date("sepa_mandate_date"),
  
  // External payment provider references
  stripePaymentMethodId: varchar("stripe_payment_method_id", { length: 100 }),
  
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("payment_methods_subscription_idx").on(table.subscriptionId),
  index("payment_methods_default_idx").on(table.subscriptionId, table.isDefault)
]);

// Payment Attempts
export const paymentAttempts = pgTable("payment_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  paymentMethodId: uuid("payment_method_id").references(() => paymentMethods.id),
  status: varchar("status", { length: 20 }).notNull(), // pending, succeeded, failed, cancelled
  amountCents: integer("amount_cents").notNull(),
  
  // Payment provider details
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 100 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 100 }),
  
  // Error handling
  failureCode: varchar("failure_code", { length: 50 }),
  failureMessage: text("failure_message"),
  
  // Timing
  attemptedAt: timestamp("attempted_at").notNull(),
  succeededAt: timestamp("succeeded_at"),
  failedAt: timestamp("failed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("payment_attempts_invoice_idx").on(table.invoiceId),
  index("payment_attempts_status_idx").on(table.status),
  index("payment_attempts_date_idx").on(table.attemptedAt)
]);

// Dunning Management
export const dunningCampaigns = pgTable("dunning_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => invoices.id).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, paused, completed, cancelled
  currentStep: integer("current_step").notNull().default(1), // 1-based step number
  maxSteps: integer("max_steps").notNull().default(4),
  
  // Service access control
  serviceAccessRevoked: boolean("service_access_revoked").notNull().default(false),
  serviceAccessRevokedAt: timestamp("service_access_revoked_at"),
  
  // Timing
  startedAt: timestamp("started_at").notNull(),
  nextActionAt: timestamp("next_action_at").notNull(),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("dunning_campaigns_invoice_idx").on(table.invoiceId),
  index("dunning_campaigns_next_action_idx").on(table.nextActionAt, table.status)
]);

export const dunningActions = pgTable("dunning_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").references(() => dunningCampaigns.id).notNull(),
  step: integer("step").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // email, payment_retry, service_suspension, final_notice
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, failed, skipped
  
  // Email details
  emailTo: varchar("email_to", { length: 200 }),
  emailSubject: varchar("email_subject", { length: 200 }),
  emailTemplate: varchar("email_template", { length: 50 }),
  emailSentAt: timestamp("email_sent_at"),
  
  // Payment retry details
  paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id),
  
  // Action timing
  scheduledAt: timestamp("scheduled_at").notNull(),
  executedAt: timestamp("executed_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("dunning_actions_campaign_idx").on(table.campaignId),
  index("dunning_actions_scheduled_idx").on(table.scheduledAt, table.status)
]);

// Credit Notes
export const creditNotes = pgTable("credit_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  originalInvoiceId: uuid("original_invoice_id").references(() => invoices.id).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id).notNull(),
  creditNoteNumber: varchar("credit_note_number", { length: 50 }).notNull(),
  
  reason: varchar("reason", { length: 50 }).notNull(), // downgrade, refund, correction, cancellation
  reasonNotes: text("reason_notes"),
  
  // Credit amounts
  creditAmountCents: integer("credit_amount_cents").notNull(),
  vatAmountCents: integer("vat_amount_cents").notNull(),
  totalCreditCents: integer("total_credit_cents").notNull(),
  
  // Application
  appliedToBalance: boolean("applied_to_balance").notNull().default(true),
  refundRequested: boolean("refund_requested").notNull().default(false),
  refundProcessed: boolean("refund_processed").notNull().default(false),
  
  issueDate: date("issue_date").notNull(),
  
  // myDATA integration
  mydataTransmitted: boolean("mydata_transmitted").notNull().default(false),
  mydataTransmissionDate: timestamp("mydata_transmission_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique().on(table.creditNoteNumber),
  index("credit_notes_invoice_idx").on(table.originalInvoiceId),
  index("credit_notes_subscription_idx").on(table.subscriptionId)
]);

// Relations
export const billingPlansRelations = relations(billingPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  plan: one(billingPlans, {
    fields: [subscriptions.planId],
    references: [billingPlans.id],
  }),
  invoices: many(invoices),
  metering: many(employeeMetering),
  paymentMethods: many(paymentMethods),
  creditNotes: many(creditNotes),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  paymentAttempts: many(paymentAttempts),
  creditNotes: many(creditNotes),
  dunningCampaigns: many(dunningCampaigns),
}));

export const employeeMeteringRelations = relations(employeeMetering, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [employeeMetering.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [paymentMethods.subscriptionId],
    references: [subscriptions.id],
  }),
  paymentAttempts: many(paymentAttempts),
}));

export const paymentAttemptsRelations = relations(paymentAttempts, ({ one }) => ({
  invoice: one(invoices, {
    fields: [paymentAttempts.invoiceId],
    references: [invoices.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [paymentAttempts.paymentMethodId],
    references: [paymentMethods.id],
  }),
}));

export const dunningCampaignsRelations = relations(dunningCampaigns, ({ one, many }) => ({
  invoice: one(invoices, {
    fields: [dunningCampaigns.invoiceId],
    references: [invoices.id],
  }),
  subscription: one(subscriptions, {
    fields: [dunningCampaigns.subscriptionId],
    references: [subscriptions.id],
  }),
  actions: many(dunningActions),
}));

export const dunningActionsRelations = relations(dunningActions, ({ one }) => ({
  campaign: one(dunningCampaigns, {
    fields: [dunningActions.campaignId],
    references: [dunningCampaigns.id],
  }),
  paymentAttempt: one(paymentAttempts, {
    fields: [dunningActions.paymentAttemptId],
    references: [paymentAttempts.id],
  }),
}));

export const creditNotesRelations = relations(creditNotes, ({ one }) => ({
  originalInvoice: one(invoices, {
    fields: [creditNotes.originalInvoiceId],
    references: [invoices.id],
  }),
  subscription: one(subscriptions, {
    fields: [creditNotes.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// TypeScript types
export type BillingPlan = typeof billingPlans.$inferSelect;
export type NewBillingPlan = typeof billingPlans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type EmployeeMetering = typeof employeeMetering.$inferSelect;
export type NewEmployeeMetering = typeof employeeMetering.$inferInsert;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;
export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
export type NewPaymentAttempt = typeof paymentAttempts.$inferInsert;
export type DunningCampaign = typeof dunningCampaigns.$inferSelect;
export type NewDunningCampaign = typeof dunningCampaigns.$inferInsert;
export type DunningAction = typeof dunningActions.$inferSelect;
export type NewDunningAction = typeof dunningActions.$inferInsert;
export type CreditNote = typeof creditNotes.$inferSelect;
export type NewCreditNote = typeof creditNotes.$inferInsert;