/**
 * Automated Runbooks Service
 * Manages runbook execution, triggering, and automation for PayrollSync incident response
 */

import { db } from '../db';
import {
  runbooks,
  runbookExecutions,
  runbookStepExecutions,
  runbookTriggers,
  runbookTemplates,
  runbookExecutionLogs,
  runbookApprovals,
  onCallIncidents,
  governmentSystems,
  type Runbook,
  type RunbookExecution,
  type RunbookStepExecution,
  type InsertRunbookExecution,
  type InsertRunbookStepExecution,
  type InsertRunbookExecutionLog,
  type RunbookTrigger,
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count, avg, or, isNull, not } from 'drizzle-orm';
import { EventEmitter } from 'events';

export interface RunbookStep {
  name: string;
  type: 'command' | 'api_call' | 'notification' | 'approval' | 'condition' | 'loop' | 'wait';
  description?: string;
  config: any;
  dependsOn?: string[];
  timeout?: number;
  retries?: number;
  continueOnFailure?: boolean;
  rollbackStep?: any;
}

export interface ExecutionContext {
  incidentId?: string;
  alertId?: string;
  systemId?: string;
  variables: Record<string, any>;
  environment: 'production' | 'staging' | 'development';
  triggeredBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TriggerCondition {
  type: 'alert' | 'incident' | 'metric' | 'time' | 'system_state';
  conditions: any;
  severity?: string[];
  systems?: string[];
  patterns?: string[];
}

export class AutomatedRunbooksService extends EventEmitter {
  private static instance: AutomatedRunbooksService;
  private activeExecutions: Map<string, any> = new Map();
  private triggerMonitors: Map<string, NodeJS.Timeout> = new Map();
  private executionQueue: any[] = [];
  private maxConcurrentExecutions = 10;

  constructor() {
    super();
    this.initializeService();
  }

  static getInstance(): AutomatedRunbooksService {
    if (!AutomatedRunbooksService.instance) {
      AutomatedRunbooksService.instance = new AutomatedRunbooksService();
    }
    return AutomatedRunbooksService.instance;
  }

  /**
   * Initialize the runbooks service
   */
  async initializeService(): Promise<void> {
    // Only initialize in production
    if (process.env.NODE_ENV === 'production') {
      try {
        await this.createDefaultRunbooks();
        await this.initializeTriggerMonitoring();
        console.log('📚 Automated runbooks service initialized');
      } catch (error) {
        console.error('Failed to initialize automated runbooks service:', error);
      }
    } else {
      console.log('🔧 Automated runbooks service - development mode (minimal setup)');
    }
  }

  /**
   * Create default runbooks for common incident response scenarios
   */
  private async createDefaultRunbooks(): Promise<void> {
    const defaultRunbooks = [
      {
        name: 'ERGANI II System Recovery',
        description: 'Automated recovery procedures for ERGANI II outages',
        category: 'incident_response',
        triggerConditions: {
          type: 'system_state',
          systems: ['ergani_ii'],
          states: ['offline', 'degraded']
        },
        autoTrigger: true,
        triggerPriority: 9,
        steps: [
          {
            name: 'Check System Status',
            type: 'api_call',
            description: 'Verify ERGANI II system status',
            config: {
              url: 'https://ergani.gov.gr/health',
              method: 'GET',
              timeout: 30000,
              expectedStatus: 200
            }
          },
          {
            name: 'Notify On-Call Team',
            type: 'notification',
            description: 'Alert the government systems team',
            config: {
              channels: ['email', 'sms'],
              template: 'ergani_outage',
              escalation: true
            }
          },
          {
            name: 'Enable Fallback Mode',
            type: 'command',
            description: 'Switch to offline labor reporting mode',
            config: {
              command: 'enable_fallback_mode',
              parameters: { system: 'ergani_ii' }
            }
          },
          {
            name: 'Monitor Recovery',
            type: 'loop',
            description: 'Monitor system until recovery',
            config: {
              condition: 'system_status == "online"',
              interval: 300,
              maxIterations: 20
            }
          }
        ],
        estimatedDuration: 30,
        tags: ['government_systems', 'labor_reporting', 'critical'],
      },
      {
        name: 'e-EFKA Integration Failure Response',
        description: 'Handle e-EFKA social security system failures',
        category: 'incident_response',
        triggerConditions: {
          type: 'alert',
          patterns: ['EFKA.*timeout', 'EFKA.*connection.*failed'],
          severity: ['high', 'critical']
        },
        autoTrigger: true,
        triggerPriority: 8,
        steps: [
          {
            name: 'Verify e-EFKA Status',
            type: 'api_call',
            description: 'Check e-EFKA system availability',
            config: {
              url: 'https://www.efka.gov.gr/api/status',
              method: 'GET',
              timeout: 15000
            }
          },
          {
            name: 'Queue Pending Submissions',
            type: 'command',
            description: 'Queue all pending EFKA submissions for retry',
            config: {
              command: 'queue_efka_submissions',
              parameters: { mode: 'retry_on_recovery' }
            }
          },
          {
            name: 'Create Incident Report',
            type: 'api_call',
            description: 'Create formal incident for tracking',
            config: {
              endpoint: '/api/incidents',
              method: 'POST',
              data: {
                title: 'e-EFKA Integration Failure',
                severity: 'high',
                system: 'e_efka'
              }
            }
          }
        ],
        estimatedDuration: 15,
        tags: ['social_security', 'integration', 'payroll'],
      },
      {
        name: 'Payroll Processing Error Recovery',
        description: 'Automated recovery for payroll calculation errors',
        category: 'incident_response',
        triggerConditions: {
          type: 'alert',
          patterns: ['payroll.*error', 'calculation.*failed'],
          severity: ['medium', 'high', 'critical']
        },
        autoTrigger: false,
        requiresApproval: true,
        steps: [
          {
            name: 'Backup Current State',
            type: 'command',
            description: 'Create backup of current payroll state',
            config: {
              command: 'backup_payroll_state',
              parameters: { timestamp: true }
            }
          },
          {
            name: 'Rollback to Last Known Good',
            type: 'command',
            description: 'Rollback to last successful calculation',
            config: {
              command: 'rollback_payroll',
              parameters: { verify: true }
            }
          },
          {
            name: 'Re-run Calculations',
            type: 'command',
            description: 'Re-execute payroll calculations',
            config: {
              command: 'run_payroll_calculation',
              parameters: { validate: true, dryRun: false }
            }
          },
          {
            name: 'Validate Results',
            type: 'command',
            description: 'Validate payroll calculation results',
            config: {
              command: 'validate_payroll_results',
              parameters: { strictMode: true }
            }
          }
        ],
        estimatedDuration: 45,
        tags: ['payroll', 'calculation', 'recovery'],
      },
      {
        name: 'Database Performance Optimization',
        description: 'Automated database performance tuning',
        category: 'maintenance',
        triggerConditions: {
          type: 'metric',
          conditions: {
            query_time_avg: { gt: 5000 },
            active_connections: { gt: 100 }
          }
        },
        autoTrigger: true,
        triggerPriority: 5,
        steps: [
          {
            name: 'Analyze Slow Queries',
            type: 'command',
            description: 'Identify and log slow running queries',
            config: {
              command: 'analyze_slow_queries',
              parameters: { threshold: 5000 }
            }
          },
          {
            name: 'Optimize Indexes',
            type: 'command',
            description: 'Run automated index optimization',
            config: {
              command: 'optimize_database_indexes',
              parameters: { analyze: true }
            }
          },
          {
            name: 'Clear Query Cache',
            type: 'command',
            description: 'Clear and rebuild query cache',
            config: {
              command: 'clear_query_cache'
            }
          }
        ],
        estimatedDuration: 20,
        tags: ['database', 'performance', 'maintenance'],
      }
    ];

    for (const runbookData of defaultRunbooks) {
      try {
        const existing = await db
          .select()
          .from(runbooks)
          .where(eq(runbooks.name, runbookData.name))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(runbooks).values(runbookData);
          console.log(`Created default runbook: ${runbookData.name}`);
        }
      } catch (error) {
        if ((error as any)?.code === '42P01') {
          console.log('Runbooks table not yet created - using defaults');
          return;
        }
        console.error(`Failed to create runbook ${runbookData.name}:`, error);
      }
    }
  }

  /**
   * Initialize trigger monitoring for automatic runbook execution
   */
  private async initializeTriggerMonitoring(): Promise<void> {
    try {
      const activeTriggers = await db
        .select()
        .from(runbookTriggers)
        .where(eq(runbookTriggers.isActive, true));

      for (const trigger of activeTriggers) {
        this.setupTriggerMonitor(trigger);
      }

      console.log(`Set up ${activeTriggers.length} runbook triggers`);
    } catch (error) {
      if ((error as any)?.code === '42P01') {
        console.log('Runbook triggers table not yet created - skipping trigger setup');
      } else {
        console.error('Failed to initialize trigger monitoring:', error);
      }
    }
  }

  /**
   * Execute a runbook manually or automatically
   */
  async executeRunbook(
    runbookId: string,
    context: ExecutionContext,
    approved: boolean = false
  ): Promise<RunbookExecution> {
    try {
      // Get runbook details
      const [runbook] = await db
        .select()
        .from(runbooks)
        .where(eq(runbooks.id, runbookId))
        .limit(1);

      if (!runbook) {
        throw new Error('Runbook not found');
      }

      if (!runbook.isActive) {
        throw new Error('Runbook is not active');
      }

      // Check if approval is required
      if (runbook.requiresApproval && !approved) {
        return await this.requestApproval(runbook, context);
      }

      // Create execution record
      const executionData: InsertRunbookExecution = {
        runbookId,
        incidentId: context.incidentId,
        alertId: context.alertId,
        triggerType: context.incidentId ? 'automatic' : 'manual',
        triggeredBy: context.triggeredBy,
        triggerReason: `Triggered by ${context.incidentId ? 'incident' : 'manual request'}`,
        executionContext: context,
        status: 'running',
        startedAt: new Date(),
        variables: context.variables,
        approvalStatus: runbook.requiresApproval ? 'approved' : 'not_required',
      };

      const [execution] = await db
        .insert(runbookExecutions)
        .values(executionData)
        .returning();

      // Start execution
      this.activeExecutions.set(execution.id, execution);
      
      // Execute steps
      this.executeRunbookSteps(execution, runbook, context);

      // Emit execution started event
      this.emit('executionStarted', execution);

      console.log(`🚀 Started runbook execution: ${runbook.name} (${execution.id})`);
      return execution;
    } catch (error) {
      console.error('Failed to execute runbook:', error);
      throw error;
    }
  }

  /**
   * Execute runbook steps sequentially or in parallel
   */
  private async executeRunbookSteps(
    execution: RunbookExecution,
    runbook: Runbook,
    context: ExecutionContext
  ): Promise<void> {
    try {
      const steps = runbook.steps as RunbookStep[];
      if (!steps || steps.length === 0) {
        await this.completeExecution(execution.id, 'success', 'No steps to execute');
        return;
      }

      await this.logExecution(execution.id, 'info', 'Starting runbook execution', {
        runbook: runbook.name,
        stepCount: steps.length,
        context
      });

      let completedSteps = 0;
      let failedSteps = 0;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        try {
          // Check dependencies
          if (step.dependsOn && step.dependsOn.length > 0) {
            const dependenciesMet = await this.checkStepDependencies(execution.id, step.dependsOn);
            if (!dependenciesMet) {
              await this.logExecution(execution.id, 'warn', `Skipping step ${step.name} - dependencies not met`);
              continue;
            }
          }

          // Execute step
          const stepResult = await this.executeStep(execution.id, i, step, context);
          
          if (stepResult.result === 'success') {
            completedSteps++;
          } else if (stepResult.result === 'failure') {
            failedSteps++;
            
            if (!step.continueOnFailure) {
              await this.logExecution(execution.id, 'error', `Step ${step.name} failed, stopping execution`);
              await this.completeExecution(execution.id, 'failure', `Failed at step: ${step.name}`);
              return;
            }
          }

          // Update progress
          await db
            .update(runbookExecutions)
            .set({
              currentStepIndex: i + 1,
              completedSteps,
              failedSteps,
              updatedAt: new Date(),
            })
            .where(eq(runbookExecutions.id, execution.id));

        } catch (error) {
          failedSteps++;
          await this.logExecution(execution.id, 'error', `Step execution error: ${step.name}`, { error });
          
          if (!step.continueOnFailure) {
            await this.completeExecution(execution.id, 'failure', `Error in step: ${step.name}`);
            return;
          }
        }
      }

      // Determine final result
      const finalResult = failedSteps === 0 ? 'success' : 
                         completedSteps > failedSteps ? 'partial_success' : 'failure';
      
      await this.completeExecution(execution.id, finalResult, `Completed ${completedSteps}/${steps.length} steps`);

    } catch (error) {
      await this.logExecution(execution.id, 'error', 'Runbook execution failed', { error });
      await this.completeExecution(execution.id, 'failure', 'Execution error');
    }
  }

  /**
   * Execute a single runbook step
   */
  private async executeStep(
    executionId: string,
    stepIndex: number,
    step: RunbookStep,
    context: ExecutionContext
  ): Promise<any> {
    const startTime = new Date();
    
    // Create step execution record
    const stepExecution: InsertRunbookStepExecution = {
      executionId,
      stepIndex,
      stepName: step.name,
      stepType: step.type,
      stepConfig: step.config,
      inputData: context.variables,
      status: 'running',
      startedAt: startTime,
      maxRetries: step.retries || 3,
    };

    const [stepRecord] = await db
      .insert(runbookStepExecutions)
      .values(stepExecution)
      .returning();

    await this.logExecution(executionId, 'info', `Executing step: ${step.name}`, {
      stepType: step.type,
      config: step.config
    });

    try {
      let result: any;
      
      switch (step.type) {
        case 'command':
          result = await this.executeCommand(step.config, context);
          break;
        case 'api_call':
          result = await this.executeApiCall(step.config, context);
          break;
        case 'notification':
          result = await this.executeNotification(step.config, context);
          break;
        case 'condition':
          result = await this.executeCondition(step.config, context);
          break;
        case 'wait':
          result = await this.executeWait(step.config);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // Update step execution
      await db
        .update(runbookStepExecutions)
        .set({
          status: 'completed',
          result: 'success',
          completedAt: endTime,
          duration,
          outputData: result,
        })
        .where(eq(runbookStepExecutions.id, stepRecord.id));

      await this.logExecution(executionId, 'info', `Step completed: ${step.name}`, {
        duration,
        result
      });

      return { result: 'success', output: result };

    } catch (error) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      await db
        .update(runbookStepExecutions)
        .set({
          status: 'failed',
          result: 'failure',
          completedAt: endTime,
          duration,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(runbookStepExecutions.id, stepRecord.id));

      await this.logExecution(executionId, 'error', `Step failed: ${step.name}`, { error });

      return { result: 'failure', error };
    }
  }

  /**
   * Execute a command step
   */
  private async executeCommand(config: any, context: ExecutionContext): Promise<any> {
    const { command, parameters = {} } = config;
    
    // This would integrate with actual command execution systems
    // For now, simulate command execution
    await this.delay(1000); // Simulate execution time
    
    switch (command) {
      case 'backup_payroll_state':
        return { backupId: `backup_${Date.now()}`, status: 'completed' };
      case 'enable_fallback_mode':
        return { mode: 'fallback', system: parameters.system, enabled: true };
      case 'queue_efka_submissions':
        return { queued: 15, mode: parameters.mode };
      default:
        return { command, parameters, executed: true };
    }
  }

  /**
   * Execute an API call step
   */
  private async executeApiCall(config: any, context: ExecutionContext): Promise<any> {
    const { url, method = 'GET', timeout = 30000, data, headers = {} } = config;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PayrollSync-Runbook/1.0',
          ...headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      
      clearTimeout(timeoutId);
      
      const responseData = await response.text();
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        success: response.ok,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Execute a notification step
   */
  private async executeNotification(config: any, context: ExecutionContext): Promise<any> {
    const { channels, template, message, escalation = false } = config;
    
    // This would integrate with actual notification systems
    console.log(`📧 Sending notification via ${channels.join(', ')}: ${message || template}`);
    
    return {
      channels,
      template,
      message,
      sent: true,
      escalation,
      timestamp: new Date(),
    };
  }

  /**
   * Execute a condition step
   */
  private async executeCondition(config: any, context: ExecutionContext): Promise<any> {
    const { condition, trueAction, falseAction } = config;
    
    // Simple condition evaluation - this would be more sophisticated in practice
    const variables = context.variables;
    let result = false;
    
    try {
      // This is a simplified condition evaluator
      result = this.evaluateCondition(condition, variables);
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${error}`);
    }
    
    return {
      condition,
      result,
      action: result ? trueAction : falseAction,
    };
  }

  /**
   * Execute a wait step
   */
  private async executeWait(config: any): Promise<any> {
    const { duration = 5000 } = config; // Default 5 seconds
    
    await this.delay(duration);
    
    return {
      waited: duration,
      completed: true,
    };
  }

  /**
   * Complete a runbook execution
   */
  private async completeExecution(
    executionId: string,
    result: string,
    summary: string
  ): Promise<void> {
    const endTime = new Date();
    
    const [execution] = await db
      .select()
      .from(runbookExecutions)
      .where(eq(runbookExecutions.id, executionId))
      .limit(1);

    if (!execution) return;

    const duration = execution.startedAt 
      ? Math.floor((endTime.getTime() - execution.startedAt.getTime()) / 60000)
      : 0;

    await db
      .update(runbookExecutions)
      .set({
        status: 'completed',
        result,
        resultSummary: summary,
        completedAt: endTime,
        actualDuration: duration,
        updatedAt: endTime,
      })
      .where(eq(runbookExecutions.id, executionId));

    // Remove from active executions
    this.activeExecutions.delete(executionId);

    await this.logExecution(executionId, 'info', `Runbook execution completed: ${result}`, {
      summary,
      duration,
    });

    // Emit completion event
    this.emit('executionCompleted', { executionId, result, summary });

    console.log(`✅ Runbook execution completed: ${result} (${duration} minutes)`);
  }

  /**
   * Check if an alert matches trigger conditions
   */
  async checkTriggerConditions(alertData: any): Promise<string[]> {
    try {
      const matchingRunbooks: string[] = [];
      
      const triggers = await db
        .select({
          trigger: runbookTriggers,
          runbook: runbooks,
        })
        .from(runbookTriggers)
        .leftJoin(runbooks, eq(runbookTriggers.runbookId, runbooks.id))
        .where(
          and(
            eq(runbookTriggers.isActive, true),
            eq(runbooks.isActive, true),
            eq(runbooks.autoTrigger, true)
          )
        );

      for (const { trigger, runbook } of triggers) {
        if (!trigger || !runbook) continue;

        // Check cooldown period
        if (trigger.lastTriggeredAt) {
          const cooldownEnd = new Date(trigger.lastTriggeredAt.getTime() + (trigger.cooldownPeriod || 30) * 60000);
          if (new Date() < cooldownEnd) {
            continue;
          }
        }

        // Check trigger conditions
        if (this.matchesTriggerConditions(alertData, trigger)) {
          matchingRunbooks.push(runbook.id);
          
          // Update trigger tracking
          await db
            .update(runbookTriggers)
            .set({
              lastTriggeredAt: new Date(),
              triggerCount: sql`${runbookTriggers.triggerCount} + 1`,
            })
            .where(eq(runbookTriggers.id, trigger.id));
        }
      }

      return matchingRunbooks;
    } catch (error) {
      console.error('Failed to check trigger conditions:', error);
      return [];
    }
  }

  /**
   * Get runbook execution status and history
   */
  async getExecutionHistory(
    runbookId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any> {
    try {
      const baseQuery = db
        .select({
          execution: runbookExecutions,
          runbook: {
            id: runbooks.id,
            name: runbooks.name,
            category: runbooks.category,
          }
        })
        .from(runbookExecutions)
        .leftJoin(runbooks, eq(runbookExecutions.runbookId, runbooks.id));

      const query = runbookId 
        ? baseQuery.where(eq(runbookExecutions.runbookId, runbookId))
        : baseQuery;

      const executions = await query
        .orderBy(desc(runbookExecutions.startedAt))
        .limit(limit)
        .offset(offset);

      // Get execution statistics
      const [stats] = await db
        .select({
          total: count(),
          successful: count(sql`CASE WHEN ${runbookExecutions.result} = 'success' THEN 1 END`),
          failed: count(sql`CASE WHEN ${runbookExecutions.result} = 'failure' THEN 1 END`),
          avgDuration: avg(runbookExecutions.actualDuration),
        })
        .from(runbookExecutions)
        .where(runbookId ? eq(runbookExecutions.runbookId, runbookId) : undefined);

      return {
        executions,
        statistics: stats,
        pagination: {
          limit,
          offset,
          total: stats?.total || 0,
        },
      };
    } catch (error) {
      console.error('Failed to get execution history:', error);
      return { executions: [], statistics: null };
    }
  }

  // Helper methods

  private async requestApproval(runbook: Runbook, context: ExecutionContext): Promise<any> {
    // Create approval request - this would integrate with approval workflows
    console.log(`📋 Approval required for runbook: ${runbook.name}`);
    throw new Error('Approval workflow not yet implemented');
  }

  private async checkStepDependencies(executionId: string, dependencies: string[]): Promise<boolean> {
    // Check if dependent steps have completed successfully
    const completedSteps = await db
      .select()
      .from(runbookStepExecutions)
      .where(
        and(
          eq(runbookStepExecutions.executionId, executionId),
          eq(runbookStepExecutions.result, 'success')
        )
      );

    const completedStepNames = completedSteps.map(step => step.stepName);
    return dependencies.every(dep => completedStepNames.includes(dep));
  }

  private setupTriggerMonitor(trigger: RunbookTrigger): void {
    // Set up monitoring for this trigger - implementation would depend on trigger type
    console.log(`Setting up trigger monitor for: ${trigger.name}`);
  }

  private matchesTriggerConditions(alertData: any, trigger: RunbookTrigger): boolean {
    // Simplified trigger matching - would be more sophisticated in practice
    const conditions = trigger.conditions as any;
    
    if (trigger.triggerType === 'alert') {
      const patterns = trigger.alertPatterns as string[];
      if (patterns && patterns.length > 0) {
        return patterns.some(pattern => {
          const regex = new RegExp(pattern, 'i');
          return regex.test(alertData.message || alertData.title || '');
        });
      }
    }

    return false;
  }

  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // Simple condition evaluation - in practice this would be more robust
    try {
      // Replace variables in condition
      let evalCondition = condition;
      for (const [key, value] of Object.entries(variables)) {
        evalCondition = evalCondition.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
      }
      
      // Basic comparison operators
      if (evalCondition.includes('==')) {
        const [left, right] = evalCondition.split('==').map(s => s.trim());
        return left === right;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private async logExecution(
    executionId: string,
    level: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const logEntry: InsertRunbookExecutionLog = {
        executionId,
        level,
        message,
        source: 'system',
        data: data || {},
      };

      await db.insert(runbookExecutionLogs).values(logEntry);
    } catch (error) {
      console.error('Failed to log execution:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop all monitoring and clean up
   */
  stopAllMonitoring(): void {
    // Clear all trigger monitors
    for (const [triggerId, timer] of Array.from(this.triggerMonitors.entries())) {
      clearTimeout(timer);
    }
    this.triggerMonitors.clear();

    // Stop active executions gracefully
    for (const [executionId] of Array.from(this.activeExecutions.entries())) {
      this.completeExecution(executionId, 'cancelled', 'Service shutdown');
    }
    this.activeExecutions.clear();
  }
}