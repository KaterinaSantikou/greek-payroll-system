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

// Bilingual message support
import { useTranslation } from '../contexts/LanguageContext';
import type { SupportedLanguage } from '../../../lib/localization/BilingualMessages';

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
 * Bilingual Form Validation Hook
 */
export const useBilingualValidation = () => {
  const { t } = useTranslation();
  
  return {
    required: () => t('validation.required'),
    invalidEmail: () => t('validation.invalidEmail'),
    invalidPhone: () => t('validation.invalidPhone'),
    invalidDate: () => t('validation.invalidDate'),
    invalidNumber: () => t('validation.invalidNumber'),
    invalidCurrency: () => t('validation.invalidCurrency'),
    invalidAFM: () => t('validation.invalidAFM'),
    invalidAMKA: () => t('validation.invalidAMKA'),
    minValue: (min: number) => `${t('validation.minValue')} ${GreekNumericFormatter.formatDecimal(min)}`,
    maxValue: (max: number) => `${t('validation.maxValue')} ${GreekNumericFormatter.formatDecimal(max)}`,
    minLength: (min: number) => `${t('validation.minLength')} ${min} ${t('validation.characters')}`,
    maxLength: (max: number) => `${t('validation.maxLength')} ${max} ${t('validation.characters')}`,
    futureDate: () => t('validation.futureDate'),
    pastDate: () => t('validation.pastDate')
  };
};

/**
 * Bilingual UI Text Hook
 */
export const useBilingualText = () => {
  const { t } = useTranslation();
  
  return {
    // Common actions  
    save: () => t('actions.save'),
    cancel: () => t('actions.cancel'),
    delete: () => t('actions.delete'),
    edit: () => t('actions.edit'),
    view: () => t('actions.view'),
    add: () => t('actions.add'),
    remove: () => t('actions.remove'),
    search: () => t('actions.search'),
    filter: () => t('actions.filter'),
    export: () => t('actions.export'),
    import: () => t('actions.import'),
    print: () => t('actions.print'),
    close: () => t('actions.close'),
    
    // Status
    loading: () => t('status.loading'),
    saving: () => t('status.saving'),
    success: () => t('status.success'),
    error: () => t('status.error'),
    warning: () => t('status.warning'),
    info: () => t('status.info'),
    
    // Payroll specific
    employee: () => t('employee.employee'),
    employees: () => t('employee.employees'),
    salary: () => t('contract.salary'),
    payroll: () => t('payroll.payroll'),
    payslip: () => t('payroll.payslip'),
    period: () => t('dateTime.period'),
    grossPay: () => t('payroll.grossPay'),
    netPay: () => t('payroll.netPay'),
    deductions: () => t('payroll.deductions'),
    taxes: () => t('tax.incomeTax'),
    efka: () => t('tax.efka'),
    overtime: () => t('payroll.overtime'),
    allowances: () => t('payroll.allowances'),
    bonuses: () => t('payroll.bonuses'),
    leaves: () => t('leave.leave'),
    
    // Date/Time
    today: () => t('dateTime.today'),
    yesterday: () => t('dateTime.yesterday'),
    tomorrow: () => t('dateTime.tomorrow'),
    thisWeek: () => t('dateTime.thisWeek'),
    thisMonth: () => t('dateTime.thisMonth'),
    thisYear: () => t('dateTime.thisYear'),
    
    // Months
    getMonth: (month: string) => t(`months.${month}`),
    
    // Days
    getDay: (day: string) => t(`days.${day}`)
  };
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