/**
 * Greek Law Constants with Version Tracking
 * 
 * Centralized, versioned repository of all Greek labor law constants including
 * tax brackets, EFKA rates, minimum wage, working time limits, and allowances.
 * Each law version includes effective dates and source documentation for audit trails.
 */

// Law Version Metadata
export interface LawVersionMetadata {
  versionId: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  sourceDoc: string;
  description: string;
  governmentGazette?: string;
}

// Tax Brackets Structure
export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

// EFKA Rates Structure
export interface EfkaRates {
  employee: {
    main: number;
    auxiliary: number;
    unemployment: number;
  };
  employer: {
    main: number;
    auxiliary: number;
    unemployment: number;
    sickness: number;
    workAccident: number;
  };
}

// Working Time Limits
export interface WorkingTimeLimits {
  standardDailyHours: number;
  standardWeeklyHours: number;
  standardMonthlyHours: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  overtimeThresholdDaily: number;
  overtimeThresholdWeekly: number;
  nightStartHour: number;
  nightEndHour: number;
}

// Minimum Wage Structure
export interface MinimumWage {
  monthly: number;
  daily: number;
  hourly: number;
}

// Premium Rates
export interface PremiumRates {
  overtime: {
    firstTier: number;  // 125% for first 2 hours
    secondTier: number; // 150% for additional hours
  };
  night: number;     // 125%
  sunday: number;    // 175% 
  holiday: number;   // 200%
}

// Tax Free Limits
export interface TaxFreeLimits {
  annual: number;
  monthly: number;
  marriageBonus: number;
  childBonus: number;
}

// Solidarity Tax Brackets
export interface SolidarityTaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

// Tips Tax Rules
export interface TipsTaxRules {
  taxFreeThreshold: number;
  taxRate: number;
  efkaExempt: boolean;
}

// Complete Law Constants Set
export interface GreekLawConstants {
  version: LawVersionMetadata;
  taxBrackets: TaxBracket[];
  efkaRates: EfkaRates;
  solidarityTaxBrackets: SolidarityTaxBracket[];
  minimumWage: MinimumWage;
  workingTimeLimits: WorkingTimeLimits;
  premiumRates: PremiumRates;
  taxFreeLimits: TaxFreeLimits;
  tipsTaxRules: TipsTaxRules;
}

// =============================================================================
// VERSIONED LAW CONSTANTS DATA
// =============================================================================

/**
 * Greek Law Version 2024.1 (Current)
 * Effective from January 1, 2024
 */
export const GREEK_LAW_2024_1: GreekLawConstants = {
  version: {
    versionId: '2024.1',
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: undefined, // Current version
    sourceDoc: 'Law 5002/2024, Government Gazette A 1/2024',
    description: 'Updated minimum wage, tax brackets, and EFKA rates for 2024',
    governmentGazette: 'ΦΕΚ Α 1/2024'
  },
  
  taxBrackets: [
    { min: 0, max: 10000, rate: 0.09 },
    { min: 10001, max: 20000, rate: 0.22 },
    { min: 20001, max: 30000, rate: 0.28 },
    { min: 30001, max: 40000, rate: 0.36 },
    { min: 40001, max: null, rate: 0.44 }
  ],
  
  efkaRates: {
    employee: {
      main: 0.0667, // 6.67%
      auxiliary: 0.03,   // 3%
      unemployment: 0.01 // 1%
    },
    employer: {
      main: 0.1306,      // 13.06%
      auxiliary: 0.03,   // 3%
      unemployment: 0.01, // 1%
      sickness: 0.0055,  // 0.55%
      workAccident: 0.01 // 1%
    }
  },
  
  solidarityTaxBrackets: [
    { min: 0, max: 12000, rate: 0 },
    { min: 12001, max: 20000, rate: 0.022 },
    { min: 20001, max: 30000, rate: 0.05 },
    { min: 30001, max: 40000, rate: 0.065 },
    { min: 40001, max: 65000, rate: 0.075 },
    { min: 65001, max: null, rate: 0.10 }
  ],
  
  minimumWage: {
    monthly: 760, // €760 per month (2024)
    daily: 34.33, // €34.33 per day
    hourly: 4.55  // €4.55 per hour
  },
  
  workingTimeLimits: {
    standardDailyHours: 8,
    standardWeeklyHours: 40,
    standardMonthlyHours: 173.33,
    maxDailyHours: 12,
    maxWeeklyHours: 60,
    overtimeThresholdDaily: 8,
    overtimeThresholdWeekly: 40,
    nightStartHour: 22,
    nightEndHour: 6
  },
  
  premiumRates: {
    overtime: {
      firstTier: 1.25,  // 125% for first 2 hours
      secondTier: 1.50  // 150% for additional hours
    },
    night: 1.25,     // 125%
    sunday: 1.75,    // 175%
    holiday: 2.0     // 200%
  },
  
  taxFreeLimits: {
    annual: 3900,        // €3,900 annual tax-free amount
    monthly: 325,        // €325 monthly tax-free amount
    marriageBonus: 800,  // €800 bonus for married
    childBonus: 600      // €600 per child
  },
  
  tipsTaxRules: {
    taxFreeThreshold: 300, // €300 per month tax-free tips
    taxRate: 0.15,         // 15% tax on tips above threshold
    efkaExempt: true       // Tips exempt from EFKA
  }
};

/**
 * Greek Law Version 2023.2 (Previous)
 * Effective from July 1, 2023 to December 31, 2023
 */
export const GREEK_LAW_2023_2: GreekLawConstants = {
  version: {
    versionId: '2023.2',
    effectiveFrom: new Date('2023-07-01'),
    effectiveTo: new Date('2023-12-31'),
    sourceDoc: 'Law 4958/2023, Government Gazette A 145/2023',
    description: 'Mid-year adjustments for minimum wage and EFKA rates',
    governmentGazette: 'ΦΕΚ Α 145/2023'
  },
  
  taxBrackets: [
    { min: 0, max: 10000, rate: 0.09 },
    { min: 10001, max: 20000, rate: 0.22 },
    { min: 20001, max: 30000, rate: 0.28 },
    { min: 30001, max: 40000, rate: 0.36 },
    { min: 40001, max: null, rate: 0.44 }
  ],
  
  efkaRates: {
    employee: {
      main: 0.0667,
      auxiliary: 0.03,
      unemployment: 0.01
    },
    employer: {
      main: 0.1306,
      auxiliary: 0.03,
      unemployment: 0.01,
      sickness: 0.0055,
      workAccident: 0.01
    }
  },
  
  solidarityTaxBrackets: [
    { min: 0, max: 12000, rate: 0 },
    { min: 12001, max: 20000, rate: 0.022 },
    { min: 20001, max: 30000, rate: 0.05 },
    { min: 30001, max: 40000, rate: 0.065 },
    { min: 40001, max: 65000, rate: 0.075 },
    { min: 65001, max: null, rate: 0.10 }
  ],
  
  minimumWage: {
    monthly: 713,  // €713 per month (2023 H2)
    daily: 32.23, 
    hourly: 4.27
  },
  
  workingTimeLimits: {
    standardDailyHours: 8,
    standardWeeklyHours: 40,
    standardMonthlyHours: 173.33,
    maxDailyHours: 12,
    maxWeeklyHours: 60,
    overtimeThresholdDaily: 8,
    overtimeThresholdWeekly: 40,
    nightStartHour: 22,
    nightEndHour: 6
  },
  
  premiumRates: {
    overtime: {
      firstTier: 1.25,
      secondTier: 1.50
    },
    night: 1.25,
    sunday: 1.75,
    holiday: 2.0
  },
  
  taxFreeLimits: {
    annual: 3900,
    monthly: 325,
    marriageBonus: 800,
    childBonus: 600
  },
  
  tipsTaxRules: {
    taxFreeThreshold: 300,
    taxRate: 0.15,
    efkaExempt: true
  }
};

// All available law versions (chronological order)
export const ALL_LAW_VERSIONS: GreekLawConstants[] = [
  GREEK_LAW_2023_2,
  GREEK_LAW_2024_1
];

/**
 * Law Registry - Central Manager for Greek Law Versions
 */
export class LawRegistry {
  private static instance: LawRegistry;
  private versions: Map<string, GreekLawConstants> = new Map();
  private changeListeners: Array<(newVersion: GreekLawConstants) => void> = [];
  
  private constructor() {
    // Load all versions into registry
    for (const lawVersion of ALL_LAW_VERSIONS) {
      this.versions.set(lawVersion.version.versionId, lawVersion);
    }
  }
  
  static getInstance(): LawRegistry {
    if (!LawRegistry.instance) {
      LawRegistry.instance = new LawRegistry();
    }
    return LawRegistry.instance;
  }
  
  /**
   * Get law constants active for a specific date
   */
  getActiveVersion(date: Date): GreekLawConstants {
    for (const version of ALL_LAW_VERSIONS.reverse()) { // Start from newest
      const effectiveFrom = version.version.effectiveFrom;
      const effectiveTo = version.version.effectiveTo;
      
      if (date >= effectiveFrom && (!effectiveTo || date <= effectiveTo)) {
        return version;
      }
    }
    
    // Fallback to latest version
    return GREEK_LAW_2024_1;
  }
  
  /**
   * Get law constants by specific version ID
   */
  getConstants(versionId: string): GreekLawConstants | null {
    return this.versions.get(versionId) || null;
  }
  
  /**
   * Get current (latest) law constants
   */
  getCurrentConstants(): GreekLawConstants {
    return this.getActiveVersion(new Date());
  }
  
  /**
   * Subscribe to law version changes
   */
  subscribe(listener: (newVersion: GreekLawConstants) => void): () => void {
    this.changeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all listeners of version change (for future dynamic updates)
   */
  private notifyChange(newVersion: GreekLawConstants): void {
    this.changeListeners.forEach(listener => listener(newVersion));
  }
  
  /**
   * Get all available versions
   */
  getAllVersions(): GreekLawConstants[] {
    return Array.from(this.versions.values())
      .sort((a, b) => a.version.effectiveFrom.getTime() - b.version.effectiveFrom.getTime());
  }
  
  /**
   * Get version metadata only
   */
  getVersionMetadata(versionId: string): LawVersionMetadata | null {
    const constants = this.versions.get(versionId);
    return constants ? constants.version : null;
  }
  
  /**
   * Check if a version is currently active
   */
  isVersionActive(versionId: string, date: Date = new Date()): boolean {
    const activeVersion = this.getActiveVersion(date);
    return activeVersion.version.versionId === versionId;
  }
  
  /**
   * Get version effective date range
   */
  getVersionDateRange(versionId: string): { from: Date; to?: Date } | null {
    const version = this.versions.get(versionId);
    if (!version) return null;
    
    return {
      from: version.version.effectiveFrom,
      to: version.version.effectiveTo
    };
  }
}

// Export singleton instance
export const lawRegistry = LawRegistry.getInstance();

// Convenience functions for common operations
export const getCurrentLawConstants = (): GreekLawConstants => lawRegistry.getCurrentConstants();
export const getLawConstantsForDate = (date: Date): GreekLawConstants => lawRegistry.getActiveVersion(date);
export const getLawVersion = (versionId: string): GreekLawConstants | null => lawRegistry.getConstants(versionId);