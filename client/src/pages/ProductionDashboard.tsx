/**
 * Production Dashboard
 * Monitor production readiness and system health
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  Database,
  Shield,
  Monitor,
  TrendingUp,
  Server,
  Clock,
  Users,
  Activity,
  BarChart3,
  Settings
} from 'lucide-react';

interface ProductionHealth {
  overall: 'healthy' | 'warning' | 'critical';
  readinessScore: number;
  services: {
    database: 'connected' | 'error';
    authentication: 'operational' | 'degraded' | 'down';
    errorTracking: 'active' | 'inactive';
    monitoring: 'active' | 'inactive';
    compliance: 'full' | 'partial' | 'none';
    security: 'enforced' | 'partial' | 'disabled';
  };
  performance: {
    responseTime: number;
    memoryUsage: number;
    uptime: number;
  };
  blockers: string[];
  recommendations: string[];
}

interface LaunchStatus {
  ready: boolean;
  confidence: number;
  blockers: string[];
  estimate: string;
}

export default function ProductionDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch production health
  const { data: health, isLoading: healthLoading } = useQuery<ProductionHealth>({
    queryKey: ['/api/production/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch launch readiness
  const { data: launchStatus, isLoading: launchLoading } = useQuery<LaunchStatus>({
    queryKey: ['/api/production/launch-check'],
    refetchInterval: 60000, // Refresh every minute
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
      case 'active':
      case 'full':
      case 'enforced':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
      case 'degraded':
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'error':
      case 'down':
      case 'inactive':
      case 'none':
      case 'disabled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Monitor className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
      case 'active':
      case 'full':
      case 'enforced':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'degraded':
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
      case 'error':
      case 'down':
      case 'inactive':
      case 'none':
      case 'disabled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (healthLoading || launchLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-600 animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">Production Dashboard</h1>
            <p className="text-gray-600">Loading system status...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Production Dashboard</h1>
            <p className="text-gray-600">Monitor system health and launch readiness</p>
          </div>
        </div>
        
        {health && (
          <Badge className={`text-lg px-4 py-2 ${getStatusColor(health.overall)}`}>
            {getStatusIcon(health.overall)}
            <span className="ml-2 capitalize">{health.overall}</span>
          </Badge>
        )}
      </div>

      {/* Launch Readiness Alert */}
      {launchStatus && (
        <Alert className={launchStatus.ready ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <div className="flex items-center gap-3">
            {launchStatus.ready ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">
                {launchStatus.ready ? 'Ready for Production Launch!' : 'Production Launch Status'}
              </h3>
              <AlertDescription>
                {launchStatus.ready 
                  ? `System is production-ready with ${launchStatus.confidence}% confidence.`
                  : `${launchStatus.blockers.length} blockers remaining. Estimated time: ${launchStatus.estimate}`
                }
              </AlertDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{launchStatus.confidence}%</div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
          </div>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {health && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Overall Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Readiness Score</span>
                      <span className="text-2xl font-bold">{health.readinessScore}%</span>
                    </div>
                    <Progress value={health.readinessScore} className="h-3" />
                    <div className="flex items-center gap-2">
                      {getStatusIcon(health.overall)}
                      <span className="capitalize">{health.overall} Status</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Response Time</span>
                      <span className="font-semibold">{health.performance.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <span className="font-semibold">{health.performance.memoryUsage.toFixed(1)}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Uptime</span>
                      <span className="font-semibold">{Math.floor(health.performance.uptime / 3600)}h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Initialize Services
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    <Monitor className="h-4 w-4 mr-2" />
                    View Logs
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    <Database className="h-4 w-4 mr-2" />
                    Database Health
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          {health && (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(health.services).map(([service, status]) => (
                <Card key={service}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
                      {getStatusIcon(status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={getStatusColor(status)}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend</CardTitle>
                <CardDescription>Average response time over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                  <p className="text-gray-500">Performance chart would go here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
                <CardDescription>System memory consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 bg-gray-50 rounded flex items-center justify-center">
                  <p className="text-gray-500">Memory usage chart would go here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="readiness" className="space-y-6">
          <div className="space-y-4">
            {/* Blockers */}
            {health?.blockers && health.blockers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    Critical Blockers ({health.blockers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {health.blockers.map((blocker, index) => (
                      <li key={index} className="flex items-center gap-2 text-red-700">
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {health?.recommendations && health.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    Recommendations ({health.recommendations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {health.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-center gap-2 text-yellow-700">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Launch Status */}
            {launchStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Launch Readiness
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Overall Confidence</span>
                    <span className="text-3xl font-bold">{launchStatus.confidence}%</span>
                  </div>
                  <Progress value={launchStatus.confidence} className="h-4" />
                  <div className="flex items-center gap-2">
                    {launchStatus.ready ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <span>
                      {launchStatus.ready ? 'Ready for launch!' : `Estimated: ${launchStatus.estimate}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}