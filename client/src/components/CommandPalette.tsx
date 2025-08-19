import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  User,
  Calendar,
  FileText,
  Settings,
  Play,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  CreditCard,
  Users,
  TrendingUp,
  Calculator,
  Shield,
  Zap,
  BookOpen,
  Archive,
  UserCheck,
  Briefcase,
  Hotel,
  Globe,
} from "lucide-react";

// Define action types and their metadata
const ACTION_TYPES = {
  NAVIGATE: { icon: Search, color: "blue", requiresConfirmation: false },
  PAYROLL_RUN: { icon: Play, color: "green", requiresConfirmation: true },
  FILE_SUBMISSION: { icon: Upload, color: "purple", requiresConfirmation: true },
  EMPLOYEE_ACTION: { icon: User, color: "blue", requiresConfirmation: false },
  REPORT_GENERATE: { icon: FileText, color: "orange", requiresConfirmation: false },
  SYSTEM_ACTION: { icon: Settings, color: "gray", requiresConfirmation: true },
};

// Define canonical command verbs and their mappings
const COMMAND_VERBS = {
  open: ["open", "show", "view", "display", "see"],
  run: ["run", "execute", "process", "start", "begin"],
  file: ["file", "submit", "send", "upload"],
  create: ["create", "add", "new", "make"],
  edit: ["edit", "update", "modify", "change"],
  delete: ["delete", "remove", "cancel"],
  download: ["download", "export", "get"],
  approve: ["approve", "accept", "confirm"],
  reject: ["reject", "deny", "decline"],
};

// Search index structure
interface SearchItem {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  keywords: string[];
  route?: string;
  action?: () => void | Promise<void>;
  actionType: keyof typeof ACTION_TYPES;
  requiresConfirmation: boolean;
  permissions?: string[];
  metadata?: Record<string, any>;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState<SearchItem | null>(null);
  const { toast } = useToast();

  // Fetch dynamic data for search index
  const { data: employees } = useQuery({
    queryKey: ['/api/employees'],
    enabled: open,
  });

  const { data: properties } = useQuery({
    queryKey: ['/api/properties'],
    enabled: open,
  });

  const { data: payrollRuns } = useQuery({
    queryKey: ['/api/payroll/runs'],
    enabled: open,
  });

  // Build unified search index
  const searchIndex = useMemo(() => {
    const items: SearchItem[] = [];

    // Navigation items
    const navigationItems: SearchItem[] = [
      {
        id: "nav-dashboard",
        title: "Dashboard",
        description: "View property dashboard and KPIs",
        type: "page",
        category: "Navigation",
        keywords: ["home", "overview", "summary", "metrics"],
        route: "/",
        actionType: "NAVIGATE",
        requiresConfirmation: false,
      },
      {
        id: "nav-employees",
        title: "Employees",
        description: "Manage employee records and contracts",
        type: "page",
        category: "Navigation",
        keywords: ["staff", "workers", "personnel", "team"],
        route: "/employees",
        actionType: "NAVIGATE",
        requiresConfirmation: false,
      },
      {
        id: "nav-payroll",
        title: "Payroll",
        description: "Process payroll and manage pay runs",
        type: "page",
        category: "Navigation",
        keywords: ["salary", "wages", "payment", "compensation"],
        route: "/payroll",
        actionType: "NAVIGATE",
        requiresConfirmation: false,
      },
      {
        id: "nav-time-tracking",
        title: "Time Tracking",
        description: "View schedules and time capture",
        type: "page",
        category: "Navigation",
        keywords: ["schedule", "hours", "attendance", "punch"],
        route: "/schedules",
        actionType: "NAVIGATE",
        requiresConfirmation: false,
      },
      {
        id: "nav-compliance",
        title: "Compliance",
        description: "ERGANI, EFKA, and legal compliance",
        type: "page",
        category: "Navigation",
        keywords: ["ergani", "efka", "legal", "filing", "government"],
        route: "/compliance",
        actionType: "NAVIGATE",
        requiresConfirmation: false,
      },
      {
        id: "nav-payments",
        title: "Payments",
        description: "SEPA payments and bank transfers",
        type: "page",
        category: "Navigation",
        keywords: ["sepa", "bank", "transfer", "payment"],
        route: "/payments",
        actionType: "NAVIGATE",
        requiresConfirmation: false,
      },
    ];

    items.push(...navigationItems);

    // Employee-specific actions
    if (Array.isArray(employees) && employees.length) {
      employees.slice(0, 20).forEach((employee: any) => {
        const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.name;
        items.push({
          id: `employee-${employee.employeeId}`,
          title: `${fullName}'s Profile`,
          description: `Open employee record for ${fullName}`,
          type: "employee",
          category: "Employees",
          keywords: [fullName, employee.employeeNumber, "profile", "contract", "record"],
          route: `/employee-master?id=${employee.employeeId}`,
          actionType: "EMPLOYEE_ACTION",
          requiresConfirmation: false,
          metadata: { employeeId: employee.employeeId, name: fullName },
        });

        items.push({
          id: `employee-contract-${employee.employeeId}`,
          title: `${fullName}'s Contract`,
          description: `View employment contract for ${fullName}`,
          type: "contract",
          category: "Employees",
          keywords: [fullName, "contract", "agreement", "employment"],
          actionType: "EMPLOYEE_ACTION",
          requiresConfirmation: false,
          metadata: { employeeId: employee.employeeId, name: fullName },
          action: async () => {
            toast({
              title: "Opening Contract",
              description: `Loading employment contract for ${fullName}`,
            });
            // Implementation would fetch and display contract
          },
        });
      });
    }

    // Payroll run actions
    const currentMonth = new Date().toISOString().slice(0, 7);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    months.forEach((month, index) => {
      const monthIndex = String(index + 1).padStart(2, '0');
      const year = new Date().getFullYear();
      const monthYear = `${year}-${monthIndex}`;
      
      items.push({
        id: `payroll-run-${monthYear}`,
        title: `Run Payroll ${month} ${year}`,
        description: `Process payroll for ${month} ${year}`,
        type: "payroll-run",
        category: "Payroll",
        keywords: ["payroll", "run", month.toLowerCase(), String(year), "process"],
        actionType: "PAYROLL_RUN",
        requiresConfirmation: true,
        action: async () => {
          toast({
            title: "Payroll Processing",
            description: `Starting payroll run for ${month} ${year}`,
          });
          // Implementation would trigger payroll processing
        },
      });
    });

    // Filing actions
    const filingTypes = [
      { code: "APD", name: "APD Social Security Filing", keywords: ["apd", "social", "security", "efka"] },
      { code: "FMY", name: "ΦΜΥ Tax Filing", keywords: ["fmy", "tax", "aade", "φμυ"] },
      { code: "ERGANI", name: "ERGANI Labor Filing", keywords: ["ergani", "labor", "ministry"] },
    ];

    filingTypes.forEach(filing => {
      items.push({
        id: `filing-${filing.code.toLowerCase()}`,
        title: `File ${filing.code}`,
        description: `Submit ${filing.name}`,
        type: "filing",
        category: "Compliance",
        keywords: ["file", "submit", ...filing.keywords],
        actionType: "FILE_SUBMISSION",
        requiresConfirmation: true,
        action: async () => {
          toast({
            title: `Filing ${filing.code}`,
            description: `Submitting ${filing.name}`,
          });
          // Implementation would submit filing
        },
      });
    });

    // Quick actions
    const quickActions: SearchItem[] = [
      {
        id: "action-overtime-analysis",
        title: "Analyze Overtime Risks",
        description: "Run AI analysis for overtime prevention",
        type: "action",
        category: "AI Actions",
        keywords: ["overtime", "analysis", "ai", "prevention", "risk"],
        route: "/ai-engines-demo",
        actionType: "SYSTEM_ACTION",
        requiresConfirmation: false,
      },
      {
        id: "action-export-timesheets",
        title: "Export Timesheets",
        description: "Download timesheet data for current period",
        type: "export",
        category: "Reports",
        keywords: ["export", "download", "timesheets", "hours"],
        actionType: "REPORT_GENERATE",
        requiresConfirmation: false,
        action: async () => {
          toast({
            title: "Exporting Timesheets",
            description: "Generating timesheet export",
          });
          // Implementation would generate export
        },
      },
      {
        id: "action-sepa-payments",
        title: "Generate SEPA Payment File",
        description: "Create SEPA file for salary payments",
        type: "payment",
        category: "Payments",
        keywords: ["sepa", "payment", "salary", "bank", "generate"],
        actionType: "PAYROLL_RUN",
        requiresConfirmation: true,
        route: "/sepa-payments",
      },
    ];

    items.push(...quickActions);

    return items;
  }, [employees, properties, payrollRuns, toast]);

  // Semantic search function
  const searchResults = useMemo(() => {
    if (!search.trim()) return searchIndex.slice(0, 10);

    const searchTerms = search.toLowerCase().split(/\s+/);
    
    const scored = searchIndex.map(item => {
      let score = 0;
      const searchableText = [
        item.title,
        item.description,
        item.category,
        ...item.keywords,
      ].join(" ").toLowerCase();

      // Exact title match gets highest score
      if (item.title.toLowerCase().includes(search.toLowerCase())) {
        score += 100;
      }

      // Keyword matches
      searchTerms.forEach(term => {
        if (searchableText.includes(term)) {
          score += 10;
        }
        
        // Fuzzy matching for common variations
        Object.entries(COMMAND_VERBS).forEach(([verb, variations]) => {
          if (variations.includes(term) && searchableText.includes(verb)) {
            score += 15;
          }
        });
      });

      // Boost recent/relevant items
      if (item.category === "Employees" || item.category === "Payroll") {
        score += 5;
      }

      return { item, score };
    });

    return scored
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ item }) => item);
  }, [search, searchIndex]);

  // Handle item selection
  const handleSelect = async (item: SearchItem) => {
    if (item.requiresConfirmation) {
      setSelectedAction(item);
      return;
    }

    await executeAction(item);
    onOpenChange(false);
  };

  // Execute action
  const executeAction = async (item: SearchItem) => {
    if (item.route) {
      setLocation(item.route);
    }
    
    if (item.action) {
      await item.action();
    }
  };

  // Handle confirmation
  const handleConfirmAction = async () => {
    if (selectedAction) {
      await executeAction(selectedAction);
      setSelectedAction(null);
      onOpenChange(false);
    }
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedAction(null);
    }
  }, [open]);

  const getActionIcon = (actionType: keyof typeof ACTION_TYPES) => {
    const Icon = ACTION_TYPES[actionType].icon;
    return <Icon className="h-4 w-4" />;
  };

  if (selectedAction) {
    return (
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <div>
              <h2 className="text-lg font-semibold">Confirm Action</h2>
              <p className="text-sm text-muted-foreground">
                This action requires confirmation
              </p>
            </div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              {getActionIcon(selectedAction.actionType)}
              <span className="font-medium">{selectedAction.title}</span>
              <Badge variant="outline">{selectedAction.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedAction.description}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedAction(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAction}>
              Confirm
            </Button>
          </div>
        </div>
      </CommandDialog>
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {searchResults.length > 0 && (
          <>
            {/* Group results by category */}
            {Object.entries(
              searchResults.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {} as Record<string, SearchItem[]>)
            ).map(([category, items], index) => (
              <div key={category}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={category}>
                  {items.map(item => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item)}
                      className="flex items-center gap-3"
                    >
                      {getActionIcon(item.actionType)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.title}</span>
                          {item.requiresConfirmation && (
                            <Badge variant="secondary" className="text-xs">
                              Requires confirmation
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}