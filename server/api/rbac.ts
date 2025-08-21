import { Router } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { isAuthenticated } from '../replitAuth';
import { rbacService } from '../security/rbacService';
import { storage } from '../storage';

const router = Router();

// RBAC service is imported as a singleton

// Validation schemas
const assignRoleSchema = z.object({
  userId: z.string(),
  role: z.string(),
  propertyId: z.string().optional(),
  expiresAt: z.string().optional(),
});

const impersonateSchema = z.object({
  targetUserId: z.string(),
  reason: z.string(),
  durationMinutes: z.number().default(60).refine(val => val <= 480, {
    message: "Duration cannot exceed 8 hours (480 minutes)"
  }),
});

// Admin routes - require elevated permissions
router.get('/admin/users', isAuthenticated, async (req: any, res) => {
  try {
    // Check if user has admin permissions
    const canManageUsers = await rbacService.hasPermission(
      req.user.claims.sub,
      'users',
      'manage'
    );

    if (!canManageUsers) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Fetch all users with their roles
    const users = await storage.getAllUsersWithRoles();
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/admin/system-roles', isAuthenticated, async (req: any, res) => {
  try {
    // Check if user has admin permissions
    const canViewRoles = await rbacService.hasPermission(
      req.user.claims.sub,
      'roles',
      'read'
    );

    if (!canViewRoles) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get system roles
    const systemRoles = rbacService.getSystemRoles();
    
    res.json(systemRoles);
  } catch (error) {
    console.error('Error fetching system roles:', error);
    res.status(500).json({ error: 'Failed to fetch system roles' });
  }
});

router.post('/admin/assign-role', isAuthenticated, async (req: any, res) => {
  try {
    // Validate request body
    const validation = assignRoleSchema.safeParse(req.body);
    if (!validation.success) {
      const readableError = fromZodError(validation.error);
      return res.status(400).json({ error: readableError.message });
    }

    const { userId, role, propertyId, expiresAt } = validation.data;

    // Check if user has permission to assign roles
    const canAssignRoles = await rbacService.hasPermission(
      req.user.claims.sub,
      'roles',
      'manage'
    );

    if (!canAssignRoles) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Assign the role
    const roleAssignment = await storage.assignUserRole({
      userId,
      role,
      propertyId,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      grantedBy: req.user.claims.sub,
    });

    res.json({ success: true, roleAssignment });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

router.delete('/admin/revoke-role/:roleAssignmentId', isAuthenticated, async (req: any, res) => {
  try {
    const { roleAssignmentId } = req.params;

    // Check if user has permission to revoke roles
    const canRevokeRoles = await rbacService.hasPermission(
      req.user.claims.sub,
      'roles',
      'manage'
    );

    if (!canRevokeRoles) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Revoke the role
    await storage.revokeUserRole(roleAssignmentId, req.user.claims.sub);

    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking role:', error);
    res.status(500).json({ error: 'Failed to revoke role' });
  }
});

router.post('/admin/impersonate', isAuthenticated, async (req: any, res) => {
  try {
    // Validate request body
    const validation = impersonateSchema.safeParse(req.body);
    if (!validation.success) {
      const readableError = fromZodError(validation.error);
      return res.status(400).json({ error: readableError.message });
    }

    const { targetUserId, reason, durationMinutes } = validation.data;

    // Check if user has impersonation permissions
    const canImpersonate = await rbacService.hasPermission(
      req.user.claims.sub,
      'users',
      'impersonate'
    );

    if (!canImpersonate) {
      return res.status(403).json({ error: 'Insufficient permissions to impersonate users' });
    }

    // Create impersonation session
    const impersonationSession = await storage.createImpersonationSession({
      impersonatorUserId: req.user.claims.sub,
      targetUserId,
      reason,
      durationMinutes,
    });

    // Generate session token (in a real implementation, this would be a JWT or similar)
    const sessionToken = `imp_${impersonationSession.id}_${Date.now()}`;

    res.json({
      success: true,
      sessionToken,
      expiresAt: impersonationSession.expiresAt,
    });
  } catch (error) {
    console.error('Error starting impersonation:', error);
    res.status(500).json({ error: 'Failed to start impersonation session' });
  }
});

// Employee self-service routes - restricted to own data
router.get('/employee/profile', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get employee profile - only their own data
    const employee = await storage.getEmployeeByUserId(userId);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/employee/profile', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Validate and sanitize profile updates
    const allowedUpdates = [
      'phoneNumber',
      'emergencyContact',
      'emergencyPhone',
      'address'
    ];

    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    // Update employee profile
    const updatedEmployee = await storage.updateEmployeeByUserId(userId, updates);
    
    res.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/employee/payslips', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get employee's payslips - only their own
    const payslips = await storage.getEmployeePayslips(userId);
    
    res.json(payslips);
  } catch (error) {
    console.error('Error fetching employee payslips:', error);
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

router.get('/employee/payslips/:payslipId/download', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { payslipId } = req.params;
    
    // Verify payslip belongs to the user
    const payslip = await storage.getPayslipById(payslipId);
    
    if (!payslip) {
      return res.status(404).json({ error: 'Payslip not found' });
    }

    // Check if payslip belongs to current user
    const employee = await storage.getEmployeeByUserId(userId);
    if (!employee || payslip.employeeId !== employee.employeeId) {
      return res.status(403).json({ error: 'Access denied to this payslip' });
    }

    // Get payslip PDF content
    const pdfContent = await storage.getPayslipPdf(payslipId);
    
    if (!pdfContent) {
      return res.status(404).json({ error: 'Payslip PDF not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslipId}.pdf"`);
    res.send(pdfContent);
  } catch (error) {
    console.error('Error downloading payslip:', error);
    res.status(500).json({ error: 'Failed to download payslip' });
  }
});

router.get('/employee/time-entries', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Get employee's time entries - only their own
    const timeEntries = await storage.getEmployeeTimeEntries(userId);
    
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching employee time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Utility route to check permissions
router.post('/check-permission', isAuthenticated, async (req: any, res) => {
  try {
    const { resource, action, propertyId } = req.body;
    const userId = req.user.claims.sub;

    const hasPermission = await rbacService.hasPermission(
      userId,
      resource,
      action,
      propertyId
    );

    res.json({ hasPermission });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
});

// Get user's effective permissions
router.get('/permissions', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    const permissions = await rbacService.getUserEffectivePermissions(userId);
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

export default router;