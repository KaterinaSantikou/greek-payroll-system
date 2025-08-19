import { randomUUID } from "crypto";

export interface DigitalWorkCard {
  employeeId: string;
  cardId: string;
  status: 'active' | 'inactive' | 'suspended';
  lastSync: string;
  realTimeAttendance: boolean;
  erganiSyncStatus: 'synced' | 'pending' | 'failed';
  biometricEnabled: boolean;
  qrCode?: string;
  nfcEnabled: boolean;
}

export interface ERGANIEvent {
  eventId: string;
  type: 'hire' | 'schedule_declaration' | 'schedule_change' | 'overtime' | 'leave' | 'contract_change' | 'termination';
  employeeId: string;
  timestamp: string;
  status: 'submitted' | 'pending' | 'failed' | 'acknowledged';
  submissionId?: string;
  errorMessage?: string;
  payload: Record<string, any>;
  retryCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface MinimumWageRule {
  ruleId: string;
  effectiveDate: string;
  endDate?: string;
  amount: number;
  category: 'general' | 'under_25' | 'apprentice' | 'trainee';
  region?: string;
  industry?: string;
  isActive: boolean;
  version: string;
  source: 'government' | 'collective_agreement' | 'company_policy';
}

export interface GovernmentFlow {
  flowId: string;
  name: string;
  type: 'ergani' | 'efka' | 'aade';
  frequency: 'real-time' | 'daily' | 'monthly';
  lastSubmission: string;
  nextDue: string;
  status: 'up_to_date' | 'pending' | 'overdue' | 'failed';
  filings: number;
  autoSubmit: boolean;
  webhookUrl?: string;
  credentials: {
    endpoint: string;
    apiKey: string;
    certificate?: string;
  };
}

export interface GreekSpecialPay {
  payId: string;
  type: 'christmas_bonus' | 'easter_bonus' | 'vacation_allowance';
  name: string;
  nameGreek: string;
  calculationRule: string;
  eligibilityRules: string[];
  taxable: boolean;
  efkaSubject: boolean;
  minimumServiceMonths: number;
  proRatedCalculation: boolean;
  paymentDeadline: string;
}

export interface ComplianceRule {
  ruleId: string;
  category: 'digital_work_card' | 'minimum_wage' | 'overtime' | 'leave' | 'special_pays' | 'ergani' | 'efka' | 'aade';
  title: string;
  description: string;
  lawReference: string;
  effectiveDate: string;
  version: string;
  isActive: boolean;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  penalties?: {
    description: string;
    fineAmount?: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

export class ComplianceConnector {
  private digitalWorkCards: Map<string, DigitalWorkCard> = new Map();
  private erganiEvents: Map<string, ERGANIEvent[]> = new Map();
  private minimumWageRules: Map<string, MinimumWageRule> = new Map();
  private governmentFlows: Map<string, GovernmentFlow> = new Map();
  private greekSpecialPays: Map<string, GreekSpecialPay> = new Map();
  private complianceRules: Map<string, ComplianceRule> = new Map();

  constructor() {
    this.initializeComplianceSystem();
  }

  private initializeComplianceSystem(): void {
    this.initializeMinimumWageRules();
    this.initializeGovernmentFlows();
    this.initializeGreekSpecialPays();
    this.initializeComplianceRules();
  }

  private initializeMinimumWageRules(): void {
    const rules: MinimumWageRule[] = [
      {
        ruleId: "MW-GEN-2025",
        effectiveDate: "2025-04-01",
        amount: 880.00,
        category: "general",
        isActive: true,
        version: "2025.1",
        source: "government"
      },
      {
        ruleId: "MW-U25-2025",
        effectiveDate: "2025-04-01",
        amount: 748.00,
        category: "under_25",
        isActive: true,
        version: "2025.1",
        source: "government"
      },
      {
        ruleId: "MW-APP-2025",
        effectiveDate: "2025-04-01",
        amount: 660.00,
        category: "apprentice",
        isActive: true,
        version: "2025.1",
        source: "government"
      },
      {
        ruleId: "MW-TRA-2025",
        effectiveDate: "2025-04-01",
        amount: 616.00,
        category: "trainee",
        isActive: true,
        version: "2025.1",
        source: "government"
      }
    ];

    rules.forEach(rule => {
      this.minimumWageRules.set(rule.ruleId, rule);
    });
  }

  private initializeGovernmentFlows(): void {
    const flows: GovernmentFlow[] = [
      {
        flowId: "ERGANI-RT",
        name: "ERGANI II Real-time Events",
        type: "ergani",
        frequency: "real-time",
        lastSubmission: new Date(Date.now() - 3600000).toISOString(),
        nextDue: new Date(Date.now() + 3600000).toISOString(),
        status: "up_to_date",
        filings: 1247,
        autoSubmit: true,
        credentials: {
          endpoint: "https://ergani.gov.gr/api/v2",
          apiKey: "ERGANI_API_KEY_2025"
        }
      },
      {
        flowId: "EFKA-MONTHLY",
        name: "e-EFKA Monthly Social Security",
        type: "efka",
        frequency: "monthly",
        lastSubmission: new Date("2024-12-31").toISOString(),
        nextDue: new Date("2025-01-31").toISOString(),
        status: "pending",
        filings: 24,
        autoSubmit: true,
        credentials: {
          endpoint: "https://e-efka.gov.gr/api/apdfile",
          apiKey: "EFKA_API_KEY_2025"
        }
      },
      {
        flowId: "AADE-TAX",
        name: "AADE ΦΜΥ Monthly Tax Filing",
        type: "aade",
        frequency: "monthly",
        lastSubmission: new Date("2024-12-31").toISOString(),
        nextDue: new Date("2025-01-31").toISOString(),
        status: "pending",
        filings: 24,
        autoSubmit: true,
        credentials: {
          endpoint: "https://www1.aade.gr/gsisapps/tfmu",
          apiKey: "AADE_API_KEY_2025"
        }
      }
    ];

    flows.forEach(flow => {
      this.governmentFlows.set(flow.flowId, flow);
    });
  }

  private initializeGreekSpecialPays(): void {
    const specialPays: GreekSpecialPay[] = [
      {
        payId: "CHRISTMAS-BONUS",
        type: "christmas_bonus",
        name: "Christmas Bonus",
        nameGreek: "Δώρο Χριστουγέννων",
        calculationRule: "25 days of basic salary for full year service",
        eligibilityRules: [
          "Employed on December 31st",
          "Minimum 28 days service in December",
          "Pro-rated for partial year service"
        ],
        taxable: true,
        efkaSubject: true,
        minimumServiceMonths: 0,
        proRatedCalculation: true,
        paymentDeadline: "December 24th"
      },
      {
        payId: "EASTER-BONUS",
        type: "easter_bonus",
        name: "Easter Bonus",
        nameGreek: "Δώρο Πάσχα",
        calculationRule: "15 days of basic salary for full year service",
        eligibilityRules: [
          "Employed during Easter period",
          "Minimum 40 days service in the 6 months before Easter",
          "Pro-rated for partial service"
        ],
        taxable: true,
        efkaSubject: true,
        minimumServiceMonths: 0,
        proRatedCalculation: true,
        paymentDeadline: "Easter Friday"
      },
      {
        payId: "VACATION-ALLOWANCE",
        type: "vacation_allowance",
        name: "Vacation Allowance",
        nameGreek: "Επίδομα Άδειας",
        calculationRule: "50% of monthly salary for vacation days taken",
        eligibilityRules: [
          "Entitled to annual leave",
          "Paid when taking vacation",
          "Calculated on basic salary + regular allowances"
        ],
        taxable: true,
        efkaSubject: true,
        minimumServiceMonths: 12,
        proRatedCalculation: true,
        paymentDeadline: "With vacation pay"
      }
    ];

    specialPays.forEach(pay => {
      this.greekSpecialPays.set(pay.payId, pay);
    });
  }

  private initializeComplianceRules(): void {
    const rules: ComplianceRule[] = [
      {
        ruleId: "DWC-REALTIME-2025",
        category: "digital_work_card",
        title: "Digital Work Card Real-time Attendance",
        description: "All clock-in/clock-out events must be synchronized with ERGANI II in real-time",
        lawReference: "Law 4808/2021, Article 3",
        effectiveDate: "2025-01-01",
        version: "2025.1",
        isActive: true,
        conditions: {
          applicableTo: "all_employees",
          minimumSyncInterval: 300, // 5 minutes
          biometricRequired: false
        },
        actions: {
          syncToERGANI: true,
          generateAlerts: true,
          logEvents: true
        },
        penalties: {
          description: "Fine for non-compliance with digital work card requirements",
          fineAmount: 1000,
          severity: "high"
        }
      },
      {
        ruleId: "MW-COMPLIANCE-2025",
        category: "minimum_wage",
        title: "Minimum Wage Compliance Check",
        description: "All employee salaries must meet or exceed applicable minimum wage rates",
        lawReference: "Law 4172/2013, Article 103",
        effectiveDate: "2025-04-01",
        version: "2025.1",
        isActive: true,
        conditions: {
          checkFrequency: "monthly",
          includeAllowances: false,
          proRatePartTime: true
        },
        actions: {
          generateAlerts: true,
          blockPayroll: true,
          notifyHR: true
        },
        penalties: {
          description: "Penalties for underpaying employees below minimum wage",
          fineAmount: 5000,
          severity: "critical"
        }
      }
    ];

    rules.forEach(rule => {
      this.complianceRules.set(rule.ruleId, rule);
    });
  }

  // Digital Work Card Methods
  async createDigitalWorkCard(employeeId: string): Promise<DigitalWorkCard> {
    const card: DigitalWorkCard = {
      employeeId,
      cardId: `DWC-${randomUUID().substr(0, 8).toUpperCase()}`,
      status: 'active',
      lastSync: new Date().toISOString(),
      realTimeAttendance: true,
      erganiSyncStatus: 'synced',
      biometricEnabled: false,
      qrCode: `QR-${randomUUID().substr(0, 12).toUpperCase()}`,
      nfcEnabled: true
    };

    this.digitalWorkCards.set(card.cardId, card);
    console.log(`[COMPLIANCE] Created digital work card ${card.cardId} for employee ${employeeId}`);
    return card;
  }

  getDigitalWorkCards(): DigitalWorkCard[] {
    return Array.from(this.digitalWorkCards.values());
  }

  async syncDigitalWorkCard(cardId: string): Promise<boolean> {
    const card = this.digitalWorkCards.get(cardId);
    if (!card) return false;

    // Simulate ERGANI sync
    card.lastSync = new Date().toISOString();
    card.erganiSyncStatus = Math.random() > 0.1 ? 'synced' : 'failed';
    
    return card.erganiSyncStatus === 'synced';
  }

  // ERGANI Event Methods
  async createERGANIEvent(
    type: ERGANIEvent['type'],
    employeeId: string,
    payload: Record<string, any>
  ): Promise<ERGANIEvent> {
    const event: ERGANIEvent = {
      eventId: randomUUID(),
      type,
      employeeId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      payload,
      retryCount: 0,
      priority: type === 'hire' || type === 'termination' ? 'critical' : 'medium'
    };

    // Store event by period (YYYY-MM)
    const period = event.timestamp.substr(0, 7);
    const periodEvents = this.erganiEvents.get(period) || [];
    periodEvents.push(event);
    this.erganiEvents.set(period, periodEvents);

    // Simulate submission
    setTimeout(() => this.processERGANIEvent(event), 1000);
    
    return event;
  }

  private async processERGANIEvent(event: ERGANIEvent): Promise<void> {
    try {
      // Simulate ERGANI II API call
      const success = Math.random() > 0.05; // 95% success rate
      
      if (success) {
        event.status = 'submitted';
        event.submissionId = `SUB-${randomUUID().substr(0, 12).toUpperCase()}`;
        console.log(`[ERGANI] Event ${event.eventId} submitted successfully`);
        
        // Simulate acknowledgment
        setTimeout(() => {
          event.status = 'acknowledged';
        }, 2000);
      } else {
        event.status = 'failed';
        event.errorMessage = 'ERGANI II service temporarily unavailable';
        event.retryCount++;
        console.log(`[ERGANI] Event ${event.eventId} failed, retry count: ${event.retryCount}`);
      }
    } catch (error) {
      event.status = 'failed';
      event.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ERGANI] Error processing event ${event.eventId}:`, error);
    }
  }

  getERGANIEvents(period: string): ERGANIEvent[] {
    const periodKey = period.replace('-', '').substr(0, 7); // Convert YYYY-MM to YYYY-MM
    return this.erganiEvents.get(periodKey) || [];
  }

  // Minimum Wage Methods
  getMinimumWageRules(): MinimumWageRule[] {
    return Array.from(this.minimumWageRules.values())
      .filter(rule => rule.isActive)
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  }

  getMinimumWageForCategory(category: string, date: Date = new Date()): number | null {
    const applicableRules = Array.from(this.minimumWageRules.values())
      .filter(rule => 
        rule.category === category && 
        rule.isActive && 
        new Date(rule.effectiveDate) <= date &&
        (!rule.endDate || new Date(rule.endDate) > date)
      )
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    return applicableRules.length > 0 ? applicableRules[0].amount : null;
  }

  // Government Flows Methods
  getGovernmentFlows(): GovernmentFlow[] {
    return Array.from(this.governmentFlows.values());
  }

  async submitGovernmentFlow(flowId: string): Promise<boolean> {
    const flow = this.governmentFlows.get(flowId);
    if (!flow) return false;

    try {
      // Simulate government API submission
      const success = Math.random() > 0.02; // 98% success rate
      
      if (success) {
        flow.lastSubmission = new Date().toISOString();
        flow.status = 'up_to_date';
        flow.filings++;
        
        // Calculate next due date
        const nextDue = new Date();
        switch (flow.frequency) {
          case 'monthly':
            nextDue.setMonth(nextDue.getMonth() + 1);
            break;
          case 'daily':
            nextDue.setDate(nextDue.getDate() + 1);
            break;
          case 'real-time':
            nextDue.setHours(nextDue.getHours() + 1);
            break;
        }
        flow.nextDue = nextDue.toISOString();
        
        console.log(`[GOVERNMENT] ${flow.name} submitted successfully`);
        return true;
      } else {
        flow.status = 'failed';
        console.log(`[GOVERNMENT] ${flow.name} submission failed`);
        return false;
      }
    } catch (error) {
      console.error(`[GOVERNMENT] Error submitting ${flow.name}:`, error);
      flow.status = 'failed';
      return false;
    }
  }

  // Greek Special Pays Methods
  getGreekSpecialPays(): GreekSpecialPay[] {
    return Array.from(this.greekSpecialPays.values());
  }

  calculateSpecialPay(
    payType: GreekSpecialPay['type'],
    basicSalary: number,
    serviceMonths: number
  ): number {
    const specialPay = Array.from(this.greekSpecialPays.values())
      .find(pay => pay.type === payType);
    
    if (!specialPay) return 0;

    let amount = 0;
    const dailySalary = basicSalary / 25; // Greek standard: 25 working days per month

    switch (payType) {
      case 'christmas_bonus':
        // 25 days of basic salary, pro-rated
        amount = dailySalary * 25 * Math.min(serviceMonths / 12, 1);
        break;
      case 'easter_bonus':
        // 15 days of basic salary, pro-rated
        amount = dailySalary * 15 * Math.min(serviceMonths / 12, 1);
        break;
      case 'vacation_allowance':
        // 50% of monthly salary
        amount = basicSalary * 0.5;
        break;
    }

    return Math.round(amount * 100) / 100; // Round to 2 decimal places
  }

  // Compliance Methods
  getComplianceRules(): ComplianceRule[] {
    return Array.from(this.complianceRules.values())
      .filter(rule => rule.isActive);
  }

  async checkCompliance(category?: string): Promise<{
    compliant: boolean;
    violations: any[];
    score: number;
  }> {
    const rules = category 
      ? this.getComplianceRules().filter(rule => rule.category === category)
      : this.getComplianceRules();

    const violations: any[] = [];
    let compliantRules = 0;

    for (const rule of rules) {
      const isCompliant = await this.checkRuleCompliance(rule);
      if (isCompliant) {
        compliantRules++;
      } else {
        violations.push({
          ruleId: rule.ruleId,
          title: rule.title,
          severity: rule.penalties?.severity || 'medium',
          description: rule.description
        });
      }
    }

    const score = rules.length > 0 ? (compliantRules / rules.length) * 100 : 100;

    return {
      compliant: violations.length === 0,
      violations,
      score: Math.round(score * 10) / 10
    };
  }

  private async checkRuleCompliance(rule: ComplianceRule): Promise<boolean> {
    // Simulate compliance checking logic
    // In a real implementation, this would check actual data against rule conditions
    return Math.random() > 0.01; // 99% compliance rate for demo
  }

  // Demo Data Generation
  async generateDemoData(): Promise<void> {
    // Generate demo digital work cards
    const demoEmployees = ['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'];
    for (const employeeId of demoEmployees) {
      await this.createDigitalWorkCard(employeeId);
    }

    // Generate demo ERGANI events
    const eventTypes: ERGANIEvent['type'][] = ['hire', 'schedule_declaration', 'overtime', 'leave'];
    for (let i = 0; i < 20; i++) {
      const employeeId = demoEmployees[Math.floor(Math.random() * demoEmployees.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      await this.createERGANIEvent(eventType, employeeId, {
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        details: `Demo ${eventType} event for ${employeeId}`
      });
    }

    console.log('[COMPLIANCE] Demo data generated for Greece compliance system');
  }
}

export const complianceConnector = new ComplianceConnector();