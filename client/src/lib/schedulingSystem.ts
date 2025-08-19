/**
 * Scheduling & Overtime Management System
 * Import/create rotas, overtime workflows, multiple jobs per employee
 */

// Rota and shift management
export interface EmployeeRota {
  id: string;
  employeeId: string;
  propertyId: string;
  weekStarting: string; // ISO date
  shifts: ScheduledShift[];
  status: 'draft' | 'published' | 'approved' | 'archived';
  publishedAt?: string;
  approvedBy?: string;
  notes?: string;
}

export interface ScheduledShift {
  id: string;
  employeeId: string;
  propertyId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  role: string;
  department: string;
  station?: string;
  breakAllowance: number; // minutes
  isPublished: boolean;
  changeNotificationSent: boolean;
  
  // Multiple job support
  jobCode?: string;
  costCenter?: string;
  hourlyRate?: number;
  
  // Overtime pre-approval
  overtimePreApproved?: boolean;
  maxOvertimeHours?: number;
  overtimeRate?: number;
}

// Greek CBA and overtime rules
export interface OvertimePolicy {
  id: string;
  name: string;
  description: string;
  applicableRoles: string[];
  applicableDepartments: string[];
  
  // Overtime thresholds
  dailyThreshold: number; // hours
  weeklyThreshold: number; // hours
  monthlyThreshold: number; // hours
  
  // Premium rates (stored as policy, not hard-coded)
  overtimeRates: {
    daily: number; // e.g., 1.25 for 25% premium
    weekend: number; // e.g., 1.5 for Saturday/Sunday
    holiday: number; // e.g., 2.0 for public holidays
    night: number; // e.g., 1.25 for night shift (22:00-06:00)
  };
  
  // Greek labor law specifics
  maxConsecutiveDays: number;
  maxDailyHours: number;
  minRestBetweenShifts: number; // hours
  maxWeeklyHours: number;
  
  // CBA-specific rules
  cbaReference?: string;
  industrySpecific: {
    hotel: {
      seasonalRules: boolean;
      tourismPremium: number;
      weekendRules: boolean;
    };
    restaurant: {
      tipCalculation: boolean;
      splitShiftRules: boolean;
    };
  };
}

// Overtime request and approval workflow
export interface OvertimeRequest {
  id: string;
  employeeId: string;
  shiftId: string;
  requestedDate: string;
  
  // Request details
  requestType: 'pre_planned' | 'emergency' | 'extension';
  requestedHours: number;
  justification: string;
  businessJustification: string;
  
  // Approval workflow
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  requestedBy: string;
  requestedAt: string;
  
  approvalLevel: 'supervisor' | 'manager' | 'hr' | 'auto';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Cost impact
  estimatedCost: number;
  actualCost?: number;
  budgetCode?: string;
  
  // Auto-approval rules
  autoApprovalRules?: {
    maxHours: number;
    department: string[];
    roles: string[];
    businessReason: string[];
  };
}

export class SchedulingEngine {
  
  // Import rotas from external systems or create manually
  static async importRota(source: RotaImportSource): Promise<EmployeeRota[]> {
    switch (source.type) {
      case 'excel':
        return this.importFromExcel(source.data);
      case 'csv':
        return this.importFromCSV(source.data);
      case 'external_system':
        return this.importFromExternalSystem(source.apiEndpoint, source.credentials);
      default:
        throw new Error(`Unsupported import source: ${source.type}`);
    }
  }
  
  private static async importFromExcel(data: any): Promise<EmployeeRota[]> {
    // Implementation for Excel import
    // Parse Excel file and convert to EmployeeRota format
    return [];
  }
  
  private static async importFromCSV(data: string): Promise<EmployeeRota[]> {
    // Implementation for CSV import
    return [];
  }
  
  private static async importFromExternalSystem(endpoint: string, credentials: any): Promise<EmployeeRota[]> {
    // Integration with external scheduling systems
    return [];
  }
  
  // Publish rotas to staff
  static async publishRota(rotaId: string, options: PublishOptions): Promise<PublishResult> {
    const rota = await this.getRota(rotaId);
    
    if (!rota) {
      throw new Error('Rota not found');
    }
    
    // Mark as published
    rota.status = 'published';
    rota.publishedAt = new Date().toISOString();
    
    // Send notifications to affected employees
    const notifications = await this.sendScheduleNotifications(rota, options.notificationMethod);
    
    // Update shift publication status
    rota.shifts.forEach(shift => {
      shift.isPublished = true;
    });
    
    return {
      success: true,
      rotaId,
      publishedAt: rota.publishedAt,
      notificationsSent: notifications.length,
      affectedEmployees: rota.shifts.map(s => s.employeeId)
    };
  }
  
  // Handle schedule changes and notifications
  static async notifyScheduleChange(changes: ScheduleChange[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    for (const change of changes) {
      try {
        const employee = await this.getEmployee(change.employeeId);
        const shift = await this.getShift(change.shiftId);
        
        const notification = {
          employeeId: change.employeeId,
          type: 'schedule_change',
          title: 'Αλλαγή Προγράμματος',
          message: this.formatChangeMessage(change, shift),
          urgency: this.determineUrgency(change),
          channels: this.selectNotificationChannels(change.urgency, employee.preferences)
        };
        
        await this.sendNotification(notification);
        
        results.push({
          employeeId: change.employeeId,
          success: true,
          sentAt: new Date().toISOString()
        });
        
      } catch (error) {
        results.push({
          employeeId: change.employeeId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  // Overtime request processing
  static async processOvertimeRequest(request: OvertimeRequest): Promise<OvertimeDecision> {
    // Check auto-approval rules first
    const autoApproval = this.checkAutoApprovalRules(request);
    
    if (autoApproval.eligible) {
      return {
        requestId: request.id,
        decision: 'auto_approved',
        approvedBy: 'system',
        approvedAt: new Date().toISOString(),
        conditions: autoApproval.conditions
      };
    }
    
    // Route to appropriate approver
    const approver = await this.determineApprover(request);
    
    // Create approval task
    await this.createApprovalTask({
      requestId: request.id,
      assignedTo: approver.id,
      dueBy: this.calculateApprovalDeadline(request),
      priority: this.calculatePriority(request)
    });
    
    return {
      requestId: request.id,
      decision: 'pending_approval',
      assignedApprover: approver.id,
      estimatedDecisionBy: this.calculateApprovalDeadline(request)
    };
  }
  
  // Multiple jobs per employee management
  static async assignMultipleJobs(employeeId: string, jobs: JobAssignment[]): Promise<JobAssignmentResult> {
    const employee = await this.getEmployee(employeeId);
    
    // Validate job assignments don't conflict
    const conflicts = this.detectJobConflicts(jobs);
    
    if (conflicts.length > 0) {
      return {
        success: false,
        conflicts,
        message: 'Job assignments have scheduling conflicts'
      };
    }
    
    // Validate total hours don't exceed legal limits
    const totalHours = this.calculateTotalWeeklyHours(jobs);
    const maxWeeklyHours = 48; // EU Working Time Directive
    
    if (totalHours > maxWeeklyHours) {
      return {
        success: false,
        message: `Total weekly hours (${totalHours}) exceed legal limit (${maxWeeklyHours})`
      };
    }
    
    // Create shifts for each job
    const shifts: ScheduledShift[] = [];
    
    for (const job of jobs) {
      const jobShifts = await this.createShiftsForJob(employeeId, job);
      shifts.push(...jobShifts);
    }
    
    return {
      success: true,
      totalJobs: jobs.length,
      totalShifts: shifts.length,
      totalWeeklyHours: totalHours,
      createdShifts: shifts
    };
  }
  
  private static checkAutoApprovalRules(request: OvertimeRequest): { eligible: boolean; conditions?: string[] } {
    // Example auto-approval rules
    if (request.requestedHours <= 2 && 
        request.requestType === 'emergency' && 
        request.businessJustification.includes('guest_emergency')) {
      return {
        eligible: true,
        conditions: ['max_2_hours', 'emergency_only', 'requires_followup']
      };
    }
    
    return { eligible: false };
  }
  
  private static async sendScheduleNotifications(rota: EmployeeRota, method: string[]): Promise<string[]> {
    // Implementation for sending notifications
    return [];
  }
  
  private static async getRota(rotaId: string): Promise<EmployeeRota | null> {
    // Database lookup
    return null;
  }
  
  private static async getEmployee(employeeId: string): Promise<any> {
    // Database lookup
    return null;
  }
  
  private static async getShift(shiftId: string): Promise<ScheduledShift | null> {
    // Database lookup
    return null;
  }
  
  private static formatChangeMessage(change: ScheduleChange, shift: ScheduledShift): string {
    return `Αλλαγή βάρδιας για ${change.date}: ${change.description}`;
  }
  
  private static determineUrgency(change: ScheduleChange): 'low' | 'medium' | 'high' {
    const hoursUntilShift = this.calculateHoursUntilShift(change.date);
    
    if (hoursUntilShift < 4) return 'high';
    if (hoursUntilShift < 24) return 'medium';
    return 'low';
  }
  
  private static calculateHoursUntilShift(shiftDate: string): number {
    return (new Date(shiftDate).getTime() - new Date().getTime()) / (1000 * 60 * 60);
  }
  
  private static selectNotificationChannels(urgency: string, preferences: any): string[] {
    if (urgency === 'high') {
      return ['push', 'sms', 'email'];
    } else if (urgency === 'medium') {
      return ['push', 'email'];
    }
    return ['push'];
  }
  
  private static async sendNotification(notification: any): Promise<void> {
    // Implementation for sending notifications
  }
  
  private static async determineApprover(request: OvertimeRequest): Promise<{ id: string }> {
    // Logic to determine who should approve the overtime request
    return { id: 'supervisor_001' };
  }
  
  private static calculateApprovalDeadline(request: OvertimeRequest): string {
    // Calculate when approval decision is needed
    const requestDate = new Date(request.requestedDate);
    const deadline = new Date(requestDate.getTime() - (4 * 60 * 60 * 1000)); // 4 hours before shift
    return deadline.toISOString();
  }
  
  private static calculatePriority(request: OvertimeRequest): 'low' | 'medium' | 'high' {
    if (request.requestType === 'emergency') return 'high';
    if (request.requestedHours > 4) return 'medium';
    return 'low';
  }
  
  private static async createApprovalTask(task: any): Promise<void> {
    // Create task in approval system
  }
  
  private static detectJobConflicts(jobs: JobAssignment[]): string[] {
    // Check for overlapping shifts across different jobs
    return [];
  }
  
  private static calculateTotalWeeklyHours(jobs: JobAssignment[]): number {
    return jobs.reduce((total, job) => total + job.weeklyHours, 0);
  }
  
  private static async createShiftsForJob(employeeId: string, job: JobAssignment): Promise<ScheduledShift[]> {
    // Create shifts based on job requirements
    return [];
  }
}

// Supporting interfaces
export interface RotaImportSource {
  type: 'excel' | 'csv' | 'external_system';
  data?: any;
  apiEndpoint?: string;
  credentials?: any;
}

export interface PublishOptions {
  notificationMethod: string[];
  immediate: boolean;
  includeChangesOnly: boolean;
}

export interface PublishResult {
  success: boolean;
  rotaId: string;
  publishedAt: string;
  notificationsSent: number;
  affectedEmployees: string[];
}

export interface ScheduleChange {
  employeeId: string;
  shiftId: string;
  date: string;
  changeType: 'time_change' | 'cancellation' | 'new_shift' | 'location_change';
  description: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface NotificationResult {
  employeeId: string;
  success: boolean;
  sentAt?: string;
  error?: string;
}

export interface OvertimeDecision {
  requestId: string;
  decision: 'approved' | 'rejected' | 'pending_approval' | 'auto_approved';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  assignedApprover?: string;
  estimatedDecisionBy?: string;
  conditions?: string[];
}

export interface JobAssignment {
  jobCode: string;
  propertyId: string;
  department: string;
  role: string;
  weeklyHours: number;
  hourlyRate: number;
  costCenter: string;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
}

export interface JobAssignmentResult {
  success: boolean;
  totalJobs?: number;
  totalShifts?: number;
  totalWeeklyHours?: number;
  createdShifts?: ScheduledShift[];
  conflicts?: string[];
  message?: string;
}