# PayrollSync Legal & Compliance Changelog

This changelog tracks all changes to Greek payroll logic, tax calculations, and legal compliance features. Each entry corresponds to a git tag/release for precise version tracking.

## Format
- **[MAJOR.MINOR.PATCH]** - Release version tag
- **Date** - Implementation date
- **Legal Reference** - Official law, decree, or regulation reference
- **Effective Date** - When the legal change takes effect
- **Impact** - What payroll calculations are affected

---

## [Unreleased]

### Added
- Comprehensive data encryption for sensitive employee information (AFM, AMKA, bank details)
- Row-level security (RLS) policies for employee data access control
- GDPR compliance features (data export, anonymization, consent tracking)

---

## [v2024.12.1] - 2024-12-15

### Changed - EFKA Contribution Rates Update
- **Legal Reference**: EFKA Circular 123/2024
- **Effective Date**: 2024-01-01
- **Impact**: All payroll calculations, employer costs

#### Updated Rates:
- Employee Main Insurance: 10.67% → 10.67% (no change)
- Employee Auxiliary Insurance: 3.33% → 3.33% (no change)  
- Employee Unemployment: 2.13% → 2.13% (no change)
- Employer Main Insurance: 15.42% → 15.42% (no change)
- Employer Auxiliary Insurance: 3.33% → 3.33% (no change)
- Employer Unemployment: 5.03% → 5.03% (no change)
- Employer Sickness: 2.87% → 2.87% (no change)
- Employer Work Accident: 0.67% → 0.67% (no change)

#### Technical Changes:
- Updated `GREEK_EFKA_*` constants in environment configuration
- Modified `calculateEfkaContributions()` method in PayrollCalculator
- Updated test cases in `efka-calculations.test.ts`

---

## [v2024.11.1] - 2024-11-30

### Changed - Minimum Wage Increase
- **Legal Reference**: Ministerial Decision A.1002/2024
- **Effective Date**: 2024-04-01
- **Impact**: Base salary validations, overtime calculations

#### Updated Amounts:
- Monthly Minimum Wage: €760 → €830 (+9.2%)
- Daily Minimum Wage: €25.33 → €27.65
- Hourly Minimum Wage: €3.17 → €3.45

#### Technical Changes:
- Updated `GREEK_MINIMUM_WAGE_*` constants
- Modified salary validation in `validateNumericInput()` 
- Updated `baseSalaryValidation` minimum threshold
- Refreshed test fixtures for minimum wage scenarios

---

## [v2024.10.2] - 2024-10-15

### Added - Digital Work Card Integration
- **Legal Reference**: Law 4808/2021 - Digital Transformation of Labor Relations
- **Effective Date**: 2024-10-01 (phased rollout)
- **Impact**: Time tracking, ERGANI II submissions, compliance reporting

#### New Features:
- Real-time ERGANI II API integration for work declarations
- Digital work card validation and synchronization
- Automated compliance alerts for missing declarations
- Mobile QR/NFC time capture with location verification

#### Technical Changes:
- Added `DigitalWorkCardService` for API integration
- Created `ErganiComplianceService` for submission handling
- Implemented `TimeCaptureCore` for multi-modal time tracking
- Added compliance monitoring dashboard

---

## [v2024.09.1] - 2024-09-20

### Changed - Tax Brackets Adjustment
- **Legal Reference**: Law 5007/2024 - Annual Tax Reform
- **Effective Date**: 2024-01-01 (retroactive application)
- **Impact**: Income tax calculations, take-home pay

#### Updated Tax Brackets:
```json
[
  {"min": 0, "max": 10000, "rate": 0.09},        // 9% (unchanged)
  {"min": 10000, "max": 20000, "rate": 0.22},   // 22% (was 24%)
  {"min": 20000, "max": 30000, "rate": 0.28},   // 28% (unchanged)
  {"min": 30000, "max": 40000, "rate": 0.36},   // 36% (was 34%)
  {"min": 40000, "max": -1, "rate": 0.44}       // 44% (unchanged)
]
```

#### Technical Changes:
- Updated `GREEK_TAX_BRACKETS` environment variable
- Modified `calculateIncomeTax()` algorithm
- Updated tax calculation test cases
- Added retroactive tax adjustment utilities

---

## [v2024.08.1] - 2024-08-10

### Added - Severance Pay Reform Implementation
- **Legal Reference**: Law 4093/2012 - Amended by Law 4808/2021
- **Effective Date**: 2024-08-01
- **Impact**: Termination calculations, severance entitlements

#### New Severance Bands:
| Service Years | Months of Pay | Previous |
|---------------|---------------|----------|
| 1-2 years     | 1 month       | 1 month  |
| 2-5 years     | 2 months      | 2 months |
| 5-10 years    | 3 months      | 4 months |
| 10-15 years   | 4 months      | 6 months |
| 15-20 years   | 5 months      | 8 months |
| 20-25 years   | 6 months      | 10 months|
| 25+ years     | 12 months     | 17 months|

#### Technical Changes:
- Implemented `SeveranceRulesService` with new calculation logic
- Added severance eligibility determination based on termination cause
- Created `SeveranceWizard` component for HR processing
- Updated legal document templates for severance agreements

---

## [v2024.07.1] - 2024-07-25

### Added - Collective Bargaining Agreement (CBA) Support
- **Legal Reference**: Various CBAs - GSEE, ADEDY, Sector-Specific
- **Effective Date**: Various (based on CBA signature dates)
- **Impact**: Allowances, overtime rates, working conditions

#### New Features:
- CBA reference tracking per employee
- Sector-specific overtime premium calculations
- Holiday and Sunday premium variations by CBA
- Union-negotiated allowance automatic application

#### Technical Changes:
- Added `unionCbaRef` field to employee schema
- Implemented CBA-specific calculation overrides
- Created CBA template management system
- Added CBA compliance validation rules

---

## [v2024.06.2] - 2024-06-30

### Fixed - Solidarity Tax Calculation Error
- **Legal Reference**: Law 4387/2016 - Solidarity Tax Implementation
- **Effective Date**: Immediate fix (affects 2024 calculations)
- **Impact**: Take-home pay accuracy for higher earners

#### Bug Fix:
- **Issue**: Solidarity tax was incorrectly applied to gross pay instead of taxable income
- **Resolution**: Fixed calculation base to use annual taxable income
- **Affected Employees**: Those earning >€12,000 annually

#### Updated Solidarity Tax Brackets:
```json
[
  {"min": 0, "max": 12000, "rate": 0},           // No solidarity tax
  {"min": 12000, "max": 20000, "rate": 0.022},  // 2.2%
  {"min": 20000, "max": 30000, "rate": 0.05},   // 5%
  {"min": 30000, "max": 40000, "rate": 0.065},  // 6.5%
  {"min": 40000, "max": 65000, "rate": 0.075},  // 7.5%
  {"min": 65000, "max": -1, "rate": 0.09}       // 9%
]
```

#### Technical Changes:
- Fixed `calculateSolidarityTax()` method implementation
- Added comprehensive test coverage for solidarity tax scenarios
- Created payroll adjustment utilities for affected periods
- Enhanced tax calculation audit trail

---

## Legal Reference Quick Links

### Core Labor Laws
- **Law 4808/2021**: Labor Relations Reform (Digital Work Cards, Flexible Work)
- **Law 4093/2012**: Severance Pay Calculation Framework
- **Law 4387/2016**: Solidarity Tax Implementation
- **PD 81/2023**: Current EFKA Contribution Rates

### Tax Legislation
- **Law 5007/2024**: Annual Tax Reform (Current Tax Brackets)
- **Law 4172/2013**: Income Tax Code (Base Framework)
- **Ministerial Decisions**: Annual minimum wage adjustments

### Social Security
- **EFKA Regulations**: Contribution rates and calculation methods
- **ERGANI II System**: Digital work declarations and compliance
- **e-EFKA/APD Integration**: Automated social security reporting

---

## Compliance Notes

### Version Tagging Strategy
- **Major Version** (v2024): Calendar year for legal compliance tracking
- **Minor Version** (.12): Month of legal change implementation  
- **Patch Version** (.1): Bug fixes and non-legal updates

### Change Implementation Process
1. **Legal Analysis**: Review official government publications
2. **Impact Assessment**: Identify affected payroll calculations
3. **Technical Implementation**: Update constants, algorithms, tests
4. **Validation**: Compare results with official examples
5. **Release Tagging**: Create git tag with legal reference
6. **Documentation**: Update this changelog with full details

### Testing Standards
- All legal changes must have corresponding test cases
- Test data based on official examples from government sources
- Regression testing against previous legal versions
- End-to-end validation with sample payroll runs

---

## Archive Policy

This changelog maintains a complete historical record of all legal changes affecting payroll calculations. Entries are never removed to ensure full audit trail compliance with Greek labor law requirements for 10-year record retention.

For technical implementation details, see the corresponding git tags and commit messages.
For legal interpretation questions, consult qualified Greek labor law counsel.