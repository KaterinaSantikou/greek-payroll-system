import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  Search,
  ChevronDown,
  ChevronRight,
  Command,
  Home,
  Users,
  Clock,
  Shield,
  BarChart3,
  CreditCard,
  Building2,
  Settings,
  Menu,
  X
} from "lucide-react";

interface NavigationItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavigationItem[];
  badge?: string;
}

interface BreadcrumbItem {
  title: string;
  path?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: <Home className="w-4 h-4" />,
    path: '/manager-dashboard'
  },
  {
    id: 'people',
    title: 'People',
    icon: <Users className="w-4 h-4" />,
    children: [
      {
        id: 'employees',
        title: 'Employee Directory',
        icon: <Users className="w-4 h-4" />,
        path: '/employees'
      },
      {
        id: 'employee-master',
        title: 'Employee Master',
        icon: <Users className="w-4 h-4" />,
        path: '/employee-master'
      },
      {
        id: 'employee-self-service',
        title: 'Self Service',
        icon: <Users className="w-4 h-4" />,
        path: '/employee-self-service'
      }
    ]
  },
  {
    id: 'time',
    title: 'Time & Attendance',
    icon: <Clock className="w-4 h-4" />,
    children: [
      {
        id: 'schedules',
        title: 'Schedules',
        icon: <Clock className="w-4 h-4" />,
        path: '/schedules'
      },
      {
        id: 'overtime',
        title: 'Overtime',
        icon: <Clock className="w-4 h-4" />,
        path: '/overtime',
        badge: '12'
      },
      {
        id: 'leave',
        title: 'Leave Management',
        icon: <Clock className="w-4 h-4" />,
        path: '/leave'
      },
      {
        id: 'digital-work-card',
        title: 'Digital Work Cards',
        icon: <Clock className="w-4 h-4" />,
        path: '/digital-work-card'
      }
    ]
  },
  {
    id: 'compliance',
    title: 'Live Compliance',
    icon: <Shield className="w-4 h-4" />,
    children: [
      {
        id: 'ergani-compliance',
        title: 'ERGANI',
        icon: <Shield className="w-4 h-4" />,
        children: [
          {
            id: 'ergani-overview',
            title: 'Overview',
            icon: <Shield className="w-4 h-4" />,
            path: '/ergani-compliance'
          },
          {
            id: 'ergani-overtime',
            title: 'Overtime',
            icon: <Clock className="w-4 h-4" />,
            path: '/ergani-compliance/overtime'
          },
          {
            id: 'ergani-exceptions',
            title: 'Exceptions',
            icon: <Shield className="w-4 h-4" />,
            path: '/ergani-compliance/exceptions',
            badge: '3'
          }
        ]
      },
      {
        id: 'compliance-general',
        title: 'General Compliance',
        icon: <Shield className="w-4 h-4" />,
        path: '/compliance'
      },
      {
        id: 'legal',
        title: 'Legal & Documentation',
        icon: <Shield className="w-4 h-4" />,
        path: '/legal'
      }
    ]
  },
  {
    id: 'insights',
    title: 'Cost Insights',
    icon: <BarChart3 className="w-4 h-4" />,
    children: [
      {
        id: 'analytics',
        title: 'Analytics',
        icon: <BarChart3 className="w-4 h-4" />,
        path: '/analytics'
      },
      {
        id: 'allowances',
        title: 'Allowances',
        icon: <BarChart3 className="w-4 h-4" />,
        path: '/allowances'
      },
      {
        id: 'forecasting',
        title: 'Forecasting',
        icon: <BarChart3 className="w-4 h-4" />,
        path: '/forecasting'
      }
    ]
  },
  {
    id: 'payroll-finance',
    title: 'Payroll & Finance',
    icon: <CreditCard className="w-4 h-4" />,
    children: [
      {
        id: 'payroll',
        title: 'Payroll Processing',
        icon: <CreditCard className="w-4 h-4" />,
        path: '/payroll'
      },
      {
        id: 'payments',
        title: 'Payments',
        icon: <CreditCard className="w-4 h-4" />,
        path: '/payments'
      },
      {
        id: 'sepa-payments',
        title: 'SEPA Payments',
        icon: <CreditCard className="w-4 h-4" />,
        path: '/sepa-payments'
      }
    ]
  },
  {
    id: 'hotel-operations',
    title: 'Hotel Operations',
    icon: <Building2 className="w-4 h-4" />,
    children: [
      {
        id: 'hotel-operations-main',
        title: 'Operations Overview',
        icon: <Building2 className="w-4 h-4" />,
        path: '/hotel-operations'
      },
      {
        id: 'hotel-tip-pooling',
        title: 'Tip Pooling',
        icon: <Building2 className="w-4 h-4" />,
        path: '/hotel-tip-pooling'
      }
    ]
  },
  {
    id: 'platform',
    title: 'Platform',
    icon: <Settings className="w-4 h-4" />,
    children: [
      {
        id: 'ux-architecture',
        title: 'UX Roadmap',
        icon: <Settings className="w-4 h-4" />,
        path: '/ux-architecture'
      },
      {
        id: 'enterprise-architecture',
        title: 'Enterprise Architecture',
        icon: <Settings className="w-4 h-4" />,
        path: '/enterprise-architecture'
      }
    ]
  }
];

// Command palette search items
const commandItems = [
  // Employees
  { id: 'emp-maria', title: 'Maria Papadopoulou', category: 'Employees', action: '/employees/maria', keywords: ['employee', 'maria', 'staff'] },
  { id: 'emp-dimitris', title: 'Dimitris Kostas', category: 'Employees', action: '/employees/dimitris', keywords: ['employee', 'dimitris', 'staff'] },
  
  // Actions
  { id: 'run-payroll', title: 'Run Payroll', category: 'Actions', action: '/payroll/run', keywords: ['payroll', 'run', 'process'] },
  { id: 'run-payroll-aug', title: 'Run Payroll August', category: 'Actions', action: '/payroll/august', keywords: ['payroll', 'august', 'run'] },
  { id: 'approve-overtime', title: 'Approve Overtime', category: 'Actions', action: '/overtime/approve', keywords: ['overtime', 'approve'] },
  { id: 'file-apd', title: 'File APD', category: 'Actions', action: '/compliance/apd', keywords: ['apd', 'file', 'compliance'] },
  
  // Navigation
  { id: 'nav-dashboard', title: 'Dashboard', category: 'Navigate', action: '/manager-dashboard', keywords: ['dashboard', 'home'] },
  { id: 'nav-employees', title: 'Employee Directory', category: 'Navigate', action: '/employees', keywords: ['employees', 'directory', 'people'] },
  { id: 'nav-ergani', title: 'ERGANI Compliance', category: 'Navigate', action: '/ergani-compliance', keywords: ['ergani', 'compliance'] },
  { id: 'nav-overtime', title: 'Overtime Management', category: 'Navigate', action: '/overtime', keywords: ['overtime', 'time'] },
  
  // Recent
  { id: 'recent-payroll', title: 'January 2025 Payroll', category: 'Recent', action: '/payroll/january-2025', keywords: ['january', 'payroll', 'recent'] },
  { id: 'recent-ergani', title: 'ERGANI Sync Report', category: 'Recent', action: '/ergani-compliance/sync', keywords: ['ergani', 'sync', 'report'] }
];

export function Navigation() {
  const [location, navigate] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['dashboard']);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Handle keyboard shortcut for command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', path: '/manager-dashboard' }];
    
    if (location === '/manager-dashboard' || location === '/') {
      return breadcrumbs;
    }

    // Special breadcrumb handling for compliance sections
    if (location.includes('ergani-compliance')) {
      breadcrumbs.push({ title: 'ERGANI', path: '/ergani-compliance' });
      
      if (location.includes('/overtime')) {
        breadcrumbs.push({ title: 'Overtime', path: '/ergani-compliance/overtime' });
      } else if (location.includes('/exceptions')) {
        breadcrumbs.push({ title: 'Overtime', path: '/ergani-compliance/overtime' });
        breadcrumbs.push({ title: 'Exceptions' });
      }
    } else {
      // Standard breadcrumb generation
      pathSegments.forEach((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const title = segment.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        breadcrumbs.push({ title, path });
      });
    }

    return breadcrumbs;
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSections.includes(item.id);
    const isActive = item.path === location;
    
    if (hasChildren) {
      return (
        <Collapsible key={item.id} open={isOpen} onOpenChange={() => toggleSection(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-between h-10 px-3 ${level > 0 ? 'ml-4' : ''} ${
                isActive ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon}
                {!isCollapsed && <span className="text-sm">{item.title}</span>}
                {item.badge && !isCollapsed && (
                  <Badge variant="secondary" className="text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
              {!isCollapsed && (
                isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link key={item.id} href={item.path || '#'}>
        <Button
          variant="ghost"
          className={`w-full justify-start h-10 px-3 ${level > 0 ? 'ml-4' : ''} ${
            isActive ? 'bg-accent text-accent-foreground' : ''
          }`}
          onClick={() => setIsMobileOpen(false)}
        >
          <div className="flex items-center gap-2">
            {item.icon}
            {!isCollapsed && <span className="text-sm">{item.title}</span>}
            {item.badge && !isCollapsed && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
          </div>
        </Button>
      </Link>
    );
  };

  const filteredCommandItems = commandItems.filter(item =>
    item.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    item.keywords.some(keyword => keyword.toLowerCase().includes(searchValue.toLowerCase()))
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Side Navigation */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full bg-background border-r z-40 transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'} 
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            {!isCollapsed && (
              <h1 className="text-lg font-semibold">PayrollSync</h1>
            )}
            <div className="flex items-center gap-2">
              {isMobileOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileOpen(false)}
                  className="lg:hidden"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigationItems.map(item => renderNavigationItem(item))}
          </div>
        </div>
      </div>

      {/* Top Bar */}
      <div className="w-full bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Breadcrumbs */}
          <Breadcrumb>
            <BreadcrumbList>
              {generateBreadcrumbs().map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.path && index < generateBreadcrumbs().length - 1 ? (
                      <BreadcrumbLink href={crumb.path}>
                        {crumb.title}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-64 pl-8"
                onFocus={() => setCommandOpen(true)}
              />
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2"
            >
              <Command className="w-4 h-4" />
              <span className="text-xs">⌘K</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Actions">
            {filteredCommandItems
              .filter(item => item.category === 'Actions')
              .map(item => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    navigate(item.action);
                    setCommandOpen(false);
                  }}
                >
                  {item.title}
                </CommandItem>
              ))
            }
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Employees">
            {filteredCommandItems
              .filter(item => item.category === 'Employees')
              .map(item => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    navigate(item.action);
                    setCommandOpen(false);
                  }}
                >
                  {item.title}
                </CommandItem>
              ))
            }
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Navigate">
            {filteredCommandItems
              .filter(item => item.category === 'Navigate')
              .map(item => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    navigate(item.action);
                    setCommandOpen(false);
                  }}
                >
                  {item.title}
                </CommandItem>
              ))
            }
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Recent">
            {filteredCommandItems
              .filter(item => item.category === 'Recent')
              .map(item => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    navigate(item.action);
                    setCommandOpen(false);
                  }}
                >
                  {item.title}
                </CommandItem>
              ))
            }
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}