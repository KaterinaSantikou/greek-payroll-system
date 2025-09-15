/**
 * Integrations Status API - Monitor external service readiness
 */

import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';

const router = Router();

/**
 * GET /api/integrations/status
 * Check status of external integrations (MyDATA, ERGANI, Banking)
 */
router.get('/status', (req, res) => {
  if (!req.isAuthenticated?.()) {
    return res.status(401).json({
      error: 'unauthorized',
      hint: 'Please sign in to access integration status.',
      login_url: '/api/login',
    });
  }

  try {
    const integrationStatus = {
      mydata: {
        configured: !!(
          process.env.MYDATA_CLIENT_ID && process.env.MYDATA_SECRET
        ),
        endpoint: process.env.MYDATA_ENDPOINT || 'not_configured',
        description: 'Greek Tax Authority digital filing system',
      },
      ergani: {
        configured: !!(
          process.env.ERGANI_USERNAME && process.env.ERGANI_PASSWORD
        ),
        endpoint: process.env.ERGANI_ENDPOINT || 'not_configured',
        description: 'Greek Labor Ministry employment notification system',
      },
      banking: {
        profiles: 0, // TODO: count from DB when banking profiles implemented
        configured: false,
        description: 'SEPA payment processing and bank integrations',
      },
      efka: {
        configured: !!(process.env.EFKA_USERNAME && process.env.EFKA_PASSWORD),
        endpoint: process.env.EFKA_ENDPOINT || 'not_configured',
        description: 'Greek social insurance authority system',
      },
      aade: {
        configured: !!(process.env.AADE_API_KEY && process.env.AADE_ENDPOINT),
        endpoint: process.env.AADE_ENDPOINT || 'not_configured',
        description: 'Greek tax authority API services',
      },
    };

    // Calculate overall readiness score
    const totalIntegrations = Object.keys(integrationStatus).length;
    const configuredCount = Object.values(integrationStatus).filter(
      status => status.configured
    ).length;
    const readinessScore = Math.round(
      (configuredCount / totalIntegrations) * 100
    );

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      readiness_score: `${readinessScore}%`,
      configured_count: configuredCount,
      total_integrations: totalIntegrations,
      integrations: integrationStatus,
      warnings: generateWarnings(integrationStatus),
    });
  } catch (error) {
    console.error('[INTEGRATIONS] Error checking status:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to check integrations status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate configuration warnings for administrators
 */
function generateWarnings(integrations: any): string[] {
  const warnings: string[] = [];

  if (!integrations.mydata.configured) {
    warnings.push('MyDATA not configured - tax filings will not be automated');
  }

  if (!integrations.ergani.configured) {
    warnings.push(
      'ERGANI not configured - employment notifications will not be automated'
    );
  }

  if (!integrations.banking.configured) {
    warnings.push(
      'Banking profiles not configured - SEPA payments unavailable'
    );
  }

  if (!integrations.efka.configured) {
    warnings.push(
      'e-EFKA not configured - social insurance filings will not be automated'
    );
  }

  if (!integrations.aade.configured) {
    warnings.push('AADE API not configured - tax services unavailable');
  }

  return warnings;
}

/**
 * GET /api/integrations/debug
 * Debug endpoint to check current session and authentication state (protected)
 */
router.get('/debug', (req, res) => {
  if (!req.isAuthenticated?.()) {
    return res.status(401).json({
      error: 'unauthorized',
      hint: 'Please sign in to access debug information.',
      login_url: '/api/login',
    });
  }

  try {
    const sessionId = (req as any).sessionID || 'no_session_id';
    const user = (req as any).user || {};

    res.json({
      status: 'authenticated',
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      user: {
        id: user.id || 'no_id',
        email: user.email || 'no_email',
        name: user.name || 'no_name',
      },
      roles: user.roles || [],
      session_info: {
        has_session: !!(req as any).session,
        session_cookie: (req as any).session?.cookie || {},
        authenticated: req.isAuthenticated?.() || false,
      },
    });
  } catch (error) {
    console.error('[DEBUG] Error getting debug info:', error);
    res.status(500).json({
      error: 'debug_error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
