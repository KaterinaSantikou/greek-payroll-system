/**
 * Greek-specific validation functions for AFM and AMKA
 */

/**
 * Validate Greek Tax ID (AFM)
 * AFM is 9 digits with a specific checksum algorithm
 */
export function validateAFM(afm: string): boolean {
  if (!afm || typeof afm !== 'string') return false;
  
  // Remove any spaces or non-digit characters
  const cleanAfm = afm.replace(/\D/g, '');
  
  // Must be exactly 9 digits
  if (cleanAfm.length !== 9) return false;
  
  // Cannot start with 0
  if (cleanAfm[0] === '0') return false;
  
  // Calculate checksum
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleanAfm[i]) * Math.pow(2, 8 - i);
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;
  
  return parseInt(cleanAfm[8]) === checkDigit;
}

/**
 * Validate Greek Social Security Number (AMKA) 
 * AMKA is 11 digits: DDMMYYYYYY + 1 check digit
 */
export function validateAMKA(amka: string): boolean {
  if (!amka || typeof amka !== 'string') return false;
  
  // Remove any spaces or non-digit characters
  const cleanAmka = amka.replace(/\D/g, '');
  
  // Must be exactly 11 digits
  if (cleanAmka.length !== 11) return false;
  
  // Extract date parts
  const day = parseInt(cleanAmka.substring(0, 2));
  const month = parseInt(cleanAmka.substring(2, 4)); 
  const year = parseInt(cleanAmka.substring(4, 8));
  
  // Validate date components
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;
  
  // Validate date existence
  try {
    const date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return false;
    }
  } catch {
    return false;
  }
  
  // Calculate Luhn checksum
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(cleanAmka[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return parseInt(cleanAmka[10]) === checkDigit;
}

/**
 * Format AFM for display (XXX XXX XXX)
 */
export function formatAFM(afm: string): string {
  const clean = afm.replace(/\D/g, '');
  if (clean.length !== 9) return afm;
  
  return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 9)}`;
}

/**
 * Format AMKA for display (XXXX XXXXXX X)  
 */
export function formatAMKA(amka: string): string {
  const clean = amka.replace(/\D/g, '');
  if (clean.length !== 11) return amka;
  
  return `${clean.substring(0, 4)} ${clean.substring(4, 10)} ${clean.substring(10, 11)}`;
}