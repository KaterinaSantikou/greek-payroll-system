/**
 * Partner Route - Main partner console with OBO context
 * Includes: firm home, client directory, approval queue, context header
 */

import { useState, useEffect } from 'react';
import { useLocation, Link, Route, Switch } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useObo } from '@/contexts/OboContext';
import {
  Building2,
  Users,
  FileText,
  Calculator,
  Shield,
  CheckSquare,
  Search,
  Star,
  Clock,
  ChevronDown,
  Bell,
  LogOut,
  Target,
} from 'lucide-react';

// Import existing components (will reuse existing components when available)

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
  isFavorite?: boolean;
}

interface ApprovalRequest {
  id: string;
  type: 'filing_submit' | 'payroll_finalize' | 'payment_batch';
  title: string;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tenantName?: string;
}

function OboContextHeader() {
  const {
    currentTenant,
    currentPartner,
    isOboActive,
    clearOboContext,
    securityMetadata,
  } = useObo();

  if (!isOboActive) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Partner Console
            </span>
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              Native Context
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border-b border-green-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-green-600" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-900">
              Acting on behalf of tenant: <strong>{currentTenant}</strong>
            </span>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              OBO Active
            </Badge>
            {securityMetadata?.ttlEnforced && (
              <Badge
                variant="outline"
                className="text-green-700 border-green-400"
              >
                TTL: 10min
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {securityMetadata && (
            <div className="text-xs text-green-700">
              {securityMetadata.rotatedTokens
                ? `Rotated ${securityMetadata.rotatedTokens} tokens`
                : ''}
              {securityMetadata.responseTime &&
                ` • ${securityMetadata.responseTime}ms`}
            </div>
          )}
          <Button
            onClick={clearOboContext}
            size="sm"
            variant="outline"
            className="text-green-700 border-green-300 hover:bg-green-100"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Exit OBO
          </Button>
        </div>
      </div>
    </div>
  );
}

function FirmHome() {
  const { data: firmsData } = useQuery({
    queryKey: ['/api/partners/firms'],
  });

  const firms: PartnerFirm[] = firmsData?.firms || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Firm Overview</h1>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-500" />
          <Badge variant="outline">3 notifications</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Active Firms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{firms.length}</div>
            <p className="text-sm text-muted-foreground">Partner firms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-sm text-muted-foreground">Active clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-sm text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Partner Firms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {firms.map(firm => (
              <div
                key={firm.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{firm.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    Role: {firm.userRole}
                  </div>
                </div>
                <Badge>{firm.permissions.length} permissions</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/partner/clients">
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Browse Client Directory
              </Button>
            </Link>
            <Link to="/partner/approvals">
              <Button className="w-full justify-start" variant="outline">
                <CheckSquare className="h-4 w-4 mr-2" />
                Review Pending Approvals
              </Button>
            </Link>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClientDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFirm, setSelectedFirm] = useState('');
  const { switchTenant, isOboActive, currentTenant } = useObo();
  const { toast } = useToast();

  const { data: clientsData } = useQuery({
    queryKey: ['/api/partners/clients'],
  });

  const clients: ClientTenant[] = clientsData?.clients || [];

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.afm?.includes(searchQuery);
    const matchesFirm = !selectedFirm || client.partnerFirmId === selectedFirm;
    return matchesSearch && matchesFirm;
  });

  const handleSwitchTenant = async (client: ClientTenant) => {
    try {
      await switchTenant(client.partnerFirmId, client.clientTenantId);
    } catch (error) {
      // Error handling is done in the OBO context
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Client Directory</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <Card
            key={client.clientTenantId}
            className={
              currentTenant === client.clientTenantId
                ? 'border-green-500 bg-green-50'
                : ''
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{client.clientName}</CardTitle>
                {client.isFavorite && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
                {currentTenant === client.clientTenantId && (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  AFM: {client.afm}
                </div>
                <div className="text-sm text-muted-foreground">
                  Type: {client.clientType}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {client.makerCheckerMode}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {client.grantedScopes.length} scopes
                  </Badge>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleSwitchTenant(client)}
                  disabled={currentTenant === client.clientTenantId}
                >
                  {currentTenant === client.clientTenantId
                    ? 'Currently Active'
                    : 'Switch Context'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            No clients found matching your search.
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalQueue() {
  const mockApprovals: ApprovalRequest[] = [
    {
      id: '1',
      type: 'filing_submit',
      title: 'APD December 2024 Submission',
      requestedBy: 'K. Karteris',
      requestedAt: '2025-01-20T10:30:00Z',
      status: 'pending',
      priority: 'high',
      tenantName: 'Acme Corp',
    },
    {
      id: '2',
      type: 'payroll_finalize',
      title: 'January 2025 Payroll Finalization',
      requestedBy: 'M. Papadopoulos',
      requestedAt: '2025-01-19T16:45:00Z',
      status: 'pending',
      priority: 'normal',
      tenantName: 'Beta Ltd',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Approval Queue</h1>
        <Badge variant="outline">{mockApprovals.length} pending</Badge>
      </div>

      <div className="space-y-4">
        {mockApprovals.map(approval => (
          <Card key={approval.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{approval.title}</h3>
                    <Badge
                      className={
                        approval.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : approval.priority === 'urgent'
                            ? 'bg-red-200 text-red-900'
                            : 'bg-blue-100 text-blue-800'
                      }
                    >
                      {approval.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Requested by {approval.requestedBy}</span>
                    <span>•</span>
                    <span>Client: {approval.tenantName}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(approval.requestedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    Review
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockApprovals.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <div className="text-muted-foreground">No pending approvals</div>
        </div>
      )}
    </div>
  );
}

function OboFilingsWrapper() {
  const { isOboActive, currentTenant } = useObo();

  if (!isOboActive) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <div className="text-muted-foreground">
          Switch to a client context to access filings
        </div>
      </div>
    );
  }

  // Reuse existing filing components behind OBO provider
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Client Filings</h1>
      <div className="text-sm text-muted-foreground">
        Viewing filings for tenant: {currentTenant}
      </div>

      {/* Filing components will be added here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Filing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                APD - December 2024
              </div>
              <Badge className="bg-yellow-100 text-yellow-800">
                Pending Approval
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">January 2025</div>
              <Badge className="bg-green-100 text-green-800">Validated</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Partner() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <OboContextHeader />

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-sm border-r min-h-screen">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6">Partner Console</h2>
            <nav className="space-y-2">
              <Link to="/partner">
                <Button
                  variant={location === '/partner' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Firm Home
                </Button>
              </Link>
              <Link to="/partner/clients">
                <Button
                  variant={
                    location === '/partner/clients' ? 'default' : 'ghost'
                  }
                  className="w-full justify-start"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Client Directory
                </Button>
              </Link>
              <Link to="/partner/approvals">
                <Button
                  variant={
                    location === '/partner/approvals' ? 'default' : 'ghost'
                  }
                  className="w-full justify-start"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Approval Queue
                </Button>
              </Link>
              <Link to="/partner/filings">
                <Button
                  variant={
                    location === '/partner/filings' ? 'default' : 'ghost'
                  }
                  className="w-full justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Client Filings
                </Button>
              </Link>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Switch>
            <Route path="/partner" component={FirmHome} />
            <Route path="/partner/clients" component={ClientDirectory} />
            <Route path="/partner/approvals" component={ApprovalQueue} />
            <Route path="/partner/filings" component={OboFilingsWrapper} />
          </Switch>
        </div>
      </div>
    </div>
  );
}
