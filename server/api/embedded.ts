import type { Express } from 'express';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  partners,
  accessTokens,
  glConnections,
  glMappings,
  glJournals,
  glJournalLines,
  embeddedSessions,
  webhookEvents,
  idempotencyKeys,
  employees,
  payrollRuns,
  payrollLines,
  type InsertPartner,
  type InsertGLConnection,
  type InsertGLMapping,
  type InsertEmbeddedSession,
  insertPartnerSchema,
  insertGLConnectionSchema,
  insertGLMappingSchema,
} from '@shared/schema';
import {
  OAuth2Service,
  requireAuth,
  requireEmbedAuth,
  requireIdempotency,
} from '../auth/oauth2';
import { GLExportService } from '../services/glExportService';
import crypto from 'crypto';

/**
 * Embedded Payroll + GL API Routes
 * Implements OAuth2 secured API for partner integrations
 */
export function embeddedPayrollRoutes(app: Express) {
  // =====================================================
  // OAUTH2 TOKEN ENDPOINTS
  // =====================================================

  /**
   * OAuth2 Token Endpoint - Client Credentials Flow
   * POST /api/embedded/oauth/token
   */
  app.post('/api/embedded/oauth/token', async (req, res) => {
    try {
      const { grant_type, client_id, client_secret, scope } = req.body;

      if (grant_type !== 'client_credentials') {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Only client_credentials grant type is supported',
        });
      }

      if (!client_id || !client_secret) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'client_id and client_secret are required',
        });
      }

      const scopes = scope ? scope.split(' ') : ['payroll.runs:read'];
      const tokenResponse = await OAuth2Service.generateAccessToken(
        client_id,
        client_secret,
        scopes
      );

      res.json(tokenResponse);
    } catch (error) {
      console.error('OAuth token error:', error);
      res.status(401).json({
        error: 'invalid_client',
        error_description:
          error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  });

  /**
   * Generate Embed Token for iframe integration
   * POST /api/embedded/embed-token
   */
  app.post('/api/embedded/embed-token', requireAuth(), async (req, res) => {
    try {
      const {
        employeeId,
        allowedRoutes,
        originDomain,
        expiresInMinutes = 10,
      } = req.body;
      const auth = (req as any).auth;

      // Validate partner has embed scope
      if (!OAuth2Service.hasScope(auth.scopes, 'embed.sessions:create')) {
        return res.status(403).json({
          error: 'insufficient_scope',
          error_description: 'embed.sessions:create scope required',
        });
      }

      const embedToken = await OAuth2Service.generateEmbedToken(
        auth.partnerId,
        employeeId || null,
        allowedRoutes || ['payroll/*'],
        originDomain,
        expiresInMinutes
      );

      res.json({
        embed_token: embedToken,
        expires_in: expiresInMinutes * 60,
        allowed_routes: allowedRoutes || ['payroll/*'],
        origin_domain: originDomain,
      });
    } catch (error) {
      console.error('Embed token error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to generate embed token',
      });
    }
  });

  // =====================================================
  // EMBEDDED PAYROLL ENDPOINTS
  // =====================================================

  /**
   * Get Payroll Runs (for embedded payroll surface)
   * GET /api/embedded/payroll/runs
   */
  app.get(
    '/api/embedded/payroll/runs',
    requireAuth('payroll.runs:read'),
    async (req, res) => {
      try {
        const { limit = 50, offset = 0, status } = req.query;
        const auth = (req as any).auth;

        let query = db
          .select({
            id: payrollRuns.id,
            runNumber: payrollRuns.runNumber,
            payPeriodStart: payrollRuns.payPeriodStart,
            payPeriodEnd: payrollRuns.payPeriodEnd,
            payDate: payrollRuns.payDate,
            status: payrollRuns.status,
            totalGross: payrollRuns.totalGross,
            totalNet: payrollRuns.totalNet,
            totalTax: payrollRuns.totalTax,
            employeeCount: payrollRuns.employeeCount,
            createdAt: payrollRuns.createdAt,
          })
          .from(payrollRuns)
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string))
          .orderBy(desc(payrollRuns.createdAt));

        if (status) {
          query = query.where(eq(payrollRuns.status, status as string));
        }

        const runs = await query;

        res.json({
          data: runs,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            total: runs.length,
          },
        });
      } catch (error) {
        console.error('Get payroll runs error:', error);
        res.status(500).json({ error: 'Failed to fetch payroll runs' });
      }
    }
  );

  /**
   * Get Payroll Run Details
   * GET /api/embedded/payroll/runs/:runId
   */
  app.get(
    '/api/embedded/payroll/runs/:runId',
    requireAuth('payroll.runs:read'),
    async (req, res) => {
      try {
        const { runId } = req.params;

        // Get run details
        const [run] = await db
          .select()
          .from(payrollRuns)
          .where(eq(payrollRuns.id, runId));

        if (!run) {
          return res.status(404).json({ error: 'Payroll run not found' });
        }

        // Get payroll lines for this run
        const lines = await db
          .select({
            id: payrollLines.lineId,
            employeeId: payrollLines.employeeId,
            code: payrollLines.code,
            description: payrollLines.description,
            amount: payrollLines.amount,
            hours: payrollLines.hours,
            rate: payrollLines.rate,
            isDeduction: payrollLines.isDeduction,
            employeeName: employees.name,
            employeeNumber: employees.employeeNumber,
          })
          .from(payrollLines)
          .innerJoin(
            employees,
            eq(payrollLines.employeeId, employees.employeeId)
          )
          .where(eq(payrollLines.runId, runId))
          .orderBy(employees.employeeNumber, payrollLines.code);

        res.json({
          run,
          lines,
          summary: {
            totalLines: lines.length,
            uniqueEmployees: new Set(lines.map(l => l.employeeId)).size,
            components: Object.fromEntries(
              Object.entries(
                lines.reduce(
                  (acc, line) => {
                    const type = line.isDeduction ? 'deduction' : 'earning';
                    acc[type] = (acc[type] || 0) + parseFloat(line.amount);
                    return acc;
                  },
                  {} as Record<string, number>
                )
              ).map(([k, v]) => [k, v.toFixed(2)])
            ),
          },
        });
      } catch (error) {
        console.error('Get payroll run error:', error);
        res.status(500).json({ error: 'Failed to fetch payroll run details' });
      }
    }
  );

  /**
   * Finalize Payroll Run (requires idempotency)
   * POST /api/embedded/payroll/runs/:runId/finalize
   */
  app.post(
    '/api/embedded/payroll/runs/:runId/finalize',
    requireAuth('payroll.runs:finalize'),
    requireIdempotency(),
    async (req, res) => {
      try {
        const { runId } = req.params;
        const { finalizeDate, notes } = req.body;
        const auth = (req as any).auth;
        const idempotency = (req as any).idempotency;

        // Check if run exists and is in correct status
        const [run] = await db
          .select()
          .from(payrollRuns)
          .where(eq(payrollRuns.id, runId));

        if (!run) {
          return res.status(404).json({ error: 'Payroll run not found' });
        }

        if (run.status === 'finalized') {
          // Already finalized - return cached response if idempotency key matches
          const result = {
            id: run.id,
            status: 'finalized',
            finalizedAt: run.finalizedAt,
            message: 'Payroll run already finalized',
          };

          // Store idempotent response
          await db.insert(idempotencyKeys).values({
            ...idempotency,
            responseData: JSON.stringify(result),
            responseStatus: 200,
          });

          return res.json(result);
        }

        if (run.status !== 'approved') {
          return res.status(400).json({
            error: 'Invalid status',
            message: 'Payroll run must be approved before finalizing',
          });
        }

        // Finalize the run
        const [finalizedRun] = await db
          .update(payrollRuns)
          .set({
            status: 'finalized',
            finalizedAt: new Date(),
            finalizedBy: auth.partnerId,
            notes: notes || null,
            updatedAt: new Date(),
          })
          .where(eq(payrollRuns.id, runId))
          .returning();

        const result = {
          id: finalizedRun.id,
          status: finalizedRun.status,
          finalizedAt: finalizedRun.finalizedAt,
          totalGross: finalizedRun.totalGross,
          totalNet: finalizedRun.totalNet,
          employeeCount: finalizedRun.employeeCount,
          message: 'Payroll run finalized successfully',
        };

        // Store idempotent response
        await db.insert(idempotencyKeys).values({
          ...idempotency,
          responseData: JSON.stringify(result),
          responseStatus: 200,
        });

        // Trigger webhook event
        await db.insert(webhookEvents).values({
          partnerId: auth.partnerId,
          eventType: 'payroll.run.finalized',
          resourceId: runId,
          payload: JSON.stringify(result),
        });

        res.json(result);
      } catch (error) {
        console.error('Finalize payroll run error:', error);
        res.status(500).json({ error: 'Failed to finalize payroll run' });
      }
    }
  );

  // =====================================================
  // GL INTEGRATION ENDPOINTS
  // =====================================================

  /**
   * Get GL Connections
   * GET /api/embedded/gl/connections
   */
  app.get(
    '/api/embedded/gl/connections',
    requireAuth('gl.connectors:read'),
    async (req, res) => {
      try {
        const auth = (req as any).auth;

        const connections = await db
          .select({
            id: glConnections.id,
            glProvider: glConnections.glProvider,
            connectionName: glConnections.connectionName,
            status: glConnections.status,
            lastSyncAt: glConnections.lastSyncAt,
            createdAt: glConnections.createdAt,
          })
          .from(glConnections)
          .where(eq(glConnections.partnerId, auth.partnerId))
          .orderBy(desc(glConnections.createdAt));

        res.json({ data: connections });
      } catch (error) {
        console.error('Get GL connections error:', error);
        res.status(500).json({ error: 'Failed to fetch GL connections' });
      }
    }
  );

  /**
   * Create GL Connection
   * POST /api/embedded/gl/connections
   */
  app.post(
    '/api/embedded/gl/connections',
    requireAuth('gl.connectors:manage'),
    requireIdempotency(),
    async (req, res) => {
      try {
        const auth = (req as any).auth;
        const idempotency = (req as any).idempotency;

        const validatedData = insertGLConnectionSchema.parse({
          ...req.body,
          partnerId: auth.partnerId,
          status: 'active',
        });

        const [connection] = await db
          .insert(glConnections)
          .values(validatedData)
          .returning();

        // Store idempotent response
        await db.insert(idempotencyKeys).values({
          ...idempotency,
          responseData: JSON.stringify(connection),
          responseStatus: 201,
        });

        res.status(201).json(connection);
      } catch (error) {
        console.error('Create GL connection error:', error);
        res.status(500).json({ error: 'Failed to create GL connection' });
      }
    }
  );

  /**
   * Get GL Account Mappings
   * GET /api/embedded/gl/connections/:connectionId/mappings
   */
  app.get(
    '/api/embedded/gl/connections/:connectionId/mappings',
    requireAuth('gl.mappings:read'),
    async (req, res) => {
      try {
        const { connectionId } = req.params;
        const auth = (req as any).auth;

        // Verify connection belongs to partner
        const [connection] = await db
          .select()
          .from(glConnections)
          .where(
            and(
              eq(glConnections.id, connectionId),
              eq(glConnections.partnerId, auth.partnerId)
            )
          );

        if (!connection) {
          return res.status(404).json({ error: 'GL connection not found' });
        }

        const mappings = await GLExportService.getGLMappings(connectionId);
        res.json({ data: mappings });
      } catch (error) {
        console.error('Get GL mappings error:', error);
        res.status(500).json({ error: 'Failed to fetch GL mappings' });
      }
    }
  );

  /**
   * Create/Update GL Account Mapping
   * PUT /api/embedded/gl/connections/:connectionId/mappings
   */
  app.put(
    '/api/embedded/gl/connections/:connectionId/mappings',
    requireAuth('gl.mappings:write'),
    requireIdempotency(),
    async (req, res) => {
      try {
        const { connectionId } = req.params;
        const {
          payrollComponent,
          componentType,
          glAccountCode,
          glAccountName,
          debitAccount,
          creditAccount,
        } = req.body;
        const auth = (req as any).auth;
        const idempotency = (req as any).idempotency;

        // Verify connection belongs to partner
        const [connection] = await db
          .select()
          .from(glConnections)
          .where(
            and(
              eq(glConnections.id, connectionId),
              eq(glConnections.partnerId, auth.partnerId)
            )
          );

        if (!connection) {
          return res.status(404).json({ error: 'GL connection not found' });
        }

        const mapping = await GLExportService.upsertGLMapping(
          connectionId,
          payrollComponent,
          componentType,
          glAccountCode,
          glAccountName,
          debitAccount,
          creditAccount
        );

        // Store idempotent response
        await db.insert(idempotencyKeys).values({
          ...idempotency,
          responseData: JSON.stringify(mapping),
          responseStatus: 200,
        });

        res.json(mapping);
      } catch (error) {
        console.error('Upsert GL mapping error:', error);
        res.status(500).json({ error: 'Failed to create/update GL mapping' });
      }
    }
  );

  /**
   * Generate GL Journal for Payroll Run
   * POST /api/embedded/gl/journals
   */
  app.post(
    '/api/embedded/gl/journals',
    requireAuth('gl.journals:write'),
    requireIdempotency(),
    async (req, res) => {
      try {
        const { connectionId, payrollRunId, journalDate, description } =
          req.body;
        const auth = (req as any).auth;
        const idempotency = (req as any).idempotency;

        if (!connectionId || !payrollRunId || !journalDate) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: 'connectionId, payrollRunId, and journalDate are required',
          });
        }

        // Verify connection belongs to partner
        const [connection] = await db
          .select()
          .from(glConnections)
          .where(
            and(
              eq(glConnections.id, connectionId),
              eq(glConnections.partnerId, auth.partnerId)
            )
          );

        if (!connection) {
          return res.status(404).json({ error: 'GL connection not found' });
        }

        const journal = await GLExportService.generateJournalForPayrollRun(
          connectionId,
          payrollRunId,
          journalDate,
          description || `Payroll Journal - ${new Date().toLocaleDateString()}`
        );

        // Store idempotent response
        await db.insert(idempotencyKeys).values({
          ...idempotency,
          responseData: JSON.stringify(journal),
          responseStatus: 201,
        });

        // Trigger webhook
        await db.insert(webhookEvents).values({
          partnerId: auth.partnerId,
          eventType: 'gl.journal.generated',
          resourceId: journal.id,
          payload: JSON.stringify({
            journalId: journal.id,
            payrollRunId,
            connectionId,
          }),
        });

        res.status(201).json(journal);
      } catch (error) {
        console.error('Generate GL journal error:', error);
        res.status(500).json({
          error: 'Failed to generate GL journal',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Post GL Journal
   * POST /api/embedded/gl/journals/:journalId/post
   */
  app.post(
    '/api/embedded/gl/journals/:journalId/post',
    requireAuth('gl.journals:write'),
    requireIdempotency(),
    async (req, res) => {
      try {
        const { journalId } = req.params;
        const auth = (req as any).auth;
        const idempotency = (req as any).idempotency;

        // Verify journal belongs to partner
        const [journal] = await db
          .select()
          .from(glJournals)
          .innerJoin(
            glConnections,
            eq(glJournals.connectionId, glConnections.id)
          )
          .where(
            and(
              eq(glJournals.id, journalId),
              eq(glConnections.partnerId, auth.partnerId)
            )
          );

        if (!journal) {
          return res.status(404).json({ error: 'GL journal not found' });
        }

        const postedJournal = await GLExportService.postJournal(journalId);

        // Store idempotent response
        await db.insert(idempotencyKeys).values({
          ...idempotency,
          responseData: JSON.stringify(postedJournal),
          responseStatus: 200,
        });

        // Trigger webhook
        await db.insert(webhookEvents).values({
          partnerId: auth.partnerId,
          eventType: 'gl.journal.posted',
          resourceId: journalId,
          payload: JSON.stringify({
            journalId: postedJournal.id,
            status: postedJournal.status,
            externalId: postedJournal.externalId,
          }),
        });

        res.json(postedJournal);
      } catch (error) {
        console.error('Post GL journal error:', error);
        res.status(500).json({
          error: 'Failed to post GL journal',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // =====================================================
  // PARTNER MANAGEMENT ENDPOINTS
  // =====================================================

  /**
   * Get Partner Profile
   * GET /api/embedded/partner/profile
   */
  app.get('/api/embedded/partner/profile', requireAuth(), async (req, res) => {
    try {
      const auth = (req as any).auth;

      const [partner] = await db
        .select({
          id: partners.id,
          name: partners.name,
          companyName: partners.companyName,
          email: partners.email,
          allowedOrigins: partners.allowedOrigins,
          scopes: partners.scopes,
          status: partners.status,
          createdAt: partners.createdAt,
        })
        .from(partners)
        .where(eq(partners.id, auth.partnerId));

      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      res.json(partner);
    } catch (error) {
      console.error('Get partner profile error:', error);
      res.status(500).json({ error: 'Failed to fetch partner profile' });
    }
  });

  /**
   * Health Check Endpoint
   * GET /api/embedded/health
   */
  app.get('/api/embedded/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: 'v1',
      services: {
        database: 'connected',
        auth: 'active',
        gl_export: 'active',
      },
    });
  });
}
