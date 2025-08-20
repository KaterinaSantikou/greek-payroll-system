import type { Express } from "express";
import { z } from "zod";
import { SeveranceFinalPayService } from "../services/SeveranceFinalPayService";
import { ErganiTerminationService } from "../services/ErganiTerminationService";
import { MakerCheckerService } from "../services/MakerCheckerService";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";

// Define severance calculation input schema
const severanceCalculationInputsSchema = z.object({
  employeeId: z.string(),
  contractType: z.string().default('indefinite'),
  hireDate: z.string(),
  terminationDate: z.string(),
  terminationType: z.string(),
  terminationCause: z.string().optional(),
  lastMonthlyWage: z.number().min(0),
  baseRate: z.number().min(0),
  avgRegular6m: z.number().optional(),
  easterPaid: z.boolean().default(false),
  christmasPaid: z.boolean().default(false),
  withNotice: z.boolean().default(false),
  unpaidRegularDays: z.number().default(0),
  unusedLeaveDays: z.number().default(0),
  pendingAllowances: z.record(z.number()).default({}),
  unpaidOvertimeAmount: z.number().default(0),
  allowanceAlreadyPaidYtd: z.number().default(0),
  pendingTips: z.number().default(0)
});

export function registerSeveranceRoutes(app: Express) {
  
  // Get recent severance calculations
  app.get('/api/severance/recent', isAuthenticated, async (req: any, res) => {
    try {
      // Mock data for now - in production this would come from database
      const recentCalculations = [
        {
          id: '1',
          employeeName: 'Maria Papadopoulos',
          netTotal: 3250.50,
          status: 'approved',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          employeeName: 'Dimitris Kostas',
          netTotal: 2890.75,
          status: 'completed',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      res.json(recentCalculations);
    } catch (error) {
      console.error('Error fetching recent calculations:', error);
      res.status(500).json({ 
        error: 'Failed to fetch calculations', 
        message: error.message 
      });
    }
  });

  // Get pending approvals
  app.get('/api/severance/pending-approvals', isAuthenticated, async (req: any, res) => {
    try {
      // Mock data for now - in production this would come from database
      const pendingApprovals = [
        {
          id: '1',
          employeeName: 'Anna Nikolaidou',
          netTotal: 4120.30,
          terminationType: 'dismissal_without_notice',
          status: 'pending_approval'
        }
      ];
      res.json(pendingApprovals);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({ 
        error: 'Failed to fetch approvals', 
        message: error.message 
      });
    }
  });

  // Get active employees for severance calculation
  app.get('/api/employees/active', isAuthenticated, async (req: any, res) => {
    try {
      // Mock data for demonstration purposes - in production this would come from employee database
      // Temporarily using mock data to avoid database schema issues
      const activeEmployees = [
        {
          id: 'emp-001',
          employeeId: 'EMP001',
          name: 'Maria Papadopoulos',
          email: 'maria@example.com',
          position: 'Front Desk Manager',
          hireDate: '2022-03-15',
          salary: 1200,
          currentSalary: 1200,
          baseSalary: 1100,
          contractType: 'indefinite'
        },
        {
          id: 'emp-002',
          employeeId: 'EMP002',
          name: 'Dimitris Kostas',
          email: 'dimitris@example.com',
          position: 'Chef',
          hireDate: '2021-06-20',
          salary: 1400,
          currentSalary: 1400,
          baseSalary: 1300,
          contractType: 'indefinite'
        },
        {
          id: 'emp-003',
          employeeId: 'EMP003',
          name: 'Anna Nikolaidou',
          email: 'anna@example.com',
          position: 'Housekeeping Supervisor',
          hireDate: '2020-01-10',
          salary: 1100,
          currentSalary: 1100,
          baseSalary: 1000,
          contractType: 'indefinite'
        },
        {
          id: 'emp-004',
          employeeId: 'EMP004',
          name: 'Kostas Vasilakis',
          email: 'kostas@example.com',
          position: 'Waiter',
          hireDate: '2023-05-01',
          salary: 900,
          currentSalary: 900,
          baseSalary: 850,
          contractType: 'indefinite'
        },
        {
          id: 'emp-005',
          employeeId: 'EMP005',
          name: 'Eleni Christou',
          email: 'eleni@example.com',
          position: 'Bartender',
          hireDate: '2022-08-15',
          salary: 950,
          currentSalary: 950,
          baseSalary: 900,
          contractType: 'fixed'
        }
      ];
      
      res.json(activeEmployees);
    } catch (error) {
      console.error('Error fetching active employees:', error);
      res.status(500).json({ 
        error: 'Failed to fetch employees', 
        message: error.message 
      });
    }
  });

  // Calculate severance endpoint
  app.post('/api/severance/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = severanceCalculationInputsSchema.parse(req.body);
      
      // Calculate severance and final pay
      const calculationResult = await SeveranceFinalPayService.calculateSeveranceFinalPay(validatedData);
      
      res.json(calculationResult);
    } catch (error) {
      console.error('Severance calculation error:', error);
      res.status(500).json({ 
        error: 'Calculation failed', 
        message: error.message 
      });
    }
  });

  // Finalize severance calculation endpoint
  app.post('/api/severance/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = severanceCalculationInputsSchema.parse(req.body);
      
      // This would finalize the severance calculation and trigger all downstream processes
      const result = {
        id: 'sev-' + Date.now(),
        status: 'finalized',
        message: 'Severance calculation finalized successfully'
      };
      
      res.json(result);
    } catch (error) {
      console.error('Severance finalization error:', error);
      res.status(500).json({ 
        error: 'Finalization failed', 
        message: error.message 
      });
    }
  });

// =============================================================================
// SEVERANCE CALCULATION ENDPOINTS
// =============================================================================

  // Legacy calculate-severance endpoint (for backwards compatibility)
  app.post('/api/severance/calculate-severance', isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({
        employeeId: z.string(),
        contractId: z.string(),
        terminationType: z.enum(['dismissal', 'resignation', 'expiry', 'mutual_agreement']),
        terminationCause: z.string().optional(),
        effectiveDate: z.string().transform(str => new Date(str)),
        noticeDate: z.string().transform(str => new Date(str)).optional(),
        yearsOfService: z.number().min(0),
        lastMonthlyWage: z.number().min(0),
        unusedLeaveDays: z.number().min(0),
        pendingAllowances: z.record(z.number()).default({}),
        pendingTips: z.number().default(0)
      });

      const inputs = schema.parse(req.body);

      // Calculate severance and final pay
      const calculationOutputs = await SeveranceFinalPayService.calculateSeveranceFinalPay(inputs);

      res.json({
        success: true,
        calculation: calculationOutputs,
        preview: true
      });

    } catch (error) {
      console.error('Error calculating severance:', error);
      res.status(400).json({
        success: false,
        error: error instanceof z.ZodError ? 
          'Invalid input data' : 
          'Failed to calculate severance'
      });
    }
  });

  // Legacy process-termination endpoint (for backwards compatibility)
  app.post('/api/severance/process-termination', isAuthenticated, async (req: any, res) => {
  try {
    const schema = z.object({
      employeeId: z.string(),
      contractId: z.string(),
      terminationType: z.enum(['dismissal', 'resignation', 'expiry', 'mutual_agreement']),
      terminationCause: z.string().optional(),
      effectiveDate: z.string().transform(str => new Date(str)),
      noticeDate: z.string().transform(str => new Date(str)).optional(),
      yearsOfService: z.number().min(0),
      lastMonthlyWage: z.number().min(0),
      unusedLeaveDays: z.number().min(0),
      pendingAllowances: z.record(z.number()).default({}),
      pendingTips: z.number().default(0),
      requireApproval: z.boolean().default(true)
    });

    const inputs = schema.parse(req.body);
    const user = req.user as any;

    // For high-value severance, require maker-checker approval
    const previewCalculation = await SeveranceFinalPayService.calculateSeveranceFinalPay(inputs);
    
    if (inputs.requireApproval && previewCalculation.grossTotal > 10000) { // €10k threshold
      // Create approval request for high-value severance
      const approvalId = await MakerCheckerService.createApprovalRequest({
        requestType: 'severance_execute',
        requestId: `severance-${inputs.employeeId}-${Date.now()}`,
        requestData: {
          ...inputs,
          previewCalculation
        },
        makerUserId: user.id || 'unknown-user',
        makerRole: 'hr_manager',
        requiredApprovers: ['legal', 'payroll_admin']
      });

      res.json({
        success: true,
        status: 'pending_approval',
        approvalId,
        message: 'High-value severance requires legal and payroll admin approval',
        previewCalculation
      });

    } else {
      // Process termination directly
      const result = await SeveranceFinalPayService.processTermination(inputs);

      res.json({
        success: true,
        status: 'completed',
        terminationRecord: result.terminationRecord,
        severanceCalculation: result.severanceCalculation,
        calculationOutputs: result.calculationOutputs
      });
    }

  } catch (error) {
    console.error('Error processing termination:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? 
        'Invalid input data' : 
        'Failed to process termination'
    });
  }
});

  // Get termination history for an employee
  app.get('/api/severance/terminations/:employeeId', isAuthenticated, async (req: any, res) => {
  try {
    const employeeId = req.params.employeeId;
    
    const terminations = await SeveranceFinalPayService.getEmployeeTerminations(employeeId);

    res.json({
      success: true,
      terminations
    });

  } catch (error) {
    console.error('Error fetching terminations:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch termination history'
    });
  }
});

  // Get severance calculation details
  app.get('/api/severance/calculation/:calculationId', isAuthenticated, async (req: any, res) => {
  try {
    const calculationId = req.params.calculationId;
    
    const [calculation, finalPayLines] = await Promise.all([
      SeveranceFinalPayService.getSeveranceCalculation(calculationId),
      SeveranceFinalPayService.getFinalPayLines(calculationId)
    ]);

    if (!calculation) {
      return res.status(404).json({
        success: false,
        error: 'Severance calculation not found'
      });
    }

    res.json({
      success: true,
      calculation,
      finalPayLines
    });

  } catch (error) {
    console.error('Error fetching calculation:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch severance calculation'
    });
  }
});

// =============================================================================
// ERGANI II & DOCUMENT GENERATION ENDPOINTS
// =============================================================================

  // Generate ERGANI II termination XML payload
  app.post('/api/severance/generate-ergani-payload/:terminationId', isAuthenticated, async (req: any, res) => {
  try {
    const terminationId = req.params.terminationId;
    
    const schema = z.object({
      employeeData: z.object({
        companyVat: z.string(),
        amka: z.string(),
        afm: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        fullName: z.string()
      })
    });

    const { employeeData } = schema.parse(req.body);

    // Get termination record
    const terminations = await SeveranceFinalPayService.getEmployeeTerminations(employeeData.amka);
    const terminationRecord = terminations.find(t => t.id === terminationId);

    if (!terminationRecord) {
      return res.status(404).json({
        success: false,
        error: 'Termination record not found'
      });
    }

    // Generate ERGANI payload
    const erganiPayload = await ErganiTerminationService.generateErganiTerminationPayload(
      terminationRecord,
      employeeData
    );

    res.json({
      success: true,
      erganiPayload
    });

  } catch (error) {
    console.error('Error generating ERGANI payload:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to generate ERGANI II payload'
    });
  }
});

  // Generate termination letter (dismissal/resignation/expiry)
  app.post('/api/severance/generate-termination-letter/:terminationId', isAuthenticated, async (req: any, res) => {
  try {
    const terminationId = req.params.terminationId;
    
    const schema = z.object({
      employeeData: z.object({
        amka: z.string(),
        fullName: z.string()
      }),
      includeSeveranceDetails: z.boolean().default(true)
    });

    const { employeeData, includeSeveranceDetails } = schema.parse(req.body);

    // Get termination record
    const terminations = await SeveranceFinalPayService.getEmployeeTerminations(employeeData.amka);
    const terminationRecord = terminations.find(t => t.id === terminationId);

    if (!terminationRecord) {
      return res.status(404).json({
        success: false,
        error: 'Termination record not found'
      });
    }

    // Get severance calculation if needed
    let severanceCalculation = null;
    if (includeSeveranceDetails && terminationRecord.severanceEligible) {
      severanceCalculation = await SeveranceFinalPayService.getSeveranceCalculation(
        terminationRecord.id
      );
    }

    // Generate appropriate letter based on termination type
    let letter;
    switch (terminationRecord.terminationType) {
      case 'dismissal':
        letter = ErganiTerminationService.generateDismissalLetter(
          terminationRecord,
          employeeData,
          severanceCalculation || undefined
        );
        break;
      case 'resignation':
        letter = ErganiTerminationService.generateResignationLetter(
          terminationRecord,
          employeeData
        );
        break;
      case 'expiry':
        letter = ErganiTerminationService.generateExpiryLetter(
          terminationRecord,
          employeeData
        );
        break;
      default:
        throw new Error(`Unsupported termination type: ${terminationRecord.terminationType}`);
    }

    res.json({
      success: true,
      letter,
      terminationType: terminationRecord.terminationType
    });

  } catch (error) {
    console.error('Error generating termination letter:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to generate termination letter'
    });
  }
});

  // Get termination validation rules and legal requirements
  app.get('/api/severance/validation/termination-rules', isAuthenticated, async (req: any, res) => {
  try {
    const rules = {
      noticePeriods: {
        dismissal: {
          under1Year: 0,
          oneToFiveYears: 30, // days
          fiveToTenYears: 60,
          overTenYears: 90
        },
        resignation: {
          employees: 30,
          executives: 90
        }
      },
      severanceRules: {
        minimumService: 2, // years
        tiers: [
          { minYears: 2, maxYears: 5, monthsPerYear: 2 },
          { minYears: 5, maxYears: 10, monthsPerYear: 3 },
          { minYears: 10, maxYears: 999, monthsPerYear: 4 }
        ],
        exemptCauses: [
          'SERIOUS_MISCONDUCT',
          'CRIMINAL_ACTIVITY',
          'BREACH_OF_TRUST',
          'ABANDONMENT'
        ]
      },
      legalBases: {
        dismissal: 'Ν. 4093/2012 άρθρο 1',
        resignation: 'Ν. 4093/2012 άρθρο 2',
        expiry: 'Ν. 4093/2012 άρθρο 5',
        mutual_agreement: 'Ν. 4093/2012 άρθρο 6'
      },
      erganiEventCodes: {
        dismissal: 'TERM_DISMISSAL',
        resignation: 'TERM_RESIGNATION',
        expiry: 'TERM_CONTRACT_EXPIRY',
        mutual_agreement: 'TERM_MUTUAL_AGREEMENT'
      }
    };

    res.json({
      success: true,
      rules
    });

  } catch (error) {
    console.error('Error fetching validation rules:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to fetch termination rules'
    });
  }
});

  // =============================================================================
  // NEW ERGANI & DOCUMENT ENDPOINTS (v1 API)
  // =============================================================================

  // Build ERGANI termination payload (v1 endpoint)
  app.post('/api/v1/ergani/term:build', isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({
        employeeId: z.string(),
        terminationType: z.enum(['dismissal', 'resignation', 'expiry', 'mutual_agreement']),
        terminationCause: z.string(),
        effectiveDate: z.string(),
        noticeDate: z.string().optional(),
        companyVat: z.string(),
        amka: z.string(),
        afm: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        format: z.enum(['json', 'xml']).default('json')
      });

      const data = schema.parse(req.body);
      const { getErganiEventCode } = await import('../services/SeveranceHelpers');

      // Build ERGANI payload using Greek labels
      const erganiPayload = {
        "Α/Α": "1",
        "Ε.Π.": "1",
        "ΣΤΟΙΧΕΙΑ_ΕΡΓΟΔΟΤΗ": {
          "ΑΦΜ_ΕΡΓΟΔΟΤΗ": data.companyVat,
          "ΟΝΟΜΑ_ΕΡΓΟΔΟΤΗ": "PayrollSync Demo Hotel"
        },
        "ΣΤΟΙΧΕΙΑ_ΕΡΓΑΖΟΜΕΝΟΥ": {
          "ΑΜΚΑ": data.amka,
          "ΑΦΜ": data.afm,
          "ΟΝΟΜΑ": data.firstName,
          "ΕΠΩΝΥΜΟ": data.lastName
        },
        "ΣΤΟΙΧΕΙΑ_ΚΑΤΑΓΓΕΛΙΑΣ": {
          "ΤΥΠΟΣ_ΚΑΤΑΓΓΕΛΙΑΣ": getErganiEventCode(data.terminationType),
          "ΑΙΤΙΑ_ΚΑΤΑΓΓΕΛΙΑΣ": data.terminationCause,
          "ΗΜΕΡΟΜΗΝΙΑ_ΛΗΞΗΣ": data.effectiveDate,
          "ΗΜΕΡΟΜΗΝΙΑ_ΠΡΟΕΙΔΟΠΟΙΗΣΗΣ": data.noticeDate || null
        },
        "ΧΡΟΝΟΣΗΜΑ": new Date().toISOString(),
        "ΥΠΟΓΡΑΦΗ_ΕΡΓΟΔΟΤΗ": "DEMO_SIGNATURE"
      };

      if (data.format === 'xml') {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERGANI_TERMINATION>
  <AA>${erganiPayload["Α/Α"]}</AA>
  <EP>${erganiPayload["Ε.Π."]}</EP>
  <EMPLOYER>
    <VAT>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΕΡΓΟΔΟΤΗ.ΑΦΜ_ΕΡΓΟΔΟΤΗ}</VAT>
    <NAME>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΕΡΓΟΔΟΤΗ.ΟΝΟΜΑ_ΕΡΓΟΔΟΤΗ}</NAME>
  </EMPLOYER>
  <EMPLOYEE>
    <AMKA>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΕΡΓΑΖΟΜΕΝΟΥ.ΑΜΚΑ}</AMKA>
    <AFM>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΕΡΓΑΖΟΜΕΝΟΥ.ΑΦΜ}</AFM>
    <FIRSTNAME>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΕΡΓΑΖΟΜΕΝΟΥ.ΟΝΟΜΑ}</FIRSTNAME>
    <LASTNAME>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΕΡΓΑΖΟΜΕΝΟΥ.ΕΠΩΝΥΜΟ}</LASTNAME>
  </EMPLOYEE>
  <TERMINATION>
    <TYPE>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΚΑΤΑΓΓΕΛΙΑΣ.ΤΥΠΟΣ_ΚΑΤΑΓΓΕΛΙΑΣ}</TYPE>
    <CAUSE>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΚΑΤΑΓΓΕΛΙΑΣ.ΑΙΤΙΑ_ΚΑΤΑΓΓΕΛΙΑΣ}</CAUSE>
    <EFFECTIVE_DATE>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΚΑΤΑΓΓΕΛΙΑΣ.ΗΜΕΡΟΜΗΝΙΑ_ΛΗΞΗΣ}</EFFECTIVE_DATE>
    <NOTICE_DATE>${erganiPayload.ΣΤΟΙΧΕΙΑ_ΚΑΤΑΓΓΕΛΙΑΣ.ΗΜΕΡΟΜΗΝΙΑ_ΠΡΟΕΙΔΟΠΟΙΗΣΗΣ || ''}</NOTICE_DATE>
  </TERMINATION>
  <TIMESTAMP>${erganiPayload.ΧΡΟΝΟΣΗΜΑ}</TIMESTAMP>
  <SIGNATURE>${erganiPayload.ΥΠΟΓΡΑΦΗ_ΕΡΓΟΔΟΤΗ}</SIGNATURE>
</ERGANI_TERMINATION>`;
        
        res.set('Content-Type', 'application/xml');
        res.send(xml);
      } else {
        res.json(erganiPayload);
      }

    } catch (error) {
      console.error('ERGANI payload generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate ERGANI payload', 
        message: error.message 
      });
    }
  });

  // Generate termination letter PDF (v1 endpoint)
  app.post('/api/v1/docs/termination-letter', isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({
        employeeId: z.string(),
        employeeName: z.string(),
        terminationType: z.enum(['dismissal', 'resignation', 'expiry', 'mutual_agreement']),
        terminationCause: z.string(),
        effectiveDate: z.string(),
        noticeDate: z.string().optional(),
        severanceAmount: z.number().optional(),
        netTotal: z.number(),
        language: z.enum(['en', 'el']).default('el')
      });

      const data = schema.parse(req.body);
      const { generateTerminationLetter } = await import('../services/SeveranceHelpers');

      // Generate letter content based on termination type and language
      const letterContent = generateTerminationLetter(data);

      // Return HTML that could be converted to PDF
      const html = `<!DOCTYPE html>
<html lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <title>Termination Letter</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 40px; }
    .content { margin-bottom: 30px; }
    .footer { margin-top: 40px; }
    .amount { font-weight: bold; color: #2563eb; }
  </style>
</head>
<body>
  ${letterContent}
</body>
</html>`;

      res.set('Content-Type', 'text/html');
      res.send(html);

    } catch (error) {
      console.error('Letter generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate termination letter', 
        message: error.message 
      });
    }
  });

  // =============================================================================
  // GOLDEN TEST SUITE
  // =============================================================================

  // Run golden test cases
  app.post('/api/severance/test-golden', isAuthenticated, async (req: any, res) => {
    try {
      const { runGoldenTestSuite } = await import('../services/SeveranceHelpers');
      const testResults = await runGoldenTestSuite();
      
      res.json({
        success: true,
        testResults,
        summary: {
          total: testResults.length,
          passed: testResults.filter(t => t.passed).length,
          failed: testResults.filter(t => !t.passed).length
        }
      });
    } catch (error) {
      console.error('Golden test suite error:', error);
      res.status(500).json({ 
        error: 'Failed to run golden tests', 
        message: error.message 
      });
    }
  });

}