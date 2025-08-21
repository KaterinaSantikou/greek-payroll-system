/**
 * Acceptance Tests for User Management and Employee Portal
 * Tests all BDD acceptance criteria (AC1-AC5)
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../server/index';
import PayslipService from '../../server/services/PayslipService';
import ImpersonationService from '../../server/services/ImpersonationService';

// Mock test data
const testEmployee = {
  id: 'EMP-001',
  email: 'employee@hotel.gr',
  firstName: 'Maria',
  lastName: 'Papadakis',
  employeeId: 'EMP-001'
};

const testAdmin = {
  id: 'ADMIN-001',
  email: 'admin@hotel.gr',
  firstName: 'John',
  lastName: 'Admin',
  role: 'admin'
};

// Helper function to create auth token
function createAuthToken(user: any, overrides: any = {}): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role || 'employee',
    tenant_id: 'test-tenant',
    employee_id: user.employeeId || user.id,
    property_ids: ['prop-test'],
    permissions: user.role === 'admin' 
      ? ['manage_users', 'impersonate_users', 'view_payslips']
      : ['view_payslips'],
    session_id: 'test-session',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret');
}

describe('AC1 — Invite & first login', () => {
  test('should create user with employee role scoped to their employee_id', async () => {
    const adminToken = createAuthToken(testAdmin);
    
    // Admin sends invite
    const inviteResponse = await request(app)
      .post('/api/admin/invite-user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'e@example.com',
        firstName: 'New',
        lastName: 'Employee',
        role: 'employee',
        employeeId: 'EMP-002'
      });
    
    expect(inviteResponse.status).toBe(201);
    expect(inviteResponse.body).toMatchObject({
      success: true,
      message: expect.stringContaining('invitation sent')
    });
    
    // Simulate employee accepting invite and logging in
    const employeeToken = createAuthToken({
      id: 'EMP-002',
      email: 'e@example.com',
      role: 'employee',
      employeeId: 'EMP-002'
    });
    
    // Employee should only see their own payslips
    const payslipsResponse = await request(app)
      .get('/api/employee/payslips')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(payslipsResponse.status).toBe(200);
    // Verify all returned payslips belong to this employee
    payslipsResponse.body.forEach((payslip: any) => {
      expect(payslip.employeeId).toBe('EMP-002');
    });
  });
  
  test('should reject access to other employee payslips', async () => {
    const employeeToken = createAuthToken(testEmployee);
    
    // Try to access another employee's payslips
    const response = await request(app)
      .get('/api/employee/EMP-999/payslips')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('scope violation');
  });
});

describe('AC2 — Impersonate (read-only)', () => {
  test('should create impersonation session with banner and disabled writes', async () => {
    const adminToken = createAuthToken(testAdmin);
    
    // Admin starts impersonation
    const impersonateResponse = await request(app)
      .post('/api/admin/impersonate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetUserId: testEmployee.id,
        reason: 'Troubleshooting payslip access issue for employee'
      });
    
    expect(impersonateResponse.status).toBe(200);
    expect(impersonateResponse.body).toMatchObject({
      sessionToken: expect.any(String),
      impersonationData: {
        adminUserId: testAdmin.id,
        targetEmployeeId: testEmployee.id,
        reason: expect.stringContaining('Troubleshooting')
      }
    });
    
    const impersonationToken = impersonateResponse.body.sessionToken;
    
    // Verify token carries as_employee_id
    const decoded = jwt.verify(impersonationToken, process.env.JWT_SECRET || 'dev-secret') as any;
    expect(decoded.as_employee_id).toBe(testEmployee.id);
    expect(decoded.act).toBe('impersonate');
    
    // Verify read access works
    const readResponse = await request(app)
      .get('/api/employee/profile')
      .set('Authorization', `Bearer ${impersonationToken}`);
    
    expect(readResponse.status).toBe(200);
    
    // Verify write operations are blocked
    const writeResponse = await request(app)
      .put('/api/employee/profile')
      .set('Authorization', `Bearer ${impersonationToken}`)
      .send({ firstName: 'Modified' });
    
    expect(writeResponse.status).toBe(403);
    expect(writeResponse.body.error).toContain('Write operations restricted during impersonation');
  });
  
  test('should audit impersonation start/stop events', async () => {
    const adminToken = createAuthToken(testAdmin);
    
    // Start impersonation
    const startResponse = await request(app)
      .post('/api/admin/impersonate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetUserId: testEmployee.id,
        reason: 'Testing audit logging for impersonation'
      });
    
    expect(startResponse.status).toBe(200);
    
    const sessionId = startResponse.body.impersonationData.sessionId;
    
    // End impersonation
    const endResponse = await request(app)
      .post('/api/admin/end-impersonation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sessionId });
    
    expect(endResponse.status).toBe(200);
    
    // Verify audit logs contain impersonation events
    const auditResponse = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ eventType: 'impersonation' });
    
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'impersonation',
          action: 'impersonation_start',
          asEmployeeId: testEmployee.id
        }),
        expect.objectContaining({
          eventType: 'impersonation',
          action: 'impersonation_end',
          asEmployeeId: testEmployee.id
        })
      ])
    );
  });
});

describe('AC3 — Access window after termination', () => {
  test('should allow terminated employee read-only access within window', async () => {
    const terminatedEmployeeToken = createAuthToken(testEmployee);
    
    // Simulate terminated employee with access until 2025-12-31
    const response = await request(app)
      .get('/api/employee/payslips')
      .set('Authorization', `Bearer ${terminatedEmployeeToken}`)
      .set('X-Access-Until', '2025-12-31')
      .set('X-Current-Date', '2025-11-01'); // Mock current date
    
    expect(response.status).toBe(200);
    
    // Should be able to download payslips
    const downloadResponse = await request(app)
      .get('/api/employee/payslips/pay-001/download')
      .set('Authorization', `Bearer ${terminatedEmployeeToken}`)
      .set('X-Access-Until', '2025-12-31')
      .set('X-Current-Date', '2025-11-01');
    
    expect(downloadResponse.status).toBe(200);
    
    // Should NOT be able to edit profile
    const editResponse = await request(app)
      .put('/api/employee/profile')
      .set('Authorization', `Bearer ${terminatedEmployeeToken}`)
      .set('X-Access-Until', '2025-12-31')
      .set('X-Current-Date', '2025-11-01')
      .send({ firstName: 'Updated' });
    
    expect(editResponse.status).toBe(403);
    expect(editResponse.body.error).toContain('Write operations not allowed for terminated employees');
  });
  
  test('should deny access after termination window expires', async () => {
    const terminatedEmployeeToken = createAuthToken(testEmployee);
    
    const response = await request(app)
      .get('/api/employee/payslips')
      .set('Authorization', `Bearer ${terminatedEmployeeToken}`)
      .set('X-Access-Until', '2025-12-31')
      .set('X-Current-Date', '2026-01-01'); // After access window
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Access period expired');
  });
});

describe('AC4 — Latest payslip selection', () => {
  test('should return finalized payslip when available', async () => {
    const employeeToken = createAuthToken(testEmployee);
    
    // Mock finalized payslip exists
    jest.spyOn(PayslipService, 'getLatestPayslip')
      .mockResolvedValueOnce({
        payslip: {
          id: 'pay-finalized',
          employeeId: testEmployee.id,
          period: '2024-01',
          status: 'finalized',
          isLatest: true
        } as any,
        isPreview: false
      });
    
    const response = await request(app)
      .get('/api/employee/latest-payslip')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.payslip.status).toBe('finalized');
    expect(response.body.isPreview).toBe(false);
  });
  
  test('should return draft with preview watermark when no finalized exists', async () => {
    const employeeToken = createAuthToken(testEmployee);
    
    // Mock only draft payslip exists
    jest.spyOn(PayslipService, 'getLatestPayslip')
      .mockResolvedValueOnce({
        payslip: {
          id: 'pay-draft',
          employeeId: testEmployee.id,
          period: '2024-01',
          status: 'draft',
          isLatest: true,
          isPreview: true
        } as any,
        isPreview: true,
        previewMessage: 'This is a preview of your draft payslip and may change before finalization'
      });
    
    const response = await request(app)
      .get('/api/employee/latest-payslip')
      .set('Authorization', `Bearer ${employeeToken}`)
      .query({ include_preview: 'true' });
    
    expect(response.status).toBe(200);
    expect(response.body.payslip.status).toBe('draft');
    expect(response.body.isPreview).toBe(true);
    expect(response.body.previewMessage).toContain('preview');
  });
  
  test('should return no payslip message when none available', async () => {
    const employeeToken = createAuthToken(testEmployee);
    
    jest.spyOn(PayslipService, 'getLatestPayslip')
      .mockResolvedValueOnce({
        payslip: null,
        isPreview: false,
        noPayslipMessage: 'No payslip available yet. Your payslip will appear here once processed.'
      });
    
    const response = await request(app)
      .get('/api/employee/latest-payslip')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.payslip).toBeNull();
    expect(response.body.noPayslipMessage).toContain('No payslip available');
  });
});

describe('AC5 — Scope enforcement', () => {
  test('should return 403 and log denied access when accessing other employee data', async () => {
    const employeeToken = createAuthToken(testEmployee);
    
    // Try to access EMP-002's payslip
    const response = await request(app)
      .get('/api/employee/EMP-002/payslips/pay-001')
      .set('Authorization', `Bearer ${employeeToken}`);
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Access denied');
    
    // Verify audit log was created
    const adminToken = createAuthToken(testAdmin);
    const auditResponse = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ 
        eventType: 'access_attempt',
        outcome: 'blocked',
        userId: testEmployee.id
      });
    
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'access_attempt',
          outcome: 'blocked',
          userId: testEmployee.id,
          resource: 'payslips',
          resourceId: 'EMP-002'
        })
      ])
    );
  });
  
  test('should allow admin access to any employee data', async () => {
    const adminToken = createAuthToken(testAdmin);
    
    // Admin should be able to access any employee's payslips
    const response = await request(app)
      .get('/api/employee/EMP-002/payslips')
      .set('Authorization', `Bearer ${adminToken}`);
    
    // Should succeed (200) or return empty array, but not 403
    expect(response.status).not.toBe(403);
  });
});

describe('E2E Smoke Test: Invite → Accept → See Payslip → Admin View-As → Exit', () => {
  test('complete user journey', async () => {
    const adminToken = createAuthToken(testAdmin);
    
    // 1. Admin sends invite
    const inviteResponse = await request(app)
      .post('/api/admin/invite-user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newuser@hotel.gr',
        firstName: 'New',
        lastName: 'User',
        role: 'employee',
        employeeId: 'EMP-NEW'
      });
    
    expect(inviteResponse.status).toBe(201);
    
    // 2. Employee accepts invite (simulated by creating token)
    const newEmployeeToken = createAuthToken({
      id: 'EMP-NEW',
      email: 'newuser@hotel.gr',
      role: 'employee',
      employeeId: 'EMP-NEW'
    });
    
    // 3. Employee sees their payslip
    const payslipResponse = await request(app)
      .get('/api/employee/latest-payslip')
      .set('Authorization', `Bearer ${newEmployeeToken}`);
    
    expect(payslipResponse.status).toBe(200);
    
    // 4. Admin starts impersonation
    const impersonateResponse = await request(app)
      .post('/api/admin/impersonate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        targetUserId: 'EMP-NEW',
        reason: 'Helping new employee understand payslip system'
      });
    
    expect(impersonateResponse.status).toBe(200);
    
    const impersonationToken = impersonateResponse.body.sessionToken;
    
    // 5. Admin views as employee
    const impersonatedViewResponse = await request(app)
      .get('/api/employee/latest-payslip')
      .set('Authorization', `Bearer ${impersonationToken}`);
    
    expect(impersonatedViewResponse.status).toBe(200);
    
    // 6. Admin exits impersonation
    const exitResponse = await request(app)
      .post('/api/admin/end-impersonation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 
        sessionId: impersonateResponse.body.impersonationData.sessionId 
      });
    
    expect(exitResponse.status).toBe(200);
    
    // 7. Verify audit trail exists for the complete journey
    const auditResponse = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ 
        userId: testAdmin.id,
        resourceId: 'EMP-NEW'
      });
    
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.events.length).toBeGreaterThan(0);
  });
});

// Test helpers and mocks
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});