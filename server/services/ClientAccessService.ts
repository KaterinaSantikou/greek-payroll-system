import { randomUUID } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  clientAccessInvitations,
  clientAccessGrants,
  partnerFirms,
  users,
  type InsertClientAccessInvitation,
  type InsertClientAccessGrant,
  type ClientAccessInvitation,
  type ClientAccessGrant,
} from '../../shared/schema';
import { AuditService } from './AuditService';
import { MakerCheckerService } from './MakerCheckerService';

// Standard permission scopes for Greek payroll and compliance
export const PermissionScopes = {
  // Filing permissions
  'filings:prepare': 'Prepare tax and compliance filings (APD, ΦΜΥ)',
  'filings:submit': 'Submit filings to government systems',
  'filings:view': 'View filing status and history',
  
  // Payroll run permissions
  'runs:view': 'View payroll run details and calculations',
  'runs:prepare': 'Create and modify payroll runs',
  'runs:finalize': 'Finalize and approve payroll runs',
  
  // Employee data permissions
  'employees:read': 'View employee information and records',
  'employees:write': 'Modify employee information',
  'employees:create': 'Create new employee records',
  
  // Audit and compliance permissions
  'audit:download': 'Download audit reports and compliance packs',
  'audit:view': 'View audit logs and compliance status',
  
  // Payment permissions
  'payments:view': 'View payment batches and bank transfers',
  'payments:create': 'Create payment batches',
  'payments:approve': 'Approve payment batches for transfer',
  
  // Administrative permissions
  'admin:settings': 'Manage system settings and configurations',
  'admin:users': 'Manage user accounts and permissions',
} as const;

// Least privilege default scopes
export const DefaultScopes: (keyof typeof PermissionScopes)[] = [
  'filings:prepare',
  'runs:view', 
  'audit:download'
];

// Maker-checker modes
export type MakerCheckerMode = 'client_checker' | 'partner_checker' | 'dual';

export interface InvitationRequest {
  partnerFirmId: string;
  clientTenantId: string;
  clientAdminEmail: string;
  requestedScopes: string[];
  suggestedMakerCheckerMode: MakerCheckerMode;
  message?: string;
  serviceType?: string;
}

export interface ApprovalDecision {
  invitationId: string;
  approved: boolean;
  selectedScopes?: string[];
  selectedMakerCheckerMode?: MakerCheckerMode;
  clientUserId: string;
}

export class ClientAccessService {
  private auditService: AuditService;
  private makerCheckerService: MakerCheckerService;

  constructor() {
    this.auditService = new AuditService();
    this.makerCheckerService = new MakerCheckerService();
  }

  /**
   * Send invitation to client admin for partner access
   */
  async sendInvitation(request: InvitationRequest, createdByUserId: string): Promise<ClientAccessInvitation> {
    // Validate requested scopes
    const validScopes = Object.keys(PermissionScopes);
    const invalidScopes = request.requestedScopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      throw new Error(`Invalid scopes requested: ${invalidScopes.join(', ')}`);
    }

    // Validate partner firm exists
    const partnerFirm = await db.select()
      .from(partnerFirms)
      .where(eq(partnerFirms.id, request.partnerFirmId))
      .limit(1);

    if (!partnerFirm.length) {
      throw new Error('Partner firm not found');
    }

    // Generate unique invitation token
    const invitationToken = `inv_${randomUUID()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invitation: InsertClientAccessInvitation = {
      partnerFirmId: request.partnerFirmId,
      clientTenantId: request.clientTenantId,
      clientAdminEmail: request.clientAdminEmail,
      requestedScopes: request.requestedScopes,
      suggestedMakerCheckerMode: request.suggestedMakerCheckerMode,
      invitationToken,
      message: request.message,
      serviceType: request.serviceType || 'payroll',
      expiresAt,
      createdBy: createdByUserId,
    };

    const [createdInvitation] = await db.insert(clientAccessInvitations)
      .values(invitation)
      .returning();

    // Audit log
    await AuditService.logEvent({
      eventType: 'client_access_invitation_sent',
      eventCategory: 'partner_access',
      eventAction: 'invitation_sent',
      userId: createdByUserId,
      tenantId: request.clientTenantId,
      partnerFirmId: request.partnerFirmId,
      eventData: {
        invitationId: createdInvitation.id,
        partnerFirmId: request.partnerFirmId,
        requestedScopes: request.requestedScopes,
        suggestedMakerCheckerMode: request.suggestedMakerCheckerMode,
      }
    });

    return createdInvitation;
  }

  /**
   * Get invitation by token for client approval page
   */
  async getInvitationByToken(token: string): Promise<ClientAccessInvitation | null> {
    const [invitation] = await db.select()
      .from(clientAccessInvitations)
      .where(and(
        eq(clientAccessInvitations.invitationToken, token),
        eq(clientAccessInvitations.status, 'pending')
      ))
      .limit(1);

    if (!invitation) return null;

    // Check expiration
    if (new Date() > invitation.expiresAt) {
      await this.expireInvitation(invitation.id);
      return null;
    }

    return invitation;
  }

  /**
   * Process client's approval/rejection decision
   */
  async processApprovalDecision(decision: ApprovalDecision): Promise<ClientAccessGrant | null> {
    const invitation = await db.select()
      .from(clientAccessInvitations)
      .where(eq(clientAccessInvitations.id, decision.invitationId))
      .limit(1);

    if (!invitation.length || invitation[0].status !== 'pending') {
      throw new Error('Invalid or expired invitation');
    }

    const invitationRecord = invitation[0];

    if (!decision.approved) {
      // Reject invitation
      await db.update(clientAccessInvitations)
        .set({
          status: 'rejected',
          respondedAt: new Date(),
          approvedBy: decision.clientUserId,
        })
        .where(eq(clientAccessInvitations.id, decision.invitationId));

      await AuditService.logEvent({
        eventType: 'client_access_invitation_rejected',
        eventCategory: 'partner_access',
        eventAction: 'invitation_rejected',
        userId: decision.clientUserId,
        tenantId: invitationRecord.clientTenantId,
        partnerFirmId: invitationRecord.partnerFirmId,
        eventData: {
          invitationId: decision.invitationId,
          partnerFirmId: invitationRecord.partnerFirmId,
        }
      });

      return null;
    }

    // Approve invitation and create grant
    const selectedScopes = decision.selectedScopes || invitationRecord.requestedScopes;
    const selectedMakerCheckerMode = decision.selectedMakerCheckerMode || invitationRecord.suggestedMakerCheckerMode;

    // Update invitation status
    await db.update(clientAccessInvitations)
      .set({
        status: 'approved',
        respondedAt: new Date(),
        approvedBy: decision.clientUserId,
      })
      .where(eq(clientAccessInvitations.id, decision.invitationId));

    // Create access grant
    const grant: InsertClientAccessGrant = {
      invitationId: decision.invitationId,
      partnerFirmId: invitationRecord.partnerFirmId,
      clientTenantId: invitationRecord.clientTenantId,
      grantedScopes: selectedScopes,
      makerCheckerMode: selectedMakerCheckerMode,
      serviceType: invitationRecord.serviceType,
      grantedBy: decision.clientUserId,
      validFrom: new Date(),
    };

    const [createdGrant] = await db.insert(clientAccessGrants)
      .values(grant)
      .returning();

    // Note: Maker-checker configuration will be handled when first workflow is initiated

    await AuditService.logEvent({
      eventType: 'client_access_grant_created',
      eventCategory: 'partner_access',
      eventAction: 'grant_created',
      userId: decision.clientUserId,
      tenantId: invitationRecord.clientTenantId,
      partnerFirmId: invitationRecord.partnerFirmId,
      eventData: {
        grantId: createdGrant.id,
        invitationId: decision.invitationId,
        partnerFirmId: invitationRecord.partnerFirmId,
        grantedScopes: selectedScopes,
        makerCheckerMode: selectedMakerCheckerMode,
      }
    });

    return createdGrant;
  }

  /**
   * Check if user has specific permission scope for a tenant
   */
  async hasPermission(
    userId: string, 
    tenantId: string, 
    scope: string,
    partnerFirmId?: string
  ): Promise<boolean> {
    // Get user's grants for this tenant
    const grants = await db.select()
      .from(clientAccessGrants)
      .where(and(
        eq(clientAccessGrants.clientTenantId, tenantId),
        eq(clientAccessGrants.isActive, true),
        partnerFirmId ? eq(clientAccessGrants.partnerFirmId, partnerFirmId) : undefined
      ));

    if (!grants.length) return false;

    // Check if any grant includes the requested scope
    return grants.some(grant => {
      const scopes = Array.isArray(grant.grantedScopes) ? grant.grantedScopes : [];
      return scopes.includes(scope);
    });
  }

  /**
   * Get all active grants for a partner firm
   */
  async getPartnerGrants(partnerFirmId: string): Promise<ClientAccessGrant[]> {
    return db.select()
      .from(clientAccessGrants)
      .where(and(
        eq(clientAccessGrants.partnerFirmId, partnerFirmId),
        eq(clientAccessGrants.isActive, true)
      ));
  }

  /**
   * Get all active grants for a client tenant
   */
  async getClientGrants(clientTenantId: string): Promise<ClientAccessGrant[]> {
    return db.select()
      .from(clientAccessGrants)
      .where(and(
        eq(clientAccessGrants.clientTenantId, clientTenantId),
        eq(clientAccessGrants.isActive, true)
      ));
  }

  /**
   * Revoke access grant
   */
  async revokeGrant(grantId: string, revokedByUserId: string): Promise<void> {
    const [grant] = await db.select()
      .from(clientAccessGrants)
      .where(eq(clientAccessGrants.id, grantId))
      .limit(1);

    if (!grant) {
      throw new Error('Grant not found');
    }

    await db.update(clientAccessGrants)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(clientAccessGrants.id, grantId));

    await AuditService.logEvent({
      eventType: 'client_access_grant_revoked',
      eventCategory: 'partner_access',
      eventAction: 'grant_revoked',
      userId: revokedByUserId,
      tenantId: grant.clientTenantId,
      partnerFirmId: grant.partnerFirmId,
      eventData: {
        grantId,
        partnerFirmId: grant.partnerFirmId,
        revokedScopes: grant.grantedScopes,
      }
    });
  }

  /**
   * Expire invitation
   */
  private async expireInvitation(invitationId: string): Promise<void> {
    await db.update(clientAccessInvitations)
      .set({
        status: 'expired',
      })
      .where(eq(clientAccessInvitations.id, invitationId));
  }

  /**
   * Get pending invitations for a client
   */
  async getPendingInvitations(clientTenantId: string): Promise<ClientAccessInvitation[]> {
    return db.select()
      .from(clientAccessInvitations)
      .where(and(
        eq(clientAccessInvitations.clientTenantId, clientTenantId),
        eq(clientAccessInvitations.status, 'pending')
      ));
  }

  /**
   * Validate and filter scopes based on user's role and permissions
   */
  validateScopes(requestedScopes: string[], userRole?: string): string[] {
    const validScopes = Object.keys(PermissionScopes);
    const filteredScopes = requestedScopes.filter(scope => validScopes.includes(scope));

    // Apply role-based restrictions if needed
    if (userRole === 'basic_partner') {
      // Basic partners can't request administrative or write permissions
      return filteredScopes.filter(scope => 
        !scope.includes('admin:') && 
        !scope.includes(':write') &&
        !scope.includes(':create')
      );
    }

    return filteredScopes;
  }
}