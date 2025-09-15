# Greek Payroll System - AI Agent Knowledge Base

## Current Architecture

### Core Modules
- **payroll_engine.ts** - Main payroll calculation logic
- **db/schema.sql** - Database structure for employees, payroll runs
- **server/routes.ts** - API endpoints for payroll operations

### Key Features Implemented
*This section will be automatically updated by the AI agent after each task*

## Important Rules & Formulas

### Greek Labor Law (N. 4093/2012)
- Standard work week: 40 hours (5 days) or 48 hours (6 days)
- Overtime rates: 120% for first 3 hours, 140% thereafter
- Minimum wage requirements for full-time and part-time employees
- Under-25 employee wage adjustments

### EFKA Contribution Categories
- IKA: Standard employment insurance
- TAPIT: Specific job role categories
- OAED: Unemployment insurance
- Contribution rates vary by employment type and role

### Digital Work Card Validation
- Daily hours must not exceed 24 hours
- Missing or incomplete data requires validation flags
- Split shifts spanning midnight require special handling

## Recent Changes
*This section tracks the latest modifications to prevent conflicts*

---
*Last updated: Initial setup*