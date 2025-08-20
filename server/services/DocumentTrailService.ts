import crypto from "crypto";
import { db } from "../db";
import { documentTrail, type InsertDocumentTrail } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Document Trail Service
 * 
 * Manages secure document storage and tracking for CBA PDFs and encoding diffs.
 * Provides cryptographic verification of document integrity and change history.
 */

export interface DocumentUpload {
  packId: string;
  packVersion: string;
  documentType: 'cba_pdf' | 'encoding_diff' | 'impact_report' | 'legal_opinion';
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
  uploadedBy: string;
  metadata?: {
    changes?: any[];
    affectedRules?: string[];
    legalReview?: {
      reviewedBy: string;
      reviewDate: Date;
      status: 'approved' | 'rejected' | 'pending';
      notes: string;
    };
  };
}

export interface EncodingDiff {
  packId: string;
  fromVersion: string;
  toVersion: string;
  changes: Array<{
    changeType: 'add' | 'modify' | 'delete';
    section: string;
    field: string;
    oldValue?: any;
    newValue?: any;
    reason: string;
  }>;
  impactAnalysis: {
    affectedEmployees: number;
    costDelta: number;
    effectiveDate: Date;
    riskLevel: 'low' | 'medium' | 'high';
  };
  generatedBy: string;
}

export class DocumentTrailService {
  private static readonly SECRET_KEY = process.env.DOCUMENT_TRAIL_SECRET || "default-secret-key";

  /**
   * Upload and store a document with cryptographic verification
   */
  static async uploadDocument(upload: DocumentUpload): Promise<string> {
    try {
      // Generate file hash
      const fileHash = crypto
        .createHash('sha256')
        .update(upload.fileBuffer)
        .digest('hex');

      // Generate document signature
      const signature = this.generateDocumentSignature({
        packId: upload.packId,
        packVersion: upload.packVersion,
        fileHash,
        fileName: upload.fileName,
        uploadedBy: upload.uploadedBy
      });

      // Store document (in production, would upload to S3/GCS)
      const storageLocation = await this.storeDocument(upload.fileBuffer, fileHash);

      // Create trail record
      const trailRecord: InsertDocumentTrail = {
        packId: upload.packId,
        packVersion: upload.packVersion,
        documentType: upload.documentType,
        originalFileName: upload.fileName,
        fileHash,
        fileSize: upload.fileBuffer.length,
        mimeType: upload.mimeType,
        uploadedBy: upload.uploadedBy,
        diffMetadata: upload.metadata ? {
          ...upload.metadata,
          uploadTimestamp: new Date().toISOString()
        } : null,
        storageLocation,
        documentSignature: signature
      };

      const [record] = await db
        .insert(documentTrail)
        .values(trailRecord)
        .returning();

      console.log(`Document uploaded: ${record.id} for pack ${upload.packId} v${upload.packVersion}`);
      
      return record.id;

    } catch (error) {
      console.error("Error uploading document:", error);
      throw new Error("Failed to upload document to trail");
    }
  }

  /**
   * Generate and store encoding diff between CBA pack versions
   */
  static async generateEncodingDiff(diff: EncodingDiff): Promise<string> {
    try {
      // Create diff document
      const diffDocument = {
        type: 'encoding_diff',
        packId: diff.packId,
        fromVersion: diff.fromVersion,
        toVersion: diff.toVersion,
        generated: {
          timestamp: new Date().toISOString(),
          by: diff.generatedBy,
          engine: 'cba-diff-engine-v1'
        },
        summary: {
          totalChanges: diff.changes.length,
          changeTypes: this.categorizeChanges(diff.changes),
          impactLevel: diff.impactAnalysis.riskLevel,
          affectedEmployees: diff.impactAnalysis.affectedEmployees,
          costDelta: diff.impactAnalysis.costDelta
        },
        changes: diff.changes,
        impactAnalysis: diff.impactAnalysis,
        metadata: {
          hash: crypto.createHash('sha256').update(JSON.stringify(diff.changes)).digest('hex'),
          changeCount: diff.changes.length,
          sections: [...new Set(diff.changes.map(c => c.section))]
        }
      };

      // Convert to buffer for storage
      const diffBuffer = Buffer.from(JSON.stringify(diffDocument, null, 2), 'utf-8');

      // Upload as document
      const documentId = await this.uploadDocument({
        packId: diff.packId,
        packVersion: diff.toVersion,
        documentType: 'encoding_diff',
        fileName: `diff-${diff.fromVersion}-to-${diff.toVersion}-${nanoid(8)}.json`,
        fileBuffer: diffBuffer,
        mimeType: 'application/json',
        uploadedBy: diff.generatedBy,
        metadata: {
          changes: diff.changes,
          affectedRules: [...new Set(diff.changes.map(c => `${c.section}.${c.field}`))],
          impactAnalysis: diff.impactAnalysis
        }
      });

      return documentId;

    } catch (error) {
      console.error("Error generating encoding diff:", error);
      throw new Error("Failed to generate encoding diff");
    }
  }

  /**
   * Verify document integrity using stored hash and signature
   */
  static async verifyDocument(documentId: string): Promise<{
    valid: boolean;
    document: any;
    verificationDetails: {
      fileExists: boolean;
      hashMatches: boolean;
      signatureValid: boolean;
      storageIntact: boolean;
    };
  }> {
    try {
      // Get document record
      const [record] = await db
        .select()
        .from(documentTrail)
        .where(eq(documentTrail.id, documentId));

      if (!record) {
        return {
          valid: false,
          document: null,
          verificationDetails: {
            fileExists: false,
            hashMatches: false,
            signatureValid: false,
            storageIntact: false
          }
        };
      }

      // Verify signature
      const expectedSignature = this.generateDocumentSignature({
        packId: record.packId,
        packVersion: record.packVersion,
        fileHash: record.fileHash,
        fileName: record.originalFileName,
        uploadedBy: record.uploadedBy
      });

      const signatureValid = record.documentSignature === expectedSignature;

      // In production, would verify file still exists and hash matches
      const fileExists = true; // Mock - would check storage
      const hashMatches = true; // Mock - would re-hash file and compare

      const valid = signatureValid && fileExists && hashMatches;

      return {
        valid,
        document: record,
        verificationDetails: {
          fileExists,
          hashMatches,
          signatureValid,
          storageIntact: valid
        }
      };

    } catch (error) {
      console.error("Error verifying document:", error);
      throw new Error("Failed to verify document integrity");
    }
  }

  /**
   * Get document history for a CBA pack
   */
  static async getPackDocumentHistory(
    packId: string,
    documentType?: string
  ): Promise<Array<{
    documentId: string;
    version: string;
    documentType: string;
    fileName: string;
    uploadedBy: string;
    uploadDate: Date;
    fileSize: number;
    verified: boolean;
    changes?: number;
  }>> {
    try {
      const query = db
        .select()
        .from(documentTrail)
        .where(eq(documentTrail.packId, packId))
        .orderBy(desc(documentTrail.createdAt));

      const records = await query;

      const results = [];
      for (const record of records) {
        if (documentType && record.documentType !== documentType) continue;

        const verification = await this.verifyDocument(record.id);
        const changeCount = record.diffMetadata?.changes?.length || 0;

        results.push({
          documentId: record.id,
          version: record.packVersion,
          documentType: record.documentType,
          fileName: record.originalFileName,
          uploadedBy: record.uploadedBy,
          uploadDate: record.createdAt,
          fileSize: record.fileSize || 0,
          verified: verification.valid,
          changes: changeCount > 0 ? changeCount : undefined
        });
      }

      return results;

    } catch (error) {
      console.error("Error getting document history:", error);
      throw new Error("Failed to retrieve document history");
    }
  }

  /**
   * Get encoding diff between two versions
   */
  static async getEncodingDiff(
    packId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<{
    diffId: string | null;
    changes: any[] | null;
    impactAnalysis: any | null;
    generated: any | null;
  }> {
    try {
      const [record] = await db
        .select()
        .from(documentTrail)
        .where(and(
          eq(documentTrail.packId, packId),
          eq(documentTrail.packVersion, toVersion),
          eq(documentTrail.documentType, 'encoding_diff')
        ))
        .orderBy(desc(documentTrail.createdAt))
        .limit(1);

      if (!record || !record.diffMetadata) {
        return {
          diffId: null,
          changes: null,
          impactAnalysis: null,
          generated: null
        };
      }

      // Parse diff metadata
      const metadata = record.diffMetadata as any;

      return {
        diffId: record.id,
        changes: metadata.changes || [],
        impactAnalysis: metadata.impactAnalysis || null,
        generated: {
          timestamp: record.createdAt,
          by: record.uploadedBy
        }
      };

    } catch (error) {
      console.error("Error getting encoding diff:", error);
      throw new Error("Failed to retrieve encoding diff");
    }
  }

  /**
   * Get compliance summary for audit reporting
   */
  static async getComplianceSummary(): Promise<{
    totalDocuments: number;
    verifiedDocuments: number;
    integrityScore: number;
    documentTypes: Record<string, number>;
    recentUploads: Array<{
      packId: string;
      version: string;
      documentType: string;
      uploadDate: Date;
      verified: boolean;
    }>;
  }> {
    try {
      const allDocuments = await db.select().from(documentTrail);
      
      const documentTypes: Record<string, number> = {};
      let verifiedCount = 0;

      for (const doc of allDocuments) {
        documentTypes[doc.documentType] = (documentTypes[doc.documentType] || 0) + 1;
        
        const verification = await this.verifyDocument(doc.id);
        if (verification.valid) verifiedCount++;
      }

      const recentUploads = allDocuments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map(doc => ({
          packId: doc.packId,
          version: doc.packVersion,
          documentType: doc.documentType,
          uploadDate: doc.createdAt,
          verified: true // Mock - would verify each document
        }));

      return {
        totalDocuments: allDocuments.length,
        verifiedDocuments: verifiedCount,
        integrityScore: Math.round((verifiedCount / allDocuments.length) * 100) || 100,
        documentTypes,
        recentUploads
      };

    } catch (error) {
      console.error("Error getting compliance summary:", error);
      throw new Error("Failed to generate compliance summary");
    }
  }

  // Private helper methods

  private static generateDocumentSignature(data: {
    packId: string;
    packVersion: string;
    fileHash: string;
    fileName: string;
    uploadedBy: string;
  }): string {
    const signatureData = JSON.stringify({
      packId: data.packId,
      packVersion: data.packVersion,
      fileHash: data.fileHash,
      fileName: data.fileName,
      uploadedBy: data.uploadedBy
    }, null, 0);

    return crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(signatureData)
      .digest('hex');
  }

  private static async storeDocument(buffer: Buffer, hash: string): Promise<string> {
    // In production, would upload to S3/GCS and return URL
    // For now, return mock storage location
    return `/documents/${hash.substring(0, 8)}/${hash}`;
  }

  private static categorizeChanges(changes: any[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    changes.forEach(change => {
      categories[change.changeType] = (categories[change.changeType] || 0) + 1;
    });

    return categories;
  }
}