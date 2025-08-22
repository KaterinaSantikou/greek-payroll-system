import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  UserPlus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Calendar,
  FileText,
  Upload
} from "lucide-react";

export default function Onboarding() {
  const onboardingCases = [
    {
      id: 1,
      employeeName: "Maria Konstantinopoulou",
      position: "Front Desk Agent",
      startDate: "2025-01-25",
      progress: 85,
      status: "pending_docs",
      missingItems: ["AMKA verification", "Bank account details"],
      completedSteps: 6,
      totalSteps: 8
    },
    {
      id: 2,
      employeeName: "Dimitris Papadopoulos", 
      position: "Housekeeping",
      startDate: "2025-01-22",
      progress: 45,
      status: "awaiting_contract",
      missingItems: ["Contract signature", "Collective agreement acknowledgment"],
      completedSteps: 3,
      totalSteps: 8
    },
    {
      id: 3,
      employeeName: "Elena Georgiou",
      position: "Restaurant Server",
      startDate: "2025-01-30",
      progress: 15,
      status: "started",
      missingItems: ["All documents pending", "Initial interview scheduled"],
      completedSteps: 1,
      totalSteps: 8
    }
  ];

  const seasonalBatch = {
    title: "Summer 2025 Batch",
    totalPositions: 45,
    hired: 32,
    inProgress: 8,
    pending: 5,
    deadline: "2025-02-15"
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Onboarding</h1>
          <p className="text-gray-600 dark:text-gray-400">Quick hire, bulk seasonal rehires, checklists</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Quick Hire
          </Button>
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
        </div>
      </div>

      {/* Seasonal Batch Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Seasonal Hiring Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{seasonalBatch.hired}</div>
              <div className="text-sm text-green-600 dark:text-green-500">Completed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{seasonalBatch.inProgress}</div>
              <div className="text-sm text-blue-600 dark:text-blue-500">In Progress</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{seasonalBatch.pending}</div>
              <div className="text-sm text-orange-600 dark:text-orange-500">Pending</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{seasonalBatch.totalPositions}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Positions</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-gray-500">{Math.round(((seasonalBatch.hired + seasonalBatch.inProgress) / seasonalBatch.totalPositions) * 100)}%</span>
            </div>
            <Progress value={((seasonalBatch.hired + seasonalBatch.inProgress) / seasonalBatch.totalPositions) * 100} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Individual Onboarding Cases */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Onboarding Cases</h2>
        {onboardingCases.map((employee) => (
          <Card key={employee.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{employee.employeeName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{employee.position}</p>
                  </div>
                  <Badge variant={
                    employee.status === 'pending_docs' ? 'destructive' :
                    employee.status === 'awaiting_contract' ? 'default' : 'secondary'
                  }>
                    {employee.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{employee.startDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Completion Progress</span>
                    <span className="text-sm text-gray-500">{employee.completedSteps}/{employee.totalSteps} steps</span>
                  </div>
                  <Progress value={employee.progress} className="h-2 mb-3" />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Missing Items
                    </h4>
                    <ul className="text-xs space-y-1">
                      {employee.missingItems.map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-medium">Quick Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        View Checklist
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Upload className="h-3 w-3 mr-1" />
                        Upload Docs
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Schedule Interview
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full">
                    Continue Onboarding
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">This Week</p>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-gray-500">New hires started</p>
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
                <p className="text-sm font-medium">Avg. Time</p>
                <p className="text-2xl font-bold">4.2</p>
                <p className="text-xs text-gray-500">Days to complete</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold">94%</p>
                <p className="text-xs text-gray-500">Completed on time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}