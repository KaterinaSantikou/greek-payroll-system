#!/bin/bash

# Advanced Dependency Security Audit for PayrollSync
# Focuses specifically on npm package vulnerabilities and supply chain security

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

echo "📦 PayrollSync Dependency Security Audit"
echo "========================================"

# Ensure we have package files
if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    exit 1
fi

# 1. Basic npm audit
echo ""
print_info "1. Running comprehensive npm audit..."

# Create audit report
AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || echo '{"error": "audit failed"}')
echo "$AUDIT_OUTPUT" > "dependency-audit-$(date +%Y%m%d_%H%M%S).json"

# Parse results
VULNERABILITIES=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")
HIGH_VULN=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
CRITICAL_VULN=$(echo "$AUDIT_OUTPUT" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")

echo "📊 Vulnerability Summary:"
echo "   Total vulnerabilities: $VULNERABILITIES"
echo "   High severity: $HIGH_VULN"
echo "   Critical severity: $CRITICAL_VULN"

if [ "$CRITICAL_VULN" -gt 0 ] || [ "$HIGH_VULN" -gt 0 ]; then
    print_error "Critical or high severity vulnerabilities found!"
    echo ""
    echo "🔧 Attempting automatic fixes..."
    npm audit fix --dry-run
    echo ""
    print_warning "Review the above changes, then run 'npm audit fix' to apply"
else
    print_status "No critical or high severity vulnerabilities"
fi

# 2. Check for outdated packages (security risk)
echo ""
print_info "2. Checking for outdated packages..."

OUTDATED=$(npm outdated --json 2>/dev/null || echo "{}")
OUTDATED_COUNT=$(echo "$OUTDATED" | jq 'keys | length' 2>/dev/null || echo "0")

if [ "$OUTDATED_COUNT" -gt 0 ]; then
    print_warning "Found $OUTDATED_COUNT outdated packages"
    echo "$OUTDATED" | jq -r 'to_entries[] | "   📦 \(.key): \(.value.current) → \(.value.latest)"' 2>/dev/null || true
    echo ""
    echo "💡 Run 'npm update' to update dependencies"
else
    print_status "All packages are up to date"
fi

# 3. Analyze dependency tree depth
echo ""
print_info "3. Analyzing dependency tree complexity..."

DEP_TREE=$(npm ls --json --depth=5 2>/dev/null || echo '{"dependencies":{}}')
DIRECT_DEPS=$(echo "$DEP_TREE" | jq '.dependencies | keys | length' 2>/dev/null || echo "0")
echo "📊 Dependency Statistics:"
echo "   Direct dependencies: $DIRECT_DEPS"

# Find packages with many dependencies (supply chain risk)
echo ""
echo "🔗 Packages with highest dependency count:"
npm ls --depth=1 --json 2>/dev/null | jq -r '.dependencies | to_entries[] | select(.value.dependencies) | "\(.key): \(.value.dependencies | keys | length) subdeps"' | sort -k2 -nr | head -5 || echo "Unable to analyze dependency depth"

# 4. Check for duplicate packages (bloat/confusion risk)
echo ""
print_info "4. Checking for duplicate packages..."

DUPLICATES=$(npm ls --json 2>&1 | grep -c "UNMET DEPENDENCY\|invalid\|extraneous" || echo "0")
if [ "$DUPLICATES" -gt 0 ]; then
    print_warning "Found $DUPLICATES dependency issues"
    npm ls 2>&1 | grep -E "UNMET DEPENDENCY|invalid|extraneous" | head -10 || true
else
    print_status "No duplicate or conflicting packages found"
fi

# 5. Analyze package.json for security best practices
echo ""
print_info "5. Analyzing package.json security configuration..."

# Check for exact versions (security best practice)
EXACT_VERSIONS=$(jq -r '.dependencies // {} | to_entries[] | select(.value | startswith("^") or startswith("~") | not) | .key' package.json 2>/dev/null | wc -l || echo "0")
TOTAL_DEPS=$(jq -r '.dependencies // {} | keys | length' package.json 2>/dev/null || echo "0")

if [ "$TOTAL_DEPS" -gt 0 ]; then
    EXACT_PERCENTAGE=$((EXACT_VERSIONS * 100 / TOTAL_DEPS))
    echo "📊 Version pinning analysis:"
    echo "   Exact versions: $EXACT_VERSIONS/$TOTAL_DEPS ($EXACT_PERCENTAGE%)"
    
    if [ "$EXACT_PERCENTAGE" -lt 50 ]; then
        print_warning "Consider using exact versions for better security (currently $EXACT_PERCENTAGE%)"
        echo "   Flexible versions can introduce unexpected changes"
    else
        print_status "Good version pinning practice ($EXACT_PERCENTAGE% exact versions)"
    fi
fi

# Check for scripts that could be security risks
echo ""
echo "🔍 Checking package.json scripts for security risks..."
RISKY_SCRIPTS=$(jq -r '.scripts // {} | to_entries[] | select(.value | contains("rm -rf") or contains("sudo") or contains("curl") or contains("wget")) | "\(.key): \(.value)"' package.json 2>/dev/null || true)

if [ -n "$RISKY_SCRIPTS" ]; then
    print_warning "Found potentially risky scripts:"
    echo "$RISKY_SCRIPTS"
else
    print_status "No risky scripts detected in package.json"
fi

# 6. Check package-lock.json integrity
echo ""
print_info "6. Verifying package-lock.json integrity..."

if [ -f "package-lock.json" ]; then
    # Verify package-lock is in sync with package.json
    npm ci --dry-run >/dev/null 2>&1 && {
        print_status "package-lock.json is in sync with package.json"
    } || {
        print_warning "package-lock.json may be out of sync"
        echo "   Run 'npm install' to regenerate lock file"
    }
    
    # Check for missing integrity hashes
    MISSING_INTEGRITY=$(jq -r '.packages | to_entries[] | select(.value.integrity == null and .key != "") | .key' package-lock.json 2>/dev/null | wc -l || echo "0")
    if [ "$MISSING_INTEGRITY" -gt 0 ]; then
        print_warning "Found $MISSING_INTEGRITY packages without integrity hashes"
    else
        print_status "All packages have integrity verification"
    fi
else
    print_error "package-lock.json missing - this is a security risk!"
    echo "   🔧 Run 'npm install' to generate package-lock.json"
fi

# 7. Final recommendations
echo ""
print_info "Security Recommendations for PayrollSync:"
echo ""

if [ "$CRITICAL_VULN" -gt 0 ]; then
    echo "🚨 URGENT: Fix critical vulnerabilities immediately"
    echo "   Run: npm audit fix"
fi

if [ "$HIGH_VULN" -gt 0 ]; then
    echo "⚠️  HIGH PRIORITY: Address high severity vulnerabilities"
    echo "   Run: npm audit fix"
fi

if [ "$OUTDATED_COUNT" -gt 5 ]; then
    echo "📦 UPDATE RECOMMENDED: Many outdated packages ($OUTDATED_COUNT)"
    echo "   Run: npm update"
fi

echo ""
echo "🔒 Regular maintenance tasks:"
echo "   - Run this audit weekly"
echo "   - Monitor npm advisories"
echo "   - Keep dependencies updated"
echo "   - Use exact versions for critical dependencies"
echo "   - Review new dependencies before adding"

echo ""
print_status "Dependency audit completed!"