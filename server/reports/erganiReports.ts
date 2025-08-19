import { nanoid } from "nanoid";
import { createHash } from "crypto";

/**
 * ERGANI II Event Reports Generator
 * Handles real-time and batch event submissions to Greek labor inspection system
 */

export interface ERGANIEvent {
  eventId: string;
  eventType: 'hire' | 'schedule' | 'overtime' | 'termination' | 'schedule_change';
  employeeAFM: string;
  employeeAMKA: string;
  propertyCode: string;
  eventDate: Date;
  submissionDate: Date;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  erganiReceiptNumber?: string;
  details: any;
}

export interface HireEvent {
  employeeAFM: string;
  employeeAMKA: string;
  employeeName: string;
  contractType: 'FULL_TIME' | 'PART_TIME' | 'SEASONAL' | 'TEMPORARY';
  startDate: Date;
  workSchedule: {
    mondayStart?: string;
    mondayEnd?: string;
    tuesdayStart?: string;
    tuesdayEnd?: string;
    wednesdayStart?: string;
    wednesdayEnd?: string;
    thursdayStart?: string;
    thursdayEnd?: string;
    fridayStart?: string;
    fridayEnd?: string;
    saturdayStart?: string;
    saturdayEnd?: string;
    sundayStart?: string;
    sundayEnd?: string;
  };
  propertyCode: string;
  jobDescription: string;
}

export interface ScheduleEvent {
  employeeAFM: string;
  employeeAMKA: string;
  scheduleDate: Date;
  shiftStart: string;
  shiftEnd: string;
  breakDuration: number; // minutes
  propertyCode: string;
  specialConditions?: string[];
}

export interface OvertimeEvent {
  employeeAFM: string;
  employeeAMKA: string;
  overtimeDate: Date;
  overtimeStart: string;
  overtimeEnd: string;
  overtimeHours: number;
  reason: string;
  approvedBy: string;
  propertyCode: string;
}

export interface TerminationEvent {
  employeeAFM: string;
  employeeAMKA: string;
  employeeName: string;
  terminationDate: Date;
  terminationReason: 'RESIGNATION' | 'DISMISSAL' | 'MUTUAL_AGREEMENT' | 'CONTRACT_EXPIRY';
  noticePeriod: number; // days
  severancePay?: number;
  propertyCode: string;
}

export interface ERGANIBatchSubmission {
  batchId: string;
  submissionDate: Date;
  events: ERGANIEvent[];
  totalEvents: number;
  successfulSubmissions: number;
  failedSubmissions: number;
  erganiReceiptNumber: string;
  status: 'processing' | 'completed' | 'failed';
}

// ERGANI property codes for different business locations
const PROPERTY_CODES = {
  'ATHENS_HOTEL_001': 'ATH001',
  'THESSALONIKI_HOTEL_002': 'THE002',
  'MYKONOS_RESORT_003': 'MYK003',
  'SANTORINI_HOTEL_004': 'SAN004'
};

// ERGANI submission time windows
const SUBMISSION_DEADLINES = {
  'hire': 1, // Must submit within 1 day of hire
  'schedule': 1, // Must submit by end of previous day
  'overtime': 1, // Must submit same day
  'termination': 1, // Must submit within 1 day
  'schedule_change': 0 // Must submit immediately
};

class ERGANIReportsGenerator {
  private readonly companyCode: string;
  private pendingEvents: Map<string, ERGANIEvent> = new Map();

  constructor() {
    this.companyCode = process.env.ERGANI_COMPANY_CODE || 'DEMO001';
  }

  /**
   * Create hire event for ERGANI submission
   */
  async createHireEvent(hireData: HireEvent): Promise<ERGANIEvent> {
    const eventId = nanoid();
    
    const event: ERGANIEvent = {
      eventId,
      eventType: 'hire',
      employeeAFM: hireData.employeeAFM,
      employeeAMKA: hireData.employeeAMKA,
      propertyCode: hireData.propertyCode,
      eventDate: hireData.startDate,
      submissionDate: new Date(),
      status: 'pending',
      details: {
        employeeName: hireData.employeeName,
        contractType: hireData.contractType,
        workSchedule: hireData.workSchedule,
        jobDescription: hireData.jobDescription
      }
    };

    this.pendingEvents.set(eventId, event);
    
    // Auto-submit if within deadline window
    if (this.isWithinSubmissionDeadline(event)) {
      await this.submitSingleEvent(event);
    }

    return event;
  }

  /**
   * Create schedule event for ERGANI submission
   */
  async createScheduleEvent(scheduleData: ScheduleEvent): Promise<ERGANIEvent> {
    const eventId = nanoid();
    
    const event: ERGANIEvent = {
      eventId,
      eventType: 'schedule',
      employeeAFM: scheduleData.employeeAFM,
      employeeAMKA: scheduleData.employeeAMKA,
      propertyCode: scheduleData.propertyCode,
      eventDate: scheduleData.scheduleDate,
      submissionDate: new Date(),
      status: 'pending',
      details: {
        shiftStart: scheduleData.shiftStart,
        shiftEnd: scheduleData.shiftEnd,
        breakDuration: scheduleData.breakDuration,
        specialConditions: scheduleData.specialConditions
      }
    };

    this.pendingEvents.set(eventId, event);
    
    // Schedule events must be submitted by end of previous day
    if (this.isWithinSubmissionDeadline(event)) {
      await this.submitSingleEvent(event);
    }

    return event;
  }

  /**
   * Create overtime event for ERGANI submission
   */
  async createOvertimeEvent(overtimeData: OvertimeEvent): Promise<ERGANIEvent> {
    const eventId = nanoid();
    
    const event: ERGANIEvent = {
      eventId,
      eventType: 'overtime',
      employeeAFM: overtimeData.employeeAFM,
      employeeAMKA: overtimeData.employeeAMKA,
      propertyCode: overtimeData.propertyCode,
      eventDate: overtimeData.overtimeDate,
      submissionDate: new Date(),
      status: 'pending',
      details: {
        overtimeStart: overtimeData.overtimeStart,
        overtimeEnd: overtimeData.overtimeEnd,
        overtimeHours: overtimeData.overtimeHours,
        reason: overtimeData.reason,
        approvedBy: overtimeData.approvedBy
      }
    };

    this.pendingEvents.set(eventId, event);
    
    // Overtime must be submitted same day
    if (this.isWithinSubmissionDeadline(event)) {
      await this.submitSingleEvent(event);
    }

    return event;
  }

  /**
   * Create termination event for ERGANI submission
   */
  async createTerminationEvent(terminationData: TerminationEvent): Promise<ERGANIEvent> {
    const eventId = nanoid();
    
    const event: ERGANIEvent = {
      eventId,
      eventType: 'termination',
      employeeAFM: terminationData.employeeAFM,
      employeeAMKA: terminationData.employeeAMKA,
      propertyCode: terminationData.propertyCode,
      eventDate: terminationData.terminationDate,
      submissionDate: new Date(),
      status: 'pending',
      details: {
        employeeName: terminationData.employeeName,
        terminationReason: terminationData.terminationReason,
        noticePeriod: terminationData.noticePeriod,
        severancePay: terminationData.severancePay
      }
    };

    this.pendingEvents.set(eventId, event);
    
    // Termination must be submitted within 1 day
    if (this.isWithinSubmissionDeadline(event)) {
      await this.submitSingleEvent(event);
    }

    return event;
  }

  /**
   * Submit single event to ERGANI II system
   */
  async submitSingleEvent(event: ERGANIEvent): Promise<void> {
    try {
      const xmlContent = this.generateEventXML(event);
      
      // Mock ERGANI II submission (in production, use actual API)
      const receiptNumber = `ERGANI${Date.now()}_${event.eventType.toUpperCase()}`;
      
      event.status = 'submitted';
      event.erganiReceiptNumber = receiptNumber;
      event.submissionDate = new Date();
      
      console.log(`ERGANI event ${event.eventId} (${event.eventType}) submitted with receipt ${receiptNumber}`);
      
      // Simulate processing delay and acceptance
      setTimeout(() => {
        event.status = 'accepted';
        console.log(`ERGANI event ${event.eventId} accepted by labor inspection`);
      }, 1000);
      
    } catch (error) {
      event.status = 'rejected';
      console.error(`ERGANI event ${event.eventId} submission failed:`, error);
      throw error;
    }
  }

  /**
   * Submit batch of events to ERGANI II
   */
  async submitBatchEvents(events: ERGANIEvent[]): Promise<ERGANIBatchSubmission> {
    const batchId = nanoid();
    let successfulSubmissions = 0;
    let failedSubmissions = 0;

    const batchSubmission: ERGANIBatchSubmission = {
      batchId,
      submissionDate: new Date(),
      events,
      totalEvents: events.length,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      erganiReceiptNumber: '',
      status: 'processing'
    };

    try {
      // Submit each event in the batch
      for (const event of events) {
        try {
          await this.submitSingleEvent(event);
          successfulSubmissions++;
        } catch (error) {
          failedSubmissions++;
          console.error(`Failed to submit event ${event.eventId}:`, error);
        }
      }

      batchSubmission.successfulSubmissions = successfulSubmissions;
      batchSubmission.failedSubmissions = failedSubmissions;
      batchSubmission.erganiReceiptNumber = `BATCH_${batchId}`;
      batchSubmission.status = failedSubmissions > 0 ? 'completed' : 'completed';

      console.log(`ERGANI batch ${batchId} completed: ${successfulSubmissions} successful, ${failedSubmissions} failed`);

    } catch (error) {
      batchSubmission.status = 'failed';
      console.error(`ERGANI batch ${batchId} failed:`, error);
    }

    return batchSubmission;
  }

  /**
   * Get pending events that need submission
   */
  getPendingEvents(): ERGANIEvent[] {
    return Array.from(this.pendingEvents.values()).filter(event => event.status === 'pending');
  }

  /**
   * Process all pending events (batch submission)
   */
  async processPendingEvents(): Promise<ERGANIBatchSubmission> {
    const pendingEvents = this.getPendingEvents();
    
    if (pendingEvents.length === 0) {
      throw new Error('No pending events to process');
    }

    return await this.submitBatchEvents(pendingEvents);
  }

  /**
   * Check if event is within submission deadline
   */
  private isWithinSubmissionDeadline(event: ERGANIEvent): boolean {
    const deadline = SUBMISSION_DEADLINES[event.eventType];
    const daysSinceEvent = Math.floor(
      (new Date().getTime() - event.eventDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceEvent <= deadline;
  }

  /**
   * Generate XML content for ERGANI event
   */
  private generateEventXML(event: ERGANIEvent): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;
    
    switch (event.eventType) {
      case 'hire':
        return this.generateHireXML(event);
      case 'schedule':
        return this.generateScheduleXML(event);
      case 'overtime':
        return this.generateOvertimeXML(event);
      case 'termination':
        return this.generateTerminationXML(event);
      default:
        throw new Error(`Unknown ERGANI event type: ${event.eventType}`);
    }
  }

  /**
   * Generate hire event XML
   */
  private generateHireXML(event: ERGANIEvent): string {
    const details = event.details;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<ERGANI_HireEvent xmlns="http://www.ergani.gov.gr/hire">
  <Header>
    <EventId>${event.eventId}</EventId>
    <CompanyCode>${this.companyCode}</CompanyCode>
    <PropertyCode>${event.propertyCode}</PropertyCode>
    <SubmissionDate>${event.submissionDate.toISOString()}</SubmissionDate>
  </Header>
  <HireData>
    <EmployeeAFM>${event.employeeAFM}</EmployeeAFM>
    <EmployeeAMKA>${event.employeeAMKA}</EmployeeAMKA>
    <EmployeeName><![CDATA[${details.employeeName}]]></EmployeeName>
    <ContractType>${details.contractType}</ContractType>
    <StartDate>${event.eventDate.toISOString().split('T')[0]}</StartDate>
    <JobDescription><![CDATA[${details.jobDescription}]]></JobDescription>
    <WorkSchedule>
      ${Object.entries(details.workSchedule).map(([day, time]) => 
        time ? `<${day}>${time}</${day}>` : ''
      ).join('\n      ')}
    </WorkSchedule>
  </HireData>
</ERGANI_HireEvent>`;
  }

  /**
   * Generate schedule event XML
   */
  private generateScheduleXML(event: ERGANIEvent): string {
    const details = event.details;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<ERGANI_ScheduleEvent xmlns="http://www.ergani.gov.gr/schedule">
  <Header>
    <EventId>${event.eventId}</EventId>
    <CompanyCode>${this.companyCode}</CompanyCode>
    <PropertyCode>${event.propertyCode}</PropertyCode>
    <SubmissionDate>${event.submissionDate.toISOString()}</SubmissionDate>
  </Header>
  <ScheduleData>
    <EmployeeAFM>${event.employeeAFM}</EmployeeAFM>
    <EmployeeAMKA>${event.employeeAMKA}</EmployeeAMKA>
    <ScheduleDate>${event.eventDate.toISOString().split('T')[0]}</ScheduleDate>
    <ShiftStart>${details.shiftStart}</ShiftStart>
    <ShiftEnd>${details.shiftEnd}</ShiftEnd>
    <BreakDuration>${details.breakDuration}</BreakDuration>
    ${details.specialConditions ? `<SpecialConditions>${details.specialConditions.join(',')}</SpecialConditions>` : ''}
  </ScheduleData>
</ERGANI_ScheduleEvent>`;
  }

  /**
   * Generate overtime event XML
   */
  private generateOvertimeXML(event: ERGANIEvent): string {
    const details = event.details;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<ERGANI_OvertimeEvent xmlns="http://www.ergani.gov.gr/overtime">
  <Header>
    <EventId>${event.eventId}</EventId>
    <CompanyCode>${this.companyCode}</CompanyCode>
    <PropertyCode>${event.propertyCode}</PropertyCode>
    <SubmissionDate>${event.submissionDate.toISOString()}</SubmissionDate>
  </Header>
  <OvertimeData>
    <EmployeeAFM>${event.employeeAFM}</EmployeeAFM>
    <EmployeeAMKA>${event.employeeAMKA}</EmployeeAMKA>
    <OvertimeDate>${event.eventDate.toISOString().split('T')[0]}</OvertimeDate>
    <OvertimeStart>${details.overtimeStart}</OvertimeStart>
    <OvertimeEnd>${details.overtimeEnd}</OvertimeEnd>
    <OvertimeHours>${details.overtimeHours}</OvertimeHours>
    <Reason><![CDATA[${details.reason}]]></Reason>
    <ApprovedBy><![CDATA[${details.approvedBy}]]></ApprovedBy>
  </OvertimeData>
</ERGANI_OvertimeEvent>`;
  }

  /**
   * Generate termination event XML
   */
  private generateTerminationXML(event: ERGANIEvent): string {
    const details = event.details;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<ERGANI_TerminationEvent xmlns="http://www.ergani.gov.gr/termination">
  <Header>
    <EventId>${event.eventId}</EventId>
    <CompanyCode>${this.companyCode}</CompanyCode>
    <PropertyCode>${event.propertyCode}</PropertyCode>
    <SubmissionDate>${event.submissionDate.toISOString()}</SubmissionDate>
  </Header>
  <TerminationData>
    <EmployeeAFM>${event.employeeAFM}</EmployeeAFM>
    <EmployeeAMKA>${event.employeeAMKA}</EmployeeAMKA>
    <EmployeeName><![CDATA[${details.employeeName}]]></EmployeeName>
    <TerminationDate>${event.eventDate.toISOString().split('T')[0]}</TerminationDate>
    <TerminationReason>${details.terminationReason}</TerminationReason>
    <NoticePeriod>${details.noticePeriod}</NoticePeriod>
    ${details.severancePay ? `<SeverancePay>${details.severancePay.toFixed(2)}</SeverancePay>` : ''}
  </TerminationData>
</ERGANI_TerminationEvent>`;
  }
}

export const erganiReports = new ERGANIReportsGenerator();