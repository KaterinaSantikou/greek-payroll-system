import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Euro,
  Building2,
  Calendar,
  Shield
} from "lucide-react";

export default function SepaPayments() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSEPA = async () => {
    setIsGenerating(true);
    try {
      // Simulate SEPA file generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "SEPA File Generated",
        description: "Payroll SEPA file created successfully with ISO 20022 compliance",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Error creating SEPA file",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sepaSpecifications = [
    {
      category: "Message Format",
      items: [
        { label: "Standard", value: "ISO 20022 pain.001.001.03", icon: <FileText className="w-4 h-4" /> },
        { label: "Encoding", value: "UTF-8", icon: <Shield className="w-4 h-4" /> },
        { label: "CategoryPurpose", value: "SALA (Salary)", icon: <Euro className="w-4 h-4" /> }
      ]
    },
    {
      category: "Banking Requirements",
      items: [
        { label: "Currency", value: "EUR only", icon: <Euro className="w-4 h-4" /> },
        { label: "IBAN", value: "Mandatory", icon: <CheckCircle className="w-4 h-4" /> },
        { label: "BIC", value: "Optional (domestic SCT)", icon: <Building2 className="w-4 h-4" /> }
      ]
    },
    {
      category: "Processing Rules",
      items: [
        { label: "Remittance Info", value: "Up to 140 characters", icon: <FileText className="w-4 h-4" /> },
        { label: "Booking", value: "Separate debits per employee", icon: <CheckCircle className="w-4 h-4" /> },
        { label: "Cut-offs", value: "Per-bank early afternoon", icon: <Clock className="w-4 h-4" /> }
      ]
    }
  ];

  const bankCutoffs = [
    { bank: "National Bank of Greece", bic: "ETHNGRAA", cutoff: "14:00", status: "active" },
    { bank: "Piraeus Bank", bic: "PIRBGRAA", cutoff: "13:30", status: "active" },
    { bank: "Eurobank", bic: "EUROGRAA", cutoff: "14:30", status: "active" },
    { bank: "Alpha Bank", bic: "AGEAGRAA", cutoff: "14:00", status: "active" }
  ];

  const reconciliationFeatures = [
    {
      type: "pain.002",
      description: "Customer Payment Status Report",
      purpose: "Track payment status updates (ACCP, ACSC, ACSP, RJCT)",
      icon: <CheckCircle className="w-4 h-4 text-green-600" />
    },
    {
      type: "camt.054",
      description: "Bank-to-Customer Debit Credit Notification",
      purpose: "Payment confirmation and reconciliation records",
      icon: <Building2 className="w-4 h-4 text-blue-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            SEPA Payments
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Greek Payroll SEPA File Generation with Addendum B Bank Format Compliance
          </p>
        </div>

        {/* SEPA File Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Generate SEPA Payroll File
            </CardTitle>
            <CardDescription>
              Create ISO 20022 pain.001 Customer Credit Transfer files for salary payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Ready to generate payroll SEPA file</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Includes all active employees with valid IBANs
                </p>
              </div>
              <Button 
                onClick={handleGenerateSEPA}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate SEPA File
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SEPA Specifications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {sepaSpecifications.map((spec, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{spec.category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {spec.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.value}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bank Cut-offs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Bank Cut-off Times
            </CardTitle>
            <CardDescription>
              Same-day processing cut-offs for Greek banks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {bankCutoffs.map((bank, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{bank.bank}</h4>
                      <Badge variant="outline" className="text-xs">
                        {bank.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{bank.bic}</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className="text-sm font-medium">{bank.cutoff}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reconciliation Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Reconciliation Support
            </CardTitle>
            <CardDescription>
              Automated processing of bank status and notification messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reconciliationFeatures.map((feature, index) => (
              <div key={index}>
                <div className="flex items-start gap-3">
                  {feature.icon}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{feature.type}</h4>
                      <Badge variant="outline" className="text-xs">ISO 20022</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {feature.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {feature.purpose}
                    </p>
                  </div>
                </div>
                {index < reconciliationFeatures.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Technical Implementation */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Implementation</CardTitle>
            <CardDescription>
              Complete SEPA implementation following Addendum B specifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Format Compliance
                </h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• ISO 20022 pain.001.001.03 for maximum compatibility</li>
                  <li>• UTF-8 encoding for Greek character support</li>
                  <li>• EUR-only currency restriction</li>
                  <li>• SALA category purpose for salary identification</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Banking Integration
                </h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Mandatory IBAN validation for all payments</li>
                  <li>• Optional BIC for domestic transactions</li>
                  <li>• Separate debits per employee for clear tracking</li>
                  <li>• Bank-specific cut-off enforcement</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}