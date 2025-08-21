/**
 * Attribute-Based Access Control (ABAC) Security System
 * Provides row-level security checking employee_id against token.as_employee_id
 */

export interface SecurityContext {
  userId: string;
  userRole: string;
  employeeId?: string; // If user is associated with an employee record
  asEmployeeId?: string; // For impersonation scenarios
  tenantId: string;
  propertyIds: string[];
  departmentId?: string;
  permissions: string[];
  sessionId: string;
  isImpersonating: boolean;
  impersonationReason?: string;
  ipAddress: string;
  userAgent: string;
}

export interface AccessRequest {
  resource: string; // e.g., 'payslips', 'employees', 'timesheets'
  action: 'read' | 'write' | 'delete' | 'create';
  resourceId?: string;
  resourceData?: any; // The actual data being accessed
  context: SecurityContext;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  maskedFields?: string[];
  auditRequired: boolean;
  riskScore: number; // 0-100
}

export class ABACSecurityEngine {
  
  /**
   * Main access control decision function
   */
  static async checkAccess(request: AccessRequest): Promise<AccessDecision> {
    // Always audit access attempts for sensitive resources
    const auditRequired = this.requiresAudit(request.resource);
    
    try {
      // 1. Role-based access control
      const roleCheck = await this.checkRoleAccess(request);
      if (!roleCheck.allowed) {
        return {
          ...roleCheck,
          auditRequired,
          riskScore: this.calculateRiskScore(request, 'role_denied')
        };
      }

      // 2. Row-level security for employee data
      const rowLevelCheck = await this.checkRowLevelSecurity(request);
      if (!rowLevelCheck.allowed) {
        return {
          ...rowLevelCheck,
          auditRequired,
          riskScore: this.calculateRiskScore(request, 'row_level_denied')
        };
      }

      // 3. Tenant isolation check
      const tenantCheck = await this.checkTenantIsolation(request);
      if (!tenantCheck.allowed) {
        return {
          ...tenantCheck,
          auditRequired,
          riskScore: this.calculateRiskScore(request, 'tenant_violation')
        };
      }

      // 4. Impersonation constraints
      if (request.context.isImpersonating) {
        const impersonationCheck = await this.checkImpersonationConstraints(request);
        if (!impersonationCheck.allowed) {
          return {
            ...impersonationCheck,
            auditRequired: true, // Always audit impersonation failures
            riskScore: this.calculateRiskScore(request, 'impersonation_denied')
          };
        }
      }

      // 5. PII data masking requirements
      const maskedFields = this.determineMaskedFields(request);

      // Access allowed
      return {
        allowed: true,
        reason: 'Access granted',
        maskedFields,
        auditRequired,
        riskScore: this.calculateRiskScore(request, 'granted')
      };

    } catch (error) {
      console.error('ABAC Security Error:', error);
      return {
        allowed: false,
        reason: 'Security check failed',
        auditRequired: true,
        riskScore: 100 // Maximum risk for system errors
      };
    }
  }

  /**
   * Role-based access control
   */
  private static async checkRoleAccess(request: AccessRequest): Promise<AccessDecision> {
    const { userRole, permissions } = request.context;
    const { resource, action } = request;

    // Define resource-action to permission mapping
    const requiredPermission = this.getRequiredPermission(resource, action);
    
    if (!requiredPermission) {
      return { allowed: true, reason: 'No permission required', auditRequired: false, riskScore: 0 };
    }

    // Check if user has the required permission
    if (permissions.includes(requiredPermission)) {
      return { allowed: true, reason: 'Role permission granted', auditRequired: false, riskScore: 5 };
    }

    // Special admin bypass for emergencies (but log it)
    if (userRole === 'admin' && this.isEmergencyAccess(request)) {
      return { 
        allowed: true, 
        reason: 'Admin emergency access', 
        auditRequired: true, 
        riskScore: 30 
      };
    }

    return {
      allowed: false,
      reason: `Missing permission: ${requiredPermission}`,
      auditRequired: true,
      riskScore: 60
    };
  }

  /**
   * Row-level security - core ABAC logic
   */
  private static async checkRowLevelSecurity(request: AccessRequest): Promise<AccessDecision> {
    const { employeeId, asEmployeeId, userRole } = request.context;
    const { resource, resourceData } = request;

    // Resources that require row-level security
    const employeeResources = ['payslips', 'timesheets', 'leaves', 'profile', 'schedules'];
    
    if (!employeeResources.includes(resource)) {
      return { allowed: true, reason: 'Row-level security not applicable', auditRequired: false, riskScore: 0 };
    }

    // Admin and HR can access all employee data
    if (['admin', 'hr_payroll'].includes(userRole)) {
      return { 
        allowed: true, 
        reason: 'Administrative access to employee data', 
        auditRequired: true, 
        riskScore: 15 
      };
    }

    // For impersonation: check if user can impersonate target employee
    const targetEmployeeId = asEmployeeId || employeeId;
    
    if (!targetEmployeeId) {
      return {
        allowed: false,
        reason: 'No employee ID context available',
        auditRequired: true,
        riskScore: 50
      };
    }

    // Manager access: can access employees in their department/property
    if (userRole === 'manager') {
      const managerCanAccess = await this.checkManagerAccess(request.context, targetEmployeeId);
      if (managerCanAccess) {
        return { 
          allowed: true, 
          reason: 'Manager access to department employee', 
          auditRequired: true, 
          riskScore: 20 
        };
      }
    }

    // Core rule: employee_id must match token.as_employee_id or token.employee_id
    if (resourceData && resourceData.employeeId) {
      if (resourceData.employeeId === targetEmployeeId) {
        return { 
          allowed: true, 
          reason: 'Employee accessing own data', 
          auditRequired: false, 
          riskScore: 5 
        };
      } else {
        return {
          allowed: false,
          reason: `Employee ID mismatch: resource=${resourceData.employeeId}, token=${targetEmployeeId}`,
          auditRequired: true,
          riskScore: 80
        };
      }
    }

    return { allowed: true, reason: 'Row-level check passed', auditRequired: false, riskScore: 10 };
  }

  /**
   * Tenant isolation security
   */
  private static async checkTenantIsolation(request: AccessRequest): Promise<AccessDecision> {
    const { tenantId } = request.context;
    const { resourceData } = request;

    if (resourceData && resourceData.tenantId) {
      if (resourceData.tenantId !== tenantId) {
        return {
          allowed: false,
          reason: 'Tenant isolation violation',
          auditRequired: true,
          riskScore: 95
        };
      }
    }

    return { allowed: true, reason: 'Tenant isolation passed', auditRequired: false, riskScore: 5 };
  }

  /**
   * Impersonation security constraints
   */
  private static async checkImpersonationConstraints(request: AccessRequest): Promise<AccessDecision> {
    const { userRole, isImpersonating, asEmployeeId, impersonationReason } = request.context;
    const { action } = request;

    // Only admin and HR can impersonate
    if (!['admin', 'hr_payroll'].includes(userRole)) {
      return {
        allowed: false,
        reason: 'User role cannot impersonate',
        auditRequired: true,
        riskScore: 90
      };
    }

    // Write operations during impersonation require extra scrutiny
    if (['write', 'delete', 'create'].includes(action)) {
      // Most write operations should be blocked during impersonation
      const allowedWriteOperations = ['audit_log', 'session_update'];
      if (!allowedWriteOperations.includes(request.resource)) {
        return {
          allowed: false,
          reason: 'Write operations restricted during impersonation',
          auditRequired: true,
          riskScore: 70
        };
      }
    }

    // Validate impersonation reason exists
    if (!impersonationReason || impersonationReason.trim().length < 10) {
      return {
        allowed: false,
        reason: 'Invalid or missing impersonation reason',
        auditRequired: true,
        riskScore: 85
      };
    }

    // Check if target employee exists and is active
    if (asEmployeeId) {
      const employeeValid = await this.validateEmployeeExists(asEmployeeId);
      if (!employeeValid) {
        return {
          allowed: false,
          reason: 'Target employee not found or inactive',
          auditRequired: true,
          riskScore: 75
        };
      }
    }

    return { 
      allowed: true, 
      reason: 'Impersonation constraints satisfied', 
      auditRequired: true, 
      riskScore: 25 
    };
  }

  /**
   * Calculate risk score for audit purposes
   */
  private static calculateRiskScore(request: AccessRequest, outcome: string): number {
    let score = 0;
    
    // Base scores by outcome
    const outcomeScores = {
      'granted': 5,
      'role_denied': 60,
      'row_level_denied': 80,
      'tenant_violation': 95,
      'impersonation_denied': 85
    };
    
    score += outcomeScores[outcome as keyof typeof outcomeScores] || 50;

    // Risk factors
    if (request.context.isImpersonating) score += 15;
    if (request.action === 'delete') score += 20;
    if (request.resource === 'payslips') score += 10;
    if (!request.context.employeeId) score += 10;

    // Time-based risk (outside business hours)
    const hour = new Date().getHours();
    if (hour < 7 || hour > 19) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Determine which fields need PII masking
   */
  private static determineMaskedFields(request: AccessRequest): string[] {
    const { userRole } = request.context;
    const { resource } = request;

    const maskedFields: string[] = [];

    // Employee role sees most PII masked
    if (userRole === 'employee') {
      switch (resource) {
        case 'employees':
          maskedFields.push('afm', 'amka', 'bankAccount', 'salary');
          break;
        case 'payslips':
          // Employees can see their own payslips unmasked
          if (request.context.asEmployeeId !== request.resourceData?.employeeId) {
            maskedFields.push('bankAccount');
          }
          break;
      }
    }

    // Manager role sees some PII masked
    if (userRole === 'manager') {
      maskedFields.push('bankAccount', 'afm', 'amka');
    }

    return maskedFields;
  }

  /**
   * Helper methods
   */
  private static getRequiredPermission(resource: string, action: string): string | null {
    const permissionMap: Record<string, Record<string, string>> = {
      'payslips': {
        'read': 'view_payslips',
        'write': 'manage_payroll',
        'create': 'manage_payroll',
        'delete': 'manage_payroll'
      },
      'employees': {
        'read': 'view_employees',
        'write': 'manage_employees',
        'create': 'manage_employees',
        'delete': 'manage_employees'
      },
      'timesheets': {
        'read': 'view_timesheets',
        'write': 'manage_timesheets',
        'create': 'clock_in_out',
        'delete': 'manage_timesheets'
      }
    };

    return permissionMap[resource]?.[action] || null;
  }

  private static requiresAudit(resource: string): boolean {
    const auditableResources = ['payslips', 'employees', 'timesheets', 'leaves', 'salary'];
    return auditableResources.includes(resource);
  }

  private static isEmergencyAccess(request: AccessRequest): boolean {
    // Define emergency access scenarios
    // This could be expanded with more sophisticated logic
    return false;
  }

  private static async checkManagerAccess(context: SecurityContext, targetEmployeeId: string): Promise<boolean> {
    // In real implementation, this would check if the manager
    // has authority over the target employee's department/property
    return context.propertyIds.length > 0; // Simplified check
  }

  private static async validateEmployeeExists(employeeId: string): Promise<boolean> {
    // In real implementation, this would query the database
    return employeeId.length > 0; // Simplified check
  }
}

export default ABACSecurityEngine;