import type { Express } from 'express';
import { z } from 'zod';

// Rule pack version with legal compliance tracking
interface RulePackVersion {
  id: string;
  packName: string;
  version: string;
  effectiveDate: Date;
  createdDate: Date;
  createdBy: string;
  status:
    | 'draft'
    | 'review'
    | 'approved'
    | 'published'
    | 'superseded'
    | 'retired';
  legalApproval?: {
    approvedBy: string;
    approvedDate: Date;
    approvalNotes: string;
    legalReference: string;
  };
  ruleContent: {
    rules: Array<{
      id: string;
      category: string;
      name: string;
      description: string;
      expression: string;
      metadata: Record<string, any>;
    }>;
    metadata: {
      source: string;
      jurisdiction: 'greece' | 'eu' | 'global';
      compliance: string[];
      impact: 'low' | 'medium' | 'high' | 'critical';
    };
  };
  changelog: string;
  diffSummary?: {
    added: number;
    modified: number;
    removed: number;
    impactedEmployees: number;
  };
}

// Legal watch configuration for monitoring regulatory changes
interface LegalWatch {
  id: string;
  name: string;
  jurisdiction: 'greece' | 'eu' | 'global';
  category:
    | 'labor_law'
    | 'tax_law'
    | 'social_security'
    | 'data_protection'
    | 'employment_standards';
  keywords: string[];
  sources: Array<{
    name: string;
    url: string;
    type: 'government' | 'legal_database' | 'news' | 'journal';
    lastChecked: Date;
  }>;
  isActive: boolean;
  notificationEmails: string[];
  lastAlert?: {
    date: Date;
    title: string;
    summary: string;
    urgency: 'low' | 'medium' | 'high' | 'urgent';
  };
}

// Tenant deployment configuration
interface TenantDeployment {
  id: string;
  tenantId: string;
  tenantName: string;
  rulePackVersionId: string;
  deploymentStatus:
    | 'pending'
    | 'deploying'
    | 'deployed'
    | 'failed'
    | 'rollback';
  deployedDate?: Date;
  deployedBy: string;
  rollbackVersionId?: string;
  deploymentNotes: string;
  validationResults?: {
    passed: boolean;
    warnings: string[];
    errors: string[];
    impactedRecords: number;
  };
}

// Legal change alert from monitoring
interface LegalAlert {
  id: string;
  watchId: string;
  title: string;
  summary: string;
  fullText: string;
  source: string;
  publishedDate: Date;
  detectedDate: Date;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  keywords: string[];
  recommendedActions: string[];
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed';
  assignedTo?: string;
  dueDate?: Date;
}

export class ChangeLogLegalWatchService {
  private rulePackVersions: Map<string, RulePackVersion> = new Map();
  private legalWatches: Map<string, LegalWatch> = new Map();
  private tenantDeployments: Map<string, TenantDeployment[]> = new Map(); // TenantId -> Deployments
  private legalAlerts: Map<string, LegalAlert> = new Map();
  private tenantConfigurations: Map<
    string,
    {
      name: string;
      properties: string[];
      environment: 'development' | 'staging' | 'production';
    }
  > = new Map();

  constructor() {
    this.initializeDefaultWatches();
    this.initializeSampleTenants();
    this.generateSampleRulePacks();
  }

  private initializeDefaultWatches(): void {
    const defaultWatches: LegalWatch[] = [
      {
        id: 'greece_minimum_wage',
        name: 'Greece Minimum Wage Updates',
        jurisdiction: 'greece',
        category: 'labor_law',
        keywords: ['κατώτατος μισθός', 'minimum wage', 'ΕΡΓΑΣΕ', 'εργασιακά'],
        sources: [
          {
            name: 'Ministry of Labor',
            url: 'https://ypergasias.gov.gr/',
            type: 'government',
            lastChecked: new Date(),
          },
          {
            name: 'Hellenic Republic Official Gazette',
            url: 'https://www.et.gr/',
            type: 'government',
            lastChecked: new Date(),
          },
        ],
        isActive: true,
        notificationEmails: ['legal@company.com', 'hr@company.com'],
        lastAlert: {
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          title: 'Minimum Wage Increase - April 2024',
          summary:
            'Greek minimum wage increased to €880/month effective April 1, 2024',
          urgency: 'high',
        },
      },
      {
        id: 'efka_contribution_rates',
        name: 'EFKA Contribution Rate Changes',
        jurisdiction: 'greece',
        category: 'social_security',
        keywords: ['ΕΦΚΑ', 'εισφορές', 'ασφαλιστικές', 'contributions'],
        sources: [
          {
            name: 'e-EFKA Portal',
            url: 'https://www.efka.gov.gr/',
            type: 'government',
            lastChecked: new Date(),
          },
        ],
        isActive: true,
        notificationEmails: ['payroll@company.com', 'compliance@company.com'],
      },
      {
        id: 'eu_working_time_directive',
        name: 'EU Working Time Directive Updates',
        jurisdiction: 'eu',
        category: 'employment_standards',
        keywords: ['working time', 'directive', 'hours', 'rest periods'],
        sources: [
          {
            name: 'EUR-Lex',
            url: 'https://eur-lex.europa.eu/',
            type: 'legal_database',
            lastChecked: new Date(),
          },
        ],
        isActive: true,
        notificationEmails: ['legal@company.com'],
      },
      {
        id: 'gdpr_updates',
        name: 'GDPR and Data Protection Updates',
        jurisdiction: 'eu',
        category: 'data_protection',
        keywords: ['GDPR', 'data protection', 'privacy', 'personal data'],
        sources: [
          {
            name: 'European Data Protection Board',
            url: 'https://edpb.europa.eu/',
            type: 'government',
            lastChecked: new Date(),
          },
        ],
        isActive: true,
        notificationEmails: ['dpo@company.com', 'legal@company.com'],
      },
    ];

    defaultWatches.forEach(watch => {
      this.legalWatches.set(watch.id, watch);
    });
  }

  private initializeSampleTenants(): void {
    const sampleTenants = [
      {
        id: 'hotel_athens_1',
        name: 'Athens Grand Hotel',
        properties: ['Main Building', 'Annex', 'Spa'],
        environment: 'production' as const,
      },
      {
        id: 'hotel_thessaloniki_1',
        name: 'Thessaloniki Palace',
        properties: ['North Wing', 'South Wing'],
        environment: 'production' as const,
      },
      {
        id: 'boutique_mykonos',
        name: 'Mykonos Boutique Resort',
        properties: ['Main Resort', 'Beach Club'],
        environment: 'production' as const,
      },
      {
        id: 'staging_test',
        name: 'Staging Environment',
        properties: ['Test Property'],
        environment: 'staging' as const,
      },
      {
        id: 'dev_sandbox',
        name: 'Development Sandbox',
        properties: ['Dev Property'],
        environment: 'development' as const,
      },
    ];

    sampleTenants.forEach(tenant => {
      this.tenantConfigurations.set(tenant.id, tenant);
      this.tenantDeployments.set(tenant.id, []);
    });
  }

  private generateSampleRulePacks(): void {
    // Current production version
    const currentVersion: RulePackVersion = {
      id: 'greek_payroll_v2.4.1',
      packName: 'Greek Payroll Rules',
      version: '2.4.1',
      effectiveDate: new Date('2024-04-01'),
      createdDate: new Date('2024-03-15'),
      createdBy: 'legal@company.com',
      status: 'published',
      legalApproval: {
        approvedBy: 'Maria Papadopoulos, Legal Counsel',
        approvedDate: new Date('2024-03-20'),
        approvalNotes: 'Approved for minimum wage increase to €880/month',
        legalReference: 'Law 4808/2021 Amendment',
      },
      ruleContent: {
        rules: [
          {
            id: 'minimum_wage_2024',
            category: 'wages',
            name: 'Greek Minimum Wage 2024',
            description: 'Minimum wage calculation for Greek employees',
            expression: 'basePay >= 880.0 && category === "minimum_wage"',
            metadata: {
              monthlyAmount: 880.0,
              dailyAmount: 29.33,
              hourlyAmount: 3.67,
              effectiveDate: '2024-04-01',
            },
          },
          {
            id: 'efka_rates_2024',
            category: 'contributions',
            name: 'EFKA Contribution Rates 2024',
            description: 'Employee and employer EFKA contribution rates',
            expression: 'employeeRate = 16.0; employerRate = 24.56;',
            metadata: {
              employeeRate: 16.0,
              employerRate: 24.56,
              ceiling: 6713.36,
              floor: 880.0,
            },
          },
        ],
        metadata: {
          source: 'Greek Ministry of Labor',
          jurisdiction: 'greece',
          compliance: ['Law 4808/2021', 'EFKA Regulation 2024'],
          impact: 'high',
        },
      },
      changelog:
        'Updated minimum wage to €880/month effective April 1, 2024. Updated EFKA rates for 2024.',
      diffSummary: {
        added: 0,
        modified: 2,
        removed: 0,
        impactedEmployees: 1250,
      },
    };

    // New draft version with proposed changes
    const draftVersion: RulePackVersion = {
      id: 'greek_payroll_v2.5.0_draft',
      packName: 'Greek Payroll Rules',
      version: '2.5.0',
      effectiveDate: new Date('2024-07-01'),
      createdDate: new Date(),
      createdBy: 'system@company.com',
      status: 'draft',
      ruleContent: {
        rules: [
          {
            id: 'minimum_wage_2024',
            category: 'wages',
            name: 'Greek Minimum Wage 2024',
            description: 'Minimum wage calculation for Greek employees',
            expression: 'basePay >= 880.0 && category === "minimum_wage"',
            metadata: {
              monthlyAmount: 880.0,
              dailyAmount: 29.33,
              hourlyAmount: 3.67,
              effectiveDate: '2024-04-01',
            },
          },
          {
            id: 'efka_rates_2024_updated',
            category: 'contributions',
            name: 'EFKA Contribution Rates 2024 Q3',
            description:
              'Updated employee and employer EFKA contribution rates',
            expression: 'employeeRate = 16.2; employerRate = 24.78;',
            metadata: {
              employeeRate: 16.2,
              employerRate: 24.78,
              ceiling: 6850.0,
              floor: 880.0,
            },
          },
          {
            id: 'digital_work_card_compliance',
            category: 'compliance',
            name: 'Digital Work Card Requirements',
            description: 'Mandatory digital work card for all employees',
            expression:
              'hasDigitalWorkCard === true || exemptFromCard === true',
            metadata: {
              mandatory: true,
              exemptions: ['remote_only', 'executive_level'],
              fineAmount: 500.0,
            },
          },
        ],
        metadata: {
          source: 'Greek Ministry of Labor',
          jurisdiction: 'greece',
          compliance: [
            'Law 4808/2021',
            'EFKA Regulation 2024',
            'Digital Work Card Law 2024',
          ],
          impact: 'high',
        },
      },
      changelog:
        'Added Digital Work Card compliance rule. Updated EFKA rates for Q3 2024. Increased contribution ceiling.',
      diffSummary: {
        added: 1,
        modified: 1,
        removed: 0,
        impactedEmployees: 1250,
      },
    };

    this.rulePackVersions.set(currentVersion.id, currentVersion);
    this.rulePackVersions.set(draftVersion.id, draftVersion);

    // Generate some sample deployments
    const sampleDeployment: TenantDeployment = {
      id: 'deploy_001',
      tenantId: 'hotel_athens_1',
      tenantName: 'Athens Grand Hotel',
      rulePackVersionId: currentVersion.id,
      deploymentStatus: 'deployed',
      deployedDate: new Date('2024-04-01'),
      deployedBy: 'admin@company.com',
      deploymentNotes: 'Minimum wage update deployment - successful',
      validationResults: {
        passed: true,
        warnings: [],
        errors: [],
        impactedRecords: 180,
      },
    };

    this.tenantDeployments.get('hotel_athens_1')?.push(sampleDeployment);

    // Generate sample legal alerts
    this.generateSampleLegalAlerts();
  }

  private generateSampleLegalAlerts(): void {
    const sampleAlerts: LegalAlert[] = [
      {
        id: 'alert_001',
        watchId: 'greece_minimum_wage',
        title: 'Proposed Minimum Wage Increase - October 2024',
        summary:
          'Greek government proposes minimum wage increase to €900/month starting January 2025',
        fullText:
          'The Ministry of Labor announced a consultation period for increasing the national minimum wage from €880 to €900 per month, effective January 1, 2025. This represents a 2.3% increase and will affect approximately 650,000 workers across Greece.',
        source: 'Ministry of Labor Press Release',
        publishedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        detectedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        urgency: 'high',
        category: 'labor_law',
        keywords: ['minimum wage', 'increase', '€900'],
        recommendedActions: [
          'Review impact on payroll calculations',
          'Update rule pack for January 2025 effective date',
          'Notify affected tenants of upcoming changes',
          'Schedule legal review of updated calculations',
        ],
        status: 'new',
      },
      {
        id: 'alert_002',
        watchId: 'efka_contribution_rates',
        title: 'EFKA Contribution Ceiling Adjustment',
        summary: 'EFKA announces adjustment to contribution ceiling for 2025',
        fullText:
          'The Unified Social Security Fund (e-EFKA) announced an adjustment to the contribution ceiling from €6,713.36 to €6,950.00 monthly, effective January 1, 2025.',
        source: 'e-EFKA Official Bulletin',
        publishedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        detectedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        urgency: 'medium',
        category: 'social_security',
        keywords: ['EFKA', 'ceiling', 'contributions'],
        recommendedActions: [
          'Update contribution calculation rules',
          'Test impact on high-income employees',
          'Schedule deployment for December 2024',
        ],
        status: 'reviewed',
        assignedTo: 'legal@company.com',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ];

    sampleAlerts.forEach(alert => {
      this.legalAlerts.set(alert.id, alert);
    });
  }

  // Rule pack version management
  createRulePackVersion(
    packData: Omit<RulePackVersion, 'id' | 'createdDate' | 'status'>
  ): RulePackVersion {
    const id = `${packData.packName.toLowerCase().replace(/\s+/g, '_')}_v${packData.version}_${Date.now()}`;
    const rulePackVersion: RulePackVersion = {
      ...packData,
      id,
      createdDate: new Date(),
      status: 'draft',
    };

    this.rulePackVersions.set(id, rulePackVersion);
    return rulePackVersion;
  }

  getRulePackVersions(packName?: string): RulePackVersion[] {
    const versions = Array.from(this.rulePackVersions.values());
    return packName
      ? versions
          .filter(v => v.packName === packName)
          .sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime())
      : versions.sort(
          (a, b) => b.createdDate.getTime() - a.createdDate.getTime()
        );
  }

  getRulePackVersion(id: string): RulePackVersion | undefined {
    return this.rulePackVersions.get(id);
  }

  updateRulePackStatus(
    id: string,
    status: RulePackVersion['status'],
    approvalData?: RulePackVersion['legalApproval']
  ): RulePackVersion {
    const rulePack = this.rulePackVersions.get(id);
    if (!rulePack) {
      throw new Error('Rule pack version not found');
    }

    rulePack.status = status;
    if (status === 'approved' && approvalData) {
      rulePack.legalApproval = approvalData;
    }

    this.rulePackVersions.set(id, rulePack);
    return rulePack;
  }

  // Diff comparison between versions
  compareRulePackVersions(
    sourceId: string,
    targetId: string
  ): {
    source: RulePackVersion;
    target: RulePackVersion;
    differences: {
      added: Array<{ type: 'rule'; data: any }>;
      modified: Array<{ type: 'rule'; before: any; after: any }>;
      removed: Array<{ type: 'rule'; data: any }>;
    };
    summary: {
      totalChanges: number;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      impactAssessment: string;
    };
  } {
    const source = this.rulePackVersions.get(sourceId);
    const target = this.rulePackVersions.get(targetId);

    if (!source || !target) {
      throw new Error('One or both rule pack versions not found');
    }

    const sourceRules = new Map(source.ruleContent.rules.map(r => [r.id, r]));
    const targetRules = new Map(target.ruleContent.rules.map(r => [r.id, r]));

    const added = [];
    const modified = [];
    const removed = [];

    // Find added and modified rules
    for (const [id, targetRule] of targetRules) {
      const sourceRule = sourceRules.get(id);
      if (!sourceRule) {
        added.push({ type: 'rule' as const, data: targetRule });
      } else if (JSON.stringify(sourceRule) !== JSON.stringify(targetRule)) {
        modified.push({
          type: 'rule' as const,
          before: sourceRule,
          after: targetRule,
        });
      }
    }

    // Find removed rules
    for (const [id, sourceRule] of sourceRules) {
      if (!targetRules.has(id)) {
        removed.push({ type: 'rule' as const, data: sourceRule });
      }
    }

    const totalChanges = added.length + modified.length + removed.length;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (
      totalChanges > 10 ||
      target.ruleContent.metadata.impact === 'critical'
    ) {
      riskLevel = 'critical';
    } else if (
      totalChanges > 5 ||
      target.ruleContent.metadata.impact === 'high'
    ) {
      riskLevel = 'high';
    } else if (
      totalChanges > 2 ||
      target.ruleContent.metadata.impact === 'medium'
    ) {
      riskLevel = 'medium';
    }

    return {
      source,
      target,
      differences: { added, modified, removed },
      summary: {
        totalChanges,
        riskLevel,
        impactAssessment: `${totalChanges} total changes detected. Risk level: ${riskLevel}. Estimated impact: ${target.diffSummary?.impactedEmployees || 0} employees affected.`,
      },
    };
  }

  // Tenant deployment management
  deployToTenant(
    tenantId: string,
    rulePackVersionId: string,
    deployedBy: string,
    notes: string
  ): TenantDeployment {
    const rulePack = this.rulePackVersions.get(rulePackVersionId);
    const tenant = this.tenantConfigurations.get(tenantId);

    if (!rulePack) {
      throw new Error('Rule pack version not found');
    }

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (rulePack.status !== 'approved' && rulePack.status !== 'published') {
      throw new Error('Can only deploy approved or published rule packs');
    }

    const deployment: TenantDeployment = {
      id: `deploy_${Date.now()}`,
      tenantId,
      tenantName: tenant.name,
      rulePackVersionId,
      deploymentStatus: 'deploying',
      deployedBy,
      deploymentNotes: notes,
      validationResults: {
        passed: true,
        warnings: [],
        errors: [],
        impactedRecords: Math.floor(Math.random() * 300) + 50, // Simulate impact calculation
      },
    };

    // Simulate deployment process
    setTimeout(() => {
      deployment.deploymentStatus = 'deployed';
      deployment.deployedDate = new Date();

      // Update rule pack status to published if first deployment
      if (rulePack.status === 'approved') {
        rulePack.status = 'published';
        this.rulePackVersions.set(rulePackVersionId, rulePack);
      }
    }, 2000);

    if (!this.tenantDeployments.has(tenantId)) {
      this.tenantDeployments.set(tenantId, []);
    }

    this.tenantDeployments.get(tenantId)!.push(deployment);
    return deployment;
  }

  getTenantDeployments(tenantId: string): TenantDeployment[] {
    return this.tenantDeployments.get(tenantId) || [];
  }

  getAllTenants(): Array<{
    id: string;
    name: string;
    properties: string[];
    environment: string;
  }> {
    return Array.from(this.tenantConfigurations.entries()).map(
      ([id, config]) => ({
        id,
        ...config,
      })
    );
  }

  // Legal watch management
  getLegalWatches(): LegalWatch[] {
    return Array.from(this.legalWatches.values());
  }

  updateLegalWatch(id: string, updates: Partial<LegalWatch>): LegalWatch {
    const watch = this.legalWatches.get(id);
    if (!watch) {
      throw new Error('Legal watch not found');
    }

    const updatedWatch = { ...watch, ...updates };
    this.legalWatches.set(id, updatedWatch);
    return updatedWatch;
  }

  // Legal alerts management
  getLegalAlerts(status?: LegalAlert['status']): LegalAlert[] {
    const alerts = Array.from(this.legalAlerts.values());
    return status
      ? alerts
          .filter(a => a.status === status)
          .sort((a, b) => b.detectedDate.getTime() - a.detectedDate.getTime())
      : alerts.sort(
          (a, b) => b.detectedDate.getTime() - a.detectedDate.getTime()
        );
  }

  updateLegalAlert(id: string, updates: Partial<LegalAlert>): LegalAlert {
    const alert = this.legalAlerts.get(id);
    if (!alert) {
      throw new Error('Legal alert not found');
    }

    const updatedAlert = { ...alert, ...updates };
    this.legalAlerts.set(id, updatedAlert);
    return updatedAlert;
  }

  // Dashboard analytics
  getDashboardAnalytics(): {
    rulePackSummary: {
      total: number;
      byStatus: Record<string, number>;
      pendingApproval: number;
      readyForDeployment: number;
    };
    deploymentSummary: {
      totalDeployments: number;
      successfulDeployments: number;
      failedDeployments: number;
      tenantsCovered: number;
    };
    alertsSummary: {
      totalAlerts: number;
      newAlerts: number;
      urgentAlerts: number;
      overdueActions: number;
    };
    complianceStatus: {
      watchesActive: number;
      lastUpdate: Date;
      coverageScore: number;
    };
  } {
    const rulePacks = Array.from(this.rulePackVersions.values());
    const deployments = Array.from(this.tenantDeployments.values()).flat();
    const alerts = Array.from(this.legalAlerts.values());
    const watches = Array.from(this.legalWatches.values());

    // Rule pack summary
    const byStatus: Record<string, number> = {};
    rulePacks.forEach(rp => {
      byStatus[rp.status] = (byStatus[rp.status] || 0) + 1;
    });

    // Deployment summary
    const successfulDeployments = deployments.filter(
      d => d.deploymentStatus === 'deployed'
    ).length;
    const failedDeployments = deployments.filter(
      d => d.deploymentStatus === 'failed'
    ).length;
    const tenantsCovered = new Set(deployments.map(d => d.tenantId)).size;

    // Alerts summary
    const newAlerts = alerts.filter(a => a.status === 'new').length;
    const urgentAlerts = alerts.filter(a => a.urgency === 'urgent').length;
    const overdueActions = alerts.filter(
      a => a.dueDate && a.dueDate < new Date() && a.status !== 'actioned'
    ).length;

    return {
      rulePackSummary: {
        total: rulePacks.length,
        byStatus,
        pendingApproval: byStatus['review'] || 0,
        readyForDeployment: byStatus['approved'] || 0,
      },
      deploymentSummary: {
        totalDeployments: deployments.length,
        successfulDeployments,
        failedDeployments,
        tenantsCovered,
      },
      alertsSummary: {
        totalAlerts: alerts.length,
        newAlerts,
        urgentAlerts,
        overdueActions,
      },
      complianceStatus: {
        watchesActive: watches.filter(w => w.isActive).length,
        lastUpdate: new Date(),
        coverageScore: Math.round(
          (watches.filter(w => w.isActive).length / watches.length) * 100
        ),
      },
    };
  }
}

// Export singleton instance
export const changeLogLegalWatchService = new ChangeLogLegalWatchService();
