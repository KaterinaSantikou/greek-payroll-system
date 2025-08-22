import express from 'express';
import session from 'express-session';
import { z } from 'zod';
import { RateLimitService } from '../services/RateLimitService';
import { PasswordService } from '../services/PasswordService';
import { TokenService } from '../services/TokenService';
import { SessionService } from '../services/SessionService';
import { MfaService } from '../services/MfaService';
import { AuditService } from '../services/AuditService';
import { SsoService } from '../services/SsoService';
import { LocalizationService } from '../services/LocalizationService';
import { GdprService } from '../services/GdprService';
import { db } from '../db';
import { users, emailVerificationTokens, passwordResetTokens, magicLinkTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { 
  csrfProtection, 
  generateCSRFToken, 
  cspHeaders, 
  bruteForceProtection,
  resetBruteForceOnSuccess,
  getSecureCookieOptions 
} from '../middleware/securityMiddleware';

// Express session configuration
if (typeof process.env.SESSION_SECRET === 'undefined') {
  throw new Error('SESSION_SECRET environment variable is required');
}

// Session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

const router = express.Router();

// Apply security middleware
router.use(cspHeaders());
router.use(sessionMiddleware);
router.use(csrfProtection());
router.use(resetBruteForceOnSuccess());

// CSRF token endpoint
router.get('/csrf-token', generateCSRFToken());

// Helper function to get client info
const getClientInfo = (req: express.Request) => ({
  ipAddress: (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, ''),
  userAgent: req.headers['user-agent'] || '',
});

// Helper function for uniform error responses (prevents account enumeration)
const createErrorResponse = (req: express.Request, code: string, messageKey: keyof import('../services/LocalizationService').LocalizedMessages, retryInSeconds?: number) => {
  const locale = LocalizationService.getUserLocale(req);
  return LocalizationService.createErrorResponse(code, messageKey, locale, {}, retryInSeconds);
};

const createSuccessResponse = (req: express.Request, messageKey: keyof import('../services/LocalizationService').LocalizedMessages, data: any = {}, variables: Record<string, string> = {}) => {
  const locale = LocalizationService.getUserLocale(req);
  return LocalizationService.createSuccessResponse(messageKey, locale, variables, data);
};

/**
 * 4.1 Sign-Up
 * POST /auth/signup
 */
router.post('/signup', 
  rateLimitMiddleware('signup'),
  bruteForceProtection({ maxAttempts: 5, windowMinutes: 60, blockMinutes: 15 }),
  async (req, res) => {
  try {
    const { email, password, accept_tos, locale } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_FIELDS', 'GENERIC_ERROR'));
    }

    if (!accept_tos) {
      return res.status(400).json(createErrorResponse(req, 'TOS_NOT_ACCEPTED', 'GDPR_CONSENT_REQUIRED'));
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (existingUser.length > 0) {
      await AuditService.logEvent({
        eventType: 'signup_failed',
        eventCategory: 'auth',
        eventAction: 'signup',
        tenantId: 'default',
        userId: 'anonymous',
        eventData: {
          email,
          result: 'failure',
          reason: 'Email already registered',
          ipAddress,
          userAgent
        }
      });

      // Return generic success to prevent email enumeration
      return res.status(201).json(createSuccessResponse(req, 'SIGNUP_SUCCESS', {
        user_id: 'pending',
        requires_verification: true,
      }));
    }

    // Hash password
    const passwordHash = await PasswordService.hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        locale: locale || 'en',
        isActive: true,
        tosAcceptedAt: new Date(),
      })
      .returning();

    // Generate email verification token
    const verificationToken = TokenService.generateEmailVerificationToken(newUser.id, email.toLowerCase());
    
    await db.insert(emailVerificationTokens).values({
      userId: newUser.id,
      email: email.toLowerCase(),
      token: verificationToken.token,
      expiresAt: verificationToken.expiresAt,
    });

    // Audit log
    await AuditService.logEvent({
      eventType: 'signup',
      eventCategory: 'auth',
      eventAction: 'signup',
      tenantId: 'default',
      userId: newUser.id,
      eventData: {
        email: email.toLowerCase(),
        result: 'success',
        locale,
        tos_accepted: true,
        ipAddress,
        userAgent
      }
    });

    // In a real app, send verification email here
    // await EmailService.sendVerificationEmail(email, verificationToken.token);

    res.status(201).json(createSuccessResponse(req, 'SIGNUP_SUCCESS', {
      user_id: newUser.id,
      requires_verification: true,
    }));

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json(createErrorResponse(req, 'SIGNUP_FAILED', 'Internal server error'));
  }
});

/**
 * 4.2 Login
 * POST /auth/login
 */
router.post('/login', rateLimitMiddleware('login'), async (req, res) => {
  try {
    const { email, password } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_CREDENTIALS', 'Email and password are required'));
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user || !user.passwordHash) {
      await AuditService.logEvent({
        eventType: 'login_failed',
        eventCategory: 'auth',
        eventAction: 'login',
        tenantId: 'default',
        userId: 'anonymous',
        eventData: {
          email: email.toLowerCase(),
          result: 'failure',
          reason: 'Invalid credentials',
          ipAddress,
          userAgent
        }
      });

      return res.status(401).json(createErrorResponse(req, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json(createErrorResponse(req, 'ACCOUNT_DEACTIVATED', 'Account is deactivated'));
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json(createErrorResponse(req, 'EMAIL_NOT_VERIFIED', 'Email address not verified'));
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      return res.status(423).json(createErrorResponse(req, 'RATE_LIMITED', 'Account is temporarily locked', retryAfter));
    }

    // Verify password
    const isValidPassword = await PasswordService.verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      const newAttempts = (user.loginAttempts || 0) + 1;
      const shouldLock = newAttempts >= 5;
      
      const updateData: any = { 
        loginAttempts: newAttempts,
      };
      
      if (shouldLock) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id));

      await AuditService.logEvent({
        eventType: shouldLock ? 'account_locked' : 'login_failed',
        eventCategory: 'auth',
        eventAction: 'login',
        tenantId: 'default',
        userId: user.id,
        eventData: {
          email: email.toLowerCase(),
          result: 'failure',
          reason: 'Invalid credentials',
          attempts: newAttempts,
          ipAddress,
          userAgent
        }
      });

      const retryAfter = shouldLock ? 15 * 60 : undefined;
      return res.status(401).json(createErrorResponse(req, 'INVALID_CREDENTIALS', 'Invalid email or password', retryAfter));
    }

    // Check if MFA is required
    if (user.mfaEnabled) {
      const mfaMethods = await MfaService.getUserMfaMethods(user.id);
      return res.status(200).json({
        mfa_required: true,
        mfa_methods: mfaMethods,
      });
    }

    // Create session
    const tokenPair = await SessionService.createSession(
      user.id,
      ipAddress,
      userAgent,
      1 // Authentication level 1 (password only)
    );

    // Reset failed attempts
    await db
      .update(users)
      .set({ 
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Set HttpOnly session cookie
    res.cookie('sessionToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      session: {
        id: tokenPair.sessionId,
        expires_at: tokenPair.expiresAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createErrorResponse(req, 'LOGIN_FAILED', 'Internal server error'));
  }
});

/**
 * 4.3 MFA Challenge - TOTP
 * POST /auth/mfa/challenge
 */
router.post('/mfa/challenge', rateLimitMiddleware('mfa-verify'), async (req, res) => {
  try {
    const { code, email } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!code || !email) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_FIELDS', 'Code and email are required'));
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user || !user.mfaEnabled) {
      return res.status(401).json(createErrorResponse(req, 'INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    // Verify MFA token
    let mfaValid = false;
    
    // Try TOTP first
    if (code.length === 6 && /^\d+$/.test(code)) {
      mfaValid = await MfaService.verifyTotp(user.id, code);
      
      // If TOTP fails, try backup code
      if (!mfaValid) {
        mfaValid = await MfaService.verifyBackupCode(user.id, code);
      }
    } else {
      // Might be backup code format
      mfaValid = await MfaService.verifyBackupCode(user.id, code);
    }

    if (!mfaValid) {
      await AuditService.logEvent({
        eventType: 'mfa_failed',
        eventCategory: 'auth',
        eventAction: 'mfa_verify',
        tenantId: 'default',
        userId: user.id,
        eventData: {
          email: email.toLowerCase(),
          result: 'failure',
          reason: 'Invalid MFA token',
          ipAddress,
          userAgent
        }
      });

      return res.status(401).json(createErrorResponse(req, 'INVALID_CREDENTIALS', 'Invalid MFA code'));
    }

    // Create session with higher authentication level
    const tokenPair = await SessionService.createSession(
      user.id,
      ipAddress,
      userAgent,
      2 // Authentication level 2 (password + MFA)
    );

    // Set HttpOnly session cookie
    res.cookie('sessionToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      session: {
        id: tokenPair.sessionId,
        expires_at: tokenPair.expiresAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('MFA challenge error:', error);
    res.status(500).json(createErrorResponse(req, 'MFA_ERROR', 'Internal server error'));
  }
});

/**
 * 4.3 MFA Challenge - WebAuthn
 * POST /auth/mfa/webauthn/verify
 */
router.post('/mfa/webauthn/verify', async (req, res) => {
  try {
    const { email, response: webauthnResponse } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email || !webauthnResponse) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_FIELDS', 'Email and WebAuthn response are required'));
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user || !user.mfaEnabled) {
      return res.status(401).json(createErrorResponse(req, 'INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    try {
      // Verify WebAuthn assertion
      const isValid = await MfaService.verifyWebAuthnAssertion(user.id, webauthnResponse);
      
      if (!isValid) {
        return res.status(401).json(createErrorResponse(req, 'WEBAUTHN_ERROR', 'WebAuthn verification failed'));
      }

      // Create session with higher authentication level
      const tokenPair = await SessionService.createSession(
        user.id,
        ipAddress,
        userAgent,
        2 // Authentication level 2 (password + MFA)
      );

      // Set HttpOnly session cookie
      res.cookie('sessionToken', tokenPair.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({
        session: {
          id: tokenPair.sessionId,
          expires_at: tokenPair.expiresAt.toISOString(),
        },
      });

    } catch (error) {
      console.error('WebAuthn verification error:', error);
      return res.status(401).json(createErrorResponse(req, 'WEBAUTHN_ERROR', 'WebAuthn verification failed'));
    }

  } catch (error) {
    console.error('WebAuthn MFA error:', error);
    res.status(500).json(createErrorResponse(req, 'WEBAUTHN_ERROR', 'Internal server error'));
  }
});

/**
 * 4.4 Magic Link Request
 * POST /auth/magic-link
 */
router.post('/magic-link', rateLimitMiddleware('magic-link'), async (req, res) => {
  try {
    const { email } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_EMAIL', 'Email is required'));
    }

    // Always return 202 to prevent email enumeration
    res.status(202).json({ message: 'Magic link sent if account exists' });

    // Find user (but don't reveal if they exist)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user) {
      await AuditService.logEvent({
        eventType: 'magic_link_requested',
        eventCategory: 'auth',
        eventAction: 'magic_link_request',
        tenantId: 'default',
        userId: 'anonymous',
        eventData: {
          email: email.toLowerCase(),
          result: 'failure',
          reason: 'Email not found',
          ipAddress,
          userAgent
        }
      });
      return; // Don't send email, but don't reveal this
    }

    // Generate magic link token
    const magicToken = TokenService.generateMagicLinkToken(user.id, email.toLowerCase());
    
    await db.insert(magicLinkTokens).values({
      userId: user.id,
      token: magicToken.token,
      expiresAt: magicToken.expiresAt,
    });

    // Audit log
    await AuditService.logEvent({
      eventType: 'magic_link_requested',
      eventCategory: 'auth',
      eventAction: 'magic_link_request',
      tenantId: 'default',
      userId: user.id,
      eventData: {
        email: email.toLowerCase(),
        result: 'success',
        ipAddress,
        userAgent
      }
    });

    // In a real app, send magic link email here
    // await EmailService.sendMagicLinkEmail(email, magicToken.token);

  } catch (error) {
    console.error('Magic link error:', error);
    // Still return 202 even on error to prevent information leakage
    if (!res.headersSent) {
      res.status(202).json({ message: 'Magic link sent if account exists' });
    }
  }
});

/**
 * 4.4 Magic Link Consume
 * GET /auth/magic-link/consume?token=...
 */
router.get('/magic-link/consume', async (req, res) => {
  try {
    const { token } = req.query;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!token || typeof token !== 'string') {
      return res.status(400).json(createErrorResponse(req, 'INVALID_TOKEN', 'Invalid magic link token'));
    }

    // Verify token
    let payload;
    try {
      payload = TokenService.verifyMagicLinkToken(token);
    } catch (error) {
      return res.status(400).json(createErrorResponse(req, 'TOKEN_EXPIRED', 'Magic link token expired or invalid'));
    }

    // Check database token
    const [tokenRecord] = await db
      .select()
      .from(magicLinkTokens)
      .where(
        and(
          eq(magicLinkTokens.userId, payload.userId),
          eq(magicLinkTokens.token, token),
          eq(magicLinkTokens.used, false)
        )
      );

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(400).json(createErrorResponse(req, 'TOKEN_EXPIRED', 'Magic link token expired or invalid'));
    }

    // Mark token as used
    await db
      .update(magicLinkTokens)
      .set({ used: true })
      .where(eq(magicLinkTokens.id, tokenRecord.id));

    // Create session
    const tokenPair = await SessionService.createSession(
      payload.userId,
      ipAddress,
      userAgent,
      1 // Authentication level 1
    );

    // Set HttpOnly session cookie
    res.cookie('sessionToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Audit log
    await AuditService.logEvent({
      eventType: 'magic_link_login',
      eventCategory: 'auth',
      eventAction: 'magic_link_login',
      tenantId: 'default',
      userId: payload.userId,
      eventData: {
        email: payload.email,
        result: 'success',
        ipAddress,
        userAgent
      }
    });

    // Redirect to app
    res.redirect('/');

  } catch (error) {
    console.error('Magic link consume error:', error);
    res.status(400).json(createErrorResponse(req, 'TOKEN_EXPIRED', 'Magic link token expired or invalid'));
  }
});

/**
 * 4.5 Forgot Password
 * POST /auth/password/forgot
 */
router.post('/password/forgot', rateLimitMiddleware('forgot-password'), async (req, res) => {
  try {
    const { email } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_EMAIL', 'Email is required'));
    }

    // Always return success to prevent email enumeration
    const successResponse = {
      message: 'If an account with that email exists, you will receive a password reset link.',
    };

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user) {
      await AuditService.logEvent({
        eventType: 'password_reset_requested',
        eventCategory: 'auth',
        eventAction: 'password_reset_request',
        tenantId: 'default',
        userId: 'anonymous',
        eventData: {
          email: email.toLowerCase(),
          result: 'failure',
          reason: 'Email not found',
          ipAddress,
          userAgent
        }
      });

      return res.json(successResponse);
    }

    // Generate reset token
    const resetToken = TokenService.generatePasswordResetToken(user.id, email.toLowerCase());
    
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken.token,
      expiresAt: resetToken.expiresAt,
    });

    // Audit log
    await AuditService.logEvent({
      eventType: 'password_reset_requested',
      eventCategory: 'auth',
      eventAction: 'password_reset_request',
      tenantId: 'default',
      userId: user.id,
      eventData: {
        email: email.toLowerCase(),
        result: 'success',
        ipAddress,
        userAgent
      }
    });

    // In a real app, send reset email here
    // await EmailService.sendPasswordResetEmail(email, resetToken.token);

    res.json(successResponse);

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json(createErrorResponse(req, 'RESET_REQUEST_FAILED', 'Internal server error'));
  }
});

/**
 * 4.5 Reset Password
 * POST /auth/password/reset
 */
router.post('/password/reset', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!token || !new_password) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_FIELDS', 'Token and new password are required'));
    }

    // Verify token
    let payload;
    try {
      payload = TokenService.verifyPasswordResetToken(token);
    } catch (error) {
      return res.status(400).json(createErrorResponse(req, 'TOKEN_EXPIRED', 'Reset token expired or invalid'));
    }

    // Check database token
    const [tokenRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, payload.userId),
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false)
        )
      );

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(400).json(createErrorResponse(req, 'TOKEN_EXPIRED', 'Reset token expired or invalid'));
    }

    // Hash new password
    const passwordHash = await PasswordService.hashPassword(new_password);

    // Update password
    await db
      .update(users)
      .set({
        passwordHash,
        loginAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(users.id, payload.userId));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenRecord.id));

    // Revoke all existing sessions for security
    await SessionService.revokeAllUserSessions(payload.userId, 'Password reset');

    // Audit log
    await AuditService.logEvent({
      eventType: 'password_reset',
      eventCategory: 'auth',
      eventAction: 'password_reset',
      tenantId: 'default',
      userId: payload.userId,
      eventData: {
        email: payload.email,
        result: 'success',
        ipAddress,
        userAgent
      }
    });

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(createErrorResponse(req, 'RESET_FAILED', 'Internal server error'));
  }
});

/**
 * 4.6 SSO Login
 * GET /auth/oidc/:provider/login
 */
router.get('/oidc/:provider/login', async (req, res) => {
  try {
    const { provider } = req.params;
    const { ipAddress, userAgent } = getClientInfo(req);

    // Generate PKCE challenge and state
    const pkce = SsoService.generatePkceChallenge();
    const state = SsoService.generateState();

    // Store PKCE data in session (or cache)
    req.session.pkce = pkce;
    req.session.ssoState = state;

    // Get provider config (this would come from environment or database)
    const config = {
      clientId: process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
      clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || '',
      issuer: process.env[`${provider.toUpperCase()}_ISSUER`] || '',
      redirectUri: `${req.protocol}://${req.get('host')}/auth/oidc/${provider}/callback`,
      scopes: ['openid', 'email', 'profile'],
    };

    if (!config.clientId) {
      return res.status(400).json(createErrorResponse(req, 'SSO_FORBIDDEN', `SSO provider ${provider} not configured`));
    }

    // Build authorization URL
    const authUrl = SsoService.buildAuthorizationUrl(provider, config, pkce, state);

    res.redirect(authUrl);

  } catch (error) {
    console.error('SSO login error:', error);
    res.status(500).json(createErrorResponse(req, 'SSO_FORBIDDEN', 'SSO login failed'));
  }
});

/**
 * 4.6 SSO Callback
 * GET /auth/oidc/:provider/callback
 */
router.get('/oidc/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;
    const { ipAddress, userAgent } = getClientInfo(req);

    // Verify state parameter
    if (!state || state !== req.session.ssoState) {
      return res.status(400).json(createErrorResponse(req, 'SSO_FORBIDDEN', 'Invalid state parameter'));
    }

    // Get stored PKCE data
    const pkce = req.session.pkce;
    if (!pkce) {
      return res.status(400).json(createErrorResponse(req, 'SSO_FORBIDDEN', 'Missing PKCE data'));
    }

    // Get provider config
    const config = {
      clientId: process.env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
      clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] || '',
      issuer: process.env[`${provider.toUpperCase()}_ISSUER`] || '',
      redirectUri: `${req.protocol}://${req.get('host')}/auth/oidc/${provider}/callback`,
      scopes: ['openid', 'email', 'profile'],
    };

    // Exchange code for tokens
    const tokens = await SsoService.exchangeCodeForTokens(
      provider,
      code as string,
      pkce.codeVerifier,
      config
    );

    // Get user info
    const userInfo = await SsoService.getUserInfo(provider, tokens.accessToken);

    // Map user data
    const ssoUser = SsoService.mapSsoUser(provider, userInfo, tokens.idToken);

    // Provision or authenticate user
    const userId = await SsoService.provisionUser(ssoUser, ipAddress, userAgent);

    // Create session
    const tokenPair = await SessionService.createSession(
      userId,
      ipAddress,
      userAgent,
      1 // Authentication level 1
    );

    // Set HttpOnly session cookie
    res.cookie('sessionToken', tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Clear SSO session data
    delete req.session.pkce;
    delete req.session.ssoState;

    // Redirect to app
    res.redirect('/');

  } catch (error) {
    console.error('SSO callback error:', error);
    res.status(500).json(createErrorResponse(req, 'SSO_FORBIDDEN', 'SSO authentication failed'));
  }
});

/**
 * 4.7 Get Current Session
 * GET /auth/session
 */
router.get('/session', async (req, res) => {
  try {
    const sessionToken = req.cookies?.sessionToken;
    
    if (!sessionToken) {
      return res.status(401).json(createErrorResponse(req, 'INVALID_CREDENTIALS', 'No active session'));
    }

    const session = await SessionService.validateSession(sessionToken);
    
    if (!session) {
      res.clearCookie('sessionToken');
      return res.status(401).json(createErrorResponse(req, 'INVALID_CREDENTIALS', 'Invalid session'));
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));

    if (!user) {
      return res.status(401).json(createErrorResponse(req, 'INVALID_CREDENTIALS', 'User not found'));
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        locale: user.locale,
        mfaEnabled: user.mfaEnabled,
      },
      session: {
        id: session.sessionId,
        expires_at: session.expiresAt.toISOString(),
        auth_level: session.authLevel,
      },
    });

  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json(createErrorResponse(req, 'SESSION_ERROR', 'Internal server error'));
  }
});

/**
 * 4.7 Logout
 * POST /auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const sessionToken = req.cookies?.sessionToken;
    
    if (sessionToken) {
      const session = await SessionService.validateSession(sessionToken);
      if (session) {
        await SessionService.revokeSession(session.sessionId, 'User logout');
        
        // Audit log
        await AuditService.logEvent({
          eventType: 'logout',
          eventCategory: 'auth',
          eventAction: 'logout',
          tenantId: 'default',
          userId: session.userId,
          sessionId: session.sessionId,
          eventData: {
            result: 'success',
            ipAddress: getClientInfo(req).ipAddress,
            userAgent: getClientInfo(req).userAgent
          }
        });
      }
    }

    // Clear session cookie
    res.clearCookie('sessionToken');

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(createErrorResponse(req, 'LOGOUT_FAILED', 'Internal server error'));
  }
});

/**
 * GDPR Compliance Endpoints
 */

// Get user consent status
router.get('/gdpr/consent', async (req, res) => {
  try {
    // This would need session-based auth in real implementation
    const userId = req.query.user_id as string;
    if (!userId) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_USER_ID', 'GENERIC_ERROR'));
    }

    const consentStatus = await GdprService.getConsentStatus(userId);
    res.json(consentStatus);
  } catch (error) {
    console.error('Get consent error:', error);
    res.status(500).json(createErrorResponse(req, 'GDPR_ERROR', 'GENERIC_ERROR'));
  }
});

// Update user consent
router.post('/gdpr/consent', async (req, res) => {
  try {
    const { user_id, consents } = req.body;
    
    if (!user_id || !consents) {
      return res.status(400).json(createErrorResponse(req, 'MISSING_FIELDS', 'GENERIC_ERROR'));
    }

    await GdprService.updateConsent(user_id, consents);
    res.json(createSuccessResponse(req, 'GDPR_CONSENT_REQUIRED'));
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json(createErrorResponse(req, 'GDPR_ERROR', 'GENERIC_ERROR'));
  }
});

// Export user data (GDPR Article 20)
router.post('/gdpr/export', 
  rateLimitMiddleware('gdpr'),
  async (req, res) => {
    try {
      const { user_id } = req.body;
      
      if (!user_id) {
        return res.status(400).json(createErrorResponse(req, 'MISSING_USER_ID', 'GENERIC_ERROR'));
      }

      const exportData = await GdprService.exportUserData(user_id);
      
      // Set appropriate headers for download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user_data_export_${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    } catch (error) {
      console.error('Export data error:', error);
      res.status(500).json(createErrorResponse(req, 'EXPORT_FAILED', 'GENERIC_ERROR'));
    }
  }
);

// Delete user account (GDPR Article 17)
router.post('/gdpr/delete-account',
  rateLimitMiddleware('gdpr'),
  async (req, res) => {
    try {
      const { user_id, confirmation } = req.body;
      
      if (!user_id || confirmation !== 'DELETE_MY_ACCOUNT') {
        return res.status(400).json(createErrorResponse(req, 'INVALID_CONFIRMATION', 'GENERIC_ERROR'));
      }

      // Get user data for audit log before deletion
      const [user] = await db.select().from(users).where(eq(users.id, user_id));
      if (!user) {
        return res.status(404).json(createErrorResponse(req, 'USER_NOT_FOUND', 'GENERIC_ERROR'));
      }

      // Log account deletion request
      await AuditService.log({
        eventType: 'ACCOUNT_DELETION_REQUESTED',
        userId: user_id,
        email: user.email,
        ipAddress: getClientInfo(req).ipAddress,
        userAgent: getClientInfo(req).userAgent,
        result: 'SUCCESS',
      });

      // Perform deletion
      await GdprService.deleteUserData(user_id);
      
      // Clear session cookie
      res.clearCookie('sessionToken', getSecureCookieOptions(false));
      
      res.json(createSuccessResponse(req, 'ACCOUNT_DELETED'));
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json(createErrorResponse(req, 'DELETION_FAILED', 'GENERIC_ERROR'));
    }
  }
);

export default router;