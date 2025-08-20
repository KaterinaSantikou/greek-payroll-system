/**
 * ExplanationTemplateService
 * 
 * Manages bilingual explanation note templates for severance calculations
 * with variable substitution and formatting.
 */
export class ExplanationTemplateService {
  
  /**
   * Generate Greek explanation note
   */
  static generateGreekExplanation(variables: {
    termination_date: string;
    severance: number;
    service_years: number;
    ref_monthly: number;
    ruleset_id: string;
    unpaid_regular: number;
    unpaid_regular_days: number;
    daily_wage: number;
    leave_pay: number;
    unused_leave_days: number;
    allowance_leave: number;
    allow_fraction: number;
    xmas_award: number;
    easter_award?: number;
    tax_total: number;
    severance_tax_label: string;
    net_total: number;
  }): string {
    
    const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
    const formatPercent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
    
    let template = `Τελικός υπολογισμός μισθοδοσίας (${variables.termination_date})

• Αποζημίωση απόλυσης: ${formatCurrency(variables.severance)}
  - Έτη υπηρεσίας: ${variables.service_years}, μηνιαίος αναφοράς: ${formatCurrency(variables.ref_monthly)}, πίνακας: ${variables.ruleset_id}
• Μη καταβληθέντες μισθοί: ${formatCurrency(variables.unpaid_regular)} (${variables.unpaid_regular_days} ημέρες × ${formatCurrency(variables.daily_wage)})
• Αποδοχές μη ληφθείσας άδειας: ${formatCurrency(variables.leave_pay)} (${variables.unused_leave_days} ημέρες × ${formatCurrency(variables.daily_wage)})
• Επίδομα άδειας: ${formatCurrency(variables.allowance_leave)} (αναλογία ${formatPercent(variables.allow_fraction)})`;

    // Add Christmas bonus if applicable
    if (variables.xmas_award > 0) {
      template += `\n• Δώρο Χριστουγέννων (αναλογία): ${formatCurrency(variables.xmas_award)}`;
    }

    // Add Easter bonus if applicable  
    if (variables.easter_award && variables.easter_award > 0) {
      template += `\n• Δώρο Πάσχα (αναλογία): ${formatCurrency(variables.easter_award)}`;
    }

    template += `\n• Κρατήσεις/φόροι: ${formatCurrency(variables.tax_total)} (θεραπεία αποζημίωσης: ${variables.severance_tax_label})
Σύνολο καθαρών: ${formatCurrency(variables.net_total)}.

═══════════════════════════════════════════════════════════════

ΑΝΑΛΥΤΙΚΗ ΕΠΕΞΗΓΗΣΗ ΥΠΟΛΟΓΙΣΜΟΥ

Η αποζημίωση απόλυσης υπολογίστηκε σύμφωνα με τον Ν. 4093/2012, άρθρα 1-3, 
βάσει των ετών προϋπηρεσίας του εργαζομένου και της μηνιαίας αμοιβής αναφοράς.

Οι μη καταβληθέντες μισθοί περιλαμβάνουν τις εργάσιμες ημέρες που δεν έχουν 
αποζημιωθεί μέχρι την ημερομηνία λήξης της εργασιακής σχέσης.

Το επίδομα άδειας υπολογίζεται αναλογικά βάσει του χρόνου απασχόλησης κατά 
το τρέχον έτος, σύμφωνα με την εργατική νομοθεσία.

Τα δώρα Πάσχα και Χριστουγέννων υπολογίζονται αναλογικά εάν δεν έχουν ήδη 
καταβληθεί για την τρέχουσα περίοδο.

Οι φόροι και κρατήσεις εφαρμόζονται σύμφωνα με την ισχύουσα φορολογική 
νομοθεσία, με ειδική μεταχείριση για την αποζημίωση απόλυσης όπου εφαρμόζεται.`;

    return template;
  }

  /**
   * Generate English explanation note
   */
  static generateEnglishExplanation(variables: {
    termination_date: string;
    severance: number;
    service_years: number;
    ref_monthly: number;
    ruleset_id: string;
    unpaid_regular: number;
    unpaid_regular_days: number;
    daily_wage: number;
    leave_pay: number;
    unused_leave_days: number;
    allowance_leave: number;
    allow_fraction: number;
    xmas_award: number;
    easter_award?: number;
    tax_total: number;
    severance_tax_label: string;
    net_total: number;
  }): string {
    
    const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
    const formatPercent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
    
    let template = `Final pay calculation (${variables.termination_date})

• Severance: ${formatCurrency(variables.severance)}
  - Years of service: ${variables.service_years}, reference monthly: ${formatCurrency(variables.ref_monthly)}, table: ${variables.ruleset_id}
• Unpaid wages: ${formatCurrency(variables.unpaid_regular)} (${variables.unpaid_regular_days} days × ${formatCurrency(variables.daily_wage)})
• Unused leave pay: ${formatCurrency(variables.leave_pay)} (${variables.unused_leave_days} days × ${formatCurrency(variables.daily_wage)})
• Holiday allowance: ${formatCurrency(variables.allowance_leave)} (proration ${formatPercent(variables.allow_fraction)})`;

    // Add Christmas bonus if applicable
    if (variables.xmas_award > 0) {
      template += `\n• Christmas bonus (prorated): ${formatCurrency(variables.xmas_award)}`;
    }

    // Add Easter bonus if applicable
    if (variables.easter_award && variables.easter_award > 0) {
      template += `\n• Easter bonus (prorated): ${formatCurrency(variables.easter_award)}`;
    }

    template += `\n• Taxes/withholdings: ${formatCurrency(variables.tax_total)} (severance treatment: ${variables.severance_tax_label})
Net total: ${formatCurrency(variables.net_total)}.

═══════════════════════════════════════════════════════════════

DETAILED CALCULATION EXPLANATION

Severance compensation was calculated according to Greek Labor Law 4093/2012, 
articles 1-3, based on the employee's years of service and reference monthly wage.

Unpaid wages include working days that have not been compensated up to the 
employment termination date.

Holiday allowance is calculated proportionally based on the period of employment 
during the current year, in accordance with labor legislation.

Easter and Christmas bonuses are calculated proportionally if they have not 
already been paid for the current period.

Taxes and withholdings are applied according to current tax legislation, with 
special treatment for severance compensation where applicable.`;

    return template;
  }

  /**
   * Generate explanation from calculation result
   */
  static generateExplanationFromResult(
    calculationResult: any,
    language: 'gr' | 'en' = 'gr',
    terminationDate: string,
    serviceYears: number,
    unpaidDays: number,
    unusedLeaveDays: number
  ): string {
    
    const variables = {
      termination_date: new Date(terminationDate).toLocaleDateString(language === 'gr' ? 'el-GR' : 'en-GB'),
      severance: calculationResult.severanceAmount || 0,
      service_years: serviceYears,
      ref_monthly: calculationResult.refMonthly || calculationResult.lastMonthlyWage || 0,
      ruleset_id: 'greek-v2025.1',
      unpaid_regular: calculationResult.unpaidWages || 0,
      unpaid_regular_days: unpaidDays,
      daily_wage: (calculationResult.refMonthly || calculationResult.lastMonthlyWage || 0) / 25,
      leave_pay: calculationResult.unusedLeaveAmount || 0,
      unused_leave_days: unusedLeaveDays,
      allowance_leave: calculationResult.holidayAllowanceAmount || 0,
      allow_fraction: 1.0, // Default to full year, can be calculated based on employment period
      xmas_award: calculationResult.proRataChristmasBonus || 0,
      easter_award: calculationResult.proRataEasterBonus || 0,
      tax_total: (calculationResult.taxAmount || 0) + (calculationResult.socialSecurityAmount || 0),
      severance_tax_label: language === 'gr' ? 'ειδική κλίμακα' : 'special scale',
      net_total: calculationResult.netTotal || 0
    };

    if (language === 'gr') {
      return this.generateGreekExplanation(variables);
    } else {
      return this.generateEnglishExplanation(variables);
    }
  }

  /**
   * Generate simplified summary for employee communication
   */
  static generateSummaryNote(
    calculationResult: any,
    language: 'gr' | 'en' = 'gr'
  ): string {
    
    const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
    
    if (language === 'gr') {
      return `ΠΕΡΙΛΗΨΗ ΤΕΛΙΚΗΣ ΑΜΟΙΒΗΣ

Σύνολο καθαρών προς πληρωμή: ${formatCurrency(calculationResult.netTotal || 0)}

Περιλαμβάνει:
${calculationResult.severanceAmount > 0 ? `• Αποζημίωση: ${formatCurrency(calculationResult.severanceAmount)}` : ''}
${calculationResult.unpaidWages > 0 ? `• Μη καταβληθέντες μισθοί: ${formatCurrency(calculationResult.unpaidWages)}` : ''}
${calculationResult.unusedLeaveAmount > 0 ? `• Άδεια: ${formatCurrency(calculationResult.unusedLeaveAmount)}` : ''}
${calculationResult.holidayAllowanceAmount > 0 ? `• Επίδομα άδειας: ${formatCurrency(calculationResult.holidayAllowanceAmount)}` : ''}
${(calculationResult.proRataEasterBonus + calculationResult.proRataChristmasBonus) > 0 ? `• Δώρα: ${formatCurrency(calculationResult.proRataEasterBonus + calculationResult.proRataChristmasBonus)}` : ''}

Υπολογισμός σύμφωνα με τον Ν. 4093/2012`;
    } else {
      return `FINAL PAY SUMMARY

Net amount to be paid: ${formatCurrency(calculationResult.netTotal || 0)}

Includes:
${calculationResult.severanceAmount > 0 ? `• Severance: ${formatCurrency(calculationResult.severanceAmount)}` : ''}
${calculationResult.unpaidWages > 0 ? `• Unpaid wages: ${formatCurrency(calculationResult.unpaidWages)}` : ''}
${calculationResult.unusedLeaveAmount > 0 ? `• Leave pay: ${formatCurrency(calculationResult.unusedLeaveAmount)}` : ''}
${calculationResult.holidayAllowanceAmount > 0 ? `• Holiday allowance: ${formatCurrency(calculationResult.holidayAllowanceAmount)}` : ''}
${(calculationResult.proRataEasterBonus + calculationResult.proRataChristmasBonus) > 0 ? `• Bonuses: ${formatCurrency(calculationResult.proRataEasterBonus + calculationResult.proRataChristmasBonus)}` : ''}

Calculated according to Greek Labor Law 4093/2012`;
    }
  }
}