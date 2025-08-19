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
  },
  
  el: {
    // Navigation - Greek translations from the provided file
    'nav.dashboard': 'Πίνακας Ελέγχου',
    'nav.people': 'Προσωπικό',
    'nav.employees': 'Εργαζόμενοι',
    'nav.onboarding': 'Ένταξη (Onboarding)',
    'nav.exits': 'Αποχωρήσεις',
    'nav.teams-roles': 'Ομάδες & Ρόλοι',
    'nav.time': 'Ώρα & Παρουσίες',
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
    'nav.filings': 'Δηλώσεις',
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
  const [locale, setLocale] = React.useState<Locale>('en');

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

// Utility function for formatting numbers with Greek locale
export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Utility function for formatting dates with Greek locale
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Utility function for formatting time with Greek locale
export function formatTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}