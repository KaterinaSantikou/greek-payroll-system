/**
 * Native Connectors API - OAuth2 flows and journal posting
 */

import type { Express } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { partners } from '@shared/schema';
import {
  ConnectorFactory,
  type ConnectorConfig,
  type ConnectorCredentials,
} from '../services/nativeConnectors';
import { GLExportCanonical } from '../services/glExportCanonical';

// In-memory storage for OAuth states and credentials (in production, use Redis or database)
const oauthStates = new Map<
  string,
  {
    partnerId: string;
    connectorType: 'xero' | 'quickbooks';
    codeVerifier?: string;
  }
>();
const connectorCredentials = new Map<string, ConnectorCredentials>();

export function nativeConnectorRoutes(app: Express) {
  // =============================================================================
  // CONNECTOR CONFIGURATION
  // =============================================================================

  const getConnectorConfig = (type: 'xero' | 'quickbooks'): ConnectorConfig => {
    const configs = {
      xero: {
        clientId: process.env.XERO_CLIENT_ID || 'demo-xero-client-id',
        clientSecret: process.env.XERO_CLIENT_SECRET || 'demo-xero-secret',
        redirectUri:
          process.env.XERO_REDIRECT_URI ||
          'http://localhost:5000/v1/connectors/xero/callback',
        scopes: [
          'accounting.transactions',
          'accounting.settings',
          'offline_access',
        ],
      },
      quickbooks: {
        clientId: process.env.QBO_CLIENT_ID || 'demo-qbo-client-id',
        clientSecret: process.env.QBO_CLIENT_SECRET || 'demo-qbo-secret',
        redirectUri:
          process.env.QBO_REDIRECT_URI ||
          'http://localhost:5000/v1/connectors/quickbooks/callback',
        scopes: [
          'com.intuit.quickbooks.accounting',
          'openid',
          'profile',
          'email',
        ],
      },
    };

    return configs[type];
  };

  // =============================================================================
  // OAUTH2 AUTHORIZATION ENDPOINTS
  // =============================================================================

  /**
   * Initiate Xero OAuth2 Flow
   * GET /v1/connectors/xero/auth?partner_id=...
   */
  app.get('/v1/connectors/xero/auth', async (req, res) => {
    try {
      const { partner_id } = req.query;

      if (!partner_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'partner_id query parameter is required',
          hint: 'Provide the partner_id to associate the connection',
        });
      }

      // Generate PKCE parameters
      const codeVerifier = crypto.randomBytes(32).toString('base64url');
      const state = crypto.randomBytes(16).toString('hex');

      // Store OAuth state
      oauthStates.set(state, {
        partnerId: partner_id as string,
        connectorType: 'xero',
        codeVerifier,
      });

      const config = getConnectorConfig('xero');
      const connector = ConnectorFactory.createConnector('xero', config);
      const authUrl = connector.getAuthUrl(state, codeVerifier);

      res.json({
        auth_url: authUrl,
        state,
        expires_in: 600, // 10 minutes
      });
    } catch (error) {
      console.error('Xero auth initiation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to initiate Xero authorization',
        hint: 'Contact system administrator if the problem persists',
      });
    }
  });

  /**
   * Xero OAuth2 Callback
   * GET /v1/connectors/xero/callback?code=...&state=...
   */
  app.get('/v1/connectors/xero/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.status(400).json({
          error: 'AUTHORIZATION_DENIED',
          detail: `Xero authorization failed: ${error}`,
          hint: 'User denied access or authorization failed',
        });
      }

      if (!code || !state) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'Authorization code and state are required',
          hint: 'Invalid callback from Xero',
        });
      }

      const oauthState = oauthStates.get(state as string);
      if (!oauthState) {
        return res.status(400).json({
          error: 'INVALID_STATE',
          detail: 'OAuth state parameter is invalid or expired',
          hint: 'Restart the authorization flow',
        });
      }

      // Clean up state
      oauthStates.delete(state as string);

      const config = getConnectorConfig('xero');
      const connector = ConnectorFactory.createConnector('xero', config);

      // Exchange code for tokens
      const tokenResponse = await connector.exchangeCodeForToken(
        code as string,
        oauthState.codeVerifier!
      );

      // Get tenant information
      const tenantResponse = await fetch('https://api.xero.com/connections', {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      });

      if (!tenantResponse.ok) {
        throw new Error('Failed to get Xero tenant information');
      }

      const tenants = await tenantResponse.json();
      const tenant = tenants[0]; // Use first tenant

      // Store credentials
      const credentials: ConnectorCredentials = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        tenantId: tenant.tenantId,
      };

      const credentialKey = `${oauthState.partnerId}-xero`;
      connectorCredentials.set(credentialKey, credentials);

      res.json({
        success: true,
        connector: 'xero',
        partner_id: oauthState.partnerId,
        tenant_id: tenant.tenantId,
        tenant_name: tenant.tenantName,
        connected_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Xero callback error:', error);
      res.status(500).json({
        error: 'CONNECTION_FAILED',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to complete Xero connection',
        hint: 'Restart the authorization flow',
      });
    }
  });

  /**
   * Initiate QuickBooks OAuth2 Flow
   * GET /v1/connectors/quickbooks/auth?partner_id=...
   */
  app.get('/v1/connectors/quickbooks/auth', async (req, res) => {
    try {
      const { partner_id } = req.query;

      if (!partner_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'partner_id query parameter is required',
          hint: 'Provide the partner_id to associate the connection',
        });
      }

      const state = crypto.randomBytes(16).toString('hex');

      // Store OAuth state
      oauthStates.set(state, {
        partnerId: partner_id as string,
        connectorType: 'quickbooks',
      });

      const config = getConnectorConfig('quickbooks');
      const connector = ConnectorFactory.createConnector('quickbooks', config);
      const authUrl = connector.getAuthUrl(state);

      res.json({
        auth_url: authUrl,
        state,
        expires_in: 600, // 10 minutes
      });
    } catch (error) {
      console.error('QuickBooks auth initiation error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to initiate QuickBooks authorization',
        hint: 'Contact system administrator if the problem persists',
      });
    }
  });

  /**
   * QuickBooks OAuth2 Callback
   * GET /v1/connectors/quickbooks/callback?code=...&state=...&realmId=...
   */
  app.get('/v1/connectors/quickbooks/callback', async (req, res) => {
    try {
      const { code, state, realmId, error } = req.query;

      if (error) {
        return res.status(400).json({
          error: 'AUTHORIZATION_DENIED',
          detail: `QuickBooks authorization failed: ${error}`,
          hint: 'User denied access or authorization failed',
        });
      }

      if (!code || !state || !realmId) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'Authorization code, state, and realmId are required',
          hint: 'Invalid callback from QuickBooks',
        });
      }

      const oauthState = oauthStates.get(state as string);
      if (!oauthState) {
        return res.status(400).json({
          error: 'INVALID_STATE',
          detail: 'OAuth state parameter is invalid or expired',
          hint: 'Restart the authorization flow',
        });
      }

      // Clean up state
      oauthStates.delete(state as string);

      const config = getConnectorConfig('quickbooks');
      const connector = ConnectorFactory.createConnector('quickbooks', config);

      // Exchange code for tokens
      const tokenResponse = await connector.exchangeCodeForToken(
        code as string
      );

      // Store credentials
      const credentials: ConnectorCredentials = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        companyId: realmId as string,
      };

      const credentialKey = `${oauthState.partnerId}-quickbooks`;
      connectorCredentials.set(credentialKey, credentials);

      res.json({
        success: true,
        connector: 'quickbooks',
        partner_id: oauthState.partnerId,
        company_id: realmId,
        connected_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('QuickBooks callback error:', error);
      res.status(500).json({
        error: 'CONNECTION_FAILED',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to complete QuickBooks connection',
        hint: 'Restart the authorization flow',
      });
    }
  });

  // =============================================================================
  // CONNECTOR MANAGEMENT ENDPOINTS
  // =============================================================================

  /**
   * Get Connector Status
   * GET /v1/connectors/:connector_type/status?partner_id=...
   */
  app.get('/v1/connectors/:connector_type/status', async (req, res) => {
    try {
      const { connector_type } = req.params;
      const { partner_id } = req.query;

      if (!partner_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'partner_id query parameter is required',
        });
      }

      if (!['xero', 'quickbooks'].includes(connector_type)) {
        return res.status(400).json({
          error: 'INVALID_CONNECTOR',
          detail: 'Supported connectors: xero, quickbooks',
        });
      }

      const credentialKey = `${partner_id}-${connector_type}`;
      const credentials = connectorCredentials.get(credentialKey);

      if (!credentials) {
        return res.json({
          connector: connector_type,
          partner_id,
          connected: false,
          status: 'not_connected',
        });
      }

      const config = getConnectorConfig(
        connector_type as 'xero' | 'quickbooks'
      );
      const connector = ConnectorFactory.createConnector(
        connector_type as 'xero' | 'quickbooks',
        config
      );
      connector.setCredentials(credentials);

      const isValid = await connector.validateConnection();

      res.json({
        connector: connector_type,
        partner_id,
        connected: isValid,
        status: isValid ? 'connected' : 'invalid_token',
        tenant_id: credentials.tenantId,
        company_id: credentials.companyId,
        expires_at: credentials.expiresAt,
        token_expires_soon:
          new Date(Date.now() + 24 * 60 * 60 * 1000) >= credentials.expiresAt, // < 24h
      });
    } catch (error) {
      console.error('Connector status error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to check connector status',
      });
    }
  });

  /**
   * Disconnect Connector
   * DELETE /v1/connectors/:connector_type?partner_id=...
   */
  app.delete('/v1/connectors/:connector_type', async (req, res) => {
    try {
      const { connector_type } = req.params;
      const { partner_id } = req.query;

      if (!partner_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'partner_id query parameter is required',
        });
      }

      const credentialKey = `${partner_id}-${connector_type}`;
      const wasConnected = connectorCredentials.has(credentialKey);

      connectorCredentials.delete(credentialKey);

      res.json({
        connector: connector_type,
        partner_id,
        disconnected: wasConnected,
        disconnected_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Connector disconnect error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to disconnect connector',
      });
    }
  });

  // =============================================================================
  // JOURNAL POSTING ENDPOINTS
  // ============================================================================="

  /**
   * Post GL Journal to Connector
   * POST /v1/connectors/:connector_type/post-journal
   */
  app.post('/v1/connectors/:connector_type/post-journal', async (req, res) => {
    try {
      const { connector_type } = req.params;
      const { partner_id, journal_id } = req.body;

      if (!partner_id || !journal_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          detail: 'partner_id and journal_id are required',
        });
      }

      if (!['xero', 'quickbooks'].includes(connector_type)) {
        return res.status(400).json({
          error: 'INVALID_CONNECTOR',
          detail: 'Supported connectors: xero, quickbooks',
        });
      }

      // Get connector credentials
      const credentialKey = `${partner_id}-${connector_type}`;
      const credentials = connectorCredentials.get(credentialKey);

      if (!credentials) {
        return res.status(400).json({
          error: 'CONNECTOR_NOT_CONNECTED',
          detail: `${connector_type} connector is not connected for partner ${partner_id}`,
          hint: 'Complete OAuth2 authorization first',
        });
      }

      // Get journal from database
      const journal = await GLExportCanonical.getJournal(journal_id);
      if (!journal) {
        return res.status(404).json({
          error: 'JOURNAL_NOT_FOUND',
          detail: `Journal ${journal_id} not found`,
        });
      }

      // Transform to canonical format
      const canonicalJournal = {
        journalId: journal.header.journalId,
        entityId: journal.header.entityId,
        period: journal.header.period,
        currency: journal.header.currency,
        description: journal.header.description || 'Payroll Journal',
        runId: journal.header.runId || undefined,
        lines: journal.lines,
      };

      // Post to external system
      const config = getConnectorConfig(
        connector_type as 'xero' | 'quickbooks'
      );
      const connector = ConnectorFactory.createConnector(
        connector_type as 'xero' | 'quickbooks',
        config
      );
      connector.setCredentials(credentials);

      const externalJournalId = await connector.postJournal(canonicalJournal);

      res.json({
        success: true,
        connector: connector_type,
        journal_id,
        external_journal_id: externalJournalId,
        partner_id,
        posted_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Journal posting error:', error);
      res.status(500).json({
        error: 'POSTING_FAILED',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to post journal to external system',
        hint: 'Check connector authentication and journal data',
      });
    }
  });

  /**
   * List Connected Systems
   * GET /v1/connectors?partner_id=...
   */
  app.get('/v1/connectors', async (req, res) => {
    try {
      const { partner_id } = req.query;

      if (!partner_id) {
        return res.status(400).json({
          error: 'MISSING_PARAMETER',
          detail: 'partner_id query parameter is required',
        });
      }

      const connectors = ['xero', 'quickbooks'].map(type => {
        const credentialKey = `${partner_id}-${type}`;
        const credentials = connectorCredentials.get(credentialKey);

        return {
          type,
          connected: !!credentials,
          tenant_id: credentials?.tenantId,
          company_id: credentials?.companyId,
          expires_at: credentials?.expiresAt,
          expires_soon: credentials
            ? new Date(Date.now() + 24 * 60 * 60 * 1000) >=
              credentials.expiresAt
            : false,
        };
      });

      res.json({
        partner_id,
        connectors,
        total_connected: connectors.filter(c => c.connected).length,
      });
    } catch (error) {
      console.error('List connectors error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        detail: 'Failed to list connectors',
      });
    }
  });
}
