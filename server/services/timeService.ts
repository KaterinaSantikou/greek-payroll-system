/**
 * Time Service (API) Architecture
 * Event ingestion, validation, policy engine, geofence checks
 */

import { Request, Response } from 'express';

// Event ingestion and validation
export interface TimeEvent {
  eventId: string;
  employeeId: string;
  propertyId: string;
  kioskId?: string;
  eventType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end' | 'location_change';
  timestamp: string;
  location: {
    coordinates: { lat: number; lng: number };
    accuracy?: number;
    geofenceId: string;
    workplaceName: string;
  };
  deviceInfo: {
    deviceId: string;
    deviceType: 'mobile' | 'kiosk' | 'web';
    platform: string;
    appVersion: string;
  };
  verification: {
    method: 'biometric' | 'pin' | 'session' | 'badge';
    biometricHash?: string;
    photoHash?: string;
    confidence?: number;
  };
  metadata: {
    offline: boolean;
    cachedAt?: string;
    syncAttempt?: number;
    clientTimezone: string;
  };
}

// Policy engine for validation rules
export interface ValidationPolicy {
  policyId: string;
  name: string;
  applicableTo: {
    employees?: string[];
    departments?: string[];
    properties?: string[];
    contractTypes?: string[];
  };
  rules: ValidationRule[];
  enforcement: 'block' | 'warn' | 'log';
  priority: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface ValidationRule {
  ruleId: string;
  category: 'schedule' | 'hours' | 'breaks' | 'location' | 'cba' | 'labor_law';
  condition: string; // JSON rule expression
  message: string;
  severity: 'error' | 'warning' | 'info';
  autoCorrect?: boolean;
}

// Geofence management
export interface Geofence {
  geofenceId: string;
  propertyId: string;
  name: string;
  description: string;
  coordinates: {
    center: { lat: number; lng: number };
    radius?: number; // meters
    polygon?: Array<{ lat: number; lng: number }>;
  };
  allowedActions: string[];
  strictMode: boolean;
  workingHours?: {
    start: string;
    end: string;
    timezone: string;
  };
  metadata: {
    department?: string;
    floor?: string;
    building?: string;
  };
}

export class TimeServiceAPI {
  
  // Main event ingestion endpoint
  static async ingestTimeEvent(req: Request, res: Response): Promise<void> {
    try {
      const event: TimeEvent = req.body;
      
      // Validate event structure
      const structureValid = await this.validateEventStructure(event);
      if (!structureValid.valid) {
        res.status(400).json({ 
          error: 'Invalid event structure', 
          details: structureValid.errors 
        });
        return;
      }

      // Apply validation policies
      const validationResult = await this.validateTimeEvent(event);
      
      // Check geofence compliance
      const geofenceResult = await this.validateGeofence(event);
      
      // Combine validation results
      const allValidations = [...validationResult.violations, ...geofenceResult.violations];
      
      // Determine if event should be blocked
      const blocking = allValidations.filter(v => v.enforcement === 'block');
      
      if (blocking.length > 0) {
        res.status(422).json({
          error: 'Event validation failed',
          violations: blocking,
          eventId: event.eventId
        });
        return;
      }

      // Process the event
      const processedEvent = await this.processTimeEvent(event, allValidations);
      
      // Store the event
      await this.storeTimeEvent(processedEvent);
      
      // Trigger downstream processes
      await this.triggerDownstreamProcessing(processedEvent);

      res.status(201).json({
        success: true,
        eventId: event.eventId,
        processedAt: new Date().toISOString(),
        warnings: allValidations.filter(v => v.severity === 'warning')
      });

    } catch (error) {
      console.error('Time event ingestion failed:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }

  // Kiosk-specific event endpoint with enhanced validation
  static async ingestKioskEvent(req: Request, res: Response): Promise<void> {
    try {
      const event: TimeEvent = req.body;
      const kioskToken = req.headers['x-kiosk-auth'] as string;
      
      // Validate kiosk authentication
      const kioskValid = await this.validateKioskToken(kioskToken, event.kioskId!);
      if (!kioskValid) {
        res.status(401).json({ error: 'Invalid kiosk authentication' });
        return;
      }

      // Enhanced validation for kiosk events
      const kioskValidation = await this.validateKioskEvent(event);
      
      if (!kioskValidation.valid) {
        res.status(422).json({
          error: 'Kiosk event validation failed',
          violations: kioskValidation.violations
        });
        return;
      }

      // Process through standard pipeline
      await this.ingestTimeEvent(req, res);

    } catch (error) {
      console.error('Kiosk event ingestion failed:', error);
      res.status(500).json({ 
        error: 'Kiosk ingestion error',
        message: error.message 
      });
    }
  }

  // Batch event processing for offline sync
  static async ingestBatchEvents(req: Request, res: Response): Promise<void> {
    try {
      const events: TimeEvent[] = req.body.events;
      const results: any[] = [];

      for (const event of events) {
        try {
          // Process each event individually but collect results
          const validationResult = await this.validateTimeEvent(event);
          const geofenceResult = await this.validateGeofence(event);
          
          const allValidations = [...validationResult.violations, ...geofenceResult.violations];
          const blocking = allValidations.filter(v => v.enforcement === 'block');

          if (blocking.length === 0) {
            const processedEvent = await this.processTimeEvent(event, allValidations);
            await this.storeTimeEvent(processedEvent);
            await this.triggerDownstreamProcessing(processedEvent);

            results.push({
              eventId: event.eventId,
              status: 'success',
              warnings: allValidations.filter(v => v.severity === 'warning')
            });
          } else {
            results.push({
              eventId: event.eventId,
              status: 'failed',
              violations: blocking
            });
          }
        } catch (error) {
          results.push({
            eventId: event.eventId,
            status: 'error',
            message: error.message
          });
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      const failureCount = results.length - successCount;

      res.status(200).json({
        batchId: `batch_${Date.now()}`,
        totalEvents: events.length,
        successCount,
        failureCount,
        results
      });

    } catch (error) {
      console.error('Batch event ingestion failed:', error);
      res.status(500).json({ 
        error: 'Batch ingestion error',
        message: error.message 
      });
    }
  }

  // Policy engine implementation
  static async validateTimeEvent(event: TimeEvent): Promise<{ violations: any[] }> {
    const policies = await this.getApplicablePolicies(event);
    const violations: any[] = [];

    for (const policy of policies) {
      for (const rule of policy.rules) {
        const ruleResult = await this.evaluateRule(rule, event);
        
        if (!ruleResult.passed) {
          violations.push({
            policyId: policy.policyId,
            ruleId: rule.ruleId,
            category: rule.category,
            message: rule.message,
            severity: rule.severity,
            enforcement: policy.enforcement,
            autoCorrect: rule.autoCorrect,
            context: ruleResult.context
          });
        }
      }
    }

    return { violations };
  }

  // Geofence validation
  static async validateGeofence(event: TimeEvent): Promise<{ violations: any[] }> {
    const geofence = await this.getGeofence(event.location.geofenceId);
    const violations: any[] = [];

    if (!geofence) {
      violations.push({
        category: 'location',
        message: 'Unknown geofence',
        severity: 'error',
        enforcement: 'block'
      });
      return { violations };
    }

    // Check if location is within geofence
    const withinBounds = this.isWithinGeofence(
      event.location.coordinates,
      geofence.coordinates
    );

    if (!withinBounds && geofence.strictMode) {
      violations.push({
        category: 'location',
        message: `Location outside authorized area: ${geofence.name}`,
        severity: 'error',
        enforcement: 'block',
        context: {
          geofenceName: geofence.name,
          distance: this.calculateDistance(event.location.coordinates, geofence.coordinates.center)
        }
      });
    }

    // Check if action is allowed in this geofence
    if (!geofence.allowedActions.includes(event.eventType)) {
      violations.push({
        category: 'location',
        message: `Action '${event.eventType}' not allowed in ${geofence.name}`,
        severity: 'warning',
        enforcement: 'warn'
      });
    }

    // Check working hours if specified
    if (geofence.workingHours) {
      const withinHours = this.isWithinWorkingHours(event.timestamp, geofence.workingHours);
      
      if (!withinHours) {
        violations.push({
          category: 'location',
          message: `Time event outside working hours for ${geofence.name}`,
          severity: 'warning',
          enforcement: 'warn'
        });
      }
    }

    return { violations };
  }

  // Helper methods
  private static async validateEventStructure(event: TimeEvent): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!event.eventId) errors.push('eventId is required');
    if (!event.employeeId) errors.push('employeeId is required');
    if (!event.eventType) errors.push('eventType is required');
    if (!event.timestamp) errors.push('timestamp is required');
    if (!event.location?.coordinates) errors.push('location coordinates are required');

    return { valid: errors.length === 0, errors };
  }

  private static async getApplicablePolicies(event: TimeEvent): Promise<ValidationPolicy[]> {
    // This would query the policy database
    return [
      {
        policyId: 'greek_labor_law',
        name: 'Greek Labor Law Compliance',
        applicableTo: {},
        rules: [
          {
            ruleId: 'max_daily_hours',
            category: 'hours',
            condition: 'daily_hours <= 8 OR overtime_approved',
            message: 'Daily hours exceed 8 without overtime approval',
            severity: 'error',
            autoCorrect: false
          }
        ],
        enforcement: 'block',
        priority: 1,
        effectiveFrom: '2025-01-01T00:00:00Z'
      }
    ];
  }

  private static async evaluateRule(rule: ValidationRule, event: TimeEvent): Promise<{ passed: boolean; context?: any }> {
    // This would implement a rule evaluation engine
    // For now, return passed for demonstration
    return { passed: true };
  }

  private static async getGeofence(geofenceId: string): Promise<Geofence | null> {
    // This would query the geofence database
    return {
      geofenceId,
      propertyId: 'property_001',
      name: 'Main Building',
      description: 'Primary work area',
      coordinates: {
        center: { lat: 37.9755, lng: 23.7348 },
        radius: 100
      },
      allowedActions: ['clock_in', 'clock_out', 'break_start', 'break_end'],
      strictMode: true,
      workingHours: {
        start: '06:00',
        end: '22:00',
        timezone: 'Europe/Athens'
      },
      metadata: {
        department: 'General',
        building: 'Main'
      }
    };
  }

  private static isWithinGeofence(
    point: { lat: number; lng: number },
    geofence: { center: { lat: number; lng: number }; radius?: number }
  ): boolean {
    if (!geofence.radius) return true;

    const distance = this.calculateDistance(point, geofence.center);
    return distance <= geofence.radius;
  }

  private static calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat-point1.lat) * Math.PI/180;
    const Δλ = (point2.lng-point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private static isWithinWorkingHours(
    timestamp: string,
    workingHours: { start: string; end: string; timezone: string }
  ): boolean {
    // Implementation would check if timestamp falls within working hours
    // considering timezone
    return true;
  }

  private static async processTimeEvent(event: TimeEvent, validations: any[]): Promise<any> {
    // Add processing metadata
    return {
      ...event,
      processed: true,
      processedAt: new Date().toISOString(),
      validations,
      normalizedTimestamp: event.timestamp // Would normalize timezone
    };
  }

  private static async storeTimeEvent(event: any): Promise<void> {
    // Store in time events database
    console.log('Storing time event:', event.eventId);
  }

  private static async triggerDownstreamProcessing(event: any): Promise<void> {
    // Trigger compliance connector, payroll connector, etc.
    console.log('Triggering downstream processing for:', event.eventId);
  }

  private static async validateKioskToken(token: string, kioskId: string): Promise<boolean> {
    // Validate kiosk authentication token
    return token?.length > 0;
  }

  private static async validateKioskEvent(event: TimeEvent): Promise<{ valid: boolean; violations: any[] }> {
    // Additional kiosk-specific validation
    return { valid: true, violations: [] };
  }
}