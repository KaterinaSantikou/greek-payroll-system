/**
 * Webhook Service - Event-driven sync with HMAC signing and retry/backoff
 */

import crypto from 'crypto';
import { db } from '../db';
import { webhookEvents, partners } from '@shared/schema';
import { eq, and, lt, sql } from 'drizzle-orm';

export interface WebhookPayload {
  eventType: string;
  timestamp: string;
  data: any;
}

export interface WebhookSubscription {
  partnerId: string;
  webhookUrl: string;
  webhookSecret: string;
}

export class WebhookService {
  
  /**
   * Create HMAC SHA-256 signature for webhook payload
   */
  static createSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Queue webhook event for delivery
   */
  static async queueWebhookEvent(
    partnerId: string,
    eventType: string,
    resourceId: string,
    payload: any
  ): Promise<string> {
    const [event] = await db
      .insert(webhookEvents)
      .values({
        partnerId,
        eventType,
        resourceId,
        payload,
        status: 'pending',
        deliveryAttempts: 0,
      })
      .returning();

    // Trigger immediate delivery attempt
    this.deliverWebhookEvent(event.id).catch(error => {
      console.error('Initial webhook delivery failed:', error);
    });

    return event.id;
  }

  /**
   * Deliver webhook event with retry logic
   */
  static async deliverWebhookEvent(eventId: string): Promise<boolean> {
    try {
      // Get event and partner details
      const eventDetails = await db
        .select({
          event: webhookEvents,
          partner: partners,
        })
        .from(webhookEvents)
        .innerJoin(partners, eq(webhookEvents.partnerId, partners.id))
        .where(eq(webhookEvents.id, eventId))
        .limit(1);

      if (eventDetails.length === 0) {
        console.error('Webhook event not found:', eventId);
        return false;
      }

      const { event, partner } = eventDetails[0];

      if (!partner.webhookUrl || !partner.webhookSecret) {
        await this.markEventFailed(eventId, 'Partner webhook not configured');
        return false;
      }

      if (event.status === 'delivered') {
        return true; // Already delivered
      }

      if (event.deliveryAttempts >= 5) {
        await this.markEventFailed(eventId, 'Maximum delivery attempts exceeded');
        return false;
      }

      // Prepare webhook payload
      const webhookPayload: WebhookPayload = {
        eventType: event.eventType,
        timestamp: new Date().toISOString(),
        data: event.payload,
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = this.createSignature(payloadString, partner.webhookSecret);

      // Deliver webhook
      const response = await fetch(partner.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': `sha256=${signature}`,
          'User-Agent': 'PayrollSync-Webhooks/1.0',
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (response.ok) {
        // Success - mark as delivered
        await db
          .update(webhookEvents)
          .set({
            status: 'delivered',
            deliveredAt: new Date(),
            deliveryAttempts: event.deliveryAttempts + 1,
            lastAttemptAt: new Date(),
          })
          .where(eq(webhookEvents.id, eventId));

        return true;
      } else {
        // HTTP error - schedule retry
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        await this.scheduleRetry(eventId, event.deliveryAttempts + 1, errorMessage);
        return false;
      }
    } catch (error) {
      // Network/other error - schedule retry
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Webhook delivery error:', errorMessage);
      
      const eventData = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.id, eventId))
        .limit(1);

      if (eventData.length > 0) {
        await this.scheduleRetry(eventId, eventData[0].deliveryAttempts + 1, errorMessage);
      }
      
      return false;
    }
  }

  /**
   * Schedule webhook retry with exponential backoff
   */
  private static async scheduleRetry(eventId: string, attemptCount: number, errorMessage: string) {
    if (attemptCount >= 5) {
      await this.markEventFailed(eventId, 'Maximum retry attempts exceeded');
      return;
    }

    // Update attempt count and error
    await db
      .update(webhookEvents)
      .set({
        deliveryAttempts: attemptCount,
        lastAttemptAt: new Date(),
        errorMessage,
      })
      .where(eq(webhookEvents.id, eventId));

    // Schedule retry with exponential backoff: 2^attempt * 1000ms (1s, 2s, 4s, 8s, 16s)
    const backoffMs = Math.pow(2, attemptCount) * 1000;
    
    setTimeout(() => {
      this.deliverWebhookEvent(eventId).catch(console.error);
    }, backoffMs);
  }

  /**
   * Mark webhook event as permanently failed
   */
  private static async markEventFailed(eventId: string, errorMessage: string) {
    await db
      .update(webhookEvents)
      .set({
        status: 'failed',
        errorMessage,
        lastAttemptAt: new Date(),
      })
      .where(eq(webhookEvents.id, eventId));
  }

  /**
   * Retry failed webhook events
   */
  static async retryFailedEvents(): Promise<void> {
    // Get pending events that haven't been attempted in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const failedEvents = await db
      .select()
      .from(webhookEvents)
      .where(and(
        eq(webhookEvents.status, 'pending'),
        lt(webhookEvents.deliveryAttempts, 5),
        sql`(last_attempt_at IS NULL OR last_attempt_at < ${fiveMinutesAgo})`
      ))
      .limit(100); // Process in batches

    for (const event of failedEvents) {
      this.deliverWebhookEvent(event.id).catch(console.error);
    }
  }

  /**
   * Send specific webhook event types
   */
  static async sendPayrollRunFinalizedEvent(
    partnerId: string,
    payload: {
      tenant_id: string;
      entity_id: string;
      run_id: string;
      period: string;
      totals: {
        gross: string;
        net: string;
        employee_count: number;
      };
    }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'payroll.run.finalized',
      payload.run_id,
      payload
    );
  }

  static async sendJournalDraftCreatedEvent(
    partnerId: string,
    payload: {
      journal_id: string;
      run_id: string;
      lines_count: number;
      total_debit: string;
      total_credit: string;
    }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'gl.journal.draft.created',
      payload.journal_id,
      payload
    );
  }

  static async sendJournalPostedEvent(
    partnerId: string,
    payload: {
      journal_id: string;
      external_ref?: string;
    }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'gl.journal.posted',
      payload.journal_id,
      payload
    );
  }

  static async sendJournalReversedEvent(
    partnerId: string,
    payload: {
      original_journal_id: string;
      reversal_journal_id: string;
    }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'gl.journal.reversed',
      payload.original_journal_id,
      payload
    );
  }

  static async sendConnectorTokenRefreshedEvent(
    partnerId: string,
    payload: {
      connector: string;
      entity_id: string;
    }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'connector.token.refreshed',
      payload.entity_id,
      payload
    );
  }

  // =============================================================================
  // PAYMENT-SPECIFIC WEBHOOK EVENTS
  // =============================================================================

  /**
   * payments.batch.submitted
   */
  static async sendPaymentsBatchSubmittedEvent(
    partnerId: string,
    payload: { batchId: string; method: string; totals: any }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'payments.batch.submitted',
      payload.batchId,
      payload
    );
  }

  /**
   * payments.batch.updated
   */
  static async sendPaymentsBatchUpdatedEvent(
    partnerId: string,
    payload: { batchId: string; status: string; counters: any }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'payments.batch.updated',
      payload.batchId,
      payload
    );
  }

  /**
   * payments.line.accepted
   */
  static async sendPaymentsLineAcceptedEvent(
    partnerId: string,
    payload: { lineId: string; reasonCode?: string }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'payments.line.accepted',
      payload.lineId,
      payload
    );
  }

  /**
   * payments.line.rejected
   */
  static async sendPaymentsLineRejectedEvent(
    partnerId: string,
    payload: { lineId: string; reasonCode: string }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'payments.line.rejected',
      payload.lineId,
      payload
    );
  }

  /**
   * payments.line.settled
   */
  static async sendPaymentsLineSettledEvent(
    partnerId: string,
    payload: { lineId: string; camtRef: string }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'payments.line.settled',
      payload.lineId,
      payload
    );
  }

  /**
   * payments.line.superseded
   */
  static async sendPaymentsLineSupersededEvent(
    partnerId: string,
    payload: { lineId: string; newLineId: string }
  ) {
    return this.queueWebhookEvent(
      partnerId,
      'payments.line.superseded',
      payload.lineId,
      payload
    );
  }
}

// Start background retry process (in production, this would be a separate service)
setInterval(() => {
  WebhookService.retryFailedEvents().catch(console.error);
}, 5 * 60 * 1000); // Every 5 minutes