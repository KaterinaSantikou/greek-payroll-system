#!/bin/bash

# Comprehensive Security Scanning for Greek Payroll System
# Combines multiple security tools for maximum vulnerability detection

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

echo "🔒 Security Analysis for PayrollSync"
echo "==================================="

# Create security reports directory
mkdir -p security-reports
REPORT_DIR="security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📊 Report timestamp: $TIMESTAMP"
echo "📁 Reports will be saved to: $REPORT_DIR"

# 1. NPM Audit - Dependency Vulnerabilities
echo ""
print_info "1. Running npm audit for dependency vulnerabilities..."
{
    echo "# NPM Audit Report - $TIMESTAMP"
    echo "Generated: $(date)"
    echo ""
    
    # Standard audit
    npm audit --json > "$REPORT_DIR/npm_audit_$TIMESTAMP.json" 2>/dev/null || true
    npm audit 2>&1 || {
        print_warning "npm audit found vulnerabilities"
    }
    
    # Production-only audit
    echo ""
    echo "## Production Dependencies Only"
    npm audit --production 2>&1 || {
        print_warning "Production dependencies have vulnerabilities"
    }
    
} > "$REPORT_DIR/npm_audit_$TIMESTAMP.txt"

# Check if high/critical vulnerabilities exist
if npm audit --audit-level high --json >/dev/null 2>&1; then
    print_status "No high or critical vulnerabilities in dependencies"
else
    print_error "High or critical vulnerabilities found in dependencies!"
    echo "Run 'npm audit fix' to attempt automatic fixes"
fi

# 2. ESLint Security Rules
echo ""
print_info "2. Running ESLint security analysis..."
{
    echo "# ESLint Security Report - $TIMESTAMP"
    echo "Generated: $(date)"
    echo ""
    
    # Run ESLint with focus on security rules
    npx eslint "**/*.{js,jsx,ts,tsx}" \
        --format json \
        --output-file "$REPORT_DIR/eslint_security_$TIMESTAMP.json" \
        --rule "security/*: error" \
        --rule "node/no-deprecated-api: error" \
        --rule "no-eval: error" \
        --rule "security/detect-eval-with-expression: error" 2>/dev/null || {
        print_warning "ESLint found security issues"
    }
    
    # Human-readable format
    npx eslint "**/*.{js,jsx,ts,tsx}" \
        --rule "security/*: error" \
        --rule "node/no-deprecated-api: error" \
        --rule "no-eval: error" 2>&1 || true
        
} > "$REPORT_DIR/eslint_security_$TIMESTAMP.txt"

# 3. Dependency Analysis
echo ""
print_info "3. Analyzing dependency tree for security risks..."
{
    echo "# Dependency Analysis Report - $TIMESTAMP"
    echo "Generated: $(date)"
    echo ""
    
    echo "## Installed Package Count"
    npm list --depth=0 --json | jq -r '.dependencies | keys | length' 2>/dev/null || echo "Unable to count packages"
    
    echo ""
    echo "## Outdated Packages (Security Risk)"
    npm outdated --json 2>/dev/null | jq '.' || echo "All packages up to date"
    
    echo ""
    echo "## Dependencies with Known Issues"
    npm ls --json 2>/dev/null | jq -r '.problems[]?' || echo "No dependency problems detected"
    
} > "$REPORT_DIR/dependency_analysis_$TIMESTAMP.txt"

# 4. Package Lock Analysis
echo ""
print_info "4. Analyzing package-lock.json for integrity issues..."
{
    echo "# Package Lock Analysis - $TIMESTAMP"
    echo "Generated: $(date)"
    echo ""
    
    if [ -f "package-lock.json" ]; then
        echo "## Package Lock File Status"
        echo "✅ package-lock.json exists"
        echo "Size: $(wc -c < package-lock.json) bytes"
        echo "Packages: $(jq '.packages | keys | length' package-lock.json 2>/dev/null || echo 'Unable to count')"
        
        # Check for missing integrity hashes (security risk)
        echo ""
        echo "## Integrity Hash Analysis"
        MISSING_INTEGRITY=$(jq -r '.packages | to_entries[] | select(.value.integrity == null and .key != "") | .key' package-lock.json 2>/dev/null | wc -l || echo 0)
        if [ "$MISSING_INTEGRITY" -gt 0 ]; then
            print_warning "Found $MISSING_INTEGRITY packages without integrity hashes"
            jq -r '.packages | to_entries[] | select(.value.integrity == null and .key != "") | "  - " + .key' package-lock.json 2>/dev/null || true
        else
            print_status "All packages have integrity hashes"
        fi
        
    else
        print_error "No package-lock.json found - this is a security risk!"
        echo "Run 'npm install' to generate package-lock.json"
    fi
} > "$REPORT_DIR/package_lock_analysis_$TIMESTAMP.txt"

# 5. Secrets Detection (basic patterns)
echo ""
print_info "5. Scanning for potential secrets in code..."
{
    echo "# Secrets Detection Report - $TIMESTAMP"
    echo "Generated: $(date)"
    echo ""
    
    echo "## Potential Secret Patterns Found"
    
    # Common secret patterns
    SECRET_PATTERNS=(
        "password.*=.*['\"][^'\"]*['\"]"
        "api_key.*=.*['\"][^'\"]*['\"]"
        "secret.*=.*['\"][^'\"]*['\"]"
        "token.*=.*['\"][^'\"]*['\"]"
        "private_key"
        "-----BEGIN.*PRIVATE KEY-----"
        "['\"]pk_[a-zA-Z0-9]{20,}['\"]"
        "['\"]sk_[a-zA-Z0-9]{20,}['\"]"
    )
    
    SECRETS_FOUND=0
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if grep -r -i -n "$pattern" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" . 2>/dev/null; then
            SECRETS_FOUND=$((SECRETS_FOUND + 1))
        fi
    done
    
    if [ $SECRETS_FOUND -eq 0 ]; then
        print_status "No obvious secret patterns detected"
    else
        print_warning "Found $SECRETS_FOUND potential secret patterns - review manually"
    fi
    
} > "$REPORT_DIR/secrets_detection_$TIMESTAMP.txt"

# 6. File Permission Analysis
echo ""
print_info "6. Analyzing file permissions for security issues..."
{
    echo "# File Permissions Analysis - $TIMESTAMP"
    echo "Generated: $(date)"
    echo ""
    
    echo "## World-Writable Files (Security Risk)"
    find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null || echo "None found"
    
    echo ""
    echo "## Executable JavaScript/TypeScript Files"
    find . -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | xargs ls -la | grep "^-rwx" || echo "None found"
    
} > "$REPORT_DIR/file_permissions_$TIMESTAMP.txt"

# 7. Generate Summary Report
echo ""
print_info "7. Generating security summary report..."

{
    echo "# PayrollSync Security Summary Report"
    echo "Generated: $(date)"
    echo "Timestamp: $TIMESTAMP"
    echo ""
    
    echo "## Critical Security Findings"
    
    # High priority issues
    HIGH_PRIORITY=0
    
    # Check npm audit for high/critical
    if ! npm audit --audit-level high --json >/dev/null 2>&1; then
        echo "❌ HIGH: Critical/High vulnerabilities in dependencies"
        HIGH_PRIORITY=$((HIGH_PRIORITY + 1))
    fi
    
    # Check for package-lock.json
    if [ ! -f "package-lock.json" ]; then
        echo "❌ HIGH: Missing package-lock.json file"
        HIGH_PRIORITY=$((HIGH_PRIORITY + 1))
    fi
    
    # Check for world-writable files
    WRITABLE_FILES=$(find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | wc -l)
    if [ "$WRITABLE_FILES" -gt 0 ]; then
        echo "⚠️  MEDIUM: Found $WRITABLE_FILES world-writable files"
    fi
    
    if [ $HIGH_PRIORITY -eq 0 ]; then
        echo "✅ No critical security issues detected"
    else
        echo ""
        echo "⚠️  ATTENTION: $HIGH_PRIORITY critical security issues found!"
        echo "Review the detailed reports in the $REPORT_DIR directory."
    fi
    
    echo ""
    echo "## Report Files Generated"
    ls -la "$REPORT_DIR"/*"$TIMESTAMP"* | awk '{print "- " $9 " (" $5 " bytes)"}'
    
    echo ""
    echo "## Recommendations for PayrollSync"
    echo "1. Run 'npm audit fix' to address dependency vulnerabilities"
    echo "2. Keep all dependencies updated regularly"
    echo "3. Use environment variables for all sensitive configuration"
    echo "4. Enable Replit's secret management for API keys"
    echo "5. Regular security audits (weekly recommended)"
    echo "6. Monitor for new vulnerabilities in dependencies"
    
} > "$REPORT_DIR/security_summary_$TIMESTAMP.txt"

# Display summary
echo ""
print_info "Security scan completed!"
echo ""
echo "📊 Reports generated:"
ls -la "$REPORT_DIR"/*"$TIMESTAMP"* | awk '{print "   📄 " $9 " (" $5 " bytes)"}'

echo ""
print_info "Next steps:"
echo "1. Review summary: cat $REPORT_DIR/security_summary_$TIMESTAMP.txt"
echo "2. Address critical issues first"
echo "3. Run 'npm audit fix' if vulnerabilities found"
echo "4. Schedule regular security scans"

echo ""
print_status "Security analysis complete! 🔒"