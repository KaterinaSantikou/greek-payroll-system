import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  Smartphone,
  Clock,
  FileCheck,
  Euro,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Building,
  Users,
  Upload,
  Download,
  Play,
  Pause,
  Settings,
  Eye,
  Database,
  Zap,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { useAuth } from '@/hooks/useAuth';

interface DigitalWorkCard {
  employeeId: string;
  cardId: string;
  status: 'active' | 'inactive' | 'suspended';
  lastSync: string;
  realTimeAttendance: boolean;
  erganiSyncStatus: 'synced' | 'pending' | 'failed';
}

interface ERGANIEvent {
  eventId: string;
  type:
    | 'hire'
    | 'schedule_declaration'
    | 'schedule_change'
    | 'overtime'
    | 'leave'
    | 'contract_change'
    | 'termination';
  employeeId: string;
  timestamp: string;
  status: 'submitted' | 'pending' | 'failed' | 'acknowledged';
  submissionId?: string;
  errorMessage?: string;
}

interface MinimumWageRule {
  ruleId: string;
  effectiveDate: string;
  amount: number;
  category: 'general' | 'under_25' | 'apprentice' | 'trainee';
  region?: string;
  industry?: string;
  isActive: boolean;
}

interface GovernmentFlow {
  flowId: string;
  name: string;
  type: 'ergani' | 'efka' | 'aade';
  frequency: 'real-time' | 'daily' | 'monthly';
  lastSubmission: string;
  nextDue: string;
  status: 'up_to_date' | 'pending' | 'overdue' | 'failed';
  filings: number;
}

interface GreekSpecialPay {
  payId: string;
  type: 'christmas_bonus' | 'easter_bonus' | 'vacation_allowance';
  name: string;
  nameGreek: string;
  calculationRule: string;
  eligibilityRules: string[];
  taxable: boolean;
  efkaSubject: boolean;
}

export default function ERGANICompliancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedFlow, setSelectedFlow] = useState<string>('ergani');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2024-12');

  // Digital Work Cards Query
  const { data: workCards, isLoading: workCardsLoading } = useQuery<
    DigitalWorkCard[]
  >({
    queryKey: ['/api/compliance/digital-work-cards'],
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // ERGANI Events Query
  const { data: erganiEvents, isLoading: eventsLoading } = useQuery<
    ERGANIEvent[]
  >({
    queryKey: ['/api/compliance/ergani-events', selectedPeriod],
    enabled: isAuthenticated && !!selectedPeriod,
  });

  // Minimum Wage Rules Query
  const { data: wageRules, isLoading: wageRulesLoading } = useQuery<
    MinimumWageRule[]
  >({
    queryKey: ['/api/compliance/minimum-wage-rules'],
    enabled: isAuthenticated,
  });

  // Government Flows Query
  const { data: governmentFlows, isLoading: flowsLoading } = useQuery<
    GovernmentFlow[]
  >({
    queryKey: ['/api/compliance/government-flows'],
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  // Greek Special Pays Query
  const { data: specialPays, isLoading: specialPaysLoading } = useQuery<
    GreekSpecialPay[]
  >({
    queryKey: ['/api/compliance/special-pays'],
    enabled: isAuthenticated,
  });

  // Generate Demo Data Mutation
  const generateDemoMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/compliance/generate-demo', 'POST');
    },
    onSuccess: () => {
      toast({
        title: 'Demo Data Generated',
        description:
          'Greece compliance demo data has been generated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
    },
    onError: error => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: 'Error',
        description: 'Failed to generate demo data. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Sync ERGANI Mutation
  const syncERGANIMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/compliance/ergani-sync', 'POST');
    },
    onSuccess: () => {
      toast({
        title: 'ERGANI Sync Started',
        description: 'Real-time ERGANI II synchronization initiated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/compliance'] });
    },
    onError: error => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: 'Error',
        description: 'Failed to sync ERGANI. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Redirect to home if not authenticated
  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     toast({
  //       title: "Unauthorized",
  //       description: "You are logged out. Logging in again...",
  //       variant: "destructive",
  //     });
  //     setTimeout(() => {
  //       window.location.href = "/api/login";
  //     }, 500);
  //     return;
  //   }
  // }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'synced':
      case 'up_to_date':
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'inactive':
      case 'suspended':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Greece Compliance Anchor (2025)
            </h1>
            <p className="text-muted-foreground mt-2">
              Digital Work Card, ERGANI II, e-EFKA/APD, AADE compliance with
              versioned rules DSL
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => generateDemoMutation.mutate()}
              disabled={generateDemoMutation.isPending}
              variant="outline"
            >
              {generateDemoMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Generate Demo
            </Button>
            <Button
              onClick={() => syncERGANIMutation.mutate()}
              disabled={syncERGANIMutation.isPending}
            >
              {syncERGANIMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync ERGANI
            </Button>
          </div>
        </div>

        <Tabs defaultValue="digital-work-card" className="space-y-6">
          <TabsList>
            <TabsTrigger value="digital-work-card">
              Digital Work Card
            </TabsTrigger>
            <TabsTrigger value="ergani-events">ERGANI II Events</TabsTrigger>
            <TabsTrigger value="government-flows">Government Flows</TabsTrigger>
            <TabsTrigger value="minimum-wage">Minimum Wage</TabsTrigger>
            <TabsTrigger value="special-pays">Greek Special Pays</TabsTrigger>
          </TabsList>

          <TabsContent value="digital-work-card" className="space-y-6">
            {/* Digital Work Card Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Cards
                  </CardTitle>
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {workCards?.filter(card => card.status === 'active')
                      .length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Real-time attendance enabled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    ERGANI Sync Rate
                  </CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(
                      ((workCards?.filter(
                        card => card.erganiSyncStatus === 'synced'
                      ).length || 0) /
                        (workCards?.length || 1)) *
                        100
                    )}
                    %
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Successfully synchronized
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Real-time Events
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {workCards?.filter(card => card.realTimeAttendance)
                      .length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Live attendance tracking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Compliance Score
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">99.9%</div>
                  <p className="text-xs text-muted-foreground">
                    Digital Work Card compliance
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Digital Work Cards (Ψηφιακή Κάρτα Εργασίας)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workCardsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : workCards && workCards.length > 0 ? (
                  <div className="space-y-4">
                    {workCards.map(card => (
                      <div
                        key={card.cardId}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-primary" />
                          <div>
                            <div className="font-semibold">
                              {card.employeeId}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Card: {card.cardId}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm">
                              Last Sync:{' '}
                              {new Date(card.lastSync).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getStatusColor(card.status)}>
                                {card.status}
                              </Badge>
                              <Badge
                                className={getStatusColor(
                                  card.erganiSyncStatus
                                )}
                              >
                                ERGANI: {card.erganiSyncStatus}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Smartphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Digital Work Cards
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Generate demo data to see digital work cards
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ergani-events" className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <div>
                <label htmlFor="period" className="text-sm font-medium">
                  Period
                </label>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-12">December 2024</SelectItem>
                    <SelectItem value="2024-11">November 2024</SelectItem>
                    <SelectItem value="2024-10">October 2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  ERGANI II Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : erganiEvents && erganiEvents.length > 0 ? (
                  <div className="space-y-4">
                    {erganiEvents.map(event => (
                      <div
                        key={event.eventId}
                        className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 border rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium">Event</div>
                          <div className="text-sm text-muted-foreground">
                            {event.type.replace('_', ' ')}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Employee</div>
                          <div className="text-sm text-muted-foreground">
                            {event.employeeId}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Timestamp</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Status</div>
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Submission ID
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.submissionId || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Error</div>
                          <div className="text-sm text-red-600">
                            {event.errorMessage || 'None'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No ERGANI Events
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Generate demo data to see ERGANI II events
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="government-flows" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {flowsLoading ? (
                <div className="flex items-center justify-center py-8 col-span-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : governmentFlows && governmentFlows.length > 0 ? (
                governmentFlows.map(flow => (
                  <Card key={flow.flowId}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Database className="h-6 w-6 text-primary" />
                        {flow.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {flow.type.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{flow.frequency}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Status</span>
                          <Badge className={getStatusColor(flow.status)}>
                            {flow.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Last Submission</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(flow.lastSubmission).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Next Due</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(flow.nextDue).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Filings</span>
                          <span className="text-sm font-semibold">
                            {flow.filings}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 col-span-3">
                  <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Government Flows
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Generate demo data to see government flows
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="minimum-wage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Minimum Wage Engine (2025)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {wageRulesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : wageRules && wageRules.length > 0 ? (
                  <div className="space-y-4">
                    {wageRules.map(rule => (
                      <div
                        key={rule.ruleId}
                        className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium">Category</div>
                          <div className="text-sm text-muted-foreground">
                            {rule.category.replace('_', ' ')}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Amount</div>
                          <div className="text-sm font-semibold">
                            €{rule.amount.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            Effective Date
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(rule.effectiveDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Status</div>
                          <Badge
                            className={
                              rule.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Scope</div>
                          <div className="text-sm text-muted-foreground">
                            {rule.region || rule.industry || 'National'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Euro className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Wage Rules
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Generate demo data to see minimum wage rules
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="special-pays" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Greek Special Pays
                </CardTitle>
              </CardHeader>
              <CardContent>
                {specialPaysLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : specialPays && specialPays.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {specialPays.map(pay => (
                      <Card key={pay.payId}>
                        <CardHeader>
                          <CardTitle className="text-lg">{pay.name}</CardTitle>
                          <div className="text-sm text-muted-foreground">
                            {pay.nameGreek}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <div className="text-sm font-medium">
                                Calculation Rule
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {pay.calculationRule}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                Tax & Insurance
                              </div>
                              <div className="flex gap-2">
                                <Badge
                                  variant={pay.taxable ? 'default' : 'outline'}
                                >
                                  {pay.taxable ? 'Taxable' : 'Tax Free'}
                                </Badge>
                                <Badge
                                  variant={
                                    pay.efkaSubject ? 'default' : 'outline'
                                  }
                                >
                                  {pay.efkaSubject
                                    ? 'EFKA Subject'
                                    : 'EFKA Exempt'}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                Eligibility
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {pay.eligibilityRules.join(', ')}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Special Pays
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Generate demo data to see Greek special pays
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
