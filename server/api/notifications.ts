import type { Express } from "express";
import { db } from "../db";
import { 
  notifications, 
  notificationPreferences, 
  integrationLogs,
  employees,
  users,
  overtimeRequests 
} from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";

export function registerNotificationRoutes(app: Express) {
  
  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;
      
      let query = db.select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      
      if (status) {
        query = query.where(and(
          eq(notifications.userId, userId),
          eq(notifications.status, status)
        ));
      }
      
      const userNotifications = await query;
      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = req.params.id;
      
      await db.update(notifications)
        .set({ 
          status: 'read',
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(notifications.notificationId, notificationId),
          eq(notifications.userId, userId)
        ));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Process approval action
  app.post("/api/notifications/:id/action", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = req.params.id;
      const { action, comments } = req.body;
      
      // Get notification
      const notification = await db.select()
        .from(notifications)
        .where(eq(notifications.notificationId, notificationId))
        .limit(1);
        
      if (!notification[0] || notification[0].status === 'acted_upon') {
        return res.status(400).json({ message: "Notification already processed" });
      }
      
      // Update notification status
      await db.update(notifications)
        .set({
          status: 'acted_upon',
          actedAt: new Date(),
          actionBy: userId,
          actionResult: action,
          updatedAt: new Date()
        })
        .where(eq(notifications.notificationId, notificationId));
      
      // Process the specific approval
      await processApprovalAction(notification[0], { action, comments, userId });
      
      res.json({ success: true, action });
    } catch (error) {
      console.error("Error processing approval action:", error);
      res.status(500).json({ message: "Failed to process action" });
    }
  });

  // Get notification preferences
  app.get("/api/notifications/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const preferences = await db.select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);
      
      if (preferences[0]) {
        res.json(preferences[0]);
      } else {
        // Return default preferences
        res.json({
          userId,
          slackEnabled: false,
          teamsEnabled: false,
          emailEnabled: true,
          smsEnabled: false,
          overtimeApprovals: { enabled: true, channels: ["email"] },
          erganiAlerts: { enabled: true, channels: ["email"] },
          complianceAlerts: { enabled: true, channels: ["email"] },
          payrollDigests: { enabled: true, channels: ["email"], frequency: "weekly" },
          quietHoursStart: "22:00",
          quietHoursEnd: "08:00",
          timezone: "Europe/Athens"
        });
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  // Update notification preferences
  app.put("/api/notifications/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = req.body;
      
      // Check if preferences exist
      const existing = await db.select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);
      
      if (existing[0]) {
        await db.update(notificationPreferences)
          .set({ ...preferences, updatedAt: new Date() })
          .where(eq(notificationPreferences.userId, userId));
      } else {
        await db.insert(notificationPreferences)
          .values({ ...preferences, userId });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Create test notification (for development)
  app.post("/api/notifications/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, title, message } = req.body;
      
      const [notification] = await db.insert(notifications).values({
        type: type || 'test',
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        category: 'system',
        priority: 'medium',
        userId,
        channels: JSON.stringify(['web']),
        status: 'pending'
      }).returning();
      
      res.json(notification);
    } catch (error) {
      console.error("Error creating test notification:", error);
      res.status(500).json({ message: "Failed to create test notification" });
    }
  });

  // Slack webhook endpoint
  app.post("/api/integrations/slack/webhook", async (req, res) => {
    try {
      const { type, payload } = req.body;
      
      if (type === 'url_verification') {
        return res.json({ challenge: req.body.challenge });
      }
      
      if (type === 'interactive_message' || type === 'block_actions') {
        const actions = payload.actions || [];
        
        for (const action of actions) {
          if (action.action_id?.startsWith('approval_')) {
            const actionData = JSON.parse(action.value);
            await processSlackApproval(actionData, payload.user.id);
          }
        }
      }
      
      res.json({ ok: true });
    } catch (error) {
      console.error("Error processing Slack webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Teams webhook endpoint
  app.post("/api/integrations/teams/webhook", async (req, res) => {
    try {
      const { type, data } = req.body;
      
      if (data?.action && data?.notificationId) {
        await processTeamsApproval(data, req.body.from?.id);
      }
      
      res.json({ type: "message", text: "Action processed successfully" });
    } catch (error) {
      console.error("Error processing Teams webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}

// Helper functions
async function processApprovalAction(notification: any, action: any): Promise<void> {
  switch (notification.type) {
    case 'overtime_approval':
      if (notification.relatedEntityId) {
        await db.update(overtimeRequests)
          .set({
            status: action.action === 'approve' ? 'approved' : 'rejected',
            approvedBy: action.userId,
            approvedAt: new Date(),
            approvalComments: action.comments,
            updatedAt: new Date()
          })
          .where(eq(overtimeRequests.requestId, notification.relatedEntityId));
      }
      break;
    case 'ergani_failure':
      if (action.action === 'retry') {
        console.log('Triggering ERGANI retry for:', notification.relatedEntityId);
        // Integration with ERGANI connector would go here
      }
      break;
  }
}

async function processSlackApproval(actionData: any, slackUserId: string): Promise<void> {
  // Map Slack user to system user and process approval
  // This would require a user mapping table or lookup
  console.log('Processing Slack approval:', actionData, slackUserId);
}

async function processTeamsApproval(data: any, teamsUserId: string): Promise<void> {
  // Map Teams user to system user and process approval
  console.log('Processing Teams approval:', data, teamsUserId);
}