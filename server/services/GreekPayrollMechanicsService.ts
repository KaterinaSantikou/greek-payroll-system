/**
 * Greek Payroll Mechanics Service
 * 
 * Handles critical Greek payroll mechanics:
 * 1. Rounding reconciliation (APD, payslip, GL differences)
 * 2. Negative net pay prevention with carry-forward
 * 3. Multiple properties cost allocation (Συγκεντρωτικές δηλώσεις)
 * 4. Collective Bargaining Agreements (ΣΣΕ) with property overrides
 */

interface RoundingReconciliation {
  grossPay: number;
  netPay: number;
  taxes: number;
  efkaContributions: number;
  roundingDifferences: {
    apdRounding: number;
    payslipRounding: number;
    glRounding: number;
  };
  reconciliationEntries: {
    description: string;
    amount: number;
    account: string;
  }[];
  isReconciled: boolean;
}

interface NegativeNetPayHandling {
  grossPay: number;
  totalDeductions: number;
  calculatedNet: number;
  minimumNet: number; // Cannot go below 0
  adjustedNet: number;
  carryForwardAmount: number;
  carryForwardReason: string;
  nextPayrollAdjustment: number;
}

interface PropertyCostAllocation {
  employeeId: string;
  totalCost: number;
  allocations: {
    propertyId: string;
    propertyName: string;
    percentage: number;
    hoursWorked: number;
    allocatedCost: number;
    department?: string;
    costCenter?: string;
  }[];
  consolidatedReporting: {
    totalProperties: number;
    totalHours: number;
    totalCost: number;
    avgHourlyRate: number;
  };
}

interface CollectiveBargainingAgreement {
  cbaId: string;
  cbaName: string;
  cbaNameGreek: string;
  industry: string;
  applicableProperties: string[];
  effectiveDate: Date;
  expirationDate: Date;
  minimumWages: {
    position: string;
    hourlyRate: number;
    monthlyMinimum: number;
    nationalWageOverride: boolean;
  }[];
  premiumRates: {
    overtime: number; // Multiplier (e.g., 1.5)
    night: number;
    sunday: number;
    holiday: number;
  };
  allowances: {
    food: number;
    transport: number;
    hazardPay?: number;
  };
  leaveEntitlements: {
    annualDays: number;
    sickDays: number;
    maternityDays?: number;
  };
}

export class GreekPayrollMechanicsService {
  private static readonly ROUNDING_PRECISION = 2; // €0.01 precision
  private static readonly MINIMUM_NET_PAY = 0; // Cannot go below €0
  private static readonly MAX_ROUNDING_DIFFERENCE = 0.05; // €0.05 max difference

  // Greek Tourism CBA Rates (Sample - would be loaded from database)
  private static readonly TOURISM_CBA_RATES = {
    'hotel_front_desk': { hourly: 6.50, monthly: 900 },
    'hotel_housekeeping': { hourly: 6.20, monthly: 870 },
    'hotel_restaurant': { hourly: 6.40, monthly: 890 },
    'hotel_kitchen': { hourly: 6.60, monthly: 920 },
    'hotel_management': { hourly: 8.00, monthly: 1200 }
  };

  /**
   * Handle rounding reconciliation across APD, payslip, and GL
   * Greek law requires exact matching across all systems
   */
  performRoundingReconciliation(
    grossPay: number,
    netPay: number,
    taxes: number,
    efkaContributions: number
  ): RoundingReconciliation {
    
    // Round to €0.01 precision for each system
    const apdGross = this.roundToEuro(grossPay);
    const apdNet = this.roundToEuro(netPay);
    const apdTaxes = this.roundToEuro(taxes);
    const apdEfka = this.roundToEuro(efkaContributions);

    const payslipGross = this.roundToEuro(grossPay, 'payslip');
    const payslipNet = this.roundToEuro(netPay, 'payslip');
    const payslipTaxes = this.roundToEuro(taxes, 'payslip');
    const payslipEfka = this.roundToEuro(efkaContributions, 'payslip');

    const glGross = this.roundToEuro(grossPay, 'gl');
    const glNet = this.roundToEuro(netPay, 'gl');
    const glTaxes = this.roundToEuro(taxes, 'gl');
    const glEfka = this.roundToEuro(efkaContributions, 'gl');

    // Calculate differences
    const roundingDifferences = {
      apdRounding: apdNet - (apdGross - apdTaxes - apdEfka),
      payslipRounding: payslipNet - (payslipGross - payslipTaxes - payslipEfka),
      glRounding: glNet - (glGross - glTaxes - glEfka)
    };

    // Create reconciliation entries for any differences
    const reconciliationEntries = [];
    
    if (Math.abs(roundingDifferences.apdRounding) > 0.005) {
      reconciliationEntries.push({
        description: 'APD Rounding Adjustment',
        amount: roundingDifferences.apdRounding,
        account: '7999-ROUNDING-ADJUSTMENT'
      });
    }

    if (Math.abs(roundingDifferences.payslipRounding) > 0.005) {
      reconciliationEntries.push({
        description: 'Payslip Rounding Adjustment',
        amount: roundingDifferences.payslipRounding,
        account: '2999-PAYROLL-ROUNDING'
      });
    }

    if (Math.abs(roundingDifferences.glRounding) > 0.005) {
      reconciliationEntries.push({
        description: 'GL Rounding Adjustment',
        amount: roundingDifferences.glRounding,
        account: '6999-ROUNDING-VARIANCE'
      });
    }

    const totalRoundingDiff = Math.abs(roundingDifferences.apdRounding) + 
                              Math.abs(roundingDifferences.payslipRounding) + 
                              Math.abs(roundingDifferences.glRounding);

    return {
      grossPay: apdGross,
      netPay: apdNet,
      taxes: apdTaxes,
      efkaContributions: apdEfka,
      roundingDifferences,
      reconciliationEntries,
      isReconciled: totalRoundingDiff <= GreekPayrollMechanicsService.MAX_ROUNDING_DIFFERENCE
    };
  }

  /**
   * Handle negative net pay prevention
   * Greek law prohibits negative net pay - must carry forward
   */
  handleNegativeNetPay(
    grossPay: number,
    totalDeductions: number,
    employeeId: string,
    existingCarryForward: number = 0
  ): NegativeNetPayHandling {
    
    const calculatedNet = grossPay - totalDeductions - existingCarryForward;
    const minimumNet = GreekPayrollMechanicsService.MINIMUM_NET_PAY;
    
    let adjustedNet = calculatedNet;
    let carryForwardAmount = 0;
    let carryForwardReason = '';
    let nextPayrollAdjustment = existingCarryForward;

    if (calculatedNet < minimumNet) {
      // Prevent negative net pay
      adjustedNet = minimumNet;
      carryForwardAmount = Math.abs(calculatedNet - minimumNet);
      carryForwardReason = 'Negative net pay prevention - deductions exceed gross pay';
      nextPayrollAdjustment = carryForwardAmount;
    } else if (existingCarryForward > 0) {
      // Apply previous carry forward if sufficient net pay
      if (calculatedNet >= existingCarryForward) {
        adjustedNet = calculatedNet - existingCarryForward;
        nextPayrollAdjustment = 0; // Carry forward cleared
      } else {
        // Partial recovery
        adjustedNet = minimumNet;
        nextPayrollAdjustment = existingCarryForward - calculatedNet;
        carryForwardReason = 'Partial recovery of previous carry forward balance';
      }
    }

    return {
      grossPay,
      totalDeductions,
      calculatedNet,
      minimumNet,
      adjustedNet,
      carryForwardAmount,
      carryForwardReason,
      nextPayrollAdjustment
    };
  }

  /**
   * Handle multiple properties cost allocation
   * Required for hotel groups - Συγκεντρωτικές δηλώσεις
   */
  allocateEmployeeCostAcrossProperties(
    employeeId: string,
    totalGrossPayrollCost: number,
    workAllocations: {
      propertyId: string;
      hoursWorked: number;
      department?: string;
      costCenter?: string;
    }[]
  ): PropertyCostAllocation {
    
    const totalHours = workAllocations.reduce((sum, alloc) => sum + alloc.hoursWorked, 0);
    
    if (totalHours === 0) {
      throw new Error('Total hours cannot be zero for cost allocation');
    }

    const avgHourlyRate = totalGrossPayrollCost / totalHours;
    
    const allocations = workAllocations.map(alloc => {
      const percentage = alloc.hoursWorked / totalHours;
      const allocatedCost = totalGrossPayrollCost * percentage;
      
      return {
        propertyId: alloc.propertyId,
        propertyName: `Property-${alloc.propertyId}`, // Would be loaded from database
        percentage: Math.round(percentage * 10000) / 100, // Round to 2 decimal places
        hoursWorked: alloc.hoursWorked,
        allocatedCost: this.roundToEuro(allocatedCost),
        department: alloc.department,
        costCenter: alloc.costCenter
      };
    });

    // Ensure total allocated cost equals original (handle rounding differences)
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocatedCost, 0);
    const roundingDiff = totalGrossPayrollCost - totalAllocated;
    
    if (Math.abs(roundingDiff) > 0.01) {
      // Add rounding difference to largest allocation
      const largestAllocation = allocations.reduce((max, alloc) => 
        alloc.allocatedCost > max.allocatedCost ? alloc : max
      );
      largestAllocation.allocatedCost += roundingDiff;
    }

    return {
      employeeId,
      totalCost: totalGrossPayrollCost,
      allocations,
      consolidatedReporting: {
        totalProperties: allocations.length,
        totalHours,
        totalCost: totalGrossPayrollCost,
        avgHourlyRate: this.roundToEuro(avgHourlyRate)
      }
    };
  }

  /**
   * Apply Collective Bargaining Agreement rates
   * Tourism CBAs often override national minimum wage
   */
  applyCBAOverrides(
    baseSalary: number,
    position: string,
    propertyId: string,
    cbaId: string
  ): {
    originalSalary: number;
    cbaMinimum: number;
    adjustedSalary: number;
    cbaApplied: boolean;
    cbaDetails: any;
  } {
    
    // Load CBA details (would come from database)
    const cba = this.getCBADetails(cbaId);
    
    if (!cba || !cba.applicableProperties.includes(propertyId)) {
      return {
        originalSalary: baseSalary,
        cbaMinimum: baseSalary,
        adjustedSalary: baseSalary,
        cbaApplied: false,
        cbaDetails: null
      };
    }

    // Find position-specific minimum in CBA
    const positionRate = cba.minimumWages.find(rate => rate.position === position);
    
    if (!positionRate) {
      return {
        originalSalary: baseSalary,
        cbaMinimum: baseSalary,
        adjustedSalary: baseSalary,
        cbaApplied: false,
        cbaDetails: cba
      };
    }

    const cbaMinimum = positionRate.monthlyMinimum;
    const adjustedSalary = Math.max(baseSalary, cbaMinimum);

    return {
      originalSalary: baseSalary,
      cbaMinimum,
      adjustedSalary,
      cbaApplied: adjustedSalary > baseSalary,
      cbaDetails: {
        cbaName: cba.cbaName,
        position: positionRate.position,
        hourlyRate: positionRate.hourlyRate,
        monthlyMinimum: positionRate.monthlyMinimum,
        nationalWageOverride: positionRate.nationalWageOverride
      }
    };
  }

  /**
   * Get available CBAs for tourism industry
   */
  getAvailableCBAs(): CollectiveBargainingAgreement[] {
    return [
      {
        cbaId: 'tourism-hotels-2024',
        cbaName: 'Greek Tourism Hotels CBA 2024-2026',
        cbaNameGreek: 'ΣΣΕ Ξενοδοχείων Ελλάδας 2024-2026',
        industry: 'tourism-hotels',
        applicableProperties: [], // Would be populated from database
        effectiveDate: new Date('2024-01-01'),
        expirationDate: new Date('2026-12-31'),
        minimumWages: [
          { position: 'hotel_front_desk', hourlyRate: 6.50, monthlyMinimum: 900, nationalWageOverride: true },
          { position: 'hotel_housekeeping', hourlyRate: 6.20, monthlyMinimum: 870, nationalWageOverride: true },
          { position: 'hotel_restaurant', hourlyRate: 6.40, monthlyMinimum: 890, nationalWageOverride: true },
          { position: 'hotel_kitchen', hourlyRate: 6.60, monthlyMinimum: 920, nationalWageOverride: true },
          { position: 'hotel_management', hourlyRate: 8.00, monthlyMinimum: 1200, nationalWageOverride: true }
        ],
        premiumRates: {
          overtime: 1.5,
          night: 0.25, // 25% night premium
          sunday: 0.75, // 75% Sunday premium
          holiday: 1.0  // 100% holiday premium
        },
        allowances: {
          food: 8.00, // €8/day food allowance
          transport: 50.00, // €50/month transport
          hazardPay: 100.00 // €100/month for hazardous positions
        },
        leaveEntitlements: {
          annualDays: 25, // 25 days annual leave
          sickDays: 15,   // 15 days sick leave
          maternityDays: 119 // 17 weeks maternity
        }
      },
      {
        cbaId: 'restaurants-2024',
        cbaName: 'Greek Restaurants & Catering CBA 2024-2025',
        cbaNameGreek: 'ΣΣΕ Εστίασης & Catering 2024-2025',
        industry: 'restaurants',
        applicableProperties: [],
        effectiveDate: new Date('2024-01-01'),
        expirationDate: new Date('2025-12-31'),
        minimumWages: [
          { position: 'waiter', hourlyRate: 6.30, monthlyMinimum: 880, nationalWageOverride: true },
          { position: 'cook', hourlyRate: 6.80, monthlyMinimum: 950, nationalWageOverride: true },
          { position: 'bartender', hourlyRate: 6.50, monthlyMinimum: 900, nationalWageOverride: true },
          { position: 'manager', hourlyRate: 9.00, monthlyMinimum: 1400, nationalWageOverride: true }
        ],
        premiumRates: {
          overtime: 1.5,
          night: 0.20,
          sunday: 0.60,
          holiday: 0.75
        },
        allowances: {
          food: 6.00,
          transport: 40.00
        },
        leaveEntitlements: {
          annualDays: 22,
          sickDays: 12,
          maternityDays: 119
        }
      }
    ];
  }

  /**
   * Validate payroll mechanics compliance
   */
  validatePayrollMechanics(
    payrollData: any
  ): {
    isCompliant: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check rounding compliance
    const roundingReconciliation = this.performRoundingReconciliation(
      payrollData.grossPay || 0,
      payrollData.netPay || 0,
      payrollData.taxes || 0,
      payrollData.efkaContributions || 0
    );

    if (!roundingReconciliation.isReconciled) {
      issues.push('Rounding differences exceed acceptable limits (€0.05)');
    }

    // Check negative net pay
    const negativeNetCheck = this.handleNegativeNetPay(
      payrollData.grossPay || 0,
      payrollData.totalDeductions || 0,
      payrollData.employeeId || '',
      payrollData.carryForward || 0
    );

    if (negativeNetCheck.carryForwardAmount > 0) {
      warnings.push('Carry forward balance created due to insufficient net pay');
    }

    // Check property allocations
    if (payrollData.multipleProperties && payrollData.workAllocations) {
      const totalAllocatedPercentage = payrollData.workAllocations
        .reduce((sum: number, alloc: any) => sum + (alloc.percentage || 0), 0);
      
      if (Math.abs(totalAllocatedPercentage - 100) > 0.01) {
        issues.push('Property cost allocation percentages do not sum to 100%');
      }
    }

    // CBA compliance checks
    if (payrollData.cbaId && payrollData.position) {
      const cbaApplication = this.applyCBAOverrides(
        payrollData.baseSalary || 0,
        payrollData.position,
        payrollData.propertyId || '',
        payrollData.cbaId
      );

      if (cbaApplication.cbaApplied && cbaApplication.adjustedSalary > payrollData.baseSalary) {
        recommendations.push(`Salary increased to meet CBA minimum: €${cbaApplication.cbaMinimum}`);
      }
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      warnings,
      recommendations
    };
  }

  /**
   * Round to Euro precision
   */
  private roundToEuro(amount: number, system: 'apd' | 'payslip' | 'gl' = 'apd'): number {
    // Different systems might have slightly different rounding rules
    switch (system) {
      case 'apd':
        return Math.round(amount * 100) / 100; // Standard banker's rounding
      case 'payslip':
        return Math.ceil(amount * 100) / 100; // Round up for employee benefit
      case 'gl':
        return Math.floor(amount * 100) / 100; // Round down for accounting
      default:
        return Math.round(amount * 100) / 100;
    }
  }

  /**
   * Get CBA details by ID
   */
  private getCBADetails(cbaId: string): CollectiveBargainingAgreement | null {
    const cbas = this.getAvailableCBAs();
    return cbas.find(cba => cba.cbaId === cbaId) || null;
  }
}

export const greekPayrollMechanicsService = new GreekPayrollMechanicsService();