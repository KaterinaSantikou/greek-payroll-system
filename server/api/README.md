# PayrollSync API Documentation

## Overview

PayrollSync provides a comprehensive REST API for Greek HR & Payroll management with full compliance for ERGANI II, e-EFKA/APD, and AADE/ΦΜΥ government systems.

## Authentication

All API endpoints require authentication via OIDC/SAML SSO. Include the session token in requests.

### SCIM Provisioning
- **POST** `/scim/v2/Users` - Create user
- **GET** `/scim/v2/Users` - List users
- **PUT** `/scim/v2/Users/{id}` - Update user
- **DELETE** `/scim/v2/Users/{id}` - Deactivate user

## Core API Endpoints

### 1. Authentication APIs
```
GET  /api/auth/user         - Get current user info
POST /api/auth/refresh      - Refresh authentication token
POST /api/logout           - Logout and invalidate session
```

### 2. Employee Management APIs
```
GET  /api/employees                    - List employees with pagination
POST /api/employees                    - Create new employee (idempotent)
GET  /api/employees/{id}               - Get employee details
PUT  /api/employees/{id}               - Update employee info
POST /api/employees/{id}/contracts     - Create employment contract (idempotent)
GET  /api/employees/{id}/contracts     - List employee contracts
```

**Required Headers for Write Operations:**
- `Idempotency-Key: <uuid>` - Prevents duplicate processing

### 3. Time & Attendance APIs
```
POST /api/punches                      - Record punch event (idempotent)
GET  /api/timesheets                   - Query timesheets by period
GET  /api/timesheets?period=YYYY-MM    - Get monthly timesheets
POST /api/timesheets/{id}/lock         - Lock timesheet for payroll
GET  /api/punches/validation           - Get punch validation rules
```

**Punch Event Format:**
```json
{
  "employeeId": "emp_123",
  "timestamp": "2025-01-15T08:00:00Z",
  "type": "clock_in",
  "propertyId": "prop_456",
  "deviceId": "tablet_001",
  "location": {"lat": 37.9838, "lng": 23.7275}
}
```

### 4. Payroll Processing APIs
```
POST /api/payroll/runs                 - Start new payroll run (idempotent)
GET  /api/payroll/runs                 - List payroll runs
POST /api/payroll/runs/{id}/finalize   - Finalize payroll run
GET  /api/payroll/runs/{id}/audit      - Get audit trail for run
POST /api/payroll/runs/{id}/calculate  - Calculate payroll amounts
```

### 5. Government Filing APIs
```
POST /api/filings/apd                  - Submit APD filing (idempotent)
POST /api/filings/fmy                  - Submit ΦΜΥ filing (idempotent)
POST /api/filings/ergani/{event}       - Submit ERGANI event
GET  /api/filings/{id}/status          - Check filing status
GET  /api/filings/{id}/receipt         - Get government receipt
```

**ERGANI Events:**
- `hire` - New employee hire
- `schedule` - Work schedule submission
- `overtime` - Overtime pre-approval
- `termination` - Employee termination

### 6. Payment Processing APIs
```
POST /api/payments/sepa                - Generate SEPA payment file (returns pain.001)
GET  /api/payments/{id}/status         - Get payment status
POST /api/payments/validate            - Validate payment instructions
GET  /api/payments/files               - List generated payment files
```

**SEPA Response Format:**
```json
{
  "fileId": "sepa_789",
  "pain001Xml": "<Document>...</Document>",
  "totalAmount": "125840.50",
  "paymentCount": 150,
  "executionDate": "2025-01-31"
}
```

### 7. Webhook Notifications

PayrollSync sends webhook notifications for critical events:

```
timesheet.locked    - When timesheet is locked for payroll
filing.submitted    - When government filing is submitted
payment.sent        - When SEPA payment file is generated
ergani.error        - When ERGANI submission fails
```

**Webhook Payload Format:**
```json
{
  "event": "timesheet.locked",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "timesheetId": "ts_123",
    "employeeId": "emp_456",
    "period": "2025-01"
  },
  "signature": "sha256=abc123..."
}
```

### 8. System Health APIs
```
GET  /api/health                       - System health check
GET  /api/metrics                      - Performance metrics
GET  /api/compliance/status            - Compliance monitoring
```

## Request/Response Standards

### Idempotency
All write operations (POST, PUT, PATCH, DELETE) require an `Idempotency-Key` header:
```http
POST /api/employees
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

### Signed Payloads
All responses include a signature for audit compliance:
```json
{
  "data": {...},
  "meta": {
    "signature": "sha256=def456...",
    "timestamp": "2025-01-15T10:30:00Z",
    "auditId": "audit_789"
  }
}
```

### Error Responses
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "afm",
      "message": "AFM must be 9 digits"
    }
  ]
}
```

## Rate Limits

- **General APIs**: 1000 requests/hour per user
- **Punch Events**: 100 requests/minute per device
- **File Generation**: 10 requests/hour per endpoint

## Greek Compliance Features

### AFM/AMKA Validation
All employee data is validated against Greek standards:
- AFM: 9-digit tax identification number
- AMKA: 11-digit social security number

### ERGANI II Integration
Real-time synchronization with Greek labor inspection system:
- Automatic work schedule submission
- Digital work card compliance
- Overtime pre-approval workflow

### Government Filing Formats
- **APD**: Social security contribution declarations
- **ΦΜΥ**: Monthly tax withholding statements
- **ERGANI**: Labor inspection events

### SEPA Payment Compliance
- pain.001.001.03 XML format
- IBAN validation for Greek banks
- Urgent payment support (SEPA Instant)

## SDK Examples

### JavaScript/TypeScript
```typescript
import { PayrollSyncClient } from '@payrollsync/api-client';

const client = new PayrollSyncClient({
  baseURL: 'https://api.payrollsync.gr',
  apiKey: process.env.PAYROLLSYNC_API_KEY
});

// Create employee
const employee = await client.employees.create({
  firstName: 'Maria',
  lastName: 'Papadopoulos',
  afm: '123456789',
  amka: '12345678901'
}, {
  idempotencyKey: uuidv4()
});

// Record punch
await client.punches.create({
  employeeId: employee.id,
  type: 'clock_in',
  timestamp: new Date().toISOString()
}, {
  idempotencyKey: uuidv4()
});
```

### Python
```python
from payrollsync import PayrollSyncClient
import uuid

client = PayrollSyncClient(
    base_url='https://api.payrollsync.gr',
    api_key=os.getenv('PAYROLLSYNC_API_KEY')
)

# Generate SEPA payment file
payment_file = client.payments.create_sepa(
    payroll_run_id='run_123',
    execution_date='2025-01-31',
    idempotency_key=str(uuid.uuid4())
)
print(payment_file.pain001_xml)
```

## Support

For API support, contact: api-support@payrollsync.gr
Documentation updates: https://docs.payrollsync.gr