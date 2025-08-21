/**
 * Dashboard Customization Component
 * Allows users to customize their dashboard layout and metrics based on role
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Palette,
  Layout,
  Bell,
  Target,
  Users,
  DollarSign,
  FileText,
  Clock,
  AlertTriangle,
  TrendingUp,
  Building2
} from "lucide-react";

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'operational' | 'compliance' | 'workforce' | 'alerts';
  icon: any;
  enabled: boolean;
  position: number;
  size: 'small' | 'medium' | 'large';
  userRoles: string[];
  priority: 'high' | 'medium' | 'low';
}

interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  targetRole: string;
  widgets: string[];
  layout: 'compact' | 'detailed' | 'executive';
}

interface CustomizationProps {
  userRole: string;
  currentLayout: string[];
  onSaveCustomization: (layout: DashboardWidget[], preset?: string) => void;
}

export default function DashboardCustomizer({ 
  userRole, 
  currentLayout, 
  onSaveCustomization 
}: CustomizationProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [alertSettings, setAlertSettings] = useState({
    enableRealTime: true,
    enableEmail: false,
    enableDesktop: true,
    criticalOnly: false
  });

  // Available widgets based on user role
  const availableWidgets: DashboardWidget[] = [
    {
      id: 'action-items',
      title: 'Action Items',
      description: 'Critical tasks requiring immediate attention',
      category: 'alerts',
      icon: AlertTriangle,
      enabled: true,
      position: 1,
      size: 'large',
      userRoles: ['admin', 'hr_payroll', 'manager', 'payroll_clerk'],
      priority: 'high'
    },
    {
      id: 'labor-costs',
      title: 'Labor Cost Analysis',
      description: 'Real-time labor cost tracking vs budget',
      category: 'financial',
      icon: DollarSign,
      enabled: true,
      position: 2,
      size: 'medium',
      userRoles: ['admin', 'finance_director', 'manager'],
      priority: 'high'
    },
    {
      id: 'workforce-metrics',
      title: 'Workforce Metrics',
      description: 'Employee count, turnover, and staffing analysis',
      category: 'workforce',
      icon: Users,
      enabled: true,
      position: 3,
      size: 'medium',
      userRoles: ['admin', 'hr_payroll', 'manager'],
      priority: 'high'
    },
    {
      id: 'compliance-status',
      title: 'Compliance Dashboard',
      description: 'ERGANI, APD, and ΦΜΥ filing status',
      category: 'compliance',
      icon: FileText,
      enabled: true,
      position: 4,
      size: 'medium',
      userRoles: ['admin', 'hr_payroll', 'payroll_clerk'],
      priority: 'high'
    },
    {
      id: 'payroll-processing',
      title: 'Payroll Processing',
      description: 'Current payroll status and progress',
      category: 'operational',
      icon: Clock,
      enabled: true,
      position: 5,
      size: 'large',
      userRoles: ['admin', 'hr_payroll', 'payroll_clerk'],
      priority: 'high'
    },
    {
      id: 'overtime-analysis',
      title: 'Overtime Analysis',
      description: 'Overtime hours, variance, and cost analysis',
      category: 'operational',
      icon: TrendingUp,
      enabled: false,
      position: 6,
      size: 'small',
      userRoles: ['admin', 'manager', 'hr_payroll'],
      priority: 'medium'
    },
    {
      id: 'payment-status',
      title: 'Payment Status',
      description: 'Payment batches, success rates, and failures',
      category: 'financial',
      icon: Building2,
      enabled: false,
      position: 7,
      size: 'small',
      userRoles: ['admin', 'finance_director', 'payroll_clerk'],
      priority: 'medium'
    },
    {
      id: 'pending-issues',
      title: 'Pending Issues',
      description: 'Issues requiring attention and resolution',
      category: 'alerts',
      icon: AlertTriangle,
      enabled: false,
      position: 8,
      size: 'medium',
      userRoles: ['admin', 'hr_payroll', 'manager', 'payroll_clerk'],
      priority: 'medium'
    }
  ];

  // Role-based presets
  const dashboardPresets: DashboardPreset[] = [
    {
      id: 'ceo-executive',
      name: 'CEO Executive View',
      description: 'High-level financial and strategic metrics',
      targetRole: 'admin',
      widgets: ['action-items', 'labor-costs', 'workforce-metrics', 'compliance-status'],
      layout: 'executive'
    },
    {
      id: 'hr-operational',
      name: 'HR Operations',
      description: 'Employee-focused metrics and compliance tracking',
      targetRole: 'hr_payroll',
      widgets: ['action-items', 'payroll-processing', 'compliance-status', 'workforce-metrics', 'pending-issues'],
      layout: 'detailed'
    },
    {
      id: 'payroll-clerk',
      name: 'Payroll Processing',
      description: 'Detailed payroll processing and compliance view',
      targetRole: 'payroll_clerk',
      widgets: ['payroll-processing', 'action-items', 'compliance-status', 'payment-status'],
      layout: 'compact'
    },
    {
      id: 'finance-director',
      name: 'Financial Controller',
      description: 'Financial analysis and cost control focus',
      targetRole: 'finance_director',
      widgets: ['labor-costs', 'payment-status', 'action-items', 'overtime-analysis'],
      layout: 'executive'
    }
  ];

  useEffect(() => {
    // Initialize widgets based on user role
    const roleBasedWidgets = availableWidgets
      .filter(widget => widget.userRoles.includes(userRole))
      .map(widget => ({
        ...widget,
        enabled: widget.priority === 'high' // Enable high priority widgets by default
      }));
    
    setWidgets(roleBasedWidgets);
    
    // Set default preset based on role
    const defaultPreset = dashboardPresets.find(preset => preset.targetRole === userRole);
    if (defaultPreset) {
      setSelectedPreset(defaultPreset.id);
    }
  }, [userRole]);

  const handleWidgetToggle = (widgetId: string, enabled: boolean) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId ? { ...widget, enabled } : widget
    ));
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = dashboardPresets.find(p => p.id === presetId);
    
    if (preset) {
      setWidgets(prev => prev.map(widget => ({
        ...widget,
        enabled: preset.widgets.includes(widget.id)
      })));
    }
  };

  const handleSaveCustomization = () => {
    const enabledWidgets = widgets.filter(w => w.enabled);
    onSaveCustomization(enabledWidgets, selectedPreset);
  };

  const resetToDefault = () => {
    const defaultPreset = dashboardPresets.find(preset => preset.targetRole === userRole);
    if (defaultPreset) {
      handlePresetChange(defaultPreset.id);
    }
  };

  const getWidgetsByCategory = (category: string) => {
    return widgets.filter(widget => widget.category === category);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return DollarSign;
      case 'operational': return Clock;
      case 'compliance': return FileText;
      case 'workforce': return Users;
      case 'alerts': return AlertTriangle;
      default: return Settings;
    }
  };

  const CategoryCard = ({ category, title }: { category: string; title: string }) => {
    const categoryWidgets = getWidgetsByCategory(category);
    const IconComponent = getCategoryIcon(category);
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconComponent className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categoryWidgets.map((widget) => (
            <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={widget.enabled}
                  onCheckedChange={(enabled) => handleWidgetToggle(widget.id, !!enabled)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{widget.title}</h4>
                    <Badge variant={widget.priority === 'high' ? 'default' : 'secondary'} className="text-xs">
                      {widget.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{widget.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {widget.size}
                </Badge>
                {widget.enabled ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-1" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Customize Your Dashboard
          </DialogTitle>
          <DialogDescription>
            Personalize your dashboard to focus on the metrics and actions most important to your role.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="presets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="presets">Quick Presets</TabsTrigger>
            <TabsTrigger value="widgets">Widget Selection</TabsTrigger>
            <TabsTrigger value="alerts">Alert Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardPresets
                .filter(preset => preset.targetRole === userRole || preset.targetRole === 'admin')
                .map((preset) => (
                <Card 
                  key={preset.id}
                  className={`cursor-pointer transition-all ${
                    selectedPreset === preset.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handlePresetChange(preset.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{preset.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{preset.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Included Widgets:</div>
                      <div className="flex flex-wrap gap-1">
                        {preset.widgets.map((widgetId) => {
                          const widget = availableWidgets.find(w => w.id === widgetId);
                          return widget ? (
                            <Badge key={widgetId} variant="secondary" className="text-xs">
                              {widget.title}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="widgets" className="space-y-6">
            <div className="space-y-6">
              <CategoryCard category="alerts" title="Action Items & Alerts" />
              <CategoryCard category="financial" title="Financial Metrics" />
              <CategoryCard category="operational" title="Operational Metrics" />
              <CategoryCard category="compliance" title="Compliance Tracking" />
              <CategoryCard category="workforce" title="Workforce Analytics" />
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Alert Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Real-time Dashboard Alerts</h4>
                    <p className="text-sm text-muted-foreground">Show real-time alerts on dashboard</p>
                  </div>
                  <Checkbox
                    checked={alertSettings.enableRealTime}
                    onCheckedChange={(checked) => 
                      setAlertSettings(prev => ({ ...prev, enableRealTime: !!checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-muted-foreground">Receive email alerts for critical issues</p>
                  </div>
                  <Checkbox
                    checked={alertSettings.enableEmail}
                    onCheckedChange={(checked) => 
                      setAlertSettings(prev => ({ ...prev, enableEmail: !!checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Desktop Notifications</h4>
                    <p className="text-sm text-muted-foreground">Show browser notifications</p>
                  </div>
                  <Checkbox
                    checked={alertSettings.enableDesktop}
                    onCheckedChange={(checked) => 
                      setAlertSettings(prev => ({ ...prev, enableDesktop: !!checked }))
                    }
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Critical Alerts Only</h4>
                    <p className="text-sm text-muted-foreground">Only show high-priority alerts</p>
                  </div>
                  <Checkbox
                    checked={alertSettings.criticalOnly}
                    onCheckedChange={(checked) => 
                      setAlertSettings(prev => ({ ...prev, criticalOnly: !!checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetToDefault}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset to Default
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleSaveCustomization}>
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}