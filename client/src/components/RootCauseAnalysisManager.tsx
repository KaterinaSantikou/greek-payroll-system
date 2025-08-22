/**
 * Root Cause Analysis Manager Component
 * Provides comprehensive interface for managing RCA processes and methodologies
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Edit, 
  Download,
  BarChart3,
  Target,
  Calendar,
  FileText,
  PlayCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface RCATemplate {
  methodology: string;
  name: string;
  description: string;
  estimatedDuration: number;
  requiredRoles: string[];
  artifacts: string[];
  sections: RCASection[];
}

interface RCASection {
  id: string;
  title: string;
  description: string;
  required: boolean;
  order: number;
  fields: RCAField[];
}

interface RCAField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    minLength?: number;
    maxLength?: number;
  };
}

interface RCAAnalysis {
  id: string;
  incidentId?: string;
  methodology: string;
  status: string;
  facilitator: string;
  participants: string[];
  severity: string;
  title: string;
  description?: string;
  estimatedDuration: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface RCAFinding {
  id: string;
  analysisId: string;
  category: string;
  finding: string;
  evidence: string;
  severity: string;
  isRootCause: boolean;
  addedBy: string;
  createdAt: string;
}

interface RCAActionItem {
  id: string;
  analysisId: string;
  title: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
  dueDate?: string;
  completedAt?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

interface RCAResult {
  analysis: RCAAnalysis;
  findings: RCAFinding[];
  actionItems: RCAActionItem[];
  effectiveness: {
    completeness: number;
    quality: number;
    actionability: number;
    overall: number;
  };
}

const METHODOLOGY_LABELS = {
  five_whys: '5 Whys Analysis',
  fishbone_ishikawa: 'Fishbone (Ishikawa) Diagram',
  timeline_analysis: 'Timeline Analysis',
  fault_tree_analysis: 'Fault Tree Analysis',
  barrier_analysis: 'Barrier Analysis',
  change_analysis: 'Change Analysis',
  human_factors_analysis: 'Human Factors Analysis'
};

const STATUS_COLORS = {
  initiated: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  review: 'bg-orange-100 text-orange-800 border-orange-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  archived: 'bg-gray-100 text-gray-800 border-gray-300'
};

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300'
};

export function RootCauseAnalysisManager() {
  const [activeTab, setActiveTab] = useState('analyses');
  const [templates, setTemplates] = useState<RCATemplate[]>([]);
  const [analyses, setAnalyses] = useState<RCAAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<RCAResult | null>(null);
  const [isCreatingAnalysis, setIsCreatingAnalysis] = useState(false);
  const [newAnalysis, setNewAnalysis] = useState({
    methodology: '',
    title: '',
    description: '',
    severity: 'medium',
    participants: ['']
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: {} as Record<string, number>,
    byMethodology: {} as Record<string, number>,
    completionRate: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
    loadAnalyses();
    loadStatistics();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiRequest('GET', '/api/rca/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load RCA templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RCA templates',
        variant: 'destructive'
      });
    }
  };

  const loadAnalyses = async () => {
    try {
      const response = await apiRequest('GET', '/api/rca/analyses');
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.analyses || []);
      }
    } catch (error) {
      console.error('Failed to load RCA analyses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RCA analyses',
        variant: 'destructive'
      });
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await apiRequest('GET', '/api/rca/statistics');
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics || {});
      }
    } catch (error) {
      console.error('Failed to load RCA statistics:', error);
    }
  };

  const loadAnalysisDetails = async (analysisId: string) => {
    try {
      const response = await apiRequest('GET', `/api/rca/analyses/${analysisId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedAnalysis(data);
      }
    } catch (error) {
      console.error('Failed to load RCA details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RCA details',
        variant: 'destructive'
      });
    }
  };

  const createAnalysis = async () => {
    if (!newAnalysis.methodology || !newAnalysis.title) {
      toast({
        title: 'Validation Error',
        description: 'Please select methodology and provide title',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingAnalysis(true);
    try {
      const response = await apiRequest('POST', '/api/rca/analyses', {
        methodology: newAnalysis.methodology,
        title: newAnalysis.title,
        description: newAnalysis.description,
        severity: newAnalysis.severity,
        participants: newAnalysis.participants.filter(p => p.trim())
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Success',
          description: 'RCA analysis created successfully'
        });
        setNewAnalysis({
          methodology: '',
          title: '',
          description: '',
          severity: 'medium',
          participants: ['']
        });
        loadAnalyses();
        loadStatistics();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Creation Failed',
          description: errorData.error || 'Failed to create RCA analysis',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create RCA:', error);
      toast({
        title: 'Error',
        description: 'Failed to create RCA analysis',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingAnalysis(false);
    }
  };

  const updateAnalysisStatus = async (analysisId: string, status: string) => {
    try {
      const response = await apiRequest('PUT', `/api/rca/analyses/${analysisId}/status`, {
        status
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Analysis status updated successfully'
        });
        loadAnalyses();
        if (selectedAnalysis?.analysis.id === analysisId) {
          loadAnalysisDetails(analysisId);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update analysis status',
        variant: 'destructive'
      });
    }
  };

  const addParticipant = () => {
    setNewAnalysis(prev => ({
      ...prev,
      participants: [...prev.participants, '']
    }));
  };

  const updateParticipant = (index: number, value: string) => {
    setNewAnalysis(prev => ({
      ...prev,
      participants: prev.participants.map((p, i) => i === index ? value : p)
    }));
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Root Cause Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Formal RCA framework with structured methodologies and processes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <BarChart3 className="h-3 w-3" />
            <span>{statistics.total} Analyses</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Target className="h-3 w-3" />
            <span>{Math.round(statistics.completionRate)}% Complete</span>
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="analyses" className="flex items-center space-x-1">
            <FileText className="h-4 w-4" />
            <span>Analyses</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-1">
            <PlayCircle className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>Create New</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyses" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {analyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3" onClick={() => loadAnalysisDetails(analysis.id)}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{analysis.title}</CardTitle>
                      <CardDescription>
                        {METHODOLOGY_LABELS[analysis.methodology as keyof typeof METHODOLOGY_LABELS]}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={STATUS_COLORS[analysis.status as keyof typeof STATUS_COLORS]}>
                        {analysis.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={SEVERITY_COLORS[analysis.severity as keyof typeof SEVERITY_COLORS]}>
                        {analysis.severity}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{analysis.participants.length} participants</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(analysis.estimatedDuration)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {analysis.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateAnalysisStatus(analysis.id, 'completed');
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => loadAnalysisDetails(analysis.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.methodology} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PlayCircle className="h-5 w-5" />
                    <span>{template.name}</span>
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDuration(template.estimatedDuration)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{template.requiredRoles.length} roles</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Required Roles</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.requiredRoles.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Deliverables</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.artifacts.map((artifact) => (
                        <Badge key={artifact} variant="secondary" className="text-xs">
                          {artifact.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => {
                      setNewAnalysis(prev => ({ ...prev, methodology: template.methodology }));
                      setActiveTab('create');
                    }}
                  >
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New RCA Analysis</CardTitle>
              <CardDescription>
                Start a formal root cause analysis using structured methodologies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="methodology">Methodology *</Label>
                  <Select 
                    value={newAnalysis.methodology} 
                    onValueChange={(value) => setNewAnalysis(prev => ({ ...prev, methodology: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select RCA methodology" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.methodology} value={template.methodology}>
                          <div className="flex items-center space-x-2">
                            <span>{template.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {formatDuration(template.estimatedDuration)}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">Severity *</Label>
                  <Select 
                    value={newAnalysis.severity} 
                    onValueChange={(value) => setNewAnalysis(prev => ({ ...prev, severity: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Analysis Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the problem being analyzed"
                  value={newAnalysis.title}
                  onChange={(e) => setNewAnalysis(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Problem Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of the incident or problem"
                  value={newAnalysis.description}
                  onChange={(e) => setNewAnalysis(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Participants *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addParticipant}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Participant
                  </Button>
                </div>
                <div className="space-y-2">
                  {newAnalysis.participants.map((participant, index) => (
                    <Input
                      key={index}
                      placeholder="Participant name or email"
                      value={participant}
                      onChange={(e) => updateParticipant(index, e.target.value)}
                    />
                  ))}
                </div>
              </div>

              <Button 
                onClick={createAnalysis} 
                disabled={isCreatingAnalysis}
                className="w-full"
              >
                {isCreatingAnalysis ? 'Creating...' : 'Create RCA Analysis'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Analysis Details Modal/Panel */}
      {selectedAnalysis && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedAnalysis.analysis.title}</CardTitle>
                <CardDescription>
                  {METHODOLOGY_LABELS[selectedAnalysis.analysis.methodology as keyof typeof METHODOLOGY_LABELS]}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={STATUS_COLORS[selectedAnalysis.analysis.status as keyof typeof STATUS_COLORS]}>
                  {selectedAnalysis.analysis.status.replace('_', ' ')}
                </Badge>
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Effectiveness Metrics */}
            <div>
              <Label className="text-sm font-medium">Effectiveness Metrics</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Completeness</Label>
                  <Progress value={selectedAnalysis.effectiveness.completeness} className="h-2" />
                  <span className="text-xs">{Math.round(selectedAnalysis.effectiveness.completeness)}%</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quality</Label>
                  <Progress value={selectedAnalysis.effectiveness.quality} className="h-2" />
                  <span className="text-xs">{Math.round(selectedAnalysis.effectiveness.quality)}%</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Actionability</Label>
                  <Progress value={selectedAnalysis.effectiveness.actionability} className="h-2" />
                  <span className="text-xs">{Math.round(selectedAnalysis.effectiveness.actionability)}%</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Overall</Label>
                  <Progress value={selectedAnalysis.effectiveness.overall} className="h-2" />
                  <span className="text-xs">{Math.round(selectedAnalysis.effectiveness.overall)}%</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Findings */}
            <div>
              <Label className="text-sm font-medium">Findings ({selectedAnalysis.findings.length})</Label>
              <div className="space-y-2 mt-2">
                {selectedAnalysis.findings.map((finding) => (
                  <div key={finding.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{finding.category}</Badge>
                          <Badge className={SEVERITY_COLORS[finding.severity as keyof typeof SEVERITY_COLORS]}>
                            {finding.severity}
                          </Badge>
                          {finding.isRootCause && (
                            <Badge variant="destructive" className="text-xs">Root Cause</Badge>
                          )}
                        </div>
                        <p className="text-sm">{finding.finding}</p>
                        {finding.evidence && (
                          <p className="text-xs text-muted-foreground">Evidence: {finding.evidence}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Action Items */}
            <div>
              <Label className="text-sm font-medium">Action Items ({selectedAnalysis.actionItems.length})</Label>
              <div className="space-y-2 mt-2">
                {selectedAnalysis.actionItems.map((actionItem) => (
                  <div key={actionItem.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{actionItem.priority}</Badge>
                          <Badge className={STATUS_COLORS[actionItem.status as keyof typeof STATUS_COLORS]}>
                            {actionItem.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{actionItem.title}</p>
                        <p className="text-sm text-muted-foreground">{actionItem.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Assignee: {actionItem.assignee}</span>
                          {actionItem.dueDate && (
                            <span>Due: {new Date(actionItem.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
export default RootCauseAnalysisManager;
