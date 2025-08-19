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

  // Key Success Metrics Thresholds
  private readonly KPI_THRESHOLDS = {
    UNRESOLVED_EXCEPTIONS_MAX: 1.0, // < 1% unresolved exceptions per pay period
    ERGANI_SUCCESS_MIN: 99.0, // ≥ 99% ERGANI/APD/ΦΜΥ submission success
    PAYROLL_RUNTIME_MAX: 15, // ≤ 15 min end-to-end payroll run for 200 employees
    ERP_AUTOMATION_TARGET: 100.0, // Zero manual re-key to ERP; 100% SEPA auto-reconcile
    EMPLOYEE_COUNT_BASELINE: 200 // Baseline for payroll performance measurement
  };

  // Generate demo success metrics data
  async generateDemoSuccessMetrics(): Promise<void> {
    const currentDate = new Date();
    const payPeriodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const payPeriodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const properties = ['PRINCESS-FO', 'PRINCESS-HOUSE', 'PRINCESS-FB'];

    for (const propertyId of properties) {
      // Generate metrics aligned with KPI targets
      const employeeCount = Math.floor(Math.random() * 100) + 150; // 150-250 employees
      
      // ERGANI/APD/ΦΜΥ Submission Success (≥ 99%)
      const erganiTotal = Math.floor(Math.random() * 500) + 300;
      const erganiSuccess = Math.floor(erganiTotal * (0.985 + Math.random() * 0.014)); // 98.5-99.9%
      const erganiRate = (erganiSuccess / erganiTotal) * 100;
      
      const apdTotal = Math.floor(Math.random() * 200) + 100;
      const apdSuccess = Math.floor(apdTotal * (0.99 + Math.random() * 0.009)); // 99-99.9%
      const apdRate = (apdSuccess / apdTotal) * 100;
      
      const fmyTotal = Math.floor(Math.random() * 100) + 50;
      const fmySuccess = Math.floor(fmyTotal * (0.995 + Math.random() * 0.005)); // 99.5-100%
      const fmyRate = (fmySuccess / fmyTotal) * 100;
      
      const overallSubmissionRate = ((erganiSuccess + apdSuccess + fmySuccess) / (erganiTotal + apdTotal + fmyTotal)) * 100;

      // Unresolved Exceptions (< 1% per pay period)
      const totalExceptions = Math.floor(Math.random() * 30) + 10; // 10-40 exceptions
      const resolvedExceptions = Math.floor(totalExceptions * (0.985 + Math.random() * 0.014)); // 98.5-99.9% resolved
      const unresolvedExceptions = totalExceptions - resolvedExceptions;
      const unresolvedRate = (unresolvedExceptions / totalExceptions) * 100;

      // Payroll Runtime (≤ 15 min for 200 employees)
      const scalingFactor = employeeCount / this.KPI_THRESHOLDS.EMPLOYEE_COUNT_BASELINE;
      const baseRuntimeMinutes = 8 + Math.random() * 10; // 8-18 minutes base
      const payrollRuntimeMinutes = baseRuntimeMinutes * scalingFactor;
      const payrollRuntimeSeconds = Math.floor(payrollRuntimeMinutes * 60);
      
      // ERP Integration & SEPA Auto-reconcile (100% automation target)
      const totalERPEntries = employeeCount * 3; // 3 entries per employee average
      const manualERPEntries = Math.floor(Math.random() * 3); // 0-2 manual entries
      const automatedERPEntries = totalERPEntries - manualERPEntries;
      const erpAutomationRate = (automatedERPEntries / totalERPEntries) * 100;
      
      const totalSEPAPayments = employeeCount;
      const autoReconciledSEPA = Math.floor(totalSEPAPayments * (0.995 + Math.random() * 0.005)); // 99.5-100%
      const sepaAutomationRate = (autoReconciledSEPA / totalSEPAPayments) * 100;
      
      // Overall automation score
      const overallAutomationRate = (erpAutomationRate + sepaAutomationRate) / 2;

      // Geo-verification and manual entries tracking
      const totalPunches = employeeCount * 25; // ~25 punches per employee per period
      const geoVerified = Math.floor(totalPunches * (0.96 + Math.random() * 0.04)); // 96-100% geo-verified
      const geoRate = (geoVerified / totalPunches) * 100;
      const manualPunchEntries = totalPunches - geoVerified;

      // Audit pack generation performance
      const auditTime = Math.floor(Math.random() * 120) + 30; // 30-150 seconds
      const auditSize = Math.floor(Math.random() * 50) + 15; // 15-65 MB
      const auditSuccess = Math.random() > 0.02; // 98% success rate

      // Calculate KPI compliance scores
      const submissionScore = overallSubmissionRate >= this.KPI_THRESHOLDS.ERGANI_SUCCESS_MIN ? 100 : (overallSubmissionRate / this.KPI_THRESHOLDS.ERGANI_SUCCESS_MIN) * 100;
      const exceptionScore = unresolvedRate < this.KPI_THRESHOLDS.UNRESOLVED_EXCEPTIONS_MAX ? 100 : Math.max(0, 100 - (unresolvedRate * 50));
      const runtimeScore = payrollRuntimeMinutes <= this.KPI_THRESHOLDS.PAYROLL_RUNTIME_MAX ? 100 : Math.max(0, 100 - ((payrollRuntimeMinutes - this.KPI_THRESHOLDS.PAYROLL_RUNTIME_MAX) * 5));
      const automationScore = Math.min(overallAutomationRate, 100);
      const overallScore = (submissionScore + exceptionScore + runtimeScore + automationScore) / 4;

      await db.insert(successMetrics).values({
        propertyId,
        metricDate: currentDate,
        payPeriodStart,
        payPeriodEnd,
        employeeCount,
        // Submission metrics
        erganiSubmissionTotal: erganiTotal + apdTotal + fmyTotal,
        erganiSubmissionSuccess: erganiSuccess + apdSuccess + fmySuccess,
        erganiSubmissionRate: overallSubmissionRate.toString(),
        // Exception metrics
        totalExceptions,
        resolvedExceptions,
        unresolvedExceptions,
        unresolvedExceptionRate: unresolvedRate.toString(),
        // Payroll runtime metrics
        payrollRuntimeMinutes: Math.round(payrollRuntimeMinutes),
        payrollRuntimeSeconds,
        payrollEmployeeCount: employeeCount,
        // Automation metrics
        totalERPEntries,
        manualERPEntries,
        automatedERPEntries,
        erpAutomationRate: erpAutomationRate.toString(),
        totalSEPAPayments,
        autoReconciledSEPA,
        sepaAutomationRate: sepaAutomationRate.toString(),
        overallAutomationRate: overallAutomationRate.toString(),
        // Punch tracking
        totalPunches,
        geoVerifiedPunches: geoVerified,
        geoVerificationRate: geoRate.toString(),
        manualPunchEntries,
        // Audit metrics
        auditPackGenerationTime: auditTime,
        auditPackSize: auditSize,
        auditPackSuccess: auditSuccess,
        // Overall score
        overallComplianceScore: overallScore.toString(),
      });

      // Generate KPI-specific alerts based on targets
      
      // Alert 1: ERGANI/APD/ΦΜΥ Submission Success < 99%
      if (overallSubmissionRate < this.KPI_THRESHOLDS.ERGANI_SUCCESS_MIN) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'government_submission',
          alertLevel: overallSubmissionRate < 97.0 ? 'critical' : 'warning',
          threshold: this.KPI_THRESHOLDS.ERGANI_SUCCESS_MIN.toString(),
          actualValue: overallSubmissionRate.toFixed(1),
          message: `Government submission success rate is ${overallSubmissionRate.toFixed(1)}%, below the required ≥99% KPI target`,
          isResolved: false,
        });
      }

      // Alert 2: Unresolved Exceptions ≥ 1%
      if (unresolvedRate >= this.KPI_THRESHOLDS.UNRESOLVED_EXCEPTIONS_MAX) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'unresolved_exceptions',
          alertLevel: unresolvedRate > 2.0 ? 'critical' : 'warning',
          threshold: this.KPI_THRESHOLDS.UNRESOLVED_EXCEPTIONS_MAX.toString(),
          actualValue: unresolvedRate.toFixed(2),
          message: `Unresolved exception rate is ${unresolvedRate.toFixed(2)}%, exceeding the <1% per pay period KPI target`,
          isResolved: false,
        });
      }

      // Alert 3: Payroll Runtime > 15 minutes
      if (payrollRuntimeMinutes > this.KPI_THRESHOLDS.PAYROLL_RUNTIME_MAX) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'payroll_runtime',
          alertLevel: payrollRuntimeMinutes > 20 ? 'critical' : 'warning',
          threshold: this.KPI_THRESHOLDS.PAYROLL_RUNTIME_MAX.toString(),
          actualValue: payrollRuntimeMinutes.toFixed(1),
          message: `Payroll runtime is ${payrollRuntimeMinutes.toFixed(1)} minutes for ${employeeCount} employees, exceeding the ≤15 min KPI target`,
          isResolved: false,
        });
      }

      // Alert 4: ERP/SEPA Automation < 100%
      if (overallAutomationRate < this.KPI_THRESHOLDS.ERP_AUTOMATION_TARGET) {
        await db.insert(successMetricAlerts).values({
          propertyId,
          metricType: 'automation_rate',
          alertLevel: overallAutomationRate < 95.0 ? 'critical' : 'warning',
          threshold: this.KPI_THRESHOLDS.ERP_AUTOMATION_TARGET.toString(),
          actualValue: overallAutomationRate.toFixed(1),
          message: `ERP/SEPA automation rate is ${overallAutomationRate.toFixed(1)}%, below the 100% zero manual re-key KPI target`,
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