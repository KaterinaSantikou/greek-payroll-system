/**
 * GRC System Initializer - Sets up ISO 27001 + SOC 2 Controls Pack
 */

import { GRCService } from './GRCService';
import { ChecksEngine } from './ChecksEngine';
export async function initializeGRCSystem(): Promise<void> {
  try {
    console.log('🔐 Initializing GRC (Governance, Risk & Compliance) System...');

    // Initialize controls framework
    await GRCService.initializeControlsFramework();
    console.log('✅ ISO 27001 + SOC 2 controls framework initialized');

    // Initialize default automated checks
    await ChecksEngine.initializeDefaultChecks();
    console.log('✅ Default automated checks initialized');

    console.log('🎉 GRC System initialization complete');
  } catch (error) {
    console.error('❌ Failed to initialize GRC System:', error);
    throw error;
  }
}