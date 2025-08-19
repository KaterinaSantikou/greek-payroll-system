import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import {
  Search,
  Command,
  Keyboard,
  Zap,
  Target,
  Shield,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Settings,
  Play,
  Upload,
  Download,
} from "lucide-react";

export default function CommandPaletteDemo() {
  const { open, setOpen } = useCommandPalette();
  const [demoOpen, setDemoOpen] = useState(false);

  const features = [
    {
      icon: Search,
      title: "Semantic Search",
      description: "Intelligent search across employees, payroll runs, filings, and settings",
      examples: ["Open Maria's contract", "Show August payroll", "Find ERGANI settings"],
    },
    {
      icon: Zap,
      title: "Quick Actions",
      description: "Execute common tasks without navigating through menus",
      examples: ["Run payroll August", "File APD", "Generate SEPA payment"],
    },
    {
      icon: Keyboard,
      title: "Keyboard-First UX",
      description: "Designed for power users who prefer keyboard navigation",
      examples: ["⌘K to open", "↑↓ to navigate", "Enter to execute"],
    },
    {
      icon: Shield,
      title: "Permission-Aware",
      description: "Only shows actions and data you're authorized to access",
      examples: ["Manager actions for managers", "Property-specific data", "Role-based filtering"],
    },
    {
      icon: Target,
      title: "Top-5 Results",
      description: "Focused results with the most relevant matches first",
      examples: ["Exact title matches", "Keyword relevance", "Recent activity boost"],
    },
  ];

  const commandCategories = [
    {
      category: "Navigation",
      icon: Search,
      color: "blue",
      examples: [
        "dashboard",
        "employees", 
        "payroll",
        "compliance",
        "payments"
      ],
    },
    {
      category: "Employee Actions",
      icon: Users,
      color: "green",
      examples: [
        "Open Maria's profile",
        "View John's contract", 
        "Edit employee records",
        "Add new employee"
      ],
    },
    {
      category: "Payroll Operations",
      icon: Play,
      color: "purple",
      examples: [
        "Run payroll August",
        "Process monthly payroll",
        "Review pay calculations",
        "Lock timesheets"
      ],
    },
    {
      category: "Compliance Filing",
      icon: Upload,
      color: "orange",
      examples: [
        "File APD",
        "Submit ERGANI",
        "Send ΦΜΥ filing",
        "Generate compliance report"
      ],
    },
    {
      category: "Payments & Banking",
      icon: CreditCard,
      color: "indigo",
      examples: [
        "Generate SEPA file",
        "Process bank transfers",
        "Download payment report",
        "Check payment status"
      ],
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Command className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Command Palette</h1>
          <p className="text-muted-foreground">
            Semantic search + actions for lightning-fast navigation
          </p>
        </div>
      </div>

      {/* Quick Demo */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Try It Now
          </CardTitle>
          <CardDescription>
            Use the keyboard shortcut or click the button to open the command palette
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => setDemoOpen(true)} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Open Command Palette
            </Button>
            <div className="text-sm text-muted-foreground">
              or press{" "}
              <Badge variant="secondary" className="text-xs font-mono">
                ⌘K
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium">Try these searches:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• "Open Maria's contract"</li>
                <li>• "Run payroll August"</li>
                <li>• "File APD"</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Quick navigation:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• "dashboard"</li>
                <li>• "employees"</li>
                <li>• "compliance"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <feature.icon className="h-5 w-5 text-blue-600" />
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Examples:</p>
                <ul className="text-xs space-y-1">
                  {feature.examples.map((example, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-blue-600 rounded-full" />
                      <code className="bg-muted px-1 py-0.5 rounded">
                        {example}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Command Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Command Categories
          </CardTitle>
          <CardDescription>
            Available commands organized by category with permission controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {commandCategories.map((category, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-2">
                  <category.icon className={`h-5 w-5 text-${category.color}-600`} />
                  <h3 className="font-medium">{category.category}</h3>
                  <Badge variant="outline" className="text-xs">
                    {category.examples.length} commands
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {category.examples.map((example, i) => (
                    <div key={i} className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                      <code>{example}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Implementation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium">Data Sources</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Unified search index across all entities</li>
                <li>• Real-time employee and property data</li>
                <li>• Dynamic payroll run information</li>
                <li>• Permission-filtered results</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium">Security & Permissions</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Role-based access control</li>
                <li>• Property-specific data filtering</li>
                <li>• Confirmation for destructive actions</li>
                <li>• Audit trail for all executions</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Action Safeguards</h3>
            <div className="text-sm text-muted-foreground">
              <p>
                All destructive actions (payroll runs, filings, deletions) require explicit confirmation.
                The system displays a confirmation dialog with action details before execution.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Command Palette */}
      <CommandPalette open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}