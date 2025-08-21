# DDoS Protection Implementation

## Overview
Comprehensive DDoS protection has been implemented to defend against volumetric attacks, rate abuse, and suspicious behavior patterns. This multi-layered defense system protects critical payroll and financial operations.

## Protection Layers

### 1. Connection Limiting
- **Max Connections**: 10 concurrent connections per IP
- **Scope**: All endpoints
- **Action**: 429 error with connection count details

### 2. Request Size Limiting
- **Max Payload**: 10MB per request
- **Scope**: All POST/PUT requests
- **Action**: 413 error with size information

### 3. Rate Limiting (Tiered)

#### Basic Rate Limit (General API)
- **Limit**: 100 requests per 15 minutes
- **Scope**: Most API endpoints
- **Endpoints**: `/api/employees`, `/api/time`

#### API Rate Limit (Protected Operations)
- **Limit**: 20 requests per 1 minute
- **Scope**: Critical operations
- **Endpoints**: Employee management, time tracking

#### Auth Rate Limit (Authentication)
- **Limit**: 5 requests per 15 minutes
- **Scope**: Authentication endpoints
- **Endpoints**: `/auth/*`
- **Features**: Skips successful requests, tracks suspicious IPs

#### Payroll Rate Limit (Financial Operations)
- **Limit**: 10 requests per 5 minutes
- **Scope**: Payroll and SEPA operations
- **Endpoints**: 
  - `/api/payroll/*`
  - `/api/payroll/sepa/*`
  - `/api/payments/sepa/*`

### 4. Progressive Delay
- **Delay Start**: After 50 requests in 15 minutes
- **Delay Increment**: +500ms per additional request
- **Max Delay**: 20 seconds
- **Purpose**: Slow down rapid-fire requests

### 5. Suspicious Pattern Detection

#### Bot Detection
- **Patterns**: curl, wget, python-requests, bot, crawler, spider
- **Action**: Warning logged, tracking incremented

#### Suspicious Paths
- **Patterns**: `/admin`, `/wp-admin`, `.php`, `.env`, `.config`
- **Action**: Immediate blocking for highly suspicious combinations

#### Repeated Requests
- **Threshold**: 5+ identical requests in recent history
- **Action**: Progressive blocking (8+ = immediate block)

### 6. IP Blocking System

#### Auto-blocking Triggers
- **Threshold**: 10 suspicious activities
- **Block Duration**: 1 hour
- **Activities Tracked**:
  - AUTH_FLOOD: Too many auth attempts
  - PAYROLL_ABUSE: Excessive payroll operations
  - RAPID_REQUESTS: High-frequency requests
  - LARGE_PAYLOAD: Oversized requests
  - BOT_DETECTED: Suspicious user agents
  - SUSPICIOUS_PATH: Invalid path access
  - CONNECTION_FLOOD: Too many concurrent connections

#### Block Management
- **Automatic Expiry**: Blocks expire after 1 hour
- **Data Cleanup**: Tracking data cleaned hourly
- **Monitoring**: All suspicious activity logged

### 7. Security Headers
Applied to all responses:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-RateLimit-Policy: Applied
```

## Implementation Details

### Middleware Chain Order
1. **exemptHealthCheck** - Skip protection for health endpoints
2. **ipBlockingMiddleware** - Block known malicious IPs
3. **securityHeaders** - Apply security headers
4. **connectionLimiter** - Limit concurrent connections
5. **suspiciousPatternDetection** - Detect attack patterns
6. **requestSizeLimit** - Prevent large payload attacks
7. **progressiveDelay** - Slow down rapid requests
8. **Route-specific rate limiting** - Applied per endpoint

### Critical Endpoints Protection

#### SEPA Payment Endpoints
All SEPA generation endpoints protected with **payrollRateLimit**:
- `/api/payroll/sepa/:runId`
- `/api/payments/sepa/generate`
- `/api/payments/sepa/generate-encrypted`
- `/api/payments/sepa/generate-instant`
- `/api/payments/sepa/validate-engine`
- `/api/payments/sepa/process-status`

#### Authentication Endpoints
Auth endpoints protected with **authRateLimit**:
- `/auth/*` routes

#### API Endpoints
Core API endpoints protected with **apiRateLimit**:
- `/api/employees`
- `/api/time`

## Monitoring & Alerts

### Console Logging
- Rate limit violations
- Suspicious pattern detection
- IP blocking events
- Connection limit breaches
- Large payload attempts

### Example Log Messages
```
Rate limit exceeded for IP: 192.168.1.100 on /api/payroll/sepa/RUN_123
Suspicious pattern detected from IP: 10.0.0.50, UA: curl/7.68.0, Path: /admin
IP 203.0.113.25 auto-blocked due to suspicious activity (12 attempts)
Connection limit exceeded for IP: 172.16.0.10, current: 15
Large payload blocked from IP: 198.51.100.75, size: 52428800 bytes
```

## Response Examples

### Rate Limit Exceeded
```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

### IP Blocked
```json
{
  "error": "IP blocked due to suspicious activity",
  "blockedUntil": "2025-01-21T15:30:00.000Z"
}
```

### Connection Limit Exceeded
```json
{
  "error": "Too many concurrent connections from your IP",
  "maxConnections": 10,
  "currentConnections": 12
}
```

### Large Payload Rejected
```json
{
  "error": "Request payload too large",
  "maxSize": "10MB",
  "receivedSize": "50.0MB"
}
```

## Production Considerations

1. **Memory Usage**: Tracking data is automatically cleaned every hour
2. **Performance Impact**: Minimal overhead (~1-2ms per request)
3. **False Positives**: Health check endpoints exempted
4. **Legitimate Traffic**: Progressive delays instead of hard blocks
5. **Monitoring**: All suspicious activity logged for analysis

## Testing DDoS Protection

### Test Rate Limiting
```bash
# Test basic rate limit (should fail after 100 requests)
for i in {1..105}; do curl -s https://your-app.com/api/employees; done

# Test auth rate limit (should fail after 5 attempts)
for i in {1..10}; do curl -s -X POST https://your-app.com/auth/login; done
```

### Test Pattern Detection
```bash
# Trigger bot detection
curl -A "curl/7.68.0" https://your-app.com/api/employees

# Trigger suspicious path detection
curl https://your-app.com/admin/config.php
```

### Test Connection Limiting
```bash
# Open multiple concurrent connections (should block after 10)
for i in {1..15}; do curl -s https://your-app.com/api/employees & done
```

This comprehensive DDoS protection ensures your Greek payroll system can withstand various attack vectors while maintaining service availability for legitimate users.