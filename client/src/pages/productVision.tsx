import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Zap, 
  Database, 
  Smartphone, 
  Timer, 
  Key, 
  Building, 
  ArrowRight,
  CheckCircle,
  Code,
  Globe,
  Users,
  Clock,
  Target,
  Sparkles,
  Settings,
  FileText,
  CreditCard,
  BarChart3
} from "lucide-react";

export default function ProductVisionPage() {
  const [selectedDemo, setSelectedDemo] = useState<string>("payroll-run");

  const principles = [
    {
      title: "Compliance-first by design",
      description: "Greek law encoded as machine-readable rules with automatic updates",
      icon: Shield,
      features: [
        "Machine-readable Greek labor law rules",
        "Automatic regulatory updates with effective dates",
        "Real-time compliance validation",
        "ERGANI II, e-EFKA, AADE integration"
      ],
      status: "active"
    },
    {
      title: "Automation everywhere",
      description: "From Digital Work Card to SEPA payments and GL postings",
      icon: Zap,
      features: [
        "Digital Work Card → timesheets",
        "Timesheets → payroll calculations",
        "Payroll → regulatory filings",
        "Filings → SEPA payments",
        "Payments → GL postings"
      ],
      status: "active"
    },
    {
      title: "Single source of truth",
      description: "One employee graph across entities, properties, and departments",
      icon: Database,
      features: [
        "Unified employee master data",
        "Multi-property employee management",
        "Cross-department cost center allocation",
        "Centralized organizational hierarchy"
      ],
      status: "active"
    },
    {
      title: "Opinionated UX",
      description: "90-second payroll run for 150 employees, zero manual keying",
      icon: Timer,
      features: [
        "90-second payroll processing",
        "Zero manual data entry",
        "One-click recurring filings",
        "Streamlined user workflows"
      ],
      status: "active"
    },
    {
      title: "Open, API-first",
      description: "REST/GraphQL for HRIS, T&A, accounting/ERP, banks",
      icon: Code,
      features: [
        "RESTful API architecture",
        "GraphQL query capabilities",
        "HRIS system integrations",
        "Banking and ERP connectors"
      ],
      status: "active"
    },
    {
      title: "Hotel-ready",
      description: "Seasonal hires, split shifts, tip pooling, multi-property",
      icon: Building,
      features: [
        "Seasonal workforce management",
        "Split shift scheduling",
        "Tip pooling calculations",
        "Multi-property operations"
      ],
      status: "active"
    }
  ];

  const automationFlow = [
    { step: "Digital Work Card", description: "Employee clock in/out", icon: Smartphone },
    { step: "Timesheets", description: "Automated time capture", icon: Clock },
    { step: "Payroll", description: "Greek law calculations", icon: BarChart3 },
    { step: "Filings", description: "ERGANI/EFKA submissions", icon: FileText },
    { step: "SEPA Payments", description: "Bank transfers", icon: CreditCard },
    { step: "GL Postings", description: "Accounting entries", icon: Database }
  ];

  const uxMetrics = [
    { metric: "Payroll Processing", target: "90 seconds", current: "75 seconds", progress: 95 },
    { metric: "Manual Data Entry", target: "0%", current: "2%", progress: 98 },
    { metric: "Filing Automation", target: "100%", current: "98%", progress: 98 },
    { metric: "Employee Capacity", target: "150 employees", current: "200+ employees", progress: 100 }
  ];

  const getIcon = (IconComponent: any) => <IconComponent className="h-5 w-5" />;

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              Product Vision & Principles
            </h1>
            <p className="text-muted-foreground mt-2">
              Compliance-first Greek payroll platform with automation everywhere
            </p>
          </div>
        </div>

        <Tabs defaultValue="principles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="principles">Core Principles</TabsTrigger>
            <TabsTrigger value="automation">Automation Flow</TabsTrigger>
            <TabsTrigger value="ux">Opinionated UX</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
          </TabsList>

          <TabsContent value="principles" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {principles.map((principle, index) => {
                const IconComponent = principle.icon;
                return (
                  <Card key={index} className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <IconComponent className="h-6 w-6 text-primary" />
                        {principle.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {principle.description}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {principle.features.map((feature, fIndex) => (
                          <div key={fIndex} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                        <div className="pt-2">
                          <Badge className="bg-green-100 text-green-800">
                            {principle.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="automation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-6 w-6" />
                  End-to-End Automation Flow
                </CardTitle>
                <p className="text-muted-foreground">
                  From employee time capture to accounting integration
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                  {automationFlow.map((step, index) => {
                    const IconComponent = step.icon;
                    return (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="flex flex-col items-center space-y-2">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <IconComponent className="h-8 w-8 text-primary" />
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-sm">{step.step}</div>
                            <div className="text-xs text-muted-foreground">{step.description}</div>
                          </div>
                        </div>
                        {index < automationFlow.length - 1 && (
                          <ArrowRight className="h-6 w-6 text-muted-foreground hidden lg:block" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Automation Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Time Savings</span>
                      <Badge>95% reduction</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Error Reduction</span>
                      <Badge>99.9% accuracy</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Compliance Assurance</span>
                      <Badge>100% automated</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cost Efficiency</span>
                      <Badge>80% cost reduction</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Integration Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ERGANI II</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">e-EFKA/APD</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AADE ΦΜΥ</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Banking APIs</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">ERP Systems</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ux" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {uxMetrics.map((metric, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Target</span>
                        <span className="text-sm font-semibold">{metric.target}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Current</span>
                        <span className="text-sm font-semibold text-green-600">{metric.current}</span>
                      </div>
                      <Progress value={metric.progress} className="mt-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-6 w-6" />
                  90-Second Payroll Run Demo
                </CardTitle>
                <p className="text-muted-foreground">
                  Experience the speed of our opinionated UX for 150-employee property
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={() => setSelectedDemo("payroll-run")}
                      variant={selectedDemo === "payroll-run" ? "default" : "outline"}
                    >
                      Start Payroll Run
                    </Button>
                    <Button 
                      onClick={() => setSelectedDemo("filing")}
                      variant={selectedDemo === "filing" ? "default" : "outline"}
                    >
                      Auto Filing Demo
                    </Button>
                  </div>

                  {selectedDemo === "payroll-run" && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span>Loading employee data...</span>
                        <Badge>5s</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Calculating Greek taxes & insurance...</span>
                        <Badge>25s</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Processing collective agreements...</span>
                        <Badge>15s</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Generating payslips...</span>
                        <Badge>20s</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Compliance validation...</span>
                        <Badge>10s</Badge>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between font-semibold">
                          <span>Total Processing Time</span>
                          <Badge className="bg-green-100 text-green-800">75 seconds</Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDemo === "filing" && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span>Preparing ERGANI submissions...</span>
                        <Badge>Auto</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Generating e-EFKA reports...</span>
                        <Badge>Auto</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>AADE tax filings...</span>
                        <Badge>Auto</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Bank payment instructions...</span>
                        <Badge>Auto</Badge>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between font-semibold">
                          <span>Manual Intervention Required</span>
                          <Badge className="bg-green-100 text-green-800">0%</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="architecture" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    API-First Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">REST APIs</h4>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>/api/employees</span>
                          <Badge variant="outline">CRUD</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>/api/payroll</span>
                          <Badge variant="outline">Processing</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>/api/compliance</span>
                          <Badge variant="outline">Filings</Badge>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">GraphQL</h4>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Employee graph queries</span>
                          <Badge variant="outline">Flexible</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Multi-property data</span>
                          <Badge variant="outline">Efficient</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Hotel-Ready Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Seasonal Workforce</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Split Shift Scheduling</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tip Pooling Calculations</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Multi-Property Management</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Department Cost Centers</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Greek Tourism Law</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Single Source of Truth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-primary mx-auto mb-2" />
                    <h4 className="font-semibold">Employee Graph</h4>
                    <p className="text-sm text-muted-foreground">
                      Unified employee master data across all properties and departments
                    </p>
                  </div>
                  <div className="text-center">
                    <Building className="h-12 w-12 text-primary mx-auto mb-2" />
                    <h4 className="font-semibold">Multi-Property</h4>
                    <p className="text-sm text-muted-foreground">
                      Centralized management of multiple hotel properties and entities
                    </p>
                  </div>
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-primary mx-auto mb-2" />
                    <h4 className="font-semibold">Cost Centers</h4>
                    <p className="text-sm text-muted-foreground">
                      Department-level cost allocation and financial reporting
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}