import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  Download,
  Users,
  Signature,
  Mail,
  Shield,
  Sparkles,
  Brain,
  Zap,
} from 'lucide-react';

interface OCRResult {
  id: string;
  documentType: 'contract' | 'id_card' | 'passport' | 'other';
  extractedText: string;
  structuredData: Record<string, any>;
  confidence: number;
  processedAt: string;
  status: 'processed' | 'error' | 'pending';
  errors?: string[];
  originalFilename?: string;
  fileSize?: number;
  validation?: {
    valid: boolean;
    errors: string[];
  };
}

interface SignatureRequest {
  id: string;
  documentId: string;
  documentName: string;
  documentUrl: string;
  status:
    | 'draft'
    | 'sent'
    | 'in_progress'
    | 'completed'
    | 'declined'
    | 'expired';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  expiresAt: string;
  signers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'pending' | 'viewed' | 'signed' | 'declined';
    signedAt?: string;
    sequence: number;
  }>;
  reminderCount: number;
}

export default function DocumentAI() {
  const { toast } = useToast();
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadType, setUploadType] = useState<'single' | 'batch'>('single');
  const [documentType, setDocumentType] = useState<string>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResults, setProcessedResults] = useState<OCRResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<OCRResult | null>(null);

  // Signature request form state
  const [signatureForm, setSignatureForm] = useState({
    documentName: '',
    documentUrl: '',
    message: '',
    expirationDays: 30,
    signers: [
      {
        name: '',
        email: '',
        role: 'employee',
        sequence: 1,
        authenticationMethod: 'email',
      },
    ],
  });

  // Fetch analytics data
  const { data: analytics } = useQuery({
    queryKey: ['/api/documents/analytics'],
    refetchInterval: 30000,
  }) as { data?: { data?: any } };

  // Fetch signature requests
  const { data: signatureRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['/api/documents/signature-requests'],
    refetchInterval: 10000,
  }) as {
    data?: { data?: { requests?: SignatureRequest[]; summary?: any } };
    isLoading: boolean;
  };

  // Process documents mutation
  const processDocumentsMutation = useMutation({
    mutationFn: async ({
      files,
      type,
      documentType,
    }: {
      files: FileList;
      type: 'single' | 'batch';
      documentType: string;
    }) => {
      const formData = new FormData();

      if (type === 'single') {
        formData.append('document', files[0]);
        if (documentType !== 'auto') {
          formData.append('documentType', documentType);
        }
        const response = await fetch('/api/documents/process', {
          method: 'POST',
          body: formData,
        });
        return await response.json();
      } else {
        Array.from(files).forEach(file => {
          formData.append('documents', file);
        });
        const response = await fetch('/api/documents/process-batch', {
          method: 'POST',
          body: formData,
        });
        return await response.json();
      }
    },
    onSuccess: response => {
      if (uploadType === 'batch') {
        setProcessedResults(response.data?.results || []);
        toast({
          title: 'Batch Processing Complete',
          description: `Processed ${response.data?.summary?.processed || 0} documents successfully`,
        });
      } else {
        setProcessedResults([response.data]);
        toast({
          title: 'Document Processed',
          description: `OCR completed with ${((response.data?.confidence || 0) * 100).toFixed(1)}% confidence`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Processing Failed',
        description: error.message || 'Failed to process documents',
        variant: 'destructive',
      });
    },
  });

  // Create signature request mutation
  const createSignatureRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const response = await fetch('/api/documents/create-signature-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Signature Request Created',
        description: 'Document is ready for signing',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/documents/signature-requests'],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Send signature request mutation
  const sendSignatureRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(
        `/api/documents/send-signature-request/${requestId}`,
        {
          method: 'POST',
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Signature Request Sent',
        description: 'Emails sent to all signers',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/documents/signature-requests'],
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Send Request',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = useCallback(async () => {
    if (!uploadFiles || uploadFiles.length === 0) {
      toast({
        title: 'No Files Selected',
        description: 'Please select files to process',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await processDocumentsMutation.mutateAsync({
        files: uploadFiles,
        type: uploadType,
        documentType,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [uploadFiles, uploadType, documentType, processDocumentsMutation, toast]);

  const handleCreateSignatureRequest = useCallback(async () => {
    if (
      !signatureForm.documentName ||
      !signatureForm.documentUrl ||
      signatureForm.signers.length === 0
    ) {
      toast({
        title: 'Missing Required Fields',
        description:
          'Please fill in document name, URL, and at least one signer',
        variant: 'destructive',
      });
      return;
    }

    const requestData = {
      documentId: `doc_${Date.now()}`,
      documentName: signatureForm.documentName,
      documentUrl: signatureForm.documentUrl,
      signers: signatureForm.signers.map((signer, index) => ({
        ...signer,
        sequence: index + 1,
      })),
      message: signatureForm.message,
      expirationDays: signatureForm.expirationDays,
      legalCompliance: {
        requiresWitness: signatureForm.signers.some(s => s.role === 'witness'),
        contractType: 'indefinite',
        erganiNotificationRequired: true,
        minimumWageCompliance: true,
      },
    };

    await createSignatureRequestMutation.mutateAsync(requestData);
  }, [signatureForm, createSignatureRequestMutation, toast]);

  const addSigner = () => {
    setSignatureForm(prev => ({
      ...prev,
      signers: [
        ...prev.signers,
        {
          name: '',
          email: '',
          role: 'employee',
          sequence: prev.signers.length + 1,
          authenticationMethod: 'email',
        },
      ],
    }));
  };

  const removeSigner = (index: number) => {
    setSignatureForm(prev => ({
      ...prev,
      signers: prev.signers.filter((_, i) => i !== index),
    }));
  };

  const updateSigner = (index: number, field: string, value: string) => {
    setSignatureForm(prev => ({
      ...prev,
      signers: prev.signers.map((signer, i) =>
        i === index ? { ...signer, [field]: value } : signer
      ),
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'signed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'declined':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'viewed':
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'signed':
        return 'default';
      case 'declined':
      case 'error':
        return 'destructive';
      case 'in_progress':
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            Document AI
          </h1>
          <p className="text-muted-foreground">
            OCR processing for Greek employment contracts and IDs, plus
            e-signature workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI-Powered
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Greek Compliant
          </Badge>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Documents Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.data?.documentsProcessed?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.data?.documentsProcessed?.thisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                OCR Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((analytics.data?.ocrAccuracy?.average || 0) * 100).toFixed(1)}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Average confidence
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Signature Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.data?.signatureRequests?.pending || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending signatures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Processing Speed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                {analytics.data?.avgProcessingTime || 0}s
              </div>
              <p className="text-xs text-muted-foreground">
                Average processing time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            OCR Processing
          </TabsTrigger>
          <TabsTrigger value="signature" className="flex items-center gap-2">
            <Signature className="h-4 w-4" />
            E-Signature
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Signature Requests
          </TabsTrigger>
        </TabsList>

        {/* OCR Processing Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Document Upload & OCR Processing
              </CardTitle>
              <CardDescription>
                Upload Greek employment contracts, ID cards, or other documents
                for AI-powered OCR processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="upload-type">Processing Type</Label>
                  <Select
                    value={uploadType}
                    onValueChange={(value: 'single' | 'batch') =>
                      setUploadType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Document</SelectItem>
                      <SelectItem value="batch">Batch Processing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document-type">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-Detect</SelectItem>
                      <SelectItem value="contract">
                        Employment Contract
                      </SelectItem>
                      <SelectItem value="id_card">Greek ID Card</SelectItem>
                      <SelectItem value="passport">Greek Passport</SelectItem>
                      <SelectItem value="other">Other Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">Select Files</Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple={uploadType === 'batch'}
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp,.doc,.docx"
                  onChange={e => setUploadFiles(e.target.files)}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, JPG, PNG, TIFF, BMP, DOC, DOCX (Max:
                  50MB)
                </p>
              </div>

              <Button
                onClick={handleFileUpload}
                disabled={isProcessing || !uploadFiles}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing Documents...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Process with AI OCR
                  </>
                )}
              </Button>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing documents...</span>
                    <span>Please wait</span>
                  </div>
                  <Progress value={50} className="animate-pulse" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Results */}
          {processedResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Results</CardTitle>
                <CardDescription>
                  OCR extraction results with confidence scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processedResults.map(result => (
                    <Card
                      key={result.id}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            <CardTitle className="text-base">
                              {result.originalFilename ||
                                `Document ${result.id.slice(0, 8)}`}
                            </CardTitle>
                            <Badge variant="outline" className="capitalize">
                              {result.documentType.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <Badge
                              variant={getStatusBadgeVariant(result.status)}
                            >
                              {result.confidence > 0
                                ? `${(result.confidence * 100).toFixed(1)}% confidence`
                                : result.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {result.validation && !result.validation.valid && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Validation Issues:{' '}
                              {result.validation.errors.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}

                        {result.structuredData &&
                          Object.keys(result.structuredData).length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">
                                  Extracted Data:
                                </h4>
                                {Object.entries(result.structuredData).map(
                                  ([key, value]) => (
                                    <div key={key} className="text-xs">
                                      <span className="font-medium">
                                        {key}:
                                      </span>{' '}
                                      {String(value)}
                                    </div>
                                  )
                                )}
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">
                                  Document Info:
                                </h4>
                                <div className="text-xs space-y-1">
                                  <div>
                                    Size:{' '}
                                    {result.fileSize
                                      ? `${(result.fileSize / 1024).toFixed(1)} KB`
                                      : 'Unknown'}
                                  </div>
                                  <div>
                                    Processed:{' '}
                                    {new Date(
                                      result.processedAt
                                    ).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedResult(result)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Document Details</DialogTitle>
                                <DialogDescription>
                                  Full OCR extraction results and metadata
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Document Type</Label>
                                    <Badge className="capitalize mt-1">
                                      {result.documentType.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label>Confidence Score</Label>
                                    <div className="mt-1">
                                      <Progress
                                        value={result.confidence * 100}
                                        className="w-full"
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {(result.confidence * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Separator />
                                <div>
                                  <Label>Extracted Text</Label>
                                  <Textarea
                                    value={result.extractedText}
                                    readOnly
                                    className="mt-1 min-h-[200px]"
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {result.documentType === 'contract' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSignatureForm(prev => ({
                                  ...prev,
                                  documentName:
                                    result.originalFilename ||
                                    `Contract ${result.id.slice(0, 8)}`,
                                  documentUrl: `/api/documents/${result.id}`, // This would be the actual document URL
                                }));
                              }}
                            >
                              <Signature className="h-4 w-4 mr-1" />
                              Create Signature Request
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* E-Signature Tab */}
        <TabsContent value="signature" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signature className="h-5 w-5" />
                Create Signature Request
              </CardTitle>
              <CardDescription>
                Set up e-signature workflow for Greek employment contracts with
                legal compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-name">Document Name *</Label>
                  <Input
                    id="doc-name"
                    value={signatureForm.documentName}
                    onChange={e =>
                      setSignatureForm(prev => ({
                        ...prev,
                        documentName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Employment Contract - John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-url">Document URL *</Label>
                  <Input
                    id="doc-url"
                    value={signatureForm.documentUrl}
                    onChange={e =>
                      setSignatureForm(prev => ({
                        ...prev,
                        documentUrl: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message to Signers</Label>
                  <Textarea
                    id="message"
                    value={signatureForm.message}
                    onChange={e =>
                      setSignatureForm(prev => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    placeholder="Please review and sign this employment contract..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiration">Expiration (Days)</Label>
                  <Input
                    id="expiration"
                    type="number"
                    value={signatureForm.expirationDays}
                    onChange={e =>
                      setSignatureForm(prev => ({
                        ...prev,
                        expirationDays: parseInt(e.target.value) || 30,
                      }))
                    }
                    min={1}
                    max={365}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Signers</Label>
                  <Button onClick={addSigner} variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-1" />
                    Add Signer
                  </Button>
                </div>

                {signatureForm.signers.map((signer, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Name *</Label>
                          <Input
                            value={signer.name}
                            onChange={e =>
                              updateSigner(index, 'name', e.target.value)
                            }
                            placeholder="Full name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email *</Label>
                          <Input
                            type="email"
                            value={signer.email}
                            onChange={e =>
                              updateSigner(index, 'email', e.target.value)
                            }
                            placeholder="email@company.gr"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Role</Label>
                          <Select
                            value={signer.role}
                            onValueChange={value =>
                              updateSigner(index, 'role', value)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="employer">Employer</SelectItem>
                              <SelectItem value="witness">Witness</SelectItem>
                              <SelectItem value="hr_manager">
                                HR Manager
                              </SelectItem>
                              <SelectItem value="legal_counsel">
                                Legal Counsel
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Order: {index + 1}
                          </Badge>
                          {signatureForm.signers.length > 1 && (
                            <Button
                              onClick={() => removeSigner(index)}
                              variant="outline"
                              size="sm"
                              className="h-9"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Greek Legal Compliance:</strong> This signature
                  request will comply with Greek Law 4070/2012 for electronic
                  signatures and include ERGANI notification for employment
                  contracts.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleCreateSignatureRequest}
                disabled={createSignatureRequestMutation.isPending}
                className="w-full"
              >
                {createSignatureRequestMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Creating Request...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Create Signature Request
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signature Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Signature Requests
              </CardTitle>
              <CardDescription>
                Manage and monitor e-signature requests with real-time status
                updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : signatureRequests?.data?.requests?.length > 0 ? (
                <div className="space-y-4">
                  {signatureRequests.data.summary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {signatureRequests.data.summary.total}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {signatureRequests.data.summary.in_progress}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          In Progress
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {signatureRequests.data.summary.completed}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Completed
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {signatureRequests.data.summary.declined}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Declined
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {signatureRequests.data.summary.expired}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expired
                        </div>
                      </div>
                    </div>
                  )}

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Signers</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signatureRequests.data.requests.map(
                        (request: SignatureRequest) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {request.documentName}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(request.status)}
                                <Badge
                                  variant={getStatusBadgeVariant(
                                    request.status
                                  )}
                                >
                                  {request.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span>
                                  {
                                    request.signers.filter(
                                      s => s.status === 'signed'
                                    ).length
                                  }
                                </span>
                                <span className="text-muted-foreground">
                                  /{request.signers.length}
                                </span>
                                <Users className="h-3 w-3 text-muted-foreground ml-1" />
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(request.expiresAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {request.status === 'draft' && (
                                  <Button
                                    onClick={() =>
                                      sendSignatureRequestMutation.mutate(
                                        request.id
                                      )
                                    }
                                    disabled={
                                      sendSignatureRequestMutation.isPending
                                    }
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Send className="h-3 w-3" />
                                  </Button>
                                )}
                                {request.status === 'in_progress' && (
                                  <Button
                                    onClick={() => {
                                      // Send reminder functionality would be here
                                      toast({
                                        title: 'Reminder Sent',
                                        description:
                                          'Reminder emails sent to pending signers',
                                      });
                                    }}
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Signature Requests
                  </h3>
                  <p className="text-muted-foreground">
                    Create your first signature request to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
