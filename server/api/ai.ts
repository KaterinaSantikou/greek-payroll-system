import type { Express } from 'express';
import { z } from 'zod';
import {
  complianceCopilot,
  type ComplianceAnomaly,
} from '../ai/complianceCopilot';
import { isAuthenticated } from '../replitAuth';
import { auditLog } from '../security/auditService';

const analyzeComplianceSchema = z.object({
  propertyIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  types: z
    .array(
      z.enum([
        'under_min_wage',
        'excessive_overtime',
        'missing_rest',
        'ergani_delay',
        'insurance_gap',
        'working_time_violation',
      ])
    )
    .optional(),
});

const autoFixSchema = z.object({
  anomalyId: z.string(),
  approverComments: z.string().optional(),
});

const complianceReportSchema = z.object({
  propertyId: z.string().optional(),
  includeRecommendations: z.boolean().default(true),
  includeActionPlan: z.boolean().default(true),
  format: z.enum(['json', 'pdf']).default('json'),
});

export function registerAIRoutes(app: Express): void {
  // Analyze compliance across properties
  app.post(
    '/api/ai/compliance/analyze',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;
        await auditLog({
          userId,
          action: 'ai_compliance_analysis',
          resourceType: 'compliance',
          resourceId: 'system',
          details: { filters: req.body },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        const validation = analyzeComplianceSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request parameters',
            details: validation.error.errors,
          });
        }

        const { propertyIds, startDate, endDate, severity, types } =
          validation.data;

        // Convert date strings to Date objects
        const startDateObj = startDate ? new Date(startDate) : undefined;
        const endDateObj = endDate ? new Date(endDate) : undefined;

        // Run compliance analysis
        const anomalies = await complianceCopilot.analyzeCompliance(
          propertyIds,
          startDateObj,
          endDateObj
        );

        // Apply client-side filters
        let filteredAnomalies = anomalies;

        if (severity) {
          filteredAnomalies = filteredAnomalies.filter(
            a => a.severity === severity
          );
        }

        if (types && types.length > 0) {
          filteredAnomalies = filteredAnomalies.filter(a =>
            types.includes(a.type)
          );
        }

        res.json({
          success: true,
          data: {
            anomalies: filteredAnomalies,
            summary: {
              total: filteredAnomalies.length,
              bySeverity: filteredAnomalies.reduce(
                (acc, a) => {
                  acc[a.severity] = (acc[a.severity] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              ),
              byType: filteredAnomalies.reduce(
                (acc, a) => {
                  acc[a.type] = (acc[a.type] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              ),
              autoFixable: filteredAnomalies.filter(a => a.autoFixable).length,
              totalFinancialRisk: filteredAnomalies.reduce(
                (sum, a) => sum + (a.financialImpact || 0),
                0
              ),
            },
          },
        });
      } catch (error) {
        console.error('Compliance analysis error:', error);
        res.status(500).json({
          error: 'Failed to analyze compliance',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get compliance insights and trends
  app.get(
    '/api/ai/compliance/insights',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;
        const { propertyId, days = '30' } = req.query;

        await auditLog({
          userId,
          action: 'ai_compliance_insights',
          resourceType: 'compliance',
          resourceId: propertyId || 'system',
          details: { period: `${days} days` },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        const daysNum = parseInt(days as string);
        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - daysNum * 24 * 60 * 60 * 1000
        );

        const propertyIds = propertyId ? [propertyId as string] : undefined;
        const anomalies = await complianceCopilot.analyzeCompliance(
          propertyIds,
          startDate,
          endDate
        );

        // Generate trend analysis
        const weeklyTrends = [];
        for (let week = 0; week < Math.ceil(daysNum / 7); week++) {
          const weekStart = new Date(
            startDate.getTime() + week * 7 * 24 * 60 * 60 * 1000
          );
          const weekEnd = new Date(
            Math.min(
              weekStart.getTime() + 7 * 24 * 60 * 60 * 1000,
              endDate.getTime()
            )
          );

          const weekAnomalies = anomalies.filter(
            a => a.detectedAt >= weekStart && a.detectedAt < weekEnd
          );

          weeklyTrends.push({
            week: week + 1,
            startDate: weekStart.toISOString(),
            endDate: weekEnd.toISOString(),
            totalAnomalies: weekAnomalies.length,
            criticalCount: weekAnomalies.filter(a => a.severity === 'critical')
              .length,
            mostCommonType: getMostCommonType(weekAnomalies),
            financialImpact: weekAnomalies.reduce(
              (sum, a) => sum + (a.financialImpact || 0),
              0
            ),
          });
        }

        // Top risk areas
        const riskAreas = Object.entries(
          anomalies.reduce(
            (acc, a) => {
              acc[a.type] = (acc[a.type] || 0) + (a.financialImpact || 0);
              return acc;
            },
            {} as Record<string, number>
          )
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([type, impact]) => ({
            type,
            financialImpact: impact,
            count: anomalies.filter(a => a.type === type).length,
          }));

        res.json({
          success: true,
          data: {
            period: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              days: daysNum,
            },
            overview: {
              totalAnomalies: anomalies.length,
              autoFixablePercentage:
                Math.round(
                  (anomalies.filter(a => a.autoFixable).length /
                    anomalies.length) *
                    100
                ) || 0,
              totalFinancialRisk: anomalies.reduce(
                (sum, a) => sum + (a.financialImpact || 0),
                0
              ),
              averageConfidence:
                Math.round(
                  anomalies.reduce((sum, a) => sum + a.confidence, 0) /
                    anomalies.length
                ) || 0,
            },
            trends: {
              weekly: weeklyTrends,
              improvement: calculateImprovement(weeklyTrends),
            },
            riskAreas,
            recommendations: await generateSmartRecommendations(
              anomalies,
              propertyIds
            ),
          },
        });
      } catch (error) {
        console.error('Compliance insights error:', error);
        res.status(500).json({
          error: 'Failed to generate compliance insights',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Auto-fix compliance anomaly
  app.post(
    '/api/ai/compliance/auto-fix',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;

        const validation = autoFixSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request parameters',
            details: validation.error.errors,
          });
        }

        const { anomalyId, approverComments } = validation.data;

        await auditLog({
          userId,
          action: 'ai_auto_fix_attempt',
          resourceType: 'compliance',
          resourceId: anomalyId,
          details: { approverComments },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        // Execute auto-fix
        const result = await complianceCopilot.autoFixAnomaly(
          anomalyId,
          userId
        );

        await auditLog({
          userId,
          action: result.success
            ? 'ai_auto_fix_success'
            : 'ai_auto_fix_failure',
          resourceType: 'compliance',
          resourceId: anomalyId,
          details: {
            actionsPerformed: result.actionsPerformed,
            message: result.message,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.json({
          success: result.success,
          data: {
            anomalyId,
            message: result.message,
            actionsPerformed: result.actionsPerformed,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Auto-fix error:', error);
        res.status(500).json({
          error: 'Failed to auto-fix anomaly',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Generate comprehensive compliance report
  app.post(
    '/api/ai/compliance/report',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user?.claims?.sub;

        const validation = complianceReportSchema.safeParse(req.body);
        if (!validation.success) {
          return res.status(400).json({
            error: 'Invalid request parameters',
            details: validation.error.errors,
          });
        }

        const {
          propertyId,
          includeRecommendations,
          includeActionPlan,
          format,
        } = validation.data;

        await auditLog({
          userId,
          action: 'ai_compliance_report_generation',
          resourceType: 'compliance',
          resourceId: propertyId || 'system',
          details: { format, includeRecommendations, includeActionPlan },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        });

        // Get recent anomalies (last 30 days)
        const endDate = new Date();
        const startDate = new Date(
          endDate.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        const propertyIds = propertyId ? [propertyId] : undefined;

        const anomalies = await complianceCopilot.analyzeCompliance(
          propertyIds,
          startDate,
          endDate
        );

        const report = await complianceCopilot.generateComplianceReport(
          anomalies,
          propertyId
        );

        if (format === 'pdf') {
          // TODO: Implement PDF generation
          return res.status(501).json({
            error: 'PDF format not yet implemented',
            message: 'Please use JSON format for now',
          });
        }

        res.json({
          success: true,
          data: {
            report,
            metadata: {
              generatedAt: new Date().toISOString(),
              generatedBy: userId,
              period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
              },
              scope: propertyId ? 'single_property' : 'all_properties',
            },
          },
        });
      } catch (error) {
        console.error('Compliance report error:', error);
        res.status(500).json({
          error: 'Failed to generate compliance report',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get AI configuration and capabilities
  app.get(
    '/api/ai/compliance/config',
    isAuthenticated,
    async (req: any, res) => {
      try {
        res.json({
          success: true,
          data: {
            version: '1.0.0',
            capabilities: {
              anomalyDetection: {
                types: [
                  'under_min_wage',
                  'excessive_overtime',
                  'missing_rest',
                  'ergani_delay',
                  'insurance_gap',
                  'working_time_violation',
                ],
                severityLevels: ['low', 'medium', 'high', 'critical'],
                autoFixSupport: true,
              },
              insights: {
                trendAnalysis: true,
                riskAssessment: true,
                recommendations: true,
                financialImpactCalculation: true,
              },
              compliance: {
                greekLabourLaw: true,
                euWorkingTimeDirective: true,
                erganiII: true,
                efkaAPD: true,
                aadeFormY: true,
              },
            },
            limits: {
              maxAnalysisPeriodDays: 365,
              maxPropertiesPerAnalysis: 50,
              maxAutoFixesPerDay: 100,
            },
            thresholds: {
              minimumWage2025: 880,
              maxWeeklyHours: 48,
              maxDailyHours: 10,
              minRestHours: 11,
              maxConsecutiveDays: 6,
            },
          },
        });
      } catch (error) {
        console.error('AI config error:', error);
        res.status(500).json({
          error: 'Failed to get AI configuration',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}

// Helper functions
function getMostCommonType(anomalies: ComplianceAnomaly[]): string | null {
  if (anomalies.length === 0) return null;

  const typeCounts = anomalies.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0][0];
}

function calculateImprovement(weeklyTrends: any[]): {
  direction: 'improving' | 'worsening' | 'stable';
  percentage: number;
} {
  if (weeklyTrends.length < 2) {
    return { direction: 'stable', percentage: 0 };
  }

  const firstWeek = weeklyTrends[0].totalAnomalies;
  const lastWeek = weeklyTrends[weeklyTrends.length - 1].totalAnomalies;

  if (firstWeek === 0 && lastWeek === 0) {
    return { direction: 'stable', percentage: 0 };
  }

  if (firstWeek === 0) {
    return { direction: 'worsening', percentage: 100 };
  }

  const percentage = Math.round(((firstWeek - lastWeek) / firstWeek) * 100);

  if (percentage > 10) {
    return { direction: 'improving', percentage };
  } else if (percentage < -10) {
    return { direction: 'worsening', percentage: Math.abs(percentage) };
  } else {
    return { direction: 'stable', percentage: Math.abs(percentage) };
  }
}

async function generateSmartRecommendations(
  anomalies: ComplianceAnomaly[],
  propertyIds?: string[]
): Promise<string[]> {
  const recommendations: string[] = [];

  // Analyze patterns and generate contextual recommendations
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const autoFixableCount = anomalies.filter(a => a.autoFixable).length;
  const wageViolations = anomalies.filter(
    a => a.type === 'under_min_wage'
  ).length;
  const overtimeIssues = anomalies.filter(
    a => a.type === 'excessive_overtime'
  ).length;
  const erganiDelays = anomalies.filter(a => a.type === 'ergani_delay').length;

  if (criticalCount > 0) {
    recommendations.push(
      `🚨 ${criticalCount} critical compliance issues require immediate attention to avoid penalties`
    );
  }

  if (autoFixableCount > 5) {
    recommendations.push(
      `⚡ ${autoFixableCount} issues can be automatically resolved - consider enabling auto-fix`
    );
  }

  if (wageViolations > 0) {
    recommendations.push(
      `💰 Wage calculation system needs review - ${wageViolations} minimum wage violations detected`
    );
  }

  if (overtimeIssues > 3) {
    recommendations.push(
      `⏰ High overtime violations suggest need for better workforce planning and scheduling`
    );
  }

  if (erganiDelays > 0) {
    recommendations.push(
      `📋 ${erganiDelays} ERGANI delays detected - implement automated submission workflows`
    );
  }

  // Add property-specific recommendations if analyzing specific properties
  if (propertyIds && propertyIds.length === 1) {
    recommendations.push(
      `🏨 Property-specific analysis complete - consider comparing with other properties for benchmarking`
    );
  }

  return recommendations.slice(0, 6); // Limit to top 6 recommendations
}
