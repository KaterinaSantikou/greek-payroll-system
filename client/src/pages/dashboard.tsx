import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  FileText, 
  Smartphone, 
  PlayCircle, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  DollarSign,
  Users,
  Eye,
  Zap,
  TrendingUp,
  TrendingDown,
  Settings,
  Bell,
  Target,
  AlertCircle,
  ChevronRight,
  Building2,
  Timer,
  CreditCard,
  FileCheck,
  UserCheck,
  Briefcase
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocale } from "@/lib/i18n";

// Types for dashboard customization
type UserRole = 'admin' | 'hr_payroll' | 'manager' | 'payroll_clerk' | 'finance_director';
type DashboardView = 'executive' | 'operational' | 'financial';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  deadline?: string;
  action: () => void;
  category: 'payroll' | 'compliance' | 'approval' | 'filing' | 'payment';
  icon: any;
  estimated_time?: string;
}

interface DashboardMetric {
  id: string;
  title: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  trend?: number[];
  target?: string | number;
  status: 'healthy' | 'warning' | 'critical';
  drilldownUrl: string;
  description: string;
  category: 'financial' | 'operational' | 'compliance' | 'workforce';
}

interface PendingIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  affectedCount: number;
  category: string;
  actionRequired: boolean;
  estimatedResolutionTime: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  
  // User context and customization
  const [userRole] = useState<UserRole>('admin'); // Would come from auth context
  const [dashboardView, setDashboardView] = useState<DashboardView>('executive');
  const [customLayout, setCustomLayout] = useState<string[]>([]);

  // Dashboard data fetching
  const { data: actionItems = [], isLoading: actionsLoading } = useQuery({
    queryKey: ['/api/dashboard/action-items', userRole],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: dailyMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/dashboard/daily-metrics', dashboardView],
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: pendingIssues = [], isLoading: issuesLoading } = useQuery({
    queryKey: ['/api/dashboard/pending-issues'],
    refetchInterval: 30000
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['/api/dashboard/real-time-alerts'],
    refetchInterval: 10000 // More frequent for alerts
  });

  // Mock data for demo purposes
  const mockActionItems: ActionItem[] = [
    {
      id: 'payroll-review',
      title: 'Review January Payroll',
      description: '24 employees ready for final review and processing',
      priority: 'critical',
      deadline: '2025-01-29',
      category: 'payroll',
      icon: PlayCircle,
      estimated_time: '15 min',
      action: () => console.log('Navigate to payroll review')
    },
    {
      id: 'overtime-approvals',
      title: 'Approve Overtime Hours',
      description: '7 overtime requests pending approval (2 urgent)',
      priority: 'high',
      deadline: '2025-01-28',
      category: 'approval',
      icon: Clock,
      estimated_time: '10 min',
      action: () => console.log('Navigate to overtime approvals')
    },
    {
      id: 'apd-filing',
      title: 'Submit Tax Filing',
      description: 'Monthly tax submission due in 3 days',
      priority: 'high',
      deadline: '2025-01-31',
      category: 'filing',
      icon: FileText,
      estimated_time: '5 min',
      action: () => console.log('Navigate to APD filing')
    },
    {
      id: 'payment-failures',
      title: 'Resolve Payment Failures',
      description: '3 failed payments need immediate attention',
      priority: 'critical',
      category: 'payment',
      icon: AlertTriangle,
      estimated_time: '20 min',
      action: () => console.log('Navigate to payment failures')
    }
  ];

  const mockDailyMetrics: DashboardMetric[] = [
    {
      id: 'total-labor-cost',
      title: 'Total Labor Cost (MTD)',
      value: '€142,350',
      previousValue: '€145,200',
      change: -2.0,
      changeType: 'positive',
      target: '€145,000',
      status: 'healthy',
      drilldownUrl: '/analytics/labor-costs',
      description: 'Monthly labor costs tracking under budget',
      category: 'financial'
    },
    {
      id: 'active-employees',
      title: 'Active Employees',
      value: 45,
      previousValue: 44,
      change: 2.3,
      changeType: 'positive',
      status: 'healthy',
      drilldownUrl: '/employees',
      description: '2 new hires this month',
      category: 'workforce'
    },
    {
      id: 'overtime-variance',
      title: 'Overtime Variance',
      value: '+12.5%',
      target: '±5%',
      status: 'warning',
      drilldownUrl: '/analytics/overtime',
      description: 'Above target variance range',
      category: 'operational'
    },
    {
      id: 'compliance-score',
      title: 'Compliance Score',
      value: '94.5%',
      target: '95%',
      change: -1.2,
      changeType: 'negative',
      status: 'warning',
      drilldownUrl: '/compliance/dashboard',
      description: 'Minor gaps in government system sync',
      category: 'compliance'
    },
    {
      id: 'payroll-accuracy',
      title: 'Payroll Accuracy',
      value: '99.8%',
      previousValue: '99.6%',
      change: 0.2,
      changeType: 'positive',
      status: 'healthy',
      drilldownUrl: '/payroll/quality',
      description: 'Improved error detection',
      category: 'operational'
    },
    {
      id: 'payment-success-rate',
      title: 'Payment Success Rate',
      value: '97.2%',
      change: -0.8,
      changeType: 'negative',
      status: 'warning',
      drilldownUrl: '/payments/analysis',
      description: '3 payment failures this week',
      category: 'financial'
    }
  ];

  const mockPendingIssues: PendingIssue[] = [
    {
      id: 'ergani-sync-errors',
      title: 'Government System Sync Errors',
      description: '3 employees have data sync issues preventing submission',
      severity: 'critical',
      affectedCount: 3,
      category: 'Compliance',
      actionRequired: true,
      estimatedResolutionTime: '30 min'
    },
    {
      id: 'missing-timesheets',
      title: 'Missing Timesheets',
      description: '5 employees haven\'t submitted timesheets for current period',
      severity: 'warning',
      affectedCount: 5,
      category: 'Time Tracking',
      actionRequired: true,
      estimatedResolutionTime: '15 min'
    }
  ];

  const handleDrillDown = (url: string) => {
    console.log(`Navigate to: ${url}`);
    // In real app: navigate(url);
  };

  const handleQuickAction = (actionId: string) => {
    const action = mockActionItems.find(item => item.id === actionId);
    action?.action();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getMetricsByCategory = (category: string) => {
    return mockDailyMetrics.filter(metric => metric.category === category);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with View Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            Strategic Dashboard
          </h1>
          <p className="text-muted-foreground">
            Daily operational snapshot and action center
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Tabs value={dashboardView} onValueChange={(v) => setDashboardView(v as DashboardView)}>
            <TabsList>
              <TabsTrigger value="executive">Executive</TabsTrigger>
              <TabsTrigger value="operational">Operations</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-1" />
            Customize
          </Button>
        </div>
      </div>


      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Actions Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {mockActionItems.slice(0, 3).map((item) => (
              <div key={item.id} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.title}</span>
                </div>
                <Badge 
                  size="sm"
                  variant={item.priority === 'critical' ? 'destructive' : 'secondary'}
                >
                  {item.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">€142k</div>
            <p className="text-sm text-muted-foreground">Monthly Cost</p>
            <div className="text-xs text-green-600 mt-1">↓ 2% under budget</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">45</div>
            <p className="text-sm text-muted-foreground">Active Staff</p>
            <div className="text-xs text-blue-600 mt-1">+2 new hires</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">94.5%</div>
            <p className="text-sm text-muted-foreground">Compliance</p>
            <div className="text-xs text-yellow-600 mt-1">Minor gaps</div>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">3</div>
            <p className="text-sm text-muted-foreground">Issues</p>
            <div className="text-xs text-red-600 mt-1">Need attention</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Payroll for 24 employees processed</span>
              <span className="text-xs text-muted-foreground ml-auto">2h ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>Government system sync completed</span>
              <span className="text-xs text-muted-foreground ml-auto">4h ago</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>2 overtime requests approved</span>
              <span className="text-xs text-muted-foreground ml-auto">6h ago</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">24</div>
          <div className="text-sm text-muted-foreground">Employees in current payroll</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">€48,750</div>
          <div className="text-sm text-muted-foreground">Total payroll amount</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">3</div>
          <div className="text-sm text-muted-foreground">Filings due this month</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">7</div>
          <div className="text-sm text-muted-foreground">Pending approvals</div>
        </Card>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refresh: 30s
      </div>
    </div>
  );
}