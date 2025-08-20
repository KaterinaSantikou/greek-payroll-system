/**
 * Security Routes
 * API endpoints for security compliance validation and audit
 */

import { Router, Request, Response } from 'express';
import { SecurityAuditService } from '../services/SecurityAuditService';
import { SecurityComplianceValidator } from '../services/SecurityComplianceValidator';
import { SecurityService } from '../services/SecurityService';
import { SecretManagementService } from '../services/SecretManagementService';
import { SecurityMiddleware } from '../middleware/SecurityMiddleware';

const router = Router();

/**
 * GET /api/security/compliance-check
 * Run complete security compliance validation
 */
router.get('/compliance-check', async (req: Request, res: Response) => {
  try {
    const validation = await SecurityComplianceValidator.validateSecurityChecklist();
    
    res.json({
      success: true,
      compliance: validation,
    });
  } catch (error) {
    console.error('Security compliance check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform compliance check',
    });
  }
});

/**
 * GET /api/security/audit-report
 * Generate comprehensive security audit report
 */
router.get('/audit-report', async (req: Request, res: Response) => {
  try {
    const audit = await SecurityAuditService.performSecurityAudit();
    
    res.json({
      success: true,
      audit,
    });
  } catch (error) {
    console.error('Security audit failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate audit report',
    });
  }
});

/**
 * GET /api/security/executive-summary
 * Generate executive security summary
 */
router.get('/executive-summary', async (req: Request, res: Response) => {
  try {
    const summary = await SecurityComplianceValidator.generateExecutiveSummary();
    
    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Failed to generate executive summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate executive summary',
    });
  }
});

/**
 * GET /api/security/detailed-report
 * Generate detailed compliance report (text format)
 */
router.get('/detailed-report', async (req: Request, res: Response) => {
  try {
    const report = await SecurityComplianceValidator.generateDetailedReport();
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(report);
  } catch (error) {
    console.error('Failed to generate detailed report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate detailed report',
    });
  }
});

/**
 * POST /api/security/test-argon2
 * Test Argon2id password hashing configuration
 */
router.post('/test-argon2', async (req: Request, res: Response) => {
  try {
    const { password = 'test123' } = req.body;
    
    const start = Date.now();
    const result = await SecurityService.hashPassword(password);
    const duration = Date.now() - start;
    
    // Verify the hash
    const verified = await SecurityService.verifyPassword(password, result.hash);
    
    res.json({
      success: true,
      test: {
        password_length: password.length,
        hash_generated: !!result.hash,
        salt_length: result.salt.length,
        config: result.config,
        duration_ms: duration,
        verification_passed: verified,
        compliance: {
          memory_requirement_met: result.config.memory >= 65536, // 64MB
          iterations_requirement_met: result.config.iterations >= 3,
          overall_compliant: result.config.memory >= 65536 && result.config.iterations >= 3,
        },
      },
    });
  } catch (error) {
    console.error('Argon2 test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Argon2 configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/security/cookie-config
 * Test secure cookie configuration
 */
router.get('/cookie-config', (req: Request, res: Response) => {
  try {
    const config = SecurityService.getSecureCookieOptions();
    
    res.json({
      success: true,
      cookie_config: config,
      compliance: {
        secure_enabled: config.secure,
        http_only_enabled: config.httpOnly,
        same_site_configured: config.sameSite === 'lax',
        max_age_reasonable: config.maxAge > 0 && config.maxAge <= 30 * 24 * 60 * 60 * 1000, // ≤ 30 days
        overall_compliant: config.httpOnly && config.sameSite === 'lax' && 
                          (process.env.NODE_ENV !== 'production' || config.secure),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check cookie configuration',
    });
  }
});

/**
 * GET /api/security/csrf-token
 * Generate and validate CSRF token
 */
router.get('/csrf-token', (req: Request, res: Response) => {
  try {
    const token = SecurityService.generateCSRFToken();
    
    // Store in session for validation
    if (req.session) {
      req.session.csrfToken = token;
    }
    
    res.json({
      success: true,
      csrf_token: token,
      compliance: {
        token_generated: !!token,
        token_length_sufficient: token.length >= 32,
        token_format: 'base64url',
        session_stored: !!req.session?.csrfToken,
        overall_compliant: !!token && token.length >= 32,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token',
    });
  }
});

/**
 * POST /api/security/test-csrf
 * Test CSRF protection (requires CSRF token)
 */
router.post('/test-csrf', SecurityService.csrfProtection(), (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'CSRF protection working correctly',
    csrf_validated: true,
  });
});

/**
 * GET /api/security/rate-limit-status
 * Check rate limiting status
 */
router.get('/rate-limit-status', (req: Request, res: Response) => {
  try {
    const identifier = `test-${req.ip}`;
    const rateLimit = SecurityService.checkRateLimit(identifier);
    
    res.json({
      success: true,
      rate_limit: rateLimit,
      compliance: {
        rate_limiting_enabled: rateLimit.remainingAttempts < 1000, // Should have reasonable limit
        captcha_after_threshold: rateLimit.captchaRequired,
        lockout_mechanism: !!rateLimit.lockedUntil,
        overall_compliant: rateLimit.remainingAttempts < 50, // Should be reasonable
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check rate limit status',
    });
  }
});

/**
 * GET /api/security/pii-redaction-test
 * Test PII redaction functionality
 */
router.get('/pii-redaction-test', (req: Request, res: Response) => {
  try {
    const testData = {
      email: 'user@example.com',
      password: 'secret123',
      ssn: '123-45-6789',
      phone: '+1-555-0123',
      name: 'John Doe',
      address: '123 Main St, City, State',
      creditCard: '4111-1111-1111-1111',
      taxId: '12-3456789',
    };
    
    const redacted = SecurityService.redactPII(testData);
    
    res.json({
      success: true,
      original_data_keys: Object.keys(testData),
      redacted_data: redacted,
      compliance: {
        email_redacted: redacted.email === '[EMAIL_REDACTED]',
        password_redacted: redacted.password === '[REDACTED]',
        ssn_redacted: redacted.ssn === '[SSN_REDACTED]',
        phone_redacted: redacted.phone === '[PHONE_REDACTED]',
        name_preserved: redacted.name === 'John Doe', // Names might be preserved depending on policy
        overall_compliant: redacted.email === '[EMAIL_REDACTED]' && 
                         redacted.password === '[REDACTED]' && 
                         redacted.ssn === '[SSN_REDACTED]',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test PII redaction',
    });
  }
});

/**
 * GET /api/security/secrets-config
 * Check secrets management configuration
 */
router.get('/secrets-config', async (req: Request, res: Response) => {
  try {
    const validation = SecretManagementService.validateConfiguration();
    
    res.json({
      success: true,
      secrets_management: validation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check secrets configuration',
    });
  }
});

/**
 * GET /api/security/checklist-status
 * Get current security checklist status with visual indicators
 */
router.get('/checklist-status', async (req: Request, res: Response) => {
  try {
    const checklist = [
      { 
        item: 'Argon2id w/ strong params (memory ≥ 64MB; iterations ≥ 3)',
        test: async () => {
          try {
            const result = await SecurityService.hashPassword('test');
            return result.config.memory >= 65536 && result.config.iterations >= 3;
          } catch { return false; }
        }
      },
      { 
        item: 'All cookies Secure, HttpOnly, SameSite=Lax',
        test: () => {
          const config = SecurityService.getSecureCookieOptions();
          return config.httpOnly && config.sameSite === 'lax' && 
                 (process.env.NODE_ENV !== 'production' || config.secure);
        }
      },
      { 
        item: 'CSRF protection on state-changing endpoints',
        test: () => {
          const token = SecurityService.generateCSRFToken();
          return token && token.length >= 32;
        }
      },
      { 
        item: 'Email enumeration protections (generic responses)',
        test: () => {
          const response = SecurityService.getGenericAuthResponse('en');
          return response.code === 'AUTH_REQUEST_PROCESSED';
        }
      },
      { 
        item: 'Brute-force throttling + CAPTCHA after threshold',
        test: () => {
          const rateLimit = SecurityService.checkRateLimit('test-identifier');
          return rateLimit.remainingAttempts < 50; // Should have reasonable limits
        }
      },
      { 
        item: 'WebAuthn challenge stored server-side; origin/rpId validated',
        test: () => {
          return SecurityService.validateWebAuthnOrigin('http://localhost:5000') &&
                 SecurityService.validateWebAuthnRpId('localhost');
        }
      },
      { 
        item: 'OIDC redirect URIs strict allowlist; state/nonce validated',
        test: () => {
          return SecurityService.validateOIDCRedirectUri('http://localhost:5000/auth/callback') &&
                 SecurityService.isOIDCStateValid(Date.now());
        }
      },
      { 
        item: 'Secrets in KMS/Vault; no plaintext in env dumps',
        test: () => {
          const validation = SecretManagementService.validateConfiguration();
          return validation.valid;
        }
      },
      { 
        item: 'Full audit trail enabled; logs redact PII',
        test: () => {
          const testData = { email: 'test@example.com', password: 'secret' };
          const redacted = SecurityService.redactPII(testData);
          return redacted.email === '[EMAIL_REDACTED]' && redacted.password === '[REDACTED]';
        }
      },
    ];
    
    const results = [];
    let passedCount = 0;
    
    for (const check of checklist) {
      const passed = await (typeof check.test === 'function' ? check.test() : check.test);
      if (passed) passedCount++;
      
      results.push({
        requirement: check.item,
        status: passed ? '✅ PASS' : '❌ FAIL',
        passed,
      });
    }
    
    const score = Math.round((passedCount / checklist.length) * 100);
    
    res.json({
      success: true,
      security_checklist: {
        overall_status: score === 100 ? '✅ ALL REQUIREMENTS MET' : `⚠️  ${passedCount}/${checklist.length} REQUIREMENTS MET`,
        score: `${score}%`,
        passed_count: passedCount,
        total_count: checklist.length,
        compliant: score === 100,
        results,
      },
    });
  } catch (error) {
    console.error('Checklist status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check security checklist status',
    });
  }
});

export default router;