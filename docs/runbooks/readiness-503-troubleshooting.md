# Readiness 503 Troubleshooting Runbook

## Alert: /ready endpoint returning 503

**Trigger**: `/ready` endpoint returns 503 Service Unavailable for >60 seconds
**Impact**: Service unavailable for traffic routing, deployment rollouts blocked
**Severity**: High - prevents new deployments and indicates core system issues

---

## Quick Diagnosis

### 1. Check Readiness Status
```bash
curl -s https://$DOMAIN/ready | jq
```
**Expected**: `{"status": "ready"}`  
**Problem**: `{"status": "not_ready"}` or HTTP 503

### 2. Check Health Status  
```bash
curl -s https://$DOMAIN/health | jq
```
**Expected**: `{"status": "ok", "ts": "2025-08-24T19:26:43.436Z"}`
**If failing**: Basic server/network issues

---

## Root Cause Analysis

### Database Connectivity Issues
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT NOW();"

# Check critical tables exist
psql $DATABASE_URL -c "
SELECT 'runbooks' t, COUNT(*) FROM public.runbooks
UNION ALL SELECT 'automated_runbooks', COUNT(*) FROM public.automated_runbooks  
UNION ALL SELECT 'oncall_rotas', COUNT(*) FROM public.oncall_rotas;"
```

**Common Issues**:
- Database connection timeout
- Missing tables from incomplete migrations
- Database credentials expired

### Authentication Setup Logs
```bash
# Check auth service initialization
grep "\[AUTH\]" /var/log/app.log | tail -20

# Look for these patterns:
# ✅ [AUTH][setup] Setting up authentication...
# ✅ [AUTH][setup] OIDC strategy registered successfully!
# ❌ [Core] ❌ Auth service failed: [error]
```

**Common Issues**:
- OIDC configuration failures
- Session store connection issues
- Missing REPLIT_DOMAINS or REPL_ID environment variables

### Rules Engine Initialization
```bash
# Check rules engine startup
grep "\[Core\].*Rules engine" /var/log/app.log

# Expected: [Core] ✅ Rules engine ready
# Problem: [Core] ❌ Rules engine failed: [error]
```

**Common Issues**:
- Rules validation failures
- Dependencies not loaded
- Configuration parsing errors

---

## Step-by-Step Resolution

### Step 1: Verify Core Systems
Check the startup logs for these success indicators:
```bash
grep -E "\[Boot\]|\[Core\]" /var/log/app.log | tail -30
```

**Look for**:
- `[Boot] ✅ Core systems ready - health checks will now return 200`
- `[Core] ✅ Database connection ready`
- `[Core] ✅ Rules engine ready`

### Step 2: Check Environment Variables
```bash
# Critical variables for readiness
echo "DATABASE_URL: ${DATABASE_URL:0:20}..."
echo "REPL_ID: $REPL_ID"
echo "REPLIT_DOMAINS: $REPLIT_DOMAINS"
echo "SESSION_SECRET: ${SESSION_SECRET:0:10}..."
```

### Step 3: Database Migration Check
```bash
# Run post-migration verification
npm run db:push --force

# Verify critical columns exist
psql $DATABASE_URL -c "
SELECT column_name FROM information_schema.columns
WHERE table_name='runbooks' AND column_name='dependencies';"
```

### Step 4: Restart Services
```bash
# Graceful restart
pm2 restart payrollsync

# Or container restart
docker restart $CONTAINER_ID
```

---

## Prevention

### Monitoring Setup
```bash
# Add readiness monitoring
curl -f https://$DOMAIN/ready || alert "Readiness check failed"

# Set up continuous monitoring
*/1 * * * * curl -f https://$DOMAIN/ready > /dev/null || logger "ALERT: Readiness failing"
```

### Deployment Gates
```yaml
# Example deployment gate
readiness_check:
  url: https://$DOMAIN/ready
  expected_status: 200
  expected_body: '{"status":"ready"}'
  timeout: 30s
  retries: 3
```

### Health Check Configuration
```yaml
# Container orchestration health checks
health_check:
  test: ["CMD", "curl", "-f", "http://localhost:5000/ready"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

---

## Escalation

### If Issue Persists (>15 minutes)
1. **Roll back** to last known good deployment
2. **Page on-call engineer** if business hours
3. **Create incident** in incident management system

### Contact Information
- **Primary**: DevOps Team
- **Secondary**: Backend Engineering Team  
- **Escalation**: CTO/Engineering Manager

---

## Post-Incident

### Required Actions
1. **Root cause analysis** - Document what caused the 503
2. **Update monitoring** - Add checks to prevent recurrence  
3. **Review deployment** - Verify deployment process didn't miss steps
4. **Update runbook** - Add any new troubleshooting steps discovered

### Prevention Improvements
- Add pre-deployment readiness verification
- Improve error messages in startup logs
- Add automated rollback triggers
- Enhanced monitoring of core system components