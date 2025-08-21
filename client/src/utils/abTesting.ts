// A/B Testing utilities for landing page optimization

interface ABTest {
  name: string;
  variants: string[];
  traffic: number; // Percentage of traffic to include in test
}

interface ABTestConfig {
  heroHeadline: ABTest;
  ctaCopy: ABTest;
  proofPosition: ABTest;
  demoType: ABTest;
}

export const AB_TESTS: ABTestConfig = {
  heroHeadline: {
    name: 'hero_headline',
    variants: ['promise', 'risk_reducer'],
    traffic: 100
  },
  ctaCopy: {
    name: 'cta_copy',
    variants: ['start_free', 'start_first_run'],
    traffic: 100
  },
  proofPosition: {
    name: 'proof_position',
    variants: ['above_fold', 'below_fold'],
    traffic: 100
  },
  demoType: {
    name: 'demo_type',
    variants: ['video', 'interactive'],
    traffic: 100
  }
};

class ABTestManager {
  private static instance: ABTestManager;
  private assignments: Map<string, string> = new Map();
  private userId: string;

  constructor() {
    // Generate or retrieve user ID for consistent assignment
    this.userId = this.getUserId();
    this.initializeAssignments();
  }

  static getInstance(): ABTestManager {
    if (!ABTestManager.instance) {
      ABTestManager.instance = new ABTestManager();
    }
    return ABTestManager.instance;
  }

  private getUserId(): string {
    let userId = localStorage.getItem('ab_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('ab_user_id', userId);
    }
    return userId;
  }

  private hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private initializeAssignments(): void {
    Object.entries(AB_TESTS).forEach(([testKey, test]) => {
      if (this.assignments.has(test.name)) return;

      // Check if user is already assigned
      const stored = localStorage.getItem(`ab_${test.name}`);
      if (stored && test.variants.includes(stored)) {
        this.assignments.set(test.name, stored);
        return;
      }

      // Assign based on user ID hash
      const hashValue = this.hash(this.userId + test.name);
      const bucket = hashValue % 100;

      if (bucket < test.traffic) {
        const variantIndex = hashValue % test.variants.length;
        const variant = test.variants[variantIndex];
        this.assignments.set(test.name, variant);
        localStorage.setItem(`ab_${test.name}`, variant);
      } else {
        // Control group
        this.assignments.set(test.name, test.variants[0]);
        localStorage.setItem(`ab_${test.name}`, test.variants[0]);
      }
    });
  }

  getVariant(testName: string): string {
    return this.assignments.get(testName) || AB_TESTS[testName as keyof ABTestConfig]?.variants[0] || '';
  }

  trackConversion(testName: string, conversionType: string, value?: number): void {
    const variant = this.getVariant(testName);
    
    // Track to analytics
    this.trackToAnalytics('ab_conversion', {
      test_name: testName,
      variant: variant,
      conversion_type: conversionType,
      value: value,
      user_id: this.userId
    });
  }

  private trackToAnalytics(event: string, properties: Record<string, any>): void {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, {
        event_category: 'ab_testing',
        custom_parameters: properties
      });
    }

    // Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(event, properties);
    }

    // Console log for development
    console.log(`AB Test Event: ${event}`, properties);
  }

  getAllVariants(): Record<string, string> {
    const variants: Record<string, string> = {};
    Object.keys(AB_TESTS).forEach(testKey => {
      const test = AB_TESTS[testKey as keyof ABTestConfig];
      variants[testKey] = this.getVariant(test.name);
    });
    return variants;
  }
}

export const abTestManager = ABTestManager.getInstance();

// Convenience hooks for specific tests
export const useABTest = (testKey: keyof ABTestConfig) => {
  const test = AB_TESTS[testKey];
  const variant = abTestManager.getVariant(test.name);
  
  const trackConversion = (conversionType: string, value?: number) => {
    abTestManager.trackConversion(test.name, conversionType, value);
  };

  return { variant, trackConversion };
};

// Variants content
export const AB_VARIANTS = {
  heroHeadline: {
    promise: {
      en: "Run payroll in minutes. Filings done for you.",
      el: "Μισθοδοσία σε λίγα λεπτά. Δηλώσεις αυτόματα."
    },
    risk_reducer: {
      en: "Never miss a Greek tax filing deadline again. Automated compliance guaranteed.",
      el: "Ποτέ ξανά δεν θα χάσετε προθεσμία ελληνικής φορολογίας. Εγγυημένη αυτοματοποιημένη συμμόρφωση."
    }
  },
  ctaCopy: {
    start_free: {
      en: "Start free",
      el: "Έναρξη δωρεάν"
    },
    start_first_run: {
      en: "Start your first run",
      el: "Ξεκινήστε την πρώτη εκτέλεση"
    }
  }
};