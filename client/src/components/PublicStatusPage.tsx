/**
 * Public Status Page Component
 * Real-time system health indicators accessible without authentication
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  Server,
  Database,
  Cloud,
  Shield,
  Wifi,
  Globe,
} from 'lucide-react';

interface SystemComponent {
  id: string;
  name: string;
  description: string;
  status:
    | 'operational'
    | 'degraded_performance'
    | 'partial_outage'
    | 'major_outage';
  lastUpdated: string;
  uptime: number;
  responseTime: number;
  icon: any;
}

interface HistoricalIncident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'minor' | 'major' | 'critical';
  createdAt: string;
  resolvedAt?: string;
  components: string[];
  summary: string;
}

interface SystemMetrics {
  overallStatus:
    | 'operational'
    | 'degraded_performance'
    | 'partial_outage'
    | 'major_outage';
  overallUptime: number;
  activeIncidents: number;
  lastIncident?: string;
}

const STATUS_CONFIG = {
  operational: {
    label: 'Operational',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle2,
  },
  degraded_performance: {
    label: 'Degraded Performance',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
  },
  partial_outage: {
    label: 'Partial Outage',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
  },
  major_outage: {
    label: 'Major Outage',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
  },
};

export function PublicStatusPage() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    overallStatus: 'operational',
    overallUptime: 99.95,
    activeIncidents: 0,
  });

  const [components, setComponents] = useState<SystemComponent[]>([
    {
      id: 'web_app',
      name: 'Web Application',
      description: 'Main PayrollSync application interface',
      status: 'operational',
      lastUpdated: new Date().toISOString(),
      uptime: 99.98,
      responseTime: 145,
      icon: Globe,
    },
    {
      id: 'api_services',
      name: 'API Services',
      description: 'Core application programming interface',
      status: 'operational',
      lastUpdated: new Date().toISOString(),
      uptime: 99.96,
      responseTime: 89,
      icon: Server,
    },
    {
      id: 'database',
      name: 'Database Services',
      description: 'Primary data storage and retrieval',
      status: 'operational',
      lastUpdated: new Date().toISOString(),
      uptime: 99.99,
      responseTime: 12,
      icon: Database,
    },
    {
      id: 'file_storage',
      name: 'File Storage',
      description: 'Document and file management system',
      status: 'operational',
      lastUpdated: new Date().toISOString(),
      uptime: 99.94,
      responseTime: 230,
      icon: Cloud,
    },
    {
      id: 'authentication',
      name: 'Authentication Services',
      description: 'User login and security management',
      status: 'operational',
      lastUpdated: new Date().toISOString(),
      uptime: 99.97,
      responseTime: 67,
      icon: Shield,
    },
    {
      id: 'external_apis',
      name: 'External API Integrations',
      description: 'Third-party service connections',
      status: 'degraded_performance',
      lastUpdated: new Date().toISOString(),
      uptime: 98.85,
      responseTime: 1240,
      icon: Wifi,
    },
  ]);

  const [recentIncidents, setRecentIncidents] = useState<HistoricalIncident[]>([
    {
      id: 'inc_001',
      title: 'Intermittent API timeouts affecting payroll calculations',
      status: 'resolved',
      severity: 'minor',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000
      ).toISOString(),
      components: ['api_services', 'external_apis'],
      summary:
        'Resolved timeout issues with external API integrations. All systems restored to normal operation.',
    },
    {
      id: 'inc_002',
      title: 'File upload delays in document management',
      status: 'resolved',
      severity: 'minor',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000
      ).toISOString(),
      components: ['file_storage'],
      summary:
        'Optimized file storage infrastructure. Upload performance restored to normal levels.',
    },
  ]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      // Update component response times with minor variations
      setComponents(prev =>
        prev.map(comp => ({
          ...comp,
          responseTime: Math.max(
            10,
            comp.responseTime + (Math.random() - 0.5) * 20
          ),
          lastUpdated: new Date().toISOString(),
        }))
      );
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    const IconComponent = config?.icon || CheckCircle2;
    return <IconComponent className="h-4 w-4" />;
  };

  const getStatusConfig = (status: string) => {
    return (
      STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
      STATUS_CONFIG.operational
    );
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  const calculateIncidentDuration = (
    createdAt: string,
    resolvedAt?: string
  ) => {
    const start = new Date(createdAt);
    const end = resolvedAt ? new Date(resolvedAt) : new Date();
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                PayrollSync Status
              </h1>
              <p className="text-gray-600 mt-1">
                Real-time system status and incident updates
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated</div>
              <div className="text-sm font-medium text-gray-900">
                {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Overall Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                {getStatusIcon(systemMetrics.overallStatus)}
                <span>System Status</span>
              </CardTitle>
              <Badge
                className={`${getStatusConfig(systemMetrics.overallStatus).bgColor} ${getStatusConfig(systemMetrics.overallStatus).textColor} ${getStatusConfig(systemMetrics.overallStatus).borderColor}`}
              >
                {getStatusConfig(systemMetrics.overallStatus).label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {systemMetrics.overallUptime}%
                </div>
                <div className="text-sm text-gray-500">
                  Overall Uptime (30 days)
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {systemMetrics.activeIncidents}
                </div>
                <div className="text-sm text-gray-500">Active Incidents</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {systemMetrics.lastIncident
                    ? formatDuration(
                        (Date.now() -
                          new Date(systemMetrics.lastIncident).getTime()) /
                          (1000 * 60)
                      )
                    : '2 days'}
                </div>
                <div className="text-sm text-gray-500">Since Last Incident</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Components */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>System Components</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {components.map(component => {
              const statusConfig = getStatusConfig(component.status);
              const IconComponent = component.icon;

              return (
                <div
                  key={component.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                      <IconComponent
                        className={`h-5 w-5 ${statusConfig.textColor}`}
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {component.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {component.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-right">
                    <div className="hidden md:block">
                      <div className="text-sm font-medium text-gray-900">
                        {component.uptime}%
                      </div>
                      <div className="text-xs text-gray-500">Uptime</div>
                    </div>
                    <div className="hidden md:block">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(component.responseTime)}ms
                      </div>
                      <div className="text-xs text-gray-500">Response</div>
                    </div>
                    <Badge
                      className={`${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Incidents</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="font-medium">No recent incidents</p>
                <p className="text-sm">
                  All systems have been operating normally
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentIncidents.map(incident => (
                  <div
                    key={incident.id}
                    className="border rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge
                            variant={
                              incident.status === 'resolved'
                                ? 'default'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {incident.status.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant={
                              incident.severity === 'critical'
                                ? 'destructive'
                                : incident.severity === 'major'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="text-xs"
                          >
                            {incident.severity}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(incident.createdAt).toLocaleDateString()}{' '}
                            at{' '}
                            {new Date(incident.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">
                          {incident.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {incident.summary}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            Duration:{' '}
                            {formatDuration(
                              calculateIncidentDuration(
                                incident.createdAt,
                                incident.resolvedAt
                              )
                            )}
                          </span>
                          <span>
                            Components: {incident.components.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8 border-t">
          <p>
            Status updates are refreshed every 30 seconds. For support
            inquiries, contact support@payrollsync.com
          </p>
          <p className="mt-2">© 2025 PayrollSync. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
export default PublicStatusPage;
