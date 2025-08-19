import { storage } from "./storage";
import type { PunchEvent, Employee } from "@shared/schema";

// Simplified types for Exception Auto-Resolution system
export interface ExceptionType {
  type: 'missed_punch' | 'duplicate_punch' | 'wrong_location' | 'timing_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

export interface ResolutionAction {
  actionId: string;
  type: 'auto_fix' | 'request_employee_input' | 'escalate_manager' | 'merge_punches';
  description: string;
  affectedPunches: string[];
  proposedFix: {
    action: string;
    details: any;
  };
  confidence: number;
  requiresApproval: boolean;
  approvalLevel: 'employee' | 'manager' | 'hr';
  slaMinutes: number;
}

export interface ExceptionSummary {
  exceptionId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  exceptionType: ExceptionType;
  affectedPunches: PunchEvent[];
  resolutionAction: ResolutionAction;
  status: 'detected' | 'pending_approval' | 'resolved' | 'escalated';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface DailyExceptionReport {
  propertyId: string;
  date: string;
  totalExceptions: number;
  autoResolved: number;
  pendingApproval: number;
  escalated: number;
  exceptions: ExceptionSummary[];
}

export class ExceptionAutoResolutionEngine {
  private readonly CONFIDENCE_THRESHOLDS = {
    AUTO_APPLY: 0.95,
    MANAGER_REVIEW: 0.80,
    EMPLOYEE_CONFIRM: 0.60,
    ESCALATE: 0.40
  };

  private readonly SLA_MINUTES = {
    low: 480,      // 8 hours
    medium: 240,   // 4 hours
    high: 120,     // 2 hours
    critical: 60   // 1 hour
  };

  /**
   * Analyze punch events for exceptions and generate resolution actions
   */
  async analyzeDailyExceptions(
    propertyId: string,
    date: string
  ): Promise<DailyExceptionReport> {
    try {
      const employees = await storage.getEmployeesByProperty(propertyId);
      const exceptions: ExceptionSummary[] = [];

      for (const employee of employees) {
        const punches = await storage.getPunchEventsByEmployeeAndDate(employee.employeeId, date);
        
        if (punches.length === 0) continue;

        const employeeExceptions = await this.analyzeEmployeePunches(employee, punches, date);
        exceptions.push(...employeeExceptions);
      }

      // Calculate summary statistics
      const autoResolved = exceptions.filter(e => 
        e.resolutionAction.confidence >= this.CONFIDENCE_THRESHOLDS.AUTO_APPLY && 
        !e.resolutionAction.requiresApproval
      ).length;
      
      const pendingApproval = exceptions.filter(e => 
        e.status === 'pending_approval'
      ).length;
      
      const escalated = exceptions.filter(e => 
        e.status === 'escalated'
      ).length;

      return {
        propertyId,
        date,
        totalExceptions: exceptions.length,
        autoResolved,
        pendingApproval,
        escalated,
        exceptions: exceptions.sort((a, b) => {
          const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          return severityOrder[b.exceptionType.severity] - severityOrder[a.exceptionType.severity];
        })
      };

    } catch (error) {
      console.error("Error analyzing daily exceptions:", error);
      return {
        propertyId,
        date,
        totalExceptions: 0,
        autoResolved: 0,
        pendingApproval: 0,
        escalated: 0,
        exceptions: []
      };
    }
  }

  /**
   * Process resolution actions and apply where appropriate
   */
  async processResolutionActions(
    propertyId: string,
    date: string
  ): Promise<{
    processed: number;
    autoApplied: number;
    sentForApproval: number;
    escalated: number;
  }> {
    try {
      const report = await this.analyzeDailyExceptions(propertyId, date);
      let autoApplied = 0;
      let sentForApproval = 0;
      let escalated = 0;

      for (const exception of report.exceptions) {
        const result = await this.processException(exception);
        
        switch (result.action) {
          case 'auto_applied':
            autoApplied++;
            break;
          case 'sent_for_approval':
            sentForApproval++;
            break;
          case 'escalated':
            escalated++;
            break;
        }
      }

      return {
        processed: report.exceptions.length,
        autoApplied,
        sentForApproval,
        escalated
      };

    } catch (error) {
      console.error("Error processing resolution actions:", error);
      return {
        processed: 0,
        autoApplied: 0,
        sentForApproval: 0,
        escalated: 0
      };
    }
  }

  private async analyzeEmployeePunches(
    employee: Employee,
    punches: PunchEvent[],
    date: string
  ): Promise<ExceptionSummary[]> {
    const exceptions: ExceptionSummary[] = [];

    // Sort punches chronologically
    const sortedPunches = punches.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Detect missed punches
    const missedPunchExceptions = this.detectMissedPunches(sortedPunches);
    exceptions.push(...missedPunchExceptions.map(ex => 
      this.createExceptionSummary(employee, ex, date, sortedPunches)
    ));

    // Detect duplicate punches
    const duplicateExceptions = this.detectDuplicatePunches(sortedPunches);
    exceptions.push(...duplicateExceptions.map(ex => 
      this.createExceptionSummary(employee, ex, date, sortedPunches)
    ));

    // Detect timing anomalies
    const timingExceptions = await this.detectTimingAnomalies(sortedPunches, employee);
    exceptions.push(...timingExceptions.map(ex => 
      this.createExceptionSummary(employee, ex, date, sortedPunches)
    ));

    return exceptions;
  }

  private detectMissedPunches(punches: PunchEvent[]): ExceptionType[] {
    const exceptions: ExceptionType[] = [];
    
    // Check for unmatched clock-ins/clock-outs
    const clockIns = punches.filter(p => p.type === 'clock_in');
    const clockOuts = punches.filter(p => p.type === 'clock_out');

    if (clockIns.length !== clockOuts.length) {
      exceptions.push({
        type: 'missed_punch',
        severity: clockIns.length === 0 || clockOuts.length === 0 ? 'high' : 'medium',
        confidence: 0.9
      });
    }

    return exceptions;
  }

  private detectDuplicatePunches(punches: PunchEvent[]): ExceptionType[] {
    const exceptions: ExceptionType[] = [];
    const duplicates: Map<string, PunchEvent[]> = new Map();

    // Group punches by type and time window (within 5 minutes)
    for (const punch of punches) {
      const timeWindow = Math.floor(new Date(punch.timestamp).getTime() / (5 * 60 * 1000));
      const key = `${punch.type}_${timeWindow}`;
      
      if (!duplicates.has(key)) {
        duplicates.set(key, []);
      }
      duplicates.get(key)!.push(punch);
    }

    // Find groups with multiple punches
    for (const [, punchGroup] of duplicates) {
      if (punchGroup.length > 1) {
        exceptions.push({
          type: 'duplicate_punch',
          severity: 'medium',
          confidence: 0.95
        });
      }
    }

    return exceptions;
  }

  private async detectTimingAnomalies(
    punches: PunchEvent[],
    employee: Employee
  ): Promise<ExceptionType[]> {
    const exceptions: ExceptionType[] = [];
    
    // Get employee's typical punch patterns
    const patterns = await this.getEmployeePunchPatterns(employee.employeeId);
    
    for (const punch of punches) {
      const anomaly = this.checkTimingAnomaly(punch, patterns);
      if (anomaly.isAnomaly) {
        exceptions.push({
          type: 'timing_anomaly',
          severity: anomaly.severity,
          confidence: anomaly.confidence
        });
      }
    }

    return exceptions;
  }

  private createExceptionSummary(
    employee: Employee,
    exceptionType: ExceptionType,
    date: string,
    punches: PunchEvent[]
  ): ExceptionSummary {
    const exceptionId = `exc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const resolutionAction = this.generateResolutionAction(exceptionType, punches);
    
    // Determine status based on confidence and approval requirements
    let status: 'detected' | 'pending_approval' | 'resolved' | 'escalated';
    
    if (resolutionAction.confidence >= this.CONFIDENCE_THRESHOLDS.AUTO_APPLY && 
        !resolutionAction.requiresApproval) {
      status = 'resolved';
    } else if (resolutionAction.confidence >= this.CONFIDENCE_THRESHOLDS.EMPLOYEE_CONFIRM) {
      status = 'pending_approval';
    } else {
      status = 'escalated';
    }

    return {
      exceptionId,
      employeeId: employee.employeeId,
      employeeName: employee.name,
      date,
      exceptionType,
      affectedPunches: punches,
      resolutionAction,
      status,
      createdAt: new Date()
    };
  }

  private generateResolutionAction(
    exceptionType: ExceptionType,
    punches: PunchEvent[]
  ): ResolutionAction {
    const actionId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    switch (exceptionType.type) {
      case 'missed_punch':
        return {
          actionId,
          type: 'request_employee_input',
          description: 'Ask employee to confirm missing punch details',
          affectedPunches: punches.map(p => p.eventId),
          proposedFix: {
            action: 'add_missing_punch',
            details: { estimatedTime: 'based_on_schedule' }
          },
          confidence: 0.7,
          requiresApproval: true,
          approvalLevel: 'employee',
          slaMinutes: this.SLA_MINUTES[exceptionType.severity]
        };

      case 'duplicate_punch':
        return {
          actionId,
          type: 'merge_punches',
          description: 'Remove duplicate punches, keep the most accurate entry',
          affectedPunches: punches.map(p => p.eventId),
          proposedFix: {
            action: 'remove_duplicates',
            details: { keepBest: true }
          },
          confidence: 0.95,
          requiresApproval: false,
          approvalLevel: 'manager',
          slaMinutes: this.SLA_MINUTES[exceptionType.severity]
        };

      case 'timing_anomaly':
        return {
          actionId,
          type: 'request_employee_input',
          description: 'Request explanation for unusual timing',
          affectedPunches: punches.map(p => p.eventId),
          proposedFix: {
            action: 'verify_timing',
            details: { requireExplanation: true }
          },
          confidence: 0.6,
          requiresApproval: true,
          approvalLevel: 'employee',
          slaMinutes: this.SLA_MINUTES[exceptionType.severity]
        };

      default:
        return {
          actionId,
          type: 'escalate_manager',
          description: 'Escalate complex exception for manual review',
          affectedPunches: punches.map(p => p.eventId),
          proposedFix: {
            action: 'manual_review',
            details: { requiresHumanReview: true }
          },
          confidence: 0.3,
          requiresApproval: true,
          approvalLevel: 'manager',
          slaMinutes: this.SLA_MINUTES.critical
        };
    }
  }

  private async processException(
    exception: ExceptionSummary
  ): Promise<{ action: 'auto_applied' | 'sent_for_approval' | 'escalated'; details?: any }> {
    const { resolutionAction } = exception;

    try {
      if (resolutionAction.confidence >= this.CONFIDENCE_THRESHOLDS.AUTO_APPLY && 
          !resolutionAction.requiresApproval) {
        // Auto-apply the resolution
        await this.applyResolution(resolutionAction);
        
        return {
          action: 'auto_applied',
          details: { resolutionId: resolutionAction.actionId }
        };
        
      } else if (resolutionAction.confidence >= this.CONFIDENCE_THRESHOLDS.EMPLOYEE_CONFIRM) {
        // Send for approval
        await this.sendForApproval(exception);
        
        return {
          action: 'sent_for_approval',
          details: { approvalLevel: resolutionAction.approvalLevel }
        };
        
      } else {
        // Escalate to higher authority
        await this.escalateException(exception);
        
        return {
          action: 'escalated',
          details: { reason: 'low_confidence' }
        };
      }
      
    } catch (error) {
      console.error(`Error processing exception ${exception.exceptionId}:`, error);
      
      return {
        action: 'escalated',
        details: { reason: 'processing_error', error: error.message }
      };
    }
  }

  private async getEmployeePunchPatterns(employeeId: string): Promise<{
    averageClockIn: string;
    averageClockOut: string;
    variance: number;
  }> {
    // This would analyze historical punch data in a real implementation
    // For now, return reasonable defaults
    return {
      averageClockIn: '08:30',
      averageClockOut: '17:30',
      variance: 15 // minutes
    };
  }

  private checkTimingAnomaly(
    punch: PunchEvent,
    patterns: { averageClockIn: string; averageClockOut: string; variance: number }
  ): { isAnomaly: boolean; confidence: number; severity: 'low' | 'medium' | 'high' | 'critical' } {
    const punchTime = new Date(punch.timestamp);
    const punchHour = punchTime.getHours();
    const punchMinute = punchTime.getMinutes();
    
    let expectedTime: string;
    if (punch.type === 'clock_in') {
      expectedTime = patterns.averageClockIn;
    } else {
      expectedTime = patterns.averageClockOut;
    }
    
    const [expectedHour, expectedMinute] = expectedTime.split(':').map(Number);
    const expectedTotalMinutes = expectedHour * 60 + expectedMinute;
    const actualTotalMinutes = punchHour * 60 + punchMinute;
    
    const deviationMinutes = Math.abs(actualTotalMinutes - expectedTotalMinutes);
    
    let severity: 'low' | 'medium' | 'high' | 'critical';
    let confidence: number;
    
    if (deviationMinutes <= patterns.variance) {
      return { isAnomaly: false, confidence: 0, severity: 'low' };
    } else if (deviationMinutes <= patterns.variance * 2) {
      severity = 'low';
      confidence = 0.5;
    } else if (deviationMinutes <= patterns.variance * 4) {
      severity = 'medium';
      confidence = 0.7;
    } else if (deviationMinutes <= patterns.variance * 8) {
      severity = 'high';
      confidence = 0.8;
    } else {
      severity = 'critical';
      confidence = 0.9;
    }
    
    return { isAnomaly: true, confidence, severity };
  }

  private async applyResolution(action: ResolutionAction): Promise<void> {
    // In a real implementation, this would:
    // 1. Apply the proposed fix to the punch records
    // 2. Create audit trail entries
    // 3. Send notifications
    
    console.log(`Auto-applied resolution: ${action.description}`);
    
    // Create audit trail
    const auditEntry = {
      actionId: action.actionId,
      appliedAt: new Date().toISOString(),
      appliedBy: 'system',
      originalPunches: action.affectedPunches,
      appliedFix: action.proposedFix
    };
    
    // Store audit entry (in real implementation)
    console.log('Audit trail created:', auditEntry);
  }

  private async sendForApproval(exception: ExceptionSummary): Promise<void> {
    // Send notification to appropriate approver
    console.log(`Sent exception ${exception.exceptionId} for ${exception.resolutionAction.approvalLevel} approval`);
    
    // In real implementation:
    // - Send email/Slack notification
    // - Create approval workflow entry
    // - Set SLA timer
  }

  private async escalateException(exception: ExceptionSummary): Promise<void> {
    // Escalate to higher authority
    console.log(`Escalated exception ${exception.exceptionId} for manual review`);
    
    // In real implementation:
    // - Send to HR/admin queue
    // - Create escalation ticket
    // - Send priority notifications
  }
}

// Export singleton instance
export const exceptionAutoResolutionEngine = new ExceptionAutoResolutionEngine();