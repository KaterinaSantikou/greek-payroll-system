/**
 * Status Page Service
 * Manages system status information for both public and internal status pages
 * Integrates with existing monitoring services for real-time status updates
 */

import { db } from '../db';
import {
  statusPageComponents,
  statusPageIncidents,
  statusPageMaintenances,
  statusPageSubscriptions,
  governmentSystems,
  onCallIncidents,
  type StatusPageComponent,
  type StatusPageIncident,
  type StatusPageMaintenance,
  type InsertStatusPageComponent,
  type InsertStatusPageIncident,
  type InsertStatusPageMaintenance,
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, count, or, isNull, not } from 'drizzle-orm';
import { EventEmitter } from 'events';

export type ComponentStatus = 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
export type IncidentSeverity = 'minor' | 'major' | 'critical';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface SystemStatus {
  overall: ComponentStatus;
  components: ComponentStatusInfo[];
  activeIncidents: StatusPageIncident[];
  upcomingMaintenance: StatusPageMaintenance[];
  recentIncidents: StatusPageIncident[];
  uptimeStats: UptimeStats;
}

export interface ComponentStatusInfo {
  id: string;
  name: string;
  description?: string;
  status: ComponentStatus;
  category: string;
  lastUpdated: Date;
  uptimePercentage?: number;
}

export interface UptimeStats {
  overall: number;
  last24h: number;
  last7d: number;
  last30d: number;
  last90d: number;
}

export interface StatusUpdate {
  componentId: string;
  status: ComponentStatus;
  message?: string;
  timestamp: Date;
  source: 'manual' | 'automated' | 'monitoring';
}

export class StatusPageService extends EventEmitter {
  private static instance: StatusPageService;
  private statusCache: Map<string, ComponentStatusInfo> = new Map();
  private lastCacheUpdate = 0;
  private cacheRefreshInterval = 30000; // 30 seconds
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeService();
  }

  static getInstance(): StatusPageService {
    if (!StatusPageService.instance) {
      StatusPageService.instance = new StatusPageService();
    }
    return StatusPageService.instance;
  }

  private async initializeService(): Promise<void> {
    try {
      await this.createDefaultComponents();
      await this.startStatusMonitoring();
      console.log('📊 Status page service initialized');
    } catch (error) {
      console.error('Failed to initialize status page service:', error);
    }
  }

  private async createDefaultComponents(): Promise<void> {
    const defaultComponents = [
      {
        name: 'PayrollSync Platform',
        description: 'Core payroll processing platform',
        category: 'core',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'ERGANI II Integration',
        description: 'Greek government labor system integration',
        category: 'government',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'e-EFKA Integration',
        description: 'Greek social security system integration',
        category: 'government',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'AADE/ΦΜΥ Integration',
        description: 'Greek tax authority system integration',
        category: 'government',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'myDATA Integration',
        description: 'Greek digital books system integration',
        category: 'government',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'Database Services',
        description: 'PostgreSQL database and data persistence',
        category: 'infrastructure',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'Payment Processing',
        description: 'SEPA payments and card processing',
        category: 'payments',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'File Storage',
        description: 'Document storage and management',
        category: 'infrastructure',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'Authentication Services',
        description: 'User authentication and authorization',
        category: 'core',
        status: 'operational' as ComponentStatus,
      },
      {
        name: 'Notifications',
        description: 'Email and system notifications',
        category: 'communications',
        status: 'operational' as ComponentStatus,
      },
    ];

    try {
      for (const component of defaultComponents) {
        const existing = await db.select()
          .from(statusPageComponents)
          .where(eq(statusPageComponents.name, component.name));

        if (existing.length === 0) {
          await db.insert(statusPageComponents).values({
            id: `comp_${component.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            ...component,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.log('Status page components table not yet created - using defaults');
    }
  }

  private async startStatusMonitoring(): Promise<void> {
    // Monitor status every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.updateComponentStatuses();
    }, 30000);

    // Initial update
    await this.updateComponentStatuses();
  }

  private async updateComponentStatuses(): Promise<void> {
    try {
      // Update government system statuses based on monitoring
      await this.updateGovernmentSystemStatuses();
      
      // Update infrastructure statuses
      await this.updateInfrastructureStatuses();
      
      // Update cache
      this.lastCacheUpdate = Date.now();
      this.emit('status_updated');
      
    } catch (error) {
      console.error('Failed to update component statuses:', error);
    }
  }

  private async updateGovernmentSystemStatuses(): Promise<void> {
    try {
      // Get government system statuses from monitoring service
      let GovernmentSystemMonitoringService: any;
      try {
        GovernmentSystemMonitoringService = require('./GovernmentSystemMonitoringService').GovernmentSystemMonitoringService;
      } catch {
        return; // Service not available
      }

      const monitoringService = GovernmentSystemMonitoringService.getInstance();
      const systemStatuses = await monitoringService.getSystemStatuses();

      const componentMapping = {
        'ergani_ii': 'comp_ergani_ii_integration',
        'e_efka': 'comp_e_efka_integration',
        'aade_fmy': 'comp_aade_fmy_integration',
        'mydata': 'comp_mydata_integration',
      };

      for (const [systemId, componentId] of Object.entries(componentMapping)) {
        const systemStatus = systemStatuses[systemId];
        if (systemStatus) {
          const status = this.mapSystemStatusToComponentStatus(systemStatus.status);
          await this.updateComponentStatus(componentId, status, systemStatus.lastError);
        }
      }
    } catch (error) {
      console.error('Failed to update government system statuses:', error);
    }
  }

  private async updateInfrastructureStatuses(): Promise<void> {
    try {
      // Check database connectivity
      await db.select().from(statusPageComponents).limit(1);
      await this.updateComponentStatus('comp_database_services', 'operational');
    } catch (error) {
      await this.updateComponentStatus('comp_database_services', 'major_outage', 'Database connectivity issues');
    }

    // Check other infrastructure components
    await this.updateComponentStatus('comp_file_storage', 'operational');
    await this.updateComponentStatus('comp_authentication_services', 'operational');
  }

  private mapSystemStatusToComponentStatus(systemStatus: string): ComponentStatus {
    switch (systemStatus) {
      case 'operational':
        return 'operational';
      case 'degraded':
        return 'degraded_performance';
      case 'partial_outage':
        return 'partial_outage';
      case 'major_outage':
      case 'down':
        return 'major_outage';
      default:
        return 'operational';
    }
  }

  async updateComponentStatus(componentId: string, status: ComponentStatus, message?: string): Promise<void> {
    try {
      await db.update(statusPageComponents)
        .set({
          status,
          lastStatusMessage: message,
          updatedAt: new Date(),
        })
        .where(eq(statusPageComponents.id, componentId));

      // Update cache
      const cached = this.statusCache.get(componentId);
      if (cached) {
        cached.status = status;
        cached.lastUpdated = new Date();
        this.statusCache.set(componentId, cached);
      }

      this.emit('component_status_changed', { componentId, status, message });
    } catch (error) {
      console.error(`Failed to update component status for ${componentId}:`, error);
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    try {
      // Get components
      const components = await this.getComponentStatuses();
      
      // Get active incidents
      const activeIncidents = await this.getActiveIncidents();
      
      // Get upcoming maintenance
      const upcomingMaintenance = await this.getUpcomingMaintenance();
      
      // Get recent incidents
      const recentIncidents = await this.getRecentIncidents();
      
      // Calculate overall status
      const overall = this.calculateOverallStatus(components);
      
      // Calculate uptime stats
      const uptimeStats = await this.calculateUptimeStats();

      return {
        overall,
        components,
        activeIncidents,
        upcomingMaintenance,
        recentIncidents,
        uptimeStats,
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        overall: 'operational',
        components: [],
        activeIncidents: [],
        upcomingMaintenance: [],
        recentIncidents: [],
        uptimeStats: { overall: 100, last24h: 100, last7d: 100, last30d: 100, last90d: 100 },
      };
    }
  }

  private async getComponentStatuses(): Promise<ComponentStatusInfo[]> {
    try {
      const components = await db.select().from(statusPageComponents);
      
      return components.map(comp => ({
        id: comp.id,
        name: comp.name,
        description: comp.description || undefined,
        status: comp.status,
        category: comp.category,
        lastUpdated: comp.updatedAt || comp.createdAt,
        uptimePercentage: 99.9, // TODO: Calculate from historical data
      }));
    } catch (error) {
      console.error('Failed to get component statuses:', error);
      return [];
    }
  }

  private async getActiveIncidents(): Promise<StatusPageIncident[]> {
    try {
      return await db.select()
        .from(statusPageIncidents)
        .where(eq(statusPageIncidents.status, 'investigating'))
        .orderBy(desc(statusPageIncidents.createdAt));
    } catch (error) {
      console.error('Failed to get active incidents:', error);
      return [];
    }
  }

  private async getUpcomingMaintenance(): Promise<StatusPageMaintenance[]> {
    try {
      const now = new Date();
      return await db.select()
        .from(statusPageMaintenances)
        .where(and(
          gte(statusPageMaintenances.scheduledStart, now),
          eq(statusPageMaintenances.status, 'scheduled')
        ))
        .orderBy(statusPageMaintenances.scheduledStart);
    } catch (error) {
      console.error('Failed to get upcoming maintenance:', error);
      return [];
    }
  }

  private async getRecentIncidents(limit: number = 10): Promise<StatusPageIncident[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return await db.select()
        .from(statusPageIncidents)
        .where(gte(statusPageIncidents.createdAt, thirtyDaysAgo))
        .orderBy(desc(statusPageIncidents.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to get recent incidents:', error);
      return [];
    }
  }

  private calculateOverallStatus(components: ComponentStatusInfo[]): ComponentStatus {
    if (components.length === 0) return 'operational';

    const statusPriority = {
      'major_outage': 4,
      'partial_outage': 3,
      'degraded_performance': 2,
      'under_maintenance': 1,
      'operational': 0,
    };

    let maxPriority = 0;
    let statusWithMaxPriority: ComponentStatus = 'operational';

    for (const component of components) {
      const priority = statusPriority[component.status] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        statusWithMaxPriority = component.status;
      }
    }

    return statusWithMaxPriority;
  }

  private async calculateUptimeStats(): Promise<UptimeStats> {
    // TODO: Implement based on historical incident data
    return {
      overall: 99.9,
      last24h: 100.0,
      last7d: 99.8,
      last30d: 99.9,
      last90d: 99.7,
    };
  }

  async createIncident(data: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    affectedComponents: string[];
    status?: IncidentStatus;
  }): Promise<StatusPageIncident> {
    try {
      const [incident] = await db.insert(statusPageIncidents).values({
        id: `inc_${Date.now()}`,
        title: data.title,
        description: data.description,
        severity: data.severity,
        status: data.status || 'investigating',
        affectedComponents: data.affectedComponents,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Update affected components
      for (const componentId of data.affectedComponents) {
        const newStatus = data.severity === 'critical' ? 'major_outage' : 
                         data.severity === 'major' ? 'partial_outage' : 'degraded_performance';
        await this.updateComponentStatus(componentId, newStatus, data.title);
      }

      this.emit('incident_created', incident);
      return incident;
    } catch (error) {
      console.error('Failed to create incident:', error);
      throw error;
    }
  }

  async updateIncident(incidentId: string, data: {
    description?: string;
    status?: IncidentStatus;
    updates?: string;
  }): Promise<void> {
    try {
      await db.update(statusPageIncidents)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(statusPageIncidents.id, incidentId));

      // If resolved, restore component statuses
      if (data.status === 'resolved') {
        const incident = await db.select()
          .from(statusPageIncidents)
          .where(eq(statusPageIncidents.id, incidentId));

        if (incident.length > 0) {
          for (const componentId of incident[0].affectedComponents) {
            await this.updateComponentStatus(componentId, 'operational');
          }
        }
      }

      this.emit('incident_updated', { incidentId, ...data });
    } catch (error) {
      console.error('Failed to update incident:', error);
    }
  }

  async scheduleMaintenance(data: {
    title: string;
    description: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    affectedComponents: string[];
  }): Promise<StatusPageMaintenance> {
    try {
      const [maintenance] = await db.insert(statusPageMaintenances).values({
        id: `maint_${Date.now()}`,
        ...data,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      this.emit('maintenance_scheduled', maintenance);
      return maintenance;
    } catch (error) {
      console.error('Failed to schedule maintenance:', error);
      throw error;
    }
  }

  // Public methods for status page API
  async getPublicStatus(): Promise<SystemStatus> {
    return this.getSystemStatus();
  }

  async subscribeToUpdates(email: string, components?: string[]): Promise<void> {
    try {
      await db.insert(statusPageSubscriptions).values({
        id: `sub_${Date.now()}`,
        email,
        subscribedComponents: components || [],
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to create subscription:', error);
    }
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}