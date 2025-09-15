/**
 * Disaster Mode API Routes
 * Routes disaster mode endpoints to the One-Click Flow service for backward compatibility
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { oneClickFlowRoutes } from './oneClickFlow';

const router = Router();

// All disaster mode routes require authentication
router.use(isAuthenticated);

// Route /api/disaster/freeze to the one-click flow freeze endpoint
router.post('/freeze', oneClickFlowRoutes.freezeRunAndGenerateKit);

// Route /api/disaster/reconcile/:freezeId to the reconciliation endpoint
router.post('/reconcile/:freezeId', oneClickFlowRoutes.uploadReconciliation);

// Additional disaster endpoints for compatibility
router.get('/status/:runId', oneClickFlowRoutes.getDisasterModeStatus);
router.get('/download/:freezeId', oneClickFlowRoutes.downloadOfflineKit);
router.get('/pre-checks/:runId', oneClickFlowRoutes.performPreChecks);

export default router;
