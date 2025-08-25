#!/usr/bin/env node

/**
 * Pre-deployment database configuration check
 * Logs masked database URLs and validates environment
 */

// Database URL masking utility
const maskUrl = (url) => url?.replace(/:\/\/.*@/, '://***@') || 'NOT_SET';

console.log('🔍 PRE-DEPLOY DATABASE CONFIGURATION CHECK');
console.log('='.repeat(50));

// Log database configuration (masked for security)
console.log('📊 Database URLs:');
console.log({
  DATABASE_URL: maskUrl(process.env.DATABASE_URL),
  SHADOW_DATABASE_URL: maskUrl(process.env.SHADOW_DATABASE_URL),
  MIGRATION_DATABASE_URL: maskUrl(process.env.MIGRATION_DATABASE_URL)
});

console.log('\n🔧 Environment:');
console.log({
  NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
  REPL_ID: process.env.REPL_ID || 'NOT_SET'
});

// Validate required environment variables
const required = ['DATABASE_URL'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.log('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
  missing.forEach(key => console.log(`   - ${key}`));
  process.exit(1);
}

console.log('\n✅ Database configuration validated');
console.log('🚀 Ready for migration deployment');