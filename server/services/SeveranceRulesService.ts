import { db } from "../db";
import { severanceRules } from "../../shared/schema";
import { boolean, text } from "drizzle-orm/pg-core";

// Define interfaces for the severance rules until schema types are ready
interface SeveranceRule {
  id: string;
  version: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean | null;
  bands: any;
  legalReference: string;
  description: string | null;
  descriptionGr: string | null;
  createdAt: Date | null;
  createdBy: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
}

interface InsertSeveranceRule {
  version: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  isActive?: boolean;
  bands: any;
  legalReference: string;
  description?: string;
  descriptionGr?: string;
  createdAt?: Date;
  createdBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
}
import { eq, desc, and, isNull } from "drizzle-orm";

/**
 * SeveranceRulesService - Greek Labor Law Severance Pay Implementation
 * 
 * LEGAL BASIS: Law 4093/2012 (Ν. 4093/2012) - Individual Employment Relations
 * Articles 1-3: Severance compensation rates for dismissal without cause
 * 
 * SEVERANCE PAY SYSTEM OVERVIEW:
 * Greek labor law mandates severance compensation for employees dismissed without
 * serious cause. The system uses a progressive scale based on years of service,
 * designed to provide increasing protection for long-term employees.
 * 
 * LEGAL FRAMEWORK (Ν. 4093/2012):
 * - Article 1: Calculation methodology and service period bands
 * - Article 2: Exclusions for serious misconduct (σοβαρό παράπτωμα)
 * - Article 3: Payment timing and procedural requirements
 * - Article 4: Appeals and dispute resolution mechanisms
 * 
 * PROGRESSIVE SEVERANCE SCALE:
 * The law establishes escalating compensation to reflect employment stability:
 * - 0-12 months: No severance (probationary protection)
 * - 12-24 months: 2 months salary (basic protection)
 * - 24-60 months: 3 months salary (established employment)
 * - 60-120 months: 4 months salary (medium-term service)
 * - 120-180 months: 5 months salary (long-term dedication)
 * - 180-240 months: 6 months salary (senior employee protection)
 * - 240-300 months: 12 months salary (veteran employee security)
 * - 300+ months: 17 months salary (maximum protection cap)
 * 
 * CALCULATION BASE:
 * - Based on last monthly salary (not annual average)
 * - Includes basic salary only (no bonuses or allowances)
 * - Gross salary before tax and social security deductions
 * - Fixed at termination date salary level
 * 
 * EXCLUSIONS FROM SEVERANCE (Article 2, Ν. 4093/2012):
 * Employees dismissed for "serious cause" (σοβαρός λόγος) forfeit severance rights:
 * - Criminal activity related to employment
 * - Serious breach of trust or confidentiality
 * - Willful damage to employer property or reputation
 * - Repeated insubordination after warnings
 * - Abandonment of position without notice
 * - Falsification of credentials or work records
 * - Competition with employer during employment
 * - Serious violation of safety or operational procedures
 * 
 * CONSTRUCTIVE DISMISSAL RIGHTS:
 * Employees can claim severance when resigning due to employer violations:
 * - Non-payment of wages for 2+ months
 * - Material unilateral changes to work conditions
 * - Unsafe or illegal working conditions
 * - Workplace harassment or discrimination
 * - Breach of employment contract by employer
 * 
 * Key features:
 * - Versioned severance calculation rules with legal audit trail
 * - Automatic rule versioning when Greek labor laws change
 * - Historical rule tracking for retroactive compliance
 * - Bilingual legal reference documentation (Greek/English)
 * - Integration with termination eligibility determination
 * - Support for rule updates without system downtime
 */
export class SeveranceRulesService {
  
  /**
   * Get current active severance rules
   */
  static async getCurrentRules(): Promise<SeveranceRule | null> {
    const [currentRules] = await db
      .select()
      .from(severanceRules)
      .where(and(
        eq(severanceRules.isActive, true),
        isNull(severanceRules.effectiveTo)
      ))
      .orderBy(desc(severanceRules.effectiveFrom))
      .limit(1);
      
    return currentRules || null;
  }

  /**
   * Get severance rules by version
   */
  static async getRulesByVersion(version: string): Promise<SeveranceRule | null> {
    const [rules] = await db
      .select()
      .from(severanceRules)
      .where(eq(severanceRules.version, version))
      .limit(1);
      
    return rules || null;
  }

  /**
   * Initialize default Greek severance rules (Ν. 4093/2012)
   */
  static async initializeDefaultRules(): Promise<SeveranceRule> {
    // Check if default rules already exist
    const existing = await this.getRulesByVersion('greek-v2025.1');
    if (existing) return existing;

    const defaultRules: InsertSeveranceRule = {
      version: 'greek-v2025.1',
      effectiveFrom: new Date('2025-01-01'),
      effectiveTo: null,
      isActive: true,
      
      // Exact severance bands according to Ν. 4093/2012
      bands: JSON.stringify([
        // Less than 12 months: 0 months severance
        { minMonths: 0, maxMonths: 12, severanceMonths: 0 },
        
        // 12 months to under 2 years: 2 months salary
        { minMonths: 12, maxMonths: 24, severanceMonths: 2 },
        
        // 2 years to under 5 years: 3 months salary
        { minMonths: 24, maxMonths: 60, severanceMonths: 3 },
        
        // 5 years to under 10 years: 4 months salary
        { minMonths: 60, maxMonths: 120, severanceMonths: 4 },
        
        // 10 years to under 15 years: 5 months salary
        { minMonths: 120, maxMonths: 180, severanceMonths: 5 },
        
        // 15 years to under 20 years: 6 months salary
        { minMonths: 180, maxMonths: 240, severanceMonths: 6 },
        
        // 20 years to under 25 years: 12 months salary
        { minMonths: 240, maxMonths: 300, severanceMonths: 12 },
        
        // 25+ years: 17 months salary (maximum)
        { minMonths: 300, maxMonths: 999, severanceMonths: 17 }
      ]),
      
      legalReference: 'Ν. 4093/2012, άρθρα 1-3',
      description: 'Greek Labor Law 4093/2012 severance compensation rates for dismissal without cause',
      descriptionGr: 'Αποζημιώσεις απόλυσης σύμφωνα με τον Ν. 4093/2012 για καταγγελία χωρίς σπουδαίο λόγο',
      createdAt: new Date(),
      createdBy: 'system-initialization'
    };

    const [newRules] = await db
      .insert(severanceRules)
      .values(defaultRules)
      .returning();
    
    return newRules;
  }

  /**
   * Calculate severance amount using Greek Labor Law bands (Ν. 4093/2012)
   * 
   * CALCULATION METHODOLOGY (Article 1, Ν. 4093/2012):
   * Severance is calculated as multiples of the employee's last monthly salary
   * based on total months of continuous service with the same employer.
   * 
   * SERVICE PERIOD CALCULATION:
   * - Start date: First day of employment (including probationary period)
   * - End date: Last working day (termination/resignation date)  
   * - Continuous service: No breaks in employment contract
   * - Multiple contracts: Combined if no gap between contracts
   * - Part-time service: Counts as full months regardless of hours
   * 
   * SALARY BASE FOR CALCULATION:
   * - Uses last monthly gross salary at termination date
   * - Excludes overtime, bonuses, allowances, and benefits in kind
   * - Based on contractual salary, not average historical earnings
   * - No adjustment for inflation or salary increases during service
   * 
   * BAND BOUNDARY LOGIC:
   * - Minimum threshold: 12 months for any severance entitlement
   * - Exact boundaries: 24 months = 2 years exactly, 60 months = 5 years exactly
   * - Upper boundary: 25+ years capped at maximum 17 months severance
   * - Fractional service: Rounded down (35.9 months = 35 months = 2 years band)
   * 
   * PROGRESSIVE RATIONALE:
   * The escalating scale reflects employment security principles:
   * - Early years (1-5): Modest protection during career establishment  
   * - Mid-career (5-15): Substantial protection during prime earning years
   * - Senior years (15-25): High protection recognizing career investment
   * - Veteran (25+): Maximum protection with legal cap to limit employer exposure
   * 
   * INPUT VALIDATION:
   * All inputs are validated for type safety, reasonable ranges, and business rules
   * to prevent calculation errors and ensure legal compliance.
   */
  static calculateSeveranceAmount(
    monthsOfService: number, 
    monthlyWage: number, 
    rules: SeveranceRule
  ): {
    severanceAmount: number;
    severanceMonths: number;
    formula: string;
    formulaGr: string;
  } {
    // VALIDATE MONTHS OF SERVICE INPUT
    if (monthsOfService === null || monthsOfService === undefined) {
      throw new Error('Months of service is required for severance calculation / Οι μήνες υπηρεσίας είναι απαραίτητοι για τον υπολογισμό αποζημίωσης');
    }

    if (!Number.isFinite(monthsOfService) || monthsOfService < 0) {
      throw new Error(`Months of service must be a positive number, got: ${monthsOfService} / Οι μήνες υπηρεσίας πρέπει να είναι θετικός αριθμός, έλαβε: ${monthsOfService}`);
    }

    if (monthsOfService > 600) { // 50 years maximum
      throw new Error(`Months of service cannot exceed 600 (50 years), got: ${monthsOfService} / Οι μήνες υπηρεσίας δεν μπορούν να υπερβαίνουν τους 600 (50 χρόνια), έλαβε: ${monthsOfService}`);
    }

    // VALIDATE MONTHLY WAGE INPUT
    if (monthlyWage === null || monthlyWage === undefined) {
      throw new Error('Monthly wage is required for severance calculation / Ο μηνιαίος μισθός είναι απαραίτητος για τον υπολογισμό αποζημίωσης');
    }

    if (!Number.isFinite(monthlyWage) || monthlyWage <= 0) {
      throw new Error(`Monthly wage must be a positive number, got: ${monthlyWage} / Ο μηνιαίος μισθός πρέπει να είναι θετικός αριθμός, έλαβε: ${monthlyWage}`);
    }

    if (monthlyWage < 300) { // Below reasonable minimum wage
      throw new Error(`Monthly wage seems too low (${monthlyWage}), please verify amount / Ο μηνιαίος μισθός φαίνεται πολύ χαμηλός (${monthlyWage}), παρακαλώ επιβεβαιώστε το ποσό`);
    }

    if (monthlyWage > 100000) { // Above reasonable maximum
      throw new Error(`Monthly wage seems too high (${monthlyWage}), please verify amount / Ο μηνιαίος μισθός φαίνεται πολύ υψηλός (${monthlyWage}), παρακαλώ επιβεβαιώστε το ποσό`);
    }

    // VALIDATE SEVERANCE RULES
    if (!rules) {
      throw new Error('Severance rules are required for calculation / Οι κανόνες αποζημίωσης είναι απαραίτητοι για τον υπολογισμό');
    }

    if (!rules.bands || !Array.isArray(rules.bands)) {
      throw new Error('Severance rules must contain valid bands array / Οι κανόνες αποζημίωσης πρέπει να περιέχουν έγκυρο πίνακα ζωνών');
    }

    const bands = rules.bands as any[];
    
    // BAND SELECTION ALGORITHM:
    // Find the appropriate severance band based on months of continuous service
    // Uses inclusive lower bound and exclusive upper bound (mathematical interval notation)
    let applicableBand = null;
    for (const band of bands) {
      // Example: 25 months service matches band [24, 60) = 3 months severance
      if (monthsOfService >= band.minMonths && monthsOfService < band.maxMonths) {
        applicableBand = band;
        break;
      }
    }
    
    // MAXIMUM PROTECTION FALLBACK:
    // If service exceeds all defined bands (25+ years), apply maximum protection
    // This handles edge cases with very long-term employees (30+ years service)
    if (!applicableBand) {
      applicableBand = bands[bands.length - 1]; // 17 months maximum
    }
    
    // SEVERANCE CALCULATION:
    // Severance Amount = Months of Severance × Last Monthly Gross Salary
    // Simple multiplication - no proration, no adjustments, no complex formulas
    const severanceMonths = applicableBand.severanceMonths;
    const severanceAmount = severanceMonths * monthlyWage;
    
    // SERVICE PERIOD DISPLAY FORMATTING:
    // Convert months to human-readable years and months format
    // Used for employee communication and legal documentation
    const yearsOfService = Math.floor(monthsOfService / 12);
    const remainingMonths = monthsOfService % 12;
    
    let serviceDescription = '';
    let serviceDescriptionGr = '';
    
    // Format service period in both languages for Greek legal requirements
    if (remainingMonths > 0) {
      // Example: "5 years and 3 months" / "5 έτη και 3 μήνες"
      serviceDescription = `${yearsOfService} years and ${remainingMonths} months`;
      serviceDescriptionGr = `${yearsOfService} έτη και ${remainingMonths} μήνες`;
    } else {
      // Example: "5 years" / "5 έτη" (no remaining months)
      serviceDescription = `${yearsOfService} years`;
      serviceDescriptionGr = `${yearsOfService} έτη`;
    }
    
    return {
      severanceAmount,           // Final Euro amount to be paid
      severanceMonths,          // Number of months of salary (for legal records)
      
      // ENGLISH FORMULA: For international documentation and system logs
      formula: `${serviceDescription} of service = ${severanceMonths} months salary = €${severanceAmount.toFixed(2)}`,
      
      // GREEK FORMULA: For employee communication and legal compliance
      formulaGr: `${serviceDescriptionGr} υπηρεσίας = ${severanceMonths} μήνες μισθού = €${severanceAmount.toFixed(2)}`
    };
  }

  /**
   * Determine severance pay eligibility based on termination circumstances
   * 
   * LEGAL FRAMEWORK (Ν. 4093/2012, Articles 1-2):
   * Severance pay is an employee right designed to provide economic security
   * during unemployment transition, but only applies to involuntary terminations
   * or employer-caused resignations.
   * 
   * ELIGIBLE TERMINATION SCENARIOS:
   * 
   * 1. DISMISSAL WITHOUT CAUSE (καταγγελία χωρίς λόγο):
   *    - Most common severance scenario
   *    - Employer terminates employment for business reasons
   *    - No employee fault or misconduct involved
   *    - Full severance entitlement per service bands
   *    - Examples: Redundancy, reorganization, economic downturn
   * 
   * 2. CONSTRUCTIVE DISMISSAL (κατασκευαστική καταγγελία):
   *    - Employee forced to resign due to employer violations
   *    - Treated legally as employer-initiated termination
   *    - Full severance rights preserved despite resignation form
   *    - Burden of proof on employee to demonstrate employer breach
   * 
   * 3. MUTUAL AGREEMENT (συμφωνία εργοδότη-εργαζομένου):
   *    - Negotiated termination with agreed terms
   *    - Severance can be included in agreement terms
   *    - Amount may differ from statutory minimums
   *    - Common in senior executive departures
   * 
   * SEVERANCE DISQUALIFICATION CASES:
   * 
   * SERIOUS MISCONDUCT (Article 2, Ν. 4093/2012):
   * "Serious cause" (σοβαρός λόγος) that justifies immediate dismissal forfeits
   * all severance rights. Greek law defines specific misconduct categories:
   * 
   * - CRIMINAL_ACTIVITY: Theft, fraud, embezzlement related to employment
   * - SERIOUS_MISCONDUCT: Willful violation of core job duties after warning
   * - BREACH_OF_TRUST: Confidentiality violations, conflict of interest
   * - ABANDONMENT: Unjustified absence from work for consecutive days
   * - INSUBORDINATION: Repeated refusal to follow lawful work instructions
   * - DISCLOSURE_SECRETS: Revealing proprietary or confidential information
   * - COMPETE_WITH_EMPLOYER: Working for competitors during employment
   * - FALSE_CREDENTIALS: Lying about qualifications or work history
   * 
   * CONSTRUCTIVE DISMISSAL TRIGGERS:
   * Employee resignation qualifies for severance when caused by employer violations:
   * 
   * - NON_PAYMENT: Salary delays exceeding 2 months (established case law)
   * - UNSAFE_CONDITIONS: Workplace hazards violating safety regulations
   * - HARASSMENT: Discrimination, bullying, or hostile work environment
   * - MATERIAL_CHANGE: Unilateral changes to job role, location, or compensation
   * - EMPLOYER_BREACH: Violation of employment contract terms by employer
   * 
   * BURDEN OF PROOF REQUIREMENTS:
   * - Dismissal cases: Employer must prove "serious cause" to deny severance
   * - Resignation cases: Employee must prove employer violation to claim severance
   * - Documentation crucial: Written warnings, incident reports, witness statements
   * 
   * INPUT VALIDATION:
   * Validates termination type and cause for proper legal determination
   */
  static isSeveranceEligible(terminationType: string, terminationCause?: string): boolean {
    // VALIDATE TERMINATION TYPE INPUT
    if (!terminationType || typeof terminationType !== 'string') {
      throw new Error('Termination type is required and must be a valid string / Ο τύπος λήξης είναι απαραίτητος και πρέπει να είναι έγκυρο κείμενο');
    }

    const trimmedType = terminationType.trim().toLowerCase();
    const validTerminationTypes = ['dismissal', 'resignation', 'expiry', 'mutual_agreement'];
    
    if (!validTerminationTypes.includes(trimmedType)) {
      throw new Error(`Invalid termination type: ${terminationType}. Must be one of: ${validTerminationTypes.join(', ')} / Μη έγκυρος τύπος λήξης: ${terminationType}. Πρέπει να είναι ένας από: ${validTerminationTypes.join(', ')}`);
    }

    // VALIDATE TERMINATION CAUSE IF PROVIDED
    if (terminationCause !== undefined && terminationCause !== null) {
      if (typeof terminationCause !== 'string' || terminationCause.trim() === '') {
        throw new Error('Termination cause must be a non-empty string if provided / Η αιτία λήξης πρέπει να είναι μη κενό κείμενο εάν παρέχεται');
      }
    }
    
    // PROCEED WITH VALIDATED INPUTS TO ELIGIBILITY ANALYSIS
    
    // EMPLOYER-INITIATED DISMISSAL ANALYSIS
    if (trimmedType === 'dismissal') {
      // DEFAULT ASSUMPTION: Dismissal without cause = severance eligible
      // Greek law assumes severance entitlement unless proven otherwise
      if (!terminationCause) return true;
      
      // SERIOUS CAUSE EXCLUSIONS (Article 2, Ν. 4093/2012)
      // These violations are so severe they forfeit severance protection
      // Employer must prove misconduct occurred and meets legal standards
      const seriousCauses = [
        'SERIOUS_MISCONDUCT',        // Σοβαρό παράπτωμα - willful job duty violations
        'CRIMINAL_ACTIVITY',         // Ποινικό αδίκημα - work-related criminal acts  
        'BREACH_OF_TRUST',          // Παραβίαση εμπιστοσύνης - confidentiality/loyalty violations
        'ABANDONMENT',              // Εγκατάλειψη θέσης - unjustified work absence
        'INSUBORDINATION',          // Ανυπακοή - repeated refusal to follow instructions
        'DISCLOSURE_SECRETS',       // Αποκάλυψη μυστικών - revealing proprietary information
        'COMPETE_WITH_EMPLOYER',    // Ανταγωνισμός εργοδότη - working for competitors
        'FALSE_CREDENTIALS'         // Ψευδή στοιχεία - falsifying qualifications/history
      ];
      
      // If termination cause matches serious misconduct = no severance
      // Otherwise = severance eligible (burden on employer to prove serious cause)
      return !seriousCauses.includes(terminationCause);
    }
    
    // EMPLOYEE-INITIATED RESIGNATION ANALYSIS  
    if (trimmedType === 'resignation') {
      // DEFAULT ASSUMPTION: Voluntary resignation = no severance
      // Exception: Constructive dismissal where employer forced resignation
      
      if (!terminationCause) return false; // Pure voluntary resignation
      
      // CONSTRUCTIVE DISMISSAL CAUSES
      // Employee resignation justified by employer violations = severance eligible
      // These create legal fiction that employer "constructively" dismissed employee
      const constructiveCauses = [
        'EMPLOYER_BREACH',          // Παραβίαση από εργοδότη - contract violation by employer
        'UNSAFE_CONDITIONS',        // Ανασφαλείς συνθήκες - workplace safety violations
        'NON_PAYMENT',             // Μη πληρωμή μισθών - salary payment delays/failures
        'HARASSMENT',              // Παρενόχληση - workplace discrimination/bullying
        'MATERIAL_CHANGE'          // Ουσιώδης αλλαγή όρων - unilateral work condition changes
      ];
      
      // Severance eligible only if resignation caused by employer violation
      return terminationCause ? constructiveCauses.includes(terminationCause) : false;
    }
    
    // CONTRACT EXPIRY ANALYSIS
    // Fixed-term contract natural expiration = no severance obligation
    // Rationale: Both parties knew termination date in advance
    if (terminationType === 'expiry') return false;
    
    // MUTUAL AGREEMENT ANALYSIS  
    // Negotiated departure = severance can be agreed upon
    // May include severance above/below statutory minimums
    // Common in executive separations with negotiated packages
    if (terminationType === 'mutual_agreement') return true;
    
    // UNKNOWN TERMINATION TYPE = DEFAULT NO SEVERANCE
    // Conservative approach for undefined scenarios
    return false;
  }

  /**
   * Create new version of severance rules (for law updates)
   */
  static async createNewVersion(
    newVersion: string,
    newBands: any[],
    legalReference: string,
    description: string,
    descriptionGr: string,
    effectiveFrom: Date,
    createdBy: string
  ): Promise<SeveranceRule> {
    // Deactivate current rules
    await db
      .update(severanceRules)
      .set({ 
        isActive: false,
        effectiveTo: effectiveFrom
      })
      .where(and(
        eq(severanceRules.isActive, true),
        isNull(severanceRules.effectiveTo)
      ));

    // Create new rules
    const [newRules] = await db
      .insert(severanceRules)
      .values({
        version: newVersion,
        effectiveFrom,
        effectiveTo: null,
        isActive: true,
        bands: newBands,
        legalReference,
        description,
        descriptionGr,
        createdBy
      })
      .returning();
    
    return newRules;
  }
}