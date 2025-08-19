import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Send, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface APDFiling {
  filingId: string;
  period: string;
  propertyId: string;
  totalEmployees: number;
  totalGrossWages: string;
  totalEmployeeContributions: string;
  totalEmployerContributions: string;
  status: string;
  submissionReference?: string;
  receiptNumber?: string;
  createdAt: string;
  submittedAt?: string;
}

interface FMYFiling {
  filingId: string;
  period: string;
  propertyId: string;
  totalEmployees: number;
  totalGrossWages: string;
  totalTaxWithheld: string;
  paymentDueDate: string;
  status: string;
  submissionReference?: string;
  createdAt: string;
  submittedAt?: string;
}

interface DigitalWorkCardDashboard {
  propertyId: string;
  period: string;
  totalEmployees: number;
  coverageMetrics: {
    employeesWithCards: number;
    coveragePercentage: number;
    pendingActivations: number;
    expiredCards: number;
  };
  submissionMetrics: {
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    successRate: number;
  };
  complianceStatus: {
    compliantEmployees: number;
    nonCompliantEmployees: number;
    violationCount: number;
    inspectorReadiness: 'ready' | 'needs_attention' | 'critical';
  };
}

export default function Compliance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState("PROP_001");
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [erganiFormData, setErganiFormData] = useState({
    formType: 'hire' as 'hire' | 'schedule' | 'overtime' | 'change' | 'termination',
    employeeId: '',
    afm: '',
    startDate: '',
    position: '',
    contractType: 'FULL_TIME'
  });

  // Fetch filing history
  const { data: filingHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/filings/history", selectedProperty],
    queryParams: { propertyId: selectedProperty }
  });

  // Fetch Digital Work Card dashboard
  const { data: dwcDashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["/api/digital-work-card/dashboard", selectedProperty, selectedPeriod],
    queryParams: { propertyId: selectedProperty, period: selectedPeriod }
  });

  // Generate APD filing mutation
  const generateAPDMutation = useMutation({
    mutationFn: async ({ propertyId, period }: { propertyId: string; period: string }) => {
      return apiRequest("/api/filings/apd/generate", {
        method: "POST",
        body: { propertyId, period }
      });
    },
    onSuccess: (data: APDFiling) => {
      toast({
        title: "APD Filing Generated",
        description: `APD filing for ${data.period} generated successfully. Total: €${data.totalEmployerContributions}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/filings/history"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate APD filing",
        variant: "destructive",
      });
    }
  });

  // Generate ΦΜΥ filing mutation
  const generateFMYMutation = useMutation({
    mutationFn: async ({ propertyId, period }: { propertyId: string; period: string }) => {
      return apiRequest("/api/filings/fmy/generate", {
        method: "POST",
        body: { propertyId, period }
      });
    },
    onSuccess: (data: FMYFiling) => {
      toast({
        title: "ΦΜΥ Filing Generated",
        description: `ΦΜΥ filing for ${data.period} generated successfully. Tax: €${data.totalTaxWithheld}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/filings/history"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate ΦΜΥ filing",
        variant: "destructive",
      });
    }
  });

  // Submit filing mutations
  const submitAPDMutation = useMutation({
    mutationFn: async (filingId: string) => {
      return apiRequest(`/api/filings/apd/${filingId}/submit`, {
        method: "POST"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "APD Filing Submitted",
        description: `Filing submitted successfully. Reference: ${data.submissionReference}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/filings/history"] });
    }
  });

  const submitFMYMutation = useMutation({
    mutationFn: async (filingId: string) => {
      return apiRequest(`/api/filings/fmy/${filingId}/submit`, {
        method: "POST"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "ΦΜΥ Filing Submitted",
        description: `Filing submitted successfully. Reference: ${data.submissionReference}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/filings/history"] });
    }
  });

  // Create ERGANI form pack mutation
  const createERGANIFormMutation = useMutation({
    mutationFn: async (formData: any) => {
      return apiRequest("/api/ergani/form-pack", {
        method: "POST",
        body: {
          formType: formData.formType,
          employeeId: formData.employeeId,
          propertyId: selectedProperty,
          formData
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "ERGANI Form Created",
        description: `${data.formType.toUpperCase()} form pack created successfully`,
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Submitted</Badge>;
      case 'generated':
        return <Badge variant="secondary">Generated</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInspectorReadinessBadge = (readiness: string) => {
    switch (readiness) {
      case 'ready':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Ready
        </Badge>;
      case 'needs_attention':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Needs Attention
        </Badge>;
      case 'critical':
        return <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Critical
        </Badge>;
      default:
        return <Badge variant="outline">{readiness}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Filings & Compliance</h1>
          <p className="text-gray-600 dark:text-gray-300">
            APD (e-EFKA) generator, ΦΜΥ (AADE) filing, ERGANI II forms, Digital Work Card dashboards
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PROP_001">Santikos Hotel Athens</SelectItem>
              <SelectItem value="PROP_002">Aegean Resort Mykonos</SelectItem>
              <SelectItem value="PROP_003">Olympus Hotel Thessaloniki</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Digital Work Card</TabsTrigger>
          <TabsTrigger value="apd-efka">APD (e-EFKA)</TabsTrigger>
          <TabsTrigger value="fmy-aade">ΦΜΥ (AADE)</TabsTrigger>
          <TabsTrigger value="ergani">ERGANI II Forms</TabsTrigger>
          <TabsTrigger value="history">Filing History</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Digital Work Card Dashboard</span>
              </CardTitle>
              <CardDescription>
                Coverage, submission success, and inspector readiness for period {selectedPeriod}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : dwcDashboard ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dwcDashboard.coverageMetrics.coveragePercentage.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dwcDashboard.coverageMetrics.employeesWithCards} of {dwcDashboard.totalEmployees} employees
                      </p>
                      <div className="mt-2 space-y-1">
                        <div className="text-xs">
                          <span className="text-yellow-600">Pending: {dwcDashboard.coverageMetrics.pendingActivations}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-red-600">Expired: {dwcDashboard.coverageMetrics.expiredCards}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Submission Success</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dwcDashboard.submissionMetrics.successRate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dwcDashboard.submissionMetrics.successfulSubmissions} successful submissions
                      </p>
                      <div className="mt-2">
                        <div className="text-xs text-red-600">
                          Failed: {dwcDashboard.submissionMetrics.failedSubmissions}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Inspector Readiness</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold mb-2">
                        {getInspectorReadinessBadge(dwcDashboard.complianceStatus.inspectorReadiness)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dwcDashboard.complianceStatus.compliantEmployees} compliant employees
                      </p>
                      <div className="mt-2">
                        <div className="text-xs text-red-600">
                          Violations: {dwcDashboard.complianceStatus.violationCount}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className="text-gray-500">No dashboard data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apd-efka" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>APD (e-EFKA) Social Security Filing</CardTitle>
              <CardDescription>
                Generate and submit monthly APD filings for employee and employer social security contributions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => generateAPDMutation.mutate({ propertyId: selectedProperty, period: selectedPeriod })}
                  disabled={generateAPDMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>{generateAPDMutation.isPending ? 'Generating...' : 'Generate APD Filing'}</span>
                </Button>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <h4 className="font-semibold mb-2">APD Filing includes:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Employee contributions (16%)</li>
                  <li>Employer contributions (24.78%)</li>
                  <li>Unemployment fund (0.6%)</li>
                  <li>Submission tracker and receipt store</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fmy-aade" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ΦΜΥ (AADE) Tax Withholding Filing</CardTitle>
              <CardDescription>
                Generate monthly ΦΜΥ filings for employee tax withholding and submission to AADE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => generateFMYMutation.mutate({ propertyId: selectedProperty, period: selectedPeriod })}
                  disabled={generateFMYMutation.isPending}
                  className="flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>{generateFMYMutation.isPending ? 'Generating...' : 'Generate ΦΜΥ Filing'}</span>
                </Button>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <h4 className="font-semibold mb-2">ΦΜΥ Filing includes:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Employee tax withholding calculations</li>
                  <li>Solidarity tax for high earners</li>
                  <li>Merge utility for multiple properties</li>
                  <li>Payment reminders and due dates</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ergani" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ERGANI II Form Pack</CardTitle>
              <CardDescription>
                Create and submit ERGANI II forms for hire, schedule, overtime, changes, and termination
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="formType">Form Type</Label>
                  <Select 
                    value={erganiFormData.formType} 
                    onValueChange={(value) => setErganiFormData(prev => ({ ...prev, formType: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hire">Hire</SelectItem>
                      <SelectItem value="schedule">Schedule Pre-announcement</SelectItem>
                      <SelectItem value="overtime">Overtime</SelectItem>
                      <SelectItem value="change">Changes</SelectItem>
                      <SelectItem value="termination">Termination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    value={erganiFormData.employeeId}
                    onChange={(e) => setErganiFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    placeholder="EMP_001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="afm">AFM</Label>
                  <Input
                    value={erganiFormData.afm}
                    onChange={(e) => setErganiFormData(prev => ({ ...prev, afm: e.target.value }))}
                    placeholder="123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    value={erganiFormData.position}
                    onChange={(e) => setErganiFormData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="Hotel Receptionist"
                  />
                </div>
              </div>

              <Button
                onClick={() => createERGANIFormMutation.mutate(erganiFormData)}
                disabled={createERGANIFormMutation.isPending || !erganiFormData.employeeId || !erganiFormData.afm}
                className="flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>{createERGANIFormMutation.isPending ? 'Creating...' : 'Create ERGANI Form Pack'}</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filing History</CardTitle>
              <CardDescription>
                View all previous filings and their submission status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filingHistory && filingHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filing ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filingHistory.map((filing: any) => (
                      <TableRow key={filing.filingId}>
                        <TableCell className="font-mono text-sm">{filing.filingId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{filing.filingType}</Badge>
                        </TableCell>
                        <TableCell>{filing.period}</TableCell>
                        <TableCell>€{filing.totalAmount}</TableCell>
                        <TableCell>{getStatusBadge(filing.status)}</TableCell>
                        <TableCell>{format(new Date(filing.createdAt), 'PPp')}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {filing.status === 'generated' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (filing.filingType === 'APD') {
                                    submitAPDMutation.mutate(filing.filingId);
                                  } else if (filing.filingType === 'FMY') {
                                    submitFMYMutation.mutate(filing.filingId);
                                  }
                                }}
                                className="flex items-center space-x-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>Submit</span>
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No filing history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}