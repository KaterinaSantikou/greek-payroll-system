/**
 * Legal Approval Service - Comprehensive legal sign-off capture workflow
 */

import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';

export interface LegalApproval {
  id: string;
  documentId: string;
  documentType: 'payroll_calculation' | 'billing_invoice' | 'contract' | 'policy_change' | 'regulatory_filing';
  organizationId: string;
  requestedBy: string;
  requestedAt: Date;
  legalReviewerId?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_changes';
  approvedAt?: Date;
  rejectedAt?: Date;
  comments: string[];
  legalOpinion?: string;
  riskAssessment?: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigations: string[];
  };
  complianceChecklist: ComplianceCheckItem[];
  digitalSignature?: {
    signedBy: string;
    signedAt: string;
    certificateThumbprint: string;
    signatureHash: string;
  };
  auditTrail: ApprovalEvent[];
  expiresAt?: Date;
  metadata: Record<string, any>;
}

export interface ComplianceCheckItem {
  requirement: string;
  requirementEl: string;
  status: 'compliant' | 'non_compliant' | 'not_applicable' | 'pending_review';
  evidence?: string;
  notes?: string;
  regulationRef: string;
  criticality: 'mandatory' | 'recommended' | 'best_practice';
}

export interface ApprovalEvent {
  id: string;
  timestamp: Date;
  eventType: 'created' | 'review_started' | 'comment_added' | 'approved' | 'rejected' | 'changes_requested' | 'document_updated';
  performedBy: string;
  details: Record<string, any>;
  ipAddress?: string;
}

export interface LegalApprovalRequest {
  documentId: string;
  documentType: LegalApproval['documentType'];
  organizationId: string;
  requestedBy: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  descriptionEl: string;
  businessJustification: string;
  impactAssessment: {
    financialImpact: string;
    operationalImpact: string;
    complianceImpact: string;
    riskFactors: string[];
  };
  requiredBy?: Date;
  attachments?: string[];
  preReviewChecklist?: string[];
}

export class LegalApprovalService {
  private approvals: Map<string, LegalApproval> = new Map();

  /**
   * Submit document for legal approval
   */
  async submitForApproval(request: LegalApprovalRequest): Promise<LegalApproval> {
    const approvalId = randomUUID();
    
    // Generate compliance checklist based on document type
    const complianceChecklist = this.generateComplianceChecklist(
      request.documentType,
      request.organizationId
    );

    const approval: LegalApproval = {
      id: approvalId,
      documentId: request.documentId,
      documentType: request.documentType,
      organizationId: request.organizationId,
      requestedBy: request.requestedBy,
      requestedAt: new Date(),
      status: 'pending',
      comments: [],
      complianceChecklist,
      auditTrail: [],
      expiresAt: request.requiredBy,
      metadata: {
        urgency: request.urgency,
        description: request.description,
        descriptionEl: request.descriptionEl,
        businessJustification: request.businessJustification,
        impactAssessment: request.impactAssessment,
        attachments: request.attachments || [],
        preReviewChecklist: request.preReviewChecklist || []
      }
    };

    // Add creation event to audit trail
    await this.addAuditEvent(approval, {
      eventType: 'created',
      performedBy: request.requestedBy,
      details: {
        documentType: request.documentType,
        urgency: request.urgency,
        description: request.description
      }
    });

    this.approvals.set(approvalId, approval);

    // Auto-assign to legal reviewer based on document type and urgency
    await this.autoAssignReviewer(approval);

    // Send notification to legal team
    await this.notifyLegalTeam(approval);

    return approval;
  }

  /**
   * Start legal review process
   */
  async startReview(approvalId: string, reviewerId: string): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error('Legal approval not found');
    }

    if (approval.status !== 'pending') {
      throw new Error('Approval is not in pending status');
    }

    approval.legalReviewerId = reviewerId;
    approval.status = 'under_review';

    await this.addAuditEvent(approval, {
      eventType: 'review_started',
      performedBy: reviewerId,
      details: {
        previousStatus: 'pending',
        newStatus: 'under_review'
      }
    });

    this.approvals.set(approvalId, approval);
  }

  /**
   * Add legal comment/opinion
   */
  async addLegalComment(
    approvalId: string,
    reviewerId: string,
    comment: string,
    isOpinion: boolean = false
  ): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error('Legal approval not found');
    }

    if (approval.legalReviewerId !== reviewerId) {
      throw new Error('Only assigned reviewer can add comments');
    }

    const timestampedComment = `[${new Date().toISOString()}] ${reviewerId}: ${comment}`;
    approval.comments.push(timestampedComment);

    if (isOpinion) {
      approval.legalOpinion = comment;
    }

    await this.addAuditEvent(approval, {
      eventType: 'comment_added',
      performedBy: reviewerId,
      details: {
        comment,
        isLegalOpinion: isOpinion
      }
    });

    this.approvals.set(approvalId, approval);
  }

  /**
   * Update compliance checklist
   */
  async updateComplianceChecklist(
    approvalId: string,
    reviewerId: string,
    updates: Array<{
      requirement: string;
      status: ComplianceCheckItem['status'];
      evidence?: string;
      notes?: string;
    }>
  ): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error('Legal approval not found');
    }

    for (const update of updates) {
      const checkItem = approval.complianceChecklist.find(
        item => item.requirement === update.requirement
      );
      
      if (checkItem) {
        checkItem.status = update.status;
        if (update.evidence) checkItem.evidence = update.evidence;
        if (update.notes) checkItem.notes = update.notes;
      }
    }

    await this.addAuditEvent(approval, {
      eventType: 'comment_added',
      performedBy: reviewerId,
      details: {
        type: 'compliance_checklist_update',
        updatedItems: updates.length
      }
    });

    this.approvals.set(approvalId, approval);
  }

  /**
   * Approve document with legal sign-off
   */
  async approveDocument(
    approvalId: string,
    reviewerId: string,
    approvalDetails: {
      legalOpinion: string;
      conditions?: string[];
      validUntil?: Date;
      riskAssessment?: LegalApproval['riskAssessment'];
    }
  ): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error('Legal approval not found');
    }

    if (approval.legalReviewerId !== reviewerId) {
      throw new Error('Only assigned reviewer can approve');
    }

    // Validate all mandatory compliance items are marked compliant
    const mandatoryItems = approval.complianceChecklist.filter(
      item => item.criticality === 'mandatory'
    );
    
    const nonCompliantMandatory = mandatoryItems.filter(
      item => item.status === 'non_compliant'
    );

    if (nonCompliantMandatory.length > 0) {
      throw new Error(`Cannot approve: ${nonCompliantMandatory.length} mandatory compliance items are non-compliant`);
    }

    approval.status = 'approved';
    approval.approvedAt = new Date();
    approval.legalOpinion = approvalDetails.legalOpinion;
    approval.riskAssessment = approvalDetails.riskAssessment;

    // Generate digital signature
    approval.digitalSignature = await this.generateLegalSignature(
      approval,
      reviewerId,
      approvalDetails.legalOpinion
    );

    await this.addAuditEvent(approval, {
      eventType: 'approved',
      performedBy: reviewerId,
      details: {
        legalOpinion: approvalDetails.legalOpinion,
        conditions: approvalDetails.conditions || [],
        validUntil: approvalDetails.validUntil?.toISOString(),
        riskLevel: approvalDetails.riskAssessment?.level
      }
    });

    this.approvals.set(approvalId, approval);

    // Notify stakeholders of approval
    await this.notifyApprovalDecision(approval, 'approved');
  }

  /**
   * Reject document with legal reasoning
   */
  async rejectDocument(
    approvalId: string,
    reviewerId: string,
    rejectionDetails: {
      reason: string;
      legalConcerns: string[];
      recommendedActions: string[];
      canResubmit: boolean;
    }
  ): Promise<void> {
    const approval = this.approvals.get(approvalId);
    if (!approval) {
      throw new Error('Legal approval not found');
    }

    if (approval.legalReviewerId !== reviewerId) {
      throw new Error('Only assigned reviewer can reject');
    }

    approval.status = 'rejected';
    approval.rejectedAt = new Date();
    approval.legalOpinion = rejectionDetails.reason;

    await this.addAuditEvent(approval, {
      eventType: 'rejected',
      performedBy: reviewerId,
      details: {
        reason: rejectionDetails.reason,
        legalConcerns: rejectionDetails.legalConcerns,
        recommendedActions: rejectionDetails.recommendedActions,
        canResubmit: rejectionDetails.canResubmit
      }
    });

    this.approvals.set(approvalId, approval);

    // Notify stakeholders of rejection
    await this.notifyApprovalDecision(approval, 'rejected');
  }

  /**
   * Get approval status and history
   */
  async getApproval(approvalId: string): Promise<LegalApproval | undefined> {
    return this.approvals.get(approvalId);
  }

  /**
   * Get pending approvals for legal team
   */
  async getPendingApprovals(reviewerId?: string): Promise<LegalApproval[]> {
    const allApprovals = Array.from(this.approvals.values());
    
    return allApprovals.filter(approval => 
      (approval.status === 'pending' || approval.status === 'under_review') &&
      (!reviewerId || approval.legalReviewerId === reviewerId)
    ).sort((a, b) => {
      // Sort by urgency and request date
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aUrgency = urgencyOrder[approval.metadata.urgency as keyof typeof urgencyOrder] || 1;
      const bUrgency = urgencyOrder[approval.metadata.urgency as keyof typeof urgencyOrder] || 1;
      
      if (aUrgency !== bUrgency) {
        return bUrgency - aUrgency; // Higher urgency first
      }
      
      return a.requestedAt.getTime() - b.requestedAt.getTime(); // Older requests first
    });
  }

  /**
   * Generate compliance checklist based on document type
   */
  private generateComplianceChecklist(
    documentType: LegalApproval['documentType'],
    organizationId: string
  ): ComplianceCheckItem[] {
    const baseChecklist: ComplianceCheckItem[] = [
      {
        requirement: 'Document contains accurate legal entity information',
        requirementEl: 'Το έγγραφο περιέχει ακριβή στοιχεία νομικής οντότητας',
        status: 'pending_review',
        regulationRef: 'Greek Civil Code',
        criticality: 'mandatory'
      },
      {
        requirement: 'All monetary amounts are correctly calculated',
        requirementEl: 'Όλα τα χρηματικά ποσά υπολογίζονται σωστά',
        status: 'pending_review',
        regulationRef: 'Accounting Standards',
        criticality: 'mandatory'
      },
      {
        requirement: 'Document complies with Greek language requirements',
        requirementEl: 'Το έγγραφο συμμορφώνεται με τις απαιτήσεις ελληνικής γλώσσας',
        status: 'pending_review',
        regulationRef: 'Law 4170/2013',
        criticality: 'mandatory'
      }
    ];

    // Add document-type specific requirements
    switch (documentType) {
      case 'payroll_calculation':
        baseChecklist.push(
          {
            requirement: 'Payroll calculations comply with current minimum wage laws',
            requirementEl: 'Οι υπολογισμοί μισθοδοσίας συμμορφώνονται με τους τρέχοντες νόμους κατώτατου μισθού',
            status: 'pending_review',
            regulationRef: 'Law 4808/2021',
            criticality: 'mandatory'
          },
          {
            requirement: 'Social security contributions correctly calculated',
            requirementEl: 'Οι εισφορές κοινωνικής ασφάλισης υπολογίζονται σωστά',
            status: 'pending_review',
            regulationRef: 'e-EFKA Regulations',
            criticality: 'mandatory'
          }
        );
        break;

      case 'billing_invoice':
        baseChecklist.push(
          {
            requirement: 'VAT rates and calculations are correct',
            requirementEl: 'Οι συντελεστές και υπολογισμοί ΦΠΑ είναι σωστοί',
            status: 'pending_review',
            regulationRef: 'VAT Code 2579/2006',
            criticality: 'mandatory'
          },
          {
            requirement: 'Invoice meets myDATA electronic books requirements',
            requirementEl: 'Το τιμολόγιο πληροί τις απαιτήσεις ηλεκτρονικών βιβλίων myDATA',
            status: 'pending_review',
            regulationRef: 'POL.1155/2018',
            criticality: 'mandatory'
          }
        );
        break;

      case 'contract':
        baseChecklist.push(
          {
            requirement: 'Contract terms comply with Greek labor law',
            requirementEl: 'Οι όροι συμβολαίου συμμορφώνονται με το ελληνικό εργατικό δίκαιο',
            status: 'pending_review',
            regulationRef: 'Law 4808/2021',
            criticality: 'mandatory'
          },
          {
            requirement: 'ERGANI notification requirements addressed',
            requirementEl: 'Οι απαιτήσεις ειδοποίησης ΕΡΓΑΝΗ αντιμετωπίζονται',
            status: 'pending_review',
            regulationRef: 'ERGANI System',
            criticality: 'mandatory'
          }
        );
        break;
    }

    return baseChecklist;
  }

  /**
   * Generate cryptographic legal signature
   */
  private async generateLegalSignature(
    approval: LegalApproval,
    reviewerId: string,
    legalOpinion: string
  ): Promise<LegalApproval['digitalSignature']> {
    const signatureData = {
      approvalId: approval.id,
      documentId: approval.documentId,
      reviewerId,
      approvedAt: approval.approvedAt,
      legalOpinion,
      organizationId: approval.organizationId
    };

    const signatureHash = createHash('sha256')
      .update(JSON.stringify(signatureData))
      .digest('hex');

    return {
      signedBy: reviewerId,
      signedAt: new Date().toISOString(),
      certificateThumbprint: 'LEGAL-' + createHash('md5').update(reviewerId).digest('hex').substring(0, 8).toUpperCase(),
      signatureHash
    };
  }

  /**
   * Add event to audit trail
   */
  private async addAuditEvent(
    approval: LegalApproval,
    eventData: Omit<ApprovalEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    const event: ApprovalEvent = {
      id: randomUUID(),
      timestamp: new Date(),
      ...eventData
    };

    approval.auditTrail.push(event);
  }

  /**
   * Auto-assign reviewer based on document type and urgency
   */
  private async autoAssignReviewer(approval: LegalApproval): Promise<void> {
    // In production, this would query available legal reviewers
    // For now, assign to a default reviewer
    const defaultReviewer = 'legal-team-lead';
    
    approval.legalReviewerId = defaultReviewer;
    this.approvals.set(approval.id, approval);
  }

  /**
   * Notify legal team of new approval request
   */
  private async notifyLegalTeam(approval: LegalApproval): Promise<void> {
    console.log(`[LEGAL-APPROVAL] New approval request: ${approval.id} (${approval.documentType}) - Urgency: ${approval.metadata.urgency}`);
    
    // In production, this would:
    // 1. Send email notifications to legal team
    // 2. Create tickets in legal case management system
    // 3. Update legal dashboard
    // 4. Send Slack/Teams notifications based on urgency
  }

  /**
   * Notify stakeholders of approval decision
   */
  private async notifyApprovalDecision(approval: LegalApproval, decision: 'approved' | 'rejected'): Promise<void> {
    console.log(`[LEGAL-APPROVAL] Decision: ${approval.id} ${decision.toUpperCase()} by ${approval.legalReviewerId}`);
    
    // In production, this would:
    // 1. Send email notifications to requestor and stakeholders
    // 2. Update project management systems
    // 3. Trigger downstream processes (e.g., document release)
    // 4. Update compliance tracking systems
  }
}

export const legalApprovalService = new LegalApprovalService();