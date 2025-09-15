import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import nodemailer from 'nodemailer';

interface SignatureRequest {
  id: string;
  documentId: string;
  documentName: string;
  documentUrl: string;
  signers: Signer[];
  status:
    | 'draft'
    | 'sent'
    | 'in_progress'
    | 'completed'
    | 'declined'
    | 'expired';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  message?: string;
  reminderCount: number;
  metadata: Record<string, any>;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'employer' | 'witness' | 'hr_manager' | 'legal_counsel';
  status: 'pending' | 'viewed' | 'signed' | 'declined';
  signedAt?: Date;
  ipAddress?: string;
  signatureData?: string; // Base64 encoded signature image or digital signature
  comments?: string;
  authenticationMethod: 'email' | 'sms' | 'id_verification' | 'biometric';
  requiredDocuments?: string[]; // AFM, AMKA verification etc.
  sequence: number; // Signing order
}

interface SignatureEvent {
  id: string;
  requestId: string;
  signerId: string;
  type:
    | 'created'
    | 'sent'
    | 'viewed'
    | 'signed'
    | 'declined'
    | 'reminded'
    | 'expired';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

interface GreekLegalCompliance {
  requiresWitness: boolean;
  witnessDetails?: {
    name: string;
    afm: string;
    idNumber: string;
  };
  contractType:
    | 'indefinite'
    | 'fixed_term'
    | 'project_based'
    | 'part_time'
    | 'seasonal';
  erganiNotificationRequired: boolean;
  collectiveBargainingAgreement?: string;
  minimumWageCompliance: boolean;
}

export class ESignatureService {
  private requests: Map<string, SignatureRequest> = new Map();
  private events: Map<string, SignatureEvent[]> = new Map();
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Create a new signature request
   */
  async createSignatureRequest(
    documentId: string,
    documentName: string,
    documentUrl: string,
    signers: Omit<Signer, 'id' | 'status' | 'signedAt'>[],
    options: {
      message?: string;
      expirationDays?: number;
      metadata?: Record<string, any>;
      legalCompliance?: GreekLegalCompliance;
    } = {}
  ): Promise<SignatureRequest> {
    const requestId = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options.expirationDays || 30));

    // Sort signers by sequence and add IDs
    const processedSigners: Signer[] = signers
      .sort((a, b) => a.sequence - b.sequence)
      .map(signer => ({
        ...signer,
        id: randomUUID(),
        status: 'pending' as const,
      }));

    const request: SignatureRequest = {
      id: requestId,
      documentId,
      documentName,
      documentUrl,
      signers: processedSigners,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt,
      message: options.message,
      reminderCount: 0,
      metadata: {
        ...options.metadata,
        legalCompliance: options.legalCompliance,
      },
    };

    this.requests.set(requestId, request);
    this.events.set(requestId, []);

    // Log creation event
    await this.logEvent(requestId, 'system', 'created', {
      signerCount: signers.length,
    });

    return request;
  }

  /**
   * Send signature request to signers
   */
  async sendSignatureRequest(requestId: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    if (request.status !== 'draft') {
      throw new Error('Request has already been sent');
    }

    // Update request status
    request.status = 'sent';
    request.updatedAt = new Date();

    // Send emails to first signer in sequence (or all if parallel signing)
    const firstSigner = request.signers.find(s => s.sequence === 1);
    if (firstSigner) {
      await this.sendSigningEmail(request, firstSigner);
      await this.logEvent(requestId, firstSigner.id, 'sent');
    }

    // If sequential signing is not required, send to all signers
    const isSequential = request.metadata?.signingOrder === 'sequential';
    if (!isSequential) {
      for (const signer of request.signers.slice(1)) {
        await this.sendSigningEmail(request, signer);
        await this.logEvent(requestId, signer.id, 'sent');
      }
    }

    request.status = 'in_progress';
    this.requests.set(requestId, request);
  }

  /**
   * Process signature from a signer
   */
  async processSignature(
    requestId: string,
    signerId: string,
    signatureData: {
      signature: string; // Base64 encoded signature or digital signature hash
      ipAddress: string;
      userAgent?: string;
      comments?: string;
      authToken?: string; // For additional verification
    }
  ): Promise<{ success: boolean; nextSigner?: Signer; completed: boolean }> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    const signer = request.signers.find(s => s.id === signerId);
    if (!signer) {
      throw new Error('Signer not found');
    }

    if (signer.status === 'signed') {
      throw new Error('Signer has already signed');
    }

    // Validate Greek legal requirements
    await this.validateGreekLegalRequirements(request, signer);

    // Update signer status
    signer.status = 'signed';
    signer.signedAt = new Date();
    signer.ipAddress = signatureData.ipAddress;
    signer.signatureData = signatureData.signature;
    signer.comments = signatureData.comments;

    // Log signing event
    await this.logEvent(requestId, signerId, 'signed', {
      ipAddress: signatureData.ipAddress,
      userAgent: signatureData.userAgent,
    });

    // Check if all signers have signed
    const allSigned = request.signers.every(s => s.status === 'signed');

    let nextSigner: Signer | undefined;
    let completed = false;

    if (allSigned) {
      // All signers have signed - complete the request
      request.status = 'completed';
      request.completedAt = new Date();
      completed = true;

      // Generate completion certificate
      await this.generateCompletionCertificate(request);

      // Notify all parties of completion
      await this.notifyCompletion(request);

      // Trigger ERGANI notification if required
      if (request.metadata?.legalCompliance?.erganiNotificationRequired) {
        await this.triggerErganiNotification(request);
      }
    } else {
      // Find next signer in sequence
      const isSequential = request.metadata?.signingOrder === 'sequential';
      if (isSequential) {
        const currentSequence = signer.sequence;
        nextSigner = request.signers
          .filter(s => s.sequence > currentSequence && s.status === 'pending')
          .sort((a, b) => a.sequence - b.sequence)[0];

        if (nextSigner) {
          await this.sendSigningEmail(request, nextSigner);
          await this.logEvent(requestId, nextSigner.id, 'sent');
        }
      }
    }

    request.updatedAt = new Date();
    this.requests.set(requestId, request);

    return { success: true, nextSigner, completed };
  }

  /**
   * Decline signature request
   */
  async declineSignature(
    requestId: string,
    signerId: string,
    reason: string,
    ipAddress: string
  ): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    const signer = request.signers.find(s => s.id === signerId);
    if (!signer) {
      throw new Error('Signer not found');
    }

    signer.status = 'declined';
    signer.comments = reason;
    signer.ipAddress = ipAddress;

    request.status = 'declined';
    request.updatedAt = new Date();

    // Log decline event
    await this.logEvent(requestId, signerId, 'declined', {
      reason,
      ipAddress,
    });

    // Notify other signers and request creator
    await this.notifyDecline(request, signer, reason);

    this.requests.set(requestId, request);
  }

  /**
   * Send reminder to pending signers
   */
  async sendReminder(requestId: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Signature request not found');
    }

    if (request.status !== 'in_progress') {
      throw new Error('Cannot send reminder for request not in progress');
    }

    const pendingSigners = request.signers.filter(s => s.status === 'pending');

    for (const signer of pendingSigners) {
      await this.sendReminderEmail(request, signer);
      await this.logEvent(requestId, signer.id, 'reminded');
    }

    request.reminderCount++;
    request.updatedAt = new Date();
    this.requests.set(requestId, request);
  }

  /**
   * Get signature request status
   */
  getSignatureRequest(requestId: string): SignatureRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get signature events/audit trail
   */
  getSignatureEvents(requestId: string): SignatureEvent[] {
    return this.events.get(requestId) || [];
  }

  /**
   * Validate Greek legal requirements for employment contracts
   */
  private async validateGreekLegalRequirements(
    request: SignatureRequest,
    signer: Signer
  ): Promise<void> {
    const compliance = request.metadata
      ?.legalCompliance as GreekLegalCompliance;
    if (!compliance) return;

    // Check if witness signature is required and provided
    if (compliance.requiresWitness && signer.role === 'witness') {
      if (!compliance.witnessDetails) {
        throw new Error(
          'Witness details required for Greek employment contracts'
        );
      }

      // Validate witness AFM
      if (!this.validateAFM(compliance.witnessDetails.afm)) {
        throw new Error('Invalid witness AFM');
      }
    }

    // Check minimum wage compliance for employment contracts
    if (compliance.minimumWageCompliance && signer.role === 'employee') {
      // This would integrate with payroll calculation service
      // to verify the contract meets minimum wage requirements
    }

    // Validate required documents are uploaded
    if (signer.requiredDocuments && signer.requiredDocuments.length > 0) {
      // Check that all required documents are available
      // This would integrate with the DocumentAI service
    }
  }

  /**
   * Generate completion certificate with Greek legal compliance
   */
  private async generateCompletionCertificate(
    request: SignatureRequest
  ): Promise<void> {
    const certificate = {
      requestId: request.id,
      documentName: request.documentName,
      completedAt: request.completedAt,
      signers: request.signers.map(s => ({
        name: s.name,
        email: s.email,
        role: s.role,
        signedAt: s.signedAt,
        ipAddress: s.ipAddress,
      })),
      legalCompliance: request.metadata?.legalCompliance,
      certificateHash: this.generateDocumentHash(request),
    };

    // Store certificate in secure storage
    // This would integrate with the document storage system
    console.log('Completion certificate generated:', certificate);
  }

  /**
   * Generate secure hash for document integrity
   */
  private generateDocumentHash(request: SignatureRequest): string {
    const data = JSON.stringify({
      documentId: request.documentId,
      signers: request.signers.map(s => ({
        id: s.id,
        signature: s.signatureData,
        timestamp: s.signedAt,
      })),
      completed: request.completedAt,
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Validate Greek AFM
   */
  private validateAFM(afm: string): boolean {
    if (afm.length !== 9 || !/^\d+$/.test(afm)) return false;

    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(afm[i]) * Math.pow(2, 8 - i);
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 10 ? remainder : 0;

    return checkDigit === parseInt(afm[8]);
  }

  /**
   * Send signing email to signer
   */
  private async sendSigningEmail(
    request: SignatureRequest,
    signer: Signer
  ): Promise<void> {
    const signingUrl = `${process.env.BASE_URL}/sign/${request.id}/${signer.id}`;

    const emailContent = {
      from: process.env.FROM_EMAIL || 'noreply@payrollsync.gr',
      to: signer.email,
      subject: `Signature Required: ${request.documentName}`,
      html: `
        <h2>Signature Request - ${request.documentName}</h2>
        <p>Dear ${signer.name},</p>
        
        <p>You have been requested to sign the document: <strong>${request.documentName}</strong></p>
        
        ${request.message ? `<p><em>${request.message}</em></p>` : ''}
        
        <div style="margin: 20px 0;">
          <a href="${signingUrl}" style="background-color: #4CAF50; color: white; padding: 15px 32px; text-decoration: none; display: inline-block; border-radius: 4px;">
            Review & Sign Document
          </a>
        </div>
        
        <p><strong>Important Greek Legal Requirements:</strong></p>
        <ul>
          <li>This document requires electronic signature in accordance with Greek Law 4070/2012</li>
          <li>Your identity may need to be verified using AFM/AMKA</li>
          <li>This signature has the same legal validity as a handwritten signature</li>
        </ul>
        
        <p>Document expires on: ${request.expiresAt.toLocaleDateString('el-GR')}</p>
        
        <hr>
        <p><small>PayrollSync - Greek HR & Payroll Management System</small></p>
      `,
    };

    try {
      await this.emailTransporter.sendMail(emailContent);
    } catch (error) {
      console.error('Failed to send signing email:', error);
      throw new Error('Failed to send signing email');
    }
  }

  /**
   * Send reminder email
   */
  private async sendReminderEmail(
    request: SignatureRequest,
    signer: Signer
  ): Promise<void> {
    const signingUrl = `${process.env.BASE_URL}/sign/${request.id}/${signer.id}`;

    const emailContent = {
      from: process.env.FROM_EMAIL || 'noreply@payrollsync.gr',
      to: signer.email,
      subject: `Reminder: Signature Required - ${request.documentName}`,
      html: `
        <h2>Reminder: Signature Required</h2>
        <p>Dear ${signer.name},</p>
        
        <p>This is a friendly reminder that your signature is still required for: <strong>${request.documentName}</strong></p>
        
        <div style="margin: 20px 0;">
          <a href="${signingUrl}" style="background-color: #FF9800; color: white; padding: 15px 32px; text-decoration: none; display: inline-block; border-radius: 4px;">
            Sign Document Now
          </a>
        </div>
        
        <p><strong>Document expires on: ${request.expiresAt.toLocaleDateString('el-GR')}</strong></p>
        
        <hr>
        <p><small>PayrollSync - Greek HR & Payroll Management System</small></p>
      `,
    };

    await this.emailTransporter.sendMail(emailContent);
  }

  /**
   * Notify completion to all parties
   */
  private async notifyCompletion(request: SignatureRequest): Promise<void> {
    const allEmails = request.signers.map(s => s.email);

    const emailContent = {
      from: process.env.FROM_EMAIL || 'noreply@payrollsync.gr',
      to: allEmails.join(', '),
      subject: `Document Completed: ${request.documentName}`,
      html: `
        <h2>Document Signing Completed</h2>
        
        <p>The document <strong>${request.documentName}</strong> has been successfully signed by all parties.</p>
        
        <p><strong>Signing Details:</strong></p>
        <ul>
          ${request.signers
            .map(
              s =>
                `<li>${s.name} (${s.role}) - Signed on ${s.signedAt?.toLocaleDateString('el-GR')}</li>`
            )
            .join('')}
        </ul>
        
        <p>A completion certificate has been generated for legal compliance.</p>
        
        <hr>
        <p><small>PayrollSync - Greek HR & Payroll Management System</small></p>
      `,
    };

    await this.emailTransporter.sendMail(emailContent);
  }

  /**
   * Notify decline to relevant parties
   */
  private async notifyDecline(
    request: SignatureRequest,
    decliner: Signer,
    reason: string
  ): Promise<void> {
    const otherEmails = request.signers
      .filter(s => s.id !== decliner.id)
      .map(s => s.email);

    if (otherEmails.length === 0) return;

    const emailContent = {
      from: process.env.FROM_EMAIL || 'noreply@payrollsync.gr',
      to: otherEmails.join(', '),
      subject: `Document Declined: ${request.documentName}`,
      html: `
        <h2>Document Signing Declined</h2>
        
        <p>The document <strong>${request.documentName}</strong> has been declined by ${decliner.name}.</p>
        
        <p><strong>Reason:</strong> ${reason}</p>
        
        <p>No further action is required from other signers.</p>
        
        <hr>
        <p><small>PayrollSync - Greek HR & Payroll Management System</small></p>
      `,
    };

    await this.emailTransporter.sendMail(emailContent);
  }

  /**
   * Trigger ERGANI notification for employment contracts
   */
  private async triggerErganiNotification(
    request: SignatureRequest
  ): Promise<void> {
    // This would integrate with the ERGANI compliance system
    console.log(
      'ERGANI notification triggered for signed contract:',
      request.documentName
    );

    // Extract employee data from signed contract
    const employee = request.signers.find(s => s.role === 'employee');
    if (employee) {
      // Queue ERGANI notification
      // This would integrate with the existing ERGANI connector
    }
  }

  /**
   * Log signature event for audit trail
   */
  private async logEvent(
    requestId: string,
    signerId: string,
    type: SignatureEvent['type'],
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: SignatureEvent = {
      id: randomUUID(),
      requestId,
      signerId,
      type,
      timestamp: new Date(),
      metadata,
    };

    const events = this.events.get(requestId) || [];
    events.push(event);
    this.events.set(requestId, events);
  }

  /**
   * Get signature requests by status
   */
  getRequestsByStatus(status: SignatureRequest['status']): SignatureRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === status);
  }

  /**
   * Get expired requests that need cleanup
   */
  getExpiredRequests(): SignatureRequest[] {
    const now = new Date();
    return Array.from(this.requests.values()).filter(
      r =>
        r.expiresAt < now && r.status !== 'completed' && r.status !== 'declined'
    );
  }

  /**
   * Clean up expired requests
   */
  async cleanupExpiredRequests(): Promise<void> {
    const expiredRequests = this.getExpiredRequests();

    for (const request of expiredRequests) {
      request.status = 'expired';
      request.updatedAt = new Date();

      // Notify signers of expiration
      const pendingSigners = request.signers.filter(
        s => s.status === 'pending'
      );
      for (const signer of pendingSigners) {
        await this.logEvent(request.id, signer.id, 'expired');
      }
    }
  }
}

export { SignatureRequest, Signer, SignatureEvent, GreekLegalCompliance };
