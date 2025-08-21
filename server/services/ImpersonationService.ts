/**
 * Impersonation Service - AC2: Short-lived tokens with audit logging
 * Handles secure impersonation with proper token management and logging
 */
import jwt from 'jsonwebtoken';
import { auditLogger } from '../lib/auditLogging';

export interface ImpersonationRequest {
  adminUserId: string;
  adminRole: string;
  targetEmployeeId: string;
  reason: string;
  durationMinutes?: number; // Max 15 minutes
}

export interface ImpersonationToken {
  token: string;
  expiresAt: string;
  impersonationData: {
    adminUserId: string;
    adminRole: string;
    targetEmployeeId: string;
    targetEmployeeName: string;
    reason: string;
    startTime: string;
    duration: number;
  };
}

export interface ImpersonationSession {
  id: string;
  adminUserId: string;
  targetEmployeeId: string;
  reason: string;
  startTime: string;
  endTime?: string;
  duration: number;
  isActive: boolean;
  actions: Array<{
    timestamp: string;
    action: string;
    resource: string;
    resourceId?: string;
  }>;
}

export class ImpersonationService {
  private static activeSessions = new Map<string, ImpersonationSession>();
  private static readonly MAX_DURATION_MINUTES = 15;
  
  /**
   * Start impersonation session with short-lived token (AC2)
   */
  static async startImpersonation(request: ImpersonationRequest): Promise<ImpersonationToken> {
    try {
      // Validate admin permissions
      if (!['admin', 'hr_payroll'].includes(request.adminRole)) {
        throw new Error('Insufficient permissions for impersonation');
      }
      
      // Validate reason
      if (!request.reason || request.reason.trim().length < 10) {
        throw new Error('Impersonation reason must be at least 10 characters');
      }
      
      // Enforce maximum duration (≤15 minutes)
      const duration = Math.min(
        request.durationMinutes || this.MAX_DURATION_MINUTES, 
        this.MAX_DURATION_MINUTES
      );
      
      // Get target employee info
      const targetEmployee = await this.getEmployeeInfo(request.targetEmployeeId);
      if (!targetEmployee) {
        throw new Error('Target employee not found');
      }
      
      // Create session
      const sessionId = this.generateSessionId();
      const startTime = new Date().toISOString();
      const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
      
      // Create short-lived impersonation token
      const tokenPayload = {
        sub: request.adminUserId,
        email: request.targetEmployeeId + '@hotel.gr', // Mock email
        role: 'employee', // Impersonated role is always employee
        tenant_id: 'default',
        employee_id: request.adminUserId, // Admin's employee ID
        as_employee_id: request.targetEmployeeId, // Target employee ID
        property_ids: targetEmployee.propertyIds,
        department_id: targetEmployee.departmentId,
        permissions: ['view_payslips', 'view_timesheets'], // Limited permissions
        session_id: sessionId,
        act: 'impersonate', // Token type indicator
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (duration * 60)
      };
      
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'dev-secret');
      
      // Store active session
      const session: ImpersonationSession = {
        id: sessionId,
        adminUserId: request.adminUserId,
        targetEmployeeId: request.targetEmployeeId,
        reason: request.reason,
        startTime,
        duration,
        isActive: true,
        actions: []
      };
      
      this.activeSessions.set(sessionId, session);
      
      // Log impersonation start
      await auditLogger.logImpersonation({
        adminUserId: request.adminUserId,
        adminRole: request.adminRole,
        targetEmployeeId: request.targetEmployeeId,
        targetEmployeeName: targetEmployee.name,
        sessionId: sessionId,
        action: 'start',
        reason: request.reason,
        outcome: 'success',
        metadata: {
          tenantId: 'default',
          source: 'web',
          platform: 'server',
          version: '1.0.0',
          environment: process.env.NODE_ENV as any || 'development',
          severity: 'high',
          tags: ['impersonation', 'admin_action', 'session_start']
        },
        details: {
          description: `Started impersonation session`,
          ipAddress: '0.0.0.0', // Would be passed from request
          userAgent: 'server',
          impersonationReason: request.reason
        }
      });
      
      return {
        token,
        expiresAt,
        impersonationData: {
          adminUserId: request.adminUserId,
          adminRole: request.adminRole,
          targetEmployeeId: request.targetEmployeeId,
          targetEmployeeName: targetEmployee.name,
          reason: request.reason,
          startTime,
          duration
        }
      };
      
    } catch (error) {
      console.error('Failed to start impersonation:', error);
      throw error;
    }
  }
  
  /**
   * End impersonation session
   */
  static async endImpersonation(sessionId: string, adminUserId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        throw new Error('Impersonation session not found');
      }
      
      if (session.adminUserId !== adminUserId) {
        throw new Error('Unauthorized to end this session');
      }
      
      // Mark session as ended
      session.isActive = false;
      session.endTime = new Date().toISOString();
      
      // Get target employee info for logging
      const targetEmployee = await this.getEmployeeInfo(session.targetEmployeeId);
      
      // Log impersonation end
      await auditLogger.logImpersonation({
        adminUserId: session.adminUserId,
        adminRole: 'admin', // Would be retrieved from user context
        targetEmployeeId: session.targetEmployeeId,
        targetEmployeeName: targetEmployee?.name || 'Unknown',
        sessionId: sessionId,
        action: 'end',
        reason: session.reason,
        outcome: 'success',
        metadata: {
          tenantId: 'default',
          source: 'web',
          platform: 'server',
          version: '1.0.0',
          environment: process.env.NODE_ENV as any || 'development',
          severity: 'high',
          tags: ['impersonation', 'admin_action', 'session_end']
        },
        details: {
          description: `Ended impersonation session after ${this.getSessionDuration(session)} minutes`,
          ipAddress: '0.0.0.0',
          userAgent: 'server',
          impersonationReason: session.reason
        }
      });
      
      // Clean up expired sessions
      this.cleanupExpiredSessions();
      
    } catch (error) {
      console.error('Failed to end impersonation:', error);
      throw error;
    }
  }
  
  /**
   * Log impersonation action
   */
  static async logImpersonationAction(
    sessionId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return; // Session not found or ended
    }
    
    // Add action to session log
    session.actions.push({
      timestamp: new Date().toISOString(),
      action,
      resource,
      resourceId
    });
    
    // Log significant actions
    if (['view_payslip', 'download_payslip', 'view_profile'].includes(action)) {
      const targetEmployee = await this.getEmployeeInfo(session.targetEmployeeId);
      
      await auditLogger.logImpersonation({
        adminUserId: session.adminUserId,
        adminRole: 'admin',
        targetEmployeeId: session.targetEmployeeId,
        targetEmployeeName: targetEmployee?.name || 'Unknown',
        sessionId: sessionId,
        action: 'action',
        reason: session.reason,
        outcome: 'success',
        metadata: {
          tenantId: 'default',
          source: 'web',
          platform: 'server',
          version: '1.0.0',
          environment: process.env.NODE_ENV as any || 'development',
          severity: 'medium',
          tags: ['impersonation', 'action', action]
        },
        details: {
          description: `Impersonation action: ${action} on ${resource}`,
          ipAddress: '0.0.0.0',
          userAgent: 'server',
          dataAccessed: [resource],
          impersonationReason: session.reason
        }
      });
    }
  }
  
  /**
   * Get active impersonation sessions (for admin monitoring)
   */
  static getActiveSessions(): ImpersonationSession[] {
    this.cleanupExpiredSessions();
    return Array.from(this.activeSessions.values()).filter(s => s.isActive);
  }
  
  /**
   * Check if session is valid and active
   */
  static isValidSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return false;
    }
    
    // Check if session has expired
    const startTime = new Date(session.startTime).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / (1000 * 60);
    
    if (elapsedMinutes > session.duration) {
      // Mark session as expired
      session.isActive = false;
      session.endTime = new Date().toISOString();
      return false;
    }
    
    return true;
  }
  
  /**
   * Private helper methods
   */
  private static generateSessionId(): string {
    return `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private static async getEmployeeInfo(employeeId: string): Promise<{
    name: string;
    propertyIds: string[];
    departmentId?: string;
  } | null> {
    // Mock implementation - in real app would query database
    return {
      name: `Employee ${employeeId}`,
      propertyIds: ['prop-alex'],
      departmentId: 'front-desk'
    };
  }
  
  private static getSessionDuration(session: ImpersonationSession): number {
    const startTime = new Date(session.startTime).getTime();
    const endTime = session.endTime ? new Date(session.endTime).getTime() : Date.now();
    return Math.round((endTime - startTime) / (1000 * 60)); // Minutes
  }
  
  private static cleanupExpiredSessions(): void {
    const now = Date.now();
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.isActive) {
        const startTime = new Date(session.startTime).getTime();
        const elapsedMinutes = (now - startTime) / (1000 * 60);
        
        if (elapsedMinutes > session.duration) {
          session.isActive = false;
          session.endTime = new Date().toISOString();
          
          // Log automatic session expiry
          console.log(`Impersonation session ${sessionId} expired after ${session.duration} minutes`);
        }
      }
      
      // Remove very old sessions (older than 24 hours)
      const sessionAge = (now - new Date(session.startTime).getTime()) / (1000 * 60 * 60);
      if (sessionAge > 24) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

export default ImpersonationService;