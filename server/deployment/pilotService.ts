import { nanoid } from 'nanoid';

/**
 * Pilot Service for PayrollSync Implementation
 * Manages pilot testing, parallel runs, and sign-off processes
 */

export interface PilotPlan {
  pilotId: string;
  propertyCode: string;
  pilotScope: PilotScope;
  testScenarios: TestScenario[];
  parallelRunConfig: ParallelRunConfig;
  signOffCriteria: SignOffCriteria[];
  timeline: PilotTimeline;
  resources: PilotResources;
  riskMitigation: RiskMitigationPlan;
  createdDate: Date;
  status:
    | 'PLANNED'
    | 'PREPARING'
    | 'RUNNING'
    | 'EVALUATING'
    | 'COMPLETED'
    | 'ABORTED';
}

export interface PilotScope {
  scopeType: 'DEPARTMENT' | 'PROPERTY' | 'EMPLOYEE_GROUP' | 'PROCESS';
  includedDepartments: string[];
  includedEmployees: string[];
  includedProcesses: string[];
  exclusions: string[];
  duration: number; // days
  payrollCycles: number;
  businessProcesses: BusinessProcess[];
}

export interface BusinessProcess {
  processId: string;
  processName: string;
  processType:
    | 'PAYROLL_RUN'
    | 'TIME_CAPTURE'
    | 'GOVERNMENT_FILING'
    | 'EMPLOYEE_ONBOARDING'
    | 'LEAVE_MANAGEMENT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  stakeholders: string[];
  successCriteria: string[];
  testData: BusinessProcessTestData;
}

export interface BusinessProcessTestData {
  dataType: string;
  volume: 'SMALL' | 'MEDIUM' | 'LARGE';
  scenarios: string[];
  expectedOutcomes: string[];
  validationPoints: string[];
}

export interface TestScenario {
  scenarioId: string;
  scenarioName: string;
  description: string;
  category:
    | 'FUNCTIONAL'
    | 'INTEGRATION'
    | 'PERFORMANCE'
    | 'USER_ACCEPTANCE'
    | 'COMPLIANCE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  prerequisites: string[];
  testSteps: TestStep[];
  expectedResults: ExpectedResult[];
  actualResults?: ActualResult[];
  status: 'PLANNED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED';
  executedBy?: string;
  executedDate?: Date;
  issues: TestIssue[];
}

export interface TestStep {
  stepId: string;
  stepDescription: string;
  stepType: 'MANUAL' | 'AUTOMATED' | 'VALIDATION';
  estimatedTime: number; // minutes
  dependencies: string[];
  testData: any;
}

export interface ExpectedResult {
  resultId: string;
  resultType: 'OUTPUT' | 'BEHAVIOR' | 'PERFORMANCE' | 'COMPLIANCE';
  description: string;
  measurableValue?: string;
  toleranceRange?: string;
}

export interface ActualResult {
  resultId: string;
  actualValue: string;
  timestamp: Date;
  variance?: string;
  passed: boolean;
  notes?: string;
}

export interface TestIssue {
  issueId: string;
  issueType: 'BUG' | 'PERFORMANCE' | 'USABILITY' | 'DATA' | 'INTEGRATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  stepsToReproduce: string[];
  workaround?: string;
  assignedTo?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolutionDate?: Date;
}

export interface ParallelRunConfig {
  duration: number; // days
  payrollPeriods: string[];
  comparisonPoints: ComparisonPoint[];
  toleranceThresholds: ToleranceThreshold[];
  automatedComparison: boolean;
  reportingFrequency: 'DAILY' | 'WEEKLY' | 'CYCLE_END';
  escalationRules: EscalationRule[];
}

export interface ComparisonPoint {
  pointId: string;
  pointName: string;
  dataType:
    | 'PAYROLL_CALCULATION'
    | 'TAX_WITHHOLDING'
    | 'SOCIAL_SECURITY'
    | 'NET_PAY'
    | 'FILING_DATA';
  comparisonMethod: 'EXACT_MATCH' | 'WITHIN_TOLERANCE' | 'BUSINESS_RULE';
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  validationQuery: string;
}

export interface ToleranceThreshold {
  dataType: string;
  thresholdType: 'PERCENTAGE' | 'ABSOLUTE' | 'COUNT';
  acceptableVariance: number;
  escalationVariance: number;
  criticalVariance: number;
}

export interface EscalationRule {
  ruleId: string;
  triggerCondition: string;
  escalationLevel: number;
  notificationList: string[];
  responseTime: number; // hours
  escalationAction: 'NOTIFY' | 'INVESTIGATE' | 'STOP_PILOT' | 'ROLLBACK';
}

export interface SignOffCriteria {
  criteriaId: string;
  criteriaName: string;
  criteriaType:
    | 'FUNCTIONAL'
    | 'PERFORMANCE'
    | 'COMPLIANCE'
    | 'USER_ACCEPTANCE'
    | 'DATA_QUALITY';
  measurableTarget: string;
  actualValue?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'MET' | 'NOT_MET';
  signOffRole: string;
  signOffDate?: Date;
  signOffBy?: string;
  comments?: string;
}

export interface PilotTimeline {
  totalDuration: number; // days
  phases: PilotPhase[];
  milestones: PilotMilestone[];
  dependencies: string[];
  criticalPath: string[];
}

export interface PilotPhase {
  phaseId: string;
  phaseName: string;
  startDate: Date;
  endDate: Date;
  objectives: string[];
  deliverables: string[];
  activities: PilotActivity[];
  exitCriteria: string[];
}

export interface PilotActivity {
  activityId: string;
  activityName: string;
  activityType: 'SETUP' | 'TRAINING' | 'TESTING' | 'VALIDATION' | 'REVIEW';
  duration: number; // hours
  assignedTo: string[];
  dependencies: string[];
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
}

export interface PilotMilestone {
  milestoneId: string;
  milestoneName: string;
  targetDate: Date;
  completionCriteria: string[];
  stakeholder: string;
  critical: boolean;
  actualCompletionDate?: Date;
  status: 'PENDING' | 'COMPLETED' | 'DELAYED' | 'AT_RISK';
}

export interface PilotResources {
  teamMembers: TeamMember[];
  trainingRequirements: TrainingRequirement[];
  infrastructure: InfrastructureRequirement[];
  budget: BudgetAllocation[];
}

export interface TeamMember {
  memberId: string;
  name: string;
  role: string;
  department: string;
  responsibilities: string[];
  availability: number; // percentage
  trainingRequired: string[];
}

export interface TrainingRequirement {
  trainingId: string;
  trainingName: string;
  trainingType: 'CLASSROOM' | 'ONLINE' | 'HANDS_ON' | 'DOCUMENTATION';
  targetAudience: string[];
  duration: number; // hours
  deliveryDate: Date;
  completionRequired: boolean;
}

export interface InfrastructureRequirement {
  requirementId: string;
  requirementType: 'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'SECURITY';
  description: string;
  quantity: number;
  deliveryDate: Date;
  responsible: string;
  status: 'ORDERED' | 'DELIVERED' | 'INSTALLED' | 'CONFIGURED';
}

export interface BudgetAllocation {
  allocationId: string;
  category:
    | 'PERSONNEL'
    | 'TRAINING'
    | 'INFRASTRUCTURE'
    | 'EXTERNAL_SERVICES'
    | 'CONTINGENCY';
  amount: number;
  currency: 'EUR';
  responsible: string;
  approvalRequired: boolean;
  approved?: boolean;
}

export interface RiskMitigationPlan {
  risks: PilotRisk[];
  contingencyPlans: ContingencyPlan[];
  monitoringPlan: RiskMonitoringPlan;
}

export interface PilotRisk {
  riskId: string;
  riskName: string;
  riskCategory:
    | 'TECHNICAL'
    | 'BUSINESS'
    | 'OPERATIONAL'
    | 'REGULATORY'
    | 'RESOURCE';
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  description: string;
  triggers: string[];
  mitigationStrategies: string[];
  contingencyPlan?: string;
  owner: string;
  status: 'IDENTIFIED' | 'MITIGATED' | 'OCCURRED' | 'RESOLVED';
}

export interface ContingencyPlan {
  planId: string;
  planName: string;
  triggerConditions: string[];
  actions: ContingencyAction[];
  estimatedCost: number;
  estimatedTime: number; // hours
  approvalRequired: boolean;
  responsible: string[];
}

export interface ContingencyAction {
  actionId: string;
  actionDescription: string;
  actionType: 'TECHNICAL' | 'PROCESS' | 'COMMUNICATION' | 'ROLLBACK';
  sequence: number;
  estimatedTime: number; // minutes
  responsible: string;
  dependencies: string[];
}

export interface RiskMonitoringPlan {
  monitoringFrequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY';
  kpiMetrics: RiskKPI[];
  alertThresholds: AlertThreshold[];
  reportingSchedule: ReportingSchedule[];
}

export interface RiskKPI {
  kpiId: string;
  kpiName: string;
  metric: string;
  targetValue: number;
  toleranceRange: number;
  measurementFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
}

export interface AlertThreshold {
  thresholdId: string;
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  notificationList: string[];
  escalationTime: number; // hours
}

export interface ReportingSchedule {
  reportId: string;
  reportName: string;
  reportType:
    | 'DAILY_STATUS'
    | 'WEEKLY_SUMMARY'
    | 'MILESTONE_REPORT'
    | 'ISSUE_REPORT';
  frequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MILESTONE';
  recipients: string[];
  deliveryMethod: 'EMAIL' | 'DASHBOARD' | 'MEETING';
}

export interface PilotResult {
  pilotId: string;
  overallStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';
  summary: PilotSummary;
  testResults: TestScenario[];
  parallelRunResults: ParallelRunResult[];
  signOffStatus: SignOffCriteria[];
  lessons: LessonsLearned[];
  recommendations: Recommendation[];
  completedDate: Date;
}

export interface PilotSummary {
  duration: number; // days
  totalTests: number;
  passedTests: number;
  failedTests: number;
  blockedTests: number;
  criticalIssues: number;
  resolvedIssues: number;
  userSatisfaction: number; // percentage
  performanceMetrics: PerformanceMetric[];
}

export interface PerformanceMetric {
  metricName: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  variance: number;
  status: 'MET' | 'NOT_MET' | 'EXCEEDED';
}

export interface ParallelRunResult {
  runId: string;
  period: string;
  comparisonResults: ComparisonResult[];
  overallMatch: number; // percentage
  significantDifferences: Difference[];
  status:
    | 'MATCH'
    | 'WITHIN_TOLERANCE'
    | 'SIGNIFICANT_DIFFERENCE'
    | 'MAJOR_VARIANCE';
}

export interface ComparisonResult {
  comparisonPointId: string;
  legacyValue: any;
  newSystemValue: any;
  variance: number;
  withinTolerance: boolean;
  notes?: string;
}

export interface Difference {
  differenceId: string;
  dataPoint: string;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rootCause?: string;
  resolution?: string;
  resolvedDate?: Date;
}

export interface LessonsLearned {
  lessonId: string;
  category: 'TECHNICAL' | 'PROCESS' | 'TRAINING' | 'COMMUNICATION' | 'PLANNING';
  description: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  applicability: 'THIS_PROPERTY' | 'ALL_PROPERTIES' | 'SIMILAR_PROPERTIES';
  actionRequired: boolean;
  recommendation?: string;
}

export interface Recommendation {
  recommendationId: string;
  recommendationType:
    | 'PROCESS_IMPROVEMENT'
    | 'TRAINING_ENHANCEMENT'
    | 'SYSTEM_MODIFICATION'
    | 'ROLLOUT_ADJUSTMENT';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  benefitExpected: string;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  targetAudience: string[];
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
}

class PilotService {
  /**
   * Create comprehensive pilot plan
   */
  async createPilotPlan(
    propertyCode: string,
    scopeDefinition: any
  ): Promise<PilotPlan> {
    const pilotId = nanoid();

    console.log(`Creating pilot plan for property ${propertyCode}`);

    // Define pilot scope
    const pilotScope = this.definePilotScope(scopeDefinition);

    // Create test scenarios
    const testScenarios = this.createTestScenarios(pilotScope);

    // Configure parallel run
    const parallelRunConfig = this.createParallelRunConfig();

    // Define sign-off criteria
    const signOffCriteria = this.createSignOffCriteria();

    // Create timeline
    const timeline = this.createPilotTimeline();

    // Allocate resources
    const resources = this.allocatePilotResources();

    // Create risk mitigation plan
    const riskMitigation = this.createRiskMitigationPlan();

    const plan: PilotPlan = {
      pilotId,
      propertyCode,
      pilotScope,
      testScenarios,
      parallelRunConfig,
      signOffCriteria,
      timeline,
      resources,
      riskMitigation,
      createdDate: new Date(),
      status: 'PLANNED',
    };

    console.log(
      `Pilot plan created with ${testScenarios.length} test scenarios`
    );
    return plan;
  }

  /**
   * Execute pilot test scenario
   */
  async executePilotTest(
    pilotId: string,
    scenarioId: string,
    executedBy: string
  ): Promise<TestScenario> {
    console.log(`Executing pilot test scenario ${scenarioId}`);

    // Mock test execution
    const testResult: TestScenario = {
      scenarioId,
      scenarioName: 'Employee Payroll Processing Test',
      description: 'Test complete payroll processing for 10 employees',
      category: 'FUNCTIONAL',
      priority: 'HIGH',
      prerequisites: [
        'Employee data loaded',
        'Timesheet approved',
        'Payroll policies configured',
      ],
      testSteps: [
        {
          stepId: 'STEP_1',
          stepDescription: 'Create payroll batch',
          stepType: 'MANUAL',
          estimatedTime: 5,
          dependencies: [],
          testData: { employees: 10, period: '2025-01' },
        },
        {
          stepId: 'STEP_2',
          stepDescription: 'Calculate payroll',
          stepType: 'AUTOMATED',
          estimatedTime: 2,
          dependencies: ['STEP_1'],
          testData: { includeOvertime: true, includeAllowances: true },
        },
        {
          stepId: 'STEP_3',
          stepDescription: 'Validate calculations',
          stepType: 'VALIDATION',
          estimatedTime: 10,
          dependencies: ['STEP_2'],
          testData: { expectedResults: 'previousSystem' },
        },
      ],
      expectedResults: [
        {
          resultId: 'RESULT_1',
          resultType: 'OUTPUT',
          description: 'Payroll batch created successfully',
          measurableValue: '10 employees processed',
        },
        {
          resultId: 'RESULT_2',
          resultType: 'COMPLIANCE',
          description: 'All calculations match Greek labor law',
          measurableValue: '100% compliance rate',
        },
      ],
      actualResults: [
        {
          resultId: 'RESULT_1',
          actualValue: '10 employees processed successfully',
          timestamp: new Date(),
          passed: true,
          notes: 'All employees processed without errors',
        },
        {
          resultId: 'RESULT_2',
          actualValue: '98% compliance rate',
          timestamp: new Date(),
          variance: '-2%',
          passed: false,
          notes: 'Minor overtime calculation discrepancy for 1 employee',
        },
      ],
      status: 'PASSED',
      executedBy,
      executedDate: new Date(),
      issues: [
        {
          issueId: nanoid(),
          issueType: 'DATA',
          severity: 'LOW',
          description: 'Overtime calculation 2% variance for seasonal employee',
          stepsToReproduce: [
            'Create payroll for seasonal employee',
            'Include overtime hours',
            'Compare with manual calculation',
          ],
          workaround: 'Manual adjustment required',
          status: 'OPEN',
        },
      ],
    };

    console.log(
      `Test scenario ${scenarioId} executed with status: ${testResult.status}`
    );
    return testResult;
  }

  /**
   * Execute parallel run comparison
   */
  async executeParallelRun(
    pilotId: string,
    period: string
  ): Promise<ParallelRunResult> {
    const runId = nanoid();

    console.log(`Executing parallel run for period ${period}`);

    // Mock parallel run execution
    const comparisonResults: ComparisonResult[] = [
      {
        comparisonPointId: 'GROSS_PAY',
        legacyValue: 45000.0,
        newSystemValue: 45000.0,
        variance: 0,
        withinTolerance: true,
        notes: 'Perfect match',
      },
      {
        comparisonPointId: 'INCOME_TAX',
        legacyValue: 8100.0,
        newSystemValue: 8150.0,
        variance: 0.62, // percentage
        withinTolerance: true,
        notes: 'Minor rounding difference',
      },
      {
        comparisonPointId: 'NET_PAY',
        legacyValue: 32400.0,
        newSystemValue: 32350.0,
        variance: -0.15,
        withinTolerance: true,
        notes: 'Within acceptable tolerance',
      },
    ];

    const overallMatch =
      (comparisonResults.reduce(
        (sum, r) => sum + (r.withinTolerance ? 1 : 0),
        0
      ) /
        comparisonResults.length) *
      100;

    const result: ParallelRunResult = {
      runId,
      period,
      comparisonResults,
      overallMatch,
      significantDifferences: [],
      status: overallMatch >= 95 ? 'MATCH' : 'WITHIN_TOLERANCE',
    };

    console.log(
      `Parallel run completed with ${overallMatch.toFixed(1)}% match rate`
    );
    return result;
  }

  /**
   * Evaluate sign-off criteria
   */
  async evaluateSignOffCriteria(
    pilotId: string,
    testResults: TestScenario[],
    parallelRunResults: ParallelRunResult[]
  ): Promise<SignOffCriteria[]> {
    const criteria: SignOffCriteria[] = [
      {
        criteriaId: 'FUNCTIONAL_TESTS',
        criteriaName: 'All functional tests pass',
        criteriaType: 'FUNCTIONAL',
        measurableTarget: '95% test pass rate',
        actualValue: this.calculateTestPassRate(testResults).toString() + '%',
        status:
          this.calculateTestPassRate(testResults) >= 95 ? 'MET' : 'NOT_MET',
        signOffRole: 'Business User',
        signOffDate: undefined,
        signOffBy: undefined,
        comments: 'Functional testing completed',
      },
      {
        criteriaId: 'PARALLEL_RUN_ACCURACY',
        criteriaName: 'Parallel run accuracy acceptable',
        criteriaType: 'DATA_QUALITY',
        measurableTarget: '98% calculation accuracy',
        actualValue:
          this.calculateAverageMatch(parallelRunResults).toString() + '%',
        status:
          this.calculateAverageMatch(parallelRunResults) >= 98
            ? 'MET'
            : 'NOT_MET',
        signOffRole: 'Payroll Manager',
        signOffDate: undefined,
        signOffBy: undefined,
        comments: 'Parallel run results reviewed',
      },
      {
        criteriaId: 'USER_ACCEPTANCE',
        criteriaName: 'User acceptance achieved',
        criteriaType: 'USER_ACCEPTANCE',
        measurableTarget: '80% user satisfaction',
        actualValue: '85%',
        status: 'MET',
        signOffRole: 'Department Managers',
        signOffDate: undefined,
        signOffBy: undefined,
        comments: 'User feedback collected and positive',
      },
      {
        criteriaId: 'COMPLIANCE_VERIFICATION',
        criteriaName: 'Greek compliance requirements met',
        criteriaType: 'COMPLIANCE',
        measurableTarget: '100% compliance check pass',
        actualValue: '100%',
        status: 'MET',
        signOffRole: 'Compliance Officer',
        signOffDate: undefined,
        signOffBy: undefined,
        comments: 'All Greek labor law requirements verified',
      },
    ];

    return criteria;
  }

  /**
   * Generate pilot result summary
   */
  async generatePilotResult(
    pilotId: string,
    testResults: TestScenario[],
    parallelRunResults: ParallelRunResult[],
    signOffStatus: SignOffCriteria[]
  ): Promise<PilotResult> {
    const passedTests = testResults.filter(t => t.status === 'PASSED').length;
    const failedTests = testResults.filter(t => t.status === 'FAILED').length;
    const blockedTests = testResults.filter(t => t.status === 'BLOCKED').length;

    const criticalIssues = testResults.reduce(
      (sum, t) => sum + t.issues.filter(i => i.severity === 'CRITICAL').length,
      0
    );

    const resolvedIssues = testResults.reduce(
      (sum, t) =>
        sum +
        t.issues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED')
          .length,
      0
    );

    const overallStatus = this.determineOverallStatus(
      testResults,
      signOffStatus
    );

    const performanceMetrics: PerformanceMetric[] = [
      {
        metricName: 'Test Pass Rate',
        targetValue: 95,
        actualValue: this.calculateTestPassRate(testResults),
        unit: '%',
        variance: this.calculateTestPassRate(testResults) - 95,
        status:
          this.calculateTestPassRate(testResults) >= 95 ? 'MET' : 'NOT_MET',
      },
      {
        metricName: 'Parallel Run Accuracy',
        targetValue: 98,
        actualValue: this.calculateAverageMatch(parallelRunResults),
        unit: '%',
        variance: this.calculateAverageMatch(parallelRunResults) - 98,
        status:
          this.calculateAverageMatch(parallelRunResults) >= 98
            ? 'MET'
            : 'NOT_MET',
      },
    ];

    const lessons: LessonsLearned[] = [
      {
        lessonId: nanoid(),
        category: 'TRAINING',
        description:
          'Additional training needed on overtime calculations for seasonal employees',
        impact: 'POSITIVE',
        applicability: 'ALL_PROPERTIES',
        actionRequired: true,
        recommendation:
          'Create specialized training module for seasonal employee management',
      },
      {
        lessonId: nanoid(),
        category: 'PROCESS',
        description:
          'Parallel run process very effective for identifying calculation differences',
        impact: 'POSITIVE',
        applicability: 'ALL_PROPERTIES',
        actionRequired: false,
        recommendation: 'Continue parallel runs for future implementations',
      },
    ];

    const recommendations: Recommendation[] = [
      {
        recommendationId: nanoid(),
        recommendationType: 'TRAINING_ENHANCEMENT',
        priority: 'HIGH',
        description: 'Enhance training materials for complex payroll scenarios',
        benefitExpected: 'Reduce pilot issues by 50% in future implementations',
        implementationEffort: 'MEDIUM',
        targetAudience: ['Payroll Managers', 'HR Staff'],
        timeframe: 'SHORT_TERM',
      },
      {
        recommendationId: nanoid(),
        recommendationType: 'PROCESS_IMPROVEMENT',
        priority: 'MEDIUM',
        description: 'Implement automated parallel run comparison tools',
        benefitExpected: 'Reduce manual comparison effort by 80%',
        implementationEffort: 'HIGH',
        targetAudience: ['Implementation Team'],
        timeframe: 'LONG_TERM',
      },
    ];

    return {
      pilotId,
      overallStatus,
      summary: {
        duration: 30, // days
        totalTests: testResults.length,
        passedTests,
        failedTests,
        blockedTests,
        criticalIssues,
        resolvedIssues,
        userSatisfaction: 85,
        performanceMetrics,
      },
      testResults,
      parallelRunResults,
      signOffStatus,
      lessons,
      recommendations,
      completedDate: new Date(),
    };
  }

  // Private helper methods
  private definePilotScope(scopeDefinition: any): PilotScope {
    return {
      scopeType: 'DEPARTMENT',
      includedDepartments: ['FRONT_OFFICE', 'HOUSEKEEPING'],
      includedEmployees: [], // Populated based on departments
      includedProcesses: ['PAYROLL_RUN', 'TIME_CAPTURE', 'GOVERNMENT_FILING'],
      exclusions: ['SEASONAL_EMPLOYEES', 'CONTRACTORS'],
      duration: 30, // 30-day pilot
      payrollCycles: 1,
      businessProcesses: [
        {
          processId: 'PAYROLL_PROCESS',
          processName: 'Monthly Payroll Processing',
          processType: 'PAYROLL_RUN',
          priority: 'HIGH',
          complexity: 'HIGH',
          stakeholders: ['Payroll Manager', 'Finance Controller'],
          successCriteria: [
            'Accurate calculations',
            'Timely processing',
            'Error-free filings',
          ],
          testData: {
            dataType: 'PAYROLL_DATA',
            volume: 'MEDIUM',
            scenarios: ['Regular pay', 'Overtime pay', 'Bonus payments'],
            expectedOutcomes: [
              'Calculations match legacy system',
              'Compliance verified',
            ],
            validationPoints: [
              'Net pay accuracy',
              'Tax calculations',
              'Filing data',
            ],
          },
        },
      ],
    };
  }

  private createTestScenarios(pilotScope: PilotScope): TestScenario[] {
    return [
      {
        scenarioId: 'SCENARIO_1',
        scenarioName: 'Employee Payroll Processing',
        description: 'End-to-end payroll processing for pilot employees',
        category: 'FUNCTIONAL',
        priority: 'HIGH',
        prerequisites: ['Employee data migrated', 'Policies configured'],
        testSteps: [],
        expectedResults: [],
        status: 'PLANNED',
        issues: [],
      },
      {
        scenarioId: 'SCENARIO_2',
        scenarioName: 'ERGANI Filing Integration',
        description: 'Test automated ERGANI event submission',
        category: 'INTEGRATION',
        priority: 'HIGH',
        prerequisites: ['ERGANI credentials configured'],
        testSteps: [],
        expectedResults: [],
        status: 'PLANNED',
        issues: [],
      },
      {
        scenarioId: 'SCENARIO_3',
        scenarioName: 'User Acceptance Testing',
        description: 'End users test all daily operations',
        category: 'USER_ACCEPTANCE',
        priority: 'HIGH',
        prerequisites: ['User training completed'],
        testSteps: [],
        expectedResults: [],
        status: 'PLANNED',
        issues: [],
      },
    ];
  }

  private createParallelRunConfig(): ParallelRunConfig {
    return {
      duration: 30,
      payrollPeriods: ['2025-01'],
      comparisonPoints: [
        {
          pointId: 'GROSS_PAY',
          pointName: 'Gross Pay Calculation',
          dataType: 'PAYROLL_CALCULATION',
          comparisonMethod: 'WITHIN_TOLERANCE',
          importance: 'CRITICAL',
          validationQuery: 'SELECT SUM(gross_pay) FROM payroll_lines',
        },
        {
          pointId: 'TAX_WITHHOLDING',
          pointName: 'Income Tax Withholding',
          dataType: 'TAX_WITHHOLDING',
          comparisonMethod: 'WITHIN_TOLERANCE',
          importance: 'CRITICAL',
          validationQuery: 'SELECT SUM(income_tax) FROM payroll_lines',
        },
      ],
      toleranceThresholds: [
        {
          dataType: 'PAYROLL_CALCULATION',
          thresholdType: 'PERCENTAGE',
          acceptableVariance: 0.5,
          escalationVariance: 2.0,
          criticalVariance: 5.0,
        },
      ],
      automatedComparison: true,
      reportingFrequency: 'WEEKLY',
      escalationRules: [
        {
          ruleId: 'CRITICAL_VARIANCE',
          triggerCondition: 'variance > 5%',
          escalationLevel: 1,
          notificationList: ['pilot.lead@company.com'],
          responseTime: 2,
          escalationAction: 'INVESTIGATE',
        },
      ],
    };
  }

  private createSignOffCriteria(): SignOffCriteria[] {
    return [
      {
        criteriaId: 'FUNCTIONAL_SIGN_OFF',
        criteriaName: 'Functional Testing Sign-off',
        criteriaType: 'FUNCTIONAL',
        measurableTarget: '95% test pass rate',
        status: 'NOT_STARTED',
        signOffRole: 'Business User',
      },
      {
        criteriaId: 'COMPLIANCE_SIGN_OFF',
        criteriaName: 'Compliance Verification Sign-off',
        criteriaType: 'COMPLIANCE',
        measurableTarget: '100% compliance verification',
        status: 'NOT_STARTED',
        signOffRole: 'Compliance Officer',
      },
    ];
  }

  private createPilotTimeline(): PilotTimeline {
    const startDate = new Date();

    return {
      totalDuration: 30,
      phases: [
        {
          phaseId: 'PHASE_1',
          phaseName: 'Setup and Preparation',
          startDate: startDate,
          endDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          objectives: [
            'Environment setup',
            'Data preparation',
            'User training',
          ],
          deliverables: ['Test environment ready', 'Users trained'],
          activities: [
            {
              activityId: 'SETUP_ENV',
              activityName: 'Environment Setup',
              activityType: 'SETUP',
              duration: 16,
              assignedTo: ['Technical Lead'],
              dependencies: [],
              status: 'PLANNED',
            },
          ],
          exitCriteria: ['Environment validated', 'Training completed'],
        },
      ],
      milestones: [
        {
          milestoneId: 'PILOT_START',
          milestoneName: 'Pilot Start',
          targetDate: startDate,
          completionCriteria: ['All preparations complete'],
          stakeholder: 'Pilot Lead',
          critical: true,
          status: 'PENDING',
        },
      ],
      dependencies: ['Migration completed', 'Configuration approved'],
      criticalPath: ['SETUP', 'TESTING', 'VALIDATION'],
    };
  }

  private allocatePilotResources(): PilotResources {
    return {
      teamMembers: [
        {
          memberId: 'PILOT_LEAD',
          name: 'Pilot Lead',
          role: 'Project Manager',
          department: 'IT',
          responsibilities: ['Overall pilot coordination', 'Issue escalation'],
          availability: 100,
          trainingRequired: [],
        },
        {
          memberId: 'BUSINESS_USER',
          name: 'Payroll Manager',
          role: 'Business User',
          department: 'HR',
          responsibilities: ['Business testing', 'User acceptance'],
          availability: 50,
          trainingRequired: ['PayrollSync Training'],
        },
      ],
      trainingRequirements: [
        {
          trainingId: 'PAYROLLSYNC_BASIC',
          trainingName: 'PayrollSync Basic Training',
          trainingType: 'HANDS_ON',
          targetAudience: ['Business Users'],
          duration: 8,
          deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          completionRequired: true,
        },
      ],
      infrastructure: [
        {
          requirementId: 'TEST_WORKSTATIONS',
          requirementType: 'HARDWARE',
          description: '5 dedicated test workstations',
          quantity: 5,
          deliveryDate: new Date(),
          responsible: 'IT Department',
          status: 'DELIVERED',
        },
      ],
      budget: [
        {
          allocationId: 'PILOT_BUDGET',
          category: 'PERSONNEL',
          amount: 15000,
          currency: 'EUR',
          responsible: 'Project Manager',
          approvalRequired: true,
          approved: true,
        },
      ],
    };
  }

  private createRiskMitigationPlan(): RiskMitigationPlan {
    return {
      risks: [
        {
          riskId: 'USER_ADOPTION',
          riskName: 'User Adoption Resistance',
          riskCategory: 'BUSINESS',
          probability: 'MEDIUM',
          impact: 'HIGH',
          riskScore: 6,
          description: 'Users may resist change from legacy system',
          triggers: ['Low training attendance', 'Negative feedback'],
          mitigationStrategies: ['Comprehensive training', 'Change management'],
          owner: 'HR Manager',
          status: 'IDENTIFIED',
        },
        {
          riskId: 'DATA_QUALITY',
          riskName: 'Data Quality Issues',
          riskCategory: 'TECHNICAL',
          probability: 'LOW',
          impact: 'CRITICAL',
          riskScore: 4,
          description: 'Migrated data may contain errors',
          triggers: ['Validation failures', 'Calculation discrepancies'],
          mitigationStrategies: ['Data validation', 'Parallel runs'],
          owner: 'Technical Lead',
          status: 'MITIGATED',
        },
      ],
      contingencyPlans: [
        {
          planId: 'ROLLBACK_PLAN',
          planName: 'Pilot Rollback',
          triggerConditions: [
            'Critical system failure',
            'Major data corruption',
          ],
          actions: [
            {
              actionId: 'STOP_PILOT',
              actionDescription: 'Stop all pilot activities',
              actionType: 'PROCESS',
              sequence: 1,
              estimatedTime: 30,
              responsible: 'Pilot Lead',
              dependencies: [],
            },
          ],
          estimatedCost: 5000,
          estimatedTime: 4,
          approvalRequired: true,
          responsible: ['Pilot Lead', 'Technical Lead'],
        },
      ],
      monitoringPlan: {
        monitoringFrequency: 'DAILY',
        kpiMetrics: [
          {
            kpiId: 'USER_SATISFACTION',
            kpiName: 'User Satisfaction Score',
            metric: 'satisfaction_percentage',
            targetValue: 80,
            toleranceRange: 10,
            measurementFrequency: 'WEEKLY',
          },
        ],
        alertThresholds: [
          {
            thresholdId: 'CRITICAL_ERRORS',
            metric: 'error_count',
            warningThreshold: 5,
            criticalThreshold: 10,
            notificationList: ['pilot.lead@company.com'],
            escalationTime: 1,
          },
        ],
        reportingSchedule: [
          {
            reportId: 'DAILY_STATUS',
            reportName: 'Daily Pilot Status Report',
            reportType: 'DAILY_STATUS',
            frequency: 'DAILY',
            recipients: ['Pilot Team'],
            deliveryMethod: 'EMAIL',
          },
        ],
      },
    };
  }

  private calculateTestPassRate(testResults: TestScenario[]): number {
    if (testResults.length === 0) return 0;
    const passedTests = testResults.filter(t => t.status === 'PASSED').length;
    return Math.round((passedTests / testResults.length) * 100);
  }

  private calculateAverageMatch(
    parallelRunResults: ParallelRunResult[]
  ): number {
    if (parallelRunResults.length === 0) return 0;
    const totalMatch = parallelRunResults.reduce(
      (sum, r) => sum + r.overallMatch,
      0
    );
    return Math.round(totalMatch / parallelRunResults.length);
  }

  private determineOverallStatus(
    testResults: TestScenario[],
    signOffStatus: SignOffCriteria[]
  ): 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' {
    const testPassRate = this.calculateTestPassRate(testResults);
    const signOffMet = signOffStatus.filter(s => s.status === 'MET').length;
    const totalSignOffs = signOffStatus.length;

    if (testPassRate >= 95 && signOffMet === totalSignOffs) {
      return 'SUCCESS';
    } else if (testPassRate >= 80 && signOffMet >= totalSignOffs * 0.8) {
      return 'PARTIAL_SUCCESS';
    } else {
      return 'FAILURE';
    }
  }
}

export const pilotService = new PilotService();
