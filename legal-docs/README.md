# Legal Documents Version Control System

This directory contains version-controlled legal documents, policy references, and regulatory compliance materials that the Greek payroll system relies on for accurate calculations and compliance.

## Directory Structure

```
legal-docs/
├── greek-labor-law/           # Greek labor law references
│   ├── current/               # Currently active versions
│   ├── archived/              # Historical versions
│   └── pending/               # Under review versions
├── regulatory-compliance/     # Government regulations
│   ├── ergani/               # ERGANI II regulations
│   ├── efka/                 # EFKA regulations
│   └── aade/                 # AADE tax regulations
├── collective-agreements/     # CBA documents
├── court-decisions/          # Relevant court rulings
├── templates/                # Document templates
└── version-control/          # Tracking and metadata
```

## Version Control Standards

### Document Naming Convention
- Format: `DocumentName_vMajor.Minor_YYYY-MM-DD_Status.ext`
- Example: `LaborLaw_4808_v2.1_2024-12-01_ACTIVE.pdf`
- Status codes: DRAFT, REVIEW, ACTIVE, ARCHIVED, SUPERSEDED

### Version Numbering
- **Major versions** (1.0, 2.0): Substantial legal changes requiring code updates
- **Minor versions** (1.1, 1.2): Editorial changes, clarifications
- **Patch versions** (1.1.1): Corrections, formatting fixes

### Approval Workflow
1. **DRAFT**: Initial version or proposed changes
2. **REVIEW**: Under legal team review
3. **ACTIVE**: Approved and currently in effect
4. **ARCHIVED**: Superseded but retained for compliance
5. **SUPERSEDED**: Replaced by newer version

## Integration with Payroll System

Legal document versions are tracked in the configuration system and linked to specific payroll constant versions for full traceability and compliance auditing.