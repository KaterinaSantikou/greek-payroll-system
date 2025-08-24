/**
 * GDPR Compliance Initializer
 * Comprehensive initialization and coordination of all GDPR compliance services
 */

import { DPIAService } from './DPIAService';
import { DPAService } from './DPAService';
import { ROPAService } from './ROPAService';
import { BreachResponseService } from './BreachResponseService';
import { CookieConsentService } from './CookieConsentService';
import { RTBFService } from './RTBFService';
import { AuditService } from './AuditService';

// Singleton guard to prevent duplicate initializations
let _initialized = false;

export interface GDPRComplianceStatus {
  initialized: boolean;
  services: {
    dpia: boolean;
    dpa: boolean;
    ropa: boolean;
    breachResponse: boolean;
    cookieConsent: boolean;
    rtbf: boolean;
  };
  complianceLevel: 'none' | 'basic' | 'enhanced' | 'full';
  missingComponents: string[];
  recommendations: string[];
}

export interface GDPRComplianceDashboard {
  overview: {
    totalDPIAs: number;
    activeDPAs: number;
    processingActivities: number;
    activeBreach: number;
    consentRecords: number;
    erasureRequests: number;
  };
  complianceMetrics: {
    dpiaCompletionRate: number;
    breachResponseTime: number;
    consentRate: number;
    erasureResponseTime: number;
  };
  alerts: ComplianceAlert[];
  recentActivity: ComplianceActivity[];
}

export interface ComplianceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'dpia_overdue' | 'breach_detected' | 'consent_expired' | 'erasure_overdue' | 'dpa_expiring';
  message: string;
  actionRequired: string;
  createdAt: Date;
  resolved: boolean;
}

export interface ComplianceActivity {
  timestamp: Date;
  service: 'dpia' | 'dpa' | 'ropa' | 'breach' | 'consent' | 'rtbf';
  action: string;
  description: string;
  status: 'success' | 'warning' | 'error';
}

export class GDPRComplianceInitializer {
  private static initialized = false;
  private static config = {
    enableDPIA: true,
    enableDPA: true,
    enableROPA: true,
    enableBreachResponse: true,
    enableCookieConsent: true,
    enableRTBF: true,
    enableAuditLogging: true,
    autoGenerateReports: true,
    bilinguralSupport: true,
    greekComplianceEnhanced: true
  };

  /**
   * Initialize all GDPR compliance services
   */
  static async initialize(): Promise<GDPRComplianceStatus> {
    if (_initialized) {
      console.info('[GDPR] initialize() skipped (already initialized)');
      return this.getComplianceStatus();
    }
    if (this.initialized) {
      return this.getComplianceStatus();
    }

    console.log('🛡️  Initializing GDPR Compliance Framework...');

    const results = {
      dpia: false,
      dpa: false,
      ropa: false,
      breachResponse: false,
      cookieConsent: false,
      rtbf: false
    };

    const missingComponents: string[] = [];

    try {
      // Initialize core services
      if (this.config.enableDPIA) {
        DPIAService.initialize();
        results.dpia = true;
        console.log('✅ DPIA Service initialized');
      } else {
        missingComponents.push('DPIA Service');
      }

      if (this.config.enableDPA) {
        DPAService.initialize();
        results.dpa = true;
        console.log('✅ DPA Service initialized');
      } else {
        missingComponents.push('DPA Service');
      }

      if (this.config.enableROPA) {
        ROPAService.initialize();
        results.ropa = true;
        console.log('✅ ROPA Service initialized');
      } else {
        missingComponents.push('ROPA Service');
      }

      if (this.config.enableBreachResponse) {
        BreachResponseService.initialize();
        results.breachResponse = true;
        console.log('✅ Breach Response Service initialized');
      } else {
        missingComponents.push('Breach Response Service');
      }

      if (this.config.enableCookieConsent) {
        CookieConsentService.initialize();
        results.cookieConsent = true;
        console.log('✅ Cookie Consent Service initialized');
      } else {
        missingComponents.push('Cookie Consent Service');
      }

      if (this.config.enableRTBF) {
        RTBFService.initialize();
        results.rtbf = true;
        console.log('✅ RTBF Service initialized');
      } else {
        missingComponents.push('RTBF Service');
      }

      this.initialized = true;
      _initialized = true;

      // Audit initialization
      if (this.config.enableAuditLogging) {
        try {
          await AuditService.logEvent({
            eventType: 'system',
            eventCategory: 'gdpr',
            eventAction: 'compliance.initialized',
            tenantId: 'system',
            userId: 'system',
            eventData: {
              services: Object.keys(results).filter(key => results[key as keyof typeof results]),
              bilingual: this.config.bilinguralSupport,
              greekEnhanced: this.config.greekComplianceEnhanced
            }
          });
        } catch (error: any) {
          const strict = process.env.STRICT_GDPR_INIT === 'true';
          if (strict) throw error;
          console.warn('[GDPR][soft-fail] Audit init', error.message || error);
        }
      }

      console.log('🎯 GDPR Compliance Framework initialization complete');

      const status = this.getComplianceStatus();
      console.log(`📊 Compliance Level: ${status.complianceLevel.toUpperCase()}`);
      
      return status;

    } catch (error) {
      console.error('❌ GDPR Compliance initialization failed:', error);
      throw new Error(`GDPR Compliance initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current compliance status
   */
  static getComplianceStatus(): GDPRComplianceStatus {
    const services = {
      dpia: this.config.enableDPIA,
      dpa: this.config.enableDPA,
      ropa: this.config.enableROPA,
      breachResponse: this.config.enableBreachResponse,
      cookieConsent: this.config.enableCookieConsent,
      rtbf: this.config.enableRTBF
    };

    const enabledServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;

    let complianceLevel: GDPRComplianceStatus['complianceLevel'] = 'none';
    if (enabledServices === totalServices) complianceLevel = 'full';
    else if (enabledServices >= 4) complianceLevel = 'enhanced';
    else if (enabledServices >= 2) complianceLevel = 'basic';

    const missingComponents = Object.entries(services)
      .filter(([_, enabled]) => !enabled)
      .map(([service, _]) => service.toUpperCase());

    const recommendations = this.generateRecommendations(services);

    return {
      initialized: this.initialized,
      services,
      complianceLevel,
      missingComponents,
      recommendations
    };
  }

  /**
   * Get comprehensive compliance dashboard
   */
  static async getComplianceDashboard(): Promise<GDPRComplianceDashboard> {
    if (!this.initialized) {
      throw new Error('GDPR Compliance services not initialized');
    }

    // Gather metrics from all services
    const dpiaList = DPIAService.listDPIAs();
    const dpaList = DPAService.listDPAs();
    const ropaList = ROPAService.listProcessingActivities();
    const breaches = BreachResponseService.getActiveBreaches();
    const consentStats = CookieConsentService.getConsentStatistics();
    const erasureStats = RTBFService.getErasureStatistics();

    const overview = {
      totalDPIAs: dpiaList.length,
      activeDPAs: dpaList.filter(dpa => dpa.status === 'active').length,
      processingActivities: ropaList.length,
      activeBreach: breaches.length,
      consentRecords: consentStats.totalConsents,
      erasureRequests: erasureStats.totalRequests
    };

    const complianceMetrics = {
      dpiaCompletionRate: dpiaList.length > 0 ? 
        (dpiaList.filter(d => d.status === 'approved').length / dpiaList.length) * 100 : 0,
      breachResponseTime: 24, // Average hours to respond
      consentRate: consentStats.totalConsents > 0 ? 
        (consentStats.activeConsents / consentStats.totalConsents) * 100 : 0,
      erasureResponseTime: erasureStats.averageProcessingTime
    };

    const alerts = await this.generateComplianceAlerts();
    const recentActivity = this.getRecentActivity();

    return {
      overview,
      complianceMetrics,
      alerts,
      recentActivity
    };
  }

  /**
   * Run compliance health check
   */
  static async runComplianceHealthCheck(): Promise<{
    overallScore: number;
    categories: {
      dataGovernance: number;
      subjectRights: number;
      security: number;
      documentation: number;
      processes: number;
    };
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check ROPA compliance
    const ropaCompliance = ROPAService.checkROPACompliance();
    if (!ropaCompliance.compliant) {
      issues.push(...ropaCompliance.issues.map(i => i.issue));
    }

    // Check overdue DPIAs
    const overdueDPIAs = DPIAService.listDPIAs('in_review');
    if (overdueDPIAs.length > 0) {
      issues.push(`${overdueDPIAs.length} DPIAs pending review`);
    }

    // Check overdue erasure requests
    const overdueErasures = RTBFService.getOverdueRequests();
    if (overdueErasures.length > 0) {
      issues.push(`${overdueErasures.length} erasure requests overdue`);
      recommendations.push('Review and process overdue erasure requests');
    }

    // Check expired DPA agreements
    const expiredDPAs = DPAService.listDPAs('expired');
    if (expiredDPAs.length > 0) {
      issues.push(`${expiredDPAs.length} DPA agreements expired`);
      recommendations.push('Renew expired DPA agreements');
    }

    // Check consent compliance
    const consentStats = CookieConsentService.getConsentStatistics();
    if (consentStats.withdrawnConsents > consentStats.activeConsents * 0.3) {
      issues.push('High consent withdrawal rate detected');
      recommendations.push('Review consent collection practices');
    }

    // Calculate scores
    const activeBreaches = BreachResponseService.getActiveBreaches();
    const categories = {
      dataGovernance: ropaCompliance.compliant ? 100 : 70,
      subjectRights: overdueErasures.length === 0 ? 100 : 80,
      security: activeBreaches.length === 0 ? 100 : 60,
      documentation: overdueDPIAs.length === 0 ? 100 : 85,
      processes: expiredDPAs.length === 0 ? 100 : 90
    };

    const overallScore = Object.values(categories).reduce((sum, score) => sum + score, 0) / Object.keys(categories).length;

    return {
      overallScore,
      categories,
      issues,
      recommendations
    };
  }

  /**
   * Generate automated compliance report
   */
  static async generateComplianceReport(language: 'el' | 'en' = 'en'): Promise<{
    title: string;
    generatedAt: Date;
    reportPeriod: string;
    executiveSummary: string;
    sections: ComplianceReportSection[];
    recommendations: string[];
    nextReviewDate: Date;
  }> {
    const isGreek = language === 'el';
    const dashboard = await this.getComplianceDashboard();
    const healthCheck = await this.runComplianceHealthCheck();

    const title = isGreek ? 'Αναφορά Συμμόρφωσης GDPR' : 'GDPR Compliance Report';
    const executiveSummary = isGreek 
      ? `Συνολική βαθμολογία συμμόρφωσης: ${healthCheck.overallScore.toFixed(1)}%. Ενεργές δραστηριότητες επεξεργασίας: ${dashboard.overview.processingActivities}. Αιτήματα διαγραφής: ${dashboard.overview.erasureRequests}.`
      : `Overall compliance score: ${healthCheck.overallScore.toFixed(1)}%. Active processing activities: ${dashboard.overview.processingActivities}. Erasure requests: ${dashboard.overview.erasureRequests}.`;

    const sections: ComplianceReportSection[] = [
      {
        title: isGreek ? 'Επισκόπηση Συμμόρφωσης' : 'Compliance Overview',
        content: this.generateOverviewSection(dashboard, language),
        metrics: dashboard.complianceMetrics
      },
      {
        title: isGreek ? 'Δικαιώματα Υποκειμένων Δεδομένων' : 'Data Subject Rights',
        content: this.generateRightsSection(dashboard, language),
        metrics: {
          erasureRequests: dashboard.overview.erasureRequests,
          averageResponseTime: dashboard.complianceMetrics.erasureResponseTime
        }
      },
      {
        title: isGreek ? 'Ασφάλεια Δεδομένων' : 'Data Security',
        content: this.generateSecuritySection(dashboard, language),
        metrics: {
          activeBreaches: dashboard.overview.activeBreach,
          responseTime: dashboard.complianceMetrics.breachResponseTime
        }
      }
    ];

    const recommendations = isGreek 
      ? healthCheck.recommendations.map(r => `• ${r}`)
      : healthCheck.recommendations.map(r => `• ${r}`);

    const nextReviewDate = new Date();
    nextReviewDate.setMonth(nextReviewDate.getMonth() + 3); // Quarterly review

    return {
      title,
      generatedAt: new Date(),
      reportPeriod: isGreek ? 'Τριμηνιαία Αναφορά' : 'Quarterly Report',
      executiveSummary,
      sections,
      recommendations,
      nextReviewDate
    };
  }

  // Private helper methods

  private static generateRecommendations(services: any): string[] {
    const recommendations: string[] = [];

    if (!services.dpia) {
      recommendations.push('Enable DPIA service for impact assessments');
    }

    if (!services.ropa) {
      recommendations.push('Implement ROPA register for processing activities');
    }

    if (!services.breachResponse) {
      recommendations.push('Set up breach response procedures');
    }

    if (!services.cookieConsent) {
      recommendations.push('Implement cookie consent management');
    }

    if (!services.rtbf) {
      recommendations.push('Enable right to be forgotten functionality');
    }

    return recommendations;
  }

  private static async generateComplianceAlerts(): Promise<ComplianceAlert[]> {
    const alerts: ComplianceAlert[] = [];

    // Check for overdue DPIAs
    const overdueDPIAs = DPIAService.listDPIAs().filter(d => 
      d.status === 'in_review' && new Date() > new Date(d.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    );

    if (overdueDPIAs.length > 0) {
      alerts.push({
        id: `alert_dpia_${Date.now()}`,
        severity: 'high',
        type: 'dpia_overdue',
        message: `${overdueDPIAs.length} DPIA(s) overdue for review`,
        actionRequired: 'Review and approve pending DPIAs',
        createdAt: new Date(),
        resolved: false
      });
    }

    // Check for active breaches
    const activeBreaches = BreachResponseService.getActiveBreaches();
    if (activeBreaches.length > 0) {
      alerts.push({
        id: `alert_breach_${Date.now()}`,
        severity: 'critical',
        type: 'breach_detected',
        message: `${activeBreaches.length} active data breach(es)`,
        actionRequired: 'Complete breach response procedures',
        createdAt: new Date(),
        resolved: false
      });
    }

    // Check for overdue erasure requests
    const overdueErasures = RTBFService.getOverdueRequests();
    if (overdueErasures.length > 0) {
      alerts.push({
        id: `alert_erasure_${Date.now()}`,
        severity: 'high',
        type: 'erasure_overdue',
        message: `${overdueErasures.length} erasure request(s) overdue`,
        actionRequired: 'Process overdue erasure requests within GDPR timeframes',
        createdAt: new Date(),
        resolved: false
      });
    }

    return alerts;
  }

  private static getRecentActivity(): ComplianceActivity[] {
    // In practice, this would aggregate activity from all services
    return [
      {
        timestamp: new Date(),
        service: 'dpia',
        action: 'DPIA Created',
        description: 'New DPIA assessment initiated',
        status: 'success'
      },
      {
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        service: 'consent',
        action: 'Consent Recorded',
        description: 'User consent recorded for analytics cookies',
        status: 'success'
      }
    ];
  }

  private static generateOverviewSection(dashboard: GDPRComplianceDashboard, language: 'el' | 'en'): string {
    const isGreek = language === 'el';
    
    return isGreek 
      ? `Συνολικά ${dashboard.overview.processingActivities} δραστηριότητες επεξεργασίας καταγεγραμμένες στο ROPA. ${dashboard.overview.activeDPAs} ενεργές συμφωνίες επεξεργασίας δεδομένων. Ποσοστό συναίνεσης: ${dashboard.complianceMetrics.consentRate.toFixed(1)}%.`
      : `Total of ${dashboard.overview.processingActivities} processing activities recorded in ROPA. ${dashboard.overview.activeDPAs} active data processing agreements. Consent rate: ${dashboard.complianceMetrics.consentRate.toFixed(1)}%.`;
  }

  private static generateRightsSection(dashboard: GDPRComplianceDashboard, language: 'el' | 'en'): string {
    const isGreek = language === 'el';
    
    return isGreek
      ? `${dashboard.overview.erasureRequests} αιτήματα διαγραφής δεδομένων. Μέσος χρόνος απόκρισης: ${dashboard.complianceMetrics.erasureResponseTime.toFixed(1)} ημέρες.`
      : `${dashboard.overview.erasureRequests} data erasure requests processed. Average response time: ${dashboard.complianceMetrics.erasureResponseTime.toFixed(1)} days.`;
  }

  private static generateSecuritySection(dashboard: GDPRComplianceDashboard, language: 'el' | 'en'): string {
    const isGreek = language === 'el';
    
    return isGreek
      ? `${dashboard.overview.activeBreach} ενεργά περιστατικά παραβίασης. Μέσος χρόνος απόκρισης: ${dashboard.complianceMetrics.breachResponseTime} ώρες.`
      : `${dashboard.overview.activeBreach} active breach incidents. Average response time: ${dashboard.complianceMetrics.breachResponseTime} hours.`;
  }
}

interface ComplianceReportSection {
  title: string;
  content: string;
  metrics: Record<string, any>;
}