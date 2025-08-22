/**
 * DPA (Data Processing Agreement) Service
 * Manages Data Processing Agreements between controllers and processors per GDPR Article 28
 */

import { AuditService } from './AuditService';

export interface DPAgreement {
  id: string;
  title: string;
  version: string;
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';
  
  // Parties
  dataController: Party;
  dataProcessor: Party;
  
  // Agreement Details
  effectiveDate: Date;
  expirationDate?: Date;
  terminationDate?: Date;
  
  // Processing Details
  subjectMatter: string;
  duration: string;
  natureAndPurpose: string;
  personalDataCategories: string[];
  dataSubjectCategories: string[];
  
  // Processor Obligations
  processorObligations: ProcessorObligation[];
  securityMeasures: SecurityMeasure[];
  subProcessors: SubProcessor[];
  
  // Data Transfers
  internationalTransfers: InternationalTransfer[];
  
  // Liability and Indemnification
  liabilityClause: string;
  indemnificationClause: string;
  
  // Technical and Organizational Measures
  technicalMeasures: string[];
  organizationalMeasures: string[];
  
  // Audit and Compliance
  auditRights: string;
  complianceReporting: string;
  
  // Termination and Data Return
  terminationProcedure: string;
  dataReturnProcedure: string;
  dataDestructionProcedure: string;
  
  // Legal
  governingLaw: string;
  jurisdiction: string;
  
  // Signatures
  controllerSignature?: Signature;
  processorSignature?: Signature;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  template?: string;
}

export interface Party {
  name: string;
  legalName: string;
  address: Address;
  contactPerson: ContactPerson;
  dpoContact?: ContactPerson;
  registrationNumber?: string;
  vatNumber?: string;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface ContactPerson {
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface ProcessorObligation {
  id: string;
  obligation: string;
  description: string;
  compliance: 'mandatory' | 'conditional' | 'optional';
  verificationMethod: string;
}

export interface SecurityMeasure {
  id: string;
  category: 'technical' | 'organizational' | 'physical';
  measure: string;
  description: string;
  implementation: string;
  effectiveness: 'basic' | 'enhanced' | 'advanced';
}

export interface SubProcessor {
  id: string;
  name: string;
  location: string;
  services: string[];
  safeguards: string[];
  approved: boolean;
  approvalDate?: Date;
  restrictions?: string[];
}

export interface InternationalTransfer {
  destination: string;
  adequacyDecision: boolean;
  safeguards: string[];
  necessity?: string;
  safeguardType: 'scc' | 'bcr' | 'certification' | 'cod' | 'other';
}

export interface Signature {
  signedBy: string;
  signedAt: Date;
  signature: string; // Digital signature or reference
  ipAddress: string;
  method: 'electronic' | 'wet_signature' | 'digital_certificate';
}

export interface DPATemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'hr' | 'marketing' | 'it_services' | 'cloud' | 'analytics';
  language: 'en' | 'el' | 'both';
  content: DPATemplateContent;
  lastUpdated: Date;
  version: string;
}

export interface DPATemplateContent {
  title: string;
  clauses: DPAClause[];
  standardObligations: ProcessorObligation[];
  defaultSecurityMeasures: SecurityMeasure[];
  schedules: Schedule[];
}

export interface DPAClause {
  id: string;
  title: string;
  content: string;
  variables: string[]; // Template variables like {{controller_name}}
  mandatory: boolean;
  order: number;
}

export interface Schedule {
  id: string;
  title: string;
  content: string;
  type: 'processing_details' | 'security_measures' | 'sub_processors' | 'transfers';
}

export class DPAService {
  private static agreements = new Map<string, DPAgreement>();
  private static templates = new Map<string, DPATemplate>();

  /**
   * Initialize DPA service with standard templates
   */
  static initialize(): void {
    this.loadStandardTemplates();
    console.log('✅ DPA Service initialized');
  }

  /**
   * Create new DPA from template
   */
  static async createDPAFromTemplate(
    templateId: string,
    controllerInfo: Party,
    processorInfo: Party,
    processingDetails: {
      subjectMatter: string;
      duration: string;
      natureAndPurpose: string;
      personalDataCategories: string[];
      dataSubjectCategories: string[];
    },
    createdBy: string
  ): Promise<DPAgreement> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`DPA template not found: ${templateId}`);
    }

    const dpaId = `dpa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const agreement: DPAgreement = {
      id: dpaId,
      title: `${template.content.title} - ${controllerInfo.name} & ${processorInfo.name}`,
      version: '1.0',
      status: 'draft',
      dataController: controllerInfo,
      dataProcessor: processorInfo,
      effectiveDate: new Date(),
      subjectMatter: processingDetails.subjectMatter,
      duration: processingDetails.duration,
      natureAndPurpose: processingDetails.natureAndPurpose,
      personalDataCategories: processingDetails.personalDataCategories,
      dataSubjectCategories: processingDetails.dataSubjectCategories,
      processorObligations: [...template.content.standardObligations],
      securityMeasures: [...template.content.defaultSecurityMeasures],
      subProcessors: [],
      internationalTransfers: [],
      liabilityClause: this.getStandardLiabilityClause(),
      indemnificationClause: this.getStandardIndemnificationClause(),
      technicalMeasures: this.getStandardTechnicalMeasures(),
      organizationalMeasures: this.getStandardOrganizationalMeasures(),
      auditRights: this.getStandardAuditRights(),
      complianceReporting: this.getStandardComplianceReporting(),
      terminationProcedure: this.getStandardTerminationProcedure(),
      dataReturnProcedure: this.getStandardDataReturnProcedure(),
      dataDestructionProcedure: this.getStandardDataDestructionProcedure(),
      governingLaw: 'Greek Law',
      jurisdiction: 'Greek Courts',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      template: templateId
    };

    this.agreements.set(dpaId, agreement);

    // Audit DPA creation
    await AuditService.logEvent({
      action: 'dpa.created',
      userId: createdBy,
      resourceType: 'dpa',
      resourceId: dpaId,
      metadata: {
        controller: controllerInfo.name,
        processor: processorInfo.name,
        template: templateId
      }
    });

    return agreement;
  }

  /**
   * Update DPA agreement
   */
  static async updateDPA(
    dpaId: string,
    updates: Partial<DPAgreement>,
    updatedBy: string
  ): Promise<DPAgreement> {
    const agreement = this.agreements.get(dpaId);
    if (!agreement) {
      throw new Error(`DPA not found: ${dpaId}`);
    }

    // Create new version if significant changes
    const significantFields = ['processorObligations', 'securityMeasures', 'internationalTransfers'];
    const isSignificantChange = Object.keys(updates).some(key => significantFields.includes(key));
    
    let newVersion = agreement.version;
    if (isSignificantChange && agreement.status === 'active') {
      const [major, minor] = agreement.version.split('.').map(Number);
      newVersion = `${major}.${minor + 1}`;
    }

    const updatedAgreement = {
      ...agreement,
      ...updates,
      version: newVersion,
      updatedAt: new Date()
    };

    this.agreements.set(dpaId, updatedAgreement);

    // Audit DPA update
    await AuditService.logEvent({
      action: 'dpa.updated',
      userId: updatedBy,
      resourceType: 'dpa',
      resourceId: dpaId,
      metadata: {
        updatedFields: Object.keys(updates),
        version: newVersion,
        significantChange: isSignificantChange
      }
    });

    return updatedAgreement;
  }

  /**
   * Add sub-processor
   */
  static async addSubProcessor(
    dpaId: string,
    subProcessor: Omit<SubProcessor, 'id'>,
    addedBy: string
  ): Promise<void> {
    const agreement = this.agreements.get(dpaId);
    if (!agreement) {
      throw new Error(`DPA not found: ${dpaId}`);
    }

    const subProcessorWithId: SubProcessor = {
      ...subProcessor,
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };

    const updatedSubProcessors = [...agreement.subProcessors, subProcessorWithId];
    
    await this.updateDPA(dpaId, { subProcessors: updatedSubProcessors }, addedBy);

    // Audit sub-processor addition
    await AuditService.logEvent({
      action: 'dpa.subprocessor.added',
      userId: addedBy,
      resourceType: 'dpa',
      resourceId: dpaId,
      metadata: {
        subProcessor: subProcessor.name,
        location: subProcessor.location,
        services: subProcessor.services
      }
    });
  }

  /**
   * Sign DPA agreement
   */
  static async signDPA(
    dpaId: string,
    party: 'controller' | 'processor',
    signedBy: string,
    signatureMethod: Signature['method'],
    ipAddress: string
  ): Promise<void> {
    const agreement = this.agreements.get(dpaId);
    if (!agreement) {
      throw new Error(`DPA not found: ${dpaId}`);
    }

    const signature: Signature = {
      signedBy,
      signedAt: new Date(),
      signature: this.generateSignatureHash(dpaId, signedBy),
      ipAddress,
      method: signatureMethod
    };

    const updates: Partial<DPAgreement> = {};
    if (party === 'controller') {
      updates.controllerSignature = signature;
    } else {
      updates.processorSignature = signature;
    }

    // If both parties have signed, activate the agreement
    if (
      (party === 'controller' && agreement.processorSignature) ||
      (party === 'processor' && agreement.controllerSignature)
    ) {
      updates.status = 'active';
    } else {
      updates.status = 'pending_signature';
    }

    await this.updateDPA(dpaId, updates, signedBy);

    // Audit signature
    await AuditService.logEvent({
      action: 'dpa.signed',
      userId: signedBy,
      resourceType: 'dpa',
      resourceId: dpaId,
      metadata: {
        party,
        signatureMethod,
        fullyExecuted: updates.status === 'active'
      }
    });
  }

  /**
   * Generate DPA document
   */
  static generateDPADocument(dpaId: string, language: 'en' | 'el' = 'en'): {
    title: string;
    content: string;
    schedules: { title: string; content: string }[];
  } {
    const agreement = this.agreements.get(dpaId);
    if (!agreement) {
      throw new Error(`DPA not found: ${dpaId}`);
    }

    const template = agreement.template ? this.templates.get(agreement.template) : null;
    
    // Generate main content
    const content = this.generateDPAContent(agreement, language);
    
    // Generate schedules
    const schedules = [
      {
        title: language === 'el' ? 'Παράρτημα Α: Λεπτομέρειες Επεξεργασίας' : 'Schedule A: Processing Details',
        content: this.generateProcessingDetailsSchedule(agreement, language)
      },
      {
        title: language === 'el' ? 'Παράρτημα Β: Τεχνικά και Οργανωτικά Μέτρα' : 'Schedule B: Technical and Organizational Measures',
        content: this.generateSecurityMeasuresSchedule(agreement, language)
      },
      {
        title: language === 'el' ? 'Παράρτημα Γ: Υπο-Επεξεργαστές' : 'Schedule C: Sub-processors',
        content: this.generateSubProcessorsSchedule(agreement, language)
      }
    ];

    return {
      title: agreement.title,
      content,
      schedules
    };
  }

  /**
   * Get DPA agreement
   */
  static getDPA(dpaId: string): DPAgreement | null {
    return this.agreements.get(dpaId) || null;
  }

  /**
   * List DPA agreements
   */
  static listDPAs(
    status?: DPAgreement['status'],
    controller?: string,
    processor?: string
  ): DPAgreement[] {
    let agreements = Array.from(this.agreements.values());

    if (status) {
      agreements = agreements.filter(a => a.status === status);
    }

    if (controller) {
      agreements = agreements.filter(a => 
        a.dataController.name.toLowerCase().includes(controller.toLowerCase())
      );
    }

    if (processor) {
      agreements = agreements.filter(a => 
        a.dataProcessor.name.toLowerCase().includes(processor.toLowerCase())
      );
    }

    return agreements.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Check DPA compliance
   */
  static checkDPACompliance(dpaId: string): {
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const agreement = this.agreements.get(dpaId);
    if (!agreement) {
      throw new Error(`DPA not found: ${dpaId}`);
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check essential elements
    if (!agreement.subjectMatter) issues.push('Subject matter not defined');
    if (!agreement.natureAndPurpose) issues.push('Nature and purpose not defined');
    if (!agreement.personalDataCategories.length) issues.push('Personal data categories not specified');
    if (!agreement.processorObligations.length) issues.push('Processor obligations not defined');
    if (!agreement.securityMeasures.length) issues.push('Security measures not specified');

    // Check signatures
    if (agreement.status === 'active' && (!agreement.controllerSignature || !agreement.processorSignature)) {
      issues.push('Missing required signatures');
    }

    // Check expiration
    if (agreement.expirationDate && agreement.expirationDate < new Date()) {
      issues.push('Agreement has expired');
    }

    // Generate recommendations
    if (agreement.internationalTransfers.length === 0 && agreement.subProcessors.some(sp => sp.location !== 'EU')) {
      recommendations.push('Consider documenting international transfer safeguards');
    }

    if (agreement.securityMeasures.filter(sm => sm.effectiveness === 'advanced').length === 0) {
      recommendations.push('Consider implementing advanced security measures');
    }

    return {
      compliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  // Private helper methods

  private static generateSignatureHash(dpaId: string, signedBy: string): string {
    // In practice, this would generate a proper digital signature
    return `sig_${dpaId}_${signedBy}_${Date.now()}`;
  }

  private static generateDPAContent(agreement: DPAgreement, language: 'en' | 'el'): string {
    const isGreek = language === 'el';
    
    return `
${isGreek ? 'ΣΥΜΦΩΝΙΑ ΕΠΕΞΕΡΓΑΣΙΑΣ ΔΕΔΟΜΕΝΩΝ' : 'DATA PROCESSING AGREEMENT'}

${isGreek ? 'Μεταξύ:' : 'Between:'}
${isGreek ? 'Υπεύθυνος Επεξεργασίας:' : 'Data Controller:'} ${agreement.dataController.name}
${isGreek ? 'Επεξεργαστής:' : 'Data Processor:'} ${agreement.dataProcessor.name}

${isGreek ? 'Ημερομηνία Ισχύος:' : 'Effective Date:'} ${agreement.effectiveDate.toLocaleDateString()}

${isGreek ? 'ΑΡΘΡΟ 1 - ΑΝΤΙΚΕΙΜΕΝΟ ΚΑΙ ΔΙΑΡΚΕΙΑ' : 'ARTICLE 1 - SUBJECT MATTER AND DURATION'}
${isGreek ? 'Αντικείμενο:' : 'Subject Matter:'} ${agreement.subjectMatter}
${isGreek ? 'Διάρκεια:' : 'Duration:'} ${agreement.duration}

${isGreek ? 'ΑΡΘΡΟ 2 - ΦΥΣΗ ΚΑΙ ΣΚΟΠΟΣ ΕΠΕΞΕΡΓΑΣΙΑΣ' : 'ARTICLE 2 - NATURE AND PURPOSE OF PROCESSING'}
${agreement.natureAndPurpose}

${isGreek ? 'ΑΡΘΡΟ 3 - ΥΠΟΧΡΕΩΣΕΙΣ ΕΠΕΞΕΡΓΑΣΤΗ' : 'ARTICLE 3 - PROCESSOR OBLIGATIONS'}
${agreement.processorObligations.map(o => `- ${o.description}`).join('\n')}

${isGreek ? 'ΑΡΘΡΟ 4 - ΤΕΧΝΙΚΑ ΚΑΙ ΟΡΓΑΝΩΤΙΚΑ ΜΕΤΡΑ' : 'ARTICLE 4 - TECHNICAL AND ORGANIZATIONAL MEASURES'}
${agreement.securityMeasures.map(m => `- ${m.description}`).join('\n')}

${isGreek ? 'ΑΡΘΡΟ 5 - ΥΠΟΕΠΕΞΕΡΓΑΣΤΕΣ' : 'ARTICLE 5 - SUB-PROCESSORS'}
${agreement.subProcessors.length > 0 ? agreement.subProcessors.map(sp => `- ${sp.name} (${sp.location})`).join('\n') : (isGreek ? 'Δεν έχουν εγκριθεί υπό-επεξεργαστές' : 'No sub-processors authorized')}

${isGreek ? 'ΑΡΘΡΟ 6 - ΔΙΕΘΝΕΙΣ ΜΕΤΑΦΟΡΕΣ' : 'ARTICLE 6 - INTERNATIONAL TRANSFERS'}
${agreement.internationalTransfers.length > 0 ? agreement.internationalTransfers.map(t => `- ${t.destination}: ${t.safeguards.join(', ')}`).join('\n') : (isGreek ? 'Δεν υπάρχουν διεθνείς μεταφορές' : 'No international transfers')}
    `.trim();
  }

  private static generateProcessingDetailsSchedule(agreement: DPAgreement, language: 'en' | 'el'): string {
    const isGreek = language === 'el';
    
    return `
${isGreek ? 'Κατηγορίες Προσωπικών Δεδομένων:' : 'Categories of Personal Data:'}
${agreement.personalDataCategories.map(cat => `- ${cat}`).join('\n')}

${isGreek ? 'Κατηγορίες Υποκειμένων Δεδομένων:' : 'Categories of Data Subjects:'}
${agreement.dataSubjectCategories.map(cat => `- ${cat}`).join('\n')}
    `.trim();
  }

  private static generateSecurityMeasuresSchedule(agreement: DPAgreement, language: 'en' | 'el'): string {
    const isGreek = language === 'el';
    
    return `
${isGreek ? 'Τεχνικά Μέτρα:' : 'Technical Measures:'}
${agreement.technicalMeasures.map(measure => `- ${measure}`).join('\n')}

${isGreek ? 'Οργανωτικά Μέτρα:' : 'Organizational Measures:'}
${agreement.organizationalMeasures.map(measure => `- ${measure}`).join('\n')}

${isGreek ? 'Μέτρα Ασφαλείας:' : 'Security Measures:'}
${agreement.securityMeasures.map(sm => `- ${sm.measure}: ${sm.description}`).join('\n')}
    `.trim();
  }

  private static generateSubProcessorsSchedule(agreement: DPAgreement, language: 'en' | 'el'): string {
    const isGreek = language === 'el';
    
    if (agreement.subProcessors.length === 0) {
      return isGreek ? 'Δεν έχουν εγκριθεί υπό-επεξεργαστές.' : 'No sub-processors authorized.';
    }

    return agreement.subProcessors.map(sp => `
${isGreek ? 'Όνομα:' : 'Name:'} ${sp.name}
${isGreek ? 'Τοποθεσία:' : 'Location:'} ${sp.location}
${isGreek ? 'Υπηρεσίες:' : 'Services:'} ${sp.services.join(', ')}
${isGreek ? 'Διασφαλίσεις:' : 'Safeguards:'} ${sp.safeguards.join(', ')}
${isGreek ? 'Εγκρίθηκε:' : 'Approved:'} ${sp.approvalDate?.toLocaleDateString() || (isGreek ? 'Εκκρεμεί' : 'Pending')}
    `).join('\n---\n');
  }

  // Standard clauses and procedures

  private static getStandardLiabilityClause(): string {
    return 'Each party shall be liable for its own acts and omissions and those of its employees, agents and subcontractors in connection with this Agreement, except to the extent that liability is caused by the other party.';
  }

  private static getStandardIndemnificationClause(): string {
    return 'The Processor shall indemnify and hold harmless the Controller against all claims, costs, damages, losses, liabilities and expenses arising from the Processor\'s breach of this Agreement.';
  }

  private static getStandardTechnicalMeasures(): string[] {
    return [
      'Pseudonymisation and encryption of personal data',
      'Ability to ensure ongoing confidentiality, integrity, availability and resilience',
      'Ability to restore availability and access to personal data in a timely manner',
      'Regular testing, assessing and evaluating effectiveness of measures'
    ];
  }

  private static getStandardOrganizationalMeasures(): string[] {
    return [
      'Staff training on data protection and confidentiality',
      'Designation of responsible persons for data protection',
      'Measures to control access to processing equipment',
      'Incident response procedures for personal data breaches'
    ];
  }

  private static getStandardAuditRights(): string {
    return 'The Controller shall have the right to conduct audits and inspections of the Processor\'s data processing activities upon reasonable notice.';
  }

  private static getStandardComplianceReporting(): string {
    return 'The Processor shall provide regular compliance reports and immediately notify the Controller of any data protection incidents.';
  }

  private static getStandardTerminationProcedure(): string {
    return 'Either party may terminate this Agreement upon 30 days written notice. Termination shall not affect ongoing processing obligations.';
  }

  private static getStandardDataReturnProcedure(): string {
    return 'Upon termination, the Processor shall return all personal data to the Controller or to another processor designated by the Controller.';
  }

  private static getStandardDataDestructionProcedure(): string {
    return 'Where return of data is not possible, the Processor shall securely destroy all personal data and certify such destruction to the Controller.';
  }

  private static loadStandardTemplates(): void {
    // Cloud Services DPA Template
    const cloudDPA: DPATemplate = {
      id: 'cloud_services',
      name: 'Cloud Services DPA',
      description: 'Standard DPA for cloud service providers',
      category: 'cloud',
      language: 'both',
      content: {
        title: 'Cloud Services Data Processing Agreement',
        clauses: [],
        standardObligations: [
          {
            id: 'process_lawfully',
            obligation: 'Process personal data only on documented instructions',
            description: 'Process personal data only in accordance with the Controller\'s documented instructions',
            compliance: 'mandatory',
            verificationMethod: 'Audit and monitoring logs'
          },
          {
            id: 'confidentiality',
            obligation: 'Ensure confidentiality of personal data',
            description: 'Ensure persons authorized to process data are committed to confidentiality',
            compliance: 'mandatory',
            verificationMethod: 'Confidentiality agreements and training records'
          }
        ],
        defaultSecurityMeasures: [
          {
            id: 'encryption',
            category: 'technical',
            measure: 'Data Encryption',
            description: 'Encryption of personal data at rest and in transit',
            implementation: 'AES-256 encryption for data at rest, TLS 1.3 for data in transit',
            effectiveness: 'advanced'
          }
        ],
        schedules: []
      },
      lastUpdated: new Date(),
      version: '1.0'
    };

    this.templates.set('cloud_services', cloudDPA);

    // HR Services DPA Template
    const hrDPA: DPATemplate = {
      id: 'hr_services',
      name: 'HR Services DPA',
      description: 'DPA for HR and payroll service providers',
      category: 'hr',
      language: 'both',
      content: {
        title: 'HR Services Data Processing Agreement',
        clauses: [],
        standardObligations: [
          {
            id: 'employee_data',
            obligation: 'Protect employee personal data',
            description: 'Implement appropriate measures to protect employee personal data',
            compliance: 'mandatory',
            verificationMethod: 'Security assessments and compliance audits'
          }
        ],
        defaultSecurityMeasures: [
          {
            id: 'access_control',
            category: 'organizational',
            measure: 'Access Controls',
            description: 'Role-based access controls for HR data',
            implementation: 'Multi-factor authentication and principle of least privilege',
            effectiveness: 'enhanced'
          }
        ],
        schedules: []
      },
      lastUpdated: new Date(),
      version: '1.0'
    };

    this.templates.set('hr_services', hrDPA);
  }
}