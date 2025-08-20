/**
 * Incident Response Ownership API Routes
 * Handles clear incident response ownership with named roles and responsibilities
 */

import { Router } from 'express';
import { IncidentResponseOwnershipService } from '../services/IncidentResponseOwnershipService';
import { isAuthenticated } from '../replitAuth';

const router = Router();
const ownershipService = IncidentResponseOwnershipService.getInstance();

/**
 * Create a new incident response role
 */
router.post('/roles', isAuthenticated, async (req, res) => {
  try {
    const {
      roleName,
      description,
      responsibilities,
      requiredSkills,
      requiredCertifications,
      escalationLevel,
      maxConcurrentIncidents,
      responseTimeMinutes
    } = req.body;

    if (!roleName) {
      return res.status(400).json({
        success: false,
        error: 'roleName is required'
      });
    }

    const role = await ownershipService.createRole({
      roleName,
      description: description || '',
      responsibilities: responsibilities || [],
      requiredSkills: requiredSkills || [],
      requiredCertifications: requiredCertifications || [],
      escalationLevel: escalationLevel || 1,
      maxConcurrentIncidents: maxConcurrentIncidents || 3,
      responseTimeMinutes: responseTimeMinutes || 15
    });

    res.json({
      success: true,
      role
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incident response role'
    });
  }
});

/**
 * Create a new incident response team
 */
router.post('/teams', isAuthenticated, async (req, res) => {
  try {
    const {
      teamName,
      description,
      teamType,
      teamLead,
      escalationTargets,
      oncallSettings
    } = req.body;

    if (!teamName || !teamType) {
      return res.status(400).json({
        success: false,
        error: 'teamName and teamType are required'
      });
    }

    const team = await ownershipService.createTeam({
      teamName,
      description: description || '',
      teamType,
      teamLead,
      escalationTargets: escalationTargets || [],
      oncallSettings
    });

    res.json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incident response team'
    });
  }
});

/**
 * Assign a role to a team
 */
router.post('/assignments', isAuthenticated, async (req, res) => {
  try {
    const {
      teamId,
      roleId,
      personId,
      personName,
      personEmail,
      personPhone,
      isPrimary,
      isOncall
    } = req.body;

    if (!teamId || !roleId || !personId || !personName || !personEmail) {
      return res.status(400).json({
        success: false,
        error: 'teamId, roleId, personId, personName, and personEmail are required'
      });
    }

    const assignment = await ownershipService.assignRoleToTeam({
      teamId,
      roleId,
      personId,
      personName,
      personEmail,
      personPhone,
      isPrimary: isPrimary || false,
      isOncall: isOncall || false
    });

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error creating role assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign role to team'
    });
  }
});

/**
 * Create escalation matrix
 */
router.post('/escalation-matrix', isAuthenticated, async (req, res) => {
  try {
    const {
      incidentType,
      severity,
      initialResponse,
      escalationLevels
    } = req.body;

    if (!incidentType || !severity || !initialResponse) {
      return res.status(400).json({
        success: false,
        error: 'incidentType, severity, and initialResponse are required'
      });
    }

    const matrix = await ownershipService.createEscalationMatrix({
      incidentType,
      severity,
      initialResponse,
      escalationLevels: escalationLevels || []
    });

    res.json({
      success: true,
      matrix
    });
  } catch (error) {
    console.error('Error creating escalation matrix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create escalation matrix'
    });
  }
});

/**
 * Get incident response assignment
 */
router.post('/assignment-request', isAuthenticated, async (req, res) => {
  try {
    const {
      incidentId,
      severity,
      category,
      requiredRoles,
      assignmentReason
    } = req.body;
    
    const assignedBy = (req.user as any)?.claims?.sub || 'system';

    if (!incidentId || !severity || !category) {
      return res.status(400).json({
        success: false,
        error: 'incidentId, severity, and category are required'
      });
    }

    const assignment = await ownershipService.getIncidentResponseAssignment({
      incidentId,
      severity,
      category,
      requiredRoles: requiredRoles || [],
      assignmentReason: assignmentReason || 'standard_assignment',
      assignedBy
    });

    res.json({
      success: true,
      assignment
    });
  } catch (error) {
    console.error('Error getting incident assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incident response assignment'
    });
  }
});

/**
 * Get all roles
 */
router.get('/roles', isAuthenticated, async (req, res) => {
  try {
    const roles = await ownershipService.getAllRoles();
    
    res.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incident response roles'
    });
  }
});

/**
 * Get all teams
 */
router.get('/teams', isAuthenticated, async (req, res) => {
  try {
    const teams = await ownershipService.getAllTeams();
    
    res.json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Error getting teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get incident response teams'
    });
  }
});

/**
 * Get team assignments
 */
router.get('/teams/:teamId/assignments', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const assignments = await ownershipService.getTeamAssignments(teamId);
    
    res.json({
      success: true,
      ...assignments
    });
  } catch (error) {
    console.error('Error getting team assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team assignments'
    });
  }
});

/**
 * Update on-call rotation
 */
router.put('/teams/:teamId/oncall', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    const {
      currentOncall,
      backupOncall,
      rotationDate
    } = req.body;

    if (!currentOncall || !backupOncall) {
      return res.status(400).json({
        success: false,
        error: 'currentOncall and backupOncall are required'
      });
    }

    await ownershipService.updateOncallRotation(teamId, {
      currentOncall,
      backupOncall,
      rotationDate: rotationDate ? new Date(rotationDate) : new Date()
    });

    res.json({
      success: true,
      message: 'On-call rotation updated successfully'
    });
  } catch (error) {
    console.error('Error updating on-call rotation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update on-call rotation'
    });
  }
});

/**
 * Get response statistics
 */
router.get('/statistics', isAuthenticated, async (req, res) => {
  try {
    const statistics = await ownershipService.getResponseStatistics();
    
    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error getting response statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get response statistics'
    });
  }
});

/**
 * Initialize default response structure
 */
router.post('/initialize-defaults', isAuthenticated, async (req, res) => {
  try {
    await ownershipService.createDefaultResponseStructure();
    
    res.json({
      success: true,
      message: 'Default incident response structure created'
    });
  } catch (error) {
    console.error('Error creating default structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create default response structure'
    });
  }
});

export default router;