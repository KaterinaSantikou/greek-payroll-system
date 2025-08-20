/**
 * On-Behalf-Of (OBO) Service - Manages delegation tokens for multi-tenant operations
 */

import crypto from 'crypto';
import { db } from '../db';
import { 
  oboTokens, 
  partnerMembers, 
  clientAccessGrants, 
  partnerFirms,
  users,
  type OboToken,
  type InsertOboToken
} from '@shared/schema';
import { eq, and, lt, gt } from 'drizzle-orm';

export interface OboTokenRequest {
  userId: string;
  partnerFirmId: string;
  asTenantId: string;
  scopes: string[];
  permissions?: any;
  allowedActions?: string[];
  restrictedActions?: string[];
  expiresInMinutes?: number;
  maxUsage?: number;
  issuedFor?: string;
  sessionId?: string;
  requestId?: string;
}

export interface OboTokenResponse {
  token: string;
  tokenId: string;
  expiresAt: Date;
  scopes: string[];
  asTenantId: string;
}

export interface OboContext {
  obo: boolean;
  actorUserId: string;
  targetUserId?: string;
  partnerFirmId: string;
  asTenantId: string;
  scopes: string[];
  tokenId: string;
}

export class OboService {
  private static readonly TOKEN_PREFIX = 'obo_';
  private static readonly DEFAULT_EXPIRY_MINUTES = 10;
  private static readonly MAX_EXPIRY_MINUTES = 10; // Security: TTL ≤ 10 min
  private static readonly MIN_EXPIRY_MINUTES = 5;

  /**
   * Generate a secure OBO token
   */
  private static generateToken(): string {
    const randomBytes = crypto.randomBytes(32);
    const token = this.TOKEN_PREFIX + randomBytes.toString('base64url');
    return token;
  }

  /**
   * Hash token for secure storage
   */
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate that the user can create OBO tokens for the specified tenant
   */
  static async validateOboRequest(request: OboTokenRequest): Promise<void> {
    // Check if user is a member of the partner firm
    const [memberRecord] = await db
      .select()
      .from(partnerMembers)
      .where(
        and(
          eq(partnerMembers.userId, request.userId),
          eq(partnerMembers.partnerFirmId, request.partnerFirmId),
          eq(partnerMembers.isActive, true)
        )
      );

    if (!memberRecord) {
      throw new Error('User is not an active member of the specified partner firm');
    }

    // Check if the partner firm has access to the client tenant
    const [accessGrant] = await db
      .select()
      .from(clientAccessGrants)
      .where(
        and(
          eq(clientAccessGrants.partnerFirmId, request.partnerFirmId),
          eq(clientAccessGrants.clientTenantId, request.asTenantId),
          eq(clientAccessGrants.isActive, true),
          gt(clientAccessGrants.validUntil, new Date())
        )
      );

    if (!accessGrant) {
      throw new Error('Partner firm does not have active access to the specified client tenant');
    }

    // Validate requested scopes against granted scopes
    const grantedScopes = accessGrant.grantedScopes as string[];
    const invalidScopes = request.scopes.filter(scope => !grantedScopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new Error(`Requested scopes not granted: ${invalidScopes.join(', ')}`);
    }

    // Check for restricted actions
    const restrictedActions = accessGrant.restrictedActions as string[] || [];
    const requestedActions = request.allowedActions || [];
    const forbiddenActions = requestedActions.filter(action => restrictedActions.includes(action));
    if (forbiddenActions.length > 0) {
      throw new Error(`Requested actions are restricted: ${forbiddenActions.join(', ')}`);
    }
  }

  /**
   * Create a new OBO token
   */
  static async createOboToken(request: OboTokenRequest): Promise<OboTokenResponse> {
    // Validate the request
    await this.validateOboRequest(request);

    // Determine expiry
    const expiryMinutes = Math.min(
      Math.max(request.expiresInMinutes || this.DEFAULT_EXPIRY_MINUTES, this.MIN_EXPIRY_MINUTES),
      this.MAX_EXPIRY_MINUTES
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Generate token
    const token = this.generateToken();
    const tokenHash = this.hashToken(token);

    // Create OBO context
    const oboContext = {
      obo: true,
      actorUserId: request.userId,
      partnerFirmId: request.partnerFirmId,
      asTenantId: request.asTenantId,
      scopes: request.scopes,
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store token in database
    const [tokenRecord] = await db
      .insert(oboTokens)
      .values({
        tokenHash,
        userId: request.userId,
        partnerFirmId: request.partnerFirmId,
        asTenantId: request.asTenantId,
        scopes: request.scopes,
        permissions: request.permissions || {},
        oboContext,
        allowedActions: request.allowedActions || [],
        restrictedActions: request.restrictedActions || [],
        expiresAt,
        maxUsage: request.maxUsage,
        issuedBy: request.userId,
        issuedFor: request.issuedFor,
        sessionId: request.sessionId,
        requestId: request.requestId,
      })
      .returning();

    return {
      token,
      tokenId: tokenRecord.id,
      expiresAt,
      scopes: request.scopes,
      asTenantId: request.asTenantId,
    };
  }

  /**
   * Validate and decode an OBO token
   */
  static async validateOboToken(token: string): Promise<OboContext> {
    if (!token.startsWith(this.TOKEN_PREFIX)) {
      throw new Error('Invalid token format');
    }

    const tokenHash = this.hashToken(token);

    // Find token in database
    const [tokenRecord] = await db
      .select({
        id: oboTokens.id,
        userId: oboTokens.userId,
        partnerFirmId: oboTokens.partnerFirmId,
        asTenantId: oboTokens.asTenantId,
        scopes: oboTokens.scopes,
        permissions: oboTokens.permissions,
        oboContext: oboTokens.oboContext,
        allowedActions: oboTokens.allowedActions,
        restrictedActions: oboTokens.restrictedActions,
        expiresAt: oboTokens.expiresAt,
        isActive: oboTokens.isActive,
        usageCount: oboTokens.usageCount,
        maxUsage: oboTokens.maxUsage,
        revokedAt: oboTokens.revokedAt,
      })
      .from(oboTokens)
      .where(eq(oboTokens.tokenHash, tokenHash));

    if (!tokenRecord) {
      throw new Error('Invalid token');
    }

    // Check if token is active
    if (!tokenRecord.isActive || tokenRecord.revokedAt) {
      throw new Error('Token has been revoked');
    }

    // Check expiration
    if (tokenRecord.expiresAt <= new Date()) {
      throw new Error('Token has expired');
    }

    // Check usage limit
    if (tokenRecord.maxUsage && (tokenRecord.usageCount || 0) >= tokenRecord.maxUsage) {
      throw new Error('Token usage limit exceeded');
    }

    // Update usage count
    await db
      .update(oboTokens)
      .set({
        usageCount: (tokenRecord.usageCount || 0) + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(oboTokens.id, tokenRecord.id));

    return {
      obo: true,
      actorUserId: tokenRecord.userId,
      partnerFirmId: tokenRecord.partnerFirmId || '',
      asTenantId: tokenRecord.asTenantId,
      scopes: tokenRecord.scopes as string[],
      tokenId: tokenRecord.id,
    };
  }

  /**
   * Revoke an OBO token
   */
  static async revokeOboToken(
    tokenId: string, 
    revokedBy: string, 
    reason?: string
  ): Promise<void> {
    await db
      .update(oboTokens)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revocationReason: reason,
      })
      .where(eq(oboTokens.id, tokenId));
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(
    userId: string,
    revokedBy: string,
    reason?: string
  ): Promise<void> {
    await db
      .update(oboTokens)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
        revocationReason: reason,
      })
      .where(
        and(
          eq(oboTokens.userId, userId),
          eq(oboTokens.isActive, true)
        )
      );
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await db
      .update(oboTokens)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revocationReason: 'Expired',
      })
      .where(
        and(
          lt(oboTokens.expiresAt, new Date()),
          eq(oboTokens.isActive, true)
        )
      );

    return result.rowCount || 0;
  }

  /**
   * Get active tokens for a user
   */
  static async getUserActiveTokens(userId: string): Promise<OboToken[]> {
    return db
      .select()
      .from(oboTokens)
      .where(
        and(
          eq(oboTokens.userId, userId),
          eq(oboTokens.isActive, true),
          gt(oboTokens.expiresAt, new Date())
        )
      );
  }

  /**
   * Check if a specific action is allowed for an OBO token
   */
  static async isActionAllowed(
    tokenId: string, 
    action: string
  ): Promise<boolean> {
    const [tokenRecord] = await db
      .select({
        allowedActions: oboTokens.allowedActions,
        restrictedActions: oboTokens.restrictedActions,
      })
      .from(oboTokens)
      .where(eq(oboTokens.id, tokenId));

    if (!tokenRecord) {
      return false;
    }

    const allowedActions = tokenRecord.allowedActions as string[] || [];
    const restrictedActions = tokenRecord.restrictedActions as string[] || [];

    // If restricted actions list exists and contains this action, it's forbidden
    if (restrictedActions.length > 0 && restrictedActions.includes(action)) {
      return false;
    }

    // If allowed actions list exists, the action must be in it
    if (allowedActions.length > 0) {
      return allowedActions.includes(action);
    }

    // If no specific restrictions, allow by default
    return true;
  }

  /**
   * Extract OBO context from Authorization header
   */
  static extractOboContext(authHeader: string): OboContext | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    try {
      // This would typically be called in middleware to validate tokens
      // For now, we'll return null as this needs to be called asynchronously
      return null;
    } catch (error) {
      return null;
    }
  }
}