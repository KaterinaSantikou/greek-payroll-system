/**
 * RBAC Service for Garnishment Operations
 * 
 * Role-based access control specifically for garnishment and court order management.
 * Only payroll_admin and finance_controller roles can create/modify garnishment orders.
 */

export interface GarnishmentPermission {
  resource: 'garnishments';
  action: 'create' | 'read' | 'update' | 'delete' | 'stop' | 'suspend' | 'reactivate' | 'calculate' | 'approve';
  conditions?: string[];
}

export interface GarnishmentRoleDefinition {
  roleId: string;
  name: string;
  garnishmentPermissions: GarnishmentPermission[];
  level: number;
  canApproveOwnRequests: boolean;
  requiresDualApproval: boolean;
}

/**
 * Predefined roles with garnishment permissions
 */
const GARNISHMENT_ROLES: GarnishmentRoleDefinition[] = [
  {
    roleId: 'payroll_admin',
    name: 'Payroll Administrator',
    level: 5,
    canApproveOwnRequests: false,
    requiresDualApproval: true,
    garnishmentPermissions: [
      { resource: 'garnishments', action: 'create' },
      { resource: 'garnishments', action: 'read' },
      { resource: 'garnishments', action: 'update' },
      { resource: 'garnishments', action: 'stop' },
      { resource: 'garnishments', action: 'suspend' },
      { resource: 'garnishments', action: 'reactivate' },
      { resource: 'garnishments', action: 'calculate' }
    ]
  },
  {
    roleId: 'finance_controller',
    name: 'Finance Controller',
    level: 6,
    canApproveOwnRequests: false,
    requiresDualApproval: true,
    garnishmentPermissions: [
      { resource: 'garnishments', action: 'create' },
      { resource: 'garnishments', action: 'read' },
      { resource: 'garnishments', action: 'update' },
      { resource: 'garnishments', action: 'stop' },
      { resource: 'garnishments', action: 'approve' },
      { resource: 'garnishments', action: 'calculate' }
    ]
  },
  {
    roleId: 'compliance_officer',
    name: 'Compliance Officer',
    level: 4,
    canApproveOwnRequests: false,
    requiresDualApproval: false,
    garnishmentPermissions: [
      { resource: 'garnishments', action: 'read' },
      { resource: 'garnishments', action: 'calculate' }
    ]
  },
  {
    roleId: 'hr_admin',
    name: 'HR Administrator',
    level: 3,
    canApproveOwnRequests: false,
    requiresDualApproval: false,
    garnishmentPermissions: [
      { resource: 'garnishments', action: 'read', conditions: ['same_property'] }
    ]
  },
  {
    roleId: 'supervisor',
    name: 'Department Supervisor',
    level: 2,
    canApproveOwnRequests: false,
    requiresDualApproval: false,
    garnishmentPermissions: [
      { resource: 'garnishments', action: 'read', conditions: ['same_department', 'own_employees_only'] }
    ]
  },
  {
    roleId: 'employee',
    name: 'Employee',
    level: 1,
    canApproveOwnRequests: false,
    requiresDualApproval: false,
    garnishmentPermissions: [
      { resource: 'garnishments', action: 'read', conditions: ['self_only'] }
    ]
  }
];

/**
 * Garnishment RBAC Service
 */
export class GarnishmentRBACService {
  
  /**
   * Check if user has permission for garnishment operation
   */
  static async checkGarnishmentPermission(
    userId: string,
    userRole: string,
    action: string,
    resourceId?: string,
    context?: {
      employeeId?: string;
      propertyId?: string;
      departmentId?: string;
    }
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
    approverRoles?: string[];
  }> {
    
    // Find user's role definition
    const roleDefinition = GARNISHMENT_ROLES.find(role => role.roleId === userRole);
    
    if (!roleDefinition) {
      return {
        allowed: false,
        reason: 'Unknown role for garnishment operations'
      };
    }
    
    // Check if role has the requested permission
    const permission = roleDefinition.garnishmentPermissions.find(
      perm => perm.action === action
    );
    
    if (!permission) {
      return {
        allowed: false,
        reason: `Role ${userRole} does not have permission to ${action} garnishments`
      };
    }
    
    // Check conditions
    const conditionResult = await this.evaluatePermissionConditions(\n      permission.conditions || [],\n      userId,\n      context\n    );\n    \n    if (!conditionResult.met) {\n      return {\n        allowed: false,\n        reason: conditionResult.reason\n      };\n    }\n    \n    // Check if dual approval is required for sensitive operations\n    const requiresApproval = this.requiresDualApproval(action, roleDefinition);\n    \n    return {\n      allowed: true,\n      requiresApproval,\n      approverRoles: requiresApproval ? this.getApproverRoles(userRole, action) : undefined\n    };\n  }\n  \n  /**\n   * Get users who can approve garnishment operations\n   */\n  private static getApproverRoles(requesterRole: string, action: string): string[] {\n    const approverRoles: string[] = [];\n    \n    // High-value operations require finance controller approval\n    if (['create', 'stop', 'update'].includes(action)) {\n      approverRoles.push('finance_controller');\n      \n      // Payroll admin can also approve if not the requester\n      if (requesterRole !== 'payroll_admin') {\n        approverRoles.push('payroll_admin');\n      }\n    }\n    \n    return approverRoles;\n  }\n  \n  /**\n   * Check if action requires dual approval\n   */\n  private static requiresDualApproval(action: string, roleDefinition: GarnishmentRoleDefinition): boolean {\n    const sensitiveActions = ['create', 'stop', 'update'];\n    \n    return sensitiveActions.includes(action) && \n           roleDefinition.requiresDualApproval;\n  }\n  \n  /**\n   * Evaluate permission conditions\n   */\n  private static async evaluatePermissionConditions(\n    conditions: string[],\n    userId: string,\n    context?: {\n      employeeId?: string;\n      propertyId?: string;\n      departmentId?: string;\n    }\n  ): Promise<{\n    met: boolean;\n    reason?: string;\n  }> {\n    \n    for (const condition of conditions) {\n      switch (condition) {\n        case 'self_only':\n          if (context?.employeeId && context.employeeId !== userId) {\n            return {\n              met: false,\n              reason: 'Can only access own garnishment information'\n            };\n          }\n          break;\n          \n        case 'same_property':\n          // Would need to implement property checking logic\n          // For now, assume it passes\n          break;\n          \n        case 'same_department':\n          // Would need to implement department checking logic\n          // For now, assume it passes\n          break;\n          \n        case 'own_employees_only':\n          // Would need to implement employee hierarchy checking\n          // For now, assume it passes\n          break;\n      }\n    }\n    \n    return { met: true };\n  }\n  \n  /**\n   * Get garnishment permissions for user role\n   */\n  static getGarnishmentPermissions(userRole: string): GarnishmentPermission[] {\n    const roleDefinition = GARNISHMENT_ROLES.find(role => role.roleId === userRole);\n    return roleDefinition?.garnishmentPermissions || [];\n  }\n  \n  /**\n   * Check if user can view garnishment details for specific employee\n   */\n  static async canViewEmployeeGarnishments(\n    userId: string,\n    userRole: string,\n    targetEmployeeId: string\n  ): Promise<boolean> {\n    \n    const permission = await this.checkGarnishmentPermission(\n      userId,\n      userRole,\n      'read',\n      undefined,\n      { employeeId: targetEmployeeId }\n    );\n    \n    return permission.allowed;\n  }\n  \n  /**\n   * Generate audit entry for garnishment permission check\n   */\n  static async auditPermissionCheck(\n    userId: string,\n    userRole: string,\n    action: string,\n    resourceId: string,\n    allowed: boolean,\n    reason?: string\n  ): Promise<void> {\n    \n    // Log to garnishment audit trail\n    await this.logGarnishmentAudit({\n      eventType: 'permission_check',\n      actor: userId,\n      garnishmentOrderId: resourceId,\n      eventReason: `${action} permission ${allowed ? 'granted' : 'denied'} for role ${userRole}${reason ? ': ' + reason : ''}`,\n      disposableNetBefore: 0,\n      disposableNetAfter: 0,\n      requestedAmount: 0,\n      appliedAmount: 0,\n      wasSkipped: !allowed\n    });\n  }\n  \n  /**\n   * Helper to log garnishment audit entries\n   */\n  private static async logGarnishmentAudit(auditData: any): Promise<void> {\n    try {\n      // Import here to avoid circular dependency\n      const { GarnishmentService } = await import('./GarnishmentService');\n      await GarnishmentService.logAuditEntry(auditData);\n    } catch (error) {\n      console.error('Failed to log garnishment audit entry:', error);\n      // Don't throw - audit logging shouldn't break permission checks\n    }\n  }\n  \n  /**\n   * Middleware factory for garnishment route protection\n   */\n  static createGarnishmentAuthMiddleware(requiredAction: string) {\n    return async (req: any, res: any, next: any) => {\n      try {\n        const userId = req.user?.claims?.sub;\n        const userRole = await this.getUserRole(userId); // Would need to implement\n        \n        const permission = await this.checkGarnishmentPermission(\n          userId,\n          userRole,\n          requiredAction,\n          req.params.id,\n          {\n            employeeId: req.params.employeeId || req.body.employeeId,\n            propertyId: req.body.propertyId,\n            departmentId: req.body.departmentId\n          }\n        );\n        \n        // Audit the permission check\n        await this.auditPermissionCheck(\n          userId,\n          userRole,\n          requiredAction,\n          req.params.id || 'unknown',\n          permission.allowed,\n          permission.reason\n        );\n        \n        if (!permission.allowed) {\n          return res.status(403).json({\n            success: false,\n            error: 'Insufficient permissions for garnishment operation',\n            reason: permission.reason\n          });\n        }\n        \n        // Store permission info for downstream handlers\n        req.garnishmentPermission = permission;\n        \n        next();\n      } catch (error) {\n        console.error('Garnishment auth middleware error:', error);\n        res.status(500).json({\n          success: false,\n          error: 'Permission validation failed'\n        });\n      }\n    };\n  }\n  \n  /**\n   * Get user role (placeholder - would integrate with existing RBAC system)\n   */\n  private static async getUserRole(userId: string): Promise<string> {\n    // This would integrate with the existing RBAC service\n    // For now, return a default role\n    return 'employee';\n  }\n}