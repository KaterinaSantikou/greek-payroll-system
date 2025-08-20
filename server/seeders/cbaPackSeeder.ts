import { CbaPackService } from "../services/CbaPackService";
import { 
  TOURISM_HOTELS_PACK, 
  FNB_RESTAURANTS_PACK,
  getAllSectorPackDefinitions 
} from "../services/SectorPackDefinitions";

/**
 * Seed CBA Packs - Install predefined sector packs for demos
 */
export async function seedCbaPacks() {
  console.log("🏨 Seeding CBA & Sector Packs...");

  try {
    // Install Tourism (Hotels) Pack
    console.log("Installing Tourism (Hotels) CBA Pack...");
    const tourismPack = await CbaPackService.installSectorPack(TOURISM_HOTELS_PACK);
    console.log(`✅ Installed: ${tourismPack.name} (ID: ${tourismPack.id})`);

    // Install F&B (Restaurants) Pack  
    console.log("Installing F&B (Restaurants) CBA Pack...");
    const fnbPack = await CbaPackService.installSectorPack(FNB_RESTAURANTS_PACK);
    console.log(`✅ Installed: ${fnbPack.name} (ID: ${fnbPack.id})`);

    // Assign Tourism pack to Princess Hotel (if exists)
    try {
      await CbaPackService.assignPackToProperty(
        tourismPack.id,
        "prop-princess",
        "system-seeder",
        100 // High priority
      );
      console.log(`✅ Assigned Tourism pack to Princess Hotel`);
    } catch (error) {
      console.log("ℹ️  Could not assign to Princess Hotel (property may not exist)");
    }

    console.log("🎉 CBA Pack seeding completed successfully!");
    
    return {
      tourismPack,
      fnbPack,
      success: true
    };

  } catch (error) {
    console.error("❌ Error seeding CBA packs:", error);
    throw error;
  }
}

/**
 * Demo CBA pack functionality
 */
export async function demoCbaPackFunctionality() {
  console.log("\n🧪 Demonstrating CBA Pack functionality...");

  try {
    // Get all packs
    const allPacks = await CbaPackService.getAllPacks();
    console.log(`📦 Total CBA packs installed: ${allPacks.length}`);

    for (const pack of allPacks) {
      console.log(`   • ${pack.name} (${pack.sector}) - ${pack.status}`);
      console.log(`     - Wage tables: ${pack.wageTables.length}`);
      console.log(`     - Premium rules: ${pack.premiumRules.length}`);
      console.log(`     - Allowance rules: ${pack.allowanceRules.length}`);
      console.log(`     - Scheduling constraints: ${pack.schedulingConstraints.length}`);
      console.log(`     - ERGANI profiles: ${pack.erganiProfiles.length}`);
      console.log(`     - Tip policies: ${pack.tipPolicies.length}`);
    }

    // Demo wage calculation for hotel front office
    try {
      const wageResult = await CbaPackService.calculateEffectiveWage(
        "prop-princess",
        "front_office",
        "B", // Senior level
        2   // 2 years seniority
      );
      
      console.log("\n💰 Wage Calculation Demo (Princess Hotel - Senior Front Office):");
      console.log(`   Base wage: €${wageResult.baseWage}/month`);
      console.log(`   Source: ${wageResult.source}`);
      console.log(`   Details:`, wageResult.details);
      
    } catch (error) {
      console.log("ℹ️  Could not demo wage calculation (property may not be assigned)");
    }

    // Demo premium rules
    try {
      const premiums = await CbaPackService.getApplicablePremiums("prop-princess");
      console.log(`\n⭐ Applicable Premiums for Princess Hotel: ${premiums.length}`);
      
      for (const premium of premiums.slice(0, 3)) { // Show first 3
        console.log(`   • ${premium.name}: ${premium.value}% (${premium.appliesTo})`);
      }
      
    } catch (error) {
      console.log("ℹ️  Could not demo premiums");
    }

    console.log("\n🎯 CBA Pack demonstration completed!");

  } catch (error) {
    console.error("❌ Error in CBA pack demo:", error);
  }
}

// Note: For ES modules, direct execution would be handled differently
// This file is designed to be imported and called from other modules