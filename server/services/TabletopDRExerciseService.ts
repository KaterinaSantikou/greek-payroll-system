/**
 * Tabletop Disaster Recovery Exercise Service
 * Manages formal DR testing procedures and documentation
 */

import { db } from '../db';
import { drExercises, users, type DRExercise, type InsertDRExercise } from '@shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import crypto from 'crypto';

export interface DRExerciseScenario {
  scenarioId: string;
  name: string;
  description: string;
  category: 'infrastructure' | 'application' | 'data' | 'communication' | 'human_factors';
  complexity: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // minutes
  prerequisites: string[];
  resources: string[];
}

export interface DRExerciseFinding {
  findingId: string;
  category: 'process' | 'technology' | 'people' | 'documentation' | 'communication';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  assignedTo?: string;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
}

export interface DRExerciseActionItem {
  actionId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dependencies?: string[];
  estimatedEffort: number; // hours
}

export class TabletopDRExerciseService {
  /**
   * Create a new DR exercise plan
   */
  static async createExercise(exercise: InsertDRExercise): Promise<DRExercise> {
    // Validate participants exist
    if (exercise.participants && Array.isArray(exercise.participants)) {
      const userIds = exercise.participants as string[];
      const existingUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userIds[0])); // Check at least one exists
      
      if (existingUsers.length === 0 && userIds.length > 0) {
        throw new Error('Invalid participant user IDs provided');
      }
    }

    // Set next exercise date based on frequency (quarterly by default)
    const nextExerciseDate = new Date(exercise.plannedDate);
    nextExerciseDate.setMonth(nextExerciseDate.getMonth() + 3);

    const [newExercise] = await db
      .insert(drExercises)
      .values({
        ...exercise,
        nextExerciseDate,
      })
      .returning();

    return newExercise;
  }

  /**
   * Get predefined disaster scenarios for exercises
   */
  static getStandardScenarios(): DRExerciseScenario[] {
    return [
      {
        scenarioId: 'dr-001',
        name: 'Primary Datacenter Outage',
        description: 'Complete loss of primary datacenter due to power failure affecting all critical systems including payroll processing, employee data, and compliance reporting.',
        category: 'infrastructure',
        complexity: 'high',
        estimatedDuration: 240,
        prerequisites: ['Backup datacenter configured', 'Failover procedures documented'],
        resources: ['Network team', 'Database administrators', 'Application teams']
      },
      {
        scenarioId: 'dr-002',
        name: 'Ransomware Attack on HR Systems',
        description: 'Sophisticated ransomware attack encrypts all HR and payroll systems, requiring complete restoration from backups while maintaining Greek regulatory compliance.',
        category: 'application',
        complexity: 'critical',
        estimatedDuration: 480,
        prerequisites: ['Security incident response plan', 'Clean backup verification'],
        resources: ['Security team', 'Legal team', 'HR leadership', 'IT recovery team']
      },
      {
        scenarioId: 'dr-003',
        name: 'Database Corruption in Payroll System',
        description: 'Critical database corruption discovered during month-end payroll processing, requiring restoration with minimal data loss to meet Greek payroll deadlines.',
        category: 'data',
        complexity: 'high',
        estimatedDuration: 180,
        prerequisites: ['Database backup verification', 'Recovery point analysis'],
        resources: ['Database team', 'Payroll specialists', 'Quality assurance']
      },
      {
        scenarioId: 'dr-004',
        name: 'Key Personnel Unavailability',
        description: 'Critical system administrators and payroll specialists unavailable during peak processing period, testing knowledge transfer and cross-training effectiveness.',
        category: 'human_factors',
        complexity: 'medium',
        estimatedDuration: 120,
        prerequisites: ['Cross-training documentation', 'Emergency contact lists'],
        resources: ['Backup personnel', 'Management team', 'External consultants']
      },
      {
        scenarioId: 'dr-005',
        name: 'Third-Party Service Provider Outage',
        description: 'Critical third-party services (banking, ERGANI, e-EFKA) become unavailable, affecting payroll processing and compliance submissions.',
        category: 'communication',
        complexity: 'medium',
        estimatedDuration: 90,
        prerequisites: ['Alternative service provider contacts', 'Manual process procedures'],
        resources: ['Business relationship managers', 'Compliance team', 'Operations team']
      }
    ];
  }

  /**
   * Start an exercise and transition to in_progress status
   */
  static async startExercise(exerciseId: string, userId: string): Promise<DRExercise> {
    const [updatedExercise] = await db
      .update(drExercises)
      .set({
        status: 'in_progress',
        actualStartTime: new Date(),
        facilitatorId: userId,
        updatedAt: new Date(),
      })
      .where(eq(drExercises.id, exerciseId))
      .returning();

    if (!updatedExercise) {
      throw new Error('Exercise not found');
    }

    return updatedExercise;
  }

  /**
   * Complete an exercise with findings and action items
   */
  static async completeExercise(
    exerciseId: string,
    completion: {
      findings: DRExerciseFinding[];
      actionItems: DRExerciseActionItem[];
      overallScore: number;
      lessonsLearned: string;
    }
  ): Promise<DRExercise> {
    const [updatedExercise] = await db
      .update(drExercises)
      .set({
        status: 'completed',
        actualEndTime: new Date(),
        findings: completion.findings,
        actionItems: completion.actionItems,
        overallScore: completion.overallScore,
        lessonsLearned: completion.lessonsLearned,
        updatedAt: new Date(),
      })
      .where(eq(drExercises.id, exerciseId))
      .returning();

    if (!updatedExercise) {
      throw new Error('Exercise not found');
    }

    return updatedExercise;
  }

  /**
   * Get exercise by ID with full details
   */
  static async getExercise(exerciseId: string): Promise<DRExercise | null> {
    const [exercise] = await db
      .select()
      .from(drExercises)
      .where(eq(drExercises.id, exerciseId));

    return exercise || null;
  }

  /**
   * List exercises with filtering options
   */
  static async listExercises(filters: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    facilitatorId?: string;
    limit?: number;
  } = {}): Promise<DRExercise[]> {
    let query = db.select().from(drExercises);

    // Apply filters
    const conditions = [];
    
    if (filters.status) {
      conditions.push(eq(drExercises.status, filters.status));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(drExercises.plannedDate, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      conditions.push(lte(drExercises.plannedDate, filters.dateTo));
    }
    
    if (filters.facilitatorId) {
      conditions.push(eq(drExercises.facilitatorId, filters.facilitatorId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(drExercises.plannedDate));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  }

  /**
   * Get exercises due for scheduling
   */
  static async getOverdueExercises(): Promise<DRExercise[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return db
      .select()
      .from(drExercises)
      .where(
        and(
          lte(drExercises.nextExerciseDate, new Date()),
          eq(drExercises.status, 'completed')
        )
      );
  }

  /**
   * Generate exercise readiness report
   */
  static async generateReadinessReport(): Promise<{
    totalExercises: number;
    completedThisYear: number;
    averageScore: number;
    openFindings: number;
    overdueActionItems: number;
    upcomingExercises: DRExercise[];
    criticalFindings: DRExerciseFinding[];
  }> {
    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    yearStart.setHours(0, 0, 0, 0);

    const exercises = await db
      .select()
      .from(drExercises)
      .where(gte(drExercises.createdAt, yearStart));

    const completedExercises = exercises.filter(ex => ex.status === 'completed');

    // Calculate metrics
    const totalExercises = exercises.length;
    const completedThisYear = completedExercises.length;
    const averageScore = completedExercises.length > 0
      ? completedExercises.reduce((sum, ex) => sum + (ex.overallScore || 0), 0) / completedExercises.length
      : 0;

    // Count open findings and overdue action items
    let openFindings = 0;
    let overdueActionItems = 0;
    const criticalFindings: DRExerciseFinding[] = [];

    completedExercises.forEach(exercise => {
      if (exercise.findings && Array.isArray(exercise.findings)) {
        const findings = exercise.findings as DRExerciseFinding[];
        findings.forEach(finding => {
          if (finding.status === 'open' || finding.status === 'in_progress') {
            openFindings++;
            if (finding.severity === 'critical') {
              criticalFindings.push(finding);
            }
          }
        });
      }

      if (exercise.actionItems && Array.isArray(exercise.actionItems)) {
        const actionItems = exercise.actionItems as DRExerciseActionItem[];
        actionItems.forEach(item => {
          if (item.status !== 'completed' && new Date(item.dueDate) < new Date()) {
            overdueActionItems++;
          }
        });
      }
    });

    // Get upcoming exercises
    const upcomingExercises = exercises
      .filter(ex => ex.status === 'planned' && new Date(ex.plannedDate) >= new Date())
      .slice(0, 5);

    return {
      totalExercises,
      completedThisYear,
      averageScore: Math.round(averageScore),
      openFindings,
      overdueActionItems,
      upcomingExercises,
      criticalFindings,
    };
  }

  /**
   * Schedule next exercise based on findings and compliance requirements
   */
  static async scheduleNextExercise(
    exerciseId: string,
    schedulingOptions: {
      recommendedDate?: Date;
      acceleratedSchedule?: boolean;
      focusAreas?: string[];
    } = {}
  ): Promise<DRExercise> {
    const exercise = await this.getExercise(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    // Determine next exercise date
    let nextDate = schedulingOptions.recommendedDate || new Date(exercise.nextExerciseDate || new Date());
    
    // Accelerate if critical findings were discovered
    if (schedulingOptions.acceleratedSchedule) {
      nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1); // Schedule in 1 month instead of 3
    }

    // Create next exercise based on learnings
    const nextExercise: InsertDRExercise = {
      exerciseName: `${exercise.exerciseName} - Follow-up`,
      exerciseType: exercise.exerciseType,
      scenario: exercise.scenario,
      objectives: exercise.objectives,
      scope: exercise.scope,
      targetRTO: exercise.targetRTO,
      targetRPO: exercise.targetRPO,
      plannedDate: nextDate,
      participants: exercise.participants,
    };

    return this.createExercise(nextExercise);
  }

  /**
   * Export exercise results for compliance reporting
   */
  static async exportExerciseResults(exerciseId: string): Promise<{
    exerciseDetails: DRExercise;
    complianceReport: string;
    executiveSummary: string;
  }> {
    const exercise = await this.getExercise(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    const complianceReport = this.generateComplianceReport(exercise);
    const executiveSummary = this.generateExecutiveSummary(exercise);

    return {
      exerciseDetails: exercise,
      complianceReport,
      executiveSummary,
    };
  }

  /**
   * Generate compliance report for regulatory requirements
   */
  private static generateComplianceReport(exercise: DRExercise): string {
    const duration = exercise.actualEndTime && exercise.actualStartTime
      ? Math.round((new Date(exercise.actualEndTime).getTime() - new Date(exercise.actualStartTime).getTime()) / (1000 * 60))
      : 0;

    return `
DISASTER RECOVERY EXERCISE COMPLIANCE REPORT
==========================================

Exercise ID: ${exercise.id}
Exercise Name: ${exercise.exerciseName}
Exercise Type: ${exercise.exerciseType}
Date: ${exercise.plannedDate}
Duration: ${duration} minutes

OBJECTIVES TESTED:
${Array.isArray(exercise.objectives) ? exercise.objectives.map((obj: any) => `- ${obj}`).join('\n') : 'N/A'}

RTO TARGET: ${exercise.targetRTO} minutes
RPO TARGET: ${exercise.targetRPO} minutes

SCOPE: ${exercise.scope}

RESULTS:
Overall Score: ${exercise.overallScore || 'N/A'}/100

FINDINGS SUMMARY:
${exercise.findings && Array.isArray(exercise.findings) 
  ? (exercise.findings as DRExerciseFinding[]).map(f => `- ${f.severity.toUpperCase()}: ${f.description}`).join('\n')
  : 'No findings recorded'}

ACTION ITEMS:
${exercise.actionItems && Array.isArray(exercise.actionItems)
  ? (exercise.actionItems as DRExerciseActionItem[]).map(a => `- ${a.title} (Due: ${a.dueDate})`).join('\n')
  : 'No action items'}

LESSONS LEARNED:
${exercise.lessonsLearned || 'No lessons learned documented'}

Compliance Status: ${exercise.overallScore && exercise.overallScore >= 80 ? 'COMPLIANT' : 'REQUIRES IMPROVEMENT'}
Next Exercise Date: ${exercise.nextExerciseDate}

Generated: ${new Date().toISOString()}
`;
  }

  /**
   * Generate executive summary for management reporting
   */
  private static generateExecutiveSummary(exercise: DRExercise): string {
    const criticalFindings = exercise.findings && Array.isArray(exercise.findings)
      ? (exercise.findings as DRExerciseFinding[]).filter(f => f.severity === 'critical').length
      : 0;

    const highPriorityActions = exercise.actionItems && Array.isArray(exercise.actionItems)
      ? (exercise.actionItems as DRExerciseActionItem[]).filter(a => a.priority === 'critical' || a.priority === 'high').length
      : 0;

    return `
EXECUTIVE SUMMARY - DR EXERCISE: ${exercise.exerciseName}
=====================================================

OVERALL ASSESSMENT: ${exercise.overallScore && exercise.overallScore >= 80 ? 'SATISFACTORY' : 'NEEDS IMPROVEMENT'}
Score: ${exercise.overallScore || 'N/A'}/100

KEY METRICS:
- Recovery Time Objective (RTO): ${exercise.targetRTO} minutes
- Recovery Point Objective (RPO): ${exercise.targetRPO} minutes
- Exercise Type: ${exercise.exerciseType}
- Participants: ${Array.isArray(exercise.participants) ? exercise.participants.length : 0}

CRITICAL ISSUES IDENTIFIED: ${criticalFindings}
HIGH PRIORITY ACTIONS REQUIRED: ${highPriorityActions}

BUSINESS IMPACT:
${exercise.overallScore && exercise.overallScore < 80 
  ? 'Current DR capabilities may not meet business continuity requirements. Immediate attention required.'
  : 'DR capabilities demonstrate adequate preparedness for business continuity.'}

NEXT STEPS:
1. Address critical findings within 30 days
2. Complete high-priority action items within 60 days
3. Schedule follow-up exercise for ${exercise.nextExerciseDate}

Prepared: ${new Date().toISOString()}
`;
  }
}