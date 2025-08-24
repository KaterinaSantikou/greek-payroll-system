/**
 * Safe Background Scheduler Utilities
 * Prevents process crashes from unhandled errors in setInterval tasks
 */

export type SafeJobFunction = () => void | Promise<void>;

export interface SafeSchedulerOptions {
  name: string;
  enableEnvVar?: string; // Environment variable to check (e.g., 'ENABLE_RUNBOOKS')  
  intervalMs: number;
  onError?: (error: Error) => void;
  runImmediately?: boolean;
}

/**
 * Create a safe setInterval that won't crash the process
 */
export function createSafeInterval(
  job: SafeJobFunction,
  options: SafeSchedulerOptions
): NodeJS.Timeout | null {
  
  // Check environment guard if specified
  if (options.enableEnvVar && process.env[options.enableEnvVar] !== 'true') {
    console.log(`[SCHEDULER] ${options.name} disabled by env (${options.enableEnvVar}=${process.env[options.enableEnvVar]})`);
    return null;
  }

  console.log(`[SCHEDULER] Starting ${options.name} (interval: ${options.intervalMs}ms)`);

  const safeJob = async () => {
    try {
      await job();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (options.onError) {
        try {
          options.onError(err);
        } catch (handlerError) {
          console.error(`[SCHEDULER] ${options.name} error handler failed:`, handlerError);
        }
      } else {
        console.error(`[SCHEDULER] ${options.name} job failed:`, err.message);
        console.error(`[SCHEDULER] Stack:`, err.stack);
      }
      
      // Don't rethrow - keep interval running
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