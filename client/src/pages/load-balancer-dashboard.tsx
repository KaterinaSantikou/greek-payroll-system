/**
 * Load Balancer Dashboard
 * Real-time monitoring and management of load balancer configuration
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Server, 
  Activity, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Network,
  BarChart3,
  Settings,
  Users,
  TrendingUp,
  Shield
} from 'lucide-react';

interface BackendInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  status: 'healthy' | 'unhealthy' | 'draining';
  region?: string;
  lastHealthCheck: string;
  responseTime: number;
  activeConnections: number;
  totalRequests: number;
  errorRate: number;
  traffic?: {
    requests: number;
    percentage: number;
  };
}

interface LoadBalancerMetrics {
  totalRequests: number;
  totalResponses: number;
  activeConnections: number;
  avgResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  uptime: number;
  lastActivity: string;
  trafficDistribution: Record<string, number>;
}

interface LoadBalancerConfig {
  strategy: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  healthCheckPath: string;
  maxRetries: number;
  retryTimeout: number;
  sessionStickiness: boolean;
  enableFailover: boolean;
  maxActiveConnections: number;
  connectionTimeout: number;
  keepAliveTimeout: number;
}

export default function LoadBalancerDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load balancer status query
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/load-balancer/status'],
    refetchInterval: autoRefresh ? 5000 : false, // 5 seconds
    retry: 2
  });

  // Load balancer metrics query
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/load-balancer/metrics'],
    refetchInterval: autoRefresh ? 5000 : false,
    retry: 2
  });

  // Traffic distribution query
  const { data: trafficData, refetch: refetchTraffic } = useQuery({
    queryKey: ['/api/load-balancer/traffic'],
    refetchInterval: autoRefresh ? 5000 : false,
    retry: 2
  });

  // Config query
  const { data: configData, refetch: refetchConfig } = useQuery({
    queryKey: ['/api/load-balancer/config'],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
    retry: 2
  });

  const status = statusData as any;
  const metrics: LoadBalancerMetrics = (metricsData as any)?.metrics;
  const alerts = (metricsData as any)?.alerts;
  const config: LoadBalancerConfig = (configData as any)?.config;
  const instances: BackendInstance[] = (trafficData as any)?.trafficData || [];

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchStatus(),
      refetchMetrics(),
      refetchTraffic(),
      refetchConfig()
    ]);
  };

  const handleDrainInstance = async (instanceId: string) => {
    try {
      const response = await fetch(`/api/load-balancer/instances/${instanceId}/drain`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await handleRefreshAll();
      }
    } catch (error) {
      console.error('Failed to drain instance:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'draining': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      case 'draining': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Load Balancer Dashboard</h1>
          <p className="text-gray-600">Traffic distribution and instance management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Load Balancer Health Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(status.status)}
              Load Balancer Status
            </CardTitle>
            <CardDescription>
              Overall load balancer health and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge className={getStatusColor(status.status)}>
                    {status.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Strategy</span>
                  <span className="text-sm capitalize">{config?.strategy?.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Instances</span>
                  <span className="text-sm">{status.instances?.total || 0}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Healthy Instances</span>
                  <span className="text-sm text-green-600">{status.instances?.healthy || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Unhealthy Instances</span>
                  <span className="text-sm text-red-600">{status.instances?.unhealthy || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Session Stickiness</span>
                  <span className="text-sm">{config?.sessionStickiness ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts && (alerts.noHealthyInstances || alerts.highErrorRate || alerts.slowResponseTime) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Load Balancer Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.noHealthyInstances && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No Healthy Instances</AlertTitle>
                  <AlertDescription>
                    All backend instances are unhealthy. Service may be unavailable.
                  </AlertDescription>
                </Alert>
              )}
              {alerts.highErrorRate && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>High Error Rate</AlertTitle>
                  <AlertDescription>
                    Error rate is above 5%. Check backend instances for issues.
                  </AlertDescription>
                </Alert>
              )}
              {alerts.slowResponseTime && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Slow Response Times</AlertTitle>
                  <AlertDescription>
                    Average response time is above 1 second. Performance optimization needed.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load Balancer Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Requests/sec
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.requestsPerSecond.toFixed(1)}</div>
              <div className="text-xs text-gray-500">
                Total: {metrics.totalRequests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(metrics.avgResponseTime)}</div>
              <div className="text-xs text-gray-500">
                Last activity: {new Date(metrics.lastActivity).toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeConnections}</div>
              <div className="text-xs text-gray-500">
                Max: {config?.maxActiveConnections}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">
                Uptime: {formatUptime(metrics.uptime)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Load Balancer Management Tabs */}
      <Tabs defaultValue="instances" className="w-full">
        <TabsList>
          <TabsTrigger value="instances">Backend Instances</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Distribution</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
        </TabsList>

        {/* Instances Tab */}
        <TabsContent value="instances" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {instances.map((instance) => (
              <Card key={instance.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(instance.status)}
                      <span>{instance.id}</span>
                      <Badge variant="outline">{instance.host}:{instance.port}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(instance.status)}>
                        {instance.status}
                      </Badge>
                      {instance.status === 'healthy' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDrainInstance(instance.id)}
                        >
                          Drain
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Weight:</span>
                      <div className="text-lg">{instance.weight}</div>
                    </div>
                    <div>
                      <span className="font-medium">Response Time:</span>
                      <div className="text-lg">{formatDuration(instance.responseTime)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Active Connections:</span>
                      <div className="text-lg">{instance.activeConnections}</div>
                    </div>
                    <div>
                      <span className="font-medium">Error Rate:</span>
                      <div className="text-lg">{instance.errorRate.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  {instance.traffic && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Traffic Share</span>
                        <span>{instance.traffic.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={instance.traffic.percentage} className="h-2" />
                    </div>
                  )}

                  <div className="mt-2 text-xs text-gray-500">
                    Last health check: {new Date(instance.lastHealthCheck).toLocaleString()}
                    {instance.region && ` • Region: ${instance.region}`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Traffic Distribution Tab */}
        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Traffic Distribution
              </CardTitle>
              <CardDescription>
                Current request distribution across backend instances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {instances.map((instance) => (
                  <div key={instance.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{instance.id} ({instance.host}:{instance.port})</span>
                      <span>{instance.traffic?.percentage.toFixed(1)}% ({instance.traffic?.requests} requests)</span>
                    </div>
                    <Progress value={instance.traffic?.percentage || 0} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          {config && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Load Balancer Configuration
                </CardTitle>
                <CardDescription>
                  Current load balancing strategy and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Strategy:</span>
                      <span className="capitalize">{config.strategy.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Health Check Interval:</span>
                      <span>{formatDuration(config.healthCheckInterval)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Health Check Timeout:</span>
                      <span>{formatDuration(config.healthCheckTimeout)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Health Check Path:</span>
                      <span className="font-mono text-sm">{config.healthCheckPath}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Max Retries:</span>
                      <span>{config.maxRetries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Session Stickiness:</span>
                      <span>{config.sessionStickiness ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Failover:</span>
                      <span>{config.enableFailover ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Max Connections:</span>
                      <span>{config.maxActiveConnections}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Health Checks Tab */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Health Check Status
              </CardTitle>
              <CardDescription>
                Real-time health monitoring of backend instances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {instances.map((instance) => (
                  <div key={instance.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(instance.status)}
                      <div>
                        <div className="font-medium">{instance.id}</div>
                        <div className="text-sm text-gray-500">{instance.host}:{instance.port}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatDuration(instance.responseTime)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(instance.lastHealthCheck).toLocaleTimeString()}
                      </div>
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