import { storage } from './storage';

export interface OvertimeAnalytics {
  propertyId: string;
  propertyName: string;
  departments: DepartmentOvertimeData[];
  totalOvertimeHours: number;
  totalOvertimeCost: number;
  anomalyScore: number;
  lastUpdated: Date;
  dataType: 'final' | 'draft';
}

export interface DepartmentOvertimeData {
  departmentId: string;
  departmentName: string;
  totalOvertimeHours: number;
  overtimeCost: number;
  employees: EmployeeOvertimeAnalytics[];
  anomalyScore: number;
  weeklyTrend: number[];
}

export interface EmployeeOvertimeAnalytics {
  employeeId: string;
  employeeName: string;
  overtimeHours: number;
  overtimeCost: number;
  anomalyFlags: AnomalyFlag[];
  weeklyPattern: number[];
  consecutiveOvertimeDays: number;
  averageHoursPerWeek: number;
}

export interface LaborOccupancyAnalytics {
  propertyId: string;
  period: string;
  occupancyRate: number;
  coversServed: number;
  totalLaborHours: number;
  regularHours: number;
  overtimeHours: number;
  totalLaborCost: number;
  laborCostPerOccupiedRoom: number;
  laborCostPerCover: number;
  efficiencyRatio: number;
  benchmark: number;
  variance: number;
  revenuePerLaborHour: number;
  lastUpdated: Date;
}

export interface AnalyticsKPIs {
  propertyId: string;
  period: string;
  overtimeAsPercentOfTotal: number;
  laborCostPerOccupiedRoom: number;
  laborEfficiencyRatio: number;
  anomaliesDetected: number;
  budgetVariance: number;
  costPerRevenue: number;
  thresholds: KPIThresholds;
  trends: KPITrends;
}

export interface KPIThresholds {
  overtimeThreshold: number;
  efficiencyThreshold: number;
  anomalyThreshold: number;
  budgetVarianceThreshold: number;
}

export interface KPITrends {
  overtimeTrend: number; // percentage change from previous period
  efficiencyTrend: number;
  costTrend: number;
  anomalyTrend: number;
}

export interface AnomalyFlag {
  type: 'consecutive-weekends' | 'excessive-hours' | 'late-night-shifts' | 'unusual-pattern' | 'budget-overrun';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  threshold: number;
  actualValue: number;
}

export interface DrillDownData {
  level: 'property' | 'department' | 'employee';
  entityId: string;
  entityName: string;
  children?: DrillDownData[];
  metrics: {
    hours: number;
    cost: number;
    efficiency: number;
    anomalyScore: number;
  };
}

export class VisualAnalyticsService {
  /**
   * Generate overtime heatmap with drill-down capabilities
   */
  async getOvertimeHeatmap(
    propertyId: string, 
    startDate: Date, 
    endDate: Date,
    departmentId?: string,
    employeeId?: string
  ): Promise<OvertimeAnalytics> {
    try {
      // Get base property data
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error(`Property not found: ${propertyId}`);
      }

      // Calculate overtime data for the period
      const overtimeData = await this.calculateOvertimeMetrics(
        propertyId, 
        startDate, 
        endDate, 
        departmentId, 
        employeeId
      );

      // Run anomaly detection
      const anomalies = await this.detectOvertimeAnomalies(overtimeData);

      return {
        propertyId,
        propertyName: property.name,
        departments: overtimeData.departments,
        totalOvertimeHours: overtimeData.totalOvertimeHours,
        totalOvertimeCost: overtimeData.totalOvertimeCost,
        anomalyScore: anomalies.overallScore,
        lastUpdated: new Date(),
        dataType: 'final'
      };
    } catch (error) {
      console.error('Error generating overtime heatmap:', error);
      throw error;
    }
  }

  /**
   * Generate labor vs. occupancy analysis
   */
  async getLaborOccupancyAnalysis(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<LaborOccupancyAnalytics> {
    try {
      // Get occupancy data (would integrate with PMS system)
      const occupancyData = await this.getOccupancyMetrics(propertyId, startDate, endDate);
      
      // Get labor data from timesheets
      const laborData = await this.getLaborMetrics(propertyId, startDate, endDate);
      
      // Calculate efficiency ratios and benchmarks
      const efficiency = this.calculateLaborEfficiency(occupancyData, laborData);
      
      return {
        propertyId,
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        occupancyRate: occupancyData.occupancyRate,
        coversServed: occupancyData.coversServed,
        totalLaborHours: laborData.totalHours,
        regularHours: laborData.regularHours,
        overtimeHours: laborData.overtimeHours,
        totalLaborCost: laborData.totalCost,
        laborCostPerOccupiedRoom: laborData.totalCost / (occupancyData.occupiedRooms || 1),
        laborCostPerCover: laborData.totalCost / (occupancyData.coversServed || 1),
        efficiencyRatio: efficiency.ratio,
        benchmark: efficiency.benchmark,
        variance: efficiency.variance,
        revenuePerLaborHour: occupancyData.revenue / laborData.totalHours,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error generating labor occupancy analysis:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive KPI dashboard data
   */
  async getAnalyticsKPIs(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsKPIs> {
    try {
      const [overtimeAnalytics, laborAnalytics] = await Promise.all([
        this.getOvertimeHeatmap(propertyId, startDate, endDate),
        this.getLaborOccupancyAnalysis(propertyId, startDate, endDate)
      ]);

      // Get budget data for variance calculations
      const budgetData = await this.getBudgetData(propertyId, startDate, endDate);
      
      // Calculate trends from previous period
      const trends = await this.calculateKPITrends(propertyId, startDate, endDate);

      return {
        propertyId,
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        overtimeAsPercentOfTotal: (overtimeAnalytics.totalOvertimeHours / laborAnalytics.totalLaborHours) * 100,
        laborCostPerOccupiedRoom: laborAnalytics.laborCostPerOccupiedRoom,
        laborEfficiencyRatio: laborAnalytics.efficiencyRatio,
        anomaliesDetected: this.countAnomalies(overtimeAnalytics),
        budgetVariance: ((laborAnalytics.totalLaborCost - budgetData.budgetedCost) / budgetData.budgetedCost) * 100,
        costPerRevenue: laborAnalytics.totalLaborCost / (budgetData.revenue || 1),
        thresholds: {
          overtimeThreshold: 15.0, // 15% of total hours
          efficiencyThreshold: 85.0, // 85% efficiency minimum
          anomalyThreshold: 5.0, // Maximum 5 anomalies
          budgetVarianceThreshold: 5.0 // 5% budget variance
        },
        trends
      };
    } catch (error) {
      console.error('Error generating analytics KPIs:', error);
      throw error;
    }
  }

  /**
   * Generate drill-down data for hierarchical analysis
   */
  async getDrillDownData(
    propertyId: string,
    level: 'property' | 'department' | 'employee',
    entityId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DrillDownData> {
    try {
      switch (level) {
        case 'property':
          return await this.getPropertyDrillDown(propertyId, startDate, endDate);
        case 'department':
          return await this.getDepartmentDrillDown(entityId, startDate, endDate);
        case 'employee':
          return await this.getEmployeeDrillDown(entityId, startDate, endDate);
        default:
          throw new Error(`Invalid drill-down level: ${level}`);
      }
    } catch (error) {
      console.error('Error generating drill-down data:', error);
      throw error;
    }
  }

  /**
   * Export analytics data as CSV
   */
  async exportToCSV(
    dataType: 'overtime' | 'labor' | 'kpis',
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    try {
      switch (dataType) {
        case 'overtime':
          return await this.exportOvertimeCSV(propertyId, startDate, endDate);
        case 'labor':
          return await this.exportLaborCSV(propertyId, startDate, endDate);
        case 'kpis':
          return await this.exportKPIsCSV(propertyId, startDate, endDate);
        default:
          throw new Error(`Invalid export type: ${dataType}`);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }

  // Private helper methods

  private async calculateOvertimeMetrics(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    departmentId?: string,
    employeeId?: string
  ) {
    // Mock implementation - in production would query timesheets
    const mockDepartments: DepartmentOvertimeData[] = [
      {
        departmentId: 'dept-housekeeping',
        departmentName: 'Housekeeping',
        totalOvertimeHours: 127.5,
        overtimeCost: 1912.50,
        anomalyScore: 8.2,
        weeklyTrend: [120, 135, 142, 127.5, 130, 125, 140],
        employees: [
          {
            employeeId: 'emp-001',
            employeeName: 'Maria Papadopoulos',
            overtimeHours: 18.5,
            overtimeCost: 277.50,
            anomalyFlags: [
              {
                type: 'consecutive-weekends',
                severity: 'high',
                description: 'Working consecutive weekends',
                detectedAt: new Date(),
                threshold: 2,
                actualValue: 3
              }
            ],
            weeklyPattern: [0, 2.5, 0, 4, 6, 6, 0],
            consecutiveOvertimeDays: 3,
            averageHoursPerWeek: 18.5
          }
        ]
      },
      {
        departmentId: 'dept-kitchen',
        departmentName: 'Kitchen',
        totalOvertimeHours: 89.0,
        overtimeCost: 1335.00,
        anomalyScore: 3.1,
        weeklyTrend: [85, 92, 88, 89, 91, 87, 90],
        employees: [
          {
            employeeId: 'emp-002',
            employeeName: 'Kostas Dimitriou',
            overtimeHours: 15.5,
            overtimeCost: 232.50,
            anomalyFlags: [
              {
                type: 'late-night-shifts',
                severity: 'medium',
                description: 'Unusual late night shift patterns',
                detectedAt: new Date(),
                threshold: 10,
                actualValue: 15.5
              }
            ],
            weeklyPattern: [2, 2, 2, 2, 2, 3, 2.5],
            consecutiveOvertimeDays: 1,
            averageHoursPerWeek: 15.5
          }
        ]
      }
    ];

    const totalOvertimeHours = mockDepartments.reduce((sum, dept) => sum + dept.totalOvertimeHours, 0);
    const totalOvertimeCost = mockDepartments.reduce((sum, dept) => sum + dept.overtimeCost, 0);

    return {
      departments: mockDepartments,
      totalOvertimeHours,
      totalOvertimeCost
    };
  }

  private async detectOvertimeAnomalies(overtimeData: any) {
    // Implement anomaly detection algorithms
    // This would analyze patterns, detect outliers, and flag unusual behavior
    
    let overallScore = 0;
    let anomalyCount = 0;

    for (const dept of overtimeData.departments) {
      for (const employee of dept.employees) {
        const anomalies = await this.detectEmployeeAnomalies(employee);
        employee.anomalyFlags = anomalies;
        
        if (anomalies.length > 0) {
          anomalyCount += anomalies.length;
          overallScore += anomalies.reduce((sum, a) => sum + this.getAnomalySeverityScore(a.severity), 0);
        }
      }
    }

    return {
      overallScore: overallScore / Math.max(anomalyCount, 1),
      anomalyCount
    };
  }

  private async detectEmployeeAnomalies(employee: EmployeeOvertimeAnalytics): Promise<AnomalyFlag[]> {
    const anomalies: AnomalyFlag[] = [];

    // Excessive overtime detection
    if (employee.overtimeHours > 20) {
      anomalies.push({
        type: 'excessive-hours',
        severity: employee.overtimeHours > 30 ? 'critical' : 'high',
        description: `Employee worked ${employee.overtimeHours} overtime hours this week`,
        detectedAt: new Date(),
        threshold: 20,
        actualValue: employee.overtimeHours
      });
    }

    // Consecutive weekend work detection
    if (employee.consecutiveOvertimeDays > 5) {
      anomalies.push({
        type: 'consecutive-weekends',
        severity: 'medium',
        description: `Employee worked ${employee.consecutiveOvertimeDays} consecutive days with overtime`,
        detectedAt: new Date(),
        threshold: 5,
        actualValue: employee.consecutiveOvertimeDays
      });
    }

    return anomalies;
  }

  private getAnomalySeverityScore(severity: string): number {
    switch (severity) {
      case 'low': return 1;
      case 'medium': return 3;
      case 'high': return 7;
      case 'critical': return 10;
      default: return 0;
    }
  }

  private async getOccupancyMetrics(propertyId: string, startDate: Date, endDate: Date) {
    // This would integrate with Property Management System (PMS)
    // For now, return mock data
    return {
      occupancyRate: 82.4,
      occupiedRooms: 165,
      coversServed: 1247,
      revenue: 45680.00
    };
  }

  private async getLaborMetrics(propertyId: string, startDate: Date, endDate: Date) {
    // Mock implementation - in production would query timesheets
    const totalHours = 1680;
    const overtimeHours = 216.5; // Total from departments above
    const regularHours = totalHours - overtimeHours;
    const totalCost = 25200.00;

    return {
      totalHours,
      regularHours,
      overtimeHours,
      totalCost
    };
  }

  private calculateLaborEfficiency(occupancyData: any, laborData: any) {
    // Industry benchmark: 1.2 labor hours per occupied room per day
    const benchmark = 90.0; // 90% efficiency target
    const actualEfficiency = (occupancyData.occupiedRooms * 1.2 * 7) / laborData.totalHours * 100;
    
    return {
      ratio: Math.min(actualEfficiency, 100),
      benchmark,
      variance: actualEfficiency - benchmark
    };
  }

  private async getBudgetData(propertyId: string, startDate: Date, endDate: Date) {
    // This would fetch from budget management system
    return {
      budgetedCost: 24000.00,
      revenue: 45680.00
    };
  }

  private async calculateKPITrends(propertyId: string, startDate: Date, endDate: Date): Promise<KPITrends> {
    // Calculate trends by comparing with previous period
    // This would fetch historical data and calculate percentage changes
    return {
      overtimeTrend: 2.3, // 2.3% increase from previous period
      efficiencyTrend: -0.8, // 0.8% decrease
      costTrend: 1.5, // 1.5% increase
      anomalyTrend: -10.0 // 10% decrease in anomalies
    };
  }

  private countAnomalies(overtimeAnalytics: OvertimeAnalytics): number {
    return overtimeAnalytics.departments
      .flatMap(d => d.employees)
      .reduce((count, e) => count + e.anomalyFlags.length, 0);
  }

  private async getPropertyDrillDown(propertyId: string, startDate: Date, endDate: Date): Promise<DrillDownData> {
    const property = await storage.getProperty(propertyId);
    const propertyMetrics = await this.calculatePropertyMetrics(propertyId, startDate, endDate);

    // Mock department children
    const children: DrillDownData[] = [
      {
        level: 'department',
        entityId: 'dept-housekeeping',
        entityName: 'Housekeeping',
        metrics: {
          hours: 1200,
          cost: 18000,
          efficiency: 92.1,
          anomalyScore: 8.2
        }
      },
      {
        level: 'department',
        entityId: 'dept-kitchen',
        entityName: 'Kitchen',
        metrics: {
          hours: 480,
          cost: 7200,
          efficiency: 96.5,
          anomalyScore: 3.1
        }
      }
    ];

    return {
      level: 'property',
      entityId: propertyId,
      entityName: property?.name || 'Unknown Property',
      children,
      metrics: propertyMetrics
    };
  }

  private async getDepartmentDrillDown(departmentId: string, startDate: Date, endDate: Date): Promise<DrillDownData> {
    const department = await storage.getDepartment(departmentId);
    const deptMetrics = await this.calculateDepartmentMetrics(departmentId, startDate, endDate);

    // Mock employee children
    const children: DrillDownData[] = [
      {
        level: 'employee',
        entityId: 'emp-001',
        entityName: 'Maria Papadopoulos',
        metrics: {
          hours: 185,
          cost: 2775,
          efficiency: 94.2,
          anomalyScore: 7.5
        }
      },
      {
        level: 'employee',
        entityId: 'emp-002',
        entityName: 'Kostas Dimitriou',
        metrics: {
          hours: 155,
          cost: 2325,
          efficiency: 96.8,
          anomalyScore: 2.1
        }
      }
    ];

    return {
      level: 'department',
      entityId: departmentId,
      entityName: department?.name || 'Unknown Department',
      children,
      metrics: deptMetrics
    };
  }

  private async getEmployeeDrillDown(employeeId: string, startDate: Date, endDate: Date): Promise<DrillDownData> {
    const employee = await storage.getEmployee(employeeId);
    const metrics = await this.calculateEmployeeMetrics(employeeId, startDate, endDate);

    return {
      level: 'employee',
      entityId: employeeId,
      entityName: employee ? `${employee.name}` : 'Unknown Employee',
      metrics
    };
  }

  private async calculatePropertyMetrics(propertyId: string, startDate: Date, endDate: Date) {
    // Mock property-level aggregated metrics
    return {
      hours: 1680,
      cost: 25200,
      efficiency: 94.2,
      anomalyScore: 3.5
    };
  }

  private async calculateDepartmentMetrics(departmentId: string, startDate: Date, endDate: Date) {
    // Mock department-specific metrics
    const mockMetrics = {
      'dept-housekeeping': { hours: 1200, cost: 18000, efficiency: 92.1, anomalyScore: 8.2 },
      'dept-kitchen': { hours: 480, cost: 7200, efficiency: 96.5, anomalyScore: 3.1 },
      'housekeeping': { hours: 1200, cost: 18000, efficiency: 92.1, anomalyScore: 8.2 },
      'kitchen': { hours: 480, cost: 7200, efficiency: 96.5, anomalyScore: 3.1 }
    };
    
    return mockMetrics[departmentId as keyof typeof mockMetrics] || {
      hours: 400,
      cost: 6000,
      efficiency: 90.0,
      anomalyScore: 2.5
    };
  }

  private async calculateEmployeeMetrics(employeeId: string, startDate: Date, endDate: Date) {
    // Mock employee-specific metrics
    const mockMetrics = {
      'emp-001': { hours: 185, cost: 2775, efficiency: 94.2, anomalyScore: 7.5 },
      'emp-002': { hours: 155, cost: 2325, efficiency: 96.8, anomalyScore: 2.1 },
      'emp-003': { hours: 160, cost: 2400, efficiency: 93.5, anomalyScore: 3.8 }
    };
    
    return mockMetrics[employeeId as keyof typeof mockMetrics] || {
      hours: 160,
      cost: 2400,
      efficiency: 95.0,
      anomalyScore: 1.8
    };
  }

  private async exportOvertimeCSV(propertyId: string, startDate: Date, endDate: Date): Promise<string> {
    const data = await this.getOvertimeHeatmap(propertyId, startDate, endDate);
    
    let csv = 'Property,Department,Employee,Overtime_Hours,Overtime_Cost,Anomaly_Flags,Last_Updated\n';
    
    for (const dept of data.departments) {
      for (const emp of dept.employees) {
        const anomalyFlags = emp.anomalyFlags.map(f => f.type).join(';');
        csv += `"${data.propertyName}","${dept.departmentName}","${emp.employeeName}",${emp.overtimeHours},${emp.overtimeCost},"${anomalyFlags}","${data.lastUpdated.toISOString()}"\n`;
      }
    }
    
    return csv;
  }

  private async exportLaborCSV(propertyId: string, startDate: Date, endDate: Date): Promise<string> {
    const data = await this.getLaborOccupancyAnalysis(propertyId, startDate, endDate);
    
    let csv = 'Property,Period,Occupancy_Rate,Covers_Served,Total_Hours,Regular_Hours,Overtime_Hours,Total_Cost,Efficiency,Last_Updated\n';
    csv += `"${propertyId}","${data.period}",${data.occupancyRate},${data.coversServed},${data.totalLaborHours},${data.regularHours},${data.overtimeHours},${data.totalLaborCost},${data.efficiencyRatio},"${data.lastUpdated.toISOString()}"\n`;
    
    return csv;
  }

  private async exportKPIsCSV(propertyId: string, startDate: Date, endDate: Date): Promise<string> {
    const data = await this.getAnalyticsKPIs(propertyId, startDate, endDate);
    
    let csv = 'Property,Period,Overtime_Percent,Cost_Per_Room,Efficiency_Ratio,Anomalies_Detected,Budget_Variance\n';
    csv += `"${data.propertyId}","${data.period}",${data.overtimeAsPercentOfTotal},${data.laborCostPerOccupiedRoom},${data.laborEfficiencyRatio},${data.anomaliesDetected},${data.budgetVariance}\n`;
    
    return csv;
  }
}

export const visualAnalyticsService = new VisualAnalyticsService();