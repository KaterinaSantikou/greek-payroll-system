import { db } from "../db";
import { makerCheckerApprovals, type InsertMakerCheckerApproval, type MakerCheckerApproval } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Maker-Checker Service
 * 
 * Implements approval workflows for CBA pack changes.
 * All pack modifications require approval from both Legal and Payroll Admin roles.
 * Ensures segregation of duties and prevents unauthorized payroll changes.
 */

export interface MakerCheckerRequest {
  requestType: 'pack_change' | 'version_publish' | 'rollout_execute';
  requestId: string;
  requestData: any;
  makerUserId: string;
  makerRole: 'payroll_admin' | 'hr_manager' | 'legal';
  requiredApprovers: Array<'legal' | 'payroll_admin'>;
}

export interface ApprovalAction {
  checkerUserId: string;
  checkerRole: 'legal' | 'payroll_admin';
  action: 'approve' | 'reject';
  reason: string;
}

export class MakerCheckerService {

  /**
   * Create a new maker-checker approval request
   */
  static async createApprovalRequest(request: MakerCheckerRequest): Promise<string> {
    try {
      // Validate that maker cannot be same as required approver
      if (request.requiredApprovers.includes(request.makerRole as any)) {
        throw new Error("Maker cannot approve their own request (segregation of duties violation)");
      }

      // Create approval request
      const approvalRequest: InsertMakerCheckerApproval = {
        requestType: request.requestType,
        requestId: request.requestId,
        requestData: request.requestData,
        makerUserId: request.makerUserId,
        makerRole: request.makerRole,
        status: 'pending',
        requiredApprovers: request.requiredApprovers,
        currentApprovers: []
      };

      const [created] = await db
        .insert(makerCheckerApprovals)
        .values(approvalRequest)
        .returning();

      // Log the request creation
      console.log(`Maker-checker request created: ${created.id} for ${request.requestType} by ${request.makerUserId}`);

      return created.id;

    } catch (error: any) {
      console.error("Error creating approval request:", error);
      throw new Error(`Failed to create approval request: ${error.message}`);
    }
  }

  /**
   * Process an approval or rejection
   */
  static async processApproval(
    approvalId: string,
    action: ApprovalAction
  ): Promise<{
    success: boolean;
    status: 'pending' | 'approved' | 'rejected';
    message: string;
    allApprovalsReceived: boolean;
  }> {
    try {
      // Get current approval request
      const [currentRequest] = await db
        .select()
        .from(makerCheckerApprovals)
        .where(eq(makerCheckerApprovals.id, approvalId));

      if (!currentRequest) {
        throw new Error("Approval request not found");
      }

      if (currentRequest.status !== 'pending') {
        throw new Error(`Request already ${currentRequest.status}`);
      }

      // Validate approver role
      const requiredRoles = currentRequest.requiredApprovers as string[];
      if (!requiredRoles.includes(action.checkerRole)) {
        throw new Error(`Role ${action.checkerRole} not authorized to approve this request`);
      }

      // Check if user already approved
      const currentApprovers = (currentRequest.currentApprovers as any[]) || [];
      const alreadyApproved = currentApprovers.some(
        (approver: any) => approver.userId === action.checkerUserId
      );

      if (alreadyApproved) {
        throw new Error("User has already provided approval/rejection for this request");
      }

      // Handle rejection
      if (action.action === 'reject') {
        await db
          .update(makerCheckerApprovals)
          .set({
            status: 'rejected',
            checkerUserId: action.checkerUserId,
            checkerRole: action.checkerRole,
            rejectionReason: action.reason,
            updatedAt: new Date()
          })
          .where(eq(makerCheckerApprovals.id, approvalId));

        return {
          success: true,
          status: 'rejected',
          message: `Request rejected by ${action.checkerRole}`,
          allApprovalsReceived: false
        };
      }

      // Handle approval
      const newApprovers = [
        ...currentApprovers,
        {
          userId: action.checkerUserId,
          role: action.checkerRole,
          approvedAt: new Date().toISOString(),
          reason: action.reason
        }
      ];

      // Check if all required approvals are received
      const approvedRoles = newApprovers.map((a: any) => a.role);
      const allApprovalsReceived = requiredRoles.every(role => approvedRoles.includes(role));

      const newStatus = allApprovalsReceived ? 'approved' : 'pending';

      await db
        .update(makerCheckerApprovals)
        .set({
          status: newStatus,
          checkerUserId: action.checkerUserId,
          checkerRole: action.checkerRole,
          approvalReason: action.reason,
          currentApprovers: newApprovers,
          updatedAt: new Date()
        })
        .where(eq(makerCheckerApprovals.id, approvalId));

      const message = allApprovalsReceived 
        ? "All required approvals received - request approved"
        : `Approval received from ${action.checkerRole} - awaiting additional approvals`;

      return {
        success: true,
        status: newStatus as 'pending' | 'approved',
        message,
        allApprovalsReceived
      };

    } catch (error: any) {
      console.error("Error processing approval:", error);
      throw new Error(`Failed to process approval: ${error.message}`);
    }
  }

  /**
   * Get pending approvals for a user role
   */
  static async getPendingApprovals(
    userRole: 'legal' | 'payroll_admin'
  ): Promise<Array<{
    approvalId: string;
    requestType: string;
    requestData: any;
    makerUserId: string;
    makerRole: string;
    createdAt: Date;
    waitingFor: string[];
  }>> {
    try {
      const pendingRequests = await db
        .select()
        .from(makerCheckerApprovals)
        .where(eq(makerCheckerApprovals.status, 'pending'));

      // Filter requests where this role is required and hasn't approved yet
      const relevantRequests = pendingRequests.filter(request => {
        const requiredRoles = request.requiredApprovers as string[];
        const currentApprovers = (request.currentApprovers as any[]) || [];
        
        // Check if this role is required
        if (!requiredRoles.includes(userRole)) return false;
        
        // Check if this role hasn't already approved
        const hasRoleApproved = currentApprovers.some((approver: any) => approver.role === userRole);
        return !hasRoleApproved;
      });

      return relevantRequests.map(request => {
        const requiredRoles = request.requiredApprovers as string[];
        const currentApprovers = (request.currentApprovers as any[]) || [];
        const approvedRoles = currentApprovers.map((a: any) => a.role);
        const waitingFor = requiredRoles.filter(role => !approvedRoles.includes(role));

        return {
          approvalId: request.id,
          requestType: request.requestType,
          requestData: request.requestData,
          makerUserId: request.makerUserId,
          makerRole: request.makerRole,
          createdAt: request.createdAt,
          waitingFor
        };
      });

    } catch (error) {
      console.error("Error getting pending approvals:", error);
      throw new Error("Failed to retrieve pending approvals");
    }
  }

  /**
   * Get approval history for audit purposes
   */
  static async getApprovalHistory(
    requestId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Array<{
    approvalId: string;
    requestType: string;
    requestId: string;
    makerUserId: string;
    makerRole: string;
    status: string;
    approvers: Array<{
      userId: string;
      role: string;
      approvedAt: string;
      reason: string;
    }>;
    createdAt: Date;
    resolvedAt: Date | null;
  }>> {
    try {
      const query = db.select().from(makerCheckerApprovals);

      // Apply filters if provided
      let filteredQuery = query;
      
      if (requestId) {
        filteredQuery = query.where(eq(makerCheckerApprovals.requestId, requestId));
      }

      const requests = await filteredQuery;

      return requests.map(request => ({
        approvalId: request.id,
        requestType: request.requestType,
        requestId: request.requestId,
        makerUserId: request.makerUserId,
        makerRole: request.makerRole,
        status: request.status,
        approvers: (request.currentApprovers as any[]) || [],
        createdAt: request.createdAt,
        resolvedAt: request.status === 'pending' ? null : request.updatedAt
      }));

    } catch (error) {
      console.error("Error getting approval history:", error);
      throw new Error("Failed to retrieve approval history");
    }
  }

  /**
   * Check if a request has been approved and can proceed
   */
  static async isRequestApproved(requestId: string): Promise<{
    approved: boolean;
    status: 'pending' | 'approved' | 'rejected';
    approvalId?: string;
    approvers?: any[];
  }> {
    try {
      const [request] = await db
        .select()
        .from(makerCheckerApprovals)
        .where(eq(makerCheckerApprovals.requestId, requestId))
        .orderBy(makerCheckerApprovals.createdAt); // Get latest request for this ID

      if (!request) {
        return {
          approved: false,
          status: 'pending'
        };
      }

      return {
        approved: request.status === 'approved',
        status: request.status as 'pending' | 'approved' | 'rejected',
        approvalId: request.id,
        approvers: request.currentApprovers as any[]
      };

    } catch (error) {
      console.error("Error checking request approval:", error);
      throw new Error("Failed to check request approval status");
    }
  }

  /**
   * Create approval request for CBA pack change
   */
  static async createPackChangeRequest(
    packId: string,
    changes: any,
    makerUserId: string,
    makerRole: 'payroll_admin' | 'hr_manager'
  ): Promise<string> {
    const requestId = `pack-change-${packId}-${nanoid(8)}`;
    
    return this.createApprovalRequest({
      requestType: 'pack_change',
      requestId,
      requestData: {
        packId,
        changes,
        impactAnalysis: changes.impactAnalysis,
        affectedEmployees: changes.affectedEmployees || []
      },
      makerUserId,
      makerRole,
      requiredApprovers: ['legal', 'payroll_admin']
    });
  }

  /**
   * Create approval request for version publishing
   */
  static async createVersionPublishRequest(
    packId: string,
    version: string,
    makerUserId: string,
    makerRole: 'payroll_admin' | 'hr_manager'
  ): Promise<string> {
    const requestId = `version-publish-${packId}-${version}-${nanoid(8)}`;
    
    return this.createApprovalRequest({
      requestType: 'version_publish',
      requestId,
      requestData: {
        packId,
        version,
        publishingScope: 'production',
        rolloutStrategy: 'immediate'
      },
      makerUserId,
      makerRole,
      requiredApprovers: ['legal', 'payroll_admin']
    });
  }
}