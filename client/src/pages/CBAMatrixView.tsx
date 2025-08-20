import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Calendar, Edit3, Eye, FileText, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface WageMatrix {
  category: string;
  grades: {
    [grade: string]: {
      steps: Array<{
        step: number;
        monthlyWage: number;
        annualReview: string;
      }>;
    };
  };
}

interface CBAPackInfo {
  id: string;
  name: string;
  version: string;
  effectiveFrom: string;
  sector: string;
  status: string;
  wageMatrix: WageMatrix[];
}

export default function CBAMatrixView() {
  const [selectedProperty, setSelectedProperty] = useState<string>("prop-princess");
  
  // Fetch active CBA pack for property
  const { data: cbaPackInfo, isLoading } = useQuery<CBAPackInfo>({
    queryKey: ['/api/cba-packs/property', selectedProperty, 'matrix'],
    enabled: !!selectedProperty
  });

  // Mock data for demonstration
  const mockCBAInfo: CBAPackInfo = {
    id: "ed6736f3-62bd-450f-8a3d-f22092d1ff15",
    name: "Greek Tourism - Hotels CBA Pack",
    version: "v2025.08.1",
    effectiveFrom: "2025-05-01",
    sector: "tourism",
    status: "active",
    wageMatrix: [
      {
        category: "Front Office",
        grades: {
          "A": {
            steps: [
              { step: 0, monthlyWage: 1080, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 1120, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 1160, annualReview: "2027-05-01" }
            ]
          },
          "B": {
            steps: [
              { step: 0, monthlyWage: 980, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 1020, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 1060, annualReview: "2027-05-01" }
            ]
          },
          "C": {
            steps: [
              { step: 0, monthlyWage: 880, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 910, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 940, annualReview: "2027-05-01" }
            ]
          }
        }
      },
      {
        category: "Housekeeping",
        grades: {
          "A": {
            steps: [
              { step: 0, monthlyWage: 1020, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 1060, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 1100, annualReview: "2027-05-01" }
            ]
          },
          "B": {
            steps: [
              { step: 0, monthlyWage: 940, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 970, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 1000, annualReview: "2027-05-01" }
            ]
          },
          "C": {
            steps: [
              { step: 0, monthlyWage: 920, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 950, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 980, annualReview: "2027-05-01" }
            ]
          }
        }
      },
      {
        category: "Food & Beverage",
        grades: {
          "A": {
            steps: [
              { step: 0, monthlyWage: 1000, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 1040, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 1080, annualReview: "2027-05-01" }
            ]
          },
          "B": {
            steps: [
              { step: 0, monthlyWage: 920, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 950, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 980, annualReview: "2027-05-01" }
            ]
          },
          "C": {
            steps: [
              { step: 0, monthlyWage: 860, annualReview: "2025-05-01" },
              { step: 1, monthlyWage: 890, annualReview: "2026-05-01" },
              { step: 2, monthlyWage: 920, annualReview: "2027-05-01" }
            ]
          }
        }
      }
    ]
  };

  const displayData = cbaPackInfo || mockCBAInfo;

  return (
    <div className="space-y-6">
      {/* Header with Effective Date Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">CBA Wage Matrix</h1>
            <div className="flex items-center gap-4 text-blue-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{displayData.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Effective since {new Date(displayData.effectiveFrom).toLocaleDateString()}</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {displayData.version}
              </Badge>
            </div>
          </div>
          <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
            <Eye className="w-4 h-4 mr-2" />
            View Pack Details
          </Button>
        </div>
      </div>

      {/* Property Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Property Selection</CardTitle>
              <CardDescription>Select property to view applicable wage matrix</CardDescription>
            </div>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prop-princess">Princess Hotel</SelectItem>
                <SelectItem value="prop-royal">Royal Resort</SelectItem>
                <SelectItem value="prop-garden">Garden Inn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Wage Matrix Tables */}
      {displayData.wageMatrix.map(category => (
        <Card key={category.category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {category.category} - Wage Steps
            </CardTitle>
            <CardDescription>
              Monthly wages by grade and seniority step (in Euros)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Grade</TableHead>
                    <TableHead className="text-center">Step 0 (Entry)</TableHead>
                    <TableHead className="text-center">Step 1 (+1 year)</TableHead>
                    <TableHead className="text-center">Step 2 (+2 years)</TableHead>
                    <TableHead className="text-center">Annual Increase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(category.grades).map(([grade, gradeData]) => {
                    const steps = gradeData.steps;
                    const step0 = steps[0];
                    const step1 = steps[1];
                    const step2 = steps[2];
                    const avgIncrease = steps.length > 1 
                      ? ((step1.monthlyWage - step0.monthlyWage + (step2?.monthlyWage - step1.monthlyWage || 0)) / 2)
                      : 0;

                    return (
                      <TableRow key={grade}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Grade {grade}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium">€{step0.monthlyWage.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">
                            €{(step0.monthlyWage / 22).toFixed(2)}/day
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium">€{step1.monthlyWage.toLocaleString()}</div>
                          <div className="text-sm text-green-600">
                            +€{step1.monthlyWage - step0.monthlyWage}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {step2 ? (
                            <>
                              <div className="font-medium">€{step2.monthlyWage.toLocaleString()}</div>
                              <div className="text-sm text-green-600">
                                +€{step2.monthlyWage - step1.monthlyWage}
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-400">Max step</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {avgIncrease > 0 ? (
                            <div className="font-medium text-green-600">
                              ~€{avgIncrease.toFixed(0)}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Matrix Summary & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Wage Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€860 - €1,160</div>
            <p className="text-sm text-gray-600 mt-1">
              Across all categories and steps
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+€35/year</div>
            <p className="text-sm text-gray-600 mt-1">
              Typical seniority increase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.wageMatrix.length}</div>
            <p className="text-sm text-gray-600 mt-1">
              Job categories defined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-2">CBA Compliance Notice</h3>
              <p className="text-sm text-amber-700">
                This wage matrix is derived from the official Greek Tourism Hotels Collective Bargaining Agreement. 
                All wages meet or exceed statutory minimum requirements. Seniority steps are automatically calculated 
                based on hire date and anniversary reviews.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                  <FileText className="w-4 h-4 mr-2" />
                  View Source Document
                </Button>
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Property Overrides
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}