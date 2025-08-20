/**
 * Greek/English i18n for IBAN Validation System
 * 
 * Provides localized messages for:
 * - Validation errors and warnings
 * - Override reasons
 * - User interface text
 * - Audit log messages
 */

export type Language = 'el' | 'en';

export interface I18nMessages {
  // IBAN Validation Errors
  IBAN_REQUIRED: string;
  IBAN_INVALID_FORMAT: string;
  IBAN_INVALID_LENGTH: string;
  IBAN_INVALID_CHECKSUM: string;
  IBAN_NOT_GREEK: string;
  
  // Name Matching
  NAME_MISMATCH: string;
  NAME_EXACT_MATCH: string;
  NAME_PARTIAL_MATCH: string;
  NAME_INITIALS_MATCH: string;
  NAME_TRANSLITERATION_DETECTED: string;
  NAME_DOUBLE_SURNAME: string;
  NAME_MAIDEN_NAME: string;
  NAME_PATRONYMIC: string;
  
  // Bank Information
  BANK_UNKNOWN: string;
  BANK_IDENTIFIED: string;
  
  // Override Reasons
  OVERRIDE_MAIDEN_NAME: string;
  OVERRIDE_DOUBLE_SURNAME: string;
  OVERRIDE_TRANSLITERATION: string;
  OVERRIDE_NICKNAME: string;
  OVERRIDE_BANK_ERROR: string;
  OVERRIDE_OTHER: string;
  
  // UI Labels
  IBAN_LABEL: string;
  ACCOUNT_HOLDER_LABEL: string;
  BANK_NAME_LABEL: string;
  VALIDATION_STATUS: string;
  OVERRIDE_REASON_LABEL: string;
  SAVE_BUTTON: string;
  CANCEL_BUTTON: string;
  VALIDATE_BUTTON: string;
  
  // Status Messages
  VALIDATION_PASSED: string;
  VALIDATION_WARNING: string;
  VALIDATION_FAILED: string;
  VALIDATION_IN_PROGRESS: string;
  SAVE_SUCCESSFUL: string;
  OVERRIDE_REQUIRED: string;
  
  // Performance Messages
  VALIDATION_SLOW_WARNING: string;
  PERFORMANCE_OK: string;
}

/**
 * Greek (el) translations
 */
const EL_MESSAGES: I18nMessages = {
  // IBAN Validation Errors
  IBAN_REQUIRED: 'Το IBAN είναι υποχρεωτικό',
  IBAN_INVALID_FORMAT: 'Μη έγκυρη μορφή IBAN',
  IBAN_INVALID_LENGTH: 'Το ελληνικό IBAN πρέπει να έχει ακριβώς 27 χαρακτήρες',
  IBAN_INVALID_CHECKSUM: 'Μη έγκυρο άθροισμα ελέγχου IBAN',
  IBAN_NOT_GREEK: 'Το IBAN πρέπει να ξεκινά με GR για ελληνικούς λογαριασμούς',
  
  // Name Matching
  NAME_MISMATCH: 'Το όνομα του δικαιούχου λογαριασμού δεν ταιριάζει με το όνομα του εργαζομένου',
  NAME_EXACT_MATCH: 'Ακριβής αντιστοιχία ονόματος',
  NAME_PARTIAL_MATCH: 'Μερική αντιστοιχία ονόματος',
  NAME_INITIALS_MATCH: 'Αντιστοιχία αρχικών ονόματος',
  NAME_TRANSLITERATION_DETECTED: 'Ανιχνεύθηκε μεταγραφή ονόματος (Ελληνικά/Λατινικά)',
  NAME_DOUBLE_SURNAME: 'Ανιχνεύθηκε διπλό επώνυμο',
  NAME_MAIDEN_NAME: 'Πιθανό πατρικό όνομα',
  NAME_PATRONYMIC: 'Ανιχνεύθηκε πατρώνυμο',
  
  // Bank Information  
  BANK_UNKNOWN: 'Η τράπεζα δεν αναγνωρίστηκε από το IBAN',
  BANK_IDENTIFIED: 'Τράπεζα αναγνωρίστηκε',
  
  // Override Reasons
  OVERRIDE_MAIDEN_NAME: 'Διαφορετικό όνομα λόγω γάμου',
  OVERRIDE_DOUBLE_SURNAME: 'Διπλό επώνυμο',
  OVERRIDE_TRANSLITERATION: 'Μεταγραφή ονόματος',
  OVERRIDE_NICKNAME: 'Χρήση παρατσουκλιού',
  OVERRIDE_BANK_ERROR: 'Σφάλμα τράπεζας',
  OVERRIDE_OTHER: 'Άλλος λόγος',
  
  // UI Labels
  IBAN_LABEL: 'IBAN',
  ACCOUNT_HOLDER_LABEL: 'Δικαιούχος Λογαριασμού',
  BANK_NAME_LABEL: 'Όνομα Τράπεζας',
  VALIDATION_STATUS: 'Κατάσταση Επικύρωσης',
  OVERRIDE_REASON_LABEL: 'Αιτία Παράκαμψης',
  SAVE_BUTTON: 'Αποθήκευση',
  CANCEL_BUTTON: 'Ακύρωση',
  VALIDATE_BUTTON: 'Επικύρωση',
  
  // Status Messages
  VALIDATION_PASSED: 'Η επικύρωση ολοκληρώθηκε επιτυχώς',
  VALIDATION_WARNING: 'Προειδοποίηση επικύρωσης',
  VALIDATION_FAILED: 'Η επικύρωση απέτυχε',
  VALIDATION_IN_PROGRESS: 'Επικύρωση σε εξέλιξη...',
  SAVE_SUCCESSFUL: 'Αποθηκεύτηκε επιτυχώς',
  OVERRIDE_REQUIRED: 'Απαιτείται παράκαμψη',
  
  // Performance Messages
  VALIDATION_SLOW_WARNING: 'Η επικύρωση διήρκεσε περισσότερο από το αναμενόμενο',
  PERFORMANCE_OK: 'Επικύρωση ολοκληρώθηκε εντός των προδιαγραφών'
};

/**
 * English (en) translations
 */
const EN_MESSAGES: I18nMessages = {
  // IBAN Validation Errors
  IBAN_REQUIRED: 'IBAN is required',
  IBAN_INVALID_FORMAT: 'Invalid IBAN format',
  IBAN_INVALID_LENGTH: 'Greek IBAN must be exactly 27 characters',
  IBAN_INVALID_CHECKSUM: 'Invalid IBAN checksum',
  IBAN_NOT_GREEK: 'IBAN must start with GR for Greek accounts',
  
  // Name Matching
  NAME_MISMATCH: 'Account holder name does not match employee name',
  NAME_EXACT_MATCH: 'Exact name match',
  NAME_PARTIAL_MATCH: 'Partial name match',
  NAME_INITIALS_MATCH: 'Initials match',
  NAME_TRANSLITERATION_DETECTED: 'Name transliteration detected (Greek/Latin)',
  NAME_DOUBLE_SURNAME: 'Double surname detected',
  NAME_MAIDEN_NAME: 'Possible maiden name',
  NAME_PATRONYMIC: 'Patronymic detected',
  
  // Bank Information
  BANK_UNKNOWN: 'Bank could not be identified from IBAN',
  BANK_IDENTIFIED: 'Bank identified',
  
  // Override Reasons
  OVERRIDE_MAIDEN_NAME: 'Different marital name',
  OVERRIDE_DOUBLE_SURNAME: 'Double surname',
  OVERRIDE_TRANSLITERATION: 'Name transliteration',
  OVERRIDE_NICKNAME: 'Nickname usage',
  OVERRIDE_BANK_ERROR: 'Bank error',
  OVERRIDE_OTHER: 'Other reason',
  
  // UI Labels
  IBAN_LABEL: 'IBAN',
  ACCOUNT_HOLDER_LABEL: 'Account Holder',
  BANK_NAME_LABEL: 'Bank Name',
  VALIDATION_STATUS: 'Validation Status',
  OVERRIDE_REASON_LABEL: 'Override Reason',
  SAVE_BUTTON: 'Save',
  CANCEL_BUTTON: 'Cancel',
  VALIDATE_BUTTON: 'Validate',
  
  // Status Messages
  VALIDATION_PASSED: 'Validation completed successfully',
  VALIDATION_WARNING: 'Validation warning',
  VALIDATION_FAILED: 'Validation failed',
  VALIDATION_IN_PROGRESS: 'Validation in progress...',
  SAVE_SUCCESSFUL: 'Saved successfully',
  OVERRIDE_REQUIRED: 'Override required',
  
  // Performance Messages
  VALIDATION_SLOW_WARNING: 'Validation took longer than expected',
  PERFORMANCE_OK: 'Validation completed within specifications'
};

/**
 * Message registry
 */
const MESSAGES: Record<Language, I18nMessages> = {
  el: EL_MESSAGES,
  en: EN_MESSAGES
};

/**
 * I18n service for IBAN validation
 */
export class IbanI18nService {
  private currentLanguage: Language = 'en';
  
  constructor(language: Language = 'en') {
    this.currentLanguage = language;
  }
  
  /**
   * Set current language
   */
  setLanguage(language: Language): void {
    this.currentLanguage = language;
  }
  
  /**
   * Get current language
   */
  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }
  
  /**
   * Get message by key
   */
  getMessage(key: keyof I18nMessages, ...params: string[]): string {
    const messages = MESSAGES[this.currentLanguage];
    let message = messages[key] || messages[key] || key;
    
    // Simple parameter substitution {0}, {1}, etc.
    params.forEach((param, index) => {
      message = message.replace(`{${index}}`, param);
    });
    
    return message;
  }
  
  /**
   * Get localized validation error message
   */
  getValidationErrorMessage(error: string): string {
    const errorMap: Record<string, keyof I18nMessages> = {
      'IBAN is required': 'IBAN_REQUIRED',
      'Invalid IBAN format': 'IBAN_INVALID_FORMAT',
      'Greek IBAN must be exactly 27 characters': 'IBAN_INVALID_LENGTH',
      'Invalid IBAN checksum': 'IBAN_INVALID_CHECKSUM',
      'IBAN must start with GR': 'IBAN_NOT_GREEK'
    };
    
    const messageKey = Object.keys(errorMap).find(pattern => error.includes(pattern));
    if (messageKey) {
      return this.getMessage(errorMap[messageKey]);
    }
    
    return error; // Fallback to original message
  }
  
  /**
   * Get localized name match reason
   */
  getNameMatchReason(reason: string): string {
    const reasonMap: Record<string, keyof I18nMessages> = {
      'Exact match': 'NAME_EXACT_MATCH',
      'partial': 'NAME_PARTIAL_MATCH',
      'initials': 'NAME_INITIALS_MATCH',
      'transliteration': 'NAME_TRANSLITERATION_DETECTED',
      'double_surname': 'NAME_DOUBLE_SURNAME',
      'maiden': 'NAME_MAIDEN_NAME',
      'patronymic': 'NAME_PATRONYMIC'
    };
    
    const reasonKey = Object.keys(reasonMap).find(pattern => 
      reason.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (reasonKey) {
      return this.getMessage(reasonMap[reasonKey]);
    }
    
    return reason; // Fallback to original reason
  }
  
  /**
   * Get suggested override reasons
   */
  getOverrideReasons(): Array<{ value: string; label: string }> {
    return [
      { value: 'maiden_name', label: this.getMessage('OVERRIDE_MAIDEN_NAME') },
      { value: 'double_surname', label: this.getMessage('OVERRIDE_DOUBLE_SURNAME') },
      { value: 'transliteration', label: this.getMessage('OVERRIDE_TRANSLITERATION') },
      { value: 'nickname', label: this.getMessage('OVERRIDE_NICKNAME') },
      { value: 'bank_error', label: this.getMessage('OVERRIDE_BANK_ERROR') },
      { value: 'other', label: this.getMessage('OVERRIDE_OTHER') }
    ];
  }
  
  /**
   * Format localized validation summary
   */
  formatValidationSummary(
    decision: 'pass' | 'warn' | 'fail',
    validationTimeMs: number,
    nameScore?: number
  ): string {
    const performanceNote = validationTimeMs > 150 ? 
      ` (${this.getMessage('VALIDATION_SLOW_WARNING')})` : '';
    
    switch (decision) {
      case 'pass':
        return this.getMessage('VALIDATION_PASSED') + performanceNote;
      
      case 'warn':
        const scoreText = nameScore ? ` (${(nameScore * 100).toFixed(1)}%)` : '';
        return this.getMessage('VALIDATION_WARNING') + scoreText + performanceNote;
      
      case 'fail':
        return this.getMessage('VALIDATION_FAILED') + performanceNote;
      
      default:
        return decision + performanceNote;
    }
  }
}

/**
 * Global i18n instance
 */
export const ibanI18n = new IbanI18nService();

/**
 * Helper function to get localized message
 */
export function t(key: keyof I18nMessages, ...params: string[]): string {
  return ibanI18n.getMessage(key, ...params);
}

/**
 * Helper function to set language
 */
export function setLanguage(language: Language): void {
  ibanI18n.setLanguage(language);
}