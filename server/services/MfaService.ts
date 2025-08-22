import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { 
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

import { db } from '../db';
import { mfaTotpSecrets, webauthnCredentials, users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { PasswordService } from './PasswordService';

export interface TotpSetupResult {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface WebAuthnRegistrationResult {
  challenge: string;
  options: any;
}

export interface WebAuthnAuthenticationResult {
  challenge: string;
  options: any;
}

export class MfaService {
  private static readonly TOTP_ISSUER = 'PayrollSync';
  private static readonly TOTP_DIGITS = 6;
  private static readonly WEBAUTHN_RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
  private static readonly WEBAUTHN_ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5000';

  /**
   * Generate TOTP secret and QR code for user setup
   */
  static async setupTotp(userId: string, userEmail: string): Promise<TotpSetupResult> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.TOTP_ISSUER} (${userEmail})`,
      issuer: this.TOTP_ISSUER,
      length: 32,
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = PasswordService.generateBackupCodes(10);
    const hashedBackupCodes = await PasswordService.hashBackupCodes(backupCodes);

    // Store in database (but don't enable until verified)
    await db.insert(mfaTotpSecrets).values({
      userId,
      secret: secret.base32!,
      backupCodes: hashedBackupCodes,
      enabled: false, // Will be set to true after first successful verification
    });

    return {
      secret: secret.base32!,
      qrCode,
      manualEntryKey: secret.base32!,
      backupCodes,
    };
  }

  /**
   * Verify TOTP token and enable MFA
   */
  static async verifyTotpSetup(userId: string, token: string): Promise<boolean> {
    const [credential] = await db
      .select()
      .from(mfaTotpSecrets)
      .where(
        and(
          eq(mfaTotpSecrets.userId, userId),
          eq(mfaTotpSecrets.enabled, false)
        )
      );

    if (!credential) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: credential.secret,
      encoding: 'base32',
      token,
      digits: this.TOTP_DIGITS,
      window: 2, // Allow 2 time steps of drift
    });

    if (verified) {
      // Enable TOTP credential
      await db
        .update(mfaTotpSecrets)
        .set({ 
          enabled: true,
          lastUsedAt: new Date()
        })
        .where(eq(mfaTotpSecrets.id, credential.id));

      // Enable MFA on user account
      await db
        .update(users)
        .set({ mfaEnabled: true })
        .where(eq(users.id, userId));

      return true;
    }

    return false;
  }

  /**
   * Verify TOTP token for authentication
   */
  static async verifyTotp(userId: string, token: string): Promise<boolean> {
    const [credential] = await db
      .select()
      .from(mfaTotpSecrets)
      .where(
        and(
          eq(mfaTotpSecrets.userId, userId),
          eq(mfaTotpSecrets.enabled, true)
        )
      );

    if (!credential) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: credential.secret,
      encoding: 'base32',
      token,
      digits: this.TOTP_DIGITS,
      window: 2,
    });

    if (verified) {
      // Update last used
      await db
        .update(mfaTotpSecrets)
        .set({ lastUsedAt: new Date() })
        .where(eq(mfaTotpSecrets.id, credential.id));

      return true;
    }

    return false;
  }

  /**
   * Generate WebAuthn registration options
   */
  static async generateWebAuthnRegistrationOptions(
    userId: string,
    userName: string,
    userDisplayName: string
  ): Promise<WebAuthnRegistrationResult> {
    // Get existing credentials to prevent duplicate registrations
    const existingCredentials = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));

    const excludeCredentials = existingCredentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key' as const,
    }));

    const options = await generateRegistrationOptions({
      rpName: this.TOTP_ISSUER,
      rpID: this.WEBAUTHN_RP_ID,
      userID: Buffer.from(userId),
      userName,
      userDisplayName,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    return {
      challenge: options.challenge,
      options,
    };
  }

  /**
   * Verify WebAuthn registration response
   */
  static async verifyWebAuthnRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    expectedChallenge: string,
    deviceName?: string
  ): Promise<boolean> {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.WEBAUTHN_ORIGIN,
        expectedRPID: this.WEBAUTHN_RP_ID,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;

        // Store credential
        await db.insert(webauthnCredentials).values({
          id: Buffer.from(credential.id).toString('base64url'),
          userId,
          credentialId: Buffer.from(credential.id).toString('base64url'),
          publicKey: Buffer.from(credential.publicKey).toString('base64url'),
          counter: credential.counter,
          deviceName: deviceName || 'Security Key',
        });

        // Enable MFA on user account
        await db
          .update(users)
          .set({ mfaEnabled: true })
          .where(eq(users.id, userId));

        return true;
      }

      return false;
    } catch (error) {
      console.error('WebAuthn registration verification failed:', error);
      return false;
    }
  }

  /**
   * Generate WebAuthn authentication options
   */
  static async generateWebAuthnAuthenticationOptions(userId: string): Promise<WebAuthnAuthenticationResult> {
    // Get user's WebAuthn credentials
    const credentials = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));

    if (credentials.length === 0) {
      throw new Error('No WebAuthn credentials found for user');
    }

    const allowCredentials = credentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key' as const,
    }));

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials,
      userVerification: 'preferred',
      rpID: this.WEBAUTHN_RP_ID,
    });

    return {
      challenge: options.challenge,
      options,
    };
  }

  /**
   * Verify WebAuthn authentication response
   */
  static async verifyWebAuthnAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
    expectedChallenge: string
  ): Promise<boolean> {
    try {
      // Find credential
      const [credential] = await db
        .select()
        .from(webauthnCredentials)
        .where(
          and(
            eq(webauthnCredentials.userId, userId),
            eq(webauthnCredentials.credentialId, response.id)
          )
        );

      if (!credential) {
        return false;
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.WEBAUTHN_ORIGIN,
        expectedRPID: this.WEBAUTHN_RP_ID,
        credential: {
          id: credential.credentialId,
          publicKey: Buffer.from(credential.publicKey, 'base64url'),
          counter: credential.counter || 0,
        },
      });

      if (verification.verified) {
        // Update counter and last used
        await db
          .update(webauthnCredentials)
          .set({
            counter: verification.authenticationInfo?.newCounter || credential.counter,
            lastUsedAt: new Date()
          })
          .where(eq(webauthnCredentials.id, credential.id));

        return true;
      }

      return false;
    } catch (error) {
      console.error('WebAuthn authentication verification failed:', error);
      return false;
    }
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const [totpRecord] = await db
      .select()
      .from(mfaTotpSecrets)
      .where(
        and(
          eq(mfaTotpSecrets.userId, userId),
          eq(mfaTotpSecrets.enabled, true)
        )
      );

    if (!totpRecord || !totpRecord.backupCodes) {
      return false;
    }

    const backupCodes = totpRecord.backupCodes as string[];
    
    for (let i = 0; i < backupCodes.length; i++) {
      const hashedCode = backupCodes[i];
      if (!hashedCode) continue; // Skip if already used (null)
      
      const isValid = await PasswordService.verifyBackupCode(code.toUpperCase(), hashedCode);
      
      if (isValid) {
        // Mark backup code as used by setting it to null
        const updatedCodes = [...backupCodes];
        updatedCodes[i] = null as any;
        
        await db
          .update(mfaTotpSecrets)
          .set({ 
            backupCodes: updatedCodes,
            lastUsedAt: new Date()
          })
          .where(eq(mfaTotpSecrets.id, totpRecord.id));

        return true;
      }
    }

    return false;
  }

  /**
   * Generate new backup codes (revokes old ones)
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    // Generate new backup codes
    const backupCodes = PasswordService.generateBackupCodes(10);
    const hashedBackupCodes = await PasswordService.hashBackupCodes(backupCodes);

    // Update existing TOTP record with new backup codes
    await db
      .update(mfaTotpSecrets)
      .set({ backupCodes: hashedBackupCodes })
      .where(eq(mfaTotpSecrets.userId, userId));

    return backupCodes;
  }

  /**
   * Remove MFA method
   */
  static async removeMfaMethod(userId: string, credentialId: string): Promise<boolean> {
    // Try to remove TOTP method
    const [totpRecord] = await db
      .select()
      .from(mfaTotpSecrets)
      .where(eq(mfaTotpSecrets.userId, userId));
      
    if (totpRecord && totpRecord.id === credentialId) {
      await db
        .delete(mfaTotpSecrets)
        .where(eq(mfaTotpSecrets.id, totpRecord.id));
    }

    // Try to remove WebAuthn method
    await db
      .delete(webauthnCredentials)
      .where(
        and(
          eq(webauthnCredentials.userId, userId),
          eq(webauthnCredentials.id, credentialId)
        )
      );

    // Check if user has any remaining MFA methods
    const [remainingTotp] = await db
      .select()
      .from(mfaTotpSecrets)
      .where(
        and(
          eq(mfaTotpSecrets.userId, userId),
          eq(mfaTotpSecrets.enabled, true)
        )
      );
      
    const remainingWebAuthn = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));

    // Disable MFA if no methods remain
    if (!remainingTotp && remainingWebAuthn.length === 0) {
      await db
        .update(users)
        .set({ mfaEnabled: false })
        .where(eq(users.id, userId));
    }

    return true;
  }

  /**
   * Get user's MFA methods
   */
  static async getUserMfaMethods(userId: string) {
    const methods: any[] = [];
    
    // Get TOTP methods
    const totpMethods = await db
      .select({
        id: mfaTotpSecrets.id,
        type: sql<string>`'totp'`,
        name: sql<string>`'Authenticator App'`,
        createdAt: mfaTotpSecrets.createdAt,
        lastUsedAt: mfaTotpSecrets.lastUsedAt,
        enabled: mfaTotpSecrets.enabled,
      })
      .from(mfaTotpSecrets)
      .where(eq(mfaTotpSecrets.userId, userId));
      
    // Get WebAuthn methods
    const webauthnMethods = await db
      .select({
        id: webauthnCredentials.id,
        type: sql<string>`'webauthn'`,
        name: webauthnCredentials.deviceName,
        createdAt: webauthnCredentials.createdAt,
        lastUsedAt: webauthnCredentials.lastUsedAt,
        enabled: sql<boolean>`true`,
      })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));
      
    return [...totpMethods, ...webauthnMethods];
  }

  /**
   * Check if user has MFA enabled and configured
   */
  static async userHasMfa(userId: string): Promise<{ enabled: boolean; methods: string[] }> {
    const [totpRecord] = await db
      .select()
      .from(mfaTotpSecrets)
      .where(
        and(
          eq(mfaTotpSecrets.userId, userId),
          eq(mfaTotpSecrets.enabled, true)
        )
      );
      
    const webauthnCredentialsCount = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));

    const methods: string[] = [];
    if (totpRecord) methods.push('totp');
    if (webauthnCredentialsCount.length > 0) methods.push('webauthn');
    
    const enabled = methods.length > 0;

    return { enabled, methods };
  }
}