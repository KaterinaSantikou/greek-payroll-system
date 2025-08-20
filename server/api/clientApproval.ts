/**
 * Client Approval API - Public endpoints for client access invitation approval
 */

import type { Express } from 'express';
import { db } from '../db';
import { 
  clientAccessInvitations,
  partnerFirms,
  type ClientAccessInvitation
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ClientAccessService } from '../services/ClientAccessService';
import { z } from 'zod';

const approvalDecisionSchema = z.object({
  approved: z.boolean(),
  selectedScopes: z.array(z.string()).optional(),
  selectedMakerCheckerMode: z.enum(['client_checker', 'partner_checker', 'dual']).optional(),
  clientUserId: z.string().min(1), // Will be provided by client app's auth
});

export function registerClientApprovalRoutes(app: Express) {
  const clientAccessService = new ClientAccessService();

  // Get invitation details by token (public endpoint)
  app.get('/api/client-approval/invitation/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: 'Invitation token required' });
      }

      const invitation = await clientAccessService.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found or expired' });
      }

      // Get partner firm details
      const [partnerFirm] = await db.select()
        .from(partnerFirms)
        .where(eq(partnerFirms.id, invitation.partnerFirmId))
        .limit(1);

      res.json({
        invitation: {
          id: invitation.id,
          partnerFirmName: partnerFirm?.name || 'Unknown Partner',
          partnerFirmId: invitation.partnerFirmId,
          clientTenantId: invitation.clientTenantId,
          clientAdminEmail: invitation.clientAdminEmail,
          requestedScopes: invitation.requestedScopes,
          suggestedMakerCheckerMode: invitation.suggestedMakerCheckerMode,
          message: invitation.message,
          serviceType: invitation.serviceType,
          expiresAt: invitation.expiresAt,
          sentAt: invitation.sentAt,
        },
        partnerFirm: {
          id: partnerFirm?.id,
          name: partnerFirm?.name,
          displayName: partnerFirm?.displayName,
          website: partnerFirm?.website,
        }
      });
    } catch (error) {
      console.error('Error fetching invitation:', error);
      res.status(500).json({ error: 'Failed to fetch invitation details' });
    }
  });

  // Process approval decision (public endpoint)
  app.post('/api/client-approval/decision/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const validatedData = approvalDecisionSchema.parse(req.body);
      
      if (!token) {
        return res.status(400).json({ error: 'Invitation token required' });
      }

      // Get invitation by token
      const invitation = await clientAccessService.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found or expired' });
      }

      // Process the decision
      const grant = await clientAccessService.processApprovalDecision({
        invitationId: invitation.id,
        approved: validatedData.approved,
        selectedScopes: validatedData.selectedScopes,
        selectedMakerCheckerMode: validatedData.selectedMakerCheckerMode,
        clientUserId: validatedData.clientUserId,
      });

      if (validatedData.approved && grant) {
        res.json({
          success: true,
          message: 'Access granted successfully',
          grant: {
            id: grant.id,
            grantedScopes: grant.grantedScopes,
            makerCheckerMode: grant.makerCheckerMode,
            validFrom: grant.validFrom,
          }
        });
      } else {
        res.json({
          success: true,
          message: 'Invitation declined',
        });
      }
    } catch (error) {
      console.error('Error processing approval decision:', error);
      res.status(500).json({ error: 'Failed to process approval decision' });
    }
  });

  // Get available permission scopes and descriptions (public endpoint)
  app.get('/api/client-approval/permission-scopes', async (req, res) => {
    try {
      const { PermissionScopes } = await import('../services/ClientAccessService');
      
      res.json({
        scopes: PermissionScopes,
        categories: {
          'filings': {
            name: 'Tax & Compliance Filings',
            description: 'Manage APD and ΦΜΥ government filings',
            scopes: ['filings:prepare', 'filings:submit', 'filings:view']
          },
          'runs': {
            name: 'Payroll Processing',
            description: 'View and manage payroll calculations',
            scopes: ['runs:view', 'runs:prepare', 'runs:finalize']
          },
          'employees': {
            name: 'Employee Data',
            description: 'Access employee information and records',
            scopes: ['employees:read', 'employees:write', 'employees:create']
          },
          'audit': {
            name: 'Audit & Compliance',
            description: 'Download reports and view compliance status',
            scopes: ['audit:download', 'audit:view']
          },
          'payments': {
            name: 'Payments & Banking',
            description: 'Manage payment batches and bank transfers',
            scopes: ['payments:view', 'payments:create', 'payments:approve']
          },
          'admin': {
            name: 'Administrative',
            description: 'System settings and user management',
            scopes: ['admin:settings', 'admin:users']
          }
        },
        makerCheckerModes: {
          'client_checker': {
            name: 'Client Approval Required',
            description: 'Partner prepares actions, client approves and submits.',
            workflow: 'Partner → Client Approval → Submit'
          },
          'partner_checker': {
            name: 'Partner Internal Approval',
            description: 'Partner staff prepares, partner reviewer approves and submits.',
            workflow: 'Partner Staff → Partner Reviewer → Submit'
          },
          'dual': {
            name: 'Dual Approval Required',
            description: 'Both partner and client approval required for sensitive actions.',
            workflow: 'Partner → Client Approval → Partner Submit'
          }
        }
      });
    } catch (error) {
      console.error('Error fetching permission scopes:', error);
      res.status(500).json({ error: 'Failed to fetch permission scopes' });
    }
  });

  // Validate invitation token (for client UI)
  app.get('/api/client-approval/validate/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: 'Invitation token required' });
      }

      const invitation = await clientAccessService.getInvitationByToken(token);
      
      res.json({
        valid: !!invitation,
        expired: !invitation,
      });
    } catch (error) {
      console.error('Error validating token:', error);
      res.status(500).json({ error: 'Failed to validate token' });
    }
  });
}