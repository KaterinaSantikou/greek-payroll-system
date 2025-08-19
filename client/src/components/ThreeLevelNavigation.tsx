import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  ChevronRight,
  ChevronDown,
  Home,
  Shield,
  BarChart,
  Users,
  Calculator,
  Clock,
  Building2,
  Settings,
  Activity,
  TrendingUp,
  AlertTriangle,
  Zap,
  Target,
  Sparkles,
  CreditCard,
  User,
  UserCheck,
  Gift,
  Plane,
  Scale,
  Smartphone,
  Rocket,
  Play,
  ScrollText,
  TestTube
} from "lucide-react";

interface MenuLevel3Item {
  name: string;
  href: string;
  description?: string;
}

interface MenuLevel2Item {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuLevel3Item[];
}

interface MenuLevel1Item {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: MenuLevel2Item[];
}

const menuStructure: MenuLevel1Item[] = [
  {
    name: "Dashboard",
    icon: Home,
    color: "bg-blue-500",
    items: [
      {
        name: "Overview",
        icon: Activity,
        items: [
          { name: "Main Dashboard", href: "/", description: "Central control hub" },
          { name: "Manager Dashboard", href: "/manager-dashboard", description: "Management overview" },
          { name: "Employee Self-Service", href: "/employee-self-service", description: "Employee portal" },
        ]
      }
    ]
  },
  {
    name: "Time",
    icon: Clock,
    color: "bg-cyan-500",
    items: [
      {
        name: "Punches",
        icon: Smartphone,
        items: [
          { name: "Today", href: "/digital-work-card", description: "Real-time punch tracking" },
          { name: "Exceptions", href: "/advanced-time-capture", description: "Missing & invalid punches" },
          { name: "Corrections", href: "/manager-workflows", description: "Time correction approvals" },
        ]
      },
      {
        name: "Schedules",
        icon: Clock,
        items: [
          { name: "Publish", href: "/schedules", description: "Schedule publication & distribution" },
          { name: "Change Log", href: "/analytics", description: "Schedule modification history" },
          { name: "ERGANI Actions", href: "/ergani-compliance", description: "Ministry notification queue" },
        ]
      }
    ]
  },
  {
    name: "Live Compliance",
    icon: Shield,
    color: "bg-red-500",
    items: [
      {
        name: "Digital Card Status",
        icon: Smartphone,
        items: [
          { name: "Digital Work Card", href: "/digital-work-card", description: "Real-time tracking system" },
          { name: "Advanced Time Capture", href: "/advanced-time-capture", description: "Multi-method clock-in" },
        ]
      },
      {
        name: "ERGANI Queue",
        icon: AlertTriangle,
        items: [
          { name: "ERGANI II Compliance", href: "/ergani-compliance", description: "Ministry reporting" },
          { name: "Compliance Monitoring", href: "/compliance", description: "Regulatory oversight" },
        ]
      },
      {
        name: "APD & ΦΜΥ Deadlines",
        icon: Clock,
        items: [
          { name: "Payroll Integration", href: "/payroll-integration", description: "System connectors" },
          { name: "Legal Documentation", href: "/legal", description: "Compliance documents" },
        ]
      }
    ]
  },
  {
    name: "Cost Insights",
    icon: BarChart,
    color: "bg-green-500",
    items: [
      {
        name: "2025 KPI Targets",
        icon: Target,
        items: [
          { name: "KPI Dashboard", href: "/kpi-dashboard", description: "Critical 2025 success metrics" },
          { name: "Success Metrics", href: "/success-metrics", description: "Detailed KPI tracking" },
        ]
      },
      {
        name: "Labor Forecast",
        icon: TrendingUp,
        items: [
          { name: "Analytics Dashboard", href: "/analytics", description: "Predictive analytics" },
          { name: "Forecasting", href: "/forecasting", description: "AI-driven workforce planning" },
        ]
      },
      {
        name: "OT Heatmap",
        icon: Zap,
        items: [
          { name: "Overtime Management", href: "/overtime", description: "Premium calculations" },
          { name: "Manager Workflows", href: "/manager-workflows", description: "Approval processes" },
        ]
      },
      {
        name: "Variance vs Budget",
        icon: Target,
        items: [
          { name: "Payroll Engine", href: "/payroll", description: "Core calculations" },
          { name: "Modern Payroll", href: "/modern-payroll", description: "Next-gen platform" },
          { name: "Payroll Processing", href: "/payroll-processing", description: "Complete Greek payroll workflow" },
          { name: "Earnings Codes", href: "/earnings-codes", description: "REG & NIGHT_25 standardized system" },
        ]
      }
    ]
  },
  {
    name: "People",
    icon: Users,
    color: "bg-purple-500",
    items: [
      {
        name: "Employees",
        icon: User,
        items: [
          { name: "Profiles", href: "/employee-master", description: "Complete employee profiles" },
          { name: "Contracts", href: "/employees", description: "Employment contracts & terms" },
          { name: "Documents", href: "/legal", description: "Employee documentation" },
          { name: "Assignments", href: "/allowances", description: "Role & department assignments" },
        ]
      },
      {
        name: "Teams & Rotas",
        icon: Clock,
        items: [
          { name: "Builder", href: "/schedules", description: "Schedule creation tools" },
          { name: "Templates", href: "/leave", description: "Reusable schedule patterns" },
          { name: "Approvals", href: "/manager-workflows", description: "Schedule approval workflows" },
        ]
      }
    ]
  },
  {
    name: "Payroll & Finance",
    icon: Calculator,
    color: "bg-emerald-500",
    items: [
      {
        name: "Runs",
        icon: Play,
        items: [
          { name: "Draft", href: "/payroll", description: "Initial payroll calculations" },
          { name: "Validate", href: "/modern-payroll", description: "Compliance & accuracy checks" },
          { name: "Finalize", href: "/payments", description: "Lock & distribute payroll" },
          { name: "Post-Run Audit", href: "/analytics", description: "Reconciliation & reporting" },
        ]
      },
      {
        name: "Components",
        icon: Settings,
        items: [
          { name: "Earnings", href: "/allowances", description: "Basic pay & overtime" },
          { name: "Deductions", href: "/compliance", description: "Taxes & insurance" },
          { name: "Rates", href: "/overtime", description: "Hourly & premium rates" },
          { name: "Benefits in Kind", href: "/hotel-operations", description: "Non-cash benefits" },
        ]
      },
      {
        name: "Bonuses",
        icon: Gift,
        items: [
          { name: "Δώρο Πάσχα", href: "/payroll-integration", description: "Easter bonus calculation" },
          { name: "Χριστουγέννων", href: "/manager-workflows", description: "Christmas bonus calculation" },
          { name: "Επίδομα Άδειας", href: "/leave", description: "Vacation allowance calculation" },
        ]
      }
    ]
  },
  {
    name: "Payments",
    icon: CreditCard,
    color: "bg-teal-500",
    items: [
      {
        name: "Salary Files",
        icon: CreditCard,
        items: [
          { name: "Create SEPA", href: "/payments", description: "SEPA Direct Debit file generation" },
          { name: "Approvals", href: "/manager-workflows", description: "Payment approval workflow" },
          { name: "Bank Receipts", href: "/analytics", description: "Bank confirmation processing" },
        ]
      },
      {
        name: "Off-Cycle",
        icon: Zap,
        items: [
          { name: "Urgent", href: "/overtime", description: "Emergency payment processing" },
          { name: "Corrections", href: "/compliance", description: "Payroll error corrections" },
          { name: "Reversals", href: "/payroll-integration", description: "Payment reversal processing" },
        ]
      }
    ]
  },
  {
    name: "Accounting",
    icon: BarChart,
    color: "bg-purple-600",
    items: [
      {
        name: "Journal Export",
        icon: Settings,
        items: [
          { name: "Map", href: "/payroll", description: "Chart of accounts mapping" },
          { name: "Preview", href: "/analytics", description: "Journal entry preview" },
          { name: "Post", href: "/payments", description: "GL posting execution" },
        ]
      },
      {
        name: "Reconciliation",
        icon: Target,
        items: [
          { name: "Payroll vs GL", href: "/modern-payroll", description: "Payroll to GL reconciliation" },
          { name: "Variances", href: "/compliance", description: "Variance analysis & resolution" },
        ]
      }
    ]
  },
  {
    name: "Filings",
    icon: Scale,
    color: "bg-indigo-500",
    items: [
      {
        name: "ERGANI II",
        icon: UserCheck,
        items: [
          { name: "Hires", href: "/employee-master", description: "New employee notifications" },
          { name: "Schedules", href: "/schedules", description: "Work schedule submissions" },
          { name: "OT", href: "/overtime", description: "Overtime notifications" },
          { name: "Terminations", href: "/employees", description: "Employee departure forms" },
          { name: "Receipts", href: "/ergani-compliance", description: "Submission confirmations" },
        ]
      },
      {
        name: "e-EFKA/APD",
        icon: Shield,
        items: [
          { name: "Build", href: "/payroll", description: "Insurance contribution files" },
          { name: "Validate", href: "/compliance", description: "Data validation & checks" },
          { name: "Submit", href: "/payroll-integration", description: "Electronic submission" },
          { name: "Receipts", href: "/analytics", description: "Confirmation receipts" },
        ]
      },
      {
        name: "AADE/ΦΜΥ",
        icon: CreditCard,
        items: [
          { name: "Build File", href: "/payments", description: "Payroll tax file generation" },
          { name: "Merge", href: "/modern-payroll", description: "Multi-entity consolidation" },
          { name: "Submit", href: "/legal", description: "Tax authority submission" },
          { name: "Payment", href: "/manager-workflows", description: "Tax payment processing" },
        ]
      }
    ]
  },
  {
    name: "Hotel Operations",
    icon: Building2,
    color: "bg-orange-500",
    items: [
      {
        name: "Property Management",
        icon: Building2,
        items: [
          { name: "Hotel Operations", href: "/hotel-operations", description: "Multi-property tools" },
          { name: "Hotel Enhancements", href: "/hotel-enhancements", description: "Advanced features" },
          { name: "Tip Pooling", href: "/hotel-tip-pooling", description: "POS revenue allocation & distribution" },
        ]
      },
      {
        name: "Deployment",
        icon: Rocket,
        items: [
          { name: "Site Deployment", href: "/deployment", description: "Implementation tools" },
          { name: "Enterprise Architecture", href: "/enterprise-architecture", description: "System design" },
        ]
      }
    ]
  },
  {
    name: "Settings",
    icon: Settings,
    color: "bg-slate-500",
    items: [
      {
        name: "Policies",
        icon: Scale,
        items: [
          { name: "Overtime", href: "/overtime", description: "Overtime policy configuration" },
          { name: "Night", href: "/schedules", description: "Night shift premium rules" },
          { name: "Sunday/Holiday", href: "/leave", description: "Weekend & holiday rates" },
          { name: "Breaks", href: "/advanced-time-capture", description: "Break time policies" },
          { name: "Tips", href: "/hotel-operations", description: "Tip pooling & distribution" },
        ]
      },
      {
        name: "Compliance",
        icon: Shield,
        items: [
          { name: "Minimum Wage Tables", href: "/compliance", description: "Greek minimum wage rates" },
          { name: "Effective-Date Rules", href: "/legal", description: "Policy effective date management" },
        ]
      },
      {
        name: "Integrations",
        icon: Zap,
        items: [
          { name: "ERGANI", href: "/ergani-compliance", description: "Ministry of Labor connection" },
          { name: "EFKA", href: "/payroll-integration", description: "Social security integration" },
          { name: "AADE", href: "/payments", description: "Tax authority connection" },
          { name: "Banks", href: "/analytics", description: "Banking system integrations" },
          { name: "ERP", href: "/modern-payroll", description: "Enterprise system connectors" },
          { name: "SSO", href: "/manager-workflows", description: "Single sign-on configuration" },
        ]
      },
      {
        name: "Security",
        icon: UserCheck,
        items: [
          { name: "Roles", href: "/employees", description: "Role-based access control" },
          { name: "Data Retention", href: "/employee-master", description: "Data retention policies" },
          { name: "Audit Log", href: "/payroll", description: "System audit logging" },
        ]
      }
    ]
  },
  {
    name: "Platform",
    icon: Sparkles,
    color: "bg-indigo-500",
    items: [
      {
        name: "Vision & Strategy",
        icon: Target,
        items: [
          { name: "Product Vision", href: "/product-vision", description: "Platform roadmap" },
          { name: "UX Architecture", href: "/ux-architecture", description: "Navigation design" },
        ]
      },
      {
        name: "Change Management",
        icon: ScrollText,
        items: [
          { name: "Change Log & Legal Watch", href: "/changelog-legal-watch", description: "Versioned rule packs & legal monitoring" },
          { name: "Document AI", href: "/document-ai", description: "AI-powered document processing" },
          { name: "Forecasting", href: "/forecasting", description: "AI-driven workforce planning" },
        ]
      },
      {
        name: "ESRS S1 Compliance",
        icon: TestTube,
        items: [
          { name: "S1 Dashboard", href: "/s1-dashboard", description: "ESRS S1 sustainability metrics overview" },
          { name: "S1 Metrics", href: "/s1-metrics", description: "Detailed S1 calculations and reporting" },
          { name: "S1 Acceptance Testing", href: "/s1-acceptance-testing", description: "Validate dev ticket acceptance criteria" },
        ]
      }
    ]
  }
];

export default function ThreeLevelNavigation() {
  const [location] = useLocation();
  const [expandedLevel1, setExpandedLevel1] = useState<string[]>(() => {
    // Auto-expand based on current route
    const currentItem = menuStructure.find(level1 => 
      level1.items.some(level2 => 
        level2.items.some(level3 => level3.href === location)
      )
    );
    return currentItem ? [currentItem.name] : [];
  });
  const [expandedLevel2, setExpandedLevel2] = useState<string[]>(() => {
    // Auto-expand based on current route
    const expanded: string[] = [];
    menuStructure.forEach(level1 => {
      level1.items.forEach(level2 => {
        if (level2.items.some(level3 => level3.href === location)) {
          expanded.push(level2.name);
        }
      });
    });
    return expanded;
  });

  const toggleLevel1 = (itemName: string) => {
    setExpandedLevel1(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const toggleLevel2 = (itemName: string) => {
    setExpandedLevel2(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <nav className="space-y-2">
      {menuStructure.map((level1) => {
        const isLevel1Expanded = expandedLevel1.includes(level1.name);
        const Level1Icon = level1.icon;
        
        return (
          <div key={level1.name} className="space-y-1">
            {/* Level 1 */}
            <button
              onClick={() => toggleLevel1(level1.name)}
              className={cn(
                "w-full flex items-center px-3 py-2 rounded-lg text-left transition-all duration-200 group hover:bg-neutral-100",
                isLevel1Expanded && "bg-neutral-50"
              )}
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mr-3", level1.color)}>
                <Level1Icon className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-neutral-900 flex-1">{level1.name}</span>
              {isLevel1Expanded ? 
                <ChevronDown className="w-4 h-4 text-neutral-500" /> : 
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              }
            </button>

            {/* Level 2 & 3 */}
            {isLevel1Expanded && (
              <div className="ml-4 space-y-1">
                {level1.items.map((level2) => {
                  const isLevel2Expanded = expandedLevel2.includes(level2.name);
                  const Level2Icon = level2.icon;
                  
                  return (
                    <div key={level2.name} className="space-y-1">
                      {/* Level 2 */}
                      <button
                        onClick={() => toggleLevel2(level2.name)}
                        className={cn(
                          "w-full flex items-center px-3 py-2 rounded-md text-left transition-colors hover:bg-neutral-100 group",
                          isLevel2Expanded && "bg-neutral-50"
                        )}
                      >
                        <Level2Icon className="w-4 h-4 text-neutral-600 mr-3" />
                        <span className="font-medium text-neutral-800 flex-1">{level2.name}</span>
                        {isLevel2Expanded ? 
                          <ChevronDown className="w-3 h-3 text-neutral-400" /> : 
                          <ChevronRight className="w-3 h-3 text-neutral-400" />
                        }
                      </button>

                      {/* Level 3 */}
                      {isLevel2Expanded && (
                        <div className="ml-6 space-y-1">
                          {level2.items.map((level3) => {
                            const isActive = location === level3.href;
                            
                            return (
                              <Link key={level3.href} href={level3.href}>
                                <div className={cn(
                                  "flex flex-col px-3 py-2 rounded-md text-sm transition-colors group hover:bg-primary-50 cursor-pointer",
                                  isActive ? 
                                    "bg-primary-100 text-primary-700 border-l-2 border-primary-500" : 
                                    "text-neutral-700 hover:text-primary-600"
                                )}>
                                  <span className={cn(
                                    "font-medium",
                                    isActive && "text-primary-700"
                                  )}>
                                    {level3.name}
                                  </span>
                                  {level3.description && (
                                    <span className={cn(
                                      "text-xs text-neutral-500 mt-1",
                                      isActive && "text-primary-600"
                                    )}>
                                      {level3.description}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}