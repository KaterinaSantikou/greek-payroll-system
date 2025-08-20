/**
 * Government System Monitoring Service
 * Monitors Greek government systems (ERGANI II, e-EFKA, AADE) for availability and performance
 */

import { db } from '../db';
import {
  governmentSystems,
  systemStatusChecks,
  systemOutages,
  systemAlertSubscriptions,
  systemAvailabilityMetrics,
  systemIntegrations,
  type GovernmentSystem,
  type SystemStatusCheck,
  type SystemOutage,
  type InsertSystemStatusCheck,
  type InsertSystemOutage,
  type InsertSystemAvailabilityMetrics,
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count, avg, max, min } from 'drizzle-orm';
import { EventEmitter } from 'events';

// Import on-call system for incident creation
let OnCallRotaService: any;
try {
  OnCallRotaService = require('./OnCallRotaService').OnCallRotaService;
} catch (error) {
  // OnCallRotaService not available during initialization
}

export interface SystemHealthCheck {
  systemId: string;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  responseTime?: number;
  httpStatusCode?: number;
  errorMessage?: string;
  timestamp: Date;
}

export interface OutageIncident {
  systemId: string;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'maintenance';
  startTime: Date;
  estimatedResolution?: Date;
  affectedServices: string[];
}

export interface AlertConfiguration {
  userId: string;
  systemId?: string;
  alertTypes: string[];
  severity: string[];
  channels: string[];
  quietHours?: { start: string; end: string };
}

export class GovernmentSystemMonitoringService extends EventEmitter {
  private static instance: GovernmentSystemMonitoringService;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private systemsCache: Map<string, GovernmentSystem> = new Map();

  constructor() {
    super();
    this.loadSystems();
  }

  static getInstance(): GovernmentSystemMonitoringService {
    if (!GovernmentSystemMonitoringService.instance) {
      GovernmentSystemMonitoringService.instance = new GovernmentSystemMonitoringService();
    }
    return GovernmentSystemMonitoringService.instance;
  }

  /**
   * Initialize monitoring for all active government systems
   */
  async initializeMonitoring(): Promise<void> {
    try {
      await this.createDefaultSystems();
      await this.loadSystems();
      await this.startAllMonitoring();
      console.log('🏛️  Government system monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize government system monitoring:', error);
    }
  }

  /**
   * Create default government systems if they don't exist
   */
  private async createDefaultSystems(): Promise<void> {
    const defaultSystems = [
      {
        systemCode: 'ergani_ii',
        displayName: 'ERGANI II',
        description: 'Greek Labor Ministry Digital Registry System',
        baseUrl: 'https://www.ergani.gov.gr',
        healthCheckEndpoint: '/api/health',
        systemType: 'labor_reporting',
        priority: 'critical',
        timeout: 30000,
        retryAttempts: 3,
        checkInterval: 5,
        maintenanceWindows: [
          { day: 'sunday', startTime: '02:00', endTime: '04:00', timezone: 'Europe/Athens' }
        ],
        contactInfo: {
          supportEmail: 'support@ergani.gov.gr',
          phone: '+30 210 1234567',
          escalation: 'critical_systems@labor.gov.gr'
        }
      },
      {
        systemCode: 'e_efka',
        displayName: 'e-EFKA',
        description: 'Greek Social Security Organization Electronic Services',
        baseUrl: 'https://www.efka.gov.gr',
        healthCheckEndpoint: '/api/status',
        systemType: 'social_security',
        priority: 'critical',
        timeout: 25000,
        retryAttempts: 3,
        checkInterval: 5,
        maintenanceWindows: [
          { day: 'saturday', startTime: '23:00', endTime: '02:00', timezone: 'Europe/Athens' }
        ],
        contactInfo: {
          supportEmail: 'help@efka.gov.gr',
          phone: '+30 210 7654321',
          escalation: 'urgent@efka.gov.gr'
        }
      },
      {
        systemCode: 'aade_fmy',
        displayName: 'AADE ΦΜΥ',
        description: 'Greek Tax Authority Digital Services',
        baseUrl: 'https://www.aade.gr',
        healthCheckEndpoint: '/fmy/api/health',
        systemType: 'tax_authority',
        priority: 'high',
        timeout: 20000,
        retryAttempts: 2,
        checkInterval: 10,
        maintenanceWindows: [
          { day: 'sunday', startTime: '01:00', endTime: '03:00', timezone: 'Europe/Athens' }
        ],
        contactInfo: {
          supportEmail: 'support@aade.gr',
          phone: '+30 210 9876543',
          escalation: 'critical@aade.gr'
        }
      },
      {
        systemCode: 'mydata',
        displayName: 'myDATA',
        description: 'Greek Tax Authority Digital Books System',
        baseUrl: 'https://mydata.aade.gr',
        healthCheckEndpoint: '/api/ping',
        systemType: 'tax_authority',
        priority: 'high',
        timeout: 15000,
        retryAttempts: 2,
        checkInterval: 15,
        maintenanceWindows: [
          { day: 'saturday', startTime: '22:00', endTime: '01:00', timezone: 'Europe/Athens' }
        ],
        contactInfo: {
          supportEmail: 'mydata@aade.gr',
          phone: '+30 210 5551234',
          escalation: 'urgent@aade.gr'
        }
      }
    ];

    for (const systemData of defaultSystems) {
      try {
        const existing = await db
          .select()
          .from(governmentSystems)
          .where(eq(governmentSystems.systemCode, systemData.systemCode))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(governmentSystems).values(systemData);
          console.log(`Created government system: ${systemData.displayName}`);
        }
      } catch (error) {
        console.error(`Failed to create system ${systemData.systemCode}:`, error);
      }
    }
  }

  /**
   * Load systems from database into cache
   */
  private async loadSystems(): Promise<void> {
    try {
      const systems = await db
        .select()
        .from(governmentSystems)
        .where(eq(governmentSystems.isActive, true));

      this.systemsCache.clear();
      systems.forEach(system => {
        this.systemsCache.set(system.id, system);
      });
    } catch (error) {
      if ((error as any)?.code === '42P01') {
        console.log('Government systems table not yet created - using defaults');
      } else {
        console.error('Failed to load government systems:', error);
      }
    }
  }

  /**
   * Start monitoring for all active systems
   */
  private async startAllMonitoring(): Promise<void> {
    for (const [systemId, system] of Array.from(this.systemsCache.entries())) {
      this.startSystemMonitoring(systemId, system.checkInterval || 5);
    }
  }

  /**
   * Start monitoring for a specific system
   */
  private startSystemMonitoring(systemId: string, intervalMinutes: number): void {
    // Clear existing interval if any
    if (this.monitoringIntervals.has(systemId)) {
      clearInterval(this.monitoringIntervals.get(systemId)!);
    }

    // Set up new monitoring interval
    const interval = setInterval(async () => {
      await this.performHealthCheck(systemId);
    }, intervalMinutes * 60 * 1000);

    this.monitoringIntervals.set(systemId, interval);

    // Perform initial check
    setTimeout(() => this.performHealthCheck(systemId), 1000);
  }

  /**
   * Perform health check for a specific system
   */
  async performHealthCheck(systemId: string): Promise<SystemHealthCheck> {
    const system = this.systemsCache.get(systemId);
    if (!system) {
      throw new Error(`System not found: ${systemId}`);
    }

    const startTime = Date.now();
    let status: 'online' | 'offline' | 'degraded' | 'maintenance' = 'offline';
    let responseTime: number | undefined;
    let httpStatusCode: number | undefined;
    let errorMessage: string | undefined;
    let retryCount = 0;

    // Check if system is in maintenance window
    if (this.isInMaintenanceWindow(system)) {
      status = 'maintenance';
    } else {
      // Perform actual health check with retries
      for (let attempt = 0; attempt <= (system.retryAttempts || 3); attempt++) {
        try {
          const response = await this.makeHealthCheckRequest(system);
          responseTime = Date.now() - startTime;
          httpStatusCode = response.status;

          if (response.ok) {
            status = responseTime > 5000 ? 'degraded' : 'online';
            break;
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            retryCount = attempt;
          }
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : 'Unknown error';
          retryCount = attempt;
          
          if (attempt < (system.retryAttempts || 3)) {
            await this.delay(1000 * (attempt + 1)); // Exponential backoff
          }
        }
      }
    }

    const healthCheck: SystemHealthCheck = {
      systemId,
      status,
      responseTime,
      httpStatusCode,
      errorMessage,
      timestamp: new Date(),
    };

    // Store check result
    await this.recordHealthCheckInDB(healthCheck, retryCount);

    // Emit events for status changes
    this.emit('healthCheck', healthCheck);

    // Check for outages or recovery
    await this.checkForStatusChange(systemId, status, errorMessage);

    return healthCheck;
  }

  /**
   * Make HTTP request for health check
   */
  private async makeHealthCheckRequest(system: GovernmentSystem): Promise<Response> {
    const url = `${system.baseUrl}${system.healthCheckEndpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), system.timeout || 30000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PayrollSync-Monitor/1.0',
          'Accept': 'application/json, text/plain, */*',
        },
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Check if system is in maintenance window
   */
  private isInMaintenanceWindow(system: GovernmentSystem): boolean {
    if (!system.maintenanceWindows) return false;

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Europe/Athens' }).toLowerCase();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Europe/Athens' }).substring(0, 5);

    return (system.maintenanceWindows as any[]).some((window: any) => {
      return window.day === currentDay && 
             currentTime >= window.startTime && 
             currentTime <= window.endTime;
    });
  }

  /**
   * Record health check result in database
   */
  private async recordHealthCheckInDB(healthCheck: SystemHealthCheck, retryCount: number): Promise<void> {
    try {
      const checkData: InsertSystemStatusCheck = {
        systemId: healthCheck.systemId,
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
        httpStatusCode: healthCheck.httpStatusCode,
        errorMessage: healthCheck.errorMessage,
        isSuccessful: healthCheck.status === 'online' || healthCheck.status === 'maintenance',
        retryCount,
        checkedBy: 'automated',
        checkMethod: 'http',
        metadata: {
          timestamp: healthCheck.timestamp.toISOString(),
          userAgent: 'PayrollSync-Monitor/1.0',
        },
      };

      await db.insert(systemStatusChecks).values(checkData);
    } catch (error) {
      if ((error as any)?.code === '42P01') {
        console.log(`Health check not stored - tables not yet created: ${healthCheck.systemId} ${healthCheck.status}`);
      } else {
        console.error('Failed to record health check:', error);
      }
    }
  }

  /**
   * Check for status changes and create/resolve outages
   */
  private async checkForStatusChange(systemId: string, currentStatus: string, errorMessage?: string): Promise<void> {
    try {
      // Get the last few status checks to determine if this is a change
      const recentChecks = await db
        .select()
        .from(systemStatusChecks)
        .where(eq(systemStatusChecks.systemId, systemId))
        .orderBy(desc(systemStatusChecks.checkTime))
        .limit(3);

      if (recentChecks.length < 2) return;

      const [current, previous] = recentChecks;
      const wasDown = ['offline', 'degraded'].includes(previous.status);
      const isDown = ['offline', 'degraded'].includes(currentStatus);

      // System went down
      if (!wasDown && isDown) {
        await this.createOutageIncident(systemId, currentStatus as any, errorMessage);
        
        // Trigger on-call incident if OnCallRotaService is available
        if (OnCallRotaService) {
          try {
            const system = this.systemsCache.get(systemId);
            const onCallService = OnCallRotaService.getInstance();
            
            await onCallService.triggerIncident({
              title: `${system?.displayName || systemId} System Outage`,
              description: `${system?.displayName || systemId} is experiencing ${currentStatus} status. ${errorMessage || 'No additional details available.'}`,
              severity: this.determineSeverity(currentStatus, system),
              source: 'government_monitoring',
              externalIncidentId: systemId,
              affectedSystems: [systemId],
            });
            
            console.log(`🚨 On-call incident triggered for ${system?.displayName || systemId} outage`);
          } catch (error) {
            console.error('Failed to trigger on-call incident:', error);
          }
        }
      }
      // System recovered
      else if (wasDown && !isDown) {
        await this.resolveActiveOutages(systemId);
      }
    } catch (error) {
      if ((error as any)?.code === '42P01') {
        console.log('Status change tracking not available - tables not yet created');
      } else {
        console.error('Failed to check status change:', error);
      }
    }
  }

  /**
   * Create new outage incident
   */
  async createOutageIncident(
    systemId: string, 
    severity: 'critical' | 'major' | 'minor', 
    errorMessage?: string
  ): Promise<SystemOutage> {
    const system = this.systemsCache.get(systemId);
    if (!system) {
      throw new Error(`System not found: ${systemId}`);
    }

    const outageData: InsertSystemOutage = {
      systemId,
      incidentId: `INC-${Date.now()}-${systemId.substring(0, 8)}`,
      title: `${system.displayName} Service Outage`,
      description: errorMessage || `${system.displayName} is currently experiencing service disruption`,
      severity,
      status: 'active',
      startTime: new Date(),
      affectedServices: this.getAffectedServices(systemId),
      impact: severity === 'critical' ? 'total_outage' : 'partial_outage',
      reportedBy: 'system',
      priority: severity === 'critical' ? 1 : severity === 'major' ? 2 : 3,
      tags: ['automated', 'outage', system.systemType],
    };

    const [outage] = await db.insert(systemOutages).values(outageData).returning();

    // Emit outage event
    this.emit('outage', outage);

    // Trigger alerts
    await this.triggerAlerts(outage);

    console.log(`🚨 Outage detected: ${system.displayName} - ${severity}`);
    return outage;
  }

  /**
   * Resolve active outages for a system
   */
  private async resolveActiveOutages(systemId: string): Promise<void> {
    const activeOutages = await db
      .select()
      .from(systemOutages)
      .where(
        and(
          eq(systemOutages.systemId, systemId),
          eq(systemOutages.status, 'active')
        )
      );

    for (const outage of activeOutages) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - outage.startTime.getTime()) / 60000);

      await db
        .update(systemOutages)
        .set({
          status: 'resolved',
          endTime,
          duration,
          resolution: 'System has recovered and is operating normally',
          updatedAt: new Date(),
        })
        .where(eq(systemOutages.id, outage.id));

      // Emit recovery event
      this.emit('recovery', { ...outage, endTime, duration });

      console.log(`✅ Recovery detected: ${this.systemsCache.get(systemId)?.displayName} - Outage duration: ${duration} minutes`);
    }
  }

  /**
   * Get affected services for a system
   */
  private getAffectedServices(systemId: string): string[] {
    const system = this.systemsCache.get(systemId);
    if (!system) return [];

    switch (system.systemCode) {
      case 'ergani_ii':
        return ['Employee Registration', 'Work Schedule Submission', 'Labor Contract Reporting'];
      case 'e_efka':
        return ['Social Security Contributions', 'Employee Insurance', 'Pension Calculations'];
      case 'aade_fmy':
        return ['Tax Calculations', 'VAT Reporting', 'Income Tax Filing'];
      case 'mydata':
        return ['Digital Books', 'Invoice Transmission', 'VAT Records'];
      default:
        return ['Government Integration Services'];
    }
  }

  /**
   * Trigger alerts for outage
   */
  private async triggerAlerts(outage: SystemOutage): Promise<void> {
    try {
      const subscriptions = await db
        .select()
        .from(systemAlertSubscriptions)
        .where(
          and(
            eq(systemAlertSubscriptions.isActive, true),
            sql`(${systemAlertSubscriptions.systemId} = ${outage.systemId} OR ${systemAlertSubscriptions.systemId} IS NULL)`,
            sql`${systemAlertSubscriptions.severity} @> ${JSON.stringify([outage.severity])}`
          )
        );

      for (const subscription of subscriptions) {
        this.emit('alertTriggered', { outage, subscription });
      }
    } catch (error) {
      console.error('Failed to trigger alerts:', error);
    }
  }

  /**
   * Generate availability metrics for a system and period
   */
  async generateAvailabilityMetrics(
    systemId: string,
    date: Date,
    periodType: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Promise<void> {
    try {
      const { startDate, endDate } = this.getPeriodRange(date, periodType);

      const checks = await db
        .select()
        .from(systemStatusChecks)
        .where(
          and(
            eq(systemStatusChecks.systemId, systemId),
            gte(systemStatusChecks.checkTime, startDate),
            lte(systemStatusChecks.checkTime, endDate)
          )
        );

      if (checks.length === 0) return;

      const totalChecks = checks.length;
      const successfulChecks = checks.filter(c => c.isSuccessful).length;
      const failedChecks = totalChecks - successfulChecks;
      const uptime = (successfulChecks / totalChecks) * 100;

      const responseTimes = checks
        .filter(c => c.responseTime)
        .map(c => c.responseTime!);

      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : null;

      const outages = await db
        .select()
        .from(systemOutages)
        .where(
          and(
            eq(systemOutages.systemId, systemId),
            gte(systemOutages.startTime, startDate),
            lte(systemOutages.startTime, endDate)
          )
        );

      const metricsData: InsertSystemAvailabilityMetrics = {
        systemId,
        metricDate: date,
        periodType,
        totalChecks,
        successfulChecks,
        failedChecks,
        avgResponseTime: avgResponseTime ? avgResponseTime.toFixed(2) : null,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : null,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : null,
        uptime: uptime.toFixed(2),
        slaStatus: uptime >= 99.9 ? 'met' : uptime >= 99.5 ? 'at_risk' : 'missed',
        outageCount: outages.length,
        totalOutageMinutes: outages.reduce((sum, o) => sum + (o.duration || 0), 0),
        incidentCount: outages.filter(o => o.severity === 'critical' || o.severity === 'major').length,
      };

      await db.insert(systemAvailabilityMetrics).values(metricsData);
    } catch (error) {
      console.error('Failed to generate availability metrics:', error);
    }
  }

  /**
   * Get system status dashboard data
   */
  async getSystemStatusDashboard(): Promise<{
    systems: Array<GovernmentSystem & { lastCheck?: SystemStatusCheck; currentStatus: string }>;
    recentOutages: SystemOutage[];
    overallHealth: string;
    slaCompliance: number;
  }> {
    try {
      const systems = Array.from(this.systemsCache.values());
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get last check for each system
      const systemsWithStatus = await Promise.all(
        systems.map(async (system) => {
          const [lastCheck] = await db
            .select()
            .from(systemStatusChecks)
            .where(eq(systemStatusChecks.systemId, system.id))
            .orderBy(desc(systemStatusChecks.checkTime))
            .limit(1);

          return {
            ...system,
            lastCheck,
            currentStatus: lastCheck?.status || 'unknown',
          };
        })
      );

      // Get recent outages
      const recentOutages = await db
        .select()
        .from(systemOutages)
        .where(gte(systemOutages.startTime, last24Hours))
        .orderBy(desc(systemOutages.startTime))
        .limit(10);

      // Calculate overall health
      const healthyCount = systemsWithStatus.filter(s => s.currentStatus === 'online').length;
      const totalCount = systemsWithStatus.length;
      const healthPercentage = totalCount > 0 ? (healthyCount / totalCount) * 100 : 100;

      let overallHealth = 'healthy';
      if (healthPercentage < 50) overallHealth = 'critical';
      else if (healthPercentage < 80) overallHealth = 'degraded';
      else if (healthPercentage < 100) overallHealth = 'warning';

      // Calculate SLA compliance (simplified)
      const slaCompliance = healthPercentage;

      return {
        systems: systemsWithStatus,
        recentOutages,
        overallHealth,
        slaCompliance,
      };
    } catch (error) {
      console.error('Failed to get system status dashboard:', error);
      return {
        systems: Array.from(this.systemsCache.values()).map(s => ({ ...s, currentStatus: 'unknown' })),
        recentOutages: [],
        overallHealth: 'unknown',
        slaCompliance: 0,
      };
    }
  }

  // Helper methods

  private getPeriodRange(date: Date, periodType: string): { startDate: Date; endDate: Date } {
    const start = new Date(date);
    const end = new Date(date);

    switch (periodType) {
      case 'hourly':
        start.setMinutes(0, 0, 0);
        end.setMinutes(59, 59, 999);
        break;
      case 'daily':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate: start, endDate: end };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop monitoring for a specific system
   */
  stopSystemMonitoring(systemId: string): void {
    if (this.monitoringIntervals.has(systemId)) {
      clearInterval(this.monitoringIntervals.get(systemId)!);
      this.monitoringIntervals.delete(systemId);
    }
  }

  /**
   * Stop all monitoring
   */
  /**
   * Determine incident severity based on system status and configuration
   */
  private determineSeverity(status: string, system?: any): 'critical' | 'high' | 'medium' | 'low' {
    // Critical government systems (ERGANI II, e-EFKA) get critical priority
    const criticalSystems = ['ergani_ii', 'e_efka'];
    const systemCode = system?.systemCode || '';
    
    if (criticalSystems.includes(systemCode)) {
      return status === 'offline' ? 'critical' : 'high';
    }
    
    // Other systems based on status
    switch (status) {
      case 'offline':
        return 'high';
      case 'degraded':
        return 'medium';
      default:
        return 'low';
    }
  }

  stopAllMonitoring(): void {
    for (const [systemId] of Array.from(this.monitoringIntervals.keys())) {
      this.stopSystemMonitoring(systemId);
    }
  }
}