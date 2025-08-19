import { Request, Response, NextFunction } from "express";
import { createHmac } from "crypto";
import { nanoid } from "nanoid";

/**
 * Audit logging middleware for compliance tracking
 * Creates signed payloads for all write operations
 */
export const auditLogMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only audit write operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const auditId = nanoid();
  const timestamp = new Date().toISOString();
  const userId = (req.user as any)?.claims?.sub || 'anonymous';
  
  // Create audit log entry
  const auditData = {
    auditId,
    timestamp,
    userId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.body,
    idempotencyKey: req.headers['idempotency-key']
  };

  // Sign the payload for integrity verification
  const secret = process.env.AUDIT_SIGNING_SECRET || 'default-secret-change-in-production';
  const signature = createHmac('sha256', secret)
    .update(JSON.stringify(auditData))
    .digest('hex');

  // Store audit data in request for access in handlers
  (req as any).auditData = {
    ...auditData,
    signature
  };

  // Override response methods to capture response data
  const originalJson = res.json;
  const originalSend = res.send;
  let responseBody: any;
  let statusCode = 200;

  res.status = function(code: number) {
    statusCode = code;
    return res;
  };

  res.json = function(body: any) {
    responseBody = body;
    logAuditEntry(auditData, signature, statusCode, body);
    return originalJson.call(this, body);
  };

  res.send = function(body: any) {
    responseBody = body;
    logAuditEntry(auditData, signature, statusCode, body);
    return originalSend.call(this, body);
  };

  next();
};

/**
 * Log audit entry (in production, this would go to a secure audit log service)
 */
function logAuditEntry(auditData: any, signature: string, statusCode: number, responseBody: any) {
  const completeAuditLog = {
    ...auditData,
    signature,
    response: {
      statusCode,
      body: responseBody,
      timestamp: new Date().toISOString()
    }
  };

  // In production, send to secure audit log service
  console.log('AUDIT_LOG:', JSON.stringify(completeAuditLog));
  
  // Store in database for compliance reporting
  // await storeAuditLog(completeAuditLog);
}

/**
 * Verify audit signature for integrity checking
 */
export function verifyAuditSignature(auditData: any, signature: string): boolean {
  const secret = process.env.AUDIT_SIGNING_SECRET || 'default-secret-change-in-production';
  const expectedSignature = createHmac('sha256', secret)
    .update(JSON.stringify(auditData))
    .digest('hex');
  
  return signature === expectedSignature;
}