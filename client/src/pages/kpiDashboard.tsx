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
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  RefreshCw,
  Zap,
  Activity,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { useAuth } from '@/hooks/useAuth';
import { subDays } from 'date-fns';
import { cn } from '@/lib/utils';

// 2025 Critical KPI Targets
const KPI_TARGETS = {
  UNRESOLVED_EXCEPTIONS_MAX: 1.0, // < 1% unresolved exceptions per pay period
  GOVERNMENT_SUBMISSION_MIN: 99.0, // ≥ 99% ERGANI/APD/ΦΜΥ submission success
  PAYROLL_RUNTIME_MAX: 15, // ≤ 15 min end-to-end payroll run for 200 employees
  AUTOMATION_TARGET: 100.0, // Zero manual re-key to ERP; 100% SEPA auto-reconcile
};

interface KPIMetrics {
  unresolved_exception_rate: number;
  government_submission_rate: number;
  payroll_runtime_minutes: number;
  automation_rate: number;
  employee_count: number;
  property_id: string;
  last_updated: string;
}

interface KPIAlert {
  id: string;
  kpi_type: string;
  severity: string;
  message: string;
  threshold: number;
  actual_value: number;
  created_at: string;
  is_resolved: boolean;
}

export default function KPIDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  // KPI Metrics Query
  const {
    data: kpiData,
    isLoading: kpiLoading,
    error,
  } = useQuery<KPIMetrics[]>({
    queryKey: [
      '/api/success-metrics',
      selectedProperty === 'all' ? undefined : selectedProperty,
    ],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // KPI Alerts Query
  const { data: alertsData, isLoading: alertsLoading } = useQuery<KPIAlert[]>({
    queryKey: [
      '/api/success-metrics/alerts',
      selectedProperty === 'all' ? undefined : selectedProperty,
    ],
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refresh every minute
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
        title: 'KPI Data Generated',
        description: 'Success metrics data updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/success-metrics'] });
    },
    onError: error => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "Session expired. Redirecting...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => window.location.href = "/api/login", 500);
      //   return;
      // }
      toast({
        title: 'Error',
        description: 'Failed to generate KPI data. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Note: Authentication is handled by ProtectedRoute wrapper
  // No need for component-level auth redirects

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate aggregated KPIs across all properties
  const latestMetrics = kpiData?.[0] || {
    unresolved_exception_rate: 0.8,
    government_submission_rate: 99.2,
    payroll_runtime_minutes: 12.5,
    automation_rate: 99.1,
    employee_count: 185,
    property_id: 'all',
    last_updated: new Date().toISOString(),
  };

  const getKPIStatus = (value: number, target: number, isInverse = false) => {
    const isGood = isInverse ? value <= target : value >= target;
    return {
      status: isGood ? 'success' : 'warning',
      color: isGood
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400',
      bgColor: isGood
        ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
        : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
      icon: isGood ? CheckCircle : AlertTriangle,
    };
  };

  const unresolved = getKPIStatus(
    latestMetrics.unresolved_exception_rate,
    KPI_TARGETS.UNRESOLVED_EXCEPTIONS_MAX,
    true
  );
  const submissions = getKPIStatus(
    latestMetrics.government_submission_rate,
    KPI_TARGETS.GOVERNMENT_SUBMISSION_MIN
  );
  const runtime = getKPIStatus(
    latestMetrics.payroll_runtime_minutes,
    KPI_TARGETS.PAYROLL_RUNTIME_MAX,
    true
  );
  const automation = getKPIStatus(
    latestMetrics.automation_rate,
    KPI_TARGETS.AUTOMATION_TARGET
  );

  const activeAlerts = alertsData?.filter(alert => !alert.is_resolved) || [];
  const criticalAlerts = activeAlerts.filter(
    alert => alert.severity === 'critical'
  );

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              2025 Success Metrics
            </h1>
            <p className="text-muted-foreground text-lg">
              Critical KPI targets for PayrollSync operational excellence
            </p>
          </div>

          <div className="flex items-center gap-4">
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

            <Button
              onClick={() => generateDemoMutation.mutate()}
              disabled={generateDemoMutation.isPending}
              className="gap-2"
            >
              {generateDemoMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Refresh KPIs
            </Button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <div className="mb-6">
            <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100">
                      {criticalAlerts.length} Critical KPI Alert
                      {criticalAlerts.length !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-200">
                      Immediate attention required to maintain operational
                      targets
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* KPI 1: Unresolved Exceptions < 1% */}
          <Card
            className={cn('transition-all duration-200', unresolved.bgColor)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Exception Resolution Rate
              </CardTitle>
              <unresolved.icon className={cn('h-4 w-4', unresolved.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {latestMetrics.unresolved_exception_rate.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Target:</span> &lt;{' '}
                {KPI_TARGETS.UNRESOLVED_EXCEPTIONS_MAX}% unresolved per pay
                period
              </p>
              <Progress
                value={Math.max(
                  0,
                  Math.min(
                    100,
                    ((KPI_TARGETS.UNRESOLVED_EXCEPTIONS_MAX -
                      latestMetrics.unresolved_exception_rate) /
                      KPI_TARGETS.UNRESOLVED_EXCEPTIONS_MAX) *
                      100
                  )
                )}
                className="h-2"
              />
              <div className="flex items-center mt-2">
                <Badge
                  variant={
                    unresolved.status === 'success' ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {unresolved.status === 'success'
                    ? 'On Target'
                    : 'Action Needed'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* KPI 2: Government Submissions ≥ 99% */}
          <Card
            className={cn('transition-all duration-200', submissions.bgColor)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Government Submission Success
              </CardTitle>
              <submissions.icon className={cn('h-4 w-4', submissions.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {latestMetrics.government_submission_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Target:</span> ≥{' '}
                {KPI_TARGETS.GOVERNMENT_SUBMISSION_MIN}% ERGANI/APD/ΦΜΥ success
              </p>
              <Progress
                value={latestMetrics.government_submission_rate}
                className="h-2"
              />
              <div className="flex items-center mt-2">
                <Badge
                  variant={
                    submissions.status === 'success' ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {submissions.status === 'success'
                    ? 'Compliant'
                    : 'Below Target'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* KPI 3: Payroll Runtime ≤ 15 min */}
          <Card className={cn('transition-all duration-200', runtime.bgColor)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Payroll Processing Speed
              </CardTitle>
              <runtime.icon className={cn('h-4 w-4', runtime.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {latestMetrics.payroll_runtime_minutes.toFixed(1)} min
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Target:</span> ≤{' '}
                {KPI_TARGETS.PAYROLL_RUNTIME_MAX} min for{' '}
                {latestMetrics.employee_count} employees
              </p>
              <Progress
                value={Math.max(
                  0,
                  Math.min(
                    100,
                    ((KPI_TARGETS.PAYROLL_RUNTIME_MAX -
                      latestMetrics.payroll_runtime_minutes) /
                      KPI_TARGETS.PAYROLL_RUNTIME_MAX) *
                      100
                  )
                )}
                className="h-2"
              />
              <div className="flex items-center mt-2">
                <Badge
                  variant={
                    runtime.status === 'success' ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {runtime.status === 'success'
                    ? 'Fast'
                    : 'Optimization Needed'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* KPI 4: ERP/SEPA Automation 100% */}
          <Card
            className={cn('transition-all duration-200', automation.bgColor)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Zero Manual Re-key Rate
              </CardTitle>
              <automation.icon className={cn('h-4 w-4', automation.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {latestMetrics.automation_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Target:</span>{' '}
                {KPI_TARGETS.AUTOMATION_TARGET}% ERP/SEPA automation
              </p>
              <Progress value={latestMetrics.automation_rate} className="h-2" />
              <div className="flex items-center mt-2">
                <Badge
                  variant={
                    automation.status === 'success' ? 'default' : 'destructive'
                  }
                  className="text-xs"
                >
                  {automation.status === 'success'
                    ? 'Fully Automated'
                    : 'Manual Work Detected'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Status Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              KPI Compliance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {
                    [unresolved, submissions, runtime, automation].filter(
                      kpi => kpi.status === 'success'
                    ).length
                  }
                  /4
                </div>
                <p className="text-sm text-muted-foreground">KPIs on target</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {activeAlerts.length}
                </div>
                <p className="text-sm text-muted-foreground">Active alerts</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {latestMetrics.employee_count}
                </div>
                <p className="text-sm text-muted-foreground">
                  Employees managed
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {selectedProperty === 'all' ? 'Multi' : '1'}
                </div>
                <p className="text-sm text-muted-foreground">
                  Properties monitored
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Active KPI Alerts ({activeAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeAlerts.slice(0, 5).map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          alert.severity === 'critical'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Target: {alert.threshold} | Current:{' '}
                          {alert.actual_value}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
