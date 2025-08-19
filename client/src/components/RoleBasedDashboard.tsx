import { useUserRole } from "@/contexts/UserRoleContext";
import { useProperty } from "@/contexts/PropertyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, FileText, Clock, TrendingUp, AlertCircle, 
  Calendar, Euro, CheckCircle, Settings, BarChart3 
} from "lucide-react";
import { Link } from "wouter";

export default function RoleBasedDashboard() {
  const { userProfile, userRole, hasPermission } = useUserRole();
  const { selectedProperty, isGroupView } = useProperty();

  if (!userProfile) {
    return <div>Loading user profile...</div>;
  }

  // HR Dashboard - Filings & Payroll modules first
  if (userRole === 'hr') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">HR Dashboard</h2>
            <p className="text-muted-foreground">
              Payroll processing and compliance management
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            HR Manager
          </Badge>
        </div>

        {/* HR Priority Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Payroll</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Properties ready</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ERGANI Filings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Due this week</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98%</div>
              <p className="text-xs text-muted-foreground">All properties</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€847K</div>
              <p className="text-xs text-muted-foreground">Labor costs</p>
            </CardContent>
          </Card>
        </div>

        {/* HR Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Quick Actions</CardTitle>
              <CardDescription>Process payroll and manage filings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/payroll-run-wizard">
                <Button className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Run Payroll (December)
                </Button>
              </Link>
              <Link href="/ergani-compliance">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ERGANI Submissions
                </Button>
              </Link>
              <Link href="/compliance">
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Compliance Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>Onboarding and employee records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/employees">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  Employee Directory
                </Button>
              </Link>
              <Link href="/employee-master">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Master Data Management
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Manager Dashboard - Schedules & Approvals
  if (userRole === 'manager') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Manager Dashboard</h2>
            <p className="text-muted-foreground">
              Team schedules and approval workflows
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {userProfile.department} Manager
            </Badge>
            {selectedProperty && (
              <Badge variant="outline">{selectedProperty.name}</Badge>
            )}
          </div>
        </div>

        {/* Manager Priority Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">Overtime requests</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">Direct reports</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">This Week OT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47h</div>
              <p className="text-xs text-muted-foreground">Team overtime</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">96%</div>
              <p className="text-xs text-muted-foreground">On-time rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Manager Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Management</CardTitle>
              <CardDescription>Team scheduling and time management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/schedules">
                <Button className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Manage Schedules
                </Button>
              </Link>
              <Link href="/overtime">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  Overtime Approvals
                </Button>
              </Link>
              <Link href="/manager-workflows">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approval Workflows
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Analytics</CardTitle>
              <CardDescription>Performance and insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/visual-analytics">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Team Performance
                </Button>
              </Link>
              <Link href="/forecasting">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Workforce Planning
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Employee Dashboard - Payslips & Time Logs
  if (userRole === 'employee') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Dashboard</h2>
            <p className="text-muted-foreground">
              Your payslips, time logs, and personal information
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Employee
            </Badge>
            {userProfile.department && (
              <Badge variant="outline">{userProfile.department}</Badge>
            )}
          </div>
        </div>

        {/* Employee Priority Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">This Month Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€2,847</div>
              <p className="text-xs text-muted-foreground">Net salary</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">38.5h</div>
              <p className="text-xs text-muted-foreground">Regular hours</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground">Days remaining</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Next Payday</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Dec 30</div>
              <p className="text-xs text-muted-foreground">4 days away</p>
            </CardContent>
          </Card>
        </div>

        {/* Employee Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Payroll</CardTitle>
              <CardDescription>Payslips and pay information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/employee-self-service">
                <Button className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  View Payslips
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start">
                <Euro className="w-4 h-4 mr-2" />
                Explain My Pay
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Time</CardTitle>
              <CardDescription>Time tracking and leave management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/digital-work-card">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  Digital Work Card
                </Button>
              </Link>
              <Link href="/leave">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Request Leave
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin Dashboard - Full Property Dashboard (default)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            System administration and full access
          </p>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700">
          System Admin
        </Badge>
      </div>

      {/* Admin Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Property Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/property-dashboard">
                <Settings className="w-4 h-4 mr-2" />
                Manage Properties
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              System Configuration
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/visual-analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                System Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}