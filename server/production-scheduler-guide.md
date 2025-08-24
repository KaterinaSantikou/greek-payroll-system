# Production Background Scheduler Guide - ENHANCED ✨

## Environment Variables to Control Schedulers

Set these in your production environment to enable specific background jobs:

### NEW: Government System Integration (PRIORITY)
```bash
ENABLE_GOVERNMENT_MONITORING=false   # ERGANI/e-EFKA/AADE status monitoring (every 30s)
ENABLE_ERGANI_SUBMISSION=false       # Automated payroll submission (every 5min)  
ENABLE_EMAIL_QUEUE=false             # Email notification processing (every 10s)
ENABLE_DB_CLEANUP=false              # Database maintenance (every hour)
```

### Security & Cleanup Schedulers
```bash
ENABLE_SECURITY_CLEANUP=false       # Brute force cleanup (every hour) - CHANGED DEFAULT
ENABLE_CACHE_CLEANUP=false          # Idempotency cache cleanup (every hour) - CHANGED DEFAULT
ENABLE_WEBAUTHN_CLEANUP=false       # WebAuthn challenge cleanup (every minute) - CHANGED DEFAULT
ENABLE_ANALYTICS_CLEANUP=false      # Analytics events cleanup (every hour) - CHANGED DEFAULT
ENABLE_PERF_CLEANUP=false           # Performance metrics cleanup (every hour) - CHANGED DEFAULT
```

### Business Logic Schedulers
```bash
ENABLE_STATUS_MONITORING=false  # System status monitoring (every 30 seconds) - CHANGED DEFAULT
ENABLE_SECRET_ROTATION=false    # Secret rotation checks (hourly/daily) - CHANGED DEFAULT
ENABLE_EVENT_QUEUE=false        # Event queue processing (every second) - CHANGED DEFAULT
```

### 🚨 PRODUCTION SAFETY: ALL DISABLED BY DEFAULT
```bash
# 🔒 SECURE DEFAULT: All background jobs disabled until explicitly verified
# ✅ Enable only what you need: Set specific jobs to "true" after testing
# 🛡️ Prevents resource drain and unexpected behavior in production
# 📊 Monitor via: /api/background-jobs/status endpoint
```

## 🎯 NEW: Enhanced Safe Scheduler Features

✅ **REQUIREMENT 1: Env-gated cron** - All jobs disabled by default (ENABLE_*=false)
✅ **REQUIREMENT 2: Idempotency** - Jobs tolerate retries, no duplicate incidents/emails  
✅ **REQUIREMENT 3: Circuit breakers** - Per-job timeouts, failing integrations don't spam logs
✅ **Crash-proof**: All intervals wrapped in comprehensive try/catch blocks
✅ **Environment gated**: Disabled by default unless explicitly enabled  
✅ **Error logging**: Detailed error reporting without process termination
✅ **Configurable**: Can be enabled/disabled per environment
✅ **Zero-downtime**: Process never crashes due to background job errors
✅ **Spam protection**: Exponential backoff for failing integrations
✅ **Monitoring**: Real-time job status via API endpoints

## 🔧 NEW: Enhanced Usage in Code

### Simple Jobs (Basic Safety)
```javascript
import { createSafeInterval } from '../utils/safeScheduler';

createSafeInterval(jobFunction, {
  name: 'My Background Job',
  enableEnvVar: 'ENABLE_MY_JOB',    // Required environment variable
  intervalMs: 60000,                // Interval in milliseconds
  runImmediately: false             // Whether to run immediately on start
});
```

### Production Jobs (Full Safety Features)
```javascript  
import { createProductionJob } from '../utils/safeScheduler';

createProductionJob({
  name: 'GovernmentStatusMonitoring',
  enableEnvVar: 'ENABLE_GOVERNMENT_MONITORING', // REQUIREMENT 1: Env-gated
  intervalMs: 30000, // 30 seconds
  timeoutMs: 15000,  // 15 second timeout
  
  // REQUIREMENT 2: Idempotency - prevent duplicates
  idempotencyKey: 'gov-status-check',
  idempotencyWindowMs: 60000, // Don't duplicate within 1 minute
  
  // REQUIREMENT 3: Circuit breaker for failing APIs
  circuitBreakerThreshold: 3, // Open after 3 failures
  circuitBreakerResetMs: 300000, // Try again after 5 minutes
  maxConsecutiveFailures: 2,
  
  jobFunction: async () => {
    // Your job logic here
    console.log('Checking government systems...');
  }
});
```

## 🚀 NEW: Production Deployment Checklist

### Pre-Deployment Safety
1. ✅ **All jobs disabled by default** - Verify ENABLE_*=false for all background jobs
2. ✅ **Review job requirements** - Enable only jobs critical for your deployment
3. ✅ **Test individual jobs** - Enable one job at a time and monitor behavior
4. ✅ **Verify monitoring** - Ensure /api/background-jobs/status endpoint is accessible

### Environment Configuration  
1. ✅ Set environment variables: Only enable jobs you've verified work correctly
2. ✅ Monitor startup logs: `[SCHEDULER] Job Name started/disabled`  
3. ✅ Check circuit breakers: Verify jobs handle API failures gracefully
4. ✅ Verify idempotency: Confirm no duplicate incidents/emails are created

### Production Monitoring
1. ✅ **Job Status API**: GET /api/background-jobs/status (monitor job health)
2. ✅ **Environment Status**: GET /api/background-jobs/environment-status (check ENABLE_* vars)
3. ✅ **Health Check**: GET /api/background-jobs/health (overall scheduler health)
4. ✅ **Circuit Breaker Reset**: POST /api/background-jobs/reset-circuit-breaker (emergency use)

### Observability Logs
```bash
[SCHEDULER] GovernmentStatusMonitoring disabled by env guard (ENABLE_GOVERNMENT_MONITORING=undefined)
[SCHEDULER] To enable: set ENABLE_GOVERNMENT_MONITORING=true
[SCHEDULER] ERGANIPayrollSubmission completed successfully  
[SCHEDULER] EmailQueueProcessor circuit breaker OPENED after 5 failures
[SCHEDULER] DatabaseCleanup backing off for 60000ms after 3 failures
```

### Emergency Procedures
- **All jobs failing**: Check database connectivity and API endpoints
- **Circuit breaker open**: Use reset API or wait for automatic reset (5-15min)
- **Spam in logs**: Jobs are backing off automatically - identify root cause
- **Process crash**: Impossible with new framework - jobs are crash-proof