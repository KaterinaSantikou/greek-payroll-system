import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
  ComposedChart, Area, AreaChart
} from "recharts";
import { 
  TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, 
  Users, Clock, Euro, AlertTriangle, Target, Filter,
  Calendar, MapPin, Award, DollarSign
} from "lucide-react";

interface OvertimeData {
  department: string;
  regularHours: number;
  overtimeHours: number;
  cost: number;
  employees: number;
  spike?: boolean;
}

interface CostData {
  month: string;
  department: string;
  laborCost: number;
  occupancy: number;
  revenue: number;
  efficiency: number;
}

interface HeatmapData {
  day: string;
  hour: number;
  overtimeHours: number;
  cost: number;
  department: string;
}

interface DrillDownData {
  employeeName: string;
  role: string;
  overtimeHours: number;
  cost: number;
  reason: string;
}

export default function VisualAnalytics() {
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [drillDownData, setDrillDownData] = useState<DrillDownData[] | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Sample analytics data - in production this would come from API
  const overtimeData: OvertimeData[] = [
    { department: "Front Office", regularHours: 1280, overtimeHours: 156, cost: 3850, employees: 8, spike: true },
    { department: "Housekeeping", regularHours: 2240, overtimeHours: 89, cost: 2180, employees: 14 },
    { department: "F&B", regularHours: 1920, overtimeHours: 234, cost: 5760, employees: 12, spike: true },
    { department: "Maintenance", regularHours: 640, overtimeHours: 45, cost: 1350, employees: 4 },
    { department: "Spa", regularHours: 960, overtimeHours: 23, cost: 690, employees: 6 },
  ];

  const costEfficiencyData: CostData[] = [
    { month: "Jan", department: "Hotel", laborCost: 145000, occupancy: 68, revenue: 285000, efficiency: 1.96 },
    { month: "Feb", department: "Hotel", laborCost: 142000, occupancy: 72, revenue: 295000, efficiency: 2.08 },
    { month: "Mar", department: "Hotel", laborCost: 158000, occupancy: 85, revenue: 342000, efficiency: 2.16 },
    { month: "Apr", department: "Hotel", laborCost: 162000, occupancy: 89, revenue: 368000, efficiency: 2.27 },
    { month: "May", department: "Hotel", laborCost: 168000, occupancy: 92, revenue: 385000, efficiency: 2.29 },
  ];

  const heatmapData: HeatmapData[] = [
    { day: "Mon", hour: 6, overtimeHours: 2.5, cost: 75, department: "Housekeeping" },
    { day: "Mon", hour: 14, overtimeHours: 4.2, cost: 126, department: "F&B" },
    { day: "Mon", hour: 22, overtimeHours: 3.1, cost: 93, department: "Front Office" },
    { day: "Tue", hour: 6, overtimeHours: 1.8, cost: 54, department: "Housekeeping" },
    { day: "Tue", hour: 14, overtimeHours: 5.5, cost: 165, department: "F&B" },
    { day: "Wed", hour: 14, overtimeHours: 6.2, cost: 186, department: "F&B" },
    { day: "Thu", hour: 22, overtimeHours: 4.8, cost: 144, department: "Front Office" },
    { day: "Fri", hour: 14, overtimeHours: 7.1, cost: 213, department: "F&B" },
    { day: "Fri", hour: 22, overtimeHours: 5.4, cost: 162, department: "Front Office" },
    { day: "Sat", hour: 14, overtimeHours: 8.5, cost: 255, department: "F&B" },
    { day: "Sun", hour: 14, overtimeHours: 6.8, cost: 204, department: "F&B" },
  ];

  const handleOvertimeClick = (data: any) => {
    if (data && data.spike) {
      // Drill down into specific department
      const drillDown: DrillDownData[] = [
        { employeeName: "Maria Papadopoulou", role: "Senior Receptionist", overtimeHours: 12.5, cost: 375, reason: "Guest checkout delays" },
        { employeeName: "Dimitrios Kostas", role: "Night Manager", overtimeHours: 8.0, cost: 280, reason: "Late night events" },
        { employeeName: "Elena Christou", role: "Receptionist", overtimeHours: 6.5, cost: 195, reason: "Staff shortage coverage" },
        { employeeName: "Yannis Dimitriou", role: "Concierge", overtimeHours: 4.2, cost: 126, reason: "VIP guest assistance" },
      ];
      setDrillDownData(drillDown);
      setSelectedMetric(`${data.department} Overtime Contributors`);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Visual Analytics</h2>
          <p className="text-muted-foreground">
            Interactive charts and drill-down analytics for labor cost optimization
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="fo">Front Office</SelectItem>
              <SelectItem value="hk">Housekeeping</SelectItem>
              <SelectItem value="fb">F&B</SelectItem>
              <SelectItem value="maint">Maintenance</SelectItem>
              <SelectItem value="spa">Spa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overtime" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overtime">Overtime Heatmap</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="efficiency">Labor Efficiency</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="overtime" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">
                  Overtime by Department
                </CardTitle>
                <Badge variant="outline" className="text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  2 Spikes Detected
                </Badge>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overtimeData} onClick={handleOvertimeClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value} hours`, 
                        name === 'overtimeHours' ? 'Overtime' : 'Regular'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="regularHours" fill="#8884d8" name="Regular Hours" />
                    <Bar 
                      dataKey="overtimeHours" 
                      fill="#82ca9d" 
                      name="Overtime Hours"
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-sm text-muted-foreground mt-2">
                  Click on red bars to drill down into overtime contributors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Overtime Cost Impact
                </CardTitle>
                <CardDescription>
                  Monthly overtime costs by department
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={overtimeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ department, cost }) => `${department}: €${cost}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                    >
                      {overtimeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`€${value}`, 'Overtime Cost']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Drill-down modal/section */}
          {drillDownData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {selectedMetric}
                </CardTitle>
                <CardDescription>
                  Individual employee contributions to overtime spike
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {drillDownData.map((employee, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{employee.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{employee.role}</div>
                        <div className="text-sm text-muted-foreground mt-1">{employee.reason}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{employee.overtimeHours}h</div>
                        <div className="text-sm text-muted-foreground">€{employee.cost}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setDrillDownData(null)}
                >
                  Close Drill-down
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Overtime Heatmap - Weekly Pattern
              </CardTitle>
              <CardDescription>
                Overtime spikes by day and hour - darker colors indicate higher costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart data={heatmapData}>
                  <CartesianGrid />
                  <XAxis dataKey="day" />
                  <YAxis dataKey="hour" />
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${props.payload.overtimeHours}h (€${props.payload.cost})`,
                      props.payload.department
                    ]}
                  />
                  <Scatter 
                    dataKey="cost" 
                    fill="#ff6b6b"
                    fillOpacity={0.7}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Labor Cost vs Occupancy Correlation
              </CardTitle>
              <CardDescription>
                Tracking labor efficiency relative to hotel occupancy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={costEfficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="laborCost" fill="#8884d8" name="Labor Cost (€)" />
                  <Line yAxisId="right" type="monotone" dataKey="occupancy" stroke="#ff7300" name="Occupancy %" />
                  <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#00ff00" name="Revenue per € Labor" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labor Efficiency</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.29</div>
                <p className="text-xs text-muted-foreground">
                  Revenue per € labor cost
                </p>
                <div className="text-xs text-green-600 flex items-center mt-2">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +8.2% from last month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost per Occupied Room</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€48.50</div>
                <p className="text-xs text-muted-foreground">
                  Labor cost per room night
                </p>
                <div className="text-xs text-red-600 flex items-center mt-2">
                  <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
                  +2.1% from last month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overtime Ratio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12.4%</div>
                <p className="text-xs text-muted-foreground">
                  OT hours / Total hours
                </p>
                <div className="text-xs text-orange-600 flex items-center mt-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Above target (10%)
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Department Efficiency Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={costEfficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="efficiency" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current OT Hours</CardTitle>
                <Clock className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">23.5h</div>
                <p className="text-xs text-muted-foreground">
                  Active overtime today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff on Duty</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47/52</div>
                <p className="text-xs text-muted-foreground">
                  Scheduled vs Present
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Labor Cost</CardTitle>
                <Euro className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€4,285</div>
                <p className="text-xs text-muted-foreground">
                  Running total today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">3</div>
                <p className="text-xs text-muted-foreground">
                  Active cost alerts
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Real-time Labor Cost Monitoring
              </CardTitle>
              <CardDescription>
                Live tracking of labor costs throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-medium">F&B Department - Overtime Alert</div>
                      <div className="text-sm text-muted-foreground">4 employees exceeding 8-hour limit</div>
                    </div>
                  </div>
                  <Badge variant="destructive">Critical</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <div>
                      <div className="font-medium">Housekeeping - Staff Shortage</div>
                      <div className="text-sm text-muted-foreground">2 staff called in sick, overtime likely</div>
                    </div>
                  </div>
                  <Badge variant="secondary">Warning</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Front Office - Efficiency High</div>
                      <div className="text-sm text-muted-foreground">Team completing tasks 15% faster today</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-600">Good</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}