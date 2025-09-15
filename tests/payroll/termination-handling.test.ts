/**
 * Termination Handling Unit Tests
 * 
 * Tests for Greek labor law termination and severance calculations including:
 * - Severance pay calculation by years of service
 * - Termination eligibility by cause and type
 * - Greek law compliance (Ν. 4093/2012)
 * - Different termination scenarios
 * - Legal reference validation
 */

import { SeveranceRulesService } from '../../server/services/SeveranceRulesService';

// Mock database calls for testing
jest.mock('../../server/db');

describe('Termination Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Severance Amount Calculations', () => {
    const mockRules = {
      id: 'test-rules-1',
      version: 'greek-v2025.1',
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: null,
      isActive: true,
      bands: [
        { minMonths: 0, maxMonths: 12, severanceMonths: 0 },
        { minMonths: 12, maxMonths: 24, severanceMonths: 2 },
        { minMonths: 24, maxMonths: 60, severanceMonths: 3 },
        { minMonths: 60, maxMonths: 120, severanceMonths: 4 },
        { minMonths: 120, maxMonths: 180, severanceMonths: 5 },
        { minMonths: 180, maxMonths: 240, severanceMonths: 6 },
        { minMonths: 240, maxMonths: 300, severanceMonths: 12 },
        { minMonths: 300, maxMonths: 999, severanceMonths: 17 }
      ],
      legalReference: 'Ν. 4093/2012, άρθρα 1-3',
      description: 'Greek Labor Law 4093/2012 severance compensation rates',
      descriptionGr: 'Αποζημιώσεις απόλυσης σύμφωνα με τον Ν. 4093/2012',
      createdAt: new Date(),
      createdBy: 'test',
      approvedAt: null,
      approvedBy: null
    };

    test('should calculate no severance for employment less than 12 months', () => {
      const monthsOfService = 10;
      const monthlyWage = 1200;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.severanceAmount).toBe(0);
      expect(result.severanceMonths).toBe(0);
      expect(result.formula).toContain('0 months salary');
    });

    test('should calculate 2 months severance for 12-23 months of service', () => {
      const monthsOfService = 18; // 1.5 years
      const monthlyWage = 1200;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.severanceAmount).toBe(2400); // 2 * 1200
      expect(result.severanceMonths).toBe(2);
      expect(result.formula).toContain('2 months salary');
      expect(result.formula).toContain('€2400.00');
    });

    test('should calculate 3 months severance for 2-5 years of service', () => {
      const monthsOfService = 36; // 3 years
      const monthlyWage = 1500;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.severanceAmount).toBe(4500); // 3 * 1500
      expect(result.severanceMonths).toBe(3);
      expect(result.formula).toContain('3 years');
      expect(result.formula).toContain('3 months salary');
    });

    test('should calculate 4 months severance for 5-10 years of service', () => {
      const monthsOfService = 84; // 7 years
      const monthlyWage = 1800;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.severanceAmount).toBe(7200); // 4 * 1800
      expect(result.severanceMonths).toBe(4);
      expect(result.formula).toContain('7 years');
      expect(result.formula).toContain('4 months salary');
    });

    test('should calculate 5 months severance for 10-15 years of service', () => {
      const monthsOfService = 144; // 12 years
      const monthlyWage = 2000;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.severanceAmount).toBe(10000); // 5 * 2000
      expect(result.severanceMonths).toBe(5);
      expect(result.formula).toContain('12 years');
      expect(result.formula).toContain('5 months salary');
    });

    test('should calculate 6 months severance for 15-20 years of service', () => {
      const monthsOfService = 216; // 18 years
      const monthlyWage = 2200;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.severanceAmount).toBe(13200); // 6 * 2200
      expect(result.severanceMonths).toBe(6);
      expect(result.formula).toContain('18 years');
      expect(result.formula).toContain('6 months salary');
    });

    test('should calculate 12 months severance for 20-25 years of service', () => {
      const monthsOfService = 276; // 23 years
      const monthlyWage = 2500;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.severanceAmount).toBe(30000); // 12 * 2500
      expect(result.severanceMonths).toBe(12);
      expect(result.formula).toContain('23 years');
      expect(result.formula).toContain('12 months salary');
    });

    test('should calculate 17 months severance for 25+ years of service', () => {
      const monthsOfService = 360; // 30 years
      const monthlyWage = 3000;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.severanceAmount).toBe(51000); // 17 * 3000
      expect(result.severanceMonths).toBe(17);
      expect(result.formula).toContain('30 years');
      expect(result.formula).toContain('17 months salary');
    });

    test('should handle partial months in service description', () => {
      const monthsOfService = 37; // 3 years and 1 month
      const monthlyWage = 1400;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.formula).toContain('3 years and 1 months');
      expect(result.formulaGr).toContain('3 έτη και 1 μήνες');
      expect(result.severanceAmount).toBe(4200); // 3 * 1400
    });

    test('should handle exact year boundaries', () => {
      const monthsOfService = 60; // Exactly 5 years
      const monthlyWage = 1600;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        mockRules
      );

      expect(result.formula).toContain('5 years');
      expect(result.formula).not.toContain('and');
      expect(result.severanceAmount).toBe(6400); // 4 * 1600 (5 years gets 4 months)
    });
  });

  describe('Severance Eligibility', () => {
    test('should qualify for severance on dismissal without cause', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal');
      expect(eligible).toBe(true);
    });

    test('should qualify for severance on dismissal with undefined cause', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', undefined);
      expect(eligible).toBe(true);
    });

    test('should disqualify severance for serious misconduct', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', 'SERIOUS_MISCONDUCT');
      expect(eligible).toBe(false);
    });

    test('should disqualify severance for criminal activity', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', 'CRIMINAL_ACTIVITY');
      expect(eligible).toBe(false);
    });

    test('should disqualify severance for breach of trust', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', 'BREACH_OF_TRUST');
      expect(eligible).toBe(false);
    });

    test('should disqualify severance for job abandonment', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', 'ABANDONMENT');
      expect(eligible).toBe(false);
    });

    test('should disqualify severance for insubordination', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', 'INSUBORDINATION');
      expect(eligible).toBe(false);
    });

    test('should disqualify severance for disclosure of secrets', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', 'DISCLOSURE_SECRETS');
      expect(eligible).toBe(false);
    });

    test('should disqualify severance for competing with employer', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', 'COMPETE_WITH_EMPLOYER');
      expect(eligible).toBe(false);
    });

    test('should disqualify severance for false credentials', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('dismissal', 'FALSE_CREDENTIALS');
      expect(eligible).toBe(false);
    });
  });

  describe('Resignation Eligibility', () => {
    test('should not qualify for severance on regular resignation', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('resignation');
      expect(eligible).toBe(false);
    });

    test('should not qualify for severance on resignation without cause', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('resignation', undefined);
      expect(eligible).toBe(false);
    });

    test('should qualify for severance on constructive dismissal - employer breach', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('resignation', 'EMPLOYER_BREACH');
      expect(eligible).toBe(true);
    });

    test('should qualify for severance on constructive dismissal - unsafe conditions', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('resignation', 'UNSAFE_CONDITIONS');
      expect(eligible).toBe(true);
    });

    test('should qualify for severance on constructive dismissal - non-payment', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('resignation', 'NON_PAYMENT');
      expect(eligible).toBe(true);
    });

    test('should qualify for severance on constructive dismissal - harassment', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('resignation', 'HARASSMENT');
      expect(eligible).toBe(true);
    });

    test('should qualify for severance on constructive dismissal - material change', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('resignation', 'MATERIAL_CHANGE');
      expect(eligible).toBe(true);
    });

    test('should not qualify for other resignation reasons', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('resignation', 'PERSONAL_REASONS');
      expect(eligible).toBe(false);
    });
  });

  describe('Other Termination Types', () => {
    test('should not qualify for severance on contract expiry', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('expiry');
      expect(eligible).toBe(false);
    });

    test('should qualify for severance on mutual agreement', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('mutual_agreement');
      expect(eligible).toBe(true);
    });

    test('should not qualify for unknown termination types', () => {
      const eligible = SeveranceRulesService.isSeveranceEligible('unknown_type' as any);
      expect(eligible).toBe(false);
    });
  });

  describe('Real-world Termination Scenarios', () => {
    test('should handle typical dismissal scenario', () => {
      // 3 years employment, dismissed without cause, €1400/month
      const monthsOfService = 36;
      const monthlyWage = 1400;
      const terminationType = 'dismissal';

      const eligible = SeveranceRulesService.isSeveranceEligible(terminationType);
      expect(eligible).toBe(true);

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        {
          ...mockRules,
          bands: mockRules.bands
        }
      );

      expect(result.severanceAmount).toBe(4200); // 3 months * €1400
      expect(result.severanceMonths).toBe(3);
    });

    test('should handle long-term employee dismissal', () => {
      // 22 years employment, dismissed without cause, €2200/month
      const monthsOfService = 264; // 22 years
      const monthlyWage = 2200;
      const terminationType = 'dismissal';

      const eligible = SeveranceRulesService.isSeveranceEligible(terminationType);
      expect(eligible).toBe(true);

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        {
          ...mockRules,
          bands: mockRules.bands
        }
      );

      expect(result.severanceAmount).toBe(26400); // 12 months * €2200
      expect(result.severanceMonths).toBe(12);
    });

    test('should handle constructive dismissal scenario', () => {
      // Employee resigns due to employer breach after 5 years
      const monthsOfService = 60; // 5 years
      const monthlyWage = 1600;
      const terminationType = 'resignation';
      const terminationCause = 'EMPLOYER_BREACH';

      const eligible = SeveranceRulesService.isSeveranceEligible(terminationType, terminationCause);
      expect(eligible).toBe(true);

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        {
          ...mockRules,
          bands: mockRules.bands
        }
      );

      expect(result.severanceAmount).toBe(6400); // 4 months * €1600
      expect(result.severanceMonths).toBe(4);
    });

    test('should handle dismissal for cause (no severance)', () => {
      // Employee dismissed for serious misconduct after 10 years
      const monthsOfService = 120; // 10 years
      const monthlyWage = 1800;
      const terminationType = 'dismissal';
      const terminationCause = 'SERIOUS_MISCONDUCT';

      const eligible = SeveranceRulesService.isSeveranceEligible(terminationType, terminationCause);
      expect(eligible).toBe(false);

      // Even if we calculate (which shouldn't happen in real scenario)
      if (eligible) {
        const result = SeveranceRulesService.calculateSeveranceAmount(
          monthsOfService,
          monthlyWage,
          {
            ...mockRules,
            bands: mockRules.bands
          }
        );
        expect(result.severanceAmount).toBe(0);
      }
    });

    test('should handle probationary period dismissal', () => {
      // New employee dismissed during probation (6 months)
      const monthsOfService = 6;
      const monthlyWage = 1000;
      const terminationType = 'dismissal';

      const eligible = SeveranceRulesService.isSeveranceEligible(terminationType);
      expect(eligible).toBe(true); // Eligible but amount will be 0

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        {
          ...mockRules,
          bands: mockRules.bands
        }
      );

      expect(result.severanceAmount).toBe(0); // Less than 12 months = no severance
      expect(result.severanceMonths).toBe(0);
    });

    test('should handle retirement scenario', () => {
      // Long-term employee mutual agreement for retirement
      const monthsOfService = 420; // 35 years
      const monthlyWage = 2800;
      const terminationType = 'mutual_agreement';

      const eligible = SeveranceRulesService.isSeveranceEligible(terminationType);
      expect(eligible).toBe(true);

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        {
          ...mockRules,
          bands: mockRules.bands
        }
      );

      expect(result.severanceAmount).toBe(47600); // 17 months * €2800 (maximum)
      expect(result.severanceMonths).toBe(17);
    });
  });

  describe('Greek and English Descriptions', () => {
    test('should provide both Greek and English formulas', () => {
      const monthsOfService = 37; // 3 years, 1 month
      const monthlyWage = 1500;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        {
          ...mockRules,
          bands: mockRules.bands
        }
      );

      // Should have both English and Greek descriptions
      expect(result.formula).toBeDefined();
      expect(result.formulaGr).toBeDefined();

      expect(result.formula).toContain('3 years and 1 months');
      expect(result.formulaGr).toContain('3 έτη και 1 μήνες');

      expect(result.formula).toContain('months salary');
      expect(result.formulaGr).toContain('μήνες μισθού');
    });

    test('should handle exact years correctly in descriptions', () => {
      const monthsOfService = 84; // Exactly 7 years
      const monthlyWage = 1600;

      const result = SeveranceRulesService.calculateSeveranceAmount(
        monthsOfService,
        monthlyWage,
        {
          ...mockRules,
          bands: mockRules.bands
        }
      );

      expect(result.formula).toContain('7 years');
      expect(result.formula).not.toContain('and');
      expect(result.formulaGr).toContain('7 έτη');
      expect(result.formulaGr).not.toContain('και');
    });
  });
});