import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calendar, TrendingUp, Award, Clock, Euro, ArrowUp, FileText, History } from "lucide-react";

interface EmployeeCBAProfile {
  contractId: string;
  cbaPackName: string;
  category: string;
  grade: string;
  seniorityStep: number;
  maxSteps: number;
  currentWage: number;
  nextStepWage: number | null;
  nextStepDate: string | null;
  hireDate: string;
  yearsOfService: number;
  totalStepIncreases: number;
  stepHistory: Array<{
    fromStep: number;
    toStep: number;
    effectiveDate: string;
    wageIncrease: number;
    eventType: string;
  }>;
}

interface Props {
  employeeId: string;
  profile: EmployeeCBAProfile;
}

export default function EmployeeProfileCBA({ employeeId, profile }: Props) {
  const stepProgress = profile.maxSteps > 0 ? (profile.seniorityStep / profile.maxSteps) * 100 : 0;
  const hasNextStep = profile.nextStepWage !== null;
  const monthsToNextStep = profile.nextStepDate 
    ? Math.max(0, Math.ceil((new Date(profile.nextStepDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : null;

  return (
    <div className="space-y-6">
      {/* CBA Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Collective Bargaining Agreement
          </CardTitle>
          <CardDescription>
            Current CBA classification and seniority progression
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Classification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Category</label>
              <div className="mt-1">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {profile.category}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Grade</label>
              <div className="mt-1">
                <Badge variant="outline" className="text-base px-3 py-1">
                  Grade {profile.grade}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Seniority Step</label>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="default" className="text-base px-3 py-1">
                  Step {profile.seniorityStep}
                </Badge>
                <span className="text-sm text-gray-500">
                  of {profile.maxSteps}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* CBA Pack Info */}
          <div>
            <label className="text-sm font-medium text-gray-600">Applied CBA Pack</label>
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">{profile.cbaPackName}</span>
                <Badge variant="outline" className="text-xs">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Wage & Progression */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5" />
            Wage Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Wage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Current Monthly Wage</span>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                €{profile.currentWage.toLocaleString()}
              </div>
              <div className="text-sm text-green-600 mt-1">
                €{(profile.currentWage / 22).toFixed(2)} per day
              </div>
            </div>

            {hasNextStep ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-700">Next Step Wage</span>
                  <ArrowUp className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-900">
                  €{profile.nextStepWage!.toLocaleString()}
                </div>
                <div className="text-sm text-amber-600 mt-1">
                  +€{profile.nextStepWage! - profile.currentWage} increase
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Progression Status</span>
                  <Award className="w-4 h-4 text-gray-500" />
                </div>
                <div className="text-lg font-bold text-gray-700">
                  Maximum Step Reached
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  No further automatic increases
                </div>
              </div>
            )}
          </div>

          {/* Step Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Seniority Progression</span>
              <span className="text-sm text-gray-500">
                Step {profile.seniorityStep} of {profile.maxSteps}
              </span>
            </div>
            <Progress value={stepProgress} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Entry Level</span>
              <span>Maximum Seniority</span>
            </div>
          </div>

          {/* Next Step Timeline */}
          {hasNextStep && profile.nextStepDate && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <div className="font-medium text-blue-900">
                    Next Step Review: {new Date(profile.nextStepDate).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    {monthsToNextStep !== null && monthsToNextStep > 0 
                      ? `${monthsToNextStep} month${monthsToNextStep !== 1 ? 's' : ''} remaining`
                      : 'Due for review'
                    }
                  </div>
                </div>
                {monthsToNextStep !== null && monthsToNextStep === 0 && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Process Step Increase
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Service History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{profile.yearsOfService}</div>
              <div className="text-sm text-gray-600">Years of Service</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{profile.totalStepIncreases}</div>
              <div className="text-sm text-gray-600">Step Increases</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {new Date(profile.hireDate).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">Hire Date</div>
            </div>
          </div>

          {/* Step History */}
          {profile.stepHistory.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Step Change History
              </h4>
              <div className="space-y-2">
                {profile.stepHistory.slice(0, 5).map((change, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {change.eventType}
                      </Badge>
                      <span className="text-sm">
                        Step {change.fromStep} → {change.toStep}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(change.effectiveDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      +€{change.wageIncrease}
                    </div>
                  </div>
                ))}
                {profile.stepHistory.length > 5 && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      View All {profile.stepHistory.length} Changes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          View CBA Document
        </Button>
        <Button variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          Salary History Report
        </Button>
        {hasNextStep && monthsToNextStep === 0 && (
          <Button className="bg-green-600 hover:bg-green-700">
            <ArrowUp className="w-4 h-4 mr-2" />
            Process Step Advancement
          </Button>
        )}
      </div>
    </div>
  );
}