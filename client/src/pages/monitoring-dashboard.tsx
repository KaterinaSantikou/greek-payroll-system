/**
 * Performance & Monitoring Dashboard
 * Real-time system performance and health monitoring
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Server, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Shield,
  Globe,
  HardDrive,
  Users,
  Link
} from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'unhealthy';
  timestamp: string;
  services: {
    errorTracking: { status: string; details: any };
    performance: { status: string; details: any };
    database: { status: string; details: any };
    cdn: { status: string; details: any };
  };
}

interface PerformanceData {
  requests: {
    total: number;
    avgDuration: number;
    slowRequests: number;
    errorRate: number;
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  top: {
    slowestRoutes: Array<{ route: string; avgDuration: number; count: number }>;
    errorRoutes: Array<{ route: string; errorCount: number; totalCount: number }>;
  };
}

interface DatabaseReport {
  slowQueries: Array<{
    query: string;
    duration: number;
    rows: number;
    operation: string;
    tableName?: string;
    suggestions?: string[];
  }>;
  recommendations: Array<{
    type: string;
    priority: string;
    description: string;
    impact: string;
    implementation: string;
  }>;
  performance: {
    avgQueryTime: number;
    slowQueryCount: number;
    mostProblematicTables: Array<{ table: string; avgDuration: number; count: number }>;
  };
}

interface Alert {
  type: 'performance' | 'database' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  details?: any;
}

export default function MonitoringDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Health status query
  const { data: healthData, refetch: refetchHealth } = useQuery({
    queryKey: ['/api/monitoring/health'],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
    retry: 2
  });

  // Performance data query
  const { data: performanceData, refetch: refetchPerformance } = useQuery({
    queryKey: ['/api/monitoring/performance'],
    refetchInterval: autoRefresh ? 15000 : false, // 15 seconds
    retry: 2
  });

  // Database optimization query
  const { data: databaseData, refetch: refetchDatabase } = useQuery({
    queryKey: ['/api/monitoring/database'],
    refetchInterval: autoRefresh ? 60000 : false, // 1 minute
    retry: 2
  });

  // Alerts query
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/monitoring/alerts'],
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
    retry: 2
  });

  const health: HealthStatus = healthData as any;
  const performance: PerformanceData = (performanceData as any)?.performance;
  const database: DatabaseReport = (databaseData as any)?.report;
  const alerts: Alert[] = (alertsData as any)?.alerts || [];

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchHealth(),
      refetchPerformance(),
      refetchDatabase(),
      refetchAlerts()
    ]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance & Monitoring</h1>
          <p className="text-gray-600">Real-time system performance and health monitoring</p>
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

      {/* System Health Overview */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(health.status)}
              System Health Overview
            </CardTitle>
            <CardDescription>
              Last updated: {new Date(health.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(health.services).map(([service, data]) => (
                <div key={service} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {service.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <Badge className={getStatusColor(data.status)}>
                      {data.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.details && Object.entries(data.details).slice(0, 2).map(([key, value]) => (
                      <div key={key}>{key}: {String(value)}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <AlertTitle className="flex items-center gap-2">
                        {alert.message}
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
          <TabsTrigger value="pool">Connection Pool</TabsTrigger>
          <TabsTrigger value="cache">Redis Cache</TabsTrigger>
          <TabsTrigger value="loadbalancer">Load Balancer</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {performance && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Total Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.requests.total}</div>
                    <p className="text-xs text-gray-500">Last 100 requests</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Avg Response Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(performance.requests.avgDuration)}ms</div>
                    <Progress 
                      value={Math.min(performance.requests.avgDuration / 50, 100)} 
                      className="mt-2" 
                    />
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
                    <div className="text-2xl font-bold">{performance.requests.errorRate.toFixed(1)}%</div>
                    <Progress 
                      value={performance.requests.errorRate} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Slow Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.requests.slowRequests}</div>
                    <p className="text-xs text-gray-500">&gt;1 second</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Routes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Slowest Routes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performance.top.slowestRoutes.map((route, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-xs">{route.route}</span>
                          <div className="text-right">
                            <div>{Math.round(route.avgDuration)}ms</div>
                            <div className="text-xs text-gray-500">{route.count} requests</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Error-Prone Routes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performance.top.errorRoutes.map((route, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-xs">{route.route}</span>
                          <div className="text-right">
                            <div className="text-red-600">{route.errorCount} errors</div>
                            <div className="text-xs text-gray-500">
                              {((route.errorCount / route.totalCount) * 100).toFixed(1)}% rate
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          {database && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Avg Query Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(database.performance.avgQueryTime)}ms</div>
                    <Progress 
                      value={Math.min(database.performance.avgQueryTime / 20, 100)} 
                      className="mt-2" 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Slow Queries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{database.performance.slowQueryCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{database.recommendations.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Problematic Tables */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Problematic Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {database.performance.mostProblematicTables.map((table, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-mono">{table.table}</span>
                        <div className="text-right">
                          <div>{Math.round(table.avgDuration)}ms avg</div>
                          <div className="text-xs text-gray-500">{table.count} slow queries</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* System Resources Tab */}
        <TabsContent value="system" className="space-y-4">
          {performance && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Heap Used</span>
                      <span>{Math.round(performance.system.memoryUsage.heapUsed / 1024 / 1024)}MB</span>
                    </div>
                    <Progress value={(performance.system.memoryUsage.heapUsed / performance.system.memoryUsage.heapTotal) * 100} />
                    
                    <div className="flex justify-between text-sm">
                      <span>Heap Total</span>
                      <span>{Math.round(performance.system.memoryUsage.heapTotal / 1024 / 1024)}MB</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>RSS</span>
                      <span>{Math.round(performance.system.memoryUsage.rss / 1024 / 1024)}MB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    CPU Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>User CPU</span>
                      <span>{Math.round(performance.system.cpuUsage.user / 1000)}ms</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>System CPU</span>
                      <span>{Math.round(performance.system.cpuUsage.system / 1000)}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Connection Pool Tab */}
        <TabsContent value="pool" className="space-y-4">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Database Connection Pool</h3>
            <p className="text-gray-500 mb-4">
              View detailed connection pool metrics and monitoring
            </p>
            <Button asChild>
              <a href="/database-pool" className="inline-flex items-center">
                <Link className="h-4 w-4 mr-2" />
                Open Pool Dashboard
              </a>
            </Button>
          </div>
        </TabsContent>

        {/* Redis Cache Tab */}
        <TabsContent value="cache" className="space-y-4">
          <div className="text-center py-8">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Redis Cache Layer</h3>
            <p className="text-gray-500 mb-4">
              Manage cache strategies, monitor performance, and view cache metrics
            </p>
            <Button asChild>
              <a href="/cache-dashboard" className="inline-flex items-center">
                <Link className="h-4 w-4 mr-2" />
                Open Cache Dashboard
              </a>
            </Button>
          </div>
        </TabsContent>

        {/* Load Balancer Tab */}
        <TabsContent value="loadbalancer" className="space-y-4">
          <div className="text-center py-8">
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Load Balancer</h3>
            <p className="text-gray-500 mb-4">
              Monitor traffic distribution, manage backend instances, and configure load balancing strategies
            </p>
            <Button asChild>
              <a href="/load-balancer-dashboard" className="inline-flex items-center">
                <Link className="h-4 w-4 mr-2" />
                Open Load Balancer Dashboard
              </a>
            </Button>
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {database && database.recommendations.length > 0 && (
            <div className="space-y-4">
              {database.recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-base">{rec.description}</span>
                      <Badge className={
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {rec.priority} priority
                      </Badge>
                    </CardTitle>
                    <CardDescription>Type: {rec.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <strong>Impact:</strong> {rec.impact}
                      </div>
                      <div>
                        <strong>Implementation:</strong> {rec.implementation}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}