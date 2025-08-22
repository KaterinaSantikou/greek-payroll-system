import { db } from '../db';
import { rateLimits } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';

export interface RateLimitConfig {
  attempts: number;
  windowMinutes: number;
  blockDurationMinutes?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetAt: Date;
  totalAttempts: number;
  blocked?: boolean;
  retryAfter?: number; // seconds
}

export class RateLimitService {
  private static readonly CONFIGS: Record<string, RateLimitConfig> = {
    'login': { attempts: 5, windowMinutes: 5, blockDurationMinutes: 15 },
    'signup': { attempts: 10, windowMinutes: 60 },
    'forgot-password': { attempts: 3, windowMinutes: 60 },
    'magic-link': { attempts: 3, windowMinutes: 60 },
    'mfa-verify': { attempts: 5, windowMinutes: 15 },
    'email-verify': { attempts: 5, windowMinutes: 60 },
  };

  /**
   * Check and update rate limit for IP + endpoint
   */
  static async checkRateLimit(
    ipAddress: string,
    endpoint: string,
    email?: string
  ): Promise<RateLimitResult> {
    const config = this.CONFIGS[endpoint];
    if (!config) {
      return { allowed: true, remainingAttempts: 999, resetAt: new Date(), totalAttempts: 0 };
    }

    // Create composite key: IP+endpoint or email+endpoint
    const key = email ? `${email}:${endpoint}` : `${ipAddress}:${endpoint}`;
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - (config.windowMinutes * 60 * 1000));

    // Clean up expired entries
    await db.delete(rateLimits).where(lt(rateLimits.resetAt, windowStart));

    // Get current rate limit record
    const [existing] = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.key, key));

    if (!existing) {
      // First attempt
      const resetAt = new Date(now.getTime() + (config.windowMinutes * 60 * 1000));
      await db.insert(rateLimits).values({
        key,
        attempts: 1,
        resetAt,
      });

      return {
        allowed: true,
        remainingAttempts: config.attempts - 1,
        resetAt,
        totalAttempts: 1,
      };
    }

    // Check if window has expired
    if (existing.resetAt < now) {
      // Reset window
      const resetAt = new Date(now.getTime() + (config.windowMinutes * 60 * 1000));
      await db
        .update(rateLimits)
        .set({ attempts: 1, resetAt })
        .where(eq(rateLimits.key, key));

      return {
        allowed: true,
        remainingAttempts: config.attempts - 1,
        resetAt,
        totalAttempts: 1,
      };
    }

    // Increment attempts
    const newAttempts = existing.attempts + 1;
    await db
      .update(rateLimits)
      .set({ attempts: newAttempts })
      .where(eq(rateLimits.key, key));

    const remainingAttempts = Math.max(0, config.attempts - newAttempts);
    const allowed = newAttempts <= config.attempts;

    const result: RateLimitResult = {
      allowed,
      remainingAttempts,
      resetAt: existing.resetAt,
      totalAttempts: newAttempts,
    };

    // If blocked and has block duration, calculate retry after
    if (!allowed && config.blockDurationMinutes) {
      const blockUntil = new Date(now.getTime() + (config.blockDurationMinutes * 60 * 1000));
      result.blocked = true;
      result.retryAfter = Math.ceil((blockUntil.getTime() - now.getTime()) / 1000);
      
      // Update reset time to block duration
      await db
        .update(rateLimits)
        .set({ resetAt: blockUntil })
        .where(eq(rateLimits.key, key));
      
      result.resetAt = blockUntil;
    }

    return result;
  }

  /**
   * Reset rate limit for a key (useful after successful operations)
   */
  static async resetRateLimit(ipAddress: string, endpoint: string, email?: string): Promise<void> {
    const key = email ? `${email}:${endpoint}` : `${ipAddress}:${endpoint}`;
    await db.delete(rateLimits).where(eq(rateLimits.key, key));
  }

  /**
   * Get exponential backoff delay in seconds
   */
  static getExponentialBackoff(attemptNumber: number): number {
    // Base delay: 1 second, doubles each attempt, max 300 seconds (5 minutes)
    return Math.min(Math.pow(2, attemptNumber - 1), 300);
  }

  /**
   * Check if CAPTCHA should be triggered
   */
  static shouldTriggerCaptcha(endpoint: string, attempts: number): boolean {
    const thresholds: Record<string, number> = {
      'login': 3,
      'signup': 5,
      'forgot-password': 2,
    };

    return attempts >= (thresholds[endpoint] || 3);
  }

  /**
   * Clean up expired rate limit entries (run periodically)
   */
  static async cleanupExpired(): Promise<number> {
    const result = await db
      .delete(rateLimits)
      .where(lt(rateLimits.resetAt, new Date()));

    return Array.isArray(result) ? result.length : 0;
  }
}