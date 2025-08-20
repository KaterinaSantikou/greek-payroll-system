import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  cbaPacks, wageTables, premiumRules, allowanceRules, 
  schedulingConstraints, erganiProfiles, tipPolicies, 
  packOverrides, packAssignments,
  type CbaPack, type InsertCbaPack,
  type WageTable, type InsertWageTable,
  type PremiumRule, type InsertPremiumRule,
  type AllowanceRule, type InsertAllowanceRule,
  type SchedulingConstraint, type InsertSchedulingConstraint,
  type ErganiProfile, type InsertErganiProfile,
  type TipPolicy, type InsertTipPolicy,
  type PackOverride, type InsertPackOverride,
  type PackAssignment, type InsertPackAssignment
} from "../../shared/schema";

export interface CbaPackWithRules extends CbaPack {
  wageTables: WageTable[];
  premiumRules: PremiumRule[];
  allowanceRules: AllowanceRule[];
  schedulingConstraints: SchedulingConstraint[];
  erganiProfiles: ErganiProfile[];
  tipPolicies: TipPolicy[];
}

export interface SectorPackDefinition {
  pack: Omit<InsertCbaPack, 'id' | 'createdAt' | 'updatedAt'>;
  wageTables: Omit<InsertWageTable, 'id' | 'packId' | 'createdAt'>[];
  premiumRules: Omit<InsertPremiumRule, 'id' | 'packId' | 'createdAt'>[];
  allowanceRules: Omit<InsertAllowanceRule, 'id' | 'packId' | 'createdAt'>[];
  schedulingConstraints: Omit<InsertSchedulingConstraint, 'id' | 'packId' | 'createdAt'>[];
  erganiProfiles: Omit<InsertErganiProfile, 'id' | 'packId' | 'createdAt'>[];
  tipPolicies?: Omit<InsertTipPolicy, 'id' | 'packId' | 'createdAt'>[];
}

/**
 * CBA Pack Service - Manages Greek Industry-Specific Collective Bargaining Agreement Packs
 * 
 * Implements the precedence order:
 * Statutory floor → Sector CBA → Company policy → Individual contract (never below floors)
 */
export class CbaPackService {
  
  /**
   * Get all available CBA packs with their rules
   */
  static async getAllPacks(): Promise<CbaPackWithRules[]> {
    const packs = await db.select().from(cbaPacks).orderBy(desc(cbaPacks.createdAt));
    
    const packsWithRules = await Promise.all(packs.map(async (pack: CbaPack) => {
      const [
        wageTableResults,
        premiumRuleResults,
        allowanceRuleResults,
        schedulingConstraintResults,
        erganiProfileResults,
        tipPolicyResults
      ] = await Promise.all([
        db.select().from(wageTables).where(eq(wageTables.packId, pack.id)),
        db.select().from(premiumRules).where(eq(premiumRules.packId, pack.id)),
        db.select().from(allowanceRules).where(eq(allowanceRules.packId, pack.id)),
        db.select().from(schedulingConstraints).where(eq(schedulingConstraints.packId, pack.id)),
        db.select().from(erganiProfiles).where(eq(erganiProfiles.packId, pack.id)),
        db.select().from(tipPolicies).where(eq(tipPolicies.packId, pack.id))
      ]);

      return {
        ...pack,
        wageTables: wageTableResults,
        premiumRules: premiumRuleResults,
        allowanceRules: allowanceRuleResults,
        schedulingConstraints: schedulingConstraintResults,
        erganiProfiles: erganiProfileResults,
        tipPolicies: tipPolicyResults
      };
    }));

    return packsWithRules;
  }

  /**
   * Get CBA pack by ID with all rules
   */
  static async getPackById(packId: string): Promise<CbaPackWithRules | null> {
    const [pack] = await db.select().from(cbaPacks).where(eq(cbaPacks.id, packId));
    if (!pack) return null;

    const [
      wageTableResults,
      premiumRuleResults,
      allowanceRuleResults,
      schedulingConstraintResults,
      erganiProfileResults,
      tipPolicyResults
    ] = await Promise.all([
      db.select().from(wageTables).where(eq(wageTables.packId, pack.id)),
      db.select().from(premiumRules).where(eq(premiumRules.packId, pack.id)),
      db.select().from(allowanceRules).where(eq(allowanceRules.packId, pack.id)),
      db.select().from(schedulingConstraints).where(eq(schedulingConstraints.packId, pack.id)),
      db.select().from(erganiProfiles).where(eq(erganiProfiles.packId, pack.id)),
      db.select().from(tipPolicies).where(eq(tipPolicies.packId, pack.id))
    ]);

    return {
      ...pack,
      wageTables: wageTableResults,
      premiumRules: premiumRuleResults,
      allowanceRules: allowanceRuleResults,
      schedulingConstraints: schedulingConstraintResults,
      erganiProfiles: erganiProfileResults,
      tipPolicies: tipPolicyResults
    };
  }

  /**
   * Get active CBA packs for a specific property
   */
  static async getActivePacksForProperty(propertyId: string): Promise<CbaPackWithRules[]> {
    const assignments = await db
      .select({ packId: packAssignments.packId })
      .from(packAssignments)
      .where(
        and(
          eq(packAssignments.propertyId, propertyId),
          eq(packAssignments.isActive, true)
        )
      )
      .orderBy(desc(packAssignments.priority));

    if (assignments.length === 0) return [];

    const packIds = assignments.map(a => a.packId);
    const packs = await db.select().from(cbaPacks)
      .where(inArray(cbaPacks.id, packIds))
      .orderBy(desc(cbaPacks.createdAt));

    // Get all rules for these packs
    const packsWithRules = await Promise.all(packs.map(async (pack: CbaPack) => {
      const [
        wageTableResults,
        premiumRuleResults,
        allowanceRuleResults,
        schedulingConstraintResults,
        erganiProfileResults,
        tipPolicyResults
      ] = await Promise.all([
        db.select().from(wageTables).where(eq(wageTables.packId, pack.id)),
        db.select().from(premiumRules).where(eq(premiumRules.packId, pack.id)),
        db.select().from(allowanceRules).where(eq(allowanceRules.packId, pack.id)),
        db.select().from(schedulingConstraints).where(eq(schedulingConstraints.packId, pack.id)),
        db.select().from(erganiProfiles).where(eq(erganiProfiles.packId, pack.id)),
        db.select().from(tipPolicies).where(eq(tipPolicies.packId, pack.id))
      ]);

      return {
        ...pack,
        wageTables: wageTableResults,
        premiumRules: premiumRuleResults,
        allowanceRules: allowanceRuleResults,
        schedulingConstraints: schedulingConstraintResults,
        erganiProfiles: erganiProfileResults,
        tipPolicies: tipPolicyResults
      };
    }));

    return packsWithRules;
  }

  /**
   * Install a predefined sector pack
   */
  static async installSectorPack(sectorPackDef: SectorPackDefinition): Promise<CbaPackWithRules> {
    const packResult = await db.insert(cbaPacks).values(sectorPackDef.pack).returning();
    const pack = packResult[0];

    // Install all related rules
    const [
      wageTableResults,
      premiumRuleResults,
      allowanceRuleResults,
      schedulingConstraintResults,
      erganiProfileResults,
      tipPolicyResults
    ] = await Promise.all([
      sectorPackDef.wageTables.length > 0 
        ? db.insert(wageTables).values(
            sectorPackDef.wageTables.map(wt => ({ ...wt, packId: pack.id }))
          ).returning()
        : Promise.resolve([]),
      sectorPackDef.premiumRules.length > 0
        ? db.insert(premiumRules).values(
            sectorPackDef.premiumRules.map(pr => ({ ...pr, packId: pack.id }))
          ).returning()
        : Promise.resolve([]),
      sectorPackDef.allowanceRules.length > 0
        ? db.insert(allowanceRules).values(
            sectorPackDef.allowanceRules.map(ar => ({ ...ar, packId: pack.id }))
          ).returning()
        : Promise.resolve([]),
      sectorPackDef.schedulingConstraints.length > 0
        ? db.insert(schedulingConstraints).values(
            sectorPackDef.schedulingConstraints.map(sc => ({ ...sc, packId: pack.id }))
          ).returning()
        : Promise.resolve([]),
      sectorPackDef.erganiProfiles.length > 0
        ? db.insert(erganiProfiles).values(
            sectorPackDef.erganiProfiles.map(ep => ({ ...ep, packId: pack.id }))
          ).returning()
        : Promise.resolve([]),
      sectorPackDef.tipPolicies && sectorPackDef.tipPolicies.length > 0
        ? db.insert(tipPolicies).values(
            sectorPackDef.tipPolicies.map(tp => ({ ...tp, packId: pack.id }))
          ).returning()
        : Promise.resolve([])
    ]);

    return {
      ...pack,
      wageTables: wageTableResults,
      premiumRules: premiumRuleResults,
      allowanceRules: allowanceRuleResults,
      schedulingConstraints: schedulingConstraintResults,
      erganiProfiles: erganiProfileResults,
      tipPolicies: tipPolicyResults
    };
  }

  /**
   * Assign a CBA pack to a property
   */
  static async assignPackToProperty(
    packId: string,
    propertyId: string,
    assignedBy: string,
    priority: number = 0
  ): Promise<PackAssignment> {
    const assignment = await db.insert(packAssignments).values({
      packId,
      propertyId,
      assignedBy,
      priority,
      effectiveFrom: new Date(),
      isActive: true
    }).returning();

    return assignment[0];
  }

  /**
   * Create a pack override for company/property-specific customizations
   */
  static async createPackOverride(override: InsertPackOverride): Promise<PackOverride> {
    const result = await db.insert(packOverrides).values(override).returning();
    return result[0];
  }

  /**
   * Calculate effective wage for an employee based on CBA precedence
   */
  static async calculateEffectiveWage(
    propertyId: string,
    category: string,
    grade: string,
    seniorityStep: number = 0
  ): Promise<{
    baseWage: number;
    source: 'statutory' | 'sector_cba' | 'company_policy';
    details: any;
  }> {
    const activePacks = await this.getActivePacksForProperty(propertyId);
    
    // Find wage tables that match the criteria
    const matchingWageTables: Array<{ wage: WageTable; pack: CbaPack }> = [];
    
    for (const pack of activePacks) {
      const matchingWages = pack.wageTables.filter(wt => 
        wt.category === category && 
        wt.grade === grade && 
        wt.seniorityStep <= seniorityStep
      );
      
      for (const wage of matchingWages) {
        matchingWageTables.push({ wage, pack });
      }
    }

    if (matchingWageTables.length === 0) {
      // Fall back to statutory minimum wage
      const statutoryMinWage = await this.getStatutoryMinWage();
      return {
        baseWage: statutoryMinWage,
        source: 'statutory',
        details: { reason: 'No sector CBA or company policy found' }
      };
    }

    // Sort by seniority step (highest first) and precedence
    const sortedWages = matchingWageTables.sort((a, b) => {
      if (a.wage.seniorityStep !== b.wage.seniorityStep) {
        return b.wage.seniorityStep - a.wage.seniorityStep;
      }
      // CBA takes precedence over company policy
      return a.pack.sector.includes('cba') ? -1 : 1;
    });

    const bestWage = sortedWages[0];
    const baseWage = bestWage.wage.baseMonthly 
      ? parseFloat(bestWage.wage.baseMonthly)
      : bestWage.wage.baseDaily 
        ? parseFloat(bestWage.wage.baseDaily) * 22 // Approximate monthly
        : parseFloat(bestWage.wage.baseHourly || "0") * 8 * 22; // Approximate monthly

    return {
      baseWage,
      source: 'sector_cba',
      details: {
        pack: bestWage.pack.name,
        category,
        grade,
        seniorityStep: bestWage.wage.seniorityStep,
        unit: bestWage.wage.unit
      }
    };
  }

  /**
   * Get applicable premium rules for a property
   */
  static async getApplicablePremiums(propertyId: string): Promise<PremiumRule[]> {
    const activePacks = await this.getActivePacksForProperty(propertyId);
    const allPremiums: PremiumRule[] = [];
    
    for (const pack of activePacks) {
      allPremiums.push(...pack.premiumRules);
    }

    // Sort by priority (higher priority first)
    return allPremiums.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get applicable allowance rules for a property
   */
  static async getApplicableAllowances(propertyId: string): Promise<AllowanceRule[]> {
    const activePacks = await this.getActivePacksForProperty(propertyId);
    const allAllowances: AllowanceRule[] = [];
    
    for (const pack of activePacks) {
      allAllowances.push(...pack.allowanceRules);
    }

    return allAllowances;
  }

  /**
   * Get scheduling constraints for a property
   */
  static async getSchedulingConstraints(propertyId: string): Promise<SchedulingConstraint[]> {
    const activePacks = await this.getActivePacksForProperty(propertyId);
    const allConstraints: SchedulingConstraint[] = [];
    
    for (const pack of activePacks) {
      allConstraints.push(...pack.schedulingConstraints);
    }

    return allConstraints;
  }

  /**
   * Get tip policies for F&B properties
   */
  static async getTipPolicies(propertyId: string): Promise<TipPolicy[]> {
    const activePacks = await this.getActivePacksForProperty(propertyId);
    const allTipPolicies: TipPolicy[] = [];
    
    for (const pack of activePacks) {
      if (pack.sector.includes('fnb')) {
        allTipPolicies.push(...pack.tipPolicies);
      }
    }

    return allTipPolicies;
  }

  /**
   * Publish a draft CBA pack
   */
  static async publishPack(packId: string): Promise<CbaPack> {
    const result = await db
      .update(cbaPacks)
      .set({ 
        status: 'published',
        updatedAt: new Date()
      })
      .where(eq(cbaPacks.id, packId))
      .returning();

    return result[0];
  }

  /**
   * Get statutory minimum wage (fallback when no CBA applies)
   */
  private static async getStatutoryMinWage(): Promise<number> {
    // Greek minimum wage as of 2024: €760/month
    // This should be configurable and regularly updated
    return 760.00;
  }

  /**
   * Validate pack assignment doesn't violate statutory floors
   */
  static async validatePackAssignment(packId: string, propertyId: string): Promise<{
    valid: boolean;
    violations: string[];
  }> {
    const pack = await this.getPackById(packId);
    if (!pack) {
      return { valid: false, violations: ['Pack not found'] };
    }

    const violations: string[] = [];
    const minWage = await this.getStatutoryMinWage();

    // Check wage tables don't go below minimum wage
    for (const wageTable of pack.wageTables) {
      const monthlyWage = wageTable.baseMonthly 
        ? parseFloat(wageTable.baseMonthly)
        : wageTable.baseDaily 
          ? parseFloat(wageTable.baseDaily) * 22
          : parseFloat(wageTable.baseHourly || "0") * 8 * 22;

      if (monthlyWage < minWage) {
        violations.push(
          `Wage table ${wageTable.category}/${wageTable.grade} (€${monthlyWage}) below minimum wage (€${minWage})`
        );
      }
    }

    // Check scheduling constraints don't violate Greek labor law maximums
    for (const constraint of pack.schedulingConstraints) {
      if (constraint.maxHoursDay > 10) {
        violations.push(`Maximum daily hours (${constraint.maxHoursDay}) exceeds legal limit (10h)`);
      }
      if (constraint.maxHoursWeekAvg > 48) {
        violations.push(`Maximum weekly hours (${constraint.maxHoursWeekAvg}) exceeds legal limit (48h)`);
      }
      if (constraint.restMinHours < 11) {
        violations.push(`Minimum rest (${constraint.restMinHours}h) below legal requirement (11h)`);
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }
}