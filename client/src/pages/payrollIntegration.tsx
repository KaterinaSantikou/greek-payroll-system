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
import { queryClient } from "@/lib/queryClient";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download, 
  Upload, 
  FileText, 
  Database,
  TrendingUp,
  Calculator,
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface TimesheetEntry {
  entryId: string;
  employeeNumber: string;
  employeeGuid: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  earningsCode: string;
  hours: number;
  units: number;
  rateBasis: string;
  costCenterAllocations: Array<{
    costCenterId: string;
    propertyId: string;
    hours: number;
    percentage: number;
  }>;
  propertyId: string;
  calculatedAt: string;
  lockedAt?: string;
  approvedBy?: string;
}

interface ExportBatch {
  batchId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  entries: TimesheetEntry[];
  totalHours: number;
  totalEmployees: number;
  exportFormat: string;
  exportedAt: string;
  status: 'PENDING' | 'EXPORTED' | 'FAILED';
  errorMessage?: string;
}

export default function PayrollIntegration() {
  const [selectedPayPeriod, setSelectedPayPeriod] = useState({
    start: '2025-08-01',
    end: '2025-08-31'
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'CSV' | 'XML' | 'API'>('CSV');

  // Health metrics query
  const { data: healthMetrics, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/payroll/health"],
    refetchInterval: 30000,
  });

  // Export batches query
  const { data: exportBatches, isLoading: batchesLoading } = useQuery<ExportBatch[]>({
    queryKey: ["/api/payroll/batches"],
    refetchInterval: 10000,
  });

  // Timesheet entries query
  const { data: timesheetEntries, isLoading: entriesLoading } = useQuery<TimesheetEntry[]>({
    queryKey: ["/api/payroll/timesheets", selectedPayPeriod.start, selectedPayPeriod.end],
    enabled: !!selectedPayPeriod.start && !!selectedPayPeriod.end,
  });

  // Employees query for selection
  const { data: employees } = useQuery<Array<{ employeeId: string; name: string }>>({
    queryKey: ["/api/employees"],
  });

  // Process timesheets mutation
  const processTimesheetsMutation = useMutation({
    mutationFn: async (data: { employeeId: string; startDate: string; endDate: string }) => {
      const response = await fetch("/api/payroll/process-timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/health"] });
    },
  });

  // Lock timesheet mutation
  const lockTimesheetMutation = useMutation({
    mutationFn: async (data: { employeeId: string; payPeriodStart: string; payPeriodEnd: string; approvedBy: string }) => {
      const response = await fetch("/api/payroll/lock-timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/health"] });
    },
  });

  // Create export batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: { payPeriodStart: string; payPeriodEnd: string; format: string }) => {
      const response = await fetch("/api/payroll/export-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/health"] });
    },
  });

  // Submit batch mutation
  const submitBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await fetch(`/api/payroll/submit-batch/${batchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/batches"] });
    },
  });

  // Demo batch mutation
  const demoBatchMutation = useMutation({
    mutationFn: async (payrollData: any) => {
      const response = await fetch("/api/payroll/demo-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payrollData),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/health"] });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "secondary",
      EXPORTED: "default",
      FAILED: "destructive"
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="flex items-center gap-1">
        {status === 'EXPORTED' && <CheckCircle className="h-3 w-3" />}
        {status === 'PENDING' && <Clock className="h-3 w-3" />}
        {status === 'FAILED' && <AlertCircle className="h-3 w-3" />}
        {status}
      </Badge>
    );
  };

  const handleProcessTimesheets = () => {
    if (!selectedEmployee) return;
    processTimesheetsMutation.mutate({
      employeeId: selectedEmployee,
      startDate: selectedPayPeriod.start,
      endDate: selectedPayPeriod.end
    });
  };

  const handleLockTimesheet = (employeeId: string) => {
    lockTimesheetMutation.mutate({
      employeeId,
      payPeriodStart: selectedPayPeriod.start,
      payPeriodEnd: selectedPayPeriod.end,
      approvedBy: "system" // In real app, this would be the current user
    });
  };

  const handleCreateExportBatch = () => {
    createBatchMutation.mutate({
      payPeriodStart: selectedPayPeriod.start,
      payPeriodEnd: selectedPayPeriod.end,
      format: exportFormat
    });
  };

  const handleProcessDemoPayroll = () => {
    const demoPayrollData = {
      "pay_period": "2025-08",
      "property_id": "PRINCESS",
      "records": [
        {
          "employee_number": "A12345",
          "lines": [
            {"code":"REG","hours":136.0,"cost_center":"PRINCESS-FO"},
            {"code":"NIGHT","hours":12.0,"cost_center":"PRINCESS-FO"},
            {"code":"OT1","hours":8.0,"cost_center":"PRINCESS-FO"}
          ],
          "notes": "Approved by MGR_102 on 2025-08-18"
        }
      ]
    };

    demoBatchMutation.mutate(demoPayrollData);
  };

  if (healthLoading) {
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
        <h1 className="text-4xl font-bold text-gray-900">Payroll Integration</h1>
        <p className="text-lg text-gray-600 mt-2">
          Timesheet processing, earnings calculation, and payroll export management
        </p>
      </div>

      {/* Health Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(healthMetrics as any)?.totalEntries || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(healthMetrics as any)?.pendingEntries || 0} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lock Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(healthMetrics as any)?.lockRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {(healthMetrics as any)?.lockedEntries || 0} locked entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Export Success</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(healthMetrics as any)?.exportSuccessRate?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {(healthMetrics as any)?.exportedBatches || 0} successful exports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              {(healthMetrics as any)?.isProcessing ? "Processing" : "Ready"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="timesheet-processing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timesheet-processing">Timesheet Processing</TabsTrigger>
          <TabsTrigger value="export-batches">Export Batches</TabsTrigger>
          <TabsTrigger value="earnings-codes">Earnings Codes</TabsTrigger>
        </TabsList>

        {/* Timesheet Processing Tab */}
        <TabsContent value="timesheet-processing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Demo Payroll Processing</CardTitle>
              <CardDescription>
                Process a sample payroll batch with Greek earnings codes for Princess Hotel property
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Sample payroll data: Employee A12345 at Princess Hotel with 136 regular hours, 12 night hours, and 8 overtime hours (Tier 1).
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleProcessDemoPayroll}
                disabled={demoBatchMutation.isPending}
                className="w-full"
                size="lg"
              >
                {demoBatchMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 h-4 w-4" />
                )}
                Process Demo Payroll Batch
              </Button>
              
              {demoBatchMutation.data && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Successfully processed {demoBatchMutation.data.entriesCreated} timesheet entries. 
                    Total hours: {demoBatchMutation.data.totalHours}. 
                    Batch ID: {demoBatchMutation.data.batchId?.slice(-8)}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Process Timesheets</CardTitle>
              <CardDescription>
                Convert punch events into timesheet entries with earnings codes and cost center allocation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-select">Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((employee) => (
                        <SelectItem key={employee.employeeId} value={employee.employeeId}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Pay Period Start</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={selectedPayPeriod.start}
                    onChange={(e) => setSelectedPayPeriod(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Pay Period End</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={selectedPayPeriod.end}
                    onChange={(e) => setSelectedPayPeriod(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleProcessTimesheets}
                disabled={!selectedEmployee || processTimesheetsMutation.isPending}
                className="w-full"
              >
                {processTimesheetsMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 h-4 w-4" />
                )}
                Process Timesheets
              </Button>
            </CardContent>
          </Card>

          {/* Timesheet Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Timesheet Entries</CardTitle>
              <CardDescription>
                Generated entries for the selected pay period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {entriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : timesheetEntries && timesheetEntries.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {timesheetEntries.map((entry) => (
                      <div key={entry.entryId} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{entry.earningsCode}</Badge>
                            <span className="font-medium">Employee #{entry.employeeNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{entry.hours.toFixed(2)} hours</span>
                            {entry.lockedAt ? (
                              <Badge variant="default">Locked</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLockTimesheet(entry.employeeGuid)}
                                disabled={lockTimesheetMutation.isPending}
                              >
                                Lock
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          Cost Center: {entry.costCenterAllocations[0]?.costCenterId || 'N/A'} | 
                          Rate Basis: {entry.rateBasis} | 
                          Property: {entry.propertyId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No timesheet entries found for the selected period. Process timesheets first.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Batches Tab */}
        <TabsContent value="export-batches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Export Batch</CardTitle>
              <CardDescription>
                Generate batches for payroll system export in multiple formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select value={exportFormat} onValueChange={(value: 'CSV' | 'XML' | 'API') => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CSV">CSV Format</SelectItem>
                      <SelectItem value="XML">XML Format</SelectItem>
                      <SelectItem value="API">API Submission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-start">Pay Period Start</Label>
                  <Input
                    id="batch-start"
                    type="date"
                    value={selectedPayPeriod.start}
                    onChange={(e) => setSelectedPayPeriod(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch-end">Pay Period End</Label>
                  <Input
                    id="batch-end"
                    type="date"
                    value={selectedPayPeriod.end}
                    onChange={(e) => setSelectedPayPeriod(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleCreateExportBatch}
                disabled={createBatchMutation.isPending}
                className="w-full"
              >
                {createBatchMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Create Export Batch
              </Button>
            </CardContent>
          </Card>

          {/* Export Batches List */}
          <Card>
            <CardHeader>
              <CardTitle>Export Batches</CardTitle>
              <CardDescription>
                Recent export batches with download and submission options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : exportBatches && exportBatches.length > 0 ? (
                <div className="space-y-4">
                  {exportBatches.map((batch) => (
                    <div key={batch.batchId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{batch.exportFormat}</Badge>
                          {getStatusBadge(batch.status)}
                          <span className="font-medium">Batch #{batch.batchId.slice(-8)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {batch.totalEmployees} employees, {batch.totalHours.toFixed(1)} hours
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        Pay Period: {batch.payPeriodStart} to {batch.payPeriodEnd} | 
                        Generated: {new Date(batch.exportedAt).toLocaleString()}
                      </div>

                      <div className="flex items-center gap-2">
                        {batch.status === 'PENDING' && batch.exportFormat === 'API' && (
                          <Button
                            size="sm"
                            onClick={() => submitBatchMutation.mutate(batch.batchId)}
                            disabled={submitBatchMutation.isPending}
                          >
                            <ExternalLink className="mr-2 h-3 w-3" />
                            Submit to Payroll
                          </Button>
                        )}
                        
                        {batch.exportFormat === 'CSV' && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/api/payroll/batch/${batch.batchId}/csv`} download>
                              <Download className="mr-2 h-3 w-3" />
                              Download CSV
                            </a>
                          </Button>
                        )}
                        
                        {batch.exportFormat === 'XML' && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/api/payroll/batch/${batch.batchId}/xml`} download>
                              <Download className="mr-2 h-3 w-3" />
                              Download XML
                            </a>
                          </Button>
                        )}
                      </div>

                      {batch.errorMessage && (
                        <Alert className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{batch.errorMessage}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No export batches found. Create a batch to get started.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Codes Tab */}
        <TabsContent value="earnings-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Greek Payroll Earnings Codes</CardTitle>
              <CardDescription>
                Standard earnings codes for Greek labor law compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-700">Regular & Overtime</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">REG</Badge>
                      <span className="text-sm">Regular Hours</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">OT1</Badge>
                      <span className="text-sm">Overtime Tier 1 (25% premium)</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">OT2</Badge>
                      <span className="text-sm">Overtime Tier 2 (50% premium)</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">OT3</Badge>
                      <span className="text-sm">Overtime Tier 3 (75% premium)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-700">Premium Hours</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">NIGHT</Badge>
                      <span className="text-sm">Night Shift Premium</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">SUNDAY</Badge>
                      <span className="text-sm">Sunday Premium</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">HOLIDAY</Badge>
                      <span className="text-sm">Holiday Premium</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">BREAK_UNPAID</Badge>
                      <span className="text-sm">Unpaid Break Deduction</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-700">Allowances</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">ALLOWANCE_FOOD</Badge>
                      <span className="text-sm">Food Allowance</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">ALLOWANCE_TRAVEL</Badge>
                      <span className="text-sm">Travel Allowance</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">ALLOWANCE_UNIFORM</Badge>
                      <span className="text-sm">Uniform Allowance</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">ALLOWANCE_POSITION</Badge>
                      <span className="text-sm">Position Allowance</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-gray-700">Leave Types</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">LEAVE_ANNUAL</Badge>
                      <span className="text-sm">Annual Leave</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">LEAVE_SICK</Badge>
                      <span className="text-sm">Sick Leave</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">LEAVE_PARENTAL</Badge>
                      <span className="text-sm">Parental Leave</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <Badge variant="outline">LEAVE_SPECIAL</Badge>
                      <span className="text-sm">Special Leave</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}