import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  Play,
  Pause,
  Upload,
  TrendingUp,
  Users,
  Euro
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface PendingIngestion {
  documentId: string;
  documentName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
  sector: string;
}

interface ActiveRollout {
  strategyId: string;
  cbaVersionId: string;
  currentPhase: string;
  progress: number;
  targetProperties: number;
  completedProperties: number;
}

interface VersionHistory {
  versionId: string;
  effectiveDate: string;
  status: string;
  propertiesUsing: number;
}

export default function CBAGovernanceDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch governance dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/cba-governance/dashboard'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Mock data for demonstration
  const mockData = {
    pending_ingestions: [
      {
        documentId: "CBA-2025-001",
        documentName: "Tourism Hotels CBA 2025 Update",
        uploadedBy: "legal@company.com",
        uploadedAt: "2025-01-15T10:30:00Z",
        status: "pending_validation",
        sector: "tourism"
      }
    ] as PendingIngestion[],
    active_rollouts: [
      {
        strategyId: "ROLLOUT-1234567890",
        cbaVersionId: "tourism-v2025.2",
        currentPhase: "pilot",
        progress: 60,
        targetProperties: 3,
        completedProperties: 1
      }
    ] as ActiveRollout[],
    version_history: [
      {
        versionId: "tourism-v2025.1",
        effectiveDate: "2025-01-01",
        status: "active",
        propertiesUsing: 5
      },
      {
        versionId: "tourism-v2024.3",
        effectiveDate: "2024-09-01",
        status: "deprecated",
        propertiesUsing: 0
      }
    ] as VersionHistory[],
    compliance_status: {
      compliant_properties: 5,
      total_properties: 5,
      last_audit: "2025-01-10T00:00:00Z"
    }
  };

  const displayData = dashboardData || mockData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CBA Governance Dashboard</h1>
          <p className="text-gray-600">Manage CBA document ingestion and version rollouts</p>
        </div>
        <div className="flex gap-2">
          <Button className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Ingest New CBA
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Create Version
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Ingestions</p>
                <p className="text-2xl font-bold">{displayData.pending_ingestions.length}</p>
              </div>
              <FileText className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rollouts</p>
                <p className="text-2xl font-bold">{displayData.active_rollouts.length}</p>
              </div>
              <GitBranch className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-2xl font-bold">
                  {Math.round((displayData.compliance_status.compliant_properties / displayData.compliance_status.total_properties) * 100)}%
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Versions</p>
                <p className="text-2xl font-bold">
                  {displayData.version_history.filter(v => v.status === 'active').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ingestions">Ingestions</TabsTrigger>
          <TabsTrigger value="rollouts">Rollouts</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Phase 2 (Pilot) Started</p>
                    <p className="text-xs text-gray-600">tourism-v2025.2 rollout</p>
                  </div>
                  <Badge variant="secondary">2h ago</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New CBA Document Ingested</p>
                    <p className="text-xs text-gray-600">Tourism Hotels CBA 2025 Update</p>
                  </div>
                  <Badge variant="secondary">5h ago</Badge>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sandbox Validation Complete</p>
                    <p className="text-xs text-gray-600">All calculations verified</p>
                  </div>
                  <Badge variant="secondary">1d ago</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Impact Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Current Impact Summary
                </CardTitle>
                <CardDescription>
                  Estimated impact of active rollouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">127</p>
                    <p className="text-sm text-gray-600">Affected Employees</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">€6,350</p>
                    <p className="text-sm text-gray-600">Monthly Cost Δ</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Wage Increases</span>
                    <span>€4,445 (70%)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>New Allowances</span>
                    <span>€1,905 (30%)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ingestions Tab */}
        <TabsContent value="ingestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending CBA Document Ingestions</CardTitle>
              <CardDescription>
                Documents awaiting validation and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayData.pending_ingestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending ingestions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayData.pending_ingestions.map((ingestion) => (
                    <div key={ingestion.documentId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                          <h3 className="font-semibold">{ingestion.documentName}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Uploaded by {ingestion.uploadedBy}</span>
                            <span>{new Date(ingestion.uploadedAt).toLocaleDateString()}</span>
                            <Badge variant="outline">{ingestion.sector}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={ingestion.status === 'pending_validation' ? 'secondary' : 'default'}
                        >
                          {ingestion.status.replace('_', ' ')}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rollouts Tab */}
        <TabsContent value="rollouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Version Rollouts</CardTitle>
              <CardDescription>
                Monitor ongoing CBA version deployments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayData.active_rollouts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active rollouts</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {displayData.active_rollouts.map((rollout) => (
                    <div key={rollout.strategyId} className="p-6 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{rollout.cbaVersionId}</h3>
                          <p className="text-sm text-gray-600">Strategy ID: {rollout.strategyId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={rollout.currentPhase === 'pilot' ? 'default' : 'secondary'}
                          >
                            {rollout.currentPhase}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            Details
                          </Button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Rollout Progress</span>
                          <span>{rollout.progress}% Complete</span>
                        </div>
                        <Progress value={rollout.progress} className="h-2" />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{rollout.completedProperties} of {rollout.targetProperties} properties</span>
                          <span>Current Phase: {rollout.currentPhase}</span>
                        </div>
                      </div>

                      {/* Phase Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline">
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                        <Button size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Continue to Next Phase
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                View all CBA pack versions and their deployment status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayData.version_history.map((version) => (
                  <div key={version.versionId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        version.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <h3 className="font-semibold">{version.versionId}</h3>
                        <p className="text-sm text-gray-600">
                          Effective: {new Date(version.effectiveDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {version.propertiesUsing} Properties
                        </p>
                        <Badge 
                          variant={version.status === 'active' ? 'default' : 'secondary'}
                        >
                          {version.status}
                        </Badge>
                      </div>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}