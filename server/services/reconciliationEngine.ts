/**
 * Reconciliation Engine - pain.002 and camt.054/053 processing
 */

import { db } from '../db';
import { paymentBatches, paymentInstructions } from '@shared/payments-canonical-schema';
import { eq, and, sql, or } from 'drizzle-orm';
import { PaymentStateMachine } from './paymentStateMachine';
import crypto from 'crypto';

// =============================================================================
// RECONCILIATION TYPES
// =============================================================================

export interface Pain002Transaction {
  endToEndId: string;
  originalInstructionId?: string;
  status: 'ACCP' | 'RJCT';
  reasonCode?: string; // AM04, AC04, FF01, etc.
  additionalInfo?: string;
  bankReference?: string;
}

export interface Pain002Message {
  fileId: string;
  messageId: string;
  originalMessageId: string;
  creationDateTime: string;
  batchStatus: 'ACCP' | 'RJCT';
  transactions: Pain002Transaction[];
  bankTimestamp?: string;
}

export interface CamtSettlement {
  endToEndId: string;
  instructionId?: string;
  amount: number;
  currency: string;
  debtorIban: string;
  creditorIban: string;
  bookingDate: string;
  valueDate: string;
  bankTxId?: string;
  uetr?: string; // SCT Inst unique end-to-end transaction reference
  settlementMethod?: 'SCT' | 'SCT_INST';
}

export interface CamtMessage {
  fileId: string;
  messageId: string;
  accountId: string;
  accountIban: string;
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  settlements: CamtSettlement[];
  bankTimestamp?: string;
}

export interface ReconciliationMatch {
  matchType: 'EXACT_E2E' | 'AMOUNT_IBAN' | 'FUZZY' | 'NO_MATCH';
  confidence: number; // 0-100
  lineId: string;
  batchId: string;
  endToEndId: string;
  manualReviewRequired: boolean;
  matchedOn: string[]; // fields that matched
  discrepancies: string[]; // fields that didn't match
}

export interface IngestionResult {
  success: boolean;
  processed: number;
  matched: number;
  unmatched: number;
  duplicates: number;
  errors: string[];
  matches: ReconciliationMatch[];
}

// =============================================================================
// RECONCILIATION ENGINE
// =============================================================================

export class ReconciliationEngine {
  private static ingestionCache = new Map<string, string>(); // fileId+txId -> hash

  /**
   * Ingest pain.002 status report with idempotent processing
   */
  static async ingestPain002(pain002: Pain002Message): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: false,
      processed: 0,
      matched: 0,
      unmatched: 0,
      duplicates: 0,
      errors: [],
      matches: [],
    };

    try {
      // Find matching batch by original message ID
      const [batch] = await db
        .select()
        .from(paymentBatches)
        .where(sql`metadata->>'originalMessageId' = ${pain002.originalMessageId}`)
        .limit(1);

      if (!batch) {
        // Try alternative matching by runId or other identifiers
        const batchCandidates = await db
          .select()
          .from(paymentBatches)
          .where(eq(paymentBatches.status, 'submitted'))
          .limit(10);

        // For demo, use first candidate
        if (batchCandidates.length === 0) {
          result.errors.push(`No matching batch found for original message ID: ${pain002.originalMessageId}`);
          return result;
        }
      }

      const targetBatch = batch || { batchId: 'DEMO-BATCH' };

      // Process each transaction in pain.002
      for (const txn of pain002.transactions) {
        const ingestionKey = `${pain002.fileId}-${txn.endToEndId}`;
        const txnHash = this.generateTransactionHash(txn);

        // Check for duplicate ingestion (idempotent)
        if (this.ingestionCache.has(ingestionKey) && this.ingestionCache.get(ingestionKey) === txnHash) {
          result.duplicates++;
          continue;
        }

        // Find matching payment instruction
        const matchResult = await this.matchPain002Transaction(targetBatch.batchId, txn);
        
        if (matchResult.matchType !== 'NO_MATCH') {
          // Update payment instruction status
          const newStatus = txn.status === 'ACCP' ? 'accepted' : 'rejected';
          
          await PaymentStateMachine.transitionLineStatus(
            matchResult.lineId,
            newStatus as any,
            txn.reasonCode,
            `pain.002 reconciliation: ${txn.status}`
          );

          // Update reconciliation data
          await db
            .update(paymentInstructions)
            .set({
              reconciliation: sql`reconciliation || ${JSON.stringify({
                pain002: {
                  fileId: pain002.fileId,
                  ts: pain002.bankTimestamp || new Date().toISOString(),
                  status: txn.status,
                  reasonCode: txn.reasonCode,
                },
              })}::jsonb`,
              updatedAt: new Date(),
            })
            .where(eq(paymentInstructions.lineId, matchResult.lineId));

          result.matched++;
          result.matches.push(matchResult);
        } else {
          result.unmatched++;
        }

        // Cache for idempotent processing
        this.ingestionCache.set(ingestionKey, txnHash);
        result.processed++;
      }

      // Auto-update batch status based on line changes
      if (targetBatch.batchId !== 'DEMO-BATCH') {
        await PaymentStateMachine.autoUpdateBatchStatus(targetBatch.batchId);
      }

      result.success = true;
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error during pain.002 ingestion');
      return result;
    }
  }

  /**
   * Ingest camt.054/053 settlement notification with idempotent processing
   */
  static async ingestCamtSettlement(camt: CamtMessage): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: false,
      processed: 0,
      matched: 0,
      unmatched: 0,
      duplicates: 0,
      errors: [],
      matches: [],
    };

    try {
      // Process each settlement in camt message
      for (const settlement of camt.settlements) {
        const ingestionKey = `${camt.fileId}-${settlement.endToEndId || settlement.bankTxId}`;
        const settlementHash = this.generateSettlementHash(settlement);

        // Check for duplicate ingestion (idempotent)
        if (this.ingestionCache.has(ingestionKey) && this.ingestionCache.get(ingestionKey) === settlementHash) {
          result.duplicates++;
          continue;
        }

        // Find matching payment instruction with priority matching
        const matchResult = await this.matchCamtSettlement(settlement);
        
        if (matchResult.matchType !== 'NO_MATCH') {
          // Update payment instruction to settled
          await PaymentStateMachine.transitionLineStatus(
            matchResult.lineId,
            'settled',
            undefined,
            `camt settlement reconciliation: ${settlement.settlementMethod || 'SETTLED'}`
          );

          // Update reconciliation data and bank references
          await db
            .update(paymentInstructions)
            .set({
              reconciliation: sql`reconciliation || ${JSON.stringify({
                camt: {
                  fileId: camt.fileId,
                  ts: camt.bankTimestamp || new Date().toISOString(),
                  amount: settlement.amount,
                  bookingDate: settlement.bookingDate,
                },
              })}::jsonb`,
              bankRefs: sql`COALESCE(bank_refs, '{}') || ${JSON.stringify({
                bankTxId: settlement.bankTxId,
                uetr: settlement.uetr,
              })}::jsonb`,
              updatedAt: new Date(),
            })
            .where(eq(paymentInstructions.lineId, matchResult.lineId));

          result.matched++;
          result.matches.push(matchResult);

          // Auto-update batch status
          await PaymentStateMachine.autoUpdateBatchStatus(matchResult.batchId);
        } else {
          result.unmatched++;
        }

        // Cache for idempotent processing
        this.ingestionCache.set(ingestionKey, settlementHash);
        result.processed++;
      }

      result.success = true;
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error during camt ingestion');
      return result;
    }
  }

  /**
   * Match pain.002 transaction with priority logic
   */
  private static async matchPain002Transaction(
    batchId: string,
    transaction: Pain002Transaction
  ): Promise<ReconciliationMatch> {
    
    // Priority 1: Exact EndToEndId match
    const exactMatch = await db
      .select()
      .from(paymentInstructions)
      .where(and(
        eq(paymentInstructions.batchId, batchId),
        eq(paymentInstructions.endToEndId, transaction.endToEndId)
      ))
      .limit(1);

    if (exactMatch.length > 0) {
      return {
        matchType: 'EXACT_E2E',
        confidence: 100,
        lineId: exactMatch[0].lineId,
        batchId,
        endToEndId: transaction.endToEndId,
        manualReviewRequired: false,
        matchedOn: ['endToEndId'],
        discrepancies: [],
      };
    }

    // Priority 2: Fallback to original instruction ID if available
    if (transaction.originalInstructionId) {
      const instructionMatch = await db
        .select()
        .from(paymentInstructions)
        .where(and(
          eq(paymentInstructions.batchId, batchId),
          sql`end_to_end_id LIKE '%${transaction.originalInstructionId}%'`
        ))
        .limit(1);

      if (instructionMatch.length > 0) {
        return {
          matchType: 'FUZZY',
          confidence: 80,
          lineId: instructionMatch[0].lineId,
          batchId,
          endToEndId: transaction.endToEndId,
          manualReviewRequired: true,
          matchedOn: ['originalInstructionId'],
          discrepancies: ['endToEndId'],
        };
      }
    }

    // No match found
    return {
      matchType: 'NO_MATCH',
      confidence: 0,
      lineId: '',
      batchId,
      endToEndId: transaction.endToEndId,
      manualReviewRequired: true,
      matchedOn: [],
      discrepancies: ['no_matching_instruction'],
    };
  }

  /**
   * Match camt settlement with priority logic
   */
  private static async matchCamtSettlement(
    settlement: CamtSettlement
  ): Promise<ReconciliationMatch> {
    
    // Priority 1: Exact EndToEndId match
    if (settlement.endToEndId) {
      const exactMatch = await db
        .select()
        .from(paymentInstructions)
        .where(eq(paymentInstructions.endToEndId, settlement.endToEndId))
        .limit(1);

      if (exactMatch.length > 0) {
        // Verify amount matches
        const amountMatches = Math.abs(parseFloat(exactMatch[0].amount) - settlement.amount) < 0.01;
        
        return {
          matchType: 'EXACT_E2E',
          confidence: amountMatches ? 100 : 90,
          lineId: exactMatch[0].lineId,
          batchId: exactMatch[0].batchId,
          endToEndId: settlement.endToEndId,
          manualReviewRequired: !amountMatches,
          matchedOn: amountMatches ? ['endToEndId', 'amount'] : ['endToEndId'],
          discrepancies: amountMatches ? [] : ['amount'],
        };
      }
    }

    // Priority 2: Amount + IBAN match within recent batches
    const amountIbanMatch = await db
      .select()
      .from(paymentInstructions)
      .where(and(
        eq(paymentInstructions.amount, settlement.amount.toString()),
        eq(paymentInstructions.creditorIban, settlement.creditorIban),
        eq(paymentInstructions.status, 'accepted')
      ))
      .limit(5);

    if (amountIbanMatch.length === 1) {
      return {
        matchType: 'AMOUNT_IBAN',
        confidence: 85,
        lineId: amountIbanMatch[0].lineId,
        batchId: amountIbanMatch[0].batchId,
        endToEndId: settlement.endToEndId || 'SETTLEMENT_MATCH',
        manualReviewRequired: false,
        matchedOn: ['amount', 'creditorIban'],
        discrepancies: ['endToEndId'],
      };
    } else if (amountIbanMatch.length > 1) {
      // Multiple matches - requires manual review
      return {
        matchType: 'FUZZY',
        confidence: 60,
        lineId: amountIbanMatch[0].lineId,
        batchId: amountIbanMatch[0].batchId,
        endToEndId: settlement.endToEndId || 'MULTIPLE_MATCHES',
        manualReviewRequired: true,
        matchedOn: ['amount', 'creditorIban'],
        discrepancies: ['multiple_candidates'],
      };
    }

    // Priority 3: Fuzzy amount match (within batch context)
    const fuzzyMatch = await db
      .select()
      .from(paymentInstructions)
      .where(and(
        sql`ABS(CAST(amount AS DECIMAL) - ${settlement.amount}) < 1.00`,
        eq(paymentInstructions.status, 'accepted')
      ))
      .limit(3);

    if (fuzzyMatch.length === 1) {
      return {
        matchType: 'FUZZY',
        confidence: 70,
        lineId: fuzzyMatch[0].lineId,
        batchId: fuzzyMatch[0].batchId,
        endToEndId: settlement.endToEndId || 'FUZZY_MATCH',
        manualReviewRequired: true,
        matchedOn: ['amount_fuzzy'],
        discrepancies: ['endToEndId', 'creditorIban'],
      };
    }

    // No match found
    return {
      matchType: 'NO_MATCH',
      confidence: 0,
      lineId: '',
      batchId: '',
      endToEndId: settlement.endToEndId || 'UNKNOWN',
      manualReviewRequired: true,
      matchedOn: [],
      discrepancies: ['no_matching_instruction'],
    };
  }

  /**
   * Generate transaction hash for idempotent processing
   */
  private static generateTransactionHash(transaction: Pain002Transaction): string {
    const data = JSON.stringify({
      endToEndId: transaction.endToEndId,
      status: transaction.status,
      reasonCode: transaction.reasonCode,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate settlement hash for idempotent processing
   */
  private static generateSettlementHash(settlement: CamtSettlement): string {
    const data = JSON.stringify({
      endToEndId: settlement.endToEndId,
      amount: settlement.amount,
      debtorIban: settlement.debtorIban,
      creditorIban: settlement.creditorIban,
      bookingDate: settlement.bookingDate,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get reconciliation statistics
   */
  static async getReconciliationStats(
    entityId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalInstructions: number;
    pain002Processed: number;
    camtSettled: number;
    unmatched: number;
    manualReviewRequired: number;
    reconciliationRate: number;
  }> {
    
    // This would query actual data - simplified for demo
    return {
      totalInstructions: 1000,
      pain002Processed: 980,
      camtSettled: 950,
      unmatched: 30,
      manualReviewRequired: 20,
      reconciliationRate: 95.0,
    };
  }

  /**
   * Get unmatched transactions for manual review
   */
  static async getUnmatchedTransactions(
    entityId: string,
    limit: number = 50
  ): Promise<Array<{
    type: 'pain002' | 'camt';
    endToEndId: string;
    amount?: number;
    status?: string;
    reasonCode?: string;
    bankTimestamp: string;
    confidence: number;
    suggestedMatches: ReconciliationMatch[];
  }>> {
    
    // This would query actual unmatched data - simplified for demo
    return [
      {
        type: 'camt',
        endToEndId: 'E2E-UNKNOWN-123',
        amount: 1250.50,
        bankTimestamp: new Date().toISOString(),
        confidence: 60,
        suggestedMatches: [],
      },
      {
        type: 'pain002',
        endToEndId: 'E2E-REJECTED-456',
        status: 'RJCT',
        reasonCode: 'AM04',
        bankTimestamp: new Date().toISOString(),
        confidence: 0,
        suggestedMatches: [],
      },
    ];
  }

  /**
   * Clear ingestion cache (for testing/maintenance)
   */
  static clearIngestionCache(): void {
    this.ingestionCache.clear();
  }
}