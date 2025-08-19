import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { 
  User, Clock, FileText, Calendar, Edit, Download, CheckCircle, AlertCircle,
  Euro, Timer, Coffee, MapPin, Camera, Upload, TrendingUp, BarChart3,
  Eye, History, Smartphone, Award, Target, DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface PaycheckTimelineItem {
  paycheckId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  grossPay: number;
  netPay: number;
  taxWithheld: number;
  efkaContributions: number;
  status: string;
  payslipData: any;
}

interface WorkCardLog {
  logId: string;
  workDate: string;
  clockInTime: string;
  clockOutTime: string;
  totalHours: number;
  breakMinutes: number;
  overtimeHours: number;
  location: string;
  clockMethod: string;
  erganiSyncStatus: string;
  status: string;
}

interface CorrectionRequest {
  requestId: string;
  workCardLogId: string;
  requestType: string;
  originalValue: string;
  requestedValue: string;
  reason: string;
  photoEvidence?: string;
  status: string;
  createdAt: string;
}

export default function EmployeeSelfServicePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [correctionDialog, setCorrectionDialog] = useState({ 
    open: false, 
    logId: '', 
    type: '',
    originalValue: '',
    workDate: ''
  });
  const [correctionForm, setCorrectionForm] = useState({
    requestedValue: '',
    reason: '',
    photoEvidence: ''
  });

  // Employee Dashboard Data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/self-service/dashboard'],
  });

  // Paycheck Timeline Data
  const { data: paycheckTimeline = [], isLoading: paycheckLoading } = useQuery({
    queryKey: ['/api/self-service/paycheck-timeline', selectedYear],
  });

  // Digital Work Card Logs
  const { data: workCardLogs = [], isLoading: workCardLoading } = useQuery({
    queryKey: ['/api/self-service/work-card-logs', selectedMonth],
  });

  // Time Correction Requests
  const { data: correctionRequests = [], isLoading: correctionsLoading } = useQuery({
    queryKey: ['/api/self-service/correction-requests'],
  });

  // Current Pay Period Details
  const { data: currentPayPeriod, isLoading: currentPeriodLoading } = useQuery({
    queryKey: ['/api/self-service/current-pay-period'],
  });

  // Submit Time Correction Mutation
  const correctionMutation = useMutation({
    mutationFn: (data: { 
      workCardLogId: string; 
      requestType: string; 
      originalValue: string;
      requestedValue: string; 
      reason: string; 
      photoEvidence?: string;
    }) => apiRequest('/api/self-service/time-correction', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time correction request submitted successfully"
      });
      setCorrectionDialog({ open: false, logId: '', type: '', originalValue: '', workDate: '' });
      setCorrectionForm({ requestedValue: '', reason: '', photoEvidence: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/self-service/correction-requests'] });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to submit correction request",
        variant: "destructive"
      });
    }
  });

  // File Upload for Photo Evidence
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      return apiRequest('/api/upload/photo-evidence', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (data: any) => {
      setCorrectionForm(prev => ({ ...prev, photoEvidence: data.url }));
      toast({
        title: "Success",
        description: "Photo uploaded successfully"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleSubmitCorrection = () => {
    if (!correctionForm.requestedValue || !correctionForm.reason) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    correctionMutation.mutate({
      workCardLogId: correctionDialog.logId,
      requestType: correctionDialog.type,
      originalValue: correctionDialog.originalValue,
      requestedValue: correctionForm.requestedValue,
      reason: correctionForm.reason,
      photoEvidence: correctionForm.photoEvidence
    });
  };

  const renderPaycheckTimeline = () => {
    if (paycheckLoading) return <div>Loading paycheck timeline...</div>;

    return (
      <div className="space-y-6">
        {/* Year Selector */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Paycheck Timeline</h3>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2024, 2023].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeline Visualization */}
        <div className="space-y-4">
          {paycheckTimeline.map((paycheck: PaycheckTimelineItem, index: number) => (
            <Card key={paycheck.paycheckId} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      {format(parseISO(paycheck.payPeriodStart), 'MMM dd')} - {format(parseISO(paycheck.payPeriodEnd), 'MMM dd, yyyy')}
                    </CardTitle>
                    <CardDescription>
                      Paid on {format(parseISO(paycheck.payDate), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <Badge variant={paycheck.status === 'paid' ? 'default' : 'secondary'}>
                    {paycheck.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Gross Pay</p>
                    <p className="text-lg font-semibold text-green-600">€{paycheck.grossPay.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tax Withheld</p>
                    <p className="text-lg font-medium text-red-600">-€{paycheck.taxWithheld.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">EFKA Contributions</p>
                    <p className="text-lg font-medium text-red-600">-€{paycheck.efkaContributions.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Net Pay</p>
                    <p className="text-xl font-bold text-blue-600">€{paycheck.netPay.toFixed(2)}</p>
                  </div>
                </div>
                
                {/* Payslip Breakdown */}
                {paycheck.payslipData && (
                  <div className="mt-4 pt-4 border-t">
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                        View Detailed Breakdown
                      </summary>
                      <div className="mt-3 space-y-2 text-sm">
                        {paycheck.payslipData.earnings && (
                          <div>
                            <p className="font-medium">Earnings:</p>
                            {Object.entries(paycheck.payslipData.earnings).map(([key, value]) => (
                              <div key={key} className="flex justify-between ml-4">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <span>€{(value as number).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {paycheck.payslipData.deductions && (
                          <div>
                            <p className="font-medium">Deductions:</p>
                            {Object.entries(paycheck.payslipData.deductions).map(([key, value]) => (
                              <div key={key} className="flex justify-between ml-4">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <span>-€{(value as number).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
                
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Payslip
                  </Button>
                </div>
              </CardContent>
              
              {/* Timeline connector */}
              {index < paycheckTimeline.length - 1 && (
                <div className="absolute left-6 bottom-0 w-0.5 h-6 bg-gray-300 transform translate-y-full"></div>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderWorkCardLogs = () => {
    if (workCardLoading) return <div>Loading work card logs...</div>;

    return (
      <div className="space-y-6">
        {/* Month Selector */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Digital Work Card History</h3>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Work History
          </Button>
        </div>

        {/* Work Card Logs Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>ERGANI Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workCardLogs.map((log: WorkCardLog) => (
                <TableRow key={log.logId}>
                  <TableCell>{format(parseISO(log.workDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {log.clockInTime ? format(parseISO(log.clockInTime), 'HH:mm') : '-'}
                  </TableCell>
                  <TableCell>
                    {log.clockOutTime ? format(parseISO(log.clockOutTime), 'HH:mm') : '-'}
                  </TableCell>
                  <TableCell>{log.totalHours?.toFixed(2) || '0.00'}h</TableCell>
                  <TableCell className="text-orange-600">
                    {log.overtimeHours?.toFixed(2) || '0.00'}h
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {log.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      log.erganiSyncStatus === 'synced' ? 'default' : 
                      log.erganiSyncStatus === 'failed' ? 'destructive' : 'secondary'
                    }>
                      {log.erganiSyncStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCorrectionDialog({
                          open: true,
                          logId: log.logId,
                          type: 'clock_in',
                          originalValue: log.clockInTime || '',
                          workDate: log.workDate
                        })}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  const renderCorrectionRequests = () => {
    if (correctionsLoading) return <div>Loading correction requests...</div>;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Time Correction Requests</h3>
        
        <div className="space-y-4">
          {correctionRequests.map((request: CorrectionRequest) => (
            <Card key={request.requestId}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base capitalize">
                      {request.requestType.replace('_', ' ')} Correction
                    </CardTitle>
                    <CardDescription>
                      Submitted on {format(parseISO(request.createdAt), 'MMM dd, yyyy HH:mm')}
                    </CardDescription>
                  </div>
                  <Badge variant={
                    request.status === 'approved' ? 'default' :
                    request.status === 'rejected' ? 'destructive' : 'secondary'
                  }>
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Original Value</p>
                    <p className="font-medium">{request.originalValue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Requested Value</p>
                    <p className="font-medium">{request.requestedValue}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-sm text-gray-600">Reason</p>
                  <p className="font-medium">{request.reason}</p>
                </div>
                {request.photoEvidence && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">Photo Evidence</p>
                    <img 
                      src={request.photoEvidence} 
                      alt="Evidence" 
                      className="w-32 h-24 object-cover rounded border mt-1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Employee Self-Service</h1>
          <p className="mt-2 text-gray-600">Manage your paycheck timeline, work history, and time corrections</p>
        </div>

        {/* Dashboard Cards */}
        {!dashboardLoading && dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Current Month Gross</p>
                    <p className="text-2xl font-bold text-gray-900">€{dashboard.currentMonthGross || '0.00'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Hours This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.hoursThisMonth || '0'}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Timer className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Overtime Hours</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.overtimeHours || '0'}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.pendingRequests || '0'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Paycheck Timeline</TabsTrigger>
            <TabsTrigger value="workcard">Digital Work Card</TabsTrigger>
            <TabsTrigger value="corrections">Time Corrections</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            {renderPaycheckTimeline()}
          </TabsContent>

          <TabsContent value="workcard" className="space-y-6">
            {renderWorkCardLogs()}
          </TabsContent>

          <TabsContent value="corrections" className="space-y-6">
            {renderCorrectionRequests()}
          </TabsContent>
        </Tabs>

        {/* Time Correction Dialog */}
        <Dialog open={correctionDialog.open} onOpenChange={(open) => 
          setCorrectionDialog(prev => ({ ...prev, open }))
        }>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Time Correction</DialogTitle>
              <DialogDescription>
                Submit a correction request for {format(parseISO(correctionDialog.workDate || new Date().toISOString()), 'MMM dd, yyyy')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="correction-type">Correction Type</Label>
                <Select 
                  value={correctionDialog.type} 
                  onValueChange={(value) => setCorrectionDialog(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clock_in">Clock In Time</SelectItem>
                    <SelectItem value="clock_out">Clock Out Time</SelectItem>
                    <SelectItem value="break">Break Duration</SelectItem>
                    <SelectItem value="overtime">Overtime Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="original-value">Original Value</Label>
                <Input
                  value={correctionDialog.originalValue}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="requested-value">Requested Value</Label>
                <Input
                  value={correctionForm.requestedValue}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, requestedValue: e.target.value }))}
                  placeholder="Enter new value"
                />
              </div>

              <div>
                <Label htmlFor="reason">Reason for Correction</Label>
                <Textarea
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explain why this correction is needed"
                  rows={3}
                />
              </div>

              <div>
                <Label>Photo Evidence (Optional)</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {uploadMutation.isPending ? 'Uploading...' : 'Add Photo'}
                  </Button>
                  {correctionForm.photoEvidence && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setCorrectionDialog(prev => ({ ...prev, open: false }))}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitCorrection}
                disabled={correctionMutation.isPending}
              >
                {correctionMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}