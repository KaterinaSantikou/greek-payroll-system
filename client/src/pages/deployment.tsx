import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Rocket, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Users, 
  Settings,
  Upload,
  Shield,
  MapPin,
  Smartphone,
  Database,
  Monitor,
  Play,
  FileText,
  Wifi,
  UserCheck
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface DeploymentStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  category: 'data' | 'config' | 'hardware' | 'integration' | 'testing' | 'training';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies: string[];
  checklist: Array<{
    id: string;
    task: string;
    completed: boolean;
    notes?: string;
  }>;
}

interface DeploymentSite {
  id: string;
  propertyId: string;
  propertyName: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  departments: string[];
  employeeCount: number;
  kioskCount: number;
  status: 'planning' | 'in_progress' | 'completed' | 'failed';
  startDate?: string;
  completionDate?: string;
  progress: number;
  notes: string;
}

const DEPLOYMENT_STEPS: DeploymentStep[] = [
  {
    id: 'data_upload',
    title: 'Upload Employee & Master Data',
    description: 'Import properties, cost centers, earnings codes, and employee data',
    estimatedTime: '15-20 min',
    category: 'data',
    status: 'pending',
    dependencies: [],
    checklist: [
      { id: 'properties', task: 'Upload property master data', completed: false },
      { id: 'cost_centers', task: 'Configure cost centers per department', completed: false },
      { id: 'earnings_codes', task: 'Set up earnings codes (REG, OT1-3, NIGHT, SUNDAY, etc.)', completed: false },
      { id: 'employees', task: 'Import employee master data with AFM/AMKA', completed: false },
      { id: 'validation', task: 'Validate data integrity and Greek compliance', completed: false }
    ]
  },
  {
    id: 'policy_config',
    title: 'Define Policies & Rules',
    description: 'Configure breaks, overtime tiers, night bands, and geofences',
    estimatedTime: '10-15 min',
    category: 'config',
    status: 'pending',
    dependencies: ['data_upload'],
    checklist: [
      { id: 'break_rules', task: 'Set break policies (15min, 30min, lunch)', completed: false },
      { id: 'overtime_tiers', task: 'Configure OT tiers (25%, 50%, 75%)', completed: false },
      { id: 'night_bands', task: 'Define night shift time bands', completed: false },
      { id: 'geofences', task: 'Set up property geofences', completed: false },
      { id: 'cba_rules', task: 'Apply collective bargaining agreement rules', completed: false }
    ]
  },
  {
    id: 'hardware_provision',
    title: 'Provision Kiosks & QR Sets',
    description: 'Set up kiosk devices and bind to properties',
    estimatedTime: '20-25 min',
    category: 'hardware',
    status: 'pending',
    dependencies: ['policy_config'],
    checklist: [
      { id: 'kiosk_setup', task: 'Install and configure kiosk devices', completed: false },
      { id: 'qr_generation', task: 'Generate QR codes for departments', completed: false },
      { id: 'device_binding', task: 'Bind devices to specific properties', completed: false },
      { id: 'offline_sync', task: 'Test offline mode and sync capabilities', completed: false },
      { id: 'biometric_setup', task: 'Configure biometric verification (if enabled)', completed: false }
    ]
  },
  {
    id: 'integration_setup',
    title: 'Connect ERGANI II & Payroll API',
    description: 'Establish connections to external systems',
    estimatedTime: '15-20 min',
    category: 'integration',
    status: 'pending',
    dependencies: ['hardware_provision'],
    checklist: [
      { id: 'ergani_credentials', task: 'Configure ERGANI II credentials', completed: false },
      { id: 'ergani_test', task: 'Test ERGANI punch submission', completed: false },
      { id: 'payroll_sandbox', task: 'Connect to Payroll API sandbox', completed: false },
      { id: 'payroll_prod', task: 'Switch to Payroll API production', completed: false },
      { id: 'webhook_setup', task: 'Configure webhook notifications', completed: false }
    ]
  },
  {
    id: 'pilot_testing',
    title: 'Pilot with One Department',
    description: 'Test with limited scope before full rollout',
    estimatedTime: '10-15 min',
    category: 'testing',
    status: 'pending',
    dependencies: ['integration_setup'],
    checklist: [
      { id: 'dept_selection', task: 'Select pilot department', completed: false },
      { id: 'test_employees', task: 'Onboard test employees', completed: false },
      { id: 'punch_testing', task: 'Test punch in/out workflows', completed: false },
      { id: 'exception_review', task: 'Review and resolve exceptions', completed: false },
      { id: 'reports_validation', task: 'Validate timesheet reports', completed: false }
    ]
  },
  {
    id: 'go_live_training',
    title: 'Go Live & Train Supervisors',
    description: 'Full deployment and supervisor training',
    estimatedTime: '15-20 min',
    category: 'training',
    status: 'pending',
    dependencies: ['pilot_testing'],
    checklist: [
      { id: 'full_rollout', task: 'Enable all departments', completed: false },
      { id: 'supervisor_training', task: 'Train department supervisors', completed: false },
      { id: 'employee_orientation', task: 'Conduct employee orientation', completed: false },
      { id: 'support_docs', task: 'Provide support documentation', completed: false },
      { id: 'escalation_setup', task: 'Set up escalation procedures', completed: false }
    ]
  }
];

export default function DeploymentPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>(DEPLOYMENT_STEPS);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [deploymentSites, setDeploymentSites] = useState<DeploymentSite[]>([
    {
      id: 'site_1',
      propertyId: 'PRINCESS-FO',
      propertyName: 'Princess Hotel - Front Office',
      address: 'Mykonos, Greece',
      contactPerson: 'Maria Papadopoulos',
      contactEmail: 'maria.p@princess-hotel.gr',
      contactPhone: '+30 22890 12345',
      departments: ['Front Office', 'Concierge', 'Reception'],
      employeeCount: 25,
      kioskCount: 2,
      status: 'planning',
      progress: 0,
      notes: 'Initial deployment site - Front Office operations'
    },
    {
      id: 'site_2',
      propertyId: 'PRINCESS-HOUSE',
      propertyName: 'Princess Hotel - Housekeeping',
      address: 'Mykonos, Greece',
      contactPerson: 'Dimitris Kostas',
      contactEmail: 'dimitris.k@princess-hotel.gr',
      contactPhone: '+30 22890 12346',
      departments: ['Housekeeping', 'Laundry', 'Maintenance'],
      employeeCount: 40,
      kioskCount: 3,
      status: 'planning',
      progress: 0,
      notes: 'Second phase - Housekeeping and support services'
    }
  ]);

  // Redirect to home if not authenticated
  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     toast({
  //       title: "Unauthorized",
  //       description: "You are logged out. Logging in again...",
  //       variant: "destructive",
  //     });
  //     setTimeout(() => {
  //       window.location.href = "/api/login";
  //     }, 500);
  //     return;
  //   }
  // }, [isAuthenticated, isLoading, toast]);

  const updateStepStatus = (stepId: string, status: DeploymentStep['status']) => {
    setDeploymentSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const updateChecklistItem = (stepId: string, checklistId: string, completed: boolean) => {
    setDeploymentSteps(prev => prev.map(step => 
      step.id === stepId ? {
        ...step,
        checklist: step.checklist.map(item =>
          item.id === checklistId ? { ...item, completed } : item
        )
      } : step
    ));
  };

  const calculateStepProgress = (step: DeploymentStep) => {
    const completedItems = step.checklist.filter(item => item.completed).length;
    return (completedItems / step.checklist.length) * 100;
  };

  const calculateOverallProgress = () => {
    const totalSteps = deploymentSteps.length;
    const completedSteps = deploymentSteps.filter(step => step.status === 'completed').length;
    return (completedSteps / totalSteps) * 100;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      data: Database,
      config: Settings,
      hardware: Monitor,
      integration: Wifi,
      testing: Play,
      training: UserCheck,
    };
    const Icon = icons[category as keyof typeof icons] || Settings;
    return <Icon className="h-4 w-4" />;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      data: 'bg-blue-100 text-blue-800',
      config: 'bg-purple-100 text-purple-800',
      hardware: 'bg-green-100 text-green-800',
      integration: 'bg-orange-100 text-orange-800',
      testing: 'bg-yellow-100 text-yellow-800',
      training: 'bg-pink-100 text-pink-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Rocket className="h-8 w-8 text-primary" />
              Site Deployment Checklist
            </h1>
            <p className="text-muted-foreground mt-2">
              Systematic 60-90 minute deployment process for PayrollSync implementation
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{calculateOverallProgress().toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Overall Progress</div>
          </div>
        </div>

        <Tabs defaultValue="checklist" className="space-y-6">
          <TabsList>
            <TabsTrigger value="checklist">Deployment Checklist</TabsTrigger>
            <TabsTrigger value="sites">Site Management</TabsTrigger>
            <TabsTrigger value="templates">Templates & Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="checklist" className="space-y-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Deployment Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Progress</span>
                      <span>{calculateOverallProgress().toFixed(0)}%</span>
                    </div>
                    <Progress value={calculateOverallProgress()} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {deploymentSteps.map((step) => (
                      <div key={step.id} className="text-center">
                        <div className="flex justify-center mb-2">
                          {getStatusIcon(step.status)}
                        </div>
                        <div className="text-xs font-medium">{step.title}</div>
                        <div className="text-xs text-muted-foreground">{step.estimatedTime}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Steps */}
            <div className="space-y-4">
              {deploymentSteps.map((step, index) => (
                <Card key={step.id} className={cn(
                  "transition-all duration-200",
                  step.status === 'completed' && "border-green-200 bg-green-50/50",
                  step.status === 'in_progress' && "border-blue-200 bg-blue-50/50",
                  step.status === 'failed' && "border-red-200 bg-red-50/50"
                )}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {getCategoryIcon(step.category)}
                            {step.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(step.category)}>
                          {step.category}
                        </Badge>
                        <Badge variant="outline">{step.estimatedTime}</Badge>
                        {getStatusIcon(step.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Step Progress</span>
                          <span>{calculateStepProgress(step).toFixed(0)}%</span>
                        </div>
                        <Progress value={calculateStepProgress(step)} className="h-2" />
                      </div>

                      <div className="grid gap-3">
                        {step.checklist.map((item) => (
                          <div key={item.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={item.id}
                              checked={item.completed}
                              onCheckedChange={(checked) => 
                                updateChecklistItem(step.id, item.id, checked as boolean)
                              }
                            />
                            <Label 
                              htmlFor={item.id} 
                              className={cn(
                                "flex-1 text-sm",
                                item.completed && "line-through text-muted-foreground"
                              )}
                            >
                              {item.task}
                            </Label>
                          </div>
                        ))}
                      </div>

                      {step.dependencies.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Dependencies: {step.dependencies.join(', ')}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={step.status === 'in_progress' ? 'default' : 'outline'}
                          onClick={() => updateStepStatus(step.id, 'in_progress')}
                        >
                          Start Step
                        </Button>
                        <Button
                          size="sm"
                          variant={step.status === 'completed' ? 'default' : 'outline'}
                          onClick={() => updateStepStatus(step.id, 'completed')}
                        >
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sites" className="space-y-6">
            {/* Site Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Deployment Sites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {deploymentSites.map((site) => (
                    <Card key={site.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h3 className="font-semibold">{site.propertyName}</h3>
                          <p className="text-sm text-muted-foreground">{site.address}</p>
                          <div className="mt-2">
                            <Badge className={
                              site.status === 'completed' ? 'bg-green-100 text-green-800' :
                              site.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {site.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Contact:</span>
                            <span>{site.contactPerson}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Employees:</span>
                            <span>{site.employeeCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Kiosks:</span>
                            <span>{site.kioskCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Departments:</span>
                            <span>{site.departments.length}</span>
                          </div>
                        </div>

                        <div>
                          <div className="mb-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{site.progress}%</span>
                            </div>
                            <Progress value={site.progress} className="h-2" />
                          </div>
                          <Button size="sm" className="w-full">
                            Manage Deployment
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            {/* Templates & Documentation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Data Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Employee Master Data Template
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Property & Cost Center Template
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Earnings Codes Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Configuration Guides
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    ERGANI II Setup Guide
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Payroll API Integration
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Geofencing Configuration
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Training Materials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Supervisor Training Guide
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Employee Quick Start
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Troubleshooting Manual
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}