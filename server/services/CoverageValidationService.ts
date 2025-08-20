/**
 * Coverage Validation Service - Automated 95% coverage measurement for payslip explanations
 */

import { db } from '../db';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { 
  payslipExplanations,
  explanationCitations,
  payrollLines,
  employees
} from '../../shared/schema';

export interface CoverageMetrics {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  totalPayslips: number;
  explainedPayslips: number;
  coveragePercentage: number;
  averageExplanationCoverage: number;
  qualityScore: number;
  unexplainedCodes: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  lastValidated: string;
}

export interface CoverageAlert {
  type: 'coverage_drop' | 'unexplained_codes' | 'quality_degradation';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  affectedPayslips: number;
  actionRequired: string;
  triggeredAt: string;
}

export class CoverageValidationService {
  private readonly TARGET_COVERAGE = 95.0;
  private readonly WARNING_THRESHOLD = 90.0;
  private readonly CRITICAL_THRESHOLD = 85.0;

  /**
   * Validate explanation coverage for an organization
   */
  async validateCoverage(
    organizationId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<CoverageMetrics> {
    const startDate = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const endDate = periodEnd || new Date();

    // Get all payslip explanations in period
    const explanations = await db.select({
      id: payslipExplanations.id,
      employeeId: payslipExplanations.employeeId,
      payrollRunId: payslipExplanations.payrollRunId,
      coveragePercentage: payslipExplanations.coveragePercentage,
      explanationJson: payslipExplanations.explanationJson,
      createdAt: payslipExplanations.createdAt,
    })
    .from(payslipExplanations)
    .where(and(
      eq(payslipExplanations.organizationId, organizationId),
      gte(payslipExplanations.createdAt, startDate),
      sql`${payslipExplanations.createdAt} <= ${endDate}`
    ))
    .orderBy(desc(payslipExplanations.createdAt));

    const totalPayslips = explanations.length;
    
    if (totalPayslips === 0) {
      return this.createEmptyMetrics(organizationId, startDate, endDate);
    }

    // Calculate coverage metrics
    const explainedPayslips = explanations.filter(exp => 
      parseFloat(exp.coveragePercentage) >= this.TARGET_COVERAGE
    ).length;

    const coveragePercentage = (explainedPayslips / totalPayslips) * 100;
    
    const averageExplanationCoverage = explanations.reduce((sum, exp) => 
      sum + parseFloat(exp.coveragePercentage), 0
    ) / totalPayslips;

    // Analyze unexplained codes
    const unexplainedCodes = await this.analyzeUnexplainedCodes(explanations);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(explanations, coveragePercentage);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(coveragePercentage, unexplainedCodes.length);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      coveragePercentage,
      unexplainedCodes,
      qualityScore
    );

    return {
      organizationId,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalPayslips,
      explainedPayslips,
      coveragePercentage: Math.round(coveragePercentage * 100) / 100,
      averageExplanationCoverage: Math.round(averageExplanationCoverage * 100) / 100,
      qualityScore: Math.round(qualityScore * 100) / 100,
      unexplainedCodes,
      riskLevel,
      recommendations,
      lastValidated: new Date().toISOString()
    };
  }

  /**
   * Monitor coverage in real-time and generate alerts
   */
  async monitorCoverage(organizationId: string): Promise<CoverageAlert[]> {
    const alerts: CoverageAlert[] = [];
    const metrics = await this.validateCoverage(organizationId);

    // Check coverage drop
    if (metrics.coveragePercentage < this.TARGET_COVERAGE) {
      const severity = metrics.coveragePercentage < this.CRITICAL_THRESHOLD ? 'critical' : 
                     metrics.coveragePercentage < this.WARNING_THRESHOLD ? 'error' : 'warning';
      
      alerts.push({
        type: 'coverage_drop',
        severity,
        message: `Explanation coverage dropped to ${metrics.coveragePercentage}% (target: ${this.TARGET_COVERAGE}%)`,
        affectedPayslips: metrics.totalPayslips - metrics.explainedPayslips,
        actionRequired: 'Review unexplained payroll codes and update explanation rules',
        triggeredAt: new Date().toISOString()
      });
    }

    // Check unexplained codes
    if (metrics.unexplainedCodes.length > 0) {
      alerts.push({
        type: 'unexplained_codes',
        severity: metrics.unexplainedCodes.length > 5 ? 'error' : 'warning',
        message: `${metrics.unexplainedCodes.length} payroll codes lack explanation rules: ${metrics.unexplainedCodes.slice(0, 3).join(', ')}${metrics.unexplainedCodes.length > 3 ? '...' : ''}`,
        affectedPayslips: metrics.totalPayslips,
        actionRequired: 'Create explanation rules for missing codes',
        triggeredAt: new Date().toISOString()
      });
    }

    // Check quality degradation
    if (metrics.qualityScore < 80) {
      alerts.push({
        type: 'quality_degradation',
        severity: metrics.qualityScore < 60 ? 'critical' : 'warning',
        message: `Explanation quality score below threshold: ${metrics.qualityScore}%`,
        affectedPayslips: metrics.totalPayslips,
        actionRequired: 'Review and improve explanation rule quality',
        triggeredAt: new Date().toISOString()
      });
    }

    return alerts;
  }

  /**
   * Generate automated coverage report
   */
  async generateCoverageReport(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<string> {
    const metrics = await this.validateCoverage(organizationId, periodStart, periodEnd);
    const alerts = await this.monitorCoverage(organizationId);

    const report = `
PAYSLIP EXPLANATION COVERAGE REPORT
====================================

Organization: ${organizationId}
Period: ${metrics.periodStart} to ${metrics.periodEnd}
Generated: ${new Date().toISOString()}

COVERAGE METRICS
----------------
Total Payslips Processed: ${metrics.totalPayslips}
Fully Explained Payslips: ${metrics.explainedPayslips}
Coverage Percentage: ${metrics.coveragePercentage}% (Target: ${this.TARGET_COVERAGE}%)
Average Explanation Coverage: ${metrics.averageExplanationCoverage}%
Quality Score: ${metrics.qualityScore}%
Risk Level: ${metrics.riskLevel.toUpperCase()}

STATUS: ${metrics.coveragePercentage >= this.TARGET_COVERAGE ? '✅ PASSING' : '❌ FAILING'}

UNEXPLAINED CODES
-----------------
${metrics.unexplainedCodes.length === 0 ? 'None' : metrics.unexplainedCodes.map(code => `• ${code}`).join('\n')}

RECOMMENDATIONS
---------------
${metrics.recommendations.map(rec => `• ${rec}`).join('\n')}

ACTIVE ALERTS
-------------
${alerts.length === 0 ? 'None' : alerts.map(alert => 
  `[${alert.severity.toUpperCase()}] ${alert.message}\n   Action: ${alert.actionRequired}`
).join('\n')}

COMPLIANCE STATUS
-----------------
95% Coverage Requirement: ${metrics.coveragePercentage >= this.TARGET_COVERAGE ? 'MET ✅' : 'NOT MET ❌'}
Quality Threshold (80%): ${metrics.qualityScore >= 80 ? 'MET ✅' : 'NOT MET ❌'}
Production Readiness: ${metrics.coveragePercentage >= this.TARGET_COVERAGE && metrics.qualityScore >= 80 ? 'READY ✅' : 'NOT READY ❌'}
`;

    return report.trim();
  }

  /**
   * Automated continuous monitoring setup
   */
  async setupContinuousMonitoring(organizationId: string): Promise<void> {
    // This would set up automated monitoring checks
    console.log(`[COVERAGE-MONITOR] Setting up continuous monitoring for org: ${organizationId}`);
    
    // In production, this would:
    // 1. Schedule periodic coverage validation (every hour)
    // 2. Set up alerting thresholds
    // 3. Create dashboard metrics
    // 4. Configure email/Slack notifications
    
    setInterval(async () => {
      try {
        const alerts = await this.monitorCoverage(organizationId);
        if (alerts.length > 0) {
          await this.sendCoverageAlerts(organizationId, alerts);
        }
      } catch (error) {
        console.error(`[COVERAGE-MONITOR] Error monitoring org ${organizationId}:`, error);
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Send coverage alerts to administrators
   */
  private async sendCoverageAlerts(organizationId: string, alerts: CoverageAlert[]): Promise<void> {
    for (const alert of alerts) {
      console.warn(`[COVERAGE-ALERT] ${organizationId}: ${alert.message}`);
      
      // In production, this would:
      // 1. Send email notifications
      // 2. Post to Slack channels
      // 3. Create tickets in issue tracking system
      // 4. Update monitoring dashboards
    }
  }

  /**
   * Analyze unexplained codes across payslips
   */
  private async analyzeUnexplainedCodes(explanations: any[]): Promise<string[]> {
    const unexplainedCodesSet = new Set<string>();

    for (const explanation of explanations) {
      try {
        const coverage = JSON.parse(explanation.explanationJson || '{}').coverage;
        if (coverage && coverage.unexplainedLines) {
          coverage.unexplainedLines.forEach((code: string) => unexplainedCodesSet.add(code));
        }
      } catch (error) {
        console.warn('Error parsing explanation JSON:', error);
      }
    }

    return Array.from(unexplainedCodesSet).sort();
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(explanations: any[], coveragePercentage: number): number {
    if (explanations.length === 0) return 0;

    // Base score from coverage
    let qualityScore = coveragePercentage;

    // Analyze confidence scores if available
    const confidenceScores = explanations
      .map(exp => {
        try {
          const parsed = JSON.parse(exp.explanationJson || '{}');
          return parsed.metadata?.confidenceScore || 0;
        } catch {
          return 0;
        }
      })
      .filter(score => score > 0);

    if (confidenceScores.length > 0) {
      const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
      qualityScore = (qualityScore + avgConfidence) / 2;
    }

    // Penalty for inconsistent coverage
    const coverageVariance = this.calculateCoverageVariance(explanations);
    if (coverageVariance > 10) {
      qualityScore -= 5; // Penalty for high variance
    }

    return Math.max(0, Math.min(100, qualityScore));
  }

  /**
   * Calculate variance in coverage across payslips
   */
  private calculateCoverageVariance(explanations: any[]): number {
    if (explanations.length < 2) return 0;

    const coverages = explanations.map(exp => parseFloat(exp.coveragePercentage));
    const mean = coverages.reduce((sum, cov) => sum + cov, 0) / coverages.length;
    const variance = coverages.reduce((sum, cov) => sum + Math.pow(cov - mean, 2), 0) / coverages.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Determine risk level based on metrics
   */
  private determineRiskLevel(coveragePercentage: number, unexplainedCodesCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (coveragePercentage < this.CRITICAL_THRESHOLD || unexplainedCodesCount > 10) {
      return 'critical';
    }
    if (coveragePercentage < this.WARNING_THRESHOLD || unexplainedCodesCount > 5) {
      return 'high';
    }
    if (coveragePercentage < this.TARGET_COVERAGE || unexplainedCodesCount > 2) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    coveragePercentage: number,
    unexplainedCodes: string[],
    qualityScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (coveragePercentage < this.TARGET_COVERAGE) {
      recommendations.push(`Improve coverage from ${coveragePercentage}% to ${this.TARGET_COVERAGE}% by adding explanation rules for missing codes`);
    }

    if (unexplainedCodes.length > 0) {
      recommendations.push(`Create explanation rules for ${unexplainedCodes.length} unexplained codes: ${unexplainedCodes.slice(0, 3).join(', ')}${unexplainedCodes.length > 3 ? '...' : ''}`);
    }

    if (qualityScore < 80) {
      recommendations.push('Improve explanation rule quality by enhancing formula templates and descriptions');
    }

    if (recommendations.length === 0) {
      recommendations.push('Coverage is meeting targets. Continue monitoring for consistency.');
    }

    return recommendations;
  }

  /**
   * Create empty metrics for organizations with no data
   */
  private createEmptyMetrics(organizationId: string, startDate: Date, endDate: Date): CoverageMetrics {
    return {
      organizationId,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalPayslips: 0,
      explainedPayslips: 0,
      coveragePercentage: 0,
      averageExplanationCoverage: 0,
      qualityScore: 0,
      unexplainedCodes: [],
      riskLevel: 'critical',
      recommendations: ['No payslip explanations found. Generate explanations for payslips to establish baseline coverage.'],
      lastValidated: new Date().toISOString()
    };
  }

  /**
   * Get coverage trends over time
   */
  async getCoverageTrends(
    organizationId: string,
    days: number = 30
  ): Promise<Array<{ date: string; coverage: number; quality: number }>> {
    const trends: Array<{ date: string; coverage: number; quality: number }> = [];
    const endDate = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const metrics = await this.validateCoverage(organizationId, date, nextDate);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        coverage: metrics.coveragePercentage,
        quality: metrics.qualityScore
      });
    }
    
    return trends;
  }
}

export const coverageValidationService = new CoverageValidationService();