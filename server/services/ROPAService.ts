/**
 * ROPA (Record of Processing Activities) Service
 * Maintains comprehensive record of processing activities per GDPR Article 30
 */

import { AuditService } from './AuditService';

export interface ProcessingActivity {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'planned' | 'terminated';
  
  // Basic Information
  createdAt: Date;
  updatedAt: Date;
  lastReviewed?: Date;
  nextReview: Date;
  
  // Controller/Processor Information
  dataController: ControllerInfo;
  dataProcessor?: ProcessorInfo;
  jointControllers?: ControllerInfo[];
  
  // Processing Details
  purposes: ProcessingPurpose[];
  legalBasis: LegalBasisInfo[];
  legitimateInterests?: string;
  
  // Data Categories
  personalDataCategories: PersonalDataCategory[];
  specialCategories: SpecialCategoryData[];
  dataSubjects: DataSubjectInfo[];
  
  // Recipients and Transfers
  recipients: RecipientInfo[];
  internationalTransfers: InternationalTransferInfo[];
  
  // Retention and Deletion
  retentionPeriod: RetentionInfo;
  deletionProcedure: string;
  
  // Security Measures
  technicalMeasures: SecurityMeasureInfo[];
  organizationalMeasures: SecurityMeasureInfo[];
  
  // Risk and Impact
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  dpiaRequired: boolean;
  dpiaReference?: string;
  
  // Compliance
  dataSubjectRights: DataSubjectRightInfo[];
  breachProcedure: string;
  supervisoryAuthority: string;
  
  // Documentation
  documentationReferences: string[];
  relatedActivities: string[];
  
  // Metadata
  createdBy: string;
  lastUpdatedBy: string;
  version: number;
}

export interface ControllerInfo {
  name: string;
  legalName: string;
  contactDetails: ContactDetails;
  representative?: ContactDetails;
  dpo?: ContactDetails;
  registrationNumber?: string;
}

export interface ProcessorInfo {
  name: string;
  legalName: string;
  contactDetails: ContactDetails;
  services: string[];
  dpaReference?: string;
  certifications: string[];
}

export interface ContactDetails {
  name: string;
  address: string;
  email: string;
  phone: string;
}

export interface ProcessingPurpose {
  purpose: string;
  description: string;
  category: 'hr' | 'marketing' | 'customer_service' | 'legal' | 'security' | 'analytics' | 'other';
  necessity: string;
  proportionality: string;
}

export interface LegalBasisInfo {
  basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  description: string;
  evidence?: string;
  conditions?: string[];
}

export interface PersonalDataCategory {
  category: string;
  description: string;
  sensitivity: 'low' | 'medium' | 'high';
  sources: string[];
  automated: boolean;
  examples: string[];
}

export interface SpecialCategoryData {
  category: 'racial_ethnic' | 'political' | 'religious' | 'trade_union' | 'genetic' | 'biometric' | 'health' | 'sex_life' | 'sexual_orientation' | 'criminal';
  description: string;
  legalBasis: string;
  safeguards: string[];
  necessity: string;
}

export interface DataSubjectInfo {
  category: 'employees' | 'customers' | 'suppliers' | 'website_visitors' | 'patients' | 'students' | 'other';
  description: string;
  approximateNumber: string;
  vulnerable: boolean;
  geographicLocation: string[];
}

export interface RecipientInfo {
  name: string;
  category: 'internal' | 'group_company' | 'service_provider' | 'professional_advisor' | 'regulator' | 'law_enforcement' | 'other';
  description: string;
  location: string;
  safeguards?: string[];
  necessity: string;
}

export interface InternationalTransferInfo {
  destination: string;
  adequacyDecision: boolean;
  safeguards: string[];
  safeguardType: 'scc' | 'bcr' | 'certification' | 'cod' | 'derogations';
  frequency: 'occasional' | 'regular' | 'continuous';
  volume: 'low' | 'medium' | 'high';
  restrictions?: string[];
}

export interface RetentionInfo {
  period: string;
  criteria: string;
  legalRequirement?: string;
  businessJustification?: string;
  automaticDeletion: boolean;
  archiving: boolean;
  archivePeriod?: string;
}

export interface SecurityMeasureInfo {
  measure: string;
  description: string;
  category: 'access_control' | 'encryption' | 'backup' | 'monitoring' | 'training' | 'policies' | 'physical' | 'other';
  implementation: string;
  effectiveness: 'basic' | 'enhanced' | 'advanced';
  lastReviewed?: Date;
}

export interface DataSubjectRightInfo {
  right: 'access' | 'rectification' | 'erasure' | 'restrict_processing' | 'data_portability' | 'object' | 'automated_decision_making';
  procedure: string;
  timeframe: string;
  limitations?: string[];
  delegated?: boolean;
}

export interface ROPAReport {
  generatedAt: Date;
  activities: ProcessingActivity[];
  summary: ROPASummary;
  compliance: ROPACompliance;
  recommendations: string[];
}

export interface ROPASummary {
  totalActivities: number;
  activeActivities: number;
  highRiskActivities: number;
  dpiaRequired: number;
  internationalTransfers: number;
  specialCategories: number;
}

export interface ROPACompliance {
  compliant: boolean;
  issues: ComplianceIssue[];
  overdueDPIAs: string[];
  overdueReviews: string[];
  missingInformation: string[];
}

export interface ComplianceIssue {
  activityId: string;
  activityName: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export class ROPAService {
  private static activities = new Map<string, ProcessingActivity>();
  private static activityIndex = new Map<string, Set<string>>(); // For fast searching

  /**
   * Initialize ROPA service
   */
  static initialize(): void {
    this.buildSearchIndex();
    console.log('✅ ROPA Service initialized');
  }

  /**
   * Create new processing activity
   */
  static async createProcessingActivity(
    activityData: Omit<ProcessingActivity, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'nextReview'>,
    createdBy: string
  ): Promise<ProcessingActivity> {
    const activityId = `ropa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const activity: ProcessingActivity = {
      ...activityData,
      id: activityId,
      createdAt: new Date(),
      updatedAt: new Date(),
      nextReview: this.calculateNextReviewDate(),
      version: 1,
      createdBy,
      lastUpdatedBy: createdBy
    };

    this.activities.set(activityId, activity);
    this.updateSearchIndex(activity);

    // Audit activity creation
    await AuditService.logEvent({
      action: 'ropa.activity.created',
      userId: createdBy,
      resourceType: 'processing_activity',
      resourceId: activityId,
      metadata: {
        name: activity.name,
        purposes: activity.purposes.map(p => p.purpose),
        riskLevel: activity.riskLevel
      }
    });

    return activity;
  }

  /**
   * Update processing activity
   */
  static async updateProcessingActivity(
    activityId: string,
    updates: Partial<ProcessingActivity>,
    updatedBy: string
  ): Promise<ProcessingActivity> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Processing activity not found: ${activityId}`);
    }

    const updatedActivity: ProcessingActivity = {
      ...activity,
      ...updates,
      updatedAt: new Date(),
      lastUpdatedBy: updatedBy,
      version: activity.version + 1
    };

    this.activities.set(activityId, updatedActivity);
    this.updateSearchIndex(updatedActivity);

    // Audit activity update
    await AuditService.logEvent({
      action: 'ropa.activity.updated',
      userId: updatedBy,
      resourceType: 'processing_activity',
      resourceId: activityId,
      metadata: {
        updatedFields: Object.keys(updates),
        version: updatedActivity.version
      }
    });

    return updatedActivity;
  }

  /**
   * Mark activity as reviewed
   */
  static async reviewActivity(
    activityId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    const activity = this.activities.get(activityId);
    if (!activity) {
      throw new Error(`Processing activity not found: ${activityId}`);
    }

    await this.updateProcessingActivity(activityId, {
      lastReviewed: new Date(),
      nextReview: this.calculateNextReviewDate()
    }, reviewedBy);

    // Audit review
    await AuditService.logEvent({
      action: 'ropa.activity.reviewed',
      userId: reviewedBy,
      resourceType: 'processing_activity',
      resourceId: activityId,
      metadata: {
        notes,
        nextReview: this.calculateNextReviewDate().toISOString()
      }
    });
  }

  /**
   * Search processing activities
   */
  static searchActivities(
    query: string,
    filters: {
      status?: ProcessingActivity['status'];
      riskLevel?: ProcessingActivity['riskLevel'];
      purpose?: string;
      dataSubject?: string;
      legalBasis?: string;
    } = {}
  ): ProcessingActivity[] {
    let results: Set<string> = new Set();

    // Text search
    if (query) {
      const searchTerms = query.toLowerCase().split(' ');
      for (const term of searchTerms) {
        const termResults = this.activityIndex.get(term) || new Set();
        if (results.size === 0) {
          results = new Set(termResults);
        } else {
          results = new Set([...results].filter(id => termResults.has(id)));
        }
      }
    } else {
      results = new Set(this.activities.keys());
    }

    // Apply filters
    let activities = Array.from(results)
      .map(id => this.activities.get(id)!)
      .filter(activity => {
        if (filters.status && activity.status !== filters.status) return false;
        if (filters.riskLevel && activity.riskLevel !== filters.riskLevel) return false;
        if (filters.purpose && !activity.purposes.some(p => p.category === filters.purpose)) return false;
        if (filters.dataSubject && !activity.dataSubjects.some(ds => ds.category === filters.dataSubject)) return false;
        if (filters.legalBasis && !activity.legalBasis.some(lb => lb.basis === filters.legalBasis)) return false;
        return true;
      });

    return activities.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get processing activity
   */
  static getProcessingActivity(activityId: string): ProcessingActivity | null {
    return this.activities.get(activityId) || null;
  }

  /**
   * List all processing activities
   */
  static listProcessingActivities(
    status?: ProcessingActivity['status']
  ): ProcessingActivity[] {
    let activities = Array.from(this.activities.values());

    if (status) {
      activities = activities.filter(a => a.status === status);
    }

    return activities.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Generate ROPA report
   */
  static generateROPAReport(): ROPAReport {
    const activities = Array.from(this.activities.values());
    
    const summary: ROPASummary = {
      totalActivities: activities.length,
      activeActivities: activities.filter(a => a.status === 'active').length,
      highRiskActivities: activities.filter(a => a.riskLevel === 'high' || a.riskLevel === 'very_high').length,
      dpiaRequired: activities.filter(a => a.dpiaRequired).length,
      internationalTransfers: activities.filter(a => a.internationalTransfers.length > 0).length,
      specialCategories: activities.filter(a => a.specialCategories.length > 0).length
    };

    const compliance = this.assessROPACompliance(activities);

    const recommendations = this.generateROPARecommendations(activities, compliance);

    return {
      generatedAt: new Date(),
      activities,
      summary,
      compliance,
      recommendations
    };
  }

  /**
   * Export ROPA for supervisory authority
   */
  static exportROPAForAuthority(format: 'json' | 'csv' | 'pdf' = 'json'): {
    format: string;
    data: any;
    generatedAt: Date;
  } {
    const activities = this.listProcessingActivities('active');
    
    switch (format) {
      case 'json':
        return {
          format: 'json',
          data: {
            controller: 'PayrollSync',
            activities: activities.map(this.mapActivityForExport)
          },
          generatedAt: new Date()
        };
      
      case 'csv':
        return {
          format: 'csv',
          data: this.generateCSVData(activities),
          generatedAt: new Date()
        };
      
      case 'pdf':
        return {
          format: 'pdf',
          data: this.generatePDFData(activities),
          generatedAt: new Date()
        };
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Check ROPA compliance
   */
  static checkROPACompliance(): ROPACompliance {
    const activities = Array.from(this.activities.values());
    return this.assessROPACompliance(activities);
  }

  /**
   * Get activities requiring review
   */
  static getActivitiesRequiringReview(): ProcessingActivity[] {
    const now = new Date();
    return Array.from(this.activities.values())
      .filter(activity => activity.nextReview <= now)
      .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime());
  }

  /**
   * Get high-risk activities
   */
  static getHighRiskActivities(): ProcessingActivity[] {
    return Array.from(this.activities.values())
      .filter(activity => activity.riskLevel === 'high' || activity.riskLevel === 'very_high')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Private helper methods

  private static calculateNextReviewDate(): Date {
    // Review annually, or sooner for high-risk activities
    const reviewDate = new Date();
    reviewDate.setFullYear(reviewDate.getFullYear() + 1);
    return reviewDate;
  }

  private static buildSearchIndex(): void {
    this.activityIndex.clear();
    
    for (const activity of this.activities.values()) {
      this.updateSearchIndex(activity);
    }
  }

  private static updateSearchIndex(activity: ProcessingActivity): void {
    const searchableText = [
      activity.name,
      activity.description,
      ...activity.purposes.map(p => p.purpose),
      ...activity.personalDataCategories.map(c => c.category),
      ...activity.dataSubjects.map(ds => ds.category)
    ].join(' ').toLowerCase();

    const words = searchableText.split(/\s+/);
    
    for (const word of words) {
      if (word.length > 2) { // Ignore very short words
        if (!this.activityIndex.has(word)) {
          this.activityIndex.set(word, new Set());
        }
        this.activityIndex.get(word)!.add(activity.id);
      }
    }
  }

  private static assessROPACompliance(activities: ProcessingActivity[]): ROPACompliance {
    const issues: ComplianceIssue[] = [];
    const overdueDPIAs: string[] = [];
    const overdueReviews: string[] = [];
    const missingInformation: string[] = [];

    const now = new Date();

    for (const activity of activities) {
      // Check for overdue reviews
      if (activity.nextReview <= now) {
        overdueReviews.push(activity.id);
      }

      // Check for required DPIAs
      if (activity.dpiaRequired && !activity.dpiaReference) {
        overdueDPIAs.push(activity.id);
        issues.push({
          activityId: activity.id,
          activityName: activity.name,
          issue: 'DPIA required but not conducted',
          severity: 'high',
          recommendation: 'Conduct DPIA before processing begins'
        });
      }

      // Check for missing legal basis
      if (activity.legalBasis.length === 0) {
        missingInformation.push(`${activity.id}: Legal basis`);
        issues.push({
          activityId: activity.id,
          activityName: activity.name,
          issue: 'No legal basis specified',
          severity: 'critical',
          recommendation: 'Specify appropriate legal basis for processing'
        });
      }

      // Check for missing security measures
      if (activity.technicalMeasures.length === 0 && activity.organizationalMeasures.length === 0) {
        missingInformation.push(`${activity.id}: Security measures`);
        issues.push({
          activityId: activity.id,
          activityName: activity.name,
          issue: 'No security measures documented',
          severity: 'high',
          recommendation: 'Document technical and organizational measures'
        });
      }

      // Check for international transfers without safeguards
      for (const transfer of activity.internationalTransfers) {
        if (!transfer.adequacyDecision && transfer.safeguards.length === 0) {
          issues.push({
            activityId: activity.id,
            activityName: activity.name,
            issue: `International transfer to ${transfer.destination} lacks adequate safeguards`,
            severity: 'high',
            recommendation: 'Implement appropriate safeguards for international transfer'
          });
        }
      }

      // Check retention periods
      if (!activity.retentionPeriod.period) {
        missingInformation.push(`${activity.id}: Retention period`);
        issues.push({
          activityId: activity.id,
          activityName: activity.name,
          issue: 'No retention period specified',
          severity: 'medium',
          recommendation: 'Define clear retention period and criteria'
        });
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      overdueDPIAs,
      overdueReviews,
      missingInformation
    };
  }

  private static generateROPARecommendations(
    activities: ProcessingActivity[],
    compliance: ROPACompliance
  ): string[] {
    const recommendations: string[] = [];

    if (compliance.overdueDPIAs.length > 0) {
      recommendations.push(`Conduct ${compliance.overdueDPIAs.length} overdue DPIA(s)`);
    }

    if (compliance.overdueReviews.length > 0) {
      recommendations.push(`Review ${compliance.overdueReviews.length} overdue processing activit(ies)`);
    }

    const highRiskCount = activities.filter(a => a.riskLevel === 'high' || a.riskLevel === 'very_high').length;
    if (highRiskCount > 0) {
      recommendations.push(`Review security measures for ${highRiskCount} high-risk activities`);
    }

    const transfersWithoutSafeguards = activities.filter(a => 
      a.internationalTransfers.some(t => !t.adequacyDecision && t.safeguards.length === 0)
    ).length;
    if (transfersWithoutSafeguards > 0) {
      recommendations.push(`Implement safeguards for ${transfersWithoutSafeguards} international transfers`);
    }

    const activitiesWithSpecialCategories = activities.filter(a => a.specialCategories.length > 0).length;
    if (activitiesWithSpecialCategories > 0) {
      recommendations.push(`Ensure appropriate safeguards for ${activitiesWithSpecialCategories} activities processing special categories`);
    }

    return recommendations;
  }

  private static mapActivityForExport(activity: ProcessingActivity): any {
    return {
      name: activity.name,
      purposes: activity.purposes.map(p => p.purpose),
      legalBasis: activity.legalBasis.map(lb => lb.basis),
      personalDataCategories: activity.personalDataCategories.map(c => c.category),
      dataSubjects: activity.dataSubjects.map(ds => ds.category),
      recipients: activity.recipients.map(r => r.name),
      internationalTransfers: activity.internationalTransfers.map(t => ({
        destination: t.destination,
        safeguards: t.safeguards
      })),
      retentionPeriod: activity.retentionPeriod.period,
      securityMeasures: [
        ...activity.technicalMeasures.map(m => m.measure),
        ...activity.organizationalMeasures.map(m => m.measure)
      ]
    };
  }

  private static generateCSVData(activities: ProcessingActivity[]): string {
    const headers = [
      'Name',
      'Purpose',
      'Legal Basis',
      'Data Categories',
      'Data Subjects',
      'Recipients',
      'International Transfers',
      'Retention Period',
      'Security Measures'
    ];

    const rows = activities.map(activity => [
      activity.name,
      activity.purposes.map(p => p.purpose).join('; '),
      activity.legalBasis.map(lb => lb.basis).join('; '),
      activity.personalDataCategories.map(c => c.category).join('; '),
      activity.dataSubjects.map(ds => ds.category).join('; '),
      activity.recipients.map(r => r.name).join('; '),
      activity.internationalTransfers.map(t => `${t.destination} (${t.safeguardType})`).join('; '),
      activity.retentionPeriod.period,
      [...activity.technicalMeasures, ...activity.organizationalMeasures].map(m => m.measure).join('; ')
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  private static generatePDFData(activities: ProcessingActivity[]): any {
    return {
      title: 'Record of Processing Activities (ROPA)',
      controller: 'PayrollSync',
      generatedDate: new Date().toLocaleDateString(),
      activities: activities.map(this.mapActivityForExport)
    };
  }
}