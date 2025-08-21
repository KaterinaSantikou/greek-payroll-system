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

  // Button labels (bilingual)
  'buttons.run_payroll': string;
  'buttons.review_now': string;
  'buttons.view_all': string;

  // Status chips (bilingual)
  'chips.due_today': string;
  'chips.blocked': string;
  'chips.needs_approval': string;

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

  // Onboarding
  'onboarding.title': string;
  'onboarding.description': string;
  'onboarding.quick_hire': string;
  'onboarding.seasonal_batch': string;
  'onboarding.pending_docs': string;
  'onboarding.awaiting_contract': string;
  'onboarding.started': string;
  'onboarding.progress': string;
  'onboarding.missing_items': string;
  'onboarding.completed_steps': string;
  'onboarding.total_steps': string;
  'onboarding.summer_batch': string;
  'onboarding.total_positions': string;
  'onboarding.hired': string;
  'onboarding.in_progress': string;
  'onboarding.pending': string;
  'onboarding.deadline': string;
  
  // Rota system
  'rota.subtitle': string;
  'rota.builder': string;
  'rota.people': string;
  'rota.costs': string;
  'rota.compliance': string;
  'rota.analytics': string;
  'rota.publishing': string;
  'rota.mobile': string;

  // Rota Builder
  'rota.week_view': string;
  'rota.fortnight_view': string;
  'rota.month_view': string;
  'rota.drag_drop': string;
  'rota.templates': string;
  'rota.copy_paste': string;
  'rota.bulk_edit': string;
  'rota.shift_details': string;
  'rota.role_required': string;
  'rota.min_hours': string;
  'rota.max_hours': string;
  'rota.rest_period': string;

  // People Layer
  'rota.availability_requests': string;
  'rota.time_off': string;
  'rota.shift_swaps': string;
  'rota.shift_bidding': string;
  'rota.approval_flow': string;
  'rota.pending_approvals': string;

  // Costs & Budget
  'rota.labor_cost_forecast': string;
  'rota.budget_vs_actual': string;
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

    // Button labels (bilingual)
    'buttons.run_payroll': 'Run Payroll',
    'buttons.review_now': 'Review Now',
    'buttons.view_all': 'View All',

    // Status chips (bilingual)
    'chips.due_today': 'Due Today',
    'chips.blocked': 'Blocked',
    'chips.needs_approval': 'Needs Approval',

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

    // Onboarding
    'onboarding.title': 'Employee Onboarding',
    'onboarding.description': 'Quick hire, bulk seasonal rehires, checklists',
    'onboarding.quick_hire': 'Quick Hire',
    'onboarding.seasonal_batch': 'Seasonal Batch',
    'onboarding.pending_docs': 'Pending documents',
    'onboarding.awaiting_contract': 'Awaiting contract',
    'onboarding.started': 'Started',
    'onboarding.progress': 'Progress',
    'onboarding.missing_items': 'Missing items',
    'onboarding.completed_steps': 'Completed steps',
    'onboarding.total_steps': 'Total steps',
    'onboarding.summer_batch': 'Summer 2025 Batch',
    'onboarding.total_positions': 'Total positions',
    'onboarding.hired': 'Hired',
    'onboarding.in_progress': 'In progress',
    'onboarding.pending': 'Pending',
    'onboarding.deadline': 'Deadline',

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

    // Comprehensive Rota System - English
    'rota.subtitle': 'Comprehensive team scheduling with Greek compliance',
    'rota.builder': 'Rota Builder',
    'rota.people': 'People & Availability',
    'rota.costs': 'Costs & Budget',
    'rota.compliance': 'Compliance Engine',
    'rota.analytics': 'Labor Analytics',
    'rota.publishing': 'Publishing & Comms',
    'rota.mobile': 'Mobile Features',

    // Rota Builder
    'rota.week_view': 'Week View',
    'rota.fortnight_view': 'Fortnight View', 
    'rota.month_view': 'Month View',
    'rota.drag_drop': 'Drag & Drop Shifts',
    'rota.templates': 'Templates',
    'rota.copy_paste': 'Copy/Paste',
    'rota.bulk_edit': 'Bulk Edit',
    'rota.shift_details': 'Shift Details',
    'rota.role_required': 'Role Required',
    'rota.min_hours': 'Min Hours',
    'rota.max_hours': 'Max Hours',
    'rota.rest_period': 'Rest Period',

    // People Layer
    'rota.availability_requests': 'Availability Requests',
    'rota.time_off': 'Time Off Requests',
    'rota.shift_swaps': 'Shift Swaps',
    'rota.shift_bidding': 'Shift Bidding',
    'rota.approval_flow': 'Approval Flow',
    'rota.pending_approvals': 'Pending Approvals',

    // Costs & Budget
    'rota.labor_cost_forecast': 'Labor Cost Forecast',
    'rota.budget_vs_actual': 'Budget vs Actual',
    'rota.over_budget': 'Over Budget',
    'rota.under_budget': 'Under Budget',
    'rota.cost_per_day': 'Cost per Day',
    'rota.cost_per_week': 'Cost per Week',

    // Mobile & Time Tracking
    'rota.clock_in': 'Clock In',
    'rota.clock_out': 'Clock Out',
    'rota.gps_verify': 'GPS Verification',
    'rota.geofence': 'Geofence',
    'rota.early_arrival': 'Early Arrival',
    'rota.late_arrival': 'Late Arrival',
    'rota.overtime_flag': 'Overtime Alert',

    // Greek Compliance
    'rota.night_shift': 'Night Shift (22:00-06:00)',
    'rota.sunday_premium': 'Sunday Premium',
    'rota.holiday_premium': 'Holiday Premium', 
    'rota.max_weekly': 'Max Weekly Hours',
    'rota.rest_between': 'Rest Between Shifts',
    'rota.sixth_day': 'Sixth Day Rules',
    'rota.ergani_announcement': 'ERGANI II Announcement',

    // Analytics
    'rota.coverage_percent': 'Coverage %',
    'rota.understaffed': 'Understaffed Windows',
    'rota.overtime_risk': 'Overtime Risk',
    'rota.forecast_accuracy': 'Forecast Accuracy',
    'rota.schedule_adherence': 'Schedule Adherence',
    'rota.cost_per_role': 'Cost per Role',
    'rota.no_show_rate': 'No-Show Rate',

    // Publishing
    'rota.draft': 'Draft',
    'rota.publish': 'Publish',
    'rota.published': 'Published',
    'rota.notify_staff': 'Notify Staff',
    'rota.acknowledge': 'Acknowledge',
    'rota.acknowledged': 'Acknowledged',
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

    // Button labels (bilingual)
    'buttons.run_payroll': 'Τρέξτε μισθοδοσία',
    'buttons.review_now': 'Έλεγχος τώρα',
    'buttons.view_all': 'Προβολή όλων',

    // Status chips (bilingual)
    'chips.due_today': 'Λήγει σήμερα',
    'chips.blocked': 'Φραγή',
    'chips.needs_approval': 'Απαιτεί έγκριση',

    // Comprehensive Rota System - Greek
    'rota.subtitle': 'Ολοκληρωμένος προγραμματισμός ομάδας με ελληνική συμμόρφωση',
    'rota.builder': 'Δημιουργός Ροτών',
    'rota.people': 'Άτομα & Διαθεσιμότητα',
    'rota.costs': 'Κόστη & Προϋπολογισμός',
    'rota.compliance': 'Μηχανή Συμμόρφωσης',
    'rota.analytics': 'Αναλυτικά Εργασίας',
    'rota.publishing': 'Δημοσίευση & Επικοινωνία',
    'rota.mobile': 'Χαρακτηριστικά Κινητού',

    // Rota Builder - Greek
    'rota.week_view': 'Προβολή Εβδομάδας',
    'rota.fortnight_view': 'Προβολή Δεκαπενθημέρου', 
    'rota.month_view': 'Προβολή Μήνα',
    'rota.drag_drop': 'Σύρσιμο & Εναπόθεση Βαρδιών',
    'rota.templates': 'Πρότυπα',
    'rota.copy_paste': 'Αντιγραφή/Επικόλληση',
    'rota.bulk_edit': 'Μαζική Επεξεργασία',
    'rota.shift_details': 'Λεπτομέρειες Βάρδιας',
    'rota.role_required': 'Απαιτούμενος Ρόλος',
    'rota.min_hours': 'Ελάχιστες Ώρες',
    'rota.max_hours': 'Μέγιστες Ώρες',
    'rota.rest_period': 'Περίοδος Ανάπαυσης',

    // People Layer - Greek
    'rota.availability_requests': 'Αιτήματα Διαθεσιμότητας',
    'rota.time_off': 'Αιτήματα Άδειας',
    'rota.shift_swaps': 'Ανταλλαγές Βαρδιών',
    'rota.shift_bidding': 'Προσφορές Βαρδιών',
    'rota.approval_flow': 'Ροή Έγκρισης',
    'rota.pending_approvals': 'Εκκρεμείς Εγκρίσεις',

    // Costs & Budget - Greek
    'rota.labor_cost_forecast': 'Πρόβλεψη Κόστους Εργασίας',
    'rota.budget_vs_actual': 'Προϋπολογισμός εναντίον Πραγματικού',
    'rota.over_budget': 'Πάνω από Προϋπολογισμό',
    'rota.under_budget': 'Κάτω από Προϋπολογισμό',
    'rota.cost_per_day': 'Κόστος ανά Ημέρα',
    'rota.cost_per_week': 'Κόστος ανά Εβδομάδα',

    // Mobile & Time Tracking - Greek
    'rota.clock_in': 'Είσοδος',
    'rota.clock_out': 'Έξοδος',
    'rota.gps_verify': 'Επιβεβαίωση GPS',
    'rota.geofence': 'Γεωφράκτης',
    'rota.early_arrival': 'Νωρίς Άφιξη',
    'rota.late_arrival': 'Αργή Άφιξη',
    'rota.overtime_flag': 'Ειδοποίηση Υπερωριών',

    // Greek Compliance
    'rota.night_shift': 'Νυχτερινή Βάρδια (22:00-06:00)',
    'rota.sunday_premium': 'Επίδομα Κυριακής',
    'rota.holiday_premium': 'Επίδομα Αργίας', 
    'rota.max_weekly': 'Μέγιστες Εβδομαδιαίες Ώρες',
    'rota.rest_between': 'Ανάπαυση Μεταξύ Βαρδιών',
    'rota.sixth_day': 'Κανόνες Έκτης Ημέρας',
    'rota.ergani_announcement': 'Προαναγγελία ΕΡΓΑΝΗ ΙΙ',

    // Analytics - Greek
    'rota.coverage_percent': 'Κάλυψη %',
    'rota.understaffed': 'Ανεπαρκώς Στελεχωμένα Παράθυρα',
    'rota.overtime_risk': 'Κίνδυνος Υπερωριών',
    'rota.forecast_accuracy': 'Ακρίβεια Πρόβλεψης',
    'rota.schedule_adherence': 'Συμμόρφωση Προγράμματος',
    'rota.cost_per_role': 'Κόστος ανά Ρόλο',
    'rota.no_show_rate': 'Ποσοστό Μη Εμφάνισης',

    // Publishing - Greek
    'rota.draft': 'Προσχέδιο',
    'rota.publish': 'Δημοσίευση',
    'rota.published': 'Δημοσιευμένο',
    'rota.notify_staff': 'Ειδοποίηση Προσωπικού',
    'rota.acknowledge': 'Αναγνώριση',
    'rota.acknowledged': 'Αναγνωρισμένο',

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

    // Onboarding
    'onboarding.title': 'Ένταξη Εργαζομένων',
    'onboarding.description': 'Γρήγορη πρόσληψη, εποχιακές επαναλήψεις, λίστες ελέγχου',
    'onboarding.quick_hire': 'Γρήγορη Πρόσληψη',
    'onboarding.seasonal_batch': 'Εποχιακό Πακέτο',
    'onboarding.pending_docs': 'Εκκρεμή έγγραφα',
    'onboarding.awaiting_contract': 'Αναμονή σύμβασης',
    'onboarding.started': 'Ξεκίνησε',
    'onboarding.progress': 'Πρόοδος',
    'onboarding.missing_items': 'Ελλείπαντα στοιχεία',
    'onboarding.completed_steps': 'Ολοκληρωμένα βήματα',
    'onboarding.total_steps': 'Συνολικά βήματα',
    'onboarding.summer_batch': 'Πακέτο Καλοκαιρίου 2025',
    'onboarding.total_positions': 'Συνολικές θέσεις',
    'onboarding.hired': 'Προσληφθέντες',
    'onboarding.in_progress': 'Σε εξέλιξη',
    'onboarding.pending': 'Εκκρεμείς',
    'onboarding.deadline': 'Προθεσμία',

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
  const [locale, setLocaleState] = React.useState<Locale>(() => {
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

  // Wrapper for setLocale that persists changes
  const setLocale = React.useCallback((newLocale: Locale) => {
    if (typeof window !== 'undefined') {
      // Update localStorage for persistence
      localStorage.setItem('preferred_locale', newLocale);
      
      // Update cookie for SSR support
      document.cookie = `lang=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
      
      // Broadcast language change event for third-party widgets
      window.dispatchEvent(new CustomEvent('langChanged', { 
        detail: { locale: newLocale, previousLocale: locale }
      }));
      
      // Log for debugging
      console.log(`Language changed from ${locale} to ${newLocale}`);
    }
    
    setLocaleState(newLocale);
  }, [locale]);

  const t = React.useCallback((key: keyof TranslationKeys): string => {
    return translations[locale][key] || key;
  }, [locale]);

  const value = React.useMemo(() => ({
    locale,
    setLocale,
    t,
  }), [locale, setLocale, t]);

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
    if (process.env.NODE_ENV === 'development' && !translations[locale][key] && translations['en'][key]) {
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