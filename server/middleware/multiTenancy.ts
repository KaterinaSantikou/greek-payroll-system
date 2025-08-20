/**
 * Multi-Tenancy Middleware for PayrollSync
 * Ensures complete data isolation between companies (tenants)
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { companies, companyUsers, dataAccessAudit } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Extend Express Request type for multi-tenancy
declare global {
  namespace Express {
    interface Request {
      companyId?: string;
      companyUser?: any;
      userPermissions?: any;
      accessLevel?: 'standard' | 'restricted' | 'full';
    }
  }
}

/**
 * Extract company context from user session
 */
export const extractCompanyContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's company associations
    const companyUser = await db
      .select()
      .from(companyUsers)
      .leftJoin(companies, eq(companyUsers.companyId, companies.companyId))
      .where(and(
        eq(companyUsers.userId, userId),
        eq(companyUsers.isActive, true)
      ))
      .limit(1);

    if (!companyUser.length) {
      return res.status(403).json({ 
        error: 'No company access', 
        message: 'User is not associated with any active company' 
      });
    }

    // Set company context in request
    req.companyId = companyUser[0].company_users.companyId;
    req.companyUser = companyUser[0].company_users;
    req.userPermissions = companyUser[0].company_users.permissions;
    req.accessLevel = companyUser[0].company_users.accessLevel;

    // Validate company is active
    if (!companyUser[0].companies?.isActive) {
      return res.status(403).json({ 
        error: 'Company suspended', 
        message: 'Company account is not active' 
      });
    }

    next();
  } catch (error) {
    console.error('Multi-tenancy context error:', error);
    return res.status(500).json({ error: 'Company context extraction failed' });
  }
};

/**
 * Enforce data isolation - all queries must be scoped to company
 */
export const enforceDataIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.companyId) {
    return res.status(403).json({ 
      error: 'Missing company context', 
      message: 'Company ID is required for data access' 
    });
  }

  // Add company_id filter to query parameters for automatic scoping
  if (req.method === 'GET') {
    req.query.company_id = req.companyId;
  }
  
  // Add company_id to request body for write operations
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    req.body.company_id = req.companyId;
  }

  next();
};

/**
 * Role-based permission checking
 */
export const checkPermissions = (requiredModule: string, requiredAction: string = 'view') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissions = req.userPermissions || {};
    
    // System admin has all permissions
    if (permissions.all === true) {
      return next();
    }

    // Check module-specific permissions
    const modulePerms = permissions.modules?.[requiredModule];
    
    if (!modulePerms) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: `No access to ${requiredModule} module` 
      });
    }

    // Check action-specific permissions
    if (modulePerms === 'full' || modulePerms === requiredAction || modulePerms.includes?.(requiredAction)) {
      return next();
    }

    return res.status(403).json({ 
      error: 'Insufficient permissions', 
      message: `Cannot ${requiredAction} in ${requiredModule} module` 
    });
  };
};

/**
 * Property-level access control
 */
export const checkPropertyAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propertyId = req.params.propertyId || req.body.property_id || req.query.property_id;
    const propertyAccess = req.companyUser?.propertyAccess;

    // Skip if no property-specific request
    if (!propertyId) {
      return next();
    }

    // Full access level bypasses property restrictions
    if (req.accessLevel === 'full') {
      return next();
    }

    // Check if user has access to specific property
    if (propertyAccess && Array.isArray(propertyAccess)) {
      if (!propertyAccess.includes(propertyId)) {
        return res.status(403).json({ 
          error: 'Property access denied', 
          message: 'No access to this property' 
        });
      }
    }

    next();
  } catch (error) {
    console.error('Property access check error:', error);
    return res.status(500).json({ error: 'Property access validation failed' });
  }
};

/**
 * Audit data access for compliance
 */
export const auditDataAccess = (resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(data) {
      // Log data access after response
      if (req.companyId && req.user?.id) {
        db.insert(dataAccessAudit).values({
          companyId: req.companyId,
          userId: req.user.id,
          action: req.method.toLowerCase(),
          resourceType,
          resourceId: req.params.id || req.body?.id,
          accessedData: req.method === 'GET' ? { query: req.query } : { body: req.body },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
          success: res.statusCode < 400
        }).catch(console.error);
      }

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Company switch middleware (for users with multi-company access)
 */
export const switchCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetCompanyId = req.headers['x-company-id'] as string;
    
    if (!targetCompanyId) {
      return next(); // Use default company
    }

    // Verify user has access to target company
    const hasAccess = await db
      .select()
      .from(companyUsers)
      .where(and(
        eq(companyUsers.userId, req.user.id),
        eq(companyUsers.companyId, targetCompanyId),
        eq(companyUsers.isActive, true)
      ))
      .limit(1);

    if (!hasAccess.length) {
      return res.status(403).json({ 
        error: 'Company switch denied', 
        message: 'No access to target company' 
      });
    }

    // Update request context
    req.companyId = targetCompanyId;
    req.companyUser = hasAccess[0];
    req.userPermissions = hasAccess[0].permissions;
    req.accessLevel = hasAccess[0].accessLevel;

    next();
  } catch (error) {
    console.error('Company switch error:', error);
    return res.status(500).json({ error: 'Company switch failed' });
  }
};

// Export middleware chain for easy use
export const multiTenancyMiddleware = [
  extractCompanyContext,
  enforceDataIsolation
];

export const secureMultiTenancyMiddleware = [
  extractCompanyContext,
  enforceDataIsolation,
  auditDataAccess('general')
];