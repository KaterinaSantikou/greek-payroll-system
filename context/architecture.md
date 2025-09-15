# 🧠 Greek Payroll System — Comprehensive Architecture Documentation

This document provides complete context for AI agents to safely contribute to the Greek payroll system without breaking functionality or violating compliance requirements.

---

## ⚙️ System Overview

**Mission:** Enterprise-grade payroll processing system for Greece with full compliance to Greek labor law (Ν. 4093/2012, ΣΣΕ Ξενοδοχοϋπαλλήλων, EFKA regulations), GDPR data protection, and government system integration.

**Tech Stack:**
- **Backend:** Node.js (Express) + TypeScript with strict mode
- **Database:** PostgreSQL via Drizzle ORM (@neondatabase/serverless)
- **Frontend:** React 18 + Vite + shadcn/ui + Tailwind CSS
- **Agent:** Python continuous development agent with validation pipeline
- **Infrastructure:** GitHub repo (main/dev branches), CI/CD, automated testing

---

## 📁 Complete File Structure & Responsibilities

```
agent/                                  # Python AI development agent
  ├── run_agent.py                     # Main agent execution
  ├── tools.py                         # Agent tools and capabilities
  ├── allowed_paths.json               # File modification restrictions
  ├── validation/                      # Code validation pipeline
  └── pr_workflow/                     # GitHub PR automation

client/                                # React frontend application
  ├── src/
  │   ├── components/ui/               # shadcn/ui components
  │   ├── pages/                       # Route components
  │   ├── lib/                         # Frontend utilities
  │   └── hooks/                       # Custom React hooks
  └── public/                          # Static assets

server/                                # Node.js backend services
  ├── api/                             # RESTful API endpoints
  │   ├── payroll.ts                   # Payroll operations (RBAC protected)
  │   ├── employees.ts                 # Employee management
  │   ├── auth.ts                      # Authentication endpoints
  │   └── compliance.ts                # Government system integration
  ├── middleware/                      # Express middleware
  │   ├── rbacMiddleware.ts            # Role-based access control
  │   ├── loggingMiddleware.ts         # Request/response logging with PII redaction
  │   └── securityValidationMiddleware.ts # Security validation
  ├── observability/                  # Logging and monitoring
  │   ├── logging.ts                   # Central logging with PII redaction
  │   └── metrics.ts                   # Performance metrics
  ├── security/                       # Security services
  │   └── rbacService.ts               # Role-based permission management
  └── services/                       # Business logic services
      ├── PayrollEngineService.ts      # Core payroll processing
      └── ComplianceConnectorService.ts # Government integration

core/                                  # Domain logic layer (pure functions)
  └── greekRules/                     # Greek labor law implementations
      ├── tax.ts                      # Tax calculation formulas
      ├── socialSecurity.ts           # EFKA contribution calculations
      ├── bonuses.ts                  # Christmas/Easter/vacation bonuses
      └── workingTime.ts              # Overtime and working time limits

engine/                               # Payroll processing orchestration
  ├── PayrollEngine.ts                # Main calculation engine
  └── ScopeRunner.ts                  # Batch processing orchestrator

shared/                               # Shared types, schemas, and constants
  ├── schema.ts                       # Database schema (7,388 lines)
  ├── payrollDomain.ts                # Business domain types
  ├── law-constants.ts                # Versioned Greek law constants
  └── payments-schema.ts              # Payment processing schemas

tests/                                # Comprehensive test suite
  ├── units/                          # Unit tests for critical modules
  │   ├── PayrollEngine.test.ts       # Core engine validation
  │   ├── complianceGuardrails.test.ts # Compliance validation
  │   └── overtimePreventionEngine.test.ts # Working time validation
  ├── payroll/                        # Integration tests
  │   ├── payroll-run-integration.test.ts # End-to-end payroll processing
  │   ├── overtime-calculations.test.ts   # Overtime calculations
  │   └── termination-handling.test.ts    # Severance and termination
  ├── payroll-regression.test.ts      # Regression test suite (16+ scenarios)
  └── schema-migration.test.ts        # Database migration validation

context/                              # AI agent context and documentation
  ├── architecture.md                 # This file - complete system documentation
  ├── knowledge.md                    # Domain knowledge and business rules
  └── labor_law_reference.md          # Greek labor law reference

tasks/                                # AI agent task management
  ├── pending/                        # Open tasks for development
  ├── done/                           # Completed tasks
  └── backlog/                        # Future improvements
```

---

## 🗄️ Database Schema Architecture

### Core Payroll Tables

**employees**: Central employee registry (GDPR compliant)
- Primary fields: `employee_id` (varchar, UUID), `first_name`, `last_name`, `email`
- Greek-specific: `afm` (9-digit tax ID), `amka` (11-digit social security)
- Employment: `contract_type`, `employment_type`, `hire_date`, `base_salary`
- Security: PII encryption, audit logging, role-based access

**timesheets**: Working time tracking with government integration
- Fields: `timesheet_id`, `employee_id`, `work_date`, `regular_hours`
- Overtime tracking: `overtime_hours`, `night_hours`, `sunday_hours`, `holiday_hours`
- Compliance: Digital work card integration, ERGANI II synchronization

**payroll_scopes**: Batch payroll processing definitions
- Fields: `scope_id`, `period` (YYYY-MM), `selected_employee_ids`, `status`
- Orchestration: `created_by`, `created_at`, `finalized_at`

**payroll_results**: Calculated payroll outcomes (immutable audit trail)
- Employee data: `scope_id`, `employee_id`, `period_id`, `calculation_date`
- Earnings: `base_salary`, `gross_pay`, `overtime_amount`, `total_allowances`
- Deductions: `income_tax`, `solidarity_tax`, `employee_efka_main`, `employee_efka_aux`
- Final amounts: `total_deductions`, `net_pay`, `total_employer_cost`

### Government Integration Tables

**filings**: Government submission tracking
- Systems: ERGANI II (employment registry), EFKA (social security), AADE (tax authority)
- Status tracking: `filing_status` enum (pending, submitted, accepted, rejected)
- Audit trail: Submission timestamps, response tracking, error handling

**compliance_validations**: Real-time compliance checking
- Validation rules: EFKA rate compliance, tax bracket validation, overtime limits
- Results: `is_compliant`, `violations` (JSON), `compliance_score`

### Security & Audit Tables

**audit_log**: Immutable audit trail (hash-chained for integrity)
- All payroll operations: Create, read, update, delete
- User context: `user_id`, `role`, `ip_address`, `user_agent`
- Data changes: Before/after values, operation timestamps

**sessions**: Secure session management
- Replit Auth integration: OpenID Connect flow
- Session security: HttpOnly cookies, CSRF protection, timeout handling

---

## 🧩 Domain Architecture & Clean Code Principles

### Three-Layer Architecture

**1. Domain Layer (core/greekRules/)**: Pure business logic
- No external dependencies (no DB, no APIs)
- Greek law implementations as pure functions
- Immutable data structures, functional programming style
- Example: `calculateIncomeTax(grossPay: number, brackets: TaxBracket[]): number`

**2. Engine Layer (engine/)**: Orchestration and workflow
- Coordinates domain rules with data access
- Batch processing and error handling
- Transaction management and rollback capabilities
- Example: `PayrollEngine.calculateEmployeePayroll()`

**3. Infrastructure Layer (server/services/)**: External integrations
- Database operations via Drizzle ORM
- Government API integrations (ERGANI, EFKA, AADE)
- Authentication and authorization
- Logging and monitoring

### Domain-Driven Design Patterns

**Value Objects**: Immutable, validated data structures
```typescript
export class GreekAFM {
  constructor(private value: string) {
    if (!this.isValidAFM(value)) throw new Error('Invalid AFM');
  }
  // Validation and utility methods
}
```

**Entities**: Business objects with identity
```typescript
export class Employee {
  constructor(
    public readonly id: EmployeeId,
    public readonly personalData: PersonalData,
    public readonly employment: EmploymentDetails
  ) {}
}
```

**Domain Services**: Complex business operations
```typescript
export class PayrollCalculationService {
  calculatePayroll(employee: Employee, timesheet: Timesheet): PayrollResult
}
```

---

## 📐 Coding Rules & Standards

### TypeScript Strict Mode Requirements
- `"strict": true` - All strict checks enabled
- `"noImplicitAny": true` - No any types allowed
- `"strictNullChecks": true` - Handle null/undefined explicitly
- All functions must have explicit return types
- Use `const assertions` for immutable data

### Code Quality Standards
- **Function size**: Maximum 50 lines, single responsibility
- **File size**: Maximum 500 lines, break into modules if larger
- **Cyclomatic complexity**: Maximum 10 per function
- **Test coverage**: Minimum 80% line/branch/function coverage
- **Documentation**: JSDoc comments for all public interfaces

### Error Handling Patterns
```typescript
// Use Result pattern for error-prone operations
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

// Domain errors with context
class PayrollCalculationError extends Error {
  constructor(
    message: string,
    public employeeId: string,
    public lawReference?: string
  ) {
    super(message);
  }
}
```

### Security Requirements
- **Input validation**: Zod schemas for all external data
- **PII protection**: Automatic redaction in logs (AFM, AMKA, names, salaries)
- **RBAC enforcement**: All payroll routes require appropriate roles
- **SQL injection prevention**: Parameterized queries only
- **CSRF protection**: Token validation on state-changing operations

---

## 📜 Law Versioning Strategy

### Version Management System

**Version Structure**: `YYYY.MM.DD` (e.g., `2024.12.01`)
- Major versions: Annual law changes (budget law, EFKA rates)
- Minor versions: Mid-year adjustments (minimum wage updates)
- Patch versions: Clarifications and corrections

**Law Version Metadata**:
```typescript
export interface LawVersionMetadata {
  versionId: string;           // "2024.12.01"
  effectiveFrom: Date;         // When law becomes active
  effectiveTo?: Date;          // When superseded (if known)
  sourceDoc: string;           // "Law 4808/2021 - Labor Relations Reform"
  governmentGazette?: string;  // Official publication reference
  description: string;         // Human-readable summary
}
```

### Versioned Constants Structure

**Tax Brackets** (changes annually):
```typescript
export const GREEK_TAX_BRACKETS_2024: LawVersion<TaxBracket[]> = {
  metadata: {
    versionId: "2024.01.01",
    effectiveFrom: new Date("2024-01-01"),
    sourceDoc: "Law 4172/2013 - Income Tax Code",
    description: "2024 income tax brackets"
  },
  data: [
    { min: 0, max: 10000, rate: 0.09 },      // 9% up to €10,000
    { min: 10000, max: 20000, rate: 0.22 },  // 22% from €10,001-€20,000
    { min: 20000, max: 30000, rate: 0.28 },  // 28% from €20,001-€30,000
    { min: 30000, max: 40000, rate: 0.36 },  // 36% from €30,001-€40,000
    { min: 40000, max: null, rate: 0.44 }    // 44% above €40,000
  ]
};
```

**EFKA Rates** (changes based on government decisions):
```typescript
export const GREEK_EFKA_RATES_2024_12: LawVersion<EfkaRates> = {
  metadata: {
    versionId: "2024.12.01",
    effectiveFrom: new Date("2024-12-01"),
    sourceDoc: "Presidential Decree 81/2023",
    description: "December 2024 EFKA contribution rates"
  },
  data: {
    employee: {
      main: 0.0667,          // 6.67% main pension
      auxiliary: 0.0695,     // 6.95% auxiliary pension
      unemployment: 0.005    // 0.5% unemployment insurance
    },
    employer: {
      main: 0.1311,          // 13.11% main pension
      auxiliary: 0.0695,     // 6.95% auxiliary pension
      unemployment: 0.02,    // 2% unemployment insurance
      sickness: 0.006,       // 0.6% sickness benefit
      workAccident: 0.01     // 1% work accident insurance
    }
  }
};
```

### Version Selection Logic
```typescript
export function getLawVersionForDate(
  date: Date, 
  lawType: 'tax' | 'efka' | 'minimum_wage'
): LawVersion<any> {
  const versions = LAW_VERSIONS[lawType]
    .filter(v => v.metadata.effectiveFrom <= date)
    .filter(v => !v.metadata.effectiveTo || v.metadata.effectiveTo > date)
    .sort((a, b) => b.metadata.effectiveFrom.getTime() - a.metadata.effectiveFrom.getTime());
  
  return versions[0]; // Most recent applicable version
}
```

---

## 🧪 Testing & Validation Strategy

### Test Architecture

**Unit Tests**: Pure function validation
- Domain logic tests: Tax calculations, EFKA contributions, bonus calculations
- Edge cases: Zero values, maximum limits, boundary conditions
- Mathematical accuracy: Rounding, precision, overflow protection

**Integration Tests**: End-to-end payroll processing
- Full employee payroll cycles from timesheet to payment
- Multi-employee batch processing with different scenarios
- Government system integration (mocked in tests)

**Regression Tests**: Prevention of calculation errors
- 16+ predefined employee scenarios with expected outcomes
- Snapshot testing for payroll result consistency
- Mathematical consistency validation (gross - deductions = net)

### Compliance Testing

**Greek Law Compliance**:
```typescript
describe('Greek Law Compliance', () => {
  test('EFKA contributions respect ceiling limits', () => {
    const highSalaryEmployee = createEmployee({ salary: 10000 });
    const result = calculatePayroll(highSalaryEmployee);
    
    const efkaCeiling = MINIMUM_WAGE_2024.monthly * 5.88; // €4,468.80
    expect(result.employeeEfkaMain).toBeLessThanOrEqual(efkaCeiling * 0.0667);
  });
  
  test('Christmas bonus cannot exceed monthly salary', () => {
    const employee = createEmployee({ salary: 1000 });
    const bonus = calculateChristmasBonus(employee);
    
    expect(bonus).toBeLessThanOrEqual(1000);
    expect(bonus).toBeGreaterThan(0); // Must receive some bonus
  });
});
```

**Security Testing**:
- PII redaction validation in logs
- RBAC permission enforcement
- Input validation and SQL injection prevention
- Session security and CSRF protection

### Performance Testing
- Single employee calculation: <100ms
- Batch processing (100 employees): <10 seconds
- Database query optimization with indexing
- Memory usage monitoring for large payroll runs

---

## 🔒 Security Architecture

### Role-Based Access Control (RBAC)

**5-Level Role Hierarchy**:
1. **Employee** (Level 1): Own timesheet and payslip access
2. **Supervisor** (Level 2): Team timesheet approval
3. **HR Manager** (Level 3): Employee management, contract creation
4. **Payroll Manager** (Level 4): Payroll processing, calculations, corrections
5. **Finance Controller** (Level 5): Payroll finalization, payment approval

**Permission Matrix**:
```typescript
const ROLE_PERMISSIONS = {
  payroll_manager: [
    { resource: 'payroll', actions: ['read', 'create', 'calculate'], level: 4 },
    { resource: 'corrections', actions: ['create', 'approve'], level: 4 }
  ],
  finance_controller: [
    { resource: 'payroll', actions: ['finalize'], level: 5 },
    { resource: 'payments', actions: ['approve'], level: 5 }
  ]
};
```

### Data Protection (GDPR Compliant)

**PII Redaction in Logs**:
- Automatic masking: AFM (9 digits), AMKA (11 digits), names, salaries
- Greek-specific patterns: Phone numbers (+30), Greek IBANs
- Field-based redaction: 30+ sensitive field categories
- Production-only enforcement with development debugging support

**Data Encryption**:
- Database: AES-256 encryption for sensitive fields
- Transit: TLS 1.3 for all communications
- Storage: Encrypted environment variables, no hardcoded secrets

---

## 🤖 AI Agent Development Rules

### File Modification Restrictions
- **ALLOWED**: `server/`, `shared/`, `tests/` directories only
- **FORBIDDEN**: Package configs, environment files, build configs, agent code
- **VALIDATION**: Pre-commit hooks prevent unauthorized modifications

### Development Workflow
1. **Code Validation Pipeline**:
   ```bash
   npm run build    # TypeScript compilation
   npm test         # Full test suite
   # If either fails, discard changes automatically
   ```

2. **Quality Checks**:
   - ESLint validation (max warnings: 0)
   - Test coverage maintenance (80% minimum)
   - Security scanning for hardcoded secrets

3. **PR Workflow**:
   - Auto-push to `dev` branch after validation
   - Create PR: `dev` → `main` with GitHub API
   - Include diff summary and test results
   - Require manual approval for merge

### Safety Guardrails

**Code Quality**:
- No `any` types allowed (TypeScript strict mode)
- Functions <50 lines, files <500 lines
- Mandatory JSDoc for public interfaces
- Error handling with Result patterns

**Business Logic**:
- All domain functions must be pure (no side effects)
- Greek law references required for all calculations
- Immutable data structures throughout domain layer
- Comprehensive test coverage for new functionality

**Security**:
- RBAC middleware on all sensitive endpoints
- Input validation with Zod schemas
- PII redaction in all logging
- No direct database queries (ORM only)

---

## 🚦 Development Guidelines

### Change Management Process
1. **Analysis**: Understand business impact and legal requirements
2. **Design**: Create pure domain functions with comprehensive types
3. **Implementation**: Follow clean architecture patterns
4. **Testing**: Unit tests + integration tests + regression validation
5. **Validation**: Automated build/test pipeline
6. **Review**: Code review + compliance check
7. **Deployment**: Automated PR workflow

### Law Change Integration
When Greek laws change:
1. **Never modify existing law versions** (historical accuracy)
2. **Add new version entries** with proper metadata
3. **Update effective date logic** to use new version
4. **Create migration tests** for payroll result changes
5. **Document impact** on existing employee calculations

### Error Recovery
- **Graceful degradation**: System continues with warnings
- **Audit trail**: All failures logged with context
- **Rollback capability**: Point-in-time restore for critical errors
- **Manual override**: Authorized users can approve exceptional cases

---

## 🎯 Summary & Agent Instructions

This Greek Payroll System is a **mission-critical, compliance-focused platform** where accuracy and legal adherence are paramount.

### Core Agent Responsibilities:
1. **Maintain legal accuracy**: Every calculation must follow Greek law exactly
2. **Preserve data integrity**: Immutable audit trails, no data loss
3. **Ensure security**: RBAC enforcement, PII protection, secure coding
4. **Follow architecture**: Clean separation, pure domain functions
5. **Validate thoroughly**: Automated testing prevents regressions

### Forbidden Actions:
- Modifying package configurations or build tools
- Editing files outside `server/`, `shared/`, `tests/`
- Hardcoding credentials or sensitive data  
- Breaking existing functionality without equivalent replacement
- Bypassing validation pipeline or security measures

### Success Metrics:
- ✅ All tests pass (80%+ coverage maintained)
- ✅ Build succeeds without errors/warnings
- ✅ Greek law compliance validated
- ✅ Security measures intact
- ✅ Performance requirements met

**The agent must be a trusted partner in maintaining this critical payroll infrastructure while advancing its capabilities safely and systematically.**