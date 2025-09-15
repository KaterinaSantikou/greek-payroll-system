import { User } from '@shared/schema';

export type UserRole =
  | 'payroll-admin'
  | 'hr'
  | 'manager'
  | 'compliance-auditor'
  | 'employee';

export interface RoleBasedView {
  role: UserRole;
  defaultRoute: string;
  primarySections: string[];
  defaultDashboardWidgets: string[];
  quickActions: string[];
  restrictions?: string[];
}

export const ROLE_CONFIGURATIONS: Record<UserRole, RoleBasedView> = {
  'payroll-admin': {
    role: 'payroll-admin',
    defaultRoute: '/payroll',
    primarySections: [
      'dashboard',
      'payroll',
      'filings',
      'payments',
      'accounting',
    ],
    defaultDashboardWidgets: [
      'payroll-runs-status',
      'pending-filings',
      'sepa-payments',
      'exception-summary',
      'compliance-alerts',
    ],
    quickActions: [
      'run-payroll',
      'submit-filings',
      'generate-sepa',
      'approve-exceptions',
      'gl-export',
    ],
  },

  hr: {
    role: 'hr',
    defaultRoute: '/employees',
    primarySections: [
      'dashboard',
      'people',
      'filings',
      'analytics',
      'help-audit',
    ],
    defaultDashboardWidgets: [
      'employee-overview',
      'onboarding-pipeline',
      'ergani-status',
      'turnover-rates',
      'compliance-checklist',
    ],
    quickActions: [
      'add-employee',
      'bulk-onboard',
      'ergani-submit',
      'generate-reports',
      'view-audit-log',
    ],
  },

  manager: {
    role: 'manager',
    defaultRoute: '/punches',
    primarySections: ['dashboard', 'time', 'people', 'analytics'],
    defaultDashboardWidgets: [
      'team-attendance',
      'pending-exceptions',
      'overtime-alerts',
      'schedule-conflicts',
      'department-costs',
    ],
    quickActions: [
      'approve-overtime',
      'resolve-exceptions',
      'view-schedules',
      'team-reports',
      'approve-leaves',
    ],
    restrictions: ['filings', 'payments', 'accounting'],
  },

  'compliance-auditor': {
    role: 'compliance-auditor',
    defaultRoute: '/filings',
    primarySections: ['dashboard', 'filings', 'help-audit', 'analytics'],
    defaultDashboardWidgets: [
      'compliance-score',
      'filing-status',
      'audit-alerts',
      'inspector-readiness',
      'regulation-updates',
    ],
    quickActions: [
      'inspector-pack',
      'audit-trail',
      'compliance-report',
      'filing-history',
      'regulation-check',
    ],
  },

  employee: {
    role: 'employee',
    defaultRoute: '/employee-portal',
    primarySections: ['employee-portal'],
    defaultDashboardWidgets: [
      'my-payslip',
      'time-summary',
      'leave-balance',
      'digital-card',
      'pending-requests',
    ],
    quickActions: [
      'view-payslip',
      'request-leave',
      'clock-in-out',
      'view-schedule',
      'submit-request',
    ],
    restrictions: ['payroll', 'filings', 'payments', 'accounting', 'settings'],
  },
};

export function getUserRole(user: User | undefined): UserRole {
  if (!user) return 'employee';

  // Extract role from user data or determine based on permissions
  // This is a simplified example - in practice, roles would be stored in user profile
  const userEmail = user.email?.toLowerCase() || '';

  if (userEmail.includes('payroll') || userEmail.includes('finance')) {
    return 'payroll-admin';
  }
  if (userEmail.includes('hr') || userEmail.includes('human')) {
    return 'hr';
  }
  if (userEmail.includes('manager') || userEmail.includes('supervisor')) {
    return 'manager';
  }
  if (userEmail.includes('audit') || userEmail.includes('compliance')) {
    return 'compliance-auditor';
  }

  return 'employee';
}

export function getRoleConfiguration(role: UserRole): RoleBasedView {
  return ROLE_CONFIGURATIONS[role];
}

export function getDefaultRouteForRole(role: UserRole): string {
  return ROLE_CONFIGURATIONS[role].defaultRoute;
}

export function canAccessSection(role: UserRole, sectionId: string): boolean {
  const config = ROLE_CONFIGURATIONS[role];

  // If there are restrictions, check them first
  if (config.restrictions?.includes(sectionId)) {
    return false;
  }

  // For employee role, only allow specified sections
  if (role === 'employee') {
    return config.primarySections.includes(sectionId);
  }

  // Other roles can access most sections unless restricted
  return true;
}

export function getQuickActionsForRole(role: UserRole): string[] {
  return ROLE_CONFIGURATIONS[role].quickActions;
}

export function getDashboardWidgetsForRole(role: UserRole): string[] {
  return ROLE_CONFIGURATIONS[role].defaultDashboardWidgets;
}

export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    'payroll-admin': 'Payroll Administrator',
    hr: 'HR Manager',
    manager: 'Department Manager',
    'compliance-auditor': 'Compliance & Auditor',
    employee: 'Employee',
  };
  return names[role];
}
