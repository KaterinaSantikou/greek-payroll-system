import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Shield, Database, FileText, Eye, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ComplianceAlert {
  alertId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  employeeId: string;
  propertyId?: string;
  message: string;
  details: any;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface ComplianceDashboard {
  realTimeStatus: {
    enabled: boolean;
    lastSubmission: string;
    successRate: number;
    pendingEvents: number;
  };
  alerts: ComplianceAlert[];
  erganiHealth: {
    totalEvents: number;
    successfulEvents: number;
    pendingEvents: number;
    quarantinedEvents: number;
    failedEvents: number;
    successRate: number;
    queueBacklog: number;
    isProcessing: boolean;
    lastActivity: string;
  };
  policyEnforcement: {
    digitalCardPolicy: {
      noPayrollDeductions: boolean;
      salaryProtection: boolean;
      reasonablePunchRequirements: boolean;
      alternativeMethodsAllowed: boolean;
    };
    maxHoursConfig: {
      daily: number;
      weekly: number;
    };
    restPeriods: {
      minBetweenShifts: number;
      maxContinuous: number;
    };
  };
  dataRetention: {
    config: {
      punchEvents: number;
      timesheets: number;
      auditLogs: number;
    };
    auditChainLength: number;
    lastAuditEntry: string;
  };
}

export default function CompliancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: dashboard, isLoading: dashboardLoading, error } = useQuery<ComplianceDashboard>({
    queryKey: ["/api/compliance/dashboard"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, resolution }: { alertId: string; resolution: string }) => {
      await apiRequest(`/api/compliance/alerts/${alertId}/resolve`, {
        method: "PUT",
        body: JSON.stringify({ resolution }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Alert Resolved",
        description: "The compliance alert has been resolved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/dashboard"] });
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
        description: "Failed to resolve alert. Please try again.",
        variant: "destructive",
      });
    },
  });

  const retryErganiMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest(`/api/compliance/ergani/retry/${eventId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Event Retried",
        description: "ERGANI event has been queued for retry.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/dashboard"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to retry ERGANI event. Please try again.",
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

  if (isLoading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Compliance Dashboard</h2>
          <p className="text-muted-foreground mb-4">
            {isUnauthorizedError(error) ? "Authentication required" : "Failed to load compliance data"}
          </p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No compliance data available</p>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      LOW: "outline",
      MEDIUM: "secondary",
      HIGH: "destructive",
      CRITICAL: "destructive",
    } as const;
    return variants[severity as keyof typeof variants] || "outline";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Clock className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Compliance Guardrails
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time Greek compliance monitoring and ERGANI II integration
            </p>
          </div>
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/compliance/dashboard"] })}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Real-time Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ERGANI Status</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboard.erganiHealth.successRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard.realTimeStatus.enabled ? 'Real-time enabled' : 'Batch mode'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events Processed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard.erganiHealth.totalEvents}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard.erganiHealth.successfulEvents} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Backlog</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboard.erganiHealth.pendingEvents}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboard.erganiHealth.isProcessing ? 'Processing...' : 'Idle'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboard.alerts.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Compliance violations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Alerts */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Compliance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                <p className="text-muted-foreground">No active compliance alerts</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.alerts.map((alert) => (
                  <div
                    key={alert.alertId}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{alert.type.replace(/_/g, ' ')}</h4>
                          <Badge variant={getSeverityBadge(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Employee: {alert.employeeId} • 
                          {alert.propertyId && ` Property: ${alert.propertyId} • `}
                          Created: {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const resolution = prompt("Enter resolution notes:");
                          if (resolution) {
                            resolveAlertMutation.mutate({ alertId: alert.alertId, resolution });
                          }
                        }}
                        disabled={resolveAlertMutation.isPending}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Policy Enforcement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Digital Work Card Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">No Payroll Deductions</span>
                <Badge variant={dashboard.policyEnforcement.digitalCardPolicy.noPayrollDeductions ? "default" : "destructive"}>
                  {dashboard.policyEnforcement.digitalCardPolicy.noPayrollDeductions ? "Enforced" : "Disabled"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Salary Protection</span>
                <Badge variant={dashboard.policyEnforcement.digitalCardPolicy.salaryProtection ? "default" : "destructive"}>
                  {dashboard.policyEnforcement.digitalCardPolicy.salaryProtection ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Alternative Methods Allowed</span>
                <Badge variant={dashboard.policyEnforcement.digitalCardPolicy.alternativeMethodsAllowed ? "default" : "destructive"}>
                  {dashboard.policyEnforcement.digitalCardPolicy.alternativeMethodsAllowed ? "Yes" : "No"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Working Time Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Max Daily Hours</span>
                <Badge variant="outline">
                  {dashboard.policyEnforcement.maxHoursConfig.daily}h
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Max Weekly Hours</span>
                <Badge variant="outline">
                  {dashboard.policyEnforcement.maxHoursConfig.weekly}h
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Min Rest Between Shifts</span>
                <Badge variant="outline">
                  {Math.round(dashboard.policyEnforcement.restPeriods.minBetweenShifts / 60)}h
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Max Continuous Work</span>
                <Badge variant="outline">
                  {Math.round(dashboard.policyEnforcement.restPeriods.maxContinuous / 60)}h
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Retention & Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Retention & Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold">Retention Periods</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Punch Events:</span>
                    <span>{dashboard.dataRetention.config.punchEvents} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timesheets:</span>
                    <span>{dashboard.dataRetention.config.timesheets} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audit Logs:</span>
                    <span>{dashboard.dataRetention.config.auditLogs} years</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Audit Chain</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Chain Length:</span>
                    <span>{dashboard.dataRetention.auditChainLength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant="default">Immutable</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View Audit Log
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}