# PayrollSync - Greek HR & Payroll Management System

A comprehensive Greek payroll processing system with EFKA compliance, Digital Work Card validation, and enterprise-grade security. Built for Greek businesses requiring accurate labor law calculations and government system integration.

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (Replit environment includes nodejs-20)
- **PostgreSQL Database** (automatically provided in Replit)
- **Git** for version control integration

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Database is automatically configured in Replit environment
   # Check DATABASE_URL environment variable is available
   npm run db:push
   ```

3. **Security Setup**
   ```bash
   ./scripts/setup-security-monitoring.sh
   ```

4. **Start Application**
   ```bash
   npm run dev
   ```

The application will be available at the Replit-provided URL.

## 💼 Running Payroll

### Basic Payroll Calculation

```typescript
import { PayrollCalculator } from './lib/payroll/calculators/payroll-calculator';

const calculator = new PayrollCalculator();

const payrollInput = {
  employeeId: 'EMP001',
  periodId: '2025-01',
  baseSalary: 1200,
  regularHours: 160,
  overtimeHours: 8,
  nightHours: 20,
  sundayHours: 8,
  holidayHours: 0,
  allowances: {
    transport: 75,
    food: 100,
    housing: 150
  },
  contractType: 'indefinite',
  isFullTime: true,
  employmentStartDate: new Date('2023-01-01'),
  periodStartDate: new Date('2025-01-01'),
  periodEndDate: new Date('2025-01-31')
};

const result = calculator.calculatePayroll(payrollInput);
```

### Advanced Payroll Processing

```typescript
import { PayrollCalculationEngine } from './server/services/PayrollCalculationEngine';

// For database-integrated calculations with CBA rules
const context = {
  employeeId: 'EMP001',
  contractId: 'CONTRACT001',
  periodId: '2025-01',
  propertyId: 'PROPERTY001',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  hoursWorked: [
    { date: new Date('2025-01-01'), startTime: '09:00', endTime: '17:00', hours: 8 },
    { date: new Date('2025-01-02'), startTime: '22:00', endTime: '06:00', hours: 8, shiftType: 'night' }
    // ... more work records
  ]
};

const result = await PayrollCalculationEngine.calculatePayroll(context);
```

### Payroll Components Calculated

**Base Calculations**:
- Base salary with FTE and proration
- Regular hours pay
- Greek bonuses (Δώρα): Christmas, Easter, Vacation

**Premium Calculations**:
- **Overtime**: 3-tier system (25%, 50%, 75%)
- **Night Shift**: 25% premium (22:00-06:00)
- **Sunday Work**: 75% premium
- **Holiday Work**: 100% premium

**Allowances**:
- Family allowances (marriage, children)
- Position allowances (management, dangerous work)
- Transport, meal, housing allowances
- Education and experience allowances

**Deductions**:
- **Income Tax**: Progressive brackets
- **Solidarity Tax**: For high earners
- **EFKA Contributions**: Employee and employer portions
- **Benefits in Kind**: Taxation above tax-free limits

**Greek Legal Compliance**:
- **Ν. 4093/2012** severance calculations
- **EFKA** social security compliance
- **ERGANI II** integration ready
- **Working Time Directive** compliance

## 🧪 Testing

### Run All Tests

```bash
# Complete test suite
./scripts/run-payroll-tests.sh

# Or individual test categories
npm test
```

### Payroll-Specific Testing

```bash
# Overtime calculations
npx jest tests/payroll/overtime-calculations.test.ts

# Allowances and benefits
npx jest tests/payroll/allowances.test.ts

# Prorated salaries and bonuses
npx jest tests/payroll/prorated-salaries.test.ts

# Currency rounding logic
npx jest tests/payroll/rounding-logic.test.ts

# Termination and severance
npx jest tests/payroll/termination-handling.test.ts

# Integration tests
npx jest tests/payroll/integration.test.ts

# System integration
npx jest tests/payroll/payroll-system-integration.test.ts
```

### Test Coverage

Tests cover **250+ scenarios** including:
- **85% code coverage** target
- **Greek labor law compliance** validation
- **Edge cases**: leap years, month boundaries, extreme overtime
- **Performance testing**: 500+ employee datasets
- **Integration testing**: Multi-company, concurrent processing

### Viewing Test Results

```bash
# Generate coverage report
npm run test:coverage

# Open coverage report
open coverage/payroll/complete/lcov-report/index.html
```

## 🔒 Security & Compliance

### Security Scanning

```bash
# Complete security analysis
npm run security:scan

# Dependency vulnerability audit
npm run security:audit

# CI-ready security checks
npm run security:ci
```

### Security Features

- **Static Analysis**: ESLint security plugin with 12+ rules
- **Vulnerability Scanning**: NPM audit integration
- **Secrets Detection**: Automated scanning for exposed credentials
- **Supply Chain Security**: Package integrity verification
- **Real-time Monitoring**: Daily automated security scans

### GDPR & Privacy Compliance

- **Data Encryption**: AES-256 for sensitive payroll data
- **Audit Logging**: Immutable hash-chained logs
- **Access Control**: Role-based permissions (RBAC)
- **Data Residency**: EU-compliant data storage
- **Right to be Forgotten**: Configurable data retention

## 🏗️ Architecture

### Core Components

```
lib/payroll/
├── calculators/           # Pure calculation logic
│   ├── payroll-calculator.ts
│   └── payroll-validator.ts
├── rules/                 # Greek labor law rules
│   ├── greek-labor-law.ts
│   └── payroll-rules.ts
└── services/             # Business logic services

server/services/
├── PayrollCalculationEngine.ts    # Database-integrated calculations
├── SeveranceRulesService.ts      # Greek severance law (Ν. 4093/2012)
└── CbaPackService.ts             # Collective agreement handling
```

### Key Features

- **Multi-layer Architecture**: Clean separation of calculation logic
- **Greek Law Compliance**: Built-in compliance with Greek labor regulations
- **Performance Optimized**: Handles 500+ employees efficiently
- **Enterprise Security**: Multi-layer security with vulnerability detection
- **Extensible Design**: Easy to add new rules and calculations

## 📋 Payroll Scenarios

### Supported Employee Types

- **Full-time Employees**: Standard monthly salary calculations
- **Part-time Workers**: Prorated benefits and bonuses
- **Seasonal Workers**: Reduced bonus calculations
- **Hotel Workers**: Tips, multiple premiums, split shifts
- **High Earners**: Progressive taxation, solidarity tax
- **New Hires**: Partial month proration
- **Terminated Employees**: Final pay with severance calculations

### Real-world Test Cases

The system includes validated calculations for:
- Basic monthly salary (€1,000 base)
- Overtime scenarios (5+ hours with tier calculations)
- Christmas bonus distributions (25/24 monthly salary)
- Part-time employees (4-day work weeks)
- Minimum wage compliance (€650 base)
- Six-day work schedules with allowances
- New hire proration (mid-month starts)

## 🛠️ Development

### Code Quality

```bash
# Lint and format code
./scripts/lint-and-format.sh

# Security + formatting pipeline
npm run lint:security
```

### Database Operations

```bash
# Push schema changes
npm run db:push

# Force schema updates (data loss warning)
npm run db:push --force
```

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `GITHUB_TOKEN` - For repository integration (optional)

Greek law configuration (cached for 5 minutes):
- Premium rates, severance rules, tax brackets
- Externalized via environment variables
- Version tracking with legal references

## 📖 Legal Compliance

### Greek Labor Law Implementation

- **Ν. 4093/2012**: Severance pay calculations (0-17 months)
- **Working Time Directive**: 8-hour daily, 40-hour weekly limits
- **EFKA Rates**: Current social security contribution rates
- **Progressive Taxation**: Income tax brackets with solidarity tax
- **Collective Agreements**: CBA-compliant wage calculations
- **Greek Bonuses**: Christmas (25/24), Easter (0.5), Vacation (0.5)

### Government System Integration

- **ERGANI II**: Digital work card synchronization
- **e-EFKA/APD**: Social security reporting
- **AADE/ΦΜΥ**: Tax authority integration
- **SEPA Banking**: Payroll payment processing

## 🆘 Troubleshooting

### Common Issues

**Test Failures**:
```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npx jest --verbose tests/payroll/
```

**Database Issues**:
```bash
# Reset database schema
npm run db:push --force

# Check database connection
npm run db:status
```

**Security Scan Issues**:
```bash
# Update security rules
npm run security:update

# Fix known vulnerabilities
npm audit fix
```

### Performance Issues

For large employee datasets (500+):
- Use batch processing (50 employees per batch)
- Monitor memory usage during processing
- Consider database indexing for employee lookups

### Getting Help

1. **Check Logs**: Use the application logs for detailed error information
2. **Run Diagnostics**: Execute `./scripts/security-scan.sh` for system health
3. **Test Coverage**: Review coverage reports for any missed edge cases
4. **Documentation**: See `docs/` directory for detailed component documentation

## 📊 System Metrics

### Performance Benchmarks
- **Single Employee**: ~50ms calculation time
- **100 Employees**: <5 seconds batch processing
- **500 Employees**: <30 seconds with batching
- **Memory Usage**: <50MB growth for large datasets

### Test Coverage Stats
- **Unit Tests**: 250+ test cases
- **Integration Tests**: 50+ complex scenarios  
- **Code Coverage**: 85%+ target across all components
- **Greek Law Compliance**: 100% coverage of major regulations

---

**PayrollSync** - Enterprise Greek Payroll Processing with Legal Compliance 🇬🇷