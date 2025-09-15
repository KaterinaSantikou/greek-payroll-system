/**
 * Safe Math Utilities
 * 
 * Runtime-validated mathematical operations for payroll calculations.
 * Prevents silent failures, NaN propagation, and invalid financial calculations.
 */

export class PayrollMathError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly inputs: any[],
    public readonly context?: string
  ) {
    super(`PayrollMath Error in ${operation}: ${message}`);
    this.name = 'PayrollMathError';
  }
}

// =============================================================================
// INPUT VALIDATION HELPERS
// =============================================================================

/**
 * Validate that a value is a safe number for financial calculations
 */
function validateFinancialNumber(value: any, fieldName: string, operation: string): number {
  // Check for null/undefined
  if (value === null || value === undefined) {
    throw new PayrollMathError(
      `${fieldName} cannot be null or undefined`,
      operation,
      [value]
    );
  }
  
  // Convert to number if it's a string
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  // Check for NaN
  if (isNaN(num)) {
    throw new PayrollMathError(
      `${fieldName} is not a valid number: ${value}`,
      operation,
      [value]
    );
  }
  
  // Check for infinity
  if (!isFinite(num)) {
    throw new PayrollMathError(
      `${fieldName} cannot be infinite: ${value}`,
      operation,
      [value]
    );
  }
  
  return num;
}

/**
 * Validate that a value is non-negative (for amounts, hours, rates)
 */
function validateNonNegative(value: number, fieldName: string, operation: string): number {
  if (value < 0) {
    throw new PayrollMathError(
      `${fieldName} cannot be negative: ${value}`,
      operation,
      [value]
    );
  }
  return value;
}

/**
 * Validate that a value is positive (for rates, multipliers)
 */
function validatePositive(value: number, fieldName: string, operation: string): number {
  if (value <= 0) {
    throw new PayrollMathError(
      `${fieldName} must be positive: ${value}`,
      operation,
      [value]
    );
  }
  return value;
}

/**
 * Validate decimal precision for currency amounts (max 2 decimal places)
 */
function validateCurrencyPrecision(value: number, fieldName: string, operation: string): number {
  const decimalPlaces = (value.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    throw new PayrollMathError(
      `${fieldName} has too many decimal places (${decimalPlaces}): ${value}. Currency amounts must have max 2 decimal places.`,
      operation,
      [value]
    );
  }
  return value;
}

/**
 * Validate reasonable range for financial amounts (prevent absurd values)
 */
function validateReasonableRange(value: number, fieldName: string, operation: string, max: number = 1000000): number {
  if (value > max) {
    throw new PayrollMathError(
      `${fieldName} exceeds reasonable limit (€${max}): ${value}`,
      operation,
      [value]
    );
  }
  return value;
}

// =============================================================================
// SAFE ARITHMETIC OPERATIONS
// =============================================================================

/**
 * Safe addition with validation
 */
export function safeAdd(a: any, b: any, context?: string): number {
  const operation = 'safeAdd';
  const numA = validateFinancialNumber(a, 'operand A', operation);
  const numB = validateFinancialNumber(b, 'operand B', operation);
  
  const result = numA + numB;
  
  // Validate result
  validateFinancialNumber(result, 'result', operation);
  
  return Math.round(result * 100) / 100; // Round to 2 decimal places
}

/**
 * Safe subtraction with validation
 */
export function safeSubtract(a: any, b: any, context?: string): number {
  const operation = 'safeSubtract';
  const numA = validateFinancialNumber(a, 'operand A', operation);
  const numB = validateFinancialNumber(b, 'operand B', operation);
  
  const result = numA - numB;
  
  // Validate result
  validateFinancialNumber(result, 'result', operation);
  
  return Math.round(result * 100) / 100;
}

/**
 * Safe multiplication with validation
 */
export function safeMultiply(a: any, b: any, context?: string): number {
  const operation = 'safeMultiply';
  const numA = validateFinancialNumber(a, 'operand A', operation);
  const numB = validateFinancialNumber(b, 'operand B', operation);
  
  const result = numA * numB;
  
  // Validate result
  validateFinancialNumber(result, 'result', operation);
  
  return Math.round(result * 100) / 100;
}

/**
 * Safe division with validation (prevents division by zero)
 */
export function safeDivide(a: any, b: any, context?: string): number {
  const operation = 'safeDivide';
  const numA = validateFinancialNumber(a, 'dividend', operation);
  const numB = validateFinancialNumber(b, 'divisor', operation);
  
  if (numB === 0) {
    throw new PayrollMathError(
      'Division by zero is not allowed',
      operation,
      [numA, numB],
      context
    );
  }
  
  const result = numA / numB;
  
  // Validate result
  validateFinancialNumber(result, 'result', operation);
  
  return Math.round(result * 100) / 100;
}

// =============================================================================
// PAYROLL-SPECIFIC SAFE CALCULATIONS
// =============================================================================

/**
 * Safe salary calculation with validation
 */
export function safeSalaryCalculation(
  baseSalary: any,
  multiplier: any = 1,
  context?: string
): number {
  const operation = 'safeSalaryCalculation';
  
  const salary = validateFinancialNumber(baseSalary, 'baseSalary', operation);
  const mult = validateFinancialNumber(multiplier, 'multiplier', operation);
  
  // Validate inputs
  validateNonNegative(salary, 'baseSalary', operation);
  validateNonNegative(mult, 'multiplier', operation);
  validateCurrencyPrecision(salary, 'baseSalary', operation);
  validateReasonableRange(salary, 'baseSalary', operation, 50000); // Max €50k monthly
  
  const result = safeMultiply(salary, mult, context);
  
  return result;
}

/**
 * Safe hourly rate calculation with validation
 */
export function safeHourlyCalculation(
  hours: any,
  rate: any,
  context?: string
): number {
  const operation = 'safeHourlyCalculation';
  
  const numHours = validateFinancialNumber(hours, 'hours', operation);
  const numRate = validateFinancialNumber(rate, 'rate', operation);
  
  // Validate inputs
  validateNonNegative(numHours, 'hours', operation);
  validatePositive(numRate, 'rate', operation);
  
  // Validate reasonable ranges
  if (numHours > 744) { // Max hours in a month (31 * 24)
    throw new PayrollMathError(
      `Hours worked (${numHours}) exceeds maximum possible hours in a month (744)`,
      operation,
      [numHours, numRate],
      context
    );
  }
  
  if (numRate > 500) { // Max €500/hour
    throw new PayrollMathError(
      `Hourly rate (€${numRate}) exceeds reasonable limit (€500/hour)`,
      operation,
      [numHours, numRate],
      context
    );
  }
  
  const result = safeMultiply(numHours, numRate, context);
  
  return result;
}

/**
 * Safe percentage calculation with validation
 */
export function safePercentageCalculation(
  amount: any,
  percentage: any,
  context?: string
): number {
  const operation = 'safePercentageCalculation';
  
  const numAmount = validateFinancialNumber(amount, 'amount', operation);
  const numPercentage = validateFinancialNumber(percentage, 'percentage', operation);
  
  // Validate inputs
  validateNonNegative(numAmount, 'amount', operation);
  validateNonNegative(numPercentage, 'percentage', operation);
  
  // Validate percentage range (0-100%)
  if (numPercentage > 1) {
    throw new PayrollMathError(
      `Percentage (${numPercentage}) should be a decimal between 0 and 1`,
      operation,
      [numAmount, numPercentage],
      context
    );
  }
  
  const result = safeMultiply(numAmount, numPercentage, context);
  
  return result;
}

/**
 * Safe tax calculation with bracket validation
 */
export function safeTaxCalculation(
  taxableIncome: any,
  rate: any,
  bracket?: { min: number; max: number | null },
  context?: string
): number {
  const operation = 'safeTaxCalculation';
  
  const income = validateFinancialNumber(taxableIncome, 'taxableIncome', operation);
  const taxRate = validateFinancialNumber(rate, 'rate', operation);
  
  // Validate inputs
  validateNonNegative(income, 'taxableIncome', operation);
  validateNonNegative(taxRate, 'rate', operation);
  
  // Validate tax rate range
  if (taxRate > 1) {
    throw new PayrollMathError(
      `Tax rate (${taxRate}) should be a decimal between 0 and 1`,
      operation,
      [income, taxRate],
      context
    );
  }
  
  // Validate against bracket if provided
  if (bracket) {
    if (income < bracket.min) {
      throw new PayrollMathError(
        `Income (€${income}) is below bracket minimum (€${bracket.min})`,
        operation,
        [income, taxRate],
        context
      );
    }
    
    if (bracket.max !== null && income > bracket.max) {
      throw new PayrollMathError(
        `Income (€${income}) exceeds bracket maximum (€${bracket.max})`,
        operation,
        [income, taxRate],
        context
      );
    }
  }
  
  const result = safePercentageCalculation(income, taxRate, context);
  
  return result;
}

/**
 * Safe EFKA contribution calculation
 */
export function safeEfkaCalculation(
  grossIncome: any,
  rate: any,
  ceiling?: number,
  context?: string
): number {
  const operation = 'safeEfkaCalculation';
  
  const income = validateFinancialNumber(grossIncome, 'grossIncome', operation);
  const efkaRate = validateFinancialNumber(rate, 'rate', operation);
  
  // Validate inputs
  validateNonNegative(income, 'grossIncome', operation);
  validateNonNegative(efkaRate, 'rate', operation);
  
  // Validate EFKA rate range (typically 6-25%)
  if (efkaRate > 0.25) {
    throw new PayrollMathError(
      `EFKA rate (${(efkaRate * 100).toFixed(2)}%) exceeds maximum expected rate (25%)`,
      operation,
      [income, efkaRate],
      context
    );
  }
  
  // Apply ceiling if provided
  let contributionBase = income;
  if (ceiling && income > ceiling) {
    contributionBase = ceiling;
  }
  
  const result = safePercentageCalculation(contributionBase, efkaRate, context);
  
  return result;
}

// =============================================================================
// ARRAY AND AGGREGATION OPERATIONS
// =============================================================================

/**
 * Safe sum of array with validation
 */
export function safeSumArray(values: any[], context?: string): number {
  const operation = 'safeSumArray';
  
  if (!Array.isArray(values)) {
    throw new PayrollMathError(
      'Input must be an array',
      operation,
      [values],
      context
    );
  }
  
  if (values.length === 0) {
    return 0;
  }
  
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const value = validateFinancialNumber(values[i], `values[${i}]`, operation);
    validateNonNegative(value, `values[${i}]`, operation);
    sum = safeAdd(sum, value, context);
  }
  
  return sum;
}

/**
 * Safe average calculation with validation
 */
export function safeAverage(values: any[], context?: string): number {
  const operation = 'safeAverage';
  
  if (!Array.isArray(values) || values.length === 0) {
    throw new PayrollMathError(
      'Cannot calculate average of empty array',
      operation,
      [values],
      context
    );
  }
  
  const sum = safeSumArray(values, context);
  const result = safeDivide(sum, values.length, context);
  
  return result;
}

// =============================================================================
// BALANCE VALIDATION
// =============================================================================

/**
 * Prevent negative balance in payroll calculations
 */
export function preventNegativeBalance(
  balance: any,
  description: string,
  context?: string
): number {
  const operation = 'preventNegativeBalance';
  
  const amount = validateFinancialNumber(balance, 'balance', operation);
  
  if (amount < 0) {
    console.warn(`Warning: Negative balance prevented for ${description}: €${amount.toFixed(2)} (context: ${context})`);
    return 0;
  }
  
  return amount;
}

/**
 * Validate that deductions don't exceed gross pay
 */
export function validateDeductionLimits(
  grossPay: any,
  totalDeductions: any,
  context?: string
): { grossPay: number; totalDeductions: number; netPay: number } {
  const operation = 'validateDeductionLimits';
  
  const gross = validateFinancialNumber(grossPay, 'grossPay', operation);
  const deductions = validateFinancialNumber(totalDeductions, 'totalDeductions', operation);
  
  validateNonNegative(gross, 'grossPay', operation);
  validateNonNegative(deductions, 'totalDeductions', operation);
  
  // Greek labor law: deductions cannot exceed 1/5 of gross pay except for specific cases
  const maxAllowedDeductions = safeMultiply(gross, 0.8, context); // 80% of gross is minimum net
  
  let adjustedDeductions = deductions;
  if (deductions > maxAllowedDeductions) {
    console.warn(`Warning: Total deductions (€${deductions.toFixed(2)}) exceed 80% of gross pay (€${gross.toFixed(2)}). Adjusting to maximum allowed (context: ${context})`);
    adjustedDeductions = maxAllowedDeductions;
  }
  
  const netPay = safeSubtract(gross, adjustedDeductions, context);
  
  return {
    grossPay: gross,
    totalDeductions: adjustedDeductions,
    netPay: preventNegativeBalance(netPay, 'net pay', context)
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Round to specified decimal places safely
 */
export function safeRound(value: any, decimalPlaces: number = 2): number {
  const operation = 'safeRound';
  const num = validateFinancialNumber(value, 'value', operation);
  
  if (decimalPlaces < 0 || decimalPlaces > 4) {
    throw new PayrollMathError(
      `Decimal places must be between 0 and 4: ${decimalPlaces}`,
      operation,
      [value, decimalPlaces]
    );
  }
  
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(num * multiplier) / multiplier;
}

/**
 * Format currency amount safely
 */
export function safeFormatCurrency(value: any, currency: string = 'EUR'): string {
  const operation = 'safeFormatCurrency';
  const num = validateFinancialNumber(value, 'value', operation);
  
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Convert hours to decimal with validation
 */
export function safeHoursToDecimal(hours: any, minutes: any = 0): number {
  const operation = 'safeHoursToDecimal';
  
  const numHours = validateFinancialNumber(hours, 'hours', operation);
  const numMinutes = validateFinancialNumber(minutes, 'minutes', operation);
  
  validateNonNegative(numHours, 'hours', operation);
  validateNonNegative(numMinutes, 'minutes', operation);
  
  if (numMinutes >= 60) {
    throw new PayrollMathError(
      `Minutes must be less than 60: ${numMinutes}`,
      operation,
      [numHours, numMinutes]
    );
  }
  
  const decimalHours = safeAdd(numHours, safeDivide(numMinutes, 60));
  
  return decimalHours;
}