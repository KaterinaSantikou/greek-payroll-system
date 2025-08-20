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
import { db } from '../db';
import { users, emailVerificationTokens, passwordResetTokens, magicLinkTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

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

// Apply session middleware
router.use(sessionMiddleware);

// Helper function to get client info
const getClientInfo = (req: express.Request) => ({
  ipAddress: (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, ''),
  userAgent: req.headers['user-agent'] || '',
});

// Helper function for uniform error responses
const errorResponse = (code: string, message: string, retryInSeconds?: number) => ({
  error: {
    code,
    message,
    ...(retryInSeconds && { retry_in_seconds: retryInSeconds }),
  },
});

/**
 * 4.1 Sign-Up
 * POST /auth/signup
 */
router.post('/signup', rateLimitMiddleware('signup'), async (req, res) => {
  try {
    const { email, password, accept_tos, locale } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'Email and password are required'));
    }

    if (!accept_tos) {
      return res.status(400).json(errorResponse('TOS_NOT_ACCEPTED', 'Terms of service must be accepted'));
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (existingUser.length > 0) {
      await AuditService.logEvent({
        eventType: 'signup_failed',
        ipAddress,
        userAgent,
        email,
        result: 'failure',
        reason: 'Email already registered',
      });

      return res.status(409).json(errorResponse('EMAIL_EXISTS', 'Email already registered'));
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
      userId: newUser.id,
      eventType: 'signup',
      ipAddress,
      userAgent,
      email: email.toLowerCase(),
      result: 'success',
      metadata: { locale, tos_accepted: true },
    });

    // In a real app, send verification email here
    // await EmailService.sendVerificationEmail(email, verificationToken.token);

    res.status(201).json({
      user_id: newUser.id,
      requires_verification: true,
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json(errorResponse('SIGNUP_FAILED', 'Internal server error'));
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
      return res.status(400).json(errorResponse('MISSING_CREDENTIALS', 'Email and password are required'));
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user || !user.passwordHash) {
      await AuditService.logEvent({
        eventType: 'login_failed',
        ipAddress,
        userAgent,
        email: email.toLowerCase(),
        result: 'failure',
        reason: 'Invalid credentials',
      });

      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json(errorResponse('ACCOUNT_DEACTIVATED', 'Account is deactivated'));
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json(errorResponse('EMAIL_NOT_VERIFIED', 'Email address not verified'));
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      return res.status(423).json(errorResponse('RATE_LIMITED', 'Account is temporarily locked', retryAfter));
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
        userId: user.id,
        eventType: shouldLock ? 'account_locked' : 'login_failed',
        ipAddress,
        userAgent,
        email: email.toLowerCase(),
        result: 'failure',
        reason: 'Invalid credentials',
        metadata: { attempts: newAttempts },
      });

      const retryAfter = shouldLock ? 15 * 60 : undefined;
      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', retryAfter));
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
    res.status(500).json(errorResponse('LOGIN_FAILED', 'Internal server error'));
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
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'Code and email are required'));
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user || !user.mfaEnabled) {
      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid credentials'));
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
        userId: user.id,
        eventType: 'mfa_failed',
        ipAddress,
        userAgent,
        email: email.toLowerCase(),
        result: 'failure',
        reason: 'Invalid MFA token',
      });

      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid MFA code'));
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
    res.status(500).json(errorResponse('MFA_ERROR', 'Internal server error'));
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
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'Email and WebAuthn response are required'));
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (!user || !user.mfaEnabled) {
      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    try {
      // Verify WebAuthn assertion
      const isValid = await MfaService.verifyWebAuthnAssertion(user.id, webauthnResponse);
      
      if (!isValid) {
        return res.status(401).json(errorResponse('WEBAUTHN_ERROR', 'WebAuthn verification failed'));
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
      return res.status(401).json(errorResponse('WEBAUTHN_ERROR', 'WebAuthn verification failed'));
    }

  } catch (error) {
    console.error('WebAuthn MFA error:', error);
    res.status(500).json(errorResponse('WEBAUTHN_ERROR', 'Internal server error'));
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
      return res.status(400).json(errorResponse('MISSING_EMAIL', 'Email is required'));
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
        ipAddress,
        userAgent,
        email: email.toLowerCase(),
        result: 'failure',
        reason: 'Email not found',
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
      userId: user.id,
      eventType: 'magic_link_requested',
      ipAddress,
      userAgent,
      email: email.toLowerCase(),
      result: 'success',
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
      return res.status(400).json(errorResponse('INVALID_TOKEN', 'Invalid magic link token'));
    }

    // Verify token
    let payload;
    try {
      payload = TokenService.verifyMagicLinkToken(token);
    } catch (error) {
      return res.status(400).json(errorResponse('TOKEN_EXPIRED', 'Magic link token expired or invalid'));
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
      return res.status(400).json(errorResponse('TOKEN_EXPIRED', 'Magic link token expired or invalid'));
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
      userId: payload.userId,
      eventType: 'magic_link_login',
      ipAddress,
      userAgent,
      email: payload.email,
      result: 'success',
    });

    // Redirect to app
    res.redirect('/');

  } catch (error) {
    console.error('Magic link consume error:', error);
    res.status(400).json(errorResponse('TOKEN_EXPIRED', 'Magic link token expired or invalid'));
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
      return res.status(400).json(errorResponse('MISSING_EMAIL', 'Email is required'));
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
        ipAddress,
        userAgent,
        email: email.toLowerCase(),
        result: 'failure',
        reason: 'Email not found',
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
      userId: user.id,
      eventType: 'password_reset_requested',
      ipAddress,
      userAgent,
      email: email.toLowerCase(),
      result: 'success',
    });

    // In a real app, send reset email here
    // await EmailService.sendPasswordResetEmail(email, resetToken.token);

    res.json(successResponse);

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json(errorResponse('RESET_REQUEST_FAILED', 'Internal server error'));
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
      return res.status(400).json(errorResponse('MISSING_FIELDS', 'Token and new password are required'));
    }

    // Verify token
    let payload;
    try {
      payload = TokenService.verifyPasswordResetToken(token);
    } catch (error) {
      return res.status(400).json(errorResponse('TOKEN_EXPIRED', 'Reset token expired or invalid'));
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
      return res.status(400).json(errorResponse('TOKEN_EXPIRED', 'Reset token expired or invalid'));
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
      userId: payload.userId,
      eventType: 'password_reset',
      ipAddress,
      userAgent,
      email: payload.email,
      result: 'success',
    });

    res.json({ message: 'Password reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(errorResponse('RESET_FAILED', 'Internal server error'));
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
      return res.status(400).json(errorResponse('SSO_FORBIDDEN', `SSO provider ${provider} not configured`));
    }

    // Build authorization URL
    const authUrl = SsoService.buildAuthorizationUrl(provider, config, pkce, state);

    res.redirect(authUrl);

  } catch (error) {
    console.error('SSO login error:', error);
    res.status(500).json(errorResponse('SSO_FORBIDDEN', 'SSO login failed'));
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
      return res.status(400).json(errorResponse('SSO_FORBIDDEN', 'Invalid state parameter'));
    }

    // Get stored PKCE data
    const pkce = req.session.pkce;
    if (!pkce) {
      return res.status(400).json(errorResponse('SSO_FORBIDDEN', 'Missing PKCE data'));
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
    res.status(500).json(errorResponse('SSO_FORBIDDEN', 'SSO authentication failed'));
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
      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'No active session'));
    }

    const session = await SessionService.validateSession(sessionToken);
    
    if (!session) {
      res.clearCookie('sessionToken');
      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'Invalid session'));
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId));

    if (!user) {
      return res.status(401).json(errorResponse('INVALID_CREDENTIALS', 'User not found'));
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
    res.status(500).json(errorResponse('SESSION_ERROR', 'Internal server error'));
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
          userId: session.userId,
          sessionId: session.sessionId,
          eventType: 'logout',
          ipAddress: getClientInfo(req).ipAddress,
          userAgent: getClientInfo(req).userAgent,
          result: 'success',
        });
      }
    }

    // Clear session cookie
    res.clearCookie('sessionToken');

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(errorResponse('LOGOUT_FAILED', 'Internal server error'));
  }
});

export default router;