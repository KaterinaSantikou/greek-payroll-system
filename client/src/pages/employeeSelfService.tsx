import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { 
  User, 
  Clock, 
  FileText, 
  Calendar, 
  Edit, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Euro,
  Timer,
  Coffee,
  MapPin
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeSelfServicePage() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [correctionDialog, setCorrectionDialog] = useState({ open: false, punchId: '', originalTime: '' });
  const [correctionReason, setCorrectionReason] = useState('');
  
  // Mock employee ID - in real app would come from auth context
  const employeeId = "EMP_001";

  // Employee Dashboard Data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/self-service/employee', employeeId, 'dashboard'],
    queryFn: () => apiRequest(`/api/self-service/employee/${employeeId}/dashboard`)
  });

  // Payslip Data
  const { data: payslip, isLoading: payslipLoading } = useQuery({
    queryKey: ['/api/self-service/employee', employeeId, 'payslip', selectedPeriod],
    queryFn: () => apiRequest(`/api/self-service/employee/${employeeId}/payslip/${selectedPeriod}`)
  });

  // Year-End Certificate Data
  const { data: certificate, isLoading: certificateLoading } = useQuery({
    queryKey: ['/api/self-service/employee', employeeId, 'certificate', selectedYear],
    queryFn: () => apiRequest(`/api/self-service/employee/${employeeId}/certificate/${selectedYear}`)
  });

  // Punch History Data
  const { data: punchHistory, isLoading: punchHistoryLoading } = useQuery({
    queryKey: ['/api/self-service/employee', employeeId, 'punch-history'],
    queryFn: () => {
      const startDate = startOfMonth(new Date()).toISOString();
      const endDate = endOfMonth(new Date()).toISOString();
      return apiRequest(`/api/self-service/employee/${employeeId}/punch-history?startDate=${startDate}&endDate=${endDate}`);
    }
  });

  // Time Correction Mutation
  const timeCorrectionMutation = useMutation({
    mutationFn: (data: { punchId: string; newTimestamp: string; reason: string }) =>
      apiRequest(`/api/self-service/employee/${employeeId}/time-correction`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time correction request submitted successfully",
      });
      setCorrectionDialog({ open: false, punchId: '', originalTime: '' });
      setCorrectionReason('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit time correction request",
        variant: "destructive",
      });
    }
  });

  const handleTimeCorrection = () => {
    if (!correctionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for the correction",
        variant: "destructive",
      });
      return;
    }

    timeCorrectionMutation.mutate({
      punchId: correctionDialog.punchId,
      newTimestamp: correctionDialog.originalTime,
      reason: correctionReason
    });
  };

  const downloadPayslip = () => {
    // In a real app, this would download the PDF
    toast({
      title: "Download Started",
      description: `Payslip for ${selectedPeriod} is being downloaded`,
    });
  };

  const downloadCertificate = () => {
    // In a real app, this would download the PDF
    toast({
      title: "Download Started",
      description: `Year-end certificate for ${selectedYear} is being downloaded`,
    });
  };

  if (dashboardLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Self-Service</h1>
          <p className="text-muted-foreground">
            Access your payslips, certificates, hours, and leave information
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.currentPeriod?.hoursWorked || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{dashboard?.currentPeriod?.overtimeHours || 0} overtime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.currentPeriod?.leaveBalance?.annual || 0}h</div>
            <p className="text-xs text-muted-foreground">
              Annual leave remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.recentActivity?.lastPunchIn && !dashboard?.recentActivity?.lastPunchOut ? (
                <Badge variant="default" className="bg-green-500">On Duty</Badge>
              ) : (
                <Badge variant="secondary">Off Duty</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.recentActivity?.lastPunchIn && 
                `Since ${format(new Date(dashboard.recentActivity.lastPunchIn), 'HH:mm')}`
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboard?.recentActivity?.pendingExceptions || 0) + 
               (dashboard?.recentActivity?.pendingLeaveRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="payslips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="hours">Hours & Attendance</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Monthly Payslips</CardTitle>
                  <CardDescription>View and download your payslips</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="period">Period:</Label>
                  <Input
                    id="period"
                    type="month"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-40"
                  />
                  <Button onClick={downloadPayslip} disabled={payslipLoading}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {payslipLoading ? (
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
              ) : payslip ? (
                <div className="space-y-6">
                  {/* Payslip Summary */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Gross Wages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          €{payslip.grossWages.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Deductions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          €{(payslip.deductions.incomeTax + payslip.deductions.efkaEmployee + payslip.deductions.specialTax).toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Net Wages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          €{payslip.netWages.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Earnings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Basic Salary</span>
                          <span>€{payslip.basicSalary.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Food Allowance</span>
                          <span>€{payslip.allowances.food.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Transport Allowance</span>
                          <span>€{payslip.allowances.transport.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Position Allowance</span>
                          <span>€{payslip.allowances.position.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Regular Overtime</span>
                          <span>€{payslip.overtime.regular.toFixed(2)}</span>
                        </div>
                        {payslip.bonuses.christmas > 0 && (
                          <div className="flex justify-between font-medium text-green-600">
                            <span>Christmas Bonus</span>
                            <span>€{payslip.bonuses.christmas.toFixed(2)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Deductions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Income Tax (22%)</span>
                          <span>€{payslip.deductions.incomeTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>EFKA Employee (16%)</span>
                          <span>€{payslip.deductions.efkaEmployee.toFixed(2)}</span>
                        </div>
                        {payslip.deductions.specialTax > 0 && (
                          <div className="flex justify-between">
                            <span>Solidarity Tax</span>
                            <span>€{payslip.deductions.specialTax.toFixed(2)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No payslip data available for the selected period
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Year-End Certificates</CardTitle>
                  <CardDescription>Annual tax certificates for personal records</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="year">Year:</Label>
                  <Input
                    id="year"
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-24"
                    min="2020"
                    max={new Date().getFullYear()}
                  />
                  <Button onClick={downloadCertificate} disabled={certificateLoading}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {certificateLoading ? (
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
              ) : certificate ? (
                <div className="space-y-6">
                  {/* Certificate Summary */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Gross</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          €{certificate.totalGrossWages.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Tax Withheld</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          €{certificate.totalTaxWithheld.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">EFKA Contributions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          €{certificate.totalEfkaContributions.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Working Days</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          {certificate.totalWorkingDays}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Monthly Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead>Gross Wages</TableHead>
                            <TableHead>Tax Withheld</TableHead>
                            <TableHead>Working Days</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {certificate.monthlyBreakdown.map((month, index) => (
                            <TableRow key={index}>
                              <TableCell>{month.month}</TableCell>
                              <TableCell>€{month.grossWages.toFixed(2)}</TableCell>
                              <TableCell>€{month.taxWithheld.toFixed(2)}</TableCell>
                              <TableCell>{month.workingDays}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No certificate data available for the selected year
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Punch History</CardTitle>
              <CardDescription>Your time tracking records and corrections</CardDescription>
            </CardHeader>
            <CardContent>
              {punchHistoryLoading ? (
                <div className="h-64 bg-gray-200 rounded animate-pulse" />
              ) : punchHistory && punchHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {punchHistory.slice(0, 20).map((punch) => (
                      <TableRow key={punch.punchId}>
                        <TableCell>
                          {format(new Date(punch.timestamp), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={punch.type === 'in' ? 'default' : 'secondary'}>
                            {punch.type === 'in' ? 'Clock In' :
                             punch.type === 'out' ? 'Clock Out' :
                             punch.type === 'break_start' ? 'Break Start' : 'Break End'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {punch.method === 'mobile' ? <Timer className="h-3 w-3" /> :
                             punch.method === 'kiosk' ? <Coffee className="h-3 w-3" /> :
                             <MapPin className="h-3 w-3" />}
                            <span className="capitalize">{punch.method}</span>
                          </div>
                        </TableCell>
                        <TableCell>{punch.location}</TableCell>
                        <TableCell>
                          <Badge variant={
                            punch.status === 'valid' ? 'default' :
                            punch.status === 'corrected' ? 'secondary' : 'destructive'
                          }>
                            {punch.status === 'valid' ? 'Valid' :
                             punch.status === 'corrected' ? 'Corrected' : 'Flagged'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {punch.status === 'flagged' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCorrectionDialog({
                                      open: true,
                                      punchId: punch.punchId,
                                      originalTime: punch.timestamp.toString()
                                    });
                                  }}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Correct
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Submit Time Correction</DialogTitle>
                                  <DialogDescription>
                                    Request a correction for this punch time. Your manager will review and approve.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="original-time">Original Time</Label>
                                    <Input
                                      id="original-time"
                                      type="datetime-local"
                                      value={correctionDialog.originalTime}
                                      readOnly
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="reason">Reason for Correction</Label>
                                    <Textarea
                                      id="reason"
                                      placeholder="Explain why this time needs to be corrected..."
                                      value={correctionReason}
                                      onChange={(e) => setCorrectionReason(e.target.value)}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button 
                                      onClick={handleTimeCorrection}
                                      disabled={timeCorrectionMutation.isPending}
                                    >
                                      {timeCorrectionMutation.isPending ? 'Submitting...' : 'Submit Request'}
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      onClick={() => setCorrectionDialog({ open: false, punchId: '', originalTime: '' })}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No punch history available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Shifts</CardTitle>
              <CardDescription>Your scheduled work periods</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.currentPeriod?.upcomingShifts && dashboard.currentPeriod.upcomingShifts.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.currentPeriod.upcomingShifts.map((shift, index) => (
                    <Card key={index}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(shift.date), 'MMM')}
                            </div>
                            <div className="text-2xl font-bold">
                              {format(new Date(shift.date), 'd')}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium">
                              {shift.startTime} - {shift.endTime}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {shift.department}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {format(new Date(`${shift.date} ${shift.startTime}`), 'EEEE')}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No upcoming shifts scheduled
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}