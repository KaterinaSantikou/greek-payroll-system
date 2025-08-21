import { db } from "../db";
import { 
  auditLog, 
  systemRoles, 
  systemPermissions, 
  rolePermissions, 
  userRoles, 
  userImpersonationSessions,
  employeeSelfServiceAudit,
  employees,
  users
} from "@shared/schema";
import { eq, and, or, inArray } from "drizzle-orm";
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

// Enhanced system roles with proper scoping
export enum SystemRoleName {
  OWNER = 'owner',
  PAYROLL_ADMIN = 'payroll_admin', 
  HR_ADMIN = 'hr_admin',
  MANAGER = 'manager',
  ACCOUNTANT = 'accountant',
  EMPLOYEE = 'employee',
  READ_ONLY_AUDITOR = 'read_only_auditor'
}

export enum PermissionScope {
  TENANT = 'tenant',
  PROPERTY = 'property', 
  EMPLOYEE = 'employee'
}

export interface ScopedPermission {
  resource: string;
  action: string;
  scope: PermissionScope;
  conditions?: string[];
}

export interface UserContext {
  userId: string;
  employeeId?: string;
  propertyId?: string;
  companyId: string;
}

export interface ImpersonationContext {
  originalUserId: string;
  impersonatedUserId: string;
  impersonatedEmployeeId?: string;
  sessionToken: string;
  reason?: string;
}

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
    await db.insert(auditLog).values({
      logId: nanoid(),
      eventType: `rbac.${action}`,
      userId: userId,
      resourceType: 'rbac',
      resourceId: details.approvalId || 'system',
      action: action,
      details: JSON.stringify(details),
      timestamp: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'PayrollSync-RBAC-Service'
    });
  }

  // ============================
  // Enhanced RBAC Functionality  
  // ============================

  /**
   * Initialize system roles and permissions (run once on startup)
   */
  async initializeSystemRoles(): Promise<void> {
    try {
      // Create core system roles
      const roles = [
        { name: SystemRoleName.OWNER, displayName: 'Owner', description: 'Full system access', level: 5 },
        { name: SystemRoleName.PAYROLL_ADMIN, displayName: 'Payroll Administrator', description: 'Payroll management', level: 4 },
        { name: SystemRoleName.HR_ADMIN, displayName: 'HR Administrator', description: 'HR management', level: 4 },
        { name: SystemRoleName.MANAGER, displayName: 'Manager', description: 'Team management', level: 3 },
        { name: SystemRoleName.ACCOUNTANT, displayName: 'Accountant', description: 'Financial operations', level: 3 },
        { name: SystemRoleName.EMPLOYEE, displayName: 'Employee', description: 'Self-service access', level: 1 },
        { name: SystemRoleName.READ_ONLY_AUDITOR, displayName: 'Read-Only Auditor', description: 'Audit access only', level: 2 },
      ];
      
      // Insert system roles (ignoring conflicts)
      for (const role of roles) {
        await db.insert(systemRoles)
          .values(role)
          .onConflictDoNothing()
          .execute();
      }
      
      // Create core system permissions
      const permissions = [
        { name: 'employee_portal.view', resource: 'employee_portal', action: 'view', scope: PermissionScope.EMPLOYEE },
        { name: 'payslip.view', resource: 'payslip', action: 'view', scope: PermissionScope.PROPERTY },
        { name: 'user.impersonate_employee', resource: 'user', action: 'impersonate', scope: PermissionScope.TENANT },
        { name: 'user.invite', resource: 'user', action: 'invite', scope: PermissionScope.TENANT },
        { name: 'user.manage_roles', resource: 'user', action: 'manage_roles', scope: PermissionScope.TENANT },
        { name: 'profile.view_own', resource: 'profile', action: 'view', scope: PermissionScope.EMPLOYEE },
        { name: 'profile.view_any', resource: 'profile', action: 'view', scope: PermissionScope.TENANT },
        { name: 'payroll.manage', resource: 'payroll', action: 'manage', scope: PermissionScope.TENANT },
        { name: 'employee.manage', resource: 'employee', action: 'manage', scope: PermissionScope.PROPERTY },
        { name: 'audit.view', resource: 'audit', action: 'view', scope: PermissionScope.TENANT },
      ];
      
      for (const permission of permissions) {
        await db.insert(systemPermissions)
          .values(permission)
          .onConflictDoNothing()
          .execute();
      }
      
    } catch (error) {
      console.error("Error initializing system roles:", error);
      throw error;
    }
  }

  /**
   * Enhanced permission check with proper scoping and impersonation support
   */
  async hasEnhancedPermission(
    context: UserContext, 
    permissionName: string, 
    targetResourceId?: string,
    impersonationContext?: ImpersonationContext
  ): Promise<boolean> {
    try {
      const userId = impersonationContext?.originalUserId || context.userId;
      const effectiveUserId = impersonationContext?.impersonatedUserId || context.userId;
      
      // Get user's roles
      const userRoleList = await db
        .select()
        .from(userRoles)
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true)
        ));
      
      // Get permission details
      const [permission] = await db
        .select()
        .from(systemPermissions)
        .where(eq(systemPermissions.name, permissionName));
        
      if (!permission) return false;
      
      // Check each role for the permission
      for (const userRole of userRoleList) {
        // Get role's permissions
        const rolePerms = await db
          .select()
          .from(rolePermissions)
          .innerJoin(systemRoles, eq(rolePermissions.roleId, systemRoles.id))
          .innerJoin(systemPermissions, eq(rolePermissions.permissionId, systemPermissions.id))
          .where(and(
            eq(systemRoles.name, userRole.role),
            eq(systemPermissions.name, permissionName)
          ));
        
        if (rolePerms.length > 0) {
          // Apply scoping rules
          const hasAccess = await this.checkEnhancedPermissionScope(
            context, 
            permission, 
            userRole, 
            targetResourceId,
            effectiveUserId
          );
          
          if (hasAccess) {
            // Log audit trail
            if (impersonationContext) {
              await this.logImpersonationAccess(
                impersonationContext,
                permissionName,
                targetResourceId || '',
                'success'
              );
            }
            return true;
          }
        }
      }
      
      return false;
      
    } catch (error) {
      console.error("Enhanced permission check error:", error);
      return false;
    }
  }

  /**
   * Check permission scope (tenant, property, employee) with enhanced logic
   */
  private async checkEnhancedPermissionScope(
    context: UserContext,
    permission: any,
    userRole: any,
    targetResourceId?: string,
    effectiveUserId?: string
  ): Promise<boolean> {
    
    switch (permission.scope) {
      case PermissionScope.TENANT:
        // Tenant-wide access (for owners, admins)
        return true;
      
      case PermissionScope.PROPERTY:
        // Property/team-scoped access
        if (!userRole.propertyId) return true; // No property restriction = all properties
        if (!targetResourceId) return true; // No specific target = allowed within scope
        
        // Check if target belongs to user's property
        // This would need to be implemented based on the specific resource type
        return true; // Simplified for now
        
      case PermissionScope.EMPLOYEE:
        // Employee self-only access
        if (permission.resource === 'employee_portal' || permission.resource === 'profile') {
          // Only allow access to own data
          const targetEmployee = await db
            .select()
            .from(employees)
            .where(eq(employees.employeeId, targetResourceId || ''))
            .limit(1);
            
          if (targetEmployee.length === 0) return false;
          
          const userEmployee = await db
            .select()
            .from(employees)
            .innerJoin(users, eq(employees.userId, users.id))
            .where(eq(users.id, effectiveUserId || context.userId))
            .limit(1);
            
          return userEmployee.length > 0 && 
                 userEmployee[0].employees.employeeId === targetEmployee[0].employeeId;
        }
        
        return false;
        
      default:
        return false;
    }
  }

  /**
   * Get user roles with enhanced information
   */
  async getEnhancedUserRoles(userId: string): Promise<any[]> {
    try {
      const roles = await db
        .select({
          id: userRoles.id,
          role: userRoles.role,
          propertyId: userRoles.propertyId,
          grantedAt: userRoles.grantedAt,
          expiresAt: userRoles.expiresAt,
          isActive: userRoles.isActive,
          roleName: systemRoles.name,
          displayName: systemRoles.displayName,
          description: systemRoles.description,
          level: systemRoles.level
        })
        .from(userRoles)
        .leftJoin(systemRoles, eq(userRoles.role, systemRoles.name))
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true)
        ));
      
      return roles;
      
    } catch (error) {
      console.error("Error fetching enhanced user roles:", error);
      return [];
    }
  }

  /**
   * Assign role to user with proper scoping
   */
  async assignUserRole(
    userId: string, 
    roleName: string, 
    assignedBy: string,
    propertyId?: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      await db.insert(userRoles).values({
        userId,
        role: roleName,
        propertyId: propertyId || null,
        grantedBy: assignedBy,
        expiresAt: expiresAt || null,
        isActive: true
      });
      
      return true;
      
    } catch (error) {
      console.error("Error assigning role:", error);
      return false;
    }
  }

  /**
   * Start impersonation session for "View as Employee" functionality
   */
  async startImpersonationSession(
    impersonatorId: string,
    targetUserId: string,
    reason: string,
    durationMinutes: number = 60
  ): Promise<string | null> {
    try {
      const sessionToken = nanoid(32);
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
      
      // Get target employee info
      const targetEmployee = await db
        .select()
        .from(employees)
        .innerJoin(users, eq(employees.userId, users.id))
        .where(eq(users.id, targetUserId))
        .limit(1);
      
      await db.insert(userImpersonationSessions).values({
        impersonatorId,
        targetUserId,
        targetEmployeeId: targetEmployee.length > 0 ? targetEmployee[0].employees.employeeId : null,
        sessionToken,
        reason,
        expiresAt,
        isActive: true
      });
      
      return sessionToken;
      
    } catch (error) {
      console.error("Error starting impersonation:", error);
      return null;
    }
  }

  /**
   * End impersonation session
   */
  async endImpersonationSession(sessionToken: string): Promise<boolean> {
    try {
      await db
        .update(userImpersonationSessions)
        .set({ 
          isActive: false, 
          endedAt: new Date() 
        })
        .where(eq(userImpersonationSessions.sessionToken, sessionToken));
        
      return true;
      
    } catch (error) {
      console.error("Error ending impersonation:", error);
      return false;
    }
  }

  /**
   * Log employee self-service access for audit
   */
  async logEmployeeSelfServiceAccess(
    employeeId: string,
    userId: string | null,
    action: string,
    resourceType: string,
    resourceId?: string,
    result: 'success' | 'denied' | 'error' = 'success',
    impersonationContext?: ImpersonationContext
  ): Promise<void> {
    try {
      await db.insert(employeeSelfServiceAudit).values({
        employeeId,
        userId,
        action,
        resourceType,
        resourceId: resourceId || null,
        accessResult: result,
        isImpersonated: !!impersonationContext,
        impersonatorId: impersonationContext?.originalUserId || null
      });
      
    } catch (error) {
      console.error("Error logging self-service access:", error);
    }
  }

  /**
   * Log impersonation access for audit
   */
  private async logImpersonationAccess(
    impersonationContext: ImpersonationContext,
    action: string,
    resourceId: string,
    result: string
  ): Promise<void> {
    try {
      await db.insert(auditLog).values({
        logId: nanoid(),
        eventType: 'impersonation_access',
        userId: impersonationContext.originalUserId,
        resourceType: 'impersonation',
        resourceId: impersonationContext.sessionToken,
        action: action,
        details: JSON.stringify({
          originalUser: impersonationContext.originalUserId,
          impersonatedUser: impersonationContext.impersonatedUserId,
          resourceAccessed: resourceId,
          result: result,
          reason: impersonationContext.reason
        }),
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'PayrollSync-RBAC-Service'
      });
      
    } catch (error) {
      console.error("Error logging impersonation access:", error);
    }
  }

  /**
   * Get all system roles
   */
  async getSystemRoles(): Promise<any[]> {
    try {
      return await db
        .select()
        .from(systemRoles)
        .where(eq(systemRoles.isActive, true))
        .orderBy(systemRoles.level);
        
    } catch (error) {
      console.error("Error fetching system roles:", error);
      return [];
    }
  }

  /**
   * Get all system permissions
   */
  async getSystemPermissions(): Promise<any[]> {
    try {
      return await db
        .select()
        .from(systemPermissions)
        .orderBy(systemPermissions.resource, systemPermissions.action);
        
    } catch (error) {
      console.error("Error fetching system permissions:", error);
      return [];
    }
  }
}

export const rbacService = new RBACService();