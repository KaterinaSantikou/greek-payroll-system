# Network Security & Firewall Implementation

## Overview
Comprehensive network security and firewall rules have been implemented to eliminate overly permissive network access and establish strict security controls. The system now uses multi-layered security with IP whitelisting, geo-blocking, and network access restrictions.

## Architecture

### Security Layers (Applied in Order)
1. **IP Blacklisting** - Block known malicious IPs and ranges
2. **Geo-blocking** - Block requests from high-risk countries  
3. **User Agent Validation** - Block security tools and malicious bots
4. **Protocol Security** - Enforce HTTPS for sensitive endpoints
5. **Network Request Validation** - Validate request size and headers
6. **DDoS Protection** - Rate limiting and abuse prevention

## Network Access Controls

### Office Network Restrictions
**Administrative endpoints** require office network access:
- `/api/security/*` - Security audit and compliance endpoints
- All admin operations restricted to office IP ranges

### Financial Network Security
**Financial endpoints** require trusted network access (office OR banking partners):
- `/api/payroll/*` - All payroll operations
- `/api/payroll-engine/*` - Payroll calculation engine
- `/api/payments/sepa/*` - All SEPA payment operations

### Trusted Networks Configuration

#### Development Environment
```typescript
officeNetworks: [
  '127.0.0.1/32',        // Localhost
  '192.168.0.0/16',      // Private networks
  '10.0.0.0/8',
  '172.16.0.0/12'
]
```

#### Production Environment
```typescript
officeNetworks: [
  '203.0.113.0/24',      // Office network 1
  '198.51.100.0/24',     // Office network 2
],
trustedExternal: [
  // Greek Banking Networks
  '194.177.192.0/24',    // National Bank of Greece
  '195.251.0.0/16',      // Alpha Bank
  '212.205.0.0/16',      // Piraeus Bank
  
  // Government Systems
  '62.75.216.0/24',      // ERGANI II system
  '195.130.105.0/24',    // e-EFKA system  
  '83.138.144.0/24',     // AADE tax system
]
```

## Geo-blocking

### Blocked Countries (Production)
- **CN** - China
- **RU** - Russia  
- **KP** - North Korea
- **IR** - Iran
- **SY** - Syria
- **AF** - Afghanistan
- **IQ** - Iraq
- **LY** - Libya
- **YE** - Yemen
- **SO** - Somalia

### Implementation
```javascript
// Geo-blocking response
{
  "error": "Access denied from your location",
  "code": "GEO_BLOCKED", 
  "message": "Access from this geographic region is not permitted"
}
```

## IP Security

### Blocked IP Ranges
- `0.0.0.0/8` - Invalid range
- `224.0.0.0/4` - Multicast range  
- `240.0.0.0/4` - Reserved range
- Known malicious networks (dynamically updated)

### Threat Intelligence
- Real-time IP reputation tracking
- Automatic blocking after 10+ suspicious activities
- 7-day threat data retention

## User Agent Security

### Blocked Patterns
- Security scanning tools: `nmap`, `sqlmap`, `nikto`, `dirb`, `burp`
- Attack frameworks: `metasploit`, `hydra`, `masscan`
- Automated tools: `curl`, `wget`, `python-requests`, `bot`, `crawler`

### Browser Validation
Legitimate browser access validated against allowed patterns:
- Chrome: `Mozilla/5.0.*Chrome/\d+`
- Firefox: `Mozilla/5.0.*Firefox/\d+`
- Safari: `Mozilla/5.0.*Safari/\d+`
- Edge: `Mozilla/5.0.*Edge/\d+`

## Protocol Security

### HTTPS Enforcement
Sensitive endpoints require HTTPS in production:
- `/api/auth/*` - Authentication endpoints
- `/api/payroll/*` - Payroll operations
- `/api/payments/*` - Payment processing
- `/api/employees/*` - Employee data
- `/api/admin/*` - Administrative functions

### Suspicious Header Detection
- Multiple proxy chain detection (>2 proxy headers)
- Missing User-Agent warnings for API requests
- Invalid header combination analysis

## Configuration Management

### Environment-Based Configuration
```typescript
// server/config/networkSecurity.ts
export function getNetworkSecurityConfig(): NetworkSecurityConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production': return productionConfig;
    case 'test': return testConfig; 
    case 'development': return developmentConfig;
  }
}
```

### Rate Limits by Environment

#### Development (Relaxed)
- Basic API: 1000 requests/15min
- Authentication: 50 requests/15min
- Payroll: 100 requests/5min

#### Production (Strict)
- Basic API: 100 requests/15min
- Authentication: 5 requests/15min
- Payroll: 10 requests/5min

## Response Examples

### IP Not Whitelisted
```json
{
  "error": "Access denied",
  "code": "IP_NOT_WHITELISTED",
  "message": "Your IP address is not authorized to access this resource"
}
```

### Geographic Blocking
```json
{
  "error": "Access denied from your location", 
  "code": "GEO_BLOCKED",
  "message": "Access from this geographic region is not permitted"
}
```

### Network Restriction
```json
{
  "error": "Financial access restricted",
  "code": "FINANCIAL_NETWORK_RESTRICTED", 
  "message": "Financial operations require access from trusted networks only"
}
```

### Admin Network Restriction
```json
{
  "error": "Admin access restricted",
  "code": "ADMIN_NETWORK_RESTRICTED",
  "message": "Administrative functions can only be accessed from authorized networks"
}
```

### HTTPS Required
```json
{
  "error": "HTTPS Required",
  "code": "INSECURE_PROTOCOL",
  "message": "This endpoint requires a secure HTTPS connection"
}
```

## Monitoring & Logging

### Security Events Logged
- IP blacklist violations with threat levels
- Geo-blocking activations with country codes
- Admin access denials with IP addresses  
- Financial operation denials with network info
- Suspicious User-Agent detections
- Protocol security violations

### Log Examples
```
🚨 IP blacklist hit: 203.0.113.25 - threat level 9
🚨 Geo-blocking activated for IP: 198.51.100.10 from country: CN
🚨 Admin access denied for IP: 172.16.0.100 - not from office network
🚨 Financial operation denied for IP: 10.0.0.50 - not from trusted network
🚨 Blocked User-Agent: nmap from IP: 192.168.1.100
🚨 Insecure access to sensitive endpoint: /api/payroll from IP: 203.0.113.75
```

## Testing Network Security

### Test IP Whitelisting
```bash
# Should succeed from office network
curl -H "Authorization: Bearer <token>" https://app.com/api/security/audit

# Should fail from external network
curl -H "Authorization: Bearer <token>" https://app.com/api/security/audit
# Response: {"error":"Admin access restricted","code":"ADMIN_NETWORK_RESTRICTED"}
```

### Test Geo-blocking
```bash
# Simulate request from blocked country (would be blocked in production)
curl -H "CF-IPCountry: CN" https://app.com/api/employees
# Response: {"error":"Access denied from your location","code":"GEO_BLOCKED"}
```

### Test User Agent Blocking
```bash
# Should be blocked
curl -A "nmap" https://app.com/api/employees  
# Response: {"error":"Access denied","code":"USER_AGENT_BLOCKED"}

# Should succeed  
curl -A "Mozilla/5.0 Chrome/120.0" https://app.com/api/employees
```

### Test Financial Network Security
```bash
# Should fail from untrusted network
curl -X POST https://app.com/api/payroll/sepa/RUN_123
# Response: {"error":"Financial access restricted","code":"FINANCIAL_NETWORK_RESTRICTED"}
```

## Production Deployment

### Required Configuration Updates
1. **Update office IP ranges** in `server/config/networkSecurity.ts`
2. **Add banking partner IPs** to `trustedExternal` array  
3. **Enable geo-blocking** by setting `enableGeoBlocking: true`
4. **Enable HTTPS enforcement** by setting `enforceHTTPS: true`
5. **Configure real geo-IP service** instead of mock implementation

### Security Checklist
- [ ] Office network ranges configured correctly
- [ ] Banking partner IPs added to trusted networks
- [ ] High-risk countries added to block list
- [ ] HTTPS enforcement enabled for production
- [ ] Geo-IP service integrated (MaxMind/IPStack)
- [ ] Threat intelligence feeds configured
- [ ] Monitoring and alerting set up
- [ ] Penetration testing completed

This implementation transforms the previously permissive network access into a hardened, multi-layered security system that protects critical Greek payroll and financial operations while maintaining usability for legitimate users.