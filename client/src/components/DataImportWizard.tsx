import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  MapPin,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
} from 'lucide-react';

export interface DataImportWizardProps {
  trigger?: React.ReactNode;
  onImportComplete?: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'validation' | 'preview' | 'execute';
type DataType = 'employees' | 'contracts' | 'bank_details' | 'wage_components';

interface ImportSession {
  sessionId: string;
  dataType: DataType;
  fileName: string;
  totalRows: number;
  mappedColumns: ColumnMapping[];
  parsedData: any[];
  validationResults: ValidationResult[];
  dryRunResults?: DryRunResult[];
  status: string;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  required: boolean;
  dataType: string;
}

interface ValidationResult {
  rowIndex: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValid: boolean;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

interface DryRunResult {
  rowIndex: number;
  action: 'insert' | 'update' | 'skip';
  existingData?: any;
  newData: any;
  changes?: FieldChange[];
  conflicts: string[];
}

interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'modified' | 'removed';
}

const DATA_TYPE_LABELS: Record<DataType, string> = {
  employees: 'Employees',
  contracts: 'Employment Contracts',
  bank_details: 'Bank Details',
  wage_components: 'Wage Components',
};

const STEP_TITLES: Record<ImportStep, string> = {
  upload: 'Upload File',
  mapping: 'Map Fields',
  validation: 'Validate Data',
  preview: 'Preview Changes',
  execute: 'Import Data',
};

export function DataImportWizard({
  trigger,
  onImportComplete,
}: DataImportWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedDataType, setSelectedDataType] =
    useState<DataType>('employees');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
    {}
  );
  const [confirmImport, setConfirmImport] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get session data
  const { data: sessionData, refetch: refetchSession } = useQuery({
    queryKey: ['/api/data-import', sessionId],
    enabled: !!sessionId,
    retry: false,
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      dataType,
    }: {
      file: File;
      dataType: DataType;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataType', dataType);

      const response = await fetch('/api/data-import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: data => {
      setSessionId(data.sessionId);
      setCurrentStep('mapping');
      toast({
        title: 'File uploaded successfully',
        description: `${data.totalRows} rows ready for mapping`,
      });
    },
    onError: error => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Column mapping mutation
  const mappingMutation = useMutation({
    mutationFn: async (
      mappings: { sourceColumn: string; targetField: string }[]
    ) => {
      const response = await apiRequest(
        'PUT',
        `/api/data-import/${sessionId}/mapping`,
        { mappings }
      );
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep('validation');
      refetchSession();
      toast({
        title: 'Column mapping saved',
        description: 'Ready for data validation',
      });
    },
  });

  // Data validation mutation
  const validationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/data-import/${sessionId}/validate`
      );
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep('preview');
      refetchSession();
      toast({
        title: 'Data validated',
        description: 'Ready to preview changes',
      });
    },
  });

  // Dry run mutation
  const dryRunMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/data-import/${sessionId}/dry-run`
      );
      return response.json();
    },
    onSuccess: () => {
      refetchSession();
      toast({
        title: 'Dry run complete',
        description: 'Preview of changes is ready',
      });
    },
  });

  // Execute import mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/data-import/${sessionId}/execute`,
        { confirmImport: true }
      );
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Import completed successfully',
        description: `${data.summary.inserted} records inserted, ${data.summary.updated} updated`,
      });
      setIsOpen(false);
      resetWizard();
      onImportComplete?.();
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
    },
    onError: error => {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetWizard = useCallback(() => {
    setCurrentStep('upload');
    setSessionId(null);
    setSelectedFile(null);
    setColumnMappings({});
    setConfirmImport(false);
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile, dataType: selectedDataType });
    }
  };

  const handleMappingComplete = () => {
    const mappings = Object.entries(columnMappings)
      .filter(
        ([sourceColumn, targetField]) => targetField && targetField !== 'skip'
      )
      .map(([sourceColumn, targetField]) => ({
        sourceColumn,
        targetField,
      }));

    if (mappings.length === 0) {
      toast({
        title: 'No mappings defined',
        description: 'Please map at least one column',
        variant: 'destructive',
      });
      return;
    }

    mappingMutation.mutate(mappings);
  };

  const getProgressPercent = (): number => {
    const steps: ImportStep[] = [
      'upload',
      'mapping',
      'validation',
      'preview',
      'execute',
    ];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Data Import Wizard
          </DialogTitle>
          <DialogDescription>
            Import CSV or Excel files with intelligent field mapping and
            validation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{STEP_TITLES[currentStep]}</span>
              <span>{Math.round(getProgressPercent())}% Complete</span>
            </div>
            <Progress value={getProgressPercent()} className="w-full" />
          </div>

          <ScrollArea className="max-h-[60vh]">
            {/* Upload Step */}
            {currentStep === 'upload' && (
              <Card>
                <CardHeader>
                  <CardTitle>Upload File</CardTitle>
                  <CardDescription>
                    Select the type of data and upload your CSV or Excel file
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dataType">Data Type</Label>
                    <Select
                      value={selectedDataType}
                      onValueChange={(value: DataType) =>
                        setSelectedDataType(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DATA_TYPE_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {selectedFile && (
                    <Alert>
                      <FileSpreadsheet className="h-4 w-4" />
                      <AlertTitle>File Selected</AlertTitle>
                      <AlertDescription>
                        {selectedFile.name} (
                        {Math.round(selectedFile.size / 1024)}KB)
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mapping Step */}
            {currentStep === 'mapping' && sessionData && (
              <ColumnMappingStep
                sessionData={sessionData}
                columnMappings={columnMappings}
                onMappingChange={setColumnMappings}
              />
            )}

            {/* Validation Step */}
            {currentStep === 'validation' && sessionData && (
              <ValidationStep
                sessionData={sessionData}
                onValidate={() => validationMutation.mutate()}
                isValidating={validationMutation.isPending}
              />
            )}

            {/* Preview Step */}
            {currentStep === 'preview' && sessionData && (
              <PreviewStep
                sessionData={sessionData}
                onDryRun={() => dryRunMutation.mutate()}
                isDryRunning={dryRunMutation.isPending}
              />
            )}

            {/* Execute Step */}
            {currentStep === 'execute' && sessionData && (
              <ExecuteStep
                sessionData={sessionData}
                onExecute={() => executeMutation.mutate()}
                isExecuting={executeMutation.isPending}
                confirmImport={confirmImport}
                onConfirmChange={setConfirmImport}
              />
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep !== 'upload' && (
              <Button
                variant="outline"
                onClick={() => {
                  const steps: ImportStep[] = [
                    'upload',
                    'mapping',
                    'validation',
                    'preview',
                    'execute',
                  ];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex > 0) {
                    setCurrentStep(steps[currentIndex - 1]);
                  }
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetWizard}>
              Reset
            </Button>

            {currentStep === 'upload' && (
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Upload & Continue
              </Button>
            )}

            {currentStep === 'mapping' && (
              <Button
                onClick={handleMappingComplete}
                disabled={mappingMutation.isPending}
              >
                {mappingMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Continue to Validation
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Column Mapping Step Component
interface ColumnMappingStepProps {
  sessionData: {
    headers: string[];
    sampleData: any[];
    availableFields: string[];
    totalRows: number;
  };
  columnMappings: Record<string, string>;
  onMappingChange: (mappings: Record<string, string>) => void;
}

function ColumnMappingStep({
  sessionData,
  columnMappings,
  onMappingChange,
}: ColumnMappingStepProps) {
  const updateMapping = (sourceColumn: string, targetField: string) => {
    onMappingChange({
      ...columnMappings,
      [sourceColumn]: targetField,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map Fields</CardTitle>
        <CardDescription>
          Map columns from your file to database fields. Required fields are
          marked with an asterisk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sample Data Preview */}
          <div>
            <h4 className="text-sm font-medium mb-2">Sample Data Preview</h4>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {sessionData.headers.map((header: string) => (
                        <th key={header} className="p-2 text-left font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessionData.sampleData
                      .slice(0, 3)
                      .map((row: any, index: number) => (
                        <tr key={index} className="border-t">
                          {sessionData.headers.map((header: string) => (
                            <td key={header} className="p-2">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <Separator />

          {/* Field Mappings */}
          <div className="grid gap-4">
            {sessionData.headers.map((sourceColumn: string) => (
              <div key={sourceColumn} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{sourceColumn}</Label>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <Select
                    value={columnMappings[sourceColumn] || 'skip'}
                    onValueChange={value => updateMapping(sourceColumn, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip this column</SelectItem>
                      {sessionData.availableFields.map((field: string) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Validation Step Component
interface ValidationStepProps {
  sessionData: {
    validationResults?: ValidationResult[];
    totalRows: number;
  };
  onValidate: () => void;
  isValidating: boolean;
}

function ValidationStep({
  sessionData,
  onValidate,
  isValidating,
}: ValidationStepProps) {
  const hasValidationResults =
    sessionData?.validationResults && sessionData.validationResults.length > 0;
  const validRows = hasValidationResults
    ? sessionData.validationResults.filter((r: ValidationResult) => r.isValid)
        .length
    : 0;
  const errorRows = hasValidationResults
    ? sessionData.validationResults.filter((r: ValidationResult) => !r.isValid)
        .length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validate Data</CardTitle>
        <CardDescription>
          Run validation checks on your mapped data to ensure Greek compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasValidationResults ? (
          <div className="text-center py-8">
            <Button onClick={onValidate} disabled={isValidating}>
              {isValidating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Run Validation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{validRows}</p>
                      <p className="text-sm text-muted-foreground">
                        Valid Rows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold">{errorRows}</p>
                      <p className="text-sm text-muted-foreground">
                        Error Rows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {sessionData.totalRows}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Rows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {errorRows > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Validation Errors</h4>
                <ScrollArea className="h-40 border rounded">
                  <div className="p-2 space-y-2">
                    {sessionData.validationResults
                      .filter((r: ValidationResult) => !r.isValid)
                      .slice(0, 10)
                      .map((result: ValidationResult) => (
                        <div
                          key={result.rowIndex}
                          className="text-sm border rounded p-2"
                        >
                          <div className="font-medium">
                            Row {result.rowIndex + 1}
                          </div>
                          {result.errors.map((error: ValidationError) => (
                            <div
                              key={`${error.field}-${error.code}`}
                              className="text-red-600 text-xs"
                            >
                              {error.field}: {error.message}
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Preview Step Component
interface PreviewStepProps {
  sessionData: {
    dryRunResults?: DryRunResult[];
    totalRows: number;
  };
  onDryRun: () => void;
  isDryRunning: boolean;
}

function PreviewStep({
  sessionData,
  onDryRun,
  isDryRunning,
}: PreviewStepProps) {
  const hasDryRunResults =
    sessionData?.dryRunResults && sessionData.dryRunResults.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview Changes</CardTitle>
        <CardDescription>
          Review what changes will be made to your data before importing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasDryRunResults ? (
          <div className="text-center py-8">
            <Button onClick={onDryRun} disabled={isDryRunning}>
              {isDryRunning ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Generate Preview
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800"
                    >
                      INSERT
                    </Badge>
                    <div>
                      <p className="text-2xl font-bold">
                        {
                          sessionData.dryRunResults.filter(
                            (r: DryRunResult) => r.action === 'insert'
                          ).length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        New Records
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="default"
                      className="bg-blue-100 text-blue-800"
                    >
                      UPDATE
                    </Badge>
                    <div>
                      <p className="text-2xl font-bold">
                        {
                          sessionData.dryRunResults.filter(
                            (r: DryRunResult) => r.action === 'update'
                          ).length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Updates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">SKIP</Badge>
                    <div>
                      <p className="text-2xl font-bold">
                        {
                          sessionData.dryRunResults.filter(
                            (r: DryRunResult) => r.action === 'skip'
                          ).length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Skipped</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Changes Preview */}
            <div>
              <h4 className="text-sm font-medium mb-2">Change Details</h4>
              <ScrollArea className="h-40 border rounded">
                <div className="p-2 space-y-2">
                  {sessionData.dryRunResults
                    .filter((r: DryRunResult) => r.action !== 'skip')
                    .slice(0, 10)
                    .map((result: DryRunResult) => (
                      <div
                        key={result.rowIndex}
                        className="text-sm border rounded p-2"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              result.action === 'insert'
                                ? 'default'
                                : 'secondary'
                            }
                            className={
                              result.action === 'insert'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {result.action.toUpperCase()}
                          </Badge>
                          <span className="font-medium">
                            Row {result.rowIndex + 1}
                          </span>
                        </div>
                        {result.changes && result.changes.length > 0 && (
                          <div className="text-xs space-y-1">
                            {result.changes
                              .slice(0, 3)
                              .map((change: FieldChange) => (
                                <div
                                  key={change.field}
                                  className="flex justify-between"
                                >
                                  <span className="font-medium">
                                    {change.field}:
                                  </span>
                                  <span>
                                    {change.type === 'modified' && (
                                      <>
                                        <span className="text-red-600">
                                          {change.oldValue}
                                        </span>
                                        <span className="mx-1">→</span>
                                        <span className="text-green-600">
                                          {change.newValue}
                                        </span>
                                      </>
                                    )}
                                    {change.type === 'added' && (
                                      <span className="text-green-600">
                                        {change.newValue}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Execute Step Component
interface ExecuteStepProps {
  sessionData: {
    dryRunResults?: DryRunResult[];
    totalRows: number;
  };
  onExecute: () => void;
  isExecuting: boolean;
  confirmImport: boolean;
  onConfirmChange: (confirmed: boolean) => void;
}

function ExecuteStep({
  sessionData,
  onExecute,
  isExecuting,
  confirmImport,
  onConfirmChange,
}: ExecuteStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Execute Import</CardTitle>
        <CardDescription>
          Confirm and execute the data import. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Final Confirmation</AlertTitle>
          <AlertDescription>
            You are about to import data into the system. Please review the
            summary below and confirm.
          </AlertDescription>
        </Alert>

        {sessionData?.dryRunResults && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">New Records</p>
              <p className="text-2xl font-bold text-green-600">
                {
                  sessionData.dryRunResults.filter(
                    (r: DryRunResult) => r.action === 'insert'
                  ).length
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Updates</p>
              <p className="text-2xl font-bold text-blue-600">
                {
                  sessionData.dryRunResults.filter(
                    (r: DryRunResult) => r.action === 'update'
                  ).length
                }
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="confirmImport"
            checked={confirmImport}
            onChange={e => onConfirmChange(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="confirmImport" className="text-sm">
            I understand this action cannot be undone and want to proceed with
            the import
          </Label>
        </div>

        <Button
          onClick={onExecute}
          disabled={!confirmImport || isExecuting}
          className="w-full"
          size="lg"
        >
          {isExecuting ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Execute Import
        </Button>
      </CardContent>
    </Card>
  );
}
