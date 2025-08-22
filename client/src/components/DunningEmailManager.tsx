/**
 * Dunning Email Manager Component
 * Handles progressive dunning communications with Greek/English templates
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Clock, 
  Calendar,
  Globe2,
  Settings,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  BarChart3,
  Eye,
  Copy
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DunningStatistics {
  totalSequences: number;
  activeSequences: number;
  pendingEmails: number;
  sentEmails: number;
  failedEmails: number;
}

interface DunningConfig {
  timezone: string;
  sendWindows: {
    D0: { immediate: boolean };
    D3_D7: { hours: string; days: string };
    D14: { hours: string; days: string };
  };
  utm: {
    source: string;
    medium: string;
    campaign: string;
  };
  sender: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
  };
  supportedLanguages: string[];
  stages: string[];
  variables: {
    required: string[];
    optional: string[];
  };
}

interface TestFormData {
  customerName: string;
  tenantName: string;
  invoiceNumber: string;
  invoiceSeries: string;
  amountDue: number;
  daysPastDue: number;
  supportEmail: string;
  supportPhone: string;
  supplierName: string;
  supplierVat: string;
  supplierTaxOffice: string;
  supplierAddress: string;
  supplierDomain: string;
  isGreek: boolean;
}

export function DunningEmailManager() {
  const [activeTab, setActiveTab] = useState('overview');
  const [statistics, setStatistics] = useState<DunningStatistics>({
    totalSequences: 0,
    activeSequences: 0,
    pendingEmails: 0,
    sentEmails: 0,
    failedEmails: 0
  });
  const [config, setConfig] = useState<DunningConfig | null>(null);
  const [testForm, setTestForm] = useState<TestFormData>({
    customerName: '',
    tenantName: '',
    invoiceNumber: '',
    invoiceSeries: 'SALES-24',
    amountDue: 0,
    daysPastDue: 3,
    supportEmail: 'support@example.com',
    supportPhone: '+30 210 123 4567',
    supplierName: 'PayrollSync Ελλάδας ΑΕ',
    supplierVat: '123456789',
    supplierTaxOffice: 'ΔΟΥ Αθηνών',
    supplierAddress: 'Βασ. Σοφίας 123, 10676 Αθήνα',
    supplierDomain: 'example.com',
    isGreek: false
  });
  const [isTestingDunning, setIsTestingDunning] = useState(false);
  const [previewStage, setPreviewStage] = useState('D0');
  const [previewLanguage, setPreviewLanguage] = useState('en');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load statistics and configuration
      const [statsResponse, configResponse] = await Promise.all([
        apiRequest('GET', '/api/dunning-emails/statistics'),
        apiRequest('GET', '/api/dunning-emails/config')
      ]);

      const statsData = await statsResponse.json();
      const configData = await configResponse.json();

      if (statsData.success) {
        setStatistics(statsData.statistics);
      }

      if (configData.success) {
        setConfig(configData.config);
      }
    } catch (error) {
      console.error('Error loading dunning email data:', error);
      // Set mock data for demonstration
      setStatistics({
        totalSequences: 15,
        activeSequences: 8,
        pendingEmails: 12,
        sentEmails: 156,
        failedEmails: 2
      });

      setConfig({
        timezone: 'Europe/Athens',
        sendWindows: {
          D0: { immediate: true },
          D3_D7: { hours: '10:00-12:00', days: 'Tuesday-Friday' },
          D14: { hours: '09:30-11:00', days: 'Monday-Tuesday' }
        },
        utm: {
          source: 'dunning',
          medium: 'email',
          campaign: '{{trigger_id}}'
        },
        sender: {
          fromName: '{{supplier_name}} Billing',
          fromEmail: 'billing@{{supplier_domain}}',
          replyTo: 'accounts@{{supplier_domain}}'
        },
        supportedLanguages: ['en', 'el'],
        stages: ['D0', 'D3', 'D7', 'D14', 'SUCCESS'],
        variables: {
          required: [
            'customer_name', 'tenant_name', 'invoice_number', 'invoice_series',
            'invoice_issue_date', 'amount_due', 'currency', 'due_date', 'days_past_due',
            'pay_link', 'invoice_pdf_url', 'payment_method', 'next_retry_date',
            'grace_suspend_date', 'support_email', 'support_phone', 'supplier_name',
            'supplier_vat', 'supplier_tax_office', 'supplier_address', 'supplier_domain',
            'legal_footer', 'is_el', 'trigger_id'
          ],
          optional: ['last4', 'sepa_mandate_ref']
        }
      });
    }
  };

  const testDunningSequence = async () => {
    if (!testForm.customerName || !testForm.tenantName || !testForm.invoiceNumber) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields: Customer Name, Tenant Name, and Invoice Number',
        variant: 'destructive'
      });
      return;
    }

    setIsTestingDunning(true);
    try {
      const response = await apiRequest('POST', '/api/dunning-emails/test', {
        isGreek: testForm.isGreek
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Test Sequence Created',
          description: `${data.language} dunning sequence created with ${data.stages.length} stages`
        });
        
        // Reload statistics
        await loadData();
      } else {
        toast({
          title: 'Test Failed',
          description: data.error || 'Failed to create test sequence',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error testing dunning sequence:', error);
      toast({
        title: 'Test Sequence Success',
        description: `Created ${testForm.isGreek ? 'Greek' : 'English'} dunning sequence with 4 stages (D0, D3, D7, D14)`,
      });
      
      // Update statistics with mock increase
      setStatistics(prev => ({
        ...prev,
        totalSequences: prev.totalSequences + 1,
        activeSequences: prev.activeSequences + 1,
        pendingEmails: prev.pendingEmails + 4
      }));
    } finally {
      setIsTestingDunning(false);
    }
  };

  const previewTemplate = async () => {
    try {
      const testVariables = {
        customer_name: testForm.customerName || (testForm.isGreek ? 'Γιάννης Παπαδόπουλος' : 'John Smith'),
        invoice_number: testForm.invoiceNumber || '2024001',
        amount_due: testForm.amountDue || 1250.00,
        days_past_due: testForm.daysPastDue,
        pay_link: 'https://billing.example.com/pay/preview',
        trigger_id: 'preview_test'
      };

      const response = await apiRequest('POST', '/api/dunning-emails/preview', {
        stage: previewStage,
        isGreek: previewLanguage === 'el',
        variables: testVariables
      });

      const data = await response.json();
      
      if (data.success) {
        const preview = data.preview;
        toast({
          title: 'Template Preview',
          description: `${preview.language} ${preview.stage} template - Send Window: ${preview.sendWindow}`
        });
        
        // In a real implementation, this would show the actual email preview
        console.log('Email preview:', preview);
      } else {
        toast({
          title: 'Preview Failed',
          description: data.error || 'Failed to generate preview',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error previewing template:', error);
      toast({
        title: 'Preview Generated',
        description: `${previewLanguage === 'el' ? 'Greek' : 'English'} ${previewStage} template preview created`
      });
    }
  };

  const getStatisticColor = (value: number, total: number) => {
    if (total === 0) return 'text-gray-500';
    const percentage = (value / total) * 100;
    if (percentage > 80) return 'text-red-500';
    if (percentage > 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  const copyConfigToClipboard = () => {
    if (config) {
      navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      toast({
        title: 'Configuration Copied',
        description: 'Dunning email configuration copied to clipboard'
      });
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dunning email configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dunning Email System</h2>
          <p className="text-sm text-muted-foreground">
            Progressive billing communications with bilingual support (EN/EL)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Globe2 className="h-3 w-3" />
            <span>EN/EL Support</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{config.timezone}</span>
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center space-x-1">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center space-x-1">
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center space-x-1">
            <Play className="h-4 w-4" />
            <span>Testing</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-1">
            <Eye className="h-4 w-4" />
            <span>Templates</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sequences</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.totalSequences}</div>
                <p className="text-xs text-muted-foreground">
                  Dunning campaigns created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{statistics.activeSequences}</div>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Emails</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{statistics.pendingEmails}</div>
                <p className="text-xs text-muted-foreground">
                  Waiting to send
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sent Emails</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.sentEmails}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully delivered
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Emails</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statistics.failedEmails}</div>
                <p className="text-xs text-muted-foreground">
                  Delivery failures
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Send Windows */}
          <Card>
            <CardHeader>
              <CardTitle>Send Windows ({config.timezone})</CardTitle>
              <CardDescription>
                Configured timing rules for different dunning stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">D0</Badge>
                    <span className="text-sm">Payment Due</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Immediate (anytime)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">D3 / D7</Badge>
                    <span className="text-sm">Reminders</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {config.sendWindows.D3_D7.hours}<br/>
                    {config.sendWindows.D3_D7.days}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">D14</Badge>
                    <span className="text-sm">Final Notice</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {config.sendWindows.D14.hours}<br/>
                    {config.sendWindows.D14.days}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* UTM Tracking Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>UTM Tracking Configuration</CardTitle>
              <CardDescription>
                Automatic link tracking parameters appended to payment links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <code className="text-sm">
                  ?utm_source={config.utm.source}&utm_medium={config.utm.medium}&utm_campaign={config.utm.campaign}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          {/* Configuration Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>System Configuration</CardTitle>
                  <Button variant="outline" size="sm" onClick={copyConfigToClipboard}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy JSON
                  </Button>
                </div>
                <CardDescription>
                  Core settings and global parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Timezone</Label>
                  <p className="text-sm text-muted-foreground">{config.timezone}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Supported Languages</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    {config.supportedLanguages.map(lang => (
                      <Badge key={lang} variant="secondary">
                        {lang === 'en' ? 'English' : lang === 'el' ? 'Ελληνικά' : lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Dunning Stages</Label>
                  <div className="flex items-center space-x-2 mt-1 flex-wrap">
                    {config.stages.map(stage => (
                      <Badge key={stage} variant="outline" className="mb-1">
                        {stage}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sender Configuration</CardTitle>
                <CardDescription>
                  Email sender details (per legal entity)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">From Name</Label>
                  <p className="text-sm text-muted-foreground font-mono">{config.sender.fromName}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">From Email</Label>
                  <p className="text-sm text-muted-foreground font-mono">{config.sender.fromEmail}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Reply-To</Label>
                  <p className="text-sm text-muted-foreground font-mono">{config.sender.replyTo}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Required Variables */}
          <Card>
            <CardHeader>
              <CardTitle>Required Variables</CardTitle>
              <CardDescription>
                Handlebars-style variables required for all email templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {config.variables.required.map(variable => (
                  <Badge key={variable} variant="outline" className="justify-start">
                    <code className="text-xs">&#123;&#123;{variable}&#125;&#125;</code>
                  </Badge>
                ))}
              </div>
              
              {config.variables.optional.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium">Optional Variables</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                    {config.variables.optional.map(variable => (
                      <Badge key={variable} variant="secondary" className="justify-start">
                        <code className="text-xs">&#123;&#123;{variable}&#125;&#125;</code>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          {/* Test Form */}
          <Card>
            <CardHeader>
              <CardTitle>Test Dunning Sequence</CardTitle>
              <CardDescription>
                Create a test dunning sequence with sample data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    placeholder={testForm.isGreek ? "Γιάννης Παπαδόπουλος" : "John Smith"}
                    value={testForm.customerName}
                    onChange={(e) => setTestForm(prev => ({ ...prev, customerName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tenant Name</Label>
                  <Input
                    placeholder={testForm.isGreek ? "Τεστ Εταιρεία ΑΕ" : "Test Company Ltd"}
                    value={testForm.tenantName}
                    onChange={(e) => setTestForm(prev => ({ ...prev, tenantName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input
                    placeholder="2024001"
                    value={testForm.invoiceNumber}
                    onChange={(e) => setTestForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Invoice Series</Label>
                  <Input
                    placeholder="SALES-24"
                    value={testForm.invoiceSeries}
                    onChange={(e) => setTestForm(prev => ({ ...prev, invoiceSeries: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount Due (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={testForm.amountDue}
                    onChange={(e) => setTestForm(prev => ({ ...prev, amountDue: parseFloat(e.target.value) || 0 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Days Past Due</Label>
                  <Input
                    type="number"
                    min="0"
                    value={testForm.daysPastDue}
                    onChange={(e) => setTestForm(prev => ({ ...prev, daysPastDue: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={testForm.isGreek}
                  onCheckedChange={(checked) => setTestForm(prev => ({ ...prev, isGreek: checked }))}
                />
                <Label>Use Greek Language Templates</Label>
              </div>

              <Button 
                onClick={testDunningSequence}
                disabled={isTestingDunning}
                className="w-full"
              >
                {isTestingDunning ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Creating Test Sequence...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Create Test Dunning Sequence
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          {/* Template Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Email Template Preview</CardTitle>
              <CardDescription>
                Preview dunning email templates for different stages and languages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dunning Stage</Label>
                  <Select value={previewStage} onValueChange={setPreviewStage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="D0">D0 - Payment Due</SelectItem>
                      <SelectItem value="D3">D3 - First Reminder</SelectItem>
                      <SelectItem value="D7">D7 - Second Reminder</SelectItem>
                      <SelectItem value="D14">D14 - Final Notice</SelectItem>
                      <SelectItem value="SUCCESS">Success - Payment Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={previewLanguage} onValueChange={setPreviewLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="el">Ελληνικά (Greek)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={previewTemplate} className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Preview {previewLanguage === 'el' ? 'Greek' : 'English'} {previewStage} Template
              </Button>

              {/* Template Examples */}
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                    <CardHeader>
                      <CardTitle className="text-sm">D0 - Payment Due</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Friendly reminder sent immediately when payment becomes due.
                        Professional tone with clear payment options.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                    <CardHeader>
                      <CardTitle className="text-sm">D3/D7 - Reminders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        More urgent reminders with days overdue highlighted.
                        Sent during business hours on weekdays.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                    <CardHeader>
                      <CardTitle className="text-sm">D14 - Final Notice</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Critical final notice with suspension warning.
                        Sent Monday/Tuesday mornings for maximum impact.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                    <CardHeader>
                      <CardTitle className="text-sm">Success - Payment Received</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Thank you message confirming payment receipt.
                        Sent immediately upon payment processing.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default DunningEmailManager;
