# Code Style Guide for Greek Payroll System

This document outlines the coding standards and style guidelines for the PayrollSync project.

## Overview

Our code style is enforced by:
- **ESLint**: For code quality and consistency
- **Prettier**: For code formatting
- **TypeScript**: For type safety

## Code Quality Standards

### TypeScript Rules
- **No `any` types**: Use proper TypeScript types (enforced as error)
- **Prefer optional chaining**: Use `?.` where appropriate
- **Avoid non-null assertions**: Use `!` sparingly and with caution
- **Unused variables**: Remove or prefix with `_` if intentionally unused

### Code Complexity
- **Maximum function length**: 50 lines
- **Maximum complexity**: 10 cyclomatic complexity
- **Maximum nesting depth**: 4 levels

### Security & Quality
- **No eval**: Never use `eval()` or similar functions
- **No console.log**: Use `console.warn`, `console.error`, or `console.info`
- **Strict equality**: Always use `===` instead of `==`
- **Prefer const**: Use `const` over `let` when possible

## Formatting Standards

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### File Naming
- **Components**: PascalCase (e.g., `PayrollCalculator.tsx`)
- **Utilities**: camelCase (e.g., `calculateEfka.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `GREEK_TAX_RATES.ts`)
- **Types**: PascalCase with `.types.ts` suffix

## Running Tools

### Manual Commands
```bash
# Format all files
npx prettier --write .

# Lint all files
npx eslint . --fix

# Check formatting
npx prettier --check .

# Lint without fixing
npx eslint . --max-warnings 0
```

### Automated Scripts
```bash
# Run complete linting and formatting
./scripts/lint-and-format.sh

# Set up pre-commit hook
chmod +x scripts/pre-commit-hook.sh
ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit
```

## IDE Integration

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": ["."],
  "prettier.configPath": ".prettierrc"
}
```

## Special Considerations for Payroll System

### Financial Calculations
- Always use precise decimal arithmetic
- Include clear comments for complex calculations
- Validate inputs thoroughly
- Use proper error handling

### Greek Labor Law Compliance
- Document legal references in comments
- Use descriptive variable names for rates and rules
- Include validation for Greek-specific formats (AFM, AMKA)

### Security
- Never log sensitive payroll data
- Validate all user inputs
- Use proper error messages without exposing internals

## Error Handling Patterns

```typescript
// Good: Proper error handling with specific types
try {
  const result = calculatePayroll(employee);
  return result;
} catch (error) {
  console.error('Payroll calculation failed:', error.message);
  throw new PayrollCalculationError('Unable to process payroll');
}

// Bad: Generic error handling
try {
  // some code
} catch (e) {
  console.log(e);
}
```

## Contributing

Before submitting code:
1. Run `./scripts/lint-and-format.sh`
2. Fix any linting errors
3. Ensure all tests pass
4. Document any new functions or complex logic

## Automated Enforcement

The linting rules are automatically enforced:
- **Pre-commit hooks**: Prevent commits with style violations
- **CI/CD pipeline**: Blocks deployments with linting errors
- **IDE integration**: Real-time feedback while coding