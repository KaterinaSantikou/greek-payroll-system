import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  Activity
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
  const [selectedProperty, setSelectedProperty] = useState("prop-princess");
  const [selectedPeriod, setPeriod] = useState("this-month");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Properties data
  const properties: Property[] = [
    { id: "prop-princess", name: "Princess", group: "Luxury Collection" },
    { id: "prop-aegean", name: "Aegean Suites", group: "Luxury Collection" },
    { id: "prop-marpunta", name: "Marpunta", group: "Beach Resort" },
    { id: "prop-alex", name: "The Alex", group: "City Hotels" },
    { id: "prop-atlantis", name: "Atlantis", group: "Resort Complex" }
  ];

  // Mock data with realistic values
  const actionInboxData = {
    approvals: [
      { type: "overtime", count: 7, urgency: "high", impact: "medium" },
      { type: "schedule_changes", count: 3, urgency: "medium", impact: "low" },
      { type: "corrections", count: 2, urgency: "low", impact: "high" }
    ],
    exceptions: [
      { type: "missed_punches", count: 5, urgency: "high" },
      { type: "duplicate_punches", count: 2, urgency: "medium" },
      { type: "wrong_site", count: 1, urgency: "low" },
      { type: "break_issues", count: 3, urgency: "medium" }
    ],
    filings: [
      { type: "ERGANI", ddays: 1, status: "pending", urgency: "critical" },
      { type: "APD", ddays: 3, status: "ready", urgency: "high" },
      { type: "ΦΜΥ", ddays: 7, status: "draft", urgency: "medium" }
    ],
    banking: [
      { type: "SEPA_upload", count: 1, urgency: "high" },
      { type: "pain002_rejects", count: 0, urgency: "none" }
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
    new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    return minutes < 1 ? 'Just now' : `${minutes}m ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-4">
        
        {/* Top Bar - Always Visible */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-lg shadow-sm border mb-6 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            
            {/* Left Side - Property & Period */}
            <div className="flex items-center gap-4">
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

            {/* Center - Global Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="⌘K Search people, runs, filings, actions..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleGlobalSearch(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Right Side - Data Freshness */}
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Updated {formatTimeAgo(lastUpdated)} • 
                <span className="text-green-600 font-medium"> ERGANI in sync</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLastUpdated(new Date())}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-6">
          
          {/* First Row - Action Inbox & Compliance Strip */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Action Inbox (2/3 width) */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Action Inbox
                  </CardTitle>
                  <CardDescription>1-click to clear blockers • Sorted by urgency & impact</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    
                    {/* Approvals Pending */}
                    <div className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Approvals Pending
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        {actionInboxData.approvals.map((item, idx) => (
                          <Button 
                            key={idx} 
                            variant="outline" 
                            size="sm" 
                            className="justify-between h-auto p-2"
                            onClick={() => handleActionClick('approval', item.type)}
                          >
                            <div className="text-left">
                              <div className="font-medium text-xs">
                                {item.type.replace('_', ' ')}
                              </div>
                              <div className="text-xs text-gray-500">{item.count} items</div>
                            </div>
                            <Badge 
                              variant={item.urgency === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {item.urgency}
                            </Badge>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Exceptions to Resolve */}
                    <div className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Exceptions to Resolve
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {actionInboxData.exceptions.map((item, idx) => (
                          <Button 
                            key={idx} 
                            variant="outline" 
                            size="sm"
                            className="justify-between h-auto p-2"
                            onClick={() => handleActionClick('exception', item.type)}
                          >
                            <div className="text-left">
                              <div className="font-medium text-xs">
                                {item.type.replace('_', ' ')}
                              </div>
                              <div className="text-xs text-gray-500">{item.count} items</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Filings Due */}
                    <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Filings Due
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
                            <div className="text-left">
                              <div className="font-medium text-xs">{item.type}</div>
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
                    <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <BanknoteIcon className="h-4 w-4" />
                        Bank Tasks
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {actionInboxData.banking.map((item, idx) => (
                          <Button 
                            key={idx} 
                            variant="outline" 
                            size="sm"
                            className="justify-between h-auto p-2"
                            onClick={() => handleActionClick('banking', item.type)}
                            disabled={item.count === 0}
                          >
                            <div className="text-left">
                              <div className="font-medium text-xs">
                                {item.type.replace('_', ' ')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.count || 'none'} {item.count === 1 ? 'item' : 'items'}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compliance Strip (1/3 width) */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Compliance Strip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Digital Work Card</span>
                        <Badge variant="default">
                          {Math.round((complianceData.digitalWorkCard.covered / complianceData.digitalWorkCard.scheduled) * 100)}%
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mb-1">
                        {complianceData.digitalWorkCard.covered}/{complianceData.digitalWorkCard.scheduled} scheduled clocked in
                      </div>
                      <Progress 
                        value={(complianceData.digitalWorkCard.covered / complianceData.digitalWorkCard.scheduled) * 100} 
                        className="h-2"
                      />
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
                      <div className="text-xs text-gray-600">
                        Success rate: {Math.round((complianceData.erganiQueue.success / (complianceData.erganiQueue.success + complianceData.erganiQueue.failed)) * 100)}%
                        {complianceData.erganiQueue.retries > 0 && ` • ${complianceData.erganiQueue.retries} retrying`}
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Min-wage Guardrail</span>
                        <Badge variant={complianceData.minWageAlerts > 0 ? 'destructive' : 'default'}>
                          {complianceData.minWageAlerts}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
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
                      <div className="text-xs text-gray-600">
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
              <div className="grid lg:grid-cols-4 gap-6">
                
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Hours & Cost KPIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-4 gap-6">
                
                <div className="lg:col-span-2">
                  <h4 className="font-semibold mb-3">Hours Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{kpiData.hours.regular.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Regular</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{kpiData.hours.overtimeTier1}</div>
                      <div className="text-sm text-gray-600">OT Tier 1</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{kpiData.hours.overtimeTier2}</div>
                      <div className="text-sm text-gray-600">OT Tier 2</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{kpiData.hours.night}</div>
                      <div className="text-sm text-gray-600">Night</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{kpiData.hours.sunday}</div>
                      <div className="text-sm text-gray-600">Sunday</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{kpiData.hours.holiday}</div>
                      <div className="text-sm text-gray-600">Holiday</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Labor Cost vs Budget</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Budget:</span>
                      <span className="font-mono">{formatCurrency(kpiData.costs.laborBudget)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span className="font-mono">{formatCurrency(kpiData.costs.actualLabor)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Variance:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-green-600">
                          {formatCurrency(kpiData.costs.laborBudget - kpiData.costs.actualLabor)}
                        </span>
                        <Badge variant="outline" className="text-green-600">
                          -{((1 - kpiData.costs.actualLabor / kpiData.costs.laborBudget) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Efficiency Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Cost per Room:</span>
                      <span className="font-mono">€{kpiData.costs.costPerRoom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost per Cover:</span>
                      <span className="font-mono">€{kpiData.costs.costPerCover}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tip Pool:</span>
                      <span className="font-mono">{formatCurrency(kpiData.costs.tipPool)}</span>
                    </div>
                    <Badge variant="outline" className="w-full justify-center">
                      Distribution Pending
                    </Badge>
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
              <div className="grid lg:grid-cols-4 gap-6">
                
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