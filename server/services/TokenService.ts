import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface AccessTokenPayload {
  sub: string; // user ID
  email: string;
  locale: string;
  mfaLevel: number; // 0=none, 1=first_factor, 2=second_factor
  sessionId: string;
  iat: number;
  exp: number;
  jti: string; // JWT ID for tracking/revocation
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  tokenFamily: string; // For rotation tracking
  iat: number;
  exp: number;
  jti: string;
}

export class TokenService {
  private static readonly ACCESS_TOKEN_EXPIRES = 15 * 60; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRES = 90 * 24 * 60 * 60; // 90 days
  
  private static get JWT_SECRET(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  /**
   * Generate access token (short-lived JWT)
   */
  static generateAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp' | 'jti'>): string {
    const jti = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const fullPayload: AccessTokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.ACCESS_TOKEN_EXPIRES,
      jti,
    };

    return jwt.sign(fullPayload, this.JWT_SECRET, {
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token (opaque, long-lived)
   */
  static generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp' | 'jti'>): string {
    const jti = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const fullPayload: RefreshTokenPayload = {
      ...payload,
      iat: now,
      exp: now + this.REFRESH_TOKEN_EXPIRES,
      jti,
    };

    return jwt.sign(fullPayload, this.JWT_SECRET, {
      algorithm: 'HS256',
    });
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as AccessTokenPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * Verify and decode refresh token
   */
  static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as RefreshTokenPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Generate signed token for email verification/password reset
   */
  static generateSignedToken(payload: any, expiresInMinutes: number = 15): string {
    const exp = Math.floor(Date.now() / 1000) + (expiresInMinutes * 60);
    const jti = crypto.randomUUID();

    return jwt.sign(
      { ...payload, exp, jti },
      this.JWT_SECRET,
      { algorithm: 'HS256' }
    );
  }

  /**
   * Verify signed token
   */
  static verifySignedToken<T = any>(token: string): T & { exp: number; jti: string } {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as T & { exp: number; jti: string };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract JWT ID from token without verification (for blacklisting)
   */
  static extractJTI(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.jti || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate device fingerprint
   */
  static generateDeviceFingerprint(userAgent: string, ipAddress: string, additionalData?: any): string {
    const data = {
      userAgent,
      ipAddress,
      ...additionalData,
      timestamp: Math.floor(Date.now() / 1000 / 3600) // Round to hour for stability
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('base64url');
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate token family for refresh token rotation
   */
  static generateTokenFamily(): string {
    return crypto.randomUUID();
  }
}