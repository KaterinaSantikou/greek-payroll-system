/**
 * Drill-Down Analytics Component
 * Provides detailed views for dashboard metrics with interactive charts and analysis
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  RefreshCw
} from "lucide-react";

interface DrillDownProps {
  metricId: string;
  metricTitle: string;
  category: 'financial' | 'operational' | 'compliance' | 'workforce';
  onBack: () => void;
}

interface DetailedMetric {
  id: string;
  label: string;
  value: number | string;
  previousValue?: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  unit?: string;
  description?: string;
}

interface TimeSeriesData {
  date: string;
  value: number;
  target?: number;
  benchmark?: number;
}

interface BreakdownItem {
  category: string;
  value: number;
  percentage: number;
  change?: number;
  status?: 'good' | 'warning' | 'critical';
}

export default function DrillDownAnalytics({ 
  metricId, 
  metricTitle, 
  category, 
  onBack 
}: DrillDownProps) {
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [viewType, setViewType] = useState<'chart' | 'table' | 'breakdown'>('chart');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Fetch detailed analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/analytics/drill-down', metricId, timeRange, selectedDepartment],
    refetchInterval: 60000 // Refresh every minute
  });

  // Mock detailed data based on metric
  const getDetailedData = () => {
    switch (metricId) {
      case 'total-labor-cost':
        return {
          summary: [
            { id: 'current', label: 'Current Month', value: '€142,350', previousValue: '€145,200', change: -2.0, changeType: 'positive' as const, unit: '€', description: 'Total labor costs for current period' },
            { id: 'budget', label: 'Budget Variance', value: '-€2,650', change: -1.8, changeType: 'positive' as const, unit: '€', description: 'Under budget by 1.8%' },
            { id: 'ytd', label: 'Year to Date', value: '€1,421,500', previousValue: '€1,398,200', change: 1.7, changeType: 'negative' as const, unit: '€', description: 'YTD labor costs vs last year' },
            { id: 'forecast', label: 'Monthly Forecast', value: '€144,800', unit: '€', description: 'Projected end-of-month cost' }
          ],
          timeSeries: [
            { date: '2025-01-01', value: 138500, target: 145000, benchmark: 142000 },
            { date: '2025-01-08', value: 139200, target: 145000, benchmark: 142000 },
            { date: '2025-01-15', value: 141100, target: 145000, benchmark: 142000 },
            { date: '2025-01-22', value: 142350, target: 145000, benchmark: 142000 },
          ],
          breakdown: [
            { category: 'Basic Salaries', value: 98450, percentage: 69.2, change: -1.2, status: 'good' as const },
            { category: 'Overtime', value: 18900, percentage: 13.3, change: 12.5, status: 'warning' as const },
            { category: 'Bonuses', value: 12300, percentage: 8.6, change: 2.1, status: 'good' as const },
            { category: 'Social Security', value: 8950, percentage: 6.3, change: -0.8, status: 'good' as const },
            { category: 'Benefits', value: 3750, percentage: 2.6, change: 1.5, status: 'good' as const }
          ]
        };
        
      case 'active-employees':
        return {
          summary: [
            { id: 'total', label: 'Total Active', value: 45, previousValue: 44, change: 2.3, changeType: 'positive' as const, description: 'Currently active employees' },
            { id: 'new-hires', label: 'New Hires (MTD)', value: 3, description: 'New employees this month' },
            { id: 'departures', label: 'Departures (MTD)', value: 2, description: 'Employee departures this month' },
            { id: 'turnover', label: 'Monthly Turnover', value: '4.4%', change: 0.8, changeType: 'negative' as const, unit: '%', description: 'Monthly turnover rate' }
          ],
          timeSeries: [
            { date: '2025-01-01', value: 44, target: 45 },
            { date: '2025-01-08', value: 44, target: 45 },
            { date: '2025-01-15', value: 46, target: 45 },
            { date: '2025-01-22', value: 45, target: 45 },
          ],
          breakdown: [
            { category: 'Front Desk', value: 12, percentage: 26.7, status: 'good' as const },
            { category: 'Housekeeping', value: 15, percentage: 33.3, status: 'good' as const },
            { category: 'Restaurant', value: 8, percentage: 17.8, status: 'good' as const },
            { category: 'Kitchen', value: 6, percentage: 13.3, status: 'warning' as const },
            { category: 'Management', value: 4, percentage: 8.9, status: 'good' as const }
          ]
        };

      case 'overtime-variance':
        return {
          summary: [
            { id: 'current', label: 'Current Variance', value: '+12.5%', change: 5.1, changeType: 'negative' as const, unit: '%', description: 'Above target variance range' },
            { id: 'target', label: 'Target Range', value: '±5%', description: 'Acceptable variance range' },
            { id: 'total-hours', label: 'Overtime Hours', value: 342, previousValue: 304, change: 12.5, changeType: 'negative' as const, unit: 'hrs', description: 'Total overtime hours this period' },
            { id: 'cost-impact', label: 'Cost Impact', value: '€5,130', change: 15.2, changeType: 'negative' as const, unit: '€', description: 'Additional overtime costs' }
          ],
          timeSeries: [
            { date: '2025-01-01', value: 8.2, target: 5.0, benchmark: 7.5 },
            { date: '2025-01-08', value: 9.8, target: 5.0, benchmark: 7.5 },
            { date: '2025-01-15', value: 11.2, target: 5.0, benchmark: 7.5 },
            { date: '2025-01-22', value: 12.5, target: 5.0, benchmark: 7.5 },
          ],
          breakdown: [
            { category: 'Housekeeping', value: 125, percentage: 36.5, change: 18.2, status: 'critical' as const },
            { category: 'Front Desk', value: 89, percentage: 26.0, change: 8.5, status: 'warning' as const },
            { category: 'Restaurant', value: 67, percentage: 19.6, change: 12.1, status: 'warning' as const },
            { category: 'Kitchen', value: 44, percentage: 12.9, change: 6.8, status: 'good' as const },
            { category: 'Maintenance', value: 17, percentage: 5.0, change: 3.2, status: 'good' as const }
          ]
        };

      default:
        return {
          summary: [],
          timeSeries: [],
          breakdown: []
        };
    }
  };

  const data = getDetailedData();

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatValue = (value: number | string, unit?: string) => {
    if (typeof value === 'string') return value;
    if (unit === '€') return `€${value.toLocaleString()}`;
    if (unit === '%') return `${value}%`;
    if (unit === 'hrs') return `${value} hrs`;
    return value.toLocaleString();
  };

  const exportData = () => {
    console.log('Export analytics data for:', metricId);
    // In real app: trigger data export
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{metricTitle} - Detailed Analysis</h1>
            <p className="text-muted-foreground">
              In-depth analytics and performance breakdown
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="front-desk">Front Desk</SelectItem>
              <SelectItem value="housekeeping">Housekeeping</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="kitchen">Kitchen</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.summary.map((metric) => (
          <Card key={metric.id}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatValue(metric.value, metric.unit)}</div>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              
              {metric.change !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                  {metric.changeType === 'positive' ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : metric.changeType === 'negative' ? (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  ) : null}
                  <span className={`text-xs ${getChangeColor(metric.changeType || 'neutral')}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
              )}
              
              {metric.previousValue && (
                <div className="text-xs text-muted-foreground mt-1">
                  vs {formatValue(metric.previousValue, metric.unit)} prev period
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analysis */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="chart">
              <LineChart className="w-4 h-4 mr-1" />
              Chart View
            </TabsTrigger>
            <TabsTrigger value="breakdown">
              <PieChart className="w-4 h-4 mr-1" />
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="table">
              <Table className="w-4 h-4 mr-1" />
              Data Table
            </TabsTrigger>
          </TabsList>
          
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Trend Analysis - {timeRange}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mock chart placeholder */}
              <div className="h-64 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Interactive Chart Would Display Here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Time series data with trend lines and target comparisons
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
                <div className="text-center">
                  <div className="text-sm font-medium text-green-600">Trending Up</div>
                  <div className="text-xs text-muted-foreground">Performance improving</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-blue-600">On Target</div>
                  <div className="text-xs text-muted-foreground">Meeting expectations</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-yellow-600">Needs Attention</div>
                  <div className="text-xs text-muted-foreground">Room for improvement</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.breakdown.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">{item.category}</span>
                      {item.status && (
                        <Badge className={getStatusColor(item.status)} variant="secondary">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatValue(item.value)}</div>
                      <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Progress value={item.percentage} className="flex-1 h-2" />
                    {item.change !== undefined && (
                      <div className="flex items-center gap-1 min-w-16">
                        {item.change > 0 ? (
                          <TrendingUp className="w-3 h-3 text-red-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-green-600" />
                        )}
                        <span className={`text-xs ${item.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.change > 0 ? '+' : ''}{item.change}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="w-5 h-5" />
                Detailed Data Table
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Category</th>
                      <th className="text-right p-2 font-medium">Value</th>
                      <th className="text-right p-2 font-medium">Percentage</th>
                      <th className="text-right p-2 font-medium">Change</th>
                      <th className="text-center p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{item.category}</td>
                        <td className="p-2 text-right">{formatValue(item.value)}</td>
                        <td className="p-2 text-right">{item.percentage}%</td>
                        <td className="p-2 text-right">
                          {item.change !== undefined && (
                            <span className={item.change > 0 ? 'text-red-600' : 'text-green-600'}>
                              {item.change > 0 ? '+' : ''}{item.change}%
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {item.status && (
                            <Badge className={getStatusColor(item.status)} variant="secondary">
                              {item.status}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metricId === 'total-labor-cost' && (
            <>
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Under Budget Performance</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Labor costs are 2.0% under budget, indicating efficient workforce management and cost control.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Overtime Cost Concern</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Overtime costs are 12.5% above target. Consider staffing adjustments or workload redistribution.
                  </p>
                </div>
              </div>
            </>
          )}
          
          {metricId === 'overtime-variance' && (
            <>
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Critical Variance Alert</p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Overtime variance is significantly above target. Housekeeping department shows highest variance at 18.2%.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Recommended Actions</p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside">
                    <li>Review staffing levels in Housekeeping department</li>
                    <li>Implement overtime pre-approval workflow</li>
                    <li>Consider temporary staff during peak periods</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}