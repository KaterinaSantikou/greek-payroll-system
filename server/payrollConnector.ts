/**
 * Payroll Connector - Integration between time tracking and payroll systems
 * 
 * Features:
 * - Employee master data synchronization
 * - Earnings code mapping and calculation
 * - Cost center allocation
 * - Timesheet generation and export
 * - Multiple export formats (CSV, XML, API)
 * - Webhook notifications
 */

import { nanoid } from "nanoid";
import { storage } from "./storage";

// Earnings codes for Greek payroll compliance
export const EARNINGS_CODES = {
  REG: 'Regular Hours',
  OT1: 'Overtime Tier 1 (25% premium)',
  OT2: 'Overtime Tier 2 (50% premium)', 
  OT3: 'Overtime Tier 3 (75% premium)',
  NIGHT: 'Night Shift Premium',
  HOLIDAY: 'Holiday Premium',
  SUNDAY: 'Sunday Premium',
  BREAK_UNPAID: 'Unpaid Break Deduction',
  ALLOWANCE_FOOD: 'Food Allowance',
  ALLOWANCE_TRAVEL: 'Travel Allowance',
  ALLOWANCE_UNIFORM: 'Uniform Allowance',
  ALLOWANCE_POSITION: 'Position Allowance',
  LEAVE_ANNUAL: 'Annual Leave',
  LEAVE_SICK: 'Sick Leave',
  LEAVE_PARENTAL: 'Parental Leave',
  LEAVE_SPECIAL: 'Special Leave'
} as const;

export type EarningsCode = keyof typeof EARNINGS_CODES;

// Cost center allocation
export interface CostCenterAllocation {
  costCenterId: string;
  propertyId: string;
  hours: number;
  percentage: number;
}

// Timesheet entry for payroll export
export interface TimesheetEntry {
  entryId: string;
  employeeNumber: string;
  employeeGuid: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  earningsCode: EarningsCode;
  hours: number;
  units: number;
  rateBasis: 'HOURLY' | 'DAILY' | 'FIXED';
  costCenterAllocations: CostCenterAllocation[];
  notes?: string;
  propertyId: string;
  calculatedAt: Date;
  lockedAt?: Date;
  approvedBy?: string;
}

// Payroll export batch
export interface PayrollExportBatch {
  batchId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  entries: TimesheetEntry[];
  totalHours: number;
  totalEmployees: number;
  exportFormat: 'CSV' | 'XML' | 'API';
  exportedAt: Date;
  status: 'PENDING' | 'EXPORTED' | 'FAILED';
  errorMessage?: string;
}

// Webhook event types
export type WebhookEvent = 
  | 'timesheet.locked'
  | 'timesheet.rejected' 
  | 'payroll.exported'
  | 'payroll.failed';

export interface WebhookPayload {
  event: WebhookEvent;
  batchId?: string;
  employeeId?: string;
  payPeriod: string;
  timestamp: Date;
  data: any;
}

export class PayrollConnector {
  private timesheetEntries: Map<string, TimesheetEntry> = new Map();
  private exportBatches: Map<string, PayrollExportBatch> = new Map();
  private webhookUrls: Map<WebhookEvent, string[]> = new Map();
  private isProcessing: boolean = false;

  constructor() {
    // Initialize webhook URLs from environment
    this.initializeWebhooks();
  }

  private initializeWebhooks() {
    const webhookConfig = {
      'timesheet.locked': process.env.WEBHOOK_TIMESHEET_LOCKED?.split(',') || [],
      'timesheet.rejected': process.env.WEBHOOK_TIMESHEET_REJECTED?.split(',') || [],
      'payroll.exported': process.env.WEBHOOK_PAYROLL_EXPORTED?.split(',') || [],
      'payroll.failed': process.env.WEBHOOK_PAYROLL_FAILED?.split(',') || []
    };

    Object.entries(webhookConfig).forEach(([event, urls]) => {
      this.webhookUrls.set(event as WebhookEvent, urls.filter(url => url.length > 0));
    });
  }

  /**
   * Synchronize employee master data from payroll system
   */
  async syncEmployeeMasterData(payrollEmployees: any[]): Promise<void> {
    console.log(`[PAYROLL] Syncing ${payrollEmployees.length} employees from payroll system`);

    for (const payrollEmployee of payrollEmployees) {
      try {
        // Find existing employee by GUID or employee number
        let existingEmployee = await storage.getEmployee(payrollEmployee.guid);
        
        if (!existingEmployee && payrollEmployee.employeeNumber) {
          // Try to find by employee number as fallback
          const allEmployees = await storage.getEmployees();
          existingEmployee = allEmployees.find(emp => 
            emp.name === payrollEmployee.employeeNumber || 
            emp.employeeId === payrollEmployee.employeeNumber
          );
        }

        if (existingEmployee) {
          // Update existing employee with payroll data
          await storage.updateEmployee(existingEmployee.employeeId, {
            name: payrollEmployee.fullName || existingEmployee.name,
            // Map other payroll fields as needed
          });
        } else {
          // Create new employee from payroll data
          await storage.createEmployee({
            name: payrollEmployee.fullName,
            role: payrollEmployee.jobTitle || 'Employee',
            employmentType: payrollEmployee.employmentType || 'FULL_TIME',
            hireDate: payrollEmployee.hireDate,
            afm: payrollEmployee.taxId,
            defaultPropertyId: payrollEmployee.defaultPropertyId
          });
        }
      } catch (error) {
        console.error(`[PAYROLL] Error syncing employee ${payrollEmployee.guid}:`, error);
      }
    }

    console.log('[PAYROLL] Employee master data sync completed');
  }

  /**
   * Process punch events into timesheet entries
   */
  async processPunchEvents(employeeId: string, startDate: Date, endDate: Date): Promise<TimesheetEntry[]> {
    const punchEvents = await storage.getPunchEvents(employeeId, undefined, startDate, endDate);
    const shifts = await storage.getShifts(employeeId, undefined, startDate, endDate);
    
    // Group punch events by day
    const dailyPunches = this.groupPunchesByDay(punchEvents);
    const timesheetEntries: TimesheetEntry[] = [];

    for (const [date, punches] of dailyPunches.entries()) {
      const dayShift = shifts.find(shift => 
        new Date(shift.startPlanned).toDateString() === date
      );

      // Pair IN/OUT punches and compute worked intervals
      const workedIntervals = this.pairPunches(punches);
      
      // Calculate hours by earnings code
      const earningsBreakdown = this.calculateEarnings(workedIntervals, dayShift);
      
      // Create timesheet entries for each earnings code
      for (const [earningsCode, hours] of earningsBreakdown.entries()) {
        if (hours > 0) {
          const entry: TimesheetEntry = {
            entryId: nanoid(12),
            employeeNumber: employeeId.slice(-8), // Use last 8 chars as employee number
            employeeGuid: employeeId,
            payPeriodStart: startDate.toISOString().split('T')[0],
            payPeriodEnd: endDate.toISOString().split('T')[0],
            earningsCode: earningsCode as EarningsCode,
            hours: hours,
            units: hours,
            rateBasis: 'HOURLY',
            costCenterAllocations: await this.calculateCostCenterAllocations(employeeId, hours),
            propertyId: dayShift?.propertyId || '',
            calculatedAt: new Date()
          };

          timesheetEntries.push(entry);
          this.timesheetEntries.set(entry.entryId, entry);
        }
      }
    }

    return timesheetEntries;
  }

  /**
   * Group punch events by day
   */
  private groupPunchesByDay(punchEvents: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    for (const punch of punchEvents) {
      const date = new Date(punch.timestamp).toDateString();
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(punch);
    }
    
    return grouped;
  }

  /**
   * Pair IN/OUT punches to calculate worked intervals
   */
  private pairPunches(punches: any[]): Array<{start: Date, end: Date}> {
    const sortedPunches = punches.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const intervals: Array<{start: Date, end: Date}> = [];
    let currentStart: Date | null = null;

    for (const punch of sortedPunches) {
      if (punch.type === 'CLOCK_IN' && !currentStart) {
        currentStart = new Date(punch.timestamp);
      } else if (punch.type === 'CLOCK_OUT' && currentStart) {
        intervals.push({
          start: currentStart,
          end: new Date(punch.timestamp)
        });
        currentStart = null;
      }
    }

    return intervals;
  }

  /**
   * Calculate earnings breakdown by type
   */
  private calculateEarnings(intervals: Array<{start: Date, end: Date}>, shift?: any): Map<string, number> {
    const earnings = new Map<string, number>();
    let totalHours = 0;
    let nightHours = 0;
    let weekendHours = 0;

    for (const interval of intervals) {
      const hours = (interval.end.getTime() - interval.start.getTime()) / (1000 * 60 * 60);
      totalHours += hours;

      // Calculate night hours (10 PM to 6 AM)
      const nightStart = new Date(interval.start);
      nightStart.setHours(22, 0, 0, 0);
      const nightEnd = new Date(interval.start);
      nightEnd.setDate(nightEnd.getDate() + 1);
      nightEnd.setHours(6, 0, 0, 0);

      if (interval.start <= nightEnd && interval.end >= nightStart) {
        const nightOverlapStart = new Date(Math.max(interval.start.getTime(), nightStart.getTime()));
        const nightOverlapEnd = new Date(Math.min(interval.end.getTime(), nightEnd.getTime()));
        nightHours += (nightOverlapEnd.getTime() - nightOverlapStart.getTime()) / (1000 * 60 * 60);
      }

      // Calculate weekend hours
      const dayOfWeek = interval.start.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        weekendHours += hours;
      }
    }

    // Regular hours calculation
    const standardHours = 8; // Standard 8-hour day
    const regularHours = Math.min(totalHours, standardHours);
    earnings.set('REG', regularHours);

    // Overtime calculation
    if (totalHours > standardHours) {
      const overtimeHours = totalHours - standardHours;
      if (overtimeHours <= 2) {
        earnings.set('OT1', overtimeHours); // First 2 hours at 25%
      } else {
        earnings.set('OT1', 2);
        earnings.set('OT2', overtimeHours - 2); // Additional hours at 50%
      }
    }

    // Night premium
    if (nightHours > 0) {
      earnings.set('NIGHT', nightHours);
    }

    // Sunday premium
    if (weekendHours > 0 && intervals[0]?.start.getDay() === 0) {
      earnings.set('SUNDAY', weekendHours);
    }

    return earnings;
  }

  /**
   * Calculate cost center allocations
   */
  private async calculateCostCenterAllocations(employeeId: string, hours: number): Promise<CostCenterAllocation[]> {
    const employee = await storage.getEmployee(employeeId);
    if (!employee?.defaultPropertyId) {
      return [];
    }

    const property = await storage.getProperty(employee.defaultPropertyId);
    if (!property) {
      return [];
    }

    return [{
      costCenterId: property.costCenterCode || property.propertyId,
      propertyId: property.propertyId,
      hours: hours,
      percentage: 100
    }];
  }

  /**
   * Lock timesheet for manager approval
   */
  async lockTimesheet(employeeId: string, payPeriodStart: string, payPeriodEnd: string, approvedBy: string): Promise<void> {
    const entries = Array.from(this.timesheetEntries.values()).filter(entry =>
      entry.employeeGuid === employeeId &&
      entry.payPeriodStart === payPeriodStart &&
      entry.payPeriodEnd === payPeriodEnd
    );

    for (const entry of entries) {
      entry.lockedAt = new Date();
      entry.approvedBy = approvedBy;
      this.timesheetEntries.set(entry.entryId, entry);
    }

    // Send webhook notification
    await this.sendWebhook('timesheet.locked', {
      event: 'timesheet.locked',
      employeeId,
      payPeriod: `${payPeriodStart}_${payPeriodEnd}`,
      timestamp: new Date(),
      data: { entries: entries.length, approvedBy }
    });

    console.log(`[PAYROLL] Timesheet locked for employee ${employeeId}, period ${payPeriodStart} to ${payPeriodEnd}`);
  }

  /**
   * Export timesheet batch to CSV format
   */
  exportToCSV(batch: PayrollExportBatch): string {
    const headers = [
      'employee_number',
      'pay_period_start', 
      'pay_period_end',
      'earnings_code',
      'hours',
      'units',
      'rate_basis',
      'cost_center',
      'property_id',
      'notes'
    ];

    const rows = batch.entries.map(entry => [
      entry.employeeNumber,
      entry.payPeriodStart,
      entry.payPeriodEnd,
      entry.earningsCode,
      entry.hours.toFixed(2),
      entry.units.toFixed(2),
      entry.rateBasis,
      entry.costCenterAllocations[0]?.costCenterId || '',
      entry.propertyId,
      entry.notes || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Export timesheet batch to XML format
   */
  exportToXML(batch: PayrollExportBatch): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<payroll_export batch_id="${batch.batchId}" exported_at="${batch.exportedAt.toISOString()}">\n`;
    xml += `  <pay_period start="${batch.payPeriodStart}" end="${batch.payPeriodEnd}"/>\n`;
    xml += `  <summary total_hours="${batch.totalHours}" total_employees="${batch.totalEmployees}"/>\n`;
    xml += `  <entries>\n`;

    for (const entry of batch.entries) {
      xml += `    <entry id="${entry.entryId}">\n`;
      xml += `      <employee number="${entry.employeeNumber}" guid="${entry.employeeGuid}"/>\n`;
      xml += `      <earnings code="${entry.earningsCode}" hours="${entry.hours}" units="${entry.units}" rate_basis="${entry.rateBasis}"/>\n`;
      xml += `      <cost_centers>\n`;
      for (const allocation of entry.costCenterAllocations) {
        xml += `        <allocation center_id="${allocation.costCenterId}" property_id="${allocation.propertyId}" hours="${allocation.hours}" percentage="${allocation.percentage}"/>\n`;
      }
      xml += `      </cost_centers>\n`;
      if (entry.notes) {
        xml += `      <notes>${entry.notes}</notes>\n`;
      }
      xml += `    </entry>\n`;
    }

    xml += `  </entries>\n`;
    xml += `</payroll_export>`;

    return xml;
  }

  /**
   * Create export batch for API submission
   */
  async createExportBatch(payPeriodStart: string, payPeriodEnd: string, format: 'CSV' | 'XML' | 'API' = 'API'): Promise<PayrollExportBatch> {
    const entries = Array.from(this.timesheetEntries.values()).filter(entry =>
      entry.payPeriodStart === payPeriodStart &&
      entry.payPeriodEnd === payPeriodEnd &&
      entry.lockedAt // Only include locked entries
    );

    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const uniqueEmployees = new Set(entries.map(entry => entry.employeeGuid)).size;

    const batch: PayrollExportBatch = {
      batchId: nanoid(12),
      payPeriodStart,
      payPeriodEnd,
      entries,
      totalHours,
      totalEmployees: uniqueEmployees,
      exportFormat: format,
      exportedAt: new Date(),
      status: 'PENDING'
    };

    this.exportBatches.set(batch.batchId, batch);
    return batch;
  }

  /**
   * Submit batch via API
   */
  async submitBatchAPI(batchId: string): Promise<void> {
    const batch = this.exportBatches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    try {
      // In a real implementation, this would POST to the payroll system API
      const payrollApiUrl = process.env.PAYROLL_API_URL;
      const apiKey = process.env.PAYROLL_API_KEY;

      if (!payrollApiUrl || !apiKey) {
        console.log(`[PAYROLL] Simulating API submission for batch ${batchId}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        batch.status = 'EXPORTED';
      } else {
        const response = await fetch(`${payrollApiUrl}/timesheets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(batch)
        });

        if (response.ok) {
          batch.status = 'EXPORTED';
        } else {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
      }

      this.exportBatches.set(batchId, batch);

      // Send webhook notification
      await this.sendWebhook('payroll.exported', {
        event: 'payroll.exported',
        batchId,
        payPeriod: `${batch.payPeriodStart}_${batch.payPeriodEnd}`,
        timestamp: new Date(),
        data: { totalHours: batch.totalHours, totalEmployees: batch.totalEmployees }
      });

      console.log(`[PAYROLL] Batch ${batchId} exported successfully`);
    } catch (error) {
      batch.status = 'FAILED';
      batch.errorMessage = (error as Error).message;
      this.exportBatches.set(batchId, batch);

      // Send failure webhook
      await this.sendWebhook('payroll.failed', {
        event: 'payroll.failed',
        batchId,
        payPeriod: `${batch.payPeriodStart}_${batch.payPeriodEnd}`,
        timestamp: new Date(),
        data: { error: batch.errorMessage }
      });

      console.error(`[PAYROLL] Batch ${batchId} export failed:`, error);
      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(event: WebhookEvent, payload: WebhookPayload): Promise<void> {
    const urls = this.webhookUrls.get(event);
    if (!urls || urls.length === 0) {
      return;
    }

    for (const url of urls) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event
          },
          body: JSON.stringify(payload)
        });
        console.log(`[PAYROLL] Webhook sent to ${url} for event ${event}`);
      } catch (error) {
        console.error(`[PAYROLL] Failed to send webhook to ${url}:`, error);
      }
    }
  }

  /**
   * Get all timesheet entries for a pay period
   */
  getTimesheetEntries(payPeriodStart: string, payPeriodEnd: string): TimesheetEntry[] {
    return Array.from(this.timesheetEntries.values()).filter(entry =>
      entry.payPeriodStart === payPeriodStart &&
      entry.payPeriodEnd === payPeriodEnd
    );
  }

  /**
   * Get export batch by ID
   */
  getExportBatch(batchId: string): PayrollExportBatch | undefined {
    return this.exportBatches.get(batchId);
  }

  /**
   * Get all export batches
   */
  getAllExportBatches(): PayrollExportBatch[] {
    return Array.from(this.exportBatches.values());
  }

  /**
   * Get system health metrics
   */
  getHealthMetrics() {
    const totalEntries = this.timesheetEntries.size;
    const lockedEntries = Array.from(this.timesheetEntries.values()).filter(entry => entry.lockedAt).length;
    const totalBatches = this.exportBatches.size;
    const exportedBatches = Array.from(this.exportBatches.values()).filter(batch => batch.status === 'EXPORTED').length;
    const failedBatches = Array.from(this.exportBatches.values()).filter(batch => batch.status === 'FAILED').length;

    return {
      totalEntries,
      lockedEntries,
      pendingEntries: totalEntries - lockedEntries,
      totalBatches,
      exportedBatches,
      failedBatches,
      lockRate: totalEntries > 0 ? (lockedEntries / totalEntries) * 100 : 0,
      exportSuccessRate: totalBatches > 0 ? (exportedBatches / totalBatches) * 100 : 0,
      isProcessing: this.isProcessing,
      lastActivity: this.exportBatches.size > 0 ? 
        Math.max(...Array.from(this.exportBatches.values()).map(b => b.exportedAt.getTime())) : null
    };
  }
}

// Global instance
export const payrollConnector = new PayrollConnector();