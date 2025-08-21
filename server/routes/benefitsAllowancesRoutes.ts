/**
 * Greek Benefits and Allowances API Routes
 * 
 * Handles specialized Greek benefits with proper tax treatment:
 * - Meal vouchers (non-tax up to €6/day)
 * - Travel per diems with statutory limits
 * - Tips distribution (hotels/restaurants)
 * - In-kind benefits (AADE valuation rules)
 */

import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { greekBenefitsAllowancesService } from "../services/GreekBenefitsAllowancesService";
import { storage } from "../storage";

export function registerBenefitsAllowancesRoutes(app: Express): void {

  // Calculate meal vouchers tax treatment (€6/day tax-free)
  app.post('/api/benefits/meal-vouchers/calculate', isAuthenticated, async (req, res) => {
    try {
      const { totalAmount, daysWorked } = req.body;
      
      if (!totalAmount || !daysWorked || totalAmount <= 0 || daysWorked <= 0) {
        return res.status(400).json({ 
          error: 'Valid total amount and days worked are required' 
        });
      }
      
      const calculation = greekBenefitsAllowancesService.calculateMealVouchers(
        parseFloat(totalAmount),
        parseInt(daysWorked)
      );
      
      res.json({
        ...calculation,
        legalBasis: 'Greek Tax Code - Meal vouchers up to €6/day exempt',
        description: 'Tax-free meal vouchers up to €6 per working day, excess taxable as income'
      });
    } catch (error) {
      console.error('Error calculating meal vouchers:', error);
      res.status(500).json({ error: 'Failed to calculate meal vouchers' });
    }
  });

  // Calculate travel per diem tax treatment
  app.post('/api/benefits/travel-per-diem/calculate', isAuthenticated, async (req, res) => {
    try {
      const { totalAmount, daysEligible, isInternational = false } = req.body;
      
      if (!totalAmount || !daysEligible || totalAmount <= 0 || daysEligible <= 0) {
        return res.status(400).json({ 
          error: 'Valid total amount and eligible days are required' 
        });
      }
      
      const calculation = greekBenefitsAllowancesService.calculateTravelPerDiem(
        parseFloat(totalAmount),
        parseInt(daysEligible),
        Boolean(isInternational)
      );
      
      res.json({
        ...calculation,
        legalBasis: 'Greek Tax Code - Travel per diem statutory exemption limits',
        description: `Travel allowances: €30/day domestic, €60/day international exempt. Excess taxable.`
      });
    } catch (error) {
      console.error('Error calculating travel per diem:', error);
      res.status(500).json({ error: 'Failed to calculate travel per diem' });
    }
  });

  // Calculate tips distribution for hotels/restaurants
  app.post('/api/benefits/tips/calculate', isAuthenticated, async (req, res) => {
    try {
      const { 
        totalTipsCollected, 
        employeePointsOrHours, 
        totalPointsOrHours,
        distributionMethod = 'points',
        isPartOfPayroll = true,
        isServiceCharge = false
      } = req.body;
      
      if (!totalTipsCollected || !employeePointsOrHours || !totalPointsOrHours) {
        return res.status(400).json({ 
          error: 'Tips collected, employee points/hours, and total points/hours are required' 
        });
      }
      
      const calculation = greekBenefitsAllowancesService.calculateTipsDistribution(
        parseFloat(totalTipsCollected),
        parseFloat(employeePointsOrHours),
        parseFloat(totalPointsOrHours),
        distributionMethod as 'points' | 'hours' | 'equal',
        Boolean(isPartOfPayroll),
        Boolean(isServiceCharge)
      );
      
      res.json({
        ...calculation,
        legalBasis: 'Greek Labor Law - Tips distribution and tax treatment',
        description: 'Hotel/restaurant tips: contributory if payroll-managed, service charges may be exempt'
      });
    } catch (error) {
      console.error('Error calculating tips distribution:', error);
      res.status(500).json({ error: 'Failed to calculate tips distribution' });
    }
  });

  // Calculate in-kind benefits with AADE valuation
  app.post('/api/benefits/in-kind/calculate', isAuthenticated, async (req, res) => {
    try {
      const { benefitType, marketValue, benefitDetails = {} } = req.body;
      
      if (!benefitType || !marketValue || marketValue <= 0) {
        return res.status(400).json({ 
          error: 'Benefit type and market value are required' 
        });
      }
      
      const validTypes = ['company_car', 'accommodation', 'stock_options', 'other'];
      if (!validTypes.includes(benefitType)) {
        return res.status(400).json({ 
          error: 'Benefit type must be: company_car, accommodation, stock_options, or other' 
        });
      }
      
      const calculation = greekBenefitsAllowancesService.calculateInKindBenefit(
        benefitType,
        parseFloat(marketValue),
        benefitDetails
      );
      
      res.json({
        ...calculation,
        legalBasis: 'AADE Valuation Rules for In-Kind Benefits',
        description: calculation.taxDescription
      });
    } catch (error) {
      console.error('Error calculating in-kind benefit:', error);
      res.status(500).json({ error: 'Failed to calculate in-kind benefit' });
    }
  });

  // Calculate total benefits impact on payroll
  app.post('/api/benefits/total-impact/calculate', isAuthenticated, async (req, res) => {
    try {
      const { 
        mealVouchersData, 
        travelPerDiemData, 
        tipsData, 
        inKindBenefitsData = [] 
      } = req.body;
      
      // Calculate individual components
      const mealVouchers = mealVouchersData ? 
        greekBenefitsAllowancesService.calculateMealVouchers(
          mealVouchersData.totalAmount,
          mealVouchersData.daysWorked
        ) : {
          totalAmount: 0,
          dailyAmount: 0,
          daysWorked: 0,
          exemptAmount: 0,
          taxableAmount: 0,
          taxFreeThreshold: 6.00,
          isFullyExempt: true
        };
      
      const travelPerDiem = travelPerDiemData ?
        greekBenefitsAllowancesService.calculateTravelPerDiem(
          travelPerDiemData.totalAmount,
          travelPerDiemData.daysEligible,
          travelPerDiemData.isInternational
        ) : {
          totalAmount: 0,
          daysEligible: 0,
          domesticRate: 30.00,
          internationalRate: 60.00,
          exemptAmount: 0,
          taxableAmount: 0,
          statutoryLimits: { domestic: 30.00, international: 60.00 }
        };
      
      const tips = tipsData ?
        greekBenefitsAllowancesService.calculateTipsDistribution(
          tipsData.totalTipsCollected,
          tipsData.employeePointsOrHours,
          tipsData.totalPointsOrHours,
          tipsData.distributionMethod,
          tipsData.isPartOfPayroll,
          tipsData.isServiceCharge
        ) : {
          totalTipsCollected: 0,
          employeeShare: 0,
          poolPercentage: 0,
          isContributory: false,
          isServiceCharge: false,
          taxableAmount: 0,
          exemptAmount: 0,
          efkaContributions: 0
        };
      
      const inKindBenefits = inKindBenefitsData.map((benefit: any) =>
        greekBenefitsAllowancesService.calculateInKindBenefit(
          benefit.benefitType,
          benefit.marketValue,
          benefit.benefitDetails
        )
      );
      
      const totalImpact = greekBenefitsAllowancesService.calculateTotalBenefitsImpact(
        mealVouchers,
        travelPerDiem,
        tips,
        inKindBenefits
      );
      
      res.json({
        ...totalImpact,
        breakdown: {
          mealVouchers,
          travelPerDiem, 
          tips,
          inKindBenefits
        }
      });
    } catch (error) {
      console.error('Error calculating total benefits impact:', error);
      res.status(500).json({ error: 'Failed to calculate total benefits impact' });
    }
  });

  // Validate benefits eligibility
  app.post('/api/benefits/validate', isAuthenticated, async (req, res) => {
    try {
      const { benefitType, employeeData = {}, benefitAmount } = req.body;
      
      if (!benefitType) {
        return res.status(400).json({ error: 'Benefit type is required' });
      }
      
      const validation = greekBenefitsAllowancesService.validateBenefitsEligibility(
        benefitType,
        employeeData,
        parseFloat(benefitAmount) || 0
      );
      
      res.json({
        benefitType,
        ...validation,
        limits: greekBenefitsAllowancesService.getGreekBenefitsLimits()
      });
    } catch (error) {
      console.error('Error validating benefits eligibility:', error);
      res.status(500).json({ error: 'Failed to validate benefits eligibility' });
    }
  });

  // Get Greek benefits statutory limits and rates
  app.get('/api/benefits/limits', isAuthenticated, async (req, res) => {
    try {
      const limits = greekBenefitsAllowancesService.getGreekBenefitsLimits();
      
      res.json({
        ...limits,
        lastUpdated: new Date().toISOString(),
        source: 'Greek Tax Code and AADE Regulations',
        description: 'Current statutory limits for Greek employee benefits'
      });
    } catch (error) {
      console.error('Error fetching benefits limits:', error);
      res.status(500).json({ error: 'Failed to fetch benefits limits' });
    }
  });

  // Get available benefit types
  app.get('/api/benefits/types', isAuthenticated, async (req, res) => {
    try {
      const benefitTypes = [
        {
          id: 'meal_vouchers',
          name: 'Meal Vouchers',
          nameGreek: 'Κουπόνια Γεύματος',
          taxFreeLimit: '€6/day',
          description: 'Tax-free meal vouchers up to €6 per working day',
          taxTreatment: 'Exempt up to daily limit, excess taxable'
        },
        {
          id: 'travel_per_diem',
          name: 'Travel Per Diem',
          nameGreek: 'Ημερήσια Αποζημίωση',
          taxFreeLimit: '€30/day domestic, €60/day international',
          description: 'Travel allowances with statutory exemption limits',
          taxTreatment: 'Exempt up to statutory limits, excess taxable'
        },
        {
          id: 'tips_distribution',
          name: 'Tips Distribution',
          nameGreek: 'Διανομή Φιλοδωρημάτων',
          taxFreeLimit: 'None (special rules apply)',
          description: 'Hotel/restaurant tips distribution system',
          taxTreatment: 'Contributory if payroll-managed, service charge exemptions'
        },
        {
          id: 'company_car',
          name: 'Company Car',
          nameGreek: 'Εταιρικό Αυτοκίνητο',
          taxFreeLimit: 'None',
          description: 'Company car benefit valuation',
          taxTreatment: '1.2% of car value per month (min €50), fully taxable'
        },
        {
          id: 'accommodation',
          name: 'Accommodation Benefit',
          nameGreek: 'Παροχή Στέγασης',
          taxFreeLimit: 'None',
          description: 'Company-provided accommodation',
          taxTreatment: 'Market rent or 0.3% property value monthly, fully taxable'
        },
        {
          id: 'stock_options',
          name: 'Stock Options',
          nameGreek: 'Δικαιώματα Προαίρεσης Μετοχών',
          taxFreeLimit: 'None',
          description: 'Employee stock option benefits',
          taxTreatment: 'Taxable at exercise (market - exercise price), EFKA exempt'
        }
      ];
      
      res.json(benefitTypes);
    } catch (error) {
      console.error('Error fetching benefit types:', error);
      res.status(500).json({ error: 'Failed to fetch benefit types' });
    }
  });

  // Calculate employee benefits summary
  app.get('/api/benefits/employee/:employeeId/summary', isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { year, month } = req.query;
      
      // This would normally fetch from database
      const benefitsSummary = {
        employeeId,
        period: `${year}-${month}`,
        benefits: {
          mealVouchers: {
            totalAmount: 120.00,
            exemptAmount: 120.00, // 20 days × €6
            taxableAmount: 0.00,
            daysWorked: 20
          },
          travelPerDiem: {
            totalAmount: 450.00,
            exemptAmount: 450.00, // 15 days × €30
            taxableAmount: 0.00,
            daysEligible: 15
          },
          tips: {
            employeeShare: 340.00,
            taxableAmount: 340.00,
            efkaContributions: 31.72 // 9.33%
          },
          inKindBenefits: [
            {
              type: 'company_car',
              marketValue: 25000,
              monthlyTaxableValue: 300.00,
              annualTaxableValue: 3600.00
            }
          ]
        },
        totals: {
          totalBenefitsValue: 910.00,
          totalTaxableAmount: 640.00,
          totalExemptAmount: 570.00,
          totalEfkaContributions: 31.72,
          estimatedIncomeTax: 140.80
        }
      };
      
      res.json(benefitsSummary);
    } catch (error) {
      console.error('Error fetching employee benefits summary:', error);
      res.status(500).json({ error: 'Failed to fetch employee benefits summary' });
    }
  });

  // Benefits compliance report
  app.get('/api/benefits/compliance-report', isAuthenticated, async (req, res) => {
    try {
      const { propertyId, year } = req.query;
      
      const report = {
        reportDate: new Date().toISOString(),
        propertyId: propertyId || 'all',
        year: year || new Date().getFullYear(),
        summary: {
          totalEmployees: 0,
          benefitsBreakdown: {
            mealVouchers: {
              employees: 0,
              totalAmount: 0,
              exemptAmount: 0,
              taxableAmount: 0,
              averageDaily: 0
            },
            travelPerDiem: {
              employees: 0,
              totalAmount: 0,
              exemptAmount: 0,
              taxableAmount: 0,
              averageDaily: 0
            },
            tips: {
              employees: 0,
              totalDistributed: 0,
              totalTaxable: 0,
              totalEfkaContributions: 0
            },
            inKindBenefits: {
              employees: 0,
              totalMarketValue: 0,
              totalTaxableValue: 0,
              byType: {
                companyCar: 0,
                accommodation: 0,
                stockOptions: 0,
                other: 0
              }
            }
          }
        },
        complianceItems: [
          'Meal vouchers within €6/day limit',
          'Travel per diems within statutory limits',
          'Tips distribution properly documented',
          'In-kind benefits AADE valuation compliance',
          'Proper tax/EFKA treatment applied'
        ],
        recommendations: [
          'Monitor meal voucher daily limits to maximize tax efficiency',
          'Document travel justification for per diem claims',
          'Ensure tips distribution records are maintained',
          'Review AADE valuation methods for in-kind benefits annually',
          'Consider benefit mix optimization for tax efficiency'
        ]
      };
      
      res.json(report);
    } catch (error) {
      console.error('Error generating benefits compliance report:', error);
      res.status(500).json({ error: 'Failed to generate benefits compliance report' });
    }
  });
}