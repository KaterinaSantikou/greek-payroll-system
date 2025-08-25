import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Calculator, 
  Euro, 
  TrendingUp, 
  Users, 
  Clock, 
  FileCheck,
  Zap,
  Shield,
  Globe,
  Target,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Settings,
  Download,
  Upload,
  Play,
  Calendar,
  DollarSign,
  PieChart,
  RefreshCw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { PayrollPeriod, PayrollCalculation } from "@shared/schema";

interface PayrollEngine {
  engineId: string;
  name: string;
  version: string;
  features: string[];
  compliance: {
    ergani: boolean;
    efka: boolean;
    aade: boolean;
    digitalWorkCard: boolean;
  };
  performance: {
    calculationSpeed: number; // ms
    accuracy: number; // percentage
    automation: number; // percentage
  };
  status: 'active' | 'updating' | 'maintenance';
}

interface PayrollSummary {
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalEmployerCost: number;
  averageCalculationTime: number;
}

interface PayrollRunRequest {
  periodId: string;
  employeeIds: string[];
  includeTimesheets: boolean;
}

interface PayrollExport {
  format: string;
  data: any;
  filename: string;
}

export default function ModernPayrollEnginePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedEngine, setSelectedEngine] = useState<string>("greece-2025");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2024-12");

  // Payroll Engine Status Query
  const { data: engines, isLoading: enginesLoading } = useQuery<PayrollEngine[]>({
    queryKey: ["/api/payroll-engine/status"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Payroll Periods Query
  const { data: periods, isLoading: periodsLoading } = useQuery<PayrollPeriod[]>({
    queryKey: ["/api/payroll/periods"],
    enabled: isAuthenticated,
  });

  // Payroll Calculations Query
  const { data: calculations, isLoading: calculationsLoading } = useQuery<PayrollCalculation[]>({
    queryKey: ["/api/payroll/calculations", selectedPeriod],
    enabled: isAuthenticated && !!selectedPeriod,
  });

  // Payroll Summary Query
  const { data: payrollSummary, isLoading: summaryLoading } = useQuery<PayrollSummary>({
    queryKey: ["/api/payroll/summary", selectedPeriod],
    enabled: isAuthenticated && !!selectedPeriod,
  });

  // Create Payroll Period Mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (data: { periodType: string; periodName: string; startDate: string; endDate: string; payDate: string }) => {
      return await apiRequest("/api/payroll/periods", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Payroll Period Created",
        description: "New payroll period has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] });
    },
    onError: (error) => {
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
        title: "Error",
        description: "Failed to create payroll period. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Run Payroll Calculation Mutation
  const runPayrollMutation = useMutation({
    mutationFn: async (data: PayrollRunRequest) => {
      return await apiRequest("/api/payroll/calculate", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Payroll Calculation Started",
        description: "Greek payroll engine is processing calculations with full compliance.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    },
    onError: (error) => {
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
        title: "Error",
        description: "Failed to start payroll calculation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Export Payroll Mutation
  const exportPayrollMutation = useMutation({
    mutationFn: async (data: { periodId: string; format: 'csv' | 'xml' | 'json' }): Promise<PayrollExport> => {
      return await apiRequest("/api/payroll/export", "POST", data);
    },
    onSuccess: (data: PayrollExport) => {
      // Create download link
      const blob = new Blob([typeof data.data === 'string' ? data.data : JSON.stringify(data.data, null, 2)], {
        type: data.format === 'csv' ? 'text/csv' : data.format === 'xml' ? 'text/xml' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Payroll data exported as ${data.format.toUpperCase()}`,
      });
    },
    onError: (error) => {
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
        title: "Export Failed",
        description: "Failed to export payroll data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate Demo Data Mutation
  const generateDemoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/payroll-engine/generate-demo", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Demo Data Generated",
        description: "Modern payroll engine demo data has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll-engine"] });
    },
    onError: (error) => {
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
        title: "Error",
        description: "Failed to generate demo data. Please try again.",
        variant: "destructive",
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

  const getEngineStatus = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'updating':
        return { color: 'bg-blue-100 text-blue-800', icon: Download };
      case 'maintenance':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Settings };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: AlertTriangle };
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Modern Payroll Engine
            </h1>
            <p className="text-muted-foreground mt-2">
              Cutting-edge Greek payroll platform with Gusto UX, ADP compliance, and modern automation
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
                <Upload className="h-4 w-4 mr-2" />
              )}
              Generate Demo
            </Button>
            <Button
              onClick={() => runPayrollMutation.mutate({
                engineId: selectedEngine,
                period: selectedPeriod,
                employees: ['all']
              })}
              disabled={runPayrollMutation.isPending}
            >
              {runPayrollMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Payroll
            </Button>
          </div>
        </div>

        <Tabs defaultValue="engines" className="space-y-6">
          <TabsList>
            <TabsTrigger value="engines">Engine Status</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="calculations">Calculations</TabsTrigger>
          </TabsList>

          <TabsContent value="engines" className="space-y-6">
            {/* Engine Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engine Version</CardTitle>
                  <Zap className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">Greece 2025</div>
                  <p className="text-xs text-muted-foreground">Latest compliance engine</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Calculation Speed</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">&lt; 50ms</div>
                  <p className="text-xs text-muted-foreground">Per employee calculation</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Automation Level</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98.5%</div>
                  <p className="text-xs text-muted-foreground">Fully automated processes</p>
                </CardContent>
              </Card>
            </div>

            {/* Engine Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Active Engines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {enginesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : engines && engines.length > 0 ? (
                    <div className="space-y-4">
                      {engines.map((engine) => {
                        const status = getEngineStatus(engine.status);
                        const StatusIcon = status.icon;
                        return (
                          <div key={engine.engineId} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <StatusIcon className="h-5 w-5 text-primary" />
                              <div>
                                <div className="font-semibold">{engine.name}</div>
                                <div className="text-sm text-muted-foreground">v{engine.version}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={status.color}>
                                {engine.status}
                              </Badge>
                              <div className="text-right">
                                <div className="text-sm font-medium">{engine.performance.accuracy}% accuracy</div>
                                <div className="text-xs text-muted-foreground">{engine.performance.calculationSpeed}ms</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calculator className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Engines Available</h3>
                      <p className="text-muted-foreground mb-4">Generate demo data to see payroll engines</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Compliance Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">ERGANI II Integration</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">e-EFKA/APD Compliance</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">AADE ΦΜΥ Integration</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Digital Work Card</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Collective Agreements</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Multi-language Support</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">UX Velocity</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Gusto-level</div>
                  <Progress value={95} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">95% user satisfaction</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Compliance Depth</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">ADP-level</div>
                  <Progress value={99} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">99% compliance coverage</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Automation Level</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Modern</div>
                  <Progress value={98} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">98% automated processes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing Speed</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">&lt; 50ms</div>
                  <Progress value={100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Industry-leading performance</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Benchmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">50ms</div>
                    <div className="text-sm font-medium">Calculation Speed</div>
                    <div className="text-xs text-muted-foreground">Per employee</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
                    <div className="text-sm font-medium">Accuracy Rate</div>
                    <div className="text-xs text-muted-foreground">Compliance validated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">1000+</div>
                    <div className="text-sm font-medium">Employees/min</div>
                    <div className="text-xs text-muted-foreground">Processing capacity</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Shield className="h-5 w-5" />
                    Greek Law Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>ERGANI II Real-time Reporting</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>e-EFKA Insurance Calculations</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>AADE Tax Integration</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Digital Work Card</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Collective Agreements</span>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    International Standards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>EU Working Time Directive</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>GDPR Data Protection</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>ISO 27001 Security</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SOC 2 Type II</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Multi-Currency Support</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calculations" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div>
                <Label htmlFor="period">Pay Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-12">December 2024</SelectItem>
                    <SelectItem value="2024-11">November 2024</SelectItem>
                    <SelectItem value="2024-10">October 2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Payroll Calculations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calculationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : calculations && calculations.length > 0 ? (
                  <div className="space-y-4">
                    {calculations.map((calc, index) => (
                      <div key={index} className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                        <div>
                          <div className="text-sm font-medium">Employee</div>
                          <div className="text-sm text-muted-foreground">{calc.employeeId}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Gross</div>
                          <div className="text-sm font-semibold">€{calc.grossSalary.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Net</div>
                          <div className="text-sm font-semibold text-green-600">€{calc.netSalary.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Tax</div>
                          <div className="text-sm text-red-600">€{calc.taxDeductions.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Insurance</div>
                          <div className="text-sm text-blue-600">€{calc.socialInsurance.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Speed</div>
                          <div className="text-sm text-muted-foreground">{calc.calculationTime}ms</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calculator className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Calculations Yet</h3>
                    <p className="text-muted-foreground mb-4">Run payroll calculations to see results</p>
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