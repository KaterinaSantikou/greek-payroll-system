/**
 * Payments Operations Cockpit - Complete UI for SEPA batch monitoring
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Zap, 
  Settings, 
  Filter,
  Eye,
  MoreVertical,
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Loader2,
  ArrowRight,
  CreditCard,
  Shield,
  Timer,
  X,
} from 'lucide-react';
import { BatchStateMachineDisplay } from './BatchStateMachineDisplay';
import { CutOffDisplay } from './CutOffDisplay';

interface PaymentLine {
  lineId: string;
  employeeId: string;
  employeeName: string;
  creditorIban: string;
  amount: number;
  method: 'SCT' | 'SCT_INST';
  status: 'prepared' | 'submitted' | 'accepted' | 'settled' | 'rejected' | 'superseded' | 'cancelled';
  reasonCode?: string;
  endToEndId: string;
  bankRefs?: { uetr?: string; bankTxId?: string };
  submittedAt?: string;
  settledAt?: string;
  department?: string;
  property?: string;
}

interface BatchData {
  batchId: string;
  bankProfileId: string;
  method: 'SCT' | 'SCT_INST';
  status: string;
  totals: { count: number; amount: number; accepted?: number; rejected?: number; settled?: number };
  runId: string;
  lines: PaymentLine[];
  submittedAt?: string;
  cutOffStatus?: any;
  reconciliationFiles?: Array<{ fileId: string; type: string; processedAt: string; status: string }>;
}

interface EligibilityResult {
  lineId: string;
  eligible: boolean;
  eligibilityCriteria: {
    bankSupportsInstant: boolean;
    amountWithinLimit: boolean;
    beneficiaryReachable: boolean;
    originalNotSettled: boolean;
    validStatus: boolean;
    notSuperseded: boolean;
  };
  blockingFactors: string[];
  estimatedSettlementTime: string;
  instantFees?: {
    perTransaction: number;
    total: number;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface InstantReissueStatus {
  batchId: string;
  status: string;
  progress: number;
  estimatedCompletion: string;
  timeline: Array<{
    timestamp: string;
    event: string;
    status: 'completed' | 'pending' | 'failed';
  }>;
}

interface PaymentsCockpitProps {
  batchId: string;
  initialData?: BatchData;
  onReissueLines?: (lineIds: string[]) => void;
  onCancelLines?: (lineIds: string[]) => void;
  onExportData?: (format: 'csv' | 'excel') => void;
}

const statusIcons = {
  prepared: Clock,
  submitted: RefreshCw,
  accepted: CheckCircle,
  settled: CheckCircle,
  rejected: XCircle,
  superseded: RefreshCw,
  cancelled: XCircle,
};

const statusColors = {
  prepared: 'text-blue-500',
  submitted: 'text-yellow-500',
  accepted: 'text-green-500',
  settled: 'text-emerald-600',
  rejected: 'text-red-500',
  superseded: 'text-gray-500',
  cancelled: 'text-gray-400',
};

const methodBadges = {
  SCT: { variant: 'default' as const, text: 'SCT' },
  SCT_INST: { variant: 'secondary' as const, text: 'SCT Instant' },
};

const reasonCodes: Record<string, string> = {
  AM04: 'Insufficient Funds',
  AC04: 'Closed Account',
  FF01: 'Invalid File Format',
  AG01: 'Transaction Forbidden',
  ARDT: 'Already Returned Transaction',
};

export function PaymentsCockpit({ 
  batchId, 
  initialData, 
  onReissueLines, 
  onCancelLines, 
  onExportData 
}: PaymentsCockpitProps) {
  const [batchData, setBatchData] = useState<BatchData | null>(initialData || null);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    method: 'all',
    property: 'all',
    department: 'all',
    reasonCode: 'all',
    amountRange: { min: '', max: '' },
  });
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eligibilityDrawerOpen, setEligibilityDrawerOpen] = useState(false);
  const [reissueModalOpen, setReissueModalOpen] = useState(false);
  const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[]>([]);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [reissueLoading, setReissueLoading] = useState(false);
  const [reissueReason, setReissueReason] = useState('');
  const [activeReissues, setActiveReissues] = useState<Map<string, InstantReissueStatus>>(new Map());
  const [statusPolling, setStatusPolling] = useState<Map<string, NodeJS.Timeout>>(new Map());

  // Mock data for demonstration
  useEffect(() => {
    if (!batchData) {
      setBatchData({
        batchId: batchId || 'BATCH-DEMO-123',
        bankProfileId: 'alpha',
        method: 'SCT',
        status: 'partially_settled',
        totals: { count: 150, amount: 125000, accepted: 120, rejected: 10, settled: 100 },
        runId: 'PAYROLL-2025-001',
        lines: generateMockLines(150),
        submittedAt: new Date().toISOString(),
        reconciliationFiles: [
          { fileId: 'pain002-20250119-001', type: 'pain.002', processedAt: new Date().toISOString(), status: 'processed' },
          { fileId: 'camt054-20250119-001', type: 'camt.054', processedAt: new Date().toISOString(), status: 'processed' },
        ],
      });
    }
  }, [batchId, batchData]);

  const filteredLines = batchData?.lines.filter(line => {
    if (filters.status !== 'all' && line.status !== filters.status) return false;
    if (filters.method !== 'all' && line.method !== filters.method) return false;
    if (filters.property !== 'all' && line.property !== filters.property) return false;
    if (filters.department !== 'all' && line.department !== filters.department) return false;
    if (filters.reasonCode !== 'all' && line.reasonCode !== filters.reasonCode) return false;
    
    const amount = line.amount;
    if (filters.amountRange.min && amount < parseFloat(filters.amountRange.min)) return false;
    if (filters.amountRange.max && amount > parseFloat(filters.amountRange.max)) return false;
    
    return true;
  }) || [];

  const handleLineSelection = (lineId: string, selected: boolean) => {
    setSelectedLines(prev => 
      selected 
        ? [...prev, lineId]
        : prev.filter(id => id !== lineId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedLines(selected ? filteredLines.map(line => line.lineId) : []);
  };

  const getEligibleForReissue = () => {
    return selectedLines.filter(lineId => {
      const line = batchData?.lines.find(l => l.lineId === lineId);
      return line && ['submitted', 'accepted', 'rejected'].includes(line.status) && line.amount <= 100000;
    });
  };

  // Eligibility checking functions
  const checkInstantEligibility = async (lineIds: string[]) => {
    if (!lineIds.length) return;
    
    setEligibilityLoading(true);
    try {
      const response = await fetch('/v1/instant-reissue/eligibility-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineIds }),
      });
      
      if (!response.ok) throw new Error('Eligibility check failed');
      
      const data = await response.json();
      setEligibilityResults(data.eligibility_check.results);
      setEligibilityDrawerOpen(true);
      
      toast({
        title: "Eligibility Check Complete",
        description: `${data.eligibility_check.summary.eligibleLines} of ${lineIds.length} lines eligible for instant re-issue`,
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Eligibility Check Failed",
        description: "Unable to check instant re-issue eligibility",
        variant: "destructive",
      });
    } finally {
      setEligibilityLoading(false);
    }
  };

  const executeInstantReissue = async () => {
    const eligibleLineIds = eligibilityResults
      .filter(r => r.eligible)
      .map(r => r.lineId);
    
    if (!eligibleLineIds.length || !reissueReason.trim()) return;
    
    setReissueLoading(true);
    try {
      const response = await fetch('/v1/instant-reissue/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalLineIds: eligibleLineIds,
          reason: reissueReason.trim(),
          operatorId: 'current-user', // Replace with actual user ID
          urgency: 'HIGH',
          overrideFees: false,
          doublePayProtection: true,
        }),
      });
      
      if (!response.ok) throw new Error('Instant re-issue failed');
      
      const result = await response.json();
      
      if (result.execution_result.success) {
        // Start status polling for the new batch
        startStatusPolling(result.execution_result.newBatchId);
        
        toast({
          title: "🚀 Instant Re-issue Initiated",
          description: `${result.status_summary.reissued} payments re-issued as SCT Instant`,
          duration: 5000,
        });
        
        setReissueModalOpen(false);
        setReissueReason('');
        setSelectedLines([]); // Clear selection
      } else {
        toast({
          title: "Re-issue Partially Successful",
          description: `${result.status_summary.reissued} succeeded, ${result.status_summary.failed} failed`,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Re-issue Failed",
        description: "Unable to execute instant re-issue",
        variant: "destructive",
      });
    } finally {
      setReissueLoading(false);
    }
  };

  const startStatusPolling = (batchId: string) => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/v1/instant-reissue/${batchId}/status`);
        if (response.ok) {
          const data = await response.json();
          const status = data.real_time_status;
          
          setActiveReissues(prev => new Map(prev.set(batchId, status)));
          
          if (status.progress >= 100) {
            // Polling complete
            const intervalId = statusPolling.get(batchId);
            if (intervalId) {
              clearInterval(intervalId);
              setStatusPolling(prev => {
                const newMap = new Map(prev);
                newMap.delete(batchId);
                return newMap;
              });
            }
            
            toast({
              title: "✅ Settlement Complete",
              description: `Instant re-issue batch ${batchId} settled successfully`,
              duration: 4000,
            });
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };
    
    // Poll immediately, then every 5 seconds
    pollStatus();
    const intervalId = setInterval(pollStatus, 5000);
    setStatusPolling(prev => new Map(prev.set(batchId, intervalId)));
  };

  const handleInstantReissueClick = () => {
    if (selectedLines.length === 0) {
      toast({
        title: "No Lines Selected",
        description: "Please select payment lines for instant re-issue",
        variant: "destructive",
      });
      return;
    }
    
    checkInstantEligibility(selectedLines);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      statusPolling.forEach(intervalId => clearInterval(intervalId));
    };
  }, []);

  if (!batchData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments Operations Cockpit</h1>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <span>Batch: <code className="bg-gray-100 px-2 py-1 rounded">{batchData.batchId}</code></span>
            <span>Bank: <Badge variant="outline">{batchData.bankProfileId.toUpperCase()}</Badge></span>
            <span>Method: <Badge {...methodBadges[batchData.method]}>{methodBadges[batchData.method].text}</Badge></span>
            <span>Run: <a href="#" className="text-blue-600 hover:underline">{batchData.runId}</a></span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => onExportData?.('csv')}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Cut-Off Status Banner */}
      <CutOffDisplay 
        bankProfileId={batchData.bankProfileId} 
        cutOffData={{
          countdown_display: {
            countdown: '2h 15m',
            status: 'ACTIVE',
            riskLevel: 'LOW',
            banner: { show: false, message: '', variant: 'info' }
          },
          cockpit_integration: {
            show_banner: false,
            banner_message: '',
            banner_variant: 'info',
            countdown_text: '2h 15m',
            risk_indicator: 'LOW'
          },
          auto_refresh: { enabled: true, interval_seconds: 60 }
        }}
        onRecommendPayment={() => console.log('Get payment recommendation')}
        onReissueAsInstant={() => console.log('Reissue as instant')}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lines">Lines ({filteredLines.length})</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="failures">Failures</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Cards */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Settled</p>
                    <div className="text-2xl font-bold">{batchData.totals.settled || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Accepted</p>
                    <div className="text-2xl font-bold">{batchData.totals.accepted || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                    <div className="text-2xl font-bold">{batchData.totals.rejected || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <div className="text-2xl font-bold">€{batchData.totals.amount.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress and Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Settlement Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Settled</span>
                    <span>{Math.round((batchData.totals.settled || 0) / batchData.totals.count * 100)}%</span>
                  </div>
                  <Progress value={(batchData.totals.settled || 0) / batchData.totals.count * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SCT vs SCT Instant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-sm">SCT</span>
                    </div>
                    <span className="text-sm font-medium">
                      {batchData.lines.filter(l => l.method === 'SCT').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-sm">SCT Instant</span>
                    </div>
                    <span className="text-sm font-medium">
                      {batchData.lines.filter(l => l.method === 'SCT_INST').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lines Tab */}
        <TabsContent value="lines" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setFilters({
                  status: 'all', method: 'all', property: 'all', department: 'all', 
                  reasonCode: 'all', amountRange: { min: '', max: '' }
                })}>
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Select value={filters.status} onValueChange={(value) => setFilters(f => ({...f, status: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="prepared">Prepared</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.method} onValueChange={(value) => setFilters(f => ({...f, method: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="SCT">SCT</SelectItem>
                    <SelectItem value="SCT_INST">SCT Instant</SelectItem>
                  </SelectContent>
                </Select>

                <Input 
                  placeholder="Min Amount" 
                  value={filters.amountRange.min}
                  onChange={(e) => setFilters(f => ({...f, amountRange: {...f.amountRange, min: e.target.value}}))}
                />
                <Input 
                  placeholder="Max Amount" 
                  value={filters.amountRange.max}
                  onChange={(e) => setFilters(f => ({...f, amountRange: {...f.amountRange, max: e.target.value}}))}
                />

                <Select value={filters.reasonCode} onValueChange={(value) => setFilters(f => ({...f, reasonCode: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Reason Code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reasons</SelectItem>
                    <SelectItem value="AM04">AM04 - Insufficient Funds</SelectItem>
                    <SelectItem value="AC04">AC04 - Closed Account</SelectItem>
                    <SelectItem value="FF01">FF01 - Invalid Format</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedLines.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedLines.length} line(s) selected
                    </span>
                    <span className="text-sm text-blue-600">
                      {getEligibleForReissue().length} eligible for re-issue
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    {getEligibleForReissue().length > 0 && (
                      <Button 
                        size="sm" 
                        onClick={handleInstantReissueClick}
                        disabled={eligibilityLoading}
                      >
                        {eligibilityLoading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-1" />
                        )}
                        {eligibilityLoading ? 'Checking...' : 'Re-issue as SCT Instant'}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onCancelLines?.(selectedLines)}>
                      Cancel Selected
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedLines([])}>
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lines Data Grid */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment Lines ({filteredLines.length})</CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    checked={selectedLines.length === filteredLines.length && filteredLines.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm">Select All</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLines.map((line) => {
                  const StatusIcon = statusIcons[line.status] || Clock;
                  const isSelected = selectedLines.includes(line.lineId);
                  
                  return (
                    <div
                      key={line.lineId}
                      className={`flex items-center p-3 rounded-lg border ${
                        isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                      } hover:bg-gray-100`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleLineSelection(line.lineId, checked as boolean)}
                        className="mr-3"
                      />
                      
                      <div className="flex-1 grid grid-cols-8 gap-4 items-center">
                        <div className="font-medium">{line.employeeName}</div>
                        <div className="text-sm text-gray-600">
                          {line.creditorIban.replace(/(.{4})(.{4})(.*)(.{4})/, '$1****$4')}
                        </div>
                        <div className="font-medium">€{line.amount.toFixed(2)}</div>
                        <Badge {...methodBadges[line.method]}>{methodBadges[line.method].text}</Badge>
                        <div className="flex items-center space-x-1">
                          <StatusIcon className={`h-4 w-4 ${statusColors[line.status]}`} />
                          <Badge 
                            variant={line.status === 'settled' ? 'default' : 
                                   line.status === 'rejected' ? 'destructive' : 'secondary'}
                          >
                            {line.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {line.reasonCode ? reasonCodes[line.reasonCode] || line.reasonCode : '-'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {line.settledAt ? new Date(line.settledAt).toLocaleTimeString() : '-'}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Reconciliation Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {batchData.reconciliationFiles?.map((file) => (
                    <div key={file.fileId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{file.type.toUpperCase()}</div>
                        <div className="text-sm text-gray-600">{file.fileId}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">Processed</Badge>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Matching Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Instructions:</span>
                    <span className="font-medium">{batchData.totals.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exact Matches:</span>
                    <span className="font-medium text-green-600">95%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuzzy Matches:</span>
                    <span className="font-medium text-yellow-600">3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unmatched:</span>
                    <span className="font-medium text-red-600">2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: '14:30:15', event: 'Batch created from payroll run', status: 'completed' },
                  { time: '14:30:45', event: 'pain.001 XML generated', status: 'completed' },
                  { time: '14:31:20', event: 'Submitted to Alpha Bank via SFTP', status: 'completed' },
                  { time: '14:35:10', event: 'Bank acknowledgment received', status: 'completed' },
                  { time: '14:42:30', event: 'pain.002 status report processed', status: 'completed' },
                  { time: '15:15:45', event: 'camt.054 settlement notification', status: 'in_progress' },
                ].map((event, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">{event.event}</div>
                      <div className="text-sm text-gray-600">{event.time}</div>
                    </div>
                    <Badge variant={event.status === 'completed' ? 'default' : 'secondary'}>
                      {event.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failures Tab */}
        <TabsContent value="failures" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries({
              'AM04': { count: 8, description: 'Insufficient Funds', action: 'Contact employees for account funding' },
              'AC04': { count: 2, description: 'Closed Account', action: 'Request updated bank details' },
            }).map(([code, info]) => (
              <Card key={code}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{code} - {info.description}</CardTitle>
                    <Badge variant="destructive">{info.count}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{info.action}</AlertDescription>
                    </Alert>
                    <Button variant="outline" size="sm">
                      View Affected Lines
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Context Drawer - Right Pane */}
      {contextDrawerOpen && selectedLines.length > 0 && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white border-l shadow-lg z-50 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Selected Lines ({selectedLines.length})</h3>
            <Button variant="ghost" size="sm" onClick={() => setContextDrawerOpen(false)}>
              ×
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="text-lg font-bold">
                €{selectedLines.reduce((sum, lineId) => {
                  const line = batchData.lines.find(l => l.lineId === lineId);
                  return sum + (line?.amount || 0);
                }, 0).toFixed(2)}
              </div>
            </div>

            {getEligibleForReissue().length > 0 && (
              <div className="space-y-3">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    {getEligibleForReissue().length} line(s) eligible for SCT Instant re-issue
                  </AlertDescription>
                </Alert>
                
                <Button 
                  className="w-full" 
                  onClick={handleInstantReissueClick}
                  disabled={eligibilityLoading}
                >
                  {eligibilityLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {eligibilityLoading ? 'Checking Eligibility...' : 'Re-issue as SCT Instant now'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Eligibility Side Drawer */}
      <Sheet open={eligibilityDrawerOpen} onOpenChange={setEligibilityDrawerOpen}>
        <SheetContent side="right" className="w-[500px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              SCT Instant Eligibility
            </SheetTitle>
            <SheetDescription>
              Eligibility check and estimated settlement time for selected payment lines
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {eligibilityLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-3 text-gray-600">Checking eligibility...</span>
              </div>
            ) : (
              <>
                {/* Summary */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {eligibilityResults.filter(r => r.eligible).length}
                        </div>
                        <div className="text-sm text-gray-600">Eligible</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {eligibilityResults.filter(r => !r.eligible).length}
                        </div>
                        <div className="text-sm text-gray-600">Ineligible</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-800">Estimated Settlement</div>
                      <div className="text-xs text-blue-600">Within 10 seconds for eligible lines</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Eligibility Results */}
                <div className="space-y-3">
                  {eligibilityResults.map((result) => {
                    const line = batchData?.lines.find(l => l.lineId === result.lineId);
                    return (
                      <Card key={result.lineId} className={result.eligible ? 'border-green-200' : 'border-red-200'}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{line?.employeeName}</div>
                              <div className="text-sm text-gray-600">€{line?.amount?.toFixed(2)}</div>
                              <div className="text-xs text-gray-500">{result.lineId}</div>
                            </div>
                            <div className={`flex items-center gap-1 ${result.eligible ? 'text-green-600' : 'text-red-600'}`}>
                              {result.eligible ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              <span className="text-xs font-medium">
                                {result.eligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                              </span>
                            </div>
                          </div>
                          
                          {!result.eligible && result.blockingFactors.length > 0 && (
                            <div className="mt-3 p-2 bg-red-50 rounded">
                              <div className="text-xs font-medium text-red-800 mb-1">Blocking Factors:</div>
                              <ul className="text-xs text-red-700 space-y-1">
                                {result.blockingFactors.map((factor, idx) => (
                                  <li key={idx}>• {factor}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.eligible && result.instantFees && (
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className="text-gray-600">Instant Fee:</span>
                              <span className="font-medium">€{result.instantFees.total.toFixed(2)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                {eligibilityResults.some(r => r.eligible) && (
                  <div className="sticky bottom-0 bg-white border-t pt-4">
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => {
                        setEligibilityDrawerOpen(false);
                        setReissueModalOpen(true);
                      }}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Proceed with Re-issue ({eligibilityResults.filter(r => r.eligible).length} lines)
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Instant Re-issue Confirmation Modal */}
      <Dialog open={reissueModalOpen} onOpenChange={setReissueModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Confirm SCT Instant Re-issue
            </DialogTitle>
            <DialogDescription>
              Review details and provide authorization reason for instant re-issue processing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold">
                      {eligibilityResults.filter(r => r.eligible).length}
                    </div>
                    <div className="text-sm text-gray-600">Lines to Re-issue</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      €{eligibilityResults
                        .filter(r => r.eligible)
                        .reduce((sum, r) => {
                          const line = batchData?.lines.find(l => l.lineId === r.lineId);
                          return sum + (line?.amount || 0);
                        }, 0)
                        .toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Amount</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      €{eligibilityResults
                        .filter(r => r.eligible && r.instantFees)
                        .reduce((sum, r) => sum + (r.instantFees?.total || 0), 0)
                        .toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Fees</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Timer className="h-4 w-4" />
                    <span>Settlement: ~10 seconds</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CreditCard className="h-4 w-4" />
                    <span>Method: SCT Instant</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cut-off Context */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cut-off Context:</strong> SCT Instant payments are processed immediately 
                and do not follow traditional cut-off schedules. This re-issue will be 
                submitted directly to TIPS for real-time processing.
              </AlertDescription>
            </Alert>

            {/* Authorization Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Authorization Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for instant re-issue (minimum 10 characters)"
                value={reissueReason}
                onChange={(e) => setReissueReason(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="text-xs text-gray-500">
                {reissueReason.length}/10 minimum characters
              </div>
            </div>

            {/* Double-pay Protection Notice */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Double-pay Protection:</strong> Enabled. Disbursement keys will prevent 
                duplicate payments for the same employee, period, and amount combination.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setReissueModalOpen(false);
                setReissueReason('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={executeInstantReissue}
              disabled={reissueLoading || reissueReason.trim().length < 10}
            >
              {reissueLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {reissueLoading ? 'Processing...' : 'Authorize Re-issue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Re-issue Status Cards */}
      {Array.from(activeReissues.entries()).map(([batchId, status]) => (
        <div 
          key={batchId}
          className="fixed bottom-4 right-4 w-80 bg-white border shadow-lg rounded-lg p-4 z-50"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Instant Re-issue</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setActiveReissues(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(batchId);
                  return newMap;
                });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-gray-600">{batchId}</div>
            <Progress value={status.progress} className="h-2" />
            <div className="text-xs text-gray-600">
              {status.progress}% - {status.estimatedCompletion}
            </div>
            
            {status.timeline && status.timeline.length > 0 && (
              <div className="mt-3 space-y-1">
                {status.timeline.slice(-3).map((event, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${
                      event.status === 'completed' ? 'bg-green-500' :
                      event.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-gray-600">{event.event}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to generate mock payment lines
function generateMockLines(count: number): PaymentLine[] {
  const statuses: PaymentLine['status'][] = ['prepared', 'submitted', 'accepted', 'settled', 'rejected'];
  const methods: PaymentLine['method'][] = ['SCT', 'SCT_INST'];
  const reasonCodes = ['AM04', 'AC04', 'FF01'];
  const departments = ['Sales', 'Engineering', 'Marketing', 'Operations'];
  const properties = ['Property A', 'Property B', 'Property C'];

  return Array.from({ length: count }, (_, i) => ({
    lineId: `LINE-${i.toString().padStart(3, '0')}`,
    employeeId: `EMP-${i + 1000}`,
    employeeName: `Employee ${i + 1}`,
    creditorIban: `GR16011012500000000123${i.toString().padStart(3, '0')}`,
    amount: Math.round((Math.random() * 5000 + 500) * 100) / 100,
    method: methods[Math.floor(Math.random() * methods.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    reasonCode: Math.random() < 0.1 ? reasonCodes[Math.floor(Math.random() * reasonCodes.length)] : undefined,
    endToEndId: `E2E-BATCH-DEMO-123-${i.toString().padStart(3, '0')}`,
    submittedAt: Math.random() < 0.8 ? new Date().toISOString() : undefined,
    settledAt: Math.random() < 0.6 ? new Date().toISOString() : undefined,
    department: departments[Math.floor(Math.random() * departments.length)],
    property: properties[Math.floor(Math.random() * properties.length)],
    bankRefs: Math.random() < 0.5 ? {
      uetr: `${nanoid(8)}-${nanoid(4)}-${nanoid(4)}-${nanoid(12)}`,
      bankTxId: `BANK-${nanoid(12)}`,
    } : undefined,
  }));
}

function nanoid(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}