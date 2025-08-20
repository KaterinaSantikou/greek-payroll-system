/**
 * Performance Budget Enforcement Service
 * Tracks and enforces performance budgets with gap monitoring
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import {
  performanceBudgets,
  performanceMetrics,
  budgetViolations,
  type PerformanceBudget,
  type PerformanceMetric,
  type BudgetViolation
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface BudgetEnforcementGap {
  budgetId: string;
  name: string;
  category: string;
  currentTarget: number;
  requirement: number;
  unit: string;
  gapMultiplier: number;
  status: 'critical_gap' | 'needs_enforcement' | 'compliant';
  description: string;
  lastMeasured?: Date;
  trend: 'improving' | 'degrading' | 'stable' | 'unknown';
}

export interface LoadTestingRequirement {
  name: string;
  peakLoadMultiplier: number;
  currentImplementation: 'none' | 'partial' | 'complete';
  requiredScenarios: string[];
  missingComponents: string[];
}

export class PerformanceBudgetService extends EventEmitter {
  private static instance: PerformanceBudgetService;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
  }

  public static getInstance(): PerformanceBudgetService {
    if (!PerformanceBudgetService.instance) {
      PerformanceBudgetService.instance = new PerformanceBudgetService();
    }
    return PerformanceBudgetService.instance;
  }

  /**
   * Initialize budget enforcement with known gaps
   */
  public async initializeBudgetEnforcement(): Promise<void> {
    console.log('🎯 Initializing performance budget enforcement');

    // Create budget entries for known gaps
    await this.createBudgetEntries();
    
    // Start monitoring
    this.startBudgetMonitoring();
  }

  /**
   * Create initial budget entries for known enforcement gaps
   */
  private async createBudgetEntries(): Promise<void> {
    const budgets = [
      {
        id: 'explain_your_pay_budget',
        name: 'Explain-Your-Pay Response Time',
        category: 'user_experience',
        targetValue: 500, // requirement in ms
        currentValue: 20000, // current target in ms
        unit: 'milliseconds',
        threshold: 'under',
        description: 'Maximum response time for pay explanation feature',
        isActive: true,
        severity: 'critical'
      },
      {
        id: 'payments_cockpit_budget',
        name: 'Payments Cockpit Initial Load',
        category: 'dashboard_performance',
        targetValue: 1000, // requirement in ms
        currentValue: null, // no current enforcement
        unit: 'milliseconds',
        threshold: 'under',
        description: 'Initial data loading time for payments dashboard',
        isActive: true,
        severity: 'high'
      },
      {
        id: 'apd_build_budget',
        name: 'APD Build Time',
        category: 'build_performance',
        targetValue: 1500, // requirement in ms
        currentValue: null, // no current validation
        unit: 'milliseconds',
        threshold: 'under',
        description: 'SME build time validation for APD system',
        isActive: true,
        severity: 'medium'
      },
      {
        id: 'peak_load_testing_budget',
        name: '5x Peak Load Testing',
        category: 'load_testing',
        targetValue: 5, // 5x multiplier
        currentValue: 0, // no implementation
        unit: 'multiplier',
        threshold: 'over',
        description: 'Formal load testing at 5x peak capacity',
        isActive: true,
        severity: 'high'
      }
    ];

    for (const budget of budgets) {
      try {
        await db.insert(performanceBudgets).values({
          id: budget.id,
          name: budget.name,
          category: budget.category,
          targetValue: budget.targetValue,
          currentValue: budget.currentValue,
          unit: budget.unit,
          threshold: budget.threshold,
          description: budget.description,
          isActive: budget.isActive,
          severity: budget.severity,
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();

        console.log(`📊 Created budget entry: ${budget.name}`);
      } catch (error) {
        console.error(`Failed to create budget entry ${budget.id}:`, error);
      }
    }
  }

  /**
   * Get all budget enforcement gaps
   */
  public async getBudgetEnforcementGaps(): Promise<BudgetEnforcementGap[]> {
    const budgets = await db.select()
      .from(performanceBudgets)
      .where(eq(performanceBudgets.isActive, true))
      .orderBy(desc(performanceBudgets.createdAt));

    const gaps: BudgetEnforcementGap[] = [];

    for (const budget of budgets) {
      let gapMultiplier = 1;
      let status: 'critical_gap' | 'needs_enforcement' | 'compliant' = 'compliant';

      if (budget.currentValue !== null && budget.targetValue !== null) {
        if (budget.threshold === 'under') {
          gapMultiplier = budget.currentValue / budget.targetValue;
          status = gapMultiplier > 10 ? 'critical_gap' : 
                  gapMultiplier > 2 ? 'needs_enforcement' : 'compliant';
        } else {
          gapMultiplier = budget.targetValue / Math.max(budget.currentValue, 1);
          status = gapMultiplier > 5 ? 'critical_gap' : 
                  gapMultiplier > 1 ? 'needs_enforcement' : 'compliant';
        }
      } else {
        status = 'needs_enforcement';
        gapMultiplier = budget.currentValue === null ? Infinity : 1;
      }

      gaps.push({
        budgetId: budget.id,
        name: budget.name,
        category: budget.category,
        currentTarget: budget.currentValue || 0,
        requirement: budget.targetValue || 0,
        unit: budget.unit,
        gapMultiplier,
        status,
        description: budget.description || '',
        lastMeasured: budget.lastMeasured || undefined,
        trend: await this.calculateTrend(budget.id)
      });
    }

    return gaps;
  }

  /**
   * Get specific gap details
   */
  public async getExplainYourPayGap(): Promise<BudgetEnforcementGap> {
    return {
      budgetId: 'explain_your_pay_budget',
      name: 'Explain-Your-Pay Budget',
      category: 'user_experience',
      currentTarget: 20000, // 20 seconds
      requirement: 500, // 500ms
      unit: 'milliseconds',
      gapMultiplier: 40, // 40x gap
      status: 'critical_gap',
      description: 'Current target 20 seconds, requirement is ≤500ms (40x gap)',
      trend: 'unknown'
    };
  }

  public async getPaymentsCockpitGap(): Promise<BudgetEnforcementGap> {
    return {
      budgetId: 'payments_cockpit_budget',
      name: 'Payments Cockpit Budget',
      category: 'dashboard_performance',
      currentTarget: 0, // no enforcement
      requirement: 1000, // 1s
      unit: 'milliseconds',
      gapMultiplier: Infinity,
      status: 'needs_enforcement',
      description: 'No specific 1s initial data loading enforcement',
      trend: 'unknown'
    };
  }

  public async getAPDBuildGap(): Promise<BudgetEnforcementGap> {
    return {
      budgetId: 'apd_build_budget',
      name: 'APD Build Budget',
      category: 'build_performance',
      currentTarget: 0, // no validation
      requirement: 1500, // 1.5s
      unit: 'milliseconds',
      gapMultiplier: Infinity,
      status: 'needs_enforcement',
      description: 'No formal ≤1.5s SME build time validation',
      trend: 'unknown'
    };
  }

  public async getPeakLoadTestingGap(): Promise<LoadTestingRequirement> {
    return {
      name: '5x Peak Load Testing',
      peakLoadMultiplier: 5,
      currentImplementation: 'none',
      requiredScenarios: [
        'user_authentication_at_5x_peak',
        'payroll_calculation_at_5x_peak',
        'report_generation_at_5x_peak',
        'data_import_at_5x_peak',
        'concurrent_user_sessions_at_5x_peak'
      ],
      missingComponents: [
        'load_testing_infrastructure',
        'performance_monitoring_at_scale',
        'automated_scaling_validation',
        'database_performance_under_load',
        'api_rate_limiting_validation'
      ]
    };
  }

  /**
   * Record performance metric
   */
  public async recordPerformanceMetric(data: {
    budgetId: string;
    measuredValue: number;
    timestamp?: Date;
    context?: any;
  }): Promise<void> {
    try {
      await db.insert(performanceMetrics).values({
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        budgetId: data.budgetId,
        measuredValue: data.measuredValue,
        timestamp: data.timestamp || new Date(),
        context: data.context,
        createdAt: new Date()
      });

      // Update budget with latest measurement
      await db.update(performanceBudgets)
        .set({
          currentValue: data.measuredValue,
          lastMeasured: data.timestamp || new Date(),
          updatedAt: new Date()
        })
        .where(eq(performanceBudgets.id, data.budgetId));

      // Check for budget violations
      await this.checkBudgetViolation(data.budgetId, data.measuredValue);

      console.log(`📊 Recorded performance metric for ${data.budgetId}: ${data.measuredValue}`);

    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }

  /**
   * Check for budget violations
   */
  private async checkBudgetViolation(budgetId: string, measuredValue: number): Promise<void> {
    const [budget] = await db.select()
      .from(performanceBudgets)
      .where(eq(performanceBudgets.id, budgetId))
      .limit(1);

    if (!budget || !budget.targetValue) return;

    let isViolation = false;
    if (budget.threshold === 'under') {
      isViolation = measuredValue > budget.targetValue;
    } else {
      isViolation = measuredValue < budget.targetValue;
    }

    if (isViolation) {
      await db.insert(budgetViolations).values({
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        budgetId,
        measuredValue,
        targetValue: budget.targetValue,
        violationAmount: Math.abs(measuredValue - budget.targetValue),
        severity: budget.severity || 'medium',
        isResolved: false,
        detectedAt: new Date(),
        createdAt: new Date()
      });

      console.log(`⚠️  Budget violation detected for ${budget.name}`);
      this.emit('budget_violation', { budget, measuredValue });
    }
  }

  /**
   * Calculate performance trend
   */
  private async calculateTrend(budgetId: string): Promise<'improving' | 'degrading' | 'stable' | 'unknown'> {
    try {
      const metrics = await db.select()
        .from(performanceMetrics)
        .where(eq(performanceMetrics.budgetId, budgetId))
        .orderBy(desc(performanceMetrics.timestamp))
        .limit(10);

      if (metrics.length < 3) return 'unknown';

      const recent = metrics.slice(0, 3).map(m => m.measuredValue);
      const older = metrics.slice(-3).map(m => m.measuredValue);

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

      const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (Math.abs(changePercent) < 5) return 'stable';
      return changePercent < 0 ? 'improving' : 'degrading';

    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Start budget monitoring
   */
  private startBudgetMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.checkAllBudgets();
    }, 60000); // Check every minute

    console.log('📊 Started performance budget monitoring');
  }

  /**
   * Check all budgets for violations
   */
  private async checkAllBudgets(): Promise<void> {
    const gaps = await this.getBudgetEnforcementGaps();
    
    for (const gap of gaps) {
      if (gap.status === 'critical_gap') {
        this.emit('critical_budget_gap', gap);
      }
    }
  }

  /**
   * Get budget statistics
   */
  public async getBudgetStatistics(): Promise<{
    totalBudgets: number;
    criticalGaps: number;
    needsEnforcement: number;
    compliant: number;
    averageGapMultiplier: number;
    worstGap: BudgetEnforcementGap | null;
  }> {
    const gaps = await this.getBudgetEnforcementGaps();
    
    const criticalGaps = gaps.filter(g => g.status === 'critical_gap').length;
    const needsEnforcement = gaps.filter(g => g.status === 'needs_enforcement').length;
    const compliant = gaps.filter(g => g.status === 'compliant').length;
    
    const finiteGaps = gaps.filter(g => isFinite(g.gapMultiplier));
    const averageGapMultiplier = finiteGaps.length > 0 
      ? finiteGaps.reduce((sum, gap) => sum + gap.gapMultiplier, 0) / finiteGaps.length
      : 0;

    const worstGap = gaps.length > 0 
      ? gaps.reduce((worst, current) => 
          current.gapMultiplier > worst.gapMultiplier ? current : worst
        )
      : null;

    return {
      totalBudgets: gaps.length,
      criticalGaps,
      needsEnforcement,
      compliant,
      averageGapMultiplier,
      worstGap
    };
  }

  /**
   * Create enforcement plan
   */
  public async createEnforcementPlan(): Promise<{
    prioritizedActions: {
      budgetId: string;
      name: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      estimatedEffort: string;
      recommendations: string[];
    }[];
    estimatedTimeline: string;
    requiredResources: string[];
  }> {
    const gaps = await this.getBudgetEnforcementGaps();
    
    const prioritizedActions = gaps.map(gap => ({
      budgetId: gap.budgetId,
      name: gap.name,
      priority: gap.status === 'critical_gap' ? 'critical' as const :
               gap.status === 'needs_enforcement' ? 'high' as const : 'low' as const,
      estimatedEffort: this.estimateEffort(gap),
      recommendations: this.getRecommendations(gap)
    }));

    return {
      prioritizedActions,
      estimatedTimeline: '3-6 months for full enforcement',
      requiredResources: [
        'Performance engineering team',
        'Load testing infrastructure',
        'Monitoring and alerting systems',
        'CI/CD pipeline integration',
        'Database optimization expertise'
      ]
    };
  }

  private estimateEffort(gap: BudgetEnforcementGap): string {
    switch (gap.budgetId) {
      case 'explain_your_pay_budget':
        return '6-8 weeks (major optimization required)';
      case 'payments_cockpit_budget':
        return '2-3 weeks (implement monitoring)';
      case 'apd_build_budget':
        return '3-4 weeks (build process optimization)';
      case 'peak_load_testing_budget':
        return '8-12 weeks (full infrastructure setup)';
      default:
        return '2-4 weeks';
    }
  }

  private getRecommendations(gap: BudgetEnforcementGap): string[] {
    switch (gap.budgetId) {
      case 'explain_your_pay_budget':
        return [
          'Implement caching for frequently accessed pay calculations',
          'Optimize database queries and add indexes',
          'Use async processing for complex calculations',
          'Add performance monitoring and alerting'
        ];
      case 'payments_cockpit_budget':
        return [
          'Add performance budget enforcement in CI/CD',
          'Implement real-time monitoring of load times',
          'Optimize initial data queries',
          'Add loading state management'
        ];
      case 'apd_build_budget':
        return [
          'Set up build time monitoring in CI/CD',
          'Optimize build process and dependencies',
          'Implement incremental builds',
          'Add build performance alerts'
        ];
      case 'peak_load_testing_budget':
        return [
          'Set up load testing infrastructure',
          'Create automated load testing scenarios',
          'Implement performance monitoring at scale',
          'Add auto-scaling validation tests'
        ];
      default:
        return ['Implement monitoring', 'Set performance targets', 'Add alerting'];
    }
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
}