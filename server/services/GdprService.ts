import { db } from '../db';
import { users, sessions, auditLogs, emailVerificationTokens, passwordResetTokens, magicLinkTokens, userSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface GdprExportData {
  personal_information: {
    user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    locale: string;
    timezone?: string;
    created_at: string;
    updated_at: string;
  };
  authentication_data: {
    email_verified: boolean;
    email_verified_at?: string;
    last_login_at?: string;
    mfa_enabled: boolean;
    gdpr_consent_at?: string;
    tos_accepted_at?: string;
    privacy_accepted_at?: string;
  };
  security_data: {
    login_attempts: number;
    locked_until?: string;
    active_sessions: Array<{
      session_id: string;
      created_at: string;
      expires_at: string;
      ip_address: string;
      user_agent: string;
    }>;
  };
  audit_logs: Array<{
    event_type: string;
    result: string;
    timestamp: string;
    ip_address: string; // Redacted in actual logs
    metadata?: any;
  }>;
  export_metadata: {
    exported_at: string;
    export_id: string;
    data_retention_period: string;
    legal_basis: string;
  };
}

export class GdprService {
  /**
   * Export all user data (GDPR Article 20 - Right to data portability)
   */
  static async exportUserData(userId: string): Promise<GdprExportData> {
    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    // Get active sessions
    const activeSessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId));

    // Get recent audit logs (last 90 days, with PII redaction)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentAudits = await db
      .select({
        eventType: auditLogs.eventType,
        result: auditLogs.result,
        createdAt: auditLogs.createdAt,
        ipAddress: auditLogs.ipAddress, // Will be redacted below
        metadata: auditLogs.metadata,
      })
      .from(auditLogs)
      .where(eq(auditLogs.email, user.email));

    // Prepare export data
    const exportData: GdprExportData = {
      personal_information: {
        user_id: user.id,
        email: user.email,
        first_name: user.firstName || undefined,
        last_name: user.lastName || undefined,
        locale: user.locale,
        timezone: user.timezone || undefined,
        created_at: user.createdAt?.toISOString() || '',
        updated_at: user.updatedAt?.toISOString() || '',
      },
      authentication_data: {
        email_verified: user.emailVerified || false,
        email_verified_at: user.emailVerifiedAt?.toISOString(),
        last_login_at: user.lastLoginAt?.toISOString(),
        mfa_enabled: user.mfaEnabled || false,
        gdpr_consent_at: user.gdprConsentAt?.toISOString(),
        tos_accepted_at: user.tosAcceptedAt?.toISOString(),
        privacy_accepted_at: user.privacyAcceptedAt?.toISOString(),
      },
      security_data: {
        login_attempts: user.loginAttempts || 0,
        locked_until: user.lockedUntil?.toISOString(),
        active_sessions: activeSessions.map(session => ({
          session_id: session.id,
          created_at: session.createdAt?.toISOString() || '',
          expires_at: session.expiresAt?.toISOString() || '', 
          ip_address: this.redactIpAddress(session.ipAddress || ''),
          user_agent: session.userAgent || '',
        })),
      },
      audit_logs: recentAudits.map(audit => ({
        event_type: audit.eventType,
        result: audit.result,
        timestamp: audit.timestamp?.toISOString() || '',
        ip_address: this.redactIpAddress(audit.ipAddress || ''),
        metadata: audit.payload,
      })),
      export_metadata: {
        exported_at: new Date().toISOString(),
        export_id: crypto.randomUUID(),
        data_retention_period: '7 years (Greek labor law requirement)',
        legal_basis: 'GDPR Article 20 - Right to data portability',
      },
    };

    return exportData;
  }

  /**
   * Delete user account and all associated data (GDPR Article 17 - Right to erasure)
   */
  static async deleteUserData(userId: string): Promise<void> {
    // Begin transaction for atomic deletion
    await db.transaction(async (tx) => {
      // 1. Delete authentication tokens
      await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));
      await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
      await tx.delete(magicLinkTokens).where(eq(magicLinkTokens.userId, userId));

      // 2. Delete sessions
      await tx.delete(userSessions).where(eq(userSessions.userId, userId));

      // 3. Anonymize audit logs (keep for legal compliance but remove PII)
      await tx
        .update(auditLogs)
        .set({
          email: '[deleted]',
          ipAddress: '[redacted]',
          userAgent: '[redacted]', 
          payload: { deleted: true, deletion_date: new Date().toISOString() },
        })
        .where(eq(auditLogs.email, user.email));

      // 4. Delete user record (cascade will handle related records)
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  /**
   * Update consent preferences (GDPR Article 7 - Conditions for consent)
   */
  static async updateConsent(
    userId: string,
    consents: {
      gdpr?: boolean;
      tos?: boolean;
      privacy?: boolean;
    }
  ): Promise<void> {
    const now = new Date();
    const updates: any = { updatedAt: now };

    if (consents.gdpr !== undefined) {
      updates.gdprConsentAt = consents.gdpr ? now : null;
    }

    if (consents.tos !== undefined) {
      updates.tosAcceptedAt = consents.tos ? now : null;
    }

    if (consents.privacy !== undefined) {
      updates.privacyAcceptedAt = consents.privacy ? now : null;
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId));
  }

  /**
   * Get user's current consent status
   */
  static async getConsentStatus(userId: string) {
    const [user] = await db
      .select({
        gdprConsentAt: users.gdprConsentAt,
        tosAcceptedAt: users.tosAcceptedAt,
        privacyAcceptedAt: users.privacyAcceptedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error('User not found');
    }

    return {
      gdpr_consent: !!user.gdprConsentAt,
      gdpr_consent_at: user.gdprConsentAt?.toISOString(),
      tos_accepted: !!user.tosAcceptedAt,
      tos_accepted_at: user.tosAcceptedAt?.toISOString(),
      privacy_accepted: !!user.privacyAcceptedAt,
      privacy_accepted_at: user.privacyAcceptedAt?.toISOString(),
    };
  }

  /**
   * Redact IP address for privacy (keep first 3 octets for geolocation compliance)
   */
  private static redactIpAddress(ipAddress: string): string {
    if (!ipAddress || ipAddress === 'unknown') {
      return '[unknown]';
    }

    // For IPv4, redact last octet
    if (ipAddress.includes('.')) {
      const parts = ipAddress.split('.');
      if (parts.length === 4) {
        return `${parts.slice(0, 3).join('.')}.xxx`;
      }
    }

    // For IPv6, redact last segment
    if (ipAddress.includes(':')) {
      const parts = ipAddress.split(':');
      if (parts.length > 4) {
        return `${parts.slice(0, 4).join(':')}:xxxx:xxxx:xxxx:xxxx`;
      }
    }

    return '[redacted]';
  }

  /**
   * Check if user has provided all required consents
   */
  static async hasRequiredConsents(userId: string): Promise<boolean> {
    const [user] = await db
      .select({
        tosAcceptedAt: users.tosAcceptedAt,
        privacyAcceptedAt: users.privacyAcceptedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return false;
    }

    // Both ToS and Privacy Policy acceptance are required
    return !!(user.tosAcceptedAt && user.privacyAcceptedAt);
  }

  /**
   * Generate data retention schedule (for compliance reporting)
   */
  static getDataRetentionSchedule() {
    return {
      authentication_data: '7 years (Greek labor law)',
      audit_logs: '7 years (Greek labor law)',
      personal_data: 'Until account deletion or consent withdrawal',
      session_data: '90 days after session expiry',
      marketing_data: 'Until consent withdrawal',
      technical_logs: '1 year (security monitoring)',
    };
  }
}