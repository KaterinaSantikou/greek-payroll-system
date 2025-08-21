/**
 * Minor Labor Protection Service
 * 
 * Implements Greek labor law protections for workers under 18 years old
 * Based on Law 1837/1989 and related Greek labor legislation
 * 
 * Key Protections:
 * - Under 15: Generally prohibited except cultural/artistic work
 * - Ages 15-16 or in school: Max 6 hours/day, 30 hours/week
 * - Ages 16-17: Max 8 hours/day, 40 hours/week  
 * - ALL under 18: No night work (10 PM - 6 AM), no overtime, work permits required
 */

import { db } from "../db";
import { employees, shifts, complianceAlerts } from "@shared/schema";
import { eq, and, gte, lt, isNull } from "drizzle-orm";

export interface MinorWorkRestrictions {
  canWork: boolean;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  canWorkNightShifts: boolean;
  canWorkOvertime: boolean;
  requiresWorkPermit: boolean;
  prohibitedWorkTypes: string[];
  restrictionReason: string;
}

export interface ShiftValidationResult {
  isValid: boolean;
  violations: string[];
  warnings: string[];
  ageGroup: 'adult' | 'minor_16_17' | 'minor_15_16' | 'child_under_15';
}

export class MinorLaborProtectionService {
  
  /**
   * Calculate age from birth date
   */
  private calculateAge(birthDate: Date | string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Determine if a shift occurs during night hours (10 PM - 6 AM)
   */
  private isNightShift(startTime: Date, endTime: Date): boolean {
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    
    // Night work is 22:00 (10 PM) to 06:00 (6 AM)
    return (
      startHour >= 22 || startHour < 6 || // Starts during night hours
      endHour >= 22 || endHour < 6 ||     // Ends during night hours
      (startHour < endHour && (startHour < 6 || endHour > 22)) // Spans night hours
    );
  }

  /**
   * Get work restrictions for a given age based on Greek labor law
   */
  getWorkRestrictions(age: number): MinorWorkRestrictions {
    if (age < 15) {
      return {
        canWork: false,
        maxHoursPerDay: 0,
        maxHoursPerWeek: 0,
        canWorkNightShifts: false,
        canWorkOvertime: false,
        requiresWorkPermit: false,
        prohibitedWorkTypes: ['all'],
        restrictionReason: 'Under 15 - employment generally prohibited except cultural/artistic activities (Law 1837/1989)'
      };
    }

    if (age >= 15 && age < 16) {
      return {
        canWork: true,
        maxHoursPerDay: 6,
        maxHoursPerWeek: 30,
        canWorkNightShifts: false,
        canWorkOvertime: false,
        requiresWorkPermit: true,
        prohibitedWorkTypes: ['dangerous', 'heavy_manual', 'underground', 'high_temperature', 'hazardous_substances'],
        restrictionReason: 'Ages 15-16 - Restricted hours and prohibited from dangerous work (Law 1837/1989)'
      };
    }

    if (age >= 16 && age < 18) {
      return {
        canWork: true,
        maxHoursPerDay: 8,
        maxHoursPerWeek: 40,
        canWorkNightShifts: false,
        canWorkOvertime: false,
        requiresWorkPermit: true,
        prohibitedWorkTypes: ['dangerous', 'heavy_manual', 'underground', 'high_temperature', 'hazardous_substances'],
        restrictionReason: 'Ages 16-17 - No night work or overtime, work permit required (Law 1837/1989)'
      };
    }

    // 18 and over - full adult rights
    return {
      canWork: true,
      maxHoursPerDay: 8, // Standard working day
      maxHoursPerWeek: 40, // Standard working week
      canWorkNightShifts: true,
      canWorkOvertime: true,
      requiresWorkPermit: false,
      prohibitedWorkTypes: [],
      restrictionReason: 'Adult - Full labor rights (18+ years old)'
    };
  }

  /**
   * Validate if an employee can work a specific shift
   */
  async validateShiftForEmployee(employeeId: string, startTime: Date, endTime: Date, shiftDurationHours: number): Promise<ShiftValidationResult> {
    // Get employee data including birth date
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId));

    if (!employee) {
      return {
        isValid: false,
        violations: ['Employee not found'],
        warnings: [],
        ageGroup: 'adult'
      };
    }

    if (!employee.birthDate) {
      return {
        isValid: true,
        violations: [],
        warnings: ['Employee birth date not set - cannot verify age-based restrictions'],
        ageGroup: 'adult'
      };
    }

    const age = this.calculateAge(employee.birthDate);
    const restrictions = this.getWorkRestrictions(age);
    const violations: string[] = [];
    const warnings: string[] = [];
    
    let ageGroup: 'adult' | 'minor_16_17' | 'minor_15_16' | 'child_under_15' = 'adult';
    if (age < 15) ageGroup = 'child_under_15';
    else if (age >= 15 && age < 16) ageGroup = 'minor_15_16';
    else if (age >= 16 && age < 18) ageGroup = 'minor_16_17';

    // Check if work is allowed at all
    if (!restrictions.canWork) {
      violations.push(`Employee is ${age} years old - employment prohibited by Greek law (Law 1837/1989)`);
      return { isValid: false, violations, warnings, ageGroup };
    }

    // Check daily hour limits
    if (shiftDurationHours > restrictions.maxHoursPerDay) {
      violations.push(`Shift duration (${shiftDurationHours} hours) exceeds maximum daily limit (${restrictions.maxHoursPerDay} hours) for age ${age}`);
    }

    // Check night work restrictions
    if (!restrictions.canWorkNightShifts && this.isNightShift(startTime, endTime)) {
      violations.push(`Night work (10 PM - 6 AM) prohibited for minors under 18 - employee is ${age} years old`);
    }

    // Check work permit requirements
    if (restrictions.requiresWorkPermit) {
      if (!employee.workPermitNumber) {
        violations.push(`Work permit required for employee aged ${age} but not on file (Law 1837/1989)`);
      } else if (employee.workPermitExpiresAt && new Date() > new Date(employee.workPermitExpiresAt)) {
        violations.push(`Work permit has expired - renewal required for continued employment`);
      } else {
        warnings.push(`Work permit on file: ${employee.workPermitNumber}`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      ageGroup
    };
  }

  /**
   * Check weekly hours for a minor employee
   */
  async validateWeeklyHours(employeeId: string, weekStart: Date, proposedAdditionalHours: number): Promise<{ isValid: boolean; violations: string[]; currentWeeklyHours: number }> {
    const [employee] = await db.select()
      .from(employees)
      .where(eq(employees.employeeId, employeeId));

    if (!employee?.birthDate) {
      return { isValid: true, violations: [], currentWeeklyHours: 0 };
    }

    const age = this.calculateAge(employee.birthDate);
    const restrictions = this.getWorkRestrictions(age);

    if (age >= 18) {
      return { isValid: true, violations: [], currentWeeklyHours: 0 };
    }

    // Calculate week end date
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get existing shifts for the week
    const existingShifts = await db.select()
      .from(shifts)
      .where(
        and(
          eq(shifts.employeeId, employeeId),
          gte(shifts.startPlanned, weekStart),
          lt(shifts.startPlanned, weekEnd)
        )
      );

    // Calculate current weekly hours
    let currentWeeklyHours = 0;
    for (const shift of existingShifts) {
      const duration = (new Date(shift.endPlanned).getTime() - new Date(shift.startPlanned).getTime()) / (1000 * 60 * 60);
      currentWeeklyHours += duration;
    }

    const totalProposedHours = currentWeeklyHours + proposedAdditionalHours;
    const violations: string[] = [];

    if (totalProposedHours > restrictions.maxHoursPerWeek) {
      violations.push(`Total weekly hours (${totalProposedHours.toFixed(1)}) would exceed maximum limit (${restrictions.maxHoursPerWeek} hours) for age ${age}`);
    }

    return {
      isValid: violations.length === 0,
      violations,
      currentWeeklyHours
    };
  }

  /**
   * Create compliance alert for minor labor law violation
   */
  async createMinorLaborAlert(employeeId: string, violation: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'HIGH'): Promise<void> {
    await db.insert(complianceAlerts).values({
      type: 'MINOR_LABOR_VIOLATION',
      severity,
      employeeId,
      message: `Minor Labor Law Violation: ${violation}`,
      details: {
        category: 'minor_labor_protection',
        legalBasis: 'Law 1837/1989 - Protection of Minors at Work',
        violation,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get all employees who are minors (under 18)
   */
  async getMinorEmployees(): Promise<Array<{ employee: any; age: number; restrictions: MinorWorkRestrictions }>> {
    const allEmployees = await db.select()
      .from(employees)
      .where(isNull(employees.termDate)); // Only active employees

    const minors = [];
    for (const employee of allEmployees) {
      if (employee.birthDate) {
        const age = this.calculateAge(employee.birthDate);
        if (age < 18) {
          const restrictions = this.getWorkRestrictions(age);
          minors.push({ employee, age, restrictions });
        }
      }
    }

    return minors;
  }

  /**
   * Audit all scheduled shifts for minor compliance
   */
  async auditMinorShifts(startDate: Date, endDate: Date): Promise<Array<{ shiftId: string; employeeId: string; violations: string[]; age: number }>> {
    const violations = [];
    
    // Get all shifts in the date range
    const shiftsToAudit = await db.select()
      .from(shifts)
      .where(
        and(
          gte(shifts.startPlanned, startDate),
          lt(shifts.startPlanned, endDate)
        )
      );

    for (const shift of shiftsToAudit) {
      const duration = (new Date(shift.endPlanned).getTime() - new Date(shift.startPlanned).getTime()) / (1000 * 60 * 60);
      const validation = await this.validateShiftForEmployee(
        shift.employeeId,
        new Date(shift.startPlanned),
        new Date(shift.endPlanned),
        duration
      );

      if (!validation.isValid) {
        const [employee] = await db.select()
          .from(employees)
          .where(eq(employees.employeeId, shift.employeeId));
        
        const age = employee?.birthDate ? this.calculateAge(employee.birthDate) : 0;
        
        violations.push({
          shiftId: shift.shiftId,
          employeeId: shift.employeeId,
          violations: validation.violations,
          age
        });
      }
    }

    return violations;
  }
}

export const minorLaborProtectionService = new MinorLaborProtectionService();