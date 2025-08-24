import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Key, 
  Settings, 
  Globe, 
  Shield, 
  Database, 
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  FileText,
  CreditCard
} from "lucide-react";

interface Partner {
  id: string;
  name: string;
  companyName: string;
  email: string;
  clientId: string;
  clientSecret: string;
  allowedOrigins: string[];
  scopes: string[];
  status: 'active' | 'suspended' | 'inactive';
  webhookUrl?: string;
  createdAt: string;
}

interface GLConnection {
  id: string;
  glProvider: 'xero' | 'quickbooks' | 'generic';
  connectionName: string;
  status: 'active' | 'expired' | 'error' | 'disconnected';
  lastSyncAt?: string;
  createdAt: string;
}

interface AccessToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export default function EmbeddedPayroll() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [glConnections, setGLConnections] = useState<GLConnection[]>([]);
  const [accessToken, setAccessToken] = useState<AccessToken | null>(null);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Demo data for development
  useEffect(() => {
    const mockPartner: Partner = {
      id: 'demo-partner-1',
      name: 'Demo Partner',
      companyName: 'Demo ERP Company',
      email: 'demo@example.com',
      clientId: 'demo_client_12345',
      clientSecret: 'demo_secret_abcdef123456',
      allowedOrigins: ['https://demo-erp.com', window.location.origin],
      scopes: ['payroll.runs:read', 'payroll.runs:finalize', 'gl.journals:write'],
      status: 'active',
      webhookUrl: 'https://demo-erp.com/webhooks/payroll',
      createdAt: new Date().toISOString(),
    };
    
    setPartners([mockPartner]);
    setSelectedPartner(mockPartner);
    
    const mockGLConnection: GLConnection = {
      id: 'demo-gl-1',
      glProvider: 'quickbooks',
      connectionName: 'Demo QuickBooks Connection',
      status: 'active',
      lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    setGLConnections([mockGLConnection]);
  }, []);

  const generateAccessToken = async () => {
    if (!selectedPartner) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/embedded/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: selectedPartner.clientId,
          client_secret: selectedPartner.clientSecret,
          scope: selectedPartner.scopes.join(' '),
        }),
      });

      if (response.ok) {
        const tokenData = await response.json();
        setAccessToken(tokenData);
        toast({
          title: "Access Token Generated",
          description: "OAuth2 access token generated successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Token Generation Failed",
          description: error.error_description || "Failed to generate access token",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error generating access token",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAPIEndpoint = async (endpoint: string, method = 'GET') => {
    if (!accessToken) {
      toast({
        title: "No Access Token",
        description: "Generate an access token first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken.access_token}`,
          'Content-Type': 'application/json',
          ...(method !== 'GET' && { 'Idempotency-Key': `test-${Date.now()}` }),
        },
      });

      const data = await response.json();
      console.log(`${method} ${endpoint}:`, data);
      
      toast({
        title: "API Test",
        description: `${method} ${endpoint} - Status: ${response.status}`,
        variant: response.ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error('API Test Error:', error);
      toast({
        title: "API Test Failed",
        description: "Network error during API test",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Embedded Payroll + GL API</h1>
          <p className="text-muted-foreground">
            Partner API management, GL integrations, and embedded payroll surfaces
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Shield className="w-4 h-4 mr-1" />
            OAuth2 Secured
          </Badge>
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            <Database className="w-4 h-4 mr-1" />
            GL Connected
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="api-testing">API Testing</TabsTrigger>
          <TabsTrigger value="gl-integration">GL Integration</TabsTrigger>
          <TabsTrigger value="embeds">Embed Tokens</TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>API Partners</span>
              </CardTitle>
              <CardDescription>
                Manage API partners, client credentials, and access scopes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPartner && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Partner Name</Label>
                      <Input value={selectedPartner.name} readOnly />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input value={selectedPartner.companyName} readOnly />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={selectedPartner.email} readOnly />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge variant={selectedPartner.status === 'active' ? 'default' : 'secondary'}>
                        {selectedPartner.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Client ID</Label>
                      <div className="flex space-x-2">
                        <Input value={selectedPartner.clientId} readOnly />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(selectedPartner.clientId)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Client Secret</Label>
                      <div className="flex space-x-2">
                        <Input 
                          type={showClientSecret ? "text" : "password"}
                          value={selectedPartner.clientSecret} 
                          readOnly 
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setShowClientSecret(!showClientSecret)}
                        >
                          {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => copyToClipboard(selectedPartner.clientSecret)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Allowed Scopes</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedPartner.scopes.map((scope, index) => (
                        <Badge key={index} variant="outline">{scope}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Allowed Origins</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedPartner.allowedOrigins.map((origin, index) => (
                        <Badge key={index} variant="outline">
                          <Globe className="w-3 h-3 mr-1" />
                          {origin}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {selectedPartner.webhookUrl && (
                    <div>
                      <Label>Webhook URL</Label>
                      <div className="flex space-x-2">
                        <Input value={selectedPartner.webhookUrl} readOnly />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => window.open(selectedPartner.webhookUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OAuth2 Token Generation</CardTitle>
              <CardDescription>
                Generate access tokens and test API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button 
                  onClick={generateAccessToken} 
                  disabled={isLoading || !selectedPartner}
                  className="flex items-center space-x-2"
                >
                  <Key className="w-4 h-4" />
                  <span>{isLoading ? 'Generating...' : 'Generate Access Token'}</span>
                </Button>
                
                {accessToken && (
                  <Badge variant="secondary" className="px-3 py-2">
                    Token expires in {accessToken.expires_in}s
                  </Badge>
                )}
              </div>

              {accessToken && (
                <div className="space-y-3">
                  <div>
                    <Label>Access Token</Label>
                    <div className="flex space-x-2">
                      <Input 
                        value={accessToken.access_token.substring(0, 32) + '...'} 
                        readOnly 
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(accessToken.access_token)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => testAPIEndpoint('/api/embedded/health')}
                    >
                      Test Health Endpoint
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => testAPIEndpoint('/api/embedded/partner/profile')}
                    >
                      Test Partner Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => testAPIEndpoint('/api/embedded/payroll/runs')}
                    >
                      Test Payroll Runs
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => testAPIEndpoint('/api/embedded/gl/connections')}
                    >
                      Test GL Connections
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gl-integration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>GL Connections</span>
              </CardTitle>
              <CardDescription>
                Manage GL system integrations for journal posting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Connection Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glConnections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {connection.glProvider}
                        </Badge>
                      </TableCell>
                      <TableCell>{connection.connectionName}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={connection.status === 'active' ? 'default' : 'secondary'}
                        >
                          {connection.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {connection.lastSyncAt 
                          ? new Date(connection.lastSyncAt).toLocaleString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-1" />
                          Configure
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embeds" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Demo Surfaces */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Live Demo Surfaces</CardTitle>
                  <CardDescription>
                    Interactive demos of embeddable payroll surfaces
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => window.open(
                        `/embed?surface=payroll_run&token=${accessToken?.access_token}&tenantId=demo-tenant&runId=run-001&theme=light`,
                        '_blank'
                      )}
                      disabled={!accessToken}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Settings className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">Payroll Wizard</div>
                        <div className="text-xs text-muted-foreground">Draft → Validate → Finalize → Post</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => window.open(
                        `/embed?surface=exceptions_review&token=${accessToken?.access_token}&tenantId=demo-tenant&theme=light`,
                        '_blank'
                      )}
                      disabled={!accessToken}
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">Exceptions</div>
                        <div className="text-xs text-muted-foreground">Missed punches, OT approvals</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => window.open(
                        `/embed?surface=filings_panel&token=${accessToken?.access_token}&tenantId=demo-tenant&theme=light`,
                        '_blank'
                      )}
                      disabled={!accessToken}
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">Filings Panel</div>
                        <div className="text-xs text-muted-foreground">ERGANI/APD/ΦΜΥ status</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                      onClick={() => window.open(
                        `/embed?surface=payments_cockpit&token=${accessToken?.access_token}&tenantId=demo-tenant&theme=light`,
                        '_blank'
                      )}
                      disabled={!accessToken}
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">Payments</div>
                        <div className="text-xs text-muted-foreground">SEPA batch status</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Integration Examples */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Examples</CardTitle>
                  <CardDescription>
                    Code examples for both integration patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Globe className="w-4 h-4 mr-1" />
                      Option A: iFrame + SDK
                    </h4>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm font-mono">
{`// Initialize SDK
const sdk = new PayrollSDK({
  tenantId: 'your-tenant',
  token: 'jwt-token',
  surface: 'payroll_run',
  locale: 'en',
  theme: 'light'
});

// Setup event handlers
sdk.on('payroll.run.validated', (event, data) => {
  console.log('Payroll validated:', data);
});

// Initialize in container
await sdk.init(document.getElementById('payroll'));
`}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Settings className="w-4 h-4 mr-1" />
                      Option B: Web Component
                    </h4>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm font-mono">
{`<!-- Direct HTML usage -->
<payroll-surface 
  surface="exceptions_review"
  token="jwt-token"
  tenant-id="your-tenant"
  theme="light"
  locale="en">
</payroll-surface>

<!-- Event handling -->
<script>
document.querySelector('payroll-surface')
  .addEventListener('exceptions-resolved', (e) => {
    console.log('Exception resolved:', e.detail);
  });
</script>`}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>PostMessage Events</CardTitle>
                  <CardDescription>
                    Available events for payroll lifecycle tracking
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <strong>Payroll Run:</strong>
                        <ul className="text-xs text-muted-foreground ml-2 space-y-1">
                          <li>• payroll.run.opened</li>
                          <li>• payroll.run.validated</li>
                          <li>• payroll.run.finalized</li>
                          <li>• payroll.run.posted</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Exceptions:</strong>
                        <ul className="text-xs text-muted-foreground ml-2 space-y-1">
                          <li>• exceptions.loaded</li>
                          <li>• exceptions.resolved</li>
                          <li>• exceptions.failed</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Filings:</strong>
                        <ul className="text-xs text-muted-foreground ml-2 space-y-1">
                          <li>• filings.loaded</li>
                          <li>• filing.submitted</li>
                          <li>• filing.failed</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Payments:</strong>
                        <ul className="text-xs text-muted-foreground ml-2 space-y-1">
                          <li>• payments.loaded</li>
                          <li>• payment.sent</li>
                          <li>• payment.failed</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}