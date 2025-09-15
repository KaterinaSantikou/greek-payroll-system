import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobSalaryRangeGenerator } from './JobSalaryRangeGenerator';
import { RightToInfoWorkflow } from './RightToInfoWorkflow';
import {
  Scale,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Users,
  RefreshCw,
  Euro,
  Target,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ComplianceDashboardData {
  compliance: {
    score: number;
    breakdown: Array<{
      name: string;
      weight: number;
      completed: boolean;
    }>;
    daysUntilDeadline: number;
    actionItems: string[];
  };
  deadline: {
    date: string;
    daysRemaining: number;
    status: 'planning' | 'preparation' | 'urgent';
  };
  recentAnalyses: any[];
  pendingRequests: number;
  salaryRangesPublished: number;
  lastUpdated: string;
}

interface PayGapAnalysis {
  analysis: {
    genderPayGapPercent: string;
    maleEmployees: number;
    femaleEmployees: number;
    maleAvgSalary: string;
    femaleAvgSalary: string;
    analysisDate: string;
  };
  recommendations: string[];
}

export function PayEquityDashboard({
  propertyId = 'demo-property',
}: {
  propertyId?: string;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading } = useQuery<{
    data: ComplianceDashboardData;
  }>({
    queryKey: ['/api/pay-equity/compliance-dashboard', propertyId],
    refetchInterval: 60 * 60 * 1000, // 1 hour
  });

  const analyzePayGapMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/pay-equity/analyze-pay-gap', {
        method: 'POST',
        body: JSON.stringify({ propertyId }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (result: { data: PayGapAnalysis }) => {
      toast({
        title: '📊 Ανάλυση Μισθολογικού Χάσματος',
        description: `Ολοκληρώθηκε ανάλυση. Χάσμα: ${parseFloat(result.data.analysis.genderPayGapPercent).toFixed(1)}%`,
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/pay-equity/compliance-dashboard', propertyId],
      });
    },
    onError: () => {
      toast({
        title: 'Σφάλμα ανάλυσης',
        description: 'Δεν ήταν δυνατή η ανάλυση του μισθολογικού χάσματος',
        variant: 'destructive',
      });
    },
  });

  const updateComplianceMutation = useMutation({
    mutationFn: async ({
      component,
      status,
    }: {
      component: string;
      status: boolean;
    }) => {
      return apiRequest('/api/pay-equity/update-compliance', {
        method: 'POST',
        body: JSON.stringify({ propertyId, component, status }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/pay-equity/compliance-dashboard', propertyId],
      });
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: ['/api/pay-equity/compliance-dashboard', propertyId],
      });
      toast({
        title: 'Ενημερώθηκε επιτυχώς',
        description: 'Τα δεδομένα συμμόρφωσης ενημερώθηκαν',
      });
    } catch (error) {
      toast({
        title: 'Σφάλμα ενημέρωσης',
        description: 'Δεν ήταν δυνατή η ενημέρωση των δεδομένων',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getDeadlineStatusColor = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'text-red-600 dark:text-red-400';
      case 'preparation':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(amount));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const compliance = dashboardData?.data.compliance;
  const deadline = dashboardData?.data.deadline;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🇪🇺 Pay Transparency & Equity</h2>
          <p className="text-gray-600 dark:text-gray-400">
            EU Directive 2023/970 Compliance Dashboard
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* EU Deadline Alert */}
      {deadline && (
        <Alert
          className={`border-l-4 ${
            deadline.status === 'urgent'
              ? 'border-l-red-500'
              : deadline.status === 'preparation'
                ? 'border-l-orange-500'
                : 'border-l-blue-500'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>Transposition Deadline:</strong> June 7, 2026
              </span>
              <Badge
                variant={
                  deadline.status === 'urgent' ? 'destructive' : 'secondary'
                }
              >
                {deadline.daysRemaining} days remaining
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Readiness */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-blue-500" />
              Compliance Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {compliance && (
              <div className="space-y-4">
                {/* Score Circle */}
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${getReadinessColor(compliance.score)}`}
                  >
                    {compliance.score}%
                  </div>
                  <Progress value={compliance.score} className="mt-2" />
                </div>

                {/* Breakdown */}
                <div className="space-y-2">
                  {compliance.breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {item.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span
                          className={
                            item.completed ? 'text-green-600' : 'text-gray-600'
                          }
                        >
                          {item.name}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.weight}pts
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-500" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Salary Ranges Published</span>
                </div>
                <Badge variant="secondary">
                  {dashboardData?.data.salaryRangesPublished || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Pending Requests</span>
                </div>
                <Badge
                  variant={
                    dashboardData?.data.pendingRequests
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {dashboardData?.data.pendingRequests || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Recent Analyses</span>
                </div>
                <Badge variant="outline">
                  {dashboardData?.data.recentAnalyses?.length || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Priority Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {compliance?.actionItems && compliance.actionItems.length > 0 ? (
                compliance.actionItems.slice(0, 4).map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <div className="h-2 w-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {action}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm">All compliance items completed!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pay Gap Analysis */}
      {dashboardData?.data.recentAnalyses &&
        dashboardData.data.recentAnalyses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Recent Gender Pay Gap Analysis
              </CardTitle>
              <CardDescription>
                Latest analysis results and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.data.recentAnalyses
                  .slice(0, 3)
                  .map((analysis, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {analysis.analysisDate}
                        </span>
                        <Badge variant="outline">
                          {parseFloat(
                            analysis.genderPayGapPercent || '0'
                          ).toFixed(1)}
                          %
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Male Avg:</span>
                          <div className="font-medium">
                            {formatCurrency(analysis.maleAvgSalary || '0')}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Female Avg:</span>
                          <div className="font-medium">
                            {formatCurrency(analysis.femaleAvgSalary || '0')}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        {analysis.maleEmployees} male •{' '}
                        {analysis.femaleEmployees} female employees
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={() => analyzePayGapMutation.mutate()}
          disabled={analyzePayGapMutation.isPending}
          className="flex-1 sm:flex-initial"
        >
          {analyzePayGapMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Scale className="h-4 w-4 mr-2" />
          )}
          Analyze Pay Gap
        </Button>

        <Button variant="outline" className="flex-1 sm:flex-initial">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t">
        EU Directive 2023/970 requires transparency in pay structures and gender
        pay gap reporting.
        <br />
        Last updated:{' '}
        {dashboardData?.data.lastUpdated
          ? new Date(dashboardData.data.lastUpdated).toLocaleString('el-GR')
          : 'N/A'}
      </div>
    </div>
  );
}
