/**
 * Access Control Middleware
 * Implements role evaluation and scope enforcement for all API endpoints
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ABACSecurityEngine, { SecurityContext, AccessRequest } from '../lib/abacSecurity';
import { auditLogger } from '../lib/auditLogging';

export interface AccessToken {
  sub: string; // user_id
  email: string;
  role: string;
  tenant_id: string;
  employee_id?: string;
  as_employee_id?: string; // For impersonation
  property_ids: string[];
  department_id?: string;
  permissions: string[];
  session_id: string;
  act?: 'impersonate'; // Token type
  exp: number;
  iat: number;
}

export interface AuthenticatedRequest extends Request {
  user: AccessToken;
  securityContext: SecurityContext;
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as AccessToken;
    
    // Check token expiration
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // For impersonation tokens, check they're short-lived (≤15 min)
    if (decoded.act === 'impersonate') {
      const maxAge = 15 * 60; // 15 minutes in seconds
      if (decoded.exp - decoded.iat > maxAge) {
        return res.status(401).json({ error: 'Impersonation token too long-lived' });
      }
    }

    // Create security context
    const securityContext: SecurityContext = {
      userId: decoded.sub,
      userRole: decoded.role,
      employeeId: decoded.employee_id,
      asEmployeeId: decoded.as_employee_id,
      tenantId: decoded.tenant_id,
      propertyIds: decoded.property_ids,
      departmentId: decoded.department_id,
      permissions: decoded.permissions,
      sessionId: decoded.session_id,
      isImpersonating: !!decoded.as_employee_id,
      impersonationReason: req.headers['x-impersonation-reason'] as string,
      ipAddress: req.ip || req.connection.remoteAddress || '0.0.0.0',
      userAgent: req.get('User-Agent') || 'unknown'
    };

    (req as AuthenticatedRequest).user = decoded;
    (req as AuthenticatedRequest).securityContext = securityContext;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Authorization middleware - checks permissions and scope
 */
export function authorize(resource: string, action: string = 'read') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.securityContext) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Create access request
      const accessRequest: AccessRequest = {
        resource,
        action: action as any,
        resourceId: req.params.id || req.params.employeeId,
        resourceData: req.body || null,
        context: authReq.securityContext
      };

      // Check access with ABAC engine
      const decision = await ABACSecurityEngine.checkAccess(accessRequest);

      if (!decision.allowed) {
        // Log access denial
        await auditLogger.logAccessAttempt({
          userId: authReq.securityContext.userId,
          userRole: authReq.securityContext.userRole,
          employeeId: authReq.securityContext.employeeId,
          asEmployeeId: authReq.securityContext.asEmployeeId,
          sessionId: authReq.securityContext.sessionId,
          resource,
          resourceId: accessRequest.resourceId,
          action,
          outcome: 'blocked',
          riskScore: decision.riskScore,
          reason: decision.reason,
          metadata: {
            tenantId: authReq.securityContext.tenantId,
            source: 'web',
            platform: 'server',
            version: '1.0.0',
            environment: process.env.NODE_ENV as any || 'development',
            severity: 'high',
            tags: ['access_denied', 'authorization']
          },
          details: {
            ipAddress: authReq.securityContext.ipAddress,
            userAgent: authReq.securityContext.userAgent,
            description: `Access denied to ${resource}`,
            reasonCode: decision.reason
          }
        });

        return res.status(403).json({ 
          error: 'Access denied', 
          reason: decision.reason,
          riskScore: decision.riskScore 
        });
      }

      // Log successful access for sensitive resources
      if (decision.auditRequired) {
        await auditLogger.logAccessAttempt({
          userId: authReq.securityContext.userId,
          userRole: authReq.securityContext.userRole,
          employeeId: authReq.securityContext.employeeId,
          asEmployeeId: authReq.securityContext.asEmployeeId,
          sessionId: authReq.securityContext.sessionId,
          resource,
          resourceId: accessRequest.resourceId,
          action,
          outcome: 'success',
          riskScore: decision.riskScore,
          metadata: {
            tenantId: authReq.securityContext.tenantId,
            source: 'web',
            platform: 'server',
            version: '1.0.0',
            environment: process.env.NODE_ENV as any || 'development',
            severity: decision.riskScore > 50 ? 'high' : 'medium',
            tags: ['access_granted', 'authorization']
          },
          details: {
            ipAddress: authReq.securityContext.ipAddress,
            userAgent: authReq.securityContext.userAgent,
            description: `Successful access to ${resource}`,
            maskedFields: decision.maskedFields
          }
        });
      }

      // Store decision for downstream use
      (req as any).accessDecision = decision;
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

/**
 * Employee scope enforcement - ensures employee can only access their own data
 */
export function enforceEmployeeScope(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  const targetEmployeeId = req.params.employeeId || req.body?.employeeId || req.query?.employeeId;
  
  // Admin and HR can access any employee data
  if (['admin', 'hr_payroll'].includes(authReq.user.role)) {
    return next();
  }

  // For impersonation, use as_employee_id
  const allowedEmployeeId = authReq.user.as_employee_id || authReq.user.employee_id;
  
  if (!allowedEmployeeId) {
    return res.status(403).json({ error: 'No employee scope available' });
  }

  if (targetEmployeeId && targetEmployeeId !== allowedEmployeeId) {
    // Log scope violation
    auditLogger.logSecurityViolation({
      userId: authReq.user.sub,
      userRole: authReq.user.role,
      sessionId: authReq.user.session_id,
      violationType: 'employee_scope_violation',
      resource: 'employee_data',
      resourceId: targetEmployeeId,
      severity: 'high',
      details: {
        description: `Attempt to access employee ${targetEmployeeId} when scoped to ${allowedEmployeeId}`,
        ipAddress: authReq.securityContext.ipAddress,
        userAgent: authReq.securityContext.userAgent
      },
      metadata: {
        tenantId: authReq.user.tenant_id,
        source: 'web',
        platform: 'server',
        version: '1.0.0',
        environment: process.env.NODE_ENV as any || 'development',
        severity: 'high',
        tags: ['scope_violation', 'security']
      }
    });

    return res.status(403).json({ 
      error: 'Access denied - employee scope violation',
      allowedScope: allowedEmployeeId,
      requestedScope: targetEmployeeId
    });
  }

  next();
}

/**
 * Access window enforcement - checks if terminated employee is within access window
 */
export function enforceAccessWindow(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthenticatedRequest;
  
  // Skip for admin and HR roles
  if (['admin', 'hr_payroll'].includes(authReq.user.role)) {
    return next();
  }

  // Check if employee has access_until restriction
  // In real implementation, this would check the employee record
  const accessUntil = req.headers['x-access-until'] as string;
  
  if (accessUntil) {
    const accessDate = new Date(accessUntil);
    const now = new Date();
    
    if (now > accessDate) {
      return res.status(403).json({ 
        error: 'Access period expired',
        accessUntil: accessUntil
      });
    }

    // For terminated employees, restrict to read-only operations
    if (req.method !== 'GET') {
      return res.status(403).json({ 
        error: 'Write operations not allowed for terminated employees'
      });
    }
  }

  next();
}

/**
 * Helper function to extract JWT token from request
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check for token in cookies as fallback
  return req.cookies?.access_token || null;
}

export default {
  authenticate,
  authorize,
  enforceEmployeeScope,
  enforceAccessWindow
};