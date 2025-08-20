import { 
  TerminationRecord,
  SeveranceCalculation,
  type SeveranceCalculationInputs 
} from "../../shared/schema";

/**
 * ErganiTerminationService
 * 
 * Generates ERGANI II termination payloads and documents for Greek compliance.
 * Handles all termination scenarios with proper event codes and legal templates.
 * 
 * Key features:
 * - ERGANI II XML payload generation
 * - Dismissal/resignation/expiry letters
 * - Greek legal document templates
 * - Bilingual document generation
 */
export class ErganiTerminationService {

  /**
   * Generate ERGANI II termination XML payload
   */
  static async generateErganiTerminationPayload(
    terminationRecord: TerminationRecord,
    employeeData: any
  ): Promise<{
    xmlPayload: string;
    eventCode: string;
    submissionMetadata: any;
  }> {
    try {
      const eventCode = this.getErganiEventCode(terminationRecord.terminationType);
      
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<TerminationEvent xmlns="http://ergani.gov.gr/v2">
  <Header>
    <CompanyVAT>${employeeData.companyVat || 'EL123456789'}</CompanyVAT>
    <EventType>${eventCode}</EventType>
    <EventDate>${terminationRecord.effectiveDate.toISOString().split('T')[0]}</EventDate>
    <SubmissionDate>${new Date().toISOString().split('T')[0]}</SubmissionDate>
    <SubmissionTime>${new Date().toTimeString().split(' ')[0]}</SubmissionTime>
  </Header>
  <EmployeeData>
    <AMKA>${employeeData.amka}</AMKA>
    <AFM>${employeeData.afm}</AFM>
    <FirstName>${employeeData.firstName}</FirstName>
    <LastName>${employeeData.lastName}</LastName>
    <ContractId>${terminationRecord.contractId}</ContractId>
  </EmployeeData>
  <TerminationDetails>
    <TerminationType>${terminationRecord.terminationType}</TerminationType>
    <TerminationCause>${terminationRecord.terminationCause || 'NOT_SPECIFIED'}</TerminationCause>
    <EffectiveDate>${terminationRecord.effectiveDate.toISOString().split('T')[0]}</EffectiveDate>
    <NoticeDate>${terminationRecord.noticeDate?.toISOString().split('T')[0] || ''}</NoticeDate>
    <NoticePeriodDays>${terminationRecord.noticePeriodDays}</NoticePeriodDays>
    <SeveranceEligible>${terminationRecord.severanceEligible}</SeveranceEligible>
    <YearsOfService>${terminationRecord.yearsOfService}</YearsOfService>
    <LegalBasis>${terminationRecord.legalBasis}</LegalBasis>
  </TerminationDetails>
</TerminationEvent>`;

      const submissionMetadata = {
        eventId: `TERM_${terminationRecord.id}`,
        companyVat: employeeData.companyVat,
        employeeAmka: employeeData.amka,
        terminationType: terminationRecord.terminationType,
        eventDate: terminationRecord.effectiveDate,
        xmlHash: this.generateXmlHash(xmlPayload)
      };

      return {
        xmlPayload,
        eventCode,
        submissionMetadata
      };

    } catch (error) {
      console.error('Error generating ERGANI termination payload:', error);
      throw new Error('Failed to generate ERGANI II termination payload');
    }
  }

  /**
   * Generate dismissal letter (Greek legal template)
   */
  static generateDismissalLetter(
    terminationRecord: TerminationRecord,
    employeeData: any,
    severanceCalculation?: SeveranceCalculation
  ): { letterGr: string; letterEn: string } {
    
    const letterGr = `
ΚΑΤΑΓΓΕΛΙΑ ΣΥΜΒΑΣΗΣ ΕΡΓΑΣΙΑΣ

Προς: ${employeeData.fullName}
ΑΜΚΑ: ${employeeData.amka}

Αθήνα, ${new Date().toLocaleDateString('el-GR')}

ΘΕΜΑ: Καταγγελία σύμβασης εργασίας

Σας γνωστοποιούμε ότι η εργασιακή σας σχέση με την εταιρεία μας καταγγέλλεται 
και παύει οριστικά την ${terminationRecord.effectiveDate.toLocaleDateString('el-GR')}.

Λόγος καταγγελίας: ${this.getTerminationCauseGr(terminationRecord.terminationCause || undefined)}

Νομικό πλαίσιο: ${terminationRecord.legalBasis}

${terminationRecord.severanceEligible ? 
  `Δικαιούστε αποζημίωση απόλυσης σύμφωνα με τις διατάξεις του Ν. 4093/2012.
   
Υπολογισμός αποζημίωσης:
- Έτη υπηρεσίας: ${terminationRecord.yearsOfService}
- Βάση υπολογισμού: Τελευταίος μηνιαίος μισθός
${severanceCalculation ? `- Ποσό αποζημίωσης: €${severanceCalculation.severanceAmount}` : ''}` 
  : 'Δεν προβλέπεται αποζημίωση για τον συγκεκριμένο τύπο καταγγελίας.'
}

Παρακαλούμε επικοινωνήστε με το Τμήμα Μισθοδοσίας για την εκκαθάριση 
των τελικών σας αποδοχών.

Με εκτίμηση,

[Υπογραφή Εργοδότη]
[Σφραγίδα Εταιρείας]

---
Η παρούσα καταγγελία υποβάλλεται στο ΕΡΓΑΝΗ ΙΙ σύμφωνα με τις κείμενες διατάξεις.
    `;

    const letterEn = `
EMPLOYMENT CONTRACT TERMINATION NOTICE

To: ${employeeData.fullName}
Social Security No. (AMKA): ${employeeData.amka}

Athens, ${new Date().toLocaleDateString('en-US')}

SUBJECT: Employment contract termination

We hereby notify you that your employment relationship with our company 
is terminated and ceases definitively on ${terminationRecord.effectiveDate.toLocaleDateString('en-US')}.

Reason for termination: ${this.getTerminationCauseEn(terminationRecord.terminationCause || undefined)}

Legal basis: Greek Labor Law 4093/2012

${terminationRecord.severanceEligible ? 
  `You are entitled to severance payment according to the provisions of Law 4093/2012.
   
Severance calculation:
- Years of service: ${terminationRecord.yearsOfService}
- Calculation basis: Last monthly salary
${severanceCalculation ? `- Severance amount: €${severanceCalculation.severanceAmount}` : ''}` 
  : 'No severance payment is provided for this type of termination.'
}

Please contact the Payroll Department for the settlement of your final pay.

Respectfully,

[Employer Signature]
[Company Seal]

---
This termination is filed with ERGANI II in accordance with current legislation.
    `;

    return {
      letterGr: letterGr.trim(),
      letterEn: letterEn.trim()
    };
  }

  /**
   * Generate resignation acknowledgment letter
   */
  static generateResignationLetter(
    terminationRecord: TerminationRecord,
    employeeData: any
  ): { letterGr: string; letterEn: string } {
    
    const letterGr = `
ΑΠΟΔΟΧΗ ΠΑΡΑΙΤΗΣΗΣ

Προς: ${employeeData.fullName}
ΑΜΚΑ: ${employeeData.amka}

Αθήνα, ${new Date().toLocaleDateString('el-GR')}

ΘΕΜΑ: Αποδοχή παραίτησης

Με την παρούσα αποδεχόμαστε την παραίτησή σας από την εργασιακή σας 
θέση στην εταιρεία μας.

Ημερομηνία έναρξης παραίτησης: ${terminationRecord.noticeDate?.toLocaleDateString('el-GR') || 'Μη καθορισμένη'}
Ημερομηνία λήξης εργασιακής σχέσης: ${terminationRecord.effectiveDate.toLocaleDateString('el-GR')}

Περίοδος προειδοποίησης: ${terminationRecord.noticePeriodDays} ημέρες

Παρακαλούμε προσέλθετε στο Τμήμα Ανθρωπίνων Πόρων για:
- Παράδοση εταιρικού εξοπλισμού
- Εκκαθάριση τελικών αποδοχών
- Παραλαβή βεβαίωσης εργασίας

Σας ευχαριστούμε για την προσφορά σας στην εταιρεία.

Με εκτίμηση,

[Υπογραφή Εργοδότη]
[Σφραγίδα Εταιρείας]
    `;

    const letterEn = `
RESIGNATION ACCEPTANCE

To: ${employeeData.fullName}
Social Security No. (AMKA): ${employeeData.amka}

Athens, ${new Date().toLocaleDateString('en-US')}

SUBJECT: Resignation acceptance

We hereby accept your resignation from your employment position 
with our company.

Resignation notice date: ${terminationRecord.noticeDate?.toLocaleDateString('en-US') || 'Not specified'}
Employment termination date: ${terminationRecord.effectiveDate.toLocaleDateString('en-US')}

Notice period: ${terminationRecord.noticePeriodDays} days

Please visit the Human Resources Department for:
- Return of company equipment
- Final pay settlement
- Collection of employment certificate

We thank you for your contribution to the company.

Respectfully,

[Employer Signature]
[Company Seal]
    `;

    return {
      letterGr: letterGr.trim(),
      letterEn: letterEn.trim()
    };
  }

  /**
   * Generate contract expiry notification
   */
  static generateExpiryLetter(
    terminationRecord: TerminationRecord,
    employeeData: any
  ): { letterGr: string; letterEn: string } {
    
    const letterGr = `
ΕΙΔΟΠΟΙΗΣΗ ΛΗΞΗΣ ΣΥΜΒΑΣΗΣ

Προς: ${employeeData.fullName}
ΑΜΚΑ: ${employeeData.amka}

Αθήνα, ${new Date().toLocaleDateString('el-GR')}

ΘΕΜΑ: Λήξη σύμβασης εργασίας ορισμένου χρόνου

Σας ενημερώνουμε ότι η σύμβαση εργασίας ορισμένου χρόνου που έχετε 
υπογράψει με την εταιρεία μας λήγει την ${terminationRecord.effectiveDate.toLocaleDateString('el-GR')}.

Η λήξη της σύμβασης γίνεται σύμφωνα με τους όρους που έχουν συμφωνηθεί 
κατά την υπογραφή της.

${terminationRecord.severanceEligible ? 
  'Σύμφωνα με την ισχύουσα νομοθεσία, δικαιούστε αποζημίωση για τη λήξη της σύμβασης.' 
  : 'Δεν προβλέπεται αποζημίωση για τη φυσιολογική λήξη σύμβασης ορισμένου χρόνου.'
}

Παρακαλούμε επικοινωνήστε με το Τμήμα Μισθοδοσίας για την εκκαθάριση 
των τελικών σας αποδοχών.

Σας ευχαριστούμε για τη συνεργασία.

Με εκτίμηση,

[Υπογραφή Εργοδότη]
[Σφραγίδα Εταιρείας]
    `;

    const letterEn = `
CONTRACT EXPIRY NOTIFICATION

To: ${employeeData.fullName}
Social Security No. (AMKA): ${employeeData.amka}

Athens, ${new Date().toLocaleDateString('en-US')}

SUBJECT: Fixed-term employment contract expiry

We inform you that the fixed-term employment contract you have signed 
with our company expires on ${terminationRecord.effectiveDate.toLocaleDateString('en-US')}.

The contract expiry occurs according to the terms agreed upon 
at the time of signing.

${terminationRecord.severanceEligible ? 
  'According to current legislation, you are entitled to compensation for contract expiry.' 
  : 'No compensation is provided for the natural expiry of fixed-term contracts.'
}

Please contact the Payroll Department for the settlement of your final pay.

We thank you for your cooperation.

Respectfully,

[Employer Signature]
[Company Seal]
    `;

    return {
      letterGr: letterGr.trim(),
      letterEn: letterEn.trim()
    };
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Get ERGANI II event code for termination type
   */
  private static getErganiEventCode(terminationType: string): string {
    const eventCodes = {
      'dismissal': 'TERM_DISMISSAL',
      'resignation': 'TERM_RESIGNATION', 
      'expiry': 'TERM_CONTRACT_EXPIRY',
      'mutual_agreement': 'TERM_MUTUAL_AGREEMENT'
    };
    
    return eventCodes[terminationType as keyof typeof eventCodes] || 'TERM_OTHER';
  }

  /**
   * Get termination cause in Greek
   */
  private static getTerminationCauseGr(cause?: string): string {
    const causes = {
      'RESTRUCTURING': 'Αναδιάρθρωση επιχείρησης',
      'ECONOMIC_REASONS': 'Οικονομικοί λόγοι',
      'PERFORMANCE': 'Ανεπαρκής απόδοση',
      'MISCONDUCT': 'Παράβαση καθηκόντων',
      'SERIOUS_MISCONDUCT': 'Σοβαρή παράβαση καθηκόντων',
      'CRIMINAL_ACTIVITY': 'Εγκληματική δραστηριότητα',
      'BREACH_OF_TRUST': 'Παραβίαση εμπιστοσύνης',
      'ABANDONMENT': 'Εγκατάλειψη εργασίας',
      'PERSONAL_REASONS': 'Προσωπικοί λόγοι',
      'HEALTH_REASONS': 'Λόγοι υγείας'
    };
    
    return causes[cause as keyof typeof causes] || 'Μη καθορισμένος λόγος';
  }

  /**
   * Get termination cause in English
   */
  private static getTerminationCauseEn(cause?: string): string {
    const causes = {
      'RESTRUCTURING': 'Company restructuring',
      'ECONOMIC_REASONS': 'Economic reasons',
      'PERFORMANCE': 'Inadequate performance',
      'MISCONDUCT': 'Misconduct',
      'SERIOUS_MISCONDUCT': 'Serious misconduct',
      'CRIMINAL_ACTIVITY': 'Criminal activity',
      'BREACH_OF_TRUST': 'Breach of trust',
      'ABANDONMENT': 'Job abandonment',
      'PERSONAL_REASONS': 'Personal reasons',
      'HEALTH_REASONS': 'Health reasons'
    };
    
    return causes[cause as keyof typeof causes] || 'Unspecified reason';
  }

  /**
   * Generate XML hash for integrity verification
   */
  private static generateXmlHash(xmlPayload: string): string {
    // In production, use proper cryptographic hash
    return Buffer.from(xmlPayload).toString('base64').substring(0, 32);
  }
}