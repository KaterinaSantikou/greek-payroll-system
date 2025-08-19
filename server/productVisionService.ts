export interface ProductPrinciple {
  id: string;
  title: string;
  description: string;
  features: string[];
  status: 'active' | 'development' | 'planned';
  metrics?: {
    target: string;
    current: string;
    progress: number;
  };
}

export interface AutomationStep {
  step: string;
  description: string;
  duration: number; // in seconds
  dependencies: string[];
  integrations: string[];
}

export interface UXMetric {
  metric: string;
  target: string;
  current: string;
  progress: number;
  benchmark?: string;
}

export class ProductVisionService {
  private principles: Map<string, ProductPrinciple> = new Map();
  private automationSteps: AutomationStep[] = [];
  private uxMetrics: Map<string, UXMetric> = new Map();

  constructor() {
    this.initializePrinciples();
    this.initializeAutomationFlow();
    this.initializeUXMetrics();
  }

  private initializePrinciples(): void {
    const principles: ProductPrinciple[] = [
      {
        id: "compliance-first",
        title: "Compliance-first by design",
        description: "Greek law encoded as machine-readable rules with automatic updates",
        features: [
          "Machine-readable Greek labor law rules",
          "Automatic regulatory updates with effective dates",
          "Real-time compliance validation",
          "ERGANI II, e-EFKA, AADE integration",
          "Digital Work Card compliance",
          "Collective agreements engine"
        ],
        status: "active",
        metrics: {
          target: "100% compliance",
          current: "99.9% compliance",
          progress: 99
        }
      },
      {
        id: "automation-everywhere",
        title: "Automation everywhere",
        description: "From Digital Work Card to SEPA payments and GL postings",
        features: [
          "Digital Work Card → timesheets",
          "Timesheets → payroll calculations",
          "Payroll → regulatory filings",
          "Filings → SEPA payments",
          "Payments → GL postings",
          "Zero manual intervention"
        ],
        status: "active",
        metrics: {
          target: "100% automation",
          current: "98.5% automation",
          progress: 98
        }
      },
      {
        id: "single-source-truth",
        title: "Single source of truth",
        description: "One employee graph across entities, properties, and departments",
        features: [
          "Unified employee master data",
          "Multi-property employee management",
          "Cross-department cost center allocation",
          "Centralized organizational hierarchy",
          "Real-time data synchronization"
        ],
        status: "active",
        metrics: {
          target: "100% data consistency",
          current: "99.8% data consistency",
          progress: 99
        }
      },
      {
        id: "opinionated-ux",
        title: "Opinionated UX",
        description: "90-second payroll run for 150 employees, zero manual keying",
        features: [
          "90-second payroll processing",
          "Zero manual data entry",
          "One-click recurring filings",
          "Streamlined user workflows",
          "Contextual automation"
        ],
        status: "active",
        metrics: {
          target: "90 seconds",
          current: "75 seconds",
          progress: 95
        }
      },
      {
        id: "api-first",
        title: "Open, API-first",
        description: "REST/GraphQL for HRIS, T&A, accounting/ERP, banks",
        features: [
          "RESTful API architecture",
          "GraphQL query capabilities",
          "HRIS system integrations",
          "Banking and ERP connectors",
          "Real-time webhooks",
          "Developer-friendly documentation"
        ],
        status: "active",
        metrics: {
          target: "100% API coverage",
          current: "95% API coverage",
          progress: 95
        }
      },
      {
        id: "hotel-ready",
        title: "Hotel-ready",
        description: "Seasonal hires, split shifts, tip pooling, multi-property",
        features: [
          "Seasonal workforce management",
          "Split shift scheduling",
          "Tip pooling calculations",
          "Multi-property operations",
          "Department-specific workflows",
          "Greek tourism law compliance"
        ],
        status: "active",
        metrics: {
          target: "Full hotel coverage",
          current: "95% hotel features",
          progress: 95
        }
      }
    ];

    principles.forEach(principle => {
      this.principles.set(principle.id, principle);
    });
  }

  private initializeAutomationFlow(): void {
    this.automationSteps = [
      {
        step: "Digital Work Card",
        description: "Employee clock in/out with biometric verification",
        duration: 2,
        dependencies: [],
        integrations: ["ERGANI II", "Mobile App", "Kiosk Systems"]
      },
      {
        step: "Timesheets",
        description: "Automated time capture and validation",
        duration: 5,
        dependencies: ["Digital Work Card"],
        integrations: ["Policy Engine", "Schedule Management"]
      },
      {
        step: "Payroll",
        description: "Greek law calculations with collective agreements",
        duration: 25,
        dependencies: ["Timesheets"],
        integrations: ["Tax Engine", "EFKA Calculator", "CBA Engine"]
      },
      {
        step: "Filings",
        description: "ERGANI/EFKA/AADE automated submissions",
        duration: 15,
        dependencies: ["Payroll"],
        integrations: ["ERGANI II", "e-EFKA", "AADE ΦΜΥ"]
      },
      {
        step: "SEPA Payments",
        description: "Bank transfers and payment processing",
        duration: 10,
        dependencies: ["Filings"],
        integrations: ["Banking APIs", "SEPA Network"]
      },
      {
        step: "GL Postings",
        description: "Accounting entries and financial reporting",
        duration: 8,
        dependencies: ["SEPA Payments"],
        integrations: ["ERP Systems", "Accounting Software"]
      }
    ];
  }

  private initializeUXMetrics(): void {
    const metrics: UXMetric[] = [
      {
        metric: "Payroll Processing",
        target: "90 seconds",
        current: "75 seconds",
        progress: 95,
        benchmark: "Industry: 4-6 hours"
      },
      {
        metric: "Manual Data Entry",
        target: "0%",
        current: "2%",
        progress: 98,
        benchmark: "Industry: 25-40%"
      },
      {
        metric: "Filing Automation",
        target: "100%",
        current: "98%",
        progress: 98,
        benchmark: "Industry: 60-70%"
      },
      {
        metric: "Employee Capacity",
        target: "150 employees",
        current: "200+ employees",
        progress: 100,
        benchmark: "Scalable architecture"
      },
      {
        metric: "Compliance Accuracy",
        target: "100%",
        current: "99.9%",
        progress: 99,
        benchmark: "Industry: 85-95%"
      },
      {
        metric: "User Satisfaction",
        target: "95%",
        current: "94%",
        progress: 99,
        benchmark: "Gusto-level UX"
      }
    ];

    metrics.forEach(metric => {
      this.uxMetrics.set(metric.metric.toLowerCase().replace(/\s+/g, '-'), metric);
    });
  }

  // Get all product principles
  getPrinciples(): ProductPrinciple[] {
    return Array.from(this.principles.values());
  }

  // Get specific principle
  getPrinciple(id: string): ProductPrinciple | undefined {
    return this.principles.get(id);
  }

  // Get automation flow
  getAutomationFlow(): AutomationStep[] {
    return this.automationSteps;
  }

  // Calculate total automation time
  getTotalAutomationTime(): number {
    return this.automationSteps.reduce((total, step) => total + step.duration, 0);
  }

  // Get UX metrics
  getUXMetrics(): UXMetric[] {
    return Array.from(this.uxMetrics.values());
  }

  // Get specific UX metric
  getUXMetric(metricId: string): UXMetric | undefined {
    return this.uxMetrics.get(metricId);
  }

  // Update principle status
  updatePrincipleStatus(id: string, status: 'active' | 'development' | 'planned'): boolean {
    const principle = this.principles.get(id);
    if (!principle) return false;
    
    principle.status = status;
    return true;
  }

  // Update UX metric
  updateUXMetric(metricId: string, current: string, progress: number): boolean {
    const metric = this.uxMetrics.get(metricId);
    if (!metric) return false;
    
    metric.current = current;
    metric.progress = progress;
    return true;
  }

  // Get compliance metrics
  getComplianceMetrics() {
    return {
      overall: 99.9,
      ergani: 100,
      efka: 99.8,
      aade: 99.9,
      digitalWorkCard: 100,
      collectiveAgreements: 98.5
    };
  }

  // Get automation benefits
  getAutomationBenefits() {
    return {
      timeSavings: 95, // percentage reduction
      errorReduction: 99.9, // accuracy percentage
      complianceAssurance: 100, // automation percentage
      costEfficiency: 80 // cost reduction percentage
    };
  }

  // Get API architecture info
  getAPIArchitecture() {
    return {
      restEndpoints: [
        { path: "/api/employees", description: "Employee management", methods: ["GET", "POST", "PUT", "DELETE"] },
        { path: "/api/payroll", description: "Payroll processing", methods: ["GET", "POST"] },
        { path: "/api/compliance", description: "Compliance filings", methods: ["GET", "POST"] },
        { path: "/api/timesheets", description: "Time tracking", methods: ["GET", "POST", "PUT"] },
        { path: "/api/properties", description: "Multi-property management", methods: ["GET", "POST", "PUT"] }
      ],
      graphqlCapabilities: [
        "Employee graph queries",
        "Multi-property data fetching",
        "Complex relationship queries",
        "Real-time subscriptions"
      ],
      integrations: [
        "HRIS systems",
        "Time & Attendance",
        "Accounting/ERP",
        "Banking APIs",
        "Government systems"
      ]
    };
  }

  // Get hotel-specific features
  getHotelFeatures() {
    return {
      seasonalWorkforce: {
        enabled: true,
        features: ["Batch hiring", "Seasonal contracts", "Automatic termination"]
      },
      splitShifts: {
        enabled: true,
        features: ["Cross-department scheduling", "Break management", "Coverage validation"]
      },
      tipPooling: {
        enabled: true,
        features: ["Automatic calculations", "Department allocation", "Tax compliance"]
      },
      multiProperty: {
        enabled: true,
        features: ["Centralized management", "Property-specific rules", "Cross-property transfers"]
      },
      greekTourismLaw: {
        enabled: true,
        features: ["Tourism-specific regulations", "Seasonal exemptions", "Special allowances"]
      }
    };
  }
}

export const productVisionService = new ProductVisionService();