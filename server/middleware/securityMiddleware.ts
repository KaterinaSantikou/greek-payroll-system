import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createSafeInterval } from '../utils/safeScheduler';

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern with anti-CSRF header validation
 */
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF for GET/HEAD/OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for webhook endpoints (they use HMAC signatures)
    if (req.path.startsWith('/api/webhooks/')) {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'] as string;
    const csrfCookie = req.cookies['csrf-token'];

    // For cross-site embed flows, require both token and cookie
    const sameSite = req.cookies?.sessionToken ? 'lax' : 'none';
    
    if (sameSite === 'none') {
      // Cross-site embed: require CSRF token validation
      if (!csrfToken || !csrfCookie || csrfToken !== csrfCookie) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_MISSING',
            message: 'CSRF token validation failed',
          },
        });
      }
    } else {
      // Same-site: SameSite=Lax provides protection, but validate if token present
      if (csrfToken && csrfCookie && csrfToken !== csrfCookie) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: 'CSRF token validation failed',
          },
        });
      }
    }

    next();
  };
}

/**
 * Generate CSRF token endpoint
 */
export function generateCSRFToken() {
  return (req: Request, res: Response) => {
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set CSRF cookie
    res.cookie('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
    });

    res.json({ csrfToken: token });
  };
}

/**
 * Content Security Policy Headers
 */
export function cspHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Identity provider domains for OIDC/SAML
    const identityDomains = [
      'accounts.google.com',
      'login.microsoftonline.com', 
      'login.live.com',
      'github.com',
      'replit.com',
      process.env.CUSTOM_IDP_DOMAIN || '',
    ].filter(Boolean).join(' ');

    const csp = [
      "default-src 'self'",
      "script-src 'self'", // No inline scripts
      "style-src 'self' 'unsafe-inline'", // Allow inline styles for CSS-in-JS
      "img-src 'self' data: https:",
      `connect-src 'self' ${identityDomains}`,
      `frame-src 'self' ${identityDomains}`,
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
  };
}

/**
 * Secure cookie configuration helper
 */
export function getSecureCookieOptions(crossSite: boolean = false) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: crossSite ? ('none' as const) : ('lax' as const),
    path: '/',
  };
}

/**
 * Device fingerprint generation for brute-force defense
 */
export function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const ipAddress = (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, '');
  
  // Create stable fingerprint (changes rarely)
  const fingerprintData = {
    userAgent: userAgent.substring(0, 100), // Truncate to avoid excessive length
    acceptLanguage,
    acceptEncoding,
    ipClass: ipAddress.split('.').slice(0, 3).join('.'), // IP class C
    timestamp: Math.floor(Date.now() / (24 * 60 * 60 * 1000)), // Daily rotation
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprintData))
    .digest('hex')
    .substring(0, 16); // First 16 characters
}

/**
 * Enhanced brute-force protection with IP + email tuple throttling
 */
export interface BruteForceOptions {
  maxAttempts: number;
  windowMinutes: number;
  blockMinutes: number;
}

const bruteForceAttempts = new Map<string, { count: number; firstAttempt: Date; blockedUntil?: Date }>();

export function bruteForceProtection(options: BruteForceOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ipAddress = (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, '');
    const email = req.body?.email?.toLowerCase() || '';
    const deviceFingerprint = generateDeviceFingerprint(req);
    
    // Create composite key for IP + email + device
    const compositeKey = crypto
      .createHash('sha256')
      .update(`${ipAddress}:${email}:${deviceFingerprint}`)
      .digest('hex');

    const now = new Date();
    const attempt = bruteForceAttempts.get(compositeKey);

    if (attempt) {
      // Check if still blocked
      if (attempt.blockedUntil && attempt.blockedUntil > now) {
        const retryAfter = Math.ceil((attempt.blockedUntil.getTime() - now.getTime()) / 1000);
        return res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many attempts. Please try again later.',
            retry_in_seconds: retryAfter,
          },
        });
      }

      // Check if window has expired
      const windowExpiry = new Date(attempt.firstAttempt.getTime() + options.windowMinutes * 60 * 1000);
      if (now > windowExpiry) {
        // Reset counter
        bruteForceAttempts.set(compositeKey, { count: 1, firstAttempt: now });
      } else {
        // Increment counter
        attempt.count++;
        if (attempt.count >= options.maxAttempts) {
          // Block the composite key
          attempt.blockedUntil = new Date(now.getTime() + options.blockMinutes * 60 * 1000);
          
          const retryAfter = options.blockMinutes * 60;
          return res.status(429).json({
            error: {
              code: 'RATE_LIMITED', 
              message: 'Too many attempts. Please try again later.',
              retry_in_seconds: retryAfter,
            },
          });
        }
      }
    } else {
      // First attempt
      bruteForceAttempts.set(compositeKey, { count: 1, firstAttempt: now });
    }

    // Store attempt info for potential reset on successful auth
    (req as any).bruteForceKey = compositeKey;

    next();
  };
}

/**
 * Reset brute-force counter on successful authentication
 */
export function resetBruteForceOnSuccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    
    res.json = function(this: Response, body: any) {
      // Reset brute-force counter on successful response
      if (res.statusCode < 400 && (req as any).bruteForceKey) {
        bruteForceAttempts.delete((req as any).bruteForceKey);
      }
      
      return originalSend.call(this, body);
    } as any;

    next();
  };
}

/**
 * Cleanup expired brute-force entries (run periodically)
 */
export function cleanupBruteForceEntries() {
  const now = new Date();
  
  for (const [key, attempt] of Array.from(bruteForceAttempts.entries())) {
    // Remove entries older than 24 hours
    const maxAge = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    if (attempt.firstAttempt < maxAge && (!attempt.blockedUntil || attempt.blockedUntil < now)) {
      bruteForceAttempts.delete(key);
    }
  }
}

// Run cleanup every hour (safely)

createSafeInterval(cleanupBruteForceEntries, {
  name: 'Brute Force Cleanup',
  enableEnvVar: 'ENABLE_SECURITY_CLEANUP', 
  intervalMs: 60 * 60 * 1000,
  runImmediately: false
});