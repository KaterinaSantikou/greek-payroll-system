/**
 * Greek Payroll Events Service
 * 
 * Handles specialized Greek payroll events:
 * 1. Sick Leave beyond first 3 days (50% employer, EFKA reimbursement)
 * 2. Maternity/Paternity/Parental Leave (EFKA + OAED subsidies)
 * 3. Unpaid Leave (contract active, no EFKA contributions)
 * 4. Severance/Termination (Law 4093/2012) with prorata bonuses
 */

interface SickLeaveCalculation {
  totalDays: number;
  employerPaidDays: number;
  efkaReimbursedDays: number;
  employerAmount: number; // 50% for first 3 days
  efkaAmount: number; // From day 4 onward
  isTaxable: boolean;
  isInsurable: boolean;
  efkaReimbursementCode: string;
}

interface MaternityLeaveCalculation {
  totalDays: number;
  employerPaidDays: number;
  efkaSubsidyDays: number;
  oaedSubsidyDays: number;
  employerAmount: number;
  efkaAmount: number;
  oaedAmount: number;
  isTaxable: boolean;
  apdReportingRequired: boolean;
}

interface UnpaidLeaveCalculation {
  totalDays: number;
  grossPay: number; // Always 0
  netPay: number; // Always 0
  efkaContributions: number; // Always 0
  contractActive: boolean; // Always true
  erganiReportingRequired: boolean;
}

interface SeveranceCalculation {
  yearsOfService: number;
  monthsOfService: number;
  severanceAmount: number;
  noticeAmount: number;
  christmasBonus: number;
  easterBonus: number;
  vacationBonus: number;
  totalAmount: number;
  taxableAmount: number;
  taxFreeAmount: number;
  legalBasis: string;
}

interface TerminationDetails {
  terminationDate: Date;
  hireDate: Date;
  terminationType: 'with_notice' | 'without_notice' | 'mutual' | 'resignation';
  monthlySalary: number;
  lastPayDate: Date;
  hasUnusedVacation: boolean;
  unusedVacationDays?: number;
}

export class GreekPayrollEventsService {
  private static readonly SICK_LEAVE_EMPLOYER_RATE = 0.50; // 50% for first 3 days
  private static readonly SICK_LEAVE_EMPLOYER_DAYS = 3; // First 3 days paid by employer
  private static readonly MINIMUM_WAGE_2025 = 830; // €830 gross/month
  private static readonly SEVERANCE_TAX_FREE_THRESHOLD = 40000; // €40,000 tax-free for severance

  /**
   * Calculate sick leave payments per Greek law
   * Employer pays 50% for first 3 days, EFKA reimburses from day 4
   */
  calculateSickLeave(
    totalDays: number,
    dailySalary: number,
    employeeAge: number = 25
  ): SickLeaveCalculation {
    const employerPaidDays = Math.min(totalDays, GreekPayrollEventsService.SICK_LEAVE_EMPLOYER_DAYS);
    const efkaReimbursedDays = Math.max(0, totalDays - GreekPayrollEventsService.SICK_LEAVE_EMPLOYER_DAYS);
    
    // Employer pays 50% for first 3 days
    const employerAmount = employerPaidDays * dailySalary * GreekPayrollEventsService.SICK_LEAVE_EMPLOYER_RATE;
    
    // EFKA pays sickness benefit from day 4 (not taxable, not contributory)
    const efkaAmount = efkaReimbursedDays * dailySalary * 0.60; // 60% of salary from EFKA
    
    return {
      totalDays,
      employerPaidDays,
      efkaReimbursedDays,
      employerAmount,
      efkaAmount,
      isTaxable: employerAmount > 0, // Only employer portion is taxable
      isInsurable: employerAmount > 0, // Only employer portion is insurable
      efkaReimbursementCode: 'SICK_EMP_50'
    };
  }

  /**
   * Calculate maternity/paternity/parental leave
   * Complex rules involving employer, EFKA, and OAED (ΔΥΠΑ) payments
   */
  calculateMaternityLeave(
    leaveType: 'maternity' | 'paternity' | 'parental',
    totalDays: number,
    dailySalary: number,
    employmentDurationMonths: number
  ): MaternityLeaveCalculation {
    let employerPaidDays = 0;
    let efkaSubsidyDays = 0;
    let oaedSubsidyDays = 0;

    switch (leaveType) {
      case 'maternity':
        // 119 days total (17 weeks)
        employerPaidDays = Math.min(totalDays, 56); // 8 weeks employer
        efkaSubsidyDays = Math.max(0, Math.min(totalDays - 56, 63)); // 9 weeks EFKA
        break;
        
      case 'paternity':
        // 14 days total
        employerPaidDays = Math.min(totalDays, 14); // All employer paid
        break;
        
      case 'parental':
        // Up to 4 months total
        if (employmentDurationMonths >= 12) {
          oaedSubsidyDays = Math.min(totalDays, 120); // 4 months OAED (ΔΥΠΑ)
        }
        break;
    }

    const employerAmount = employerPaidDays * dailySalary;
    const efkaAmount = efkaSubsidyDays * dailySalary * 0.60; // 60% from EFKA
    const oaedAmount = oaedSubsidyDays * dailySalary * 0.40; // 40% from OAED

    return {
      totalDays,
      employerPaidDays,
      efkaSubsidyDays,
      oaedSubsidyDays,
      employerAmount,
      efkaAmount,
      oaedAmount,
      isTaxable: employerAmount > 0, // Only employer portion is taxable
      apdReportingRequired: true // Must reflect in APD reporting
    };
  }

  /**
   * Calculate unpaid leave (Άδεια άνευ αποδοχών)
   * Zero gross/net, contract active, EFKA contributions pause
   */
  calculateUnpaidLeave(totalDays: number): UnpaidLeaveCalculation {
    return {
      totalDays,
      grossPay: 0,
      netPay: 0,
      efkaContributions: 0,
      contractActive: true, // Contract remains active during unpaid leave
      erganiReportingRequired: true // Must report to ERGANI
    };
  }

  /**
   * Calculate severance and termination pay per Law 4093/2012
   * Includes prorata bonuses (δώρα Πάσχα/Χριστουγέννων/άδειας)
   */
  calculateSeverance(details: TerminationDetails): SeveranceCalculation {
    const serviceYears = this.calculateYearsOfService(details.hireDate, details.terminationDate);
    const serviceMonths = this.calculateMonthsOfService(details.hireDate, details.terminationDate);
    
    // Severance calculation per Law 4093/2012
    let severanceAmount = 0;
    
    if (details.terminationType === 'without_notice') {
      // Without notice: Additional compensation
      if (serviceYears <= 1) {
        severanceAmount = details.monthlySalary * 0.5; // Half month
      } else if (serviceYears <= 2) {
        severanceAmount = details.monthlySalary * 1; // One month
      } else if (serviceYears <= 5) {
        severanceAmount = details.monthlySalary * 2; // Two months
      } else if (serviceYears <= 10) {
        severanceAmount = details.monthlySalary * 3; // Three months
      } else if (serviceYears <= 15) {
        severanceAmount = details.monthlySalary * 4; // Four months
      } else if (serviceYears <= 20) {
        severanceAmount = details.monthlySalary * 5; // Five months
      } else {
        severanceAmount = details.monthlySalary * 6; // Six months
      }
    }

    // Notice period compensation
    let noticeAmount = 0;
    if (details.terminationType === 'without_notice') {
      if (serviceYears <= 1) {
        noticeAmount = details.monthlySalary * (1/12); // 1 month notice
      } else if (serviceYears <= 2) {
        noticeAmount = details.monthlySalary * (2/12); // 2 months notice
      } else {
        noticeAmount = details.monthlySalary * (3/12); // 3 months notice
      }
    }

    // Prorata bonuses calculation
    const { christmasBonus, easterBonus, vacationBonus } = this.calculateProrataBonus(
      details.hireDate,
      details.terminationDate,
      details.lastPayDate,
      details.monthlySalary
    );

    const totalAmount = severanceAmount + noticeAmount + christmasBonus + easterBonus + vacationBonus;
    
    // Tax treatment: First €40,000 is tax-free
    const taxFreeAmount = Math.min(totalAmount, GreekPayrollEventsService.SEVERANCE_TAX_FREE_THRESHOLD);
    const taxableAmount = Math.max(0, totalAmount - GreekPayrollEventsService.SEVERANCE_TAX_FREE_THRESHOLD);

    return {
      yearsOfService: serviceYears,
      monthsOfService: serviceMonths,
      severanceAmount,
      noticeAmount,
      christmasBonus,
      easterBonus,
      vacationBonus,
      totalAmount,
      taxableAmount,
      taxFreeAmount,
      legalBasis: 'Law 4093/2012 - Employment Protection'
    };
  }

  /**
   * Calculate prorata Christmas, Easter, and vacation bonuses
   */
  private calculateProrataBonus(
    hireDate: Date,
    terminationDate: Date,
    lastPayDate: Date,
    monthlySalary: number
  ): { christmasBonus: number; easterBonus: number; vacationBonus: number } {
    const currentYear = terminationDate.getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    
    // Days worked in current year until termination
    const daysWorked = Math.ceil((terminationDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    const totalDaysInYear = this.isLeapYear(currentYear) ? 366 : 365;
    
    // Prorata factor based on days worked
    const prorataFactor = daysWorked / totalDaysInYear;
    
    // Greek bonuses are typically 1/2 month salary each
    const fullBonusAmount = monthlySalary * 0.5;
    
    return {
      christmasBonus: fullBonusAmount * prorataFactor,
      easterBonus: fullBonusAmount * prorataFactor,
      vacationBonus: fullBonusAmount * prorataFactor
    };
  }

  /**
   * Get EFKA reimbursement details for sick leave
   */
  getEfkaReimbursementDetails(sickLeaveDays: number, dailySalary: number): {
    reimbursementAmount: number;
    reimbursementCode: string;
    applicationDeadline: Date;
    requiredDocuments: string[];
  } {
    const reimbursedDays = Math.max(0, sickLeaveDays - 3);
    const reimbursementAmount = reimbursedDays * dailySalary * 0.60;
    
    return {
      reimbursementAmount,
      reimbursementCode: 'EFKA_SICK_BENEFIT',
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      requiredDocuments: [
        'Medical certificate',
        'Employee sick leave application',
        'Employer confirmation of paid leave',
        'Payroll documentation'
      ]
    };
  }

  /**
   * Validate payroll event eligibility
   */
  validatePayrollEvent(
    eventType: 'sick_leave' | 'maternity_leave' | 'paternity_leave' | 'unpaid_leave' | 'severance',
    employeeData: any,
    eventDetails: any
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (eventType) {
      case 'sick_leave':
        if (!eventDetails.medicalCertificate) {
          errors.push('Medical certificate is required for sick leave');
        }
        if (eventDetails.totalDays > 30) {
          warnings.push('Extended sick leave may require additional documentation');
        }
        break;

      case 'maternity_leave':
        if (!employeeData.gender || employeeData.gender !== 'female') {
          errors.push('Maternity leave is only available for female employees');
        }
        if (eventDetails.totalDays > 119) {
          errors.push('Maternity leave cannot exceed 119 days (17 weeks)');
        }
        break;

      case 'paternity_leave':
        if (!employeeData.gender || employeeData.gender !== 'male') {
          errors.push('Paternity leave is only available for male employees');
        }
        if (eventDetails.totalDays > 14) {
          errors.push('Paternity leave cannot exceed 14 days');
        }
        break;

      case 'unpaid_leave':
        if (eventDetails.totalDays > 365) {
          warnings.push('Extended unpaid leave may affect employment status');
        }
        break;

      case 'severance':
        if (!eventDetails.terminationDate || !employeeData.hireDate) {
          errors.push('Hire date and termination date are required for severance calculation');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate years of service
   */
  private calculateYearsOfService(hireDate: Date, terminationDate: Date): number {
    const years = terminationDate.getFullYear() - hireDate.getFullYear();
    const months = terminationDate.getMonth() - hireDate.getMonth();
    const days = terminationDate.getDate() - hireDate.getDate();
    
    if (months < 0 || (months === 0 && days < 0)) {
      return years - 1;
    }
    return years;
  }

  /**
   * Calculate total months of service
   */
  private calculateMonthsOfService(hireDate: Date, terminationDate: Date): number {
    return (terminationDate.getFullYear() - hireDate.getFullYear()) * 12 + 
           (terminationDate.getMonth() - hireDate.getMonth());
  }

  /**
   * Check if year is leap year
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Get payroll event summary for reporting
   */
  getPayrollEventSummary(eventType: string, calculation: any): {
    eventType: string;
    description: string;
    legalBasis: string;
    taxImplications: string;
    reportingRequirements: string[];
  } {
    const summaries = {
      sick_leave: {
        description: 'Sick leave payment - 50% for first 3 days (employer), EFKA benefit from day 4',
        legalBasis: 'Greek Social Security Law',
        taxImplications: 'Employer portion taxable, EFKA benefit non-taxable',
        reportingRequirements: ['ERGANI submission', 'EFKA reimbursement application', 'APD reporting']
      },
      maternity_leave: {
        description: 'Maternity leave - 8 weeks employer, 9 weeks EFKA subsidy',
        legalBasis: 'Law 4808/2021 - Maternity Protection',
        taxImplications: 'Employer portion taxable, subsidies non-taxable',
        reportingRequirements: ['ERGANI submission', 'APD reporting', 'EFKA coordination', 'OAED coordination']
      },
      paternity_leave: {
        description: 'Paternity leave - 14 days employer paid',
        legalBasis: 'Law 4808/2021 - Family Support',
        taxImplications: 'Fully taxable as regular income',
        reportingRequirements: ['ERGANI submission', 'APD reporting']
      },
      unpaid_leave: {
        description: 'Unpaid leave - Zero pay, contract active, no EFKA contributions',
        legalBasis: 'Greek Labor Law',
        taxImplications: 'No tax implications (zero income)',
        reportingRequirements: ['ERGANI submission for leave period']
      },
      severance: {
        description: 'Termination severance with prorata bonuses',
        legalBasis: 'Law 4093/2012 - Employment Protection',
        taxImplications: 'First €40,000 tax-free, remainder taxable',
        reportingRequirements: ['Final payroll processing', 'ERGANI termination', 'APD final reporting']
      }
    };

    return {
      eventType,
      ...summaries[eventType as keyof typeof summaries] || {
        description: 'Unknown payroll event',
        legalBasis: 'N/A',
        taxImplications: 'Consult tax advisor',
        reportingRequirements: ['Standard payroll reporting']
      }
    };
  }
}

export const greekPayrollEventsService = new GreekPayrollEventsService();