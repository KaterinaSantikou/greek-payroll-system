import { db } from "./db";
import { 
  employees, 
  payrollCalculations, 
  properties, 
  punchEvents,
  timesheets,
  shifts
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, avg, sum, count, sql } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from "date-fns";

export interface LaborCostForecast {
  propertyId: string;
  propertyName: string;
  period: string;
  departments: Array<{
    department: string;
    currentMonthCost: number;
    projectedCost: number;
    budgetTarget: number;
    variance: number;
    variancePercentage: number;
    breakdown: {
      baseSalary: number;
      overtime: number;
      allowances: number;
      bonuses: number;
      employerContributions: number;
    };
    trendAnalysis: {
      trend: 'increasing' | 'decreasing' | 'stable';
      monthOverMonth: number;
      seasonalAdjustment: number;
    };
  }>;
  totalForecast: {
    currentMonth: number;
    projected: number;
    budget: number;
    variance: number;
    confidence: number;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    potentialSaving: number;
  }>;
}

export interface OvertimeHeatmap {
  propertyId: string;
  period: string;
  heatmapData: Array<{
    date: string;
    department: string;
    overtimeHours: number;
    overtimeCost: number;
    intensity: 'low' | 'medium' | 'high' | 'critical';
    employees: Array<{
      employeeId: string;
      name: string;
      hours: number;
      cost: number;
    }>;
  }>;
  summary: {
    totalOvertimeHours: number;
    totalOvertimeCost: number;
    averageDailyOvertime: number;
    peakDays: Array<{
      date: string;
      hours: number;
      reason: string;
    }>;
  };
  patterns: {
    weeklyPattern: Array<{ day: string; averageHours: number }>;
    monthlyTrend: Array<{ week: string; hours: number }>;
    departmentRanking: Array<{ department: string; totalHours: number; efficiency: number }>;
  };
}

export interface ComplianceKPIs {
  propertyId: string;
  period: string;
  metrics: {
    erganiSubmission: {
      successRate: number;
      totalSubmissions: number;
      failedSubmissions: number;
      averageResponseTime: number;
      target: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    };
    digitalWorkCard: {
      coverageRate: number;
      totalEmployees: number;
      coveredEmployees: number;
      pendingSetup: number;
      target: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    };
    exceptionRate: {
      rate: number;
      totalExceptions: number;
      resolvedExceptions: number;
      pendingExceptions: number;
      averageResolutionTime: number;
      target: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    };
    payrollAccuracy: {
      accuracy: number;
      totalPayrolls: number;
      errorCount: number;
      correctionRate: number;
      target: number;
      status: 'excellent' | 'good' | 'warning' | 'critical';
    };
  };
  trends: {
    submissionSuccess: Array<{ date: string; rate: number }>;
    exceptionTrend: Array<{ date: string; count: number }>;
    coverageGrowth: Array<{ date: string; coverage: number }>;
  };
  alerts: Array<{
    severity: 'high' | 'medium' | 'low';
    category: string;
    message: string;
    impact: string;
    recommendation: string;
    timestamp: Date;
  }>;
}

export interface ProductivityMetrics {
  propertyId: string;
  period: string;
  hotelMetrics: {
    laborCostPerOccupiedRoom: number;
    laborCostPerCover: number;
    revenuePerAvailableRoom: number;
    occupancyRate: number;
    averageDailyRate: number;
    totalRevenue: number;
    totalLaborCost: number;
    efficiency: number;
  };
  departmentProductivity: Array<{
    department: string;
    metrics: {
      laborCostPerHour: number;
      productivityIndex: number;
      efficiencyScore: number;
      qualityScore: number;
      utilizationRate: number;
    };
    benchmarks: {
      industryAverage: number;
      propertyTarget: number;
      variance: number;
    };
    staffMetrics: {
      totalStaff: number;
      activeStaff: number;
      utilizationRate: number;
      averageHoursPerEmployee: number;
    };
  }>;
  turnoverAnalysis: {
    turnoverRate: number;
    newHires: number;
    terminations: number;
    voluntaryTurnover: number;
    involuntaryTurnover: number;
    costOfTurnover: number;
    retentionRate: number;
    timeToFill: number;
  };
  absenteeismMetrics: {
    absenteeismRate: number;
    plannedAbsence: number;
    unplannedAbsence: number;
    sickLeaveRate: number;
    costOfAbsenteeism: number;
    replacementCost: number;
  };
  seasonalAnalysis: {
    peakSeasonMetrics: any;
    offSeasonMetrics: any;
    seasonalVariation: number;
    staffingFlexibility: number;
  };
}

export class AdvancedAnalyticsService {
  /**
   * Generate comprehensive labor cost forecast by department and property
   */
  async generateLaborCostForecast(
    propertyId: string, 
    forecastMonths: number = 3
  ): Promise<LaborCostForecast> {
    const property = { name: 'Hotel Santikos Costa' }; // Mock property data
    const currentDate = new Date();
    
    // Mock department data with realistic Greek hotel departments
    const departments = ['Front Office', 'Housekeeping', 'F&B', 'Maintenance', 'Kitchen', 'Spa', 'Security'];
    
    const departmentForecasts = departments.map(dept => {
      const baseCost = Math.random() * 15000 + 8000; // 8K-23K range
      const growthRate = (Math.random() - 0.5) * 0.1; // -5% to +5%
      const seasonalFactor = dept === 'Housekeeping' ? 1.2 : dept === 'F&B' ? 1.15 : 1.05;
      
      const currentMonthCost = baseCost;
      const projectedCost = baseCost * (1 + growthRate) * seasonalFactor;
      const budgetTarget = baseCost * 1.1; // 10% buffer
      const variance = projectedCost - budgetTarget;
      
      return {
        department: dept,
        currentMonthCost,
        projectedCost,
        budgetTarget,
        variance,
        variancePercentage: (variance / budgetTarget) * 100,
        breakdown: {
          baseSalary: projectedCost * 0.65,
          overtime: projectedCost * 0.15,
          allowances: projectedCost * 0.10,
          bonuses: projectedCost * 0.05,
          employerContributions: projectedCost * 0.05
        },
        trendAnalysis: {
          trend: growthRate > 0.02 ? 'increasing' : growthRate < -0.02 ? 'decreasing' : 'stable',
          monthOverMonth: growthRate * 100,
          seasonalAdjustment: (seasonalFactor - 1) * 100
        }
      };
    });

    const totalCurrent = departmentForecasts.reduce((sum, dept) => sum + dept.currentMonthCost, 0);
    const totalProjected = departmentForecasts.reduce((sum, dept) => sum + dept.projectedCost, 0);
    const totalBudget = departmentForecasts.reduce((sum, dept) => sum + dept.budgetTarget, 0);

    const forecast: LaborCostForecast = {
      propertyId,
      propertyName: property.name,
      period: format(currentDate, 'yyyy-MM'),
      departments: departmentForecasts,
      totalForecast: {
        currentMonth: totalCurrent,
        projected: totalProjected,
        budget: totalBudget,
        variance: totalProjected - totalBudget,
        confidence: 85 + Math.random() * 10 // 85-95% confidence
      },
      recommendations: [
        {
          priority: 'high',
          category: 'Overtime Management',
          description: 'Implement overtime caps in high-variance departments',
          potentialSaving: Math.abs(departmentForecasts[0].variance * 0.3)
        },
        {
          priority: 'medium',
          category: 'Staff Optimization',
          description: 'Cross-train staff for seasonal flexibility',
          potentialSaving: totalProjected * 0.05
        },
        {
          priority: 'low',
          category: 'Allowance Review',
          description: 'Review transport and meal allowances for efficiency',
          potentialSaving: totalProjected * 0.02
        }
      ]
    };

    return forecast;
  }

  /**
   * Generate overtime heatmap with department-level insights
   */
  async generateOvertimeHeatmap(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OvertimeHeatmap> {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const departments = ['Front Office', 'Housekeeping', 'F&B', 'Kitchen', 'Maintenance'];
    
    const heatmapData = [];
    let totalOvertimeHours = 0;
    let totalOvertimeCost = 0;
    
    for (const day of days) {
      for (const dept of departments) {
        const overtimeHours = Math.random() * 12; // 0-12 hours
        const overtimeCost = overtimeHours * 25; // €25/hour overtime rate
        
        totalOvertimeHours += overtimeHours;
        totalOvertimeCost += overtimeCost;
        
        const intensity = 
          overtimeHours > 8 ? 'critical' :
          overtimeHours > 6 ? 'high' :
          overtimeHours > 3 ? 'medium' : 'low';

        // Mock employee data
        const employees = Array.from({ length: Math.floor(overtimeHours / 2) + 1 }, (_, i) => ({
          employeeId: `EMP_${dept}_${i + 1}`,
          name: `Employee ${i + 1}`,
          hours: Math.random() * 4 + 1,
          cost: (Math.random() * 4 + 1) * 25
        }));

        heatmapData.push({
          date: format(day, 'yyyy-MM-dd'),
          department: dept,
          overtimeHours,
          overtimeCost,
          intensity,
          employees
        });
      }
    }

    // Generate patterns
    const weeklyPattern = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      .map(day => ({
        day,
        averageHours: Math.random() * 8 + 2
      }));

    const departmentRanking = departments
      .map(dept => ({
        department: dept,
        totalHours: heatmapData
          .filter(d => d.department === dept)
          .reduce((sum, d) => sum + d.overtimeHours, 0),
        efficiency: 85 + Math.random() * 15
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    const peakDays = heatmapData
      .reduce((acc, curr) => {
        const existing = acc.find(d => d.date === curr.date);
        if (existing) {
          existing.hours += curr.overtimeHours;
        } else {
          acc.push({
            date: curr.date,
            hours: curr.overtimeHours,
            reason: 'High occupancy period'
          });
        }
        return acc;
      }, [] as any[])
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    return {
      propertyId,
      period: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`,
      heatmapData,
      summary: {
        totalOvertimeHours,
        totalOvertimeCost,
        averageDailyOvertime: totalOvertimeHours / days.length,
        peakDays
      },
      patterns: {
        weeklyPattern,
        monthlyTrend: [], // Would be populated with weekly aggregations
        departmentRanking
      }
    };
  }

  /**
   * Calculate comprehensive compliance KPIs
   */
  async getComplianceKPIs(propertyId: string, period: string): Promise<ComplianceKPIs> {
    // Mock compliance data - in real implementation would query actual compliance records
    const totalSubmissions = 1250;
    const successfulSubmissions = 1238;
    const totalEmployees = 85;
    const coveredEmployees = 82;
    const totalExceptions = 45;
    const resolvedExceptions = 41;
    const totalPayrolls = 12; // Monthly payrolls
    const payrollErrors = 1;

    const erganiSuccessRate = (successfulSubmissions / totalSubmissions) * 100;
    const coverageRate = (coveredEmployees / totalEmployees) * 100;
    const exceptionRate = (totalExceptions / (totalEmployees * 30)) * 100; // Per employee per month
    const payrollAccuracy = ((totalPayrolls - payrollErrors) / totalPayrolls) * 100;

    const getStatus = (value: number, target: number, reverse: boolean = false) => {
      const diff = reverse ? target - value : value - target;
      if (diff >= 5) return 'excellent';
      if (diff >= 0) return 'good';
      if (diff >= -3) return 'warning';
      return 'critical';
    };

    // Generate trend data for the last 12 months
    const months = eachMonthOfInterval({
      start: startOfYear(new Date()),
      end: new Date()
    });

    const submissionTrend = months.map(month => ({
      date: format(month, 'yyyy-MM'),
      rate: 95 + Math.random() * 5 // 95-100% range
    }));

    const exceptionTrend = months.map(month => ({
      date: format(month, 'yyyy-MM'),
      count: Math.floor(Math.random() * 20) + 30 // 30-50 range
    }));

    const coverageTrend = months.map(month => ({
      date: format(month, 'yyyy-MM'),
      coverage: 90 + Math.random() * 10 // 90-100% range
    }));

    return {
      propertyId,
      period,
      metrics: {
        erganiSubmission: {
          successRate: erganiSuccessRate,
          totalSubmissions,
          failedSubmissions: totalSubmissions - successfulSubmissions,
          averageResponseTime: 2.3, // seconds
          target: 99,
          status: getStatus(erganiSuccessRate, 99)
        },
        digitalWorkCard: {
          coverageRate,
          totalEmployees,
          coveredEmployees,
          pendingSetup: totalEmployees - coveredEmployees,
          target: 95,
          status: getStatus(coverageRate, 95)
        },
        exceptionRate: {
          rate: exceptionRate,
          totalExceptions,
          resolvedExceptions,
          pendingExceptions: totalExceptions - resolvedExceptions,
          averageResolutionTime: 18.5, // hours
          target: 1, // 1% target
          status: getStatus(exceptionRate, 1, true)
        },
        payrollAccuracy: {
          accuracy: payrollAccuracy,
          totalPayrolls,
          errorCount: payrollErrors,
          correctionRate: (payrollErrors / totalPayrolls) * 100,
          target: 99,
          status: getStatus(payrollAccuracy, 99)
        }
      },
      trends: {
        submissionSuccess: submissionTrend,
        exceptionTrend: exceptionTrend,
        coverageGrowth: coverageTrend
      },
      alerts: [
        {
          severity: 'medium',
          category: 'Digital Work Card',
          message: '3 employees pending digital card setup',
          impact: 'Compliance coverage below target',
          recommendation: 'Schedule setup sessions this week',
          timestamp: new Date()
        },
        {
          severity: 'low',
          category: 'Exception Resolution',
          message: '4 time exceptions pending manager approval',
          impact: 'Minor delay in payroll processing',
          recommendation: 'Send reminder to department managers',
          timestamp: new Date()
        }
      ]
    };
  }

  /**
   * Calculate comprehensive productivity metrics including turnover and absenteeism
   */
  async getProductivityMetrics(propertyId: string, period: string): Promise<ProductivityMetrics> {
    // Mock hotel operational data
    const occupiedRooms = 180;
    const totalRooms = 220;
    const covers = 450; // Restaurant covers
    const totalRevenue = 125000;
    const totalLaborCost = 28500;
    
    // Mock staff metrics
    const totalStaff = 85;
    const activeStaff = 82;
    const newHires = 6;
    const terminations = 4;
    const voluntaryTurnover = 3;
    
    // Mock absence data
    const totalScheduledHours = totalStaff * 160; // 160 hours per month
    const actualHours = totalScheduledHours * 0.94; // 6% absence
    const sickLeaveHours = totalScheduledHours * 0.03; // 3% sick leave
    const unplannedAbsence = totalScheduledHours * 0.02; // 2% unplanned

    const departments = ['Front Office', 'Housekeeping', 'F&B', 'Kitchen', 'Maintenance', 'Spa'];
    
    const departmentProductivity = departments.map(dept => {
      const deptStaff = Math.floor(totalStaff / departments.length);
      const deptLaborCost = totalLaborCost / departments.length;
      const deptHours = deptStaff * 160;
      
      return {
        department: dept,
        metrics: {
          laborCostPerHour: deptLaborCost / deptHours,
          productivityIndex: 85 + Math.random() * 20, // 85-105 range
          efficiencyScore: 80 + Math.random() * 15, // 80-95 range
          qualityScore: 85 + Math.random() * 10, // 85-95 range
          utilizationRate: 85 + Math.random() * 10 // 85-95 range
        },
        benchmarks: {
          industryAverage: 90,
          propertyTarget: 92,
          variance: (85 + Math.random() * 20) - 90
        },
        staffMetrics: {
          totalStaff: deptStaff,
          activeStaff: Math.floor(deptStaff * 0.96),
          utilizationRate: 90 + Math.random() * 8,
          averageHoursPerEmployee: 160
        }
      };
    });

    return {
      propertyId,
      period,
      hotelMetrics: {
        laborCostPerOccupiedRoom: totalLaborCost / occupiedRooms,
        laborCostPerCover: totalLaborCost / covers,
        revenuePerAvailableRoom: totalRevenue / totalRooms,
        occupancyRate: (occupiedRooms / totalRooms) * 100,
        averageDailyRate: totalRevenue / occupiedRooms,
        totalRevenue,
        totalLaborCost,
        efficiency: (totalRevenue / totalLaborCost) * 100
      },
      departmentProductivity,
      turnoverAnalysis: {
        turnoverRate: (terminations / totalStaff) * 100,
        newHires,
        terminations,
        voluntaryTurnover,
        involuntaryTurnover: terminations - voluntaryTurnover,
        costOfTurnover: terminations * 2500, // €2,500 per turnover
        retentionRate: ((totalStaff - terminations) / totalStaff) * 100,
        timeToFill: 18 // days
      },
      absenteeismMetrics: {
        absenteeismRate: ((totalScheduledHours - actualHours) / totalScheduledHours) * 100,
        plannedAbsence: (totalScheduledHours - actualHours - unplannedAbsence),
        unplannedAbsence,
        sickLeaveRate: (sickLeaveHours / totalScheduledHours) * 100,
        costOfAbsenteeism: (totalScheduledHours - actualHours) * 18, // €18/hour replacement cost
        replacementCost: unplannedAbsence * 25 // €25/hour emergency replacement
      },
      seasonalAnalysis: {
        peakSeasonMetrics: {
          occupancyRate: 95,
          laborCostRatio: 22.5,
          productivityIndex: 105
        },
        offSeasonMetrics: {
          occupancyRate: 65,
          laborCostRatio: 28.5,
          productivityIndex: 85
        },
        seasonalVariation: 30,
        staffingFlexibility: 85
      }
    };
  }

  /**
   * Generate executive dashboard summary
   */
  async getExecutiveSummary(propertyId: string): Promise<{
    kpiSummary: any;
    alerts: any[];
    trends: any;
    recommendations: any[];
  }> {
    const forecast = await this.generateLaborCostForecast(propertyId);
    const compliance = await this.getComplianceKPIs(propertyId, format(new Date(), 'yyyy-MM'));
    const productivity = await this.getProductivityMetrics(propertyId, format(new Date(), 'yyyy-MM'));

    return {
      kpiSummary: {
        laborCostVariance: forecast.totalForecast.variance,
        complianceScore: Object.values(compliance.metrics).reduce((avg, metric: any) => 
          avg + (metric.status === 'excellent' ? 100 : metric.status === 'good' ? 90 : 
               metric.status === 'warning' ? 75 : 50), 0) / 4,
        productivityIndex: productivity.hotelMetrics.efficiency,
        turnoverRate: productivity.turnoverAnalysis.turnoverRate,
        absenteeismRate: productivity.absenteeismMetrics.absenteeismRate
      },
      alerts: compliance.alerts,
      trends: {
        laborCost: forecast.departments.map(d => ({ name: d.department, trend: d.trendAnalysis.trend })),
        compliance: compliance.trends.submissionSuccess.slice(-6),
        productivity: [] // Would include productivity trends
      },
      recommendations: forecast.recommendations
    };
  }
}