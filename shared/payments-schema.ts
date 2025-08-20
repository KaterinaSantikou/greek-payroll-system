/**
 * Payments Operations Schema - SEPA batch monitoring and reconciliation
 */

import { pgTable, varchar, decimal, timestamp, boolean, integer, text, jsonb, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// PAYMENT BATCHES (pain.001)
// =============================================================================

export const paymentBatches = pgTable("payment_batches", {
  batchId: varchar("batch_id").primaryKey(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  runId: varchar("run_id", { length: 100 }).notNull(),
  batchType: varchar("batch_type", { length: 20 }).notNull(), // 'payroll', 'bonus', 'reimbursement'
  
  // SEPA Details
  messageId: varchar("message_id", { length: 100 }).notNull(),
  instructionId: varchar("instruction_id", { length: 100 }),
  requestedExecutionDate: timestamp("requested_execution_date").notNull(),
  
  // Bank Profile
  bankProfile: varchar("bank_profile", { length: 50 }).notNull(), // 'alpha', 'piraeus', 'eurobank', 'nbg'
  debtorAccount: varchar("debtor_account", { length: 34 }).notNull(), // IBAN
  debtorName: varchar("debtor_name", { length: 140 }).notNull(),
  
  // Batch Totals
  totalTransactions: integer("total_transactions").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // SCT vs SCT Inst Breakdown
  sctCount: integer("sct_count").default(0),
  sctAmount: decimal("sct_amount", { precision: 10, scale: 2 }).default("0.00"),
  sctInstCount: integer("sct_inst_count").default(0),
  sctInstAmount: decimal("sct_inst_amount", { precision: 10, scale: 2 }).default("0.00"),
  
  // Status Tracking
  status: varchar("status", { length: 20 }).notNull().default("created"), // created, sent, accepted, rejected, settled, partially_settled
  sentAt: timestamp("sent_at"),
  acceptedAt: timestamp("accepted_at"),
  settledAt: timestamp("settled_at"),
  
  // Cut-off Management
  cutOffTime: timestamp("cut_off_time"),
  pastCutOff: boolean("past_cut_off").default(false),
  recommendInstant: boolean("recommend_instant").default(false),
  
  // Reconciliation
  pain002Received: boolean("pain002_received").default(false),
  camt054Received: boolean("camt054_received").default(false),
  reconciliationStatus: varchar("reconciliation_status", { length: 20 }).default("pending"), // pending, matched, discrepant
  
  // Disaster Mode / One-Click Flow fields
  freezeId: varchar("freeze_id", { length: 20 }),
  freezeHash: varchar("freeze_hash", { length: 64 }),
  lockedBy: varchar("locked_by", { length: 50 }),
  lockedAt: timestamp("locked_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// PAYMENT TRANSACTIONS (Individual payments within batch)
// =============================================================================

export const paymentTransactions = pgTable("payment_transactions", {
  transactionId: varchar("transaction_id").primaryKey(),
  batchId: varchar("batch_id").notNull().references(() => paymentBatches.batchId),
  employeeId: varchar("employee_id", { length: 100 }).notNull(),
  
  // Payment Details
  endToEndId: varchar("end_to_end_id", { length: 35 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // Creditor Details
  creditorName: varchar("creditor_name", { length: 140 }).notNull(),
  creditorAccount: varchar("creditor_account", { length: 34 }).notNull(), // IBAN
  creditorBank: varchar("creditor_bank", { length: 11 }), // BIC
  
  // Payment Type
  paymentMethod: varchar("payment_method", { length: 10 }).notNull(), // 'SCT', 'SCT_INST'
  urgency: varchar("urgency", { length: 10 }).default("NORM"), // NORM, HIGH, URGP
  
  // Status & Reconciliation
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sent, accepted, rejected, settled, returned
  rejectReason: text("reject_reason"),
  returnReason: text("return_reason"),
  
  // Re-issue Protection
  originalTransactionId: varchar("original_transaction_id"),
  reissuedAs: varchar("reissued_as"), // SCT_INST transaction ID if re-issued
  doublePayProtection: boolean("double_pay_protection").default(false),
  
  // Reconciliation Data
  bankReference: varchar("bank_reference", { length: 100 }),
  settledAmount: decimal("settled_amount", { precision: 10, scale: 2 }),
  settledAt: timestamp("settled_at"),
  
  // Disaster Mode fields
  freezeId: varchar("freeze_id", { length: 20 }),
  freezeHash: varchar("freeze_hash", { length: 64 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// BANK PROFILES & CUT-OFFS
// =============================================================================

export const bankProfiles = pgTable("bank_profiles", {
  profileId: varchar("profile_id").primaryKey(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  bankCode: varchar("bank_code", { length: 11 }).notNull(), // BIC
  
  // Cut-off Times (in bank's timezone)
  sctCutOffTime: varchar("sct_cut_off_time", { length: 8 }).notNull(), // HH:MM:SS
  sctInstCutOffTime: varchar("sct_inst_cut_off_time", { length: 8 }), // HH:MM:SS (if supported)
  timezone: varchar("timezone", { length: 50 }).default("Europe/Athens"),
  
  // Processing Windows
  processingDays: jsonb("processing_days").notNull(), // [1,2,3,4,5] = Mon-Fri
  holidayCalendar: varchar("holiday_calendar", { length: 20 }).default("GR"), // TARGET2, GR, etc
  
  // Capabilities
  supportsSctInst: boolean("supports_sct_inst").default(false),
  maxSctInstAmount: decimal("max_sct_inst_amount", { precision: 10, scale: 2 }),
  maxTransactionsPerBatch: integer("max_transactions_per_batch"),
  
  // Message Formats
  pain001Version: varchar("pain001_version", { length: 20 }).default("pain.001.001.03"),
  pain002Version: varchar("pain002_version", { length: 20 }).default("pain.002.001.03"),
  camt054Version: varchar("camt054_version", { length: 20 }).default("camt.054.001.02"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// BANK MESSAGES & RECONCILIATION
// =============================================================================

export const bankMessages = pgTable("bank_messages", {
  messageId: varchar("message_id").primaryKey(),
  batchId: varchar("batch_id").references(() => paymentBatches.batchId),
  
  // Message Details
  messageType: varchar("message_type", { length: 20 }).notNull(), // pain.002, camt.054, camt.053
  originalMessageId: varchar("original_message_id", { length: 100 }),
  bankReference: varchar("bank_reference", { length: 100 }),
  
  // Status & Content
  status: varchar("status", { length: 20 }).notNull(), // ACCEPTED, REJECTED, SETTLED, RETURNED
  reasonCode: varchar("reason_code", { length: 10 }),
  reasonText: text("reason_text"),
  
  // Reconciliation Data
  totalTransactions: integer("total_transactions"),
  acceptedCount: integer("accepted_count"),
  rejectedCount: integer("rejected_count"),
  settledAmount: decimal("settled_amount", { precision: 10, scale: 2 }),
  
  // Raw Message Data
  rawMessage: text("raw_message"), // Full XML content
  parsedData: jsonb("parsed_data"), // Structured JSON
  
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// =============================================================================
// PAYMENT EXCEPTIONS & REJECTS
// =============================================================================

// =============================================================================
// OFFLINE KITS (Disaster Mode)
// =============================================================================

export const offlineKits = pgTable("offline_kits", {
  kitId: varchar("kit_id").primaryKey(),
  freezeId: varchar("freeze_id", { length: 20 }).notNull(),
  runId: varchar("run_id", { length: 100 }).notNull(),
  
  // Kit Details
  freezeHash: varchar("freeze_hash", { length: 64 }).notNull(),
  operatorId: varchar("operator_id", { length: 50 }).notNull(),
  reason: text("reason"),
  
  // Kit Contents Metadata
  totalLines: integer("total_lines").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  bankProfiles: jsonb("bank_profiles"), // Array of bank profile IDs
  
  // File Information
  encryptionMethod: varchar("encryption_method", { length: 50 }).default("AES-256-GCM"),
  kitSizeBytes: integer("kit_size_bytes"),
  downloadCount: integer("download_count").default(0),
  
  // Status
  status: varchar("status", { length: 20 }).default("generated"), // generated, downloaded, expired
  expiresAt: timestamp("expires_at"), // Kit expiry for security
  lastDownloadedAt: timestamp("last_downloaded_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentExceptions = pgTable("payment_exceptions", {
  exceptionId: varchar("exception_id").primaryKey(),
  batchId: varchar("batch_id").notNull().references(() => paymentBatches.batchId),
  transactionId: varchar("transaction_id").references(() => paymentTransactions.transactionId),
  
  // Exception Details
  exceptionType: varchar("exception_type", { length: 30 }).notNull(), // reject, return, timeout, cut_off_breach
  severity: varchar("severity", { length: 10 }).notNull().default("medium"), // low, medium, high, critical
  
  // Error Information
  errorCode: varchar("error_code", { length: 20 }),
  errorMessage: text("error_message"),
  bankMessage: text("bank_message"),
  
  // Resolution
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, investigating, resolved, closed
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by", { length: 100 }),
  resolvedAt: timestamp("resolved_at"),
  
  // Re-issue Options
  canReissue: boolean("can_reissue").default(false),
  recommendedAction: varchar("recommended_action", { length: 50 }),
  reissueEligibleForInstant: boolean("reissue_eligible_for_instant").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// RELATIONS
// =============================================================================

export const paymentBatchesRelations = relations(paymentBatches, ({ many }) => ({
  transactions: many(paymentTransactions),
  messages: many(bankMessages),
  exceptions: many(paymentExceptions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  batch: one(paymentBatches, {
    fields: [paymentTransactions.batchId],
    references: [paymentBatches.batchId],
  }),
}));

export const bankMessagesRelations = relations(bankMessages, ({ one }) => ({
  batch: one(paymentBatches, {
    fields: [bankMessages.batchId],
    references: [paymentBatches.batchId],
  }),
}));

export const paymentExceptionsRelations = relations(paymentExceptions, ({ one }) => ({
  batch: one(paymentBatches, {
    fields: [paymentExceptions.batchId],
    references: [paymentBatches.batchId],
  }),
  transaction: one(paymentTransactions, {
    fields: [paymentExceptions.transactionId],
    references: [paymentTransactions.transactionId],
  }),
}));

// =============================================================================
// SCHEMA EXPORTS
// =============================================================================

// Payment Batch schemas
export const insertPaymentBatchSchema = createInsertSchema(paymentBatches).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentBatch = z.infer<typeof insertPaymentBatchSchema>;
export type PaymentBatch = typeof paymentBatches.$inferSelect;

// Payment Transaction schemas
export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// Bank Profile schemas
export const insertBankProfileSchema = createInsertSchema(bankProfiles).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertBankProfile = z.infer<typeof insertBankProfileSchema>;
export type BankProfile = typeof bankProfiles.$inferSelect;

// Bank Message schemas
export const insertBankMessageSchema = createInsertSchema(bankMessages).omit({
  receivedAt: true,
  createdAt: true,
});
export type InsertBankMessage = z.infer<typeof insertBankMessageSchema>;
export type BankMessage = typeof bankMessages.$inferSelect;

// Payment Exception schemas
export const insertPaymentExceptionSchema = createInsertSchema(paymentExceptions).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentException = z.infer<typeof insertPaymentExceptionSchema>;
export type PaymentException = typeof paymentExceptions.$inferSelect;

// Offline Kits schemas
export const insertOfflineKitSchema = createInsertSchema(offlineKits).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertOfflineKit = z.infer<typeof insertOfflineKitSchema>;
export type OfflineKit = typeof offlineKits.$inferSelect;

// =============================================================================
// WEBHOOK EVENTS (pain.002, camt.054 tracking)
// =============================================================================

export const webhookEvents = pgTable("webhook_events", {
  eventId: varchar("event_id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // pain.002, camt.054
  messageId: varchar("message_id", { length: 100 }).notNull(),
  bankProfile: varchar("bank_profile", { length: 50 }).notNull(),
  payload: text("payload").notNull(), // JSON payload
  status: varchar("status", { length: 20 }).notNull(), // processing, processed, failed
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
});

// =============================================================================
// INSTANT RE-ISSUE METRICS
// =============================================================================

export const instantMetrics = pgTable("instant_metrics", {
  metricId: varchar("metric_id").primaryKey(),
  transactionId: varchar("transaction_id", { length: 100 }).notNull(),
  metricType: varchar("metric_type", { length: 30 }).notNull(), // settlement, rejection, sla_breach, status_change
  value: varchar("value", { length: 100 }).notNull(), // Numeric value or status
  metadata: text("metadata"), // JSON metadata
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Relations for webhookEvents and instantMetrics (optional - for querying convenience)
// Note: No foreign key constraints to avoid migration issues

// Webhook Events schemas
export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  receivedAt: true,
});
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

// Instant Metrics schemas
export const insertInstantMetricSchema = createInsertSchema(instantMetrics).omit({
  recordedAt: true,
});
export type InsertInstantMetric = z.infer<typeof insertInstantMetricSchema>;
export type InstantMetric = typeof instantMetrics.$inferSelect;