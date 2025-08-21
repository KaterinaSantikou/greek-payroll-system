import {
  users,
  properties,
  employees,
  shifts,
  punchEvents,
  exceptions,
  timesheets,
  wageComponents,
  departments,
  paycheckHistory,
  payrollLines,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Employee,
  type InsertEmployee,
  type Shift,
  type InsertShift,
  type PunchEvent,
  type InsertPunchEvent,
  type Exception,
  type InsertException,
  type Timesheet,
  type InsertTimesheet,
  type WageComponent,
  type InsertWageComponent,
  type Department,
  type InsertDepartment,
} from "@shared/schema";

// Additional payroll-related types
type PaycheckHistory = typeof paycheckHistory.$inferSelect;
type PayrollLine = typeof payrollLines.$inferSelect;
import { db } from "./db";
import { eq, like, and, desc, or, gte, lte, between, sql, lt } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Property operations
  getProperties(): Promise<Property[]>;
  getProperty(propertyId: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(propertyId: string, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(propertyId: string): Promise<void>;

  // Employee operations
  getEmployees(search?: string, propertyId?: string): Promise<Employee[]>;
  getEmployee(employeeId: string): Promise<Employee | undefined>;
  getEmployeeByAfm(afm: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(employeeId: string, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(employeeId: string): Promise<void>;

  // Shift operations
  getShifts(employeeId?: string, propertyId?: string, startDate?: Date, endDate?: Date): Promise<Shift[]>;
  getShift(shiftId: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(shiftId: string, shift: Partial<InsertShift>): Promise<Shift>;
  deleteShift(shiftId: string): Promise<void>;

  // Punch Event operations
  getPunchEvents(employeeId?: string, propertyId?: string, startDate?: Date, endDate?: Date): Promise<PunchEvent[]>;
  getPunchEvent(eventId: string): Promise<PunchEvent | undefined>;
  createPunchEvent(punchEvent: InsertPunchEvent): Promise<PunchEvent>;
  updatePunchEvent(eventId: string, punchEvent: Partial<InsertPunchEvent>): Promise<PunchEvent>;
  
  // Additional punch event methods for offline-first mobile support
  findPunchEventByClientId(clientEventId: string): Promise<PunchEvent | undefined>;
  findSimilarPunchEvents(employeeId: string, timestamp: Date, type: string, windowMinutes: number): Promise<PunchEvent[]>;
  updatePunchEventByClientId(clientEventId: string, punchEvent: Partial<InsertPunchEvent>): Promise<PunchEvent>;
  getLastPunchEvent(employeeId: string): Promise<PunchEvent | undefined>;
  getEmployeesByProperty(propertyId: string): Promise<Employee[]>;
  getTimesheetsByEmployeeAndPeriod(employeeId: string, payPeriod: string): Promise<Timesheet[]>;

  // Exception operations
  getExceptions(employeeId?: string, propertyId?: string, status?: string): Promise<Exception[]>;
  getException(exceptionId: string): Promise<Exception | undefined>;
  createException(exception: InsertException): Promise<Exception>;
  updateException(exceptionId: string, exception: Partial<InsertException>): Promise<Exception>;
  resolveException(exceptionId: string, resolvedBy: string, resolutionCode: string, comments?: string): Promise<Exception>;

  // Timesheet operations
  getTimesheets(employeeId?: string, periodStart?: Date, periodEnd?: Date, payrollStatus?: string): Promise<Timesheet[]>;
  getTimesheet(timesheetId: string): Promise<Timesheet | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(timesheetId: string, timesheet: Partial<InsertTimesheet>): Promise<Timesheet>;
  updateTimesheetPayrollStatus(timesheetId: string, status: string): Promise<Timesheet>;

  // Wage component operations
  getWageComponents(employeeId: string): Promise<WageComponent[]>;
  createWageComponent(wageComponent: InsertWageComponent): Promise<WageComponent>;
  updateWageComponent(componentId: string, wageComponent: Partial<InsertWageComponent>): Promise<WageComponent>;

  // Department operations
  getDepartments(propertyId?: string): Promise<Department[]>;
  getDepartment(departmentId: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(departmentId: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(departmentId: string): Promise<void>;

  // Paycheck history operations
  getPaycheckHistory(paycheckId: string): Promise<PaycheckHistory | undefined>;
  getPaycheckHistoryByEmployee(employeeId: string): Promise<PaycheckHistory[]>;
  
  // Payroll lines operations  
  getPayrollLinesByPaycheck(paycheckId: string): Promise<PayrollLine[]>;

  // Approval context and actions for Slack/Teams approvals
  createApprovalContext(context: any): Promise<any>;
  getApprovalContext(id: string): Promise<any | undefined>;
  updateApprovalContext(id: string, updates: any): Promise<any>;
  createApprovalAction(action: any): Promise<any>;
  getApprovalActions(approvalId: string): Promise<any[]>;

  // RBAC and User Management operations
  getAllUsersWithRoles(): Promise<any[]>;
  assignUserRole(assignment: {
    userId: string;
    role: string;
    propertyId?: string;
    expiresAt?: Date;
    grantedBy: string;
  }): Promise<any>;
  revokeUserRole(roleAssignmentId: string, revokedBy: string): Promise<void>;
  createImpersonationSession(session: {
    impersonatorUserId: string;
    targetUserId: string;
    reason: string;
    durationMinutes: number;
  }): Promise<any>;

  // Employee self-service operations
  getEmployeeByUserId(userId: string): Promise<Employee | undefined>;
  updateEmployeeByUserId(userId: string, updates: Partial<Employee>): Promise<Employee>;
  getEmployeePayslips(userId: string): Promise<any[]>;
  getPayslipById(payslipId: string): Promise<any>;
  getPayslipPdf(payslipId: string): Promise<Buffer | null>;
  getEmployeeTimeEntries(userId: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Property operations
  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getProperty(propertyId: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.propertyId, propertyId));
    return property;
  }

  async createProperty(propertyData: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values(propertyData).returning();
    return property;
  }

  async updateProperty(propertyId: string, propertyData: Partial<InsertProperty>): Promise<Property> {
    const [property] = await db
      .update(properties)
      .set({
        ...propertyData,
        updatedAt: new Date(),
      })
      .where(eq(properties.propertyId, propertyId))
      .returning();
    return property;
  }

  async deleteProperty(propertyId: string): Promise<void> {
    await db.delete(properties).where(eq(properties.propertyId, propertyId));
  }

  // Employee operations
  async getEmployees(search?: string, propertyId?: string): Promise<Employee[]> {
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(employees.name, `%${search}%`),
          like(employees.afm, `%${search}%`)
        )
      );
    }
    
    if (propertyId && propertyId !== "all") {
      conditions.push(eq(employees.defaultPropertyId, propertyId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(employees).where(and(...conditions)).orderBy(desc(employees.createdAt));
    }
    
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getEmployee(employeeId: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeId, employeeId));
    return employee;
  }

  async getEmployeeByAfm(afm: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.afm, afm));
    return employee;
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(employeeData).returning();
    return employee;
  }

  async updateEmployee(employeeId: string, employeeData: Partial<InsertEmployee>): Promise<Employee> {
    const [employee] = await db
      .update(employees)
      .set({
        ...employeeData,
        updatedAt: new Date(),
      })
      .where(eq(employees.employeeId, employeeId))
      .returning();
    return employee;
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    await db.delete(employees).where(eq(employees.employeeId, employeeId));
  }

  // Shift operations
  async getShifts(employeeId?: string, propertyId?: string, startDate?: Date, endDate?: Date): Promise<Shift[]> {
    const conditions = [];
    
    if (employeeId) {
      conditions.push(eq(shifts.employeeId, employeeId));
    }
    
    if (propertyId) {
      conditions.push(eq(shifts.propertyId, propertyId));
    }
    
    if (startDate) {
      conditions.push(gte(shifts.startPlanned, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(shifts.endPlanned, endDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(shifts).where(and(...conditions)).orderBy(desc(shifts.startPlanned));
    }
    
    return await db.select().from(shifts).orderBy(desc(shifts.startPlanned));
  }

  async getShift(shiftId: string): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.shiftId, shiftId));
    return shift;
  }

  async createShift(shiftData: InsertShift): Promise<Shift> {
    const [shift] = await db.insert(shifts).values(shiftData).returning();
    return shift;
  }

  async updateShift(shiftId: string, shiftData: Partial<InsertShift>): Promise<Shift> {
    const [shift] = await db
      .update(shifts)
      .set({
        ...shiftData,
        updatedAt: new Date(),
      })
      .where(eq(shifts.shiftId, shiftId))
      .returning();
    return shift;
  }

  async deleteShift(shiftId: string): Promise<void> {
    await db.delete(shifts).where(eq(shifts.shiftId, shiftId));
  }

  // Punch Event operations
  async getPunchEvents(employeeId?: string, propertyId?: string, startDate?: Date, endDate?: Date): Promise<PunchEvent[]> {
    const conditions = [];
    
    if (employeeId) {
      conditions.push(eq(punchEvents.employeeId, employeeId));
    }
    
    if (propertyId) {
      conditions.push(eq(punchEvents.propertyId, propertyId));
    }
    
    if (startDate && endDate) {
      conditions.push(between(punchEvents.timestamp, startDate, endDate));
    } else if (startDate) {
      conditions.push(gte(punchEvents.timestamp, startDate));
    } else if (endDate) {
      conditions.push(lte(punchEvents.timestamp, endDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(punchEvents).where(and(...conditions)).orderBy(desc(punchEvents.timestamp));
    }
    
    return await db.select().from(punchEvents).orderBy(desc(punchEvents.timestamp));
  }

  async getPunchEvent(eventId: string): Promise<PunchEvent | undefined> {
    const [event] = await db.select().from(punchEvents).where(eq(punchEvents.eventId, eventId));
    return event;
  }

  async createPunchEvent(punchEventData: InsertPunchEvent): Promise<PunchEvent> {
    const [event] = await db.insert(punchEvents).values(punchEventData).returning();
    return event;
  }

  async updatePunchEvent(eventId: string, punchEventData: Partial<InsertPunchEvent>): Promise<PunchEvent> {
    const [event] = await db
      .update(punchEvents)
      .set(punchEventData)
      .where(eq(punchEvents.eventId, eventId))
      .returning();
    return event;
  }

  // Additional punch event methods for offline-first mobile support
  async findPunchEventByClientId(clientEventId: string): Promise<PunchEvent | undefined> {
    const [event] = await db.select().from(punchEvents).where(eq(punchEvents.clientEventId, clientEventId));
    return event;
  }

  async findSimilarPunchEvents(employeeId: string, timestamp: Date, type: string, windowMinutes: number): Promise<PunchEvent[]> {
    const startWindow = new Date(timestamp.getTime() - windowMinutes * 60 * 1000);
    const endWindow = new Date(timestamp.getTime() + windowMinutes * 60 * 1000);
    
    return await db.select().from(punchEvents).where(
      and(
        eq(punchEvents.employeeId, employeeId),
        eq(punchEvents.type, type),
        between(punchEvents.timestamp, startWindow, endWindow)
      )
    ).orderBy(desc(punchEvents.timestamp));
  }

  async updatePunchEventByClientId(clientEventId: string, punchEventData: Partial<InsertPunchEvent>): Promise<PunchEvent> {
    const [event] = await db
      .update(punchEvents)
      .set(punchEventData)
      .where(eq(punchEvents.clientEventId, clientEventId))
      .returning();
    return event;
  }

  async getLastPunchEvent(employeeId: string): Promise<PunchEvent | undefined> {
    const [event] = await db.select().from(punchEvents)
      .where(eq(punchEvents.employeeId, employeeId))
      .orderBy(desc(punchEvents.timestamp))
      .limit(1);
    return event;
  }

  async getEmployeesByProperty(propertyId: string): Promise<Employee[]> {
    return await db.select().from(employees).where(eq(employees.defaultPropertyId, propertyId));
  }

  async getTimesheetsByEmployeeAndPeriod(employeeId: string, payPeriod: string): Promise<Timesheet[]> {
    // Parse pay period format "YYYY-MM"
    const [year, month] = payPeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    return await db.select().from(timesheets).where(
      and(
        eq(timesheets.employeeId, employeeId),
        between(timesheets.periodStart, startDate, endDate)
      )
    );
  }

  // Exception operations
  async getExceptions(employeeId?: string, propertyId?: string, status?: string): Promise<Exception[]> {
    const conditions = [];
    
    if (employeeId) {
      conditions.push(eq(exceptions.employeeId, employeeId));
    }
    
    if (propertyId) {
      conditions.push(eq(exceptions.propertyId, propertyId));
    }
    
    if (status && status !== "all") {
      conditions.push(eq(exceptions.status, status));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(exceptions).where(and(...conditions)).orderBy(desc(exceptions.detectedAt));
    }
    
    return await db.select().from(exceptions).orderBy(desc(exceptions.detectedAt));
  }

  async getException(exceptionId: string): Promise<Exception | undefined> {
    const [exception] = await db.select().from(exceptions).where(eq(exceptions.exceptionId, exceptionId));
    return exception;
  }

  async createException(exceptionData: InsertException): Promise<Exception> {
    const [exception] = await db.insert(exceptions).values(exceptionData).returning();
    return exception;
  }

  async updateException(exceptionId: string, exceptionData: Partial<InsertException>): Promise<Exception> {
    const [exception] = await db
      .update(exceptions)
      .set({
        ...exceptionData,
        updatedAt: new Date(),
      })
      .where(eq(exceptions.exceptionId, exceptionId))
      .returning();
    return exception;
  }

  async resolveException(exceptionId: string, resolvedBy: string, resolutionCode: string, comments?: string): Promise<Exception> {
    const [exception] = await db
      .update(exceptions)
      .set({
        resolvedBy,
        resolutionCode,
        comments,
        status: "resolved",
        updatedAt: new Date(),
      })
      .where(eq(exceptions.exceptionId, exceptionId))
      .returning();
    return exception;
  }

  // Timesheet operations
  async getTimesheets(employeeId?: string, periodStart?: Date, periodEnd?: Date, payrollStatus?: string): Promise<Timesheet[]> {
    const conditions = [];
    
    if (employeeId) {
      conditions.push(eq(timesheets.employeeId, employeeId));
    }
    
    if (periodStart) {
      conditions.push(gte(timesheets.periodStart, periodStart.toISOString().split('T')[0]));
    }
    
    if (periodEnd) {
      conditions.push(lte(timesheets.periodEnd, periodEnd.toISOString().split('T')[0]));
    }
    
    if (payrollStatus && payrollStatus !== "all") {
      conditions.push(eq(timesheets.payrollStatus, payrollStatus));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(timesheets).where(and(...conditions)).orderBy(desc(timesheets.periodStart));
    }
    
    return await db.select().from(timesheets).orderBy(desc(timesheets.periodStart));
  }

  async getTimesheet(timesheetId: string): Promise<Timesheet | undefined> {
    const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.timesheetId, timesheetId));
    return timesheet;
  }

  async createTimesheet(timesheetData: InsertTimesheet): Promise<Timesheet> {
    const [timesheet] = await db.insert(timesheets).values(timesheetData).returning();
    return timesheet;
  }

  async updateTimesheet(timesheetId: string, timesheetData: Partial<InsertTimesheet>): Promise<Timesheet> {
    const [timesheet] = await db
      .update(timesheets)
      .set({
        ...timesheetData,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.timesheetId, timesheetId))
      .returning();
    return timesheet;
  }

  async updateTimesheetPayrollStatus(timesheetId: string, status: string): Promise<Timesheet> {
    const [timesheet] = await db
      .update(timesheets)
      .set({
        payrollStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.timesheetId, timesheetId))
      .returning();
    return timesheet;
  }

  // Wage component operations
  async getWageComponents(employeeId: string): Promise<WageComponent[]> {
    return await db.select().from(wageComponents)
      .where(eq(wageComponents.employeeId, employeeId))
      .orderBy(desc(wageComponents.effectiveFrom));
  }

  async createWageComponent(wageComponentData: InsertWageComponent): Promise<WageComponent> {
    // End current wage component if creating a new one
    const currentComponents = await this.getWageComponents(wageComponentData.employeeId);
    const activeCurrent = currentComponents.find(c => c.effectiveTo === null);
    
    if (activeCurrent) {
      await db.update(wageComponents)
        .set({ effectiveTo: wageComponentData.effectiveFrom })
        .where(eq(wageComponents.componentId, activeCurrent.componentId));
    }

    const [wageComponent] = await db.insert(wageComponents).values(wageComponentData).returning();
    return wageComponent;
  }

  async updateWageComponent(componentId: string, wageComponentData: Partial<InsertWageComponent>): Promise<WageComponent> {
    const [wageComponent] = await db
      .update(wageComponents)
      .set({
        ...wageComponentData,
        updatedAt: new Date(),
      })
      .where(eq(wageComponents.componentId, componentId))
      .returning();
    return wageComponent;
  }

  // Department operations
  async getDepartments(propertyId?: string): Promise<Department[]> {
    if (propertyId) {
      return await db.select().from(departments)
        .where(eq(departments.propertyId, propertyId))
        .orderBy(departments.name);
    }
    return await db.select().from(departments).orderBy(departments.name);
  }

  async getDepartment(departmentId: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.departmentId, departmentId));
    return department;
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(departmentData).returning();
    return department;
  }

  async updateDepartment(departmentId: string, departmentData: Partial<InsertDepartment>): Promise<Department> {
    const [department] = await db
      .update(departments)
      .set({
        ...departmentData,
        updatedAt: new Date(),
      })
      .where(eq(departments.departmentId, departmentId))
      .returning();
    return department;
  }

  async deleteDepartment(departmentId: string): Promise<void> {
    await db.delete(departments).where(eq(departments.departmentId, departmentId));
  }

  // Paycheck history operations
  async getPaycheckHistory(paycheckId: string): Promise<PaycheckHistory | undefined> {
    const [paycheck] = await db.select().from(paycheckHistory).where(eq(paycheckHistory.paycheckId, paycheckId));
    return paycheck;
  }

  async getPaycheckHistoryByEmployee(employeeId: string): Promise<PaycheckHistory[]> {
    return await db.select().from(paycheckHistory)
      .where(eq(paycheckHistory.employeeId, employeeId))
      .orderBy(desc(paycheckHistory.payPeriodEnd));
  }
  
  // Payroll lines operations  
  async getPayrollLinesByPaycheck(paycheckId: string): Promise<PayrollLine[]> {
    // Note: This assumes payroll lines are linked to paycheck via runId in payslipData or similar
    // For now, return empty array as we need to establish the relationship
    // In a real implementation, you'd join on the appropriate foreign key
    return [];
  }

  // Additional methods for overtime prevention and exception resolution engines
  async getShiftsByEmployeeAndWeek(employeeId: string, weekStarting: string): Promise<Shift[]> {
    const weekStart = new Date(weekStarting);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.employeeId, employeeId),
          gte(shifts.date, weekStart.toISOString().split('T')[0]),
          lt(shifts.date, weekEnd.toISOString().split('T')[0])
        )
      )
      .orderBy(shifts.date, shifts.startPlanned);
  }

  async getPunchEventsByEmployeeAndDate(employeeId: string, date: string): Promise<PunchEvent[]> {
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);
    
    return await db
      .select()
      .from(punchEvents)
      .where(
        and(
          eq(punchEvents.employeeId, employeeId),
          gte(punchEvents.timestamp, startOfDay),
          lte(punchEvents.timestamp, endOfDay)
        )
      )
      .orderBy(punchEvents.timestamp);
  }

  // Approval context and actions operations
  async createApprovalContext(contextData: any): Promise<any> {
    // Mock implementation - in a real app would use db.insert
    return {
      id: contextData.id,
      ...contextData,
      createdAt: new Date(),
    };
  }

  async getApprovalContext(id: string): Promise<any | undefined> {
    // Mock implementation - in a real app would query database
    return null;
  }

  async updateApprovalContext(id: string, updates: any): Promise<any> {
    // Mock implementation - in a real app would use db.update
    return { id, ...updates, updatedAt: new Date() };
  }

  async createApprovalAction(actionData: any): Promise<any> {
    // Mock implementation - in a real app would use db.insert
    return {
      id: Date.now(),
      ...actionData,
      timestamp: new Date(),
    };
  }

  async getApprovalActions(approvalId: string): Promise<any[]> {
    // Mock implementation - in a real app would query database
    return [];
  }

  // RBAC and User Management operations
  async getAllUsersWithRoles(): Promise<any[]> {
    // Mock implementation - would join with user roles tables once DB is ready
    const allUsers = await db.select().from(users);
    return allUsers.map(user => ({
      ...user,
      roles: [], // Would be populated from userRoles table join
      isActive: true,
    }));
  }

  async assignUserRole(assignment: {
    userId: string;
    role: string;
    propertyId?: string;
    expiresAt?: Date;
    grantedBy: string;
  }): Promise<any> {
    // Mock implementation - would insert into userRoles table
    return {
      id: 'role_' + Date.now(),
      ...assignment,
      grantedAt: new Date(),
      isActive: true,
    };
  }

  async revokeUserRole(roleAssignmentId: string, revokedBy: string): Promise<void> {
    // Mock implementation - would update userRoles table to set isActive = false
    console.log(`Role ${roleAssignmentId} revoked by ${revokedBy}`);
  }

  async createImpersonationSession(session: {
    impersonatorUserId: string;
    targetUserId: string;
    reason: string;
    durationMinutes: number;
  }): Promise<any> {
    // Mock implementation - would insert into userImpersonations table
    return {
      id: 'imp_' + Date.now(),
      ...session,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + session.durationMinutes * 60 * 1000),
      isActive: true,
    };
  }

  // Employee self-service operations
  async getEmployeeByUserId(userId: string): Promise<Employee | undefined> {
    // Find employee by matching userId (in real app, there would be a userId field in employees table)
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    // For now, find employee by email match
    const [employee] = await db.select().from(employees).where(eq(employees.email, user.email!));
    return employee;
  }

  async updateEmployeeByUserId(userId: string, updates: Partial<Employee>): Promise<Employee> {
    const employee = await this.getEmployeeByUserId(userId);
    if (!employee) {
      throw new Error('Employee not found for user');
    }
    
    return await this.updateEmployee(employee.employeeId, updates);
  }

  async getEmployeePayslips(userId: string): Promise<any[]> {
    const employee = await this.getEmployeeByUserId(userId);
    if (!employee) return [];
    
    // Mock payslips data - in real app would query payslips table
    return [
      {
        payslipId: 'ps_' + employee.employeeId + '_202412',
        employeeId: employee.employeeId,
        payPeriodStart: '2024-12-01',
        payPeriodEnd: '2024-12-31',
        issueDate: '2025-01-05',
        grossPay: 2400.00,
        netPay: 1820.50,
        totalTax: 384.00,
        totalInsurance: 195.50,
        status: 'paid' as const,
      },
      {
        payslipId: 'ps_' + employee.employeeId + '_202411',
        employeeId: employee.employeeId,
        payPeriodStart: '2024-11-01',
        payPeriodEnd: '2024-11-30',
        issueDate: '2024-12-05',
        grossPay: 2400.00,
        netPay: 1820.50,
        totalTax: 384.00,
        totalInsurance: 195.50,
        status: 'paid' as const,
      },
    ];
  }

  async getPayslipById(payslipId: string): Promise<any> {
    // Mock implementation - would query payslips table
    const employeeId = payslipId.split('_')[1]; // Extract from mock ID format
    return {
      payslipId,
      employeeId,
      payPeriodStart: '2024-12-01',
      payPeriodEnd: '2024-12-31',
      issueDate: '2025-01-05',
      grossPay: 2400.00,
      netPay: 1820.50,
      totalTax: 384.00,
      totalInsurance: 195.50,
      status: 'paid' as const,
    };
  }

  async getPayslipPdf(payslipId: string): Promise<Buffer | null> {
    // Mock implementation - would retrieve PDF from storage
    // For now, return null to indicate PDF not available
    return null;
  }

  async getEmployeeTimeEntries(userId: string): Promise<any[]> {
    const employee = await this.getEmployeeByUserId(userId);
    if (!employee) return [];
    
    // Get recent punch events for this employee
    const recentPunchEvents = await this.getPunchEvents(
      employee.employeeId, 
      undefined, 
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      new Date()
    );
    
    // Group punch events into time entries by date
    const timeEntriesMap = new Map();
    
    for (const punch of recentPunchEvents) {
      const dateStr = punch.timestamp.toISOString().split('T')[0];
      
      if (!timeEntriesMap.has(dateStr)) {
        timeEntriesMap.set(dateStr, {
          id: `entry_${dateStr}_${employee.employeeId}`,
          employeeId: employee.employeeId,
          date: dateStr,
          clockIn: null,
          clockOut: null,
          totalHours: 0,
          overtimeHours: 0,
          status: 'pending' as const,
        });
      }
      
      const entry = timeEntriesMap.get(dateStr);
      if (punch.eventType === 'CLOCK_IN') {
        entry.clockIn = punch.timestamp.toISOString();
      } else if (punch.eventType === 'CLOCK_OUT') {
        entry.clockOut = punch.timestamp.toISOString();
      }
    }
    
    // Calculate hours for entries with both clock in/out
    const entries = Array.from(timeEntriesMap.values());
    for (const entry of entries) {
      if (entry.clockIn && entry.clockOut) {
        const clockInTime = new Date(entry.clockIn);
        const clockOutTime = new Date(entry.clockOut);
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        const hours = diffMs / (1000 * 60 * 60);
        entry.totalHours = Math.round(hours * 100) / 100;
        
        // Mock overtime calculation (over 8 hours)
        if (hours > 8) {
          entry.overtimeHours = Math.round((hours - 8) * 100) / 100;
        }
        
        entry.status = 'approved';
      }
    }
    
    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }
}

export const storage = new DatabaseStorage();
