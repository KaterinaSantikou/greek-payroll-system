/**
 * Performance Budget Manager Component
 * Displays and manages performance budget enforcement gaps
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target,
  Zap,
  Database,
  Activity,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface BudgetEnforcementGap {
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

interface LoadTestingRequirement {
  name: string;
  peakLoadMultiplier: number;
  currentImplementation: 'none' | 'partial' | 'complete';
  requiredScenarios: string[];
  missingComponents: string[];
}

interface BudgetStatistics {
  totalBudgets: number;
  criticalGaps: number;
  needsEnforcement: number;
  compliant: number;
  averageGapMultiplier: number;
  worstGap: BudgetEnforcementGap | null;
}

const STATUS_CONFIG = {
  critical_gap: {
    label: 'Critical Gap',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle
  },
  needs_enforcement: {
    label: 'Needs Enforcement',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertCircle
  },
  compliant: {
    label: 'Compliant',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle2
  }
};

const TREND_ICONS = {
  improving: TrendingUp,
  degrading: TrendingDown,
  stable: Minus,
  unknown: Activity
};

export function PerformanceBudgetManager() {
  const [activeTab, setActiveTab] = useState('gaps');
  const [gaps, setGaps] = useState<BudgetEnforcementGap[]>([]);
  const [loadTesting, setLoadTesting] = useState<LoadTestingRequirement | null>(null);
  const [statistics, setStatistics] = useState<BudgetStatistics>({
    totalBudgets: 0,
    criticalGaps: 0,
    needsEnforcement: 0,
    compliant: 0,
    averageGapMultiplier: 0,
    worstGap: null
  });
  const { toast } = useToast();

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      // Load the specific gaps mentioned
      const explainYourPayGap: BudgetEnforcementGap = {
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

      const paymentsCockpitGap: BudgetEnforcementGap = {
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

      const apdBuildGap: BudgetEnforcementGap = {
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

      const peakLoadGap: BudgetEnforcementGap = {
        budgetId: 'peak_load_testing_budget',
        name: '5x Peak Load Testing',
        category: 'load_testing',
        currentTarget: 0, // no implementation
        requirement: 5, // 5x multiplier
        unit: 'multiplier',
        gapMultiplier: Infinity,
        status: 'needs_enforcement',
        description: 'No formal load testing implementation at scale',
        trend: 'unknown'
      };

      setGaps([explainYourPayGap, paymentsCockpitGap, apdBuildGap, peakLoadGap]);

      const loadTestingReq: LoadTestingRequirement = {
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

      setLoadTesting(loadTestingReq);

      setStatistics({
        totalBudgets: 4,
        criticalGaps: 1,
        needsEnforcement: 3,
        compliant: 0,
        averageGapMultiplier: 40,
        worstGap: explainYourPayGap
      });

    } catch (error) {
      console.error('Failed to load budget data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load performance budget data',
        variant: 'destructive'
      });
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.compliant;
  };

  const getTrendIcon = (trend: string) => {
    const IconComponent = TREND_ICONS[trend as keyof typeof TREND_ICONS] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatValue = (value: number, unit: string) => {
    if (!isFinite(value)) return 'None';
    
    switch (unit) {
      case 'milliseconds':
        return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
      case 'seconds':
        return `${value}s`;
      case 'multiplier':
        return `${value}x`;
      case 'percentage':
        return `${value}%`;
      default:
        return `${value} ${unit}`;
    }
  };

  const getGapSeverityColor = (multiplier: number) => {
    if (!isFinite(multiplier)) return 'text-red-600';
    if (multiplier >= 20) return 'text-red-600';
    if (multiplier >= 5) return 'text-orange-600';
    if (multiplier >= 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Performance Budget Enforcement</h2>
          <p className="text-sm text-muted-foreground">
            Monitor and address critical performance budget gaps
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="destructive" className="flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>{statistics.criticalGaps} Critical Gaps</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Target className="h-3 w-3" />
            <span>{statistics.totalBudgets} Total Budgets</span>
          </Badge>
        </div>
      </div>

      {/* Critical Alert */}
      {statistics.worstGap && statistics.worstGap.gapMultiplier >= 20 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical Performance Gap Detected:</strong> {statistics.worstGap.name} has a {
              isFinite(statistics.worstGap.gapMultiplier) 
                ? `${Math.round(statistics.worstGap.gapMultiplier)}x` 
                : 'infinite'
            } performance gap. Immediate attention required.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="gaps" className="flex items-center space-x-1">
            <AlertTriangle className="h-4 w-4" />
            <span>Budget Gaps</span>
          </TabsTrigger>
          <TabsTrigger value="load-testing" className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>Load Testing</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span>Statistics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gaps" className="space-y-4">
          {/* Budget Enforcement Gaps */}
          <div className="space-y-4">
            {gaps.map((gap) => {
              const statusConfig = getStatusConfig(gap.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <Card key={gap.budgetId} className={`${statusConfig.borderColor} ${statusConfig.bgColor}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-white`}>
                          <StatusIcon className={`h-5 w-5 ${statusConfig.textColor}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{gap.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {gap.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}>
                          {statusConfig.label}
                        </Badge>
                        <div className="flex items-center justify-end space-x-1 mt-2">
                          {getTrendIcon(gap.trend)}
                          <span className="text-xs text-gray-500 capitalize">{gap.trend}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Current Target</div>
                        <div className="font-medium">
                          {formatValue(gap.currentTarget, gap.unit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Requirement</div>
                        <div className="font-medium">
                          {formatValue(gap.requirement, gap.unit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Gap Multiplier</div>
                        <div className={`font-bold text-lg ${getGapSeverityColor(gap.gapMultiplier)}`}>
                          {isFinite(gap.gapMultiplier) ? `${Math.round(gap.gapMultiplier)}x` : '∞'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Category</div>
                        <div className="font-medium capitalize">
                          {gap.category.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    {gap.budgetId === 'explain_your_pay_budget' && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-sm font-medium text-red-800 mb-2">Critical Impact Analysis:</div>
                        <div className="text-sm text-red-700 space-y-1">
                          <div>• 20 second response time severely impacts user experience</div>
                          <div>• 40x performance gap indicates fundamental optimization needed</div>
                          <div>• May cause user abandonment and reduced system adoption</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="load-testing" className="space-y-4">
          {loadTesting && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>{loadTesting.name}</span>
                </CardTitle>
                <CardDescription>
                  Formal load testing implementation requirements and gaps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Target Load Multiplier</div>
                    <div className="text-2xl font-bold text-blue-600">{loadTesting.peakLoadMultiplier}x</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Current Implementation</div>
                    <Badge variant={loadTesting.currentImplementation === 'none' ? 'destructive' : 'secondary'}>
                      {loadTesting.currentImplementation}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Implementation Status</div>
                    <div className="flex items-center space-x-2">
                      <Progress value={0} className="flex-1" />
                      <span className="text-sm text-gray-500">0%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Required Scenarios</div>
                    <div className="space-y-2">
                      {loadTesting.requiredScenarios.map((scenario, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="capitalize">{scenario.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Missing Components</div>
                    <div className="space-y-2">
                      {loadTesting.missingComponents.map((component, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="capitalize">{component.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <strong>Implementation Required:</strong> No formal load testing infrastructure exists. 
                    System performance under 5x peak load is unknown and unvalidated.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budgets</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalBudgets}</div>
                <p className="text-xs text-muted-foreground">
                  Performance budgets tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statistics.criticalGaps}</div>
                <p className="text-xs text-muted-foreground">
                  Requiring immediate action
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Needs Enforcement</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{statistics.needsEnforcement}</div>
                <p className="text-xs text-muted-foreground">
                  Missing monitoring/validation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Gap</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getGapSeverityColor(statistics.averageGapMultiplier)}`}>
                  {isFinite(statistics.averageGapMultiplier) ? `${Math.round(statistics.averageGapMultiplier)}x` : '∞'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Performance gap multiplier
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enforcement Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Enforcement Priority Matrix</CardTitle>
              <CardDescription>
                Recommended order for addressing performance budget gaps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <div className="font-medium">Explain-Your-Pay Optimization</div>
                      <div className="text-sm text-gray-600">Critical 40x performance gap</div>
                    </div>
                  </div>
                  <Badge variant="destructive">Critical</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <div className="font-medium">5x Peak Load Testing</div>
                      <div className="text-sm text-gray-600">Infrastructure and scenarios needed</div>
                    </div>
                  </div>
                  <Badge variant="secondary">High</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <div className="font-medium">Payments Cockpit Monitoring</div>
                      <div className="text-sm text-gray-600">1s initial load enforcement</div>
                    </div>
                  </div>
                  <Badge variant="outline">Medium</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <div>
                      <div className="font-medium">APD Build Validation</div>
                      <div className="text-sm text-gray-600">1.5s SME build time monitoring</div>
                    </div>
                  </div>
                  <Badge variant="outline">Medium</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}