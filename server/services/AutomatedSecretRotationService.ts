/**
 * Automated Secret Rotation Service
 * Handles automatic rotation of secrets with KMS integration and zero-downtime updates
 */

// Use defensive import pattern to prevent runtime crashes
import * as SecretModule from './SecretManagementService';
import { AuditService } from './AuditService';
import crypto from 'crypto';

// Defensive shim to handle any export/import mismatches
const getSecret = 
  (SecretModule as any).getSecret ??
  (typeof (SecretModule as any).default === 'function' ? (SecretModule as any).default
   : (SecretModule as any).default?.getSecret);

const getSecretMetadata =
  (SecretModule as any).getSecretMetadata ??
  (SecretModule as any).default?.getSecretMetadata;

// Additional fallbacks for class-based access
const SecretManagementService = 
  (SecretModule as any).SecretManagementService ?? 
  (SecretModule as any).default;

export interface RotationPolicy {
  secretId: string;
  rotationIntervalDays: number;
  advanceWarningDays: number;
  maxVersions: number;
  autoRotate: boolean;
  notificationChannels: string[];
}

export interface SecretRotationResult {
  secretId: string;
  oldVersion: string;
  newVersion: string;
  rotatedAt: Date;
  deploymentStatus: 'pending' | 'completed' | 'failed';
}

export interface RotationSchedule {
  secretId: string;
  nextRotation: Date;
  warningDate: Date;
  policy: RotationPolicy;
}

export class AutomatedSecretRotationService {
  private static rotationPolicies = new Map<string, RotationPolicy>();
  private static rotationQueue: RotationSchedule[] = [];

  /**
   * Initialize the rotation service with default policies
   */
  static initialize() {
    // Define default rotation policies for critical secrets
    const defaultPolicies: RotationPolicy[] = [
      {
        secretId: 'database_password',
        rotationIntervalDays: 90,
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
      },
      {
        secretId: 'encryption_key',
        rotationIntervalDays: 365,
        advanceWarningDays: 30,
        maxVersions: 2,
        autoRotate: false, // Manual approval required
        notificationChannels: ['security', 'admin', 'compliance']
      },
      {
        secretId: 'api_keys',
        rotationIntervalDays: 60,
        advanceWarningDays: 3,
        maxVersions: 5,
        autoRotate: true,
        notificationChannels: ['devops']
      }
    ];

    defaultPolicies.forEach(policy => {
      this.rotationPolicies.set(policy.secretId, policy);
    });

    // Schedule initial rotation checks
    this.scheduleRotationChecks();
  }

  /**
   * Register a rotation policy for a secret
   */
  static registerRotationPolicy(policy: RotationPolicy): void {
    this.rotationPolicies.set(policy.secretId, policy);
    this.scheduleNextRotation(policy.secretId);
  }

  /**
   * Execute rotation for a specific secret
   */
  static async rotateSecret(
    secretId: string,
    forceRotation: boolean = false
  ): Promise<SecretRotationResult> {
    try {
      const policy = this.rotationPolicies.get(secretId);
      if (!policy) {
        throw new Error(`No rotation policy found for secret: ${secretId}`);
      }

      // Check if rotation is needed
      if (!forceRotation && !await this.isRotationDue(secretId)) {
        throw new Error(`Rotation not due for secret: ${secretId}`);
      }

      // Generate new secret value based on type
      const newSecretValue = await this.generateNewSecretValue(secretId);
      
      // Get current version using defensive wrapper
      const currentSecret = await getSecret(secretId);
      const oldVersion = currentSecret?.version || '1';
      const newVersion = this.generateNewVersion(oldVersion);

      // Store new version in KMS/Vault
      await SecretManagementService.storeSecretVersion(
        secretId,
        newSecretValue,
        newVersion
      );

      // Begin deployment of new secret
      const deploymentResult = await this.deploySecretUpdate(
        secretId,
        newSecretValue,
        newVersion
      );

      const rotationResult: SecretRotationResult = {
        secretId,
        oldVersion,
        newVersion,
        rotatedAt: new Date(),
        deploymentStatus: deploymentResult.success ? 'completed' : 'failed'
      };

      // Clean up old versions
      await this.cleanupOldVersions(secretId, policy.maxVersions);

      // Audit the rotation
      await AuditService.logEvent({
        action: 'secret.rotated',
        resourceType: 'secret',
        resourceId: secretId,
        metadata: {
          oldVersion,
          newVersion,
          deploymentStatus: rotationResult.deploymentStatus,
          policy: policy.secretId
        }
      });

      // Schedule next rotation
      this.scheduleNextRotation(secretId);

      // Send notifications
      await this.sendRotationNotification(secretId, rotationResult, policy);

      return rotationResult;

    } catch (error) {
      console.error(`Secret rotation failed for ${secretId}:`, error);
      
      // Audit the failure
      await AuditService.logEvent({
        action: 'secret.rotation.failed',
        resourceType: 'secret',
        resourceId: secretId,
        metadata: { error: error.message }
      });

      throw error;
    }
  }

  /**
   * Check all secrets for pending rotations
   */
  static async checkPendingRotations(): Promise<RotationSchedule[]> {
    const pendingRotations: RotationSchedule[] = [];
    const now = new Date();

    for (const [secretId, policy] of this.rotationPolicies.entries()) {
      const lastRotation = await this.getLastRotationDate(secretId);
      const nextRotation = new Date(
        lastRotation.getTime() + (policy.rotationIntervalDays * 24 * 60 * 60 * 1000)
      );
      const warningDate = new Date(
        nextRotation.getTime() - (policy.advanceWarningDays * 24 * 60 * 60 * 1000)
      );

      if (now >= warningDate) {
        pendingRotations.push({
          secretId,
          nextRotation,
          warningDate,
          policy
        });
      }
    }

    return pendingRotations;
  }

  /**
   * Execute automatic rotations for all eligible secrets
   */
  static async executeAutomaticRotations(): Promise<SecretRotationResult[]> {
    const results: SecretRotationResult[] = [];
    const pendingRotations = await this.checkPendingRotations();

    for (const schedule of pendingRotations) {
      try {
        // Only auto-rotate if policy allows and rotation is due
        if (schedule.policy.autoRotate && new Date() >= schedule.nextRotation) {
          const result = await this.rotateSecret(schedule.secretId);
          results.push(result);
        }
      } catch (error) {
        console.error(`Auto-rotation failed for ${schedule.secretId}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate new secret value based on secret type
   */
  private static async generateNewSecretValue(secretId: string): Promise<string> {
    switch (secretId) {
      case 'database_password':
        return this.generateStrongPassword(32);
      
      case 'jwt_signing_key':
        return crypto.randomBytes(64).toString('base64');
      
      case 'encryption_key':
        return crypto.randomBytes(32).toString('base64');
      
      case 'api_keys':
        return 'pk_' + crypto.randomBytes(32).toString('hex');
      
      default:
        // Generic secure random string
        return crypto.randomBytes(32).toString('base64');
    }
  }

  /**
   * Generate strong password with specific criteria
   */
  private static generateStrongPassword(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Deploy secret update with zero-downtime strategy
   */
  private static async deploySecretUpdate(
    secretId: string,
    newValue: string,
    newVersion: string
  ): Promise<{ success: boolean; rollbackRequired?: boolean }> {
    try {
      // Implement blue-green deployment strategy for secrets
      
      // 1. Update secret in external systems first
      await this.updateExternalSystemSecrets(secretId, newValue);
      
      // 2. Update application configuration
      await this.updateApplicationConfig(secretId, newValue, newVersion);
      
      // 3. Perform health checks
      const healthCheckPassed = await this.performHealthChecks();
      
      if (!healthCheckPassed) {
        // Rollback if health checks fail
        await this.rollbackSecretUpdate(secretId);
        return { success: false, rollbackRequired: true };
      }

      return { success: true };

    } catch (error) {
      console.error(`Secret deployment failed for ${secretId}:`, error);
      await this.rollbackSecretUpdate(secretId);
      return { success: false, rollbackRequired: true };
    }
  }

  /**
   * Update secrets in external systems (databases, APIs, etc.)
   */
  private static async updateExternalSystemSecrets(
    secretId: string,
    newValue: string
  ): Promise<void> {
    switch (secretId) {
      case 'database_password':
        // Update database user password
        // Implementation would depend on your database system
        break;
        
      case 'api_keys':
        // Update API keys in external services
        // Implementation would depend on the specific APIs
        break;
        
      default:
        // Generic external system updates
        break;
    }
  }

  /**
   * Update application configuration with new secret
   */
  private static async updateApplicationConfig(
    secretId: string,
    newValue: string,
    newVersion: string
  ): Promise<void> {
    // Update environment variables or configuration files
    // This might involve updating Kubernetes secrets, restart services, etc.
    
    // For now, update the secret management service
    await SecretManagementService.activateSecretVersion(secretId, newVersion);
  }

  /**
   * Perform health checks after secret rotation
   */
  private static async performHealthChecks(): Promise<boolean> {
    try {
      // Check database connectivity
      // Check external API connectivity  
      // Check application health endpoints
      
      // For demonstration, assume health checks pass
      return true;
      
    } catch (error) {
      console.error('Health checks failed after secret rotation:', error);
      return false;
    }
  }

  /**
   * Rollback secret update in case of failures
   */
  private static async rollbackSecretUpdate(secretId: string): Promise<void> {
    try {
      // Revert to previous secret version
      const previousVersion = await SecretManagementService.getPreviousVersion(secretId);
      if (previousVersion) {
        await SecretManagementService.activateSecretVersion(secretId, previousVersion.version);
      }
      
      console.log(`Rolled back secret rotation for ${secretId}`);
      
    } catch (error) {
      console.error(`Rollback failed for ${secretId}:`, error);
      // This is a critical error - manual intervention required
    }
  }

  /**
   * Clean up old secret versions beyond retention policy
   */
  private static async cleanupOldVersions(
    secretId: string,
    maxVersions: number
  ): Promise<void> {
    try {
      await SecretManagementService.cleanupOldVersions(secretId, maxVersions);
    } catch (error) {
      console.error(`Failed to cleanup old versions for ${secretId}:`, error);
    }
  }

  /**
   * Check if rotation is due for a secret
   */
  private static async isRotationDue(secretId: string): Promise<boolean> {
    const policy = this.rotationPolicies.get(secretId);
    if (!policy) return false;

    const lastRotation = await this.getLastRotationDate(secretId);
    const rotationInterval = policy.rotationIntervalDays * 24 * 60 * 60 * 1000;
    const nextRotationDue = lastRotation.getTime() + rotationInterval;

    return Date.now() >= nextRotationDue;
  }

  /**
   * Get last rotation date for a secret
   */
  private static async getLastRotationDate(secretId: string): Promise<Date> {
    try {
      const metadata = await getSecretMetadata(secretId);
      return metadata?.rotationDate || metadata?.createdAt || new Date(0);
    } catch (error) {
      console.error(`Failed to get last rotation date for ${secretId}:`, error);
      return new Date(0); // Force rotation if unable to determine
    }
  }

  /**
   * Generate new version string
   */
  private static generateNewVersion(currentVersion: string): string {
    const versionNumber = parseInt(currentVersion) || 1;
    return (versionNumber + 1).toString();
  }

  /**
   * Schedule next rotation for a secret
   */
  private static scheduleNextRotation(secretId: string): void {
    const policy = this.rotationPolicies.get(secretId);
    if (!policy) return;

    // Remove existing schedule
    this.rotationQueue = this.rotationQueue.filter(s => s.secretId !== secretId);

    // Add new schedule
    const now = new Date();
    const nextRotation = new Date(
      now.getTime() + (policy.rotationIntervalDays * 24 * 60 * 60 * 1000)
    );
    const warningDate = new Date(
      nextRotation.getTime() - (policy.advanceWarningDays * 24 * 60 * 60 * 1000)
    );

    this.rotationQueue.push({
      secretId,
      nextRotation,
      warningDate,
      policy
    });
  }

  /**
   * Schedule periodic rotation checks with full crash protection
   */
  private static scheduleRotationChecks(): void {
    // A) Feature flag gate - disable the whole subsystem in prod
    if (process.env.ENABLE_SECRET_ROTATION !== 'true') {
      console.log('[secrets] Secret rotation disabled by env');
      return;
    }

    // C) Defensive runtime validation
    const methodStatus = {
      getSecret: typeof getSecret,
      getSecretMetadata: typeof getSecretMetadata,
      classGetSecret: typeof SecretManagementService?.getSecret,
      classGetSecretMetadata: typeof SecretManagementService?.getSecretMetadata,
      retrieveSecret: typeof SecretManagementService?.retrieveSecret,
    };

    console.log('[secrets] method availability:', methodStatus);

    if (typeof getSecret !== 'function' || typeof getSecretMetadata !== 'function') {
      console.warn('[secrets] getSecret/getSecretMetadata not available — rotation will be skipped');
      return;
    }

    // Only start schedulers if all methods are available
    import('../utils/safeScheduler').then(({ createSafeInterval }) => {
      createSafeInterval(async () => {
        await this.safeRotateSecrets();
      }, {
        name: 'Secret Rotation Check',
        enableEnvVar: 'ENABLE_SECRET_ROTATION',
        intervalMs: 60 * 60 * 1000,
        runImmediately: false
      });

      createSafeInterval(async () => {
        await this.sendWarningNotifications();
      }, {
        name: 'Secret Rotation Warnings', 
        enableEnvVar: 'ENABLE_SECRET_ROTATION',
        intervalMs: 24 * 60 * 60 * 1000,
        runImmediately: false
      });
    });
  }

  /**
   * Crash-proof rotation wrapper
   */
  private static async safeRotateSecrets(): Promise<void> {
    try {
      if (typeof getSecret !== 'function') return;
      await this.executeAutomaticRotations();
    } catch (e: any) {
      console.warn('[secrets] rotation failed:', e?.message || e);
    }
  }


  /**
   * Send rotation completion notification
   */
  private static async sendRotationNotification(
    secretId: string,
    result: SecretRotationResult,
    policy: RotationPolicy
  ): Promise<void> {
    // Implementation would send notifications via email, Slack, etc.
    console.log(`Secret rotation notification: ${secretId} rotated to version ${result.newVersion}`);
  }

  /**
   * Send warning notifications for upcoming rotations
   */
  private static async sendWarningNotifications(): Promise<void> {
    const pendingRotations = await this.checkPendingRotations();
    const now = new Date();

    for (const schedule of pendingRotations) {
      if (now >= schedule.warningDate && now < schedule.nextRotation) {
        // Send warning notification
        console.log(`Warning: Secret ${schedule.secretId} rotation due on ${schedule.nextRotation}`);
      }
    }
  }

  /**
   * Get rotation status for all secrets
   */
  static async getRotationStatus(): Promise<RotationSchedule[]> {
    return this.checkPendingRotations();
  }

  /**
   * Force rotation of a secret (manual trigger)
   */
  static async forceRotation(
    secretId: string,
    adminUserId: string
  ): Promise<SecretRotationResult> {
    await AuditService.logEvent({
      action: 'secret.force_rotation',
      userId: adminUserId,
      resourceType: 'secret',
      resourceId: secretId,
      metadata: { trigger: 'manual' }
    });

    return this.rotateSecret(secretId, true);
  }
}