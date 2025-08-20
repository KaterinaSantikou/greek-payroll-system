/**
 * Feature Flag Service for Authentication System
 * Manages runtime configuration of authentication features
 */

export interface FeatureFlags {
  auth_magic_link_enabled: boolean;
  auth_webauthn_enabled: boolean;
  auth_force_mfa_on_admins: boolean;
  auth_sso_enabled: boolean;
  auth_backup_codes_enabled: boolean;
  auth_domain_discovery_enabled: boolean;
  auth_analytics_enabled: boolean;
  auth_performance_monitoring: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  auth_magic_link_enabled: true,
  auth_webauthn_enabled: true,
  auth_force_mfa_on_admins: true,
  auth_sso_enabled: true,
  auth_backup_codes_enabled: true,
  auth_domain_discovery_enabled: true,
  auth_analytics_enabled: true,
  auth_performance_monitoring: true,
};

// In-memory feature flag storage (would be Redis/database in production)
let currentFlags: FeatureFlags = { ...DEFAULT_FLAGS };

export class FeatureFlagService {
  /**
   * Check if a specific feature is enabled
   */
  static isEnabled(flag: keyof FeatureFlags): boolean {
    return currentFlags[flag] ?? DEFAULT_FLAGS[flag];
  }

  /**
   * Get all current feature flags
   */
  static getAllFlags(): FeatureFlags {
    return { ...currentFlags };
  }

  /**
   * Update feature flags (admin operation)
   */
  static updateFlags(newFlags: Partial<FeatureFlags>): void {
    currentFlags = {
      ...currentFlags,
      ...newFlags,
    };
  }

  /**
   * Reset to default flags
   */
  static resetToDefaults(): void {
    currentFlags = { ...DEFAULT_FLAGS };
  }

  /**
   * Load flags from environment variables
   */
  static loadFromEnvironment(): void {
    const envFlags: Partial<FeatureFlags> = {};

    // Load from environment variables
    if (process.env.AUTH_MAGIC_LINK_ENABLED !== undefined) {
      envFlags.auth_magic_link_enabled = process.env.AUTH_MAGIC_LINK_ENABLED === 'true';
    }
    
    if (process.env.AUTH_WEBAUTHN_ENABLED !== undefined) {
      envFlags.auth_webauthn_enabled = process.env.AUTH_WEBAUTHN_ENABLED === 'true';
    }
    
    if (process.env.AUTH_FORCE_MFA_ON_ADMINS !== undefined) {
      envFlags.auth_force_mfa_on_admins = process.env.AUTH_FORCE_MFA_ON_ADMINS === 'true';
    }
    
    if (process.env.AUTH_SSO_ENABLED !== undefined) {
      envFlags.auth_sso_enabled = process.env.AUTH_SSO_ENABLED === 'true';
    }
    
    if (process.env.AUTH_BACKUP_CODES_ENABLED !== undefined) {
      envFlags.auth_backup_codes_enabled = process.env.AUTH_BACKUP_CODES_ENABLED === 'true';
    }
    
    if (process.env.AUTH_DOMAIN_DISCOVERY_ENABLED !== undefined) {
      envFlags.auth_domain_discovery_enabled = process.env.AUTH_DOMAIN_DISCOVERY_ENABLED === 'true';
    }
    
    if (process.env.AUTH_ANALYTICS_ENABLED !== undefined) {
      envFlags.auth_analytics_enabled = process.env.AUTH_ANALYTICS_ENABLED === 'true';
    }
    
    if (process.env.AUTH_PERFORMANCE_MONITORING !== undefined) {
      envFlags.auth_performance_monitoring = process.env.AUTH_PERFORMANCE_MONITORING === 'true';
    }

    this.updateFlags(envFlags);
  }

  /**
   * Check if user should be forced to use MFA based on role
   */
  static shouldForceMFA(userRoles: string[] = []): boolean {
    if (!this.isEnabled('auth_force_mfa_on_admins')) {
      return false;
    }

    const adminRoles = ['admin', 'super_admin', 'payroll_admin', 'hr_admin'];
    return userRoles.some(role => adminRoles.includes(role.toLowerCase()));
  }
}

// Load flags from environment on startup
FeatureFlagService.loadFromEnvironment();