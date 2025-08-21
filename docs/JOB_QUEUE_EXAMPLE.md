# Distributed Job Queue Implementation

## Overview
Implemented BullMQ-based distributed job queue system with Redis locks and idempotency to handle background jobs safely across multiple server instances.

## Key Features
✅ **Idempotent Jobs**: Prevents duplicate processing using idempotency keys  
✅ **Distributed Locks**: Redis-based locking prevents concurrent processing  
✅ **Job Retry Logic**: Automatic retry with exponential backoff  
✅ **Progress Tracking**: Real-time job progress monitoring  
✅ **Error Handling**: Graceful failure handling and recovery  

## Usage Examples

### 1. Queue SEPA File Generation
```bash
# Queue SEPA generation job
curl -X POST https://your-app.com/api/payroll/sepa/RUN_123 \
  -H "Idempotency-Key: sepa-run-123-20250121" \
  -H "Authorization: Bearer <token>" \
  -d '{}'

# Response
{
  "status": "processing",
  "jobId": "sepa-run-123-20250121",
  "message": "SEPA generation job queued",
  "checkStatusUrl": "/api/jobs/sepa-generation/sepa-run-123-20250121/status"
}
```

### 2. Queue Payroll Processing
```bash
# Queue payroll processing job
curl -X POST https://your-app.com/api/payroll/RUN_123/process \
  -H "Idempotency-Key: payroll-run-123-batch1" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeIds": ["EMP001", "EMP002", "EMP003"],
    "payPeriodStart": "2025-01-01",
    "payPeriodEnd": "2025-01-15"
  }'

# Response
{
  "status": "processing", 
  "jobId": "payroll-run-123-batch1",
  "message": "Payroll processing queued for 3 employees",
  "checkStatusUrl": "/api/jobs/payroll-processing/payroll-run-123-batch1/status"
}
```

### 3. Queue ERGANI Sync
```bash
# Queue ERGANI synchronization job
curl -X POST https://your-app.com/api/ergani/sync/EMP001 \
  -H "Idempotency-Key: ergani-emp001-20250121" \
  -H "Content-Type: application/json" \
  -d '{
    "punchEvents": [
      {"timestamp": "2025-01-21T08:00:00Z", "type": "clock_in"},
      {"timestamp": "2025-01-21T17:00:00Z", "type": "clock_out"}
    ]
  }'
```

### 4. Check Job Status
```bash
# Check job progress and status
curl https://your-app.com/api/jobs/sepa-generation/sepa-run-123-20250121/status

# Response
{
  "jobId": "sepa-run-123-20250121",
  "queueType": "sepa-generation",
  "progress": 100,
  "status": "completed",
  "result": {
    "fileUrl": "/api/files/sepa/RUN_123.xml",
    "status": "generated",
    "payrollRunId": "RUN_123",
    "payments": 45
  },
  "completedAt": "2025-01-21T14:30:25.000Z"
}
```

## Architecture Benefits

### Before (Synchronous)
❌ Single instance processing  
❌ No failure recovery  
❌ Blocking operations  
❌ Memory-based state  
❌ Lost jobs on crash  

### After (Distributed Queue)
✅ Multi-instance processing  
✅ Automatic retry & recovery  
✅ Non-blocking operations  
✅ Redis-persisted state  
✅ Job persistence & durability  

## Technical Implementation

### Distributed Locking
```typescript
// Prevents duplicate SEPA generation across instances
const lockKey = `lock:sepa-generation:${payrollRunId}`;
const lock = await redlock.acquire([lockKey], 30000);
```

### Idempotency Protection
```typescript
// Prevents duplicate processing on retry
const idempotencyKey = `idempotent:sepa:${data.idempotencyKey}`;
const existingResult = await redis.get(idempotencyKey);
if (existingResult) {
  return null; // Already processed
}
```

### Job Retry Configuration
```typescript
defaultJobOptions: {
  attempts: 3,
  backoff: {
    type: 'exponential', 
    delay: 2000
  }
}
```

## Production Considerations

1. **Redis Scaling**: Use Redis Cluster for high availability
2. **Worker Scaling**: Scale workers independently of web servers  
3. **Monitoring**: Monitor job queues and failure rates
4. **Dead Letter Queue**: Handle permanent failures
5. **Job Cleanup**: Configure automatic cleanup of old jobs

This implementation ensures your Greek payroll system can safely scale horizontally while maintaining data integrity and preventing duplicate processing of critical financial operations.