/**
 * GRC Service - Governance, Risk & Compliance Management
 * Handles ISO 27001:2022 + SOC 2 controls, evidence, SoA, and risk management
 */

import { db } from '../db';
import { 
  controlsFramework, 
  statementOfApplicability, 
  evidenceLibrary, 
  riskRegister,
  auditStore,
  type ControlsFramework,
  type StatementOfApplicability,
  type EvidenceLibrary,
  type RiskRegister,
  type InsertStatementOfApplicability,
  type InsertEvidenceLibrary,
  type InsertRiskRegister
} from '@shared/grcSchema';
import { eq, and, desc, sql } from 'drizzle-orm';
// import { AuditService } from './AuditService'; // Will implement later
import { createHash } from 'crypto';

export class GRCService {
  /**
   * Initialize ISO 27001:2022 + SOC 2 controls framework
   */
  static async initializeControlsFramework(): Promise<void> {
    const iso27001Controls = [
      // A.5 Information Security Policies
      { framework: 'ISO27001', domain: 'A.5', controlId: 'A.5.1', title: 'Information security policies', category: 'Policy', riskLevel: 'High', automatable: false },
      { framework: 'ISO27001', domain: 'A.5', controlId: 'A.5.2', title: 'Information security roles and responsibilities', category: 'Policy', riskLevel: 'High', automatable: true },
      { framework: 'ISO27001', domain: 'A.5', controlId: 'A.5.3', title: 'Segregation of duties', category: 'Policy', riskLevel: 'High', automatable: true },
      
      // A.6 Organization of Information Security
      { framework: 'ISO27001', domain: 'A.6', controlId: 'A.6.1', title: 'Information security management system', category: 'Governance', riskLevel: 'Critical', automatable: false },
      { framework: 'ISO27001', domain: 'A.6', controlId: 'A.6.2', title: 'Contact with authorities', category: 'Governance', riskLevel: 'Medium', automatable: false },
      { framework: 'ISO27001', domain: 'A.6', controlId: 'A.6.3', title: 'Contact with special interest groups', category: 'Governance', riskLevel: 'Medium', automatable: false },
      
      // A.7 Human Resource Security
      { framework: 'ISO27001', domain: 'A.7', controlId: 'A.7.1', title: 'Screening', category: 'HR', riskLevel: 'High', automatable: false },
      { framework: 'ISO27001', domain: 'A.7', controlId: 'A.7.2', title: 'Terms and conditions of employment', category: 'HR', riskLevel: 'High', automatable: false },
      { framework: 'ISO27001', domain: 'A.7', controlId: 'A.7.3', title: 'Disciplinary process', category: 'HR', riskLevel: 'Medium', automatable: false },
      
      // A.8 Asset Management
      { framework: 'ISO27001', domain: 'A.8', controlId: 'A.8.1', title: 'Inventory of assets', category: 'Asset', riskLevel: 'High', automatable: true },
      { framework: 'ISO27001', domain: 'A.8', controlId: 'A.8.2', title: 'Ownership of assets', category: 'Asset', riskLevel: 'High', automatable: true },
      { framework: 'ISO27001', domain: 'A.8', controlId: 'A.8.3', title: 'Acceptable use of assets', category: 'Asset', riskLevel: 'Medium', automatable: true },
    ];

    const soc2Controls = [
      // Security (Common Criteria)
      { framework: 'SOC2', domain: 'CC', controlId: 'CC6.1', title: 'Logical and physical access controls', category: 'Security', riskLevel: 'Critical', automatable: true },
      { framework: 'SOC2', domain: 'CC', controlId: 'CC6.2', title: 'Authentication mechanisms', category: 'Security', riskLevel: 'Critical', automatable: true },
      { framework: 'SOC2', domain: 'CC', controlId: 'CC6.3', title: 'Authorization mechanisms', category: 'Security', riskLevel: 'Critical', automatable: true },
      { framework: 'SOC2', domain: 'CC', controlId: 'CC7.1', title: 'System boundaries and data classification', category: 'Security', riskLevel: 'High', automatable: true },
      { framework: 'SOC2', domain: 'CC', controlId: 'CC7.2', title: 'Data retention and disposal', category: 'Security', riskLevel: 'High', automatable: false },
      
      // Availability
      { framework: 'SOC2', domain: 'A', controlId: 'A1.1', title: 'System availability and performance monitoring', category: 'Availability', riskLevel: 'High', automatable: true },
      { framework: 'SOC2', domain: 'A', controlId: 'A1.2', title: 'Incident response and recovery', category: 'Availability', riskLevel: 'High', automatable: false },
      
      // Confidentiality
      { framework: 'SOC2', domain: 'C', controlId: 'C1.1', title: 'Confidential information protection', category: 'Confidentiality', riskLevel: 'Critical', automatable: true },
      { framework: 'SOC2', domain: 'C', controlId: 'C1.2', title: 'Encryption of confidential data', category: 'Confidentiality', riskLevel: 'Critical', automatable: true },
    ];

    const allControls = [...iso27001Controls, ...soc2Controls].map(control => ({
      id: `${control.framework.toLowerCase()}_${control.controlId.toLowerCase().replace('.', '_')}`,
      ...control,
      description: `${control.title} - Implementation guidance and requirements for ${control.framework} ${control.controlId}`,
    }));

    for (const control of allControls) {
      await db.insert(controlsFramework)
        .values(control)
        .onConflictDoNothing();
    }

    console.log(`📋 Initialized ${allControls.length} controls framework entries`);
  }

  /**
   * Get Statement of Applicability for tenant
   */
  static async getStatementOfApplicability(tenantId: string): Promise<{
    controls: any[];
    summary: {
      total: number;
      applicable: number;
      implemented: number;
      inProgress: number;
      notStarted: number;
    };
  }> {
    const soaQuery = db
      .select({
        control: controlsFramework,
        soa: statementOfApplicability,
        evidenceCount: sql<number>`COUNT(${evidenceLibrary.id})`,
      })
      .from(controlsFramework)
      .leftJoin(statementOfApplicability, and(
        eq(statementOfApplicability.controlId, controlsFramework.id),
        eq(statementOfApplicability.tenantId, tenantId)
      ))
      .leftJoin(evidenceLibrary, and(
        eq(evidenceLibrary.controlId, controlsFramework.id),
        eq(evidenceLibrary.tenantId, tenantId)
      ))
      .groupBy(controlsFramework.id, statementOfApplicability.id);

    const results = await soaQuery;

    const controls = results.map(row => ({
      ...row.control,
      soa: row.soa,
      evidenceCount: Number(row.evidenceCount),
      implementationProgress: this.calculateImplementationProgress(row.soa, Number(row.evidenceCount)),
    }));

    // Calculate summary statistics
    const summary = {
      total: controls.length,
      applicable: controls.filter(c => c.soa?.status === 'Applicable').length,
      implemented: controls.filter(c => c.soa?.implementationStatus === 'Implemented').length,
      inProgress: controls.filter(c => c.soa?.implementationStatus === 'InProgress').length,
      notStarted: controls.filter(c => !c.soa || c.soa.implementationStatus === 'NotStarted').length,
    };

    return { controls, summary };
  }

  /**
   * Update Statement of Applicability
   */
  static async updateSoA(
    tenantId: string, 
    controlId: string, 
    data: Partial<InsertStatementOfApplicability>,
    userId: string
  ): Promise<StatementOfApplicability> {
    const existing = await db
      .select()
      .from(statementOfApplicability)
      .where(and(
        eq(statementOfApplicability.tenantId, tenantId),
        eq(statementOfApplicability.controlId, controlId)
      ))
      .limit(1);

    let result;
    if (existing.length > 0) {
      result = await db
        .update(statementOfApplicability)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(statementOfApplicability.id, existing[0].id))
        .returning();
    } else {
      result = await db
        .insert(statementOfApplicability)
        .values({
          tenantId,
          controlId,
          ...data,
        } as InsertStatementOfApplicability)
        .returning();
    }

    // Log to audit store
    await this.logAuditEvent('Control', controlId, 'SoA_Updated', result[0], userId, tenantId);

    return result[0];
  }

  /**
   * Upload evidence for control
   */
  static async uploadEvidence(
    tenantId: string,
    controlId: string,
    evidence: Omit<InsertEvidenceLibrary, 'tenantId' | 'controlId'>,
    userId: string
  ): Promise<EvidenceLibrary> {
    // Generate content hash for immutability
    const contentHash = evidence.filePath ? 
      createHash('sha256').update(`${evidence.filePath}:${Date.now()}`).digest('hex') : 
      createHash('sha256').update(JSON.stringify(evidence)).digest('hex');

    // Calculate freshness expiry based on evidence type
    const expiresAt = this.calculateEvidenceExpiry(evidence.evidenceType);

    const result = await db
      .insert(evidenceLibrary)
      .values({
        tenantId,
        controlId,
        ...evidence,
        contentHash,
        expiresAt,
        owner: userId,
      } as InsertEvidenceLibrary)
      .returning();

    // Log to audit store
    await this.logAuditEvent('Evidence', result[0].id, 'Created', result[0], userId, tenantId);

    return result[0];
  }

  /**
   * Get evidence for control with freshness status
   */
  static async getControlEvidence(tenantId: string, controlId: string): Promise<EvidenceLibrary[]> {
    const evidence = await db
      .select()
      .from(evidenceLibrary)
      .where(and(
        eq(evidenceLibrary.tenantId, tenantId),
        eq(evidenceLibrary.controlId, controlId)
      ))
      .orderBy(desc(evidenceLibrary.collectedAt));

    // Update freshness status
    const now = new Date();
    return evidence.map(item => {
      let freshnessStatus = 'Fresh';
      if (item.expiresAt) {
        const daysUntilExpiry = Math.floor(
          (item.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry < 0) {
          freshnessStatus = 'Expired';
        } else if (daysUntilExpiry <= 7) {
          freshnessStatus = 'Warning';
        }
      }
      return { ...item, freshnessStatus };
    });
  }

  /**
   * Get compliance dashboard metrics
   */
  static async getComplianceDashboard(tenantId: string): Promise<{
    overview: any;
    riskSummary: any;
    evidenceFreshness: any;
    recentActivity: any;
  }> {
    // Get SoA overview
    const { summary: soaSummary } = await this.getStatementOfApplicability(tenantId);

    // Get risk summary
    const risks = await db
      .select()
      .from(riskRegister)
      .where(eq(riskRegister.tenantId, tenantId));

    const riskSummary = {
      total: risks.length,
      critical: risks.filter(r => r.inherentRisk >= 20).length,
      high: risks.filter(r => r.inherentRisk >= 15 && r.inherentRisk < 20).length,
      medium: risks.filter(r => r.inherentRisk >= 10 && r.inherentRisk < 15).length,
      low: risks.filter(r => r.inherentRisk < 10).length,
    };

    // Get evidence freshness
    const allEvidence = await db
      .select()
      .from(evidenceLibrary)
      .where(eq(evidenceLibrary.tenantId, tenantId));

    const now = new Date();
    const evidenceFreshness = {
      total: allEvidence.length,
      fresh: allEvidence.filter(e => !e.expiresAt || e.expiresAt > now).length,
      warning: allEvidence.filter(e => e.expiresAt && e.expiresAt <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) && e.expiresAt > now).length,
      expired: allEvidence.filter(e => e.expiresAt && e.expiresAt <= now).length,
    };

    // Get recent activity from audit store
    const recentActivity = await db
      .select()
      .from(auditStore)
      .where(eq(auditStore.tenantId, tenantId))
      .orderBy(desc(auditStore.timestamp))
      .limit(10);

    return {
      overview: soaSummary,
      riskSummary,
      evidenceFreshness,
      recentActivity,
    };
  }

  /**
   * Create or update risk register entry
   */
  static async updateRisk(
    tenantId: string,
    riskData: Omit<InsertRiskRegister, 'tenantId'>,
    userId: string
  ): Promise<RiskRegister> {
    // Calculate inherent risk score
    const inherentRisk = (riskData.likelihood || 1) * (riskData.impact || 1);

    const result = await db
      .insert(riskRegister)
      .values({
        ...riskData,
        tenantId,
        inherentRisk,
        owner: userId,
      } as InsertRiskRegister)
      .onConflictDoUpdate({
        target: riskRegister.riskId,
        set: {
          ...riskData,
          inherentRisk,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Log to audit store
    await this.logAuditEvent('Risk', result[0].id, 'Updated', result[0], userId, tenantId);

    return result[0];
  }

  /**
   * Private helper methods
   */
  private static calculateImplementationProgress(soa: any, evidenceCount: number): {
    status: string;
    progress: number;
    hasEvidence: boolean;
  } {
    if (!soa) {
      return { status: 'Not Started', progress: 0, hasEvidence: false };
    }

    const hasEvidence = evidenceCount > 0;
    let progress = 0;

    switch (soa.implementationStatus) {
      case 'Implemented':
        progress = hasEvidence ? 100 : 90;
        break;
      case 'InProgress':
        progress = hasEvidence ? 70 : 50;
        break;
      case 'NotStarted':
        progress = hasEvidence ? 20 : 0;
        break;
    }

    return { 
      status: soa.implementationStatus, 
      progress,
      hasEvidence 
    };
  }

  private static calculateEvidenceExpiry(evidenceType: string): Date {
    const now = new Date();
    const expiryDays = {
      'Document': 365,
      'Screenshot': 90,
      'LogFile': 30,
      'AutomatedCheck': 7,
      'Configuration': 180,
    };

    const days = expiryDays[evidenceType as keyof typeof expiryDays] || 90;
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
    });
  }
}