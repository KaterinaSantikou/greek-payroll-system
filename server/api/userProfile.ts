import { Express } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";

export function registerUserProfileRoutes(app: Express) {

  // Get user profile with role and permissions
  app.get("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Determine user role based on email domain or other criteria
      // This is a simplified role assignment - in a real system,
      // you'd have a proper role management system
      const userRole = determineUserRole(user.email || '', user.firstName || '');
      
      const userProfile = {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
        role: userRole,
        department: getDepartmentForUser(user.email || ''),
        propertyId: getDefaultPropertyForUser(user.email || ''),
        permissions: getPermissionsForRole(userRole)
      };

      res.json(userProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update user preferences
  app.post("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { landingPage, theme, notifications } = req.body;

      // In a real system, you'd store these preferences in a user_preferences table
      // For now, we'll just acknowledge the update
      console.log(`User ${userId} updated preferences:`, { landingPage, theme, notifications });

      res.json({ success: true, message: "Preferences updated" });
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });
}

function determineUserRole(email: string, name: string): 'hr' | 'manager' | 'employee' | 'admin' {
  // Simple role assignment based on email patterns
  // In a real system, this would be stored in the database
  
  if (email.includes('hr@') || email.includes('payroll@')) {
    return 'hr';
  }
  
  if (email.includes('manager@') || name.toLowerCase().includes('manager')) {
    return 'manager';
  }
  
  if (email.includes('admin@') || email.includes('system@')) {
    return 'admin';
  }
  
  return 'employee'; // Default role
}

function getDepartmentForUser(email: string): string | undefined {
  // Example department assignment based on email
  if (email.includes('housekeeping')) return 'Housekeeping';
  if (email.includes('reception')) return 'Front Office';
  if (email.includes('restaurant')) return 'Restaurant';
  if (email.includes('hr')) return 'Human Resources';
  if (email.includes('finance')) return 'Finance';
  
  return undefined;
}

function getDefaultPropertyForUser(email: string): string | undefined {
  // Example property assignment based on email domain or patterns
  if (email.includes('princess')) return 'prop-princess';
  if (email.includes('aegean')) return 'prop-aegean';
  if (email.includes('marpunta')) return 'prop-marpunta';
  
  return undefined;
}

function getPermissionsForRole(role: 'hr' | 'manager' | 'employee' | 'admin'): string[] {
  const permissions: { [key: string]: string[] } = {
    hr: [
      'view_payroll',
      'manage_payroll',
      'view_filings',
      'manage_employees',
      'view_schedules',
      'view_team_analytics'
    ],
    manager: [
      'view_schedules',
      'manage_schedules',
      'approve_overtime',
      'view_team_analytics',
      'view_payslips', // Can view team payslips
      'manage_team_time'
    ],
    employee: [
      'view_payslips',
      'view_time_logs',
      'submit_leave',
      'view_schedules' // Can view own schedule
    ],
    admin: [
      'manage_properties',
      'view_all_data',
      'manage_users',
      'system_settings',
      'view_payroll',
      'manage_payroll',
      'view_filings',
      'manage_employees',
      'view_schedules',
      'manage_schedules',
      'approve_overtime',
      'view_team_analytics'
    ]
  };

  return permissions[role] || [];
}