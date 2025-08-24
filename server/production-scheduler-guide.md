# Production Background Scheduler Guide

## Environment Variables to Control Schedulers

Set these in your production environment to enable specific background jobs:

### Security & Cleanup Schedulers
```bash
ENABLE_SECURITY_CLEANUP=true    # Brute force cleanup (every hour)
ENABLE_CACHE_CLEANUP=true       # Idempotency cache cleanup (every hour)
ENABLE_WEBAUTHN_CLEANUP=true    # WebAuthn challenge cleanup (every minute)
ENABLE_ANALYTICS_CLEANUP=true   # Analytics events cleanup (every hour)
ENABLE_PERF_CLEANUP=true        # Performance metrics cleanup (every hour)
```

### Business Logic Schedulers
```bash
ENABLE_STATUS_MONITORING=true   # System status monitoring (every 30 seconds)
ENABLE_SECRET_ROTATION=true     # Secret rotation checks (hourly/daily)
ENABLE_EVENT_QUEUE=true         # Event queue processing (every second)
```

### Development Safety
```bash
# In development, leave these unset to disable expensive operations
# Only set them to "true" in production when you need the functionality
```

## Safe Scheduler Features

✅ **Crash-proof**: All intervals wrapped in try/catch blocks
✅ **Environment gated**: Disabled by default unless explicitly enabled  
✅ **Error logging**: Detailed error reporting without process termination
✅ **Configurable**: Can be enabled/disabled per environment
✅ **Zero-downtime**: Process never crashes due to background job errors

## Usage in Code

```javascript
import { createSafeInterval } from '../utils/safeScheduler';

createSafeInterval(jobFunction, {
  name: 'My Background Job',
  enableEnvVar: 'ENABLE_MY_JOB',    // Required environment variable
  intervalMs: 60000,                // Interval in milliseconds
  runImmediately: false             // Whether to run immediately on start
});
```

## Production Deployment Checklist

1. ✅ Set appropriate environment variables for your use case
2. ✅ Monitor logs for scheduler activity: `[SCHEDULER] Job Name started/disabled`
3. ✅ Verify no process crashes from background job errors
4. ✅ Adjust intervals in production if needed (via environment variables)