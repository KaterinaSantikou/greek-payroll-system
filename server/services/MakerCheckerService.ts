/**
 * Maker-Checker Service - Manages approval workflows for sensitive operations
 */

import { db } from '../db';
import { 
  approvalQueue, 
  partnerMembers, 
  clientAccessGrants,
  partnerFirms,
  users,
  type ApprovalQueue,
  type InsertApprovalQueue
} from '@shared/schema';
import { eq, and, inArray, or, isNull } from 'drizzle-orm';
import { OboService } from './OboService';
import { AuditService } from './AuditService';

export interface MakerCheckerRequest {
  requestType: string;
  requestSubtype?: string;
  requestData: any;
  tenantId: string;
  partnerFirmId?: string;
  makerUserId: string;
  makerRole?: string;
  makerComments?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  expiresInHours?: number;
  relatedEntityIds?: string[];
}

export interface ApprovalRequest {
  requestId: string;
  reviewerUserId: string;
  approved: boolean;
  checkerComments?: string;
  rejectionReason?: string;
}

export interface ExecutionRequest {
  requestId: string;
  executorUserId: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'executed';

export class MakerCheckerService {
  private static readonly DEFAULT_EXPIRY_HOURS = 24;
  private static readonly MAX_EXPIRY_HOURS = 168; // 7 days

  /**
   * Determine who should review a request based on tenant configuration and request type
   */
  private static async determineReviewer(
    tenantId: string,
    partnerFirmId: string | null,
    requestType: string
  ): Promise<{ role: string; userId?: string }> {
    if (partnerFirmId) {
      // For partner firm requests, check client access grant settings
      const [accessGrant] = await db
        .select()
        .from(clientAccessGrants)
        .where(
          and(
            eq(clientAccessGrants.clientTenantId, tenantId),
            eq(clientAccessGrants.partnerFirmId, partnerFirmId),
            eq(clientAccessGrants.isActive, true)
          )
        );

      if (accessGrant?.partnerReviewerRequired) {
        return { role: 'partner_reviewer' };
      } else if (accessGrant?.clientApproverUserId) {
        return { 
          role: 'client_owner',
          userId: accessGrant.clientApproverUserId 
        };
      }
    }

    // Default to client tenant owner/payroll admin
    return { role: 'payroll_admin' };
  }

  /**
   * Calculate risk score for a request
   */
  private static calculateRiskScore(requestType: string, requestData: any): number {
    let riskScore = 0;

    // Base risk by type
    switch (requestType) {
      case 'filing_submit':
        riskScore += 3.0;
        break;
      case 'payroll_run':
        riskScore += 2.5;
        break;
      case 'payment_batch':
        riskScore += 4.0;
        break;
      case 'data_correction':
        riskScore += 1.5;
        break;
      default:
        riskScore += 1.0;
    }

    // Adjust based on data content
    if (requestData.amount && parseFloat(requestData.amount) > 10000) {
      riskScore += 1.0;
    }
    if (requestData.employeeCount && requestData.employeeCount > 50) {
      riskScore += 0.5;
    }
    if (requestData.retroactive) {
      riskScore += 1.0;
    }

    return Math.min(riskScore, 5.0);
  }

  /**
   * Create a new maker-checker request
   */
  static async createRequest(request: MakerCheckerRequest): Promise<string> {
    const expiryHours = Math.min(
      request.expiresInHours || this.DEFAULT_EXPIRY_HOURS,
      this.MAX_EXPIRY_HOURS
    );
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Determine reviewer
    const reviewer = await this.determineReviewer(
      request.tenantId,
      request.partnerFirmId || null,
      request.requestType
    );

    // Calculate risk score
    const riskScore = this.calculateRiskScore(request.requestType, request.requestData);

    // Determine estimated impact
    let estimatedImpact = 'low';
    if (riskScore > 3.5) estimatedImpact = 'high';
    else if (riskScore > 2.0) estimatedImpact = 'medium';

    // Create approval request
    const [approvalRequest] = await db
      .insert(approvalQueue)
      .values({
        requestType: request.requestType,
        requestSubtype: request.requestSubtype,
        requestData: request.requestData,
        tenantId: request.tenantId,
        partnerFirmId: request.partnerFirmId,
        requestedBy: request.makerUserId,
        makerRole: request.makerRole,
        makerComments: request.makerComments,
        assignedToRole: reviewer.role,
        assignedToUserId: reviewer.userId,
        assignedAt: reviewer.userId ? new Date() : null,
        priority: request.priority || 'normal',
        expiresAt,
        riskScore,
        estimatedImpact,
        relatedEntityIds: request.relatedEntityIds || [],
      })
      .returning();

    // Log the request creation
    await AuditService.logEvent({
      eventType: 'user_action',
      eventCategory: 'authorization',
      eventAction: 'approval_request_created',
      tenantId: request.tenantId,
      partnerFirmId: request.partnerFirmId,
      userId: request.makerUserId,
      eventData: {
        requestId: approvalRequest.id,
        requestType: request.requestType,
        requestSubtype: request.requestSubtype,
        assignedToRole: reviewer.role,
        assignedToUserId: reviewer.userId,
        riskScore,
        estimatedImpact,
      },
    });

    return approvalRequest.id;
  }

  /**
   * Get requests pending approval for a specific user or role
   */
  static async getPendingRequests(
    userId: string,
    tenantId?: string,
    partnerFirmId?: string
  ): Promise<ApprovalQueue[]> {
    const conditions = [
      eq(approvalQueue.status, 'pending'),
    ];

    // Add user-specific conditions
    conditions.push(
      or(
        eq(approvalQueue.assignedToUserId, userId),
        // TODO: Add role-based matching logic here
      )
    );

    if (tenantId) {
      conditions.push(eq(approvalQueue.tenantId, tenantId));
    }

    if (partnerFirmId) {
      conditions.push(eq(approvalQueue.partnerFirmId, partnerFirmId));
    }

    return db
      .select()
      .from(approvalQueue)
      .where(and(...conditions))
      .orderBy(approvalQueue.requestedAt);
  }

  /**
   * Approve or reject a request
   */
  static async processApproval(approval: ApprovalRequest): Promise<void> {
    const [request] = await db
      .select()
      .from(approvalQueue)
      .where(eq(approvalQueue.id, approval.requestId));

    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is not pending approval (current status: ${request.status})`);
    }

    if (request.expiresAt && request.expiresAt <= new Date()) {
      throw new Error('Request has expired');
    }

    const newStatus = approval.approved ? 'approved' : 'rejected';

    // Update the request
    await db
      .update(approvalQueue)
      .set({
        status: newStatus,
        reviewedBy: approval.reviewerUserId,
        reviewedAt: new Date(),
        checkerComments: approval.checkerComments,
        rejectionReason: approval.rejectionReason,
      })
      .where(eq(approvalQueue.id, approval.requestId));

    // Log the approval/rejection
    await AuditService.logEvent({
      eventType: 'user_action',
      eventCategory: 'authorization',
      eventAction: approval.approved ? 'request_approved' : 'request_rejected',
      tenantId: request.tenantId,
      partnerFirmId: request.partnerFirmId,
      userId: approval.reviewerUserId,
      eventData: {
        requestId: approval.requestId,
        requestType: request.requestType,
        requestSubtype: request.requestSubtype,
        makerUserId: request.requestedBy,
        checkerComments: approval.checkerComments,
        rejectionReason: approval.rejectionReason,
      },
    });
  }

  /**
   * Execute an approved request
   */
  static async executeRequest(execution: ExecutionRequest): Promise<any> {
    const [request] = await db
      .select()
      .from(approvalQueue)
      .where(eq(approvalQueue.id, execution.requestId));

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'approved') {
      throw new Error(`Request is not approved (current status: ${request.status})`);
    }

    let executionResult: any = null;
    let executionError: string | null = null;

    try {
      // Execute the actual business logic based on request type
      executionResult = await this.executeBusinessLogic(request);

      // Mark as executed
      await db
        .update(approvalQueue)
        .set({
          status: 'executed',
          executedAt: new Date(),
          executedBy: execution.executorUserId,
          executionResult,
        })
        .where(eq(approvalQueue.id, execution.requestId));

    } catch (error) {
      executionError = error instanceof Error ? error.message : String(error);

      // Mark execution as failed
      await db
        .update(approvalQueue)
        .set({
          executedAt: new Date(),
          executedBy: execution.executorUserId,
          executionError,
        })
        .where(eq(approvalQueue.id, execution.requestId));

      throw error;
    }

    // Log the execution
    await AuditService.logEvent({
      eventType: 'system_event',
      eventCategory: 'data_modification',
      eventAction: 'approved_request_executed',
      tenantId: request.tenantId,
      partnerFirmId: request.partnerFirmId,
      userId: execution.executorUserId,
      eventData: {
        requestId: execution.requestId,
        requestType: request.requestType,
        requestSubtype: request.requestSubtype,
        makerUserId: request.requestedBy,
        reviewerUserId: request.reviewedBy,
        executionResult: executionResult ? 'success' : 'failed',
        executionError,
      },
    });

    return executionResult;
  }

  /**
   * Execute the actual business logic for different request types
   */
  private static async executeBusinessLogic(request: ApprovalQueue): Promise<any> {
    switch (request.requestType) {
      case 'filing_submit':
        return await this.executeFilingSubmission(request);
      case 'payroll_run':
        return await this.executePayrollRun(request);
      case 'payment_batch':
        return await this.executePaymentBatch(request);
      case 'data_correction':
        return await this.executeDataCorrection(request);
      default:
        throw new Error(`Unsupported request type: ${request.requestType}`);
    }
  }

  /**
   * Execute filing submission
   */
  private static async executeFilingSubmission(request: ApprovalQueue): Promise<any> {
    const { filingType, filingData } = request.requestData;

    // TODO: Integrate with actual filing services (APD, ΦΜΥ, etc.)
    // For now, return mock success
    return {
      filingId: `filing_${Date.now()}`,
      filingType,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };
  }

  /**
   * Execute payroll run
   */
  private static async executePayrollRun(request: ApprovalQueue): Promise<any> {
    const { runType, periodStart, periodEnd } = request.requestData;

    // TODO: Integrate with actual payroll processing
    // For now, return mock success
    return {
      runId: `run_${Date.now()}`,
      runType,
      periodStart,
      periodEnd,
      processedAt: new Date().toISOString(),
      status: 'completed',
    };
  }

  /**
   * Execute payment batch
   */
  private static async executePaymentBatch(request: ApprovalQueue): Promise<any> {
    const { batchId, totalAmount, paymentCount } = request.requestData;

    // TODO: Integrate with banking/payment services
    // For now, return mock success
    return {
      batchId,
      totalAmount,
      paymentCount,
      processedAt: new Date().toISOString(),
      status: 'processed',
    };
  }

  /**
   * Execute data correction
   */
  private static async executeDataCorrection(request: ApprovalQueue): Promise<any> {
    const { entityType, entityId, corrections } = request.requestData;

    // TODO: Apply actual data corrections
    // For now, return mock success
    return {
      entityType,
      entityId,
      corrections,
      appliedAt: new Date().toISOString(),
      status: 'applied',
    };
  }

  /**
   * Cancel a pending request
   */
  static async cancelRequest(
    requestId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<void> {
    const [request] = await db
      .select()
      .from(approvalQueue)
      .where(eq(approvalQueue.id, requestId));

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot cancel request with status: ${request.status}`);
    }

    await db
      .update(approvalQueue)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: reason,
      })
      .where(eq(approvalQueue.id, requestId));

    // Log the cancellation
    await AuditService.logEvent({
      eventType: 'user_action',
      eventCategory: 'authorization',
      eventAction: 'request_cancelled',
      tenantId: request.tenantId,
      partnerFirmId: request.partnerFirmId,
      userId: cancelledBy,
      eventData: {
        requestId,
        requestType: request.requestType,
        requestSubtype: request.requestSubtype,
        makerUserId: request.requestedBy,
        cancellationReason: reason,
      },
    });
  }

  /**
   * Get request history for a tenant
   */
  static async getRequestHistory(
    tenantId: string,
    partnerFirmId?: string,
    limit: number = 50
  ): Promise<ApprovalQueue[]> {
    const conditions = [eq(approvalQueue.tenantId, tenantId)];

    if (partnerFirmId) {
      conditions.push(eq(approvalQueue.partnerFirmId, partnerFirmId));
    }

    return db
      .select()
      .from(approvalQueue)
      .where(and(...conditions))
      .orderBy(approvalQueue.requestedAt)
      .limit(limit);
  }

  /**
   * Clean up expired requests
   */
  static async cleanupExpiredRequests(): Promise<number> {
    const result = await db
      .update(approvalQueue)
      .set({
        status: 'expired',
      })
      .where(
        and(
          eq(approvalQueue.status, 'pending'),
          eq(approvalQueue.expiresAt, new Date())
        )
      );

    return result.rowCount || 0;
  }

  /**
   * Get approval queue statistics
   */
  static async getQueueStats(tenantId: string, partnerFirmId?: string): Promise<any> {
    // TODO: Implement comprehensive statistics query
    // For now, return basic counts
    const conditions = [eq(approvalQueue.tenantId, tenantId)];
    if (partnerFirmId) {
      conditions.push(eq(approvalQueue.partnerFirmId, partnerFirmId));
    }

    const pending = await db
      .select()
      .from(approvalQueue)
      .where(and(...conditions, eq(approvalQueue.status, 'pending')));

    return {
      pending: pending.length,
      // TODO: Add more stats
    };
  }
}