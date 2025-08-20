/**
 * Connector Service - SFTP/H2H and REST channel management
 */

import crypto from 'crypto';
import { WebhookService } from './webhookService';

export interface BankProfile {
  bankId: string;
  bankName: string;
  swift: string;
  painVersion: string;
  instCapability: boolean;
  cutOffs: {
    sct: string;
    sctInst: string;
  };
  fileFormats: {
    pain001: string;
    pain002: string;
    camt054: string;
    camt053: string;
  };
  authentication: {
    type: 'sftp' | 'h2h' | 'rest';
    endpoint?: string;
    username?: string;
    keyPath?: string;
    certificate?: string;
  };
  endpointLimits: {
    maxFileSize: number;
    maxTransactions: number;
    rateLimit: number;
  };
  fileNaming: {
    pattern: string;
    timestampFormat: string;
    sequenceDigits: number;
  };
}

export class ConnectorService {
  private static bankProfiles: Map<string, BankProfile> = new Map();

  static {
    // Initialize Greek bank profiles
    this.initializeGreekBankProfiles();
  }

  /**
   * Initialize Greek bank profiles with real specifications
   */
  private static initializeGreekBankProfiles(): void {
    const profiles: BankProfile[] = [
      {
        bankId: 'alpha',
        bankName: 'Alpha Bank',
        swift: 'CRBAGRAA',
        painVersion: '001.001.03',
        instCapability: true,
        cutOffs: {
          sct: '16:00',
          sctInst: '23:59'
        },
        fileFormats: {
          pain001: 'pain.001.001.03',
          pain002: 'pain.002.001.03',
          camt054: 'camt.054.001.02',
          camt053: 'camt.053.001.02'
        },
        authentication: {
          type: 'sftp',
          endpoint: 'sftp.alphabank.gr',
          username: 'payroll_user',
          keyPath: '/etc/ssl/alpha_bank_key.pem'
        },
        endpointLimits: {
          maxFileSize: 50 * 1024 * 1024, // 50MB
          maxTransactions: 10000,
          rateLimit: 100 // requests per minute
        },
        fileNaming: {
          pattern: 'PAIN001_{YYYYMMDD}_{HHMMSS}_{SEQ}.xml',
          timestampFormat: 'YYYYMMDDHHmmss',
          sequenceDigits: 3
        }
      },
      {
        bankId: 'piraeus',
        bankName: 'Piraeus Bank',
        swift: 'PIRBGRAA',
        painVersion: '001.001.03',
        instCapability: true,
        cutOffs: {
          sct: '15:30',
          sctInst: '23:59'
        },
        fileFormats: {
          pain001: 'pain.001.001.03',
          pain002: 'pain.002.001.03',
          camt054: 'camt.054.001.02',
          camt053: 'camt.053.001.02'
        },
        authentication: {
          type: 'h2h',
          endpoint: 'https://h2h.piraeusbank.gr/sepa',
          certificate: '/etc/ssl/piraeus_client.p12'
        },
        endpointLimits: {
          maxFileSize: 100 * 1024 * 1024, // 100MB
          maxTransactions: 50000,
          rateLimit: 200 // requests per minute
        },
        fileNaming: {
          pattern: 'PYR_{YYYYMMDD}_{HHMMSS}_{SEQ}.xml',
          timestampFormat: 'YYYYMMDDHHmmss',
          sequenceDigits: 4
        }
      },
      {
        bankId: 'eurobank',
        bankName: 'Eurobank',
        swift: 'EFGBGRAA',
        painVersion: '001.001.03',
        instCapability: true,
        cutOffs: {
          sct: '17:00',
          sctInst: '23:59'
        },
        fileFormats: {
          pain001: 'pain.001.001.03',
          pain002: 'pain.002.001.03',
          camt054: 'camt.054.001.02',
          camt053: 'camt.053.001.02'
        },
        authentication: {
          type: 'rest',
          endpoint: 'https://api.eurobank.gr/corporate/v2',
          certificate: '/etc/ssl/eurobank_api.crt'
        },
        endpointLimits: {
          maxFileSize: 75 * 1024 * 1024, // 75MB
          maxTransactions: 25000,
          rateLimit: 150 // requests per minute
        },
        fileNaming: {
          pattern: 'EURO_{YYYYMMDD}_{HHMMSS}_{SEQ}.xml',
          timestampFormat: 'YYYYMMDDHHmmss',
          sequenceDigits: 3
        }
      },
      {
        bankId: 'nbg',
        bankName: 'National Bank of Greece',
        swift: 'ETHNGRAA',
        painVersion: '001.001.09',
        instCapability: true,
        cutOffs: {
          sct: '16:15',
          sctInst: '23:59'
        },
        fileFormats: {
          pain001: 'pain.001.001.09',
          pain002: 'pain.002.001.10',
          camt054: 'camt.054.001.02',
          camt053: 'camt.053.001.02'
        },
        authentication: {
          type: 'sftp',
          endpoint: 'sftp.nbg.gr',
          username: 'corporate_client',
          keyPath: '/etc/ssl/nbg_private_key.pem'
        },
        endpointLimits: {
          maxFileSize: 200 * 1024 * 1024, // 200MB
          maxTransactions: 100000,
          rateLimit: 50 // requests per minute
        },
        fileNaming: {
          pattern: 'NBG_{YYYYMMDD}_{HHMMSS}_{SEQ}.xml',
          timestampFormat: 'YYYYMMDDHHmmss',
          sequenceDigits: 5
        }
      }
    ];

    profiles.forEach(profile => {
      this.bankProfiles.set(profile.bankId, profile);
    });
  }

  /**
   * Get bank profile by ID
   */
  static getBankProfile(bankId: string): BankProfile | undefined {
    return this.bankProfiles.get(bankId);
  }

  /**
   * Get all bank profiles
   */
  static getAllBankProfiles(): BankProfile[] {
    return Array.from(this.bankProfiles.values());
  }

  // =============================================================================
  // SFTP/HOST-TO-HOST CONNECTOR
  // =============================================================================

  /**
   * Submit payment file via SFTP
   */
  static async submitViaSFTP(bankId: string, fileContent: string, fileType: 'pain001'): Promise<any> {
    const profile = this.getBankProfile(bankId);
    if (!profile || profile.authentication.type !== 'sftp') {
      throw new Error(`SFTP not supported for bank: ${bankId}`);
    }

    // Validate file size
    const fileSize = Buffer.byteLength(fileContent, 'utf8');
    if (fileSize > profile.endpointLimits.maxFileSize) {
      throw new Error(`File size ${fileSize} exceeds limit ${profile.endpointLimits.maxFileSize}`);
    }

    // Generate filename according to bank naming convention
    const filename = this.generateFileName(profile, fileType);

    // Mock SFTP upload implementation
    console.log(`Uploading ${filename} to ${profile.authentication.endpoint}`);
    
    // In production, this would use a real SFTP client
    const uploadResult = {
      success: true,
      filename,
      fileId: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
      receipt: {
        bankRef: `${bankId.toUpperCase()}-${Date.now()}`,
        acknowledgment: 'File received and queued for processing'
      }
    };

    // Parse receipt if available
    const receiptData = await this.parseReceipt(uploadResult.receipt, profile);

    return {
      ...uploadResult,
      parsedReceipt: receiptData
    };
  }

  /**
   * Submit payment via Host-to-Host
   */
  static async submitViaH2H(bankId: string, fileContent: string, fileType: 'pain001'): Promise<any> {
    const profile = this.getBankProfile(bankId);
    if (!profile || profile.authentication.type !== 'h2h') {
      throw new Error(`H2H not supported for bank: ${bankId}`);
    }

    // Mock H2H submission
    const response = await fetch(`${profile.authentication.endpoint}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'X-Client-Certificate': profile.authentication.certificate || '',
        'User-Agent': 'PayrollSync-H2H/1.0'
      },
      body: fileContent
    });

    if (!response.ok) {
      throw new Error(`H2H submission failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.text();
    
    return {
      success: true,
      response: result,
      submittedAt: new Date().toISOString(),
      receipt: await this.parseH2HResponse(result, profile)
    };
  }

  /**
   * Submit payment via REST API
   */
  static async submitViaREST(bankId: string, paymentData: any): Promise<any> {
    const profile = this.getBankProfile(bankId);
    if (!profile || profile.authentication.type !== 'rest') {
      throw new Error(`REST API not supported for bank: ${bankId}`);
    }

    // Mock REST API submission
    const response = await fetch(`${profile.authentication.endpoint}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env[`${bankId.toUpperCase()}_API_TOKEN`]}`,
        'X-Client-Certificate': profile.authentication.certificate || '',
        'User-Agent': 'PayrollSync-REST/1.0'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error(`REST API submission failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      data: result,
      submittedAt: new Date().toISOString(),
      instantConfirmation: result.instant_confirmation || false
    };
  }

  // =============================================================================
  // FILE NAMING & PARSING
  // =============================================================================

  /**
   * Generate filename according to bank naming convention
   */
  private static generateFileName(profile: BankProfile, fileType: string): string {
    const now = new Date();
    const timestamp = this.formatTimestamp(now, profile.fileNaming.timestampFormat);
    const sequence = this.generateSequence(profile.fileNaming.sequenceDigits);
    
    return profile.fileNaming.pattern
      .replace('{YYYYMMDD}', timestamp.substring(0, 8))
      .replace('{HHMMSS}', timestamp.substring(8, 14))
      .replace('{SEQ}', sequence)
      .replace('pain001', fileType.toUpperCase());
  }

  /**
   * Format timestamp according to bank requirements
   */
  private static formatTimestamp(date: Date, format: string): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second);
  }

  /**
   * Generate sequence number
   */
  private static generateSequence(digits: number): string {
    // In production, this would be a proper sequence from database
    return Math.floor(Math.random() * Math.pow(10, digits)).toString().padStart(digits, '0');
  }

  /**
   * Parse bank receipt
   */
  private static async parseReceipt(receipt: any, profile: BankProfile): Promise<any> {
    return {
      bankRef: receipt.bankRef,
      status: 'acknowledged',
      processedAt: new Date().toISOString(),
      estimatedSettlement: this.calculateSettlementTime(profile),
      fees: {
        processingFee: '€2.50',
        urgentFee: profile.instCapability ? '€0.20' : null
      }
    };
  }

  /**
   * Parse H2H response
   */
  private static async parseH2HResponse(response: string, profile: BankProfile): Promise<any> {
    // Mock XML parsing - in production would use proper XML parser
    return {
      messageId: crypto.randomUUID(),
      status: 'accepted',
      transactionCount: 150,
      totalAmount: '€125,840.50',
      processingTime: '2-4 hours'
    };
  }

  /**
   * Calculate estimated settlement time
   */
  private static calculateSettlementTime(profile: BankProfile): string {
    const now = new Date();
    const cutOffTime = profile.cutOffs.sct;
    const [hours, minutes] = cutOffTime.split(':').map(Number);
    const cutOff = new Date(now);
    cutOff.setHours(hours, minutes, 0, 0);

    if (now < cutOff) {
      return 'Same day settlement';
    } else {
      return 'Next business day settlement';
    }
  }

  // =============================================================================
  // STATUS MONITORING
  // =============================================================================

  /**
   * Check payment status via REST
   */
  static async checkPaymentStatus(bankId: string, paymentId: string): Promise<any> {
    const profile = this.getBankProfile(bankId);
    if (!profile || profile.authentication.type !== 'rest') {
      throw new Error(`REST status checking not supported for bank: ${bankId}`);
    }

    // Mock REST status check
    const response = await fetch(`${profile.authentication.endpoint}/payments/${paymentId}/status`, {
      headers: {
        'Authorization': `Bearer ${process.env[`${bankId.toUpperCase()}_API_TOKEN`]}`,
        'User-Agent': 'PayrollSync-REST/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
    }

    const status = await response.json();
    
    // Trigger webhook if status changed
    if (status.status !== status.previousStatus) {
      await WebhookService.sendPaymentsBatchUpdatedEvent(
        'default-partner',
        {
          batchId: paymentId,
          status: status.status,
          counters: status.counters
        }
      );
    }

    return status;
  }

  /**
   * Get connector health status
   */
  static async getConnectorHealth(): Promise<any> {
    const healthChecks = await Promise.all(
      Array.from(this.bankProfiles.values()).map(async (profile) => {
        try {
          // Mock health check - in production would ping actual endpoints
          const latency = Math.random() * 100 + 50; // 50-150ms
          const success = Math.random() > 0.05; // 95% success rate
          
          return {
            bankId: profile.bankId,
            bankName: profile.bankName,
            connectorType: profile.authentication.type,
            status: success ? 'healthy' : 'degraded',
            latency: `${Math.round(latency)}ms`,
            lastCheck: new Date().toISOString(),
            cutOffStatus: this.getCutOffStatus(profile),
          };
        } catch (error) {
          return {
            bankId: profile.bankId,
            bankName: profile.bankName,
            connectorType: profile.authentication.type,
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            lastCheck: new Date().toISOString(),
          };
        }
      })
    );

    return {
      overall_status: healthChecks.every(c => c.status === 'healthy') ? 'healthy' : 'degraded',
      connectors: healthChecks,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Get current cut-off status for bank
   */
  private static getCutOffStatus(profile: BankProfile): any {
    const now = new Date();
    const [hours, minutes] = profile.cutOffs.sct.split(':').map(Number);
    const cutOff = new Date(now);
    cutOff.setHours(hours, minutes, 0, 0);

    const timeToNext = cutOff.getTime() - now.getTime();
    const minutesToNext = Math.max(0, Math.floor(timeToNext / (1000 * 60)));

    return {
      nextCutOff: profile.cutOffs.sct,
      minutesRemaining: minutesToNext,
      status: minutesToNext > 60 ? 'active' : minutesToNext > 0 ? 'approaching' : 'past_cutoff',
      instantAvailable: profile.instCapability
    };
  }
}