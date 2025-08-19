import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Zap, Clock, TrendingUp, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InstantPaymentCapabilities {
  instantSupported: boolean;
  supportedBanks: string[];
  maxInstantAmount: number;
  averageProcessingTime: string;
  complianceStatus: string;
}

interface ComplianceStatus {
  currentDate: string;
  phase1Status: {
    deadline: string;
    description: string;
    isCompliant: boolean;
    daysRemaining: number;
  };
  phase2Status: {
    deadline: string;
    description: string;
    isCompliant: boolean;
    daysRemaining: number;
  };
  readinessScore: number;
  recommendations: string[];
}

export function InstantPaymentWidget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: capabilities, isLoading: capabilitiesLoading } = useQuery<{
    data: InstantPaymentCapabilities;
    recommendations: string[];
  }>({
    queryKey: ['/api/instant-payments/capabilities'],
  });

  const { data: compliance, isLoading: complianceLoading } = useQuery<{
    data: ComplianceStatus;
  }>({
    queryKey: ['/api/instant-payments/compliance-status'],
  });

  const simulatePaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return apiRequest('/api/instant-payments/simulate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (result: any) => {
      toast({
        title: "🚀 Άμεση πληρωμή προσομοιώθηκε",
        description: `Πληρωμή ${result.data.amount}€ ολοκληρώθηκε σε ${result.data.processingTime}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Σφάλμα προσομοίωσης",
        description: "Δεν ήταν δυνατή η προσομοίωση της άμεσης πληρωμής",
        variant: "destructive",
      });
    },
  });

  const handleSimulatePayment = () => {
    simulatePaymentMutation.mutate({
      amount: 1250.50,
      employeeName: "Μαρία Παπαδοπούλου",
      iban: "GR1601101250000000012345678",
      urgencyLevel: "URGENT"
    });
  };

  const getComplianceStatusColor = (isCompliant: boolean) => {
    return isCompliant 
      ? "text-green-600 dark:text-green-400" 
      : "text-orange-600 dark:text-orange-400";
  };

  const getReadinessColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (capabilitiesLoading || complianceLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-blue-500" />
          Άμεσες Πληρωμές SEPA
        </CardTitle>
        <CardDescription>
          SCT Inst για επείγουσες διορθώσεις και off-cycle μισθοδοσία
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Capabilities Overview */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Δυνατότητες Συστήματος</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {capabilities?.data.instantSupported ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm font-medium">
                  {capabilities?.data.instantSupported ? "Διαθέσιμες" : "Μη διαθέσιμες"}
                </span>
              </div>
              <p className="text-xs text-gray-500">Άμεσες πληρωμές</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">
                  {capabilities?.data.averageProcessingTime || "N/A"}
                </span>
              </div>
              <p className="text-xs text-gray-500">Μέσος χρόνος</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {formatCurrency(capabilities?.data.maxInstantAmount || 0)}
                </span>
              </div>
              <p className="text-xs text-gray-500">Μέγιστο ποσό</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-fit">
                  {capabilities?.data.supportedBanks.length || 0} τράπεζες
                </Badge>
              </div>
              <p className="text-xs text-gray-500">Υποστήριξη</p>
            </div>
          </div>

          {capabilities?.data.supportedBanks && capabilities.data.supportedBanks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 dark:text-gray-400">Υποστηριζόμενες τράπεζες:</p>
              <div className="flex gap-1 flex-wrap">
                {capabilities.data.supportedBanks.map((bank) => (
                  <Badge key={bank} variant="secondary" className="text-xs">
                    {bank}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* EU 2025 Compliance */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Συμμόρφωση ΕΕ 2025</h4>
          
          {compliance?.data && (
            <div className="space-y-3">
              {/* Readiness Score */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Σκορ Ετοιμότητας</span>
                  <span className={`text-sm font-medium ${getReadinessColor(compliance.data.readinessScore)}`}>
                    {compliance.data.readinessScore}%
                  </span>
                </div>
                <Progress 
                  value={compliance.data.readinessScore} 
                  className="h-2"
                />
              </div>

              {/* Phase Status */}
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div>
                    <p className="text-xs font-medium">Φάση 1 - 9 Ιαν 2025</p>
                    <p className="text-xs text-gray-500">PSPs reachability</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${getComplianceStatusColor(compliance.data.phase1Status.isCompliant)}`}>
                      {compliance.data.phase1Status.isCompliant ? "✓ Συμμορφώθηκε" : `${compliance.data.phase1Status.daysRemaining} ημέρες`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div>
                    <p className="text-xs font-medium">Φάση 2 - 9 Οκτ 2025</p>
                    <p className="text-xs text-gray-500">All PSPs support</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${getComplianceStatusColor(compliance.data.phase2Status.isCompliant)}`}>
                      {compliance.data.phase2Status.isCompliant ? "✓ Συμμορφώθηκε" : `${compliance.data.phase2Status.daysRemaining} ημέρες`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleSimulatePayment}
            disabled={simulatePaymentMutation.isPending}
            className="w-full"
            size="sm"
          >
            {simulatePaymentMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Προσομοίωση Άμεσης Πληρωμής
          </Button>

          {/* Top Recommendations */}
          {capabilities?.recommendations && capabilities.recommendations.length > 0 && (
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-medium">Συστάσεις:</p>
              <ul className="list-disc list-inside space-y-1">
                {capabilities.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}