/**
 * Cookie and Consent Management Service
 * Bilingual (EL/EN) cookie banners and consent flows per GDPR and ePrivacy
 */

import { AuditService } from './AuditService';

export interface ConsentRecord {
  id: string;
  userId?: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  
  // Consent Details
  consentGiven: boolean;
  consentTimestamp: Date;
  consentVersion: string;
  language: 'el' | 'en';
  
  // Cookie Categories
  necessaryCookies: boolean; // Always true, required for functionality
  functionalCookies: boolean;
  analyticsCookies: boolean;
  marketingCookies: boolean;
  
  // Granular Consent
  granularConsent: GranularConsent[];
  
  // Legal Basis
  legalBasis: 'consent' | 'legitimate_interest' | 'necessary';
  
  // Withdrawal
  withdrawn: boolean;
  withdrawnAt?: Date;
  withdrawnBy?: string;
  
  // Updates
  lastUpdated: Date;
  consentHistory: ConsentHistoryEntry[];
  
  // Browser Context
  browserFingerprint?: string;
  dntEnabled: boolean;
  
  // Metadata
  expiresAt: Date;
  refreshedAt?: Date;
}

export interface GranularConsent {
  purpose: string;
  description: string;
  category: 'necessary' | 'functional' | 'analytics' | 'marketing' | 'other';
  consented: boolean;
  legalBasis: 'consent' | 'legitimate_interest' | 'necessary';
  vendor?: string;
  retention: string;
}

export interface ConsentHistoryEntry {
  timestamp: Date;
  action: 'given' | 'withdrawn' | 'updated' | 'refreshed';
  changes: string[];
  version: string;
  ipAddress: string;
}

export interface CookiePolicy {
  id: string;
  version: string;
  language: 'el' | 'en';
  
  // Policy Content
  title: string;
  description: string;
  lastUpdated: Date;
  effectiveDate: Date;
  
  // Cookie Categories
  categories: CookieCategory[];
  
  // Legal Information
  controller: string;
  dpo: ContactInfo;
  retentionPeriods: RetentionPeriod[];
  
  // Rights Information
  dataSubjectRights: DataSubjectRight[];
  
  // Contact Information
  contactMethods: ContactMethod[];
}

export interface CookieCategory {
  id: string;
  name: string;
  description: string;
  purpose: string;
  category: 'necessary' | 'functional' | 'analytics' | 'marketing';
  legalBasis: 'consent' | 'legitimate_interest' | 'necessary';
  
  // Cookies in this category
  cookies: CookieInfo[];
  
  // Default state
  defaultEnabled: boolean;
  userConfigurable: boolean;
  
  // Vendor information
  thirdPartyVendors: ThirdPartyVendor[];
}

export interface CookieInfo {
  name: string;
  description: string;
  purpose: string;
  domain: string;
  duration: string;
  type: 'session' | 'persistent' | 'secure' | 'httponly';
  sameSite: 'strict' | 'lax' | 'none';
  vendor?: string;
  essential: boolean;
}

export interface ThirdPartyVendor {
  name: string;
  description: string;
  privacyPolicy: string;
  purposes: string[];
  dataProcessed: string[];
  retention: string;
  location: string;
  safeguards: string[];
}

export interface ContactInfo {
  name: string;
  email: string;
  address: string;
  phone?: string;
}

export interface RetentionPeriod {
  category: string;
  period: string;
  purpose: string;
  legalBasis: string;
}

export interface DataSubjectRight {
  right: string;
  description: string;
  procedure: string;
  timeframe: string;
  contactInfo: string;
}

export interface ContactMethod {
  type: 'email' | 'phone' | 'form' | 'address';
  value: string;
  description: string;
}

export interface ConsentBanner {
  id: string;
  version: string;
  language: 'el' | 'en';
  
  // Banner Configuration
  position: 'top' | 'bottom' | 'center' | 'corner';
  style: 'banner' | 'modal' | 'bar' | 'overlay';
  theme: 'light' | 'dark' | 'auto';
  
  // Content
  title: string;
  message: string;
  
  // Buttons
  acceptAllButton: BannerButton;
  rejectAllButton: BannerButton;
  customizeButton: BannerButton;
  policyLinkButton: BannerButton;
  
  // Behavior
  dismissible: boolean;
  showOnEveryPage: boolean;
  respectDNT: boolean;
  
  // Advanced Settings
  geoTargeting?: string[];
  deviceTargeting?: string[];
  
  // A/B Testing
  variant?: string;
  testGroup?: string;
}

export interface BannerButton {
  text: string;
  style: 'primary' | 'secondary' | 'link' | 'danger';
  action: 'accept_all' | 'reject_all' | 'customize' | 'policy' | 'close';
  visible: boolean;
}

export interface ConsentPreferences {
  userId?: string;
  sessionId: string;
  
  // Categories
  categories: {
    necessary: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  
  // Granular preferences
  granularPreferences: {
    [purposeId: string]: boolean;
  };
  
  // Settings
  language: 'el' | 'en';
  notificationPreferences: NotificationPreference[];
  
  // Metadata
  lastUpdated: Date;
  version: string;
}

export interface NotificationPreference {
  type: 'email' | 'sms' | 'push' | 'in_app';
  enabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  purposes: string[];
}

export class CookieConsentService {
  private static consentRecords = new Map<string, ConsentRecord>();
  private static cookiePolicies = new Map<string, CookiePolicy>();
  private static consentBanners = new Map<string, ConsentBanner>();
  private static userPreferences = new Map<string, ConsentPreferences>();

  /**
   * Initialize Cookie Consent Service
   */
  static initialize(): void {
    this.loadDefaultPolicies();
    this.loadDefaultBanners();
    console.log('✅ Cookie Consent Service initialized');
  }

  /**
   * Get consent banner configuration
   */
  static getConsentBanner(language: 'el' | 'en', variant?: string): ConsentBanner {
    const bannerId = variant ? `${language}_${variant}` : language;
    const banner = this.consentBanners.get(bannerId) || this.consentBanners.get(language);
    
    if (!banner) {
      throw new Error(`Consent banner not found for language: ${language}`);
    }
    
    return banner;
  }

  /**
   * Record user consent
   */
  static async recordConsent(
    consentData: {
      sessionId: string;
      userId?: string;
      ipAddress: string;
      userAgent: string;
      language: 'el' | 'en';
      necessaryCookies: boolean;
      functionalCookies: boolean;
      analyticsCookies: boolean;
      marketingCookies: boolean;
      granularConsent?: GranularConsent[];
      browserFingerprint?: string;
      dntEnabled: boolean;
    }
  ): Promise<ConsentRecord> {
    const consentId = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const consentRecord: ConsentRecord = {
      id: consentId,
      userId: consentData.userId,
      sessionId: consentData.sessionId,
      ipAddress: consentData.ipAddress,
      userAgent: consentData.userAgent,
      consentGiven: true,
      consentTimestamp: new Date(),
      consentVersion: '1.0',
      language: consentData.language,
      necessaryCookies: true, // Always true
      functionalCookies: consentData.functionalCookies,
      analyticsCookies: consentData.analyticsCookies,
      marketingCookies: consentData.marketingCookies,
      granularConsent: consentData.granularConsent || [],
      legalBasis: 'consent',
      withdrawn: false,
      lastUpdated: new Date(),
      consentHistory: [{
        timestamp: new Date(),
        action: 'given',
        changes: ['Initial consent recorded'],
        version: '1.0',
        ipAddress: consentData.ipAddress
      }],
      browserFingerprint: consentData.browserFingerprint,
      dntEnabled: consentData.dntEnabled,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    };

    this.consentRecords.set(consentId, consentRecord);

    // Store user preferences if user is identified
    if (consentData.userId) {
      const preferences: ConsentPreferences = {
        userId: consentData.userId,
        sessionId: consentData.sessionId,
        categories: {
          necessary: true,
          functional: consentData.functionalCookies,
          analytics: consentData.analyticsCookies,
          marketing: consentData.marketingCookies
        },
        granularPreferences: {},
        language: consentData.language,
        notificationPreferences: [],
        lastUpdated: new Date(),
        version: '1.0'
      };

      this.userPreferences.set(consentData.userId, preferences);
    }

    // Audit consent recording
    await AuditService.logEvent({
      action: 'consent.recorded',
      userId: consentData.userId,
      resourceType: 'consent',
      resourceId: consentId,
      metadata: {
        language: consentData.language,
        functional: consentData.functionalCookies,
        analytics: consentData.analyticsCookies,
        marketing: consentData.marketingCookies,
        sessionId: consentData.sessionId
      }
    });

    return consentRecord;
  }

  /**
   * Update user consent
   */
  static async updateConsent(
    consentId: string,
    updates: {
      functionalCookies?: boolean;
      analyticsCookies?: boolean;
      marketingCookies?: boolean;
      granularConsent?: GranularConsent[];
    },
    ipAddress: string
  ): Promise<ConsentRecord> {
    const record = this.consentRecords.get(consentId);
    if (!record) {
      throw new Error(`Consent record not found: ${consentId}`);
    }

    // Track changes
    const changes: string[] = [];
    if (updates.functionalCookies !== undefined && updates.functionalCookies !== record.functionalCookies) {
      changes.push(`Functional cookies: ${record.functionalCookies} → ${updates.functionalCookies}`);
    }
    if (updates.analyticsCookies !== undefined && updates.analyticsCookies !== record.analyticsCookies) {
      changes.push(`Analytics cookies: ${record.analyticsCookies} → ${updates.analyticsCookies}`);
    }
    if (updates.marketingCookies !== undefined && updates.marketingCookies !== record.marketingCookies) {
      changes.push(`Marketing cookies: ${record.marketingCookies} → ${updates.marketingCookies}`);
    }

    const updatedRecord: ConsentRecord = {
      ...record,
      ...updates,
      lastUpdated: new Date(),
      consentHistory: [
        ...record.consentHistory,
        {
          timestamp: new Date(),
          action: 'updated',
          changes,
          version: record.consentVersion,
          ipAddress
        }
      ]
    };

    this.consentRecords.set(consentId, updatedRecord);

    // Update user preferences if user is identified
    if (updatedRecord.userId) {
      const preferences = this.userPreferences.get(updatedRecord.userId);
      if (preferences) {
        preferences.categories = {
          necessary: true,
          functional: updatedRecord.functionalCookies,
          analytics: updatedRecord.analyticsCookies,
          marketing: updatedRecord.marketingCookies
        };
        preferences.lastUpdated = new Date();
        this.userPreferences.set(updatedRecord.userId, preferences);
      }
    }

    // Audit consent update
    await AuditService.logEvent({
      action: 'consent.updated',
      userId: updatedRecord.userId,
      resourceType: 'consent',
      resourceId: consentId,
      metadata: {
        changes,
        ipAddress
      }
    });

    return updatedRecord;
  }

  /**
   * Withdraw consent
   */
  static async withdrawConsent(
    consentId: string,
    withdrawnBy: string,
    ipAddress: string
  ): Promise<void> {
    const record = this.consentRecords.get(consentId);
    if (!record) {
      throw new Error(`Consent record not found: ${consentId}`);
    }

    const updatedRecord: ConsentRecord = {
      ...record,
      withdrawn: true,
      withdrawnAt: new Date(),
      withdrawnBy,
      functionalCookies: false,
      analyticsCookies: false,
      marketingCookies: false,
      lastUpdated: new Date(),
      consentHistory: [
        ...record.consentHistory,
        {
          timestamp: new Date(),
          action: 'withdrawn',
          changes: ['All non-necessary cookies withdrawn'],
          version: record.consentVersion,
          ipAddress
        }
      ]
    };

    this.consentRecords.set(consentId, updatedRecord);

    // Update user preferences
    if (record.userId) {
      const preferences = this.userPreferences.get(record.userId);
      if (preferences) {
        preferences.categories = {
          necessary: true,
          functional: false,
          analytics: false,
          marketing: false
        };
        preferences.lastUpdated = new Date();
        this.userPreferences.set(record.userId, preferences);
      }
    }

    // Audit consent withdrawal
    await AuditService.logEvent({
      action: 'consent.withdrawn',
      userId: record.userId,
      resourceType: 'consent',
      resourceId: consentId,
      metadata: {
        withdrawnBy,
        ipAddress
      }
    });
  }

  /**
   * Get user consent status
   */
  static getUserConsentStatus(
    sessionId: string,
    userId?: string
  ): ConsentRecord | null {
    // Try to find by user ID first
    if (userId) {
      const userRecord = Array.from(this.consentRecords.values())
        .find(record => record.userId === userId && !record.withdrawn);
      if (userRecord) return userRecord;
    }

    // Fall back to session ID
    const sessionRecord = Array.from(this.consentRecords.values())
      .find(record => record.sessionId === sessionId && !record.withdrawn);
    
    return sessionRecord || null;
  }

  /**
   * Get user preferences
   */
  static getUserPreferences(userId: string): ConsentPreferences | null {
    return this.userPreferences.get(userId) || null;
  }

  /**
   * Check if consent is required
   */
  static isConsentRequired(
    ipAddress: string,
    userAgent: string,
    dntEnabled: boolean
  ): boolean {
    // Respect Do Not Track if enabled
    if (dntEnabled) {
      return false;
    }

    // Check if user is in EU/EEA (simplified check)
    // In practice, this would use a geolocation service
    const euCountries = ['GR', 'DE', 'FR', 'IT', 'ES']; // Simplified list
    
    // For this implementation, assume consent is required for all users
    return true;
  }

  /**
   * Get cookie policy
   */
  static getCookiePolicy(language: 'el' | 'en'): CookiePolicy {
    const policy = this.cookiePolicies.get(language);
    if (!policy) {
      throw new Error(`Cookie policy not found for language: ${language}`);
    }
    return policy;
  }

  /**
   * Generate consent proof
   */
  static generateConsentProof(consentId: string): {
    consentRecord: ConsentRecord;
    proof: string;
    verificationHash: string;
  } {
    const record = this.consentRecords.get(consentId);
    if (!record) {
      throw new Error(`Consent record not found: ${consentId}`);
    }

    const proof = {
      consentId: record.id,
      timestamp: record.consentTimestamp.toISOString(),
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      consent: {
        functional: record.functionalCookies,
        analytics: record.analyticsCookies,
        marketing: record.marketingCookies
      },
      version: record.consentVersion
    };

    const proofString = JSON.stringify(proof);
    const verificationHash = this.generateHash(proofString);

    return {
      consentRecord: record,
      proof: proofString,
      verificationHash
    };
  }

  /**
   * Verify consent proof
   */
  static verifyConsentProof(proof: string, hash: string): boolean {
    const calculatedHash = this.generateHash(proof);
    return calculatedHash === hash;
  }

  /**
   * Get consent statistics
   */
  static getConsentStatistics(): {
    totalConsents: number;
    activeConsents: number;
    withdrawnConsents: number;
    consentsByCategory: {
      functional: number;
      analytics: number;
      marketing: number;
    };
    consentsByLanguage: {
      el: number;
      en: number;
    };
  } {
    const records = Array.from(this.consentRecords.values());
    const activeRecords = records.filter(r => !r.withdrawn);

    return {
      totalConsents: records.length,
      activeConsents: activeRecords.length,
      withdrawnConsents: records.filter(r => r.withdrawn).length,
      consentsByCategory: {
        functional: activeRecords.filter(r => r.functionalCookies).length,
        analytics: activeRecords.filter(r => r.analyticsCookies).length,
        marketing: activeRecords.filter(r => r.marketingCookies).length
      },
      consentsByLanguage: {
        el: records.filter(r => r.language === 'el').length,
        en: records.filter(r => r.language === 'en').length
      }
    };
  }

  /**
   * Clean up expired consents
   */
  static cleanupExpiredConsents(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, record] of this.consentRecords.entries()) {
      if (record.expiresAt < now) {
        this.consentRecords.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Private helper methods

  private static generateHash(data: string): string {
    // In practice, use a proper cryptographic hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private static loadDefaultPolicies(): void {
    // English Cookie Policy
    const enPolicy: CookiePolicy = {
      id: 'en_policy_v1',
      version: '1.0',
      language: 'en',
      title: 'Cookie Policy',
      description: 'This policy explains how we use cookies and similar technologies.',
      lastUpdated: new Date(),
      effectiveDate: new Date(),
      categories: [
        {
          id: 'necessary',
          name: 'Necessary Cookies',
          description: 'Essential cookies required for website functionality',
          purpose: 'Enable basic website features and security',
          category: 'necessary',
          legalBasis: 'necessary',
          cookies: [
            {
              name: 'session_id',
              description: 'Session identifier for authentication',
              purpose: 'User authentication and session management',
              domain: process.env.DOMAIN || 'payrollsync.com',
              duration: 'Session',
              type: 'session',
              sameSite: 'strict',
              essential: true
            }
          ],
          defaultEnabled: true,
          userConfigurable: false,
          thirdPartyVendors: []
        },
        {
          id: 'functional',
          name: 'Functional Cookies',
          description: 'Cookies that enhance website functionality',
          purpose: 'Remember user preferences and settings',
          category: 'functional',
          legalBasis: 'consent',
          cookies: [
            {
              name: 'user_preferences',
              description: 'Stores user language and display preferences',
              purpose: 'Personalization and user experience',
              domain: process.env.DOMAIN || 'payrollsync.com',
              duration: '1 year',
              type: 'persistent',
              sameSite: 'lax',
              essential: false
            }
          ],
          defaultEnabled: false,
          userConfigurable: true,
          thirdPartyVendors: []
        },
        {
          id: 'analytics',
          name: 'Analytics Cookies',
          description: 'Help us understand how the website is used',
          purpose: 'Website analytics and performance monitoring',
          category: 'analytics',
          legalBasis: 'consent',
          cookies: [
            {
              name: '_ga',
              description: 'Google Analytics tracking cookie',
              purpose: 'Track website usage and user behavior',
              domain: '.payrollsync.com',
              duration: '2 years',
              type: 'persistent',
              sameSite: 'lax',
              vendor: 'Google',
              essential: false
            }
          ],
          defaultEnabled: false,
          userConfigurable: true,
          thirdPartyVendors: [
            {
              name: 'Google Analytics',
              description: 'Web analytics service',
              privacyPolicy: 'https://policies.google.com/privacy',
              purposes: ['Analytics', 'Performance monitoring'],
              dataProcessed: ['IP address', 'Browser information', 'Page views'],
              retention: '26 months',
              location: 'United States',
              safeguards: ['Privacy Shield', 'Standard Contractual Clauses']
            }
          ]
        }
      ],
      controller: 'PayrollSync',
      dpo: {
        name: 'Data Protection Officer',
        email: 'dpo@payrollsync.com',
        address: 'Athens, Greece'
      },
      retentionPeriods: [
        {
          category: 'Necessary cookies',
          period: 'Session duration',
          purpose: 'Authentication and security',
          legalBasis: 'Necessary for service provision'
        }
      ],
      dataSubjectRights: [
        {
          right: 'Withdrawal of consent',
          description: 'You can withdraw consent for non-essential cookies at any time',
          procedure: 'Use the cookie preferences center or contact us',
          timeframe: 'Immediate',
          contactInfo: 'privacy@payrollsync.com'
        }
      ],
      contactMethods: [
        {
          type: 'email',
          value: 'privacy@payrollsync.com',
          description: 'Email us about privacy concerns'
        }
      ]
    };

    // Greek Cookie Policy
    const elPolicy: CookiePolicy = {
      id: 'el_policy_v1',
      version: '1.0',
      language: 'el',
      title: 'Πολιτική Cookies',
      description: 'Αυτή η πολιτική εξηγεί πώς χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες.',
      lastUpdated: new Date(),
      effectiveDate: new Date(),
      categories: [
        {
          id: 'necessary',
          name: 'Απαραίτητα Cookies',
          description: 'Βασικά cookies που απαιτούνται για τη λειτουργία του ιστότοπου',
          purpose: 'Ενεργοποίηση βασικών χαρακτηριστικών και ασφάλειας',
          category: 'necessary',
          legalBasis: 'necessary',
          cookies: [
            {
              name: 'session_id',
              description: 'Αναγνωριστικό συνεδρίας για έλεγχο ταυτότητας',
              purpose: 'Έλεγχος ταυτότητας και διαχείριση συνεδρίας',
              domain: process.env.DOMAIN || 'payrollsync.com',
              duration: 'Συνεδρία',
              type: 'session',
              sameSite: 'strict',
              essential: true
            }
          ],
          defaultEnabled: true,
          userConfigurable: false,
          thirdPartyVendors: []
        },
        {
          id: 'functional',
          name: 'Λειτουργικά Cookies',
          description: 'Cookies που βελτιώνουν τη λειτουργικότητα του ιστότοπου',
          purpose: 'Απομνημόνευση προτιμήσεων και ρυθμίσεων χρήστη',
          category: 'functional',
          legalBasis: 'consent',
          cookies: [
            {
              name: 'user_preferences',
              description: 'Αποθηκεύει προτιμήσεις γλώσσας και εμφάνισης',
              purpose: 'Εξατομίκευση και εμπειρία χρήστη',
              domain: process.env.DOMAIN || 'payrollsync.com',
              duration: '1 έτος',
              type: 'persistent',
              sameSite: 'lax',
              essential: false
            }
          ],
          defaultEnabled: false,
          userConfigurable: true,
          thirdPartyVendors: []
        }
      ],
      controller: 'PayrollSync',
      dpo: {
        name: 'Υπεύθυνος Προστασίας Δεδομένων',
        email: 'dpo@payrollsync.com',
        address: 'Αθήνα, Ελλάδα'
      },
      retentionPeriods: [
        {
          category: 'Απαραίτητα cookies',
          period: 'Διάρκεια συνεδρίας',
          purpose: 'Έλεγχος ταυτότητας και ασφάλεια',
          legalBasis: 'Απαραίτητο για παροχή υπηρεσίας'
        }
      ],
      dataSubjectRights: [
        {
          right: 'Ανάκληση συναίνεσης',
          description: 'Μπορείτε να ανακαλέσετε τη συναίνεση για μη απαραίτητα cookies ανά πάσα στιγμή',
          procedure: 'Χρησιμοποιήστε το κέντρο προτιμήσεων cookies ή επικοινωνήστε μαζί μας',
          timeframe: 'Άμεσα',
          contactInfo: 'privacy@payrollsync.com'
        }
      ],
      contactMethods: [
        {
          type: 'email',
          value: 'privacy@payrollsync.com',
          description: 'Στείλτε μας email για θέματα προστασίας προσωπικών δεδομένων'
        }
      ]
    };

    this.cookiePolicies.set('en', enPolicy);
    this.cookiePolicies.set('el', elPolicy);
  }

  private static loadDefaultBanners(): void {
    // English Banner
    const enBanner: ConsentBanner = {
      id: 'en_banner_v1',
      version: '1.0',
      language: 'en',
      position: 'bottom',
      style: 'banner',
      theme: 'light',
      title: 'Cookie Consent',
      message: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.',
      acceptAllButton: {
        text: 'Accept All',
        style: 'primary',
        action: 'accept_all',
        visible: true
      },
      rejectAllButton: {
        text: 'Reject All',
        style: 'secondary',
        action: 'reject_all',
        visible: true
      },
      customizeButton: {
        text: 'Customize',
        style: 'link',
        action: 'customize',
        visible: true
      },
      policyLinkButton: {
        text: 'Cookie Policy',
        style: 'link',
        action: 'policy',
        visible: true
      },
      dismissible: false,
      showOnEveryPage: true,
      respectDNT: true
    };

    // Greek Banner
    const elBanner: ConsentBanner = {
      id: 'el_banner_v1',
      version: '1.0',
      language: 'el',
      position: 'bottom',
      style: 'banner',
      theme: 'light',
      title: 'Συναίνεση για Cookies',
      message: 'Χρησιμοποιούμε cookies για να βελτιώσουμε την εμπειρία περιήγησης, να προσφέρουμε εξατομικευμένο περιεχόμενο και να αναλύουμε την κίνηση. Κάνοντας κλικ στο "Αποδοχή Όλων", συναινείτε στη χρήση των cookies.',
      acceptAllButton: {
        text: 'Αποδοχή Όλων',
        style: 'primary',
        action: 'accept_all',
        visible: true
      },
      rejectAllButton: {
        text: 'Απόρριψη Όλων',
        style: 'secondary',
        action: 'reject_all',
        visible: true
      },
      customizeButton: {
        text: 'Προσαρμογή',
        style: 'link',
        action: 'customize',
        visible: true
      },
      policyLinkButton: {
        text: 'Πολιτική Cookies',
        style: 'link',
        action: 'policy',
        visible: true
      },
      dismissible: false,
      showOnEveryPage: true,
      respectDNT: true
    };

    this.consentBanners.set('en', enBanner);
    this.consentBanners.set('el', elBanner);
  }
}