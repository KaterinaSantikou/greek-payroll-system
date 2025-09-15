import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  MapPin,
  Users,
  FileCheck,
  Zap,
  Activity,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface SuccessMetric {
  id: string;
  propertyId: string;
  metricDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  erganiSubmissionRate: string;
  unresolvedExceptionRate: string;
  geoVerificationRate: string;
  overtimeVariance: string;
  auditPackGenerationTime: number;
  overallComplianceScore: string;
}

interface SuccessMetricAlert {
  id: string;
  propertyId: string;
  metricType: string;
  alertLevel: string;
  threshold: string;
  actualValue: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
}

interface MetricsSummary {
  avgErganiSubmissionRate: number;
  avgUnresolvedExceptionRate: number;
  avgGeoVerificationRate: number;
  avgOvertimeVariance: number;
  avgAuditPackTime: number;
  avgOverallScore: number;
  totalActiveAlerts: number;
  trendsDirection: string;
}

// 2025 KPI Targets
const KPI_TARGETS = {
  UNRESOLVED_EXCEPTIONS_MAX: 1.0, // < 1% unresolved exceptions per pay period
  GOVERNMENT_SUBMISSION_MIN: 99.0, // ≥ 99% ERGANI/APD/ΦΜΥ submission success
  PAYROLL_RUNTIME_MAX: 15, // ≤ 15 min end-to-end payroll run for 200 employees
  AUTOMATION_TARGET: 100.0, // Zero manual re-key to ERP; 100% SEPA auto-reconcile
};

export default function SuccessMetricsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Success Metrics Summary Query
  const { data: metricsSummary, isLoading: summaryLoading } =
    useQuery<MetricsSummary>({
      queryKey: [
        '/api/success-metrics/summary',
        selectedProperty === 'all' ? undefined : selectedProperty,
      ],
      enabled: isAuthenticated,
      refetchInterval: 300000, // Refresh every 5 minutes
    });

  // Success Metrics Query
  const { data: metricsData, isLoading: metricsLoading } = useQuery<
    SuccessMetric[]
  >({
    queryKey: [
      '/api/success-metrics',
      selectedProperty,
      dateRange.from?.toISOString(),
      dateRange.to?.toISOString(),
    ],
    enabled: isAuthenticated && !!dateRange.from && !!dateRange.to,
  });

  // Alerts Query
  const { data: alertsData, isLoading: alertsLoading } = useQuery<
    SuccessMetricAlert[]
  >({
    queryKey: [
      '/api/success-metrics/alerts',
      selectedProperty === 'all' ? undefined : selectedProperty,
    ],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refresh every minute for alerts
  });

  // Generate Demo Data Mutation
  const generateDemoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/success-metrics/generate-demo', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Demo Data Generated',
        description:
          'Success metrics demo data has been generated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/success-metrics'] });
    },
    onError: error => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: 'Error',
        description: 'Failed to generate demo data. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Resolve Alert Mutation
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      await apiRequest(`/api/success-metrics/alerts/${alertId}/resolve`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Alert Resolved',
        description: 'The alert has been marked as resolved.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/success-metrics'] });
    },
    onError: error => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: 'Error',
        description: 'Failed to resolve alert. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Redirect to home if not authenticated
  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     toast({
  //       title: "Unauthorized",
  //       description: "You are logged out. Logging in again...",
  //       variant: "destructive",
  //     });
  //     setTimeout(() => {
  //       window.location.href = "/api/login";
  //     }, 500);
  //     return;
  //   }
  // }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getMetricStatus = (
    value: number,
    threshold: number,
    reverse = false
  ) => {
    const isGood = reverse ? value <= threshold : value >= threshold;
    return {
      status: isGood ? 'good' : 'warning',
      color: isGood ? 'text-green-600' : 'text-red-600',
      bgColor: isGood
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200',
    };
  };

  const getAlertLevelColor = (level: string) => {
    return level === 'critical'
      ? 'bg-red-100 text-red-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              Success Metrics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor key performance indicators: ERGANI ≥99%, exceptions
              &lt;1%, geo-verification ≥95%, audit packs &lt;5min
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => generateDemoMutation.mutate()}
              disabled={generateDemoMutation.isPending}
              variant="outline"
            >
              {generateDemoMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate Demo Data
            </Button>
            <Button
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ['/api/success-metrics'],
                })
              }
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div>
              <label className="text-sm font-medium">Property</label>
              <Select
                value={selectedProperty}
                onValueChange={setSelectedProperty}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  <SelectItem value="PRINCESS-FO">
                    Princess Front Office
                  </SelectItem>
                  <SelectItem value="PRINCESS-HOUSE">
                    Princess Housekeeping
                  </SelectItem>
                  <SelectItem value="PRINCESS-FB">Princess F&B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-64 justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} -{' '}
                          {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range: any) =>
                      setDateRange(range || { from: undefined, to: undefined })
                    }
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Metrics</TabsTrigger>
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card
                className={cn(
                  'border-2',
                  metricsSummary
                    ? getMetricStatus(
                        metricsSummary.avgErganiSubmissionRate,
                        99
                      ).bgColor
                    : ''
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    ERGANI Submission
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      metricsSummary
                        ? getMetricStatus(
                            metricsSummary.avgErganiSubmissionRate,
                            99
                          ).color
                        : ''
                    )}
                  >
                    {summaryLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : metricsSummary ? (
                      `${metricsSummary.avgErganiSubmissionRate.toFixed(1)}%`
                    ) : (
                      'N/A'
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: ≥ 99% <br />
                    {metricsSummary &&
                    metricsSummary.avgErganiSubmissionRate >= 99 ? (
                      <span className="text-green-600">✓ Target met</span>
                    ) : (
                      <span className="text-red-600">⚠ Below target</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  'border-2',
                  metricsSummary
                    ? getMetricStatus(
                        metricsSummary.avgUnresolvedExceptionRate,
                        1,
                        true
                      ).bgColor
                    : ''
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Unresolved Exceptions
                  </CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      metricsSummary
                        ? getMetricStatus(
                            metricsSummary.avgUnresolvedExceptionRate,
                            1,
                            true
                          ).color
                        : ''
                    )}
                  >
                    {summaryLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : metricsSummary ? (
                      `${metricsSummary.avgUnresolvedExceptionRate.toFixed(1)}%`
                    ) : (
                      'N/A'
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: &lt; 1% <br />
                    {metricsSummary &&
                    metricsSummary.avgUnresolvedExceptionRate < 1 ? (
                      <span className="text-green-600">✓ Target met</span>
                    ) : (
                      <span className="text-red-600">⚠ Above target</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  'border-2',
                  metricsSummary
                    ? getMetricStatus(metricsSummary.avgGeoVerificationRate, 95)
                        .bgColor
                    : ''
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Geo-Verified Punches
                  </CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      metricsSummary
                        ? getMetricStatus(
                            metricsSummary.avgGeoVerificationRate,
                            95
                          ).color
                        : ''
                    )}
                  >
                    {summaryLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : metricsSummary ? (
                      `${metricsSummary.avgGeoVerificationRate.toFixed(1)}%`
                    ) : (
                      'N/A'
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: ≥ 95% <br />
                    {metricsSummary &&
                    metricsSummary.avgGeoVerificationRate >= 95 ? (
                      <span className="text-green-600">✓ Target met</span>
                    ) : (
                      <span className="text-red-600">⚠ Below target</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  'border-2',
                  metricsSummary
                    ? getMetricStatus(
                        metricsSummary.avgAuditPackTime,
                        300,
                        true
                      ).bgColor
                    : ''
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Audit Pack Time
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      metricsSummary
                        ? getMetricStatus(
                            metricsSummary.avgAuditPackTime,
                            300,
                            true
                          ).color
                        : ''
                    )}
                  >
                    {summaryLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                    ) : metricsSummary ? (
                      `${Math.round(metricsSummary.avgAuditPackTime)}s`
                    ) : (
                      'N/A'
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: &lt; 5 minutes <br />
                    {metricsSummary &&
                    metricsSummary.avgAuditPackTime <= 300 ? (
                      <span className="text-green-600">✓ Target met</span>
                    ) : (
                      <span className="text-red-600">⚠ Above target</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Overall Compliance Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Overall Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Compliance Score</span>
                      <span
                        className={cn(
                          'font-bold',
                          metricsSummary
                            ? getComplianceScoreColor(
                                metricsSummary.avgOverallScore
                              )
                            : ''
                        )}
                      >
                        {metricsSummary
                          ? `${metricsSummary.avgOverallScore.toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <Progress
                      value={metricsSummary?.avgOverallScore || 0}
                      className="h-3"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Active Alerts
                    </div>
                    <div className="text-2xl font-bold text-red-600">
                      {metricsSummary?.totalActiveAlerts || 0}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Trend</div>
                    <div className="flex items-center gap-1">
                      {metricsSummary?.trendsDirection === 'improving' ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : metricsSummary?.trendsDirection === 'declining' ? (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <Activity className="h-5 w-5 text-gray-600" />
                      )}
                      <span className="text-sm capitalize">
                        {metricsSummary?.trendsDirection || 'stable'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Metrics History</CardTitle>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : metricsData && metricsData.length > 0 ? (
                  <div className="space-y-4">
                    {metricsData.map(metric => (
                      <Card key={metric.id} className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          <div>
                            <div className="text-sm font-medium">Property</div>
                            <div className="text-sm text-muted-foreground">
                              {metric.propertyId}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              ERGANI Rate
                            </div>
                            <div
                              className={cn(
                                'text-sm font-bold',
                                parseFloat(metric.erganiSubmissionRate) >= 99
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              )}
                            >
                              {parseFloat(metric.erganiSubmissionRate).toFixed(
                                1
                              )}
                              %
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Exception Rate
                            </div>
                            <div
                              className={cn(
                                'text-sm font-bold',
                                parseFloat(metric.unresolvedExceptionRate) <= 1
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              )}
                            >
                              {parseFloat(
                                metric.unresolvedExceptionRate
                              ).toFixed(1)}
                              %
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Geo-Verification
                            </div>
                            <div
                              className={cn(
                                'text-sm font-bold',
                                parseFloat(metric.geoVerificationRate) >= 95
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              )}
                            >
                              {parseFloat(metric.geoVerificationRate).toFixed(
                                1
                              )}
                              %
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Audit Time
                            </div>
                            <div
                              className={cn(
                                'text-sm font-bold',
                                metric.auditPackGenerationTime <= 300
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              )}
                            >
                              {metric.auditPackGenerationTime}s
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Overall Score
                            </div>
                            <div
                              className={cn(
                                'text-sm font-bold',
                                getComplianceScoreColor(
                                  parseFloat(metric.overallComplianceScore)
                                )
                              )}
                            >
                              {parseFloat(
                                metric.overallComplianceScore
                              ).toFixed(1)}
                              %
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Metrics Data
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Generate demo data to see success metrics
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : alertsData && alertsData.length > 0 ? (
                  <div className="space-y-4">
                    {alertsData
                      .filter(alert => !alert.isResolved)
                      .map(alert => (
                        <Card
                          key={alert.id}
                          className="p-4 border-l-4 border-red-500"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  className={getAlertLevelColor(
                                    alert.alertLevel
                                  )}
                                >
                                  {alert.alertLevel.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">
                                  {alert.metricType.replace('_', ' ')}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {alert.propertyId}
                                </span>
                              </div>
                              <p className="text-sm">{alert.message}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Threshold: {alert.threshold}</span>
                                <span>
                                  Actual:{' '}
                                  {parseFloat(alert.actualValue).toFixed(1)}
                                </span>
                                <span>
                                  Created:{' '}
                                  {format(
                                    new Date(alert.createdAt),
                                    'MMM dd, HH:mm'
                                  )}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() =>
                                resolveAlertMutation.mutate(alert.id)
                              }
                              disabled={resolveAlertMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          </div>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Active Alerts
                    </h3>
                    <p className="text-muted-foreground">
                      All success metrics are within target thresholds
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
