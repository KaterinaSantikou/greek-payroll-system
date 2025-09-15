import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  GitBranch,
  Globe,
  AlertCircle,
  Play,
  Pause,
  Settings,
  TrendingUp,
  Users,
  Building2,
  Send,
  Download,
  Zap,
  Shield,
  Scale,
  RefreshCcw,
  Diff,
  Calendar,
  User,
  Target,
  Sparkles,
} from 'lucide-react';

interface RulePackVersion {
  id: string;
  packName: string;
  version: string;
  effectiveDate: string;
  createdDate: string;
  createdBy: string;
  status:
    | 'draft'
    | 'review'
    | 'approved'
    | 'published'
    | 'superseded'
    | 'retired';
  legalApproval?: {
    approvedBy: string;
    approvedDate: string;
    approvalNotes: string;
    legalReference: string;
  };
  changelog: string;
  diffSummary?: {
    added: number;
    modified: number;
    removed: number;
    impactedEmployees: number;
  };
}

interface LegalAlert {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedDate: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed';
  recommendedActions: string[];
  assignedTo?: string;
  dueDate?: string;
}

interface TenantDeployment {
  id: string;
  tenantId: string;
  tenantName: string;
  rulePackVersionId: string;
  deploymentStatus: 'pending' | 'deploying' | 'deployed' | 'failed';
  deployedDate?: string;
  deployedBy: string;
  deploymentNotes: string;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  published: 'bg-purple-100 text-purple-800',
  superseded: 'bg-orange-100 text-orange-800',
  retired: 'bg-red-100 text-red-800',
};

const urgencyColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function ChangeLogLegalWatch() {
  const [selectedVersion, setSelectedVersion] =
    useState<RulePackVersion | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<LegalAlert | null>(null);
  const [diffViewOpen, setDiffViewOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{
    source: string;
    target: string;
  }>({ source: '', target: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: dashboard } = useQuery({
    queryKey: ['/api/changelog/dashboard'],
  });

  const { data: rulePacks } = useQuery({
    queryKey: ['/api/changelog/rule-packs'],
  });

  const { data: legalAlerts } = useQuery({
    queryKey: ['/api/changelog/legal-alerts'],
  });

  const { data: legalWatches } = useQuery({
    queryKey: ['/api/changelog/legal-watches'],
  });

  const { data: tenants } = useQuery({
    queryKey: ['/api/changelog/tenants'],
  });

  const { data: comparison } = useQuery({
    queryKey: [
      '/api/changelog/compare',
      compareVersions.source,
      compareVersions.target,
    ],
    enabled:
      !!compareVersions.source &&
      !!compareVersions.target &&
      compareVersions.source !== compareVersions.target,
  });

  // Mutations
  const updateRulePackStatusMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      status: string;
      legalApproval?: any;
    }) => apiRequest('/api/changelog/rule-packs/status', 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/changelog/rule-packs'],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/changelog/dashboard'] });
      toast({
        title: 'Success',
        description: 'Rule pack status updated successfully',
      });
    },
  });

  const deployToTenantMutation = useMutation({
    mutationFn: async (data: {
      tenantId: string;
      rulePackVersionId: string;
      deployedBy: string;
      notes: string;
    }) => apiRequest('/api/changelog/deploy', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/changelog/tenants'] });
      setDeployModalOpen(false);
      toast({
        title: 'Success',
        description: 'Deployment initiated successfully',
      });
    },
  });

  const updateLegalAlertMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) =>
      apiRequest('/api/changelog/legal-alerts', 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/changelog/legal-alerts'],
      });
      toast({
        title: 'Success',
        description: 'Legal alert updated successfully',
      });
    },
  });

  const simulateLegalScanMutation = useMutation({
    mutationFn: async () =>
      apiRequest('/api/changelog/simulate-legal-scan', 'POST', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/changelog/legal-alerts'],
      });
      toast({
        title: 'Success',
        description: 'Legal monitoring scan completed',
      });
    },
  });

  const handleApproveRulePack = (rulePackId: string) => {
    updateRulePackStatusMutation.mutate({
      id: rulePackId,
      status: 'approved',
      legalApproval: {
        approvedBy: 'Legal Team',
        approvedDate: new Date().toISOString(),
        approvalNotes: 'Approved after legal review',
        legalReference: 'Internal Legal Review Process',
      },
    });
  };

  const handlePublishRulePack = (rulePackId: string) => {
    updateRulePackStatusMutation.mutate({
      id: rulePackId,
      status: 'published',
    });
  };

  const handleUpdateAlert = (alertId: string, status: string) => {
    updateLegalAlertMutation.mutate({
      id: alertId,
      updates: { status },
    });
  };

  const DashboardOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Rule Pack Versions
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {dashboard?.data?.rulePackSummary?.total || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {dashboard?.data?.rulePackSummary?.pendingApproval || 0} pending
            approval
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Deployments
          </CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {dashboard?.data?.deploymentSummary?.totalDeployments || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {dashboard?.data?.deploymentSummary?.tenantsCovered || 0} tenants
            covered
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Legal Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {dashboard?.data?.alertsSummary?.totalAlerts || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {dashboard?.data?.alertsSummary?.urgentAlerts || 0} urgent alerts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coverage Score</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {dashboard?.data?.complianceStatus?.coverageScore || 0}%
          </div>
          <Progress
            value={dashboard?.data?.complianceStatus?.coverageScore || 0}
            className="mt-2"
          />
        </CardContent>
      </Card>
    </div>
  );

  const RulePackVersions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Rule Pack Versions</h3>
        <Button variant="outline" onClick={() => setDiffViewOpen(true)}>
          <Diff className="mr-2 h-4 w-4" />
          Compare Versions
        </Button>
      </div>

      <div className="space-y-4">
        {rulePacks?.data?.map((rulePack: RulePackVersion) => (
          <Card key={rulePack.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{rulePack.packName}</CardTitle>
                  <CardDescription>Version {rulePack.version}</CardDescription>
                </div>
                <Badge className={statusColors[rulePack.status]}>
                  {rulePack.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Effective Date
                  </Label>
                  <p className="text-sm">
                    {new Date(rulePack.effectiveDate).toLocaleDateString(
                      'en-GB'
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Created By
                  </Label>
                  <p className="text-sm">{rulePack.createdBy}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Impact
                  </Label>
                  <p className="text-sm">
                    {rulePack.diffSummary?.impactedEmployees || 0} employees
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Changes
                  </Label>
                  <p className="text-sm">
                    {(rulePack.diffSummary?.added || 0) +
                      (rulePack.diffSummary?.modified || 0) +
                      (rulePack.diffSummary?.removed || 0)}{' '}
                    total
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <Label className="text-sm text-muted-foreground">
                  Changelog
                </Label>
                <p className="text-sm mt-1">{rulePack.changelog}</p>
              </div>

              {rulePack.legalApproval && (
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    Legal Approval
                  </h4>
                  <div className="space-y-2 text-sm text-green-800">
                    <p>
                      <strong>Approved by:</strong>{' '}
                      {rulePack.legalApproval.approvedBy}
                    </p>
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(
                        rulePack.legalApproval.approvedDate
                      ).toLocaleDateString('en-GB')}
                    </p>
                    <p>
                      <strong>Notes:</strong>{' '}
                      {rulePack.legalApproval.approvalNotes}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {rulePack.status === 'draft' && (
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Submit for Review
                  </Button>
                )}
                {rulePack.status === 'review' && (
                  <Button
                    size="sm"
                    onClick={() => handleApproveRulePack(rulePack.id)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                )}
                {rulePack.status === 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => handlePublishRulePack(rulePack.id)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Publish
                  </Button>
                )}
                {(rulePack.status === 'approved' ||
                  rulePack.status === 'published') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedVersion(rulePack);
                      setDeployModalOpen(true);
                    }}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    Deploy to Tenants
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVersion(rulePack)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const LegalAlerts = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Legal Monitoring & Alerts</h3>
        <Button
          onClick={() => simulateLegalScanMutation.mutate()}
          disabled={simulateLegalScanMutation.isPending}
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${simulateLegalScanMutation.isPending ? 'animate-spin' : ''}`}
          />
          Run Legal Scan
        </Button>
      </div>

      <div className="space-y-4">
        {legalAlerts?.data?.map((alert: LegalAlert) => (
          <Card key={alert.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {alert.urgency === 'urgent' && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    {alert.urgency === 'high' && (
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                    )}
                    {alert.title}
                  </CardTitle>
                  <CardDescription>{alert.source}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={urgencyColors[alert.urgency]}>
                    {alert.urgency}
                  </Badge>
                  <Badge
                    variant={alert.status === 'new' ? 'default' : 'secondary'}
                  >
                    {alert.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">{alert.summary}</p>

              <div className="mb-4">
                <Label className="text-sm text-muted-foreground">
                  Recommended Actions
                </Label>
                <ul className="text-sm mt-1 space-y-1">
                  {alert.recommendedActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Target className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                {alert.status === 'new' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateAlert(alert.id, 'reviewed')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Mark Reviewed
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateAlert(alert.id, 'actioned')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Take Action
                    </Button>
                  </>
                )}
                {alert.status === 'reviewed' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateAlert(alert.id, 'actioned')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Action
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Full Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!legalAlerts?.data || legalAlerts.data.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No legal alerts at this time
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Legal monitoring is active and scanning for regulatory changes
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const LegalWatches = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Legal Watch Configuration</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {legalWatches?.data?.map((watch: any) => (
          <Card key={watch.id}>
            <CardHeader>
              <CardTitle className="text-base">{watch.name}</CardTitle>
              <CardDescription>
                {watch.category.replace('_', ' ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Jurisdiction
                  </Label>
                  <p className="text-sm flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {watch.jurisdiction.toUpperCase()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">
                    Keywords
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {watch.keywords
                      .slice(0, 3)
                      .map((keyword: string, index: number) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    {watch.keywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{watch.keywords.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {watch.isActive ? (
                      <>
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-700">Active</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">Inactive</span>
                      </>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {watch.lastAlert && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>Last Alert:</strong> {watch.lastAlert.title}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {new Date(watch.lastAlert.date).toLocaleDateString(
                        'en-GB'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const DeploymentDialog = () => (
    <Dialog open={deployModalOpen} onOpenChange={setDeployModalOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deploy Rule Pack to Tenants</DialogTitle>
          <DialogDescription>
            Deploy {selectedVersion?.packName} v{selectedVersion?.version} to
            selected tenants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenants?.data?.map((tenant: any) => (
              <Card key={tenant.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{tenant.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {tenant.environment}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.properties.length} properties
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        deployToTenantMutation.mutate({
                          tenantId: tenant.id,
                          rulePackVersionId: selectedVersion?.id || '',
                          deployedBy: 'current-user',
                          notes: `Deployment of ${selectedVersion?.packName} v${selectedVersion?.version}`,
                        })
                      }
                      disabled={deployToTenantMutation.isPending}
                    >
                      Deploy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const ComparisonDialog = () => (
    <Dialog open={diffViewOpen} onOpenChange={setDiffViewOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Version Comparison & Diff Viewer</DialogTitle>
          <DialogDescription>
            Compare rule pack versions to see changes and impact analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Source Version</Label>
              <Select
                value={compareVersions.source}
                onValueChange={value =>
                  setCompareVersions({ ...compareVersions, source: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source version" />
                </SelectTrigger>
                <SelectContent>
                  {rulePacks?.data?.map((rp: RulePackVersion) => (
                    <SelectItem key={rp.id} value={rp.id}>
                      {rp.packName} v{rp.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Version</Label>
              <Select
                value={compareVersions.target}
                onValueChange={value =>
                  setCompareVersions({ ...compareVersions, target: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target version" />
                </SelectTrigger>
                <SelectContent>
                  {rulePacks?.data?.map((rp: RulePackVersion) => (
                    <SelectItem key={rp.id} value={rp.id}>
                      {rp.packName} v{rp.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {comparison?.data && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {comparison.data.differences.added.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Added</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {comparison.data.differences.modified.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Modified</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {comparison.data.differences.removed.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Removed</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Risk Level:</span>
                      <Badge
                        className={
                          comparison.data.summary.riskLevel === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : comparison.data.summary.riskLevel === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : comparison.data.summary.riskLevel === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                        }
                      >
                        {comparison.data.summary.riskLevel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {comparison.data.summary.impactAssessment}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {comparison.data.differences.added.map(
                    (change: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-green-50 rounded border-l-4 border-green-400"
                      >
                        <p className="text-sm font-medium text-green-800">
                          + Added: {change.data.name}
                        </p>
                        <p className="text-xs text-green-600">
                          {change.data.description}
                        </p>
                      </div>
                    )
                  )}

                  {comparison.data.differences.modified.map(
                    (change: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-blue-50 rounded border-l-4 border-blue-400"
                      >
                        <p className="text-sm font-medium text-blue-800">
                          ~ Modified: {change.after.name}
                        </p>
                        <p className="text-xs text-blue-600">
                          {change.after.description}
                        </p>
                      </div>
                    )
                  )}

                  {comparison.data.differences.removed.map(
                    (change: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-red-50 rounded border-l-4 border-red-400"
                      >
                        <p className="text-sm font-medium text-red-800">
                          - Removed: {change.data.name}
                        </p>
                        <p className="text-xs text-red-600">
                          {change.data.description}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Change Log & Legal Watch
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Versioned rule packs with legal compliance monitoring and tenant
            deployment
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            Create Rule Pack
          </Button>
        </div>
      </div>

      <DashboardOverview />

      <Tabs defaultValue="rule-packs" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rule-packs">Rule Packs</TabsTrigger>
          <TabsTrigger value="legal-alerts">Legal Alerts</TabsTrigger>
          <TabsTrigger value="legal-watches">Legal Watches</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
        </TabsList>

        <TabsContent value="rule-packs" className="space-y-6">
          <RulePackVersions />
        </TabsContent>

        <TabsContent value="legal-alerts" className="space-y-6">
          <LegalAlerts />
        </TabsContent>

        <TabsContent value="legal-watches" className="space-y-6">
          <LegalWatches />
        </TabsContent>

        <TabsContent value="deployments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Deployments</CardTitle>
              <CardDescription>
                Manage rule pack deployments across all tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4" />
                <p>Deployment history and management tools</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeploymentDialog />
      <ComparisonDialog />
    </div>
  );
}
