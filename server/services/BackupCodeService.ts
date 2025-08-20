/**
 * Backup Code Service for MFA
 * Generates and manages one-time backup codes for account recovery
 */

import crypto from 'crypto';
import { db } from '../db';
import { mfaBackupCodes } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface BackupCodeSet {
  codes: string[];
  generated_at: Date;
  download_count: number;
}

export class BackupCodeService {
  /**
   * Generate a set of backup codes for a user
   * Backup codes are downloadable only once for security
   */
  static async generateBackupCodes(userId: string): Promise<BackupCodeSet> {
    // Generate 10 backup codes (8 digits each)
    const codes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      // Generate 8-digit code
      const code = crypto.randomInt(10000000, 99999999).toString();
      codes.push(code);
    }

    // Store hashed versions in database
    const hashedCodes = await Promise.all(
      codes.map(async code => ({
        userId,
        codeHash: await this.hashCode(code),
        used: false,
        createdAt: new Date(),
      }))
    );

    // Replace existing backup codes with new ones
    await db.transaction(async (tx) => {
      // Delete existing codes
      await tx.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, userId));
      
      // Insert new codes
      await tx.insert(mfaBackupCodes).values(hashedCodes);
    });

    return {
      codes,
      generated_at: new Date(),
      download_count: 0,
    };
  }

  /**
   * Verify a backup code and mark it as used
   */
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const hashedCode = await this.hashCode(code);

      const [backupCode] = await db
        .select()
        .from(mfaBackupCodes)
        .where(
          and(
            eq(mfaBackupCodes.userId, userId),
            eq(mfaBackupCodes.codeHash, hashedCode),
            eq(mfaBackupCodes.used, false)
          )
        );

      if (!backupCode) {
        return false;
      }

      // Mark code as used
      await db
        .update(mfaBackupCodes)
        .set({ used: true, usedAt: new Date() })
        .where(eq(mfaBackupCodes.id, backupCode.id));

      return true;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }

  /**
   * Get remaining backup codes count for a user
   */
  static async getRemainingCodesCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql`count(*)` })
      .from(mfaBackupCodes)
      .where(
        and(
          eq(mfaBackupCodes.userId, userId),
          eq(mfaBackupCodes.used, false)
        )
      );

    return parseInt(result.count as string) || 0;
  }

  /**
   * Check if user has any backup codes
   */
  static async hasBackupCodes(userId: string): Promise<boolean> {
    const count = await this.getRemainingCodesCount(userId);
    return count > 0;
  }

  /**
   * Get backup code usage statistics for a user
   */
  static async getBackupCodeStats(userId: string): Promise<{
    total_codes: number;
    used_codes: number;
    remaining_codes: number;
    last_generated: Date | null;
    last_used: Date | null;
  }> {
    const allCodes = await db
      .select({
        used: mfaBackupCodes.used,
        createdAt: mfaBackupCodes.createdAt,
        usedAt: mfaBackupCodes.usedAt,
      })
      .from(mfaBackupCodes)
      .where(eq(mfaBackupCodes.userId, userId));

    const usedCodes = allCodes.filter(code => code.used);
    const remainingCodes = allCodes.filter(code => !code.used);

    // Find dates
    const lastGenerated = allCodes.length > 0 
      ? allCodes.reduce((latest, code) => 
          !latest || code.createdAt > latest ? code.createdAt : latest, 
          null as Date | null
        )
      : null;

    const lastUsed = usedCodes.length > 0
      ? usedCodes.reduce((latest, code) => 
          !latest || (code.usedAt && code.usedAt > latest) ? code.usedAt : latest,
          null as Date | null
        )
      : null;

    return {
      total_codes: allCodes.length,
      used_codes: usedCodes.length,
      remaining_codes: remainingCodes.length,
      last_generated: lastGenerated,
      last_used: lastUsed,
    };
  }

  /**
   * Invalidate all backup codes for a user (security measure)
   */
  static async invalidateAllCodes(userId: string): Promise<void> {
    await db.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, userId));
  }

  /**
   * Hash a backup code using Argon2id
   */
  private static async hashCode(code: string): Promise<string> {
    const { PasswordService } = await import('./PasswordService');
    const result = await PasswordService.hashPassword(code);
    return typeof result === 'string' ? result : result.hash;
  }

  /**
   * Format backup codes for display (with dashes)
   * e.g., "12345678" -> "1234-5678"
   */
  static formatCodeForDisplay(code: string): string {
    if (code.length === 8) {
      return `${code.slice(0, 4)}-${code.slice(4)}`;
    }
    return code;
  }

  /**
   * Parse user input code (remove dashes/spaces)
   */
  static parseUserInputCode(input: string): string {
    return input.replace(/[\s-]/g, '');
  }

  /**
   * Generate backup codes in a printable format
   */
  static generatePrintableFormat(codes: string[], userId: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `
PayrollSync - MFA Backup Codes
Generated: ${timestamp}
User ID: ${userId}

IMPORTANT: Keep these codes secure and private.
Each code can only be used once.

${codes.map((code, index) => 
  `${(index + 1).toString().padStart(2, '0')}. ${this.formatCodeForDisplay(code)}`
).join('\n')}

Instructions:
1. Store these codes in a secure location (password manager, safe, etc.)
2. Each code can only be used once
3. Use these codes when you cannot access your authenticator app
4. Generate new codes if you run out or if your security is compromised

Support: If you need help, contact your system administrator.
`;
  }
}

import { sql } from 'drizzle-orm';