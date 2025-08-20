/**
 * Instant Re-issue Metrics Service
 * 
 * Tracks and analyzes key metrics for IRIS/SCT Instant re-issue system:
 * - Success rates
 * - Time-to-settle distribution
 * - SLA compliance
 * - Fallback usage patterns
 * - Double-pay protection effectiveness
 */

import { db } from '../db';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import { paymentTransactions, paymentBatches, instantMetrics } from '@shared/payments-schema';

export interface InstantMetricsSnapshot {
  // Success Rate Metrics
  totalReissues: number;
  successfulReissues: number;
  failedReissues: number;
  successRate: number; // percentage

  // Time-to-Settle Metrics
  medianSettlementTime: number; // milliseconds
  p95SettlementTime: number; // milliseconds
  p99SettlementTime: number; // milliseconds
  slaCompliance: number; // percentage within 30s

  // Volume Metrics
  totalAmount: number; // EUR
  averageAmount: number; // EUR
  reissuesLast24h: number;

  // Fallback and Error Patterns
  bankOfflineCount: number;
  amountExceededCount: number;
  unreachableCount: number;
  doublePayBlocks: number;

  // SLA Breaches
  slaBreaches: number;
  averageBreachTime: number; // milliseconds beyond 30s
}

export interface SettlementRecord {
  transactionId: string;
  settlementTime: number; // ms from creation to settlement
  withinSLA: boolean;
  amount: number;
  batchId: string;
  processingTime: number;
}

export interface SLABreachRecord {
  transactionId: string;
  expectedSettlement: number; // seconds
  actualTime: number; // milliseconds
  reason: string;
}

export class InstantMetricsService {

  /**
   * Record successful settlement
   */
  static async recordSettlement(record: SettlementRecord): Promise<void> {
    try {
      await db.insert(instantMetrics).values({
        metricId: `settlement-${record.transactionId}`,
        transactionId: record.transactionId,
        metricType: 'settlement',
        value: record.settlementTime.toString(),
        metadata: JSON.stringify({
          withinSLA: record.withinSLA,
          amount: record.amount,
          batchId: record.batchId,
          processingTime: record.processingTime,
        }),
        recordedAt: new Date(),
      });

      // Log for monitoring
      console.log(`Instant settlement recorded: ${record.transactionId}, time: ${record.settlementTime}ms, SLA: ${record.withinSLA}`);
    } catch (error) {
      console.error('Failed to record settlement metric:', error);
    }
  }

  /**
   * Record SLA breach
   */
  static async recordSLABreach(breach: SLABreachRecord): Promise<void> {
    try {
      await db.insert(instantMetrics).values({
        metricId: `sla-breach-${breach.transactionId}`,
        transactionId: breach.transactionId,
        metricType: 'sla_breach',
        value: breach.actualTime.toString(),
        metadata: JSON.stringify({
          expectedSettlement: breach.expectedSettlement,
          reason: breach.reason,
        }),
        recordedAt: new Date(),
      });

      console.warn(`SLA breach recorded: ${breach.transactionId}, expected: ${breach.expectedSettlement}s, actual: ${breach.actualTime}ms`);
    } catch (error) {
      console.error('Failed to record SLA breach:', error);
    }
  }

  /**
   * Record instant re-issue rejection
   */
  static async recordInstantRejection(rejection: {
    transactionId: string;
    reason: string;
    originalLineId?: string;
  }): Promise<void> {
    try {
      await db.insert(instantMetrics).values({
        metricId: `rejection-${rejection.transactionId}`,
        transactionId: rejection.transactionId,
        metricType: 'rejection',
        value: 'REJECTED',
        metadata: JSON.stringify({
          reason: rejection.reason,
          originalLineId: rejection.originalLineId,
        }),
        recordedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to record rejection metric:', error);
    }
  }

  /**
   * Record status update
   */
  static async recordStatusUpdate(update: {
    transactionId: string;
    fromStatus: string;
    toStatus: string;
    processingTime: number;
    isInstantReissue: boolean;
  }): Promise<void> {
    if (!update.isInstantReissue) return; // Only track instant re-issues

    try {
      await db.insert(instantMetrics).values({
        metricId: `status-${update.transactionId}-${Date.now()}`,
        transactionId: update.transactionId,
        metricType: 'status_change',
        value: `${update.fromStatus}->${update.toStatus}`,
        metadata: JSON.stringify({
          processingTime: update.processingTime,
        }),
        recordedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to record status update:', error);
    }
  }

  /**
   * Get comprehensive metrics snapshot
   */
  static async getMetricsSnapshot(
    dateFrom: Date = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
    dateTo: Date = new Date()
  ): Promise<InstantMetricsSnapshot> {
    try {
      // Get all instant re-issue transactions in period
      const instantTransactions = await db
        .select({
          transactionId: paymentTransactions.transactionId,
          amount: paymentTransactions.amount,
          status: paymentTransactions.status,
          createdAt: paymentTransactions.createdAt,
          settledAt: paymentTransactions.settledAt,
          endToEndId: paymentTransactions.endToEndId,
        })
        .from(paymentTransactions)
        .where(and(
          eq(paymentTransactions.paymentMethod, 'SCT_INST'),
          gte(paymentTransactions.createdAt!, dateFrom),
          lte(paymentTransactions.createdAt!, dateTo),
          sql`${paymentTransactions.endToEndId} LIKE '%-R1'` // Instant re-issues only
        ));

      // Calculate basic metrics
      const totalReissues = instantTransactions.length;
      const successfulReissues = instantTransactions.filter(t => t.status === 'settled').length;
      const failedReissues = instantTransactions.filter(t => t.status === 'rejected').length;
      const successRate = totalReissues > 0 ? (successfulReissues / totalReissues) * 100 : 0;

      // Calculate settlement times for successful transactions
      const settledTransactions = instantTransactions
        .filter(t => t.status === 'settled' && t.settledAt && t.createdAt)
        .map(t => ({
          ...t,
          settlementTime: t.settledAt!.getTime() - t.createdAt!.getTime(),
        }));

      // Sort by settlement time for percentile calculations
      settledTransactions.sort((a, b) => a.settlementTime - b.settlementTime);

      const medianSettlementTime = this.calculatePercentile(settledTransactions.map(t => t.settlementTime), 50);
      const p95SettlementTime = this.calculatePercentile(settledTransactions.map(t => t.settlementTime), 95);
      const p99SettlementTime = this.calculatePercentile(settledTransactions.map(t => t.settlementTime), 99);

      // SLA compliance (within 30 seconds)
      const withinSLA = settledTransactions.filter(t => t.settlementTime <= 30000).length;
      const slaCompliance = settledTransactions.length > 0 ? (withinSLA / settledTransactions.length) * 100 : 0;

      // Volume metrics
      const totalAmount = instantTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const averageAmount = totalReissues > 0 ? totalAmount / totalReissues : 0;

      // Get SLA breach metrics
      const slaBreaches = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(instantMetrics)
        .where(and(
          eq(instantMetrics.metricType, 'sla_breach'),
          gte(instantMetrics.recordedAt, dateFrom),
          lte(instantMetrics.recordedAt, dateTo)
        ));

      return {
        totalReissues,
        successfulReissues,
        failedReissues,
        successRate: Math.round(successRate * 100) / 100,
        medianSettlementTime: Math.round(medianSettlementTime),
        p95SettlementTime: Math.round(p95SettlementTime),
        p99SettlementTime: Math.round(p99SettlementTime),
        slaCompliance: Math.round(slaCompliance * 100) / 100,
        totalAmount,
        averageAmount: Math.round(averageAmount * 100) / 100,
        reissuesLast24h: totalReissues,
        bankOfflineCount: 2, // Mock data
        amountExceededCount: 5, // Mock data
        unreachableCount: 3, // Mock data
        doublePayBlocks: 1, // Mock data
        slaBreaches: slaBreaches[0]?.count || 0,
        averageBreachTime: 0, // TODO: Calculate from breach records
      };

    } catch (error) {
      console.error('Failed to generate metrics snapshot:', error);
      throw error;
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private static calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) {
      return sortedArray[sortedArray.length - 1];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Get real-time dashboard data
   */
  static async getDashboardMetrics(): Promise<{
    activeReissues: number;
    avgSettlementTime: number;
    successRateToday: number;
    slaComplianceToday: number;
    recentActivity: Array<{
      timestamp: Date;
      type: 'success' | 'failure' | 'sla_breach';
      transactionId: string;
      details: string;
    }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's snapshot
    const todaySnapshot = await this.getMetricsSnapshot(today, new Date());

    // Get active (pending) re-issues
    const activeReissues = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(paymentTransactions)
      .where(and(
        eq(paymentTransactions.paymentMethod, 'SCT_INST'),
        sql`${paymentTransactions.status} IN ('submitted', 'accepted', 'pending')`,
        sql`${paymentTransactions.endToEndId} LIKE '%-R1'`
      ));

    // Get recent activity
    const recentMetrics = await db
      .select()
      .from(instantMetrics)
      .where(gte(instantMetrics.recordedAt, new Date(Date.now() - 60 * 60 * 1000))) // Last hour
      .orderBy(desc(instantMetrics.recordedAt))
      .limit(10);

    const recentActivity = recentMetrics.map(metric => ({
      timestamp: metric.recordedAt,
      type: this.mapMetricTypeToActivity(metric.metricType),
      transactionId: metric.transactionId,
      details: this.formatMetricDetails(metric),
    }));

    return {
      activeReissues: activeReissues[0]?.count || 0,
      avgSettlementTime: todaySnapshot.medianSettlementTime,
      successRateToday: todaySnapshot.successRate,
      slaComplianceToday: todaySnapshot.slaCompliance,
      recentActivity,
    };
  }

  /**
   * Map metric type to activity type
   */
  private static mapMetricTypeToActivity(metricType: string): 'success' | 'failure' | 'sla_breach' {
    switch (metricType) {
      case 'settlement': return 'success';
      case 'rejection': return 'failure';
      case 'sla_breach': return 'sla_breach';
      default: return 'success';
    }
  }

  /**
   * Format metric details for display
   */
  private static formatMetricDetails(metric: any): string {
    try {
      const metadata = JSON.parse(metric.metadata || '{}');
      switch (metric.metricType) {
        case 'settlement':
          return `Settled in ${metric.value}ms (${metadata.withinSLA ? 'within' : 'outside'} SLA)`;
        case 'rejection':
          return `Rejected: ${metadata.reason}`;
        case 'sla_breach':
          return `SLA breach: ${metadata.reason}`;
        default:
          return `Status: ${metric.value}`;
      }
    } catch {
      return `Status: ${metric.value}`;
    }
  }
}