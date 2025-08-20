export interface LocalizedMessages {
  // Email verification messages
  EMAIL_VERIFICATION_SENT: string;
  EMAIL_VERIFICATION_RESEND: string;
  EMAIL_VERIFICATION_SUCCESS: string;
  EMAIL_VERIFICATION_EXPIRED: string;

  // MFA messages  
  MFA_CODE_PROMPT: string;
  MFA_CODE_INVALID: string;
  MFA_SETUP_REQUIRED: string;

  // Password reset messages
  PASSWORD_RESET_SENT: string;
  PASSWORD_RESET_SUCCESS: string;
  PASSWORD_RESET_EXPIRED: string;

  // Login/signup messages
  LOGIN_SUCCESS: string;
  SIGNUP_SUCCESS: string;
  INVALID_CREDENTIALS: string;
  ACCOUNT_LOCKED: string;

  // GDPR messages
  GDPR_CONSENT_REQUIRED: string;
  DATA_EXPORTED: string;
  ACCOUNT_DELETED: string;

  // Error messages (uniform to prevent enumeration)
  GENERIC_ERROR: string;
  RATE_LIMITED: string;
  ACCESS_DENIED: string;
}

const EN_MESSAGES: LocalizedMessages = {
  EMAIL_VERIFICATION_SENT: "We've sent a verification link to {{email}}. It expires in 15 minutes.",
  EMAIL_VERIFICATION_RESEND: "Having trouble? Resend email",
  EMAIL_VERIFICATION_SUCCESS: "Email verified successfully. You can now sign in.",
  EMAIL_VERIFICATION_EXPIRED: "Verification link has expired. Please request a new one.",

  MFA_CODE_PROMPT: "Enter the 6-digit code from your authenticator app.",
  MFA_CODE_INVALID: "Invalid authentication code. Please try again.",
  MFA_SETUP_REQUIRED: "Multi-factor authentication setup is required.",

  PASSWORD_RESET_SENT: "If an account with that email exists, you will receive a password reset link.",
  PASSWORD_RESET_SUCCESS: "Password reset successfully. You can now sign in with your new password.",
  PASSWORD_RESET_EXPIRED: "Password reset link has expired. Please request a new one.",

  LOGIN_SUCCESS: "Welcome back! You have been signed in successfully.",
  SIGNUP_SUCCESS: "Account created successfully. Please check your email to verify your account.",
  INVALID_CREDENTIALS: "Invalid email or password. Please check your credentials and try again.",
  ACCOUNT_LOCKED: "Account temporarily locked due to too many failed attempts. Please try again later.",

  GDPR_CONSENT_REQUIRED: "You must accept the Terms of Service and Privacy Policy to continue.",
  DATA_EXPORTED: "Your account data has been prepared for download.",
  ACCOUNT_DELETED: "Your account and all associated data have been permanently deleted.",

  GENERIC_ERROR: "An error occurred. Please try again later.",
  RATE_LIMITED: "Too many requests. Please wait before trying again.",
  ACCESS_DENIED: "Access denied. Please check your permissions.",
};

const EL_MESSAGES: LocalizedMessages = {
  EMAIL_VERIFICATION_SENT: "Στείλαμε σύνδεσμο επιβεβαίωσης στο {{email}}. Λήγει σε 15 λεπτά.",
  EMAIL_VERIFICATION_RESEND: "Πρόβλημα; Επανάληψη αποστολής",
  EMAIL_VERIFICATION_SUCCESS: "Το email επιβεβαιώθηκε επιτυχώς. Μπορείτε τώρα να συνδεθείτε.",
  EMAIL_VERIFICATION_EXPIRED: "Ο σύνδεσμος επιβεβαίωσης έχει λήξει. Παρακαλώ ζητήστε νέο.",

  MFA_CODE_PROMPT: "Εισάγετε τον 6-ψήφιο κωδικό από την εφαρμογή επαλήθευσης.",
  MFA_CODE_INVALID: "Λανθασμένος κωδικός επαλήθευσης. Παρακαλώ δοκιμάστε ξανά.",
  MFA_SETUP_REQUIRED: "Απαιτείται ρύθμιση πολυπαραγοντικής επαλήθευσης.",

  PASSWORD_RESET_SENT: "Εάν υπάρχει λογαριασμός με αυτό το email, θα λάβετε σύνδεσμο επαναφοράς κωδικού.",
  PASSWORD_RESET_SUCCESS: "Ο κωδικός επαναφέρθηκε επιτυχώς. Μπορείτε τώρα να συνδεθείτε με τον νέο κωδικό.",
  PASSWORD_RESET_EXPIRED: "Ο σύνδεσμος επαναφοράς κωδικού έχει λήξει. Παρακαλώ ζητήστε νέο.",

  LOGIN_SUCCESS: "Καλώς ήρθατε πίσω! Συνδεθήκατε επιτυχώς.",
  SIGNUP_SUCCESS: "Ο λογαριασμός δημιουργήθηκε επιτυχώς. Παρακαλώ ελέγξτε το email σας για επιβεβαίωση.",
  INVALID_CREDENTIALS: "Λανθασμένο email ή κωδικός. Παρακαλώ ελέγξτε τα στοιχεία σας και δοκιμάστε ξανά.",
  ACCOUNT_LOCKED: "Ο λογαριασμός κλειδώθηκε προσωρινά λόγω πολλών αποτυχημένων προσπαθειών. Δοκιμάστε αργότερα.",

  GDPR_CONSENT_REQUIRED: "Πρέπει να αποδεχτείτε τους Όρους Χρήσης και την Πολιτική Απορρήτου για να συνεχίσετε.",
  DATA_EXPORTED: "Τα δεδομένα του λογαριασμού σας προετοιμάστηκαν για λήψη.",
  ACCOUNT_DELETED: "Ο λογαριασμός σας και όλα τα σχετικά δεδομένα διαγράφηκαν οριστικά.",

  GENERIC_ERROR: "Προέκυψε σφάλμα. Παρακαλώ δοκιμάστε αργότερα.",
  RATE_LIMITED: "Πάρα πολλές αιτήσεις. Παρακαλώ περιμένετε πριν δοκιμάσετε ξανά.",
  ACCESS_DENIED: "Δεν επιτρέπεται η πρόσβαση. Παρακαλώ ελέγξτε τα δικαιώματά σας.",
};

const MESSAGES = {
  en: EN_MESSAGES,
  el: EL_MESSAGES,
};

export class LocalizationService {
  /**
   * Get localized message with template replacement
   */
  static getMessage(
    key: keyof LocalizedMessages, 
    locale: 'en' | 'el' = 'en', 
    variables: Record<string, string> = {}
  ): string {
    const messages = MESSAGES[locale] || MESSAGES.en;
    let message = messages[key] || MESSAGES.en[key];

    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return message;
  }

  /**
   * Get user's preferred locale from request
   */
  static getUserLocale(req: any): 'en' | 'el' {
    // Check user preference from authenticated user
    if (req.user?.locale) {
      return req.user.locale === 'el' ? 'el' : 'en';
    }

    // Check request body locale
    if (req.body?.locale) {
      return req.body.locale === 'el' ? 'el' : 'en';
    }

    // Check Accept-Language header
    const acceptLanguage = req.headers['accept-language'] || '';
    if (acceptLanguage.includes('el') || acceptLanguage.includes('gr')) {
      return 'el';
    }

    return 'en';
  }

  /**
   * Create localized error response (uniform format to prevent enumeration)
   */
  static createErrorResponse(
    code: string,
    messageKey: keyof LocalizedMessages,
    locale: 'en' | 'el' = 'en',
    variables: Record<string, string> = {},
    retryInSeconds?: number
  ) {
    const response: any = {
      error: {
        code,
        message: this.getMessage(messageKey, locale, variables),
      },
    };

    if (retryInSeconds) {
      response.error.retry_in_seconds = retryInSeconds;
    }

    return response;
  }

  /**
   * Create localized success response
   */
  static createSuccessResponse(
    messageKey: keyof LocalizedMessages,
    locale: 'en' | 'el' = 'en',
    variables: Record<string, string> = {},
    data: Record<string, any> = {}
  ) {
    return {
      message: this.getMessage(messageKey, locale, variables),
      ...data,
    };
  }
}