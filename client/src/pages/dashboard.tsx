import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { CommandPaletteModal } from "@/components/CommandPaletteModal";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/i18n";
import { formatNumber, formatCurrency as formatCurrencyLocale, formatRelativeTime } from "@/lib/i18n";
import { 
  Building2, 
  Calendar, 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Euro, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Wifi, 
  WifiOff,
  Target,
  Shield,
  BanknoteIcon,
  Timer,
  Bell,
  Eye,
  Download,
  RefreshCw,
  Activity,
  Zap,
  ArrowRight,
  Clock3,
  CheckSquare,
  AlertCircle,
  TrendingUp as Trending,
  PlayCircle,
  PauseCircle,
  CalendarDays as CalendarIcon,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Command,
  Calculator,
  User,
  UserPlus,
  ChevronRight
} from "lucide-react";

interface Property {
  id: string;
  name: string;
  group: string;
}

interface PayrollStatus {
  stage: 'draft' | 'validated' | 'finalized' | 'posted';
  progress: number;
  totals: {
    gross: number;
    employerContribs: number;
    net: number;
    headcount: number;
    deltaPercent: number;
  };
}

interface ComplianceData {
  digitalWorkCard: { covered: number; scheduled: number };
  erganiQueue: { success: number; failed: number; retries: number };
  minWageAlerts: number;
  restCapAlerts: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { t, locale } = useLocale();
  const [selectedProperty, setSelectedProperty] = useState("prop-princess");
  const [selectedPeriod, setPeriod] = useState("this-month");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRunningPayroll, setIsRunningPayroll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [userRole, setUserRole] = useState<'payroll_admin' | 'hr' | 'manager' | 'employee'>('payroll_admin');
  
  // Role-based default section states
  const getRoleBasedDefaults = (role: string) => {
    switch (role) {
      case 'payroll_admin':
        return { actionInbox: true, compliance: true, performance: true, banking: true };
      case 'hr':
        return { actionInbox: true, compliance: false, performance: false, people: true };
      case 'manager':
        return { actionInbox: true, compliance: false, performance: false, team: true };
      default:
        return { actionInbox: true, compliance: true, performance: true };
    }
  };
  
  const [expandedSections, setExpandedSections] = useState(getRoleBasedDefaults(userRole));

  // Role-specific dashboard configurations
  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'payroll_admin':
        return {
          primaryActions: [
            { id: 'run-payroll', label: locale === 'el' ? 'Εκτέλεση Μισθοδοσίας' : 'Run Payroll', icon: Calculator },
            { id: 'bank-export', label: locale === 'el' ? 'Εξαγωγή Τράπεζας' : 'Bank Export', icon: BanknoteIcon },
            { id: 'ergani-sync', label: locale === 'el' ? 'Συγχρονισμός ΕΡΓΑΝΗ' : 'ERGANI Sync', icon: FileText }
          ],
          focusAreas: ['payroll', 'compliance', 'banking'],
          dashboardTitle: locale === 'el' ? 'Κεντρικός Πίνακας Μισθοδοσίας' : 'Payroll Control Center'
        };
      case 'hr':
        return {
          primaryActions: [
            { id: 'add-employee', label: locale === 'el' ? 'Προσθήκη Εργαζομένου' : 'Add Employee', icon: Users },
            { id: 'review-requests', label: locale === 'el' ? 'Αιτήματα Αδειών' : 'Leave Requests', icon: Calendar },
            { id: 'onboarding', label: locale === 'el' ? 'Ενσωμάτωση' : 'Onboarding', icon: UserPlus }
          ],
          focusAreas: ['people', 'compliance', 'onboarding'],
          dashboardTitle: locale === 'el' ? 'Κεντρικός Πίνακας HR' : 'HR Control Center'
        };
      default:
        return {
          primaryActions: [],
          focusAreas: ['general'],
          dashboardTitle: locale === 'el' ? 'Κεντρικός Πίνακας' : 'Dashboard'
        };
    }
  };
  
  const roleConfig = getRoleConfig(userRole);
  
  // Properties data
  const properties: Property[] = [
    { id: "prop-princess", name: "Princess", group: "Luxury Collection" },
    { id: "prop-aegean", name: "Aegean Suites", group: "Luxury Collection" },
    { id: "prop-marpunta", name: "Marpunta", group: "Beach Resort" },
    { id: "prop-alex", name: "The Alex", group: "City Hotels" },
    { id: "prop-atlantis", name: "Atlantis", group: "Resort Complex" }
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Mock data with realistic values
  const actionInboxData = {
    approvals: [
      { type: "overtime_requests", displayName: locale === 'el' ? 'Αιτήματα Υπερωριών' : 'Overtime Requests', count: 7, urgency: "high", impact: "medium" },
      { type: "schedule_changes", displayName: locale === 'el' ? 'Αλλαγές Προγράμματος' : 'Schedule Changes', count: 3, urgency: "medium", impact: "low" },
      { type: "pay_corrections", displayName: locale === 'el' ? 'Διορθώσεις Μισθοδοσίας' : 'Pay Corrections', count: 2, urgency: "low", impact: "high" }
    ],
    exceptions: [
      { type: "missing_clockins", displayName: locale === 'el' ? 'Λείπουν Αφίξεις/Αναχωρήσεις' : 'Missing Clock-ins', count: 5, urgency: "high" },
      { type: "duplicate_clockins", displayName: locale === 'el' ? 'Διπλές Καταχωρήσεις' : 'Duplicate Clock-ins', count: 2, urgency: "medium" },
      { type: "wrong_location", displayName: locale === 'el' ? 'Λάθος Τοποθεσία' : 'Wrong Location', count: 1, urgency: "low" },
      { type: "break_violations", displayName: locale === 'el' ? 'Παραβάσεις Διαλειμμάτων' : 'Break Violations', count: 3, urgency: "medium" }
    ],
    filings: [
      { type: "ERGANI", displayName: "ΕΡΓΑΝΗ ΙΙ", ddays: 1, status: locale === 'el' ? 'εκκρεμεί' : 'pending', urgency: "critical" },
      { type: "APD", displayName: "ΑΠΔ", ddays: 3, status: locale === 'el' ? 'έτοιμο' : 'ready', urgency: "high" },
      { type: "ΦΜΥ", displayName: "ΦΜΥ", ddays: 7, status: locale === 'el' ? 'προσχέδιο' : 'draft', urgency: "medium" }
    ],
    banking: [
      { type: "sepa_upload", displayName: locale === 'el' ? 'Αποστολή SEPA' : 'SEPA Upload', count: 1, urgency: "high" },
      { type: "payment_rejects", displayName: locale === 'el' ? 'Απορρίψεις Πληρωμών' : 'Payment Rejects', count: 0, urgency: "none" }
    ]
  };

  const complianceData: ComplianceData = {
    digitalWorkCard: { covered: 147, scheduled: 152 },
    erganiQueue: { success: 98, failed: 2, retries: 1 },
    minWageAlerts: 0,
    restCapAlerts: 3
  };

  const payrollStatus: PayrollStatus = {
    stage: 'validated',
    progress: 75,
    totals: {
      gross: 285420.50,
      employerContribs: 69540.25,
      net: 201680.75,
      headcount: 152,
      deltaPercent: 2.3
    }
  };

  const kpiData = {
    hours: {
      regular: 6080,
      overtimeTier1: 340,
      overtimeTier2: 85,
      night: 520,
      sunday: 180,
      holiday: 24
    },
    costs: {
      laborBudget: 290000,
      actualLabor: 285420.50,
      costPerRoom: 45.80,
      costPerCover: 12.30,
      tipPool: 8940.00
    },
    variance: {
      otCost: 2840.50,
      nightHours: 45
    }
  };

  const liveAttendanceData = {
    onNow: [
      { department: "Reception", count: 4, scheduled: 4 },
      { department: "Housekeeping", count: 18, scheduled: 20 },
      { department: "Kitchen", count: 12, scheduled: 12 },
      { department: "Service", count: 8, scheduled: 10 },
      { department: "Bar", count: 3, scheduled: 4 }
    ],
    lateMissing: [
      { name: "Maria P.", department: "Housekeeping", status: "late", minutes: 15 },
      { name: "Kostas D.", department: "Service", status: "missing", minutes: 45 },
      { name: "Elena K.", department: "Housekeeping", status: "late", minutes: 8 }
    ],
    deviceHealth: {
      kiosksOnline: 8,
      totalKiosks: 9,
      clockDriftFlags: 1
    }
  };

  const forecastData = {
    projectedPayroll: 292500,
    budgetPayroll: 290000,
    confidence: 85,
    nearOvertimeCap: [
      { name: "Dimitris M.", remaining: 2.5, department: "Kitchen" },
      { name: "Anna S.", remaining: 1.8, department: "Housekeeping" },
      { name: "Nikos P.", remaining: 3.2, department: "Service" }
    ],
    scheduleGaps: [
      { date: "2025-01-25", shift: "Night", department: "Reception", uncovered: 1 },
      { date: "2025-01-27", shift: "Evening", department: "Bar", uncovered: 1 }
    ]
  };

  const filingsData = {
    ergani: { submitted: 145, failed: 2, awaiting: 5 },
    apd: { built: true, submitted: false, receiptLink: null },
    fmy: { built: true, submitted: true, paymentDate: "2025-01-30" },
    sepa: { 
      fileId: "SEPA_20250120_001", 
      amount: 201680.75, 
      status: "pending_upload", 
      rejects: 0 
    }
  };

  // Update timestamp every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalSearch = (query: string) => {
    if (query.length < 3) return;
    
    toast({
      title: "Searching...",
      description: `Looking for "${query}" across people, runs, filings, and actions`,
    });
  };

  const handleActionClick = (action: string, type: string) => {
    toast({
      title: "Action Required",
      description: `Opening ${action} for ${type}`,
    });
  };

  const formatCurrency = (amount: number) => 
    formatCurrencyLocale(amount, locale);

  const formatTimeAgo = (date: Date) => {
    return formatRelativeTime(date, locale);
  };

  // Enhanced payroll actions
  const handleRunPayroll = () => {
    setIsRunningPayroll(true);
    toast({
      title: t('dashboard.payroll_starting'),
      description: t('dashboard.payroll_starting_desc'),
    });
    // Simulate payroll run
    setTimeout(() => {
      setIsRunningPayroll(false);
      toast({
        title: t('dashboard.payroll_ready'),
        description: t('dashboard.payroll_ready_desc'),
      });
    }, 3000);
  };

  const handleResumePayroll = () => {
    toast({
      title: t('dashboard.resume_payroll'),
      description: t('dashboard.resume_payroll_desc'),
    });
  };

  // KPI Calculation Functions
  const calculateDigitalCardCoverage = (covered: number, scheduled: number) => {
    return ((covered / scheduled) * 100).toFixed(1);
  };

  const calculateErganiSuccessRate = (success: number, failed: number) => {
    const total = success + failed;
    return total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
  };

  const calculateOtCapRemaining = (legalCap: number, ytdOtHours: number) => {
    return Math.max(0, legalCap - ytdOtHours);
  };

  const calculateLaborVsBudget = (actual: number, budget: number) => {
    return (((actual - budget) / budget) * 100).toFixed(1);
  };

  const calculateLCPerOccupiedRoom = (totalLabor: number, occupiedRooms: number) => {
    return occupiedRooms > 0 ? (totalLabor / occupiedRooms).toFixed(2) : '0.00';
  };

  // Enhanced loading states
  const [loadingStates, setLoadingStates] = useState({
    compliance: false,
    payroll: false,
    attendance: false,
    forecast: false
  });

  const triggerRefresh = (section: string) => {
    setLoadingStates(prev => ({ ...prev, [section]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [section]: false }));
      setLastUpdated(new Date());
    }, 1000);
  };

  // Global search handler
  const handleGlobalSearch = (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Simulate search results - in real app this would be an API call
    const mockResults = [
      { id: 1, type: 'employee', name: 'Maria Papadopoulos', role: 'Front Desk Manager' },
      { id: 2, type: 'payroll', name: 'December 2024 Payroll', amount: '€124,280' },
      { id: 3, type: 'filing', name: 'ΕΡΓΑΝΗ ΙΙ Filing', status: 'Pending' }
    ].filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.type.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(mockResults);
    setShowSearchResults(mockResults.length > 0);
  };
  
  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  // Show loading skeleton while data is loading
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Command Palette */}
      <CommandPaletteModal isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      
      <div className="container mx-auto px-6 py-4">
        
        {/* Top Bar - Always Visible */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-lg shadow-sm border mb-6 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            
            {/* Left Side - Role Switcher, Property & Period */}
            <div className="flex items-center gap-4">
              
              {/* Role Switcher */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <Select value={userRole} onValueChange={(value: any) => {
                  setUserRole(value);
                  setExpandedSections(getRoleBasedDefaults(value));
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payroll_admin">
                      {locale === 'el' ? 'Μισθοδοσία' : 'Payroll Admin'}
                    </SelectItem>
                    <SelectItem value="hr">
                      {locale === 'el' ? 'HR' : 'HR'}
                    </SelectItem>
                    <SelectItem value="manager">
                      {locale === 'el' ? 'Διευθυντής' : 'Manager'}
                    </SelectItem>
                    <SelectItem value="employee">
                      {locale === 'el' ? 'Εργαζόμενος' : 'Employee'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(prop => (
                      <SelectItem key={prop.id} value={prop.id}>
                        <div>
                          <div className="font-medium">{prop.name}</div>
                          <div className="text-xs text-gray-500">{prop.group}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <Select value={selectedPeriod} onValueChange={setPeriod}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="payroll-period">Payroll Period</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Center - Enhanced Global Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={locale === 'el' ? '⌘K Αναζήτηση εργαζομένων, μισθοδοσίας, ενεργειών...' : '⌘K Search people, runs, filings, actions...'}
                  className="pl-10 pr-12 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 focus:bg-white dark:focus:bg-gray-800 transition-colors"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleGlobalSearch(e.target.value);
                  }}
                  onFocus={() => setShowCommandPalette(true)}
                  onClick={() => setShowCommandPalette(true)}
                  readOnly
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center text-xs text-gray-400">
                  <Command className="h-3 w-3 mr-1" />
                  K
                </div>
                
                {/* Search suggestions badge */}
                {searchQuery.length === 0 && (
                  <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
                    <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800">
                      {locale === 'el' ? 'Αυτόματη συμπλήρωση & ιστορικό' : 'Autocomplete & search history'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Data Freshness & Mini Compliance */}
            <div className="flex items-center gap-6">
              {/* Mini Compliance Strip */}
              <div className="flex items-center gap-4 text-xs">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-neutral-200 dark:text-neutral-300">
                          Digital Card {calculateDigitalCardCoverage(complianceData.digitalWorkCard.covered, complianceData.digitalWorkCard.scheduled)}%
                        </span>
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        {locale === 'el' 
                          ? 'Ψηφιακή κάρτα εργασίας - υποχρεωτική για όλους τους εργαζομένους. Παρακολουθεί ποιοι από τους προγραμματισμένους έχουν κάνει check-in.'
                          : 'Digital Work Card - mandatory for all employees. Tracks who among scheduled workers have checked in.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-neutral-200 dark:text-neutral-300">
                          ERGANI {calculateErganiSuccessRate(complianceData.erganiQueue.success, complianceData.erganiQueue.failed)}%
                        </span>
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        {locale === 'el'
                          ? 'ΕΡΓΑΝΗ ΙΙ - κυβερνητικό σύστημα για δηλώσεις εργαζομένων. Δείχνει ποσοστό επιτυχίας αυτόματων δηλώσεων.'
                          : 'ERGANI II - government system for employee declarations. Shows success rate of automatic filings.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {(actionInboxData.filings.filter(f => f.ddays <= 2).length > 0) && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-400">
                      {actionInboxData.filings.filter(f => f.ddays <= 2).length} filings due
                    </span>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-neutral-200 dark:text-neutral-300">
                Updated {formatTimeAgo(lastUpdated)} • 
                <span className="text-green-400 font-medium"> ERGANI in sync</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLastUpdated(new Date())}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-4 sm:space-y-6">
          
          {/* Primary CTA - Run Payroll Section */}
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-6 w-6 flex-shrink-0" />
                    <h2 className="text-xl font-semibold leading-tight">
                      {payrollStatus.stage === 'draft' 
                        ? (locale === 'el' ? 'Συνέχεια Μισθοδοσίας' : 'Resume Payroll Run')
                        : (locale === 'el' ? 'Εκτέλεση Μισθοδοσίας' : 'Run Payroll')}
                    </h2>
                  </div>
                  <p className="text-blue-100 text-sm leading-relaxed max-w-md">
                    {payrollStatus.stage === 'draft' 
                      ? (locale === 'el' 
                          ? 'Προσχέδιο μισθοδοσίας σε εξέλιξη - συνεχίστε από εκεί που σταματήσατε'
                          : 'Draft payroll in progress - pick up where you left off')
                      : (locale === 'el' 
                          ? 'Έτοιμο για επεξεργασία μισθοδοσίας για αυτή την περίοδο'
                          : 'Ready to process payroll for this period')}
                  </p>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                      <div className="text-blue-200 text-xs font-medium mb-1">
                        {locale === 'el' ? 'Εργαζόμενοι' : 'Employees'}
                      </div>
                      <div className="font-semibold text-lg text-white">
                        {formatNumber(payrollStatus.totals.headcount, locale)}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                      <div className="text-blue-200 text-xs font-medium mb-1">
                        {locale === 'el' ? 'Συνολικά Μικτά' : 'Gross Total'}
                      </div>
                      <div className="font-semibold text-lg text-white">
                        {formatCurrency(payrollStatus.totals.gross)}
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                      <div className="text-blue-200 text-xs font-medium mb-1">
                        {locale === 'el' ? 'έναντι Προηγ. Μήνα' : 'vs Last Month'}
                      </div>
                      <div className="font-semibold text-lg flex items-center gap-1 text-white">
                        <Trending className="h-4 w-4" />
                        +{formatNumber(payrollStatus.totals.deltaPercent, locale)}%
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0 w-full lg:w-auto">
                  <Button 
                    size="lg" 
                    variant="secondary" 
                    className="text-blue-600 bg-white hover:bg-blue-50 px-6 sm:px-8 py-3 text-base sm:text-lg font-medium whitespace-nowrap w-full sm:w-auto touch-manipulation min-h-[48px]"
                    onClick={payrollStatus.stage === 'draft' ? handleResumePayroll : handleRunPayroll}
                    disabled={isRunningPayroll}
                  >
                    {isRunningPayroll ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>{locale === 'el' ? 'Επεξεργασία...' : 'Processing...'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {payrollStatus.stage === 'draft' ? <PauseCircle className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
                        <span>
                          {payrollStatus.stage === 'draft' 
                            ? (locale === 'el' ? 'Συνέχεια Προσχεδίου' : 'Resume Draft')
                            : (locale === 'el' ? 'Έναρξη Μισθοδοσίας' : 'Start Payroll')}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    )}
                  </Button>
                  
                  {payrollStatus.stage === 'draft' && (
                    <div className="text-center bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                      <div className="text-xs text-blue-200 mb-2">
                        {locale === 'el' ? 'Πρόοδος' : 'Progress'}
                      </div>
                      <Progress value={payrollStatus.progress} className="h-2 bg-blue-500/30 mb-2" />
                      <div className="text-xs text-blue-100">
                        {payrollStatus.progress}% {locale === 'el' ? 'Ολοκληρώθηκε' : 'Complete'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Today Strip */}
          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2 text-base sm:text-lg">
                  <AlertCircle className="h-5 w-5" />
                  {t('dashboard.critical_today')}
                </h3>
                <span className="text-xs sm:text-sm text-orange-600 dark:text-orange-400">
                  {t('dashboard.updated')} {formatTimeAgo(lastUpdated)}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {/* Next Pay Date */}
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800/50 rounded-lg border min-h-[80px] touch-manipulation">
                  <CalendarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{t('dashboard.next_payday')}</div>
                    <div className="font-semibold text-sm sm:text-base truncate">31 Ιαν 2025</div>
                    <div className="text-xs text-green-600 truncate">{t('dashboard.on_track')}</div>
                  </div>
                </div>

                {/* Items to Approve */}
                <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800/50 rounded-lg border min-h-[80px] touch-manipulation">
                  <CheckSquare className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{t('dashboard.to_approve')}</div>
                    <div className="font-semibold text-sm sm:text-base truncate">{actionInboxData.approvals.reduce((sum, a) => sum + a.count, 0)} {t('dashboard.items')}</div>
                    <div className="text-xs text-orange-600">
                      {locale === 'el' ? 'Χρειάζεται Προσοχή' : 'Needs Attention'}
                    </div>
                  </div>
                </div>

                {/* ΕΡΓΑΝΗ Sync */}
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-lg border">
                  <Wifi className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">ΕΡΓΑΝΗ ΙΙ</div>
                    <div className="font-semibold text-sm">{calculateErganiSuccessRate(complianceData.erganiQueue.success, complianceData.erganiQueue.failed)}% {t('dashboard.sync')}</div>
                    <div className="text-xs text-green-600">{t('dashboard.healthy')}</div>
                  </div>
                </div>

                {/* Bank Cutoff */}
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800/50 rounded-lg border">
                  <Clock3 className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.bank_cutoff')}</div>
                    <div className="font-semibold text-sm">16:00 {t('dashboard.today')}</div>
                    <div className="text-xs text-purple-600">3h {t('dashboard.remaining')}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Greek Market Essentials & Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Greek Market Essentials (1/4 width) */}
            <div className="space-y-4">
              <Card className="border-l-4 border-l-blue-600 bg-blue-50 dark:bg-blue-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('dashboard.greek_compliance')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Digital Work Card */}
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800/50 rounded border">
                    <div>
                      <div className="text-xs font-medium">{t('dashboard.digital_card')}</div>
                      <div className="text-xs text-gray-500">
                        {complianceData.digitalWorkCard.covered}/{complianceData.digitalWorkCard.scheduled} {t('dashboard.covered')}
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600 text-xs">
                      {calculateDigitalCardCoverage(complianceData.digitalWorkCard.covered, complianceData.digitalWorkCard.scheduled)}%
                    </Badge>
                  </div>

                  {/* ΕΡΓΑΝΗ ΙΙ Status */}
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800/50 rounded border">
                    <div>
                      <div className="text-xs font-medium">ΕΡΓΑΝΗ ΙΙ</div>
                      <div className="text-xs text-gray-500">{t('dashboard.sync_status')}</div>
                    </div>
                    <Badge variant="default" className="bg-green-600 text-xs">
                      {calculateErganiSuccessRate(complianceData.erganiQueue.success, complianceData.erganiQueue.failed)}%
                    </Badge>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="w-full justify-start text-xs h-8" onClick={() => handleActionClick('ergani', 'sync')}>
                      <Zap className="h-3 w-3 mr-2" />
                      {t('dashboard.sync_ergani')}
                    </Button>
                    <Button size="sm" variant="outline" className="w-full justify-start text-xs h-8" onClick={() => handleActionClick('digital_card', 'coverage')}>
                      <Eye className="h-3 w-3 mr-2" />
                      {t('dashboard.view_coverage')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Filing Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {locale === 'el' ? 'Κυβερνητικές Δηλώσεις' : 'Government Filings'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {actionInboxData.filings.map((filing, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
                      <div>
                        <div className="text-xs font-medium">{filing.type}</div>
                        <div className="text-xs text-gray-500">{filing.status}</div>
                      </div>
                      <Badge 
                        variant={filing.urgency === 'critical' ? 'destructive' : filing.urgency === 'high' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {filing.ddays}D
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Action Inbox & Performance (3/4 width) */}
            <div className="lg:col-span-3 space-y-4 sm:space-y-6">
              <Collapsible open={expandedSections.actionInbox} onOpenChange={() => toggleSection('actionInbox')}>
                <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div>
                            <CardTitle className="flex items-center gap-2 text-base font-medium">
                              <Bell className="h-5 w-5 text-blue-600" />
                              {locale === 'el' ? 'Κιβώτιο Ενεργειών' : 'Action Inbox'}
                            </CardTitle>
                            <CardDescription className="text-neutral-200 dark:text-neutral-300 text-sm mt-1">
                              {locale === 'el' ? '1-κλικ για εκκαθάριση εμποδίων • Ταξινομημένα κατά επείγον & επίδραση' : '1-click to clear blockers • Sorted by urgency & impact'}
                            </CardDescription>
                          </div>
                          {expandedSections.actionInbox ? 
                            <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          }
                        </div>
                        <div className="text-xs text-neutral-200 dark:text-neutral-300">
                          Updated {formatTimeAgo(lastUpdated)}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="py-3">
                      {/* Exception Summary Bar */}
                      <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-orange-800 dark:text-orange-200">
                              {actionInboxData.exceptions.reduce((sum, e) => sum + e.count, 0)} {locale === 'el' ? 'εξαιρέσεις:' : 'exceptions:'}
                            </span>
                          </div>
                          <span className="text-orange-700 dark:text-orange-300">
                            {actionInboxData.exceptions.find(e => e.type === 'missing_clockins')?.count || 0} {locale === 'el' ? 'αφίξεις/αναχωρήσεις' : 'clock-ins'} • 
                            {actionInboxData.exceptions.find(e => e.type === 'duplicate_clockins')?.count || 0} {locale === 'el' ? 'διπλές' : 'duplicates'} • 
                            {actionInboxData.exceptions.find(e => e.type === 'wrong_location')?.count || 0} {locale === 'el' ? 'λάθος τοποθεσία' : 'wrong location'}
                          </span>
                        </div>
                      </div>
                  <div className="space-y-3">
                    
                    {/* Approvals Pending */}
                    <div className="p-4 border-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-700 shadow-sm">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <div className="p-1 bg-amber-100 dark:bg-amber-800/50 rounded-full">
                          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                        </div>
                        {locale === 'el' ? 'Εγκρίσεις σε Αναμονή' : 'Approvals Pending'}
                        <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-800 border-amber-300">
                          {actionInboxData.approvals.reduce((sum, item) => sum + item.count, 0)}
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {actionInboxData.approvals.map((item, idx) => (
                          <Button 
                            key={idx} 
                            variant="ghost" 
                            size="sm" 
                            className="justify-between h-auto p-3 min-h-[52px] touch-manipulation bg-white/60 dark:bg-gray-800/60 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 border border-amber-200/50 dark:border-amber-700/50 rounded-lg transition-all duration-200"
                            onClick={() => handleActionClick('approval', item.type)}
                          >
                            <div className="text-left min-w-0 flex-1">
                              <div className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200">
                                {item.displayName}
                              </div>
                              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                {item.count} {locale === 'el' ? 'στοιχεία' : 'items'} • {locale === 'el' ? 'Απαιτεί έγκριση' : 'Requires approval'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={item.urgency === 'high' ? 'destructive' : 'secondary'}
                                className={`text-xs font-medium ${
                                  item.urgency === 'high' 
                                    ? 'bg-red-100 text-red-700 border-red-300' 
                                    : 'bg-gray-100 text-gray-600 border-gray-300'
                                }`}
                              >
                                {item.urgency === 'high' ? (locale === 'el' ? 'Επείγον' : 'Urgent') : (locale === 'el' ? 'Κανονικό' : 'Normal')}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-amber-500" />
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Exceptions to Resolve */}
                    <div className="p-4 border-2 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-700 shadow-sm">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-800 dark:text-red-200">
                        <div className="p-1 bg-red-100 dark:bg-red-800/50 rounded-full">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-300" />
                        </div>
                        {locale === 'el' ? 'Εξαιρέσεις προς Επίλυση' : 'Exceptions to Resolve'}
                        <Badge variant="destructive" className="ml-auto bg-red-100 text-red-800 border-red-300">
                          {actionInboxData.exceptions.reduce((sum, item) => sum + item.count, 0)}
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {actionInboxData.exceptions.map((item, idx) => (
                          <Button 
                            key={idx} 
                            variant="ghost" 
                            size="sm"
                            className="justify-between h-auto p-3 min-h-[52px] touch-manipulation bg-white/60 dark:bg-gray-800/60 hover:bg-red-100/70 dark:hover:bg-red-900/30 border border-red-200/50 dark:border-red-700/50 rounded-lg transition-all duration-200"
                            onClick={() => handleActionClick('exception', item.type)}
                          >
                            <div className="text-left min-w-0 flex-1">
                              <div className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200">
                                {item.displayName}
                              </div>
                              <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                                {item.count} {locale === 'el' ? 'περιστατικά' : 'incidents'} • {locale === 'el' ? 'Απαιτεί διόρθωση' : 'Requires fix'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="destructive" 
                                className="text-xs font-medium bg-red-100 text-red-700 border-red-300"
                              >
                                {item.impact === 'high' ? (locale === 'el' ? 'Υψηλό' : 'High') : (locale === 'el' ? 'Μέτριο' : 'Medium')}
                              </Badge>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Filings Due */}
                    <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {locale === 'el' ? 'Δηλώσεις σε Εκκρεμότητα' : 'Filings Due'}
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {actionInboxData.filings.map((item, idx) => (
                          <Button 
                            key={idx} 
                            variant="outline" 
                            size="sm"
                            className="justify-between h-auto p-2"
                            onClick={() => handleActionClick('filing', item.type)}
                          >
                            <div className="text-left min-w-0 flex-1">
                              <div className="font-medium text-xs truncate">{item.displayName}</div>
                              <div className="text-xs text-gray-500">
                                {item.ddays}D • {item.status}
                              </div>
                            </div>
                            <Badge 
                              variant={item.urgency === 'critical' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {item.ddays}D
                            </Badge>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Bank Tasks */}
                    <div className="p-4 border-2 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-700 shadow-sm">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                        <div className="p-1 bg-emerald-100 dark:bg-emerald-800/50 rounded-full">
                          <BanknoteIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                        </div>
                        {locale === 'el' ? 'Τραπεζικές Εργασίες' : 'Bank Tasks'}
                        <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-800 border-emerald-300">
                          {actionInboxData.banking.reduce((sum, item) => sum + (item.count || 0), 0)}
                        </Badge>
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {actionInboxData.banking.map((item, idx) => (
                          <Button 
                            key={idx} 
                            variant="ghost" 
                            size="sm"
                            className={`justify-between h-auto p-3 min-h-[52px] touch-manipulation border rounded-lg transition-all duration-200 ${
                              item.count === 0 
                                ? 'bg-gray-50/60 dark:bg-gray-800/60 border-gray-200/50 dark:border-gray-700/50 opacity-60' 
                                : 'bg-white/60 dark:bg-gray-800/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30 border-emerald-200/50 dark:border-emerald-700/50'
                            }`}
                            onClick={() => handleActionClick('banking', item.type)}
                            disabled={item.count === 0}
                          >
                            <div className="text-left min-w-0 flex-1">
                              <div className={`font-semibold text-sm truncate ${
                                item.count === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'
                              }`}>
                                {item.displayName}
                              </div>
                              <div className={`text-xs font-medium ${
                                item.count === 0 
                                  ? 'text-gray-400 dark:text-gray-500' 
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {item.count || (locale === 'el' ? 'κανένα' : 'none')} {item.count === 1 ? (locale === 'el' ? 'στοιχείο' : 'item') : (locale === 'el' ? 'στοιχεία' : 'items')}
                                {item.count > 0 && ` • ${locale === 'el' ? 'Έτοιμο για εξαγωγή' : 'Ready for export'}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.count > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs font-medium bg-emerald-100 text-emerald-700 border-emerald-300"
                                >
                                  {locale === 'el' ? 'Έτοιμο' : 'Ready'}
                                </Badge>
                              )}
                              <Download className={`h-4 w-4 ${
                                item.count === 0 ? 'text-gray-400' : 'text-emerald-500'
                              }`} />
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Compliance Strip (1/3 width) */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {locale === 'el' ? 'Συμμόρφωση & Παρακολούθηση' : 'Compliance Monitoring'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    
                    <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {locale === 'el' ? 'Ψηφιακή Κάρτα Εργασίας' : 'Digital Work Card'}
                        </span>
                        <Badge variant="default" className="bg-green-600">
                          {calculateDigitalCardCoverage(complianceData.digitalWorkCard.covered, complianceData.digitalWorkCard.scheduled)}%
                        </Badge>
                      </div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300 mb-2">
                        {complianceData.digitalWorkCard.covered}/{complianceData.digitalWorkCard.scheduled} {locale === 'el' ? 'προγραμματισμένοι συνδέθηκαν' : 'scheduled clocked in'}
                      </div>
                      <Progress 
                        value={(complianceData.digitalWorkCard.covered / complianceData.digitalWorkCard.scheduled) * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-green-700 dark:text-green-300 mt-2">
                        {locale === 'el' ? 'Τύπος: (προγραμματισμένοι που συνδέθηκαν ÷ σύνολο προγραμματισμένων) × 100' : 'Formula: (# scheduled who clocked in ÷ # scheduled) × 100'}
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">ERGANI Queue</span>
                        <div className="flex gap-1">
                          <Badge variant="default" className="text-xs">
                            {complianceData.erganiQueue.success}✓
                          </Badge>
                          {complianceData.erganiQueue.failed > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {complianceData.erganiQueue.failed}✗
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300">
                        Success rate: {calculateErganiSuccessRate(complianceData.erganiQueue.success, complianceData.erganiQueue.failed)}%
                        {complianceData.erganiQueue.retries > 0 && ` • ${complianceData.erganiQueue.retries} retrying`}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Formula: successful events ÷ total events
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Min-wage Guardrail</span>
                        <Badge variant={complianceData.minWageAlerts > 0 ? 'destructive' : 'default'}>
                          {complianceData.minWageAlerts}
                        </Badge>
                      </div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300">
                        {complianceData.minWageAlerts === 0 ? 'All employees above floor' : `${complianceData.minWageAlerts} below minimum`}
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Rest/48h Cap Alerts</span>
                        <Badge variant={complianceData.restCapAlerts > 0 ? 'destructive' : 'default'}>
                          {complianceData.restCapAlerts}
                        </Badge>
                      </div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300">
                        {complianceData.restCapAlerts === 0 ? 'All within limits' : `${complianceData.restCapAlerts} breaches/at-risk`}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Second Row - Payroll Run Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Payroll Run Status - {selectedPeriod}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                
                <div className="lg:col-span-2">
                  <h4 className="font-semibold mb-3">Run Progress</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Draft → Validated → Finalized → Posted</span>
                      <span>{payrollStatus.progress}%</span>
                    </div>
                    <Progress value={payrollStatus.progress} className="h-3" />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span className="text-green-600">Draft ✓</span>
                      <span className="text-green-600">Validated ✓</span>
                      <span className="text-orange-600">Finalizing...</span>
                      <span className="text-gray-400">Posted</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Totals</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gross:</span>
                      <span className="font-mono">{formatCurrency(payrollStatus.totals.gross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Employer Contribs:</span>
                      <span className="font-mono">{formatCurrency(payrollStatus.totals.employerContribs)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Net:</span>
                      <span className="font-mono">{formatCurrency(payrollStatus.totals.net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Headcount:</span>
                      <div className="flex items-center gap-1">
                        <span>{payrollStatus.totals.headcount}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${payrollStatus.totals.deltaPercent > 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {payrollStatus.totals.deltaPercent > 0 ? '+' : ''}{payrollStatus.totals.deltaPercent}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Variance Cards</h4>
                  <div className="space-y-2">
                    <div className="p-2 border rounded bg-orange-50 dark:bg-orange-950/20">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-orange-600" />
                        <span className="text-sm font-medium">OT Cost</span>
                      </div>
                      <div className="text-sm">+{formatCurrency(kpiData.variance.otCost)} vs last month</div>
                    </div>
                    <div className="p-2 border rounded bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-blue-600" />
                        <span className="text-sm font-medium">Nights</span>
                      </div>
                      <div className="text-sm">+{kpiData.variance.nightHours} hrs</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Third Row - Hours & Cost KPIs */}
          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Hours & Cost KPIs
                  </CardTitle>
                  <CardDescription className="text-neutral-200 dark:text-neutral-300 text-sm mt-1">
                    Night Hours: 22:00–06:00 • Sunday/Holiday: Calendar flags
                  </CardDescription>
                </div>
                <div className="text-xs text-neutral-200 dark:text-neutral-300">
                  Updated {formatTimeAgo(lastUpdated)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-3">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Hours Breakdown</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleActionClick('view', 'timesheet')}
                      className="h-7 px-3 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Timesheet
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-2xl font-semibold text-blue-600">{kpiData.hours.regular.toLocaleString()}</div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300 mt-1">Regular</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <div className="text-2xl font-semibold text-orange-600">{kpiData.hours.overtimeTier1}</div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300 mt-1">OT Tier 1</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-2xl font-semibold text-red-600">{kpiData.hours.overtimeTier2}</div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300 mt-1">OT Tier 2</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <div className="text-2xl font-semibold text-purple-600">{kpiData.hours.night}</div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300 mt-1">Night (22:00-06:00)</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-2xl font-semibold text-green-600">{kpiData.hours.sunday}</div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300 mt-1">Sunday</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <div className="text-2xl font-semibold text-yellow-600">{kpiData.hours.holiday}</div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300 mt-1">Holiday</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Labor Cost vs Budget</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleActionClick('request', 'leave')}
                      className="h-7 px-3 text-xs"
                    >
                      Request Leave
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-200 dark:text-neutral-300">Budget:</span>
                      <span className="font-mono font-medium">{formatCurrency(kpiData.costs.laborBudget)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-200 dark:text-neutral-300">Actual:</span>
                      <span className="font-mono font-medium">{formatCurrency(kpiData.costs.actualLabor)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-200 dark:text-neutral-300 text-sm">Variance:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold text-green-600">
                          {formatCurrency(kpiData.costs.laborBudget - kpiData.costs.actualLabor)}
                        </span>
                        <Badge variant="outline" className="text-green-600 text-xs">
                          {calculateLaborVsBudget(kpiData.costs.actualLabor, kpiData.costs.laborBudget)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t text-xs text-neutral-200 dark:text-neutral-300">
                    Formula: (actual € - budget €) / budget €
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Efficiency Metrics</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleActionClick('preview', 'payslip')}
                      className="h-7 px-3 text-xs"
                      disabled={payrollStatus.stage !== 'finalized'}
                    >
                      Preview Payslip
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-200 dark:text-neutral-300">LC per Occ. Room:</span>
                        <span className="font-mono font-semibold">€{kpiData.costs.costPerRoom}</span>
                      </div>
                      <div className="text-xs text-neutral-200 dark:text-neutral-300 mt-1">
                        Formula: total labor € ÷ occupied rooms
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-200 dark:text-neutral-300">Cost per Cover:</span>
                      <span className="font-mono font-medium">€{kpiData.costs.costPerCover}</span>
                    </div>
                    <div className="p-2 border rounded bg-green-50 dark:bg-green-950/20">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-800 dark:text-green-200">Tip Pool:</span>
                        <span className="font-mono font-semibold text-green-600">{formatCurrency(kpiData.costs.tipPool)}</span>
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Configured % of eligible revenue + manual top-ups
                      </div>
                      <Badge variant="outline" className="w-full justify-center mt-2 text-xs">
                        Distribution Pending
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fourth Row - Time & Attendance + Forecast */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Time & Attendance Today */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Time & Attendance Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  
                  <div>
                    <h4 className="font-semibold mb-2">Who's On Now</h4>
                    <div className="space-y-2">
                      {liveAttendanceData.onNow.map((dept, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{dept.department}</span>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={dept.count === dept.scheduled ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {dept.count}/{dept.scheduled}
                            </Badge>
                            {dept.count < dept.scheduled && (
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Late/Missing Punches</h4>
                    <div className="space-y-2">
                      {liveAttendanceData.lateMissing.map((person, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 border rounded">
                          <div>
                            <span className="text-sm font-medium">{person.name}</span>
                            <span className="text-xs text-gray-600 ml-2">{person.department}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {person.status} {person.minutes}m
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleActionClick('fix_punch', person.name)}>
                              Fix
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Device Health</h4>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">Kiosks Online</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          {liveAttendanceData.deviceHealth.kiosksOnline}/{liveAttendanceData.deviceHealth.totalKiosks}
                        </Badge>
                        {liveAttendanceData.deviceHealth.kiosksOnline === liveAttendanceData.deviceHealth.totalKiosks ? (
                          <Wifi className="h-4 w-4 text-green-600" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    {liveAttendanceData.deviceHealth.clockDriftFlags > 0 && (
                      <div className="flex items-center justify-between p-2 border rounded bg-yellow-50 dark:bg-yellow-950/20">
                        <span className="text-sm">Clock Drift Flags</span>
                        <Badge variant="secondary">{liveAttendanceData.deviceHealth.clockDriftFlags}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Forecast & Risk */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Forecast & Risk (Next 2 Weeks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  
                  <div>
                    <h4 className="font-semibold mb-2">Projected Payroll vs Budget</h4>
                    <div className="p-3 border rounded bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex justify-between mb-2">
                        <span>Projected:</span>
                        <span className="font-mono">{formatCurrency(forecastData.projectedPayroll)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span>Budget:</span>
                        <span className="font-mono">{formatCurrency(forecastData.budgetPayroll)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <Badge variant="outline">{forecastData.confidence}%</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Employees Near OT Cap</h4>
                    <div className="space-y-2">
                      {forecastData.nearOvertimeCap.map((emp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 border rounded">
                          <div>
                            <span className="text-sm font-medium">{emp.name}</span>
                            <span className="text-xs text-gray-600 ml-2">{emp.department}</span>
                          </div>
                          <Badge variant="outline" className="text-orange-600">
                            {emp.remaining}h left
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Schedule Gaps</h4>
                    <div className="space-y-2">
                      {forecastData.scheduleGaps.map((gap, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 border rounded">
                          <div>
                            <span className="text-sm font-medium">{gap.date}</span>
                            <span className="text-xs text-gray-600 ml-2">{gap.shift} - {gap.department}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {gap.uncovered} uncovered
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleActionClick('schedule_gap', gap.date)}>
                              Fix
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fifth Row - Filings & Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Filings & Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    ERGANI
                    <Badge variant="outline" className="text-xs">
                      {filingsData.ergani.submitted + filingsData.ergani.failed + filingsData.ergani.awaiting}
                    </Badge>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Submitted:</span>
                      <Badge variant="default">{filingsData.ergani.submitted}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed:</span>
                      <Badge variant={filingsData.ergani.failed > 0 ? 'destructive' : 'outline'}>
                        {filingsData.ergani.failed}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Awaiting:</span>
                      <Badge variant="secondary">{filingsData.ergani.awaiting}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">APD (e-EFKA)</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Built</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Ready to Submit</span>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => handleActionClick('submit', 'APD')}>
                      Submit to APD
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">ΦΜΥ (AADE)</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Built & Submitted</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Payment Date:</span>
                      <Badge variant="outline">{filingsData.fmy.paymentDate}</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-1" />
                      View Receipt
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">SEPA Payments</h4>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <div className="font-medium">File ID: {filingsData.sepa.fileId}</div>
                      <div>Amount: {formatCurrency(filingsData.sepa.amount)}</div>
                      <div>Status: 
                        <Badge variant="secondary" className="ml-1">
                          {filingsData.sepa.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {filingsData.sepa.rejects > 0 && (
                        <div>Rejects: 
                          <Badge variant="destructive" className="ml-1">
                            {filingsData.sepa.rejects}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" onClick={() => handleActionClick('upload', 'SEPA')}>
                        <Download className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}