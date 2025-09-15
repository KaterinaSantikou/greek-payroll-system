/**
 * Greek Formatting Utilities for Frontend
 * 
 * Client-side formatting utilities that work with the backend Greek localization
 * system to provide consistent date/time and numeric formatting across the app.
 */

import { 
  GreekDateTimeFormatter, 
  GreekNumericFormatter, 
  GreekPayrollFormatter,
  GreekFormatValidator,
  GREEK_LOCALE,
  GREEK_TIMEZONE
} from '../../../lib/localization/GreekLocalization.js';

// Re-export server-side formatters for client use
export {
  GreekDateTimeFormatter,
  GreekNumericFormatter, 
  GreekPayrollFormatter,
  GreekFormatValidator,
  GREEK_LOCALE,
  GREEK_TIMEZONE
};

/**
 * React-specific formatting hooks and utilities
 */
export class ReactGreekFormatters {
  
  /**
   * Format input values for Greek number inputs
   */
  static formatNumberInput(value: number | string, decimals: number = 2): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return GreekNumericFormatter.formatDecimal(num, decimals);
  }

  /**
   * Format currency for display in forms
   */
  static formatCurrencyInput(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    return GreekNumericFormatter.formatCurrencyAmount(num);
  }

  /**
   * Format date for date inputs (HTML input[type="date"] expects YYYY-MM-DD)
   */
  static formatDateForInput(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  }

  /**
   * Parse Greek date input back to Date object
   */
  static parseDateInput(dateString: string): Date | null {
    try {
      if (dateString.includes('/')) {
        // Greek format DD/MM/YYYY
        return GreekDateTimeFormatter.parseGreekDate(dateString);
      } else if (dateString.includes('-')) {
        // ISO format YYYY-MM-DD (from HTML input)
        return new Date(dateString);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate and format Greek number input on blur
   */
  static handleNumberInputBlur(value: string, decimals: number = 2): string {
    try {
      const parsed = GreekNumericFormatter.parseGreekNumber(value);
      return GreekNumericFormatter.formatDecimal(parsed, decimals);
    } catch {
      return value; // Return original if can't parse
    }
  }

  /**
   * Validate and format currency input on blur
   */
  static handleCurrencyInputBlur(value: string): string {
    try {
      const parsed = GreekNumericFormatter.parseGreekNumber(value);
      return GreekNumericFormatter.formatCurrencyAmount(parsed);
    } catch {
      return value;
    }
  }
}

/**
 * Greek Form Validation Messages
 */
export const GREEK_VALIDATION_MESSAGES = {
  required: 'Αυτό το πεδίο είναι υποχρεωτικό',
  invalidEmail: 'Παρακαλώ εισάγετε έγκυρη διεύθυνση email',
  invalidPhone: 'Παρακαλώ εισάγετε έγκυρο τηλέφωνο',
  invalidDate: 'Παρακαλώ εισάγετε έγκυρη ημερομηνία (DD/MM/YYYY)',
  invalidNumber: 'Παρακαλώ εισάγετε έγκυρο αριθμό',
  invalidCurrency: 'Παρακαλώ εισάγετε έγκυρο ποσό (π.χ. 1.234,56)',
  invalidAFM: 'Παρακαλώ εισάγετε έγκυρο ΑΦΜ (9 ψηφία)',
  invalidAMKA: 'Παρακαλώ εισάγετε έγκυρο ΑΜΚΑ (11 ψηφία)',
  minValue: (min: number) => `Η ελάχιστη τιμή είναι ${GreekNumericFormatter.formatDecimal(min)}`,
  maxValue: (max: number) => `Η μέγιστη τιμή είναι ${GreekNumericFormatter.formatDecimal(max)}`,
  minLength: (min: number) => `Ελάχιστο μήκος: ${min} χαρακτήρες`,
  maxLength: (max: number) => `Μέγιστο μήκος: ${max} χαρακτήρες`,
  futureDate: 'Η ημερομηνία δεν μπορεί να είναι στο μέλλον',
  pastDate: 'Η ημερομηνία δεν μπορεί να είναι στο παρελθόν'
};

/**
 * Greek UI Text Constants
 */
export const GREEK_UI_TEXT = {
  // Common actions
  save: 'Αποθήκευση',
  cancel: 'Ακύρωση',
  delete: 'Διαγραφή',
  edit: 'Επεξεργασία',
  view: 'Προβολή',
  add: 'Προσθήκη',
  remove: 'Αφαίρεση',
  search: 'Αναζήτηση',
  filter: 'Φίλτρα',
  export: 'Εξαγωγή',
  import: 'Εισαγωγή',
  print: 'Εκτύπωση',
  close: 'Κλείσιμο',
  
  // Status
  loading: 'Φόρτωση...',
  saving: 'Αποθήκευση...',
  success: 'Επιτυχία',
  error: 'Σφάλμα',
  warning: 'Προειδοποίηση',
  info: 'Πληροφορία',
  
  // Payroll specific
  employee: 'Εργαζόμενος',
  employees: 'Εργαζόμενοι',
  salary: 'Μισθός',
  payroll: 'Μισθοδοσία',
  payslip: 'Μισθοδοτικό',
  period: 'Περίοδος',
  grossPay: 'Μικτές Αποδοχές',
  netPay: 'Καθαρές Αποδοχές',
  deductions: 'Κρατήσεις',
  taxes: 'Φόροι',
  efka: 'ΕΦΚΑ',
  overtime: 'Υπερωρίες',
  allowances: 'Επιδόματα',
  bonuses: 'Μπόνους',
  leaves: 'Άδειες',
  
  // Date/Time
  today: 'Σήμερα',
  yesterday: 'Χθες',
  tomorrow: 'Αύριο',
  thisWeek: 'Αυτή την εβδομάδα',
  thisMonth: 'Αυτόν τον μήνα',
  thisYear: 'Φέτος',
  
  // Greek months
  months: {
    january: 'Ιανουάριος',
    february: 'Φεβρουάριος', 
    march: 'Μάρτιος',
    april: 'Απρίλιος',
    may: 'Μάιος',
    june: 'Ιούνιος',
    july: 'Ιούλιος',
    august: 'Αύγουστος',
    september: 'Σεπτέμβριος',
    october: 'Οκτώβριος',
    november: 'Νοέμβριος',
    december: 'Δεκέμβριος'
  },
  
  // Greek days
  days: {
    monday: 'Δευτέρα',
    tuesday: 'Τρίτη', 
    wednesday: 'Τετάρτη',
    thursday: 'Πέμπτη',
    friday: 'Παρασκευή',
    saturday: 'Σάββατο',
    sunday: 'Κυριακή'
  }
};

/**
 * Table column headers for payroll data in Greek
 */
export const GREEK_PAYROLL_COLUMNS = {
  employeeId: 'Κωδικός Εργαζομένου',
  employeeName: 'Ονοματεπώνυμο',
  afm: 'ΑΦΜ',
  amka: 'ΑΜΚΑ', 
  department: 'Τμήμα',
  position: 'Θέση',
  hireDate: 'Ημ/νία Πρόσληψης',
  contractType: 'Τύπος Σύμβασης',
  workingHours: 'Ώρες Εργασίας',
  baseSalary: 'Βασικός Μισθός',
  grossPay: 'Μικτές Αποδοχές',
  netPay: 'Καθαρές Αποδοχές',
  incomeTax: 'Φόρος Εισοδήματος',
  solidarityTax: 'Τέλος Αλληλεγγύης',
  efkaEmployee: 'Εργαζόμενος ΕΦΚΑ',
  efkaEmployer: 'Εργοδότης ΕΦΚΑ',
  overtime: 'Υπερωρίες',
  nightShift: 'Νυχτερινό',
  sundayWork: 'Κυριακάτικο',
  holidayWork: 'Αργίες',
  allowances: 'Επιδόματα',
  bonuses: 'Μπόνους',
  tips: 'Φιλοδωρήματα',
  totalCost: 'Συνολικό Κόστος'
};

/**
 * React component props for Greek formatting
 */
export interface GreekFormattedDisplayProps {
  value: number | string | Date;
  type: 'currency' | 'number' | 'percentage' | 'date' | 'datetime' | 'time';
  decimals?: number;
  showSymbol?: boolean;
  className?: string;
}

/**
 * Utility function to get browser's preferred Greek locale
 */
export function getBrowserGreekLocale(): string {
  if (typeof navigator !== 'undefined') {
    const languages = navigator.languages || [navigator.language];
    const greekLanguages = languages.filter(lang => 
      lang.startsWith('el') || lang.startsWith('gr')
    );
    return greekLanguages[0] || GREEK_LOCALE;
  }
  return GREEK_LOCALE;
}