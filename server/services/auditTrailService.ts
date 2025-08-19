/**
 * Audit Trail Service - Comprehensive audit logging and export
 */

import { db } from '../db';
import { webhookEvents } from '@shared/schema';
import { desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'journal.build' | 'journal.post' | 'journal.reverse' | 'connector.auth' | 'mapping.update' | 'setup.complete';
  entityId: string;
  userId?: string;
  partnerId?: string;
  runId?: string;
  journalId?: string;
  payload: any;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
    success: boolean;
    errorCode?: string;
  };
  connectorType?: 'xero' | 'quickbooks';
  externalReference?: string;
}

export interface AuditExport {
  exportId: string;
  generatedAt: Date;
  dateRange: { start: Date; end: Date };
  filters: Record<string, any>;
  events: AuditEvent[];
  summary: {
    totalEvents: number;
    journalsBuilt: number;
    journalsPosted: number;
    connectorsUsed: string[];
    entitiesAffected: string[];
    successRate: number;
  };
  metadata: {
    format: 'json' | 'csv' | 'excel';
    size: number;
    checksum: string;
  };
}

export interface TokenMetadata {
  connectorType: 'xero' | 'quickbooks';
  partnerId: string;
  tokenHash: string; // Hashed for security
  issuedAt: Date;
  expiresAt: Date;
  lastUsed: Date;
  scopes: string[];
  refreshCount: number;
  tenantId?: string;
  companyId?: string;
}

export class AuditTrailService {
  private static events: AuditEvent[] = [];
  private static tokenMetadata = new Map<string, TokenMetadata>();

  /**
   * Log audit event
   */
  static async logEvent(
    eventType: AuditEvent['eventType'],
    entityId: string,
    payload: any,
    metadata: Partial<AuditEvent['metadata']> = {},
    additionalData: Partial<AuditEvent> = {}
  ): Promise<string> {
    const eventId = nanoid();
    
    const auditEvent: AuditEvent = {
      id: eventId,
      timestamp: new Date(),
      eventType,
      entityId,
      payload: this.sanitizePayload(payload),
      metadata: {
        success: true,
        ...metadata,
      },
      ...additionalData,
    };

    // Store in memory (in production, save to database)
    this.events.push(auditEvent);

    // Also store as webhook event for consistency
    try {
      await db.insert(webhookEvents).values({
        partnerId: additionalData.partnerId || 'system',
        eventType: eventType as any,
        payload: JSON.stringify(auditEvent),
        status: 'sent',
        resourceId: eventId,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to store audit event:', error);
    }

    return eventId;
  }

  /**
   * Log journal build event
   */
  static async logJournalBuild(
    journalId: string,
    entityId: string,
    runId: string,
    employeeCount: number,
    lineCount: number,
    duration: number,
    success: boolean,
    errorCode?: string
  ): Promise<string> {
    return this.logEvent(
      'journal.build',
      entityId,
      {
        journalId,
        runId,
        employeeCount,
        lineCount,
        isBalanced: success,
      },
      {
        duration,
        success,
        errorCode,
      },
      { journalId, runId }
    );
  }

  /**
   * Log journal posting event
   */
  static async logJournalPost(
    journalId: string,
    entityId: string,
    runId: string,
    connectorType: 'xero' | 'quickbooks' | 'internal',
    externalReference: string,
    duration: number,
    success: boolean
  ): Promise<string> {
    return this.logEvent(
      'journal.post',
      entityId,
      {
        journalId,
        runId,
        connectorType,
        externalReference,
      },
      {
        duration,
        success,
      },
      {
        journalId,
        runId,
        connectorType: connectorType !== 'internal' ? connectorType : undefined,
        externalReference,
      }
    );
  }

  /**
   * Log connector authentication
   */
  static async logConnectorAuth(
    partnerId: string,
    connectorType: 'xero' | 'quickbooks',
    success: boolean,
    tokenMetadata: Partial<TokenMetadata> = {}
  ): Promise<string> {
    const eventId = await this.logEvent(
      'connector.auth',
      'system',
      {
        connectorType,
        authSuccess: success,
        scopes: tokenMetadata.scopes,
      },
      { success },
      { partnerId, connectorType }
    );

    // Store token metadata separately
    if (success && tokenMetadata.tokenHash) {
      const tokenKey = `${partnerId}-${connectorType}`;
      this.tokenMetadata.set(tokenKey, {
        connectorType,
        partnerId,
        tokenHash: tokenMetadata.tokenHash,
        issuedAt: new Date(),
        expiresAt: tokenMetadata.expiresAt || new Date(Date.now() + 3600000), // 1 hour default
        lastUsed: new Date(),
        scopes: tokenMetadata.scopes || [],
        refreshCount: 0,
        tenantId: tokenMetadata.tenantId,
        companyId: tokenMetadata.companyId,
      });
    }

    return eventId;
  }

  /**
   * Export full audit trail
   */
  static async exportAuditTrail(
    filters: {
      startDate?: Date;
      endDate?: Date;
      entityId?: string;
      partnerId?: string;
      eventTypes?: string[];
      connectorType?: string;
    } = {},
    format: 'json' | 'csv' | 'excel' = 'json'
  ): Promise<AuditExport> {
    const exportId = nanoid();
    const generatedAt = new Date();
    
    // Apply filters
    let filteredEvents = this.events;

    if (filters.startDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.endDate!);
    }
    if (filters.entityId) {
      filteredEvents = filteredEvents.filter(e => e.entityId === filters.entityId);
    }
    if (filters.partnerId) {
      filteredEvents = filteredEvents.filter(e => e.partnerId === filters.partnerId);
    }
    if (filters.eventTypes?.length) {
      filteredEvents = filteredEvents.filter(e => filters.eventTypes!.includes(e.eventType));
    }
    if (filters.connectorType) {
      filteredEvents = filteredEvents.filter(e => e.connectorType === filters.connectorType);
    }

    // Calculate summary statistics
    const journalsBuilt = filteredEvents.filter(e => e.eventType === 'journal.build').length;
    const journalsPosted = filteredEvents.filter(e => e.eventType === 'journal.post').length;
    const connectorsUsed = Array.from(new Set(filteredEvents.map(e => e.connectorType).filter(Boolean)));
    const entitiesAffected = Array.from(new Set(filteredEvents.map(e => e.entityId)));
    const successfulEvents = filteredEvents.filter(e => e.metadata.success).length;
    const successRate = filteredEvents.length > 0 ? (successfulEvents / filteredEvents.length) * 100 : 0;

    // Generate export data
    const exportData = JSON.stringify({
      exportId,
      generatedAt,
      filters,
      events: filteredEvents,
      tokenMetadata: Array.from(this.tokenMetadata.entries()).map(([key, value]) => ({
        key,
        ...value,
        tokenHash: '***REDACTED***', // Don't export actual token hashes
      })),
      summary: {
        totalEvents: filteredEvents.length,
        journalsBuilt,
        journalsPosted,
        connectorsUsed,
        entitiesAffected,
        successRate: Math.round(successRate * 100) / 100,
      },
    }, null, 2);

    const auditExport: AuditExport = {
      exportId,
      generatedAt,
      dateRange: {
        start: filters.startDate || new Date(0),
        end: filters.endDate || new Date(),
      },
      filters,
      events: filteredEvents,
      summary: {
        totalEvents: filteredEvents.length,
        journalsBuilt,
        journalsPosted,
        connectorsUsed,
        entitiesAffected,
        successRate: Math.round(successRate * 100) / 100,
      },
      metadata: {
        format,
        size: Buffer.byteLength(exportData, 'utf8'),
        checksum: crypto.createHash('md5').update(exportData).digest('hex'),
      },
    };

    return auditExport;
  }

  /**
   * Get audit statistics
   */
  static getStatistics(days: number = 30): {
    totalEvents: number;
    eventsLastDay: number;
    eventsLastWeek: number;
    eventsLastMonth: number;
    eventTypeBreakdown: Record<string, number>;
    successRate: number;
    averageJournalBuildTime: number;
    averagePostingTime: number;
  } {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const eventsLastDay = this.events.filter(e => e.timestamp >= oneDayAgo).length;
    const eventsLastWeek = this.events.filter(e => e.timestamp >= oneWeekAgo).length;
    const eventsLastMonth = this.events.filter(e => e.timestamp >= oneMonthAgo).length;

    const eventTypeBreakdown: Record<string, number> = {};
    for (const event of this.events) {
      eventTypeBreakdown[event.eventType] = (eventTypeBreakdown[event.eventType] || 0) + 1;
    }

    const successfulEvents = this.events.filter(e => e.metadata.success).length;
    const successRate = this.events.length > 0 ? (successfulEvents / this.events.length) * 100 : 0;

    // Calculate average times
    const buildEvents = this.events.filter(e => e.eventType === 'journal.build' && e.metadata.duration);
    const postEvents = this.events.filter(e => e.eventType === 'journal.post' && e.metadata.duration);
    
    const avgBuildTime = buildEvents.length > 0 
      ? buildEvents.reduce((sum, e) => sum + (e.metadata.duration || 0), 0) / buildEvents.length
      : 0;
    
    const avgPostTime = postEvents.length > 0
      ? postEvents.reduce((sum, e) => sum + (e.metadata.duration || 0), 0) / postEvents.length
      : 0;

    return {
      totalEvents: this.events.length,
      eventsLastDay,
      eventsLastWeek,
      eventsLastMonth,
      eventTypeBreakdown,
      successRate: Math.round(successRate * 100) / 100,
      averageJournalBuildTime: Math.round(avgBuildTime),
      averagePostingTime: Math.round(avgPostTime),
    };
  }

  /**
   * Sanitize payload to remove sensitive data
   */
  private static sanitizePayload(payload: any): any {
    if (typeof payload !== 'object' || payload === null) {
      return payload;
    }

    const sanitized = JSON.parse(JSON.stringify(payload));
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'authorization'];
    
    function removeSensitive(obj: any): void {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object') {
          removeSensitive(obj[key]);
        }
      }
    }

    removeSensitive(sanitized);
    return sanitized;
  }

  /**
   * Clear old events (retention policy)
   */
  static applyRetentionPolicy(retentionDays: number = 90): number {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const initialCount = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoffDate);
    
    return initialCount - this.events.length;
  }
}