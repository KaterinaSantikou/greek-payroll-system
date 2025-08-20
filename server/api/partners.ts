/**
 * Partner Firm Management API - Multi-tenant partner console endpoints
 */

import type { Express } from 'express';
import { db } from '../db';
import { 
  partnerFirms, 
  partnerMembers, 
  clientAccessGrants,
  clientAccessInvitations,
  oboTokens,
  users,
  type PartnerFirm,
  type PartnerMember,
  type ClientAccessGrant,
  type ClientAccessInvitation,
  insertPartnerFirmSchema,
  insertPartnerMemberSchema,
  insertClientAccessGrantSchema,
  insertClientAccessInvitationSchema
} from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { isAuthenticated } from '../replitAuth';
import { OboService } from '../services/OboService';
import { AuditService } from '../services/AuditService';
import { SecurityService } from '../services/SecurityService';
import { ConsentService } from '../services/ConsentService';
import { MakerCheckerService } from '../services/MakerCheckerService';
import { ClientAccessService, PermissionScopes } from '../services/ClientAccessService';

export function registerPartnerRoutes(app: Express) {
  
  // Security & Compliance monitoring endpoints
  app.get('/api/partners/security/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const metrics = await SecurityService.collectMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      res.status(500).json({ error: 'Failed to fetch security metrics' });
    }
  });

  app.get('/api/partners/security/slos', isAuthenticated, async (req: any, res) => {
    try {
      const slos = await SecurityService.checkSLOs();
      res.json(slos);
    } catch (error) {
      console.error('Error checking SLOs:', error);
      res.status(500).json({ error: 'Failed to check SLOs' });
    }
  });

  // Get partner firms for current user
  app.get('/api/partners/firms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Get firms where user is a member
      const memberFirms = await db
        .select({
          firm: partnerFirms,
          membership: partnerMembers,
        })
        .from(partnerFirms)
        .innerJoin(partnerMembers, eq(partnerFirms.id, partnerMembers.partnerFirmId))
        .where(
          and(
            eq(partnerMembers.userId, userId),
            eq(partnerMembers.isActive, true),
            eq(partnerFirms.isActive, true)
          )
        );

      res.json({
        firms: memberFirms.map(({ firm, membership }) => ({
          ...firm,
          userRole: membership.role,
          permissions: membership.permissions,
        })),
      });
    } catch (error) {
      console.error('Error fetching partner firms:', error);
      res.status(500).json({ error: 'Failed to fetch partner firms' });
    }
  });

  // Get client tenants accessible by current user through partner firms
  app.get('/api/partners/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      
      // Get client access grants for firms where user is a member
      const accessibleClients = await db
        .select({
          grant: clientAccessGrants,
          firm: partnerFirms,
          membership: partnerMembers,
        })
        .from(clientAccessGrants)
        .innerJoin(partnerFirms, eq(clientAccessGrants.partnerFirmId, partnerFirms.id))
        .innerJoin(partnerMembers, eq(partnerFirms.id, partnerMembers.partnerFirmId))
        .where(
          and(
            eq(partnerMembers.userId, userId),
            eq(partnerMembers.isActive, true),
            eq(clientAccessGrants.isActive, true),
            eq(partnerFirms.isActive, true)
          )
        );

      const clients = accessibleClients.map(({ grant, firm, membership }) => ({
        clientTenantId: grant.clientTenantId,
        clientName: grant.clientTenantId, // Use tenantId as name for now
        clientType: 'business', // Default client type
        partnerFirmId: firm.id,
        partnerFirmName: firm.name,
        grantedScopes: grant.grantedScopes,
        permissions: {}, // Default empty permissions
        userRole: membership.role,
        validUntil: grant.validUntil,
        lastUsed: grant.lastUsedAt,
      }));

      // Add mock data for demo
      const enhancedClients = clients.map(client => ({
        ...client,
        clientName: client.clientTenantId === 'princess-sa' ? 'Princess SA' : 
                   client.clientTenantId === 'demo-hotel' ? 'Demo Hotel Group' :
                   `Client ${client.clientTenantId.slice(0, 8)}`,
        afm: client.clientTenantId === 'princess-sa' ? '123456789' : '987654321',
        makerCheckerMode: client.grantedScopes.includes('filings:submit') ? 'partner_checker' : 'client_checker',
        industry: 'hospitality',
        size: 'medium' as const,
        isFavorite: client.clientTenantId === 'princess-sa',
        tags: ['hotel', 'seasonal']
      }));

      res.json({ clients: enhancedClients });
    } catch (error) {
      console.error('Error fetching accessible clients:', error);
      res.status(500).json({ error: 'Failed to fetch accessible clients' });
    }
  });

  // Get OBO token for tenant context switching (Flow 7.1)
  app.get('/v1/partner/obo-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { tenant_id } = req.query;

      if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id parameter is required' });
      }

      // Find the partner firm that has access to this tenant
      const clientAccess = await db
        .select({
          grant: clientAccessGrants,
          firm: partnerFirms,
          membership: partnerMembers,
        })
        .from(clientAccessGrants)
        .innerJoin(partnerFirms, eq(clientAccessGrants.partnerFirmId, partnerFirms.id))
        .innerJoin(partnerMembers, eq(partnerFirms.id, partnerMembers.partnerFirmId))
        .where(
          and(
            eq(partnerMembers.userId, userId),
            eq(clientAccessGrants.clientTenantId, tenant_id as string),
            eq(partnerMembers.isActive, true),
            eq(clientAccessGrants.isActive, true),
            eq(partnerFirms.isActive, true)
          )
        )
        .limit(1);

      if (clientAccess.length === 0) {
        return res.status(403).json({ error: 'Access denied to this tenant' });
      }

      const { grant, firm, membership } = clientAccess[0];

      // Create short-lived OBO token (15 minutes for context switching)
      const tokenResponse = await OboService.createOboToken({
        userId,
        partnerFirmId: firm.id,
        asTenantId: tenant_id as string,
        scopes: grant.grantedScopes,
        expiresInMinutes: 15, // Short-lived for security
        sessionId: req.sessionID,
        requestId: req.headers['x-request-id'] as string,
      });

      // Log the context switch
      await AuditService.logEvent({
        eventType: 'user_action',
        eventCategory: 'authorization',
        eventAction: 'tenant_context_switch',
        tenantId: tenant_id as string,
        partnerFirmId: firm.id,
        userId,
        eventData: {
          tokenId: tokenResponse.tokenId,
          clientName: grant.clientTenantId,
          scopes: grant.grantedScopes,
          expiresAt: tokenResponse.expiresAt,
        },
      });

      res.json({
        obo_token: tokenResponse.token,
        expires_at: tokenResponse.expiresAt,
        client_name: grant.clientTenantId,
        granted_scopes: grant.grantedScopes,
        maker_checker_mode: grant.makerCheckerMode,
      });
    } catch (error) {
      console.error('Error creating context OBO token:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create context token' 
      });
    }
  });

  // Enhanced OBO token creation with security compliance (TTL ≤ 10min, rotation, audit attribution)
  app.post('/api/partners/obo-token', isAuthenticated, async (req: any, res) => {
    const startTime = Date.now();
    
    try {
      const userId = req.user?.claims?.sub;
      const { partnerFirmId, asTenantId, scopes, rotateExisting = false, expiresInMinutes } = req.body;

      if (!partnerFirmId || !asTenantId || !scopes) {
        return res.status(400).json({ 
          error: 'Missing required fields: partnerFirmId, asTenantId, scopes' 
        });
      }

      // Security: Check consent is active
      const consentActive = await ConsentService.isConsentActive(asTenantId, partnerFirmId);
      if (!consentActive) {
        return res.status(403).json({ 
          error: 'Client consent not active or expired',
          code: 'CONSENT_REQUIRED'
        });
      }

      // Validate that user is a member of the partner firm
      const [membership] = await db
        .select()
        .from(partnerMembers)
        .where(
          and(
            eq(partnerMembers.userId, userId),
            eq(partnerMembers.partnerFirmId, partnerFirmId),
            eq(partnerMembers.isActive, true)
          )
        );

      if (!membership) {
        return res.status(403).json({ 
          error: 'User is not an active member of the specified partner firm' 
        });
      }

      // Security: Enforce TTL ≤ 10 minutes
      const effectiveExpiresInMinutes = Math.min(expiresInMinutes || 10, 10);

      // Create OBO token with enhanced security
      const tokenResponse = await OboService.createOboToken({
        userId,
        partnerFirmId,
        asTenantId,
        scopes,
        expiresInMinutes: effectiveExpiresInMinutes,
        rotateExisting, // Token rotation on tab switch
        sessionId: req.sessionID,
        requestId: req.headers['x-request-id'] as string,
      });

      const responseTime = Date.now() - startTime;
      
      // Enhanced audit logging with OBO attribution
      await SecurityService.logOboOperation({
        action: 'obo_token_created',
        actorType: 'partner',
        partnerId: partnerFirmId,
        userId,
        asTenantId,
        operationData: {
          tokenId: tokenResponse.tokenId,
          scopes,
          expiresAt: tokenResponse.expiresAt,
          ttlEnforced: effectiveExpiresInMinutes,
          rotatedTokens: tokenResponse.rotatedTokens || [],
          responseTime,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        success: true,
        token: tokenResponse.token,
        tokenId: tokenResponse.tokenId,
        expiresAt: tokenResponse.expiresAt,
        scopes: tokenResponse.scopes,
        asTenantId: tokenResponse.asTenantId,
        securityMetadata: {
          ttlEnforced: effectiveExpiresInMinutes <= 10,
          rotatedTokens: tokenResponse.rotatedTokens?.length || 0,
          responseTime,
          consentVerified: true,
        },
      });
    } catch (error) {
      console.error('Error creating OBO token:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create OBO token' 
      });
    }
  });

  // Switch tenant context in session (Flow 7.1)
  app.post('/api/partners/switch-tenant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { tenantId, partnerFirmId } = req.body;

      if (!tenantId || !partnerFirmId) {
        return res.status(400).json({ error: 'tenantId and partnerFirmId are required' });
      }

      // Validate access to the tenant
      const [clientAccess] = await db
        .select({
          grant: clientAccessGrants,
          firm: partnerFirms,
        })
        .from(clientAccessGrants)
        .innerJoin(partnerFirms, eq(clientAccessGrants.partnerFirmId, partnerFirms.id))
        .innerJoin(partnerMembers, eq(partnerFirms.id, partnerMembers.partnerFirmId))
        .where(
          and(
            eq(partnerMembers.userId, userId),
            eq(clientAccessGrants.clientTenantId, tenantId),
            eq(clientAccessGrants.partnerFirmId, partnerFirmId),
            eq(partnerMembers.isActive, true),
            eq(clientAccessGrants.isActive, true)
          )
        );

      if (!clientAccess) {
        return res.status(403).json({ error: 'Access denied to this tenant' });
      }

      // Store context in session
      (req.session as any).currentTenant = tenantId;
      (req.session as any).currentPartnerFirm = partnerFirmId;
      (req.session as any).contextSwitchedAt = new Date().toISOString();

      // Log the context switch
      await AuditService.logEvent({
        eventType: 'user_action',
        eventCategory: 'session',
        eventAction: 'context_switched',
        tenantId,
        partnerFirmId,
        userId,
        eventData: {
          previousContext: (req.session as any).previousTenant || null,
          newContext: tenantId,
          firmName: clientAccess.firm.name,
        },
      });

      // Update last used timestamp
      await db
        .update(clientAccessGrants)
        .set({ lastUsedAt: new Date() })
        .where(
          and(
            eq(clientAccessGrants.clientTenantId, tenantId),
            eq(clientAccessGrants.partnerFirmId, partnerFirmId)
          )
        );

      res.json({ 
        success: true, 
        currentTenant: tenantId,
        currentPartnerFirm: partnerFirmId,
      });
    } catch (error) {
      console.error('Error switching tenant context:', error);
      res.status(500).json({ error: 'Failed to switch tenant context' });
    }
  });

  // Get current context
  app.get('/api/partners/current-context', isAuthenticated, async (req: any, res) => {
    try {
      const currentTenant = (req.session as any).currentTenant;
      const currentPartnerFirm = (req.session as any).currentPartnerFirm;
      const contextSwitchedAt = (req.session as any).contextSwitchedAt;

      res.json({
        currentTenant,
        currentPartnerFirm,
        contextSwitchedAt,
        hasActiveContext: !!(currentTenant && currentPartnerFirm),
      });
    } catch (error) {
      console.error('Error getting current context:', error);
      res.status(500).json({ error: 'Failed to get current context' });
    }
  });

  // Get active OBO tokens for current user
  app.get('/api/partners/obo-tokens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const activeTokens = await OboService.getUserActiveTokens(userId);

      const tokensWithDetails = activeTokens.map(token => ({
        id: token.id,
        asTenantId: token.asTenantId,
        partnerFirmId: token.partnerFirmId,
        scopes: token.scopes,
        expiresAt: token.expiresAt,
        usageCount: token.usageCount,
        maxUsage: token.maxUsage,
        issuedAt: token.issuedAt,
        lastUsedAt: token.lastUsedAt,
      }));

      res.json({ tokens: tokensWithDetails });
    } catch (error) {
      console.error('Error fetching OBO tokens:', error);
      res.status(500).json({ error: 'Failed to fetch OBO tokens' });
    }
  });

  // Revoke an OBO token
  app.delete('/api/partners/obo-tokens/:tokenId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { tokenId } = req.params;
      const { reason } = req.body;

      await OboService.revokeOboToken(tokenId, userId, reason);

      // Log the token revocation
      await AuditService.logEvent({
        eventType: 'user_action',
        eventCategory: 'authorization',
        eventAction: 'obo_token_revoked',
        tenantId: '', // We don't have tenant context in revocation
        userId,
        eventData: {
          tokenId,
          reason,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error revoking OBO token:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to revoke OBO token' 
      });
    }
  });

  // Get partner firm details
  app.get('/api/partners/firms/:firmId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { firmId } = req.params;

      // Verify user has access to this firm
      const [membership] = await db
        .select()
        .from(partnerMembers)
        .where(
          and(
            eq(partnerMembers.userId, userId),
            eq(partnerMembers.partnerFirmId, firmId),
            eq(partnerMembers.isActive, true)
          )
        );

      if (!membership) {
        return res.status(403).json({ 
          error: 'Access denied to partner firm' 
        });
      }

      // Get firm details
      const [firm] = await db
        .select()
        .from(partnerFirms)
        .where(eq(partnerFirms.id, firmId));

      if (!firm) {
        return res.status(404).json({ error: 'Partner firm not found' });
      }

      // Get all members if user has admin role
      let members: Array<{ member: PartnerMember; user: any }> = [];
      if (membership.role === 'admin') {
        members = await db
          .select({
            member: partnerMembers,
            user: users,
          })
          .from(partnerMembers)
          .leftJoin(users, eq(partnerMembers.userId, users.id))
          .where(eq(partnerMembers.partnerFirmId, firmId));
      }

      // Get client grants
      const clientGrants = await db
        .select()
        .from(clientAccessGrants)
        .where(eq(clientAccessGrants.partnerFirmId, firmId));

      res.json({
        firm,
        userRole: membership.role,
        members: members.map(({ member, user }) => ({
          ...member,
          user: user ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          } : null,
        })),
        clientGrants,
      });
    } catch (error) {
      console.error('Error fetching partner firm details:', error);
      res.status(500).json({ error: 'Failed to fetch partner firm details' });
    }
  });

  // Switch active tenant context (for UI state management)
  app.post('/api/partners/switch-tenant', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { tenantId, partnerFirmId } = req.body;

      if (!tenantId || !partnerFirmId) {
        return res.status(400).json({ 
          error: 'Missing required fields: tenantId, partnerFirmId' 
        });
      }

      // Verify access to the tenant through partner firm
      const [accessGrant] = await db
        .select()
        .from(clientAccessGrants)
        .innerJoin(partnerMembers, eq(clientAccessGrants.partnerFirmId, partnerMembers.partnerFirmId))
        .where(
          and(
            eq(partnerMembers.userId, userId),
            eq(clientAccessGrants.partnerFirmId, partnerFirmId),
            eq(clientAccessGrants.clientTenantId, tenantId),
            eq(clientAccessGrants.isActive, true),
            eq(partnerMembers.isActive, true)
          )
        );

      if (!accessGrant) {
        return res.status(403).json({ 
          error: 'Access denied to specified tenant through partner firm' 
        });
      }

      // Log the tenant switch
      await AuditService.logEvent({
        eventType: 'user_action',
        eventCategory: 'navigation',
        eventAction: 'tenant_switch',
        tenantId,
        partnerFirmId,
        userId,
        eventData: {
          fromTenant: req.session?.currentTenant,
          toTenant: tenantId,
        },
      });

      // Store current tenant in session for UI state
      req.session.currentTenant = tenantId;
      req.session.currentPartnerFirm = partnerFirmId;

      res.json({ 
        success: true,
        currentTenant: tenantId,
        currentPartnerFirm: partnerFirmId,
      });
    } catch (error) {
      console.error('Error switching tenant:', error);
      res.status(500).json({ error: 'Failed to switch tenant' });
    }
  });

  // Get current tenant context
  app.get('/api/partners/current-context', isAuthenticated, async (req: any, res) => {
    try {
      const currentTenant = req.session?.currentTenant;
      const currentPartnerFirm = req.session?.currentPartnerFirm;

      res.json({
        currentTenant,
        currentPartnerFirm,
      });
    } catch (error) {
      console.error('Error getting current context:', error);
      res.status(500).json({ error: 'Failed to get current context' });
    }
  });

  // CLIENT ACCESS INVITATION ENDPOINTS

  const clientAccessService = new ClientAccessService();

  // Send invitation to client for partner access
  app.post('/api/partners/invitations/send', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const validatedData = insertClientAccessInvitationSchema.parse(req.body);

      // Validate partner firm access
      const partnerMember = await db.select()
        .from(partnerMembers)
        .where(and(
          eq(partnerMembers.partnerFirmId, validatedData.partnerFirmId),
          eq(partnerMembers.userId, userId),
          eq(partnerMembers.isActive, true)
        ))
        .limit(1);

      if (!partnerMember.length) {
        return res.status(403).json({ error: 'Not authorized for this partner firm' });
      }

      // Check if user has permission to send invitations
      if (!partnerMember[0].canManageClients) {
        return res.status(403).json({ error: 'Not authorized to send client invitations' });
      }

      const invitation = await clientAccessService.sendInvitation({
        partnerFirmId: validatedData.partnerFirmId,
        clientTenantId: validatedData.clientTenantId,
        clientAdminEmail: validatedData.clientAdminEmail,
        requestedScopes: Array.isArray(validatedData.requestedScopes) 
          ? validatedData.requestedScopes 
          : ['filings:prepare', 'runs:view', 'audit:download'],
        suggestedMakerCheckerMode: validatedData.suggestedMakerCheckerMode,
        message: validatedData.message,
        serviceType: validatedData.serviceType,
      }, userId);

      res.json(invitation);
    } catch (error) {
      console.error('Error sending invitation:', error);
      res.status(500).json({ error: 'Failed to send invitation' });
    }
  });

  // Get invitations sent by partner firm
  app.get('/api/partners/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const partnerFirmId = req.query.partnerFirmId as string;

      if (!partnerFirmId) {
        return res.status(400).json({ error: 'Partner firm ID required' });
      }

      // Validate partner firm access
      const partnerMember = await db.select()
        .from(partnerMembers)
        .where(and(
          eq(partnerMembers.partnerFirmId, partnerFirmId),
          eq(partnerMembers.userId, userId),
          eq(partnerMembers.isActive, true)
        ))
        .limit(1);

      if (!partnerMember.length) {
        return res.status(403).json({ error: 'Not authorized for this partner firm' });
      }

      const invitations = await db.select()
        .from(clientAccessInvitations)
        .where(eq(clientAccessInvitations.partnerFirmId, partnerFirmId));

      res.json(invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ error: 'Failed to fetch invitations' });
    }
  });

  // Get available permission scopes
  app.get('/api/partners/permission-scopes', isAuthenticated, async (req: any, res) => {
    try {
      res.json({
        scopes: PermissionScopes,
        defaultScopes: ['filings:prepare', 'runs:view', 'audit:download'],
        makerCheckerModes: [
          { value: 'client_checker', label: 'Client approves partner actions', description: 'Partner prepares; client approves/submits.' },
          { value: 'partner_checker', label: 'Partner internal approval', description: 'Partner staff prepares; partner reviewer approves/submits.' },
          { value: 'dual', label: 'Dual approval required', description: 'Partner prepares; client approves; partner submits (or vice-versa).' },
        ]
      });
    } catch (error) {
      console.error('Error fetching permission scopes:', error);
      res.status(500).json({ error: 'Failed to fetch permission scopes' });
    }
  });

  // Get access grants for partner firm
  app.get('/api/partners/grants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const partnerFirmId = req.query.partnerFirmId as string;

      if (!partnerFirmId) {
        return res.status(400).json({ error: 'Partner firm ID required' });
      }

      // Validate partner firm access
      const partnerMember = await db.select()
        .from(partnerMembers)
        .where(and(
          eq(partnerMembers.partnerFirmId, partnerFirmId),
          eq(partnerMembers.userId, userId),
          eq(partnerMembers.isActive, true)
        ))
        .limit(1);

      if (!partnerMember.length) {
        return res.status(403).json({ error: 'Not authorized for this partner firm' });
      }

      const grants = await clientAccessService.getPartnerGrants(partnerFirmId);
      res.json(grants);
    } catch (error) {
      console.error('Error fetching access grants:', error);
      res.status(500).json({ error: 'Failed to fetch access grants' });
    }
  });

  // Revoke access grant
  app.delete('/api/partners/grants/:grantId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { grantId } = req.params;

      // Get the grant to check partner firm access
      const [grant] = await db.select()
        .from(clientAccessGrants)
        .where(eq(clientAccessGrants.id, grantId))
        .limit(1);

      if (!grant) {
        return res.status(404).json({ error: 'Grant not found' });
      }

      // Validate partner firm access
      const partnerMember = await db.select()
        .from(partnerMembers)
        .where(and(
          eq(partnerMembers.partnerFirmId, grant.partnerFirmId),
          eq(partnerMembers.userId, userId),
          eq(partnerMembers.isActive, true)
        ))
        .limit(1);

      if (!partnerMember.length) {
        return res.status(403).json({ error: 'Not authorized for this partner firm' });
      }

      // Check if user has permission to manage clients
      if (!partnerMember[0].canManageClients) {
        return res.status(403).json({ error: 'Not authorized to revoke client access' });
      }

      await clientAccessService.revokeGrant(grantId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error revoking grant:', error);
      res.status(500).json({ error: 'Failed to revoke grant' });
    }
  });
}