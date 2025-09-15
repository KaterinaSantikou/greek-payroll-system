/**
 * Mock GRC API endpoints for ISO 27001 + SOC 2 compliance dashboard
 * Used for demonstration while database schema is being set up
 */

import type { Express, Request, Response } from 'express';

// Mock data interfaces
interface MockComplianceDashboard {
  overview: {
    total: number;
    applicable: number;
    implemented: number;
    inProgress: number;
    notStarted: number;
  };
  riskSummary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  evidenceFreshness: {
    total: number;
    fresh: number;
    warning: number;
    expired: number;
  };
  recentActivity: Array<{
    id: string;
    eventType: string;
    eventAction: string;
    timestamp: string;
  }>;
}

interface MockControl {
  id: string;
  framework: string;
  controlId: string;
  title: string;
  category: string;
  riskLevel: string;
  automatable: boolean;
  soa?: {
    status: string;
    implementationStatus: string;
    owner?: string;
    lastReviewed?: string;
  };
  evidenceCount: number;
  implementationProgress: {
    status: string;
    progress: number;
    hasEvidence: boolean;
  };
}

// Mock data
const mockDashboard: MockComplianceDashboard = {
  overview: {
    total: 144,
    applicable: 132,
    implemented: 89,
    inProgress: 28,
    notStarted: 15,
  },
  riskSummary: {
    total: 45,
    critical: 3,
    high: 8,
    medium: 21,
    low: 13,
  },
  evidenceFreshness: {
    total: 267,
    fresh: 198,
    warning: 42,
    expired: 27,
  },
  recentActivity: [
    {
      id: '1',
      eventType: 'Evidence',
      eventAction: 'uploaded for A.5.1 - Information Security Policies',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      eventType: 'Control',
      eventAction: 'implemented A.8.2 - Information Classification',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      eventType: 'Finding',
      eventAction: 'resolved high-severity vulnerability in web application',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
};

const mockControls: MockControl[] = [
  {
    id: 'iso-a51',
    framework: 'ISO 27001',
    controlId: 'A.5.1',
    title: 'Information Security Policies',
    category: 'Organizational Controls',
    riskLevel: 'High',
    automatable: false,
    soa: {
      status: 'Applicable',
      implementationStatus: 'Implemented',
      owner: 'CISO',
      lastReviewed: '2024-12-01',
    },
    evidenceCount: 8,
    implementationProgress: {
      status: 'Implemented',
      progress: 100,
      hasEvidence: true,
    },
  },
  {
    id: 'iso-a82',
    framework: 'ISO 27001',
    controlId: 'A.8.2',
    title: 'Information Classification',
    category: 'Information Security',
    riskLevel: 'Medium',
    automatable: true,
    soa: {
      status: 'Applicable',
      implementationStatus: 'InProgress',
      owner: 'Data Protection Officer',
      lastReviewed: '2024-11-15',
    },
    evidenceCount: 3,
    implementationProgress: {
      status: 'InProgress',
      progress: 65,
      hasEvidence: true,
    },
  },
  {
    id: 'soc2-cc61',
    framework: 'SOC 2',
    controlId: 'CC6.1',
    title: 'Logical and Physical Access Controls',
    category: 'Common Criteria',
    riskLevel: 'Critical',
    automatable: true,
    soa: {
      status: 'Applicable',
      implementationStatus: 'Implemented',
      owner: 'IT Security Team',
      lastReviewed: '2024-12-10',
    },
    evidenceCount: 12,
    implementationProgress: {
      status: 'Implemented',
      progress: 95,
      hasEvidence: true,
    },
  },
];

const mockFindingsDashboard = {
  summary: {
    total: 47,
    open: 12,
    inProgress: 18,
    resolved: 17,
    overdue: 5,
  },
  bySeverity: {
    Critical: 2,
    High: 8,
    Medium: 21,
    Low: 16,
  },
  bySource: {
    PenTest: 15,
    VulnScan: 28,
    CodeScan: 4,
  },
  slaStatus: {
    onTime: 35,
    atRisk: 7,
    overdue: 5,
  },
  recentFindings: [
    {
      id: 'finding-001',
      title: 'SQL Injection in User Authentication',
      severity: 'Critical',
      status: 'Open',
      discoveredAt: '2024-12-08T10:30:00Z',
    },
    {
      id: 'finding-002',
      title: 'Missing HTTPS Enforcement',
      severity: 'High',
      status: 'InProgress',
      discoveredAt: '2024-12-07T14:20:00Z',
    },
  ],
};

const mockCheckResults = [
  {
    id: 'check-001',
    checkName: 'AWS S3 Bucket Encryption',
    controlTitle: 'A.10.1.1 - Cryptographic Controls',
    checkType: 'AWS',
    result: 'Pass',
    score: 100,
  },
  {
    id: 'check-002',
    checkName: 'GitHub Branch Protection',
    controlTitle: 'A.12.1.2 - Change Management',
    checkType: 'GitHub',
    result: 'Fail',
    score: 45,
  },
  {
    id: 'check-003',
    checkName: 'Okta MFA Enforcement',
    controlTitle: 'A.9.4.2 - Secure Log-on Procedures',
    checkType: 'Okta',
    result: 'Pass',
    score: 95,
  },
];

export function registerMockGRCRoutes(app: Express): void {
  // Dashboard overview
  app.get('/api/grc/dashboard', (req: Request, res: Response) => {
    res.json(mockDashboard);
  });

  // Statement of Applicability
  app.get('/api/grc/soa', (req: Request, res: Response) => {
    const summary = {
      total: mockControls.length,
      applicable: mockControls.filter(c => c.soa?.status === 'Applicable')
        .length,
      implemented: mockControls.filter(
        c => c.soa?.implementationStatus === 'Implemented'
      ).length,
      inProgress: mockControls.filter(
        c => c.soa?.implementationStatus === 'InProgress'
      ).length,
      notStarted: mockControls.filter(
        c => c.soa?.implementationStatus === 'NotStarted'
      ).length,
    };

    res.json({
      controls: mockControls,
      summary,
    });
  });

  // Findings dashboard
  app.get('/api/grc/findings/dashboard', (req: Request, res: Response) => {
    res.json(mockFindingsDashboard);
  });

  // Automated check results
  app.get('/api/grc/checks/results', (req: Request, res: Response) => {
    res.json(mockCheckResults);
  });

  // Evidence library
  app.get('/api/grc/evidence', (req: Request, res: Response) => {
    const mockEvidence = [
      {
        id: 'evidence-001',
        title: 'Information Security Policy Document',
        type: 'Document',
        controlId: 'A.5.1',
        freshnessStatus: 'Fresh',
        lastUpdated: '2024-12-01T10:00:00Z',
      },
      {
        id: 'evidence-002',
        title: 'AWS Config Compliance Report',
        type: 'AutomatedCheck',
        controlId: 'CC6.1',
        freshnessStatus: 'Warning',
        lastUpdated: '2024-11-20T15:30:00Z',
      },
    ];

    res.json(mockEvidence);
  });
}
