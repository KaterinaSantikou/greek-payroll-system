import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Zap,
  Building2,
  Timer,
  CreditCard,
  Gauge,
  Target,
} from 'lucide-react';

interface ComplianceCard {
  id: string;
  title: string;
  status: 'compliant' | 'warning' | 'critical';
  value: string;
  description: string;
  deadline?: string;
  actionRequired: boolean;
}

interface KPIMetric {
  id: string;
  title: string;
  value: string;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  target?: string;
  description: string;
}

export default function ManagerDashboard() {
  const queryClient = useQueryClient();

  // Live compliance data
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ['/api/compliance/live-status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // KPI metrics
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['/api/analytics/kpi-metrics'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Quick actions mutations
  const runPayroll = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/payroll/run-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/analytics/kpi-metrics'],
      });
    },
  });

  const approveOvertime = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/overtime/approve-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/compliance/live-status'],
      });
    },
  });

  const fileAPD = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/compliance/file-apd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/compliance/live-status'],
      });
    },
  });

  // Mock data with realistic Greek payroll metrics
  const mockComplianceCards: ComplianceCard[] = [
    {
      id: 'ergani-sync',
      title: 'ERGANI Sync Status',
      status: 'compliant',
      value: '45/45 Employees',
      description: 'All employee data synchronized with ERGANI II',
      actionRequired: false,
    },
    {
      id: 'apd-deadline',
      title: 'APD Filing Deadline',
      status: 'warning',
      value: '3 Days Remaining',
      description: 'Monthly APD filing due January 31st',
      deadline: '2025-01-31',
      actionRequired: true,
    },
    {
      id: 'fmy-deadline',
      title: 'ΦΜΥ Submission',
      status: 'critical',
      value: 'Overdue',
      description: 'Quarterly ΦΜΥ submission pending',
      deadline: '2025-01-15',
      actionRequired: true,
    },
    {
      id: 'digital-cards',
      title: 'Digital Work Cards',
      status: 'compliant',
      value: '100% Coverage',
      description: 'All active employees have digital work cards',
      actionRequired: false,
    },
  ];

  const mockKPIMetrics: KPIMetric[] = [
    {
      id: 'labor-cost',
      title: 'Labor Cost vs Budget',
      value: '€142,350',
      change: -3.2,
      changeType: 'positive',
      target: '€145,000',
      description: 'Monthly labor costs under budget',
    },
    {
      id: 'overtime-variance',
      title: 'Overtime Variance',
      value: '+12.5%',
      change: 5.1,
      changeType: 'negative',
      target: '±5%',
      description: 'Above target variance range',
    },
    {
      id: 'staffing-forecast',
      title: 'Staffing Forecast',
      value: '92% Optimal',
      change: 2.8,
      changeType: 'positive',
      target: '90-100%',
      description: 'Near optimal staffing levels',
    },
    {
      id: 'compliance-score',
      title: 'Compliance Score',
      value: '94.5%',
      change: -1.2,
      changeType: 'negative',
      target: '95%',
      description: 'Minor compliance gaps detected',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'critical':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800';
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Gauge className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Executive Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time payroll and compliance overview
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString('el-GR')}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Essential operations at your fingertips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => runPayroll.mutate()}
              disabled={runPayroll.isPending}
              className="h-16 text-lg flex items-center gap-3 bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-6 h-6" />
              {runPayroll.isPending ? 'Processing...' : 'Run Payroll'}
            </Button>

            <Button
              onClick={() => approveOvertime.mutate()}
              disabled={approveOvertime.isPending}
              variant="outline"
              className="h-16 text-lg flex items-center gap-3"
            >
              <Timer className="w-6 h-6" />
              {approveOvertime.isPending ? 'Approving...' : 'Approve Overtime'}
            </Button>

            <Button
              onClick={() => fileAPD.mutate()}
              disabled={fileAPD.isPending}
              variant="outline"
              className="h-16 text-lg flex items-center gap-3"
            >
              <FileText className="w-6 h-6" />
              {fileAPD.isPending ? 'Filing...' : 'File APD'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Compliance Cards */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-600" />
          Live Compliance Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockComplianceCards.map(card => (
            <Card
              key={card.id}
              className={`${getStatusColor(card.status)} shadow-md hover:shadow-lg transition-shadow`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  {getStatusIcon(card.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-sm text-muted-foreground">
                  {card.description}
                </p>

                {card.deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Due: {new Date(card.deadline).toLocaleDateString('el-GR')}
                    </span>
                  </div>
                )}

                {card.actionRequired && (
                  <Badge variant="destructive" className="text-xs">
                    Action Required
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* KPI Panels */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          Key Performance Indicators
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockKPIMetrics.map(metric => (
            <Card
              key={metric.id}
              className="shadow-md hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{metric.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold">{metric.value}</div>
                  <div className="flex items-center gap-1">
                    {getChangeIcon(metric.changeType)}
                    <span
                      className={`text-sm font-medium ${
                        metric.changeType === 'positive'
                          ? 'text-green-600'
                          : metric.changeType === 'negative'
                            ? 'text-red-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {metric.change > 0 ? '+' : ''}
                      {metric.change}%
                    </span>
                  </div>
                </div>

                {metric.target && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Target:</strong> {metric.target}
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  {metric.description}
                </p>

                {metric.id === 'labor-cost' && (
                  <Progress value={98.2} className="h-2" />
                )}
                {metric.id === 'overtime-variance' && (
                  <Progress value={75} className="h-2" />
                )}
                {metric.id === 'staffing-forecast' && (
                  <Progress value={92} className="h-2" />
                )}
                {metric.id === 'compliance-score' && (
                  <Progress value={94.5} className="h-2" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Critical Alerts */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Priority Alerts</h2>

        <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>ΦΜΥ Submission Overdue:</strong> Quarterly filing is past
            due. Complete submission immediately to avoid penalties.
          </AlertDescription>
        </Alert>

        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>APD Filing Due Soon:</strong> Monthly APD filing due in 3
            days. Review overtime approvals before submission.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
