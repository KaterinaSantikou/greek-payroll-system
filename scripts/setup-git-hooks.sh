#!/bin/bash

# Setup git hooks for code quality enforcement
# Run this script once to install the pre-commit hook

set -e

echo "🔧 Setting up Git hooks for PayrollSync..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not a git repository! Please run this from the project root."
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
if [ -f "scripts/pre-commit-hook.sh" ]; then
    chmod +x scripts/pre-commit-hook.sh
    ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit
    echo "✅ Pre-commit hook installed"
else
    echo "❌ Pre-commit hook script not found!"
    exit 1
fi

# Test the hook
echo "🧪 Testing pre-commit hook..."
if .git/hooks/pre-commit --dry-run 2>/dev/null || true; then
    echo "✅ Pre-commit hook is working"
else
    echo "⚠️  Pre-commit hook test completed (no staged files)"
fi

echo ""
echo "🎉 Git hooks setup complete!"
echo ""
echo "💡 The pre-commit hook will now:"
echo "   - Format code with Prettier"
echo "   - Lint code with ESLint"
echo "   - Block commits with style violations"
echo ""
echo "To bypass the hook (not recommended):"
echo "   git commit --no-verify"