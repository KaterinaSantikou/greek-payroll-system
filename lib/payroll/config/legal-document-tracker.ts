/**
 * Legal Document Version Tracking System
 *
 * This module provides integration between the configuration system and
 * legal document version control for compliance traceability and audit trails.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface LegalDocument {
  documentId: string;
  title: string;
  type:
    | 'PRIMARY_LEGISLATION'
    | 'REGULATORY_DECREE'
    | 'MINISTERIAL_DECISION'
    | 'REGULATORY_FRAMEWORK'
    | 'COLLECTIVE_AGREEMENT'
    | 'COURT_DECISION';
  category:
    | 'LABOR_LAW'
    | 'SOCIAL_SECURITY'
    | 'WAGES'
    | 'TAX_LAW'
    | 'DIGITAL_COMPLIANCE'
    | 'SECTOR_SPECIFIC';
  status: 'DRAFT' | 'REVIEW' | 'ACTIVE' | 'ARCHIVED' | 'SUPERSEDED';
  currentVersion: string;
  effectiveDate: string;
  expiryDate?: string | null;
  legalAuthority: string;
  officialUrl: string;
  localPath: string;
  checksumSHA256: string;
  impactedConfigSections: string[];
  relatedDocuments: string[];
  complianceRequirements: string[];
  versionHistory: VersionEntry[];
}

export interface VersionEntry {
  version: string;
  date: string;
  changes: string;
  approvedBy: string;
  status: string;
}

export interface DocumentRegistry {
  documentRegistry: {
    lastUpdated: string;
    version: string;
    documents: LegalDocument[];
  };
  metadata: {
    totalDocuments: number;
    activeDocuments: number;
    archivedDocuments: number;
    lastComplianceReview: string;
    nextScheduledReview: string;
    complianceStatus: 'CURRENT' | 'WARNING' | 'OVERDUE' | 'CRITICAL';
  };
}

export interface LegalReference {
  documentId: string;
  version: string;
  section?: string;
  effectiveDate: string;
  configSection: string;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// =============================================================================
// LEGAL DOCUMENT TRACKER CLASS
// =============================================================================

class LegalDocumentTracker {
  private static instance: LegalDocumentTracker;
  private registry: DocumentRegistry | null = null;
  private registryPath = resolve(
    process.cwd(),
    'legal-docs/version-control/legal-document-registry.json'
  );

  private constructor() {}

  static getInstance(): LegalDocumentTracker {
    if (!LegalDocumentTracker.instance) {
      LegalDocumentTracker.instance = new LegalDocumentTracker();
    }
    return LegalDocumentTracker.instance;
  }

  /**
   * Load legal document registry from file
   */
  loadRegistry(): DocumentRegistry {
    if (this.registry) {
      return this.registry;
    }

    try {
      if (!existsSync(this.registryPath)) {
        throw new Error(
          `Legal document registry not found at: ${this.registryPath}`
        );
      }

      const registryContent = readFileSync(this.registryPath, 'utf-8');
      this.registry = JSON.parse(registryContent);

      // Validate registry structure
      this.validateRegistry(this.registry!);

      return this.registry!;
    } catch (error) {
      console.error('Failed to load legal document registry:', error);
      throw new Error(
        'Legal document registry is required for compliance operations'
      );
    }
  }

  /**
   * Get active documents for a specific compliance requirement
   */
  getDocumentsForCompliance(requirement: string): LegalDocument[] {
    const registry = this.loadRegistry();
    return registry.documentRegistry.documents.filter(
      doc =>
        doc.status === 'ACTIVE' &&
        doc.complianceRequirements.includes(requirement)
    );
  }

  /**
   * Get documents that impact a specific configuration section
   */
  getDocumentsForConfigSection(configSection: string): LegalDocument[] {
    const registry = this.loadRegistry();
    return registry.documentRegistry.documents.filter(
      doc =>
        doc.status === 'ACTIVE' &&
        doc.impactedConfigSections.some(
          section =>
            section === configSection || section.startsWith(configSection + '.')
        )
    );
  }

  /**
   * Get legal references for payroll configuration
   */
  getLegalReferencesForConfig(configVersion: string): LegalReference[] {
    const registry = this.loadRegistry();
    const references: LegalReference[] = [];

    // Map config sections to legal documents
    const configMappings = [
      {
        section: 'minimumWage',
        requirement: 'MINIMUM_WAGE_COMPLIANCE',
        impact: 'CRITICAL' as const,
      },
      {
        section: 'efkaRates',
        requirement: 'EFKA_REPORTING',
        impact: 'CRITICAL' as const,
      },
      {
        section: 'taxBrackets',
        requirement: 'PAYROLL_CALCULATION',
        impact: 'HIGH' as const,
      },
      {
        section: 'workingTimeLimits',
        requirement: 'ERGANI_SUBMISSION',
        impact: 'HIGH' as const,
      },
      {
        section: 'premiumRates',
        requirement: 'PAYROLL_CALCULATION',
        impact: 'MEDIUM' as const,
      },
    ];

    configMappings.forEach(mapping => {
      const docs = this.getDocumentsForCompliance(mapping.requirement);
      docs.forEach(doc => {
        if (
          doc.impactedConfigSections.some(section =>
            section.startsWith(mapping.section)
          )
        ) {
          references.push({
            documentId: doc.documentId,
            version: doc.currentVersion,
            effectiveDate: doc.effectiveDate,
            configSection: mapping.section,
            impactLevel: mapping.impact,
          });
        }
      });
    });

    return references;
  }

  /**
   * Validate document registry structure
   */
  private validateRegistry(registry: DocumentRegistry): void {
    if (!registry.documentRegistry || !registry.metadata) {
      throw new Error(
        'Invalid registry structure: missing documentRegistry or metadata'
      );
    }

    if (!Array.isArray(registry.documentRegistry.documents)) {
      throw new Error('Invalid registry structure: documents must be an array');
    }

    // Check for required fields in each document
    registry.documentRegistry.documents.forEach((doc, index) => {
      if (!doc.documentId || !doc.title || !doc.currentVersion) {
        throw new Error(
          `Invalid document at index ${index}: missing required fields`
        );
      }
    });
  }

  /**
   * Check compliance status
   */
  checkComplianceStatus(): {
    status: 'CURRENT' | 'WARNING' | 'OVERDUE' | 'CRITICAL';
    issues: string[];
    nextReviewDue: string;
  } {
    const registry = this.loadRegistry();
    const issues: string[] = [];
    const now = new Date();

    // Check for expired documents
    registry.documentRegistry.documents.forEach(doc => {
      if (doc.expiryDate) {
        const expiryDate = new Date(doc.expiryDate);
        if (expiryDate <= now && doc.status === 'ACTIVE') {
          issues.push(
            `Document ${doc.documentId} has expired but is still marked as ACTIVE`
          );
        }
      }
    });

    // Check for overdue compliance reviews
    const nextReviewDate = new Date(registry.metadata.nextScheduledReview);
    if (nextReviewDate <= now) {
      issues.push('Compliance review is overdue');
    }

    // Determine overall status
    let status: 'CURRENT' | 'WARNING' | 'OVERDUE' | 'CRITICAL' = 'CURRENT';
    if (issues.length > 0) {
      status = issues.some(issue => issue.includes('expired'))
        ? 'CRITICAL'
        : 'WARNING';
    }
    if (nextReviewDate <= now) {
      status = 'OVERDUE';
    }

    return {
      status,
      issues,
      nextReviewDue: registry.metadata.nextScheduledReview,
    };
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(): {
    generatedAt: string;
    configVersion: string;
    legalReferences: LegalReference[];
    complianceStatus: ReturnType<typeof this.checkComplianceStatus>;
    documentSummary: {
      total: number;
      active: number;
      byCategory: Record<string, number>;
      byType: Record<string, number>;
    };
  } {
    const registry = this.loadRegistry();
    const complianceStatus = this.checkComplianceStatus();
    const configVersion = process.env.GREEK_LAW_VERSION || '2024.12';
    const legalReferences = this.getLegalReferencesForConfig(configVersion);

    // Calculate document statistics
    const documents = registry.documentRegistry.documents;
    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};

    documents.forEach(doc => {
      byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
      byType[doc.type] = (byType[doc.type] || 0) + 1;
    });

    return {
      generatedAt: new Date().toISOString(),
      configVersion,
      legalReferences,
      complianceStatus,
      documentSummary: {
        total: documents.length,
        active: documents.filter(doc => doc.status === 'ACTIVE').length,
        byCategory,
        byType,
      },
    };
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): LegalDocument | null {
    const registry = this.loadRegistry();
    return (
      registry.documentRegistry.documents.find(
        doc => doc.documentId === documentId
      ) || null
    );
  }

  /**
   * Get documents requiring attention (expiring, under review, etc.)
   */
  getDocumentsRequiringAttention(): {
    expiringSoon: LegalDocument[];
    underReview: LegalDocument[];
    missingChecksums: LegalDocument[];
  } {
    const registry = this.loadRegistry();
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const expiringSoon = registry.documentRegistry.documents.filter(doc => {
      if (!doc.expiryDate || doc.status !== 'ACTIVE') return false;
      const expiryDate = new Date(doc.expiryDate);
      return expiryDate <= thirtyDaysFromNow && expiryDate > now;
    });

    const underReview = registry.documentRegistry.documents.filter(
      doc => doc.status === 'REVIEW' || doc.status === 'DRAFT'
    );

    const missingChecksums = registry.documentRegistry.documents.filter(
      doc => !doc.checksumSHA256 || doc.checksumSHA256.length !== 64
    );

    return {
      expiringSoon,
      underReview,
      missingChecksums,
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.registry = null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const legalDocumentTracker = LegalDocumentTracker.getInstance();

// Helper functions for easy access
export async function getLegalReferencesForPayroll(
  configVersion?: string
): Promise<LegalReference[]> {
  return legalDocumentTracker.getLegalReferencesForConfig(
    configVersion || process.env.GREEK_LAW_VERSION || '2024.12'
  );
}

export async function validateConfigCompliance(configSection: string): Promise<{
  isCompliant: boolean;
  supportingDocuments: LegalDocument[];
  issues: string[];
}> {
  const documents =
    legalDocumentTracker.getDocumentsForConfigSection(configSection);
  const issues: string[] = [];

  // Check if we have supporting documents
  if (documents.length === 0) {
    issues.push(
      `No legal documents found supporting configuration section: ${configSection}`
    );
  }

  // Check if all documents are active and current
  documents.forEach(doc => {
    if (doc.status !== 'ACTIVE') {
      issues.push(
        `Supporting document ${doc.documentId} is not active (status: ${doc.status})`
      );
    }
    if (doc.expiryDate) {
      const expiryDate = new Date(doc.expiryDate);
      if (expiryDate <= new Date()) {
        issues.push(`Supporting document ${doc.documentId} has expired`);
      }
    }
  });

  return {
    isCompliant: issues.length === 0,
    supportingDocuments: documents,
    issues,
  };
}

export async function generateFullComplianceReport() {
  return legalDocumentTracker.generateComplianceReport();
}
