#!/usr/bin/env tsx

/**
 * Legal Document Validation Script
 * 
 * This script validates the legal document registry and ensures all referenced
 * documents exist, have valid checksums, and maintain compliance standards.
 */

import { readFileSync, existsSync, createHash } from 'fs';
import { resolve } from 'path';
import { legalDocumentTracker, type LegalDocument, type DocumentRegistry } from '../lib/payroll/config/legal-document-tracker.js';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalDocuments: number;
    validDocuments: number;
    missingFiles: number;
    invalidChecksums: number;
    expiredDocuments: number;
  };
}

class LegalDocumentValidator {
  private baseDir = process.cwd();
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Run comprehensive validation of legal documents
   */
  async validateAll(): Promise<ValidationResult> {
    this.errors = [];
    this.warnings = [];

    console.log('🔍 Starting legal document validation...\n');

    try {
      // Load document registry
      const registry = legalDocumentTracker.loadRegistry();
      console.log(`📚 Found ${registry.documentRegistry.documents.length} documents in registry`);

      let validDocuments = 0;
      let missingFiles = 0;
      let invalidChecksums = 0;
      let expiredDocuments = 0;

      // Validate each document
      for (const doc of registry.documentRegistry.documents) {
        console.log(`\n📄 Validating: ${doc.title}`);
        
        const result = await this.validateDocument(doc);
        if (result.isValid) {
          validDocuments++;
          console.log('  ✅ Valid');
        } else {
          console.log('  ❌ Invalid');
          if (result.errors.includes('FILE_NOT_FOUND')) missingFiles++;
          if (result.errors.includes('CHECKSUM_MISMATCH')) invalidChecksums++;
          if (result.errors.includes('DOCUMENT_EXPIRED')) expiredDocuments++;
        }
      }

      // Validate registry metadata
      await this.validateRegistryMetadata(registry);

      // Check compliance status
      const complianceStatus = legalDocumentTracker.checkComplianceStatus();
      console.log('\n🛡️  Compliance Status:');
      console.log(`  Status: ${complianceStatus.status}`);
      if (complianceStatus.issues.length > 0) {
        console.log('  Issues:');
        complianceStatus.issues.forEach(issue => console.log(`    - ${issue}`));
        this.warnings.push(...complianceStatus.issues);
      }

      // Generate summary
      const summary = {
        totalDocuments: registry.documentRegistry.documents.length,
        validDocuments,
        missingFiles,
        invalidChecksums,
        expiredDocuments
      };

      const isValid = this.errors.length === 0;

      console.log('\n📊 Validation Summary:');
      console.log(`  Total Documents: ${summary.totalDocuments}`);
      console.log(`  Valid Documents: ${summary.validDocuments}`);
      console.log(`  Missing Files: ${summary.missingFiles}`);
      console.log(`  Invalid Checksums: ${summary.invalidChecksums}`);
      console.log(`  Expired Documents: ${summary.expiredDocuments}`);
      console.log(`  Errors: ${this.errors.length}`);
      console.log(`  Warnings: ${this.warnings.length}`);

      return {
        isValid,
        errors: this.errors,
        warnings: this.warnings,
        summary
      };

    } catch (error) {
      this.errors.push(`Registry validation failed: ${error}`);
      return {
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
        summary: {
          totalDocuments: 0,
          validDocuments: 0,
          missingFiles: 0,
          invalidChecksums: 0,
          expiredDocuments: 0
        }
      };
    }
  }

  /**
   * Validate individual document
   */
  private async validateDocument(doc: LegalDocument): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check required fields
    const requiredFields = ['documentId', 'title', 'type', 'category', 'status', 'currentVersion', 'effectiveDate'];
    for (const field of requiredFields) {
      if (!doc[field]) {
        errors.push(`MISSING_FIELD: ${field}`);
      }
    }

    // Check if file exists
    const filePath = resolve(this.baseDir, 'legal-docs', doc.localPath || '');
    if (!existsSync(filePath)) {
      errors.push('FILE_NOT_FOUND');
      this.errors.push(`File not found: ${doc.localPath} for document ${doc.documentId}`);
    } else {
      // Validate checksum if file exists
      if (doc.checksumSHA256) {
        const actualChecksum = await this.calculateFileChecksum(filePath);
        if (actualChecksum !== doc.checksumSHA256) {
          errors.push('CHECKSUM_MISMATCH');
          this.errors.push(`Checksum mismatch for ${doc.documentId}: expected ${doc.checksumSHA256}, got ${actualChecksum}`);
        }
      } else {
        this.warnings.push(`Missing checksum for document ${doc.documentId}`);
      }
    }

    // Check if document is expired
    if (doc.expiryDate) {
      const expiryDate = new Date(doc.expiryDate);
      const now = new Date();
      if (expiryDate <= now && doc.status === 'ACTIVE') {
        errors.push('DOCUMENT_EXPIRED');
        this.errors.push(`Document ${doc.documentId} has expired but is still marked as ACTIVE`);
      }
    }

    // Validate version format
    if (doc.currentVersion && !/^\d+\.\d+(\.\d+)?$/.test(doc.currentVersion)) {
      errors.push('INVALID_VERSION_FORMAT');
      this.errors.push(`Invalid version format for ${doc.documentId}: ${doc.currentVersion}`);
    }

    // Validate URL format
    if (doc.officialUrl && !this.isValidUrl(doc.officialUrl)) {
      errors.push('INVALID_URL');
      this.warnings.push(`Invalid URL for ${doc.documentId}: ${doc.officialUrl}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate registry metadata
   */
  private async validateRegistryMetadata(registry: DocumentRegistry): Promise<void> {
    const metadata = registry.metadata;
    
    // Check document counts
    const actualTotal = registry.documentRegistry.documents.length;
    const actualActive = registry.documentRegistry.documents.filter((doc: LegalDocument) => doc.status === 'ACTIVE').length;
    const actualArchived = registry.documentRegistry.documents.filter((doc: LegalDocument) => doc.status === 'ARCHIVED').length;

    if (metadata.totalDocuments !== actualTotal) {
      this.warnings.push(`Metadata total count mismatch: reported ${metadata.totalDocuments}, actual ${actualTotal}`);
    }

    if (metadata.activeDocuments !== actualActive) {
      this.warnings.push(`Metadata active count mismatch: reported ${metadata.activeDocuments}, actual ${actualActive}`);
    }

    if (metadata.archivedDocuments !== actualArchived) {
      this.warnings.push(`Metadata archived count mismatch: reported ${metadata.archivedDocuments}, actual ${actualArchived}`);
    }

    // Check compliance status
    const validStatuses = ['CURRENT', 'WARNING', 'OVERDUE', 'CRITICAL'];
    if (!validStatuses.includes(metadata.complianceStatus)) {
      this.errors.push(`Invalid compliance status: ${metadata.complianceStatus}`);
    }
  }

  /**
   * Calculate SHA-256 checksum of file
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    try {
      const fileBuffer = readFileSync(filePath);
      const hash = createHash('sha256');
      hash.update(fileBuffer);
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate checksum for ${filePath}: ${error}`);
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Main execution
async function main() {
  const validator = new LegalDocumentValidator();
  const result = await validator.validateAll();

  console.log('\n' + '='.repeat(60));
  
  if (result.isValid) {
    console.log('🎉 All legal documents are valid!');
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    process.exit(0);
  } else {
    console.log('❌ Legal document validation failed!');
    
    console.log('\n🚫 Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
    
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log('\n💡 Recommendations:');
    console.log('  1. Ensure all referenced files exist in the legal-docs directory');
    console.log('  2. Update checksums for any modified documents');
    console.log('  3. Update document status for expired documents');
    console.log('  4. Fix any invalid URLs or version formats');
    
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}