import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Settings, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Calculator,
  Code2,
  BookOpen,
  TestTube,
  Database
} from 'lucide-react';

interface PayrollRule {
  rule: string;
  version: string;
  description?: string;
  category: string;
  applies_to: string[];
  priority: number;
  effective_from: string;
  effective_to?: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    message?: string;
    to?: string;
    params?: any;
  }>;
  threshold?: number;
  rate?: number;
  formula?: string;
  metadata: Record<string, any>;
}

interface ValidationResult {
  type: string;
  rule: string;
  version: string;
  message?: string;
  severity?: string;
  blockFinalization?: boolean;
}

export default function RulesEngine() {
  const [selectedRule, setSelectedRule] = useState<PayrollRule | null>(null);
  const [dslContent, setDslContent] = useState('');
  const [testData, setTestData] = useState('');
  const [validationEmployee, setValidationEmployee] = useState('');
  const [validationSalary, setValidationSalary] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all rules
  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ['/api/rules'],
    retry: false,
  });

  // Fetch rule templates
  const { data: templatesData } = useQuery({
    queryKey: ['/api/rules/templates'],
    retry: false,
  });

  // Parse rule DSL mutation
  const parseRuleMutation = useMutation({
    mutationFn: async (data: { content: string; format: string }) => {
      return apiRequest('/api/rules/parse', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Rule Created",
        description: "Rule parsed and registered successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      setDslContent('');
    },
    onError: (error) => {
      toast({
        title: "Parse Error",
        description: String(error).replace('400: ', ''),
        variant: "destructive",
      });
    },
  });

  // Test rule mutation
  const testRuleMutation = useMutation({
    mutationFn: async (data: { rule: PayrollRule; testData: any }) => {
      return apiRequest('/api/rules/test', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });

  // Validate minimum wage mutation
  const validateWageMutation = useMutation({
    mutationFn: async (data: { employeeId: string; baseSalary: number }) => {
      return apiRequest('/api/rules/validate/minimum-wage', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });

  const handleParseRule = () => {
    if (!dslContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter rule content",
        variant: "destructive",
      });
      return;
    }
    parseRuleMutation.mutate({ content: dslContent, format: 'yaml' });
  };

  const handleTestRule = () => {
    if (!selectedRule || !testData.trim()) {
      toast({
        title: "Error",
        description: "Please select a rule and provide test data",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const parsedTestData = JSON.parse(testData);
      testRuleMutation.mutate({ rule: selectedRule, testData: parsedTestData });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON in test data",
        variant: "destructive",
      });
    }
  };

  const handleValidateWage = () => {
    if (!validationEmployee || !validationSalary) {
      toast({
        title: "Error",
        description: "Please provide employee ID and salary",
        variant: "destructive",
      });
      return;
    }
    validateWageMutation.mutate({
      employeeId: validationEmployee,
      baseSalary: parseFloat(validationSalary)
    });
  };

  const loadTemplate = (category: string) => {
    if (templatesData?.templates?.[category]) {
      setDslContent(templatesData.templates[category]);
    }
  };

  // Example DSL content for demo
  const exampleDSL = `rule: "NightHoursExample"
version: "2025.01"
description: "25% premium for night work hours with time bands"
category: "time_bands"
applies_to: ["nightPremium"]
priority: 15
effective_from: "2025-01-01"
condition: "shift.overlaps_night_band = true"
premium: 0.25
band:
  start: "22:00"
  end: "06:00"
  crossesMidnight: true
action_on_violation:
  - type: "calculate"
metadata:
  calculation_method: "hourly overlap with 25% premium"
  legal_reference: "Greek Labor Law - Night Work Premium"
  ergani_compliance: "ERGANI II time tracking requirements"`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Rules Engine (DSL)
          </h1>
          <p className="text-muted-foreground mt-2">
            Human-readable YAML/JSON DSL for Greek payroll compliance rules with versioning & effective dates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {rulesData?.rules?.length || 0} Rules
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            {rulesData?.categories?.length || 0} Categories
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Create Rule
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test Rules
          </TabsTrigger>
          <TabsTrigger value="validate" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Live Validation
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Browse Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rulesData?.rules?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Across {rulesData?.categories?.length || 0} categories</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Categories</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">10</div>
                <p className="text-xs text-muted-foreground">Minimum wage, overtime, premiums</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Effective Date</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2025-01</div>
                <p className="text-xs text-muted-foreground">Current rule version</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rules Engine Capabilities</CardTitle>
              <CardDescription>
                Comprehensive DSL for Greek payroll compliance with versioning and effective date management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Rule Categories</h4>
                  <div className="flex flex-wrap gap-1">
                    {rulesData?.categories?.map((category: string) => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• YAML/JSON DSL parsing</li>
                    <li>• Version management & effective dates</li>
                    <li>• Condition evaluation & actions</li>
                    <li>• Mathematical formula support</li>
                    <li>• Real-time validation</li>
                    <li>• Audit trails & compliance</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Rule with DSL</CardTitle>
              <CardDescription>
                Write rules in human-readable YAML format with versioning and effective dates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Label htmlFor="template">Load Template:</Label>
                <Select onValueChange={loadTemplate}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimum_wage">Minimum Wage</SelectItem>
                    <SelectItem value="overtime">Overtime Calculation</SelectItem>
                    <SelectItem value="time_bands">Time Bands & Night Hours</SelectItem>
                    <SelectItem value="ergani_routing">ERGANI Routing</SelectItem>
                    <SelectItem value="allowances">Allowances</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDslContent(exampleDSL)}
                >
                  Load Example
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dsl-content">Rule Definition (YAML)</Label>
                <Textarea
                  id="dsl-content"
                  placeholder="Enter your rule definition in YAML format..."
                  value={dslContent}
                  onChange={(e) => setDslContent(e.target.value)}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleParseRule}
                  disabled={parseRuleMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {parseRuleMutation.isPending ? 'Parsing...' : 'Parse & Register Rule'}
                </Button>
              </div>

              {parseRuleMutation.data && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Rule "{parseRuleMutation.data.rule}" v{parseRuleMutation.data.version} created successfully
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Rule Engine</CardTitle>
              <CardDescription>
                Test rules against sample data to validate behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Rule to Test</Label>
                  <Select onValueChange={(value) => {
                    const rule = rulesData?.rules?.find((r: PayrollRule) => r.rule === value);
                    setSelectedRule(rule || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a rule" />
                    </SelectTrigger>
                    <SelectContent>
                      {rulesData?.rules?.map((rule: PayrollRule) => (
                        <SelectItem key={`${rule.rule}-${rule.version}`} value={rule.rule}>
                          {rule.rule} v{rule.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Test Data (JSON)</Label>
                  <Textarea
                    placeholder='{"employee": {"contract": {"type": "indefinite"}}, "baseSalary": 850}'
                    value={testData}
                    onChange={(e) => setTestData(e.target.value)}
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleTestRule}
                disabled={testRuleMutation.isPending}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {testRuleMutation.isPending ? 'Testing...' : 'Test Rule'}
              </Button>

              {testRuleMutation.data && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Test Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      {testRuleMutation.data.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-semibold">
                        {testRuleMutation.data.passed ? 'Test Passed' : 'Test Failed'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>Conditions Met: {testRuleMutation.data.summary.conditionsMet ? 'Yes' : 'No'}</p>
                      <p>Actions Triggered: {testRuleMutation.data.summary.actionsTriggered}</p>
                      <p>Violations: {testRuleMutation.data.summary.violations}</p>
                      <p>Calculations: {testRuleMutation.data.summary.calculations}</p>
                    </div>
                    
                    {testRuleMutation.data.results?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Results:</h4>
                        {testRuleMutation.data.results.map((result: ValidationResult, index: number) => (
                          <Alert key={index} className={result.type === 'violation' ? 'border-red-200' : 'border-blue-200'}>
                            <AlertDescription>
                              <span className="font-semibold">{result.type}:</span> {result.message}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Minimum Wage Validation</CardTitle>
                <CardDescription>
                  Validate employee salary against Greek minimum wage requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee-id">Employee ID</Label>
                    <Input
                      id="employee-id"
                      placeholder="EMP001"
                      value={validationEmployee}
                      onChange={(e) => setValidationEmployee(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="salary">Base Salary (€)</Label>
                    <Input
                      id="salary"
                      type="number"
                      placeholder="880.00"
                      value={validationSalary}
                      onChange={(e) => setValidationSalary(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleValidateWage}
                  disabled={validateWageMutation.isPending}
                  className="flex items-center gap-2 w-full"
                >
                  <Calculator className="h-4 w-4" />
                  {validateWageMutation.isPending ? 'Validating...' : 'Validate Minimum Wage'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Band Validation</CardTitle>
                <CardDescription>
                  Calculate premiums for night hours and time-based work
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shift Start</Label>
                    <Input
                      type="time"
                      defaultValue="22:00"
                      id="shift-start"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Shift End</Label>
                    <Input
                      type="time"
                      defaultValue="06:00"
                      id="shift-end"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Hourly Rate (€)</Label>
                  <Input
                    type="number"
                    placeholder="5.50"
                    id="hourly-rate"
                  />
                </div>
                
                <Button 
                  className="flex items-center gap-2 w-full"
                  onClick={() => {
                    const shiftStart = (document.getElementById('shift-start') as HTMLInputElement)?.value;
                    const shiftEnd = (document.getElementById('shift-end') as HTMLInputElement)?.value;
                    const hourlyRate = parseFloat((document.getElementById('hourly-rate') as HTMLInputElement)?.value || '0');
                    
                    if (!shiftStart || !shiftEnd || !hourlyRate) {
                      toast({
                        title: "Error",
                        description: "Please provide shift times and hourly rate",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Simulate time band validation
                    toast({
                      title: "Time Band Calculated",
                      description: `Night premium: €${(hourlyRate * 0.25 * 8).toFixed(2)} for 22:00-06:00 shift`,
                    });
                  }}
                >
                  <Clock className="h-4 w-4" />
                  Calculate Time Band Premium
                </Button>
              </CardContent>
            </Card>
          </div>

          {validateWageMutation.data && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {validateWageMutation.data.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  Validation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p><strong>Employee:</strong> {validateWageMutation.data.employeeId}</p>
                  <p><strong>Base Salary:</strong> €{validateWageMutation.data.baseSalary}</p>
                  <p><strong>Valid:</strong> {validateWageMutation.data.isValid ? 'Yes' : 'No'}</p>
                </div>
                
                {validateWageMutation.data.violations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-red-600">Violations:</h4>
                    {validateWageMutation.data.violations.map((violation: ValidationResult, index: number) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{violation.rule} v{violation.version}:</strong> {violation.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
                
                {validateWageMutation.data.alerts?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-amber-600">Alerts:</h4>
                    {validateWageMutation.data.alerts.map((alert: ValidationResult, index: number) => (
                      <Alert key={index}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{alert.rule} v{alert.version}:</strong> {alert.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="browse" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Browse Active Rules</CardTitle>
              <CardDescription>
                View all currently active payroll compliance rules with their definitions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <p className="text-muted-foreground">Loading rules...</p>
              ) : (
                <div className="space-y-4">
                  {rulesData?.rules?.map((rule: PayrollRule) => (
                    <Card key={`${rule.rule}-${rule.version}`} className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{rule.rule}</CardTitle>
                            <Badge variant="outline">v{rule.version}</Badge>
                            <Badge variant="secondary">{rule.category.replace('_', ' ')}</Badge>
                          </div>
                          <Badge variant="outline" className="flex items-center gap-1">
                            Priority {rule.priority}
                          </Badge>
                        </div>
                        <CardDescription>{rule.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm space-y-1">
                          <p><strong>Applies to:</strong> {rule.applies_to.join(', ')}</p>
                          <p><strong>Effective:</strong> {rule.effective_from} {rule.effective_to && `- ${rule.effective_to}`}</p>
                          {rule.threshold && <p><strong>Threshold:</strong> €{rule.threshold}</p>}
                          {rule.rate && <p><strong>Rate:</strong> {rule.rate}x</p>}
                          {rule.formula && <p><strong>Formula:</strong> <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{rule.formula}</code></p>}
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          <p><strong>Conditions:</strong> {rule.conditions.length} condition(s)</p>
                          <p><strong>Actions:</strong> {rule.actions.map(a => a.type).join(', ')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}