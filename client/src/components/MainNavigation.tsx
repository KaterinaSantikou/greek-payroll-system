import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { getUserRole, canAccessSection } from "@/lib/roleBasedRouting";
import { useLocale } from "@/hooks/useLocale";
import { 
  LayoutDashboard,
  Users,
  Clock,
  Calculator,
  ChevronDown,
  ChevronRight,
  UserPlus,
  UserMinus,
  Building2,
  Target,
  AlertTriangle,
  Calendar,
  Timer,
  Shield,
  Smartphone,
  Play,
  Settings,
  Gift,
  BarChart3,
  FileSearch,
  Activity,
  FileText,
  CheckCircle
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href?: string;
  children?: NavigationItem[];
  badge?: string | number;
  urgent?: boolean;
}

// Create navigation data function that uses translations
const createNavigationData = (t: (key: string) => string): NavigationItem[] => [
  {
    id: 'dashboard',
    label: t('nav.dashboard'),
    icon: LayoutDashboard,
    href: '/'
  },
  {
    id: 'people',
    label: t('nav.people'),
    icon: Users,
    children: [
      {
        id: 'employees',
        label: 'Employees',
        icon: Users,
        href: '/employees',
        badge: '152'
      },
      {
        id: 'onboarding',
        label: 'Onboarding',
        icon: UserPlus,
        href: '/onboarding',
        badge: '3'
      },
      {
        id: 'exits',
        label: 'Exits',
        icon: UserMinus,
        href: '/exits'
      },
      {
        id: 'teams-roles',
        label: 'Teams & Roles',
        icon: Building2,
        href: '/teams-roles'
      }
    ]
  },
  {
    id: 'time',
    label: 'Time',
    icon: Clock,
    children: [
      {
        id: 'punches',
        label: 'Punches',
        icon: Target,
        href: '/punches',
        badge: '24'
      },
      {
        id: 'exceptions',
        label: 'Exceptions',
        icon: AlertTriangle,
        href: '/exceptions',
        badge: '11',
        urgent: true
      },
      {
        id: 'schedules',
        label: 'Schedules (Rotas)',
        icon: Calendar,
        href: '/schedules'
      },
      {
        id: 'overtime',
        label: 'Overtime',
        icon: Timer,
        href: '/overtime',
        badge: '7'
      },
      {
        id: 'digital-work-card',
        label: 'Digital Work Card',
        icon: Shield,
        href: '/digital-work-card'
      },
      {
        id: 'devices',
        label: 'Devices',
        icon: Smartphone,
        href: '/devices'
      }
    ]
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: Calculator,
    children: [
      {
        id: 'runs',
        label: 'Runs',
        icon: Play,
        href: '/payroll/runs'
      },
      {
        id: 'components',
        label: 'Components',
        icon: Settings,
        href: '/payroll/components'
      },
      {
        id: 'bonuses',
        label: 'Bonuses',
        icon: Gift,
        href: '/payroll/bonuses'
      },
      {
        id: 'simulations',
        label: 'Simulations',
        icon: BarChart3,
        href: '/payroll/simulations'
      },
      {
        id: 'audit',
        label: 'Audit',
        icon: FileSearch,
        href: '/payroll/audit'
      }
    ]
  },
  {
    id: 'filings',
    label: 'Filings',
    icon: FileText,
    children: [
      {
        id: 'ergani',
        label: 'ERGANI II',
        icon: Shield,
        href: '/filings/ergani'
      },
      {
        id: 'efka',
        label: 'e-EFKA / APD',
        icon: Building2,
        href: '/filings/efka'
      },
      {
        id: 'aade',
        label: 'AADE / ΦΜΥ',
        icon: Target,
        href: '/filings/aade'
      },
      {
        id: 'inspector',
        label: 'Inspector Pack',
        icon: FileSearch,
        href: '/filings/inspector'
      }
    ]
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: Calculator,
    children: [
      {
        id: 'salary-files',
        label: 'Salary Files (SEPA)',
        icon: Play,
        href: '/payments/salary-files'
      },
      {
        id: 'off-cycle',
        label: 'Off-Cycle / Corrections',
        icon: Timer,
        href: '/payments/off-cycle'
      },
      {
        id: 'reconciliation',
        label: 'Reconciliation',
        icon: CheckCircle,
        href: '/payments/reconciliation'
      }
    ]
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: BarChart3,
    children: [
      {
        id: 'gl-export',
        label: 'GL Export',
        icon: FileText,
        href: '/accounting/gl-export'
      },
      {
        id: 'postings',
        label: 'Postings',
        icon: Settings,
        href: '/accounting/postings'
      },
      {
        id: 'gl-reconciliation',
        label: 'GL Reconciliation',
        icon: Activity,
        href: '/accounting/reconciliation'
      }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    children: [
      {
        id: 'cost-ot',
        label: 'Cost & OT',
        icon: BarChart3,
        href: '/analytics/cost-ot'
      },
      {
        id: 'absence-turnover',
        label: 'Absence & Turnover',
        icon: Users,
        href: '/analytics/absence-turnover'
      },
      {
        id: 'custom-reports',
        label: 'Custom Reports',
        icon: FileText,
        href: '/analytics/custom-reports'
      }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    children: [
      {
        id: 'policies',
        label: 'Policies',
        icon: Shield,
        href: '/settings/policies'
      },
      {
        id: 'compliance',
        label: 'Compliance',
        icon: CheckCircle,
        href: '/settings/compliance'
      },
      {
        id: 'integrations',
        label: 'Integrations',
        icon: Settings,
        href: '/settings/integrations'
      },
      {
        id: 'security',
        label: 'Security',
        icon: Shield,
        href: '/settings/security'
      },
      {
        id: 'localization',
        label: 'Localization',
        icon: Settings,
        href: '/settings/localization'
      }
    ]
  },
  {
    id: 'help-audit',
    label: 'Help & Audit',
    icon: Activity,
    children: [
      {
        id: 'guides',
        label: 'Guides',
        icon: FileText,
        href: '/help/guides'
      },
      {
        id: 'support',
        label: 'Support',
        icon: Activity,
        href: '/help/support'
      },
      {
        id: 'audit-log',
        label: 'Audit Log',
        icon: Activity,
        href: '/help/audit-log'
      }
    ]
  }
];

interface MainNavigationProps {
  collapsed?: boolean;
}

export function MainNavigation({ collapsed = false }: MainNavigationProps) {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dashboard']));
  const { user } = useAuth();
  const userRole = getUserRole(user);
  const { t } = useLocale();
  
  const navigationData = createNavigationData(t);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  const getActiveSection = () => {
    for (const item of navigationData) {
      if (item.href && isActive(item.href)) return item.id;
      if (item.children) {
        for (const child of item.children) {
          if (child.href && isActive(child.href)) return item.id;
        }
      }
    }
    return null;
  };

  React.useEffect(() => {
    const activeSection = getActiveSection();
    if (activeSection) {
      setExpandedSections(prev => {
        const newSet = new Set(prev);
        newSet.add(activeSection);
        return newSet;
      });
    }
  }, [location]);

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const active = item.href ? isActive(item.href) : false;

    if (hasChildren) {
      return (
        <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleSection(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-between h-auto py-2 px-3 ${
                level === 0 ? 'font-medium' : 'text-sm'
              } ${collapsed ? 'px-2' : ''}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`h-4 w-4 ${level === 0 ? 'text-blue-600' : 'text-gray-500'}`} />
                {!collapsed && (
                  <span className={level === 0 ? 'font-medium' : 'text-sm'}>{item.label}</span>
                )}
              </div>
              {!collapsed && (
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge 
                      variant={item.urgent ? 'destructive' : 'secondary'} 
                      className="text-xs px-1.5 py-0"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </div>
              )}
            </Button>
          </CollapsibleTrigger>
          {!collapsed && (
            <CollapsibleContent className="space-y-1">
              <div className="ml-4 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                {item.children?.map(child => renderNavigationItem(child, level + 1))}
              </div>
            </CollapsibleContent>
          )}
        </Collapsible>
      );
    }

    const content = (
      <Button
        variant="ghost"
        className={`w-full justify-start h-auto py-2 px-3 ${
          active 
            ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-l-2 border-blue-600' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        } ${level === 0 ? 'font-medium' : 'text-sm'} ${collapsed ? 'px-2' : ''}`}
      >
        <div className="flex items-center gap-3 flex-1">
          <item.icon className={`h-4 w-4 ${
            active 
              ? 'text-blue-600' 
              : level === 0 
                ? 'text-blue-600' 
                : 'text-gray-500'
          }`} />
          {!collapsed && (
            <span className={level === 0 ? 'font-medium' : 'text-sm'}>{item.label}</span>
          )}
        </div>
        {!collapsed && item.badge && (
          <Badge 
            variant={item.urgent ? 'destructive' : active ? 'default' : 'secondary'} 
            className="text-xs px-1.5 py-0"
          >
            {item.badge}
          </Badge>
        )}
      </Button>
    );

    if (item.href) {
      return (
        <Link key={item.id} href={item.href}>
          {content}
        </Link>
      );
    }

    return <div key={item.id}>{content}</div>;
  };

  return (
    <nav className={`space-y-2 ${collapsed ? 'px-2' : 'px-4'}`}>
      {/* Navigation Header */}
      {!collapsed && (
        <div className="px-3 py-2">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Navigation
          </h2>
        </div>
      )}

      {/* Dashboard - Always visible */}
      {renderNavigationItem(navigationData[0])}
      
      {!collapsed && <Separator />}

      {/* Main Sections */}
      <div className="space-y-1">
        {navigationData.slice(1).map(section => renderNavigationItem(section))}
      </div>

      {/* Live Status */}
      {!collapsed && (
        <>
          <Separator />
          <div className="px-3 py-2 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Live Status
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ERGANI Sync
                </span>
                <span className="text-green-600 font-medium">98.0%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Devices Online
                </span>
                <span className="text-blue-600 font-medium">8/9</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  Exceptions
                </span>
                <span className="text-orange-600 font-medium">11</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quick Actions */}
      {!collapsed && (
        <>
          <Separator />
          <div className="px-3 py-2 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="space-y-1">
              <Button variant="outline" size="sm" className="w-full text-xs h-7">
                <UserPlus className="h-3 w-3 mr-1" />
                Quick Hire
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs h-7">
                <Play className="h-3 w-3 mr-1" />
                Run Payroll
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs h-7">
                <Activity className="h-3 w-3 mr-1" />
                View Analytics
              </Button>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}