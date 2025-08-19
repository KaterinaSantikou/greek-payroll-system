/**
 * Payment State Machine - Batch and Line-level state management
 */

import { db } from '../db';
import { paymentBatches, paymentInstructions } from '@shared/payments-canonical-schema';
import { eq, and, sql, count } from 'drizzle-orm';

// =============================================================================
// STATE DEFINITIONS
// =============================================================================

export type BatchStatus = 
  | "prepared" 
  | "submitted" 
  | "accepted" 
  | "partially_settled" 
  | "settled" 
  | "reconciled" 
  | "failed";

export type LineStatus = 
  | "prepared" 
  | "submitted" 
  | "accepted" 
  | "settled" 
  | "rejected" 
  | "superseded" 
  | "cancelled";

// =============================================================================
// STATE TRANSITION MAPS
// =============================================================================

const BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  "prepared": ["submitted", "cancelled", "failed"],
  "submitted": ["accepted", "failed"],
  "accepted": ["partially_settled", "settled", "failed"],
  "partially_settled": ["settled", "reconciled", "failed"],
  "settled": ["reconciled"],
  "reconciled": [], // Final state
  "failed": [], // Final state
};

const LINE_TRANSITIONS: Record<LineStatus, LineStatus[]> = {
  "prepared": ["submitted", "cancelled", "superseded"],
  "submitted": ["accepted", "rejected", "superseded"],
  "accepted": ["settled", "superseded"],
  "settled": ["superseded"], // Can still be superseded for corrections
  "rejected": ["superseded"], // Can be re-issued
  "superseded": [], // Final state
  "cancelled": [], // Final state
};

// =============================================================================
// STATE MACHINE SERVICE
// =============================================================================

export class PaymentStateMachine {

  /**
   * Validate batch state transition
   */
  static isValidBatchTransition(from: BatchStatus, to: BatchStatus): boolean {
    return BATCH_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Validate line state transition
   */
  static isValidLineTransition(from: LineStatus, to: LineStatus): boolean {
    return LINE_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /**
   * Get allowed next states for batch
   */
  static getAllowedBatchTransitions(currentStatus: BatchStatus): BatchStatus[] {
    return BATCH_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Get allowed next states for line
   */
  static getAllowedLineTransitions(currentStatus: LineStatus): LineStatus[] {
    return LINE_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Transition batch status with validation
   */
  static async transitionBatchStatus(
    batchId: string, 
    newStatus: BatchStatus,
    reason?: string
  ): Promise<{ success: boolean; previousStatus?: BatchStatus; error?: string }> {
    
    // Get current batch status
    const [currentBatch] = await db
      .select({ status: paymentBatches.status })
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, batchId))
      .limit(1);

    if (!currentBatch) {
      return { success: false, error: `Batch ${batchId} not found` };
    }

    const currentStatus = currentBatch.status as BatchStatus;

    // Validate transition
    if (!this.isValidBatchTransition(currentStatus, newStatus)) {
      return { 
        success: false, 
        previousStatus: currentStatus,
        error: `Invalid batch transition from ${currentStatus} to ${newStatus}` 
      };
    }

    // Execute transition
    await db
      .update(paymentBatches)
      .set({ 
        status: newStatus,
        updatedAt: new Date(),
        ...(reason && { metadata: sql`COALESCE(metadata, '{}') || ${JSON.stringify({ lastTransitionReason: reason })}::jsonb` }),
      })
      .where(eq(paymentBatches.batchId, batchId));

    return { success: true, previousStatus: currentStatus };
  }

  /**
   * Transition line status with validation
   */
  static async transitionLineStatus(
    lineId: string, 
    newStatus: LineStatus,
    reasonCode?: string,
    reason?: string
  ): Promise<{ success: boolean; previousStatus?: LineStatus; error?: string }> {
    
    // Get current line status
    const [currentLine] = await db
      .select({ status: paymentInstructions.status })
      .from(paymentInstructions)
      .where(eq(paymentInstructions.lineId, lineId))
      .limit(1);

    if (!currentLine) {
      return { success: false, error: `Line ${lineId} not found` };
    }

    const currentStatus = currentLine.status as LineStatus;

    // Validate transition
    if (!this.isValidLineTransition(currentStatus, newStatus)) {
      return { 
        success: false, 
        previousStatus: currentStatus,
        error: `Invalid line transition from ${currentStatus} to ${newStatus}` 
      };
    }

    // Execute transition
    const updateData: any = { 
      status: newStatus,
      updatedAt: new Date(),
    };

    if (reasonCode) {
      updateData.reasonCode = reasonCode;
    }

    await db
      .update(paymentInstructions)
      .set(updateData)
      .where(eq(paymentInstructions.lineId, lineId));

    return { success: true, previousStatus: currentStatus };
  }

  /**
   * Calculate batch status based on line statuses
   */
  static async calculateBatchStatusFromLines(batchId: string): Promise<{
    recommendedStatus: BatchStatus;
    lineStatusSummary: Record<LineStatus, number>;
    totalLines: number;
    analysis: {
      allPrepared: boolean;
      allSubmitted: boolean;
      allAccepted: boolean;
      allSettled: boolean;
      hasRejected: boolean;
      hasSuperseded: boolean;
      activeLines: number;
    };
  }> {
    
    // Get line status counts
    const lineStatusCounts = await db
      .select({
        status: paymentInstructions.status,
        count: count(),
      })
      .from(paymentInstructions)
      .where(eq(paymentInstructions.batchId, batchId))
      .groupBy(paymentInstructions.status);

    // Build status summary
    const lineStatusSummary: Record<LineStatus, number> = {
      prepared: 0,
      submitted: 0,
      accepted: 0,
      settled: 0,
      rejected: 0,
      superseded: 0,
      cancelled: 0,
    };

    let totalLines = 0;
    for (const row of lineStatusCounts) {
      lineStatusSummary[row.status as LineStatus] = row.count;
      totalLines += row.count;
    }

    // Calculate active lines (non-superseded, non-cancelled)
    const activeLines = totalLines - lineStatusSummary.superseded - lineStatusSummary.cancelled;

    // Analyze current state
    const analysis = {
      allPrepared: activeLines > 0 && lineStatusSummary.prepared === activeLines,
      allSubmitted: activeLines > 0 && lineStatusSummary.submitted === activeLines,
      allAccepted: activeLines > 0 && lineStatusSummary.accepted === activeLines,
      allSettled: activeLines > 0 && lineStatusSummary.settled === activeLines,
      hasRejected: lineStatusSummary.rejected > 0,
      hasSuperseded: lineStatusSummary.superseded > 0,
      activeLines,
    };

    // Determine recommended batch status
    let recommendedStatus: BatchStatus;

    if (analysis.allSettled) {
      recommendedStatus = "settled";
    } else if (lineStatusSummary.settled > 0 && activeLines > lineStatusSummary.settled) {
      recommendedStatus = "partially_settled";
    } else if (analysis.allAccepted || (lineStatusSummary.accepted > 0 && analysis.hasRejected)) {
      recommendedStatus = "accepted";
    } else if (analysis.allSubmitted) {
      recommendedStatus = "submitted";
    } else if (analysis.allPrepared) {
      recommendedStatus = "prepared";
    } else if (lineStatusSummary.rejected === activeLines) {
      recommendedStatus = "failed";
    } else {
      // Mixed states - keep current or default to submitted if lines are moving
      recommendedStatus = "submitted";
    }

    return {
      recommendedStatus,
      lineStatusSummary,
      totalLines,
      analysis,
    };
  }

  /**
   * Auto-update batch status based on line changes
   */
  static async autoUpdateBatchStatus(batchId: string): Promise<{
    updated: boolean;
    previousStatus?: BatchStatus;
    newStatus?: BatchStatus;
    reason: string;
  }> {
    
    // Get current batch status
    const [currentBatch] = await db
      .select({ status: paymentBatches.status })
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, batchId))
      .limit(1);

    if (!currentBatch) {
      return { updated: false, reason: 'Batch not found' };
    }

    const currentStatus = currentBatch.status as BatchStatus;
    const statusAnalysis = await this.calculateBatchStatusFromLines(batchId);
    const recommendedStatus = statusAnalysis.recommendedStatus;

    // Check if status change is needed and valid
    if (currentStatus === recommendedStatus) {
      return { updated: false, reason: 'Status already matches recommendation' };
    }

    if (!this.isValidBatchTransition(currentStatus, recommendedStatus)) {
      return { 
        updated: false, 
        reason: `Invalid auto-transition from ${currentStatus} to ${recommendedStatus}` 
      };
    }

    // Execute auto-update
    const transitionResult = await this.transitionBatchStatus(
      batchId, 
      recommendedStatus, 
      'Auto-updated based on line status changes'
    );

    return {
      updated: transitionResult.success,
      previousStatus: currentStatus,
      newStatus: recommendedStatus,
      reason: transitionResult.success 
        ? 'Auto-updated based on line statuses'
        : transitionResult.error || 'Failed to update',
    };
  }

  /**
   * Process re-issue with proper superseding
   */
  static async processReissueSuperseding(
    originalBatchId: string,
    lineIdsToSupersede: string[],
    newBatchId: string
  ): Promise<{
    success: boolean;
    supersededCount: number;
    originalBatchStatus?: BatchStatus;
    error?: string;
  }> {
    
    try {
      // Mark original lines as superseded
      const supersededResult = await db
        .update(paymentInstructions)
        .set({ 
          status: "superseded",
          updatedAt: new Date(),
        })
        .where(and(
          eq(paymentInstructions.batchId, originalBatchId),
          sql`${paymentInstructions.lineId} = ANY(${lineIdsToSupersede})`
        ));

      // Auto-update original batch status
      const batchUpdate = await this.autoUpdateBatchStatus(originalBatchId);

      return {
        success: true,
        supersededCount: lineIdsToSupersede.length,
        originalBatchStatus: batchUpdate.newStatus,
      };

    } catch (error) {
      return {
        success: false,
        supersededCount: 0,
        error: error instanceof Error ? error.message : 'Failed to process superseding',
      };
    }
  }

  /**
   * Get batch state machine visualization
   */
  static getBatchStateMachineMap(): Record<BatchStatus, { 
    next: BatchStatus[]; 
    description: string; 
    isFinal: boolean;
  }> {
    return {
      "prepared": {
        next: BATCH_TRANSITIONS.prepared,
        description: "Batch created, ready for submission",
        isFinal: false,
      },
      "submitted": {
        next: BATCH_TRANSITIONS.submitted,
        description: "Submitted to bank, awaiting acknowledgment",
        isFinal: false,
      },
      "accepted": {
        next: BATCH_TRANSITIONS.accepted,
        description: "Bank accepted batch, processing payments",
        isFinal: false,
      },
      "partially_settled": {
        next: BATCH_TRANSITIONS.partially_settled,
        description: "Some payments settled, others pending",
        isFinal: false,
      },
      "settled": {
        next: BATCH_TRANSITIONS.settled,
        description: "All payments settled successfully",
        isFinal: false,
      },
      "reconciled": {
        next: BATCH_TRANSITIONS.reconciled,
        description: "Fully reconciled and complete",
        isFinal: true,
      },
      "failed": {
        next: BATCH_TRANSITIONS.failed,
        description: "Batch processing failed",
        isFinal: true,
      },
    };
  }

  /**
   * Get line state machine visualization
   */
  static getLineStateMachineMap(): Record<LineStatus, { 
    next: LineStatus[]; 
    description: string; 
    isFinal: boolean;
  }> {
    return {
      "prepared": {
        next: LINE_TRANSITIONS.prepared,
        description: "Payment instruction created",
        isFinal: false,
      },
      "submitted": {
        next: LINE_TRANSITIONS.submitted,
        description: "Submitted to bank in batch",
        isFinal: false,
      },
      "accepted": {
        next: LINE_TRANSITIONS.accepted,
        description: "Bank accepted payment instruction",
        isFinal: false,
      },
      "settled": {
        next: LINE_TRANSITIONS.settled,
        description: "Payment successfully settled",
        isFinal: false,
      },
      "rejected": {
        next: LINE_TRANSITIONS.rejected,
        description: "Bank rejected payment instruction",
        isFinal: false,
      },
      "superseded": {
        next: LINE_TRANSITIONS.superseded,
        description: "Superseded by re-issued payment",
        isFinal: true,
      },
      "cancelled": {
        next: LINE_TRANSITIONS.cancelled,
        description: "Payment instruction cancelled",
        isFinal: true,
      },
    };
  }

  /**
   * Validate batch consistency
   */
  static async validateBatchConsistency(batchId: string): Promise<{
    consistent: boolean;
    issues: string[];
    recommendations: string[];
    statusAnalysis: any;
  }> {
    
    const statusAnalysis = await this.calculateBatchStatusFromLines(batchId);
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Get current batch status
    const [currentBatch] = await db
      .select({ status: paymentBatches.status })
      .from(paymentBatches)
      .where(eq(paymentBatches.batchId, batchId))
      .limit(1);

    if (!currentBatch) {
      issues.push('Batch not found');
      return { consistent: false, issues, recommendations, statusAnalysis };
    }

    const currentStatus = currentBatch.status as BatchStatus;
    const recommendedStatus = statusAnalysis.recommendedStatus;

    // Check status consistency
    if (currentStatus !== recommendedStatus) {
      issues.push(`Batch status (${currentStatus}) doesn't match line analysis (${recommendedStatus})`);
      recommendations.push(`Update batch status to ${recommendedStatus}`);
    }

    // Check for split batches (accepted with rejections)
    if (statusAnalysis.analysis.hasRejected && statusAnalysis.lineStatusSummary.accepted > 0) {
      recommendations.push('Consider re-issuing rejected payments as SCT Instant');
    }

    // Check for orphaned superseded lines
    if (statusAnalysis.lineStatusSummary.superseded > 0) {
      recommendations.push('Review superseded payments for audit trail completion');
    }

    return {
      consistent: issues.length === 0,
      issues,
      recommendations,
      statusAnalysis,
    };
  }
}