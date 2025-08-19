import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Euro, 
  Clock,
  Calendar,
  FileText,
  User,
  CreditCard,
  MapPin,
  Bell,
  Download,
  Eye,
  Send,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function EmployeePortal() {
  const employee = {
    name: "Katerina Santikos",
    id: "EMP-001234",
    department: "Front Office",
    position: "Guest Relations Manager",
    hireDate: "2023-03-15",
    email: "katerina@santikos.hotels"
  };

  const payslipData = {
    period: "December 2024",
    grossPay: 2850,
    netPay: 2284,
    deductions: 566,
    status: "available"
  };

  const timeData = {
    todayHours: 8.25,
    weekHours: 41.5,
    monthHours: 168.5,
    overtimeWeek: 1.5,
    lastPunch: "08:02 - Clock In"
  };

  const leaveBalance = {
    annual: { total: 25, used: 8, remaining: 17 },
    sick: { total: 10, used: 2, remaining: 8 },
    personal: { total: 3, used: 1, remaining: 2 }
  };

  const digitalCard = {
    status: "active",
    lastUsed: "Today 08:02",
    monthlyPunches: 42,
    complianceScore: 98
  };

  const pendingRequests = [
    { id: 1, type: "Annual Leave", dates: "Feb 10-14, 2025", status: "pending", urgent: false },
    { id: 2, type: "Schedule Change", dates: "Jan 22, 2025", status: "approved", urgent: false },
    { id: 3, type: "Overtime Request", dates: "Jan 20, 2025", status: "pending", urgent: true }
  ];

  const notifications = [
    { id: 1, title: "Payslip Available", message: "December 2024 payslip ready for download", time: "2 hours ago", read: false },
    { id: 2, title: "Schedule Updated", message: "Next week schedule has been published", time: "1 day ago", read: true },
    { id: 3, title: "Leave Approved", message: "Your leave request has been approved", time: "3 days ago", read: true }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {employee.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {employee.position} • {employee.department}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Employee ID</p>
            <p className="font-mono font-medium">{employee.id}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Euro className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Net Pay</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">€{payslipData.netPay}</p>
                <p className="text-xs text-gray-500">{payslipData.period}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">This Week</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{timeData.weekHours}h</p>
                <p className="text-xs text-gray-500">+{timeData.overtimeWeek}h OT</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Leave Left</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{leaveBalance.annual.remaining}</p>
                <p className="text-xs text-gray-500">Annual days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Digital Card</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{digitalCard.complianceScore}%</p>
                <p className="text-xs text-gray-500">Compliance score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Payslip */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Latest Payslip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Period</span>
                <span className="font-medium">{payslipData.period}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Gross Pay</span>
                <span className="font-medium">€{payslipData.grossPay}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Deductions</span>
                <span className="font-medium text-red-600">-€{payslipData.deductions}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-medium">Net Pay</span>
                <span className="font-bold text-green-600 text-lg">€{payslipData.netPay}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Time Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
                <span className="font-medium">{timeData.todayHours} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
                <span className="font-medium">{timeData.weekHours} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
                <span className="font-medium">{timeData.monthHours} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Last Punch</span>
                <span className="font-medium text-green-600">{timeData.lastPunch}</span>
              </div>
            </div>
            
            <Button className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              View Digital Work Card
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(leaveBalance).map(([type, data]) => (
              <div key={type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{type} Leave</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {data.remaining}/{data.total} days left
                  </span>
                </div>
                <Progress value={(data.remaining / data.total) * 100} className="h-2" />
              </div>
            ))}
            
            <Button className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pending Requests ({pendingRequests.filter(r => r.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{request.type}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{request.dates}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.urgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                    <Badge variant={getStatusColor(request.status)} className="text-xs">
                      {request.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            <Button variant="outline" className="w-full mt-3">
              <FileText className="h-4 w-4 mr-2" />
              Submit New Request
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-3 border rounded-lg ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{notification.title}</h3>
                      {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                  </div>
                  {!notification.read && (
                    <Button size="sm" variant="ghost">
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" className="h-20 flex flex-col gap-2">
          <FileText className="h-6 w-6" />
          <span className="text-xs">View Payslips</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col gap-2">
          <Calendar className="h-6 w-6" />
          <span className="text-xs">Request Leave</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col gap-2">
          <Clock className="h-6 w-6" />
          <span className="text-xs">View Schedule</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col gap-2">
          <User className="h-6 w-6" />
          <span className="text-xs">Update Profile</span>
        </Button>
      </div>
    </div>
  );
}