/**
 * In-App Status Page Component
 * Displays system status within the main application for authenticated users
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, XCircle, Clock, Wrench, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SystemStatus {
  overall: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  components: ComponentStatusInfo[];
  activeIncidents: StatusPageIncident[];
  upcomingMaintenance: StatusPageMaintenance[];
  recentIncidents: StatusPageIncident[];
  uptimeStats: UptimeStats;
}

interface ComponentStatusInfo {
  id: string;
  name: string;
  description?: string;
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  category: string;
  lastUpdated: string;
  uptimePercentage?: number;
}

interface StatusPageIncident {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  affectedComponents: string[];
  updates?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface StatusPageMaintenance {
  id: string;
  title: string;
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  affectedComponents: string[];
  createdAt: string;
  updatedAt: string;
}

interface UptimeStats {
  overall: number;
  last24h: number;
  last7d: number;
  last30d: number;
  last90d: number;
}

const statusIcons = {
  operational: <CheckCircle className="h-4 w-4 text-green-600" />,
  degraded_performance: <AlertCircle className="h-4 w-4 text-yellow-600" />,
  partial_outage: <AlertCircle className="h-4 w-4 text-orange-600" />,
  major_outage: <XCircle className="h-4 w-4 text-red-600" />,
  under_maintenance: <Wrench className="h-4 w-4 text-blue-600" />,
};

const statusLabels = {
  operational: 'Operational',
  degraded_performance: 'Degraded Performance',
  partial_outage: 'Partial Outage',
  major_outage: 'Major Outage',
  under_maintenance: 'Under Maintenance',
};

const statusColors = {
  operational: 'bg-green-100 text-green-800',
  degraded_performance: 'bg-yellow-100 text-yellow-800',
  partial_outage: 'bg-orange-100 text-orange-800',
  major_outage: 'bg-red-100 text-red-800',
  under_maintenance: 'bg-blue-100 text-blue-800',
};

const severityColors = {
  minor: 'bg-yellow-100 text-yellow-800',
  major: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function InAppStatusPage() {
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: '',
    affectedComponents: [] as string[],
  });
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const { toast } = useToast();

  const { data: status, isLoading, refetch } = useQuery<SystemStatus>({
    queryKey: ['/api/status/status'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleCreateIncident = async () => {
    try {
      if (!newIncident.title || !newIncident.description || !newIncident.severity) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      await apiRequest('POST', '/api/status/incidents', newIncident);
      
      toast({
        title: "Success",
        description: "Incident created successfully",
      });

      setNewIncident({ title: '', description: '', severity: '', affectedComponents: [] });
      setShowIncidentDialog(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create incident",
        variant: "destructive",
      });
    }
  };

  const handleUpdateComponentStatus = async (componentId: string, newStatus: string, message?: string) => {
    try {
      await apiRequest('PUT', `/api/status/components/${componentId}/status`, {
        status: newStatus,
        message,
      });
      
      toast({
        title: "Success",
        description: "Component status updated successfully",
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update component status",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const groupComponentsByCategory = (components: ComponentStatusInfo[]) => {
    const categories: Record<string, ComponentStatusInfo[]> = {};
    components.forEach(comp => {
      if (!categories[comp.category]) {
        categories[comp.category] = [];
      }
      categories[comp.category].push(comp);
    });
    return categories;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="h-32 bg-gray-300 rounded mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load system status. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const categorizedComponents = groupComponentsByCategory(status.components);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Status</h1>
          <p className="text-gray-600">Monitor and manage system status</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Incident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
                <DialogDescription>
                  Report a new incident affecting system components
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newIncident.title}
                    onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                    placeholder="Brief description of the incident"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newIncident.description}
                    onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                    placeholder="Detailed description of the incident and its impact"
                  />
                </div>
                <div>
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={newIncident.severity} onValueChange={(value) => setNewIncident({ ...newIncident, severity: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowIncidentDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateIncident}>
                    Create Incident
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            {statusIcons[status.overall]}
            <div>
              <CardTitle>{statusLabels[status.overall]}</CardTitle>
              <CardDescription>
                Overall system health: {status.uptimeStats.overall}% uptime
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold">{status.uptimeStats.last24h}%</div>
              <div className="text-sm text-gray-600">Last 24 hours</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{status.uptimeStats.last7d}%</div>
              <div className="text-sm text-gray-600">Last 7 days</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{status.uptimeStats.last30d}%</div>
              <div className="text-sm text-gray-600">Last 30 days</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{status.uptimeStats.last90d}%</div>
              <div className="text-sm text-gray-600">Last 90 days</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Incidents */}
      {status.activeIncidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span>Active Incidents ({status.activeIncidents.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.activeIncidents.map((incident) => (
                <div key={incident.id} className="border-l-4 border-red-500 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{incident.title}</h3>
                    <div className="flex space-x-2">
                      <Badge className={severityColors[incident.severity]}>{incident.severity}</Badge>
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{incident.description}</p>
                  <p className="text-xs text-gray-400">
                    Started: {formatDate(incident.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Components */}
      <Card>
        <CardHeader>
          <CardTitle>System Components</CardTitle>
          <CardDescription>
            Current status of all system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.entries(categorizedComponents).map(([category, components]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold mb-3 capitalize">
                {category.replace('_', ' ')} Systems
              </h3>
              <div className="space-y-2">
                {components.map((component) => (
                  <div key={component.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {statusIcons[component.status]}
                      <div>
                        <div className="font-medium">{component.name}</div>
                        {component.description && (
                          <div className="text-sm text-gray-600">{component.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={statusColors[component.status]}>
                        {statusLabels[component.status]}
                      </Badge>
                      <Select
                        value={component.status}
                        onValueChange={(value) => handleUpdateComponentStatus(component.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operational">Operational</SelectItem>
                          <SelectItem value="degraded_performance">Degraded</SelectItem>
                          <SelectItem value="partial_outage">Partial Outage</SelectItem>
                          <SelectItem value="major_outage">Major Outage</SelectItem>
                          <SelectItem value="under_maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
              {category !== Object.keys(categorizedComponents)[Object.keys(categorizedComponents).length - 1] && (
                <Separator className="mt-6" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {status.recentIncidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Recent incidents and status changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status.recentIncidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{incident.title}</div>
                    <div className="text-sm text-gray-600">
                      {incident.status === 'resolved' ? 'Resolved' : 'Active'} • {formatDate(incident.createdAt)}
                    </div>
                  </div>
                  <Badge className={severityColors[incident.severity]}>{incident.severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}