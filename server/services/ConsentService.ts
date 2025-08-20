/**
 * Consent Management Service - Client consent activation and revocation
 */

import { db } from '../db';
import { clientAccessGrants, oboTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { OboService } from './OboService';
import { AuditService } from './AuditService';

export interface ConsentActivation {
  clientTenantId: string;
  partnerFirmId: string;
  requestedScopes: string[];
  activationCode?: string;
  expiresAt?: Date;
}

export class ConsentService {
  /**
   * Client must activate link with explicit scopes
   */
  static async activateConsent(activation: ConsentActivation & {
    clientUserId: string;
    activationCode: string;
  }): Promise<{ success: boolean; accessGrantId?: string; error?: string }> {
    try {
      // Validate activation code
      if (!this.validateActivationCode(activation.activationCode)) {
        return { success: false, error: 'Invalid activation code' };
      }

      // Check if consent already exists
      const [existingGrant] = await db
        .select()
        .from(clientAccessGrants)
        .where(
          and(
            eq(clientAccessGrants.clientTenantId, activation.clientTenantId),
            eq(clientAccessGrants.partnerFirmId, activation.partnerFirmId)
          )
        );

      if (existingGrant && existingGrant.isActive) {
        return { success: false, error: 'Consent already active for this partner' };
      }

      // Create or reactivate access grant with required fields from schema
      const grantData = {
        clientTenantId: activation.clientTenantId,
        partnerFirmId: activation.partnerFirmId,
        serviceType: 'all', // Required field from schema
        grantedScopes: activation.requestedScopes,
        isActive: true,
        validUntil: activation.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
      };

      let accessGrantId: string;
      
      if (existingGrant) {
        // Reactivate existing grant
        await db
          .update(clientAccessGrants)
          .set(grantData)
          .where(eq(clientAccessGrants.id, existingGrant.id));
        accessGrantId = existingGrant.id;
      } else {
        // Create new grant
        const [newGrant] = await db
          .insert(clientAccessGrants)
          .values(grantData)
          .returning();
        accessGrantId = newGrant.id;
      }

      // Log consent activation
      await AuditService.logEvent({
        eventType: 'user_action',
        eventCategory: 'consent',
        eventAction: 'consent_activated',
        tenantId: activation.clientTenantId,
        partnerFirmId: activation.partnerFirmId,
        userId: activation.clientUserId,
        eventData: {
          accessGrantId,
          grantedScopes: activation.requestedScopes,
          activationCode: activation.activationCode,
          validUntil: grantData.validUntil,
        },
      });

      return { success: true, accessGrantId };
    } catch (error) {
      console.error('Error activating consent:', error);
      return { success: false, error: 'Failed to activate consent' };
    }
  }

  /**
   * Revocation invalidates OBO tokens instantly
   */
  static async revokeConsent(revocation: {
    clientTenantId: string;
    partnerFirmId: string;
    revokedBy: string;
    reason?: string;
  }): Promise<{ success: boolean; revokedTokens?: number; error?: string }> {
    try {
      // Deactivate access grant
      const result = await db
        .update(clientAccessGrants)
        .set({
          isActive: false,
        })
        .where(
          and(
            eq(clientAccessGrants.clientTenantId, revocation.clientTenantId),
            eq(clientAccessGrants.partnerFirmId, revocation.partnerFirmId),
            eq(clientAccessGrants.isActive, true)
          )
        );

      if (result.rowCount === 0) {
        return { success: false, error: 'No active consent found to revoke' };
      }

      // Instantly revoke all OBO tokens for this tenant-partner combination
      const revokedTokens = await db
        .update(oboTokens)
        .set({
          isActive: false,
          revokedAt: new Date(),
          revocationReason: 'consent_revoked',
        })
        .where(
          and(
            eq(oboTokens.asTenantId, revocation.clientTenantId),
            eq(oboTokens.partnerFirmId, revocation.partnerFirmId),
            eq(oboTokens.isActive, true)
          )
        );

      // Log consent revocation
      await AuditService.logEvent({
        eventType: 'user_action',
        eventCategory: 'consent',
        eventAction: 'consent_revoked',
        tenantId: revocation.clientTenantId,
        partnerFirmId: revocation.partnerFirmId,
        userId: revocation.revokedBy,
        eventData: {
          reason: revocation.reason,
          revokedTokenCount: revokedTokens.rowCount || 0,
          revokedAt: new Date().toISOString(),
        },
      });

      return { 
        success: true, 
        revokedTokens: revokedTokens.rowCount || 0 
      };
    } catch (error) {
      console.error('Error revoking consent:', error);
      return { success: false, error: 'Failed to revoke consent' };
    }
  }

  /**
   * Generate consent activation link
   */
  static generateActivationLink(request: {
    clientTenantId: string;
    partnerFirmId: string;
    requestedScopes: string[];
    partnerName: string;
  }): { activationCode: string; activationUrl: string; expiresAt: Date } {
    const activationCode = this.generateActivationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const activationUrl = `${process.env.BASE_URL}/consent/activate?` +
      `code=${activationCode}&` +
      `tenant=${request.clientTenantId}&` +
      `partner=${request.partnerFirmId}&` +
      `scopes=${request.requestedScopes.join(',')}`;

    return { activationCode, activationUrl, expiresAt };
  }

  /**
   * Check if consent is active for a tenant-partner combination
   */
  static async isConsentActive(clientTenantId: string, partnerFirmId: string): Promise<boolean> {
    const [grant] = await db
      .select()
      .from(clientAccessGrants)
      .where(
        and(
          eq(clientAccessGrants.clientTenantId, clientTenantId),
          eq(clientAccessGrants.partnerFirmId, partnerFirmId),
          eq(clientAccessGrants.isActive, true)
        )
      );

    return !!grant && grant.validUntil && new Date() < new Date(grant.validUntil);
  }

  private static generateActivationCode(): string {
    return `CONSENT_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  }

  private static validateActivationCode(code: string): boolean {
    // Basic validation - in production would check against stored codes
    return code.startsWith('CONSENT_') && code.length > 20;
  }
}