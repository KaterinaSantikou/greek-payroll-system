import { nanoid } from "nanoid";
import { createHash } from "crypto";

/**
 * Annual Income Certificate (Βεβαίωση Αποδοχών) Generator
 * Generates annual employment and income certificates for employees and AADE
 */

export interface AnnualCertificate {
  certificateId: string;
  employeeAFM: string;
  employeeAMKA: string;
  employeeName: string;
  year: number;
  employmentPeriod: EmploymentPeriod;
  totalEarnings: AnnualEarnings;
  taxWithholdings: TaxWithholdings;
  socialSecurityContributions: SocialSecurityBreakdown;
  benefits: AnnualBenefits;
  companyInfo: CompanyInfo;
  certificationType: 'EMPLOYEE_COPY' | 'AADE_FILING' | 'BANK_REFERENCE' | 'COURT_SUBMISSION';
  issuedDate: Date;
  validUntil: Date;
  digitalSignature: string;
  qrCode: string;
  xmlContent?: string;
  pdfContent?: Buffer;
}

export interface EmploymentPeriod {
  startDate: Date;
  endDate?: Date;
  totalDaysWorked: number;
  employmentStatus: 'ACTIVE' | 'TERMINATED' | 'SUSPENDED';
  terminationReason?: string;
  jobTitle: string;
  department: string;
  contractType: 'FULL_TIME' | 'PART_TIME' | 'SEASONAL' | 'TEMPORARY';
}

export interface AnnualEarnings {
  basicSalary: number;
  overtime: number;
  bonuses: number;
  allowances: number;
  benefitsInKind: number;
  totalGrossEarnings: number;
  taxableEarnings: number;
  nonTaxableEarnings: number;
}

export interface TaxWithholdings {
  incomeTax: number;
  solidarityTax: number;
  specialTaxes: number;
  totalTaxWithheld: number;
  monthlyBreakdown: MonthlyTaxBreakdown[];
}

export interface MonthlyTaxBreakdown {
  month: number;
  grossEarnings: number;
  taxableEarnings: number;
  incomeTax: number;
  solidarityTax: number;
}

export interface SocialSecurityBreakdown {
  mainInsurance: number;
  auxiliaryInsurance: number;
  unemploymentFund: number;
  totalEmployeeContributions: number;
  totalEmployerContributions: number;
  contributableDays: number;
  efkaCategory: string;
}

export interface AnnualBenefits {
  mealVouchers: number;
  transportAllowance: number;
  accommodationBenefit: number;
  educationAllowance: number;
  healthInsurancePremium: number;
  otherBenefits: number;
  totalBenefits: number;
}

export interface CompanyInfo {
  name: string;
  afm: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  legalRepresentative: string;
  legalRepresentativeTitle: string;
}

export interface AADESubmissionPackage {
  submissionId: string;
  year: number;
  totalCertificates: number;
  totalEmployees: number;
  certificates: AnnualCertificate[];
  submissionDate: Date;
  xmlContent: string;
  checksum: string;
  aadeReceiptNumber?: string;
}

// Greek tax-free allowance for 2025
const TAX_FREE_ALLOWANCE = 3800; // €3,800 per year

// Standard benefits classifications
const BENEFIT_CLASSIFICATIONS = {
  'MEAL_VOUCHERS': { taxFree: true, dailyLimit: 11, annualLimit: 11 * 251 }, // Working days
  'TRANSPORT': { taxFree: true, monthlyLimit: 50 },
  'MOBILE_PHONE': { taxFree: true, monthlyLimit: 25 },
  'ACCOMMODATION': { taxFree: false },
  'COMPANY_CAR': { taxFree: false },
  'HEALTH_INSURANCE': { taxFree: true, annualLimit: 1000 }
};

class AnnualCertificateGenerator {
  private readonly companyInfo: CompanyInfo;

  constructor() {
    this.companyInfo = {
      name: process.env.COMPANY_NAME || 'PayrollSync Demo Company',
      afm: process.env.COMPANY_AFM || '123456789',
      address: process.env.COMPANY_ADDRESS || 'Λεωφ. Συγγρού 100',
      city: process.env.COMPANY_CITY || 'Αθήνα',
      postalCode: process.env.COMPANY_POSTAL || '11741',
      phone: process.env.COMPANY_PHONE || '+30 210 1234567',
      email: process.env.COMPANY_EMAIL || 'info@company.gr',
      legalRepresentative: process.env.LEGAL_REP || 'Νόμιμος Εκπρόσωπος',
      legalRepresentativeTitle: process.env.LEGAL_REP_TITLE || 'Διευθύνων Σύμβουλος'
    };
  }

  /**
   * Generate annual certificate for employee
   */
  async generateAnnualCertificate(
    employeeId: string,
    year: number,
    certificationType: 'EMPLOYEE_COPY' | 'AADE_FILING' | 'BANK_REFERENCE' | 'COURT_SUBMISSION' = 'EMPLOYEE_COPY'
  ): Promise<AnnualCertificate> {
    const certificateId = nanoid();
    
    // Get employee data
    const employeeData = await this.getEmployeeData(employeeId);
    
    // Get annual payroll data
    const payrollData = await this.getAnnualPayrollData(employeeId, year);
    
    // Calculate employment period
    const employmentPeriod = this.calculateEmploymentPeriod(employeeData, year);
    
    // Calculate total earnings
    const totalEarnings = this.calculateAnnualEarnings(payrollData);
    
    // Calculate tax withholdings
    const taxWithholdings = this.calculateTaxWithholdings(payrollData);
    
    // Calculate social security
    const socialSecurityContributions = this.calculateSocialSecurity(payrollData);
    
    // Calculate benefits
    const benefits = this.calculateAnnualBenefits(payrollData);
    
    // Generate QR code for verification
    const qrCode = this.generateQRCode(certificateId, employeeData.afm, year);
    
    // Generate digital signature
    const digitalSignature = this.generateDigitalSignature(
      certificateId, 
      totalEarnings, 
      taxWithholdings
    );

    const certificate: AnnualCertificate = {
      certificateId,
      employeeAFM: employeeData.afm,
      employeeAMKA: employeeData.amka,
      employeeName: employeeData.name,
      year,
      employmentPeriod,
      totalEarnings,
      taxWithholdings,
      socialSecurityContributions,
      benefits,
      companyInfo: this.companyInfo,
      certificationType,
      issuedDate: new Date(),
      validUntil: new Date(new Date().getFullYear() + 5, 11, 31), // 5-year validity
      digitalSignature,
      qrCode
    };

    // Generate XML content for AADE filing
    if (certificationType === 'AADE_FILING') {
      certificate.xmlContent = this.generateAADEXML(certificate);
    }

    // Generate PDF content
    certificate.pdfContent = await this.generateCertificatePDF(certificate);

    return certificate;
  }

  /**
   * Generate batch of certificates for AADE submission
   */
  async generateAADESubmissionPackage(
    employeeIds: string[],
    year: number
  ): Promise<AADESubmissionPackage> {
    const submissionId = nanoid();
    const certificates: AnnualCertificate[] = [];

    // Generate certificate for each employee
    for (const employeeId of employeeIds) {
      const certificate = await this.generateAnnualCertificate(employeeId, year, 'AADE_FILING');
      certificates.push(certificate);
    }

    // Generate batch XML
    const xmlContent = this.generateBatchXML(certificates, year);
    
    // Generate checksum
    const checksum = createHash('sha256').update(xmlContent).digest('hex');

    return {
      submissionId,
      year,
      totalCertificates: certificates.length,
      totalEmployees: employeeIds.length,
      certificates,
      submissionDate: new Date(),
      xmlContent,
      checksum
    };
  }

  /**
   * Calculate annual earnings breakdown
   */
  private calculateAnnualEarnings(payrollData: any[]): AnnualEarnings {
    const totals = payrollData.reduce((acc, month) => ({
      basicSalary: acc.basicSalary + month.basicSalary,
      overtime: acc.overtime + month.overtime,
      bonuses: acc.bonuses + month.bonuses,
      allowances: acc.allowances + month.allowances,
      benefitsInKind: acc.benefitsInKind + month.benefitsInKind
    }), {
      basicSalary: 0,
      overtime: 0,
      bonuses: 0,
      allowances: 0,
      benefitsInKind: 0
    });

    const totalGrossEarnings = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
    
    // Calculate taxable vs non-taxable earnings
    const taxableEarnings = Math.max(0, totalGrossEarnings - this.calculateNonTaxableAmount(payrollData));
    const nonTaxableEarnings = totalGrossEarnings - taxableEarnings;

    return {
      ...totals,
      totalGrossEarnings,
      taxableEarnings,
      nonTaxableEarnings
    };
  }

  /**
   * Calculate tax withholdings with monthly breakdown
   */
  private calculateTaxWithholdings(payrollData: any[]): TaxWithholdings {
    const monthlyBreakdown: MonthlyTaxBreakdown[] = payrollData.map((month, index) => ({
      month: index + 1,
      grossEarnings: month.grossEarnings,
      taxableEarnings: month.taxableEarnings,
      incomeTax: month.incomeTax,
      solidarityTax: month.solidarityTax
    }));

    const totals = payrollData.reduce((acc, month) => ({
      incomeTax: acc.incomeTax + month.incomeTax,
      solidarityTax: acc.solidarityTax + month.solidarityTax,
      specialTaxes: acc.specialTaxes + month.specialTaxes
    }), {
      incomeTax: 0,
      solidarityTax: 0,
      specialTaxes: 0
    });

    return {
      ...totals,
      totalTaxWithheld: totals.incomeTax + totals.solidarityTax + totals.specialTaxes,
      monthlyBreakdown
    };
  }

  /**
   * Calculate social security contributions
   */
  private calculateSocialSecurity(payrollData: any[]): SocialSecurityBreakdown {
    const totals = payrollData.reduce((acc, month) => ({
      mainInsurance: acc.mainInsurance + month.mainInsurance,
      auxiliaryInsurance: acc.auxiliaryInsurance + month.auxiliaryInsurance,
      unemploymentFund: acc.unemploymentFund + month.unemploymentFund,
      employerContributions: acc.employerContributions + month.employerContributions,
      contributableDays: acc.contributableDays + month.workingDays
    }), {
      mainInsurance: 0,
      auxiliaryInsurance: 0,
      unemploymentFund: 0,
      employerContributions: 0,
      contributableDays: 0
    });

    return {
      mainInsurance: totals.mainInsurance,
      auxiliaryInsurance: totals.auxiliaryInsurance,
      unemploymentFund: totals.unemploymentFund,
      totalEmployeeContributions: totals.mainInsurance + totals.auxiliaryInsurance + totals.unemploymentFund,
      totalEmployerContributions: totals.employerContributions,
      contributableDays: totals.contributableDays,
      efkaCategory: 'E1' // Standard employment category
    };
  }

  /**
   * Calculate annual benefits
   */
  private calculateAnnualBenefits(payrollData: any[]): AnnualBenefits {
    const totals = payrollData.reduce((acc, month) => ({
      mealVouchers: acc.mealVouchers + month.mealVouchers,
      transportAllowance: acc.transportAllowance + month.transportAllowance,
      accommodationBenefit: acc.accommodationBenefit + month.accommodationBenefit,
      educationAllowance: acc.educationAllowance + month.educationAllowance,
      healthInsurancePremium: acc.healthInsurancePremium + month.healthInsurancePremium,
      otherBenefits: acc.otherBenefits + month.otherBenefits
    }), {
      mealVouchers: 0,
      transportAllowance: 0,
      accommodationBenefit: 0,
      educationAllowance: 0,
      healthInsurancePremium: 0,
      otherBenefits: 0
    });

    const totalBenefits = Object.values(totals).reduce((sum, amount) => sum + amount, 0);

    return {
      ...totals,
      totalBenefits
    };
  }

  /**
   * Generate certificate PDF
   */
  private async generateCertificatePDF(certificate: AnnualCertificate): Promise<Buffer> {
    const pdfContent = `
ΒΕΒΑΙΩΣΗ ΑΠΟΔΟΧΩΝ ${certificate.year}
================================

${certificate.companyInfo.name}
ΑΦΜ: ${certificate.companyInfo.afm}
${certificate.companyInfo.address}
${certificate.companyInfo.city} ${certificate.companyInfo.postalCode}

ΣΤΟΙΧΕΙΑ ΕΡΓΑΖΟΜΕΝΟΥ
====================
Ονοματεπώνυμο: ${certificate.employeeName}
ΑΦΜ: ${certificate.employeeAFM}
ΑΜΚΑ: ${certificate.employeeAMKA}
Θέση Εργασίας: ${certificate.employmentPeriod.jobTitle}
Τμήμα: ${certificate.employmentPeriod.department}

ΠΕΡΙΟΔΟΣ ΑΠΑΣΧΟΛΗΣΗΣ ${certificate.year}
=======================================
Από: ${certificate.employmentPeriod.startDate.toLocaleDateString('el-GR')}
${certificate.employmentPeriod.endDate ? `Έως: ${certificate.employmentPeriod.endDate.toLocaleDateString('el-GR')}` : 'Έως: Συνεχίζεται'}
Ημέρες Εργασίας: ${certificate.employmentPeriod.totalDaysWorked}
Είδος Σύμβασης: ${certificate.employmentPeriod.contractType}

ΑΠΟΔΟΧΕΣ ${certificate.year}
============================
Βασικός Μισθός: €${certificate.totalEarnings.basicSalary.toFixed(2)}
Υπερωρίες: €${certificate.totalEarnings.overtime.toFixed(2)}
Δώρα/Επιδόματα: €${certificate.totalEarnings.bonuses.toFixed(2)}
Παροχές σε Είδος: €${certificate.totalEarnings.benefitsInKind.toFixed(2)}
ΣΥΝΟΛΙΚΕΣ ΜΙΚΤΕΣ ΑΠΟΔΟΧΕΣ: €${certificate.totalEarnings.totalGrossEarnings.toFixed(2)}

ΦΟΡΟΙ & ΚΡΑΤΗΣΕΙΣ
=================
Φόρος Εισοδήματος: €${certificate.taxWithholdings.incomeTax.toFixed(2)}
Φόρος Αλληλεγγύης: €${certificate.taxWithholdings.solidarityTax.toFixed(2)}
Σύνολο Φόρων: €${certificate.taxWithholdings.totalTaxWithheld.toFixed(2)}

ΑΣΦΑΛΙΣΤΙΚΕΣ ΕΙΣΦΟΡΕΣ
=====================
Κύρια Ασφάλιση: €${certificate.socialSecurityContributions.mainInsurance.toFixed(2)}
Επικουρική Ασφάλιση: €${certificate.socialSecurityContributions.auxiliaryInsurance.toFixed(2)}
Ταμείο Ανεργίας: €${certificate.socialSecurityContributions.unemploymentFund.toFixed(2)}
Σύνολο Εργατικών Εισφορών: €${certificate.socialSecurityContributions.totalEmployeeContributions.toFixed(2)}
Σύνολο Εργοδοτικών Εισφορών: €${certificate.socialSecurityContributions.totalEmployerContributions.toFixed(2)}

ΠΑΡΟΧΕΣ & ΕΠΙΔΟΜΑΤΑ
===================
Επιδόματα Σίτισης: €${certificate.benefits.mealVouchers.toFixed(2)}
Επιδόματα Μεταφοράς: €${certificate.benefits.transportAllowance.toFixed(2)}
Σύνολο Παροχών: €${certificate.benefits.totalBenefits.toFixed(2)}

ΣΤΟΙΧΕΙΑ ΒΕΒΑΙΩΣΗΣ
==================
Αριθμός Βεβαίωσης: ${certificate.certificateId}
Ημερομηνία Έκδοσης: ${certificate.issuedDate.toLocaleDateString('el-GR')}
Ισχύει έως: ${certificate.validUntil.toLocaleDateString('el-GR')}
Ψηφιακή Υπογραφή: ${certificate.digitalSignature}

${certificate.companyInfo.legalRepresentative}
${certificate.companyInfo.legalRepresentativeTitle}

QR Code: ${certificate.qrCode}
`;

    return Buffer.from(pdfContent, 'utf-8');
  }

  /**
   * Generate XML for AADE submission
   */
  private generateAADEXML(certificate: AnnualCertificate): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<IncomeCertificate xmlns="http://www.aade.gr/income-certificate">
  <Header>
    <CertificateId>${certificate.certificateId}</CertificateId>
    <Year>${certificate.year}</Year>
    <CompanyAFM>${certificate.companyInfo.afm}</CompanyAFM>
    <IssuedDate>${certificate.issuedDate.toISOString()}</IssuedDate>
  </Header>
  <Employee>
    <AFM>${certificate.employeeAFM}</AFM>
    <AMKA>${certificate.employeeAMKA}</AMKA>
    <Name><![CDATA[${certificate.employeeName}]]></Name>
  </Employee>
  <Employment>
    <StartDate>${certificate.employmentPeriod.startDate.toISOString().split('T')[0]}</StartDate>
    ${certificate.employmentPeriod.endDate ? `<EndDate>${certificate.employmentPeriod.endDate.toISOString().split('T')[0]}</EndDate>` : ''}
    <DaysWorked>${certificate.employmentPeriod.totalDaysWorked}</DaysWorked>
    <JobTitle><![CDATA[${certificate.employmentPeriod.jobTitle}]]></JobTitle>
    <ContractType>${certificate.employmentPeriod.contractType}</ContractType>
  </Employment>
  <Earnings>
    <BasicSalary>${certificate.totalEarnings.basicSalary.toFixed(2)}</BasicSalary>
    <Overtime>${certificate.totalEarnings.overtime.toFixed(2)}</Overtime>
    <Bonuses>${certificate.totalEarnings.bonuses.toFixed(2)}</Bonuses>
    <Allowances>${certificate.totalEarnings.allowances.toFixed(2)}</Allowances>
    <BenefitsInKind>${certificate.totalEarnings.benefitsInKind.toFixed(2)}</BenefitsInKind>
    <TotalGrossEarnings>${certificate.totalEarnings.totalGrossEarnings.toFixed(2)}</TotalGrossEarnings>
    <TaxableEarnings>${certificate.totalEarnings.taxableEarnings.toFixed(2)}</TaxableEarnings>
  </Earnings>
  <TaxWithholdings>
    <IncomeTax>${certificate.taxWithholdings.incomeTax.toFixed(2)}</IncomeTax>
    <SolidarityTax>${certificate.taxWithholdings.solidarityTax.toFixed(2)}</SolidarityTax>
    <TotalTaxWithheld>${certificate.taxWithholdings.totalTaxWithheld.toFixed(2)}</TotalTaxWithheld>
  </TaxWithholdings>
  <SocialSecurity>
    <EmployeeContributions>${certificate.socialSecurityContributions.totalEmployeeContributions.toFixed(2)}</EmployeeContributions>
    <EmployerContributions>${certificate.socialSecurityContributions.totalEmployerContributions.toFixed(2)}</EmployerContributions>
    <ContributableDays>${certificate.socialSecurityContributions.contributableDays}</ContributableDays>
  </SocialSecurity>
</IncomeCertificate>`;
  }

  /**
   * Generate batch XML for multiple certificates
   */
  private generateBatchXML(certificates: AnnualCertificate[], year: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<IncomeCertificateBatch xmlns="http://www.aade.gr/income-certificate-batch">
  <Header>
    <Year>${year}</Year>
    <CompanyAFM>${this.companyInfo.afm}</CompanyAFM>
    <TotalCertificates>${certificates.length}</TotalCertificates>
    <SubmissionDate>${new Date().toISOString()}</SubmissionDate>
  </Header>
  <Certificates>
${certificates.map(cert => cert.xmlContent).join('\n')}
  </Certificates>
</IncomeCertificateBatch>`;
  }

  // Helper methods (simplified implementations)
  private async getEmployeeData(employeeId: string) {
    return {
      afm: '123456789',
      amka: '12345678901',
      name: 'Demo Employee'
    };
  }

  private async getAnnualPayrollData(employeeId: string, year: number) {
    // Mock 12 months of payroll data
    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      basicSalary: 1000,
      overtime: 100,
      bonuses: i === 11 ? 1000 : 0, // Christmas bonus
      allowances: 200,
      benefitsInKind: 50,
      grossEarnings: 1350,
      taxableEarnings: 1300,
      incomeTax: 200,
      solidarityTax: 50,
      specialTaxes: 0,
      mainInsurance: 86.67,
      auxiliaryInsurance: 39,
      unemploymentFund: 6.76,
      employerContributions: 342.03,
      workingDays: 22,
      mealVouchers: 242, // 22 days * €11
      transportAllowance: 50,
      accommodationBenefit: 0,
      educationAllowance: 0,
      healthInsurancePremium: 0,
      otherBenefits: 0
    }));
  }

  private calculateEmploymentPeriod(employeeData: any, year: number): EmploymentPeriod {
    return {
      startDate: new Date(year, 0, 1),
      endDate: undefined,
      totalDaysWorked: 251, // Standard working days per year
      employmentStatus: 'ACTIVE',
      jobTitle: 'Hotel Staff',
      department: 'Operations',
      contractType: 'FULL_TIME'
    };
  }

  private calculateNonTaxableAmount(payrollData: any[]): number {
    // Calculate tax-free benefits (meal vouchers, transport allowance, etc.)
    return payrollData.reduce((sum, month) => {
      return sum + Math.min(month.mealVouchers, 11 * 22) + // €11/day limit
             Math.min(month.transportAllowance, 50); // €50/month limit
    }, 0);
  }

  private generateQRCode(certificateId: string, afm: string, year: number): string {
    const qrData = `${certificateId}:${afm}:${year}`;
    return btoa(qrData); // Simple base64 encoding - would use proper QR library
  }

  private generateDigitalSignature(
    certificateId: string,
    earnings: AnnualEarnings,
    taxes: TaxWithholdings
  ): string {
    const signatureData = `${certificateId}${earnings.totalGrossEarnings}${taxes.totalTaxWithheld}`;
    return createHash('sha256').update(signatureData).digest('hex').substring(0, 16).toUpperCase();
  }
}

export const annualCertificateGenerator = new AnnualCertificateGenerator();