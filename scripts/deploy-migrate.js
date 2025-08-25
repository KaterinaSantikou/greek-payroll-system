#!/usr/bin/env node

/**
 * Production-safe migration script for Drizzle
 * Applies existing SQL migrations without auto-generate/diff commands
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../migrations');

// Database URL masking utility
const maskUrl = (url) => url?.replace(/:\/\/.*@/, '://***@') || '';

// Log database configuration (masked for security)
console.log('🔍 Database Configuration:');
console.log({
  DATABASE_URL: maskUrl(process.env.DATABASE_URL),
  SHADOW_DATABASE_URL: maskUrl(process.env.SHADOW_DATABASE_URL),
  MIGRATION_DATABASE_URL: maskUrl(process.env.MIGRATION_DATABASE_URL)
});

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

// Initialize database connection
const sql = postgres(process.env.DATABASE_URL, { 
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false
});
const db = drizzle(sql);

/**
 * Get all SQL migration files in order
 */
function getMigrationFiles() {
  try {
    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => !file.includes('template'))
      .sort();
    
    console.log(`📁 Found ${files.length} migration files:`, files);
    return files;
  } catch (error) {
    console.error('❌ Failed to read migrations directory:', error.message);
    process.exit(1);
  }
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Migrations tracking table ready');
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error.message);
    throw error;
  }
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations() {
  try {
    const result = await sql`SELECT filename FROM drizzle_migrations ORDER BY id`;
    return new Set(result.map(row => row.filename));
  } catch (error) {
    console.error('❌ Failed to get applied migrations:', error.message);
    throw error;
  }
}

/**
 * Apply a single migration file
 */
async function applyMigration(filename) {
  const filePath = join(migrationsDir, filename);
  
  try {
    const migrationSql = readFileSync(filePath, 'utf8');
    
    // Skip empty files
    if (!migrationSql.trim()) {
      console.log(`⏭️  Skipping empty migration: ${filename}`);
      return;
    }

    console.log(`🔄 Applying migration: ${filename}`);
    
    // Execute the migration in a transaction
    await sql.begin(async (tx) => {
      // Execute the migration SQL
      await tx.unsafe(migrationSql);
      
      // Mark as applied
      await tx`
        INSERT INTO drizzle_migrations (filename) 
        VALUES (${filename})
      `;
    });
    
    console.log(`✅ Applied migration: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to apply migration ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Main migration execution
 */
async function runMigrations() {
  try {
    console.log('🚀 Starting production migrations...');
    
    // Ensure migrations tracking table exists
    await ensureMigrationsTable();
    
    // Get migration files and applied migrations
    const migrationFiles = getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations();
    
    // Filter to only pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.has(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations to apply');
      return;
    }
    
    console.log(`📋 Applying ${pendingMigrations.length} pending migrations:`, pendingMigrations);
    
    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }
    
    console.log('🎉 All migrations applied successfully');
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run migrations
runMigrations();