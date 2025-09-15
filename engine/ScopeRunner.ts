/**
 * Scope Runner - Payroll Processing Orchestrator
 * 
 * Coordinates the entire payroll processing pipeline from scope creation
 * to result storage. Acts as the main entry point for payroll operations
 * in the 3-layer architecture.
 */

import { 
  PayrollScope,
  PayrollCalculationInput,
  PayrollCalculationResult,
  PayrollRunMetrics,
  Employee,
  WorkingHours,
  ValidationError,
  BusinessRuleResult,
  PayrollDomainError
} from '../shared/payrollDomain.js';

import { PayrollEngine, PayrollEngineConfig, PayrollEngineResult } from './PayrollEngine.js';
import { PayrollRepositoryService } from '../services/PayrollRepositoryService.js';
import { ComplianceConnectorService } from '../services/ComplianceConnectorService.js';
import { GreekLawConstants, lawRegistry } from '../shared/law-constants.js';

// =============================================================================
// SCOPE RUNNER CONFIGURATION
// =============================================================================

export interface ScopeRunnerConfig {
  engine: PayrollEngineConfig;
  compliance: {
    erganiEnabled: boolean;
    efkaEnabled: boolean;
    aadeEnabled: boolean;
    validateInputs: boolean;
  };
  performance: {
    enableProfiling: boolean;
    enableCaching: boolean;
    maxConcurrentCalculations: number;
  };
  storage: {
    autoSaveResults: boolean;
    createBackups: boolean;
    enableAuditTrail: boolean;
  };
}

export interface ScopeRunResult {
  scope: PayrollScope;
  results: PayrollCalculationResult[];
  metrics: PayrollRunMetrics;
  errors: ValidationError[];
  warnings: ValidationError[];
  success: boolean;
}

// =============================================================================
// MAIN SCOPE RUNNER CLASS
// =============================================================================

export class ScopeRunner {
  private readonly repositoryService: PayrollRepositoryService;
  private readonly complianceService: ComplianceConnectorService;
  private readonly payrollEngine: PayrollEngine;
  private readonly config: ScopeRunnerConfig;

  constructor(
    repositoryService: PayrollRepositoryService,
    complianceService: ComplianceConnectorService,
    config: Partial<ScopeRunnerConfig> = {}
  ) {
    this.repositoryService = repositoryService;
    this.complianceService = complianceService;
    
    // Default configuration
    this.config = {
      engine: {
        batchSize: 500,
        enableMemoization: true,
        validateInputs: true,
        ...config.engine
      },
      compliance: {
        erganiEnabled: false,
        efkaEnabled: false,
        aadeEnabled: false,
        validateInputs: true,
        ...config.compliance
      },
      performance: {
        enableProfiling: true,
        enableCaching: true,
        maxConcurrentCalculations: 100,
        ...config.performance
      },
      storage: {
        autoSaveResults: true,
        createBackups: true,
        enableAuditTrail: true,
        ...config.storage
      }
    };

    // Initialize payroll engine with ports
    this.payrollEngine = new PayrollEngine(
      this.repositoryService,
      this.complianceService,
      this.config.engine
    );
  }

  // =============================================================================
  // MAIN SCOPE PROCESSING METHODS
  // =============================================================================

  /**
   * Process a complete payroll scope from start to finish
   */
  async runPayrollScope(scopeId: string, lawVersionDate?: Date): Promise<ScopeRunResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    try {
      console.log(`🚀 Starting payroll scope: ${scopeId}`);
      
      // 1. Load payroll scope
      const scope = await this.loadScope(scopeId);
      if (!scope) {
        throw new PayrollDomainError(
          'SCOPE_NOT_FOUND',
          'scopeId',
          `Payroll scope not found: ${scopeId}`,
          { scopeId }
        );
      }
      
      console.log(`📋 Loaded scope for ${scope.selectedEmployeeIds.length} employees (period: ${scope.period})`);
      
      // 2. Get law version for the period
      const lawVersion = lawVersionDate ? 
        lawRegistry.getActiveVersion(lawVersionDate) : 
        lawRegistry.getActiveVersion(new Date());
      
      console.log(`⚖️  Using law version: ${lawVersion.version.versionId}`);
      
      // 3. Validate scope and employees
      const businessRulesResult = await this.validateBusinessRules(scope, lawVersion);
      errors.push(...businessRulesResult.overallErrors);
      
      if (!businessRulesResult.canCreateScope) {
        throw new PayrollDomainError(
          'BUSINESS_RULES_FAILED',
          'validation',
          `Business rules validation failed: ${businessRulesResult.summary.criticalErrors} critical errors`,
          { businessRulesResult }
        );
      }
      
      if (businessRulesResult.summary.warnings > 0) {
        console.log(`⚠️  Found ${businessRulesResult.summary.warnings} warnings during validation`);
        // Add warnings but continue processing
        for (const [employeeId, employeeErrors] of Object.entries(businessRulesResult.employeeErrors)) {
          warnings.push(...employeeErrors.filter(e => e.severity === 'warning'));
        }
      }
      
      // 4. Build calculation inputs
      const calculationInputs = await this.buildCalculationInputs(scope, lawVersion);
      console.log(`🔧 Built calculation inputs for ${calculationInputs.length} employees`);
      
      // 5. Run payroll calculations
      const engineResult = await this.payrollEngine.calculateBatchPayroll(calculationInputs, lawVersion);
      errors.push(...engineResult.errors);
      warnings.push(...engineResult.warnings);
      
      console.log(`💰 Calculated payroll for ${engineResult.results.length} employees`);
      console.log(`   Processing time: ${engineResult.metrics.processingTimeMs}ms`);
      console.log(`   Memory used: ${engineResult.metrics.memoryUsedMB}MB`);
      
      if (!engineResult.success && engineResult.results.length === 0) {
        throw new PayrollDomainError(
          'CALCULATION_FAILED',
          'payrollEngine',
          'Payroll calculation failed for all employees',
          { engineResult }
        );
      }
      
      // 6. Save results (if enabled)
      if (this.config.storage.autoSaveResults) {
        await this.repositoryService.savePayrollResults(scopeId, engineResult.results);
        console.log(`💾 Saved ${engineResult.results.length} payroll results`);
      }
      
      // 7. Create audit trail (if enabled)
      if (this.config.storage.enableAuditTrail) {
        await this.createAuditTrail(scope, engineResult, lawVersion);
      }
      
      // 8. Calculate final metrics
      const endTime = Date.now();
      const metrics: PayrollRunMetrics = {
        scopeId,
        employeeCount: scope.selectedEmployeeIds.length,
        processingTimeMs: endTime - startTime,
        memoryUsageMB: engineResult.metrics.memoryUsedMB,
        lawVersionUsed: lawVersion.version.versionId,
        successfulCalculations: engineResult.results.length,
        errors: errors.length,
        warnings: warnings.length
      };
      
      console.log(`✅ Payroll scope completed successfully`);
      console.log(`   Total time: ${metrics.processingTimeMs}ms`);
      console.log(`   Success rate: ${engineResult.results.length}/${scope.selectedEmployeeIds.length} (${((engineResult.results.length / scope.selectedEmployeeIds.length) * 100).toFixed(1)}%)`);
      
      return {
        scope,
        results: engineResult.results,
        metrics,
        errors,
        warnings,
        success: errors.filter(e => e.severity === 'error').length === 0
      };
      
    } catch (error) {
      const endTime = Date.now();
      
      throw new PayrollDomainError(
        'SCOPE_RUN_FAILED',
        'scopeRunner',
        `Payroll scope run failed: ${error instanceof Error ? error.message : String(error)}`,
        { 
          scopeId,
          processingTimeMs: endTime - startTime,
          errors,
          warnings,
          originalError: error
        }
      );
    }
  }

  // =============================================================================
  // SCOPE MANAGEMENT METHODS
  // =============================================================================

  /**
   * Create a new payroll scope
   */
  async createScope(
    period: string,
    employeeIds: string[],
    createdBy: string
  ): Promise<PayrollScope> {
    try {
      const scope: PayrollScope = {
        scopeId: `scope_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        period,
        selectedEmployeeIds: employeeIds,
        status: 'draft' as any,
        createdBy,
        createdAt: new Date()
      };
      
      // Save to database (would need to be implemented in repository service)
      console.log(`📝 Created new payroll scope: ${scope.scopeId}`);
      console.log(`   Period: ${scope.period}`);
      console.log(`   Employees: ${scope.selectedEmployeeIds.length}`);
      
      return scope;
      
    } catch (error) {
      throw new PayrollDomainError(
        'SCOPE_CREATION_FAILED',
        'createScope',
        `Failed to create payroll scope: ${error instanceof Error ? error.message : String(error)}`,
        { period, employeeIds, createdBy, originalError: error }
      );
    }
  }

  private async loadScope(scopeId: string): Promise<PayrollScope | null> {
    return await this.repositoryService.getPayrollScope(scopeId);
  }

  // =============================================================================
  // VALIDATION METHODS
  // =============================================================================

  private async validateBusinessRules(
    scope: PayrollScope,
    lawVersion: GreekLawConstants
  ): Promise<BusinessRuleResult> {
    const errors: ValidationError[] = [];
    const employeeErrors: Record<string, ValidationError[]> = {};
    
    try {
      // Validate scope itself
      if (!scope.period || !/^\d{4}-\d{2}$/.test(scope.period)) {
        errors.push({
          code: 'INVALID_PERIOD_FORMAT',
          field: 'period',
          message: 'Period must be in YYYY-MM format',
          messageGr: 'Η περίοδος πρέπει να είναι σε μορφή YYYY-MM',
          severity: 'error'
        });
      }
      
      if (scope.selectedEmployeeIds.length === 0) {
        errors.push({
          code: 'NO_EMPLOYEES_SELECTED',
          field: 'selectedEmployeeIds',
          message: 'No employees selected for payroll scope',
          messageGr: 'Δεν επιλέχθηκαν εργαζόμενοι για την περίοδο μισθοδοσίας',
          severity: 'error'
        });
      }
      
      if (scope.selectedEmployeeIds.length > 1000) {
        errors.push({
          code: 'TOO_MANY_EMPLOYEES',
          field: 'selectedEmployeeIds',
          message: 'Maximum 1000 employees allowed per scope',
          messageGr: 'Μέγιστο 1000 εργαζόμενοι επιτρέπονται ανά περίοδο',
          severity: 'error'
        });
      }
      
      // Get employee data for validation
      const employees = await this.repositoryService.getEmployeePayrollInfo(scope.selectedEmployeeIds);
      
      // Validate each employee
      for (const employee of employees) {
        const empErrors: ValidationError[] = [];
        
        // Check if employee is active
        if (!employee.employment.isActive) {
          empErrors.push({
            code: 'EMPLOYEE_INACTIVE',
            field: 'isActive',
            message: `Employee ${employee.employment.employeeNumber} is inactive`,
            messageGr: `Ο εργαζόμενος ${employee.employment.employeeNumber} είναι ανενεργός`,
            severity: 'error'
          });
        }
        
        // Validate tax identifiers
        const taxIdValidation = await this.complianceService.validateTaxIdentifiers(
          employee.taxIdentifiers.afm,
          employee.taxIdentifiers.amka
        );
        empErrors.push(...taxIdValidation);
        
        // Check salary ranges
        const minWage = lawVersion.minimumWage.monthly;
        if (employee.compensation.baseSalary < minWage) {
          empErrors.push({
            code: 'SALARY_BELOW_MINIMUM',
            field: 'baseSalary',
            message: `Salary below minimum wage (€${minWage})`,
            messageGr: `Μισθός κάτω από τον κατώτατο μισθό (€${minWage})`,
            severity: 'error'
          });
        }
        
        if (empErrors.length > 0) {
          employeeErrors[employee.id] = empErrors;
        }
      }
      
      // Count error types
      const allEmployeeErrors = Object.values(employeeErrors).flat();
      const criticalErrors = [...errors, ...allEmployeeErrors].filter(e => e.severity === 'error').length;
      const warnings = allEmployeeErrors.filter(e => e.severity === 'warning').length;
      
      const canCreateScope = criticalErrors === 0;
      const validEmployees = scope.selectedEmployeeIds.length - Object.keys(employeeErrors).length;
      
      return {
        isValid: canCreateScope,
        canCreateScope,
        overallErrors: errors,
        employeeErrors,
        summary: {
          totalEmployees: scope.selectedEmployeeIds.length,
          validEmployees,
          criticalErrors,
          warnings
        }
      };
      
    } catch (error) {
      throw new PayrollDomainError(
        'BUSINESS_RULES_VALIDATION_FAILED',
        'validation',
        `Business rules validation failed: ${error instanceof Error ? error.message : String(error)}`,
        { scope, originalError: error }
      );
    }
  }

  // =============================================================================
  // INPUT BUILDING METHODS
  // =============================================================================

  private async buildCalculationInputs(
    scope: PayrollScope,
    lawVersion: GreekLawConstants
  ): Promise<PayrollCalculationInput[]> {
    try {
      // Get employee data
      const employees = await this.repositoryService.getEmployeePayrollInfo(scope.selectedEmployeeIds);
      
      // Get timesheet data for the period
      const timesheetData = await this.repositoryService.getTimesheetData(scope.selectedEmployeeIds, scope.period);
      
      // Create map for easy lookup
      const timesheetMap = new Map<string, WorkingHours>();
      timesheetData.forEach((hours, index) => {
        if (index < scope.selectedEmployeeIds.length) {
          timesheetMap.set(scope.selectedEmployeeIds[index], hours);
        }
      });
      
      // Parse period for date range
      const [year, month] = scope.period.split('-').map(Number);
      const periodStartDate = new Date(year, month - 1, 1);
      const periodEndDate = new Date(year, month, 0); // Last day of month
      
      // Build inputs for each employee
      const inputs: PayrollCalculationInput[] = [];
      
      for (const employee of employees) {
        const workingHours = timesheetMap.get(employee.id) || {
          regularHours: 0,
          overtimeHours: 0,
          nightHours: 0,
          sundayHours: 0,
          holidayHours: 0
        };
        
        const input: PayrollCalculationInput = {
          employeeId: employee.id,
          periodId: scope.period,
          
          // Basic compensation
          baseSalary: employee.compensation.baseSalary,
          hourlyRate: employee.compensation.hourlyRate,
          
          // Working hours from timesheets
          workingHours,
          
          // Leave hours (would come from leave system)
          leaveHours: {
            annual: 0, // TODO: Get from leave system
            sick: 0,
            maternity: 0,
            paternity: 0
          },
          
          // Additional compensation (would come from employee settings)
          allowances: {
            food: 0, // TODO: Get from employee allowances
            transport: 0,
            housing: 0,
            marriage: 0,
            family: 0,
            education: 0,
            experience: 0,
            position: 0
          },
          
          tips: 0, // TODO: Get from tip tracking system
          
          // Benefits in kind (would come from benefits system)
          benefitsInKind: {
            mealVouchers: 0,
            companyCar: 0,
            housing: 0
          },
          
          // Contract details
          contractType: employee.employment.contractType,
          isFullTime: employee.employment.employmentType === 'full_time' as any,
          employmentStartDate: employee.employment.hireDate,
          periodStartDate,
          periodEndDate
        };
        
        inputs.push(input);
      }
      
      return inputs;
      
    } catch (error) {
      throw new PayrollDomainError(
        'INPUT_BUILDING_FAILED',
        'buildInputs',
        `Failed to build calculation inputs: ${error instanceof Error ? error.message : String(error)}`,
        { scope, originalError: error }
      );
    }
  }

  // =============================================================================
  // AUDIT AND LOGGING METHODS
  // =============================================================================

  private async createAuditTrail(
    scope: PayrollScope,
    engineResult: PayrollEngineResult,
    lawVersion: GreekLawConstants
  ): Promise<void> {
    try {
      const auditData = {
        scopeId: scope.scopeId,
        period: scope.period,
        lawVersionUsed: lawVersion.version.versionId,
        employeeCount: scope.selectedEmployeeIds.length,
        successfulCalculations: engineResult.results.length,
        errors: engineResult.errors.length,
        warnings: engineResult.warnings.length,
        processingTimeMs: engineResult.metrics.processingTimeMs,
        memoryUsedMB: engineResult.metrics.memoryUsedMB,
        timestamp: new Date(),
        createdBy: scope.createdBy
      };
      
      console.log(`📜 Created audit trail for scope ${scope.scopeId}`, auditData);
      
      // TODO: Save to audit log table
      
    } catch (error) {
      // Audit failures should not break the main process
      console.error('Failed to create audit trail:', error);
    }
  }

  // =============================================================================
  // HEALTH CHECK AND MONITORING
  // =============================================================================

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    components: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }>;
  }> {
    const components: Record<string, { status: 'healthy' | 'unhealthy'; message?: string }> = {};
    
    // Check repository service
    try {
      const repoHealth = await this.repositoryService.healthCheck();
      components.repository = repoHealth;
    } catch (error) {
      components.repository = { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : String(error) 
      };
    }
    
    // Check compliance service
    try {
      const complianceHealth = await this.complianceService.healthCheck();
      components.compliance = complianceHealth;
    } catch (error) {
      components.compliance = { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : String(error) 
      };
    }
    
    // Check law registry
    try {
      const currentLaw = lawRegistry.getCurrentConstants();
      components.lawRegistry = { 
        status: 'healthy', 
        message: `Using law version ${currentLaw.version.versionId}` 
      };
    } catch (error) {
      components.lawRegistry = { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : String(error) 
      };
    }
    
    const allHealthy = Object.values(components).every(c => c.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      components
    };
  }
}