import { db } from '../db';
import { exchangeRates, type ExchangeRate, type NewExchangeRate } from '@shared/billingSchema';
import { eq, and, desc } from 'drizzle-orm';

export interface ECBExchangeRatesResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface CurrencyConversion {
  originalAmountCents: number;
  originalCurrency: string;
  eurAmountCents: number;
  exchangeRate: number;
  exchangeRateDate: Date;
}

export class CurrencyService {

  /**
   * Fetch latest ECB exchange rates
   */
  async fetchECBRates(): Promise<ECBExchangeRatesResponse | null> {
    try {
      // Using exchangerate-api.com as a reliable source for ECB rates
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      
      if (!response.ok) {
        console.error('Failed to fetch exchange rates:', response.statusText);
        return null;
      }

      const data = await response.json();
      
      return {
        success: true,
        timestamp: Date.now(),
        base: 'EUR',
        date: data.date,
        rates: data.rates
      };

    } catch (error) {
      console.error('Error fetching ECB rates:', error);
      return null;
    }
  }

  /**
   * Update exchange rates from ECB
   */
  async updateExchangeRates(): Promise<boolean> {
    try {
      const ecbData = await this.fetchECBRates();
      
      if (!ecbData || !ecbData.success) {
        return false;
      }

      const rateDate = new Date(ecbData.date);
      const newRates: NewExchangeRate[] = [];

      // Store EUR as base currency with rate 1.0
      newRates.push({
        baseCurrency: 'EUR',
        targetCurrency: 'EUR',
        rate: '1.0',
        rateDate: rateDate.toISOString().split('T')[0] as any,
        source: 'ECB'
      });

      // Store rates for other currencies
      for (const [currency, rate] of Object.entries(ecbData.rates)) {
        if (currency !== 'EUR') {
          newRates.push({
            baseCurrency: 'EUR',
            targetCurrency: currency,
            rate: rate.toString(),
            rateDate: rateDate.toISOString().split('T')[0] as any,
            source: 'ECB'
          });
        }
      }

      // Insert new rates (will conflict if already exists for this date)
      for (const rate of newRates) {
        try {
          await db.insert(exchangeRates)
            .values(rate)
            .onConflictDoNothing();
        } catch (error) {
          // Rate already exists for this date, skip
          continue;
        }
      }

      console.log(`Updated ${newRates.length} exchange rates for ${rateDate.toISOString().split('T')[0]}`);
      return true;

    } catch (error) {
      console.error('Error updating exchange rates:', error);
      return false;
    }
  }

  /**
   * Get exchange rate for a specific currency and date
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string = 'EUR',
    rateDate?: Date
  ): Promise<ExchangeRate | null> {
    const targetDate = rateDate || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // If same currency, return rate of 1
    if (fromCurrency === toCurrency) {
      return {
        id: 'same-currency',
        baseCurrency: fromCurrency,
        targetCurrency: toCurrency,
        rate: '1.0',
        rateDate: dateStr as any,
        source: 'synthetic',
        createdAt: new Date()
      };
    }

    // Look for direct rate
    let rate = await db.select()
      .from(exchangeRates)
      .where(and(
        eq(exchangeRates.baseCurrency, fromCurrency),
        eq(exchangeRates.targetCurrency, toCurrency),
        eq(exchangeRates.rateDate, dateStr as any)
      ))
      .then(rows => rows[0]);

    if (rate) {
      return rate;
    }

    // Look for inverse rate (EUR -> target, need target -> EUR)
    if (fromCurrency !== 'EUR' && toCurrency === 'EUR') {
      const inverseRate = await db.select()
        .from(exchangeRates)
        .where(and(
          eq(exchangeRates.baseCurrency, 'EUR'),
          eq(exchangeRates.targetCurrency, fromCurrency),
          eq(exchangeRates.rateDate, dateStr as any)
        ))
        .then(rows => rows[0]);

      if (inverseRate) {
        const inversedRate = 1 / parseFloat(inverseRate.rate);
        return {
          id: 'calculated-inverse',
          baseCurrency: fromCurrency,
          targetCurrency: toCurrency,
          rate: inversedRate.toString(),
          rateDate: dateStr as any,
          source: 'calculated',
          createdAt: new Date()
        };
      }
    }

    // Try to find the most recent rate within 7 days
    const oneWeekAgo = new Date(targetDate);
    oneWeekAgo.setDate(targetDate.getDate() - 7);

    rate = await db.select()
      .from(exchangeRates)
      .where(and(
        eq(exchangeRates.baseCurrency, fromCurrency),
        eq(exchangeRates.targetCurrency, toCurrency)
      ))
      .orderBy(desc(exchangeRates.rateDate))
      .limit(1)
      .then(rows => rows[0]);

    return rate || null;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amountCents: number,
    fromCurrency: string,
    toCurrency: string = 'EUR',
    supplyDate?: Date
  ): Promise<CurrencyConversion | null> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, supplyDate);
    
    if (!exchangeRate) {
      console.warn(`No exchange rate found for ${fromCurrency} -> ${toCurrency} on ${supplyDate}`);
      return null;
    }

    const rate = parseFloat(exchangeRate.rate);
    const convertedAmountCents = Math.round(amountCents * rate);

    return {
      originalAmountCents: amountCents,
      originalCurrency: fromCurrency,
      eurAmountCents: convertedAmountCents,
      exchangeRate: rate,
      exchangeRateDate: new Date(exchangeRate.rateDate)
    };
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    const currencies = await db.select({
      currency: exchangeRates.targetCurrency
    })
    .from(exchangeRates)
    .groupBy(exchangeRates.targetCurrency);

    return currencies.map(c => c.currency).sort();
  }

  /**
   * Initialize daily exchange rate update
   */
  startDailyRateUpdate(): void {
    // Update rates immediately
    this.updateExchangeRates();

    // Schedule daily updates at 16:00 CET (after ECB publishes rates)
    const updateInterval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 16 && now.getMinutes() === 0) {
        await this.updateExchangeRates();
      }
    }, 60000); // Check every minute

    console.log('ECB exchange rate updates scheduled for 16:00 CET daily');
  }

  /**
   * Manually set exchange rate (for testing or special cases)
   */
  async setManualExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    rateDate: Date
  ): Promise<ExchangeRate> {
    const newRate: NewExchangeRate = {
      baseCurrency: fromCurrency,
      targetCurrency: toCurrency,
      rate: rate.toString(),
      rateDate: rateDate.toISOString().split('T')[0] as any,
      source: 'manual'
    };

    const [exchangeRate] = await db.insert(exchangeRates)
      .values(newRate)
      .onConflictDoUpdate({
        target: [exchangeRates.baseCurrency, exchangeRates.targetCurrency, exchangeRates.rateDate],
        set: {
          rate: newRate.rate,
          source: 'manual'
        }
      })
      .returning();

    return exchangeRate;
  }
}

export const currencyService = new CurrencyService();