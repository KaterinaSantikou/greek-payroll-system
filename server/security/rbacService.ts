import { db } from "../db";
import { auditLog } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Role-Based Access Control (RBAC) with Separation of Duties
 * Implements dual approval for sensitive operations in Greek payroll system
 */

export interface Role {
  roleId: string;
  name: string;
  description: string;
  permissions: Permission[];
  level: number; // 1-5, higher numbers have more authority
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: string[];
}

export interface ApprovalWorkflow {
  workflowId: string;
  operation: string;
  requiredApprovals: number;
  requiredRoles: string[];
  restrictedRoles: string[]; // Roles that cannot approve their own requests
  autoApprove?: boolean;
}

export interface PendingApproval {
  approvalId: string;
  workflowId: string;
  requesterId: string;
  operation: string;
  resourceId: string;
  requestData: any;
  requiredApprovals: number;
  currentApprovals: ApprovalRecord[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

export interface ApprovalRecord {
  approvalId: string;
  approverId: string;
  approverRole: string;
  decision: 'approve' | 'reject';
  comments?: string;
  timestamp: Date;
}

// Predefined roles for Greek HR/Payroll system
const SYSTEM_ROLES: Role[] = [
  {
    roleId: 'hr_admin',
    name: 'HR Administrator',
    description: 'Full employee management capabilities',
    level: 4,
    permissions: [
      { resource: 'employees', action: 'create' },
      { resource: 'employees', action: 'read' },
      { resource: 'employees', action: 'update' },
      { resource: 'contracts', action: 'create' },
      { resource: 'contracts', action: 'update' }
    ]
  },
  {
    roleId: 'payroll_manager',
    name: 'Payroll Manager',
    description: 'Payroll processing and validation',
    level: 4,
    permissions: [
      { resource: 'payroll', action: 'create' },
      { resource: 'payroll', action: 'calculate' },
      { resource: 'payroll', action: 'validate' },
      { resource: 'timesheets', action: 'lock' },
      { resource: 'corrections', action: 'approve' }
    ]
  },
  {
    roleId: 'finance_controller',
    name: 'Finance Controller',
    description: 'Financial approvals and payment authorization',
    level: 5,
    permissions: [
      { resource: 'payments', action: 'approve' },
      { resource: 'filings', action: 'approve' },
      { resource: 'payroll', action: 'finalize' },
      { resource: 'corrections', action: 'approve' }
    ]
  },
  {
    roleId: 'compliance_officer',
    name: 'Compliance Officer',
    description: 'Government filing and compliance oversight',
    level: 4,
    permissions: [
      { resource: 'filings', action: 'create' },
      { resource: 'filings', action: 'submit' },
      { resource: 'ergani', action: 'submit' },
      { resource: 'audit', action: 'read' }
    ]
  },
  {
    roleId: 'property_manager',
    name: 'Property Manager',
    description: 'Single property operations management',
    level: 3,
    permissions: [
      { resource: 'employees', action: 'read', conditions: ['same_property'] },
      { resource: 'schedules', action: 'create' },
      { resource: 'schedules', action: 'update' },
      { resource: 'timesheets', action: 'read', conditions: ['same_property'] }
    ]
  },
  {
    roleId: 'supervisor',
    name: 'Department Supervisor',
    description: 'Team management and timesheet approval',
    level: 2,
    permissions: [
      { resource: 'timesheets', action: 'approve', conditions: ['same_department'] },
      { resource: 'overtime', action: 'approve', conditions: ['same_department'] },
      { resource: 'schedules', action: 'read', conditions: ['same_department'] }
    ]
  }
];

// Approval workflows for sensitive operations
const APPROVAL_WORKFLOWS: ApprovalWorkflow[] = [
  {
    workflowId: 'payroll_finalization',
    operation: 'finalize_payroll',
    requiredApprovals: 2,
    requiredRoles: ['payroll_manager', 'finance_controller'],
    restrictedRoles: [], // Both can approve
    autoApprove: false
  },
  {
    workflowId: 'sepa_payment_generation',
    operation: 'generate_payments',
    requiredApprovals: 2,
    requiredRoles: ['payroll_manager', 'finance_controller'],
    restrictedRoles: ['payroll_manager'], // Payroll manager cannot approve their own payment request
    autoApprove: false
  },
  {
    workflowId: 'government_filing',
    operation: 'submit_filing',
    requiredApprovals: 2,
    requiredRoles: ['compliance_officer', 'finance_controller'],
    restrictedRoles: ['compliance_officer'], // Compliance officer cannot approve their own filing
    autoApprove: false
  },
  {
    workflowId: 'payroll_correction',
    operation: 'payroll_correction',
    requiredApprovals: 1,
    requiredRoles: ['payroll_manager', 'finance_controller'],
    restrictedRoles: [], // Either can approve corrections
    autoApprove: false
  },
  {
    workflowId: 'employee_termination',
    operation: 'terminate_employee',
    requiredApprovals: 2,
    requiredRoles: ['hr_admin', 'finance_controller'],
    restrictedRoles: [],
    autoApprove: false
  }
];

class RBACService {
  private pendingApprovals: Map<string, PendingApproval> = new Map();

  /**
   * Check if user has permission for specific resource and action
   */
  async hasPermission(
    userId: string, 
    resource: string, 
    action: string, 
    context?: any
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    
    for (const role of userRoles) {
      const permission = role.permissions.find(p => 
        p.resource === resource && p.action === action
      );
      
      if (permission) {
        // Check conditions if present
        if (permission.conditions) {
          const conditionsMet = await this.checkPermissionConditions(
            permission.conditions, 
            userId, 
            context
          );
          if (conditionsMet) return true;
        } else {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Initialize approval workflow for sensitive operations
   */
  async initiateApproval(
    requesterId: string,
    operation: string,
    resourceId: string,
    requestData: any
  ): Promise<PendingApproval> {
    const workflow = APPROVAL_WORKFLOWS.find(w => w.operation === operation);
    if (!workflow) {
      throw new Error(`No approval workflow defined for operation: ${operation}`);
    }

    // Check if requester can initiate this operation
    const requesterRoles = await this.getUserRoles(requesterId);
    const canInitiate = requesterRoles.some(role => 
      workflow.requiredRoles.includes(role.roleId)
    );

    if (!canInitiate) {
      throw new Error('Insufficient permissions to initiate this operation');
    }

    const approvalId = nanoid();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour approval window

    const pendingApproval: PendingApproval = {
      approvalId,
      workflowId: workflow.workflowId,
      requesterId,
      operation,
      resourceId,
      requestData,
      requiredApprovals: workflow.requiredApprovals,
      currentApprovals: [],
      status: 'pending',
      createdAt: new Date(),
      expiresAt
    };

    this.pendingApprovals.set(approvalId, pendingApproval);

    // Log approval initiation
    await this.logRBACAction('approval_initiated', requesterId, {
      approvalId,
      operation,
      resourceId,
      workflowId: workflow.workflowId
    });

    return pendingApproval;
  }

  /**
   * Process approval decision
   */
  async processApproval(
    approvalId: string,
    approverId: string,
    decision: 'approve' | 'reject',
    comments?: string
  ): Promise<{ approved: boolean; message: string }> {
    const pendingApproval = this.pendingApprovals.get(approvalId);
    if (!pendingApproval) {
      throw new Error('Approval request not found or expired');
    }

    if (pendingApproval.status !== 'pending') {
      throw new Error(`Approval request is already ${pendingApproval.status}`);
    }

    if (new Date() > pendingApproval.expiresAt) {
      pendingApproval.status = 'expired';
      throw new Error('Approval request has expired');
    }

    // Check if approver can approve this request
    const canApprove = await this.canUserApprove(approverId, pendingApproval);
    if (!canApprove) {
      throw new Error('Insufficient permissions to approve this request');
    }

    // Check for separation of duties violations
    const workflow = APPROVAL_WORKFLOWS.find(w => w.workflowId === pendingApproval.workflowId);
    if (workflow?.restrictedRoles) {
      const approverRoles = await this.getUserRoles(approverId);
      const requesterRoles = await this.getUserRoles(pendingApproval.requesterId);
      
      const sodViolation = this.checkSeparationOfDuties(
        approverId,
        pendingApproval.requesterId,
        approverRoles,
        requesterRoles,
        workflow.restrictedRoles
      );

      if (sodViolation) {
        throw new Error('Separation of duties violation: Cannot approve your own request');
      }
    }

    // Add approval record
    const approvalRecord: ApprovalRecord = {
      approvalId,
      approverId,
      approverRole: (await this.getUserRoles(approverId))[0]?.roleId || 'unknown',
      decision,
      comments,
      timestamp: new Date()
    };

    pendingApproval.currentApprovals.push(approvalRecord);

    // Check if request is fully approved or rejected
    if (decision === 'reject') {
      pendingApproval.status = 'rejected';
      await this.logRBACAction('approval_rejected', approverId, {
        approvalId,
        reason: comments
      });
      return { approved: false, message: 'Request rejected' };
    }

    const approvals = pendingApproval.currentApprovals.filter(a => a.decision === 'approve');
    if (approvals.length >= pendingApproval.requiredApprovals) {
      pendingApproval.status = 'approved';
      
      // Execute the approved operation
      await this.executeApprovedOperation(pendingApproval);
      
      await this.logRBACAction('approval_completed', approverId, {
        approvalId,
        operation: pendingApproval.operation,
        resourceId: pendingApproval.resourceId
      });

      return { approved: true, message: 'Request fully approved and executed' };
    }

    await this.logRBACAction('approval_granted', approverId, {
      approvalId,
      approvalsRemaining: pendingApproval.requiredApprovals - approvals.length
    });

    return { 
      approved: false, 
      message: `Approval granted. ${pendingApproval.requiredApprovals - approvals.length} more approvals needed.` 
    };
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovals(userId: string): Promise<PendingApproval[]> {
    const userRoles = await this.getUserRoles(userId);
    const userRoleIds = userRoles.map(r => r.roleId);

    return Array.from(this.pendingApprovals.values()).filter(approval => {
      if (approval.status !== 'pending') return false;
      if (new Date() > approval.expiresAt) return false;

      const workflow = APPROVAL_WORKFLOWS.find(w => w.workflowId === approval.workflowId);
      if (!workflow) return false;

      // Check if user has required role
      const hasRequiredRole = workflow.requiredRoles.some(roleId => 
        userRoleIds.includes(roleId)
      );

      if (!hasRequiredRole) return false;

      // Check if user already approved/rejected
      const alreadyActioned = approval.currentApprovals.some(a => a.approverId === userId);
      if (alreadyActioned) return false;

      // Check separation of duties
      if (workflow.restrictedRoles && approval.requesterId === userId) {
        const requesterRoles = userRoles.map(r => r.roleId);
        const hasRestrictedRole = workflow.restrictedRoles.some(roleId => 
          requesterRoles.includes(roleId)
        );
        if (hasRestrictedRole) return false;
      }

      return true;
    });
  }

  /**
   * Check if user can approve a specific request
   */
  private async canUserApprove(userId: string, approval: PendingApproval): Promise<boolean> {
    const workflow = APPROVAL_WORKFLOWS.find(w => w.workflowId === approval.workflowId);
    if (!workflow) return false;

    const userRoles = await this.getUserRoles(userId);
    const userRoleIds = userRoles.map(r => r.roleId);

    // Check if user has required role
    const hasRequiredRole = workflow.requiredRoles.some(roleId => 
      userRoleIds.includes(roleId)
    );

    return hasRequiredRole;
  }

  /**
   * Check separation of duties constraints
   */
  private checkSeparationOfDuties(
    approverId: string,
    requesterId: string,
    approverRoles: Role[],
    requesterRoles: Role[],
    restrictedRoles: string[]
  ): boolean {
    if (approverId === requesterId) {
      // Check if requester has any restricted roles
      return requesterRoles.some(role => restrictedRoles.includes(role.roleId));
    }
    return false;
  }

  /**
   * Execute approved operation
   */
  private async executeApprovedOperation(approval: PendingApproval): Promise<void> {
    // This would integrate with the actual business logic
    switch (approval.operation) {
      case 'finalize_payroll':
        // await payrollService.finalize(approval.resourceId, approval.requestData);
        console.log(`Executing payroll finalization for ${approval.resourceId}`);
        break;
      case 'generate_payments':
        // await paymentService.generateSEPA(approval.resourceId, approval.requestData);
        console.log(`Executing SEPA payment generation for ${approval.resourceId}`);
        break;
      case 'submit_filing':
        // await filingService.submit(approval.resourceId, approval.requestData);
        console.log(`Executing government filing submission for ${approval.resourceId}`);
        break;
      default:
        console.log(`Unknown operation: ${approval.operation}`);
    }
  }

  /**
   * Get user roles (mock implementation - would integrate with auth system)
   */
  private async getUserRoles(userId: string): Promise<Role[]> {
    // Mock implementation - in production, this would query the user role assignments
    const mockUserRoles: Record<string, string[]> = {
      'user1': ['hr_admin'],
      'user2': ['payroll_manager'],
      'user3': ['finance_controller'],
      'user4': ['compliance_officer']
    };

    const userRoleIds = mockUserRoles[userId] || [];
    return SYSTEM_ROLES.filter(role => userRoleIds.includes(role.roleId));
  }

  /**
   * Check permission conditions
   */
  private async checkPermissionConditions(
    conditions: string[],
    userId: string,
    context: any
  ): Promise<boolean> {
    for (const condition of conditions) {
      switch (condition) {
        case 'same_property':
          // Check if user and resource are in same property
          if (context?.propertyId && context?.userPropertyId) {
            if (context.propertyId !== context.userPropertyId) return false;
          }
          break;
        case 'same_department':
          // Check if user and resource are in same department
          if (context?.departmentId && context?.userDepartmentId) {
            if (context.departmentId !== context.userDepartmentId) return false;
          }
          break;
      }
    }
    return true;
  }

  /**
   * Log RBAC actions for audit
   */
  private async logRBACAction(action: string, userId: string, details: any): Promise<void> {
    try {
      await db.insert(auditLog).values({
        logId: nanoid(),
        eventType: `rbac.${action}`,
        entityType: 'rbac',
        entityId: details.approvalId || 'system',
        userId: userId,
        changes: JSON.stringify(details),
        hashChain: 'rbac-' + Date.now(),
        ipAddress: '127.0.0.1',
        userAgent: 'PayrollSync-RBAC-Service'
      });
    } catch (e: any) {
      console.warn('[Audit][soft-fail]', e.code, { 
        eventType: `rbac.${action}`, 
        entityType: 'rbac', 
        userId: userId 
      });
    }
  }
}

export const rbacService = new RBACService();