import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  Calendar,
  Users,
  TrendingUp,
  Shield,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Eye,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CsrdDashboardData {
  reportingPeriod: {
    id: string;
    reportingYear: number;
    esrsVersion: string;
    implementationWave: number;
    stopTheClockApplied: boolean;
    materialityStatus: string;
    reportingStatus: string;
  };
  readinessScore: number;
  keyMetrics: {
    workforce: {
      totalEmployees: number;
      totalFTE: number;
      genderPayGap: number | null;
      turnoverRate: number | null;
    } | null;
    healthSafety: {
      totalIncidents: number;
      fatalityRate: number;
      majorIncidents: number;
    };
    training: {
      totalHours: number;
      participants: number;
      completionRate: number;
    };
    payEquity: {
      genderPayGap: number;
      ceoPayRatio: number;
      lastCalculated: string;
    } | null;
  };
  compliance: {
    esrsVersion: string;
    implementationWave: number;
    stopTheClockApplied: boolean;
    materialityStatus: string;
    reportingStatus: string;
  };
  upcomingDeadlines: {
    materialityDeadline: string;
    consultationPeriod: string;
    reportingDeadline: string;
  };
}

interface CsrdS1DashboardProps {
  propertyId: string;
  year?: number;
}

export function CsrdS1Dashboard({
  propertyId,
  year = new Date().getFullYear(),
}: CsrdS1DashboardProps) {
  const [showMaterialityDialog, setShowMaterialityDialog] = useState(false);
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);
  const [calculateType, setCalculateType] = useState<
    'workforce' | 'turnover' | 'pay'
  >('workforce');
  const [materialityData, setMaterialityData] = useState({
    s1WorkforceMaterial: true,
    materialityJustification: '',
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch CSRD dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/csrd/dashboard', propertyId, year],
    queryFn: async (): Promise<CsrdDashboardData> => {
      const response = await fetch(
        `/api/csrd/dashboard/${propertyId}?year=${year}`
      );
      if (!response.ok) throw new Error('Failed to fetch CSRD data');
      return response.json();
    },
  });

  // Export CSRD report mutation
  const exportMutation = useMutation({
    mutationFn: async ({
      reportingPeriodId,
      exportType,
      applyMateriality,
    }: {
      reportingPeriodId: string;
      exportType: string;
      applyMateriality: boolean;
    }) => {
      const response = await fetch(
        `/api/csrd/export/${reportingPeriodId}?exportType=${exportType}&applyMateriality=${applyMateriality}`
      );
      if (!response.ok) throw new Error('Export failed');
      return response.json();
    },
    onSuccess: data => {
      // Trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CSRD_S1_Report_${year}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'CSRD S1 report has been downloaded successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Export Failed',
        description: 'Failed to export CSRD report. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update materiality mutation
  const materialityMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!dashboardData?.reportingPeriod?.id)
        throw new Error('No reporting period');
      const response = await fetch(
        `/api/csrd/materiality/${dashboardData.reportingPeriod.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to update materiality');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/csrd/dashboard'] });
      setShowMaterialityDialog(false);
      toast({
        title: 'Materiality Updated',
        description: 'Materiality assessment has been updated successfully.',
      });
    },
  });

  // Calculate metrics mutation
  const calculateMutation = useMutation({
    mutationFn: async ({
      type,
      data: calcData,
    }: {
      type: string;
      data: any;
    }) => {
      if (!dashboardData?.reportingPeriod?.id)
        throw new Error('No reporting period');
      const response = await fetch(
        `/api/csrd/calculate/${type}/${dashboardData.reportingPeriod.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calcData),
        }
      );
      if (!response.ok) throw new Error('Calculation failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/csrd/dashboard'] });
      setShowCalculateDialog(false);
      toast({
        title: 'Calculation Complete',
        description: 'Metrics have been calculated and updated.',
      });
    },
  });

  const handleExport = (
    exportType: string,
    applyMateriality: boolean = true
  ) => {
    if (!dashboardData?.reportingPeriod?.id) return;

    exportMutation.mutate({
      reportingPeriodId: dashboardData.reportingPeriod.id,
      exportType,
      applyMateriality,
    });
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      draft: 'secondary',
      review: 'default',
      final: 'default',
      submitted: 'default',
    };
    return statusMap[status] || 'secondary';
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load CSRD dashboard. Please check your configuration.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Executive Summary */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                CSRD / ESRS S1 "Own Workforce" Reporting
              </CardTitle>
              <CardDescription>
                Corporate Sustainability Reporting Directive -{' '}
                {dashboardData.reportingPeriod.reportingYear}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={getComplianceStatusBadge(
                  dashboardData.compliance.reportingStatus
                )}
              >
                {dashboardData.compliance.reportingStatus.toUpperCase()}
              </Badge>
              <Button
                onClick={() => handleExport('s1_only', true)}
                disabled={exportMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {exportMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                One-Click Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Readiness Score */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Readiness Score</Label>
                  <span
                    className={`text-2xl font-bold ${getReadinessColor(dashboardData.readinessScore)}`}
                  >
                    {dashboardData.readinessScore}%
                  </span>
                </div>
                <Progress
                  value={dashboardData.readinessScore}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Based on data completeness for S1-6/S1-16 KPIs
                </p>
              </div>
            </div>

            {/* ESRS Version & Compliance */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">
                  ESRS Version & Wave
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    v{dashboardData.compliance.esrsVersion}
                  </Badge>
                  <Badge variant="outline">
                    Wave {dashboardData.compliance.implementationWave}
                  </Badge>
                  {dashboardData.compliance.stopTheClockApplied && (
                    <Badge variant="destructive">Stop-the-Clock</Badge>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Materiality Assessment
                </Label>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm">
                    {dashboardData.compliance.materialityStatus}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMaterialityDialog(true)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Update
                  </Button>
                </div>
              </div>
            </div>

            {/* Key Deadlines */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Upcoming Deadlines</Label>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-orange-500" />
                  <span>
                    Commission Act:{' '}
                    {dashboardData.upcomingDeadlines.materialityDeadline}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span>
                    Consultation:{' '}
                    {dashboardData.upcomingDeadlines.consultationPeriod}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-red-500" />
                  <span>
                    Reporting:{' '}
                    {dashboardData.upcomingDeadlines.reportingDeadline}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Tabs */}
      <Tabs defaultValue="workforce" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workforce">
            <Users className="h-4 w-4 mr-2" />
            Workforce (S1-6)
          </TabsTrigger>
          <TabsTrigger value="health-safety">
            <Shield className="h-4 w-4 mr-2" />
            Health & Safety (S1-16)
          </TabsTrigger>
          <TabsTrigger value="pay-equity">
            <TrendingUp className="h-4 w-4 mr-2" />
            Pay Equity
          </TabsTrigger>
          <TabsTrigger value="training">
            <GraduationCap className="h-4 w-4 mr-2" />
            Training
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workforce" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.keyMetrics.workforce?.totalEmployees || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.keyMetrics.workforce?.totalFTE || 0} FTE
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gender Pay Gap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.keyMetrics.workforce?.genderPayGap
                    ? `${dashboardData.keyMetrics.workforce.genderPayGap.toFixed(1)}%`
                    : 'Not Calculated'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gross hourly method
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Turnover Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.keyMetrics.workforce?.turnoverRate
                    ? `${dashboardData.keyMetrics.workforce.turnoverRate}%`
                    : 'Not Calculated'}
                </div>
                <p className="text-xs text-muted-foreground">Annual rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCalculateType('workforce');
                setShowCalculateDialog(true);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Calculate Workforce Metrics
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="health-safety" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.keyMetrics.healthSafety.totalIncidents}
                </div>
                <p className="text-xs text-muted-foreground">
                  Reporting period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Major Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.keyMetrics.healthSafety.majorIncidents}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requires investigation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Fatality Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.keyMetrics.healthSafety.fatalityRate}
                </div>
                <p className="text-xs text-muted-foreground">Zero target</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pay-equity" className="space-y-4">
          {dashboardData.keyMetrics.payEquity ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Gender Pay Gap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {dashboardData.keyMetrics.payEquity.genderPayGap.toFixed(1)}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last calculated:{' '}
                    {dashboardData.keyMetrics.payEquity.lastCalculated}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">CEO Pay Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData.keyMetrics.payEquity.ceoPayRatio.toFixed(1)}
                    :1
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Highest paid to median
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Pay equity metrics not yet calculated. Use the calculate button
                to generate current data.
              </AlertDescription>
            </Alert>
          )}

          <Button
            variant="outline"
            onClick={() => {
              setCalculateType('pay');
              setShowCalculateDialog(true);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Calculate Pay Metrics
          </Button>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Training Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.keyMetrics.training.totalHours.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Reporting period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Participants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData.keyMetrics.training.participants}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique employees
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData.keyMetrics.training.completionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Success rate</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Materiality Assessment Dialog */}
      <Dialog
        open={showMaterialityDialog}
        onOpenChange={setShowMaterialityDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Materiality Assessment</DialogTitle>
            <DialogDescription>
              Assess whether S1 "Own Workforce" is material for your
              organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="material-toggle">
                S1 Own Workforce is Material
              </Label>
              <Switch
                id="material-toggle"
                checked={materialityData.s1WorkforceMaterial}
                onCheckedChange={checked =>
                  setMaterialityData({
                    ...materialityData,
                    s1WorkforceMaterial: checked,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="justification">Justification</Label>
              <Textarea
                id="justification"
                placeholder="Explain the basis for this materiality assessment..."
                value={materialityData.materialityJustification}
                onChange={e =>
                  setMaterialityData({
                    ...materialityData,
                    materialityJustification: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMaterialityDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => materialityMutation.mutate(materialityData)}
              disabled={materialityMutation.isPending}
            >
              Save Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculate Metrics Dialog */}
      <Dialog open={showCalculateDialog} onOpenChange={setShowCalculateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Calculate{' '}
              {calculateType === 'workforce'
                ? 'Workforce'
                : calculateType === 'pay'
                  ? 'Pay Equity'
                  : 'Turnover'}{' '}
              Metrics
            </DialogTitle>
            <DialogDescription>
              Calculate the latest S1 metrics from your payroll and time data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {calculateType === 'workforce' && (
              <div>
                <Label htmlFor="measurement-date">Measurement Date</Label>
                <Input
                  id="measurement-date"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>
            )}

            {calculateType === 'pay' && (
              <div>
                <Label htmlFor="calculation-date">Calculation Date</Label>
                <Input
                  id="calculation-date"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>
            )}

            {calculateType === 'turnover' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period-start">Period Start</Label>
                  <Input
                    id="period-start"
                    type="date"
                    defaultValue={`${year}-01-01`}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="period-end">Period End</Label>
                  <Input
                    id="period-end"
                    type="date"
                    defaultValue={`${year}-12-31`}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCalculateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const formData = new FormData();
                if (calculateType === 'workforce') {
                  const measurementDate = (
                    document.getElementById(
                      'measurement-date'
                    ) as HTMLInputElement
                  )?.value;
                  calculateMutation.mutate({
                    type: 'workforce',
                    data: { measurementDate },
                  });
                } else if (calculateType === 'pay') {
                  const calculationDate = (
                    document.getElementById(
                      'calculation-date'
                    ) as HTMLInputElement
                  )?.value;
                  calculateMutation.mutate({
                    type: 'pay-metrics',
                    data: { calculationDate },
                  });
                } else if (calculateType === 'turnover') {
                  const periodStart = (
                    document.getElementById('period-start') as HTMLInputElement
                  )?.value;
                  const periodEnd = (
                    document.getElementById('period-end') as HTMLInputElement
                  )?.value;
                  calculateMutation.mutate({
                    type: 'turnover',
                    data: { periodStart, periodEnd },
                  });
                }
              }}
              disabled={calculateMutation.isPending}
            >
              {calculateMutation.isPending
                ? 'Calculating...'
                : 'Calculate Metrics'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
