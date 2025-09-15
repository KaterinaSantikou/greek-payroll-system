#!/bin/bash

# Script to run linting and formatting for the Greek Payroll System
# This ensures consistent code style across the entire project

set -e

echo "🔍 Running ESLint and Prettier for code quality and consistency..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

echo "📋 Linting and Formatting Greek Payroll System"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "eslint.config.js" ] || [ ! -f ".prettierrc" ]; then
    print_error "ESLint or Prettier configuration not found!"
    echo "Make sure you're in the project root directory."
    exit 1
fi

# Format code with Prettier first
echo "🎨 Formatting code with Prettier..."
if npx prettier --write "**/*.{js,jsx,ts,tsx,json}" --ignore-path .prettierignore; then
    print_status "Code formatting completed"
else
    print_error "Prettier formatting failed"
    exit 1
fi

# Run ESLint
echo "🔍 Linting code with ESLint..."
if npx eslint "**/*.{js,jsx,ts,tsx}" --max-warnings 10 --fix; then
    print_status "ESLint completed successfully"
else
    print_warning "ESLint found issues (see output above)"
    echo "Run 'npx eslint --fix' to auto-fix some issues"
fi

# Verify formatting is still good after ESLint fixes
echo "🔄 Verifying formatting after ESLint fixes..."
if npx prettier --check "**/*.{js,jsx,ts,tsx}" --ignore-path .prettierignore >/dev/null 2>&1; then
    print_status "All files are properly formatted"
else
    print_warning "Some files may need re-formatting after ESLint fixes"
    npx prettier --write "**/*.{js,jsx,ts,tsx}" --ignore-path .prettierignore
    print_status "Re-formatting completed"
fi

print_status "Linting and formatting completed!"
echo ""
echo "💡 To run individual tools:"
echo "   Format:  npx prettier --write ."
echo "   Lint:    npx eslint . --fix"
echo "   Check:   npx prettier --check ."
echo "   Lint check: npx eslint . --max-warnings 0"