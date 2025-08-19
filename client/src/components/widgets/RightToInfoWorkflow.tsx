import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileText, Clock, Send, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const transparencyRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee selection is required"),
  requestType: z.enum(['pay_criteria', 'pay_levels', 'progression']),
  requestDetails: z.string().min(10, "Please provide detailed information about your request"),
});

type TransparencyRequestForm = z.infer<typeof transparencyRequestSchema>;

interface PendingRequest {
  id: string;
  employeeId: string;
  requestType: string;
  requestDate: string;
  requestDetails: string;
  status: string;
  responseDeadline: string;
}

export function RightToInfoWorkflow({ propertyId = "demo-property" }: { propertyId?: string }) {
  const [activeTab, setActiveTab] = useState<'submit' | 'pending'>('submit');
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<TransparencyRequestForm>();
  const selectedRequestType = watch("requestType");

  // Get pending requests for HR review
  const { data: pendingRequests, isLoading } = useQuery<{ data: PendingRequest[] }>({
    queryKey: ['/api/pay-equity/pending-requests', propertyId],
    refetchInterval: 60000, // 1 minute
  });

  const submitRequestMutation = useMutation({
    mutationFn: async (data: TransparencyRequestForm) => {
      return apiRequest('/api/pay-equity/transparency-request', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (result: any) => {
      toast({
        title: "🔍 Request Submitted",
        description: `Your transparency request has been submitted. Response due: ${new Date(result.data.responseDeadline).toLocaleDateString('el-GR')}`,
      });
      reset();
      setActiveTab('pending');
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Could not submit your request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransparencyRequestForm) => {
    submitRequestMutation.mutate(data);
  };

  const getRequestTypeDescription = (type: string) => {
    switch (type) {
      case 'pay_criteria':
        return 'Information about the criteria and factors used to determine your pay level';
      case 'pay_levels':
        return 'Details about pay levels for your role or similar positions in the organization';
      case 'progression':
        return 'Information about career progression opportunities and associated pay changes';
      default:
        return '';
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'pay_criteria': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pay_levels': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'progression': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDaysRemaining = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <Button
          variant={activeTab === 'submit' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('submit')}
          className="flex-1"
        >
          <Send className="h-4 w-4 mr-2" />
          Submit Request
        </Button>
        <Button
          variant={activeTab === 'pending' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('pending')}
          className="flex-1"
        >
          <Clock className="h-4 w-4 mr-2" />
          Pending ({pendingRequests?.data.length || 0})
        </Button>
      </div>

      {activeTab === 'submit' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Employee Right-to-Information Request
            </CardTitle>
            <CardDescription>
              Submit a request for pay transparency information (Article 8, EU 2023/970)
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Employee Selection */}
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input
                  id="employeeId"
                  placeholder="Enter your employee ID"
                  {...register("employeeId")}
                />
                {errors.employeeId && (
                  <p className="text-sm text-red-500">{errors.employeeId.message}</p>
                )}
              </div>

              {/* Request Type */}
              <div className="space-y-2">
                <Label>Request Type *</Label>
                <Select onValueChange={(value: any) => setValue("requestType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of information you're requesting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pay_criteria">
                      Pay Criteria & Factors
                    </SelectItem>
                    <SelectItem value="pay_levels">
                      Pay Levels & Ranges
                    </SelectItem>
                    <SelectItem value="progression">
                      Career Progression
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedRequestType && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getRequestTypeDescription(selectedRequestType)}
                  </p>
                )}
                {errors.requestType && (
                  <p className="text-sm text-red-500">{errors.requestType.message}</p>
                )}
              </div>

              {/* Request Details */}
              <div className="space-y-2">
                <Label htmlFor="requestDetails">Detailed Request *</Label>
                <Textarea
                  id="requestDetails"
                  placeholder="Please provide specific details about the information you're requesting..."
                  rows={4}
                  {...register("requestDetails")}
                />
                {errors.requestDetails && (
                  <p className="text-sm text-red-500">{errors.requestDetails.message}</p>
                )}
              </div>

              {/* Legal Information */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Your Rights:</strong> Under EU Directive 2023/970, you have the right to request information about:
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    <li>Pay criteria and factors used in pay decisions</li>
                    <li>Pay levels for your position or comparable roles</li>
                    <li>Career progression and pay advancement opportunities</li>
                  </ul>
                  <p className="mt-2 text-sm">
                    <strong>Response Timeline:</strong> You will receive a response within 2 months of submission.
                  </p>
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                disabled={submitRequestMutation.isPending}
                className="w-full"
              >
                {submitRequestMutation.isPending ? (
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Transparency Requests
            </CardTitle>
            <CardDescription>
              Requests pending HR review and response
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-4 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                  </div>
                ))}
              </div>
            ) : pendingRequests?.data && pendingRequests.data.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.data.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <Badge className={getRequestTypeColor(request.requestType)}>
                        {request.requestType.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Employee: {request.employeeId}
                      </span>
                    </div>

                    {/* Request Details */}
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {request.requestDetails}
                      </p>
                    </div>

                    {/* Timeline */}
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted: {formatDate(request.requestDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {calculateDaysRemaining(request.responseDeadline) > 14 ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {calculateDaysRemaining(request.responseDeadline)} days remaining
                          </Badge>
                        ) : calculateDaysRemaining(request.responseDeadline) > 0 ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            {calculateDaysRemaining(request.responseDeadline)} days remaining
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        View Details
                      </Button>
                      <Button size="sm" className="flex-1">
                        Prepare Response
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="font-medium mb-2">No Pending Requests</h3>
                <p className="text-sm">All transparency requests have been processed.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}