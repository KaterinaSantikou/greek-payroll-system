/**
 * Database Connection Pool Dashboard
 * Real-time monitoring of database connection pool performance
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Activity, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Server,
  Zap,
  TrendingUp
} from 'lucide-react';

interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  avgQueryTime: number;
  poolUtilization: number;
  lastActivity: string;
}

interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  maxWaitingClients: number;
  statementTimeoutMs: number;
  applicationName: string;
}

interface ConnectionEvent {
  timestamp: string;
  event: string;
  details?: any;
}

interface PoolStatus {
  status: 'healthy' | 'unhealthy';
  metrics: ConnectionPoolMetrics;
  config: ConnectionPoolConfig;
  health: {
    responseTime: number;
    recentEvents: ConnectionEvent[];
  };
}

export default function DatabasePoolDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Pool status query
  const { data: poolData, refetch: refetchPool } = useQuery({
    queryKey: ['/api/database-pool/status'],
    refetchInterval: autoRefresh ? 5000 : false, // 5 seconds
    retry: 2
  });

  // Pool metrics query
  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/database-pool/metrics'],
    refetchInterval: autoRefresh ? 5000 : false,
    retry: 2
  });

  // Pool history query
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/database-pool/history'],
    refetchInterval: autoRefresh ? 10000 : false, // 10 seconds
    retry: 2
  });

  const poolStatus: PoolStatus = poolData as any;
  const metrics: ConnectionPoolMetrics = (metricsData as any)?.metrics;
  const alerts = (metricsData as any)?.alerts;
  const history: ConnectionEvent[] = (historyData as any)?.history || [];

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchPool(),
      refetchMetrics(),
      refetchHistory()
    ]);
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
          <h1 className="text-2xl font-bold">Database Connection Pool</h1>
          <p className="text-gray-600">Real-time connection pool monitoring and management</p>
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

      {/* Pool Health Status */}
      {poolStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(poolStatus.status)}
              Connection Pool Status
            </CardTitle>
            <CardDescription>
              Overall pool health and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pool Status</span>
                  <Badge className={getStatusColor(poolStatus.status)}>
                    {poolStatus.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Health Check Response</span>
                  <span className="text-sm">{formatDuration(poolStatus.health.responseTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Application Name</span>
                  <span className="text-sm font-mono">{poolStatus.config.applicationName}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Connections</span>
                  <span className="text-sm">{poolStatus.config.maxConnections}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connection Timeout</span>
                  <span className="text-sm">{formatDuration(poolStatus.config.connectionTimeoutMs)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Query Timeout</span>
                  <span className="text-sm">{formatDuration(poolStatus.config.queryTimeoutMs)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts && (alerts.highUtilization || alerts.manyWaitingClients || alerts.slowQueries) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Connection Pool Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.highUtilization && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>High Pool Utilization</AlertTitle>
                  <AlertDescription>
                    Connection pool utilization is above 80%. Consider scaling up connections.
                  </AlertDescription>
                </Alert>
              )}
              {alerts.manyWaitingClients && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Many Waiting Clients</AlertTitle>
                  <AlertDescription>
                    More than 10 clients are waiting for connections. Pool may be saturated.
                  </AlertDescription>
                </Alert>
              )}
              {alerts.slowQueries && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Slow Query Performance</AlertTitle>
                  <AlertDescription>
                    Average query time is above 1 second. Database optimization may be needed.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Total Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalConnections}</div>
              <div className="text-xs text-gray-500">
                Max: {poolStatus?.config.maxConnections}
              </div>
              <Progress 
                value={(metrics.totalConnections / (poolStatus?.config.maxConnections || 1)) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeConnections}</div>
              <div className="text-xs text-gray-500">
                Idle: {metrics.idleConnections}
              </div>
              <Progress 
                value={(metrics.activeConnections / metrics.totalConnections) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Waiting Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.waitingClients}</div>
              <div className="text-xs text-gray-500">
                Max: {poolStatus?.config.maxWaitingClients}
              </div>
              {metrics.waitingClients > 0 && (
                <Progress 
                  value={(metrics.waitingClients / (poolStatus?.config.maxWaitingClients || 1)) * 100} 
                  className="mt-2" 
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Query Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(metrics.avgQueryTime)}</div>
              <div className="text-xs text-gray-500">
                Total queries: {metrics.totalQueries}
              </div>
              <Progress 
                value={Math.min(metrics.avgQueryTime / 50, 100)} 
                className="mt-2" 
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pool Utilization Chart */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pool Utilization
            </CardTitle>
            <CardDescription>
              Current connection pool usage: {metrics.poolUtilization.toFixed(1)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pool Utilization</span>
                  <span>{metrics.poolUtilization.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.poolUtilization} className="h-3" />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{metrics.idleConnections}</div>
                  <div className="text-xs text-gray-500">Idle</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{metrics.activeConnections}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{metrics.waitingClients}</div>
                  <div className="text-xs text-gray-500">Waiting</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Recent Pool Activity
            </CardTitle>
            <CardDescription>
              Last {history.length} connection pool events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((event, index) => (
                <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {event.event.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-gray-600">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {event.details && (
                    <div className="text-xs text-gray-500">
                      {typeof event.details === 'object' 
                        ? Object.entries(event.details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(', ')
                        : String(event.details)
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}