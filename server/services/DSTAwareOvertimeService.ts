/**
 * DST-Aware Overtime Service - Enhanced overtime calculations with timezone transition handling
 */

import { DSTTransitionService, ShiftCalculationResult } from './DSTTransitionService';
import { addHours, differenceInMinutes, format, parseISO, startOfDay, endOfDay } from 'date-fns';

export interface OvertimeCalculationResult {
  regularHours: number;
  overtimeHours: number;
  nightShiftHours: number;
  sundayHours: number;
  holidayHours: number;
  dstAdjustment: number;
  premiumCalculations: Array<{
    type: 'overtime' | 'night' | 'sunday' | 'holiday' | 'dst_compensation';
    hours: number;
    rate: number;
    amount: number;
    description: string;
  }>;
  totalGrossPay: number;
  dstWarnings: string[];
  complianceIssues: string[];
}

export interface ShiftPeriod {
  start: Date;
  end: Date;
  employeeId: string;
  shiftType: 'regular' | 'night' | 'split' | 'extended';
  scheduledHours: number;
  breakMinutes: number;
  hourlyRate: number;
  contractType: string;
}

export interface GreekLaborLimits {
  maxDailyHours: number;
  maxWeeklyHours: number;
  maxOvertimeDaily: number;
  maxOvertimeWeekly: number;
  maxOvertimeAnnual: number;
  nightShiftStart: string;
  nightShiftEnd: string;
  sundayPremiumRate: number;
  overtimePremiumRate: number;
  nightShiftPremiumRate: number;
  holidayPremiumRate: number;
}

export class DSTAwareOvertimeService {
  private dstService = new DSTTransitionService();
  
  private readonly GREEK_LIMITS: GreekLaborLimits = {
    maxDailyHours: 8,
    maxWeeklyHours: 40,
    maxOvertimeDaily: 2,
    maxOvertimeWeekly: 8,
    maxOvertimeAnnual: 150,
    nightShiftStart: '22:00',
    nightShiftEnd: '06:00',
    sundayPremiumRate: 0.75,
    overtimePremiumRate: 0.25,
    nightShiftPremiumRate: 0.25,
    holidayPremiumRate: 1.00
  };

  /**
   * Calculate DST-aware overtime for a single shift
   */
  async calculateShiftOvertime(
    shiftPeriod: ShiftPeriod,
    isHoliday: boolean = false,
    isSunday: boolean = false
  ): Promise<OvertimeCalculationResult> {
    
    // Get DST-aware working time calculation
    const dstCalculation = this.dstService.calculateDSTAwareWorkingTime(
      shiftPeriod.start,
      shiftPeriod.end
    );

    const result: OvertimeCalculationResult = {
      regularHours: 0,
      overtimeHours: 0,
      nightShiftHours: 0,
      sundayHours: 0,
      holidayHours: 0,
      dstAdjustment: dstCalculation.dstAdjustment / 60, // Convert to hours
      premiumCalculations: [],
      totalGrossPay: 0,
      dstWarnings: dstCalculation.warnings,
      complianceIssues: []
    };

    // Calculate actual worked hours accounting for DST
    const actualWorkedMinutes = dstCalculation.actualWorkedMinutes - shiftPeriod.breakMinutes;
    const actualWorkedHours = actualWorkedMinutes / 60;

    // Separate regular and overtime hours
    const regularHoursLimit = this.GREEK_LIMITS.maxDailyHours;
    result.regularHours = Math.min(actualWorkedHours, regularHoursLimit);
    result.overtimeHours = Math.max(0, actualWorkedHours - regularHoursLimit);

    // Calculate night shift hours
    const nightShiftMinutes = dstCalculation.nightShiftPremiums.reduce(
      (total, premium) => total + premium.minutes, 0
    );
    result.nightShiftHours = nightShiftMinutes / 60;

    // Handle Sunday and holiday hours
    if (isSunday) {
      result.sundayHours = actualWorkedHours;
    }
    if (isHoliday) {
      result.holidayHours = actualWorkedHours;
    }

    // Calculate premium payments
    await this.calculatePremiums(result, shiftPeriod, dstCalculation);

    // Check compliance issues
    result.complianceIssues = this.checkComplianceIssues(result, shiftPeriod);

    // Calculate total gross pay
    result.totalGrossPay = this.calculateTotalGrossPay(result, shiftPeriod);

    return result;
  }

  /**
   * Calculate weekly overtime with DST awareness
   */
  async calculateWeeklyOvertime(
    shifts: ShiftPeriod[],
    weekStart: Date,
    holidays: Date[] = []
  ): Promise<{
    dailyResults: Array<OvertimeCalculationResult & { date: Date; shiftId: string }>;
    weeklyTotals: {
      totalRegularHours: number;
      totalOvertimeHours: number;
      totalNightHours: number;
      totalSundayHours: number;
      totalHolidayHours: number;
      weeklyComplianceIssues: string[];
      totalGrossPay: number;
      dstImpactHours: number;
    };
    complianceStatus: 'compliant' | 'warning' | 'violation';
  }> {
    
    const dailyResults = [];
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalNightHours = 0;
    let totalSundayHours = 0;
    let totalHolidayHours = 0;
    let totalGrossPay = 0;
    let dstImpactHours = 0;

    // Process each shift
    for (const shift of shifts) {
      const isHoliday = holidays.some(holiday => 
        this.isSameDay(holiday, shift.start)
      );
      const isSunday = shift.start.getDay() === 0;

      const shiftResult = await this.calculateShiftOvertime(shift, isHoliday, isSunday);
      
      dailyResults.push({
        ...shiftResult,
        date: shift.start,
        shiftId: shift.employeeId + '_' + shift.start.getTime()
      });

      // Accumulate weekly totals
      totalRegularHours += shiftResult.regularHours;
      totalOvertimeHours += shiftResult.overtimeHours;
      totalNightHours += shiftResult.nightShiftHours;
      totalSundayHours += shiftResult.sundayHours;
      totalHolidayHours += shiftResult.holidayHours;
      totalGrossPay += shiftResult.totalGrossPay;
      dstImpactHours += Math.abs(shiftResult.dstAdjustment);
    }

    // Check weekly compliance
    const weeklyComplianceIssues = [];
    if (totalRegularHours + totalOvertimeHours > this.GREEK_LIMITS.maxWeeklyHours) {
      weeklyComplianceIssues.push(
        `Weekly hours exceed limit: ${totalRegularHours + totalOvertimeHours} > ${this.GREEK_LIMITS.maxWeeklyHours}`
      );
    }
    if (totalOvertimeHours > this.GREEK_LIMITS.maxOvertimeWeekly) {
      weeklyComplianceIssues.push(
        `Weekly overtime exceeds limit: ${totalOvertimeHours} > ${this.GREEK_LIMITS.maxOvertimeWeekly}`
      );
    }

    // Determine compliance status
    let complianceStatus: 'compliant' | 'warning' | 'violation' = 'compliant';
    const hasViolations = dailyResults.some(result => 
      result.complianceIssues.some(issue => issue.includes('violation'))
    );
    const hasWarnings = weeklyComplianceIssues.length > 0 || 
      dailyResults.some(result => result.complianceIssues.length > 0);

    if (hasViolations) {
      complianceStatus = 'violation';
    } else if (hasWarnings) {
      complianceStatus = 'warning';
    }

    return {
      dailyResults,
      weeklyTotals: {
        totalRegularHours,
        totalOvertimeHours,
        totalNightHours,
        totalSundayHours,
        totalHolidayHours,
        weeklyComplianceIssues,
        totalGrossPay,
        dstImpactHours
      },
      complianceStatus
    };
  }

  /**
   * Handle DST compensation rules per Greek labor law
   */
  calculateDSTCompensation(
    dstAdjustment: number,
    hourlyRate: number,
    shiftType: string
  ): {
    compensationType: 'paid_not_worked' | 'worked_not_paid' | 'no_adjustment';
    compensationAmount: number;
    description: string;
  } {
    if (dstAdjustment === 0) {
      return {
        compensationType: 'no_adjustment',
        compensationAmount: 0,
        description: 'No DST adjustment needed'
      };
    }

    if (dstAdjustment < 0) {
      // Spring forward - worker loses time but gets paid for scheduled hours
      return {
        compensationType: 'paid_not_worked',
        compensationAmount: Math.abs(dstAdjustment) * hourlyRate,
        description: 'Paid for scheduled hours despite DST time loss (Greek Labor Law compliance)'
      };
    } else {
      // Fall back - worker works extra time and gets paid for it
      return {
        compensationType: 'worked_not_paid',
        compensationAmount: dstAdjustment * hourlyRate,
        description: 'Additional payment for extra hour worked during DST fall back'
      };
    }
  }

  /**
   * Generate DST-aware schedule recommendations
   */
  generateDSTScheduleRecommendations(
    plannedShifts: ShiftPeriod[],
    year: number
  ): Array<{
    shiftId: string;
    originalShift: ShiftPeriod;
    recommendation: string;
    adjustedStart?: Date;
    adjustedEnd?: Date;
    payrollImpact: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const recommendations = [];
    const dstTransitions = this.dstService.getDSTTransitions(year);

    for (const shift of plannedShifts) {
      const shiftId = `${shift.employeeId}_${shift.start.getTime()}`;
      
      // Check if shift is affected by DST transitions
      for (const transition of dstTransitions) {
        if (this.shiftAffectedByDST(shift, transition)) {
          const recommendation = this.generateShiftRecommendation(shift, transition);
          recommendations.push({
            shiftId,
            originalShift: shift,
            ...recommendation
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Validate DST-aware payroll calculations
   */
  validateDSTPayrollCalculations(
    payrollPeriod: { start: Date; end: Date },
    shifts: ShiftPeriod[]
  ): {
    isValid: boolean;
    validationErrors: string[];
    dstImpactSummary: {
      affectedShifts: number;
      totalDSTAdjustmentHours: number;
      compensationAmount: number;
    };
    recommendations: string[];
  } {
    const validationErrors = [];
    const recommendations = [];
    let affectedShifts = 0;
    let totalDSTAdjustmentHours = 0;
    let compensationAmount = 0;

    // Get DST transitions for the payroll period
    const startYear = payrollPeriod.start.getFullYear();
    const endYear = payrollPeriod.end.getFullYear();
    const allTransitions = [];
    
    for (let year = startYear; year <= endYear; year++) {
      allTransitions.push(...this.dstService.getDSTTransitions(year));
    }

    const relevantTransitions = allTransitions.filter(transition =>
      transition.date >= payrollPeriod.start && transition.date <= payrollPeriod.end
    );

    if (relevantTransitions.length === 0) {
      return {
        isValid: true,
        validationErrors: [],
        dstImpactSummary: { affectedShifts: 0, totalDSTAdjustmentHours: 0, compensationAmount: 0 },
        recommendations: ['No DST transitions in payroll period - standard calculations apply']
      };
    }

    // Validate each shift that might be affected by DST
    for (const shift of shifts) {
      for (const transition of relevantTransitions) {
        if (this.shiftAffectedByDST(shift, transition)) {
          affectedShifts++;
          
          const dstCalculation = this.dstService.calculateDSTAwareWorkingTime(
            shift.start,
            shift.end
          );

          totalDSTAdjustmentHours += Math.abs(dstCalculation.dstAdjustment / 60);
          
          const compensation = this.calculateDSTCompensation(
            dstCalculation.dstAdjustment / 60,
            shift.hourlyRate,
            shift.shiftType
          );
          
          compensationAmount += compensation.compensationAmount;

          // Validate specific DST rules
          if (transition.type === 'spring_forward' && dstCalculation.dstAdjustment !== -60) {
            validationErrors.push(
              `Shift ${shift.employeeId} on ${format(shift.start, 'yyyy-MM-dd')}: Expected -60 minute DST adjustment, got ${dstCalculation.dstAdjustment}`
            );
          }

          if (transition.type === 'fall_back' && dstCalculation.dstAdjustment !== 60) {
            validationErrors.push(
              `Shift ${shift.employeeId} on ${format(shift.start, 'yyyy-MM-dd')}: Expected +60 minute DST adjustment, got ${dstCalculation.dstAdjustment}`
            );
          }
        }
      }
    }

    // Generate recommendations
    if (affectedShifts > 0) {
      recommendations.push(
        `${affectedShifts} shifts affected by DST transitions - verify payroll calculations include proper compensation`
      );
      recommendations.push(
        `Total DST compensation amount: €${compensationAmount.toFixed(2)}`
      );
    }

    if (validationErrors.length > 0) {
      recommendations.push('Review and correct DST calculation errors before finalizing payroll');
    }

    return {
      isValid: validationErrors.length === 0,
      validationErrors,
      dstImpactSummary: {
        affectedShifts,
        totalDSTAdjustmentHours,
        compensationAmount
      },
      recommendations
    };
  }

  /**
   * Private helper methods
   */
  private async calculatePremiums(
    result: OvertimeCalculationResult,
    shiftPeriod: ShiftPeriod,
    dstCalculation: ShiftCalculationResult
  ): Promise<void> {
    
    // Regular time payment
    if (result.regularHours > 0) {
      result.premiumCalculations.push({
        type: 'overtime',
        hours: result.regularHours,
        rate: 1.0,
        amount: result.regularHours * shiftPeriod.hourlyRate,
        description: 'Regular working hours'
      });
    }

    // Overtime premium
    if (result.overtimeHours > 0) {
      result.premiumCalculations.push({
        type: 'overtime',
        hours: result.overtimeHours,
        rate: 1 + this.GREEK_LIMITS.overtimePremiumRate,
        amount: result.overtimeHours * shiftPeriod.hourlyRate * (1 + this.GREEK_LIMITS.overtimePremiumRate),
        description: `Overtime premium at ${this.GREEK_LIMITS.overtimePremiumRate * 100}%`
      });
    }

    // Night shift premium
    if (result.nightShiftHours > 0) {
      result.premiumCalculations.push({
        type: 'night',
        hours: result.nightShiftHours,
        rate: this.GREEK_LIMITS.nightShiftPremiumRate,
        amount: result.nightShiftHours * shiftPeriod.hourlyRate * this.GREEK_LIMITS.nightShiftPremiumRate,
        description: `Night shift premium (${this.GREEK_LIMITS.nightShiftStart}-${this.GREEK_LIMITS.nightShiftEnd})`
      });
    }

    // Sunday premium
    if (result.sundayHours > 0) {
      result.premiumCalculations.push({
        type: 'sunday',
        hours: result.sundayHours,
        rate: this.GREEK_LIMITS.sundayPremiumRate,
        amount: result.sundayHours * shiftPeriod.hourlyRate * this.GREEK_LIMITS.sundayPremiumRate,
        description: `Sunday work premium at ${this.GREEK_LIMITS.sundayPremiumRate * 100}%`
      });
    }

    // Holiday premium
    if (result.holidayHours > 0) {
      result.premiumCalculations.push({
        type: 'holiday',
        hours: result.holidayHours,
        rate: this.GREEK_LIMITS.holidayPremiumRate,
        amount: result.holidayHours * shiftPeriod.hourlyRate * this.GREEK_LIMITS.holidayPremiumRate,
        description: `Holiday work premium at ${this.GREEK_LIMITS.holidayPremiumRate * 100}%`
      });
    }

    // DST compensation
    if (result.dstAdjustment !== 0) {
      const compensation = this.calculateDSTCompensation(
        result.dstAdjustment,
        shiftPeriod.hourlyRate,
        shiftPeriod.shiftType
      );

      result.premiumCalculations.push({
        type: 'dst_compensation',
        hours: Math.abs(result.dstAdjustment),
        rate: 1.0,
        amount: compensation.compensationAmount,
        description: compensation.description
      });
    }
  }

  private checkComplianceIssues(
    result: OvertimeCalculationResult,
    shiftPeriod: ShiftPeriod
  ): string[] {
    const issues = [];

    // Check daily overtime limits
    if (result.overtimeHours > this.GREEK_LIMITS.maxOvertimeDaily) {
      issues.push(
        `VIOLATION: Daily overtime exceeds legal limit: ${result.overtimeHours} > ${this.GREEK_LIMITS.maxOvertimeDaily} hours`
      );
    }

    // Check total daily hours
    const totalDailyHours = result.regularHours + result.overtimeHours;
    if (totalDailyHours > this.GREEK_LIMITS.maxDailyHours + this.GREEK_LIMITS.maxOvertimeDaily) {
      issues.push(
        `VIOLATION: Total daily hours exceed legal limit: ${totalDailyHours} > ${this.GREEK_LIMITS.maxDailyHours + this.GREEK_LIMITS.maxOvertimeDaily} hours`
      );
    }

    // Check night shift regulations
    if (result.nightShiftHours > 8) {
      issues.push(
        `WARNING: Night shift hours exceed recommended limit: ${result.nightShiftHours} > 8 hours`
      );
    }

    return issues;
  }

  private calculateTotalGrossPay(
    result: OvertimeCalculationResult,
    shiftPeriod: ShiftPeriod
  ): number {
    return result.premiumCalculations.reduce((total, premium) => total + premium.amount, 0);
  }

  private shiftAffectedByDST(shift: ShiftPeriod, transition: any): boolean {
    return (shift.start <= transition.date && shift.end >= transition.date) ||
           this.isSameDay(shift.start, transition.date) ||
           this.isSameDay(shift.end, transition.date);
  }

  private generateShiftRecommendation(shift: ShiftPeriod, transition: any): {
    recommendation: string;
    adjustedStart?: Date;
    adjustedEnd?: Date;
    payrollImpact: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  } {
    if (transition.type === 'spring_forward') {
      return {
        recommendation: 'Shift spans DST spring forward transition. Clock jumps from 03:00 to 04:00.',
        payrollImpact: 'Worker paid for scheduled hours despite working 1 hour less due to DST',
        priority: 'high'
      };
    } else {
      return {
        recommendation: 'Shift spans DST fall back transition. Clock repeats 03:00-04:00 hour.',
        payrollImpact: 'Worker works extra hour and receives additional payment',
        priority: 'high'
      };
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}

export const dstAwareOvertimeService = new DSTAwareOvertimeService();