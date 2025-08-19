import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  Search,
  Clock,
  Users,
  DollarSign,
  BarChart3,
  Eye,
  Calendar,
  RefreshCw
} from "lucide-react";

// Types for analytics data
interface OvertimeHeatmapData {
  propertyId: string;
  propertyName: string;
  departments: DepartmentHeatmap[];
  lastUpdated: string;
  dataType: 'final' | 'draft';
}

interface DepartmentHeatmap {
  departmentId: string;
  departmentName: string;
  totalOvertimeHours: number;
  overtimeCost: number;
  employees: EmployeeOvertimeData[];
  anomalyScore: number;
}

interface EmployeeOvertimeData {
  employeeId: string;
  employeeName: string;
  overtimeHours: number;
  overtimeCost: number;
  anomalyFlags: string[];
  weeklyPattern: number[];
}

interface LaborVsOccupancyData {
  propertyId: string;
  period: string;
  occupancyRate: number;
  coversServed: number;
  laborHours: number;
  laborCost: number;
  efficiency: number;
  benchmark: number;
  variance: number;
  lastUpdated: string;
}

interface AnalyticsKPIs {
  overtimeAsPercentOfTotal: number;
  laborCostPerOccupiedRoom: number;
  laborEfficiencyRatio: number;
  anomaliesDetected: number;
  budgetVariance: number;
  thresholds: {
    overtimeThreshold: number;
    efficiencyThreshold: number;
    anomalyThreshold: number;
  };
}

export default function VisualAnalytics() {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<string>("prop-princess");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("last-7-days");
  const [drillDownLevel, setDrillDownLevel] = useState<'property' | 'department' | 'employee'>('property');

  // Fetch analytics data
  const { data: overtimeData, isLoading: isLoadingOvertime, refetch: refetchOvertime } = useQuery({
    queryKey: ['/api/analytics/overtime-heatmap', selectedProperty, dateRange],
    refetchInterval: 300000, // 5-minute cache window
  });

  const { data: laborData, isLoading: isLoadingLabor } = useQuery({
    queryKey: ['/api/analytics/labor-occupancy', selectedProperty, dateRange],
    refetchInterval: 300000,
  });

  const { data: kpiData, isLoading: isLoadingKPIs } = useQuery({
    queryKey: ['/api/analytics/kpis', selectedProperty, dateRange],
    refetchInterval: 60000, // 1-minute refresh for KPIs
  });

  const { data: properties } = useQuery({
    queryKey: ['/api/properties'],
  });

  // Mock data for demonstration (would be replaced by real API calls)
  const mockOvertimeData: OvertimeHeatmapData = useMemo(() => ({
    propertyId: selectedProperty,
    propertyName: "Princess Aegina Resort",
    lastUpdated: new Date().toISOString(),
    dataType: 'final',
    departments: [
      {
        departmentId: 'housekeeping',
        departmentName: 'Housekeeping',
        totalOvertimeHours: 127.5,
        overtimeCost: 1912.50,
        anomalyScore: 8.2,
        employees: [
          {
            employeeId: 'emp-001',
            employeeName: 'Maria Papadopoulos',
            overtimeHours: 18.5,
            overtimeCost: 277.50,
            anomalyFlags: ['consecutive-weekends', 'excessive-hours'],
            weeklyPattern: [0, 2.5, 0, 4, 6, 6, 0]
          },
          {
            employeeId: 'emp-002',
            employeeName: 'Dimitris Konstantinos',
            overtimeHours: 12.0,
            overtimeCost: 180.00,
            anomalyFlags: [],
            weeklyPattern: [0, 0, 3, 3, 3, 3, 0]
          }
        ]
      },
      {
        departmentId: 'kitchen',
        departmentName: 'Kitchen',
        totalOvertimeHours: 89.0,
        overtimeCost: 1335.00,
        anomalyScore: 3.1,
        employees: [
          {
            employeeId: 'emp-003',
            employeeName: 'Kostas Dimitriou',
            overtimeHours: 15.5,
            overtimeCost: 232.50,
            anomalyFlags: ['late-night-shifts'],
            weeklyPattern: [2, 2, 2, 2, 2, 3, 2.5]
          }
        ]
      }
    ]
  }), [selectedProperty]);

  const mockLaborData: LaborVsOccupancyData = useMemo(() => ({
    propertyId: selectedProperty,
    period: "Last 7 Days",
    occupancyRate: 82.4,
    coversServed: 1247,
    laborHours: 1680,
    laborCost: 25200.00,
    efficiency: 94.2,
    benchmark: 90.0,
    variance: 4.2,
    lastUpdated: new Date().toISOString()
  }), [selectedProperty]);

  const mockKPIData: AnalyticsKPIs = useMemo(() => ({
    overtimeAsPercentOfTotal: 12.8,
    laborCostPerOccupiedRoom: 156.25,
    laborEfficiencyRatio: 94.2,
    anomaliesDetected: 3,
    budgetVariance: -2.1,
    thresholds: {
      overtimeThreshold: 15.0,
      efficiencyThreshold: 85.0,
      anomalyThreshold: 5.0
    }
  }), []);

  const handleDrillDown = (level: 'property' | 'department' | 'employee', id?: string) => {
    setDrillDownLevel(level);
    if (level === 'department' && id) {
      setSelectedDepartment(id);
    } else if (level === 'employee' && id) {
      setSelectedEmployee(id);
    }
  };

  const handleInvestigate = (type: string, id: string) => {
    toast({
      title: "Investigation Started",
      description: `Opening detailed analysis for ${type}: ${id}`,
    });
    // In real implementation, this would navigate to detailed investigation page
  };

  const handleExportCSV = (dataType: string) => {
    // Generate CSV data based on current view
    const csvData = generateCSVData(dataType);
    downloadCSV(csvData, `${dataType}_${selectedProperty}_${dateRange}.csv`);
    
    toast({
      title: "Export Complete",
      description: `${dataType} data exported successfully`,
    });
  };

  const generateCSVData = (dataType: string): string => {
    // Mock CSV generation - would use real data in production
    const headers = {
      'overtime': 'Property,Department,Employee,Date,Hours,Cost,Anomaly_Flags',
      'labor': 'Property,Date,Occupancy_Rate,Covers_Served,Labor_Hours,Labor_Cost,Efficiency',
      'kpis': 'Property,Date,Overtime_Percent,Cost_Per_Room,Efficiency_Ratio,Anomalies,Budget_Variance'
    };
    
    return headers[dataType as keyof typeof headers] || 'No data available';
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getAnomalyColor = (score: number): string => {
    if (score >= mockKPIData.thresholds.anomalyThreshold) return 'text-red-600 bg-red-50';
    if (score >= 3) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const formatLastUpdated = (timestamp: string): string => {
    const date = new Date(timestamp);
    return `Last updated: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Visual Analytics Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Overtime heatmaps, labor efficiency analysis, and anomaly detection with drill-down capabilities
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prop-princess">Princess Aegina Resort</SelectItem>
                  <SelectItem value="prop-royal">Royal Athens Hotel</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => refetchOvertime()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Overtime %</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {mockKPIData.overtimeAsPercentOfTotal}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${mockKPIData.overtimeAsPercentOfTotal > mockKPIData.thresholds.overtimeThreshold ? 'bg-red-100' : 'bg-green-100'}`}>
                    <Clock className={`h-5 w-5 ${mockKPIData.overtimeAsPercentOfTotal > mockKPIData.thresholds.overtimeThreshold ? 'text-red-600' : 'text-green-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cost/Room</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{mockKPIData.laborCostPerOccupiedRoom}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Efficiency</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {mockKPIData.laborEfficiencyRatio}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${mockKPIData.laborEfficiencyRatio >= mockKPIData.thresholds.efficiencyThreshold ? 'bg-green-100' : 'bg-orange-100'}`}>
                    <TrendingUp className={`h-5 w-5 ${mockKPIData.laborEfficiencyRatio >= mockKPIData.thresholds.efficiencyThreshold ? 'text-green-600' : 'text-orange-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Anomalies</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {mockKPIData.anomaliesDetected}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${mockKPIData.anomaliesDetected >= mockKPIData.thresholds.anomalyThreshold ? 'bg-red-100' : 'bg-green-100'}`}>
                    <AlertTriangle className={`h-5 w-5 ${mockKPIData.anomaliesDetected >= mockKPIData.thresholds.anomalyThreshold ? 'text-red-600' : 'text-green-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Budget Var.</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {mockKPIData.budgetVariance > 0 ? '+' : ''}{mockKPIData.budgetVariance}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${mockKPIData.budgetVariance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    {mockKPIData.budgetVariance > 0 ? 
                      <TrendingUp className="h-5 w-5 text-red-600" /> :
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overtime-heatmap" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overtime-heatmap">Overtime Heatmap</TabsTrigger>
              <TabsTrigger value="labor-occupancy">Labor vs. Occupancy</TabsTrigger>
              <TabsTrigger value="anomaly-detection">Anomaly Detection</TabsTrigger>
            </TabsList>

            {/* Overtime Heatmap Tab */}
            <TabsContent value="overtime-heatmap" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Overtime Heatmap Analysis
                      </CardTitle>
                      <CardDescription>
                        {formatLastUpdated(mockOvertimeData.lastUpdated)} • 
                        <Badge variant={mockOvertimeData.dataType === 'final' ? 'default' : 'secondary'} className="ml-2">
                          {mockOvertimeData.dataType === 'final' ? 'Final Data' : 'Draft Data'}
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleExportCSV('overtime')} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Department-level heatmap */}
                  <div className="grid gap-4">
                    {mockOvertimeData.departments.map((dept) => (
                      <Card key={dept.departmentId} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {dept.departmentName}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {dept.totalOvertimeHours}h overtime
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  €{dept.overtimeCost.toLocaleString()}
                                </span>
                                <Badge className={getAnomalyColor(dept.anomalyScore)}>
                                  Anomaly Score: {dept.anomalyScore}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => handleDrillDown('department', dept.departmentId)} 
                                variant="outline" 
                                size="sm"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Drill Down
                              </Button>
                              <Button 
                                onClick={() => handleInvestigate('department', dept.departmentId)} 
                                variant="secondary" 
                                size="sm"
                              >
                                <Search className="h-4 w-4 mr-1" />
                                Investigate
                              </Button>
                            </div>
                          </div>

                          {/* Employee breakdown */}
                          <div className="grid gap-3">
                            {dept.employees.map((emp) => (
                              <div key={emp.employeeId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {emp.employeeName}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {emp.overtimeHours}h (€{emp.overtimeCost})
                                    </span>
                                    {emp.anomalyFlags.length > 0 && (
                                      <div className="flex gap-1">
                                        {emp.anomalyFlags.map((flag) => (
                                          <Badge key={flag} variant="destructive" className="text-xs">
                                            {flag.replace('-', ' ')}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleDrillDown('employee', emp.employeeId)} 
                                    variant="outline" 
                                    size="sm"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Details
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Labor vs. Occupancy Tab */}
            <TabsContent value="labor-occupancy" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Labor vs. Occupancy Analysis
                      </CardTitle>
                      <CardDescription>
                        {formatLastUpdated(mockLaborData.lastUpdated)} • Final Data
                      </CardDescription>
                    </div>
                    <Button onClick={() => handleExportCSV('labor')} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Occupancy Metrics */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Occupancy Metrics
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <span className="text-gray-700 dark:text-gray-300">Occupancy Rate</span>
                          <span className="font-semibold text-blue-600">{mockLaborData.occupancyRate}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <span className="text-gray-700 dark:text-gray-300">Covers Served</span>
                          <span className="font-semibold text-green-600">{mockLaborData.coversServed.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Labor Metrics */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Labor Metrics
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                          <span className="text-gray-700 dark:text-gray-300">Labor Hours</span>
                          <span className="font-semibold text-purple-600">{mockLaborData.laborHours.toLocaleString()}h</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                          <span className="text-gray-700 dark:text-gray-300">Labor Cost</span>
                          <span className="font-semibold text-orange-600">€{mockLaborData.laborCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Efficiency Analysis */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Efficiency Analysis
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Current Efficiency</span>
                          <Badge variant={mockLaborData.efficiency >= mockLaborData.benchmark ? 'default' : 'secondary'}>
                            {mockLaborData.efficiency}%
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(mockLaborData.efficiency, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Benchmark</span>
                          <span className="font-semibold">{mockLaborData.benchmark}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${mockLaborData.benchmark}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Variance</span>
                          <Badge variant={mockLaborData.variance > 0 ? 'default' : 'secondary'}>
                            {mockLaborData.variance > 0 ? '+' : ''}{mockLaborData.variance}%
                          </Badge>
                        </div>
                        <div className={`text-sm ${mockLaborData.variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {mockLaborData.variance > 0 ? 'Above benchmark' : 'Below benchmark'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Anomaly Detection Tab */}
            <TabsContent value="anomaly-detection" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Anomaly Detection & Alerts
                      </CardTitle>
                      <CardDescription>
                        Real-time anomaly monitoring with configurable thresholds
                      </CardDescription>
                    </div>
                    <Button onClick={() => handleExportCSV('kpis')} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Threshold Configuration */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Overtime Threshold
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-orange-600">
                            {mockKPIData.thresholds.overtimeThreshold}%
                          </span>
                          <Badge variant={mockKPIData.overtimeAsPercentOfTotal > mockKPIData.thresholds.overtimeThreshold ? 'destructive' : 'default'}>
                            {mockKPIData.overtimeAsPercentOfTotal > mockKPIData.thresholds.overtimeThreshold ? 'Exceeded' : 'Within Limit'}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Efficiency Threshold
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-blue-600">
                            {mockKPIData.thresholds.efficiencyThreshold}%
                          </span>
                          <Badge variant={mockKPIData.laborEfficiencyRatio >= mockKPIData.thresholds.efficiencyThreshold ? 'default' : 'destructive'}>
                            {mockKPIData.laborEfficiencyRatio >= mockKPIData.thresholds.efficiencyThreshold ? 'Met' : 'Below Target'}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Anomaly Threshold
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-red-600">
                            {mockKPIData.thresholds.anomalyThreshold}
                          </span>
                          <Badge variant={mockKPIData.anomaliesDetected >= mockKPIData.thresholds.anomalyThreshold ? 'destructive' : 'default'}>
                            {mockKPIData.anomaliesDetected >= mockKPIData.thresholds.anomalyThreshold ? 'Alert Level' : 'Normal'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Active Anomalies */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Active Anomalies
                      </h3>
                      <div className="space-y-3">
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-red-800 dark:text-red-200">
                                Excessive Overtime Pattern - Maria Papadopoulos
                              </h4>
                              <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                                18.5 hours overtime this week, working consecutive weekends
                              </p>
                            </div>
                            <Button onClick={() => handleInvestigate('employee', 'emp-001')} variant="destructive" size="sm">
                              Investigate
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                                Housekeeping Department - High Anomaly Score
                              </h4>
                              <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                                Anomaly score of 8.2, exceeding threshold of {mockKPIData.thresholds.anomalyThreshold}
                              </p>
                            </div>
                            <Button onClick={() => handleInvestigate('department', 'housekeeping')} variant="outline" size="sm">
                              Investigate
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                                Late Night Shift Pattern - Kostas Dimitriou
                              </h4>
                              <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                                Unusual pattern of late-night shifts in kitchen department
                              </p>
                            </div>
                            <Button onClick={() => handleInvestigate('employee', 'emp-003')} variant="outline" size="sm">
                              Investigate
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Data Integrity Footer */}
          <Card className="mt-8">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Data refreshed every 5 minutes • Cache window: 300s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Final Data Only</Badge>
                  <span>•</span>
                  <Badge variant="outline">No Mixed Sources</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}