import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Settings,
  Target,
  Activity,
  TrendingUp,
  Users
} from 'lucide-react';

interface ComplianceDashboard {
  overview: {
    total: number;
    applicable: number;
    implemented: number;
    inProgress: number;
    notStarted: number;
  };
  riskSummary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  evidenceFreshness: {
    total: number;
    fresh: number;
    warning: number;
    expired: number;
  };
  recentActivity: Array<{
    id: string;
    eventType: string;
    eventAction: string;
    timestamp: string;
  }>;
}

interface ControlsData {
  controls: Array<{
    id: string;
    framework: string;
    controlId: string;
    title: string;
    category: string;
    riskLevel: string;
    automatable: boolean;
    soa?: {
      status: string;
      implementationStatus: string;
      owner?: string;
      lastReviewed?: string;
    };
    evidenceCount: number;
    implementationProgress: {
      status: string;
      progress: number;
      hasEvidence: boolean;
    };
  }>;
  summary: {
    total: number;
    applicable: number;
    implemented: number;
    inProgress: number;
    notStarted: number;
  };
}

interface FindingsDashboard {
  summary: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    overdue: number;
  };
  bySeverity: Record<string, number>;
  bySource: Record<string, number>;
  slaStatus: {
    onTime: number;
    atRisk: number;
    overdue: number;
  };
  recentFindings: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    discoveredAt: string;
  }>;
}

export default function Compliance() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: dashboard } = useQuery<ComplianceDashboard>({
    queryKey: ['/api/grc/dashboard'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const { data: soa } = useQuery<ControlsData>({
    queryKey: ['/api/grc/soa'],
  });

  const { data: findings } = useQuery<FindingsDashboard>({
    queryKey: ['/api/grc/findings/dashboard'],
  });

  const { data: checkResults } = useQuery({
    queryKey: ['/api/grc/checks/results'],
  });

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'implemented': return 'text-green-600';
      case 'inprogress': return 'text-blue-600';
      case 'notstarted': return 'text-gray-500';
      case 'pass': return 'text-green-600';
      case 'fail': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            ISO 27001:2022 + SOC 2 Controls Pack
          </p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="soa">Statement of Applicability</TabsTrigger>
          <TabsTrigger value="evidence">Evidence Library</TabsTrigger>
          <TabsTrigger value="findings">Vulnerability Findings</TabsTrigger>
          <TabsTrigger value="checks">Automated Checks</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Controls</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.overview.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.overview.implemented || 0} implemented
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Implementation Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard ? Math.round((dashboard.overview.implemented / dashboard.overview.total) * 100) : 0}%
                </div>
                <Progress 
                  value={dashboard ? (dashboard.overview.implemented / dashboard.overview.total) * 100 : 0} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Risks</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.riskSummary.critical || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Critical risks open
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Evidence Status</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.evidenceFreshness.fresh || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Fresh evidence items
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Compliance Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard?.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.eventType} {activity.eventAction}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground py-8">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Vulnerability Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Findings</span>
                    <Badge variant="outline">{findings?.summary.total || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Open</span>
                    <Badge variant="destructive">{findings?.summary.open || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In Progress</span>
                    <Badge variant="secondary">{findings?.summary.inProgress || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resolved</span>
                    <Badge variant="outline" className="text-green-600">{findings?.summary.resolved || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="soa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statement of Applicability</CardTitle>
              <div className="flex space-x-4 text-sm text-muted-foreground">
                <span>📊 Total: {soa?.summary.total || 0}</span>
                <span>✅ Implemented: {soa?.summary.implemented || 0}</span>
                <span>🔄 In Progress: {soa?.summary.inProgress || 0}</span>
                <span>⏸️ Not Started: {soa?.summary.notStarted || 0}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {soa?.controls.map((control) => (
                  <div key={control.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{control.framework}</Badge>
                        <Badge variant="secondary">{control.controlId}</Badge>
                        <span className="font-medium">{control.title}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(control.riskLevel)}`} />
                        <span className="text-sm text-muted-foreground">{control.riskLevel}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={control.soa?.implementationStatus === 'Implemented' ? 'default' : 'outline'}
                          className={getStatusColor(control.soa?.implementationStatus || 'NotStarted')}
                        >
                          {control.soa?.implementationStatus || 'Not Started'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Evidence: {control.evidenceCount} items
                        </span>
                        {control.automatable && (
                          <Badge variant="secondary">
                            <Activity className="h-3 w-3 mr-1" />
                            Automated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-32">
                          <Progress value={control.implementationProgress.progress} />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {control.implementationProgress.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    Loading controls framework...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evidence Library</CardTitle>
              <p className="text-sm text-muted-foreground">
                Centralized compliance evidence with freshness SLAs
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboard?.evidenceFreshness.fresh || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Fresh</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {dashboard?.evidenceFreshness.warning || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Warning</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {dashboard?.evidenceFreshness.expired || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Expired</div>
                </div>
              </div>
              
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Upload Evidence
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vulnerability Findings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Pen-test and vulnerability scan findings with SLA tracking
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{findings?.summary.total || 0}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{findings?.summary.open || 0}</div>
                  <div className="text-sm text-muted-foreground">Open</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{findings?.summary.inProgress || 0}</div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{findings?.summary.resolved || 0}</div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Recent Findings</h3>
                {findings?.recentFindings.map((finding) => (
                  <div key={finding.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getRiskColor(finding.severity)}`} />
                      <div>
                        <div className="font-medium">{finding.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Discovered: {new Date(finding.discoveredAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{finding.severity}</Badge>
                      <Badge variant={finding.status === 'Open' ? 'destructive' : 'secondary'}>
                        {finding.status}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    No findings to display
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Checks</CardTitle>
              <p className="text-sm text-muted-foreground">
                Control-as-code validation across cloud, identity, and development environments
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkResults?.map((result: any) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {result.result === 'Pass' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : result.result === 'Fail' ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                      <div>
                        <div className="font-medium">{result.checkName}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.controlTitle} - {result.checkType}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{result.score}%</Badge>
                      <Badge variant={result.result === 'Pass' ? 'default' : 'destructive'}>
                        {result.result}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    No check results available
                  </div>
                )}
              </div>
              
              <Button className="mt-4">
                <Activity className="h-4 w-4 mr-2" />
                Run Manual Checks
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}