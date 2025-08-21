/**
 * Central Log Aggregation Service
 * Provides unified logging across all PayrollSync services with real-time collection,
 * analysis, search, and monitoring capabilities
 */

import { db } from '../db';
import { 
  logEntries, 
  logMetrics, 
  logSubscriptions, 
  logRetentionPolicies, 
  logSearchIndex,
  logPatterns,
  type LogEntry, 
  type InsertLogEntry,
  type LogMetrics as LogMetricsType,
  type LogSubscription,
  type InsertLogSubscription,
  type LogRetentionPolicy,
  type InsertLogRetentionPolicy,
  type LogPattern
} from '@shared/schema';
import { eq, desc, and, gte, lte, or, sql, count, avg, max } from 'drizzle-orm';
import { EventEmitter } from 'events';

export interface LogLevel {
  name: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  severity: number;
  color: string;
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  service: string;
  component?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  performance?: {
    duration?: number;
    statusCode?: number;
  };
  request?: {
    method?: string;
    url?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface LogSearchQuery {
  levels?: string[];
  services?: string[];
  categories?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  message?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  tags?: string[];
  severity?: { min?: number; max?: number };
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'service';
  sortOrder?: 'asc' | 'desc';
}

export interface AggregationOptions {
  timeWindow: 'hour' | 'day' | 'week' | 'month';
  groupBy: ('service' | 'level' | 'category' | 'user')[];
  metrics: ('count' | 'errors' | 'performance' | 'users')[];
}

export class CentralLogAggregationService extends EventEmitter {
  private static instance: CentralLogAggregationService;
  private logLevels: Map<string, LogLevel> = new Map();
  private retentionPolicies: Map<string, LogRetentionPolicy> = new Map();
  private activeSubscriptions: Map<string, LogSubscription> = new Map();

  constructor() {
    super();
    this.initializeLogLevels();
    this.loadRetentionPolicies();
    this.loadActiveSubscriptions();
  }

  static getInstance(): CentralLogAggregationService {
    if (!CentralLogAggregationService.instance) {
      CentralLogAggregationService.instance = new CentralLogAggregationService();
    }
    return CentralLogAggregationService.instance;
  }

  /**
   * Initialize log levels with severity mapping
   */
  private initializeLogLevels(): void {
    this.logLevels = new Map([
      ['debug', { name: 'debug', severity: 10, color: '#888888' }],
      ['info', { name: 'info', severity: 20, color: '#0066cc' }],
      ['warn', { name: 'warn', severity: 50, color: '#ff9900' }],
      ['error', { name: 'error', severity: 80, color: '#ff3300' }],
      ['fatal', { name: 'fatal', severity: 100, color: '#cc0000' }],
    ]);
  }

  /**
   * Load retention policies from database
   */
  private async loadRetentionPolicies(): Promise<void> {
    try {
      const policies = await db
        .select()
        .from(logRetentionPolicies)
        .where(eq(logRetentionPolicies.isActive, true))
        .orderBy(desc(logRetentionPolicies.priority));

      this.retentionPolicies.clear();
      policies.forEach(policy => {
        const key = `${policy.service}:${policy.level || '*'}:${policy.category || '*'}`;
        this.retentionPolicies.set(key, policy);
      });
    } catch (error) {
      // Gracefully handle missing tables during initialization
      if ((error as any)?.code === '42P01') { // Table doesn't exist
        console.log('Log retention policies table not yet created - using defaults');
      } else {
        console.error('Failed to load retention policies:', error);
      }
    }
  }

  /**
   * Load active log subscriptions
   */
  private async loadActiveSubscriptions(): Promise<void> {
    try {
      const subscriptions = await db
        .select()
        .from(logSubscriptions)
        .where(eq(logSubscriptions.isActive, true));

      this.activeSubscriptions.clear();
      subscriptions.forEach(sub => {
        this.activeSubscriptions.set(sub.id, sub);
      });
    } catch (error) {
      // Gracefully handle missing tables during initialization
      if ((error as any)?.code === '42P01') { // Table doesn't exist
        console.log('Log subscriptions table not yet created - using empty subscriptions');
      } else {
        console.error('Failed to load active subscriptions:', error);
      }
    }
  }

  /**
   * Log an entry with full context and metadata
   */
  async log(
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
    message: string,
    context: LogContext,
    error?: Error
  ): Promise<LogEntry> {
    const logLevel = this.logLevels.get(level);
    if (!logLevel) {
      throw new Error(`Invalid log level: ${level}`);
    }

    // Extract stack trace from error if provided
    const stackTrace = error?.stack || (level === 'error' || level === 'fatal' ? new Error().stack : undefined);

    // Calculate retention expiry based on policies
    const retentionExpiresAt = this.calculateRetentionExpiry(context.service, level, context.category);

    // Prepare log entry
    const logEntry: InsertLogEntry = {
      level,
      service: context.service,
      component: context.component,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      message,
      details: {
        error: error ? {
          name: error.name,
          message: error.message,
          code: (error as any).code,
        } : undefined,
        ...context.metadata,
      },
      tags: context.tags,
      source: this.determineLogSource(context),
      category: context.category,
      severity: logLevel.severity,
      environment: process.env.NODE_ENV || 'development',
      hostname: process.env.HOSTNAME || 'localhost',
      processId: process.pid.toString(),
      stackTrace,
      duration: context.performance?.duration,
      statusCode: context.performance?.statusCode,
      ipAddress: context.request?.ipAddress,
      userAgent: context.request?.userAgent,
      metadata: {
        request: context.request,
        performance: context.performance,
        timestamp: new Date().toISOString(),
      },
      retentionExpiresAt,
    };

    try {
      // Insert log entry
      const [insertedEntry] = await db
        .insert(logEntries)
        .values(logEntry)
        .returning();

      // Emit real-time log event
      this.emit('log', insertedEntry);

      // Check for subscription matches and alerts
      await this.checkSubscriptionMatches(insertedEntry);

      // Queue for search indexing
      await this.queueForIndexing(insertedEntry);

      return insertedEntry;
    } catch (error) {
      // Gracefully handle missing tables during initialization
      if ((error as any)?.code === '42P01') { // Table doesn't exist
        console.log(`Log entry not stored - tables not yet created: ${level} ${message}`);
        
        // Return a mock entry for now
        return {
          id: 'temp-' + Date.now(),
          timestamp: new Date(),
          level,
          service: context.service,
          message,
          severity: logLevel.severity,
          ...logEntry,
        } as LogEntry;
      } else {
        console.error('Failed to store log entry:', error);
        throw error;
      }
    }
  }

  /**
   * Convenience methods for different log levels
   */
  async debug(message: string, context: LogContext): Promise<LogEntry> {
    return this.log('debug', message, context);
  }

  async info(message: string, context: LogContext): Promise<LogEntry> {
    return this.log('info', message, context);
  }

  async warn(message: string, context: LogContext, error?: Error): Promise<LogEntry> {
    return this.log('warn', message, context, error);
  }

  async error(message: string, context: LogContext, error?: Error): Promise<LogEntry> {
    return this.log('error', message, context, error);
  }

  async fatal(message: string, context: LogContext, error?: Error): Promise<LogEntry> {
    return this.log('fatal', message, context, error);
  }

  /**
   * Search logs with advanced filtering and pagination
   */
  async searchLogs(query: LogSearchQuery): Promise<{
    entries: LogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    let baseQuery = db.select().from(logEntries);
    let countQuery = db.select({ count: count() }).from(logEntries);

    // Build WHERE conditions
    const conditions = [];

    if (query.levels?.length) {
      conditions.push(sql`${logEntries.level} = ANY(${query.levels})`);
    }

    if (query.services?.length) {
      conditions.push(sql`${logEntries.service} = ANY(${query.services})`);
    }

    if (query.categories?.length) {
      conditions.push(sql`${logEntries.category} = ANY(${query.categories})`);
    }

    if (query.dateFrom) {
      conditions.push(gte(logEntries.timestamp, query.dateFrom));
    }

    if (query.dateTo) {
      conditions.push(lte(logEntries.timestamp, query.dateTo));
    }

    if (query.message) {
      conditions.push(sql`${logEntries.message} ILIKE ${'%' + query.message + '%'}`);
    }

    if (query.userId) {
      conditions.push(eq(logEntries.userId, query.userId));
    }

    if (query.sessionId) {
      conditions.push(eq(logEntries.sessionId, query.sessionId));
    }

    if (query.requestId) {
      conditions.push(eq(logEntries.requestId, query.requestId));
    }

    if (query.tags?.length) {
      conditions.push(sql`${logEntries.tags} @> ${JSON.stringify(query.tags)}`);
    }

    if (query.severity?.min !== undefined) {
      conditions.push(gte(logEntries.severity, query.severity.min));
    }

    if (query.severity?.max !== undefined) {
      conditions.push(lte(logEntries.severity, query.severity.max));
    }

    // Apply conditions
    if (conditions.length > 0) {
      const whereClause = and(...conditions);
      baseQuery = baseQuery.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Get total count
    const [{ count: total }] = await countQuery;

    // Apply sorting
    const sortColumn = query.sortBy === 'severity' ? logEntries.severity :
                      query.sortBy === 'service' ? logEntries.service :
                      logEntries.timestamp;
    
    if (query.sortOrder === 'asc') {
      baseQuery = baseQuery.orderBy(sortColumn);
    } else {
      baseQuery = baseQuery.orderBy(desc(sortColumn));
    }

    // Apply pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    baseQuery = baseQuery.limit(limit).offset(offset);

    const entries = await baseQuery;

    return {
      entries,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  /**
   * Generate aggregated metrics for logs
   */
  async generateMetrics(
    dateFrom: Date,
    dateTo: Date,
    options: AggregationOptions
  ): Promise<LogMetricsType[]> {
    const windowSize = this.getWindowSizeMinutes(options.timeWindow);
    
    // Build aggregation query
    const selectFields: any = {
      timeWindow: sql`date_trunc('${options.timeWindow}', ${logEntries.timestamp})`,
      entryCount: count(),
      errorCount: count(sql`CASE WHEN ${logEntries.level} IN ('error', 'fatal') THEN 1 END`),
      warnCount: count(sql`CASE WHEN ${logEntries.level} = 'warn' THEN 1 END`),
      avgSeverity: avg(logEntries.severity),
    };

    // Add grouping fields
    if (options.groupBy.includes('service')) {
      selectFields.service = logEntries.service;
    }
    if (options.groupBy.includes('level')) {
      selectFields.level = logEntries.level;
    }
    if (options.groupBy.includes('category')) {
      selectFields.category = logEntries.category;
    }

    // Add performance metrics if requested
    if (options.metrics.includes('performance')) {
      selectFields.avgDuration = avg(logEntries.duration);
    }

    // Add user metrics if requested
    if (options.metrics.includes('users')) {
      selectFields.uniqueUsers = sql`COUNT(DISTINCT ${logEntries.userId})`;
      selectFields.uniqueSessions = sql`COUNT(DISTINCT ${logEntries.sessionId})`;
    }

    let query = db
      .select(selectFields)
      .from(logEntries)
      .where(
        and(
          gte(logEntries.timestamp, dateFrom),
          lte(logEntries.timestamp, dateTo)
        )
      );

    // Add GROUP BY clauses
    const groupByFields = [sql`date_trunc('${options.timeWindow}', ${logEntries.timestamp})`];
    if (options.groupBy.includes('service')) groupByFields.push(logEntries.service);
    if (options.groupBy.includes('level')) groupByFields.push(logEntries.level);
    if (options.groupBy.includes('category')) groupByFields.push(logEntries.category);

    query = query.groupBy(...groupByFields);
    query = query.orderBy(sql`date_trunc('${options.timeWindow}', ${logEntries.timestamp})`);

    const results = await query;

    // Convert to LogMetrics format
    return results.map(result => ({
      id: '', // Will be generated
      timeWindow: result.timeWindow as Date,
      windowSize,
      service: result.service || 'all',
      level: result.level || 'all',
      category: result.category || null,
      entryCount: result.entryCount,
      errorCount: result.errorCount,
      warnCount: result.warnCount,
      avgSeverity: result.avgSeverity,
      avgDuration: result.avgDuration || null,
      uniqueUsers: result.uniqueUsers || 0,
      uniqueSessions: result.uniqueSessions || 0,
      topErrors: null, // Could be calculated separately
      performanceP95: null, // Could be calculated separately
      performanceP99: null, // Could be calculated separately
      createdAt: new Date(),
    }));
  }

  /**
   * Get real-time log stream for a service
   */
  getLogStream(filters: Partial<LogSearchQuery> = {}): EventEmitter {
    const stream = new EventEmitter();
    
    const logHandler = (entry: LogEntry) => {
      // Apply filters
      if (filters.levels?.length && !filters.levels.includes(entry.level)) return;
      if (filters.services?.length && !filters.services.includes(entry.service)) return;
      if (filters.categories?.length && entry.category && !filters.categories.includes(entry.category)) return;
      if (filters.userId && entry.userId !== filters.userId) return;
      if (filters.severity?.min !== undefined && entry.severity && entry.severity < filters.severity.min) return;
      if (filters.severity?.max !== undefined && entry.severity && entry.severity > filters.severity.max) return;
      
      stream.emit('log', entry);
    };

    this.on('log', logHandler);

    // Cleanup listener when stream is closed
    stream.on('close', () => {
      this.removeListener('log', logHandler);
    });

    return stream;
  }

  /**
   * Create log subscription for real-time alerts
   */
  async createSubscription(subscription: Omit<InsertLogSubscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<LogSubscription> {
    const [created] = await db
      .insert(logSubscriptions)
      .values(subscription)
      .returning();

    this.activeSubscriptions.set(created.id, created);
    return created;
  }

  /**
   * Manage log retention policies
   */
  async createRetentionPolicy(policy: Omit<InsertLogRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<LogRetentionPolicy> {
    const [created] = await db
      .insert(logRetentionPolicies)
      .values(policy)
      .returning();

    await this.loadRetentionPolicies(); // Reload policies
    return created;
  }

  /**
   * Clean up expired logs based on retention policies
   */
  async cleanupExpiredLogs(): Promise<{
    deletedCount: number;
    archivedCount: number;
    processedPolicies: number;
  }> {
    let deletedCount = 0;
    let archivedCount = 0;
    let processedPolicies = 0;

    for (const [key, policy] of this.retentionPolicies.entries()) {
      try {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - policy.retentionDays);

        const archiveDate = new Date();
        archiveDate.setDate(archiveDate.getDate() - (policy.archiveAfterDays || 30));

        // Build conditions for this policy
        const conditions = [lte(logEntries.timestamp, retentionDate)];
        
        if (policy.service !== '*') {
          conditions.push(eq(logEntries.service, policy.service));
        }
        if (policy.level) {
          conditions.push(eq(logEntries.level, policy.level));
        }
        if (policy.category) {
          conditions.push(eq(logEntries.category, policy.category));
        }

        // Delete expired logs
        const deleteResult = await db
          .delete(logEntries)
          .where(and(...conditions));

        deletedCount += deleteResult.rowCount || 0;

        // Archive older logs if enabled
        if (policy.archiveAfterDays > 0) {
          const archiveConditions = [
            lte(logEntries.timestamp, archiveDate),
            gte(logEntries.timestamp, retentionDate),
            eq(logEntries.archived, false)
          ];

          if (policy.service !== '*') {
            archiveConditions.push(eq(logEntries.service, policy.service));
          }
          if (policy.level) {
            archiveConditions.push(eq(logEntries.level, policy.level));
          }
          if (policy.category) {
            archiveConditions.push(eq(logEntries.category, policy.category));
          }

          const archiveResult = await db
            .update(logEntries)
            .set({ archived: true })
            .where(and(...archiveConditions));

          archivedCount += archiveResult.rowCount || 0;
        }

        processedPolicies++;
      } catch (error) {
        console.error(`Failed to process retention policy ${key}:`, error);
      }
    }

    return { deletedCount, archivedCount, processedPolicies };
  }

  /**
   * Detect anomalies and patterns in logs
   */
  async detectAnomalies(service?: string): Promise<LogPattern[]> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const anomalies: LogPattern[] = [];

    try {
      // Detect error rate spikes
      const recentErrors = await db
        .select({
          service: logEntries.service,
          errorCount: count(),
        })
        .from(logEntries)
        .where(
          and(
            gte(logEntries.timestamp, hourAgo),
            sql`${logEntries.level} IN ('error', 'fatal')`,
            service ? eq(logEntries.service, service) : sql`1=1`
          )
        )
        .groupBy(logEntries.service);

      const historicalErrors = await db
        .select({
          service: logEntries.service,
          avgErrorCount: avg(sql`error_count::numeric`),
        })
        .from(
          db
            .select({
              service: logEntries.service,
              errorCount: count(),
            })
            .from(logEntries)
            .where(
              and(
                gte(logEntries.timestamp, dayAgo),
                lte(logEntries.timestamp, hourAgo),
                sql`${logEntries.level} IN ('error', 'fatal')`,
                service ? eq(logEntries.service, service) : sql`1=1`
              )
            )
            .groupBy(logEntries.service, sql`date_trunc('hour', ${logEntries.timestamp})`)
            .as('hourly_errors')
        )
        .groupBy(sql`service`);

      // Check for significant increases in error rates
      for (const recent of recentErrors) {
        const historical = historicalErrors.find(h => h.service === recent.service);
        const avgErrors = historical?.avgErrorCount || 0;
        
        if (recent.errorCount > avgErrors * 3 && recent.errorCount > 10) {
          anomalies.push({
            id: '',
            patternType: 'anomaly',
            service: recent.service,
            pattern: {
              type: 'error_spike',
              currentCount: recent.errorCount,
              historicalAverage: avgErrors,
              multiplier: recent.errorCount / Math.max(avgErrors, 1),
            },
            confidence: 0.85,
            frequency: 'hourly',
            lastDetected: now,
            occurrenceCount: 1,
            severity: recent.errorCount > avgErrors * 5 ? 'critical' : 'high',
            description: `Error rate spike detected in ${recent.service}: ${recent.errorCount} errors in the last hour vs ${avgErrors.toFixed(1)} average`,
            recommendedAction: 'Investigate recent deployments and system health metrics',
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }

  // Helper methods

  private determineLogSource(context: LogContext): string {
    if (context.category?.includes('security') || context.category?.includes('auth')) {
      return 'security';
    }
    if (context.category?.includes('audit') || context.category?.includes('compliance')) {
      return 'audit';
    }
    if (context.service?.includes('system') || context.component?.includes('system')) {
      return 'system';
    }
    return 'application';
  }

  private calculateRetentionExpiry(service: string, level: string, category?: string): Date {
    // Find matching retention policy
    const keys = [
      `${service}:${level}:${category || '*'}`,
      `${service}:${level}:*`,
      `${service}:*:${category || '*'}`,
      `${service}:*:*`,
      `*:${level}:${category || '*'}`,
      `*:${level}:*`,
      `*:*:${category || '*'}`,
      `*:*:*`,
    ];

    for (const key of keys) {
      const policy = this.retentionPolicies.get(key);
      if (policy) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + policy.retentionDays);
        return expiryDate;
      }
    }

    // Default retention: 90 days
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 90);
    return defaultExpiry;
  }

  private async checkSubscriptionMatches(entry: LogEntry): Promise<void> {
    for (const [id, subscription] of this.activeSubscriptions.entries()) {
      try {
        const filters = subscription.filters as LogSearchQuery;
        let matches = true;

        // Check filters
        if (filters.levels?.length && !filters.levels.includes(entry.level)) matches = false;
        if (filters.services?.length && !filters.services.includes(entry.service)) matches = false;
        if (filters.categories?.length && entry.category && !filters.categories.includes(entry.category)) matches = false;
        if (filters.userId && entry.userId !== filters.userId) matches = false;
        if (filters.severity?.min !== undefined && entry.severity && entry.severity < filters.severity.min) matches = false;
        if (filters.severity?.max !== undefined && entry.severity && entry.severity > filters.severity.max) matches = false;

        if (matches) {
          this.emit('subscription_match', { subscription, entry });
          
          // Update last triggered
          await db
            .update(logSubscriptions)
            .set({ lastTriggered: new Date() })
            .where(eq(logSubscriptions.id, id));
        }
      } catch (error) {
        console.error(`Error checking subscription ${id}:`, error);
      }
    }
  }

  private async queueForIndexing(entry: LogEntry): Promise<void> {
    try {
      // Create search terms from message and details
      const searchTerms = [
        entry.message,
        entry.service,
        entry.component,
        entry.category,
        ...(entry.tags || []),
        JSON.stringify(entry.details || {}),
        JSON.stringify(entry.metadata || {}),
      ].filter(Boolean).join(' ').toLowerCase();

      await db.insert(logSearchIndex).values({
        logEntryId: entry.id,
        searchTerms,
        serviceTerms: entry.service,
        messageTerms: entry.message.toLowerCase(),
        detailsTerms: JSON.stringify(entry.details || {}).toLowerCase(),
      });
    } catch (error) {
      console.error('Failed to queue log for indexing:', error);
    }
  }

  private getWindowSizeMinutes(timeWindow: string): number {
    switch (timeWindow) {
      case 'hour': return 60;
      case 'day': return 24 * 60;
      case 'week': return 7 * 24 * 60;
      case 'month': return 30 * 24 * 60;
      default: return 60;
    }
  }
}