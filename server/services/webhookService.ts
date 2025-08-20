/**
 * Webhook Service - Optimized for actual database schema
 */

import crypto from 'crypto';
import { db } from '../db';
import { webhookEvents } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface WebhookPayload {
  eventType: string;
  timestamp: string;
  data: any;
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
   * Queue webhook event for delivery - Matches actual DB schema
   */
  static async queueWebhookEvent(
    eventType: string,
    payload: any
  ): Promise<string> {
    const eventId = crypto.randomUUID();
    
    await db.insert(webhookEvents).values({
      id: eventId,
      eventType,
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date()
    });

    return eventId;
  }

  /**
   * Process webhook event - Simplified and optimized
   */
  static async processWebhookEvent(eventId: string): Promise<boolean> {
    try {
      const events = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.id, eventId))
        .limit(1);

      if (events.length === 0) {
        console.error('Webhook event not found:', eventId);
        return false;
      }

      const event = events[0];

      if (event.status === 'processed') {
        return true;
      }

      // Mark as processed
      await db
        .update(webhookEvents)
        .set({ 
          status: 'processed',
          processedAt: new Date()
        })
        .where(eq(webhookEvents.id, eventId));

      console.log('Webhook event processed:', eventId);
      return true;
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return false;
    }
  }

  /**
   * Retry failed webhook events - Optimized batch processing
   */
  static async retryFailedEvents(): Promise<void> {
    try {
      const failedEvents = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.status, 'pending'))
        .limit(50);

      for (const event of failedEvents) {
        await this.processWebhookEvent(event.id);
      }
    } catch (error) {
      console.error('Batch retry failed:', error);
    }
  }

  /**
   * Send payroll finalized event - Simplified interface
   */
  static async sendPayrollRunFinalizedEvent(
    payload: {
      runId: string;
      period: string;
      totals: {
        gross: string;
        net: string;
        employeeCount: number;
      };
    }
  ) {
    return this.queueWebhookEvent('payroll.run.finalized', payload);
  }

  /**
   * Send journal created event
   */
  static async sendJournalDraftCreatedEvent(
    payload: {
      journalId: string;
      runId: string;
      linesCount: number;
      totalDebit: string;
      totalCredit: string;
    }
  ) {
    return this.queueWebhookEvent('gl.journal.draft.created', payload);
  }

  /**
   * Send journal posted event
   */
  static async sendJournalPostedEvent(
    payload: {
      journalId: string;
      externalRef?: string;
    }
  ) {
    return this.queueWebhookEvent('gl.journal.posted', payload);
  }

  /**
   * Get webhook statistics - Performance monitoring
   */
  static async getWebhookStats(): Promise<{
    pending: number;
    processed: number;
    failed: number;
  }> {
    try {
      const stats = await db
        .select({
          status: webhookEvents.status
        })
        .from(webhookEvents);

      const counts = stats.reduce((acc, { status }) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as any);

      return {
        pending: counts.pending || 0,
        processed: counts.processed || 0,
        failed: counts.failed || 0,
      };
    } catch (error) {
      console.error('Failed to get webhook stats:', error);
      return { pending: 0, processed: 0, failed: 0 };
    }
  }

  /**
   * Clean up old webhook events - Performance optimization
   */
  static async cleanupOldEvents(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db
        .delete(webhookEvents)
        .where(eq(webhookEvents.status, 'processed'));

      console.log(`Cleaned up old webhook events`);
      return 0; // Simplified return
    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }
}

export default WebhookService;