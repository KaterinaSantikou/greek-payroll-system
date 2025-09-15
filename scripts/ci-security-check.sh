#!/bin/bash

# CI/CD Security Check Script for PayrollSync
# Designed to fail builds if critical security issues are found
# Suitable for automated deployment pipelines

set -e

# Exit codes
SUCCESS=0
WARNING=1
CRITICAL=2

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

echo "🔐 PayrollSync CI Security Check"
echo "==============================="

EXIT_CODE=$SUCCESS
ISSUES_FOUND=0

# 1. Critical dependency vulnerabilities check
echo ""
echo "1. Checking for critical vulnerabilities..."

# Use audit-ci for strict security checking
if command -v npx >/dev/null 2>&1; then
    # Check for critical and high vulnerabilities only
    if npx audit-ci --critical --high >/dev/null 2>&1; then
        print_status "No critical or high vulnerabilities found"
    else
        print_error "CRITICAL: High/Critical vulnerabilities detected!"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        EXIT_CODE=$CRITICAL
        
        echo ""
        echo "📋 Vulnerability details:"
        npm audit --audit-level high 2>&1 | head -20 || true
    fi
else
    # Fallback to npm audit
    AUDIT_JSON=$(npm audit --json 2>/dev/null || echo '{"error":"failed"}')
    CRITICAL_COUNT=$(echo "$AUDIT_JSON" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
    HIGH_COUNT=$(echo "$AUDIT_JSON" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
    
    if [ "$CRITICAL_COUNT" -gt 0 ] || [ "$HIGH_COUNT" -gt 0 ]; then
        print_error "CRITICAL: Found $CRITICAL_COUNT critical and $HIGH_COUNT high vulnerabilities"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        EXIT_CODE=$CRITICAL
    else
        print_status "No critical or high vulnerabilities"
    fi
fi

# 2. ESLint security rules check
echo ""
echo "2. Running ESLint security analysis..."

# Run ESLint with security rules only, fail on errors
if npx eslint "**/*.{js,jsx,ts,tsx}" \
    --rule "security/detect-eval-with-expression: error" \
    --rule "security/detect-non-literal-require: error" \
    --rule "security/detect-child-process: error" \
    --rule "security/detect-unsafe-regex: error" \
    --rule "no-eval: error" \
    --max-warnings 0 >/dev/null 2>&1; then
    print_status "No security violations in code"
else
    print_error "SECURITY VIOLATIONS: ESLint found security issues"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    EXIT_CODE=$CRITICAL
    
    # Show specific security violations
    echo ""
    echo "📋 Security violations found:"
    npx eslint "**/*.{js,jsx,ts,tsx}" \
        --rule "security/detect-eval-with-expression: error" \
        --rule "security/detect-non-literal-require: error" \
        --rule "security/detect-child-process: error" \
        --rule "security/detect-unsafe-regex: error" \
        --rule "no-eval: error" 2>&1 | head -15 || true
fi

# 3. Package-lock integrity check
echo ""
echo "3. Verifying package-lock.json integrity..."

if [ ! -f "package-lock.json" ]; then
    print_error "CRITICAL: package-lock.json missing!"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    EXIT_CODE=$CRITICAL
    echo "   This allows dependency confusion attacks"
    echo "   Run 'npm install' to generate package-lock.json"
elif npm ci --dry-run >/dev/null 2>&1; then
    print_status "package-lock.json integrity verified"
else
    print_error "CRITICAL: package-lock.json out of sync!"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    EXIT_CODE=$CRITICAL
    echo "   Run 'npm install' to fix package-lock.json"
fi

# 4. Secrets detection (basic patterns)
echo ""
echo "4. Scanning for exposed secrets..."

SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]{8,}['\"]"
    "api_key\s*=\s*['\"][^'\"]{20,}['\"]"
    "secret\s*=\s*['\"][^'\"]{16,}['\"]"
    "-----BEGIN.*PRIVATE KEY-----"
    "['\"]sk_[a-zA-Z0-9]{20,}['\"]"
    "['\"]pk_[a-zA-Z0-9]{20,}['\"]"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r -i -E "$pattern" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ".git" >/dev/null; then
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
done

if [ $SECRETS_FOUND -gt 0 ]; then
    print_error "POTENTIAL SECRETS: Found $SECRETS_FOUND potential secret patterns"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
    EXIT_CODE=$CRITICAL
    echo "   Review code manually for exposed credentials"
    echo "   Use environment variables for sensitive data"
else
    print_status "No obvious secrets detected in code"
fi

# 5. File permissions check
echo ""
echo "5. Checking file permissions..."

WRITABLE_FILES=$(find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | wc -l || echo "0")
if [ "$WRITABLE_FILES" -gt 0 ]; then
    print_warning "Found $WRITABLE_FILES world-writable files"
    EXIT_CODE=$WARNING
    find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null | head -5 || true
else
    print_status "File permissions are secure"
fi

# Final summary
echo ""
echo "🔍 Security Check Summary"
echo "========================"

if [ $EXIT_CODE -eq $SUCCESS ]; then
    print_status "All security checks passed! ✨"
    echo "   Safe to deploy PayrollSync"
elif [ $EXIT_CODE -eq $WARNING ]; then
    print_warning "Security warnings found ($ISSUES_FOUND issues)"
    echo "   Review and fix before production deployment"
elif [ $EXIT_CODE -eq $CRITICAL ]; then
    print_error "CRITICAL security issues found! ($ISSUES_FOUND issues)"
    echo "   🚨 DO NOT DEPLOY until issues are resolved"
    echo ""
    echo "🔧 Quick fixes:"
    echo "   1. Run 'npm audit fix' for vulnerabilities"
    echo "   2. Fix ESLint security violations"
    echo "   3. Ensure package-lock.json is committed"
    echo "   4. Move secrets to environment variables"
fi

echo ""
echo "📊 Exit Code: $EXIT_CODE"
case $EXIT_CODE in
    0) echo "   ✅ Success - No critical issues" ;;
    1) echo "   ⚠️  Warning - Minor issues found" ;;
    2) echo "   ❌ Critical - Deployment blocked" ;;
esac

exit $EXIT_CODE