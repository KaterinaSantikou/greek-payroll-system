import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Banknote,
  FileCheck,
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
  badgeType?: 'info' | 'warning' | 'danger' | 'success';
  children?: NavigationItem[];
  roles?: string[];
}

interface StructuredNavigationProps {
  collapsed?: boolean;
  isMobile?: boolean;
  isTablet?: boolean;
}

// Utility function to truncate labels and provide tooltip
function truncateLabel(label: string, maxLength: number = 24): { truncated: string; isTruncated: boolean } {
  if (label.length <= maxLength) {
    return { truncated: label, isTruncated: false };
  }
  return { truncated: label.substring(0, maxLength - 1) + '…', isTruncated: true };
}

export function StructuredNavigation({ collapsed = false, isMobile = false, isTablet = false }: StructuredNavigationProps) {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dashboard', 'people']));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { user } = useAuth();
  const { t } = useLocale();
  const userRole = (user as any)?.role || 'Employee';
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Create structured navigation data
  const navigationGroups: NavigationItem[] = [
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
          label: t('nav.employees'),
          icon: User,
          href: '/employees',
          badge: '147',
          badgeType: 'info'
        },
        {
          id: 'onboarding',
          label: t('nav.onboarding'),
          icon: UserPlus,
          href: '/onboarding',
          badge: '5',
          urgent: true,
          badgeType: 'warning'
        },
        {
          id: 'exits',
          label: t('nav.exits'),
          icon: UserMinus,
          href: '/exits',
          badge: '2',
          urgent: true,
          badgeType: 'warning'
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
      children: [
        {
          id: 'punches',
          label: t('nav.punches'),
          icon: Timer,
          href: '/punches',
          badge: '23',
          badgeType: 'info'
        },
        {
          id: 'exceptions',
          label: t('nav.exceptions'),
          icon: AlertTriangle,
          href: '/exceptions',
          badge: '7',
          urgent: true,
          badgeType: 'danger'
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
          badge: '15',
          badgeType: 'info'
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
      icon: Banknote,
      children: [
        {
          id: 'runs',
          label: t('nav.runs'),
          icon: Zap,
          href: '/payroll',
          badge: '1',
          urgent: true,
          badgeType: 'warning'
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
      icon: FileCheck,
      children: [
        {
          id: 'ergani',
          label: t('nav.ergani'),
          icon: Shield,
          href: '/filings/ergani',
          badge: '2',
          urgent: true,
          badgeType: 'danger'
        },
        {
          id: 'efka-apd',
          label: t('nav.efka-apd'),
          icon: Receipt,
          href: '/filings/efka',
          badge: '1',
          urgent: true,
          badgeType: 'warning'
        },
        {
          id: 'aade-fmy',
          label: t('nav.aade-fmy'),
          icon: FileText,
          href: '/filings/aade',
          badge: '3',
          urgent: false,
          badgeType: 'warning'
        },
        {
          id: 'inspector-pack',
          label: t('nav.inspector-pack'),
          icon: Briefcase,
          href: '/filings/inspector',
          badge: '1',
          badgeType: 'info'
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
          href: '/payments',
          badge: '4',
          urgent: true,
          badgeType: 'warning'
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

  // Handle click with modifier keys
  const handleItemClick = useCallback((
    event: React.MouseEvent,
    href?: string,
    label?: string
  ) => {
    if (!href) return;

    // Ctrl/Cmd + Click for new tab
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      window.open(href, '_blank');
      return;
    }
  }, []);

  // Handle context menu
  const handleContextMenu = useCallback((
    event: React.MouseEvent,
    href?: string,
    label?: string
  ) => {
    if (!href) return;
    
    event.preventDefault();
    
    // Create simple context menu options
    const options = [
      {
        label: 'Pin to top',
        action: () => console.log('Pin to top:', label),
        shortcut: ''
      },
      {
        label: 'Copy link',
        action: () => {
          navigator.clipboard.writeText(window.location.origin + href);
        },
        shortcut: 'Ctrl+C'
      },
      {
        label: 'Open in new tab',
        action: () => window.open(href, '_blank'),
        shortcut: 'Ctrl+Click'
      }
    ];

    // Simple context menu implementation
    // In a real app, you'd use a proper context menu component
    const menuItems = options.map(option => 
      `${option.label}${option.shortcut ? ` (${option.shortcut})` : ''}`
    ).join('\n');
    
    // For demo, show alert - replace with actual context menu
    if (confirm(`Context Menu for "${label}":\n\n${menuItems}\n\nClick OK to copy link`)) {
      options[1].action(); // Copy link
    }
  }, []);

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  // Flatten navigation items for keyboard navigation
  const flattenItems = useCallback((items: NavigationItem[], level = 0): Array<{ item: NavigationItem, level: number, id: string }> => {
    const flattened: Array<{ item: NavigationItem, level: number, id: string }> = [];
    
    items.forEach(item => {
      // Check role-based access
      const hasAccess = (sectionId: string, role: string) => {
        const restrictedSections = {
          'Employee': ['payroll', 'filings', 'payments', 'accounting'],
          'Manager': ['filings', 'payments', 'accounting'],
          'HR': ['payroll', 'payments', 'accounting'],
        };
        return !restrictedSections[role]?.includes(sectionId);
      };

      if (hasAccess(item.id, userRole)) {
        flattened.push({ item, level, id: item.id });
        
        // Add children if expanded
        if (item.children && expandedSections.has(item.id)) {
          flattened.push(...flattenItems(item.children, level + 1));
        }
      }
    });
    
    return flattened;
  }, [userRole, expandedSections]);

  const flatItems = flattenItems(navigationGroups);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentItem = flatItems[focusedIndex];
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'ArrowRight':
        if (currentItem?.item.children && !expandedSections.has(currentItem.item.id)) {
          e.preventDefault();
          toggleSection(currentItem.item.id);
        }
        break;
      case 'ArrowLeft':
        if (currentItem?.item.children && expandedSections.has(currentItem.item.id)) {
          e.preventDefault();
          toggleSection(currentItem.item.id);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(flatItems.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentItem?.item.href) {
          window.location.href = currentItem.item.href;
        } else if (currentItem?.item.children) {
          toggleSection(currentItem.item.id);
        }
        break;
    }
  }, [focusedIndex, flatItems, expandedSections, toggleSection]);

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < flatItems.length) {
      const itemId = flatItems[focusedIndex].id;
      const element = itemRefs.current.get(itemId);
      if (element) {
        element.focus();
      }
    }
  }, [focusedIndex, flatItems]);

  const renderBadge = (badge?: string | number, urgent?: boolean, label?: string, badgeType?: 'info' | 'warning' | 'danger' | 'success') => {
    if (!badge) return null;
    
    // Create ARIA label in Greek
    const getAriaLabel = () => {
      if (urgent) return `${badge} επείγοντα στοιχεία`;
      if (typeof badge === 'number' && badge === 1) return `1 στοιχείο`;
      return `${badge} στοιχεία`;
    };
    
    // Determine badge type based on context and explicit badgeType
    const getBadgeClass = () => {
      if (badgeType === 'danger') return "bg-red-500 text-white shadow-sm"; // Critical failures/rejects
      if (badgeType === 'warning') return "bg-amber-500 text-white shadow-sm"; // Due items/pending tasks
      if (badgeType === 'success') return "bg-green-500 text-white shadow-sm"; // Completed items
      if (badgeType === 'info') return "bg-slate-500 text-white shadow-sm"; // Inventory/info counts
      if (urgent) return "bg-red-500 text-white shadow-sm"; // Legacy urgent fallback
      return "bg-blue-500 text-white shadow-sm"; // Default counts
    };
    
    return (
      <div
        className={cn(
          "px-2 py-0.5 rounded-full text-xs font-semibold min-w-[20px] h-[20px] flex items-center justify-center",
          getBadgeClass()
        )}
        aria-label={getAriaLabel()}
        role="status"
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

    // Base button classes with all states and reduced motion support
    const getButtonClasses = (isLeaf: boolean = false) => cn(
      // Base styles
      "w-full justify-start px-4 text-gray-700 dark:text-gray-200 relative group",
      // Size and typography hierarchy
      level === 0 ? "h-12 text-base font-semibold" : "h-10 text-sm ml-8 font-medium",
      // Stronger connector lines for children
      level > 0 && "before:absolute before:left-[-20px] before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-300 dark:before:bg-gray-600",
      // Default state with motion preferences
      "hover:bg-gray-50 dark:hover:bg-gray-800/50",
      "transition-all motion-reduce:transition-none duration-200 motion-reduce:duration-0",
      // Stronger active state with accent bar
      active && "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold before:!absolute before:!left-0 before:!top-1 before:!bottom-1 before:!w-1 before:!bg-blue-600 before:!rounded-r-md before:!z-10 shadow-sm",
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
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) toggleSection(item.id);
          }}
          ref={(el) => {
            if (el) itemRefs.current.set(item.id, el);
          }}
          role="treeitem"
          aria-expanded={isExpanded}
          aria-current={active ? "page" : undefined}
          tabIndex={-1}
        >
          <div className="flex items-center flex-1 min-w-0">
            <item.icon className="h-6 w-6 flex-shrink-0" />
            {!collapsed && (
              <>
                {(() => {
                  const { truncated, isTruncated } = truncateLabel(item.label);
                  const labelSpan = <span className="truncate ml-3">{truncated}</span>;
                  return isTruncated ? (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {labelSpan}
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="font-medium">{item.label}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : labelSpan;
                })()}
                <div className="flex items-center gap-2 ml-auto">
                  {renderBadge(item.badge, item.urgent, item.label, item.badgeType)}
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-gray-500 transition-transform duration-200 motion-reduce:transition-none motion-reduce:duration-0",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )} 
                  />
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
              <div 
                onContextMenu={(e) => handleContextMenu(e, item.href, item.label)}
                className="w-full"
              >
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
                        <div className="text-xs text-gray-400 mt-1 pt-1 border-t">
                          Click to {isExpanded ? 'collapse' : 'expand'}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  triggerButton
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent 
              className="space-y-0.5 pt-1"
              role="group"
              aria-label={`${item.label} υποστοιχεία`}
            >
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
        onClick={(e) => item.href && handleItemClick(e, item.href, item.label)}
        onContextMenu={(e) => handleContextMenu(e, item.href, item.label)}
        ref={(el) => {
          if (el) itemRefs.current.set(item.id, el);
        }}
        role="treeitem"
        aria-current={active ? "page" : undefined}
        tabIndex={-1}
      >
        <div className="flex items-center flex-1 min-w-0">
          <item.icon className="h-6 w-6 flex-shrink-0" />
          {!collapsed && (
            <>
              {(() => {
                const { truncated, isTruncated } = truncateLabel(item.label);
                const labelSpan = <span className="truncate ml-3">{truncated}</span>;
                return isTruncated ? (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {labelSpan}
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="font-medium">{item.label}</div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : labelSpan;
              })()}
              <div className="ml-auto">
                {renderBadge(item.badge, item.urgent, item.label, item.badgeType)}
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
            {item.href && (
              <div className="text-xs text-gray-400 mt-1 pt-1 border-t">
                Ctrl+Click to open in new tab • Right-click for options
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      leafButton
    );

    if (item.href) {
      return (
        <Link 
          key={item.id} 
          to={item.href} 
          className="block mb-1"
          onClick={(e) => {
            // Handle modifier keys before Link navigation
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              window.open(item.href, '_blank');
            }
          }}
        >
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
    <nav 
      ref={navRef}
      className="flex flex-col h-full font-sans" 
      aria-label="Κύριο Μενού"
      role="tree"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => {
        if (focusedIndex === -1) {
          setFocusedIndex(0);
        }
      }}
    >
      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-4 px-2" role="none">
        {navigationGroups.map((group, index) => (
          <div key={group.id} role="none" className={index > 0 ? 'mt-6' : ''}>
            {renderNavigationItem(group)}
          </div>
        ))}
      </div>
    </nav>
  );
}