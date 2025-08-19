import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard,
  Users,
  User,
  UserPlus,
  UserMinus,
  Clock,
  CalendarDays,
  AlertTriangle,
  Timer,
  Smartphone,
  Calculator,
  FileText,
  Building2,
  Euro,
  CreditCard,
  BookOpen,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  UserCheck,
  Shield,
  Receipt,
  DollarSign,
  PieChart,
  TrendingUp,
  Database,
  Zap,
  Briefcase
} from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string | number;
  urgent?: boolean;
  children?: NavigationItem[];
  roles?: string[];
}

interface StructuredNavigationProps {
  collapsed?: boolean;
  isMobile?: boolean;
  isTablet?: boolean;
}

export function StructuredNavigation({ collapsed = false, isMobile = false, isTablet = false }: StructuredNavigationProps) {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dashboard', 'people']));
  const { user } = useAuth();
  const { t } = useLocale();
  const userRole = user?.role || 'Employee';

  // Create structured navigation data
  const navigationGroups: NavigationItem[] = [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      href: '/',
      badge: '3'
    },
    {
      id: 'people',
      label: t('nav.people'),
      icon: Users,
      badge: '12',
      children: [
        {
          id: 'employees',
          label: t('nav.employees'),
          icon: User,
          href: '/employees',
          badge: '147'
        },
        {
          id: 'onboarding',
          label: t('nav.onboarding'),
          icon: UserPlus,
          href: '/onboarding',
          badge: '5',
          urgent: true
        },
        {
          id: 'exits',
          label: t('nav.exits'),
          icon: UserMinus,
          href: '/exits',
          badge: '2'
        },
        {
          id: 'teams-roles',
          label: t('nav.teams-roles'),
          icon: UserCheck,
          href: '/teams-roles'
        }
      ]
    },
    {
      id: 'time',
      label: t('nav.time'),
      icon: Clock,
      badge: '8',
      children: [
        {
          id: 'punches',
          label: t('nav.punches'),
          icon: Timer,
          href: '/punches',
          badge: '23'
        },
        {
          id: 'exceptions',
          label: t('nav.exceptions'),
          icon: AlertTriangle,
          href: '/exceptions',
          badge: '7',
          urgent: true
        },
        {
          id: 'schedules',
          label: t('nav.schedules'),
          icon: CalendarDays,
          href: '/schedules'
        },
        {
          id: 'overtime',
          label: t('nav.overtime'),
          icon: Clock,
          href: '/overtime',
          badge: '15'
        },
        {
          id: 'digital-work-card',
          label: t('nav.digital-work-card'),
          icon: Smartphone,
          href: '/digital-work-card'
        }
      ]
    },
    {
      id: 'payroll',
      label: t('nav.payroll'),
      icon: Calculator,
      badge: '1',
      children: [
        {
          id: 'runs',
          label: t('nav.runs'),
          icon: Zap,
          href: '/payroll',
          badge: '1',
          urgent: true
        },
        {
          id: 'components',
          label: t('nav.components'),
          icon: Building2,
          href: '/earnings-codes'
        },
        {
          id: 'bonuses',
          label: t('nav.bonuses'),
          icon: Euro,
          href: '/allowances'
        },
        {
          id: 'simulations',
          label: t('nav.simulations'),
          icon: BarChart3,
          href: '/payroll-preview'
        }
      ]
    },
    {
      id: 'filings',
      label: t('nav.filings'),
      icon: FileText,
      badge: '4',
      children: [
        {
          id: 'ergani',
          label: t('nav.ergani'),
          icon: Shield,
          href: '/filings/ergani',
          badge: '2',
          urgent: true
        },
        {
          id: 'efka-apd',
          label: t('nav.efka-apd'),
          icon: Receipt,
          href: '/filings/efka',
          badge: '1'
        },
        {
          id: 'aade-fmy',
          label: t('nav.aade-fmy'),
          icon: FileText,
          href: '/filings/aade'
        },
        {
          id: 'inspector-pack',
          label: t('nav.inspector-pack'),
          icon: Briefcase,
          href: '/filings/inspector',
          badge: '1'
        }
      ]
    },
    {
      id: 'payments',
      label: t('nav.payments'),
      icon: CreditCard,
      children: [
        {
          id: 'sepa',
          label: t('nav.sepa'),
          icon: Euro,
          href: '/sepa-payments'
        },
        {
          id: 'off-cycle',
          label: t('nav.off-cycle'),
          icon: DollarSign,
          href: '/payments'
        },
        {
          id: 'reconciliation',
          label: t('nav.reconciliation'),
          icon: BookOpen,
          href: '/payments'
        }
      ]
    },
    {
      id: 'accounting',
      label: t('nav.accounting'),
      icon: BookOpen,
      children: [
        {
          id: 'gl-export',
          label: t('nav.gl-export'),
          icon: Database,
          href: '/accounting'
        },
        {
          id: 'postings',
          label: t('nav.postings'),
          icon: FileText,
          href: '/accounting'
        }
      ]
    },
    {
      id: 'analytics',
      label: t('nav.analytics'),
      icon: BarChart3,
      children: [
        {
          id: 'cost-ot',
          label: t('nav.cost-ot'),
          icon: TrendingUp,
          href: '/analytics/cost-ot'
        },
        {
          id: 'absence-turnover',
          label: t('nav.absence-turnover'),
          icon: PieChart,
          href: '/analytics'
        },
        {
          id: 'custom-reports',
          label: t('nav.custom-reports'),
          icon: BarChart3,
          href: '/analytics'
        }
      ]
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: Settings,
      children: [
        {
          id: 'policies',
          label: t('nav.policies'),
          icon: Shield,
          href: '/settings'
        },
        {
          id: 'compliance',
          label: t('nav.compliance'),
          icon: FileText,
          href: '/compliance'
        },
        {
          id: 'integrations',
          label: t('nav.integrations'),
          icon: Zap,
          href: '/settings'
        }
      ]
    },
    {
      id: 'help',
      label: t('nav.help-audit'),
      icon: HelpCircle,
      children: [
        {
          id: 'guides',
          label: t('nav.guides'),
          icon: BookOpen,
          href: '/help'
        },
        {
          id: 'support',
          label: t('nav.support'),
          icon: HelpCircle,
          href: '/help'
        },
        {
          id: 'audit-log',
          label: t('nav.audit-log'),
          icon: FileText,
          href: '/help'
        }
      ]
    }
  ];

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
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const renderBadge = (badge?: string | number, urgent?: boolean) => {
    if (!badge) return null;
    
    // Determine badge type based on context
    const getBadgeClass = () => {
      if (urgent) return "bg-red-500 text-white"; // Danger for failures
      const numValue = typeof badge === 'string' ? parseInt(badge) : badge;
      if (numValue > 0 && numValue < 10) return "bg-amber-500 text-white"; // Warning for due items
      return "bg-blue-500 text-white"; // Info for counts
    };
    
    return (
      <div
        className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium min-w-[18px] h-[18px] flex items-center justify-center",
          getBadgeClass()
        )}
      >
        {badge}
      </div>
    );
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    // Check role-based access - simplified for demo
    const hasAccess = (sectionId: string, role: string) => {
      const restrictedSections = {
        'Employee': ['payroll', 'filings', 'payments', 'accounting'],
        'Manager': ['filings', 'payments', 'accounting'],
        'HR': ['payroll', 'payments', 'accounting'],
      };
      return !restrictedSections[role]?.includes(sectionId);
    };

    if (!hasAccess(item.id, userRole)) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const active = item.href ? isActive(item.href) : false;
    const disabled = false; // Can be dynamic based on user permissions or system state

    // Base button classes with all states
    const getButtonClasses = (isLeaf: boolean = false) => cn(
      // Base styles
      "w-full justify-start px-4 text-gray-700 dark:text-gray-200 transition-all duration-200 relative group",
      // Size based on level
      level === 0 ? "h-10 text-[15px] font-medium" : "h-9 text-[14px] ml-6",
      // Connector lines for children
      level > 0 && "before:absolute before:left-[-16px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200 dark:before:bg-gray-700",
      // Default state
      "hover:bg-gray-50 dark:hover:bg-gray-800/50",
      // Active state with accent bar
      active && "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 before:!absolute before:!left-0 before:!top-2 before:!bottom-2 before:!w-[3px] before:!bg-blue-600 before:!rounded-r-sm before:!z-10",
      // Focus ring for keyboard navigation
      "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none",
      // Disabled state
      disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
      // Collapsed mode adjustments
      collapsed && "px-2 justify-center"
    );

    // Render collapsible parent item
    if (hasChildren) {
      const triggerButton = (
        <Button
          variant="ghost"
          disabled={disabled}
          className={getButtonClasses(false)}
        >
          <div className="flex items-center flex-1 min-w-0">
            <item.icon className="h-6 w-6 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate ml-3">{item.label}</span>
                <div className="flex items-center gap-2 ml-auto">
                  {renderBadge(item.badge, item.urgent)}
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                  )}
                </div>
              </>
            )}
          </div>
        </Button>
      );

      return (
        <div key={item.id} className="mb-1">
          <Collapsible open={isExpanded} onOpenChange={() => !disabled && toggleSection(item.id)}>
            <CollapsibleTrigger asChild>
              {collapsed ? (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {triggerButton}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <div className="font-medium">{item.label}</div>
                      {item.badge && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.badge} items
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                triggerButton
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 pt-1">
              {item.children?.map((child) => renderNavigationItem(child, level + 1))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      );
    }

    // Render leaf item (with or without link)
    const leafButton = (
      <Button
        variant="ghost"
        disabled={disabled}
        className={getButtonClasses(true)}
      >
        <div className="flex items-center flex-1 min-w-0">
          <item.icon className="h-6 w-6 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="truncate ml-3">{item.label}</span>
              <div className="ml-auto">
                {renderBadge(item.badge, item.urgent)}
              </div>
            </>
          )}
        </div>
      </Button>
    );

    const buttonWithTooltip = collapsed ? (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {leafButton}
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="font-medium">{item.label}</div>
            {item.badge && (
              <div className="text-sm text-gray-500 mt-1">
                {item.urgent ? 'Urgent' : ''} {item.badge}
              </div>
            )}
            {/* Shortcuts can be added here if available */}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      leafButton
    );

    if (item.href) {
      return (
        <Link key={item.id} to={item.href} className="block mb-1">
          {buttonWithTooltip}
        </Link>
      );
    } else {
      return (
        <div key={item.id} className="block mb-1">
          {buttonWithTooltip}
        </div>
      );
    }

    // Leaf item
    if (item.href) {
      return (
        <Link key={item.id} to={item.href} className="block mb-1">
          <Button
          variant="ghost"
          className={cn(
            "w-full justify-start px-4 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative",
            level === 0 ? "h-10 text-[15px] font-medium" : "h-9 text-[14px] ml-6 before:absolute before:left-[-16px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200 dark:before:bg-gray-700",
            active && "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-blue-600 before:rounded-r-sm"
          )}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <item.icon className="h-6 w-6 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">{item.label}</span>
                {renderBadge(item.badge, item.urgent)}
              </>
            )}
          </div>
          </Button>
        </Link>
      );
    } else {
      return (
        <div key={item.id} className="block mb-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start px-4 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative",
              level === 0 ? "h-10 text-[15px] font-medium" : "h-9 text-[14px] ml-6 before:absolute before:left-[-16px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200 dark:before:bg-gray-700",
              active && "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-blue-600 before:rounded-r-sm"
            )}
          >
            <div className="flex items-center flex-1 min-w-0">
              <item.icon className="h-6 w-6 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate ml-3">{item.label}</span>
                  <div className="ml-auto">
                    {renderBadge(item.badge, item.urgent)}
                  </div>
                </>
              )}
            </div>
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Optional Header */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/api/placeholder/32/32" />
                <AvatarFallback className="text-xs font-medium bg-blue-100 text-blue-600">
                  PR
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  Princess Resort
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {userRole}
                </Badge>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-2">
        {navigationGroups.map((group, index) => (
          <div key={group.id}>
            {index > 0 && (
              <div className="h-px bg-gray-200 dark:bg-gray-700 mx-4 my-2" />
            )}
            {renderNavigationItem(group)}
          </div>
        ))}
      </div>
    </div>
  );
}