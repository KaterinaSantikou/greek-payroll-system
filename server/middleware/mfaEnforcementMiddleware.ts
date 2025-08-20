/**
 * Global MFA Enforcement Middleware
 * Enforces multi-factor authentication across all authenticated routes
 */

import { Request, Response, NextFunction } from 'express';
import { MfaService } from '../services/MfaService';
import { storage } from '../storage';

export interface MfaEnforcementConfig {
  exemptRoutes: string[];
  gracePeriodinDays: number;
  requireForRoles: string[];
  enforceForSensitiveOperations: string[];
}

const DEFAULT_CONFIG: MfaEnforcementConfig = {
  exemptRoutes: [
    '/api/auth/login',
    '/api/auth/logout', 
    '/api/auth/user',
    '/api/mfa/setup',
    '/api/mfa/verify',
    '/api/health',
    '/public-objects'
  ],
  gracePeriodinDays: 7,
  requireForRoles: ['admin', 'payroll', 'hr'],
  enforceForSensitiveOperations: [
    '/api/payroll',
    '/api/payments',
    '/api/employees/create',
    '/api/employees/update',
    '/api/filings',
    '/api/banking'
  ]
};

export class MfaEnforcementMiddleware {
  private config: MfaEnforcementConfig;

  constructor(config: Partial<MfaEnforcementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main MFA enforcement middleware
   */
  enforce() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip if not authenticated
        if (!req.isAuthenticated()) {
          return next();
        }

        // Skip exempt routes
        if (this.isExemptRoute(req.path)) {
          return next();
        }

        // Get user information
        const user = req.user as any;
        const userId = user?.claims?.sub || user?.id;
        
        if (!userId) {
          return res.status(401).json({ 
            error: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required' 
          });
        }

        // Check if MFA is required for this user/operation
        const mfaRequired = await this.isMfaRequired(userId, req);
        
        if (!mfaRequired) {
          return next();
        }

        // Check MFA status
        const mfaStatus = await this.checkMfaStatus(userId, req);
        
        if (!mfaStatus.verified) {
          return res.status(403).json({
            error: 'MFA_REQUIRED',
            message: 'Multi-factor authentication required',
            mfaSetupRequired: !mfaStatus.hasSetup,
            gracePeriodRemaining: mfaStatus.gracePeriodRemaining,
            recommendedMethods: mfaStatus.recommendedMethods
          });
        }

        // Add MFA verification timestamp to request
        req.mfaVerified = mfaStatus.lastVerified;
        next();

      } catch (error) {
        console.error('MFA enforcement error:', error);
        return res.status(500).json({
          error: 'MFA_ENFORCEMENT_ERROR',
          message: 'Security verification failed'
        });
      }
    };
  }

  /**
   * Check if route is exempt from MFA
   */
  private isExemptRoute(path: string): boolean {
    return this.config.exemptRoutes.some(exemptPath => {
      if (exemptPath.endsWith('*')) {
        return path.startsWith(exemptPath.slice(0, -1));
      }
      return path === exemptPath || path.startsWith(exemptPath);
    });
  }

  /**
   * Determine if MFA is required for this user/operation
   */
  private async isMfaRequired(userId: string, req: Request): Promise<boolean> {
    try {
      // Get user details
      const userDetails = await storage.getUser(userId);
      if (!userDetails) return false;

      // Check if user role requires MFA
      const userRole = (userDetails as any).role || 'employee';
      if (this.config.requireForRoles.includes(userRole)) {
        return true;
      }

      // Check if operation is sensitive
      const isSensitiveOperation = this.config.enforceForSensitiveOperations.some(
        sensitiveRoute => req.path.startsWith(sensitiveRoute)
      );
      
      if (isSensitiveOperation) {
        return true;
      }

      // Check for high-risk operations based on request method and data
      if (this.isHighRiskOperation(req)) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error checking MFA requirement:', error);
      return true; // Fail safe - require MFA if unable to determine
    }
  }

  /**
   * Check current MFA status for user
   */
  private async checkMfaStatus(userId: string, req: Request): Promise<{
    verified: boolean;
    hasSetup: boolean;
    lastVerified?: Date;
    gracePeriodRemaining?: number;
    recommendedMethods: string[];
  }> {
    try {
      // Check if user has MFA setup
      const hasTotp = await this.checkHasTotp(userId);
      const hasWebAuthn = await this.checkHasWebAuthn(userId);
      const hasSetup = hasTotp || hasWebAuthn;

      // Get session MFA verification status
      const session = req.session as any;
      const mfaVerified = session?.mfaVerified;
      const lastVerified = mfaVerified ? new Date(mfaVerified) : null;

      // Check if verification is still valid (30 minutes)
      const mfaValidityPeriod = 30 * 60 * 1000; // 30 minutes
      const isVerificationValid = lastVerified && 
        (Date.now() - lastVerified.getTime()) < mfaValidityPeriod;

      // Calculate grace period for new users
      const userDetails = await storage.getUser(userId);
      const accountAge = userDetails?.createdAt ? 
        Date.now() - new Date(userDetails.createdAt!).getTime() : 0;
      const gracePeriod = this.config.gracePeriodinDays * 24 * 60 * 60 * 1000;
      const inGracePeriod = accountAge < gracePeriod;
      const gracePeriodRemaining = inGracePeriod ? 
        Math.ceil((gracePeriod - accountAge) / (24 * 60 * 60 * 1000)) : 0;

      // Determine verification status
      const verified = isVerificationValid || (inGracePeriod && !hasSetup);

      // Recommend MFA methods
      const recommendedMethods = [];
      if (!hasTotp) recommendedMethods.push('totp');
      if (!hasWebAuthn) recommendedMethods.push('webauthn');

      return {
        verified,
        hasSetup,
        lastVerified,
        gracePeriodRemaining: gracePeriodRemaining > 0 ? gracePeriodRemaining : undefined,
        recommendedMethods
      };

    } catch (error) {
      console.error('Error checking MFA status:', error);
      return {
        verified: false,
        hasSetup: false,
        recommendedMethods: ['totp', 'webauthn']
      };
    }
  }

  /**
   * Identify high-risk operations that require MFA
   */
  private isHighRiskOperation(req: Request): boolean {
    // DELETE operations
    if (req.method === 'DELETE') {
      return true;
    }

    // Operations involving financial data
    if (req.path.includes('payment') || req.path.includes('salary') || req.path.includes('wage')) {
      return true;
    }

    // Admin operations
    if (req.path.includes('admin') || req.path.includes('settings')) {
      return true;
    }

    // User management operations
    if (req.path.includes('users') && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return true;
    }

    // Large data operations (check request body size)
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 1024 * 1024) { // 1MB threshold
      return true;
    }

    return false;
  }

  /**
   * Middleware to mark MFA as verified for current session
   */
  static markMfaVerified() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.session) {
        (req.session as any).mfaVerified = new Date().toISOString();
      }
      next();
    };
  }

  /**
   * Middleware to require fresh MFA verification (force re-authentication)
   */
  static requireFreshMfa() {
    return (req: Request, res: Response, next: NextFunction) => {
      const session = req.session as any;
      const mfaVerified = session?.mfaVerified;
      const lastVerified = mfaVerified ? new Date(mfaVerified) : null;

      // Require verification within last 5 minutes for ultra-sensitive operations
      const freshMfaRequired = 5 * 60 * 1000; // 5 minutes
      const isFreshlyVerified = lastVerified && 
        (Date.now() - lastVerified.getTime()) < freshMfaRequired;

      if (!isFreshlyVerified) {
        return res.status(403).json({
          error: 'FRESH_MFA_REQUIRED',
          message: 'Recent multi-factor authentication verification required',
          lastVerified: lastVerified?.toISOString()
        });
      }

      next();
    };
  }

  /**
   * Check if user has TOTP setup (placeholder implementation)
   */
  private static async checkHasTotp(userId: string): Promise<boolean> {
    // This would integrate with your MFA service
    // For now, return false as placeholder
    return false;
  }

  /**
   * Check if user has WebAuthn setup (placeholder implementation)
   */
  private static async checkHasWebAuthn(userId: string): Promise<boolean> {
    // This would integrate with your MFA service
    // For now, return false as placeholder
    return false;
  }
}

// Export configured instance
export const mfaEnforcement = new MfaEnforcementMiddleware();

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      mfaVerified?: Date;
    }
  }
}