import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Euro, Calculator, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const salaryRangeSchema = z.object({
  jobTitle: z.string().min(1, 'Job title is required'),
  departmentId: z.string().optional(),
  benefitsDescription: z.string().optional(),
});

type SalaryRangeForm = z.infer<typeof salaryRangeSchema>;

interface GeneratedRange {
  suggestedRange: { min: number; max: number };
  marketData: any;
  factors: string[];
}

export function JobSalaryRangeGenerator({
  propertyId = 'demo-property',
}: {
  propertyId?: string;
}) {
  const [generatedRange, setGeneratedRange] = useState<GeneratedRange | null>(
    null
  );
  const [isGenerated, setIsGenerated] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SalaryRangeForm>();

  const generateRangeMutation = useMutation({
    mutationFn: async (
      data: SalaryRangeForm & { propertyId: string; createdBy: string }
    ) => {
      return apiRequest('/api/pay-equity/generate-salary-range', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (result: { data: any }) => {
      setGeneratedRange({
        suggestedRange: result.data.salaryRange
          ? {
              min: parseFloat(result.data.salaryRange.minSalary),
              max: parseFloat(result.data.salaryRange.maxSalary),
            }
          : { min: 0, max: 0 },
        marketData: result.data.marketData,
        factors: result.data.factors,
      });
      setIsGenerated(true);

      toast({
        title: '📊 Salary Range Generated',
        description: 'Compliant salary range created for job posting',
      });

      queryClient.invalidateQueries({
        queryKey: ['/api/pay-equity/salary-ranges', propertyId],
      });
    },
    onError: error => {
      toast({
        title: 'Generation Failed',
        description: 'Could not generate salary range. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SalaryRangeForm) => {
    generateRangeMutation.mutate({
      ...data,
      propertyId,
      createdBy: 'current-user', // In real app, get from auth
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleReset = () => {
    reset();
    setGeneratedRange(null);
    setIsGenerated(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5 text-green-500" />
          Job Posting Salary Range Generator
        </CardTitle>
        <CardDescription>
          Generate EU-compliant salary ranges for job advertisements (Article 5,
          EU 2023/970)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isGenerated ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Senior Software Engineer"
                  {...register('jobTitle')}
                />
                {errors.jobTitle && (
                  <p className="text-sm text-red-500">
                    {errors.jobTitle.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="departmentId">Department (Optional)</Label>
                <Input
                  id="departmentId"
                  placeholder="e.g., Engineering"
                  {...register('departmentId')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefitsDescription">
                Benefits & Additional Compensation
              </Label>
              <Textarea
                id="benefitsDescription"
                placeholder="Describe benefits, bonuses, stock options, etc."
                rows={3}
                {...register('benefitsDescription')}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>EU 2023/970 Compliance:</strong> Salary ranges must be
                included in job advertisements. The range will be calculated
                based on internal equity data and market benchmarks.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={generateRangeMutation.isPending}
              className="w-full"
            >
              {generateRangeMutation.isPending ? (
                <Calculator className="h-4 w-4 mr-2 animate-pulse" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              Generate Salary Range
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Generated Range Display */}
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Compliant Salary Range Generated
                </h3>
              </div>

              {generatedRange && (
                <div className="space-y-4">
                  {/* Range Display */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-700 dark:text-green-300 mb-2">
                      {formatCurrency(generatedRange.suggestedRange.min)} -{' '}
                      {formatCurrency(generatedRange.suggestedRange.max)}
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Monthly Salary Range
                    </p>
                  </div>

                  {/* Market Data */}
                  {generatedRange.marketData &&
                    generatedRange.marketData.sampleSize && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-green-200 dark:border-green-700">
                        <div className="text-center">
                          <div className="text-lg font-medium text-green-700 dark:text-green-300">
                            {generatedRange.marketData.sampleSize}
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Sample Size
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-medium text-green-700 dark:text-green-300">
                            {formatCurrency(generatedRange.marketData.median)}
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Median
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-medium text-green-700 dark:text-green-300">
                            {formatCurrency(generatedRange.marketData.p25)}
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            25th Percentile
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-medium text-green-700 dark:text-green-300">
                            {formatCurrency(generatedRange.marketData.p75)}
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            75th Percentile
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Pay Factors */}
            {generatedRange?.factors && (
              <div className="space-y-3">
                <h4 className="font-medium">Pay Determination Factors:</h4>
                <div className="flex flex-wrap gap-2">
                  {generatedRange.factors.map((factor, idx) => (
                    <Badge key={idx} variant="outline" className="text-sm">
                      {factor}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  These factors must be disclosed to candidates as per EU
                  transparency requirements.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1"
              >
                Generate New Range
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Salary: ${formatCurrency(generatedRange?.suggestedRange.min || 0)} - ${formatCurrency(generatedRange?.suggestedRange.max || 0)} per month`
                  );
                  toast({
                    title: 'Copied to clipboard',
                    description: 'Salary range copied for job posting',
                  });
                }}
                className="flex-1"
              >
                Copy Range
              </Button>
            </div>

            {/* Compliance Note */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>✅ EU Compliant:</strong> This salary range meets
                Article 5 requirements and can be used in job advertisements.
                Range is based on internal equity analysis and includes required
                pay factors disclosure.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
