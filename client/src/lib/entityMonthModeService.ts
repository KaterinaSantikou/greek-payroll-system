// Entity Month Mode Management Service
// Manages the month-by-month operational mode declarations for Greek Digital Work Card

import { 
  EntityMonthMode, 
  InsertEntityMonthMode,
  WorkCardModeHistory,
  CompanyDigitalWorkCardSettings 
} from "@shared/schema";

export interface MonthModeDeclaration {
  month: string; // YYYY-MM
  mode: 'retrospective' | 'preannounce';
  justification: string;
  declaredBy: string;
  forcedMode?: boolean; // Override validation warnings
}

export interface ModeValidationResult {
  isValid: boolean;
  canProceed: boolean;
  warnings: string[];
  errors: string[];
  conflictingMode?: {
    previousMode: string;
    declaredAt: Date;
    declaredBy: string;
  };
}

export interface MonthModeStatus {
  month: string;
  currentMode: 'retrospective' | 'preannounce' | 'undeclared';
  isLocked: boolean;
  deadlineStatus: 'compliant' | 'warning' | 'overdue';
  daysRemaining: number;
  canChange: boolean;
  changeReason?: string;
}

export interface ComplianceReport {
  totalMonths: number;
  declaredMonths: number;
  overdueMonths: number;
  conflictingModes: number;
  complianceScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

/**
 * 2.1 «Δηλώσεις μηναίου τρόπου λειτουργίας» - Entity Month Mode Management
 * Core service for managing Greek legal requirement: cannot mix modes within same month
 */
export class EntityMonthModeService {
  private tenantId: string;
  private companyId: string;

  constructor(tenantId: string, companyId: string) {
    this.tenantId = tenantId;
    this.companyId = companyId;
  }

  /**
   * Declare operational mode for a specific month
   * Enforces Greek legal requirement: cannot mix modes within same month
   */
  async declareMonthMode(declaration: MonthModeDeclaration): Promise<{
    success: boolean;
    entityMode?: EntityMonthMode;
    validationResult: ModeValidationResult;
  }> {
    // Validate the declaration
    const validationResult = await this.validateModeDeclaration(declaration);
    
    if (!validationResult.isValid && !declaration.forcedMode) {
      return {
        success: false,
        validationResult
      };
    }

    // Check for existing declaration in the same month
    const existingDeclaration = await this.getMonthMode(declaration.month);
    
    if (existingDeclaration && !declaration.forcedMode) {
      validationResult.errors.push(
        'Month mode already declared. Use forcedMode to override.'
      );
      return {
        success: false,
        validationResult
      };
    }

    // Create the entity month mode record
    const entityMode: InsertEntityMonthMode = {
      tenantId: this.tenantId,
      companyId: this.companyId,
      month: declaration.month,
      mode: declaration.mode,
      declaredAt: new Date(),
      declaredBy: declaration.declaredBy,
      validationStatus: validationResult.isValid ? 'validated' : 'violation',
      previousModeInMonth: existingDeclaration?.mode,
      declarationDeadline: this.calculateDeclarationDeadline(declaration.month),
      complianceDeadline: this.calculateComplianceDeadline(declaration.month, declaration.mode)
    };

    // Store in database (mock implementation)
    const savedEntityMode = await this.saveEntityMonthMode(entityMode);

    // Create audit trail entry
    await this.createAuditTrailEntry(declaration, savedEntityMode);

    return {
      success: true,
      entityMode: savedEntityMode,
      validationResult
    };
  }

  /**
   * Validate mode declaration against Greek legal requirements
   */
  async validateModeDeclaration(declaration: MonthModeDeclaration): Promise<ModeValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let conflictingMode: ModeValidationResult['conflictingMode'];

    // Check if month is valid
    if (!this.isValidMonth(declaration.month)) {
      errors.push('Invalid month format. Use YYYY-MM format.');
    }

    // Check if month is in the past or future constraints
    const monthDate = new Date(declaration.month + '-01');
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (monthDate < this.getEarliestAllowedMonth()) {
      errors.push('Cannot declare mode for months older than 6 months.');
    }

    if (monthDate > this.getLatestAllowedMonth()) {
      errors.push('Cannot declare mode more than 3 months in advance.');
    }

    // Check for existing mode in the same month (Greek legal requirement)
    const existingMode = await this.getMonthMode(declaration.month);
    if (existingMode && existingMode.mode !== declaration.mode) {
      conflictingMode = {
        previousMode: existingMode.mode,
        declaredAt: existingMode.declaredAt,
        declaredBy: existingMode.declaredBy
      };
      
      errors.push(
        `Cannot mix operational modes within the same month. ` +
        `Previous mode: ${existingMode.mode}, declared by ${existingMode.declaredBy}`
      );
    }

    // Check declaration deadline
    const declarationDeadline = this.calculateDeclarationDeadline(declaration.month);
    if (now > declarationDeadline) {
      warnings.push(
        `Declaration deadline has passed (${declarationDeadline.toLocaleDateString()}). ` +
        `Late declaration may incur penalties.`
      );
    }

    // Check mode-specific constraints
    if (declaration.mode === 'retrospective') {
      // Retrospective mode has stricter deadlines
      const complianceDeadline = this.calculateComplianceDeadline(declaration.month, 'retrospective');
      if (now > complianceDeadline) {
        errors.push(
          `Retrospective mode deadline has passed (${complianceDeadline.toLocaleDateString()}). ` +
          `Cannot declare retrospective mode after compliance deadline.`
        );
      }
    }

    const isValid = errors.length === 0;
    const canProceed = isValid || warnings.length > 0;

    return {
      isValid,
      canProceed,
      warnings,
      errors,
      conflictingMode
    };
  }

  /**
   * Get current mode status for a specific month
   */
  async getMonthModeStatus(month: string): Promise<MonthModeStatus> {
    const entityMode = await this.getMonthMode(month);
    const now = new Date();
    const declarationDeadline = this.calculateDeclarationDeadline(month);
    
    let currentMode: MonthModeStatus['currentMode'] = 'undeclared';
    let isLocked = false;
    let canChange = true;
    let changeReason: string | undefined;

    if (entityMode) {
      currentMode = entityMode.mode as any;
      isLocked = entityMode.validationStatus === 'validated';
      
      // Check if mode can still be changed
      const complianceDeadline = this.calculateComplianceDeadline(month, entityMode.mode as any);
      if (now > complianceDeadline) {
        canChange = false;
        changeReason = 'Compliance deadline has passed';
      }
    }

    // Calculate deadline status
    let deadlineStatus: MonthModeStatus['deadlineStatus'] = 'compliant';
    const daysRemaining = Math.ceil(
      (declarationDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 0) {
      deadlineStatus = 'overdue';
    } else if (daysRemaining <= 3) {
      deadlineStatus = 'warning';
    }

    return {
      month,
      currentMode,
      isLocked,
      deadlineStatus,
      daysRemaining,
      canChange,
      changeReason
    };
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(startMonth: string, endMonth: string): Promise<ComplianceReport> {
    const months = this.generateMonthRange(startMonth, endMonth);
    const monthModes = await this.getMonthModes(months);
    
    const totalMonths = months.length;
    const declaredMonths = monthModes.length;
    const overdueMonths = await this.countOverdueMonths(months);
    const conflictingModes = await this.countConflictingModes(monthModes);
    
    // Calculate compliance score
    const complianceScore = Math.round(
      ((declaredMonths - conflictingModes - overdueMonths) / totalMonths) * 100
    );
    
    // Determine risk level
    let riskLevel: ComplianceReport['riskLevel'] = 'low';
    if (complianceScore < 50) {
      riskLevel = 'critical';
    } else if (complianceScore < 70) {
      riskLevel = 'high';
    } else if (complianceScore < 85) {
      riskLevel = 'medium';
    }
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      totalMonths,
      declaredMonths,
      overdueMonths,
      conflictingModes,
      complianceScore
    });

    return {
      totalMonths,
      declaredMonths,
      overdueMonths,
      conflictingModes,
      complianceScore,
      riskLevel,
      recommendations
    };
  }

  /**
   * Auto-declare modes based on historical patterns and current workload
   */
  async suggestOptimalModes(months: string[]): Promise<{
    month: string;
    suggestedMode: 'retrospective' | 'preannounce';
    reason: string;
    confidence: number; // 0-100
  }[]> {
    const suggestions = [];

    for (const month of months) {
      // Analyze historical patterns
      const historicalPattern = await this.analyzeHistoricalPattern(month);
      
      // Check current workload and staffing
      const workloadAnalysis = await this.analyzeWorkload(month);
      
      // Generate suggestion
      let suggestedMode: 'retrospective' | 'preannounce' = 'preannounce';
      let reason = 'Default recommendation for predictable scheduling';
      let confidence = 70;
      
      if (workloadAnalysis.hasHighVariability) {
        suggestedMode = 'retrospective';
        reason = 'High schedule variability detected, retrospective mode recommended';
        confidence = 85;
      }
      
      if (historicalPattern.frequentOvertimeChanges) {
        suggestedMode = 'retrospective';
        reason = 'Historical pattern shows frequent overtime changes';
        confidence = 80;
      }
      
      suggestions.push({
        month,
        suggestedMode,
        reason,
        confidence
      });
    }

    return suggestions;
  }

  // Private helper methods
  private async getMonthMode(month: string): Promise<EntityMonthMode | null> {
    // Mock implementation - in real code, query database
    return null;
  }

  private async saveEntityMonthMode(entityMode: InsertEntityMonthMode): Promise<EntityMonthMode> {
    // Mock implementation - in real code, save to database
    return {
      ...entityMode,
      id: `entity_mode_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    } as EntityMonthMode;
  }

  private async createAuditTrailEntry(
    declaration: MonthModeDeclaration,
    entityMode: EntityMonthMode
  ): Promise<void> {
    // Create comprehensive audit trail for compliance
    console.log('Creating audit trail entry:', {
      entityMode: entityMode.id,
      declaration,
      timestamp: new Date().toISOString()
    });
  }

  private isValidMonth(month: string): boolean {
    const regex = /^\d{4}-\d{2}$/;
    if (!regex.test(month)) return false;
    
    const date = new Date(month + '-01');
    return !isNaN(date.getTime());
  }

  private getEarliestAllowedMonth(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private getLatestAllowedMonth(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private calculateDeclarationDeadline(month: string): Date {
    // Greek legal requirement: declare by 10th of following month
    const [year, monthNum] = month.split('-').map(Number);
    const nextMonth = new Date(year, monthNum, 10); // 10th of following month
    return nextMonth;
  }

  private calculateComplianceDeadline(month: string, mode: 'retrospective' | 'preannounce'): Date {
    // Different deadlines based on mode
    const [year, monthNum] = month.split('-').map(Number);
    const deadline = new Date(year, monthNum, mode === 'retrospective' ? 15 : 25);
    return deadline;
  }

  private generateMonthRange(startMonth: string, endMonth: string): string[] {
    const months = [];
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    
    const current = new Date(start);
    while (current <= end) {
      months.push(
        `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`
      );
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }

  private async getMonthModes(months: string[]): Promise<EntityMonthMode[]> {
    // Mock implementation - in real code, query database for these months
    return [];
  }

  private async countOverdueMonths(months: string[]): Promise<number> {
    // Mock implementation
    return 0;
  }

  private async countConflictingModes(monthModes: EntityMonthMode[]): Promise<number> {
    // Count modes that violate the "cannot mix modes in same month" rule
    return monthModes.filter(mode => mode.previousModeInMonth && 
      mode.previousModeInMonth !== mode.mode).length;
  }

  private generateRecommendations(metrics: {
    totalMonths: number;
    declaredMonths: number;
    overdueMonths: number;
    conflictingModes: number;
    complianceScore: number;
  }): string[] {
    const recommendations = [];
    
    if (metrics.overdueMonths > 0) {
      recommendations.push(
        `Declare operational modes for ${metrics.overdueMonths} overdue months to avoid penalties`
      );
    }
    
    if (metrics.conflictingModes > 0) {
      recommendations.push(
        `Resolve ${metrics.conflictingModes} conflicting mode declarations to ensure legal compliance`
      );
    }
    
    const undeclaredMonths = metrics.totalMonths - metrics.declaredMonths;
    if (undeclaredMonths > 0) {
      recommendations.push(
        `Declare operational modes for ${undeclaredMonths} upcoming months to stay compliant`
      );
    }
    
    if (metrics.complianceScore < 85) {
      recommendations.push(
        'Consider implementing automated mode declarations to improve compliance score'
      );
    }
    
    return recommendations;
  }

  private async analyzeHistoricalPattern(month: string): Promise<{
    frequentOvertimeChanges: boolean;
    scheduleVariability: number;
    modePreference: 'retrospective' | 'preannounce';
  }> {
    // Mock analysis - in real implementation, analyze historical data
    return {
      frequentOvertimeChanges: false,
      scheduleVariability: 0.3,
      modePreference: 'preannounce'
    };
  }

  private async analyzeWorkload(month: string): Promise<{
    hasHighVariability: boolean;
    predictabilityScore: number;
    recommendedMode: 'retrospective' | 'preannounce';
  }> {
    // Mock analysis - in real implementation, analyze current workload patterns
    return {
      hasHighVariability: false,
      predictabilityScore: 0.8,
      recommendedMode: 'preannounce'
    };
  }
}

// Factory function for creating configured entity month mode service
export function createEntityMonthModeService(
  tenantId: string, 
  companyId: string
): EntityMonthModeService {
  return new EntityMonthModeService(tenantId, companyId);
}