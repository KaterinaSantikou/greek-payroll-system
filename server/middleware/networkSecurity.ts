/**
 * Network Security & Firewall Rules Middleware
 * Implements strict network access controls and firewall policies
 */

import type { Request, Response, NextFunction } from 'express';
import { promisify } from 'util';
import { lookup } from 'dns';

const dnsLookup = promisify(lookup);

import { networkConfig } from '../config/networkSecurity';

// Network policies from configuration
const NETWORK_POLICIES = {
  OFFICE_IPS: networkConfig.officeNetworks,
  TRUSTED_EXTERNAL: networkConfig.trustedExternal,
  BLOCKED_COUNTRIES: networkConfig.blockedCountries,
  BLOCKED_IPS: networkConfig.blockedIPRanges,
  
  // Allowed user agents (strict whitelist)
  ALLOWED_USER_AGENTS: [
    /Mozilla\/5\.0.*Chrome\/\d+/,
    /Mozilla\/5\.0.*Firefox\/\d+/,
    /Mozilla\/5\.0.*Safari\/\d+/,
    /Mozilla\/5\.0.*Edge\/\d+/,
  ],
  
  // Blocked user agents
  BLOCKED_USER_AGENTS: [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python-requests/i, /go-http-client/i,
    /masscan/i, /nmap/i, /sqlmap/i, /nikto/i, /dirb/i,
    /hydra/i, /metasploit/i, /burp/i, /owasp/i
  ]
};

// Enhanced geolocation tracking
const ipGeolocationCache = new Map<string, {
  country: string;
  region: string;
  city: string;
  timestamp: Date;
  risk_level: 'low' | 'medium' | 'high';
}>();

// Network threat intelligence
const networkThreatData = new Map<string, {
  threat_type: string;
  severity: number;
  last_seen: Date;
  sources: string[];
}>();

/**
 * IP Range utilities
 */
class IPUtils {
  static ipToLong(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  static isInRange(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = ~(Math.pow(2, 32 - parseInt(bits)) - 1);
    const ipLong = this.ipToLong(ip);
    const rangeLong = this.ipToLong(range);
    return (ipLong & mask) === (rangeLong & mask);
  }

  static isPrivateIP(ip: string): boolean {
    const privateRanges = [
      '10.0.0.0/8',
      '172.16.0.0/12', 
      '192.168.0.0/16',
      '127.0.0.0/8',
      '169.254.0.0/16'
    ];
    return privateRanges.some(range => this.isInRange(ip, range));
  }

  static isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
}

/**
 * Geo-blocking middleware - blocks requests from high-risk countries
 */
export const geoBlocking = async (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Skip for private IPs or health checks
  if (IPUtils.isPrivateIP(clientIP) || req.path === '/health') {
    return next();
  }

  try {
    // Mock geo-location (in production, use a real geo-IP service)
    const geoData = await mockGeoLocation(clientIP);
    
    if (NETWORK_POLICIES.BLOCKED_COUNTRIES.includes(geoData.country)) {
      console.warn(`🚨 Geo-blocking activated for IP: ${clientIP} from country: ${geoData.country}`);
      
      return res.status(403).json({
        error: 'Access denied from your location',
        code: 'GEO_BLOCKED',
        message: 'Access from this geographic region is not permitted'
      });
    }

    // Add geo info to request for logging
    req.geoInfo = geoData;
    
  } catch (error) {
    console.warn(`Geo-location failed for IP: ${clientIP}`, error);
    // Continue on geo-location failure to avoid blocking legitimate traffic
  }

  next();
};

/**
 * IP Whitelist middleware - only allow trusted networks for admin operations
 */
export const ipWhitelist = (allowedRanges: string[] = NETWORK_POLICIES.OFFICE_IPS) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Check if IP is in allowed ranges
    const isAllowed = allowedRanges.some(range => {
      try {
        return IPUtils.isInRange(clientIP, range);
      } catch (error) {
        console.error(`Invalid IP range: ${range}`, error);
        return false;
      }
    });

    if (!isAllowed) {
      console.warn(`🚨 IP whitelist violation: ${clientIP} attempted access to ${req.path}`);
      
      return res.status(403).json({
        error: 'Access denied',
        code: 'IP_NOT_WHITELISTED', 
        message: 'Your IP address is not authorized to access this resource'
      });
    }

    next();
  };
};

/**
 * IP Blacklist middleware - block known malicious IPs
 */
export const ipBlacklist = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check against blocked IP ranges
  const isBlocked = NETWORK_POLICIES.BLOCKED_IPS.some(range => {
    try {
      return IPUtils.isInRange(clientIP, range);
    } catch (error) {
      return false;
    }
  });

  // Check threat intelligence data
  const threatInfo = networkThreatData.get(clientIP);
  const isHighRisk = threatInfo && threatInfo.severity >= 8;

  if (isBlocked || isHighRisk) {
    console.warn(`🚨 IP blacklist hit: ${clientIP} - ${threatInfo ? `threat level ${threatInfo.severity}` : 'blocked range'}`);
    
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLACKLISTED',
      message: 'Your IP address has been blocked due to security concerns'
    });
  }

  next();
};

/**
 * User Agent validation middleware
 */
export const userAgentValidation = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const clientIP = req.ip || 'unknown';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // In development, be more permissive for testing
  if (isDevelopment) {
    // Only block the most obvious attack tools
    const dangerousPatterns = [
      /sqlmap/i, /nikto/i, /metasploit/i, /burp.*intruder/i
    ];
    
    const isDangerous = dangerousPatterns.some(pattern => pattern.test(userAgent));
    if (isDangerous) {
      console.warn(`🚨 Blocked dangerous tool: ${userAgent} from IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        code: 'USER_AGENT_BLOCKED',
        message: 'Your client software is not permitted'
      });
    }
    
    // Allow everything else in development
    return next();
  }

  // Production: Strict validation
  if (!userAgent) {
    console.warn(`⚠️  Empty User-Agent from IP: ${clientIP} on ${req.path}`);
  }

  const isBlocked = NETWORK_POLICIES.BLOCKED_USER_AGENTS.some(pattern => pattern.test(userAgent));
  
  if (isBlocked) {
    console.warn(`🚨 Blocked User-Agent: ${userAgent} from IP: ${clientIP}`);
    
    return res.status(403).json({
      error: 'Access denied',
      code: 'USER_AGENT_BLOCKED',
      message: 'Your client software is not permitted'
    });
  }

  const isBrowserRequest = req.path.startsWith('/') && !req.path.startsWith('/api/');
  if (isBrowserRequest && userAgent) {
    const isAllowed = NETWORK_POLICIES.ALLOWED_USER_AGENTS.some(pattern => pattern.test(userAgent));
    
    if (!isAllowed) {
      console.warn(`⚠️  Suspicious User-Agent for browser access: ${userAgent} from IP: ${clientIP}`);
    }
  }

  next();
};

/**
 * Network protocol security middleware
 */
export const protocolSecurity = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || 'unknown';
  const protocol = req.protocol;
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';

  // Enforce HTTPS for sensitive endpoints
  const sensitiveEndpoints = [
    '/api/auth', '/auth', '/api/payroll', '/api/payments',
    '/api/employees', '/api/admin'
  ];
  
  const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  if (isSensitiveEndpoint && !isSecure && process.env.NODE_ENV === 'production') {
    console.warn(`🚨 Insecure access to sensitive endpoint: ${req.path} from IP: ${clientIP}`);
    
    return res.status(426).json({
      error: 'HTTPS Required',
      code: 'INSECURE_PROTOCOL',
      message: 'This endpoint requires a secure HTTPS connection'
    });
  }

  // Check for suspicious headers that might indicate proxy/tunnel abuse
  const suspiciousHeaders = [
    'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip',
    'x-cluster-client-ip', 'x-forwarded', 'forwarded-for'
  ];

  let proxyChain = 0;
  suspiciousHeaders.forEach(header => {
    if (req.headers[header]) {
      proxyChain++;
    }
  });

  if (proxyChain > 2) {
    console.warn(`⚠️  Multiple proxy headers detected from IP: ${clientIP}, chain length: ${proxyChain}`);
    // Log but don't block - might be legitimate CDN/load balancer
  }

  next();
};

/**
 * Admin network restrictions - very strict access for admin endpoints
 */
export const adminNetworkSecurity = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || 'unknown';
  
  // Admin endpoints require office network access only
  const isFromOfficeNetwork = NETWORK_POLICIES.OFFICE_IPS.some(range => {
    try {
      return IPUtils.isInRange(clientIP, range);
    } catch {
      return false;
    }
  });

  if (!isFromOfficeNetwork) {
    console.warn(`🚨 Admin access denied for IP: ${clientIP} - not from office network`);
    
    return res.status(403).json({
      error: 'Admin access restricted',
      code: 'ADMIN_NETWORK_RESTRICTED', 
      message: 'Administrative functions can only be accessed from authorized networks'
    });
  }

  next();
};

/**
 * Financial operations network security
 */
export const financialNetworkSecurity = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || 'unknown';
  
  // Financial operations require office network OR trusted external (banks)
  const trustedNetworks = [...NETWORK_POLICIES.OFFICE_IPS, ...NETWORK_POLICIES.TRUSTED_EXTERNAL];
  
  const isTrusted = trustedNetworks.some(range => {
    try {
      return IPUtils.isInRange(clientIP, range);
    } catch {
      return false;
    }
  });

  if (!isTrusted) {
    console.warn(`🚨 Financial operation denied for IP: ${clientIP} - not from trusted network`);
    
    return res.status(403).json({
      error: 'Financial access restricted',
      code: 'FINANCIAL_NETWORK_RESTRICTED',
      message: 'Financial operations require access from trusted networks only'
    });
  }

  next();
};

/**
 * Network request validation
 */
export const networkRequestValidation = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || 'unknown';
  
  // Validate request size and headers
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 50 * 1024 * 1024; // 50MB for file uploads
  
  if (contentLength > maxSize) {
    console.warn(`🚨 Oversized request from IP: ${clientIP}, size: ${contentLength} bytes`);
    
    return res.status(413).json({
      error: 'Request too large',
      maxSize: '50MB',
      code: 'REQUEST_TOO_LARGE'
    });
  }

  // Check for suspicious header combinations
  const hasOrigin = req.get('origin');
  const hasReferer = req.get('referer');
  const hasUserAgent = req.get('user-agent');
  
  // API requests without proper headers might be automated attacks
  if (req.path.startsWith('/api/') && req.method !== 'GET' && !hasUserAgent) {
    console.warn(`⚠️  API request without User-Agent from IP: ${clientIP} to ${req.path}`);
  }

  next();
};

/**
 * Mock geo-location service (replace with real service in production)
 */
async function mockGeoLocation(ip: string): Promise<{
  country: string;
  region: string; 
  city: string;
  risk_level: 'low' | 'medium' | 'high';
}> {
  // In production, use a real geo-IP service like MaxMind or IPStack
  return {
    country: 'GR', // Default to Greece for testing
    region: 'Attica',
    city: 'Athens', 
    risk_level: 'low'
  };
}

/**
 * Update threat intelligence data (would be updated from external feeds)
 */
function updateThreatIntelligence(ip: string, threatType: string, severity: number) {
  networkThreatData.set(ip, {
    threat_type: threatType,
    severity,
    last_seen: new Date(),
    sources: ['internal_detection']
  });
  
  console.log(`🛡️  Updated threat intelligence for IP: ${ip}, type: ${threatType}, severity: ${severity}`);
}

/**
 * Clean up old data periodically
 */
setInterval(() => {
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Clean geo-location cache
  const geoEntries = Array.from(ipGeolocationCache.entries());
  for (const [ip, data] of geoEntries) {
    if (now.getTime() - data.timestamp.getTime() > oneDay) {
      ipGeolocationCache.delete(ip);
    }
  }
  
  // Clean threat data older than 7 days
  const sevenDays = 7 * oneDay;
  const threatEntries = Array.from(networkThreatData.entries());
  for (const [ip, data] of threatEntries) {
    if (now.getTime() - data.last_seen.getTime() > sevenDays) {
      networkThreatData.delete(ip);
    }
  }
  
  console.log(`🧹 Cleaned network security cache. Geo entries: ${ipGeolocationCache.size}, Threat entries: ${networkThreatData.size}`);
}, 60 * 60 * 1000); // Clean every hour

// Export utilities for external use
export { IPUtils, networkThreatData, updateThreatIntelligence };

// Extend Request interface to include geo info
declare global {
  namespace Express {
    interface Request {
      geoInfo?: {
        country: string;
        region: string;
        city: string;
        risk_level: 'low' | 'medium' | 'high';
      };
    }
  }
}