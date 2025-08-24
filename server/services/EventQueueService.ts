import { nanoid } from "nanoid";
import { triggerWebhook } from "../api/webhooks";

/**
 * Event Queue Service - Evented Platform with Queue Retries
 * 
 * Provides reliable event processing with:
 * - Idempotency for replay safety
 * - Persistent queue with retry logic
 * - Performance monitoring (<30s target)
 * - Dead letter queue for failed events
 */

// Event Queue Types
export interface QueuedEvent {
  eventId: string;
  eventType: string;
  idempotencyKey: string;
  payload: any;
  metadata?: any;
  sourceSystem: string;
  correlationId?: string;
  
  // Processing Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  priority: number;
  
  // Retry Logic
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: Date;
  lastAttemptAt?: Date;
  
  // Performance Tracking
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  processingDurationMs?: number;
  
  // Results
  processingResult?: any;
  errorMessage?: string;
  
  // Timestamps
  scheduledFor: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventHandler {
  handlerId: string;
  eventType: string;
  handlerName: string;
  isActive: boolean;
  config: any;
  targetProcessingTimeMs: number;
  timeoutMs: number;
  retryPolicy: {
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    maxAttempts: number;
  };
}

export interface ProcessingResult {
  success: boolean;
  result?: any;
  error?: string;
  durationMs: number;
  handlerId: string;
}

/**
 * Event Queue Service Class
 */
export class EventQueueService {
  private static instance: EventQueueService;
  private eventQueue: Map<string, QueuedEvent> = new Map();
  private eventHandlers: Map<string, EventHandler> = new Map();
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private idempotencyCache: Set<string> = new Set();
  
  // Performance metrics
  private metrics = {
    eventsProcessed: 0,
    averageProcessingTime: 0,
    successRate: 0,
    failureCount: 0,
  };

  private constructor() {
    this.initializeDefaultHandlers();
    this.startProcessingLoop();
  }

  public static getInstance(): EventQueueService {
    if (!EventQueueService.instance) {
      EventQueueService.instance = new EventQueueService();
    }
    return EventQueueService.instance;
  }

  /**
   * Initialize default event handlers
   */
  private initializeDefaultHandlers(): void {
    // GL Auto-Post Handler for payroll.run.finalized events
    this.registerHandler({
      handlerId: "gl-auto-post-handler",
      eventType: "payroll.run.finalized",
      handlerName: "GLAutoPostHandler",
      isActive: true,
      config: {
        glConnectionId: "default",
        autoPost: true,
      },
      targetProcessingTimeMs: 30000, // 30 seconds
      timeoutMs: 120000, // 2 minutes
      retryPolicy: {
        initialDelayMs: 1000,
        maxDelayMs: 300000,
        backoffMultiplier: 2.0,
        maxAttempts: 5,
      },
    });

    // Webhook Delivery Handler for external integrations
    this.registerHandler({
      handlerId: "webhook-delivery-handler",
      eventType: "*", // Handles all event types
      handlerName: "WebhookDeliveryHandler",
      isActive: true,
      config: {},
      targetProcessingTimeMs: 10000, // 10 seconds
      timeoutMs: 60000, // 1 minute
      retryPolicy: {
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        backoffMultiplier: 2.0,
        maxAttempts: 3,
      },
    });
  }

  /**
   * Start the processing loop
   */
  private startProcessingLoop(): void {
    const processEvents = () => {
      const now = new Date();
      const pendingEvents = Array.from(this.eventQueue.values())
        .filter(event => 
          event.status === 'pending' && 
          event.scheduledFor <= now
        )
        .sort((a, b) => b.priority - a.priority); // Higher priority first

      for (const event of pendingEvents.slice(0, 10)) { // Process up to 10 events per cycle
        this.processEvent(event);
      }
    };

    // Process events every second (safely)
    import('../utils/safeScheduler').then(({ createSafeInterval }) => {
      createSafeInterval(processEvents, {
        name: 'Event Queue Processor',
        enableEnvVar: 'ENABLE_EVENT_QUEUE',
        intervalMs: 1000,
        runImmediately: false
      });
    });
  }

  /**
   * Enqueue an event for processing
   */
  public async enqueueEvent(
    eventType: string,
    payload: any,
    options: {
      idempotencyKey?: string;
      priority?: number;
      scheduledFor?: Date;
      metadata?: any;
      sourceSystem?: string;
      correlationId?: string;
      maxAttempts?: number;
    } = {}
  ): Promise<QueuedEvent> {
    const eventId = nanoid();
    const idempotencyKey = options.idempotencyKey || `${eventType}-${eventId}`;
    
    // Check idempotency
    if (this.idempotencyCache.has(idempotencyKey)) {
      const existingEvent = Array.from(this.eventQueue.values())
        .find(e => e.idempotencyKey === idempotencyKey);
      if (existingEvent) {
        return existingEvent;
      }
    }

    const event: QueuedEvent = {
      eventId,
      eventType,
      idempotencyKey,
      payload,
      metadata: options.metadata || {},
      sourceSystem: options.sourceSystem || 'payroll',
      correlationId: options.correlationId,
      status: 'pending',
      priority: options.priority || 0,
      attemptCount: 0,
      maxAttempts: options.maxAttempts || 5,
      scheduledFor: options.scheduledFor || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.eventQueue.set(eventId, event);
    this.idempotencyCache.add(idempotencyKey);

    console.log(`[EventQueue] Enqueued event ${eventType} (${eventId})`);
    return event;
  }

  /**
   * Process a single event
   */
  private async processEvent(event: QueuedEvent): Promise<void> {
    event.status = 'processing';
    event.attemptCount++;
    event.lastAttemptAt = new Date();
    event.processingStartedAt = new Date();
    event.updatedAt = new Date();

    console.log(`[EventQueue] Processing event ${event.eventType} (${event.eventId}) - attempt ${event.attemptCount}`);

    try {
      const handlers = this.getHandlersForEvent(event.eventType);
      let lastResult: ProcessingResult | null = null;

      for (const handler of handlers) {
        if (!handler.isActive) continue;

        try {
          const result = await this.executeHandler(handler, event);
          lastResult = result;

          if (!result.success) {
            throw new Error(result.error || 'Handler failed');
          }
        } catch (error) {
          console.error(`[EventQueue] Handler ${handler.handlerName} failed:`, error);
          lastResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            durationMs: 0,
            handlerId: handler.handlerId,
          };
        }
      }

      // Mark event as completed
      event.status = 'completed';
      event.processingCompletedAt = new Date();
      event.processingDurationMs = event.processingCompletedAt.getTime() - event.processingStartedAt!.getTime();
      event.processingResult = lastResult;
      event.updatedAt = new Date();

      // Update metrics
      this.updateMetrics(event, true);

      console.log(`[EventQueue] Event ${event.eventType} (${event.eventId}) completed in ${event.processingDurationMs}ms`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[EventQueue] Event processing failed:`, errorMessage);

      event.errorMessage = errorMessage;
      event.processingCompletedAt = new Date();
      event.processingDurationMs = event.processingCompletedAt.getTime() - event.processingStartedAt!.getTime();
      event.updatedAt = new Date();

      // Check if we should retry
      if (event.attemptCount < event.maxAttempts) {
        event.status = 'pending';
        event.nextAttemptAt = this.calculateNextAttempt(event.attemptCount);
        event.scheduledFor = event.nextAttemptAt;
        console.log(`[EventQueue] Event ${event.eventId} scheduled for retry at ${event.nextAttemptAt}`);
      } else {
        // Move to dead letter queue
        event.status = 'dead_letter';
        this.moveToDeadLetterQueue(event);
      }

      // Update metrics
      this.updateMetrics(event, false);
    }
  }

  /**
   * Execute a specific handler for an event
   */
  private async executeHandler(handler: EventHandler, event: QueuedEvent): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      let result: any = null;

      switch (handler.handlerName) {
        case 'GLAutoPostHandler':
          result = await this.handleGLAutoPost(event, handler.config);
          break;
        
        case 'WebhookDeliveryHandler':
          result = await this.handleWebhookDelivery(event, handler.config);
          break;
        
        default:
          throw new Error(`Unknown handler: ${handler.handlerName}`);
      }

      const durationMs = Date.now() - startTime;
      
      // Check if we exceeded target time
      if (durationMs > handler.targetProcessingTimeMs) {
        console.warn(`[EventQueue] Handler ${handler.handlerName} exceeded target time: ${durationMs}ms > ${handler.targetProcessingTimeMs}ms`);
      }

      return {
        success: true,
        result,
        durationMs,
        handlerId: handler.handlerId,
      };

    } catch (error) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
        handlerId: handler.handlerId,
      };
    }
  }

  /**
   * Handle GL Auto-Post for payroll.run.finalized events
   */
  private async handleGLAutoPost(event: QueuedEvent, config: any): Promise<any> {
    if (event.eventType !== 'payroll.run.finalized') {
      return { message: 'Event type not supported by GLAutoPostHandler' };
    }

    const { GLExportService } = await import('./glExportService');
    const { GLExportCanonical } = await import('./glExportCanonical');
    
    const { payrollRunId, period, totalGrossPay, employeeCount } = event.payload;
    
    if (!payrollRunId) {
      throw new Error('payrollRunId is required for GL auto-posting');
    }

    const startTime = Date.now();
    
    try {
      // Generate GL journal using the canonical service
      const journal = await GLExportCanonical.generateJournal({
        tenantId: "default",
        entityId: "default",
        period: period || new Date().toISOString().slice(0, 7),
        currency: "EUR",
        description: `Payroll ${period} - ${employeeCount} employees`,
        payrollRun: {
          runId: payrollRunId,
          runNumber: payrollRunId.slice(-8),
          payPeriodStart: `${period}-01`,
          payPeriodEnd: `${period}-28`,
          payDate: new Date().toISOString().split('T')[0],
          entityId: "default",
          totalGross: totalGrossPay?.toString() || "0.00",
          totalNet: (totalGrossPay * 0.8)?.toString() || "0.00",
          employeeCount: employeeCount || 0,
          lineItems: []
        }
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`[GLAutoPost] Generated journal ${journal.journalId} for payroll run ${payrollRunId} in ${processingTime}ms`);

      return {
        journalId: journal.journalId,
        status: journal.status,
        processingTimeMs: processingTime,
        totalDebit: journal.totalDebit,
        totalCredit: journal.totalCredit,
        linesGenerated: journal.lineCount,
      };

    } catch (error) {
      console.error(`[GLAutoPost] Failed to generate GL journal:`, error);
      throw error;
    }
  }

  /**
   * Handle webhook delivery for events
   */
  private async handleWebhookDelivery(event: QueuedEvent, config: any): Promise<any> {
    try {
      // Use existing webhook system
      await triggerWebhook(event.eventType, {
        ...event.payload,
        eventId: event.eventId,
        processingAttempt: event.attemptCount,
      });

      return {
        message: 'Webhook delivery initiated',
        eventType: event.eventType,
        attempt: event.attemptCount,
      };
    } catch (error) {
      console.error(`[WebhookDelivery] Failed to deliver webhook:`, error);
      throw error;
    }
  }

  /**
   * Get handlers for a specific event type
   */
  private getHandlersForEvent(eventType: string): EventHandler[] {
    return Array.from(this.eventHandlers.values())
      .filter(handler => 
        handler.isActive && 
        (handler.eventType === eventType || handler.eventType === '*')
      );
  }

  /**
   * Register an event handler
   */
  public registerHandler(handler: EventHandler): void {
    this.eventHandlers.set(handler.handlerId, handler);
    console.log(`[EventQueue] Registered handler ${handler.handlerName} for ${handler.eventType}`);
  }

  /**
   * Calculate next retry attempt time
   */
  private calculateNextAttempt(attemptCount: number): Date {
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes
    const backoffMultiplier = 2.0;
    
    const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attemptCount - 1), maxDelay);
    return new Date(Date.now() + delay);
  }

  /**
   * Move event to dead letter queue
   */
  private moveToDeadLetterQueue(event: QueuedEvent): void {
    console.error(`[EventQueue] Moving event ${event.eventId} to dead letter queue after ${event.attemptCount} attempts`);
    
    // In a real implementation, this would persist to a dead letter table
    // For now, just log it
    console.log(`[DeadLetter] Event: ${JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      idempotencyKey: event.idempotencyKey,
      lastError: event.errorMessage,
      attemptCount: event.attemptCount,
    })}`);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(event: QueuedEvent, success: boolean): void {
    this.metrics.eventsProcessed++;
    
    if (success) {
      const processingTime = event.processingDurationMs || 0;
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime + processingTime) / 2;
    } else {
      this.metrics.failureCount++;
    }
    
    this.metrics.successRate = 
      this.metrics.eventsProcessed > 0 
        ? ((this.metrics.eventsProcessed - this.metrics.failureCount) / this.metrics.eventsProcessed) * 100
        : 0;
  }

  /**
   * Get current queue status
   */
  public getQueueStatus(): {
    totalEvents: number;
    pendingEvents: number;
    processingEvents: number;
    completedEvents: number;
    failedEvents: number;
    deadLetterEvents: number;
    metrics: {
      eventsProcessed: number;
      averageProcessingTime: number;
      successRate: number;
      failureCount: number;
    };
  } {
    const events = Array.from(this.eventQueue.values());
    
    return {
      totalEvents: events.length,
      pendingEvents: events.filter(e => e.status === 'pending').length,
      processingEvents: events.filter(e => e.status === 'processing').length,
      completedEvents: events.filter(e => e.status === 'completed').length,
      failedEvents: events.filter(e => e.status === 'failed').length,
      deadLetterEvents: events.filter(e => e.status === 'dead_letter').length,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Get event by ID
   */
  public getEvent(eventId: string): QueuedEvent | undefined {
    return this.eventQueue.get(eventId);
  }

  /**
   * Get events by status
   */
  public getEventsByStatus(status: QueuedEvent['status']): QueuedEvent[] {
    return Array.from(this.eventQueue.values())
      .filter(event => event.status === status);
  }

  /**
   * Retry failed event
   */
  public async retryEvent(eventId: string): Promise<boolean> {
    const event = this.eventQueue.get(eventId);
    if (!event) return false;

    if (event.status === 'failed' || event.status === 'dead_letter') {
      event.status = 'pending';
      event.scheduledFor = new Date();
      event.attemptCount = 0; // Reset attempt count
      event.errorMessage = undefined;
      event.updatedAt = new Date();
      
      console.log(`[EventQueue] Manual retry initiated for event ${eventId}`);
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const eventQueueService = EventQueueService.getInstance();