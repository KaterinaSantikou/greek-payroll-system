/**
 * Bilingual Messages System
 * 
 * Comprehensive bilingual support for Greek/English labels, messages, and UI text
 * throughout the PayrollSync system. Supports dynamic language switching with
 * fallback to English if Greek translation is missing.
 */

export type SupportedLanguage = 'el' | 'en';
export type MessageKey = string;

export interface BilingualMessage {
  el: string; // Greek
  en: string; // English
}

export interface BilingualMessageMap {
  [key: string]: BilingualMessage | BilingualMessageMap;
}

/**
 * Core bilingual messages for the application
 */
export const BILINGUAL_MESSAGES: BilingualMessageMap = {
  // Common UI Actions
  actions: {
    save: { el: 'Αποθήκευση', en: 'Save' },
    cancel: { el: 'Ακύρωση', en: 'Cancel' },
    delete: { el: 'Διαγραφή', en: 'Delete' },
    edit: { el: 'Επεξεργασία', en: 'Edit' },
    view: { el: 'Προβολή', en: 'View' },
    add: { el: 'Προσθήκη', en: 'Add' },
    remove: { el: 'Αφαίρεση', en: 'Remove' },
    search: { el: 'Αναζήτηση', en: 'Search' },
    filter: { el: 'Φίλτρα', en: 'Filter' },
    export: { el: 'Εξαγωγή', en: 'Export' },
    import: { el: 'Εισαγωγή', en: 'Import' },
    print: { el: 'Εκτύπωση', en: 'Print' },
    close: { el: 'Κλείσιμο', en: 'Close' },
    submit: { el: 'Υποβολή', en: 'Submit' },
    reset: { el: 'Επαναφορά', en: 'Reset' },
    refresh: { el: 'Ανανέωση', en: 'Refresh' },
    upload: { el: 'Ανέβασμα', en: 'Upload' },
    download: { el: 'Κατέβασμα', en: 'Download' }
  },

  // Status Messages
  status: {
    loading: { el: 'Φόρτωση...', en: 'Loading...' },
    saving: { el: 'Αποθήκευση...', en: 'Saving...' },
    processing: { el: 'Επεξεργασία...', en: 'Processing...' },
    success: { el: 'Επιτυχία', en: 'Success' },
    error: { el: 'Σφάλμα', en: 'Error' },
    warning: { el: 'Προειδοποίηση', en: 'Warning' },
    info: { el: 'Πληροφορία', en: 'Information' },
    completed: { el: 'Ολοκληρώθηκε', en: 'Completed' },
    pending: { el: 'Εκκρεμεί', en: 'Pending' },
    failed: { el: 'Απέτυχε', en: 'Failed' },
    cancelled: { el: 'Ακυρώθηκε', en: 'Cancelled' }
  },

  // Employee Management
  employee: {
    employee: { el: 'Εργαζόμενος', en: 'Employee' },
    employees: { el: 'Εργαζόμενοι', en: 'Employees' },
    employeeId: { el: 'Κωδικός Εργαζομένου', en: 'Employee ID' },
    fullName: { el: 'Ονοματεπώνυμο', en: 'Full Name' },
    firstName: { el: 'Όνομα', en: 'First Name' },
    lastName: { el: 'Επώνυμο', en: 'Last Name' },
    email: { el: 'Email', en: 'Email' },
    phone: { el: 'Τηλέφωνο', en: 'Phone' },
    afm: { el: 'ΑΦΜ', en: 'Tax ID (AFM)' },
    amka: { el: 'ΑΜΚΑ', en: 'Social Security (AMKA)' },
    department: { el: 'Τμήμα', en: 'Department' },
    position: { el: 'Θέση', en: 'Position' },
    hireDate: { el: 'Ημερομηνία Πρόσληψης', en: 'Hire Date' },
    terminationDate: { el: 'Ημερομηνία Αποχώρησης', en: 'Termination Date' },
    active: { el: 'Ενεργός', en: 'Active' },
    inactive: { el: 'Ανενεργός', en: 'Inactive' }
  },

  // Contract & Employment
  contract: {
    contractType: { el: 'Τύπος Σύμβασης', en: 'Contract Type' },
    indefinite: { el: 'Αορίστου Χρόνου', en: 'Permanent' },
    fixedTerm: { el: 'Ορισμένου Χρόνου', en: 'Fixed-term' },
    seasonal: { el: 'Εποχιακή', en: 'Seasonal' },
    fullTime: { el: 'Πλήρης Απασχόληση', en: 'Full-time' },
    partTime: { el: 'Μερική Απασχόληση', en: 'Part-time' },
    probation: { el: 'Δοκιμαστική Περίοδος', en: 'Probation Period' },
    workingHours: { el: 'Ώρες Εργασίας', en: 'Working Hours' },
    salary: { el: 'Μισθός', en: 'Salary' },
    hourlyRate: { el: 'Ωριαία Αμοιβή', en: 'Hourly Rate' }
  },

  // Payroll Processing
  payroll: {
    payroll: { el: 'Μισθοδοσία', en: 'Payroll' },
    payslip: { el: 'Μισθοδοτικό', en: 'Payslip' },
    payPeriod: { el: 'Περίοδος Μισθοδοσίας', en: 'Pay Period' },
    grossPay: { el: 'Μικτές Αποδοχές', en: 'Gross Pay' },
    netPay: { el: 'Καθαρές Αποδοχές', en: 'Net Pay' },
    baseSalary: { el: 'Βασικός Μισθός', en: 'Base Salary' },
    regularPay: { el: 'Τακτικές Αποδοχές', en: 'Regular Pay' },
    overtime: { el: 'Υπερωρίες', en: 'Overtime' },
    nightShift: { el: 'Νυχτερινό', en: 'Night Shift' },
    sundayWork: { el: 'Κυριακάτικο', en: 'Sunday Work' },
    holidayWork: { el: 'Εργασία σε Αργίες', en: 'Holiday Work' },
    allowances: { el: 'Επιδόματα', en: 'Allowances' },
    bonuses: { el: 'Μπόνους', en: 'Bonuses' },
    deductions: { el: 'Κρατήσεις', en: 'Deductions' },
    totalCost: { el: 'Συνολικό Κόστος', en: 'Total Cost' }
  },

  // Greek Bonuses (Δώρα)
  bonuses: {
    christmasBonus: { el: 'Δώρο Χριστουγέννων', en: 'Christmas Bonus' },
    easterBonus: { el: 'Δώρο Πάσχα', en: 'Easter Bonus' },
    vacationBonus: { el: 'Επίδομα Αδείας', en: 'Vacation Bonus' },
    thirteenthSalary: { el: '13ος Μισθός', en: '13th Salary' },
    fourteenthSalary: { el: '14ος Μισθός', en: '14th Salary' }
  },

  // Allowances
  allowances: {
    foodAllowance: { el: 'Επίδομα Σίτισης', en: 'Food Allowance' },
    transportAllowance: { el: 'Επίδομα Μεταφοράς', en: 'Transport Allowance' },
    housingAllowance: { el: 'Επίδομα Στέγασης', en: 'Housing Allowance' },
    marriageAllowance: { el: 'Επίδομα Γάμου', en: 'Marriage Allowance' },
    familyAllowance: { el: 'Οικογενειακό Επίδομα', en: 'Family Allowance' },
    educationAllowance: { el: 'Επίδομα Εκπαίδευσης', en: 'Education Allowance' },
    experienceAllowance: { el: 'Επίδομα Προϋπηρεσίας', en: 'Experience Allowance' },
    positionAllowance: { el: 'Επίδομα Θέσης', en: 'Position Allowance' }
  },

  // Tax & Insurance
  tax: {
    incomeTax: { el: 'Φόρος Εισοδήματος', en: 'Income Tax' },
    solidarityTax: { el: 'Τέλος Αλληλεγγύης', en: 'Solidarity Tax' },
    efka: { el: 'ΕΦΚΑ', en: 'Social Security (EFKA)' },
    efkaEmployee: { el: 'Εργαζόμενος ΕΦΚΑ', en: 'Employee EFKA' },
    efkaEmployer: { el: 'Εργοδότης ΕΦΚΑ', en: 'Employer EFKA' },
    unemployment: { el: 'Ανεργία', en: 'Unemployment' },
    sickness: { el: 'Ασθένεια', en: 'Sickness' },
    workAccident: { el: 'Εργατικό Ατύχημα', en: 'Work Accident' },
    taxBracket: { el: 'Φορολογικό Κλιμάκιο', en: 'Tax Bracket' },
    taxRate: { el: 'Φορολογικός Συντελεστής', en: 'Tax Rate' }
  },

  // Time & Attendance
  time: {
    workingHours: { el: 'Ώρες Εργασίας', en: 'Working Hours' },
    regularHours: { el: 'Κανονικές Ώρες', en: 'Regular Hours' },
    overtimeHours: { el: 'Ώρες Υπερωρίας', en: 'Overtime Hours' },
    nightHours: { el: 'Νυχτερινές Ώρες', en: 'Night Hours' },
    sundayHours: { el: 'Κυριακάτικες Ώρες', en: 'Sunday Hours' },
    holidayHours: { el: 'Ώρες Αργιών', en: 'Holiday Hours' },
    absenceHours: { el: 'Ώρες Απουσίας', en: 'Absence Hours' },
    leaveHours: { el: 'Ώρες Άδειας', en: 'Leave Hours' },
    hoursWorked: { el: 'Ώρες που Εργάστηκε', en: 'Hours Worked' },
    totalHours: { el: 'Συνολικές Ώρες', en: 'Total Hours' }
  },

  // Leave Management
  leave: {
    leave: { el: 'Άδεια', en: 'Leave' },
    annualLeave: { el: 'Κανονική Άδεια', en: 'Annual Leave' },
    sickLeave: { el: 'Άδεια Ασθενείας', en: 'Sick Leave' },
    maternityLeave: { el: 'Άδεια Μητρότητας', en: 'Maternity Leave' },
    paternityLeave: { el: 'Άδεια Πατρότητας', en: 'Paternity Leave' },
    specialLeave: { el: 'Ειδική Άδεια', en: 'Special Leave' },
    unpaidLeave: { el: 'Άδεια Άνευ Αποδοχών', en: 'Unpaid Leave' },
    leaveBalance: { el: 'Υπόλοιπο Άδειας', en: 'Leave Balance' },
    leaveEntitlement: { el: 'Δικαίωμα Άδειας', en: 'Leave Entitlement' }
  },

  // Date & Time
  dateTime: {
    date: { el: 'Ημερομηνία', en: 'Date' },
    time: { el: 'Ώρα', en: 'Time' },
    period: { el: 'Περίοδος', en: 'Period' },
    startDate: { el: 'Ημερομηνία Έναρξης', en: 'Start Date' },
    endDate: { el: 'Ημερομηνία Λήξης', en: 'End Date' },
    today: { el: 'Σήμερα', en: 'Today' },
    yesterday: { el: 'Χθες', en: 'Yesterday' },
    tomorrow: { el: 'Αύριο', en: 'Tomorrow' },
    thisWeek: { el: 'Αυτή την Εβδομάδα', en: 'This Week' },
    thisMonth: { el: 'Αυτόν τον Μήνα', en: 'This Month' },
    thisYear: { el: 'Φέτος', en: 'This Year' }
  },

  // Greek Months
  months: {
    january: { el: 'Ιανουάριος', en: 'January' },
    february: { el: 'Φεβρουάριος', en: 'February' },
    march: { el: 'Μάρτιος', en: 'March' },
    april: { el: 'Απρίλιος', en: 'April' },
    may: { el: 'Μάιος', en: 'May' },
    june: { el: 'Ιούνιος', en: 'June' },
    july: { el: 'Ιούλιος', en: 'July' },
    august: { el: 'Αύγουστος', en: 'August' },
    september: { el: 'Σεπτέμβριος', en: 'September' },
    october: { el: 'Οκτώβριος', en: 'October' },
    november: { el: 'Νοέμβριος', en: 'November' },
    december: { el: 'Δεκέμβριος', en: 'December' }
  },

  // Greek Days
  days: {
    monday: { el: 'Δευτέρα', en: 'Monday' },
    tuesday: { el: 'Τρίτη', en: 'Tuesday' },
    wednesday: { el: 'Τετάρτη', en: 'Wednesday' },
    thursday: { el: 'Πέμπτη', en: 'Thursday' },
    friday: { el: 'Παρασκευή', en: 'Friday' },
    saturday: { el: 'Σάββατο', en: 'Saturday' },
    sunday: { el: 'Κυριακή', en: 'Sunday' }
  },

  // Form Validation
  validation: {
    required: { el: 'Αυτό το πεδίο είναι υποχρεωτικό', en: 'This field is required' },
    invalidEmail: { el: 'Παρακαλώ εισάγετε έγκυρη διεύθυνση email', en: 'Please enter a valid email address' },
    invalidPhone: { el: 'Παρακαλώ εισάγετε έγκυρο τηλέφωνο', en: 'Please enter a valid phone number' },
    invalidDate: { el: 'Παρακαλώ εισάγετε έγκυρη ημερομηνία (DD/MM/YYYY)', en: 'Please enter a valid date (DD/MM/YYYY)' },
    invalidNumber: { el: 'Παρακαλώ εισάγετε έγκυρο αριθμό', en: 'Please enter a valid number' },
    invalidCurrency: { el: 'Παρακαλώ εισάγετε έγκυρο ποσό (π.χ. 1.234,56)', en: 'Please enter a valid amount (e.g. 1,234.56)' },
    invalidAFM: { el: 'Παρακαλώ εισάγετε έγκυρο ΑΦΜ (9 ψηφία)', en: 'Please enter a valid AFM (9 digits)' },
    invalidAMKA: { el: 'Παρακαλώ εισάγετε έγκυρο ΑΜΚΑ (11 ψηφία)', en: 'Please enter a valid AMKA (11 digits)' },
    futureDate: { el: 'Η ημερομηνία δεν μπορεί να είναι στο μέλλον', en: 'Date cannot be in the future' },
    pastDate: { el: 'Η ημερομηνία δεν μπορεί να είναι στο παρελθόν', en: 'Date cannot be in the past' },
    minValue: { el: 'Η ελάχιστη τιμή είναι', en: 'Minimum value is' },
    maxValue: { el: 'Η μέγιστη τιμή είναι', en: 'Maximum value is' },
    minLength: { el: 'Ελάχιστο μήκος:', en: 'Minimum length:' },
    maxLength: { el: 'Μέγιστο μήκος:', en: 'Maximum length:' }
  },

  // Reports & Analytics
  reports: {
    reports: { el: 'Αναφορές', en: 'Reports' },
    analytics: { el: 'Αναλύσεις', en: 'Analytics' },
    payrollReport: { el: 'Αναφορά Μισθοδοσίας', en: 'Payroll Report' },
    summaryReport: { el: 'Συνοπτική Αναφορά', en: 'Summary Report' },
    detailedReport: { el: 'Αναλυτική Αναφορά', en: 'Detailed Report' },
    exportToExcel: { el: 'Εξαγωγή σε Excel', en: 'Export to Excel' },
    exportToPDF: { el: 'Εξαγωγή σε PDF', en: 'Export to PDF' },
    generateReport: { el: 'Δημιουργία Αναφοράς', en: 'Generate Report' }
  },

  // Government & Compliance
  government: {
    ergani: { el: 'ΕΡΓΑΝΗ', en: 'ERGANI' },
    efka: { el: 'e-ΕΦΚΑ', en: 'e-EFKA' },
    aade: { el: 'ΑΑΔΕ', en: 'AADE' },
    submission: { el: 'Υποβολή', en: 'Submission' },
    compliance: { el: 'Συμμόρφωση', en: 'Compliance' },
    filing: { el: 'Δήλωση', en: 'Filing' },
    digitalCard: { el: 'Ψηφιακή Κάρτα Εργασίας', en: 'Digital Work Card' },
    clockIn: { el: 'Έναρξη Εργασίας', en: 'Clock In' },
    clockOut: { el: 'Λήξη Εργασίας', en: 'Clock Out' }
  },

  // Navigation & Menu
  navigation: {
    dashboard: { el: 'Πίνακας Ελέγχου', en: 'Dashboard' },
    employees: { el: 'Εργαζόμενοι', en: 'Employees' },
    payroll: { el: 'Μισθοδοσία', en: 'Payroll' },
    timeAttendance: { el: 'Χρόνος & Παρουσία', en: 'Time & Attendance' },
    leaves: { el: 'Άδειες', en: 'Leaves' },
    reports: { el: 'Αναφορές', en: 'Reports' },
    settings: { el: 'Ρυθμίσεις', en: 'Settings' },
    profile: { el: 'Προφίλ', en: 'Profile' },
    logout: { el: 'Αποσύνδεση', en: 'Logout' },
    help: { el: 'Βοήθεια', en: 'Help' }
  },

  // System Messages
  system: {
    noData: { el: 'Δεν υπάρχουν δεδομένα', en: 'No data available' },
    noResults: { el: 'Δεν βρέθηκαν αποτελέσματα', en: 'No results found' },
    dataLoaded: { el: 'Δεδομένα φορτώθηκαν επιτυχώς', en: 'Data loaded successfully' },
    operationComplete: { el: 'Η λειτουργία ολοκληρώθηκε', en: 'Operation completed' },
    pleaseWait: { el: 'Παρακαλώ περιμένετε', en: 'Please wait' },
    areYouSure: { el: 'Είστε σίγουροι;', en: 'Are you sure?' },
    confirmDelete: { el: 'Επιβεβαιώστε τη διαγραφή', en: 'Confirm deletion' },
    unsavedChanges: { el: 'Μη αποθηκευμένες αλλαγές', en: 'Unsaved changes' },
    sessionExpired: { el: 'Η συνεδρία έληξε', en: 'Session expired' },
    accessDenied: { el: 'Δεν επιτρέπεται η πρόσβαση', en: 'Access denied' }
  }
};

/**
 * Bilingual Message Manager
 */
export class BilingualMessageManager {
  private currentLanguage: SupportedLanguage = 'el'; // Default to Greek
  
  constructor(initialLanguage: SupportedLanguage = 'el') {
    this.currentLanguage = initialLanguage;
  }

  /**
   * Set the current language
   */
  setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
  }

  /**
   * Get the current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Get a message in the current language
   */
  getMessage(keyPath: string): string {
    return this.getMessageInLanguage(keyPath, this.currentLanguage);
  }

  /**
   * Get a message in a specific language
   */
  getMessageInLanguage(keyPath: string, language: SupportedLanguage): string {
    const keys = keyPath.split('.');
    let current: any = BILINGUAL_MESSAGES;
    
    // Navigate through nested keys
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Key not found, return key path as fallback
        return keyPath;
      }
    }
    
    // Check if we have a bilingual message
    if (current && typeof current === 'object' && language in current) {
      return current[language];
    }
    
    // Fallback to English if Greek is not available
    if (language === 'el' && current && typeof current === 'object' && 'en' in current) {
      return current.en;
    }
    
    // Last resort: return the key path
    return keyPath;
  }

  /**
   * Get both Greek and English versions of a message
   */
  getBilingualMessage(keyPath: string): BilingualMessage {
    return {
      el: this.getMessageInLanguage(keyPath, 'el'),
      en: this.getMessageInLanguage(keyPath, 'en')
    };
  }

  /**
   * Format a message with parameters
   */
  getFormattedMessage(keyPath: string, params: Record<string, any> = {}): string {
    let message = this.getMessage(keyPath);
    
    // Replace placeholders like {name}, {value}, etc.
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });
    
    return message;
  }

  /**
   * Get validation message with dynamic values
   */
  getValidationMessage(type: string, value?: any): string {
    const baseKey = `validation.${type}`;
    const message = this.getMessage(baseKey);
    
    if (value !== undefined) {
      // For messages like "Minimum value is {value}"
      return `${message} ${value}`;
    }
    
    return message;
  }

  /**
   * Get all messages for a category
   */
  getCategoryMessages(category: string): Record<string, string> {
    const keys = category.split('.');
    let current: any = BILINGUAL_MESSAGES;
    
    // Navigate to category
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return {};
      }
    }
    
    const result: Record<string, string> = {};
    
    // Extract all messages in current language
    const extractMessages = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'object') {
          if ('el' in value && 'en' in value) {
            // This is a bilingual message
            const messageKey = prefix ? `${prefix}.${key}` : key;
            result[messageKey] = (value as BilingualMessage)[this.currentLanguage];
          } else {
            // This is a nested category
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            extractMessages(value, newPrefix);
          }
        }
      }
    };
    
    extractMessages(current);
    return result;
  }
}

// Export singleton instance
export const bilingualMessages = new BilingualMessageManager();

// Export utility functions
export const t = (keyPath: string, params?: Record<string, any>): string => {
  return params ? 
    bilingualMessages.getFormattedMessage(keyPath, params) : 
    bilingualMessages.getMessage(keyPath);
};

export const setLanguage = (language: SupportedLanguage): void => {
  bilingualMessages.setLanguage(language);
};

export const getCurrentLanguage = (): SupportedLanguage => {
  bilingualMessages.getCurrentLanguage();
};

export const getBilingual = (keyPath: string): BilingualMessage => {
  return bilingualMessages.getBilingualMessage(keyPath);
};