/**
 * Production Readiness API Endpoints
 * Monitor and manage production readiness status
 */

import type { Express } from "express";
import { ProductionReadinessService } from "../services/ProductionReadinessService";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";

export function registerProductionRoutes(app: Express): void {
  const productionService = ProductionReadinessService.getInstance();

  /**
   * GET /api/production/health - Comprehensive health check
   */
  app.get("/api/production/health", async (req, res) => {
    try {
      const healthCheck = await productionService.performHealthCheck();
      res.json(healthCheck);
    } catch (error) {
      console.error("Production health check failed:", error);
      res.status(500).json({
        overall: 'critical',
        error: 'Health check failed',
        services: {
          database: 'error',
          authentication: 'down',
          errorTracking: 'inactive',
          monitoring: 'inactive',
          compliance: 'none',
          security: 'disabled',
        }
      });
    }
  });

  /**
   * GET /api/production/metrics - Production metrics dashboard
   */
  app.get("/api/production/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await productionService.getProductionMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Failed to get production metrics:", error);
      res.status(500).json({ error: "Failed to retrieve metrics" });
    }
  });

  /**
   * GET /api/production/readiness - Full readiness report
   */
  app.get("/api/production/readiness", isAuthenticated, async (req, res) => {
    try {
      const report = await productionService.generateReadinessReport();
      res.json(report);
    } catch (error) {
      console.error("Failed to generate readiness report:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  /**
   * GET /api/production/launch-check - Check if ready for launch
   */
  app.get("/api/production/launch-check", isAuthenticated, async (req, res) => {
    try {
      const launchStatus = await productionService.isReadyForProduction();
      res.json(launchStatus);
    } catch (error) {
      console.error("Launch readiness check failed:", error);
      res.status(500).json({ 
        ready: false,
        confidence: 0,
        blockers: ["System health check failed"],
        estimate: "Unknown - system issues detected"
      });
    }
  });

  /**
   * POST /api/production/initialize - Initialize production services
   */
  app.post("/api/production/initialize", isAuthenticated, async (req, res) => {
    try {
      await productionService.initialize();
      const healthCheck = await productionService.performHealthCheck();
      
      res.json({
        success: true,
        message: "Production services initialized",
        healthCheck
      });
    } catch (error) {
      console.error("Failed to initialize production services:", error);
      res.status(500).json({
        success: false,
        error: "Initialization failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}