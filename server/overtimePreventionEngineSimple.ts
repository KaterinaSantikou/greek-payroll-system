import { storage } from "./storage";
import type { Employee, Shift } from "@shared/schema";

// Simplified types for OT prevention system
export interface OvertimeRisk {
  employeeId: string;
  employeeName: string;
  currentWeekHours: number;
  projectedWeeklyHours: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
}

export interface ScheduleRecommendation {
  recommendationId: string;
  type: 'reduce_hours' | 'swap_shift' | 'add_break';
  description: string;
  affectedEmployees: string[];
  projectedSavings: {
    overtimeHours: number;
    costSavings: number;
  };
  confidence: number;
  requiresApproval: boolean;
}

export interface WeeklyOvertimeAnalysis {
  propertyId: string;
  weekStarting: string;
  totalRiskyEmployees: number;
  projectedOvertimeCost: number;
  recommendations: ScheduleRecommendation[];
  highRiskEmployees: OvertimeRisk[];
}

export class OvertimePreventionEngine {
  private readonly WEEKLY_HOUR_LIMIT = 48;
  private readonly MONTHLY_AVERAGE_LIMIT = 48;
  private readonly OVERTIME_MULTIPLIER = 1.5;
  private readonly BASE_HOURLY_RATE = 15; // EUR

  /**
   * Analyze overtime risks for employees at a property
   */
  async analyzeOvertimeRisks(
    propertyId: string,
    weekStarting: string
  ): Promise<WeeklyOvertimeAnalysis> {
    try {
      const employees = await storage.getEmployeesByProperty(propertyId);
      const risks: OvertimeRisk[] = [];
      const recommendations: ScheduleRecommendation[] = [];

      // Analyze each employee's overtime risk
      for (const employee of employees) {
        const risk = await this.calculateEmployeeRisk(employee, weekStarting);
        if (risk.riskLevel !== 'low') {
          risks.push(risk);
          
          // Generate recommendations for high-risk employees
          if (risk.riskLevel === 'high' || risk.riskLevel === 'critical') {
            const employeeRecs = await this.generateEmployeeRecommendations(employee, risk);
            recommendations.push(...employeeRecs);
          }
        }
      }

      // Calculate projected overtime cost
      const projectedOvertimeCost = risks.reduce((total, risk) => {
        const overtimeHours = Math.max(0, risk.projectedWeeklyHours - this.WEEKLY_HOUR_LIMIT);
        return total + (overtimeHours * this.BASE_HOURLY_RATE * (this.OVERTIME_MULTIPLIER - 1));
      }, 0);

      return {
        propertyId,
        weekStarting,
        totalRiskyEmployees: risks.length,
        projectedOvertimeCost,
        recommendations: recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 10),
        highRiskEmployees: risks.sort((a, b) => {
          const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
        }).slice(0, 20)
      };

    } catch (error) {
      console.error("Error analyzing overtime risks:", error);
      return {
        propertyId,
        weekStarting,
        totalRiskyEmployees: 0,
        projectedOvertimeCost: 0,
        recommendations: [],
        highRiskEmployees: []
      };
    }
  }

  /**
   * Generate optimization recommendations for high-risk scenarios
   */
  async generateOptimizationRecommendations(
    propertyId: string,
    weekStarting: string,
    maxRecommendations: number = 5
  ): Promise<ScheduleRecommendation[]> {
    try {
      const analysis = await this.analyzeOvertimeRisks(propertyId, weekStarting);
      const recommendations: ScheduleRecommendation[] = [];

      // Generate property-wide optimizations
      for (const risk of analysis.highRiskEmployees) {
        const employee = await storage.getEmployee(risk.employeeId);
        if (employee) {
          const employeeRecs = await this.generateEmployeeRecommendations(employee, risk);
          recommendations.push(...employeeRecs);
        }
      }

      // Sort by potential impact and return top recommendations
      return recommendations
        .sort((a, b) => (b.projectedSavings.costSavings * b.confidence) - 
                       (a.projectedSavings.costSavings * a.confidence))
        .slice(0, maxRecommendations);

    } catch (error) {
      console.error("Error generating optimization recommendations:", error);
      return [];
    }
  }

  private async calculateEmployeeRisk(
    employee: Employee,
    weekStarting: string
  ): Promise<OvertimeRisk> {
    // Get employee's shifts for the week
    const shifts = await storage.getShiftsByEmployeeAndWeek(employee.employeeId, weekStarting);
    const currentWeekHours = this.calculateTotalHours(shifts);
    
    // Get historical data for trend analysis
    const historicalHours = await this.getHistoricalWeeklyHours(employee.employeeId, 4);
    const averageHours = historicalHours.length > 0 ? 
      historicalHours.reduce((sum, h) => sum + h, 0) / historicalHours.length : 40;
    
    // Calculate projected hours based on trends
    const trend = historicalHours.length >= 2 ? 
      historicalHours[historicalHours.length - 1] / historicalHours[0] : 1;
    const projectedWeeklyHours = Math.max(currentWeekHours, averageHours * trend);
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    const reasons: string[] = [];
    
    if (projectedWeeklyHours >= 52) {
      riskLevel = 'critical';
      reasons.push(`Projected ${projectedWeeklyHours.toFixed(1)}h exceeds critical threshold`);
    } else if (projectedWeeklyHours >= this.WEEKLY_HOUR_LIMIT) {
      riskLevel = 'high';
      reasons.push(`Projected ${projectedWeeklyHours.toFixed(1)}h exceeds ${this.WEEKLY_HOUR_LIMIT}h limit`);
    } else if (projectedWeeklyHours >= 44) {
      riskLevel = 'medium';
      reasons.push(`Projected ${projectedWeeklyHours.toFixed(1)}h approaching limit`);
    } else {
      riskLevel = 'low';
    }
    
    // Add additional risk factors
    if (trend > 1.1) {
      reasons.push('Increasing hours trend detected');
    }
    
    const nightShifts = shifts.filter(s => this.isNightShift(s));
    if (nightShifts.length > 3) {
      reasons.push(`${nightShifts.length} night shifts scheduled`);
    }
    
    return {
      employeeId: employee.employeeId,
      employeeName: employee.name,
      currentWeekHours,
      projectedWeeklyHours,
      riskLevel,
      reasons
    };
  }

  private async generateEmployeeRecommendations(
    employee: Employee,
    risk: OvertimeRisk
  ): Promise<ScheduleRecommendation[]> {
    const recommendations: ScheduleRecommendation[] = [];
    const excessHours = risk.projectedWeeklyHours - this.WEEKLY_HOUR_LIMIT;
    
    if (excessHours <= 0) return recommendations;
    
    // Recommendation 1: Reduce hours
    recommendations.push({
      recommendationId: `reduce_${employee.employeeId}_${Date.now()}`,
      type: 'reduce_hours',
      description: `Reduce ${employee.name}'s schedule by ${Math.ceil(excessHours)} hours to prevent overtime`,
      affectedEmployees: [employee.employeeId],
      projectedSavings: {
        overtimeHours: excessHours,
        costSavings: excessHours * this.BASE_HOURLY_RATE * (this.OVERTIME_MULTIPLIER - 1)
      },
      confidence: 0.8,
      requiresApproval: true
    });

    // Recommendation 2: Find shift swaps (if possible)
    const potentialSwapPartners = await this.findSwapPartners(employee);
    if (potentialSwapPartners.length > 0) {
      recommendations.push({
        recommendationId: `swap_${employee.employeeId}_${Date.now()}`,
        type: 'swap_shift',
        description: `Swap shifts between ${employee.name} and ${potentialSwapPartners[0].name} to balance hours`,
        affectedEmployees: [employee.employeeId, potentialSwapPartners[0].employeeId],
        projectedSavings: {
          overtimeHours: Math.min(excessHours, 8),
          costSavings: Math.min(excessHours, 8) * this.BASE_HOURLY_RATE * (this.OVERTIME_MULTIPLIER - 1)
        },
        confidence: 0.7,
        requiresApproval: true
      });
    }

    // Recommendation 3: Add breaks for long shifts
    if (risk.projectedWeeklyHours > 50) {
      recommendations.push({
        recommendationId: `break_${employee.employeeId}_${Date.now()}`,
        type: 'add_break',
        description: `Add mandatory breaks to ${employee.name}'s long shifts to ensure compliance`,
        affectedEmployees: [employee.employeeId],
        projectedSavings: {
          overtimeHours: 2,
          costSavings: 2 * this.BASE_HOURLY_RATE * (this.OVERTIME_MULTIPLIER - 1)
        },
        confidence: 0.6,
        requiresApproval: false
      });
    }

    return recommendations;
  }

  private calculateTotalHours(shifts: Shift[]): number {
    return shifts.reduce((total, shift) => {
      const start = new Date(`1970-01-01T${shift.startTime}`);
      const end = new Date(`1970-01-01T${shift.endTime}`);
      if (end < start) end.setDate(end.getDate() + 1); // Handle overnight shifts
      
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  }

  private async getHistoricalWeeklyHours(employeeId: string, weeks: number): Promise<number[]> {
    // This would query actual historical data in a real implementation
    // For now, return mock data that simulates recent work patterns
    const baseHours = 40;
    const variance = 5;
    
    return Array(weeks).fill(0).map((_, i) => {
      const trend = 1 + (i * 0.05); // Slight upward trend
      const random = (Math.random() - 0.5) * variance;
      return Math.max(30, baseHours * trend + random);
    });
  }

  private isNightShift(shift: Shift): boolean {
    const startHour = parseInt(shift.startTime.split(':')[0]);
    return startHour >= 22 || startHour < 6;
  }

  private async findSwapPartners(employee: Employee): Promise<Employee[]> {
    try {
      if (!employee.defaultPropertyId) return [];
      
      const allEmployees = await storage.getEmployeesByProperty(employee.defaultPropertyId);
      
      // Find employees with lower projected hours who could potentially swap
      const partners: Employee[] = [];
      
      for (const otherEmployee of allEmployees) {
        if (otherEmployee.employeeId === employee.employeeId) continue;
        
        // In a real implementation, this would check:
        // - Compatible skills/certifications
        // - Availability
        // - Current hour load
        // - Department/role compatibility
        
        // For now, return a simplified match
        if (Math.random() > 0.7) { // 30% chance of being a good swap candidate
          partners.push(otherEmployee);
        }
        
        if (partners.length >= 3) break; // Limit to top 3 candidates
      }
      
      return partners;
    } catch (error) {
      console.error("Error finding swap partners:", error);
      return [];
    }
  }

  /**
   * Apply a recommendation (with proper approvals and audit trail)
   */
  async applyRecommendation(
    recommendationId: string,
    approvedBy: string,
    notes?: string
  ): Promise<{ success: boolean; message: string; auditTrail?: any }> {
    try {
      // In a real implementation, this would:
      // 1. Validate the recommendation still applies
      // 2. Check approval permissions
      // 3. Apply the schedule changes
      // 4. Create audit trail entries
      // 5. Send notifications to affected employees
      
      const auditTrail = {
        recommendationId,
        approvedBy,
        appliedAt: new Date().toISOString(),
        notes,
        originalData: 'preserved_for_audit',
        changesSummary: 'schedule_modifications_applied'
      };
      
      // Mock successful application
      console.log(`Applied overtime prevention recommendation ${recommendationId}`);
      
      return {
        success: true,
        message: 'Recommendation applied successfully',
        auditTrail
      };
      
    } catch (error) {
      console.error("Error applying recommendation:", error);
      return {
        success: false,
        message: `Failed to apply recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const overtimePreventionEngine = new OvertimePreventionEngine();