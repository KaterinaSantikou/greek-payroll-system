import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Users,
  TrendingUp,
  Target
} from 'lucide-react';

interface SLAMetric {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  trend: {
    value: number;
    isImproving: boolean;
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
  category: 'response' | 'resolution' | 'satisfaction' | 'availability';
}

const slaMetrics: SLAMetric[] = [
  {
    id: 'first-response',
    title: 'Πρώτη Απάντηση',
    description: 'Μέσος χρόνος πρώτης απάντησης',
    target: 240, // 4 hours in minutes
    current: 180, // 3 hours
    unit: 'λεπτά',
    trend: {
      value: -15,
      isImproving: true
    },
    status: 'excellent',
    category: 'response'
  },
  {
    id: 'resolution-time',
    title: 'Επίλυση Προβλημάτων',
    description: 'Μέσος χρόνος επίλυσης',
    target: 1440, // 24 hours in minutes
    current: 960, // 16 hours
    unit: 'λεπτά',
    trend: {
      value: -120,
      isImproving: true
    },
    status: 'good',
    category: 'resolution'
  },
  {
    id: 'customer-satisfaction',
    title: 'Ικανοποίηση Πελατών',
    description: 'Βαθμολογία ικανοποίησης',
    target: 90,
    current: 94.5,
    unit: '%',
    trend: {
      value: 2.3,
      isImproving: true
    },
    status: 'excellent',
    category: 'satisfaction'
  },
  {
    id: 'system-uptime',
    title: 'Διαθεσιμότητα Συστήματος',
    description: 'Uptime τελευταίου μήνα',
    target: 99.9,
    current: 99.97,
    unit: '%',
    trend: {
      value: 0.02,
      isImproving: true
    },
    status: 'excellent',
    category: 'availability'
  },
  {
    id: 'urgent-tickets',
    title: 'Επείγοντα Αιτήματα',
    description: 'Επίλυση σε < 1 ώρα',
    target: 95,
    current: 92,
    unit: '%',
    trend: {
      value: -1.5,
      isImproving: false
    },
    status: 'warning',
    category: 'response'
  },
  {
    id: 'ergani-support',
    title: 'Υποστήριξη ΕΡΓΑΝΗ',
    description: 'Επίλυση θεμάτων ΕΡΓΑΝΗ',
    target: 4320, // 3 days in minutes
    current: 2880, // 2 days
    unit: 'λεπτά',
    trend: {
      value: -480,
      isImproving: true
    },
    status: 'good',
    category: 'resolution'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
    case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'excellent': return <CheckCircle2 className="h-4 w-4" />;
    case 'good': return <Target className="h-4 w-4" />;
    case 'warning': return <AlertTriangle className="h-4 w-4" />;
    case 'critical': return <AlertTriangle className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getProgressPercentage = (current: number, target: number, isPercentage: boolean = false): number => {
  if (isPercentage) {
    return Math.min(100, (current / target) * 100);
  }
  // For time-based metrics, lower is better
  return Math.min(100, Math.max(0, ((target - current) / target) * 100 + 50));
};

const formatValue = (value: number, unit: string): string => {
  if (unit === 'λεπτά') {
    if (value >= 1440) {
      return `${Math.round(value / 1440)} ημέρες`;
    } else if (value >= 60) {
      return `${Math.round(value / 60)} ώρες`;
    } else {
      return `${value} λεπτά`;
    }
  }
  return `${value}${unit}`;
};

export default function SLADashboard() {
  const categorizedMetrics = {
    response: slaMetrics.filter(m => m.category === 'response'),
    resolution: slaMetrics.filter(m => m.category === 'resolution'),
    satisfaction: slaMetrics.filter(m => m.category === 'satisfaction'),
    availability: slaMetrics.filter(m => m.category === 'availability')
  };

  const overallHealth = slaMetrics.reduce((acc, metric) => {
    const weight = metric.status === 'excellent' ? 4 : metric.status === 'good' ? 3 : metric.status === 'warning' ? 2 : 1;
    return acc + weight;
  }, 0) / (slaMetrics.length * 4) * 100;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(overallHealth)}%</p>
                <p className="text-sm text-muted-foreground">Συνολική Απόδοση SLA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{slaMetrics.filter(m => m.status === 'excellent').length}</p>
                <p className="text-sm text-muted-foreground">Άριστες Επιδόσεις</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{slaMetrics.filter(m => m.status === 'warning').length}</p>
                <p className="text-sm text-muted-foreground">Προειδοποιήσεις</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">1.247</p>
                <p className="text-sm text-muted-foreground">Ενεργά Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slaMetrics.map(metric => {
          const isPercentageMetric = metric.unit === '%';
          const progressValue = getProgressPercentage(metric.current, metric.target, isPercentageMetric);
          
          return (
            <Card key={metric.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{metric.title}</CardTitle>
                  <Badge className={getStatusColor(metric.status)}>
                    {getStatusIcon(metric.status)}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {metric.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Current vs Target */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">
                        {formatValue(metric.current, metric.unit)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Στόχος: {formatValue(metric.target, metric.unit)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className={`h-4 w-4 ${metric.trend.isImproving ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={metric.trend.isImproving ? 'text-green-600' : 'text-red-600'}>
                        {metric.trend.isImproving ? '+' : ''}{metric.trend.value}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Επίδοση</span>
                      <span>{Math.round(progressValue)}%</span>
                    </div>
                    <Progress 
                      value={progressValue} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Κατηγορίες Απόδοσης</CardTitle>
            <CardDescription>
              Ανάλυση απόδοσης ανά κατηγορία SLA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categorizedMetrics).map(([category, metrics]) => {
                const categoryLabels = {
                  response: 'Ταχύτητα Απόκρισης',
                  resolution: 'Επίλυση Προβλημάτων',
                  satisfaction: 'Ικανοποίηση Πελατών',
                  availability: 'Διαθεσιμότητα'
                };

                const avgPerformance = metrics.reduce((acc, m) => {
                  const score = m.status === 'excellent' ? 4 : m.status === 'good' ? 3 : m.status === 'warning' ? 2 : 1;
                  return acc + score;
                }, 0) / metrics.length;

                const performancePercentage = (avgPerformance / 4) * 100;

                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(performancePercentage)}%
                      </span>
                    </div>
                    <Progress value={performancePercentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Επείγοντα Θέματα</CardTitle>
            <CardDescription>
              Αιτήματα που απαιτούν άμεση προσοχή
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Σφάλμα ΕΡΓΑΝΗ API</span>
                </div>
                <Badge variant="destructive" className="text-xs">
                  SLA: 45 λεπτά
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Πρόβλημα Μισθοδοσίας</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  SLA: 2.5 ώρες
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Εκπαίδευση Χρηστών</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  SLA: 1 ημέρα
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}