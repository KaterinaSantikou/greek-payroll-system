/**
 * Incident Ownership Manager Component
 * Handles incident assignment when no named owners or escalation matrix exists
 */

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  UserPlus,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  UserX,
  ArrowUp,
  Shield,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ResponderCapabilities {
  skills: string[];
  maxConcurrentIncidents: number;
  availabilityHours: {
    timezone: string;
    schedule: {
      [day: string]: { start: string; end: string } | null;
    };
  };
  escalationLevel: number;
  canEscalateTo: string[];
}

interface Responder {
  id: string;
  name: string;
  email: string;
  responderType: string;
  isAvailable: boolean;
  statusReason?: string;
  capabilities?: ResponderCapabilities;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Assignment {
  id: string;
  incidentId: string;
  assigneeId: string;
  assigneeName: string;
  assigneeType: string;
  assignmentType: string;
  assignedAt: string;
  assignedBy: string;
  expectedResponseTime: number;
  escalationLevel: number;
  notes?: string;
}

interface AssignmentStatistics {
  totalAssignments: number;
  autoAssignments: number;
  fallbackAssignments: number;
  escalations: number;
  averageResponseTime: number;
}

const RESPONDER_TYPE_COLORS = {
  engineer: 'bg-blue-100 text-blue-800 border-blue-300',
  manager: 'bg-purple-100 text-purple-800 border-purple-300',
  on_call: 'bg-green-100 text-green-800 border-green-300',
  specialist: 'bg-orange-100 text-orange-800 border-orange-300',
};

const ASSIGNMENT_TYPE_COLORS = {
  auto_assigned: 'bg-blue-100 text-blue-800 border-blue-300',
  escalated: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  fallback_assigned: 'bg-red-100 text-red-800 border-red-300',
  manual: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function IncidentOwnershipManager() {
  const [activeTab, setActiveTab] = useState('overview');
  const [responders, setResponders] = useState<Responder[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statistics, setStatistics] = useState<AssignmentStatistics>({
    totalAssignments: 0,
    autoAssignments: 0,
    fallbackAssignments: 0,
    escalations: 0,
    averageResponseTime: 0,
  });
  const [newResponder, setNewResponder] = useState({
    name: '',
    email: '',
    responderType: 'engineer',
    skills: [''],
    escalationLevel: 1,
    timezone: 'UTC',
  });
  const [testIncident, setTestIncident] = useState({
    severity: 'major',
    type: 'system_outage',
    requiredSkills: [''],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadStatistics();
    // Note: responders and assignments would be loaded from API in real implementation
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await apiRequest(
        'GET',
        '/api/incident-ownership/statistics'
      );
      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const registerResponder = async () => {
    if (!newResponder.name || !newResponder.email) {
      toast({
        title: 'Validation Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await apiRequest(
        'POST',
        '/api/incident-ownership/responders',
        {
          name: newResponder.name,
          email: newResponder.email,
          responderType: newResponder.responderType,
          capabilities: {
            skills: newResponder.skills.filter(skill => skill.trim()),
            maxConcurrentIncidents: 3,
            availabilityHours: {
              timezone: newResponder.timezone,
              schedule: {
                monday: { start: '09:00', end: '17:00' },
                tuesday: { start: '09:00', end: '17:00' },
                wednesday: { start: '09:00', end: '17:00' },
                thursday: { start: '09:00', end: '17:00' },
                friday: { start: '09:00', end: '17:00' },
                saturday: null,
                sunday: null,
              },
            },
            escalationLevel: newResponder.escalationLevel,
            canEscalateTo: [],
          },
        }
      );

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Responder registered successfully',
        });
        setNewResponder({
          name: '',
          email: '',
          responderType: 'engineer',
          skills: [''],
          escalationLevel: 1,
          timezone: 'UTC',
        });
        loadStatistics();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Registration Failed',
          description: errorData.error || 'Failed to register responder',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to register responder:', error);
      toast({
        title: 'Error',
        description: 'Failed to register responder',
        variant: 'destructive',
      });
    }
  };

  const testAutoAssignment = async () => {
    try {
      const incidentId = `test_${Date.now()}`;

      const response = await apiRequest(
        'POST',
        `/api/incident-ownership/assign/${incidentId}`,
        {
          severity: testIncident.severity,
          type: testIncident.type,
          requiredSkills: testIncident.requiredSkills.filter(skill =>
            skill.trim()
          ),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Assignment Test Complete',
          description: data.message,
          variant:
            data.assignment.assignmentType === 'fallback_assigned'
              ? 'destructive'
              : 'default',
        });
        loadStatistics();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Assignment Failed',
          description: errorData.error || 'Failed to assign incident',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to test assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to test auto-assignment',
        variant: 'destructive',
      });
    }
  };

  const getFallbackActions = async () => {
    try {
      const incidentId = `fallback_test_${Date.now()}`;

      const response = await apiRequest(
        'GET',
        `/api/incident-ownership/fallback-actions/${incidentId}`
      );

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Fallback Actions Retrieved',
          description: `${Object.keys(data.fallbackActions).length} action categories available`,
        });
      }
    } catch (error) {
      console.error('Failed to get fallback actions:', error);
      toast({
        title: 'Error',
        description: 'Failed to retrieve fallback actions',
        variant: 'destructive',
      });
    }
  };

  const addSkill = () => {
    setNewResponder(prev => ({
      ...prev,
      skills: [...prev.skills, ''],
    }));
  };

  const updateSkill = (index: number, value: string) => {
    setNewResponder(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => (i === index ? value : skill)),
    }));
  };

  const addTestSkill = () => {
    setTestIncident(prev => ({
      ...prev,
      requiredSkills: [...prev.requiredSkills, ''],
    }));
  };

  const updateTestSkill = (index: number, value: string) => {
    setTestIncident(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.map((skill, i) =>
        i === index ? value : skill
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            Incident Ownership Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Handle incident assignment when no named owners or escalation matrix
            exists
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Target className="h-3 w-3" />
            <span>{statistics.totalAssignments} Assignments</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Activity className="h-3 w-3" />
            <span>
              {Math.round(statistics.averageResponseTime)}m Avg Response
            </span>
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center space-x-1">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="responders"
            className="flex items-center space-x-1"
          >
            <Users className="h-4 w-4" />
            <span>Responders</span>
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center space-x-1">
            <Zap className="h-4 w-4" />
            <span>Testing</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Assignments
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.totalAssignments}
                </div>
                <p className="text-xs text-muted-foreground">
                  All incident assignments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Auto Assignments
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.autoAssignments}
                </div>
                <p className="text-xs text-muted-foreground">
                  {statistics.totalAssignments > 0
                    ? Math.round(
                        (statistics.autoAssignments /
                          statistics.totalAssignments) *
                          100
                      )
                    : 0}
                  % of total assignments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Fallback Assignments
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.fallbackAssignments}
                </div>
                <p className="text-xs text-muted-foreground">
                  When no responders available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Escalations
                </CardTitle>
                <ArrowUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.escalations}
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatic escalations
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Current state of incident ownership automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>No Named Incident Owners:</strong> System is operating
                  in fallback mode. All incidents will be automatically assigned
                  to available responders or fallback pool.
                </AlertDescription>
              </Alert>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>No Escalation Matrix:</strong> Using automatic
                  escalation based on responder levels and availability.
                  Fallback procedures activated for critical situations.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Assignment Strategy
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline">Availability Priority</Badge>
                    <Badge variant="outline">Workload Balancing</Badge>
                    <Badge variant="outline">Skill Matching</Badge>
                    <Badge variant="outline">Auto Escalation</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Fallback Actions
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary">Notify All Responders</Badge>
                    <Badge variant="secondary">Emergency Contacts</Badge>
                    <Badge variant="secondary">Crisis Procedures</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responders" className="space-y-4">
          {/* Register New Responder */}
          <Card>
            <CardHeader>
              <CardTitle>Register New Responder</CardTitle>
              <CardDescription>
                Add responders to the pool for automatic incident assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Responder name"
                    value={newResponder.name}
                    onChange={e =>
                      setNewResponder(prev => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="responder@company.com"
                    value={newResponder.email}
                    onChange={e =>
                      setNewResponder(prev => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responderType">Type</Label>
                  <Select
                    value={newResponder.responderType}
                    onValueChange={value =>
                      setNewResponder(prev => ({
                        ...prev,
                        responderType: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineer">Engineer</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="on_call">On-Call</SelectItem>
                      <SelectItem value="specialist">Specialist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="escalationLevel">Escalation Level</Label>
                  <Select
                    value={newResponder.escalationLevel.toString()}
                    onValueChange={value =>
                      setNewResponder(prev => ({
                        ...prev,
                        escalationLevel: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 - Junior</SelectItem>
                      <SelectItem value="2">Level 2 - Mid-level</SelectItem>
                      <SelectItem value="3">Level 3 - Senior</SelectItem>
                      <SelectItem value="4">Level 4 - Lead</SelectItem>
                      <SelectItem value="5">Level 5 - Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={newResponder.timezone}
                    onValueChange={value =>
                      setNewResponder(prev => ({ ...prev, timezone: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">
                        Eastern Time
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time
                      </SelectItem>
                      <SelectItem value="Europe/London">GMT</SelectItem>
                      <SelectItem value="Europe/Berlin">
                        Central European Time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Skills</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSkill}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add Skill
                  </Button>
                </div>
                <div className="space-y-2">
                  {newResponder.skills.map((skill, index) => (
                    <Input
                      key={index}
                      placeholder="e.g., incident_response, system_administration"
                      value={skill}
                      onChange={e => updateSkill(index, e.target.value)}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={registerResponder} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Register Responder
              </Button>
            </CardContent>
          </Card>

          {/* Current Responders (placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle>Current Responders</CardTitle>
              <CardDescription>
                Registered responders available for incident assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No responders registered yet</p>
                <p className="text-sm">
                  Register responders above to enable automatic assignment
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          {/* Test Auto-Assignment */}
          <Card>
            <CardHeader>
              <CardTitle>Test Auto-Assignment</CardTitle>
              <CardDescription>
                Simulate incident assignment to verify the system behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="severity">Incident Severity</Label>
                  <Select
                    value={testIncident.severity}
                    onValueChange={value =>
                      setTestIncident(prev => ({ ...prev, severity: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Incident Type</Label>
                  <Select
                    value={testIncident.type}
                    onValueChange={value =>
                      setTestIncident(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system_outage">
                        System Outage
                      </SelectItem>
                      <SelectItem value="performance_issue">
                        Performance Issue
                      </SelectItem>
                      <SelectItem value="security_incident">
                        Security Incident
                      </SelectItem>
                      <SelectItem value="data_issue">Data Issue</SelectItem>
                      <SelectItem value="network_problem">
                        Network Problem
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Required Skills</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTestSkill}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Add Skill
                  </Button>
                </div>
                <div className="space-y-2">
                  {testIncident.requiredSkills.map((skill, index) => (
                    <Input
                      key={index}
                      placeholder="e.g., database_administration, network_troubleshooting"
                      value={skill}
                      onChange={e => updateTestSkill(index, e.target.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={testAutoAssignment} className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  Test Auto-Assignment
                </Button>
                <Button
                  onClick={getFallbackActions}
                  variant="outline"
                  className="flex-1"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Get Fallback Actions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Behavior */}
          <Card>
            <CardHeader>
              <CardTitle>System Behavior</CardTitle>
              <CardDescription>
                How the system handles incidents without named owners
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">
                    Auto-Assignment Process
                  </h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Check responder availability</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>Match required skills</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span>Consider workload balance</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span>Assign to best match</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Escalation Process</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <span>Timeout triggers escalation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span>Find higher-level responders</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full" />
                      <span>Fallback to emergency contacts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full" />
                      <span>Activate crisis procedures</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default IncidentOwnershipManager;
