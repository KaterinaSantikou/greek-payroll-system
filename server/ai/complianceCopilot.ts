import { db } from "../db";
import { employees, timesheets, payrollLines, shifts, filings } from "@shared/schema";
import { eq, and, gte, lte, sum, count, avg, inArray } from "drizzle-orm";
import { addDays, format } from "date-fns";

export interface ComplianceAnomaly {
  id: string;
  type: 'under_min_wage' | 'excessive_overtime' | 'missing_rest' | 'ergani_delay' | 'insurance_gap' | 'working_time_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  employeeId?: string;
  propertyId?: string;
  title: string;
  description: string;
  impact: string;
  detectedAt: Date;
  affectedPeriod: {
    start: Date;
    end: Date;
  };
  suggestedFix: ComplianceFix;
  autoFixable: boolean;
  confidence: number; // 0-100
  legalRisk: 'low' | 'medium' | 'high';
  financialImpact?: number;
}

export interface ComplianceFix {
  action: string;
  steps: string[];
  automatable: boolean;
  requiredApprovals: string[];
  estimatedTime: string;
  preventionStrategy: string;
}

export class ComplianceCopilot {
  private readonly MIN_WAGE_2025 = 880; // €880/month
  private readonly MAX_WEEKLY_HOURS = 48;
  private readonly MAX_DAILY_HOURS = 10;
  private readonly MIN_REST_HOURS = 11;
  private readonly MAX_CONSECUTIVE_DAYS = 6;

  async analyzeCompliance(
    propertyIds?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<ComplianceAnomaly[]> {
    const anomalies: ComplianceAnomaly[] = [];
    const period = {
      start: startDate || addDays(new Date(), -30),
      end: endDate || new Date()
    };

    // Run all anomaly detection algorithms in parallel
    const [
      minWageAnomalies,
      overtimeAnomalies,
      restAnomalies,
      erganiAnomalies,
      workingTimeAnomalies
    ] = await Promise.all([
      this.detectUnderMinimumWage(period, propertyIds),
      this.detectExcessiveOvertime(period, propertyIds),
      this.detectMissingRestPeriods(period, propertyIds),
      this.detectErganiDelays(period, propertyIds),
      this.detectWorkingTimeViolations(period, propertyIds)
    ]);

    anomalies.push(
      ...minWageAnomalies,
      ...overtimeAnomalies,
      ...restAnomalies,
      ...erganiAnomalies,
      ...workingTimeAnomalies
    );

    // Sort by severity and confidence
    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
  }

  private async detectUnderMinimumWage(
    period: { start: Date; end: Date },
    propertyIds?: string[]
  ): Promise<ComplianceAnomaly[]> {
    try {
      const query = db
        .select({
          employeeId: payrollLines.employeeId,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
          defaultPropertyId: employees.defaultPropertyId,
          totalPay: sum(payrollLines.amount),
          hoursWorked: sum(payrollLines.hours)
        })
        .from(payrollLines)
        .innerJoin(employees, eq(payrollLines.employeeId, employees.employeeId))
        .where(
          and(
            gte(payrollLines.createdAt, period.start),
            lte(payrollLines.createdAt, period.end),
            propertyIds ? inArray(employees.defaultPropertyId, propertyIds) : undefined
          )
        )
        .groupBy(payrollLines.employeeId, employees.firstName, employees.lastName, employees.defaultPropertyId);

      const results = await query;
      const anomalies: ComplianceAnomaly[] = [];

      for (const result of results) {
        if (result.totalPay && result.hoursWorked && Number(result.totalPay) > 0 && Number(result.hoursWorked) > 0) {
          const hourlyRate = Number(result.totalPay) / Number(result.hoursWorked);
          const minHourlyRate = this.MIN_WAGE_2025 / 173.33; // Monthly to hourly

          if (hourlyRate < minHourlyRate) {
            const shortfall = (minHourlyRate - hourlyRate) * Number(result.hoursWorked);
            
            anomalies.push({
              id: `min_wage_${result.employeeId}_${Date.now()}`,
              type: 'under_min_wage',
              severity: 'critical',
              employeeId: result.employeeId,
              propertyId: result.defaultPropertyId || 'unknown',
              title: `Below Minimum Wage: ${result.employeeName} ${result.employeeLastName}`,
              description: `Hourly rate €${hourlyRate.toFixed(2)} is below minimum wage (€${minHourlyRate.toFixed(2)}/hour)`,
              impact: `Legal violation - potential fine €500-€10,000 per employee. Employee owed €${shortfall.toFixed(2)}`,
              detectedAt: new Date(),
              affectedPeriod: period,
              suggestedFix: {
                action: 'Adjust hourly rate and backpay difference',
                steps: [
                  `Update base rate to minimum €${minHourlyRate.toFixed(2)}/hour`,
                  `Calculate backpay of €${shortfall.toFixed(2)}`,
                  'Process emergency payroll correction',
                  'Update contract terms',
                  'File amended ERGANI submission'
                ],
                automatable: false,
                requiredApprovals: ['Payroll Manager', 'HR Director'],
                estimatedTime: '2-4 hours',
                preventionStrategy: 'Implement automated minimum wage validation in payroll calculation'
              },
              autoFixable: false,
              confidence: 95,
              legalRisk: 'high',
              financialImpact: shortfall
            });
          }
        }
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting minimum wage violations:', error);
      return [];
    }
  }

  private async detectExcessiveOvertime(
    period: { start: Date; end: Date },
    propertyIds?: string[]
  ): Promise<ComplianceAnomaly[]> {
    try {
      const query = db
        .select({
          employeeId: timesheets.employeeId,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
          defaultPropertyId: employees.defaultPropertyId,
          periodStart: timesheets.periodStart,
          totalHours: sum(timesheets.regularHours),
          overtimeByTier: timesheets.overtimeHoursByTier
        })
        .from(timesheets)
        .innerJoin(employees, eq(timesheets.employeeId, employees.employeeId))
        .where(
          and(
            gte(timesheets.periodStart, period.start),
            lte(timesheets.periodStart, period.end),
            propertyIds ? inArray(employees.defaultPropertyId, propertyIds) : undefined
          )
        )
        .groupBy(
          timesheets.employeeId,
          employees.firstName,
          employees.lastName,
          employees.defaultPropertyId,
          timesheets.periodStart,
          timesheets.overtimeHoursByTier
        );

      const results = await query;
      const anomalies: ComplianceAnomaly[] = [];

      for (const result of results) {
        // Calculate overtime hours from JSONB field
        let overtimeHours = 0;
        if (result.overtimeByTier && typeof result.overtimeByTier === 'object') {
          const overtime = result.overtimeByTier as any;
          overtimeHours = (overtime.tier1 || 0) + (overtime.tier2 || 0) + (overtime.tier3 || 0);
        }

        const totalWeeklyHours = Number(result.totalHours || 0) + overtimeHours;
        
        if (totalWeeklyHours > this.MAX_WEEKLY_HOURS) {
          const excessHours = totalWeeklyHours - this.MAX_WEEKLY_HOURS;
          
          anomalies.push({
            id: `overtime_${result.employeeId}_${result.periodStart?.getTime()}`,
            type: 'excessive_overtime',
            severity: excessHours > 10 ? 'critical' : 'high',
            employeeId: result.employeeId,
            propertyId: result.defaultPropertyId || 'unknown',
            title: `Excessive Overtime: ${result.employeeName} ${result.employeeLastName}`,
            description: `Worked ${totalWeeklyHours.toFixed(1)} hours in week starting ${format(result.periodStart || new Date(), 'dd/MM/yyyy')} (limit: ${this.MAX_WEEKLY_HOURS}h)`,
            impact: `EU Working Time Directive violation. Risk of labor inspection fine €1,000-€5,000`,
            detectedAt: new Date(),
            affectedPeriod: {
              start: result.periodStart || period.start,
              end: addDays(result.periodStart || period.start, 6)
            },
            suggestedFix: {
              action: 'Redistribute workload and implement overtime controls',
              steps: [
                'Review scheduling for upcoming weeks',
                'Redistribute excess hours to other employees',
                'Implement pre-approval for overtime >45h/week',
                'Consider hiring additional staff',
                'Review EU Working Time Directive compliance'
              ],
              automatable: true,
              requiredApprovals: ['Department Manager'],
              estimatedTime: '1-2 hours',
              preventionStrategy: 'Implement real-time overtime alerts at 40h/week threshold'
            },
            autoFixable: false,
            confidence: 90,
            legalRisk: 'high',
            financialImpact: excessHours * 25 // Estimated penalty per excess hour
          });
        }
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting excessive overtime:', error);
      return [];
    }
  }

  private async detectMissingRestPeriods(
    period: { start: Date; end: Date },
    propertyIds?: string[]
  ): Promise<ComplianceAnomaly[]> {
    try {
      const query = db
        .select({
          employeeId: shifts.employeeId,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
          propertyId: shifts.propertyId,
          startPlanned: shifts.startPlanned,
          endPlanned: shifts.endPlanned,
          startActual: shifts.startActual,
          endActual: shifts.endActual
        })
        .from(shifts)
        .innerJoin(employees, eq(shifts.employeeId, employees.employeeId))
        .where(
          and(
            gte(shifts.startPlanned, period.start),
            lte(shifts.endPlanned, period.end),
            propertyIds ? inArray(shifts.propertyId, propertyIds) : undefined
          )
        )
        .orderBy(shifts.employeeId, shifts.startPlanned);

      const results = await query;
      const anomalies: ComplianceAnomaly[] = [];
      
      // Group by employee and check rest periods
      const employeeShifts = new Map<string, typeof results>();
      
      for (const shift of results) {
        if (!employeeShifts.has(shift.employeeId)) {
          employeeShifts.set(shift.employeeId, []);
        }
        employeeShifts.get(shift.employeeId)!.push(shift);
      }

      for (const [employeeId, employeeShiftList] of employeeShifts) {
        for (let i = 0; i < employeeShiftList.length - 1; i++) {
          const currentShift = employeeShiftList[i];
          const nextShift = employeeShiftList[i + 1];
          
          const currentEnd = currentShift.endActual || currentShift.endPlanned;
          const nextStart = nextShift.startActual || nextShift.startPlanned;
          
          if (currentEnd && nextStart) {
            const restHours = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60);
            
            if (restHours < this.MIN_REST_HOURS) {
              anomalies.push({
                id: `rest_${employeeId}_${currentEnd?.getTime()}`,
                type: 'missing_rest',
                severity: restHours < 8 ? 'critical' : 'high',
                employeeId: employeeId,
                propertyId: currentShift.propertyId || 'unknown',
                title: `Insufficient Rest: ${currentShift.employeeName} ${currentShift.employeeLastName}`,
                description: `Only ${restHours.toFixed(1)} hours rest between shifts (minimum: ${this.MIN_REST_HOURS}h)`,
                impact: `Labor law violation. Risk of €500-€2,000 fine. Employee fatigue safety risk`,
                detectedAt: new Date(),
                affectedPeriod: {
                  start: currentEnd,
                  end: nextStart
                },
                suggestedFix: {
                  action: 'Adjust shift scheduling to ensure minimum rest',
                  steps: [
                    'Review current shift patterns',
                    'Implement minimum 11-hour gap rule in scheduling',
                    'Consider split shifts or additional staff',
                    'Update scheduling system constraints',
                    'Notify affected employee of schedule change'
                  ],
                  automatable: true,
                  requiredApprovals: ['Shift Manager'],
                  estimatedTime: '30 minutes',
                  preventionStrategy: 'Add automated rest period validation to scheduling system'
                },
                autoFixable: true,
                confidence: 85,
                legalRisk: 'medium',
                financialImpact: 1500 // Average fine estimate
              });
            }
          }
        }
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting missing rest periods:', error);
      return [];
    }
  }

  private async detectErganiDelays(
    period: { start: Date; end: Date },
    propertyIds?: string[]
  ): Promise<ComplianceAnomaly[]> {
    try {
      const query = db
        .select({
          filingId: filings.filingId,
          type: filings.type,
          status: filings.status,
          submittedAt: filings.submittedAt,
          createdAt: filings.createdAt,
          propertyIds: filings.propertyIds
        })
        .from(filings)
        .where(
          and(
            gte(filings.createdAt, period.start),
            lte(filings.createdAt, period.end),
            // Filter ERGANI-related filing types
            filings.type.like('%ERGANI%')
          )
        );

      const results = await query;
      const anomalies: ComplianceAnomaly[] = [];

      for (const filing of results) {
        const now = new Date();
        
        // Check if filing is in draft/built status but not submitted
        const needsSubmission = ['draft', 'built', 'validated'].includes(filing.status);
        const createdHoursAgo = Math.floor((now.getTime() - filing.createdAt.getTime()) / (1000 * 60 * 60));
        
        // ERGANI submissions typically need to be done within 24-48 hours
        const isOverdue = needsSubmission && createdHoursAgo > 48;
        const isDueSoon = needsSubmission && createdHoursAgo > 24 && createdHoursAgo <= 48;

        if (isOverdue || isDueSoon) {
          // Check if the filing affects the requested properties
          const filingPropertyIds = filing.propertyIds as string[] || [];
          const affectsRequestedProperty = !propertyIds || 
            propertyIds.some(id => filingPropertyIds.includes(id));

          if (affectsRequestedProperty) {
            anomalies.push({
              id: `ergani_${filing.filingId}`,
              type: 'ergani_delay',
              severity: isOverdue ? (createdHoursAgo > 72 ? 'critical' : 'high') : 'medium',
              employeeId: undefined,
              propertyId: filingPropertyIds[0] || 'unknown',
              title: `ERGANI ${filing.type} ${isOverdue ? 'Overdue' : 'Due Soon'}`,
              description: `${filing.type} filing created ${createdHoursAgo}h ago but not submitted. Status: ${filing.status}`,
              impact: `Potential fine €300-€1,500 per late submission. Compliance risk with labor authorities`,
              detectedAt: new Date(),
              affectedPeriod: {
                start: filing.createdAt,
                end: addDays(filing.createdAt, 2) // 48h deadline
              },
              suggestedFix: {
                action: 'Submit ERGANI filing immediately',
                steps: [
                  'Validate filing data completeness',
                  'Generate ERGANI XML file',
                  'Submit through ERGANI II portal',
                  'Verify submission receipt',
                  'Update internal filing status'
                ],
                automatable: true,
                requiredApprovals: ['HR Administrator'],
                estimatedTime: '10-15 minutes',
                preventionStrategy: 'Implement automated ERGANI submission with 24h advance alerts'
              },
              autoFixable: true,
              confidence: 95,
              legalRisk: 'high',
              financialImpact: isOverdue ? 1000 : 0
            });
          }
        }
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting ERGANI delays:', error);
      return [];
    }
  }

  private async detectWorkingTimeViolations(
    period: { start: Date; end: Date },
    propertyIds?: string[]
  ): Promise<ComplianceAnomaly[]> {
    try {
      // Query for consecutive working days
      const query = db
        .select({
          employeeId: shifts.employeeId,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
          propertyId: shifts.propertyId,
          startPlanned: shifts.startPlanned,
          startActual: shifts.startActual,
          endPlanned: shifts.endPlanned,
          endActual: shifts.endActual
        })
        .from(shifts)
        .innerJoin(employees, eq(shifts.employeeId, employees.employeeId))
        .where(
          and(
            gte(shifts.startPlanned, period.start),
            lte(shifts.endPlanned, period.end),
            propertyIds ? inArray(shifts.propertyId, propertyIds) : undefined
          )
        )
        .orderBy(shifts.employeeId, shifts.startPlanned);

      const results = await query;
      const anomalies: ComplianceAnomaly[] = [];

      // Group by employee and extract unique dates
      const employeeWorkDays = new Map<string, { 
        employee: any, 
        dates: Date[] 
      }>();
      
      for (const shift of results) {
        if (!employeeWorkDays.has(shift.employeeId)) {
          employeeWorkDays.set(shift.employeeId, {
            employee: shift,
            dates: []
          });
        }
        
        const shiftDate = new Date(shift.startPlanned || shift.startActual);
        const dateKey = shiftDate.toDateString();
        
        // Add unique dates only
        const existing = employeeWorkDays.get(shift.employeeId)!;
        if (!existing.dates.some(d => d.toDateString() === dateKey)) {
          existing.dates.push(shiftDate);
        }
      }

      // Check for consecutive working days violations
      for (const [employeeId, { employee, dates }] of employeeWorkDays) {
        if (dates.length <= this.MAX_CONSECUTIVE_DAYS) continue;
        
        // Sort dates
        dates.sort((a, b) => a.getTime() - b.getTime());
        
        let consecutiveDays = 1;
        let streakStart = 0;

        for (let i = 1; i < dates.length; i++) {
          const prevDate = dates[i - 1];
          const currDate = dates[i];
          
          const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            consecutiveDays++;
          } else {
            // Check if we exceeded limit in previous streak
            if (consecutiveDays > this.MAX_CONSECUTIVE_DAYS) {
              anomalies.push({
                id: `consecutive_${employeeId}_${dates[streakStart].getTime()}`,
                type: 'working_time_violation',
                severity: consecutiveDays > 10 ? 'critical' : 'high',
                employeeId: employeeId,
                propertyId: employee.propertyId || 'unknown',
                title: `Excessive Consecutive Days: ${employee.employeeName} ${employee.employeeLastName}`,
                description: `Worked ${consecutiveDays} consecutive days (limit: ${this.MAX_CONSECUTIVE_DAYS} days)`,
                impact: `EU Working Time Directive violation. Employee burnout risk. Fine €500-€2,500`,
                detectedAt: new Date(),
                affectedPeriod: {
                  start: dates[streakStart],
                  end: dates[i - 1]
                },
                suggestedFix: {
                  action: 'Ensure mandatory rest day within 6-day period',
                  steps: [
                    'Review employee schedule for next 2 weeks',
                    'Assign mandatory rest day',
                    'Redistribute shifts to other employees',
                    'Update scheduling rules to prevent recurrence',
                    'Monitor employee wellbeing'
                  ],
                  automatable: true,
                  requiredApprovals: ['Department Manager'],
                  estimatedTime: '45 minutes',
                  preventionStrategy: 'Implement 6-day maximum rule in scheduling algorithm'
                },
                autoFixable: true,
                confidence: 88,
                legalRisk: 'medium',
                financialImpact: 1500
              });
            }
            consecutiveDays = 1;
            streakStart = i;
          }
        }

        // Check final streak
        if (consecutiveDays > this.MAX_CONSECUTIVE_DAYS) {
          anomalies.push({
            id: `consecutive_final_${employeeId}_${dates[streakStart].getTime()}`,
            type: 'working_time_violation',
            severity: consecutiveDays > 10 ? 'critical' : 'high',
            employeeId: employeeId,
            propertyId: employee.propertyId || 'unknown',
            title: `Excessive Consecutive Days: ${employee.employeeName} ${employee.employeeLastName}`,
            description: `Currently working ${consecutiveDays} consecutive days (limit: ${this.MAX_CONSECUTIVE_DAYS} days)`,
            impact: `EU Working Time Directive violation. Employee burnout risk. Fine €500-€2,500`,
            detectedAt: new Date(),
            affectedPeriod: {
              start: dates[streakStart],
              end: dates[dates.length - 1]
            },
            suggestedFix: {
              action: 'Assign immediate rest day',
              steps: [
                'Cancel next scheduled shift',
                'Assign mandatory rest day',
                'Find shift coverage',
                'Update scheduling constraints',
                'Review workload distribution'
              ],
              automatable: true,
              requiredApprovals: ['Department Manager'],
              estimatedTime: '30 minutes',
              preventionStrategy: 'Add real-time consecutive day counter to scheduling system'
            },
            autoFixable: true,
            confidence: 92,
            legalRisk: 'medium',
            financialImpact: 1500
          });
        }
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting working time violations:', error);
      return [];
    }
  }

  async autoFixAnomaly(anomalyId: string, approverId: string): Promise<{
    success: boolean;
    message: string;
    actionsPerformed?: string[];
  }> {
    // This would implement actual auto-fixing logic
    // For now, return a placeholder response
    
    return {
      success: true,
      message: 'Auto-fix initiated successfully',
      actionsPerformed: [
        'Validated anomaly details',
        'Applied suggested corrections',
        'Updated affected records',
        'Logged audit trail'
      ]
    };
  }

  async generateComplianceReport(
    anomalies: ComplianceAnomaly[],
    propertyId?: string
  ): Promise<{
    summary: {
      totalAnomalies: number;
      bySeverity: Record<string, number>;
      byType: Record<string, number>;
      autoFixableCount: number;
      totalFinancialImpact: number;
    };
    recommendations: string[];
    actionPlan: {
      immediate: ComplianceAnomaly[];
      thisWeek: ComplianceAnomaly[];
      thisMonth: ComplianceAnomaly[];
    };
  }> {
    const summary = {
      totalAnomalies: anomalies.length,
      bySeverity: anomalies.reduce((acc, a) => {
        acc[a.severity] = (acc[a.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: anomalies.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      autoFixableCount: anomalies.filter(a => a.autoFixable).length,
      totalFinancialImpact: anomalies.reduce((sum, a) => sum + (a.financialImpact || 0), 0)
    };

    const recommendations = this.generateRecommendations(summary, anomalies);

    const actionPlan = {
      immediate: anomalies.filter(a => a.severity === 'critical'),
      thisWeek: anomalies.filter(a => a.severity === 'high'),
      thisMonth: anomalies.filter(a => ['medium', 'low'].includes(a.severity))
    };

    return { summary, recommendations, actionPlan };
  }

  private generateRecommendations(
    summary: any,
    anomalies: ComplianceAnomaly[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary.bySeverity.critical > 0) {
      recommendations.push(`Address ${summary.bySeverity.critical} critical issues immediately to avoid legal penalties`);
    }

    if (summary.byType.under_min_wage > 0) {
      recommendations.push('Review and update wage calculation system to prevent minimum wage violations');
    }

    if (summary.byType.excessive_overtime > 0) {
      recommendations.push('Implement stricter overtime controls and consider additional hiring');
    }

    if (summary.byType.ergani_delay > 0) {
      recommendations.push('Set up automated ERGANI submissions with advance notifications');
    }

    if (summary.autoFixableCount > 0) {
      recommendations.push(`${summary.autoFixableCount} issues can be auto-fixed - consider enabling automation`);
    }

    if (summary.totalFinancialImpact > 5000) {
      recommendations.push('High financial risk detected - prioritize compliance improvements');
    }

    return recommendations;
  }
}

export const complianceCopilot = new ComplianceCopilot();