import { Express } from 'express';
import { db } from '../db';
import { properties, employees } from '@shared/schema';
import { eq, sql, count } from 'drizzle-orm';
import { isAuthenticated } from '../replitAuth';

export function registerPropertiesRoutes(app: Express) {
  // Get all properties with employee counts
  app.get('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      // Get properties with employee counts
      const propertiesWithStats = await db
        .select({
          propertyId: properties.propertyId,
          name: properties.name,
          address: properties.address,
          costCenterCode: properties.costCenterCode,
          createdAt: properties.createdAt,
          employeeCount: sql<number>`COALESCE(${count(employees.employeeId)}, 0)`,
        })
        .from(properties)
        .leftJoin(
          employees,
          eq(properties.propertyId, employees.defaultPropertyId)
        )
        .groupBy(
          properties.propertyId,
          properties.name,
          properties.address,
          properties.costCenterCode,
          properties.createdAt
        )
        .orderBy(properties.name);

      res.json(propertiesWithStats);
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({ message: 'Failed to fetch properties' });
    }
  });

  // Get property statistics
  app.get(
    '/api/properties/stats/:propertyId',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { propertyId } = req.params;

        // Get property stats
        const [propertyStats] = await db
          .select({
            propertyId: properties.propertyId,
            name: properties.name,
            activeEmployees: sql<number>`COALESCE(${count(employees.employeeId)}, 0)`,
          })
          .from(properties)
          .leftJoin(
            employees,
            eq(properties.propertyId, employees.defaultPropertyId)
          )
          .where(eq(properties.propertyId, propertyId))
          .groupBy(properties.propertyId, properties.name);

        if (!propertyStats) {
          return res.status(404).json({ message: 'Property not found' });
        }

        // Add mock monthly labor cost for demo
        const result = {
          ...propertyStats,
          monthlyLabourCost: Math.round(
            propertyStats.activeEmployees * 2500 + Math.random() * 10000
          ),
        };

        res.json(result);
      } catch (error) {
        console.error('Error fetching property stats:', error);
        res
          .status(500)
          .json({ message: 'Failed to fetch property statistics' });
      }
    }
  );

  // Update user's property preference
  app.post(
    '/api/user/property-preference',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { propertyId } = req.body;
        const userId = req.user.claims.sub;

        // In a real app, you might store this in a user preferences table
        // For now, we'll just acknowledge the preference change
        console.log(`User ${userId} switched to property ${propertyId}`);

        res.json({ success: true, propertyId });
      } catch (error) {
        console.error('Error updating property preference:', error);
        res
          .status(500)
          .json({ message: 'Failed to update property preference' });
      }
    }
  );

  // Get consolidated group view data
  app.get(
    '/api/properties/group-stats',
    isAuthenticated,
    async (req: any, res) => {
      try {
        // Get aggregated stats across all properties
        const groupStats = await db
          .select({
            totalProperties: sql<number>`COUNT(DISTINCT ${properties.propertyId})`,
            totalEmployees: sql<number>`COUNT(${employees.employeeId})`,
            propertiesWithEmployees: sql<number>`COUNT(DISTINCT CASE WHEN ${employees.employeeId} IS NOT NULL THEN ${properties.propertyId} END)`,
          })
          .from(properties)
          .leftJoin(
            employees,
            eq(properties.propertyId, employees.defaultPropertyId)
          );

        // Get per-property breakdown
        const propertyBreakdown = await db
          .select({
            propertyId: properties.propertyId,
            name: properties.name,
            employeeCount: sql<number>`COUNT(${employees.employeeId})`,
            costCenterCode: properties.costCenterCode,
          })
          .from(properties)
          .leftJoin(
            employees,
            eq(properties.propertyId, employees.defaultPropertyId)
          )
          .groupBy(
            properties.propertyId,
            properties.name,
            properties.costCenterCode
          )
          .orderBy(properties.name);

        res.json({
          summary: groupStats[0],
          breakdown: propertyBreakdown,
          totalMonthlyLabourCost: propertyBreakdown.reduce(
            (sum, prop) =>
              sum + (prop.employeeCount * 2500 + Math.random() * 10000),
            0
          ),
        });
      } catch (error) {
        console.error('Error fetching group stats:', error);
        res.status(500).json({ message: 'Failed to fetch group statistics' });
      }
    }
  );

  // Create new property
  app.post('/api/properties', isAuthenticated, async (req: any, res) => {
    try {
      const { name, address, costCenterCode } = req.body;

      const [newProperty] = await db
        .insert(properties)
        .values({
          name,
          address,
          costCenterCode,
        })
        .returning();

      res.status(201).json(newProperty);
    } catch (error) {
      console.error('Error creating property:', error);
      res.status(500).json({ message: 'Failed to create property' });
    }
  });
}
