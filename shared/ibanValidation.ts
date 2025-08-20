/**
 * IBAN Validation and Utilities for Greek Banking
 * Implements format validation, Mod-97 checksum, and Greek-specific validations
 */

export interface IbanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  formattedIban?: string;
  maskedIban?: string;
  bankCode?: string;
  bankName?: string;
}

export interface NameMatchResult {
  similarity: number; // 0-100
  isMatch: boolean;
  reason: string;
  suggestedMatch?: string;
}

/**
 * Greek Bank Code to Name Mapping
 */
const GREEK_BANK_CODES: Record<string, string> = {
  '0140': 'Alpha Bank',
  '0171': 'Piraeus Bank', 
  '0110': 'National Bank of Greece',
  '0260': 'Eurobank',
  '0323': 'Optima Bank',
  '0601': 'Attica Bank',
  '0729': 'Pancreta Bank',
  '0226': 'Hellenic Bank Cyprus',
  '0801': 'Bank of Cyprus',
  '0324': 'Aegean Baltic Bank'
};

/**
 * IBAN Character Mapping for Mod-97 Calculation
 */
const CHAR_MAP: Record<string, string> = {
  'A': '10', 'B': '11', 'C': '12', 'D': '13', 'E': '14', 'F': '15',
  'G': '16', 'H': '17', 'I': '18', 'J': '19', 'K': '20', 'L': '21',
  'M': '22', 'N': '23', 'O': '24', 'P': '25', 'Q': '26', 'R': '27',
  'S': '28', 'T': '29', 'U': '30', 'V': '31', 'W': '32', 'X': '33',
  'Y': '34', 'Z': '35'
};

/**
 * Format IBAN with spaces for display
 */
export function formatIbanDisplay(iban: string): string {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return cleanIban.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Mask IBAN for secure display (GR** **** **** **** **** **34)
 */
export function maskIban(iban: string): string {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  if (cleanIban.length < 6) {
    return cleanIban;
  }
  
  // Show first 2 characters (country) + checksum (positions 2-3) + last 2 characters
  const country = cleanIban.substring(0, 2);
  const checksum = '**';
  const lastTwo = cleanIban.substring(cleanIban.length - 2);
  const middleLength = cleanIban.length - 6;
  
  // Create middle section with groups of 4 asterisks
  const middleGroups = Math.ceil(middleLength / 4);
  const middle = Array(middleGroups).fill('****').join(' ');
  
  return `${country}${checksum} ${middle} ${lastTwo}`;
}

/**
 * Validate IBAN format and structure
 */
export function validateIbanFormat(iban: string): IbanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Basic format check
  if (!cleanIban) {
    errors.push('IBAN is required');
    return { isValid: false, errors, warnings };
  }
  
  // Check if starts with country code
  if (!/^[A-Z]{2}/.test(cleanIban)) {
    errors.push('IBAN must start with 2-letter country code');
  }
  
  // Check if followed by 2-digit check digits
  if (!/^[A-Z]{2}\d{2}/.test(cleanIban)) {
    errors.push('IBAN must have 2-digit check digits after country code');
  }
  
  // Greek-specific validation
  if (cleanIban.startsWith('GR')) {
    if (cleanIban.length !== 27) {
      errors.push('Greek IBAN must be exactly 27 characters long');
    }
    
    // Validate Greek BBAN structure: 7-digit bank code + 16-digit account number
    const bban = cleanIban.substring(4);
    if (bban.length === 23 && !/^\d{7}\d{16}$/.test(bban)) {
      warnings.push('Greek BBAN structure may be incorrect (expected: 7-digit bank code + 16-digit account)');
    }
  }
  
  // General IBAN length validation (15-34 characters)
  if (cleanIban.length < 15 || cleanIban.length > 34) {
    errors.push('IBAN length must be between 15-34 characters');
  }
  
  // Character validation (only alphanumeric)
  if (!/^[A-Z0-9]+$/.test(cleanIban)) {
    errors.push('IBAN can only contain letters and numbers');
  }
  
  const formattedIban = formatIbanDisplay(cleanIban);
  const maskedIban = maskIban(cleanIban);
  
  // Extract bank info for Greek IBANs
  let bankCode: string | undefined;
  let bankName: string | undefined;
  
  if (cleanIban.startsWith('GR') && cleanIban.length >= 11) {
    bankCode = cleanIban.substring(4, 8); // First 4 digits of BBAN
    bankName = GREEK_BANK_CODES[bankCode] || 'Unknown Greek Bank';
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    formattedIban,
    maskedIban,
    bankCode,
    bankName
  };
}

/**
 * Validate IBAN using Mod-97 checksum algorithm
 */
export function validateIbanChecksum(iban: string): boolean {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  if (cleanIban.length < 4) {
    return false;
  }
  
  // Move first 4 characters to end: IBAN -> BBAN + country + check
  const rearranged = cleanIban.substring(4) + cleanIban.substring(0, 4);
  
  // Replace letters with numbers
  let numericString = '';
  for (const char of rearranged) {
    if (char in CHAR_MAP) {
      numericString += CHAR_MAP[char];
    } else {
      numericString += char;
    }
  }
  
  // Calculate Mod-97
  // For very long numbers, we need to handle this iteratively
  return calculateMod97(numericString) === 1;
}

/**
 * Calculate Mod-97 for large numbers (iterative approach)
 */
function calculateMod97(numericString: string): number {
  let remainder = 0;
  
  for (const digit of numericString) {
    remainder = (remainder * 10 + parseInt(digit)) % 97;
  }
  
  return remainder;
}

/**
 * Complete IBAN validation (format + checksum)
 */
export function validateIban(iban: string): IbanValidationResult {
  const formatResult = validateIbanFormat(iban);
  
  if (!formatResult.isValid) {
    return formatResult;
  }
  
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Validate checksum
  if (!validateIbanChecksum(cleanIban)) {
    formatResult.errors.push('IBAN checksum is invalid');
    formatResult.isValid = false;
  }
  
  return formatResult;
}

/**
 * Fuzzy match between employee name and account holder name
 */
export function matchAccountHolderName(
  employeeName: string,
  accountHolderName: string
): NameMatchResult {
  
  // Normalize names: remove accents, special characters, convert to lowercase
  const normalizeGreekName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/ά|ὰ|ἀ|ἁ|ἄ|ἅ|ἂ|ἃ|ᾶ|ᾱ|ᾰ/g, 'α')
      .replace(/έ|ὲ|ἐ|ἑ|ἔ|ἕ|ἒ|ἓ/g, 'ε')
      .replace(/ή|ὴ|ἠ|ἡ|ἤ|ἥ|ἢ|ἣ|ῆ/g, 'η')
      .replace(/ί|ὶ|ἰ|ἱ|ἴ|ἵ|ἲ|ἳ|ῖ|ῑ|ῐ/g, 'ι')
      .replace(/ό|ὸ|ὀ|ὁ|ὄ|ὅ|ὂ|ὃ/g, 'ο')
      .replace(/ύ|ὺ|ὐ|ὑ|ὔ|ὕ|ὒ|ὓ|ῦ|ῡ|ῠ/g, 'υ')
      .replace(/ώ|ὼ|ὠ|ὡ|ὤ|ὥ|ὢ|ὣ|ῶ/g, 'ω')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const normalizedEmployee = normalizeGreekName(employeeName);
  const normalizedAccount = normalizeGreekName(accountHolderName);
  
  // Exact match after normalization
  if (normalizedEmployee === normalizedAccount) {
    return {
      similarity: 100,
      isMatch: true,
      reason: 'Exact match after normalization'
    };
  }
  
  // Calculate Levenshtein distance similarity
  const similarity = calculateStringSimilarity(normalizedEmployee, normalizedAccount);
  
  // Check if names are just reversed (First Last vs Last First)
  const employeeParts = normalizedEmployee.split(' ');
  const accountParts = normalizedAccount.split(' ');
  
  if (employeeParts.length === 2 && accountParts.length === 2) {
    const reversedMatch = employeeParts[0] === accountParts[1] && employeeParts[1] === accountParts[0];
    if (reversedMatch) {
      return {
        similarity: 95,
        isMatch: true,
        reason: 'Name order reversed (First/Last swapped)'
      };
    }
  }
  
  // Check partial matches (both names contain similar parts)
  const containsMatch = employeeParts.some(part => 
    part.length > 2 && accountParts.some(accountPart => 
      accountPart.includes(part) || part.includes(accountPart)
    )
  );
  
  let isMatch = false;
  let reason = '';
  
  if (similarity >= 85) {
    isMatch = true;
    reason = 'Very similar names (minor differences)';
  } else if (similarity >= 70) {
    isMatch = false;
    reason = 'Similar but significant differences';
  } else if (containsMatch) {
    isMatch = false;
    reason = 'Partial name match found';
  } else {
    isMatch = false;
    reason = 'Names appear significantly different';
  }
  
  return {
    similarity,
    isMatch,
    reason,
    suggestedMatch: similarity > 50 ? normalizedAccount : undefined
  };
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 100 : 0;
  if (len2 === 0) return 0;
  
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  const similarity = Math.round(((maxLength - distance) / maxLength) * 100);
  
  return Math.max(0, similarity);
}

/**
 * Generate IBAN for testing (Greek format)
 */
export function generateTestIban(bankCode: string = '0140'): string {
  const countryCode = 'GR';
  const checkDigits = '00'; // Temporary, will be calculated
  const bban = bankCode.padStart(7, '0') + Math.random().toString().substr(2, 16);
  
  // Calculate check digits
  const tempIban = countryCode + checkDigits + bban;
  const rearranged = bban + countryCode + checkDigits;
  
  let numericString = '';
  for (const char of rearranged) {
    if (char in CHAR_MAP) {
      numericString += CHAR_MAP[char];
    } else {
      numericString += char;
    }
  }
  
  const mod = calculateMod97(numericString);
  const calculatedCheck = (98 - mod).toString().padStart(2, '0');
  
  return countryCode + calculatedCheck + bban;
}