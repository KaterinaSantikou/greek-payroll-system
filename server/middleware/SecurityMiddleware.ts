/**
 * Security Middleware
 * Express middleware for implementing security review checklist
 */

import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../services/SecurityService';
import { AnalyticsService, AuthAnalyticsEvents } from '../services/AnalyticsService';

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    user?: any;
    mfaChallenge?: any;
    oidcState?: string;
    oidcNonce?: string;
    stateTimestamp?: number;
    nonceTimestamp?: number;
  }
}

export class SecurityMiddleware {
  /**
   * Initialize CSRF token for session
   */
  static initializeCSRF() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.session?.csrfToken) {
        if (req.session) {
          req.session.csrfToken = SecurityService.generateCSRFToken();
        }
      }
      
      // Add CSRF token to response headers for client-side access
      if (req.session?.csrfToken) {
        res.setHeader('X-CSRF-Token', req.session.csrfToken);
      }
      
      next();
    };
  }

  /**
   * Rate limiting middleware with CAPTCHA requirement
   */
  static rateLimitAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = `${req.ip}:${req.body?.email || 'anonymous'}`;
      const rateLimit = SecurityService.checkRateLimit(identifier);

      if (!rateLimit.allowed) {
        const response = {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many authentication attempts. Please try again later.',
            lockedUntil: rateLimit.lockedUntil,
            captchaRequired: rateLimit.captchaRequired,
          },
        };

        AnalyticsService.track(AuthAnalyticsEvents.AUTH_SUSPICIOUS_ACTIVITY, {
          reason: 'rate_limited',
          identifier: req.ip, // Don't log full identifier with email
          locked_until: rateLimit.lockedUntil,
          captcha_required: rateLimit.captchaRequired,
        }, {
          correlationId: `rate-limit-${Date.now()}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        });

        return res.status(429).json(response);
      }

      // Add rate limit info to request for use in auth handlers
      req.rateLimit = rateLimit;

      // Add headers for client-side rate limit awareness
      res.setHeader('X-RateLimit-Remaining', rateLimit.remainingAttempts.toString());
      res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toString());
      
      if (rateLimit.captchaRequired) {
        res.setHeader('X-Captcha-Required', 'true');
      }

      next();
    };
  }

  /**
   * Validate CAPTCHA when required
   */
  static validateCaptcha() {
    return (req: Request, res: Response, next: NextFunction) => {
      const identifier = `${req.ip}:${req.body?.email || 'anonymous'}`;
      const rateLimit = SecurityService.checkRateLimit(identifier);

      if (rateLimit.captchaRequired) {
        const captchaToken = req.body?.captchaToken || req.headers['x-captcha-token'];
        
        if (!captchaToken) {
          return res.status(400).json({
            error: {
              code: 'CAPTCHA_REQUIRED',
              message: 'CAPTCHA verification required',
              captchaRequired: true,
            },
          });
        }

        // In production, validate CAPTCHA token with service like reCAPTCHA
        // For now, accept any non-empty token as valid
        const captchaValid = this.validateCaptchaToken(captchaToken);
        
        if (!captchaValid) {
          return res.status(400).json({
            error: {
              code: 'CAPTCHA_INVALID',
              message: 'Invalid CAPTCHA token',
              captchaRequired: true,
            },
          });
        }
      }

      next();
    };
  }

  /**
   * WebAuthn origin and RP ID validation
   */
  static validateWebAuthnRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.get('Origin');
      
      if (!origin || !SecurityService.validateWebAuthnOrigin(origin)) {
        AnalyticsService.track(AuthAnalyticsEvents.AUTH_SUSPICIOUS_ACTIVITY, {
          reason: 'invalid_webauthn_origin',
          origin,
          path: req.path,
        }, {
          correlationId: `webauthn-${Date.now()}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        });

        return res.status(400).json({
          error: {
            code: 'INVALID_ORIGIN',
            message: 'Invalid origin for WebAuthn request',
          },
        });
      }

      next();
    };
  }

  /**
   * OIDC redirect URI validation
   */
  static validateOIDCRedirectUri() {
    return (req: Request, res: Response, next: NextFunction) => {
      const redirectUri = req.body?.redirect_uri || req.query?.redirect_uri as string;
      
      if (redirectUri && !SecurityService.validateOIDCRedirectUri(redirectUri)) {
        AnalyticsService.track(AuthAnalyticsEvents.AUTH_SUSPICIOUS_ACTIVITY, {
          reason: 'invalid_oidc_redirect',
          redirect_uri: redirectUri,
        }, {
          correlationId: `oidc-${Date.now()}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        });

        return res.status(400).json({
          error: {
            code: 'INVALID_REDIRECT_URI',
            message: 'Invalid redirect URI',
          },
        });
      }

      next();
    };
  }

  /**
   * OIDC state and nonce validation
   */
  static validateOIDCState() {
    return (req: Request, res: Response, next: NextFunction) => {
      const state = req.body?.state || req.query?.state as string;
      const sessionState = req.session.oidcState;
      const stateTimestamp = req.session.stateTimestamp;

      if (!state || !sessionState || state !== sessionState) {
        return res.status(400).json({
          error: {
            code: 'INVALID_STATE',
            message: 'Invalid or missing state parameter',
          },
        });
      }

      if (!stateTimestamp || !SecurityService.isOIDCStateValid(stateTimestamp)) {
        return res.status(400).json({
          error: {
            code: 'EXPIRED_STATE',
            message: 'State parameter has expired',
          },
        });
      }

      next();
    };
  }

  /**
   * Set secure session cookie with all security attributes
   */
  static setSecureCookie(name: string, value: string, res: Response): void {
    const options = SecurityService.getSecureCookieOptions();
    res.cookie(name, value, options);
  }

  /**
   * Clear secure cookie
   */
  static clearSecureCookie(name: string, res: Response): void {
    const options = SecurityService.getSecureCookieOptions();
    res.clearCookie(name, { ...options, maxAge: 0 });
  }

  /**
   * Audit logging middleware with PII redaction
   */
  static auditLog() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const originalSend = res.send;

      res.send = function(body: any) {
        const duration = Date.now() - startTime;
        
        // Create audit log entry
        const auditEntry = {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.session?.user?.id,
          correlationId: req.headers['x-correlation-id'] || `audit-${Date.now()}`,
          // Redact sensitive data
          body: SecurityService.redactPII(typeof body === 'string' ? { response: body } : body),
          requestData: SecurityService.redactPII({
            query: req.query,
            params: req.params,
            // Don't log full request body for security
            hasBody: !!req.body && Object.keys(req.body).length > 0,
          }),
        };

        // Log audit entry (in production, send to centralized logging system)
        console.log('AUDIT:', JSON.stringify(auditEntry));

        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Generic authentication response to prevent email enumeration
   */
  static genericAuthResponse(locale: 'en' | 'el' = 'en') {
    return (req: Request, res: Response, next: NextFunction) => {
      // Store generic response function on request for use in auth handlers
      req.sendGenericAuthResponse = () => {
        const response = SecurityService.getGenericAuthResponse(locale);
        return res.status(200).json(response);
      };
      
      next();
    };
  }

  /**
   * Validate CAPTCHA token (mock implementation)
   */
  private static validateCaptchaToken(token: string): boolean {
    // In production, validate with service like Google reCAPTCHA
    // POST to https://www.google.com/recaptcha/api/siteverify
    // For now, accept any token that looks valid
    return token && token.length > 10;
  }

  /**
   * Request enhancement middleware
   */
  static enhanceRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add correlation ID if not present
      if (!req.headers['x-correlation-id']) {
        req.headers['x-correlation-id'] = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      next();
    };
  }
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        allowed: boolean;
        remainingAttempts: number;
        captchaRequired: boolean;
        lockedUntil?: number;
        resetTime: number;
      };
      sendGenericAuthResponse?: () => Response;
    }
  }
}