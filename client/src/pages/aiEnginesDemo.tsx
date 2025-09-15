import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Users,
  Calendar,
  Target,
  Lightbulb,
  Settings,
  Bot,
} from 'lucide-react';

// Sample property data - in a real app this would come from an API
const SAMPLE_PROPERTIES = [
  { id: 'prop-1', name: 'Athens Central Hotel' },
  { id: 'prop-2', name: 'Santorini Resort' },
  { id: 'prop-3', name: 'Thessaloniki Business Center' },
];

export default function AIEnginesDemo() {
  const [selectedProperty, setSelectedProperty] = useState('');
  const [weekStarting, setWeekStarting] = useState(() => {
    const today = new Date();
    const monday = new Date(
      today.setDate(today.getDate() - today.getDay() + 1)
    );
    return monday.toISOString().split('T')[0];
  });
  const [analysisDate, setAnalysisDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Overtime Analysis Query
  const {
    data: overtimeAnalysis,
    isLoading: overtimeLoading,
    refetch: refetchOvertime,
  } = useQuery({
    queryKey: ['/api/ai/overtime-analysis', selectedProperty, weekStarting],
    enabled: !!selectedProperty && !!weekStarting,
  });

  // Overtime Recommendations Query
  const { data: overtimeRecommendations, isLoading: recommendationsLoading } =
    useQuery({
      queryKey: [
        '/api/ai/overtime-recommendations',
        selectedProperty,
        weekStarting,
      ],
      enabled: !!selectedProperty && !!weekStarting,
    });

  // Exception Analysis Query
  const {
    data: exceptionAnalysis,
    isLoading: exceptionsLoading,
    refetch: refetchExceptions,
  } = useQuery({
    queryKey: ['/api/ai/exception-analysis', selectedProperty, analysisDate],
    enabled: !!selectedProperty && !!analysisDate,
  });

  // Apply Overtime Recommendation Mutation
  const applyRecommendationMutation = useMutation({
    mutationFn: async ({
      recommendationId,
      notes,
    }: {
      recommendationId: string;
      notes?: string;
    }) => {
      const response = await fetch('/api/ai/apply-overtime-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId, notes }),
      });
      if (!response.ok) throw new Error('Failed to apply recommendation');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Recommendation Applied',
        description:
          'The overtime prevention recommendation has been applied successfully.',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/ai/overtime-analysis'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/ai/overtime-recommendations'],
      });
    },
    onError: error => {
      toast({
        title: 'Error',
        description: `Failed to apply recommendation: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Process Exceptions Mutation
  const processExceptionsMutation = useMutation({
    mutationFn: async ({
      propertyId,
      date,
    }: {
      propertyId: string;
      date: string;
    }) => {
      const response = await fetch(`/api/ai/process-exceptions/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!response.ok) throw new Error('Failed to process exceptions');
      return response.json();
    },
    onSuccess: data => {
      toast({
        title: 'Exceptions Processed',
        description: `Processed ${data.processed} exceptions: ${data.autoApplied} auto-applied, ${data.sentForApproval} sent for approval.`,
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/ai/exception-analysis'],
      });
    },
    onError: error => {
      toast({
        title: 'Error',
        description: `Failed to process exceptions: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">AI Engines Dashboard</h1>
          <p className="text-muted-foreground">
            Automated overtime prevention and exception resolution powered by AI
          </p>
        </div>
      </div>

      {/* Property Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
            <Select
              value={selectedProperty}
              onValueChange={setSelectedProperty}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {SAMPLE_PROPERTIES.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedProperty && (
        <Tabs defaultValue="overtime" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overtime" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overtime Prevention
            </TabsTrigger>
            <TabsTrigger value="exceptions" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Exception Resolution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overtime" className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="week-starting">Week Starting</Label>
                <Input
                  id="week-starting"
                  type="date"
                  value={weekStarting}
                  onChange={e => setWeekStarting(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button
                onClick={() => refetchOvertime()}
                disabled={overtimeLoading}
              >
                Refresh Analysis
              </Button>
            </div>

            {/* Overtime Risk Analysis */}
            {overtimeAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      High Risk Employees
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {overtimeAnalysis.totalRiskyEmployees}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Projected OT Cost
                    </CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      €{overtimeAnalysis.projectedOvertimeCost.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Recommendations
                    </CardTitle>
                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {overtimeAnalysis.recommendations.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Week Period
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">
                      {new Date(
                        overtimeAnalysis.weekStarting
                      ).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* High Risk Employees */}
            {overtimeAnalysis?.highRiskEmployees &&
              overtimeAnalysis.highRiskEmployees.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      High Risk Employees
                    </CardTitle>
                    <CardDescription>
                      Employees at risk of exceeding overtime limits
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {overtimeAnalysis.highRiskEmployees
                        .slice(0, 5)
                        .map((employee, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="space-y-1">
                              <div className="font-medium">
                                {employee.employeeName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Current: {employee.currentWeekHours.toFixed(1)}h
                                | Projected:{' '}
                                {employee.projectedWeeklyHours.toFixed(1)}h
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {employee.reasons
                                  .slice(0, 2)
                                  .map((reason, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {reason}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                            <Badge
                              variant={getRiskBadgeColor(employee.riskLevel)}
                            >
                              {employee.riskLevel.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {/* AI Recommendations */}
            {overtimeRecommendations && overtimeRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    AI Recommendations
                  </CardTitle>
                  <CardDescription>
                    Automated suggestions to prevent overtime violations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overtimeRecommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="font-medium">{rec.description}</div>
                            <div className="text-sm text-muted-foreground">
                              Affected: {rec.affectedEmployees.length}{' '}
                              employee(s)
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-green-600">
                                Save €
                                {rec.projectedSavings.costSavings.toFixed(2)}
                              </span>
                              <span className="text-blue-600">
                                {(rec.confidence * 100).toFixed(0)}% confidence
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                rec.type === 'reduce_hours'
                                  ? 'destructive'
                                  : 'default'
                              }
                            >
                              {rec.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {rec.requiresApproval && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  applyRecommendationMutation.mutate({
                                    recommendationId: rec.recommendationId,
                                  })
                                }
                                disabled={applyRecommendationMutation.isPending}
                              >
                                Apply
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="exceptions" className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="analysis-date">Analysis Date</Label>
                <Input
                  id="analysis-date"
                  type="date"
                  value={analysisDate}
                  onChange={e => setAnalysisDate(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button
                onClick={() => refetchExceptions()}
                disabled={exceptionsLoading}
              >
                Refresh Analysis
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  processExceptionsMutation.mutate({
                    propertyId: selectedProperty,
                    date: analysisDate,
                  })
                }
                disabled={processExceptionsMutation.isPending}
              >
                Process All
              </Button>
            </div>

            {/* Exception Summary */}
            {exceptionAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Exceptions
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {exceptionAnalysis.totalExceptions}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Auto Resolved
                    </CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {exceptionAnalysis.autoResolved}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pending Approval
                    </CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {exceptionAnalysis.pendingApproval}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Escalated
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {exceptionAnalysis.escalated}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Exception Details */}
            {exceptionAnalysis?.exceptions &&
              exceptionAnalysis.exceptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Exception Details
                    </CardTitle>
                    <CardDescription>
                      Detected punch exceptions and proposed resolutions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {exceptionAnalysis.exceptions
                        .slice(0, 10)
                        .map((exception, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {exception.employeeName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {exception.exceptionType.type
                                    .replace('_', ' ')
                                    .toUpperCase()}{' '}
                                  -{' '}
                                  {new Date(
                                    exception.date
                                  ).toLocaleDateString()}
                                </div>
                                <div className="text-sm">
                                  {exception.resolutionAction.description}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Badge
                                    variant={getSeverityBadgeColor(
                                      exception.exceptionType.severity
                                    )}
                                  >
                                    {exception.exceptionType.severity.toUpperCase()}
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    {(
                                      exception.exceptionType.confidence * 100
                                    ).toFixed(0)}
                                    % confidence
                                  </span>
                                  <span
                                    className={`font-medium ${
                                      exception.status === 'resolved'
                                        ? 'text-green-600'
                                        : exception.status ===
                                            'pending_approval'
                                          ? 'text-orange-600'
                                          : exception.status === 'escalated'
                                            ? 'text-red-600'
                                            : 'text-gray-600'
                                    }`}
                                  >
                                    {exception.status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </TabsContent>
        </Tabs>
      )}

      {!selectedProperty && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Select Property</AlertTitle>
          <AlertDescription>
            Please select a property to view AI engine analysis and
            recommendations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
