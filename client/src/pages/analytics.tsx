import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart3, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  MapPin,
  DollarSign,
  Target
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface LiveOccupancyData {
  propertyId: string;
  propertyName: string;
  departments: Array<{
    department: string;
    totalEmployees: number;
    onSite: number;
    onBreak: number;
    onLunch: number;
    offSite: number;
    employees: Array<{
      employeeId: string;
      employeeName: string;
      status: string;
      lastPunchTime: string;
      shiftStart?: string;
      expectedShiftEnd?: string;
      location?: string;
    }>;
  }>;
}

interface LaborCostData {
  propertyId: string;
  propertyName: string;
  forecastDate: string;
  totalScheduledHours: number;
  totalProjectedHours: number;
  totalBaseCost: number;
  totalOvertimeCost: number;
  totalCost: number;
  variancePercentage: number;
  departments: Array<{
    department: string;
    scheduledHours: number;
    projectedHours: number;
    baseCost: number;
    overtimeCost: number;
    totalCost: number;
    variance: number;
  }>;
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<string>("PRINCESS-FO");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [forecastDate, setForecastDate] = useState<Date>(new Date());

  // Live Occupancy Query
  const { data: occupancyData, isLoading: occupancyLoading } = useQuery<LiveOccupancyData[]>({
    queryKey: ["/api/analytics/live-occupancy", selectedProperty],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Labor Cost Forecast Query
  const { data: laborCostData, isLoading: laborCostLoading } = useQuery<LaborCostData>({
    queryKey: ["/api/analytics/labor-cost-forecast", selectedProperty, forecastDate.toISOString()],
    enabled: isAuthenticated && !!selectedProperty && !!forecastDate,
  });

  // Overtime Heatmap Query
  const { data: overtimeData, isLoading: overtimeLoading } = useQuery({
    queryKey: ["/api/analytics/overtime-heatmap", selectedProperty, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    enabled: isAuthenticated && !!selectedProperty && !!dateRange.from && !!dateRange.to,
  });

  // Compliance KPIs Query
  const { data: complianceData, isLoading: complianceLoading } = useQuery({
    queryKey: ["/api/analytics/compliance-kpis", selectedProperty, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    enabled: isAuthenticated && !!selectedProperty && !!dateRange.from && !!dateRange.to,
  });

  // Variance Analysis Query
  const { data: varianceData, isLoading: varianceLoading } = useQuery({
    queryKey: ["/api/analytics/variance-analysis", selectedProperty, dateRange.from?.toISOString(), dateRange.to?.toISOString()],
    enabled: isAuthenticated && !!selectedProperty && !!dateRange.from && !!dateRange.to,
  });

  // Generate Demo Data Mutation
  const generateDemoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/analytics/generate-demo-data", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Demo Data Generated",
        description: "Analytics demo data has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate demo data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      on_site: "default",
      break: "secondary",
      lunch: "outline",
      off_site: "destructive",
    } as const;
    const colors = {
      on_site: "text-green-600",
      break: "text-yellow-600",
      lunch: "text-blue-600",
      off_site: "text-red-600",
    } as const;
    
    return {
      variant: variants[status as keyof typeof variants] || "outline",
      color: colors[status as keyof typeof colors] || "text-gray-600",
    };
  };

  const getOvertimeIntensity = (intensity: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    } as const;
    return colors[intensity as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Analytics & Reporting
            </h1>
            <p className="text-muted-foreground mt-2">
              Live occupancy tracking, labor cost forecasting, and compliance analytics
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
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/analytics"] })}
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
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRINCESS-FO">Princess Front Office</SelectItem>
                  <SelectItem value="PRINCESS-HOUSE">Princess Housekeeping</SelectItem>
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
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
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
                    onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">Forecast Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48 justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(forecastDate, "LLL dd, y")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={forecastDate}
                    onSelect={(date) => date && setForecastDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Live Occupancy */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Live Occupancy - Who's On Site
            </CardTitle>
          </CardHeader>
          <CardContent>
            {occupancyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : occupancyData && occupancyData.length > 0 ? (
              <div className="space-y-6">
                {occupancyData.map((property) => (
                  <div key={property.propertyId}>
                    <h3 className="text-lg font-semibold mb-4">{property.propertyName}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {property.departments.map((dept) => (
                        <Card key={dept.department}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">{dept.department}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-4 gap-2 mb-4">
                              <div className="text-center">
                                <div className="text-sm font-medium text-green-600">{dept.onSite}</div>
                                <div className="text-xs text-muted-foreground">On Site</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-yellow-600">{dept.onBreak}</div>
                                <div className="text-xs text-muted-foreground">Break</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-blue-600">{dept.onLunch}</div>
                                <div className="text-xs text-muted-foreground">Lunch</div>
                              </div>
                              <div className="text-center">
                                <div className="text-sm font-medium text-red-600">{dept.offSite}</div>
                                <div className="text-xs text-muted-foreground">Off Site</div>
                              </div>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {dept.employees.slice(0, 5).map((emp) => {
                                const statusStyle = getStatusBadge(emp.status);
                                return (
                                  <div key={emp.employeeId} className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{emp.employeeName}</span>
                                    <div className="flex items-center gap-2">
                                      {emp.location && (
                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                      )}
                                      <Badge variant={statusStyle.variant} className={statusStyle.color}>
                                        {emp.status.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })}
                              {dept.employees.length > 5 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  +{dept.employees.length - 5} more employees
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Occupancy Data</h3>
                <p className="text-muted-foreground mb-4">Generate demo data to see live occupancy analytics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Labor Cost Forecast */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Labor Cost Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            {laborCostLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : laborCostData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {laborCostData.totalScheduledHours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-muted-foreground">Scheduled Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {laborCostData.totalProjectedHours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-muted-foreground">Projected Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      €{laborCostData.totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                  </div>
                  <div className="text-center">
                    <div className={cn("text-2xl font-bold", 
                      laborCostData.variancePercentage > 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {laborCostData.variancePercentage > 0 ? "+" : ""}
                      {laborCostData.variancePercentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Variance</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {laborCostData.departments.map((dept) => (
                    <Card key={dept.department}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{dept.department}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Scheduled:</span>
                            <span className="font-medium">{dept.scheduledHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Projected:</span>
                            <span className="font-medium">{dept.projectedHours.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Base Cost:</span>
                            <span className="font-medium">€{dept.baseCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Overtime Cost:</span>
                            <span className="font-medium">€{dept.overtimeCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-medium">Total:</span>
                            <span className="font-bold">€{dept.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Forecast Data</h3>
                <p className="text-muted-foreground">Generate demo data to see labor cost forecasting</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Overtime Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overtimeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : overtimeData ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{overtimeData.summary?.totalOvertimeHours?.toFixed(1) || '0'}h</div>
                    <div className="text-sm text-muted-foreground">Total Overtime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{overtimeData.summary?.peakDepartment || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">Peak Department</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No overtime data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Compliance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {complianceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : complianceData ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {complianceData.kpis?.overallScore?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {complianceData.kpis?.erganiSubmissionSuccess?.toFixed(1) || '0'}%
                    </div>
                    <div className="text-sm text-muted-foreground">ERGANI Success</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No compliance data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Variance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {varianceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : varianceData ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {varianceData.summary?.onTrackEmployees || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">On Track</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {varianceData.summary?.criticalEmployees || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Critical Variance</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No variance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}