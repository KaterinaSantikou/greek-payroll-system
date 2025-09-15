/**
 * Greek Labor Law Configuration Loader
 * 
 * This module handles loading and versioning of Greek labor law constants
 * from external configuration sources. When labor laws change, update the
 * configuration files rather than hard-coding values.
 */

import { z } from 'zod';
import { legalDocumentTracker, getLegalReferencesForPayroll } from './legal-document-tracker.js';

// =============================================================================
// CONFIGURATION SCHEMAS
// =============================================================================

const TaxBracketSchema = z.object({
  min: z.number().min(0),
  max: z.number().positive(),
  rate: z.number().min(0).max(1),
  description: z.string().optional()
});

const EfkaRatesSchema = z.object({
  employee: z.object({
    main: z.number().min(0).max(1),
    auxiliary: z.number().min(0).max(1),
    unemployment: z.number().min(0).max(1)
  }),
  employer: z.object({
    main: z.number().min(0).max(1),
    auxiliary: z.number().min(0).max(1),
    unemployment: z.number().min(0).max(1),
    sickness: z.number().min(0).max(1),
    workAccident: z.number().min(0).max(1)
  })
});

const MinimumWageSchema = z.object({
  monthly: z.number().positive(),
  daily: z.number().positive(),
  hourly: z.number().positive(),
  effectiveDate: z.string(),
  legalReference: z.string().optional()
});

const WorkingTimeLimitsSchema = z.object({
  standardMonthlyHours: z.number().positive(),
  maxDailyHours: z.number().positive(),
  maxWeeklyHours: z.number().positive(),
  maxOvertimeDaily: z.number().min(0),
  maxOvertimeWeekly: z.number().min(0),
  maxAnnualOvertime: z.number().min(0)
});

const TaxFreeLimitsSchema = z.object({
  mealVouchers: z.number().min(0),
  transportAllowance: z.number().min(0),
  educationAllowance: z.number().min(0),
  effectiveDate: z.string()
});

const TipsRulesSchema = z.object({
  flatTaxRate: z.number().min(0).max(1),
  minimumDeclaredPercentage: z.number().min(0).max(1)
});

const PremiumRatesSchema = z.object({
  overtime: z.object({
    tier1: z.number().min(1),
    tier2: z.number().min(1),
    tier3: z.number().min(1)
  }),
  night: z.number().min(0),
  sunday: z.number().min(0),
  holiday: z.number().min(0),
  dangerous: z.number().min(0)
});

const SeveranceRulesSchema = z.object({
  yearsBrackets: z.array(z.object({
    minYears: z.number().min(0),
    maxYears: z.number().positive(),
    monthsOfPay: z.number().min(0)
  })),
  basedOnLastSalary: z.boolean(),
  maxMonthsCap: z.number().positive()
});

// Main configuration schema
const GreekLawConfigSchema = z.object({
  version: z.string(),
  effectiveDate: z.string(),
  legalReferences: z.array(z.string()).optional(),
  taxBrackets: z.array(TaxBracketSchema),
  solidarityTaxBrackets: z.array(TaxBracketSchema),
  efkaRates: EfkaRatesSchema,
  minimumWage: MinimumWageSchema,
  workingTimeLimits: WorkingTimeLimitsSchema,
  taxFreeLimits: TaxFreeLimitsSchema,
  tipsRules: TipsRulesSchema,
  premiumRates: PremiumRatesSchema,
  severanceRules: SeveranceRulesSchema
});

export type GreekLawConfig = z.infer<typeof GreekLawConfigSchema>;

// =============================================================================
// CONFIGURATION LOADER
// =============================================================================

class GreekLawConfigLoader {
  private static instance: GreekLawConfigLoader;
  private currentConfig: GreekLawConfig | null = null;
  private configCache = new Map<string, GreekLawConfig>();

  private constructor() {}

  static getInstance(): GreekLawConfigLoader {
    if (!GreekLawConfigLoader.instance) {
      GreekLawConfigLoader.instance = new GreekLawConfigLoader();
    }
    return GreekLawConfigLoader.instance;
  }

  /**
   * Load configuration from environment variables or fallback to defaults
   */
  async loadConfig(version?: string): Promise<GreekLawConfig> {
    const configVersion = version || process.env.GREEK_LAW_VERSION || '2024.12';
    
    // Check cache first
    if (this.configCache.has(configVersion)) {
      return this.configCache.get(configVersion)!;
    }

    try {
      // Try to load from external source (database, file, API)
      const config = await this.loadFromExternalSource(configVersion);
      if (config) {
        this.configCache.set(configVersion, config);
        this.currentConfig = config;
        return config;
      }
    } catch (error) {
      console.warn(`Failed to load config version ${configVersion}, falling back to defaults:`, error);
    }

    // Fallback to built-in defaults
    const defaultConfig = this.getDefaultConfig(configVersion);
    this.configCache.set(configVersion, defaultConfig);
    this.currentConfig = defaultConfig;
    return defaultConfig;
  }

  /**
   * Load configuration from external source (database, file system, or API)
   */
  private async loadFromExternalSource(version: string): Promise<GreekLawConfig | null> {
    // Try environment variables first
    const configFromEnv = this.loadFromEnvironmentVariables(version);
    if (configFromEnv) {
      return configFromEnv;
    }

    // Try loading from database (if available)
    try {
      const configFromDb = await this.loadFromDatabase(version);
      if (configFromDb) {
        return configFromDb;
      }
    } catch (error) {
      console.debug('Database config loading failed:', error);
    }

    // Try loading from configuration file
    try {
      const configFromFile = await this.loadFromConfigFile(version);
      if (configFromFile) {
        return configFromFile;
      }
    } catch (error) {
      console.debug('File config loading failed:', error);
    }

    return null;
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironmentVariables(version: string): GreekLawConfig | null {
    try {
      // Only load if comprehensive env vars are provided
      if (!process.env.GREEK_MINIMUM_WAGE_MONTHLY || !process.env.GREEK_EFKA_EMPLOYEE_MAIN) {
        return null;
      }

      const config: GreekLawConfig = {
        version,
        effectiveDate: process.env.GREEK_LAW_EFFECTIVE_DATE || new Date().toISOString(),
        legalReferences: process.env.GREEK_LAW_REFERENCES?.split(',') || [],
        
        taxBrackets: this.parseEnvTaxBrackets('GREEK_TAX_BRACKETS'),
        solidarityTaxBrackets: this.parseEnvTaxBrackets('GREEK_SOLIDARITY_TAX_BRACKETS'),
        
        efkaRates: {
          employee: {
            main: parseFloat(process.env.GREEK_EFKA_EMPLOYEE_MAIN || '0.1067'),
            auxiliary: parseFloat(process.env.GREEK_EFKA_EMPLOYEE_AUXILIARY || '0.0333'),
            unemployment: parseFloat(process.env.GREEK_EFKA_EMPLOYEE_UNEMPLOYMENT || '0.0213')
          },
          employer: {
            main: parseFloat(process.env.GREEK_EFKA_EMPLOYER_MAIN || '0.1542'),
            auxiliary: parseFloat(process.env.GREEK_EFKA_EMPLOYER_AUXILIARY || '0.0333'),
            unemployment: parseFloat(process.env.GREEK_EFKA_EMPLOYER_UNEMPLOYMENT || '0.0503'),
            sickness: parseFloat(process.env.GREEK_EFKA_EMPLOYER_SICKNESS || '0.0287'),
            workAccident: parseFloat(process.env.GREEK_EFKA_EMPLOYER_WORK_ACCIDENT || '0.0067')
          }
        },
        
        minimumWage: {
          monthly: parseFloat(process.env.GREEK_MINIMUM_WAGE_MONTHLY || '830'),
          daily: parseFloat(process.env.GREEK_MINIMUM_WAGE_DAILY || '27.65'),
          hourly: parseFloat(process.env.GREEK_MINIMUM_WAGE_HOURLY || '3.45'),
          effectiveDate: process.env.GREEK_MINIMUM_WAGE_EFFECTIVE_DATE || '2024-04-01',
          legalReference: process.env.GREEK_MINIMUM_WAGE_LEGAL_REF
        },
        
        workingTimeLimits: {
          standardMonthlyHours: parseFloat(process.env.GREEK_STANDARD_MONTHLY_HOURS || '173.33'),
          maxDailyHours: parseFloat(process.env.GREEK_MAX_DAILY_HOURS || '8'),
          maxWeeklyHours: parseFloat(process.env.GREEK_MAX_WEEKLY_HOURS || '40'),
          maxOvertimeDaily: parseFloat(process.env.GREEK_MAX_OVERTIME_DAILY || '2'),
          maxOvertimeWeekly: parseFloat(process.env.GREEK_MAX_OVERTIME_WEEKLY || '5'),
          maxAnnualOvertime: parseFloat(process.env.GREEK_MAX_ANNUAL_OVERTIME || '150')
        },
        
        taxFreeLimits: {
          mealVouchers: parseFloat(process.env.GREEK_TAX_FREE_MEAL_VOUCHERS || '11'),
          transportAllowance: parseFloat(process.env.GREEK_TAX_FREE_TRANSPORT || '150'),
          educationAllowance: parseFloat(process.env.GREEK_TAX_FREE_EDUCATION || '200'),
          effectiveDate: process.env.GREEK_TAX_FREE_EFFECTIVE_DATE || '2024-01-01'
        },
        
        tipsRules: {
          flatTaxRate: parseFloat(process.env.GREEK_TIPS_TAX_RATE || '0.15'),
          minimumDeclaredPercentage: parseFloat(process.env.GREEK_TIPS_MIN_DECLARED || '0.08')
        },
        
        premiumRates: {
          overtime: {
            tier1: parseFloat(process.env.GREEK_OVERTIME_TIER1 || '1.25'),
            tier2: parseFloat(process.env.GREEK_OVERTIME_TIER2 || '1.50'),
            tier3: parseFloat(process.env.GREEK_OVERTIME_TIER3 || '1.75')
          },
          night: parseFloat(process.env.GREEK_NIGHT_PREMIUM || '0.25'),
          sunday: parseFloat(process.env.GREEK_SUNDAY_PREMIUM || '0.75'),
          holiday: parseFloat(process.env.GREEK_HOLIDAY_PREMIUM || '1.00'),
          dangerous: parseFloat(process.env.GREEK_DANGEROUS_PREMIUM || '0.15')
        },
        
        severanceRules: this.parseEnvSeveranceRules()
      };

      // Validate the configuration
      return GreekLawConfigSchema.parse(config);
    } catch (error) {
      console.warn('Failed to parse environment variables for Greek law config:', error);
      return null;
    }
  }

  /**
   * Parse tax brackets from environment variable
   */
  private parseEnvTaxBrackets(envKey: string): Array<{min: number, max: number, rate: number}> {
    const brackets = process.env[envKey];
    if (!brackets) {
      return [];
    }

    try {
      return JSON.parse(brackets);
    } catch {
      // Handle simple format: "0-10000:0.09,10000-20000:0.22"
      return brackets.split(',').map(bracket => {
        const [range, rate] = bracket.split(':');
        const [min, max] = range.split('-').map(Number);
        return { min, max: max === -1 ? Infinity : max, rate: parseFloat(rate) };
      });
    }
  }

  /**
   * Parse severance rules from environment
   */
  private parseEnvSeveranceRules(): SeveranceRulesSchema['_type'] {
    const defaultRules = {
      yearsBrackets: [
        { minYears: 0, maxYears: 1, monthsOfPay: 0 },
        { minYears: 1, maxYears: 2, monthsOfPay: 1 },
        { minYears: 2, maxYears: 5, monthsOfPay: 2 },
        { minYears: 5, maxYears: 10, monthsOfPay: 3 },
        { minYears: 10, maxYears: 15, monthsOfPay: 4 },
        { minYears: 15, maxYears: 20, monthsOfPay: 5 },
        { minYears: 20, maxYears: 25, monthsOfPay: 6 },
        { minYears: 25, maxYears: Infinity, monthsOfPay: 12 }
      ],
      basedOnLastSalary: true,
      maxMonthsCap: 24
    };

    try {
      if (process.env.GREEK_SEVERANCE_RULES) {
        return JSON.parse(process.env.GREEK_SEVERANCE_RULES);
      }
    } catch (error) {
      console.warn('Failed to parse severance rules from env:', error);
    }

    return defaultRules;
  }

  /**
   * Load from database (implement based on your database setup)
   */
  private async loadFromDatabase(version: string): Promise<GreekLawConfig | null> {
    // Implementation would depend on your database schema
    // This is a placeholder for future database-driven configuration
    return null;
  }

  /**
   * Load from configuration file
   */
  private async loadFromConfigFile(version: string): Promise<GreekLawConfig | null> {
    try {
      // Try to load from config directory
      const configPath = `./config/greek-law-${version}.json`;
      // Implementation would use fs.readFile in Node.js environment
      // For now, return null to fallback to defaults
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Default configuration fallback
   */
  private getDefaultConfig(version: string): GreekLawConfig {
    return {
      version,
      effectiveDate: '2024-12-01',
      legalReferences: [
        'Law 4808/2021 - Labor Relations Reform',
        'Presidential Decree 81/2023 - EFKA Rates',
        'Ministerial Decision A.1002/2024 - Minimum Wage'
      ],
      
      taxBrackets: [
        { min: 0, max: 10000, rate: 0.09 },
        { min: 10000, max: 20000, rate: 0.22 },
        { min: 20000, max: 30000, rate: 0.28 },
        { min: 30000, max: 40000, rate: 0.36 },
        { min: 40000, max: Infinity, rate: 0.44 }
      ],
      
      solidarityTaxBrackets: [
        { min: 0, max: 12000, rate: 0 },
        { min: 12000, max: 20000, rate: 0.022 },
        { min: 20000, max: 30000, rate: 0.05 },
        { min: 30000, max: 40000, rate: 0.065 },
        { min: 40000, max: 65000, rate: 0.075 },
        { min: 65000, max: Infinity, rate: 0.09 }
      ],
      
      efkaRates: {
        employee: {
          main: 0.1067,
          auxiliary: 0.0333,
          unemployment: 0.0213
        },
        employer: {
          main: 0.1542,
          auxiliary: 0.0333,
          unemployment: 0.0503,
          sickness: 0.0287,
          workAccident: 0.0067
        }
      },
      
      minimumWage: {
        monthly: 830,
        daily: 27.65,
        hourly: 3.45,
        effectiveDate: '2024-04-01',
        legalReference: 'Ministerial Decision A.1002/2024'
      },
      
      workingTimeLimits: {
        standardMonthlyHours: 173.33,
        maxDailyHours: 8,
        maxWeeklyHours: 40,
        maxOvertimeDaily: 2,
        maxOvertimeWeekly: 5,
        maxAnnualOvertime: 150
      },
      
      taxFreeLimits: {
        mealVouchers: 11,
        transportAllowance: 150,
        educationAllowance: 200,
        effectiveDate: '2024-01-01'
      },
      
      tipsRules: {
        flatTaxRate: 0.15,
        minimumDeclaredPercentage: 0.08
      },
      
      premiumRates: {
        overtime: {
          tier1: 1.25,
          tier2: 1.50,
          tier3: 1.75
        },
        night: 0.25,
        sunday: 0.75,
        holiday: 1.00,
        dangerous: 0.15
      },
      
      severanceRules: {
        yearsBrackets: [
          { minYears: 0, maxYears: 1, monthsOfPay: 0 },
          { minYears: 1, maxYears: 2, monthsOfPay: 1 },
          { minYears: 2, maxYears: 5, monthsOfPay: 2 },
          { minYears: 5, maxYears: 10, monthsOfPay: 3 },
          { minYears: 10, maxYears: 15, monthsOfPay: 4 },
          { minYears: 15, maxYears: 20, monthsOfPay: 5 },
          { minYears: 20, maxYears: 25, monthsOfPay: 6 },
          { minYears: 25, maxYears: Infinity, monthsOfPay: 12 }
        ],
        basedOnLastSalary: true,
        maxMonthsCap: 24
      }
    };
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): GreekLawConfig | null {
    return this.currentConfig;
  }

  /**
   * Clear cache (useful for testing or config reloading)
   */
  clearCache(): void {
    this.configCache.clear();
    this.currentConfig = null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const greekLawConfigLoader = GreekLawConfigLoader.getInstance();

// Helper function to get current config with fallback
export async function getGreekLawConfig(version?: string): Promise<GreekLawConfig> {
  return greekLawConfigLoader.loadConfig(version);
}

// Helper function to get specific config sections
export async function getMinimumWage(version?: string) {
  const config = await getGreekLawConfig(version);
  return config.minimumWage;
}

export async function getEfkaRates(version?: string) {
  const config = await getGreekLawConfig(version);
  return config.efkaRates;
}

export async function getTaxBrackets(version?: string) {
  const config = await getGreekLawConfig(version);
  return config.taxBrackets;
}

export async function getPremiumRates(version?: string) {
  const config = await getGreekLawConfig(version);
  return config.premiumRates;
}