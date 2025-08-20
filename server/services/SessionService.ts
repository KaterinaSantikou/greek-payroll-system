import { db } from '../db';
import { userSessions, users } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { TokenService, type AccessTokenPayload, type RefreshTokenPayload } from './TokenService';
import { AuditService } from './AuditService';
import crypto from 'crypto';

export interface SessionData {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  mfaLevel: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export class SessionService {
  private static readonly SESSION_EXPIRES_MINUTES = 90 * 24 * 60; // 90 days
  private static readonly ACCESS_TOKEN_EXPIRES_MINUTES = 15;

  /**
   * Create new user session with token rotation
   */
  static async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    mfaLevel: number = 1
  ): Promise<TokenPair> {
    const sessionId = TokenService.generateSessionId();
    const tokenFamily = TokenService.generateTokenFamily();
    const deviceFingerprint = TokenService.generateDeviceFingerprint(userAgent, ipAddress);
    
    const now = new Date();
    const sessionExpiresAt = new Date(now.getTime() + (this.SESSION_EXPIRES_MINUTES * 60 * 1000));
    const accessExpiresAt = new Date(now.getTime() + (this.ACCESS_TOKEN_EXPIRES_MINUTES * 60 * 1000));

    // Get user info for token
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw new Error('User not found');
    }

    // Generate tokens
    const accessToken = TokenService.generateAccessToken({
      sub: userId,
      email: user.email!,
      locale: user.locale || 'en',
      mfaLevel,
      sessionId,
    });

    const refreshToken = TokenService.generateRefreshToken({
      sub: userId,
      sessionId,
      tokenFamily,
    });

    // Store session using the existing schema
    await db.insert(userSessions).values({
      id: sessionId,
      userId,
      sessionToken: accessToken,
      refreshToken,
      expiresAt: sessionExpiresAt,
      refreshExpiresAt: sessionExpiresAt,
      ipAddress,
      userAgent,
      deviceFingerprint,
      lastActivityAt: now,
      isActive: true,
    });

    // Update user last login
    await db
      .update(users)
      .set({ lastLoginAt: now })
      .where(eq(users.id, userId));

    // Audit log
    await AuditService.logEvent({
      userId,
      sessionId,
      eventType: 'session_created',
      ipAddress,
      userAgent,
      result: 'success',
      metadata: {
        mfaLevel,
        deviceFingerprint,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: accessExpiresAt,
      refreshExpiresAt: sessionExpiresAt,
    };
  }

  /**
   * Refresh access token with rotation
   */
  static async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    let tokenPayload: RefreshTokenPayload;
    try {
      tokenPayload = TokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Find session using existing schema fields
    const [session] = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.id, tokenPayload.sessionId),
          eq(userSessions.userId, tokenPayload.sub),
          eq(userSessions.isActive, true)
        )
      );

    if (!session) {
      throw new Error('Session not found or revoked');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await this.revokeSession(session.id, 'Session expired');
      throw new Error('Session expired');
    }

    // Check for token reuse (security)
    if (session.refreshToken !== refreshToken) {
      // Potential token theft - revoke all sessions
      await this.revokeAllUserSessions(session.userId, 'Token reuse detected');
      await AuditService.logEvent({
        userId: session.userId,
        sessionId: session.id,
        eventType: 'suspicious_activity',
        ipAddress: session.ipAddress || '',
        result: 'blocked',
        reason: 'Refresh token reuse detected',
        severity: 'critical',
      });
      throw new Error('Token reuse detected');
    }

    // Get user info
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const newTokenFamily = TokenService.generateTokenFamily();
    const accessToken = TokenService.generateAccessToken({
      sub: session.userId,
      email: user.email!,
      locale: user.locale || 'en',
      mfaLevel: 1, // Default MFA level
      sessionId: session.id,
    });

    const newRefreshToken = TokenService.generateRefreshToken({
      sub: session.userId,
      sessionId: session.id,
      tokenFamily: newTokenFamily,
    });

    // Update session with new tokens
    const now = new Date();
    await db
      .update(userSessions)
      .set({
        sessionToken: accessToken,
        refreshToken: newRefreshToken,
        lastActivityAt: now,
      })
      .where(eq(userSessions.id, session.id));

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: new Date(now.getTime() + (this.ACCESS_TOKEN_EXPIRES_MINUTES * 60 * 1000)),
      refreshExpiresAt: session.expiresAt,
    };
  }

  /**
   * Validate access token and get session
   */
  static async validateSession(accessToken: string): Promise<SessionData | null> {
    try {
      const payload = TokenService.verifyAccessToken(accessToken);
      
      // Get session using existing schema
      const [session] = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.id, payload.sessionId),
            eq(userSessions.userId, payload.sub),
            eq(userSessions.isActive, true)
          )
        );

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      // Update last accessed
      await db
        .update(userSessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(userSessions.id, session.id));

      return {
        userId: session.userId,
        sessionId: session.id,
        ipAddress: session.ipAddress || '',
        userAgent: session.userAgent || '',
        deviceFingerprint: session.deviceFingerprint || '',
        mfaLevel: 1, // Default MFA level for existing sessions
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(sessionId: string, reason: string = 'User logout'): Promise<void> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, sessionId));

    if (session) {
      // Mark session as inactive
      await db
        .update(userSessions)
        .set({
          isActive: false,
        })
        .where(eq(userSessions.id, sessionId));

      // Audit log
      await AuditService.logEvent({
        userId: session.userId,
        sessionId: session.id,
        eventType: 'session_revoked',
        ipAddress: session.ipAddress || '',
        result: 'success',
        reason,
      });
    }
  }

  /**
   * Revoke all user sessions (security action)
   */
  static async revokeAllUserSessions(userId: string, reason: string = 'Security action'): Promise<void> {
    const sessions = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isActive, true)
        )
      );

    for (const session of sessions) {
      await this.revokeSession(session.id, reason);
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanup(): Promise<{ expiredSessions: number; expiredTokens: number }> {
    const now = new Date();

    // Remove expired sessions
    const expiredSessions = await db
      .delete(userSessions)
      .where(lt(userSessions.expiresAt, now));

    return {
      expiredSessions: Array.isArray(expiredSessions) ? expiredSessions.length : 0,
      expiredTokens: 0, // No separate token blacklist with existing schema
    };
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string) {
    return db
      .select({
        sessionId: userSessions.id,
        ipAddress: userSessions.ipAddress,
        userAgent: userSessions.userAgent,
        mfaLevel: userSessions.id, // Placeholder - all sessions have MFA level 1
        createdAt: userSessions.createdAt,
        lastAccessedAt: userSessions.lastActivityAt,
        expiresAt: userSessions.expiresAt,
        revoked: userSessions.isActive, // Will be inverted in the response
      })
      .from(userSessions)
      .where(eq(userSessions.userId, userId));
  }

  /**
   * Elevate session MFA level (placeholder for existing schema)
   */
  static async elevateMfaLevel(sessionId: string, newLevel: number): Promise<void> {
    await db
      .update(userSessions)
      .set({ 
        lastActivityAt: new Date()
      })
      .where(eq(userSessions.id, sessionId));
  }
}