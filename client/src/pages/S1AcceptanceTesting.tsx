import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, DownloadIcon, PlayIcon, SettingsIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface AcceptanceCriteriaResult {
  status: 'pass' | 'fail' | 'pending';
  message: string;
  data?: any;
  error?: string;
}

export default function S1AcceptanceTesting() {
  const [fiscalYear, setFiscalYear] = useState('2024');
  const [selectedEntity, setSelectedEntity] = useState('hq-athens');
  const [selectedCountry, setSelectedCountry] = useState('GRC');
  
  // Test Results State
  const [testResults, setTestResults] = useState<Record<string, AcceptanceCriteriaResult>>({
    ac1: { status: 'pending', message: 'Click "Test AC1" to run S1-16 calculations' },
    ac2: { status: 'pending', message: 'Click "Test AC2" to validate XBRL export' },
    ac3: { status: 'pending', message: 'Click "Test AC3" to test ruleset switching' },
    ac4: { status: 'pending', message: 'Click "Test AC4" to generate evidence pack' },
  });

  // AC1: S1-16 Metrics Test
  const testAC1 = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/csrd/s1-16-metrics/${fiscalYear}?entity=${selectedEntity}&country=${selectedCountry}`);
      if (!response.ok) throw new Error('AC1 test failed');
      return response.json();
    },
    onSuccess: (data) => {
      const hasGenderPayGap = data.genderPayGap && typeof data.genderPayGap.value === 'number';
      const hasRatio = data.highestToMedianRatio && typeof data.highestToMedianRatio.value === 'number';
      const hasMethodNotes = data.genderPayGap?.methodNote && data.highestToMedianRatio?.methodNote;
      const hasPopulationCounts = data.genderPayGap?.populationCounts && data.highestToMedianRatio?.populationCounts;
      
      const allPassed = hasGenderPayGap && hasRatio && hasMethodNotes && hasPopulationCounts;
      
      setTestResults(prev => ({
        ...prev,
        ac1: {
          status: allPassed ? 'pass' : 'fail',
          message: allPassed 
            ? `✓ S1-16 calculations complete. GPG: ${data.genderPayGap.value.toFixed(1)}%, Ratio: ${data.highestToMedianRatio.value.toFixed(1)}:1`
            : 'Failed: Missing required S1-16 calculations, method notes, or population counts',
          data
        }
      }));
    },
    onError: (error) => {
      setTestResults(prev => ({
        ...prev,
        ac1: { status: 'fail', message: `AC1 Failed: ${error.message}`, error: error.message }
      }));
    }
  });

  // AC2: XBRL Export Test
  const testAC2 = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/csrd/xbrl-export/${fiscalYear}?entity=${selectedEntity}&taxonomyVersion=ESRS_Set1_2023`);
      if (!response.ok) throw new Error('AC2 test failed');
      return response.json();
    },
    onSuccess: (data) => {
      const hasXBRL = data.xbrlSnippet && data.xbrlSnippet.includes('esrs-s1:GenderPayGapPercentage');
      const isValidTaxonomy = data.validation?.isValid === true;
      const correctVersion = data.validation?.taxonomyVersion === 'ESRS_Set1_2023';
      
      const allPassed = hasXBRL && isValidTaxonomy && correctVersion;
      
      setTestResults(prev => ({
        ...prev,
        ac2: {
          status: allPassed ? 'pass' : 'fail',
          message: allPassed 
            ? '✓ XBRL export validates against ESRS Set-1 (2023) taxonomy'
            : `Failed: ${data.validation?.errors?.join(', ') || 'Invalid XBRL or taxonomy validation failed'}`,
          data
        }
      }));
    },
    onError: (error) => {
      setTestResults(prev => ({
        ...prev,
        ac2: { status: 'fail', message: `AC2 Failed: ${error.message}`, error: error.message }
      }));
    }
  });

  // AC3: Ruleset Switching Test
  const testAC3 = useMutation({
    mutationFn: async () => {
      // Test enabling 2025 quick-fix
      const enableResponse = await fetch('/api/csrd/toggle-quickfix-2025', {
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Test disabling
      const disableResponse = await fetch('/api/csrd/toggle-quickfix-2025', {
        method: 'POST',
        body: JSON.stringify({ enabled: false }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!enableResponse.ok || !disableResponse.ok) {
        throw new Error('AC3 test failed');
      }
      
      return { 
        enableResponse: await enableResponse.json(), 
        disableResponse: await disableResponse.json() 
      };
    },
    onSuccess: (data) => {
      const enableWorked = data.enableResponse?.activeRuleset === 'esrs_s1.v2025_quickfix';
      const disableWorked = data.disableResponse?.activeRuleset === 'esrs_s1.v2023';
      const featureFlags = data.enableResponse?.featureFlag !== undefined;
      
      const allPassed = enableWorked && disableWorked && featureFlags;
      
      setTestResults(prev => ({
        ...prev,
        ac3: {
          status: allPassed ? 'pass' : 'fail',
          message: allPassed 
            ? '✓ Ruleset switching works. Currently using: ' + data.disableResponse?.activeRuleset
            : 'Failed: Ruleset switching not working properly',
          data
        }
      }));
    },
    onError: (error) => {
      setTestResults(prev => ({
        ...prev,
        ac3: { status: 'fail', message: `AC3 Failed: ${error.message}`, error: error.message }
      }));
    }
  });

  // AC4: Evidence Pack Test
  const testAC4 = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/csrd/evidence-pack/${fiscalYear}?entity=${selectedEntity}&country=${selectedCountry}`);
      if (!response.ok) throw new Error('AC4 test failed');
      return response.json();
    },
    onSuccess: (data) => {
      const hasCSV = data.csvExtract && data.csvExtract.length > 0;
      const hasJSON = data.jsonCalcLog && data.jsonCalcLog.calculations;
      const hasAssurance = data.assuranceMetadata && data.assuranceMetadata.dataLineageComplete;
      
      const allPassed = hasCSV && hasJSON && hasAssurance;
      
      setTestResults(prev => ({
        ...prev,
        ac4: {
          status: allPassed ? 'pass' : 'fail',
          message: allPassed 
            ? '✓ Evidence pack generated with CSV extract, JSON calc log, and assurance metadata'
            : 'Failed: Missing CSV extract, JSON calc log, or assurance metadata',
          data
        }
      }));
    },
    onError: (error) => {
      setTestResults(prev => ({
        ...prev,
        ac4: { status: 'fail', message: `AC4 Failed: ${error.message}`, error: error.message }
      }));
    }
  });

  const runAllTests = async () => {
    await testAC1.mutateAsync();
    await testAC2.mutateAsync(); 
    await testAC3.mutateAsync();
    await testAC4.mutateAsync();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'fail': return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default: return <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800 border-green-200';
      case 'fail': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const overallStatus = Object.values(testResults).every(r => r.status === 'pass') ? 'pass' : 
                      Object.values(testResults).some(r => r.status === 'fail') ? 'fail' : 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">S1 Acceptance Criteria Testing</h1>
          <p className="text-muted-foreground">
            Validate all development ticket requirements for ESRS S1 compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(overallStatus)}>
            {getStatusIcon(overallStatus)}
            <span className="ml-2">
              {overallStatus === 'pass' ? 'All Tests Passing' : 
               overallStatus === 'fail' ? 'Some Tests Failed' : 'Tests Pending'}
            </span>
          </Badge>
        </div>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Test Configuration
          </CardTitle>
          <CardDescription>
            Configure test parameters for acceptance criteria validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Fiscal Year</label>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Entity</label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hq-athens">HQ Athens</SelectItem>
                  <SelectItem value="hotel-mykonos">Mykonos Resort</SelectItem>
                  <SelectItem value="office-berlin">Berlin Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Country</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GRC">Greece</SelectItem>
                  <SelectItem value="DEU">Germany</SelectItem>
                  <SelectItem value="FRA">France</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={runAllTests} className="w-full" size="sm">
                <PlayIcon className="w-4 h-4 mr-2" />
                Run All Tests
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acceptance Criteria Tests */}
      <Tabs defaultValue="ac1" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ac1" className="flex items-center gap-2">
            {getStatusIcon(testResults.ac1.status)}
            AC1: S1-16 Calculations
          </TabsTrigger>
          <TabsTrigger value="ac2" className="flex items-center gap-2">
            {getStatusIcon(testResults.ac2.status)}
            AC2: XBRL Export
          </TabsTrigger>
          <TabsTrigger value="ac3" className="flex items-center gap-2">
            {getStatusIcon(testResults.ac3.status)}
            AC3: Ruleset Switch
          </TabsTrigger>
          <TabsTrigger value="ac4" className="flex items-center gap-2">
            {getStatusIcon(testResults.ac4.status)}
            AC4: Evidence Pack
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ac1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AC1: S1-16 Gender Pay Gap & Highest-to-Median Ratio</span>
                <Button 
                  onClick={() => testAC1.mutate()} 
                  disabled={testAC1.isPending}
                  size="sm"
                >
                  {testAC1.isPending ? 'Testing...' : 'Test AC1'}
                </Button>
              </CardTitle>
              <CardDescription>
                Calculate S1-16 metrics by entity and country for closed fiscal years with method notes and population counts (EFRAG requirement)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-3 rounded border ${getStatusColor(testResults.ac1.status)} border`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(testResults.ac1.status)}
                    <span className="font-medium">Test Result</span>
                  </div>
                  <p className="text-sm">{testResults.ac1.message}</p>
                </div>
                
                {testResults.ac1.data && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Gender Pay Gap</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>Value: {testResults.ac1.data.genderPayGap.value.toFixed(1)}%</li>
                        <li>Population: {testResults.ac1.data.genderPayGap.populationCounts.totalEmployees} employees</li>
                        <li>Non-employees excluded: {testResults.ac1.data.genderPayGap.populationCounts.nonEmployeesExcluded}</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Highest-to-Median Ratio</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>Ratio: {testResults.ac1.data.highestToMedianRatio.value.toFixed(1)}:1</li>
                        <li>Population: {testResults.ac1.data.highestToMedianRatio.populationCounts.totalEmployees} employees</li>
                        <li>Highest paid: €{testResults.ac1.data.highestToMedianRatio.populationCounts.highestPaidValue.toLocaleString()}</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ac2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AC2: ESRS S1 XBRL Export with Set-1 Taxonomy</span>
                <Button 
                  onClick={() => testAC2.mutate()} 
                  disabled={testAC2.isPending}
                  size="sm"
                >
                  {testAC2.isPending ? 'Testing...' : 'Test AC2'}
                </Button>
              </CardTitle>
              <CardDescription>
                Export XBRL snippet that validates against ESRS Set-1 (2023) taxonomy (EFRAG XBRL requirement)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-3 rounded border ${getStatusColor(testResults.ac2.status)} border`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(testResults.ac2.status)}
                    <span className="font-medium">Validation Result</span>
                  </div>
                  <p className="text-sm">{testResults.ac2.message}</p>
                </div>
                
                {testResults.ac2.data && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">XBRL Snippet Generated</span>
                      <Button size="sm" variant="outline">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Download XBRL
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                      {testResults.ac2.data.xbrlSnippet}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ac3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AC3: Ruleset Switching with 2025 Quick-fix</span>
                <Button 
                  onClick={() => testAC3.mutate()} 
                  disabled={testAC3.isPending}
                  size="sm"
                >
                  {testAC3.isPending ? 'Testing...' : 'Test AC3'}
                </Button>
              </CardTitle>
              <CardDescription>
                Support ruleset switch when Commission's 2025 quick-fix is finalized with feature flag (Finance requirement)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-3 rounded border ${getStatusColor(testResults.ac3.status)} border`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(testResults.ac3.status)}
                    <span className="font-medium">Feature Flag Test</span>
                  </div>
                  <p className="text-sm">{testResults.ac3.message}</p>
                </div>
                
                {testResults.ac3.data && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-medium">Enable Test</h4>
                      <p className="text-muted-foreground">Ruleset: {testResults.ac3.data.enableResponse.activeRuleset}</p>
                      <p className="text-muted-foreground">Flag: {testResults.ac3.data.enableResponse.featureFlag ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Disable Test</h4>
                      <p className="text-muted-foreground">Ruleset: {testResults.ac3.data.disableResponse.activeRuleset}</p>
                      <p className="text-muted-foreground">Flag: {testResults.ac3.data.disableResponse.featureFlag ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ac4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AC4: Evidence Pack for Assurance</span>
                <Button 
                  onClick={() => testAC4.mutate()} 
                  disabled={testAC4.isPending}
                  size="sm"
                >
                  {testAC4.isPending ? 'Generating...' : 'Test AC4'}
                </Button>
              </CardTitle>
              <CardDescription>
                Generate Evidence Pack with CSV extract and JSON calculation log suitable for assurance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-3 rounded border ${getStatusColor(testResults.ac4.status)} border`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(testResults.ac4.status)}
                    <span className="font-medium">Generation Result</span>
                  </div>
                  <p className="text-sm">{testResults.ac4.message}</p>
                </div>
                
                {testResults.ac4.data && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-medium">CSV Extract</h4>
                      <p className="text-muted-foreground">{testResults.ac4.data.csvExtract.split('\n').length} lines</p>
                      <Button size="sm" variant="outline" className="w-full">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">JSON Calc Log</h4>
                      <p className="text-muted-foreground">Complete audit trail</p>
                      <Button size="sm" variant="outline" className="w-full">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Download JSON
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Assurance Ready</h4>
                      <p className="text-muted-foreground">Data lineage: {testResults.ac4.data.assuranceMetadata.dataLineageComplete ? 'Complete' : 'Incomplete'}</p>
                      <Badge variant="outline">
                        {testResults.ac4.data.assuranceMetadata.calculationMethod}
                      </Badge>
                    </div>
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