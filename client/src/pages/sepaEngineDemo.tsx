import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, Clock, FileText, Zap, Settings, ArrowRight, Euro } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PaymentData {
  id: string;
  employeeName: string;
  iban: string;
  bic?: string;
  amount: number;
  remittanceInfo: string;
  paymentType: 'REGULAR' | 'URGENT' | 'CORRECTION';
}

export default function SepaEngineDemo() {
  const [selectedBank, setSelectedBank] = useState<string>('alpha');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [statusResult, setStatusResult] = useState<any>(null);

  const mockPayments: PaymentData[] = [
    {
      id: "PAY001",
      employeeName: "Konstantinos Papadopoulos",
      iban: "GR1601101250000000012300695",
      bic: "ETHNGRAA",
      amount: 1250.00,
      remittanceInfo: "Salary January 2025",
      paymentType: "REGULAR"
    },
    {
      id: "PAY002",
      employeeName: "Maria Athanasiadou",
      iban: "GR4401401030000000005678901",
      amount: 85.50,
      remittanceInfo: "Overtime correction",
      paymentType: "CORRECTION"
    },
    {
      id: "PAY003",
      employeeName: "Dimitris Georgiadis",
      iban: "GR9608100010000001234567890",
      amount: 500.00,
      remittanceInfo: "Bonus payment - urgent processing required",
      paymentType: "URGENT"
    }
  ];

  const validateEngine = useMutation({
    mutationFn: async (data: { bankProfile: string; payments: PaymentData[] }) => {
      const response = await fetch('/api/payments/sepa/validate-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (data) => {
      setValidationResult(data);
    }
  });

  const processStatus = useMutation({
    mutationFn: async (data: { pain002Response: any; correlationId: string }) => {
      const response = await fetch('/api/payments/sepa/process-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (data) => {
      setStatusResult(data);
    }
  });

  const mockPain002Response = {
    Document: {
      CstmrPmtStsRpt: {
        OrgnlPmtInfAndSts: {
          TxInfAndSts: [
            { OrgnlTxRef: { MsgId: "PAY001" }, TxSts: "ACCP" },
            { OrgnlTxRef: { MsgId: "PAY002" }, TxSts: "RJCT", StsRsnInf: { Rsn: { Cd: "AC01" } } },
            { OrgnlTxRef: { MsgId: "PAY003" }, TxSts: "ACSP" }
          ]
        }
      }
    }
  };

  const bankProfiles = [
    { key: 'alpha', name: 'Alpha Bank', features: ['Dual PAIN format', 'Enhanced processing'] },
    { key: 'piraeus', name: 'Piraeus Bank', features: ['e-PPS Mass Payments', 'Encryption'] },
    { key: 'eurobank', name: 'Eurobank', features: ['Corporate XML Guide', 'Extended cut-off'] },
    { key: 'nbg', name: 'NBG', features: ['Bulk file management', 'SEPA Instant'] }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">SEPA Engine Validation Demo</h1>
          <p className="text-muted-foreground">
            Comprehensive pain.001 schema validation, cut-off enforcement, and SCT Instant switching
          </p>
        </div>
      </div>

      {/* Bank Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-green-600" />
            Bank Profile Selection
          </CardTitle>
          <CardDescription>
            Select a Greek bank profile to test engine behavior validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank profile" />
                </SelectTrigger>
                <SelectContent>
                  {bankProfiles.map((bank) => (
                    <SelectItem key={bank.key} value={bank.key}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {bankProfiles.find(b => b.key === selectedBank)?.features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="mr-2">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            Sample Payment Data
          </CardTitle>
          <CardDescription>
            Test payments including regular, urgent, and correction types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {mockPayments.map((payment, index) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant={
                    payment.paymentType === 'URGENT' ? 'destructive' :
                    payment.paymentType === 'CORRECTION' ? 'default' : 'secondary'
                  }>
                    {payment.paymentType}
                  </Badge>
                  <div>
                    <p className="font-medium">{payment.employeeName}</p>
                    <p className="text-sm text-muted-foreground">{payment.iban}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">€{payment.amount.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{payment.remittanceInfo}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engine Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Engine Validation
          </CardTitle>
          <CardDescription>
            Validates pain.001 schema, bank-specific rules, cut-off windows, and SCT Instant switching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => validateEngine.mutate({ bankProfile: selectedBank, payments: mockPayments })}
            disabled={validateEngine.isPending}
            className="w-full"
          >
            {validateEngine.isPending ? 'Validating...' : 'Run Engine Validation'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {validationResult && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Validation completed for {selectedBank.toUpperCase()} profile
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Validation Results</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {validationResult.validation.valid ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        {validationResult.validation.valid ? 'All validations passed' : 'Validation errors found'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Processing Mode: {validationResult.validation.processingMode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm">Correlation ID: {validationResult.validation.correlationId}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Execution Details</h4>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <strong>Execution Date:</strong> {new Date(validationResult.validation.executionDate).toLocaleString()}
                    </p>
                    <p className="text-sm">
                      <strong>Errors:</strong> {validationResult.validation.errors.length}
                    </p>
                    <p className="text-sm">
                      <strong>Warnings:</strong> {validationResult.validation.warnings.length}
                    </p>
                  </div>
                </div>
              </div>

              {validationResult.validation.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Warnings</h4>
                  {validationResult.validation.warnings.map((warning: string, index: number) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{warning}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            pain.002 Status Processing
          </CardTitle>
          <CardDescription>
            Process status reports and surface payment rejects with actionable insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => processStatus.mutate({ 
              pain002Response: mockPain002Response, 
              correlationId: validationResult?.validation.correlationId || 'DEMO-12345' 
            })}
            disabled={processStatus.isPending}
            className="w-full"
            variant="outline"
          >
            {processStatus.isPending ? 'Processing...' : 'Process Mock pain.002 Status'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          {statusResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">Accepted Payments</h4>
                  {statusResult.rejectAnalysis.acceptedPayments.map((paymentId: string) => (
                    <div key={paymentId} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{paymentId}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Rejected Payments</h4>
                  {statusResult.rejectAnalysis.rejectedPayments.map((reject: any) => (
                    <div key={reject.paymentId} className="p-3 bg-red-50 dark:bg-red-900/20 rounded space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium">{reject.paymentId}</span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300">{reject.rejectReason}</p>
                      <p className="text-xs font-medium text-red-800 dark:text-red-200">
                        Action: {reject.actionRequired}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}