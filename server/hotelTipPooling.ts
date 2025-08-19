import type { Express } from "express";
import { z } from "zod";

// Tip pooling role definitions with weights and service multipliers
interface TipRole {
  id: string;
  name: string;
  category: 'service' | 'kitchen' | 'support' | 'management';
  baseWeight: number; // Base allocation weight
  hourlyPoints: number; // Points earned per hour
  shiftPoints: number; // Points earned per shift
  serviceMultiplier: number; // Multiplier for service quality/position
  description: string;
}

// POS outlet configuration for revenue allocation
interface POSOutlet {
  id: string;
  name: string;
  type: 'restaurant' | 'bar' | 'room_service' | 'spa' | 'retail';
  tipPoolPercentage: number; // Percentage of revenue allocated to tip pool
  isActive: boolean;
}

// Tip pool distribution period (daily/weekly/bi-weekly)
interface TipPoolPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  status: 'open' | 'calculating' | 'finalized' | 'paid';
  totalRevenue: number;
  totalTipPool: number;
  totalPoints: number;
  employerTopUp: number;
}

// Individual employee tip allocation
interface TipAllocation {
  employeeId: string;
  roleId: string;
  hoursWorked: number;
  shiftsWorked: number;
  totalPoints: number;
  baseAllocation: number;
  serviceBonus: number;
  employerTopUpShare: number;
  totalAmount: number;
  taxableAmount: number;
  earningsCode: string;
}

// POS revenue import schema
const POSRevenueSchema = z.object({
  outletId: z.string(),
  date: z.string().datetime(),
  grossRevenue: z.number().positive(),
  netRevenue: z.number().positive(),
  serviceCharges: z.number().default(0),
  tips: z.number().default(0),
  transactions: z.number().int().positive(),
});

// Tip pool configuration schema
const TipPoolConfigSchema = z.object({
  distributionFrequency: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly']),
  minimumHours: z.number().positive().default(4), // Minimum hours to qualify
  employerTopUpRate: z.number().min(0).max(1).default(0), // 0-100% employer contribution
  taxEarningsCode: z.string().default('TIP_POOL'),
  serviceBonusThreshold: z.number().default(0.9), // Service score threshold for bonus
  serviceBonusMultiplier: z.number().default(1.2),
});

export class HotelTipPoolingService {
  private tipRoles: Map<string, TipRole> = new Map();
  private posOutlets: Map<string, POSOutlet> = new Map();
  private revenueData: Map<string, any[]> = new Map(); // Date -> Revenue records
  private tipPeriods: Map<string, TipPoolPeriod> = new Map();
  private allocations: Map<string, TipAllocation[]> = new Map(); // Period ID -> Allocations

  constructor() {
    this.initializeDefaultRoles();
    this.initializeDefaultOutlets();
  }

  private initializeDefaultRoles(): void {
    const defaultRoles: TipRole[] = [
      {
        id: 'server_senior',
        name: 'Senior Server',
        category: 'service',
        baseWeight: 1.0,
        hourlyPoints: 12,
        shiftPoints: 8,
        serviceMultiplier: 1.3,
        description: 'Experienced front-of-house service staff'
      },
      {
        id: 'server_junior',
        name: 'Junior Server',
        category: 'service',
        baseWeight: 0.8,
        hourlyPoints: 10,
        shiftPoints: 6,
        serviceMultiplier: 1.0,
        description: 'Entry-level front-of-house service staff'
      },
      {
        id: 'bartender',
        name: 'Bartender',
        category: 'service',
        baseWeight: 1.2,
        hourlyPoints: 14,
        shiftPoints: 10,
        serviceMultiplier: 1.4,
        description: 'Bar service and beverage preparation'
      },
      {
        id: 'sommelier',
        name: 'Sommelier',
        category: 'service',
        baseWeight: 1.5,
        hourlyPoints: 16,
        shiftPoints: 12,
        serviceMultiplier: 1.6,
        description: 'Wine service specialist'
      },
      {
        id: 'chef_de_partie',
        name: 'Chef de Partie',
        category: 'kitchen',
        baseWeight: 0.7,
        hourlyPoints: 8,
        shiftPoints: 5,
        serviceMultiplier: 1.0,
        description: 'Section chef in kitchen'
      },
      {
        id: 'line_cook',
        name: 'Line Cook',
        category: 'kitchen',
        baseWeight: 0.5,
        hourlyPoints: 6,
        shiftPoints: 4,
        serviceMultiplier: 0.8,
        description: 'Kitchen preparation staff'
      },
      {
        id: 'host_hostess',
        name: 'Host/Hostess',
        category: 'support',
        baseWeight: 0.6,
        hourlyPoints: 7,
        shiftPoints: 5,
        serviceMultiplier: 1.0,
        description: 'Guest reception and seating'
      },
      {
        id: 'busser',
        name: 'Busser',
        category: 'support',
        baseWeight: 0.4,
        hourlyPoints: 5,
        shiftPoints: 3,
        serviceMultiplier: 0.7,
        description: 'Table clearing and setup'
      },
      {
        id: 'room_service',
        name: 'Room Service Attendant',
        category: 'service',
        baseWeight: 0.9,
        hourlyPoints: 11,
        shiftPoints: 7,
        serviceMultiplier: 1.1,
        description: 'In-room dining service'
      },
      {
        id: 'shift_manager',
        name: 'Shift Manager',
        category: 'management',
        baseWeight: 1.1,
        hourlyPoints: 10,
        shiftPoints: 15,
        serviceMultiplier: 1.2,
        description: 'Floor management and supervision'
      }
    ];

    defaultRoles.forEach(role => {
      this.tipRoles.set(role.id, role);
    });
  }

  private initializeDefaultOutlets(): void {
    const defaultOutlets: POSOutlet[] = [
      {
        id: 'main_restaurant',
        name: 'Main Restaurant',
        type: 'restaurant',
        tipPoolPercentage: 0.08, // 8% of revenue to tip pool
        isActive: true
      },
      {
        id: 'lobby_bar',
        name: 'Lobby Bar',
        type: 'bar',
        tipPoolPercentage: 0.12, // 12% of revenue to tip pool
        isActive: true
      },
      {
        id: 'poolside_bar',
        name: 'Poolside Bar',
        type: 'bar',
        tipPoolPercentage: 0.10, // 10% of revenue to tip pool
        isActive: true
      },
      {
        id: 'room_service',
        name: 'Room Service',
        type: 'room_service',
        tipPoolPercentage: 0.15, // 15% of revenue to tip pool
        isActive: true
      },
      {
        id: 'spa_cafe',
        name: 'Spa Café',
        type: 'spa',
        tipPoolPercentage: 0.06, // 6% of revenue to tip pool
        isActive: true
      },
      {
        id: 'gift_shop',
        name: 'Gift Shop',
        type: 'retail',
        tipPoolPercentage: 0.03, // 3% of revenue to tip pool
        isActive: true
      }
    ];

    defaultOutlets.forEach(outlet => {
      this.posOutlets.set(outlet.id, outlet);
    });
  }

  // Import POS revenue data
  importPOSRevenue(data: z.infer<typeof POSRevenueSchema>[]): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    for (const record of data) {
      try {
        const validatedRecord = POSRevenueSchema.parse(record);
        const date = new Date(validatedRecord.date).toISOString().split('T')[0];
        
        if (!this.revenueData.has(date)) {
          this.revenueData.set(date, []);
        }
        
        this.revenueData.get(date)!.push(validatedRecord);
        imported++;
      } catch (error) {
        errors.push(`Invalid record: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success: errors.length === 0, imported, errors };
  }

  // Calculate tip pool for a specific period
  calculateTipPool(periodId: string): TipPoolPeriod {
    const period = this.tipPeriods.get(periodId);
    if (!period) {
      throw new Error('Tip pool period not found');
    }

    let totalRevenue = 0;
    let totalTipPool = 0;

    // Aggregate revenue for the period
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateKey = date.toISOString().split('T')[0];
      const dayRevenue = this.revenueData.get(dateKey) || [];
      
      for (const revenue of dayRevenue) {
        const outlet = this.posOutlets.get(revenue.outletId);
        if (outlet && outlet.isActive) {
          totalRevenue += revenue.netRevenue;
          totalTipPool += revenue.netRevenue * outlet.tipPoolPercentage;
        }
      }
    }

    // Apply employer top-up
    const employerTopUp = totalTipPool * 0.05; // 5% employer contribution
    totalTipPool += employerTopUp;

    // Update period
    period.totalRevenue = totalRevenue;
    period.totalTipPool = totalTipPool;
    period.employerTopUp = employerTopUp;
    period.status = 'calculating';

    this.tipPeriods.set(periodId, period);
    return period;
  }

  // Calculate individual allocations
  calculateAllocations(periodId: string, employeeShifts: Array<{
    employeeId: string;
    roleId: string;
    hoursWorked: number;
    shiftsWorked: number;
    serviceScore?: number;
  }>): TipAllocation[] {
    const period = this.tipPeriods.get(periodId);
    if (!period || period.status !== 'calculating') {
      throw new Error('Invalid tip pool period for allocation');
    }

    const allocations: TipAllocation[] = [];
    let totalPoints = 0;

    // Calculate total points for all employees
    for (const shift of employeeShifts) {
      const role = this.tipRoles.get(shift.roleId);
      if (!role) continue;

      const hourlyPoints = shift.hoursWorked * role.hourlyPoints * role.baseWeight;
      const shiftPoints = shift.shiftsWorked * role.shiftPoints * role.baseWeight;
      const serviceMultiplier = shift.serviceScore && shift.serviceScore >= 0.9 ? 1.2 : 1.0;
      
      totalPoints += (hourlyPoints + shiftPoints) * serviceMultiplier;
    }

    // Calculate individual allocations
    for (const shift of employeeShifts) {
      const role = this.tipRoles.get(shift.roleId);
      if (!role) continue;

      const hourlyPoints = shift.hoursWorked * role.hourlyPoints * role.baseWeight;
      const shiftPoints = shift.shiftsWorked * role.shiftPoints * role.baseWeight;
      const serviceMultiplier = shift.serviceScore && shift.serviceScore >= 0.9 ? 1.2 : 1.0;
      const employeePoints = (hourlyPoints + shiftPoints) * serviceMultiplier;

      const baseAllocation = (period.totalTipPool * 0.95) * (employeePoints / totalPoints); // 95% for base allocation
      const serviceBonus = serviceMultiplier > 1.0 ? baseAllocation * 0.1 : 0; // 10% service bonus
      const employerTopUpShare = period.employerTopUp * (employeePoints / totalPoints);

      const totalAmount = baseAllocation + serviceBonus + employerTopUpShare;
      const taxableAmount = totalAmount; // All tip pool income is taxable in Greece

      const allocation: TipAllocation = {
        employeeId: shift.employeeId,
        roleId: shift.roleId,
        hoursWorked: shift.hoursWorked,
        shiftsWorked: shift.shiftsWorked,
        totalPoints: employeePoints,
        baseAllocation,
        serviceBonus,
        employerTopUpShare,
        totalAmount,
        taxableAmount,
        earningsCode: 'TIP_POOL_DIST' // Greek earnings code for tip pool distribution
      };

      allocations.push(allocation);
    }

    // Store allocations
    this.allocations.set(periodId, allocations);
    
    // Update period
    period.totalPoints = totalPoints;
    period.status = 'finalized';
    this.tipPeriods.set(periodId, period);

    return allocations;
  }

  // Get tip pool summary for payroll integration
  getTipPoolSummary(periodId: string): {
    period: TipPoolPeriod;
    allocations: TipAllocation[];
    payrollEntries: Array<{
      employeeId: string;
      earningsCode: string;
      description: string;
      amount: number;
      taxable: boolean;
      units?: number;
    }>;
  } {
    const period = this.tipPeriods.get(periodId);
    const allocations = this.allocations.get(periodId) || [];

    if (!period) {
      throw new Error('Tip pool period not found');
    }

    const payrollEntries = allocations.map(allocation => ({
      employeeId: allocation.employeeId,
      earningsCode: allocation.earningsCode,
      description: `Tip Pool Distribution ${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`,
      amount: allocation.totalAmount,
      taxable: true,
      units: allocation.hoursWorked
    }));

    return { period, allocations, payrollEntries };
  }

  // Create new tip pool period
  createTipPoolPeriod(startDate: Date, endDate: Date): string {
    const id = `tip_pool_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
    
    const period: TipPoolPeriod = {
      id,
      startDate,
      endDate,
      status: 'open',
      totalRevenue: 0,
      totalTipPool: 0,
      totalPoints: 0,
      employerTopUp: 0
    };

    this.tipPeriods.set(id, period);
    return id;
  }

  // Get all tip roles
  getTipRoles(): TipRole[] {
    return Array.from(this.tipRoles.values());
  }

  // Get all POS outlets
  getPOSOutlets(): POSOutlet[] {
    return Array.from(this.posOutlets.values());
  }

  // Get tip pool periods
  getTipPoolPeriods(): TipPoolPeriod[] {
    return Array.from(this.tipPeriods.values());
  }

  // Update role configuration
  updateTipRole(roleId: string, updates: Partial<TipRole>): TipRole {
    const role = this.tipRoles.get(roleId);
    if (!role) {
      throw new Error('Tip role not found');
    }

    const updatedRole = { ...role, ...updates };
    this.tipRoles.set(roleId, updatedRole);
    return updatedRole;
  }

  // Update outlet configuration
  updatePOSOutlet(outletId: string, updates: Partial<POSOutlet>): POSOutlet {
    const outlet = this.posOutlets.get(outletId);
    if (!outlet) {
      throw new Error('POS outlet not found');
    }

    const updatedOutlet = { ...outlet, ...updates };
    this.posOutlets.set(outletId, updatedOutlet);
    return updatedOutlet;
  }

  // Get revenue analytics
  getRevenueAnalytics(startDate: Date, endDate: Date): {
    totalRevenue: number;
    totalTipPool: number;
    outletBreakdown: Array<{
      outletId: string;
      outletName: string;
      revenue: number;
      tipPoolAmount: number;
      percentage: number;
    }>;
    dailyTrends: Array<{
      date: string;
      revenue: number;
      tipPool: number;
    }>;
  } {
    let totalRevenue = 0;
    let totalTipPool = 0;
    const outletTotals = new Map<string, { revenue: number; tipPool: number }>();
    const dailyTotals = new Map<string, { revenue: number; tipPool: number }>();

    // Process revenue data for the period
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateKey = date.toISOString().split('T')[0];
      const dayRevenue = this.revenueData.get(dateKey) || [];
      
      let dayTotal = 0;
      let dayTipPool = 0;

      for (const revenue of dayRevenue) {
        const outlet = this.posOutlets.get(revenue.outletId);
        if (!outlet || !outlet.isActive) continue;

        const revenueAmount = revenue.netRevenue;
        const tipPoolAmount = revenueAmount * outlet.tipPoolPercentage;

        totalRevenue += revenueAmount;
        totalTipPool += tipPoolAmount;
        dayTotal += revenueAmount;
        dayTipPool += tipPoolAmount;

        // Update outlet totals
        if (!outletTotals.has(revenue.outletId)) {
          outletTotals.set(revenue.outletId, { revenue: 0, tipPool: 0 });
        }
        const outletData = outletTotals.get(revenue.outletId)!;
        outletData.revenue += revenueAmount;
        outletData.tipPool += tipPoolAmount;
      }

      dailyTotals.set(dateKey, { revenue: dayTotal, tipPool: dayTipPool });
    }

    // Build outlet breakdown
    const outletBreakdown = Array.from(outletTotals.entries()).map(([outletId, totals]) => {
      const outlet = this.posOutlets.get(outletId)!;
      return {
        outletId,
        outletName: outlet.name,
        revenue: totals.revenue,
        tipPoolAmount: totals.tipPool,
        percentage: totalRevenue > 0 ? (totals.revenue / totalRevenue) * 100 : 0
      };
    });

    // Build daily trends
    const dailyTrends = Array.from(dailyTotals.entries()).map(([date, totals]) => ({
      date,
      revenue: totals.revenue,
      tipPool: totals.tipPool
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue,
      totalTipPool,
      outletBreakdown,
      dailyTrends
    };
  }
}

// Export singleton instance
export const hotelTipPoolingService = new HotelTipPoolingService();