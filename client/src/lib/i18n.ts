import React from 'react';

export type Locale = 'en' | 'el';

interface TranslationKeys {
  // Navigation
  'nav.dashboard': string;
  'nav.people': string;
  'nav.employees': string;
  'nav.onboarding': string;
  'nav.exits': string;
  'nav.teams-roles': string;
  'nav.time': string;
  'nav.punches': string;
  'nav.exceptions': string;
  'nav.schedules': string;
  'nav.overtime': string;
  'nav.digital-work-card': string;
  'nav.devices': string;
  'nav.payroll': string;
  'nav.runs': string;
  'nav.components': string;
  'nav.bonuses': string;
  'nav.simulations': string;
  'nav.audit': string;
  'nav.filings': string;
  'nav.ergani': string;
  'nav.efka-apd': string;
  'nav.aade-fmy': string;
  'nav.inspector-pack': string;
  'nav.payments': string;
  'nav.sepa': string;
  'nav.off-cycle': string;
  'nav.reconciliation': string;
  'nav.accounting': string;
  'nav.gl-export': string;
  'nav.postings': string;
  'nav.analytics': string;
  'nav.cost-ot': string;
  'nav.absence-turnover': string;
  'nav.custom-reports': string;
  'nav.settings': string;
  'nav.policies': string;
  'nav.compliance': string;
  'nav.integrations': string;
  'nav.security': string;
  'nav.localization': string;
  'nav.help-audit': string;
  'nav.guides': string;
  'nav.support': string;
  'nav.audit-log': string;

  // Dashboard chips and status
  'dashboard.digital_card_sync': string;
  'dashboard.ergani_sync': string;
  'dashboard.filings_due': string;
  'dashboard.updated_just_now': string;
  
  // Enhanced dashboard content
  'dashboard.run_payroll': string;
  'dashboard.resume_payroll_run': string;
  'dashboard.draft_in_progress': string;
  'dashboard.ready_to_process': string;
  'dashboard.employees': string;
  'dashboard.gross_total': string;
  'dashboard.vs_last_month': string;
  'dashboard.processing': string;
  'dashboard.resume_draft': string;
  'dashboard.start_payroll': string;
  'dashboard.progress': string;
  'dashboard.complete': string;
  'dashboard.critical_today': string;
  'dashboard.updated': string;
  'dashboard.next_payday': string;
  'dashboard.on_track': string;
  'dashboard.to_approve': string;
  'dashboard.items': string;
  'dashboard.needs_attention': string;
  'dashboard.sync': string;
  'dashboard.healthy': string;
  'dashboard.bank_cutoff': string;
  'dashboard.today': string;
  'dashboard.remaining': string;
  'dashboard.greek_compliance': string;
  'dashboard.digital_card': string;
  'dashboard.covered': string;
  'dashboard.sync_status': string;
  'dashboard.sync_ergani': string;
  'dashboard.view_coverage': string;
  'dashboard.payroll_starting': string;
  'dashboard.payroll_starting_desc': string;
  'dashboard.payroll_ready': string;
  'dashboard.payroll_ready_desc': string;
  'dashboard.resume_payroll': string;
  'dashboard.resume_payroll_desc': string;
  
  // Explanation system
  'explanation.title': string;
  'explanation.coverage': string;
  'explanation.confidence': string;
  'explanation.generated': string;
  'explanation.show_formulas': string;
  'explanation.hide_formulas': string;
  'explanation.rate_explanation': string;
  'explanation.submit': string;
  'explanation.cancel': string;
  'explanation.helpful_question': string;
  'explanation.calculation_formula': string;
  'explanation.unexplained_items': string;
  'explanation.unexplained_description': string;
  'explanation.earnings': string;
  'explanation.deductions': string;
  'explanation.summary': string;
  'explanation.total_earnings': string;
  'explanation.total_deductions': string;
  'explanation.net_pay': string;
  'explanation.gross_pay': string;
  'explanation.quality_metrics': string;
  'explanation.edge_cases': string;
  'explanation.security': string;
  'explanation.edge_cases_detected': string;

  // Error messages
  'errors.network_error': string;
  'errors.validation_error': string;
  'errors.unauthorized': string;
  'errors.not_found': string;
  'errors.server_error': string;

  // App branding
  'app.name': string;
  'app.tagline': string;
  'app.version': string;
  'app.copyright': string;

  // Dashboard
  'dashboard.property-switcher': string;
  'dashboard.period-selector': string;
  'dashboard.global-search': string;
  'dashboard.action-inbox': string;
  'dashboard.compliance-strip': string;
  'dashboard.payroll-status': string;
  'dashboard.hours-cost-kpis': string;
  'dashboard.attendance-today': string;
  'dashboard.forecast-risk': string;
  'dashboard.filings-payments': string;

  // Common actions
  'common.view': string;
  'common.edit': string;
  'common.delete': string;
  'common.save': string;
  'common.cancel': string;
  'common.submit': string;
  'common.approve': string;
  'common.reject': string;
  'common.download': string;
  'common.export': string;
  'common.filter': string;
  'common.search': string;
  'common.add': string;
  'common.create': string;
  'common.update': string;

  // Status labels
  'status.pending': string;
  'status.approved': string;
  'status.rejected': string;
  'status.completed': string;
  'status.active': string;
  'status.inactive': string;
  'status.online': string;
  'status.offline': string;
  'status.error': string;
  'status.success': string;

  // Employee Portal
  'portal.welcome': string;
  'portal.latest-payslip': string;
  'portal.time-summary': string;
  'portal.leave-balance': string;
  'portal.pending-requests': string;
  'portal.notifications': string;
  'portal.quick-actions': string;
  'portal.net-pay': string;
  'portal.gross-pay': string;
  'portal.deductions': string;
  'portal.period': string;
  'portal.hours-today': string;
  'portal.hours-week': string;
  'portal.hours-month': string;
  'portal.overtime': string;
  'portal.annual-leave': string;
  'portal.sick-leave': string;
  'portal.personal-leave': string;
  'portal.digital-card': string;
  'portal.compliance-score': string;
}

const translations: Record<Locale, TranslationKeys> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.people': 'People',
    'nav.employees': 'Employees',
    'nav.onboarding': 'Onboarding',
    'nav.exits': 'Exits',
    'nav.teams-roles': 'Teams & Roles',
    'nav.time': 'Time & Attendance',
    'nav.punches': 'Time Punches',
    'nav.exceptions': 'Exceptions',
    'nav.schedules': 'Schedules',
    'nav.overtime': 'Overtime',
    'nav.digital-work-card': 'Digital Work Card',
    'nav.devices': 'Devices',
    'nav.payroll': 'Payroll',
    'nav.runs': 'Payroll Runs',
    'nav.components': 'Components',
    'nav.bonuses': 'Bonuses & Allowances',
    'nav.simulations': 'Simulations',
    'nav.audit': 'Audit',
    'nav.filings': 'Government Filings',
    'nav.ergani': 'ERGANI II',
    'nav.efka-apd': 'e-EFKA / APD',
    'nav.aade-fmy': 'AADE / FMY',
    'nav.inspector-pack': 'Inspector Pack',
    'nav.payments': 'Payments',
    'nav.sepa': 'SEPA Files',
    'nav.off-cycle': 'Off-Cycle / Corrections',
    'nav.reconciliation': 'Reconciliation',
    'nav.accounting': 'Accounting',
    'nav.gl-export': 'GL Export',
    'nav.postings': 'Postings',
    'nav.analytics': 'Analytics',
    'nav.cost-ot': 'Cost & OT',
    'nav.absence-turnover': 'Absence & Turnover',
    'nav.custom-reports': 'Custom Reports',
    'nav.settings': 'Settings',
    'nav.policies': 'Policies',
    'nav.compliance': 'Compliance',
    'nav.integrations': 'Integrations',
    'nav.security': 'Security',
    'nav.localization': 'Localization',
    'nav.help-audit': 'Help & Audit',
    'nav.guides': 'Guides',
    'nav.support': 'Support',
    'nav.audit-log': 'Audit Log',

    // App branding
    'app.name': 'PayrollSync',
    'app.tagline': 'Greek HR & Payroll',
    'app.version': 'Version 2.1.0',
    'app.copyright': '© 2025 PayrollSync',

    // Dashboard
    'dashboard.property-switcher': 'Property Switcher',
    'dashboard.period-selector': 'Period Selector',
    'dashboard.global-search': 'Global Search (⌘K)',
    'dashboard.action-inbox': 'Action Inbox',
    'dashboard.compliance-strip': 'Compliance Monitor',
    'dashboard.payroll-status': 'Payroll Run Status',
    'dashboard.hours-cost-kpis': 'Hours & Cost KPIs',
    'dashboard.attendance-today': 'Attendance Today',
    'dashboard.forecast-risk': 'Forecast & Risk',
    'dashboard.filings-payments': 'Filings & Payments',

    // Common actions
    'common.view': 'View',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.approve': 'Approve',
    'common.reject': 'Reject',
    'common.download': 'Download',
    'common.export': 'Export',
    'common.filter': 'Filter',
    'common.search': 'Search',
    'common.add': 'Add',
    'common.create': 'Create',
    'common.update': 'Update',

    // Status labels
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.completed': 'Completed',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.error': 'Error',
    'status.success': 'Success',

    // Employee Portal
    'portal.welcome': 'Welcome back',
    'portal.latest-payslip': 'Latest Payslip',
    'portal.time-summary': 'Time Summary',
    'portal.leave-balance': 'Leave Balance',
    'portal.pending-requests': 'Pending Requests',
    'portal.notifications': 'Recent Notifications',
    'portal.quick-actions': 'Quick Actions',
    'portal.net-pay': 'Net Pay',
    'portal.gross-pay': 'Gross Pay',
    'portal.deductions': 'Deductions',
    'portal.period': 'Period',
    'portal.hours-today': 'Today',
    'portal.hours-week': 'This Week',
    'portal.hours-month': 'This Month',
    'portal.overtime': 'Overtime',
    'portal.annual-leave': 'Annual Leave',
    'portal.sick-leave': 'Sick Leave',
    'portal.personal-leave': 'Personal Leave',
    'portal.digital-card': 'Digital Card',
    'portal.compliance-score': 'Compliance Score',

    // Dashboard chips and status
    'dashboard.digital_card_sync': 'Digital Card',
    'dashboard.ergani_sync': 'ERGANI in sync',
    'dashboard.filings_due': '{count, plural, one {# filing due} other {# filings due}}',
    'dashboard.updated_just_now': 'Updated just now',
    
    // Enhanced dashboard content
    'dashboard.run_payroll': 'Run Payroll',
    'dashboard.resume_payroll_run': 'Resume Payroll Run',
    'dashboard.draft_in_progress': 'Draft payroll in progress - pick up where you left off',
    'dashboard.ready_to_process': 'Ready to process payroll for this period',
    'dashboard.employees': 'Employees',
    'dashboard.gross_total': 'Gross Total',
    'dashboard.vs_last_month': 'vs Last Month',
    'dashboard.processing': 'Processing...',
    'dashboard.resume_draft': 'Resume Draft',
    'dashboard.start_payroll': 'Start Payroll',
    'dashboard.progress': 'Progress',
    'dashboard.complete': 'Complete',
    'dashboard.critical_today': 'Critical Today',
    'dashboard.updated': 'Updated',
    'dashboard.next_payday': 'Next Payday',
    'dashboard.on_track': 'On Track',
    'dashboard.to_approve': 'To Approve',
    'dashboard.items': 'items',
    'dashboard.needs_attention': 'Needs Attention',
    'dashboard.sync': 'Sync',
    'dashboard.healthy': 'Healthy',
    'dashboard.bank_cutoff': 'Bank Cutoff',
    'dashboard.today': 'Today',
    'dashboard.remaining': 'Remaining',
    'dashboard.greek_compliance': 'Greek Compliance',
    'dashboard.digital_card': 'Digital Card',
    'dashboard.covered': 'Covered',
    'dashboard.sync_status': 'Sync Status',
    'dashboard.sync_ergani': 'Sync ΕΡΓΑΝΗ',
    'dashboard.view_coverage': 'View Coverage',
    'dashboard.payroll_starting': 'Starting Payroll Run',
    'dashboard.payroll_starting_desc': 'Initializing payroll calculations...',
    'dashboard.payroll_ready': 'Payroll Ready',
    'dashboard.payroll_ready_desc': 'Payroll run is ready for review',
    'dashboard.resume_payroll': 'Resuming Payroll',
    'dashboard.resume_payroll_desc': 'Continuing from where you left off',
    
    // Explanation system
    'explanation.title': 'Payslip Explanation',
    'explanation.coverage': 'coverage',
    'explanation.confidence': 'confidence',
    'explanation.generated': 'Generated',
    'explanation.show_formulas': 'Show Formulas',
    'explanation.hide_formulas': 'Hide Formulas',
    'explanation.rate_explanation': 'Rate',
    'explanation.submit': 'Submit',
    'explanation.cancel': 'Cancel',
    'explanation.helpful_question': 'How helpful was this explanation?',
    'explanation.calculation_formula': 'Calculation Formula',
    'explanation.unexplained_items': 'Unexplained Items',
    'explanation.unexplained_description': 'The following items could not be explained automatically:',
    'explanation.earnings': 'Earnings',
    'explanation.deductions': 'Deductions',
    'explanation.summary': 'Summary',
    'explanation.total_earnings': 'Gross Pay',
    'explanation.total_deductions': 'Total Deductions',
    'explanation.net_pay': 'Net Pay',
    'explanation.gross_pay': 'Gross Pay',
    'explanation.quality_metrics': 'Quality Metrics',
    'explanation.edge_cases': 'Edge Cases',
    'explanation.security': 'Security',
    'explanation.edge_cases_detected': 'Edge Cases Detected:',

    // Error messages
    'errors.network_error': 'Network connection error',
    'errors.validation_error': 'Please check your input',
    'errors.unauthorized': 'Access denied',
    'errors.not_found': 'Item not found',
    'errors.server_error': 'Server error occurred',
  },
  
  el: {
    // Navigation - Greek translations from the provided file
    'nav.dashboard': 'Πίνακας Ελέγχου',
    'nav.people': 'Άτομα',
    'nav.employees': 'Εργαζόμενοι',
    'nav.onboarding': 'Ένταξη (Onboarding)',
    'nav.exits': 'Αποχωρήσεις',
    'nav.teams-roles': 'Ομάδες & Ρόλοι',
    'nav.time': 'Χρόνος & Παρουσία',
    'nav.punches': 'Καταγραφές Προσέλευσης',
    'nav.exceptions': 'Εξαιρέσεις',
    'nav.schedules': 'Προγράμματα Βαρδιών',
    'nav.overtime': 'Υπερωρίες',
    'nav.digital-work-card': 'Ψηφιακή Κάρτα Εργασίας',
    'nav.devices': 'Συσκευές',
    'nav.payroll': 'Μισθοδοσία',
    'nav.runs': 'Κύκλοι Μισθοδοσίας',
    'nav.components': 'Στοιχεία Αποδοχών',
    'nav.bonuses': 'Δώρα & Επιδόματα',
    'nav.simulations': 'Προσομοιώσεις',
    'nav.audit': 'Έλεγχος',
    'nav.filings': 'Συμμόρφωση & Δηλώσεις',
    'nav.ergani': 'ΕΡΓΑΝΗ ΙΙ',
    'nav.efka-apd': 'e-ΕΦΚΑ / ΑΠΔ',
    'nav.aade-fmy': 'ΑΑΔΕ / ΦΜΥ',
    'nav.inspector-pack': 'Φάκελος Ελέγχου',
    'nav.payments': 'Πληρωμές',
    'nav.sepa': 'Αρχεία Μισθοδοσίας (SEPA)',
    'nav.off-cycle': 'Εκτός Κύκλου / Διορθώσεις',
    'nav.reconciliation': 'Συμφωνίες',
    'nav.accounting': 'Λογιστήριο',
    'nav.gl-export': 'Εξαγωγή GL',
    'nav.postings': 'Καταχωρήσεις',
    'nav.analytics': 'Αναλύσεις',
    'nav.cost-ot': 'Κόστος & Υπερωρίες',
    'nav.absence-turnover': 'Απουσίες & Κυκλότητα Προσωπικού',
    'nav.custom-reports': 'Προσαρμοσμένες Αναφορές',
    'nav.settings': 'Ρυθμίσεις',
    'nav.policies': 'Πολιτικές',
    'nav.compliance': 'Συμμόρφωση',
    'nav.integrations': 'Διασυνδέσεις',
    'nav.security': 'Ασφάλεια',
    'nav.localization': 'Τοπικοποίηση',
    'nav.help-audit': 'Βοήθεια & Καταγραφή',
    'nav.guides': 'Οδηγοί',
    'nav.support': 'Υποστήριξη',
    'nav.audit-log': 'Ημερολόγιο Ενεργειών',

    // App branding - Greek
    'app.name': 'PayrollSync',
    'app.tagline': 'Ελληνικό HR & Μισθοδοσία',
    'app.version': 'Έκδοση 2.1.0',
    'app.copyright': '© 2025 PayrollSync',

    // Dashboard - Greek translations from the provided file
    'dashboard.property-switcher': 'Επιλογή Μονάδας/Ξενοδοχείου',
    'dashboard.period-selector': 'Επιλογή Περιόδου',
    'dashboard.global-search': 'Καθολική Αναζήτηση (⌘K)',
    'dashboard.action-inbox': 'Εισερχόμενα Ενεργειών',
    'dashboard.compliance-strip': 'Γραμμή Συμμόρφωσης',
    'dashboard.payroll-status': 'Κατάσταση Κύκλου Μισθοδοσίας',
    'dashboard.hours-cost-kpis': 'Δείκτες Ωρών & Κόστους',
    'dashboard.attendance-today': 'Παρουσίες Σήμερα',
    'dashboard.forecast-risk': 'Πρόβλεψη & Κίνδυνοι (επόμ. 2 εβδομάδες)',
    'dashboard.filings-payments': 'Δηλώσεις & Πληρωμές',

    // Common actions
    'common.view': 'Προβολή',
    'common.edit': 'Επεξεργασία',
    'common.delete': 'Διαγραφή',
    'common.save': 'Αποθήκευση',
    'common.cancel': 'Ακύρωση',
    'common.submit': 'Υποβολή',
    'common.approve': 'Έγκριση',
    'common.reject': 'Απόρριψη',
    'common.download': 'Λήψη',
    'common.export': 'Εξαγωγή',
    'common.filter': 'Φίλτρο',
    'common.search': 'Αναζήτηση',
    'common.add': 'Προσθήκη',
    'common.create': 'Δημιουργία',
    'common.update': 'Ενημέρωση',

    // Status labels
    'status.pending': 'Εκκρεμής',
    'status.approved': 'Εγκεκριμένο',
    'status.rejected': 'Απορριφθέν',
    'status.completed': 'Ολοκληρωμένο',
    'status.active': 'Ενεργό',
    'status.inactive': 'Ανενεργό',
    'status.online': 'Συνδεδεμένο',
    'status.offline': 'Αποσυνδεδεμένο',
    'status.error': 'Σφάλμα',
    'status.success': 'Επιτυχία',

    // Employee Portal
    'portal.welcome': 'Καλώς ήρθατε',
    'portal.latest-payslip': 'Τελευταίο Μισθολόγιο',
    'portal.time-summary': 'Σύνοψη Ωρών',
    'portal.leave-balance': 'Υπόλοιπο Αδειών',
    'portal.pending-requests': 'Εκκρεμή Αιτήματα',
    'portal.notifications': 'Πρόσφατες Ειδοποιήσεις',
    'portal.quick-actions': 'Γρήγορες Ενέργειες',
    'portal.net-pay': 'Καθαρές Αποδοχές',
    'portal.gross-pay': 'Μικτές Αποδοχές',
    'portal.deductions': 'Κρατήσεις',
    'portal.period': 'Περίοδος',
    'portal.hours-today': 'Σήμερα',
    'portal.hours-week': 'Αυτή την Εβδομάδα',
    'portal.hours-month': 'Αυτόν τον Μήνα',
    'portal.overtime': 'Υπερωρίες',
    'portal.annual-leave': 'Ετήσια Άδεια',
    'portal.sick-leave': 'Άδεια Ασθενείας',
    'portal.personal-leave': 'Προσωπική Άδεια',
    'portal.digital-card': 'Ψηφιακή Κάρτα',
    'portal.compliance-score': 'Βαθμός Συμμόρφωσης',

    // Dashboard chips and status  
    'dashboard.digital_card_sync': 'Ψηφιακή Κάρτα',
    'dashboard.ergani_sync': 'ΕΡΓΑΝΗ σε συγχρονισμό',
    'dashboard.filings_due': '{count, plural, one {# δήλωση σε εκκρεμότητα} other {# δηλώσεις σε εκκρεμότητα}}',
    'dashboard.updated_just_now': 'Μόλις ενημερώθηκε',
    
    // Enhanced dashboard content
    'dashboard.run_payroll': 'Εκτέλεση Μισθοδοσίας',
    'dashboard.resume_payroll_run': 'Συνέχεια Μισθοδοσίας',
    'dashboard.draft_in_progress': 'Προσχέδιο μισθοδοσίας σε εξέλιξη - συνεχίστε από εκεί που σταματήσατε',
    'dashboard.ready_to_process': 'Έτοιμο για επεξεργασία μισθοδοσίας για αυτή την περίοδο',
    'dashboard.employees': 'Εργαζόμενοι',
    'dashboard.gross_total': 'Συνολικά Μικτά',
    'dashboard.vs_last_month': 'έναντι Προηγ. Μήνα',
    'dashboard.processing': 'Επεξεργασία...',
    'dashboard.resume_draft': 'Συνέχεια Προσχεδίου',
    'dashboard.start_payroll': 'Έναρξη Μισθοδοσίας',
    'dashboard.progress': 'Πρόοδος',
    'dashboard.complete': 'Ολοκληρώθηκε',
    'dashboard.critical_today': 'Κρίσιμα Σήμερα',
    'dashboard.updated': 'Ενημερώθηκε',
    'dashboard.next_payday': 'Επόμενη Πληρωμή',
    'dashboard.on_track': 'Εντός Χρονοδιαγράμματος',
    'dashboard.to_approve': 'Προς Έγκριση',
    'dashboard.items': 'στοιχεία',
    'dashboard.needs_attention': 'Χρειάζεται Προσοχή',
    'dashboard.sync': 'Συγχρονισμός',
    'dashboard.healthy': 'Υγιής',
    'dashboard.bank_cutoff': 'Όριο Τράπεζας',
    'dashboard.today': 'Σήμερα',
    'dashboard.remaining': 'Απομένουν',
    'dashboard.greek_compliance': 'Ελληνική Συμμόρφωση',
    'dashboard.digital_card': 'Ψηφιακή Κάρτα',
    'dashboard.covered': 'Καλύπτεται',
    'dashboard.sync_status': 'Κατάσταση Συγχρονισμού',
    'dashboard.sync_ergani': 'Συγχρονισμός ΕΡΓΑΝΗ',
    'dashboard.view_coverage': 'Προβολή Κάλυψης',
    'dashboard.payroll_starting': 'Έναρξη Μισθοδοσίας',
    'dashboard.payroll_starting_desc': 'Αρχικοποίηση υπολογισμών μισθοδοσίας...',
    'dashboard.payroll_ready': 'Μισθοδοσία Έτοιμη',
    'dashboard.payroll_ready_desc': 'Η μισθοδοσία είναι έτοιμη για αναθεώρηση',
    'dashboard.resume_payroll': 'Συνέχεια Μισθοδοσίας',
    'dashboard.resume_payroll_desc': 'Συνέχεια από εκεί που σταματήσατε',
    
    // Explanation system
    'explanation.title': 'Εξήγηση Μισθοδοσίας',
    'explanation.coverage': 'κάλυψη',
    'explanation.confidence': 'εμπιστοσύνη',
    'explanation.generated': 'Δημιουργήθηκε',
    'explanation.show_formulas': 'Εμφάνιση Τύπων',
    'explanation.hide_formulas': 'Απόκρυψη Τύπων',
    'explanation.rate_explanation': 'Αξιολόγηση',
    'explanation.submit': 'Υποβολή',
    'explanation.cancel': 'Ακύρωση',
    'explanation.helpful_question': 'Πόσο χρήσιμη ήταν αυτή η εξήγηση;',
    'explanation.calculation_formula': 'Τύπος Υπολογισμού',
    'explanation.unexplained_items': 'Μη Εξηγημένα Στοιχεία',
    'explanation.unexplained_description': 'Τα παρακάτω στοιχεία δεν μπόρεσαν να εξηγηθούν αυτόματα:',
    'explanation.earnings': 'Αποδοχές',
    'explanation.deductions': 'Κρατήσεις',
    'explanation.summary': 'Σύνοψη',
    'explanation.total_earnings': 'Μικτές Αποδοχές',
    'explanation.total_deductions': 'Σύνολο Κρατήσεων',
    'explanation.net_pay': 'Καθαρές Αποδοχές',
    'explanation.gross_pay': 'Μικτές Αποδοχές',
    'explanation.quality_metrics': 'Μετρικές Ποιότητας',
    'explanation.edge_cases': 'Ειδικές Περιπτώσεις',
    'explanation.security': 'Ασφάλεια',
    'explanation.edge_cases_detected': 'Ειδικές Περιπτώσεις που Εντοπίστηκαν:',

    // Error messages
    'errors.network_error': 'Σφάλμα σύνδεσης δικτύου',
    'errors.validation_error': 'Παρακαλώ ελέγξτε τα στοιχεία σας',
    'errors.unauthorized': 'Δεν έχετε δικαίωμα πρόσβασης',
    'errors.not_found': 'Το στοιχείο δεν βρέθηκε',
    'errors.server_error': 'Παρουσιάστηκε σφάλμα διακομιστή',
  },
};

// Context for managing locale
interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof TranslationKeys) => string;
}

const LocaleContext = React.createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Initialize with persisted locale before first paint
  const [locale, setLocale] = React.useState<Locale>(() => {
    // This runs only once during initialization, before first paint
    if (typeof window === 'undefined') return 'en'; // SSR fallback
    
    // Check localStorage first
    const storedLocale = localStorage.getItem('preferred_locale') as Locale;
    if (storedLocale && ['en', 'el'].includes(storedLocale)) {
      return storedLocale;
    }

    // Check cookie
    const cookieMatch = document.cookie.match(/(?:^|; )lang=([^;]*)/);
    const cookieLocale = cookieMatch?.[1] as Locale;
    if (cookieLocale && ['en', 'el'].includes(cookieLocale)) {
      return cookieLocale;
    }

    // Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('el')) {
      return 'el';
    }

    // Fallback to English
    return 'en';
  });

  const t = React.useCallback((key: keyof TranslationKeys): string => {
    return translations[locale][key] || key;
  }, [locale]);

  const value = React.useMemo(() => ({
    locale,
    setLocale,
    t,
  }), [locale, t]);

  return React.createElement(
    LocaleContext.Provider,
    { value },
    children
  );
}

export function useLocale() {
  const context = React.useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// Translation function with fallback for missing keys (dev warning)
export function createTranslator(locale: Locale) {
  return function t(key: keyof TranslationKeys, variables?: Record<string, any>): string {
    let translation = translations[locale][key] || translations['en'][key] || key;
    
    // Warn in development for missing translations
    if (import.meta.env.DEV && !translations[locale][key] && translations['en'][key]) {
      console.warn(`Missing translation for key "${key}" in locale "${locale}"`);
    }
    
    // Handle ICU-style variables and pluralization
    if (variables && typeof translation === 'string') {
      // Simple variable replacement
      translation = translation.replace(/\{(\w+)\}/g, (match, varName) => {
        return variables[varName]?.toString() || match;
      });
      
      // Handle ICU plurals like {count, plural, one {...} other {...}}
      if (translation.includes('{count, plural,')) {
        const count = variables.count || 0;
        const pluralMatch = translation.match(/\{count, plural, one \{([^}]+)\} other \{([^}]+)\}\}/);
        if (pluralMatch) {
          const [, oneForm, otherForm] = pluralMatch;
          const selectedForm = count === 1 ? oneForm : otherForm;
          translation = selectedForm.replace('#', count.toString());
        }
      }
    }
    
    return translation;
  };
}

// Hook that provides translator function
export function useTranslation() {
  const { locale } = useLocale();
  return { 
    t: createTranslator(locale),
    locale 
  };
}

// Enhanced Greek locale formatting with decimal comma
export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    currencyDisplay: 'symbol',
  }).format(amount);
}

// Format numbers with proper Greek decimal comma
export function formatNumber(value: number, locale: Locale, decimals: number = 2): string {
  return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ICU pluralization for Greek
export function pluralize(count: number, locale: Locale, key: string): string {
  if (locale === 'el') {
    // Greek pluralization rules
    const pluralRules = new Intl.PluralRules('el');
    const rule = pluralRules.select(count);
    
    const greekPlurals: Record<string, Record<string, string>> = {
      'hours': {
        'one': 'ώρα',
        'other': 'ώρες'
      },
      'filings': {
        'one': 'δήλωση σε εκκρεμότητα', 
        'other': 'δηλώσεις σε εκκρεμότητα'
      },
      'employees': {
        'one': 'εργαζόμενος',
        'other': 'εργαζόμενοι'
      },
      'days': {
        'one': 'ημέρα',
        'other': 'ημέρες'
      }
    };
    
    const forms = greekPlurals[key];
    if (forms) {
      return forms[rule] || forms['other'];
    }
  }
  
  // English fallback
  const englishPlurals: Record<string, Record<string, string>> = {
    'hours': {
      'one': 'hour',
      'other': 'hours'
    },
    'filings': {
      'one': 'filing due',
      'other': 'filings due'
    },
    'employees': {
      'one': 'employee',
      'other': 'employees'
    },
    'days': {
      'one': 'day',
      'other': 'days'
    }
  };
  
  const forms = englishPlurals[key];
  if (forms) {
    const rule = count === 1 ? 'one' : 'other';
    return forms[rule];
  }
  
  return key;
}

// Format with ICU-style pluralization and count
export function formatPlural(count: number, locale: Locale, key: string): string {
  const pluralForm = pluralize(count, locale, key);
  const formattedCount = formatNumber(count, locale, 0);
  return `${formattedCount} ${pluralForm}`;
}

// Enhanced date formatting with Greek month names
export function formatDate(date: Date, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-US', {
    ...defaultOptions,
    ...options,
  }).format(date);
}

// Relative time formatting with Greek localization
export function formatRelativeTime(date: Date, locale: Locale): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (locale === 'el') {
    if (diffInMinutes < 1) return 'Μόλις τώρα';
    if (diffInMinutes < 60) return `Πριν από ${diffInMinutes} λεπτά`;
    if (diffInHours < 24) return `Πριν από ${diffInHours} ώρες`;
    if (diffInDays < 30) return `Πριν από ${diffInDays} ημέρες`;
    return formatDate(date, locale, { month: 'short', day: 'numeric' });
  }
  
  // English
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays < 30) return `${diffInDays} days ago`;
  return formatDate(date, locale, { month: 'short', day: 'numeric' });
}

// Utility function for formatting time with Greek locale
export function formatTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}