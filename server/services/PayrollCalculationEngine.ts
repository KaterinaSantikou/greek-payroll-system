import { db } from "../db";
import { eq, and, gte, lte, isNotNull, desc } from "drizzle-orm";
import { 
  employeeContracts, 
  employees, 
  payrollLines, 
  premiumCalculationLines,
  constraintViolations,
  cbaStepChangeEvents,
  type EmployeeContract,
  type InsertPremiumCalculationLine,
  type InsertConstraintViolation,
  type InsertCbaStepChangeEvent
} from "../../shared/schema";
import { CbaPackService } from "./CbaPackService";

export interface PayrollCalculationContext {
  employeeId: string;
  contractId: string;
  periodId: string;
  propertyId: string;
  startDate: Date;
  endDate: Date;
  hoursWorked: Array<{
    date: Date;
    startTime: string;
    endTime: string;
    hours: number;
    breakMinutes?: number;
    shiftType?: 'normal' | 'night' | 'sunday' | 'holiday';
  }>;
}

export interface PayrollCalculationResult {
  baseWage: {
    monthlyRate: number;
    dailyRate: number;
    hourlyRate: number;
    prorationFactor: number;
    totalBasePay: number;
  };
  allowances: Array<{
    code: string;
    name: string;
    amount: number;
    taxTreatment: string;
    contributory: string;
  }>;
  premiums: Array<{
    code: string;
    name: string;
    hours: number;
    rate: number;
    amount: number;
    stackedWith?: string[];
  }>;
  constraints: {
    violations: Array<{
      type: string;
      severity: string;
      suggestedFix: string;
      details: any;
    }>;
    compliance: boolean;
  };
  totals: {
    grossPay: number;
    premiumPay: number;
    allowancePay: number;
  };
}

/**
 * Greek Payroll Calculation Engine with CBA Integration
 * 
 * Features:
 * - Base pay calculation with FTE and partial month proration
 * - CBA-compliant allowances by rule and attendance
 * - Premium stacking with hour-level breakdown
 * - Constraint violation detection and fix suggestions
 * - ERGANI-ready calculations with reason codes
 */
export class PayrollCalculationEngine {
  
  /**
   * Calculate complete payroll for an employee period
   */
  static async calculatePayroll(context: PayrollCalculationContext): Promise<PayrollCalculationResult> {
    // Get employee contract with CBA details
    const contract = await this.getEmployeeContract(context.contractId);
    if (!contract) {
      throw new Error(`Contract ${context.contractId} not found`);
    }

    // Calculate base wage with proration
    const baseWage = await this.calculateBaseWage(contract, context);
    
    // Calculate allowances based on attendance
    const allowances = await this.calculateAllowances(contract, context);
    
    // Calculate premiums with stacking support
    const premiums = await this.calculatePremiums(contract, context);
    
    // Check constraint violations
    const constraints = await this.checkConstraintViolations(contract, context);

    const totals = {
      grossPay: baseWage.totalBasePay + allowances.reduce((sum, a) => sum + a.amount, 0) + premiums.reduce((sum, p) => sum + p.amount, 0),
      premiumPay: premiums.reduce((sum, p) => sum + p.amount, 0),
      allowancePay: allowances.reduce((sum, a) => sum + a.amount, 0)
    };

    return {
      baseWage,
      allowances,
      premiums,
      constraints,
      totals
    };
  }

  /**
   * Calculate base wage with FTE and partial month proration
   */
  private static async calculateBaseWage(
    contract: EmployeeContract, 
    context: PayrollCalculationContext
  ): Promise<PayrollCalculationResult['baseWage']> {
    
    // Get wage from CBA pack
    const wageResult = await CbaPackService.calculateEffectiveWage(
      contract.propertyId || context.propertyId,
      contract.category || 'general',
      contract.grade || 'A',
      contract.seniorityStep || 0
    );

    const monthlyRate = wageResult.baseWage;
    const dailyRate = monthlyRate / 22; // Greek standard: 22 working days/month
    const hourlyRate = dailyRate / 8; // Standard 8-hour day

    // Calculate proration factors
    const periodDays = Math.ceil((context.endDate.getTime() - context.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const workingDaysInPeriod = Math.min(periodDays, 22);
    const prorationFactor = workingDaysInPeriod / 22;

    // Apply FTE if part-time
    const employee = await db.select().from(employees)
      .where(eq(employees.employeeId, context.employeeId))
      .limit(1);
    
    const fteFactor = employee[0]?.ftePct ? parseFloat(employee[0].ftePct.toString()) / 100 : 1.0;

    const totalBasePay = monthlyRate * prorationFactor * fteFactor;

    return {
      monthlyRate,
      dailyRate,
      hourlyRate,
      prorationFactor: prorationFactor * fteFactor,
      totalBasePay
    };
  }

  /**
   * Calculate allowances based on rules and attendance
   */
  private static async calculateAllowances(
    contract: EmployeeContract,
    context: PayrollCalculationContext
  ): Promise<PayrollCalculationResult['allowances']> {
    
    const allowances = await CbaPackService.getApplicableAllowances(
      contract.propertyId || context.propertyId
    );

    const results = [];

    for (const allowanceRule of allowances) {
      let amount = 0;

      switch (allowanceRule.calc) {
        case 'per_day':
          const workingDays = context.hoursWorked.length;
          amount = parseFloat(allowanceRule.amount || '0') * workingDays;
          break;
          
        case 'per_shift':
          const shifts = context.hoursWorked.length;
          amount = parseFloat(allowanceRule.amount || '0') * shifts;
          break;
          
        case 'fixed_monthly':
          amount = parseFloat(allowanceRule.amount || '0');
          break;
          
        case 'percent_base':
          const baseWage = await this.calculateBaseWage(contract, context);
          amount = baseWage.totalBasePay * (parseFloat(allowanceRule.percentage || '0') / 100);
          break;
      }

      if (amount > 0) {
        results.push({
          code: allowanceRule.code,
          name: allowanceRule.name,
          amount,
          taxTreatment: allowanceRule.taxTreatment,
          contributory: allowanceRule.contributory
        });
      }
    }

    return results;
  }

  /**
   * Calculate premiums with stacking support and hour-level breakdown
   */
  private static async calculatePremiums(
    contract: EmployeeContract,
    context: PayrollCalculationContext
  ): Promise<PayrollCalculationResult['premiums']> {
    
    const premiumRules = await CbaPackService.getApplicablePremiums(
      contract.propertyId || context.propertyId
    );

    const baseWage = await this.calculateBaseWage(contract, context);
    const hourlyRate = baseWage.hourlyRate;

    const premiumResults = [];

    // Group hours by premium eligibility
    for (const rule of premiumRules) {
      let applicableHours = 0;
      const stackedWith = [];

      for (const shift of context.hoursWorked) {
        const shiftHours = this.getApplicableHours(shift, rule);
        applicableHours += shiftHours;

        // Track stacking with other premiums
        for (const otherRule of premiumRules) {
          if (otherRule.code !== rule.code && otherRule.stackable && 
              this.getApplicableHours(shift, otherRule) > 0) {
            stackedWith.push(otherRule.code);
          }
        }
      }

      if (applicableHours > 0) {
        const premiumRate = parseFloat(rule.value) / 100; // Convert percentage to decimal
        const premiumAmount = applicableHours * hourlyRate * premiumRate;

        premiumResults.push({
          code: rule.code,
          name: rule.name,
          hours: applicableHours,
          rate: premiumRate,
          amount: premiumAmount,
          stackedWith: [...new Set(stackedWith)] // Remove duplicates
        });

        // Store detailed breakdown for audit
        await this.storePremiumCalculationLine({
          payrollLineId: null, // Will be set when payroll line is created
          employeeId: context.employeeId,
          periodId: context.periodId,
          premiumCode: rule.code,
          premiumName: rule.name,
          premiumRate: premiumRate.toString(),
          startDateTime: context.startDate,
          endDateTime: context.endDate,
          totalHours: context.hoursWorked.reduce((sum, h) => sum + h.hours, 0),
          applicableHours: applicableHours,
          baseRate: hourlyRate.toString(),
          premiumAmount: premiumAmount.toString(),
          stackedWith: stackedWith.length > 0 ? stackedWith : null
        });
      }
    }

    return premiumResults;
  }

  /**
   * Get applicable hours for a shift based on premium rule
   */
  private static getApplicableHours(
    shift: PayrollCalculationContext['hoursWorked'][0], 
    rule: any
  ): number {
    
    // Check time-based rules (night shifts)
    if (rule.bands?.start && rule.bands?.end) {
      const startHour = parseInt(rule.bands.start.split(':')[0]);
      const endHour = parseInt(rule.bands.end.split(':')[0]);
      const shiftStart = parseInt(shift.startTime.split(':')[0]);
      const shiftEnd = parseInt(shift.endTime.split(':')[0]);

      // Simple overlap calculation (can be enhanced for cross-midnight)
      if (shiftStart >= startHour || shiftEnd <= endHour) {
        return shift.hours;
      }
    }

    // Check day type rules (Sunday, Holiday)
    if (rule.appliesTo === 'holidays' && shift.shiftType === 'holiday') {
      return shift.hours;
    }
    
    if (rule.code.includes('SUNDAY') && shift.shiftType === 'sunday') {
      return shift.hours;
    }

    // Default: no applicable hours
    return 0;
  }

  /**
   * Check constraint violations and suggest fixes
   */
  private static async checkConstraintViolations(
    contract: EmployeeContract,
    context: PayrollCalculationContext
  ): Promise<PayrollCalculationResult['constraints']> {
    
    const constraints = await CbaPackService.getSchedulingConstraints(
      contract.propertyId || context.propertyId
    );

    const violations = [];

    for (const constraint of constraints) {
      // Check daily hours
      for (const shift of context.hoursWorked) {
        if (shift.hours > constraint.maxHoursDay) {
          violations.push({
            type: 'daily_hours',
            severity: 'high',
            suggestedFix: 'declare_overtime',
            details: {
              date: shift.date,
              actual: shift.hours,
              limit: constraint.maxHoursDay,
              excess: shift.hours - constraint.maxHoursDay
            }
          });
        }
      }

      // Check weekly hours
      const totalWeeklyHours = context.hoursWorked.reduce((sum, h) => sum + h.hours, 0);
      if (totalWeeklyHours > constraint.maxHoursWeekAvg) {
        violations.push({
          type: 'weekly_hours',
          severity: 'medium',
          suggestedFix: 'reschedule',
          details: {
            actual: totalWeeklyHours,
            limit: constraint.maxHoursWeekAvg,
            excess: totalWeeklyHours - constraint.maxHoursWeekAvg
          }
        });
      }

      // Check rest periods (simplified)
      for (let i = 1; i < context.hoursWorked.length; i++) {
        const prevShift = context.hoursWorked[i - 1];
        const currentShift = context.hoursWorked[i];
        
        const restHours = (currentShift.date.getTime() - prevShift.date.getTime()) / (1000 * 60 * 60);
        
        if (restHours < constraint.restMinHours) {
          violations.push({
            type: 'rest_period',
            severity: 'critical',
            suggestedFix: 'reschedule',
            details: {
              actual: restHours,
              required: constraint.restMinHours,
              shortfall: constraint.restMinHours - restHours
            }
          });
        }
      }
    }

    // Store violations for tracking
    for (const violation of violations) {
      await this.storeConstraintViolation({
        employeeId: context.employeeId,
        propertyId: context.propertyId,
        violationType: violation.type,
        constraintRule: `${violation.type}_rule`,
        violationDate: context.startDate,
        currentValue: violation.details.actual.toString(),
        requiredValue: (violation.details.limit || violation.details.required).toString(),
        severity: violation.severity,
        suggestedFix: violation.suggestedFix,
        fixDetails: violation.details,
        status: 'open'
      });
    }

    return {
      violations,
      compliance: violations.length === 0
    };
  }

  /**
   * Auto-advance seniority step on hire/anniversary
   */
  static async processStepAdvancement(
    contractId: string,
    eventType: 'hire' | 'anniversary' | 'promotion' | 'manual',
    effectiveDate: Date,
    processedBy?: string,
    notes?: string
  ): Promise<CbaStepChangeEvent | null> {
    
    const contract = await this.getEmployeeContract(contractId);
    if (!contract) return null;

    // Get current step and determine next step
    const currentStep = contract.seniorityStep || 0;
    const nextStep = currentStep + 1;

    // Calculate wages for both steps
    const currentWageResult = await CbaPackService.calculateEffectiveWage(
      contract.propertyId || '',
      contract.category || 'general',
      contract.grade || 'A',
      currentStep
    );

    const nextWageResult = await CbaPackService.calculateEffectiveWage(
      contract.propertyId || '',
      contract.category || 'general',
      contract.grade || 'A',
      nextStep
    );

    // Only advance if next step has higher wage
    if (nextWageResult.baseWage <= currentWageResult.baseWage && eventType !== 'manual') {
      return null;
    }

    // Calculate next advancement date (one year from effective date)
    const nextStepDate = new Date(effectiveDate);
    nextStepDate.setFullYear(nextStepDate.getFullYear() + 1);

    // Update contract
    await db.update(employeeContracts)
      .set({
        seniorityStep: nextStep,
        nextStepDate,
        updatedAt: new Date()
      })
      .where(eq(employeeContracts.contractId, contractId));

    // Record the step change event
    const stepChangeEvent: InsertCbaStepChangeEvent = {
      contractId,
      employeeId: contract.employeeId,
      eventType,
      fromStep: currentStep,
      toStep: nextStep,
      fromWage: currentWageResult.baseWage.toString(),
      toWage: nextWageResult.baseWage.toString(),
      effectiveDate,
      nextStepDate,
      triggeredBy: eventType === 'manual' ? 'manual' : 'auto',
      processedBy,
      notes
    };

    const result = await db.insert(cbaStepChangeEvents)
      .values(stepChangeEvent)
      .returning();

    return result[0];
  }

  // Helper methods

  private static async getEmployeeContract(contractId: string): Promise<EmployeeContract | null> {
    const result = await db.select()
      .from(employeeContracts)
      .where(eq(employeeContracts.contractId, contractId))
      .limit(1);
    
    return result[0] || null;
  }

  private static async storePremiumCalculationLine(line: InsertPremiumCalculationLine): Promise<void> {
    await db.insert(premiumCalculationLines).values(line);
  }

  private static async storeConstraintViolation(violation: InsertConstraintViolation): Promise<void> {
    await db.insert(constraintViolations).values(violation);
  }
}