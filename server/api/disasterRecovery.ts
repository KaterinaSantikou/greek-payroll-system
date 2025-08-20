/**
 * Disaster Recovery API Routes
 * Provides endpoints for managing DR exercises, restore testing, SLAs, and WORM storage
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { TabletopDRExerciseService } from '../services/TabletopDRExerciseService';
import { AutomatedRestoreTestingService } from '../services/AutomatedRestoreTestingService';
import { RPOandRTOSLAService } from '../services/RPOandRTOSLAService';
import { ObjectStorageWORMService } from '../services/ObjectStorageWORMService';
import { DisasterRecoveryInitializer } from '../services/DisasterRecoveryInitializer';
import { insertDRExerciseSchema, insertRestoreTestSchema, insertDRSLASchema, insertWORMObjectSchema } from '@shared/schema';
import { fromZodError } from 'zod-validation-error';

const router = Router();

// All DR routes require authentication
router.use(isAuthenticated);

// ========================================
// SYSTEM STATUS AND DASHBOARD
// ========================================

/**
 * Get comprehensive DR system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await DisasterRecoveryInitializer.getDRSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting DR system status:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve DR system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate executive summary report
 */
router.get('/executive-summary', async (req, res) => {
  try {
    const summary = await DisasterRecoveryInitializer.generateExecutiveSummary();
    res.json({ summary });
  } catch (error) {
    console.error('Error generating executive summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate executive summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Run DR system maintenance tasks
 */
router.post('/maintenance', async (req, res) => {
  try {
    const results = await DisasterRecoveryInitializer.runMaintenanceTasks();
    res.json({
      message: 'Maintenance tasks completed successfully',
      results
    });
  } catch (error) {
    console.error('Error running maintenance tasks:', error);
    res.status(500).json({ 
      error: 'Failed to run maintenance tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// TABLETOP DR EXERCISES
// ========================================

/**
 * List DR exercises with filtering
 */
router.get('/exercises', async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      facilitatorId: req.query.facilitatorId as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    };

    const exercises = await TabletopDRExerciseService.listExercises(filters);
    res.json(exercises);
  } catch (error) {
    console.error('Error listing DR exercises:', error);
    res.status(500).json({ 
      error: 'Failed to list DR exercises',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get DR exercise by ID
 */
router.get('/exercises/:exerciseId', async (req, res) => {
  try {
    const exercise = await TabletopDRExerciseService.getExercise(req.params.exerciseId);
    if (!exercise) {
      return res.status(404).json({ error: 'DR exercise not found' });
    }
    res.json(exercise);
  } catch (error) {
    console.error('Error getting DR exercise:', error);
    res.status(500).json({ 
      error: 'Failed to get DR exercise',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create new DR exercise
 */
router.post('/exercises', async (req, res) => {
  try {
    const validatedData = insertDRExerciseSchema.parse(req.body);
    const exercise = await TabletopDRExerciseService.createExercise(validatedData);
    res.status(201).json(exercise);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating DR exercise:', error);
    res.status(500).json({ 
      error: 'Failed to create DR exercise',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Start DR exercise
 */
router.post('/exercises/:exerciseId/start', async (req, res) => {
  try {
    const userId = req.user?.claims?.sub || 'unknown';
    const exercise = await TabletopDRExerciseService.startExercise(req.params.exerciseId, userId);
    res.json({
      message: 'DR exercise started successfully',
      exercise
    });
  } catch (error) {
    console.error('Error starting DR exercise:', error);
    res.status(500).json({ 
      error: 'Failed to start DR exercise',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Complete DR exercise with results
 */
router.post('/exercises/:exerciseId/complete', async (req, res) => {
  try {
    const { findings, actionItems, overallScore, lessonsLearned } = req.body;
    
    const exercise = await TabletopDRExerciseService.completeExercise(req.params.exerciseId, {
      findings,
      actionItems,
      overallScore,
      lessonsLearned
    });
    
    res.json({
      message: 'DR exercise completed successfully',
      exercise
    });
  } catch (error) {
    console.error('Error completing DR exercise:', error);
    res.status(500).json({ 
      error: 'Failed to complete DR exercise',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get standard DR scenarios
 */
router.get('/exercises/scenarios/standard', async (req, res) => {
  try {
    const scenarios = TabletopDRExerciseService.getStandardScenarios();
    res.json(scenarios);
  } catch (error) {
    console.error('Error getting standard scenarios:', error);
    res.status(500).json({ 
      error: 'Failed to get standard scenarios',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get DR readiness report
 */
router.get('/exercises/readiness-report', async (req, res) => {
  try {
    const report = await TabletopDRExerciseService.generateReadinessReport();
    res.json(report);
  } catch (error) {
    console.error('Error generating readiness report:', error);
    res.status(500).json({ 
      error: 'Failed to generate readiness report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Export exercise results
 */
router.get('/exercises/:exerciseId/export', async (req, res) => {
  try {
    const results = await TabletopDRExerciseService.exportExerciseResults(req.params.exerciseId);
    res.json(results);
  } catch (error) {
    console.error('Error exporting exercise results:', error);
    res.status(500).json({ 
      error: 'Failed to export exercise results',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// AUTOMATED RESTORE TESTING
// ========================================

/**
 * List restore tests with filtering
 */
router.get('/restore-tests', async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      testType: req.query.testType as string,
      environment: req.query.environment as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    };

    const tests = await AutomatedRestoreTestingService.listRestoreTests(filters);
    res.json(tests);
  } catch (error) {
    console.error('Error listing restore tests:', error);
    res.status(500).json({ 
      error: 'Failed to list restore tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get restore test by ID
 */
router.get('/restore-tests/:testId', async (req, res) => {
  try {
    const test = await AutomatedRestoreTestingService.getRestoreTest(req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Restore test not found' });
    }
    res.json(test);
  } catch (error) {
    console.error('Error getting restore test:', error);
    res.status(500).json({ 
      error: 'Failed to get restore test',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create new restore test
 */
router.post('/restore-tests', async (req, res) => {
  try {
    const validatedData = insertRestoreTestSchema.parse(req.body);
    const test = await AutomatedRestoreTestingService.createRestoreTest(validatedData);
    res.status(201).json(test);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating restore test:', error);
    res.status(500).json({ 
      error: 'Failed to create restore test',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Execute restore test
 */
router.post('/restore-tests/:testId/execute', async (req, res) => {
  try {
    const test = await AutomatedRestoreTestingService.executeRestoreTest(req.params.testId);
    res.json({
      message: 'Restore test executed successfully',
      test
    });
  } catch (error) {
    console.error('Error executing restore test:', error);
    res.status(500).json({ 
      error: 'Failed to execute restore test',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get default test suites
 */
router.get('/restore-tests/suites/default', async (req, res) => {
  try {
    const suites = AutomatedRestoreTestingService.getDefaultTestSuites();
    res.json(suites);
  } catch (error) {
    console.error('Error getting default test suites:', error);
    res.status(500).json({ 
      error: 'Failed to get default test suites',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Schedule regular automated tests
 */
router.post('/restore-tests/schedule', async (req, res) => {
  try {
    const tests = await AutomatedRestoreTestingService.scheduleRegularTests();
    res.json({
      message: 'Regular tests scheduled successfully',
      scheduledTests: tests.length,
      tests
    });
  } catch (error) {
    console.error('Error scheduling regular tests:', error);
    res.status(500).json({ 
      error: 'Failed to schedule regular tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate restore test compliance report
 */
router.get('/restore-tests/compliance-report', async (req, res) => {
  try {
    const period = (req.query.period as 'monthly' | 'quarterly' | 'yearly') || 'monthly';
    const report = await AutomatedRestoreTestingService.generateComplianceReport(period);
    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ 
      error: 'Failed to generate compliance report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// RPO/RTO SLA MANAGEMENT
// ========================================

/**
 * List SLAs with filtering
 */
router.get('/slas', async (req, res) => {
  try {
    const filters = {
      criticality: req.query.criticality as string,
      status: req.query.status as string,
      businessFunction: req.query.businessFunction as string,
      isActive: req.query.isActive === 'true',
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const slas = await RPOandRTOSLAService.listSLAs(filters);
    res.json(slas);
  } catch (error) {
    console.error('Error listing SLAs:', error);
    res.status(500).json({ 
      error: 'Failed to list SLAs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get SLA by ID
 */
router.get('/slas/:slaId', async (req, res) => {
  try {
    const sla = await RPOandRTOSLAService.getSLA(req.params.slaId);
    if (!sla) {
      return res.status(404).json({ error: 'SLA not found' });
    }
    res.json(sla);
  } catch (error) {
    console.error('Error getting SLA:', error);
    res.status(500).json({ 
      error: 'Failed to get SLA',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create new SLA
 */
router.post('/slas', async (req, res) => {
  try {
    const validatedData = insertDRSLASchema.parse(req.body);
    const sla = await RPOandRTOSLAService.createSLA(validatedData);
    res.status(201).json(sla);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const validationError = fromZodError(error);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationError.message 
      });
    }
    console.error('Error creating SLA:', error);
    res.status(500).json({ 
      error: 'Failed to create SLA',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update SLA
 */
router.patch('/slas/:slaId', async (req, res) => {
  try {
    const sla = await RPOandRTOSLAService.updateSLA(req.params.slaId, req.body);
    res.json({
      message: 'SLA updated successfully',
      sla
    });
  } catch (error) {
    console.error('Error updating SLA:', error);
    res.status(500).json({ 
      error: 'Failed to update SLA',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Archive SLA
 */
router.delete('/slas/:slaId', async (req, res) => {
  try {
    await RPOandRTOSLAService.archiveSLA(req.params.slaId);
    res.json({ message: 'SLA archived successfully' });
  } catch (error) {
    console.error('Error archiving SLA:', error);
    res.status(500).json({ 
      error: 'Failed to archive SLA',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get standard SLA templates
 */
router.get('/slas/templates/standard', async (req, res) => {
  try {
    const templates = RPOandRTOSLAService.getStandardSLATemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error getting standard SLA templates:', error);
    res.status(500).json({ 
      error: 'Failed to get standard SLA templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Calculate SLA metrics for a period
 */
router.get('/slas/:slaId/metrics', async (req, res) => {
  try {
    const periodStart = req.query.periodStart ? new Date(req.query.periodStart as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = req.query.periodEnd ? new Date(req.query.periodEnd as string) : new Date();
    
    const metrics = await RPOandRTOSLAService.calculateSLAMetrics(req.params.slaId, periodStart, periodEnd);
    res.json(metrics);
  } catch (error) {
    console.error('Error calculating SLA metrics:', error);
    res.status(500).json({ 
      error: 'Failed to calculate SLA metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate SLA dashboard
 */
router.get('/slas/dashboard', async (req, res) => {
  try {
    const dashboard = await RPOandRTOSLAService.generateSLADashboard();
    res.json(dashboard);
  } catch (error) {
    console.error('Error generating SLA dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to generate SLA dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Monitor SLA compliance (simulate incident)
 */
router.post('/slas/:slaId/monitor', async (req, res) => {
  try {
    const incident = req.body;
    const breaches = await RPOandRTOSLAService.monitorSLACompliance(req.params.slaId, incident);
    res.json({
      message: 'SLA compliance monitored',
      breaches: breaches.length,
      details: breaches
    });
  } catch (error) {
    console.error('Error monitoring SLA compliance:', error);
    res.status(500).json({ 
      error: 'Failed to monitor SLA compliance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ========================================
// WORM OBJECT STORAGE
// ========================================

/**
 * List WORM objects with filtering
 */
router.get('/worm-objects', async (req, res) => {
  try {
    const filters = {
      compliancePolicy: req.query.compliancePolicy as string,
      status: req.query.status as string,
      legalHold: req.query.legalHold === 'true',
      createdBy: req.query.createdBy as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    };

    const objects = await ObjectStorageWORMService.listWORMObjects(filters);
    res.json(objects);
  } catch (error) {
    console.error('Error listing WORM objects:', error);
    res.status(500).json({ 
      error: 'Failed to list WORM objects',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get WORM object by ID
 */
router.get('/worm-objects/:objectId', async (req, res) => {
  try {
    const object = await ObjectStorageWORMService.getWORMObject(req.params.objectId);
    if (!object) {
      return res.status(404).json({ error: 'WORM object not found' });
    }
    res.json(object);
  } catch (error) {
    console.error('Error getting WORM object:', error);
    res.status(500).json({ 
      error: 'Failed to get WORM object',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Store new WORM object
 */
router.post('/worm-objects', async (req, res) => {
  try {
    const { objectPath, objectData, policy, metadata } = req.body;
    const userId = req.user?.claims?.sub || 'unknown';
    
    const dataBuffer = Buffer.from(objectData, 'base64');
    const object = await ObjectStorageWORMService.storeWORMObject(
      objectPath,
      dataBuffer,
      policy,
      userId,
      metadata
    );
    
    res.status(201).json(object);
  } catch (error) {
    console.error('Error storing WORM object:', error);
    res.status(500).json({ 
      error: 'Failed to store WORM object',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Retrieve WORM object with access control
 */
router.get('/worm-objects/:objectId/retrieve', async (req, res) => {
  try {
    const userId = req.user?.claims?.sub || 'unknown';
    const context = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      purpose: req.query.purpose as string,
      approvalToken: req.query.approvalToken as string,
    };
    
    const result = await ObjectStorageWORMService.retrieveWORMObject(req.params.objectId, userId, context);
    
    if (!result.accessGranted) {
      return res.status(403).json({ 
        error: 'Access denied',
        object: result.object,
        integrityStatus: result.integrityStatus
      });
    }
    
    res.json({
      object: result.object,
      content: result.content?.toString('base64'),
      integrityStatus: result.integrityStatus
    });
  } catch (error) {
    console.error('Error retrieving WORM object:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve WORM object',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Verify object integrity
 */
router.post('/worm-objects/:objectId/verify', async (req, res) => {
  try {
    const verification = await ObjectStorageWORMService.verifyObjectIntegrity(req.params.objectId);
    res.json(verification);
  } catch (error) {
    console.error('Error verifying object integrity:', error);
    res.status(500).json({ 
      error: 'Failed to verify object integrity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Manage legal hold status
 */
router.post('/worm-objects/:objectId/legal-hold', async (req, res) => {
  try {
    const { holdStatus, reason, approvalToken } = req.body;
    const userId = req.user?.claims?.sub || 'unknown';
    
    const object = await ObjectStorageWORMService.manageLegalHold(
      req.params.objectId,
      holdStatus,
      userId,
      reason,
      approvalToken
    );
    
    res.json({
      message: `Legal hold ${holdStatus ? 'applied' : 'removed'} successfully`,
      object
    });
  } catch (error) {
    console.error('Error managing legal hold:', error);
    res.status(500).json({ 
      error: 'Failed to manage legal hold',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check deletion eligibility
 */
router.get('/worm-objects/:objectId/deletion-eligibility', async (req, res) => {
  try {
    const eligibility = await ObjectStorageWORMService.checkDeletionEligibility(req.params.objectId);
    res.json(eligibility);
  } catch (error) {
    console.error('Error checking deletion eligibility:', error);
    res.status(500).json({ 
      error: 'Failed to check deletion eligibility',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Generate WORM compliance report
 */
router.get('/worm-objects/compliance-report', async (req, res) => {
  try {
    const filters = {
      compliancePolicy: req.query.compliancePolicy as string,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    };
    
    const report = await ObjectStorageWORMService.generateComplianceReport(filters);
    res.json(report);
  } catch (error) {
    console.error('Error generating WORM compliance report:', error);
    res.status(500).json({ 
      error: 'Failed to generate WORM compliance report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Run scheduled integrity checks
 */
router.post('/worm-objects/integrity-check', async (req, res) => {
  try {
    const results = await ObjectStorageWORMService.runScheduledIntegrityCheck();
    res.json({
      message: 'Integrity check completed',
      results
    });
  } catch (error) {
    console.error('Error running integrity check:', error);
    res.status(500).json({ 
      error: 'Failed to run integrity check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;