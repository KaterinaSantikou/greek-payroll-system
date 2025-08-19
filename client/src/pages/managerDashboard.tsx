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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Eye,
  UserPlus,
  Timer,
  Calendar,
  TrendingUp,
  Building,
  Activity
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ManagerDashboardPage() {
  const { toast } = useToast();
  const [selectedPropertyId] = useState('default'); // In real app, would be selectable
  const [quickHireDialog, setQuickHireDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, type: '', requestId: '', employeeName: '' });
  const [approvalNotes, setApprovalNotes] = useState('');
  
  // Mock manager ID - in real app would come from auth context
  const managerId = "MGR_001";

  // Manager Dashboard Data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/self-service/manager', managerId, 'dashboard', selectedPropertyId],
    queryFn: () => apiRequest(`/api/self-service/manager/${managerId}/dashboard?propertyId=${selectedPropertyId}`)
  });

  // Pending Approvals Data
  const { data: approvals, isLoading: approvalsLoading } = useQuery({
    queryKey: ['/api/self-service/manager', managerId, 'approvals', selectedPropertyId],
    queryFn: () => apiRequest(`/api/self-service/manager/${managerId}/approvals?propertyId=${selectedPropertyId}`)
  });

  // Overtime Approval Mutation
  const overtimeApprovalMutation = useMutation({
    mutationFn: (data: { requestId: string; approved: boolean; notes?: string }) =>
      apiRequest(`/api/self-service/manager/${managerId}/approve-overtime`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Overtime request processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/self-service/manager', managerId, 'approvals'] });
      setApprovalDialog({ open: false, type: '', requestId: '', employeeName: '' });
      setApprovalNotes('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process overtime request",
        variant: "destructive",
      });
    }
  });

  // Quick Hire Mutation
  const quickHireMutation = useMutation({
    mutationFn: (employeeData: any) =>
      apiRequest(`/api/self-service/manager/${managerId}/quick-hire`, {
        method: 'POST',
        body: JSON.stringify(employeeData)
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee hired successfully",
      });
      setQuickHireDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to hire employee",
        variant: "destructive",
      });
    }
  });

  const handleOvertimeApproval = (approved: boolean) => {
    overtimeApprovalMutation.mutate({
      requestId: approvalDialog.requestId,
      approved,
      notes: approvalNotes
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_time':
        return <Badge className="bg-green-500">On Time</Badge>;
      case 'overtime':
        return <Badge className="bg-orange-500">Overtime</Badge>;
      case 'late_start':
        return <Badge variant="destructive">Late Start</Badge>;
      case 'missing_punch':
        return <Badge variant="outline" className="border-red-500 text-red-500">Missing Punch</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time staff monitoring, approvals, and workforce management
          </p>
        </div>
        <Dialog open={quickHireDialog} onOpenChange={setQuickHireDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Quick Hire
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Quick Hire Employee</DialogTitle>
              <DialogDescription>
                Add a new employee to your property quickly
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Maria" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Papadopoulos" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="maria@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+30 694 123 4567" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" placeholder="Housekeeper" />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" placeholder="Housekeeping" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="salary">Base Salary (€)</Label>
                  <Input id="salary" type="number" placeholder="1200" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => quickHireMutation.mutate({})}
                  disabled={quickHireMutation.isPending}
                  className="flex-1"
                >
                  {quickHireMutation.isPending ? 'Hiring...' : 'Hire Employee'}
                </Button>
                <Button variant="outline" onClick={() => setQuickHireDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Working</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.currentlyOnSite?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {dashboard?.todayMetrics?.scheduledEmployees || 0} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.todayMetrics?.overtimeHours || 0}h</div>
            <p className="text-xs text-muted-foreground">
              Today's overtime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(dashboard?.pendingApprovals?.overtime || 0) + 
               (dashboard?.pendingApprovals?.exceptions || 0) +
               (dashboard?.pendingApprovals?.leaveRequests || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.todayMetrics?.absentEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">
              Unplanned absences
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="whos-on-now" className="space-y-4">
        <TabsList>
          <TabsTrigger value="whos-on-now">Who's On Now</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="departments">Department Summary</TabsTrigger>
          <TabsTrigger value="roster">Roster Management</TabsTrigger>
        </TabsList>

        <TabsContent value="whos-on-now" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currently On-Site Staff</CardTitle>
              <CardDescription>Real-time view of who's working right now</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.currentlyOnSite && dashboard.currentlyOnSite.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Punch In</TableHead>
                      <TableHead>Expected End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard.currentlyOnSite.map((employee) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{format(new Date(employee.punchInTime), 'HH:mm')}</TableCell>
                        <TableCell>{format(new Date(employee.expectedEndTime), 'HH:mm')}</TableCell>
                        <TableCell>{getStatusBadge(employee.status)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No staff currently on-site
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Overtime Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Overtime Requests ({approvals?.overtime?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvals?.overtime && approvals.overtime.length > 0 ? (
                  <div className="space-y-3">
                    {approvals.overtime.map((request: any) => (
                      <Card key={request.requestId} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{request.employeeName}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.hours}h on {format(new Date(request.date), 'MMM d')}
                            </div>
                            <div className="text-sm">{request.reason}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setApprovalDialog({
                                  open: true,
                                  type: 'overtime',
                                  requestId: request.requestId,
                                  employeeName: request.employeeName
                                });
                              }}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOvertimeApproval(false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending overtime requests</p>
                )}
              </CardContent>
            </Card>

            {/* Leave Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Leave Requests ({approvals?.leaveRequests?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvals?.leaveRequests && approvals.leaveRequests.length > 0 ? (
                  <div className="space-y-3">
                    {approvals.leaveRequests.map((request: any) => (
                      <Card key={request.requestId} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{request.employeeName}</div>
                            <div className="text-sm text-muted-foreground">
                              {request.type} - {request.days} days
                            </div>
                            <div className="text-sm">
                              {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d')}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="destructive">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pending leave requests</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Approval Dialog */}
          <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, open }))}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve {approvalDialog.type} Request</DialogTitle>
                <DialogDescription>
                  Reviewing request from {approvalDialog.employeeName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="approval-notes">Notes (Optional)</Label>
                  <Textarea
                    id="approval-notes"
                    placeholder="Add any notes about this approval..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleOvertimeApproval(true)}
                    disabled={overtimeApprovalMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {overtimeApprovalMutation.isPending ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleOvertimeApproval(false)}
                    disabled={overtimeApprovalMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {overtimeApprovalMutation.isPending ? 'Rejecting...' : 'Reject'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Summary</CardTitle>
              <CardDescription>Key metrics by department for today</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.departmentSummary && dashboard.departmentSummary.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {dashboard.departmentSummary.map((dept, index) => (
                    <Card key={index}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base">{dept.department}</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Staff Count</span>
                            <span className="font-medium">{dept.staffCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Hours Worked</span>
                            <span className="font-medium">{dept.hoursWorked}h</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Overtime Hours</span>
                            <span className="font-medium">{dept.overtimeHours}h</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Efficiency</span>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{dept.efficiency}%</span>
                              {dept.efficiency >= 90 ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-orange-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No department data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Roster Management</CardTitle>
                  <CardDescription>Manage schedules and staffing assignments</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Schedule
                  </Button>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Shift
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Roster Management</h3>
                <p className="text-muted-foreground mb-4">
                  Advanced schedule management features coming soon
                </p>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Current Week
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}