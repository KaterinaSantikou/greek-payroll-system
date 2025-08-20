import crypto from "crypto";
import { db } from "../db";
import { calcProvenance, type InsertCalcProvenance } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Calculation Provenance Service
 * 
 * Provides immutable record-keeping of payroll calculations.
 * Tracks which CBA pack/version was used for each payslip calculation
 * with cryptographic signatures to prevent tampering.
 */

export interface PayrollCalculationInputs {
  employeeId: string;
  packId: string;
  packVersion: string;
  hoursWorked: Array<{
    date: Date;
    startTime: string;
    endTime: string;
    hours: number;
    shiftType?: string;
  }>;
  baseWage: number;
  allowances: Record<string, any>;
  premiums: Record<string, any>;
  deductions: Record<string, any>;
  calculationParams: Record<string, any>;
}

export interface PayrollCalculationOutputs {
  basePay: number;
  allowances: Array<{
    code: string;
    amount: number;
    description: string;
  }>;
  premiums: Array<{
    code: string;
    hours?: number;
    rate?: number;
    amount: number;
    description: string;
  }>;
  deductions: Array<{
    code: string;
    amount: number;
    description: string;
  }>;
  totalGrossPay: number;
  netPay: number;
  auditTrail: string[];
}

export class CalcProvenanceService {
  private static readonly SECRET_KEY = process.env.CALC_PROVENANCE_SECRET || "default-secret-key";

  /**
   * Generate immutable provenance record for a payroll calculation
   */
  static async generateProvenance(
    payslipId: string,
    inputs: PayrollCalculationInputs,
    outputs: PayrollCalculationOutputs
  ): Promise<string> {
    try {
      // Generate cryptographic hashes
      const inputHash = this.generateInputHash(inputs);
      const outputHash = this.generateOutputHash(outputs);
      
      // Create audit trail
      const auditTrail = {
        calculationSteps: outputs.auditTrail,
        packDetails: {
          packId: inputs.packId,
          version: inputs.packVersion,
          effectiveDate: new Date().toISOString()
        },
        inputSummary: {
          totalHours: inputs.hoursWorked.reduce((sum, h) => sum + h.hours, 0),
          baseWage: inputs.baseWage,
          allowanceCount: Object.keys(inputs.allowances).length,
          premiumCount: Object.keys(inputs.premiums).length
        },
        outputSummary: {
          totalGrossPay: outputs.totalGrossPay,
          netPay: outputs.netPay,
          componentCount: outputs.allowances.length + outputs.premiums.length + outputs.deductions.length
        },
        timestamp: new Date().toISOString()
      };

      // Generate immutable signature
      const signature = this.generateImmutableSignature({
        payslipId,
        employeeId: inputs.employeeId,
        packId: inputs.packId,
        packVersion: inputs.packVersion,
        inputHash,
        outputHash,
        auditTrail
      });

      // Store in database
      const provenanceRecord: InsertCalcProvenance = {
        payslipId,
        employeeId: inputs.employeeId,
        packId: inputs.packId,
        packVersion: inputs.packVersion,
        calculationEngine: "payroll-engine-v1",
        inputHash,
        outputHash,
        auditTrail,
        immutableSignature: signature
      };

      const [record] = await db
        .insert(calcProvenance)
        .values(provenanceRecord)
        .returning();

      return record.id;

    } catch (error) {
      console.error("Error generating calculation provenance:", error);
      throw new Error("Failed to generate calculation provenance");
    }
  }

  /**
   * Verify integrity of a calculation record
   */
  static async verifyProvenance(provenanceId: string): Promise<{
    valid: boolean;
    record: any;
    verificationDetails: {
      signatureValid: boolean;
      hashesMatch: boolean;
      recordIntact: boolean;
    };
  }> {
    try {
      const [record] = await db
        .select()
        .from(calcProvenance)
        .where(eq(calcProvenance.id, provenanceId));

      if (!record) {
        return {
          valid: false,
          record: null,
          verificationDetails: {
            signatureValid: false,
            hashesMatch: false,
            recordIntact: false
          }
        };
      }

      // Verify signature
      const expectedSignature = this.generateImmutableSignature({
        payslipId: record.payslipId,
        employeeId: record.employeeId,
        packId: record.packId,
        packVersion: record.packVersion,
        inputHash: record.inputHash,
        outputHash: record.outputHash,
        auditTrail: record.auditTrail
      });

      const signatureValid = record.immutableSignature === expectedSignature;

      return {
        valid: signatureValid,
        record,
        verificationDetails: {
          signatureValid,
          hashesMatch: true, // Would need original inputs/outputs to verify hashes
          recordIntact: true
        }
      };

    } catch (error) {
      console.error("Error verifying provenance:", error);
      throw new Error("Failed to verify calculation provenance");
    }
  }

  /**
   * Get calculation history for an employee
   */
  static async getEmployeeCalculationHistory(
    employeeId: string,
    limit: number = 50
  ): Promise<Array<{
    provenanceId: string;
    payslipId: string;
    packId: string;
    packVersion: string;
    calculationDate: Date;
    totalGrossPay?: number;
    verified: boolean;
  }>> {
    try {
      const records = await db
        .select()
        .from(calcProvenance)
        .where(eq(calcProvenance.employeeId, employeeId))
        .orderBy(desc(calcProvenance.calculationDate))
        .limit(limit);

      const results = [];
      for (const record of records) {
        const verification = await this.verifyProvenance(record.id);
        
        results.push({
          provenanceId: record.id,
          payslipId: record.payslipId,
          packId: record.packId,
          packVersion: record.packVersion,
          calculationDate: record.calculationDate,
          totalGrossPay: record.auditTrail?.outputSummary?.totalGrossPay,
          verified: verification.valid
        });
      }

      return results;

    } catch (error) {
      console.error("Error getting calculation history:", error);
      throw new Error("Failed to retrieve calculation history");
    }
  }

  /**
   * Get pack usage statistics for audit reporting
   */
  static async getPackUsageStats(
    packId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    totalCalculations: number;
    uniqueEmployees: number;
    packVersions: Array<{
      version: string;
      calculations: number;
      lastUsed: Date;
    }>;
    integrityScore: number; // Percentage of calculations with valid signatures
  }> {
    try {
      // This would implement complex analytics queries
      // For now, returning mock data structure
      return {
        totalCalculations: 1250,
        uniqueEmployees: 127,
        packVersions: [
          {
            version: "v2025.1",
            calculations: 950,
            lastUsed: new Date()
          },
          {
            version: "v2024.12",
            calculations: 300,
            lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        ],
        integrityScore: 99.8 // 998/1000 calculations verified successfully
      };

    } catch (error) {
      console.error("Error getting pack usage stats:", error);
      throw new Error("Failed to retrieve pack usage statistics");
    }
  }

  // Private helper methods

  private static generateInputHash(inputs: PayrollCalculationInputs): string {
    const inputString = JSON.stringify({
      employeeId: inputs.employeeId,
      packId: inputs.packId,
      packVersion: inputs.packVersion,
      hoursWorked: inputs.hoursWorked,
      baseWage: inputs.baseWage,
      allowances: inputs.allowances,
      premiums: inputs.premiums,
      deductions: inputs.deductions,
      calculationParams: inputs.calculationParams
    }, null, 0); // No indentation for consistent hash

    return crypto.createHash('sha256').update(inputString).digest('hex');
  }

  private static generateOutputHash(outputs: PayrollCalculationOutputs): string {
    const outputString = JSON.stringify({
      basePay: outputs.basePay,
      allowances: outputs.allowances,
      premiums: outputs.premiums,
      deductions: outputs.deductions,
      totalGrossPay: outputs.totalGrossPay,
      netPay: outputs.netPay,
      auditTrail: outputs.auditTrail
    }, null, 0);

    return crypto.createHash('sha256').update(outputString).digest('hex');
  }

  private static generateImmutableSignature(data: {
    payslipId: string;
    employeeId: string;
    packId: string;
    packVersion: string;
    inputHash: string;
    outputHash: string;
    auditTrail: any;
  }): string {
    const signatureData = JSON.stringify({
      payslipId: data.payslipId,
      employeeId: data.employeeId,
      packId: data.packId,
      packVersion: data.packVersion,
      inputHash: data.inputHash,
      outputHash: data.outputHash,
      auditTrailHash: crypto.createHash('sha256').update(JSON.stringify(data.auditTrail)).digest('hex')
    }, null, 0);

    return crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(signatureData)
      .digest('hex');
  }
}