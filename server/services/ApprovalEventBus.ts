/**
 * Approval Event Bus - Single approval bus eventing system
 * Handles approval.created, approval.approved, approval.rejected events
 */

import { EventEmitter } from 'events';
import { AuditService } from './AuditService';

export interface ApprovalEvent {
  id: string;
  type: 'approval.created' | 'approval.approved' | 'approval.rejected';
  requestId: string;
  requestType: string;
  tenantId: string;
  partnerFirmId?: string;
  payload: {
    requestedBy: string;
    approvedBy?: string;
    rejectedBy?: string;
    reason?: string;
    requestData: any;
    metadata?: any;
  };
  timestamp: string;
}

class ApprovalEventBus extends EventEmitter {
  private static instance: ApprovalEventBus;

  static getInstance(): ApprovalEventBus {
    if (!ApprovalEventBus.instance) {
      ApprovalEventBus.instance = new ApprovalEventBus();
    }
    return ApprovalEventBus.instance;
  }

  /**
   * Emit approval created event
   */
  async emitApprovalCreated(event: Omit<ApprovalEvent, 'id' | 'type' | 'timestamp'>): Promise<void> {
    const approvalEvent: ApprovalEvent = {
      ...event,
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'approval.created',
      timestamp: new Date().toISOString(),
    };

    // Emit to event listeners
    this.emit('approval.created', approvalEvent);

    // Log to audit trail
    await AuditService.logEvent({
      eventType: 'workflow',
      eventCategory: 'approval',
      eventAction: 'approval_created',
      tenantId: approvalEvent.tenantId,
      partnerFirmId: approvalEvent.partnerFirmId,
      userId: approvalEvent.payload.requestedBy,
      eventData: approvalEvent,
    });

    console.log('📋 Approval Created:', {
      requestId: approvalEvent.requestId,
      requestType: approvalEvent.requestType,
      tenantId: approvalEvent.tenantId,
      requestedBy: approvalEvent.payload.requestedBy,
    });
  }

  /**
   * Emit approval approved event
   */
  async emitApprovalApproved(event: Omit<ApprovalEvent, 'id' | 'type' | 'timestamp'>): Promise<void> {
    const approvalEvent: ApprovalEvent = {
      ...event,
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'approval.approved',
      timestamp: new Date().toISOString(),
    };

    // Emit to event listeners
    this.emit('approval.approved', approvalEvent);

    // Log to audit trail
    await AuditService.logEvent({
      eventType: 'workflow',
      eventCategory: 'approval',
      eventAction: 'approval_approved',
      tenantId: approvalEvent.tenantId,
      partnerFirmId: approvalEvent.partnerFirmId,
      userId: approvalEvent.payload.approvedBy || 'system',
      eventData: approvalEvent,
    });

    console.log('✅ Approval Approved:', {
      requestId: approvalEvent.requestId,
      requestType: approvalEvent.requestType,
      tenantId: approvalEvent.tenantId,
      approvedBy: approvalEvent.payload.approvedBy,
    });
  }

  /**
   * Emit approval rejected event
   */
  async emitApprovalRejected(event: Omit<ApprovalEvent, 'id' | 'type' | 'timestamp'>): Promise<void> {
    const approvalEvent: ApprovalEvent = {
      ...event,
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'approval.rejected',
      timestamp: new Date().toISOString(),
    };

    // Emit to event listeners
    this.emit('approval.rejected', approvalEvent);

    // Log to audit trail
    await AuditService.logEvent({
      eventType: 'workflow',
      eventCategory: 'approval',
      eventAction: 'approval_rejected',
      tenantId: approvalEvent.tenantId,
      partnerFirmId: approvalEvent.partnerFirmId,
      userId: approvalEvent.payload.rejectedBy || 'system',
      eventData: approvalEvent,
    });

    console.log('❌ Approval Rejected:', {
      requestId: approvalEvent.requestId,
      requestType: approvalEvent.requestType,
      tenantId: approvalEvent.tenantId,
      rejectedBy: approvalEvent.payload.rejectedBy,
      reason: approvalEvent.payload.reason,
    });
  }

  /**
   * Register event listeners for approval workflow automation
   */
  setupEventListeners(): void {
    // Handle approval created - could trigger notifications, etc.
    this.on('approval.created', (event: ApprovalEvent) => {
      // Could send notifications to approvers
      console.log('🔔 New approval request requires attention:', event.requestId);
    });

    // Handle approval approved - execute the approved action
    this.on('approval.approved', async (event: ApprovalEvent) => {
      try {
        await this.executeApprovedRequest(event);
      } catch (error) {
        console.error('Error executing approved request:', error);
      }
    });

    // Handle approval rejected - cleanup and notify
    this.on('approval.rejected', (event: ApprovalEvent) => {
      console.log('🚫 Request rejected and cleaned up:', event.requestId);
    });
  }

  /**
   * Execute approved request based on type
   */
  private async executeApprovedRequest(event: ApprovalEvent): Promise<void> {
    const { requestType, requestId, payload } = event;

    switch (requestType) {
      case 'filing_submit':
        console.log(`📤 Executing filing submission for request ${requestId}`);
        // Would integrate with filing service
        break;
        
      case 'payroll_finalize':
        console.log(`💰 Executing payroll finalization for request ${requestId}`);
        // Would integrate with payroll service
        break;
        
      case 'payment_batch':
        console.log(`💸 Executing payment batch for request ${requestId}`);
        // Would integrate with payment service
        break;
        
      default:
        console.log(`⚙️ Executing generic request ${requestId} of type ${requestType}`);
    }
  }
}

export const approvalEventBus = ApprovalEventBus.getInstance();

// Initialize event listeners
approvalEventBus.setupEventListeners();