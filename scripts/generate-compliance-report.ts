#!/usr/bin/env tsx

/**
 * Compliance Report Generation Script
 * 
 * This script generates comprehensive compliance reports showing the status
 * of legal documents, configuration alignment, and regulatory compliance.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { legalDocumentTracker } from '../lib/payroll/config/legal-document-tracker.js';
import { greekLawConfigLoader } from '../lib/payroll/config/greek-law-config.js';

interface ComplianceReport {
  generatedAt: string;
  reportVersion: string;
  configVersion: string;
  complianceStatus: {
    overall: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT';
    score: number;
    issues: string[];
    recommendations: string[];
  };
  documents: {
    total: number;
    active: number;
    expired: number;
    expiringSoon: number;
    underReview: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
  };
  configurationAlignment: {
    sectionsTracked: number;
    sectionsCompliant: number;
    missingDocumentation: string[];
    outdatedReferences: string[];
  };
  auditTrail: {
    recentChanges: Array<{
      documentId: string;
      version: string;
      date: string;
      changes: string;
    }>;
    upcomingReviews: Array<{
      documentId: string;
      reviewDate: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }>;
  };
}

class ComplianceReportGenerator {
  
  /**
   * Generate comprehensive compliance report
   */
  async generateReport(): Promise<ComplianceReport> {
    console.log('📊 Generating compliance report...\n');

    try {
      // Get current configuration
      const config = await greekLawConfigLoader.loadConfig();
      const complianceStatus = await greekLawConfigLoader.getComplianceStatus();
      
      // Generate full compliance report from legal document tracker
      const fullReport = legalDocumentTracker.generateComplianceReport();
      
      // Calculate compliance metrics
      const complianceMetrics = await this.calculateComplianceMetrics();
      
      // Get documents requiring attention
      const attentionItems = legalDocumentTracker.getDocumentsRequiringAttention();
      
      // Build comprehensive report
      const report: ComplianceReport = {
        generatedAt: new Date().toISOString(),
        reportVersion: '1.0.0',
        configVersion: config.version,
        
        complianceStatus: {
          overall: this.determineOverallCompliance(complianceStatus, attentionItems),
          score: complianceMetrics.score,
          issues: complianceStatus.issues,
          recommendations: this.generateRecommendations(attentionItems)
        },
        
        documents: {
          total: fullReport.documentSummary.total,
          active: fullReport.documentSummary.active,
          expired: attentionItems.expiringSoon.length,
          expiringSoon: attentionItems.expiringSoon.length,
          underReview: attentionItems.underReview.length,
          byCategory: fullReport.documentSummary.byCategory,
          byType: fullReport.documentSummary.byType
        },
        
        configurationAlignment: complianceMetrics.configurationAlignment,
        
        auditTrail: {
          recentChanges: this.getRecentDocumentChanges(),
          upcomingReviews: this.getUpcomingReviews()
        }
      };

      return report;
      
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Calculate compliance metrics and scores
   */
  private async calculateComplianceMetrics(): Promise<{
    score: number;
    configurationAlignment: {
      sectionsTracked: number;
      sectionsCompliant: number;
      missingDocumentation: string[];
      outdatedReferences: string[];
    };
  }> {
    const configSections = [
      'minimumWage',
      'efkaRates', 
      'taxBrackets',
      'workingTimeLimits',
      'premiumRates',
      'severanceRules'
    ];

    let compliantSections = 0;
    const missingDocumentation: string[] = [];
    const outdatedReferences: string[] = [];

    // Check each configuration section
    for (const section of configSections) {
      const documents = legalDocumentTracker.getDocumentsForConfigSection(section);
      
      if (documents.length === 0) {
        missingDocumentation.push(section);
      } else {
        // Check if all documents are current and active
        const allCurrent = documents.every(doc => {
          if (doc.status !== 'ACTIVE') return false;
          if (doc.expiryDate) {
            const expiry = new Date(doc.expiryDate);
            return expiry > new Date();
          }
          return true;
        });
        
        if (allCurrent) {
          compliantSections++;
        } else {
          outdatedReferences.push(section);
        }
      }
    }

    // Calculate compliance score (0-100)
    const score = Math.round((compliantSections / configSections.length) * 100);

    return {
      score,
      configurationAlignment: {
        sectionsTracked: configSections.length,
        sectionsCompliant: compliantSections,
        missingDocumentation,
        outdatedReferences
      }
    };
  }

  /**
   * Determine overall compliance status
   */
  private determineOverallCompliance(
    status: { status: string; issues: string[] },
    attentionItems: { expiringSoon: unknown[]; underReview: unknown[] }
  ): 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' {
    if (status.status === 'CRITICAL' || status.issues.length > 5) {
      return 'NON_COMPLIANT';
    }
    
    if (status.status === 'WARNING' || status.status === 'OVERDUE' || 
        attentionItems.expiringSoon.length > 0 || 
        attentionItems.underReview.length > 2) {
      return 'WARNING';
    }
    
    return 'COMPLIANT';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(attentionItems: {
    expiringSoon: unknown[];
    underReview: unknown[];
    missingChecksums: unknown[];
  }): string[] {
    const recommendations: string[] = [];

    if (attentionItems.expiringSoon.length > 0) {
      recommendations.push(`Update ${attentionItems.expiringSoon.length} documents expiring soon`);
    }

    if (attentionItems.underReview.length > 0) {
      recommendations.push(`Complete review of ${attentionItems.underReview.length} pending documents`);
    }

    if (attentionItems.missingChecksums.length > 0) {
      recommendations.push(`Add checksums for ${attentionItems.missingChecksums.length} documents`);
    }

    // Generic recommendations
    recommendations.push('Schedule quarterly compliance review');
    recommendations.push('Update environment variables if law changes are pending');
    recommendations.push('Run full system validation after any document updates');

    return recommendations;
  }

  /**
   * Get recent document changes (last 30 days)
   */
  private getRecentDocumentChanges(): Array<{
    documentId: string;
    version: string;
    date: string;
    changes: string;
  }> {
    try {
      const registry = legalDocumentTracker.loadRegistry();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentChanges: Array<{
        documentId: string;
        version: string;
        date: string;
        changes: string;
      }> = [];

      registry.documentRegistry.documents.forEach(doc => {
        doc.versionHistory.forEach(version => {
          const versionDate = new Date(version.date);
          if (versionDate >= thirtyDaysAgo) {
            recentChanges.push({
              documentId: doc.documentId,
              version: version.version,
              date: version.date,
              changes: version.changes
            });
          }
        });
      });

      // Sort by date (newest first)
      return recentChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.warn('Could not load recent changes:', error);
      return [];
    }
  }

  /**
   * Get upcoming review dates
   */
  private getUpcomingReviews(): Array<{
    documentId: string;
    reviewDate: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    try {
      const registry = legalDocumentTracker.loadRegistry();
      const upcomingReviews: any[] = [];
      const now = new Date();
      const sixMonthsFromNow = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);

      registry.documentRegistry.documents.forEach(doc => {
        if (doc.expiryDate) {
          const expiryDate = new Date(doc.expiryDate);
          if (expiryDate > now && expiryDate <= sixMonthsFromNow) {
            // Determine priority based on time to expiry
            const daysToExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
            let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
            
            if (daysToExpiry <= 30) priority = 'CRITICAL';
            else if (daysToExpiry <= 60) priority = 'HIGH';
            else if (daysToExpiry <= 90) priority = 'MEDIUM';

            upcomingReviews.push({
              documentId: doc.documentId,
              reviewDate: doc.expiryDate,
              priority
            });
          }
        }
      });

      // Sort by priority and date
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return upcomingReviews.sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime();
      });
    } catch (error) {
      console.warn('Could not load upcoming reviews:', error);
      return [];
    }
  }

  /**
   * Generate report in different formats
   */
  async generateReports(outputDir: string = 'reports'): Promise<void> {
    const report = await this.generateReport();
    const timestamp = new Date().toISOString().split('T')[0];
    
    // JSON Report
    const jsonPath = resolve(outputDir, `compliance-report-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved: ${jsonPath}`);

    // Markdown Report
    const mdPath = resolve(outputDir, `compliance-report-${timestamp}.md`);
    const markdownReport = this.generateMarkdownReport(report);
    writeFileSync(mdPath, markdownReport);
    console.log(`📝 Markdown report saved: ${mdPath}`);

    // Console Summary
    this.printConsoleSummary(report);
  }

  /**
   * Generate human-readable markdown report
   */
  private generateMarkdownReport(report: ComplianceReport): string {
    return `# Legal Compliance Report

**Generated:** ${new Date(report.generatedAt).toLocaleString()}  
**Configuration Version:** ${report.configVersion}  
**Report Version:** ${report.reportVersion}

## Executive Summary

**Overall Compliance Status:** ${report.complianceStatus.overall}  
**Compliance Score:** ${report.complianceStatus.score}/100

### Key Metrics
- **Total Documents:** ${report.documents.total}
- **Active Documents:** ${report.documents.active}
- **Documents Under Review:** ${report.documents.underReview}
- **Documents Expiring Soon:** ${report.documents.expiringSoon}

## Compliance Issues

${report.complianceStatus.issues.length > 0 ? 
  report.complianceStatus.issues.map(issue => `- ⚠️ ${issue}`).join('\n') : 
  '_No compliance issues detected._'
}

## Recommendations

${report.complianceStatus.recommendations.map(rec => `- 💡 ${rec}`).join('\n')}

## Document Analysis

### Documents by Category
${Object.entries(report.documents.byCategory)
  .map(([category, count]) => `- **${category}:** ${count}`)
  .join('\n')}

### Documents by Type
${Object.entries(report.documents.byType)
  .map(([type, count]) => `- **${type}:** ${count}`)
  .join('\n')}

## Configuration Alignment

**Tracked Sections:** ${report.configurationAlignment.sectionsTracked}  
**Compliant Sections:** ${report.configurationAlignment.sectionsCompliant}

${report.configurationAlignment.missingDocumentation.length > 0 ? `
### Missing Documentation
${report.configurationAlignment.missingDocumentation.map(section => `- ❌ ${section}`).join('\n')}
` : ''}

${report.configurationAlignment.outdatedReferences.length > 0 ? `
### Outdated References
${report.configurationAlignment.outdatedReferences.map(section => `- ⏰ ${section}`).join('\n')}
` : ''}

## Recent Changes (Last 30 Days)

${report.auditTrail.recentChanges.length > 0 ? 
  report.auditTrail.recentChanges
    .slice(0, 10) // Show last 10 changes
    .map(change => `- **${change.documentId}** v${change.version} (${change.date}): ${change.changes}`)
    .join('\n') :
  '_No recent changes._'
}

## Upcoming Reviews

${report.auditTrail.upcomingReviews.length > 0 ?
  report.auditTrail.upcomingReviews
    .map(review => `- **${review.documentId}** - ${review.reviewDate} (${review.priority} priority)`)
    .join('\n') :
  '_No upcoming reviews scheduled._'
}

---
*Report generated automatically by PayrollSync Legal Document Tracker*
`;
  }

  /**
   * Print console summary
   */
  private printConsoleSummary(report: ComplianceReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 LEGAL COMPLIANCE REPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status: ${this.getStatusEmoji(report.complianceStatus.overall)} ${report.complianceStatus.overall}`);
    console.log(`Score: ${report.complianceStatus.score}/100`);
    console.log(`Documents: ${report.documents.active}/${report.documents.total} active`);
    
    if (report.complianceStatus.issues.length > 0) {
      console.log('\n🚨 Issues:');
      report.complianceStatus.issues.slice(0, 5).forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }
    
    if (report.complianceStatus.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      report.complianceStatus.recommendations.slice(0, 3).forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
    
    console.log('\n📈 Next Steps:');
    console.log('  1. Review and address any compliance issues');
    console.log('  2. Update expiring documents');
    console.log('  3. Complete pending document reviews');
    console.log('  4. Schedule next compliance audit');
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'COMPLIANT': return '✅';
      case 'WARNING': return '⚠️';
      case 'NON_COMPLIANT': return '❌';
      default: return '❓';
    }
  }
}

// Main execution
async function main() {
  try {
    const generator = new ComplianceReportGenerator();
    await generator.generateReports();
    console.log('\n✅ Compliance report generation completed successfully!');
  } catch (error) {
    console.error('\n❌ Failed to generate compliance report:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}