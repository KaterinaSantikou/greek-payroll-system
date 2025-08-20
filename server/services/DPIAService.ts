/**
 * DPIA (Data Protection Impact Assessment) Service
 * Comprehensive framework for conducting formal DPIAs per GDPR Article 35
 */

import { AuditService } from './AuditService';

export interface DPIAAssessment {
  id: string;
  projectName: string;
  projectDescription: string;
  dataController: string;
  dataProcessor?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'in_review' | 'approved' | 'requires_consultation';
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  requiresDPIA: boolean;
  consultationRequired: boolean;
  
  // DPIA Details
  processingPurpose: string[];
  dataCategories: DataCategory[];
  dataSubjects: DataSubjectCategory[];
  recipients: string[];
  thirdCountryTransfers: ThirdCountryTransfer[];
  retentionPeriod: string;
  technicalMeasures: TechnicalMeasure[];
  organizationalMeasures: OrganizationalMeasure[];
  
  // Risk Assessment
  riskAssessment: RiskAssessment;
  mitigationMeasures: MitigationMeasure[];
  
  // Legal Basis
  legalBasis: LegalBasisType[];
  legitimateInterest?: string;
  
  // Consultation
  stakeholderConsultation?: StakeholderConsultation;
  supervisoryAuthorityConsultation?: SupervisoryAuthorityConsultation;
  
  // Approval
  approvedBy?: string;
  approvedAt?: Date;
  reviewDate?: Date;
}

export interface DataCategory {
  category: 'personal' | 'sensitive' | 'criminal' | 'biometric' | 'genetic' | 'health' | 'financial';
  description: string;
  sources: string[];
  automated: boolean;
}

export interface DataSubjectCategory {
  category: 'employees' | 'customers' | 'clients' | 'suppliers' | 'minors' | 'vulnerable';
  description: string;
  estimatedNumber: string;
  dataSubjectRights: string[];
}

export interface ThirdCountryTransfer {
  country: string;
  adequacyDecision: boolean;
  safeguards: string[];
  necessity: string;
}

export interface TechnicalMeasure {
  measure: string;
  description: string;
  effectiveness: 'low' | 'medium' | 'high';
  implemented: boolean;
}

export interface OrganizationalMeasure {
  measure: string;
  description: string;
  effectiveness: 'low' | 'medium' | 'high';
  implemented: boolean;
}

export interface RiskAssessment {
  identifiedRisks: IdentifiedRisk[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'very_high';
  residualRiskLevel: 'low' | 'medium' | 'high' | 'very_high';
  acceptableRisk: boolean;
}

export interface IdentifiedRisk {
  id: string;
  category: 'unlawful_processing' | 'discrimination' | 'identity_theft' | 'fraud' | 'reputation_damage' | 'financial_loss' | 'other';
  description: string;
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  severity: 'negligible' | 'limited' | 'significant' | 'severe';
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  impactedDataSubjects: string[];
}

export interface MitigationMeasure {
  riskId: string;
  measure: string;
  description: string;
  implementation: string;
  timeline: string;
  responsible: string;
  effectiveness: 'low' | 'medium' | 'high';
  status: 'planned' | 'in_progress' | 'implemented' | 'verified';
}

export type LegalBasisType = 
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

export interface StakeholderConsultation {
  stakeholders: string[];
  consultationDate: Date;
  feedback: string[];
  concerns: string[];
  recommendations: string[];
}

export interface SupervisoryAuthorityConsultation {
  authority: string;
  consultationDate: Date;
  reference: string;
  response: string;
  recommendations: string[];
  deadline?: Date;
}

export interface DPIATemplate {
  id: string;
  name: string;
  description: string;
  applicableProcessing: string[];
  questions: DPIAQuestion[];
  riskCriteria: RiskCriteria[];
}

export interface DPIAQuestion {
  id: string;
  section: string;
  question: string;
  type: 'text' | 'multiselect' | 'boolean' | 'scale' | 'date';
  required: boolean;
  options?: string[];
  guidance?: string;
}

export interface RiskCriteria {
  criterion: string;
  description: string;
  triggers: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
}

export class DPIAService {
  private static assessments = new Map<string, DPIAAssessment>();
  private static templates = new Map<string, DPIATemplate>();

  /**
   * Initialize DPIA service with standard templates
   */
  static initialize(): void {
    // Load standard DPIA templates
    this.loadStandardTemplates();
    console.log('✅ DPIA Service initialized');
  }

  /**
   * Conduct DPIA necessity screening
   */
  static async conductNecessityScreening(
    processingDescription: string,
    dataCategories: string[],
    processingMethods: string[],
    dataSubjects: string[]
  ): Promise<{
    requiresDPIA: boolean;
    reasons: string[];
    recommendedActions: string[];
  }> {
    const reasons: string[] = [];
    const recommendedActions: string[] = [];
    let requiresDPIA = false;

    // GDPR Article 35(3) criteria
    const highRiskIndicators = [
      'systematic and extensive evaluation',
      'large scale processing of special categories',
      'systematic monitoring of publicly accessible area',
      'biometric data',
      'genetic data',
      'location tracking',
      'profiling',
      'automated decision-making',
      'vulnerable data subjects',
      'innovative technology',
      'data matching or combining',
      'preventing data subjects from exercising rights',
      'third country transfer without adequacy decision'
    ];

    // Check for high-risk processing
    const description = processingDescription.toLowerCase();
    const categories = dataCategories.map(c => c.toLowerCase());
    const methods = processingMethods.map(m => m.toLowerCase());
    const subjects = dataSubjects.map(s => s.toLowerCase());

    // Systematic and extensive evaluation
    if (description.includes('evaluation') || description.includes('profiling') || description.includes('scoring')) {
      requiresDPIA = true;
      reasons.push('Systematic and extensive evaluation of personal aspects');
    }

    // Special categories on large scale
    const specialCategories = ['health', 'biometric', 'genetic', 'racial', 'ethnic', 'political', 'religious', 'sexual'];
    if (categories.some(cat => specialCategories.some(special => cat.includes(special)))) {
      requiresDPIA = true;
      reasons.push('Processing of special categories of personal data on a large scale');
    }

    // Systematic monitoring
    if (description.includes('monitoring') || description.includes('tracking') || description.includes('surveillance')) {
      requiresDPIA = true;
      reasons.push('Systematic monitoring of publicly accessible areas');
    }

    // Vulnerable data subjects
    if (subjects.includes('children') || subjects.includes('minors') || subjects.includes('vulnerable')) {
      requiresDPIA = true;
      reasons.push('Processing data of vulnerable data subjects');
    }

    // Automated decision-making
    if (methods.includes('automated') || description.includes('algorithm') || description.includes('ai')) {
      requiresDPIA = true;
      reasons.push('Automated decision-making with legal or significant effects');
    }

    // Generate recommendations
    if (requiresDPIA) {
      recommendedActions.push('Conduct formal DPIA before commencing processing');
      recommendedActions.push('Identify and implement appropriate safeguards');
      recommendedActions.push('Consider data protection by design and by default');
      recommendedActions.push('Document all processing activities in ROPA');
      
      if (reasons.length > 2) {
        recommendedActions.push('Consider consultation with supervisory authority');
      }
    } else {
      recommendedActions.push('Document the necessity screening decision');
      recommendedActions.push('Regular review of processing activities');
      recommendedActions.push('Monitor for changes that might trigger DPIA requirement');
    }

    return {
      requiresDPIA,
      reasons,
      recommendedActions
    };
  }

  /**
   * Create new DPIA assessment
   */
  static async createDPIA(
    projectName: string,
    projectDescription: string,
    dataController: string,
    processingPurpose: string[]
  ): Promise<DPIAAssessment> {
    const dpiaId = `dpia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const assessment: DPIAAssessment = {
      id: dpiaId,
      projectName,
      projectDescription,
      dataController,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      riskLevel: 'medium',
      requiresDPIA: true,
      consultationRequired: false,
      processingPurpose,
      dataCategories: [],
      dataSubjects: [],
      recipients: [],
      thirdCountryTransfers: [],
      retentionPeriod: '',
      technicalMeasures: [],
      organizationalMeasures: [],
      riskAssessment: {
        identifiedRisks: [],
        overallRiskLevel: 'medium',
        residualRiskLevel: 'medium',
        acceptableRisk: false
      },
      mitigationMeasures: [],
      legalBasis: []
    };

    this.assessments.set(dpiaId, assessment);

    // Audit DPIA creation
    await AuditService.logEvent({
      action: 'dpia.created',
      resourceType: 'dpia',
      resourceId: dpiaId,
      metadata: {
        projectName,
        dataController,
        processingPurpose
      }
    });

    return assessment;
  }

  /**
   * Update DPIA assessment
   */
  static async updateDPIA(
    dpiaId: string,
    updates: Partial<DPIAAssessment>
  ): Promise<DPIAAssessment> {
    const assessment = this.assessments.get(dpiaId);
    if (!assessment) {
      throw new Error(`DPIA not found: ${dpiaId}`);
    }

    const updatedAssessment = {
      ...assessment,
      ...updates,
      updatedAt: new Date()
    };

    // Recalculate risk level if risks updated
    if (updates.riskAssessment) {
      updatedAssessment.riskLevel = this.calculateOverallRiskLevel(updatedAssessment.riskAssessment);
    }

    this.assessments.set(dpiaId, updatedAssessment);

    // Audit DPIA update
    await AuditService.logEvent({
      action: 'dpia.updated',
      resourceType: 'dpia',
      resourceId: dpiaId,
      metadata: {
        updatedFields: Object.keys(updates),
        riskLevel: updatedAssessment.riskLevel
      }
    });

    return updatedAssessment;
  }

  /**
   * Conduct risk assessment for DPIA
   */
  static async conductRiskAssessment(
    dpiaId: string,
    risks: IdentifiedRisk[]
  ): Promise<RiskAssessment> {
    const assessment = this.assessments.get(dpiaId);
    if (!assessment) {
      throw new Error(`DPIA not found: ${dpiaId}`);
    }

    const riskAssessment: RiskAssessment = {
      identifiedRisks: risks,
      overallRiskLevel: this.calculateOverallRiskLevel({ identifiedRisks: risks } as RiskAssessment),
      residualRiskLevel: 'medium', // Will be calculated after mitigation measures
      acceptableRisk: false
    };

    await this.updateDPIA(dpiaId, { riskAssessment });

    return riskAssessment;
  }

  /**
   * Add mitigation measures
   */
  static async addMitigationMeasures(
    dpiaId: string,
    measures: MitigationMeasure[]
  ): Promise<void> {
    const assessment = this.assessments.get(dpiaId);
    if (!assessment) {
      throw new Error(`DPIA not found: ${dpiaId}`);
    }

    const updatedMeasures = [...assessment.mitigationMeasures, ...measures];
    const residualRiskLevel = this.calculateResidualRisk(assessment.riskAssessment, updatedMeasures);
    
    await this.updateDPIA(dpiaId, {
      mitigationMeasures: updatedMeasures,
      riskAssessment: {
        ...assessment.riskAssessment,
        residualRiskLevel,
        acceptableRisk: residualRiskLevel === 'low' || residualRiskLevel === 'medium'
      }
    });
  }

  /**
   * Submit DPIA for review/approval
   */
  static async submitForReview(
    dpiaId: string,
    submittedBy: string
  ): Promise<void> {
    const assessment = this.assessments.get(dpiaId);
    if (!assessment) {
      throw new Error(`DPIA not found: ${dpiaId}`);
    }

    // Validate completeness
    const validationErrors = this.validateDPIACompleteness(assessment);
    if (validationErrors.length > 0) {
      throw new Error(`DPIA incomplete: ${validationErrors.join(', ')}`);
    }

    const consultationRequired = assessment.riskLevel === 'very_high' || 
                                assessment.riskAssessment.residualRiskLevel === 'high';

    await this.updateDPIA(dpiaId, {
      status: consultationRequired ? 'requires_consultation' : 'in_review',
      consultationRequired
    });

    // Audit submission
    await AuditService.logEvent({
      action: 'dpia.submitted',
      userId: submittedBy,
      resourceType: 'dpia',
      resourceId: dpiaId,
      metadata: {
        consultationRequired,
        riskLevel: assessment.riskLevel
      }
    });
  }

  /**
   * Approve DPIA
   */
  static async approveDPIA(
    dpiaId: string,
    approvedBy: string,
    reviewDate: Date
  ): Promise<void> {
    await this.updateDPIA(dpiaId, {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
      reviewDate
    });

    // Audit approval
    await AuditService.logEvent({
      action: 'dpia.approved',
      userId: approvedBy,
      resourceType: 'dpia',
      resourceId: dpiaId,
      metadata: {
        reviewDate: reviewDate.toISOString()
      }
    });
  }

  /**
   * Get DPIA assessment
   */
  static getDPIA(dpiaId: string): DPIAAssessment | null {
    return this.assessments.get(dpiaId) || null;
  }

  /**
   * List all DPIAs
   */
  static listDPIAs(
    status?: DPIAAssessment['status'],
    riskLevel?: DPIAAssessment['riskLevel']
  ): DPIAAssessment[] {
    let assessments = Array.from(this.assessments.values());

    if (status) {
      assessments = assessments.filter(a => a.status === status);
    }

    if (riskLevel) {
      assessments = assessments.filter(a => a.riskLevel === riskLevel);
    }

    return assessments.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Generate DPIA report
   */
  static generateDPIAReport(dpiaId: string): {
    assessment: DPIAAssessment;
    summary: string;
    recommendations: string[];
    nextSteps: string[];
  } {
    const assessment = this.assessments.get(dpiaId);
    if (!assessment) {
      throw new Error(`DPIA not found: ${dpiaId}`);
    }

    const summary = this.generateExecutiveSummary(assessment);
    const recommendations = this.generateRecommendations(assessment);
    const nextSteps = this.generateNextSteps(assessment);

    return {
      assessment,
      summary,
      recommendations,
      nextSteps
    };
  }

  // Private helper methods

  private static calculateOverallRiskLevel(riskAssessment: RiskAssessment): 'low' | 'medium' | 'high' | 'very_high' {
    const risks = riskAssessment.identifiedRisks;
    if (risks.length === 0) return 'low';

    const veryHighRisks = risks.filter(r => r.riskLevel === 'very_high').length;
    const highRisks = risks.filter(r => r.riskLevel === 'high').length;
    const mediumRisks = risks.filter(r => r.riskLevel === 'medium').length;

    if (veryHighRisks > 0) return 'very_high';
    if (highRisks > 2) return 'very_high';
    if (highRisks > 0) return 'high';
    if (mediumRisks > 3) return 'high';
    if (mediumRisks > 0) return 'medium';
    return 'low';
  }

  private static calculateResidualRisk(
    riskAssessment: RiskAssessment,
    mitigationMeasures: MitigationMeasure[]
  ): 'low' | 'medium' | 'high' | 'very_high' {
    // Simplified calculation - in practice would be more sophisticated
    const implementedMeasures = mitigationMeasures.filter(m => m.status === 'implemented');
    const highEffectivenessMeasures = implementedMeasures.filter(m => m.effectiveness === 'high');
    
    let riskReduction = 0;
    if (highEffectivenessMeasures.length >= 3) riskReduction = 2;
    else if (implementedMeasures.length >= 2) riskReduction = 1;

    const currentRisk = this.getRiskLevelNumber(riskAssessment.overallRiskLevel);
    const residualRisk = Math.max(1, currentRisk - riskReduction);

    return this.getRiskLevelString(residualRisk);
  }

  private static getRiskLevelNumber(level: 'low' | 'medium' | 'high' | 'very_high'): number {
    const map = { 'low': 1, 'medium': 2, 'high': 3, 'very_high': 4 };
    return map[level];
  }

  private static getRiskLevelString(num: number): 'low' | 'medium' | 'high' | 'very_high' {
    const map = { 1: 'low', 2: 'medium', 3: 'high', 4: 'very_high' };
    return map[num as keyof typeof map] || 'medium';
  }

  private static validateDPIACompleteness(assessment: DPIAAssessment): string[] {
    const errors: string[] = [];

    if (!assessment.processingPurpose.length) errors.push('Processing purpose required');
    if (!assessment.dataCategories.length) errors.push('Data categories required');
    if (!assessment.dataSubjects.length) errors.push('Data subjects required');
    if (!assessment.legalBasis.length) errors.push('Legal basis required');
    if (!assessment.retentionPeriod) errors.push('Retention period required');
    if (!assessment.riskAssessment.identifiedRisks.length) errors.push('Risk assessment required');
    if (!assessment.technicalMeasures.length && !assessment.organizationalMeasures.length) {
      errors.push('Technical or organizational measures required');
    }

    return errors;
  }

  private static generateExecutiveSummary(assessment: DPIAAssessment): string {
    return `DPIA for ${assessment.projectName}: ${assessment.riskLevel} risk processing involving ${assessment.dataCategories.length} data categories and ${assessment.dataSubjects.length} data subject categories. ${assessment.riskAssessment.identifiedRisks.length} risks identified with ${assessment.mitigationMeasures.length} mitigation measures.`;
  }

  private static generateRecommendations(assessment: DPIAAssessment): string[] {
    const recommendations: string[] = [];

    if (assessment.riskLevel === 'very_high') {
      recommendations.push('Consider consultation with supervisory authority');
    }

    if (assessment.riskAssessment.residualRiskLevel !== 'low') {
      recommendations.push('Implement additional safeguards to reduce residual risk');
    }

    if (assessment.thirdCountryTransfers.length > 0) {
      recommendations.push('Ensure adequate safeguards for international transfers');
    }

    return recommendations;
  }

  private static generateNextSteps(assessment: DPIAAssessment): string[] {
    const nextSteps: string[] = [];

    switch (assessment.status) {
      case 'draft':
        nextSteps.push('Complete risk assessment');
        nextSteps.push('Define mitigation measures');
        break;
      case 'in_review':
        nextSteps.push('Await review and approval');
        break;
      case 'requires_consultation':
        nextSteps.push('Initiate supervisory authority consultation');
        break;
      case 'approved':
        nextSteps.push('Implement processing in accordance with DPIA');
        nextSteps.push(`Schedule review by ${assessment.reviewDate?.toLocaleDateString()}`);
        break;
    }

    return nextSteps;
  }

  private static loadStandardTemplates(): void {
    // Load standard DPIA templates for common processing scenarios
    const hrTemplate: DPIATemplate = {
      id: 'hr_processing',
      name: 'HR and Employee Data Processing',
      description: 'Template for employee data processing activities',
      applicableProcessing: ['hr', 'payroll', 'recruitment', 'performance'],
      questions: [
        {
          id: 'hr_1',
          section: 'Data Categories',
          question: 'What employee data will be processed?',
          type: 'multiselect',
          required: true,
          options: ['Basic details', 'Contact information', 'Bank details', 'Performance data', 'Health data', 'Disciplinary records']
        }
      ],
      riskCriteria: [
        {
          criterion: 'Special categories processing',
          description: 'Processing health or other special category data',
          triggers: ['health', 'medical', 'disability'],
          riskLevel: 'high'
        }
      ]
    };

    this.templates.set('hr_processing', hrTemplate);
  }
}