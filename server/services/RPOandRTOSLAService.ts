/**
 * RPO and RTO SLA Service
 * Manages formal service level agreements for disaster recovery objectives
 */

import { db } from '../db';
import { drSLAs, backupMonitoring, type DRSLA, type InsertDRSLA } from '@shared/schema';
import { eq, desc, and, gte, lte, or } from 'drizzle-orm';

export interface SLABreach {
  breachId: string;
  slaId: string;
  breachType: 'rto' | 'rpo' | 'availability';
  breachTime: Date;
  targetValue: number;
  actualValue: number;
  severity: 'minor' | 'major' | 'critical';
  impactDescription: string;
  rootCause?: string;
  resolutionActions?: string[];
  businessImpact: number; // Cost in EUR
}

export interface SLAMetrics {
  periodStart: Date;
  periodEnd: Date;
  availability: number; // Percentage
  actualRTO: number; // Minutes
  actualRPO: number; // Minutes
  downtime: number; // Minutes
  breachCount: number;
  complianceScore: number; // 0-100
}

export interface EscalationContact {
  level: number;
  role: string;
  name: string;
  email: string;
  phone: string;
  responseTime: number; // Minutes
}

export class RPOandRTOSLAService {
  /**
   * Create a new disaster recovery SLA
   */
  static async createSLA(sla: InsertDRSLA): Promise<DRSLA> {
    // Validate SLA parameters
    this.validateSLAParameters(sla);

    // Set review date (annual by default)
    const reviewDate = new Date();
    reviewDate.setFullYear(reviewDate.getFullYear() + 1);

    const [newSLA] = await db
      .insert(drSLAs)
      .values({
        ...sla,
        reviewDate: sla.reviewDate || reviewDate,
      })
      .returning();

    return newSLA;
  }

  /**
   * Get standard SLA templates for different service criticalities
   */
  static getStandardSLATemplates(): Partial<InsertDRSLA>[] {
    return [
      {
        serviceName: 'Core Payroll Processing',
        criticality: 'critical',
        businessFunction: 'Payroll Operations',
        rtoMinutes: 60, // 1 hour
        rpoMinutes: 15, // 15 minutes
        availabilityTarget: 0.9995, // 99.95%
        maxDowntimePerMonth: 22, // ~22 minutes per month
        backupFrequency: 'continuous',
        testingFrequency: 'monthly',
        escalationContacts: [
          { level: 1, role: 'Operations Manager', responseTime: 15 },
          { level: 2, role: 'IT Director', responseTime: 30 },
          { level: 3, role: 'CTO', responseTime: 60 },
        ],
        businessImpactStatement: 'Critical service affecting employee payments and Greek regulatory compliance. Downtime directly impacts payroll deadlines and legal obligations.',
      },
      {
        serviceName: 'Employee Database',
        criticality: 'high',
        businessFunction: 'HR Management',
        rtoMinutes: 240, // 4 hours
        rpoMinutes: 60, // 1 hour
        availabilityTarget: 0.999, // 99.9%
        maxDowntimePerMonth: 44, // ~44 minutes per month
        backupFrequency: 'hourly',
        testingFrequency: 'quarterly',
        escalationContacts: [
          { level: 1, role: 'HR Manager', responseTime: 30 },
          { level: 2, role: 'Operations Manager', responseTime: 60 },
          { level: 3, role: 'IT Director', responseTime: 120 },
        ],
        businessImpactStatement: 'High priority service supporting HR operations and employee data management. Extended downtime affects daily HR operations.',
      },
      {
        serviceName: 'Time Tracking System',
        criticality: 'medium',
        businessFunction: 'Time Management',
        rtoMinutes: 480, // 8 hours
        rpoMinutes: 240, // 4 hours
        availabilityTarget: 0.995, // 99.5%
        maxDowntimePerMonth: 220, // ~3.7 hours per month
        backupFrequency: 'daily',
        testingFrequency: 'quarterly',
        escalationContacts: [
          { level: 1, role: 'Operations Coordinator', responseTime: 60 },
          { level: 2, role: 'Operations Manager', responseTime: 120 },
        ],
        businessImpactStatement: 'Medium priority service supporting time tracking and attendance. Temporary unavailability can be compensated with manual processes.',
      },
      {
        serviceName: 'Reporting and Analytics',
        criticality: 'low',
        businessFunction: 'Business Intelligence',
        rtoMinutes: 1440, // 24 hours
        rpoMinutes: 480, // 8 hours
        availabilityTarget: 0.99, // 99%
        maxDowntimePerMonth: 440, // ~7.3 hours per month
        backupFrequency: 'daily',
        testingFrequency: 'semi-annually',
        escalationContacts: [
          { level: 1, role: 'Analytics Team Lead', responseTime: 240 },
        ],
        businessImpactStatement: 'Lower priority service for reporting and analytics. Temporary unavailability has minimal immediate business impact.',
      },
    ];
  }

  /**
   * Validate SLA parameters for consistency and feasibility
   */
  private static validateSLAParameters(sla: InsertDRSLA): void {
    // RTO should be realistic (not less than 5 minutes for critical systems)
    if (sla.rtoMinutes < 5) {
      throw new Error('RTO must be at least 5 minutes for any system');
    }

    // RPO should not exceed RTO
    if (sla.rpoMinutes > sla.rtoMinutes) {
      throw new Error('RPO cannot exceed RTO');
    }

    // Availability target should be reasonable
    if (sla.availabilityTarget < 0.9 || sla.availabilityTarget > 1) {
      throw new Error('Availability target must be between 90% and 100%');
    }

    // Max downtime should align with availability target
    const monthlyMinutes = 30 * 24 * 60; // 43,200 minutes per month
    const expectedDowntime = monthlyMinutes * (1 - sla.availabilityTarget);
    
    if (Math.abs(sla.maxDowntimePerMonth - expectedDowntime) > expectedDowntime * 0.1) {
      console.warn(`Max downtime (${sla.maxDowntimePerMonth}min) doesn't align with availability target (${sla.availabilityTarget}). Expected: ${expectedDowntime.toFixed(1)}min`);
    }

    // Validate escalation contacts structure
    if (sla.escalationContacts && Array.isArray(sla.escalationContacts)) {
      const contacts = sla.escalationContacts as EscalationContact[];
      if (contacts.length === 0) {
        throw new Error('At least one escalation contact is required');
      }
      
      // Ensure escalation levels are sequential
      const levels = contacts.map(c => c.level).sort((a, b) => a - b);
      for (let i = 0; i < levels.length; i++) {
        if (levels[i] !== i + 1) {
          throw new Error('Escalation levels must be sequential starting from 1');
        }
      }
    }
  }

  /**
   * Monitor SLA compliance and detect breaches
   */
  static async monitorSLACompliance(slaId: string, incident: {
    incidentType: 'outage' | 'performance' | 'data_loss';
    startTime: Date;
    endTime?: Date;
    affectedServices: string[];
    actualRTO?: number;
    actualRPO?: number;
    rootCause?: string;
  }): Promise<SLABreach[]> {
    const sla = await this.getSLA(slaId);
    if (!sla) {
      throw new Error('SLA not found');
    }

    const breaches: SLABreach[] = [];
    const incidentDuration = incident.endTime 
      ? Math.round((incident.endTime.getTime() - incident.startTime.getTime()) / (1000 * 60))
      : 0;

    // Check RTO breach
    if (incident.actualRTO && incident.actualRTO > sla.rtoMinutes) {
      breaches.push({
        breachId: crypto.randomUUID(),
        slaId: sla.id,
        breachType: 'rto',
        breachTime: incident.startTime,
        targetValue: sla.rtoMinutes,
        actualValue: incident.actualRTO,
        severity: this.calculateBreachSeverity(incident.actualRTO, sla.rtoMinutes, sla.criticality),
        impactDescription: `Recovery time of ${incident.actualRTO} minutes exceeded target of ${sla.rtoMinutes} minutes`,
        rootCause: incident.rootCause,
        businessImpact: this.calculateBusinessImpact(sla, incidentDuration),
      });
    }

    // Check RPO breach
    if (incident.actualRPO && incident.actualRPO > sla.rpoMinutes) {
      breaches.push({
        breachId: crypto.randomUUID(),
        slaId: sla.id,
        breachType: 'rpo',
        breachTime: incident.startTime,
        targetValue: sla.rpoMinutes,
        actualValue: incident.actualRPO,
        severity: this.calculateBreachSeverity(incident.actualRPO, sla.rpoMinutes, sla.criticality),
        impactDescription: `Recovery point objective of ${incident.actualRPO} minutes exceeded target of ${sla.rpoMinutes} minutes`,
        rootCause: incident.rootCause,
        businessImpact: this.calculateBusinessImpact(sla, incident.actualRPO),
      });
    }

    // Update SLA breach tracking
    if (breaches.length > 0) {
      const lastBreach = breaches.find(b => b.breachType === 'rto') ? incident.startTime : undefined;
      const lastRPOBreach = breaches.find(b => b.breachType === 'rpo') ? incident.startTime : undefined;

      await db
        .update(drSLAs)
        .set({
          lastIncidentAt: incident.startTime,
          lastRTOBreach: lastBreach,
          lastRPOBreach: lastRPOBreach,
          currentStatus: 'breach',
          complianceScore: Math.max(0, (sla.complianceScore || 100) - breaches.length * 10),
          updatedAt: new Date(),
        })
        .where(eq(drSLAs.id, slaId));

      // Trigger escalation procedures
      await this.triggerEscalation(sla, breaches);
    }

    return breaches;
  }

  /**
   * Calculate breach severity based on deviation and service criticality
   */
  private static calculateBreachSeverity(actual: number, target: number, criticality: string): 'minor' | 'major' | 'critical' {
    const deviation = ((actual - target) / target) * 100;
    
    switch (criticality) {
      case 'critical':
        if (deviation > 50) return 'critical';
        if (deviation > 20) return 'major';
        return 'minor';
      case 'high':
        if (deviation > 100) return 'critical';
        if (deviation > 50) return 'major';
        return 'minor';
      default:
        if (deviation > 200) return 'critical';
        if (deviation > 100) return 'major';
        return 'minor';
    }
  }

  /**
   * Calculate business impact cost in EUR
   */
  private static calculateBusinessImpact(sla: DRSLA, downtime: number): number {
    // Base cost per minute by criticality
    const costPerMinute = {
      critical: 1000, // €1000/minute
      high: 500,     // €500/minute  
      medium: 100,   // €100/minute
      low: 20,       // €20/minute
    };

    const baseRate = costPerMinute[sla.criticality as keyof typeof costPerMinute] || 50;
    
    // Additional cost for extended outages (exponential)
    const extensionMultiplier = downtime > 60 ? Math.pow(1.5, Math.floor(downtime / 60)) : 1;
    
    return Math.round(baseRate * downtime * extensionMultiplier);
  }

  /**
   * Trigger escalation procedures for SLA breaches
   */
  private static async triggerEscalation(sla: DRSLA, breaches: SLABreach[]): Promise<void> {
    if (!sla.escalationContacts || !Array.isArray(sla.escalationContacts)) {
      console.warn(`No escalation contacts defined for SLA ${sla.id}`);
      return;
    }

    const contacts = sla.escalationContacts as EscalationContact[];
    const highestSeverity = breaches.reduce((max, breach) => {
      const severityLevels = { minor: 1, major: 2, critical: 3 };
      const current = severityLevels[breach.severity];
      const maxLevel = severityLevels[max];
      return current > maxLevel ? breach.severity : max;
    }, 'minor');

    // Determine escalation level based on severity
    let escalationLevel = 1;
    if (highestSeverity === 'major') escalationLevel = 2;
    if (highestSeverity === 'critical') escalationLevel = 3;

    // Notify appropriate escalation levels
    for (let level = 1; level <= escalationLevel; level++) {
      const contact = contacts.find(c => c.level === level);
      if (contact) {
        await this.notifyContact(contact, sla, breaches);
      }
    }
  }

  /**
   * Notify escalation contact about SLA breach
   */
  private static async notifyContact(contact: EscalationContact, sla: DRSLA, breaches: SLABreach[]): Promise<void> {
    const breachSummary = breaches.map(b => 
      `${b.breachType.toUpperCase()}: ${b.actualValue}min (target: ${b.targetValue}min)`
    ).join(', ');

    console.error(`SLA BREACH ESCALATION - Level ${contact.level}`, {
      service: sla.serviceName,
      contact: contact.email,
      breaches: breachSummary,
      totalImpact: breaches.reduce((sum, b) => sum + b.businessImpact, 0),
    });

    // In production, integrate with:
    // - Email notifications
    // - SMS alerts  
    // - PagerDuty/OpsGenie
    // - Slack/Teams notifications
    // - Incident management systems
  }

  /**
   * Calculate SLA metrics for a given period
   */
  static async calculateSLAMetrics(slaId: string, periodStart: Date, periodEnd: Date): Promise<SLAMetrics> {
    const sla = await this.getSLA(slaId);
    if (!sla) {
      throw new Error('SLA not found');
    }

    // Get backup monitoring data for the period
    const backups = await db
      .select()
      .from(backupMonitoring)
      .where(
        and(
          eq(backupMonitoring.drSlaId, slaId),
          gte(backupMonitoring.startTime, periodStart),
          lte(backupMonitoring.startTime, periodEnd)
        )
      );

    // Calculate total period time in minutes
    const totalPeriodMinutes = Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60));
    
    // Calculate downtime from failed backups and incidents
    const failedBackups = backups.filter(b => b.status === 'failed');
    const downtime = failedBackups.reduce((sum, b) => {
      return sum + (b.backupDuration || 0);
    }, 0);

    // Calculate availability
    const availability = ((totalPeriodMinutes - downtime) / totalPeriodMinutes) * 100;

    // Calculate average RTO and RPO from successful restores
    const successfulBackups = backups.filter(b => b.status === 'success');
    const avgRTO = successfulBackups.length > 0
      ? successfulBackups.reduce((sum, b) => sum + (b.backupDuration || 0), 0) / successfulBackups.length
      : 0;

    // Estimate RPO based on backup frequency
    const avgRPO = this.estimateRPO(sla.backupFrequency);

    // Count breaches (simulated - in production, track actual breaches)
    const breachCount = failedBackups.length + 
      (availability < sla.availabilityTarget * 100 ? 1 : 0) +
      (avgRTO > sla.rtoMinutes ? 1 : 0);

    // Calculate compliance score
    let complianceScore = 100;
    if (availability < sla.availabilityTarget * 100) complianceScore -= 20;
    if (avgRTO > sla.rtoMinutes) complianceScore -= 25;
    if (avgRPO > sla.rpoMinutes) complianceScore -= 25;
    complianceScore = Math.max(0, complianceScore - (breachCount * 10));

    return {
      periodStart,
      periodEnd,
      availability: Math.round(availability * 100) / 100,
      actualRTO: Math.round(avgRTO),
      actualRPO: Math.round(avgRPO),
      downtime: Math.round(downtime),
      breachCount,
      complianceScore: Math.round(complianceScore),
    };
  }

  /**
   * Estimate RPO based on backup frequency
   */
  private static estimateRPO(backupFrequency: string): number {
    const rpoEstimates: Record<string, number> = {
      'continuous': 1,
      'hourly': 30,
      'daily': 720, // 12 hours average
      'weekly': 5040, // 3.5 days average
    };

    return rpoEstimates[backupFrequency] || 60;
  }

  /**
   * Generate SLA compliance dashboard data
   */
  static async generateSLADashboard(): Promise<{
    totalSLAs: number;
    compliantSLAs: number;
    breachedSLAs: number;
    overallComplianceScore: number;
    criticalServices: DRSLA[];
    recentBreaches: number;
    upcomingReviews: DRSLA[];
  }> {
    const allSLAs = await db
      .select()
      .from(drSLAs)
      .where(eq(drSLAs.isActive, true));

    const totalSLAs = allSLAs.length;
    const compliantSLAs = allSLAs.filter(sla => sla.currentStatus === 'compliant').length;
    const breachedSLAs = allSLAs.filter(sla => sla.currentStatus === 'breach').length;

    const overallComplianceScore = allSLAs.length > 0
      ? Math.round(allSLAs.reduce((sum, sla) => sum + (sla.complianceScore || 100), 0) / allSLAs.length)
      : 100;

    const criticalServices = allSLAs
      .filter(sla => sla.criticality === 'critical')
      .sort((a, b) => (a.complianceScore || 100) - (b.complianceScore || 100));

    // Count recent breaches (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentBreaches = allSLAs.filter(sla => 
      sla.lastRTOBreach && new Date(sla.lastRTOBreach) >= thirtyDaysAgo ||
      sla.lastRPOBreach && new Date(sla.lastRPOBreach) >= thirtyDaysAgo
    ).length;

    // Get upcoming reviews (next 60 days)
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    
    const upcomingReviews = allSLAs
      .filter(sla => new Date(sla.reviewDate) <= sixtyDaysFromNow)
      .sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime())
      .slice(0, 5);

    return {
      totalSLAs,
      compliantSLAs,
      breachedSLAs,
      overallComplianceScore,
      criticalServices,
      recentBreaches,
      upcomingReviews,
    };
  }

  /**
   * Get SLA by ID
   */
  static async getSLA(slaId: string): Promise<DRSLA | null> {
    const [sla] = await db
      .select()
      .from(drSLAs)
      .where(eq(drSLAs.id, slaId));

    return sla || null;
  }

  /**
   * List SLAs with filtering options
   */
  static async listSLAs(filters: {
    criticality?: string;
    status?: string;
    businessFunction?: string;
    isActive?: boolean;
    limit?: number;
  } = {}): Promise<DRSLA[]> {
    let query = db.select().from(drSLAs);

    const conditions = [];
    
    if (filters.criticality) {
      conditions.push(eq(drSLAs.criticality, filters.criticality));
    }
    
    if (filters.status) {
      conditions.push(eq(drSLAs.currentStatus, filters.status));
    }
    
    if (filters.businessFunction) {
      conditions.push(eq(drSLAs.businessFunction, filters.businessFunction));
    }
    
    if (filters.isActive !== undefined) {
      conditions.push(eq(drSLAs.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(drSLAs.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  }

  /**
   * Update SLA configuration
   */
  static async updateSLA(slaId: string, updates: Partial<InsertDRSLA>): Promise<DRSLA> {
    // Validate updated parameters
    if (updates.rtoMinutes || updates.rpoMinutes || updates.availabilityTarget) {
      const currentSLA = await this.getSLA(slaId);
      if (currentSLA) {
        const updatedSLA = { ...currentSLA, ...updates };
        this.validateSLAParameters(updatedSLA);
      }
    }

    const [updatedSLA] = await db
      .update(drSLAs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(drSLAs.id, slaId))
      .returning();

    if (!updatedSLA) {
      throw new Error('SLA not found');
    }

    return updatedSLA;
  }

  /**
   * Archive SLA (soft delete)
   */
  static async archiveSLA(slaId: string): Promise<void> {
    await db
      .update(drSLAs)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(drSLAs.id, slaId));
  }
}

import crypto from 'crypto';