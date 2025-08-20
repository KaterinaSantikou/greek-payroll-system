/**
 * Garnishment Calculation Engine Demo
 * 
 * This demonstrates the calc hook implementation based on the specification:
 * - Input: employee_id, run_context, pre_tax, taxes, contribs, net_before_garnishments
 * - Output: garnishment_lines[], net_after_garnishments
 * - Logic: DisposableNet calculation, priority ordering, protected net floor, GL posting
 */

import { GarnishmentService } from '../services/GarnishmentService';

// Mock active garnishments for employee EMP-001
const mockActiveGarnishments = [
  {
    id: 'garn-001',
    type: 'wage_garnishment',
    creditorName: 'ABC Collections',
    creditorIban: '2200-GARN-WAGE',
    orderRef: 'WG-2025-001',
    priority: 1,
    method: 'percent_of_disposable_net',
    percent: '25',
    maxPercentCap: '50',
    perRunCap: null,
    protectedNetFloor: 600,
    totalBalance: 5000,
    startDate: '2025-01-01',
    endDate: null,
    createdAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'garn-002', 
    type: 'child_support',
    creditorName: 'Family Support Division',
    creditorIban: '2200-GARN-CHILD',
    orderRef: 'CS-2025-002',
    priority: 2,
    method: 'fixed_amount',
    amount: '400',
    protectedNetFloor: 600,
    totalBalance: 8000,
    startDate: '2025-01-01',
    endDate: null,
    createdAt: '2025-01-16T14:30:00Z'
  }
];

/**
 * Demo calculation for a typical Greek payroll scenario
 */
export async function runGarnishmentCalcDemo() {
  console.log('='.repeat(80));
  console.log('GARNISHMENT CALCULATION ENGINE DEMO');
  console.log('='.repeat(80));
  
  // Example payroll inputs for employee EMP-001
  const calcInput = {
    employeeId: 'EMP-001',
    runContext: {
      period: '2025-01-15 to 2025-01-31',
      runType: 'regular'
    },
    preTax: 3500.00,      // Gross salary
    taxes: 650.00,        // Income tax + solidarity tax
    contribs: 525.00,     // EFKA contributions (employee portion)
    netBeforeGarnishments: 2325.00,  // Net after taxes/contribs, before garnishments
    activeGarnishments: mockActiveGarnishments
  };
  
  console.log('\n📊 PAYROLL INPUT:');
  console.log(`Employee: ${calcInput.employeeId}`);
  console.log(`Period: ${calcInput.runContext.period}`);
  console.log(`Pre-tax: €${calcInput.preTax.toFixed(2)}`);
  console.log(`Taxes: €${calcInput.taxes.toFixed(2)}`);
  console.log(`Contributions: €${calcInput.contribs.toFixed(2)}`);
  console.log(`Net Before Garnishments (DisposableNet): €${calcInput.netBeforeGarnishments.toFixed(2)}`);
  console.log(`Active Orders: ${calcInput.activeGarnishments?.length || 0}`);
  
  try {
    // Call the calc hook
    const result = await GarnishmentService.calculateGarnishments(calcInput);
    
    console.log('\n💰 CALCULATION RESULT:');
    console.log(`Net After Garnishments: €${result.netAfterGarnishments.toFixed(2)}`);
    console.log(`Total Deducted: €${result.garnishmentLines.reduce((sum, line) => sum + line.amount, 0).toFixed(2)}`);
    console.log(`Payslip Lines Generated: ${result.garnishmentLines.length}`);
    
    if (result.garnishmentLines.length > 0) {
      console.log('\n📄 PAYSLIP LINES:');
      result.garnishmentLines.forEach((line, index) => {
        console.log(`${index + 1}. ${line.type} - ${line.creditor}`);
        console.log(`   Order Ref: ${line.orderRef}`);
        console.log(`   Amount: €${line.amount.toFixed(2)}`);
        console.log(`   Remaining Balance: €${line.remainingBalance.toFixed(2)}`);
        console.log(`   GL Account: ${line.glAccount}`);
      });
      
      // Generate GL entries
      console.log('\n📚 GL JOURNAL ENTRIES:');
      const glEntries = GarnishmentService.generateGLEntries(
        result.garnishmentLines,
        calcInput.employeeId,
        'HOTEL-PRINCESS', // property
        'FRONT-DESK'      // department
      );
      
      glEntries.forEach((entry, index) => {
        console.log(`${index + 1}. Account: ${entry.account}`);
        if (entry.debit) console.log(`   Debit: €${entry.debit.toFixed(2)}`);
        if (entry.credit) console.log(`   Credit: €${entry.credit.toFixed(2)}`);
        console.log(`   Description: ${entry.description}`);
        console.log(`   Reference: ${entry.reference}`);
      });
    }
    
    console.log('\n📋 CALCULATION LOG:');
    result.calculationLog.forEach((logEntry, index) => {
      console.log(`${index + 1}. ${logEntry}`);
    });
    
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  }
  
  console.log('='.repeat(80));
}

/**
 * Edge cases demo
 */
export async function runEdgeCasesDemo() {
  console.log('\n🔍 EDGE CASES DEMO:');
  
  // Case 1: DisposableNet <= protected floor
  const edgeCase1 = {
    employeeId: 'EMP-002',
    runContext: { period: '2025-01-15 to 2025-01-31', runType: 'regular' },
    preTax: 1200.00,
    taxes: 200.00,
    contribs: 180.00,
    netBeforeGarnishments: 820.00, // Very low net pay
    activeGarnishments: [{
      id: 'garn-003',
      type: 'tax_levy',
      creditorName: 'Tax Authority',
      orderRef: 'TAX-001',
      priority: 1,
      method: 'percent_of_disposable_net',
      percent: '25',
      protectedNetFloor: 900, // Higher than available net
    }]
  };
  
  console.log('\n📊 Edge Case 1 - Insufficient DisposableNet:');
  const result1 = await GarnishmentService.calculateGarnishments(edgeCase1);
  console.log(`Net Before: €${edgeCase1.netBeforeGarnishments}, Protected Floor: €900`);
  console.log(`Result: €${result1.netAfterGarnishments.toFixed(2)} (no deduction applied)`);
  
  // Case 2: Off-cycle run
  const edgeCase2 = {
    ...edgeCase1,
    runContext: { period: '2025-01-15', runType: 'bonus' }, // Bonus run
    netBeforeGarnishments: 1500.00
  };
  
  console.log('\n📊 Edge Case 2 - Off-cycle run:');
  const result2 = await GarnishmentService.calculateGarnishments(edgeCase2);
  console.log(`Run Type: ${edgeCase2.runContext.runType}`);
  console.log(`Deductions: ${result2.garnishmentLines.length} (depends on order scope settings)`);
}

// Auto-run demo if this file is executed directly
if (require.main === module) {
  runGarnishmentCalcDemo()
    .then(() => runEdgeCasesDemo())
    .catch(console.error);
}