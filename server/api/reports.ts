import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { apdGenerator } from "../reports/apdGenerator";
import { fmyGenerator } from "../reports/fmyGenerator";
import { erganiReports } from "../reports/erganiReports";
import { payslipGenerator } from "../reports/payslipGenerator";
import { glExportService } from "../reports/glExport";
import { digitalCardPackGenerator } from "../reports/digitalCardPack";
import { annualCertificateGenerator } from "../reports/annualCertificate";

const router = Router();

// APD (Social Security) Reports
router.post('/api/reports/apd/generate', isAuthenticated, async (req, res) => {
  try {
    const { period, includeEmployees } = req.body;
    
    if (!period) {
      return res.status(400).json({ error: "Period is required (format: YYYY-MM)" });
    }

    // Mock payroll data - in production, fetch from database
    const payrollData = [
      {
        employeeId: 'EMP001',
        afm: '123456789',
        amka: '12345678901',
        firstName: 'Γιάννης',
        lastName: 'Παπαδόπουλος',
        employmentType: 'FULL_TIME',
        jobRole: 'HOTEL_MANAGER',
        grossEarnings: 2500,
        timesheets: []
      }
    ];

    const apdFile = await apdGenerator.generateMonthlyAPD(period, payrollData);
    
    res.json({
      fileId: apdFile.fileId,
      period: apdFile.period,
      totalRecords: apdFile.totalRecords,
      totalGrossEarnings: apdFile.totalGrossEarnings,
      totalContributions: apdFile.totalEmployeeContributions + apdFile.totalEmployerContributions,
      xmlContent: apdFile.xmlContent,
      checksum: apdFile.checksum
    });
  } catch (error) {
    console.error("Error generating APD file:", error);
    res.status(500).json({ error: "Failed to generate APD file" });
  }
});

router.post('/api/reports/apd/submit', isAuthenticated, async (req, res) => {
  try {
    const { fileId } = req.body;
    
    // Mock APD file retrieval and submission
    const mockAPDFile = {
      fileId,
      period: '2025-01',
      companyAFM: '123456789',
      companyName: 'Demo Company',
      totalRecords: 1,
      totalGrossEarnings: 2500,
      totalEmployeeContributions: 342.03,
      totalEmployerContributions: 657.75,
      records: [],
      generatedAt: new Date(),
      xmlContent: '<APD_File>...</APD_File>',
      checksum: 'abc123'
    };

    const receipt = await apdGenerator.submitToEFKA(mockAPDFile);
    
    res.json(receipt);
  } catch (error) {
    console.error("Error submitting APD file:", error);
    res.status(500).json({ error: "Failed to submit APD file" });
  }
});

// FMY (Tax Withholding) Reports
router.post('/api/reports/fmy/generate', isAuthenticated, async (req, res) => {
  try {
    const { period } = req.body;
    
    if (!period) {
      return res.status(400).json({ error: "Period is required (format: YYYY-MM)" });
    }

    const payrollData = [
      {
        employeeId: 'EMP001',
        afm: '123456789',
        amka: '12345678901',
        firstName: 'Μαρία',
        lastName: 'Γεωργίου',
        grossEarnings: 2000
      }
    ];

    const fmyFile = await fmyGenerator.generateMonthlyFMY(period, payrollData);
    
    res.json({
      fileId: fmyFile.fileId,
      period: fmyFile.period,
      totalRecords: fmyFile.totalRecords,
      totalGrossIncome: fmyFile.totalGrossIncome,
      totalTaxWithheld: fmyFile.totalTaxWithheld,
      xmlContent: fmyFile.xmlContent,
      checksum: fmyFile.checksum
    });
  } catch (error) {
    console.error("Error generating FMY file:", error);
    res.status(500).json({ error: "Failed to generate FMY file" });
  }
});

router.post('/api/reports/fmy/merge', isAuthenticated, async (req, res) => {
  try {
    const { fileIds } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds)) {
      return res.status(400).json({ error: "File IDs array is required" });
    }

    // Mock file retrieval for merge
    const mockFiles = fileIds.map(id => ({
      fileId: id,
      period: '2025-01',
      companyAFM: '123456789',
      companyName: 'Demo Company',
      totalRecords: 1,
      totalGrossIncome: 2000,
      totalTaxWithheld: 300,
      totalSocialSecurityContributions: 200,
      records: [],
      generatedAt: new Date(),
      xmlContent: '<FMY_File>...</FMY_File>',
      checksum: 'def456'
    }));

    const { mergedFile, utility } = await fmyGenerator.mergeFMYFiles(mockFiles);
    
    res.json({
      mergedFile: {
        fileId: mergedFile.fileId,
        totalRecords: mergedFile.totalRecords,
        totalGrossIncome: mergedFile.totalGrossIncome,
        totalTaxWithheld: mergedFile.totalTaxWithheld
      },
      utility: {
        originalFiles: utility.originalFiles,
        mergedAt: utility.mergedAt,
        duplicatesRemoved: utility.duplicatesRemoved
      }
    });
  } catch (error) {
    console.error("Error merging FMY files:", error);
    res.status(500).json({ error: "Failed to merge FMY files" });
  }
});

// ERGANI II Event Reports
router.post('/api/reports/ergani/hire', isAuthenticated, async (req, res) => {
  try {
    const hireData = req.body;
    
    const event = await erganiReports.createHireEvent(hireData);
    
    res.json(event);
  } catch (error) {
    console.error("Error creating ERGANI hire event:", error);
    res.status(500).json({ error: "Failed to create hire event" });
  }
});

router.post('/api/reports/ergani/schedule', isAuthenticated, async (req, res) => {
  try {
    const scheduleData = req.body;
    
    const event = await erganiReports.createScheduleEvent(scheduleData);
    
    res.json(event);
  } catch (error) {
    console.error("Error creating ERGANI schedule event:", error);
    res.status(500).json({ error: "Failed to create schedule event" });
  }
});

router.post('/api/reports/ergani/overtime', isAuthenticated, async (req, res) => {
  try {
    const overtimeData = req.body;
    
    const event = await erganiReports.createOvertimeEvent(overtimeData);
    
    res.json(event);
  } catch (error) {
    console.error("Error creating ERGANI overtime event:", error);
    res.status(500).json({ error: "Failed to create overtime event" });
  }
});

router.post('/api/reports/ergani/termination', isAuthenticated, async (req, res) => {
  try {
    const terminationData = req.body;
    
    const event = await erganiReports.createTerminationEvent(terminationData);
    
    res.json(event);
  } catch (error) {
    console.error("Error creating ERGANI termination event:", error);
    res.status(500).json({ error: "Failed to create termination event" });
  }
});

router.get('/api/reports/ergani/pending', isAuthenticated, async (req, res) => {
  try {
    const pendingEvents = erganiReports.getPendingEvents();
    
    res.json({
      totalPending: pendingEvents.length,
      events: pendingEvents
    });
  } catch (error) {
    console.error("Error fetching pending ERGANI events:", error);
    res.status(500).json({ error: "Failed to fetch pending events" });
  }
});

router.post('/api/reports/ergani/submit-batch', isAuthenticated, async (req, res) => {
  try {
    const batchSubmission = await erganiReports.processPendingEvents();
    
    res.json(batchSubmission);
  } catch (error) {
    console.error("Error submitting ERGANI batch:", error);
    res.status(500).json({ error: "Failed to submit batch events" });
  }
});

// Employee Payslip Generation
router.post('/api/reports/payslip/generate', isAuthenticated, async (req, res) => {
  try {
    const { employeeId, period } = req.body;
    
    if (!employeeId || !period) {
      return res.status(400).json({ error: "Employee ID and period are required" });
    }

    // Mock employee and payroll data
    const employeeData = {
      employeeId,
      firstName: 'Κώστας',
      lastName: 'Μιχαήλ',
      afm: '987654321',
      amka: '98765432109',
      bankIban: 'GR1601101250000000012300695'
    };

    const payrollData = {
      basicSalary: 1500,
      overtime25: 200,
      overtime25Hours: 10,
      overtime25Rate: 20,
      nightAllowance: 100,
      mealAllowance: 242,
      incomeTax: 250,
      solidarityTax: 50,
      socialSecurityMain: 100,
      socialSecurityAux: 45
    };

    const payslip = await payslipGenerator.generatePayslip(employeeData, payrollData, period);
    
    res.json({
      payslipId: payslip.payslipId,
      employeeName: payslip.employeeName,
      period: payslip.payPeriod,
      totals: payslip.totals,
      digitalSignature: payslip.digitalSignature
    });
  } catch (error) {
    console.error("Error generating payslip:", error);
    res.status(500).json({ error: "Failed to generate payslip" });
  }
});

router.get('/api/reports/payslip/:payslipId/html', isAuthenticated, async (req, res) => {
  try {
    const { payslipId } = req.params;
    
    // Mock payslip data retrieval
    const mockPayslip = {
      payslipId,
      employeeId: 'EMP001',
      employeeName: 'Κώστας Μιχαήλ',
      afm: '987654321',
      amka: '98765432109',
      payPeriod: '2025-01',
      payDate: new Date(),
      companyInfo: {
        name: 'Demo Company',
        afm: '123456789',
        address: 'Demo Address',
        city: 'Athens',
        postalCode: '12345',
        phone: '+30 210 1234567',
        email: 'info@company.gr'
      },
      earnings: [],
      deductions: [],
      benefits: [],
      totals: {
        grossPay: 2000,
        totalDeductions: 500,
        netPay: 1500,
        taxableEarnings: 1800,
        socialSecurityEarnings: 2000,
        incomeTax: 250,
        solidarityTax: 50,
        socialSecurityEmployee: 200,
        socialSecurityEmployer: 400
      },
      yearToDate: {
        grossPay: 12000,
        netPay: 9000,
        incomeTax: 1500,
        socialSecurity: 1200
      },
      bankDetails: {
        bankName: 'Εθνική Τράπεζα',
        iban: 'GR1601101250000000012300695',
        transferDate: new Date(),
        transferAmount: 1500
      },
      digitalSignature: 'ABC123DEF456'
    };
    
    const htmlContent = payslipGenerator.generateHTMLPayslip(mockPayslip);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  } catch (error) {
    console.error("Error generating payslip HTML:", error);
    res.status(500).json({ error: "Failed to generate payslip HTML" });
  }
});

// GL Journal Export
router.post('/api/reports/gl/export', isAuthenticated, async (req, res) => {
  try {
    const { period, properties = [] } = req.body;
    
    if (!period) {
      return res.status(400).json({ error: "Period is required (format: YYYY-MM)" });
    }

    // Mock payroll data for GL export
    const payrollData = [
      {
        employeeId: 'EMP001',
        employeeName: 'Δημήτρης Σαββίδης',
        department: 'Front Office',
        propertyCode: 'ATH001',
        basicSalary: 1800,
        overtimePay: 200,
        bonusPay: 500,
        netPay: 1900,
        incomeTax: 300,
        employeeSocialSecurity: 180,
        employerSocialSecurity: 470
      }
    ];

    const journalExport = await glExportService.generateJournalExport(payrollData, period, properties);
    
    const validation = glExportService.validateExport(journalExport);
    
    res.json({
      exportId: journalExport.exportId,
      period: journalExport.period,
      totalEntries: journalExport.totalEntries,
      totalDebits: journalExport.totalDebits,
      totalCredits: journalExport.totalCredits,
      balanceCheck: journalExport.balanceCheck,
      validation,
      csvContent: journalExport.csvContent,
      xmlContent: journalExport.xmlContent,
      checksum: journalExport.checksum
    });
  } catch (error) {
    console.error("Error generating GL export:", error);
    res.status(500).json({ error: "Failed to generate GL export" });
  }
});

// Digital Work Card Audit Pack
router.post('/api/reports/audit-pack/generate', isAuthenticated, async (req, res) => {
  try {
    const { employeeIds, startDate, endDate, purpose = 'LABOR_INSPECTION' } = req.body;
    const userId = (req.user as any)?.claims?.sub;
    
    if (!employeeIds || !startDate || !endDate) {
      return res.status(400).json({ error: "Employee IDs, start date, and end date are required" });
    }

    const auditPack = await digitalCardPackGenerator.generateAuditPack(
      employeeIds,
      new Date(startDate),
      new Date(endDate),
      userId,
      purpose
    );
    
    res.json({
      packId: auditPack.packId,
      generatedFor: auditPack.generatedFor,
      periodStart: auditPack.periodStart,
      periodEnd: auditPack.periodEnd,
      totalEmployees: auditPack.totalEmployees,
      totalWorkDays: auditPack.totalWorkDays,
      totalPunches: auditPack.totalPunches,
      summaryStatistics: auditPack.summaryStatistics,
      complianceAnalysis: auditPack.complianceAnalysis,
      digitalSignature: auditPack.digitalSignature
    });
  } catch (error) {
    console.error("Error generating audit pack:", error);
    res.status(500).json({ error: "Failed to generate audit pack" });
  }
});

// Annual Income Certificate (Βεβαίωση Αποδοχών)
router.post('/api/reports/annual-certificate/generate', isAuthenticated, async (req, res) => {
  try {
    const { employeeId, year, certificationType = 'EMPLOYEE_COPY' } = req.body;
    
    if (!employeeId || !year) {
      return res.status(400).json({ error: "Employee ID and year are required" });
    }

    const certificate = await annualCertificateGenerator.generateAnnualCertificate(
      employeeId,
      year,
      certificationType
    );
    
    res.json({
      certificateId: certificate.certificateId,
      employeeName: certificate.employeeName,
      year: certificate.year,
      totalEarnings: certificate.totalEarnings,
      taxWithholdings: certificate.taxWithholdings,
      socialSecurityContributions: certificate.socialSecurityContributions,
      digitalSignature: certificate.digitalSignature,
      qrCode: certificate.qrCode
    });
  } catch (error) {
    console.error("Error generating annual certificate:", error);
    res.status(500).json({ error: "Failed to generate annual certificate" });
  }
});

router.post('/api/reports/annual-certificate/aade-batch', isAuthenticated, async (req, res) => {
  try {
    const { employeeIds, year } = req.body;
    
    if (!employeeIds || !year) {
      return res.status(400).json({ error: "Employee IDs and year are required" });
    }

    const submissionPackage = await annualCertificateGenerator.generateAADESubmissionPackage(
      employeeIds,
      year
    );
    
    res.json({
      submissionId: submissionPackage.submissionId,
      year: submissionPackage.year,
      totalCertificates: submissionPackage.totalCertificates,
      totalEmployees: submissionPackage.totalEmployees,
      xmlContent: submissionPackage.xmlContent,
      checksum: submissionPackage.checksum
    });
  } catch (error) {
    console.error("Error generating AADE batch:", error);
    res.status(500).json({ error: "Failed to generate AADE batch" });
  }
});

// Reports Status and Monitoring
router.get('/api/reports/status', isAuthenticated, async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      systems: {
        apdGeneration: { status: 'operational', lastGenerated: '2025-01-19T12:00:00Z' },
        fmyGeneration: { status: 'operational', lastGenerated: '2025-01-19T12:00:00Z' },
        erganiSubmission: { status: 'operational', pendingEvents: 0 },
        payslipGeneration: { status: 'operational', lastGenerated: '2025-01-19T10:30:00Z' },
        glExport: { status: 'operational', lastExported: '2025-01-19T11:00:00Z' },
        auditPacks: { status: 'operational', lastGenerated: '2025-01-18T16:00:00Z' }
      },
      monthlyStatistics: {
        apdFilesGenerated: 12,
        fmyFilesGenerated: 12,
        erganiEventsSubmitted: 156,
        payslipsGenerated: 847,
        glExportsCreated: 12,
        auditPacksGenerated: 3
      }
    };
    
    res.json(status);
  } catch (error) {
    console.error("Error fetching reports status:", error);
    res.status(500).json({ error: "Failed to fetch reports status" });
  }
});

export default router;