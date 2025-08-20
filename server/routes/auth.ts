import express from 'express';
import { z } from 'zod';
import { RateLimitService } from '../services/RateLimitService';
import { PasswordService } from '../services/PasswordService';
import { TokenService } from '../services/TokenService';
import { SessionService } from '../services/SessionService';
import { MfaService } from '../services/MfaService';
import { AuditService } from '../services/AuditService';
import { SsoService } from '../services/SsoService';
import { db } from '../db';
import { users, emailVerificationTokens, passwordResetTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  locale: z.enum(['en', 'el']).default('en'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  mfaToken: z.string().optional(),
  remember: z.boolean().default(false),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

// Helper function to get client info
const getClientInfo = (req: express.Request) => ({
  ipAddress: (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, ''),
  userAgent: req.headers['user-agent'] || '',
});

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', rateLimitMiddleware('signup'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, locale } = registerSchema.parse(req.body);
    const { ipAddress, userAgent } = getClientInfo(req);

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

      return res.status(400).json({ 
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const passwordHash = await PasswordService.hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        locale,
        isActive: true,
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
      metadata: { 
        method: 'email',
        locale,
      },
    });

    // In a real app, send verification email here
    // await EmailService.sendVerificationEmail(email, verificationToken.token);

    res.status(201).json({
      message: 'Account created successfully. Please check your email for verification.',
      requiresEmailVerification: true,
      userId: newUser.id,
      // For development, include the token (remove in production)
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken.token : undefined,
    });

  } catch (error) {
    const { ipAddress, userAgent } = getClientInfo(req);
    
    await AuditService.logEvent({
      eventType: 'signup_failed',
      ipAddress,
      userAgent,
      result: 'failure',
      reason: error instanceof Error ? error.message : 'Unknown error',
      severity: 'error',
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors 
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', rateLimitMiddleware('email-verify'), async (req, res) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    const { ipAddress, userAgent } = getClientInfo(req);

    // Verify token
    let payload;
    try {
      payload = TokenService.verifyEmailVerificationToken(token);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    // Check database token
    const [tokenRecord] = await db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.userId, payload.userId),
          eq(emailVerificationTokens.token, token)
        )
      );

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    // Update user as verified
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
      })
      .where(eq(users.id, payload.userId));

    // Delete used token
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, tokenRecord.id));

    // Audit log
    await AuditService.logEvent({
      userId: payload.userId,
      eventType: 'email_verified',
      ipAddress,
      userAgent,
      email: payload.email,
      result: 'success',
    });

    res.json({ message: 'Email verified successfully' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/login
 * Authenticate user
 */
router.post('/login', rateLimitMiddleware('login'), async (req, res) => {
  try {
    const { email, password, mfaToken, remember } = loginSchema.parse(req.body);
    const { ipAddress, userAgent } = getClientInfo(req);

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

      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      await AuditService.logEvent({
        userId: user.id,
        eventType: 'login_failed',
        ipAddress,
        userAgent,
        email: email.toLowerCase(),
        result: 'blocked',
        reason: 'Account deactivated',
      });

      return res.status(403).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      
      await AuditService.logEvent({
        userId: user.id,
        eventType: 'login_failed',
        ipAddress,
        userAgent,
        email: email.toLowerCase(),
        result: 'blocked',
        reason: 'Account locked',
      });

      return res.status(423).json({ 
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        retryAfter,
      });
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

      if (shouldLock) {
        return res.status(423).json({ 
          error: 'Too many failed attempts. Account locked for 15 minutes.',
          code: 'ACCOUNT_LOCKED',
          retryAfter: 15 * 60,
        });
      }

      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
        attemptsRemaining: 5 - newAttempts,
      });
    }

    // Check if MFA is required
    if (user.mfaEnabled) {
      if (!mfaToken) {
        return res.status(200).json({
          requiresMfa: true,
          mfaMethods: await MfaService.getUserMfaMethods(user.id),
        });
      }

      // Verify MFA token
      let mfaValid = false;
      
      // Try TOTP first
      if (mfaToken.length === 6 && /^\d+$/.test(mfaToken)) {
        mfaValid = await MfaService.verifyTotp(user.id, mfaToken);
        
        // If TOTP fails, try backup code
        if (!mfaValid) {
          mfaValid = await MfaService.verifyBackupCode(user.id, mfaToken);
        }
      } else {
        // Might be backup code format
        mfaValid = await MfaService.verifyBackupCode(user.id, mfaToken);
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

        return res.status(401).json({ 
          error: 'Invalid MFA token',
          code: 'INVALID_MFA',
          requiresMfa: true,
        });
      }
    }

    // Create session
    const tokenPair = await SessionService.createSession(
      user.id,
      ipAddress,
      userAgent,
      user.mfaEnabled ? 2 : 1
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

    // Reset rate limit on successful login
    await RateLimitService.resetRateLimit(ipAddress, 'login', email.toLowerCase());

    res.json({
      message: 'Login successful',
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        locale: user.locale,
        mfaEnabled: user.mfaEnabled,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = z.object({ 
      refreshToken: z.string() 
    }).parse(req.body);

    const tokenPair = await SessionService.refreshTokens(refreshToken);

    res.json({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors 
      });
    }

    if (error instanceof Error) {
      if (error.message.includes('reuse detected')) {
        return res.status(403).json({ 
          error: 'Token reuse detected',
          code: 'TOKEN_REUSE'
        });
      }
      
      if (error.message.includes('expired') || error.message.includes('Invalid')) {
        return res.status(401).json({ 
          error: 'Invalid refresh token',
          code: 'INVALID_TOKEN'
        });
      }
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/logout
 * Revoke current session
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const accessToken = authHeader.slice(7);
    const session = await SessionService.validateSession(accessToken);
    
    if (session) {
      await SessionService.revokeSession(session.sessionId, 'User logout');
    }

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/forgot-password
 * Send password reset token
 */
router.post('/forgot-password', rateLimitMiddleware('forgot-password'), async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const { ipAddress, userAgent } = getClientInfo(req);

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    // Always return success to prevent email enumeration
    const successResponse = {
      message: 'If an account with that email exists, we\'ve sent a password reset link.',
    };

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

    res.json({
      ...successResponse,
      // For development, include the token (remove in production)
      resetToken: process.env.NODE_ENV === 'development' ? resetToken.token : undefined,
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const { ipAddress, userAgent } = getClientInfo(req);

    // Verify token
    let payload;
    try {
      payload = TokenService.verifyPasswordResetToken(token);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
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
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
    }

    // Hash new password
    const passwordHash = await PasswordService.hashPassword(password);

    // Update password
    await db
      .update(users)
      .set({
        passwordHash,
        loginAttempts: 0, // Reset failed attempts
        lockedUntil: null, // Unlock account
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
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input',
        details: error.errors 
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;