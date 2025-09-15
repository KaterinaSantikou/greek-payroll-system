# Analytical and Robustness Tasks — Greek Payroll Core

Ensure correct daily wage calculation formula for monthly, biweekly, and daily paid employees, including leap years and February edge cases.

Validate correct application of minimum wage rules (Ν. 4093/2012), including part-time and under-25 employees.

Add safeguards against negative salary outputs, and create error handling for zero or null gross salary inputs.

Audit calculation logic for Easter, Christmas, and Leave allowance — detect fractional months, unpaid leave periods, and new hires mid-year.

Verify correct EFKA contribution categories (IKA, TAPIT, OAED) based on employee job role and employment type, and create mapping tests.

Add validation checks that detect if Digital Work Card daily hours are missing, incomplete, or exceed 24h/day.

Handle exceptions when employee start date is after the current payroll run period, ensuring zero pay output.

Handle exceptions when employee termination date is before the payroll run period, ensuring they are excluded from calculations.

Validate correct rounding of daily and hourly wage values (2 decimal places) across all calculation steps.

Detect and flag if overtime pay exceeds 150% of base salary (indicative of data entry error or double-counting).

Cross-check vacation day accrual logic against actual worked months and contract start date to avoid overaccrual.

Create a consistency checker that flags mismatches between declared working days and actual days used in payroll math.

Ensure severance calculation module validates tenure years correctly using hire and termination dates including gaps and rehirings.

Build a regression test suite comparing expected vs actual payroll outputs for multiple historical employees (mock dataset).

Implement rollback safety for failed payroll runs to prevent partial data writes to payroll_runs table.

Add logging and error categorization for every payroll run: (Logic error / Input data error / Law rule conflict / Unknown)

Verify correct 6-day-week allowance application and handle transition between 5-day and 6-day schedules mid-month.

Ensure proration logic works if salary changes mid-month, including bonus and EFKA recalculation.

Create warning system if total payroll cost exceeds revenue threshold configured in settings (budget overrun alert).

Validate and test correct daily calculation if employee works split shifts spanning past midnight (edge case in Digital Work Card).