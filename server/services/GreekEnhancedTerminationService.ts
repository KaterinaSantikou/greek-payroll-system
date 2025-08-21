/**
 * Greek Enhanced Termination Service
 * 
 * Implements enhanced termination framework including:
 * - Valid reason requirements (Law 4611/2019 + Law 4808/2021)
 * - Enhanced court compensation (3 months to 2x severance)
 * - Pregnancy/paternity protection (18 months + 6 months)
 * - Employee challenge period (3 months)
 * - Invalid dismissal remedies
 */

interface ValidTerminationReason {
  category: 'economic' | 'disciplinary' | 'performance' | 'restructuring' | 'health' | 'legal';
  reason: string;
  reasonCode: string;
  isValid: boolean;
  documentationRequired: string[];
  noticePeriod: number; // days
  severanceMultiplier: number; // 1.0 = standard, can be reduced with proper notice
}

interface EnhancedTerminationAssessment {
  employeeId: string;
  terminationDate: Date;
  reason: ValidTerminationReason;
  severanceCalculation: {
    baseAmount: number;
    enhancedAmount?: number; // For invalid dismissals
    courtAwardRange: { min: number; max: number };
    totalPotentialLiability: number;
  };
  protectedStatus: {
    isPregnant: boolean;
    pregnancyProtectionEndDate?: Date;
    isNewFather: boolean;
    paternityProtectionEndDate?: Date;
    hasOtherProtections: boolean;
  };
  challengePeriod: {
    startDate: Date;
    endDate: Date; // 3 months from termination
    hasBeenChallenged: boolean;
  };
  complianceAssessment: {
    isValidTermination: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    potentialClaims: string[];
    recommendedActions: string[];
  };
}

interface InvalidDismissalRemedy {
  remedyType: 'reinstatement' | 'compensation' | 'back_wages' | 'additional_damages';
  amount?: number;
  description: string;
  legalBasis: string;
}

export class GreekEnhancedTerminationService {
  
  // Valid termination reasons per Greek law
  private static readonly VALID_TERMINATION_REASONS: Record<string, ValidTerminationReason> = {
    // Economic reasons
    'economic_downturn': {
      category: 'economic',
      reason: 'Economic downturn requiring workforce reduction',
      reasonCode: 'ECO_001',
      isValid: true,
      documentationRequired: ['Financial statements', 'Business plan', 'Consultation records'],
      noticePeriod: 30,
      severanceMultiplier: 1.0
    },
    'redundancy': {
      category: 'economic',
      reason: 'Position redundancy due to restructuring',
      reasonCode: 'ECO_002',
      isValid: true,
      documentationRequired: ['Restructuring plan', 'Job role analysis', 'Selection criteria'],
      noticePeriod: 30,
      severanceMultiplier: 1.0
    },
    
    // Disciplinary reasons
    'serious_misconduct': {
      category: 'disciplinary',
      reason: 'Serious misconduct or breach of duties',
      reasonCode: 'DIS_001',
      isValid: true,
      documentationRequired: ['Incident reports', 'Investigation records', 'Disciplinary history'],
      noticePeriod: 0, // Immediate dismissal possible
      severanceMultiplier: 0 // No severance for serious misconduct
    },
    'repeated_violations': {
      category: 'disciplinary',
      reason: 'Repeated violations of company policy',
      reasonCode: 'DIS_002',
      isValid: true,
      documentationRequired: ['Warning letters', 'Policy violations log', 'Training records'],
      noticePeriod: 15,
      severanceMultiplier: 0.5
    },
    
    // Performance reasons
    'inadequate_performance': {
      category: 'performance',
      reason: 'Consistently inadequate work performance',
      reasonCode: 'PER_001',
      isValid: true,
      documentationRequired: ['Performance reviews', 'Improvement plans', 'Training records'],
      noticePeriod: 30,
      severanceMultiplier: 1.0
    },
    'skill_deficiency': {
      category: 'performance',
      reason: 'Inability to perform required job skills',
      reasonCode: 'PER_002',
      isValid: true,
      documentationRequired: ['Skill assessments', 'Training attempts', 'Job requirements'],
      noticePeriod: 30,
      severanceMultiplier: 1.0
    },
    
    // Health reasons
    'health_incapacity': {
      category: 'health',
      reason: 'Long-term health incapacity preventing work',
      reasonCode: 'HLT_001',
      isValid: true,
      documentationRequired: ['Medical certificates', 'Accommodation attempts', 'Doctor recommendations'],
      noticePeriod: 30,
      severanceMultiplier: 1.0
    },
    
    // Invalid reasons (common mistakes)
    'pregnancy_related': {
      category: 'legal',
      reason: 'Pregnancy or maternity-related issues',
      reasonCode: 'INV_001',
      isValid: false,
      documentationRequired: [],
      noticePeriod: 0,
      severanceMultiplier: 0
    },
    'union_activity': {
      category: 'legal',
      reason: 'Trade union activities or membership',
      reasonCode: 'INV_002',
      isValid: false,
      documentationRequired: [],
      noticePeriod: 0,
      severanceMultiplier: 0
    },
    'discrimination': {
      category: 'legal',
      reason: 'Discriminatory reasons (age, gender, race, etc.)',
      reasonCode: 'INV_003',
      isValid: false,
      documentationRequired: [],
      noticePeriod: 0,
      severanceMultiplier: 0
    }
  };

  /**
   * Assess termination validity and calculate enhanced obligations
   */
  assessTermination(
    employeeId: string,
    terminationDate: Date,
    reasonCode: string,
    employeeProfile: {
      yearsOfService: number;
      monthlySalary: number;
      isPregnant?: boolean;
      pregnancyStartDate?: Date;
      childbirthDate?: Date;
      isNewFather?: boolean;
      startDate: Date;
    }
  ): EnhancedTerminationAssessment {
    
    const reason = GreekEnhancedTerminationService.VALID_TERMINATION_REASONS[reasonCode] || 
                   GreekEnhancedTerminationService.VALID_TERMINATION_REASONS['discrimination'];

    // Calculate protected status
    const protectedStatus = this.assessProtectedStatus(employeeProfile, terminationDate);
    
    // Calculate severance
    const severanceCalculation = this.calculateEnhancedSeverance(
      employeeProfile.yearsOfService,
      employeeProfile.monthlySalary,
      reason,
      protectedStatus
    );
    
    // Challenge period (3 months)
    const challengePeriod = {
      startDate: terminationDate,
      endDate: new Date(terminationDate.getTime() + 90 * 24 * 60 * 60 * 1000), // 3 months
      hasBeenChallenged: false // Would be set from database
    };
    
    // Compliance assessment
    const complianceAssessment = this.assessCompliance(reason, protectedStatus, employeeProfile);
    
    return {
      employeeId,
      terminationDate,
      reason,
      severanceCalculation,
      protectedStatus,
      challengePeriod,
      complianceAssessment
    };
  }

  /**
   * Assess employee protected status
   */
  private assessProtectedStatus(employeeProfile: any, terminationDate: Date): EnhancedTerminationAssessment['protectedStatus'] {
    const protectedStatus = {
      isPregnant: false,
      isNewFather: false,
      hasOtherProtections: false,
      pregnancyProtectionEndDate: undefined,
      paternityProtectionEndDate: undefined
    };

    // Pregnancy protection (18 months after childbirth)
    if (employeeProfile.isPregnant || employeeProfile.childbirthDate) {
      protectedStatus.isPregnant = true;
      if (employeeProfile.childbirthDate) {
        const protectionEnd = new Date(employeeProfile.childbirthDate);
        protectionEnd.setMonth(protectionEnd.getMonth() + 18);
        protectedStatus.pregnancyProtectionEndDate = protectionEnd;
      }
    }

    // Paternity protection (6 months after childbirth)
    if (employeeProfile.isNewFather && employeeProfile.childbirthDate) {
      protectedStatus.isNewFather = true;
      const protectionEnd = new Date(employeeProfile.childbirthDate);
      protectionEnd.setMonth(protectionEnd.getMonth() + 6);
      protectedStatus.paternityProtectionEndDate = protectionEnd;
    }

    return protectedStatus;
  }

  /**
   * Calculate enhanced severance with court award potential
   */
  private calculateEnhancedSeverance(
    yearsOfService: number,
    monthlySalary: number,
    reason: ValidTerminationReason,
    protectedStatus: any
  ): EnhancedTerminationAssessment['severanceCalculation'] {
    
    // Standard severance calculation (Law 4093/2012)
    let baseMonths = 0;
    if (yearsOfService >= 1 && yearsOfService < 4) baseMonths = 2;
    else if (yearsOfService >= 4 && yearsOfService < 6) baseMonths = 3;
    else if (yearsOfService >= 6 && yearsOfService < 8) baseMonths = 4;
    else if (yearsOfService >= 8 && yearsOfService < 10) baseMonths = 5;
    else if (yearsOfService >= 10) baseMonths = yearsOfService;

    const baseAmount = baseMonths * monthlySalary;
    
    // Enhanced compensation for invalid dismissals (Law 4808/2021)
    let enhancedAmount: number | undefined;
    let courtAwardRange = { min: 0, max: 0 };
    
    if (!reason.isValid || protectedStatus.isPregnant || protectedStatus.isNewFather) {
      // Court can award 3 months to 2x statutory severance
      const minAward = 3 * monthlySalary;
      const maxAward = 2 * baseAmount;
      
      courtAwardRange = {
        min: Math.max(minAward, baseAmount),
        max: Math.max(maxAward, baseAmount * 2)
      };
      
      enhancedAmount = courtAwardRange.max;
    }
    
    const totalPotentialLiability = enhancedAmount || baseAmount;
    
    return {
      baseAmount,
      enhancedAmount,
      courtAwardRange,
      totalPotentialLiability
    };
  }

  /**
   * Assess compliance and risk
   */
  private assessCompliance(
    reason: ValidTerminationReason,
    protectedStatus: any,
    employeeProfile: any
  ): EnhancedTerminationAssessment['complianceAssessment'] {
    
    const issues: string[] = [];
    const actions: string[] = [];
    
    // Check if termination is valid
    let isValidTermination = reason.isValid;
    
    // Protected status overrides
    if (protectedStatus.isPregnant) {
      isValidTermination = false;
      issues.push('Employee is pregnant or within 18-month protection period');
      actions.push('Cannot terminate - wait until protection period ends');
    }
    
    if (protectedStatus.isNewFather) {
      isValidTermination = false;
      issues.push('Employee is new father within 6-month protection period');
      actions.push('Cannot terminate - wait until protection period ends');
    }
    
    // Documentation requirements
    if (reason.isValid && reason.documentationRequired.length > 0) {
      issues.push(`Required documentation: ${reason.documentationRequired.join(', ')}`);
      actions.push('Ensure all required documentation is properly prepared');
    }
    
    // Risk assessment
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (!isValidTermination) {
      riskLevel = 'critical';
      issues.push('High risk of successful employee challenge');
      actions.push('Reconsider termination or wait for valid circumstances');
    } else if (reason.category === 'performance' || reason.category === 'disciplinary') {
      riskLevel = 'medium';
      issues.push('Requires strong documentation and procedural compliance');
      actions.push('Review performance management and disciplinary procedures');
    }
    
    // Potential claims
    const potentialClaims: string[] = [];
    if (!isValidTermination) {
      potentialClaims.push('Wrongful dismissal claim');
      potentialClaims.push('Discrimination claim');
      potentialClaims.push('Enhanced compensation (3 months to 2x severance)');
      potentialClaims.push('Reinstatement order');
      potentialClaims.push('Back wages');
    }
    
    return {
      isValidTermination,
      riskLevel,
      potentialClaims,
      recommendedActions: actions
    };
  }

  /**
   * Calculate invalid dismissal remedies
   */
  calculateInvalidDismissalRemedies(
    monthlySalary: number,
    yearsOfService: number,
    terminationDate: Date,
    challengeSuccessful: boolean
  ): InvalidDismissalRemedy[] {
    
    if (!challengeSuccessful) return [];
    
    const remedies: InvalidDismissalRemedy[] = [];
    
    // 1. Enhanced compensation (3 months to 2x severance)
    const baseSeverance = this.calculateBaseSeverance(yearsOfService, monthlySalary);
    const enhancedCompensation = Math.max(3 * monthlySalary, 2 * baseSeverance);
    
    remedies.push({
      remedyType: 'compensation',
      amount: enhancedCompensation,
      description: `Enhanced compensation: €${enhancedCompensation.toFixed(2)}`,
      legalBasis: 'Law 4808/2021 - Invalid dismissal compensation'
    });
    
    // 2. Back wages (from termination to reinstatement/judgment)
    const monthsElapsed = Math.ceil((new Date().getTime() - terminationDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
    const backWages = monthsElapsed * monthlySalary;
    
    remedies.push({
      remedyType: 'back_wages',
      amount: backWages,
      description: `Back wages for ${monthsElapsed} months: €${backWages.toFixed(2)}`,
      legalBasis: 'Wages lost due to invalid dismissal'
    });
    
    // 3. Reinstatement option
    remedies.push({
      remedyType: 'reinstatement',
      description: 'Right to return to previous position with full benefits',
      legalBasis: 'Court discretionary power for invalid dismissals'
    });
    
    // 4. Additional damages (moral damages)
    const moralDamages = monthlySalary * 2; // Estimated
    remedies.push({
      remedyType: 'additional_damages',
      amount: moralDamages,
      description: `Moral damages: €${moralDamages.toFixed(2)}`,
      legalBasis: 'Compensation for psychological harm and reputation damage'
    });
    
    return remedies;
  }

  /**
   * Calculate base severance per Law 4093/2012
   */
  private calculateBaseSeverance(yearsOfService: number, monthlySalary: number): number {
    let months = 0;
    if (yearsOfService >= 1 && yearsOfService < 4) months = 2;
    else if (yearsOfService >= 4 && yearsOfService < 6) months = 3;
    else if (yearsOfService >= 6 && yearsOfService < 8) months = 4;
    else if (yearsOfService >= 8 && yearsOfService < 10) months = 5;
    else if (yearsOfService >= 10) months = yearsOfService;
    
    return months * monthlySalary;
  }

  /**
   * Generate termination compliance checklist
   */
  generateTerminationChecklist(assessment: EnhancedTerminationAssessment): any {
    return {
      preTerminationChecklist: [
        {
          item: 'Verify valid termination reason',
          status: assessment.reason.isValid ? 'compliant' : 'non_compliant',
          required: true
        },
        {
          item: 'Check protected status (pregnancy/paternity)',
          status: (!assessment.protectedStatus.isPregnant && !assessment.protectedStatus.isNewFather) ? 'compliant' : 'non_compliant',
          required: true
        },
        {
          item: 'Prepare required documentation',
          status: 'pending',
          required: assessment.reason.documentationRequired.length > 0,
          documents: assessment.reason.documentationRequired
        },
        {
          item: 'Calculate proper severance payment',
          status: 'pending',
          required: true,
          amount: assessment.severanceCalculation.baseAmount
        },
        {
          item: 'Prepare termination notice',
          status: 'pending',
          required: true,
          noticePeriod: assessment.reason.noticePeriod
        }
      ],
      
      postTerminationRequirements: [
        {
          item: 'Pay severance before delivering notice',
          required: true,
          deadline: 'Before termination notice'
        },
        {
          item: 'Register termination with ERGANI',
          required: true,
          deadline: '4 business days after termination'
        },
        {
          item: 'Monitor 3-month challenge period',
          required: true,
          period: `${assessment.challengePeriod.startDate.toISOString().split('T')[0]} to ${assessment.challengePeriod.endDate.toISOString().split('T')[0]}`
        },
        {
          item: 'Prepare defense documentation if challenged',
          required: true,
          condition: 'If employee challenges termination'
        }
      ],
      
      riskAssessment: {
        overallRisk: assessment.complianceAssessment.riskLevel,
        potentialLiability: assessment.severanceCalculation.totalPotentialLiability,
        recommendedActions: assessment.complianceAssessment.recommendedActions
      }
    };
  }

  /**
   * Get all valid termination reasons
   */
  getValidTerminationReasons(): ValidTerminationReason[] {
    return Object.values(GreekEnhancedTerminationService.VALID_TERMINATION_REASONS)
      .filter(reason => reason.isValid);
  }
  
  /**
   * Get invalid termination reasons (common mistakes)
   */
  getInvalidTerminationReasons(): ValidTerminationReason[] {
    return Object.values(GreekEnhancedTerminationService.VALID_TERMINATION_REASONS)
      .filter(reason => !reason.isValid);
  }
}

export const greekEnhancedTerminationService = new GreekEnhancedTerminationService();