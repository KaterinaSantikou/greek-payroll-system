import { nanoid } from "nanoid";
import { createHash } from "crypto";

/**
 * Digital Work Card Audit Pack Generator
 * Creates comprehensive punch ledger and receipt packages for labor inspections
 */

export interface PunchRecord {
  punchId: string;
  employeeAFM: string;
  employeeAMKA: string;
  employeeName: string;
  timestamp: Date;
  punchType: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';
  deviceId: string;
  location: GeolocationData;
  photoVerification?: string; // Base64 encoded photo
  biometricHash?: string;
  IPAddress: string;
  userAgent: string;
  erganiSubmissionId?: string;
  validationStatus: 'VALID' | 'SUSPICIOUS' | 'REJECTED';
  validationNotes?: string;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  timestamp: Date;
  address?: string;
  workplaceRadius?: number; // Distance from designated workplace
}

export interface WorkCard {
  cardId: string;
  employeeAFM: string;
  employeeAMKA: string;
  employeeName: string;
  cardDate: Date;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  totalHours: number;
  overtimeHours: number;
  breakMinutes: number;
  punches: PunchRecord[];
  erganiEvents: ERGANIEventReference[];
  discrepancies: string[];
  inspectorNotes?: string;
}

export interface ERGANIEventReference {
  eventId: string;
  eventType: string;
  submissionTimestamp: Date;
  receiptNumber: string;
  status: string;
}

export interface AuditPack {
  packId: string;
  generatedFor: 'LABOR_INSPECTION' | 'TAX_AUDIT' | 'EFKA_REVIEW' | 'COMPANY_AUDIT';
  requestedBy: string;
  periodStart: Date;
  periodEnd: Date;
  totalEmployees: number;
  totalWorkDays: number;
  totalPunches: number;
  workCards: WorkCard[];
  summaryStatistics: AuditStatistics;
  complianceAnalysis: ComplianceAnalysis;
  pdfContent?: Buffer;
  digitalSignature: string;
  generatedAt: Date;
}

export interface AuditStatistics {
  averageDailyHours: number;
  overtimePercentage: number;
  lateArrivals: number;
  earlyDepartures: number;
  missedPunches: number;
  erganiComplianceRate: number;
  geolocationAccuracy: number;
  suspiciousPunches: number;
}

export interface ComplianceAnalysis {
  dailyHoursCompliance: boolean;
  weeklyHoursCompliance: boolean;
  overtimeCompliance: boolean;
  breakCompliance: boolean;
  erganiSubmissionCompliance: boolean;
  geofencingCompliance: boolean;
  violations: ComplianceViolation[];
}

export interface ComplianceViolation {
  violationType: 'EXCESSIVE_HOURS' | 'MISSING_BREAKS' | 'LOCATION_VIOLATION' | 'LATE_ERGANI_SUBMISSION';
  employeeAFM: string;
  date: Date;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedAction: string;
}

// Greek labor law limits
const LABOR_LAW_LIMITS = {
  MAX_DAILY_HOURS: 8,
  MAX_WEEKLY_HOURS: 40,
  MAX_MONTHLY_OVERTIME: 120, // hours per month
  MIN_BREAK_DURATION: 30, // minutes for 8+ hour shifts
  MAX_CONTINUOUS_WORK: 6, // hours without break
  GEOFENCE_TOLERANCE: 100, // meters from workplace
  ERGANI_SUBMISSION_DEADLINE: 24 // hours
};

class DigitalCardPackGenerator {
  private readonly companyInfo = {
    name: process.env.COMPANY_NAME || 'PayrollSync Demo Company',
    afm: process.env.COMPANY_AFM || '123456789',
    address: process.env.COMPANY_ADDRESS || 'Demo Address'
  };

  /**
   * Generate comprehensive audit pack for labor inspection
   */
  async generateAuditPack(
    employeeIds: string[],
    startDate: Date,
    endDate: Date,
    requestedBy: string,
    purpose: 'LABOR_INSPECTION' | 'TAX_AUDIT' | 'EFKA_REVIEW' | 'COMPANY_AUDIT' = 'LABOR_INSPECTION'
  ): Promise<AuditPack> {
    const packId = nanoid();
    
    // Generate work cards for each employee
    const workCards: WorkCard[] = [];
    
    for (const employeeId of employeeIds) {
      const employeeCards = await this.generateEmployeeWorkCards(employeeId, startDate, endDate);
      workCards.push(...employeeCards);
    }

    // Calculate summary statistics
    const summaryStatistics = this.calculateAuditStatistics(workCards);
    
    // Perform compliance analysis
    const complianceAnalysis = this.analyzeCompliance(workCards);
    
    // Generate digital signature
    const digitalSignature = this.generatePackSignature(packId, workCards);

    const auditPack: AuditPack = {
      packId,
      generatedFor: purpose,
      requestedBy,
      periodStart: startDate,
      periodEnd: endDate,
      totalEmployees: employeeIds.length,
      totalWorkDays: workCards.length,
      totalPunches: workCards.reduce((sum, card) => sum + card.punches.length, 0),
      workCards,
      summaryStatistics,
      complianceAnalysis,
      digitalSignature,
      generatedAt: new Date()
    };

    // Generate PDF version for inspection
    auditPack.pdfContent = await this.generateAuditPackPDF(auditPack);

    return auditPack;
  }

  /**
   * Generate work cards for specific employee and date range
   */
  private async generateEmployeeWorkCards(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkCard[]> {
    const workCards: WorkCard[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Get punches for this date
      const dayPunches = await this.getPunchesForDate(employeeId, currentDate);
      
      if (dayPunches.length > 0) {
        const workCard = await this.generateDailyWorkCard(employeeId, currentDate, dayPunches);
        workCards.push(workCard);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workCards;
  }

  /**
   * Generate daily work card with punch analysis
   */
  private async generateDailyWorkCard(
    employeeId: string,
    date: Date,
    punches: PunchRecord[]
  ): Promise<WorkCard> {
    const cardId = nanoid();
    
    // Get employee information
    const employee = await this.getEmployeeInfo(employeeId);
    
    // Sort punches by timestamp
    punches.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Calculate work hours
    const { actualStart, actualEnd, totalHours, overtimeHours, breakMinutes } = 
      this.calculateWorkHours(punches, date);
    
    // Get scheduled hours
    const { scheduledStart, scheduledEnd } = await this.getScheduledHours(employeeId, date);
    
    // Get ERGANI events for this day
    const erganiEvents = await this.getERGANIEvents(employeeId, date);
    
    // Identify discrepancies
    const discrepancies = this.identifyDiscrepancies(punches, {
      scheduledStart,
      scheduledEnd,
      actualStart,
      actualEnd
    });

    return {
      cardId,
      employeeAFM: employee.afm,
      employeeAMKA: employee.amka,
      employeeName: employee.name,
      cardDate: date,
      scheduledStart,
      scheduledEnd,
      actualStart,
      actualEnd,
      totalHours,
      overtimeHours,
      breakMinutes,
      punches,
      erganiEvents,
      discrepancies
    };
  }

  /**
   * Calculate work hours from punch data
   */
  private calculateWorkHours(punches: PunchRecord[], date: Date): {
    actualStart?: string;
    actualEnd?: string;
    totalHours: number;
    overtimeHours: number;
    breakMinutes: number;
  } {
    let totalMinutes = 0;
    let breakMinutes = 0;
    let actualStart: string | undefined;
    let actualEnd: string | undefined;
    
    const inPunches = punches.filter(p => p.punchType === 'IN');
    const outPunches = punches.filter(p => p.punchType === 'OUT');
    const breakStarts = punches.filter(p => p.punchType === 'BREAK_START');
    const breakEnds = punches.filter(p => p.punchType === 'BREAK_END');
    
    // Find actual start and end times
    if (inPunches.length > 0) {
      actualStart = inPunches[0].timestamp.toTimeString().substring(0, 5);
    }
    
    if (outPunches.length > 0) {
      actualEnd = outPunches[outPunches.length - 1].timestamp.toTimeString().substring(0, 5);
    }

    // Calculate total work time
    for (let i = 0; i < Math.min(inPunches.length, outPunches.length); i++) {
      const workPeriod = outPunches[i].timestamp.getTime() - inPunches[i].timestamp.getTime();
      totalMinutes += workPeriod / (1000 * 60);
    }

    // Calculate break time
    for (let i = 0; i < Math.min(breakStarts.length, breakEnds.length); i++) {
      const breakPeriod = breakEnds[i].timestamp.getTime() - breakStarts[i].timestamp.getTime();
      breakMinutes += breakPeriod / (1000 * 60);
    }

    const totalHours = totalMinutes / 60;
    const overtimeHours = Math.max(0, totalHours - LABOR_LAW_LIMITS.MAX_DAILY_HOURS);

    return {
      actualStart,
      actualEnd,
      totalHours,
      overtimeHours,
      breakMinutes
    };
  }

  /**
   * Calculate audit statistics
   */
  private calculateAuditStatistics(workCards: WorkCard[]): AuditStatistics {
    const totalHours = workCards.reduce((sum, card) => sum + card.totalHours, 0);
    const totalOvertime = workCards.reduce((sum, card) => sum + card.overtimeHours, 0);
    const totalPunches = workCards.reduce((sum, card) => sum + card.punches.length, 0);
    
    const lateArrivals = workCards.filter(card => 
      card.scheduledStart && card.actualStart && 
      card.actualStart > card.scheduledStart
    ).length;
    
    const earlyDepartures = workCards.filter(card =>
      card.scheduledEnd && card.actualEnd &&
      card.actualEnd < card.scheduledEnd
    ).length;
    
    const suspiciousPunches = workCards.reduce((sum, card) => 
      sum + card.punches.filter(p => p.validationStatus === 'SUSPICIOUS').length, 0
    );

    return {
      averageDailyHours: workCards.length > 0 ? totalHours / workCards.length : 0,
      overtimePercentage: totalHours > 0 ? (totalOvertime / totalHours) * 100 : 0,
      lateArrivals,
      earlyDepartures,
      missedPunches: workCards.filter(card => card.discrepancies.some(d => d.includes('Missing'))).length,
      erganiComplianceRate: this.calculateERGANICompliance(workCards),
      geolocationAccuracy: this.calculateGeolocationAccuracy(workCards),
      suspiciousPunches
    };
  }

  /**
   * Analyze compliance with Greek labor laws
   */
  private analyzeCompliance(workCards: WorkCard[]): ComplianceAnalysis {
    const violations: ComplianceViolation[] = [];

    workCards.forEach(card => {
      // Check daily hours compliance
      if (card.totalHours > LABOR_LAW_LIMITS.MAX_DAILY_HOURS + 2) { // Allow some overtime
        violations.push({
          violationType: 'EXCESSIVE_HOURS',
          employeeAFM: card.employeeAFM,
          date: card.cardDate,
          description: `Worked ${card.totalHours.toFixed(1)} hours (exceeds daily limit)`,
          severity: 'HIGH',
          suggestedAction: 'Review overtime authorization and work schedule'
        });
      }

      // Check break compliance
      if (card.totalHours >= 6 && card.breakMinutes < LABOR_LAW_LIMITS.MIN_BREAK_DURATION) {
        violations.push({
          violationType: 'MISSING_BREAKS',
          employeeAFM: card.employeeAFM,
          date: card.cardDate,
          description: `Insufficient break time: ${card.breakMinutes} minutes`,
          severity: 'MEDIUM',
          suggestedAction: 'Ensure mandatory break periods are taken'
        });
      }

      // Check geolocation compliance
      const locationViolations = card.punches.filter(punch => 
        punch.location.workplaceRadius && 
        punch.location.workplaceRadius > LABOR_LAW_LIMITS.GEOFENCE_TOLERANCE
      );

      locationViolations.forEach(punch => {
        violations.push({
          violationType: 'LOCATION_VIOLATION',
          employeeAFM: card.employeeAFM,
          date: card.cardDate,
          description: `Punch from ${punch.location.workplaceRadius}m away from workplace`,
          severity: 'MEDIUM',
          suggestedAction: 'Verify legitimate remote work or investigate potential fraud'
        });
      });
    });

    return {
      dailyHoursCompliance: violations.filter(v => v.violationType === 'EXCESSIVE_HOURS').length === 0,
      weeklyHoursCompliance: true, // Would need weekly calculation
      overtimeCompliance: true, // Would need monthly overtime tracking
      breakCompliance: violations.filter(v => v.violationType === 'MISSING_BREAKS').length === 0,
      erganiSubmissionCompliance: this.calculateERGANICompliance(workCards) > 0.95,
      geofencingCompliance: violations.filter(v => v.violationType === 'LOCATION_VIOLATION').length === 0,
      violations
    };
  }

  /**
   * Generate PDF content for audit pack
   */
  private async generateAuditPackPDF(auditPack: AuditPack): Promise<Buffer> {
    // Mock PDF generation - in production would use library like PDFKit or Puppeteer
    const pdfContent = `
DIGITAL WORK CARD AUDIT PACK
============================

Pack ID: ${auditPack.packId}
Generated for: ${auditPack.generatedFor}
Period: ${auditPack.periodStart.toLocaleDateString()} - ${auditPack.periodEnd.toLocaleDateString()}
Total Employees: ${auditPack.totalEmployees}
Total Work Days: ${auditPack.totalWorkDays}
Total Punches: ${auditPack.totalPunches}

SUMMARY STATISTICS
==================
Average Daily Hours: ${auditPack.summaryStatistics.averageDailyHours.toFixed(2)}
Overtime Percentage: ${auditPack.summaryStatistics.overtimePercentage.toFixed(2)}%
Late Arrivals: ${auditPack.summaryStatistics.lateArrivals}
Early Departures: ${auditPack.summaryStatistics.earlyDepartures}
ERGANI Compliance: ${auditPack.summaryStatistics.erganiComplianceRate.toFixed(2)}%

COMPLIANCE ANALYSIS
===================
${auditPack.complianceAnalysis.violations.map(v => 
  `${v.violationType}: ${v.description} (${v.severity})`
).join('\n')}

DETAILED WORK CARDS
===================
${auditPack.workCards.map(card => `
Employee: ${card.employeeName} (${card.employeeAFM})
Date: ${card.cardDate.toLocaleDateString()}
Hours: ${card.totalHours.toFixed(2)} (${card.overtimeHours.toFixed(2)} overtime)
Punches: ${card.punches.length}
Discrepancies: ${card.discrepancies.join(', ') || 'None'}
`).join('\n')}

Digital Signature: ${auditPack.digitalSignature}
Generated: ${auditPack.generatedAt.toISOString()}
`;

    return Buffer.from(pdfContent, 'utf-8');
  }

  // Helper methods (simplified implementations)
  private async getPunchesForDate(employeeId: string, date: Date): Promise<PunchRecord[]> {
    // Mock implementation - would query punch_events table
    return [];
  }

  private async getEmployeeInfo(employeeId: string) {
    // Mock implementation - would query employees table
    return {
      afm: '123456789',
      amka: '12345678901',
      name: 'Demo Employee'
    };
  }

  private async getScheduledHours(employeeId: string, date: Date) {
    // Mock implementation - would query schedules table
    return {
      scheduledStart: '09:00',
      scheduledEnd: '17:00'
    };
  }

  private async getERGANIEvents(employeeId: string, date: Date): Promise<ERGANIEventReference[]> {
    // Mock implementation - would query ERGANI submissions
    return [];
  }

  private identifyDiscrepancies(punches: PunchRecord[], schedule: any): string[] {
    const discrepancies: string[] = [];
    
    // Check for missing punches
    const inPunches = punches.filter(p => p.punchType === 'IN').length;
    const outPunches = punches.filter(p => p.punchType === 'OUT').length;
    
    if (inPunches !== outPunches) {
      discrepancies.push('Missing punch-in or punch-out');
    }

    return discrepancies;
  }

  private calculateERGANICompliance(workCards: WorkCard[]): number {
    // Mock implementation - would calculate actual ERGANI submission rate
    return 0.98; // 98% compliance rate
  }

  private calculateGeolocationAccuracy(workCards: WorkCard[]): number {
    // Mock implementation - would calculate average geolocation accuracy
    return 95.5; // 95.5% accuracy
  }

  private generatePackSignature(packId: string, workCards: WorkCard[]): string {
    const signatureData = packId + workCards.length + workCards.reduce((sum, card) => sum + card.totalHours, 0);
    return createHash('sha256').update(signatureData).digest('hex').substring(0, 16).toUpperCase();
  }
}

export const digitalCardPackGenerator = new DigitalCardPackGenerator();