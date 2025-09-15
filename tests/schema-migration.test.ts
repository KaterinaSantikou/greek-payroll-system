/**
 * Schema Migration Tests
 * 
 * Runs drizzle-kit migration and verifies table columns exist.
 * Ensures database schema integrity after migrations.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

const execAsync = promisify(exec);

describe('Schema Migration Tests', () => {
  beforeAll(async () => {
    // Ensure test environment has proper setup
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set for testing');
    }
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  test('drizzle-kit push should run successfully', async () => {
    try {
      const { stdout, stderr } = await execAsync('npm run db:push', {
        timeout: 30000, // 30 second timeout
        cwd: process.cwd()
      });
      
      // Drizzle-kit push should complete without errors
      expect(stderr).not.toContain('error');
      expect(stderr).not.toContain('Error');
      
      console.log('Migration output:', stdout);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }, 35000);

  test('employees table should have correct columns', async () => {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY ordinal_position
    `);

    const columns = result.rows;
    const columnNames = columns.map((col: any) => col.column_name);
    
    // Core employee fields
    expect(columnNames).toContain('employee_id');
    expect(columnNames).toContain('first_name');
    expect(columnNames).toContain('last_name');
    expect(columnNames).toContain('email');
    expect(columnNames).toContain('afm');
    expect(columnNames).toContain('amka');
    expect(columnNames).toContain('employee_number');
    expect(columnNames).toContain('department');
    expect(columnNames).toContain('position');
    expect(columnNames).toContain('contract_type');
    expect(columnNames).toContain('employment_type');
    expect(columnNames).toContain('hire_date');
    expect(columnNames).toContain('is_active');
    expect(columnNames).toContain('base_salary');
    expect(columnNames).toContain('payment_method');

    console.log(`✅ Employees table has ${columns.length} columns:`, columnNames);
  });

  test('timesheets table should have correct columns', async () => {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'timesheets' 
      ORDER BY ordinal_position
    `);

    const columns = result.rows;
    const columnNames = columns.map((col: any) => col.column_name);
    
    // Core timesheet fields
    expect(columnNames).toContain('timesheet_id');
    expect(columnNames).toContain('employee_id');
    expect(columnNames).toContain('work_date');
    expect(columnNames).toContain('regular_hours');
    expect(columnNames).toContain('overtime_hours');
    expect(columnNames).toContain('night_hours');
    expect(columnNames).toContain('sunday_hours');
    expect(columnNames).toContain('holiday_hours');

    console.log(`✅ Timesheets table has ${columns.length} columns:`, columnNames);
  });

  test('payroll_scopes table should have correct columns', async () => {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payroll_scopes' 
      ORDER BY ordinal_position
    `);

    const columns = result.rows;
    const columnNames = columns.map((col: any) => col.column_name);
    
    // Core payroll scope fields
    expect(columnNames).toContain('scope_id');
    expect(columnNames).toContain('period');
    expect(columnNames).toContain('selected_employee_ids');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('created_by');
    expect(columnNames).toContain('created_at');
    
    console.log(`✅ Payroll scopes table has ${columns.length} columns:`, columnNames);
  });

  test('payroll_results table should have correct columns', async () => {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payroll_results' 
      ORDER BY ordinal_position
    `);

    const columns = result.rows;
    const columnNames = columns.map((col: any) => col.column_name);
    
    // Core payroll result fields
    expect(columnNames).toContain('scope_id');
    expect(columnNames).toContain('employee_id');
    expect(columnNames).toContain('period_id');
    expect(columnNames).toContain('calculation_date');
    expect(columnNames).toContain('law_version_id');
    
    // Earnings fields
    expect(columnNames).toContain('base_salary');
    expect(columnNames).toContain('gross_pay');
    expect(columnNames).toContain('overtime_amount');
    expect(columnNames).toContain('night_premium');
    expect(columnNames).toContain('sunday_premium');
    expect(columnNames).toContain('holiday_premium');
    
    // Tax fields
    expect(columnNames).toContain('income_tax');
    expect(columnNames).toContain('solidarity_tax');
    
    // EFKA fields
    expect(columnNames).toContain('employee_efka_main');
    expect(columnNames).toContain('employee_efka_aux');
    expect(columnNames).toContain('employee_unemployment');
    expect(columnNames).toContain('employer_efka_main');
    expect(columnNames).toContain('employer_efka_aux');
    
    // Final amounts
    expect(columnNames).toContain('total_deductions');
    expect(columnNames).toContain('net_pay');
    expect(columnNames).toContain('total_employer_cost');
    
    console.log(`✅ Payroll results table has ${columns.length} columns:`, columnNames);
  });

  test('database indexes should exist for performance', async () => {
    const result = await db.execute(sql`
      SELECT 
        schemaname, 
        tablename, 
        indexname, 
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('employees', 'timesheets', 'payroll_scopes', 'payroll_results')
      ORDER BY tablename, indexname
    `);

    const indexes = result.rows;
    const indexNames = indexes.map((idx: any) => `${idx.tablename}.${idx.indexname}`);
    
    // Should have primary key indexes
    expect(indexNames.some(name => name.includes('employees') && name.includes('pkey'))).toBe(true);
    expect(indexNames.some(name => name.includes('timesheets') && name.includes('pkey'))).toBe(true);
    
    console.log(`✅ Found ${indexes.length} database indexes:`, indexNames);
  });

  test('foreign key constraints should exist', async () => {
    const result = await db.execute(sql`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('timesheets', 'payroll_results')
      ORDER BY tc.table_name, tc.constraint_name
    `);

    const constraints = result.rows;
    
    // Should have foreign key from timesheets to employees
    const timesheetConstraints = constraints.filter((c: any) => c.table_name === 'timesheets');
    expect(timesheetConstraints.length).toBeGreaterThan(0);
    
    console.log(`✅ Found ${constraints.length} foreign key constraints`);
    constraints.forEach((constraint: any) => {
      console.log(`   ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });
  });

  test('enum types should be created correctly', async () => {
    const result = await db.execute(sql`
      SELECT 
        t.typname as enum_name,
        string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname LIKE '%_enum'
      GROUP BY t.typname
      ORDER BY t.typname
    `);

    const enums = result.rows;
    const enumNames = enums.map((e: any) => e.enum_name);
    
    // Should have payroll-related enums
    expect(enumNames).toContain('employment_type');
    expect(enumNames).toContain('contract_type');
    expect(enumNames).toContain('payroll_status');
    
    console.log(`✅ Found ${enums.length} enum types:`);
    enums.forEach((enumType: any) => {
      console.log(`   ${enumType.enum_name}: ${enumType.enum_values}`);
    });
  });

  test('database connection should be healthy', async () => {
    const result = await db.execute(sql`SELECT version(), current_database(), current_user`);
    
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]).toHaveProperty('version');
    expect(result.rows[0]).toHaveProperty('current_database');
    expect(result.rows[0]).toHaveProperty('current_user');
    
    console.log('✅ Database connection healthy:', {
      version: result.rows[0].version?.toString().substring(0, 50) + '...',
      database: result.rows[0].current_database,
      user: result.rows[0].current_user
    });
  });

  test('schema should handle Greek characters correctly', async () => {
    // Test that the database can store and retrieve Greek characters
    const testResult = await db.execute(sql`
      SELECT 
        'Κωνσταντίνος Παπαδόπουλος' as greek_name,
        'Οδός Πατησίων 123, Αθήνα' as greek_address,
        'Μηχανικός Λογισμικού' as greek_position
    `);
    
    expect(testResult.rows.length).toBe(1);
    expect(testResult.rows[0].greek_name).toBe('Κωνσταντίνος Παπαδόπουλος');
    expect(testResult.rows[0].greek_address).toBe('Οδός Πατησίων 123, Αθήνα');
    expect(testResult.rows[0].greek_position).toBe('Μηχανικός Λογισμικού');
    
    console.log('✅ Greek character support verified');
  });
});