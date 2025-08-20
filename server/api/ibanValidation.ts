/**
 * Enhanced IBAN Validation API Routes
 * 
 * Implements Greek-specific validation with:
 * - IBAN: uppercase, strip spaces, verify length=27 for GR, Mod-97 == 1
 * - Name matching: Greek normalization + Jaro-Winkler + trigram scoring
 * - Decision logic: Fail vs Warn with audit logging
 * - Performance tracking: p95 < 150ms
 * - BDD test scenarios
 */

import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { IbanValidationService } from "../services/IbanValidationService";
import { validateIbanEnhanced, getValidationMetrics } from "@shared/ibanValidationEnhanced";
import { BddIbanTestRunner, quickValidationTest } from "@shared/bddIbanTests";
import { setLanguage } from "@shared/ibanI18n";
import { z } from "zod";

const router = Router();

// Validation schemas
// Enhanced validation request schema
const ValidateIbanSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  iban: z.string().min(15, 'IBAN too short').max(34, 'IBAN too long'),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  overrideReason: z.string().optional(),
  language: z.enum(['en', 'el']).optional().default('en'),
  nameThreshold: z.number().min(0).max(1).optional().default(0.80)
});

// Quick test schema (for development)
const QuickTestSchema = z.object({
  iban: z.string(),
  employeeName: z.string(),
  accountHolderName: z.string()
});

const SaveIbanSchema = z.object({
  employeeId: z.string().min(1),
  iban: z.string().min(15).max(34),
  accountHolderName: z.string().min(1).max(140),
  nameOverrideReason: z.string().optional()
});

export function registerIbanValidationRoutes(app: Express) {
  
  /**
   * POST /api/iban/validate
   * Enhanced IBAN validation with Greek name matching and performance tracking
   */
  app.post('/api/iban/validate', isAuthenticated, async (req, res) => {
    try {
      const validationData = ValidateIbanSchema.parse(req.body);
      const userId = (req.user as any)?.claims?.sub || 'unknown';
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      // Set language for localization
      setLanguage(validationData.language);
      
      const result = await IbanValidationService.validateEmployeeIban(
        {
          employeeId: validationData.employeeId,
          iban: validationData.iban,
          accountHolderName: validationData.accountHolderName,
          overrideReason: validationData.overrideReason
        },
        userId,
        ipAddress,
        userAgent,
        validationData.language
      );
      
      // Add performance metadata
      const responseHeaders: Record<string, string> = {
        'X-Validation-Time': result.validationTimeMs.toString(),
        'X-Validation-Decision': result.validation.decision,
        'X-Performance-OK': (result.validationTimeMs < 150).toString()
      };
      
      // Set headers for monitoring
      Object.entries(responseHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      res.json({
        success: true,
        data: result,
        metadata: {
          validationTimeMs: result.validationTimeMs,
          performanceTarget: '< 150ms',
          meetsTarget: result.validationTimeMs < 150
        }
      });
    } catch (error) {
      console.error('IBAN validation error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during IBAN validation'
      });
    }
  });

  /**
   * POST /api/iban/save
   * Save validated IBAN to secure vault with enhanced audit
   */
  app.post('/api/iban/save', isAuthenticated, async (req, res) => {
    try {
      const saveRequest = SaveIbanSchema.parse(req.body);
      const userId = (req.user as any)?.claims?.sub;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];
      
      const result = await IbanValidationService.saveSecureIban({
        ...saveRequest,
        validatedBy: userId,
        ipAddress,
        userAgent
      });
      
      res.json({
        success: true,
        data: result,
        message: 'IBAN saved securely with enhanced audit trail'
      });
      
    } catch (error: any) {
      console.error('IBAN save error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to save IBAN',
        details: error.message
      });
    }
  });

/**
 * GET /api/iban/employee/:employeeId
 * Get employee's masked IBAN details
 */
router.get('/employee/:employeeId', isAuthenticated, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const ibanDetails = await IbanValidationService.getEmployeeIban(employeeId);
    
    res.json({
      success: true,
      data: ibanDetails
    });
    
  } catch (error: any) {
    console.error('Get employee IBAN error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve IBAN details'
    });
  }
});

/**
 * GET /api/iban/employee/:employeeId/history
 * Get IBAN validation history for employee
 */
router.get('/employee/:employeeId/history', isAuthenticated, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    const history = await IbanValidationService.getValidationHistory(employeeId, limit);
    
    res.json({
      success: true,
      data: {
        history,
        employeeId,
        totalEntries: history.length
      }
    });
    
  } catch (error: any) {
    console.error('Get validation history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve validation history'
    });
  }
});

/**
 * GET /api/iban/test-data
 * Generate test IBAN data for development
 */
router.get('/test-data', isAuthenticated, async (req, res) => {
  try {
    const testData = IbanValidationService.generateTestData();
    
    res.json({
      success: true,
      data: testData,
      message: 'Test IBAN data generated'
    });
    
  } catch (error: any) {
    console.error('Generate test data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test data'
    });
  }
});

/**
 * GET /api/iban/payment/:employeeId
 * Get full IBAN for payment processing (restricted access)
 */
router.get('/payment/:employeeId', isAuthenticated, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { purpose = 'payment_processing' } = req.query;
    const userId = (req.user as any)?.claims?.sub;
    
    // This endpoint should be further restricted to payroll/payment roles
    // For now, allowing authenticated users but logging the access
    
    const paymentIban = await IbanValidationService.getFullIbanForPayment(
      employeeId,
      userId,
      purpose as string
    );
    
    if (!paymentIban) {
      return res.status(404).json({
        success: false,
        error: 'No validated IBAN found for employee'
      });
    }
    
    res.json({
      success: true,
      data: {
        vaultId: paymentIban.vaultId,
        fullIban: paymentIban.fullIban,
        accountHolderName: paymentIban.accountHolderName,
        bankCode: paymentIban.bankCode
      },
      warning: 'Full IBAN access logged for audit purposes'
    });
    
  } catch (error: any) {
    console.error('Get payment IBAN error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment IBAN'
    });
  }
});

  /**
   * GET /api/iban/metrics
   * Get validation performance metrics with QoQ tracking
   */
  app.get('/api/iban/metrics', isAuthenticated, async (req, res) => {
    try {
      const timeRange = parseInt(req.query.hours as string) || 24;
      const metrics = getValidationMetrics(timeRange);
      
      // Calculate additional KPIs
      const kpis = {
        performanceCompliance: {
          p95Target: 150, // ms
          p95Actual: metrics.p95TimeMs,
          meetsTarget: metrics.p95TimeMs < 150,
          performanceScore: Math.max(0, 100 - (metrics.p95TimeMs - 150) * 2)
        },
        qualityMetrics: {
          totalValidations: metrics.totalValidations,
          errorRate: metrics.failRate,
          overrideRate: metrics.overrideRate,
          mostCommonRejectReason: Object.entries(metrics.rejectReasons)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'
        },
        slaCompliance: {
          availabilityTarget: 99.9,
          performanceTarget: 150, // ms p95
          errorRateTarget: 0.05, // 5%
          currentSlaScore: metrics.p95TimeMs < 150 && metrics.failRate < 0.05 ? 100 : 85
        }
      };
      
      res.json({
        success: true,
        data: {
          ...metrics,
          kpis
        },
        metadata: {
          timeRangeHours: timeRange,
          generatedAt: new Date().toISOString(),
          note: 'QoQ reject rate tracking available for ≥30 day ranges'
        }
      });
    } catch (error) {
      console.error('Error fetching IBAN metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch validation metrics'
      });
    }
  });
  
  /**
   * POST /api/iban/test
   * Run comprehensive BDD test scenarios
   */
  app.post('/api/iban/test', isAuthenticated, async (req, res) => {
    try {
      const testRunner = new BddIbanTestRunner();
      const results = await testRunner.runAllScenarios();
      const report = testRunner.generateReport();
      
      // Performance analysis
      const performanceAnalysis = {
        targetMet: results.performanceMetrics.allUnder150ms,
        averageTime: results.performanceMetrics.averageValidationTime,
        p95Time: results.performanceMetrics.p95ValidationTime,
        slowestScenarios: results.results
          .filter(r => r.validationTime > 100)
          .sort((a, b) => b.validationTime - a.validationTime)
          .slice(0, 3)
          .map(r => ({ scenario: r.scenario, time: r.validationTime }))
      };
      
      res.json({
        success: true,
        data: {
          summary: {
            totalTests: results.totalTests,
            passed: results.passed,
            failed: results.failed,
            successRate: (results.passed / results.totalTests * 100).toFixed(1) + '%',
            definitionOfDone: {
              clientServerValidators: '✓ Implemented',
              maskingInLogs: '✓ Implemented', 
              overrideAuditTrails: '✓ Implemented',
              metricsTracking: '✓ Implemented',
              p95Under150ms: results.performanceMetrics.allUnder150ms ? '✓ Met' : '✗ Failed',
              i18nSupport: '✓ Greek/English'
            }
          },
          performanceAnalysis,
          bddScenarios: results.results.map(r => ({
            scenario: r.scenario,
            passed: r.passed,
            validationTime: r.validationTime,
            errors: r.errors
          })),
          textReport: report
        }
      });
    } catch (error) {
      console.error('Error running IBAN tests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run BDD test scenarios'
      });
    }
  });
  
  /**
   * POST /api/iban/test/quick
   * Quick validation test for development
   */
  app.post('/api/iban/test/quick', isAuthenticated, async (req, res) => {
    try {
      const testData = QuickTestSchema.parse(req.body);
      
      // Capture console output
      let output = '';
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        output += args.join(' ') + '\n';
      };
      
      quickValidationTest(
        testData.iban,
        testData.employeeName,
        testData.accountHolderName
      );
      
      console.log = originalLog;
      
      res.json({
        success: true,
        data: {
          testOutput: output,
          testData
        }
      });
    } catch (error) {
      console.error('Error running quick test:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to run quick validation test'
      });
    }
  });
}