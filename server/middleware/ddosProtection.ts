/**
 * DDoS Protection Middleware
 * Comprehensive protection against volumetric attacks, rate limiting, and abuse
 */

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import type { Request, Response, NextFunction } from 'express';

// IP-based request tracking
const suspiciousIPs = new Map<string, {
  attempts: number;
  firstAttempt: Date;
  blocked: boolean;
  blockedUntil?: Date;
}>();

// Request pattern tracking
const requestPatterns = new Map<string, {
  count: number;
  lastRequest: Date;
  patterns: string[];
}>();

/**
 * Basic rate limiter for general API endpoints
 */
export const basicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    console.warn(`Auth rate limit exceeded for IP: ${ip} on ${req.path}`);
    
    // Track suspicious auth attempts
    trackSuspiciousIP(ip, 'AUTH_FLOOD');
    
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * API rate limiter for critical operations
 */
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    error: 'API rate limit exceeded, please slow down your requests.',
    retryAfter: '1 minute'
  },
  handler: (req: Request, res: Response) => {
    console.warn(`API rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'API rate limit exceeded, please slow down your requests.',
      retryAfter: '1 minute'
    });
  }
});

/**
 * Payroll operations rate limiter (very strict)
 */
export const payrollRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 payroll operations per 5 minutes
  message: {
    error: 'Payroll operation rate limit exceeded. This is a protected endpoint.',
    retryAfter: '5 minutes'
  },
  handler: (req: Request, res: Response) => {
    const ip = req.ip || 'unknown';
    console.warn(`Payroll rate limit exceeded for IP: ${ip} on ${req.path}`);
    
    // Track suspicious payroll attempts
    trackSuspiciousIP(ip, 'PAYROLL_ABUSE');
    
    res.status(429).json({
      error: 'Payroll operation rate limit exceeded. This is a protected endpoint.',
      retryAfter: '5 minutes'
    });
  }
});

/**
 * Progressive delay middleware - slows down responses for rapid requests
 */
export const progressiveDelay = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipFailedRequests: false,
  onLimitReached: (req: Request) => {
    const ip = req.ip || 'unknown';
    console.warn(`Progressive delay triggered for IP: ${ip} on ${req.path}`);
    trackSuspiciousIP(ip, 'RAPID_REQUESTS');
  }
});

/**
 * Request size limiter - prevents large payload attacks
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB limit
  
  if (contentLength > maxSize) {
    const ip = req.ip || 'unknown';
    console.warn(`Large payload blocked from IP: ${ip}, size: ${contentLength} bytes`);
    trackSuspiciousIP(ip, 'LARGE_PAYLOAD');
    
    return res.status(413).json({
      error: 'Request payload too large',
      maxSize: '10MB',
      receivedSize: `${Math.round(contentLength / 1024 / 1024 * 100) / 100}MB`
    });
  }
  
  next();
};

/**
 * Suspicious pattern detection middleware
 */
export const suspiciousPatternDetection = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const path = req.path;
  
  // Detect bot patterns
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python-requests/i, /go-http-client/i
  ];
  
  const isSuspiciousBot = botPatterns.some(pattern => pattern.test(userAgent));
  
  // Detect suspicious paths
  const suspiciousPaths = [
    /\/admin/, /\/wp-admin/, /\/phpmyadmin/, /\.php$/,
    /\/api\/.*\/.*\/.*/, // Too many nested API calls
    /\.(env|config|backup|sql)$/,
  ];
  
  const isSuspiciousPath = suspiciousPaths.some(pattern => pattern.test(path));
  
  // Track request patterns
  const patternKey = `${ip}:${userAgent.substring(0, 50)}`;
  const now = new Date();
  
  if (!requestPatterns.has(patternKey)) {
    requestPatterns.set(patternKey, {
      count: 0,
      lastRequest: now,
      patterns: []
    });
  }
  
  const pattern = requestPatterns.get(patternKey)!;
  pattern.count++;
  pattern.patterns.push(path);
  pattern.lastRequest = now;
  
  // Clean old patterns (keep last 100)
  if (pattern.patterns.length > 100) {
    pattern.patterns = pattern.patterns.slice(-100);
  }
  
  // Detect rapid identical requests
  const recentIdenticalRequests = pattern.patterns.slice(-10).filter(p => p === path).length;
  
  if (isSuspiciousBot || isSuspiciousPath || recentIdenticalRequests > 5) {
    console.warn(`Suspicious pattern detected from IP: ${ip}, UA: ${userAgent.substring(0, 50)}, Path: ${path}`);
    
    if (isSuspiciousBot) trackSuspiciousIP(ip, 'BOT_DETECTED');
    if (isSuspiciousPath) trackSuspiciousIP(ip, 'SUSPICIOUS_PATH');
    if (recentIdenticalRequests > 5) trackSuspiciousIP(ip, 'REPEATED_REQUESTS');
    
    // For highly suspicious patterns, block immediately
    if (recentIdenticalRequests > 8 || (isSuspiciousBot && isSuspiciousPath)) {
      return res.status(403).json({
        error: 'Suspicious activity detected',
        message: 'Your request has been blocked due to suspicious patterns'
      });
    }
  }
  
  next();
};

/**
 * IP blocking middleware - blocks known malicious IPs
 */
export const ipBlockingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const suspiciousIP = suspiciousIPs.get(ip);
  
  if (suspiciousIP?.blocked) {
    const now = new Date();
    
    // Check if block has expired
    if (suspiciousIP.blockedUntil && now > suspiciousIP.blockedUntil) {
      suspiciousIP.blocked = false;
      suspiciousIP.blockedUntil = undefined;
      suspiciousIP.attempts = 0;
      console.log(`IP ${ip} unblocked - block period expired`);
    } else {
      console.warn(`Blocked IP ${ip} attempted access to ${req.path}`);
      return res.status(403).json({
        error: 'IP blocked due to suspicious activity',
        blockedUntil: suspiciousIP.blockedUntil?.toISOString()
      });
    }
  }
  
  next();
};

/**
 * Connection limiter - limits concurrent connections per IP
 */
const activeConnections = new Map<string, number>();

export const connectionLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const currentConnections = activeConnections.get(ip) || 0;
  const maxConnections = 10; // Max 10 concurrent connections per IP
  
  if (currentConnections >= maxConnections) {
    console.warn(`Connection limit exceeded for IP: ${ip}, current: ${currentConnections}`);
    trackSuspiciousIP(ip, 'CONNECTION_FLOOD');
    
    return res.status(429).json({
      error: 'Too many concurrent connections from your IP',
      maxConnections,
      currentConnections
    });
  }
  
  // Track connection
  activeConnections.set(ip, currentConnections + 1);
  
  // Clean up on response end
  res.on('finish', () => {
    const current = activeConnections.get(ip) || 0;
    if (current <= 1) {
      activeConnections.delete(ip);
    } else {
      activeConnections.set(ip, current - 1);
    }
  });
  
  next();
};

/**
 * Track suspicious IP behavior
 */
function trackSuspiciousIP(ip: string, reason: string): void {
  const now = new Date();
  
  if (!suspiciousIPs.has(ip)) {
    suspiciousIPs.set(ip, {
      attempts: 0,
      firstAttempt: now,
      blocked: false
    });
  }
  
  const suspiciousIP = suspiciousIPs.get(ip)!;
  suspiciousIP.attempts++;
  
  console.warn(`Suspicious activity from IP ${ip}: ${reason} (attempts: ${suspiciousIP.attempts})`);
  
  // Auto-block after multiple suspicious activities
  if (suspiciousIP.attempts >= 10) {
    suspiciousIP.blocked = true;
    suspiciousIP.blockedUntil = new Date(now.getTime() + 60 * 60 * 1000); // Block for 1 hour
    console.warn(`IP ${ip} auto-blocked due to suspicious activity (${suspiciousIP.attempts} attempts)`);
  }
}

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // DDoS-related security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Rate limiting information
  res.setHeader('X-RateLimit-Policy', 'Applied');
  
  next();
};

/**
 * Health check endpoint exemption
 */
export const exemptHealthCheck = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/status') {
    return next(); // Skip rate limiting for health checks
  }
  next();
};

/**
 * Clean up old tracking data (run periodically)
 */
setInterval(() => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Clean old suspicious IPs
  for (const [ip, data] of suspiciousIPs.entries()) {
    if (data.firstAttempt < oneHourAgo && !data.blocked) {
      suspiciousIPs.delete(ip);
    }
  }
  
  // Clean old request patterns
  for (const [key, data] of requestPatterns.entries()) {
    if (data.lastRequest < oneHourAgo) {
      requestPatterns.delete(key);
    }
  }
  
  console.log(`Cleaned up tracking data. Suspicious IPs: ${suspiciousIPs.size}, Patterns: ${requestPatterns.size}`);
}, 60 * 60 * 1000); // Clean every hour