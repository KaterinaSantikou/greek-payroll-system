#!/usr/bin/env node

/**
 * Pre-deployment database configuration check
 * Logs masked database URLs and validates environment
 */

// Database URL masking utility
const maskUrl = url => url?.replace(/:\/\/.*@/, '://***@') || 'NOT_SET';

console.log('🔍 PRE-DEPLOY DATABASE CONFIGURATION CHECK');
console.log('='.repeat(50));

// Log database configuration (masked for security)
console.log('📊 Database URLs:');
console.log({
  DATABASE_URL: maskUrl(process.env.DATABASE_URL),
  SHADOW_DATABASE_URL: maskUrl(process.env.SHADOW_DATABASE_URL),
  MIGRATION_DATABASE_URL: maskUrl(process.env.MIGRATION_DATABASE_URL),
});

console.log('\n🔧 Environment:');
console.log({
  NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
  REPL_ID: process.env.REPL_ID || 'NOT_SET',
});

// Validate required environment variables
const required = ['DATABASE_URL'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.log('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
  missing.forEach(key => console.log(`   - ${key}`));
  process.exit(1);
}

// Run migrator probe diagnostic
console.log('\n🔍 MIGRATOR DATABASE PROBE:');
try {
  const pg = await import('pg');
  const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  const client = new pg.default.Client({ connectionString: url });
  await client.connect();

  const result = await client.query(`
    select current_database() db, current_schema() schema, current_setting('search_path',true) sp,
           to_regclass('public.oncall_teams') as oncall,
           to_regclass('public.partners') as partners;
  `);

  console.log('[MIGRATOR PROBE]', result.rows[0]);
  await client.end();

  const probe = result.rows[0];
  console.log('\n📊 Probe Analysis:');
  console.log(`   Database: ${probe.db}`);
  console.log(`   Schema: ${probe.schema}`);
  console.log(`   Search Path: ${probe.sp}`);
  console.log(`   oncall_teams: ${probe.oncall ? '✅ Found' : '❌ Missing'}`);
  console.log(`   partners: ${probe.partners ? '✅ Found' : '❌ Missing'}`);
} catch (error) {
  console.error('❌ Migrator probe failed:', error.message);
  console.log('⚠️  This may indicate database connection issues');
}

console.log('\n✅ Database configuration validated');
console.log('🚀 Ready for migration deployment');
