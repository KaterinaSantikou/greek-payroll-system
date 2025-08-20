/**
 * Error Analytics Component
 * Advanced analytics and insights for error patterns and resolution
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  Filter,
  Download,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react';

interface AnalyticsData {
  errorsByHour: number[];
  errorsByDay: { date: string; count: number; resolved: number }[];
  resolutionTimes: { category: string; avgTime: number; target: number }[];
  impactAnalysis: { severity: string; customerImpact: number; businessCost: number }[];
  topIssues: { issue: string; count: number; trend: 'up' | 'down' }[];
}

const mockAnalyticsData: AnalyticsData = {
  errorsByHour: [2, 1, 0, 1, 0, 2, 4, 8, 12, 15, 18, 22, 25, 20, 18, 16, 14, 12, 8, 6, 4, 3, 2, 1],
  errorsByDay: [
    { date: '2025-01-14', count: 45, resolved: 42 },
    { date: '2025-01-15', count: 38, resolved: 35 },
    { date: '2025-01-16', count: 52, resolved: 48 },
    { date: '2025-01-17', count: 29, resolved: 27 },
    { date: '2025-01-18', count: 33, resolved: 31 },
    { date: '2025-01-19', count: 41, resolved: 38 },
    { date: '2025-01-20', count: 28, resolved: 25 }
  ],
  resolutionTimes: [
    { category: 'ERGANI II Integration', avgTime: 25.5, target: 30 },
    { category: 'Payment Processing', avgTime: 12.3, target: 15 },
    { category: 'Data Validation', avgTime: 8.7, target: 10 },
    { category: 'Security Issues', avgTime: 45.2, target: 60 },
    { category: 'Performance', avgTime: 18.9, target: 20 }
  ],
  impactAnalysis: [
    { severity: 'Critical', customerImpact: 85, businessCost: 12500 },
    { severity: 'High', customerImpact: 45, businessCost: 3200 },
    { severity: 'Medium', customerImpact: 12, businessCost: 850 },
    { severity: 'Low', customerImpact: 3, businessCost: 120 }
  ],
  topIssues: [
    { issue: 'ERGANI II Timeout', count: 12, trend: 'up' },
    { issue: 'IBAN Validation Failed', count: 8, trend: 'down' },
    { issue: 'AFM Format Error', count: 6, trend: 'down' },
    { issue: 'Database Slow Query', count: 5, trend: 'up' },
    { issue: 'Authentication Failed', count: 4, trend: 'down' }
  ]
};

interface ErrorAnalyticsProps {
  locale?: 'en' | 'el';
}

export default function ErrorAnalytics({ locale = 'en' }: ErrorAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const translations = {
    en: {
      title: 'Error Analytics & Insights',
      subtitle: 'Deep analysis of error patterns and resolution performance',
      timeRange: 'Time Range',
      category: 'Category',
      errorTrends: 'Error Trends',
      resolutionPerformance: 'Resolution Performance',
      businessImpact: 'Business Impact Analysis',
      topIssues: 'Top Issues',
      hourlyDistribution: '24-Hour Error Distribution',
      weeklyTrend: '7-Day Error Trend',
      avgResolutionTime: 'Average Resolution Time',
      targetTime: 'Target Time',
      customerImpact: 'Customer Impact',
      businessCost: 'Business Cost',
      errorCount: 'Error Count',
      resolvedCount: 'Resolved Count',
      trend: 'Trend',
      exportData: 'Export Analytics',
      refreshData: 'Refresh Data',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      thisMonth: 'This Month',
      minutes: 'minutes',
      users: 'users affected',
      euros: 'EUR estimated cost'
    },
    el: {
      title: 'Αναλυτικά & Insights Σφαλμάτων',
      subtitle: 'Βαθιά ανάλυση προτύπων σφαλμάτων και απόδοσης επίλυσης',
      timeRange: 'Χρονικό Διάστημα',
      category: 'Κατηγορία',
      errorTrends: 'Τάσεις Σφαλμάτων',
      resolutionPerformance: 'Απόδοση Επίλυσης',
      businessImpact: 'Ανάλυση Επιχειρηματικού Αντίκτυπου',
      topIssues: 'Κύρια Ζητήματα',
      hourlyDistribution: 'Κατανομή Σφαλμάτων 24 Ωρών',
      weeklyTrend: 'Τάση Σφαλμάτων 7 Ημερών',
      avgResolutionTime: 'Μέσος Χρόνος Επίλυσης',
      targetTime: 'Στόχος Χρόνου',
      customerImpact: 'Αντίκτυπος Πελάτη',
      businessCost: 'Επιχειρηματικό Κόστος',
      errorCount: 'Αριθμός Σφαλμάτων',
      resolvedCount: 'Αριθμός Επιλύσεων',
      trend: 'Τάση',
      exportData: 'Εξαγωγή Αναλυτικών',
      refreshData: 'Ανανέωση Δεδομένων',
      last7Days: 'Τελευταίες 7 Ημέρες',
      last30Days: 'Τελευταίες 30 Ημέρες',
      thisMonth: 'Αυτός ο Μήνας',
      minutes: 'λεπτά',
      users: 'επηρεασμένοι χρήστες',
      euros: 'EUR εκτιμώμενο κόστος'
    }
  };

  const t = translations[locale];

  const getTrendColor = (trend: 'up' | 'down') => {
    return trend === 'up' ? 'text-red-600' : 'text-green-600';
  };

  const getTrendIcon = (trend: 'up' | 'down') => {
    return trend === 'up' ? TrendingUp : TrendingDown;
  };

  const maxErrorsInHour = Math.max(...mockAnalyticsData.errorsByHour);
  const totalErrorsToday = mockAnalyticsData.errorsByHour.reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">{t.last7Days}</option>
            <option value="30d">{t.last30Days}</option>
            <option value="month">{t.thisMonth}</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Categories</option>
            <option value="integration">Integration</option>
            <option value="payment">Payment</option>
            <option value="validation">Validation</option>
            <option value="security">Security</option>
            <option value="performance">Performance</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t.exportData}
          </Button>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Peak Error Hour</p>
                <p className="text-2xl font-bold">12:00</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">{maxErrorsInHour} errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-600">92.3%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">+5.2% this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-blue-600">18.7m</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">-12% improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Business Impact</p>
                <p className="text-2xl font-bold text-orange-600">€16.7K</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t.hourlyDistribution}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAnalyticsData.errorsByHour.map((count, hour) => {
                const percentage = maxErrorsInHour > 0 ? (count / maxErrorsInHour) * 100 : 0;
                return (
                  <div key={hour} className="flex items-center gap-3">
                    <div className="w-12 text-sm text-gray-500">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-8 text-sm text-gray-600">{count}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Total today: <span className="font-medium">{totalErrorsToday} errors</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              {t.weeklyTrend}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAnalyticsData.errorsByDay.map((day, index) => {
                const resolutionRate = (day.resolved / day.count) * 100;
                return (
                  <div key={day.date} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{new Date(day.date).toLocaleDateString()}</span>
                      <span className="text-gray-500">
                        {day.count} errors, {day.resolved} resolved ({resolutionRate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <div
                        className="bg-red-200 h-2 rounded-l"
                        style={{ width: `${((day.count - day.resolved) / day.count) * 100}%` }}
                      />
                      <div
                        className="bg-green-500 h-2 rounded-r"
                        style={{ width: `${resolutionRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span>Unresolved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Resolved</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t.resolutionPerformance}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockAnalyticsData.resolutionTimes.map((item) => {
              const performance = item.avgTime <= item.target ? 'good' : 'warning';
              const percentageOfTarget = (item.avgTime / item.target) * 100;
              
              return (
                <div key={item.category} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{item.category}</h4>
                    <Badge className={performance === 'good' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {performance === 'good' ? '✓ On Target' : '⚠ Over Target'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Actual: {item.avgTime}m</span>
                      <span>Target: {item.target}m</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${performance === 'good' ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.min(percentageOfTarget, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentageOfTarget.toFixed(1)}% of target
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Business Impact and Top Issues */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              {t.businessImpact}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAnalyticsData.impactAnalysis.map((impact) => (
                <div key={impact.severity} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{impact.severity} Severity</span>
                    <div className="text-right">
                      <div>{impact.customerImpact} {t.users}</div>
                      <div className="text-gray-500">€{impact.businessCost.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        impact.severity === 'Critical' ? 'bg-red-500' :
                        impact.severity === 'High' ? 'bg-orange-500' :
                        impact.severity === 'Medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${(impact.customerImpact / 100) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                Total impact: <span className="font-medium">145 users, €16.7K cost</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t.topIssues}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockAnalyticsData.topIssues.map((issue, index) => {
                const TrendIcon = getTrendIcon(issue.trend);
                const trendColor = getTrendColor(issue.trend);
                
                return (
                  <div key={issue.issue} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{issue.issue}</div>
                        <div className="text-sm text-gray-500">{issue.count} occurrences</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                      <span className={`text-sm ${trendColor}`}>
                        {issue.trend}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}