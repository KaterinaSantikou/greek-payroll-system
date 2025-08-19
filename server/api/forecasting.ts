import type { Express } from "express";
import { z } from "zod";
import { forecastingService } from "../analytics/forecastingService";
import { isAuthenticated } from "../replitAuth";
import { auditLog } from "../security/auditService";

const staffingForecastSchema = z.object({
  propertyId: z.string(),
  forecastDays: z.number().min(7).max(90).default(30)
});

const overtimeForecastSchema = z.object({
  propertyId: z.string(),
  forecastWeeks: z.number().min(1).max(12).default(4)
});

const correlationInsightsSchema = z.object({
  propertyId: z.string()
});

export function registerForecastingRoutes(app: Express): void {

  // Staffing Cost vs Occupancy Forecast
  app.post('/api/forecasting/staffing', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      const validation = staffingForecastSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: validation.error.errors
        });
      }

      const { propertyId, forecastDays } = validation.data;

      await auditLog({
        userId,
        action: 'staffing_forecast_generated',
        resourceType: 'analytics',
        resourceId: propertyId,
        details: { forecastDays },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      const forecast = await forecastingService.generateStaffingForecast(propertyId, forecastDays);

      res.json({
        success: true,
        data: {
          ...forecast,
          metadata: {
            generatedAt: new Date().toISOString(),
            generatedBy: userId,
            propertyId,
            forecastDays,
            dataPoints: forecast.historical.length,
            forecastConfidence: forecast.forecast.reduce((sum, f) => sum + f.confidence, 0) / forecast.forecast.length
          }
        }
      });

    } catch (error) {
      console.error('Staffing forecast error:', error);
      res.status(500).json({
        error: 'Failed to generate staffing forecast',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Overtime Prediction by Outlet
  app.post('/api/forecasting/overtime', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      const validation = overtimeForecastSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: validation.error.errors
        });
      }

      const { propertyId, forecastWeeks } = validation.data;

      await auditLog({
        userId,
        action: 'overtime_forecast_generated',
        resourceType: 'analytics',
        resourceId: propertyId,
        details: { forecastWeeks },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      const forecast = await forecastingService.generateOvertimeForecast(propertyId, forecastWeeks);

      // Calculate risk summary
      const riskSummary = {
        totalOutlets: forecast.outletForecasts.length,
        highRiskOutlets: forecast.outletForecasts.filter(o => o.riskLevel === 'high' || o.riskLevel === 'critical').length,
        totalPredictedCost: forecast.weeklyTrends.reduce((sum, week) => sum + week.costImpact, 0),
        avgWeeklyCost: forecast.weeklyTrends.length > 0 ? 
          forecast.weeklyTrends.reduce((sum, week) => sum + week.costImpact, 0) / forecast.weeklyTrends.length : 0
      };

      res.json({
        success: true,
        data: {
          ...forecast,
          riskSummary,
          metadata: {
            generatedAt: new Date().toISOString(),
            generatedBy: userId,
            propertyId,
            forecastWeeks,
            analysisScope: `${forecastWeeks} weeks ahead`,
            currentWeekTotal: forecast.currentWeekSummary.totalOvertimeHours
          }
        }
      });

    } catch (error) {
      console.error('Overtime forecast error:', error);
      res.status(500).json({
        error: 'Failed to generate overtime forecast',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Occupancy Correlation Insights
  app.post('/api/forecasting/correlation-insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      const validation = correlationInsightsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: validation.error.errors
        });
      }

      const { propertyId } = validation.data;

      await auditLog({
        userId,
        action: 'correlation_insights_generated',
        resourceType: 'analytics',
        resourceId: propertyId,
        details: { analysisType: 'occupancy_correlation' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      const insights = await forecastingService.getOccupancyCorrelationInsights(propertyId);

      // Calculate optimization potential
      const optimizationPotential = {
        efficiencyGain: Math.max(0, 1.0 - insights.staffingEfficiency.currentEfficiency) * 100,
        costSavingsEstimate: insights.staffingEfficiency.currentEfficiency < 0.8 ? 
          Math.round((0.8 - insights.staffingEfficiency.currentEfficiency) * 50000) : 0, // €50k baseline
        implementationPriority: insights.staffingEfficiency.currentEfficiency < 0.7 ? 'high' : 
                               insights.staffingEfficiency.currentEfficiency < 0.85 ? 'medium' : 'low'
      };

      res.json({
        success: true,
        data: {
          ...insights,
          optimizationPotential,
          metadata: {
            generatedAt: new Date().toISOString(),
            generatedBy: userId,
            propertyId,
            analysisDepth: '6 months historical data',
            keyCorrelations: {
              occupancyStaffingStrength: insights.staffingEfficiency.currentEfficiency > 0.8 ? 'strong' : 'moderate'
            }
          }
        }
      });

    } catch (error) {
      console.error('Correlation insights error:', error);
      res.status(500).json({
        error: 'Failed to generate correlation insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Combined Forecasting Dashboard Data
  app.get('/api/forecasting/dashboard/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { propertyId } = req.params;

      await auditLog({
        userId,
        action: 'forecasting_dashboard_accessed',
        resourceType: 'analytics',
        resourceId: propertyId,
        details: { dashboardType: 'combined_forecasting' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Fetch all forecasting data in parallel
      const [staffingForecast, overtimeForecast, correlationInsights] = await Promise.all([
        forecastingService.generateStaffingForecast(propertyId, 14), // 2 weeks
        forecastingService.generateOvertimeForecast(propertyId, 2),  // 2 weeks
        forecastingService.getOccupancyCorrelationInsights(propertyId)
      ]);

      // Calculate key performance indicators
      const kpis = {
        nextWeekStaffingCost: staffingForecast.forecast.slice(0, 7).reduce((sum, f) => sum + f.recommendedStaffingCost, 0),
        nextWeekOvertimeRisk: overtimeForecast.outletForecasts.filter(o => o.riskLevel === 'high' || o.riskLevel === 'critical').length,
        occupancyTrendDirection: staffingForecast.metrics.trends.occupancyTrend,
        efficiencyScore: Math.round(correlationInsights.staffingEfficiency.currentEfficiency * 100),
        predictedRevenue: staffingForecast.forecast.slice(0, 7).reduce((sum, f) => sum + f.predictedRevenue, 0)
      };

      // Generate alerts
      const alerts = [];
      
      if (kpis.nextWeekOvertimeRisk > 2) {
        alerts.push({
          type: 'warning',
          title: 'High Overtime Risk',
          message: `${kpis.nextWeekOvertimeRisk} outlets at high/critical overtime risk next week`,
          priority: 'high'
        });
      }

      if (kpis.efficiencyScore < 75) {
        alerts.push({
          type: 'info',
          title: 'Efficiency Opportunity',
          message: `Current staffing efficiency at ${kpis.efficiencyScore}% - optimization potential identified`,
          priority: 'medium'
        });
      }

      if (staffingForecast.metrics.trends.overtimeTrend === 'increasing') {
        alerts.push({
          type: 'warning',
          title: 'Rising Overtime Trend',
          message: 'Overtime hours showing increasing trend - consider staffing adjustments',
          priority: 'high'
        });
      }

      // Quick wins recommendations
      const quickWins = [
        ...correlationInsights.recommendations.staffingAdjustments.slice(0, 2),
        ...correlationInsights.recommendations.processImprovements.slice(0, 1)
      ].map(rec => ({ 
        action: rec, 
        estimatedImpact: 'Medium',
        timeToImplement: '1-2 weeks'
      }));

      res.json({
        success: true,
        data: {
          kpis,
          alerts,
          quickWins,
          staffingForecast: {
            nextWeekCost: kpis.nextWeekStaffingCost,
            trend: staffingForecast.metrics.trends.occupancyTrend,
            confidence: staffingForecast.forecast.slice(0, 7).reduce((sum, f) => sum + f.confidence, 0) / 7
          },
          overtimeForecast: {
            currentWeekTotal: overtimeForecast.currentWeekSummary.totalOvertimeHours,
            nextWeekPredicted: overtimeForecast.weeklyTrends[0]?.totalPredicted || 0,
            riskOutlets: overtimeForecast.outletForecasts.filter(o => o.riskLevel !== 'low').length
          },
          correlationInsights: {
            efficiency: correlationInsights.staffingEfficiency.currentEfficiency,
            optimalRange: correlationInsights.staffingEfficiency.optimalOccupancyRange,
            costPerGuest: correlationInsights.staffingEfficiency.costPerGuestAtOptimal
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            generatedBy: userId,
            propertyId,
            lastUpdated: new Date().toISOString(),
            dataFreshness: 'real-time'
          }
        }
      });

    } catch (error) {
      console.error('Forecasting dashboard error:', error);
      res.status(500).json({
        error: 'Failed to load forecasting dashboard',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Historical Performance Analysis
  app.get('/api/forecasting/historical/:propertyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { propertyId } = req.params;
      const { months = '3' } = req.query;

      await auditLog({
        userId,
        action: 'historical_performance_accessed',
        resourceType: 'analytics',
        resourceId: propertyId,
        details: { months: parseInt(months as string) },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      const monthsNum = parseInt(months as string);
      const forecast = await forecastingService.generateStaffingForecast(propertyId, 1); // Just to get historical data

      // Analyze historical performance
      const performance = {
        occupancyPatterns: forecast.metrics.seasonalPatterns.slice(0, monthsNum),
        staffingEfficiencyTrend: forecast.metrics.trends.staffingEfficiency,
        correlationStrength: forecast.metrics.correlation.occupancyToStaffing,
        overtimePatterns: forecast.metrics.trends.overtimeTrend,
        bestPerformingPeriods: forecast.historical
          .sort((a, b) => (b.occupancy / (b.staffingCost / 1000)) - (a.occupancy / (a.staffingCost / 1000)))
          .slice(0, 5),
        improvementOpportunities: []
      };

      // Identify improvement opportunities
      if (forecast.metrics.correlation.occupancyToStaffing < 0.6) {
        performance.improvementOpportunities.push({
          area: 'Scheduling Alignment',
          impact: 'High',
          description: 'Weak correlation between occupancy and staffing suggests scheduling optimization opportunity'
        });
      }

      if (forecast.metrics.trends.overtimeTrend === 'increasing') {
        performance.improvementOpportunities.push({
          area: 'Overtime Management',
          impact: 'High', 
          description: 'Rising overtime trend indicates need for proactive workforce planning'
        });
      }

      res.json({
        success: true,
        data: {
          performance,
          insights: {
            strongestCorrelation: 'occupancy_to_staffing',
            correlationScore: forecast.metrics.correlation.occupancyToStaffing,
            seasonalVariability: Math.max(...forecast.metrics.seasonalPatterns.map(s => s.avgOccupancy)) - 
                                Math.min(...forecast.metrics.seasonalPatterns.map(s => s.avgOccupancy)),
            efficiencyBenchmark: performance.bestPerformingPeriods[0]?.occupancy / (performance.bestPerformingPeriods[0]?.staffingCost / 1000) || 0
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            generatedBy: userId,
            propertyId,
            analysisDepth: `${monthsNum} months`,
            dataPoints: forecast.historical.length
          }
        }
      });

    } catch (error) {
      console.error('Historical performance analysis error:', error);
      res.status(500).json({
        error: 'Failed to analyze historical performance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}