/**
 * Incident Communication Templates Service
 * Provides standardized templates for incident response communications
 * Ensures consistent messaging across all incident types and severity levels
 */

export interface IncidentCommunication {
  id: string;
  templateType: CommunicationTemplateType;
  severity: IncidentSeverity;
  subject: string;
  message: string;
  variables: Record<string, any>;
  channels: CommunicationChannel[];
  timestamp: Date;
}

export type CommunicationTemplateType = 
  | 'incident_detected'
  | 'incident_investigating' 
  | 'incident_identified'
  | 'incident_monitoring'
  | 'incident_resolved'
  | 'maintenance_scheduled'
  | 'maintenance_started'
  | 'maintenance_completed'
  | 'service_degraded'
  | 'service_restored';

export type IncidentSeverity = 'minor' | 'major' | 'critical';

export type CommunicationChannel = 'status_page' | 'email' | 'sms' | 'slack' | 'teams' | 'webhook';

export interface TemplateVariable {
  key: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  example: string;
}

export interface CommunicationTemplate {
  type: CommunicationTemplateType;
  severity?: IncidentSeverity;
  subjectTemplate: string;
  messageTemplate: string;
  variables: TemplateVariable[];
  defaultChannels: CommunicationChannel[];
  isActive: boolean;
}

export class IncidentCommunicationTemplates {
  private static instance: IncidentCommunicationTemplates;
  private templates: Map<string, CommunicationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  public static getInstance(): IncidentCommunicationTemplates {
    if (!IncidentCommunicationTemplates.instance) {
      IncidentCommunicationTemplates.instance = new IncidentCommunicationTemplates();
    }
    return IncidentCommunicationTemplates.instance;
  }

  private initializeTemplates(): void {
    // Incident Detection Templates
    this.templates.set('incident_detected_minor', {
      type: 'incident_detected',
      severity: 'minor',
      subjectTemplate: 'Service Issue Detected - {{componentName}}',
      messageTemplate: 'We are investigating a minor issue affecting {{componentName}}. Users may experience {{impactDescription}}. We will provide updates as we learn more.',
      variables: [
        { key: 'componentName', description: 'Name of affected component', required: true, example: 'Payroll Processing' },
        { key: 'impactDescription', description: 'Description of user impact', required: true, example: 'delayed processing times' }
      ],
      defaultChannels: ['status_page'],
      isActive: true
    });

    this.templates.set('incident_detected_major', {
      type: 'incident_detected',
      severity: 'major',
      subjectTemplate: 'Service Outage - {{componentName}} Affected',
      messageTemplate: 'We are investigating a service outage affecting {{componentName}}. {{impactDescription}}. Our team is working to resolve this issue as quickly as possible.',
      variables: [
        { key: 'componentName', description: 'Name of affected component', required: true, example: 'HR Management System' },
        { key: 'impactDescription', description: 'Description of user impact', required: true, example: 'Users are unable to access employee records' }
      ],
      defaultChannels: ['status_page', 'email'],
      isActive: true
    });

    this.templates.set('incident_detected_critical', {
      type: 'incident_detected',
      severity: 'critical',
      subjectTemplate: 'CRITICAL: Multiple Services Affected',
      messageTemplate: '⚠️ CRITICAL INCIDENT: We are experiencing a major outage affecting multiple services including {{componentNames}}. {{impactDescription}}. All hands are on deck to restore service. Updates will be provided every {{updateFrequency}} minutes.',
      variables: [
        { key: 'componentNames', description: 'Names of affected components', required: true, example: 'Payroll Processing, HR Management, and Time Tracking' },
        { key: 'impactDescription', description: 'Description of user impact', required: true, example: 'Complete service unavailability' },
        { key: 'updateFrequency', description: 'How often updates will be provided', required: false, defaultValue: '15', example: '15' }
      ],
      defaultChannels: ['status_page', 'email', 'sms', 'slack'],
      isActive: true
    });

    // Investigation Templates
    this.templates.set('incident_investigating', {
      type: 'incident_investigating',
      subjectTemplate: 'Investigating - {{componentName}}',
      messageTemplate: 'We are actively investigating the issue affecting {{componentName}}. {{currentStatus}}. Next update in {{nextUpdateTime}}.',
      variables: [
        { key: 'componentName', description: 'Name of affected component', required: true, example: 'Database Services' },
        { key: 'currentStatus', description: 'Current investigation status', required: true, example: 'Initial analysis shows database connection issues' },
        { key: 'nextUpdateTime', description: 'When next update will be provided', required: false, defaultValue: '30 minutes', example: '30 minutes' }
      ],
      defaultChannels: ['status_page'],
      isActive: true
    });

    // Issue Identified Templates
    this.templates.set('incident_identified', {
      type: 'incident_identified',
      subjectTemplate: 'Issue Identified - {{componentName}}',
      messageTemplate: 'We have identified the root cause of the issue affecting {{componentName}}. {{rootCause}}. {{resolutionPlan}}. Estimated resolution time: {{eta}}.',
      variables: [
        { key: 'componentName', description: 'Name of affected component', required: true, example: 'Authentication Services' },
        { key: 'rootCause', description: 'Identified root cause', required: true, example: 'Database connection pool exhaustion' },
        { key: 'resolutionPlan', description: 'Plan to resolve the issue', required: true, example: 'Restarting services and increasing connection pool limits' },
        { key: 'eta', description: 'Estimated time to resolution', required: false, example: '45 minutes' }
      ],
      defaultChannels: ['status_page', 'email'],
      isActive: true
    });

    // Monitoring Templates
    this.templates.set('incident_monitoring', {
      type: 'incident_monitoring',
      subjectTemplate: 'Monitoring Fix - {{componentName}}',
      messageTemplate: 'We have implemented a fix for the issue affecting {{componentName}}. {{fixDescription}}. We are monitoring the service to ensure stability.',
      variables: [
        { key: 'componentName', description: 'Name of affected component', required: true, example: 'File Storage' },
        { key: 'fixDescription', description: 'Description of the fix applied', required: true, example: 'Increased server capacity and optimized database queries' }
      ],
      defaultChannels: ['status_page'],
      isActive: true
    });

    // Resolution Templates
    this.templates.set('incident_resolved', {
      type: 'incident_resolved',
      subjectTemplate: 'Resolved - {{componentName}} Service Restored',
      messageTemplate: '✅ The issue affecting {{componentName}} has been fully resolved. {{resolutionSummary}}. Total downtime: {{duration}}. We apologize for any inconvenience caused.',
      variables: [
        { key: 'componentName', description: 'Name of affected component', required: true, example: 'Government Integration Services' },
        { key: 'resolutionSummary', description: 'Summary of how issue was resolved', required: true, example: 'Service has been restored and all systems are operating normally' },
        { key: 'duration', description: 'Total incident duration', required: false, example: '2 hours 15 minutes' }
      ],
      defaultChannels: ['status_page', 'email'],
      isActive: true
    });

    // Maintenance Templates
    this.templates.set('maintenance_scheduled', {
      type: 'maintenance_scheduled',
      subjectTemplate: 'Scheduled Maintenance - {{componentName}}',
      messageTemplate: '🔧 We have scheduled maintenance for {{componentName}} on {{maintenanceDate}} from {{startTime}} to {{endTime}} ({{timezone}}). {{impactDescription}}. {{preparationSteps}}',
      variables: [
        { key: 'componentName', description: 'Component undergoing maintenance', required: true, example: 'Database Services' },
        { key: 'maintenanceDate', description: 'Date of maintenance', required: true, example: 'January 15, 2025' },
        { key: 'startTime', description: 'Maintenance start time', required: true, example: '02:00' },
        { key: 'endTime', description: 'Maintenance end time', required: true, example: '04:00' },
        { key: 'timezone', description: 'Timezone for maintenance window', required: false, defaultValue: 'EET', example: 'EET' },
        { key: 'impactDescription', description: 'Expected impact during maintenance', required: true, example: 'PayrollSync will be temporarily unavailable' },
        { key: 'preparationSteps', description: 'Steps users should take to prepare', required: false, example: 'Please save your work and log out before the maintenance window' }
      ],
      defaultChannels: ['status_page', 'email'],
      isActive: true
    });

    this.templates.set('maintenance_started', {
      type: 'maintenance_started',
      subjectTemplate: 'Maintenance In Progress - {{componentName}}',
      messageTemplate: '🔧 Scheduled maintenance for {{componentName}} has begun. {{currentStatus}}. Expected completion: {{expectedCompletion}}.',
      variables: [
        { key: 'componentName', description: 'Component undergoing maintenance', required: true, example: 'Authentication System' },
        { key: 'currentStatus', description: 'Current maintenance status', required: true, example: 'Database upgrades in progress' },
        { key: 'expectedCompletion', description: 'Expected completion time', required: true, example: '04:00 EET' }
      ],
      defaultChannels: ['status_page'],
      isActive: true
    });

    this.templates.set('maintenance_completed', {
      type: 'maintenance_completed',
      subjectTemplate: 'Maintenance Complete - {{componentName}}',
      messageTemplate: '✅ Scheduled maintenance for {{componentName}} has been completed successfully. {{completionSummary}}. All services are now fully operational.',
      variables: [
        { key: 'componentName', description: 'Component that underwent maintenance', required: true, example: 'Payroll Engine' },
        { key: 'completionSummary', description: 'Summary of maintenance completed', required: true, example: 'System performance improvements and security updates have been applied' }
      ],
      defaultChannels: ['status_page', 'email'],
      isActive: true
    });

    // Service Degradation Templates
    this.templates.set('service_degraded', {
      type: 'service_degraded',
      subjectTemplate: 'Performance Issues - {{componentName}}',
      messageTemplate: '⚠️ We are experiencing degraded performance with {{componentName}}. {{performanceIssue}}. {{mitigationSteps}}. We are working to restore full performance.',
      variables: [
        { key: 'componentName', description: 'Component with degraded performance', required: true, example: 'Report Generation' },
        { key: 'performanceIssue', description: 'Description of performance issue', required: true, example: 'Reports are taking longer than usual to generate' },
        { key: 'mitigationSteps', description: 'Steps taken to mitigate', required: false, example: 'We have increased server capacity to reduce delays' }
      ],
      defaultChannels: ['status_page'],
      isActive: true
    });

    this.templates.set('service_restored', {
      type: 'service_restored',
      subjectTemplate: 'Performance Restored - {{componentName}}',
      messageTemplate: '✅ Performance issues with {{componentName}} have been resolved. {{resolutionDetails}}. Service is now operating at full capacity.',
      variables: [
        { key: 'componentName', description: 'Component with restored performance', required: true, example: 'Time Tracking System' },
        { key: 'resolutionDetails', description: 'Details of how performance was restored', required: true, example: 'Database optimizations and cache improvements have been deployed' }
      ],
      defaultChannels: ['status_page', 'email'],
      isActive: true
    });
  }

  /**
   * Get all available templates
   */
  public getAllTemplates(): CommunicationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by type and severity
   */
  public getTemplate(type: CommunicationTemplateType, severity?: IncidentSeverity): CommunicationTemplate | undefined {
    if (severity) {
      const key = `${type}_${severity}`;
      return this.templates.get(key);
    }
    return this.templates.get(type);
  }

  /**
   * Generate communication message from template
   */
  public generateMessage(
    type: CommunicationTemplateType, 
    variables: Record<string, string>,
    severity?: IncidentSeverity
  ): IncidentCommunication | null {
    const template = this.getTemplate(type, severity);
    if (!template) {
      return null;
    }

    // Validate required variables
    const missingVariables = template.variables
      .filter(v => v.required && !variables[v.key])
      .map(v => v.key);
    
    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Apply default values
    const processedVariables = { ...variables };
    template.variables.forEach(variable => {
      if (!processedVariables[variable.key] && variable.defaultValue) {
        processedVariables[variable.key] = variable.defaultValue;
      }
    });

    // Replace template variables
    const subject = this.replaceVariables(template.subjectTemplate, processedVariables);
    const message = this.replaceVariables(template.messageTemplate, processedVariables);

    return {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      templateType: type,
      severity: severity || 'minor',
      subject,
      message,
      variables: processedVariables,
      channels: template.defaultChannels,
      timestamp: new Date()
    };
  }

  /**
   * Get template suggestions based on incident details
   */
  public getTemplateSuggestions(
    incidentSeverity: IncidentSeverity,
    componentName: string,
    incidentStatus: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  ): CommunicationTemplate[] {
    const suggestions: CommunicationTemplate[] = [];
    
    // Add appropriate template based on status
    const statusTemplate = this.getTemplate(
      incidentStatus === 'investigating' ? 'incident_investigating' :
      incidentStatus === 'identified' ? 'incident_identified' :
      incidentStatus === 'monitoring' ? 'incident_monitoring' :
      'incident_resolved'
    );
    
    if (statusTemplate) {
      suggestions.push(statusTemplate);
    }

    // Add initial detection template if not resolved
    if (incidentStatus !== 'resolved') {
      const detectionTemplate = this.getTemplate('incident_detected', incidentSeverity);
      if (detectionTemplate) {
        suggestions.push(detectionTemplate);
      }
    }

    return suggestions;
  }

  /**
   * Replace variables in template string
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Validate template variables
   */
  public validateVariables(template: CommunicationTemplate, variables: Record<string, string>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    template.variables.forEach(variable => {
      if (variable.required && !variables[variable.key]) {
        errors.push(`Required variable '${variable.key}' is missing`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get available variables for a template
   */
  public getTemplateVariables(type: CommunicationTemplateType, severity?: IncidentSeverity): TemplateVariable[] {
    const template = this.getTemplate(type, severity);
    return template?.variables || [];
  }

  /**
   * Generate incident timeline communication
   */
  public generateTimelineCommunication(
    incidentId: string,
    updates: Array<{
      status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
      timestamp: Date;
      details: string;
    }>
  ): IncidentCommunication[] {
    const communications: IncidentCommunication[] = [];
    
    updates.forEach((update, index) => {
      const variables = {
        incidentId,
        updateNumber: (index + 1).toString(),
        currentStatus: update.details,
        timestamp: update.timestamp.toISOString()
      };

      const communication = this.generateMessage(
        update.status === 'investigating' ? 'incident_investigating' :
        update.status === 'identified' ? 'incident_identified' :
        update.status === 'monitoring' ? 'incident_monitoring' :
        'incident_resolved',
        variables
      );

      if (communication) {
        communications.push(communication);
      }
    });

    return communications;
  }
}