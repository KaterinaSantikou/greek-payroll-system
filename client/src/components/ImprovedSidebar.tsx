import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "./ui/badge";
import { SidebarSection, SidebarDivider } from "./ui/sidebar-section";
import { ProfileFooter } from "./ui/profile-footer";
import {
  LayoutDashboard,
  Users,
  Clock,
  Shield,
  TrendingUp,
  CreditCard,
  Building2,
  Settings,
  UserCog,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  FileText,
  Smartphone,
  Hotel,
  Briefcase,
  Target
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: {
    count: number;
    variant: "default" | "success" | "warning" | "error";
  };
  description?: string;
}

interface NavigationSection {
  title?: string;
  items: NavigationItem[];
}

const useNavigationSections = (): NavigationSection[] => {
  const { user } = useAuth();
  const isManager = user?.email?.includes("manager") || user?.firstName === "Manager";
  
  return [
    {
      title: "Dashboards",
      items: [
        {
          name: "Home Dashboard",
          href: "/",
          icon: LayoutDashboard,
          description: "Overview and quick actions"
        },
        ...(isManager ? [{
          name: "Manager Dashboard",
          href: "/manager-dashboard",
          icon: UserCog,
          description: "Team oversight and approvals"
        }] : [] as NavigationItem[]),
        {
          name: "Property Dashboard",
          href: "/property-dashboard",
          icon: Building2,
          description: "Property-specific metrics"
        }
      ]
    },
    {
      title: "People",
      items: [
        {
          name: "Employee Master",
          href: "/employee-master",
          icon: Users,
          description: "Employee records and profiles"
        },
        {
          name: "Employee Self-Service",
          href: "/employee-self-service",
          icon: Briefcase,
          description: "Personal HR actions"
        }
      ]
    },
    {
      title: "Time & Attendance",
      items: [
        {
          name: "Time Capture",
          href: "/advanced-time-capture",
          icon: Clock,
          description: "Punch tracking and schedules"
        },
        {
          name: "Mobile Punch",
          href: "/mobile-punch",
          icon: Smartphone,
          description: "Mobile time tracking"
        },
        {
          name: "Schedules",
          href: "/schedules",
          icon: Calendar,
          description: "Shift planning and rota"
        },
        {
          name: "Exceptions",
          href: "/overtime",
          icon: AlertTriangle,
          badge: {
            count: 3,
            variant: "warning"
          },
          description: "Time and attendance issues"
        },
        {
          name: "Leave Management",
          href: "/leave",
          icon: FileText,
          description: "Vacation and sick leave"
        }
      ]
    },
    {
      title: "Live Compliance",
      items: [
        {
          name: "Compliance Monitor",
          href: "/compliance",
          icon: Shield,
          badge: {
            count: 2,
            variant: "error"
          },
          description: "Real-time compliance status"
        },
        {
          name: "ERGANI Status",
          href: "/ergani-compliance",
          icon: CheckCircle,
          description: "Government submissions"
        },
        {
          name: "Legal Updates",
          href: "/change-log-legal-watch",
          icon: FileText,
          description: "Law changes and updates"
        }
      ]
    },
    {
      title: "Cost Insights",
      items: [
        {
          name: "Analytics",
          href: "/analytics",
          icon: BarChart3,
          description: "Labor cost analysis"
        },
        {
          name: "Visual Analytics",
          href: "/visual-analytics",
          icon: TrendingUp,
          description: "Charts and trends"
        },
        {
          name: "Forecasting",
          href: "/forecasting",
          icon: Target,
          description: "Predictive analytics"
        }
      ]
    },
    {
      title: "Payroll & Finance",
      items: [
        {
          name: "Payroll Processing",
          href: "/payroll-processing",
          icon: CreditCard,
          description: "Run and manage payroll"
        },
        {
          name: "SEPA Payments",
          href: "/sepa-payments",
          icon: CreditCard,
          description: "Banking and payments"
        },
        {
          name: "Success Metrics",
          href: "/success-metrics",
          icon: Target,
          description: "KPIs and performance"
        }
      ]
    },
    {
      title: "Hotel Operations",
      items: [
        {
          name: "Hotel Operations",
          href: "/hotel-operations",
          icon: Hotel,
          description: "Property-specific features"
        },
        {
          name: "Hotel Enhancements",
          href: "/hotel-enhancements",
          icon: Building2,
          description: "Advanced hotel features"
        },
        {
          name: "Tip Pooling",
          href: "/hotel-tip-pooling",
          icon: CreditCard,
          description: "Tip distribution management"
        }
      ]
    }
  ];
};

interface ImprovedSidebarProps {
  currentProperty: {
    name: string;
    propertyId: string;
  };
  userRole: string;
  onPropertyChange?: (propertyId: string) => void;
}

export function ImprovedSidebar({ 
  currentProperty, 
  userRole,
  onPropertyChange 
}: ImprovedSidebarProps) {
  const [location] = useLocation();
  const navigationSections = useNavigationSections();

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">PS</span>
          </div>
          <div>
            <h1 className="font-bold text-lg">PayrollSync</h1>
            <p className="text-xs text-muted-foreground">Greek HR Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-2">
        {navigationSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <SidebarSection title={section.title}>
              {section.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "mx-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer group relative",
                    location === item.href
                      ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100 shadow-sm border-l-4 border-blue-600 dark:border-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <div>
                          <div className={cn(
                            "font-medium text-sm",
                            location === item.href && "font-semibold"
                          )}>{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.badge && (
                        <Badge variant={item.badge.variant} className="ml-2">
                          {item.badge.count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </SidebarSection>
            {sectionIndex < navigationSections.length - 1 && <SidebarDivider />}
          </div>
        ))}
      </nav>

      {/* Profile Footer */}
      <ProfileFooter 
        currentProperty={currentProperty}
        userRole={userRole}
      />
    </div>
  );
}