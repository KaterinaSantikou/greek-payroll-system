import { storage } from "./storage";

export interface SeasonalityToolkit {
  seasonId: string;
  propertyId: string;
  seasonName: string;
  startDate: Date;
  endDate: Date;
  operations: {
    batchHiring: {
      enabled: boolean;
      targetPositions: Array<{
        department: string;
        position: string;
        targetCount: number;
        priorityLevel: 'high' | 'medium' | 'low';
        requiredSkills: string[];
        wageRange: { min: number; max: number };
      }>;
      automatedScreening: boolean;
      bulkOnboardingEnabled: boolean;
    };
    massContractRenewals: {
      enabled: boolean;
      renewalCriteria: {
        performanceThreshold: number;
        attendanceThreshold: number;
        minSeasonWorked: number;
      };
      renewalTerms: {
        wageIncrease: number;
        bonusEligibility: boolean;
        benefitsUpgrade: boolean;
      };
      automatedRenewal: boolean;
    };
    seniorityCarryOver: {
      enabled: boolean;
      rules: {
        carryOverPeriod: number; // months
        seniorityMultiplier: number;
        benefitAcceleration: boolean;
        wageProgressionAccelerated: boolean;
      };
      seniorityCategories: Array<{
        categoryName: string;
        minPreviousSeasons: number;
        benefitMultiplier: number;
        specialPrivileges: string[];
      }>;
    };
  };
  metrics: {
    rehireRate: number;
    retentionRate: number;
    productivityImprovement: number;
    costSavings: number;
  };
}

export interface AccommodationMealAllowances {
  propertyId: string;
  allowancePolicy: {
    accommodation: {
      enabled: boolean;
      perDayCap: number;
      accommodationTypes: Array<{
        type: 'shared_room' | 'single_room' | 'apartment' | 'hostel';
        dailyRate: number;
        maxDays: number;
        eligibilityCriteria: {
          minContractDays: number;
          departments: string[];
          seniorityLevel: string[];
        };
      }>;
      seasonalRates: {
        peakSeasonMultiplier: number;
        offSeasonMultiplier: number;
      };
    };
    meals: {
      enabled: boolean;
      perDayCap: number;
      mealTypes: Array<{
        type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
        maxAmount: number;
        eligibleShifts: string[];
        departments: string[];
      }>;
      mealVouchers: {
        enabled: boolean;
        vendorNetworks: string[];
        reimbursementRate: number;
      };
    };
  };
  taxImplications: {
    taxFreeThreshold: number;
    taxableAmount: number;
    reportingRequirements: {
      monthlyDeclaration: boolean;
      employeeNotification: boolean;
    };
  };
}

export interface TipPoolingEngine {
  poolId: string;
  propertyId: string;
  poolName: string;
  configuration: {
    roleWeights: Array<{
      role: string;
      department: string;
      baseWeight: number;
      seniorityMultiplier: number;
      performanceMultiplier: number;
    }>;
    distributionRules: {
      shiftBased: {
        enabled: boolean;
        shiftWeights: {
          morning: number;
          afternoon: number;
          evening: number;
          night: number;
        };
      };
      hoursBased: {
        enabled: boolean;
        minimumHours: number;
        hoursMultiplier: number;
      };
      guestFeedbackMultiplier: {
        enabled: boolean;
        feedbackSources: string[];
        ratingThresholds: {
          excellent: { threshold: number; multiplier: number };
          good: { threshold: number; multiplier: number };
          average: { threshold: number; multiplier: number };
        };
      };
    };
    poolingPeriod: 'daily' | 'weekly' | 'monthly';
    distributionMethod: 'equal' | 'weighted' | 'performance_based';
  };
  analytics: {
    totalTipsCollected: number;
    averagePerEmployee: number;
    topPerformers: Array<{
      employeeId: string;
      employeeName: string;
      tipAmount: number;
      performanceScore: number;
    }>;
    departmentBreakdown: Array<{
      department: string;
      totalTips: number;
      employeeCount: number;
      averagePerEmployee: number;
    }>;
  };
}

export interface SplitShiftCosting {
  splitId: string;
  employeeId: string;
  date: Date;
  segments: Array<{
    segmentId: string;
    startTime: string;
    endTime: string;
    outlet: string;
    department: string;
    costCenter: string;
    hoursWorked: number;
    laborCost: number;
    activities: string[];
    supervisorId?: string;
  }>;
  costingBreakdown: {
    totalHours: number;
    totalLaborCost: number;
    outletDistribution: Array<{
      outlet: string;
      hours: number;
      cost: number;
      percentage: number;
    }>;
    departmentDistribution: Array<{
      department: string;
      hours: number;
      cost: number;
      percentage: number;
    }>;
  };
  complianceChecks: {
    maxDailyHours: boolean;
    minimumRestPeriod: boolean;
    overtimeRules: boolean;
    breakRequirements: boolean;
  };
}

export class HotelEnhancementsService {
  
  async createSeasonalityPlan(seasonData: Partial<SeasonalityToolkit>): Promise<SeasonalityToolkit> {
    const seasonId = `season_${Date.now()}`;
    
    const defaultSeason: SeasonalityToolkit = {
      seasonId,
      propertyId: seasonData.propertyId || 'default',
      seasonName: seasonData.seasonName || 'Summer 2025',
      startDate: seasonData.startDate || new Date('2025-05-01'),
      endDate: seasonData.endDate || new Date('2025-09-30'),
      operations: {
        batchHiring: {
          enabled: true,
          targetPositions: [
            {
              department: 'Housekeeping',
              position: 'Room Attendant',
              targetCount: 25,
              priorityLevel: 'high',
              requiredSkills: ['Cleaning', 'Time Management'],
              wageRange: { min: 880, max: 1200 }
            },
            {
              department: 'F&B Service',
              position: 'Server',
              targetCount: 20,
              priorityLevel: 'high',
              requiredSkills: ['Customer Service', 'Food Service'],
              wageRange: { min: 900, max: 1400 }
            },
            {
              department: 'Front Office',
              position: 'Receptionist',
              targetCount: 8,
              priorityLevel: 'medium',
              requiredSkills: ['Customer Service', 'Languages', 'Computer Skills'],
              wageRange: { min: 1000, max: 1600 }
            }
          ],
          automatedScreening: true,
          bulkOnboardingEnabled: true
        },
        massContractRenewals: {
          enabled: true,
          renewalCriteria: {
            performanceThreshold: 3.5,
            attendanceThreshold: 95,
            minSeasonWorked: 120
          },
          renewalTerms: {
            wageIncrease: 5.0,
            bonusEligibility: true,
            benefitsUpgrade: true
          },
          automatedRenewal: false
        },
        seniorityCarryOver: {
          enabled: true,
          rules: {
            carryOverPeriod: 24,
            seniorityMultiplier: 1.2,
            benefitAcceleration: true,
            wageProgressionAccelerated: true
          },
          seniorityCategories: [
            {
              categoryName: 'Veteran Seasonal',
              minPreviousSeasons: 3,
              benefitMultiplier: 1.15,
              specialPrivileges: ['Shift Priority', 'Department Choice', 'Training Opportunities']
            },
            {
              categoryName: 'Expert Seasonal',
              minPreviousSeasons: 5,
              benefitMultiplier: 1.25,
              specialPrivileges: ['Lead Roles', 'Mentoring Duties', 'Cross-Training', 'Schedule Flexibility']
            }
          ]
        }
      },
      metrics: {
        rehireRate: 0,
        retentionRate: 0,
        productivityImprovement: 0,
        costSavings: 0
      }
    };

    return defaultSeason;
  }

  async executeBatchHiring(seasonId: string, hiringPlan: any): Promise<{
    success: boolean;
    hired: number;
    pending: number;
    rejected: number;
    details: any[];
  }> {
    // Simulate batch hiring execution
    const totalTargets = hiringPlan.targetPositions.reduce((sum: number, pos: any) => sum + pos.targetCount, 0);
    const hired = Math.floor(totalTargets * 0.75);
    const pending = Math.floor(totalTargets * 0.15);
    const rejected = totalTargets - hired - pending;

    return {
      success: true,
      hired,
      pending,
      rejected,
      details: hiringPlan.targetPositions.map((pos: any) => ({
        department: pos.department,
        position: pos.position,
        target: pos.targetCount,
        hired: Math.floor(pos.targetCount * 0.75),
        status: 'in_progress'
      }))
    };
  }

  async configureAccommodationAllowances(propertyId: string, config: Partial<AccommodationMealAllowances>): Promise<AccommodationMealAllowances> {
    const defaultConfig: AccommodationMealAllowances = {
      propertyId,
      allowancePolicy: {
        accommodation: {
          enabled: true,
          perDayCap: 50.00,
          accommodationTypes: [
            {
              type: 'shared_room',
              dailyRate: 25.00,
              maxDays: 180,
              eligibilityCriteria: {
                minContractDays: 30,
                departments: ['All'],
                seniorityLevel: ['Entry', 'Junior', 'Senior']
              }
            },
            {
              type: 'single_room',
              dailyRate: 40.00,
              maxDays: 180,
              eligibilityCriteria: {
                minContractDays: 60,
                departments: ['Management', 'Specialized'],
                seniorityLevel: ['Senior', 'Expert', 'Management']
              }
            }
          ],
          seasonalRates: {
            peakSeasonMultiplier: 1.3,
            offSeasonMultiplier: 0.8
          }
        },
        meals: {
          enabled: true,
          perDayCap: 25.00,
          mealTypes: [
            {
              type: 'breakfast',
              maxAmount: 6.00,
              eligibleShifts: ['Morning', 'Day'],
              departments: ['All']
            },
            {
              type: 'lunch',
              maxAmount: 10.00,
              eligibleShifts: ['Day', 'Afternoon'],
              departments: ['All']
            },
            {
              type: 'dinner',
              maxAmount: 12.00,
              eligibleShifts: ['Evening', 'Night'],
              departments: ['All']
            }
          ],
          mealVouchers: {
            enabled: true,
            vendorNetworks: ['Ticket Restaurant', 'Up2You', 'Pluxee'],
            reimbursementRate: 0.60
          }
        }
      },
      taxImplications: {
        taxFreeThreshold: 600.00,
        taxableAmount: 0,
        reportingRequirements: {
          monthlyDeclaration: true,
          employeeNotification: true
        }
      }
    };

    return { ...defaultConfig, ...config };
  }

  async createTipPoolingEngine(propertyId: string, config: Partial<TipPoolingEngine>): Promise<TipPoolingEngine> {
    const poolId = `pool_${Date.now()}`;
    
    const defaultEngine: TipPoolingEngine = {
      poolId,
      propertyId,
      poolName: config.poolName || 'Main Property Tip Pool',
      configuration: {
        roleWeights: [
          {
            role: 'Server',
            department: 'F&B Service',
            baseWeight: 1.0,
            seniorityMultiplier: 0.1,
            performanceMultiplier: 0.2
          },
          {
            role: 'Bartender',
            department: 'Bar',
            baseWeight: 1.2,
            seniorityMultiplier: 0.15,
            performanceMultiplier: 0.25
          },
          {
            role: 'Busser',
            department: 'F&B Service',
            baseWeight: 0.6,
            seniorityMultiplier: 0.05,
            performanceMultiplier: 0.1
          },
          {
            role: 'Host/Hostess',
            department: 'F&B Service',
            baseWeight: 0.8,
            seniorityMultiplier: 0.1,
            performanceMultiplier: 0.15
          }
        ],
        distributionRules: {
          shiftBased: {
            enabled: true,
            shiftWeights: {
              morning: 0.8,
              afternoon: 1.0,
              evening: 1.4,
              night: 0.6
            }
          },
          hoursBased: {
            enabled: true,
            minimumHours: 4,
            hoursMultiplier: 0.1
          },
          guestFeedbackMultiplier: {
            enabled: true,
            feedbackSources: ['TripAdvisor', 'Google Reviews', 'Hotel Surveys'],
            ratingThresholds: {
              excellent: { threshold: 4.5, multiplier: 1.3 },
              good: { threshold: 4.0, multiplier: 1.1 },
              average: { threshold: 3.5, multiplier: 1.0 }
            }
          }
        },
        poolingPeriod: 'weekly',
        distributionMethod: 'weighted'
      },
      analytics: {
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
      }
    };

    return { ...defaultEngine, ...config };
  }

  async calculateTipDistribution(poolId: string, period: { startDate: Date; endDate: Date }): Promise<{
    distributionId: string;
    period: { startDate: Date; endDate: Date };
    totalAmount: number;
    distributions: Array<{
      employeeId: string;
      employeeName: string;
      department: string;
      role: string;
      hoursWorked: number;
      performanceScore: number;
      baseAmount: number;
      multipliers: {
        shift: number;
        hours: number;
        performance: number;
        feedback: number;
      };
      finalAmount: number;
    }>;
  }> {
    const distributionId = `dist_${Date.now()}`;
    
    // Simulate tip distribution calculation
    const mockDistributions = [
      {
        employeeId: 'emp_001',
        employeeName: 'Maria Papadopoulos',
        department: 'F&B Service',
        role: 'Server',
        hoursWorked: 42,
        performanceScore: 4.7,
        baseAmount: 280.50,
        multipliers: {
          shift: 1.2,
          hours: 1.1,
          performance: 1.25,
          feedback: 1.15
        },
        finalAmount: 425.80
      },
      {
        employeeId: 'emp_002',
        employeeName: 'Dimitris Kostas',
        department: 'Bar',
        role: 'Bartender',
        hoursWorked: 38,
        performanceScore: 4.6,
        baseAmount: 290.00,
        multipliers: {
          shift: 1.3,
          hours: 1.0,
          performance: 1.2,
          feedback: 1.1
        },
        finalAmount: 398.25
      }
    ];

    const totalAmount = mockDistributions.reduce((sum, dist) => sum + dist.finalAmount, 0);

    return {
      distributionId,
      period,
      totalAmount,
      distributions: mockDistributions
    };
  }

  async createSplitShift(employeeId: string, date: Date, segments: any[]): Promise<SplitShiftCosting> {
    const splitId = `split_${Date.now()}`;
    
    // Calculate costing breakdown
    const totalHours = segments.reduce((sum, segment) => sum + segment.hoursWorked, 0);
    const totalLaborCost = segments.reduce((sum, segment) => sum + segment.laborCost, 0);
    
    // Group by outlet and department
    const outletDistribution = segments.reduce((acc: any[], segment) => {
      const existing = acc.find(item => item.outlet === segment.outlet);
      if (existing) {
        existing.hours += segment.hoursWorked;
        existing.cost += segment.laborCost;
      } else {
        acc.push({
          outlet: segment.outlet,
          hours: segment.hoursWorked,
          cost: segment.laborCost,
          percentage: 0
        });
      }
      return acc;
    }, []);

    const departmentDistribution = segments.reduce((acc: any[], segment) => {
      const existing = acc.find(item => item.department === segment.department);
      if (existing) {
        existing.hours += segment.hoursWorked;
        existing.cost += segment.laborCost;
      } else {
        acc.push({
          department: segment.department,
          hours: segment.hoursWorked,
          cost: segment.laborCost,
          percentage: 0
        });
      }
      return acc;
    }, []);

    // Calculate percentages
    outletDistribution.forEach(outlet => {
      outlet.percentage = (outlet.cost / totalLaborCost) * 100;
    });

    departmentDistribution.forEach(dept => {
      dept.percentage = (dept.cost / totalLaborCost) * 100;
    });

    const splitShift: SplitShiftCosting = {
      splitId,
      employeeId,
      date,
      segments: segments.map(segment => ({
        segmentId: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...segment
      })),
      costingBreakdown: {
        totalHours,
        totalLaborCost,
        outletDistribution,
        departmentDistribution
      },
      complianceChecks: {
        maxDailyHours: totalHours <= 8,
        minimumRestPeriod: true, // Would check actual rest periods
        overtimeRules: totalHours > 8,
        breakRequirements: totalHours >= 6
      }
    };

    return splitShift;
  }

  async getSeasonalAnalytics(propertyId: string, seasonId?: string): Promise<{
    currentSeason: any;
    metrics: {
      staffingLevels: {
        current: number;
        target: number;
        variance: number;
      };
      rehireSuccess: {
        rate: number;
        totalReturning: number;
        newHires: number;
      };
      costEfficiency: {
        seasonalLabor: number;
        accommodation: number;
        meals: number;
        tips: number;
        total: number;
      };
      satisfaction: {
        employeeSatisfaction: number;
        guestSatisfaction: number;
        retentionRate: number;
      };
    };
    trends: {
      weeklyStaffing: Array<{
        week: string;
        staffCount: number;
        productivity: number;
        costs: number;
      }>;
      departmentPerformance: Array<{
        department: string;
        efficiency: number;
        satisfaction: number;
        turnover: number;
      }>;
    };
  }> {
    return {
      currentSeason: {
        seasonId: seasonId || 'summer_2025',
        name: 'Summer 2025 Peak Season',
        status: 'active',
        daysRemaining: 45,
        staffingProgress: 85.5
      },
      metrics: {
        staffingLevels: {
          current: 162,
          target: 189,
          variance: -14.3
        },
        rehireSuccess: {
          rate: 78.5,
          totalReturning: 94,
          newHires: 68
        },
        costEfficiency: {
          seasonalLabor: 285420.50,
          accommodation: 45680.25,
          meals: 28950.75,
          tips: 15420.50,
          total: 375472.00
        },
        satisfaction: {
          employeeSatisfaction: 4.2,
          guestSatisfaction: 4.6,
          retentionRate: 89.5
        }
      },
      trends: {
        weeklyStaffing: [
          { week: '2025-W30', staffCount: 145, productivity: 78.5, costs: 65420.50 },
          { week: '2025-W31', staffCount: 158, productivity: 82.1, costs: 68950.25 },
          { week: '2025-W32', staffCount: 162, productivity: 85.3, costs: 71280.75 }
        ],
        departmentPerformance: [
          { department: 'Housekeeping', efficiency: 87.5, satisfaction: 4.3, turnover: 12.5 },
          { department: 'F&B Service', efficiency: 82.8, satisfaction: 4.1, turnover: 18.2 },
          { department: 'Front Office', efficiency: 91.2, satisfaction: 4.5, turnover: 8.7 }
        ]
      }
    };
  }
}