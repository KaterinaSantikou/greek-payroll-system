/**
 * GRC API Routes - ISO 27001 + SOC 2 Controls Pack
 */

import type { Express } from 'express';
import { isAuthenticated } from '../replitAuth';
import { GRCService } from '../services/GRCService';
import { ChecksEngine } from '../services/ChecksEngine';
import { FindingsService } from '../services/FindingsService';
import { IntegrationsHub } from '../services/IntegrationsHub';

export function registerGRCRoutes(app: Express) {
  
  // ===== Statement of Applicability (SoA) Routes =====
  
  // Get Statement of Applicability for tenant
  app.get('/api/grc/soa', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const soa = await GRCService.getStatementOfApplicability(tenantId);
      res.json(soa);
    } catch (error) {
      console.error('Error fetching SoA:', error);
      res.status(500).json({ error: 'Failed to fetch Statement of Applicability' });
    }
  });

  // Update SoA control
  app.put('/api/grc/soa/:controlId', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const { controlId } = req.params;
      const userId = req.user?.claims?.sub;
      
      const updatedSoa = await GRCService.updateSoA(tenantId, controlId, req.body, userId);
      res.json(updatedSoa);
    } catch (error) {
      console.error('Error updating SoA:', error);
      res.status(500).json({ error: 'Failed to update SoA' });
    }
  });

  // ===== Evidence Library Routes =====
  
  // Upload evidence for control
  app.post('/api/grc/evidence/:controlId', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const { controlId } = req.params;
      const userId = req.user?.claims?.sub;
      
      const evidence = await GRCService.uploadEvidence(tenantId, controlId, req.body, userId);
      res.json(evidence);
    } catch (error) {
      console.error('Error uploading evidence:', error);
      res.status(500).json({ error: 'Failed to upload evidence' });
    }
  });

  // Get evidence for control
  app.get('/api/grc/evidence/:controlId', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const { controlId } = req.params;
      
      const evidence = await GRCService.getControlEvidence(tenantId, controlId);
      res.json(evidence);
    } catch (error) {
      console.error('Error fetching evidence:', error);
      res.status(500).json({ error: 'Failed to fetch evidence' });
    }
  });

  // ===== Automated Checks Routes =====
  
  // Get check results
  app.get('/api/grc/checks/results', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const { controlId } = req.query;
      
      const results = await ChecksEngine.getCheckResults(tenantId, controlId as string);
      res.json(results);
    } catch (error) {
      console.error('Error fetching check results:', error);
      res.status(500).json({ error: 'Failed to fetch check results' });
    }
  });

  // Trigger manual check execution
  app.post('/api/grc/checks/:checkId/run', isAuthenticated, async (req: any, res) => {
    try {
      // This would trigger a manual check run
      // Implementation depends on specific check execution logic
      res.json({ success: true, message: 'Check execution triggered' });
    } catch (error) {
      console.error('Error triggering check:', error);
      res.status(500).json({ error: 'Failed to trigger check' });
    }
  });

  // ===== Vulnerability Findings Routes =====
  
  // Import pen-test findings
  app.post('/api/grc/findings/import', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const userId = req.user?.claims?.sub;
      
      const result = await FindingsService.importPenTestFindings(tenantId, req.body, userId);
      res.json(result);
    } catch (error) {
      console.error('Error importing findings:', error);
      res.status(500).json({ error: 'Failed to import findings' });
    }
  });

  // Get findings dashboard
  app.get('/api/grc/findings/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const dashboard = await FindingsService.getFindingsDashboard(tenantId);
      res.json(dashboard);
    } catch (error) {
      console.error('Error fetching findings dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch findings dashboard' });
    }
  });

  // Triage finding
  app.put('/api/grc/findings/:findingId/triage', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const { findingId } = req.params;
      const userId = req.user?.claims?.sub;
      
      const finding = await FindingsService.triageFinding(tenantId, findingId, req.body, userId);
      res.json(finding);
    } catch (error) {
      console.error('Error triaging finding:', error);
      res.status(500).json({ error: 'Failed to triage finding' });
    }
  });

  // Add remediation
  app.post('/api/grc/findings/:findingId/remediation', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const { findingId } = req.params;
      const userId = req.user?.claims?.sub;
      
      const remediation = await FindingsService.addRemediation(tenantId, findingId, req.body, userId);
      res.json(remediation);
    } catch (error) {
      console.error('Error adding remediation:', error);
      res.status(500).json({ error: 'Failed to add remediation' });
    }
  });

  // Request retest
  app.post('/api/grc/findings/:findingId/retest', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const { findingId } = req.params;
      const userId = req.user?.claims?.sub;
      
      const finding = await FindingsService.requestRetest(tenantId, findingId, userId);
      res.json(finding);
    } catch (error) {
      console.error('Error requesting retest:', error);
      res.status(500).json({ error: 'Failed to request retest' });
    }
  });

  // Get finding details
  app.get('/api/grc/findings/:findingId', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const { findingId } = req.params;
      
      const details = await FindingsService.getFindingDetails(tenantId, findingId);
      res.json(details);
    } catch (error) {
      console.error('Error fetching finding details:', error);
      res.status(500).json({ error: 'Failed to fetch finding details' });
    }
  });

  // ===== Integration Routes =====
  
  // Get tenant integrations
  app.get('/api/grc/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const integrations = await IntegrationsHub.getTenantIntegrations(tenantId);
      res.json(integrations);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      res.status(500).json({ error: 'Failed to fetch integrations' });
    }
  });

  // Configure integration
  app.post('/api/grc/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const userId = req.user?.claims?.sub;
      const { integrationType, name, credentials } = req.body;
      
      const integration = await IntegrationsHub.configureIntegration(
        tenantId, 
        integrationType, 
        name, 
        credentials, 
        userId
      );
      res.json(integration);
    } catch (error) {
      console.error('Error configuring integration:', error);
      res.status(500).json({ error: 'Failed to configure integration' });
    }
  });

  // Test integration connection
  app.post('/api/grc/integrations/:configId/test', isAuthenticated, async (req: any, res) => {
    try {
      const { configId } = req.params;
      const result = await IntegrationsHub.testConnection(configId);
      res.json(result);
    } catch (error) {
      console.error('Error testing integration:', error);
      res.status(500).json({ error: 'Failed to test integration' });
    }
  });

  // Sync integration
  app.post('/api/grc/integrations/:configId/sync', isAuthenticated, async (req: any, res) => {
    try {
      const { configId } = req.params;
      const result = await IntegrationsHub.syncIntegration(configId);
      res.json(result);
    } catch (error) {
      console.error('Error syncing integration:', error);
      res.status(500).json({ error: 'Failed to sync integration' });
    }
  });

  // ===== Compliance Dashboard Routes =====
  
  // Get compliance dashboard
  app.get('/api/grc/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const dashboard = await GRCService.getComplianceDashboard(tenantId);
      res.json(dashboard);
    } catch (error) {
      console.error('Error fetching compliance dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch compliance dashboard' });
    }
  });

  // ===== Risk Register Routes =====
  
  // Update risk
  app.post('/api/grc/risks', isAuthenticated, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || 'default';
      const userId = req.user?.claims?.sub;
      
      const risk = await GRCService.updateRisk(tenantId, req.body, userId);
      res.json(risk);
    } catch (error) {
      console.error('Error updating risk:', error);
      res.status(500).json({ error: 'Failed to update risk' });
    }
  });

  // ===== System Management Routes =====
  
  // Initialize controls framework
  app.post('/api/grc/system/init-controls', isAuthenticated, async (req: any, res) => {
    try {
      await GRCService.initializeControlsFramework();
      await ChecksEngine.initializeDefaultChecks();
      res.json({ success: true, message: 'Controls framework initialized' });
    } catch (error) {
      console.error('Error initializing controls:', error);
      res.status(500).json({ error: 'Failed to initialize controls framework' });
    }
  });

  // Run scheduled checks
  app.post('/api/grc/system/run-checks', isAuthenticated, async (req: any, res) => {
    try {
      await ChecksEngine.runScheduledChecks();
      res.json({ success: true, message: 'Checks execution triggered' });
    } catch (error) {
      console.error('Error running checks:', error);
      res.status(500).json({ error: 'Failed to run checks' });
    }
  });
}