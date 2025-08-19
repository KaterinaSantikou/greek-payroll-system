/**
 * Canonical Payments Schema - Matches the provided data model
 */

import { pgTable, varchar, decimal, timestamp, boolean, integer, text, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// BANK PROFILES (Canonical)
// =============================================================================

export const bankProfiles = pgTable("bank_profiles_canonical", {
  id: varchar("id").primaryKey(), // "alpha" | "piraeus" | "eurobank" | "nbg"
  painVersion: varchar("pain_version", { length: 20 }).notNull(), // "pain.001.001.03" | "pain.001.001.09"
  supportsInstant: boolean("supports_instant").notNull(),
  sctInstAmountLimit: integer("sct_inst_amount_limit"), // bank/rail limit (e.g., 100000)
  
  // Cutoffs stored as JSON
  cutoffs: jsonb("cutoffs").notNull(), // { sct: { weekdays: string; time: "HH:mm" }, sctInst: { alwaysOn: boolean } }
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// PAYMENT BATCHES (Canonical)
// =============================================================================

export const paymentBatches = pgTable("payment_batches_canonical", {
  batchId: varchar("batch_id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 100 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  bankProfileId: varchar("bank_profile_id", { length: 20 }).notNull().references(() => bankProfiles.id),
  runId: varchar("run_id", { length: 100 }).notNull(), // payroll run
  method: varchar("method", { length: 10 }).notNull(), // "SCT" | "SCT_INST"
  status: varchar("status", { length: 20 }).notNull().default("prepared"), // "prepared" | "submitted" | "accepted" | "partially_settled" | "settled" | "reconciled" | "failed"
  
  // Totals stored as JSON
  totals: jsonb("totals").notNull(), // { count: number; amount: number; accepted?: number; rejected?: number; settled?: number }
  
  submittedAt: timestamp("submitted_at"),
  
  // File references stored as JSON array
  fileRefs: jsonb("file_refs").default('[]'), // { pain001?: string; bankReceipt?: string }[]
  
  // Previous batchIds superseded (JSON array)
  supersedes: jsonb("supersedes"), // string[]
  
  // Additional metadata
  metadata: jsonb("metadata"), // Record<string, string>
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// PAYMENT INSTRUCTIONS (Canonical)
// =============================================================================

export const paymentInstructions = pgTable("payment_instructions_canonical", {
  lineId: varchar("line_id").primaryKey(),
  batchId: varchar("batch_id").notNull().references(() => paymentBatches.batchId),
  employeeId: varchar("employee_id", { length: 100 }).notNull(),
  endToEndId: varchar("end_to_end_id", { length: 35 }).notNull(), // unique per instruction
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  creditorName: varchar("creditor_name", { length: 140 }).notNull(),
  creditorIban: varchar("creditor_iban", { length: 34 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(), // "SCT" | "SCT_INST"
  status: varchar("status", { length: 20 }).notNull().default("prepared"), // "prepared" | "submitted" | "accepted" | "settled" | "rejected" | "superseded" | "cancelled"
  reasonCode: varchar("reason_code", { length: 10 }), // from pain.002 (e.g., AM04, AC04, FF01)
  
  // Bank references stored as JSON
  bankRefs: jsonb("bank_refs"), // { uetr?: string; bankTxId?: string }
  
  originalLineId: varchar("original_line_id"), // set for re-issues
  
  // Reconciliation data stored as JSON
  reconciliation: jsonb("reconciliation").default('{}'), // { pain002?: { fileId: string; ts: string; status: string; reasonCode?: string }; camt?: { fileId: string; ts: string; amount: number; bookingDate: string } }
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// RELATIONS (Canonical)
// =============================================================================

export const bankProfilesRelations = relations(bankProfiles, ({ many }) => ({
  batches: many(paymentBatches),
}));

export const paymentBatchesRelations = relations(paymentBatches, ({ one, many }) => ({
  bankProfile: one(bankProfiles, {
    fields: [paymentBatches.bankProfileId],
    references: [bankProfiles.id],
  }),
  instructions: many(paymentInstructions),
}));

export const paymentInstructionsRelations = relations(paymentInstructions, ({ one }) => ({
  batch: one(paymentBatches, {
    fields: [paymentInstructions.batchId],
    references: [paymentBatches.batchId],
  }),
}));

// =============================================================================
// ZOD SCHEMAS (Canonical)
// =============================================================================

// Bank Profile schemas
export const insertBankProfileSchema = createInsertSchema(bankProfiles).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertBankProfile = z.infer<typeof insertBankProfileSchema>;
export type BankProfile = typeof bankProfiles.$inferSelect;

// Payment Batch schemas
export const insertPaymentBatchSchema = createInsertSchema(paymentBatches).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentBatch = z.infer<typeof insertPaymentBatchSchema>;
export type PaymentBatch = typeof paymentBatches.$inferSelect;

// Payment Instruction schemas
export const insertPaymentInstructionSchema = createInsertSchema(paymentInstructions).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentInstruction = z.infer<typeof insertPaymentInstructionSchema>;
export type PaymentInstruction = typeof paymentInstructions.$inferSelect;

// =============================================================================
// TYPE DEFINITIONS (Matching Canonical Model)
// =============================================================================

export type BankProfileCanonical = {
  id: "alpha" | "piraeus" | "eurobank" | "nbg";
  painVersion: "pain.001.001.03" | "pain.001.001.09";
  supportsInstant: boolean;
  sctInstAmountLimit?: number;
  cutoffs: {
    sct: { weekdays: string; time: string }; // "HH:mm"
    sctInst: { alwaysOn: boolean };
  };
};

export type PaymentBatchCanonical = {
  batchId: string;
  tenantId: string;
  entityId: string;
  bankProfileId: BankProfileCanonical["id"];
  runId: string;
  method: "SCT" | "SCT_INST";
  status: "prepared" | "submitted" | "accepted" | "partially_settled" | "settled" | "reconciled" | "failed";
  totals: { count: number; amount: number; accepted?: number; rejected?: number; settled?: number };
  submittedAt?: string; // ISO
  fileRefs: { pain001?: string; bankReceipt?: string }[];
  supersedes?: string[];
  metadata?: Record<string, string>;
};

export type PaymentInstructionCanonical = {
  lineId: string;
  batchId: string;
  employeeId: string;
  endToEndId: string;
  amount: number;
  currency: "EUR";
  creditorName: string;
  creditorIban: string;
  method: "SCT" | "SCT_INST";
  status: "prepared" | "submitted" | "accepted" | "settled" | "rejected" | "superseded" | "cancelled";
  reasonCode?: string; // from pain.002 (e.g., AM04, AC04, FF01)
  bankRefs?: { uetr?: string; bankTxId?: string };
  originalLineId?: string; // set for re-issues
  reconciliation: {
    pain002?: { fileId: string; ts: string; status: string; reasonCode?: string };
    camt?: { fileId: string; ts: string; amount: number; bookingDate: string };
  };
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const bankProfileValidationSchema = z.object({
  id: z.enum(["alpha", "piraeus", "eurobank", "nbg"]),
  painVersion: z.enum(["pain.001.001.03", "pain.001.001.09"]),
  supportsInstant: z.boolean(),
  sctInstAmountLimit: z.number().optional(),
  cutoffs: z.object({
    sct: z.object({
      weekdays: z.string(),
      time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm format
    }),
    sctInst: z.object({
      alwaysOn: z.boolean(),
    }),
  }),
});

export const paymentBatchValidationSchema = z.object({
  batchId: z.string(),
  tenantId: z.string(),
  entityId: z.string(),
  bankProfileId: z.enum(["alpha", "piraeus", "eurobank", "nbg"]),
  runId: z.string(),
  method: z.enum(["SCT", "SCT_INST"]),
  status: z.enum(["prepared", "submitted", "accepted", "partially_settled", "settled", "reconciled", "failed"]),
  totals: z.object({
    count: z.number(),
    amount: z.number(),
    accepted: z.number().optional(),
    rejected: z.number().optional(),
    settled: z.number().optional(),
  }),
  submittedAt: z.string().optional(),
  fileRefs: z.array(z.object({
    pain001: z.string().optional(),
    bankReceipt: z.string().optional(),
  })),
  supersedes: z.array(z.string()).optional(),
  metadata: z.record(z.string()).optional(),
});

export const paymentInstructionValidationSchema = z.object({
  lineId: z.string(),
  batchId: z.string(),
  employeeId: z.string(),
  endToEndId: z.string().max(35),
  amount: z.number().positive(),
  currency: z.literal("EUR"),
  creditorName: z.string().max(140),
  creditorIban: z.string().max(34),
  method: z.enum(["SCT", "SCT_INST"]),
  status: z.enum(["prepared", "submitted", "accepted", "settled", "rejected", "superseded", "cancelled"]),
  reasonCode: z.string().max(10).optional(),
  bankRefs: z.object({
    uetr: z.string().optional(),
    bankTxId: z.string().optional(),
  }).optional(),
  originalLineId: z.string().optional(),
  reconciliation: z.object({
    pain002: z.object({
      fileId: z.string(),
      ts: z.string(),
      status: z.string(),
      reasonCode: z.string().optional(),
    }).optional(),
    camt: z.object({
      fileId: z.string(),
      ts: z.string(),
      amount: z.number(),
      bookingDate: z.string(),
    }).optional(),
  }),
});