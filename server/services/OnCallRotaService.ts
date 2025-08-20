/**
 * On-Call Rota Service
 * Manages on-call schedules, escalations, and incident response for PayrollSync teams
 */

import { db } from '../db';
import {
  onCallTeams,
  onCallTeamMembers,
  onCallSchedules,
  onCallAssignments,
  escalationPolicies,
  escalationRules,
  onCallIncidents,
  incidentResponses,
  onCallAvailability,
  onCallMetrics,
  users,
  type OnCallTeam,
  type OnCallAssignment,
  type OnCallIncident,
  type EscalationPolicy,
  type InsertOnCallIncident,
  type InsertIncidentResponse,
  type InsertOnCallAssignment,
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count, avg, or, isNull, not } from 'drizzle-orm';
import { EventEmitter } from 'events';

export interface CurrentOnCallStatus {
  teamId: string;
  teamName: string;
  primaryOnCall: {
    userId: string;
    userName: string;
    email: string;
    contactMethods: any;
    startTime: Date;
    endTime: Date;
  } | null;
  escalationLevel: number;
  nextRotation: Date | null;
  backupPersonnel: Array<{
    userId: string;
    userName: string;
    level: number;
  }>;
}

export interface IncidentEscalation {
  incidentId: string;
  currentLevel: number;
  nextLevel: number;
  escalationTime: Date;
  targetUserId?: string;
  targetTeamId?: string;
  notificationMethods: string[];
}

export interface RotationSchedule {
  scheduleId: string;
  assignments: Array<{
    userId: string;
    startTime: Date;
    endTime: Date;
    type: string;
  }>;
  nextHandover: Date;
  coverage: {
    hasGaps: boolean;
    gaps: Array<{ start: Date; end: Date }>;
  };
}

export class OnCallRotaService extends EventEmitter {
  private static instance: OnCallRotaService;
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeRotationTimers();
  }

  static getInstance(): OnCallRotaService {
    if (!OnCallRotaService.instance) {
      OnCallRotaService.instance = new OnCallRotaService();
    }
    return OnCallRotaService.instance;
  }

  /**
   * Initialize the on-call rota system
   */
  async initializeOnCallSystem(): Promise<void> {
    try {
      await this.createDefaultTeamsAndPolicies();
      await this.initializeRotationTimers();
      console.log('🚨 On-call rota system initialized');
    } catch (error) {
      console.error('Failed to initialize on-call rota system:', error);
    }
  }

  /**
   * Create default teams and escalation policies
   */
  private async createDefaultTeamsAndPolicies(): Promise<void> {
    const defaultTeams = [
      {
        name: 'Primary Support',
        description: 'Primary on-call team for all system incidents',
        teamType: 'primary',
        timezone: 'Europe/Athens',
        escalationTimeout: 15,
        maxEscalationLevel: 3,
        notificationChannels: ['email', 'sms', 'phone'],
        contactInfo: {
          email: 'oncall-primary@payrollsync.gr',
          slack: '#incidents-primary',
          phone: '+30 210 1234567'
        }
      },
      {
        name: 'Engineering Escalation',
        description: 'Senior engineering team for complex technical issues',
        teamType: 'escalation',
        timezone: 'Europe/Athens',
        escalationTimeout: 10,
        maxEscalationLevel: 2,
        notificationChannels: ['email', 'sms', 'slack'],
        contactInfo: {
          email: 'engineering-oncall@payrollsync.gr',
          slack: '#incidents-engineering'
        }
      },
      {
        name: 'Government Systems Specialists',
        description: 'Specialists for ERGANI II, e-EFKA, and AADE integrations',
        teamType: 'specialist',
        timezone: 'Europe/Athens',
        escalationTimeout: 20,
        maxEscalationLevel: 2,
        notificationChannels: ['email', 'phone'],
        contactInfo: {
          email: 'gov-systems@payrollsync.gr',
          slack: '#gov-integrations'
        }
      },
      {
        name: 'Executive Escalation',
        description: 'Executive team for critical business impact incidents',
        teamType: 'escalation',
        timezone: 'Europe/Athens',
        escalationTimeout: 30,
        maxEscalationLevel: 1,
        notificationChannels: ['phone', 'email'],
        contactInfo: {
          email: 'executives@payrollsync.gr',
          phone: '+30 210 9999999'
        }
      }
    ];

    for (const teamData of defaultTeams) {
      try {
        const existing = await db
          .select()
          .from(onCallTeams)
          .where(eq(onCallTeams.name, teamData.name))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(onCallTeams).values(teamData);
          console.log(`Created on-call team: ${teamData.name}`);
        }
      } catch (error) {
        if ((error as any)?.code === '42P01') {
          console.log('On-call teams table not yet created - using defaults');
          return;
        }
        console.error(`Failed to create team ${teamData.name}:`, error);
      }
    }

    // Create default escalation policies
    await this.createDefaultEscalationPolicies();
  }

  /**
   * Create default escalation policies
   */
  private async createDefaultEscalationPolicies(): Promise<void> {
    try {
      const teams = await db.select().from(onCallTeams);
      const primaryTeam = teams.find(t => t.teamType === 'primary');
      const engineeringTeam = teams.find(t => t.teamType === 'escalation');

      if (!primaryTeam) return;

      const defaultPolicies = [
        {
          name: 'Critical System Outages',
          description: 'Escalation policy for critical system outages and government system failures',
          teamId: primaryTeam.id,
          severity: ['critical'],
          triggerConditions: {
            systemTypes: ['labor_reporting', 'social_security', 'tax_authority'],
            outageTypes: ['total_outage', 'partial_outage'],
            impactLevel: 'high'
          },
          escalationSteps: [
            {
              step: 1,
              delay: 0,
              target: 'primary_oncall',
              methods: ['sms', 'phone', 'email'],
              timeout: 5
            },
            {
              step: 2,
              delay: 15,
              target: 'team_broadcast',
              methods: ['phone', 'sms'],
              timeout: 10
            },
            {
              step: 3,
              delay: 30,
              target: 'engineering_escalation',
              methods: ['phone', 'email'],
              timeout: 15
            }
          ],
          maxEscalationTime: 60,
          businessHoursOnly: false,
          weekendEscalation: true,
          holidayEscalation: true
        },
        {
          name: 'Performance Degradation',
          description: 'Escalation policy for performance issues and service degradation',
          teamId: primaryTeam.id,
          severity: ['major', 'minor'],
          triggerConditions: {
            responseTimeThreshold: 5000,
            errorRateThreshold: 0.05,
            availabilityThreshold: 99.0
          },
          escalationSteps: [
            {
              step: 1,
              delay: 0,
              target: 'primary_oncall',
              methods: ['email', 'sms'],
              timeout: 15
            },
            {
              step: 2,
              delay: 30,
              target: 'engineering_escalation',
              methods: ['email', 'sms'],
              timeout: 20
            }
          ],
          maxEscalationTime: 60,
          businessHoursOnly: true,
          weekendEscalation: false,
          holidayEscalation: false
        }
      ];

      for (const policyData of defaultPolicies) {
        const existing = await db
          .select()
          .from(escalationPolicies)
          .where(eq(escalationPolicies.name, policyData.name))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(escalationPolicies).values(policyData);
          console.log(`Created escalation policy: ${policyData.name}`);
        }
      }
    } catch (error) {
      if ((error as any)?.code === '42P01') {
        console.log('Escalation policies table not yet created - using defaults');
      } else {
        console.error('Failed to create default escalation policies:', error);
      }
    }
  }

  /**
   * Get current on-call status for all teams
   */
  async getCurrentOnCallStatus(): Promise<CurrentOnCallStatus[]> {
    try {
      const now = new Date();
      const teams = await db
        .select()
        .from(onCallTeams)
        .where(eq(onCallTeams.isActive, true));

      const statusList: CurrentOnCallStatus[] = [];

      for (const team of teams) {
        // Get current assignment
        const [currentAssignment] = await db
          .select({
            assignment: onCallAssignments,
            user: {
              id: users.id,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
            }
          })
          .from(onCallAssignments)
          .leftJoin(users, eq(onCallAssignments.userId, users.id))
          .where(
            and(
              eq(onCallAssignments.status, 'active'),
              lte(onCallAssignments.startTime, now),
              gte(onCallAssignments.endTime, now)
            )
          )
          .orderBy(desc(onCallAssignments.startTime))
          .limit(1);

        // Get backup personnel
        const backupMembers = await db
          .select({
            userId: onCallTeamMembers.userId,
            escalationLevel: onCallTeamMembers.escalationLevel,
            user: {
              firstName: users.firstName,
              lastName: users.lastName,
            }
          })
          .from(onCallTeamMembers)
          .leftJoin(users, eq(onCallTeamMembers.userId, users.id))
          .where(
            and(
              eq(onCallTeamMembers.teamId, team.id),
              eq(onCallTeamMembers.isActive, true),
              not(eq(onCallTeamMembers.role, 'primary'))
            )
          )
          .orderBy(onCallTeamMembers.escalationLevel);

        // Get next rotation
        const [nextAssignment] = await db
          .select()
          .from(onCallAssignments)
          .where(
            and(
              gte(onCallAssignments.startTime, now),
              eq(onCallAssignments.status, 'scheduled')
            )
          )
          .orderBy(onCallAssignments.startTime)
          .limit(1);

        const status: CurrentOnCallStatus = {
          teamId: team.id,
          teamName: team.name,
          primaryOnCall: currentAssignment ? {
            userId: currentAssignment.assignment.userId,
            userName: `${currentAssignment.user?.firstName || ''} ${currentAssignment.user?.lastName || ''}`.trim(),
            email: currentAssignment.user?.email || '',
            contactMethods: (currentAssignment.assignment as any).metadata || {},
            startTime: currentAssignment.assignment.startTime,
            endTime: currentAssignment.assignment.endTime,
          } : null,
          escalationLevel: 0,
          nextRotation: nextAssignment?.startTime || null,
          backupPersonnel: backupMembers.map(member => ({
            userId: member.userId,
            userName: `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim(),
            level: member.escalationLevel || 1,
          })),
        };

        statusList.push(status);
      }

      return statusList;
    } catch (error) {
      if ((error as any)?.code === '42P01') {
        console.log('On-call tables not yet created - using empty status');
        return [];
      }
      console.error('Failed to get current on-call status:', error);
      return [];
    }
  }

  /**
   * Trigger an incident and start escalation process
   */
  async triggerIncident(incidentData: {
    title: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    source: string;
    externalIncidentId?: string;
    affectedSystems?: string[];
    teamId?: string;
  }): Promise<OnCallIncident> {
    try {
      // Determine appropriate team and escalation policy
      const { teamId, escalationPolicyId } = await this.determineIncidentAssignment(incidentData);

      const incident: InsertOnCallIncident = {
        ...incidentData,
        assignedTeamId: teamId,
        escalationPolicyId,
        triggeredAt: new Date(),
        status: 'triggered',
        currentEscalationLevel: 0,
        affectedSystems: incidentData.affectedSystems || [],
        impact: {
          estimatedAffectedUsers: this.estimateUserImpact(incidentData.severity),
          businessImpact: this.assessBusinessImpact(incidentData.severity),
        },
      };

      const [createdIncident] = await db
        .insert(onCallIncidents)
        .values(incident)
        .returning();

      // Start escalation process
      await this.startEscalationProcess(createdIncident);

      // Emit incident triggered event
      this.emit('incidentTriggered', createdIncident);

      console.log(`🚨 Incident triggered: ${createdIncident.title} (${createdIncident.severity})`);
      return createdIncident;
    } catch (error) {
      console.error('Failed to trigger incident:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an incident
   */
  async acknowledgeIncident(
    incidentId: string, 
    responderId: string, 
    message?: string,
    responseMethod: string = 'web'
  ): Promise<void> {
    try {
      const now = new Date();

      // Update incident status
      const [incident] = await db
        .update(onCallIncidents)
        .set({
          status: 'acknowledged',
          acknowledgedAt: now,
          currentAssigneeId: responderId,
          acknowledgments: sql`${onCallIncidents.acknowledgments} + 1`,
          updatedAt: now,
        })
        .where(eq(onCallIncidents.id, incidentId))
        .returning();

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Record response
      const response: InsertIncidentResponse = {
        incidentId,
        responderId,
        responseType: 'acknowledged',
        responseTime: now,
        responseMethod,
        message: message || 'Incident acknowledged',
        escalationLevel: incident.currentEscalationLevel,
        responseDelay: this.calculateResponseDelay(incident.triggeredAt, now),
      };

      await db.insert(incidentResponses).values(response);

      // Clear any pending escalation timers
      this.clearEscalationTimer(incidentId);

      // Emit acknowledgment event
      this.emit('incidentAcknowledged', { incident, responderId, message });

      console.log(`✅ Incident acknowledged: ${incident.title} by user ${responderId}`);
    } catch (error) {
      console.error('Failed to acknowledge incident:', error);
      throw error;
    }
  }

  /**
   * Escalate an incident to the next level
   */
  async escalateIncident(incidentId: string, reason?: string): Promise<IncidentEscalation> {
    try {
      const [incident] = await db
        .select()
        .from(onCallIncidents)
        .where(eq(onCallIncidents.id, incidentId))
        .limit(1);

      if (!incident) {
        throw new Error('Incident not found');
      }

      const escalationPolicy = await this.getEscalationPolicy(incident.escalationPolicyId || undefined);
      if (!escalationPolicy) {
        throw new Error('No escalation policy found');
      }

      const nextLevel = (incident.currentEscalationLevel || 0) + 1;
      const now = new Date();

      // Update incident
      await db
        .update(onCallIncidents)
        .set({
          status: 'escalated',
          escalatedAt: now,
          currentEscalationLevel: nextLevel,
          updatedAt: now,
        })
        .where(eq(onCallIncidents.id, incidentId));

      // Get escalation target
      const escalationTarget = await this.getEscalationTarget(escalationPolicy, nextLevel);

      const escalation: IncidentEscalation = {
        incidentId,
        currentLevel: incident.currentEscalationLevel || 0,
        nextLevel,
        escalationTime: now,
        targetUserId: escalationTarget?.userId,
        targetTeamId: escalationTarget?.teamId,
        notificationMethods: escalationTarget?.methods || ['email'],
      };

      // Send escalation notifications
      await this.sendEscalationNotifications(escalation, incident);

      // Schedule next escalation if needed
      await this.scheduleNextEscalation(incident, escalationPolicy, nextLevel);

      // Emit escalation event
      this.emit('incidentEscalated', escalation);

      console.log(`⬆️  Incident escalated: ${incident.title} to level ${nextLevel}`);
      return escalation;
    } catch (error) {
      console.error('Failed to escalate incident:', error);
      throw error;
    }
  }

  /**
   * Resolve an incident
   */
  async resolveIncident(
    incidentId: string, 
    responderId: string, 
    resolution: string,
    wasfalseAlarm: boolean = false
  ): Promise<void> {
    try {
      const now = new Date();

      const [incident] = await db
        .update(onCallIncidents)
        .set({
          status: 'resolved',
          resolvedAt: now,
          falseAlarm: wasfalseAlarm,
          updatedAt: now,
        })
        .where(eq(onCallIncidents.id, incidentId))
        .returning();

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Calculate resolution time
      const resolutionTime = Math.floor((now.getTime() - incident.triggeredAt.getTime()) / 60000);
      await db
        .update(onCallIncidents)
        .set({ resolutionTime })
        .where(eq(onCallIncidents.id, incidentId));

      // Record resolution response
      const response: InsertIncidentResponse = {
        incidentId,
        responderId,
        responseType: 'resolved',
        responseTime: now,
        message: resolution,
        actionTaken: resolution,
        escalationLevel: incident.currentEscalationLevel,
      };

      await db.insert(incidentResponses).values(response);

      // Clear any escalation timers
      this.clearEscalationTimer(incidentId);

      // Emit resolution event
      this.emit('incidentResolved', { incident, responderId, resolution, wasfalseAlarm });

      console.log(`✅ Incident resolved: ${incident.title} (${resolutionTime} minutes)`);
    } catch (error) {
      console.error('Failed to resolve incident:', error);
      throw error;
    }
  }

  /**
   * Generate rotation schedule for a team
   */
  async generateRotationSchedule(
    scheduleId: string,
    startDate: Date,
    endDate: Date
  ): Promise<RotationSchedule> {
    try {
      const [schedule] = await db
        .select()
        .from(onCallSchedules)
        .where(eq(onCallSchedules.id, scheduleId))
        .limit(1);

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Get team members
      const teamMembers = await db
        .select()
        .from(onCallTeamMembers)
        .where(
          and(
            eq(onCallTeamMembers.teamId, schedule.teamId),
            eq(onCallTeamMembers.isActive, true)
          )
        )
        .orderBy(onCallTeamMembers.escalationLevel);

      if (teamMembers.length === 0) {
        throw new Error('No team members found for schedule');
      }

      // Generate assignments based on rotation type
      const assignments = await this.generateAssignments(
        schedule,
        teamMembers,
        startDate,
        endDate
      );

      // Check for coverage gaps
      const coverage = this.analyzeCoverage(assignments, startDate, endDate);

      // Get next handover time
      const nextHandover = this.calculateNextHandover(schedule, assignments);

      return {
        scheduleId,
        assignments,
        nextHandover,
        coverage,
      };
    } catch (error) {
      console.error('Failed to generate rotation schedule:', error);
      throw error;
    }
  }

  /**
   * Get on-call metrics for a user or team
   */
  async getOnCallMetrics(
    userId?: string,
    teamId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const conditions = [];
      if (userId) conditions.push(eq(onCallMetrics.userId, userId));
      if (teamId) conditions.push(eq(onCallMetrics.teamId, teamId));
      if (startDate) conditions.push(gte(onCallMetrics.metricDate, startDate));
      if (endDate) conditions.push(lte(onCallMetrics.metricDate, endDate));

      const metrics = await db
        .select()
        .from(onCallMetrics)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(onCallMetrics.metricDate));

      return this.aggregateMetrics(metrics);
    } catch (error) {
      console.error('Failed to get on-call metrics:', error);
      return null;
    }
  }

  // Helper methods

  private async determineIncidentAssignment(incidentData: any): Promise<{
    teamId: string;
    escalationPolicyId?: string;
  }> {
    // If team is specified, use it
    if (incidentData.teamId) {
      const policy = await this.findEscalationPolicy(incidentData.teamId, incidentData.severity);
      return {
        teamId: incidentData.teamId,
        escalationPolicyId: policy?.id,
      };
    }

    // Determine team based on severity and affected systems
    const teams = await db.select().from(onCallTeams).where(eq(onCallTeams.isActive, true));
    
    // For critical incidents, use primary team
    if (incidentData.severity === 'critical') {
      const primaryTeam = teams.find(t => t.teamType === 'primary');
      if (primaryTeam) {
        const policy = await this.findEscalationPolicy(primaryTeam.id, incidentData.severity);
        return {
          teamId: primaryTeam.id,
          escalationPolicyId: policy?.id,
        };
      }
    }

    // Default to first available team
    const defaultTeam = teams[0];
    const policy = await this.findEscalationPolicy(defaultTeam?.id, incidentData.severity);
    return {
      teamId: defaultTeam?.id || 'default',
      escalationPolicyId: policy?.id,
    };
  }

  private async findEscalationPolicy(teamId: string, severity: string): Promise<EscalationPolicy | null> {
    try {
      const [policy] = await db
        .select()
        .from(escalationPolicies)
        .where(
          and(
            eq(escalationPolicies.teamId, teamId),
            eq(escalationPolicies.isActive, true),
            sql`${escalationPolicies.severity} @> ${JSON.stringify([severity])}`
          )
        )
        .limit(1);

      return policy || null;
    } catch (error) {
      return null;
    }
  }

  private async getEscalationPolicy(policyId?: string): Promise<any> {
    if (!policyId) return null;
    
    const [policy] = await db
      .select()
      .from(escalationPolicies)
      .where(eq(escalationPolicies.id, policyId))
      .limit(1);

    return policy;
  }

  private async getEscalationTarget(policy: any, level: number): Promise<any> {
    const steps = policy.escalationSteps as any[];
    const step = steps?.find(s => s.step === level);
    
    if (!step) return null;

    return {
      userId: step.target === 'primary_oncall' ? await this.getCurrentOnCallUser(policy.teamId) : null,
      teamId: step.target === 'team_broadcast' ? policy.teamId : null,
      methods: step.methods || ['email'],
    };
  }

  private async getCurrentOnCallUser(teamId: string): Promise<string | null> {
    const now = new Date();
    const [assignment] = await db
      .select()
      .from(onCallAssignments)
      .where(
        and(
          lte(onCallAssignments.startTime, now),
          gte(onCallAssignments.endTime, now),
          eq(onCallAssignments.status, 'active')
        )
      )
      .limit(1);

    return assignment?.userId || null;
  }

  private async startEscalationProcess(incident: OnCallIncident): Promise<void> {
    // Notify primary on-call immediately
    await this.sendInitialNotification(incident);

    // Schedule first escalation if policy exists
    if (incident.escalationPolicyId) {
      const policy = await this.getEscalationPolicy(incident.escalationPolicyId);
      if (policy) {
        await this.scheduleNextEscalation(incident, policy, 1);
      }
    }
  }

  private async sendInitialNotification(incident: OnCallIncident): Promise<void> {
    // Implementation would send notifications via email, SMS, etc.
    console.log(`📧 Sending initial notification for incident: ${incident.title}`);
    this.emit('notificationSent', {
      incidentId: incident.id,
      type: 'initial',
      severity: incident.severity,
    });
  }

  private async sendEscalationNotifications(escalation: IncidentEscalation, incident: OnCallIncident): Promise<void> {
    // Implementation would send escalation notifications
    console.log(`📧 Sending escalation notification for incident: ${incident.title} to level ${escalation.nextLevel}`);
    this.emit('notificationSent', {
      incidentId: incident.id,
      type: 'escalation',
      level: escalation.nextLevel,
    });
  }

  private async scheduleNextEscalation(incident: OnCallIncident, policy: any, level: number): Promise<void> {
    const steps = policy.escalationSteps as any[];
    const nextStep = steps?.find(s => s.step === level);
    
    if (!nextStep) return;

    const delay = nextStep.delay * 60 * 1000; // Convert minutes to milliseconds
    
    const timeoutId = setTimeout(async () => {
      try {
        const [currentIncident] = await db
          .select()
          .from(onCallIncidents)
          .where(eq(onCallIncidents.id, incident.id))
          .limit(1);

        // Only escalate if incident is still active
        if (currentIncident && currentIncident.status === 'triggered') {
          await this.escalateIncident(incident.id, 'Automatic escalation - no response');
        }
      } catch (error) {
        console.error('Failed to auto-escalate incident:', error);
      }
    }, delay);

    this.escalationTimers.set(incident.id, timeoutId);
  }

  private clearEscalationTimer(incidentId: string): void {
    const timeoutId = this.escalationTimers.get(incidentId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.escalationTimers.delete(incidentId);
    }
  }

  private calculateResponseDelay(triggeredAt: Date, responseAt: Date): number {
    return Math.floor((responseAt.getTime() - triggeredAt.getTime()) / 60000);
  }

  private estimateUserImpact(severity: string): number {
    switch (severity) {
      case 'critical': return 1000;
      case 'high': return 500;
      case 'medium': return 100;
      case 'low': return 10;
      default: return 0;
    }
  }

  private assessBusinessImpact(severity: string): string {
    switch (severity) {
      case 'critical': return 'High - Service completely unavailable';
      case 'high': return 'Medium - Significant degradation';
      case 'medium': return 'Low - Minor impact';
      case 'low': return 'Minimal - Limited functionality affected';
      default: return 'Unknown';
    }
  }

  private async generateAssignments(
    schedule: any,
    members: any[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const assignments = [];
    const rotationHours = schedule.rotationLength || 168; // Default 1 week
    
    let currentDate = new Date(startDate);
    let memberIndex = 0;

    while (currentDate < endDate) {
      const endTime = new Date(currentDate.getTime() + rotationHours * 60 * 60 * 1000);
      
      assignments.push({
        userId: members[memberIndex].userId,
        startTime: new Date(currentDate),
        endTime: endTime > endDate ? endDate : endTime,
        type: 'regular',
      });

      currentDate = endTime;
      memberIndex = (memberIndex + 1) % members.length;
    }

    return assignments;
  }

  private analyzeCoverage(assignments: any[], startDate: Date, endDate: Date): any {
    // Simple gap analysis - could be enhanced
    let hasGaps = false;
    const gaps = [];

    for (let i = 0; i < assignments.length - 1; i++) {
      const current = assignments[i];
      const next = assignments[i + 1];

      if (current.endTime < next.startTime) {
        hasGaps = true;
        gaps.push({
          start: current.endTime,
          end: next.startTime,
        });
      }
    }

    return { hasGaps, gaps };
  }

  private calculateNextHandover(schedule: any, assignments: any[]): Date {
    const now = new Date();
    const futureAssignments = assignments.filter(a => a.startTime > now);
    return futureAssignments[0]?.startTime || new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  private aggregateMetrics(metrics: any[]): any {
    if (metrics.length === 0) return null;

    return {
      totalIncidents: metrics.reduce((sum, m) => sum + (m.incidentsHandled || 0), 0),
      avgResponseTime: metrics.reduce((sum, m) => sum + (parseFloat(m.averageResponseTime) || 0), 0) / metrics.length,
      avgResolutionTime: metrics.reduce((sum, m) => sum + (parseFloat(m.averageResolutionTime) || 0), 0) / metrics.length,
      acknowledgmentRate: metrics.reduce((sum, m) => sum + (parseFloat(m.acknowledgmentRate) || 0), 0) / metrics.length,
      escalationRate: metrics.reduce((sum, m) => sum + (parseFloat(m.escalationRate) || 0), 0) / metrics.length,
      totalHours: metrics.reduce((sum, m) => sum + (parseFloat(m.hoursOnCall) || 0), 0),
      burnoutRisk: this.calculateBurnoutRisk(metrics),
    };
  }

  private calculateBurnoutRisk(metrics: any[]): string {
    const totalHours = metrics.reduce((sum, m) => sum + (parseFloat(m.hoursOnCall) || 0), 0);
    const avgSatisfaction = metrics.reduce((sum, m) => sum + (parseFloat(m.satisfactionScore) || 5), 0) / metrics.length;
    
    if (totalHours > 80 || avgSatisfaction < 3) return 'high';
    if (totalHours > 60 || avgSatisfaction < 4) return 'medium';
    return 'low';
  }

  private async initializeRotationTimers(): Promise<void> {
    // Initialize timers for automatic rotation advances
    // This would typically check for scheduled rotations and set up timers
    console.log('Initializing rotation timers...');
  }

  /**
   * Stop all monitoring and clean up
   */
  stopAllMonitoring(): void {
    // Clear all escalation timers
    for (const [incidentId, timer] of Array.from(this.escalationTimers.entries())) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();

    // Clear all rotation timers
    for (const [scheduleId, timer] of Array.from(this.rotationTimers.entries())) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();
  }
}