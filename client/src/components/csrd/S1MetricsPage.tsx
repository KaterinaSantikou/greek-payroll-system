import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { FilterIcon, SettingsIcon, CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "./MetricCard";
import { AssumptionsDrawer } from "./AssumptionsDrawer";

interface FiltersState {
  entity: string;
  country: string;
  period: string;
}

interface MetricsData {
  genderPayGap: {
    value: number;
    trend: number;
    lastCalculated: string;
  };
  topToMedianRatio: {
    value: number;
    trend: number;
    lastCalculated: string;
  };
  healthSafetyCoverage: {
    value: number;
    trend: number;
    lastCalculated: string;
  };
  incidentsRate: {
    value: number;
    trend: number;
    lastCalculated: string;
  };
  workLifeUsage: {
    value: number;
    trend: number;
    lastCalculated: string;
  };
}

export function S1MetricsPage() {
  const [filters, setFilters] = useState<FiltersState>({
    entity: "",
    country: "GRC",
    period: "2024",
  });

  const { data: metricsData, isLoading } = useQuery<MetricsData>({
    queryKey: ['/api/csrd/metrics', filters],
    enabled: !!filters.entity,
  });

  const { data: entities } = useQuery<Array<{id: string, name: string}>>({
    queryKey: ['/api/entities'],
  });

  const handleFilterChange = (key: keyof FiltersState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ESRS S1 Metrics</h1>
          <p className="text-muted-foreground">
            Social sustainability metrics with data lineage and audit trail
          </p>
        </div>
        <AssumptionsDrawer>
          <Button variant="outline" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Assumptions
          </Button>
        </AssumptionsDrawer>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FilterIcon className="w-5 h-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Select entity, country, and reporting period to view metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Entity</label>
            <Select value={filters.entity} onValueChange={(value) => handleFilterChange('entity', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {entities?.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Country</label>
            <Select value={filters.country} onValueChange={(value) => handleFilterChange('country', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRC">Greece</SelectItem>
                <SelectItem value="DEU">Germany</SelectItem>
                <SelectItem value="FRA">France</SelectItem>
                <SelectItem value="ITA">Italy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Period</label>
            <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applied Filters */}
      {(filters.entity || filters.country || filters.period) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Applied filters:</span>
          {filters.entity && (
            <Badge variant="secondary">
              Entity: {entities?.find(e => e.id === filters.entity)?.name || filters.entity}
            </Badge>
          )}
          {filters.country && (
            <Badge variant="secondary">Country: {filters.country}</Badge>
          )}
          {filters.period && (
            <Badge variant="secondary">Period: {filters.period}</Badge>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      {!filters.entity ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <FilterIcon className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="font-medium">Select an entity to view metrics</h3>
              <p className="text-sm text-muted-foreground">
                Choose an entity from the filters above to display S1 metrics
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Gender Pay Gap"
            description="Difference between male and female gross hourly earnings"
            value={metricsData?.genderPayGap?.value || 0}
            unit="%"
            trend={metricsData?.genderPayGap?.trend || 0}
            lastCalculated={metricsData?.genderPayGap?.lastCalculated}
            formula="GPG = (Avg male gross hourly – Avg female gross hourly) ÷ Avg male gross hourly × 100"
            inclusions={[
              "All employees with recorded gender",
              "Valid payroll and hours data",
              "Excludes contractors and temporary staff",
              "Based on gross hourly rates including overtime"
            ]}
            metricCode="S1-16-GPG"
          />
          
          <MetricCard
            title="Top-to-Median Ratio"
            description="CEO compensation relative to median employee"
            value={metricsData?.topToMedianRatio?.value || 0}
            unit=":1"
            trend={metricsData?.topToMedianRatio?.trend || 0}
            lastCalculated={metricsData?.topToMedianRatio?.lastCalculated}
            formula="Ratio = Highest paid total compensation ÷ Median employee compensation"
            inclusions={[
              "Total annual compensation including bonuses",
              "All employees in calculation period",
              "Stock options valued at grant date",
              "Excludes CEO from median calculation"
            ]}
            metricCode="S1-16-CEO-RATIO"
          />
          
          <MetricCard
            title="H&S Coverage"
            description="Workforce covered by health & safety systems"
            value={metricsData?.healthSafetyCoverage?.value || 0}
            unit="%"
            trend={metricsData?.healthSafetyCoverage?.trend || 0}
            lastCalculated={metricsData?.healthSafetyCoverage?.lastCalculated}
            formula="Coverage = (Workers under H&S system ÷ Total workers) × 100"
            inclusions={[
              "All employees and contractors on-site",
              "Formal H&S management system coverage",
              "Regular safety training participation",
              "Incident reporting system access"
            ]}
            metricCode="S1-HS-COVERAGE"
          />
          
          <MetricCard
            title="Incidents Rate"
            description="Work-related incidents per 100 FTE employees"
            value={metricsData?.incidentsRate?.value || 0}
            unit="/100 FTE"
            trend={metricsData?.incidentsRate?.trend || 0}
            lastCalculated={metricsData?.incidentsRate?.lastCalculated}
            formula="Rate = (Total incidents ÷ Total FTE) × 100"
            inclusions={[
              "All recordable work-related injuries",
              "Incidents resulting in lost time",
              "Both employees and contractors",
              "Excludes commuting incidents"
            ]}
            metricCode="S1-16-INJURY-RATE"
          />
          
          <MetricCard
            title="Work-Life Usage"
            description="Usage rate of work-life balance policies"
            value={metricsData?.workLifeUsage?.value || 0}
            unit="%"
            trend={metricsData?.workLifeUsage?.trend || 0}
            lastCalculated={metricsData?.workLifeUsage?.lastCalculated}
            formula="Usage = (Policy users ÷ Eligible population) × 100"
            inclusions={[
              "Parental leave, flexible work, wellness programs",
              "Eligible employees with >12 months tenure",
              "Both male and female employees",
              "Voluntary and mandatory programs"
            ]}
            metricCode="S1-WORKLIFE"
          />
        </div>
      )}
    </div>
  );
}