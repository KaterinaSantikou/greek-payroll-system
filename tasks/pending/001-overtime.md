# Task: Implement overtime logic for 6-day week

**Business Context:**
We need to calculate overtime based on Greek labor law (40h/5-day or 48h/6-day).  

**Acceptance Criteria:**
- [ ] Detect hours >48/week
- [ ] Apply 120% rate for legal overtime, 140% beyond
- [ ] Output `overtime_amount` field in payroll_runs
- [ ] Include tests

**Existing Files to Respect:**
- `server/payroll_engine.ts`
- `db/schema.sql`