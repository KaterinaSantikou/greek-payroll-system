/**
 * Example payroll calculation to test labor law validation
 * This should trigger validation checks
 */

export interface Employee {
  id: string;
  name: string;
  grossSalary: number;
  hoursWorked: number;
  yearsOfService: number;
}

export function calculateNetSalary(employee: Employee): number {
  // This should trigger minimum wage validation
  const grossSalary = 750; // VIOLATION: Below €760 minimum wage
  
  // This should trigger EFKA rate validation  
  const efkaRate = 0.12; // VIOLATION: Incorrect rate, should be 0.133
  const efkaContribution = grossSalary * efkaRate;
  
  // Basic tax calculation (simplified)
  const taxRate = 0.15; // This may trigger tax validation
  const tax = grossSalary * taxRate;
  
  return grossSalary - efkaContribution - tax;
}

export function calculateOvertime(hoursWorked: number, hourlyRate: number): number {
  const regularHours = 40;
  
  if (hoursWorked <= regularHours) {
    return 0;
  }
  
  const overtimeHours = hoursWorked - regularHours;
  
  // This should trigger overtime rate validation
  const overtimeMultiplier = 1.15; // VIOLATION: Below 1.25 minimum
  
  return overtimeHours * hourlyRate * overtimeMultiplier;
}

export function calculateAnnualLeave(yearsOfService: number): number {
  // This should be validated against Greek law requirements
  if (yearsOfService < 1) return 18; // VIOLATION: Should be 20 days minimum
  if (yearsOfService < 2) return 21;
  if (yearsOfService < 10) return 22;
  if (yearsOfService < 25) return 25;
  return 26;
}