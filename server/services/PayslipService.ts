/**
 * Payslip Service - Smart latest payslip selection logic for AC4
 * Handles finalized, draft, and preview payslips with proper watermarking
 */
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/accessControl';

export interface Payslip {
  id: string;
  employeeId: string;
  period: string;
  payDate: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  status: 'draft' | 'finalized' | 'archived';
  isLatest?: boolean;
  isPreview?: boolean;
  components: {
    basicSalary: number;
    overtime: number;
    bonus: number;
    socialSecurity: number;
    incomeTax: number;
    other: number;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    approvedBy?: string;
    approvedAt?: string;
  };
}

export interface LatestPayslipResponse {
  payslip: Payslip | null;
  isPreview: boolean;
  previewMessage?: string;
  noPayslipMessage?: string;
}

export class PayslipService {
  
  /**
   * AC4: Smart latest payslip selection
   * Priority: current period finalized → last finalized period → current draft (if include_preview=true)
   */
  static async getLatestPayslip(
    employeeId: string, 
    includePreview: boolean = false
  ): Promise<LatestPayslipResponse> {
    
    try {
      // Get current period (simplified - in real implementation would be from config)
      const currentPeriod = this.getCurrentPayPeriod();
      
      // Step 1: Look for finalized payslip in current period
      let payslip = await this.findPayslipByEmployeeAndPeriod(
        employeeId, 
        currentPeriod, 
        'finalized'
      );
      
      if (payslip) {
        return {
          payslip: { ...payslip, isLatest: true },
          isPreview: false
        };
      }
      
      // Step 2: Look for last finalized payslip (any period)
      payslip = await this.findLastFinalizedPayslip(employeeId);
      
      if (payslip) {
        return {
          payslip: { ...payslip, isLatest: true },
          isPreview: false
        };
      }
      
      // Step 3: Look for current period draft (if preview enabled)
      if (includePreview) {
        payslip = await this.findPayslipByEmployeeAndPeriod(
          employeeId, 
          currentPeriod, 
          'draft'
        );
        
        if (payslip) {
          return {
            payslip: { 
              ...payslip, 
              isLatest: true, 
              isPreview: true 
            },
            isPreview: true,
            previewMessage: 'This is a preview of your draft payslip and may change before finalization'
          };
        }
      }
      
      // No payslip found
      return {
        payslip: null,
        isPreview: false,
        noPayslipMessage: 'No payslip available yet. Your payslip will appear here once processed.'
      };
      
    } catch (error) {
      console.error('Error getting latest payslip:', error);
      throw new Error('Failed to retrieve latest payslip');
    }
  }
  
  /**
   * Get payslips for employee with proper access control
   */
  static async getEmployeePayslips(
    employeeId: string,
    includeArchived: boolean = false
  ): Promise<Payslip[]> {
    try {
      // In real implementation, this would query database
      const mockPayslips: Payslip[] = [
        {
          id: 'pay-001',
          employeeId: employeeId,
          period: '2024-01',
          payDate: '2024-01-31',
          grossPay: 2500,
          deductions: 650,
          netPay: 1850,
          status: 'finalized',
          components: {
            basicSalary: 2000,
            overtime: 300,
            bonus: 200,
            socialSecurity: 350,
            incomeTax: 250,
            other: 50
          },
          metadata: {
            createdAt: '2024-01-25T10:00:00Z',
            updatedAt: '2024-01-31T16:00:00Z',
            createdBy: 'payroll-system',
            approvedBy: 'hr-manager',
            approvedAt: '2024-01-31T16:00:00Z'
          }
        }
      ];
      
      return includeArchived 
        ? mockPayslips 
        : mockPayslips.filter(p => p.status !== 'archived');
        
    } catch (error) {
      console.error('Error getting employee payslips:', error);
      throw new Error('Failed to retrieve payslips');
    }
  }
  
  /**
   * Download payslip with audit logging
   */
  static async downloadPayslip(
    payslipId: string,
    employeeId: string,
    userContext: any
  ): Promise<Buffer> {
    try {
      // Verify employee can access this payslip
      const payslip = await this.findPayslipById(payslipId);
      
      if (!payslip || payslip.employeeId !== employeeId) {
        throw new Error('Payslip not found or access denied');
      }
      
      // Log payslip download for audit
      // auditLogger.logAccessAttempt({
      //   userId: userContext.userId,
      //   userRole: userContext.userRole,
      //   employeeId: userContext.employeeId,
      //   asEmployeeId: userContext.asEmployeeId,
      //   sessionId: userContext.sessionId,
      //   resource: 'payslips',
      //   resourceId: payslipId,
      //   action: 'download',
      //   outcome: 'success',
      //   riskScore: 15,
      //   metadata: userContext.metadata,
      //   details: userContext.details
      // });
      
      // Generate PDF (mock implementation)
      return this.generatePayslipPDF(payslip);
      
    } catch (error) {
      console.error('Error downloading payslip:', error);
      throw new Error('Failed to download payslip');
    }
  }
  
  /**
   * Check if employee can access payslips during termination period (AC3)
   */
  static async checkTerminatedEmployeeAccess(
    employeeId: string,
    accessUntilDate?: string
  ): Promise<{
    canAccess: boolean;
    accessType: 'full' | 'readonly' | 'denied';
    message?: string;
  }> {
    if (!accessUntilDate) {
      return { canAccess: true, accessType: 'full' };
    }
    
    const accessDate = new Date(accessUntilDate);
    const now = new Date();
    
    if (now > accessDate) {
      return {
        canAccess: false,
        accessType: 'denied',
        message: 'Access period has expired'
      };
    }
    
    return {
      canAccess: true,
      accessType: 'readonly',
      message: 'Limited access - view and download only until ' + accessDate.toLocaleDateString()
    };
  }
  
  /**
   * Private helper methods
   */
  private static getCurrentPayPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }
  
  private static async findPayslipByEmployeeAndPeriod(
    employeeId: string,
    period: string,
    status: 'draft' | 'finalized' | 'archived'
  ): Promise<Payslip | null> {
    // Mock implementation - in real app would query database
    console.log(`Looking for ${status} payslip for employee ${employeeId} in period ${period}`);
    
    // Return null to simulate no payslip found
    return null;
  }
  
  private static async findLastFinalizedPayslip(employeeId: string): Promise<Payslip | null> {
    // Mock implementation - would query database for most recent finalized payslip
    console.log(`Looking for last finalized payslip for employee ${employeeId}`);
    
    return {
      id: 'pay-last-001',
      employeeId: employeeId,
      period: '2023-12',
      payDate: '2023-12-31',
      grossPay: 2400,
      deductions: 620,
      netPay: 1780,
      status: 'finalized',
      components: {
        basicSalary: 2000,
        overtime: 200,
        bonus: 200,
        socialSecurity: 340,
        incomeTax: 230,
        other: 50
      },
      metadata: {
        createdAt: '2023-12-25T10:00:00Z',
        updatedAt: '2023-12-31T16:00:00Z',
        createdBy: 'payroll-system',
        approvedBy: 'hr-manager',
        approvedAt: '2023-12-31T16:00:00Z'
      }
    };
  }
  
  private static async findPayslipById(payslipId: string): Promise<Payslip | null> {
    // Mock implementation
    console.log(`Looking for payslip ${payslipId}`);
    return null;
  }
  
  private static generatePayslipPDF(payslip: Payslip): Buffer {
    // Mock PDF generation - in real implementation would use PDF library
    const pdfContent = `
      PAYSLIP - ${payslip.period}
      Employee ID: ${payslip.employeeId}
      Pay Date: ${payslip.payDate}
      
      EARNINGS:
      Basic Salary: €${payslip.components.basicSalary}
      Overtime: €${payslip.components.overtime}
      Bonus: €${payslip.components.bonus}
      Gross Pay: €${payslip.grossPay}
      
      DEDUCTIONS:
      Social Security: €${payslip.components.socialSecurity}
      Income Tax: €${payslip.components.incomeTax}
      Other: €${payslip.components.other}
      Total Deductions: €${payslip.deductions}
      
      NET PAY: €${payslip.netPay}
      
      ${payslip.isPreview ? '*** PREVIEW - SUBJECT TO CHANGE ***' : ''}
    `;
    
    return Buffer.from(pdfContent, 'utf8');
  }
}

export default PayslipService;