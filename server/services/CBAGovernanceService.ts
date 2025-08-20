import { z } from "zod";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";

/**
 * CBA Document Ingestion and Governance Service
 * 
 * Handles:
 * - New CBA document ingestion (admin/legal only)
 * - Versioned publishing with sandbox diffs
 * - Rollout strategy: sandbox → pilot → all properties
 * - Auto-generated impact reports
 */

export interface CBADocumentIngestion {
  documentId: string;
  sourceType: 'pdf_upload' | 'manual_entry' | 'api_import';
  documentName: string;
  effectiveDate: string;
  sector: string;
  uploadedBy: string;
  rawContent?: {
    pdfText?: string;
    manualData?: any;
    apiPayload?: any;
  };
  extractedRules: {
    wageTable: Array<{
      category: string;
      grade: string;
      step: number;
      monthlyWage: number;
    }>;
    allowances: Array<{
      code: string;
      name: string;
      amount?: number;
      percentage?: number;
      calculation: string;
      taxTreatment: string;
    }>;
    premiums: Array<{
      code: string;
      name: string;
      rate: number;
      timeConditions?: string;
      stackable: boolean;
    }>;
    constraints: Array<{
      type: string;
      value: number;
      unit: string;
      description: string;
    }>;
  };
  validationStatus: 'pending' | 'validated' | 'rejected';
  validationErrors: string[];
}

export interface CBAVersionDiff {
  versionFrom: string;
  versionTo: string;
  changes: Array<{
    changeType: 'wage_increase' | 'new_allowance' | 'premium_change' | 'constraint_update';
    category?: string;
    grade?: string;
    field: string;
    oldValue: any;
    newValue: any;
    description: string;
    impact: {
      affectedEmployees: number;
      monthlyCostDelta: number;
      annualCostDelta: number;
    };
  }>;
  totalImpact: {
    totalAffectedEmployees: number;
    totalMonthlyCostDelta: number;
    totalAnnualCostDelta: number;
  };
}

export interface RolloutStrategy {
  strategyId: string;
  cbaVersionId: string;
  phases: Array<{
    phaseNumber: number;
    phaseName: 'sandbox' | 'pilot' | 'rollout';
    targetProperties: string[];
    plannedStartDate: string;
    actualStartDate?: string;
    completionDate?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'paused';
    validationCriteria: string[];
    rollbackPlan?: string;
  }>;
  impactReport: {
    generatedAt: string;
    reportData: any;
  };
}

const cbaIngestionSchema = z.object({
  documentName: z.string().min(1),
  effectiveDate: z.string().datetime(),
  sector: z.enum(['tourism', 'fnb']),
  sourceType: z.enum(['pdf_upload', 'manual_entry', 'api_import']),
  rawContent: z.object({
    pdfText: z.string().optional(),
    manualData: z.any().optional(),
    apiPayload: z.any().optional()
  }).optional(),
  extractedRules: z.object({
    wageTable: z.array(z.object({
      category: z.string(),
      grade: z.string(),
      step: z.number(),
      monthlyWage: z.number()
    })),
    allowances: z.array(z.object({
      code: z.string(),
      name: z.string(),
      amount: z.number().optional(),
      percentage: z.number().optional(),
      calculation: z.string(),
      taxTreatment: z.string()
    })),
    premiums: z.array(z.object({
      code: z.string(),
      name: z.string(),
      rate: z.number(),
      timeConditions: z.string().optional(),
      stackable: z.boolean()
    })),
    constraints: z.array(z.object({
      type: z.string(),
      value: z.number(),
      unit: z.string(),
      description: z.string()
    }))
  })
});

export class CBAGovernanceService {

  /**
   * Ingest new CBA document (admin/legal only)
   */
  static async ingestCBADocument(
    documentData: z.infer<typeof cbaIngestionSchema>,
    userId: string,
    userRole: string
  ): Promise<{
    success: boolean;
    documentId?: string;
    validationResults?: {
      valid: boolean;
      errors: string[];
      warnings: string[];
    };
    error?: string;
  }> {
    
    // Check permissions (admin/legal only)
    if (!['admin', 'legal', 'hr_admin'].includes(userRole)) {
      return {
        success: false,
        error: 'Insufficient permissions. Only admin/legal users can ingest CBA documents.'
      };
    }

    try {
      // Validate input data
      const validatedData = cbaIngestionSchema.parse(documentData);
      
      // Generate document ID
      const documentId = `CBA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Validate extracted rules
      const validationResults = await this.validateExtractedRules(validatedData.extractedRules);

      // Store document
      const ingestionRecord: CBADocumentIngestion = {
        documentId,
        sourceType: validatedData.sourceType,
        documentName: validatedData.documentName,
        effectiveDate: validatedData.effectiveDate,
        sector: validatedData.sector,
        uploadedBy: userId,
        rawContent: validatedData.rawContent,
        extractedRules: validatedData.extractedRules,
        validationStatus: validationResults.valid ? 'validated' : 'pending',
        validationErrors: validationResults.errors
      };

      // TODO: Store in database
      // await db.insert(cbaDocumentIngestions).values(ingestionRecord);

      console.log('CBA Document Ingested:', ingestionRecord);

      return {
        success: true,
        documentId,
        validationResults
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Ingestion failed: ${error.message}`
      };
    }
  }

  /**
   * Generate sandbox diff for new version
   */
  static async generateSandboxDiff(
    currentVersionId: string,
    newRules: any,
    propertyIds: string[]
  ): Promise<CBAVersionDiff> {
    
    // Mock current version (would fetch from database)
    const currentVersion = {
      id: currentVersionId,
      wageTable: [
        { category: "Housekeeping", grade: "C", step: 0, monthlyWage: 920 }
      ],
      allowances: [
        { code: "MEAL_ALLOW", name: "Meal Allowance", amount: 6, calculation: "per_day" }
      ]
    };

    const changes = [];
    let totalAffectedEmployees = 0;
    let totalMonthlyCostDelta = 0;

    // Compare wage tables
    for (const newWage of newRules.wageTable) {
      const currentWage = currentVersion.wageTable.find(w => 
        w.category === newWage.category && w.grade === newWage.grade && w.step === newWage.step
      );

      if (currentWage && currentWage.monthlyWage !== newWage.monthlyWage) {
        // Simulate impact calculation
        const affectedEmployees = await this.getAffectedEmployeeCount(
          propertyIds, newWage.category, newWage.grade
        );
        
        const monthlyCostDelta = (newWage.monthlyWage - currentWage.monthlyWage) * affectedEmployees;
        
        changes.push({
          changeType: 'wage_increase' as const,
          category: newWage.category,
          grade: newWage.grade,
          field: 'monthlyWage',
          oldValue: currentWage.monthlyWage,
          newValue: newWage.monthlyWage,
          description: `+€${newWage.monthlyWage - currentWage.monthlyWage} to ${newWage.category} ${newWage.grade} grade`,
          impact: {
            affectedEmployees,
            monthlyCostDelta,
            annualCostDelta: monthlyCostDelta * 12
          }
        });

        totalAffectedEmployees += affectedEmployees;
        totalMonthlyCostDelta += monthlyCostDelta;
      }
    }

    // Check for new allowances
    for (const newAllowance of newRules.allowances) {
      const currentAllowance = currentVersion.allowances.find(a => a.code === newAllowance.code);
      
      if (!currentAllowance) {
        const affectedEmployees = await this.getAffectedEmployeeCount(propertyIds);
        const monthlyCostDelta = (newAllowance.amount || 0) * affectedEmployees;

        changes.push({
          changeType: 'new_allowance' as const,
          field: 'allowances',
          oldValue: null,
          newValue: newAllowance,
          description: `Enable new allowance ${newAllowance.name}`,
          impact: {
            affectedEmployees,
            monthlyCostDelta,
            annualCostDelta: monthlyCostDelta * 12
          }
        });

        totalAffectedEmployees += affectedEmployees;
        totalMonthlyCostDelta += monthlyCostDelta;
      }
    }

    return {
      versionFrom: currentVersionId,
      versionTo: `v${Date.now()}`,
      changes,
      totalImpact: {
        totalAffectedEmployees,
        totalMonthlyCostDelta,
        totalAnnualCostDelta: totalMonthlyCostDelta * 12
      }
    };
  }

  /**
   * Create rollout strategy with impact report
   */
  static async createRolloutStrategy(
    cbaVersionId: string,
    targetProperties: string[],
    rolloutConfig: {
      pilotProperties?: string[];
      rolloutStartDate: string;
      phaseGapDays: number;
    }
  ): Promise<RolloutStrategy> {
    
    const strategyId = `ROLLOUT-${Date.now()}`;
    
    // Define phases
    const phases = [
      {
        phaseNumber: 1,
        phaseName: 'sandbox' as const,
        targetProperties: ['sandbox'], // Virtual sandbox property
        plannedStartDate: new Date().toISOString(),
        status: 'completed' as const,
        validationCriteria: ['calculations_verified', 'compliance_checked'],
        rollbackPlan: 'Immediate rollback to previous version'
      },
      {
        phaseNumber: 2,
        phaseName: 'pilot' as const,
        targetProperties: rolloutConfig.pilotProperties || [targetProperties[0]],
        plannedStartDate: rolloutConfig.rolloutStartDate,
        status: 'planned' as const,
        validationCriteria: ['employee_feedback', 'payroll_accuracy', 'no_critical_issues'],
        rollbackPlan: 'Rollback within 24 hours if critical issues'
      },
      {
        phaseNumber: 3,
        phaseName: 'rollout' as const,
        targetProperties: targetProperties,
        plannedStartDate: new Date(
          new Date(rolloutConfig.rolloutStartDate).getTime() + 
          rolloutConfig.phaseGapDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        status: 'planned' as const,
        validationCriteria: ['pilot_success', 'full_compliance_verified'],
        rollbackPlan: 'Staged rollback per property if issues detected'
      }
    ];

    // Generate impact report
    const impactReport = await this.generateImpactReport(cbaVersionId, targetProperties);

    return {
      strategyId,
      cbaVersionId,
      phases,
      impactReport: {
        generatedAt: new Date().toISOString(),
        reportData: impactReport
      }
    };
  }

  /**
   * Generate auto impact report
   */
  static async generateImpactReport(
    cbaVersionId: string, 
    targetProperties: string[]
  ): Promise<{
    summary: {
      totalProperties: number;
      totalEmployees: number;
      estimatedMonthlyCost: number;
      estimatedAnnualCost: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    propertyBreakdown: Array<{
      propertyId: string;
      propertyName: string;
      employeeCount: number;
      monthlyCostDelta: number;
      annualCostDelta: number;
      riskFactors: string[];
    }>;
    changeImpacts: Array<{
      changeType: string;
      description: string;
      totalCost: number;
      affectedEmployees: number;
    }>;
  }> {
    
    // Mock data - in production, would query actual employee/property data
    const propertyBreakdown = await Promise.all(
      targetProperties.map(async (propertyId) => {
        const employeeCount = await this.getPropertyEmployeeCount(propertyId);
        const monthlyCostDelta = employeeCount * 50; // Estimated €50/employee increase
        
        return {
          propertyId,
          propertyName: `Property ${propertyId}`,
          employeeCount,
          monthlyCostDelta,
          annualCostDelta: monthlyCostDelta * 12,
          riskFactors: employeeCount > 100 ? ['large_workforce'] : []
        };
      })
    );

    const totalEmployees = propertyBreakdown.reduce((sum, p) => sum + p.employeeCount, 0);
    const estimatedMonthlyCost = propertyBreakdown.reduce((sum, p) => sum + p.monthlyCostDelta, 0);

    return {
      summary: {
        totalProperties: targetProperties.length,
        totalEmployees,
        estimatedMonthlyCost,
        estimatedAnnualCost: estimatedMonthlyCost * 12,
        riskLevel: estimatedMonthlyCost > 10000 ? 'high' : 'medium'
      },
      propertyBreakdown,
      changeImpacts: [
        {
          changeType: 'wage_increase',
          description: 'Housekeeping Grade C increase',
          totalCost: estimatedMonthlyCost * 0.7,
          affectedEmployees: Math.floor(totalEmployees * 0.3)
        },
        {
          changeType: 'new_allowance', 
          description: 'New Cold Meal allowance',
          totalCost: estimatedMonthlyCost * 0.3,
          affectedEmployees: totalEmployees
        }
      ]
    };
  }

  /**
   * Execute rollout phase
   */
  static async executeRolloutPhase(
    strategyId: string,
    phaseNumber: number
  ): Promise<{
    success: boolean;
    phaseStatus: string;
    validationResults?: any;
    error?: string;
  }> {
    
    try {
      // Mock implementation - would trigger actual CBA pack updates
      console.log(`Executing rollout phase ${phaseNumber} for strategy ${strategyId}`);
      
      // Simulate phase execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock validation
      const validationResults = {
        calculations_verified: true,
        compliance_checked: true,
        no_critical_issues: true
      };

      return {
        success: true,
        phaseStatus: 'completed',
        validationResults
      };

    } catch (error: any) {
      return {
        success: false,
        phaseStatus: 'failed',
        error: error.message
      };
    }
  }

  // Helper methods

  private static async validateExtractedRules(rules: any): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors = [];
    const warnings = [];

    // Validate wage table
    if (!rules.wageTable || rules.wageTable.length === 0) {
      errors.push('Wage table is required');
    }

    // Check for reasonable wage values
    for (const wage of rules.wageTable || []) {
      if (wage.monthlyWage < 600) { // Below Greek minimum wage
        errors.push(`Wage ${wage.monthlyWage} below minimum wage for ${wage.category} ${wage.grade}`);
      }
    }

    // Validate allowances
    for (const allowance of rules.allowances || []) {
      if (!allowance.code || !allowance.name) {
        errors.push('Allowance missing code or name');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static async getAffectedEmployeeCount(
    propertyIds: string[],
    category?: string,
    grade?: string
  ): Promise<number> {
    // Mock implementation - would query employee database
    let baseCount = propertyIds.length * 20; // 20 employees per property average
    
    if (category === 'Housekeeping') baseCount *= 0.3; // 30% are housekeeping
    if (grade === 'C') baseCount *= 0.5; // 50% are grade C
    
    return Math.floor(baseCount);
  }

  private static async getPropertyEmployeeCount(propertyId: string): Promise<number> {
    // Mock implementation
    const baseCounts: Record<string, number> = {
      'prop-princess': 45,
      'prop-royal': 32,
      'prop-garden': 28
    };
    
    return baseCounts[propertyId] || 25;
  }
}