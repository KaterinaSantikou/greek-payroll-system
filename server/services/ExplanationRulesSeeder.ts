import { db } from '../db';
import { explanationRules, type InsertExplanationRule } from '../../shared/schema';

/**
 * Seed explanation rules matching the specification examples
 */
export class ExplanationRulesSeeder {
  
  async seedSampleRules(): Promise<void> {
    const sampleRules: InsertExplanationRule[] = [
      // Regular Hours
      {
        earningsCode: 'REG',
        ruleVersion: 'v2025.08',
        labelEn: 'Regular pay',
        labelEl: 'Τακτικές ώρες',
        formulaTemplateEn: '{hours}h × €{hourly_rate} = €{amount}',
        formulaTemplateEl: '{hours} ώρες × €{hourly_rate} = €{amount}',
        explanationTemplateEn: 'Your regular working hours at the standard hourly rate.',
        explanationTemplateEl: 'Οι τακτικές ώρες εργασίας σας με το κανονικό ωρομίσθιο.',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.regular', rate: 'contract.hourly_rate' },
        regulationRef: 'Ν. 4808/2021',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // Overtime Tier 1 (40% premium)
      {
        earningsCode: 'OT_TIER1_40',
        ruleVersion: 'v2025.08',
        labelEn: 'Overtime',
        labelEl: 'Νόμιμη υπερωρία',
        formulaTemplateEn: '{hours}h × €{hourly_rate} × 40% = €{amount}',
        formulaTemplateEl: '{hours} ώρες × €{hourly_rate} × 40% = €{amount}',
        explanationTemplateEn: 'Overtime hours with 40% premium as per Greek labor law.',
        explanationTemplateEl: 'Υπερωριακές ώρες με προσαύξηση 40% σύμφωνα με την ελληνική εργατική νομοθεσία.',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.overtime', rate: 'contract.hourly_rate', premium: '40' },
        regulationRef: 'Ν. 4808/2021 άρθρο 5',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // Night Premium (25%)
      {
        earningsCode: 'NIGHT_25',
        ruleVersion: 'v2025.08',
        labelEn: 'Night premium',
        labelEl: 'Νυχτερινή',
        formulaTemplateEn: '{hours}h × €{hourly_rate} × 25% = €{amount}',
        formulaTemplateEl: '{hours} ώρες × €{hourly_rate} × 25% = €{amount}',
        explanationTemplateEn: 'Night shift premium for hours worked between 22:00-06:00.',
        explanationTemplateEl: 'Προσαύξηση νυχτερινής βάρδιας για ώρες εργασίας 22:00-06:00.',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.night', rate: 'contract.hourly_rate', premium: '25' },
        regulationRef: 'Ν. 4808/2021 άρθρο 6',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // Sunday Premium (75%)
      {
        earningsCode: 'SUNDAY_75',
        ruleVersion: 'v2025.08',
        labelEn: 'Sunday premium',
        labelEl: 'Κυριακή',
        formulaTemplateEn: '{hours}h × €{hourly_rate} × 75% = €{amount}',
        formulaTemplateEl: '{hours} ώρες × €{hourly_rate} × 75% = €{amount}',
        explanationTemplateEn: 'Sunday work premium as required by collective agreement.',
        explanationTemplateEl: 'Προσαύξηση εργασίας Κυριακής σύμφωνα με τη συλλογική σύμβαση.',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.sunday', rate: 'contract.hourly_rate', premium: '75' },
        regulationRef: 'ΣΣΕ Τουρισμού 2024',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // Income Tax Withholding
      {
        earningsCode: 'TAX_WHT',
        ruleVersion: 'v2025.08',
        labelEn: 'Income tax',
        labelEl: 'Φόρος εισοδήματος',
        formulaTemplateEn: 'Taxable income × {tax_rate}% = €{amount}',
        formulaTemplateEl: 'Φορολογητέο εισόδημα × {tax_rate}% = €{amount}',
        explanationTemplateEn: 'Income tax withheld according to current tax tables.',
        explanationTemplateEl: 'Φόρος εισοδήματος που παρακρατείται σύμφωνα με τους ισχύοντες φορολογικούς πίνακες.',
        calculationType: 'percentage',
        variables: { taxable_income: 'gross_pay', tax_rate: 'tax_table.rate' },
        regulationRef: 'Ν. 4172/2013',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // EFKA Employee Contribution
      {
        earningsCode: 'EFKA_EE',
        ruleVersion: 'v2025.08',
        labelEn: 'EFKA employee',
        labelEl: 'ΕΦΚΑ εργαζομένου',
        formulaTemplateEn: 'Insurable earnings × 6.67% = €{amount}',
        formulaTemplateEl: 'Ασφαλιστέες αποδοχές × 6,67% = €{amount}',
        explanationTemplateEn: 'Social security contribution paid by employee.',
        explanationTemplateEl: 'Ασφαλιστική εισφορά που καταβάλλεται από τον εργαζόμενο.',
        calculationType: 'percentage',
        variables: { insurable_earnings: 'gross_pay', rate: '6.67' },
        regulationRef: 'Ν. 4387/2016',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // Split Stacking Example: Sunday OT
      {
        earningsCode: 'SUNDAY_75_OT1',
        ruleVersion: 'v2025.08',
        labelEn: 'Sunday overtime',
        labelEl: 'Υπερωρία Κυριακής',
        formulaTemplateEn: '{hours}h × €{hourly_rate} × (140% + 75%) = €{amount}',
        formulaTemplateEl: '{hours} ώρες × €{hourly_rate} × (140% + 75%) = €{amount}',
        explanationTemplateEn: 'Overtime worked on Sunday with stacked premiums: OT (40%) + Sunday (75%).',
        explanationTemplateEl: 'Υπερωρία που εργάστηκε την Κυριακή με συνδυασμένες προσαυξήσεις: Υπερωρία (40%) + Κυριακή (75%).',
        calculationType: 'hourly',
        variables: { hours: 'timesheet.sunday_overtime', rate: 'contract.hourly_rate', ot_premium: '40', sunday_premium: '75' },
        regulationRef: 'Ν. 4808/2021 + ΣΣΕ',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // Recovery/Adjustment Example
      {
        earningsCode: 'ADJ_PREV_MONTH',
        ruleVersion: 'v2025.08',
        labelEn: 'Prior period adjustment',
        labelEl: 'Διόρθωση προηγούμενης περιόδου',
        formulaTemplateEn: 'Adjustment amount = €{amount}',
        formulaTemplateEl: 'Ποσό διόρθωσης = €{amount}',
        explanationTemplateEn: 'Adjustment from prior period (−€{abs_amount})',
        explanationTemplateEl: 'Διόρθωση από προηγούμενη περίοδο (−€{abs_amount})',
        calculationType: 'fixed',
        variables: { amount: 'adjustment.amount', abs_amount: 'adjustment.abs_amount' },
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // Meal Voucher Split
      {
        earningsCode: 'MEAL_VOUCHER',
        ruleVersion: 'v2025.08',
        labelEn: 'Meal vouchers',
        labelEl: 'Επιδόματα γεύματος',
        formulaTemplateEn: '{days} days × €{daily_amount} = €{amount} (€{exempt_amount} exempt)',
        formulaTemplateEl: '{days} ημέρες × €{daily_amount} = €{amount} (€{exempt_amount} αφορολόγητο)',
        explanationTemplateEn: 'Meal vouchers: exempt portion €{exempt_amount}, taxable portion €{taxable_amount}',
        explanationTemplateEl: 'Επιδόματα γεύματος: αφορολόγητο μέρος €{exempt_amount}, φορολογητέο μέρος €{taxable_amount}',
        calculationType: 'fixed',
        variables: { days: 'working_days', daily_amount: 'policy.meal_allowance', exempt_amount: 'policy.meal_exempt' },
        regulationRef: 'Ν. 4172/2013 άρθρο 9',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // Tips (Contributory)
      {
        earningsCode: 'TIPS_CONTRIB',
        ruleVersion: 'v2025.08',
        labelEn: 'Tips (contributory)',
        labelEl: 'Φιλοδωρήματα (ασφαλιστέα)',
        formulaTemplateEn: 'Tips amount = €{amount} (subject to tax & insurance)',
        formulaTemplateEl: 'Φιλοδωρήματα = €{amount} (υπόκεινται σε φόρο & ασφάλιση)',
        explanationTemplateEn: 'Tips received, subject to taxation and social security contributions per hotel policy.',
        explanationTemplateEl: 'Φιλοδωρήματα που ελήφθησαν, υπόκεινται σε φορολογία και ασφαλιστικές εισφορές σύμφωνα με την πολιτική του ξενοδοχείου.',
        calculationType: 'fixed',
        variables: { amount: 'tips.total_amount' },
        policyRef: 'Hotel Tips Policy v2.1',
        isActive: true,
        effectiveFrom: '2025-01-01',
      },
      
      // SICK_EFKA (Informational)
      {
        earningsCode: 'SICK_EFKA',
        ruleVersion: 'v2025.08',
        labelEn: 'Sick leave EFKA',
        labelEl: 'Ασθένεια ΕΦΚΑ',
        formulaTemplateEn: 'EFKA payment = €{amount} (informational)',
        formulaTemplateEl: 'Πληρωμή ΕΦΚΑ = €{amount} (ενημερωτικό)',
        explanationTemplateEn: 'EFKA sick leave payment - informational only, not included in wages.',
        explanationTemplateEl: 'Πληρωμή ασθένειας ΕΦΚΑ - μόνο ενημερωτικό, δεν περιλαμβάνεται στις αποδοχές.',
        calculationType: 'fixed',
        variables: { amount: 'efka.sick_payment' },
        regulationRef: 'Ν. 4387/2016',
        isActive: true,
        effectiveFrom: '2025-01-01',
      }
    ];

    try {
      console.log('Seeding explanation rules...');
      
      // Insert all rules
      await db.insert(explanationRules).values(sampleRules);
      
      console.log(`Successfully seeded ${sampleRules.length} explanation rules`);
    } catch (error) {
      console.error('Error seeding explanation rules:', error);
      throw error;
    }
  }
  
  async clearRules(): Promise<void> {
    try {
      await db.delete(explanationRules);
      console.log('Cleared all explanation rules');
    } catch (error) {
      console.error('Error clearing explanation rules:', error);
      throw error;
    }
  }
}

export const explanationRulesSeeder = new ExplanationRulesSeeder();