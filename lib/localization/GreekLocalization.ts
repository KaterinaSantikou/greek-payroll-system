/**
 * Greek Localization System
 * 
 * Comprehensive localization for Greek payroll processing including:
 * - Proper date/time formatting (DD/MM/YYYY, 24-hour)
 * - Numeric formatting with decimal comma (1.234,56)
 * - Currency formatting for EUR with Greek conventions
 * - Greek timezone handling (Europe/Athens)
 * - Locale-aware string formatting for compliance
 * 
 * COMPLIANCE NOTES:
 * - All official documents must use Greek date format (DD/MM/YYYY)
 * - Financial amounts must use decimal comma as per EU standards
 * - Time zones must account for Greek DST changes
 * - Government system submissions require specific formatting
 */

// Greek locale constants
export const GREEK_LOCALE = 'el-GR';
export const GREEK_TIMEZONE = 'Europe/Athens';
export const GREEK_CURRENCY = 'EUR';

/**
 * Greek Date/Time Formatting Utilities
 */
export class GreekDateTimeFormatter {
  private static readonly locale = GREEK_LOCALE;
  private static readonly timezone = GREEK_TIMEZONE;

  /**
   * Format date for official documents (DD/MM/YYYY)
   */
  static formatOfficialDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: this.timezone
    }).format(dateObj);
  }

  /**
   * Format date and time for official documents (DD/MM/YYYY HH:mm)
   */
  static formatOfficialDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // 24-hour format
      timeZone: this.timezone
    }).format(dateObj);
  }

  /**
   * Format date with full month name (1 Ιανουαρίου 2024)
   */
  static formatLongDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: this.timezone
    }).format(dateObj);
  }

  /**
   * Format time only (HH:mm)
   */
  static formatTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.timezone
    }).format(dateObj);
  }

  /**
   * Parse Greek date format (DD/MM/YYYY) to Date object
   */
  static parseGreekDate(dateString: string): Date {
    const parts = dateString.split('/');
    if (parts.length !== 3) {
      throw new Error(`Invalid Greek date format: ${dateString}. Expected DD/MM/YYYY`);
    }
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      throw new Error(`Invalid date components in: ${dateString}`);
    }
    
    return new Date(year, month, day);
  }

  /**
   * Get current Greek time
   */
  static getCurrentGreekTime(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: this.timezone }));
  }

  /**
   * Format period for payroll (e.g., "Ιανουάριος 2024")
   */
  static formatPayrollPeriod(year: number, month: number): string {
    const date = new Date(year, month - 1, 1); // month is 1-indexed input
    return new Intl.DateTimeFormat(this.locale, {
      month: 'long',
      year: 'numeric',
      timeZone: this.timezone
    }).format(date);
  }

  /**
   * Format date range (01/01/2024 - 31/01/2024)
   */
  static formatDateRange(startDate: Date | string, endDate: Date | string): string {
    const start = this.formatOfficialDate(startDate);
    const end = this.formatOfficialDate(endDate);
    return `${start} - ${end}`;
  }
}

/**
 * Greek Numeric Formatting Utilities
 */
export class GreekNumericFormatter {
  private static readonly locale = GREEK_LOCALE;

  /**
   * Format currency amount with decimal comma (1.234,56 €)
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: GREEK_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format currency amount without symbol (1.234,56)
   */
  static formatCurrencyAmount(amount: number): string {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format percentage with decimal comma (12,34%)
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat(this.locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  }

  /**
   * Format integer (no decimal places) with thousand separators
   */
  static formatInteger(value: number): string {
    return new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Format decimal number with specified precision
   */
  static formatDecimal(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Parse Greek numeric format back to number
   */
  static parseGreekNumber(value: string): number {
    // Remove currency symbols and spaces
    let cleaned = value.replace(/[€\s]/g, '');
    
    // Handle Greek number format: 1.234,56 -> 1234.56
    // Replace thousand separators (.) with empty string
    // Replace decimal comma (,) with decimal point (.)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) {
      throw new Error(`Invalid Greek number format: ${value}`);
    }
    
    return parsed;
  }

  /**
   * Format hours (e.g., for working time) with decimal comma
   */
  static formatHours(hours: number): string {
    return `${this.formatDecimal(hours, 2)} ώρες`;
  }

  /**
   * Format salary/wage amounts for payroll documents
   */
  static formatSalaryAmount(amount: number): string {
    return `${this.formatCurrencyAmount(amount)} €`;
  }
}

/**
 * Greek Payroll Specific Formatting
 */
export class GreekPayrollFormatter {
  
  /**
   * Format employee ID for official documents
   */
  static formatEmployeeId(id: string): string {
    return id.toUpperCase();
  }

  /**
   * Format AFM (Tax ID) with proper spacing
   */
  static formatAFM(afm: string): string {
    // AFM format: 123456789 (9 digits)
    const cleaned = afm.replace(/\D/g, '');
    if (cleaned.length !== 9) {
      throw new Error(`Invalid AFM format: ${afm}. Must be 9 digits`);
    }
    return cleaned;
  }

  /**
   * Format AMKA (Social Security Number) with proper spacing
   */
  static formatAMKA(amka: string): string {
    // AMKA format: 12345678901 (11 digits)
    const cleaned = amka.replace(/\D/g, '');
    if (cleaned.length !== 11) {
      throw new Error(`Invalid AMKA format: ${amka}. Must be 11 digits`);
    }
    return cleaned;
  }

  /**
   * Format payroll period description
   */
  static formatPayrollPeriodDescription(year: number, month: number): string {
    const monthName = GreekDateTimeFormatter.formatPayrollPeriod(year, month);
    return `Μισθοδοσία ${monthName}`;
  }

  /**
   * Format contract type in Greek
   */
  static formatContractType(type: string): string {
    const contractTypes: Record<string, string> = {
      'indefinite': 'Αορίστου Χρόνου',
      'fixed-term': 'Ορισμένου Χρόνου',
      'seasonal': 'Εποχιακή'
    };
    return contractTypes[type] || type;
  }

  /**
   * Format leave type in Greek
   */
  static formatLeaveType(type: string): string {
    const leaveTypes: Record<string, string> = {
      'annual': 'Κανονική Άδεια',
      'sick': 'Άδεια Ασθενείας',
      'maternity': 'Άδεια Μητρότητας',
      'paternity': 'Άδεια Πατρότητας',
      'special': 'Ειδική Άδεια'
    };
    return leaveTypes[type] || type;
  }

  /**
   * Format working time description
   */
  static formatWorkingTime(regularHours: number, overtimeHours: number = 0): string {
    let description = `Κανονικές: ${GreekNumericFormatter.formatHours(regularHours)}`;
    if (overtimeHours > 0) {
      description += `, Υπερωρίες: ${GreekNumericFormatter.formatHours(overtimeHours)}`;
    }
    return description;
  }

  /**
   * Format payment method in Greek
   */
  static formatPaymentMethod(method: string): string {
    const paymentMethods: Record<string, string> = {
      'bank_transfer': 'Τραπεζικό Έμβασμα',
      'cash': 'Μετρητά',
      'check': 'Επιταγή'
    };
    return paymentMethods[method] || method;
  }
}

/**
 * Government Systems Formatting (ERGANI, e-EFKA, AADE)
 */
export class GreekGovernmentFormatter {
  
  /**
   * Format datetime for ERGANI II submissions (YYYY-MM-DDTHH:mm:ss)
   */
  static formatERGANIDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    // Convert to Greek timezone first
    const greekDate = new Date(dateObj.toLocaleString("en-US", { timeZone: GREEK_TIMEZONE }));
    return greekDate.toISOString().slice(0, 19); // Remove milliseconds and Z
  }

  /**
   * Format date for e-EFKA submissions (YYYY-MM-DD)
   */
  static formatEFKADate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const greekDate = new Date(dateObj.toLocaleString("en-US", { timeZone: GREEK_TIMEZONE }));
    return greekDate.toISOString().split('T')[0];
  }

  /**
   * Format amount for AADE submissions (no thousand separators, decimal point)
   */
  static formatAADEAmount(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Format period for government submissions (YYYY-MM)
   */
  static formatGovernmentPeriod(year: number, month: number): string {
    return `${year}-${month.toString().padStart(2, '0')}`;
  }
}

/**
 * Validation Utilities for Greek Formats
 */
export class GreekFormatValidator {
  
  /**
   * Validate Greek date format (DD/MM/YYYY)
   */
  static isValidGreekDate(dateString: string): boolean {
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateString.match(dateRegex);
    
    if (!match) return false;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    // Basic validation
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > 2100) return false;
    
    // More precise validation
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year;
  }

  /**
   * Validate AFM format
   */
  static isValidAFM(afm: string): boolean {
    const cleaned = afm.replace(/\D/g, '');
    return cleaned.length === 9 && /^\d{9}$/.test(cleaned);
  }

  /**
   * Validate AMKA format
   */
  static isValidAMKA(amka: string): boolean {
    const cleaned = amka.replace(/\D/g, '');
    return cleaned.length === 11 && /^\d{11}$/.test(cleaned);
  }

  /**
   * Validate Greek currency amount format
   */
  static isValidGreekCurrency(amount: string): boolean {
    // Matches: 1.234,56 €, 1234,56, 123,45 €, etc.
    const currencyRegex = /^[\d]{1,3}(\.[\d]{3})*,[\d]{2}(\s€)?$/;
    return currencyRegex.test(amount.trim());
  }
}

/**
 * Main Greek Localization Manager
 */
export class GreekLocalization {
  
  /**
   * Initialize Greek locale settings
   */
  static initialize(): void {
    // Set default locale if in browser environment
    if (typeof window !== 'undefined') {
      document.documentElement.lang = 'el';
      document.documentElement.dir = 'ltr';
    }
    
    // Set Node.js locale if available
    if (typeof process !== 'undefined' && process.env) {
      process.env.LC_ALL = GREEK_LOCALE;
      process.env.TZ = GREEK_TIMEZONE;
    }
  }

  /**
   * Get all formatters
   */
  static getFormatters() {
    return {
      dateTime: GreekDateTimeFormatter,
      numeric: GreekNumericFormatter,
      payroll: GreekPayrollFormatter,
      government: GreekGovernmentFormatter,
      validator: GreekFormatValidator
    };
  }

  /**
   * Format complete payslip information
   */
  static formatPayslipData(data: {
    employeeName: string;
    period: { year: number; month: number };
    grossPay: number;
    netPay: number;
    workingHours: number;
    overtimeHours?: number;
    generatedDate: Date;
  }) {
    return {
      employeeName: data.employeeName,
      period: GreekPayrollFormatter.formatPayrollPeriodDescription(data.period.year, data.period.month),
      grossPay: GreekNumericFormatter.formatSalaryAmount(data.grossPay),
      netPay: GreekNumericFormatter.formatSalaryAmount(data.netPay),
      workingTime: GreekPayrollFormatter.formatWorkingTime(data.workingHours, data.overtimeHours),
      generatedDate: GreekDateTimeFormatter.formatOfficialDateTime(data.generatedDate),
      generatedDateLong: GreekDateTimeFormatter.formatLongDate(data.generatedDate)
    };
  }
}

// Export convenience constants
export const GREEK_DATE_FORMAT = 'DD/MM/YYYY';
export const GREEK_DATETIME_FORMAT = 'DD/MM/YYYY HH:mm';
export const GREEK_TIME_FORMAT = 'HH:mm';

// Initialize on import
GreekLocalization.initialize();