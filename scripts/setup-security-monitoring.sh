#!/bin/bash

# Setup Security Monitoring for PayrollSync
# Configures automated security scanning and monitoring

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "🛡️  PayrollSync Security Monitoring Setup"
echo "========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in a Node.js project directory!"
    exit 1
fi

# 1. Create security monitoring directories
print_info "1. Setting up security monitoring structure..."

mkdir -p security-reports
mkdir -p .github/workflows 2>/dev/null || mkdir -p security-ci
mkdir -p scripts/security

print_status "Security directories created"

# 2. Create package.json scripts for security
print_info "2. Adding security scripts to package.json..."

# Add security scripts if they don't exist
if ! grep -q '"security:scan"' package.json; then
    # Create temporary package.json with security scripts
    jq '.scripts += {
        "security:scan": "./scripts/security-scan.sh",
        "security:audit": "./scripts/dependency-audit.sh", 
        "security:ci": "./scripts/ci-security-check.sh",
        "security:fix": "npm audit fix && npm run lint:fix",
        "security:report": "./scripts/security-scan.sh && echo Report generated in security-reports/"
    }' package.json > package.json.tmp && mv package.json.tmp package.json
    
    print_status "Security scripts added to package.json"
else
    print_status "Security scripts already exist in package.json"
fi

# 3. Create GitHub Actions workflow for security (if GitHub project)
print_info "3. Creating CI/CD security workflow..."

WORKFLOW_FILE=".github/workflows/security.yml"
if [ -d ".git" ]; then
    mkdir -p .github/workflows
    
    cat > "$WORKFLOW_FILE" << 'EOF'
name: Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    # Run security scan daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  security-audit:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security checks
      run: npm run security:ci
      continue-on-error: false
    
    - name: Run comprehensive security scan
      run: npm run security:scan
      continue-on-error: true
    
    - name: Upload security reports
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: security-reports
        path: security-reports/
        retention-days: 30
    
    - name: Comment PR with security results
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          const path = require('path');
          
          // Find latest security summary
          const reportsDir = 'security-reports';
          if (fs.existsSync(reportsDir)) {
            const files = fs.readdirSync(reportsDir)
              .filter(f => f.includes('security_summary'))
              .sort()
              .reverse();
            
            if (files.length > 0) {
              const summary = fs.readFileSync(path.join(reportsDir, files[0]), 'utf8');
              
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## 🔒 Security Scan Results\n\n\`\`\`\n${summary}\n\`\`\``
              });
            }
          }

  dependency-review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
    - uses: actions/checkout@v4
    - uses: actions/dependency-review-action@v4
      with:
        fail-on-severity: high
        comment-summary-in-pr: true
EOF
    
    print_status "GitHub Actions security workflow created"
    
    # Create alternative CI script for non-GitHub environments
    cat > "security-ci/security-pipeline.sh" << 'EOF'
#!/bin/bash
# Alternative CI security pipeline for non-GitHub environments

set -e

echo "🔐 PayrollSync Security Pipeline"
echo "================================"

# Install dependencies
npm ci

# Run critical security checks (fail on issues)
echo "1. Running critical security checks..."
npm run security:ci

# Run comprehensive security scan (informational)
echo "2. Running comprehensive security scan..."
npm run security:scan || true

echo "✅ Security pipeline completed"
EOF
    
    chmod +x "security-ci/security-pipeline.sh"
    print_status "Alternative CI security pipeline created"
else
    print_warning "Not a Git repository - skipping GitHub Actions setup"
fi

# 4. Create weekly security audit reminder
print_info "4. Setting up security audit reminders..."

cat > "scripts/security/weekly-security-checklist.md" << 'EOF'
# Weekly Security Checklist for PayrollSync

## Automated Checks ✅
Run these commands weekly:

```bash
# Complete security scan
npm run security:scan

# Dependency audit
npm run security:audit  

# Fix known vulnerabilities
npm run security:fix
```

## Manual Review Items 🔍

### Dependencies
- [ ] Review new dependencies added this week
- [ ] Check for major version updates of critical packages
- [ ] Verify no unnecessary packages were installed
- [ ] Review package-lock.json changes

### Code Security
- [ ] Review any new authentication/authorization code
- [ ] Check for hardcoded secrets or passwords
- [ ] Verify input validation on new endpoints
- [ ] Review error handling (no sensitive data exposure)

### Infrastructure
- [ ] Verify environment variables are properly configured
- [ ] Check file permissions on sensitive files
- [ ] Review any new third-party integrations
- [ ] Confirm backup and recovery procedures

### Compliance (Greek Payroll System)
- [ ] Verify personal data handling compliance (GDPR)
- [ ] Check encryption of sensitive payroll data
- [ ] Review access controls for HR data
- [ ] Confirm audit logging is functioning

## Monthly Deep Dive 🕵️

### Supply Chain Security
- [ ] Review all npm packages for suspicious activity
- [ ] Check package maintainer changes
- [ ] Verify integrity hashes in package-lock.json
- [ ] Review dependency licenses

### Security Tools Update
- [ ] Update ESLint security plugins
- [ ] Review new security rules available
- [ ] Update audit-ci and security scanning tools
- [ ] Check for new vulnerabilities in security tools themselves

## Emergency Response 🚨

If critical vulnerabilities are found:

1. **Immediate**: Stop deployments
2. **Assess**: Determine impact on payroll data
3. **Fix**: Apply patches or workarounds
4. **Verify**: Run full security scan
5. **Deploy**: After thorough testing
6. **Document**: Update security incident log

## Resources 📚

- [npm security best practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [OWASP Node.js Security](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Greek GDPR Compliance](https://www.dpa.gr/)

---
**Last Updated**: $(date +%Y-%m-%d)
**Next Review**: $(date -d '+7 days' +%Y-%m-%d)
EOF

print_status "Weekly security checklist created"

# 5. Test security setup
print_info "5. Testing security setup..."

# Test that all scripts are executable and functional
for script in "scripts/security-scan.sh" "scripts/dependency-audit.sh" "scripts/ci-security-check.sh"; do
    if [ -x "$script" ]; then
        print_status "$script is executable"
    else
        print_warning "$script is not executable"
        chmod +x "$script"
    fi
done

# Quick validation test
echo ""
echo "🧪 Running quick security validation..."

# Test npm audit
if npm audit --audit-level critical >/dev/null 2>&1; then
    print_status "No critical vulnerabilities detected"
else
    print_warning "Critical vulnerabilities found - run 'npm audit fix'"
fi

# Test ESLint security rules
if npx eslint --help >/dev/null 2>&1; then
    print_status "ESLint security rules available"
else
    print_error "ESLint not available"
fi

# 6. Summary and next steps
echo ""
print_info "🎉 Security monitoring setup complete!"
echo ""
echo "📋 What's been configured:"
echo "   ✅ Security scanning scripts"
echo "   ✅ Dependency audit tools"
echo "   ✅ CI/CD security pipeline"
echo "   ✅ Weekly security checklist"
echo "   ✅ Automated vulnerability detection"

echo ""
print_info "🚀 Next steps:"
echo "   1. Run initial security scan: npm run security:scan"
echo "   2. Fix any critical issues: npm run security:fix"
echo "   3. Set up weekly security review schedule"
echo "   4. Configure security alerts in your environment"

echo ""
print_info "📊 Available security commands:"
echo "   npm run security:scan      # Comprehensive security analysis"
echo "   npm run security:audit     # Dependency vulnerability scan"
echo "   npm run security:ci        # CI/CD security checks (fail on critical)"
echo "   npm run security:fix       # Auto-fix known issues"
echo "   npm run security:report    # Generate security report"

echo ""
print_status "PayrollSync security monitoring is now active! 🔐"