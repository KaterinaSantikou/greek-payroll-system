/**
 * Redis Cache Dashboard
 * Real-time monitoring and management of Redis caching layer
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
  Database, 
  Activity, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Trash2,
  Search,
  TrendingUp,
  BarChart3,
  Settings,
  Key
} from 'lucide-react';

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  avgResponseTime: number;
  memoryUsage: number;
  connectedClients: number;
  keysCount: number;
  lastActivity: string;
}

interface CacheStrategy {
  ttl: number;
  invalidateOnUpdate: boolean;
  invalidatePatterns: string[];
  refreshThreshold?: number;
}

interface CacheKeyInfo {
  key: string;
  ttl: number;
  hasExpiry: boolean;
}

interface CacheActivity {
  timestamp: string;
  operation: string;
  key?: string;
  hit?: boolean;
}

export default function CacheDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDataType, setSelectedDataType] = useState<string | null>(null);

  // Cache status query
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/cache/status'],
    refetchInterval: autoRefresh ? 5000 : false, // 5 seconds
    retry: 2
  });

  // Cache metrics query
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/cache/metrics'],
    refetchInterval: autoRefresh ? 5000 : false,
    retry: 2
  });

  // Cache strategies query
  const { data: strategiesData, refetch: refetchStrategies } = useQuery({
    queryKey: ['/api/cache/strategies'],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
    retry: 2
  });

  // Cache keys query (conditional)
  const { data: keysData, refetch: refetchKeys } = useQuery({
    queryKey: ['/api/cache/keys', { pattern: selectedDataType ? `${selectedDataType}:*` : '*', limit: 50 }],
    enabled: !!selectedDataType,
    refetchInterval: autoRefresh ? 10000 : false, // 10 seconds
    retry: 2
  });

  const status = statusData as any;
  const metrics: CacheMetrics = (metricsData as any)?.metrics;
  const alerts = (metricsData as any)?.alerts;
  const strategies: Record<string, CacheStrategy> = (strategiesData as any)?.strategies || {};
  const dataTypeStats = (metricsData as any)?.dataTypeStats || {};
  const recentActivity: CacheActivity[] = (metricsData as any)?.recentActivity || [];
  const keys: CacheKeyInfo[] = (keysData as any)?.keys || [];

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchStatus(),
      refetchMetrics(),
      refetchStrategies(),
      selectedDataType && refetchKeys()
    ].filter(Boolean));
  };

  const handleInvalidateDataType = async (dataType: string) => {
    try {
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataType })
      });
      
      if (response.ok) {
        await handleRefreshAll();
      }
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Redis Cache Dashboard</h1>
          <p className="text-gray-600">Real-time cache performance monitoring and management</p>
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

      {/* Cache Health Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(status.status)}
              Cache Status
            </CardTitle>
            <CardDescription>
              Redis connection and configuration status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cache Status</span>
                  <Badge className={getStatusColor(status.status)}>
                    {status.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Redis Version</span>
                  <span className="text-sm">{status.info?.redis_version || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connected Clients</span>
                  <span className="text-sm">{status.info?.connected_clients || 0}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm">{formatBytes(parseInt(status.info?.used_memory || '0'))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Keys</span>
                  <span className="text-sm">{status.info?.keyCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Key Prefix</span>
                  <span className="text-sm font-mono">{status.config?.keyPrefix}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts && (alerts.lowHitRate || alerts.highMemoryUsage || alerts.manyMisses) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Cache Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.lowHitRate && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Low Cache Hit Rate</AlertTitle>
                  <AlertDescription>
                    Cache hit rate is below 50%. Consider reviewing caching strategies.
                  </AlertDescription>
                </Alert>
              )}
              {alerts.highMemoryUsage && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>High Memory Usage</AlertTitle>
                  <AlertDescription>
                    Redis memory usage is above 100MB. Consider cleaning expired keys.
                  </AlertDescription>
                </Alert>
              )}
              {alerts.manyMisses && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>High Cache Miss Rate</AlertTitle>
                  <AlertDescription>
                    Cache misses exceed hits. Cache warming or strategy optimization needed.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.hitRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">
                {metrics.hits} hits / {metrics.totalRequests} requests
              </div>
              <Progress value={metrics.hitRate} className="mt-2" />
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
              <Progress 
                value={Math.min(metrics.avgResponseTime / 10, 100)} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(metrics.memoryUsage)}</div>
              <div className="text-xs text-gray-500">
                {metrics.keysCount} keys stored
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.connectedClients}</div>
              <div className="text-xs text-gray-500">
                Connected clients
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cache Management Tabs */}
      <Tabs defaultValue="strategies" className="w-full">
        <TabsList>
          <TabsTrigger value="strategies">Cache Strategies</TabsTrigger>
          <TabsTrigger value="data-types">Data Types</TabsTrigger>
          <TabsTrigger value="keys">Key Management</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(strategies).map(([dataType, strategy]) => (
              <Card key={dataType}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="capitalize">{dataType}</span>
                    <Badge variant="outline">{formatDuration(strategy.ttl * 1000)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>TTL:</span>
                      <span>{formatDuration(strategy.ttl * 1000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Auto-invalidate:</span>
                      <span>{strategy.invalidateOnUpdate ? 'Yes' : 'No'}</span>
                    </div>
                    {strategy.refreshThreshold && (
                      <div className="flex justify-between">
                        <span>Refresh at:</span>
                        <span>{strategy.refreshThreshold}% TTL</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Patterns: {strategy.invalidatePatterns.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Data Types Tab */}
        <TabsContent value="data-types" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(dataTypeStats).map(([dataType, stats]: [string, any]) => (
              <Card key={dataType} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedDataType(dataType)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="capitalize">{dataType}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInvalidateDataType(dataType);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDataType(dataType);
                        }}
                      >
                        <Search className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Keys:</span>
                      <span>{stats.keyCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Strategy:</span>
                      <span>{strategies[dataType] ? 'Configured' : 'Default'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Keys Management Tab */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm font-medium">Selected Data Type:</span>
            <Badge variant={selectedDataType ? 'default' : 'outline'}>
              {selectedDataType || 'None'}
            </Badge>
            {selectedDataType && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDataType(null)}
              >
                Clear Selection
              </Button>
            )}
          </div>

          {keys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Cache Keys
                </CardTitle>
                <CardDescription>
                  Showing {keys.length} keys for pattern: {selectedDataType}:*
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {keys.map((keyInfo, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                      <span className="font-mono text-xs">{keyInfo.key}</span>
                      <div className="flex items-center gap-2">
                        {keyInfo.hasExpiry && (
                          <Badge variant="outline" className="text-xs">
                            TTL: {keyInfo.ttl}s
                          </Badge>
                        )}
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Cache Activity
              </CardTitle>
              <CardDescription>
                Last {recentActivity.length} cache operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={activity.hit === true ? 'default' : activity.hit === false ? 'destructive' : 'outline'}>
                        {activity.operation}
                      </Badge>
                      {activity.key && (
                        <span className="font-mono text-xs text-gray-500">{activity.key}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
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