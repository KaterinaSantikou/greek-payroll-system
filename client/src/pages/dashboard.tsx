import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import { 
  PlayCircle, 
  Clock, 
  FileText, 
  AlertTriangle, 
  Eye, 
  Zap, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  FileCheck, 
  AlertCircle, 
  Bell, 
  Settings, 
  BarChart,
  Calendar,
  UserPlus,
  FileSpreadsheet,
  Shield,
  CreditCard
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocale } from "@/hooks/useLocale";
import { cn } from "@/lib/utils";

// Types for modern HRIS dashboard
type UserRole = 'admin' | 'hr' | 'manager' | 'employee' | 'payroll';
type DashboardView = 'executive' | 'operational' | 'financial';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
  color: string;
}

interface WorkflowNotification {
  id: string;
  type: 'approval' | 'task' | 'alert';
  title: string;
  description: string;
  count: number;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  
  // User context
  const [userRole] = useState<UserRole>('admin');
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Modern HRIS quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'employees',
      title: 'Employees',
      description: 'Manage staff',
      icon: Users,
      href: '/employees',
      badge: '45',
      color: 'text-blue-600 hover:text-blue-700'
    },
    {
      id: 'payroll',
      title: 'Payroll',
      description: 'Run payroll',
      icon: DollarSign,
      href: '/payroll',
      badge: 'Due Jan 31',
      color: 'text-green-600 hover:text-green-700'
    },
    {
      id: 'time-off',
      title: 'Time Off',
      description: 'Approvals',
      icon: Calendar,
      href: '/time-off',
      badge: '3 pending',
      color: 'text-purple-600 hover:text-purple-700'
    },
    {
      id: 'onboarding',
      title: 'Onboarding',
      description: 'New hires',
      icon: UserPlus,
      href: '/onboarding',
      badge: '2 in progress',
      color: 'text-orange-600 hover:text-orange-700'
    },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Analytics',
      icon: BarChart,
      href: '/reports',
      color: 'text-indigo-600 hover:text-indigo-700'
    },
    {
      id: 'compliance',
      title: 'Compliance',
      description: 'Regulations',
      icon: Shield,
      href: '/compliance',
      badge: '94.5%',
      color: 'text-yellow-600 hover:text-yellow-700'
    }
  ];

  // Workflow notifications (like modern HRIS)
  const workflowNotifications: WorkflowNotification[] = [
    {
      id: 'overtime-approvals',
      type: 'approval',
      title: 'Overtime Requests',
      description: '2 requests need approval',
      count: 2,
      priority: 'high',
      action: 'Review'
    },
    {
      id: 'time-off-requests',
      type: 'approval',
      title: 'Time Off Requests',
      description: '1 vacation request pending',
      count: 1,
      priority: 'medium',
      action: 'Approve'
    },
    {
      id: 'payroll-review',
      type: 'task',
      title: 'Payroll Review',
      description: 'January payroll ready for final review',
      count: 1,
      priority: 'high',
      action: 'Review'
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Modern HRIS Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Good morning, Katerina
            </h1>
            <p className="text-muted-foreground">
              Here's what needs your attention today
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">PaySync Hotel Group</div>
            <div className="text-lg font-medium">{currentDate}</div>
          </div>
        </div>
      </div>

      {/* Workflow Notifications - Priority Items */}
      {workflowNotifications.length > 0 && (
        <div className="space-y-3">
          {workflowNotifications.map((notification) => (
            <Alert 
              key={notification.id}
              className={cn(
                "border-l-4",
                notification.priority === 'high' ? "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20" :
                notification.priority === 'medium' ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20" :
                "border-l-gray-500 bg-gray-50 dark:bg-gray-950/20"
              )}
            >
              <Bell className={cn(
                "h-4 w-4",
                notification.priority === 'high' ? "text-orange-600" :
                notification.priority === 'medium' ? "text-blue-600" :
                "text-gray-600"
              )} />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-sm text-muted-foreground">{notification.description}</div>
                  </div>
                  <Badge variant="secondary">{notification.count}</Badge>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  className={cn(
                    notification.priority === 'high' ? "border-orange-300 text-orange-700" :
                    notification.priority === 'medium' ? "border-blue-300 text-blue-700" :
                    "border-gray-300 text-gray-700"
                  )}
                >
                  {notification.action}
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Quick Navigation - Modern HRIS Style */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 group border-0 shadow-sm"
            >
              <CardContent className="p-6 text-center">
                <action.icon className={cn("w-8 h-8 mx-auto mb-3", action.color)} />
                <div className="font-medium text-sm mb-1">{action.title}</div>
                <div className="text-xs text-muted-foreground mb-2">{action.description}</div>
                {action.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {action.badge}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Metrics - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Company Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">45</div>
                  <div className="text-sm text-muted-foreground">Total Employees</div>
                  <div className="text-xs text-green-600 mt-1">+2 this month</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">€142,350</div>
                  <div className="text-sm text-muted-foreground">Monthly Payroll</div>
                  <div className="text-xs text-green-600 mt-1">2% under budget</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">8.2h</div>
                  <div className="text-sm text-muted-foreground">Avg Daily Hours</div>
                  <div className="text-xs text-blue-600 mt-1">Within target</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">94.5%</div>
                  <div className="text-sm text-muted-foreground">Compliance Score</div>
                  <div className="text-xs text-yellow-600 mt-1">Minor gaps</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Next Payroll Run
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-medium">January 31, 2025</div>
                  <div className="text-sm text-muted-foreground">45 employees • €142,350 total</div>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Ready to Process
                </Badge>
              </div>
              <Progress value={85} className="h-2 mb-2" />
              <div className="text-xs text-muted-foreground">85% complete • 3 approvals pending</div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Payroll processed</div>
                    <div className="text-xs text-muted-foreground">December payroll completed</div>
                    <div className="text-xs text-muted-foreground">2 hours ago</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">New employee added</div>
                    <div className="text-xs text-muted-foreground">Maria Kostas joined</div>
                    <div className="text-xs text-muted-foreground">1 day ago</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">System sync completed</div>
                    <div className="text-xs text-muted-foreground">Government data updated</div>
                    <div className="text-xs text-muted-foreground">3 hours ago</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">New Hires</div>
                <div className="font-medium">2</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Overtime Hours</div>
                <div className="font-medium">24h</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Time Off Requests</div>
                <div className="font-medium">7</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">Performance Reviews</div>
                <div className="font-medium">12</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}