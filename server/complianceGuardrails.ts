/**
 * Greek Compliance Guardrails System
 *
 * Features:
 * - Real-time ERGANI II event push with receipts
 * - Configurable max hours & rest periods with alerts
 * - Digital card policy enforcement (no payroll deductions)
 * - Data retention aligned with statutory requirements
 * - Immutable audit logging with hash chaining
 */

import { db } from './db';
import { erganiConnector } from './erganiConnector';
import {
  punchEvents,
  employees,
  timesheets,
  type PunchEvent,
} from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Compliance Configuration
export interface ComplianceConfig {
  maxDailyHours: number;
  maxWeeklyHours: number;
  minRestBetweenShifts: number; // minutes
  maxContinuousWork: number; // minutes
  alertThresholds: {
    approachingMaxHours: number; // percentage (0.8 = 80%)
    longShift: number; // hours
    noBreak: number; // hours
  };
  dataRetention: {
    punchEvents: number; // years
    timesheets: number; // years
    auditLogs: number; // years
  };
  erganiConfig: {
    realTimeSubmission: boolean;
    maxRetryAttempts: number;
    batchSize: number;
  };
}

// Default Greek Compliance Configuration
export const GREEK_COMPLIANCE_CONFIG: ComplianceConfig = {
  maxDailyHours: 8,
  maxWeeklyHours: 40,
  minRestBetweenShifts: 11 * 60, // 11 hours in minutes
  maxContinuousWork: 6 * 60, // 6 hours without break
  alertThresholds: {
    approachingMaxHours: 0.85, // Alert at 85% of max hours
    longShift: 10, // Alert for shifts over 10 hours
    noBreak: 6, // Alert if no break after 6 hours
  },
  dataRetention: {
    punchEvents: 20, // Greek law requires 20 years for time records
    timesheets: 50, // Payroll records kept for 50 years
    auditLogs: 20, // Audit logs for compliance inspection
  },
  erganiConfig: {
    realTimeSubmission: true,
    maxRetryAttempts: 3,
    batchSize: 50,
  },
};

// Compliance Alert Types
export interface ComplianceAlert {
  alertId: string;
  type:
    | 'MAX_HOURS_APPROACHING'
    | 'REST_PERIOD_VIOLATION'
    | 'CONTINUOUS_WORK_VIOLATION'
    | 'ERGANI_SUBMISSION_FAILED'
    | 'POLICY_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  employeeId: string;
  propertyId?: string;
  message: string;
  details: any;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Immutable Audit Log Entry
export interface AuditLogEntry {
  logId: string;
  timestamp: Date;
  eventType: string;
  entityType: string;
  entityId: string;
  userId?: string;
  changes: any;
  ipAddress?: string;
  userAgent?: string;
  hashChain: string; // Hash of previous log entry for tamper detection
  signature: string; // Digital signature of this entry
}

// Digital Work Card Policy
export interface DigitalCardPolicy {
  noPayrollDeductions: boolean;
  salaryProtection: boolean;
  reasonablePunchRequirements: boolean;
  alternativeMethodsAllowed: boolean;
}

export const DIGITAL_CARD_POLICY: DigitalCardPolicy = {
  noPayrollDeductions: true, // Cannot deduct pay due to digital card issues
  salaryProtection: true, // Salary protected during transition
  reasonablePunchRequirements: true, // Reasonable punch requirements only
  alternativeMethodsAllowed: true, // Manual entry allowed if card fails
};

export class ComplianceGuardrailsSystem {
  private config: ComplianceConfig;
  private auditLogChain: string[] = [];
  private alerts: ComplianceAlert[] = [];

  constructor(config: ComplianceConfig = GREEK_COMPLIANCE_CONFIG) {
    this.config = config;
    this.initializeAuditChain();
  }

  /**
   * Process punch event with real-time compliance checking
   */
  async processPunchEvent(event: PunchEvent): Promise<{
    processed: boolean;
    alerts: ComplianceAlert[];
    erganiSubmitted: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];
    const alerts: ComplianceAlert[] = [];
    let erganiSubmitted = false;

    try {
      // 1. Check working time compliance
      const workingTimeViolations =
        await this.checkWorkingTimeCompliance(event);
      violations.push(...workingTimeViolations);

      // 2. Check rest period compliance
      const restViolations = await this.checkRestPeriodCompliance(event);
      violations.push(...restViolations);

      // 3. Generate alerts for approaching limits
      const approachingLimitAlerts = await this.checkApproachingLimits(event);
      alerts.push(...approachingLimitAlerts);

      // 4. Submit to ERGANI II if configured for real-time
      if (this.config.erganiConfig.realTimeSubmission) {
        try {
          const erganiEvent = await this.convertToErganiEvent(event);
          const result = await erganiConnector.submitEvent(erganiEvent);
          erganiSubmitted =
            result.status === 'SUCCESS' || result.status === 'PENDING';

          if (!erganiSubmitted) {
            alerts.push({
              alertId: nanoid(),
              type: 'ERGANI_SUBMISSION_FAILED',
              severity: 'HIGH',
              employeeId: event.employeeId,
              propertyId: event.propertyId,
              message: 'Failed to submit punch event to ERGANI II',
              details: { eventId: event.eventId, result },
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error('ERGANI submission error:', error);
          alerts.push({
            alertId: nanoid(),
            type: 'ERGANI_SUBMISSION_FAILED',
            severity: 'CRITICAL',
            employeeId: event.employeeId,
            propertyId: event.propertyId,
            message: 'ERGANI II submission system error',
            details: { error: (error as Error).message },
            createdAt: new Date(),
          });
        }
      }

      // 5. Create immutable audit log entry
      await this.createAuditLogEntry({
        eventType: 'PUNCH_EVENT_PROCESSED',
        entityType: 'punch_event',
        entityId: event.eventId,
        changes: {
          event,
          violations,
          alerts: alerts.length,
          erganiSubmitted,
        },
      });

      // 6. Store alerts
      this.alerts.push(...alerts);

      return {
        processed: true,
        alerts,
        erganiSubmitted,
        violations,
      };
    } catch (error) {
      console.error('Error processing punch event:', error);
      return {
        processed: false,
        alerts: [],
        erganiSubmitted: false,
        violations: ['SYSTEM_ERROR'],
      };
    }
  }

  /**
   * Check working time compliance (max daily/weekly hours)
   */
  private async checkWorkingTimeCompliance(
    event: PunchEvent
  ): Promise<string[]> {
    const violations: string[] = [];

    if (event.type === 'out') {
      // Get today's total hours
      const todayStart = new Date(event.timestamp);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const todayEvents = await db
        .select()
        .from(punchEvents)
        .where(
          and(
            eq(punchEvents.employeeId, event.employeeId),
            gte(punchEvents.timestamp, todayStart),
            lte(punchEvents.timestamp, todayEnd)
          )
        )
        .orderBy(punchEvents.timestamp);

      const dailyHours = this.calculateDailyHours(todayEvents);

      if (dailyHours > this.config.maxDailyHours) {
        violations.push(
          `DAILY_HOURS_EXCEEDED: ${dailyHours} hours (max: ${this.config.maxDailyHours})`
        );
      }

      // Check weekly hours
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekEvents = await db
        .select()
        .from(punchEvents)
        .where(
          and(
            eq(punchEvents.employeeId, event.employeeId),
            gte(punchEvents.timestamp, weekStart),
            lte(punchEvents.timestamp, weekEnd)
          )
        )
        .orderBy(punchEvents.timestamp);

      const weeklyHours = this.calculateWeeklyHours(weekEvents);

      if (weeklyHours > this.config.maxWeeklyHours) {
        violations.push(
          `WEEKLY_HOURS_EXCEEDED: ${weeklyHours} hours (max: ${this.config.maxWeeklyHours})`
        );
      }
    }

    return violations;
  }

  /**
   * Check rest period compliance (minimum rest between shifts)
   */
  private async checkRestPeriodCompliance(
    event: PunchEvent
  ): Promise<string[]> {
    const violations: string[] = [];

    if (event.type === 'in') {
      // Get the last 'out' event for this employee
      const lastOutEvent = await db
        .select()
        .from(punchEvents)
        .where(
          and(
            eq(punchEvents.employeeId, event.employeeId),
            eq(punchEvents.type, 'out')
          )
        )
        .orderBy(desc(punchEvents.timestamp))
        .limit(1);

      if (lastOutEvent.length > 0) {
        const lastOut = new Date(lastOutEvent[0].timestamp);
        const currentIn = new Date(event.timestamp);
        const restMinutes =
          (currentIn.getTime() - lastOut.getTime()) / (1000 * 60);

        if (restMinutes < this.config.minRestBetweenShifts) {
          violations.push(
            `REST_PERIOD_VIOLATION: ${Math.round(restMinutes)} minutes rest ` +
              `(minimum: ${this.config.minRestBetweenShifts} minutes)`
          );
        }
      }
    }

    return violations;
  }

  /**
   * Check for approaching limits and generate alerts
   */
  private async checkApproachingLimits(
    event: PunchEvent
  ): Promise<ComplianceAlert[]> {
    const alerts: ComplianceAlert[] = [];

    if (event.type === 'in' || event.type === 'out') {
      // Check daily hours approaching limit
      const todayStart = new Date(event.timestamp);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const todayEvents = await db
        .select()
        .from(punchEvents)
        .where(
          and(
            eq(punchEvents.employeeId, event.employeeId),
            gte(punchEvents.timestamp, todayStart),
            lte(punchEvents.timestamp, todayEnd)
          )
        )
        .orderBy(punchEvents.timestamp);

      const dailyHours = this.calculateDailyHours(todayEvents);
      const threshold =
        this.config.maxDailyHours *
        this.config.alertThresholds.approachingMaxHours;

      if (dailyHours >= threshold && dailyHours < this.config.maxDailyHours) {
        alerts.push({
          alertId: nanoid(),
          type: 'MAX_HOURS_APPROACHING',
          severity: 'MEDIUM',
          employeeId: event.employeeId,
          propertyId: event.propertyId,
          message: `Daily hours approaching limit: ${dailyHours.toFixed(1)}/${this.config.maxDailyHours} hours`,
          details: {
            dailyHours,
            threshold,
            maxDailyHours: this.config.maxDailyHours,
          },
          createdAt: new Date(),
        });
      }

      // Check for long continuous work without break
      if (event.type === 'in') {
        const continuousMinutes = this.calculateContinuousWork(todayEvents);
        if (continuousMinutes >= this.config.maxContinuousWork) {
          alerts.push({
            alertId: nanoid(),
            type: 'CONTINUOUS_WORK_VIOLATION',
            severity: 'HIGH',
            employeeId: event.employeeId,
            propertyId: event.propertyId,
            message: `Continuous work without break: ${Math.round(continuousMinutes / 60)} hours`,
            details: {
              continuousMinutes,
              maxContinuousWork: this.config.maxContinuousWork,
            },
            createdAt: new Date(),
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Convert punch event to ERGANI format
   */
  private async convertToErganiEvent(event: PunchEvent): Promise<any> {
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.employeeId, event.employeeId))
      .then(result => result[0]);

    return {
      eventId: event.eventId,
      employeeAfm: employee?.afm || '',
      propertyCode: event.propertyId,
      timestamp: event.timestamp.toISOString(),
      eventType: this.mapPunchTypeToErgani(event.type),
      location:
        event.latitude && event.longitude
          ? {
              latitude: parseFloat(event.latitude),
              longitude: parseFloat(event.longitude),
            }
          : undefined,
      deviceId: event.sourceDeviceId,
    };
  }

  /**
   * Map punch types to ERGANI event types
   */
  private mapPunchTypeToErgani(type: string): string {
    const mapping: Record<string, string> = {
      in: 'CLOCK_IN',
      out: 'CLOCK_OUT',
      break_in: 'BREAK_START',
      break_out: 'BREAK_END',
    };
    return mapping[type] || 'CLOCK_IN';
  }

  /**
   * Calculate daily hours from punch events
   */
  private calculateDailyHours(events: any[]): number {
    let totalMinutes = 0;
    let lastInTime: Date | null = null;

    for (const event of events) {
      const eventTime = new Date(event.timestamp);

      if (event.type === 'in') {
        lastInTime = eventTime;
      } else if (event.type === 'out' && lastInTime) {
        const minutes =
          (eventTime.getTime() - lastInTime.getTime()) / (1000 * 60);
        totalMinutes += minutes;
        lastInTime = null;
      }
    }

    return totalMinutes / 60;
  }

  /**
   * Calculate weekly hours from punch events
   */
  private calculateWeeklyHours(events: any[]): number {
    const dailyHours: Record<string, number> = {};

    let lastInTime: Date | null = null;

    for (const event of events) {
      const eventTime = new Date(event.timestamp);
      const dayKey = eventTime.toISOString().split('T')[0];

      if (event.type === 'in') {
        lastInTime = eventTime;
      } else if (event.type === 'out' && lastInTime) {
        const minutes =
          (eventTime.getTime() - lastInTime.getTime()) / (1000 * 60);
        dailyHours[dayKey] = (dailyHours[dayKey] || 0) + minutes / 60;
        lastInTime = null;
      }
    }

    return Object.values(dailyHours).reduce((sum, hours) => sum + hours, 0);
  }

  /**
   * Calculate continuous work time without break
   */
  private calculateContinuousWork(events: any[]): number {
    let maxContinuous = 0;
    let currentContinuous = 0;
    let lastInTime: Date | null = null;

    for (const event of events) {
      const eventTime = new Date(event.timestamp);

      if (event.type === 'in') {
        lastInTime = eventTime;
      } else if (event.type === 'out' && lastInTime) {
        const minutes =
          (eventTime.getTime() - lastInTime.getTime()) / (1000 * 60);
        currentContinuous += minutes;
        maxContinuous = Math.max(maxContinuous, currentContinuous);
      } else if (event.type === 'break_in') {
        currentContinuous = 0; // Reset on break
      }
    }

    return maxContinuous;
  }

  /**
   * Initialize immutable audit log chain
   */
  private initializeAuditChain(): void {
    // Genesis hash for the audit chain
    this.auditLogChain = ['GENESIS_HASH_' + Date.now()];
  }

  /**
   * Create immutable audit log entry with hash chaining
   */
  async createAuditLogEntry(
    entry: Partial<AuditLogEntry>
  ): Promise<AuditLogEntry> {
    const logEntry: AuditLogEntry = {
      logId: nanoid(),
      timestamp: new Date(),
      eventType: entry.eventType || 'UNKNOWN',
      entityType: entry.entityType || 'UNKNOWN',
      entityId: entry.entityId || '',
      userId: entry.userId,
      changes: entry.changes || {},
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      hashChain: this.auditLogChain[this.auditLogChain.length - 1],
      signature: '',
    };

    // Generate signature hash (in production, use proper digital signing)
    const dataToSign = JSON.stringify({
      logId: logEntry.logId,
      timestamp: logEntry.timestamp,
      eventType: logEntry.eventType,
      entityType: logEntry.entityType,
      entityId: logEntry.entityId,
      changes: logEntry.changes,
      hashChain: logEntry.hashChain,
    });

    // Simple hash for demonstration (use proper crypto in production)
    logEntry.signature = this.generateHash(dataToSign);

    // Add to chain
    this.auditLogChain.push(logEntry.signature);

    // Store in database (implement as needed)
    console.log('[AUDIT]', logEntry);

    return logEntry;
  }

  /**
   * Generate hash for audit logging (simplified for demo)
   */
  private generateHash(data: string): string {
    // In production, use proper cryptographic hashing
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return 'HASH_' + Math.abs(hash).toString(16) + '_' + Date.now();
  }

  /**
   * Enforce digital work card policy
   */
  enforceDigitalCardPolicy(
    employeeId: string,
    issueType: string
  ): {
    allowed: boolean;
    reason: string;
    alternatives: string[];
  } {
    const policy = DIGITAL_CARD_POLICY;

    switch (issueType) {
      case 'CARD_NOT_WORKING':
        return {
          allowed: policy.alternativeMethodsAllowed,
          reason: 'Digital card malfunction - alternative methods allowed',
          alternatives: ['Manual entry', 'Supervisor override', 'Web punch'],
        };

      case 'PAYROLL_DEDUCTION_REQUEST':
        return {
          allowed: !policy.noPayrollDeductions,
          reason:
            'Greek law prohibits payroll deductions due to digital card issues',
          alternatives: ['Training', 'Process improvement', 'System upgrade'],
        };

      case 'UNREASONABLE_REQUIREMENTS':
        return {
          allowed: !policy.reasonablePunchRequirements,
          reason: 'Requirements must be reasonable and technically feasible',
          alternatives: [
            'Simplify process',
            'Provide training',
            'Technical support',
          ],
        };

      default:
        return {
          allowed: true,
          reason: 'Default policy allows this action',
          alternatives: [],
        };
    }
  }

  /**
   * Get compliance dashboard metrics
   */
  async getComplianceDashboard(): Promise<{
    realTimeStatus: any;
    alerts: ComplianceAlert[];
    erganiHealth: any;
    policyEnforcement: any;
    dataRetention: any;
  }> {
    const erganiHealth = erganiConnector.getHealthMetrics();

    return {
      realTimeStatus: {
        enabled: this.config.erganiConfig.realTimeSubmission,
        lastSubmission: erganiHealth.lastActivity,
        successRate: erganiHealth.successRate,
        pendingEvents: erganiHealth.pendingEvents,
      },
      alerts: this.alerts.filter(alert => !alert.resolvedAt).slice(0, 20),
      erganiHealth,
      policyEnforcement: {
        digitalCardPolicy: DIGITAL_CARD_POLICY,
        maxHoursConfig: {
          daily: this.config.maxDailyHours,
          weekly: this.config.maxWeeklyHours,
        },
        restPeriods: {
          minBetweenShifts: this.config.minRestBetweenShifts,
          maxContinuous: this.config.maxContinuousWork,
        },
      },
      dataRetention: {
        config: this.config.dataRetention,
        auditChainLength: this.auditLogChain.length,
        lastAuditEntry: this.auditLogChain[this.auditLogChain.length - 1],
      },
    };
  }

  /**
   * Resolve compliance alert
   */
  resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolution: string
  ): boolean {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (alert && !alert.resolvedAt) {
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;

      // Create audit entry
      this.createAuditLogEntry({
        eventType: 'ALERT_RESOLVED',
        entityType: 'compliance_alert',
        entityId: alertId,
        userId: resolvedBy,
        changes: { resolution, originalAlert: alert },
      });

      return true;
    }
    return false;
  }

  /**
   * Check data retention compliance
   */
  checkDataRetentionCompliance(): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if retention periods are properly configured
    if (this.config.dataRetention.punchEvents < 20) {
      issues.push(
        'Punch event retention period below Greek legal minimum (20 years)'
      );
      recommendations.push('Increase punch event retention to 20 years');
    }

    if (this.config.dataRetention.timesheets < 50) {
      issues.push(
        'Timesheet retention period below Greek legal minimum (50 years)'
      );
      recommendations.push('Increase timesheet retention to 50 years');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

// Global instance
export const complianceGuardrails = new ComplianceGuardrailsSystem();
