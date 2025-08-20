/**
 * A/B Testing Framework - Core library for systematic conversion optimization
 * Provides statistical analysis, test management, and conversion tracking
 */

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  startDate: string;
  endDate?: string;
  targetMetric: string;
  variants: ABVariant[];
  trafficAllocation: number; // Percentage of users to include in test
  minimumSampleSize: number;
  confidenceLevel: number; // e.g., 0.95 for 95%
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  isControl: boolean;
  trafficWeight: number; // Percentage allocation within test
  config: Record<string, any>; // Variant configuration
  metrics: ABMetrics;
}

export interface ABMetrics {
  impressions: number;
  conversions: number;
  conversionRate: number;
  revenue?: number;
  averageOrderValue?: number;
  bounceRate?: number;
  timeOnPage?: number;
}

export interface ABTestResult {
  testId: string;
  winner?: string;
  confidence: number;
  pValue: number;
  liftPercentage: number;
  isStatisticallySignificant: boolean;
  recommendedAction: 'continue' | 'stop_winner' | 'stop_no_winner' | 'extend';
  results: VariantResult[];
}

export interface VariantResult {
  variantId: string;
  name: string;
  isControl: boolean;
  metrics: ABMetrics;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  zScore: number;
}

export interface ABTestEvent {
  testId: string;
  variantId: string;
  userId: string;
  sessionId: string;
  eventType: 'impression' | 'conversion' | 'custom';
  eventValue?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

// Statistical functions
export class ABTestStatistics {
  static calculateConversionRate(conversions: number, impressions: number): number {
    return impressions > 0 ? (conversions / impressions) * 100 : 0;
  }

  static calculateZScore(controlRate: number, testRate: number, controlSize: number, testSize: number): number {
    const pooledRate = (controlRate * controlSize + testRate * testSize) / (controlSize + testSize);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlSize + 1/testSize));
    return standardError > 0 ? (testRate - controlRate) / standardError : 0;
  }

  static calculatePValue(zScore: number): number {
    // Two-tailed p-value calculation
    return 2 * (1 - this.normalCDF(Math.abs(zScore)));
  }

  static calculateConfidenceInterval(rate: number, sampleSize: number, confidence: number = 0.95): { lower: number; upper: number } {
    const z = this.getZValue(confidence);
    const standardError = Math.sqrt((rate * (1 - rate)) / sampleSize);
    const margin = z * standardError;
    
    return {
      lower: Math.max(0, (rate - margin) * 100),
      upper: Math.min(100, (rate + margin) * 100)
    };
  }

  static calculateMinimumSampleSize(
    baselineRate: number,
    minimumDetectableEffect: number,
    alpha: number = 0.05,
    beta: number = 0.2
  ): number {
    const zAlpha = this.getZValue(1 - alpha/2);
    const zBeta = this.getZValue(1 - beta);
    const p1 = baselineRate;
    const p2 = baselineRate * (1 + minimumDetectableEffect);
    const pooledP = (p1 + p2) / 2;
    
    const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
    const denominator = Math.pow(p2 - p1, 2);
    
    return Math.ceil(numerator / denominator);
  }

  static isStatisticallySignificant(pValue: number, alpha: number = 0.05): boolean {
    return pValue < alpha;
  }

  static calculateLift(controlRate: number, testRate: number): number {
    return controlRate > 0 ? ((testRate - controlRate) / controlRate) * 100 : 0;
  }

  private static normalCDF(x: number): number {
    // Approximation of the cumulative distribution function for standard normal distribution
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private static getZValue(confidence: number): number {
    // Common z-values for confidence levels
    const zValues: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.960,
      0.99: 2.576
    };
    return zValues[confidence] || 1.960;
  }
}

// Test management
export class ABTestManager {
  private static tests: Map<string, ABTest> = new Map();
  private static events: ABTestEvent[] = [];

  static createTest(test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): ABTest {
    const newTest: ABTest = {
      ...test,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tests.set(newTest.id, newTest);
    return newTest;
  }

  static getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }

  static getAllTests(): ABTest[] {
    return Array.from(this.tests.values());
  }

  static updateTest(testId: string, updates: Partial<ABTest>): ABTest | undefined {
    const test = this.tests.get(testId);
    if (!test) return undefined;

    const updatedTest = {
      ...test,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.tests.set(testId, updatedTest);
    return updatedTest;
  }

  static startTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'draft') return false;

    this.updateTest(testId, { 
      status: 'running',
      startDate: new Date().toISOString()
    });
    return true;
  }

  static stopTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return false;

    this.updateTest(testId, { 
      status: 'completed',
      endDate: new Date().toISOString()
    });
    return true;
  }

  static assignVariant(testId: string, userId: string): string | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return null;

    // Simple hash-based assignment for consistent user experience
    const hash = this.hashUserId(userId, testId);
    const trafficThreshold = test.trafficAllocation / 100;
    
    if (hash > trafficThreshold) return null; // User not in test

    // Assign variant based on traffic weights
    let cumulative = 0;
    const targetHash = hash / trafficThreshold; // Normalize to 0-1 within test traffic

    for (const variant of test.variants) {
      cumulative += variant.trafficWeight / 100;
      if (targetHash <= cumulative) {
        return variant.id;
      }
    }

    return test.variants[0]?.id || null;
  }

  static trackEvent(event: Omit<ABTestEvent, 'timestamp'>): void {
    const fullEvent: ABTestEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    this.events.push(fullEvent);

    // Update test metrics
    this.updateTestMetrics(event.testId, event.variantId, event.eventType, event.eventValue);
  }

  static getTestResults(testId: string): ABTestResult | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    const controlVariant = test.variants.find(v => v.isControl);
    if (!controlVariant) return null;

    const results: VariantResult[] = test.variants.map(variant => {
      const conversionRate = variant.metrics.conversionRate / 100;
      const confidenceInterval = ABTestStatistics.calculateConfidenceInterval(
        conversionRate,
        variant.metrics.impressions,
        test.confidenceLevel
      );

      const zScore = variant.isControl ? 0 : ABTestStatistics.calculateZScore(
        controlVariant.metrics.conversionRate / 100,
        conversionRate,
        controlVariant.metrics.impressions,
        variant.metrics.impressions
      );

      return {
        variantId: variant.id,
        name: variant.name,
        isControl: variant.isControl,
        metrics: variant.metrics,
        confidenceInterval,
        zScore
      };
    });

    // Find best performing non-control variant
    const testVariants = results.filter(r => !r.isControl);
    const bestVariant = testVariants.reduce((best, current) => 
      current.metrics.conversionRate > best.metrics.conversionRate ? current : best
    , testVariants[0]);

    const controlResult = results.find(r => r.isControl)!;
    const pValue = bestVariant ? ABTestStatistics.calculatePValue(bestVariant.zScore) : 1;
    const lift = bestVariant ? ABTestStatistics.calculateLift(
      controlResult.metrics.conversionRate,
      bestVariant.metrics.conversionRate
    ) : 0;

    const isSignificant = ABTestStatistics.isStatisticallySignificant(pValue);
    const hasMinimumSample = test.variants.every(v => v.metrics.impressions >= test.minimumSampleSize);

    let recommendedAction: ABTestResult['recommendedAction'] = 'continue';
    if (hasMinimumSample && isSignificant) {
      recommendedAction = bestVariant && bestVariant.metrics.conversionRate > controlResult.metrics.conversionRate 
        ? 'stop_winner' : 'stop_no_winner';
    } else if (hasMinimumSample && !isSignificant) {
      recommendedAction = 'stop_no_winner';
    }

    return {
      testId,
      winner: isSignificant && bestVariant ? bestVariant.variantId : undefined,
      confidence: (1 - pValue) * 100,
      pValue,
      liftPercentage: lift,
      isStatisticallySignificant: isSignificant,
      recommendedAction,
      results
    };
  }

  private static updateTestMetrics(testId: string, variantId: string, eventType: string, eventValue?: number): void {
    const test = this.tests.get(testId);
    if (!test) return;

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) return;

    if (eventType === 'impression') {
      variant.metrics.impressions += 1;
    } else if (eventType === 'conversion') {
      variant.metrics.conversions += 1;
      if (eventValue) {
        variant.metrics.revenue = (variant.metrics.revenue || 0) + eventValue;
      }
    }

    // Recalculate derived metrics
    variant.metrics.conversionRate = ABTestStatistics.calculateConversionRate(
      variant.metrics.conversions,
      variant.metrics.impressions
    );

    if (variant.metrics.revenue && variant.metrics.conversions > 0) {
      variant.metrics.averageOrderValue = variant.metrics.revenue / variant.metrics.conversions;
    }

    this.updateTest(testId, test);
  }

  private static hashUserId(userId: string, testId: string): number {
    const str = `${userId}-${testId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}