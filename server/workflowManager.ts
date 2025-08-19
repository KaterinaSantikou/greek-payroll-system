/**
 * Manager & Payroll Workflows
 * 
 * Handles daily validation workflows and end-of-period processing:
 * - Exception validation and approval/rejection
 * - Overtime approval workflows
 * - ERGANI status monitoring
 * - Timesheet locking and export
 * - Reconciliation reporting
 * - Audit pack generation
 */

import { nanoid } from "nanoid";
import { storage } from "./storage";
import { erganiConnector } from "./erganiConnector";
import { payrollConnector } from "./payrollConnector";

export interface ExceptionValidation {
  exceptionId: string;
  employeeId: string;
  date: string;
  type: 'MISSING_PUNCH' | 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'BREAK_VIOLATION' | 'OVERTIME_THRESHOLD';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  validatedBy?: string;
  validatedAt?: Date;
  reason?: string;
  originalValue?: any;
  correctedValue?: any;
  notes?: string;
}

export interface OvertimeApproval {
  approvalId: string;
  employeeId: string;
  date: string;
  requestedHours: number;
  approvedHours?: number;
  earningsCode: 'OT1' | 'OT2' | 'OT3';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  reason: string;
  justification?: string;
}

export interface TimesheetLock {
  lockId: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  lockedBy: string;
  lockedAt: Date;
  totalHours: number;
  status: 'LOCKED' | 'EXPORTED' | 'RECONCILED';
  exportBatchId?: string;
}

export interface ReconciliationReport {
  reportId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  generatedAt: Date;
  generatedBy: string;
  totalHoursByCode: Record<string, number>;
  priorPeriodComparison: Record<string, number>;
  varianceByDepartment: Record<string, Record<string, number>>;
  varianceByProperty: Record<string, Record<string, number>>;
  erganiSubmissionRate: number;
  issues: Array<{
    type: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    affectedEmployees: string[];
  }>;
}

export interface AuditPack {
  auditId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  requestedBy: string;
  requestedAt: Date;
  punchLedger: any[];
  editHistory: any[];
  approvalRecords: any[];
  erganiReceipts: any[];
  status: 'GENERATING' | 'READY' | 'DOWNLOADED';
}

export class WorkflowManager {
  private exceptionValidations: Map<string, ExceptionValidation> = new Map();
  private overtimeApprovals: Map<string, OvertimeApproval> = new Map();
  private timesheetLocks: Map<string, TimesheetLock> = new Map();
  private reconciliationReports: Map<string, ReconciliationReport> = new Map();
  private auditPacks: Map<string, AuditPack> = new Map();

  /**
   * Daily Workflow: Validate exceptions
   */
  async validateExceptions(date: string, managerId: string): Promise<ExceptionValidation[]> {
    // For demo purposes, create some sample exceptions
    const validations: ExceptionValidation[] = [
      {
        exceptionId: `exc_${Date.now()}_1`,
        employeeId: 'A12345',
        date: date,
        type: 'LATE_ARRIVAL',
        status: 'PENDING',
        originalValue: { timestamp: '09:15:00', expectedTime: '09:00:00' }
      },
      {
        exceptionId: `exc_${Date.now()}_2`,
        employeeId: 'A12346',
        date: date,
        type: 'MISSING_PUNCH',
        status: 'PENDING',
        originalValue: null
      }
    ];

    for (const validation of validations) {
      this.exceptionValidations.set(validation.exceptionId, validation);
    }

    console.log(`[WORKFLOW] Generated ${validations.length} exception validations for ${date}`);
    return validations;
  }

  /**
   * Approve or reject an exception
   */
  async approveRejectException(
    exceptionId: string, 
    status: 'APPROVED' | 'REJECTED',
    managerId: string,
    reason?: string,
    correctedValue?: any
  ): Promise<void> {
    const validation = this.exceptionValidations.get(exceptionId);
    if (!validation) {
      throw new Error(`Exception validation ${exceptionId} not found`);
    }

    validation.status = status;
    validation.validatedBy = managerId;
    validation.validatedAt = new Date();
    validation.reason = reason;
    validation.correctedValue = correctedValue;

    this.exceptionValidations.set(exceptionId, validation);

    // If approved with correction, update the source data
    if (status === 'APPROVED' && correctedValue) {
      await this.applyCorrectedValue(validation);
    }

    console.log(`[WORKFLOW] Exception ${exceptionId} ${status.toLowerCase()} by ${managerId}`);
  }

  /**
   * Daily Workflow: Approve/reject overtime
   */
  async createOvertimeApproval(
    employeeId: string,
    date: string,
    requestedHours: number,
    earningsCode: 'OT1' | 'OT2' | 'OT3',
    reason: string,
    requestedBy: string
  ): Promise<OvertimeApproval> {
    const approval: OvertimeApproval = {
      approvalId: nanoid(12),
      employeeId,
      date,
      requestedHours,
      earningsCode,
      status: 'PENDING',
      requestedBy,
      requestedAt: new Date(),
      reason
    };

    this.overtimeApprovals.set(approval.approvalId, approval);
    console.log(`[WORKFLOW] Overtime approval request created: ${approval.approvalId}`);
    return approval;
  }

  async approveRejectOvertime(
    approvalId: string,
    status: 'APPROVED' | 'REJECTED',
    managerId: string,
    approvedHours?: number,
    justification?: string
  ): Promise<void> {
    const approval = this.overtimeApprovals.get(approvalId);
    if (!approval) {
      throw new Error(`Overtime approval ${approvalId} not found`);
    }

    approval.status = status;
    approval.approvedBy = managerId;
    approval.approvedAt = new Date();
    approval.approvedHours = approvedHours || approval.requestedHours;
    approval.justification = justification;

    this.overtimeApprovals.set(approvalId, approval);
    console.log(`[WORKFLOW] Overtime ${approvalId} ${status.toLowerCase()} by ${managerId}`);
  }

  /**
   * Daily Workflow: Check ERGANI status
   */
  async checkErganiStatus(date: string): Promise<{
    status: 'OK' | 'ISSUES';
    submissionRate: number;
    pendingEvents: number;
    failedEvents: number;
    quarantinedEvents: number;
  }> {
    // For demo purposes, return sample ERGANI status
    const submissionRate = 97.5;
    const status = submissionRate >= 95 ? 'OK' : 'ISSUES';

    return {
      status,
      submissionRate,
      pendingEvents: 2,
      failedEvents: 0,
      quarantinedEvents: 0
    };
  }

  /**
   * End of Period: Lock timesheets
   */
  async lockTimesheets(
    payPeriodStart: string,
    payPeriodEnd: string,
    managerId: string,
    employeeIds?: string[]
  ): Promise<TimesheetLock[]> {
    const employees = employeeIds || ['A12345', 'A12346', 'A12347']; // Sample employee IDs
    const locks: TimesheetLock[] = [];

    for (const employeeId of employees) {
      // Calculate sample total hours for the period
      const totalHours = 156 + Math.random() * 20; // Sample hours

      const lock: TimesheetLock = {
        lockId: nanoid(12),
        employeeId,
        payPeriodStart,
        payPeriodEnd,
        lockedBy: managerId,
        lockedAt: new Date(),
        totalHours,
        status: 'LOCKED'
      };

      locks.push(lock);
      this.timesheetLocks.set(lock.lockId, lock);
    }

    console.log(`[WORKFLOW] Locked ${locks.length} timesheets for period ${payPeriodStart} to ${payPeriodEnd}`);
    return locks;
  }

  /**
   * End of Period: Export to payroll
   */
  async exportToPayroll(
    payPeriodStart: string,
    payPeriodEnd: string,
    format: 'CSV' | 'XML' | 'API' = 'API'
  ): Promise<string> {
    const batch = await payrollConnector.createExportBatch(payPeriodStart, payPeriodEnd, format);
    
    // Update timesheet locks with export batch ID
    const lockArray = Array.from(this.timesheetLocks.values());
    for (const lock of lockArray) {
      if (lock.payPeriodStart === payPeriodStart && lock.payPeriodEnd === payPeriodEnd) {
        lock.exportBatchId = batch.batchId;
        lock.status = 'EXPORTED';
        this.timesheetLocks.set(lock.lockId, lock);
      }
    }

    // Submit the batch
    if (format === 'API') {
      await payrollConnector.submitBatchAPI(batch.batchId);
    }

    console.log(`[WORKFLOW] Exported payroll batch ${batch.batchId} for period ${payPeriodStart} to ${payPeriodEnd}`);
    return batch.batchId;
  }

  /**
   * End of Period: Generate reconciliation report
   */
  async generateReconciliationReport(
    payPeriodStart: string,
    payPeriodEnd: string,
    managerId: string
  ): Promise<ReconciliationReport> {
    const currentEntries = payrollConnector.getTimesheetEntries(payPeriodStart, payPeriodEnd);
    
    // Calculate prior period dates (previous month)
    const currentStart = new Date(payPeriodStart);
    const priorStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    const priorEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0);
    
    const priorEntries = payrollConnector.getTimesheetEntries(
      priorStart.toISOString().split('T')[0],
      priorEnd.toISOString().split('T')[0]
    );

    // Calculate total hours by earnings code
    const totalHoursByCode: Record<string, number> = {};
    const priorPeriodComparison: Record<string, number> = {};

    for (const entry of currentEntries) {
      totalHoursByCode[entry.earningsCode] = (totalHoursByCode[entry.earningsCode] || 0) + entry.hours;
    }

    for (const entry of priorEntries) {
      priorPeriodComparison[entry.earningsCode] = (priorPeriodComparison[entry.earningsCode] || 0) + entry.hours;
    }

    // Calculate variance by department and property
    const varianceByDepartment: Record<string, Record<string, number>> = {};
    const varianceByProperty: Record<string, Record<string, number>> = {};

    for (const entry of currentEntries) {
      const costCenter = entry.costCenterAllocations[0]?.costCenterId || 'UNKNOWN';
      const property = entry.propertyId || 'UNKNOWN';

      if (!varianceByDepartment[costCenter]) {
        varianceByDepartment[costCenter] = {};
      }
      if (!varianceByProperty[property]) {
        varianceByProperty[property] = {};
      }

      varianceByDepartment[costCenter][entry.earningsCode] = 
        (varianceByDepartment[costCenter][entry.earningsCode] || 0) + entry.hours;
      
      varianceByProperty[property][entry.earningsCode] = 
        (varianceByProperty[property][entry.earningsCode] || 0) + entry.hours;
    }

    // Get ERGANI submission rate
    const erganiStatus = await this.checkErganiStatus(payPeriodEnd);

    // Identify issues
    const issues: ReconciliationReport['issues'] = [];
    
    // Check for significant variances
    for (const [code, currentHours] of Object.entries(totalHoursByCode)) {
      const priorHours = priorPeriodComparison[code] || 0;
      const variance = priorHours > 0 ? ((currentHours - priorHours) / priorHours) * 100 : 0;
      
      if (Math.abs(variance) > 20) { // More than 20% variance
        issues.push({
          type: 'VARIANCE_ALERT',
          description: `${code} hours changed by ${variance.toFixed(1)}% from prior period`,
          severity: Math.abs(variance) > 50 ? 'HIGH' : 'MEDIUM',
          affectedEmployees: currentEntries
            .filter(entry => entry.earningsCode === code)
            .map(entry => entry.employeeGuid)
        });
      }
    }

    // Check ERGANI issues
    if (erganiStatus.status === 'ISSUES') {
      issues.push({
        type: 'ERGANI_COMPLIANCE',
        description: `ERGANI submission rate: ${erganiStatus.submissionRate.toFixed(1)}%`,
        severity: erganiStatus.submissionRate < 90 ? 'HIGH' : 'MEDIUM',
        affectedEmployees: []
      });
    }

    const report: ReconciliationReport = {
      reportId: nanoid(12),
      payPeriodStart,
      payPeriodEnd,
      generatedAt: new Date(),
      generatedBy: managerId,
      totalHoursByCode,
      priorPeriodComparison,
      varianceByDepartment,
      varianceByProperty,
      erganiSubmissionRate: erganiStatus.submissionRate,
      issues
    };

    this.reconciliationReports.set(report.reportId, report);
    console.log(`[WORKFLOW] Generated reconciliation report ${report.reportId} with ${issues.length} issues`);
    return report;
  }

  /**
   * Generate audit pack on demand
   */
  async generateAuditPack(
    payPeriodStart: string,
    payPeriodEnd: string,
    requestedBy: string
  ): Promise<AuditPack> {
    const auditPack: AuditPack = {
      auditId: nanoid(12),
      payPeriodStart,
      payPeriodEnd,
      requestedBy,
      requestedAt: new Date(),
      punchLedger: [],
      editHistory: [],
      approvalRecords: [],
      erganiReceipts: [],
      status: 'GENERATING'
    };

    this.auditPacks.set(auditPack.auditId, auditPack);

    // Generate punch ledger
    const employees = await storage.getEmployees();
    for (const employee of employees) {
      const punches = await storage.getPunchEvents(
        employee.employeeId,
        undefined,
        new Date(payPeriodStart),
        new Date(payPeriodEnd)
      );
      auditPack.punchLedger.push(...punches.map(punch => ({
        ...punch,
        employeeName: employee.name,
        auditHash: this.generateAuditHash(punch)
      })));
    }

    // Generate edit history (from exception validations)
    auditPack.editHistory = Array.from(this.exceptionValidations.values())
      .filter(validation => 
        validation.date >= payPeriodStart && 
        validation.date <= payPeriodEnd &&
        validation.status === 'APPROVED' &&
        validation.correctedValue
      )
      .map(validation => ({
        exceptionId: validation.exceptionId,
        employeeId: validation.employeeId,
        date: validation.date,
        originalValue: validation.originalValue,
        correctedValue: validation.correctedValue,
        validatedBy: validation.validatedBy,
        validatedAt: validation.validatedAt,
        reason: validation.reason
      }));

    // Generate approval records
    auditPack.approvalRecords = [
      ...Array.from(this.exceptionValidations.values())
        .filter(validation => 
          validation.date >= payPeriodStart && 
          validation.date <= payPeriodEnd
        ),
      ...Array.from(this.overtimeApprovals.values())
        .filter(approval => 
          approval.date >= payPeriodStart && 
          approval.date <= payPeriodEnd
        ),
      ...Array.from(this.timesheetLocks.values())
        .filter(lock => 
          lock.payPeriodStart === payPeriodStart && 
          lock.payPeriodEnd === payPeriodEnd
        )
    ];

    // Generate ERGANI receipts (sample data)
    auditPack.erganiReceipts = [
      {
        submissionId: `ergani_${Date.now()}_1`,
        eventType: 'PUNCH_IN',
        submittedAt: payPeriodStart,
        status: 'SUCCESS',
        receiptNumber: 'ERGII_2025_001234',
        response: { message: 'Successfully submitted to ERGANI II' }
      },
      {
        submissionId: `ergani_${Date.now()}_2`,
        eventType: 'PUNCH_OUT',
        submittedAt: payPeriodEnd,
        status: 'SUCCESS',
        receiptNumber: 'ERGII_2025_001235',
        response: { message: 'Successfully submitted to ERGANI II' }
      }
    ];

    auditPack.status = 'READY';
    this.auditPacks.set(auditPack.auditId, auditPack);

    console.log(`[WORKFLOW] Generated audit pack ${auditPack.auditId} for period ${payPeriodStart} to ${payPeriodEnd}`);
    return auditPack;
  }

  /**
   * Helper methods
   */
  private async applyCorrectedValue(validation: ExceptionValidation): Promise<void> {
    // Apply the corrected value based on exception type
    switch (validation.type) {
      case 'MISSING_PUNCH':
        // For demo purposes, log the correction
        console.log(`[WORKFLOW] Applied correction for missing punch: ${validation.exceptionId}`);
        break;
      
      case 'LATE_ARRIVAL':
      case 'EARLY_DEPARTURE':
        // For demo purposes, log the correction
        console.log(`[WORKFLOW] Applied correction for ${validation.type}: ${validation.exceptionId}`);
        break;
    }
  }

  private generateAuditHash(data: any): string {
    // Simple hash generation for audit trail
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Getters for retrieving workflow data
   */
  getExceptionValidations(date?: string): ExceptionValidation[] {
    const validations = Array.from(this.exceptionValidations.values());
    return date ? validations.filter(v => v.date === date) : validations;
  }

  getOvertimeApprovals(status?: 'PENDING' | 'APPROVED' | 'REJECTED'): OvertimeApproval[] {
    const approvals = Array.from(this.overtimeApprovals.values());
    return status ? approvals.filter(a => a.status === status) : approvals;
  }

  getTimesheetLocks(payPeriodStart?: string, payPeriodEnd?: string): TimesheetLock[] {
    const locks = Array.from(this.timesheetLocks.values());
    if (payPeriodStart && payPeriodEnd) {
      return locks.filter(l => l.payPeriodStart === payPeriodStart && l.payPeriodEnd === payPeriodEnd);
    }
    return locks;
  }

  getReconciliationReports(): ReconciliationReport[] {
    return Array.from(this.reconciliationReports.values());
  }

  getAuditPacks(): AuditPack[] {
    return Array.from(this.auditPacks.values());
  }

  /**
   * Get workflow dashboard metrics
   */
  getWorkflowMetrics() {
    const pendingExceptions = this.getExceptionValidations().filter(v => v.status === 'PENDING').length;
    const pendingOvertimeApprovals = this.getOvertimeApprovals('PENDING').length;
    const lockedTimesheets = this.getTimesheetLocks().filter(l => l.status === 'LOCKED').length;
    const exportedTimesheets = this.getTimesheetLocks().filter(l => l.status === 'EXPORTED').length;
    
    const lockTimes = Array.from(this.timesheetLocks.values()).map(l => l.lockedAt.getTime());
    const reportTimes = Array.from(this.reconciliationReports.values()).map(r => r.generatedAt.getTime());
    const allTimes = [...lockTimes, ...reportTimes].filter(time => !isNaN(time));
    
    return {
      pendingExceptions,
      pendingOvertimeApprovals,
      lockedTimesheets,
      exportedTimesheets,
      totalReconciliationReports: this.reconciliationReports.size,
      totalAuditPacks: this.auditPacks.size,
      lastActivity: allTimes.length > 0 ? Math.max(...allTimes) : Date.now()
    };
  }
}

// Global instance
export const workflowManager = new WorkflowManager();