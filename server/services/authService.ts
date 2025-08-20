import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { eq, and, gt, lt } from 'drizzle-orm';
import { db } from '../db';
import {
  users,
  userSessions,
  emailVerificationTokens,
  passwordResetTokens,
  magicLinkTokens,
  authAuditLogs,
  mfaTotpSecrets,
  webauthnCredentials,
  type User,
  type InsertUser,
  type UserSession,
  type InsertUserSession,
  type InsertAuthAuditLog,
} from '@shared/schema';

export interface AuthConfig {
  jwtSecret: string;
  bcryptRounds: number;
  sessionDuration: number; // in seconds
  refreshTokenDuration: number; // in seconds
  emailTokenDuration: number; // in seconds
  passwordResetTokenDuration: number; // in seconds
  magicLinkTokenDuration: number; // in seconds
  maxLoginAttempts: number;
  lockoutDuration: number; // in seconds
}

export class AuthService {
  private static readonly config: AuthConfig = {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    bcryptRounds: 12,
    sessionDuration: 24 * 60 * 60, // 24 hours
    refreshTokenDuration: 30 * 24 * 60 * 60, // 30 days
    emailTokenDuration: 24 * 60 * 60, // 24 hours
    passwordResetTokenDuration: 60 * 60, // 1 hour
    magicLinkTokenDuration: 15 * 60, // 15 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60, // 30 minutes
  };

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Sign up a new user with email and password
   */
  static async signUpWithEmail(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    locale?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ user: User; verificationToken: string }> {
    const { email, password, firstName, lastName, locale = 'en', ipAddress, userAgent } = data;

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      await this.logAuthEvent({
        userId: existingUser[0].id,
        action: 'signup',
        method: 'password',
        result: 'failure',
        ipAddress,
        userAgent,
        metadata: { reason: 'email_already_exists' },
      });
      throw new Error('User with this email already exists');
    }

    // Hash the password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      firstName,
      lastName,
      locale,
      emailVerified: false,
    }).returning();

    // Generate email verification token
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.config.emailTokenDuration * 1000);

    await db.insert(emailVerificationTokens).values({
      userId: user.id,
      email,
      token,
      expiresAt,
    });

    // Log the signup
    await this.logAuthEvent({
      userId: user.id,
      action: 'signup',
      method: 'password',
      result: 'success',
      ipAddress,
      userAgent,
    });

    return { user, verificationToken: token };
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<User> {
    const [verificationRecord] = await db
      .select()
      .from(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.token, token),
        gt(emailVerificationTokens.expiresAt, new Date())
      ));

    if (!verificationRecord) {
      throw new Error('Invalid or expired verification token');
    }

    // Update user as verified
    const [user] = await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, verificationRecord.userId!))
      .returning();

    // Delete the verification token
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.id, verificationRecord.id));

    // Log the verification
    await this.logAuthEvent({
      userId: user.id,
      action: 'email_verified',
      method: 'email_token',
      result: 'success',
    });

    return user;
  }

  /**
   * Login with email and password
   */
  static async loginWithPassword(data: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }): Promise<{ user: User; session: UserSession }> {
    const { email, password, ipAddress, userAgent, deviceFingerprint } = data;

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      await this.logAuthEvent({
        action: 'login',
        method: 'password',
        result: 'failure',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'user_not_found' },
      });
      throw new Error('Invalid credentials');
    }

    // Check if user is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.logAuthEvent({
        userId: user.id,
        action: 'login',
        method: 'password',
        result: 'blocked',
        ipAddress,
        userAgent,
        metadata: { reason: 'account_locked' },
      });
      throw new Error('Account is locked. Please try again later.');
    }

    // Verify password
    if (!user.passwordHash || !(await this.verifyPassword(password, user.passwordHash))) {
      // Increment login attempts
      const newLoginAttempts = (user.loginAttempts || 0) + 1;
      const shouldLock = newLoginAttempts >= this.config.maxLoginAttempts;
      
      await db.update(users).set({
        loginAttempts: newLoginAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + this.config.lockoutDuration * 1000) : null,
        updatedAt: new Date(),
      }).where(eq(users.id, user.id));

      await this.logAuthEvent({
        userId: user.id,
        action: 'login',
        method: 'password',
        result: 'failure',
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_password', loginAttempts: newLoginAttempts, locked: shouldLock },
      });

      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      await this.logAuthEvent({
        userId: user.id,
        action: 'login',
        method: 'password',
        result: 'blocked',
        ipAddress,
        userAgent,
        metadata: { reason: 'account_inactive' },
      });
      throw new Error('Account is inactive');
    }

    // Reset login attempts on successful login
    await db.update(users).set({
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    // Create session
    const session = await this.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
      deviceFingerprint,
    });

    // Log successful login
    await this.logAuthEvent({
      userId: user.id,
      sessionId: session.id,
      action: 'login',
      method: 'password',
      result: 'success',
      ipAddress,
      userAgent,
    });

    return { user, session };
  }

  /**
   * Create a new session
   */
  static async createSession(data: {
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }): Promise<UserSession> {
    const sessionToken = this.generateSecureToken();
    const refreshToken = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.config.sessionDuration * 1000);
    const refreshExpiresAt = new Date(Date.now() + this.config.refreshTokenDuration * 1000);

    const [session] = await db.insert(userSessions).values({
      userId: data.userId,
      sessionToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      deviceFingerprint: data.deviceFingerprint,
      isActive: true,
    }).returning();

    return session;
  }

  /**
   * Validate session token
   */
  static async validateSession(sessionToken: string): Promise<{ user: User; session: UserSession } | null> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.sessionToken, sessionToken),
        eq(userSessions.isActive, true),
        gt(userSessions.expiresAt, new Date())
      ));

    if (!session) {
      return null;
    }

    const userList = await db.select().from(users).where(eq(users.id, session.userId!));
    const user = userList[0];
    if (!user || !user.isActive) {
      return null;
    }

    // Update last activity
    await db.update(userSessions).set({
      lastActivityAt: new Date(),
    }).where(eq(userSessions.id, session.id));

    return { user, session };
  }

  /**
   * Refresh session with refresh token
   */
  static async refreshSession(refreshToken: string): Promise<UserSession> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.refreshToken, refreshToken),
        eq(userSessions.isActive, true),
        gt(userSessions.refreshExpiresAt, new Date())
      ));

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const newSessionToken = this.generateSecureToken();
    const newRefreshToken = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.config.sessionDuration * 1000);
    const refreshExpiresAt = new Date(Date.now() + this.config.refreshTokenDuration * 1000);

    const [updatedSession] = await db.update(userSessions).set({
      sessionToken: newSessionToken,
      refreshToken: newRefreshToken,
      expiresAt,
      refreshExpiresAt,
      lastActivityAt: new Date(),
    }).where(eq(userSessions.id, session.id)).returning();

    return updatedSession;
  }

  /**
   * Logout user (invalidate session)
   */
  static async logout(sessionToken: string): Promise<void> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));

    if (session) {
      await db.update(userSessions).set({
        isActive: false,
      }).where(eq(userSessions.id, session.id));

      await this.logAuthEvent({
        userId: session.userId,
        sessionId: session.id,
        action: 'logout',
        result: 'success',
      });
    }
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(email: string): Promise<string> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      throw new Error('User not found');
    }

    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.config.passwordResetTokenDuration * 1000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    await this.logAuthEvent({
      userId: user.id,
      action: 'password_reset_requested',
      result: 'success',
      metadata: { email },
    });

    return token;
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date())
      ));

    if (!resetRecord) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(newPassword);

    // Update password
    await db.update(users).set({
      passwordHash,
      loginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    }).where(eq(users.id, resetRecord.userId!));

    // Mark token as used
    await db.update(passwordResetTokens).set({
      used: true,
    }).where(eq(passwordResetTokens.id, resetRecord.id));

    // Invalidate all active sessions
    await db.update(userSessions).set({
      isActive: false,
    }).where(eq(userSessions.userId, resetRecord.userId!));

    await this.logAuthEvent({
      userId: resetRecord.userId!,
      action: 'password_reset_completed',
      result: 'success',
    });
  }

  /**
   * Generate magic link token
   */
  static async generateMagicLink(data: {
    email: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<string> {
    const { email, ipAddress, userAgent } = data;
    
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.config.magicLinkTokenDuration * 1000);

    await db.insert(magicLinkTokens).values({
      email,
      token,
      expiresAt,
      used: false,
      ipAddress,
      userAgent,
    });

    await this.logAuthEvent({
      action: 'magic_link_requested',
      result: 'success',
      ipAddress,
      userAgent,
      metadata: { email },
    });

    return token;
  }

  /**
   * Login with magic link
   */
  static async loginWithMagicLink(data: {
    token: string;
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
  }): Promise<{ user: User; session: UserSession; isNewUser?: boolean }> {
    const { token, ipAddress, userAgent, deviceFingerprint } = data;

    const [magicLinkRecord] = await db
      .select()
      .from(magicLinkTokens)
      .where(and(
        eq(magicLinkTokens.token, token),
        eq(magicLinkTokens.used, false),
        gt(magicLinkTokens.expiresAt, new Date())
      ));

    if (!magicLinkRecord) {
      await this.logAuthEvent({
        action: 'login',
        method: 'magic_link',
        result: 'failure',
        ipAddress,
        userAgent,
        metadata: { reason: 'invalid_token' },
      });
      throw new Error('Invalid or expired magic link');
    }

    // Mark token as used
    await db.update(magicLinkTokens).set({
      used: true,
    }).where(eq(magicLinkTokens.id, magicLinkRecord.id));

    // Find or create user
    let user = await db.select().from(users).where(eq(users.email, magicLinkRecord.email));
    let isNewUser = false;

    if (user.length === 0) {
      // Create new user
      const [newUser] = await db.insert(users).values({
        email: magicLinkRecord.email,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      }).returning();
      
      user = [newUser];
      isNewUser = true;
    } else {
      // Update existing user
      await db.update(users).set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(users.id, user[0].id));
    }

    // Create session
    const session = await this.createSession({
      userId: user[0].id,
      ipAddress,
      userAgent,
      deviceFingerprint,
    });

    await this.logAuthEvent({
      userId: user[0].id,
      sessionId: session.id,
      action: 'login',
      method: 'magic_link',
      result: 'success',
      ipAddress,
      userAgent,
      metadata: { isNewUser },
    });

    return { user: user[0], session, isNewUser };
  }

  /**
   * Log authentication event for audit
   */
  static async logAuthEvent(data: Omit<InsertAuthAuditLog, 'id'>): Promise<void> {
    try {
      await db.insert(authAuditLogs).values({
        userId: data.userId,
        sessionId: data.sessionId,
        action: data.action,
        method: data.method,
        result: data.result,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
        riskScore: data.riskScore,
      });
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string): Promise<UserSession[]> {
    return db.select().from(userSessions)
      .where(and(
        eq(userSessions.userId, userId),
        eq(userSessions.isActive, true),
        gt(userSessions.expiresAt, new Date())
      ))
      .orderBy(userSessions.lastActivityAt);
  }

  /**
   * Revoke session
   */
  static async revokeSession(sessionId: string, currentUserId: string): Promise<void> {
    const [session] = await db.select().from(userSessions)
      .where(and(
        eq(userSessions.id, sessionId),
        eq(userSessions.userId, currentUserId)
      ));

    if (session) {
      await db.update(userSessions).set({
        isActive: false,
      }).where(eq(userSessions.id, sessionId));

      await this.logAuthEvent({
        userId: currentUserId,
        sessionId: sessionId,
        action: 'session_revoked',
        result: 'success',
      });
    }
  }
}