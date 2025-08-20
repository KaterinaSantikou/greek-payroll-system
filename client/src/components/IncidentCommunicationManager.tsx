/**
 * Incident Communication Manager Component
 * Provides interface for managing standardized incident communications
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings, 
  Send,
  RefreshCw,
  Eye,
  Copy
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CommunicationTemplate {
  type: string;
  severity?: string;
  subjectTemplate: string;
  messageTemplate: string;
  variables: TemplateVariable[];
  defaultChannels: string[];
  isActive: boolean;
}

interface TemplateVariable {
  key: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  example: string;
}

interface GeneratedCommunication {
  id: string;
  templateType: string;
  severity: string;
  subject: string;
  message: string;
  variables: Record<string, string>;
  channels: string[];
  timestamp: string;
}

const SEVERITY_COLORS = {
  minor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  major: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300'
};

const TEMPLATE_TYPE_LABELS = {
  incident_detected: 'Incident Detected',
  incident_investigating: 'Under Investigation',
  incident_identified: 'Issue Identified',
  incident_monitoring: 'Monitoring Fix',
  incident_resolved: 'Incident Resolved',
  maintenance_scheduled: 'Maintenance Scheduled',
  maintenance_started: 'Maintenance Started',
  maintenance_completed: 'Maintenance Completed',
  service_degraded: 'Service Degraded',
  service_restored: 'Service Restored'
};

export function IncidentCommunicationManager() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedCommunication, setGeneratedCommunication] = useState<GeneratedCommunication | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await apiRequest('GET', '/api/incident-templates/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load communication templates',
        variant: 'destructive'
      });
    }
  };

  const handleTemplateSelect = (templateKey: string) => {
    const template = templates.find(t => 
      t.severity ? `${t.type}_${t.severity}` === templateKey : t.type === templateKey
    );
    
    if (template) {
      setSelectedTemplate(template);
      // Initialize variables with default values
      const initialVariables: Record<string, string> = {};
      template.variables.forEach(variable => {
        if (variable.defaultValue) {
          initialVariables[variable.key] = variable.defaultValue;
        }
      });
      setVariables(initialVariables);
      setGeneratedCommunication(null);
      setValidationErrors([]);
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
    setValidationErrors([]);
  };

  const validateInputs = async (): Promise<boolean> => {
    if (!selectedTemplate) return false;

    try {
      const response = await apiRequest('POST', '/api/incident-templates/validate', {
        templateType: selectedTemplate.type,
        variables,
        severity: selectedTemplate.severity
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.validation.isValid) {
          setValidationErrors(data.validation.errors);
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error('Validation failed:', error);
      setValidationErrors(['Validation failed']);
      return false;
    }
    
    return false;
  };

  const generateCommunication = async () => {
    if (!selectedTemplate) return;

    const isValid = await validateInputs();
    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the validation errors before generating',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('POST', '/api/incident-templates/generate', {
        templateType: selectedTemplate.type,
        variables,
        severity: selectedTemplate.severity
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCommunication(data.communication);
        toast({
          title: 'Success',
          description: 'Communication generated successfully'
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Generation Failed',
          description: errorData.error || 'Failed to generate communication',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to generate communication:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate communication',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCommunication = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Communication copied to clipboard'
    });
  };

  const getTemplateIcon = (type: string) => {
    if (type.includes('incident')) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (type.includes('maintenance')) {
      return <Settings className="h-4 w-4" />;
    }
    if (type.includes('resolved') || type.includes('completed') || type.includes('restored')) {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  };

  const groupedTemplates = templates.reduce((groups, template) => {
    const key = template.type;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(template);
    return groups;
  }, {} as Record<string, CommunicationTemplate[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Incident Communication Manager</h2>
          <p className="text-sm text-muted-foreground">
            Create standardized communications for incidents and maintenance
          </p>
        </div>
        <Button onClick={loadTemplates} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Templates
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Communication Template</CardTitle>
            <CardDescription>
              Choose a template based on the incident type and severity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="template-select">Template Type</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a communication template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
                    <div key={type}>
                      <div className="font-medium text-sm text-muted-foreground px-2 py-1">
                        {TEMPLATE_TYPE_LABELS[type as keyof typeof TEMPLATE_TYPE_LABELS] || type}
                      </div>
                      {typeTemplates.map(template => (
                        <SelectItem 
                          key={template.severity ? `${template.type}_${template.severity}` : template.type}
                          value={template.severity ? `${template.type}_${template.severity}` : template.type}
                        >
                          <div className="flex items-center space-x-2">
                            {getTemplateIcon(template.type)}
                            <span>
                              {template.severity ? (
                                <>
                                  {TEMPLATE_TYPE_LABELS[template.type as keyof typeof TEMPLATE_TYPE_LABELS]} - 
                                  <Badge className={`ml-1 ${SEVERITY_COLORS[template.severity as keyof typeof SEVERITY_COLORS]}`}>
                                    {template.severity}
                                  </Badge>
                                </>
                              ) : (
                                TEMPLATE_TYPE_LABELS[template.type as keyof typeof TEMPLATE_TYPE_LABELS]
                              )}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Template Preview</Label>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Subject:</span>
                      <p className="text-sm font-mono bg-background p-2 rounded border">
                        {selectedTemplate.subjectTemplate}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Message:</span>
                      <p className="text-sm font-mono bg-background p-2 rounded border">
                        {selectedTemplate.messageTemplate}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Default Channels</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTemplate.defaultChannels.map(channel => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variable Input */}
        {selectedTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>Template Variables</CardTitle>
              <CardDescription>
                Fill in the required variables for the selected template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validationErrors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {selectedTemplate.variables.map(variable => (
                <div key={variable.key} className="space-y-2">
                  <Label htmlFor={variable.key} className="flex items-center space-x-2">
                    <span>{variable.key}</span>
                    {variable.required && (
                      <Badge variant="destructive" className="text-xs">required</Badge>
                    )}
                  </Label>
                  <Input
                    id={variable.key}
                    placeholder={variable.example}
                    value={variables[variable.key] || ''}
                    onChange={(e) => handleVariableChange(variable.key, e.target.value)}
                    className={validationErrors.some(e => e.includes(variable.key)) ? 'border-red-300' : ''}
                  />
                  <p className="text-xs text-muted-foreground">{variable.description}</p>
                </div>
              ))}

              <Button 
                onClick={generateCommunication} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Generate Communication
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generated Communication Preview */}
      {generatedCommunication && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Generated Communication</span>
            </CardTitle>
            <CardDescription>
              Preview and copy the generated communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Subject</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCommunication(generatedCommunication.subject)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg font-medium">
                  {generatedCommunication.subject}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">Message</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCommunication(generatedCommunication.message)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                  {generatedCommunication.message}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Severity:</span>
                    <Badge className={`ml-1 ${SEVERITY_COLORS[generatedCommunication.severity as keyof typeof SEVERITY_COLORS]}`}>
                      {generatedCommunication.severity}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Channels:</span>
                    <div className="flex flex-wrap gap-1 ml-1">
                      {generatedCommunication.channels.map(channel => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => copyCommunication(
                    `Subject: ${generatedCommunication.subject}\n\n${generatedCommunication.message}`
                  )}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}