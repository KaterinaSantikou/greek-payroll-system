import { Request, Response } from 'express';
import { z } from 'zod';

// Evaluation metrics and benchmarks
export interface EvaluationMetrics {
  explainYourPay: ExplainYourPayMetrics;
  exceptionClassifier: ExceptionClassifierMetrics;
  scheduleRecommendations: ScheduleRecommendationMetrics;
  uxPerformance: UXPerformanceMetrics;
  systemPerformance: SystemPerformanceMetrics;
  evaluationPeriod: {
    startDate: string;
    endDate: string;
    dataPoints: number;
    confidenceInterval: number;
  };
}

interface ExplainYourPayMetrics {
  accuracyBenchmarks: {
    grossPayCalculation: {
      target: number; // 99.5%
      current: number;
      variance: number;
      sampleSize: number;
      testCases: AccuracyTestCase[];
    };
    deductionCalculation: {
      target: number; // 99.8%
      current: number;
      variance: number;
      sampleSize: number;
      testCases: AccuracyTestCase[];
    };
    netPayCalculation: {
      target: number; // 99.9%
      current: number;
      variance: number;
      sampleSize: number;
      testCases: AccuracyTestCase[];
    };
  };
  explanationQuality: {
    readabilityScore: {
      target: number; // 85 (Flesch reading ease)
      current: number;
      methodology: string;
    };
    completeness: {
      target: number; // 95% of pay components explained
      current: number;
      missingElements: string[];
    };
    userSatisfaction: {
      target: number; // 4.5/5 rating
      current: number;
      responseRate: number;
      feedback: string[];
    };
  };
  responseTime: {
    target: number; // 20 seconds maximum
    current: {
      median: number;
      p95: number;
      p99: number;
    };
    breakdown: {
      calculationTime: number;
      renderingTime: number;
      networkLatency: number;
    };
  };
}

interface ExceptionClassifierMetrics {
  precisionRecall: {
    overtimeExceptions: {
      precision: { target: number; current: number }; // 95%
      recall: { target: number; current: number }; // 98%
      f1Score: { target: number; current: number }; // 96.5%
      confusionMatrix: number[][];
    };
    complianceViolations: {
      precision: { target: number; current: number }; // 92%
      recall: { target: number; current: number }; // 99%
      f1Score: { target: number; current: number }; // 95.4%
      confusionMatrix: number[][];
    };
    scheduleConflicts: {
      precision: { target: number; current: number }; // 88%
      recall: { target: number; current: number }; // 95%
      f1Score: { target: number; current: number }; // 91.4%
      confusionMatrix: number[][];
    };
  };
  falsePositiveRate: {
    target: number; // <5%
    current: number;
    impact: {
      managerTime: number; // Hours wasted per month
      employeeFrustration: number; // Survey score
      systemCredibility: number; // Trust rating
    };
  };
  classificationSpeed: {
    target: number; // <100ms per classification
    current: {
      median: number;
      p95: number;
      p99: number;
    };
    batchProcessing: {
      throughput: number; // Classifications per second
      scalabilityLimit: number;
    };
  };
  modelDrift: {
    accuracyDegradation: number; // % decline per month
    retrainingThreshold: number; // Accuracy threshold for retraining
    lastRetraining: string;
    nextScheduledRetraining: string;
  };
}

interface ScheduleRecommendationMetrics {
  winRate: {
    managerAcceptance: {
      target: number; // 85%
      current: number;
      byRecommendationType: {
        overtimePrevention: number;
        shiftOptimization: number;
        complianceAlignment: number;
        costReduction: number;
      };
    };
    employeeSatisfaction: {
      target: number; // 80%
      current: number;
      factors: {
        workLifeBalance: number;
        fairnessPerception: number;
        preferenceRespect: number;
        advanceNotice: number;
      };
    };
  };
  implementationImpact: {
    overtimeReduction: {
      target: number; // 15% reduction
      current: number;
      costSavings: number; // EUR per month
    };
    complianceImprovement: {
      target: number; // 25% fewer violations
      current: number;
      riskReduction: number; // Compliance risk score
    };
    efficiencyGains: {
      target: number; // 10% improvement
      current: number;
      laborProductivity: number;
      schedulingTime: number; // Manager time saved per week
    };
  };
  recommendationQuality: {
    relevanceScore: {
      target: number; // 90%
      current: number;
      methodology: string;
    };
    feasibilityScore: {
      target: number; // 88%
      current: number;
      constraints: string[];
    };
    diversityIndex: {
      target: number; // 0.7 (avoid recommendation bias)
      current: number;
      biasMetrics: {
        departmentBias: number;
        roleBias: number;
        tenureBias: number;
      };
    };
  };
}

interface UXPerformanceMetrics {
  paletteSearchLatency: {
    target: number; // 300ms
    current: {
      median: number;
      p95: number;
      p99: number;
    };
    breakdown: {
      indexingTime: number;
      searchAlgorithm: number;
      renderingTime: number;
      networkTime: number;
    };
    optimizations: {
      caching: boolean;
      indexPreload: boolean;
      incrementalSearch: boolean;
    };
  };
  exceptionApprovalFlow: {
    clicksToApprove: {
      target: number; // 2 clicks maximum
      current: {
        median: number;
        mode: number;
        p95: number;
      };
      flowBreakdown: {
        navigation: number;
        review: number;
        approval: number;
        confirmation: number;
      };
    };
    approvalCompletionRate: {
      target: number; // 95%
      current: number;
      dropOffPoints: {
        reviewStage: number;
        confirmationStage: number;
        errorStates: number;
      };
    };
    errorRecovery: {
      errorRate: number;
      recoveryTime: number; // Average time to resolve errors
      userSatisfaction: number;
    };
  };
  explanationReadability: {
    readingTime: {
      target: number; // 20 seconds
      current: {
        median: number;
        p95: number;
      };
      factors: {
        wordCount: number;
        complexity: number;
        visualAids: number;
      };
    };
    comprehensionRate: {
      target: number; // 90%
      current: number;
      testMethodology: string;
      sampleSize: number;
    };
    actionableInsights: {
      target: number; // 75% of explanations lead to action
      current: number;
      actionTypes: {
        scheduleAdjustments: number;
        policyQuestions: number;
        disputeResolutions: number;
      };
    };
  };
}

interface SystemPerformanceMetrics {
  apiResponseTimes: {
    timesheets: { target: number; current: number };
    payslips: { target: number; current: number };
    rulesets: { target: number; current: number };
    analytics: { target: number; current: number };
  };
  throughputLimits: {
    concurrentUsers: { max: number; tested: number };
    payrollProcessing: { recordsPerHour: number };
    reportGeneration: { reportsPerMinute: number };
  };
  systemReliability: {
    uptime: { target: number; current: number };
    errorRate: { target: number; current: number };
    dataIntegrity: { target: number; current: number };
  };
}

interface AccuracyTestCase {
  id: string;
  description: string;
  expected: number;
  calculated: number;
  variance: number;
  status: 'pass' | 'fail' | 'warning';
  timestamp: string;
}

// GET /api/evaluation/current - Current evaluation metrics
export async function getCurrentEvaluationMetrics(req: Request, res: Response) {
  try {
    const { period = '30d', includeDetails = 'false' } = req.query;

    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    // Only managers, HR, and auditors can access evaluation metrics
    if (!['manager', 'hr', 'auditor', 'payroll'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const metrics = await generateEvaluationMetrics(
      period as string,
      includeDetails === 'true'
    );
    const filteredMetrics = await applyEvaluationRoleFiltering(
      metrics,
      userRole
    );

    res.json({
      metrics: filteredMetrics,
      generatedAt: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Daily updates
    });
  } catch (error) {
    console.error('Error fetching evaluation metrics:', error);
    res.status(500).json({ error: 'Failed to fetch evaluation metrics' });
  }
}

// GET /api/evaluation/benchmarks - System benchmarks and targets
export async function getSystemBenchmarks(req: Request, res: Response) {
  try {
    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    if (!['hr', 'auditor', 'payroll'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const benchmarks = await getSystemBenchmarkTargets();

    res.json({
      benchmarks,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: 'Failed to fetch benchmarks' });
  }
}

// POST /api/evaluation/test-case - Submit new test case for accuracy evaluation
export async function submitTestCase(req: Request, res: Response) {
  try {
    const testCase = req.body;

    const userId = req.user?.claims?.sub;
    const userRole = await getUserRole(userId);

    // Only payroll and auditors can submit test cases
    if (!['payroll', 'auditor'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await processTestCase(testCase);

    res.json({
      testCaseId: result.id,
      status: result.status,
      results: result.results,
      submittedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing test case:', error);
    res.status(500).json({ error: 'Failed to process test case' });
  }
}

// Helper functions
async function generateEvaluationMetrics(
  period: string,
  includeDetails: boolean
): Promise<EvaluationMetrics> {
  // Mock comprehensive evaluation metrics
  return {
    explainYourPay: {
      accuracyBenchmarks: {
        grossPayCalculation: {
          target: 99.5,
          current: 99.7,
          variance: 0.2,
          sampleSize: 1247,
          testCases: includeDetails
            ? [
                {
                  id: 'TC-001',
                  description: 'Regular + OT + Night Premium',
                  expected: 2845.5,
                  calculated: 2845.5,
                  variance: 0.0,
                  status: 'pass',
                  timestamp: new Date().toISOString(),
                },
                {
                  id: 'TC-002',
                  description: 'Part-time with Sunday premium',
                  expected: 1234.75,
                  calculated: 1234.8,
                  variance: 0.05,
                  status: 'warning',
                  timestamp: new Date().toISOString(),
                },
              ]
            : [],
        },
        deductionCalculation: {
          target: 99.8,
          current: 99.9,
          variance: 0.1,
          sampleSize: 1247,
          testCases: [],
        },
        netPayCalculation: {
          target: 99.9,
          current: 99.8,
          variance: -0.1,
          sampleSize: 1247,
          testCases: [],
        },
      },
      explanationQuality: {
        readabilityScore: {
          target: 85,
          current: 87.3,
          methodology: 'Flesch Reading Ease',
        },
        completeness: {
          target: 95,
          current: 94.2,
          missingElements: ['EFKA special categories', 'Holiday pay breakdown'],
        },
        userSatisfaction: {
          target: 4.5,
          current: 4.3,
          responseRate: 73.5,
          feedback: [
            'Very clear breakdown of overtime calculations',
            'Would like more detail on tax calculations',
            'Great visual representation',
          ],
        },
      },
      responseTime: {
        target: 20,
        current: {
          median: 12.3,
          p95: 18.7,
          p99: 22.1,
        },
        breakdown: {
          calculationTime: 8.5,
          renderingTime: 2.8,
          networkLatency: 1.0,
        },
      },
    },
    exceptionClassifier: {
      precisionRecall: {
        overtimeExceptions: {
          precision: { target: 95, current: 96.2 },
          recall: { target: 98, current: 97.8 },
          f1Score: { target: 96.5, current: 97.0 },
          confusionMatrix: [
            [1205, 48],
            [28, 1847],
          ],
        },
        complianceViolations: {
          precision: { target: 92, current: 93.1 },
          recall: { target: 99, current: 98.9 },
          f1Score: { target: 95.4, current: 95.9 },
          confusionMatrix: [
            [892, 65],
            [12, 1078],
          ],
        },
        scheduleConflicts: {
          precision: { target: 88, current: 89.7 },
          recall: { target: 95, current: 94.3 },
          f1Score: { target: 91.4, current: 91.9 },
          confusionMatrix: [
            [756, 87],
            [45, 789],
          ],
        },
      },
      falsePositiveRate: {
        target: 5,
        current: 4.2,
        impact: {
          managerTime: 2.3,
          employeeFrustration: 2.8,
          systemCredibility: 4.1,
        },
      },
      classificationSpeed: {
        target: 100,
        current: {
          median: 67,
          p95: 89,
          p99: 124,
        },
        batchProcessing: {
          throughput: 450,
          scalabilityLimit: 1200,
        },
      },
      modelDrift: {
        accuracyDegradation: 0.8,
        retrainingThreshold: 93.0,
        lastRetraining: '2025-01-01T00:00:00Z',
        nextScheduledRetraining: '2025-04-01T00:00:00Z',
      },
    },
    scheduleRecommendations: {
      winRate: {
        managerAcceptance: {
          target: 85,
          current: 87.3,
          byRecommendationType: {
            overtimePrevention: 92.1,
            shiftOptimization: 84.7,
            complianceAlignment: 89.2,
            costReduction: 82.8,
          },
        },
        employeeSatisfaction: {
          target: 80,
          current: 78.9,
          factors: {
            workLifeBalance: 81.2,
            fairnessPerception: 76.8,
            preferenceRespect: 79.1,
            advanceNotice: 78.5,
          },
        },
      },
      implementationImpact: {
        overtimeReduction: {
          target: 15,
          current: 17.3,
          costSavings: 8472.5,
        },
        complianceImprovement: {
          target: 25,
          current: 28.7,
          riskReduction: 34.2,
        },
        efficiencyGains: {
          target: 10,
          current: 12.1,
          laborProductivity: 11.8,
          schedulingTime: 3.2,
        },
      },
      recommendationQuality: {
        relevanceScore: {
          target: 90,
          current: 91.4,
          methodology: 'Manager feedback + outcome tracking',
        },
        feasibilityScore: {
          target: 88,
          current: 86.7,
          constraints: [
            'Minimum staffing',
            'Employee availability',
            'Labor costs',
          ],
        },
        diversityIndex: {
          target: 0.7,
          current: 0.74,
          biasMetrics: {
            departmentBias: 0.12,
            roleBias: 0.08,
            tenureBias: 0.05,
          },
        },
      },
    },
    uxPerformance: {
      paletteSearchLatency: {
        target: 300,
        current: {
          median: 187,
          p95: 267,
          p99: 312,
        },
        breakdown: {
          indexingTime: 89,
          searchAlgorithm: 67,
          renderingTime: 23,
          networkTime: 8,
        },
        optimizations: {
          caching: true,
          indexPreload: true,
          incrementalSearch: true,
        },
      },
      exceptionApprovalFlow: {
        clicksToApprove: {
          target: 2,
          current: {
            median: 2,
            mode: 2,
            p95: 3,
          },
          flowBreakdown: {
            navigation: 1,
            review: 1,
            approval: 1,
            confirmation: 0,
          },
        },
        approvalCompletionRate: {
          target: 95,
          current: 96.8,
          dropOffPoints: {
            reviewStage: 1.2,
            confirmationStage: 0.8,
            errorStates: 1.2,
          },
        },
        errorRecovery: {
          errorRate: 2.3,
          recoveryTime: 45.2,
          userSatisfaction: 3.9,
        },
      },
      explanationReadability: {
        readingTime: {
          target: 20,
          current: {
            median: 16.7,
            p95: 19.2,
          },
          factors: {
            wordCount: 127,
            complexity: 3.2,
            visualAids: 4,
          },
        },
        comprehensionRate: {
          target: 90,
          current: 91.3,
          testMethodology: 'Post-explanation quiz',
          sampleSize: 312,
        },
        actionableInsights: {
          target: 75,
          current: 78.9,
          actionTypes: {
            scheduleAdjustments: 45.2,
            policyQuestions: 22.1,
            disputeResolutions: 11.6,
          },
        },
      },
    },
    systemPerformance: {
      apiResponseTimes: {
        timesheets: { target: 200, current: 145 },
        payslips: { target: 300, current: 267 },
        rulesets: { target: 100, current: 78 },
        analytics: { target: 500, current: 423 },
      },
      throughputLimits: {
        concurrentUsers: { max: 500, tested: 450 },
        payrollProcessing: { recordsPerHour: 12000 },
        reportGeneration: { reportsPerMinute: 25 },
      },
      systemReliability: {
        uptime: { target: 99.9, current: 99.94 },
        errorRate: { target: 0.1, current: 0.08 },
        dataIntegrity: { target: 99.99, current: 99.99 },
      },
    },
    evaluationPeriod: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      dataPoints: 15748,
      confidenceInterval: 95.0,
    },
  };
}

async function getSystemBenchmarkTargets() {
  return {
    accuracy: {
      payCalculations: 99.5,
      deductionCalculations: 99.8,
      netPayCalculations: 99.9,
    },
    performance: {
      paletteSearchLatency: 300,
      apiResponseTime: 200,
      explanationReadingTime: 20,
    },
    userExperience: {
      clicksToApprove: 2,
      approvalCompletionRate: 95,
      comprehensionRate: 90,
    },
    aiMetrics: {
      exceptionPrecision: 95,
      exceptionRecall: 98,
      recommendationWinRate: 85,
    },
  };
}

async function getUserRole(userId: string): Promise<string> {
  return 'manager'; // Mock role
}

async function applyEvaluationRoleFiltering(
  metrics: EvaluationMetrics,
  role: string
): Promise<Partial<EvaluationMetrics>> {
  switch (role) {
    case 'manager':
      // Managers see operational metrics but not detailed system internals
      return {
        explainYourPay: {
          explanationQuality: metrics.explainYourPay.explanationQuality,
          responseTime: metrics.explainYourPay.responseTime,
          accuracyBenchmarks: {
            grossPayCalculation: {
              target:
                metrics.explainYourPay.accuracyBenchmarks.grossPayCalculation
                  .target,
              current:
                metrics.explainYourPay.accuracyBenchmarks.grossPayCalculation
                  .current,
              variance:
                metrics.explainYourPay.accuracyBenchmarks.grossPayCalculation
                  .variance,
              sampleSize:
                metrics.explainYourPay.accuracyBenchmarks.grossPayCalculation
                  .sampleSize,
              testCases: [],
            },
            deductionCalculation: {
              target:
                metrics.explainYourPay.accuracyBenchmarks.deductionCalculation
                  .target,
              current:
                metrics.explainYourPay.accuracyBenchmarks.deductionCalculation
                  .current,
              variance:
                metrics.explainYourPay.accuracyBenchmarks.deductionCalculation
                  .variance,
              sampleSize:
                metrics.explainYourPay.accuracyBenchmarks.deductionCalculation
                  .sampleSize,
              testCases: [],
            },
            netPayCalculation: {
              target:
                metrics.explainYourPay.accuracyBenchmarks.netPayCalculation
                  .target,
              current:
                metrics.explainYourPay.accuracyBenchmarks.netPayCalculation
                  .current,
              variance:
                metrics.explainYourPay.accuracyBenchmarks.netPayCalculation
                  .variance,
              sampleSize:
                metrics.explainYourPay.accuracyBenchmarks.netPayCalculation
                  .sampleSize,
              testCases: [],
            },
          },
        },
        scheduleRecommendations: metrics.scheduleRecommendations,
        uxPerformance: metrics.uxPerformance,
        evaluationPeriod: metrics.evaluationPeriod,
      };
    case 'hr':
    case 'auditor':
      // Full access to all evaluation metrics
      return metrics;
    case 'payroll':
      // Payroll sees accuracy and system performance metrics
      return {
        explainYourPay: metrics.explainYourPay,
        exceptionClassifier: metrics.exceptionClassifier,
        systemPerformance: metrics.systemPerformance,
        evaluationPeriod: metrics.evaluationPeriod,
      };
    default:
      throw new Error('Unauthorized access to evaluation metrics');
  }
}

async function processTestCase(testCase: any) {
  // Mock test case processing
  return {
    id: `TC-${Date.now()}`,
    status: 'completed',
    results: {
      accuracy: 99.9,
      variance: 0.1,
      passed: true,
    },
  };
}

export const evaluationRoutes = {
  getCurrentEvaluationMetrics,
  getSystemBenchmarks,
  submitTestCase,
};
