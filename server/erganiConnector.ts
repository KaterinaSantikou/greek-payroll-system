/**
 * ERGANI II Connector - Real-time compliance reporting to Greek Ministry of Labor
 *
 * Features:
 * - Ordered submission with idempotency keys
 * - Automatic retry with exponential backoff
 * - Quarantine queue for manual review
 * - Mirror log for all request/response payloads
 * - Inspector-friendly export capabilities
 */

import { nanoid } from 'nanoid';

// ERGANI II Event Types
export interface ErganiEvent {
  eventId: string;
  employeeAfm: string;
  propertyCode: string;
  timestamp: string;
  eventType: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
  location?: {
    latitude: number;
    longitude: number;
  };
  deviceId?: string;
  submissionOrder: number;
  idempotencyKey: string;
}

export interface ErganiSubmissionResult {
  eventId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'QUARANTINED';
  erganiId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  submittedAt: Date;
  lastAttemptAt: Date;
}

export interface ErganiMirrorLog {
  logId: string;
  eventId: string;
  requestPayload: any;
  responsePayload?: any;
  httpStatus?: number;
  timestamp: Date;
  duration: number;
  retryAttempt: number;
}

// ERGANI II API Configuration
interface ErganiConfig {
  baseUrl: string;
  apiKey: string;
  companyCode: string;
  timeout: number;
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
}

export class ErganiConnector {
  private config: ErganiConfig;
  private submissionQueue: ErganiEvent[] = [];
  private quarantineQueue: ErganiEvent[] = [];
  private mirrorLogs: ErganiMirrorLog[] = [];
  private submissionResults: Map<string, ErganiSubmissionResult> = new Map();
  private isProcessing: boolean = false;
  private orderCounter: number = 0;

  constructor() {
    this.config = {
      baseUrl: process.env.ERGANI_API_URL || 'https://api.ergani.gov.gr/v2',
      apiKey: process.env.ERGANI_API_KEY || '',
      companyCode: process.env.ERGANI_COMPANY_CODE || '',
      timeout: 30000,
      maxRetries: 3,
      retryDelayMs: 5000,
      batchSize: 50,
    };
  }

  /**
   * Submit a single punch event to ERGANI II
   */
  async submitEvent(
    event: Omit<ErganiEvent, 'submissionOrder' | 'idempotencyKey'>
  ): Promise<ErganiSubmissionResult> {
    const erganiEvent: ErganiEvent = {
      ...event,
      submissionOrder: ++this.orderCounter,
      idempotencyKey: `${event.eventId}_${Date.now()}_${nanoid(8)}`,
    };

    // Add to submission queue
    this.submissionQueue.push(erganiEvent);

    // Initialize result tracking
    const result: ErganiSubmissionResult = {
      eventId: event.eventId,
      status: 'PENDING',
      retryCount: 0,
      submittedAt: new Date(),
      lastAttemptAt: new Date(),
    };
    this.submissionResults.set(event.eventId, result);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processSubmissionQueue();
    }

    return result;
  }

  /**
   * Submit events in bulk with strict ordering
   */
  async submitBulk(
    events: Omit<ErganiEvent, 'submissionOrder' | 'idempotencyKey'>[]
  ): Promise<ErganiSubmissionResult[]> {
    const erganiEvents: ErganiEvent[] = events.map(event => ({
      ...event,
      submissionOrder: ++this.orderCounter,
      idempotencyKey: `${event.eventId}_${Date.now()}_${nanoid(8)}`,
    }));

    // Add all to submission queue in order
    this.submissionQueue.push(...erganiEvents);

    // Initialize result tracking for all events
    const results: ErganiSubmissionResult[] = erganiEvents.map(event => {
      const result: ErganiSubmissionResult = {
        eventId: event.eventId,
        status: 'PENDING',
        retryCount: 0,
        submittedAt: new Date(),
        lastAttemptAt: new Date(),
      };
      this.submissionResults.set(event.eventId, result);
      return result;
    });

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processSubmissionQueue();
    }

    return results;
  }

  /**
   * Get submission status for a specific event
   */
  getEventStatus(eventId: string): ErganiSubmissionResult | undefined {
    return this.submissionResults.get(eventId);
  }

  /**
   * Process the submission queue with ordering and retry logic
   */
  private async processSubmissionQueue(): Promise<void> {
    if (this.isProcessing || this.submissionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(
      `[ERGANI] Processing ${this.submissionQueue.length} events in queue`
    );

    try {
      // Process events in strict order
      const sortedQueue = [...this.submissionQueue].sort(
        (a, b) => a.submissionOrder - b.submissionOrder
      );

      for (const event of sortedQueue) {
        await this.submitSingleEvent(event);

        // Remove from queue after processing
        const index = this.submissionQueue.findIndex(
          e => e.eventId === event.eventId
        );
        if (index >= 0) {
          this.submissionQueue.splice(index, 1);
        }
      }
    } catch (error) {
      console.error('[ERGANI] Error processing submission queue:', error);
    } finally {
      this.isProcessing = false;

      // If more events were added during processing, process them
      if (this.submissionQueue.length > 0) {
        setTimeout(() => this.processSubmissionQueue(), 1000);
      }
    }
  }

  /**
   * Submit a single event with retry logic
   */
  private async submitSingleEvent(event: ErganiEvent): Promise<void> {
    const result = this.submissionResults.get(event.eventId);
    if (!result) return;

    const startTime = Date.now();
    let attempt = 0;

    while (attempt <= this.config.maxRetries) {
      attempt++;
      result.retryCount = attempt - 1;
      result.lastAttemptAt = new Date();

      try {
        const response = await this.makeErganiRequest(event, attempt);

        // Log the mirror entry
        this.logMirrorEntry(event, response, Date.now() - startTime, attempt);

        if (response.success) {
          result.status = 'SUCCESS';
          result.erganiId = response.erganiId;
          console.log(
            `[ERGANI] Successfully submitted event ${event.eventId} (ERGANI ID: ${response.erganiId})`
          );
          return;
        } else {
          throw new Error(
            `ERGANI API error: ${response.errorCode} - ${response.errorMessage}`
          );
        }
      } catch (error) {
        console.error(
          `[ERGANI] Attempt ${attempt} failed for event ${event.eventId}:`,
          error
        );

        // Log failed attempt
        this.logMirrorEntry(
          event,
          { error: (error as Error).message },
          Date.now() - startTime,
          attempt
        );

        if (attempt > this.config.maxRetries) {
          // Move to quarantine for manual review
          result.status = 'QUARANTINED';
          result.errorMessage = (error as Error).message;
          this.quarantineQueue.push(event);
          console.error(
            `[ERGANI] Event ${event.eventId} quarantined after ${this.config.maxRetries} failed attempts`
          );
          return;
        }

        // Wait before retry with exponential backoff
        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Make actual HTTP request to ERGANI II API
   */
  private async makeErganiRequest(
    event: ErganiEvent,
    attempt: number
  ): Promise<any> {
    // In a real implementation, this would make actual HTTP requests to ERGANI II
    // For now, we'll simulate the API response based on realistic patterns

    const requestPayload = {
      idempotencyKey: event.idempotencyKey,
      companyCode: this.config.companyCode,
      event: {
        employeeAfm: event.employeeAfm,
        propertyCode: event.propertyCode,
        timestamp: event.timestamp,
        eventType: event.eventType,
        location: event.location,
        deviceId: event.deviceId,
      },
    };

    // Simulate network delay
    await new Promise(resolve =>
      setTimeout(resolve, 500 + Math.random() * 1000)
    );

    // Simulate different response scenarios
    const random = Math.random();

    if (random < 0.85) {
      // Success case (85% success rate)
      return {
        success: true,
        erganiId: `ERG_${nanoid(12)}`,
        timestamp: new Date().toISOString(),
        requestPayload,
      };
    } else if (random < 0.95) {
      // Temporary failure (10% temporary failure rate)
      throw new Error('ERGANI_TEMP_UNAVAILABLE');
    } else {
      // Permanent failure (5% permanent failure rate)
      throw new Error('ERGANI_VALIDATION_ERROR');
    }
  }

  /**
   * Log mirror entry for request/response tracking
   */
  private logMirrorEntry(
    event: ErganiEvent,
    response: any,
    duration: number,
    retryAttempt: number
  ): void {
    const mirrorLog: ErganiMirrorLog = {
      logId: nanoid(12),
      eventId: event.eventId,
      requestPayload: {
        idempotencyKey: event.idempotencyKey,
        companyCode: this.config.companyCode,
        event: {
          employeeAfm: event.employeeAfm,
          propertyCode: event.propertyCode,
          timestamp: event.timestamp,
          eventType: event.eventType,
          location: event.location,
          deviceId: event.deviceId,
        },
      },
      responsePayload: response,
      httpStatus: response.success ? 200 : 500,
      timestamp: new Date(),
      duration,
      retryAttempt,
    };

    this.mirrorLogs.push(mirrorLog);

    // Keep only last 10000 logs to prevent memory issues
    if (this.mirrorLogs.length > 10000) {
      this.mirrorLogs = this.mirrorLogs.slice(-5000);
    }
  }

  /**
   * Get all mirror logs for inspection
   */
  getMirrorLogs(eventId?: string): ErganiMirrorLog[] {
    if (eventId) {
      return this.mirrorLogs.filter(log => log.eventId === eventId);
    }
    return [...this.mirrorLogs];
  }

  /**
   * Export mirror logs in inspector-friendly format
   */
  exportMirrorLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getMirrorLogs();

    if (format === 'csv') {
      const headers = [
        'logId',
        'eventId',
        'timestamp',
        'httpStatus',
        'duration',
        'retryAttempt',
        'success',
      ];
      const rows = logs.map(log => [
        log.logId,
        log.eventId,
        log.timestamp.toISOString(),
        log.httpStatus || 0,
        log.duration,
        log.retryAttempt,
        log.responsePayload?.success || false,
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get quarantined events for manual review
   */
  getQuarantinedEvents(): ErganiEvent[] {
    return [...this.quarantineQueue];
  }

  /**
   * Manually retry a quarantined event
   */
  async retryQuarantinedEvent(
    eventId: string
  ): Promise<ErganiSubmissionResult | undefined> {
    const eventIndex = this.quarantineQueue.findIndex(
      event => event.eventId === eventId
    );
    if (eventIndex === -1) {
      return undefined;
    }

    const event = this.quarantineQueue[eventIndex];
    this.quarantineQueue.splice(eventIndex, 1);

    // Reset result status and retry
    const result = this.submissionResults.get(eventId);
    if (result) {
      result.status = 'PENDING';
      result.retryCount = 0;
      result.errorMessage = undefined;
    }

    // Add back to submission queue
    this.submissionQueue.push(event);

    if (!this.isProcessing) {
      this.processSubmissionQueue();
    }

    return result;
  }

  /**
   * Get system health metrics
   */
  getHealthMetrics() {
    const totalEvents = this.submissionResults.size;
    const successfulEvents = Array.from(this.submissionResults.values()).filter(
      r => r.status === 'SUCCESS'
    ).length;
    const pendingEvents = this.submissionQueue.length;
    const quarantinedEvents = this.quarantineQueue.length;
    const failedEvents = Array.from(this.submissionResults.values()).filter(
      r => r.status === 'FAILED'
    ).length;

    return {
      totalEvents,
      successfulEvents,
      pendingEvents,
      quarantinedEvents,
      failedEvents,
      successRate: totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0,
      queueBacklog: pendingEvents,
      isProcessing: this.isProcessing,
      lastActivity:
        this.mirrorLogs.length > 0
          ? this.mirrorLogs[this.mirrorLogs.length - 1].timestamp
          : null,
    };
  }
}

// Global instance
export const erganiConnector = new ErganiConnector();
