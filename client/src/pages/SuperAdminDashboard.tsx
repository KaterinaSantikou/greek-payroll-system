import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Database,
  Wifi,
  WifiOff,
  Bell,
  Activity,
  DollarSign,
  UserCheck,
  AlertCircle,
  Settings,
  Eye,
  RefreshCw,
  Filter,
  Download,
  BarChart3,
  PieChart,
  Globe,
  Lock,
  Unlock,
  Server,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical';
  uptime: string;
  lastUpdated: string;
  services: {
    name: string;
    status: 'operational' | 'degraded' | 'outage';
    responseTime: number;
    lastCheck: string;
  }[];
}

interface UpcomingDeadline {
  id: string;
  title: string;
  date: string;
  type: 'payroll' | 'tax' | 'benefits' | 'compliance' | 'review';
  priority: 'high' | 'medium' | 'low';
  daysLeft: number;
  assignedTo?: string;
}

interface PendingTask {
  id: string;
  category: string;
  description: string;
  count: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  assignedDepartment: string;
}

interface Integration {
  id: string;
  name: string;
  type: 'accounting' | 'timetracking' | 'benefits' | 'government' | 'banking';
  status: 'connected' | 'error' | 'syncing' | 'disconnected';
  lastSync: string;
  errorMessage?: string;
}

interface CompanyMetrics {
  totalHeadcount: number;
  headcountChange: number;
  diversity: {
    gender: { male: number; female: number; other: number };
    ageGroups: { under30: number; between30_50: number; over50: number };
    tenure: { under1Year: number; between1_5Years: number; over5Years: number };
  };
  payroll: {
    totalAmount: number;
    previousAmount: number;
    budgetAmount: number;
    changePercent: number;
  };
}

interface SystemAlert {
  id: string;
  type: 'compliance' | 'security' | 'system' | 'integration';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  actionRequired: boolean;
  resolved: boolean;
}

export default function SuperAdminDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - replace with actual API calls
  const systemStatus: SystemStatus = {
    overall: 'healthy',
    uptime: '99.97%',
    lastUpdated: new Date().toISOString(),
    services: [
      { name: 'Payroll Engine', status: 'operational', responseTime: 245, lastCheck: '2 minutes ago' },
      { name: 'ERGANI Integration', status: 'operational', responseTime: 1200, lastCheck: '1 minute ago' },
      { name: 'EFKA Connection', status: 'degraded', responseTime: 3400, lastCheck: '30 seconds ago' },
      { name: 'Banking APIs', status: 'operational', responseTime: 890, lastCheck: '1 minute ago' },
      { name: 'Document Storage', status: 'operational', responseTime: 150, lastCheck: '3 minutes ago' },
      { name: 'Authentication', status: 'operational', responseTime: 95, lastCheck: '1 minute ago' }
    ]
  };

  const upcomingDeadlines: UpcomingDeadline[] = [
    {
      id: '1',
      title: 'Monthly Payroll Processing',
      date: '2024-08-30T23:59:00',
      type: 'payroll',
      priority: 'high',
      daysLeft: 9,
      assignedTo: 'Payroll Team'
    },
    {
      id: '2',
      title: 'EFKA Monthly Filing',
      date: '2024-08-31T17:00:00',
      type: 'tax',
      priority: 'high',
      daysLeft: 10,
      assignedTo: 'Compliance Team'
    },
    {
      id: '3',
      title: 'Q3 Performance Reviews',
      date: '2024-09-15T23:59:00',
      type: 'review',
      priority: 'medium',
      daysLeft: 25,
      assignedTo: 'HR Team'
    },
    {
      id: '4',
      title: 'Benefits Enrollment Period',
      date: '2024-09-01T00:00:00',
      type: 'benefits',
      priority: 'medium',
      daysLeft: 11,
      assignedTo: 'HR Team'
    },
    {
      id: '5',
      title: 'Digital Work Cards Compliance Audit',
      date: '2024-09-20T12:00:00',
      type: 'compliance',
      priority: 'high',
      daysLeft: 30,
      assignedTo: 'Compliance Team'
    }
  ];

  const pendingTasks: PendingTask[] = [
    { id: '1', category: 'Time-off Approvals', description: 'Vacation requests pending manager approval', count: 7, urgency: 'medium', assignedDepartment: 'Management' },
    { id: '2', category: 'Onboarding Documents', description: 'New hires missing required documents', count: 3, urgency: 'high', assignedDepartment: 'HR' },
    { id: '3', category: 'Payroll Exceptions', description: 'Overtime calculations requiring review', count: 12, urgency: 'high', assignedDepartment: 'Payroll' },
    { id: '4', category: 'ERGANI Submissions', description: 'Failed submissions requiring reprocessing', count: 2, urgency: 'critical', assignedDepartment: 'Compliance' },
    { id: '5', category: 'Performance Reviews', description: 'Overdue performance evaluations', count: 8, urgency: 'medium', assignedDepartment: 'HR' },
    { id: '6', category: 'Contract Renewals', description: 'Contracts expiring within 30 days', count: 5, urgency: 'medium', assignedDepartment: 'Legal' }
  ];

  const integrations: Integration[] = [
    { id: '1', name: 'Alpha Bank SEPA', type: 'banking', status: 'connected', lastSync: '5 minutes ago' },
    { id: '2', name: 'ERGANI II', type: 'government', status: 'connected', lastSync: '2 minutes ago' },
    { id: '3', name: 'EFKA e-Services', type: 'government', status: 'error', lastSync: '1 hour ago', errorMessage: 'Authentication timeout' },
    { id: '4', name: 'AADE myDATA', type: 'government', status: 'connected', lastSync: '10 minutes ago' },
    { id: '5', name: 'Sage Accounting', type: 'accounting', status: 'syncing', lastSync: '30 seconds ago' },
    { id: '6', name: 'BambooHR', type: 'benefits', status: 'connected', lastSync: '15 minutes ago' },
    { id: '7', name: 'Clockwise Time Tracking', type: 'timetracking', status: 'connected', lastSync: '3 minutes ago' }
  ];

  const companyMetrics: CompanyMetrics = {
    totalHeadcount: 247,
    headcountChange: +12,
    diversity: {
      gender: { male: 142, female: 98, other: 7 },
      ageGroups: { under30: 89, between30_50: 124, over50: 34 },
      tenure: { under1Year: 45, between1_5Years: 128, over5Years: 74 }
    },
    payroll: {
      totalAmount: 428750,
      previousAmount: 419230,
      budgetAmount: 450000,
      changePercent: 2.27
    }
  };

  const systemAlerts: SystemAlert[] = [
    {
      id: '1',
      type: 'compliance',
      severity: 'warning',
      title: 'New Tax Law Changes',
      message: 'Greek minimum wage update (€830) requires payroll system configuration by August 31st',
      timestamp: '2 hours ago',
      actionRequired: true,
      resolved: false
    },
    {
      id: '2',
      type: 'system',
      severity: 'info',
      title: 'Scheduled Maintenance',
      message: 'Database maintenance window scheduled for Sunday 2:00-4:00 AM',
      timestamp: '1 day ago',
      actionRequired: false,
      resolved: false
    },
    {
      id: '3',
      type: 'security',
      severity: 'warning',
      title: 'Unusual Login Activity',
      message: '3 failed login attempts detected from IP 185.234.xxx.xxx',
      timestamp: '4 hours ago',
      actionRequired: true,
      resolved: false
    },
    {
      id: '4',
      type: 'integration',
      severity: 'critical',
      title: 'EFKA Connection Issues',
      message: 'EFKA API experiencing intermittent connectivity issues affecting submissions',
      timestamp: '1 hour ago',
      actionRequired: true,
      resolved: false
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'connected': return 'text-green-700 bg-green-100 border-green-200';
      case 'warning':
      case 'degraded':
      case 'syncing': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'critical':
      case 'outage':
      case 'error':
      case 'disconnected': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'warning': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'info': return 'text-blue-700 bg-blue-100 border-blue-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-100 border-green-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            Super Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Complete system oversight and company-wide analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Activity className="h-3 w-3 mr-1" />
            System Healthy
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health & Status
            </span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Uptime: {systemStatus.uptime}</span>
              <Badge className={getStatusColor(systemStatus.overall)}>
                {systemStatus.overall.toUpperCase()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemStatus.services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === 'operational' ? 'bg-green-500' :
                    service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-medium text-sm">{service.name}</div>
                    <div className="text-xs text-gray-600">{service.lastCheck}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{service.responseTime}ms</div>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(service.status)}`}>
                    {service.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Critical Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingDeadlines.slice(0, 5).map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getPriorityIcon(deadline.priority) && getUrgencyColor(deadline.priority)}`}>
                        {getPriorityIcon(deadline.priority)}
                      </div>
                      <div>
                        <div className="font-medium">{deadline.title}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(deadline.date).toLocaleDateString('el-GR')} • {deadline.assignedTo}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${
                        deadline.daysLeft <= 3 ? 'bg-red-100 text-red-800 border-red-200' :
                        deadline.daysLeft <= 7 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {deadline.daysLeft} days left
                      </Badge>
                      <div className="text-xs text-gray-600 mt-1">
                        {deadline.type.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Tasks Across Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{task.category}</h4>
                      <Badge className={getUrgencyColor(task.urgency)}>
                        {task.count} pending
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Assigned to: {task.assignedDepartment}</span>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Company Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Key Company-Wide Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Headcount */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Total Headcount</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">{companyMetrics.totalHeadcount}</div>
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">+{companyMetrics.headcountChange} this month</span>
                  </div>
                </div>

                {/* Payroll Summary */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-600">Monthly Payroll</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    €{(companyMetrics.payroll.totalAmount / 1000).toFixed(0)}K
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">+{companyMetrics.payroll.changePercent}% vs last month</span>
                  </div>
                </div>

                {/* Budget vs Actual */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600">Budget Usage</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round((companyMetrics.payroll.totalAmount / companyMetrics.payroll.budgetAmount) * 100)}%
                  </div>
                  <Progress 
                    value={(companyMetrics.payroll.totalAmount / companyMetrics.payroll.budgetAmount) * 100} 
                    className="w-full mt-2"
                  />
                </div>

                {/* System Performance */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-600">System Uptime</span>
                  </div>
                  <div className="text-3xl font-bold text-yellow-600">99.97%</div>
                  <div className="text-sm text-gray-600">Last 30 days</div>
                </div>
              </div>

              {/* Diversity Breakdown */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-4">Diversity & Demographics Overview</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-600 mb-3">Gender Distribution</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Male</span>
                        <span className="font-medium">{companyMetrics.diversity.gender.male} (57%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Female</span>
                        <span className="font-medium">{companyMetrics.diversity.gender.female} (40%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Other</span>
                        <span className="font-medium">{companyMetrics.diversity.gender.other} (3%)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-600 mb-3">Age Groups</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Under 30</span>
                        <span className="font-medium">{companyMetrics.diversity.ageGroups.under30} (36%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">30-50</span>
                        <span className="font-medium">{companyMetrics.diversity.ageGroups.between30_50} (50%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Over 50</span>
                        <span className="font-medium">{companyMetrics.diversity.ageGroups.over50} (14%)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-600 mb-3">Tenure Distribution</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Under 1 Year</span>
                        <span className="font-medium">{companyMetrics.diversity.tenure.under1Year} (18%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">1-5 Years</span>
                        <span className="font-medium">{companyMetrics.diversity.tenure.between1_5Years} (52%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">5+ Years</span>
                        <span className="font-medium">{companyMetrics.diversity.tenure.over5Years} (30%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Integrations Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Integrations Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div key={integration.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        integration.status === 'connected' ? 'bg-green-500' :
                        integration.status === 'syncing' ? 'bg-blue-500' :
                        integration.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <div className="text-sm font-medium">{integration.name}</div>
                        <div className="text-xs text-gray-600">{integration.lastSync}</div>
                        {integration.errorMessage && (
                          <div className="text-xs text-red-600">{integration.errorMessage}</div>
                        )}
                      </div>
                    </div>
                    {integration.status === 'connected' ? (
                      <Wifi className="h-4 w-4 text-green-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                System Alerts
                <Badge variant="destructive" className="ml-auto">
                  {systemAlerts.filter(a => !a.resolved && a.actionRequired).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemAlerts.filter(alert => !alert.resolved).map((alert) => (
                  <Alert key={alert.id} className={`${getSeverityColor(alert.severity)} border`}>
                    <div className="flex items-start gap-2">
                      {alert.severity === 'critical' && <AlertTriangle className="h-4 w-4 mt-0.5" />}
                      {alert.severity === 'warning' && <AlertCircle className="h-4 w-4 mt-0.5" />}
                      {alert.severity === 'info' && <CheckCircle className="h-4 w-4 mt-0.5" />}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-medium text-sm">{alert.title}</h5>
                          <div className="flex items-center gap-1">
                            {alert.actionRequired && (
                              <Badge variant="destructive" className="text-xs">Action Required</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {alert.type}
                            </Badge>
                          </div>
                        </div>
                        <AlertDescription className="text-xs">
                          {alert.message}
                        </AlertDescription>
                        <div className="text-xs text-gray-500 mt-1">{alert.timestamp}</div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-3" size="sm">
                View All Alerts
              </Button>
            </CardContent>
          </Card>

          {/* Security Log Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Sessions</span>
                  <span className="font-medium">23</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Failed Logins (24h)</span>
                  <span className="font-medium text-yellow-600">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">New Device Logins</span>
                  <span className="font-medium text-blue-600">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">2FA Coverage</span>
                  <span className="font-medium text-green-600">89%</span>
                </div>
                <Button variant="outline" className="w-full" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Security Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}