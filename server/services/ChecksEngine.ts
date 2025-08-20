/**
 * Checks Engine - Automated "Control-as-Code" implementation
 * Scheduled & event-driven compliance checks for cloud, identity, endpoints, and code
 */

import { db } from '../db';
import { 
  automatedChecks, 
  checkResults, 
  integrationConfigs,
  controlsFramework,
  type AutomatedCheck,
  type InsertCheckResult
} from '@shared/grcSchema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { createHash } from 'crypto';

export interface CheckExecution {
  checkId: string;
  tenantId: string;
  runId: string;
  startTime: Date;
  endTime?: Date;
  result: 'Pass' | 'Fail' | 'Warning' | 'Error';
  score: number;
  findings: any[];
  evidence: any;
  error?: string;
}

export class ChecksEngine {
  private static runningChecks = new Map<string, CheckExecution>();

  /**
   * Initialize default automated checks for common controls
   */
  static async initializeDefaultChecks(): Promise<void> {
    const defaultChecks = [
      // AWS Checks
      {
        controlId: 'soc2_cc6_1',
        checkName: 'AWS IAM Root Account MFA',
        checkType: 'AWS',
        checkScript: JSON.stringify({
          service: 'iam',
          action: 'getAccountSummary',
          assertion: 'AccountMFAEnabled === 1',
          description: 'Verify root account has MFA enabled'
        }),
        schedule: 'daily'
      },
      {
        controlId: 'soc2_cc6_1',
        checkName: 'AWS IAM Password Policy',
        checkType: 'AWS',
        checkScript: JSON.stringify({
          service: 'iam',
          action: 'getAccountPasswordPolicy',
          assertion: 'MinimumPasswordLength >= 12 && RequireNumbers && RequireSymbols',
          description: 'Verify strong password policy is enforced'
        }),
        schedule: 'weekly'
      },
      {
        controlId: 'iso27001_a_8_1',
        checkName: 'AWS Resource Tagging Compliance',
        checkType: 'AWS',
        checkScript: JSON.stringify({
          service: 'resourcegroupstaggingapi',
          action: 'getResources',
          assertion: 'all_resources_have_required_tags(["Environment", "Owner", "Project"])',
          description: 'Verify all AWS resources have required tags'
        }),
        schedule: 'daily'
      },

      // Azure Checks
      {
        controlId: 'soc2_cc6_2',
        checkName: 'Azure AD Conditional Access',
        checkType: 'Azure',
        checkScript: JSON.stringify({
          service: 'graph',
          endpoint: '/policies/conditionalAccessPolicies',
          assertion: 'policies.length > 0 && policies.some(p => p.state === "enabled")',
          description: 'Verify conditional access policies are configured and enabled'
        }),
        schedule: 'daily'
      },

      // GitHub Checks
      {
        controlId: 'soc2_cc7_1',
        checkName: 'GitHub Branch Protection',
        checkType: 'GitHub',
        checkScript: JSON.stringify({
          endpoint: '/repos/{org}/{repo}/branches/{branch}/protection',
          assertion: 'required_status_checks.strict && required_pull_request_reviews.required_approving_review_count >= 1',
          description: 'Verify branch protection rules are enforced'
        }),
        schedule: 'weekly'
      },
      {
        controlId: 'soc2_cc7_1',
        checkName: 'GitHub Secret Scanning',
        checkType: 'GitHub',
        checkScript: JSON.stringify({
          endpoint: '/repos/{org}/{repo}/secret-scanning/alerts',
          assertion: 'alerts.filter(a => a.state === "open").length === 0',
          description: 'Verify no open secret scanning alerts'
        }),
        schedule: 'daily'
      },

      // Okta/Identity Checks
      {
        controlId: 'soc2_cc6_2',
        checkName: 'Okta MFA Enforcement',
        checkType: 'Okta',
        checkScript: JSON.stringify({
          endpoint: '/api/v1/policies?type=MFA_ENROLL',
          assertion: 'policies.some(p => p.status === "ACTIVE" && p.conditions.people.groups.include.length > 0)',
          description: 'Verify MFA is enforced for all users'
        }),
        schedule: 'daily'
      },

      // Code Quality Checks
      {
        controlId: 'iso27001_a_8_3',
        checkName: 'Code Vulnerability Scan',
        checkType: 'Code',
        checkScript: JSON.stringify({
          tool: 'snyk',
          command: 'snyk test --json',
          assertion: 'vulnerabilities.filter(v => v.severity === "high" || v.severity === "critical").length === 0',
          description: 'Verify no high/critical vulnerabilities in dependencies'
        }),
        schedule: 'daily'
      },

      // Endpoint Security Checks
      {
        controlId: 'soc2_cc6_1',
        checkName: 'Endpoint Encryption Status',
        checkType: 'Endpoint',
        checkScript: JSON.stringify({
          tool: 'mdm',
          query: 'device_encryption_status',
          assertion: 'encrypted_devices_percentage >= 95',
          description: 'Verify at least 95% of endpoints have disk encryption enabled'
        }),
        schedule: 'weekly'
      }
    ];

    for (const check of defaultChecks) {
      // Only create if control exists
      const controlExists = await db
        .select({ id: controlsFramework.id })
        .from(controlsFramework)
        .where(eq(controlsFramework.id, check.controlId))
        .limit(1);

      if (controlExists.length > 0) {
        await db.insert(automatedChecks)
          .values({
            ...check,
            tenantId: 'default', // Will be copied per tenant during setup
          })
          .onConflictDoNothing();
      }
    }

    console.log(`🔍 Initialized ${defaultChecks.length} default automated checks`);
  }

  /**
   * Schedule and run automated checks
   */
  static async runScheduledChecks(): Promise<void> {
    const now = new Date();
    
    // Get all checks that are due to run
    const dueChecks = await db
      .select()
      .from(automatedChecks)
      .where(and(
        eq(automatedChecks.status, 'Active'),
        lt(automatedChecks.nextRunAt, now)
      ));

    console.log(`🔍 Found ${dueChecks.length} checks due for execution`);

    for (const check of dueChecks) {
      await this.executeCheck(check);
    }
  }

  /**
   * Execute a single automated check
   */
  static async executeCheck(check: AutomatedCheck): Promise<CheckExecution> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const execution: CheckExecution = {
      checkId: check.id,
      tenantId: check.tenantId,
      runId,
      startTime: new Date(),
      result: 'Error',
      score: 0,
      findings: [],
      evidence: {},
    };

    this.runningChecks.set(runId, execution);

    try {
      console.log(`🔍 Executing check: ${check.checkName} (${check.checkType})`);

      let checkResult;
      switch (check.checkType) {
        case 'AWS':
          checkResult = await this.executeAWSCheck(check);
          break;
        case 'Azure':
          checkResult = await this.executeAzureCheck(check);
          break;
        case 'GCP':
          checkResult = await this.executeGCPCheck(check);
          break;
        case 'GitHub':
          checkResult = await this.executeGitHubCheck(check);
          break;
        case 'Okta':
          checkResult = await this.executeOktaCheck(check);
          break;
        case 'Code':
          checkResult = await this.executeCodeCheck(check);
          break;
        case 'Endpoint':
          checkResult = await this.executeEndpointCheck(check);
          break;
        default:
          throw new Error(`Unsupported check type: ${check.checkType}`);
      }

      execution.result = checkResult.result;
      execution.score = checkResult.score;
      execution.findings = checkResult.findings;
      execution.evidence = checkResult.evidence;
      execution.endTime = new Date();

    } catch (error) {
      execution.result = 'Error';
      execution.error = error.message;
      execution.endTime = new Date();
      console.error(`❌ Check execution failed: ${check.checkName}`, error);
    }

    // Store result in database
    await this.storeCheckResult(execution);

    // Update next run time
    await this.scheduleNextRun(check);

    this.runningChecks.delete(runId);
    return execution;
  }

  /**
   * Execute AWS-specific checks
   */
  private static async executeAWSCheck(check: AutomatedCheck): Promise<{
    result: 'Pass' | 'Fail' | 'Warning';
    score: number;
    findings: any[];
    evidence: any;
  }> {
    // Get AWS integration config
    const awsConfig = await this.getIntegrationConfig(check.tenantId, 'AWS');
    if (!awsConfig) {
      throw new Error('AWS integration not configured');
    }

    const checkScript = JSON.parse(check.checkScript);
    
    // Mock AWS check execution (in production, would use AWS SDK)
    const mockResults = {
      'AWS IAM Root Account MFA': { pass: true, mfaEnabled: true },
      'AWS IAM Password Policy': { pass: true, policyCompliant: true },
      'AWS Resource Tagging Compliance': { pass: false, untaggedResources: 5 },
    };

    const mockResult = mockResults[check.checkName] || { pass: false, error: 'Unknown check' };
    
    return {
      result: mockResult.pass ? 'Pass' : 'Fail',
      score: mockResult.pass ? 100 : 0,
      findings: mockResult.pass ? [] : [{ 
        type: 'violation', 
        description: `${check.checkName} failed`,
        details: mockResult 
      }],
      evidence: {
        service: checkScript.service,
        timestamp: new Date().toISOString(),
        rawResponse: mockResult,
      }
    };
  }

  /**
   * Execute Azure-specific checks
   */
  private static async executeAzureCheck(check: AutomatedCheck): Promise<any> {
    const azureConfig = await this.getIntegrationConfig(check.tenantId, 'Azure');
    if (!azureConfig) {
      throw new Error('Azure integration not configured');
    }

    // Mock Azure check
    return {
      result: 'Pass',
      score: 85,
      findings: [],
      evidence: { service: 'Azure', timestamp: new Date().toISOString() }
    };
  }

  /**
   * Execute GCP-specific checks
   */
  private static async executeGCPCheck(check: AutomatedCheck): Promise<any> {
    const gcpConfig = await this.getIntegrationConfig(check.tenantId, 'GCP');
    if (!gcpConfig) {
      throw new Error('GCP integration not configured');
    }

    // Mock GCP check
    return {
      result: 'Pass',
      score: 90,
      findings: [],
      evidence: { service: 'GCP', timestamp: new Date().toISOString() }
    };
  }

  /**
   * Execute GitHub-specific checks
   */
  private static async executeGitHubCheck(check: AutomatedCheck): Promise<any> {
    // Mock GitHub check execution
    const mockResults = {
      'GitHub Branch Protection': { pass: true, protectionEnabled: true },
      'GitHub Secret Scanning': { pass: false, openAlerts: 3 },
    };

    const mockResult = mockResults[check.checkName] || { pass: true };
    
    return {
      result: mockResult.pass ? 'Pass' : 'Fail',
      score: mockResult.pass ? 100 : 60,
      findings: mockResult.pass ? [] : [{ 
        type: 'violation', 
        description: `${check.checkName} has issues`,
        details: mockResult 
      }],
      evidence: { service: 'GitHub', timestamp: new Date().toISOString() }
    };
  }

  /**
   * Execute identity provider checks (Okta, Azure AD, Google)
   */
  private static async executeOktaCheck(check: AutomatedCheck): Promise<any> {
    // Mock Okta check
    return {
      result: 'Pass',
      score: 95,
      findings: [],
      evidence: { service: 'Okta', timestamp: new Date().toISOString() }
    };
  }

  /**
   * Execute code quality/security checks
   */
  private static async executeCodeCheck(check: AutomatedCheck): Promise<any> {
    // Mock code vulnerability scan
    const mockVulns = Math.floor(Math.random() * 5);
    
    return {
      result: mockVulns === 0 ? 'Pass' : 'Fail',
      score: mockVulns === 0 ? 100 : Math.max(0, 100 - (mockVulns * 20)),
      findings: Array(mockVulns).fill(0).map((_, i) => ({
        type: 'vulnerability',
        severity: ['medium', 'high'][Math.floor(Math.random() * 2)],
        package: `package-${i}`,
        version: '1.0.0'
      })),
      evidence: { tool: 'snyk', vulnerabilities: mockVulns, timestamp: new Date().toISOString() }
    };
  }

  /**
   * Execute endpoint security checks
   */
  private static async executeEndpointCheck(check: AutomatedCheck): Promise<any> {
    // Mock endpoint check
    const encryptedPercentage = 85 + Math.floor(Math.random() * 15); // 85-99%
    
    return {
      result: encryptedPercentage >= 95 ? 'Pass' : 'Warning',
      score: encryptedPercentage,
      findings: encryptedPercentage < 95 ? [{ 
        type: 'compliance', 
        description: `Only ${encryptedPercentage}% of endpoints encrypted` 
      }] : [],
      evidence: { 
        tool: 'MDM', 
        encryptedDevices: encryptedPercentage, 
        timestamp: new Date().toISOString() 
      }
    };
  }

  /**
   * Store check result in database
   */
  private static async storeCheckResult(execution: CheckExecution): Promise<void> {
    const executionTime = execution.endTime 
      ? execution.endTime.getTime() - execution.startTime.getTime()
      : 0;

    await db.insert(checkResults).values({
      tenantId: execution.tenantId,
      checkId: execution.checkId,
      runId: execution.runId,
      result: execution.result,
      score: execution.score,
      findings: execution.findings,
      evidence: execution.evidence,
      executionTime,
      runAt: execution.startTime,
    } as InsertCheckResult);

    console.log(`✅ Stored check result: ${execution.checkId} - ${execution.result} (${execution.score}%)`);
  }

  /**
   * Schedule next check run based on schedule
   */
  private static async scheduleNextRun(check: AutomatedCheck): Promise<void> {
    let nextRun = new Date();
    
    switch (check.schedule) {
      case 'hourly':
        nextRun.setHours(nextRun.getHours() + 1);
        break;
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      default:
        nextRun.setDate(nextRun.getDate() + 1); // Default daily
    }

    await db
      .update(automatedChecks)
      .set({ 
        lastRunAt: new Date(),
        nextRunAt: nextRun,
        status: 'Active'
      })
      .where(eq(automatedChecks.id, check.id));
  }

  /**
   * Get integration configuration for tenant
   */
  private static async getIntegrationConfig(tenantId: string, integrationType: string) {
    const config = await db
      .select()
      .from(integrationConfigs)
      .where(and(
        eq(integrationConfigs.tenantId, tenantId),
        eq(integrationConfigs.integrationType, integrationType),
        eq(integrationConfigs.status, 'Active')
      ))
      .limit(1);

    return config[0] || null;
  }

  /**
   * Get check execution status
   */
  static getRunningChecks(): Map<string, CheckExecution> {
    return this.runningChecks;
  }

  /**
   * Get check results for tenant and control
   */
  static async getCheckResults(tenantId: string, controlId?: string): Promise<any[]> {
    let query = db
      .select({
        result: checkResults,
        check: automatedChecks,
        control: controlsFramework,
      })
      .from(checkResults)
      .innerJoin(automatedChecks, eq(checkResults.checkId, automatedChecks.id))
      .innerJoin(controlsFramework, eq(automatedChecks.controlId, controlsFramework.id))
      .where(eq(checkResults.tenantId, tenantId));

    if (controlId) {
      query = query.where(eq(automatedChecks.controlId, controlId));
    }

    const results = await query.orderBy(sql`${checkResults.runAt} DESC`);
    
    return results.map(row => ({
      ...row.result,
      checkName: row.check.checkName,
      checkType: row.check.checkType,
      controlTitle: row.control.title,
      controlId: row.control.id,
    }));
  }
}