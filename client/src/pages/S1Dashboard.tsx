import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUpIcon,
  BarChart3Icon,
  UsersIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { S1ReadinessTile } from '@/components/csrd/S1ReadinessTile';
import { Link } from 'wouter';

const entities = [
  { id: 'hq-athens', name: 'HQ Athens' },
  { id: 'hotel-mykonos', name: 'Mykonos Resort' },
  { id: 'hotel-santorini', name: 'Santorini Hotel' },
  { id: 'office-berlin', name: 'Berlin Office' },
  { id: 'office-paris', name: 'Paris Office' },
];

export default function S1Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            ESRS S1 Dashboard
          </h1>
          <p className="text-muted-foreground">
            Social sustainability readiness and metrics overview
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/s1-metrics">
            <Button className="flex items-center gap-2">
              <BarChart3Icon className="w-4 h-4" />
              View Metrics
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Entities
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entities.length}</div>
            <p className="text-xs text-muted-foreground">Across 4 countries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Readiness
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Complete Metrics
            </CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28/40</div>
            <p className="text-xs text-muted-foreground">
              8 core S1 metrics per entity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compliance Status
            </CardTitle>
            <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Ready
              </Badge>
              <span className="text-sm text-muted-foreground">2025 ESRS</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Stop-the-clock applied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* S1 Readiness Tiles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5" />
            S1 Readiness by Entity
          </CardTitle>
          <CardDescription>
            Data completeness and calculation status for each reporting entity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities.map(entity => (
              <S1ReadinessTile
                key={entity.id}
                entityId={entity.id}
                entityName={entity.name}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for S1 sustainability reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/s1-metrics">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3Icon className="w-4 h-4 mr-2" />
                View All Metrics
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start">
              <TrendingUpIcon className="w-4 h-4 mr-2" />
              Calculate Pay Gap
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <ShieldCheckIcon className="w-4 h-4 mr-2" />
              Generate Evidence Pack
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <UsersIcon className="w-4 h-4 mr-2" />
              Export XBRL Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
