/**
 * Kiosk App (Android/iPadOS) Architecture
 * Fixed terminal punch UI, offline cache, device binding for shared workstations
 */

// Kiosk device configuration and management
export interface KioskConfiguration {
  kioskId: string;
  propertyId: string;
  location: {
    name: string;
    department: string;
    coordinates: { lat: number; lng: number };
    geofenceId: string;
  };
  hardware: {
    platform: 'android' | 'ipados';
    model: string;
    serialNumber: string;
    macAddress: string;
    biometricReader: boolean;
    cardReader: boolean;
    camera: boolean;
    nfcReader: boolean;
  };
  operationalSettings: {
    allowedEmployees: string[] | 'all';
    operatingHours: {
      start: string;
      end: string;
      timezone: string;
    };
    sessionTimeout: number; // minutes
    requiresBiometric: boolean;
    requiresPhoto: boolean;
    offlineMode: boolean;
    maxOfflineHours: number;
  };
  securitySettings: {
    adminPin: string;
    kioskMode: boolean; // locked to app only
    remoteWipe: boolean;
    tamperDetection: boolean;
    auditLogging: boolean;
  };
}

// Kiosk session management for shared device
export interface KioskSession {
  sessionId: string;
  employeeId: string;
  startedAt: string;
  lastActivity: string;
  sessionState: 'active' | 'idle' | 'expired' | 'locked';
  authenticationMethod: 'pin' | 'badge' | 'biometric' | 'qr_code';
  permissions: string[];
  timeoutWarnings: number;
}

// Multi-employee interface for shared kiosk
export interface KioskEmployeeDirectory {
  employees: KioskEmployee[];
  searchEnabled: boolean;
  recentEmployees: string[];
  favoriteEmployees: string[];
  departmentFilter: string[];
}

export interface KioskEmployee {
  employeeId: string;
  name: string;
  department: string;
  photo?: string;
  badgeNumber?: string;
  currentStatus: 'clocked_out' | 'clocked_in' | 'on_break' | 'unknown';
  quickActions: string[];
  biometricEnrolled: boolean;
}

// Kiosk-specific offline cache with enhanced durability
export class KioskOfflineCache {
  private static CACHE_KEY = 'kiosk_events_cache';
  private static EMPLOYEE_CACHE_KEY = 'kiosk_employees_cache';
  private static MAX_CACHE_HOURS = 72; // 3 days offline support
  private static INTEGRITY_CHECK_INTERVAL = 60000; // 1 minute

  static async initializeCache(kioskId: string): Promise<void> {
    // Initialize cache structure
    const cache = {
      kioskId,
      lastSync: new Date().toISOString(),
      events: [],
      employeeDirectory: [],
      integrityHash: '',
      metadata: {
        version: '1.0',
        platform: 'kiosk',
        initTime: new Date().toISOString(),
      },
    };

    await this.saveCache(cache);

    // Start integrity monitoring
    this.startIntegrityMonitoring();
  }

  static async cacheKioskEvent(event: any): Promise<void> {
    const cache = await this.getCache();

    const cachedEvent = {
      ...event,
      cachedAt: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0,
      integrityCheck: await this.calculateEventHash(event),
    };

    cache.events.push(cachedEvent);

    // Maintain cache size by time window
    const cutoffTime = new Date(
      Date.now() - this.MAX_CACHE_HOURS * 60 * 60 * 1000
    );
    cache.events = cache.events.filter(e => new Date(e.cachedAt) > cutoffTime);

    cache.integrityHash = await this.calculateCacheHash(cache);
    await this.saveCache(cache);
  }

  static async syncKioskEvents(): Promise<KioskSyncResult> {
    const cache = await this.getCache();
    const pendingEvents = cache.events.filter(e => e.syncStatus === 'pending');

    if (pendingEvents.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        integrityStatus: 'verified',
      };
    }

    // Verify cache integrity before sync
    const integrityValid = await this.verifyCacheIntegrity(cache);
    if (!integrityValid) {
      throw new Error('Cache integrity check failed - sync aborted');
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const event of pendingEvents) {
      try {
        await this.syncKioskEvent(event);
        event.syncStatus = 'synced';
        event.syncedAt = new Date().toISOString();
        syncedCount++;
      } catch (error) {
        event.retryCount++;
        event.lastError = error.message;

        if (event.retryCount >= 5) {
          // Higher retry count for kiosks
          event.syncStatus = 'failed';
          failedCount++;
        }
      }
    }

    // Clean up synced events
    cache.events = cache.events.filter(e => e.syncStatus !== 'synced');
    cache.lastSync = new Date().toISOString();
    cache.integrityHash = await this.calculateCacheHash(cache);

    await this.saveCache(cache);

    return {
      success: true,
      syncedCount,
      failedCount,
      integrityStatus: 'verified',
    };
  }

  static async updateEmployeeDirectory(
    employees: KioskEmployee[]
  ): Promise<void> {
    const employeeCache = {
      lastUpdated: new Date().toISOString(),
      employees,
      checksum: await this.calculateDirectoryHash(employees),
    };

    localStorage.setItem(
      this.EMPLOYEE_CACHE_KEY,
      JSON.stringify(employeeCache)
    );
  }

  static async getEmployeeDirectory(): Promise<KioskEmployeeDirectory> {
    const stored = localStorage.getItem(this.EMPLOYEE_CACHE_KEY);
    const cached = stored ? JSON.parse(stored) : { employees: [] };

    return {
      employees: cached.employees || [],
      searchEnabled: true,
      recentEmployees: this.getRecentEmployees(),
      favoriteEmployees: this.getFavoriteEmployees(),
      departmentFilter: this.getUniqueDepartments(cached.employees),
    };
  }

  private static async syncKioskEvent(event: any): Promise<void> {
    const response = await fetch('/api/time-service/kiosk-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kiosk-Auth': await this.getKioskToken(),
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Kiosk sync failed: ${response.status}`);
    }
  }

  private static async getCache(): Promise<any> {
    const stored = localStorage.getItem(this.CACHE_KEY);
    return stored ? JSON.parse(stored) : { events: [] };
  }

  private static async saveCache(cache: any): Promise<void> {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  private static async calculateEventHash(event: any): Promise<string> {
    const data = JSON.stringify({
      employeeId: event.employeeId,
      type: event.type,
      timestamp: event.timestamp,
      kioskId: event.kioskId,
    });
    return btoa(data).substring(0, 16);
  }

  private static async calculateCacheHash(cache: any): Promise<string> {
    const data = JSON.stringify({
      kioskId: cache.kioskId,
      eventCount: cache.events.length,
      lastSync: cache.lastSync,
    });
    return btoa(data).substring(0, 16);
  }

  private static async calculateDirectoryHash(
    employees: any[]
  ): Promise<string> {
    const data = JSON.stringify(employees.map(e => e.employeeId).sort());
    return btoa(data).substring(0, 16);
  }

  private static async verifyCacheIntegrity(cache: any): Promise<boolean> {
    const calculatedHash = await this.calculateCacheHash(cache);
    return calculatedHash === cache.integrityHash;
  }

  private static startIntegrityMonitoring(): void {
    setInterval(async () => {
      const cache = await this.getCache();
      const integrityValid = await this.verifyCacheIntegrity(cache);

      if (!integrityValid) {
        console.error('Kiosk cache integrity violation detected');
        // Trigger security alert
        await this.reportIntegrityViolation();
      }
    }, this.INTEGRITY_CHECK_INTERVAL);
  }

  private static getRecentEmployees(): string[] {
    const recent = localStorage.getItem('kiosk_recent_employees');
    return recent ? JSON.parse(recent) : [];
  }

  private static getFavoriteEmployees(): string[] {
    const favorites = localStorage.getItem('kiosk_favorite_employees');
    return favorites ? JSON.parse(favorites) : [];
  }

  private static getUniqueDepartments(employees: KioskEmployee[]): string[] {
    return [...new Set(employees.map(e => e.department))];
  }

  private static async getKioskToken(): Promise<string> {
    return localStorage.getItem('kiosk_auth_token') || '';
  }

  private static async reportIntegrityViolation(): Promise<void> {
    // Report to security monitoring system
    console.warn('Cache integrity violation reported');
  }
}

// Kiosk UI controller with enhanced UX for shared device
export class KioskPunchController {
  private static currentSession: KioskSession | null = null;
  private static sessionTimeout: NodeJS.Timeout | null = null;

  static async startEmployeeSession(
    employeeId: string,
    authMethod: string
  ): Promise<KioskSession> {
    // End any existing session
    if (this.currentSession) {
      await this.endSession();
    }

    // Verify employee is allowed on this kiosk
    const allowed = await this.verifyEmployeeAccess(employeeId);
    if (!allowed) {
      throw new Error('Employee not authorized for this kiosk');
    }

    const session: KioskSession = {
      sessionId: `kiosk_session_${Date.now()}`,
      employeeId,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      sessionState: 'active',
      authenticationMethod: authMethod as any,
      permissions: await this.getEmployeePermissions(employeeId),
      timeoutWarnings: 0,
    };

    this.currentSession = session;
    this.startSessionTimeout();

    // Add to recent employees
    await this.addToRecentEmployees(employeeId);

    return session;
  }

  static async executePunchAction(action: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session - please sign in first');
    }

    // Update last activity
    this.currentSession.lastActivity = new Date().toISOString();
    this.resetSessionTimeout();

    const kioskConfig = await this.getKioskConfiguration();

    // Perform additional verification if required
    if (kioskConfig.operationalSettings.requiresPhoto) {
      await this.captureVerificationPhoto();
    }

    if (kioskConfig.operationalSettings.requiresBiometric) {
      await this.performBiometricVerification();
    }

    // Create punch event
    const punchEvent = {
      employeeId: this.currentSession.employeeId,
      kioskId: kioskConfig.kioskId,
      type: action,
      timestamp: new Date().toISOString(),
      location: kioskConfig.location,
      sessionId: this.currentSession.sessionId,
      verificationMethod: kioskConfig.operationalSettings.requiresBiometric
        ? 'biometric'
        : 'session',
    };

    // Try online first, fallback to cache
    try {
      await this.submitPunchEvent(punchEvent);
    } catch (error) {
      await KioskOfflineCache.cacheKioskEvent(punchEvent);
    }

    // Show success feedback and end session after brief delay
    setTimeout(() => this.endSession(), 3000);
  }

  static async endSession(): Promise<void> {
    if (this.currentSession) {
      // Log session end
      console.log(`Ending kiosk session: ${this.currentSession.sessionId}`);

      this.currentSession = null;

      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
        this.sessionTimeout = null;
      }
    }
  }

  static async searchEmployees(query: string): Promise<KioskEmployee[]> {
    const directory = await KioskOfflineCache.getEmployeeDirectory();

    if (!query) {
      return directory.employees.slice(0, 20); // Limit for performance
    }

    return directory.employees
      .filter(
        emp =>
          emp.name.toLowerCase().includes(query.toLowerCase()) ||
          emp.employeeId.includes(query) ||
          emp.badgeNumber?.includes(query)
      )
      .slice(0, 10);
  }

  static async getKioskStatus(): Promise<any> {
    const config = await this.getKioskConfiguration();
    const cache = await KioskOfflineCache['getCache']();

    return {
      kioskId: config.kioskId,
      online: navigator.onLine,
      pendingEvents:
        cache.events?.filter(e => e.syncStatus === 'pending').length || 0,
      lastSync: cache.lastSync,
      currentSession: this.currentSession,
      operationalStatus: this.determineOperationalStatus(config),
    };
  }

  private static startSessionTimeout(): void {
    const timeoutMinutes = 5; // Configurable session timeout

    this.sessionTimeout = setTimeout(
      () => {
        if (this.currentSession) {
          this.currentSession.sessionState = 'expired';
          this.endSession();
        }
      },
      timeoutMinutes * 60 * 1000
    );
  }

  private static resetSessionTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    this.startSessionTimeout();
  }

  private static async verifyEmployeeAccess(
    employeeId: string
  ): Promise<boolean> {
    const config = await this.getKioskConfiguration();

    if (config.operationalSettings.allowedEmployees === 'all') {
      return true;
    }

    return config.operationalSettings.allowedEmployees.includes(employeeId);
  }

  private static async getEmployeePermissions(
    employeeId: string
  ): Promise<string[]> {
    // This would fetch from employee service
    return ['clock_in', 'clock_out', 'break_start', 'break_end'];
  }

  private static async addToRecentEmployees(employeeId: string): Promise<void> {
    const recent = KioskOfflineCache['getRecentEmployees']();
    const updated = [
      employeeId,
      ...recent.filter(id => id !== employeeId),
    ].slice(0, 10);
    localStorage.setItem('kiosk_recent_employees', JSON.stringify(updated));
  }

  private static async captureVerificationPhoto(): Promise<void> {
    // Implementation would use device camera
    console.log('Capturing verification photo...');
  }

  private static async performBiometricVerification(): Promise<void> {
    // Implementation would use biometric reader
    console.log('Performing biometric verification...');
  }

  private static async submitPunchEvent(event: any): Promise<void> {
    const response = await fetch('/api/time-service/kiosk-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Kiosk-Auth': await this.getKioskToken(),
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Kiosk submission failed: ${response.statusText}`);
    }
  }

  private static async getKioskConfiguration(): Promise<KioskConfiguration> {
    // This would be loaded at startup and cached
    return {
      kioskId: 'kiosk_001',
      propertyId: 'property_001',
      location: {
        name: 'Main Lobby',
        department: 'Reception',
        coordinates: { lat: 37.9755, lng: 23.7348 },
        geofenceId: 'geofence_001',
      },
      hardware: {
        platform: 'android',
        model: 'Samsung Galaxy Tab',
        serialNumber: 'SGT001',
        macAddress: '00:1B:44:11:3A:B7',
        biometricReader: true,
        cardReader: false,
        camera: true,
        nfcReader: true,
      },
      operationalSettings: {
        allowedEmployees: 'all',
        operatingHours: {
          start: '06:00',
          end: '23:00',
          timezone: 'Europe/Athens',
        },
        sessionTimeout: 5,
        requiresBiometric: false,
        requiresPhoto: false,
        offlineMode: true,
        maxOfflineHours: 72,
      },
      securitySettings: {
        adminPin: '****',
        kioskMode: true,
        remoteWipe: true,
        tamperDetection: true,
        auditLogging: true,
      },
    };
  }

  private static determineOperationalStatus(
    config: KioskConfiguration
  ): string {
    const now = new Date();
    const hours = now.getHours();
    const startHour = parseInt(
      config.operationalSettings.operatingHours.start.split(':')[0]
    );
    const endHour = parseInt(
      config.operationalSettings.operatingHours.end.split(':')[0]
    );

    if (hours >= startHour && hours < endHour) {
      return 'operational';
    } else {
      return 'outside_hours';
    }
  }

  private static async getKioskToken(): Promise<string> {
    return localStorage.getItem('kiosk_auth_token') || '';
  }
}

interface KioskSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  integrityStatus: 'verified' | 'failed';
}
