import {
  employees,
  payrollRecords,
  collectiveAgreements,
  users,
  type Employee,
  type InsertEmployee,
  type PayrollRecord,
  type InsertPayrollRecord,
  type CollectiveAgreement,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, or } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Employee operations
  getEmployees(search?: string, department?: string, position?: string): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByAfm(afm: string): Promise<Employee | undefined>;
  getEmployeeByAmka(amka: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;

  // Payroll operations
  getPayrollRecords(employeeId?: string, month?: string): Promise<PayrollRecord[]>;
  getPayrollRecord(id: string): Promise<PayrollRecord | undefined>;
  createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord>;
  updatePayrollRecord(id: string, record: Partial<InsertPayrollRecord>): Promise<PayrollRecord>;

  // Collective agreements
  getCollectiveAgreements(): Promise<CollectiveAgreement[]>;
  getCollectiveAgreement(id: string): Promise<CollectiveAgreement | undefined>;
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

  // Employee operations
  async getEmployees(search?: string, department?: string, position?: string): Promise<Employee[]> {
    let query = db.select().from(employees);
    
    const conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(employees.firstName, `%${search}%`),
          like(employees.lastName, `%${search}%`),
          like(employees.afm, `%${search}%`)
        )
      );
    }
    
    if (department && department !== "all") {
      conditions.push(eq(employees.department, department));
    }
    
    if (position && position !== "all") {
      conditions.push(eq(employees.position, position));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByAfm(afm: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.afm, afm));
    return employee;
  }

  async getEmployeeByAmka(amka: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.amka, amka));
    return employee;
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values({
        ...employeeData,
        employeeNumber: await this.generateEmployeeNumber(),
      })
      .returning();
    return employee;
  }

  async updateEmployee(id: string, employeeData: Partial<InsertEmployee>): Promise<Employee> {
    const [employee] = await db
      .update(employees)
      .set({
        ...employeeData,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))
      .returning();
    return employee;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  // Payroll operations
  async getPayrollRecords(employeeId?: string, month?: string): Promise<PayrollRecord[]> {
    let query = db.select().from(payrollRecords);
    
    const conditions = [];
    
    if (employeeId) {
      conditions.push(eq(payrollRecords.employeeId, employeeId));
    }
    
    if (month) {
      conditions.push(eq(payrollRecords.payrollMonth, month));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(payrollRecords.createdAt));
  }

  async getPayrollRecord(id: string): Promise<PayrollRecord | undefined> {
    const [record] = await db.select().from(payrollRecords).where(eq(payrollRecords.id, id));
    return record;
  }

  async createPayrollRecord(recordData: InsertPayrollRecord): Promise<PayrollRecord> {
    const [record] = await db.insert(payrollRecords).values(recordData).returning();
    return record;
  }

  async updatePayrollRecord(id: string, recordData: Partial<InsertPayrollRecord>): Promise<PayrollRecord> {
    const [record] = await db
      .update(payrollRecords)
      .set({
        ...recordData,
        updatedAt: new Date(),
      })
      .where(eq(payrollRecords.id, id))
      .returning();
    return record;
  }

  // Collective agreements
  async getCollectiveAgreements(): Promise<CollectiveAgreement[]> {
    return await db.select().from(collectiveAgreements).orderBy(desc(collectiveAgreements.createdAt));
  }

  async getCollectiveAgreement(id: string): Promise<CollectiveAgreement | undefined> {
    const [agreement] = await db.select().from(collectiveAgreements).where(eq(collectiveAgreements.id, id));
    return agreement;
  }

  // Helper methods
  private async generateEmployeeNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const employees = await db.select().from(employees);
    const nextNumber = employees.length + 1;
    return `EMP${currentYear}${nextNumber.toString().padStart(4, '0')}`;
  }
}

export const storage = new DatabaseStorage();
