/**
 * API endpoints for incident communication templates
 * Provides access to standardized communication templates for incident response
 */

import { Router } from 'express';
import { StatusPageService } from '../services/StatusPageService';
import type { CommunicationTemplateType, IncidentSeverity } from '../services/IncidentCommunicationTemplates';
import { isAuthenticated } from '../replitAuth';

const router = Router();
const statusPageService = StatusPageService.getInstance();

/**
 * Get all available communication templates
 */
router.get('/templates', isAuthenticated, async (req, res) => {
  try {
    const templates = statusPageService.getAvailableTemplates();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates'
    });
  }
});

/**
 * Get template variables for a specific template type
 */
router.get('/templates/:type/variables', isAuthenticated, async (req, res) => {
  try {
    const { type } = req.params;
    const { severity } = req.query;
    
    const variables = statusPageService.getTemplateVariables(
      type as CommunicationTemplateType,
      severity as IncidentSeverity
    );
    
    res.json({
      success: true,
      variables
    });
  } catch (error) {
    console.error('Error getting template variables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template variables'
    });
  }
});

/**
 * Generate communication from template
 */
router.post('/generate', isAuthenticated, async (req, res) => {
  try {
    const { templateType, variables, severity } = req.body;
    
    if (!templateType || !variables) {
      return res.status(400).json({
        success: false,
        error: 'templateType and variables are required'
      });
    }

    const communication = statusPageService.generateCommunication(
      templateType,
      variables,
      severity
    );
    
    if (!communication) {
      return res.status(400).json({
        success: false,
        error: 'Failed to generate communication'
      });
    }

    res.json({
      success: true,
      communication
    });
  } catch (error) {
    console.error('Error generating communication:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate communication'
    });
  }
});

/**
 * Validate template variables
 */
router.post('/validate', isAuthenticated, async (req, res) => {
  try {
    const { templateType, variables, severity } = req.body;
    
    if (!templateType || !variables) {
      return res.status(400).json({
        success: false,
        error: 'templateType and variables are required'
      });
    }

    const validation = statusPageService.validateTemplateVariables(
      templateType,
      variables,
      severity
    );
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Error validating template variables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate template variables'
    });
  }
});

/**
 * Get template suggestions for incident
 */
router.get('/suggestions', isAuthenticated, async (req, res) => {
  try {
    const { severity, componentName, status } = req.query;
    
    if (!severity || !componentName || !status) {
      return res.status(400).json({
        success: false,
        error: 'severity, componentName, and status are required'
      });
    }

    const suggestions = statusPageService.getTemplateSuggestions(
      severity as IncidentSeverity,
      componentName as string,
      status as any
    );
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error getting template suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template suggestions'
    });
  }
});

/**
 * Create incident with template
 */
router.post('/incidents/create', isAuthenticated, async (req, res) => {
  try {
    const { componentId, severity, templateVariables, channels } = req.body;
    
    if (!componentId || !severity || !templateVariables) {
      return res.status(400).json({
        success: false,
        error: 'componentId, severity, and templateVariables are required'
      });
    }

    const result = await statusPageService.createIncidentWithTemplate(
      componentId,
      severity,
      templateVariables,
      channels
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error creating incident with template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create incident with template'
    });
  }
});

/**
 * Update incident with template
 */
router.put('/incidents/:incidentId/update', isAuthenticated, async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { status, templateVariables } = req.body;
    
    if (!status || !templateVariables) {
      return res.status(400).json({
        success: false,
        error: 'status and templateVariables are required'
      });
    }

    const result = await statusPageService.updateIncidentWithTemplate(
      incidentId,
      status,
      templateVariables
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error updating incident with template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update incident with template'
    });
  }
});

/**
 * Schedule maintenance with template
 */
router.post('/maintenance/schedule', isAuthenticated, async (req, res) => {
  try {
    const { componentIds, templateVariables, startTime, endTime, channels } = req.body;
    
    if (!componentIds || !templateVariables || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'componentIds, templateVariables, startTime, and endTime are required'
      });
    }

    const result = await statusPageService.scheduleMaintenanceWithTemplate(
      componentIds,
      templateVariables,
      new Date(startTime),
      new Date(endTime),
      channels
    );
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error scheduling maintenance with template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule maintenance with template'
    });
  }
});

export default router;