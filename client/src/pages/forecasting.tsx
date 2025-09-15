import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Clock,
  Euro,
  BarChart3,
  Calendar,
  Target,
  Activity,
  RefreshCw,
  Zap,
  Building2,
} from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function Forecasting() {
  const [selectedProperty] = useState('prop1');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useQuery({
    queryKey: ['/api/forecasting/dashboard', selectedProperty],
    enabled: !!selectedProperty,
  });

  // Staffing forecast mutation
  const staffingForecastMutation = useMutation({
    mutationFn: async (params: { propertyId: string; forecastDays: number }) =>
      apiRequest('/api/forecasting/staffing', 'POST', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forecasting'] });
    },
  });

  // Overtime forecast mutation
  const overtimeForecastMutation = useMutation({
    mutationFn: async (params: { propertyId: string; forecastWeeks: number }) =>
      apiRequest('/api/forecasting/overtime', 'POST', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forecasting'] });
    },
  });

  // Correlation insights mutation
  const correlationMutation = useMutation({
    mutationFn: async (params: { propertyId: string }) =>
      apiRequest('/api/forecasting/correlation-insights', 'POST', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forecasting'] });
    },
  });

  const generateStaffingForecast = () => {
    staffingForecastMutation.mutate({
      propertyId: selectedProperty,
      forecastDays: 30,
    });
  };

  const generateOvertimeForecast = () => {
    overtimeForecastMutation.mutate({
      propertyId: selectedProperty,
      forecastWeeks: 4,
    });
  };

  const generateCorrelationInsights = () => {
    correlationMutation.mutate({
      propertyId: selectedProperty,
    });
  };

  if (dashboardLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading forecasting dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Forecasting Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Failed to load forecasting dashboard. Please try refreshing the
              page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = (dashboardData as any)?.data?.kpis;
  const alerts = (dashboardData as any)?.data?.alerts || [];
  const quickWins = (dashboardData as any)?.data?.quickWins || [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Workforce Forecasting</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered staffing cost predictions and overtime analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1">
            <Building2 className="h-4 w-4 mr-1" />
            Property: {selectedProperty}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            <Activity className="h-4 w-4 mr-1" />
            Live Data
          </Badge>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {kpis && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Next Week Staffing Cost
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{kpis.nextWeekStaffingCost?.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis.occupancyTrendDirection === 'increasing' ? (
                  <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                ) : kpis.occupancyTrendDirection === 'decreasing' ? (
                  <TrendingDown className="inline h-3 w-3 mr-1 text-red-600" />
                ) : null}
                Occupancy trend: {kpis.occupancyTrendDirection}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Overtime Risk Outlets
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.nextWeekOvertimeRisk}
              </div>
              <p className="text-xs text-muted-foreground">
                High/Critical risk next week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Efficiency Score
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.efficiencyScore}%</div>
              <Progress value={kpis.efficiencyScore} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Current staffing efficiency
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Predicted Revenue
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{kpis.predictedRevenue?.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Next 7 days forecast
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Forecasting Alerts
            </CardTitle>
            <CardDescription>
              Critical insights and recommendations for your property
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.map((alert: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.priority === 'high'
                    ? 'border-red-500 bg-red-50'
                    : alert.priority === 'medium'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.message}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alert.priority === 'high' ? 'destructive' : 'secondary'
                    }
                  >
                    {alert.priority}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Quick Wins
            </CardTitle>
            <CardDescription>
              High-impact actions you can take immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quickWins.map((win: any, index: number) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{win.estimatedImpact}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {win.timeToImplement}
                      </span>
                    </div>
                    <p className="text-sm">{win.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="staffing">Staffing Forecast</TabsTrigger>
          <TabsTrigger value="overtime">Overtime Analysis</TabsTrigger>
          <TabsTrigger value="correlation">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Staffing Forecast</CardTitle>
                <CardDescription>Cost predictions and trends</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(dashboardData as any)?.data?.staffingForecast && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Next Week Cost:</span>
                      <span className="font-semibold">
                        €
                        {(
                          dashboardData as any
                        ).data.staffingForecast.nextWeekCost?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Trend:</span>
                      <Badge
                        variant={
                          (dashboardData as any).data.staffingForecast.trend ===
                          'increasing'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {(dashboardData as any).data.staffingForecast.trend}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Confidence:</span>
                      <span className="text-sm font-medium">
                        {Math.round(
                          (dashboardData as any).data.staffingForecast
                            .confidence * 100
                        )}
                        %
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={generateStaffingForecast}
                  disabled={staffingForecastMutation.isPending}
                >
                  {staffingForecastMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  Generate Forecast
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overtime Analysis</CardTitle>
                <CardDescription>Outlet-specific predictions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(dashboardData as any)?.data?.overtimeForecast && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Current Week:</span>
                      <span className="font-semibold">
                        {
                          (dashboardData as any).data.overtimeForecast
                            .currentWeekTotal
                        }
                        h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Next Week Predicted:</span>
                      <span className="font-semibold">
                        {
                          (dashboardData as any).data.overtimeForecast
                            .nextWeekPredicted
                        }
                        h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Risk Outlets:</span>
                      <Badge
                        variant={
                          (dashboardData as any).data.overtimeForecast
                            .riskOutlets > 2
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {
                          (dashboardData as any).data.overtimeForecast
                            .riskOutlets
                        }
                      </Badge>
                    </div>
                  </div>
                )}
                <Button
                  onClick={generateOvertimeForecast}
                  disabled={overtimeForecastMutation.isPending}
                >
                  {overtimeForecastMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Analyze Overtime
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correlation Insights</CardTitle>
                <CardDescription>Occupancy relationships</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(dashboardData as any)?.data?.correlationInsights && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Efficiency:</span>
                      <span className="font-semibold">
                        {Math.round(
                          (dashboardData as any).data.correlationInsights
                            .efficiency * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Optimal Range:</span>
                      <span className="text-sm">
                        {Math.round(
                          (dashboardData as any).data.correlationInsights
                            .optimalRange.min * 100
                        )}
                        -
                        {Math.round(
                          (dashboardData as any).data.correlationInsights
                            .optimalRange.max * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cost/Guest:</span>
                      <span className="text-sm font-medium">
                        €
                        {
                          (dashboardData as any).data.correlationInsights
                            .costPerGuest
                        }
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={generateCorrelationInsights}
                  disabled={correlationMutation.isPending}
                >
                  {correlationMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Target className="h-4 w-4 mr-2" />
                  )}
                  Get Insights
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staffing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Staffing Cost vs Occupancy Forecast</CardTitle>
              <CardDescription>
                30-day predictive analysis of staffing requirements based on
                occupancy patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Forecast Parameters</h4>
                    <p className="text-xs text-muted-foreground">
                      Property: {selectedProperty} • Period: 30 days
                    </p>
                  </div>
                  <Button
                    onClick={generateStaffingForecast}
                    disabled={staffingForecastMutation.isPending}
                  >
                    {staffingForecastMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <BarChart3 className="h-4 w-4 mr-2" />
                    )}
                    Generate Detailed Forecast
                  </Button>
                </div>

                {(staffingForecastMutation.data as any)?.data && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-lg font-semibold">Forecast Results</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h5 className="font-medium">Key Metrics</h5>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Historical Data Points:</span>
                            <span>
                              {
                                (staffingForecastMutation.data as any).data
                                  .metadata.dataPoints
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Forecast Confidence:</span>
                            <span>
                              {Math.round(
                                (staffingForecastMutation.data as any).data
                                  .metadata.forecastConfidence * 100
                              )}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Correlation Strength:</span>
                            <span>
                              {Math.round(
                                (staffingForecastMutation.data as any).data
                                  .metrics.correlation.occupancyToStaffing * 100
                              )}
                              %
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-medium">Recommendations</h5>
                        <div className="text-xs space-y-1">
                          {(
                            staffingForecastMutation.data as any
                          ).data.recommendations
                            .slice(0, 3)
                            .map((rec: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Target className="h-3 w-3 mt-0.5 text-blue-600" />
                                <span>{rec}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overtime Prediction by Outlet</CardTitle>
              <CardDescription>
                4-week analysis of overtime patterns and risk assessment by
                department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Analysis Parameters</h4>
                    <p className="text-xs text-muted-foreground">
                      Property: {selectedProperty} • Period: 4 weeks
                    </p>
                  </div>
                  <Button
                    onClick={generateOvertimeForecast}
                    disabled={overtimeForecastMutation.isPending}
                  >
                    {overtimeForecastMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    Generate Overtime Analysis
                  </Button>
                </div>

                {(overtimeForecastMutation.data as any)?.data && (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            Current Week Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span>Total Overtime:</span>
                            <span className="font-semibold">
                              {
                                overtimeForecastMutation.data.data
                                  .currentWeekSummary.totalOvertimeHours
                              }
                              h
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Average per Employee:</span>
                            <span className="font-semibold">
                              {
                                overtimeForecastMutation.data.data
                                  .currentWeekSummary.averagePerEmployee
                              }
                              h
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Highest Outlet:</span>
                            <span className="font-semibold">
                              {
                                overtimeForecastMutation.data.data
                                  .currentWeekSummary.highestOutlet
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overtime Cost:</span>
                            <span className="font-semibold">
                              €
                              {overtimeForecastMutation.data.data.currentWeekSummary.overtimeCost.toLocaleString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            Risk Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span>Total Outlets:</span>
                            <span className="font-semibold">
                              {
                                overtimeForecastMutation.data.data.riskSummary
                                  .totalOutlets
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>High Risk Outlets:</span>
                            <Badge
                              variant={
                                overtimeForecastMutation.data.data.riskSummary
                                  .highRiskOutlets > 2
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {
                                overtimeForecastMutation.data.data.riskSummary
                                  .highRiskOutlets
                              }
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Predicted Total Cost:</span>
                            <span className="font-semibold">
                              €
                              {overtimeForecastMutation.data.data.riskSummary.totalPredictedCost.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Weekly Cost:</span>
                            <span className="font-semibold">
                              €
                              {Math.round(
                                overtimeForecastMutation.data.data.riskSummary
                                  .avgWeeklyCost
                              ).toLocaleString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Outlet Forecasts */}
                    {overtimeForecastMutation.data.data.outletForecasts.length >
                      0 && (
                      <div>
                        <h4 className="text-lg font-semibold mb-4">
                          Outlet Risk Analysis
                        </h4>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {overtimeForecastMutation.data.data.outletForecasts.map(
                            (outlet: any) => (
                              <Card
                                key={outlet.outletId}
                                className={`border-l-4 ${
                                  outlet.riskLevel === 'critical'
                                    ? 'border-red-500'
                                    : outlet.riskLevel === 'high'
                                      ? 'border-orange-500'
                                      : outlet.riskLevel === 'medium'
                                        ? 'border-yellow-500'
                                        : 'border-green-500'
                                }`}
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">
                                      {outlet.outletName}
                                    </CardTitle>
                                    <Badge
                                      variant={
                                        outlet.riskLevel === 'critical'
                                          ? 'destructive'
                                          : outlet.riskLevel === 'high'
                                            ? 'destructive'
                                            : outlet.riskLevel === 'medium'
                                              ? 'secondary'
                                              : 'default'
                                      }
                                    >
                                      {outlet.riskLevel}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="text-xs space-y-2">
                                  <div className="flex justify-between">
                                    <span>Current Week:</span>
                                    <span className="font-medium">
                                      {outlet.currentWeekOT}h
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Predicted Next Week:</span>
                                    <span className="font-medium">
                                      {Math.round(outlet.predictedNextWeekOT)}h
                                    </span>
                                  </div>
                                  {outlet.recommendations.length > 0 && (
                                    <div>
                                      <span className="font-medium">
                                        Top Recommendation:
                                      </span>
                                      <p className="mt-1 text-muted-foreground">
                                        {outlet.recommendations[0]}
                                      </p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Correlation Insights</CardTitle>
              <CardDescription>
                Deep analysis of relationships between occupancy, staffing, and
                operational efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Analysis Scope</h4>
                    <p className="text-xs text-muted-foreground">
                      Property: {selectedProperty} • Historical: 6 months
                    </p>
                  </div>
                  <Button
                    onClick={generateCorrelationInsights}
                    disabled={correlationMutation.isPending}
                  >
                    {correlationMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Target className="h-4 w-4 mr-2" />
                    )}
                    Generate Correlation Analysis
                  </Button>
                </div>

                {(correlationMutation.data as any)?.data && (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            Staffing Efficiency
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Current Efficiency:</span>
                              <span className="font-semibold">
                                {Math.round(
                                  correlationMutation.data.data
                                    .staffingEfficiency.currentEfficiency * 100
                                )}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                correlationMutation.data.data.staffingEfficiency
                                  .currentEfficiency * 100
                              }
                              className="h-2"
                            />
                          </div>

                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Optimal Occupancy:</span>
                              <span>
                                {Math.round(
                                  correlationMutation.data.data
                                    .staffingEfficiency.optimalOccupancyRange
                                    .min * 100
                                )}
                                -
                                {Math.round(
                                  correlationMutation.data.data
                                    .staffingEfficiency.optimalOccupancyRange
                                    .max * 100
                                )}
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost per Guest (Optimal):</span>
                              <span>
                                €
                                {
                                  correlationMutation.data.data
                                    .staffingEfficiency.costPerGuestAtOptimal
                                }
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            Optimization Potential
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-sm space-y-2">
                            <div className="flex justify-between">
                              <span>Efficiency Gain Potential:</span>
                              <span className="font-semibold">
                                {correlationMutation.data.data.optimizationPotential.efficiencyGain.toFixed(
                                  1
                                )}
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Est. Cost Savings:</span>
                              <span className="font-semibold text-green-600">
                                €
                                {correlationMutation.data.data.optimizationPotential.costSavingsEstimate.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Implementation Priority:</span>
                              <Badge
                                variant={
                                  correlationMutation.data.data
                                    .optimizationPotential
                                    .implementationPriority === 'high'
                                    ? 'destructive'
                                    : correlationMutation.data.data
                                          .optimizationPotential
                                          .implementationPriority === 'medium'
                                      ? 'secondary'
                                      : 'default'
                                }
                              >
                                {
                                  correlationMutation.data.data
                                    .optimizationPotential
                                    .implementationPriority
                                }
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recommendations */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Staffing Adjustments
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-xs">
                            {correlationMutation.data.data.recommendations.staffingAdjustments.map(
                              (rec: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <Users className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />
                                  <span>{rec}</span>
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Process Improvements
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-xs">
                            {correlationMutation.data.data.recommendations.processImprovements.map(
                              (rec: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <Activity className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                                  <span>{rec}</span>
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            Technology Solutions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-xs">
                            {correlationMutation.data.data.recommendations.technologySolutions.map(
                              (rec: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  <Zap className="h-3 w-3 mt-0.5 text-purple-600 flex-shrink-0" />
                                  <span>{rec}</span>
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
