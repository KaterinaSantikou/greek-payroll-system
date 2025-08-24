/**
 * Secret Management Service
 * Handles secure storage and retrieval of secrets with KMS/Vault integration
 */

import crypto from 'crypto';

export interface SecretMetadata {
  id: string;
  version: string;
  createdAt: Date;
  rotationDate?: Date;
  encrypted: boolean;
}

export interface VaultConfig {
  endpoint: string;
  token: string;
  mountPath: string;
}

export class SecretManagementService {
  private static encryptionKey: Buffer;
  private static vaultConfig: VaultConfig | null = null;

  /**
   * Initialize secret management service
   */
  static initialize() {
    // Initialize encryption key for local secret encryption
    const keyString = process.env.MASTER_ENCRYPTION_KEY;
    if (!keyString) {
      console.warn('MASTER_ENCRYPTION_KEY not set - generating temporary key');
      this.encryptionKey = crypto.randomBytes(32);
    } else {
      this.encryptionKey = Buffer.from(keyString, 'base64');
    }

    // Initialize Vault configuration if available
    if (process.env.VAULT_ENDPOINT && process.env.VAULT_TOKEN) {
      this.vaultConfig = {
        endpoint: process.env.VAULT_ENDPOINT,
        token: process.env.VAULT_TOKEN,
        mountPath: process.env.VAULT_MOUNT_PATH || 'secret',
      };
    }
  }

  /**
   * Encrypt secret locally using AES-256-GCM
   */
  static encryptSecret(plaintext: string): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    if (!this.encryptionKey) {
      this.initialize();
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    cipher.setAAD(Buffer.from('payrollsync-secret'));

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  /**
   * Decrypt secret locally
   */
  static decryptSecret(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
  }): string {
    if (!this.encryptionKey) {
      this.initialize();
    }

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAAD(Buffer.from('payrollsync-secret'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'base64'));

    let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store secret in Vault (if configured) or encrypted locally
   */
  static async storeSecret(
    key: string,
    value: string,
    metadata: Partial<SecretMetadata> = {}
  ): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
      if (this.vaultConfig) {
        return await this.storeInVault(key, value, metadata);
      } else {
        return await this.storeLocally(key, value, metadata);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Retrieve secret from Vault or local storage
   */
  static async retrieveSecret(
    key: string,
    version?: string
  ): Promise<{ success: boolean; value?: string; metadata?: SecretMetadata; error?: string }> {
    try {
      if (this.vaultConfig) {
        return await this.retrieveFromVault(key, version);
      } else {
        return await this.retrieveLocally(key, version);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Store secret in HashiCorp Vault
   */
  private static async storeInVault(
    key: string,
    value: string,
    metadata: Partial<SecretMetadata>
  ): Promise<{ success: boolean; version?: string; error?: string }> {
    if (!this.vaultConfig) {
      throw new Error('Vault not configured');
    }

    try {
      const fetchFn: typeof fetch = (globalThis as any).fetch ?? (await import('node-fetch')).default;
      
      const response = await fetchFn(
        `${this.vaultConfig.endpoint}/v1/${this.vaultConfig.mountPath}/${key}`,
        {
          method: 'POST',
          headers: {
            'X-Vault-Token': this.vaultConfig.token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              value,
              metadata: {
                ...metadata,
                createdAt: new Date().toISOString(),
                encrypted: false, // Vault handles encryption
              },
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Vault API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        version: result.data?.version || '1',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieve secret from HashiCorp Vault
   */
  private static async retrieveFromVault(
    key: string,
    version?: string
  ): Promise<{ success: boolean; value?: string; metadata?: SecretMetadata; error?: string }> {
    if (!this.vaultConfig) {
      throw new Error('Vault not configured');
    }

    try {
      const fetchFn: typeof fetch = (globalThis as any).fetch ?? (await import('node-fetch')).default;
      
      const url = version 
        ? `${this.vaultConfig.endpoint}/v1/${this.vaultConfig.mountPath}/${key}?version=${version}`
        : `${this.vaultConfig.endpoint}/v1/${this.vaultConfig.mountPath}/${key}`;

      const response = await fetchFn(url, {
        headers: {
          'X-Vault-Token': this.vaultConfig.token,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Secret not found' };
        }
        throw new Error(`Vault API error: ${response.status}`);
      }

      const result = await response.json();
      const secretData = result.data?.data;

      return {
        success: true,
        value: secretData?.value,
        metadata: secretData?.metadata,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Store secret locally (encrypted)
   */
  private static async storeLocally(
    key: string,
    value: string,
    metadata: Partial<SecretMetadata>
  ): Promise<{ success: boolean; version?: string; error?: string }> {
    // In production, store in encrypted database table
    // For now, simulate local storage
    const encrypted = this.encryptSecret(value);
    const version = Date.now().toString();

    const secretData = {
      ...encrypted,
      metadata: {
        id: key,
        version,
        createdAt: new Date(),
        encrypted: true,
        ...metadata,
      },
    };

    // Store in memory for demo (in production, use encrypted database)
    const storageKey = `local_secret_${key}_${version}`;
    (global as any).localSecrets = (global as any).localSecrets || new Map();
    (global as any).localSecrets.set(storageKey, secretData);

    return {
      success: true,
      version,
    };
  }

  /**
   * Retrieve secret from local storage
   */
  private static async retrieveLocally(
    key: string,
    version?: string
  ): Promise<{ success: boolean; value?: string; metadata?: SecretMetadata; error?: string }> {
    (global as any).localSecrets = (global as any).localSecrets || new Map();

    let secretData;

    if (version) {
      const storageKey = `local_secret_${key}_${version}`;
      secretData = (global as any).localSecrets.get(storageKey);
    } else {
      // Find latest version
      const keys = Array.from((global as any).localSecrets.keys()).filter((k: any) => 
        typeof k === 'string' && k.startsWith(`local_secret_${key}_`)
      ) as string[];
      
      if (keys.length === 0) {
        return { success: false, error: 'Secret not found' };
      }

      const latestKey = keys.sort().pop();
      secretData = (global as any).localSecrets.get(latestKey);
    }

    if (!secretData) {
      return { success: false, error: 'Secret not found' };
    }

    try {
      const decryptedValue = this.decryptSecret({
        encrypted: secretData.encrypted,
        iv: secretData.iv,
        tag: secretData.tag,
      });

      return {
        success: true,
        value: decryptedValue,
        metadata: secretData.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to decrypt secret',
      };
    }
  }

  /**
   * Rotate secret (generate new version)
   */
  static async rotateSecret(key: string): Promise<{
    success: boolean;
    newVersion?: string;
    error?: string;
  }> {
    try {
      // Retrieve current secret
      const current = await this.retrieveSecret(key);
      if (!current.success || !current.value) {
        return { success: false, error: 'Current secret not found' };
      }

      // Generate new secret value (in production, this would be more sophisticated)
      const newValue = crypto.randomBytes(32).toString('base64');

      // Store new version
      const result = await this.storeSecret(key, newValue, {
        rotationDate: new Date(),
      });

      if (result.success) {
        console.log(`Secret ${key} rotated successfully`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List all secrets (metadata only)
   */
  static async listSecrets(): Promise<{
    success: boolean;
    secrets?: SecretMetadata[];
    error?: string;
  }> {
    try {
      if (this.vaultConfig) {
        return await this.listFromVault();
      } else {
        return await this.listLocal();
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List secrets from Vault
   */
  private static async listFromVault(): Promise<{
    success: boolean;
    secrets?: SecretMetadata[];
    error?: string;
  }> {
    // Implementation would depend on Vault version and setup
    return { success: false, error: 'Vault list not implemented' };
  }

  /**
   * List local secrets
   */
  private static async listLocal(): Promise<{
    success: boolean;
    secrets?: SecretMetadata[];
    error?: string;
  }> {
    (global as any).localSecrets = (global as any).localSecrets || new Map();
    
    const secrets: SecretMetadata[] = [];
    for (const [key, data] of (global as any).localSecrets.entries()) {
      if (data.metadata) {
        secrets.push(data.metadata);
      }
    }

    return {
      success: true,
      secrets,
    };
  }

  /**
   * Validate secret management configuration
   */
  static validateConfiguration(): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
    usingVault: boolean;
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if Vault is configured
    const usingVault = !!this.vaultConfig;

    if (!usingVault) {
      recommendations.push('Consider using HashiCorp Vault for production secret management');
      
      if (!process.env.MASTER_ENCRYPTION_KEY) {
        issues.push('MASTER_ENCRYPTION_KEY not configured for local secret encryption');
      }
    } else {
      // Vault-specific validation
      if (!this.vaultConfig!.token) {
        issues.push('Vault token not configured');
      }
      
      if (!this.vaultConfig!.endpoint.startsWith('https://') && process.env.NODE_ENV === 'production') {
        issues.push('Vault endpoint should use HTTPS in production');
      }
    }

    // Check for secrets in environment variables (security risk)
    const dangerousEnvVars = [
      'DATABASE_PASSWORD',
      'JWT_SECRET',
      'OAUTH_CLIENT_SECRET',
      'STRIPE_SECRET_KEY',
      'SMTP_PASSWORD',
    ];

    for (const envVar of dangerousEnvVars) {
      if (process.env[envVar]) {
        recommendations.push(`Move ${envVar} from environment variables to secret management system`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
      usingVault,
    };
  }

  // --- Back-compat adapter methods ---

  /** BACK-COMPAT: return just the plaintext value or null */
  static async getSecret(key: string): Promise<string | null> {
    const r = await this.retrieveSecret(key);
    return r.success ? (r.value ?? null) : null;
  }

  /** BACK-COMPAT: return metadata (or null) */
  static async getSecretMetadata(key: string): Promise<SecretMetadata | null> {
    const r = await this.retrieveSecret(key);
    return r.success ? (r.metadata ?? null) : null;
  }
}

// add default export so default imports work too
export default SecretManagementService;