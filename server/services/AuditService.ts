import { db } from '../db';
import { authAuditLogs, hashChainedAuditLog } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface AuditEvent {
  userId?: string;
  sessionId?: string;
  eventType: 'login_success' | 'login_failed' | 'signup' | 'email_verification' | 'password_reset' | 
            'password_change' | 'mfa_setup' | 'mfa_challenge' | 'mfa_success' | 'mfa_failed' |
            'session_created' | 'session_expired' | 'session_revoked' | 'sso_login' |
            'account_locked' | 'account_unlocked' | 'suspicious_activity';
  ipAddress?: string;
  userAgent?: string;
  email?: string;
  result: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface GeneralAuditEvent {
  eventType: string;
  eventCategory: string;
  eventAction: string;
  tenantId: string;
  partnerFirmId?: string;
  userId: string;
  eventData: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  email?: string;
  result?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Log general business operation event to hash-chained audit log
   */
  static async logEvent(event: GeneralAuditEvent): Promise<string> {
    try {
      // Get the latest log entry to create chain
      const [latestEntry] = await db
        .select()
        .from(hashChainedAuditLog)
        .orderBy(hashChainedAuditLog.sequenceNumber)
        .limit(1);

      const sequenceNumber = (latestEntry?.sequenceNumber || 0) + 1;
      const previousHash = latestEntry?.chainHash || '0';

      // Create event hash
      const eventHash = this.createEventHash(event, sequenceNumber);

      // Create chain hash
      const chainHash = this.createChainHash(previousHash, eventHash);

      // Insert audit log entry
      const [logEntry] = await db
        .insert(hashChainedAuditLog)
        .values({
          sequenceNumber,
          eventType: event.eventType,
          eventCategory: event.eventCategory,
          eventAction: event.eventAction,
          tenantId: event.tenantId,
          partnerFirmId: event.partnerFirmId,
          userId: event.userId,
          eventData: event.eventData,
          eventHash,
          previousHash,
          chainHash,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          sessionId: event.sessionId,
          requestId: event.requestId,
        })
        .returning();

      return logEntry.id;

    } catch (error) {
      console.error('Error logging audit event:', error);
      throw new Error('Failed to log audit event');
    }
  }

  /**
   * Create hash for a general event
   */
  private static createEventHash(event: GeneralAuditEvent, sequenceNumber: number): string {
    const data = {
      sequenceNumber,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      eventAction: event.eventAction,
      tenantId: event.tenantId,
      partnerFirmId: event.partnerFirmId,
      userId: event.userId,
      eventData: event.eventData,
      timestamp: new Date().toISOString(),
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Create chain hash linking to previous entry
   */
  private static createChainHash(previousHash: string, currentHash: string): string {
    return crypto
      .createHash('sha256')
      .update(previousHash + currentHash)
      .digest('hex');
  }

  /**
   * Log authentication audit event with PII redaction (legacy method)
   */
  static async logAuthEvent(event: AuditEvent, correlationId?: string): Promise<void> {
    try {
      const maskedEmail = event.email ? this.maskEmail(event.email) : undefined;
      const safeMetadata = this.redactPII(event.metadata || {});

      await db.insert(authAuditLogs).values({
        id: correlationId || crypto.randomUUID(),
        userId: event.userId,
        sessionId: event.sessionId,
        action: event.eventType,
        method: 'authentication',
        result: event.result,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent ? this.truncateUserAgent(event.userAgent) : undefined,
        metadata: {
          email: maskedEmail,
          reason: event.reason,
          severity: event.severity || 'info',
          ...safeMetadata,
        },
        riskScore: this.calculateRiskScore(event),
      });

      // Emit security alert for critical events
      if (event.severity === 'critical' || this.shouldAlert(event)) {
        await this.emitSecurityAlert(event, correlationId);
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging failures shouldn't break user flows
    }
  }

  /**
   * Mask email address for PII compliance (m***@d***.gr)
   */
  private static maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '***@***.***';

    const maskedLocal = localPart.length > 1 
      ? localPart[0] + '*'.repeat(Math.min(localPart.length - 1, 3))
      : '*';

    const domainParts = domain.split('.');
    const maskedDomain = domainParts.map(part => 
      part.length > 1 ? part[0] + '*'.repeat(Math.min(part.length - 1, 3)) : '*'
    ).join('.');

    return `${maskedLocal}@${maskedDomain}`;
  }

  /**
   * Redact PII from metadata
   */
  private static redactPII(metadata: Record<string, any>): Record<string, any> {
    const piiFields = ['password', 'token', 'secret', 'key', 'ssn', 'afm', 'amka'];
    const redacted = { ...metadata };

    for (const [key, value] of Object.entries(redacted)) {
      const lowerKey = key.toLowerCase();
      
      if (piiFields.some(pii => lowerKey.includes(pii))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'string' && this.isLikelyPII(value)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactPII(value);
      }
    }

    return redacted;
  }

  /**
   * Check if a string value looks like PII
   */
  private static isLikelyPII(value: string): boolean {
    // Check for patterns that look like tokens, passwords, etc.
    if (value.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(value)) return true;
    if (/^\$[a-z0-9]+\$/.test(value)) return true; // Password hash
    if (value.includes('Bearer ') || value.includes('token=')) return true;
    return false;
  }

  /**
   * Truncate user agent for storage efficiency
   */
  private static truncateUserAgent(userAgent: string): string {
    return userAgent.length > 500 ? userAgent.substring(0, 500) + '...' : userAgent;
  }

  /**
   * Determine if event should trigger security alert
   */
  private static shouldAlert(event: AuditEvent): boolean {
    const alertEvents: AuditEvent['eventType'][] = [
      'login_failed',
      'account_locked',
      'suspicious_activity',
      'mfa_failed'
    ];

    return alertEvents.includes(event.eventType) && event.result === 'failure';
  }

  /**
   * Emit security alert (integrate with notification system)
   */
  private static async emitSecurityAlert(event: AuditEvent, correlationId?: string): Promise<void> {
    // In a real implementation, this would integrate with:
    // - SIEM systems
    // - Slack/Teams notifications  
    // - Email alerts
    // - Security dashboards

    console.warn(`SECURITY ALERT [${correlationId}]:`, {
      eventType: event.eventType,
      result: event.result,
      reason: event.reason,
      ipAddress: event.ipAddress,
      maskedEmail: event.email ? this.maskEmail(event.email) : undefined,
      severity: event.severity,
    });

    // TODO: Implement actual alerting mechanism
    // await notificationService.sendSecurityAlert(alert);
  }

  /**
   * Query audit logs with filters
   */
  static async queryLogs(filters: {
    userId?: string;
    eventType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    ipAddress?: string;
    limit?: number;
  }) {
    let query = db.select().from(authAuditLogs);

    // Apply filters
    if (filters.userId) {
      query = query.where(eq(authAuditLogs.userId, filters.userId));
    }
    // Add more filters as needed...

    return query.limit(filters.limit || 100);
  }

  /**
   * Calculate risk score for event
   */
  private static calculateRiskScore(event: AuditEvent): number {
    let score = 0;
    
    // Base risk by event type
    const riskByEventType: Record<string, number> = {
      'login_failed': 30,
      'account_locked': 70,
      'suspicious_activity': 90,
      'mfa_failed': 40,
      'password_reset': 20,
      'login_success': 5,
      'signup': 10,
    };
    
    score += riskByEventType[event.eventType] || 10;
    
    // Increase risk for failures
    if (event.result === 'failure' || event.result === 'blocked') {
      score += 20;
    }
    
    // Critical severity adds significant risk
    if (event.severity === 'critical') {
      score += 30;
    } else if (event.severity === 'error') {
      score += 15;
    }
    
    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Generate correlation ID for request tracing
   */
  static generateCorrelationId(): string {
    return crypto.randomUUID();
  }

  /**
   * Log method for backward compatibility
   */
  static async log(event: AuditEvent): Promise<void> {
    // Convert AuditEvent to GeneralAuditEvent format
    const generalEvent: GeneralAuditEvent = {
      eventType: event.eventType,
      eventCategory: 'authentication',
      eventAction: event.eventType,
      tenantId: 'default',
      userId: event.userId || 'anonymous',
      eventData: event.metadata || {},
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      sessionId: event.sessionId,
      email: event.email,
      result: event.result,
      reason: event.reason
    };

    return this.logEvent(generalEvent);
  }
}