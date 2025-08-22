import nodemailer from 'nodemailer';

export class EmailService {
  private static transporter = nodemailer.createTransport({
    // For development, use ethereal email or console logging
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(email: string, token: string, locale: string = 'en'): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
    
    const messages = {
      en: {
        subject: 'Verify your email address',
        html: `
          <h2>Welcome to PayrollSync!</h2>
          <p>Please click the link below to verify your email address:</p>
          <p><a href="${verificationUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <hr>
          <p><small>PayrollSync - Greek HR & Payroll Management System</small></p>
        `,
        text: `Welcome to PayrollSync! Please verify your email by visiting: ${verificationUrl}`
      },
      el: {
        subject: 'Επιβεβαιώστε τη διεύθυνση email σας',
        html: `
          <h2>Καλώς ήρθατε στο PayrollSync!</h2>
          <p>Παρακαλώ κάντε κλικ στον παρακάτω σύνδεσμο για να επιβεβαιώσετε τη διεύθυνση email σας:</p>
          <p><a href="${verificationUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Επιβεβαίωση Email</a></p>
          <p>Ή αντιγράψτε και επικολλήστε αυτόν τον σύνδεσμο στον browser σας:</p>
          <p>${verificationUrl}</p>
          <p>Αυτός ο σύνδεσμος θα λήξει σε 24 ώρες.</p>
          <hr>
          <p><small>PayrollSync - Ελληνικό Σύστημα Διαχείρισης Μισθοδοσίας & Ανθρώπινου Δυναμικού</small></p>
        `,
        text: `Καλώς ήρθατε στο PayrollSync! Παρακαλώ επιβεβαιώστε το email σας επισκεπτόμενοι: ${verificationUrl}`
      }
    };

    const message = messages[locale as keyof typeof messages] || messages.en;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@payrollsync.com',
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent:', result.messageId);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, token: string, locale: string = 'en'): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
    
    const messages = {
      en: {
        subject: 'Reset your password',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <p><a href="${resetUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p><small>PayrollSync - Greek HR & Payroll Management System</small></p>
        `,
        text: `Password reset requested. Reset your password by visiting: ${resetUrl}`
      },
      el: {
        subject: 'Επαναφορά του κωδικού σας',
        html: `
          <h2>Αίτημα Επαναφοράς Κωδικού</h2>
          <p>Ζητήσατε να επαναφέρετε τον κωδικό σας. Κάντε κλικ στον παρακάτω σύνδεσμο:</p>
          <p><a href="${resetUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Επαναφορά Κωδικού</a></p>
          <p>Ή αντιγράψτε και επικολλήστε αυτόν τον σύνδεσμο στον browser σας:</p>
          <p>${resetUrl}</p>
          <p>Αυτός ο σύνδεσμος θα λήξει σε 1 ώρα.</p>
          <p>Αν δεν ζητήσατε αυτό, παρακαλώ αγνοήστε αυτό το email.</p>
          <hr>
          <p><small>PayrollSync - Ελληνικό Σύστημα Διαχείρισης Μισθοδοσίας & Ανθρώπινου Δυναμικού</small></p>
        `,
        text: `Αίτημα επαναφοράς κωδικού. Επαναφέρετε τον κωδικό σας επισκεπτόμενοι: ${resetUrl}`
      }
    };

    const message = messages[locale as keyof typeof messages] || messages.en;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@payrollsync.com',
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', result.messageId);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  /**
   * Send magic link email
   */
  static async sendMagicLinkEmail(email: string, token: string, locale: string = 'en'): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/magic-login?token=${token}`;
    
    const messages = {
      en: {
        subject: 'Your magic login link',
        html: `
          <h2>Magic Login Link</h2>
          <p>Click the link below to sign in to your account:</p>
          <p><a href="${loginUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Sign In</a></p>
          <p>Or copy and paste this link into your browser:</p>
          <p>${loginUrl}</p>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p><small>PayrollSync - Greek HR & Payroll Management System</small></p>
        `,
        text: `Sign in to your account by visiting: ${loginUrl}`
      },
      el: {
        subject: 'Ο μαγικός σύνδεσμος σύνδεσης σας',
        html: `
          <h2>Μαγικός Σύνδεσμος Σύνδεσης</h2>
          <p>Κάντε κλικ στον παρακάτω σύνδεσμο για να συνδεθείτε στον λογαριασμό σας:</p>
          <p><a href="${loginUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Σύνδεση</a></p>
          <p>Ή αντιγράψτε και επικολλήστε αυτόν τον σύνδεσμο στον browser σας:</p>
          <p>${loginUrl}</p>
          <p>Αυτός ο σύνδεσμος θα λήξει σε 15 λεπτά.</p>
          <p>Αν δεν ζητήσατε αυτό, παρακαλώ αγνοήστε αυτό το email.</p>
          <hr>
          <p><small>PayrollSync - Ελληνικό Σύστημα Διαχείρισης Μισθοδοσίας & Ανθρώπινου Δυναμικού</small></p>
        `,
        text: `Συνδεθείτε στον λογαριασμό σας επισκεπτόμενοι: ${loginUrl}`
      }
    };

    const message = messages[locale as keyof typeof messages] || messages.en;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@payrollsync.com',
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Magic link email sent:', result.messageId);
    } catch (error) {
      console.error('Failed to send magic link email:', error);
      throw error;
    }
  }
}