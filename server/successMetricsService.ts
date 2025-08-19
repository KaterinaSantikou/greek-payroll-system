import { db } from "./db";
import { 
  successMetrics, 
  successMetricAlerts,
  employees,
  properties
} from "@shared/schema";
import { eq, gte, lte, and, desc, count } from "drizzle-orm";

export class SuccessMetricsService {
  constructor() {}

  // Generate demo success metrics data
  async generateDemoSuccessMetrics(): Promise<void> {
    const currentDate = new Date();
    const payPeriodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const payPeriodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const properties = ['PRINCESS-FO', 'PRINCESS-HOUSE', 'PRINCESS-FB'];

    for (const propertyId of properties) {
      // Generate metrics with realistic values
      const erganiTotal = Math.floor(Math.random() * 500) + 300; // 300-800 submissions
      const erganiSuccess = Math.floor(erganiTotal * (0.985 + Math.random() * 0.014)); // 98.5-99.9% success
      const erganiRate = (erganiSuccess / erganiTotal) * 100;

      const totalExceptions = Math.floor(Math.random() * 20) + 5; // 5-25 exceptions
      const resolvedExceptions = Math.floor(totalExceptions * (0.95 + Math.random() * 0.05)); // 95-100% resolved
      const unresolvedExceptions = totalExceptions - resolvedExceptions;
      const unresolvedRate = (unresolvedExceptions / totalExceptions) * 100;

      const totalPunches = Math.floor(Math.random() * 2000) + 1000; // 1000-3000 punches
      const geoVerified = Math.floor(totalPunches * (0.94 + Math.random() * 0.06)); // 94-100% geo-verified
      const geoRate = (geoVerified / totalPunches) * 100;
      const manualEntries = totalPunches - geoVerified;

      const scheduledOT = Math.random() * 200 + 50; // 50-250 hours
      const actualOT = scheduledOT * (0.85 + Math.random() * 0.3); // 85-115% variance
      const overtimeVariance = ((actualOT - scheduledOT) / scheduledOT) * 100;
      const otCompliance = Math.abs(overtimeVariance) <= 15; // Within ±15%

      const auditTime = Math.floor(Math.random() * 180) + 60; // 60-240 seconds
      const auditSize = Math.floor(Math.random() * 50) + 10; // 10-60 MB
      const auditSuccess = Math.random() > 0.05; // 95% success rate

      // Calculate overall compliance score
      const erganiScore = Math.min(erganiRate, 100);
      const exceptionScore = Math.max(0, 100 - unresolvedRate * 10);
      const geoScore = Math.min(geoRate, 100);
      const otScore = otCompliance ? 100 : Math.max(0, 100 - Math.abs(overtimeVariance) * 2);
      const auditScore = auditSuccess && auditTime <= 300 ? 100 : 80;
      const overallScore = (erganiScore + exceptionScore + geoScore + otScore + auditScore) / 5;

      await db.insert(successMetrics).values({
        propertyId,
        metricDate: currentDate,
        payPeriodStart,
        payPeriodEnd,
        erganiSubmissionTotal: erganiTotal,
        erganiSubmissionSuccess: erganiSuccess,
        erganiSubmissionRate: erganiRate.toString(),
        totalExceptions,
        resolvedExceptions,
        unresolvedExceptions,
        unresolvedExceptionRate: unresolvedRate.toString(),
        totalPunches,
        geoVerifiedPunches: geoVerified,
        geoVerificationRate: geoRate.toString(),
        manualPayrollEntries: manualEntries,
        scheduledOvertimeHours: scheduledOT.toString(),
        actualOvertimeHours: actualOT.toString(),
        overtimeVariance: overtimeVariance.toString(),
        overtimePolicyCompliance: otCompliance,
        auditPackGenerationTime: auditTime,
        auditPackSize: auditSize,
        auditPackSuccess: auditSuccess,
        overallComplianceScore: overallScore.toString(),
      });

      // Generate alerts for metrics below thresholds
      if (erganiRate < 99.0) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'ergani_submission',
          alertLevel: erganiRate < 98.0 ? 'critical' : 'warning',
          threshold: '99.0',
          actualValue: erganiRate.toString(),
          message: `ERGANI submission rate is ${erganiRate.toFixed(1)}%, below the required 99% threshold`,
          isResolved: false,
        });
      }

      if (unresolvedRate > 1.0) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'exceptions',
          alertLevel: unresolvedRate > 2.0 ? 'critical' : 'warning',
          threshold: '1.0',
          actualValue: unresolvedRate.toString(),
          message: `Unresolved exception rate is ${unresolvedRate.toFixed(1)}%, above the maximum 1% threshold`,
          isResolved: false,
        });
      }

      if (geoRate < 95.0) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'geo_verification',
          alertLevel: geoRate < 90.0 ? 'critical' : 'warning',
          threshold: '95.0',
          actualValue: geoRate.toString(),
          message: `Geo-verification rate is ${geoRate.toFixed(1)}%, below the required 95% threshold`,
          isResolved: false,
        });
      }

      if (Math.abs(overtimeVariance) > 15.0) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'overtime_variance',
          alertLevel: Math.abs(overtimeVariance) > 25.0 ? 'critical' : 'warning',
          threshold: '15.0',
          actualValue: Math.abs(overtimeVariance).toString(),
          message: `Overtime variance is ${overtimeVariance.toFixed(1)}%, outside policy limits (±15%)`,
          isResolved: false,
        });
      }

      if (auditTime > 300) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'audit_performance',
          alertLevel: auditTime > 600 ? 'critical' : 'warning',
          threshold: '300',
          actualValue: auditTime.toString(),
          message: `Audit pack generation took ${auditTime} seconds, above the 5-minute threshold`,
          isResolved: false,
        });
      }
    }
  }

  // Get success metrics for a property and date range
  async getSuccessMetrics(propertyId: string, startDate: Date, endDate: Date) {
    const metrics = await db
      .select()
      .from(successMetrics)
      .where(
        and(
          eq(successMetrics.propertyId, propertyId),
          gte(successMetrics.metricDate, startDate),
          lte(successMetrics.metricDate, endDate)
        )
      )
      .orderBy(desc(successMetrics.metricDate));

    return metrics;
  }

  // Get latest success metrics for all properties
  async getLatestSuccessMetrics() {
    const latestMetrics = await db
      .select()
      .from(successMetrics)
      .orderBy(desc(successMetrics.metricDate))
      .limit(10);

    return latestMetrics;
  }

  // Get success metric alerts
  async getSuccessMetricAlerts(propertyId?: string, resolved?: boolean) {
    let query = db.select().from(successMetricAlerts);

    const conditions = [];
    if (propertyId) {
      conditions.push(eq(successMetricAlerts.propertyId, propertyId));
    }
    if (resolved !== undefined) {
      conditions.push(eq(successMetricAlerts.isResolved, resolved));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const alerts = await query.orderBy(desc(successMetricAlerts.createdAt)).limit(50);
    return alerts;
  }

  // Get success metrics summary for dashboard
  async getSuccessMetricsSummary(propertyId?: string) {
    let query = db.select().from(successMetrics);
    
    if (propertyId) {
      query = query.where(eq(successMetrics.propertyId, propertyId));
    }

    const latestMetrics = await query
      .orderBy(desc(successMetrics.metricDate))
      .limit(propertyId ? 1 : 3);

    if (latestMetrics.length === 0) {
      return {
        avgErganiSubmissionRate: 0,
        avgUnresolvedExceptionRate: 0,
        avgGeoVerificationRate: 0,
        avgOvertimeVariance: 0,
        avgAuditPackTime: 0,
        avgOverallScore: 0,
        totalActiveAlerts: 0,
        trendsDirection: 'stable'
      };
    }

    const summary = {
      avgErganiSubmissionRate: latestMetrics.reduce((sum, m) => sum + parseFloat(m.erganiSubmissionRate), 0) / latestMetrics.length,
      avgUnresolvedExceptionRate: latestMetrics.reduce((sum, m) => sum + parseFloat(m.unresolvedExceptionRate), 0) / latestMetrics.length,
      avgGeoVerificationRate: latestMetrics.reduce((sum, m) => sum + parseFloat(m.geoVerificationRate), 0) / latestMetrics.length,
      avgOvertimeVariance: latestMetrics.reduce((sum, m) => sum + Math.abs(parseFloat(m.overtimeVariance)), 0) / latestMetrics.length,
      avgAuditPackTime: latestMetrics.reduce((sum, m) => sum + m.auditPackGenerationTime, 0) / latestMetrics.length,
      avgOverallScore: latestMetrics.reduce((sum, m) => sum + parseFloat(m.overallComplianceScore), 0) / latestMetrics.length,
      totalActiveAlerts: await this.getActiveAlertsCount(propertyId),
      trendsDirection: 'improving' // Could be calculated from historical data
    };

    return summary;
  }

  // Get count of active alerts
  async getActiveAlertsCount(propertyId?: string): Promise<number> {
    let query = db.select({ count: count() }).from(successMetricAlerts);
    
    const conditions = [eq(successMetricAlerts.isResolved, false)];
    if (propertyId) {
      conditions.push(eq(successMetricAlerts.propertyId, propertyId));
    }

    const result = await query.where(and(...conditions));
    return result[0]?.count || 0;
  }

  // Resolve an alert
  async resolveAlert(alertId: string, resolvedBy: string) {
    await db
      .update(successMetricAlerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      })
      .where(eq(successMetricAlerts.id, alertId));
  }
}

export const successMetricsService = new SuccessMetricsService();