/**
 * Disaster Recovery Initializer
 * Coordinates all DR services and provides unified management interface
 */

import { TabletopDRExerciseService } from './TabletopDRExerciseService';
import { AutomatedRestoreTestingService } from './AutomatedRestoreTestingService';
import { RPOandRTOSLAService } from './RPOandRTOSLAService';
import { ObjectStorageWORMService } from './ObjectStorageWORMService';
import type { InsertDRSLA, InsertDRExercise, InsertRestoreTest } from '@shared/schema';

export interface DRSystemStatus {
  tabletopExercises: {
    total: number;
    overdue: number;
    averageScore: number;
    nextScheduled: Date | null;
  };
  restoreTesting: {
    lastTestDate: Date | null;
    successRate: number;
    averageRTO: number;
    nextScheduled: Date | null;
  };
  slaCompliance: {
    totalSLAs: number;
    compliantPercentage: number;
    criticalBreaches: number;
    overallScore: number;
  };
  wormStorage: {
    totalObjects: number;
    integrityVerified: number;
    legalHoldObjects: number;
    expiringObjects: number;
  };
  systemReadiness: 'excellent' | 'good' | 'concerning' | 'critical';
  recommendations: string[];
}

export class DisasterRecoveryInitializer {
  /**
   * Initialize the disaster recovery system with default configurations
   */
  static async initializeDRSystem(): Promise<{
    slas: number;
    exercises: number;
    restoreTests: number;
    wormObjects: number;
  }> {
    console.log('Initializing Disaster Recovery System...');

    let createdSLAs = 0;
    let createdExercises = 0;
    let createdRestoreTests = 0;
    let createdWORMObjects = 0;

    try {
      // 1. Create standard SLA templates
      const slaTemplates = RPOandRTOSLAService.getStandardSLATemplates();
      for (const template of slaTemplates) {
        try {
          await RPOandRTOSLAService.createSLA(template as InsertDRSLA);
          createdSLAs++;
        } catch (error) {
          console.warn(`Failed to create SLA template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 2. Schedule initial tabletop exercises
      const exerciseScenarios = TabletopDRExerciseService.getStandardScenarios();
      for (const scenario of exerciseScenarios.slice(0, 2)) { // Create first 2 scenarios
        try {
          const exercise: InsertDRExercise = {
            exerciseName: scenario.name,
            exerciseType: 'tabletop',
            scenario: scenario.description,
            objectives: [`Test ${scenario.category} resilience`, 'Validate response procedures', 'Identify improvement areas'],
            scope: 'component-specific',
            targetRTO: 120, // 2 hours
            targetRPO: 30,  // 30 minutes
            plannedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            participants: ['admin-user'], // Default admin
          };

          await TabletopDRExerciseService.createExercise(exercise);
          createdExercises++;
        } catch (error) {
          console.warn(`Failed to create DR exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // 3. Schedule automated restore tests
      try {
        const restoreTests = await AutomatedRestoreTestingService.scheduleRegularTests();
        createdRestoreTests = restoreTests.length;
      } catch (error) {
        console.warn(`Failed to schedule restore tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // 4. Initialize WORM storage for audit logs
      const wormPolicyTemplates = [
        {
          retentionYears: 7,
          complianceFramework: 'GREEK_LAW' as const,
          accessRestrictions: {
            allowedRoles: ['auditor', 'compliance'],
            requiresMFA: true,
            requiresApproval: false,
          },
          legalHoldCapable: true,
          auditLevel: 'forensic' as const,
        },
        {
          retentionYears: 3,
          complianceFramework: 'GDPR' as const,
          accessRestrictions: {
            allowedRoles: ['admin', 'hr'],
            requiresMFA: false,
            requiresApproval: true,
          },
          legalHoldCapable: true,
          auditLevel: 'enhanced' as const,
        },
      ];

      for (const [index, policy] of wormPolicyTemplates.entries()) {
        try {
          const mockAuditData = Buffer.from(JSON.stringify({
            type: 'system_initialization',
            timestamp: new Date(),
            event: 'DR system setup',
            policy: policy.complianceFramework,
          }));

          await ObjectStorageWORMService.storeWORMObject(
            `/audit-logs/init-${Date.now()}-${index}`,
            mockAuditData,
            policy,
            'system',
            {
              contentType: 'application/json',
              sourceSystem: 'PayrollSync DR System',
              complianceTag: 'SYSTEM_INIT',
              businessContext: 'Disaster Recovery System Initialization',
            }
          );
          createdWORMObjects++;
        } catch (error) {
          console.warn(`Failed to create WORM object: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`DR System initialized successfully:
        - SLAs created: ${createdSLAs}
        - Exercises scheduled: ${createdExercises} 
        - Restore tests scheduled: ${createdRestoreTests}
        - WORM objects created: ${createdWORMObjects}`);

      return {
        slas: createdSLAs,
        exercises: createdExercises,
        restoreTests: createdRestoreTests,
        wormObjects: createdWORMObjects,
      };

    } catch (error) {
      console.error('Failed to initialize DR system:', error);
      throw new Error(`DR system initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comprehensive disaster recovery system status
   */
  static async getDRSystemStatus(): Promise<DRSystemStatus> {
    try {
      // Get tabletop exercise metrics
      const exerciseReport = await TabletopDRExerciseService.generateReadinessReport();
      const overdueExercises = await TabletopDRExerciseService.getOverdueExercises();
      
      // Get restore testing metrics
      const restoreReport = await AutomatedRestoreTestingService.generateComplianceReport('monthly');
      
      // Get SLA compliance metrics
      const slaDashboard = await RPOandRTOSLAService.generateSLADashboard();
      
      // Get WORM storage metrics
      const wormReport = await ObjectStorageWORMService.generateComplianceReport();

      // Calculate system readiness
      const systemReadiness = this.calculateSystemReadiness({
        exerciseScore: exerciseReport.averageScore,
        restoreSuccessRate: restoreReport.totalTests > 0 ? (restoreReport.passedTests / restoreReport.totalTests) * 100 : 100,
        slaCompliance: slaDashboard.overallComplianceScore,
        wormIntegrity: wormReport.totalObjects > 0 ? (wormReport.integrityVerified / wormReport.totalObjects) * 100 : 100,
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        overdueExercises: overdueExercises.length,
        restoreFailures: restoreReport.failedTests,
        slaBreaches: slaDashboard.breachedSLAs,
        wormIssues: wormReport.integrityFailed + wormReport.accessViolations,
      });

      return {
        tabletopExercises: {
          total: exerciseReport.totalExercises,
          overdue: overdueExercises.length,
          averageScore: exerciseReport.averageScore,
          nextScheduled: exerciseReport.upcomingExercises[0]?.plannedDate ? new Date(exerciseReport.upcomingExercises[0].plannedDate) : null,
        },
        restoreTesting: {
          lastTestDate: restoreReport.totalTests > 0 ? restoreReport.periodEnd : null,
          successRate: restoreReport.totalTests > 0 ? Math.round((restoreReport.passedTests / restoreReport.totalTests) * 100) : 100,
          averageRTO: restoreReport.averageRTO,
          nextScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        },
        slaCompliance: {
          totalSLAs: slaDashboard.totalSLAs,
          compliantPercentage: slaDashboard.totalSLAs > 0 ? Math.round((slaDashboard.compliantSLAs / slaDashboard.totalSLAs) * 100) : 100,
          criticalBreaches: slaDashboard.breachedSLAs,
          overallScore: slaDashboard.overallComplianceScore,
        },
        wormStorage: {
          totalObjects: wormReport.totalObjects,
          integrityVerified: wormReport.integrityVerified,
          legalHoldObjects: wormReport.legalHoldObjects,
          expiringObjects: wormReport.upcomingExpirations.length,
        },
        systemReadiness,
        recommendations,
      };

    } catch (error) {
      console.error('Failed to get DR system status:', error);
      
      return {
        tabletopExercises: { total: 0, overdue: 0, averageScore: 0, nextScheduled: null },
        restoreTesting: { lastTestDate: null, successRate: 0, averageRTO: 0, nextScheduled: null },
        slaCompliance: { totalSLAs: 0, compliantPercentage: 0, criticalBreaches: 0, overallScore: 0 },
        wormStorage: { totalObjects: 0, integrityVerified: 0, legalHoldObjects: 0, expiringObjects: 0 },
        systemReadiness: 'critical',
        recommendations: ['System status unavailable - investigate DR services'],
      };
    }
  }

  /**
   * Run all automated DR maintenance tasks
   */
  static async runMaintenanceTasks(): Promise<{
    integrityChecks: { checked: number; verified: number; issues: number };
    exerciseReminders: number;
    slaMonitoring: { monitored: number; breaches: number };
    cleanupActions: number;
  }> {
    console.log('Running DR system maintenance tasks...');

    // Run WORM integrity checks
    const integrityResults = await ObjectStorageWORMService.runScheduledIntegrityCheck();

    // Check for overdue exercises and send reminders
    const overdueExercises = await TabletopDRExerciseService.getOverdueExercises();
    
    // Monitor SLA compliance
    const slaCompliance = await RPOandRTOSLAService.generateSLADashboard();

    // Cleanup expired objects (simulated)
    let cleanupActions = 0;
    const expiredObjects = await ObjectStorageWORMService.listWORMObjects({
      status: 'active',
      limit: 100,
    });

    for (const obj of expiredObjects) {
      const eligibility = await ObjectStorageWORMService.checkDeletionEligibility(obj.id);
      if (eligibility.canDelete) {
        cleanupActions++;
        // In production, perform actual cleanup
        console.log(`Object ${obj.id} eligible for cleanup`);
      }
    }

    return {
      integrityChecks: {
        checked: integrityResults.checkedObjects,
        verified: integrityResults.verifiedObjects,
        issues: integrityResults.corruptedObjects,
      },
      exerciseReminders: overdueExercises.length,
      slaMonitoring: {
        monitored: slaCompliance.totalSLAs,
        breaches: slaCompliance.breachedSLAs,
      },
      cleanupActions,
    };
  }

  /**
   * Calculate overall system readiness based on all DR metrics
   */
  private static calculateSystemReadiness(metrics: {
    exerciseScore: number;
    restoreSuccessRate: number;
    slaCompliance: number;
    wormIntegrity: number;
  }): 'excellent' | 'good' | 'concerning' | 'critical' {
    const overallScore = (
      metrics.exerciseScore + 
      metrics.restoreSuccessRate + 
      metrics.slaCompliance + 
      metrics.wormIntegrity
    ) / 4;

    if (overallScore >= 95) return 'excellent';
    if (overallScore >= 85) return 'good';
    if (overallScore >= 70) return 'concerning';
    return 'critical';
  }

  /**
   * Generate system recommendations based on current state
   */
  private static generateRecommendations(issues: {
    overdueExercises: number;
    restoreFailures: number;
    slaBreaches: number;
    wormIssues: number;
  }): string[] {
    const recommendations: string[] = [];

    if (issues.overdueExercises > 0) {
      recommendations.push(`Schedule ${issues.overdueExercises} overdue disaster recovery exercises`);
    }

    if (issues.restoreFailures > 0) {
      recommendations.push(`Investigate and resolve ${issues.restoreFailures} restore test failures`);
    }

    if (issues.slaBreaches > 0) {
      recommendations.push(`Address ${issues.slaBreaches} SLA compliance breaches`);
    }

    if (issues.wormIssues > 0) {
      recommendations.push(`Review ${issues.wormIssues} WORM storage integrity issues`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All disaster recovery systems operating within acceptable parameters');
    }

    return recommendations;
  }

  /**
   * Generate executive summary report for management
   */
  static async generateExecutiveSummary(): Promise<string> {
    const status = await this.getDRSystemStatus();
    const readinessEmoji = {
      excellent: '🟢',
      good: '🟡', 
      concerning: '🟠',
      critical: '🔴',
    };

    return `
DISASTER RECOVERY EXECUTIVE SUMMARY
==================================

OVERALL SYSTEM READINESS: ${readinessEmoji[status.systemReadiness]} ${status.systemReadiness.toUpperCase()}

KEY METRICS:
- Tabletop Exercises: ${status.tabletopExercises.total} total, ${status.tabletopExercises.averageScore}% avg score
- Restore Testing: ${status.restoreTesting.successRate}% success rate, ${status.restoreTesting.averageRTO}min avg RTO
- SLA Compliance: ${status.slaCompliance.compliantPercentage}% compliant, ${status.slaCompliance.overallScore}/100 score
- Data Integrity: ${status.wormStorage.integrityVerified}/${status.wormStorage.totalObjects} objects verified

CRITICAL ISSUES:
${status.tabletopExercises.overdue > 0 ? `- ${status.tabletopExercises.overdue} overdue DR exercises` : ''}
${status.slaCompliance.criticalBreaches > 0 ? `- ${status.slaCompliance.criticalBreaches} SLA breaches` : ''}
${status.wormStorage.expiringObjects > 0 ? `- ${status.wormStorage.expiringObjects} objects expiring soon` : ''}

IMMEDIATE ACTIONS REQUIRED:
${status.recommendations.map(rec => `- ${rec}`).join('\n')}

NEXT SCHEDULED ACTIVITIES:
- Next DR Exercise: ${status.tabletopExercises.nextScheduled?.toLocaleDateString() || 'Not scheduled'}
- Next Restore Test: ${status.restoreTesting.nextScheduled?.toLocaleDateString() || 'Not scheduled'}

Generated: ${new Date().toISOString()}
Business Continuity Status: ${status.systemReadiness === 'excellent' || status.systemReadiness === 'good' ? 'READY' : 'REQUIRES ATTENTION'}
`;
  }
}