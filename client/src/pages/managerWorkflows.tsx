import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/lib/queryClient";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download, 
  Shield, 
  FileText, 
  BarChart3,
  TrendingUp,
  Users,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Upload,
  Search
} from "lucide-react";

interface ExceptionValidation {
  exceptionId: string;
  employeeId: string;
  date: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  validatedBy?: string;
  validatedAt?: string;
  reason?: string;
  notes?: string;
}

interface OvertimeApproval {
  approvalId: string;
  employeeId: string;
  date: string;
  requestedHours: number;
  approvedHours?: number;
  earningsCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: string;
  reason: string;
}

interface ReconciliationReport {
  reportId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  generatedAt: string;
  totalHoursByCode: Record<string, number>;
  priorPeriodComparison: Record<string, number>;
  varianceByDepartment: Record<string, Record<string, number>>;
  erganiSubmissionRate: number;
  issues: Array<{
    type: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    affectedEmployees: string[];
  }>;
}

export default function ManagerWorkflows() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState({
    start: '2025-08-01',
    end: '2025-08-31'
  });
  const [managerId] = useState('MGR_102'); // In real app, this would come from auth

  // Workflow metrics query
  const { data: workflowMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/workflow/metrics"],
    refetchInterval: 30000,
  });

  // Exception validations query
  const { data: exceptionValidations, isLoading: exceptionsLoading } = useQuery<ExceptionValidation[]>({
    queryKey: ["/api/workflow/exception-validations", selectedDate],
  });

  // Overtime approvals query
  const { data: overtimeApprovals, isLoading: overtimeLoading } = useQuery<OvertimeApproval[]>({
    queryKey: ["/api/workflow/overtime-approvals", "PENDING"],
  });

  // ERGANI status query
  const { data: erganiStatus } = useQuery({
    queryKey: ["/api/workflow/ergani-status", selectedDate],
  });

  // Reconciliation reports query
  const { data: reconciliationReports } = useQuery<ReconciliationReport[]>({
    queryKey: ["/api/workflow/reconciliation-reports"],
  });

  // Validate exceptions mutation
  const validateExceptionsMutation = useMutation({
    mutationFn: async (data: { date: string; managerId: string }) => {
      const response = await fetch("/api/workflow/validate-exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/exception-validations"] });
    },
  });

  // Approve exception mutation
  const approveExceptionMutation = useMutation({
    mutationFn: async (data: { exceptionId: string; status: string; managerId: string; reason?: string }) => {
      const response = await fetch("/api/workflow/approve-exception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/exception-validations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/metrics"] });
    },
  });

  // Approve overtime mutation
  const approveOvertimeMutation = useMutation({
    mutationFn: async (data: { approvalId: string; status: string; managerId: string; approvedHours?: number; justification?: string }) => {
      const response = await fetch("/api/workflow/approve-overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/overtime-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/metrics"] });
    },
  });

  // Lock timesheets mutation
  const lockTimesheetsMutation = useMutation({
    mutationFn: async (data: { payPeriodStart: string; payPeriodEnd: string; managerId: string }) => {
      const response = await fetch("/api/workflow/lock-timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/timesheet-locks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/metrics"] });
    },
  });

  // Generate reconciliation report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: { payPeriodStart: string; payPeriodEnd: string; managerId: string }) => {
      const response = await fetch("/api/workflow/reconciliation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/reconciliation-reports"] });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "secondary",
      APPROVED: "default",
      REJECTED: "destructive",
      OK: "default",
      ISSUES: "destructive"
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="flex items-center gap-1">
        {status === 'APPROVED' && <CheckCircle className="h-3 w-3" />}
        {status === 'PENDING' && <Clock className="h-3 w-3" />}
        {status === 'REJECTED' && <AlertCircle className="h-3 w-3" />}
        {status === 'OK' && <CheckCircle className="h-3 w-3" />}
        {status === 'ISSUES' && <AlertCircle className="h-3 w-3" />}
        {status}
      </Badge>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleValidateExceptions = () => {
    validateExceptionsMutation.mutate({
      date: selectedDate,
      managerId
    });
  };

  const handleApproveException = (exceptionId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    approveExceptionMutation.mutate({
      exceptionId,
      status,
      managerId,
      reason
    });
  };

  const handleApproveOvertime = (approvalId: string, status: 'APPROVED' | 'REJECTED', approvedHours?: number) => {
    approveOvertimeMutation.mutate({
      approvalId,
      status,
      managerId,
      approvedHours
    });
  };

  const handleLockTimesheets = () => {
    lockTimesheetsMutation.mutate({
      payPeriodStart: selectedPayPeriod.start,
      payPeriodEnd: selectedPayPeriod.end,
      managerId
    });
  };

  const handleGenerateReport = () => {
    generateReportMutation.mutate({
      payPeriodStart: selectedPayPeriod.start,
      payPeriodEnd: selectedPayPeriod.end,
      managerId
    });
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Manager & Payroll Workflows</h1>
        <p className="text-lg text-gray-600 mt-2">
          Daily operations and end-of-period processing with audit capabilities
        </p>
      </div>

      {/* Workflow Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Exceptions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(workflowMetrics as any)?.pendingExceptions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require validation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(workflowMetrics as any)?.pendingOvertimeApprovals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Timesheets</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(workflowMetrics as any)?.lockedTimesheets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(workflowMetrics as any)?.exportedTimesheets || 0} exported
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ERGANI Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {erganiStatus ? getStatusBadge((erganiStatus as any).status) : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              {(erganiStatus as any)?.submissionRate?.toFixed(1) || 0}% success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Workflow Tabs */}
      <Tabs defaultValue="daily-workflow" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily-workflow">Daily Workflow</TabsTrigger>
          <TabsTrigger value="end-of-period">End of Period</TabsTrigger>
          <TabsTrigger value="reports-audit">Reports & Audit</TabsTrigger>
        </TabsList>

        {/* Daily Workflow Tab */}
        <TabsContent value="daily-workflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Operations</CardTitle>
              <CardDescription>
                Validate exceptions → approve/reject OT → ensure ERGANI status = OK
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work-date">Date</Label>
                  <Input
                    id="work-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleValidateExceptions}
                  disabled={validateExceptionsMutation.isPending}
                  className="mt-8"
                >
                  {validateExceptionsMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Validate Exceptions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Exception Validations */}
          <Card>
            <CardHeader>
              <CardTitle>Exception Validations</CardTitle>
              <CardDescription>
                Review and approve/reject attendance exceptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {exceptionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : exceptionValidations && exceptionValidations.length > 0 ? (
                <div className="space-y-4">
                  {exceptionValidations.map((validation) => (
                    <div key={validation.exceptionId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{validation.type.replace('_', ' ')}</Badge>
                          {getStatusBadge(validation.status)}
                          <span className="font-medium">Employee {validation.employeeId.slice(-6)}</span>
                        </div>
                        <span className="text-sm text-gray-600">{validation.date}</span>
                      </div>
                      
                      {validation.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveException(validation.exceptionId, 'APPROVED')}
                            disabled={approveExceptionMutation.isPending}
                          >
                            <ThumbsUp className="mr-2 h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveException(validation.exceptionId, 'REJECTED')}
                            disabled={approveExceptionMutation.isPending}
                          >
                            <ThumbsDown className="mr-2 h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      )}
                      
                      {validation.status !== 'PENDING' && (
                        <div className="text-sm text-gray-600">
                          {validation.status} by {validation.validatedBy} 
                          {validation.validatedAt && ` on ${new Date(validation.validatedAt).toLocaleString()}`}
                          {validation.reason && ` - ${validation.reason}`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No exceptions found for {selectedDate}. All attendance appears normal.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Overtime Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Overtime Approvals</CardTitle>
              <CardDescription>
                Pending overtime requests requiring manager approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overtimeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : overtimeApprovals && overtimeApprovals.length > 0 ? (
                <div className="space-y-4">
                  {overtimeApprovals.map((approval) => (
                    <div key={approval.approvalId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{approval.earningsCode}</Badge>
                          {getStatusBadge(approval.status)}
                          <span className="font-medium">Employee {approval.employeeId.slice(-6)}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {approval.requestedHours}h requested for {approval.date}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        Requested by {approval.requestedBy} - {approval.reason}
                      </div>
                      
                      {approval.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveOvertime(approval.approvalId, 'APPROVED', approval.requestedHours)}
                            disabled={approveOvertimeMutation.isPending}
                          >
                            <ThumbsUp className="mr-2 h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveOvertime(approval.approvalId, 'REJECTED')}
                            disabled={approveOvertimeMutation.isPending}
                          >
                            <ThumbsDown className="mr-2 h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No pending overtime approvals. All requests have been processed.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* End of Period Tab */}
        <TabsContent value="end-of-period" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>End of Period Processing</CardTitle>
              <CardDescription>
                Lock timesheets → export to payroll → reconciliation report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period-start">Pay Period Start</Label>
                  <Input
                    id="period-start"
                    type="date"
                    value={selectedPayPeriod.start}
                    onChange={(e) => setSelectedPayPeriod(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-end">Pay Period End</Label>
                  <Input
                    id="period-end"
                    type="date"
                    value={selectedPayPeriod.end}
                    onChange={(e) => setSelectedPayPeriod(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={handleLockTimesheets}
                  disabled={lockTimesheetsMutation.isPending}
                >
                  {lockTimesheetsMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="mr-2 h-4 w-4" />
                  )}
                  Lock Timesheets
                </Button>
                
                <Button 
                  onClick={handleGenerateReport}
                  disabled={generateReportMutation.isPending}
                  variant="outline"
                >
                  {generateReportMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BarChart3 className="mr-2 h-4 w-4" />
                  )}
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports & Audit Tab */}
        <TabsContent value="reports-audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Reports</CardTitle>
              <CardDescription>
                Variance analysis and ERGANI compliance monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reconciliationReports && reconciliationReports.length > 0 ? (
                <div className="space-y-4">
                  {reconciliationReports.map((report) => (
                    <div key={report.reportId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">Report #{report.reportId.slice(-8)}</Badge>
                          <span className="font-medium">
                            {report.payPeriodStart} to {report.payPeriodEnd}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          ERGANI: {report.erganiSubmissionRate.toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Total Hours by Code</div>
                          {Object.entries(report.totalHoursByCode).map(([code, hours]) => (
                            <div key={code} className="flex justify-between">
                              <span>{code}:</span>
                              <span>{hours.toFixed(1)}h</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="font-medium">Prior Period</div>
                          {Object.entries(report.priorPeriodComparison).map(([code, hours]) => (
                            <div key={code} className="flex justify-between">
                              <span>{code}:</span>
                              <span>{hours.toFixed(1)}h</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="font-medium">Issues ({report.issues.length})</div>
                          {report.issues.slice(0, 3).map((issue, index) => (
                            <Alert key={index} className={`mt-2 p-2 ${getSeverityColor(issue.severity)}`}>
                              <AlertDescription className="text-xs">
                                {issue.description}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No reconciliation reports found. Generate a report for the current period.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}