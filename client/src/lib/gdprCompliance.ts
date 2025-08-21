/**
 * GDPR Compliance System
 * Handles data subject rights, privacy controls, and compliance features
 */

export interface GDPRRequest {
  id: string;
  employeeId: string;
  requestType: 'access' | 'portability' | 'erasure' | 'rectification' | 'restriction';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requestDate: string;
  completionDate?: string;
  requestDetails: string;
  responseData?: any;
  rejectionReason?: string;
  handledBy?: string;
}

export interface DataProcessingActivity {
  id: string;
  name: string;
  description: string;
  dataCategories: string[];
  purposes: string[];
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  retentionPeriod: string;
  recipients: string[];
  transfers: string[];
}

export interface ConsentRecord {
  employeeId: string;
  activityId: string;
  consentGiven: boolean;
  consentDate: string;
  withdrawalDate?: string;
  purpose: string;
  version: string;
}

export interface PrivacySettings {
  employeeId: string;
  dataMinimization: boolean;
  marketingConsent: boolean;
  dataRetentionPreferences: {
    automaticDeletion: boolean;
    retentionYears: number;
  };
  accessNotifications: boolean;
  dataExportFormat: 'json' | 'csv' | 'pdf';
  profileVisibility: 'private' | 'department' | 'public';
}

export class GDPRComplianceManager {
  
  /**
   * Submit a GDPR data subject request
   */
  static async submitDataSubjectRequest(request: {
    employeeId: string;
    requestType: GDPRRequest['requestType'];
    requestDetails: string;
  }): Promise<{ requestId: string; estimatedCompletion: string }> {
    const gdprRequest: Partial<GDPRRequest> = {
      id: this.generateRequestId(),
      employeeId: request.employeeId,
      requestType: request.requestType,
      status: 'pending',
      requestDate: new Date().toISOString(),
      requestDetails: request.requestDetails
    };

    // Calculate estimated completion (GDPR requires response within 30 days)
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + 28); // Buffer for 28 days

    try {
      // In real implementation, this would save to database
      console.log('GDPR Request submitted:', gdprRequest);
      
      // Log the GDPR request for audit trail
      // auditLogger.logGDPRRequest({
      //   userId: request.employeeId,
      //   employeeId: request.employeeId,
      //   requestType: request.requestType,
      //   outcome: 'success',
      //   metadata: this.getAuditMetadata(),
      //   details: {
      //     description: `GDPR ${request.requestType} request submitted`,
      //     ipAddress: '',
      //     userAgent: navigator.userAgent
      //   }
      // });

      return {
        requestId: gdprRequest.id!,
        estimatedCompletion: estimatedCompletion.toISOString()
      };
    } catch (error) {
      throw new Error('Failed to submit GDPR request');
    }
  }

  /**
   * Export employee's personal data (Right to Data Portability)
   */
  static async exportPersonalData(employeeId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<{
    data: any;
    downloadUrl?: string;
    metadata: {
      exportDate: string;
      dataTypes: string[];
      recordCount: number;
    };
  }> {
    try {
      // Collect all personal data from various sources
      const personalData = await this.collectPersonalData(employeeId);
      
      // Apply data minimization - only export necessary data
      const minimizedData = this.applyDataMinimization(personalData);
      
      // Format data according to request
      const formattedData = await this.formatExportData(minimizedData, format);
      
      const exportMetadata = {
        exportDate: new Date().toISOString(),
        dataTypes: Object.keys(minimizedData),
        recordCount: this.countRecords(minimizedData)
      };

      // Create download URL for larger exports
      let downloadUrl: string | undefined;
      if (format === 'pdf' || this.getDataSize(formattedData) > 1024 * 1024) {
        downloadUrl = await this.createDownloadUrl(formattedData, format);
      }

      return {
        data: downloadUrl ? null : formattedData,
        downloadUrl,
        metadata: exportMetadata
      };
    } catch (error) {
      throw new Error('Failed to export personal data');
    }
  }

  /**
   * Delete employee's personal data (Right to Erasure)
   */
  static async deletePersonalData(employeeId: string, dataTypes?: string[]): Promise<{
    deletedRecords: number;
    retainedRecords: number;
    retentionReasons: string[];
  }> {
    try {
      const deletionResult = {
        deletedRecords: 0,
        retainedRecords: 0,
        retentionReasons: [] as string[]
      };

      // Identify data that can be deleted vs must be retained
      const dataInventory = await this.getDataInventory(employeeId);
      
      for (const [dataType, records] of Object.entries(dataInventory)) {
        if (dataTypes && !dataTypes.includes(dataType)) continue;

        const legalBasis = this.getLegalBasisForData(dataType);
        
        if (this.canDeleteData(dataType, legalBasis)) {
          // Safe to delete
          await this.performDeletion(employeeId, dataType);
          deletionResult.deletedRecords += records.length;
        } else {
          // Must retain due to legal obligations
          deletionResult.retainedRecords += records.length;
          deletionResult.retentionReasons.push(
            `${dataType}: ${this.getRetentionReason(dataType, legalBasis)}`
          );
        }
      }

      return deletionResult;
    } catch (error) {
      throw new Error('Failed to delete personal data');
    }
  }

  /**
   * Update employee's privacy settings
   */
  static async updatePrivacySettings(settings: PrivacySettings): Promise<void> {
    try {
      // Validate settings
      this.validatePrivacySettings(settings);
      
      // Save settings (in real implementation, to database)
      console.log('Privacy settings updated:', settings);
      
      // Apply settings immediately
      await this.applyPrivacySettings(settings);
      
    } catch (error) {
      throw new Error('Failed to update privacy settings');
    }
  }

  /**
   * Get data processing activities for transparency
   */
  static async getDataProcessingActivities(): Promise<DataProcessingActivity[]> {
    // In real implementation, this would fetch from database
    return [
      {
        id: 'payroll_processing',
        name: 'Payroll Processing',
        description: 'Processing employee payroll and tax calculations',
        dataCategories: ['personal_identifiers', 'financial_data', 'employment_data'],
        purposes: ['payroll_calculation', 'tax_compliance', 'reporting'],
        legalBasis: 'contract',
        retentionPeriod: '7 years after employment ends',
        recipients: ['payroll_department', 'tax_authorities'],
        transfers: ['tax_authorities_greece']
      },
      {
        id: 'hr_management',
        name: 'Human Resources Management',
        description: 'Managing employee records and HR processes',
        dataCategories: ['personal_identifiers', 'employment_data', 'performance_data'],
        purposes: ['hr_management', 'performance_evaluation', 'career_development'],
        legalBasis: 'contract',
        retentionPeriod: '5 years after employment ends',
        recipients: ['hr_department', 'management'],
        transfers: []
      },
      {
        id: 'access_control',
        name: 'System Access Control',
        description: 'Managing system access and security',
        dataCategories: ['personal_identifiers', 'access_logs', 'device_data'],
        purposes: ['security', 'access_control', 'audit'],
        legalBasis: 'legitimate_interests',
        retentionPeriod: '2 years after access ends',
        recipients: ['it_department', 'security_team'],
        transfers: []
      }
    ];
  }

  /**
   * Check if data can be accessed (configurable access window)
   */
  static async checkDataAccess(employeeId: string, requestedData: string[]): Promise<{
    allowedData: string[];
    restrictedData: string[];
    accessWindow: {
      start: string;
      end: string;
    } | null;
  }> {
    const settings = await this.getPrivacySettings(employeeId);
    const currentTime = new Date();
    
    // Check if within configured access window (e.g., business hours only)
    const accessWindow = this.getAccessWindow(settings);
    const isWithinWindow = accessWindow ? 
      this.isWithinTimeWindow(currentTime, accessWindow) : true;

    if (!isWithinWindow) {
      return {
        allowedData: [],
        restrictedData: requestedData,
        accessWindow
      };
    }

    // Apply other restrictions
    const result = {
      allowedData: [] as string[],
      restrictedData: [] as string[],
      accessWindow
    };

    for (const dataType of requestedData) {
      if (this.isDataAccessible(dataType, settings)) {
        result.allowedData.push(dataType);
      } else {
        result.restrictedData.push(dataType);
      }
    }

    return result;
  }

  /**
   * Generate privacy notice content
   */
  static generatePrivacyNotice(): {
    lastUpdated: string;
    content: {
      dataController: any;
      dataCategories: any;
      legalBasis: any;
      purposes: any;
      retention: any;
      rights: any;
      contact: any;
    };
  } {
    return {
      lastUpdated: '2024-01-15T00:00:00Z',
      content: {
        dataController: {
          name: 'Hotel Management Company',
          address: 'Athens, Greece',
          email: 'privacy@hotel.gr',
          phone: '+30 210 xxx xxxx'
        },
        dataCategories: [
          'Personal identifiers (name, email, phone)',
          'Employment data (position, department, salary)',
          'Financial data (bank account, tax information)',
          'Performance data (evaluations, goals)',
          'System access data (login times, IP addresses)'
        ],
        legalBasis: [
          'Employment contract (Art. 6(1)(b) GDPR)',
          'Legal compliance (Art. 6(1)(c) GDPR)',
          'Legitimate interests (Art. 6(1)(f) GDPR)'
        ],
        purposes: [
          'Payroll processing and tax compliance',
          'Human resources management',
          'System security and access control',
          'Performance management',
          'Legal and regulatory compliance'
        ],
        retention: [
          'Employment data: 5 years after employment ends',
          'Payroll data: 7 years after employment ends',
          'Access logs: 2 years after access ends',
          'Performance data: 3 years after employment ends'
        ],
        rights: [
          'Right to access your data',
          'Right to rectify inaccurate data',
          'Right to delete data (where legally possible)',
          'Right to restrict processing',
          'Right to data portability',
          'Right to object to processing',
          'Right to withdraw consent'
        ],
        contact: {
          dpo: 'Data Protection Officer',
          email: 'dpo@hotel.gr',
          supervisoryAuthority: 'Hellenic Data Protection Authority (HDPA)',
          authorityWebsite: 'https://www.dpa.gr'
        }
      }
    };
  }

  /**
   * Private helper methods
   */
  private static generateRequestId(): string {
    return `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async collectPersonalData(employeeId: string): Promise<any> {
    // In real implementation, this would collect data from multiple sources
    return {
      profile: { /* employee profile data */ },
      payslips: { /* payslip data */ },
      timesheets: { /* timesheet data */ },
      leaves: { /* leave data */ },
      performance: { /* performance data */ }
    };
  }

  private static applyDataMinimization(data: any): any {
    // Remove unnecessary fields and apply data minimization principles
    return data;
  }

  private static async formatExportData(data: any, format: string): Promise<any> {
    switch (format) {
      case 'csv':
        return this.convertToCSV(data);
      case 'pdf':
        return this.convertToPDF(data);
      default:
        return data; // JSON format
    }
  }

  private static convertToCSV(data: any): string {
    // Convert data to CSV format
    return 'CSV data...';
  }

  private static convertToPDF(data: any): Buffer {
    // Convert data to PDF format
    return Buffer.from('PDF data...');
  }

  private static countRecords(data: any): number {
    let count = 0;
    for (const category of Object.values(data)) {
      if (Array.isArray(category)) {
        count += category.length;
      } else if (typeof category === 'object') {
        count += 1;
      }
    }
    return count;
  }

  private static getDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private static async createDownloadUrl(data: any, format: string): Promise<string> {
    // Create secure download URL
    return `/api/gdpr/download/${this.generateRequestId()}`;
  }

  private static async getDataInventory(employeeId: string): Promise<Record<string, any[]>> {
    // Get inventory of all data for the employee
    return {};
  }

  private static getLegalBasisForData(dataType: string): string {
    const legalBasisMap: Record<string, string> = {
      'profile': 'contract',
      'payrolls': 'legal_obligation',
      'timesheets': 'contract',
      'performance': 'legitimate_interests'
    };
    return legalBasisMap[dataType] || 'contract';
  }

  private static canDeleteData(dataType: string, legalBasis: string): boolean {
    // Legal obligations prevent deletion of certain data
    const retentionRequired = ['payrolls', 'tax_data', 'audit_logs'];
    return !retentionRequired.includes(dataType);
  }

  private static getRetentionReason(dataType: string, legalBasis: string): string {
    const reasons: Record<string, string> = {
      'payrolls': 'Tax law requires 7-year retention',
      'tax_data': 'Legal compliance requirements',
      'audit_logs': 'Regulatory audit requirements'
    };
    return reasons[dataType] || 'Legal compliance';
  }

  private static async performDeletion(employeeId: string, dataType: string): Promise<void> {
    // Actually delete the data
    console.log(`Deleting ${dataType} for employee ${employeeId}`);
  }

  private static validatePrivacySettings(settings: PrivacySettings): void {
    // Validate the privacy settings
    if (settings.dataRetentionPreferences.retentionYears < 1) {
      throw new Error('Minimum retention period is 1 year');
    }
  }

  private static async applyPrivacySettings(settings: PrivacySettings): Promise<void> {
    // Apply the privacy settings to the system
    console.log('Applying privacy settings:', settings);
  }

  private static async getPrivacySettings(employeeId: string): Promise<PrivacySettings> {
    // Get employee's privacy settings
    return {
      employeeId,
      dataMinimization: true,
      marketingConsent: false,
      dataRetentionPreferences: {
        automaticDeletion: false,
        retentionYears: 7
      },
      accessNotifications: true,
      dataExportFormat: 'json',
      profileVisibility: 'private'
    };
  }

  private static getAccessWindow(settings: PrivacySettings): { start: string; end: string } | null {
    // Get configured access window (e.g., business hours only)
    return {
      start: '08:00',
      end: '18:00'
    };
  }

  private static isWithinTimeWindow(currentTime: Date, window: { start: string; end: string }): boolean {
    const currentHour = currentTime.getHours();
    const startHour = parseInt(window.start.split(':')[0]);
    const endHour = parseInt(window.end.split(':')[0]);
    
    return currentHour >= startHour && currentHour < endHour;
  }

  private static isDataAccessible(dataType: string, settings: PrivacySettings): boolean {
    // Check if specific data type is accessible based on settings
    return true; // Simplified for example
  }

  private static getAuditMetadata() {
    return {
      tenantId: 'default',
      source: 'web' as const,
      platform: 'browser',
      version: '1.0.0',
      environment: 'production' as const,
      severity: 'medium' as const,
      tags: ['gdpr', 'privacy']
    };
  }
}

export default GDPRComplianceManager;