import type { Express } from 'express';
import { z } from 'zod';
import { hotelTipPoolingService } from '../hotelTipPooling';
import { isAuthenticated } from '../replitAuth';

// Validation schemas
const POSRevenueImportSchema = z.object({
  data: z.array(
    z.object({
      outletId: z.string(),
      date: z.string().datetime(),
      grossRevenue: z.number().positive(),
      netRevenue: z.number().positive(),
      serviceCharges: z.number().default(0),
      tips: z.number().default(0),
      transactions: z.number().int().positive(),
    })
  ),
});

const CreateTipPoolPeriodSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

const CalculateAllocationSchema = z.object({
  periodId: z.string(),
  employeeShifts: z.array(
    z.object({
      employeeId: z.string(),
      roleId: z.string(),
      hoursWorked: z.number().positive(),
      shiftsWorked: z.number().int().positive(),
      serviceScore: z.number().min(0).max(1).optional(),
    })
  ),
});

const UpdateTipRoleSchema = z.object({
  roleId: z.string(),
  updates: z.object({
    name: z.string().optional(),
    category: z
      .enum(['service', 'kitchen', 'support', 'management'])
      .optional(),
    baseWeight: z.number().positive().optional(),
    hourlyPoints: z.number().positive().optional(),
    shiftPoints: z.number().positive().optional(),
    serviceMultiplier: z.number().positive().optional(),
    description: z.string().optional(),
  }),
});

const UpdatePOSOutletSchema = z.object({
  outletId: z.string(),
  updates: z.object({
    name: z.string().optional(),
    type: z
      .enum(['restaurant', 'bar', 'room_service', 'spa', 'retail'])
      .optional(),
    tipPoolPercentage: z.number().min(0).max(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

export function registerHotelTipPoolingRoutes(app: Express) {
  // Get all tip roles
  app.get('/api/tip-pooling/roles', isAuthenticated, async (req, res) => {
    try {
      const roles = hotelTipPoolingService.getTipRoles();
      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error('Get tip roles error:', error);
      res.status(500).json({
        error: 'Failed to get tip roles',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update tip role
  app.put('/api/tip-pooling/roles', isAuthenticated, async (req, res) => {
    try {
      const { roleId, updates } = UpdateTipRoleSchema.parse(req.body);
      const updatedRole = hotelTipPoolingService.updateTipRole(roleId, updates);

      res.json({
        success: true,
        data: updatedRole,
      });
    } catch (error) {
      console.error('Update tip role error:', error);
      res.status(400).json({
        error: 'Failed to update tip role',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get all POS outlets
  app.get('/api/tip-pooling/outlets', isAuthenticated, async (req, res) => {
    try {
      const outlets = hotelTipPoolingService.getPOSOutlets();
      res.json({
        success: true,
        data: outlets,
      });
    } catch (error) {
      console.error('Get POS outlets error:', error);
      res.status(500).json({
        error: 'Failed to get POS outlets',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update POS outlet
  app.put('/api/tip-pooling/outlets', isAuthenticated, async (req, res) => {
    try {
      const { outletId, updates } = UpdatePOSOutletSchema.parse(req.body);
      const updatedOutlet = hotelTipPoolingService.updatePOSOutlet(
        outletId,
        updates
      );

      res.json({
        success: true,
        data: updatedOutlet,
      });
    } catch (error) {
      console.error('Update POS outlet error:', error);
      res.status(400).json({
        error: 'Failed to update POS outlet',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Import POS revenue data
  app.post(
    '/api/tip-pooling/import-revenue',
    isAuthenticated,
    async (req, res) => {
      try {
        const { data } = POSRevenueImportSchema.parse(req.body);
        const result = hotelTipPoolingService.importPOSRevenue(data);

        res.json({
          success: result.success,
          data: {
            imported: result.imported,
            errors: result.errors,
          },
        });
      } catch (error) {
        console.error('Import POS revenue error:', error);
        res.status(400).json({
          error: 'Failed to import POS revenue',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get tip pool periods
  app.get('/api/tip-pooling/periods', isAuthenticated, async (req, res) => {
    try {
      const periods = hotelTipPoolingService.getTipPoolPeriods();
      res.json({
        success: true,
        data: periods,
      });
    } catch (error) {
      console.error('Get tip pool periods error:', error);
      res.status(500).json({
        error: 'Failed to get tip pool periods',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Create new tip pool period
  app.post('/api/tip-pooling/periods', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = CreateTipPoolPeriodSchema.parse(req.body);
      const periodId = hotelTipPoolingService.createTipPoolPeriod(
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: { periodId },
      });
    } catch (error) {
      console.error('Create tip pool period error:', error);
      res.status(400).json({
        error: 'Failed to create tip pool period',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Calculate tip pool for period
  app.post(
    '/api/tip-pooling/calculate/:periodId',
    isAuthenticated,
    async (req, res) => {
      try {
        const periodId = req.params.periodId;
        const period = hotelTipPoolingService.calculateTipPool(periodId);

        res.json({
          success: true,
          data: period,
        });
      } catch (error) {
        console.error('Calculate tip pool error:', error);
        res.status(400).json({
          error: 'Failed to calculate tip pool',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Calculate individual allocations
  app.post(
    '/api/tip-pooling/allocations',
    isAuthenticated,
    async (req, res) => {
      try {
        const { periodId, employeeShifts } = CalculateAllocationSchema.parse(
          req.body
        );
        const allocations = hotelTipPoolingService.calculateAllocations(
          periodId,
          employeeShifts
        );

        res.json({
          success: true,
          data: allocations,
        });
      } catch (error) {
        console.error('Calculate allocations error:', error);
        res.status(400).json({
          error: 'Failed to calculate allocations',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get tip pool summary for payroll
  app.get(
    '/api/tip-pooling/payroll-summary/:periodId',
    isAuthenticated,
    async (req, res) => {
      try {
        const periodId = req.params.periodId;
        const summary = hotelTipPoolingService.getTipPoolSummary(periodId);

        res.json({
          success: true,
          data: summary,
        });
      } catch (error) {
        console.error('Get payroll summary error:', error);
        res.status(400).json({
          error: 'Failed to get payroll summary',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Get revenue analytics
  app.get('/api/tip-pooling/analytics', isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const analytics = hotelTipPoolingService.getRevenueAnalytics(
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get revenue analytics error:', error);
      res.status(500).json({
        error: 'Failed to get revenue analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Simulate POS revenue data for demo
  app.post(
    '/api/tip-pooling/simulate-data',
    isAuthenticated,
    async (req, res) => {
      try {
        const outlets = hotelTipPoolingService.getPOSOutlets();
        const simulatedData = [];

        // Generate 30 days of sample data
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);

          for (const outlet of outlets) {
            if (!outlet.isActive) continue;

            // Generate random revenue based on outlet type
            let baseRevenue = 1000;
            switch (outlet.type) {
              case 'restaurant':
                baseRevenue = 2500 + Math.random() * 1500;
                break;
              case 'bar':
                baseRevenue = 1800 + Math.random() * 1200;
                break;
              case 'room_service':
                baseRevenue = 800 + Math.random() * 600;
                break;
              case 'spa':
                baseRevenue = 600 + Math.random() * 400;
                break;
              case 'retail':
                baseRevenue = 400 + Math.random() * 300;
                break;
            }

            // Add day of week variation
            const dayOfWeek = date.getDay();
            const weekendMultiplier =
              dayOfWeek === 5 || dayOfWeek === 6 ? 1.4 : 1.0;

            const grossRevenue = baseRevenue * weekendMultiplier;
            const netRevenue = grossRevenue * 0.9; // 10% tax/fees

            simulatedData.push({
              outletId: outlet.id,
              date: date.toISOString(),
              grossRevenue,
              netRevenue,
              serviceCharges: grossRevenue * 0.15,
              tips: grossRevenue * 0.05,
              transactions: Math.floor(grossRevenue / 35), // Average transaction size €35
            });
          }
        }

        const result = hotelTipPoolingService.importPOSRevenue(simulatedData);

        res.json({
          success: true,
          data: {
            message: 'Sample data generated and imported successfully',
            imported: result.imported,
            records: simulatedData.length,
          },
        });
      } catch (error) {
        console.error('Simulate data error:', error);
        res.status(500).json({
          error: 'Failed to simulate data',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
