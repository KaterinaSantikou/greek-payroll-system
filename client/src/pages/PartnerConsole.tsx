/**
 * Partner Console - Greek HR & Payroll Management
 * Professional console for accounting firms managing client tenants
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Building2, 
  Users, 
  FileText, 
  Calculator, 
  Shield, 
  FileDown,
  CheckSquare,
  Settings,
  Search,
  Star,
  Tag,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  ChevronDown,
  Bell,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';

interface PartnerFirm {
  id: string;
  name: string;
  displayName: string;
  userRole: string;
  permissions: any[];
}

interface ClientTenant {
  clientTenantId: string;
  clientName: string;
  clientType: string;
  afm: string;
  partnerFirmId: string;
  partnerFirmName: string;
  grantedScopes: string[];
  makerCheckerMode: 'client_checker' | 'partner_checker' | 'dual';
  userRole: string;
  validUntil: string;
  lastUsed: string;
  tags?: string[];
  industry?: string;
  size?: 'small' | 'medium' | 'large';
  isFavorite?: boolean;
}

interface FilingStatus {
  id: string;
  type: 'APD' | 'ΦΜΥ' | 'ERGANI';
  status: 'draft' | 'pending_approval' | 'ready' | 'submitted' | 'failed';
  dueDate: string;
  period: string;
  assignedTo?: string;
  lastModified: string;
}

interface PayrollRun {
  id: string;
  period: string;
  status: 'draft' | 'validated' | 'finalized';
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  createdBy: string;
  lastModified: string;
}

interface ApprovalRequest {
  id: string;
  type: 'filing_submit' | 'payroll_finalize' | 'payment_batch';
  title: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  changes: any;
  diffs: any;
}

export default function PartnerConsole() {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedPartnerFirm, setSelectedPartnerFirm] = useState<string>('');
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get partner firms
  const { data: firmsData, isLoading: firmsLoading } = useQuery({
    queryKey: ['/api/partners/firms'],
  });

  // Get accessible clients
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/partners/clients'],
  });

  // Get current context
  const { data: contextData } = useQuery({
    queryKey: ['/api/partners/current-context'],
  });

  // Mock data for demo - these would come from API
  const dueTiles = [
    { type: 'APD' as const, count: 3, urgent: 1, dueDate: '2025-01-31' },
    { type: 'ΦΜΥ' as const, count: 2, urgent: 0, dueDate: '2025-02-15' },
    { type: 'ERGANI' as const, count: 1, urgent: 1, dueDate: '2025-01-25' },
  ];

  const mockFilings: FilingStatus[] = [
    { id: '1', type: 'APD', status: 'pending_approval', dueDate: '2025-01-31', period: '12/2024', assignedTo: 'K. Karteris', lastModified: '2025-01-20T10:30:00Z' },
    { id: '2', type: 'ΦΜΥ', status: 'draft', dueDate: '2025-02-15', period: '12/2024', assignedTo: 'M. Papadopoulos', lastModified: '2025-01-19T15:45:00Z' },
    { id: '3', type: 'ERGANI', status: 'ready', dueDate: '2025-01-25', period: '01/2025', assignedTo: 'E. Dimitriou', lastModified: '2025-01-21T09:15:00Z' },
  ];

  const mockPayrollRuns: PayrollRun[] = [
    { id: '1', period: '01/2025', status: 'validated', employeeCount: 45, totalGross: 125000, totalNet: 89500, createdBy: 'K. Karteris', lastModified: '2025-01-20T14:20:00Z' },
    { id: '2', period: '12/2024', status: 'finalized', employeeCount: 43, totalGross: 118000, totalNet: 84600, createdBy: 'M. Papadopoulos', lastModified: '2025-01-15T11:30:00Z' },
  ];

  const mockApprovals: ApprovalRequest[] = [
    { id: '1', type: 'filing_submit', title: 'APD December 2024 Submission', requestedBy: 'K. Karteris', requestedAt: '2025-01-20T10:30:00Z', status: 'pending', priority: 'high', changes: {}, diffs: {} },
    { id: '2', type: 'payroll_finalize', title: 'January 2025 Payroll Finalization', requestedBy: 'M. Papadopoulos', requestedAt: '2025-01-19T16:45:00Z', status: 'pending', priority: 'normal', changes: {}, diffs: {} },
  ];

  const firms: PartnerFirm[] = firmsData?.firms || [];
  const clients: ClientTenant[] = clientsData?.clients || [];
  
  // Enhanced client filtering
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.afm?.includes(searchQuery);
    const matchesFavorites = !showFavoritesOnly || client.isFavorite;
    const matchesIndustry = !selectedIndustry || client.industry === selectedIndustry;
    return matchesSearch && matchesFavorites && matchesIndustry;
  });
  
  const currentClient = clients.find(c => c.clientTenantId === selectedTenant);
  const currentFirm = firms.find(f => f.id === selectedPartnerFirm);

  useEffect(() => {
    if (contextData) {
      setCurrentContext(contextData);
      setSelectedTenant(contextData.currentTenant || '');
      setSelectedPartnerFirm(contextData.currentPartnerFirm || '');
    }
  }, [contextData]);

  // Switch tenant mutation
  const switchTenantMutation = useMutation({
    mutationFn: async ({ tenantId, partnerFirmId }: { tenantId: string; partnerFirmId: string }) => {
      await apiRequest({
        url: '/api/partners/switch-tenant',
        method: 'POST',
        body: { tenantId, partnerFirmId },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Tenant switched successfully',
        description: 'You are now working on behalf of the selected client.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/partners/current-context'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to switch tenant',
        description: error.message || 'Unable to switch to the selected tenant.',
        variant: 'destructive',
      });
    },
  });

  if (firmsLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading partner console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Firm Switcher */}
        <div className="p-4 border-b border-gray-200">
          <Select value={selectedPartnerFirm} onValueChange={setSelectedPartnerFirm}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select firm...">
                {currentFirm && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{currentFirm.displayName || currentFirm.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {firms.map((firm) => (
                <SelectItem key={firm.id} value={firm.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{firm.displayName || firm.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {firm.userRole}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client Search & Filters */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients by name or AFM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className="h-3 w-3 mr-1" />
              Favorites
            </Button>
            
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder={<Tag className="h-3 w-3" />} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-xs">All Industries</span>
                </SelectItem>
                <SelectItem value="hospitality">🏨 Hospitality</SelectItem>
                <SelectItem value="retail">🛍️ Retail</SelectItem>
                <SelectItem value="manufacturing">🏭 Manufacturing</SelectItem>
                <SelectItem value="services">💼 Services</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Due Tiles */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Due This Month</h3>
          <div className="space-y-2">
            {dueTiles.map((tile) => (
              <div key={tile.type} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{tile.type}</span>
                  {tile.urgent > 0 && (
                    <Badge variant="destructive" className="text-xs px-1">
                      {tile.urgent}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {tile.count} pending
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Clients ({filteredClients.length})
          </h3>
          <div className="space-y-2">
            {filteredClients.map((client) => (
              <div
                key={client.clientTenantId}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedTenant === client.clientTenantId
                    ? 'bg-blue-50 border-blue-200 border'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTenant(client.clientTenantId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{client.clientName}</span>
                      {client.isFavorite && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      AFM: {client.afm || 'Not set'}
                    </div>
                    {client.tags && (
                      <div className="flex gap-1 mt-2">
                        {client.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant={client.size === 'large' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {client.size || 'S'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Context Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Partner:</span>
              <span className="font-medium">{currentFirm?.displayName || currentFirm?.name || 'Select Firm'}</span>
              {currentClient && (
                <>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">As Client:</span>
                  <span className="font-medium">{currentClient.clientName}</span>
                  <Badge variant="outline" className="text-xs">
                    AFM {currentClient.afm || 'N/A'}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2"
                    onClick={() => switchTenantMutation.mutate({ 
                      tenantId: currentClient.clientTenantId, 
                      partnerFirmId: currentClient.partnerFirmId 
                    })}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Switch Context
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {currentClient?.makerCheckerMode === 'client_checker' && '👤 Client Approval'}
                {currentClient?.makerCheckerMode === 'partner_checker' && '🏢 Partner Review'}
                {currentClient?.makerCheckerMode === 'dual' && '🤝 Dual Approval'}
              </Badge>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {!selectedTenant ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Client</h3>
              <p className="text-sm text-gray-500">
                Choose a client from the left sidebar to manage their Greek payroll and compliance
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6">
            <Tabs defaultValue="filings" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="filings">Filings</TabsTrigger>
                <TabsTrigger value="payroll">Payroll Runs</TabsTrigger>
                <TabsTrigger value="audit-packs">Audit Packs</TabsTrigger>
                <TabsTrigger value="approvals">Approvals</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Filings Tab */}
              <TabsContent value="filings" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Greek Tax & Compliance Filings</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      New Filing
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {/* APD Board */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">APD Filings</CardTitle>
                        <Badge variant="secondary">3 pending</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {mockFilings.filter(f => f.type === 'APD').map((filing) => (
                        <div key={filing.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{filing.period}</span>
                            <FilingStatusBadge status={filing.status} />
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Due: {new Date(filing.dueDate).toLocaleDateString()}</div>
                            <div>Assigned: {filing.assignedTo}</div>
                          </div>
                          {filing.status === 'pending_approval' && (
                            <Button size="sm" className="w-full mt-2" disabled>
                              Awaiting Approval
                            </Button>
                          )}
                          {filing.status === 'ready' && (
                            <Button size="sm" className="w-full mt-2">
                              Submit to AADE
                            </Button>
                          )}
                          {filing.status === 'draft' && (
                            <Button size="sm" variant="outline" className="w-full mt-2">
                              Send for Approval
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* ΦΜΥ Board */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">ΦΜΥ Filings</CardTitle>
                        <Badge variant="secondary">2 pending</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {mockFilings.filter(f => f.type === 'ΦΜΥ').map((filing) => (
                        <div key={filing.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{filing.period}</span>
                            <FilingStatusBadge status={filing.status} />
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Due: {new Date(filing.dueDate).toLocaleDateString()}</div>
                            <div>Assigned: {filing.assignedTo}</div>
                          </div>
                          {filing.status === 'draft' && (
                            <Button size="sm" variant="outline" className="w-full mt-2">
                              Send for Approval
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* ERGANI Board */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">ERGANI Filings</CardTitle>
                        <Badge variant="secondary">1 pending</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {mockFilings.filter(f => f.type === 'ERGANI').map((filing) => (
                        <div key={filing.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{filing.period}</span>
                            <FilingStatusBadge status={filing.status} />
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Due: {new Date(filing.dueDate).toLocaleDateString()}</div>
                            <div>Assigned: {filing.assignedTo}</div>
                          </div>
                          {filing.status === 'ready' && (
                            <Button size="sm" className="w-full mt-2">
                              Submit to ERGANI
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Payroll Runs Tab */}
              <TabsContent value="payroll" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Greek Payroll Processing</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Period
                    </Button>
                    <Button size="sm">
                      <Calculator className="h-4 w-4 mr-2" />
                      New Run
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {mockPayrollRuns.map((run) => (
                    <Card key={run.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-medium">Payroll {run.period}</h3>
                              <PayrollStatusBadge status={run.status} />
                              <Badge variant="outline" className="text-xs">
                                {run.employeeCount} employees
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-6 text-sm">
                              <div>
                                <span className="text-gray-500">Gross Total:</span>
                                <div className="font-medium">€{run.totalGross.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Net Total:</span>
                                <div className="font-medium">€{run.totalNet.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Last Modified:</span>
                                <div className="font-medium">{new Date(run.lastModified).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            {run.status === 'validated' && (
                              <Button size="sm" variant="outline">
                                Send for Finalization
                              </Button>
                            )}
                            {run.status === 'finalized' && (
                              <Button size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Audit Packs Tab */}
              <TabsContent value="audit-packs" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Inspector & Audit Packs</h2>
                  <Button size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Generate Pack
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Standard Audit Pack</CardTitle>
                      <p className="text-sm text-gray-500">
                        Complete documentation package for labor inspections
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Date Range Presets:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm">Current Month</Button>
                          <Button variant="outline" size="sm">Last 3 Months</Button>
                          <Button variant="outline" size="sm">Current Year</Button>
                          <Button variant="outline" size="sm">Custom Range</Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Includes:</div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>✓ Employee contracts & amendments</div>
                          <div>✓ Payroll summaries & detailed calculations</div>
                          <div>✓ ERGANI submissions & confirmations</div>
                          <div>✓ EFKA/IKA contributions records</div>
                          <div>✓ Work schedule documentation</div>
                        </div>
                      </div>
                      
                      <Button className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download Latest Pack
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Compliance Report</CardTitle>
                      <p className="text-sm text-gray-500">
                        Focused compliance status for client review
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Quick Reports:</div>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            <FileText className="h-4 w-4 mr-2" />
                            Filing Status Summary
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Outstanding Issues
                          </Button>
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            <Calculator className="h-4 w-4 mr-2" />
                            Payroll Variance Report
                          </Button>
                        </div>
                      </div>
                      
                      <Button className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Approvals Tab */}
              <TabsContent value="approvals" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Maker-Checker Queue</h2>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{mockApprovals.length} pending</Badge>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {mockApprovals.map((approval) => (
                    <Card key={approval.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-medium">{approval.title}</h3>
                              <Badge 
                                variant={approval.priority === 'high' ? 'destructive' : 
                                        approval.priority === 'urgent' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {approval.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {approval.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-500">
                              Requested by {approval.requestedBy} • {new Date(approval.requestedAt).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View Diff
                            </Button>
                            <Button variant="outline" size="sm">
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button size="sm">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          </div>
                        </div>
                        
                        {/* Diff Preview */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-700 mb-2">Changes Preview:</div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="text-gray-500">Previous Total:</div>
                              <div className="font-mono">€118,750</div>
                            </div>
                            <div>
                              <div className="text-gray-500">New Total:</div>
                              <div className="font-mono text-green-600">€125,200</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Document Management</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    <Button size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Receipts & Invoices</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-center py-8">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-500">12 documents</div>
                        <Button variant="outline" size="sm" className="mt-2">
                          Browse Files
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Official Letters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-center py-8">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-500">5 documents</div>
                        <Button variant="outline" size="sm" className="mt-2">
                          Browse Files
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Contracts & Forms</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-center py-8">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-500">8 documents</div>
                        <Button variant="outline" size="sm" className="mt-2">
                          Browse Files
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Client Access Settings</h2>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Revoke Access
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Granted Permissions</CardTitle>
                      <p className="text-sm text-gray-500">
                        Scopes approved by client for this partnership
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {currentClient?.grantedScopes?.map((scope) => (
                        <div key={scope} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{scope}</span>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      )) || (
                        <div className="text-sm text-gray-500">No permissions granted yet</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Maker-Checker Mode</CardTitle>
                      <p className="text-sm text-gray-500">
                        Current approval workflow configuration
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {currentClient?.makerCheckerMode === 'client_checker' && (
                            <><Users className="h-4 w-4 text-blue-600" /> <span className="font-medium">Client Approval Required</span></>
                          )}
                          {currentClient?.makerCheckerMode === 'partner_checker' && (
                            <><Building2 className="h-4 w-4 text-green-600" /> <span className="font-medium">Partner Internal Review</span></>
                          )}
                          {currentClient?.makerCheckerMode === 'dual' && (
                            <><Shield className="h-4 w-4 text-purple-600" /> <span className="font-medium">Dual Approval Required</span></>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {currentClient?.makerCheckerMode === 'client_checker' && 'Partner prepares; client approves and submits.'}
                          {currentClient?.makerCheckerMode === 'partner_checker' && 'Partner staff prepares; partner reviewer approves and submits.'}
                          {currentClient?.makerCheckerMode === 'dual' && 'Partner prepares; client approves; partner submits (or vice-versa).'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

// Status badge components
function FilingStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: any; icon: any; label: string }> = {
    draft: { variant: 'secondary', icon: Edit, label: 'Draft' },
    pending_approval: { variant: 'outline', icon: Clock, label: 'Pending Approval' },
    ready: { variant: 'default', icon: CheckCircle, label: 'Ready' },
    submitted: { variant: 'default', icon: CheckCircle, label: 'Submitted' },
    failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
  };

  const config = variants[status] || variants.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="text-xs">
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function PayrollStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: any; icon: any; label: string }> = {
    draft: { variant: 'secondary', icon: Edit, label: 'Draft' },
    validated: { variant: 'outline', icon: CheckSquare, label: 'Validated' },
    finalized: { variant: 'default', icon: CheckCircle, label: 'Finalized' },
  };

  const config = variants[status] || variants.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="text-xs">
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}