// RFC 5322 compliant email validation (simplified but comprehensive)
const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];

  // Minimum length requirement
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  // Character class requirements - need at least 3 out of 4
  const characterClasses = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  const classCount = Object.values(characterClasses).filter(Boolean).length;

  if (classCount < 3) {
    errors.push(
      'Password must contain at least 3 of the following: uppercase letter, lowercase letter, number, special character'
    );
  }

  // Common password patterns to avoid
  const commonPatterns = [
    /(.)\1{2,}/, // Three or more repeated characters
    /123|abc|qwe/i, // Sequential patterns
    /password|admin|login/i, // Common words
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    errors.push('Password contains common patterns that should be avoided');
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (password.length >= 12 && classCount >= 3) {
    strength = classCount === 4 && password.length >= 16 ? 'strong' : 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): boolean {
  return password === confirmPassword && password.length > 0;
}

// CSRF token utilities
export function getCSRFToken(): string {
  const token = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');
  return token || '';
}

export function addCSRFHeader(headers: HeadersInit = {}): HeadersInit {
  const csrfToken = getCSRFToken();
  return {
    ...headers,
    'X-CSRF-Token': csrfToken,
  };
}
