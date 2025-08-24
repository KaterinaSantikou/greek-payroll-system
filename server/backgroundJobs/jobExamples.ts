// =============================================================================
// BACKGROUND JOB EXAMPLES - PRODUCTION-READY IMPLEMENTATIONS  
// =============================================================================

import { createProductionJob } from '../utils/safeScheduler.js';

/**
 * Example implementations showing all 3 requirements:
 * 1. Env-gated cron: disable nonessential jobs in prod until verified (ENABLE_*=false)
 * 2. Idempotency: jobs should tolerate retries (no duplicate incidents/emails)  
 * 3. Per-job timeouts and circuit breakers so one failing integration doesn't spam logs
 */

/**
 * EXAMPLE 1: Government System Status Monitoring
 * - Env-gated: ENABLE_GOVERNMENT_MONITORING=true required
 * - Idempotent: Won't create duplicate incidents for same outage
 * - Circuit breaker: Stops checking if API is consistently down
 */
export function startGovernmentStatusMonitoring() {
  return createProductionJob({
    name: 'GovernmentStatusMonitoring',
    enableEnvVar: 'ENABLE_GOVERNMENT_MONITORING', // REQUIREMENT 1: Env-gated
    intervalMs: 30000, // 30 seconds
    timeoutMs: 15000, // 15 second timeout
    
    // REQUIREMENT 2: Idempotency - prevent duplicate incidents
    idempotencyKey: 'gov-status-check',
    idempotencyWindowMs: 60000, // Don't duplicate checks within 1 minute
    
    // REQUIREMENT 3: Circuit breaker for failing API
    circuitBreakerThreshold: 3, // Open after 3 failures
    circuitBreakerResetMs: 300000, // Try again after 5 minutes
    maxConsecutiveFailures: 2,
    
    jobFunction: async () => {
      console.log('[GOV_MONITOR] Checking ERGANI, e-EFKA, AADE status...');
      
      const systems = [
        { name: 'ERGANI', url: 'https://ergani.gov.gr/api/status' },
        { name: 'e-EFKA', url: 'https://e-efka.gov.gr/api/health' },
        { name: 'AADE', url: 'https://aade.gr/api/status' }
      ];
      
      for (const system of systems) {
        try {
          // Simulate API check with timeout protection (handled by framework)
          const response = await fetch(system.url, { 
            method: 'GET',
            signal: AbortSignal.timeout(10000) // Additional API-level timeout
          });
          
          if (!response.ok) {
            throw new Error(`${system.name} returned ${response.status}`);
          }
          
          console.log(`[GOV_MONITOR] ✅ ${system.name} is operational`);
          
        } catch (error) {
          console.error(`[GOV_MONITOR] ❌ ${system.name} check failed:`, error.message);
          
          // Here you would create incident (with idempotency to prevent duplicates)
          await createIncidentIfNotExists(system.name, error.message);
        }
      }
    }
  });
}

/**
 * EXAMPLE 2: Automated Payroll Submission to ERGANI
 * - Env-gated: ENABLE_ERGANI_SUBMISSION=true required  
 * - Idempotent: Won't resubmit already processed payrolls
 * - Circuit breaker: Backs off if ERGANI API is down
 */
export function startERGANIPayrollSubmission() {
  return createProductionJob({
    name: 'ERGANIPayrollSubmission', 
    enableEnvVar: 'ENABLE_ERGANI_SUBMISSION', // REQUIREMENT 1: Env-gated
    intervalMs: 300000, // 5 minutes
    timeoutMs: 120000, // 2 minute timeout for submissions
    
    // REQUIREMENT 2: Idempotency - based on payroll period
    idempotencyKey: getCurrentPayrollPeriod(), // e.g., "2025-01" 
    idempotencyWindowMs: 3600000, // Don't reprocess same period within 1 hour
    
    // REQUIREMENT 3: Circuit breaker for ERGANI API
    circuitBreakerThreshold: 5, // ERGANI can be flaky
    circuitBreakerResetMs: 900000, // Try again after 15 minutes
    maxConsecutiveFailures: 3,
    backoffMultiplier: 3, // More aggressive backoff for external API
    
    jobFunction: async () => {
      console.log('[ERGANI] Processing pending payroll submissions...');
      
      // Get payrolls that need submission (idempotency handled at DB level)
      const pendingPayrolls = await getPendingERGANISubmissions();
      
      if (pendingPayrolls.length === 0) {
        console.log('[ERGANI] No pending submissions');
        return;
      }
      
      console.log(`[ERGANI] Found ${pendingPayrolls.length} pending submissions`);
      
      for (const payroll of pendingPayrolls) {
        try {
          // Submit to ERGANI with idempotency key
          await submitToERGANI(payroll, {
            idempotencyKey: `ergani-${payroll.id}-${payroll.submissionHash}`
          });
          
          console.log(`[ERGANI] ✅ Submitted payroll ${payroll.id}`);
          
        } catch (error) {
          console.error(`[ERGANI] ❌ Failed to submit payroll ${payroll.id}:`, error.message);
          
          // Mark for retry (circuit breaker will prevent spam)
          await markPayrollSubmissionFailed(payroll.id, error.message);
        }
      }
    }
  });
}

/**
 * EXAMPLE 3: Email Notification Queue Processor  
 * - Env-gated: ENABLE_EMAIL_QUEUE=true required
 * - Idempotent: Won't send duplicate emails to same recipient
 * - Circuit breaker: Stops sending if SMTP is down
 */
export function startEmailQueueProcessor() {
  return createProductionJob({
    name: 'EmailQueueProcessor',
    enableEnvVar: 'ENABLE_EMAIL_QUEUE', // REQUIREMENT 1: Env-gated
    intervalMs: 10000, // 10 seconds
    timeoutMs: 30000, // 30 second timeout
    
    // REQUIREMENT 2: Idempotency - based on email content hash
    idempotencyKey: 'email-batch',
    idempotencyWindowMs: 30000, // Don't process same batch within 30 seconds
    
    // REQUIREMENT 3: Circuit breaker for SMTP
    circuitBreakerThreshold: 10, // Allow more failures for email
    circuitBreakerResetMs: 600000, // Try again after 10 minutes
    maxConsecutiveFailures: 5,
    
    jobFunction: async () => {
      console.log('[EMAIL] Processing email queue...');
      
      // Get pending emails (with built-in deduplication)
      const pendingEmails = await getPendingEmails(50); // Batch of 50
      
      if (pendingEmails.length === 0) {
        return; // No emails to send
      }
      
      console.log(`[EMAIL] Processing ${pendingEmails.length} emails`);
      
      for (const email of pendingEmails) {
        try {
          // Check if already sent recently (additional idempotency)
          const emailHash = generateEmailHash(email);
          if (await isEmailRecentlySent(emailHash)) {
            console.log(`[EMAIL] Skipping duplicate email to ${email.to}`);\n            continue;
          }
          
          // Send email
          await sendEmail(email);
          
          // Mark as sent with hash
          await markEmailSent(email.id, emailHash);
          
          console.log(`[EMAIL] ✅ Sent email to ${email.to}`);
          
        } catch (error) {
          console.error(`[EMAIL] ❌ Failed to send email ${email.id}:`, error.message);
          
          // Mark for retry (circuit breaker will prevent spam)
          await markEmailFailed(email.id, error.message);
        }
      }
    }
  });
}

/**
 * EXAMPLE 4: Database Cleanup Job
 * - Env-gated: ENABLE_DB_CLEANUP=true required
 * - Idempotent: Won't delete same records twice
 * - Timeout: Long-running cleanup operations have timeout protection
 */
export function startDatabaseCleanup() {
  return createProductionJob({
    name: 'DatabaseCleanup',
    enableEnvVar: 'ENABLE_DB_CLEANUP', // REQUIREMENT 1: Env-gated
    intervalMs: 3600000, // 1 hour
    timeoutMs: 600000, // 10 minute timeout for DB operations
    
    // REQUIREMENT 2: Idempotency - based on cleanup date
    idempotencyKey: getCurrentCleanupDate(), // e.g., "2025-01-24"
    idempotencyWindowMs: 7200000, // Don't cleanup same date within 2 hours
    
    // Circuit breaker for DB issues
    circuitBreakerThreshold: 3,
    circuitBreakerResetMs: 1800000, // Try again after 30 minutes
    
    jobFunction: async () => {
      console.log('[CLEANUP] Starting database cleanup...');
      
      // Cleanup operations with built-in idempotency
      await Promise.all([
        cleanupExpiredSessions(),
        cleanupOldAuditLogs(),  
        cleanupExpiredTokens(),
        cleanupOldIdempotencyCache()
      ]);
      
      console.log('[CLEANUP] Database cleanup completed');
    }
  });
}

// ============================================================================
// HELPER FUNCTIONS (Mock implementations for examples)
// ============================================================================

function getCurrentPayrollPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getCurrentCleanupDate(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

async function createIncidentIfNotExists(systemName: string, error: string) {
  // Mock: Create incident with idempotency key to prevent duplicates
  console.log(`[INCIDENT] Creating incident for ${systemName}: ${error}`);
}

async function getPendingERGANISubmissions() {
  // Mock: Get payrolls that need ERGANI submission
  return [];
}

async function submitToERGANI(payroll: any, options: any) {
  // Mock: Submit to ERGANI with idempotency
  console.log(`Submitting payroll ${payroll.id} to ERGANI`);
}

async function markPayrollSubmissionFailed(payrollId: string, error: string) {
  // Mock: Mark payroll submission as failed for retry
  console.log(`Marking payroll ${payrollId} as failed: ${error}`);
}

async function getPendingEmails(limit: number) {
  // Mock: Get pending emails from queue
  return [];
}

function generateEmailHash(email: any): string {
  // Mock: Generate hash of email content to prevent duplicates
  return 'mock-hash';
}

async function isEmailRecentlySent(hash: string): Promise<boolean> {
  // Mock: Check if email with same content was recently sent
  return false;
}

async function sendEmail(email: any) {
  // Mock: Send email via SMTP
  console.log(`Sending email to ${email.to}`);
}

async function markEmailSent(emailId: string, hash: string) {
  // Mock: Mark email as sent
  console.log(`Email ${emailId} sent successfully`);
}

async function markEmailFailed(emailId: string, error: string) {
  // Mock: Mark email as failed
  console.log(`Email ${emailId} failed: ${error}`);
}

async function cleanupExpiredSessions() {
  console.log('Cleaning up expired sessions...');
}

async function cleanupOldAuditLogs() {
  console.log('Cleaning up old audit logs...');
}

async function cleanupExpiredTokens() {
  console.log('Cleaning up expired tokens...');
}

async function cleanupOldIdempotencyCache() {
  console.log('Cleaning up old idempotency cache...');
}