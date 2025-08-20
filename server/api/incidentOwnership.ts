/**
 * Incident Ownership API Routes
 * Handles automatic incident assignment when no named owners exist
 */

import { Router } from 'express';
import { IncidentOwnershipService } from '../services/IncidentOwnershipService';
import { isAuthenticated } from '../replitAuth';

const router = Router();
const ownershipService = IncidentOwnershipService.getInstance();

/**
 * Auto-assign incident when no owner is available
 */
router.post('/assign/:incidentId', isAuthenticated, async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { severity, type, requiredSkills, componentId } = req.body;

    const incidentContext = {
      id: incidentId,
      severity: severity || 'major',
      type: type || 'unknown',
      requiredSkills: requiredSkills || [],
      createdAt: new Date(),
      componentId
    };

    const assignment = await ownershipService.autoAssignIncident(incidentContext);

    if (!assignment) {
      return res.status(500).json({
        success: false,
        error: 'Failed to assign incident'
      });
    }

    res.json({
      success: true,
      assignment,
      message: assignment.assignmentType === 'fallback_assigned' 
        ? 'Incident assigned to fallback pool due to no available responders'
        : 'Incident automatically assigned'
    });
  } catch (error) {
    console.error('Error auto-assigning incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-assign incident'
    });
  }
});

/**
 * Escalate incident when no escalation matrix exists
 */
router.post('/escalate/:incidentId', isAuthenticated, async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { reason } = req.body;

    await ownershipService.escalateIncident(incidentId, reason || 'manual_escalation');

    res.json({
      success: true,
      message: 'Incident escalated successfully'
    });
  } catch (error) {
    console.error('Error escalating incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to escalate incident'
    });
  }
});

/**
 * Register a new responder
 */
router.post('/responders', isAuthenticated, async (req, res) => {
  try {
    const { name, email, responderType, capabilities } = req.body;
    const userId = (req.user as any)?.claims?.sub;

    if (!name || !email || !responderType) {
      return res.status(400).json({
        success: false,
        error: 'name, email, and responderType are required'
      });
    }

    const responder = await ownershipService.registerResponder({
      id: userId || `responder_${Date.now()}`,
      name,
      email,
      responderType,
      capabilities: capabilities || {
        skills: [],
        maxConcurrentIncidents: 3,
        availabilityHours: {
          timezone: 'UTC',
          schedule: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' },
            saturday: null,
            sunday: null
          }
        },
        escalationLevel: 1,
        canEscalateTo: []
      }
    });

    res.json({
      success: true,
      responder
    });
  } catch (error) {
    console.error('Error registering responder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register responder'
    });
  }
});

/**
 * Update responder availability
 */
router.put('/responders/:responderId/availability', isAuthenticated, async (req, res) => {
  try {
    const { responderId } = req.params;
    const { isAvailable, reason } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isAvailable must be a boolean'
      });
    }

    await ownershipService.updateResponderAvailability(responderId, isAvailable, reason);

    res.json({
      success: true,
      message: 'Responder availability updated'
    });
  } catch (error) {
    console.error('Error updating responder availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update responder availability'
    });
  }
});

/**
 * Get assignment statistics
 */
router.get('/statistics', isAuthenticated, async (req, res) => {
  try {
    const statistics = await ownershipService.getAssignmentStatistics();

    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error getting assignment statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assignment statistics'
    });
  }
});

/**
 * Get current incident assignments
 */
router.get('/assignments', isAuthenticated, async (req, res) => {
  try {
    const { status, assigneeId, incidentId } = req.query;

    // This would normally query the assignments table with filters
    // For now, return a basic response
    res.json({
      success: true,
      assignments: [],
      message: 'Assignment query completed'
    });
  } catch (error) {
    console.error('Error getting assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assignments'
    });
  }
});

/**
 * Cancel assignment escalation timer
 */
router.delete('/assignments/:assignmentId/escalation', isAuthenticated, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    ownershipService.cancelEscalationTimer(assignmentId);

    res.json({
      success: true,
      message: 'Escalation timer cancelled'
    });
  } catch (error) {
    console.error('Error cancelling escalation timer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel escalation timer'
    });
  }
});

/**
 * Get fallback escalation actions
 */
router.get('/fallback-actions/:incidentId', isAuthenticated, async (req, res) => {
  try {
    const { incidentId } = req.params;

    // Return standard fallback actions when no escalation matrix exists
    const fallbackActions = {
      immediate: [
        'notify_all_available_responders',
        'post_in_emergency_channel',
        'page_on_call_manager'
      ],
      escalated: [
        'notify_executive_team',
        'activate_crisis_procedures',
        'consider_external_support'
      ],
      critical: [
        'activate_emergency_broadcast',
        'notify_board_members',
        'engage_crisis_management_team'
      ]
    };

    res.json({
      success: true,
      incidentId,
      fallbackActions,
      message: 'Fallback actions retrieved (no escalation matrix defined)'
    });
  } catch (error) {
    console.error('Error getting fallback actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fallback actions'
    });
  }
});

export default router;