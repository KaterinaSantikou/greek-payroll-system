import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { nanoid } from "nanoid";
import crypto from "crypto";

const router = Router();

// Webhook configuration schema
const WebhookConfigSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum([
    "timesheet.locked",
    "filing.submitted", 
    "payment.sent",
    "ergani.error",
    "payroll.finalized",
    "employee.created",
    "punch.validated"
  ])),
  secret: z.string().min(16).optional(),
  active: z.boolean().default(true),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10).default(3),
    backoffMultiplier: z.number().min(1).default(2),
    initialDelay: z.number().min(1000).default(1000) // milliseconds
  }).optional()
});

const WebhookTestSchema = z.object({
  event: z.enum([
    "timesheet.locked",
    "filing.submitted", 
    "payment.sent",
    "ergani.error",
    "payroll.finalized",
    "employee.created",
    "punch.validated"
  ]),
  payload: z.record(z.any()).optional()
});

// In-memory webhook store (use database in production)
const webhookConfigs = new Map<string, any>();
const webhookDeliveries = new Map<string, any[]>();

// GET /api/webhooks - List webhook configurations
router.get('/api/webhooks', isAuthenticated, async (req, res) => {
  try {
    const configs = Array.from(webhookConfigs.values());
    
    res.json({
      data: configs,
      meta: {
        total: configs.length,
        active: configs.filter(c => c.active).length,
        supportedEvents: [
          "timesheet.locked",
          "filing.submitted", 
          "payment.sent",
          "ergani.error",
          "payroll.finalized",
          "employee.created",
          "punch.validated"
        ]
      }
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
});

// POST /api/webhooks - Create webhook configuration
router.post('/api/webhooks', isAuthenticated, async (req, res) => {
  try {
    const webhookData = WebhookConfigSchema.parse(req.body);
    
    const webhook = {
      id: nanoid(),
      ...webhookData,
      secret: webhookData.secret || generateWebhookSecret(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: (req as any).user.claims.sub,
      deliveryCount: 0,
      lastDelivery: null,
      status: 'active'
    };
    
    webhookConfigs.set(webhook.id, webhook);
    webhookDeliveries.set(webhook.id, []);
    
    res.status(201).json({
      data: webhook,
      meta: {
        secretGenerated: !req.body.secret,
        eventsCount: webhook.events.length
      }
    });
  } catch (error) {
    console.error("Error creating webhook:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid webhook configuration", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

// GET /api/webhooks/:id - Get webhook configuration
router.get('/api/webhooks/:id', isAuthenticated, async (req, res) => {
  try {
    const webhook = webhookConfigs.get(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    
    const deliveries = webhookDeliveries.get(req.params.id) || [];
    const recentDeliveries = deliveries.slice(-10); // Last 10 deliveries
    
    res.json({
      data: webhook,
      meta: {
        deliveryCount: deliveries.length,
        recentDeliveries,
        lastDelivery: deliveries[deliveries.length - 1] || null,
        successRate: calculateSuccessRate(deliveries)
      }
    });
  } catch (error) {
    console.error("Error fetching webhook:", error);
    res.status(500).json({ error: "Failed to fetch webhook" });
  }
});

// GET /api/webhooks/:id/deliveries - Get webhook delivery history
router.get('/api/webhooks/:id/deliveries', isAuthenticated, async (req, res) => {
  try {
    const webhook = webhookConfigs.get(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    
    const deliveries = webhookDeliveries.get(req.params.id) || [];
    const { limit = '50', offset = '0' } = req.query;
    
    const paginatedDeliveries = deliveries
      .slice(parseInt(offset as string))
      .slice(0, parseInt(limit as string));
    
    res.json({
      data: paginatedDeliveries,
      meta: {
        total: deliveries.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        successRate: calculateSuccessRate(deliveries),
        avgResponseTime: calculateAvgResponseTime(deliveries)
      }
    });
  } catch (error) {
    console.error("Error fetching webhook deliveries:", error);
    res.status(500).json({ error: "Failed to fetch webhook deliveries" });
  }
});

// POST /api/webhooks/:id/test - Test webhook endpoint
router.post('/api/webhooks/:id/test', isAuthenticated, async (req, res) => {
  try {
    const webhook = webhookConfigs.get(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    
    const testData = WebhookTestSchema.parse(req.body);
    
    const testPayload = {
      event: testData.event,
      timestamp: new Date().toISOString(),
      data: testData.payload || getTestPayload(testData.event),
      test: true,
      webhook_id: webhook.id
    };
    
    const delivery = await deliverWebhook(webhook, testData.event, testPayload);
    
    res.json({
      data: {
        deliveryId: delivery.id,
        status: delivery.status,
        responseStatus: delivery.responseStatus,
        responseTime: delivery.responseTime,
        attempt: 1
      },
      meta: {
        testSuccessful: delivery.status === 'delivered',
        webhookUrl: webhook.url,
        payload: testPayload
      }
    });
  } catch (error) {
    console.error("Error testing webhook:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid test data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to test webhook" });
  }
});

// DELETE /api/webhooks/:id - Delete webhook configuration
router.delete('/api/webhooks/:id', isAuthenticated, async (req, res) => {
  try {
    const webhook = webhookConfigs.get(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    
    webhookConfigs.delete(req.params.id);
    webhookDeliveries.delete(req.params.id);
    
    res.json({
      data: { deleted: true, id: req.params.id },
      meta: { deletedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});

// Webhook delivery functions
export async function triggerWebhook(event: string, payload: any): Promise<void> {
  const webhooks = Array.from(webhookConfigs.values())
    .filter(w => w.active && w.events.includes(event));
  
  for (const webhook of webhooks) {
    await deliverWebhook(webhook, event, {
      event,
      timestamp: new Date().toISOString(),
      data: payload,
      webhook_id: webhook.id
    });
  }
}

async function deliverWebhook(webhook: any, event: string, payload: any): Promise<any> {
  const deliveryId = nanoid();
  const startTime = Date.now();
  
  const delivery = {
    id: deliveryId,
    webhookId: webhook.id,
    event,
    payload,
    status: 'pending',
    attempt: 1,
    createdAt: new Date().toISOString()
  };
  
  try {
    // Generate signature for payload verification
    const signature = generateWebhookSignature(payload, webhook.secret);
    
    // Make HTTP request to webhook URL
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayrollSync-Webhook/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
        'X-Webhook-Delivery': deliveryId,
        'X-Webhook-Timestamp': new Date().toISOString()
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    
    delivery.status = response.ok ? 'delivered' : 'failed';
    delivery.responseStatus = response.status;
    delivery.responseTime = responseTime;
    delivery.responseHeaders = Object.fromEntries(response.headers.entries());
    
    if (!response.ok) {
      delivery.error = `HTTP ${response.status}: ${response.statusText}`;
      delivery.responseBody = await response.text().catch(() => null);
    }
    
  } catch (error: any) {
    delivery.status = 'failed';
    delivery.error = error.message;
    delivery.responseTime = Date.now() - startTime;
  }
  
  delivery.deliveredAt = new Date().toISOString();
  
  // Store delivery record
  const deliveries = webhookDeliveries.get(webhook.id) || [];
  deliveries.push(delivery);
  webhookDeliveries.set(webhook.id, deliveries);
  
  // Update webhook stats
  webhook.deliveryCount = (webhook.deliveryCount || 0) + 1;
  webhook.lastDelivery = delivery.deliveredAt;
  webhook.updatedAt = new Date().toISOString();
  webhookConfigs.set(webhook.id, webhook);
  
  // Retry logic for failed deliveries (simplified)
  if (delivery.status === 'failed' && webhook.retryPolicy) {
    scheduleRetry(webhook, event, payload, delivery);
  }
  
  return delivery;
}

function generateWebhookSignature(payload: any, secret: string): string {
  const payloadString = JSON.stringify(payload);
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function calculateSuccessRate(deliveries: any[]): number {
  if (deliveries.length === 0) return 0;
  const successful = deliveries.filter(d => d.status === 'delivered').length;
  return Math.round((successful / deliveries.length) * 100);
}

function calculateAvgResponseTime(deliveries: any[]): number {
  const validDeliveries = deliveries.filter(d => d.responseTime);
  if (validDeliveries.length === 0) return 0;
  const total = validDeliveries.reduce((sum, d) => sum + d.responseTime, 0);
  return Math.round(total / validDeliveries.length);
}

function getTestPayload(event: string): any {
  const testPayloads: Record<string, any> = {
    "timesheet.locked": {
      timesheetIds: ["ts_123", "ts_124"],
      period: "2025-01",
      lockedAt: new Date().toISOString(),
      totalHours: 160
    },
    "filing.submitted": {
      filingId: "fil_123",
      system: "ERGANI_II",
      submissionId: "ERG-12345",
      period: "2025-01"
    },
    "payment.sent": {
      paymentId: "pay_123",
      payrollRunId: "run_123",
      totalAmount: 25000.50,
      employeeCount: 15,
      status: "completed"
    },
    "ergani.error": {
      filingId: "fil_123",
      eventType: "hire",
      employeeId: "emp_123",
      error: "Invalid AMKA format",
      retryable: true
    },
    "payroll.finalized": {
      payrollRunId: "run_123",
      period: "2025-01",
      finalizedBy: "admin_123",
      totalGrossPay: 45000.00,
      employeeCount: 25
    },
    "employee.created": {
      employeeId: "emp_123",
      firstName: "John",
      lastName: "Doe",
      afm: "123456789",
      department: "Operations"
    },
    "punch.validated": {
      punchId: "punch_123",
      employeeId: "emp_123",
      punchType: "clock_in",
      timestamp: new Date().toISOString(),
      validated: true
    }
  };
  
  return testPayloads[event] || { test: true };
}

function scheduleRetry(webhook: any, event: string, payload: any, originalDelivery: any): void {
  // Simplified retry logic - in production, use a proper queue system
  const retryPolicy = webhook.retryPolicy || { maxRetries: 3, backoffMultiplier: 2, initialDelay: 1000 };
  
  if (originalDelivery.attempt < retryPolicy.maxRetries) {
    const delay = retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, originalDelivery.attempt - 1);
    
    setTimeout(async () => {
      payload.retry = {
        attempt: originalDelivery.attempt + 1,
        originalDeliveryId: originalDelivery.id
      };
      await deliverWebhook(webhook, event, payload);
    }, delay);
  }
}

export default router;