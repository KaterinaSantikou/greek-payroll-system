/**
 * WebAuthn Service for FIDO2 Authentication
 * Implements passwordless authentication using WebAuthn/FIDO2 standard
 */

import { 
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

import { db } from '../db';
import { webauthnCredentials } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { createSafeInterval } from '../utils/safeScheduler';

export interface WebAuthnCredential {
  id: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: string[];
  created_at: Date;
  last_used_at?: Date;
  name?: string; // User-friendly name for the credential
}

export class WebAuthnService {
  private static readonly RP_NAME = 'PayrollSync';
  private static readonly RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
  private static readonly ORIGIN = process.env.WEBAUTHN_ORIGIN || `http://${this.RP_ID}:5000`;

  /**
   * Generate registration options for a new WebAuthn credential
   */
  static async generateRegistrationOptions(
    userId: string,
    userName: string,
    userDisplayName?: string
  ): Promise<any> {
    // Get existing credentials to exclude
    const existingCredentials = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));

    const opts: GenerateRegistrationOptionsOpts = {
      rpName: this.RP_NAME,
      rpID: this.RP_ID,
      userID: userId,
      userName,
      userDisplayName: userDisplayName || userName,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        id: Buffer.from(cred.credentialId, 'base64'),
        type: 'public-key' as const,
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'cross-platform',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    };

    const options = await generateRegistrationOptions(opts);

    // Store challenge for later verification
    // In production, you'd store this in Redis or similar
    const challengeKey = `webauthn_challenge_${userId}`;
    (global as any).webauthnChallenges = (global as any).webauthnChallenges || new Map();
    (global as any).webauthnChallenges.set(challengeKey, {
      challenge: options.challenge,
      timestamp: Date.now(),
    });

    return options;
  }

  /**
   * Verify registration response and store credential
   */
  static async verifyRegistrationResponse(
    userId: string,
    response: RegistrationResponseJSON,
    credentialName?: string
  ): Promise<{ verified: boolean; credential?: WebAuthnCredential }> {
    try {
      // Get stored challenge
      const challengeKey = `webauthn_challenge_${userId}`;
      const challengeData = (global as any).webauthnChallenges?.get(challengeKey);
      
      if (!challengeData) {
        throw new Error('Challenge not found or expired');
      }

      // Clear challenge immediately
      (global as any).webauthnChallenges.delete(challengeKey);

      const opts: VerifyRegistrationResponseOpts = {
        response,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: this.ORIGIN,
        expectedRPID: this.RP_ID,
        requireUserVerification: false,
      };

      const verification = await verifyRegistrationResponse(opts);

      if (!verification.verified || !verification.registrationInfo) {
        return { verified: false };
      }

      const { registrationInfo } = verification;

      // Store credential in database
      const credentialData = {
        userId,
        credentialId: Buffer.from(registrationInfo.credential.id).toString('base64'),
        publicKey: Buffer.from(registrationInfo.credential.publicKey).toString('base64'),
        counter: registrationInfo.credential.counter,
        transports: response.response.transports ? JSON.stringify(response.response.transports) : null,
        name: credentialName || 'WebAuthn Credential',
        createdAt: new Date(),
      };

      const [credential] = await db
        .insert(webauthnCredentials)
        .values(credentialData)
        .returning();

      return {
        verified: true,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64')),
          counter: credential.counter || 0,
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
          created_at: credential.createdAt || new Date(),
          name: credential.name || credential.deviceName || undefined,
        },
      };
    } catch (error) {
      console.error('WebAuthn registration verification error:', error);
      return { verified: false };
    }
  }

  /**
   * Generate authentication options for WebAuthn login
   */
  static async generateAuthenticationOptions(
    userId?: string // Optional - if provided, only user's credentials are allowed
  ): Promise<any> {
    let allowCredentials: Array<{ id: string; type: 'public-key'; transports?: string[] }> | undefined;

    if (userId) {
      // Get user's credentials
      const userCredentials = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, userId));

      allowCredentials = userCredentials.map(cred => ({
        id: Buffer.from(cred.credentialId, 'base64'),
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      })) as any;
    }

    const opts: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      allowCredentials,
      userVerification: 'preferred',
      rpID: this.RP_ID,
    };

    const options = await generateAuthenticationOptions(opts);

    // Store challenge for later verification
    const challengeKey = userId ? `webauthn_auth_challenge_${userId}` : `webauthn_auth_challenge_${options.challenge}`;
    (global as any).webauthnChallenges = (global as any).webauthnChallenges || new Map();
    (global as any).webauthnChallenges.set(challengeKey, {
      challenge: options.challenge,
      timestamp: Date.now(),
      userId,
    });

    return options;
  }

  /**
   * Verify authentication response
   */
  static async verifyAuthenticationResponse(
    response: AuthenticationResponseJSON,
    userId?: string
  ): Promise<{ 
    verified: boolean; 
    userId?: string;
    credentialId?: string;
    newCounter?: number;
  }> {
    try {
      // Find the credential
      const [credential] = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.credentialId, response.id));

      if (!credential) {
        throw new Error('Credential not found');
      }

      // If userId provided, verify it matches
      if (userId && credential.userId !== userId) {
        throw new Error('Credential does not belong to user');
      }

      // Get stored challenge
      const challengeKey = userId ? `webauthn_auth_challenge_${userId}` : `webauthn_auth_challenge_${response.id}`;
      const challengeData = (global as any).webauthnChallenges?.get(challengeKey);
      
      if (!challengeData) {
        throw new Error('Challenge not found or expired');
      }

      // Clear challenge immediately
      (global as any).webauthnChallenges.delete(challengeKey);

      const opts: VerifyAuthenticationResponseOpts = {
        response,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: this.ORIGIN,
        expectedRPID: this.RP_ID,
        credential: {
          id: Buffer.from(credential.credentialId, 'base64'),
          publicKey: Buffer.from(credential.publicKey, 'base64'),
          counter: credential.counter || 0,
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        },
        requireUserVerification: false,
      };

      const verification = await verifyAuthenticationResponse(opts);

      if (!verification.verified) {
        return { verified: false };
      }

      // Update counter and last used timestamp
      await db
        .update(webauthnCredentials)
        .set({
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        })
        .where(eq(webauthnCredentials.credentialId, credential.credentialId));

      return {
        verified: true,
        userId: credential.userId || '',
        credentialId: credential.credentialId,
        newCounter: verification.authenticationInfo.newCounter,
      };
    } catch (error) {
      console.error('WebAuthn authentication verification error:', error);
      return { verified: false };
    }
  }

  /**
   * Get user's WebAuthn credentials
   */
  static async getUserCredentials(userId: string): Promise<WebAuthnCredential[]> {
    const credentials = await db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));

    return credentials.map(cred => ({
      id: cred.credentialId,
      publicKey: new Uint8Array(Buffer.from(cred.publicKey, 'base64')),
      counter: cred.counter || 0,
      transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      created_at: cred.createdAt || new Date(),
      last_used_at: cred.lastUsedAt || undefined,
      name: cred.name || cred.deviceName || undefined,
    }));
  }

  /**
   * Remove a WebAuthn credential
   */
  static async removeCredential(userId: string, credentialId: string): Promise<boolean> {
    const result = await db
      .delete(webauthnCredentials)
      .where(
        and(
          eq(webauthnCredentials.userId, userId),
          eq(webauthnCredentials.credentialId, credentialId)
        )
      );

    return true; // Drizzle delete doesn't return affected rows
  }

  /**
   * Update credential name
   */
  static async updateCredentialName(
    userId: string,
    credentialId: string,
    newName: string
  ): Promise<boolean> {
    const result = await db
      .update(webauthnCredentials)
      .set({ name: newName })
      .where(
        and(
          eq(webauthnCredentials.userId, userId),
          eq(webauthnCredentials.credentialId, credentialId)
        )
      );

    return true; // Drizzle update doesn't return affected rows
  }

  /**
   * Check if WebAuthn is supported by checking for existing credentials or browser support
   */
  static async isWebAuthnAvailable(userId?: string): Promise<{
    supported: boolean;
    hasCredentials: boolean;
    credentialCount: number;
  }> {
    let hasCredentials = false;
    let credentialCount = 0;

    if (userId) {
      const credentials = await this.getUserCredentials(userId);
      credentialCount = credentials.length;
      hasCredentials = credentialCount > 0;
    }

    // WebAuthn support is determined client-side, but we can provide server-side info
    return {
      supported: true, // Assume supported - client will verify
      hasCredentials,
      credentialCount,
    };
  }

  /**
   * Clean up expired challenges (run periodically)
   */
  static cleanupExpiredChallenges(): void {
    if (!(global as any).webauthnChallenges) return;

    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, data] of (global as any).webauthnChallenges.entries()) {
      if (now - data.timestamp > maxAge) {
        (global as any).webauthnChallenges.delete(key);
      }
    }
  }
}

// Clean up expired challenges every minute (safely)

createSafeInterval(() => {
  WebAuthnService.cleanupExpiredChallenges();
}, {
  name: 'WebAuthn Challenge Cleanup',
  enableEnvVar: 'ENABLE_WEBAUTHN_CLEANUP',
  intervalMs: 60 * 1000,
  runImmediately: false
});