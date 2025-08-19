/**
 * Payments Operations Service - Real-time SEPA batch monitoring
 */

import { db } from '../db';
import { paymentBatches, paymentTransactions, bankProfiles, bankMessages, paymentExceptions } from '@shared/payments-schema';
import { eq, and, gte, lte, desc, count, sum, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface PaymentCockpitSummary {
  totalBatches: number;
  totalAmount: string;
  totalTransactions: number;
  statusBreakdown: {
    created: number;
    sent: number;
    accepted: number;
    rejected: number;
    settled: number;
    partially_settled: number;
  };
  paymentMethodBreakdown: {
    sct: { count: number; amount: string };
    sct_inst: { count: number; amount: string };
  };
  exceptionsSummary: {
    total: number;
    open: number;
    critical: number;
    reissueEligible: number;
  };
  cutOffStatus: {
    approaching: number;
    breached: number;
    recommendInstant: number;
  };
}

export interface BatchMonitoringDetails {
  batchId: string;
  entityId: string;
  runId: string;
  status: string;
  bankProfile: string;
  totalAmount: string;
  totalTransactions: number;
  sctBreakdown: { count: number; amount: string };
  sctInstBreakdown: { count: number; amount: string };
  reconciliation: {
    pain002Received: boolean;
    camt054Received: boolean;
    status: string;
    matchedTransactions: number;
    settledAmount: string;
  };
  cutOffInfo: {
    cutOffTime: Date | null;
    pastCutOff: boolean;
    recommendInstant: boolean;
    timeRemaining: string | null;
  };
  exceptions: Array<{
    exceptionId: string;
    type: string;
    severity: string;
    message: string;
    canReissue: boolean;
  }>;
  timeline: Array<{
    timestamp: Date;
    event: string;
    details: string;
  }>;
}

export interface ReissueRequest {
  originalTransactionIds: string[];
  targetMethod: 'SCT_INST';
  reason: string;
  urgency: 'HIGH' | 'URGP';
  doublePayProtection: boolean;
}

export interface ReissueResult {
  newBatchId: string;
  reissuedTransactions: number;
  totalAmount: string;
  protectedTransactions: string[];
  rejectedTransactions: Array<{
    transactionId: string;
    reason: string;
  }>;
}

export class PaymentsOpsService {

  /**
   * Get payments cockpit summary
   */
  static async getCockpitSummary(
    entityId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<PaymentCockpitSummary> {
    let query = db
      .select({
        batchId: paymentBatches.batchId,
        status: paymentBatches.status,
        totalAmount: paymentBatches.totalAmount,
        totalTransactions: paymentBatches.totalTransactions,
        sctCount: paymentBatches.sctCount,
        sctAmount: paymentBatches.sctAmount,
        sctInstCount: paymentBatches.sctInstCount,
        sctInstAmount: paymentBatches.sctInstAmount,
        pastCutOff: paymentBatches.pastCutOff,
        recommendInstant: paymentBatches.recommendInstant,
      })
      .from(paymentBatches)
      .where(eq(paymentBatches.entityId, entityId));

    if (dateRange) {
      query = query.where(
        and(
          eq(paymentBatches.entityId, entityId),
          gte(paymentBatches.createdAt, dateRange.start),
          lte(paymentBatches.createdAt, dateRange.end)
        )
      ) as any;
    }

    const batches = await query;

    // Calculate status breakdown
    const statusBreakdown = {
      created: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      settled: 0,
      partially_settled: 0,
    };

    let totalAmount = 0;
    let totalTransactions = 0;
    let sctTotal = { count: 0, amount: 0 };
    let sctInstTotal = { count: 0, amount: 0 };
    let approaching = 0, breached = 0, recommendInstant = 0;

    for (const batch of batches) {
      statusBreakdown[batch.status as keyof typeof statusBreakdown]++;
      totalAmount += parseFloat(batch.totalAmount);
      totalTransactions += batch.totalTransactions;
      
      sctTotal.count += batch.sctCount || 0;
      sctTotal.amount += parseFloat(batch.sctAmount || '0');
      sctInstTotal.count += batch.sctInstCount || 0;
      sctInstTotal.amount += parseFloat(batch.sctInstAmount || '0');

      if (batch.pastCutOff) breached++;
      if (batch.recommendInstant) recommendInstant++;
    }

    // Get exceptions summary
    const exceptionsQuery = await db
      .select({
        total: count(),
        severity: paymentExceptions.severity,
        status: paymentExceptions.status,
        canReissue: paymentExceptions.canReissue,
      })
      .from(paymentExceptions)
      .innerJoin(paymentBatches, eq(paymentExceptions.batchId, paymentBatches.batchId))
      .where(eq(paymentBatches.entityId, entityId))
      .groupBy(paymentExceptions.severity, paymentExceptions.status, paymentExceptions.canReissue);

    const exceptionsSummary = {
      total: 0,
      open: 0,
      critical: 0,
      reissueEligible: 0,
    };

    for (const exc of exceptionsQuery) {
      exceptionsSummary.total += exc.total;
      if (exc.status === 'open') exceptionsSummary.open += exc.total;
      if (exc.severity === 'critical') exceptionsSummary.critical += exc.total;
      if (exc.canReissue) exceptionsSummary.reissueEligible += exc.total;
    }

    return {
      totalBatches: batches.length,
      totalAmount: totalAmount.toFixed(2),
      totalTransactions,
      statusBreakdown,
      paymentMethodBreakdown: {
        sct: { count: sctTotal.count, amount: sctTotal.amount.toFixed(2) },
        sct_inst: { count: sctInstTotal.count, amount: sctInstTotal.amount.toFixed(2) },
      },
      exceptionsSummary,
      cutOffStatus: {
        approaching,
        breached,
        recommendInstant,
      },
    };
  }

  /**
   * Get detailed batch monitoring info
   */
  static async getBatchDetails(batchId: string): Promise<BatchMonitoringDetails | null> {
    const [batch] = await db
      .select()
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, batchId))
      .limit(1);

    if (!batch) return null;

    // Get reconciliation info
    const transactions = await db
      .select({
        transactionId: paymentTransactions.transactionId,
        status: paymentTransactions.status,
        settledAmount: paymentTransactions.settledAmount,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.batchId, batchId));

    const matchedTransactions = transactions.filter(t => t.status === 'settled').length;
    const settledAmount = transactions
      .reduce((sum, t) => sum + parseFloat(t.settledAmount || '0'), 0)
      .toFixed(2);

    // Get exceptions
    const exceptions = await db
      .select({
        exceptionId: paymentExceptions.exceptionId,
        exceptionType: paymentExceptions.exceptionType,
        severity: paymentExceptions.severity,
        errorMessage: paymentExceptions.errorMessage,
        canReissue: paymentExceptions.canReissue,
      })
      .from(paymentExceptions)
      .where(eq(paymentExceptions.batchId, batchId));

    // Calculate cut-off info
    const cutOffInfo = await this.calculateCutOffInfo(batch.bankProfile, batch.cutOffTime);

    // Build timeline
    const timeline = [
      { timestamp: batch.createdAt!, event: 'Batch Created', details: `${batch.totalTransactions} transactions` },
    ];

    if (batch.sentAt) {
      timeline.push({ timestamp: batch.sentAt, event: 'Sent to Bank', details: batch.bankProfile });
    }
    if (batch.acceptedAt) {
      timeline.push({ timestamp: batch.acceptedAt, event: 'Accepted by Bank', details: 'pain.002 received' });
    }
    if (batch.settledAt) {
      timeline.push({ timestamp: batch.settledAt, event: 'Settlement Complete', details: 'All transactions processed' });
    }

    return {
      batchId: batch.batchId,
      entityId: batch.entityId,
      runId: batch.runId,
      status: batch.status,
      bankProfile: batch.bankProfile,
      totalAmount: batch.totalAmount,
      totalTransactions: batch.totalTransactions,
      sctBreakdown: {
        count: batch.sctCount || 0,
        amount: batch.sctAmount || '0.00',
      },
      sctInstBreakdown: {
        count: batch.sctInstCount || 0,
        amount: batch.sctInstAmount || '0.00',
      },
      reconciliation: {
        pain002Received: batch.pain002Received || false,
        camt054Received: batch.camt054Received || false,
        status: batch.reconciliationStatus || 'pending',
        matchedTransactions,
        settledAmount,
      },
      cutOffInfo,
      exceptions: exceptions.map(exc => ({
        exceptionId: exc.exceptionId,
        type: exc.exceptionType,
        severity: exc.severity,
        message: exc.errorMessage || 'Unknown error',
        canReissue: exc.canReissue || false,
      })),
      timeline: timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    };
  }

  /**
   * Re-issue failed/pending transactions as SCT Instant
   */
  static async reissueAsInstant(
    entityId: string,
    request: ReissueRequest
  ): Promise<ReissueResult> {
    const newBatchId = `REISSUE-${nanoid(8)}`;
    const reissuedTransactions: any[] = [];
    const protectedTransactions: string[] = [];
    const rejectedTransactions: Array<{ transactionId: string; reason: string }> = [];

    // Get original transactions
    const originalTxns = await db
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.status, 'rejected'),
          sql`${paymentTransactions.transactionId} = ANY(ARRAY[${request.originalTransactionIds.map(() => '?').join(',')}])`, 
          ...request.originalTransactionIds
        )
      );

    for (const originalTxn of originalTxns) {
      // Check double-pay protection
      if (request.doublePayProtection && originalTxn.doublePayProtection) {
        protectedTransactions.push(originalTxn.transactionId);
        continue;
      }

      // Validate SCT Inst eligibility
      const bankProfile = await this.getBankProfile(originalTxn.batchId);
      if (!bankProfile?.supportsSctInst) {
        rejectedTransactions.push({
          transactionId: originalTxn.transactionId,
          reason: 'Bank does not support SCT Instant',
        });
        continue;
      }

      if (bankProfile.maxSctInstAmount && parseFloat(originalTxn.amount) > parseFloat(bankProfile.maxSctInstAmount)) {
        rejectedTransactions.push({
          transactionId: originalTxn.transactionId,
          reason: `Amount exceeds SCT Instant limit (€${bankProfile.maxSctInstAmount})`,
        });
        continue;
      }

      // Create new SCT Instant transaction
      const reissueTransaction = {
        transactionId: `REISSUE-${nanoid(12)}`,
        batchId: newBatchId,
        employeeId: originalTxn.employeeId,
        endToEndId: `REISSUE-${originalTxn.endToEndId}`,
        amount: originalTxn.amount,
        currency: originalTxn.currency,
        creditorName: originalTxn.creditorName,
        creditorAccount: originalTxn.creditorAccount,
        creditorBank: originalTxn.creditorBank,
        paymentMethod: 'SCT_INST' as const,
        urgency: request.urgency,
        originalTransactionId: originalTxn.transactionId,
        doublePayProtection: request.doublePayProtection,
        status: 'pending' as const,
      };

      reissuedTransactions.push(reissueTransaction);

      // Mark original as reissued
      await db
        .update(paymentTransactions)
        .set({
          reissuedAs: reissueTransaction.transactionId,
          doublePayProtection: true,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.transactionId, originalTxn.transactionId));
    }

    // Create new batch if we have transactions to reissue
    if (reissuedTransactions.length > 0) {
      const totalAmount = reissuedTransactions
        .reduce((sum, txn) => sum + parseFloat(txn.amount), 0)
        .toFixed(2);

      // Create reissue batch
      const reissueBatch = {
        batchId: newBatchId,
        entityId,
        runId: `REISSUE-${Date.now()}`,
        batchType: 'payroll',
        messageId: `MSG-${newBatchId}`,
        requestedExecutionDate: new Date(),
        bankProfile: originalTxns[0]?.batchId ? (await this.getBankProfile(originalTxns[0].batchId))?.profileId || 'alpha' : 'alpha',
        debtorAccount: 'GR1601101250000000012300695', // Mock IBAN
        debtorName: 'PayrollSync Entity',
        totalTransactions: reissuedTransactions.length,
        totalAmount,
        sctCount: 0,
        sctAmount: '0.00',
        sctInstCount: reissuedTransactions.length,
        sctInstAmount: totalAmount,
        status: 'created',
      };

      await db.insert(paymentBatches).values(reissueBatch);
      await db.insert(paymentTransactions).values(reissuedTransactions);
    }

    return {
      newBatchId,
      reissuedTransactions: reissuedTransactions.length,
      totalAmount: reissuedTransactions
        .reduce((sum, txn) => sum + parseFloat(txn.amount), 0)
        .toFixed(2),
      protectedTransactions,
      rejectedTransactions,
    };
  }

  /**
   * Process bank reconciliation message
   */
  static async processReconciliationMessage(
    messageType: 'pain.002' | 'camt.054' | 'camt.053',
    originalMessageId: string,
    messageData: any
  ): Promise<{ processed: boolean; batchId?: string; updates: number }> {
    // Find matching batch by message ID
    const [batch] = await db
      .select()
      .from(paymentBatches)
      .where(eq(paymentBatches.messageId, originalMessageId))
      .limit(1);

    if (!batch) {
      return { processed: false, updates: 0 };
    }

    let updates = 0;

    // Process pain.002 (Payment Status Report)
    if (messageType === 'pain.002') {
      await db
        .update(paymentBatches)
        .set({
          pain002Received: true,
          status: messageData.status === 'ACCP' ? 'accepted' : 'rejected',
          acceptedAt: messageData.status === 'ACCP' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(paymentBatches.batchId, batch.batchId));

      updates++;

      // Update individual transactions if rejection details provided
      if (messageData.rejectedTransactions) {
        for (const rejection of messageData.rejectedTransactions) {
          await db
            .update(paymentTransactions)
            .set({
              status: 'rejected',
              rejectReason: rejection.reasonText,
              updatedAt: new Date(),
            })
            .where(eq(paymentTransactions.endToEndId, rejection.endToEndId));
          
          updates++;
        }
      }
    }

    // Process camt.054 (Bank Notification)
    if (messageType === 'camt.054') {
      await db
        .update(paymentBatches)
        .set({
          camt054Received: true,
          reconciliationStatus: 'matched',
          settledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(paymentBatches.batchId, batch.batchId));

      updates++;

      // Update settled transactions
      if (messageData.settledTransactions) {
        for (const settlement of messageData.settledTransactions) {
          await db
            .update(paymentTransactions)
            .set({
              status: 'settled',
              settledAmount: settlement.amount,
              bankReference: settlement.bankReference,
              settledAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(paymentTransactions.endToEndId, settlement.endToEndId));
          
          updates++;
        }
      }
    }

    // Store raw message
    await db.insert(bankMessages).values({
      messageId: nanoid(),
      batchId: batch.batchId,
      messageType,
      originalMessageId,
      status: messageData.status || 'PROCESSED',
      rawMessage: JSON.stringify(messageData),
      parsedData: messageData,
      processedAt: new Date(),
    });

    return {
      processed: true,
      batchId: batch.batchId,
      updates,
    };
  }

  /**
   * Calculate cut-off information
   */
  private static async calculateCutOffInfo(
    bankProfileId: string,
    cutOffTime: Date | null
  ): Promise<{
    cutOffTime: Date | null;
    pastCutOff: boolean;
    recommendInstant: boolean;
    timeRemaining: string | null;
  }> {
    if (!cutOffTime) {
      return {
        cutOffTime: null,
        pastCutOff: false,
        recommendInstant: false,
        timeRemaining: null,
      };
    }

    const now = new Date();
    const pastCutOff = now > cutOffTime;
    const timeRemaining = pastCutOff ? null : this.formatTimeRemaining(cutOffTime.getTime() - now.getTime());
    
    // Recommend instant if within 30 minutes of cut-off or past it
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const recommendInstant = cutOffTime <= thirtyMinutesFromNow;

    return {
      cutOffTime,
      pastCutOff,
      recommendInstant,
      timeRemaining,
    };
  }

  /**
   * Get bank profile by batch ID
   */
  private static async getBankProfile(batchId: string): Promise<any | null> {
    const batchResult = await db
      .select({ bankProfile: paymentBatches.bankProfile })
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, batchId))
      .limit(1);

    if (batchResult.length === 0) return null;
    const batch = batchResult[0];

    const profileResult = await db
      .select()
      .from(bankProfiles)
      .where(eq(bankProfiles.profileId, batch.bankProfile))
      .limit(1);

    return profileResult.length > 0 ? profileResult[0] : null;
  }

  /**
   * Format time remaining
   */
  private static formatTimeRemaining(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get bank profiles with cut-off information
   */
  static async getBankProfiles(): Promise<any[]> {
    return db.select().from(bankProfiles).where(eq(bankProfiles.isActive, true));
  }
}