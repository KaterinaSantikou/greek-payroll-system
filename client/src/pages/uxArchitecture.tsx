import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Home,
  Shield,
  BarChart,
  Users,
  Building2,
  Sparkles,
  ChevronRight,
  Smartphone,
  AlertTriangle,
  Clock,
  TrendingUp,
  Zap,
  Target,
  Activity,
  User,
  UserCheck,
  Gift,
  Rocket
} from "lucide-react";

const uxExample = {
  level1: [
    {
      name: "Dashboard",
      icon: Home,
      color: "bg-blue-500",
      description: "Central control hub with overview and management access",
      level2: [
        {
          name: "Overview",
          icon: Activity,
          description: "Main operational dashboards",
          level3: [
            { name: "Main Dashboard", path: "/", description: "Central control hub" },
            { name: "Manager Dashboard", path: "/manager-dashboard", description: "Management overview" },
            { name: "Employee Self-Service", path: "/employee-self-service", description: "Employee portal" }
          ]
        }
      ]
    },
    {
      name: "People",
      icon: Users,
      color: "bg-purple-500",
      description: "Employee management and workforce organization",
      level2: [
        {
          name: "Employees",
          icon: User,
          description: "Individual employee management",
          level3: [
            { name: "Profiles", path: "/employee-master", description: "Complete employee profiles" },
            { name: "Contracts", path: "/employees", description: "Employment contracts & terms" },
            { name: "Documents", path: "/legal", description: "Employee documentation" },
            { name: "Assignments", path: "/allowances", description: "Role & department assignments" }
          ]
        },
        {
          name: "Teams & Rotas",
          icon: Clock,
          description: "Schedule and team management",
          level3: [
            { name: "Builder", path: "/schedules", description: "Schedule creation tools" },
            { name: "Templates", path: "/leave", description: "Reusable schedule patterns" },
            { name: "Approvals", path: "/manager-workflows", description: "Schedule approval workflows" }
          ]
        }
      ]
    },
    {
      name: "Time",
      icon: Clock,
      color: "bg-cyan-500",
      description: "Time tracking and schedule management",
      level2: [
        {
          name: "Punches",
          icon: Smartphone,
          description: "Real-time punch tracking and corrections",
          level3: [
            { name: "Today", path: "/digital-work-card", description: "Real-time punch tracking" },
            { name: "Exceptions", path: "/advanced-time-capture", description: "Missing & invalid punches" },
            { name: "Corrections", path: "/manager-workflows", description: "Time correction approvals" }
          ]
        },
        {
          name: "Schedules",
          icon: Clock,
          description: "Schedule management and compliance",
          level3: [
            { name: "Publish", path: "/schedules", description: "Schedule publication & distribution" },
            { name: "Change Log", path: "/analytics", description: "Schedule modification history" },
            { name: "ERGANI Actions", path: "/ergani-compliance", description: "Ministry notification queue" }
          ]
        }
      ]
    },
    {
      name: "Live Compliance",
      icon: Shield,
      color: "bg-red-500",
      description: "Real-time compliance monitoring and government reporting",
      level2: [
        {
          name: "Digital Card Status",
          icon: Smartphone,
          description: "Real-time work card monitoring",
          level3: [
            { name: "Digital Work Card", path: "/digital-work-card", description: "Real-time tracking system" },
            { name: "Advanced Time Capture", path: "/advanced-time-capture", description: "Multi-method clock-in" }
          ]
        },
        {
          name: "ERGANI Queue",
          icon: AlertTriangle,
          description: "Ministry reporting queue",
          level3: [
            { name: "ERGANI II Compliance", path: "/ergani-compliance", description: "Ministry reporting" },
            { name: "Compliance Monitoring", path: "/compliance", description: "Regulatory oversight" }
          ]
        },
        {
          name: "APD & ΦΜΥ Deadlines",
          icon: Clock,
          description: "Tax and social security deadlines",
          level3: [
            { name: "Payroll Integration", path: "/payroll-integration", description: "System connectors" },
            { name: "Legal Documentation", path: "/legal", description: "Compliance documents" }
          ]
        }
      ]
    },
    {
      name: "Cost Insights",
      icon: BarChart,
      color: "bg-green-500",
      description: "Predictive analytics and cost optimization",
      level2: [
        {
          name: "Labor Forecast",
          icon: TrendingUp,
          description: "Predictive workforce analytics",
          level3: [
            { name: "Analytics Dashboard", path: "/analytics", description: "Predictive analytics" },
            { name: "Success Metrics", path: "/success-metrics", description: "KPI monitoring" }
          ]
        },
        {
          name: "OT Heatmap",
          icon: Zap,
          description: "Overtime pattern analysis",
          level3: [
            { name: "Overtime Management", path: "/overtime", description: "Premium calculations" },
            { name: "Manager Workflows", path: "/manager-workflows", description: "Approval processes" }
          ]
        },
        {
          name: "Variance vs Budget",
          icon: Target,
          description: "Budget comparison and variance analysis",
          level3: [
            { name: "Payroll Engine", path: "/payroll", description: "Core calculations" },
            { name: "Modern Payroll", path: "/modern-payroll", description: "Next-gen platform" }
          ]
        }
      ]
    }
  ]
};

const uxPrinciples = [
  {
    title: "Contextual Organization",
    description: "Information is grouped by operational context rather than technical boundaries",
    icon: "🎯"
  },
  {
    title: "Progressive Disclosure",
    description: "Complex functionality is revealed in manageable layers",
    icon: "📊"
  },
  {
    title: "Task-Oriented Flow",
    description: "Navigation follows natural workflow patterns",
    icon: "🔄"
  },
  {
    title: "Visual Hierarchy",
    description: "Color coding and icons provide instant recognition",
    icon: "🎨"
  }
];

export default function UXArchitecture() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          UX Architecture — 3-Level Menu System
        </h1>
        <p className="text-lg text-neutral-600">
          Hierarchical navigation designed for operational efficiency and user comprehension
        </p>
      </div>

      {/* Architecture Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            Navigation Philosophy
          </CardTitle>
          <CardDescription>
            From broad operational areas to specific functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {uxPrinciples.map((principle, index) => (
              <div key={index} className="text-center p-4 border border-neutral-200 rounded-lg">
                <div className="text-2xl mb-2">{principle.icon}</div>
                <h3 className="font-semibold text-neutral-900 mb-2">{principle.title}</h3>
                <p className="text-sm text-neutral-600">{principle.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Example Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Example Navigation Structure</CardTitle>
          <CardDescription>
            Level 1 → Level 2 → Level 3 hierarchy in action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {uxExample.level1.map((level1, l1Index) => {
              const Level1Icon = level1.icon;
              
              return (
                <div key={l1Index} className="border border-neutral-200 rounded-lg p-6">
                  {/* Level 1 */}
                  <div className="flex items-center mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${level1.color}`}>
                      <Level1Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-neutral-900">{level1.name}</h3>
                      <p className="text-sm text-neutral-600">{level1.description}</p>
                    </div>
                    <Badge variant="outline">Level 1</Badge>
                  </div>

                  {/* Level 2 & 3 */}
                  <div className="ml-6 space-y-4">
                    {level1.level2.map((level2, l2Index) => {
                      const Level2Icon = level2.icon;
                      
                      return (
                        <div key={l2Index} className="border-l-2 border-neutral-200 pl-6">
                          {/* Level 2 */}
                          <div className="flex items-center mb-3">
                            <Level2Icon className="w-5 h-5 text-neutral-600 mr-3" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-neutral-800">{level2.name}</h4>
                              <p className="text-xs text-neutral-500">{level2.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">Level 2</Badge>
                          </div>

                          {/* Level 3 */}
                          <div className="ml-8 space-y-2">
                            {level2.level3.map((level3, l3Index) => (
                              <div key={l3Index} className="flex items-center text-sm">
                                <ChevronRight className="w-3 h-3 text-neutral-400 mr-2" />
                                <div className="flex-1">
                                  <span className="font-medium text-neutral-700">{level3.name}</span>
                                  <span className="text-neutral-500 ml-2">— {level3.description}</span>
                                </div>
                                <Badge variant="outline" className="text-xs ml-2">Level 3</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Benefits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              User Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Faster Navigation:</span> Logical grouping reduces search time
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Context Awareness:</span> Users understand where they are in the system
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Reduced Cognitive Load:</span> Progressive disclosure prevents overwhelm
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Task Efficiency:</span> Workflow-oriented organization
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Technical Implementation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">State Management:</span> Intelligent expansion based on current route
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Performance:</span> Lazy loading and efficient rendering
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Accessibility:</span> Proper ARIA labels and keyboard navigation
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium">Responsiveness:</span> Mobile-first collapsible design
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Current Navigation Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Implementation</CardTitle>
          <CardDescription>
            The new 3-level navigation is now active in the sidebar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-neutral-50 rounded-lg p-6 border-2 border-dashed border-neutral-300">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Navigation System Active
              </h3>
              <p className="text-neutral-600 mb-4">
                The hierarchical navigation is now implemented and can be experienced in the left sidebar.
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <Badge variant="outline">Dashboard</Badge>
                <Badge variant="outline">People</Badge>
                <Badge variant="outline">Time</Badge>
                <Badge variant="outline">Live Compliance</Badge>
                <Badge variant="outline">Cost Insights</Badge>
                <Badge variant="outline">Payroll & Finance</Badge>
                <Badge variant="outline">Hotel Operations</Badge>
                <Badge variant="outline">Platform</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}