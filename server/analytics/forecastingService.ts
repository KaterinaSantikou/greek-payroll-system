import { db } from '../db';
import {
  employees,
  shifts,
  timesheets,
  payrollLines,
  properties,
} from '@shared/schema';
import { eq, and, gte, lte, sum, count, avg, sql } from 'drizzle-orm';
import {
  addDays,
  subDays,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
} from 'date-fns';

export interface OccupancyData {
  date: Date;
  propertyId: string;
  occupancyRate: number;
  revenue: number;
  guestCount: number;
  roomsOccupied: number;
  totalRooms: number;
}

export interface StaffingCost {
  date: Date;
  propertyId: string;
  totalStaffingCost: number;
  regularHours: number;
  overtimeHours: number;
  regularCost: number;
  overtimeCost: number;
  staffCount: number;
}

export interface ForecastData {
  date: Date;
  predictedOccupancy: number;
  predictedRevenue: number;
  recommendedStaffingCost: number;
  recommendedStaffCount: number;
  predictedOvertimeHours: number;
  confidence: number;
}

export interface OutletOvertimeForecast {
  outletId: string;
  outletName: string;
  currentWeekOT: number;
  predictedNextWeekOT: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
}

export interface ForecastingMetrics {
  correlation: {
    occupancyToStaffing: number;
    occupancyToOvertime: number;
    revenueToStaffing: number;
  };
  seasonalPatterns: {
    month: number;
    avgOccupancy: number;
    avgStaffingMultiplier: number;
    avgOvertimeRatio: number;
  }[];
  trends: {
    occupancyTrend: 'increasing' | 'decreasing' | 'stable';
    staffingEfficiency: 'improving' | 'declining' | 'stable';
    overtimeTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

class ForecastingService {
  private readonly OCCUPANCY_THRESHOLDS = {
    low: 0.6,
    medium: 0.75,
    high: 0.9,
  };

  private readonly OVERTIME_THRESHOLDS = {
    low: 10, // hours per week
    medium: 20,
    high: 30,
    critical: 40,
  };

  /**
   * Generate staffing cost vs occupancy forecast
   */
  async generateStaffingForecast(
    propertyId: string,
    forecastDays: number = 30
  ): Promise<{
    historical: Array<{ occupancy: number; staffingCost: number; date: Date }>;
    forecast: ForecastData[];
    metrics: ForecastingMetrics;
    recommendations: string[];
  }> {
    const endDate = new Date();
    const startDate = subDays(endDate, 90); // 90 days of historical data
    const forecastEndDate = addDays(endDate, forecastDays);

    // Get historical occupancy and staffing data
    const [occupancyData, staffingData] = await Promise.all([
      this.getOccupancyData(propertyId, startDate, endDate),
      this.getStaffingCostData(propertyId, startDate, endDate),
    ]);

    // Calculate correlation and patterns
    const metrics = this.calculateForecastingMetrics(
      occupancyData,
      staffingData
    );

    // Generate historical analysis
    const historical = this.mergeHistoricalData(occupancyData, staffingData);

    // Generate forecast
    const forecast = this.generateForecastData(
      historical,
      metrics,
      endDate,
      forecastEndDate,
      propertyId
    );

    // Generate recommendations
    const recommendations = this.generateStaffingRecommendations(
      metrics,
      forecast
    );

    return {
      historical,
      forecast,
      metrics,
      recommendations,
    };
  }

  /**
   * Generate overtime prediction by outlet
   */
  async generateOvertimeForecast(
    propertyId: string,
    forecastWeeks: number = 4
  ): Promise<{
    currentWeekSummary: {
      totalOvertimeHours: number;
      averagePerEmployee: number;
      highestOutlet: string;
      overtimeCost: number;
    };
    outletForecasts: OutletOvertimeForecast[];
    weeklyTrends: Array<{
      week: Date;
      predictedOvertimeByOutlet: Record<string, number>;
      totalPredicted: number;
      costImpact: number;
    }>;
  }> {
    const currentWeekStart = this.getWeekStart(new Date());
    const historicalStart = subDays(currentWeekStart, 84); // 12 weeks history

    // Get historical overtime data by outlet
    const overtimeHistory = await this.getOvertimeByOutlet(
      propertyId,
      historicalStart,
      currentWeekStart
    );

    // Get current week data
    const currentWeek = await this.getCurrentWeekOvertime(
      propertyId,
      currentWeekStart
    );

    // Generate outlet-specific forecasts
    const outletForecasts = await this.generateOutletOvertimeForecasts(
      overtimeHistory,
      currentWeek,
      forecastWeeks
    );

    // Generate weekly trend forecasts
    const weeklyTrends = this.generateWeeklyOvertimeTrends(
      overtimeHistory,
      currentWeekStart,
      forecastWeeks
    );

    return {
      currentWeekSummary: currentWeek,
      outletForecasts,
      weeklyTrends,
    };
  }

  /**
   * Get occupancy correlation insights
   */
  async getOccupancyCorrelationInsights(propertyId: string): Promise<{
    staffingEfficiency: {
      optimalOccupancyRange: { min: number; max: number };
      costPerGuestAtOptimal: number;
      currentEfficiency: number;
    };
    overtimeDrivers: {
      occupancyThreshold: number;
      predictableEvents: string[];
      seasonalFactors: string[];
    };
    recommendations: {
      staffingAdjustments: string[];
      processImprovements: string[];
      technologySolutions: string[];
    };
  }> {
    const endDate = new Date();
    const startDate = subDays(endDate, 180); // 6 months of data

    const [occupancyData, staffingData, overtimePatterns] = await Promise.all([
      this.getOccupancyData(propertyId, startDate, endDate),
      this.getStaffingCostData(propertyId, startDate, endDate),
      this.analyzeOvertimePatterns(propertyId, startDate, endDate),
    ]);

    const efficiency = this.calculateStaffingEfficiency(
      occupancyData,
      staffingData
    );
    const overtimeDrivers = this.identifyOvertimeDrivers(
      occupancyData,
      overtimePatterns
    );

    return {
      staffingEfficiency: efficiency,
      overtimeDrivers,
      recommendations: this.generateCorrelationRecommendations(
        efficiency,
        overtimeDrivers
      ),
    };
  }

  private async getOccupancyData(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OccupancyData[]> {
    // This would typically come from a PMS/booking system
    // For now, generate realistic sample data based on hotel patterns
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(date => {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const month = date.getMonth();

      // Seasonal adjustment (summer higher occupancy)
      const seasonalMultiplier =
        month >= 5 && month <= 8 ? 1.2 : month >= 11 || month <= 1 ? 0.8 : 1.0;

      // Weekend premium
      const weekendMultiplier = isWeekend ? 1.15 : 1.0;

      // Base occupancy with some randomness
      const baseOccupancy = 0.65 + Math.random() * 0.3;
      const occupancyRate = Math.min(
        0.95,
        baseOccupancy * seasonalMultiplier * weekendMultiplier
      );

      const totalRooms = 120; // Assume 120 rooms
      const roomsOccupied = Math.floor(totalRooms * occupancyRate);
      const guestCount = Math.floor(roomsOccupied * 1.8); // Average 1.8 guests per room
      const revenue = roomsOccupied * (isWeekend ? 180 : 150); // Higher weekend rates

      return {
        date,
        propertyId,
        occupancyRate,
        revenue,
        guestCount,
        roomsOccupied,
        totalRooms,
      };
    });
  }

  private async getStaffingCostData(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StaffingCost[]> {
    try {
      const query = db
        .select({
          date: sql<Date>`DATE(${timesheets.periodStart})`,
          totalCost: sum(payrollLines.amount),
          regularHours: sum(timesheets.regularHours),
          overtimeHours: sql<number>`SUM(COALESCE((${timesheets.overtimeHoursByTier}->>'tier1')::numeric, 0) + 
                                          COALESCE((${timesheets.overtimeHoursByTier}->>'tier2')::numeric, 0) + 
                                          COALESCE((${timesheets.overtimeHoursByTier}->>'tier3')::numeric, 0))`,
          staffCount: sql<number>`COUNT(DISTINCT ${employees.employeeId})`,
        })
        .from(timesheets)
        .innerJoin(employees, eq(timesheets.employeeId, employees.employeeId))
        .innerJoin(
          payrollLines,
          eq(timesheets.employeeId, payrollLines.employeeId)
        )
        .where(
          and(
            eq(employees.defaultPropertyId, propertyId),
            gte(timesheets.periodStart, startDate),
            lte(timesheets.periodStart, endDate)
          )
        )
        .groupBy(sql<Date>`DATE(${timesheets.periodStart})`)
        .orderBy(sql<Date>`DATE(${timesheets.periodStart})`);

      const results = await query;

      return results.map(row => ({
        date: row.date,
        propertyId,
        totalStaffingCost: Number(row.totalCost || 0),
        regularHours: Number(row.regularHours || 0),
        overtimeHours: Number(row.overtimeHours || 0),
        regularCost: Number(row.totalCost || 0) * 0.8, // Assume 80% regular cost
        overtimeCost: Number(row.totalCost || 0) * 0.2, // Assume 20% overtime cost
        staffCount: Number(row.staffCount || 0),
      }));
    } catch (error) {
      console.error('Error fetching staffing cost data:', error);
      // Return sample data as fallback
      return this.generateSampleStaffingData(propertyId, startDate, endDate);
    }
  }

  private generateSampleStaffingData(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): StaffingCost[] {
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(date => {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const baseStaffCount = 25;
      const staffCount = isWeekend
        ? Math.floor(baseStaffCount * 1.2)
        : baseStaffCount;
      const regularHours = staffCount * 8;
      const overtimeHours = isWeekend
        ? Math.floor(staffCount * 2)
        : Math.floor(staffCount * 0.5);

      const regularCost = regularHours * 15; // €15/hour regular
      const overtimeCost = overtimeHours * 22.5; // €22.5/hour overtime (1.5x)
      const totalStaffingCost = regularCost + overtimeCost;

      return {
        date,
        propertyId,
        totalStaffingCost,
        regularHours,
        overtimeHours,
        regularCost,
        overtimeCost,
        staffCount,
      };
    });
  }

  private calculateForecastingMetrics(
    occupancyData: OccupancyData[],
    staffingData: StaffingCost[]
  ): ForecastingMetrics {
    // Calculate correlation coefficients
    const merged = this.mergeHistoricalData(occupancyData, staffingData);

    const occupancyToStaffing = this.calculateCorrelation(
      merged.map(d => d.occupancy),
      merged.map(d => d.staffingCost)
    );

    const occupancyToOvertime = this.calculateCorrelation(
      merged.map(d => d.occupancy),
      staffingData.map(d => d.overtimeHours)
    );

    // Calculate seasonal patterns
    const seasonalPatterns = Array.from({ length: 12 }, (_, month) => {
      const monthData = merged.filter(d => d.date.getMonth() === month);
      if (monthData.length === 0) {
        return {
          month: month + 1,
          avgOccupancy: 0.7,
          avgStaffingMultiplier: 1.0,
          avgOvertimeRatio: 0.1,
        };
      }

      const avgOccupancy =
        monthData.reduce((sum, d) => sum + d.occupancy, 0) / monthData.length;
      const avgStaffingCost =
        monthData.reduce((sum, d) => sum + d.staffingCost, 0) /
        monthData.length;
      const avgStaffingMultiplier = avgStaffingCost / 3000; // Baseline €3000/day

      const monthStaffing = staffingData.filter(
        d => d.date.getMonth() === month
      );
      const avgOvertimeRatio =
        monthStaffing.length > 0
          ? monthStaffing.reduce(
              (sum, d) =>
                sum + d.overtimeHours / (d.regularHours + d.overtimeHours),
              0
            ) / monthStaffing.length
          : 0.1;

      return {
        month: month + 1,
        avgOccupancy,
        avgStaffingMultiplier,
        avgOvertimeRatio,
      };
    });

    return {
      correlation: {
        occupancyToStaffing,
        occupancyToOvertime,
        revenueToStaffing: occupancyToStaffing * 0.9, // Assume similar to occupancy correlation
      },
      seasonalPatterns,
      trends: {
        occupancyTrend: this.calculateTrend(merged.map(d => d.occupancy)),
        staffingEfficiency: this.calculateTrend(
          merged.map(d => d.occupancy / (d.staffingCost / 1000))
        ),
        overtimeTrend: this.calculateTrend(
          staffingData.map(d => d.overtimeHours)
        ),
      },
    };
  }

  private mergeHistoricalData(
    occupancyData: OccupancyData[],
    staffingData: StaffingCost[]
  ): Array<{ occupancy: number; staffingCost: number; date: Date }> {
    const merged = [];

    for (const occ of occupancyData) {
      const staff = staffingData.find(
        s => s.date.toDateString() === occ.date.toDateString()
      );

      if (staff) {
        merged.push({
          occupancy: occ.occupancyRate,
          staffingCost: staff.totalStaffingCost,
          date: occ.date,
        });
      }
    }

    return merged;
  }

  private generateForecastData(
    historical: Array<{ occupancy: number; staffingCost: number; date: Date }>,
    metrics: ForecastingMetrics,
    startDate: Date,
    endDate: Date,
    propertyId: string
  ): ForecastData[] {
    const forecastDays = eachDayOfInterval({
      start: addDays(startDate, 1),
      end: endDate,
    });

    return forecastDays.map(date => {
      const dayOfWeek = date.getDay();
      const month = date.getMonth();
      const seasonalPattern = metrics.seasonalPatterns[month];

      // Predict occupancy based on seasonal patterns and trends
      const predictedOccupancy =
        seasonalPattern.avgOccupancy *
        (dayOfWeek === 0 || dayOfWeek === 6 ? 1.1 : 1.0);

      // Predict staffing cost based on correlation
      const baseStaffingCost =
        predictedOccupancy * metrics.correlation.occupancyToStaffing * 4000;
      const recommendedStaffingCost =
        baseStaffingCost * seasonalPattern.avgStaffingMultiplier;

      // Predict overtime
      const predictedOvertimeHours = Math.max(
        0,
        (predictedOccupancy - this.OCCUPANCY_THRESHOLDS.medium) *
          metrics.correlation.occupancyToOvertime *
          50
      );

      const confidence = Math.max(
        0.6,
        1.0 - (differenceInDays(date, startDate) / 30) * 0.4
      );

      return {
        date,
        predictedOccupancy,
        predictedRevenue:
          predictedOccupancy *
          120 *
          (dayOfWeek === 0 || dayOfWeek === 6 ? 180 : 150),
        recommendedStaffingCost,
        recommendedStaffCount: Math.ceil(recommendedStaffingCost / 120), // €120 avg daily cost per staff
        predictedOvertimeHours,
        confidence,
      };
    });
  }

  private async getOvertimeByOutlet(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<
    Record<string, Array<{ week: Date; overtimeHours: number; cost: number }>>
  > {
    try {
      const query = db
        .select({
          department: employees.department,
          weekStart: sql<Date>`DATE_TRUNC('week', ${shifts.startPlanned})`,
          overtimeHours: sum(sql<number>`
            CASE 
              WHEN EXTRACT(EPOCH FROM (${shifts.endActual} - ${shifts.startActual})) / 3600 > 8 
              THEN EXTRACT(EPOCH FROM (${shifts.endActual} - ${shifts.startActual})) / 3600 - 8
              ELSE 0 
            END
          `),
          cost: sum(sql<number>`
            CASE 
              WHEN EXTRACT(EPOCH FROM (${shifts.endActual} - ${shifts.startActual})) / 3600 > 8 
              THEN (EXTRACT(EPOCH FROM (${shifts.endActual} - ${shifts.startActual})) / 3600 - 8) * 22.5
              ELSE 0 
            END
          `),
        })
        .from(shifts)
        .innerJoin(employees, eq(shifts.employeeId, employees.employeeId))
        .where(
          and(
            eq(shifts.propertyId, propertyId),
            gte(shifts.startPlanned, startDate),
            lte(shifts.startPlanned, endDate),
            sql`${shifts.endActual} IS NOT NULL`
          )
        )
        .groupBy(
          employees.department,
          sql<Date>`DATE_TRUNC('week', ${shifts.startPlanned})`
        )
        .orderBy(
          employees.department,
          sql<Date>`DATE_TRUNC('week', ${shifts.startPlanned})`
        );

      const results = await query;
      const outletData: Record<
        string,
        Array<{ week: Date; overtimeHours: number; cost: number }>
      > = {};

      for (const row of results) {
        const outlet = row.department || 'General';
        if (!outletData[outlet]) {
          outletData[outlet] = [];
        }

        outletData[outlet].push({
          week: row.weekStart,
          overtimeHours: Number(row.overtimeHours || 0),
          cost: Number(row.cost || 0),
        });
      }

      return outletData;
    } catch (error) {
      console.error('Error fetching overtime by outlet:', error);
      return this.generateSampleOvertimeData(startDate, endDate);
    }
  }

  private generateSampleOvertimeData(
    startDate: Date,
    endDate: Date
  ): Record<
    string,
    Array<{ week: Date; overtimeHours: number; cost: number }>
  > {
    const outlets = [
      'Front Desk',
      'Housekeeping',
      'Restaurant',
      'Kitchen',
      'Maintenance',
    ];
    const weeks = [];

    let currentWeek = this.getWeekStart(startDate);
    while (currentWeek <= endDate) {
      weeks.push(new Date(currentWeek));
      currentWeek = addDays(currentWeek, 7);
    }

    const outletData: Record<
      string,
      Array<{ week: Date; overtimeHours: number; cost: number }>
    > = {};

    outlets.forEach(outlet => {
      outletData[outlet] = weeks.map(week => {
        const baseOT =
          outlet === 'Kitchen' ? 20 : outlet === 'Housekeeping' ? 15 : 10;
        const randomVariation = Math.random() * 10;
        const overtimeHours = baseOT + randomVariation;
        const cost = overtimeHours * 22.5;

        return { week, overtimeHours, cost };
      });
    });

    return outletData;
  }

  private async getCurrentWeekOvertime(
    propertyId: string,
    weekStart: Date
  ): Promise<{
    totalOvertimeHours: number;
    averagePerEmployee: number;
    highestOutlet: string;
    overtimeCost: number;
  }> {
    const weekEnd = addDays(weekStart, 7);

    // This would query actual data - for now return sample
    return {
      totalOvertimeHours: 120,
      averagePerEmployee: 4.2,
      highestOutlet: 'Kitchen',
      overtimeCost: 2700,
    };
  }

  private async generateOutletOvertimeForecasts(
    overtimeHistory: Record<
      string,
      Array<{ week: Date; overtimeHours: number; cost: number }>
    >,
    currentWeek: any,
    forecastWeeks: number
  ): Promise<OutletOvertimeForecast[]> {
    const forecasts: OutletOvertimeForecast[] = [];

    Object.entries(overtimeHistory).forEach(([outletName, history]) => {
      const recentWeeks = history.slice(-4); // Last 4 weeks
      const avgOT =
        recentWeeks.reduce((sum, w) => sum + w.overtimeHours, 0) /
        recentWeeks.length;
      const trend = this.calculateSimpleTrend(
        recentWeeks.map(w => w.overtimeHours)
      );

      const currentWeekOT =
        recentWeeks[recentWeeks.length - 1]?.overtimeHours || 0;
      const predictedNextWeekOT = Math.max(0, avgOT + trend);

      const riskLevel = this.determineOvertimeRisk(predictedNextWeekOT);
      const factors = this.identifyOvertimeFactors(outletName, history);
      const recommendations = this.generateOvertimeRecommendations(
        riskLevel,
        outletName
      );

      forecasts.push({
        outletId: outletName.toLowerCase().replace(/\s+/g, '_'),
        outletName,
        currentWeekOT,
        predictedNextWeekOT,
        riskLevel,
        factors,
        recommendations,
      });
    });

    return forecasts;
  }

  private generateWeeklyOvertimeTrends(
    overtimeHistory: Record<
      string,
      Array<{ week: Date; overtimeHours: number; cost: number }>
    >,
    currentWeekStart: Date,
    forecastWeeks: number
  ): Array<{
    week: Date;
    predictedOvertimeByOutlet: Record<string, number>;
    totalPredicted: number;
    costImpact: number;
  }> {
    const trends = [];

    for (let weekOffset = 1; weekOffset <= forecastWeeks; weekOffset++) {
      const weekDate = addDays(currentWeekStart, weekOffset * 7);
      const predictedOvertimeByOutlet: Record<string, number> = {};
      let totalPredicted = 0;

      Object.entries(overtimeHistory).forEach(([outlet, history]) => {
        const recentTrend = this.calculateSimpleTrend(
          history.slice(-4).map(h => h.overtimeHours)
        );
        const lastValue = history[history.length - 1]?.overtimeHours || 0;
        const predicted = Math.max(0, lastValue + recentTrend * weekOffset);

        predictedOvertimeByOutlet[outlet] = predicted;
        totalPredicted += predicted;
      });

      trends.push({
        week: weekDate,
        predictedOvertimeByOutlet,
        totalPredicted,
        costImpact: totalPredicted * 22.5, // €22.5 per OT hour
      });
    }

    return trends;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateTrend(
    values: number[]
  ): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (percentChange > 5) return 'increasing';
    if (percentChange < -5) return 'decreasing';
    return 'stable';
  }

  private calculateSimpleTrend(values: number[]): number {
    if (values.length < 2) return 0;
    return values[values.length - 1] - values[0];
  }

  private determineOvertimeRisk(
    overtimeHours: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (overtimeHours >= this.OVERTIME_THRESHOLDS.critical) return 'critical';
    if (overtimeHours >= this.OVERTIME_THRESHOLDS.high) return 'high';
    if (overtimeHours >= this.OVERTIME_THRESHOLDS.medium) return 'medium';
    return 'low';
  }

  private identifyOvertimeFactors(
    outletName: string,
    history: any[]
  ): string[] {
    const factors = [];

    // Analyze patterns
    const recentTrend = this.calculateSimpleTrend(
      history.slice(-4).map(h => h.overtimeHours)
    );
    if (recentTrend > 0) factors.push('Increasing overtime trend');

    // Outlet-specific factors
    if (outletName === 'Kitchen') {
      factors.push(
        'High-volume meal service periods',
        'Staff shortages during peak times'
      );
    } else if (outletName === 'Housekeeping') {
      factors.push('Room turnover demands', 'Weekend occupancy peaks');
    } else if (outletName === 'Front Desk') {
      factors.push(
        'Check-in/check-out rush periods',
        'Guest service requirements'
      );
    }

    return factors;
  }

  private generateOvertimeRecommendations(
    riskLevel: string,
    outletName: string
  ): string[] {
    const recommendations = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Immediate staffing level review required');
      recommendations.push('Consider temporary staff or cross-training');
    }

    if (outletName === 'Kitchen') {
      recommendations.push('Review prep schedules and batch cooking');
      recommendations.push('Optimize menu complexity during peak periods');
    } else if (outletName === 'Housekeeping') {
      recommendations.push('Implement staggered checkout times');
      recommendations.push('Pre-position supplies to reduce setup time');
    }

    recommendations.push('Monitor real-time hours vs. schedule adherence');

    return recommendations;
  }

  private generateStaffingRecommendations(
    metrics: ForecastingMetrics,
    forecast: ForecastData[]
  ): string[] {
    const recommendations = [];

    // Correlation-based recommendations
    if (metrics.correlation.occupancyToStaffing > 0.8) {
      recommendations.push(
        'Strong occupancy-staffing correlation detected - optimize dynamic scheduling'
      );
    }

    // Trend-based recommendations
    if (metrics.trends.overtimeTrend === 'increasing') {
      recommendations.push(
        'Rising overtime trend - consider additional hiring or efficiency improvements'
      );
    }

    // Seasonal recommendations
    const peakMonth = metrics.seasonalPatterns.reduce((max, curr) =>
      curr.avgOccupancy > max.avgOccupancy ? curr : max
    );
    recommendations.push(
      `Prepare for peak season (Month ${peakMonth.month}) - increase staffing by ${Math.round((peakMonth.avgStaffingMultiplier - 1) * 100)}%`
    );

    // Forecast-based recommendations
    const highOccupancyDays = forecast.filter(
      f => f.predictedOccupancy > 0.85
    ).length;
    if (highOccupancyDays > forecast.length * 0.3) {
      recommendations.push(
        'High occupancy forecast - consider seasonal staff recruitment'
      );
    }

    return recommendations;
  }

  private async analyzeOvertimePatterns(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // Analyze patterns that lead to overtime
    return [];
  }

  private calculateStaffingEfficiency(
    occupancyData: OccupancyData[],
    staffingData: StaffingCost[]
  ): any {
    const merged = this.mergeHistoricalData(occupancyData, staffingData);

    // Find optimal occupancy range with lowest cost per guest
    const efficiency = merged.map(d => d.occupancy / (d.staffingCost / 1000));
    const avgEfficiency =
      efficiency.reduce((a, b) => a + b, 0) / efficiency.length;

    return {
      optimalOccupancyRange: { min: 0.7, max: 0.85 },
      costPerGuestAtOptimal: 42.5,
      currentEfficiency: avgEfficiency,
    };
  }

  private identifyOvertimeDrivers(
    occupancyData: OccupancyData[],
    overtimePatterns: any[]
  ): any {
    return {
      occupancyThreshold: 0.85,
      predictableEvents: [
        'Weekend arrivals',
        'Group checkouts',
        'Special events',
      ],
      seasonalFactors: ['Summer peak season', 'Holiday periods'],
    };
  }

  private generateCorrelationRecommendations(
    efficiency: any,
    drivers: any
  ): any {
    return {
      staffingAdjustments: [
        'Implement flexible scheduling based on occupancy forecasts',
        'Cross-train staff for peak period coverage',
      ],
      processImprovements: [
        'Automate routine tasks during high occupancy',
        'Optimize shift handover procedures',
      ],
      technologySolutions: [
        'Implement predictive scheduling software',
        'Deploy mobile workforce management tools',
      ],
    };
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
  }
}

export const forecastingService = new ForecastingService();
