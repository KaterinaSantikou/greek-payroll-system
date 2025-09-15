priority: high
category: payroll-core

# Task: Implement Greek Holiday Pay Calculation

**Business Context:**
Greek labor law requires specific holiday pay calculations based on ΣΣΕ collective agreements. Employees receive 125% of base pay for work on official holidays, plus additional allowances for consecutive holiday work.

## Implementation Routine

**Step 1: Data Model Updates**
- File to edit: `shared/schema.ts`
- Expected output: New table `holiday_rates` with Zod schema `holidayRateSchema`
- Specific changes: Add columns `holiday_type`, `rate_multiplier`, `consecutive_bonus`

**Step 2: Holiday Rate Calculator**
- File to edit: `server/payroll_engine.ts`
- Expected output: Functions `calculateHolidayPay()`, `getGreekHolidays()`, `detectConsecutiveHolidays()`
- Specific changes: Implement ΣΣΕ rate tables, official Greek holiday calendar

**Step 3: API Endpoint Creation**
- File to edit: `server/routes.ts`
- Expected output: New endpoint `/api/payroll/holiday-rates`
- Specific changes: GET/POST handlers with validation middleware

**Step 4: Frontend Holiday Form**
- File to edit: `client/src/components/PayrollForm.tsx`
- Expected output: Component `HolidayPaySection` with props `HolidayPayProps`
- Specific changes: Holiday selection dropdown, rate display, validation

**Step 5: Testing Implementation**
- File to create: `tests/holiday-pay.test.ts`
- Expected output: Test functions `testHolidayRateCalculation()`, `testGreekHolidayCalendar()`
- Specific changes: Test Christmas/Easter rates, consecutive day bonuses

**Step 6: Database Migration**
- File to create: `db/migrations/20240115-holiday-rates.sql`
- Expected output: Migration with Greek holiday data seeding
- Specific changes: INSERT official holidays, default rates per ΣΣΕ

## Acceptance Criteria
- [ ] Function `calculateHolidayPay()` applies 125% base rate correctly
- [ ] Function `getGreekHolidays()` returns current year Greek official holidays
- [ ] API endpoint validates holiday dates and employee eligibility
- [ ] UI component shows holiday rate preview before calculation
- [ ] Tests verify Christmas (125%), Easter (125%), consecutive days (+10%)
- [ ] Migration populates holiday_rates table with ΣΣΕ-compliant data

## Specific File Changes Required
```
server/payroll_engine.ts: Add holiday calculation functions
shared/schema.ts: Add holiday_rates table and schemas
server/routes.ts: Add /api/payroll/holiday-rates endpoint
client/src/components/PayrollForm.tsx: Add HolidayPaySection component
tests/holiday-pay.test.ts: Add comprehensive test suite
db/migrations/20240115-holiday-rates.sql: Database schema and data
```

## Expected Function Signatures
```typescript
// server/payroll_engine.ts
function calculateHolidayPay(baseRate: number, holidayType: string, consecutiveDays: number): number
function getGreekHolidays(year: number): HolidayDate[]
function detectConsecutiveHolidays(workDates: Date[]): number

// client/src/components/PayrollForm.tsx
interface HolidayPayProps {
  employeeId: string;
  selectedDates: Date[];
  onRateChange: (rate: number) => void;
}

// tests/holiday-pay.test.ts
function testHolidayRateCalculation(): void
function testGreekHolidayCalendar(): void
function testConsecutiveDayBonus(): void
```

## Greek Labor Law Rules Reference
- ΣΣΕ Article 12.3: Holiday work compensation at 125% base rate
- N. 4093/2012 Section 6: Official Greek holidays requiring premium pay
- ΣΣΕ Article 15.1: Consecutive holiday bonus (+10% after 2 consecutive days)

## Database Schema Changes
```sql
CREATE TABLE holiday_rates (
  id SERIAL PRIMARY KEY,
  holiday_type VARCHAR(50) NOT NULL,
  rate_multiplier DECIMAL(3,2) DEFAULT 1.25,
  consecutive_bonus DECIMAL(3,2) DEFAULT 0.10,
  effective_date DATE NOT NULL
);

INSERT INTO holiday_rates (holiday_type, rate_multiplier) VALUES 
('Christmas', 1.25),
('Easter', 1.25),
('National Holiday', 1.25);
```

## Non-Goals
- Do not modify existing overtime calculation logic
- Do not change EFKA contribution formulas for holiday pay
- Do not implement variable holiday dates (use fixed calendar)