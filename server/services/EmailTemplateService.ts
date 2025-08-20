/**
 * Email Template Service for Authentication
 * Handles bilingual (EN/EL) email templates for authentication flows
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface VerifyEmailData {
  name?: string;
  email: string;
  verificationUrl: string;
  expirationMinutes: number;
}

export interface ResetPasswordData {
  name?: string;
  email: string;
  resetUrl: string;
  expirationMinutes: number;
}

export class EmailTemplateService {
  /**
   * Generate email verification template
   */
  static generateVerifyEmail(data: VerifyEmailData, locale: 'en' | 'el' = 'en'): EmailTemplate {
    const templates = {
      en: {
        subject: 'Confirm your email',
        greeting: data.name ? `Hi ${data.name},` : 'Hello,',
        mainText: 'Click the button to verify your email and finish sign-up.',
        buttonText: 'Verify email',
        expirationText: `This link expires in ${data.expirationMinutes} minutes`,
        alternativeText: `If the button doesn't work, copy and paste this link into your browser:`,
        footerText: 'If you didn\'t create an account with us, you can safely ignore this email.',
        securityNote: 'For security reasons, this verification link will only work once.',
        supportText: 'Need help? Contact our support team.',
      },
      el: {
        subject: 'Επιβεβαίωση email',
        greeting: data.name ? `Γεια σας ${data.name},` : 'Γεια σας,',
        mainText: 'Κάντε κλικ στο κουμπί για να επιβεβαιώσετε το email σας και να ολοκληρώσετε την εγγραφή.',
        buttonText: 'Επιβεβαίωση email',
        expirationText: `Αυτός ο σύνδεσμος λήγει σε ${data.expirationMinutes} λεπτά`,
        alternativeText: 'Εάν το κουμπί δεν λειτουργεί, αντιγράψτε και επικολλήστε αυτόν τον σύνδεσμο στον περιηγητή σας:',
        footerText: 'Εάν δεν δημιουργήσατε λογαριασμό μαζί μας, μπορείτε να αγνοήσετε με ασφάλεια αυτό το email.',
        securityNote: 'Για λόγους ασφάλειας, αυτός ο σύνδεσμος επιβεβαίωσης θα λειτουργήσει μόνο μία φορά.',
        supportText: 'Χρειάζεστε βοήθεια; Επικοινωνήστε με την ομάδα υποστήριξής μας.',
      }
    };

    const t = templates[locale];

    const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.subject}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #374151;
        }
        .main-text {
            font-size: 16px;
            margin-bottom: 30px;
            color: #4b5563;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .button:hover {
            opacity: 0.9;
        }
        .expiration {
            font-size: 14px;
            color: #6b7280;
            margin: 20px 0;
        }
        .alternative {
            margin-top: 30px;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 6px;
        }
        .alternative p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 10px;
        }
        .link {
            word-break: break-all;
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #6b7280;
        }
        .security-note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
        .security-note p {
            margin: 0;
            font-size: 14px;
            color: #92400e;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0 10px;
            }
            .content, .header, .footer {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PayrollSync</h1>
        </div>
        <div class="content">
            <p class="greeting">${t.greeting}</p>
            <p class="main-text">${t.mainText}</p>
            
            <div style="text-align: center;">
                <a href="${data.verificationUrl}" class="button">${t.buttonText}</a>
            </div>
            
            <p class="expiration">${t.expirationText}</p>
            
            <div class="security-note">
                <p>${t.securityNote}</p>
            </div>
            
            <div class="alternative">
                <p>${t.alternativeText}</p>
                <a href="${data.verificationUrl}" class="link">${data.verificationUrl}</a>
            </div>
        </div>
        <div class="footer">
            <p>${t.footerText}</p>
            <p>${t.supportText}</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
${t.greeting}

${t.mainText}

${t.buttonText}: ${data.verificationUrl}

${t.expirationText}

${t.securityNote}

${t.footerText}

${t.supportText}
`;

    return {
      subject: t.subject,
      html,
      text: text.trim()
    };
  }

  /**
   * Generate password reset template
   */
  static generateResetPassword(data: ResetPasswordData, locale: 'en' | 'el' = 'en'): EmailTemplate {
    const templates = {
      en: {
        subject: 'Reset your password',
        greeting: data.name ? `Hi ${data.name},` : 'Hello,',
        mainText: 'Use this link to reset your password. If you didn\'t request it, ignore this email.',
        buttonText: 'Reset password',
        expirationText: `This link expires in ${data.expirationMinutes} minutes`,
        alternativeText: `If the button doesn't work, copy and paste this link into your browser:`,
        securityText: 'For your security, this password reset link will only work once.',
        noRequestText: 'If you didn\'t request a password reset, you can safely ignore this email. Your password will remain unchanged.',
        supportText: 'Need help? Contact our support team.',
        ipNote: 'This request was made from your account. If this wasn\'t you, please contact support immediately.',
      },
      el: {
        subject: 'Επαναφορά κωδικού πρόσβασης',
        greeting: data.name ? `Γεια σας ${data.name},` : 'Γεια σας,',
        mainText: 'Χρησιμοποιήστε αυτόν τον σύνδεσμο για να επαναφέρετε τον κωδικό πρόσβασής σας. Εάν δεν το ζητήσατε, αγνοήστε αυτό το email.',
        buttonText: 'Επαναφορά κωδικού',
        expirationText: `Αυτός ο σύνδεσμος λήγει σε ${data.expirationMinutes} λεπτά`,
        alternativeText: 'Εάν το κουμπί δεν λειτουργεί, αντιγράψτε και επικολλήστε αυτόν τον σύνδεσμο στον περιηγητή σας:',
        securityText: 'Για την ασφάλειά σας, αυτός ο σύνδεσμος επαναφοράς κωδικού θα λειτουργήσει μόνο μία φορά.',
        noRequestText: 'Εάν δεν ζητήσατε επαναφορά κωδικού πρόσβασης, μπορείτε να αγνοήσετε με ασφάλεια αυτό το email. Ο κωδικός πρόσβασής σας θα παραμείνει αμετάβλητος.',
        supportText: 'Χρειάζεστε βοήθεια; Επικοινωνήστε με την ομάδα υποστήριξής μας.',
        ipNote: 'Αυτό το αίτημα έγινε από τον λογαριασμό σας. Εάν δεν ήσασταν εσείς, επικοινωνήστε αμέσως με την υποστήριξη.',
      }
    };

    const t = templates[locale];

    const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.subject}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #374151;
        }
        .main-text {
            font-size: 16px;
            margin-bottom: 30px;
            color: #4b5563;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: #ffffff !important;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .button:hover {
            opacity: 0.9;
        }
        .expiration {
            font-size: 14px;
            color: #6b7280;
            margin: 20px 0;
        }
        .alternative {
            margin-top: 30px;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 6px;
        }
        .alternative p {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 10px;
        }
        .link {
            word-break: break-all;
            color: #dc2626;
            text-decoration: none;
            font-size: 14px;
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #6b7280;
        }
        .security-note {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
        }
        .security-note p {
            margin: 0;
            font-size: 14px;
            color: #991b1b;
        }
        .warning-note {
            background-color: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-note p {
            margin: 0;
            font-size: 14px;
            color: #92400e;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0 10px;
            }
            .content, .header, .footer {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PayrollSync</h1>
        </div>
        <div class="content">
            <p class="greeting">${t.greeting}</p>
            <p class="main-text">${t.mainText}</p>
            
            <div style="text-align: center;">
                <a href="${data.resetUrl}" class="button">${t.buttonText}</a>
            </div>
            
            <p class="expiration">${t.expirationText}</p>
            
            <div class="security-note">
                <p>${t.securityText}</p>
            </div>
            
            <div class="warning-note">
                <p>${t.noRequestText}</p>
            </div>
            
            <div class="alternative">
                <p>${t.alternativeText}</p>
                <a href="${data.resetUrl}" class="link">${data.resetUrl}</a>
            </div>
        </div>
        <div class="footer">
            <p>${t.ipNote}</p>
            <p>${t.supportText}</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
${t.greeting}

${t.mainText}

${t.buttonText}: ${data.resetUrl}

${t.expirationText}

${t.securityText}

${t.noRequestText}

${t.ipNote}

${t.supportText}
`;

    return {
      subject: t.subject,
      html,
      text: text.trim()
    };
  }

  /**
   * Generate magic link email template
   */
  static generateMagicLink(data: { email: string; magicUrl: string; expirationMinutes: number }, locale: 'en' | 'el' = 'en'): EmailTemplate {
    const templates = {
      en: {
        subject: 'Your secure login link',
        greeting: 'Hello,',
        mainText: 'Click the button below to securely sign in to your PayrollSync account.',
        buttonText: 'Sign in securely',
        expirationText: `This link expires in ${data.expirationMinutes} minutes`,
        securityText: 'For your security, this link will only work once and expires automatically.',
        noRequestText: 'If you didn\'t request this login link, you can safely ignore this email.',
      },
      el: {
        subject: 'Ο ασφαλής σύνδεσμος σύνδεσής σας',
        greeting: 'Γεια σας,',
        mainText: 'Κάντε κλικ στο παρακάτω κουμπί για να συνδεθείτε με ασφάλεια στον λογαριασμό σας PayrollSync.',
        buttonText: 'Ασφαλής σύνδεση',
        expirationText: `Αυτός ο σύνδεσμος λήγει σε ${data.expirationMinutes} λεπτά`,
        securityText: 'Για την ασφάλειά σας, αυτός ο σύνδεσμος θα λειτουργήσει μόνο μία φορά και λήγει αυτόματα.',
        noRequestText: 'Εάν δεν ζητήσατε αυτόν τον σύνδεσμο σύνδεσης, μπορείτε να αγνοήσετε με ασφάλεια αυτό το email.',
      }
    };

    const t = templates[locale];

    const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.subject}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #374151;
        }
        .main-text {
            font-size: 16px;
            margin-bottom: 30px;
            color: #4b5563;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: #ffffff !important;
            padding: 12px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
        }
        .button:hover {
            opacity: 0.9;
        }
        .expiration {
            font-size: 14px;
            color: #6b7280;
            margin: 20px 0;
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #6b7280;
        }
        .security-note {
            background-color: #ecfdf5;
            border-left: 4px solid #059669;
            padding: 15px;
            margin: 20px 0;
        }
        .security-note p {
            margin: 0;
            font-size: 14px;
            color: #047857;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0 10px;
            }
            .content, .header, .footer {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PayrollSync</h1>
        </div>
        <div class="content">
            <p class="greeting">${t.greeting}</p>
            <p class="main-text">${t.mainText}</p>
            
            <div style="text-align: center;">
                <a href="${data.magicUrl}" class="button">${t.buttonText}</a>
            </div>
            
            <p class="expiration">${t.expirationText}</p>
            
            <div class="security-note">
                <p>${t.securityText}</p>
            </div>
        </div>
        <div class="footer">
            <p>${t.noRequestText}</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
${t.greeting}

${t.mainText}

${t.buttonText}: ${data.magicUrl}

${t.expirationText}

${t.securityText}

${t.noRequestText}
`;

    return {
      subject: t.subject,
      html,
      text: text.trim()
    };
  }

  /**
   * Generate MFA setup success notification template
   */
  static generateMfaSetupSuccess(data: { name?: string; method: 'totp' | 'webauthn' }, locale: 'en' | 'el' = 'en'): EmailTemplate {
    const templates = {
      en: {
        subject: 'Two-factor authentication enabled',
        greeting: data.name ? `Hi ${data.name},` : 'Hello,',
        mainText: `Two-factor authentication (${data.method === 'totp' ? 'Authenticator App' : 'Security Key'}) has been successfully enabled on your PayrollSync account.`,
        securityText: 'Your account is now more secure. You\'ll need to provide a second form of authentication when signing in.',
        actionText: 'If you didn\'t enable this feature, please contact our support team immediately.',
        supportText: 'Need help? Contact our support team.',
      },
      el: {
        subject: 'Ο έλεγχος ταυτότητας δύο παραγόντων ενεργοποιήθηκε',
        greeting: data.name ? `Γεια σας ${data.name},` : 'Γεια σας,',
        mainText: `Ο έλεγχος ταυτότητας δύο παραγόντων (${data.method === 'totp' ? 'Εφαρμογή Επιβεβαίωσης' : 'Κλειδί Ασφαλείας'}) έχει ενεργοποιηθεί επιτυχώς στον λογαριασμό σας PayrollSync.`,
        securityText: 'Ο λογαριασμός σας είναι πλέον πιο ασφαλής. Θα χρειαστεί να παρέχετε μια δεύτερη μορφή ελέγχου ταυτότητας κατά τη σύνδεση.',
        actionText: 'Εάν δεν ενεργοποιήσατε αυτή τη λειτουργία, επικοινωνήστε αμέσως με την ομάδα υποστήριξής μας.',
        supportText: 'Χρειάζεστε βοήθεια; Επικοινωνήστε με την ομάδα υποστήριξής μας.',
      }
    };

    const t = templates[locale];

    const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.subject}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #374151;
        }
        .main-text {
            font-size: 16px;
            margin-bottom: 30px;
            color: #4b5563;
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 0 0 15px 0;
            font-size: 14px;
            color: #6b7280;
        }
        .security-note {
            background-color: #f0fdf4;
            border-left: 4px solid #16a34a;
            padding: 15px;
            margin: 20px 0;
        }
        .security-note p {
            margin: 0;
            font-size: 14px;
            color: #15803d;
        }
        .warning-note {
            background-color: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin: 20px 0;
        }
        .warning-note p {
            margin: 0;
            font-size: 14px;
            color: #991b1b;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0 10px;
            }
            .content, .header, .footer {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PayrollSync</h1>
        </div>
        <div class="content">
            <p class="greeting">${t.greeting}</p>
            <p class="main-text">${t.mainText}</p>
            
            <div class="security-note">
                <p>${t.securityText}</p>
            </div>
            
            <div class="warning-note">
                <p>${t.actionText}</p>
            </div>
        </div>
        <div class="footer">
            <p>${t.supportText}</p>
        </div>
    </div>
</body>
</html>`;

    const text = `
${t.greeting}

${t.mainText}

${t.securityText}

${t.actionText}

${t.supportText}
`;

    return {
      subject: t.subject,
      html,
      text: text.trim()
    };
  }
}