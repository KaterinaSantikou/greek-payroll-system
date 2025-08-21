import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  DollarSign,
  Target,
  Users,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  Zap,
  TrendingDown,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

interface LaborCostForecast {
  propertyId: string;
  propertyName: string;
  period: string;
  departments: Array<{
    department: string;
    currentMonthCost: number;
    projectedCost: number;
    budgetTarget: number;
    variance: number;
    variancePercentage: number;
    breakdown: {
      baseSalary: number;
      overtime: number;
      allowances: number;
      bonuses: number;
      employerContributions: number;
    };
    trendAnalysis: {
      trend: 'increasing' | 'decreasing' | 'stable';
      monthOverMonth: number;
      seasonalAdjustment: number;
    };
  }>;
  totalForecast: {
    currentMonth: number;
    projected: number;
    budget: number;
    variance: number;
    confidence: number;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    potentialSaving: number;
  }>;
}

interface OvertimeHeatmap {
  propertyId: string;
  period: string;
  heatmapData: Array<{
    date: string;
    department: string;
    overtimeHours: number;
    overtimeCost: number;
    intensity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  summary: {
    totalOvertimeHours: number;
    totalOvertimeCost: number;
    averageDailyOvertime: number;
    peakDays: Array<{
      date: string;
      hours: number;
      reason: string;
    }>;
  };
  patterns: {
    weeklyPattern: Array<{ day: string; averageHours: number }>;
    departmentRanking: Array<{ department: string; totalHours: number; efficiency: number }>;
  };
}

interface ComplianceKPIs {
  propertyId: string;
  period: string;
  metrics: {
    erganiSubmission: {
      successRate: number;
      totalSubmissions: number;
      failedSubmissions: number;
      target: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    };
    digitalWorkCard: {
      coverageRate: number;
      totalEmployees: number;
      coveredEmployees: number;
      pendingSetup: number;
      target: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    };
    exceptionRate: {
      rate: number;
      totalExceptions: number;
      resolvedExceptions: number;
      pendingExceptions: number;
      target: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    };
    payrollAccuracy: {
      accuracy: number;
      totalPayrolls: number;
      errorCount: number;
      target: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    };
  };
  alerts: Array<{
    severity: 'high' | 'medium' | 'low';
    category: string;
    message: string;
    impact: string;
    recommendation: string;
  }>;
}

interface ProductivityMetrics {
  propertyId: string;
  period: string;
  hotelMetrics: {
    laborCostPerOccupiedRoom: number;
    laborCostPerCover: number;
    revenuePerAvailableRoom: number;
    occupancyRate: number;
    averageDailyRate: number;
    totalRevenue: number;
    totalLaborCost: number;
    efficiency: number;
  };
  departmentProductivity: Array<{
    department: string;
    metrics: {
      laborCostPerHour: number;
      productivityIndex: number;
      efficiencyScore: number;
      utilizationRate: number;
    };
    staffMetrics: {
      totalStaff: number;
      activeStaff: number;
      utilizationRate: number;
      averageHoursPerEmployee: number;
    };
  }>;
  turnoverAnalysis: {
    turnoverRate: number;
    newHires: number;
    terminations: number;
    retentionRate: number;
    costOfTurnover: number;
  };
  absenteeismMetrics: {
    absenteeismRate: number;
    plannedAbsence: number;
    unplannedAbsence: number;
    sickLeaveRate: number;
    costOfAbsenteeism: number;
  };
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState("default");
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // Fetch Labor Cost Forecast
  const { data: laborForecast, isLoading: forecastLoading } = useQuery<LaborCostForecast>({
    queryKey: [`/api/analytics/labor-forecast/${selectedProperty}`],
    retry: false,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  // Fetch Overtime Heatmap
  const { data: overtimeHeatmap, isLoading: heatmapLoading } = useQuery<OvertimeHeatmap>({
    queryKey: [`/api/analytics/overtime-heatmap/${selectedProperty}`, dateRange.start, dateRange.end],
    retry: false,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  // Fetch Compliance KPIs
  const { data: complianceKPIs, isLoading: kpiLoading } = useQuery<ComplianceKPIs>({
    queryKey: [`/api/analytics/compliance-kpis/${selectedProperty}`],
    retry: false,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  // Fetch Productivity Metrics
  const { data: productivityMetrics, isLoading: productivityLoading } = useQuery<ProductivityMetrics>({
    queryKey: [`/api/analytics/productivity-metrics/${selectedProperty}`],
    retry: false,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Analytics & Forecasting
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Advanced labor cost forecasting, compliance KPIs, and productivity analytics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Hotel Santikos Costa</SelectItem>
              <SelectItem value="property2">Santikos Beach Resort</SelectItem>
              <SelectItem value="property3">Santikos City Center</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forecast" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Labor Forecast
          </TabsTrigger>
          <TabsTrigger value="overtime" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Overtime Heatmap
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance KPIs
          </TabsTrigger>
          <TabsTrigger value="productivity" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Productivity
          </TabsTrigger>
        </TabsList>

        {/* Labor Cost Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          {forecastLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : laborForecast && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Month</p>
                        <p className="text-2xl font-bold truncate">€{laborForecast.totalForecast.currentMonth.toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Projected</p>
                        <p className="text-2xl font-bold truncate">€{laborForecast.totalForecast.projected.toLocaleString()}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Variance</p>
                        <p className={`text-2xl font-bold truncate ${laborForecast.totalForecast.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {laborForecast.totalForecast.variance > 0 ? '+' : ''}€{laborForecast.totalForecast.variance.toLocaleString()}
                        </p>
                      </div>
                      <AlertTriangle className={`h-8 w-8 ${laborForecast.totalForecast.variance > 0 ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confidence</p>
                        <p className="text-2xl font-bold">{laborForecast.totalForecast.confidence.toFixed(1)}%</p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Department Forecast Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {laborForecast.departments.map((dept, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">{dept.department}</h3>
                          <div className="flex items-center gap-4">
                            <Badge className={getStatusColor(dept.trendAnalysis.trend === 'increasing' ? 'warning' : 'good')}>
                              {dept.trendAnalysis.trend === 'increasing' && <TrendingUp className="h-3 w-3 mr-1" />}
                              {dept.trendAnalysis.trend === 'decreasing' && <TrendingDown className="h-3 w-3 mr-1" />}
                              {dept.trendAnalysis.trend === 'stable' && <Activity className="h-3 w-3 mr-1" />}
                              {dept.trendAnalysis.trend}
                            </Badge>
                            <span className={`font-medium ${dept.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {dept.variancePercentage > 0 ? '+' : ''}{dept.variancePercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Base Salary</p>
                            <p className="font-medium truncate">€{dept.breakdown.baseSalary.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Overtime</p>
                            <p className="font-medium truncate">€{dept.breakdown.overtime.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Allowances</p>
                            <p className="font-medium truncate">€{dept.breakdown.allowances.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Bonuses</p>
                            <p className="font-medium truncate">€{dept.breakdown.bonuses.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Contributions</p>
                            <p className="font-medium truncate">€{dept.breakdown.employerContributions.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Cost Optimization Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {laborForecast.recommendations.map((rec, index) => (
                      <Alert key={index}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="flex items-center gap-2">
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority} priority
                          </Badge>
                          {rec.category}
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                          <p>{rec.description}</p>
                          <p className="font-medium text-green-600 mt-1">
                            <span className="break-all">Potential saving: €{rec.potentialSaving.toLocaleString()}</span>
                          </p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Overtime Heatmap Tab */}
        <TabsContent value="overtime" className="space-y-6">
          {heatmapLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : overtimeHeatmap && (
            <>
              {/* Overtime Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total OT Hours</p>
                        <p className="text-2xl font-bold">{overtimeHeatmap.summary.totalOvertimeHours.toFixed(1)}</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total OT Cost</p>
                        <p className="text-2xl font-bold truncate">€{overtimeHeatmap.summary.totalOvertimeCost.toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Daily Average</p>
                        <p className="text-2xl font-bold">{overtimeHeatmap.summary.averageDailyOvertime.toFixed(1)}</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Peak Days</p>
                        <p className="text-2xl font-bold">{overtimeHeatmap.summary.peakDays.length}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Ranking */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Overtime Ranking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overtimeHeatmap.patterns.departmentRanking.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-800">
                            {index + 1}
                          </div>
                          <span className="font-medium">{dept.department}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{dept.totalHours.toFixed(1)} hours</p>
                            <p className="text-sm text-gray-600">{dept.efficiency.toFixed(1)}% efficiency</p>
                          </div>
                          <Progress value={dept.efficiency} className="w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Compliance KPIs Tab */}
        <TabsContent value="compliance" className="space-y-6">
          {kpiLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : complianceKPIs && (
            <>
              {/* Compliance Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">ERGANI Submissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{complianceKPIs.metrics.erganiSubmission.successRate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-600">Target: {complianceKPIs.metrics.erganiSubmission.target}%</p>
                      </div>
                      <Badge className={getStatusColor(complianceKPIs.metrics.erganiSubmission.status)}>
                        {complianceKPIs.metrics.erganiSubmission.status}
                      </Badge>
                    </div>
                    <Progress value={complianceKPIs.metrics.erganiSubmission.successRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Digital Work Card</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{complianceKPIs.metrics.digitalWorkCard.coverageRate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-600">
                          {complianceKPIs.metrics.digitalWorkCard.coveredEmployees}/{complianceKPIs.metrics.digitalWorkCard.totalEmployees} employees
                        </p>
                      </div>
                      <Badge className={getStatusColor(complianceKPIs.metrics.digitalWorkCard.status)}>
                        {complianceKPIs.metrics.digitalWorkCard.status}
                      </Badge>
                    </div>
                    <Progress value={complianceKPIs.metrics.digitalWorkCard.coverageRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Exception Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{complianceKPIs.metrics.exceptionRate.rate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-600">
                          {complianceKPIs.metrics.exceptionRate.pendingExceptions} pending
                        </p>
                      </div>
                      <Badge className={getStatusColor(complianceKPIs.metrics.exceptionRate.status)}>
                        {complianceKPIs.metrics.exceptionRate.status}
                      </Badge>
                    </div>
                    <Progress value={100 - complianceKPIs.metrics.exceptionRate.rate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Payroll Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">{complianceKPIs.metrics.payrollAccuracy.accuracy.toFixed(1)}%</p>
                        <p className="text-xs text-gray-600">
                          {complianceKPIs.metrics.payrollAccuracy.errorCount} errors
                        </p>
                      </div>
                      <Badge className={getStatusColor(complianceKPIs.metrics.payrollAccuracy.status)}>
                        {complianceKPIs.metrics.payrollAccuracy.status}
                      </Badge>
                    </div>
                    <Progress value={complianceKPIs.metrics.payrollAccuracy.accuracy} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Compliance Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Compliance Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {complianceKPIs.alerts.map((alert, index) => (
                      <Alert key={index} className={alert.severity === 'high' ? 'border-red-200' : alert.severity === 'medium' ? 'border-yellow-200' : 'border-blue-200'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="flex items-center gap-2">
                          <Badge className={getPriorityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.category}
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-gray-600 mt-1">Impact: {alert.impact}</p>
                          <p className="text-sm text-blue-600 mt-1">Recommendation: {alert.recommendation}</p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          {productivityLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : productivityMetrics && (
            <>
              {/* Hotel Metrics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Labor Cost/Room</p>
                        <p className="text-2xl font-bold truncate">€{productivityMetrics.hotelMetrics.laborCostPerOccupiedRoom.toFixed(2)}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Labor Cost/Cover</p>
                        <p className="text-2xl font-bold truncate">€{productivityMetrics.hotelMetrics.laborCostPerCover.toFixed(2)}</p>
                      </div>
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Occupancy Rate</p>
                        <p className="text-2xl font-bold">{productivityMetrics.hotelMetrics.occupancyRate.toFixed(1)}%</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Efficiency</p>
                        <p className="text-2xl font-bold">{productivityMetrics.hotelMetrics.efficiency.toFixed(1)}%</p>
                      </div>
                      <Target className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Turnover & Absenteeism */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Turnover Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Turnover Rate</p>
                        <p className="text-xl font-bold text-red-600">{productivityMetrics.turnoverAnalysis.turnoverRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Retention Rate</p>
                        <p className="text-xl font-bold text-green-600">{productivityMetrics.turnoverAnalysis.retentionRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">New Hires</p>
                        <p className="text-xl font-bold">{productivityMetrics.turnoverAnalysis.newHires}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Terminations</p>
                        <p className="text-xl font-bold">{productivityMetrics.turnoverAnalysis.terminations}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Cost of Turnover</p>
                      <p className="text-2xl font-bold text-red-600 break-all">€{productivityMetrics.turnoverAnalysis.costOfTurnover.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Absenteeism Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Absenteeism Rate</p>
                        <p className="text-xl font-bold text-red-600">{productivityMetrics.absenteeismMetrics.absenteeismRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Sick Leave Rate</p>
                        <p className="text-xl font-bold text-orange-600">{productivityMetrics.absenteeismMetrics.sickLeaveRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Planned Absence</p>
                        <p className="text-xl font-bold">{productivityMetrics.absenteeismMetrics.plannedAbsence.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Unplanned</p>
                        <p className="text-xl font-bold">{productivityMetrics.absenteeismMetrics.unplannedAbsence.toFixed(1)}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Cost of Absenteeism</p>
                      <p className="text-2xl font-bold text-red-600 break-all">€{productivityMetrics.absenteeismMetrics.costOfAbsenteeism.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Productivity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Department Productivity Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productivityMetrics.departmentProductivity.map((dept, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">{dept.department}</h3>
                          <div className="flex items-center gap-4">
                            <Badge className="bg-blue-100 text-blue-800">
                              {dept.metrics.productivityIndex.toFixed(0)} Index
                            </Badge>
                            <Badge className="bg-green-100 text-green-800">
                              {dept.metrics.efficiencyScore.toFixed(0)}% Efficiency
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Labor Cost/Hour</p>
                            <p className="font-medium truncate">€{dept.metrics.laborCostPerHour.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Total Staff</p>
                            <p className="font-medium">{dept.staffMetrics.totalStaff}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Active Staff</p>
                            <p className="font-medium">{dept.staffMetrics.activeStaff}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Utilization</p>
                            <p className="font-medium">{dept.staffMetrics.utilizationRate.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}