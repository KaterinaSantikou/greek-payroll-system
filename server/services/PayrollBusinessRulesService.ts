import { db } from "../db";
import { 
  employees,
  contracts,
  shifts,
  timesheets,
  payrollScopes,
  employeePeriodState,
  payrollScopeLines,
  type Employee
} from "@shared/schema";
import { eq, and, inArray, sql, ne } from "drizzle-orm";
import { capTrackingService } from "./CapTrackingService";
import { disbursementKeyService } from "./DisbursementKeyService";

export interface EligibilityValidation {
  isEligible: boolean;
  violations: Array<{
    employeeId: string;
    employeeName: string;
    violation: string;
    details: string;
  }>;
  eligibleEmployees: string[];
  ineligibleEmployees: string[];
}

export interface TimesheetApprovalFilter {
  employeeId: string;
  approvedHours: number;
  unapprovedHours: number;
  totalHours: number;
  shouldIncludeUnapproved: boolean;
  effectiveHours: number; // Hours that will be processed
}

export interface ScopeBusinessRules {
  canCreateScope: boolean;
  eligibilityCheck: EligibilityValidation;
  timesheetFilters: TimesheetApprovalFilter[];
  capWarnings: Array<{
    employeeId: string;
    capType: string;
    warningMessage: string;
  }>;
  terminalValidation: {
    hasTerminalEmployees: boolean;
    terminalEmployees: string[];
    requiredScopeType: 'regular' | 'termination';
  };
}

export class PayrollBusinessRulesService {
  
  /**
   * Validate employees are in same legal entity and pay calendar
   */
  async validateSameLegalEntityAndCalendar(employeeIds: string[]): Promise<EligibilityValidation> {
    const employeeData = await db
      .select({
        employeeId: employees.employeeId,
        employeeName: employees.name,
        defaultPropertyId: employees.defaultPropertyId // Use property as entity
      })
      .from(employees)
      .where(inArray(employees.employeeId, employeeIds));

    const violations = [];
    const eligibleEmployees = [];
    const ineligibleEmployees = [];

    // Group by property (acting as legal entity)
    const entityGroups = new Map<string, any[]>();
    
    for (const emp of employeeData) {
      const key = emp.defaultPropertyId || 'unknown';
      if (!entityGroups.has(key)) {
        entityGroups.set(key, []);
      }
      entityGroups.get(key)!.push(emp);
    }

    // Find the dominant group (largest)
    let dominantGroup = '';
    let dominantSize = 0;
    for (const [key, group] of entityGroups) {
      if (group.length > dominantSize) {
        dominantGroup = key;
        dominantSize = group.length;
      }
    }

    // Check violations - for now, simplified validation
    for (const emp of employeeData) {
      const empKey = emp.defaultPropertyId || 'unknown';
      
      if (empKey !== dominantGroup) {
        violations.push({
          employeeId: emp.employeeId,
          employeeName: emp.employeeName || 'Unknown',
          violation: 'DIFFERENT_PROPERTY',
          details: `Employee belongs to property '${empKey}', but majority belongs to '${dominantGroup}'`
        });
        ineligibleEmployees.push(emp.employeeId);
      } else {
        eligibleEmployees.push(emp.employeeId);
      }
    }

    return {
      isEligible: violations.length === 0,
      violations,
      eligibleEmployees,
      ineligibleEmployees
    };
  }

  /**
   * Filter timesheets based on approval status
   */
  async getTimesheetApprovalFilters(
    employeeIds: string[],
    period: string,
    requireApproved: boolean = false
  ): Promise<TimesheetApprovalFilter[]> {
    const filters: TimesheetApprovalFilter[] = [];

    for (const employeeId of employeeIds) {
      // Get timesheet data for employee in period
      const timesheetData = await db
        .select({
          approvedHours: sql<number>`COALESCE(SUM(CASE WHEN 'approved' THEN ${timesheets.totalHours} ELSE 0 END), 0)`,
          unapprovedHours: sql<number>`COALESCE(SUM(CASE WHEN 'pending' THEN ${timesheets.totalHours} ELSE 0 END), 0)`,
          totalHours: sql<number>`COALESCE(SUM(${timesheets.totalHours}), 0)`
        })
        .from(timesheets)
        .where(and(
          eq(timesheets.employeeId, employeeId),
          eq(timesheets.payrollPeriod, period)
        ));

      const data = timesheetData[0] || { approvedHours: 0, unapprovedHours: 0, totalHours: 0 };
      
      // Determine effective hours based on approval requirements
      let effectiveHours = data.totalHours;
      if (requireApproved) {
        effectiveHours = data.approvedHours;
      }

      filters.push({
        employeeId,
        approvedHours: data.approvedHours,
        unapprovedHours: data.unapprovedHours,
        totalHours: data.totalHours,
        shouldIncludeUnapproved: !requireApproved,
        effectiveHours
      });
    }

    return filters;
  }

  /**
   * Check for employees requiring termination scope
   */
  async checkTerminationRequirements(
    employeeIds: string[],
    period: string
  ): Promise<{
    hasTerminalEmployees: boolean;
    terminalEmployees: Array<{
      employeeId: string;
      terminationDate: string;
      terminationType: string;
      requiresFinalPay: boolean;
    }>;
  }> {
    const terminalEmployees = [];

    for (const employeeId of employeeIds) {
      // Check if employee has termination in this period
      const terminationInfo = await db
        .select({
          terminationDate: contracts.contractEndDate,
          terminationType: sql<string>`'resignation'`, // Simplified for now
          contractId: contracts.contractId
        })
        .from(contracts)
        .where(and(
          eq(contracts.employeeId, employeeId),
          sql`${contracts.contractEndDate} IS NOT NULL`,
          sql`${contracts.contractEndDate} >= '${period}-01' AND ${contracts.contractEndDate} < '${period}-31'`
        ))
        .limit(1);

      if (terminationInfo.length > 0) {
        const termInfo = terminationInfo[0];
        terminalEmployees.push({
          employeeId,
          terminationDate: termInfo.terminationDate || '',
          terminationType: termInfo.terminationType,
          requiresFinalPay: true
        });
      }
    }

    return {
      hasTerminalEmployees: terminalEmployees.length > 0,
      terminalEmployees
    };
  }

  /**
   * Validate multiple scopes for same employee (adjustment detection)
   */
  async detectAdjustmentScenarios(
    employeeIds: string[],
    period: string,
    excludeScopeId?: string
  ): Promise<Array<{
    employeeId: string;
    existingScopes: Array<{
      scopeId: string;
      status: string;
      netAmount: string;
      processedAt: string;
    }>;
    isAdjustment: boolean;
    adjustmentReason: string;
  }>> {
    const adjustmentScenarios = [];

    for (const employeeId of employeeIds) {
      // Find existing scopes for this employee in the period
      const existingScopes = await db
        .select({
          scopeId: payrollScopes.scopeId,
          status: payrollScopes.status,
          processedAt: payrollScopes.createdAt,
          netAmount: sql<string>`COALESCE(
            (SELECT SUM(amount) FROM payroll_scope_lines 
             WHERE scope_id = ${payrollScopes.scopeId} 
             AND employee_id = ${employeeId}
             AND code = 'NET_PAY'), '0.00')`
        })
        .from(payrollScopes)
        .leftJoin(employeePeriodState, and(
          eq(employeePeriodState.employeeId, employeeId),
          eq(employeePeriodState.period, period)
        ))
        .where(and(
          eq(payrollScopes.period, period),
          sql`EXISTS (
            SELECT 1 FROM employee_period_state eps 
            WHERE eps.employee_id = ${employeeId} 
            AND eps.period = ${period}
            AND (eps.processed_in_scope_id = ${payrollScopes.scopeId} 
                 OR eps.adjusted_in_scope_id = ${payrollScopes.scopeId})
          )`,
          excludeScopeId ? ne(payrollScopes.scopeId, excludeScopeId) : sql`1=1`
        ));

      const isAdjustment = existingScopes.length > 0;
      let adjustmentReason = '';

      if (isAdjustment) {
        const finalizedScopes = existingScopes.filter(s => s.status === 'finalized');
        if (finalizedScopes.length > 0) {
          adjustmentReason = 'Employee already processed in finalized scope - this will be treated as adjustment/retro';
        } else {
          adjustmentReason = 'Employee has draft/computed scope - consider consolidating or superseding';
        }
      }

      adjustmentScenarios.push({
        employeeId,
        existingScopes,
        isAdjustment,
        adjustmentReason
      });
    }

    return adjustmentScenarios;
  }

  /**
   * Comprehensive business rules validation for scope creation
   */
  async validateScopeCreation(
    employeeIds: string[],
    period: string,
    scopeType: 'regular' | 'termination' = 'regular',
    requireApprovedTimesheets: boolean = false
  ): Promise<ScopeBusinessRules> {
    // Run all validations in parallel
    const [
      eligibilityCheck,
      timesheetFilters,
      terminationCheck,
      adjustmentScenarios,
      capWarnings
    ] = await Promise.all([
      this.validateSameLegalEntityAndCalendar(employeeIds),
      this.getTimesheetApprovalFilters(employeeIds, period, requireApprovedTimesheets),
      this.checkTerminationRequirements(employeeIds, period),
      this.detectAdjustmentScenarios(employeeIds, period),
      this.getCapWarnings(employeeIds, period)
    ]);

    // Determine if scope can be created
    const canCreateScope = eligibilityCheck.isEligible && 
                          timesheetFilters.every(f => f.effectiveHours > 0);

    // Validate scope type matches employee requirements
    const terminalValidation = {
      hasTerminalEmployees: terminationCheck.hasTerminalEmployees,
      terminalEmployees: terminationCheck.terminalEmployees.map(t => t.employeeId),
      requiredScopeType: (terminationCheck.hasTerminalEmployees ? 'termination' : 'regular') as 'regular' | 'termination'
    };

    return {
      canCreateScope,
      eligibilityCheck,
      timesheetFilters,
      capWarnings,
      terminalValidation
    };
  }

  /**
   * Get cap warnings for employees approaching limits
   */
  private async getCapWarnings(
    employeeIds: string[],
    period: string
  ): Promise<Array<{
    employeeId: string;
    capType: string;
    warningMessage: string;
  }>> {
    const warnings = await capTrackingService.getEmployeesNearingCaps(period, 80); // 80% threshold
    
    return warnings
      .filter(w => employeeIds.includes(w.employeeId))
      .map(w => ({
        employeeId: w.employeeId,
        capType: w.capType,
        warningMessage: `${w.capType} cap is ${w.usedPercent}% consumed (€${w.remainingAmount.toFixed(2)} remaining)`
      }));
  }

  /**
   * Validate payment batch creation with disbursement keys
   */
  async validatePaymentBatchCreation(
    scopeIds: string[],
    period: string
  ): Promise<{
    canCreateBatch: boolean;
    duplicatePayments: Array<{
      employeeId: string;
      conflictingScopeId: string;
      disbursementKey: string;
    }>;
    validScopes: string[];
  }> {
    const validationResult = await disbursementKeyService.bulkValidateScopes(scopeIds, period);

    return {
      canCreateBatch: validationResult.duplicateConflicts.length === 0,
      duplicatePayments: validationResult.duplicateConflicts.map(dc => ({
        employeeId: dc.employeeId,
        conflictingScopeId: dc.conflictWithScopeId,
        disbursementKey: dc.disbursementKey
      })),
      validScopes: validationResult.validScopes
    };
  }

  /**
   * Check if period can be consolidated (no draft/computed scopes)
   */
  async validatePeriodConsolidation(period: string): Promise<{
    canConsolidate: boolean;
    blockingScopes: Array<{
      scopeId: string;
      status: string;
      employeeCount: number;
    }>;
  }> {
    const blockingScopes = await db
      .select({
        scopeId: payrollScopes.scopeId,
        status: payrollScopes.status,
        employeeCount: payrollScopes.employeeCount
      })
      .from(payrollScopes)
      .where(and(
        eq(payrollScopes.period, period),
        inArray(payrollScopes.status, ['draft', 'computed'])
      ));

    return {
      canConsolidate: blockingScopes.length === 0,
      blockingScopes
    };
  }

  /**
   * Generate business rules summary for audit trail
   */
  generateBusinessRulesSummary(validation: ScopeBusinessRules): string {
    const summary = [];
    
    summary.push(`Eligibility: ${validation.eligibilityCheck.isEligible ? 'PASSED' : 'FAILED'}`);
    
    if (!validation.eligibilityCheck.isEligible) {
      summary.push(`Violations: ${validation.eligibilityCheck.violations.length}`);
    }
    
    summary.push(`Timesheet Filters: ${validation.timesheetFilters.length} employees`);
    
    const totalApproved = validation.timesheetFilters.reduce((sum, f) => sum + f.approvedHours, 0);
    const totalUnapproved = validation.timesheetFilters.reduce((sum, f) => sum + f.unapprovedHours, 0);
    summary.push(`Hours: ${totalApproved.toFixed(1)} approved, ${totalUnapproved.toFixed(1)} unapproved`);
    
    if (validation.capWarnings.length > 0) {
      summary.push(`Cap Warnings: ${validation.capWarnings.length}`);
    }
    
    if (validation.terminalValidation.hasTerminalEmployees) {
      summary.push(`Terminal Employees: ${validation.terminalValidation.terminalEmployees.length}`);
    }
    
    return summary.join(' | ');
  }
}

export const payrollBusinessRulesService = new PayrollBusinessRulesService();