# Legal Document Update Workflow

## Overview
This document outlines the standard workflow for updating legal documents in the version control system when Greek labor laws change.

## Workflow Steps

### 1. Law Change Detection
- **Monitor Sources**: Government gazette (FEK), ministry websites, legal bulletins
- **Automated Alerts**: Set up notifications for key legal sources
- **Impact Assessment**: Evaluate which config sections are affected

### 2. Document Update Process

#### 2.1 Initial Review
1. **Legal Team Review**: Assess the legal change impact
2. **Create Working Branch**: `git checkout -b legal-update/document-name-vX.X`
3. **Update Document**: Add new version to appropriate directory

#### 2.2 Document Preparation
1. **Update Registry**: Add new version entry to `legal-document-registry.json`
2. **Calculate Checksum**: Generate SHA-256 hash for integrity verification
3. **Update Metadata**: Effective date, version number, change description

#### 2.3 Configuration Impact Analysis
1. **Identify Config Changes**: Determine which constants need updates
2. **Update Environment Variables**: Modify `.env.example` with new values
3. **Test Configuration**: Validate new settings work correctly

### 3. Review and Approval Process

#### 3.1 Internal Review
- [ ] Legal accuracy review
- [ ] Configuration impact assessment
- [ ] Testing with new constants
- [ ] Documentation updates

#### 3.2 Approval Checklist
- [ ] Legal team sign-off
- [ ] Compliance team approval
- [ ] Technical validation passed
- [ ] Environment variables updated
- [ ] Registry entry complete

### 4. Deployment Process

#### 4.1 Pre-Deployment
1. **Backup Current Config**: Create snapshot of current state
2. **Update Version Number**: Increment `GREEK_LAW_VERSION`
3. **Deploy to Staging**: Test in non-production environment

#### 4.2 Production Deployment
1. **Schedule Maintenance Window**: Plan for payroll system downtime
2. **Deploy Configuration**: Update environment variables
3. **Restart Services**: Apply new configuration
4. **Validate Compliance**: Run compliance checks

#### 4.3 Post-Deployment
1. **Monitor System**: Check for calculation errors
2. **Generate Compliance Report**: Verify all documents are current
3. **Notify Stakeholders**: Inform teams of law changes
4. **Archive Old Version**: Move superseded documents to archive

## Emergency Procedure

### Critical Law Changes (Same-Day Implementation)
1. **Expedited Review**: 2-hour legal review window
2. **Immediate Deployment**: Skip staging for critical compliance
3. **Post-Change Validation**: Extended monitoring period
4. **Documentation Backfill**: Complete documentation within 48 hours

## Rollback Procedure

### Configuration Rollback
1. **Identify Issue**: Payroll calculation error or compliance failure
2. **Revert Environment Variables**: Return to previous `GREEK_LAW_VERSION`
3. **Restart Services**: Apply previous configuration
4. **Validate Rollback**: Ensure system returns to working state

### Document Rollback
1. **Mark Current as SUPERSEDED**: Update registry status
2. **Reactivate Previous Version**: Change status back to ACTIVE
3. **Update Legal References**: Revert to previous document versions
4. **Generate Incident Report**: Document rollback reasoning

## Quality Assurance

### Document Validation
- [ ] SHA-256 checksum matches
- [ ] All required metadata present
- [ ] Version numbering follows convention
- [ ] Effective dates are logical
- [ ] Related documents are linked

### Configuration Validation  
- [ ] Constants match legal requirements
- [ ] Calculations produce correct results
- [ ] Compliance checks pass
- [ ] Environment variables are properly formatted
- [ ] Version tracking is consistent

### Compliance Validation
- [ ] All active documents are current
- [ ] No expired documents in ACTIVE status
- [ ] Legal references are complete
- [ ] Audit trail is maintained
- [ ] Regulatory requirements met

## Roles and Responsibilities

### Legal Team
- Review legal documents for accuracy
- Approve document versions
- Assess regulatory compliance impact
- Provide legal interpretation guidance

### Compliance Team  
- Monitor regulatory changes
- Validate compliance requirements
- Approve configuration changes
- Generate compliance reports

### Engineering Team
- Implement configuration changes
- Test payroll calculations
- Deploy system updates
- Monitor system performance

### Management Team
- Approve critical changes
- Authorize emergency procedures
- Review compliance reports
- Approve budget for legal updates

## Documentation Requirements

### Change Documentation
- **Change Summary**: What changed and why
- **Impact Assessment**: Which systems are affected
- **Implementation Timeline**: When changes take effect
- **Validation Results**: Testing and compliance verification

### Audit Trail Requirements
- **Document History**: All version changes tracked
- **Approval Records**: Who approved what and when
- **Configuration Changes**: Environment variable modifications
- **Deployment Records**: When and how changes were deployed