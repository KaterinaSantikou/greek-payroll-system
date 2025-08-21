/**
 * Comprehensive Audit Logging System
 * Provides tamper-evident logging for all user actions and security events
 */

export interface AuditEvent {
  id?: string;
  timestamp: string;
  eventType: AuditEventType;
  userId: string;
  userRole: string;
  employeeId?: string;
  asEmployeeId?: string; // For impersonation
  sessionId: string;
  action: string;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'blocked';
  riskScore: number;
  details: AuditEventDetails;
  metadata: AuditMetadata;
  hash?: string; // Tamper-evident hash
  previousHash?: string; // Chain hash for integrity
}

export type AuditEventType = 
  | 'access_attempt'
  | 'data_view'
  | 'data_modify'
  | 'data_export'
  | 'authentication'
  | 'authorization'
  | 'impersonation'
  | 'pii_access'
  | 'security_violation'
  | 'system_event'
  | 'gdpr_request'
  | 'policy_change';

export interface AuditEventDetails {
  description: string;
  reasonCode?: string;
  errorMessage?: string;
  dataAccessed?: string[];
  fieldsModified?: string[];
  piiFields?: string[];
  maskedFields?: string[];
  impersonationReason?: string;
  ipAddress: string;
  userAgent: string;
  location?: string; // Geolocation if available
  requestSize?: number;
  responseSize?: number;
  queryTime?: number;
}

export interface AuditMetadata {
  tenantId: string;
  propertyId?: string;
  departmentId?: string;
  source: 'web' | 'api' | 'mobile' | 'system';
  platform: string;
  version: string;
  environment: 'production' | 'staging' | 'development';
  correlationId?: string; // For tracking related events
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface AuditQuery {
  userId?: string;
  eventType?: AuditEventType;
  resource?: string;
  dateFrom?: Date;
  dateTo?: Date;
  riskScoreMin?: number;
  outcome?: 'success' | 'failure' | 'blocked';
  tenantId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsByOutcome: Record<string, number>;
  highRiskEvents: number;
  securityViolations: number;
  piiAccesses: number;
  impersonationEvents: number;
  topUsers: Array<{ userId: string; eventCount: number }>;
  topResources: Array<{ resource: string; eventCount: number }>;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private lastHash: string = '';
  private eventBuffer: AuditEvent[] = [];
  private bufferFlushInterval: number = 5000; // 5 seconds
  private maxBufferSize: number = 100;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  constructor() {
    // Start buffer flush timer
    setInterval(() => this.flushBuffer(), this.bufferFlushInterval);
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Partial<AuditEvent>): Promise<void> {
    const fullEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      ...event,
      hash: '',
      previousHash: this.lastHash,
    } as AuditEvent;

    // Generate tamper-evident hash
    fullEvent.hash = await this.generateHash(fullEvent);
    this.lastHash = fullEvent.hash;

    // Add to buffer
    this.eventBuffer.push(fullEvent);

    // Flush if buffer is full or this is a critical event
    if (this.eventBuffer.length >= this.maxBufferSize || 
        fullEvent.metadata?.severity === 'critical') {
      await this.flushBuffer();
    }
  }

  /**
   * Log access attempt (most common audit event)
   */
  async logAccessAttempt(params: {
    userId: string;
    userRole: string;
    employeeId?: string;
    asEmployeeId?: string;
    sessionId: string;
    resource: string;
    resourceId?: string;
    action: string;
    outcome: 'success' | 'failure' | 'blocked';
    riskScore: number;
    reason?: string;
    metadata: AuditMetadata;
    details: Partial<AuditEventDetails>;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'access_attempt',
      userId: params.userId,
      userRole: params.userRole,
      employeeId: params.employeeId,
      asEmployeeId: params.asEmployeeId,
      sessionId: params.sessionId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      outcome: params.outcome,
      riskScore: params.riskScore,
      details: {
        description: `${params.action} attempt on ${params.resource}`,
        reasonCode: params.reason,
        ipAddress: params.details.ipAddress || '0.0.0.0',
        userAgent: params.details.userAgent || 'unknown',
        ...params.details
      },
      metadata: params.metadata
    });
  }

  /**
   * Log PII data access
   */
  async logPIIAccess(params: {
    userId: string;
    userRole: string;
    employeeId?: string;
    asEmployeeId?: string;
    sessionId: string;
    resource: string;
    resourceId: string;
    piiFields: string[];
    maskedFields: string[];
    outcome: 'success' | 'failure';
    metadata: AuditMetadata;
    details: Partial<AuditEventDetails>;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'pii_access',
      userId: params.userId,
      userRole: params.userRole,
      employeeId: params.employeeId,
      asEmployeeId: params.asEmployeeId,
      sessionId: params.sessionId,
      action: 'read_pii',
      resource: params.resource,
      resourceId: params.resourceId,
      outcome: params.outcome,
      riskScore: this.calculatePIIRiskScore(params.piiFields, params.userRole),
      details: {
        description: `PII data access on ${params.resource}`,
        piiFields: params.piiFields,
        maskedFields: params.maskedFields,
        ipAddress: params.details.ipAddress || '0.0.0.0',
        userAgent: params.details.userAgent || 'unknown',
        ...params.details
      },
      metadata: {
        ...params.metadata,
        severity: 'high',
        tags: [...params.metadata.tags, 'pii', 'sensitive_data']
      }
    });
  }

  /**
   * Log impersonation events
   */
  async logImpersonation(params: {
    adminUserId: string;
    adminRole: string;
    targetEmployeeId: string;
    targetEmployeeName: string;
    sessionId: string;
    action: 'start' | 'end' | 'action';
    reason: string;
    outcome: 'success' | 'failure';
    metadata: AuditMetadata;
    details: Partial<AuditEventDetails>;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'impersonation',
      userId: params.adminUserId,
      userRole: params.adminRole,
      employeeId: params.adminUserId,
      asEmployeeId: params.targetEmployeeId,
      sessionId: params.sessionId,
      action: `impersonation_${params.action}`,
      resource: 'employee_session',
      resourceId: params.targetEmployeeId,
      outcome: params.outcome,
      riskScore: 40, // Impersonation always carries risk
      details: {
        description: `${params.action} impersonation of ${params.targetEmployeeName}`,
        impersonationReason: params.reason,
        ipAddress: params.details.ipAddress || '0.0.0.0',
        userAgent: params.details.userAgent || 'unknown',
        ...params.details
      },
      metadata: {
        ...params.metadata,
        severity: 'high',
        tags: [...params.metadata.tags, 'impersonation', 'admin_action']
      }
    });
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(params: {
    userId: string;
    userRole: string;
    sessionId: string;
    violationType: string;
    resource: string;
    resourceId?: string;
    severity: 'medium' | 'high' | 'critical';
    details: AuditEventDetails;
    metadata: AuditMetadata;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'security_violation',
      userId: params.userId,
      userRole: params.userRole,
      sessionId: params.sessionId,
      action: 'security_violation',
      resource: params.resource,
      resourceId: params.resourceId,
      outcome: 'blocked',
      riskScore: 85,
      details: params.details,
      metadata: {
        ...params.metadata,
        severity: params.severity,
        tags: [...params.metadata.tags, 'security_violation', 'blocked']
      }
    });
  }

  /**
   * Log GDPR data requests
   */
  async logGDPRRequest(params: {
    userId: string;
    employeeId: string;
    requestType: 'access' | 'portability' | 'erasure' | 'rectification';
    outcome: 'success' | 'failure';
    metadata: AuditMetadata;
    details: Partial<AuditEventDetails>;
  }): Promise<void> {
    await this.logEvent({
      eventType: 'gdpr_request',
      userId: params.userId,
      userRole: 'employee', // GDPR requests typically from employees
      employeeId: params.employeeId,
      sessionId: '', // May not have session for some requests
      action: `gdpr_${params.requestType}`,
      resource: 'personal_data',
      resourceId: params.employeeId,
      outcome: params.outcome,
      riskScore: 20,
      details: {
        description: `GDPR ${params.requestType} request`,
        ipAddress: params.details.ipAddress || '0.0.0.0',
        userAgent: params.details.userAgent || 'unknown',
        ...params.details
      },
      metadata: {
        ...params.metadata,
        severity: 'medium',
        tags: [...params.metadata.tags, 'gdpr', 'privacy', 'compliance']
      }
    });
  }

  /**
   * Query audit logs with filtering
   */
  async queryEvents(query: AuditQuery): Promise<AuditEvent[]> {
    // In real implementation, this would query the database
    // For now, return mock data structure
    console.log('Audit query:', query);
    return [];
  }

  /**
   * Generate audit summary for reporting
   */
  async generateSummary(dateFrom: Date, dateTo: Date, tenantId?: string): Promise<AuditSummary> {
    // In real implementation, this would aggregate data from database
    return {
      totalEvents: 0,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsByOutcome: {},
      highRiskEvents: 0,
      securityViolations: 0,
      piiAccesses: 0,
      impersonationEvents: 0,
      topUsers: [],
      topResources: []
    };
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(events: AuditEvent[]): Promise<boolean> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const expectedHash = await this.generateHash(event);
      
      if (event.hash !== expectedHash) {
        console.error(`Audit integrity violation at event ${event.id}`);
        return false;
      }

      if (i > 0 && event.previousHash !== events[i-1].hash) {
        console.error(`Audit chain integrity violation at event ${event.id}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Private helper methods
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateHash(event: AuditEvent): Promise<string> {
    const eventData = {
      ...event,
      hash: undefined // Exclude hash from hash calculation
    };
    
    const eventString = JSON.stringify(eventData, Object.keys(eventData).sort());
    
    // In browser environment, use Web Crypto API
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(eventString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for environments without Web Crypto API
    return this.simpleHash(eventString);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private calculatePIIRiskScore(piiFields: string[], userRole: string): number {
    let score = 0;
    
    const fieldScores: Record<string, number> = {
      'afm': 30,
      'amka': 30,
      'bankAccount': 25,
      'iban': 25,
      'salary': 20,
      'phone': 10,
      'email': 5
    };

    piiFields.forEach(field => {
      score += fieldScores[field] || 10;
    });

    // Role modifiers
    if (userRole === 'employee') score += 10;
    if (userRole === 'admin') score -= 5;

    return Math.min(score, 100);
  }

  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // In real implementation, this would send events to backend/database
      console.log(`Flushing ${eventsToFlush.length} audit events to storage`);
      
      // Mock API call
      // await apiRequest('POST', '/api/audit/events', { events: eventsToFlush });
      
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      // Re-add events to buffer on failure
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }
}

// Helper functions for easy usage
export const auditLogger = AuditLogger.getInstance();

export const logAccessAttempt = (params: Parameters<typeof auditLogger.logAccessAttempt>[0]) => 
  auditLogger.logAccessAttempt(params);

export const logPIIAccess = (params: Parameters<typeof auditLogger.logPIIAccess>[0]) => 
  auditLogger.logPIIAccess(params);

export const logImpersonation = (params: Parameters<typeof auditLogger.logImpersonation>[0]) => 
  auditLogger.logImpersonation(params);

export const logSecurityViolation = (params: Parameters<typeof auditLogger.logSecurityViolation>[0]) => 
  auditLogger.logSecurityViolation(params);

export const logGDPRRequest = (params: Parameters<typeof auditLogger.logGDPRRequest>[0]) => 
  auditLogger.logGDPRRequest(params);

export default AuditLogger;