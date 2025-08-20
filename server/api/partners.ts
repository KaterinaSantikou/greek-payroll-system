/**
 * Partner Firm Management API - Multi-tenant partner console endpoints
 */

import type { Express } from 'express';
import { db } from '../db';
import { 
  partnerFirms, 
  partnerMembers, 
  clientAccessGrants, 
  oboTokens,
  users,
  type PartnerFirm,
  type PartnerMember,
  type ClientAccessGrant,
  insertPartnerFirmSchema,
  insertPartnerMemberSchema,
  insertClientAccessGrantSchema
} from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { isAuthenticated } from '../replitAuth';
import { OboService } from '../services/OboService';
import { AuditService } from '../services/AuditService';

export function registerPartnerRoutes(app: Express) {
  
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

      res.json({ clients });
    } catch (error) {
      console.error('Error fetching accessible clients:', error);
      res.status(500).json({ error: 'Failed to fetch accessible clients' });
    }
  });

  // Create OBO token to act as a client tenant
  app.post('/api/partners/obo-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { partnerFirmId, asTenantId, scopes, expiresInMinutes } = req.body;

      if (!partnerFirmId || !asTenantId || !scopes) {
        return res.status(400).json({ 
          error: 'Missing required fields: partnerFirmId, asTenantId, scopes' 
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

      // Create OBO token
      const tokenResponse = await OboService.createOboToken({
        userId,
        partnerFirmId,
        asTenantId,
        scopes,
        expiresInMinutes: expiresInMinutes || 30,
        sessionId: req.sessionID,
        requestId: req.headers['x-request-id'] as string,
      });

      // Log the token creation
      await AuditService.logEvent({
        eventType: 'user_action',
        eventCategory: 'authorization',
        eventAction: 'obo_token_created',
        tenantId: asTenantId,
        partnerFirmId,
        userId,
        eventData: {
          tokenId: tokenResponse.tokenId,
          scopes,
          expiresAt: tokenResponse.expiresAt,
        },
      });

      res.json(tokenResponse);
    } catch (error) {
      console.error('Error creating OBO token:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create OBO token' 
      });
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
}