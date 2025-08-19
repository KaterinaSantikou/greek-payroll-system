import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { partners, accessTokens, idempotencyKeys, auditLogs } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

/**
 * OAuth2 Authentication Service for Embedded Payroll API
 * Implements client credentials flow with scoped access
 */
export class OAuth2Service {
  private static readonly ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
  private static readonly REFRESH_TOKEN_EXPIRY = 86400 * 30; // 30 days
  private static readonly JWT_SECRET = process.env.JWT_SECRET || "embedded-payroll-secret";

  /**
   * Generate OAuth2 access token for partner
   */
  static async generateAccessToken(
    clientId: string,
    clientSecret: string,
    scopes: string[]
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }> {
    // Verify client credentials
    const [partner] = await db
      .select()
      .from(partners)
      .where(and(
        eq(partners.clientId, clientId),
        eq(partners.clientSecret, clientSecret),
        eq(partners.status, "active")
      ));

    if (!partner) {
      throw new Error("Invalid client credentials");
    }

    // Validate requested scopes
    const allowedScopes = partner.scopes as string[];
    const invalidScopes = scopes.filter(scope => !allowedScopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new Error(`Invalid scopes: ${invalidScopes.join(", ")}`);
    }

    // Generate tokens
    const accessToken = crypto.randomBytes(32).toString("hex");
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + this.ACCESS_TOKEN_EXPIRY * 1000);

    // Store in database
    await db.insert(accessTokens).values({
      partnerId: partner.id,
      accessToken: crypto.createHash("sha256").update(accessToken).digest("hex"),
      refreshToken: crypto.createHash("sha256").update(refreshToken).digest("hex"),
      tokenType: "Bearer",
      scopes,
      expiresAt,
    });

    // Log access token generation
    await this.createAuditLog(partner.id, "access_token", "generated", {
      scopes,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.ACCESS_TOKEN_EXPIRY,
      token_type: "Bearer",
      scope: scopes.join(" "),
    };
  }

  /**
   * Validate OAuth2 access token
   */
  static async validateAccessToken(token: string): Promise<{
    partnerId: string;
    scopes: string[];
  } | null> {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const [tokenRecord] = await db
      .select({
        partnerId: accessTokens.partnerId,
        scopes: accessTokens.scopes,
        expiresAt: accessTokens.expiresAt,
      })
      .from(accessTokens)
      .where(and(
        eq(accessTokens.accessToken, hashedToken),
        gt(accessTokens.expiresAt, new Date())
      ));

    if (!tokenRecord) {
      return null;
    }

    return {
      partnerId: tokenRecord.partnerId,
      scopes: tokenRecord.scopes as string[],
    };
  }

  /**
   * Generate short-lived JWT for embedded sessions
   */
  static async generateEmbedToken(
    partnerId: string,
    employeeId: string | null,
    allowedRoutes: string[],
    originDomain: string,
    expiresInMinutes: number = 10
  ): Promise<string> {
    const payload = {
      partnerId,
      employeeId,
      allowedRoutes,
      originDomain,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
    };

    const token = jwt.sign(payload, this.JWT_SECRET, { algorithm: "HS256" });

    // Store session for tracking
    // Note: embeddedSessions table insert would go here

    return token;
  }

  /**
   * Validate JWT embed token
   */
  static validateEmbedToken(token: string): {
    partnerId: string;
    employeeId: string | null;
    allowedRoutes: string[];
    originDomain: string;
  } | null {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as any;
      return {
        partnerId: payload.partnerId,
        employeeId: payload.employeeId,
        allowedRoutes: payload.allowedRoutes,
        originDomain: payload.originDomain,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if request has required scope
   */
  static hasScope(userScopes: string[], requiredScope: string): boolean {
    return userScopes.includes(requiredScope) || userScopes.includes("*");
  }

  /**
   * Create audit log entry
   */
  private static async createAuditLog(
    partnerId: string,
    eventType: string,
    action: string,
    payload: any,
    resourceId?: string
  ): Promise<void> {
    // Get last audit log for sequence number
    const [lastLog] = await db
      .select({ sequenceNumber: auditLogs.sequenceNumber, currentHash: auditLogs.currentHash })
      .from(auditLogs)
      .where(eq(auditLogs.partnerId, partnerId))
      .orderBy(auditLogs.sequenceNumber)
      .limit(1);

    const sequenceNumber = (lastLog?.sequenceNumber || 0) + 1;
    const previousHash = lastLog?.currentHash || null;
    
    // Create hash chain
    const hashData = JSON.stringify({
      partnerId,
      sequenceNumber,
      previousHash,
      eventType,
      action,
      resourceId,
      payload,
      timestamp: new Date().toISOString(),
    });
    const currentHash = crypto.createHash("sha256").update(hashData).digest("hex");

    await db.insert(auditLogs).values({
      partnerId,
      sequenceNumber,
      previousHash,
      currentHash,
      eventType,
      resourceId,
      action,
      payload: JSON.stringify(payload),
    });
  }
}

/**
 * Express middleware for OAuth2 authentication
 */
export function requireAuth(requiredScope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    const auth = await OAuth2Service.validateAccessToken(token);

    if (!auth) {
      return res.status(401).json({ error: "Invalid or expired access token" });
    }

    // Check scope if required
    if (requiredScope && !OAuth2Service.hasScope(auth.scopes, requiredScope)) {
      return res.status(403).json({ error: `Insufficient scope. Required: ${requiredScope}` });
    }

    // Add auth info to request
    (req as any).auth = auth;
    next();
  };
}

/**
 * Express middleware for JWT embed token validation
 */
export function requireEmbedAuth(allowedRoute?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers["x-embed-token"] as string;
    if (!token) {
      return res.status(401).json({ error: "Missing embed token" });
    }

    const auth = OAuth2Service.validateEmbedToken(token);
    if (!auth) {
      return res.status(401).json({ error: "Invalid or expired embed token" });
    }

    // Check allowed routes
    if (allowedRoute && !auth.allowedRoutes.includes(allowedRoute) && !auth.allowedRoutes.includes("*")) {
      return res.status(403).json({ error: `Route not allowed: ${allowedRoute}` });
    }

    // Verify origin
    const origin = req.headers.origin;
    if (origin && !auth.originDomain.includes(origin)) {
      return res.status(403).json({ error: "Invalid origin domain" });
    }

    // Add auth info to request
    (req as any).embedAuth = auth;
    next();
  };
}

/**
 * Idempotency middleware
 */
export function requireIdempotency() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const idempotencyKey = req.headers["idempotency-key"] as string;
    if (!idempotencyKey) {
      return res.status(400).json({ error: "Missing Idempotency-Key header" });
    }

    const auth = (req as any).auth;
    if (!auth) {
      return res.status(401).json({ error: "Authentication required for idempotency" });
    }

    // Create payload hash
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(req.body))
      .digest("hex");

    // Check if this exact request was already processed
    const [existing] = await db
      .select()
      .from(idempotencyKeys)
      .where(and(
        eq(idempotencyKeys.idempotencyKey, idempotencyKey),
        eq(idempotencyKeys.partnerId, auth.partnerId),
        eq(idempotencyKeys.endpoint, req.path)
      ));

    if (existing) {
      // If payload matches, return cached response
      if (existing.payloadHash === payloadHash) {
        return res.status(existing.responseStatus || 200).json(
          existing.responseData ? JSON.parse(existing.responseData as string) : {}
        );
      } else {
        // Same key, different payload - conflict
        return res.status(409).json({ 
          error: "Idempotency key conflict. Same key used with different payload." 
        });
      }
    }

    // Store idempotency key info for response caching
    (req as any).idempotency = {
      key: idempotencyKey,
      partnerId: auth.partnerId,
      endpoint: req.path,
      method: req.method,
      payloadHash,
    };

    next();
  };
}