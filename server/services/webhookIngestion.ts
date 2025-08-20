/**
 * Webhook Ingestion Service for Bank Settlement Notifications
 * Handles pain.002 (Status Report) and camt.054 (Debit Credit Notification)
 * 
 * Supports instant re-issue settlement tracking and SLA monitoring
 */

import { db } from '../db';
import { paymentTransactions, paymentBatches, webhookEvents } from '@shared/payments-schema';
import { InstantReissueService } from './InstantReissueService';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface Pain002StatusReport {
  messageId: string;
  creationDateTime: string;
  originalMessageId: string;
  originalInstructionId?: string;
  transactionStatus: 'ACCP' | 'RJCT' | 'PDNG' | 'ACSC' | 'ACWC';
  statusReason?: string;
  endToEndId: string;
  instructionId?: string;
  uetr?: string;
  bankReference?: string;
}

export interface Camt054DebitCredit {
  messageId: string;
  creationDateTime: string;
  accountId: string;
  statementId: string;
  entries: Array<{
    entryId: string;
    amount: number;
    currency: string;
    creditDebitIndicator: 'CRDT' | 'DBIT';
    status: 'BOOK' | 'PDNG' | 'INFO';
    bookingDate: string;
    valueDate: string;
    transactions: Array<{
      endToEndId: string;
      transactionId?: string;
      amount: number;
      currency: string;
      remittanceInfo?: string;
      uetr?: string;
      bankReference?: string;
      counterpartyName?: string;
      counterpartyAccount?: string;
    }>;
  }>;
}

export class WebhookIngestionService {

  /**
   * Process pain.002 status report (payment status update)
   */
  static async processPain002StatusReport(
    statusReport: Pain002StatusReport,
    bankProfile: string
  ): Promise<{ processed: boolean; affectedTransactions: string[] }> {
    const startTime = Date.now();
    const affectedTransactions: string[] = [];

    try {
      // Log webhook event
      await this.logWebhookEvent({
        type: 'pain.002',
        messageId: statusReport.messageId,
        bankProfile,
        payload: statusReport,
        status: 'processing',
      });

      // Find matching transaction by EndToEndId
      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.endToEndId, statusReport.endToEndId))
        .limit(1);

      if (!transaction) {
        console.warn(`No transaction found for EndToEndId: ${statusReport.endToEndId}`);
        return { processed: false, affectedTransactions: [] };
      }

      // Map pain.002 status to internal status
      const newStatus = this.mapPain002Status(statusReport.transactionStatus);
      const previousStatus = transaction.status;

      // Update transaction status
      await db
        .update(paymentTransactions)
        .set({
          status: newStatus,
          bankReference: statusReport.bankReference || transaction.bankReference,
        })
        .where(eq(paymentTransactions.transactionId, transaction.transactionId));

      affectedTransactions.push(transaction.transactionId);

      // Handle instant re-issue specific logic
      if (transaction.endToEndId?.includes('-R1')) {
        await this.handleInstantReissueStatusUpdate(
          transaction,
          newStatus,
          previousStatus,
          statusReport
        );
      }

      // Mark webhook as processed
      await this.updateWebhookStatus(statusReport.messageId, 'processed');

      return { processed: true, affectedTransactions };

    } catch (error) {
      console.error('Pain.002 processing failed:', error);
      await this.updateWebhookStatus(statusReport.messageId, 'failed');
      throw error;
    }
  }

  /**
   * Process camt.054 debit/credit notification (settlement confirmation)
   */
  static async processCamt054DebitCredit(
    notification: Camt054DebitCredit,
    bankProfile: string
  ): Promise<{ processed: boolean; settledTransactions: string[] }> {
    const startTime = Date.now();
    const settledTransactions: string[] = [];

    try {
      // Log webhook event
      await this.logWebhookEvent({
        type: 'camt.054',
        messageId: notification.messageId,
        bankProfile,
        payload: notification,
        status: 'processing',
      });

      // Process each entry and transaction
      for (const entry of notification.entries) {
        if (entry.status === 'BOOK') { // Only process booked transactions
          for (const txn of entry.transactions) {
            // Find matching payment transaction
            const [paymentTxn] = await db
              .select()
              .from(paymentTransactions)
              .where(eq(paymentTransactions.endToEndId, txn.endToEndId))
              .limit(1);

            if (paymentTxn) {
              const settlementDetails = {
                settledAt: new Date(entry.valueDate),
                bankReference: txn.bankReference || entry.entryId,
              };

              // Handle settlement through InstantReissueService
              await InstantReissueService.handleSettlement(
                paymentTxn.transactionId,
                settlementDetails
              );

              settledTransactions.push(paymentTxn.transactionId);
            }
          }
        }
      }

      // Mark webhook as processed
      await this.updateWebhookStatus(notification.messageId, 'processed');

      return { processed: true, settledTransactions };

    } catch (error) {
      console.error('Camt.054 processing failed:', error);
      await this.updateWebhookStatus(notification.messageId, 'failed');
      throw error;
    }
  }

  /**
   * Handle SLA monitoring for instant re-issues
   */
  static async monitorInstantReissueSLA(): Promise<void> {
    try {
      // Find instant re-issues submitted > 2 minutes ago without settlement
      const timeoutTransactions = await db
        .select()
        .from(paymentTransactions)
        .innerJoin(paymentBatches, eq(paymentTransactions.batchId, paymentBatches.batchId))
        .where(and(
          eq(paymentTransactions.paymentMethod, 'SCT_INST'),
          eq(paymentTransactions.status, 'submitted')
          // submittedAt < 2 minutes ago logic would go here
        ));

      for (const txn of timeoutTransactions) {
        // Update status to 'accepted' (awaiting confirmation)
        await db
          .update(paymentTransactions)
          .set({
            status: 'accepted',
            rejectReason: 'Awaiting settlement confirmation - SLA timeout',
          })
          .where(eq(paymentTransactions.transactionId, txn.payment_transactions.transactionId));

        // Note: NO supersede reversal occurs - original stays superseded
        console.warn(`Instant re-issue SLA timeout: ${txn.payment_transactions.transactionId}`);
      }

    } catch (error) {
      console.error('SLA monitoring failed:', error);
    }
  }

  /**
   * Map pain.002 transaction status to internal status
   */
  private static mapPain002Status(pain002Status: string): string {
    const statusMap: Record<string, string> = {
      'ACCP': 'accepted',  // AcceptedCustomerCreditTransferInitiation
      'RJCT': 'rejected',  // Rejected
      'PDNG': 'pending',   // Pending
      'ACSC': 'settled',   // AcceptedSettlementCompleted
      'ACWC': 'accepted',  // AcceptedWithChange
    };

    return statusMap[pain002Status] || 'unknown';
  }

  /**
   * Handle instant re-issue specific status updates
   */
  private static async handleInstantReissueStatusUpdate(
    transaction: any,
    newStatus: string,
    previousStatus: string,
    statusReport: Pain002StatusReport
  ): Promise<void> {
    // If instant re-issue is rejected, we may need to notify operator
    if (newStatus === 'rejected') {
      console.warn(`Instant re-issue rejected: ${transaction.transactionId}, reason: ${statusReport.statusReason}`);
    }

    // If instant re-issue is accepted, start settlement timer
    if (newStatus === 'accepted' && previousStatus !== 'accepted') {
      // Start SLA monitoring for this specific transaction
      setTimeout(async () => {
        await this.checkIndividualSLA(transaction.transactionId);
      }, 30000); // Check after 30 seconds
    }
  }

  /**
   * Check SLA for individual transaction
   */
  private static async checkIndividualSLA(transactionId: string): Promise<void> {
    const [txn] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.transactionId, transactionId));

    if (txn && txn.status !== 'settled') {
      // SLA breach - update status but don't reverse supersede
      await db
        .update(paymentTransactions)
        .set({
          status: 'accepted',
          rejectReason: 'Awaiting settlement - exceeds 30s SLA',
        })
        .where(eq(paymentTransactions.transactionId, transactionId));
    }
  }

  /**
   * Log webhook event for traceability
   */
  private static async logWebhookEvent(event: {
    type: string;
    messageId: string;
    bankProfile: string;
    payload: any;
    status: 'processing' | 'processed' | 'failed';
  }): Promise<void> {
    try {
      await db.insert(webhookEvents).values({
        eventId: nanoid(12),
        type: event.type,
        messageId: event.messageId,
        bankProfile: event.bankProfile,
        payload: JSON.stringify(event.payload),
        status: event.status,
        receivedAt: new Date(),
        processedAt: event.status === 'processed' ? new Date() : undefined,
      });
    } catch (error) {
      console.error('Failed to log webhook event:', error);
    }
  }

  /**
   * Update webhook processing status
   */
  private static async updateWebhookStatus(
    messageId: string, 
    status: 'processed' | 'failed'
  ): Promise<void> {
    try {
      await db
        .update(webhookEvents)
        .set({
          status,
          processedAt: new Date(),
        })
        .where(eq(webhookEvents.messageId, messageId));
    } catch (error) {
      console.error('Failed to update webhook status:', error);
    }
  }

  /**
   * Get webhook event traces for debugging
   */
  static async getEventTraces(filters: {
    messageId?: string;
    type?: string;
    bankProfile?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<any[]> {
    const events = await db
      .select()
      .from(webhookEvents)
      .orderBy(webhookEvents.receivedAt);
    
    return events.map(event => ({
      ...event,
      payload: JSON.parse(event.payload),
    }));
  }
}