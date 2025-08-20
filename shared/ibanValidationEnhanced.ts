/**
 * Enhanced Greek IBAN Validation with Performance Tracking
 * 
 * Rules implementation:
 * - IBAN: uppercase, strip spaces, verify length=27 for GR, Mod-97 == 1
 * - Decision logic: Fail → invalid IBAN → block save; Warn → name mismatch → allow override
 * - Performance: Track p95 validation time, ensure < 150ms server-side
 */

import { matchGreekNames, type NameMatchResult } from './greekNameNormalization';

export interface EnhancedIbanValidationResult {
  isValid: boolean;
  decision: 'pass' | 'warn' | 'fail';
  errors: string[];
  warnings: Array<{
    code: 'NAME_MISMATCH' | 'BANK_UNKNOWN' | 'IBAN_FORMAT_WARNING';
    message: string;
    severity: 'low' | 'medium' | 'high';
    canOverride: boolean;
  }>;
  maskedIban: string;
  bankInfo?: {
    bankCode: string;
    bankName: string;
    swift?: string;
  };
  nameMatch?: NameMatchResult;
  validationTimeMs: number;
  metrics: {
    ibanFormatValid: boolean;
    ibanChecksumValid: boolean;
    nameMatchScore: number;
    overrideRequired: boolean;
  };
}

export interface ValidationMetrics {
  totalValidations: number;
  passRate: number;
  warnRate: number;
  failRate: number;
  averageTimeMs: number;
  p95TimeMs: number;
  rejectReasons: Record<string, number>; // AC04, FF05, etc.
  overrideRate: number;
}

/**
 * Enhanced Greek Bank Registry with SEPA details
 */
const ENHANCED_GREEK_BANKS = new Map([
  ['0140', { name: 'Alpha Bank', swift: 'CRBAGRAA', sepaReachable: true }],
  ['0171', { name: 'Piraeus Bank', swift: 'PIRBGRAA', sepaReachable: true }],
  ['0110', { name: 'National Bank of Greece', swift: 'ETHNGRAA', sepaReachable: true }],
  ['0260', { name: 'Eurobank', swift: 'ERBKGRAA', sepaReachable: true }],
  ['0323', { name: 'Optima Bank', swift: 'OPTIMGRA', sepaReachable: true }],
  ['0601', { name: 'Attica Bank', swift: 'ATIKGRAA', sepaReachable: true }],
  ['0729', { name: 'Pancreta Bank', swift: 'PANCGRAA', sepaReachable: true }],
  ['0226', { name: 'Hellenic Bank Cyprus', swift: 'HEBKCYNI', sepaReachable: true }],
  ['0801', { name: 'Bank of Cyprus', swift: 'BCYPCY2N', sepaReachable: true }],
  ['0324', { name: 'Aegean Baltic Bank', swift: 'AABBGRAA', sepaReachable: true }]
]);

/**
 * Performance tracker for validation metrics
 */
class ValidationMetricsTracker {
  private validations: Array<{
    timestamp: Date;
    duration: number;
    result: 'pass' | 'warn' | 'fail';
    rejectReason?: string;
    wasOverridden: boolean;
  }> = [];
  
  record(duration: number, result: 'pass' | 'warn' | 'fail', rejectReason?: string, wasOverridden: boolean = false): void {
    this.validations.push({
      timestamp: new Date(),
      duration,
      result,
      rejectReason,
      wasOverridden
    });
    
    // Keep only last 10,000 validations for performance
    if (this.validations.length > 10000) {
      this.validations = this.validations.slice(-5000);
    }
  }
  
  getMetrics(timeRangeHours: number = 24): ValidationMetrics {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recent = this.validations.filter(v => v.timestamp > cutoff);
    
    if (recent.length === 0) {
      return {
        totalValidations: 0,
        passRate: 0,
        warnRate: 0,
        failRate: 0,
        averageTimeMs: 0,
        p95TimeMs: 0,
        rejectReasons: {},
        overrideRate: 0
      };
    }
    
    const total = recent.length;
    const passes = recent.filter(v => v.result === 'pass').length;
    const warns = recent.filter(v => v.result === 'warn').length;
    const fails = recent.filter(v => v.result === 'fail').length;
    const overrides = recent.filter(v => v.wasOverridden).length;
    
    const durations = recent.map(v => v.duration).sort((a, b) => a - b);
    const averageTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95Time = durations[p95Index] || 0;
    
    const rejectReasons: Record<string, number> = {};
    recent.forEach(v => {
      if (v.rejectReason) {
        rejectReasons[v.rejectReason] = (rejectReasons[v.rejectReason] || 0) + 1;
      }
    });
    
    return {
      totalValidations: total,
      passRate: passes / total,
      warnRate: warns / total,
      failRate: fails / total,
      averageTimeMs: averageTime,
      p95TimeMs: p95Time,
      rejectReasons,
      overrideRate: overrides / total
    };
  }
}

// Global metrics tracker
const metricsTracker = new ValidationMetricsTracker();

/**
 * Enhanced IBAN format validation
 * Rules: uppercase, strip spaces, verify length=27 for GR
 */
export function validateGreekIbanFormat(iban: string): { 
  isValid: boolean; 
  errors: string[]; 
  warnings: string[];
  cleanIban: string;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!iban) {
    errors.push('IBAN is required');
    return { isValid: false, errors, warnings, cleanIban: '' };
  }
  
  // Apply rules: uppercase, strip spaces
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Must start with GR
  if (!cleanIban.startsWith('GR')) {
    errors.push('IBAN must start with GR for Greek accounts');
    return { isValid: false, errors, warnings, cleanIban };
  }
  
  // Must be exactly 27 characters for Greek IBAN
  if (cleanIban.length !== 27) {
    errors.push(`Greek IBAN must be exactly 27 characters (got ${cleanIban.length})`);
    return { isValid: false, errors, warnings, cleanIban };
  }
  
  // Format validation: GR + 2 digits + 23 alphanumeric
  const formatRegex = /^GR\d{2}[A-Z0-9]{23}$/;
  if (!formatRegex.test(cleanIban)) {
    errors.push('Invalid Greek IBAN format (expected: GR + 2 digits + 23 alphanumeric characters)');
    return { isValid: false, errors, warnings, cleanIban };
  }
  
  return { isValid: true, errors: [], warnings, cleanIban };
}

/**
 * Validate IBAN checksum using Mod-97
 * Rules: Mod-97 == 1 for valid IBAN
 */
export function validateIbanChecksum(cleanIban: string): boolean {
  if (cleanIban.length < 4) return false;
  
  // Move first 4 characters to end: GR12... -> ...GR12
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
  
  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  let numericString = '';
  for (const char of rearranged) {
    if (char >= 'A' && char <= 'Z') {
      numericString += (char.charCodeAt(0) - 'A'.charCodeAt(0) + 10).toString();
    } else {
      numericString += char;
    }
  }
  
  // Calculate Mod-97 iteratively for large numbers
  let remainder = 0;
  for (const digit of numericString) {
    remainder = (remainder * 10 + parseInt(digit)) % 97;
  }
  
  // Must equal 1 for valid IBAN
  return remainder === 1;
}

/**
 * Enhanced IBAN masking for security
 * Format: GR** **** **** **** **** **34
 */
export function maskIbanSecurely(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  
  if (clean.length !== 27 || !clean.startsWith('GR')) {
    return clean.slice(0, 4) + '*'.repeat(Math.max(0, clean.length - 6)) + clean.slice(-2);
  }
  
  // Greek IBAN masking: show country + last 2 digits
  return `GR** **** **** **** **** **${clean.slice(-2)}`;
}

/**
 * Extract bank information from Greek IBAN
 */
function extractBankInfo(cleanIban: string): { bankCode: string; bankName: string; swift?: string } | undefined {
  if (cleanIban.length < 11 || !cleanIban.startsWith('GR')) return undefined;
  
  // Greek IBAN structure: GR + 2 check + 3 bank + 4 branch + 16 account
  const bankCode = cleanIban.slice(4, 7); // First 3 digits after check
  const bankInfo = ENHANCED_GREEK_BANKS.get(bankCode.padStart(4, '0'));
  
  if (bankInfo) {
    return {
      bankCode,
      bankName: bankInfo.name,
      swift: bankInfo.swift
    };
  }
  
  return {
    bankCode,
    bankName: 'Unknown Greek Bank'
  };
}

/**
 * Main enhanced IBAN validation function
 * Implements full decision logic: Fail vs Warn with performance tracking
 */
export function validateIbanEnhanced(
  iban: string,
  employeeName?: string,
  accountHolderName?: string,
  nameThreshold: number = 0.80
): EnhancedIbanValidationResult {
  
  const startTime = Date.now();
  
  // Format validation
  const formatResult = validateGreekIbanFormat(iban);
  if (!formatResult.isValid) {
    const duration = Date.now() - startTime;
    metricsTracker.record(duration, 'fail', 'INVALID_IBAN_FORMAT');
    
    return {
      isValid: false,
      decision: 'fail', // Block save for invalid IBAN
      errors: formatResult.errors,
      warnings: [],
      maskedIban: maskIbanSecurely(iban),
      validationTimeMs: duration,
      metrics: {
        ibanFormatValid: false,
        ibanChecksumValid: false,
        nameMatchScore: 0,
        overrideRequired: false
      }
    };
  }
  
  // Checksum validation
  const checksumValid = validateIbanChecksum(formatResult.cleanIban);
  if (!checksumValid) {
    const duration = Date.now() - startTime;
    metricsTracker.record(duration, 'fail', 'INVALID_IBAN_CHECKSUM');
    
    return {
      isValid: false,
      decision: 'fail', // Block save for invalid checksum
      errors: ['Invalid IBAN checksum - please verify the account number'],
      warnings: [],
      maskedIban: maskIbanSecurely(formatResult.cleanIban),
      validationTimeMs: duration,
      metrics: {
        ibanFormatValid: true,
        ibanChecksumValid: false,
        nameMatchScore: 0,
        overrideRequired: false
      }
    };
  }
  
  // Extract bank information
  const bankInfo = extractBankInfo(formatResult.cleanIban);
  
  // Name matching (if provided)
  let nameMatch: NameMatchResult | undefined;
  let nameWarnings: EnhancedIbanValidationResult['warnings'] = [];
  
  if (employeeName && accountHolderName) {
    nameMatch = matchGreekNames(employeeName, accountHolderName, nameThreshold);
    
    if (!nameMatch.isAcceptable) {
      let severity: 'low' | 'medium' | 'high' = 'high';
      
      if (nameMatch.score >= 0.70) severity = 'medium';
      if (nameMatch.score >= 0.50) severity = 'medium';
      if (nameMatch.edgeCaseDetected) severity = 'medium';
      
      nameWarnings.push({
        code: 'NAME_MISMATCH',
        message: `Account holder name "${accountHolderName}" does not match employee name "${employeeName}". ${nameMatch.reason}`,
        severity,
        canOverride: true
      });
    }
  }
  
  // Additional warnings
  const warnings: EnhancedIbanValidationResult['warnings'] = [...nameWarnings];
  
  if (!bankInfo || bankInfo.bankName === 'Unknown Greek Bank') {
    warnings.push({
      code: 'BANK_UNKNOWN',
      message: 'Bank could not be identified from IBAN',
      severity: 'low',
      canOverride: true
    });
  }
  
  // Decision logic
  let decision: 'pass' | 'warn' | 'fail' = 'pass';
  let isValid = true;
  let overrideRequired = false;
  
  if (nameMatch && !nameMatch.isAcceptable) {
    decision = 'warn'; // Allow override with reason
    overrideRequired = true;
  }
  
  if (warnings.some(w => w.severity === 'high')) {
    decision = 'warn';
    overrideRequired = true;
  }
  
  const duration = Date.now() - startTime;
  
  // Record metrics
  let rejectReason: string | undefined;
  if (decision === 'fail') {
    rejectReason = 'IBAN_INVALID';
  } else if (decision === 'warn') {
    rejectReason = 'NAME_MISMATCH';
  }
  metricsTracker.record(duration, decision, rejectReason);
  
  return {
    isValid,
    decision,
    errors: [],
    warnings,
    maskedIban: maskIbanSecurely(formatResult.cleanIban),
    bankInfo,
    nameMatch,
    validationTimeMs: duration,
    metrics: {
      ibanFormatValid: true,
      ibanChecksumValid: true,
      nameMatchScore: nameMatch?.score || 1.0,
      overrideRequired
    }
  };
}

/**
 * Get validation metrics for monitoring
 */
export function getValidationMetrics(timeRangeHours: number = 24): ValidationMetrics {
  return metricsTracker.getMetrics(timeRangeHours);
}

/**
 * Reset metrics (for testing)
 */
export function resetValidationMetrics(): void {
  // @ts-ignore - accessing private property for reset
  metricsTracker.validations = [];
}