/**
 * Incident Response Ownership Service
 * Manages clear incident response ownership with named roles and responsibilities
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import {
  incidentResponseRoles,
  incidentResponseTeams,
  incidentRoleAssignments,
  escalationMatrix,
  type IncidentResponseRole,
  type IncidentResponseTeam,
  type IncidentRoleAssignment,
  type EscalationMatrix
} from '@shared/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';

export interface IncidentResponder {
  id: string;
  name: string;
  email: string;
  phone?: string;
  alternateContact?: string;
  timezone: string;
  skills: string[];
  certifications: string[];
  isActive: boolean;
}

export interface RoleDefinition {
  roleId: string;
  roleName: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  requiredCertifications: string[];
  escalationLevel: number;
  maxConcurrentIncidents: number;
  responseTimeMinutes: number;
}

export interface TeamStructure {
  teamId: string;
  teamName: string;
  description: string;
  teamType: 'primary' | 'escalation' | 'specialist' | 'executive';
  roles: RoleDefinition[];
  escalationPath: string[];
  oncallRotation?: {
    schedule: string;
    currentOncall: string;
    backupOncall: string;
    rotationInterval: string;
  };
}

export interface IncidentAssignmentRequest {
  incidentId: string;
  severity: 'minor' | 'major' | 'critical';
  category: string;
  requiredRoles: string[];
  assignmentReason: string;
  assignedBy: string;
}

export class IncidentResponseOwnershipService extends EventEmitter {
  private static instance: IncidentResponseOwnershipService;

  constructor() {
    super();
  }

  public static getInstance(): IncidentResponseOwnershipService {
    if (!IncidentResponseOwnershipService.instance) {
      IncidentResponseOwnershipService.instance = new IncidentResponseOwnershipService();
    }
    return IncidentResponseOwnershipService.instance;
  }

  /**
   * Create a new incident response role
   */
  public async createRole(roleData: {
    roleName: string;
    description: string;
    responsibilities: string[];
    requiredSkills: string[];
    requiredCertifications: string[];
    escalationLevel: number;
    maxConcurrentIncidents: number;
    responseTimeMinutes: number;
  }): Promise<IncidentResponseRole> {
    const [role] = await db.insert(incidentResponseRoles).values({
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roleName: roleData.roleName,
      description: roleData.description,
      responsibilities: roleData.responsibilities,
      requiredSkills: roleData.requiredSkills,
      requiredCertifications: roleData.requiredCertifications,
      escalationLevel: roleData.escalationLevel,
      maxConcurrentIncidents: roleData.maxConcurrentIncidents,
      responseTimeMinutes: roleData.responseTimeMinutes,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log(`📋 Created incident response role: ${roleData.roleName}`);
    this.emit('role_created', role);
    return role;
  }

  /**
   * Create a new incident response team
   */
  public async createTeam(teamData: {
    teamName: string;
    description: string;
    teamType: 'primary' | 'escalation' | 'specialist' | 'executive';
    teamLead?: string;
    escalationTargets: string[];
    oncallSettings?: {
      rotationInterval: string;
      schedule: string;
    };
  }): Promise<IncidentResponseTeam> {
    const [team] = await db.insert(incidentResponseTeams).values({
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      teamName: teamData.teamName,
      description: teamData.description,
      teamType: teamData.teamType,
      teamLead: teamData.teamLead,
      escalationTargets: teamData.escalationTargets,
      oncallSettings: teamData.oncallSettings,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log(`👥 Created incident response team: ${teamData.teamName}`);
    this.emit('team_created', team);
    return team;
  }

  /**
   * Assign a person to a role within a team
   */
  public async assignRoleToTeam(assignmentData: {
    teamId: string;
    roleId: string;
    personId: string;
    personName: string;
    personEmail: string;
    personPhone?: string;
    isPrimary: boolean;
    isOncall: boolean;
  }): Promise<IncidentRoleAssignment> {
    const [assignment] = await db.insert(incidentRoleAssignments).values({
      id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      teamId: assignmentData.teamId,
      roleId: assignmentData.roleId,
      personId: assignmentData.personId,
      personName: assignmentData.personName,
      personEmail: assignmentData.personEmail,
      personPhone: assignmentData.personPhone,
      isPrimary: assignmentData.isPrimary,
      isOncall: assignmentData.isOncall,
      isActive: true,
      assignedAt: new Date(),
      createdAt: new Date()
    }).returning();

    console.log(`👤 Assigned ${assignmentData.personName} to role in team`);
    this.emit('role_assigned', assignment);
    return assignment;
  }

  /**
   * Create escalation matrix for incident types
   */
  public async createEscalationMatrix(matrixData: {
    incidentType: string;
    severity: string;
    initialResponse: {
      teamId: string;
      responseTimeMinutes: number;
      requiredRoles: string[];
    };
    escalationLevels: {
      level: number;
      targetTeamId: string;
      triggerConditions: string[];
      timeoutMinutes: number;
      requiredApprovals?: string[];
    }[];
  }): Promise<EscalationMatrix> {
    const [matrix] = await db.insert(escalationMatrix).values({
      id: `matrix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incidentType: matrixData.incidentType,
      severity: matrixData.severity,
      initialResponseTeam: matrixData.initialResponse.teamId,
      initialResponseTime: matrixData.initialResponse.responseTimeMinutes,
      escalationLevels: matrixData.escalationLevels,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log(`🎯 Created escalation matrix for ${matrixData.incidentType}/${matrixData.severity}`);
    this.emit('escalation_matrix_created', matrix);
    return matrix;
  }

  /**
   * Get incident response assignment based on incident details
   */
  public async getIncidentResponseAssignment(request: IncidentAssignmentRequest): Promise<{
    primaryTeam: IncidentResponseTeam;
    assignedRoles: IncidentRoleAssignment[];
    escalationMatrix: EscalationMatrix | null;
    responseExpectations: {
      initialResponseMinutes: number;
      escalationTriggers: string[];
      communicationPlan: string[];
    };
  }> {
    try {
      console.log(`🎯 Getting incident response assignment for ${request.incidentId}`);

      // Find applicable escalation matrix
      const [matrix] = await db.select()
        .from(escalationMatrix)
        .where(and(
          eq(escalationMatrix.incidentType, request.category),
          eq(escalationMatrix.severity, request.severity),
          eq(escalationMatrix.isActive, true)
        ))
        .limit(1);

      if (!matrix) {
        console.log('⚠️  No escalation matrix found, using default assignment');
        return await this.getDefaultAssignment(request);
      }

      // Get initial response team
      const [primaryTeam] = await db.select()
        .from(incidentResponseTeams)
        .where(and(
          eq(incidentResponseTeams.id, matrix.initialResponseTeam),
          eq(incidentResponseTeams.isActive, true)
        ))
        .limit(1);

      if (!primaryTeam) {
        throw new Error('Primary response team not found');
      }

      // Get assigned roles for the team
      const assignedRoles = await db.select()
        .from(incidentRoleAssignments)
        .where(and(
          eq(incidentRoleAssignments.teamId, primaryTeam.id),
          eq(incidentRoleAssignments.isActive, true)
        ));

      // Filter roles based on incident requirements
      const relevantRoles = request.requiredRoles.length > 0 
        ? assignedRoles.filter(assignment => 
            request.requiredRoles.includes(assignment.roleId)
          )
        : assignedRoles;

      const responseExpectations = {
        initialResponseMinutes: matrix.initialResponseTime,
        escalationTriggers: matrix.escalationLevels.flatMap(level => level.triggerConditions),
        communicationPlan: [
          'immediate_acknowledgment',
          'status_updates_every_30min',
          'stakeholder_notification',
          'resolution_summary'
        ]
      };

      console.log(`✅ Incident assigned to team: ${primaryTeam.teamName} with ${relevantRoles.length} roles`);

      return {
        primaryTeam,
        assignedRoles: relevantRoles,
        escalationMatrix: matrix,
        responseExpectations
      };

    } catch (error) {
      console.error('Failed to get incident response assignment:', error);
      return await this.getDefaultAssignment(request);
    }
  }

  /**
   * Get default assignment when no specific matrix exists
   */
  private async getDefaultAssignment(request: IncidentAssignmentRequest) {
    console.log('🔄 Using default assignment strategy');

    // Get the primary response team (first active team)
    const [primaryTeam] = await db.select()
      .from(incidentResponseTeams)
      .where(and(
        eq(incidentResponseTeams.teamType, 'primary'),
        eq(incidentResponseTeams.isActive, true)
      ))
      .limit(1);

    const assignedRoles = primaryTeam ? await db.select()
      .from(incidentRoleAssignments)
      .where(and(
        eq(incidentRoleAssignments.teamId, primaryTeam.id),
        eq(incidentRoleAssignments.isActive, true),
        eq(incidentRoleAssignments.isPrimary, true)
      )) : [];

    const defaultResponseTime = request.severity === 'critical' ? 5 :
                               request.severity === 'major' ? 15 : 60;

    return {
      primaryTeam: primaryTeam || {
        id: 'default_team',
        teamName: 'Default Response Team',
        description: 'Fallback team for incidents without specific assignment',
        teamType: 'primary' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      assignedRoles,
      escalationMatrix: null,
      responseExpectations: {
        initialResponseMinutes: defaultResponseTime,
        escalationTriggers: ['no_response_timeout', 'severity_increase', 'manual_escalation'],
        communicationPlan: ['acknowledge_incident', 'provide_updates', 'notify_stakeholders']
      }
    };
  }

  /**
   * Get all incident response roles
   */
  public async getAllRoles(): Promise<IncidentResponseRole[]> {
    return await db.select()
      .from(incidentResponseRoles)
      .where(eq(incidentResponseRoles.isActive, true))
      .orderBy(asc(incidentResponseRoles.escalationLevel));
  }

  /**
   * Get all incident response teams
   */
  public async getAllTeams(): Promise<IncidentResponseTeam[]> {
    return await db.select()
      .from(incidentResponseTeams)
      .where(eq(incidentResponseTeams.isActive, true))
      .orderBy(asc(incidentResponseTeams.teamName));
  }

  /**
   * Get team assignments
   */
  public async getTeamAssignments(teamId: string): Promise<{
    team: IncidentResponseTeam;
    roleAssignments: (IncidentRoleAssignment & { role: IncidentResponseRole })[];
  }> {
    const [team] = await db.select()
      .from(incidentResponseTeams)
      .where(eq(incidentResponseTeams.id, teamId))
      .limit(1);

    if (!team) {
      throw new Error('Team not found');
    }

    // Get role assignments with role details
    const assignments = await db.select({
      assignment: incidentRoleAssignments,
      role: incidentResponseRoles
    })
      .from(incidentRoleAssignments)
      .leftJoin(incidentResponseRoles, eq(incidentRoleAssignments.roleId, incidentResponseRoles.id))
      .where(and(
        eq(incidentRoleAssignments.teamId, teamId),
        eq(incidentRoleAssignments.isActive, true)
      ));

    const roleAssignments = assignments.map(item => ({
      ...item.assignment,
      role: item.role!
    }));

    return { team, roleAssignments };
  }

  /**
   * Update on-call rotation
   */
  public async updateOncallRotation(teamId: string, oncallData: {
    currentOncall: string;
    backupOncall: string;
    rotationDate: Date;
  }): Promise<void> {
    // Update team settings
    await db.update(incidentResponseTeams)
      .set({
        oncallSettings: {
          schedule: 'weekly_rotation',
          rotationInterval: '7_days',
          currentOncall: oncallData.currentOncall,
          backupOncall: oncallData.backupOncall,
          lastRotation: oncallData.rotationDate.toISOString()
        },
        updatedAt: new Date()
      })
      .where(eq(incidentResponseTeams.id, teamId));

    // Update assignment records
    await db.update(incidentRoleAssignments)
      .set({ isOncall: false })
      .where(eq(incidentRoleAssignments.teamId, teamId));

    await db.update(incidentRoleAssignments)
      .set({ isOncall: true })
      .where(and(
        eq(incidentRoleAssignments.teamId, teamId),
        or(
          eq(incidentRoleAssignments.personId, oncallData.currentOncall),
          eq(incidentRoleAssignments.personId, oncallData.backupOncall)
        )
      ));

    console.log(`🔄 Updated on-call rotation for team ${teamId}`);
    this.emit('oncall_rotation_updated', { teamId, ...oncallData });
  }

  /**
   * Get incident response statistics
   */
  public async getResponseStatistics(): Promise<{
    totalRoles: number;
    totalTeams: number;
    totalAssignments: number;
    averageResponseTime: number;
    escalationMatrices: number;
    oncallCoverage: number;
  }> {
    try {
      const roles = await db.select().from(incidentResponseRoles).where(eq(incidentResponseRoles.isActive, true));
      const teams = await db.select().from(incidentResponseTeams).where(eq(incidentResponseTeams.isActive, true));
      const assignments = await db.select().from(incidentRoleAssignments).where(eq(incidentRoleAssignments.isActive, true));
      const matrices = await db.select().from(escalationMatrix).where(eq(escalationMatrix.isActive, true));

      const oncallAssignments = assignments.filter(a => a.isOncall);

      return {
        totalRoles: roles.length,
        totalTeams: teams.length,
        totalAssignments: assignments.length,
        averageResponseTime: roles.reduce((sum, role) => sum + role.responseTimeMinutes, 0) / Math.max(roles.length, 1),
        escalationMatrices: matrices.length,
        oncallCoverage: Math.round((oncallAssignments.length / Math.max(assignments.length, 1)) * 100)
      };
    } catch (error) {
      console.error('Error getting response statistics:', error);
      return {
        totalRoles: 0,
        totalTeams: 0,
        totalAssignments: 0,
        averageResponseTime: 0,
        escalationMatrices: 0,
        oncallCoverage: 0
      };
    }
  }

  /**
   * Create default incident response structure
   */
  public async createDefaultResponseStructure(): Promise<void> {
    console.log('🚀 Creating default incident response structure');

    try {
      // Create default roles
      const incidentCommanderRole = await this.createRole({
        roleName: 'Incident Commander',
        description: 'Overall incident management and coordination',
        responsibilities: [
          'Coordinate incident response efforts',
          'Communicate with stakeholders',
          'Make strategic decisions',
          'Manage escalation process'
        ],
        requiredSkills: ['incident_management', 'communication', 'leadership'],
        requiredCertifications: ['incident_response_certified'],
        escalationLevel: 3,
        maxConcurrentIncidents: 2,
        responseTimeMinutes: 5
      });

      const technicalLeadRole = await this.createRole({
        roleName: 'Technical Lead',
        description: 'Technical investigation and resolution',
        responsibilities: [
          'Investigate root cause',
          'Implement technical fixes',
          'Coordinate with engineering teams',
          'Provide technical updates'
        ],
        requiredSkills: ['system_administration', 'troubleshooting', 'technical_leadership'],
        requiredCertifications: [],
        escalationLevel: 2,
        maxConcurrentIncidents: 3,
        responseTimeMinutes: 10
      });

      const communicationsRole = await this.createRole({
        roleName: 'Communications Lead',
        description: 'Stakeholder communication and updates',
        responsibilities: [
          'Draft status page updates',
          'Communicate with customers',
          'Prepare executive briefings',
          'Manage external communications'
        ],
        requiredSkills: ['communication', 'writing', 'stakeholder_management'],
        requiredCertifications: [],
        escalationLevel: 2,
        maxConcurrentIncidents: 4,
        responseTimeMinutes: 15
      });

      // Create default team
      const primaryResponseTeam = await this.createTeam({
        teamName: 'Primary Response Team',
        description: 'First response team for all incidents',
        teamType: 'primary',
        escalationTargets: [],
        oncallSettings: {
          rotationInterval: '7_days',
          schedule: 'weekly_rotation'
        }
      });

      // Create escalation team
      const escalationTeam = await this.createTeam({
        teamName: 'Executive Escalation Team',
        description: 'Executive team for major incident escalation',
        teamType: 'escalation',
        escalationTargets: []
      });

      // Create default escalation matrix
      await this.createEscalationMatrix({
        incidentType: 'system_outage',
        severity: 'critical',
        initialResponse: {
          teamId: primaryResponseTeam.id,
          responseTimeMinutes: 5,
          requiredRoles: [incidentCommanderRole.id, technicalLeadRole.id]
        },
        escalationLevels: [
          {
            level: 1,
            targetTeamId: escalationTeam.id,
            triggerConditions: ['no_response_15min', 'no_progress_30min'],
            timeoutMinutes: 30,
            requiredApprovals: ['incident_commander']
          }
        ]
      });

      console.log('✅ Default incident response structure created');

    } catch (error) {
      console.error('Failed to create default response structure:', error);
    }
  }
}