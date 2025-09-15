/**
 * Enterprise Architecture Overview
 * Complete system demonstration with all components
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Smartphone,
  TabletSmartphone,
  Server,
  Database,
  Shield,
  BarChart3,
  Zap,
  GitBranch,
  Layers,
  Network,
  Cloud,
  Lock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Settings,
  Activity,
  FileText,
  Cpu,
  HardDrive,
  Wifi,
} from 'lucide-react';

export default function EnterpriseArchitecture() {
  const [selectedComponent, setSelectedComponent] = useState('mobile-app');

  // System health metrics
  const systemHealth = {
    mobileApp: { status: 'operational', uptime: 99.8, activeDevices: 847 },
    kioskApp: { status: 'operational', uptime: 99.9, activeDevices: 23 },
    timeService: {
      status: 'operational',
      uptime: 99.7,
      throughput: '1.2k req/min',
    },
    complianceConnector: {
      status: 'operational',
      uptime: 98.9,
      erganiSyncRate: 98.7,
    },
    payrollConnector: {
      status: 'operational',
      uptime: 99.5,
      timesheetsProcessed: 2847,
    },
    policyEngine: {
      status: 'operational',
      uptime: 99.9,
      rulesEvaluated: '45k/day',
    },
    dataLake: { status: 'operational', uptime: 99.6, dataVolume: '2.3TB' },
  };

  // Architecture components
  const architectureComponents = [
    {
      id: 'mobile-app',
      name: 'Mobile App (iOS/Android)',
      description: 'Punch UI, offline cache, device binding',
      icon: Smartphone,
      color: 'bg-blue-100 text-blue-800',
      features: [
        'QR/NFC punch methods',
        'Biometric verification',
        'Offline cache with sync',
        'Device binding security',
        'Geofence validation',
        'Real-time validation',
      ],
      metrics: systemHealth.mobileApp,
    },
    {
      id: 'kiosk-app',
      name: 'Kiosk App (Android/iPadOS)',
      description: 'Fixed terminal UI, shared device management',
      icon: TabletSmartphone,
      color: 'bg-green-100 text-green-800',
      features: [
        'Multi-employee interface',
        'Session management',
        'Enhanced offline support',
        'Integrity monitoring',
        'Biometric readers',
        'Photo verification',
      ],
      metrics: systemHealth.kioskApp,
    },
    {
      id: 'time-service',
      name: 'Time Service API',
      description: 'Event ingestion, validation, policy engine',
      icon: Server,
      color: 'bg-purple-100 text-purple-800',
      features: [
        'Event ingestion',
        'Real-time validation',
        'Geofence checks',
        'Policy evaluation',
        'Batch processing',
        'Exception workflows',
      ],
      metrics: systemHealth.timeService,
    },
    {
      id: 'compliance-connector',
      name: 'Compliance Connector',
      description: 'ERGANI II integration with retry logic',
      icon: Shield,
      color: 'bg-orange-100 text-orange-800',
      features: [
        'REST/SOAP adapters',
        'Retry mechanisms',
        'Status ledger',
        'Rate limiting',
        'Digital signatures',
        'Audit trails',
      ],
      metrics: systemHealth.complianceConnector,
    },
    {
      id: 'payroll-connector',
      name: 'Payroll Connector',
      description: 'Normalized timesheets to earnings codes',
      icon: BarChart3,
      color: 'bg-indigo-100 text-indigo-800',
      features: [
        'Timesheet normalization',
        'Greek earnings codes',
        'Cost center allocation',
        'Compliance validation',
        'Batch export',
        'Error handling',
      ],
      metrics: systemHealth.payrollConnector,
    },
    {
      id: 'policy-engine',
      name: 'Policy Engine',
      description: 'Country/CBA rules with property overrides',
      icon: Settings,
      color: 'bg-yellow-100 text-yellow-800',
      features: [
        'Greek labor law rules',
        'CBA compliance',
        'Property overrides',
        'Rule evaluation',
        'Exception handling',
        'Dynamic updates',
      ],
      metrics: systemHealth.policyEngine,
    },
    {
      id: 'data-lake',
      name: 'Data Lake & BI',
      description: 'Raw events + curated analytics',
      icon: Database,
      color: 'bg-teal-100 text-teal-800',
      features: [
        'Raw event storage',
        'Curated timesheets',
        'Real-time analytics',
        'Compliance reporting',
        'HR analytics',
        'Operational metrics',
      ],
      metrics: systemHealth.dataLake,
    },
  ];

  const selectedComponentData = architectureComponents.find(
    c => c.id === selectedComponent
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Enterprise Architecture Overview
          </h1>
          <p className="text-gray-600 mt-2">
            Complete PayrollSync system architecture with all components and
            integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            All Systems Operational
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="data-flow">Data Flow</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* System Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Architecture Diagram */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  System Architecture
                </CardTitle>
                <CardDescription>
                  Enterprise-grade time capture and compliance system for Greek
                  hotel operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Client Layer */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-center mb-3">
                      Client Layer
                    </h4>

                    <div className="border rounded-lg p-3 bg-blue-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">Mobile App</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        iOS/Android • QR/NFC • Offline Cache
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-green-50">
                      <div className="flex items-center gap-2 mb-2">
                        <TabletSmartphone className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">Kiosk App</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Android/iPadOS • Shared Device • Biometric
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-sm">
                          Web Interface
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Manager Controls • Reports • Admin
                      </div>
                    </div>
                  </div>

                  {/* Service Layer */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-center mb-3">
                      Service Layer
                    </h4>

                    <div className="border rounded-lg p-3 bg-purple-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-sm">
                          Time Service
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Event Ingestion • Validation • Policy
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-orange-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-sm">Compliance</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        ERGANI II • REST/SOAP • Retry Logic
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-indigo-50">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-indigo-600" />
                        <span className="font-medium text-sm">Payroll</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Timesheets • Earnings • Cost Centers
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-yellow-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-sm">
                          Policy Engine
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Greek Law • CBA • Property Rules
                      </div>
                    </div>
                  </div>

                  {/* Data Layer */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-center mb-3">Data Layer</h4>

                    <div className="border rounded-lg p-3 bg-teal-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4 text-teal-600" />
                        <span className="font-medium text-sm">Data Lake</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Raw Events • Curated • Analytics
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-sm">PostgreSQL</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Operational Data • Sessions • Config
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-blue-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Cloud className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">
                          Object Storage
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Documents • Photos • Attachments
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-green-50">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-sm">
                          BI Warehouse
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Reports • Dashboards • Analytics
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Flow Arrows */}
                <div className="mt-6 text-center text-sm text-gray-500">
                  ↓ Events ↓ Validation ↓ Processing ↓ Storage ↓ Analytics ↓
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Enterprise Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Real-time ERGANI II synchronization',
                    'Multi-device offline capability',
                    'Role-based access control',
                    'Tamper-evident audit logging',
                    'Greek labor law compliance',
                    'Biometric verification',
                    'Geofence validation',
                    'Exception workflows',
                    'Cost center allocation',
                    'Real-time analytics',
                  ].map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>System Availability</span>
                      <span>99.2%</span>
                    </div>
                    <Progress value={99.2} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>ERGANI Sync Rate</span>
                      <span>98.7%</span>
                    </div>
                    <Progress value={98.7} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Compliance Score</span>
                      <span>96.8%</span>
                    </div>
                    <Progress value={96.8} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Data Processing</span>
                      <span>99.1%</span>
                    </div>
                    <Progress value={99.1} className="h-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">2.3TB</div>
                    <div className="text-xs text-gray-600">Data Volume</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">45k</div>
                    <div className="text-xs text-gray-600">Daily Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">870</div>
                    <div className="text-xs text-gray-600">Active Devices</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">1.2k</div>
                    <div className="text-xs text-gray-600">Req/Min</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Components Detail */}
        <TabsContent value="components">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Component List */}
            <Card>
              <CardHeader>
                <CardTitle>System Components</CardTitle>
                <CardDescription>
                  Select a component to view details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {architectureComponents.map(component => {
                  const Icon = component.icon;
                  return (
                    <div
                      key={component.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedComponent === component.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedComponent(component.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {component.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {component.description}
                          </div>
                        </div>
                        <Badge className={component.color}>
                          {component.metrics.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Component Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedComponentData && (
                    <selectedComponentData.icon className="h-5 w-5" />
                  )}
                  {selectedComponentData?.name}
                </CardTitle>
                <CardDescription>
                  {selectedComponentData?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status */}
                <div>
                  <h4 className="font-medium mb-3">System Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Status: {selectedComponentData?.metrics.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">
                        Uptime: {selectedComponentData?.metrics.uptime}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="font-medium mb-3">Key Features</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedComponentData?.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <h4 className="font-medium mb-3">Technical Implementation</h4>
                  <div className="space-y-2 text-sm">
                    {selectedComponent === 'mobile-app' && (
                      <div className="space-y-2">
                        <div>• React Native with TypeScript</div>
                        <div>• Offline-first architecture with SQLite</div>
                        <div>• WebAuthn biometric integration</div>
                        <div>• Device binding with hardware attestation</div>
                        <div>• Real-time geolocation validation</div>
                      </div>
                    )}
                    {selectedComponent === 'time-service' && (
                      <div className="space-y-2">
                        <div>• Node.js/Express REST API</div>
                        <div>• Redis for caching and rate limiting</div>
                        <div>• Policy engine with JSONLogic</div>
                        <div>• Batch processing with queues</div>
                        <div>• Real-time WebSocket notifications</div>
                      </div>
                    )}
                    {selectedComponent === 'data-lake' && (
                      <div className="space-y-2">
                        <div>• Apache Spark for data processing</div>
                        <div>• Delta Lake for versioned storage</div>
                        <div>• Real-time streaming with Kafka</div>
                        <div>• BI dashboards with Grafana</div>
                        <div>• Machine learning pipeline</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Flow */}
        <TabsContent value="data-flow">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Data Flow Architecture
              </CardTitle>
              <CardDescription>
                End-to-end data processing from punch events to payroll and
                compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Flow Steps */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    {
                      step: '1',
                      title: 'Event Capture',
                      description:
                        'Mobile/Kiosk punch events with offline support',
                      icon: Smartphone,
                      color: 'bg-blue-100 text-blue-800',
                    },
                    {
                      step: '2',
                      title: 'Validation',
                      description:
                        'Real-time policy engine and geofence validation',
                      icon: Shield,
                      color: 'bg-orange-100 text-orange-800',
                    },
                    {
                      step: '3',
                      title: 'Storage',
                      description:
                        'Raw events to data lake, processed to database',
                      icon: Database,
                      color: 'bg-teal-100 text-teal-800',
                    },
                    {
                      step: '4',
                      title: 'Processing',
                      description:
                        'Timesheet generation and compliance reporting',
                      icon: Cpu,
                      color: 'bg-purple-100 text-purple-800',
                    },
                    {
                      step: '5',
                      title: 'Integration',
                      description: 'ERGANI submission and payroll export',
                      icon: Network,
                      color: 'bg-green-100 text-green-800',
                    },
                  ].map((flow, index) => {
                    const Icon = flow.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className="border rounded-lg p-4 space-y-2">
                          <Badge className={flow.color}>Step {flow.step}</Badge>
                          <Icon className="h-8 w-8 mx-auto text-gray-600" />
                          <h4 className="font-medium">{flow.title}</h4>
                          <p className="text-xs text-gray-600">
                            {flow.description}
                          </p>
                        </div>
                        {index < 4 && (
                          <div className="hidden md:block mt-2">
                            <div className="text-2xl text-gray-300">→</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Data Processing Pipeline */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">
                    Real-time Processing Pipeline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      1. <strong>Event Ingestion:</strong> Time events received
                      via REST API
                    </div>
                    <div>
                      2. <strong>Validation Engine:</strong> Policy rules
                      evaluated in real-time
                    </div>
                    <div>
                      3. <strong>Geofence Check:</strong> Location validation
                      against property boundaries
                    </div>
                    <div>
                      4. <strong>Data Lake Storage:</strong> Raw events stored
                      for audit and analytics
                    </div>
                    <div>
                      5. <strong>Timesheet Processing:</strong> Events
                      aggregated into daily/weekly timesheets
                    </div>
                    <div>
                      6. <strong>Compliance Submission:</strong> ERGANI II
                      reporting with retry logic
                    </div>
                    <div>
                      7. <strong>Payroll Integration:</strong> Normalized
                      timesheets exported to payroll system
                    </div>
                    <div>
                      8. <strong>Analytics Update:</strong> Real-time dashboards
                      and compliance metrics
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring */}
        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {architectureComponents.map(component => {
                  const Icon = component.icon;
                  return (
                    <div
                      key={component.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {component.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={component.color}>
                          {component.metrics.uptime}% uptime
                        </Badge>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Alerts & Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <Badge className="bg-green-100 text-green-800">0.8%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Time</span>
                    <Badge className="bg-blue-100 text-blue-800">45ms</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ERGANI Sync</span>
                    <Badge className="bg-green-100 text-green-800">98.7%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Alerts</span>
                    <Badge className="bg-yellow-100 text-yellow-800">2</Badge>
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <h5 className="font-medium text-sm mb-2">Recent Alerts</h5>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5" />
                      <div>
                        <div>
                          High overtime hours detected in Reception dept
                        </div>
                        <div className="text-xs text-gray-500">
                          2 minutes ago
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                      <div>
                        <div>ERGANI sync resumed after temporary failure</div>
                        <div className="text-xs text-gray-500">
                          15 minutes ago
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
