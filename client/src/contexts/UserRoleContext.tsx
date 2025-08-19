import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export type UserRole = 'hr' | 'manager' | 'employee' | 'admin';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  propertyId?: string;
  permissions: string[];
}

interface UserRoleContextType {
  userProfile: UserProfile | null;
  userRole: UserRole | null;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  getRoleBasedLandingPage: () => string;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

interface UserRoleProviderProps {
  children: ReactNode;
}

export function UserRoleProvider({ children }: UserRoleProviderProps) {
  const { user, isAuthenticated } = useAuth();
  
  const { data: userProfile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
    enabled: isAuthenticated && !!user,
  });

  const hasPermission = (permission: string): boolean => {
    return userProfile?.permissions.includes(permission) || false;
  };

  const getRoleBasedLandingPage = (): string => {
    if (!userProfile) return '/';
    
    switch (userProfile.role) {
      case 'hr':
        return '/payroll'; // HR sees filings & payroll modules first
      case 'manager':
        return '/schedules'; // Managers land on schedules/approvals
      case 'employee':
        return '/employee-self-service'; // Employees land on payslips & time logs
      case 'admin':
        return '/property-dashboard'; // Admins get full property dashboard
      default:
        return '/';
    }
  };

  const value: UserRoleContextType = {
    userProfile: userProfile || null,
    userRole: userProfile?.role || null,
    isLoading,
    hasPermission,
    getRoleBasedLandingPage,
  };

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}

// Permission constants for easy reference
export const PERMISSIONS = {
  // HR Permissions
  VIEW_PAYROLL: 'view_payroll',
  MANAGE_PAYROLL: 'manage_payroll',
  VIEW_FILINGS: 'view_filings',
  MANAGE_EMPLOYEES: 'manage_employees',
  
  // Manager Permissions
  VIEW_SCHEDULES: 'view_schedules',
  MANAGE_SCHEDULES: 'manage_schedules',
  APPROVE_OVERTIME: 'approve_overtime',
  VIEW_TEAM_ANALYTICS: 'view_team_analytics',
  
  // Employee Permissions
  VIEW_PAYSLIPS: 'view_payslips',
  VIEW_TIME_LOGS: 'view_time_logs',
  SUBMIT_LEAVE: 'submit_leave',
  
  // Admin Permissions
  MANAGE_PROPERTIES: 'manage_properties',
  VIEW_ALL_DATA: 'view_all_data',
  MANAGE_USERS: 'manage_users',
  SYSTEM_SETTINGS: 'system_settings',
} as const;