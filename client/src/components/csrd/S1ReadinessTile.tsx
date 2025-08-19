import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, AlertTriangleIcon, CheckCircleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface S1ReadinessTileProps {
  entityId: string;
  entityName: string;
}

interface ReadinessData {
  completenessPercent: number;
  lastCalculationDate: string | null;
  pendingFields: string[];
  status: 'ready' | 'pending' | 'incomplete';
  totalMetrics: number;
  completedMetrics: number;
}

export function S1ReadinessTile({ entityId, entityName }: S1ReadinessTileProps) {
  const { data: readinessData, isLoading } = useQuery<ReadinessData>({
    queryKey: ['/api/csrd/s1-readiness', entityId],
    enabled: !!entityId,
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">S1 Readiness</CardTitle>
          <CardDescription className="text-xs">{entityName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="animate-pulse space-y-2">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const readiness = readinessData || {
    completenessPercent: 0,
    lastCalculationDate: null,
    pendingFields: [],
    status: 'incomplete' as const,
    totalMetrics: 8,
    completedMetrics: 0,
  };

  const getStatusColor = () => {
    switch (readiness.status) {
      case 'ready': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'incomplete': return 'bg-red-500';
    }
  };

  const getStatusIcon = () => {
    switch (readiness.status) {
      case 'ready': return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'pending': return <AlertTriangleIcon className="w-4 h-4 text-yellow-600" />;
      case 'incomplete': return <AlertTriangleIcon className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">S1 Readiness</CardTitle>
            <CardDescription className="text-xs">{entityName}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <Badge variant={readiness.status === 'ready' ? 'default' : 'secondary'} className="text-xs">
              {readiness.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Data Completeness */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Data Completeness</span>
            <span className="font-medium">{readiness.completenessPercent}%</span>
          </div>
          <Progress 
            value={readiness.completenessPercent} 
            className="h-2"
            style={{
              background: readiness.completenessPercent < 50 
                ? 'linear-gradient(to right, #ef4444, #f97316)'
                : readiness.completenessPercent < 80
                ? 'linear-gradient(to right, #f97316, #eab308)'
                : 'linear-gradient(to right, #22c55e, #16a34a)'
            }}
          />
        </div>

        {/* Metrics Progress */}
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{readiness.completedMetrics}/{readiness.totalMetrics} metrics complete</span>
          <span>
            {readiness.lastCalculationDate ? (
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {new Date(readiness.lastCalculationDate).toLocaleDateString()}
              </div>
            ) : (
              'No calculations yet'
            )}
          </span>
        </div>

        {/* Pending Fields */}
        {readiness.pendingFields.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Pending fields:</div>
            <div className="flex flex-wrap gap-1">
              {readiness.pendingFields.slice(0, 3).map((field) => (
                <Badge key={field} variant="outline" className="text-xs px-1 py-0">
                  {field}
                </Badge>
              ))}
              {readiness.pendingFields.length > 3 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{readiness.pendingFields.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          size="sm" 
          variant={readiness.status === 'ready' ? 'default' : 'secondary'}
          className="w-full text-xs"
        >
          {readiness.status === 'ready' ? 'View Metrics' : 'Complete Setup'}
        </Button>
      </CardContent>
    </Card>
  );
}