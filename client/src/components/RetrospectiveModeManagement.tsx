import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText,
  Database,
  Send,
  Settings,
  BarChart3,
  Users,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import our comprehensive services
import { 
  RetrospectiveProcessingEngine,
  createRetrospectiveProcessingEngine,
  type RetrospectiveProcessingResult,
  type ConsolidatedShift 
} from "@/lib/retrospectiveProcessingEngine";

import { 
  ErganiDeclarationService,
  createErganiDeclarationService,
  type ErganiSubmissionResult,
  type ComplianceDeadlines
} from "@/lib/erganiDeclarationService";

import { 
  EntityMonthModeService,
  createEntityMonthModeService,
  type MonthModeStatus,
  type ComplianceReport,
  type MonthModeDeclaration
} from "@/lib/entityMonthModeService";

interface RetrospectiveModeManagementProps {
  tenantId: string;
  companyId: string;
  locale?: 'en' | 'el';
}

interface ProcessingStatus {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  result?: RetrospectiveProcessingResult;
  error?: string;
}

interface MonthlyOverview {
  month: string;
  mode: 'retrospective' | 'preannounce' | 'undeclared';
  status: MonthModeStatus;
  batchesSubmitted: number;
  pendingItems: number;
  complianceScore: number;
}

/**
 * Comprehensive Retrospective Mode Management Dashboard
 * Implements the full Greek Digital Work Card retrospective architecture
 */
export function RetrospectiveModeManagement({ 
  tenantId, 
  companyId, 
  locale = 'el' 
}: RetrospectiveModeManagementProps) {
  const { toast } = useToast();
  
  // Services initialization
  const [processingEngine] = useState(() => createRetrospectiveProcessingEngine({
    ingestion: { nearRealTimeEnabled: true },
    detection: { autoCreateChangeItems: true },
    submission: { internalDeadlineHours: 72 }
  }));
  
  const [erganiService] = useState(() => createErganiDeclarationService({
    apiEndpoint: "/api/ergani/submit",
    apiKey: "test_key",
    companyAFM: "123456789",
    testMode: true,
    retryAttempts: 3,
    batchSizeLimit: 100
  }));
  
  const [monthModeService] = useState(() => createEntityMonthModeService(tenantId, companyId));

  // State management
  const [selectedMonth, setSelectedMonth] = useState(() => 
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isRunning: false,
    progress: 0,
    currentStep: 'Idle'
  });
  const [monthlyOverviews, setMonthlyOverviews] = useState<MonthlyOverview[]>([]);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [monthModeDeclaration, setMonthModeDeclaration] = useState<Partial<MonthModeDeclaration>>({
    mode: 'retrospective',
    justification: ''
  });

  // Load data on component mount
  useEffect(() => {
    loadMonthlyOverviews();
    generateComplianceReport();
  }, [selectedMonth]);

  const loadMonthlyOverviews = async () => {
    // Generate 6-month overview
    const months = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    for (let i = 0; i < 6; i++) {
      const month = new Date(startDate);
      month.setMonth(month.getMonth() + i);
      const monthStr = month.toISOString().slice(0, 7);
      
      const status = await monthModeService.getMonthModeStatus(monthStr);
      months.push({
        month: monthStr,
        mode: status.currentMode,
        status,
        batchesSubmitted: Math.floor(Math.random() * 5), // Mock data
        pendingItems: Math.floor(Math.random() * 20),
        complianceScore: Math.floor(Math.random() * 40 + 60)
      });
    }
    
    setMonthlyOverviews(months);
  };

  const generateComplianceReport = async () => {
    const startMonth = new Date();
    startMonth.setMonth(startMonth.getMonth() - 6);
    const endMonth = new Date();
    endMonth.setMonth(endMonth.getMonth() + 3);
    
    const report = await monthModeService.generateComplianceReport(
      startMonth.toISOString().slice(0, 7),
      endMonth.toISOString().slice(0, 7)
    );
    
    setComplianceReport(report);
  };

  const declareMonthMode = async () => {
    if (!monthModeDeclaration.mode || !monthModeDeclaration.justification) {
      toast({
        title: locale === 'el' ? "Σφάλμα" : "Error",
        description: locale === 'el' 
          ? "Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία"
          : "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const declaration: MonthModeDeclaration = {
        month: selectedMonth,
        mode: monthModeDeclaration.mode,
        justification: monthModeDeclaration.justification,
        declaredBy: 'current_user' // In real app, get from auth context
      };

      const result = await monthModeService.declareMonthMode(declaration);
      
      if (result.success) {
        toast({
          title: locale === 'el' ? "Επιτυχία" : "Success",
          description: locale === 'el' 
            ? `Τρόπος λειτουργίας "${declaration.mode}" δηλώθηκε για ${selectedMonth}`
            : `Operational mode "${declaration.mode}" declared for ${selectedMonth}`
        });
        
        await loadMonthlyOverviews();
        setMonthModeDeclaration({ mode: 'retrospective', justification: '' });
      } else {
        toast({
          title: locale === 'el' ? "Σφάλμα επικύρωσης" : "Validation Error",
          description: result.validationResult.errors.join(', '),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: locale === 'el' ? "Σφάλμα" : "Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const runRetrospectiveProcessing = async () => {
    setProcessingStatus({
      isRunning: true,
      progress: 0,
      currentStep: locale === 'el' ? 'Έναρξη επεξεργασίας...' : 'Starting processing...'
    });

    try {
      // Simulate comprehensive processing steps
      const steps = [
        { step: locale === 'el' ? 'Συλλογή χτυπημάτων...' : 'Ingesting timeline events...', progress: 20 },
        { step: locale === 'el' ? 'Ενοποίηση βαρδιών...' : 'Consolidating shifts...', progress: 40 },
        { step: locale === 'el' ? 'Ανίχνευση αποκλίσεων...' : 'Detecting deviations...', progress: 60 },
        { step: locale === 'el' ? 'Δημιουργία δεσμών ERGANI...' : 'Building ERGANI batches...', progress: 80 },
        { step: locale === 'el' ? 'Δημιουργία αποδεικτικών...' : 'Generating evidence packs...', progress: 95 },
        { step: locale === 'el' ? 'Ολοκλήρωση' : 'Complete', progress: 100 }
      ];

      for (const { step, progress } of steps) {
        setProcessingStatus(prev => ({ ...prev, currentStep: step, progress }));
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
      }

      // Mock successful result
      const mockResult: RetrospectiveProcessingResult = {
        ingestedEvents: 1247,
        consolidatedShifts: 342,
        detectedChanges: [],
        createdBatches: [],
        evidencePacksGenerated: 89,
        complianceStatus: 'compliant',
        processingErrors: []
      };

      setProcessingStatus(prev => ({
        ...prev,
        isRunning: false,
        result: mockResult,
        currentStep: locale === 'el' ? 'Ολοκληρώθηκε επιτυχώς' : 'Completed successfully'
      }));

      toast({
        title: locale === 'el' ? "Επεξεργασία ολοκληρώθηκε" : "Processing completed",
        description: locale === 'el' 
          ? `Επεξεργάστηκαν ${mockResult.ingestedEvents} χτυπήματα, δημιουργήθηκαν ${mockResult.evidencePacksGenerated} αποδεικτικά`
          : `Processed ${mockResult.ingestedEvents} events, generated ${mockResult.evidencePacksGenerated} evidence packs`
      });

      await loadMonthlyOverviews();

    } catch (error) {
      setProcessingStatus(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }));
      
      toast({
        title: locale === 'el' ? "Σφάλμα επεξεργασίας" : "Processing Error",
        description: error instanceof Error ? error.message : 'Unknown processing error',
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: MonthModeStatus['deadlineStatus']) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'overdue': return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: MonthModeStatus['deadlineStatus']) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
    }
  };

  const getModeLabel = (mode: string) => {
    if (locale === 'el') {
      switch (mode) {
        case 'retrospective': return 'Απολογιστικό';
        case 'preannounce': return 'Προαναγγελτικό';
        case 'undeclared': return 'Μη δηλωμένο';
        default: return mode;
      }
    }
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {locale === 'el' ? 'Διαχείριση Απολογιστικού Συστήματος' : 'Retrospective Mode Management'}
          </h2>
          <p className="text-muted-foreground">
            {locale === 'el' 
              ? 'Ψηφιακή Κάρτα Εργασίας - Σύστημα απολογιστικής λειτουργίας με 5ετή αρχειοθέτηση'
              : 'Digital Work Card - Retrospective operational system with 5-year retention'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <span className="text-sm text-muted-foreground">{companyId}</span>
        </div>
      </div>

      {/* Quick Stats */}
      {complianceReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {locale === 'el' ? 'Βαθμολογία συμμόρφωσης' : 'Compliance Score'}
                  </p>
                  <p className="text-2xl font-bold">{complianceReport.complianceScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {locale === 'el' ? 'Δηλωμένοι μήνες' : 'Declared Months'}
                  </p>
                  <p className="text-2xl font-bold">
                    {complianceReport.declaredMonths}/{complianceReport.totalMonths}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {locale === 'el' ? 'Εκπρόθεσμοι' : 'Overdue'}
                  </p>
                  <p className="text-2xl font-bold">{complianceReport.overdueMonths}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {locale === 'el' ? 'Συγκρουόμενοι' : 'Conflicting'}
                  </p>
                  <p className="text-2xl font-bold">{complianceReport.conflictingModes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            {locale === 'el' ? 'Επισκόπηση' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="month-mode">
            {locale === 'el' ? 'Δήλωση μήνα' : 'Month Declaration'}
          </TabsTrigger>
          <TabsTrigger value="processing">
            {locale === 'el' ? 'Επεξεργασία' : 'Processing'}
          </TabsTrigger>
          <TabsTrigger value="batches">
            {locale === 'el' ? 'Δέσμες ERGANI' : 'ERGANI Batches'}
          </TabsTrigger>
          <TabsTrigger value="compliance">
            {locale === 'el' ? 'Συμμόρφωση' : 'Compliance'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {locale === 'el' ? 'Μηνιαία επισκόπηση' : 'Monthly Overview'}
              </CardTitle>
              <CardDescription>
                {locale === 'el' 
                  ? 'Κατάσταση λειτουργίας και συμμόρφωση ανά μήνα'
                  : 'Operational mode status and compliance by month'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthlyOverviews.map((overview) => (
                  <Card key={overview.month} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          {new Date(overview.month + '-01').toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-US', {
                            year: 'numeric',
                            month: 'long'
                          })}
                        </CardTitle>
                        {getStatusIcon(overview.status.deadlineStatus)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(overview.status.deadlineStatus)}>
                          {getModeLabel(overview.mode)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {overview.status.daysRemaining > 0 
                            ? `${overview.status.daysRemaining} ${locale === 'el' ? 'ημέρες' : 'days'}`
                            : locale === 'el' ? 'Εκπρόθεσμο' : 'Overdue'
                          }
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{locale === 'el' ? 'Δέσμες ERGANI:' : 'ERGANI Batches:'}</span>
                          <span className="font-medium">{overview.batchesSubmitted}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{locale === 'el' ? 'Εκκρεμείς:' : 'Pending:'}</span>
                          <span className="font-medium">{overview.pendingItems}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{locale === 'el' ? 'Συμμόρφωση:' : 'Compliance:'}</span>
                          <span className="font-medium">{overview.complianceScore}%</span>
                        </div>
                        <Progress value={overview.complianceScore} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month-mode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {locale === 'el' ? 'Δήλωση τρόπου λειτουργίας μήνα' : 'Month Mode Declaration'}
              </CardTitle>
              <CardDescription>
                {locale === 'el' 
                  ? 'Δηλώστε τον τρόπο λειτουργίας για τον επιλεγμένο μήνα (δεν επιτρέπεται ανάμιξη τρόπων στον ίδιο μήνα)'
                  : 'Declare operational mode for selected month (cannot mix modes within same month)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="month-select">
                      {locale === 'el' ? 'Επιλογή μήνα' : 'Select Month'}
                    </Label>
                    <Input
                      id="month-select"
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mode-select">
                      {locale === 'el' ? 'Τρόπος λειτουργίας' : 'Operational Mode'}
                    </Label>
                    <Select
                      value={monthModeDeclaration.mode}
                      onValueChange={(value: 'retrospective' | 'preannounce') => 
                        setMonthModeDeclaration(prev => ({ ...prev, mode: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={locale === 'el' ? "Επιλέξτε τρόπο..." : "Select mode..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retrospective">
                          {locale === 'el' ? 'Απολογιστικό' : 'Retrospective'}
                        </SelectItem>
                        <SelectItem value="preannounce">
                          {locale === 'el' ? 'Προαναγγελτικό' : 'Pre-announcement'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="justification">
                      {locale === 'el' ? 'Αιτιολογία' : 'Justification'}
                    </Label>
                    <Textarea
                      id="justification"
                      placeholder={locale === 'el' 
                        ? "Αιτιολογήστε την επιλογή του τρόπου λειτουργίας..."
                        : "Provide justification for mode selection..."
                      }
                      value={monthModeDeclaration.justification || ''}
                      onChange={(e) => 
                        setMonthModeDeclaration(prev => ({ ...prev, justification: e.target.value }))
                      }
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <Button onClick={declareMonthMode} className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    {locale === 'el' ? 'Δήλωση τρόπου λειτουργίας' : 'Declare Mode'}
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      {locale === 'el' ? 'Νομικές απαιτήσεις' : 'Legal Requirements'}
                    </AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>
                        {locale === 'el' 
                          ? '• Δεν επιτρέπεται ανάμιξη τρόπων λειτουργίας εντός του ίδιου μήνα'
                          : '• Cannot mix operational modes within the same month'}
                      </p>
                      <p>
                        {locale === 'el' 
                          ? '• Προθεσμία δήλωσης: 10η του επόμενου μήνα'
                          : '• Declaration deadline: 10th of following month'}
                      </p>
                      <p>
                        {locale === 'el' 
                          ? '• Απολογιστικό: Προθεσμία υποβολής T+3 εργάσιμες'
                          : '• Retrospective: Submission deadline T+3 working days'}
                      </p>
                    </AlertDescription>
                  </Alert>
                  
                  {complianceReport && complianceReport.recommendations.length > 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>
                        {locale === 'el' ? 'Συστάσεις' : 'Recommendations'}
                      </AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {complianceReport.recommendations.slice(0, 3).map((rec, index) => (
                            <li key={index} className="text-sm">{rec}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {locale === 'el' ? 'Επεξεργασία απολογιστικών δεδομένων' : 'Retrospective Data Processing'}
              </CardTitle>
              <CardDescription>
                {locale === 'el' 
                  ? 'Μηχανισμός επεξεργασίας για ingestion, ενοποίηση, ανίχνευση αποκλίσεων και δημιουργία αποδεικτικών'
                  : 'Processing engine for ingestion, consolidation, deviation detection, and evidence generation'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Button 
                    onClick={runRetrospectiveProcessing}
                    disabled={processingStatus.isRunning}
                    className="w-full"
                    size="lg"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {processingStatus.isRunning 
                      ? (locale === 'el' ? 'Επεξεργασία...' : 'Processing...')
                      : (locale === 'el' ? 'Έναρξη επεξεργασίας' : 'Start Processing')
                    }
                  </Button>
                  
                  {processingStatus.isRunning && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {locale === 'el' ? 'Πρόοδος' : 'Progress'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {processingStatus.progress}%
                        </span>
                      </div>
                      <Progress value={processingStatus.progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {processingStatus.currentStep}
                      </p>
                    </div>
                  )}
                  
                  {processingStatus.result && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-green-600">
                          {locale === 'el' ? 'Αποτελέσματα επεξεργασίας' : 'Processing Results'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              {locale === 'el' ? 'Χτυπήματα:' : 'Events:'}
                            </span>
                            <span className="font-medium ml-2">
                              {processingStatus.result.ingestedEvents}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {locale === 'el' ? 'Βάρδιες:' : 'Shifts:'}
                            </span>
                            <span className="font-medium ml-2">
                              {processingStatus.result.consolidatedShifts}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {locale === 'el' ? 'Αποδεικτικά:' : 'Evidence:'}
                            </span>
                            <span className="font-medium ml-2">
                              {processingStatus.result.evidencePacksGenerated}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {locale === 'el' ? 'Κατάσταση:' : 'Status:'}
                            </span>
                            <Badge variant={processingStatus.result.complianceStatus === 'compliant' ? 'default' : 'destructive'} className="ml-2">
                              {processingStatus.result.complianceStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <div className="space-y-4">
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertTitle>
                      {locale === 'el' ? 'Αρχιτεκτονική επεξεργασίας' : 'Processing Architecture'}
                    </AlertTitle>
                    <AlertDescription className="space-y-2 text-sm">
                      <div>
                        <strong>1. Ingestion:</strong> {locale === 'el' 
                          ? 'Συλλογή χτυπημάτων σε πραγματικό χρόνο'
                          : 'Real-time punch collection'}
                      </div>
                      <div>
                        <strong>2. Consolidation:</strong> {locale === 'el' 
                          ? 'Ενοποίηση in/out, νυχτερινές ζώνες'
                          : 'Pair in/out, night zones'}
                      </div>
                      <div>
                        <strong>3. Detection:</strong> {locale === 'el' 
                          ? 'Σύγκριση με baseline, αποκλίσεις'
                          : 'Baseline comparison, deviations'}
                      </div>
                      <div>
                        <strong>4. Evidence:</strong> {locale === 'el' 
                          ? 'Δημιουργία αποδεικτικών (5ετή)'
                          : 'Evidence packs (5-year retention)'}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {locale === 'el' ? 'Δέσμες ERGANI II' : 'ERGANI II Batches'}
              </CardTitle>
              <CardDescription>
                {locale === 'el' 
                  ? 'Σύστημα δεσμών για υποβολή δηλώσεων με προθεσμία T+3 εργάσιμες'
                  : 'Batch system for declaration submissions with T+3 working days deadline'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {locale === 'el' ? 'Δέσμες υπό ανάπτυξη' : 'Batches Under Development'}
                  </AlertTitle>
                  <AlertDescription>
                    {locale === 'el' 
                      ? 'Η διαχείριση δεσμών ERGANI II θα υλοποιηθεί με την ολοκλήρωση του processing engine.'
                      : 'ERGANI II batch management will be implemented upon completion of the processing engine.'}
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-blue-600">0</div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'el' ? 'Ενεργές δέσμες' : 'Active Batches'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-green-600">0</div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'el' ? 'Υποβληθείσες' : 'Submitted'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className="text-2xl font-bold text-yellow-600">0</div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'el' ? 'Εκκρεμείς' : 'Pending'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          {complianceReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {locale === 'el' ? 'Αναφορά συμμόρφωσης' : 'Compliance Report'}
                </CardTitle>
                <CardDescription>
                  {locale === 'el' 
                    ? 'Ολοκληρωμένη αξιολόγηση συμμόρφωσης με ελληνική νομοθεσία'
                    : 'Comprehensive compliance assessment with Greek legislation'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {locale === 'el' ? 'Συνολική βαθμολογία' : 'Overall Score'}
                        </span>
                        <Badge variant={
                          complianceReport.riskLevel === 'low' ? 'default' :
                          complianceReport.riskLevel === 'medium' ? 'secondary' :
                          complianceReport.riskLevel === 'high' ? 'secondary' : 'destructive'
                        }>
                          {complianceReport.complianceScore}%
                        </Badge>
                      </div>
                      <Progress value={complianceReport.complianceScore} className="h-3" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {complianceReport.declaredMonths}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'el' ? 'Δηλωμένοι' : 'Declared'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {complianceReport.overdueMonths}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'el' ? 'Εκπρόθεσμοι' : 'Overdue'}
                        </div>
                      </div>
                    </div>
                    
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>
                        {locale === 'el' ? 'Επίπεδο κινδύνου' : 'Risk Level'}
                      </AlertTitle>
                      <AlertDescription>
                        <Badge variant={
                          complianceReport.riskLevel === 'low' ? 'default' :
                          complianceReport.riskLevel === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {complianceReport.riskLevel.toUpperCase()}
                        </Badge>
                        <span className="ml-2">
                          {locale === 'el' 
                            ? complianceReport.riskLevel === 'low' ? 'Χαμηλός κίνδυνος' :
                              complianceReport.riskLevel === 'medium' ? 'Μέτριος κίνδυνος' :
                              complianceReport.riskLevel === 'high' ? 'Υψηλός κίνδυνος' : 'Κρίσιμος κίνδυνος'
                            : `${complianceReport.riskLevel} risk`}
                        </span>
                      </AlertDescription>
                    </Alert>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-3">
                        {locale === 'el' ? 'Συστάσεις βελτίωσης' : 'Improvement Recommendations'}
                      </h4>
                      <div className="space-y-2">
                        {complianceReport.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}