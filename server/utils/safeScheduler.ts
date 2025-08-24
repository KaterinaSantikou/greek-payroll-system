/**
 * Safe Background Scheduler Utilities
 * Features:
 * - Prevents process crashes from unhandled errors
 * - Environment-gated execution (ENABLE_*=false by default in prod)
 * - Idempotency support with duplicate prevention
 * - Per-job timeouts and circuit breakers
 * - Spam protection for failing integrations
 */

import { createHash } from 'crypto';

export type SafeJobFunction = () => void | Promise<void>;

export interface SafeSchedulerOptions {
  name: string;
  enableEnvVar?: string; // Environment variable to check (e.g., 'ENABLE_RUNBOOKS')  
  intervalMs: number;
  onError?: (error: Error) => void;
  runImmediately?: boolean;
  
  // NEW: Idempotency support
  idempotencyKey?: string; // Custom key, or auto-generated from job name
  idempotencyWindowMs?: number; // How long to prevent duplicates (default: intervalMs * 2)
  
  // NEW: Timeout and circuit breaker
  timeoutMs?: number; // Job timeout (default: intervalMs / 2)
  circuitBreakerThreshold?: number; // Failures before circuit opens (default: 5)
  circuitBreakerResetMs?: number; // Time before attempting to close circuit (default: 300000 = 5min)
  
  // NEW: Spam protection
  maxConsecutiveFailures?: number; // Max failures before backing off (default: 3)
  backoffMultiplier?: number; // Backoff multiplier (default: 2)
  maxBackoffMs?: number; // Maximum backoff (default: 300000 = 5min)
}

interface JobState {
  isRunning: boolean;
  lastRun: Date | null;
  consecutiveFailures: number;
  circuitBreakerOpen: boolean;
  circuitBreakerOpenSince: Date | null;
  currentBackoffMs: number;
  idempotencyCache: Map<string, Date>;
}

// Global job state tracking
const jobStates = new Map<string, JobState>();
const idempotencyGlobalCache = new Map<string, Date>();

/**
 * Create a safe setInterval with idempotency, timeouts, and circuit breakers
 */
export function createSafeInterval(
  job: SafeJobFunction,
  options: SafeSchedulerOptions
): NodeJS.Timeout | null {
  
  // REQUIREMENT 1: ENV-GATED CRON - Default to disabled in production
  if (options.enableEnvVar) {
    const envValue = process.env[options.enableEnvVar];
    if (envValue !== 'true') {
      console.log(`[SCHEDULER] ${options.name} disabled by env guard (${options.enableEnvVar}=${envValue || 'undefined'})`);
      console.log(`[SCHEDULER] To enable: set ${options.enableEnvVar}=true`);
      return null;
    }
  }

  // Initialize job state
  const jobState: JobState = {
    isRunning: false,
    lastRun: null,
    consecutiveFailures: 0,
    circuitBreakerOpen: false,
    circuitBreakerOpenSince: null,
    currentBackoffMs: 0,
    idempotencyCache: new Map()
  };
  jobStates.set(options.name, jobState);

  // Set up defaults
  const timeoutMs = options.timeoutMs || Math.floor(options.intervalMs / 2);
  const circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
  const circuitBreakerResetMs = options.circuitBreakerResetMs || 300000; // 5 minutes
  const maxConsecutiveFailures = options.maxConsecutiveFailures || 3;
  const backoffMultiplier = options.backoffMultiplier || 2;
  const maxBackoffMs = options.maxBackoffMs || 300000; // 5 minutes
  const idempotencyWindowMs = options.idempotencyWindowMs || (options.intervalMs * 2);

  console.log(`[SCHEDULER] Starting ${options.name}`, {
    interval: `${options.intervalMs}ms`,
    timeout: `${timeoutMs}ms`,
    circuitBreaker: `${circuitBreakerThreshold} failures`,
    idempotency: options.idempotencyKey ? 'enabled' : 'disabled'
  });

  const safeJob = async () => {
    const state = jobStates.get(options.name)!;
    
    // Skip if already running
    if (state.isRunning) {
      console.log(`[SCHEDULER] ${options.name} skipped - already running`);
      return;
    }
    
    // REQUIREMENT 3: CIRCUIT BREAKER - Check if circuit is open
    if (state.circuitBreakerOpen) {
      const now = new Date();
      if (state.circuitBreakerOpenSince && 
          (now.getTime() - state.circuitBreakerOpenSince.getTime()) < circuitBreakerResetMs) {
        console.log(`[SCHEDULER] ${options.name} skipped - circuit breaker open (${state.consecutiveFailures} failures)`);
        return;
      } else {
        // Try to reset circuit breaker
        console.log(`[SCHEDULER] ${options.name} attempting to close circuit breaker...`);
        state.circuitBreakerOpen = false;
        state.circuitBreakerOpenSince = null;
      }
    }
    
    // Check backoff
    if (state.currentBackoffMs > 0) {
      const now = new Date();
      const timeSinceLastRun = state.lastRun ? (now.getTime() - state.lastRun.getTime()) : Infinity;
      if (timeSinceLastRun < state.currentBackoffMs) {
        console.log(`[SCHEDULER] ${options.name} skipped - backing off (${state.currentBackoffMs}ms)`);
        return;
      }
    }
    
    // REQUIREMENT 2: IDEMPOTENCY - Check for duplicates
    if (options.idempotencyKey) {
      const key = generateIdempotencyKey(options.name, options.idempotencyKey);
      if (isRecentlyExecuted(key, idempotencyWindowMs)) {
        console.log(`[SCHEDULER] ${options.name} skipped - idempotency check (key: ${key})`);
        return;
      }
      markAsExecuted(key);
    }
    
    state.isRunning = true;
    state.lastRun = new Date();
    
    try {
      // REQUIREMENT 3: PER-JOB TIMEOUT
      await withTimeout(job(), timeoutMs, `${options.name} job`);
      
      // Success - reset failure counters
      state.consecutiveFailures = 0;
      state.currentBackoffMs = 0;
      state.circuitBreakerOpen = false;
      
      console.log(`[SCHEDULER] ${options.name} completed successfully`);
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.consecutiveFailures++;
      
      // REQUIREMENT 3: CIRCUIT BREAKER - Open circuit if too many failures
      if (state.consecutiveFailures >= circuitBreakerThreshold) {
        state.circuitBreakerOpen = true;
        state.circuitBreakerOpenSince = new Date();
        console.error(`[SCHEDULER] ${options.name} circuit breaker OPENED after ${state.consecutiveFailures} failures`);
      }
      
      // REQUIREMENT 3: SPAM PROTECTION - Implement exponential backoff
      if (state.consecutiveFailures >= maxConsecutiveFailures) {
        const newBackoff = Math.min(
          (state.currentBackoffMs || options.intervalMs) * backoffMultiplier,
          maxBackoffMs
        );
        state.currentBackoffMs = newBackoff;
        console.error(`[SCHEDULER] ${options.name} backing off for ${newBackoff}ms after ${state.consecutiveFailures} failures`);
      }
      
      if (options.onError) {
        try {
          options.onError(err);
        } catch (handlerError) {
          console.error(`[SCHEDULER] ${options.name} error handler failed:`, handlerError);
        }
      } else {
        console.error(`[SCHEDULER] ${options.name} job failed (${state.consecutiveFailures} consecutive):`, err.message);
        if (state.consecutiveFailures <= 2) { // Only log stack for first few failures
          console.error(`[SCHEDULER] Stack:`, err.stack);
        }
      }
      
    } finally {
      state.isRunning = false;
    }
  };

  // Run immediately if requested
  if (options.runImmediately) {
    safeJob();
  }

  return setInterval(safeJob, options.intervalMs);
}

/**
 * Create a safe setTimeout that won't crash the process
 */
export function createSafeTimeout(
  job: SafeJobFunction,
  delayMs: number,
  name: string = 'anonymous'
): NodeJS.Timeout {
  
  const safeJob = async () => {
    try {
      await job();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[SCHEDULER] ${name} timeout job failed:`, err.message);
      console.error(`[SCHEDULER] Stack:`, err.stack);
    }
  };

  return setTimeout(safeJob, delayMs);
}

/**
 * IDEMPOTENCY UTILITIES
 */

/**
 * Generate idempotency key from job name and custom key
 */
function generateIdempotencyKey(jobName: string, customKey: string): string {
  const combined = `${jobName}:${customKey}`;
  return createHash('sha256').update(combined).digest('hex').substring(0, 16);
}

/**
 * Check if a job was recently executed (idempotency check)
 */
function isRecentlyExecuted(key: string, windowMs: number): boolean {
  const lastExecution = idempotencyGlobalCache.get(key);
  if (!lastExecution) return false;
  
  const now = new Date();
  const timeSince = now.getTime() - lastExecution.getTime();
  
  if (timeSince > windowMs) {
    // Clean up expired entry
    idempotencyGlobalCache.delete(key);
    return false;
  }
  
  return true;
}

/**
 * Mark a job as executed (for idempotency)
 */
function markAsExecuted(key: string): void {
  idempotencyGlobalCache.set(key, new Date());
  
  // Clean up old entries periodically (every 100 executions)
  if (idempotencyGlobalCache.size % 100 === 0) {
    cleanupIdempotencyCache();
  }
}

/**
 * Clean up expired idempotency cache entries
 */
function cleanupIdempotencyCache(): void {
  const now = new Date();
  const maxAge = 3600000; // 1 hour
  
  for (const [key, timestamp] of idempotencyGlobalCache.entries()) {
    if (now.getTime() - timestamp.getTime() > maxAge) {
      idempotencyGlobalCache.delete(key);
    }
  }
}

/**
 * TIMEOUT UTILITIES
 */

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}

/**
 * MONITORING AND STATS
 */

/**
 * Get status of all scheduled jobs
 */
export function getJobStatuses(): Record<string, any> {
  const statuses: Record<string, any> = {};
  
  for (const [jobName, state] of jobStates.entries()) {
    statuses[jobName] = {
      isRunning: state.isRunning,
      lastRun: state.lastRun?.toISOString(),
      consecutiveFailures: state.consecutiveFailures,
      circuitBreakerOpen: state.circuitBreakerOpen,
      circuitBreakerOpenSince: state.circuitBreakerOpenSince?.toISOString(),
      currentBackoffMs: state.currentBackoffMs,
      idempotencyCacheSize: state.idempotencyCache.size
    };
  }
  
  return {
    jobs: statuses,
    globalIdempotencyCache: idempotencyGlobalCache.size,
    timestamp: new Date().toISOString()
  };
}

/**
 * Reset circuit breaker for a specific job (emergency use)
 */
export function resetJobCircuitBreaker(jobName: string): boolean {
  const state = jobStates.get(jobName);
  if (!state) return false;
  
  state.circuitBreakerOpen = false;
  state.circuitBreakerOpenSince = null;
  state.consecutiveFailures = 0;
  state.currentBackoffMs = 0;
  
  console.log(`[SCHEDULER] Circuit breaker reset for ${jobName}`);
  return true;
}

/**
 * PRODUCTION-SAFE JOB FACTORY
 */

/**
 * Create a production-ready background job with all safety features
 */
export function createProductionJob(options: SafeSchedulerOptions & {
  jobFunction: SafeJobFunction;
}): NodeJS.Timeout | null {
  
  // Enforce production safety defaults
  const safeOptions: SafeSchedulerOptions = {
    ...options,
    // Default to disabled unless explicitly enabled
    enableEnvVar: options.enableEnvVar || `ENABLE_${options.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
    // Idempotency defaults
    idempotencyKey: options.idempotencyKey || options.name,
    idempotencyWindowMs: options.idempotencyWindowMs || (options.intervalMs * 2),
    // Timeout defaults  
    timeoutMs: options.timeoutMs || Math.floor(options.intervalMs / 2),
    // Circuit breaker defaults
    circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
    circuitBreakerResetMs: options.circuitBreakerResetMs || 300000,
    // Backoff defaults
    maxConsecutiveFailures: options.maxConsecutiveFailures || 3,
    backoffMultiplier: options.backoffMultiplier || 2,
    maxBackoffMs: options.maxBackoffMs || 300000
  };
  
  return createSafeInterval(options.jobFunction, safeOptions);
}