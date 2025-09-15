/**
 * A/B Testing Demo Page - Shows how to integrate A/B tests with components
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ABTestComponent } from '@/components/ABTestComponent';
import { useABTest } from '@/hooks/useABTest';
import { ABTestManager } from '@/lib/abTesting';
import {
  Beaker,
  Target,
  TrendingUp,
  Users,
  CheckCircle,
  AlertTriangle,
  Code,
  Zap,
  Mail,
  Phone,
  Calendar,
  MousePointer,
} from 'lucide-react';

// Example A/B tested components
type ButtonConfig = {
  color: 'blue' | 'green' | 'orange' | 'red';
  text: string;
  size: 'small' | 'default' | 'large';
};

function ABTestedButton({
  variant,
  trackConversion,
}: {
  variant?: ButtonConfig;
  trackConversion?: (value?: number) => void;
}) {
  const config = variant || {
    color: 'blue' as const,
    text: 'Get Started',
    size: 'default' as const,
  };

  const colorClasses: Record<ButtonConfig['color'], string> = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    orange: 'bg-orange-600 hover:bg-orange-700',
    red: 'bg-red-600 hover:bg-red-700',
  };

  const sizeClasses: Record<ButtonConfig['size'], string> = {
    small: 'px-3 py-1 text-sm',
    default: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <Button
      className={`text-white ${colorClasses[config.color]} ${sizeClasses[config.size]}`}
      onClick={() => trackConversion?.(1)}
    >
      {config.text}
    </Button>
  );
}

type FormConfig = {
  title: string;
  fields: string[];
  buttonText: string;
  layout: 'vertical' | 'horizontal';
};

function ABTestedForm({
  variant,
  trackConversion,
}: {
  variant?: FormConfig;
  trackConversion?: (value?: number) => void;
}) {
  const config = variant || {
    title: 'Get Started Today',
    fields: ['email'],
    buttonText: 'Subscribe',
    layout: 'vertical',
  };

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      trackConversion?.(1);
      alert('Thank you for signing up!');
      setEmail('');
      setPhone('');
      setName('');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className={`space-y-4 ${config.layout === 'horizontal' ? 'flex flex-row space-y-0 space-x-2' : ''}`}
        >
          {config.fields.includes('name') && (
            <input
              type="text"
              placeholder="Your name"
              className="w-full px-3 py-2 border rounded"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          )}

          {config.fields.includes('email') && (
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-3 py-2 border rounded"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          )}

          {config.fields.includes('phone') && (
            <input
              type="tel"
              placeholder="Phone number"
              className="w-full px-3 py-2 border rounded"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          )}

          <Button type="submit" className="w-full">
            {config.buttonText}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ABTestingDemo() {
  const [manualConversions, setManualConversions] = useState<
    Record<string, number>
  >({});

  // Create demo tests if they don't exist
  React.useEffect(() => {
    // Button color test
    const buttonTest = ABTestManager.getTest('demo-button-test');
    if (!buttonTest) {
      ABTestManager.createTest({
        name: 'CTA Button Color Test',
        description: 'Testing different button colors for better conversion',
        status: 'running',
        startDate: new Date().toISOString(),
        targetMetric: 'click_through_rate',
        trafficAllocation: 100,
        minimumSampleSize: 100,
        confidenceLevel: 0.95,
        variants: [
          {
            id: 'control',
            name: 'Blue Button',
            description: 'Original blue button',
            isControl: true,
            trafficWeight: 25,
            config: { color: 'blue', text: 'Get Started', size: 'default' },
            metrics: { impressions: 0, conversions: 0, conversionRate: 0 },
          },
          {
            id: 'variant-green',
            name: 'Green Button',
            description: 'Green button variant',
            isControl: false,
            trafficWeight: 25,
            config: { color: 'green', text: 'Get Started', size: 'default' },
            metrics: { impressions: 0, conversions: 0, conversionRate: 0 },
          },
          {
            id: 'variant-orange',
            name: 'Orange Button',
            description: 'Orange button variant',
            isControl: false,
            trafficWeight: 25,
            config: {
              color: 'orange',
              text: 'Start Free Trial',
              size: 'large',
            },
            metrics: { impressions: 0, conversions: 0, conversionRate: 0 },
          },
          {
            id: 'variant-red',
            name: 'Red Button',
            description: 'Red button variant',
            isControl: false,
            trafficWeight: 25,
            config: { color: 'red', text: 'Join Now', size: 'default' },
            metrics: { impressions: 0, conversions: 0, conversionRate: 0 },
          },
        ],
        createdBy: 'demo-user',
      });
    }

    // Form layout test
    const formTest = ABTestManager.getTest('demo-form-test');
    if (!formTest) {
      ABTestManager.createTest({
        name: 'Signup Form Optimization',
        description: 'Testing form layouts and field combinations',
        status: 'running',
        startDate: new Date().toISOString(),
        targetMetric: 'email_signup',
        trafficAllocation: 100,
        minimumSampleSize: 50,
        confidenceLevel: 0.95,
        variants: [
          {
            id: 'control-form',
            name: 'Email Only',
            description: 'Simple email-only form',
            isControl: true,
            trafficWeight: 33,
            config: {
              title: 'Subscribe to Newsletter',
              fields: ['email'],
              buttonText: 'Subscribe',
              layout: 'vertical',
            },
            metrics: { impressions: 0, conversions: 0, conversionRate: 0 },
          },
          {
            id: 'variant-detailed',
            name: 'Detailed Form',
            description: 'Form with name, email, and phone',
            isControl: false,
            trafficWeight: 33,
            config: {
              title: 'Get Full Access',
              fields: ['name', 'email', 'phone'],
              buttonText: 'Get Started',
              layout: 'vertical',
            },
            metrics: { impressions: 0, conversions: 0, conversionRate: 0 },
          },
          {
            id: 'variant-horizontal',
            name: 'Horizontal Layout',
            description: 'Horizontal email form',
            isControl: false,
            trafficWeight: 34,
            config: {
              title: 'Quick Signup',
              fields: ['email'],
              buttonText: 'Go',
              layout: 'horizontal',
            },
            metrics: { impressions: 0, conversions: 0, conversionRate: 0 },
          },
        ],
        createdBy: 'demo-user',
      });
    }
  }, []);

  const buttonTest = useABTest({
    testId: 'demo-button-test',
    userId: 'demo-user-1',
  });

  const formTest = useABTest({
    testId: 'demo-form-test',
    userId: 'demo-user-1',
  });

  const simulateConversions = (testId: string) => {
    const count = (manualConversions[testId] || 0) + 1;
    setManualConversions(prev => ({ ...prev, [testId]: count }));

    // Track actual conversion event
    const test = ABTestManager.getTest(testId);
    if (test) {
      const variant =
        test.variants[Math.floor(Math.random() * test.variants.length)];
      ABTestManager.trackEvent({
        testId,
        variantId: variant.id,
        userId: `sim-user-${Date.now()}`,
        sessionId: `sim-session-${Date.now()}`,
        eventType: 'conversion',
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">A/B Testing Framework</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Systematically optimize conversion rates with data-driven experiments
          and statistical analysis.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold">Statistical Testing</p>
                  <p className="text-sm text-gray-600">
                    95% confidence intervals
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Beaker className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-semibold">Easy Integration</p>
                  <p className="text-sm text-gray-600">
                    React hooks & components
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="font-semibold">Real-time Results</p>
                  <p className="text-sm text-gray-600">
                    Live performance tracking
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="examples" className="space-y-6">
        <TabsList>
          <TabsTrigger value="examples">Live Examples</TabsTrigger>
          <TabsTrigger value="integration">Integration Guide</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="examples" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Button Test Example */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="h-5 w-5" />
                  CTA Button Test
                </CardTitle>
                <CardDescription>
                  Testing different button colors and text for optimal
                  conversion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-medium mb-3">Your Assigned Variant:</h4>
                  <div className="text-center">
                    <ABTestComponent testId="demo-button-test">
                      {(props: {
                        variant?: ButtonConfig;
                        trackConversion?: (value?: number) => void;
                      }) => <ABTestedButton {...props} />}
                    </ABTestComponent>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Test Status:</span>
                    <Badge className="bg-green-100 text-green-800">
                      Running
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Your Variant:</span>
                    <span className="font-mono">
                      {buttonTest.variant?.name || 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Impressions:</span>
                    <span>{buttonTest.variant?.metrics.impressions || 0}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateConversions('demo-button-test')}
                  className="w-full"
                >
                  Simulate {manualConversions['demo-button-test'] || 0}{' '}
                  Conversions
                </Button>
              </CardContent>
            </Card>

            {/* Form Test Example */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Signup Form Test
                </CardTitle>
                <CardDescription>
                  Optimizing form layout and field combinations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <h4 className="font-medium mb-3">Your Assigned Variant:</h4>
                  <div className="flex justify-center">
                    <ABTestComponent testId="demo-form-test">
                      {(props: {
                        variant?: FormConfig;
                        trackConversion?: (value?: number) => void;
                      }) => <ABTestedForm {...props} />}
                    </ABTestComponent>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Test Status:</span>
                    <Badge className="bg-green-100 text-green-800">
                      Running
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Your Variant:</span>
                    <span className="font-mono">
                      {formTest.variant?.name || 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Conversions:</span>
                    <span>{formTest.variant?.metrics.conversions || 0}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateConversions('demo-form-test')}
                  className="w-full"
                >
                  Simulate {manualConversions['demo-form-test'] || 0}{' '}
                  Conversions
                </Button>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              <strong>Live Demo:</strong> These are real A/B tests running in
              your browser! Click the buttons and submit forms to generate
              conversion events, then check the Analytics tab to see statistical
              analysis in real-time.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Integration Examples
              </CardTitle>
              <CardDescription>
                Learn how to add A/B testing to your components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">
                  1. Using the useABTest Hook
                </h4>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                  {`import { useABTest } from '@/hooks/useABTest';

function MyComponent() {
  const { variant, trackConversion } = useABTest({
    testId: 'button-color-test',
    userId: 'user-123'
  });

  const buttonColor = variant?.config.color || 'blue';
  
  return (
    <button 
      className={\`bg-\${buttonColor}-600\`}
      onClick={() => trackConversion()}
    >
      {variant?.config.text || 'Click Me'}
    </button>
  );
}`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-3">
                  2. Using the ABTestComponent
                </h4>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                  {`import { ABTestComponent } from '@/components/ABTestComponent';

function MyPage() {
  return (
    <ABTestComponent testId="headline-test">
      {({ variant, trackConversion }) => (
        <div>
          <h1>{variant?.title}</h1>
          <button onClick={() => trackConversion()}>
            Sign Up
          </button>
        </div>
      )}
    </ABTestComponent>
  );
}`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-3">3. Creating Tests</h4>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
                  {`import { ABTestManager } from '@/lib/abTesting';

const test = ABTestManager.createTest({
  name: 'Homepage Headline Test',
  description: 'Testing different headlines',
  status: 'draft',
  targetMetric: 'email_signup',
  trafficAllocation: 50, // 50% of users
  minimumSampleSize: 1000,
  confidenceLevel: 0.95,
  variants: [
    {
      id: 'control',
      name: 'Original',
      isControl: true,
      trafficWeight: 50,
      config: { title: 'Welcome to Our Site' }
    },
    {
      id: 'variant-a',
      name: 'Action-Oriented',
      isControl: false,
      trafficWeight: 50,
      config: { title: 'Start Your Journey Today' }
    }
  ]
});`}
                </pre>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Key Features:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>
                    • <strong>Statistical Significance:</strong> Automatic
                    p-value and confidence interval calculation
                  </li>
                  <li>
                    • <strong>User Consistency:</strong> Same user always sees
                    the same variant
                  </li>
                  <li>
                    • <strong>Traffic Allocation:</strong> Control what
                    percentage of users enter the test
                  </li>
                  <li>
                    • <strong>Multiple Variants:</strong> Test more than just
                    A/B - support for A/B/C/D/... testing
                  </li>
                  <li>
                    • <strong>Conversion Tracking:</strong> Track any event as a
                    conversion (clicks, signups, purchases)
                  </li>
                  <li>
                    • <strong>Real-time Analytics:</strong> Live statistical
                    analysis and recommendations
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Test Performance Analytics
              </CardTitle>
              <CardDescription>
                Real-time statistical analysis of your A/B tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['demo-button-test', 'demo-form-test'].map(testId => {
                  const test = ABTestManager.getTest(testId);
                  const results = ABTestManager.getTestResults(testId);

                  if (!test || !results) return null;

                  return (
                    <div key={testId} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-4">{test.name}</h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {results.confidence.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">
                            Confidence
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {results.liftPercentage > 0 ? '+' : ''}
                            {results.liftPercentage.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">Lift</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {results.pValue.toFixed(4)}
                          </div>
                          <div className="text-sm text-gray-600">P-Value</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {results.results.map(result => (
                          <div
                            key={result.variantId}
                            className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded p-3"
                          >
                            <div>
                              <span className="font-medium">{result.name}</span>
                              {result.isControl && (
                                <Badge variant="outline" className="ml-2">
                                  Control
                                </Badge>
                              )}
                              {results.winner === result.variantId && (
                                <Badge className="ml-2 bg-green-100 text-green-800">
                                  Winner
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {result.metrics.conversionRate.toFixed(2)}%
                              </div>
                              <div className="text-xs text-gray-600">
                                {result.metrics.conversions}/
                                {result.metrics.impressions}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {results.isStatisticallySignificant ? (
                        <Alert className="mt-4">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Statistically Significant!</strong> We can
                            be {results.confidence.toFixed(1)}% confident that
                            the difference is real, not due to chance.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="mt-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Not Yet Significant.</strong> More data
                            needed to reach statistical significance. Current
                            confidence: {results.confidence.toFixed(1)}%
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })}

                {ABTestManager.getAllTests().length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No test data available yet</p>
                    <p className="text-sm text-gray-500">
                      Interact with the examples above to generate test data
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
