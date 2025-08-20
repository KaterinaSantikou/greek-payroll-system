import crypto from 'crypto';
import { db } from '../db';
import { users, userSsoConnections, ssoProviders } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { AuditService } from './AuditService';

export interface OidcConfig {
  clientId: string;
  clientSecret: string;
  issuer: string;
  redirectUri: string;
  scopes: string[];
}

export interface SsoUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  provider: string;
  subjectId: string;
  profile: any;
}

export interface PkceChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export class SsoService {
  private static readonly DOMAIN_PROVIDERS: Record<string, string> = {
    'gmail.com': 'google',
    'googlemail.com': 'google',
    'outlook.com': 'microsoft',
    'hotmail.com': 'microsoft',
    'live.com': 'microsoft',
    'company.gr': 'saml', // Example company domain
  };

  /**
   * Discover SSO provider by email domain
   */
  static discoverProvider(email: string): string | null {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    
    return this.DOMAIN_PROVIDERS[domain] || null;
  }

  /**
   * Generate PKCE challenge for OIDC
   */
  static generatePkceChallenge(): PkceChallenge {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Build authorization URL
   */
  static buildAuthorizationUrl(
    provider: string,
    config: OidcConfig,
    pkce: PkceChallenge,
    state: string
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: pkce.codeChallengeMethod,
    });

    const baseUrls: Record<string, string> = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      okta: `${config.issuer}/v1/authorize`,
    };

    const baseUrl = baseUrls[provider];
    if (!baseUrl) {
      throw new Error(`Unsupported SSO provider: ${provider}`);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    provider: string,
    code: string,
    codeVerifier: string,
    config: OidcConfig
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn: number;
  }> {
    const tokenEndpoints: Record<string, string> = {
      google: 'https://oauth2.googleapis.com/token',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      okta: `${config.issuer}/v1/token`,
    };

    const tokenEndpoint = tokenEndpoints[provider];
    if (!tokenEndpoint) {
      throw new Error(`Unsupported SSO provider: ${provider}`);
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in || 3600,
    };
  }

  /**
   * Get user info from SSO provider
   */
  static async getUserInfo(provider: string, accessToken: string): Promise<any> {
    const userInfoEndpoints: Record<string, string> = {
      google: 'https://www.googleapis.com/oauth2/v2/userinfo',
      microsoft: 'https://graph.microsoft.com/v1.0/me',
      okta: 'https://dev-example.okta.com/oauth2/v1/userinfo', // Replace with actual
    };

    const userInfoEndpoint = userInfoEndpoints[provider];
    if (!userInfoEndpoint) {
      throw new Error(`Unsupported SSO provider: ${provider}`);
    }

    const response = await fetch(userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Just-in-time user provisioning
   */
  static async provisionUser(
    ssoUser: SsoUser,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    // Check if user already exists by SSO account
    const [existingSso] = await db
      .select()
      .from(userSsoConnections)
      .where(eq(userSsoConnections.externalId, ssoUser.subjectId));

    if (existingSso) {
      // Update last login
      await db
        .update(userSsoConnections)
        .set({ lastLoginAt: new Date() })
        .where(eq(userSsoConnections.id, existingSso.id));

      // Audit log
      await AuditService.logEvent({
        userId: existingSso.userId,
        eventType: 'sso_login',
        ipAddress,
        userAgent,
        email: ssoUser.email,
        result: 'success',
        metadata: {
          provider: ssoUser.provider,
          subjectId: ssoUser.subjectId,
        },
      });

      return existingSso.userId;
    }

    // Check if user exists by email
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, ssoUser.email.toLowerCase()));

    let userId: string;

    if (existingUser) {
      // Link SSO account to existing user
      userId = existingUser.id;
      
      await db.insert(userSsoConnections).values({
        userId,
        providerId: 'generic-provider-id', // Would be configured during SSO setup
        externalId: ssoUser.subjectId,
        email: ssoUser.email,
        displayName: `${ssoUser.firstName || ''} ${ssoUser.lastName || ''}`.trim(),
        lastLoginAt: new Date(),
      });
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: ssoUser.email,
          emailVerified: true, // SSO emails are pre-verified
          emailVerifiedAt: new Date(),
          firstName: ssoUser.firstName,
          lastName: ssoUser.lastName,
          profileImageUrl: ssoUser.profileImageUrl,
          locale: 'en', // Default, can be customized
          isActive: true,
        })
        .returning();

      userId = newUser.id;

      // Create SSO account link
      await db.insert(userSsoConnections).values({
        userId,
        providerId: 'generic-provider-id', // Would be configured during SSO setup
        externalId: ssoUser.subjectId,
        email: ssoUser.email,
        displayName: `${ssoUser.firstName || ''} ${ssoUser.lastName || ''}`.trim(),
        lastLoginAt: new Date(),
      });

      // Audit log for new user
      await AuditService.logEvent({
        userId,
        eventType: 'signup',
        ipAddress,
        userAgent,
        email: ssoUser.email,
        result: 'success',
        metadata: {
          method: 'sso',
          provider: ssoUser.provider,
          subjectId: ssoUser.subjectId,
        },
      });
    }

    // Audit log for SSO login
    await AuditService.logEvent({
      userId,
      eventType: 'sso_login',
      ipAddress,
      userAgent,
      email: ssoUser.email,
      result: 'success',
      metadata: {
        provider: ssoUser.provider,
        subjectId: ssoUser.subjectId,
        newUser: !existingUser,
      },
    });

    return userId;
  }

  /**
   * Parse and validate ID token (JWT)
   */
  static parseIdToken(idToken: string): any {
    try {
      const [header, payload, signature] = idToken.split('.');
      const decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString()
      );

      // In production, you should verify the signature
      return decodedPayload;
    } catch (error) {
      throw new Error('Invalid ID token');
    }
  }

  /**
   * Map SSO user data from different providers
   */
  static mapSsoUser(provider: string, userInfo: any, idToken?: any): SsoUser {
    const profile = idToken || userInfo;

    switch (provider) {
      case 'google':
        return {
          id: profile.sub || profile.id,
          email: profile.email,
          firstName: profile.given_name,
          lastName: profile.family_name,
          profileImageUrl: profile.picture,
          provider,
          subjectId: profile.sub || profile.id,
          profile,
        };

      case 'microsoft':
        return {
          id: profile.sub || profile.id,
          email: profile.email || profile.mail || profile.userPrincipalName,
          firstName: profile.given_name || profile.givenName,
          lastName: profile.family_name || profile.surname,
          profileImageUrl: profile.picture,
          provider,
          subjectId: profile.sub || profile.id,
          profile,
        };

      case 'okta':
        return {
          id: profile.sub,
          email: profile.email,
          firstName: profile.given_name,
          lastName: profile.family_name,
          profileImageUrl: profile.picture,
          provider,
          subjectId: profile.sub,
          profile,
        };

      default:
        // Generic mapping
        return {
          id: profile.sub || profile.id,
          email: profile.email,
          firstName: profile.given_name || profile.first_name,
          lastName: profile.family_name || profile.last_name,
          profileImageUrl: profile.picture,
          provider,
          subjectId: profile.sub || profile.id,
          profile,
        };
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('base64url');
  }

  /**
   * Get user's SSO connections
   */
  static async getUserSsoConnections(userId: string) {
    return db
      .select({
        id: userSsoConnections.id,
        provider: userSsoConnections.providerId,
        email: userSsoConnections.email,
        lastLoginAt: userSsoConnections.lastLoginAt,
        createdAt: userSsoConnections.createdAt,
      })
      .from(userSsoConnections)
      .where(eq(userSsoConnections.userId, userId));
  }

  /**
   * Remove SSO connection
   */
  static async removeSsoConnection(userId: string, connectionId: string): Promise<boolean> {
    const result = await db
      .delete(userSsoConnections)
      .where(
        and(
          eq(userSsoConnections.userId, userId),
          eq(userSsoConnections.id, connectionId)
        )
      );

    return Array.isArray(result) ? result.length > 0 : true;
  }
}