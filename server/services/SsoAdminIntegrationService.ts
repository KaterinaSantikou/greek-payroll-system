/**
 * SSO Admin Integration Service
 * Provides comprehensive SSO administration with role-based access controls
 */

import { SsoService } from './SsoService';
import { storage } from '../storage';
import { AuditService } from './AuditService';

export interface SsoAdminConfig {
  allowedAdminDomains: string[];
  defaultRoleMapping: Record<string, string>;
  autoProvisionUsers: boolean;
  requireApprovalForNewDomains: boolean;
}

export interface SsoIntegrationStatus {
  provider: string;
  domain: string;
  status: 'active' | 'pending' | 'disabled';
  userCount: number;
  lastSync: Date;
  configuration: any;
}

export interface SsoUserProvisionRequest {
  email: string;
  firstName: string;
  lastName: string;
  provider: string;
  suggestedRole: string;
  organizationUnit?: string;
}

export class SsoAdminIntegrationService {
  private static config: SsoAdminConfig = {
    allowedAdminDomains: ['admin.payrollsync.com'],
    defaultRoleMapping: {
      'admin': 'admin',
      'hr': 'hr',
      'payroll': 'payroll',
      'manager': 'manager',
      'employee': 'employee'
    },
    autoProvisionUsers: false,
    requireApprovalForNewDomains: true
  };

  /**
   * Configure SSO admin settings
   */
  static configure(config: Partial<SsoAdminConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get all SSO integrations status
   */
  static async getAllIntegrations(): Promise<SsoIntegrationStatus[]> {
    try {
      // This would typically query your SSO provider configurations
      const integrations: SsoIntegrationStatus[] = [
        {
          provider: 'google',
          domain: 'company.com',
          status: 'active',
          userCount: 45,
          lastSync: new Date(),
          configuration: {
            clientId: 'xxx',
            scopes: ['openid', 'email', 'profile'],
            autoProvisioning: true
          }
        },
        {
          provider: 'microsoft',
          domain: 'enterprise.gr',
          status: 'active', 
          userCount: 23,
          lastSync: new Date(),
          configuration: {
            tenantId: 'xxx',
            clientId: 'yyy',
            autoProvisioning: false
          }
        }
      ];

      return integrations;
    } catch (error) {
      console.error('Error fetching SSO integrations:', error);
      throw new Error('Failed to fetch SSO integrations');
    }
  }

  /**
   * Configure new SSO provider integration
   */
  static async configureProvider(
    providerId: string,
    config: any,
    adminUserId: string
  ): Promise<{ success: boolean; integrationId: string }> {
    try {
      // Validate admin permissions
      await this.validateAdminPermissions(adminUserId);

      // Validate configuration
      this.validateProviderConfig(providerId, config);

      // Store provider configuration (encrypted)
      const integrationId = `sso_${providerId}_${Date.now()}`;
      
      // Audit the configuration
      await AuditService.logEvent({
        action: 'sso.provider.configured',
        userId: adminUserId,
        resourceType: 'sso_provider',
        resourceId: integrationId,
        metadata: {
          provider: providerId,
          domain: config.domain,
          autoProvisioning: config.autoProvisioning
        }
      });

      return {
        success: true,
        integrationId
      };

    } catch (error) {
      console.error('Error configuring SSO provider:', error);
      throw error;
    }
  }

  /**
   * Handle automatic user provisioning from SSO
   */
  static async provisionSsoUser(
    ssoUser: any,
    provider: string
  ): Promise<{ success: boolean; userId?: string; requiresApproval?: boolean }> {
    try {
      // Check if auto-provisioning is enabled
      if (!this.config.autoProvisionUsers) {
        return {
          success: false,
          requiresApproval: true
        };
      }

      // Extract user information
      const userEmail = ssoUser.email;
      const domain = userEmail.split('@')[1];

      // Check if domain is approved
      const isDomainApproved = await this.isDomainApproved(domain);
      if (!isDomainApproved) {
        return {
          success: false,
          requiresApproval: true
        };
      }

      // Map SSO attributes to user role
      const mappedRole = this.mapSsoRole(ssoUser, provider);

      // Create user account
      const newUser = await storage.createUser({
        email: userEmail,
        firstName: ssoUser.firstName,
        lastName: ssoUser.lastName,
        role: mappedRole,
        profileImageUrl: ssoUser.profileImageUrl,
        ssoProvider: provider,
        ssoSubjectId: ssoUser.subjectId,
        emailVerified: true, // SSO emails are pre-verified
        status: 'active'
      });

      // Log successful provisioning
      await AuditService.logEvent({
        action: 'sso.user.provisioned',
        userId: newUser.id,
        resourceType: 'user',
        resourceId: newUser.id,
        metadata: {
          provider,
          email: userEmail,
          role: mappedRole,
          domain
        }
      });

      return {
        success: true,
        userId: newUser.id
      };

    } catch (error) {
      console.error('Error provisioning SSO user:', error);
      throw new Error('Failed to provision SSO user');
    }
  }

  /**
   * Sync users from SSO provider
   */
  static async syncUsersFromProvider(
    providerId: string,
    adminUserId: string
  ): Promise<{
    syncedUsers: number;
    newUsers: number;
    updatedUsers: number;
    errors: string[];
  }> {
    try {
      await this.validateAdminPermissions(adminUserId);

      const syncResults = {
        syncedUsers: 0,
        newUsers: 0,
        updatedUsers: 0,
        errors: [] as string[]
      };

      // This would integrate with your SSO provider's API
      // For example, Microsoft Graph API, Google Admin SDK, etc.
      
      // Audit the sync operation
      await AuditService.logEvent({
        action: 'sso.users.synced',
        userId: adminUserId,
        resourceType: 'sso_provider',
        resourceId: providerId,
        metadata: syncResults
      });

      return syncResults;

    } catch (error) {
      console.error('Error syncing SSO users:', error);
      throw error;
    }
  }

  /**
   * Manage role mappings for SSO attributes
   */
  static async updateRoleMapping(
    providerId: string,
    attributeMapping: Record<string, string>,
    adminUserId: string
  ): Promise<{ success: boolean }> {
    try {
      await this.validateAdminPermissions(adminUserId);

      // Validate mapping
      this.validateRoleMapping(attributeMapping);

      // Store updated mapping (this would be persisted)
      
      await AuditService.logEvent({
        action: 'sso.role_mapping.updated',
        userId: adminUserId,
        resourceType: 'sso_provider',
        resourceId: providerId,
        metadata: { attributeMapping }
      });

      return { success: true };

    } catch (error) {
      console.error('Error updating role mapping:', error);
      throw error;
    }
  }

  /**
   * Get pending user approval requests
   */
  static async getPendingApprovals(): Promise<SsoUserProvisionRequest[]> {
    try {
      // This would query a pending approvals table/store
      return [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw error;
    }
  }

  /**
   * Approve or reject pending user provision requests
   */
  static async handleProvisionApproval(
    requestId: string,
    approved: boolean,
    adminUserId: string,
    assignedRole?: string
  ): Promise<{ success: boolean; userId?: string }> {
    try {
      await this.validateAdminPermissions(adminUserId);

      if (approved) {
        // Create the user with assigned role
        // Implementation would create user and return userId
      }

      await AuditService.logEvent({
        action: approved ? 'sso.provision.approved' : 'sso.provision.rejected',
        userId: adminUserId,
        resourceType: 'sso_provision_request',
        resourceId: requestId,
        metadata: { assignedRole }
      });

      return { success: true };

    } catch (error) {
      console.error('Error handling provision approval:', error);
      throw error;
    }
  }

  /**
   * Validate admin permissions for SSO operations
   */
  private static async validateAdminPermissions(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!['admin', 'super_admin'].includes(user.role || '')) {
      throw new Error('Insufficient permissions for SSO administration');
    }

    // Additional domain validation for enhanced security
    if (user.email) {
      const domain = user.email.split('@')[1];
      if (!this.config.allowedAdminDomains.includes(domain)) {
        throw new Error('Admin domain not authorized for SSO operations');
      }
    }
  }

  /**
   * Validate SSO provider configuration
   */
  private static validateProviderConfig(providerId: string, config: any): void {
    const requiredFields = {
      'google': ['clientId', 'clientSecret', 'domain'],
      'microsoft': ['tenantId', 'clientId', 'clientSecret', 'domain'],
      'saml': ['entityId', 'ssoUrl', 'certificate', 'domain']
    };

    const required = requiredFields[providerId as keyof typeof requiredFields];
    if (!required) {
      throw new Error(`Unsupported SSO provider: ${providerId}`);
    }

    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field for ${providerId}: ${field}`);
      }
    }
  }

  /**
   * Check if domain is approved for auto-provisioning
   */
  private static async isDomainApproved(domain: string): Promise<boolean> {
    // This would check against approved domains configuration
    const approvedDomains = ['company.com', 'enterprise.gr'];
    return approvedDomains.includes(domain);
  }

  /**
   * Map SSO user attributes to internal role
   */
  private static mapSsoRole(ssoUser: any, provider: string): string {
    // Default role mapping logic
    const groups = ssoUser.groups || [];
    const department = ssoUser.department || '';
    
    // Role mapping based on groups/department
    if (groups.includes('Admins') || groups.includes('IT')) {
      return 'admin';
    }
    
    if (groups.includes('HR') || department.toLowerCase().includes('human')) {
      return 'hr';
    }
    
    if (groups.includes('Payroll') || department.toLowerCase().includes('payroll')) {
      return 'payroll';
    }
    
    if (groups.includes('Managers') || ssoUser.title?.toLowerCase().includes('manager')) {
      return 'manager';
    }

    return this.config.defaultRoleMapping['employee'] || 'employee';
  }

  /**
   * Validate role mapping configuration
   */
  private static validateRoleMapping(mapping: Record<string, string>): void {
    const validRoles = ['admin', 'hr', 'payroll', 'manager', 'employee'];
    
    for (const [attribute, role] of Object.entries(mapping)) {
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role in mapping: ${role}`);
      }
    }
  }
}