/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Ensures sensitive payroll operations require proper role-based authorization.
 * Implements Greek HR/Payroll system role hierarchy and permissions.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../observability/logging.js';

// Extend Express Request interface to include user with roles
declare global {
  namespace Express {
    interface Request {
      user?: {
        claims?: {
          sub: string;
          email?: string;
          name?: string;
        };
        roles?: string[];
      };
    }
  }
}

export interface RolePermission {
  resource: string;
  actions: string[];
  level: number; // 1-5, higher numbers have more authority
}

// Greek HR/Payroll Role Hierarchy
const ROLE_PERMISSIONS: Record<string, RolePermission[]> = {
  // Level 1: Basic Employee Access
  employee: [
    { resource: 'timesheets', actions: ['read', 'create'], level: 1 },
    { resource: 'payslips', actions: ['read'], level: 1 },
    { resource: 'profile', actions: ['read', 'update'], level: 1 }
  ],

  // Level 2: Department Supervisor
  supervisor: [
    { resource: 'timesheets', actions: ['read', 'create', 'approve'], level: 2 },
    { resource: 'employees', actions: ['read'], level: 2 },
    { resource: 'schedules', actions: ['read', 'create', 'update'], level: 2 }
  ],

  // Level 3: HR Manager
  hr_manager: [
    { resource: 'employees', actions: ['read', 'create', 'update'], level: 3 },
    { resource: 'contracts', actions: ['read', 'create', 'update'], level: 3 },
    { resource: 'timesheets', actions: ['read', 'update', 'lock'], level: 3 },
    { resource: 'payslips', actions: ['read'], level: 3 },
    { resource: 'reports', actions: ['read', 'generate'], level: 3 }
  ],

  // Level 4: Payroll Manager
  payroll_manager: [
    { resource: 'payroll', actions: ['read', 'create', 'calculate', 'validate'], level: 4 },
    { resource: 'timesheets', actions: ['read', 'update', 'lock'], level: 4 },
    { resource: 'payslips', actions: ['read', 'generate'], level: 4 },
    { resource: 'corrections', actions: ['read', 'create'], level: 4 },
    { resource: 'employees', actions: ['read'], level: 4 },
    { resource: 'reports', actions: ['read', 'generate'], level: 4 }
  ],

  // Level 4: Compliance Officer
  compliance_officer: [
    { resource: 'filings', actions: ['read', 'create', 'submit'], level: 4 },
    { resource: 'ergani', actions: ['read', 'submit'], level: 4 },
    { resource: 'efka', actions: ['read', 'submit'], level: 4 },
    { resource: 'audits', actions: ['read', 'create'], level: 4 },
    { resource: 'payroll', actions: ['read', 'validate'], level: 4 },
    { resource: 'reports', actions: ['read', 'generate'], level: 4 }
  ],

  // Level 5: Finance Controller
  finance_controller: [
    { resource: 'payroll', actions: ['read', 'create', 'calculate', 'validate', 'finalize'], level: 5 },
    { resource: 'payments', actions: ['read', 'approve', 'process'], level: 5 },
    { resource: 'filings', actions: ['read', 'approve'], level: 5 },
    { resource: 'corrections', actions: ['read', 'approve'], level: 5 },
    { resource: 'reports', actions: ['read', 'generate', 'financial'], level: 5 },
    { resource: 'budgets', actions: ['read', 'create', 'update'], level: 5 }
  ],

  // Level 5: System Administrator
  admin: [
    { resource: '*', actions: ['*'], level: 5 }
  ]
};

// Default role assignment (in production, this would come from database)
const DEFAULT_ROLES: Record<string, string[]> = {
  // This would be populated from user database or directory service
};

/**
 * Get user roles from request context
 */
function getUserRoles(req: Request): string[] {
  // In production, this would come from:
  // 1. User database lookup
  // 2. JWT token claims  
  // 3. Directory service (LDAP/AD)
  // 4. Session storage
  
  const userId = req.user?.claims?.sub;
  if (!userId) return ['employee']; // Default to basic employee role
  
  // For now, return roles from request object or default
  return req.user?.roles || DEFAULT_ROLES[userId] || ['employee'];
}

/**
 * Check if user has permission to perform action on resource
 */
function hasPermission(
  userRoles: string[], 
  resource: string, 
  action: string, 
  requiredLevel: number = 1
): boolean {
  // Admin has access to everything
  if (userRoles.includes('admin')) return true;
  
  // Check each user role for permission
  for (const role of userRoles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) continue;
    
    for (const permission of permissions) {
      // Check level requirement
      if (permission.level < requiredLevel) continue;
      
      // Check resource match (wildcard or exact)
      const resourceMatch = permission.resource === '*' || permission.resource === resource;
      if (!resourceMatch) continue;
      
      // Check action match (wildcard or exact)
      const actionMatch = permission.actions.includes('*') || permission.actions.includes(action);
      if (actionMatch) return true;
    }
  }
  
  return false;
}

/**
 * RBAC middleware factory
 */
export function requireRole(resource: string, action: string, level: number = 1) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRoles = getUserRoles(req);
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;
      
      // Check permission
      if (!hasPermission(userRoles, resource, action, level)) {
        // Log security event
        logger.warn('Access denied - insufficient permissions', {
          userId,
          userEmail,
          userRoles,
          requiredResource: resource,
          requiredAction: action,
          requiredLevel: level,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'Insufficient permissions to perform this action',
          required: {
            resource,
            action,
            level
          },
          userRoles: userRoles // Remove in production for security
        });
      }
      
      // Log successful authorization
      logger.debug('Access granted', {
        userId,
        userEmail,
        userRoles,
        resource,
        action,
        level,
        path: req.path
      });
      
      next();
    } catch (error) {
      logger.error('RBAC middleware error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ error: 'Authorization error' });
    }
  };
}

/**
 * Specific middleware for payroll operations
 */
export const requirePayrollAccess = requireRole('payroll', 'read', 4);
export const requirePayrollCreate = requireRole('payroll', 'create', 4);
export const requirePayrollFinalize = requireRole('payroll', 'finalize', 5);
export const requirePayrollCorrection = requireRole('corrections', 'approve', 4);

/**
 * Employee data access control
 */
export const requireEmployeeRead = requireRole('employees', 'read', 2);
export const requireEmployeeWrite = requireRole('employees', 'create', 3);
export const requireEmployeeUpdate = requireRole('employees', 'update', 3);

/**
 * Financial data access control
 */
export const requireFinancialRead = requireRole('reports', 'financial', 4);
export const requirePaymentApproval = requireRole('payments', 'approve', 5);

/**
 * Government filing access control
 */
export const requireFilingAccess = requireRole('filings', 'read', 4);
export const requireFilingSubmit = requireRole('filings', 'submit', 4);
export const requireErganiAccess = requireRole('ergani', 'submit', 4);

/**
 * Audit and compliance access control
 */
export const requireAuditAccess = requireRole('audits', 'read', 4);
export const requireComplianceReports = requireRole('reports', 'generate', 4);

/**
 * Role checking utility for use in route handlers
 */
export function checkUserRole(req: Request, requiredRole: string): boolean {
  const userRoles = getUserRoles(req);
  return userRoles.includes(requiredRole) || userRoles.includes('admin');
}

/**
 * Get user authorization level
 */
export function getUserLevel(req: Request): number {
  const userRoles = getUserRoles(req);
  let maxLevel = 1; // Default employee level
  
  for (const role of userRoles) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) continue;
    
    for (const permission of permissions) {
      if (permission.level > maxLevel) {
        maxLevel = permission.level;
      }
    }
  }
  
  return maxLevel;
}

/**
 * Middleware to add user context to request
 */
export function addUserContext(req: Request, res: Response, next: NextFunction) {
  const userRoles = getUserRoles(req);
  const userLevel = getUserLevel(req);
  
  // Add to request for use in route handlers
  req.user = {
    ...req.user,
    roles: userRoles
  };
  
  // Add to response headers for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-User-Roles', userRoles.join(','));
    res.setHeader('X-User-Level', userLevel.toString());
  }
  
  next();
}