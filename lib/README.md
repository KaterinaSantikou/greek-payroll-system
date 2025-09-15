# PayrollSync Core Library

Centralized library for Greek payroll rules, calculations, and compliance.

## Structure

```
lib/payroll/
├── rules/               # Pure Greek labor law domain rules
│   ├── greek-labor-law.ts    # Tax brackets, EFKA rates, solidarity tax
│   ├── payroll-rules.ts      # Bonuses, premiums, overtime rules
│   └── compliance-rules.ts   # Legal validation rules
├── calculators/         # Calculation and validation logic
│   ├── payroll-calculator.ts # Core payroll calculations
│   └── payroll-validator.ts  # Business validation
└── services/           # High-level business services
    └── payroll-service.ts     # Orchestrated payroll operations
```

## Usage

### Import everything:
```typescript
import { 
  GREEK_TAX_BRACKETS, 
  EFKA_RATES, 
  payrollCalculator, 
  payrollService 
} from '@lib/payroll';
```

### Import specific modules:
```typescript
import { EFKA_RATES } from '@lib/payroll/rules/greek-labor-law';
import { payrollCalculator } from '@lib/payroll/calculators/payroll-calculator';
import { payrollService } from '@lib/payroll/services/payroll-service';
```

### Quick access:
```typescript
import { payrollCalculator, EFKA_RATES } from '@lib';
```

## Benefits

- **Centralized**: All payroll logic in one location
- **Modular**: Clear separation between rules, calculations, and services
- **Reusable**: Easy to import across the entire application
- **Maintainable**: Domain rules separated from infrastructure
- **Testable**: Each module can be tested independently