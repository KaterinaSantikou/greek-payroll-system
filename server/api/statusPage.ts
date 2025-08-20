/**
 * Status Page API Routes
 * Provides both public and authenticated endpoints for status information
 */

import { Router } from 'express';
import { StatusPageService } from '../services/StatusPageService';
import { isAuthenticated } from '../replitAuth';

const router = Router();
const statusPageService = StatusPageService.getInstance();

// Public status endpoint (no auth required)
router.get('/public/status', async (req, res) => {
  try {
    const status = await statusPageService.getPublicStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get public status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Public subscription endpoint
router.post('/public/subscribe', async (req, res) => {
  try {
    const { email, components } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await statusPageService.subscribeToUpdates(email, components);
    res.json({ success: true, message: 'Subscription created successfully' });
  } catch (error) {
    console.error('Failed to create subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Authenticated endpoints for internal status page management
router.use(isAuthenticated);

// Get detailed system status (internal)
router.get('/status', async (req, res) => {
  try {
    const status = await statusPageService.getSystemStatus();
    res.json(status);
  } catch (error) {
    console.error('Failed to get system status:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// Update component status (admin only)
router.put('/components/:componentId/status', async (req, res) => {
  try {
    const { componentId } = req.params;
    const { status, message } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    await statusPageService.updateComponentStatus(componentId, status, message);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update component status:', error);
    res.status(500).json({ error: 'Failed to update component status' });
  }
});

// Create incident
router.post('/incidents', async (req, res) => {
  try {
    const { title, description, severity, affectedComponents, status } = req.body;

    if (!title || !description || !severity || !affectedComponents) {
      return res.status(400).json({ error: 'Title, description, severity, and affected components are required' });
    }

    const incident = await statusPageService.createIncident({
      title,
      description,
      severity,
      affectedComponents,
      status,
    });

    res.json(incident);
  } catch (error) {
    console.error('Failed to create incident:', error);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

// Update incident
router.put('/incidents/:incidentId', async (req, res) => {
  try {
    const { incidentId } = req.params;
    const { description, status, updates } = req.body;

    await statusPageService.updateIncident(incidentId, {
      description,
      status,
      updates,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

// Schedule maintenance
router.post('/maintenance', async (req, res) => {
  try {
    const { title, description, scheduledStart, scheduledEnd, affectedComponents } = req.body;

    if (!title || !description || !scheduledStart || !scheduledEnd || !affectedComponents) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const maintenance = await statusPageService.scheduleMaintenance({
      title,
      description,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      affectedComponents,
    });

    res.json(maintenance);
  } catch (error) {
    console.error('Failed to schedule maintenance:', error);
    res.status(500).json({ error: 'Failed to schedule maintenance' });
  }
});

export default router;