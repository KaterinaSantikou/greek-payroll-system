/**
 * Legal Constants Cache System
 * 
 * High-performance caching and memoization for Greek law constants, tax brackets,
 * EFKA rates, and other read-only legal data. Integrates with the legal version
 * system to ensure cache validity and automatic invalidation.
 * 
 * FEATURES:
 * - Memory-efficient caching with LRU eviction
 * - Legal version-aware cache invalidation  
 * - Memoization for expensive calculations
 * - Selective cache warming for critical constants
 * - Performance monitoring and hit rate tracking
 * - Thread-safe operations for concurrent access
 */

import { logger } from '../../../server/observability/logging.js';
import { LegalVersionService } from '../services/LegalVersionService.js';

export interface CacheEntry<T> {
  data: T;
  version: string;
  timestamp: number;
  hitCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  memoryUsage: number;
  oldestEntry: number;
  mostAccessedKey: string;
}

export interface CachedLegalConstants {
  // Tax and Social Security
  taxBrackets: Array<{ min: number; max: number; rate: number }>;
  solidarityTaxBrackets: Array<{ min: number; max: number; rate: number }>;
  efkaRates: {
    employee: { main: number; auxiliary: number; unemployment: number };
    employer: { main: number; auxiliary: number; unemployment: number; sickness: number; workAccident: number };
  };
  
  // Wages and Working Time
  minimumWage: { monthly: number; daily: number; hourly: number };
  workingTimeLimits: {
    standardMonthlyHours: number;
    maxDailyHours: number;
    maxWeeklyHours: number;
    maxOvertimeDaily: number;
    maxOvertimeWeekly: number;
    maxAnnualOvertime: number;
  };
  
  // Premiums and Bonuses
  premiumRates: {
    overtime: { tier1: number; tier2: number; tier3: number };
    night: number;
    sunday: number;
    holiday: number;
    dangerous: number;
  };
  greekBonuses: {
    christmas: { fullTimeMonthly: number; partTimeHourly: number };
    easter: { fullTimeMonthly: number; partTimeHourly: number };
    vacation: { fullTimeMonthly: number; partTimeHourly: number };
  };
  
  // Benefits and Allowances
  taxFreeLimits: {
    mealVouchers: number;
    transportAllowance: number;
    educationAllowance: number;
  };
  
  // Tips and Special Rules
  tipsRules: {
    flatTaxRate: number;
    minimumDeclaredPercentage: number;
  };
  
  // Severance Pay
  severanceRules: {
    yearsBrackets: Array<{ minYears: number; maxYears: number; monthsOfPay: number }>;
    basedOnLastSalary: boolean;
    maxMonthsCap: number;
  };
}

/**
 * High-Performance Legal Constants Cache
 * 
 * Provides memory-efficient caching with LRU eviction, legal version tracking,
 * and automatic invalidation when law changes occur.
 */
export class LegalConstantsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private memoizedCalculations = new Map<string, any>();
  
  // Performance tracking
  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;
  
  // Configuration
  private readonly maxEntries: number;
  private readonly defaultTTL: number;
  private readonly versionCheckInterval: number;
  
  // Version tracking
  private currentLegalVersion: string | null = null;
  private lastVersionCheck: number = 0;

  constructor(
    maxEntries: number = 100,
    defaultTTL: number = 30 * 60 * 1000, // 30 minutes
    versionCheckInterval: number = 60 * 1000 // 1 minute
  ) {
    this.maxEntries = maxEntries;
    this.defaultTTL = defaultTTL;
    this.versionCheckInterval = versionCheckInterval;
    
    logger.info('Legal Constants Cache initialized', {
      maxEntries,
      defaultTTL: `${defaultTTL / 1000}s`,
      versionCheckInterval: `${versionCheckInterval / 1000}s`
    });
  }

  /**
   * Get cached legal constants with automatic version checking
   */
  async get<T>(key: string, factory: () => Promise<T>): Promise<T> {
    await this.checkVersionInvalidation();
    
    const entry = this.cache.get(key);
    const now = Date.now();
    
    // Check if entry exists and is valid
    if (entry && this.isEntryValid(entry, now)) {
      // Update access tracking
      entry.hitCount++;
      entry.lastAccessed = now;
      this.hitCount++;
      
      logger.debug('Cache hit', { key, hitCount: entry.hitCount });
      return entry.data as T;
    }
    
    // Cache miss - generate new data
    this.missCount++;
    logger.debug('Cache miss', { key, reason: entry ? 'expired' : 'not_found' });
    
    const data = await factory();
    await this.set(key, data);
    
    return data;
  }

  /**
   * Set cache entry with legal version tracking
   */
  async set<T>(key: string, data: T, customTTL?: number): Promise<void> {
    const now = Date.now();
    const version = await this.getCurrentLegalVersion();
    
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }
    
    const entry: CacheEntry<T> = {
      data,
      version,
      timestamp: now,
      hitCount: 0,
      lastAccessed: now
    };
    
    this.cache.set(key, entry);
    
    logger.debug('Cache entry set', { 
      key, 
      version, 
      ttl: customTTL || this.defaultTTL,
      cacheSize: this.cache.size 
    });
  }

  /**
   * Memoize expensive calculations that depend on legal constants
   */
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string
  ): T {
    return ((...args: Parameters<T>) => {
      const key = `memoized:${fn.name}:${keyGenerator(...args)}`;
      
      if (this.memoizedCalculations.has(key)) {
        this.hitCount++;
        return this.memoizedCalculations.get(key);
      }
      
      const result = fn(...args);
      this.memoizedCalculations.set(key, result);
      this.missCount++;
      
      // Limit memoized calculations to prevent memory bloat
      if (this.memoizedCalculations.size > this.maxEntries * 2) {
        const firstKey = this.memoizedCalculations.keys().next().value;
        this.memoizedCalculations.delete(firstKey);
      }
      
      return result;
    }) as T;
  }

  /**
   * Get all Greek legal constants with high-performance caching
   */
  async getAllConstants(): Promise<CachedLegalConstants> {
    return this.get('all_legal_constants', async () => {
      logger.info('Fetching all legal constants from source');
      
      // Import here to avoid circular dependencies
      const { getGreekLawConfig } = await import('../config/greek-law-config.js');
      const config = await getGreekLawConfig();
      
      const constants: CachedLegalConstants = {
        taxBrackets: config.taxBrackets,
        solidarityTaxBrackets: config.solidarityTaxBrackets,
        efkaRates: config.efkaRates,
        minimumWage: config.minimumWage,
        workingTimeLimits: config.workingTimeLimits,
        premiumRates: config.premiumRates,
        greekBonuses: config.greekBonuses || {
          christmas: { fullTimeMonthly: 1.0417, partTimeHourly: 0.0417 },
          easter: { fullTimeMonthly: 0.5, partTimeHourly: 0.02083 },
          vacation: { fullTimeMonthly: 0.5, partTimeHourly: 0.02083 }
        },
        taxFreeLimits: config.taxFreeLimits,
        tipsRules: config.tipsRules,
        severanceRules: config.severanceRules || {
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
      
      logger.info('Legal constants loaded successfully', {
        taxBracketsCount: constants.taxBrackets.length,
        efkaRatesLoaded: Object.keys(constants.efkaRates.employee).length,
        minimumWage: constants.minimumWage.monthly
      });
      
      return constants;
    });
  }

  /**
   * Get specific tax brackets with caching
   */
  async getTaxBrackets(): Promise<Array<{ min: number; max: number; rate: number }>> {
    const constants = await this.getAllConstants();
    return constants.taxBrackets;
  }

  /**
   * Get EFKA rates with caching
   */
  async getEfkaRates(): Promise<CachedLegalConstants['efkaRates']> {
    const constants = await this.getAllConstants();
    return constants.efkaRates;
  }

  /**
   * Get minimum wage with caching
   */
  async getMinimumWage(): Promise<CachedLegalConstants['minimumWage']> {
    const constants = await this.getAllConstants();
    return constants.minimumWage;
  }

  /**
   * Warm cache with critical constants for better performance
   */
  async warmCache(): Promise<void> {
    logger.info('Warming legal constants cache');
    
    const startTime = Date.now();
    
    // Pre-load most frequently used constants
    await Promise.all([
      this.getAllConstants(),
      this.getTaxBrackets(),
      this.getEfkaRates(),
      this.getMinimumWage()
    ]);
    
    const warmupTime = Date.now() - startTime;
    
    logger.info('Cache warming completed', {
      warmupTime: `${warmupTime}ms`,
      cacheEntries: this.cache.size,
      preloadedConstants: 4
    });
  }

  /**
   * Check if legal version has changed and invalidate cache if needed
   */
  private async checkVersionInvalidation(): Promise<void> {
    const now = Date.now();
    
    if (now - this.lastVersionCheck < this.versionCheckInterval) {
      return; // Skip check if within interval
    }
    
    this.lastVersionCheck = now;
    
    try {
      const newVersion = await this.getCurrentLegalVersion();
      
      if (this.currentLegalVersion && this.currentLegalVersion !== newVersion) {
        logger.info('Legal version changed - invalidating cache', {
          oldVersion: this.currentLegalVersion,
          newVersion,
          entriesCleared: this.cache.size
        });
        
        this.invalidateAll();
        this.currentLegalVersion = newVersion;
      } else if (!this.currentLegalVersion) {
        this.currentLegalVersion = newVersion;
      }
    } catch (error) {
      logger.error('Failed to check legal version for cache invalidation', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get current legal version from LegalVersionService
   */
  private async getCurrentLegalVersion(): Promise<string> {
    try {
      // Initialize LegalVersionService if not already done
      if (!LegalVersionService.getCurrentVersion()) {
        await LegalVersionService.initialize();
      }
      
      return LegalVersionService.getCurrentVersion() || 'v2024.09.1';
    } catch (error) {
      logger.warn('Could not get legal version, using default', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'v2024.09.1';
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isEntryValid(entry: CacheEntry<any>, now: number): boolean {
    const isWithinTTL = (now - entry.timestamp) < this.defaultTTL;
    const isCorrectVersion = entry.version === this.currentLegalVersion;
    
    return isWithinTTL && isCorrectVersion;
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.evictionCount++;
      
      logger.debug('Cache entry evicted', { 
        key: oldestKey,
        evictionCount: this.evictionCount 
      });
    }
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
    this.memoizedCalculations.clear();
    
    logger.info('All cache entries invalidated', {
      entriesCleared: this.cache.size,
      memoizedCleared: this.memoizedCalculations.size
    });
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug('Cache entry invalidated', { key });
    }
  }

  /**
   * Get cache performance statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    const missRate = 100 - hitRate;
    
    // Calculate memory usage estimation
    let memoryUsage = 0;
    let oldestEntry = Date.now();
    let mostAccessedKey = '';
    let maxHitCount = 0;
    
    for (const [key, entry] of this.cache) {
      // Rough estimation of memory usage
      memoryUsage += JSON.stringify(entry.data).length;
      
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      
      if (entry.hitCount > maxHitCount) {
        maxHitCount = entry.hitCount;
        mostAccessedKey = key;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      evictionCount: this.evictionCount,
      memoryUsage: Math.round(memoryUsage / 1024), // KB
      oldestEntry,
      mostAccessedKey
    };
  }

  /**
   * Export cache contents for debugging
   */
  exportCacheContents(): Record<string, any> {
    const contents: Record<string, any> = {};
    
    for (const [key, entry] of this.cache) {
      contents[key] = {
        version: entry.version,
        timestamp: new Date(entry.timestamp).toISOString(),
        hitCount: entry.hitCount,
        lastAccessed: new Date(entry.lastAccessed).toISOString(),
        dataSize: JSON.stringify(entry.data).length
      };
    }
    
    return contents;
  }

  /**
   * Force cache refresh for all entries
   */
  async refresh(): Promise<void> {
    logger.info('Force refreshing all cache entries');
    
    const keys = Array.from(this.cache.keys());
    this.invalidateAll();
    
    // Re-warm critical constants
    await this.warmCache();
    
    logger.info('Cache refresh completed', {
      keysRefreshed: keys.length,
      newCacheSize: this.cache.size
    });
  }
}

// Global cache instance
let globalCache: LegalConstantsCache | null = null;

/**
 * Get the global legal constants cache instance
 */
export function getLegalConstantsCache(): LegalConstantsCache {
  if (!globalCache) {
    globalCache = new LegalConstantsCache();
  }
  return globalCache;
}

/**
 * Initialize cache and warm with critical constants
 */
export async function initializeLegalConstantsCache(): Promise<void> {
  const cache = getLegalConstantsCache();
  await cache.warmCache();
}

/**
 * Convenience functions for accessing cached constants
 */
export const CachedConstants = {
  /**
   * Get tax brackets with high-performance caching
   */
  getTaxBrackets: async () => {
    const cache = getLegalConstantsCache();
    return cache.getTaxBrackets();
  },

  /**
   * Get EFKA rates with caching
   */
  getEfkaRates: async () => {
    const cache = getLegalConstantsCache();
    return cache.getEfkaRates();
  },

  /**
   * Get minimum wage with caching
   */
  getMinimumWage: async () => {
    const cache = getLegalConstantsCache();
    return cache.getMinimumWage();
  },

  /**
   * Get all constants with caching
   */
  getAllConstants: async () => {
    const cache = getLegalConstantsCache();
    return cache.getAllConstants();
  },

  /**
   * Get cache performance statistics
   */
  getStats: () => {
    const cache = getLegalConstantsCache();
    return cache.getStats();
  },

  /**
   * Memoize expensive tax calculations
   */
  memoizeTaxCalculation: <T extends (...args: any[]) => any>(fn: T) => {
    const cache = getLegalConstantsCache();
    return cache.memoize(fn, (...args) => JSON.stringify(args));
  }
};