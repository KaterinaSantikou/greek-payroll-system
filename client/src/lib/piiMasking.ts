/**
 * PII Masking Utilities
 * Provides secure masking for sensitive personal data
 */

export interface MaskingOptions {
  showFirst?: number;
  showLast?: number;
  maskChar?: string;
  preserveFormat?: boolean;
}

export class PIIMasking {
  /**
   * Mask IBAN numbers - show only last 4 digits for Greek compliance
   */
  static maskIBAN(iban: string, options: MaskingOptions = {}): string {
    if (!iban || iban.length < 8) return iban;
    
    const { showLast = 4, maskChar = '*' } = options;
    const cleanIban = iban.replace(/\s/g, '');
    
    if (cleanIban.length <= showLast) {
      return cleanIban;
    }
    
    const visiblePart = cleanIban.slice(-showLast);
    const maskedLength = cleanIban.length - showLast;
    const masked = maskChar.repeat(maskedLength);
    
    // Preserve IBAN formatting with spaces every 4 characters
    const result = masked + visiblePart;
    if (options.preserveFormat) {
      return result.replace(/(.{4})/g, '$1 ').trim();
    }
    
    return result;
  }

  /**
   * Mask Greek AFM (Tax ID) - show only last 3 digits
   */
  static maskAFM(afm: string, options: MaskingOptions = {}): string {
    if (!afm || afm.length !== 9) return afm;
    
    const { showLast = 3, maskChar = '*' } = options;
    const visiblePart = afm.slice(-showLast);
    const masked = maskChar.repeat(afm.length - showLast);
    
    return masked + visiblePart;
  }

  /**
   * Mask Greek AMKA (Social Security) - show only last 3 digits
   */
  static maskAMKA(amka: string, options: MaskingOptions = {}): string {
    if (!amka || amka.length !== 11) return amka;
    
    const { showLast = 3, maskChar = '*' } = options;
    const visiblePart = amka.slice(-showLast);
    const masked = maskChar.repeat(amka.length - showLast);
    
    return masked + visiblePart;
  }

  /**
   * Mask email addresses - show first 2 and last 2 chars before @
   */
  static maskEmail(email: string, options: MaskingOptions = {}): string {
    if (!email || !email.includes('@')) return email;
    
    const [localPart, domain] = email.split('@');
    const { showFirst = 2, showLast = 2, maskChar = '*' } = options;
    
    if (localPart.length <= showFirst + showLast) {
      return email;
    }
    
    const firstPart = localPart.slice(0, showFirst);
    const lastPart = localPart.slice(-showLast);
    const maskedLength = localPart.length - showFirst - showLast;
    const masked = maskChar.repeat(maskedLength);
    
    return `${firstPart}${masked}${lastPart}@${domain}`;
  }

  /**
   * Mask phone numbers - show last 4 digits
   */
  static maskPhone(phone: string, options: MaskingOptions = {}): string {
    if (!phone) return phone;
    
    const { showLast = 4, maskChar = '*' } = options;
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length <= showLast) {
      return phone;
    }
    
    const visiblePart = cleanPhone.slice(-showLast);
    const maskedLength = cleanPhone.length - showLast;
    const masked = maskChar.repeat(maskedLength);
    
    // Preserve original formatting
    if (options.preserveFormat && phone !== cleanPhone) {
      const pattern = phone.replace(/\d/g, 'X');
      let result = masked + visiblePart;
      let resultIndex = 0;
      
      return pattern.replace(/X/g, () => {
        return result[resultIndex++] || 'X';
      });
    }
    
    return masked + visiblePart;
  }

  /**
   * Mask bank account numbers - show last 4 digits
   */
  static maskBankAccount(accountNumber: string, options: MaskingOptions = {}): string {
    if (!accountNumber) return accountNumber;
    
    const { showLast = 4, maskChar = '*' } = options;
    const cleanAccount = accountNumber.replace(/\s|-/g, '');
    
    if (cleanAccount.length <= showLast) {
      return accountNumber;
    }
    
    const visiblePart = cleanAccount.slice(-showLast);
    const maskedLength = cleanAccount.length - showLast;
    const masked = maskChar.repeat(maskedLength);
    
    return masked + visiblePart;
  }

  /**
   * Mask credit card numbers - show last 4 digits with proper formatting
   */
  static maskCreditCard(cardNumber: string, options: MaskingOptions = {}): string {
    if (!cardNumber) return cardNumber;
    
    const { showLast = 4, maskChar = '*' } = options;
    const cleanCard = cardNumber.replace(/\D/g, '');
    
    if (cleanCard.length <= showLast) {
      return cardNumber;
    }
    
    const visiblePart = cleanCard.slice(-showLast);
    const masked = maskChar.repeat(4); // Always show 4 masked groups
    
    return `${masked} ${masked} ${masked} ${visiblePart}`;
  }

  /**
   * Generic masking function for any string
   */
  static maskString(value: string, options: MaskingOptions = {}): string {
    if (!value) return value;
    
    const { 
      showFirst = 1, 
      showLast = 1, 
      maskChar = '*' 
    } = options;
    
    if (value.length <= showFirst + showLast) {
      return value;
    }
    
    const firstPart = value.slice(0, showFirst);
    const lastPart = value.slice(-showLast);
    const maskedLength = value.length - showFirst - showLast;
    const masked = maskChar.repeat(maskedLength);
    
    return `${firstPart}${masked}${lastPart}`;
  }

  /**
   * Check if user has permission to view unmasked PII
   */
  static shouldMaskForUser(userRole: string, dataType: 'iban' | 'afm' | 'amka' | 'email' | 'phone' | 'bankAccount'): boolean {
    const adminRoles = ['admin', 'hr_payroll'];
    const managerRoles = ['manager'];
    
    // Admin and HR can see most PII unmasked
    if (adminRoles.includes(userRole)) {
      return false; // Don't mask for admin/HR
    }
    
    // Managers can see some PII types unmasked
    if (managerRoles.includes(userRole)) {
      return !['email', 'phone'].includes(dataType); // Mask sensitive financial data
    }
    
    // Regular employees should see most PII masked
    return true;
  }

  /**
   * Apply masking based on user role and context
   */
  static applyContextualMasking(
    value: string, 
    dataType: 'iban' | 'afm' | 'amka' | 'email' | 'phone' | 'bankAccount',
    userRole: string,
    isOwnData = false
  ): string {
    // Users can always see their own data unmasked
    if (isOwnData) {
      return value;
    }
    
    // Apply role-based masking  
    const shouldMask = this.shouldMaskForUser(userRole, dataType as 'iban' | 'afm' | 'amka' | 'email' | 'phone' | 'bankAccount');
    if (!shouldMask) {
      return value;
    }
    
    // Apply appropriate masking based on data type
    switch (dataType) {
      case 'iban':
        return this.maskIBAN(value);
      case 'afm':
        return this.maskAFM(value);
      case 'amka':
        return this.maskAMKA(value);
      case 'email':
        return this.maskEmail(value);
      case 'phone':
        return this.maskPhone(value);
      case 'bankAccount':
        return this.maskBankAccount(value);
      default:
        return this.maskString(value);
    }
  }
}

export default PIIMasking;