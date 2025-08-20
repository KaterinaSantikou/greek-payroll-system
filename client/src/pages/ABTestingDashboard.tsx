/**
 * A/B Testing Dashboard - Manage and analyze conversion optimization tests
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useABTestManager } from '@/hooks/useABTest';
import { ABTestManager, ABTestStatistics, type ABTest, type ABVariant, type ABTestResult } from '@/lib/abTesting';
import {
  Play,
  Pause,
  Square,
  Plus,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Eye,
  MousePointer
} from 'lucide-react';

export default function ABTestingDashboard() {
  const { tests, isLoading, createTest, startTest, stopTest, getTestResults, refreshTests } = useABTestManager();
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    targetMetric: 'conversion_rate',
    trafficAllocation: 100,
    minimumSampleSize: 1000,
    confidenceLevel: 0.95,
    variants: [
      { name: 'Control', description: 'Original version', isControl: true, trafficWeight: 50, config: {} },
      { name: 'Variant A', description: 'Test variation', isControl: false, trafficWeight: 50, config: {} }
    ]
  });

  const [testResults, setTestResults] = useState<Record<string, ABTestResult>>({});

  React.useEffect(() => {
    // Load results for all completed tests
    tests.forEach(test => {
      if (test.status === 'running' || test.status === 'completed') {
        const results = getTestResults(test.id);
        if (results) {
          setTestResults(prev => ({ ...prev, [test.id]: results }));
        }
      }
    });
  }, [tests, getTestResults]);

  const handleCreateTest = () => {
    if (!newTest.name || newTest.variants.length < 2) return;

    const testData = {
      ...newTest,
      status: 'draft' as const,
      startDate: new Date().toISOString(),
      variants: newTest.variants.map((v, index) => ({
        id: `variant-${index}`,
        ...v,
        metrics: {
          impressions: 0,
          conversions: 0,
          conversionRate: 0
        }
      })),
      createdBy: 'current-user'
    };

    createTest(testData);
    setShowCreateDialog(false);
    setNewTest({
      name: '',
      description: '',
      targetMetric: 'conversion_rate',
      trafficAllocation: 100,
      minimumSampleSize: 1000,
      confidenceLevel: 0.95,
      variants: [
        { name: 'Control', description: 'Original version', isControl: true, trafficWeight: 50, config: {} },
        { name: 'Variant A', description: 'Test variation', isControl: false, trafficWeight: 50, config: {} }
      ]
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'archived': return <Square className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  // Create some example tests if none exist
  React.useEffect(() => {
    if (tests.length === 0 && !isLoading) {
      // Create example Exit Intent Popup test
      const exitIntentTest = createTest({
        name: 'Exit Intent Popup - Button Color',
        description: 'Test different button colors for exit intent popup conversion',
        status: 'running',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Started yesterday
        targetMetric: 'email_signup',
        trafficAllocation: 80,
        minimumSampleSize: 500,
        confidenceLevel: 0.95,
        variants: [
          {
            id: 'control',
            name: 'Blue Button',
            description: 'Original blue button',
            isControl: true,
            trafficWeight: 50,
            config: { buttonColor: 'blue', buttonText: 'Start Free Trial' },
            metrics: { impressions: 1247, conversions: 89, conversionRate: 7.14, revenue: 0 }
          },
          {
            id: 'variant-a',
            name: 'Orange Button',
            description: 'High-contrast orange button',
            isControl: false,
            trafficWeight: 50,
            config: { buttonColor: 'orange', buttonText: 'Start Free Trial' },
            metrics: { impressions: 1203, conversions: 127, conversionRate: 10.56, revenue: 0 }
          }
        ],
        createdBy: 'demo-user'
      });

      // Simulate test events for realistic results
      for (let i = 0; i < 1247; i++) {
        ABTestManager.trackEvent({
          testId: exitIntentTest.id,
          variantId: 'control',
          userId: `user-${i}`,
          sessionId: `session-${i}`,
          eventType: 'impression'
        });
        if (i < 89) {
          ABTestManager.trackEvent({
            testId: exitIntentTest.id,
            variantId: 'control',
            userId: `user-${i}`,
            sessionId: `session-${i}`,
            eventType: 'conversion'
          });
        }
      }

      for (let i = 0; i < 1203; i++) {
        ABTestManager.trackEvent({
          testId: exitIntentTest.id,
          variantId: 'variant-a',
          userId: `user-${i + 2000}`,
          sessionId: `session-${i + 2000}`,
          eventType: 'impression'
        });
        if (i < 127) {
          ABTestManager.trackEvent({
            testId: exitIntentTest.id,
            variantId: 'variant-a',
            userId: `user-${i + 2000}`,
            sessionId: `session-${i + 2000}`,
            eventType: 'conversion'
          });
        }
      }

      refreshTests();
    }
  }, [tests.length, isLoading, createTest, refreshTests]);

  const runningTests = tests.filter(t => t.status === 'running');
  const completedTests = tests.filter(t => t.status === 'completed');
  const totalImpressions = tests.reduce((sum, test) => 
    sum + test.variants.reduce((varSum, variant) => varSum + variant.metrics.impressions, 0), 0
  );
  const totalConversions = tests.reduce((sum, test) => 
    sum + test.variants.reduce((varSum, variant) => varSum + variant.metrics.conversions, 0), 0
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-4">A/B Testing Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Optimize conversion rates systematically with data-driven experiments.
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New A/B Test</DialogTitle>
                <DialogDescription>
                  Design an experiment to optimize your conversion rates.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="testName">Test Name</Label>
                  <Input
                    id="testName"
                    value={newTest.name}
                    onChange={(e) => setNewTest({...newTest, name: e.target.value})}
                    placeholder="e.g., Landing Page Headline Test"
                  />
                </div>
                
                <div>
                  <Label htmlFor="testDescription">Description</Label>
                  <Textarea
                    id="testDescription"
                    value={newTest.description}
                    onChange={(e) => setNewTest({...newTest, description: e.target.value})}
                    placeholder="Describe what you're testing and why"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="targetMetric">Target Metric</Label>
                    <Select value={newTest.targetMetric} onValueChange={(value) => setNewTest({...newTest, targetMetric: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conversion_rate">Conversion Rate</SelectItem>
                        <SelectItem value="click_through_rate">Click-Through Rate</SelectItem>
                        <SelectItem value="email_signup">Email Signup</SelectItem>
                        <SelectItem value="trial_signup">Trial Signup</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="trafficAllocation">Traffic Allocation (%)</Label>
                    <Input
                      id="trafficAllocation"
                      type="number"
                      min="1"
                      max="100"
                      value={newTest.trafficAllocation}
                      onChange={(e) => setNewTest({...newTest, trafficAllocation: parseInt(e.target.value) || 100})}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTest}>
                  Create Test
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{runningTests.length}</p>
                  <p className="text-sm text-gray-600">Running Tests</p>
                </div>
                <Play className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Impressions</p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Conversions</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{completedTests.length}</p>
                  <p className="text-sm text-gray-600">Completed Tests</p>
                </div>
                <CheckCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Tests</TabsTrigger>
          <TabsTrigger value="completed">Completed Tests</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {runningTests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-600">No active tests</p>
                <p className="text-gray-500 mb-4">Create your first A/B test to start optimizing conversions</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Test
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {runningTests.map(test => {
                const results = testResults[test.id];
                return (
                  <Card key={test.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{test.name}</CardTitle>
                          <CardDescription>{test.description}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(test.status)}>
                          {getStatusIcon(test.status)}
                          <span className="ml-1">{test.status}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>Traffic Allocation:</span>
                          <span>{test.trafficAllocation}%</span>
                        </div>
                        
                        <div className="space-y-3">
                          {test.variants.map(variant => (
                            <div key={variant.id} className="border rounded p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{variant.name}</span>
                                {variant.isControl && <Badge variant="outline">Control</Badge>}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                                <div>
                                  <div className="font-medium">{variant.metrics.impressions}</div>
                                  <div className="text-xs">Impressions</div>
                                </div>
                                <div>
                                  <div className="font-medium">{variant.metrics.conversions}</div>
                                  <div className="text-xs">Conversions</div>
                                </div>
                                <div>
                                  <div className="font-medium">{variant.metrics.conversionRate.toFixed(2)}%</div>
                                  <div className="text-xs">Conv. Rate</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {results && (
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">Statistical Significance</span>
                              {results.isStatisticallySignificant ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Significant
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Collecting Data
                                </Badge>
                              )}
                            </div>
                            <Progress value={results.confidence} className="h-2" />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>{results.confidence.toFixed(1)}% Confidence</span>
                              <span>Target: {(test.confidenceLevel * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedTest(test)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => stopTest(test.id)}
                          >
                            <Square className="h-4 w-4 mr-1" />
                            Stop Test
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {completedTests.map(test => {
              const results = testResults[test.id];
              return (
                <Card key={test.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                        <CardDescription>{test.description}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(test.status)}>
                        {getStatusIcon(test.status)}
                        <span className="ml-1">{test.status}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {results && (
                      <div className="space-y-4">
                        {results.isStatisticallySignificant ? (
                          <Alert>
                            <TrendingUp className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Winner Found!</strong> {results.winner && test.variants.find(v => v.id === results.winner)?.name} 
                              {' '}performed {Math.abs(results.liftPercentage).toFixed(1)}% better ({results.confidence.toFixed(1)}% confidence).
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              No statistically significant difference found. Consider running longer or testing a bigger change.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-3">
                          {results.results.map(result => (
                            <div key={result.variantId} className="border rounded p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{result.name}</span>
                                <div className="flex gap-2">
                                  {result.isControl && <Badge variant="outline">Control</Badge>}
                                  {results.winner === result.variantId && (
                                    <Badge className="bg-green-100 text-green-800">Winner</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="font-medium">{result.metrics.conversionRate.toFixed(2)}%</div>
                                  <div className="text-xs text-gray-500">Conversion Rate</div>
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {result.confidenceInterval.lower.toFixed(1)}% - {result.confidenceInterval.upper.toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-gray-500">95% Confidence Interval</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistical Analysis</CardTitle>
              <CardDescription>Deep dive into your test results and statistical significance</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.values(testResults).length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No test results available yet</p>
                  <p className="text-sm text-gray-500">Results will appear here once tests start collecting data</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(testResults).map(([testId, results]) => {
                    const test = tests.find(t => t.id === testId);
                    if (!test) return null;

                    return (
                      <div key={testId} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">{test.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {results.confidence.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Confidence Level</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {results.liftPercentage > 0 ? '+' : ''}{results.liftPercentage.toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">Conversion Lift</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {results.pValue.toFixed(4)}
                            </div>
                            <div className="text-sm text-gray-600">P-Value</div>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-sm">
                          <strong>Recommendation:</strong> {' '}
                          {results.recommendedAction === 'stop_winner' && 'Stop the test and implement the winning variant.'}
                          {results.recommendedAction === 'stop_no_winner' && 'Stop the test - no significant difference found.'}
                          {results.recommendedAction === 'continue' && 'Continue running the test to collect more data.'}
                          {results.recommendedAction === 'extend' && 'Consider extending the test duration.'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}