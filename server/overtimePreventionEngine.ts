import { storage } from "./storage";
import type { Employee, Shift, PunchEvent } from "@shared/schema";

// Types for OT prevention system
export interface StaffingConstraints {
  maxWeeklyHours: number;
  max4MonthAverage: number;
  nightShiftLimit: number;
  sundayRestRequired: boolean;
  minRestBetweenShifts: number; // hours
}

export interface OptimizationObjective {
  type: 'minimize_ot_cost' | 'maximize_fairness' | 'maximize_coverage';
  weight: number;
}

export interface ScheduleChangeProposal {
  changeId: string;
  type: 'swap_shifts' | 'split_shift' | 'move_break' | 'reduce_hours';
  affectedEmployees: string[];
  originalShifts: Shift[];
  proposedShifts: Shift[];
  impact: {
    overtimeSaved: number;
    costSaving: number;
    coverageChange: number;
    fairnessScore: number;
  };
  reasoning: string;
  confidence: number;
  riskFactors: string[];
}

export interface OvertimeRiskPrediction {
  employeeId: string;
  weekStarting: string;
  predictedHours: number;
  overtimeRisk: 'low' | 'medium' | 'high' | 'critical';
  triggerFactors: string[];
  preventionSuggestions: ScheduleChangeProposal[];
}

export class OvertimePreventionEngine {
  private constraints: StaffingConstraints;
  private objectives: OptimizationObjective[];

  constructor(
    constraints: StaffingConstraints = {
      maxWeeklyHours: 48,
      max4MonthAverage: 48,
      nightShiftLimit: 8,
      sundayRestRequired: true,
      minRestBetweenShifts: 11
    },
    objectives: OptimizationObjective[] = [
      { type: 'minimize_ot_cost', weight: 0.6 },
      { type: 'maximize_fairness', weight: 0.3 },
      { type: 'maximize_coverage', weight: 0.1 }
    ]
  ) {
    this.constraints = constraints;
    this.objectives = objectives;
  }

  /**
   * Predict overtime risks for the upcoming week
   */
  async predictOvertimeRisks(
    propertyId: string,
    weekStarting: string
  ): Promise<OvertimeRiskPrediction[]> {
    try {
      const employees = await storage.getEmployeesByProperty(propertyId);
      const schedules = await storage.getSchedulesByProperty(propertyId, weekStarting);
      const predictions: OvertimeRiskPrediction[] = [];

      for (const employee of employees) {
        const prediction = await this.analyzeEmployeeOvertimeRisk(
          employee,
          schedules.filter(s => s.employeeId === employee.employeeId),
          weekStarting
        );
        
        if (prediction.overtimeRisk !== 'low') {
          predictions.push(prediction);
        }
      }

      return predictions.sort((a, b) => {
        const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return riskOrder[b.overtimeRisk] - riskOrder[a.overtimeRisk];
      });

    } catch (error) {
      console.error("Error predicting overtime risks:", error);
      return [];
    }
  }

  /**
   * Generate schedule optimization recommendations
   */
  async generateScheduleOptimizations(
    propertyId: string,
    weekStarting: string,
    riskThreshold: 'medium' | 'high' = 'medium'
  ): Promise<ScheduleChangeProposal[]> {
    try {
      const risks = await this.predictOvertimeRisks(propertyId, weekStarting);
      const highRiskEmployees = risks.filter(r => 
        riskThreshold === 'medium' ? 
          ['medium', 'high', 'critical'].includes(r.overtimeRisk) :
          ['high', 'critical'].includes(r.overtimeRisk)
      );

      const proposals: ScheduleChangeProposal[] = [];

      for (const risk of highRiskEmployees) {
        const employeeProposals = await this.generateEmployeeOptimizations(
          risk,
          propertyId,
          weekStarting
        );
        proposals.push(...employeeProposals);
      }

      // Rank proposals by impact and confidence
      return proposals.sort((a, b) => {
        const scoreA = a.impact.costSaving * a.confidence;
        const scoreB = b.impact.costSaving * b.confidence;
        return scoreB - scoreA;
      });

    } catch (error) {
      console.error("Error generating schedule optimizations:", error);
      return [];
    }
  }

  private async analyzeEmployeeOvertimeRisk(
    employee: Employee,
    schedules: Schedule[],
    weekStarting: string
  ): Promise<OvertimeRiskPrediction> {
    // Get historical data for pattern analysis
    const historicalHours = await this.getHistoricalHours(employee.employeeId, 16); // 4 months
    const weeklyScheduledHours = this.calculateWeeklyHours(schedules);
    
    // Analyze trends and patterns
    const averageWeeklyHours = this.calculateAverageHours(historicalHours);
    const trendFactor = this.analyzeTrend(historicalHours);
    
    // Calculate risk factors
    const triggerFactors: string[] = [];
    let riskScore = 0;

    // Weekly hour risk
    if (weeklyScheduledHours > this.constraints.maxWeeklyHours) {
      riskScore += 40;
      triggerFactors.push(`Scheduled ${weeklyScheduledHours}h exceeds ${this.constraints.maxWeeklyHours}h limit`);
    }

    // 4-month average risk
    const projected4MonthAvg = (averageWeeklyHours * 15 + weeklyScheduledHours) / 16;
    if (projected4MonthAvg > this.constraints.max4MonthAverage) {
      riskScore += 30;
      triggerFactors.push(`4-month average trending to ${projected4MonthAvg.toFixed(1)}h`);
    }

    // Night shift violations
    const nightHours = this.calculateNightHours(schedules);
    if (nightHours > this.constraints.nightShiftLimit) {
      riskScore += 20;
      triggerFactors.push(`${nightHours}h night shifts exceed ${this.constraints.nightShiftLimit}h limit`);
    }

    // Sunday rest violations
    const sundayViolation = this.checkSundayRestViolation(schedules);
    if (sundayViolation) {
      riskScore += 15;
      triggerFactors.push('Sunday rest period violated');
    }

    // Rest period violations
    const restViolations = this.checkRestPeriodViolations(schedules);
    if (restViolations > 0) {
      riskScore += restViolations * 10;
      triggerFactors.push(`${restViolations} rest period violations`);
    }

    // Trend analysis
    if (trendFactor > 1.1) {
      riskScore += 15;
      triggerFactors.push('Increasing hours trend detected');
    }

    // Determine risk level
    let overtimeRisk: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 80) overtimeRisk = 'critical';
    else if (riskScore >= 60) overtimeRisk = 'high';
    else if (riskScore >= 30) overtimeRisk = 'medium';
    else overtimeRisk = 'low';

    return {
      employeeId: employee.employeeId,
      weekStarting,
      predictedHours: weeklyScheduledHours,
      overtimeRisk,
      triggerFactors,
      preventionSuggestions: [] // Will be populated by generateEmployeeOptimizations
    };
  }

  private async generateEmployeeOptimizations(
    risk: OvertimeRiskPrediction,
    propertyId: string,
    weekStarting: string
  ): Promise<ScheduleChangeProposal[]> {
    const proposals: ScheduleChangeProposal[] = [];
    const employee = await storage.getEmployee(risk.employeeId);
    const schedules = await storage.getSchedulesByEmployee(risk.employeeId, weekStarting);
    const allEmployees = await storage.getEmployeesByProperty(propertyId);

    // Strategy 1: Shift swapping with qualified colleagues
    const swapProposals = await this.generateShiftSwapProposals(
      employee,
      schedules,
      allEmployees,
      risk
    );
    proposals.push(...swapProposals);

    // Strategy 2: Split long shifts
    const splitProposals = await this.generateSplitShiftProposals(
      employee,
      schedules,
      risk
    );
    proposals.push(...splitProposals);

    // Strategy 3: Move break periods to optimize rest
    const breakProposals = await this.generateBreakOptimizationProposals(
      employee,
      schedules,
      risk
    );
    proposals.push(...breakProposals);

    // Strategy 4: Reduce non-critical hours
    const reductionProposals = await this.generateHourReductionProposals(
      employee,
      schedules,
      risk
    );
    proposals.push(...reductionProposals);

    return proposals;
  }

  private async generateShiftSwapProposals(
    employee: Employee,
    schedules: Schedule[],
    allEmployees: Employee[],
    risk: OvertimeRiskPrediction
  ): Promise<ScheduleChangeProposal[]> {
    const proposals: ScheduleChangeProposal[] = [];

    // Find employees with compatible skills and lower hours
    const compatibleEmployees = allEmployees.filter(e => 
      e.employeeId !== employee.employeeId &&
      this.hasCompatibleSkills(employee, e) &&
      this.hasLowerHoursBurden(e.employeeId, risk.weekStarting)
    );

    for (const compatibleEmployee of compatibleEmployees.slice(0, 3)) { // Limit to top 3
      for (const schedule of schedules) {
        if (this.isSwappable(schedule)) {
          const swapImpact = await this.calculateSwapImpact(
            employee,
            compatibleEmployee,
            schedule,
            risk
          );

          if (swapImpact.costSaving > 0) {
            proposals.push({
              changeId: `swap_${employee.employeeId}_${compatibleEmployee.employeeId}_${schedule.scheduleId}`,
              type: 'swap_shifts',
              affectedEmployees: [employee.employeeId, compatibleEmployee.employeeId],
              originalShifts: [this.scheduleToShift(schedule)],
              proposedShifts: [this.createSwappedShift(schedule, compatibleEmployee.employeeId)],
              impact: swapImpact,
              reasoning: `Swap ${this.formatShiftTime(schedule)} with ${compatibleEmployee.firstName} ${compatibleEmployee.lastName} who has ${swapImpact.coverageChange} lower weekly hours`,
              confidence: this.calculateSwapConfidence(employee, compatibleEmployee, schedule),
              riskFactors: this.assessSwapRisks(employee, compatibleEmployee, schedule)
            });
          }
        }
      }
    }

    return proposals.slice(0, 5); // Return top 5 proposals
  }

  private async generateSplitShiftProposals(
    employee: Employee,
    schedules: Schedule[],
    risk: OvertimeRiskPrediction
  ): Promise<ScheduleChangeProposal[]> {
    const proposals: ScheduleChangeProposal[] = [];

    const longShifts = schedules.filter(s => 
      this.calculateShiftHours(s) >= 10 // Shifts 10+ hours are candidates for splitting
    );

    for (const longShift of longShifts) {
      const splitOptions = this.generateSplitOptions(longShift);
      
      for (const splitOption of splitOptions) {
        const splitImpact = this.calculateSplitImpact(longShift, splitOption, risk);
        
        if (splitImpact.costSaving > 0) {
          proposals.push({
            changeId: `split_${employee.employeeId}_${longShift.scheduleId}`,
            type: 'split_shift',
            affectedEmployees: [employee.employeeId],
            originalShifts: [this.scheduleToShift(longShift)],
            proposedShifts: splitOption.shifts,
            impact: splitImpact,
            reasoning: `Split ${this.formatShiftTime(longShift)} into ${splitOption.shifts.length} shifts with ${splitOption.breakHours}h break`,
            confidence: 0.8, // High confidence for split shifts
            riskFactors: ['Requires coordination with other staff', 'May impact service continuity']
          });
        }
      }
    }

    return proposals;
  }

  private async generateBreakOptimizationProposals(
    employee: Employee,
    schedules: Schedule[],
    risk: OvertimeRiskPrediction
  ): Promise<ScheduleChangeProposal[]> {
    const proposals: ScheduleChangeProposal[] = [];

    for (const schedule of schedules) {
      const optimizedBreaks = this.optimizeBreakTiming(schedule);
      
      if (optimizedBreaks.improvement > 0) {
        const breakImpact = this.calculateBreakImpact(schedule, optimizedBreaks, risk);
        
        proposals.push({
          changeId: `break_${employee.employeeId}_${schedule.scheduleId}`,
          type: 'move_break',
          affectedEmployees: [employee.employeeId],
          originalShifts: [this.scheduleToShift(schedule)],
          proposedShifts: [optimizedBreaks.optimizedShift],
          impact: breakImpact,
          reasoning: `Optimize break timing to improve rest compliance and reduce overtime risk`,
          confidence: 0.7,
          riskFactors: ['May require manager approval', 'Could affect team coordination']
        });
      }
    }

    return proposals;
  }

  private async generateHourReductionProposals(
    employee: Employee,
    schedules: Schedule[],
    risk: OvertimeRiskPrediction
  ): Promise<ScheduleChangeProposal[]> {
    const proposals: ScheduleChangeProposal[] = [];

    // Identify non-critical hours that can be reduced
    const reducibleSchedules = schedules.filter(s => 
      this.isReducible(s) && this.calculateShiftHours(s) > 4
    );

    for (const schedule of reducibleSchedules) {
      const reductionOptions = this.generateReductionOptions(schedule);
      
      for (const reduction of reductionOptions) {
        const reductionImpact = this.calculateReductionImpact(schedule, reduction, risk);
        
        if (reductionImpact.costSaving > 0) {
          proposals.push({
            changeId: `reduce_${employee.employeeId}_${schedule.scheduleId}`,
            type: 'reduce_hours',
            affectedEmployees: [employee.employeeId],
            originalShifts: [this.scheduleToShift(schedule)],
            proposedShifts: [reduction.reducedShift],
            impact: reductionImpact,
            reasoning: `Reduce ${reduction.hoursReduced}h from non-critical period to prevent overtime`,
            confidence: 0.6,
            riskFactors: ['May impact service levels', 'Requires coverage analysis']
          });
        }
      }
    }

    return proposals;
  }

  // Utility methods
  private calculateWeeklyHours(schedules: Schedule[]): number {
    return schedules.reduce((total, schedule) => {
      return total + this.calculateShiftHours(schedule);
    }, 0);
  }

  private calculateShiftHours(schedule: Schedule): number {
    const start = new Date(`1970-01-01T${schedule.startTime}`);
    const end = new Date(`1970-01-01T${schedule.endTime}`);
    if (end < start) end.setDate(end.getDate() + 1); // Handle overnight shifts
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  private async getHistoricalHours(employeeId: string, weeks: number): Promise<number[]> {
    // Mock implementation - in reality would fetch from timesheets/punches
    return Array(weeks).fill(0).map(() => 35 + Math.random() * 15);
  }

  private calculateAverageHours(hours: number[]): number {
    return hours.reduce((sum, h) => sum + h, 0) / hours.length;
  }

  private analyzeTrend(hours: number[]): number {
    const recentAvg = hours.slice(-4).reduce((sum, h) => sum + h, 0) / 4;
    const overallAvg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    return recentAvg / overallAvg;
  }

  private calculateNightHours(schedules: Schedule[]): number {
    return schedules.reduce((total, schedule) => {
      // Night hours: 22:00 - 06:00
      const nightHours = this.calculateNightHoursInShift(schedule.startTime, schedule.endTime);
      return total + nightHours;
    }, 0);
  }

  private calculateNightHoursInShift(startTime: string, endTime: string): number {
    // Simplified calculation - in reality would handle complex night hour rules
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    
    let nightHours = 0;
    if (start >= 22 || start < 6) nightHours += Math.min(8, this.calculateShiftHours({ startTime, endTime } as Schedule));
    if (end >= 22 || end < 6) nightHours += Math.min(8, this.calculateShiftHours({ startTime, endTime } as Schedule));
    
    return Math.min(nightHours, 8); // Cap at 8 hours
  }

  private checkSundayRestViolation(schedules: Schedule[]): boolean {
    // Check if employee works on Sunday or doesn't have proper rest
    return schedules.some(s => new Date(s.date).getDay() === 0);
  }

  private checkRestPeriodViolations(schedules: Schedule[]): number {
    let violations = 0;
    const sortedSchedules = schedules.sort((a, b) => 
      new Date(a.date + ' ' + a.startTime).getTime() - new Date(b.date + ' ' + b.startTime).getTime()
    );

    for (let i = 1; i < sortedSchedules.length; i++) {
      const prevEnd = new Date(sortedSchedules[i-1].date + ' ' + sortedSchedules[i-1].endTime);
      const currStart = new Date(sortedSchedules[i].date + ' ' + sortedSchedules[i].startTime);
      const restHours = (currStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60);
      
      if (restHours < this.constraints.minRestBetweenShifts) {
        violations++;
      }
    }

    return violations;
  }

  private hasCompatibleSkills(employee1: Employee, employee2: Employee): boolean {
    // Mock implementation - in reality would check skills/certifications
    return employee1.department === employee2.department;
  }

  private async hasLowerHoursBurden(employeeId: string, weekStarting: string): Promise<boolean> {
    // Mock implementation - would check current week's scheduled hours
    return Math.random() > 0.7; // 30% chance of having lower hours
  }

  private isSwappable(schedule: Schedule): boolean {
    // Check if shift can be swapped (not locked, not specialized, etc.)
    return !schedule.isLocked && schedule.shiftType !== 'specialized';
  }

  private async calculateSwapImpact(
    employee: Employee,
    swapEmployee: Employee,
    schedule: Schedule,
    risk: OvertimeRiskPrediction
  ): Promise<any> {
    const shiftHours = this.calculateShiftHours(schedule);
    const overtimeRate = 1.5; // 50% premium
    const baseCostSaving = shiftHours * 15 * (overtimeRate - 1); // €15 base rate
    
    return {
      overtimeSaved: shiftHours,
      costSaving: baseCostSaving,
      coverageChange: -2, // Hours difference between employees
      fairnessScore: 0.8 // Mock fairness score
    };
  }

  private scheduleToShift(schedule: Schedule): Shift {
    return {
      shiftId: `shift_${schedule.scheduleId}`,
      employeeId: schedule.employeeId,
      propertyId: schedule.propertyId || 'default',
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      shiftType: schedule.shiftType || 'regular',
      department: schedule.department || 'general',
      position: schedule.position || 'staff',
      isLocked: schedule.isLocked || false,
      createdAt: new Date()
    } as Shift;
  }

  private createSwappedShift(schedule: Schedule, newEmployeeId: string): Shift {
    const shift = this.scheduleToShift(schedule);
    shift.employeeId = newEmployeeId;
    return shift;
  }

  private formatShiftTime(schedule: Schedule): string {
    return `${schedule.date} ${schedule.startTime}-${schedule.endTime}`;
  }

  private calculateSwapConfidence(employee: Employee, swapEmployee: Employee, schedule: Schedule): number {
    // Calculate confidence based on skill match, availability, etc.
    let confidence = 0.5;
    if (employee.department === swapEmployee.department) confidence += 0.3;
    if (schedule.shiftType === 'regular') confidence += 0.2;
    return Math.min(confidence, 1.0);
  }

  private assessSwapRisks(employee: Employee, swapEmployee: Employee, schedule: Schedule): string[] {
    const risks: string[] = [];
    if (employee.department !== swapEmployee.department) {
      risks.push('Cross-department swap may require additional training');
    }
    if (schedule.shiftType === 'supervisor') {
      risks.push('Supervisory shift requires qualified replacement');
    }
    return risks;
  }

  private generateSplitOptions(schedule: Schedule): Array<{ shifts: Shift[], breakHours: number }> {
    // Generate viable split options for long shifts
    const shiftHours = this.calculateShiftHours(schedule);
    const options: Array<{ shifts: Shift[], breakHours: number }> = [];
    
    if (shiftHours >= 10) {
      // Option 1: Split into two shifts with 2-hour break
      const midPoint = this.calculateMidPoint(schedule.startTime, schedule.endTime);
      options.push({
        shifts: [
          { ...this.scheduleToShift(schedule), endTime: midPoint },
          { ...this.scheduleToShift(schedule), startTime: this.addHours(midPoint, 2) }
        ],
        breakHours: 2
      });
    }
    
    return options;
  }

  private calculateSplitImpact(originalSchedule: Schedule, splitOption: any, risk: OvertimeRiskPrediction): any {
    const hoursSaved = Math.max(0, this.calculateShiftHours(originalSchedule) - 8); // Assume 8h normal limit
    const costSaving = hoursSaved * 15 * 0.5; // €15 * 50% OT premium
    
    return {
      overtimeSaved: hoursSaved,
      costSaving,
      coverageChange: 0,
      fairnessScore: 0.9
    };
  }

  private optimizeBreakTiming(schedule: Schedule): { improvement: number, optimizedShift: Shift } {
    // Mock optimization - in reality would analyze optimal break placement
    return {
      improvement: 0.3,
      optimizedShift: this.scheduleToShift(schedule)
    };
  }

  private calculateBreakImpact(schedule: Schedule, optimizedBreaks: any, risk: OvertimeRiskPrediction): any {
    return {
      overtimeSaved: 0.5,
      costSaving: 7.5, // 0.5h * €15
      coverageChange: 0,
      fairnessScore: 0.7
    };
  }

  private isReducible(schedule: Schedule): boolean {
    return schedule.shiftType !== 'critical' && !schedule.isLocked;
  }

  private generateReductionOptions(schedule: Schedule): Array<{ reducedShift: Shift, hoursReduced: number }> {
    const options: Array<{ reducedShift: Shift, hoursReduced: number }> = [];
    const shiftHours = this.calculateShiftHours(schedule);
    
    // Option: Reduce by 1-2 hours
    for (let reduction = 1; reduction <= Math.min(2, shiftHours - 4); reduction++) {
      const reducedShift = this.scheduleToShift(schedule);
      reducedShift.endTime = this.subtractHours(schedule.endTime, reduction);
      
      options.push({
        reducedShift,
        hoursReduced: reduction
      });
    }
    
    return options;
  }

  private calculateReductionImpact(schedule: Schedule, reduction: any, risk: OvertimeRiskPrediction): any {
    const costSaving = reduction.hoursReduced * 15 * 0.5; // Assume OT savings
    
    return {
      overtimeSaved: reduction.hoursReduced,
      costSaving,
      coverageChange: -reduction.hoursReduced,
      fairnessScore: 0.6
    };
  }

  // Helper methods for time calculations
  private calculateMidPoint(startTime: string, endTime: string): string {
    // Calculate midpoint between two times
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (end < start) end.setDate(end.getDate() + 1);
    
    const midTime = new Date((start.getTime() + end.getTime()) / 2);
    return midTime.toTimeString().slice(0, 5);
  }

  private addHours(time: string, hours: number): string {
    const date = new Date(`1970-01-01T${time}`);
    date.setHours(date.getHours() + hours);
    return date.toTimeString().slice(0, 5);
  }

  private subtractHours(time: string, hours: number): string {
    const date = new Date(`1970-01-01T${time}`);
    date.setHours(date.getHours() - hours);
    return date.toTimeString().slice(0, 5);
  }
}