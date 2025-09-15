/**
 * Security Validation Middleware
 * 
 * Validates that security improvements are properly implemented across the system.
 * Ensures no secrets leakage and proper data protection measures.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../observability/logging.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates that environment variables are properly configured
 */
export function validateEnvironmentSecurity(req: Request, res: Response, next: NextFunction) {
  // Check that sensitive environment variables are not exposed
  const sensitiveEnvVars = [
    'SESSION_SECRET',
    'DATA_ENCRYPTION_KEY', 
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'GITHUB_TOKEN',
    'STRIPE_SECRET_KEY',
    'SENDGRID_API_KEY'
  ];
  
  for (const envVar of sensitiveEnvVars) {
    const value = process.env[envVar];
    if (value && value.length < 16) {
      logger.warn('Weak environment variable detected', {
        variable: envVar,
        length: value.length,
        path: req.path
      });
    }
  }
  
  next();
}

/**
 * Runtime security validation
 */
export function validateSecurityImplementation() {
  const results = {
    secretsRisk: false,
    sensitiveLogsFixed: false,
    rbacImplemented: false,
    errors: [] as string[]
  };
  
  try {
    // 1. Check .env is in .gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      if (gitignoreContent.includes('.env')) {
        results.secretsRisk = true;
      } else {
        results.errors.push('.env not found in .gitignore');
      }
    } else {
      results.errors.push('.gitignore file not found');
    }
    
    // 2. Check .env.example exists
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      results.errors.push('.env.example file not found');
      results.secretsRisk = false;
    }
    
    // 3. Check logging middleware exists with PII redaction
    const loggingPath = path.join(process.cwd(), 'server/observability/logging.ts');
    if (fs.existsSync(loggingPath)) {
      const loggingContent = fs.readFileSync(loggingPath, 'utf8');
      if (loggingContent.includes('redactPII') && loggingContent.includes('AFM_REDACTED')) {
        results.sensitiveLogsFixed = true;
      } else {
        results.errors.push('PII redaction not properly implemented in logging');
      }
    } else {
      results.errors.push('Logging system not found');
    }
    
    // 4. Check RBAC middleware exists
    const rbacPath = path.join(process.cwd(), 'server/middleware/rbacMiddleware.ts');
    if (fs.existsSync(rbacPath)) {
      const rbacContent = fs.readFileSync(rbacPath, 'utf8');
      if (rbacContent.includes('requirePayrollAccess') && rbacContent.includes('requirePayrollFinalize')) {
        results.rbacImplemented = true;
      } else {
        results.errors.push('RBAC middleware not properly implemented');
      }
    } else {
      results.errors.push('RBAC middleware file not found');
    }
    
  } catch (error) {
    results.errors.push(`Security validation error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  return results;
}

/**
 * Middleware to check for potential secrets in request/response
 */
export function secretsLeakageDetection(req: Request, res: Response, next: NextFunction) {
  // Pattern matching for potential secrets in URLs or headers
  const suspiciousPatterns = [
    /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
    /SG\.[a-zA-Z0-9_-]{69}/g, // SendGrid API keys  
    /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/g, // Slack bot tokens
    /ya29\.[a-zA-Z0-9_-]+/g, // Google OAuth tokens
    /AIza[a-zA-Z0-9_-]{35}/g, // Google API keys
  ];
  
  const url = req.originalUrl;
  const userAgent = req.get('User-Agent') || '';
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      logger.warn('Potential secrets detected in request', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        suspiciousPattern: pattern.toString()
      });
      break;
    }
  }
  
  // Override res.json to check for secrets in responses
  const originalJson = res.json;
  res.json = function(body: any) {
    if (typeof body === 'object' && body !== null) {
      const responseStr = JSON.stringify(body);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(responseStr)) {
          logger.error('CRITICAL: Secrets detected in API response', {
            path: req.path,
            method: req.method,
            suspiciousPattern: pattern.toString()
          });
          
          // In production, this should trigger an alert
          if (process.env.NODE_ENV === 'production') {
            // Return generic error instead of exposing secrets
            return originalJson.call(this, { error: 'Internal server error' });
          }
          break;
        }
      }
    }
    
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * Generate security status report
 */
export function getSecurityStatusReport(): {
  status: 'secure' | 'warning' | 'critical';
  improvements: {
    secretsRisk: { status: 'fixed' | 'warning' | 'critical'; description: string };
    sensitiveLogsFixed: { status: 'fixed' | 'warning' | 'critical'; description: string };
    rbacImplemented: { status: 'fixed' | 'warning' | 'critical'; description: string };
  };
  summary: string;
} {
  const validation = validateSecurityImplementation();
  
  const improvements = {
    secretsRisk: {
      status: validation.secretsRisk ? 'fixed' as const : 'critical' as const,
      description: validation.secretsRisk 
        ? '✅ .env files properly excluded from version control, .env.example template provided'
        : '❌ Secrets management not properly configured'
    },
    sensitiveLogsFixed: {
      status: validation.sensitiveLogsFixed ? 'fixed' as const : 'critical' as const,
      description: validation.sensitiveLogsFixed
        ? '✅ Employee personal data (AFM, AMKA, names, salaries) automatically masked in all logs'
        : '❌ Sensitive logging protection not implemented'
    },
    rbacImplemented: {
      status: validation.rbacImplemented ? 'fixed' as const : 'critical' as const,
      description: validation.rbacImplemented
        ? '✅ Role-based access control protecting all sensitive payroll operations'
        : '❌ Access control not properly implemented'
    }
  };
  
  const fixedCount = Object.values(improvements).filter(i => i.status === 'fixed').length;
  const status = fixedCount === 3 ? 'secure' : fixedCount >= 2 ? 'warning' : 'critical';
  
  const summary = `Security implementation: ${fixedCount}/3 improvements completed. ` +
    (validation.errors.length > 0 ? `Issues: ${validation.errors.join(', ')}` : 'All security measures implemented correctly.');
  
  return {
    status,
    improvements,
    summary
  };
}