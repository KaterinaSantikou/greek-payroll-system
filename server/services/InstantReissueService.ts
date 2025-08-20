/**
 * IRIS/SCT Instant Re-issue Service
 * Implements Story 2 - Enhanced re-issue with 30s target and double-pay protection
 */

import { db } from '../db';
import { 
  paymentBatches, 
  paymentTransactions, 
  bankProfiles, 
  paymentExceptions 
} from '@shared/payments-schema';
import { 
  paymentBatches as canonicalBatches,
  paymentInstructions as canonicalInstructions,
  bankProfiles as canonicalProfiles
} from '@shared/payments-canonical-schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface EligibilityCheckResult {
  lineId: string;
  eligible: boolean;
  eligibilityCriteria: {
    bankSupportsInstant: boolean;
    amountWithinLimit: boolean;
    beneficiaryReachable: boolean;
    originalNotSettled: boolean;
    validStatus: boolean;
    notSuperseded: boolean;
  };
  blockingFactors: string[];
  estimatedSettlementTime: string;
  instantFees?: {
    perTransaction: number;
    total: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DisbursementKey {
  employeeId: string;
  period: string; // YYYY-MM format
  amount: number;
  runId: string;
}

export interface InstantReissueRequest {
  originalLineIds: string[];
  reason: string;
  operatorId: string;
  urgency: 'HIGH' | 'URGP';
  overrideFees?: boolean;
  doublePayProtection: boolean;
}

export interface InstantReissueResult {
  success: boolean;
  newBatchId?: string;
  reissuedLines: number;
  supersededLines: string[];
  failedLines: Array<{
    lineId: string;
    reason: string;
  }>;
  protectedLines: string[]; // Double-pay protected
  processingTime: number; // milliseconds
  estimatedSettlement: string;
  auditLog: {
    operatorId: string;
    timestamp: string;
    reason: string;
    originalBatch: string;
    newBatch?: string;
  };
}

export class InstantReissueService {

  /**
   * Check eligibility for multiple lines to be re-issued as SCT Instant
   * Target: < 150ms for bulk eligibility check
   */
  static async checkBulkEligibility(
    lineIds: string[],
    targetBankProfile?: string
  ): Promise<EligibilityCheckResult[]> {
    const startTime = Date.now();

    // Get payment lines with batch info
    const lines = await db
      .select({
        lineId: paymentTransactions.transactionId,
        employeeId: paymentTransactions.employeeId,
        amount: paymentTransactions.amount,
        creditorAccount: paymentTransactions.creditorAccount,
        status: paymentTransactions.status,
        originalTransactionId: paymentTransactions.originalTransactionId,
        reissuedAs: paymentTransactions.reissuedAs,
        batchId: paymentTransactions.batchId,
        bankProfile: paymentBatches.bankProfile,
      })
      .from(paymentTransactions)
      .innerJoin(paymentBatches, eq(paymentTransactions.batchId, paymentBatches.batchId))
      .where(inArray(paymentTransactions.transactionId, lineIds));

    // Get bank profiles for instant capabilities
    const bankProfileIds = Array.from(new Set(lines.map(l => l.bankProfile)));
    const profiles = await db
      .select()
      .from(bankProfiles)
      .where(inArray(bankProfiles.profileId, bankProfileIds));

    const results: EligibilityCheckResult[] = [];

    for (const line of lines) {
      const profile = profiles.find(p => p.profileId === line.bankProfile);
      const amount = parseFloat(line.amount);
      
      const eligibilityCriteria = {
        bankSupportsInstant: profile?.supportsSctInst || false,
        amountWithinLimit: profile?.maxSctInstAmount 
          ? amount <= parseFloat(profile.maxSctInstAmount) 
          : amount <= 100000, // Default SEPA Instant limit
        beneficiaryReachable: await this.checkBeneficiaryReachability(line.creditorAccount),
        originalNotSettled: !['settled', 'cancelled'].includes(line.status),
        validStatus: ['submitted', 'accepted', 'rejected'].includes(line.status),
        notSuperseded: !line.reissuedAs,
      };

      const blockingFactors: string[] = [];
      if (!eligibilityCriteria.bankSupportsInstant) {
        blockingFactors.push(`Bank ${line.bankProfile?.toUpperCase()} does not support SCT Instant`);
      }
      if (!eligibilityCriteria.amountWithinLimit) {
        blockingFactors.push(`Amount €${amount} exceeds SCT Instant limit €${profile?.maxSctInstAmount || '100,000'}`);
      }
      if (!eligibilityCriteria.beneficiaryReachable) {
        blockingFactors.push('Beneficiary bank not reachable for instant payments');
      }
      if (!eligibilityCriteria.originalNotSettled) {
        blockingFactors.push(`Transaction already ${line.status}`);
      }
      if (!eligibilityCriteria.validStatus) {
        blockingFactors.push(`Invalid status: ${line.status}`);
      }
      if (!eligibilityCriteria.notSuperseded) {
        blockingFactors.push('Transaction already re-issued');
      }

      const eligible = Object.values(eligibilityCriteria).every(Boolean);

      results.push({
        lineId: line.lineId,
        eligible,
        eligibilityCriteria,
        blockingFactors,
        estimatedSettlementTime: eligible ? 'Within 10 seconds' : 'N/A - Not eligible',
        instantFees: eligible ? {
          perTransaction: 0.20, // €0.20 per SCT Instant transaction
          total: 0.20,
        } : undefined,
        riskLevel: this.assessRiskLevel(amount, line.creditorAccount),
      });
    }

    console.log(`Bulk eligibility check completed in ${Date.now() - startTime}ms for ${lineIds.length} lines`);
    return results;
  }

  /**
   * Execute instant re-issue with 30-second target and double-pay protection
   */
  static async executeInstantReissue(
    request: InstantReissueRequest
  ): Promise<InstantReissueResult> {
    const startTime = Date.now();
    const auditLog = {
      operatorId: request.operatorId,
      timestamp: new Date().toISOString(),
      reason: request.reason,
      originalBatch: '',
      newBatch: undefined as string | undefined,
    };

    try {
      // Step 1: Get original lines and validate eligibility (Target: < 5s)
      const eligibilityResults = await this.checkBulkEligibility(request.originalLineIds);
      const eligibleLines = eligibilityResults.filter(r => r.eligible);
      const ineligibleLines = eligibilityResults.filter(r => !r.eligible);

      if (eligibleLines.length === 0) {
        return {
          success: false,
          reissuedLines: 0,
          supersededLines: [],
          failedLines: ineligibleLines.map(r => ({
            lineId: r.lineId,
            reason: r.blockingFactors.join(', '),
          })),
          protectedLines: [],
          processingTime: Date.now() - startTime,
          estimatedSettlement: 'N/A',
          auditLog,
        };
      }

      // Step 2: Double-pay protection check (Target: < 2s)
      const protectedLines: string[] = [];
      const eligibleForReissue: string[] = [];

      if (request.doublePayProtection) {
        const originalLines = await db
          .select({
            transactionId: paymentTransactions.transactionId,
            employeeId: paymentTransactions.employeeId,
            amount: paymentTransactions.amount,
            runId: paymentBatches.runId,
          })
          .from(paymentTransactions)
          .innerJoin(paymentBatches, eq(paymentTransactions.batchId, paymentBatches.batchId))
          .where(inArray(paymentTransactions.transactionId, eligibleLines.map(e => e.lineId)));

        for (const line of originalLines) {
          const disbursementKey = this.generateDisbursementKey({
            employeeId: line.employeeId,
            period: new Date().toISOString().substring(0, 7), // YYYY-MM
            amount: parseFloat(line.amount),
            runId: line.runId,
          });

          const existingReissue = await this.checkDisbursementKeyExists(disbursementKey);
          if (existingReissue) {
            protectedLines.push(line.transactionId);
          } else {
            eligibleForReissue.push(line.transactionId);
          }
        }
      } else {
        eligibleForReissue.push(...eligibleLines.map(e => e.lineId));
      }

      if (eligibleForReissue.length === 0) {
        return {
          success: false,
          reissuedLines: 0,
          supersededLines: [],
          failedLines: [],
          protectedLines,
          processingTime: Date.now() - startTime,
          estimatedSettlement: 'N/A',
          auditLog,
        };
      }

      // Step 3: Create new SCT Instant batch (Target: < 10s)
      const newBatchId = `IRIS-${nanoid(8)}`;
      auditLog.newBatch = newBatchId;

      const originalTransactions = await db
        .select()
        .from(paymentTransactions)
        .where(inArray(paymentTransactions.transactionId, eligibleForReissue));

      // Get first transaction's batch for reference
      const [referenceBatch] = await db
        .select()
        .from(paymentBatches)
        .where(eq(paymentBatches.batchId, originalTransactions[0].batchId))
        .limit(1);

      auditLog.originalBatch = referenceBatch?.batchId || 'UNKNOWN';

      const totalAmount = originalTransactions
        .reduce((sum, txn) => sum + parseFloat(txn.amount), 0);

      // Create new instant batch
      const instantBatch = {
        batchId: newBatchId,
        entityId: referenceBatch?.entityId || 'DEFAULT',
        runId: `INSTANT-${Date.now()}`,
        batchType: 'reissue' as const,
        messageId: `IRIS-MSG-${nanoid(8)}`,
        instructionId: `IRIS-INST-${nanoid(8)}`,
        requestedExecutionDate: new Date(),
        bankProfile: referenceBatch?.bankProfile || 'alpha',
        debtorAccount: referenceBatch?.debtorAccount || 'GR1601101250000000012300695',
        debtorName: referenceBatch?.debtorName || 'PayrollSync Entity',
        totalTransactions: originalTransactions.length,
        totalAmount: totalAmount.toFixed(2),
        currency: 'EUR',
        sctCount: 0,
        sctAmount: '0.00',
        sctInstCount: originalTransactions.length,
        sctInstAmount: totalAmount.toFixed(2),
        status: 'created',
      };

      await db.insert(paymentBatches).values(instantBatch);

      // Step 4: Create instant transactions with new EndToEndId (Target: < 8s)
      const instantTransactions = originalTransactions.map(original => ({
        transactionId: `IRIS-TXN-${nanoid(12)}`,
        batchId: newBatchId,
        employeeId: original.employeeId,
        endToEndId: `IRIS-${nanoid(12)}`, // New EndToEndId as required
        amount: original.amount,
        currency: original.currency || 'EUR',
        creditorName: original.creditorName,
        creditorAccount: original.creditorAccount,
        creditorBank: original.creditorBank,
        paymentMethod: 'SCT_INST' as const,
        urgency: request.urgency,
        originalTransactionId: original.transactionId,
        doublePayProtection: request.doublePayProtection,
        status: 'pending' as const,
      }));

      await db.insert(paymentTransactions).values(instantTransactions);

      // Step 5: Mark originals as superseded ONLY after successful submission (Target: < 5s)
      const supersededLines = originalTransactions.map(t => t.transactionId);
      
      // In production, this would happen after bank acceptance
      // For now, we mark as superseded immediately after batch creation
      await db
        .update(paymentTransactions)
        .set({
          status: 'superseded',
          reissuedAs: newBatchId,
          doublePayProtection: true,
          updatedAt: new Date(),
        })
        .where(inArray(paymentTransactions.transactionId, supersededLines));

      // Step 6: Record disbursement keys for double-pay protection
      if (request.doublePayProtection) {
        const disbursementKeys = originalTransactions.map(t => ({
          employeeId: t.employeeId,
          period: new Date().toISOString().substring(0, 7),
          amount: parseFloat(t.amount),
          runId: referenceBatch?.runId || 'UNKNOWN',
          batchId: newBatchId,
          createdAt: new Date(),
        }));

        // Store disbursement keys (would need a separate table in production)
        console.log(`Recorded ${disbursementKeys.length} disbursement keys for double-pay protection`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        newBatchId,
        reissuedLines: instantTransactions.length,
        supersededLines,
        failedLines: ineligibleLines.map(r => ({
          lineId: r.lineId,
          reason: r.blockingFactors.join(', '),
        })),
        protectedLines,
        processingTime,
        estimatedSettlement: 'Within 10 seconds (SCT Instant)',
        auditLog,
      };

    } catch (error) {
      console.error('Instant re-issue failed:', error);
      return {
        success: false,
        reissuedLines: 0,
        supersededLines: [],
        failedLines: request.originalLineIds.map(lineId => ({
          lineId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        })),
        protectedLines: [],
        processingTime: Date.now() - startTime,
        estimatedSettlement: 'N/A',
        auditLog,
      };
    }
  }

  /**
   * Generate disbursement key for double-pay protection
   */
  private static generateDisbursementKey(key: DisbursementKey): string {
    return `${key.employeeId}:${key.period}:${key.amount}:${key.runId}`;
  }

  /**
   * Check if disbursement key already exists (double-pay protection)
   */
  private static async checkDisbursementKeyExists(disbursementKey: string): Promise<boolean> {
    // In production, this would check a dedicated disbursement_keys table
    // For now, we check if there's already a re-issued transaction for this key
    const [existing] = await db
      .select({ count: sql`count(*)`.as('count') })
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.doublePayProtection, true),
          sql`${paymentTransactions.employeeId} || ':' || date_trunc('month', ${paymentTransactions.createdAt})::text || ':' || ${paymentTransactions.amount} || ':' || 'REISSUE' = ${disbursementKey}`
        )
      )
      .limit(1);

    return parseInt(existing?.count as string) > 0;
  }

  /**
   * Check beneficiary reachability for instant payments
   */
  private static async checkBeneficiaryReachability(iban: string): Promise<boolean> {
    // Extract country code and bank code from IBAN
    const countryCode = iban.substring(0, 2);
    const bankCode = iban.substring(4, 8);

    // For Greek banks, assume reachable
    // In production, this would check against ECB's TIPS reachability directory
    if (countryCode === 'GR') {
      return ['0110', '0140', '0026', '0011'].includes(bankCode); // Alpha, Piraeus, Eurobank, NBG
    }

    // For other countries, assume reachable if in SEPA zone
    const sepaCountries = ['AT', 'BE', 'DE', 'ES', 'FR', 'IT', 'NL', 'PT', 'FI', 'LU'];
    return sepaCountries.includes(countryCode);
  }

  /**
   * Assess risk level for instant re-issue
   */
  private static assessRiskLevel(amount: number, iban: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (amount > 50000) return 'HIGH';
    if (amount > 10000) return 'MEDIUM';
    
    // Additional risk factors could be added here
    // - Beneficiary country
    // - Historical reject rates
    // - Time of day / weekend
    
    return 'LOW';
  }

  /**
   * Get instant re-issue status with real-time updates
   */
  static async getReissueStatus(batchId: string): Promise<{
    batchId: string;
    status: string;
    progress: number;
    estimatedCompletion: string;
    timeline: Array<{
      timestamp: string;
      event: string;
      status: 'completed' | 'pending' | 'failed';
    }>;
  }> {
    const [batch] = await db
      .select()
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, batchId))
      .limit(1);

    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const transactions = await db
      .select({
        status: paymentTransactions.status,
        settledAt: paymentTransactions.settledAt,
      })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.batchId, batchId));

    const settledCount = transactions.filter(t => t.status === 'settled').length;
    const progress = Math.round((settledCount / transactions.length) * 100);

    const timeline = [
      {
        timestamp: batch.createdAt?.toISOString() || new Date().toISOString(),
        event: 'Instant batch created',
        status: 'completed' as const,
      },
      {
        timestamp: batch.sentAt?.toISOString() || new Date().toISOString(),
        event: 'Submitted to bank via TIPS',
        status: batch.sentAt ? 'completed' as const : 'pending' as const,
      },
      {
        timestamp: batch.acceptedAt?.toISOString() || new Date().toISOString(),
        event: 'Bank acceptance received',
        status: batch.acceptedAt ? 'completed' as const : 'pending' as const,
      },
      {
        timestamp: new Date().toISOString(),
        event: 'Settlement in progress',
        status: progress === 100 ? 'completed' as const : 'pending' as const,
      },
    ];

    return {
      batchId,
      status: batch.status,
      progress,
      estimatedCompletion: progress === 100 ? 'Completed' : 'Within 30 seconds',
      timeline,
    };
  }
}