import type { Express } from 'express';
import { z } from 'zod';
import { changeLogLegalWatchService } from '../changeLogLegalWatch';
import { isAuthenticated } from '../replitAuth';

// Validation schemas
const CreateRulePackVersionSchema = z.object({
  packName: z.string().min(1),
  version: z.string().min(1),
  effectiveDate: z.string().datetime(),
  ruleContent: z.object({
    rules: z.array(
      z.object({
        id: z.string(),
        category: z.string(),
        name: z.string(),
        description: z.string(),
        expression: z.string(),
        metadata: z.record(z.any()),
      })
    ),
    metadata: z.object({
      source: z.string(),
      jurisdiction: z.enum(['greece', 'eu', 'global']),
      compliance: z.array(z.string()),
      impact: z.enum(['low', 'medium', 'high', 'critical']),
    }),
  }),
  changelog: z.string(),
  createdBy: z.string(),
});

const UpdateRulePackStatusSchema = z.object({
  id: z.string(),
  status: z.enum([
    'draft',
    'review',
    'approved',
    'published',
    'superseded',
    'retired',
  ]),
  legalApproval: z
    .object({
      approvedBy: z.string(),
      approvedDate: z.string().datetime(),
      approvalNotes: z.string(),
      legalReference: z.string(),
    })
    .optional(),
});

const DeployToTenantSchema = z.object({
  tenantId: z.string(),
  rulePackVersionId: z.string(),
  deployedBy: z.string(),
  notes: z.string(),
});

const UpdateLegalWatchSchema = z.object({
  id: z.string(),
  updates: z.object({
    name: z.string().optional(),
    isActive: z.boolean().optional(),
    keywords: z.array(z.string()).optional(),
    notificationEmails: z.array(z.string().email()).optional(),
  }),
});

const UpdateLegalAlertSchema = z.object({
  id: z.string(),
  updates: z.object({
    status: z.enum(['new', 'reviewed', 'actioned', 'dismissed']).optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export function registerChangeLogLegalWatchRoutes(app: Express) {
  // Dashboard analytics
  app.get('/api/changelog/dashboard', isAuthenticated, async (req, res) => {
    try {
      const analytics = changeLogLegalWatchService.getDashboardAnalytics();
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get changelog dashboard error:', error);
      res.status(500).json({
        error: 'Failed to get dashboard analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Rule pack version management
  app.get('/api/changelog/rule-packs', isAuthenticated, async (req, res) => {
    try {
      const packName = req.query.packName as string;
      const versions = changeLogLegalWatchService.getRulePackVersions(packName);
      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      console.error('Get rule packs error:', error);
      res.status(500).json({
        error: 'Failed to get rule packs',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get(
    '/api/changelog/rule-packs/:id',
    isAuthenticated,
    async (req, res) => {
      try {
        const { id } = req.params;
        const version = changeLogLegalWatchService.getRulePackVersion(id);

        if (!version) {
          return res.status(404).json({ error: 'Rule pack version not found' });
        }

        res.json({
          success: true,
          data: version,
        });
      } catch (error) {
        console.error('Get rule pack version error:', error);
        res.status(500).json({
          error: 'Failed to get rule pack version',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  app.post('/api/changelog/rule-packs', isAuthenticated, async (req, res) => {
    try {
      const validatedData = CreateRulePackVersionSchema.parse(req.body);
      const rulePackVersion =
        changeLogLegalWatchService.createRulePackVersion(validatedData);

      res.json({
        success: true,
        data: rulePackVersion,
      });
    } catch (error) {
      console.error('Create rule pack version error:', error);
      res.status(400).json({
        error: 'Failed to create rule pack version',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.put(
    '/api/changelog/rule-packs/status',
    isAuthenticated,
    async (req, res) => {
      try {
        const { id, status, legalApproval } = UpdateRulePackStatusSchema.parse(
          req.body
        );
        const updatedRulePack = changeLogLegalWatchService.updateRulePackStatus(
          id,
          status,
          legalApproval
            ? {
                ...legalApproval,
                approvedDate: new Date(legalApproval.approvedDate),
              }
            : undefined
        );

        res.json({
          success: true,
          data: updatedRulePack,
        });
      } catch (error) {
        console.error('Update rule pack status error:', error);
        res.status(400).json({
          error: 'Failed to update rule pack status',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Version comparison and diff
  app.get(
    '/api/changelog/compare/:sourceId/:targetId',
    isAuthenticated,
    async (req, res) => {
      try {
        const { sourceId, targetId } = req.params;
        const comparison = changeLogLegalWatchService.compareRulePackVersions(
          sourceId,
          targetId
        );

        res.json({
          success: true,
          data: comparison,
        });
      } catch (error) {
        console.error('Compare rule pack versions error:', error);
        res.status(400).json({
          error: 'Failed to compare rule pack versions',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Tenant management
  app.get('/api/changelog/tenants', isAuthenticated, async (req, res) => {
    try {
      const tenants = changeLogLegalWatchService.getAllTenants();
      res.json({
        success: true,
        data: tenants,
      });
    } catch (error) {
      console.error('Get tenants error:', error);
      res.status(500).json({
        error: 'Failed to get tenants',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.get(
    '/api/changelog/tenants/:tenantId/deployments',
    isAuthenticated,
    async (req, res) => {
      try {
        const { tenantId } = req.params;
        const deployments =
          changeLogLegalWatchService.getTenantDeployments(tenantId);
        res.json({
          success: true,
          data: deployments,
        });
      } catch (error) {
        console.error('Get tenant deployments error:', error);
        res.status(500).json({
          error: 'Failed to get tenant deployments',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Deployment management
  app.post('/api/changelog/deploy', isAuthenticated, async (req, res) => {
    try {
      const { tenantId, rulePackVersionId, deployedBy, notes } =
        DeployToTenantSchema.parse(req.body);
      const deployment = changeLogLegalWatchService.deployToTenant(
        tenantId,
        rulePackVersionId,
        deployedBy,
        notes
      );

      res.json({
        success: true,
        data: deployment,
      });
    } catch (error) {
      console.error('Deploy to tenant error:', error);
      res.status(400).json({
        error: 'Failed to deploy to tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Legal watch management
  app.get('/api/changelog/legal-watches', isAuthenticated, async (req, res) => {
    try {
      const watches = changeLogLegalWatchService.getLegalWatches();
      res.json({
        success: true,
        data: watches,
      });
    } catch (error) {
      console.error('Get legal watches error:', error);
      res.status(500).json({
        error: 'Failed to get legal watches',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.put('/api/changelog/legal-watches', isAuthenticated, async (req, res) => {
    try {
      const { id, updates } = UpdateLegalWatchSchema.parse(req.body);
      const updatedWatch = changeLogLegalWatchService.updateLegalWatch(
        id,
        updates
      );

      res.json({
        success: true,
        data: updatedWatch,
      });
    } catch (error) {
      console.error('Update legal watch error:', error);
      res.status(400).json({
        error: 'Failed to update legal watch',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Legal alerts management
  app.get('/api/changelog/legal-alerts', isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as any;
      const alerts = changeLogLegalWatchService.getLegalAlerts(status);
      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      console.error('Get legal alerts error:', error);
      res.status(500).json({
        error: 'Failed to get legal alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.put('/api/changelog/legal-alerts', isAuthenticated, async (req, res) => {
    try {
      const { id, updates } = UpdateLegalAlertSchema.parse(req.body);
      const processedUpdates = {
        ...updates,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      };
      const updatedAlert = changeLogLegalWatchService.updateLegalAlert(
        id,
        processedUpdates
      );

      res.json({
        success: true,
        data: updatedAlert,
      });
    } catch (error) {
      console.error('Update legal alert error:', error);
      res.status(400).json({
        error: 'Failed to update legal alert',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Simulate legal monitoring (for demo purposes)
  app.post(
    '/api/changelog/simulate-legal-scan',
    isAuthenticated,
    async (req, res) => {
      try {
        // In a real implementation, this would trigger actual legal monitoring
        // For demo, we'll simulate finding new alerts

        const mockAlert = {
          id: `alert_${Date.now()}`,
          watchId: 'greece_minimum_wage',
          title: 'New Labor Law Amendment Proposed',
          summary:
            'Proposed changes to Greek labor law regarding overtime calculations and digital work cards',
          fullText:
            'The Greek Parliament is considering amendments to existing labor laws that would affect overtime calculations and mandate digital work card compliance for all employees in the hospitality sector.',
          source: 'Parliamentary Newsletter',
          publishedDate: new Date(),
          detectedDate: new Date(),
          urgency: 'medium' as const,
          category: 'labor_law',
          keywords: ['overtime', 'digital work card', 'hospitality'],
          recommendedActions: [
            'Review overtime calculation rules',
            'Assess digital work card compliance impact',
            'Schedule legal review meeting',
          ],
          status: 'new' as const,
        };

        res.json({
          success: true,
          data: {
            message: 'Legal monitoring scan completed',
            newAlerts: 1,
            mockAlert,
          },
        });
      } catch (error) {
        console.error('Simulate legal scan error:', error);
        res.status(500).json({
          error: 'Failed to simulate legal scan',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Batch deployment to multiple tenants
  app.post('/api/changelog/batch-deploy', isAuthenticated, async (req, res) => {
    try {
      const { tenantIds, rulePackVersionId, deployedBy, notes } = z
        .object({
          tenantIds: z.array(z.string()),
          rulePackVersionId: z.string(),
          deployedBy: z.string(),
          notes: z.string(),
        })
        .parse(req.body);

      const deployments = tenantIds.map(tenantId =>
        changeLogLegalWatchService.deployToTenant(
          tenantId,
          rulePackVersionId,
          deployedBy,
          notes
        )
      );

      res.json({
        success: true,
        data: {
          deployments,
          summary: {
            total: deployments.length,
            successful: deployments.filter(d => d.deploymentStatus !== 'failed')
              .length,
            failed: deployments.filter(d => d.deploymentStatus === 'failed')
              .length,
          },
        },
      });
    } catch (error) {
      console.error('Batch deploy error:', error);
      res.status(400).json({
        error: 'Failed to batch deploy',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
