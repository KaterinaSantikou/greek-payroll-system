# Task Spec Template

**Title:** (e.g., Add overtime rules for 6-day week)

**Business Context (plain English):**
Why we need this, how it should work in Greece (EFKA, ΣΣΕ, Digital Work Card). No code.

## Implementation Routine

**Step 1: Data Model Updates**
- File to edit: `shared/schema.ts`
- Expected output: New table definitions, Zod schemas
- Specific changes: [List exact column names, types, constraints]

**Step 2: Backend Logic Implementation**
- File to edit: `server/[specific-file].ts`
- Expected output: New functions: `calculateOvertimeHours()`, `applyOvertimeRates()`
- Specific changes: [List function signatures and core logic]

**Step 3: API Endpoint Creation**
- File to edit: `server/routes.ts`
- Expected output: New endpoint `/api/payroll/overtime`
- Specific changes: [List request/response schemas]

**Step 4: Frontend Integration**
- File to edit: `client/src/components/[ComponentName].tsx`
- Expected output: New UI components and form fields
- Specific changes: [List specific form inputs, validation rules]

**Step 5: Testing Implementation**
- File to edit: `tests/[test-name].test.ts`
- Expected output: Test functions: `testOvertimeCalculation()`, `testGreekLaborCompliance()`
- Specific changes: [List test scenarios and edge cases]

**Step 6: Database Migration**
- File to create: `db/migrations/[timestamp]-overtime-rules.sql`
- Expected output: Migration script with rollback support
- Specific changes: [List exact SQL statements]

## Acceptance Criteria (must have to consider "done")
- [ ] Function `calculateOvertimeHours()` correctly identifies hours >48/week
- [ ] Function `applyOvertimeRates()` applies 120% for legal, 140% for excess
- [ ] API endpoint `/api/payroll/overtime` returns proper JSON schema
- [ ] UI component displays overtime hours and rates correctly
- [ ] Tests cover edge cases: holiday work, night shifts, 6-day vs 5-day weeks
- [ ] Database migration runs without errors and supports rollback

## Specific File Changes Required
```
server/payroll_engine.ts: Add overtime calculation functions
shared/schema.ts: Add overtime tables and Zod schemas  
server/routes.ts: Add /api/payroll/overtime endpoint
client/src/components/PayrollForm.tsx: Add overtime input fields
tests/overtime.test.ts: Add comprehensive test suite
db/migrations/[timestamp]-overtime.sql: Database schema changes
```

## Expected Function Signatures
```typescript
// server/payroll_engine.ts
function calculateOvertimeHours(totalHours: number, workingDays: number): OvertimeBreakdown
function applyOvertimeRates(baseRate: number, overtimeHours: OvertimeBreakdown): PayrollCalculation

// tests/overtime.test.ts  
function testOvertimeCalculation(): void
function testGreekLaborCompliance(): void
function testEdgeCases(): void
```

## Greek Labor Law Rules Reference
[Paste specific rules/tables/snippets from N. 4093/2012, ΣΣΕ regulations]

## Database Schema Changes
```sql
-- New columns to add
ALTER TABLE payroll_runs ADD COLUMN overtime_hours_120 DECIMAL(5,2);
ALTER TABLE payroll_runs ADD COLUMN overtime_hours_140 DECIMAL(5,2); 
ALTER TABLE payroll_runs ADD COLUMN overtime_amount DECIMAL(10,2);
```

## Non-Goals
- Do not modify existing base pay calculations
- Do not change EFKA contribution formulas
- Do not alter Digital Work Card validation logic