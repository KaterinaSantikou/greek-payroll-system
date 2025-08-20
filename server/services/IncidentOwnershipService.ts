/**
 * Incident Ownership Service
 * Handles incident assignment when no named owners or escalation matrix exists
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import {
  incidentAssignments,
  availableResponders,
  escalationFallbacks,
  incidentWorkload,
  type IncidentAssignment,
  type AvailableResponder,
  type EscalationFallback,
  type IncidentWorkload
} from '@shared/schema';
import { eq, and, gte, lte, desc, asc, isNull, sql, or } from 'drizzle-orm';

export interface ResponderCapabilities {
  skills: string[];
  maxConcurrentIncidents: number;
  availabilityHours: {
    timezone: string;
    schedule: {
      [day: string]: { start: string; end: string } | null;
    };
  };
  escalationLevel: number; // 1-5, higher means more senior
  canEscalateTo: string[];
}

export interface AutoAssignmentRules {
  prioritizeBy: ('availability' | 'workload' | 'skills' | 'escalation_level')[];
  requireSkillMatch: boolean;
  maxWorkloadThreshold: number;
  escalationTimeoutMinutes: number;
  fallbackToAnyAvailable: boolean;
}

export interface IncidentContext {
  id: string;
  severity: 'minor' | 'major' | 'critical';
  type: string;
  requiredSkills: string[];
  createdAt: Date;
  componentId?: string;
}

export class IncidentOwnershipService extends EventEmitter {
  private static instance: IncidentOwnershipService;
  private defaultRules: AutoAssignmentRules = {
    prioritizeBy: ['availability', 'workload', 'skills', 'escalation_level'],
    requireSkillMatch: true,
    maxWorkloadThreshold: 5,
    escalationTimeoutMinutes: 15,
    fallbackToAnyAvailable: true
  };

  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
  }

  public static getInstance(): IncidentOwnershipService {
    if (!IncidentOwnershipService.instance) {
      IncidentOwnershipService.instance = new IncidentOwnershipService();
    }
    return IncidentOwnershipService.instance;
  }

  /**
   * Auto-assign incident when no named owner exists
   */
  public async autoAssignIncident(incident: IncidentContext): Promise<IncidentAssignment | null> {
    try {
      console.log(`🎯 Auto-assigning incident ${incident.id} (severity: ${incident.severity})`);

      // Get available responders
      const availableResponders = await this.getAvailableResponders();
      
      if (availableResponders.length === 0) {
        console.log('⚠️  No available responders found, creating fallback assignment');
        return await this.createFallbackAssignment(incident);
      }

      // Score and rank responders
      const scoredResponders = await this.scoreResponders(availableResponders, incident);
      
      if (scoredResponders.length === 0) {
        console.log('⚠️  No suitable responders found, creating fallback assignment');
        return await this.createFallbackAssignment(incident);
      }

      // Assign to best match
      const selectedResponder = scoredResponders[0];
      const assignment = await this.createAssignment(incident, selectedResponder.responder, 'auto_assigned');

      // Set up escalation timer
      this.setupEscalationTimer(assignment);

      // Update workload
      await this.updateResponderWorkload(selectedResponder.responder.id, 1);

      console.log(`✅ Incident ${incident.id} assigned to ${selectedResponder.responder.name} (score: ${selectedResponder.score})`);
      this.emit('incident_auto_assigned', { incident, assignment, responder: selectedResponder.responder });

      return assignment;
    } catch (error) {
      console.error('Failed to auto-assign incident:', error);
      return await this.createFallbackAssignment(incident);
    }
  }

  /**
   * Handle escalation when no escalation matrix exists
   */
  public async escalateIncident(incidentId: string, reason: string = 'timeout'): Promise<void> {
    try {
      console.log(`📈 Escalating incident ${incidentId} due to ${reason}`);

      // Get current assignment
      const [currentAssignment] = await db.select()
        .from(incidentAssignments)
        .where(and(
          eq(incidentAssignments.incidentId, incidentId),
          isNull(incidentAssignments.unassignedAt)
        ))
        .orderBy(desc(incidentAssignments.assignedAt))
        .limit(1);

      if (!currentAssignment) {
        console.log('No current assignment found for escalation');
        return;
      }

      // Find escalation targets
      const escalationTargets = await this.findEscalationTargets(currentAssignment.assigneeId);
      
      if (escalationTargets.length === 0) {
        console.log('⚠️  No escalation targets found, using fallback escalation');
        await this.fallbackEscalation(incidentId, currentAssignment);
        return;
      }

      // Score escalation targets
      const incident = await this.getIncidentContext(incidentId);
      if (!incident) {
        console.log('Could not get incident context for escalation');
        return;
      }

      const scoredTargets = await this.scoreResponders(escalationTargets, incident);
      const escalationTarget = scoredTargets[0]?.responder;

      if (!escalationTarget) {
        await this.fallbackEscalation(incidentId, currentAssignment);
        return;
      }

      // Close current assignment
      await db.update(incidentAssignments)
        .set({ 
          unassignedAt: new Date(),
          unassignmentReason: `escalated_${reason}`
        })
        .where(eq(incidentAssignments.id, currentAssignment.id));

      // Create new escalated assignment
      const newAssignment = await this.createAssignment(
        incident, 
        escalationTarget, 
        'escalated', 
        currentAssignment.id
      );

      // Set up new escalation timer
      this.setupEscalationTimer(newAssignment);

      // Update workloads
      await this.updateResponderWorkload(currentAssignment.assigneeId, -1);
      await this.updateResponderWorkload(escalationTarget.id, 1);

      console.log(`📈 Incident ${incidentId} escalated to ${escalationTarget.name}`);
      this.emit('incident_escalated', { 
        incidentId, 
        fromAssignment: currentAssignment, 
        toAssignment: newAssignment,
        escalationTarget,
        reason 
      });

    } catch (error) {
      console.error('Failed to escalate incident:', error);
    }
  }

  /**
   * Get available responders with current status
   */
  private async getAvailableResponders(): Promise<AvailableResponder[]> {
    try {
      const responders = await db.select()
        .from(availableResponders)
        .where(eq(availableResponders.isAvailable, true));

      return responders.filter(responder => this.isCurrentlyAvailable(responder));
    } catch (error) {
      console.error('Failed to get available responders:', error);
      return [];
    }
  }

  /**
   * Score responders based on assignment rules
   */
  private async scoreResponders(
    responders: AvailableResponder[], 
    incident: IncidentContext
  ): Promise<Array<{ responder: AvailableResponder; score: number }>> {
    const scored: Array<{ responder: AvailableResponder; score: number }> = [];

    for (const responder of responders) {
      let score = 0;

      // Availability score (0-30 points)
      if (this.isCurrentlyAvailable(responder)) {
        score += 30;
      }

      // Workload score (0-25 points)
      const workload = await this.getResponderWorkload(responder.id);
      const workloadScore = Math.max(0, 25 - (workload * 5));
      score += workloadScore;

      // Skills match score (0-25 points)
      if (incident.requiredSkills.length > 0) {
        const responderSkills = responder.capabilities?.skills || [];
        const matchingSkills = incident.requiredSkills.filter(skill => 
          responderSkills.includes(skill)
        );
        const skillScore = (matchingSkills.length / incident.requiredSkills.length) * 25;
        score += skillScore;

        // Skip if skills required but no match
        if (this.defaultRules.requireSkillMatch && matchingSkills.length === 0) {
          continue;
        }
      } else {
        score += 15; // Bonus for not requiring specific skills
      }

      // Escalation level score (0-20 points)
      const escalationLevel = responder.capabilities?.escalationLevel || 1;
      const severityMultiplier = incident.severity === 'critical' ? 2 : 
                               incident.severity === 'major' ? 1.5 : 1;
      const escalationScore = Math.min(20, escalationLevel * 4 * severityMultiplier);
      score += escalationScore;

      scored.push({ responder, score });
    }

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Create incident assignment
   */
  private async createAssignment(
    incident: IncidentContext,
    responder: AvailableResponder,
    assignmentType: string,
    previousAssignmentId?: string
  ): Promise<IncidentAssignment> {
    const [assignment] = await db.insert(incidentAssignments).values({
      id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incidentId: incident.id,
      assigneeId: responder.id,
      assigneeName: responder.name,
      assigneeType: responder.responderType,
      assignmentType,
      assignedAt: new Date(),
      assignedBy: 'system_auto_assignment',
      previousAssignmentId,
      expectedResponseTime: this.calculateExpectedResponseTime(incident.severity),
      escalationLevel: responder.capabilities?.escalationLevel || 1
    }).returning();

    return assignment;
  }

  /**
   * Create fallback assignment when no responders available
   */
  private async createFallbackAssignment(incident: IncidentContext): Promise<IncidentAssignment> {
    // Create virtual "on-call fallback" assignment
    const [assignment] = await db.insert(incidentAssignments).values({
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incidentId: incident.id,
      assigneeId: 'fallback_pool',
      assigneeName: 'On-Call Fallback Pool',
      assigneeType: 'fallback_pool',
      assignmentType: 'fallback_assigned',
      assignedAt: new Date(),
      assignedBy: 'system_fallback',
      expectedResponseTime: this.calculateExpectedResponseTime(incident.severity) / 2, // Urgent
      escalationLevel: 5, // Maximum
      notes: 'Assigned to fallback pool - no named responders available'
    }).returning();

    // Create escalation fallback record
    await db.insert(escalationFallbacks).values({
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incidentId: incident.id,
      assignmentId: assignment.id,
      fallbackReason: 'no_available_responders',
      fallbackActions: [
        'notify_all_responders',
        'escalate_to_management',
        'activate_emergency_procedures'
      ],
      fallbackContacts: [
        'emergency@company.com',
        'cto@company.com',
        'operations-manager@company.com'
      ],
      isActive: true,
      createdAt: new Date()
    });

    // Set up immediate escalation (shorter timeout)
    this.setupEscalationTimer(assignment, 5); // 5 minutes instead of default

    console.log(`🚨 Incident ${incident.id} assigned to fallback pool`);
    this.emit('incident_fallback_assigned', { incident, assignment });

    return assignment;
  }

  /**
   * Find escalation targets for a responder
   */
  private async findEscalationTargets(currentResponderid: string): Promise<AvailableResponder[]> {
    try {
      // Get current responder details
      const [currentResponder] = await db.select()
        .from(availableResponders)
        .where(eq(availableResponders.id, currentResponderid));

      if (!currentResponder) {
        return [];
      }

      const currentLevel = currentResponder.capabilities?.escalationLevel || 1;
      const canEscalateTo = currentResponder.capabilities?.canEscalateTo || [];

      // Find responders with higher escalation level
      const higherLevelResponders = await db.select()
        .from(availableResponders)
        .where(and(
          eq(availableResponders.isAvailable, true),
          sql`${availableResponders.capabilities}->>'escalationLevel' > ${currentLevel.toString()}`
        ));

      // Filter by explicit escalation paths if defined
      if (canEscalateTo.length > 0) {
        return higherLevelResponders.filter(responder => 
          canEscalateTo.includes(responder.id)
        );
      }

      return higherLevelResponders.filter(responder => 
        this.isCurrentlyAvailable(responder)
      );
    } catch (error) {
      console.error('Failed to find escalation targets:', error);
      return [];
    }
  }

  /**
   * Fallback escalation when no targets available
   */
  private async fallbackEscalation(incidentId: string, currentAssignment: IncidentAssignment): Promise<void> {
    await db.insert(escalationFallbacks).values({
      id: `escalation_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      incidentId,
      assignmentId: currentAssignment.id,
      fallbackReason: 'no_escalation_targets',
      fallbackActions: [
        'broadcast_to_all_channels',
        'notify_executive_team',
        'activate_crisis_procedures',
        'consider_external_support'
      ],
      fallbackContacts: [
        'all-hands@company.com',
        'executives@company.com',
        'board@company.com'
      ],
      isActive: true,
      createdAt: new Date()
    });

    console.log(`🚨 Escalation fallback activated for incident ${incidentId}`);
    this.emit('escalation_fallback_activated', { incidentId, currentAssignment });
  }

  /**
   * Check if responder is currently available based on timezone/schedule
   */
  private isCurrentlyAvailable(responder: AvailableResponder): boolean {
    if (!responder.isAvailable) return false;

    const availability = responder.capabilities?.availabilityHours;
    if (!availability) return true; // Assume available if no schedule defined

    const now = new Date();
    const timezone = availability.timezone || 'UTC';
    
    try {
      const localTime = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(now);

      const dayName = localTime.find(part => part.type === 'weekday')?.value.toLowerCase();
      const hour = parseInt(localTime.find(part => part.type === 'hour')?.value || '0');
      const minute = parseInt(localTime.find(part => part.type === 'minute')?.value || '0');
      const currentTime = hour * 60 + minute;

      const daySchedule = availability.schedule[dayName || ''];
      if (!daySchedule) return false;

      const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
      const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      return currentTime >= startTime && currentTime <= endTime;
    } catch (error) {
      console.error('Error checking availability:', error);
      return true; // Assume available on error
    }
  }

  /**
   * Get current workload for responder
   */
  private async getResponderWorkload(responderId: string): Promise<number> {
    try {
      const [workload] = await db.select()
        .from(incidentWorkload)
        .where(eq(incidentWorkload.responderId, responderId));

      return workload?.currentIncidents || 0;
    } catch (error) {
      console.error('Error getting workload:', error);
      return 0;
    }
  }

  /**
   * Update responder workload
   */
  private async updateResponderWorkload(responderId: string, change: number): Promise<void> {
    try {
      const [existing] = await db.select()
        .from(incidentWorkload)
        .where(eq(incidentWorkload.responderId, responderId));

      if (existing) {
        await db.update(incidentWorkload)
          .set({ 
            currentIncidents: Math.max(0, existing.currentIncidents + change),
            updatedAt: new Date()
          })
          .where(eq(incidentWorkload.responderId, responderId));
      } else {
        await db.insert(incidentWorkload).values({
          id: `workload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          responderId,
          currentIncidents: Math.max(0, change),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating workload:', error);
    }
  }

  /**
   * Setup automatic escalation timer
   */
  private setupEscalationTimer(assignment: IncidentAssignment, timeoutMinutes?: number): void {
    const timeout = (timeoutMinutes || this.defaultRules.escalationTimeoutMinutes) * 60 * 1000;
    
    const timer = setTimeout(() => {
      this.escalateIncident(assignment.incidentId, 'timeout');
    }, timeout);

    // Store timer for potential cancellation
    this.escalationTimers.set(assignment.id, timer);

    console.log(`⏰ Escalation timer set for assignment ${assignment.id} (${timeoutMinutes || this.defaultRules.escalationTimeoutMinutes} minutes)`);
  }

  /**
   * Calculate expected response time based on severity
   */
  private calculateExpectedResponseTime(severity: string): number {
    switch (severity) {
      case 'critical': return 5; // 5 minutes
      case 'major': return 15; // 15 minutes
      case 'minor': return 60; // 1 hour
      default: return 30; // 30 minutes
    }
  }

  /**
   * Get incident context for assignment decisions
   */
  private async getIncidentContext(incidentId: string): Promise<IncidentContext | null> {
    try {
      // This would normally query your incidents table
      // For now, return a mock context
      return {
        id: incidentId,
        severity: 'major',
        type: 'system_outage',
        requiredSkills: ['incident_response', 'system_administration'],
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error getting incident context:', error);
      return null;
    }
  }

  /**
   * Cancel escalation timer (when incident is resolved)
   */
  public cancelEscalationTimer(assignmentId: string): void {
    const timer = this.escalationTimers.get(assignmentId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(assignmentId);
      console.log(`⏰ Escalation timer cancelled for assignment ${assignmentId}`);
    }
  }

  /**
   * Register a new responder in the system
   */
  public async registerResponder(responder: {
    id: string;
    name: string;
    email: string;
    responderType: string;
    capabilities: ResponderCapabilities;
  }): Promise<AvailableResponder> {
    const [newResponder] = await db.insert(availableResponders).values({
      id: responder.id,
      name: responder.name,
      email: responder.email,
      responderType: responder.responderType,
      isAvailable: true,
      capabilities: responder.capabilities,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log(`👤 New responder registered: ${responder.name}`);
    return newResponder;
  }

  /**
   * Update responder availability
   */
  public async updateResponderAvailability(
    responderId: string, 
    isAvailable: boolean, 
    reason?: string
  ): Promise<void> {
    await db.update(availableResponders)
      .set({ 
        isAvailable,
        statusReason: reason,
        updatedAt: new Date()
      })
      .where(eq(availableResponders.id, responderId));

    console.log(`👤 Responder ${responderId} availability updated: ${isAvailable}`);
    this.emit('responder_availability_changed', { responderId, isAvailable, reason });
  }

  /**
   * Get assignment statistics
   */
  public async getAssignmentStatistics(): Promise<{
    totalAssignments: number;
    autoAssignments: number;
    fallbackAssignments: number;
    escalations: number;
    averageResponseTime: number;
  }> {
    try {
      const assignments = await db.select().from(incidentAssignments);
      
      return {
        totalAssignments: assignments.length,
        autoAssignments: assignments.filter(a => a.assignmentType === 'auto_assigned').length,
        fallbackAssignments: assignments.filter(a => a.assignmentType === 'fallback_assigned').length,
        escalations: assignments.filter(a => a.assignmentType === 'escalated').length,
        averageResponseTime: assignments.reduce((acc, a) => acc + (a.expectedResponseTime || 0), 0) / Math.max(assignments.length, 1)
      };
    } catch (error) {
      console.error('Error getting assignment statistics:', error);
      return {
        totalAssignments: 0,
        autoAssignments: 0,
        fallbackAssignments: 0,
        escalations: 0,
        averageResponseTime: 0
      };
    }
  }
}