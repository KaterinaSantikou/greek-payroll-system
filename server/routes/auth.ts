import express from 'express';
import { AuthService } from '../services/authService';
import { 
  extractClientInfo, 
  requireAuth, 
  requireEmailVerification, 
  authRateLimit, 
  auditLog 
} from '../middleware/authMiddleware';
import { EmailService } from '../services/emailService';

const router = express.Router();

// Apply client info extraction to all routes
router.use(extractClientInfo);

/**
 * Sign up with email and password
 */
router.post('/signup', 
  authRateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  auditLog('signup'),
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, locale } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
          code: 'MISSING_FIELDS'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        });
      }

      const { user, verificationToken } = await AuthService.signUpWithEmail({
        email,
        password,
        firstName,
        lastName,
        locale: locale || 'en',
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(user.email, verificationToken, user.locale || 'en');
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail the signup if email sending fails
      }

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          locale: user.locale,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Signup failed',
        code: 'SIGNUP_FAILED'
      });
    }
  }
);

/**
 * Resend verification email
 */
router.post('/resend-verification',
  auditLog('resend_verification'),
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        });
      }

      const result = await AuthService.resendVerificationEmail(email);
      
      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: 'RESEND_FAILED'
        });
      }

      res.json({ 
        success: true,
        message: 'Verification email resent successfully',
        email: email 
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to resend verification email',
        code: 'RESEND_ERROR'
      });
    }
  }
);

/**
 * Verify email
 */
router.post('/verify-email',
  auditLog('email_verification'),
  async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Verification token is required',
          code: 'MISSING_TOKEN'
        });
      }

      const user = await AuthService.verifyEmail(token);

      res.json({
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          locale: user.locale,
        },
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Email verification failed',
        code: 'VERIFICATION_FAILED'
      });
    }
  }
);

/**
 * Login with email and password
 */
router.post('/login',
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  auditLog('login'),
  async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      const deviceFingerprint = req.headers['x-device-fingerprint'] as string;

      const { user, session } = await AuthService.loginWithPassword({
        email,
        password,
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
        deviceFingerprint,
      });

      // Set session cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 24 hours
      };

      res.cookie('sessionToken', session.sessionToken, cookieOptions);
      res.cookie('refreshToken', session.refreshToken, cookieOptions);

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          locale: user.locale,
          mfaEnabled: user.mfaEnabled,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
        requiresMfa: user.mfaEnabled,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Login failed',
        code: 'LOGIN_FAILED'
      });
    }
  }
);

/**
 * Refresh session token
 */
router.post('/refresh',
  auditLog('token_refresh'),
  async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      const session = await AuthService.refreshSession(refreshToken);

      // Update cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      res.cookie('sessionToken', session.sessionToken, cookieOptions);
      res.cookie('refreshToken', session.refreshToken, cookieOptions);

      res.json({
        success: true,
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        error: error instanceof Error ? error.message : 'Token refresh failed',
        code: 'REFRESH_FAILED'
      });
    }
  }
);

/**
 * Logout
 */
router.post('/logout',
  requireAuth,
  auditLog('logout'),
  async (req, res) => {
    try {
      if (req.userSession) {
        await AuthService.logout(req.userSession.sessionToken);
      }

      // Clear cookies
      res.clearCookie('sessionToken');
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        code: 'LOGOUT_FAILED'
      });
    }
  }
);

/**
 * Request password reset
 */
router.post('/forgot-password',
  authRateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  auditLog('password_reset_request'),
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        });
      }

      try {
        const token = await AuthService.generatePasswordResetToken(email);
        await EmailService.sendPasswordResetEmail(email, token);
      } catch (error) {
        // Don't reveal if email exists or not for security
        console.error('Password reset error:', error);
      }

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link.',
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        error: 'Password reset request failed',
        code: 'RESET_REQUEST_FAILED'
      });
    }
  }
);

/**
 * Reset password with token
 */
router.post('/reset-password',
  auditLog('password_reset'),
  async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          error: 'Token and password are required',
          code: 'MISSING_FIELDS'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD'
        });
      }

      await AuthService.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Password reset failed',
        code: 'RESET_FAILED'
      });
    }
  }
);

/**
 * Generate magic link for passwordless login
 */
router.post('/magic-link',
  authRateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  auditLog('magic_link_request'),
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        });
      }

      const token = await AuthService.generateMagicLink({
        email,
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
      });

      await EmailService.sendMagicLinkEmail(email, token);

      res.json({
        success: true,
        message: 'Magic link sent to your email',
      });
    } catch (error) {
      console.error('Magic link error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Magic link generation failed',
        code: 'MAGIC_LINK_FAILED'
      });
    }
  }
);

/**
 * Login with magic link
 */
router.post('/magic-link/verify',
  auditLog('magic_link_login'),
  async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Magic link token is required',
          code: 'MISSING_TOKEN'
        });
      }

      const deviceFingerprint = req.headers['x-device-fingerprint'] as string;

      const { user, session, isNewUser } = await AuthService.loginWithMagicLink({
        token,
        ipAddress: req.ipAddress,
        userAgent: req.userAgent,
        deviceFingerprint,
      });

      // Set session cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      };

      res.cookie('sessionToken', session.sessionToken, cookieOptions);
      res.cookie('refreshToken', session.refreshToken, cookieOptions);

      res.json({
        success: true,
        message: isNewUser ? 'Account created and login successful' : 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          locale: user.locale,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
        isNewUser,
      });
    } catch (error) {
      console.error('Magic link login error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Magic link login failed',
        code: 'MAGIC_LOGIN_FAILED'
      });
    }
  }
);

/**
 * Get current user
 */
router.get('/me',
  requireAuth,
  async (req, res) => {
    try {
      res.json({
        success: true,
        user: {
          id: (req.user as any)!.id,
          email: (req.user as any)!.email,
          firstName: (req.user as any)!.firstName,
          lastName: (req.user as any)!.lastName,
          emailVerified: (req.user as any)!.emailVerified,
          locale: (req.user as any)!.locale,
          mfaEnabled: (req.user as any)!.mfaEnabled,
          lastLoginAt: (req.user as any)!.lastLoginAt,
          createdAt: (req.user as any)!.createdAt,
        },
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: 'Failed to get user',
        code: 'USER_FETCH_FAILED'
      });
    }
  }
);

/**
 * Get user sessions
 */
router.get('/sessions',
  requireAuth,
  async (req, res) => {
    try {
      const sessions = await AuthService.getUserSessions((req.user as any)!.id);

      res.json({
        success: true,
        sessions: sessions.map(session => ({
          id: session.id,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          lastActivityAt: session.lastActivityAt,
          expiresAt: session.expiresAt,
          isCurrentSession: session.id === req.userSession?.id,
        })),
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        error: 'Failed to get sessions',
        code: 'SESSIONS_FETCH_FAILED'
      });
    }
  }
);

/**
 * Revoke session
 */
router.delete('/sessions/:sessionId',
  requireAuth,
  auditLog('session_revoke'),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      await AuthService.revokeSession(sessionId, (req.user as any)!.id);

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        error: 'Failed to revoke session',
        code: 'SESSION_REVOKE_FAILED'
      });
    }
  }
);

export default router;