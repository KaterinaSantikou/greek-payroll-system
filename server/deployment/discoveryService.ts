import { nanoid } from 'nanoid';

/**
 * Discovery Service for PayrollSync Implementation
 * Handles entity mapping, CBA analysis, bank format detection, and ERP integration planning
 */

export interface PropertyDiscovery {
  discoveryId: string;
  propertyCode: string;
  propertyName: string;
  location: string;
  propertyType: 'HOTEL' | 'RESORT' | 'BOUTIQUE' | 'CHAIN' | 'INDEPENDENT';
  totalEmployees: number;
  departments: DepartmentStructure[];
  seasonality: SeasonalityPattern;
  currentSystems: CurrentSystemsAnalysis;
  complianceGaps: ComplianceGap[];
  recommendedCBA: string;
  bankingRequirements: BankingRequirements;
  erpIntegrationNeeds: ERPIntegrationNeeds;
  discoveryDate: Date;
  discoveredBy: string;
}

export interface DepartmentStructure {
  departmentCode: string;
  departmentName: string;
  employeeCount: number;
  shiftPatterns: ShiftPattern[];
  managerAFM: string;
  costCenter: string;
  tipPoolingRequired: boolean;
  seasonalVariation: boolean;
}

export interface ShiftPattern {
  shiftCode: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  employeeCount: number;
  overtimeRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  erganiComplexity: 'SIMPLE' | 'COMPLEX';
}

export interface SeasonalityPattern {
  highSeason: { start: string; end: string; employeeMultiplier: number };
  lowSeason: { start: string; end: string; employeeMultiplier: number };
  peakDates: Array<{
    date: string;
    description: string;
    staffingBoost: number;
  }>;
  contractTypes: {
    permanent: number;
    seasonal: number;
    temporary: number;
  };
}

export interface CurrentSystemsAnalysis {
  payrollSystem: {
    vendor: string;
    version: string;
    lastUpdate: Date;
    dataExportCapability: boolean;
    migrationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
    retentionPeriod: number; // months
  };
  timekeepingSystem: {
    vendor: string;
    devices: TimeClockDevice[];
    integrationMethod: string;
    dataRetention: number; // months
  };
  hrSystem: {
    vendor: string;
    employeeCount: number;
    documentStorage: boolean;
    erpIntegrated: boolean;
  };
  erganiCompliance: {
    currentMethod: 'MANUAL' | 'SEMI_AUTO' | 'INTEGRATED';
    submissionAccuracy: number; // percentage
    averageDelayHours: number;
  };
}

export interface TimeClockDevice {
  deviceId: string;
  location: string;
  type: 'BIOMETRIC' | 'RFID' | 'PIN' | 'MOBILE';
  model: string;
  connectivity: 'WIFI' | 'ETHERNET' | 'CELLULAR';
  employeesAssigned: number;
  migrationRequired: boolean;
}

export interface ComplianceGap {
  gapType:
    | 'ERGANI_DELAYS'
    | 'MISSING_ERGANI'
    | 'INCORRECT_CALCULATIONS'
    | 'MISSING_DOCUMENTS'
    | 'INADEQUATE_TRACKING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedEmployees: number;
  estimatedFines: number;
  recommendedAction: string;
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface BankingRequirements {
  primaryBank: BankDetails;
  secondaryBanks: BankDetails[];
  sepaFormatRequired: boolean;
  urgentPaymentsNeeded: boolean;
  multiCurrencySupport: boolean;
  approvalWorkflow: {
    singleApprover: boolean;
    dualApproval: boolean;
    approverRoles: string[];
  };
}

export interface BankDetails {
  bankName: string;
  bankCode: string;
  swiftCode: string;
  fileFormat: 'SEPA_XML' | 'CSV' | 'FIXED_WIDTH' | 'PROPRIETARY';
  transmissionMethod: 'SFTP' | 'HTTPS' | 'BANKING_APP' | 'MANUAL';
  encryptionRequired: boolean;
  testingRequired: boolean;
}

export interface ERPIntegrationNeeds {
  erpSystem: 'SAP' | 'ORACLE' | 'SAGE' | 'EPSILON' | 'SINGULAR' | 'NONE';
  version: string;
  modules: string[];
  integrationPoints: ERPIntegrationPoint[];
  chartOfAccounts: ChartOfAccountsMapping;
  costCenterStructure: CostCenterMapping[];
  reportingRequirements: string[];
  realTimeRequired: boolean;
}

export interface ERPIntegrationPoint {
  dataType:
    | 'GL_JOURNAL'
    | 'EMPLOYEE_MASTER'
    | 'COST_ALLOCATIONS'
    | 'BUDGET_DATA';
  frequency: 'REAL_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  format: 'XML' | 'CSV' | 'JSON' | 'API';
  direction: 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
  validation: boolean;
}

export interface ChartOfAccountsMapping {
  salaryExpenseAccount: string;
  overtimeExpenseAccount: string;
  socialSecurityExpenseAccount: string;
  taxPayableAccount: string;
  salaryPayableAccount: string;
  customMappings: Array<{ payrollComponent: string; accountCode: string }>;
}

export interface CostCenterMapping {
  departmentCode: string;
  costCenterCode: string;
  description: string;
  budgetOwner: string;
  active: boolean;
}

export interface CBAAnalysis {
  cbaId: string;
  cbaName: string;
  industry: string;
  applicableProperties: string[];
  wageStructure: CBAWageStructure;
  workingTimeRules: CBAWorkingTimeRules;
  overtimeRules: CBOvertimeRules;
  leaveEntitlements: CBALeaveRules;
  bonusRequirements: CBABonusRules;
  specialProvisions: CBASpecialProvision[];
  effectiveDate: Date;
  expiryDate: Date;
  complianceComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CBAWageStructure {
  grades: CBAGrade[];
  minimumWages: CBAMinimumWage[];
  yearlyIncreases: CBAYearlyIncrease[];
  allowances: CBAAllowance[];
}

export interface CBAGrade {
  gradeCode: string;
  description: string;
  baseWage: number;
  experienceMultipliers: Array<{ years: number; multiplier: number }>;
  qualificationBonuses: Array<{ qualification: string; bonus: number }>;
}

export interface CBAMinimumWage {
  year: number;
  monthlyAmount: number;
  dailyAmount: number;
  hourlyAmount: number;
}

export interface CBAYearlyIncrease {
  year: number;
  percentage: number;
  effectiveDate: Date;
}

export interface CBAAllowance {
  allowanceCode: string;
  description: string;
  amount: number;
  conditions: string[];
  taxable: boolean;
}

export interface CBAWorkingTimeRules {
  standardWeeklyHours: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  breakRequirements: CBABreakRule[];
  nightShiftDefinition: { start: string; end: string; premium: number };
  weekendRules: CBAWeekendRule[];
}

export interface CBABreakRule {
  workHoursThreshold: number;
  minimumBreakMinutes: number;
  paid: boolean;
  mandatory: boolean;
}

export interface CBAWeekendRule {
  day: 'SATURDAY' | 'SUNDAY';
  workAllowed: boolean;
  premium: number;
  maxHours: number;
  notice: number; // hours
}

export interface CBOvertimeRules {
  dailyOvertimeThreshold: number;
  weeklyOvertimeThreshold: number;
  overtimePremiums: CBAOvertimePremium[];
  maxOvertimePerMonth: number;
  preApprovalRequired: boolean;
  compensationOptions: Array<'PAY' | 'TIME_OFF'>;
}

export interface CBAOvertimePremium {
  type: 'DAILY' | 'WEEKLY' | 'HOLIDAY' | 'NIGHT';
  threshold: number;
  premium: number;
  maxHours?: number;
}

export interface CBALeaveRules {
  annualLeave: { days: number; earningRate: number };
  sickLeave: { days: number; compensation: number };
  maternityLeave: { days: number; compensation: number };
  paternityLeave: { days: number; compensation: number };
  specialLeave: CBASpecialLeave[];
}

export interface CBASpecialLeave {
  type: string;
  days: number;
  paid: boolean;
  conditions: string[];
}

export interface CBABonusRules {
  christmasBonus: { formula: string; paymentDate: string };
  easterBonus: { formula: string; paymentDate: string };
  vacationBonus: { formula: string; paymentDate: string };
  performanceBonuses: CBAPerformanceBonus[];
}

export interface CBAPerformanceBonus {
  type: string;
  criteria: string[];
  amount: number;
  frequency: string;
}

export interface CBASpecialProvision {
  provision: string;
  description: string;
  impact: 'PAYROLL' | 'SCHEDULING' | 'REPORTING' | 'COMPLIANCE';
  implementationNotes: string;
}

class DiscoveryService {
  /**
   * Conduct comprehensive property discovery
   */
  async conductPropertyDiscovery(
    propertyCode: string,
    discoveredBy: string
  ): Promise<PropertyDiscovery> {
    const discoveryId = nanoid();

    console.log(`Starting discovery for property ${propertyCode}`);

    // Gather property information
    const propertyInfo = await this.gatherPropertyInformation(propertyCode);

    // Analyze current systems
    const currentSystems = await this.analyzeCurrentSystems(propertyCode);

    // Identify compliance gaps
    const complianceGaps = await this.identifyComplianceGaps(
      propertyCode,
      currentSystems
    );

    // Determine CBA applicability
    const recommendedCBA = await this.determineCBARequirements(propertyInfo);

    // Analyze banking requirements
    const bankingRequirements =
      await this.analyzeBankingRequirements(propertyCode);

    // Assess ERP integration needs
    const erpIntegrationNeeds = await this.assessERPIntegration(propertyCode);

    const discovery: PropertyDiscovery = {
      discoveryId,
      propertyCode,
      propertyName: propertyInfo.name,
      location: propertyInfo.location,
      propertyType: propertyInfo.type,
      totalEmployees: propertyInfo.employeeCount,
      departments: propertyInfo.departments,
      seasonality: propertyInfo.seasonality,
      currentSystems,
      complianceGaps,
      recommendedCBA,
      bankingRequirements,
      erpIntegrationNeeds,
      discoveryDate: new Date(),
      discoveredBy,
    };

    console.log(
      `Discovery completed for ${propertyCode}: ${complianceGaps.length} gaps identified`
    );

    return discovery;
  }

  /**
   * Analyze Collective Bargaining Agreement requirements
   */
  async analyzeCBA(cbaName: string): Promise<CBAAnalysis> {
    const cbaId = nanoid();

    // Greek hotel industry CBAs
    const greekHotelCBAs: Record<string, Partial<CBAAnalysis>> = {
      HOTEL_TOURISM_CBA_2024: {
        cbaName: 'Κλαδική Συλλογική Σύμβαση Εργαζομένων Ξενοδοχείων-Τουρισμού',
        industry: 'Hotels & Tourism',
        complianceComplexity: 'HIGH',
        wageStructure: {
          grades: [
            {
              gradeCode: 'UNSKILLED',
              description: 'Ανειδίκευτος Εργάτης',
              baseWage: 880, // 2025 minimum wage
              experienceMultipliers: [
                { years: 0, multiplier: 1.0 },
                { years: 2, multiplier: 1.05 },
                { years: 5, multiplier: 1.1 },
              ],
              qualificationBonuses: [],
            },
            {
              gradeCode: 'SKILLED',
              description: 'Ειδικευμένος Εργάτης',
              baseWage: 950,
              experienceMultipliers: [
                { years: 0, multiplier: 1.0 },
                { years: 3, multiplier: 1.08 },
                { years: 7, multiplier: 1.15 },
              ],
              qualificationBonuses: [
                { qualification: 'Πτυχίο ΤΕΙ', bonus: 50 },
                { qualification: 'Γνώση Ξένων Γλωσσών', bonus: 30 },
              ],
            },
          ],
          minimumWages: [
            {
              year: 2025,
              monthlyAmount: 880,
              dailyAmount: 29.33,
              hourlyAmount: 4.07,
            },
          ],
          yearlyIncreases: [
            {
              year: 2025,
              percentage: 2.5,
              effectiveDate: new Date('2025-01-01'),
            },
          ],
          allowances: [
            {
              allowanceCode: 'MEAL',
              description: 'Επίδομα Σίτισης',
              amount: 11,
              conditions: ['Per working day'],
              taxable: false,
            },
            {
              allowanceCode: 'TRANSPORT',
              description: 'Επίδομα Μεταφοράς',
              amount: 50,
              conditions: ['Monthly allowance'],
              taxable: false,
            },
          ],
        },
      },
    };

    const cbaTemplate = greekHotelCBAs[cbaName] || this.getDefaultCBA();

    return {
      cbaId,
      cbaName,
      industry: 'Hotels & Tourism',
      applicableProperties: [],
      effectiveDate: new Date('2025-01-01'),
      expiryDate: new Date('2026-12-31'),
      complianceComplexity: 'HIGH',
      ...cbaTemplate,
    } as CBAAnalysis;
  }

  /**
   * Generate implementation recommendations
   */
  async generateImplementationRecommendations(
    discoveries: PropertyDiscovery[]
  ): Promise<any> {
    const recommendations = {
      priority: this.calculateImplementationPriority(discoveries),
      phases: this.planImplementationPhases(discoveries),
      resources: this.estimateResourceRequirements(discoveries),
      timeline: this.createImplementationTimeline(discoveries),
      risks: this.identifyImplementationRisks(discoveries),
      successFactors: this.defineSuccessFactors(discoveries),
    };

    return recommendations;
  }

  // Private helper methods
  private async gatherPropertyInformation(propertyCode: string): Promise<any> {
    // Mock implementation - would gather actual property data
    return {
      name: 'Athens Grand Hotel',
      location: 'Athens, Greece',
      type: 'HOTEL',
      employeeCount: 150,
      departments: [
        {
          departmentCode: 'FRONT',
          departmentName: 'Front Office',
          employeeCount: 25,
          shiftPatterns: [
            {
              shiftCode: 'MORNING',
              startTime: '07:00',
              endTime: '15:00',
              breakDuration: 30,
              employeeCount: 10,
              overtimeRisk: 'LOW',
              erganiComplexity: 'SIMPLE',
            },
          ],
          managerAFM: '123456789',
          costCenter: 'CC001',
          tipPoolingRequired: true,
          seasonalVariation: true,
        },
      ],
      seasonality: {
        highSeason: {
          start: '2025-05-01',
          end: '2025-10-31',
          employeeMultiplier: 1.3,
        },
        lowSeason: {
          start: '2025-11-01',
          end: '2025-04-30',
          employeeMultiplier: 0.8,
        },
        peakDates: [
          {
            date: '2025-12-31',
            description: "New Year's Eve",
            staffingBoost: 1.5,
          },
        ],
        contractTypes: { permanent: 80, seasonal: 50, temporary: 20 },
      },
    };
  }

  private async analyzeCurrentSystems(
    propertyCode: string
  ): Promise<CurrentSystemsAnalysis> {
    // Mock implementation
    return {
      payrollSystem: {
        vendor: 'Legacy Payroll System',
        version: '2.1',
        lastUpdate: new Date('2023-01-01'),
        dataExportCapability: false,
        migrationComplexity: 'HIGH',
        retentionPeriod: 84,
      },
      timekeepingSystem: {
        vendor: 'TimeTracker Pro',
        devices: [
          {
            deviceId: 'TT001',
            location: 'Main Entrance',
            type: 'BIOMETRIC',
            model: 'FingerprintPro X1',
            connectivity: 'ETHERNET',
            employeesAssigned: 150,
            migrationRequired: true,
          },
        ],
        integrationMethod: 'Manual Export',
        dataRetention: 36,
      },
      hrSystem: {
        vendor: 'HR Manager',
        employeeCount: 150,
        documentStorage: true,
        erpIntegrated: false,
      },
      erganiCompliance: {
        currentMethod: 'MANUAL',
        submissionAccuracy: 85,
        averageDelayHours: 16,
      },
    };
  }

  private async identifyComplianceGaps(
    propertyCode: string,
    currentSystems: CurrentSystemsAnalysis
  ): Promise<ComplianceGap[]> {
    const gaps: ComplianceGap[] = [];

    if (currentSystems.erganiCompliance.currentMethod === 'MANUAL') {
      gaps.push({
        gapType: 'ERGANI_DELAYS',
        severity: 'HIGH',
        description: 'Manual ERGANI submissions causing delays and errors',
        affectedEmployees: 150,
        estimatedFines: 5000,
        recommendedAction: 'Implement automated ERGANI integration',
        implementationEffort: 'MEDIUM',
      });
    }

    if (currentSystems.erganiCompliance.submissionAccuracy < 95) {
      gaps.push({
        gapType: 'INCORRECT_CALCULATIONS',
        severity: 'MEDIUM',
        description: 'Payroll calculation errors affecting compliance',
        affectedEmployees: 20,
        estimatedFines: 2000,
        recommendedAction: 'Upgrade to automated payroll system',
        implementationEffort: 'HIGH',
      });
    }

    return gaps;
  }

  private async determineCBARequirements(propertyInfo: any): Promise<string> {
    // Determine applicable CBA based on property type and location
    if (propertyInfo.type === 'HOTEL') {
      return 'HOTEL_TOURISM_CBA_2024';
    }
    return 'GENERAL_TOURISM_CBA_2024';
  }

  private async analyzeBankingRequirements(
    propertyCode: string
  ): Promise<BankingRequirements> {
    return {
      primaryBank: {
        bankName: 'Εθνική Τράπεζα',
        bankCode: '011',
        swiftCode: 'ETHNGRAA',
        fileFormat: 'SEPA_XML',
        transmissionMethod: 'SFTP',
        encryptionRequired: true,
        testingRequired: true,
      },
      secondaryBanks: [],
      sepaFormatRequired: true,
      urgentPaymentsNeeded: false,
      multiCurrencySupport: false,
      approvalWorkflow: {
        singleApprover: false,
        dualApproval: true,
        approverRoles: ['Finance Manager', 'General Manager'],
      },
    };
  }

  private async assessERPIntegration(
    propertyCode: string
  ): Promise<ERPIntegrationNeeds> {
    return {
      erpSystem: 'SAP',
      version: 'S/4HANA 2023',
      modules: ['FI', 'CO', 'HR'],
      integrationPoints: [
        {
          dataType: 'GL_JOURNAL',
          frequency: 'MONTHLY',
          format: 'XML',
          direction: 'OUTBOUND',
          validation: true,
        },
      ],
      chartOfAccounts: {
        salaryExpenseAccount: '641000',
        overtimeExpenseAccount: '641100',
        socialSecurityExpenseAccount: '641400',
        taxPayableAccount: '601100',
        salaryPayableAccount: '601000',
        customMappings: [],
      },
      costCenterStructure: [
        {
          departmentCode: 'FRONT',
          costCenterCode: 'CC001',
          description: 'Front Office Operations',
          budgetOwner: 'Front Office Manager',
          active: true,
        },
      ],
      reportingRequirements: [
        'Monthly P&L by Department',
        'Labor Cost Analysis',
      ],
      realTimeRequired: false,
    };
  }

  private getDefaultCBA(): Partial<CBAAnalysis> {
    return {
      industry: 'General',
      complianceComplexity: 'MEDIUM',
      wageStructure: {
        grades: [],
        minimumWages: [
          {
            year: 2025,
            monthlyAmount: 880,
            dailyAmount: 29.33,
            hourlyAmount: 4.07,
          },
        ],
        yearlyIncreases: [],
        allowances: [],
      },
    };
  }

  private calculateImplementationPriority(
    discoveries: PropertyDiscovery[]
  ): any[] {
    return discoveries
      .map(discovery => ({
        propertyCode: discovery.propertyCode,
        priority: this.calculatePriorityScore(discovery),
        reasoning: this.getPriorityReasoning(discovery),
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  private calculatePriorityScore(discovery: PropertyDiscovery): number {
    let score = 0;

    // Higher score for more compliance gaps
    score += discovery.complianceGaps.length * 10;

    // Higher score for critical gaps
    score +=
      discovery.complianceGaps.filter(g => g.severity === 'CRITICAL').length *
      50;

    // Higher score for larger properties
    score += discovery.totalEmployees * 0.1;

    return score;
  }

  private getPriorityReasoning(discovery: PropertyDiscovery): string {
    const criticalGaps = discovery.complianceGaps.filter(
      g => g.severity === 'CRITICAL'
    ).length;
    if (criticalGaps > 0) {
      return `${criticalGaps} critical compliance gaps requiring immediate attention`;
    }

    if (discovery.totalEmployees > 100) {
      return 'Large property with significant employee count';
    }

    return 'Standard implementation priority';
  }

  private planImplementationPhases(discoveries: PropertyDiscovery[]): any {
    return {
      phase1: discoveries.slice(0, 2).map(d => d.propertyCode),
      phase2: discoveries.slice(2, 5).map(d => d.propertyCode),
      phase3: discoveries.slice(5).map(d => d.propertyCode),
    };
  }

  private estimateResourceRequirements(discoveries: PropertyDiscovery[]): any {
    const totalEmployees = discoveries.reduce(
      (sum, d) => sum + d.totalEmployees,
      0
    );

    return {
      implementationTeam: Math.ceil(totalEmployees / 100),
      trainingHours: totalEmployees * 2,
      testingDays: discoveries.length * 5,
      totalDuration: `${discoveries.length * 2} weeks`,
    };
  }

  private createImplementationTimeline(discoveries: PropertyDiscovery[]): any {
    const phases = this.planImplementationPhases(discoveries);

    return {
      phase1: { duration: '4 weeks', properties: phases.phase1 },
      phase2: { duration: '6 weeks', properties: phases.phase2 },
      phase3: { duration: '8 weeks', properties: phases.phase3 },
    };
  }

  private identifyImplementationRisks(discoveries: PropertyDiscovery[]): any[] {
    return [
      {
        risk: 'Data Migration Complexity',
        probability: 'HIGH',
        impact: 'MEDIUM',
        mitigation: 'Comprehensive data validation and parallel runs',
      },
      {
        risk: 'User Adoption Resistance',
        probability: 'MEDIUM',
        impact: 'HIGH',
        mitigation: 'Extensive training and change management',
      },
    ];
  }

  private defineSuccessFactors(discoveries: PropertyDiscovery[]): string[] {
    return [
      'Executive sponsorship and clear communication',
      'Comprehensive user training program',
      'Phased rollout with lessons learned integration',
      'Real-time support during go-live periods',
      'Continuous monitoring and improvement',
    ];
  }
}

export const discoveryService = new DiscoveryService();
