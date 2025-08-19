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
  EyeOff
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
      allowedOrigins: ['https://demo-erp.com', 'https://localhost:3000'],
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
          <Card>
            <CardHeader>
              <CardTitle>Embed Token Generator</CardTitle>
              <CardDescription>
                Generate JWT tokens for embedded payroll surfaces
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee ID (Optional)</Label>
                  <Input placeholder="emp-12345" />
                </div>
                <div>
                  <Label>Origin Domain</Label>
                  <Input placeholder="https://your-app.com" />
                </div>
                <div>
                  <Label>Allowed Routes</Label>
                  <Input placeholder="payroll/*, timesheets/*" />
                </div>
                <div>
                  <Label>Expires In (Minutes)</Label>
                  <Input type="number" placeholder="10" />
                </div>
              </div>
              
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Generate Embed Token
              </Button>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Embed Example</h4>
                <code className="text-sm block whitespace-pre-wrap">
{`<iframe 
  src="https://payroll.yourapp.com/embed/payroll?token=JWT_TOKEN"
  width="100%" 
  height="600"
  frameborder="0">
</iframe>`}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}