/**
 * Visibility & Alerts System
 * Who's On Now board, threshold alerts, push/SMS/email notifications
 */

// Real-time visibility dashboard
export interface WhosOnNowData {
  propertyId: string;
  propertyName: string;
  lastUpdated: string;
  departments: DepartmentStatus[];
  summary: {
    totalOnSite: number;
    totalScheduled: number;
    overtimeActive: number;
    alertsActive: number;
  };
}

export interface DepartmentStatus {
  departmentCode: string;
  departmentName: string;
  currentStaff: StaffMember[];
  scheduledStaff: StaffMember[];
  alerts: DepartmentAlert[];
  capacity: {
    scheduled: number;
    actual: number;
    percentage: number;
  };
}

export interface StaffMember {
  employeeId: string;
  name: string;
  role: string;
  status: 'on_site' | 'on_break' | 'late' | 'overtime' | 'scheduled' | 'absent';
  checkInTime?: string;
  expectedEndTime?: string;
  currentLocation?: string;
  hoursWorked: number;
  overtimeHours: number;
  alerts: string[];
}

// Alert system configuration
export interface AlertThreshold {
  id: string;
  name: string;
  description: string;
  category: 'hours' | 'attendance' | 'overtime' | 'compliance' | 'safety';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Threshold conditions
  conditions: {
    maxDailyHours?: number;
    maxWeeklyHours?: number;
    lateThresholdMinutes?: number;
    overtimeThresholdHours?: number;
    absentWithoutNotification?: boolean;
    onSiteAfterEndTime?: boolean;
    missedBreak?: boolean;
    consecutiveDaysThreshold?: number;
  };
  
  // Who gets notified
  recipients: {
    roles: string[];
    specific: string[];
    escalation: {
      afterMinutes: number;
      to: string[];
    };
  };
  
  // Notification channels
  channels: {
    push: boolean;
    sms: boolean;
    email: boolean;
    dashboard: boolean;
  };
  
  // Auto-resolution
  autoResolve: boolean;
  suppressDuplicates: boolean;
  suppressDurationMinutes: number;
}

export interface AlertInstance {
  id: string;
  thresholdId: string;
  employeeId: string;
  propertyId: string;
  
  // Alert details
  title: string;
  message: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Timing
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  escalatedAt?: string;
  
  // Context data
  contextData: {
    currentHours?: number;
    expectedEndTime?: string;
    lastSeen?: string;
    shiftDetails?: any;
  };
  
  // Actions taken
  notificationsSent: NotificationLog[];
  acknowledgments: AcknowledgmentLog[];
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated' | 'suppressed';
  autoResolved: boolean;
}

export interface NotificationLog {
  timestamp: string;
  channel: 'push' | 'sms' | 'email' | 'dashboard';
  recipient: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

export interface AcknowledgmentLog {
  timestamp: string;
  acknowledgedBy: string;
  method: 'dashboard' | 'mobile' | 'sms_reply' | 'email_reply';
  notes?: string;
}

export class AlertsEngine {
  
  // Monitor for threshold violations
  static async checkAlertThresholds(events: any[]): Promise<AlertInstance[]> {
    const newAlerts: AlertInstance[] = [];
    const thresholds = await this.getActiveThresholds();
    
    for (const threshold of thresholds) {
      const violations = await this.checkThreshold(threshold, events);
      newAlerts.push(...violations);
    }
    
    return newAlerts;
  }
  
  private static async checkThreshold(threshold: AlertThreshold, events: any[]): Promise<AlertInstance[]> {
    const alerts: AlertInstance[] = [];
    
    // Group events by employee
    const employeeEvents = this.groupEventsByEmployee(events);
    
    for (const [employeeId, empEvents] of employeeEvents) {
      const violation = this.evaluateEmployeeAgainstThreshold(employeeId, empEvents, threshold);
      
      if (violation) {
        // Check if we should suppress due to recent similar alert
        if (!this.shouldSuppressAlert(violation, threshold)) {
          alerts.push(violation);
        }
      }
    }
    
    return alerts;
  }
  
  private static evaluateEmployeeAgainstThreshold(
    employeeId: string, 
    events: any[], 
    threshold: AlertThreshold
  ): AlertInstance | null {
    const conditions = threshold.conditions;
    
    // About to hit max daily hours
    if (conditions.maxDailyHours) {
      const todayHours = this.calculateTodayHours(events);
      const timeToMax = conditions.maxDailyHours - todayHours;
      
      if (timeToMax <= 1 && timeToMax > 0) { // Alert 1 hour before limit
        return this.createAlert(threshold, employeeId, {
          title: 'Προσέγγιση Μέγιστων Ωρών',
          message: `Ο εργαζόμενος θα φτάσει το όριο των ${conditions.maxDailyHours} ωρών σε ${Math.round(timeToMax * 60)} λεπτά`,
          contextData: { currentHours: todayHours }
        });
      }
    }
    
    // Missing shift start
    if (conditions.lateThresholdMinutes) {
      const missedStart = this.checkMissedShiftStart(events, conditions.lateThresholdMinutes);
      
      if (missedStart) {
        return this.createAlert(threshold, employeeId, {
          title: 'Καθυστέρηση Βάρδιας',
          message: `Ο εργαζόμενος δεν έχει εμφανιστεί για ${missedStart.minutesLate} λεπτά`,
          contextData: { expectedStartTime: missedStart.expectedStart }
        });
      }
    }
    
    // On-site after end time
    if (conditions.onSiteAfterEndTime) {
      const overtime = this.checkOvertimeWithoutApproval(events);
      
      if (overtime) {
        return this.createAlert(threshold, employeeId, {
          title: 'Παραμονή Μετά το Τέλος Βάρδιας',
          message: `Ο εργαζόμενος εργάζεται ${overtime.minutesOver} λεπτά πέρα από το προγραμματισμένο τέλος`,
          contextData: { expectedEndTime: overtime.expectedEnd }
        });
      }
    }
    
    // Unapproved overtime
    if (conditions.overtimeThresholdHours) {
      const unapprovedOT = this.checkUnapprovedOvertime(events, conditions.overtimeThresholdHours);
      
      if (unapprovedOT) {
        return this.createAlert(threshold, employeeId, {
          title: 'Μη Εγκεκριμένες Υπερωρίες',
          message: `Υπερωρίες ${unapprovedOT.hours} ώρες χωρίς έγκριση`,
          contextData: { overtimeHours: unapprovedOT.hours }
        });
      }
    }
    
    return null;
  }
  
  // Send notifications through multiple channels
  static async sendAlert(alert: AlertInstance): Promise<NotificationLog[]> {
    const threshold = await this.getThreshold(alert.thresholdId);
    const notifications: NotificationLog[] = [];
    
    // Get recipients
    const recipients = await this.resolveRecipients(threshold.recipients);
    
    for (const recipient of recipients) {
      // Send through each enabled channel
      if (threshold.channels.push) {
        const pushResult = await this.sendPushNotification(recipient, alert);
        notifications.push(pushResult);
      }
      
      if (threshold.channels.sms) {
        const smsResult = await this.sendSMSNotification(recipient, alert);
        notifications.push(smsResult);
      }
      
      if (threshold.channels.email) {
        const emailResult = await this.sendEmailNotification(recipient, alert);
        notifications.push(emailResult);
      }
      
      if (threshold.channels.dashboard) {
        const dashboardResult = await this.updateDashboard(recipient, alert);
        notifications.push(dashboardResult);
      }
    }
    
    // Schedule escalation if configured
    if (threshold.recipients.escalation) {
      await this.scheduleEscalation(alert, threshold.recipients.escalation);
    }
    
    return notifications;
  }
  
  // Real-time "Who's On Now" board
  static async getWhosOnNowData(propertyId: string): Promise<WhosOnNowData> {
    const currentEvents = await this.getCurrentSiteEvents(propertyId);
    const scheduledShifts = await this.getTodayScheduledShifts(propertyId);
    const departments = await this.getDepartments(propertyId);
    
    const departmentStatuses: DepartmentStatus[] = [];
    
    for (const dept of departments) {
      const currentStaff = currentEvents
        .filter(event => event.department === dept.code)
        .map(event => this.eventToStaffMember(event));
      
      const scheduledStaff = scheduledShifts
        .filter(shift => shift.department === dept.code)
        .map(shift => this.shiftToStaffMember(shift));
      
      const alerts = await this.getDepartmentAlerts(propertyId, dept.code);
      
      departmentStatuses.push({
        departmentCode: dept.code,
        departmentName: dept.name,
        currentStaff,
        scheduledStaff,
        alerts,
        capacity: {
          scheduled: scheduledStaff.length,
          actual: currentStaff.length,
          percentage: (currentStaff.length / scheduledStaff.length) * 100
        }
      });
    }
    
    const summary = {
      totalOnSite: currentEvents.length,
      totalScheduled: scheduledShifts.length,
      overtimeActive: currentEvents.filter(e => e.isOvertime).length,
      alertsActive: departmentStatuses.reduce((sum, dept) => sum + dept.alerts.length, 0)
    };
    
    return {
      propertyId,
      propertyName: await this.getPropertyName(propertyId),
      lastUpdated: new Date().toISOString(),
      departments: departmentStatuses,
      summary
    };
  }
  
  // Notification channel implementations
  private static async sendPushNotification(recipient: string, alert: AlertInstance): Promise<NotificationLog> {
    try {
      // Implementation for push notifications
      const messageId = await this.pushNotificationService.send({
        to: recipient,
        title: alert.title,
        body: alert.message,
        data: {
          alertId: alert.id,
          category: alert.category,
          severity: alert.severity
        }
      });
      
      return {
        timestamp: new Date().toISOString(),
        channel: 'push',
        recipient,
        success: true,
        messageId
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        channel: 'push',
        recipient,
        success: false,
        error: error.message
      };
    }
  }
  
  private static async sendSMSNotification(recipient: string, alert: AlertInstance): Promise<NotificationLog> {
    try {
      // Implementation for SMS notifications
      const messageId = await this.smsService.send({
        to: recipient,
        message: `${alert.title}: ${alert.message}. Απάντηση ACK για επιβεβαίωση.`
      });
      
      return {
        timestamp: new Date().toISOString(),
        channel: 'sms',
        recipient,
        success: true,
        messageId
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        channel: 'sms',
        recipient,
        success: false,
        error: error.message
      };
    }
  }
  
  private static async sendEmailNotification(recipient: string, alert: AlertInstance): Promise<NotificationLog> {
    try {
      // Implementation for email notifications
      const messageId = await this.emailService.send({
        to: recipient,
        subject: `PayrollSync Alert: ${alert.title}`,
        html: this.formatEmailAlert(alert)
      });
      
      return {
        timestamp: new Date().toISOString(),
        channel: 'email',
        recipient,
        success: true,
        messageId
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        channel: 'email',
        recipient,
        success: false,
        error: error.message
      };
    }
  }
  
  // Helper methods
  private static groupEventsByEmployee(events: any[]): Map<string, any[]> {
    const grouped = new Map();
    events.forEach(event => {
      if (!grouped.has(event.employeeId)) {
        grouped.set(event.employeeId, []);
      }
      grouped.get(event.employeeId).push(event);
    });
    return grouped;
  }
  
  private static calculateTodayHours(events: any[]): number {
    // Calculate worked hours for today from events
    return 8; // Placeholder
  }
  
  private static checkMissedShiftStart(events: any[], thresholdMinutes: number): { minutesLate: number; expectedStart: string } | null {
    // Check if employee is late for scheduled shift
    return null; // Placeholder
  }
  
  private static checkOvertimeWithoutApproval(events: any[]): { minutesOver: number; expectedEnd: string } | null {
    // Check if employee is working past scheduled end time
    return null; // Placeholder
  }
  
  private static checkUnapprovedOvertime(events: any[], thresholdHours: number): { hours: number } | null {
    // Check for unapproved overtime hours
    return null; // Placeholder
  }
  
  private static createAlert(threshold: AlertThreshold, employeeId: string, details: any): AlertInstance {
    return {
      id: `alert_${Date.now()}_${employeeId}`,
      thresholdId: threshold.id,
      employeeId,
      propertyId: 'property_001', // Would be determined from context
      title: details.title,
      message: details.message,
      category: threshold.category,
      severity: threshold.severity,
      triggeredAt: new Date().toISOString(),
      contextData: details.contextData || {},
      notificationsSent: [],
      acknowledgments: [],
      status: 'active',
      autoResolved: false
    };
  }
  
  private static shouldSuppressAlert(alert: AlertInstance, threshold: AlertThreshold): boolean {
    if (!threshold.suppressDuplicates) return false;
    
    // Check for recent similar alerts
    // Implementation would check database for similar alerts within suppressDurationMinutes
    return false;
  }
  
  // Placeholder service references
  private static pushNotificationService = {
    send: async (payload: any) => `push_${Date.now()}`
  };
  
  private static smsService = {
    send: async (payload: any) => `sms_${Date.now()}`
  };
  
  private static emailService = {
    send: async (payload: any) => `email_${Date.now()}`
  };
  
  private static formatEmailAlert(alert: AlertInstance): string {
    return `
      <h2>${alert.title}</h2>
      <p>${alert.message}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Time:</strong> ${new Date(alert.triggeredAt).toLocaleString('el-GR')}</p>
    `;
  }
  
  // Additional placeholder methods
  private static async getActiveThresholds(): Promise<AlertThreshold[]> { return []; }
  private static async getThreshold(id: string): Promise<AlertThreshold> { return null; }
  private static async resolveRecipients(recipients: any): Promise<string[]> { return []; }
  private static async scheduleEscalation(alert: AlertInstance, escalation: any): Promise<void> {}
  private static async getCurrentSiteEvents(propertyId: string): Promise<any[]> { return []; }
  private static async getTodayScheduledShifts(propertyId: string): Promise<any[]> { return []; }
  private static async getDepartments(propertyId: string): Promise<any[]> { return []; }
  private static async getDepartmentAlerts(propertyId: string, deptCode: string): Promise<DepartmentAlert[]> { return []; }
  private static async getPropertyName(propertyId: string): Promise<string> { return ''; }
  private static async updateDashboard(recipient: string, alert: AlertInstance): Promise<NotificationLog> { return null; }
  private static eventToStaffMember(event: any): StaffMember { return null; }
  private static shiftToStaffMember(shift: any): StaffMember { return null; }
}

export interface DepartmentAlert {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
}