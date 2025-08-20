/**
 * Partner Firm Management Console
 * Allows partner firms to switch between client tenants and manage OBO tokens
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Building2, 
  Users, 
  Shield, 
  Key, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  Trash2,
  ArrowRightLeft,
  Globe,
  Settings
} from 'lucide-react';

interface PartnerFirm {
  id: string;
  name: string;
  userRole: string;
  permissions: any;
}

interface ClientTenant {
  clientTenantId: string;
  clientName: string;
  clientType: string;
  partnerFirmId: string;
  partnerFirmName: string;
  grantedScopes: any;
  userRole: string;
  validUntil: string;
  lastUsed: string;
}

interface OboToken {
  id: string;
  asTenantId: string;
  partnerFirmId: string;
  scopes: string[];
  expiresAt: string;
  usageCount: number;
  maxUsage: number;
  issuedAt: string;
  lastUsedAt?: string;
}

export default function PartnerConsole() {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedPartnerFirm, setSelectedPartnerFirm] = useState<string>('');
  const [currentContext, setCurrentContext] = useState<any>(null);
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

  // Get active OBO tokens
  const { data: tokensData, refetch: refetchTokens } = useQuery({
    queryKey: ['/api/partners/obo-tokens'],
  });

  // Get current context
  const { data: contextData } = useQuery({
    queryKey: ['/api/partners/current-context'],
  });

  const firms: PartnerFirm[] = firmsData?.firms || [];
  const clients: ClientTenant[] = clientsData?.clients || [];
  const tokens: OboToken[] = tokensData?.tokens || [];

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

  // Create OBO token mutation
  const createTokenMutation = useMutation({
    mutationFn: async (tokenData: { 
      partnerFirmId: string; 
      asTenantId: string; 
      scopes: string[]; 
      expiresInMinutes: number;
    }) => {
      return await apiRequest({
        url: '/api/partners/obo-token',
        method: 'POST',
        body: tokenData,
      });
    },
    onSuccess: () => {
      toast({
        title: 'OBO token created successfully',
        description: 'The token is ready for use in API calls.',
      });
      refetchTokens();
    },
    onError: (error) => {
      toast({
        title: 'Failed to create OBO token',
        description: error.message || 'Unable to create the OBO token.',
        variant: 'destructive',
      });
    },
  });

  // Revoke OBO token mutation
  const revokeTokenMutation = useMutation({
    mutationFn: async ({ tokenId, reason }: { tokenId: string; reason?: string }) => {
      await apiRequest({
        url: `/api/partners/obo-tokens/${tokenId}`,
        method: 'DELETE',
        body: { reason },
      });
    },
    onSuccess: () => {
      toast({
        title: 'OBO token revoked',
        description: 'The token has been permanently revoked.',
      });
      refetchTokens();
    },
    onError: (error) => {
      toast({
        title: 'Failed to revoke token',
        description: error.message || 'Unable to revoke the token.',
        variant: 'destructive',
      });
    },
  });

  const handleSwitchTenant = (tenantId: string) => {
    const client = clients.find((c: ClientTenant) => c.clientTenantId === tenantId);
    if (client) {
      switchTenantMutation.mutate({
        tenantId,
        partnerFirmId: client.partnerFirmId,
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'The value has been copied to your clipboard.',
    });
  };

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
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partner Console</h1>
          <p className="text-muted-foreground">
            Manage client relationships and access delegation for your partner firm
          </p>
        </div>
        <div className="flex items-center gap-4">
          {currentContext?.currentTenant && (
            <Badge variant="secondary" className="px-3 py-1">
              <Globe className="h-3 w-3 mr-1" />
              Current: {currentContext.currentTenant}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clients">Client Tenants</TabsTrigger>
          <TabsTrigger value="tokens">OBO Tokens</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Partner Firms Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Partner Firms</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{firms.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active firm memberships
                </p>
                {firms.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">Primary:</p>
                    <p className="text-sm font-medium">{firms[0]?.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Tenants Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Client Tenants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clients.length}</div>
                <p className="text-xs text-muted-foreground">
                  Accessible client accounts
                </p>
                <div className="mt-2">
                  <Select value={selectedTenant} onValueChange={handleSwitchTenant}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Switch to client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: ClientTenant) => (
                        <SelectItem key={client.clientTenantId} value={client.clientTenantId}>
                          {client.clientName} ({client.partnerFirmName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Active Tokens Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active OBO Tokens</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tokens.length}</div>
                <p className="text-xs text-muted-foreground">
                  On-behalf-of delegation tokens
                </p>
                {tokens.length > 0 && (
                  <div className="mt-2">
                    <CreateOboTokenDialog 
                      clients={clients} 
                      onCreateToken={(data) => createTokenMutation.mutate(data)}
                      isCreating={createTokenMutation.isPending}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Client Tenants Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Accessible Client Tenants</h2>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/partners/clients'] })}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {clients.map((client) => (
              <Card key={client.clientTenantId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {client.clientName}
                    {currentContext?.currentTenant === client.clientTenantId && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    via {client.partnerFirmName}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tenant ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1 rounded">
                        {client.clientTenantId}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(client.clientTenantId)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Your Role:</span>
                    <Badge variant="outline">{client.userRole}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Type:</span>
                    <Badge variant="secondary">{client.clientType}</Badge>
                  </div>

                  {client.lastUsed && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Used:</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(client.lastUsed).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <Button
                    onClick={() => handleSwitchTenant(client.clientTenantId)}
                    disabled={currentContext?.currentTenant === client.clientTenantId || switchTenantMutation.isPending}
                    className="w-full"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    {currentContext?.currentTenant === client.clientTenantId ? 'Currently Active' : 'Switch to Client'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* OBO Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">On-Behalf-Of Tokens</h2>
            <CreateOboTokenDialog 
              clients={clients} 
              onCreateToken={(data) => createTokenMutation.mutate(data)}
              isCreating={createTokenMutation.isPending}
            />
          </div>

          {tokens.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No active tokens</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create an OBO token to act on behalf of a client tenant
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Tenant</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => {
                    const isExpired = new Date(token.expiresAt) < new Date();
                    const isOverUsed = token.usageCount >= token.maxUsage;
                    
                    return (
                      <TableRow key={token.id}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 rounded">
                            {token.asTenantId}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {token.scopes.map((scope) => (
                              <Badge key={scope} variant="outline" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {token.usageCount}/{token.maxUsage}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(token.expiresAt).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="destructive">
                              <Clock className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          ) : isOverUsed ? (
                            <Badge variant="secondary">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Used Up
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => revokeTokenMutation.mutate({ tokenId: token.id })}
                            disabled={revokeTokenMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Audit Trail</h2>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Export Log
            </Button>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Audit log coming soon</h3>
              <p className="text-sm text-muted-foreground">
                View comprehensive audit trails of all partner operations
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateOboTokenDialog({ 
  clients, 
  onCreateToken, 
  isCreating 
}: { 
  clients: ClientTenant[]; 
  onCreateToken: (data: any) => void;
  isCreating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [scopes, setScopes] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = clients.find(c => c.clientTenantId === selectedClient);
    if (!client) return;

    const scopesList = scopes.split(',').map(s => s.trim()).filter(s => s);
    
    onCreateToken({
      partnerFirmId: client.partnerFirmId,
      asTenantId: client.clientTenantId,
      scopes: scopesList,
      expiresInMinutes,
    });
    
    setOpen(false);
    setSelectedClient('');
    setScopes('');
    setExpiresInMinutes(30);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Key className="h-4 w-4 mr-2" />
          Create Token
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create OBO Token</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client Tenant</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient} required>
              <SelectTrigger>
                <SelectValue placeholder="Select client tenant..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.clientTenantId} value={client.clientTenantId}>
                    {client.clientName} ({client.clientTenantId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scopes">Scopes (comma-separated)</Label>
            <Textarea
              id="scopes"
              placeholder="read:payroll, write:filings, read:reports"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Expires in (minutes)</Label>
            <Input
              id="expires"
              type="number"
              min={5}
              max={480}
              value={expiresInMinutes}
              onChange={(e) => setExpiresInMinutes(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Token'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}