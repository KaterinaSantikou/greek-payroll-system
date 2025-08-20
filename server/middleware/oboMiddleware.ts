/**
 * OBO Middleware - Injects tenant_id from OBO tokens into request context
 * STS-like token validation and context injection
 */

import { Request, Response, NextFunction } from 'express';
import { OboService } from '../services/OboService';

export interface OboRequest extends Request {
  oboContext?: {
    isObo: boolean;
    actorUserId: string;
    partnerFirmId: string;
    asTenantId: string;
    scopes: string[];
    tokenId: string;
  };
  tenantId?: string; // Injected tenant_id for downstream services
}

/**
 * Middleware to extract and validate OBO tokens from Authorization header
 * Injects tenant_id into request context for proper tenant isolation
 */
export function oboMiddleware(req: OboRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  // Check for OBO token in session storage (sent via headers)
  const oboToken = req.headers['x-obo-token'] as string || 
                   req.headers.authorization?.replace('Bearer ', '');

  if (oboToken && oboToken.startsWith('obo_')) {
    // Validate OBO token asynchronously
    OboService.validateOboToken(oboToken)
      .then(oboContext => {
        // Inject OBO context and tenant_id into request
        req.oboContext = oboContext;
        req.tenantId = oboContext.asTenantId;
        
        // Add OBO headers for downstream services
        req.headers['x-tenant-id'] = oboContext.asTenantId;
        req.headers['x-partner-id'] = oboContext.partnerFirmId;
        req.headers['x-actor-user-id'] = oboContext.actorUserId;
        req.headers['x-obo-active'] = 'true';

        next();
      })
      .catch(error => {
        console.warn('OBO token validation failed:', error.message);
        // Continue without OBO context - let regular auth handle it
        next();
      });
  } else {
    // No OBO token - continue with regular request
    next();
  }
}

/**
 * Middleware to require active OBO context
 * Use this for endpoints that must be called on behalf of a client
 */
export function requireObo(req: OboRequest, res: Response, next: NextFunction) {
  if (!req.oboContext || !req.oboContext.isObo) {
    return res.status(403).json({
      error: 'OBO context required',
      code: 'OBO_REQUIRED',
      message: 'This operation requires acting on behalf of a client tenant',
    });
  }
  
  next();
}

/**
 * Get tenant ID with OBO context priority
 * Returns OBO tenant if active, otherwise falls back to user's tenant
 */
export function getTenantId(req: OboRequest, fallbackTenantId?: string): string {
  return req.tenantId || fallbackTenantId || '';
}

/**
 * Check if request has specific OBO scope
 */
export function hasOboScope(req: OboRequest, scope: string): boolean {
  return req.oboContext?.scopes?.includes(scope) || false;
}