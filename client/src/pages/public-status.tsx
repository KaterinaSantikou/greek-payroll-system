/**
 * Public Status Page
 * Accessible without authentication - shows system status to external users
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, XCircle, Clock, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  operational: <CheckCircle className="h-5 w-5 text-green-600" />,
  degraded_performance: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  partial_outage: <AlertCircle className="h-5 w-5 text-orange-600" />,
  major_outage: <XCircle className="h-5 w-5 text-red-600" />,
  under_maintenance: <Wrench className="h-5 w-5 text-blue-600" />,
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

export default function PublicStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status/public/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subscriberEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setSubscribing(true);
    
    try {
      const response = await fetch('/api/status/public/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: subscriberEmail }),
      });

      if (response.ok) {
        toast({
          title: "Subscribed!",
          description: "You'll receive email notifications about status updates.",
        });
        setSubscriberEmail('');
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe to notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  const getOverallMessage = (overallStatus: string) => {
    switch (overallStatus) {
      case 'operational':
        return 'All systems are operational';
      case 'degraded_performance':
        return 'Some systems are experiencing degraded performance';
      case 'partial_outage':
        return 'Some systems are experiencing partial outages';
      case 'major_outage':
        return 'We are experiencing major service disruptions';
      case 'under_maintenance':
        return 'Systems are under scheduled maintenance';
      default:
        return 'System status unknown';
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6"></div>
            <div className="h-32 bg-gray-300 rounded mb-6"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load system status. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const categorizedComponents = groupComponentsByCategory(status.components);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PayrollSync Status</h1>
          <p className="text-gray-600">Current system status and uptime information</p>
        </div>

        {/* Overall Status */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center space-x-3">
              {statusIcons[status.overall]}
              <div>
                <CardTitle className="text-2xl">
                  {statusLabels[status.overall]}
                </CardTitle>
                <CardDescription>
                  {getOverallMessage(status.overall)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{status.uptimeStats.overall}%</div>
                <div className="text-sm text-gray-600">Overall Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{status.uptimeStats.last24h}%</div>
                <div className="text-sm text-gray-600">Last 24 hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{status.uptimeStats.last7d}%</div>
                <div className="text-sm text-gray-600">Last 7 days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{status.uptimeStats.last30d}%</div>
                <div className="text-sm text-gray-600">Last 30 days</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Incidents */}
        {status.activeIncidents.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span>Active Incidents</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status.activeIncidents.map((incident) => (
                <div key={incident.id} className="border-l-4 border-red-500 pl-4 mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{incident.title}</h3>
                    <div className="flex space-x-2">
                      <Badge className={severityColors[incident.severity]}>{incident.severity}</Badge>
                      <Badge variant="outline">{incident.status}</Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-2">{incident.description}</p>
                  {incident.updates && (
                    <p className="text-sm text-gray-500">{incident.updates}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Started: {formatDate(incident.createdAt)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Maintenance */}
        {status.upcomingMaintenance.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Upcoming Maintenance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status.upcomingMaintenance.map((maintenance) => (
                <div key={maintenance.id} className="border-l-4 border-blue-500 pl-4 mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{maintenance.title}</h3>
                    <Badge className="bg-blue-100 text-blue-800">{maintenance.status}</Badge>
                  </div>
                  <p className="text-gray-600 mb-2">{maintenance.description}</p>
                  <p className="text-sm text-gray-500">
                    Scheduled: {formatDate(maintenance.scheduledStart)} - {formatDate(maintenance.scheduledEnd)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* System Components */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>System Components</CardTitle>
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
                      <div className="text-right">
                        <Badge className={statusColors[component.status]}>
                          {statusLabels[component.status]}
                        </Badge>
                        {component.uptimePercentage && (
                          <div className="text-xs text-gray-500 mt-1">
                            {component.uptimePercentage}% uptime
                          </div>
                        )}
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

        {/* Recent Incidents */}
        {status.recentIncidents.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Recent Incidents (Last 30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {status.recentIncidents.map((incident) => (
                  <div key={incident.id} className="border-l-4 border-gray-300 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{incident.title}</h3>
                      <div className="flex space-x-2">
                        <Badge className={severityColors[incident.severity]}>{incident.severity}</Badge>
                        <Badge variant={incident.status === 'resolved' ? 'default' : 'destructive'}>
                          {incident.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-2">{incident.description}</p>
                    <div className="text-xs text-gray-400">
                      {formatDate(incident.createdAt)} 
                      {incident.resolvedAt && ` - Resolved: ${formatDate(incident.resolvedAt)}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Subscribe to Updates</CardTitle>
            <CardDescription>
              Get notified via email when system status changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubscribe} className="flex gap-4">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={subscriberEmail}
                onChange={(e) => setSubscriberEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={subscribing}>
                {subscribing ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>This page updates automatically every 30 seconds</p>
          <p>Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}