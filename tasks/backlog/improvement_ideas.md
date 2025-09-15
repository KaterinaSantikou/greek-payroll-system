Improve payroll run performance (batching)
Add UI for red/amber payroll errors
Implement Easter, Christmas, and Leave allowance bonus calculations (in line with Greek labor law)
Add salary anomaly detection (flag salary spikes, negative salaries, or terminated employees still being paid)
Create EFKA/APD export file generator for payroll submissions
Build unit tests for payroll_engine.ts core functions
Add 6-day week allowance logic (Ν. 4093/2012)
Add automatic vacation day accrual calculation per employee
Implement severance calculation module based on tenure
Add performance and runtime optimizations to batch payroll runs
Build error-report dashboard that flags incomplete data in red
Generate audit logs of payroll changes (who edited what & when)
Add overtime daily calculation logic for >8h/day shifts
Create integration layer for future digital work card (Ψηφιακή Κάρτα Εργασίας)
Build Slack/Viber notification hooks for payroll approval events