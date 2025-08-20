/**
 * Security Enforcement Initializer
 * Centralizes initialization of all security enforcement components
 */

import { MfaService } from './MfaService';
import { SsoService } from './SsoService';
import { SsoAdminIntegrationService } from './SsoAdminIntegrationService';
import { SecretManagementService } from './SecretManagementService';
import { AutomatedSecretRotationService } from './AutomatedSecretRotationService';
import { ComprehensiveKMSService } from './ComprehensiveKMSService';
import { AuditService } from './AuditService';

export interface SecurityConfig {
  mfa: {
    enforceGlobally: boolean;
    gracePeriodDays: number;
    exemptRoutes: string[];
  };
  sso: {
    enableAdminIntegration: boolean;
    allowedAdminDomains: string[];
    autoProvisionUsers: boolean;
  };
  secrets: {
    enableAutomaticRotation: boolean;
    rotationIntervalDays: number;
    provider: 'aws' | 'gcp' | 'azure' | 'vault' | 'local';
  };
  kms: {
    provider: 'aws' | 'gcp' | 'azure' | 'vault' | 'local';
    defaultKeyId: string;
    encryptDatabaseFields: boolean;
  };
}

export class SecurityEnforcementInitializer {
  private static initialized = false;
  private static config: SecurityConfig;

  /**
   * Initialize all security enforcement components
   */
  static async initialize(config?: Partial<SecurityConfig>): Promise<void> {
    if (this.initialized) {
      console.log('Security enforcement already initialized');
      return;
    }

    // Set default configuration
    this.config = {
      mfa: {
        enforceGlobally: process.env.NODE_ENV === 'production',
        gracePeriodDays: 7,
        exemptRoutes: ['/api/auth/login', '/api/auth/logout', '/api/health']
      },
      sso: {
        enableAdminIntegration: true,
        allowedAdminDomains: ['admin.payrollsync.com'],
        autoProvisionUsers: false
      },
      secrets: {
        enableAutomaticRotation: process.env.NODE_ENV === 'production',
        rotationIntervalDays: 90,
        provider: (process.env.SECRET_PROVIDER as any) || 'local'
      },
      kms: {
        provider: (process.env.KMS_PROVIDER as any) || 'local',
        defaultKeyId: 'default-db-encryption-key',
        encryptDatabaseFields: true
      },
      ...config
    };

    try {
      console.log('Initializing security enforcement components...');

      // Initialize KMS first (other services depend on it)
      await this.initializeKMS();

      // Initialize secret management
      await this.initializeSecretManagement();

      // Initialize MFA service
      await this.initializeMFA();

      // Initialize SSO integration
      await this.initializeSSO();

      // Initialize automated rotation
      await this.initializeSecretRotation();

      // Mark as initialized
      this.initialized = true;

      console.log('✅ Security enforcement initialization complete');

      // Audit the initialization (placeholder - would use actual audit service)
      console.log('Security enforcement initialized:', {
        mfaEnabled: this.config.mfa.enforceGlobally,
        ssoEnabled: this.config.sso.enableAdminIntegration,
        rotationEnabled: this.config.secrets.enableAutomaticRotation,
        kmsProvider: this.config.kms.provider
      });

    } catch (error) {
      console.error('❌ Security enforcement initialization failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Security initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Initialize KMS service
   */
  private static async initializeKMS(): Promise<void> {
    console.log('Initializing KMS service...');
    
    ComprehensiveKMSService.initialize({
      provider: this.config.kms.provider,
      defaultKeyId: this.config.kms.defaultKeyId,
      region: process.env.KMS_REGION,
      endpoint: process.env.KMS_ENDPOINT,
      credentials: this.getKMSCredentials()
    });

    // Create default encryption key if not exists
    try {
      await ComprehensiveKMSService.getKeyMetadata(this.config.kms.defaultKeyId);
    } catch (error) {
      console.log('Creating default encryption key...');
      await ComprehensiveKMSService.createKey(
        this.config.kms.defaultKeyId,
        'symmetric',
        'AES-256-GCM',
        ['encrypt', 'decrypt']
      );
    }

    console.log('✅ KMS service initialized');
  }

  /**
   * Initialize secret management service
   */
  private static async initializeSecretManagement(): Promise<void> {
    console.log('Initializing secret management...');
    
    SecretManagementService.initialize();
    
    console.log('✅ Secret management initialized');
  }

  /**
   * Initialize MFA enforcement
   */
  private static async initializeMFA(): Promise<void> {
    console.log('Initializing MFA enforcement...');
    
    // MFA service initialization is handled automatically
    // Configuration is set in the middleware
    
    console.log(`✅ MFA enforcement initialized (global: ${this.config.mfa.enforceGlobally})`);
  }

  /**
   * Initialize SSO admin integration
   */
  private static async initializeSSO(): Promise<void> {
    console.log('Initializing SSO admin integration...');
    
    if (this.config.sso.enableAdminIntegration) {
      SsoAdminIntegrationService.configure({
        allowedAdminDomains: this.config.sso.allowedAdminDomains,
        autoProvisionUsers: this.config.sso.autoProvisionUsers,
        requireApprovalForNewDomains: true,
        defaultRoleMapping: {
          'admin': 'admin',
          'hr': 'hr',
          'payroll': 'payroll',
          'manager': 'manager',
          'employee': 'employee'
        }
      });
    }
    
    console.log(`✅ SSO admin integration initialized (enabled: ${this.config.sso.enableAdminIntegration})`);
  }

  /**
   * Initialize automated secret rotation
   */
  private static async initializeSecretRotation(): Promise<void> {
    console.log('Initializing automated secret rotation...');
    
    if (this.config.secrets.enableAutomaticRotation) {
      AutomatedSecretRotationService.initialize();
      
      // Register default rotation policies
      const defaultPolicies = [
        {
          secretId: 'database_password',
          rotationIntervalDays: this.config.secrets.rotationIntervalDays,
          advanceWarningDays: 7,
          maxVersions: 3,
          autoRotate: true,
          notificationChannels: ['admin', 'devops']
        },
        {
          secretId: 'jwt_signing_key',
          rotationIntervalDays: 180,
          advanceWarningDays: 14,
          maxVersions: 2,
          autoRotate: true,
          notificationChannels: ['security', 'admin']
        }
      ];

      defaultPolicies.forEach(policy => {
        AutomatedSecretRotationService.registerRotationPolicy(policy);
      });
    }
    
    console.log(`✅ Secret rotation initialized (enabled: ${this.config.secrets.enableAutomaticRotation})`);
  }

  /**
   * Get KMS credentials based on provider
   */
  private static getKMSCredentials(): any {
    switch (this.config.kms.provider) {
      case 'aws':
        return {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION
        };
      case 'gcp':
        return {
          projectId: process.env.GCP_PROJECT_ID,
          keyFilename: process.env.GCP_KEY_FILE
        };
      case 'azure':
        return {
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          tenantId: process.env.AZURE_TENANT_ID
        };
      case 'vault':
        return {
          endpoint: process.env.VAULT_ENDPOINT,
          token: process.env.VAULT_TOKEN
        };
      default:
        return {};
    }
  }

  /**
   * Get current security configuration
   */
  static getConfig(): SecurityConfig {
    return this.config;
  }

  /**
   * Check if security enforcement is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get security status summary
   */
  static async getSecurityStatus(): Promise<{
    initialized: boolean;
    mfaEnforced: boolean;
    ssoEnabled: boolean;
    rotationEnabled: boolean;
    kmsProvider: string;
    activeKeys: number;
    pendingRotations: number;
  }> {
    if (!this.initialized) {
      return {
        initialized: false,
        mfaEnforced: false,
        ssoEnabled: false,
        rotationEnabled: false,
        kmsProvider: 'none',
        activeKeys: 0,
        pendingRotations: 0
      };
    }

    try {
      const keys = await ComprehensiveKMSService.listKeys();
      const rotationStatus = await AutomatedSecretRotationService.getRotationStatus();

      return {
        initialized: true,
        mfaEnforced: this.config.mfa.enforceGlobally,
        ssoEnabled: this.config.sso.enableAdminIntegration,
        rotationEnabled: this.config.secrets.enableAutomaticRotation,
        kmsProvider: this.config.kms.provider,
        activeKeys: keys.length,
        pendingRotations: rotationStatus.length
      };
    } catch (error) {
      console.error('Error getting security status:', error);
      return {
        initialized: true,
        mfaEnforced: this.config.mfa.enforceGlobally,
        ssoEnabled: this.config.sso.enableAdminIntegration,
        rotationEnabled: this.config.secrets.enableAutomaticRotation,
        kmsProvider: this.config.kms.provider,
        activeKeys: 0,
        pendingRotations: 0
      };
    }
  }

  /**
   * Gracefully shutdown security enforcement
   */
  static async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    console.log('Shutting down security enforcement...');
    
    // Perform any necessary cleanup
    
    this.initialized = false;
    console.log('✅ Security enforcement shutdown complete');
  }
}