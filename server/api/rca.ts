/**
 * Root Cause Analysis API Routes
 * Provides endpoints for managing RCA processes and templates
 */

import { Router } from 'express';
import { RootCauseAnalysisService } from '../services/RootCauseAnalysisService';
import type { RCAMethodology, RCASeverity, ActionItemPriority, ActionItemStatus } from '../services/RootCauseAnalysisService';
import { isAuthenticated } from '../replitAuth';

const router = Router();
const rcaService = RootCauseAnalysisService.getInstance();

/**
 * Get available RCA templates
 */
router.get('/templates', isAuthenticated, async (req, res) => {
  try {
    const templates = rcaService.getAvailableTemplates();
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error getting RCA templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get RCA templates'
    });
  }
});

/**
 * Get specific RCA template
 */
router.get('/templates/:methodology', isAuthenticated, async (req, res) => {
  try {
    const { methodology } = req.params;
    const template = rcaService.getTemplate(methodology as RCAMethodology);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error getting RCA template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get RCA template'
    });
  }
});

/**
 * Create new RCA analysis
 */
router.post('/analyses', isAuthenticated, async (req, res) => {
  try {
    const { incidentId, methodology, participants, severity, title, description } = req.body;
    const facilitator = (req.user as any)?.claims?.sub;
    
    if (!methodology || !participants || !severity || !title || !facilitator) {
      return res.status(400).json({
        success: false,
        error: 'methodology, participants, severity, title, and facilitator are required'
      });
    }

    const analysis = await rcaService.createRCAAnalysis({
      incidentId,
      methodology: methodology as RCAMethodology,
      facilitator,
      participants,
      severity: severity as RCASeverity,
      title,
      description
    });

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error creating RCA analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create RCA analysis'
    });
  }
});

/**
 * Get RCA analyses with filtering
 */
router.get('/analyses', isAuthenticated, async (req, res) => {
  try {
    const { status, methodology, facilitator, dateFrom, dateTo } = req.query;
    
    const filters: any = {};
    
    if (status) {
      filters.status = Array.isArray(status) ? status : [status];
    }
    
    if (methodology) {
      filters.methodology = Array.isArray(methodology) ? methodology : [methodology];
    }
    
    if (facilitator) {
      filters.facilitator = facilitator as string;
    }
    
    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom as string);
    }
    
    if (dateTo) {
      filters.dateTo = new Date(dateTo as string);
    }

    const analyses = await rcaService.getRCAAnalyses(filters);

    res.json({
      success: true,
      analyses
    });
  } catch (error) {
    console.error('Error getting RCA analyses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get RCA analyses'
    });
  }
});

/**
 * Get specific RCA analysis with all data
 */
router.get('/analyses/:analysisId', isAuthenticated, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const result = await rcaService.getRCAResult(analysisId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'RCA analysis not found'
      });
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting RCA analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get RCA analysis'
    });
  }
});

/**
 * Update RCA analysis status
 */
router.put('/analyses/:analysisId/status', isAuthenticated, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { status } = req.body;
    const updatedBy = (req.user as any)?.claims?.sub;
    
    if (!status || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: 'status and updatedBy are required'
      });
    }

    await rcaService.updateRCAStatus(analysisId, status, updatedBy);

    res.json({
      success: true,
      message: 'RCA status updated successfully'
    });
  } catch (error) {
    console.error('Error updating RCA status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update RCA status'
    });
  }
});

/**
 * Add finding to RCA
 */
router.post('/analyses/:analysisId/findings', isAuthenticated, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { category, finding, evidence, severity } = req.body;
    const addedBy = (req.user as any)?.claims?.sub;
    
    if (!category || !finding || !severity || !addedBy) {
      return res.status(400).json({
        success: false,
        error: 'category, finding, severity, and addedBy are required'
      });
    }

    const rcaFinding = await rcaService.addFinding({
      analysisId,
      category,
      finding,
      evidence: evidence || '',
      severity: severity as RCASeverity,
      addedBy
    });

    res.json({
      success: true,
      finding: rcaFinding
    });
  } catch (error) {
    console.error('Error adding RCA finding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add RCA finding'
    });
  }
});

/**
 * Add action item to RCA
 */
router.post('/analyses/:analysisId/action-items', isAuthenticated, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const { title, description, assignee, priority, dueDate } = req.body;
    const createdBy = (req.user as any)?.claims?.sub;
    
    if (!title || !assignee || !priority || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'title, assignee, priority, and createdBy are required'
      });
    }

    const actionItem = await rcaService.addActionItem({
      analysisId,
      title,
      description: description || '',
      assignee,
      priority: priority as ActionItemPriority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy
    });

    res.json({
      success: true,
      actionItem
    });
  } catch (error) {
    console.error('Error adding RCA action item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add RCA action item'
    });
  }
});

/**
 * Update action item status
 */
router.put('/action-items/:actionItemId/status', isAuthenticated, async (req, res) => {
  try {
    const { actionItemId } = req.params;
    const { status, notes } = req.body;
    const updatedBy = (req.user as any)?.claims?.sub;
    
    if (!status || !updatedBy) {
      return res.status(400).json({
        success: false,
        error: 'status and updatedBy are required'
      });
    }

    await rcaService.updateActionItemStatus(
      actionItemId,
      status as ActionItemStatus,
      updatedBy,
      notes
    );

    res.json({
      success: true,
      message: 'Action item status updated successfully'
    });
  } catch (error) {
    console.error('Error updating action item status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update action item status'
    });
  }
});

/**
 * Generate RCA summary report
 */
router.get('/analyses/:analysisId/summary', isAuthenticated, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const summary = await rcaService.generateRCASummary(analysisId);

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error generating RCA summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate RCA summary'
    });
  }
});

/**
 * Get RCA statistics
 */
router.get('/statistics', isAuthenticated, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const filters: any = {};
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    
    const analyses = await rcaService.getRCAAnalyses(filters);
    
    const statistics = {
      total: analyses.length,
      byStatus: analyses.reduce((acc, analysis) => {
        acc[analysis.status] = (acc[analysis.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byMethodology: analyses.reduce((acc, analysis) => {
        acc[analysis.methodology] = (acc[analysis.methodology] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: analyses.reduce((acc, analysis) => {
        acc[analysis.severity] = (acc[analysis.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageDuration: analyses
        .filter(a => a.completedAt && a.startedAt)
        .reduce((acc, analysis) => {
          const duration = new Date(analysis.completedAt!).getTime() - new Date(analysis.startedAt!).getTime();
          return acc + duration;
        }, 0) / analyses.filter(a => a.completedAt && a.startedAt).length || 0,
      completionRate: analyses.filter(a => a.status === 'completed').length / Math.max(analyses.length, 1) * 100
    };

    res.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error getting RCA statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get RCA statistics'
    });
  }
});

export default router;