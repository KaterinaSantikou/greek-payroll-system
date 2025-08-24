/**
 * Findings/Vuln Service - Pen-test import, dedupe, triage, SLAs, retest
 */

import { db } from '../db';
import { 
  vulnerabilityFindings, 
  remediationTracking,
  auditStore,
  type VulnerabilityFinding,
  type InsertVulnerabilityFinding,
  type RemediationTracking,
  type InsertRemediationTracking
} from '@shared/grcSchema';
import { eq, and, desc, sql, lte, gte } from 'drizzle-orm';
import { createHash } from 'crypto';

export interface PenTestImport {
  source: string;
  findings: Array<{
    findingId: string;
    title: string;
    description: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
    cvssScore?: number;
    recommendation?: string;
    affectedAssets?: string[];
    discoveredAt: Date;
  }>;
}

export interface FindingSLA {
  critical: number; // days
  high: number;
  medium: number;
  low: number;
}

export class FindingsService {
  private static readonly DEFAULT_SLA: FindingSLA = {
    critical: 1,    // 1 day for critical
    high: 7,        // 1 week for high
    medium: 30,     // 1 month for medium
    low: 90,        // 3 months for low
  };

  /**
   * Import pen-test findings with automatic deduplication
   */
  static async importPenTestFindings(
    tenantId: string, 
    importData: PenTestImport,
    userId: string
  ): Promise<{
    imported: number;
    duplicates: number;
    errors: string[];
  }> {
    let imported = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const finding of importData.findings) {
      try {
        // Check for existing finding (dedupe by findingId)
        const existing = await db
          .select()
          .from(vulnerabilityFindings)
          .where(and(
            eq(vulnerabilityFindings.tenantId, tenantId),
            eq(vulnerabilityFindings.findingId, finding.findingId)
          ))
          .limit(1);

        if (existing.length > 0) {
          duplicates++;
          continue;
        }

        // Calculate SLA due date
        const dueDate = this.calculateSLADueDate(finding.severity);

        // Insert new finding
        const newFinding = await db
          .insert(vulnerabilityFindings)
          .values({
            tenantId,
            findingId: finding.findingId,
            source: importData.source,
            severity: finding.severity,
            cvssScore: finding.cvssScore?.toString() || null,
            title: finding.title,
            description: finding.description,
            recommendation: finding.recommendation,
            affectedAssets: finding.affectedAssets || [],
            status: 'Open',
            dueDate,
            discoveredAt: finding.discoveredAt,
          } as InsertVulnerabilityFinding)
          .returning();

        // Log import to audit store
        await this.logAuditEvent('Finding', newFinding[0].id, 'Imported', {
          source: importData.source,
          severity: finding.severity,
          findingId: finding.findingId,
        }, userId, tenantId);

        imported++;
      } catch (error) {
        errors.push(`Failed to import finding ${finding.findingId}: ${error.message}`);
      }
    }

    console.log(`📥 Imported findings: ${imported} new, ${duplicates} duplicates, ${errors.length} errors`);
    
    return { imported, duplicates, errors };
  }

  /**
   * Triage findings - assign, set priority, update status
   */
  static async triageFinding(
    tenantId: string,
    findingId: string,
    triage: {
      assignee?: string;
      status?: string;
      riskAcceptance?: any;
      notes?: string;
    },
    userId: string
  ): Promise<VulnerabilityFinding> {
    const updates: any = { updatedAt: new Date() };

    if (triage.assignee) updates.assignee = triage.assignee;
    if (triage.status) updates.status = triage.status;
    if (triage.riskAcceptance) updates.riskAcceptance = triage.riskAcceptance;

    // Set resolved date if status is changing to resolved
    if (triage.status === 'Resolved') {
      updates.resolvedAt = new Date();
    }

    const result = await db
      .update(vulnerabilityFindings)
      .set(updates)
      .where(and(
        eq(vulnerabilityFindings.tenantId, tenantId),
        eq(vulnerabilityFindings.id, findingId)
      ))
      .returning();

    if (result.length === 0) {
      throw new Error('Finding not found');
    }

    // Log triage action
    await this.logAuditEvent('Finding', findingId, 'Triaged', {
      triage,
      notes: triage.notes,
    }, userId, tenantId);

    return result[0];
  }

  /**
   * Add remediation action to finding
   */
  static async addRemediation(
    tenantId: string,
    findingId: string,
    remediation: Omit<InsertRemediationTracking, 'tenantId' | 'findingId'>,
    userId: string
  ): Promise<RemediationTracking> {
    // Verify finding exists
    const finding = await db
      .select()
      .from(vulnerabilityFindings)
      .where(and(
        eq(vulnerabilityFindings.tenantId, tenantId),
        eq(vulnerabilityFindings.id, findingId)
      ))
      .limit(1);

    if (finding.length === 0) {
      throw new Error('Finding not found');
    }

    // Add remediation
    const result = await db
      .insert(remediationTracking)
      .values({
        tenantId,
        findingId,
        ...remediation,
        performedBy: userId,
      } as InsertRemediationTracking)
      .returning();

    // Update finding status if not already in progress
    if (finding[0].status === 'Open') {
      await db
        .update(vulnerabilityFindings)
        .set({ 
          status: 'InProgress',
          updatedAt: new Date()
        })
        .where(eq(vulnerabilityFindings.id, findingId));
    }

    // Log remediation
    await this.logAuditEvent('Remediation', result[0].id, 'Added', {
      findingId,
      action: remediation.action,
      actionType: remediation.actionType,
    }, userId, tenantId);

    return result[0];
  }

  /**
   * Request retest for finding
   */
  static async requestRetest(
    tenantId: string,
    findingId: string,
    userId: string
  ): Promise<VulnerabilityFinding> {
    const result = await db
      .update(vulnerabilityFindings)
      .set({ 
        retestRequested: true,
        status: 'InProgress',
        updatedAt: new Date()
      })
      .where(and(
        eq(vulnerabilityFindings.tenantId, tenantId),
        eq(vulnerabilityFindings.id, findingId)
      ))
      .returning();

    if (result.length === 0) {
      throw new Error('Finding not found');
    }

    await this.logAuditEvent('Finding', findingId, 'RetestRequested', {
      requestedBy: userId,
    }, userId, tenantId);

    return result[0];
  }

  /**
   * Mark retest as completed
   */
  static async completeRetest(
    tenantId: string,
    findingId: string,
    result: 'Verified' | 'NotFixed',
    evidence?: any,
    userId?: string
  ): Promise<VulnerabilityFinding> {
    const updates: any = {
      retestRequested: false,
      retestCompletedAt: new Date(),
      updatedAt: new Date(),
    };

    if (result === 'Verified') {
      updates.status = 'Resolved';
      updates.resolvedAt = new Date();
    } else {
      updates.status = 'Open'; // Back to open if not fixed
    }

    const findingResult = await db
      .update(vulnerabilityFindings)
      .set(updates)
      .where(and(
        eq(vulnerabilityFindings.tenantId, tenantId),
        eq(vulnerabilityFindings.id, findingId)
      ))
      .returning();

    if (findingResult.length === 0) {
      throw new Error('Finding not found');
    }

    // Add retest remediation record if evidence provided
    if (evidence && userId) {
      await db.insert(remediationTracking).values({
        tenantId,
        findingId,
        action: `Retest completed: ${result}`,
        actionType: 'Process',
        evidence,
        performedBy: userId,
        verified: result === 'Verified',
        verifiedAt: result === 'Verified' ? new Date() : null,
      } as InsertRemediationTracking);
    }

    await this.logAuditEvent('Finding', findingId, 'RetestCompleted', {
      result,
      evidence: !!evidence,
    }, userId || 'system', tenantId);

    return findingResult[0];
  }

  /**
   * Get findings dashboard with SLA tracking
   */
  static async getFindingsDashboard(tenantId: string): Promise<{
    summary: {
      total: number;
      open: number;
      inProgress: number;
      resolved: number;
      overdue: number;
    };
    bySeverity: Record<string, number>;
    bySource: Record<string, number>;
    slaStatus: {
      onTime: number;
      atRisk: number;
      overdue: number;
    };
    recentFindings: any[];
  }> {
    // Get all findings for tenant
    const allFindings = await db
      .select()
      .from(vulnerabilityFindings)
      .where(eq(vulnerabilityFindings.tenantId, tenantId));

    const now = new Date();

    // Calculate summary
    const summary = {
      total: allFindings.length,
      open: allFindings.filter(f => f.status === 'Open').length,
      inProgress: allFindings.filter(f => f.status === 'InProgress').length,
      resolved: allFindings.filter(f => f.status === 'Resolved').length,
      overdue: allFindings.filter(f => f.dueDate && f.dueDate < now && f.status !== 'Resolved').length,
    };

    // Group by severity
    const bySeverity = allFindings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by source
    const bySource = allFindings.reduce((acc, finding) => {
      acc[finding.source] = (acc[finding.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // SLA status for open/in-progress findings
    const activeFindings = allFindings.filter(f => ['Open', 'InProgress'].includes(f.status));
    const slaStatus = {
      onTime: 0,
      atRisk: 0,
      overdue: 0,
    };

    activeFindings.forEach(finding => {
      if (!finding.dueDate) return;
      
      const daysUntilDue = Math.ceil((finding.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        slaStatus.overdue++;
      } else if (daysUntilDue <= 2) {
        slaStatus.atRisk++;
      } else {
        slaStatus.onTime++;
      }
    });

    // Recent findings
    const recentFindings = await db
      .select()
      .from(vulnerabilityFindings)
      .where(eq(vulnerabilityFindings.tenantId, tenantId))
      .orderBy(desc(vulnerabilityFindings.discoveredAt))
      .limit(10);

    return {
      summary,
      bySeverity,
      bySource,
      slaStatus,
      recentFindings,
    };
  }

  /**
   * Get findings with remediation history
   */
  static async getFindingDetails(tenantId: string, findingId: string): Promise<{
    finding: VulnerabilityFinding;
    remediations: RemediationTracking[];
  }> {
    const finding = await db
      .select()
      .from(vulnerabilityFindings)
      .where(and(
        eq(vulnerabilityFindings.tenantId, tenantId),
        eq(vulnerabilityFindings.id, findingId)
      ))
      .limit(1);

    if (finding.length === 0) {
      throw new Error('Finding not found');
    }

    const remediations = await db
      .select()
      .from(remediationTracking)
      .where(eq(remediationTracking.findingId, findingId))
      .orderBy(desc(remediationTracking.performedAt));

    return {
      finding: finding[0],
      remediations,
    };
  }

  /**
   * Private helper methods
   */
  private static calculateSLADueDate(severity: string): Date {
    const now = new Date();
    const sla = this.DEFAULT_SLA;
    
    let days: number;
    switch (severity.toLowerCase()) {
      case 'critical':
        days = sla.critical;
        break;
      case 'high':
        days = sla.high;
        break;
      case 'medium':
        days = sla.medium;
        break;
      case 'low':
        days = sla.low;
        break;
      default:
        days = sla.medium;
    }

    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private static async logAuditEvent(
    eventType: string,
    entityId: string,
    action: string,
    eventData: any,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const contentHash = createHash('sha256')
        .update(JSON.stringify(eventData))
        .digest('hex');

      await db.insert(auditStore).values({
        tenantId,
        eventType,
        entityId,
        eventAction: action,
        eventData,
        contentHash,
        actor: userId,
        actorType: 'user',
        userId: userId
      });
    } catch (e: any) {
      console.warn('[Audit][soft-fail]', e.code, { 
        eventType: eventType, 
        entityId: entityId, 
        userId: userId 
      });
    }
  }
}