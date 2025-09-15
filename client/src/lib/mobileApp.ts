/**
 * Mobile App (iOS/Android) Architecture
 * Punch UI, offline cache, device binding for mobile time capture
 */

// Device binding for secure mobile authentication
export interface DeviceBinding {
  deviceId: string;
  deviceFingerprint: string;
  bindingToken: string;
  bindingStatus: 'pending' | 'active' | 'revoked' | 'expired';
  boundAt: string;
  expiresAt: string;
  employeeId: string;
  deviceInfo: {
    platform: 'ios' | 'android';
    model: string;
    osVersion: string;
    appVersion: string;
    hardwareId: string;
    biometricSupport: boolean;
  };
}

// Mobile punch interface optimized for touch
export interface MobilePunchInterface {
  currentState: 'clocked_out' | 'clocked_in' | 'on_break' | 'offline';
  availableActions: PunchAction[];
  location: {
    coordinates: { lat: number; lng: number };
    accuracy: number;
    geofenceStatus: 'inside' | 'outside' | 'unknown';
    workplaceName: string;
  };
  currentShift?: {
    startTime: string;
    expectedEndTime: string;
    breakAllowance: number;
    department: string;
    role: string;
  };
  todayStats: {
    hoursWorked: number;
    breaksTaken: number;
    overtimeHours: number;
  };
}

export interface PunchAction {
  type: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  label: string;
  icon: string;
  enabled: boolean;
  requiresConfirmation: boolean;
  biometricRequired: boolean;
  validationRules: string[];
}

// Offline cache management for mobile devices
export class MobileOfflineCache {
  private static CACHE_KEY = 'mobile_time_events_cache';
  private static MAX_CACHE_SIZE = 1000;
  private static SYNC_BATCH_SIZE = 50;

  static async cachePunchEvent(event: any): Promise<void> {
    const cache = await this.getCache();

    // Add timestamp and offline flag
    const cachedEvent = {
      ...event,
      cachedAt: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0,
    };

    cache.events.push(cachedEvent);

    // Maintain cache size limit
    if (cache.events.length > this.MAX_CACHE_SIZE) {
      cache.events = cache.events.slice(-this.MAX_CACHE_SIZE);
    }

    await this.saveCache(cache);
  }

  static async syncCachedEvents(): Promise<SyncResult> {
    const cache = await this.getCache();
    const pendingEvents = cache.events.filter(e => e.syncStatus === 'pending');

    if (pendingEvents.length === 0) {
      return { success: true, syncedCount: 0, failedCount: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;
    const batch = pendingEvents.slice(0, this.SYNC_BATCH_SIZE);

    for (const event of batch) {
      try {
        await this.syncSingleEvent(event);
        event.syncStatus = 'synced';
        event.syncedAt = new Date().toISOString();
        syncedCount++;
      } catch (error) {
        event.retryCount++;
        event.lastError = error.message;

        // Move to failed after 3 retries
        if (event.retryCount >= 3) {
          event.syncStatus = 'failed';
          failedCount++;
        }
      }
    }

    // Remove successfully synced events
    cache.events = cache.events.filter(e => e.syncStatus !== 'synced');
    await this.saveCache(cache);

    return { success: true, syncedCount, failedCount };
  }

  private static async syncSingleEvent(event: any): Promise<void> {
    const response = await fetch('/api/time-service/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }
  }

  private static async getCache(): Promise<{ events: any[] }> {
    const stored = localStorage.getItem(this.CACHE_KEY);
    return stored ? JSON.parse(stored) : { events: [] };
  }

  private static async saveCache(cache: any): Promise<void> {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  private static async getAuthToken(): Promise<string> {
    return localStorage.getItem('auth_token') || '';
  }
}

// Mobile device binding service
export class MobileDeviceBinding {
  static async bindDevice(employeeId: string): Promise<DeviceBinding> {
    const deviceFingerprint = await this.generateDeviceFingerprint();

    const bindingRequest = {
      employeeId,
      deviceFingerprint,
      deviceInfo: await this.getDeviceInfo(),
    };

    const response = await fetch('/api/mobile/bind-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bindingRequest),
    });

    if (!response.ok) {
      throw new Error('Device binding failed');
    }

    const binding = await response.json();

    // Store binding locally
    localStorage.setItem('device_binding', JSON.stringify(binding));

    return binding;
  }

  static async verifyBinding(): Promise<boolean> {
    const stored = localStorage.getItem('device_binding');
    if (!stored) return false;

    const binding: DeviceBinding = JSON.parse(stored);

    // Check expiration
    if (new Date() > new Date(binding.expiresAt)) {
      return false;
    }

    // Verify device fingerprint hasn't changed
    const currentFingerprint = await this.generateDeviceFingerprint();
    if (currentFingerprint !== binding.deviceFingerprint) {
      return false;
    }

    return binding.bindingStatus === 'active';
  }

  private static async generateDeviceFingerprint(): Promise<string> {
    const deviceInfo = await this.getDeviceInfo();
    const fingerprint = `${deviceInfo.platform}-${deviceInfo.model}-${deviceInfo.hardwareId}`;

    // In a real implementation, use crypto.subtle.digest
    return btoa(fingerprint).substring(0, 32);
  }

  private static async getDeviceInfo(): Promise<any> {
    return {
      platform: this.detectPlatform(),
      model: navigator.userAgent,
      osVersion: navigator.platform,
      appVersion: '1.0.0',
      hardwareId: await this.getHardwareId(),
      biometricSupport: await this.checkBiometricSupport(),
    };
  }

  private static detectPlatform(): 'ios' | 'android' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    }
    return 'android';
  }

  private static async getHardwareId(): Promise<string> {
    // In a real mobile app, this would use device-specific APIs
    return 'web_' + Math.random().toString(36).substring(2, 15);
  }

  private static async checkBiometricSupport(): Promise<boolean> {
    // Check for WebAuthn support as proxy for biometric capabilities
    return !!(navigator.credentials && navigator.credentials.create);
  }
}

// Mobile punch UI controller
export class MobilePunchController {
  private static currentInterface: MobilePunchInterface | null = null;

  static async initializePunchInterface(
    employeeId: string
  ): Promise<MobilePunchInterface> {
    // Verify device binding
    const bindingValid = await MobileDeviceBinding.verifyBinding();
    if (!bindingValid) {
      throw new Error('Device not bound or binding expired');
    }

    // Get current location
    const location = await this.getCurrentLocation();

    // Get current state from server
    const currentState = await this.getCurrentState(employeeId);

    // Get today's shift info
    const currentShift = await this.getCurrentShift(employeeId);

    // Calculate today's stats
    const todayStats = await this.getTodayStats(employeeId);

    this.currentInterface = {
      currentState,
      availableActions: this.determineAvailableActions(currentState, location),
      location,
      currentShift,
      todayStats,
    };

    return this.currentInterface;
  }

  static async executePunchAction(action: PunchAction): Promise<void> {
    if (!this.currentInterface) {
      throw new Error('Punch interface not initialized');
    }

    // Validate action is available
    if (
      !this.currentInterface.availableActions.some(a => a.type === action.type)
    ) {
      throw new Error('Action not available');
    }

    // Check biometric requirement
    if (action.biometricRequired) {
      const biometricResult = await this.performBiometricVerification();
      if (!biometricResult.success) {
        throw new Error('Biometric verification failed');
      }
    }

    // Create punch event
    const punchEvent = {
      employeeId: await this.getEmployeeId(),
      type: action.type,
      timestamp: new Date().toISOString(),
      location: this.currentInterface.location,
      deviceInfo: await MobileDeviceBinding['getDeviceInfo'](),
      biometricVerified: action.biometricRequired,
    };

    // Try to submit online first
    try {
      await this.submitPunchEvent(punchEvent);
    } catch (error) {
      // If offline, cache the event
      console.log('Online submission failed, caching event:', error.message);
      await MobileOfflineCache.cachePunchEvent(punchEvent);
    }

    // Update local interface state
    await this.updateInterfaceState();
  }

  private static async getCurrentLocation(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            accuracy: position.coords.accuracy,
            geofenceStatus: 'unknown', // Would be determined by geofence service
            workplaceName: 'Current Location',
          });
        },
        error => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  private static determineAvailableActions(
    state: string,
    location: any
  ): PunchAction[] {
    const actions: PunchAction[] = [];

    switch (state) {
      case 'clocked_out':
        actions.push({
          type: 'clock_in',
          label: 'Είσοδος',
          icon: 'clock-in',
          enabled: location.geofenceStatus !== 'outside',
          requiresConfirmation: false,
          biometricRequired: true,
          validationRules: ['location_check', 'schedule_check'],
        });
        break;

      case 'clocked_in':
        actions.push({
          type: 'break_start',
          label: 'Διάλειμμα',
          icon: 'coffee',
          enabled: true,
          requiresConfirmation: false,
          biometricRequired: false,
          validationRules: ['break_rules'],
        });
        actions.push({
          type: 'clock_out',
          label: 'Έξοδος',
          icon: 'clock-out',
          enabled: true,
          requiresConfirmation: true,
          biometricRequired: true,
          validationRules: ['min_hours_check'],
        });
        break;

      case 'on_break':
        actions.push({
          type: 'break_end',
          label: 'Επιστροφή',
          icon: 'play',
          enabled: true,
          requiresConfirmation: false,
          biometricRequired: false,
          validationRules: ['break_duration'],
        });
        break;
    }

    return actions;
  }

  private static async performBiometricVerification(): Promise<{
    success: boolean;
  }> {
    try {
      // Use WebAuthn for biometric verification
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'PayrollSync' },
          user: {
            id: new Uint8Array(16),
            name: await this.getEmployeeId(),
            displayName: 'Employee',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
        },
      });

      return { success: !!credential };
    } catch (error) {
      console.error('Biometric verification failed:', error);
      return { success: false };
    }
  }

  private static async submitPunchEvent(event: any): Promise<void> {
    const response = await fetch('/api/time-service/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Submission failed: ${response.statusText}`);
    }
  }

  private static async updateInterfaceState(): Promise<void> {
    if (!this.currentInterface) return;

    const employeeId = await this.getEmployeeId();
    this.currentInterface.currentState = await this.getCurrentState(employeeId);
    this.currentInterface.availableActions = this.determineAvailableActions(
      this.currentInterface.currentState,
      this.currentInterface.location
    );
    this.currentInterface.todayStats = await this.getTodayStats(employeeId);
  }

  private static async getCurrentState(employeeId: string): Promise<any> {
    // This would call the time service API
    return 'clocked_out';
  }

  private static async getCurrentShift(employeeId: string): Promise<any> {
    // This would call the scheduling service API
    return null;
  }

  private static async getTodayStats(employeeId: string): Promise<any> {
    // This would calculate stats from today's events
    return {
      hoursWorked: 0,
      breaksTaken: 0,
      overtimeHours: 0,
    };
  }

  private static async getEmployeeId(): Promise<string> {
    return localStorage.getItem('employee_id') || 'unknown';
  }

  private static async getAuthToken(): Promise<string> {
    return localStorage.getItem('auth_token') || '';
  }
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
}
