import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircleIcon, TrendingUpIcon, TrendingDownIcon, CalendarIcon, InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  description: string;
  value: number;
  unit: string;
  trend?: number;
  lastCalculated?: string;
  formula: string;
  inclusions: string[];
  metricCode: string;
}

export function MetricCard({
  title,
  description,
  value,
  unit,
  trend = 0,
  lastCalculated,
  formula,
  inclusions,
  metricCode,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUpIcon className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDownIcon className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend > 0) return "text-green-600";
    if (trend < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const formatValue = () => {
    if (unit === "%") {
      return value.toFixed(1);
    }
    if (unit === ":1") {
      return value.toFixed(1);
    }
    if (unit === "/100 FTE") {
      return value.toFixed(2);
    }
    return value.toString();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{title}</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <HelpCircleIcon className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96" align="start">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <InfoIcon className="w-4 h-4" />
                        Formula
                      </h4>
                      <div className="text-sm font-mono bg-muted p-2 rounded text-muted-foreground">
                        {formula}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Inclusions & Scope</h4>
                      <ul className="text-sm space-y-1">
                        {inclusions.map((inclusion, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">{inclusion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Metric Code: {metricCode}</span>
                        <Badge variant="outline" className="text-xs">
                          ESRS S1
                        </Badge>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Value */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{formatValue()}</span>
            <span className="text-lg text-muted-foreground">{unit}</span>
          </div>
          
          {/* Trend Indicator */}
          {trend !== 0 && (
            <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
              {getTrendIcon()}
              <span>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}% from last period
              </span>
            </div>
          )}
        </div>

        {/* Last Calculated */}
        {lastCalculated && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <CalendarIcon className="w-3 h-3" />
            <span>Last calculated: {new Date(lastCalculated).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}