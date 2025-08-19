import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Clock,
  Euro,
  Calendar,
  Filter,
  Download,
  Building2,
  Users
} from "lucide-react";

export default function CostOtAnalytics() {
  const departmentCosts = [
    { name: "Front Office", budgetEur: 25000, actualEur: 24150, variance: -3.4, otHours: 45, otCost: 1250 },
    { name: "Housekeeping", budgetEur: 18500, actualEur: 19800, variance: 7.0, otHours: 78, otCost: 1950 },
    { name: "F&B", budgetEur: 32000, actualEur: 33400, variance: 4.4, otHours: 112, otCost: 2800 },
    { name: "Maintenance", budgetEur: 12000, actualEur: 11200, variance: -6.7, otHours: 25, otCost: 625 }
  ];

  const trends = [
    { period: "Week 1", laborCost: 22500, otCost: 1200, efficiency: 87 },
    { period: "Week 2", laborCost: 24100, otCost: 1450, efficiency: 85 },
    { period: "Week 3", laborCost: 23800, otCost: 1650, efficiency: 89 },
    { period: "Week 4", laborCost: 25200, otCost: 1925, efficiency: 82 }
  ];

  const heatmapData = [
    { day: "Monday", shift1: 85, shift2: 92, shift3: 78 },
    { day: "Tuesday", shift1: 88, shift2: 90, shift3: 82 },
    { day: "Wednesday", shift1: 91, shift2: 87, shift3: 85 },
    { day: "Thursday", shift1: 89, shift2: 94, shift3: 88 },
    { day: "Friday", shift1: 95, shift2: 96, shift3: 92 },
    { day: "Saturday", shift1: 98, shift2: 98, shift3: 95 },
    { day: "Sunday", shift1: 87, shift2: 89, shift3: 84 }
  ];

  const getVarianceColor = (variance: number) => {
    if (variance > 5) return "text-red-600 dark:text-red-400";
    if (variance > 0) return "text-orange-600 dark:text-orange-400";
    return "text-green-600 dark:text-green-400";
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return "bg-green-500";
    if (efficiency >= 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cost & Overtime Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Trends, heatmaps, department drill-downs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Labor Cost</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">€87,550</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Overtime Hours</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">260</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">OT Cost</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">€6,625</p>
                <p className="text-xs text-gray-500">+12% vs last month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Efficiency</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">86%</p>
                <p className="text-xs text-gray-500">Avg across departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Department Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentCosts.map((dept, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                  <Badge variant={dept.variance > 0 ? 'destructive' : 'default'}>
                    {dept.variance > 0 ? '+' : ''}{dept.variance}%
                  </Badge>
                </div>

                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Budget</p>
                    <p className="font-medium">€{dept.budgetEur.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Actual</p>
                    <p className="font-medium">€{dept.actualEur.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Variance</p>
                    <p className={`font-medium ${getVarianceColor(dept.variance)}`}>
                      €{Math.abs(dept.actualEur - dept.budgetEur).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">OT Hours</p>
                    <p className="font-medium">{dept.otHours}h</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">OT Cost</p>
                    <p className="font-medium">€{dept.otCost.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <Button size="sm" variant="outline" className="w-full">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    View Detailed Analysis
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Cost Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {trends.map((week, index) => (
                <div key={index} className="p-4 border rounded-lg text-center">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">{week.period}</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Labor Cost</p>
                      <p className="text-lg font-bold">€{week.laborCost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">OT Cost</p>
                      <p className="text-sm font-medium text-orange-600">€{week.otCost.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Efficiency</p>
                      <p className="text-sm font-medium">{week.efficiency}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staffing Efficiency Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <div></div>
              <div className="text-center">Morning (7-15)</div>
              <div className="text-center">Evening (15-23)</div>
              <div className="text-center">Night (23-7)</div>
            </div>
            {heatmapData.map((day, index) => (
              <div key={index} className="grid grid-cols-4 gap-2">
                <div className="text-sm font-medium py-2">{day.day}</div>
                <div className="text-center py-2">
                  <div className={`w-full h-8 rounded flex items-center justify-center text-white text-sm ${getEfficiencyColor(day.shift1)}`}>
                    {day.shift1}%
                  </div>
                </div>
                <div className="text-center py-2">
                  <div className={`w-full h-8 rounded flex items-center justify-center text-white text-sm ${getEfficiencyColor(day.shift2)}`}>
                    {day.shift2}%
                  </div>
                </div>
                <div className="text-center py-2">
                  <div className={`w-full h-8 rounded flex items-center justify-center text-white text-sm ${getEfficiencyColor(day.shift3)}`}>
                    {day.shift3}%
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>&lt;80%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>80-89%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>90%+</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium">High OT in Housekeeping</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  78 hours overtime (7% over budget). Consider adding 1 part-time staff member.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <TrendingDown className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Front Office Under Budget</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  3.4% under budget with minimal overtime. Efficient scheduling maintained.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <BarChart3 className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Weekend Efficiency Peak</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Friday-Saturday show 95%+ efficiency. Consider similar patterns for other days.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}