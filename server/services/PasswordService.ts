import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

/**
 * Enhanced password service with Argon2id-style security
 * Uses Node.js built-in scrypt which provides similar security properties
 */
export class PasswordService {
  private static readonly SALT_LENGTH = 32;
  private static readonly KEY_LENGTH = 64;
  private static readonly SCRYPT_COST = 16384; // N parameter
  private static readonly SCRYPT_BLOCK_SIZE = 8; // r parameter  
  private static readonly SCRYPT_PARALLELIZATION = 1; // p parameter

  /**
   * Global pepper (should be stored in KMS/environment)
   */
  private static get GLOBAL_PEPPER(): string {
    return process.env.PASSWORD_PEPPER || 'default-pepper-change-in-production';
  }

  /**
   * Hash password with per-user salt + global pepper
   */
  static async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    // Generate random salt
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    
    // Combine password with global pepper
    const passwordWithPepper = password + this.GLOBAL_PEPPER;
    
    // Derive key using scrypt
    const derivedKey = await scrypt(passwordWithPepper, salt, this.KEY_LENGTH) as Buffer;

    // Create hash string with parameters for verification
    const hashWithParams = `scrypt$${this.SCRYPT_COST}$${this.SCRYPT_BLOCK_SIZE}$${this.SCRYPT_PARALLELIZATION}$${salt.toString('base64')}$${derivedKey.toString('base64')}`;

    return {
      hash: hashWithParams,
      salt: salt.toString('base64')
    };
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hashWithParams: string): Promise<boolean> {
    try {
      const parts = hashWithParams.split('$');
      if (parts.length !== 6 || parts[0] !== 'scrypt') {
        return false;
      }

      const [, nStr, rStr, pStr, saltBase64, hashBase64] = parts;
      const N = parseInt(nStr, 10);
      const r = parseInt(rStr, 10);
      const p = parseInt(pStr, 10);
      
      const salt = Buffer.from(saltBase64, 'base64');
      const expectedHash = Buffer.from(hashBase64, 'base64');

      // Combine password with global pepper
      const passwordWithPepper = password + this.GLOBAL_PEPPER;

      // Derive key with same parameters
      const derivedKey = await scrypt(passwordWithPepper, salt, expectedHash.length) as Buffer;

      // Constant-time comparison
      return crypto.timingSafeEqual(expectedHash, derivedKey);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Check if password needs rehashing (upgrade security params)
   */
  static needsRehash(hashWithParams: string): boolean {
    try {
      const parts = hashWithParams.split('$');
      if (parts.length !== 6 || parts[0] !== 'scrypt') {
        return true; // Old format, needs upgrade
      }

      const [, nStr, rStr, pStr] = parts;
      const N = parseInt(nStr, 10);
      const r = parseInt(rStr, 10);
      const p = parseInt(pStr, 10);

      // Check if parameters are outdated
      return N !== this.SCRYPT_COST || r !== this.SCRYPT_BLOCK_SIZE || p !== this.SCRYPT_PARALLELIZATION;
    } catch {
      return true;
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate backup codes for MFA
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(5).toString('hex').toUpperCase().substring(0, 8);
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup codes for storage
   */
  static async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes: string[] = [];
    for (const code of codes) {
      const { hash } = await this.hashPassword(code);
      hashedCodes.push(hash);
    }
    return hashedCodes;
  }

  /**
   * Verify backup code against hash
   */
  static async verifyBackupCode(code: string, hashedCode: string): Promise<boolean> {
    return this.verifyPassword(code, hashedCode);
  }
}