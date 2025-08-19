import { db } from "./db";
import { 
  liveOccupancy, 
  laborCostForecast, 
  analyticsMetrics, 
  complianceKpis, 
  employees, 
  properties
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";

export interface LiveOccupancyData {
  propertyId: string;
  propertyName: string;
  departments: Array<{
    department: string;
    totalEmployees: number;
    onSite: number;
    onBreak: number;
    onLunch: number;
    offSite: number;
    employees: Array<{
      employeeId: string;
      employeeName: string;
      status: string;
      lastPunchTime: string;
      shiftStart?: string;
      expectedShiftEnd?: string;
      location?: string;
    }>;
  }>;
}

export interface LaborCostData {
  propertyId: string;
  propertyName: string;
  forecastDate: string;
  totalScheduledHours: number;
  totalProjectedHours: number;
  totalBaseCost: number;
  totalOvertimeCost: number;
  totalCost: number;
  variancePercentage: number;
  departments: Array<{
    department: string;
    scheduledHours: number;
    projectedHours: number;
    baseCost: number;
    overtimeCost: number;
    totalCost: number;
    variance: number;
  }>;
}

export interface OvertimeHeatmapData {
  propertyId: string;
  propertyName: string;
  dateRange: {
    start: string;
    end: string;
  };
  heatmapData: Array<{
    date: string;
    department: string;
    overtimeHours: number;
    overtimeCount: number;
    averageOvertime: number;
    intensity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  summary: {
    totalOvertimeHours: number;
    averageDailyOvertime: number;
    peakDepartment: string;
    peakDate: string;
  };
}

export interface ComplianceKpiData {
  propertyId: string;
  propertyName: string;
  dateRange: {
    start: string;
    end: string;
  };
  kpis: {
    erganiSubmissionSuccess: number;
    erganiExceptionRate: number;
    maxHoursViolations: number;
    restPeriodViolations: number;
    digitalCardCompliance: number;
    dataRetentionCompliance: number;
    overallScore: number;
  };
  trends: Array<{
    date: string;
    erganiSuccess: number;
    exceptionRate: number;
    overallScore: number;
  }>;
}

export interface VarianceAnalysisData {
  propertyId: string;
  propertyName: string;
  dateRange: {
    start: string;
    end: string;
  };
  analysis: Array<{
    employeeId: string;
    employeeName: string;
    department: string;
    scheduledHours: number;
    actualHours: number;
    variance: number;
    variancePercentage: number;
    lateArrivals: number;
    earlyDepartures: number;
    absences: number;
    status: 'on_track' | 'minor_variance' | 'major_variance' | 'critical';
  }>;
  summary: {
    totalScheduledHours: number;
    totalActualHours: number;
    overallVariance: number;
    onTrackEmployees: number;
    varianceEmployees: number;
    criticalEmployees: number;
  };
}

class AnalyticsService {
  // Live Occupancy Tracking
  async updateLiveOccupancy(employeeId: string, status: string, propertyId: string, department: string, location?: string): Promise<void> {
    const now = new Date();
    
    // Update or insert live occupancy record
    await db.insert(liveOccupancy)
      .values({
        employeeId,
        propertyId,
        department,
        status,
        lastPunchTime: now,
        location,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [liveOccupancy.employeeId],
        set: {
          status,
          lastPunchTime: now,
          location,
          updatedAt: now,
        },
      });
  }

  async getLiveOccupancy(propertyId?: string): Promise<LiveOccupancyData[]> {
    // Get live occupancy with employee details
    const occupancyQuery = db
      .select({
        propertyId: liveOccupancy.propertyId,
        propertyName: properties.propertyName,
        employeeId: liveOccupancy.employeeId,
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        department: liveOccupancy.department,
        status: liveOccupancy.status,
        lastPunchTime: liveOccupancy.lastPunchTime,
        shiftStart: liveOccupancy.shiftStart,
        expectedShiftEnd: liveOccupancy.expectedShiftEnd,
        location: liveOccupancy.location,
      })
      .from(liveOccupancy)
      .leftJoin(employees, eq(liveOccupancy.employeeId, employees.employeeId))
      .leftJoin(properties, eq(liveOccupancy.propertyId, properties.propertyId))
      .orderBy(asc(liveOccupancy.propertyId), asc(liveOccupancy.department));

    if (propertyId) {
      occupancyQuery.where(eq(liveOccupancy.propertyId, propertyId));
    }

    const occupancyData = await occupancyQuery.execute();

    // Group by property and department
    const grouped = occupancyData.reduce((acc, record) => {
      if (!acc[record.propertyId]) {
        acc[record.propertyId] = {
          propertyId: record.propertyId,
          propertyName: record.propertyName || 'Unknown Property',
          departments: {},
        };
      }

      if (!acc[record.propertyId].departments[record.department]) {
        acc[record.propertyId].departments[record.department] = {
          department: record.department,
          totalEmployees: 0,
          onSite: 0,
          onBreak: 0,
          onLunch: 0,
          offSite: 0,
          employees: [],
        };
      }

      const dept = acc[record.propertyId].departments[record.department];
      dept.totalEmployees++;
      
      switch (record.status) {
        case 'on_site':
          dept.onSite++;
          break;
        case 'break':
          dept.onBreak++;
          break;
        case 'lunch':
          dept.onLunch++;
          break;
        case 'off_site':
        default:
          dept.offSite++;
      }

      dept.employees.push({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        status: record.status,
        lastPunchTime: record.lastPunchTime.toISOString(),
        shiftStart: record.shiftStart?.toISOString(),
        expectedShiftEnd: record.expectedShiftEnd?.toISOString(),
        location: record.location,
      });

      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map(property => ({
      ...property,
      departments: Object.values(property.departments),
    }));
  }

  // Labor Cost Forecasting
  async generateLaborCostForecast(propertyId: string, forecastDate: Date): Promise<LaborCostData> {
    const startOfDay = new Date(forecastDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(forecastDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get employee data for the property
    const employeesData = await db
      .select({
        employeeId: employees.employeeId,
        department: employees.department,
        baseHourlyRate: employees.baseHourlyRate,
      })
      .from(employees)
      .where(eq(employees.propertyId, propertyId));

    // Calculate costs by department using demo data
    const departmentCosts = new Map();
    const departments = ['Front Office', 'Housekeeping', 'Food & Beverage', 'Maintenance'];
    
    for (const dept of departments) {
      // Generate demo scheduled hours (6-10 hours per employee)
      const employeeCount = Math.floor(Math.random() * 5) + 3; // 3-7 employees per dept
      const avgHours = 8;
      const scheduledHours = employeeCount * avgHours;
      const projectedHours = scheduledHours * (1 + (Math.random() - 0.5) * 0.2); // ±10% variance
      const baseRate = 8.80; // Greek minimum wage
      const otRate = baseRate * 1.25;

      // Calculate regular and overtime hours
      const regularHours = Math.min(projectedHours, employeeCount * 8);
      const overtimeHours = Math.max(0, projectedHours - employeeCount * 8);

      departmentCosts.set(dept, {
        department: dept,
        scheduledHours,
        projectedHours,
        baseCost: regularHours * baseRate,
        overtimeCost: overtimeHours * otRate,
        totalCost: 0,
        variance: ((projectedHours - scheduledHours) / scheduledHours) * 100,
      });

      const deptData = departmentCosts.get(dept);
      deptData.totalCost = deptData.baseCost + deptData.overtimeCost;
    }

    // Get property name
    const property = await db
      .select({ propertyName: properties.propertyName })
      .from(properties)
      .where(eq(properties.propertyId, propertyId))
      .limit(1);

    const departments = Array.from(departmentCosts.values());
    const totals = departments.reduce((acc, dept) => ({
      scheduledHours: acc.scheduledHours + dept.scheduledHours,
      projectedHours: acc.projectedHours + dept.projectedHours,
      baseCost: acc.baseCost + dept.baseCost,
      overtimeCost: acc.overtimeCost + dept.overtimeCost,
      totalCost: acc.totalCost + dept.totalCost,
    }), { scheduledHours: 0, projectedHours: 0, baseCost: 0, overtimeCost: 0, totalCost: 0 });

    // Store forecast in database
    await db.insert(laborCostForecast).values({
      propertyId,
      department: 'ALL',
      forecastDate,
      scheduledHours: totals.scheduledHours,
      projectedHours: totals.projectedHours,
      baseLaborCost: totals.baseCost,
      overtimeCost: totals.overtimeCost,
      totalCost: totals.totalCost,
      variancePercentage: totals.scheduledHours > 0 ? ((totals.projectedHours - totals.scheduledHours) / totals.scheduledHours) * 100 : 0,
    });

    return {
      propertyId,
      propertyName: property[0]?.propertyName || 'Unknown Property',
      forecastDate: forecastDate.toISOString(),
      totalScheduledHours: totals.scheduledHours,
      totalProjectedHours: totals.projectedHours,
      totalBaseCost: totals.baseCost,
      totalOvertimeCost: totals.overtimeCost,
      totalCost: totals.totalCost,
      variancePercentage: totals.scheduledHours > 0 ? ((totals.projectedHours - totals.scheduledHours) / totals.scheduledHours) * 100 : 0,
      departments,
    };
  }

  // Overtime Heatmap Analysis
  async generateOvertimeHeatmap(propertyId: string, startDate: Date, endDate: Date): Promise<OvertimeHeatmapData> {
    // Get overtime metrics for the date range
    const overtimeData = await db
      .select({
        date: analyticsMetrics.metricDate,
        department: analyticsMetrics.department,
        overtimeHours: analyticsMetrics.value,
        metadata: analyticsMetrics.metadata,
      })
      .from(analyticsMetrics)
      .where(
        and(
          eq(analyticsMetrics.propertyId, propertyId),
          eq(analyticsMetrics.metricType, 'overtime'),
          gte(analyticsMetrics.metricDate, startDate),
          lte(analyticsMetrics.metricDate, endDate)
        )
      )
      .orderBy(asc(analyticsMetrics.metricDate), asc(analyticsMetrics.department));

    // Process heatmap data
    const heatmapData = overtimeData.map(record => {
      const metadata = record.metadata as any;
      const intensity = record.overtimeHours > 20 ? 'critical' : 
                       record.overtimeHours > 15 ? 'high' : 
                       record.overtimeHours > 10 ? 'medium' : 'low';

      return {
        date: record.date.toISOString().split('T')[0],
        department: record.department || 'Unknown',
        overtimeHours: record.overtimeHours,
        overtimeCount: metadata?.count || 1,
        averageOvertime: metadata?.average || record.overtimeHours,
        intensity,
      };
    });

    // Calculate summary
    const summary = {
      totalOvertimeHours: heatmapData.reduce((sum, d) => sum + d.overtimeHours, 0),
      averageDailyOvertime: heatmapData.length > 0 ? heatmapData.reduce((sum, d) => sum + d.overtimeHours, 0) / heatmapData.length : 0,
      peakDepartment: heatmapData.reduce((max, d) => d.overtimeHours > max.overtimeHours ? d : max, heatmapData[0] || { department: 'N/A', overtimeHours: 0 }).department,
      peakDate: heatmapData.reduce((max, d) => d.overtimeHours > max.overtimeHours ? d : max, heatmapData[0] || { date: 'N/A', overtimeHours: 0 }).date,
    };

    const property = await db
      .select({ propertyName: properties.propertyName })
      .from(properties)
      .where(eq(properties.propertyId, propertyId))
      .limit(1);

    return {
      propertyId,
      propertyName: property[0]?.propertyName || 'Unknown Property',
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      heatmapData,
      summary,
    };
  }

  // Compliance KPIs
  async getComplianceKpis(propertyId: string, startDate: Date, endDate: Date): Promise<ComplianceKpiData> {
    const kpiData = await db
      .select()
      .from(complianceKpis)
      .where(
        and(
          eq(complianceKpis.propertyId, propertyId),
          gte(complianceKpis.kpiDate, startDate),
          lte(complianceKpis.kpiDate, endDate)
        )
      )
      .orderBy(desc(complianceKpis.kpiDate));

    const latestKpi = kpiData[0];
    const trends = kpiData.map(kpi => ({
      date: kpi.kpiDate.toISOString().split('T')[0],
      erganiSuccess: kpi.erganiSubmissionSuccess,
      exceptionRate: kpi.erganiExceptionRate,
      overallScore: kpi.overallScore,
    }));

    const property = await db
      .select({ propertyName: properties.propertyName })
      .from(properties)
      .where(eq(properties.propertyId, propertyId))
      .limit(1);

    return {
      propertyId,
      propertyName: property[0]?.propertyName || 'Unknown Property',
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      kpis: latestKpi ? {
        erganiSubmissionSuccess: latestKpi.erganiSubmissionSuccess,
        erganiExceptionRate: latestKpi.erganiExceptionRate,
        maxHoursViolations: latestKpi.maxHoursViolations,
        restPeriodViolations: latestKpi.restPeriodViolations,
        digitalCardCompliance: latestKpi.digitalCardCompliance,
        dataRetentionCompliance: latestKpi.dataRetentionCompliance,
        overallScore: latestKpi.overallScore,
      } : {
        erganiSubmissionSuccess: 0,
        erganiExceptionRate: 0,
        maxHoursViolations: 0,
        restPeriodViolations: 0,
        digitalCardCompliance: 0,
        dataRetentionCompliance: 0,
        overallScore: 0,
      },
      trends,
    };
  }

  // Variance Analysis
  async getVarianceAnalysis(propertyId: string, startDate: Date, endDate: Date): Promise<VarianceAnalysisData> {
    // Get variance metrics
    const varianceData = await db
      .select({
        employeeId: analyticsMetrics.employeeId,
        employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        department: analyticsMetrics.department,
        value: analyticsMetrics.value,
        metadata: analyticsMetrics.metadata,
      })
      .from(analyticsMetrics)
      .leftJoin(employees, eq(analyticsMetrics.employeeId, employees.employeeId))
      .where(
        and(
          eq(analyticsMetrics.propertyId, propertyId),
          eq(analyticsMetrics.metricType, 'variance'),
          gte(analyticsMetrics.metricDate, startDate),
          lte(analyticsMetrics.metricDate, endDate)
        )
      );

    // Process variance analysis
    const analysis = varianceData.map(record => {
      const metadata = record.metadata as any;
      const variance = record.value;
      const variancePercentage = Math.abs(variance);
      
      const status = variancePercentage > 25 ? 'critical' :
                    variancePercentage > 15 ? 'major_variance' :
                    variancePercentage > 5 ? 'minor_variance' : 'on_track';

      return {
        employeeId: record.employeeId || 'Unknown',
        employeeName: record.employeeName || 'Unknown Employee',
        department: record.department || 'Unknown',
        scheduledHours: metadata?.scheduledHours || 0,
        actualHours: metadata?.actualHours || 0,
        variance,
        variancePercentage,
        lateArrivals: metadata?.lateArrivals || 0,
        earlyDepartures: metadata?.earlyDepartures || 0,
        absences: metadata?.absences || 0,
        status,
      };
    });

    // Calculate summary
    const summary = {
      totalScheduledHours: analysis.reduce((sum, a) => sum + a.scheduledHours, 0),
      totalActualHours: analysis.reduce((sum, a) => sum + a.actualHours, 0),
      overallVariance: analysis.length > 0 ? analysis.reduce((sum, a) => sum + a.variance, 0) / analysis.length : 0,
      onTrackEmployees: analysis.filter(a => a.status === 'on_track').length,
      varianceEmployees: analysis.filter(a => a.status === 'minor_variance' || a.status === 'major_variance').length,
      criticalEmployees: analysis.filter(a => a.status === 'critical').length,
    };

    const property = await db
      .select({ propertyName: properties.propertyName })
      .from(properties)
      .where(eq(properties.propertyId, propertyId))
      .limit(1);

    return {
      propertyId,
      propertyName: property[0]?.propertyName || 'Unknown Property',
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      analysis,
      summary,
    };
  }

  // Demo data generation for testing
  async generateDemoAnalyticsData(): Promise<void> {
    const now = new Date();
    const properties = ['PRINCESS-FO', 'PRINCESS-HOUSE', 'PRINCESS-FB'];
    const departments = ['Front Office', 'Housekeeping', 'Food & Beverage', 'Maintenance'];
    
    // Generate demo live occupancy
    for (const propertyId of properties) {
      for (const department of departments) {
        const employeeCount = Math.floor(Math.random() * 10) + 5;
        for (let i = 0; i < employeeCount; i++) {
          const employeeId = `EMP${propertyId.slice(-2)}${department.slice(0,2)}${i.toString().padStart(3, '0')}`;
          const statuses = ['on_site', 'off_site', 'break', 'lunch'];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          
          await this.updateLiveOccupancy(employeeId, status, propertyId, department);
        }
      }
    }

    // Generate demo analytics metrics for last 30 days
    for (let d = 0; d < 30; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      
      for (const propertyId of properties) {
        for (const department of departments) {
          // Overtime metrics
          await db.insert(analyticsMetrics).values({
            metricType: 'overtime',
            propertyId,
            department,
            metricDate: date,
            value: Math.random() * 25, // 0-25 overtime hours
            metadata: {
              count: Math.floor(Math.random() * 15) + 1,
              average: Math.random() * 3 + 1,
            },
          });

          // Variance metrics
          await db.insert(analyticsMetrics).values({
            metricType: 'variance',
            employeeId: `EMP${propertyId.slice(-2)}${department.slice(0,2)}001`,
            propertyId,
            department,
            metricDate: date,
            value: (Math.random() - 0.5) * 40, // -20% to +20% variance
            metadata: {
              scheduledHours: 8,
              actualHours: 8 + (Math.random() - 0.5) * 3,
              lateArrivals: Math.floor(Math.random() * 3),
              earlyDepartures: Math.floor(Math.random() * 2),
              absences: Math.floor(Math.random() * 2),
            },
          });
        }

        // Compliance KPIs
        await db.insert(complianceKpis).values({
          propertyId,
          kpiDate: date,
          erganiSubmissionSuccess: 95 + Math.random() * 5, // 95-100%
          erganiExceptionRate: Math.random() * 5, // 0-5%
          maxHoursViolations: Math.floor(Math.random() * 3),
          restPeriodViolations: Math.floor(Math.random() * 2),
          digitalCardCompliance: 98 + Math.random() * 2, // 98-100%
          dataRetentionCompliance: 100, // Always 100%
          overallScore: 90 + Math.random() * 10, // 90-100%
        });
      }
    }
  }
}

export const analyticsService = new AnalyticsService();