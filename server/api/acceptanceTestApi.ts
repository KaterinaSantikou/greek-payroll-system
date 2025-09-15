import { Router, type Request, type Response } from 'express';
import { AcceptanceTestService } from '../services/AcceptanceTestService';
import { EdgeCaseService } from '../services/EdgeCaseService';
import { isAuthenticated } from '../replitAuth';

const router = Router();

/**
 * Run all acceptance tests (golden set)
 * GET /api/acceptance-tests/run-all
 */
router.get('/run-all', async (req: Request, res: Response) => {
  try {
    const testResults = await AcceptanceTestService.runAllAcceptanceTests();

    res.json({
      success: true,
      data: testResults,
      meta: {
        executed_at: new Date().toISOString(),
        test_environment: 'development',
        engine_version: '1.0.0',
      },
    });
  } catch (error: any) {
    console.error('Error running acceptance tests:', error);
    res.status(500).json({
      success: false,
      error: 'Acceptance test execution failed',
      details: error.message,
    });
  }
});

/**
 * Run specific acceptance test
 * GET /api/acceptance-tests/run/:testId
 */
router.get('/run/:testId', async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;

    let testResult;
    switch (testId) {
      case 'T-01':
        testResult = await AcceptanceTestService.testT01_NightSundayStacking();
        break;
      case 'T-02':
        testResult =
          await AcceptanceTestService.testT02_SplitShiftWithAllowance();
        break;
      case 'T-03':
        testResult = await AcceptanceTestService.testT03_SixthDayBlocked();
        break;
      case 'T-04':
        testResult =
          await AcceptanceTestService.testT04_SeasonalTerminationBatch();
        break;
      case 'T-05':
        testResult = await AcceptanceTestService.testT05_MinWageGuardrail();
        break;
      case 'T-06':
        testResult = await AcceptanceTestService.testT06_TipsDistribution();
        break;
      default:
        res.status(400).json({
          success: false,
          error: `Unknown test ID: ${testId}`,
          available_tests: ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06'],
        });
        return;
    }

    res.json({
      success: true,
      data: testResult,
      meta: {
        test_id: testId,
        executed_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(`Error running test ${req.params.testId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Test execution failed',
      details: error.message,
    });
  }
});

/**
 * Test edge case validation
 * POST /api/acceptance-tests/edge-case/seasonal-proration
 */
router.post(
  '/edge-case/seasonal-proration',
  async (req: Request, res: Response) => {
    try {
      const contract = {
        employeeId: req.body.employeeId || 'test-emp-001',
        contractType: 'seasonal_fixed' as const,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        durationMonths: req.body.durationMonths || 6,
        proratedBenefits: {
          deltaGifts: 0,
          vacationDays: 0,
        },
      };

      const payPeriod = {
        start: new Date(req.body.payPeriodStart),
        end: new Date(req.body.payPeriodEnd),
      };

      const result = EdgeCaseService.calculateSeasonalProration(
        contract,
        payPeriod
      );

      res.json({
        success: true,
        data: result,
        meta: {
          contract_type: contract.contractType,
          duration_months: contract.durationMonths,
          calculated_at: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Seasonal proration calculation failed',
        details: error.message,
      });
    }
  }
);

/**
 * Test split shift validation
 * POST /api/acceptance-tests/edge-case/split-shift
 */
router.post('/edge-case/split-shift', async (req: Request, res: Response) => {
  try {
    const splitShift = {
      shiftId: req.body.shiftId || 'test-split-001',
      employeeId: req.body.employeeId || 'test-emp-001',
      date: new Date(req.body.date),
      segments: req.body.segments || [],
      totalHours: req.body.totalHours || 0,
      totalBreakTime: req.body.totalBreakTime || 0,
      validBreakPattern: req.body.validBreakPattern || false,
    };

    const packId = req.body.packId || 'tourism-hotels';
    const result = EdgeCaseService.validateSplitShift(splitShift, packId);

    res.json({
      success: true,
      data: result,
      meta: {
        pack_id: packId,
        total_segments: splitShift.segments.length,
        validated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'Split shift validation failed',
      details: error.message,
    });
  }
});

/**
 * Test sixth day validation
 * POST /api/acceptance-tests/edge-case/sixth-day
 */
router.post('/edge-case/sixth-day', async (req: Request, res: Response) => {
  try {
    const employeeId = req.body.employeeId || 'test-emp-001';
    const proposedDate = new Date(req.body.proposedDate);
    const packId = req.body.packId || 'tourism-hotels';

    const result = EdgeCaseService.validateSixthDay(
      employeeId,
      proposedDate,
      packId
    );

    res.json({
      success: true,
      data: result,
      meta: {
        employee_id: employeeId,
        pack_id: packId,
        proposed_date: proposedDate.toISOString(),
        validated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'Sixth day validation failed',
      details: error.message,
    });
  }
});

/**
 * Test min wage floor adjustment
 * POST /api/acceptance-tests/edge-case/min-wage
 */
router.post('/edge-case/min-wage', async (req: Request, res: Response) => {
  try {
    const employeeId = req.body.employeeId || 'test-emp-001';
    const cbaWage = req.body.cbaWage || 700;
    const statutoryDate = req.body.statutoryDate
      ? new Date(req.body.statutoryDate)
      : new Date();

    const result = EdgeCaseService.applyMinWageFloor(
      employeeId,
      cbaWage,
      statutoryDate
    );

    res.json({
      success: true,
      data: result,
      meta: {
        employee_id: employeeId,
        statutory_date: statutoryDate.toISOString(),
        calculated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'Min wage floor calculation failed',
      details: error.message,
    });
  }
});

/**
 * Test mass termination batch processing
 * POST /api/acceptance-tests/edge-case/mass-termination
 */
router.post(
  '/edge-case/mass-termination',
  async (req: Request, res: Response) => {
    try {
      const employeeIds = req.body.employeeIds || [];
      const terminationDate = new Date(req.body.terminationDate);
      const reason = req.body.reason || 'seasonal_end';

      if (employeeIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No employee IDs provided',
        });
        return;
      }

      const result = await EdgeCaseService.processMassTerminationBatch(
        employeeIds,
        terminationDate,
        reason as 'seasonal_end' | 'economic' | 'restructure'
      );

      res.json({
        success: true,
        data: result,
        meta: {
          employee_count: employeeIds.length,
          termination_date: terminationDate.toISOString(),
          reason,
          processed_at: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Mass termination processing failed',
        details: error.message,
      });
    }
  }
);

/**
 * Get test summary and available tests
 * GET /api/acceptance-tests/info
 */
router.get('/info', (req: Request, res: Response) => {
  const testInfo = {
    golden_test_suite: {
      version: '1.0.0',
      total_tests: 6,
      test_categories: [
        'premium_stacking',
        'shift_management',
        'compliance_enforcement',
        'batch_processing',
        'wage_adjustments',
        'tips_distribution',
      ],
    },
    available_tests: [
      {
        id: 'T-01',
        name: 'Night + Sunday Stacking',
        category: 'premium_stacking',
        description: 'Validates premium stacking for night and Sunday work',
      },
      {
        id: 'T-02',
        name: 'Split Shift with Allowance',
        category: 'shift_management',
        description: 'Tests split shift validation and allowance application',
      },
      {
        id: 'T-03',
        name: 'Sixth Day Blocked',
        category: 'compliance_enforcement',
        description: 'Enforces sixth day constraints per CBA pack',
      },
      {
        id: 'T-04',
        name: 'Seasonal Termination Batch',
        category: 'batch_processing',
        description: 'Processes mass terminations with final pay calculations',
      },
      {
        id: 'T-05',
        name: 'Min Wage Guardrail',
        category: 'wage_adjustments',
        description: 'Applies minimum wage floor adjustments',
      },
      {
        id: 'T-06',
        name: 'Tips Distribution (F&B)',
        category: 'tips_distribution',
        description: 'Distributes tip pool with tax compliance',
      },
    ],
    edge_case_endpoints: [
      'POST /seasonal-proration - Test seasonal contract proration',
      'POST /split-shift - Test split shift validation',
      'POST /sixth-day - Test sixth day constraints',
      'POST /min-wage - Test minimum wage floor',
      'POST /mass-termination - Test batch termination processing',
    ],
  };

  res.json({
    success: true,
    data: testInfo,
    meta: {
      retrieved_at: new Date().toISOString(),
    },
  });
});

export default router;
