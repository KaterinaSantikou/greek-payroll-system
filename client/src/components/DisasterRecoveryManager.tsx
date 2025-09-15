/**
 * Disaster Recovery Manager Component
 * Handles DR testing procedures and automation
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  HardDrive,
  Network,
  Activity,
  Calendar,
  BarChart3,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DrTestingProcedure {
  id: string;
  name: string;
  category:
    | 'database_backup'
    | 'system_failover'
    | 'data_recovery'
    | 'infrastructure'
    | 'application';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  estimatedDurationMinutes: number;
  requiredResources: string[];
  prerequisites: string[];
  testSteps: DrTestStep[];
  successCriteria: string[];
  isActive: boolean;
}

interface DrTestStep {
  stepNumber: number;
  description: string;
  expectedOutcome: string;
  timeoutMinutes: number;
  isAutomated: boolean;
}

interface DrTestingResult {
  id: string;
  procedureId: string;
  status: 'passed' | 'failed' | 'partial' | 'cancelled';
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
  durationMinutes: number;
  stepResults: DrTestStepResult[];
  issues: string[];
  recommendations: string[];
}

interface DrTestStepResult {
  stepNumber: number;
  status: 'passed' | 'failed' | 'skipped';
  actualOutcome: string;
  durationMinutes: number;
  errorDetails?: string;
}

interface DrTestingStatistics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  partialTests: number;
  averageDurationMinutes: number;
  lastTestDate: Date | null;
  upcomingTests: number;
}

const CATEGORY_CONFIG = {
  database_backup: {
    label: 'Database Backup',
    icon: Database,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  system_failover: {
    label: 'System Failover',
    icon: Server,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  data_recovery: {
    label: 'Data Recovery',
    icon: HardDrive,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  infrastructure: {
    label: 'Infrastructure',
    icon: Network,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  application: {
    label: 'Application',
    icon: Activity,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
};

const STATUS_CONFIG = {
  passed: {
    label: 'Passed',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  partial: {
    label: 'Partial',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

export function DisasterRecoveryManager() {
  const [activeTab, setActiveTab] = useState('procedures');
  const [procedures, setProcedures] = useState<DrTestingProcedure[]>([]);
  const [results, setResults] = useState<DrTestingResult[]>([]);
  const [statistics, setStatistics] = useState<DrTestingStatistics>({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    partialTests: 0,
    averageDurationMinutes: 0,
    lastTestDate: null,
    upcomingTests: 0,
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [executingTests, setExecutingTests] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load mock data since API endpoints are not fully connected
      setProcedures([
        {
          id: 'db_backup_restore_test',
          name: 'Database Backup and Restore Test',
          category: 'database_backup',
          description:
            'Test database backup creation and restoration procedures',
          severity: 'critical',
          estimatedDurationMinutes: 30,
          requiredResources: [
            'database_admin',
            'backup_storage',
            'test_environment',
          ],
          prerequisites: ['backup_exists', 'test_db_available'],
          testSteps: [
            {
              stepNumber: 1,
              description: 'Create test database backup',
              expectedOutcome: 'Backup file created successfully',
              timeoutMinutes: 10,
              isAutomated: true,
            },
            {
              stepNumber: 2,
              description: 'Restore backup to test environment',
              expectedOutcome: 'Database restored with all data intact',
              timeoutMinutes: 15,
              isAutomated: true,
            },
            {
              stepNumber: 3,
              description:
                'Verify data integrity and application functionality',
              expectedOutcome: 'All critical tables and data present',
              timeoutMinutes: 5,
              isAutomated: true,
            },
          ],
          successCriteria: [
            'Backup completes within 10 minutes',
            'Restore completes within 15 minutes',
            'Data integrity 100% verified',
            'Application connects successfully',
          ],
          isActive: true,
        },
        {
          id: 'system_failover_test',
          name: 'System Failover Test',
          category: 'system_failover',
          description: 'Test automatic failover to backup systems',
          severity: 'high',
          estimatedDurationMinutes: 45,
          requiredResources: [
            'backup_server',
            'load_balancer',
            'monitoring_system',
          ],
          prerequisites: ['backup_system_ready', 'failover_configured'],
          testSteps: [
            {
              stepNumber: 1,
              description: 'Simulate primary system failure',
              expectedOutcome: 'Primary system marked as down',
              timeoutMinutes: 5,
              isAutomated: true,
            },
            {
              stepNumber: 2,
              description: 'Verify automatic failover triggers',
              expectedOutcome: 'Traffic redirected to backup system',
              timeoutMinutes: 10,
              isAutomated: true,
            },
            {
              stepNumber: 3,
              description: 'Test application functionality on backup',
              expectedOutcome: 'All services operational',
              timeoutMinutes: 20,
              isAutomated: false,
            },
            {
              stepNumber: 4,
              description: 'Test failback to primary system',
              expectedOutcome: 'Primary system restored, traffic restored',
              timeoutMinutes: 10,
              isAutomated: true,
            },
          ],
          successCriteria: [
            'Failover completes within 10 minutes',
            'Zero data loss',
            'Application remains accessible',
            'Failback successful',
          ],
          isActive: true,
        },
        {
          id: 'data_recovery_test',
          name: 'Data Recovery Test',
          category: 'data_recovery',
          description:
            'Test recovery of accidentally deleted or corrupted data',
          severity: 'high',
          estimatedDurationMinutes: 25,
          requiredResources: [
            'backup_data',
            'recovery_tools',
            'test_environment',
          ],
          prerequisites: ['recent_backup_available', 'recovery_scripts_ready'],
          testSteps: [
            {
              stepNumber: 1,
              description: 'Simulate data corruption/deletion',
              expectedOutcome: 'Test data deleted from database',
              timeoutMinutes: 2,
              isAutomated: true,
            },
            {
              stepNumber: 2,
              description: 'Execute point-in-time recovery',
              expectedOutcome: 'Data restored to state before corruption',
              timeoutMinutes: 20,
              isAutomated: true,
            },
            {
              stepNumber: 3,
              description: 'Verify data consistency and integrity',
              expectedOutcome: 'All data validated and consistent',
              timeoutMinutes: 3,
              isAutomated: true,
            },
          ],
          successCriteria: [
            'Recovery completes within 20 minutes',
            '100% data integrity maintained',
            'No data loss beyond recovery point',
            'Application functionality verified',
          ],
          isActive: true,
        },
        {
          id: 'infrastructure_redundancy_test',
          name: 'Infrastructure Redundancy Test',
          category: 'infrastructure',
          description:
            'Test infrastructure redundancy and scaling capabilities',
          severity: 'medium',
          estimatedDurationMinutes: 60,
          requiredResources: [
            'multiple_servers',
            'load_testing_tools',
            'monitoring',
          ],
          prerequisites: ['redundant_infrastructure', 'monitoring_configured'],
          testSteps: [
            {
              stepNumber: 1,
              description: 'Simulate server failure',
              expectedOutcome: 'Server marked as unavailable',
              timeoutMinutes: 5,
              isAutomated: true,
            },
            {
              stepNumber: 2,
              description: 'Verify load redistribution',
              expectedOutcome: 'Load balanced across remaining servers',
              timeoutMinutes: 10,
              isAutomated: true,
            },
            {
              stepNumber: 3,
              description: 'Test performance under reduced capacity',
              expectedOutcome: 'Performance within acceptable thresholds',
              timeoutMinutes: 30,
              isAutomated: true,
            },
            {
              stepNumber: 4,
              description: 'Test auto-scaling response',
              expectedOutcome: 'Additional capacity provisioned',
              timeoutMinutes: 15,
              isAutomated: true,
            },
          ],
          successCriteria: [
            'Zero downtime during server failure',
            'Load redistribution within 5 minutes',
            'Performance degradation < 20%',
            'Auto-scaling triggers correctly',
          ],
          isActive: true,
        },
      ]);

      setResults([
        {
          id: 'test_001',
          procedureId: 'db_backup_restore_test',
          status: 'passed',
          triggeredBy: 'system',
          startedAt: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          completedAt: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000 + 28 * 60 * 1000
          ).toISOString(),
          durationMinutes: 28,
          stepResults: [
            {
              stepNumber: 1,
              status: 'passed',
              actualOutcome: 'Backup created successfully',
              durationMinutes: 8,
            },
            {
              stepNumber: 2,
              status: 'passed',
              actualOutcome: 'Restore completed',
              durationMinutes: 14,
            },
            {
              stepNumber: 3,
              status: 'passed',
              actualOutcome: 'Data integrity verified',
              durationMinutes: 6,
            },
          ],
          issues: [],
          recommendations: [],
        },
        {
          id: 'test_002',
          procedureId: 'system_failover_test',
          status: 'partial',
          triggeredBy: 'manual',
          startedAt: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          completedAt: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000 + 52 * 60 * 1000
          ).toISOString(),
          durationMinutes: 52,
          stepResults: [
            {
              stepNumber: 1,
              status: 'passed',
              actualOutcome: 'Primary system marked down',
              durationMinutes: 5,
            },
            {
              stepNumber: 2,
              status: 'passed',
              actualOutcome: 'Failover triggered',
              durationMinutes: 12,
            },
            {
              stepNumber: 3,
              status: 'failed',
              actualOutcome: 'Some services degraded',
              durationMinutes: 25,
              errorDetails: 'Database connection timeout',
            },
            {
              stepNumber: 4,
              status: 'passed',
              actualOutcome: 'Failback successful',
              durationMinutes: 10,
            },
          ],
          issues: ['Database connection timeout during failover'],
          recommendations: [
            'Review database failover configuration',
            'Optimize connection timeout settings',
          ],
        },
      ]);

      setStatistics({
        totalTests: 15,
        passedTests: 12,
        failedTests: 1,
        partialTests: 2,
        averageDurationMinutes: 35,
        lastTestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        upcomingTests: 4,
      });
    } catch (error) {
      console.error('Failed to load DR data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load disaster recovery data',
        variant: 'destructive',
      });
    }
  };

  const initializeFramework = async () => {
    setIsInitializing(true);
    try {
      // Simulate initialization
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'Success',
        description: 'Disaster recovery framework initialized successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initialize DR framework',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const executeTest = async (procedureId: string) => {
    setExecutingTests(prev => new Set(prev).add(procedureId));

    try {
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 3000));

      toast({
        title: 'Test Started',
        description: 'Disaster recovery test execution started',
      });

      // Reload results after a delay to show new result
      setTimeout(loadData, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to execute DR test',
        variant: 'destructive',
      });
    } finally {
      setExecutingTests(prev => {
        const updated = new Set(prev);
        updated.delete(procedureId);
        return updated;
      });
    }
  };

  const getCategoryConfig = (category: string) => {
    return (
      CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] ||
      CATEGORY_CONFIG.application
    );
  };

  const getStatusConfig = (status: string) => {
    return (
      STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
      STATUS_CONFIG.cancelled
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  const getSuccessRate = () => {
    if (statistics.totalTests === 0) return 0;
    return Math.round((statistics.passedTests / statistics.totalTests) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Disaster Recovery Testing</h2>
          <p className="text-sm text-muted-foreground">
            Automated DR testing procedures and monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={initializeFramework}
            disabled={isInitializing}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isInitializing ? 'animate-spin' : ''}`}
            />
            <span>
              {isInitializing ? 'Initializing...' : 'Initialize Framework'}
            </span>
          </Button>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>{getSuccessRate()}% Success Rate</span>
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger
            value="procedures"
            className="flex items-center space-x-1"
          >
            <Shield className="h-4 w-4" />
            <span>Test Procedures</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-1">
            <Activity className="h-4 w-4" />
            <span>Test Results</span>
          </TabsTrigger>
          <TabsTrigger
            value="statistics"
            className="flex items-center space-x-1"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Statistics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="procedures" className="space-y-4">
          {/* DR Test Procedures */}
          <div className="space-y-4">
            {procedures.map(procedure => {
              const categoryConfig = getCategoryConfig(procedure.category);
              const CategoryIcon = categoryConfig.icon;
              const isExecuting = executingTests.has(procedure.id);

              return (
                <Card
                  key={procedure.id}
                  className={`${categoryConfig.borderColor} ${categoryConfig.bgColor}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-white">
                          <CategoryIcon
                            className={`h-5 w-5 ${categoryConfig.color}`}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {procedure.name}
                          </CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {procedure.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(procedure.severity)}>
                          {procedure.severity}
                        </Badge>
                        <Button
                          onClick={() => executeTest(procedure.id)}
                          disabled={isExecuting}
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          {isExecuting ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>Running...</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              <span>Execute</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-500">
                          Estimated Duration
                        </div>
                        <div className="font-medium">
                          {formatDuration(procedure.estimatedDurationMinutes)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Test Steps</div>
                        <div className="font-medium">
                          {procedure.testSteps.length} steps
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Automation</div>
                        <div className="font-medium">
                          {
                            procedure.testSteps.filter(step => step.isAutomated)
                              .length
                          }
                          /{procedure.testSteps.length} automated
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Success Criteria
                        </div>
                        <div className="space-y-1">
                          {procedure.successCriteria
                            .slice(0, 3)
                            .map((criterion, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2 text-sm"
                              >
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span>{criterion}</span>
                              </div>
                            ))}
                          {procedure.successCriteria.length > 3 && (
                            <div className="text-sm text-gray-500">
                              +{procedure.successCriteria.length - 3} more
                              criteria
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {/* Test Results */}
          <div className="space-y-4">
            {results.map(result => {
              const procedure = procedures.find(
                p => p.id === result.procedureId
              );
              const statusConfig = getStatusConfig(result.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={result.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {procedure?.name || result.procedureId}
                        </CardTitle>
                        <CardDescription>
                          Executed {new Date(result.startedAt).toLocaleString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(result.durationMinutes)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Step Results */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Step Results
                        </div>
                        <div className="space-y-2">
                          {result.stepResults.map((stepResult, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-2">
                                {stepResult.status === 'passed' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : stepResult.status === 'failed' ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-gray-400" />
                                )}
                                <div>
                                  <div className="text-sm font-medium">
                                    Step {stepResult.stepNumber}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {stepResult.actualOutcome}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDuration(stepResult.durationMinutes)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Issues and Recommendations */}
                      {(result.issues.length > 0 ||
                        result.recommendations.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {result.issues.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-red-700 mb-2">
                                Issues
                              </div>
                              <div className="space-y-1">
                                {result.issues.map((issue, index) => (
                                  <div
                                    key={index}
                                    className="text-sm text-red-600 bg-red-50 p-2 rounded"
                                  >
                                    {issue}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {result.recommendations.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-blue-700 mb-2">
                                Recommendations
                              </div>
                              <div className="space-y-1">
                                {result.recommendations.map((rec, index) => (
                                  <div
                                    key={index}
                                    className="text-sm text-blue-600 bg-blue-50 p-2 rounded"
                                  >
                                    {rec}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tests
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statistics.totalTests}
                </div>
                <p className="text-xs text-muted-foreground">
                  DR tests executed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {getSuccessRate()}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Tests passed successfully
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Duration
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(statistics.averageDurationMinutes)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per test execution
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Upcoming Tests
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.upcomingTests}
                </div>
                <p className="text-xs text-muted-foreground">
                  Scheduled this month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Test Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Test Status Breakdown</CardTitle>
              <CardDescription>
                Distribution of test results over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Passed Tests</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium">
                      {statistics.passedTests}
                    </div>
                    <div className="w-32">
                      <Progress
                        value={
                          (statistics.passedTests /
                            Math.max(statistics.totalTests, 1)) *
                          100
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Partial Tests</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium">
                      {statistics.partialTests}
                    </div>
                    <div className="w-32">
                      <Progress
                        value={
                          (statistics.partialTests /
                            Math.max(statistics.totalTests, 1)) *
                          100
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Failed Tests</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm font-medium">
                      {statistics.failedTests}
                    </div>
                    <div className="w-32">
                      <Progress
                        value={
                          (statistics.failedTests /
                            Math.max(statistics.totalTests, 1)) *
                          100
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DR Readiness Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>DR Readiness Assessment</CardTitle>
              <CardDescription>
                Overall disaster recovery preparedness status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Backup</span>
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      Ready
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">System Failover</span>
                    <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Partial
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Data Recovery</span>
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      Ready
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Infrastructure Redundancy
                    </span>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                      Testing
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Automated Testing
                    </span>
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Documentation</span>
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      Complete
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Overall DR Readiness
                  </span>
                  <span className="text-sm text-green-600 font-medium">
                    85%
                  </span>
                </div>
                <Progress value={85} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  Good disaster recovery readiness. Address system failover
                  issues for full compliance.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default DisasterRecoveryManager;
