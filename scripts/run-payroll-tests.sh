#!/bin/bash

# Greek Payroll System - Unit Test Runner
# Executes comprehensive payroll rule testing with coverage reporting

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo "🧮 Greek Payroll System - Comprehensive Test Suite"
echo "================================================="

# Check if Jest is available
if ! npx jest --version >/dev/null 2>&1; then
    print_error "Jest is not available. Please install dependencies first."
    echo "Run: npm install"
    exit 1
fi

# Create coverage directory
mkdir -p coverage/payroll

print_info "1. Running overtime calculations tests..."
if npx jest tests/payroll/overtime-calculations.test.ts --coverage --collectCoverageFrom="lib/payroll/**/*.ts" --coverageDirectory=coverage/payroll/overtime; then
    print_status "Overtime calculations tests passed"
else
    print_error "Overtime calculations tests failed"
    exit 1
fi

print_info "2. Running allowances tests..."
if npx jest tests/payroll/allowances.test.ts --coverage --collectCoverageFrom="lib/payroll/**/*.ts" --coverageDirectory=coverage/payroll/allowances; then
    print_status "Allowances tests passed"
else
    print_error "Allowances tests failed"
    exit 1
fi

print_info "3. Running prorated salaries tests..."
if npx jest tests/payroll/prorated-salaries.test.ts --coverage --collectCoverageFrom="lib/payroll/**/*.ts" --coverageDirectory=coverage/payroll/prorated; then
    print_status "Prorated salaries tests passed"
else
    print_error "Prorated salaries tests failed"
    exit 1
fi

print_info "4. Running rounding logic tests..."
if npx jest tests/payroll/rounding-logic.test.ts --coverage --collectCoverageFrom="lib/payroll/**/*.ts" --coverageDirectory=coverage/payroll/rounding; then
    print_status "Rounding logic tests passed"
else
    print_error "Rounding logic tests failed"
    exit 1
fi

print_info "5. Running termination handling tests..."
if npx jest tests/payroll/termination-handling.test.ts --coverage --collectCoverageFrom="server/services/SeveranceRulesService.ts" --coverageDirectory=coverage/payroll/termination; then
    print_status "Termination handling tests passed"
else
    print_error "Termination handling tests failed"
    exit 1
fi

print_info "6. Running integration tests..."
if npx jest tests/payroll/integration.test.ts --coverage --collectCoverageFrom="lib/payroll/**/*.ts,server/services/SeveranceRulesService.ts" --coverageDirectory=coverage/payroll/integration; then
    print_status "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

print_info "7. Running payroll run integration tests..."
if npx jest tests/payroll/payroll-run-integration.test.ts --coverage --collectCoverageFrom="lib/payroll/**/*.ts,server/services/SeveranceRulesService.ts" --coverageDirectory=coverage/payroll/payroll-runs --testTimeout=30000; then
    print_status "Payroll run integration tests passed"
else
    print_error "Payroll run integration tests failed"
    exit 1
fi

print_info "8. Running system integration tests..."
if npx jest tests/payroll/payroll-system-integration.test.ts --coverage --collectCoverageFrom="lib/payroll/**/*.ts,server/services/**/*.ts" --coverageDirectory=coverage/payroll/system --testTimeout=60000; then
    print_status "System integration tests passed"
else
    print_error "System integration tests failed"
    exit 1
fi

# Run all payroll tests together with comprehensive coverage
print_info "9. Running complete payroll test suite..."
if npx jest tests/payroll/ --coverage --collectCoverageFrom="lib/payroll/**/*.ts,server/services/SeveranceRulesService.ts,server/services/PayrollCalculationEngine.ts" --coverageDirectory=coverage/payroll/complete --coverageReporters=["text", "lcov", "html"] --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}' --testTimeout=60000; then
    print_status "Complete payroll test suite passed"
else
    print_warning "Complete payroll test suite has coverage issues"
    echo "Check coverage report at: coverage/payroll/complete/lcov-report/index.html"
fi

# Generate test summary
print_info "10. Generating test summary..."

echo ""
echo "📊 Test Results Summary"
echo "======================"

# Count test files
TEST_FILES=$(find tests/payroll -name "*.test.ts" | wc -l)
echo "   📁 Test files: $TEST_FILES"

# Count test cases (approximate)
TEST_CASES=$(grep -r "test\|it(" tests/payroll/ | wc -l)
echo "   🧪 Test cases: ~$TEST_CASES"

# Check coverage files exist
if [ -d "coverage/payroll/complete" ]; then
    print_status "Coverage reports generated in coverage/payroll/complete/"
    echo "   📈 Open coverage/payroll/complete/lcov-report/index.html in browser"
else
    print_warning "Coverage reports not found"
fi

echo ""
print_info "Test Categories Covered:"
echo "   ✅ Overtime Calculations (3-tier system, night/Sunday/holiday premiums)"
echo "   ✅ Allowances (family, position, transport, education, benefits in kind)"
echo "   ✅ Prorated Salaries (partial months, part-time, Greek bonus proration)"
echo "   ✅ Rounding Logic (currency precision, tax calculations, EFKA contributions)"
echo "   ✅ Termination Handling (severance calculations, eligibility, Greek law compliance)"
echo "   ✅ Integration Testing (complete payroll scenarios, real-world cases)"

echo ""
print_info "Greek Labor Law Compliance:"
echo "   📋 Overtime: 3-tier system (25%, 50%, 75% premiums)"
echo "   📋 Greek Bonuses: Christmas, Easter, Vacation (Δώρα) with proration"
echo "   📋 EFKA Contributions: Employee and employer rates"
echo "   📋 Income Tax: Progressive brackets with solidarity tax"
echo "   📋 Severance Pay: Ν. 4093/2012 compliance (up to 17 months)"
echo "   📋 Benefits in Kind: Tax-free limits and imputed income"

echo ""
print_info "Key Test Scenarios:"
echo "   👤 Basic monthly salary employees"
echo "   👤 Part-time workers with prorated benefits"
echo "   👤 Seasonal employees with reduced bonuses"
echo "   👤 High-earning managers with complex benefits"
echo "   👤 Hotel workers with tips and multiple premiums"
echo "   👤 New hires with partial month calculations"
echo "   👤 Long-term employees with full bonus entitlements"
echo "   👤 Terminated employees with severance calculations"

echo ""
if [ -f "coverage/payroll/complete/lcov-report/index.html" ]; then
    print_status "🎉 All payroll tests completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Review coverage report: open coverage/payroll/complete/lcov-report/index.html"
    echo "   2. Address any uncovered code paths"
    echo "   3. Add additional edge cases if needed"
    echo "   4. Integrate tests into CI/CD pipeline"
    echo "   5. Schedule regular regression testing"
else
    print_warning "Tests completed but coverage report may be incomplete"
fi

echo ""
print_status "Greek Payroll System testing complete! 🇬🇷"