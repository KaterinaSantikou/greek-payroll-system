import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  getUserRole,
  getRoleConfiguration,
  getRoleDisplayName,
} from '@/lib/roleBasedRouting';
import {
  PlayCircle,
  FileText,
  Euro,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  Shield,
} from 'lucide-react';

interface DashboardWidgetProps {
  widgetId: string;
  role: string;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  widgetId,
  role,
}) => {
  const renderWidget = () => {
    switch (widgetId) {
      case 'payroll-runs-status':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-blue-600" />
                Payroll Runs Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded">
                  <p className="text-lg font-bold text-green-700">3</p>
                  <p className="text-xs text-green-600">Completed</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded">
                  <p className="text-lg font-bold text-orange-700">1</p>
                  <p className="text-xs text-orange-600">In Progress</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <p className="text-lg font-bold text-blue-700">2</p>
                  <p className="text-xs text-blue-600">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'pending-filings':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Pending Filings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">ERGANI II</span>
                  <Badge variant="secondary">8 pending</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">e-EFKA</span>
                  <Badge variant="default">2 ready</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">AADE</span>
                  <Badge variant="outline">0 pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'employee-overview':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Employee Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-purple-700">152</p>
                  <p className="text-xs text-gray-500">Active Employees</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">8</p>
                  <p className="text-xs text-gray-500">New This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'team-attendance':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Team Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Present Today</span>
                  <span className="font-medium">24/28</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">On Time</span>
                  <span className="font-medium text-green-600">96%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Exceptions</span>
                  <Badge variant="destructive">3</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'compliance-score':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Compliance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-700">98.7%</p>
                <p className="text-xs text-gray-500 mb-3">Overall Compliance</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>ERGANI II</span>
                    <span className="text-green-600">100%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>e-EFKA</span>
                    <span className="text-green-600">99%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>AADE</span>
                    <span className="text-orange-600">96%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'my-payslip':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-green-600" />
                Latest Payslip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Period</span>
                  <span className="font-medium">December 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Gross Pay</span>
                  <span className="font-medium">€2,850</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Net Pay</span>
                  <span className="font-bold text-green-600">€2,284</span>
                </div>
                <Button size="sm" className="w-full mt-2">
                  View Full Payslip
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'pending-exceptions':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Pending Exceptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">High Priority</span>
                  <Badge variant="destructive">5</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Medium Priority</span>
                  <Badge variant="secondary">12</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Auto-Resolved</span>
                  <Badge variant="default">8</Badge>
                </div>
                <Button size="sm" className="w-full mt-2">
                  Review Exceptions
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">Widget: {widgetId}</p>
            </CardContent>
          </Card>
        );
    }
  };

  return renderWidget();
};

export default function RoleBasedDashboard() {
  const { user } = useAuth();
  const userRole = getUserRole(user);
  const roleConfig = getRoleConfiguration(userRole);

  return (
    <div className="space-y-6">
      {/* Role Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {getRoleDisplayName(userRole)} Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Customized view for your role
          </p>
        </div>
        <Badge variant="outline">{getRoleDisplayName(userRole)}</Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {roleConfig.quickActions.map((action, index) => (
          <Button key={index} variant="outline" size="sm">
            {action.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Button>
        ))}
      </div>

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roleConfig.defaultDashboardWidgets.map((widgetId, index) => (
          <DashboardWidget key={index} widgetId={widgetId} role={userRole} />
        ))}
      </div>
    </div>
  );
}
