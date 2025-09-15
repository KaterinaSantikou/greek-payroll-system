#!/bin/bash

# Pre-commit hook for Greek Payroll System
# Ensures code quality before commits

set -e

echo "🔍 Running pre-commit checks..."

# Format and lint only staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx)$' | tr '\n' ' ')

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No JavaScript/TypeScript files to check"
    exit 0
fi

echo "📁 Checking staged files: $STAGED_FILES"

# Format staged files
echo "🎨 Formatting staged files with Prettier..."
npx prettier --write $STAGED_FILES

# Lint staged files
echo "🔍 Linting staged files with ESLint..."
npx eslint $STAGED_FILES --max-warnings 0

# Add formatted files back to staging area
git add $STAGED_FILES

echo "✅ Pre-commit checks passed!"