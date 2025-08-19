import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Euro,
  Info,
  Shield,
  FileText,
  Layers
} from "lucide-react";

interface EarningsCodeRule {
  code: string;
  name: string;
  description: string;
  calculation: string;
  premiumRate?: number;
  taxable: boolean;
  contributoryEFKA: boolean;
  includedAPD: boolean;
  stackable: boolean;
  baseWage: boolean;
  constraints?: {
    maxHoursPerWeek?: number;
    maxHoursPerMonth?: number;
    maxHoursPerYear?: number;
  };
}

interface EarningsCodesResponse {
  baseWages: EarningsCodeRule[];
  premiums: EarningsCodeRule[];
  allowances: EarningsCodeRule[];
  bonuses: EarningsCodeRule[];
  tips: EarningsCodeRule[];
  summary: {
    totalCodes: number;
    taxableCodes: number;
    efkaContributoryCodes: number;
    apdIncludedCodes: number;
    stackableCodes: number;
  };
}

export default function EarningsCodesDemoPage() {
  const [primaryCode, setPrimaryCode] = useState("REG");
  const [stackedCodes, setStackedCodes] = useState("NIGHT_25,SUNDAY_75");
  const [earningsInput, setEarningsInput] = useState([
    { code: "REG", hours: 40, hourlyRate: 15.50, fixedAmount: undefined },
    { code: "NIGHT_25", hours: 8, hourlyRate: 15.50, fixedAmount: undefined },
    { code: "SUNDAY_75", hours: 6, hourlyRate: 15.50, fixedAmount: undefined },
    { code: "OT_TIER1_40", hours: 5, hourlyRate: 15.50, fixedAmount: undefined },
    { code: "MEAL_VOUCHER", hours: 0, hourlyRate: 0, fixedAmount: 120 }
  ]);
  const { toast } = useToast();

  // Fetch all earnings codes
  const { data: earningsCodesData, isLoading } = useQuery<EarningsCodesResponse>({
    queryKey: ['/api/payroll/earnings-codes'],
  });

  // Validate code stacking
  const validateStacking = useMutation({
    mutationFn: async ({ primary, stacked }: { primary: string; stacked: string[] }) => {
      const response = await fetch('/api/payroll/validate-stacking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryCode: primary, stackedCodes: stacked })
      });
      if (!response.ok) throw new Error('Failed to validate stacking');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: "Stacking Valid",
          description: "The selected earnings codes can be stacked together.",
        });
      } else {
        toast({
          title: "Stacking Invalid",
          description: `Errors: ${data.errors.join(', ')}`,
          variant: "destructive",
        });
      }
    }
  });

  // Calculate earnings breakdown
  const calculateEarnings = useMutation({
    mutationFn: async (earnings: any[]) => {
      const response = await fetch('/api/payroll/calculate-earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earnings })
      });
      if (!response.ok) throw new Error('Failed to calculate earnings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Calculation Complete",
        description: "Earnings breakdown has been calculated successfully.",
      });
    }
  });

  const handleValidateStacking = () => {
    const codes = stackedCodes.split(',').map(c => c.trim()).filter(c => c);
    validateStacking.mutate({ primary: primaryCode, stacked: codes });
  };

  const handleCalculateEarnings = () => {
    const validEarnings = earningsInput.filter(e => e.code && (e.hours > 0 || e.fixedAmount !== undefined));
    calculateEarnings.mutate(validEarnings);
  };

  const updateEarningsInput = (index: number, field: string, value: any) => {
    const updated = [...earningsInput];
    updated[index] = { ...updated[index], [field]: value };
    setEarningsInput(updated);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Clock className="h-8 w-8 animate-spin mr-2" />
          <span>Loading earnings codes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Standardized Earnings Codes</h1>
        <p className="text-gray-600">
          Greek payroll system with standardized taxation, EFKA contributions, and APD reporting rules
        </p>
      </div>

      {earningsCodesData && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                System Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{earningsCodesData.summary.totalCodes}</p>
                  <p className="text-gray-600 text-sm">Total Codes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{earningsCodesData.summary.taxableCodes}</p>
                  <p className="text-gray-600 text-sm">Taxable</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{earningsCodesData.summary.efkaContributoryCodes}</p>
                  <p className="text-gray-600 text-sm">EFKA Subject</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{earningsCodesData.summary.apdIncludedCodes}</p>
                  <p className="text-gray-600 text-sm">APD Included</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{earningsCodesData.summary.stackableCodes}</p>
                  <p className="text-gray-600 text-sm">Stackable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="codes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="codes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Earnings Codes
          </TabsTrigger>
          <TabsTrigger value="stacking" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Code Stacking
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculator
          </TabsTrigger>
        </TabsList>

        {/* Earnings Codes Tab */}
        <TabsContent value="codes" className="space-y-6">
          {earningsCodesData && (
            <div className="space-y-6">
              {/* Featured Greek Premium Codes */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900">Featured: Greek Premium System</CardTitle>
                  <CardDescription className="text-blue-800">
                    Complete Greek payroll premium structure with correct 2025 rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {earningsCodesData.baseWages.filter(code => code.code === 'REG').map((rule) => (
                      <div key={rule.code} className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="default" className="font-mono">{rule.code}</Badge>
                          <div className="flex gap-1">
                            {rule.taxable && <Badge variant="destructive" className="text-xs">Taxable</Badge>}
                            {rule.contributoryEFKA && <Badge variant="secondary" className="text-xs">EFKA</Badge>}
                            {rule.includedAPD && <Badge variant="outline" className="text-xs">APD</Badge>}
                          </div>
                        </div>
                        <h4 className="font-semibold mb-1">{rule.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        <p className="text-xs text-gray-500">
                          <strong>Calculation:</strong> Hours × hourly rate (base wage, no stacking)
                        </p>
                      </div>
                    ))}
                    
                    {earningsCodesData.premiums.filter(code => code.code === 'NIGHT_25').map((rule) => (
                      <div key={rule.code} className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="default" className="font-mono">{rule.code}</Badge>
                          <div className="flex gap-1">
                            {rule.taxable && <Badge variant="destructive" className="text-xs">Taxable</Badge>}
                            {rule.contributoryEFKA && <Badge variant="secondary" className="text-xs">EFKA</Badge>}
                            {rule.includedAPD && <Badge variant="outline" className="text-xs">APD</Badge>}
                            {rule.stackable && <Badge variant="default" className="text-xs">Stackable</Badge>}
                          </div>
                        </div>
                        <h4 className="font-semibold mb-1">{rule.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        <p className="text-xs text-gray-500">
                          <strong>Premium:</strong> {rule.premiumRate && (rule.premiumRate * 100)}% over hourly rate (22:00-06:00)
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Stackable with Sunday, holiday, or overtime premiums
                        </p>
                      </div>
                    ))}
                    
                    {/* New Premium Codes Showcase */}
                    {earningsCodesData.premiums.filter(code => ['SUNDAY_75', 'OT_TIER1_40', 'OT_TIER2_60', 'OT_EXCEPTIONAL_80'].includes(code.code)).map((rule) => (
                      <div key={rule.code} className="bg-white p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="default" className="font-mono text-xs">{rule.code}</Badge>
                          <div className="flex gap-1">
                            {rule.taxable && <Badge variant="destructive" className="text-xs">Tax</Badge>}
                            {rule.contributoryEFKA && <Badge variant="secondary" className="text-xs">EFKA</Badge>}
                            {rule.includedAPD && <Badge variant="outline" className="text-xs">APD</Badge>}
                            {rule.stackable && <Badge variant="default" className="text-xs">Stack</Badge>}
                          </div>
                        </div>
                        <h4 className="font-semibold text-sm mb-1">{rule.name}</h4>
                        <p className="text-xs text-gray-600 mb-2">{rule.description}</p>
                        <p className="text-xs text-blue-600">
                          <strong>Premium:</strong> {rule.premiumRate && (rule.premiumRate * 100)}%
                        </p>
                        {rule.code === 'OT_EXCEPTIONAL_80' && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ Triggers compliance alert - exceptional use only
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* All Categories */}
              {[
                { title: "Premium Codes", data: earningsCodesData.premiums, color: "bg-yellow-50 border-yellow-200" },
                { title: "Allowances", data: earningsCodesData.allowances, color: "bg-green-50 border-green-200" },
                { title: "Bonuses", data: earningsCodesData.bonuses, color: "bg-purple-50 border-purple-200" },
                { title: "Tips", data: earningsCodesData.tips, color: "bg-orange-50 border-orange-200" }
              ].map(category => (
                <Card key={category.title} className={category.color}>
                  <CardHeader>
                    <CardTitle>{category.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.data.map((rule) => (
                        <div key={rule.code} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="font-mono text-xs">{rule.code}</Badge>
                            <div className="flex gap-1">
                              {rule.taxable && <Badge variant="destructive" className="text-xs">Tax</Badge>}
                              {rule.contributoryEFKA && <Badge variant="secondary" className="text-xs">EFKA</Badge>}
                              {rule.stackable && <Badge variant="default" className="text-xs">Stack</Badge>}
                            </div>
                          </div>
                          <h5 className="font-medium text-sm mb-1">{rule.name}</h5>
                          <p className="text-xs text-gray-600">{rule.description}</p>
                          {rule.premiumRate && (
                            <p className="text-xs text-blue-600 mt-1">
                              Premium: {(rule.premiumRate * 100)}%
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stacking Validation Tab */}
        <TabsContent value="stacking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-600" />
                Code Stacking Validation
              </CardTitle>
              <CardDescription>
                Test if earnings codes can be combined according to Greek payroll rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryCode">Primary Code (Base)</Label>
                  <Input
                    id="primaryCode"
                    value={primaryCode}
                    onChange={(e) => setPrimaryCode(e.target.value)}
                    placeholder="REG"
                  />
                </div>
                <div>
                  <Label htmlFor="stackedCodes">Stacked Codes (comma-separated)</Label>
                  <Input
                    id="stackedCodes"
                    value={stackedCodes}
                    onChange={(e) => setStackedCodes(e.target.value)}
                    placeholder="NIGHT_25,SUNDAY_75,OT_TIER1_40"
                  />
                </div>
              </div>

              <Button 
                onClick={handleValidateStacking}
                disabled={validateStacking.isPending}
                className="w-full"
              >
                {validateStacking.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Validate Stacking Rules
                  </>
                )}
              </Button>

              {validateStacking.data && (
                <div className={`p-4 rounded-lg ${validateStacking.data.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {validateStacking.data.valid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-medium ${validateStacking.data.valid ? 'text-green-900' : 'text-red-900'}`}>
                      {validateStacking.data.valid ? 'Valid Stacking' : 'Invalid Stacking'}
                    </span>
                  </div>
                  {!validateStacking.data.valid && (
                    <ul className="text-sm text-red-800 space-y-1">
                      {validateStacking.data.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                Earnings Breakdown Calculator
              </CardTitle>
              <CardDescription>
                Calculate gross pay breakdown with Greek compliance rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <Label>Earnings Input</Label>
                {earningsInput.map((earning, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded">
                    <div>
                      <Input
                        placeholder="Code"
                        value={earning.code}
                        onChange={(e) => updateEarningsInput(index, 'code', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Hours"
                        value={earning.hours || ''}
                        onChange={(e) => updateEarningsInput(index, 'hours', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Hourly Rate"
                        value={earning.hourlyRate || ''}
                        onChange={(e) => updateEarningsInput(index, 'hourlyRate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Fixed Amount"
                        value={earning.fixedAmount || ''}
                        onChange={(e) => updateEarningsInput(index, 'fixedAmount', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleCalculateEarnings}
                disabled={calculateEarnings.isPending}
                className="w-full"
              >
                {calculateEarnings.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Euro className="h-4 w-4 mr-2" />
                    Calculate Earnings Breakdown
                  </>
                )}
              </Button>

              {calculateEarnings.data && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Earnings Summary</h4>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">€{calculateEarnings.data.totalGross.toFixed(2)}</p>
                        <p className="text-gray-600">Total Gross</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600">€{calculateEarnings.data.taxableAmount.toFixed(2)}</p>
                        <p className="text-gray-600">Taxable</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">€{calculateEarnings.data.efkaContributoryAmount.toFixed(2)}</p>
                        <p className="text-gray-600">EFKA Subject</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">€{calculateEarnings.data.apdIncludedAmount.toFixed(2)}</p>
                        <p className="text-gray-600">APD Included</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg">
                    <div className="p-4 border-b bg-gray-50">
                      <h5 className="font-medium">Detailed Breakdown</h5>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Tax Rules</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculateEarnings.data.breakdown.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{item.code}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right font-medium">€{item.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {item.taxable && <Badge variant="destructive" className="text-xs">Tax</Badge>}
                                {item.contributoryEFKA && <Badge variant="secondary" className="text-xs">EFKA</Badge>}
                                {item.includedAPD && <Badge variant="outline" className="text-xs">APD</Badge>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}