// RFC 5322 compliant email validation (simplified but comprehensive)
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return emailRegex.test(email);
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number; // 0-100
  isBreached: boolean;
  suggestions: string[];
}

export async function validatePassword(password: string): Promise<PasswordValidationResult> {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;
  
  // NIST 800-63B compliant validation - minimum 8 characters (not arbitrary complexity)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += Math.min(password.length * 2, 30); // Up to 30 points for length
  }

  // Check character diversity but don't require it (NIST guidance)
  const characterClasses = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  const classCount = Object.values(characterClasses).filter(Boolean).length;
  score += classCount * 10; // Up to 40 points for character diversity

  // Common password patterns to avoid (NIST guidance)
  const commonPatterns = [
    { pattern: /(.)\1{2,}/, message: 'Avoid repeated characters', points: -15 },
    { pattern: /123|abc|qwe|zaq|wsx|cde/i, message: 'Avoid sequential patterns', points: -20 },
    { pattern: /password|admin|login|user|test|demo|guest/i, message: 'Avoid common words', points: -25 },
    { pattern: /^[a-z]+$/i, message: 'Consider adding numbers or special characters', points: -10 },
    { pattern: /^[0-9]+$/, message: 'Consider adding letters', points: -15 },
  ];

  commonPatterns.forEach(({ pattern, message, points }) => {
    if (pattern.test(password)) {
      suggestions.push(message);
      score += points;
    }
  });

  // Check against breached passwords (simulated - in production would call HaveIBeenPwned API)
  const isBreached = await checkBreachedPassword(password);
  if (isBreached) {
    errors.push('This password has been found in data breaches. Please choose a different password.');
    score = Math.min(score, 20); // Cap score if breached
  }

  // Entropy-based scoring for additional security
  const entropy = calculatePasswordEntropy(password);
  score += Math.min(entropy / 2, 30); // Up to 30 points for entropy

  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine strength based on score and security factors
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 70 && password.length >= 12 && !isBreached) {
    strength = 'strong';
  } else if (score >= 50 && password.length >= 10 && !isBreached) {
    strength = 'medium';
  }

  // Add helpful suggestions
  if (password.length < 12) {
    suggestions.push('Consider using 12+ characters for better security');
  }
  if (classCount < 3) {
    suggestions.push('Mix different character types (letters, numbers, symbols)');
  }
  if (!/\s/.test(password) && password.length < 20) {
    suggestions.push('Consider using a passphrase with spaces');
  }

  return {
    isValid: errors.length === 0 && password.length >= 8,
    errors,
    strength,
    score,
    isBreached,
    suggestions,
  };
}

// Synchronous version for backward compatibility
export function validatePasswordSync(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  
  // NIST 800-63B: minimum 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check against common patterns
  const commonPatterns = [
    /(.)\1{2,}/, // Three or more repeated characters
    /123|abc|qwe/i, // Sequential patterns
    /password|admin|login/i, // Common words
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password contains common patterns that should be avoided');
  }

  // Character diversity for strength assessment (not required)
  const characterClasses = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  const classCount = Object.values(characterClasses).filter(Boolean).length;
  
  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (password.length >= 12 && classCount >= 3) {
    strength = classCount === 4 && password.length >= 16 ? 'strong' : 'medium';
  } else if (password.length >= 10 && classCount >= 2) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

async function checkBreachedPassword(password: string): Promise<boolean> {
  try {
    // In production, this would use HaveIBeenPwned API with k-anonymity
    // For now, simulate breach checking with common passwords
    const commonBreachedPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty', 
      'letmein', 'welcome', '123456789', 'password1', 'abc123'
    ];
    
    const isCommonBreached = commonBreachedPasswords.some(breached => 
      password.toLowerCase().includes(breached.toLowerCase())
    );

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return isCommonBreached;
  } catch (error) {
    console.warn('Breach check failed, allowing password:', error);
    return false; // Fail open for security
  }
}

function calculatePasswordEntropy(password: string): number {
  const charsets = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    space: ' ',
  };

  let characterSpace = 0;
  if (/[a-z]/.test(password)) characterSpace += charsets.lowercase.length;
  if (/[A-Z]/.test(password)) characterSpace += charsets.uppercase.length;
  if (/[0-9]/.test(password)) characterSpace += charsets.digits.length;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) characterSpace += charsets.special.length;
  if (/\s/.test(password)) characterSpace += 1;

  // Calculate entropy: log2(characterSpace^length)
  return Math.log2(Math.pow(characterSpace, password.length));
}

export function validatePasswordMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword && password.length > 0;
}

// CSRF token utilities
export function getCSRFToken(): string {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  return token || '';
}

export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const csrfToken = getCSRFToken();
  return {
    ...headers,
    'X-CSRF-Token': csrfToken,
  };
}