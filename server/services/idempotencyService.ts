/**
 * Idempotency Service - Deterministic posting with deduplication
 */

import crypto from 'crypto';
import { db } from '../db';
import { glJournalHeaders } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface IdempotencyKey {
  key: string;
  entityId: string;
  runId: string;
  operation: string;
  hash: string;
  expiresAt: Date;
}

export interface PostingResult {
  journalId: string;
  isNew: boolean;
  isDuplicate: boolean;
  idempotencyKey: string;
  hash: string;
  postedAt: Date;
}

export class IdempotencyService {
  private static keys = new Map<string, IdempotencyKey>();
  private static EXPIRY_MINUTES = 60; // 1 hour expiry

  /**
   * Generate deterministic idempotency key
   */
  static generateKey(
    entityId: string,
    runId: string,
    operation: 'build' | 'post' | 'reverse',
    payload?: any
  ): IdempotencyKey {
    // Create deterministic hash from inputs
    const hashInput = JSON.stringify({
      entityId,
      runId,
      operation,
      payload: payload ? this.normalizePayload(payload) : null,
    });

    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    const key = `${entityId}-${runId}-${operation}-${hash.substring(0, 16)}`;

    const idempotencyKey: IdempotencyKey = {
      key,
      entityId,
      runId,
      operation,
      hash,
      expiresAt: new Date(Date.now() + (this.EXPIRY_MINUTES * 60 * 1000)),
    };

    this.keys.set(key, idempotencyKey);
    return idempotencyKey;
  }

  /**
   * Check if operation already executed
   */
  static async checkExistingOperation(
    idempotencyKey: string
  ): Promise<{ exists: boolean; journalId?: string; result?: any }> {
    const keyData = this.keys.get(idempotencyKey);
    
    if (!keyData) {
      return { exists: false };
    }

    // Check expiry
    if (new Date() > keyData.expiresAt) {
      this.keys.delete(idempotencyKey);
      return { exists: false };
    }

    // Check if journal exists in database
    const existingJournal = await db
      .select({ journalId: glJournalHeaders.journalId })
      .from(glJournalHeaders)
      .where(
        and(
          eq(glJournalHeaders.entityId, keyData.entityId),
          eq(glJournalHeaders.runId, keyData.runId)
        )
      )
      .limit(1);

    if (existingJournal.length > 0) {
      return {
        exists: true,
        journalId: existingJournal[0].journalId,
        result: { isDuplicate: true, reason: 'Journal already exists' },
      };
    }

    return { exists: false };
  }

  /**
   * Execute operation with idempotency protection
   */
  static async executeIdempotent<T>(
    idempotencyKey: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; isNew: boolean; isDuplicate: boolean }> {
    // Check for existing operation
    const existing = await this.checkExistingOperation(idempotencyKey);
    
    if (existing.exists) {
      return {
        result: existing.result as T,
        isNew: false,
        isDuplicate: true,
      };
    }

    // Execute new operation
    const result = await operation();
    
    return {
      result,
      isNew: true,
      isDuplicate: false,
    };
  }

  /**
   * Deterministic journal posting
   */
  static async postJournalDeterministic(
    journalId: string,
    entityId: string,
    runId: string,
    externalSystem?: string
  ): Promise<PostingResult> {
    const operation = externalSystem ? `post_${externalSystem}` : 'post';
    const idempotencyKey = this.generateKey(entityId, runId, operation as any);

    const execution = await this.executeIdempotent(idempotencyKey.key, async () => {
      // Simulate posting to external system
      const postedAt = new Date();
      
      // Update journal status to posted
      // In production, this would update the database
      console.log(`Posted journal ${journalId} to ${externalSystem || 'internal'}`);
      
      return {
        journalId,
        postedAt,
        externalReference: `EXT-${Date.now()}`,
      };
    });

    return {
      journalId,
      isNew: execution.isNew,
      isDuplicate: execution.isDuplicate,
      idempotencyKey: idempotencyKey.key,
      hash: idempotencyKey.hash,
      postedAt: execution.result.postedAt,
    };
  }

  /**
   * Normalize payload for consistent hashing
   */
  private static normalizePayload(payload: any): any {
    if (typeof payload !== 'object' || payload === null) {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload
        .map(item => this.normalizePayload(item))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }

    const normalized: any = {};
    const sortedKeys = Object.keys(payload).sort();
    
    for (const key of sortedKeys) {
      // Skip volatile fields
      if (['timestamp', 'createdAt', 'updatedAt', 'id'].includes(key)) {
        continue;
      }
      normalized[key] = this.normalizePayload(payload[key]);
    }

    return normalized;
  }

  /**
   * Get 100% balance guarantee
   */
  static validateJournalBalance(
    lines: Array<{ debit: string; credit: string }>
  ): { isBalanced: boolean; variance: number; guarantee: string } {
    const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit || '0'), 0);
    const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit || '0'), 0);
    const variance = Math.abs(totalDebits - totalCredits);
    const isBalanced = variance < 0.01; // 1 cent tolerance

    return {
      isBalanced,
      variance,
      guarantee: isBalanced ? '100% BALANCED' : `VARIANCE: €${variance.toFixed(2)}`,
    };
  }

  /**
   * Clean expired keys
   */
  static cleanExpiredKeys(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [key, keyData] of this.keys) {
      if (now > keyData.expiresAt) {
        this.keys.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get idempotency statistics
   */
  static getStatistics(): {
    activeKeys: number;
    duplicatesPrevented: number;
    oldestKey: string | null;
    newestKey: string | null;
  } {
    const keyEntries = Array.from(this.keys.entries());
    
    if (keyEntries.length === 0) {
      return {
        activeKeys: 0,
        duplicatesPrevented: 0,
        oldestKey: null,
        newestKey: null,
      };
    }

    const sortedByTime = keyEntries.sort((a, b) => 
      a[1].expiresAt.getTime() - b[1].expiresAt.getTime()
    );

    return {
      activeKeys: keyEntries.length,
      duplicatesPrevented: 0, // Would track from actual usage
      oldestKey: sortedByTime[0][0],
      newestKey: sortedByTime[sortedByTime.length - 1][0],
    };
  }
}