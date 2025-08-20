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
    const conditionResult = await this.evaluatePermissionConditions(
      permission.conditions || [],
      userId,
      context
    );
    
    if (!conditionResult.met) {
      return {
        allowed: false,
        reason: conditionResult.reason
      };
    }
    
    // Check if dual approval is required for sensitive operations
    const requiresApproval = this.requiresDualApproval(action, roleDefinition);
    
    return {
      allowed: true,
      requiresApproval,
      approverRoles: requiresApproval ? this.getApproverRoles(userRole, action) : undefined
    };
  }
  
  /**
   * Get users who can approve garnishment operations
   */
  private static getApproverRoles(requesterRole: string, action: string): string[] {
    const approverRoles: string[] = [];
    
    // High-value operations require finance controller approval
    if (['create', 'stop', 'update'].includes(action)) {
      approverRoles.push('finance_controller');
      
      // Payroll admin can also approve if not the requester
      if (requesterRole !== 'payroll_admin') {
        approverRoles.push('payroll_admin');
      }
    }
    
    return approverRoles;
  }
  
  /**
   * Check if action requires dual approval
   */
  private static requiresDualApproval(action: string, roleDefinition: GarnishmentRoleDefinition): boolean {
    const sensitiveActions = ['create', 'stop', 'update'];
    
    return sensitiveActions.includes(action) && 
           roleDefinition.requiresDualApproval;
  }
  
  /**
   * Evaluate permission conditions
   */
  private static async evaluatePermissionConditions(
    conditions: string[],
    userId: string,
    context?: {
      employeeId?: string;
      propertyId?: string;
      departmentId?: string;
    }
  ): Promise<{
    met: boolean;
    reason?: string;
  }> {
    
    for (const condition of conditions) {
      switch (condition) {
        case 'self_only':
          if (context?.employeeId && context.employeeId !== userId) {
            return {
              met: false,
              reason: 'Can only access own garnishment information'
            };
          }
          break;
          
        case 'same_property':
          // Would need to implement property checking logic
          // For now, assume it passes
          break;
          
        case 'same_department':
          // Would need to implement department checking logic
          // For now, assume it passes
          break;
          
        case 'own_employees_only':
          // Would need to implement employee hierarchy checking
          // For now, assume it passes
          break;
      }
    }
    
    return { met: true };
  }
  
  /**
   * Get garnishment permissions for user role
   */
  static getGarnishmentPermissions(userRole: string): GarnishmentPermission[] {
    const roleDefinition = GARNISHMENT_ROLES.find(role => role.roleId === userRole);
    return roleDefinition?.garnishmentPermissions || [];
  }
  
  /**
   * Get user role (placeholder - would integrate with existing RBAC system)
   */
  private static async getUserRole(userId: string): Promise<string> {
    // This would integrate with the existing RBAC service
    // For now, return a default role
    return 'employee';
  }
}