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
  Play
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
        name: "Labor Forecast",
        icon: TrendingUp,
        items: [
          { name: "Analytics Dashboard", href: "/analytics", description: "Predictive analytics" },
          { name: "Success Metrics", href: "/success-metrics", description: "KPI monitoring" },
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