/**
 * Canonical Payments Service - Using the canonical data model
 */

import { db } from '../db';
import { bankProfiles, paymentBatches, paymentInstructions } from '@shared/payments-canonical-schema';
import { payrollLines, employees } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export interface CanonicalBatchRequest {
  tenantId: string;
  entityId: string;
  runId: string;
  bankProfileId: "alpha" | "piraeus" | "eurobank" | "nbg";
  method?: "SCT" | "SCT_INST" | "AUTO";
}

export interface CanonicalBatchResult {
  batchId: string;
  method: "SCT" | "SCT_INST";
  totals: { count: number; amount: number };
  instructions: Array<{
    lineId: string;
    employeeId: string;
    endToEndId: string;
    amount: number;
    creditorName: string;
    creditorIban: string;
    method: "SCT" | "SCT_INST";
  }>;
  pain001Xml: string;
}

export interface ReissueRequest {
  originalBatchId: string;
  failedLineIds: string[];
  targetMethod: "SCT_INST";
  reason: string;
}

export interface ReissueResult {
  newBatchId: string;
  originalBatchSuperseded: boolean;
  reissuedInstructions: number;
  supersededLineIds: string[];
}

export class CanonicalPaymentsService {

  /**
   * Initialize bank profiles with canonical data
   */
  static async initializeBankProfiles(): Promise<void> {
    const profiles = [
      {
        id: "alpha" as const,
        painVersion: "pain.001.001.03" as const,
        supportsInstant: true,
        sctInstAmountLimit: 100000,
        cutoffs: {
          sct: { weekdays: "1-5", time: "16:00" },
          sctInst: { alwaysOn: true },
        },
      },
      {
        id: "piraeus" as const,
        painVersion: "pain.001.001.03" as const,
        supportsInstant: true,
        sctInstAmountLimit: 100000,
        cutoffs: {
          sct: { weekdays: "1-5", time: "15:30" },
          sctInst: { alwaysOn: true },
        },
      },
      {
        id: "eurobank" as const,
        painVersion: "pain.001.001.03" as const,
        supportsInstant: true,
        sctInstAmountLimit: 100000,
        cutoffs: {
          sct: { weekdays: "1-5", time: "17:00" },
          sctInst: { alwaysOn: true },
        },
      },
      {
        id: "nbg" as const,
        painVersion: "pain.001.001.09" as const,
        supportsInstant: true,
        sctInstAmountLimit: 100000,
        cutoffs: {
          sct: { weekdays: "1-5", time: "16:15" },
          sctInst: { alwaysOn: true },
        },
      },
    ];

    for (const profile of profiles) {
      await db.insert(bankProfiles).values(profile).onConflictDoUpdate({
        target: bankProfiles.id,
        set: {
          painVersion: profile.painVersion,
          supportsInstant: profile.supportsInstant,
          sctInstAmountLimit: profile.sctInstAmountLimit,
          cutoffs: profile.cutoffs,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Build canonical payment batch from payroll run
   */
  static async buildCanonicalPaymentBatch(
    request: CanonicalBatchRequest
  ): Promise<CanonicalBatchResult> {
    const batchId = `BATCH-${nanoid(12)}`;
    
    // Get bank profile
    const [bankProfile] = await db
      .select()
      .from(bankProfiles)
      .where(eq(bankProfiles.id, request.bankProfileId))
      .limit(1);

    if (!bankProfile) {
      throw new Error(`Bank profile ${request.bankProfileId} not found`);
    }

    // Get payroll data for net pay
    const payrollData = await db
      .select({
        lineId: payrollLines.lineId,
        employeeId: payrollLines.employeeId,
        netAmount: payrollLines.netAmount,
        description: payrollLines.description,
      })
      .from(payrollLines)
      .where(and(
        eq(payrollLines.runId, request.runId),
        eq(payrollLines.earningCode, 'NET_PAY')
      ));

    if (payrollData.length === 0) {
      throw new Error(`No net pay transactions found for payroll run ${request.runId}`);
    }

    // Get employee bank details
    const employeeIds = payrollData.map(p => p.employeeId);
    const employeeData = await db
      .select({
        employeeId: employees.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        bankAccount: employees.bankAccount,
      })
      .from(employees)
      .where(sql`${employees.employeeId} = ANY(${employeeIds})`);

    const employeeLookup = new Map(employeeData.map(emp => [emp.employeeId, emp]));

    // Determine payment method
    const cutoffTime = this.parseCutoffTime(bankProfile.cutoffs.sct.time);
    const now = new Date();
    const pastCutoff = now.getHours() * 60 + now.getMinutes() > cutoffTime;

    let method: "SCT" | "SCT_INST" = request.method === "AUTO" 
      ? (pastCutoff && bankProfile.supportsInstant ? "SCT_INST" : "SCT")
      : (request.method || "SCT");

    // Create payment instructions
    const instructions = [];
    let totalAmount = 0;

    for (const payrollLine of payrollData) {
      const employee = employeeLookup.get(payrollLine.employeeId);
      if (!employee || !employee.bankAccount) continue;

      const amount = parseFloat(payrollLine.netAmount);
      if (amount <= 0) continue;

      // Check instant payment limits
      if (method === "SCT_INST" && bankProfile.sctInstAmountLimit && amount > bankProfile.sctInstAmountLimit) {
        method = "SCT"; // Fallback to SCT for high amounts
      }

      const instruction = {
        lineId: `LINE-${nanoid(12)}`,
        batchId,
        employeeId: employee.employeeId,
        endToEndId: `E2E-${request.runId}-${employee.employeeId}`,
        amount,
        currency: "EUR" as const,
        creditorName: `${employee.firstName} ${employee.lastName}`,
        creditorIban: employee.bankAccount,
        method,
        status: "prepared" as const,
        reconciliation: {},
      };

      instructions.push(instruction);
      totalAmount += amount;
    }

    // Create canonical batch
    const batch = {
      batchId,
      tenantId: request.tenantId,
      entityId: request.entityId,
      bankProfileId: request.bankProfileId,
      runId: request.runId,
      method,
      status: "prepared" as const,
      totals: {
        count: instructions.length,
        amount: totalAmount,
      },
      fileRefs: [],
      metadata: {
        createdBy: "PayrollSync",
        payrollRunId: request.runId,
      },
    };

    // Generate pain.001 XML
    const pain001Xml = this.generateCanonicalPain001(batch, instructions, bankProfile);

    // Save to database
    await db.insert(paymentBatches).values(batch);
    await db.insert(paymentInstructions).values(instructions);

    return {
      batchId,
      method,
      totals: batch.totals,
      instructions: instructions.map(inst => ({
        lineId: inst.lineId,
        employeeId: inst.employeeId,
        endToEndId: inst.endToEndId,
        amount: inst.amount,
        creditorName: inst.creditorName,
        creditorIban: inst.creditorIban,
        method: inst.method,
      })),
      pain001Xml,
    };
  }

  /**
   * Re-issue failed instructions as SCT Instant
   */
  static async reissueAsInstant(request: ReissueRequest): Promise<ReissueResult> {
    const newBatchId = `REISSUE-${nanoid(12)}`;

    // Get original batch
    const [originalBatch] = await db
      .select()
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, request.originalBatchId))
      .limit(1);

    if (!originalBatch) {
      throw new Error(`Original batch ${request.originalBatchId} not found`);
    }

    // Get failed instructions
    const failedInstructions = await db
      .select()
      .from(paymentInstructions)
      .where(and(
        eq(paymentInstructions.batchId, request.originalBatchId),
        sql`${paymentInstructions.lineId} = ANY(${request.failedLineIds})`
      ));

    if (failedInstructions.length === 0) {
      throw new Error("No failed instructions found to re-issue");
    }

    // Create new batch for re-issue
    const reissueBatch = {
      batchId: newBatchId,
      tenantId: originalBatch.tenantId,
      entityId: originalBatch.entityId,
      bankProfileId: originalBatch.bankProfileId,
      runId: originalBatch.runId,
      method: request.targetMethod,
      status: "prepared" as const,
      totals: {
        count: failedInstructions.length,
        amount: failedInstructions.reduce((sum, inst) => sum + parseFloat(inst.amount), 0),
      },
      fileRefs: [],
      supersedes: [request.originalBatchId],
      metadata: {
        reissueReason: request.reason,
        originalBatchId: request.originalBatchId,
      },
    };

    // Create new instructions for re-issue
    const reissueInstructions = failedInstructions.map(originalInst => ({
      lineId: `REISSUE-${nanoid(12)}`,
      batchId: newBatchId,
      employeeId: originalInst.employeeId,
      endToEndId: `REISSUE-${originalInst.endToEndId}`,
      amount: originalInst.amount,
      currency: originalInst.currency,
      creditorName: originalInst.creditorName,
      creditorIban: originalInst.creditorIban,
      method: request.targetMethod,
      status: "prepared" as const,
      originalLineId: originalInst.lineId,
      reconciliation: {},
    }));

    // Mark original instructions as superseded
    const supersededLineIds = failedInstructions.map(inst => inst.lineId);
    
    await db
      .update(paymentInstructions)
      .set({ 
        status: "superseded",
        updatedAt: new Date(),
      })
      .where(sql`${paymentInstructions.lineId} = ANY(${supersededLineIds})`);

    // Save new batch and instructions
    await db.insert(paymentBatches).values(reissueBatch);
    await db.insert(paymentInstructions).values(reissueInstructions);

    return {
      newBatchId,
      originalBatchSuperseded: true,
      reissuedInstructions: reissueInstructions.length,
      supersededLineIds,
    };
  }

  /**
   * Process pain.002 reconciliation
   */
  static async processPain002Reconciliation(
    batchId: string,
    pain002Data: {
      fileId: string;
      status: "ACCP" | "RJCT";
      transactions: Array<{
        endToEndId: string;
        status: string;
        reasonCode?: string;
      }>;
    }
  ): Promise<{ updated: number; accepted: number; rejected: number }> {
    let updated = 0;
    let accepted = 0;
    let rejected = 0;

    // Update batch status
    const batchStatus = pain002Data.status === "ACCP" ? "accepted" : "failed";
    await db
      .update(paymentBatches)
      .set({ 
        status: batchStatus,
        updatedAt: new Date(),
      })
      .where(eq(paymentBatches.batchId, batchId));
    updated++;

    // Update individual instructions
    for (const txn of pain002Data.transactions) {
      const instructionStatus = txn.status === "ACCP" ? "accepted" : "rejected";
      const reconciliation = {
        pain002: {
          fileId: pain002Data.fileId,
          ts: new Date().toISOString(),
          status: txn.status,
          reasonCode: txn.reasonCode,
        },
      };

      await db
        .update(paymentInstructions)
        .set({
          status: instructionStatus,
          reasonCode: txn.reasonCode,
          reconciliation,
          updatedAt: new Date(),
        })
        .where(and(
          eq(paymentInstructions.batchId, batchId),
          eq(paymentInstructions.endToEndId, txn.endToEndId)
        ));

      updated++;
      if (instructionStatus === "accepted") accepted++;
      if (instructionStatus === "rejected") rejected++;
    }

    // Update batch totals
    await db
      .update(paymentBatches)
      .set({
        totals: sql`jsonb_set(totals, '{accepted}', '${accepted}') || jsonb_set(totals, '{rejected}', '${rejected}')`,
        updatedAt: new Date(),
      })
      .where(eq(paymentBatches.batchId, batchId));

    return { updated, accepted, rejected };
  }

  /**
   * Process camt.054 reconciliation
   */
  static async processCamt054Reconciliation(
    batchId: string,
    camt054Data: {
      fileId: string;
      settlements: Array<{
        endToEndId: string;
        amount: number;
        bookingDate: string;
        bankTxId?: string;
        uetr?: string;
      }>;
    }
  ): Promise<{ settled: number; totalSettledAmount: number }> {
    let settled = 0;
    let totalSettledAmount = 0;

    for (const settlement of camt054Data.settlements) {
      const reconciliation = {
        camt: {
          fileId: camt054Data.fileId,
          ts: new Date().toISOString(),
          amount: settlement.amount,
          bookingDate: settlement.bookingDate,
        },
      };

      const bankRefs = {
        bankTxId: settlement.bankTxId,
        uetr: settlement.uetr,
      };

      await db
        .update(paymentInstructions)
        .set({
          status: "settled",
          bankRefs,
          reconciliation: sql`reconciliation || '${JSON.stringify(reconciliation)}'::jsonb`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(paymentInstructions.batchId, batchId),
          eq(paymentInstructions.endToEndId, settlement.endToEndId)
        ));

      settled++;
      totalSettledAmount += settlement.amount;
    }

    // Update batch status to settled if all instructions are settled
    const [batchTotals] = await db
      .select({ totals: paymentBatches.totals })
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, batchId))
      .limit(1);

    const totals = batchTotals?.totals as any;
    const allSettled = settled === totals?.count;

    await db
      .update(paymentBatches)
      .set({
        status: allSettled ? "settled" : "partially_settled",
        totals: sql`jsonb_set(totals, '{settled}', '${settled}')`,
        updatedAt: new Date(),
      })
      .where(eq(paymentBatches.batchId, batchId));

    return { settled, totalSettledAmount };
  }

  /**
   * Get batch with instructions
   */
  static async getBatchWithInstructions(batchId: string) {
    const [batch] = await db
      .select()
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, batchId))
      .limit(1);

    if (!batch) return null;

    const instructions = await db
      .select()
      .from(paymentInstructions)
      .where(eq(paymentInstructions.batchId, batchId));

    return {
      batch,
      instructions,
      totals: batch.totals as any,
      fileRefs: batch.fileRefs as any,
      metadata: batch.metadata as any,
    };
  }

  /**
   * Generate canonical pain.001 XML
   */
  private static generateCanonicalPain001(batch: any, instructions: any[], bankProfile: any): string {
    const now = new Date();
    const creationDateTime = now.toISOString();
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:${bankProfile.painVersion.replace(/\./g, ':')}">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>MSG-${batch.batchId}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${batch.totals.count}</NbOfTxs>
      <CtrlSum>${batch.totals.amount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>PayrollSync Entity</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-${batch.method}-${batch.batchId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${instructions.length}</NbOfTxs>
      <CtrlSum>${batch.totals.amount.toFixed(2)}</CtrlSum>
      <ReqdExctnDt>${now.toISOString().split('T')[0]}</ReqdExctnDt>
      ${batch.method === 'SCT_INST' ? '<SvcLvl><Cd>URGP</Cd></SvcLvl>' : ''}
      <Dbtr>
        <Nm>PayrollSync Entity</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>GR1601101250000000012300695</IBAN>
        </Id>
      </DbtrAcct>
      ${instructions.map(inst => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${inst.endToEndId}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${inst.currency}">${inst.amount.toFixed(2)}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${inst.creditorName}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${inst.creditorIban}</IBAN>
          </Id>
        </CdtrAcct>
      </CdtTrfTxInf>`).join('')}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
  }

  /**
   * Parse cut-off time to minutes
   */
  private static parseCutoffTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}