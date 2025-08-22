import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import type { User, UserSession } from '@shared/schema';

// Extend Express Request interface to include user and custom session
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userSession?: UserSession; // Renamed to avoid conflict with express-session
      ipAddress?: string;
      userAgent?: string;
    }
  }
}

/**
 * Extract client IP address from request
 */
export const extractClientInfo = (req: Request, res: Response, next: NextFunction) => {
  // Get client IP
  req.ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip;

  // Get user agent
  req.userAgent = req.headers['user-agent'];

  next();
};

/**
 * Authentication middleware that validates session tokens
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get session token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.sessionToken;
    
    let sessionToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    } else if (cookieToken) {
      sessionToken = cookieToken;
    }

    if (!sessionToken) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'MISSING_TOKEN' 
      });
    }

    // Validate session
    const sessionData = await AuthService.validateSession(sessionToken);
    
    if (!sessionData) {
      return res.status(401).json({ 
        error: 'Invalid or expired session',
        code: 'INVALID_SESSION' 
      });
    }

    // Add user and session to request
    req.user = sessionData.user;
    req.userSession = sessionData.session;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'AUTH_ERROR' 
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.sessionToken;
    
    let sessionToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    } else if (cookieToken) {
      sessionToken = cookieToken;
    }

    if (sessionToken) {
      const sessionData = await AuthService.validateSession(sessionToken);
      if (sessionData) {
        req.user = sessionData.user;
        req.userSession = sessionData.session;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if there's an error
    next();
  }
};

/**
 * Middleware to require email verification
 */
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED' 
    });
  }

  if (!(req.user as any).emailVerified) {
    return res.status(403).json({ 
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      details: {
        email: (req.user as any).email,
        message: 'Please verify your email address to continue'
      }
    });
  }

  next();
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.ipAddress || req.ip) as string;
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        code: 'RATE_LIMITED',
        resetTime: new Date(record.resetTime).toISOString()
      });
    }
    
    record.count++;
    rateLimitStore.set(key, record);
    
    next();
  };
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF protection for GET requests
  if (req.method === 'GET') {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  const sessionCsrfToken = req.userSession?.deviceFingerprint; // Using device fingerprint as CSRF token

  if (!csrfToken || csrfToken !== sessionCsrfToken) {
    return res.status(403).json({
      error: 'CSRF token mismatch',
      code: 'CSRF_ERROR'
    });
  }

  next();
};

/**
 * Audit logging middleware for auth endpoints
 */
export const auditLog = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function (data) {
      const result = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      
      // Log the action asynchronously
      setImmediate(async () => {
        try {
          await AuthService.logAuthEvent({
            userId: (req.user as any)?.id,
            sessionId: req.userSession?.id,
            action,
            result,
            ipAddress: req.ipAddress,
            userAgent: req.userAgent,
            metadata: {
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
            },
          });
        } catch (error) {
          console.error('Failed to log audit event:', error);
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};