/**
 * Greek validation utilities for AFM, AMKA, and other Greek-specific fields
 */

/**
 * Validate Greek AFM (Tax Identification Number)
 * AFM must be exactly 9 digits and pass the checksum validation
 */
export function validateAfm(afm: string): boolean {
  // Remove any non-digit characters
  const cleanAfm = afm.replace(/\D/g, '');
  
  // Must be exactly 9 digits
  if (cleanAfm.length !== 9) {
    return false;
  }
  
  // Convert to array of numbers
  const digits = cleanAfm.split('').map(Number);
  
  // Calculate checksum using the official AFM algorithm
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * Math.pow(2, 8 - i);
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;
  
  return checkDigit === digits[8];
}

/**
 * Validate Greek AMKA (Social Security Number)
 * AMKA must be exactly 11 digits and pass basic validation
 */
export function validateAmka(amka: string): boolean {
  // Remove any non-digit characters
  const cleanAmka = amka.replace(/\D/g, '');
  
  // Must be exactly 11 digits
  if (cleanAmka.length !== 11) {
    return false;
  }
  
  // Convert to array of numbers
  const digits = cleanAmka.split('').map(Number);
  
  // Basic date validation (first 6 digits should represent a valid date DDMMYY)
  const day = digits[0] * 10 + digits[1];
  const month = digits[2] * 10 + digits[3];
  const year = digits[4] * 10 + digits[5];
  
  // Basic range checks
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  
  // Calculate checksum using Luhn algorithm
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = digits[i];
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit = Math.floor(digit / 10) + (digit % 10);
      }
    }
    sum += digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[10];
}

/**
 * Format AFM for display (add spaces or dashes as needed)
 */
export function formatAfm(afm: string): string {
  const cleanAfm = afm.replace(/\D/g, '');
  if (cleanAfm.length === 9) {
    return `${cleanAfm.slice(0, 3)}-${cleanAfm.slice(3, 6)}-${cleanAfm.slice(6)}`;
  }
  return cleanAfm;
}

/**
 * Format AMKA for display
 */
export function formatAmka(amka: string): string {
  const cleanAmka = amka.replace(/\D/g, '');
  if (cleanAmka.length === 11) {
    return `${cleanAmka.slice(0, 2)}/${cleanAmka.slice(2, 4)}/${cleanAmka.slice(4, 6)}-${cleanAmka.slice(6)}`;
  }
  return cleanAmka;
}

/**
 * Validate Greek postal code (5 digits)
 */
export function validateGreekPostalCode(postalCode: string): boolean {
  const cleanCode = postalCode.replace(/\D/g, '');
  return cleanCode.length === 5 && parseInt(cleanCode) >= 10000 && parseInt(cleanCode) <= 99999;
}

/**
 * Validate Greek phone number
 * Accepts landline (10 digits starting with 2) and mobile (10 digits starting with 69)
 */
export function validateGreekPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Must be exactly 10 digits
  if (cleanPhone.length !== 10) {
    return false;
  }
  
  // Landline numbers start with 2, mobile with 69
  return cleanPhone.startsWith('2') || cleanPhone.startsWith('69');
}

/**
 * Format Greek phone number for display
 */
export function formatGreekPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length === 10) {
    if (cleanPhone.startsWith('2')) {
      // Landline format: 210-1234567
      return `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3)}`;
    } else if (cleanPhone.startsWith('69')) {
      // Mobile format: 697-1234567
      return `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3)}`;
    }
  }
  
  return cleanPhone;
}

/**
 * Validate Greek ID card number
 * Format: 2 letters followed by 6 digits (e.g., AB123456)
 */
export function validateGreekIdCard(idCard: string): boolean {
  const cleanId = idCard.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (cleanId.length !== 8) {
    return false;
  }
  
  // First 2 characters must be letters, last 6 must be digits
  const letters = cleanId.slice(0, 2);
  const numbers = cleanId.slice(2);
  
  return /^[A-Z]{2}$/.test(letters) && /^[0-9]{6}$/.test(numbers);
}

/**
 * Format Greek ID card for display
 */
export function formatGreekIdCard(idCard: string): string {
  const cleanId = idCard.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (cleanId.length === 8) {
    return `${cleanId.slice(0, 2)} ${cleanId.slice(2)}`;
  }
  
  return cleanId;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get validation message for AFM
 */
export function getAfmValidationMessage(afm: string): string {
  if (!afm) return "";
  
  const cleanAfm = afm.replace(/\D/g, '');
  
  if (cleanAfm.length === 0) return "";
  if (cleanAfm.length < 9) return "Το ΑΦΜ πρέπει να έχει 9 ψηφία";
  if (cleanAfm.length > 9) return "Το ΑΦΜ δεν μπορεί να έχει περισσότερα από 9 ψηφία";
  if (!validateAfm(cleanAfm)) return "Μη έγκυρο ΑΦΜ";
  
  return "Έγκυρο ΑΦΜ";
}

/**
 * Get validation message for AMKA
 */
export function getAmkaValidationMessage(amka: string): string {
  if (!amka) return "";
  
  const cleanAmka = amka.replace(/\D/g, '');
  
  if (cleanAmka.length === 0) return "";
  if (cleanAmka.length < 11) return "Το ΑΜΚΑ πρέπει να έχει 11 ψηφία";
  if (cleanAmka.length > 11) return "Το ΑΜΚΑ δεν μπορεί να έχει περισσότερα από 11 ψηφία";
  if (!validateAmka(cleanAmka)) return "Μη έγκυρο ΑΜΚΑ";
  
  return "Έγκυρο ΑΜΚΑ";
}

/**
 * Real-time AFM input formatter
 * Removes non-digits and limits to 9 characters
 */
export function formatAfmInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

/**
 * Real-time AMKA input formatter
 * Removes non-digits and limits to 11 characters
 */
export function formatAmkaInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

/**
 * EFKA Insurance Categories
 * Main social insurance categories in Greece
 */
export const EFKA_INSURANCE_CATEGORIES = [
  "IKA", // Ίδρυμα Κοινωνικών Ασφαλίσεων (General Social Security)
  "OAEE", // Οργανισμός Ασφάλισης Ελευθέρων Επαγγελματιών (Freelancers)
  "ETAA", // Ενιαίο Ταμείο Ανεξάρτητα Απασχολουμένων (Independent Workers)
  "OTHER", // Άλλο
];

/**
 * EFKA Insurance Packages
 * Specific coverage types within each category
 */
export const EFKA_INSURANCE_PACKAGES = [
  "FULL_COVERAGE", // Πλήρης Κάλυψη
  "BASIC_COVERAGE", // Βασική Κάλυψη
  "REDUCED_COVERAGE", // Μειωμένη Κάλυψη
  "SPECIAL_COVERAGE", // Ειδική Κάλυψη
];

/**
 * Special Insurance Categories
 * For special cases and professions
 */
export const SPECIAL_INSURANCE_CATEGORIES = [
  "HEAVY_UNHEALTHY", // Βαρέα & Ανθυγιεινά
  "HAZARDOUS", // Επικίνδυνα
  "MARITIME", // Ναυτιλιακά
  "MILITARY", // Στρατιωτικά
  "POLICE", // Αστυνομικά
  "FIREFIGHTER", // Πυροσβεστικά
  "JOURNALIST", // Δημοσιογραφικά
  "ARTIST", // Καλλιτεχνικά
  "ATHLETE", // Αθλητικά
  "NONE", // Καμία
];

/**
 * EFKA Fund Affiliations
 * Specific fund assignments within EFKA
 */
export const EFKA_FUND_AFFILIATIONS = [
  "MAIN_FUND", // Κύριο Ταμείο
  "AUXILIARY_FUND", // Επικουρικό Ταμείο
  "HEALTH_FUND", // Ταμείο Υγείας
  "UNEMPLOYMENT_FUND", // Ταμείο Ανεργίας
  "FAMILY_BENEFITS", // Οικογενειακές Παροχές
];

/**
 * Worker Classifications
 * Employment types and worker categories
 */
export const WORKER_CLASSIFICATIONS = [
  "EMPLOYEE", // Μισθωτός
  "INDEPENDENT_CONTRACTOR", // Ανεξάρτητος Συνεργάτης
  "SEASONAL", // Εποχιακός Εργαζόμενος
  "APPRENTICE", // Μαθητευόμενος
  "INTERN", // Ασκούμενος
  "TEMPORARY", // Προσωρινός
];

/**
 * Independent Contractor Classifications
 * Specific classifications for freelance work
 */
export const INDEPENDENT_CONTRACTOR_CLASSES = [
  "PROFESSIONAL", // Επαγγελματίας
  "ARTIST", // Καλλιτέχνης
  "TECHNICAL", // Τεχνικός
  "CONSULTANT", // Σύμβουλος
  "SERVICES", // Παροχή Υπηρεσιών
  "OTHER", // Άλλο
];

/**
 * Disability Types
 * Categories of disabilities for support classification
 */
export const DISABILITY_TYPES = [
  "PHYSICAL", // Σωματική
  "MENTAL", // Διανοητική
  "SENSORY", // Αισθητηριακή
  "MULTIPLE", // Πολλαπλή
  "PSYCHOSOCIAL", // Ψυχοκοινωνική
  "CHRONIC", // Χρόνια Πάθηση
];

/**
 * Validate disability percentage (0-100%)
 */
export function validateDisabilityPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100 && Number.isInteger(percentage);
}

/**
 * Calculate young worker status based on birth date
 */
export function calculateYoungWorkerStatus(dateOfBirth: Date): boolean {
  const today = new Date();
  const age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    return (age - 1) < 25;
  }
  
  return age < 25;
}

/**
 * Greek tax office (ΔΟΥ) list
 * Common Greek tax offices for dropdown selection
 */
export const GREEK_TAX_OFFICES = [
  "Α' Αθηνών",
  "Β' Αθηνών",
  "Γ' Αθηνών",
  "Δ' Αθηνών",
  "Ε' Αθηνών",
  "ΣΤ' Αθηνών",
  "Ζ' Αθηνών",
  "Η' Αθηνών",
  "Θ' Αθηνών",
  "Ι' Αθηνών",
  "ΙΑ' Αθηνών",
  "ΙΒ' Αθηνών",
  "Α' Πειραιώς",
  "Β' Πειραιώς",
  "Γ' Πειραιώς",
  "Δ' Πειραιώς",
  "Α' Θεσσαλονίκης",
  "Β' Θεσσαλονίκης",
  "Γ' Θεσσαλονίκης",
  "Δ' Θεσσαλονίκης",
  "Πάτρας",
  "Λάρισας",
  "Βόλου",
  "Ηρακλείου",
  "Ιωαννίνων",
  "Καβάλας",
  "Κομοτηνής",
  "Κορίνθου",
  "Λαμίας",
  "Μυτιλήνης",
  "Ναυπλίου",
  "Ξάνθης",
  "Ρεθύμνου",
  "Ρόδου",
  "Σερρών",
  "Τρικάλων",
  "Χανίων",
];

// Military Service Validation Functions
export function validateMilitaryServiceStatus(status: string): boolean {
  const validStatuses = ['COMPLETED', 'POSTPONED', 'EXEMPT', 'PENDING', 'NOT_APPLICABLE'];
  return validStatuses.includes(status);
}

export function validateMilitaryServiceBranch(branch: string): boolean {
  const validBranches = ['ARMY', 'NAVY', 'AIR_FORCE', 'ALTERNATIVE_SERVICE'];
  return validBranches.includes(branch);
}

export function isMilitaryServiceRequired(birthDate: string, gender: string): boolean {
  if (gender !== 'MALE') return false;
  
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  
  // Military service is generally required for Greek male citizens aged 18-45
  return age >= 18 && age <= 45;
}

export function getMilitaryServiceStatusOptions() {
  return [
    { value: 'COMPLETED', label: 'Ολοκληρώθηκε' },
    { value: 'POSTPONED', label: 'Αναβολή' },
    { value: 'EXEMPT', label: 'Απαλλαγή' },
    { value: 'PENDING', label: 'Εκκρεμεί' },
    { value: 'NOT_APPLICABLE', label: 'Δεν Απαιτείται' }
  ];
}

export function getMilitaryServiceBranchOptions() {
  return [
    { value: 'ARMY', label: 'Στρατός Ξηράς' },
    { value: 'NAVY', label: 'Πολεμικό Ναυτικό' },
    { value: 'AIR_FORCE', label: 'Πολεμική Αεροπορία' },
    { value: 'ALTERNATIVE_SERVICE', label: 'Εναλλακτική Υπηρεσία' }
  ];
}

export function getDocumentExpiryStatus(expiryDate: string | null): { status: 'valid' | 'warning' | 'expired'; message: string } {
  if (!expiryDate) return { status: 'valid', message: 'Δεν έχει οριστεί ημερομηνία λήξης' };
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return { status: 'expired', message: `Έληξε πριν ${Math.abs(daysUntilExpiry)} ημέρες` };
  } else if (daysUntilExpiry <= 30) {
    return { status: 'warning', message: `Λήγει σε ${daysUntilExpiry} ημέρες` };
  } else {
    return { status: 'valid', message: `Ισχύει για ${daysUntilExpiry} ημέρες` };
  }
}
