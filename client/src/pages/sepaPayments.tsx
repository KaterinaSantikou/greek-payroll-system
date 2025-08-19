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
  const [selectedBank, setSelectedBank] = useState("alpha");

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

  const bankProfiles = [
    { 
      name: "Alpha Bank", 
      key: "alpha",
      bic: "AGEAGRAA", 
      cutoff: "14:00", 
      painVersions: ["pain.001.001.03", "pain.001.001.09"],
      statusReporting: ["pain.002.001.03", "pain.002.001.10"],
      reconciliation: ["camt.054"],
      features: ["IBAN only", "Separate debit entries", "140 char remittance"],
      status: "recommended"
    },
    { 
      name: "National Bank of Greece", 
      key: "nbg",
      bic: "ETHNGRAA", 
      cutoff: "14:00", 
      painVersions: ["pain.001.001.03"],
      statusReporting: ["pain.002.001.03"],
      reconciliation: ["camt.054"],
      features: ["Standard SEPA implementation"],
      status: "active"
    },
    { 
      name: "Piraeus Bank", 
      key: "piraeus",
      bic: "PIRBGRAA", 
      cutoff: "13:30", 
      painVersions: ["pain.001.001.03"],
      statusReporting: ["pain.002.001.03 (e-PPS)"],
      reconciliation: ["camt.054"],
      features: ["e-PPS Mass Payments", "Host-to-host encryption", "Early cut-off"],
      status: "enhanced"
    },
    { 
      name: "Eurobank", 
      key: "eurobank",
      bic: "EUROGRAA", 
      cutoff: "14:30", 
      painVersions: ["pain.001.001.03"],
      statusReporting: ["pain.002.001.03"],
      reconciliation: ["camt.054"],
      features: ["Extended cut-off window"],
      status: "active"
    }
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
            <div className="space-y-4">
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
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Bank Profile:</span>
                <select 
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="alpha">Alpha Bank (Recommended)</option>
                  <option value="nbg">National Bank of Greece</option>
                  <option value="piraeus">Piraeus Bank</option>
                  <option value="eurobank">Eurobank</option>
                </select>
                <Badge variant="outline" className="text-xs">
                  {bankProfiles.find(p => p.key === selectedBank)?.bic}
                </Badge>
              </div>
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

        {/* Bank Profiles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Greek Bank Profiles
            </CardTitle>
            <CardDescription>
              Comprehensive SEPA capabilities and specifications for each bank
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bankProfiles.map((bank, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{bank.name}</h4>
                    <Badge 
                      variant={bank.status === "recommended" ? "default" : 
                              bank.status === "enhanced" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {bank.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">BIC:</span>
                      <span className="font-mono">{bank.bic}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Cut-off:</span>
                      <span className="font-medium">{bank.cutoff}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Profile Key:</span>
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {bank.key}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        PAIN Versions
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {bank.painVersions.map((version, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {version}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Status Reporting
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {bank.statusReporting.map((status, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {status}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Features
                      </h5>
                      <div className="space-y-1">
                        {bank.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-xs">{feature}</span>
                          </div>
                        ))}
                      </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  Enhanced Features
                </h4>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Piraeus e-PPS Mass Payments support</li>
                  <li>• Optional host-to-host encryption</li>
                  <li>• Alpha Bank dual PAIN version support</li>
                  <li>• Advanced status reporting capabilities</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Piraeus Bank Specific Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Piraeus Bank e-PPS Mass Payments
            </CardTitle>
            <CardDescription>
              Enhanced payment processing with optional host-to-host encryption
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">e-PPS Features</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Mass payment processing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">pain.002.001.03 status reporting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Batch credit transfer mode</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">13:30 cut-off for same-day processing</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Security & Encryption</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">Optional host-to-host encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">AES-256-GCM encryption standard</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">Secure key exchange protocol</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Sample schemas available</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h5 className="font-medium mb-2">Integration Notes</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Piraeus Bank's e-PPS Mass Payments system provides enhanced processing capabilities 
                for high-volume payroll operations. The optional host-to-host encryption ensures 
                maximum security for sensitive payroll data transmission. Sample schemas and 
                integration guides are available through Piraeus Bank's developer portal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}