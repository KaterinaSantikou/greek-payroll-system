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
import { db } from "./db";
import { eq, like, and, desc, or, gte, lte, between, sql } from "drizzle-orm";

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
          like(employees.afm, `%${search}%`),
          like(employees.role, `%${search}%`)
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
}

export const storage = new DatabaseStorage();
