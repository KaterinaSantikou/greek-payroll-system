import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
  Users,
  Shield,
  FileText,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ComplianceRecommendation {
  id: string;
  type: 'WARNING' | 'ERROR' | 'INFO' | 'SUCCESS';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category:
    | 'IDENTIFICATION'
    | 'EFKA'
    | 'WORKER_CLASSIFICATION'
    | 'FOREIGN_WORKER'
    | 'DISABILITY'
    | 'GENERAL';
  title: string;
  description: string;
  actionRequired: string;
  deadline?: string;
  affectedEmployees?: string[];
  autoFixAvailable?: boolean;
}

const getRecommendationIcon = (type: string) => {
  switch (type) {
    case 'ERROR':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'WARNING':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'INFO':
      return <Info className="h-5 w-5 text-blue-500" />;
    case 'SUCCESS':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'IDENTIFICATION':
      return <FileText className="h-4 w-4" />;
    case 'EFKA':
      return <Shield className="h-4 w-4" />;
    case 'WORKER_CLASSIFICATION':
      return <Users className="h-4 w-4" />;
    case 'FOREIGN_WORKER':
      return <FileText className="h-4 w-4" />;
    case 'DISABILITY':
      return <Shield className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'HIGH':
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
    case 'MEDIUM':
      return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
    case 'LOW':
      return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    default:
      return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950';
  }
};

interface ComplianceRecommendationsProps {
  employeeId?: string;
}

export default function ComplianceRecommendations({
  employeeId,
}: ComplianceRecommendationsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const queryClient = useQueryClient();

  const {
    data: recommendations,
    isLoading,
    error,
  } = useQuery({
    queryKey: employeeId
      ? ['/api/compliance/recommendations', employeeId]
      : ['/api/compliance/recommendations'],
    retry: 1,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const endpoint = employeeId
        ? `/api/compliance/recommendations?employeeId=${employeeId}`
        : '/api/compliance/recommendations';
      return apiRequest(endpoint, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: employeeId
          ? ['/api/compliance/recommendations', employeeId]
          : ['/api/compliance/recommendations'],
      });
    },
  });

  const autoFixMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      return apiRequest(`/api/compliance/auto-fix/${recommendationId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: employeeId
          ? ['/api/compliance/recommendations', employeeId]
          : ['/api/compliance/recommendations'],
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Αναλύουμε τη Συμμόρφωση...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Δεν ήταν δυνατή η φόρτωση των συστάσεων συμμόρφωσης. Παρακαλώ
          δοκιμάστε ξανά.
        </AlertDescription>
      </Alert>
    );
  }

  const filteredRecommendations =
    selectedCategory === 'ALL'
      ? recommendations || []
      : (recommendations || []).filter(
          (rec: ComplianceRecommendation) => rec.category === selectedCategory
        );

  const categories = [
    'ALL',
    'IDENTIFICATION',
    'EFKA',
    'WORKER_CLASSIFICATION',
    'FOREIGN_WORKER',
    'DISABILITY',
    'GENERAL',
  ];
  const categoryLabels: Record<string, string> = {
    ALL: 'Όλες',
    IDENTIFICATION: 'Ταυτοποίηση',
    EFKA: 'ΕΦΚΑ',
    WORKER_CLASSIFICATION: 'Κατηγοριοποίηση',
    FOREIGN_WORKER: 'Αλλοδαποί',
    DISABILITY: 'Αναπηρία',
    GENERAL: 'Γενικά',
  };

  const highPriorityCount = (recommendations || []).filter(
    (rec: ComplianceRecommendation) => rec.priority === 'HIGH'
  ).length;
  const errorCount = (recommendations || []).filter(
    (rec: ComplianceRecommendation) => rec.type === 'ERROR'
  ).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Μηχανή Συστάσεων Συμμόρφωσης AI
          </CardTitle>
          <CardDescription>
            Ανάλυση συμμόρφωσης με την ελληνική νομοθεσία και αυτοματοποιημένες
            συστάσεις
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {recommendations?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  Συνολικές Συστάσεις
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {errorCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Κρίσιμα Θέματα
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {highPriorityCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Υψηλή Προτεραιότητα
                </div>
              </div>
            </div>

            <Button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`}
              />
              Ανανέωση
            </Button>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(category => (
              <Badge
                key={category}
                variant={
                  selectedCategory === category ? 'default' : 'secondary'
                }
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryIcon(category)}
                <span className="ml-1">{categoryLabels[category]}</span>
              </Badge>
            ))}
          </div>

          {/* Recommendations List */}
          <div className="space-y-4">
            {filteredRecommendations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-700">
                  Εξαιρετική Συμμόρφωση!
                </h3>
                <p className="text-muted-foreground">
                  {selectedCategory === 'ALL'
                    ? 'Δεν βρέθηκαν θέματα συμμόρφωσης. Η επιχείρησή σας συμμορφώνεται πλήρως με την ελληνική νομοθεσία.'
                    : `Δεν βρέθηκαν θέματα στην κατηγορία "${categoryLabels[selectedCategory]}".`}
                </p>
              </div>
            ) : (
              filteredRecommendations.map(
                (recommendation: ComplianceRecommendation) => (
                  <Card
                    key={recommendation.id}
                    className={`${getPriorityColor(recommendation.priority)} border-l-4`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getRecommendationIcon(recommendation.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {recommendation.title}
                              </h4>
                              <Badge variant="outline" size="sm">
                                {recommendation.priority}
                              </Badge>
                              <Badge variant="secondary" size="sm">
                                {getCategoryIcon(recommendation.category)}
                                <span className="ml-1">
                                  {categoryLabels[recommendation.category]}
                                </span>
                              </Badge>
                            </div>

                            <p className="text-muted-foreground mb-3">
                              {recommendation.description}
                            </p>

                            <div className="bg-white dark:bg-gray-900 p-3 rounded-md mb-3">
                              <p className="font-medium text-sm mb-1">
                                Απαιτούμενη Ενέργεια:
                              </p>
                              <p className="text-sm">
                                {recommendation.actionRequired}
                              </p>
                            </div>

                            {recommendation.deadline && (
                              <div className="flex items-center gap-2 text-sm text-orange-600">
                                <Clock className="h-4 w-4" />
                                Προθεσμία:{' '}
                                {new Date(
                                  recommendation.deadline
                                ).toLocaleDateString('el-GR')}
                              </div>
                            )}

                            {recommendation.affectedEmployees &&
                              recommendation.affectedEmployees.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                  <Users className="h-4 w-4" />
                                  Επηρεάζει{' '}
                                  {recommendation.affectedEmployees.length}{' '}
                                  εργαζόμενο(ους)
                                </div>
                              )}
                          </div>
                        </div>

                        {recommendation.autoFixAvailable && (
                          <Button
                            size="sm"
                            onClick={() =>
                              autoFixMutation.mutate(recommendation.id)
                            }
                            disabled={autoFixMutation.isPending}
                            className="ml-4"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Αυτόματη Διόρθωση
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
