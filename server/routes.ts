import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "node:path";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { mfaEnforcement, MfaEnforcementMiddleware } from "./middleware/mfaEnforcementMiddleware";
import { SecurityEnforcementInitializer } from "./services/SecurityEnforcementInitializer";
import { oboMiddleware } from "./middleware/oboMiddleware";
import { registerIbanValidationRoutes } from "./api/ibanValidation";
import authRoutes from "./routes/auth";
import authAPIRoutes from "./routes/auth";
import { rulesAPIRouter } from "./rulesAPI";
import { initializeRulesEngine } from "./rulesEngine";
import authAPI from "./api/auth";
import employeesAPI from "./api/employees";
import timeAPI from "./api/time";
import payrollAPI from "./api/payroll";
import filingsAPI from "./api/filings";
import { paymentsRoutes } from "./api/payments";
import webhooksAPI from "./api/webhooks";
import healthAPI from "./api/health";
import securityAPI from "./api/security";
import reportsAPI from "./api/reports";
import { registerForecastingRoutes } from "./api/forecasting";
import { 
  requestLoggingMiddleware, 
  errorLoggingMiddleware, 
  performanceLoggingMiddleware, 
  securityLoggingMiddleware 
} from "./middleware/loggingMiddleware";
import { registerDocumentAIRoutes } from "./api/documentAI";
import { registerChangeLogLegalWatchRoutes } from "./api/changeLogLegalWatch";
import { 
  insertEmployeeSchema, 
  insertPropertySchema, 
  insertShiftSchema, 
  insertPunchEventSchema, 
  insertExceptionSchema, 
  insertTimesheetSchema,
  insertWageComponentSchema,
  insertDepartmentSchema,
  insertShiftTemplateSchema,
  insertDeviceRegistrySchema,
  insertOvertimeRequestSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { erganiConnector } from "./erganiConnector";
import { payrollConnector } from "./payrollConnector";
import { workflowManager } from "./workflowManager";
import { hotelOperationsManager } from "./hotelOperations";
import { SepaPaymentService } from "./sepaPaymentService";
import { GLExportService } from "./glExportService";
import { GLExportCanonical } from "./services/glExportCanonical";
import { FilingComplianceService } from "./filingComplianceService";
import { SelfServiceManager } from "./selfServiceManager";
import { registerSelfServiceRoutes } from "./api/selfService";
import { registerPropertiesRoutes } from "./api/properties";
import { registerUserProfileRoutes } from "./api/userProfile";
import { registerAICopilotRoutes } from "./api/aiCopilot";
import { registerLaborNewsfeedRoutes } from "./api/laborNewsfeed";
import { registerInstantPaymentRoutes } from "./api/instantPayments";
import { registerPayEquityRoutes } from "./api/payEquity";
import { registerCsrdRoutes } from "./api/csrd";
import { registerExplanationRoutes } from "./api/explanations";
import { instantReissueRoutes } from "./api/instantReissue";
import securityRoutes from "./routes/securityRoutes";
import cbaPackRoutes from "./routes/cbaPackRoutes";
import { embeddedPayrollRoutes } from "./api/embedded";
import { glGenericRoutes } from "./api/glGeneric";
import { nativeConnectorRoutes } from "./api/nativeConnectors";
import { guidedSetupRoutes } from "./api/guidedSetup";
import { reconciliationRoutes } from "./api/reconciliation";
import { edgeCaseRoutes } from "./api/edgeCases";
import { acceptanceCriteriaRoutes } from "./api/acceptanceCriteria";
import { paymentsOpsRoutes } from "./api/paymentsOps";
import { registerClientApprovalRoutes } from "./api/clientApproval";
import { registerFilingWorkflowRoutes } from "./api/filingWorkflow";
import { registerTestingRoutes } from "./api/testing";
import { paymentBatchRoutes } from "./api/paymentBatch";
import { canonicalPaymentsRoutes } from "./api/canonicalPayments";
import { paymentStateMachineRoutes } from "./api/paymentStateMachine";
import { reconciliationEngineRoutes } from "./api/reconciliationEngine";
import { cutOffLogicRoutes } from "./api/cutOffLogic";
import * as dstTestingApi from "./api/dstTestingApi";
import { registerBillingRoutes } from "./routes/billing";
import { reissueAlgorithmRoutes } from "./api/reissueAlgorithm";
import { oneClickFlowRoutes } from "./api/oneClickFlow";
import eventQueueAPI from "./api/eventQueue";
// ibanValidationRoutes already imported on line 5
import { AdvancedAnalyticsService } from "./advancedAnalyticsService";
import { HotelEnhancementsService } from "./hotelEnhancementsService";
import { PayExplanationService } from "./payExplanationService";
import { 
  insertPaymentInstructionsSchema, 
  insertGlExportsSchema 
} from "@shared/schema";
import { 
  uploadDataFile, 
  uploadMiddleware,
  setColumnMapping, 
  validateData, 
  dryRunImport, 
  executeImport, 
  getImportSession 
} from "./api/dataImport";
import { db } from "./db";

// Track core services state  
export let coreServices = {
  auth: false,
  database: false,
  rules: false
};

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[ROUTES] 🚀 registerRoutes function started!');
  // Health endpoints (add early before auth middleware)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });
  
  app.get('/ready', (req, res) => {
    const allCoreReady = Object.values(coreServices).every(Boolean);
    if (allCoreReady) {
      res.status(200).json({
        status: 'ready',
        services: coreServices,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        services: coreServices,
        timestamp: new Date().toISOString(),
        message: 'Some core services are not ready'
      });
    }
  });

  console.log('[ROUTES] Reached auth middleware section!');

  // Auth middleware
  try {
    console.log('[ROUTES] About to call setupAuth...');
    await setupAuth(app);
    coreServices.auth = true;
    console.log('[Core] ✅ Auth service ready');
  } catch (error) {
    console.error('[Core] ❌ Auth service failed:', error.message);
    console.error('[Core] ❌ Full error stack:', error);
    throw error; // Auth is core - fail startup
  }

  // Initialize security enforcement components
  try {
    await SecurityEnforcementInitializer.initialize();
    console.log('✅ Security enforcement components initialized');
  } catch (error) {
    console.error('❌ Security enforcement initialization failed:', error);
    // Continue with reduced security in development
    if (process.env.NODE_ENV === 'production') {
      throw error; // Fail hard in production
    }
  }

  // Initialize GDPR compliance framework
  try {
    const { GDPRComplianceInitializer } = await import('./services/GDPRComplianceInitializer');
    await GDPRComplianceInitializer.initialize();
    console.log('🛡️  GDPR compliance framework initialized');
  } catch (error) {
    console.error('❌ GDPR compliance initialization failed:', error);
    // Continue with reduced compliance in development
    if (process.env.NODE_ENV === 'production') {
      throw error; // Fail hard in production
    }
  }

  // Initialize Disaster Recovery systems
  try {
    const { DisasterRecoveryInitializer } = await import('./services/DisasterRecoveryInitializer');
    await DisasterRecoveryInitializer.initializeDRSystem();
    console.log('🆘 Disaster Recovery systems initialized');
  } catch (error) {
    console.error('❌ Disaster Recovery initialization failed:', error);
    // Continue with reduced DR capabilities in development
    if (process.env.NODE_ENV === 'production') {
      throw error; // Fail hard in production
    }
  }

  // Initialize Government System Monitoring
  try {
    const { GovernmentSystemMonitoringService } = await import('./services/GovernmentSystemMonitoringService');
    const monitoringService = GovernmentSystemMonitoringService.getInstance();
    await monitoringService.initializeMonitoring();
    console.log('🏛️  Government system monitoring initialized');
  } catch (error) {
    console.error('❌ Government system monitoring initialization failed:', error);
    // Continue with reduced monitoring in development
    if (process.env.NODE_ENV === 'production') {
      throw error; // Fail hard in production
    }
  }

  // Initialize On-Call Rota System
  if (process.env.ENABLE_ONCALL === 'true') {
    try {
      const { OnCallRotaService } = await import('./services/OnCallRotaService');
      const onCallService = OnCallRotaService.getInstance();
      await onCallService.initializeOnCallSystem();
      console.log('🚨 On-call rota system initialized');
    } catch (error) {
      console.error('[OnCall] ❌ Initialization failed:', error.message);
      console.warn('[OnCall] ⚠️  Continuing without on-call rota capabilities');
      // Continue with reduced on-call capabilities
    }
  } else {
    console.log('⏸️  On-call rota system disabled (ENABLE_ONCALL=false)');
  }

  // Whitelist auth paths from MFA enforcement
  const AUTH_OPEN_PATHS = new Set([
    '/api/login',
    '/oauth2callback', 
    '/api/auth/user',
    '/api/whoami'
  ]);
  
  function allowlist(paths: Set<string>) {
    return (req: any, res: any, next: any) => {
      if (paths.has(req.path)) return next();
      return next('route');
    };
  }

  // Apply global MFA enforcement middleware (after auth but before other routes)
  app.use(allowlist(AUTH_OPEN_PATHS), mfaEnforcement.enforce());

  // Initialize rules engine
  try {
    await initializeRulesEngine();
    coreServices.rules = true;
    console.log('[Core] ✅ Rules engine ready');
  } catch (error) {
    console.error('[Core] ❌ Rules engine failed:', error.message);
    throw error; // Rules engine is core - fail startup
  }

  // Database connectivity check
  try {
    const result = await db.execute("SELECT 1 as health_check");
    if (result.rows?.[0]?.health_check === 1) {
      coreServices.database = true;
      console.log('[Core] ✅ Database connection ready');
    } else {
      throw new Error('Database health check failed');
    }
  } catch (error) {
    console.error('[Core] ❌ Database connectivity failed:', error.message);
    throw error; // Database is core - fail startup
  }

  // Add OBO middleware for tenant context injection
  app.use(oboMiddleware);

  // Apply central logging middleware to all routes
  app.use(requestLoggingMiddleware('payroll-sync'));
  app.use(performanceLoggingMiddleware('payroll-sync'));
  app.use(securityLoggingMiddleware('payroll-sync-security'));

  // Debug route for feature flags verification
  app.get('/debug/flags', (req, res) => {
    res.json({
      flags: {
        ENABLE_ONCALL: process.env.ENABLE_ONCALL === 'true',
        ENABLE_RUNBOOKS: process.env.ENABLE_RUNBOOKS === 'true',
        ENABLE_LOGGING: process.env.ENABLE_LOGGING !== 'false'
      },
      coreServices,
      optionalServices: {
        oncall: process.env.ENABLE_ONCALL === 'true' ? 'enabled' : 'disabled',
        runbooks: process.env.ENABLE_RUNBOOKS === 'true' ? 'enabled' : 'disabled',
        logging: process.env.ENABLE_LOGGING !== 'false' ? 'enabled' : 'disabled'
      }
    });
  });

  // Comprehensive Authentication Routes
  app.use('/api/auth/v2', authRoutes);
  
  // Authentication routes with API contract compliance
  app.use('/auth', authAPIRoutes);
  
  // Security compliance and audit routes
  app.use('/api/security', securityRoutes);
  
  // CBA & Sector Packs routes
  app.use('/api/cba-packs', cbaPackRoutes);
  
  // CBA Packs API (helper endpoints)
  const cbaPacksApi = (await import("./api/cbaPacksApi")).default;
  app.use('/api/cba-packs-api', cbaPacksApi);
  
  // Payroll Calculation Engine API
  const payrollCalculationApi = (await import("./api/payrollCalculationApi")).default;
  app.use('/api/payroll-engine', payrollCalculationApi);
  
  // CBA Governance API
  const cbaGovernanceApi = (await import("./api/cbaGovernanceApi")).default;
  app.use('/api/cba-governance', cbaGovernanceApi);
  
  // Acceptance Tests API
  const acceptanceTestApi = (await import("./api/acceptanceTestApi")).default;
  app.use('/api/acceptance-tests', acceptanceTestApi);
  
  // Data Import API - CSV/Excel file upload, mapping, validation, and import
  app.post('/api/data-import/upload', isAuthenticated, uploadMiddleware, uploadDataFile);
  app.put('/api/data-import/:sessionId/mapping', isAuthenticated, setColumnMapping);
  app.post('/api/data-import/:sessionId/validate', isAuthenticated, validateData);
  app.post('/api/data-import/:sessionId/dry-run', isAuthenticated, dryRunImport);
  app.post('/api/data-import/:sessionId/execute', isAuthenticated, executeImport);
  app.get('/api/data-import/:sessionId', isAuthenticated, getImportSession);
  
  // Security & Audit API
  const securityAuditApi = (await import("./api/securityAuditApi")).default;
  app.use('/api/security-audit', securityAuditApi);

  // Severance & Final Pay API
  const { registerSeveranceRoutes } = await import("./api/severanceApi");
  registerSeveranceRoutes(app);

  // Garnishments & Court Orders API
  const { registerGarnishmentRoutes } = await import("./api/garnishmentApi");
  registerGarnishmentRoutes(app);

  // Enhanced IBAN Validation API
  registerIbanValidationRoutes(app);

  // Event Queue API - Evented Platform
  app.use('/', eventQueueAPI);

  // Initialize services
  const sepaPaymentService = new SepaPaymentService();
  const glExportService = new GLExportService();
  const filingComplianceService = new FilingComplianceService();
  const selfServiceManager = new SelfServiceManager();
  const advancedAnalyticsService = new AdvancedAnalyticsService();
  const hotelEnhancementsService = new HotelEnhancementsService();
  const payExplanationService = new PayExplanationService(storage);
  
  // Import AI engines
  const { overtimePreventionEngine } = await import("./overtimePreventionEngineSimple");
  const { exceptionAutoResolutionEngine } = await import("./exceptionAutoResolutionEngineSimple");

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Employee routes
  app.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const { search, propertyId } = req.query;
      const employees = await storage.getEmployees(
        search as string,
        propertyId as string
      );
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      
      // Check for duplicate AFM if provided
      if (validatedData.afm) {
        const existingByAfm = await storage.getEmployeeByAfm(validatedData.afm);
        if (existingByAfm) {
          return res.status(400).json({ message: "Υπάρχει ήδη εργαζόμενος με αυτό το ΑΦΜ" });
        }
      }

      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, validatedData);
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEmployee(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Wage Components routes
  app.get("/api/wage-components/:employeeId", isAuthenticated, async (req, res) => {
    try {
      const wageComponents = await storage.getWageComponents(req.params.employeeId);
      res.json(wageComponents);
    } catch (error) {
      console.error("Error fetching wage components:", error);
      res.status(500).json({ message: "Failed to fetch wage components" });
    }
  });

  app.post("/api/wage-components", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertWageComponentSchema.parse(req.body);
      const wageComponent = await storage.createWageComponent(validatedData);
      res.status(201).json(wageComponent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating wage component:", error);
      res.status(500).json({ message: "Failed to create wage component" });
    }
  });

  // Departments routes
  app.get("/api/departments", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.query;
      const departments = await storage.getDepartments(propertyId as string);
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Failed to create department" });
    }
  });

  // Property routes
  app.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Shift routes
  app.get("/api/shifts", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, propertyId, startDate, endDate } = req.query;
      const shifts = await storage.getShifts(
        employeeId as string,
        propertyId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.post("/api/shifts", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertShiftSchema.parse(req.body);
      const shift = await storage.createShift(validatedData);
      res.status(201).json(shift);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating shift:", error);
      res.status(500).json({ message: "Failed to create shift" });
    }
  });

  // Punch Event routes
  app.get("/api/punch-events", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, propertyId, startDate, endDate } = req.query;
      const events = await storage.getPunchEvents(
        employeeId as string,
        propertyId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(events);
    } catch (error) {
      console.error("Error fetching punch events:", error);
      res.status(500).json({ message: "Failed to fetch punch events" });
    }
  });

  app.post("/api/punch-events", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPunchEventSchema.parse(req.body);
      const event = await storage.createPunchEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating punch event:", error);
      res.status(500).json({ message: "Failed to create punch event" });
    }
  });

  // Exception routes
  app.get("/api/exceptions", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, propertyId, status } = req.query;
      const exceptions = await storage.getExceptions(
        employeeId as string,
        propertyId as string,
        status as string
      );
      res.json(exceptions);
    } catch (error) {
      console.error("Error fetching exceptions:", error);
      res.status(500).json({ message: "Failed to fetch exceptions" });
    }
  });

  app.post("/api/exceptions", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExceptionSchema.parse(req.body);
      const exception = await storage.createException(validatedData);
      res.status(201).json(exception);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating exception:", error);
      res.status(500).json({ message: "Failed to create exception" });
    }
  });

  // Timesheet routes
  app.get("/api/timesheets", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, periodStart, periodEnd, payrollStatus } = req.query;
      const timesheets = await storage.getTimesheets(
        employeeId as string,
        periodStart ? new Date(periodStart as string) : undefined,
        periodEnd ? new Date(periodEnd as string) : undefined,
        payrollStatus as string
      );
      res.json(timesheets);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ message: "Failed to fetch timesheets" });
    }
  });

  app.post("/api/timesheets", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTimesheetSchema.parse(req.body);
      const timesheet = await storage.createTimesheet(validatedData);
      res.status(201).json(timesheet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.toString() });
      }
      console.error("Error creating timesheet:", error);
      res.status(500).json({ message: "Failed to create timesheet" });
    }
  });

  // ERGANI II Connector API
  app.post("/api/ergani/events", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const eventData = req.body;
      
      const result = await erganiConnector.submitEvent(eventData);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error submitting ERGANI event:", error);
      res.status(500).json({ error: "Failed to submit event to ERGANI" });
    }
  });

  app.post("/api/ergani/bulk", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const eventsData = req.body.events;
      
      if (!Array.isArray(eventsData)) {
        return res.status(400).json({ error: "Events must be an array" });
      }
      
      const results = await erganiConnector.submitBulk(eventsData);
      res.status(201).json({ results });
    } catch (error) {
      console.error("Error submitting ERGANI bulk events:", error);
      res.status(500).json({ error: "Failed to submit bulk events to ERGANI" });
    }
  });

  app.get("/api/ergani/status/:eventId", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const eventId = req.params.eventId;
      
      const status = erganiConnector.getEventStatus(eventId);
      if (!status) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      res.json(status);
    } catch (error) {
      console.error("Error getting ERGANI event status:", error);
      res.status(500).json({ error: "Failed to get event status" });
    }
  });

  app.get("/api/ergani/health", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const metrics = erganiConnector.getHealthMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error getting ERGANI health metrics:", error);
      res.status(500).json({ error: "Failed to get health metrics" });
    }
  });

  app.get("/api/ergani/logs", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const { eventId, format } = req.query;
      
      if (format === 'export') {
        const exportFormat = req.query.exportFormat as 'json' | 'csv' || 'json';
        const exportData = erganiConnector.exportMirrorLogs(exportFormat);
        
        const contentType = exportFormat === 'csv' ? 'text/csv' : 'application/json';
        const filename = `ergani_logs_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportData);
      } else {
        const logs = erganiConnector.getMirrorLogs(eventId as string);
        res.json(logs);
      }
    } catch (error) {
      console.error("Error getting ERGANI logs:", error);
      res.status(500).json({ error: "Failed to get logs" });
    }
  });

  app.get("/api/ergani/quarantine", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const quarantinedEvents = erganiConnector.getQuarantinedEvents();
      res.json(quarantinedEvents);
    } catch (error) {
      console.error("Error getting quarantined events:", error);
      res.status(500).json({ error: "Failed to get quarantined events" });
    }
  });

  app.post("/api/ergani/quarantine/:eventId/retry", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const eventId = req.params.eventId;
      
      const result = await erganiConnector.retryQuarantinedEvent(eventId);
      if (!result) {
        return res.status(404).json({ error: "Quarantined event not found" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error retrying quarantined event:", error);
      res.status(500).json({ error: "Failed to retry quarantined event" });
    }
  });

  app.post("/api/compliance/auto-fix/:recommendationId", async (req, res) => {
    try {
      const { recommendationId } = req.params;
      
      // This would implement auto-fix logic based on recommendation type
      // For now, return success to indicate the feature is available
      res.json({ 
        success: true, 
        message: "Auto-fix request processed",
        recommendationId 
      });
    } catch (error) {
      console.error("Error applying auto-fix:", error);
      res.status(500).json({ error: "Failed to apply auto-fix" });
    }
  });

  // Payroll Integration routes
  app.post("/api/payroll/sync-employees", isAuthenticated, async (req, res) => {
    try {
      const { payrollEmployees } = req.body;
      await payrollConnector.syncEmployeeMasterData(payrollEmployees);
      res.json({ success: true, message: `Synced ${payrollEmployees.length} employees` });
    } catch (error) {
      console.error("Error syncing payroll employees:", error);
      res.status(500).json({ error: "Failed to sync employees" });
    }
  });

  app.post("/api/payroll/process-timesheets", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, startDate, endDate } = req.body;
      const entries = await payrollConnector.processPunchEvents(
        employeeId,
        new Date(startDate),
        new Date(endDate)
      );
      res.json({ entries, total: entries.length });
    } catch (error) {
      console.error("Error processing timesheets:", error);
      res.status(500).json({ error: "Failed to process timesheets" });
    }
  });

  app.post("/api/payroll/lock-timesheet", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, payPeriodStart, payPeriodEnd, approvedBy } = req.body;
      await payrollConnector.lockTimesheet(employeeId, payPeriodStart, payPeriodEnd, approvedBy);
      res.json({ success: true, message: "Timesheet locked successfully" });
    } catch (error) {
      console.error("Error locking timesheet:", error);
      res.status(500).json({ error: "Failed to lock timesheet" });
    }
  });

  app.post("/api/payroll/export-batch", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, format } = req.body;
      const batch = await payrollConnector.createExportBatch(payPeriodStart, payPeriodEnd, format);
      res.json(batch);
    } catch (error) {
      console.error("Error creating export batch:", error);
      res.status(500).json({ error: "Failed to create export batch" });
    }
  });

  app.post("/api/payroll/submit-batch/:batchId", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.params;
      await payrollConnector.submitBatchAPI(batchId);
      res.json({ success: true, message: "Batch submitted successfully" });
    } catch (error) {
      console.error("Error submitting batch:", error);
      res.status(500).json({ error: "Failed to submit batch" });
    }
  });

  app.get("/api/payroll/batches", isAuthenticated, async (req, res) => {
    try {
      const batches = payrollConnector.getAllExportBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching export batches:", error);
      res.status(500).json({ error: "Failed to fetch export batches" });
    }
  });

  app.get("/api/payroll/batch/:batchId", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.params;
      const batch = payrollConnector.getExportBatch(batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      res.json(batch);
    } catch (error) {
      console.error("Error fetching export batch:", error);
      res.status(500).json({ error: "Failed to fetch export batch" });
    }
  });

  app.get("/api/payroll/batch/:batchId/csv", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.params;
      const batch = payrollConnector.getExportBatch(batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      const csv = payrollConnector.exportToCSV(batch);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payroll_${batchId}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting batch to CSV:", error);
      res.status(500).json({ error: "Failed to export batch to CSV" });
    }
  });

  app.get("/api/payroll/batch/:batchId/xml", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.params;
      const batch = payrollConnector.getExportBatch(batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      const xml = payrollConnector.exportToXML(batch);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="payroll_${batchId}.xml"`);
      res.send(xml);
    } catch (error) {
      console.error("Error exporting batch to XML:", error);
      res.status(500).json({ error: "Failed to export batch to XML" });
    }
  });

  app.get("/api/payroll/timesheets", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd } = req.query;
      const entries = payrollConnector.getTimesheetEntries(
        payPeriodStart as string,
        payPeriodEnd as string
      );
      res.json(entries);
    } catch (error) {
      console.error("Error fetching timesheet entries:", error);
      res.status(500).json({ error: "Failed to fetch timesheet entries" });
    }
  });

  app.get("/api/payroll/health", isAuthenticated, async (req, res) => {
    try {
      const metrics = payrollConnector.getHealthMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching payroll health metrics:", error);
      res.status(500).json({ error: "Failed to fetch health metrics" });
    }
  });

  app.post("/api/payroll/demo-batch", isAuthenticated, async (req, res) => {
    try {
      const payrollData = req.body;
      console.log(`[PAYROLL DEMO] Processing batch for period ${payrollData.pay_period}, property ${payrollData.property_id}`);
      
      // Create demo timesheet entries from the payroll data
      const demoEntries = [];
      for (const record of payrollData.records) {
        for (const line of record.lines) {
          const entry = {
            entryId: `demo_${record.employee_number}_${line.code}_${Date.now()}`,
            employeeNumber: record.employee_number,
            employeeGuid: `guid_${record.employee_number}`,
            payPeriodStart: `${payrollData.pay_period}-01`,
            payPeriodEnd: `${payrollData.pay_period}-31`,
            earningsCode: line.code,
            hours: line.hours,
            units: line.hours,
            rateBasis: 'HOURLY',
            costCenterAllocations: [{
              costCenterId: line.cost_center,
              propertyId: payrollData.property_id,
              hours: line.hours,
              percentage: 100
            }],
            propertyId: payrollData.property_id,
            calculatedAt: new Date(),
            lockedAt: new Date(),
            approvedBy: record.notes?.includes('MGR_') ? record.notes.split(' ')[2] : 'system',
            notes: record.notes
          };
          demoEntries.push(entry);
          
          // Add to payroll connector storage
          payrollConnector['timesheetEntries'] = payrollConnector['timesheetEntries'] || new Map();
          payrollConnector['timesheetEntries'].set(entry.entryId, entry);
        }
      }

      // Create an export batch automatically
      const batch = await payrollConnector.createExportBatch(
        `${payrollData.pay_period}-01`,
        `${payrollData.pay_period}-31`,
        'API'
      );

      res.json({
        success: true,
        message: `Processed ${demoEntries.length} timesheet entries for ${payrollData.records.length} employees`,
        entriesCreated: demoEntries.length,
        batchId: batch.batchId,
        totalHours: demoEntries.reduce((sum, entry) => sum + entry.hours, 0),
        breakdownByCode: demoEntries.reduce((acc, entry) => {
          acc[entry.earningsCode] = (acc[entry.earningsCode] || 0) + entry.hours;
          return acc;
        }, {} as Record<string, number>)
      });
      
    } catch (error) {
      console.error("Error processing demo payroll batch:", error);
      res.status(500).json({ error: "Failed to process demo batch" });
    }
  });

  // Manager & Payroll Workflow routes
  app.get("/api/workflow/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = workflowManager.getWorkflowMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching workflow metrics:", error);
      res.status(500).json({ error: "Failed to fetch workflow metrics" });
    }
  });

  app.post("/api/workflow/validate-exceptions", isAuthenticated, async (req, res) => {
    try {
      const { date, managerId } = req.body;
      const validations = await workflowManager.validateExceptions(date, managerId);
      res.json(validations);
    } catch (error) {
      console.error("Error validating exceptions:", error);
      res.status(500).json({ error: "Failed to validate exceptions" });
    }
  });

  app.post("/api/workflow/approve-exception", isAuthenticated, async (req, res) => {
    try {
      const { exceptionId, status, managerId, reason, correctedValue } = req.body;
      await workflowManager.approveRejectException(exceptionId, status, managerId, reason, correctedValue);
      res.json({ success: true, message: `Exception ${status.toLowerCase()}` });
    } catch (error) {
      console.error("Error approving/rejecting exception:", error);
      res.status(500).json({ error: "Failed to process exception approval" });
    }
  });

  app.post("/api/workflow/overtime-approval", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, date, requestedHours, earningsCode, reason, requestedBy } = req.body;
      const approval = await workflowManager.createOvertimeApproval(
        employeeId, date, requestedHours, earningsCode, reason, requestedBy
      );
      res.json(approval);
    } catch (error) {
      console.error("Error creating overtime approval:", error);
      res.status(500).json({ error: "Failed to create overtime approval" });
    }
  });

  app.post("/api/workflow/approve-overtime", isAuthenticated, async (req, res) => {
    try {
      const { approvalId, status, managerId, approvedHours, justification } = req.body;
      await workflowManager.approveRejectOvertime(approvalId, status, managerId, approvedHours, justification);
      res.json({ success: true, message: `Overtime ${status.toLowerCase()}` });
    } catch (error) {
      console.error("Error approving/rejecting overtime:", error);
      res.status(500).json({ error: "Failed to process overtime approval" });
    }
  });

  app.get("/api/workflow/ergani-status", isAuthenticated, async (req, res) => {
    try {
      const { date } = req.query;
      const status = await workflowManager.checkErganiStatus(date as string);
      res.json(status);
    } catch (error) {
      console.error("Error checking ERGANI status:", error);
      res.status(500).json({ error: "Failed to check ERGANI status" });
    }
  });

  app.post("/api/workflow/lock-timesheets", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, managerId, employeeIds } = req.body;
      const locks = await workflowManager.lockTimesheets(payPeriodStart, payPeriodEnd, managerId, employeeIds);
      res.json({ locks, totalLocked: locks.length });
    } catch (error) {
      console.error("Error locking timesheets:", error);
      res.status(500).json({ error: "Failed to lock timesheets" });
    }
  });

  app.post("/api/workflow/export-payroll", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, format } = req.body;
      const batchId = await workflowManager.exportToPayroll(payPeriodStart, payPeriodEnd, format);
      res.json({ success: true, batchId, message: "Payroll exported successfully" });
    } catch (error) {
      console.error("Error exporting payroll:", error);
      res.status(500).json({ error: "Failed to export payroll" });
    }
  });

  app.post("/api/workflow/reconciliation-report", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, managerId } = req.body;
      const report = await workflowManager.generateReconciliationReport(payPeriodStart, payPeriodEnd, managerId);
      res.json(report);
    } catch (error) {
      console.error("Error generating reconciliation report:", error);
      res.status(500).json({ error: "Failed to generate reconciliation report" });
    }
  });

  app.post("/api/workflow/audit-pack", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd, requestedBy } = req.body;
      const auditPack = await workflowManager.generateAuditPack(payPeriodStart, payPeriodEnd, requestedBy);
      res.json(auditPack);
    } catch (error) {
      console.error("Error generating audit pack:", error);
      res.status(500).json({ error: "Failed to generate audit pack" });
    }
  });

  app.get("/api/workflow/exception-validations", isAuthenticated, async (req, res) => {
    try {
      const { date } = req.query;
      const validations = workflowManager.getExceptionValidations(date as string);
      res.json(validations);
    } catch (error) {
      console.error("Error fetching exception validations:", error);
      res.status(500).json({ error: "Failed to fetch exception validations" });
    }
  });

  // Pay Explanation API endpoint
  app.get("/api/paycheck/:paycheckId/explanation", isAuthenticated, async (req, res) => {
    try {
      const { paycheckId } = req.params;
      const { language = 'el', includePolicy = 'true' } = req.query;
      
      // Configure explanation service
      const explanationConfig = {
        language: language as 'el' | 'en',
        threshold: 10.0,
        includePolicy: includePolicy === 'true',
        verbosity: 'detailed' as const
      };
      
      // Generate explanation using the service
      const explanation = await payExplanationService.generateExplanation(
        paycheckId,
        explanationConfig
      );
      
      res.json({
        paycheckId,
        explanation,
        metadata: {
          hasComparison: false, // Will be determined by the service
          hasDetailedBreakdown: true,
          language: explanationConfig.language,
          generatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error("Error generating pay explanation:", error);
      res.status(500).json({ error: "Failed to generate pay explanation" });
    }
  });

  app.get("/api/workflow/overtime-approvals", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const approvals = workflowManager.getOvertimeApprovals(status as any);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching overtime approvals:", error);
      res.status(500).json({ error: "Failed to fetch overtime approvals" });
    }
  });

  app.get("/api/workflow/timesheet-locks", isAuthenticated, async (req, res) => {
    try {
      const { payPeriodStart, payPeriodEnd } = req.query;
      const locks = workflowManager.getTimesheetLocks(payPeriodStart as string, payPeriodEnd as string);
      res.json(locks);
    } catch (error) {
      console.error("Error fetching timesheet locks:", error);
      res.status(500).json({ error: "Failed to fetch timesheet locks" });
    }
  });

  app.get("/api/workflow/reconciliation-reports", isAuthenticated, async (req, res) => {
    try {
      const reports = workflowManager.getReconciliationReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reconciliation reports:", error);
      res.status(500).json({ error: "Failed to fetch reconciliation reports" });
    }
  });

  app.get("/api/workflow/audit-packs", isAuthenticated, async (req, res) => {
    try {
      const auditPacks = workflowManager.getAuditPacks();
      res.json(auditPacks);
    } catch (error) {
      console.error("Error fetching audit packs:", error);
      res.status(500).json({ error: "Failed to fetch audit packs" });
    }
  });

  // Hotel Operations routes
  app.get("/api/hotel/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = hotelOperationsManager.getProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/hotel/properties/:propertyId/departments", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const departments = hotelOperationsManager.getDepartments(propertyId);
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.get("/api/hotel/kiosk/:departmentId/config", isAuthenticated, async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { language = 'EN' } = req.query;
      const config = hotelOperationsManager.getKioskConfig(departmentId, language as any);
      
      if (!config) {
        return res.status(404).json({ error: "Kiosk configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching kiosk config:", error);
      res.status(500).json({ error: "Failed to fetch kiosk configuration" });
    }
  });

  app.post("/api/hotel/kiosk/:departmentId/action", isAuthenticated, async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { actionId, employeeId, metadata } = req.body;
      
      const result = await hotelOperationsManager.executeKioskAction(
        departmentId, actionId, employeeId, metadata
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error executing kiosk action:", error);
      res.status(500).json({ error: "Failed to execute kiosk action" });
    }
  });

  app.post("/api/hotel/multi-property-assignment", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, primaryPropertyId, secondaryAssignments } = req.body;
      
      const assignment = await hotelOperationsManager.assignEmployeeToMultipleProperties(
        employeeId, primaryPropertyId, secondaryAssignments
      );
      
      res.json(assignment);
    } catch (error) {
      console.error("Error creating multi-property assignment:", error);
      res.status(500).json({ error: "Failed to create multi-property assignment" });
    }
  });

  app.post("/api/hotel/rotation-schedule", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, propertySequence, pattern } = req.body;
      
      await hotelOperationsManager.createRotationSchedule(employeeId, propertySequence, pattern);
      res.json({ success: true, message: "Rotation schedule created" });
    } catch (error) {
      console.error("Error creating rotation schedule:", error);
      res.status(500).json({ error: "Failed to create rotation schedule" });
    }
  });

  app.post("/api/hotel/seasonal-onboarding", isAuthenticated, async (req, res) => {
    try {
      const { seasonalPeriodId, batchEmployees } = req.body;
      
      const session = await hotelOperationsManager.startSeasonalOnboarding(
        seasonalPeriodId, batchEmployees
      );
      
      res.json(session);
    } catch (error) {
      console.error("Error starting seasonal onboarding:", error);
      res.status(500).json({ error: "Failed to start seasonal onboarding" });
    }
  });

  app.post("/api/hotel/split-shift", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, date, segments } = req.body;
      
      const splitShift = await hotelOperationsManager.createSplitShift(
        employeeId, date, segments
      );
      
      res.json(splitShift);
    } catch (error) {
      console.error("Error creating split shift:", error);
      res.status(500).json({ error: "Failed to create split shift" });
    }
  });

  app.post("/api/hotel/validate-cross-department", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, fromDepartment, toDepartment, date } = req.body;
      
      const validation = await hotelOperationsManager.validateCrossDepartmentCoverage(
        employeeId, fromDepartment, toDepartment, date
      );
      
      res.json(validation);
    } catch (error) {
      console.error("Error validating cross-department coverage:", error);
      res.status(500).json({ error: "Failed to validate cross-department coverage" });
    }
  });

  app.get("/api/hotel/multi-property-assignments", isAuthenticated, async (req, res) => {
    try {
      const assignments = hotelOperationsManager.getMultiPropertyAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching multi-property assignments:", error);
      res.status(500).json({ error: "Failed to fetch multi-property assignments" });
    }
  });

  app.get("/api/hotel/split-shifts", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, date } = req.query;
      const shifts = hotelOperationsManager.getSplitShifts(employeeId as string, date as string);
      res.json(shifts);
    } catch (error) {
      console.error("Error fetching split shifts:", error);
      res.status(500).json({ error: "Failed to fetch split shifts" });
    }
  });

  app.get("/api/hotel/geofence-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = hotelOperationsManager.getGeofenceTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching geofence templates:", error);
      res.status(500).json({ error: "Failed to fetch geofence templates" });
    }
  });

  app.get("/api/hotel/onboarding-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = hotelOperationsManager.getOnboardingTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching onboarding templates:", error);
      res.status(500).json({ error: "Failed to fetch onboarding templates" });
    }
  });

  // Export routes
  app.get("/api/employees/export/excel", isAuthenticated, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      // TODO: Implement Excel export using xlsx library
      res.json({ message: "Excel export functionality to be implemented", employees });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Failed to export to Excel" });
    }
  });

  // Compliance Guardrails API Routes
  
  // Get compliance dashboard
  app.get("/api/compliance/dashboard", isAuthenticated, async (req, res) => {
    try {
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const dashboard = await complianceGuardrails.getComplianceDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching compliance dashboard:", error);
      res.status(500).json({ error: "Failed to fetch compliance dashboard" });
    }
  });

  // Process punch event with compliance checking
  app.post("/api/compliance/punch-event", isAuthenticated, async (req, res) => {
    try {
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const result = await complianceGuardrails.processPunchEvent(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error processing punch event:", error);
      res.status(500).json({ error: "Failed to process punch event" });
    }
  });

  // Get compliance alerts
  app.get("/api/compliance/alerts", isAuthenticated, async (req, res) => {
    try {
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const dashboard = await complianceGuardrails.getComplianceDashboard();
      res.json(dashboard.alerts);
    } catch (error) {
      console.error("Error fetching compliance alerts:", error);
      res.status(500).json({ error: "Failed to fetch compliance alerts" });
    }
  });

  // Resolve compliance alert
  app.put("/api/compliance/alerts/:alertId/resolve", isAuthenticated, async (req, res) => {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body;
      const userId = req.user?.claims?.sub;
      
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const resolved = complianceGuardrails.resolveAlert(alertId, userId, resolution);
      
      if (resolved) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Alert not found or already resolved" });
      }
    } catch (error) {
      console.error("Error resolving compliance alert:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // Check digital card policy
  app.post("/api/compliance/digital-card-policy", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, issueType } = req.body;
      
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const policyResult = complianceGuardrails.enforceDigitalCardPolicy(employeeId, issueType);
      
      res.json(policyResult);
    } catch (error) {
      console.error("Error checking digital card policy:", error);
      res.status(500).json({ error: "Failed to check digital card policy" });
    }
  });

  // Get ERGANI submission status
  app.get("/api/compliance/ergani/status", isAuthenticated, async (req, res) => {
    try {
      const { erganiConnector } = await import("./erganiConnector");
      const health = erganiConnector.getHealthMetrics();
      res.json(health);
    } catch (error) {
      console.error("Error fetching ERGANI status:", error);
      res.status(500).json({ error: "Failed to fetch ERGANI status" });
    }
  });

  // Get ERGANI mirror logs
  app.get("/api/compliance/ergani/logs", isAuthenticated, async (req, res) => {
    try {
      const { eventId, format } = req.query;
      const { erganiConnector } = await import("./erganiConnector");
      
      if (format === 'csv') {
        const csvData = erganiConnector.exportMirrorLogs('csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=ergani-logs.csv');
        res.send(csvData);
      } else {
        const logs = erganiConnector.getMirrorLogs(eventId as string);
        res.json(logs);
      }
    } catch (error) {
      console.error("Error fetching ERGANI logs:", error);
      res.status(500).json({ error: "Failed to fetch ERGANI logs" });
    }
  });

  // Retry quarantined ERGANI event
  app.post("/api/compliance/ergani/retry/:eventId", isAuthenticated, async (req, res) => {
    try {
      const { eventId } = req.params;
      const { erganiConnector } = await import("./erganiConnector");
      
      const result = await erganiConnector.retryQuarantinedEvent(eventId);
      
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "Event not found in quarantine" });
      }
    } catch (error) {
      console.error("Error retrying ERGANI event:", error);
      res.status(500).json({ error: "Failed to retry ERGANI event" });
    }
  });

  // Check data retention compliance
  app.get("/api/compliance/data-retention", isAuthenticated, async (req, res) => {
    try {
      const { complianceGuardrails } = await import("./complianceGuardrails");
      const compliance = complianceGuardrails.checkDataRetentionCompliance();
      res.json(compliance);
    } catch (error) {
      console.error("Error checking data retention compliance:", error);
      res.status(500).json({ error: "Failed to check data retention compliance" });
    }
  });

  // Analytics & Reporting API Routes

  // Live Occupancy
  app.get("/api/analytics/live-occupancy", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.query;
      const { analyticsService } = await import("./analyticsService");
      const occupancy = await analyticsService.getLiveOccupancy(propertyId as string);
      res.json(occupancy);
    } catch (error) {
      console.error("Error fetching live occupancy:", error);
      res.status(500).json({ error: "Failed to fetch live occupancy data" });
    }
  });

  // Labor Cost Forecast
  app.get("/api/analytics/labor-cost-forecast", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, date } = req.query;
      if (!propertyId || !date) {
        return res.status(400).json({ error: "Property ID and date are required" });
      }
      
      const { analyticsService } = await import("./analyticsService");
      const forecast = await analyticsService.generateLaborCostForecast(
        propertyId as string, 
        new Date(date as string)
      );
      res.json(forecast);
    } catch (error) {
      console.error("Error generating labor cost forecast:", error);
      res.status(500).json({ error: "Failed to generate labor cost forecast" });
    }
  });

  // Overtime Heatmap
  app.get("/api/analytics/overtime-heatmap", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId || !startDate || !endDate) {
        return res.status(400).json({ error: "Property ID, start date, and end date are required" });
      }
      
      const { analyticsService } = await import("./analyticsService");
      const heatmap = await analyticsService.generateOvertimeHeatmap(
        propertyId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(heatmap);
    } catch (error) {
      console.error("Error generating overtime heatmap:", error);
      res.status(500).json({ error: "Failed to generate overtime heatmap" });
    }
  });

  // Compliance KPIs
  app.get("/api/analytics/compliance-kpis", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId || !startDate || !endDate) {
        return res.status(400).json({ error: "Property ID, start date, and end date are required" });
      }
      
      const { analyticsService } = await import("./analyticsService");
      const kpis = await analyticsService.getComplianceKpis(
        propertyId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching compliance KPIs:", error);
      res.status(500).json({ error: "Failed to fetch compliance KPIs" });
    }
  });

  // Variance Analysis
  app.get("/api/analytics/variance-analysis", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      if (!propertyId || !startDate || !endDate) {
        return res.status(400).json({ error: "Property ID, start date, and end date are required" });
      }
      
      const { analyticsService } = await import("./analyticsService");
      const analysis = await analyticsService.getVarianceAnalysis(
        propertyId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(analysis);
    } catch (error) {
      console.error("Error performing variance analysis:", error);
      res.status(500).json({ error: "Failed to perform variance analysis" });
    }
  });

  // Generate demo analytics data
  app.post("/api/analytics/generate-demo-data", isAuthenticated, async (req, res) => {
    try {
      const { analyticsService } = await import("./analyticsService");
      await analyticsService.generateDemoAnalyticsData();
      res.json({ success: true, message: "Demo analytics data generated successfully" });
    } catch (error) {
      console.error("Error generating demo analytics data:", error);
      res.status(500).json({ error: "Failed to generate demo analytics data" });
    }
  });

  // Success Metrics routes
  // === PAYROLL PROCESSING ROUTES ===
  
  // Get standardized earnings codes
  app.get('/api/payroll/earnings-codes', isAuthenticated, async (req, res) => {
    try {
      const { StandardizedEarningsCodesService } = await import('./standardizedEarningsCodesService');
      const earningsService = new StandardizedEarningsCodesService();
      
      const allCodes = earningsService.getAllEarningsCodesRules();
      
      // Structure response with categories
      const categorized = {
        baseWages: Object.values(allCodes).filter(rule => rule.baseWage),
        premiums: Object.values(allCodes).filter(rule => !rule.baseWage && (rule.code.includes('NIGHT') || rule.code.includes('SUNDAY') || rule.code.includes('HOLIDAY') || rule.code.includes('OT'))),
        allowances: Object.values(allCodes).filter(rule => ['MEAL_VOUCHER', 'TRANSPORT', 'HOUSING', 'HAZARD_PAY'].includes(rule.code)),
        bonuses: Object.values(allCodes).filter(rule => rule.code.includes('BONUS') || rule.code.includes('VACATION_PAY')),
        tips: Object.values(allCodes).filter(rule => rule.code.includes('TIP')),
        summary: {
          totalCodes: Object.keys(allCodes).length,
          taxableCodes: Object.values(allCodes).filter(rule => rule.taxable).length,
          efkaContributoryCodes: Object.values(allCodes).filter(rule => rule.contributoryEFKA).length,
          apdIncludedCodes: Object.values(allCodes).filter(rule => rule.includedAPD).length,
          stackableCodes: Object.values(allCodes).filter(rule => rule.stackable).length
        }
      };
      
      res.json(categorized);
    } catch (error) {
      console.error('Error fetching earnings codes:', error);
      res.status(500).json({ message: 'Failed to fetch earnings codes' });
    }
  });
  
  // Validate earnings code stacking
  app.post('/api/payroll/validate-stacking', isAuthenticated, async (req, res) => {
    try {
      const { StandardizedEarningsCodesService } = await import('./standardizedEarningsCodesService');
      const earningsService = new StandardizedEarningsCodesService();
      
      const { primaryCode, stackedCodes } = req.body;
      const validation = earningsService.validateCodeStacking(primaryCode, stackedCodes);
      
      res.json(validation);
    } catch (error) {
      console.error('Error validating code stacking:', error);
      res.status(500).json({ message: 'Failed to validate code stacking' });
    }
  });
  
  // Calculate earnings breakdown
  app.post('/api/payroll/calculate-earnings', isAuthenticated, async (req, res) => {
    try {
      const { StandardizedEarningsCodesService } = await import('./standardizedEarningsCodesService');
      const earningsService = new StandardizedEarningsCodesService();
      
      const { earnings } = req.body; // Array of { code, hours, hourlyRate, fixedAmount? }
      const breakdown = earningsService.generateEarningsBreakdown(earnings);
      
      res.json(breakdown);
    } catch (error) {
      console.error('Error calculating earnings:', error);
      res.status(500).json({ message: 'Failed to calculate earnings breakdown' });
    }
  });

  // Generate payslip for employee
  app.get('/api/payroll/payslip/:employeeId/:runId', isAuthenticated, async (req, res) => {
    try {
      const { PayslipGenerator } = await import('./payslipGenerator');
      const payslipGenerator = new PayslipGenerator();
      
      const { employeeId, runId } = req.params;
      const format = req.query.format as string || 'html';
      
      const payslipData = await payslipGenerator.generatePayslip(employeeId, runId);
      
      if (format === 'json') {
        res.json(payslipData);
      } else {
        const htmlPayslip = await payslipGenerator.formatPayslip(payslipData, 'html');
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlPayslip);
      }
    } catch (error) {
      console.error('Error generating payslip:', error);
      res.status(500).json({ message: 'Failed to generate payslip' });
    }
  });
  
  // Generate SEPA file for payroll run
  app.get('/api/payroll/sepa/:runId', isAuthenticated, async (req, res) => {
    try {
      const { SEPAFileGenerator } = await import('./sepaFileGenerator');
      const sepaGenerator = new SEPAFileGenerator();
      
      const { runId } = req.params;
      const format = req.query.format as string || 'xml';
      
      if (format === 'xml') {
        const sepaXML = await sepaGenerator.generateSEPAFile(runId);
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="SEPA_${runId}_${new Date().toISOString().split('T')[0]}.xml"`);
        res.send(sepaXML);
      } else {
        // Return metadata only
        const payments = await (sepaGenerator as any).getPayrollPayments(runId);
        const metadata = sepaGenerator.generateSEPAMetadata(runId, payments);
        res.json(metadata);
      }
    } catch (error) {
      console.error('Error generating SEPA file:', error);
      res.status(500).json({ message: 'Failed to generate SEPA file' });
    }
  });
  
  // Generate GL mapping for payroll run
  app.get('/api/payroll/gl-mapping/:runId', isAuthenticated, async (req, res) => {
    try {
      const { GLMappingService } = await import('./glMappingService');
      const glMapper = new GLMappingService();
      
      const { runId } = req.params;
      const format = req.query.format as string || 'json';
      
      const glResult = await glMapper.generateGLMapping(runId);
      const validation = glMapper.validateGLMapping(glResult);
      
      if (format === 'csv') {
        const csvData = glMapper.exportToCSV(glResult);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="GL_Mapping_${runId}.csv"`);
        res.send(csvData);
      } else if (format === 'summary') {
        const summary = glMapper.generateAccountSummary(glResult);
        res.json({
          ...glResult,
          accountSummary: summary,
          validation
        });
      } else {
        res.json({
          ...glResult,
          validation
        });
      }
    } catch (error) {
      console.error('Error generating GL mapping:', error);
      res.status(500).json({ message: 'Failed to generate GL mapping' });
    }
  });

  // === SUCCESS METRICS ROUTES ===

  app.get('/api/success-metrics/summary', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      const propertyId = req.query.propertyId as string;
      const summary = await successMetricsService.getSuccessMetricsSummary(propertyId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching success metrics summary:", error);
      res.status(500).json({ message: "Failed to fetch success metrics summary" });
    }
  });

  app.get('/api/success-metrics', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      const propertyId = req.query.propertyId as string;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      if (propertyId === 'all') {
        const metrics = await successMetricsService.getLatestSuccessMetrics();
        res.json(metrics);
      } else {
        const metrics = await successMetricsService.getSuccessMetrics(propertyId, startDate, endDate);
        res.json(metrics);
      }
    } catch (error) {
      console.error("Error fetching success metrics:", error);
      res.status(500).json({ message: "Failed to fetch success metrics" });
    }
  });

  app.get('/api/success-metrics/alerts', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      const propertyId = req.query.propertyId as string;
      const alerts = await successMetricsService.getSuccessMetricAlerts(
        propertyId === 'all' ? undefined : propertyId,
        false // Only unresolved alerts
      );
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching success metric alerts:", error);
      res.status(500).json({ message: "Failed to fetch success metric alerts" });
    }
  });

  app.post('/api/success-metrics/generate-demo', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      await successMetricsService.generateDemoSuccessMetrics();
      res.json({ success: true, message: 'Demo success metrics generated' });
    } catch (error) {
      console.error("Error generating demo success metrics:", error);
      res.status(500).json({ message: "Failed to generate demo success metrics" });
    }
  });

  app.patch('/api/success-metrics/alerts/:alertId/resolve', isAuthenticated, async (req, res) => {
    try {
      const { successMetricsService } = await import('./successMetricsService');
      const alertId = req.params.alertId;
      const userId = req.user?.claims?.sub || 'system';
      await successMetricsService.resolveAlert(alertId, userId);
      res.json({ success: true, message: 'Alert resolved' });
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Modern Payroll Engine routes
  app.get('/api/payroll-engine/status', isAuthenticated, async (req, res) => {
    try {
      const { modernPayrollEngine } = await import('./modernPayrollEngine');
      const engines = modernPayrollEngine.getEngines();
      res.json(engines);
    } catch (error) {
      console.error("Error fetching payroll engines:", error);
      res.status(500).json({ message: "Failed to fetch payroll engines" });
    }
  });

  app.get('/api/payroll-engine/calculations/:period', isAuthenticated, async (req, res) => {
    try {
      const { modernPayrollEngine } = await import('./modernPayrollEngine');
      const period = req.params.period;
      const engineId = req.query.engineId as string || 'greece-2025';
      const calculations = modernPayrollEngine.getCalculations(engineId, period);
      res.json(calculations);
    } catch (error) {
      console.error("Error fetching payroll calculations:", error);
      res.status(500).json({ message: "Failed to fetch payroll calculations" });
    }
  });

  app.post('/api/payroll-engine/calculate', isAuthenticated, async (req, res) => {
    try {
      const { modernPayrollEngine } = await import('./modernPayrollEngine');
      const { engineId, period, employees } = req.body;
      
      // For demo purposes, use sample employees if 'all' is specified
      const employeeList = employees.includes('all') 
        ? ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005']
        : employees;
      
      const calculations = await modernPayrollEngine.calculatePayroll(engineId, period, employeeList);
      res.json({ success: true, calculations, count: calculations.length });
    } catch (error) {
      console.error("Error calculating payroll:", error);
      res.status(500).json({ message: "Failed to calculate payroll" });
    }
  });

  app.post('/api/payroll-engine/generate-demo', isAuthenticated, async (req, res) => {
    try {
      const { modernPayrollEngine } = await import('./modernPayrollEngine');
      await modernPayrollEngine.generateDemoData();
      res.json({ success: true, message: 'Modern payroll demo data generated' });
    } catch (error) {
      console.error("Error generating payroll demo data:", error);
      res.status(500).json({ message: "Failed to generate payroll demo data" });
    }
  });

  app.get('/api/payroll-engine/features', isAuthenticated, async (req, res) => {
    try {
      const { modernPayrollEngine } = await import('./modernPayrollEngine');
      const features = modernPayrollEngine.getFeatures();
      res.json(features);
    } catch (error) {
      console.error("Error fetching payroll features:", error);
      res.status(500).json({ message: "Failed to fetch payroll features" });
    }
  });

  app.get('/api/payroll-engine/performance/:engineId', isAuthenticated, async (req, res) => {
    try {
      const { modernPayrollEngine } = await import('./modernPayrollEngine');
      const engineId = req.params.engineId;
      const metrics = modernPayrollEngine.getPerformanceMetrics(engineId);
      if (!metrics) {
        return res.status(404).json({ message: "Engine not found" });
      }
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // Product Vision routes
  app.get('/api/product-vision/principles', isAuthenticated, async (req, res) => {
    try {
      const { productVisionService } = await import('./productVisionService');
      const principles = productVisionService.getPrinciples();
      res.json(principles);
    } catch (error) {
      console.error("Error fetching product principles:", error);
      res.status(500).json({ message: "Failed to fetch product principles" });
    }
  });

  app.get('/api/product-vision/automation-flow', isAuthenticated, async (req, res) => {
    try {
      const { productVisionService } = await import('./productVisionService');
      const flow = productVisionService.getAutomationFlow();
      const totalTime = productVisionService.getTotalAutomationTime();
      res.json({ flow, totalTime });
    } catch (error) {
      console.error("Error fetching automation flow:", error);
      res.status(500).json({ message: "Failed to fetch automation flow" });
    }
  });

  app.get('/api/product-vision/ux-metrics', isAuthenticated, async (req, res) => {
    try {
      const { productVisionService } = await import('./productVisionService');
      const metrics = productVisionService.getUXMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching UX metrics:", error);
      res.status(500).json({ message: "Failed to fetch UX metrics" });
    }
  });

  app.get('/api/product-vision/compliance-metrics', isAuthenticated, async (req, res) => {
    try {
      const { productVisionService } = await import('./productVisionService');
      const metrics = productVisionService.getComplianceMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching compliance metrics:", error);
      res.status(500).json({ message: "Failed to fetch compliance metrics" });
    }
  });

  app.get('/api/product-vision/automation-benefits', isAuthenticated, async (req, res) => {
    try {
      const { productVisionService } = await import('./productVisionService');
      const benefits = productVisionService.getAutomationBenefits();
      res.json(benefits);
    } catch (error) {
      console.error("Error fetching automation benefits:", error);
      res.status(500).json({ message: "Failed to fetch automation benefits" });
    }
  });

  app.get('/api/product-vision/api-architecture', isAuthenticated, async (req, res) => {
    try {
      const { productVisionService } = await import('./productVisionService');
      const architecture = productVisionService.getAPIArchitecture();
      res.json(architecture);
    } catch (error) {
      console.error("Error fetching API architecture:", error);
      res.status(500).json({ message: "Failed to fetch API architecture" });
    }
  });

  app.get('/api/product-vision/hotel-features', isAuthenticated, async (req, res) => {
    try {
      const { productVisionService } = await import('./productVisionService');
      const features = productVisionService.getHotelFeatures();
      res.json(features);
    } catch (error) {
      console.error("Error fetching hotel features:", error);
      res.status(500).json({ message: "Failed to fetch hotel features" });
    }
  });

  // Greece Compliance routes
  app.get('/api/compliance/digital-work-cards', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      const cards = complianceConnector.getDigitalWorkCards();
      res.json(cards);
    } catch (error) {
      console.error("Error fetching digital work cards:", error);
      res.status(500).json({ message: "Failed to fetch digital work cards" });
    }
  });

  app.get('/api/compliance/ergani-events/:period', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      const period = req.params.period.replace('-', ''); // Convert YYYY-MM to YYYYMM
      const events = complianceConnector.getERGANIEvents(period);
      res.json(events);
    } catch (error) {
      console.error("Error fetching ERGANI events:", error);
      res.status(500).json({ message: "Failed to fetch ERGANI events" });
    }
  });

  app.get('/api/compliance/minimum-wage-rules', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      const rules = complianceConnector.getMinimumWageRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching minimum wage rules:", error);
      res.status(500).json({ message: "Failed to fetch minimum wage rules" });
    }
  });

  app.get('/api/compliance/government-flows', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      const flows = complianceConnector.getGovernmentFlows();
      res.json(flows);
    } catch (error) {
      console.error("Error fetching government flows:", error);
      res.status(500).json({ message: "Failed to fetch government flows" });
    }
  });

  app.get('/api/compliance/special-pays', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      const pays = complianceConnector.getGreekSpecialPays();
      res.json(pays);
    } catch (error) {
      console.error("Error fetching special pays:", error);
      res.status(500).json({ message: "Failed to fetch special pays" });
    }
  });

  app.post('/api/compliance/generate-demo', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      await complianceConnector.generateDemoData();
      res.json({ success: true, message: 'Greece compliance demo data generated' });
    } catch (error) {
      console.error("Error generating compliance demo data:", error);
      res.status(500).json({ message: "Failed to generate compliance demo data" });
    }
  });

  app.post('/api/compliance/ergani-sync', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      // Simulate ERGANI sync for all digital work cards
      const cards = complianceConnector.getDigitalWorkCards();
      const syncResults = await Promise.all(
        cards.map(card => complianceConnector.syncDigitalWorkCard(card.cardId))
      );
      const successCount = syncResults.filter(result => result).length;
      
      res.json({ 
        success: true, 
        message: `ERGANI sync completed: ${successCount}/${cards.length} cards synchronized`,
        syncResults: {
          total: cards.length,
          successful: successCount,
          failed: cards.length - successCount
        }
      });
    } catch (error) {
      console.error("Error syncing ERGANI:", error);
      res.status(500).json({ message: "Failed to sync ERGANI" });
    }
  });

  app.get('/api/compliance/check/:category?', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      const category = req.params.category;
      const complianceCheck = await complianceConnector.checkCompliance(category);
      res.json(complianceCheck);
    } catch (error) {
      console.error("Error checking compliance:", error);
      res.status(500).json({ message: "Failed to check compliance" });
    }
  });

  app.post('/api/compliance/government-flow/:flowId/submit', isAuthenticated, async (req, res) => {
    try {
      const { complianceConnector } = await import('./complianceConnector');
      const flowId = req.params.flowId;
      const success = await complianceConnector.submitGovernmentFlow(flowId);
      
      if (success) {
        res.json({ success: true, message: 'Government flow submitted successfully' });
      } else {
        res.status(400).json({ success: false, message: 'Failed to submit government flow' });
      }
    } catch (error) {
      console.error("Error submitting government flow:", error);
      res.status(500).json({ message: "Failed to submit government flow" });
    }
  });

  // Self-Service & Mobile Routes
  
  // Employee Dashboard
  app.get('/api/self-service/employee/:employeeId/dashboard', isAuthenticated, async (req, res) => {
    try {
      const employeeId = req.params.employeeId;
      const dashboard = await selfServiceManager.getEmployeeDashboard(employeeId);
      res.json(dashboard);
    } catch (error) {
      console.error("Error getting employee dashboard:", error);
      res.status(500).json({ message: "Failed to get employee dashboard" });
    }
  });

  // Generate Employee Payslip
  app.get('/api/self-service/employee/:employeeId/payslip/:period', isAuthenticated, async (req, res) => {
    try {
      const { employeeId, period } = req.params;
      const payslip = await selfServiceManager.generatePayslip(employeeId, period);
      res.json(payslip);
    } catch (error) {
      console.error("Error generating payslip:", error);
      res.status(500).json({ message: "Failed to generate payslip" });
    }
  });

  // Generate Year-End Certificate
  app.get('/api/self-service/employee/:employeeId/certificate/:year', isAuthenticated, async (req, res) => {
    try {
      const employeeId = req.params.employeeId;
      const year = parseInt(req.params.year);
      const certificate = await selfServiceManager.generateYearEndCertificate(employeeId, year);
      res.json(certificate);
    } catch (error) {
      console.error("Error generating year-end certificate:", error);
      res.status(500).json({ message: "Failed to generate year-end certificate" });
    }
  });

  // Get Punch History
  app.get('/api/self-service/employee/:employeeId/punch-history', isAuthenticated, async (req, res) => {
    try {
      const employeeId = req.params.employeeId;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const punchHistory = await selfServiceManager.getPunchHistory(employeeId, startDate, endDate);
      res.json(punchHistory);
    } catch (error) {
      console.error("Error getting punch history:", error);
      res.status(500).json({ message: "Failed to get punch history" });
    }
  });

  // Submit Time Correction
  app.post('/api/self-service/employee/:employeeId/time-correction', isAuthenticated, async (req, res) => {
    try {
      const employeeId = req.params.employeeId;
      const { punchId, newTimestamp, reason } = req.body;
      const result = await selfServiceManager.submitTimeCorrection(
        employeeId, 
        punchId, 
        new Date(newTimestamp), 
        reason
      );
      res.json(result);
    } catch (error) {
      console.error("Error submitting time correction:", error);
      res.status(500).json({ message: "Failed to submit time correction" });
    }
  });

  // Manager Dashboard
  app.get('/api/self-service/manager/:managerId/dashboard', isAuthenticated, async (req, res) => {
    try {
      const managerId = req.params.managerId;
      const propertyId = req.query.propertyId as string || 'default';
      const dashboard = await selfServiceManager.getManagerDashboard(managerId, propertyId);
      res.json(dashboard);
    } catch (error) {
      console.error("Error getting manager dashboard:", error);
      res.status(500).json({ message: "Failed to get manager dashboard" });
    }
  });

  // Get Pending Approvals
  app.get('/api/self-service/manager/:managerId/approvals', isAuthenticated, async (req, res) => {
    try {
      const managerId = req.params.managerId;
      const propertyId = req.query.propertyId as string || 'default';
      const approvals = await selfServiceManager.getPendingApprovals(managerId, propertyId);
      res.json(approvals);
    } catch (error) {
      console.error("Error getting pending approvals:", error);
      res.status(500).json({ message: "Failed to get pending approvals" });
    }
  });

  // Approve Overtime Request
  app.post('/api/self-service/manager/:managerId/approve-overtime', isAuthenticated, async (req, res) => {
    try {
      const managerId = req.params.managerId;
      const { requestId, approved, notes } = req.body;
      const result = await selfServiceManager.approveOvertimeRequest(managerId, requestId, approved, notes);
      res.json(result);
    } catch (error) {
      console.error("Error approving overtime request:", error);
      res.status(500).json({ message: "Failed to approve overtime request" });
    }
  });

  // Quick Hire
  app.post('/api/self-service/manager/:managerId/quick-hire', isAuthenticated, async (req, res) => {
    try {
      const managerId = req.params.managerId;
      const employeeData = req.body;
      const result = await selfServiceManager.quickHire(managerId, employeeData);
      res.json(result);
    } catch (error) {
      console.error("Error processing quick hire:", error);
      res.status(500).json({ message: "Failed to process quick hire" });
    }
  });

  // Payment Services Routes

  // Generate SEPA payment file
  app.post('/api/payments/sepa/generate', isAuthenticated, async (req, res) => {
    try {
      const payrollPeriodId = req.body.payrollPeriodId;
      const propertyId = req.body.propertyId;
      
      if (!payrollPeriodId) {
        return res.status(400).json({ error: "Payroll period ID is required" });
      }
      
      const result = await sepaPaymentService.generateSepaFile(payrollPeriodId, propertyId);
      res.json(result);
    } catch (error) {
      console.error("Error generating SEPA file:", error);
      res.status(500).json({ error: "Failed to generate SEPA file" });
    }
  });

  // Download SEPA payment file
  app.get('/api/payments/sepa/:fileId/download', isAuthenticated, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const sepaFile = await sepaPaymentService.downloadSepaFile(fileId);
      
      if (!sepaFile) {
        return res.status(404).json({ error: "SEPA file not found" });
      }
      
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename=${sepaFile.fileName}`);
      res.send(sepaFile.content);
    } catch (error) {
      console.error("Error downloading SEPA file:", error);
      res.status(500).json({ error: "Failed to download SEPA file" });
    }
  });

  // Piraeus Bank encrypted SEPA file generation with e-PPS Mass Payments
  app.post('/api/payments/sepa/generate-encrypted', isAuthenticated, async (req, res) => {
    try {
      const { payrollRunId, encryptionKey, ePPSMode = true } = req.body;
      
      if (!payrollRunId) {
        return res.status(400).json({ error: "Payroll run ID is required" });
      }
      
      const { SEPAFileGenerator } = await import("./sepaFileGenerator");
      const sepaFileGenerator = new SEPAFileGenerator();
      
      // Validate Piraeus Bank capabilities for e-PPS Mass Payments
      const validation = sepaFileGenerator.validateBankCapabilities('piraeus', {
        painVersion: 'pain.001.001.03',
        hostToHostEncryption: !!encryptionKey,
        ePPSMassPayments: ePPSMode
      });
      
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Piraeus Bank e-PPS validation failed", 
          issues: validation.issues 
        });
      }
      
      // Generate encrypted SEPA file with e-PPS format
      const result = await sepaFileGenerator.generateEncryptedSEPAFile(payrollRunId, encryptionKey);
      const ePPSFormat = sepaFileGenerator.getPiraeusePPSFormat(payrollRunId);
      const bankProfile = sepaFileGenerator.getBankProfileInfo('piraeus');
      
      res.json({
        ...result,
        ePPSFormat,
        bankProfile,
        validation,
        cutoffTime: "13:30",
        processingMode: "BATCH_CREDIT_TRANSFER"
      });
    } catch (error) {
      console.error("Error generating encrypted SEPA file:", error);
      res.status(500).json({ error: "Failed to generate encrypted SEPA file" });
    }
  });

  // NBG SEPA Instant file generation (off-cycle urgent corrections)
  app.post('/api/payments/sepa/generate-instant', isAuthenticated, async (req, res) => {
    try {
      const { payrollRunId, isOffCycle = true, urgentCorrections = true } = req.body;
      
      if (!payrollRunId) {
        return res.status(400).json({ error: 'payrollRunId is required' });
      }

      const { SEPAFileGenerator } = await import("./sepaFileGenerator");
      const sepaFileGenerator = new SEPAFileGenerator();
      
      // Validate NBG capabilities for SEPA Instant
      const validation = sepaFileGenerator.validateBankCapabilities('nbg', {
        painVersion: 'pain.001.001.03',
        statusReporting: true,
        reconciliation: true
      });
      
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "NBG SEPA Instant validation failed", 
          issues: validation.issues 
        });
      }

      const sepaFile = await sepaFileGenerator.generateSEPAFile(payrollRunId, 'nbg');
      const specs = sepaFileGenerator.getNBGBulkFileSpecs(payrollRunId, isOffCycle);
      const bankProfile = sepaFileGenerator.getBankProfileInfo('nbg');
      
      res.json({
        success: true,
        sepaFile,
        bankProfile: 'nbg',
        processingMode: specs.processingMode,
        sepaInstantSupport: specs.sepaInstantSupport,
        urgentCorrections: specs.urgentCorrections,
        bulkFileManagement: specs.bulkFileManagement,
        cutoffTime: "14:00",
        validation,
        message: isOffCycle 
          ? 'SEPA Instant (SCT Inst) file generated for urgent off-cycle corrections'
          : 'Standard bulk SEPA file generated for NBG'
      });
    } catch (error) {
      console.error('Error generating NBG SEPA Instant file:', error);
      res.status(500).json({ error: 'Failed to generate SEPA Instant file' });
    }
  });

  // Comprehensive engine validation endpoint
  app.post('/api/payments/sepa/validate-engine', isAuthenticated, async (req, res) => {
    try {
      const { bankProfile, payments, requestedExecutionDate } = req.body;
      
      if (!bankProfile || !payments) {
        return res.status(400).json({ error: 'bankProfile and payments are required' });
      }

      const { SepaEngineValidator } = await import("./sepaEngineValidator");
      const validator = new SepaEngineValidator();
      
      const validationResult = await validator.validateEngineExecution(
        bankProfile,
        payments,
        requestedExecutionDate ? new Date(requestedExecutionDate) : undefined
      );
      
      res.json({
        success: true,
        validation: validationResult,
        bankProfile,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error validating engine execution:', error);
      res.status(500).json({ error: 'Failed to validate engine execution' });
    }
  });

  // pain.002 status processing and reject surfacing
  app.post('/api/payments/sepa/process-status', isAuthenticated, async (req, res) => {
    try {
      const { pain002Response, correlationId } = req.body;
      
      if (!pain002Response) {
        return res.status(400).json({ error: 'pain002Response is required' });
      }

      const { SepaEngineValidator } = await import("./sepaEngineValidator");
      const validator = new SepaEngineValidator();
      
      const rejectAnalysis = validator.surfaceRejects(pain002Response);
      
      res.json({
        success: true,
        correlationId,
        rejectAnalysis,
        processedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing pain.002 status:', error);
      res.status(500).json({ error: 'Failed to process status report' });
    }
  });

  // Payment operations workflow endpoints
  app.post('/api/payments/ops/upload-bank-channel', isAuthenticated, async (req, res) => {
    try {
      const { sepaFile, bankProfile, uploadChannel, entityId } = req.body;
      
      if (!sepaFile || !bankProfile || !uploadChannel) {
        return res.status(400).json({ error: 'sepaFile, bankProfile, and uploadChannel are required' });
      }

      // Simulate bank channel upload
      const submissionId = `SUB-${Date.now()}-${bankProfile.toUpperCase()}`;
      
      res.json({
        success: true,
        submissionId,
        uploadChannel,
        bankProfile,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error uploading to bank channel:', error);
      res.status(500).json({ error: 'Failed to upload to bank channel' });
    }
  });

  app.get('/api/payments/ops/poll-status/:submissionId', isAuthenticated, async (req, res) => {
    try {
      const { submissionId } = req.params;
      
      // Simulate status polling
      const mockStatuses = ['SUBMITTED', 'PROCESSING', 'ACCEPTED', 'COMPLETED'];
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
      
      res.json({
        submissionId,
        status: randomStatus,
        pain002Received: randomStatus !== 'SUBMITTED',
        acceptedPayments: randomStatus === 'COMPLETED' ? 40 : 0,
        rejectedPayments: randomStatus === 'COMPLETED' ? 5 : 0,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error polling status:', error);
      res.status(500).json({ error: 'Failed to poll status' });
    }
  });

  app.get('/api/payments/ops/download-camt054/:submissionId', isAuthenticated, async (req, res) => {
    try {
      const { submissionId } = req.params;
      
      // Simulate camt.054 download
      const mockCamt054 = {
        documentId: `CAMT054-${submissionId}`,
        downloadUrl: `/api/files/camt054/${submissionId}.xml`,
        reconciliationData: {
          totalCredits: 40,
          totalAmount: 122850.00,
          currency: 'EUR',
          executionDate: new Date().toISOString()
        }
      };
      
      res.json({
        success: true,
        camt054: mockCamt054,
        reconciliationComplete: true,
        downloadedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error downloading camt.054:', error);
      res.status(500).json({ error: 'Failed to download camt.054' });
    }
  });

  // Get payment history
  app.get('/api/payments/history', isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const history = await sepaPaymentService.getPaymentHistory(propertyId, startDate, endDate);
      res.json(history);
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  // Generate GL export
  app.post('/api/gl-export/generate', isAuthenticated, async (req, res) => {
    try {
      const request = req.body;
      
      if (!request.payrollPeriodId || !request.exportType || !request.format || !request.erpSystem) {
        return res.status(400).json({ 
          error: "Missing required fields: payrollPeriodId, exportType, format, erpSystem" 
        });
      }
      
      const result = await glExportService.generateGLExport(request);
      res.json(result);
    } catch (error) {
      console.error("Error generating GL export:", error);
      res.status(500).json({ error: "Failed to generate GL export" });
    }
  });

  // Download GL export file
  app.get('/api/gl-export/:exportId/download', isAuthenticated, async (req, res) => {
    try {
      const exportId = req.params.exportId;
      const glExport = await glExportService.downloadGLExport(exportId);
      
      if (!glExport) {
        return res.status(404).json({ error: "GL export not found" });
      }
      
      const contentType = glExport.format === 'csv' ? 'text/csv' : 
                          glExport.format === 'xml' ? 'application/xml' : 
                          'application/json';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${glExport.fileName}`);
      res.send(glExport.content);
    } catch (error) {
      console.error("Error downloading GL export:", error);
      res.status(500).json({ error: "Failed to download GL export" });
    }
  });

  // Get GL export history
  app.get('/api/gl-export/history', isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.query.propertyId as string;
      const erpSystem = req.query.erpSystem as string;
      
      const history = await glExportService.getGLExportHistory(propertyId, erpSystem);
      res.json(history);
    } catch (error) {
      console.error("Error fetching GL export history:", error);
      res.status(500).json({ error: "Failed to fetch GL export history" });
    }
  });

  // Filing & Compliance routes
  app.post("/api/filings/apd/generate", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, period } = req.body;
      const filing = await filingComplianceService.generateAPDFiling(propertyId, period);
      res.json(filing);
    } catch (error) {
      console.error("Error generating APD filing:", error);
      res.status(500).json({ error: "Failed to generate APD filing" });
    }
  });

  app.post("/api/filings/fmy/generate", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, period } = req.body;
      const filing = await filingComplianceService.generateFMYFiling(propertyId, period);
      res.json(filing);
    } catch (error) {
      console.error("Error generating ΦΜΥ filing:", error);
      res.status(500).json({ error: "Failed to generate ΦΜΥ filing" });
    }
  });

  app.post("/api/filings/apd/:filingId/submit", isAuthenticated, async (req, res) => {
    try {
      const { filingId } = req.params;
      const result = await filingComplianceService.submitAPDFiling(filingId);
      res.json(result);
    } catch (error) {
      console.error("Error submitting APD filing:", error);
      res.status(500).json({ error: "Failed to submit APD filing" });
    }
  });

  app.post("/api/filings/fmy/:filingId/submit", isAuthenticated, async (req, res) => {
    try {
      const { filingId } = req.params;
      const result = await filingComplianceService.submitFMYFiling(filingId);
      res.json(result);
    } catch (error) {
      console.error("Error submitting ΦΜΥ filing:", error);
      res.status(500).json({ error: "Failed to submit ΦΜΥ filing" });
    }
  });

  app.post("/api/ergani/form-pack", isAuthenticated, async (req, res) => {
    try {
      const { formType, employeeId, propertyId, formData } = req.body;
      const formPack = await filingComplianceService.createERGANIFormPack(formType, employeeId, propertyId, formData);
      res.json(formPack);
    } catch (error) {
      console.error("Error creating ERGANI form pack:", error);
      res.status(500).json({ error: "Failed to create ERGANI form pack" });
    }
  });

  app.post("/api/ergani/form-pack/:packId/submit", isAuthenticated, async (req, res) => {
    try {
      const { packId } = req.params;
      const result = await filingComplianceService.submitERGANIFormPack(packId);
      res.json(result);
    } catch (error) {
      console.error("Error submitting ERGANI form pack:", error);
      res.status(500).json({ error: "Failed to submit ERGANI form pack" });
    }
  });

  app.get("/api/digital-work-card/dashboard", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, period } = req.query;
      const dashboard = await filingComplianceService.generateDigitalWorkCardDashboard(propertyId as string, period as string);
      res.json(dashboard);
    } catch (error) {
      console.error("Error generating Digital Work Card dashboard:", error);
      res.status(500).json({ error: "Failed to generate Digital Work Card dashboard" });
    }
  });

  app.get("/api/filings/history", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, filingType } = req.query;
      const history = await filingComplianceService.getFilingHistory(propertyId as string, filingType as string);
      res.json(history);
    } catch (error) {
      console.error("Error fetching filing history:", error);
      res.status(500).json({ error: "Failed to fetch filing history" });
    }
  });

  app.get("/api/inspector-pack", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      const pack = await filingComplianceService.generateInspectorPack(
        propertyId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(pack);
    } catch (error) {
      console.error("Error generating inspector pack:", error);
      res.status(500).json({ error: "Failed to generate inspector pack" });
    }
  });

  // Advanced Analytics Routes (3.8)
  
  // Labor Cost Forecasting
  app.get('/api/analytics/labor-forecast/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const forecastMonths = parseInt(req.query.forecastMonths as string) || 3;
      const forecast = await advancedAnalyticsService.generateLaborCostForecast(propertyId, forecastMonths);
      res.json(forecast);
    } catch (error) {
      console.error("Error generating labor cost forecast:", error);
      res.status(500).json({ error: "Failed to generate labor cost forecast" });
    }
  });

  // Overtime Heatmap
  app.get('/api/analytics/overtime-heatmap/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Valid startDate and endDate are required" });
      }
      
      const heatmap = await advancedAnalyticsService.generateOvertimeHeatmap(propertyId, startDate, endDate);
      res.json(heatmap);
    } catch (error) {
      console.error("Error generating overtime heatmap:", error);
      res.status(500).json({ error: "Failed to generate overtime heatmap" });
    }
  });

  // Compliance KPIs
  app.get('/api/analytics/compliance-kpis/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const period = req.query.period as string || new Date().toISOString().slice(0, 7); // YYYY-MM format
      const kpis = await advancedAnalyticsService.getComplianceKPIs(propertyId, period);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching compliance KPIs:", error);
      res.status(500).json({ error: "Failed to fetch compliance KPIs" });
    }
  });

  // Productivity Metrics
  app.get('/api/analytics/productivity-metrics/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const period = req.query.period as string || new Date().toISOString().slice(0, 7); // YYYY-MM format
      const metrics = await advancedAnalyticsService.getProductivityMetrics(propertyId, period);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching productivity metrics:", error);
      res.status(500).json({ error: "Failed to fetch productivity metrics" });
    }
  });

  // Executive Summary Dashboard
  app.get('/api/analytics/executive-summary/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const summary = await advancedAnalyticsService.getExecutiveSummary(propertyId);
      res.json(summary);
    } catch (error) {
      console.error("Error generating executive summary:", error);
      res.status(500).json({ error: "Failed to generate executive summary" });
    }
  });

  // Hotel-Specific Enhancements Routes

  // Seasonality Toolkit
  app.get('/api/hotel-enhancements/seasonal-analytics/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const seasonId = req.query.seasonId as string;
      const analytics = await hotelEnhancementsService.getSeasonalAnalytics(propertyId, seasonId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching seasonal analytics:", error);
      res.status(500).json({ message: "Failed to fetch seasonal analytics" });
    }
  });

  app.post('/api/hotel-enhancements/seasonality-plan', isAuthenticated, async (req, res) => {
    try {
      const seasonData = req.body;
      const plan = await hotelEnhancementsService.createSeasonalityPlan(seasonData);
      res.json(plan);
    } catch (error) {
      console.error("Error creating seasonality plan:", error);
      res.status(500).json({ message: "Failed to create seasonality plan" });
    }
  });

  app.post('/api/hotel-enhancements/batch-hiring', isAuthenticated, async (req, res) => {
    try {
      const { seasonId, hiringPlan } = req.body;
      const result = await hotelEnhancementsService.executeBatchHiring(seasonId, hiringPlan);
      res.json(result);
    } catch (error) {
      console.error("Error executing batch hiring:", error);
      res.status(500).json({ message: "Failed to execute batch hiring" });
    }
  });

  // Accommodation & Meal Allowances
  app.post('/api/hotel-enhancements/allowances/configure', isAuthenticated, async (req, res) => {
    try {
      const { propertyId, config } = req.body;
      const allowances = await hotelEnhancementsService.configureAccommodationAllowances(propertyId, config);
      res.json(allowances);
    } catch (error) {
      console.error("Error configuring allowances:", error);
      res.status(500).json({ message: "Failed to configure allowances" });
    }
  });

  // Tip Pooling Engine
  app.get('/api/hotel-enhancements/tip-pool-analytics/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      // Return demo tip pool analytics
      const demoTipPool = {
        poolId: `pool_${propertyId}`,
        poolName: 'Main Property Tip Pool',
        totalTipsCollected: 15420.50,
        averagePerEmployee: 285.75,
        topPerformers: [
          {
            employeeId: 'emp_001',
            employeeName: 'Maria Papadopoulos',
            tipAmount: 425.80,
            performanceScore: 4.7
          },
          {
            employeeId: 'emp_002',
            employeeName: 'Dimitris Kostas',
            tipAmount: 398.25,
            performanceScore: 4.6
          }
        ],
        departmentBreakdown: [
          {
            department: 'F&B Service',
            totalTips: 8950.30,
            employeeCount: 28,
            averagePerEmployee: 319.65
          },
          {
            department: 'Bar',
            totalTips: 4120.15,
            employeeCount: 12,
            averagePerEmployee: 343.35
          },
          {
            department: 'Room Service',
            totalTips: 2350.05,
            employeeCount: 8,
            averagePerEmployee: 293.76
          }
        ]
      };
      res.json(demoTipPool);
    } catch (error) {
      console.error("Error fetching tip pool analytics:", error);
      res.status(500).json({ message: "Failed to fetch tip pool analytics" });
    }
  });

  app.post('/api/hotel-enhancements/tip-pool/configure', isAuthenticated, async (req, res) => {
    try {
      const { propertyId, poolName, distributionMethod } = req.body;
      const tipPool = await hotelEnhancementsService.createTipPoolingEngine(propertyId, {
        poolName,
        configuration: { distributionMethod }
      });
      res.json(tipPool);
    } catch (error) {
      console.error("Error configuring tip pool:", error);
      res.status(500).json({ message: "Failed to configure tip pool" });
    }
  });

  app.post('/api/hotel-enhancements/tip-pool/:poolId/distribute', isAuthenticated, async (req, res) => {
    try {
      const { poolId } = req.params;
      const { startDate, endDate } = req.body;
      const distribution = await hotelEnhancementsService.calculateTipDistribution(
        poolId,
        { startDate: new Date(startDate), endDate: new Date(endDate) }
      );
      res.json(distribution);
    } catch (error) {
      console.error("Error calculating tip distribution:", error);
      res.status(500).json({ message: "Failed to calculate tip distribution" });
    }
  });

  // Split Shifts & Costing
  app.post('/api/hotel-enhancements/split-shift/create', isAuthenticated, async (req, res) => {
    try {
      const { employeeId, date, segments } = req.body;
      const splitShift = await hotelEnhancementsService.createSplitShift(
        employeeId,
        new Date(date),
        segments
      );
      res.json(splitShift);
    } catch (error) {
      console.error("Error creating split shift:", error);
      res.status(500).json({ message: "Failed to create split shift" });
    }
  });

  app.get('/api/hotel-enhancements/split-shifts/:employeeId', isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Return demo split shift data
      const demoSplitShifts = [
        {
          splitId: 'split_001',
          employeeId,
          date: new Date(),
          segments: [
            {
              segmentId: 'seg_001',
              startTime: '06:00',
              endTime: '10:00',
              outlet: 'Restaurant',
              department: 'F&B Service',
              costCenter: 'REST001',
              hoursWorked: 4.0,
              laborCost: 52.00,
              activities: ['Breakfast Service', 'Table Setup']
            },
            {
              segmentId: 'seg_002',
              startTime: '19:00',
              endTime: '23:00',
              outlet: 'Pool Bar',
              department: 'Bar Service',
              costCenter: 'BAR001',
              hoursWorked: 4.0,
              laborCost: 58.00,
              activities: ['Dinner Service', 'Bar Operations']
            }
          ],
          costingBreakdown: {
            totalHours: 8.0,
            totalLaborCost: 110.00,
            outletDistribution: [
              { outlet: 'Restaurant', hours: 4.0, cost: 52.00, percentage: 47.3 },
              { outlet: 'Pool Bar', hours: 4.0, cost: 58.00, percentage: 52.7 }
            ],
            departmentDistribution: [
              { department: 'F&B Service', hours: 4.0, cost: 52.00, percentage: 47.3 },
              { department: 'Bar Service', hours: 4.0, cost: 58.00, percentage: 52.7 }
            ]
          },
          complianceChecks: {
            maxDailyHours: true,
            minimumRestPeriod: true,
            overtimeRules: true,
            breakRequirements: true
          }
        }
      ];
      
      res.json(demoSplitShifts);
    } catch (error) {
      console.error("Error fetching split shifts:", error);
      res.status(500).json({ message: "Failed to fetch split shifts" });
    }
  });

  // Rules Engine API routes
  app.use(rulesAPIRouter);

  // Comprehensive API Routes
  app.use(authAPI);
  app.use(employeesAPI);
  app.use(timeAPI);
  app.use(payrollAPI);
  app.use(filingsAPI);
  // V1 Payments API
  paymentsRoutes(app);
  app.use(webhooksAPI);
  app.use(healthAPI);
  app.use(securityAPI);
  app.use(reportsAPI);
  
  // Disaster Recovery API
  const disasterRecoveryAPI = (await import("./api/disasterRecovery")).default;
  app.use("/api/disaster-recovery", disasterRecoveryAPI);
  
  // Central Log Management API
  const logsAPI = (await import("./api/logs")).default;
  app.use("/api/logs", logsAPI);
  
  // Government System Monitoring API
  const governmentMonitoringAPI = (await import("./api/governmentSystemMonitoring")).default;
  app.use("/api/government-monitoring", governmentMonitoringAPI);
  
  // On-Call Rota API
  const onCallRotaAPI = (await import("./api/onCallRota")).default;
  app.use("/api/on-call", onCallRotaAPI);

  // Register automated runbooks routes
  try {
    const automatedRunbooksRoutes = (await import('./api/automatedRunbooks')).default;
    app.use('/api/automated-runbooks', automatedRunbooksRoutes);
  } catch (error) {
    console.error('Failed to register automated runbooks routes:', error);
  }

  // Register status page routes
  try {
    const statusPageRoutes = (await import('./api/statusPage')).default;
    app.use('/api/status', statusPageRoutes);
  } catch (error) {
    console.error('Failed to register status page routes:', error);
  }

  // Register incident communication templates routes
  try {
    const incidentTemplatesRoutes = (await import('./api/incidentTemplates')).default;
    app.use('/api/incident-templates', incidentTemplatesRoutes);
  } catch (error) {
    console.error('Failed to register incident templates routes:', error);
  }

  // Register root cause analysis routes
  try {
    const rcaRoutes = (await import('./api/rca')).default;
    app.use('/api/rca', rcaRoutes);
  } catch (error) {
    console.error('Failed to register RCA routes:', error);
  }

  // Register incident ownership routes
  try {
    const incidentOwnershipRoutes = (await import('./api/incidentOwnership')).default;
    app.use('/api/incident-ownership', incidentOwnershipRoutes);
  } catch (error) {
    console.error('Failed to register incident ownership routes:', error);
  }

  // Register incident response ownership routes
  try {
    const incidentResponseOwnershipRoutes = (await import('./api/incidentResponseOwnership')).default;
    app.use('/api/incident-response-ownership', incidentResponseOwnershipRoutes);
  } catch (error) {
    console.error('Failed to register incident response ownership routes:', error);
  }

  // Register disaster recovery routes
  try {
    const disasterRecoveryRoutes = (await import('./api/disasterRecovery')).default;
    app.use('/api/disaster-recovery', disasterRecoveryRoutes);
  } catch (error) {
    console.error('Failed to register disaster recovery routes:', error);
  }

  // Register dunning email routes
  try {
    const dunningEmailRoutes = (await import('./api/dunningEmails')).default;
    app.use('/api/dunning-emails', dunningEmailRoutes);
  } catch (error) {
    console.error('Failed to register dunning email routes:', error);
  }
  
  // Register forecasting API routes
  registerForecastingRoutes(app);
  
  // Register Document AI API routes
  registerDocumentAIRoutes(app);
  
  // Register Change Log & Legal Watch API routes
  registerChangeLogLegalWatchRoutes(app);

  // Register Partner Management API routes
  // registerPartnerRoutes(app); // TODO: Fix registerPartnerRoutes import
  registerFilingWorkflowRoutes(app);
  registerClientApprovalRoutes(app);
  
  // Register Testing Infrastructure routes
  registerTestingRoutes(app);

  // DST Testing and Timezone API routes
  app.post('/api/dst/test/all', dstTestingApi.executeAllDSTTests);
  app.post('/api/dst/calculate-shift', dstTestingApi.calculateDSTAwareShift);
  app.post('/api/dst/calculate-overtime', dstTestingApi.calculateDSTAwareOvertime);
  app.get('/api/dst/transitions/:year?', dstTestingApi.getDSTTransitions);
  app.post('/api/dst/validate-time', dstTestingApi.validateTimezone);
  app.post('/api/timezone/convert', dstTestingApi.convertTimezones);
  app.post('/api/timezone/remote-work', dstTestingApi.calculateRemoteWork);
  app.post('/api/dst/schedule-recommendations', dstTestingApi.generateScheduleRecommendations);
  app.post('/api/timezone/optimal-meeting', dstTestingApi.findOptimalMeetingTime);

  // Security Administration API routes
  app.get('/api/security/status', async (req, res) => {
    try {
      const status = await SecurityEnforcementInitializer.getSecurityStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get security status' });
    }
  });

  // MFA API routes with fresh verification requirement
  app.post('/api/mfa/verify', MfaEnforcementMiddleware.markMfaVerified(), async (req, res) => {
    // MFA verification endpoint implementation would go here
    res.json({ success: true, verified: true });
  });

  // High-security operations require fresh MFA
  app.use('/api/admin', MfaEnforcementMiddleware.requireFreshMfa());
  app.use('/api/security', MfaEnforcementMiddleware.requireFreshMfa());

  // GDPR Compliance API routes
  app.get('/api/gdpr/status', async (req, res) => {
    try {
      const { GDPRComplianceInitializer } = await import('./services/GDPRComplianceInitializer');
      const status = GDPRComplianceInitializer.getComplianceStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get GDPR compliance status' });
    }
  });

  app.get('/api/gdpr/dashboard', async (req, res) => {
    try {
      const { GDPRComplianceInitializer } = await import('./services/GDPRComplianceInitializer');
      const dashboard = await GDPRComplianceInitializer.getComplianceDashboard();
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get GDPR compliance dashboard' });
    }
  });

  app.get('/api/gdpr/health-check', async (req, res) => {
    try {
      const { GDPRComplianceInitializer } = await import('./services/GDPRComplianceInitializer');
      const healthCheck = await GDPRComplianceInitializer.runComplianceHealthCheck();
      res.json(healthCheck);
    } catch (error) {
      res.status(500).json({ error: 'Failed to run GDPR compliance health check' });
    }
  });

  app.get('/api/gdpr/report', async (req, res) => {
    try {
      const language = (req.query.language as 'el' | 'en') || 'en';
      const { GDPRComplianceInitializer } = await import('./services/GDPRComplianceInitializer');
      const report = await GDPRComplianceInitializer.generateComplianceReport(language);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate GDPR compliance report' });
    }
  });

  // Cookie Consent API routes
  app.get('/api/cookies/banner/:language', async (req, res) => {
    try {
      const language = req.params.language as 'el' | 'en';
      const { CookieConsentService } = await import('./services/CookieConsentService');
      const banner = CookieConsentService.getConsentBanner(language);
      res.json(banner);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get consent banner' });
    }
  });

  app.post('/api/cookies/consent', async (req, res) => {
    try {
      const { CookieConsentService } = await import('./services/CookieConsentService');
      const consent = await CookieConsentService.recordConsent(req.body);
      res.json(consent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record consent' });
    }
  });

  app.get('/api/cookies/policy/:language', async (req, res) => {
    try {
      const language = req.params.language as 'el' | 'en';
      const { CookieConsentService } = await import('./services/CookieConsentService');
      const policy = CookieConsentService.getCookiePolicy(language);
      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get cookie policy' });
    }
  });

  // RTBF (Right to be Forgotten) API routes
  app.post('/api/rtbf/request', async (req, res) => {
    try {
      const { RTBFService } = await import('./services/RTBFService');
      const request = await RTBFService.submitErasureRequest(req.body);
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit erasure request' });
    }
  });

  app.get('/api/rtbf/request/:id', async (req, res) => {
    try {
      const { RTBFService } = await import('./services/RTBFService');
      const request = RTBFService.getErasureRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: 'Erasure request not found' });
      }
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get erasure request' });
    }
  });

  // Register Hotel Tip Pooling API routes
  const { registerHotelTipPoolingRoutes } = await import("./api/hotelTipPooling");
  registerHotelTipPoolingRoutes(app);

  // Executive Dashboard API endpoints
  app.get('/api/compliance/live-status', isAuthenticated, async (req, res) => {
    try {
      // Simulate real-time compliance status
      const complianceStatus = {
        erganiSync: { status: 'compliant', employeesCovered: 45, totalEmployees: 45 },
        apdDeadline: { status: 'warning', daysRemaining: 3, dueDate: '2025-01-31' },
        fmySubmission: { status: 'critical', overdue: true, dueDate: '2025-01-15' },
        digitalCards: { status: 'compliant', coverage: 100 },
        lastUpdated: new Date().toISOString()
      };
      
      res.json(complianceStatus);
    } catch (error) {
      console.error('Error fetching compliance status:', error);
      res.status(500).json({ error: 'Failed to fetch compliance status' });
    }
  });

  app.get('/api/analytics/kpi-metrics', isAuthenticated, async (req, res) => {
    try {
      // Simulate real-time KPI metrics
      const kpiMetrics = {
        laborCost: {
          current: 142350,
          budget: 145000,
          variance: -3.2,
          currency: 'EUR'
        },
        overtimeVariance: {
          current: 12.5,
          target: 5.0,
          trend: 'increasing'
        },
        staffingForecast: {
          optimal: 92,
          target: 95,
          trend: 'stable'
        },
        complianceScore: {
          current: 94.5,
          target: 95.0,
          issues: 2
        },
        lastUpdated: new Date().toISOString()
      };
      
      res.json(kpiMetrics);
    } catch (error) {
      console.error('Error fetching KPI metrics:', error);
      res.status(500).json({ error: 'Failed to fetch KPI metrics' });
    }
  });

  app.post('/api/payroll/run-quick', isAuthenticated, async (req, res) => {
    try {
      // Simulate quick payroll run
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      res.json({
        success: true,
        payrollRunId: `PR-${Date.now()}`,
        employeesProcessed: 45,
        totalAmount: 142350.00,
        processingTime: '90 seconds',
        status: 'COMPLETED'
      });
    } catch (error) {
      console.error('Error running quick payroll:', error);
      res.status(500).json({ error: 'Failed to run payroll' });
    }
  });

  app.post('/api/overtime/approve-pending', isAuthenticated, async (req, res) => {
    try {
      // Simulate overtime approval
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      res.json({
        success: true,
        approvedRequests: 12,
        totalHours: 48.5,
        estimatedCost: 1850.00,
        status: 'APPROVED'
      });
    } catch (error) {
      console.error('Error approving overtime:', error);
      res.status(500).json({ error: 'Failed to approve overtime' });
    }
  });

  app.post('/api/compliance/file-apd', isAuthenticated, async (req, res) => {
    try {
      // Simulate APD filing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      res.json({
        success: true,
        filingId: `APD-${Date.now()}`,
        submissionDate: new Date().toISOString(),
        employeesCovered: 45,
        status: 'SUBMITTED',
        confirmationNumber: `APD${Date.now()}`
      });
    } catch (error) {
      console.error('Error filing APD:', error);
      res.status(500).json({ error: 'Failed to file APD' });
    }
  });

  // Payroll Run Wizard API endpoints
  app.post('/api/payroll-wizard/import-timesheets', isAuthenticated, async (req, res) => {
    try {
      // Simulate timesheet import with processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const timesheetData = {
        employeesProcessed: 45,
        totalHours: 1840,
        regularHours: 1680,
        overtimeHours: 160,
        exceptions: [
          {
            id: 'exc_001',
            employeeName: 'Maria Papadopoulou',
            type: 'overtime_approval',
            description: 'Overtime hours (12.5h) require manager approval before processing',
            severity: 'high',
            suggestedAction: 'Request manager approval for overtime hours worked on weekend',
            canAutoResolve: false
          },
          {
            id: 'exc_002',
            employeeName: 'Dimitris Kostas',
            type: 'missing_punch',
            description: 'Missing clock-out punch on August 15th',
            severity: 'medium',
            suggestedAction: 'Use scheduled end time (22:00) as clock-out time',
            canAutoResolve: true
          },
          {
            id: 'exc_003',
            employeeName: 'Anna Nikolaou',
            type: 'break_violation',
            description: 'Break time exceeded by 30 minutes on August 12th',
            severity: 'low',
            suggestedAction: 'Deduct excess break time from regular hours',
            canAutoResolve: true
          }
        ]
      };
      
      res.json(timesheetData);
    } catch (error) {
      console.error('Error importing timesheets:', error);
      res.status(500).json({ error: 'Failed to import timesheets' });
    }
  });

  app.post('/api/payroll-wizard/generate-preview', isAuthenticated, async (req, res) => {
    try {
      // Simulate payroll calculation with processing delay
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const payrollPreview = {
        totalGrossPay: 142350.00,
        totalNetPay: 98450.50,
        totalTaxes: 28470.00,
        totalInsurance: 15429.50,
        employeeCount: 45,
        variance: {
          grossPay: { amount: 2850.00, percentage: 2.0 },
          netPay: { amount: 1920.30, percentage: 2.0 },
          overtime: { amount: 4800.00, percentage: 12.5 }
        },
        breakdown: {
          regularPay: 118500.00,
          overtimePay: 19200.00,
          bonuses: 3200.00,
          allowances: 1450.00,
          deductions: 2150.00
        }
      };
      
      res.json(payrollPreview);
    } catch (error) {
      console.error('Error generating payroll preview:', error);
      res.status(500).json({ error: 'Failed to generate payroll preview' });
    }
  });

  app.post('/api/payroll-wizard/generate-final', isAuthenticated, async (req, res) => {
    try {
      // Simulate final payroll generation with processing delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const finalResult = {
        success: true,
        payrollRunId: `PR-AUG-${Date.now()}`,
        sepaFileGenerated: true,
        sepaFileName: `SEPA_Payroll_AUG2025_${Date.now()}.xml`,
        apdSubmitted: true,
        apdConfirmationNumber: `APD${Date.now()}`,
        fmySubmitted: true,
        fmyConfirmationNumber: `FMY${Date.now()}`,
        employeesProcessed: 45,
        totalAmountPaid: 98450.50,
        processingTime: '4 minutes 32 seconds',
        completedAt: new Date().toISOString()
      };
      
      res.json(finalResult);
    } catch (error) {
      console.error('Error generating final payroll:', error);
      res.status(500).json({ error: 'Failed to generate final payroll' });
    }
  });

  // Mobile Manager Approval endpoints
  app.get('/api/manager/pending-approvals', isAuthenticated, async (req, res) => {
    try {
      // Simulate fetching pending approvals
      const pendingApprovals = [
        {
          id: 'app_001',
          type: 'overtime',
          employeeName: 'Maria Papadopoulou',
          employeeId: 'EMP001',
          requestDate: '2025-08-15',
          details: {
            date: '2025-08-15',
            hours: 4.5,
            reason: 'Covering for sick colleague during busy weekend',
            startTime: '18:00',
            endTime: '22:30',
            description: 'Worked extra hours to cover reception desk during high occupancy weekend. Guest satisfaction critical.'
          },
          urgency: 'high',
          status: 'pending',
          submittedAt: '2025-08-16T09:30:00Z'
        },
        {
          id: 'app_002',
          type: 'leave',
          employeeName: 'Dimitris Kostas',
          employeeId: 'EMP002',
          requestDate: '2025-08-20',
          details: {
            date: '2025-08-22',
            reason: 'Medical appointment',
            description: 'Annual health checkup - pre-scheduled appointment with specialist.',
            startTime: '14:00',
            endTime: '18:00'
          },
          urgency: 'medium',
          status: 'pending',
          submittedAt: '2025-08-16T10:15:00Z'
        },
        {
          id: 'app_003',
          type: 'schedule_change',
          employeeName: 'Anna Nikolaou',
          employeeId: 'EMP003',
          requestDate: '2025-08-18',
          details: {
            date: '2025-08-19',
            reason: 'Family emergency',
            description: 'Need to swap shifts with colleague due to unexpected family situation.',
            startTime: '06:00',
            endTime: '14:00'
          },
          urgency: 'high',
          status: 'pending',
          submittedAt: '2025-08-16T11:45:00Z'
        },
        {
          id: 'app_004',
          type: 'expense',
          employeeName: 'Giorgos Alexiou',
          employeeId: 'EMP004',
          requestDate: '2025-08-14',
          details: {
            amount: 85.50,
            description: 'Taxi fare for emergency supply run to wholesale market - kitchen ran out of fresh fish during busy dinner service.',
            reason: 'Emergency supply procurement'
          },
          urgency: 'low',
          status: 'pending',
          submittedAt: '2025-08-16T08:20:00Z'
        }
      ];
      
      res.json(pendingApprovals);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
  });

  app.post('/api/manager/approvals/:approvalId', isAuthenticated, async (req, res) => {
    try {
      const { approvalId } = req.params;
      const { action, comment } = req.body;
      
      // Simulate processing approval
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const result = {
        success: true,
        approvalId,
        action,
        comment,
        processedAt: new Date().toISOString(),
        processedBy: req.user?.claims?.sub
      };
      
      res.json(result);
    } catch (error) {
      console.error('Error processing approval:', error);
      res.status(500).json({ error: 'Failed to process approval' });
    }
  });

  // Mobile Punch Events - Offline-first endpoints
  app.post("/api/punch-events", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPunchEventSchema.parse({
        ...req.body,
        userId: req.user?.claims?.sub
      });
      
      const punchEvent = await storage.createPunchEvent(validatedData);
      
      // Trigger ERGANI sync if online (non-blocking)
      if (!req.body.offlineFlag) {
        erganiConnector.syncPunchEvent(punchEvent).catch(error => {
          console.error("ERGANI sync failed:", error);
        });
      }
      
      res.json({
        success: true,
        punchEvent,
        message: "Punch event recorded successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid punch data",
          details: fromZodError(error).toString()
        });
      }
      console.error("Punch event error:", error);
      res.status(500).json({ error: "Failed to record punch event" });
    }
  });

  // Check if punch event exists (for conflict resolution)
  app.post("/api/punch-events/check", isAuthenticated, async (req, res) => {
    try {
      const { employeeId, timestamp, type, clientEventId } = req.body;
      const existingEvent = await storage.findPunchEventByClientId(clientEventId);
      
      if (existingEvent) {
        res.json({ exists: true, event: existingEvent });
      } else {
        // Check for similar events by timestamp and type
        const similarEvents = await storage.findSimilarPunchEvents(
          employeeId, 
          timestamp, 
          type, 
          300 // 5 minute window
        );
        
        res.json({ 
          exists: similarEvents.length > 0, 
          event: similarEvents[0] || null,
          conflicts: similarEvents
        });
      }
    } catch (error) {
      console.error("Punch event check error:", error);
      res.status(500).json({ error: "Failed to check punch event" });
    }
  });

  // Get employee punch status
  app.get("/api/employees/:employeeId/punch-status", isAuthenticated, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const lastPunch = await storage.getLastPunchEvent(employeeId);
      
      const status = {
        lastPunch: lastPunch ? {
          type: lastPunch.type,
          timestamp: lastPunch.timestamp,
          location: lastPunch.latitude && lastPunch.longitude ? 
            `${lastPunch.latitude}, ${lastPunch.longitude}` : null
        } : null,
        isOnBreak: lastPunch?.type === 'break_in',
        canPunchOut: lastPunch?.type === 'in' || lastPunch?.type === 'break_out'
      };
      
      res.json(status);
    } catch (error) {
      console.error("Punch status error:", error);
      res.status(500).json({ error: "Failed to get punch status" });
    }
  });

  // Payroll Preview - Offline-capable endpoint
  app.get("/api/payroll/preview/:payPeriod", isAuthenticated, async (req, res) => {
    try {
      const { payPeriod } = req.params;
      const propertyId = req.query.propertyId as string;
      
      // Get employees for the property
      const employees = await storage.getEmployeesByProperty(propertyId);
      
      // Calculate payroll preview
      const employeeData = [];
      let totalGrossPay = 0;
      let totalNetPay = 0;
      let totalDeductions = 0;
      
      for (const employee of employees) {
        // Get timesheet data for the pay period
        const timesheets = await storage.getTimesheetsByEmployeeAndPeriod(
          employee.employeeId, 
          payPeriod
        );
        
        // Calculate basic payroll data
        const regularHours = timesheets.reduce((sum, ts) => sum + (parseFloat(ts.regularHours) || 0), 0);
        const overtimeHours = timesheets.reduce((sum, ts) => sum + 0, 0); // overtimeHours doesn't exist in schema
        const grossPay = (regularHours * 25) + (overtimeHours * 25 * 1.5); // Use default hourly rate
        const deductions = grossPay * 0.35; // Simplified calculation
        const netPay = grossPay - deductions;
        
        employeeData.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          regularHours,
          overtimeHours,
          grossPay,
          netPay,
          deductions: {
            tax: deductions * 0.6,
            socialSecurity: deductions * 0.35,
            other: deductions * 0.05
          },
          bonuses: 0,
          allowances: 0
        });
        
        totalGrossPay += grossPay;
        totalNetPay += netPay;
        totalDeductions += deductions;
      }
      
      res.json({
        totalEmployees: employees.length,
        totalGrossPay,
        totalNetPay,
        totalDeductions,
        payPeriod,
        calculationDate: new Date().toISOString(),
        isComplete: true,
        employees: employeeData
      });
    } catch (error) {
      console.error("Payroll preview error:", error);
      res.status(500).json({ error: "Failed to generate payroll preview" });
    }
  });

  // AI Engine Routes - Overtime Prevention
  app.get("/api/ai/overtime-analysis/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { weekStarting } = req.query;
      
      if (!weekStarting) {
        return res.status(400).json({ error: "weekStarting parameter is required" });
      }
      
      const analysis = await overtimePreventionEngine.analyzeOvertimeRisks(
        propertyId,
        weekStarting as string
      );
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing overtime risks:", error);
      res.status(500).json({ error: "Failed to analyze overtime risks" });
    }
  });

  app.get("/api/ai/overtime-recommendations/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { weekStarting, maxRecommendations } = req.query;
      
      if (!weekStarting) {
        return res.status(400).json({ error: "weekStarting parameter is required" });
      }
      
      const recommendations = await overtimePreventionEngine.generateOptimizationRecommendations(
        propertyId,
        weekStarting as string,
        maxRecommendations ? parseInt(maxRecommendations as string) : undefined
      );
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating overtime recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  app.post("/api/ai/apply-overtime-recommendation", isAuthenticated, async (req, res) => {
    try {
      const { recommendationId, notes } = req.body;
      const userId = req.user?.claims?.sub;
      
      if (!recommendationId) {
        return res.status(400).json({ error: "recommendationId is required" });
      }
      
      const result = await overtimePreventionEngine.applyRecommendation(
        recommendationId,
        userId,
        notes
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error applying overtime recommendation:", error);
      res.status(500).json({ error: "Failed to apply recommendation" });
    }
  });

  // AI Engine Routes - Exception Auto-Resolution
  app.get("/api/ai/exception-analysis/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: "date parameter is required" });
      }
      
      const analysis = await exceptionAutoResolutionEngine.analyzeDailyExceptions(
        propertyId,
        date as string
      );
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing exceptions:", error);
      res.status(500).json({ error: "Failed to analyze exceptions" });
    }
  });

  app.post("/api/ai/process-exceptions/:propertyId", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { date } = req.body;
      
      if (!date) {
        return res.status(400).json({ error: "date is required" });
      }
      
      const result = await exceptionAutoResolutionEngine.processResolutionActions(
        propertyId,
        date
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error processing exception resolutions:", error);
      res.status(500).json({ error: "Failed to process exception resolutions" });
    }
  });

  // Register self-service routes
  registerSelfServiceRoutes(app);
  registerPropertiesRoutes(app);
  registerUserProfileRoutes(app);
  registerAICopilotRoutes(app);
  registerLaborNewsfeedRoutes(app);
  registerInstantPaymentRoutes(app);
  registerPayEquityRoutes(app);
  registerCsrdRoutes(app);
  registerExplanationRoutes(app);
  
  // IRIS/SCT Instant Re-issue System - BDD compliant
  instantReissueRoutes(app);
  embeddedPayrollRoutes(app);
  
  // Generic GL API (works with any ERP)
  glGenericRoutes(app);
  
  // Native Connectors (Xero, QuickBooks Online)
  nativeConnectorRoutes(app);
  
  // Guided Setup Wizard
  guidedSetupRoutes(app);
  
  // Reconciliation & Rounding
  reconciliationRoutes(app);
  
  // Edge Cases & Business Rules
  edgeCaseRoutes(app);
  
  // Acceptance Criteria & Performance Testing
  acceptanceCriteriaRoutes(app);
  
  // Payments Operations Cockpit
  paymentsOpsRoutes(app);
  
  // Payment Batch Data Flow
  paymentBatchRoutes(app);
  
  // Canonical Payments API
  canonicalPaymentsRoutes(app);
  
  // Payment State Machine
  paymentStateMachineRoutes(app);
  
  // Reconciliation Engine
  reconciliationEngineRoutes(app);
  
  // Cut-Off Logic & Recommendations
  cutOffLogicRoutes(app);
  
  // Re-Issue Algorithm
  reissueAlgorithmRoutes(app);
  
  // IBAN Validation & Banking
  registerIbanValidationRoutes(app);

  // Instant Re-issue (IRIS/SCT Instant)

  // Register notification routes
  try {
    const { registerNotificationRoutes } = await import("./api/notifications");
    registerNotificationRoutes(app);
  } catch (error) {
    console.warn("Notification routes not available:", error);
  }

  // Smart Notifications and Approval endpoints
  app.post('/api/approvals/:approvalId/approve', isAuthenticated, async (req, res) => {
    try {
      const { approvalId } = req.params;
      const userId = req.user?.claims?.sub;
      const { reason } = req.body;

      const { smartNotifications } = await import('./smartNotificationsService');
      const result = await smartNotifications.handleApprovalResponse(
        approvalId, 
        'approve', 
        userId, 
        reason
      );

      res.json({ 
        success: true, 
        message: 'Approval processed successfully',
        context: result 
      });
    } catch (error) {
      console.error('Error processing approval:', error);
      res.status(500).json({ error: 'Failed to process approval' });
    }
  });

  app.post('/api/approvals/:approvalId/reject', isAuthenticated, async (req, res) => {
    try {
      const { approvalId } = req.params;
      const userId = req.user?.claims?.sub;
      const { reason } = req.body;

      const { smartNotifications } = await import('./smartNotificationsService');
      const result = await smartNotifications.handleApprovalResponse(
        approvalId, 
        'reject', 
        userId, 
        reason
      );

      res.json({ 
        success: true, 
        message: 'Rejection processed successfully',
        context: result 
      });
    } catch (error) {
      console.error('Error processing rejection:', error);
      res.status(500).json({ error: 'Failed to process rejection' });
    }
  });

  // Demo endpoints for testing smart notifications
  app.post('/api/demo/send-failure-alert', isAuthenticated, async (req, res) => {
    try {
      const { smartNotifications } = await import('./smartNotificationsService');
      
      await smartNotifications.sendFailureAlert({
        system: 'ERGANI',
        errorCode: 'ERG-4001',
        errorMessage: 'Connection timeout while submitting employee punches',
        affectedEmployees: ['emp-001', 'emp-002', 'emp-003'],
        propertyId: 'property-demo-01',
        managerId: req.user?.claims?.sub || 'manager-demo',
        retryAttempt: 2,
        maxRetries: 3
      });

      res.json({ success: true, message: 'Failure alert sent to Slack and Teams' });
    } catch (error) {
      console.error('Error sending failure alert:', error);
      res.status(500).json({ error: 'Failed to send failure alert' });
    }
  });

  app.post('/api/demo/send-approval-request', isAuthenticated, async (req, res) => {
    try {
      const { smartNotifications } = await import('./smartNotificationsService');
      const approvalId = `approval-${Date.now()}`;
      
      await smartNotifications.sendApprovalRequest({
        type: 'approval_required',
        approvalId,
        title: 'Overtime Request Approval',
        description: 'Maria Papadopoulos is requesting approval for 4.5 hours of overtime on Saturday night shift',
        urgency: 'medium',
        propertyId: 'property-demo-01',
        employeeId: 'emp-001',
        managerId: req.user?.claims?.sub || 'manager-demo',
        amount: 67.50,
        currency: 'EUR',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        metadata: {
          shiftDate: '2025-01-18',
          department: 'Housekeeping',
          hourlyRate: 15.00,
          overtimeHours: 4.5
        }
      });

      res.json({ success: true, message: 'Approval request sent', approvalId });
    } catch (error) {
      console.error('Error sending approval request:', error);
      res.status(500).json({ error: 'Failed to send approval request' });
    }
  });

  app.post('/api/demo/send-payroll-ready', isAuthenticated, async (req, res) => {
    try {
      const { smartNotifications } = await import('./smartNotificationsService');
      
      await smartNotifications.sendPayrollReadyNotification({
        propertyId: 'property-demo-01',
        managerId: req.user?.claims?.sub || 'manager-demo',
        periodEnd: new Date('2025-01-31'),
        employeeCount: 47,
        totalGrossPay: 125840.50,
        totalNetPay: 89330.25,
        currency: 'EUR',
        complianceIssues: 2,
        pendingApprovals: 1
      });

      res.json({ success: true, message: 'Payroll ready notification sent' });
    } catch (error) {
      console.error('Error sending payroll notification:', error);
      res.status(500).json({ error: 'Failed to send payroll notification' });
    }
  });

  // Visual Analytics API endpoints
  app.get('/api/analytics/overtime-heatmap', isAuthenticated, async (req, res) => {
    try {
      const { visualAnalyticsService } = await import('./visualAnalyticsService');
      const { propertyId, startDate, endDate, departmentId, employeeId } = req.query;

      if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required' });
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const data = await visualAnalyticsService.getOvertimeHeatmap(
        propertyId as string,
        start,
        end,
        departmentId as string,
        employeeId as string
      );

      res.json(data);
    } catch (error) {
      console.error('Error fetching overtime heatmap:', error);
      res.status(500).json({ error: 'Failed to fetch overtime heatmap' });
    }
  });

  app.get('/api/analytics/labor-occupancy', isAuthenticated, async (req, res) => {
    try {
      const { visualAnalyticsService } = await import('./visualAnalyticsService');
      const { propertyId, startDate, endDate } = req.query;

      if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required' });
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const data = await visualAnalyticsService.getLaborOccupancyAnalysis(
        propertyId as string,
        start,
        end
      );

      res.json(data);
    } catch (error) {
      console.error('Error fetching labor occupancy analysis:', error);
      res.status(500).json({ error: 'Failed to fetch labor occupancy analysis' });
    }
  });

  app.get('/api/analytics/kpis', isAuthenticated, async (req, res) => {
    try {
      const { visualAnalyticsService } = await import('./visualAnalyticsService');
      const { propertyId, startDate, endDate } = req.query;

      if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required' });
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const data = await visualAnalyticsService.getAnalyticsKPIs(
        propertyId as string,
        start,
        end
      );

      res.json(data);
    } catch (error) {
      console.error('Error fetching analytics KPIs:', error);
      res.status(500).json({ error: 'Failed to fetch analytics KPIs' });
    }
  });

  app.get('/api/analytics/drill-down', isAuthenticated, async (req, res) => {
    try {
      const { visualAnalyticsService } = await import('./visualAnalyticsService');
      const { propertyId, level, entityId, startDate, endDate } = req.query;

      if (!propertyId || !level || !entityId) {
        return res.status(400).json({ error: 'Property ID, level, and entity ID are required' });
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const data = await visualAnalyticsService.getDrillDownData(
        propertyId as string,
        level as 'property' | 'department' | 'employee',
        entityId as string,
        start,
        end
      );

      res.json(data);
    } catch (error) {
      console.error('Error fetching drill-down data:', error);
      res.status(500).json({ error: 'Failed to fetch drill-down data' });
    }
  });

  app.get('/api/analytics/export/:type', isAuthenticated, async (req, res) => {
    try {
      const { visualAnalyticsService } = await import('./visualAnalyticsService');
      const { type } = req.params;
      const { propertyId, startDate, endDate } = req.query;

      if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required' });
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const csvData = await visualAnalyticsService.exportToCSV(
        type as 'overtime' | 'labor' | 'kpis',
        propertyId as string,
        start,
        end
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics_${propertyId}_${start.toISOString().split('T')[0]}.csv"`);
      res.send(csvData);
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      res.status(500).json({ error: 'Failed to export analytics data' });
    }
  });

  // Data Contract API Routes

  // Timesheets API - normalized hours by earnings code
  app.get('/api/timesheets/:period', isAuthenticated, async (req, res) => {
    const { timesheetRoutes } = await import('./api/timesheets');
    return timesheetRoutes.getTimesheetsByPeriod(req, res);
  });

  app.get('/api/timesheets/:period/summary', isAuthenticated, async (req, res) => {
    const { timesheetRoutes } = await import('./api/timesheets');
    return timesheetRoutes.getTimesheetSummary(req, res);
  });

  // Rulesets API - OT/night/Sunday/min-wage with effective dates
  app.get('/api/rulesets/current', isAuthenticated, async (req, res) => {
    const { rulesetRoutes } = await import('./api/rulesets');
    return rulesetRoutes.getCurrentRuleset(req, res);
  });

  app.get('/api/rulesets/effective/:date', isAuthenticated, async (req, res) => {
    const { rulesetRoutes } = await import('./api/rulesets');
    return rulesetRoutes.getRulesetByDate(req, res);
  });

  app.get('/api/rulesets/history', isAuthenticated, async (req, res) => {
    const { rulesetRoutes } = await import('./api/rulesets');
    return rulesetRoutes.getRulesetHistory(req, res);
  });

  // Payslips API - line items, deltas vs prior period
  app.get('/api/payslips/:employee/:period', isAuthenticated, async (req, res) => {
    const { payslipRoutes } = await import('./api/payslips');
    return payslipRoutes.getPayslip(req, res);
  });

  app.get('/api/payslips/:employee/history', isAuthenticated, async (req, res) => {
    const { payslipRoutes } = await import('./api/payslips');
    return payslipRoutes.getPayslipHistory(req, res);
  });

  app.get('/api/payslips/bulk/:period', isAuthenticated, async (req, res) => {
    const { payslipRoutes } = await import('./api/payslips');
    return payslipRoutes.getBulkPayslips(req, res);
  });

  // Policies API - JSON policies and role matrix
  app.get('/api/policies/current', isAuthenticated, async (req, res) => {
    const { policyRoutes } = await import('./api/policies');
    return policyRoutes.getCurrentPolicies(req, res);
  });

  app.get('/api/policies/role-matrix', isAuthenticated, async (req, res) => {
    const { policyRoutes } = await import('./api/policies');
    return policyRoutes.getRoleMatrix(req, res);
  });

  app.post('/api/policies/validate', isAuthenticated, async (req, res) => {
    const { policyRoutes } = await import('./api/policies');
    return policyRoutes.validatePolicy(req, res);
  });

  // Evaluation API - accuracy benchmarks and UX metrics
  app.get('/api/evaluation/current', isAuthenticated, async (req, res) => {
    const { evaluationRoutes } = await import('./api/evaluation');
    return evaluationRoutes.getCurrentEvaluationMetrics(req, res);
  });

  app.get('/api/evaluation/benchmarks', isAuthenticated, async (req, res) => {
    const { evaluationRoutes } = await import('./api/evaluation');
    return evaluationRoutes.getSystemBenchmarks(req, res);
  });

  app.post('/api/evaluation/test-case', isAuthenticated, async (req, res) => {
    const { evaluationRoutes } = await import('./api/evaluation');
    return evaluationRoutes.submitTestCase(req, res);
  });

  // GRC (Governance, Risk & Compliance) Mock API Routes
  const { registerMockGRCRoutes } = await import('./api/mockGRC');
  registerMockGRCRoutes(app);

  // One-Click Flow (Disaster Mode) API Routes
  app.post('/api/one-click-flow/freeze', isAuthenticated, oneClickFlowRoutes.freezeRunAndGenerateKit);
  app.get('/api/one-click-flow/status/:runId', isAuthenticated, oneClickFlowRoutes.getDisasterModeStatus);
  app.get('/api/one-click-flow/download/:freezeId', isAuthenticated, oneClickFlowRoutes.downloadOfflineKit);
  app.post('/api/one-click-flow/reconcile/:freezeId', isAuthenticated, oneClickFlowRoutes.uploadReconciliation);
  app.get('/api/one-click-flow/pre-checks/:runId', isAuthenticated, oneClickFlowRoutes.performPreChecks);

  // PWA notification subscription endpoint
  app.post('/api/notifications/subscribe', (req, res) => {
    const { subscription, topics } = req.body;
    console.log('PWA: Subscription received for topics:', topics);
    
    // In a real app, store subscription in database
    res.json({
      success: true,
      message: 'Successfully subscribed to Greek payroll notifications'
    });
  });

  // Register billing routes
  registerBillingRoutes(app);

  // API aliases for frontend contract compatibility
  app.get('/api/me', (req, res) => {
    res.json({
      authenticated: !!req.isAuthenticated?.() && !!req.user,
      user: req.user ?? null
    });
  });

  app.post('/api/auth/logout', (req, res, next) => {
    req.logout?.(e => e ? next(e) : req.session?.destroy?.(() => res.status(204).end()));
  });

  // Server fallback for dashboard route - redirect to root for SPA handling
  app.get('/dashboard', (_req, res) => {
    res.redirect('/#/dashboard');
  });

  const httpServer = createServer(app);
  return httpServer;
}
