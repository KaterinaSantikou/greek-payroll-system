/**
 * Sync Service - Handles offline-to-online synchronization
 * Manages conflict resolution and background sync operations
 */

import {
  offlineStorage,
  type OfflinePunchEvent,
  type SyncQueueItem,
} from './offlineStorage';
import { apiRequest } from './queryClient';

interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  conflicts: Array<{
    id: string;
    type: string;
    localData: any;
    serverData: any;
  }>;
}

interface ConflictResolution {
  id: string;
  resolution: 'use_local' | 'use_server' | 'merge';
  mergedData?: any;
}

class SyncService {
  private syncInProgress = false;
  private retryIntervals = [1000, 5000, 15000, 30000, 60000]; // Progressive retry delays
  private maxRetries = 5;

  // Main sync method - called when app comes online
  async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return { success: false, syncedItems: 0, failedItems: 0, conflicts: [] };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      conflicts: [],
    };

    try {
      // Sync punch events first
      const punchResult = await this.syncPunchEvents();
      result.syncedItems += punchResult.syncedItems;
      result.failedItems += punchResult.failedItems;
      result.conflicts.push(...punchResult.conflicts);

      // Sync payroll previews
      const payrollResult = await this.syncPayrollPreviews();
      result.syncedItems += payrollResult.syncedItems;
      result.failedItems += payrollResult.failedItems;

      // Process sync queue
      const queueResult = await this.processSyncQueue();
      result.syncedItems += queueResult.syncedItems;
      result.failedItems += queueResult.failedItems;
    } catch (error) {
      console.error('Sync failed:', error);
      result.success = false;
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  // Sync punch events with conflict detection
  private async syncPunchEvents(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      conflicts: [],
    };

    try {
      const pendingEvents = await offlineStorage.getPendingPunchEvents();

      for (const event of pendingEvents) {
        try {
          // Check if event already exists on server (potential conflict)
          const existingEvent = await this.checkServerEventExists(event);

          if (existingEvent) {
            // Conflict detected
            result.conflicts.push({
              id: event.clientEventId,
              type: 'punch_event',
              localData: event,
              serverData: existingEvent,
            });
            continue;
          }

          // Upload to server
          const serverResponse = await apiRequest('POST', '/api/punch-events', {
            employeeId: event.employeeId,
            propertyId: event.propertyId,
            timestamp: event.timestamp,
            type: event.type,
            method: event.method,
            latitude: event.latitude,
            longitude: event.longitude,
            sourceDeviceId: event.sourceDeviceId,
            clientEventId: event.clientEventId,
            offlineFlag: true,
          });

          // Mark as synced
          await offlineStorage.updatePunchEventSyncStatus(
            event.clientEventId,
            'synced'
          );
          result.syncedItems++;
        } catch (error) {
          console.error(
            `Failed to sync punch event ${event.clientEventId}:`,
            error
          );
          await offlineStorage.updatePunchEventSyncStatus(
            event.clientEventId,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );
          result.failedItems++;
        }
      }
    } catch (error) {
      console.error('Failed to sync punch events:', error);
      result.success = false;
    }

    return result;
  }

  // Check if event exists on server (for conflict detection)
  private async checkServerEventExists(
    event: OfflinePunchEvent
  ): Promise<any | null> {
    try {
      const response = await fetch(`/api/punch-events/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: event.employeeId,
          timestamp: event.timestamp,
          type: event.type,
          clientEventId: event.clientEventId,
        }),
      });

      if (!response.ok) {
        throw new Error('Check failed');
      }

      const data = await response.json();
      return data.exists ? data.event : null;
    } catch (error) {
      // If check fails, assume no conflict
      return null;
    }
  }

  // Sync payroll previews (refresh from server)
  private async syncPayrollPreviews(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      conflicts: [],
    };

    try {
      const previews = await offlineStorage.getAllPayrollPreviews();

      for (const preview of previews) {
        try {
          // Fetch fresh data from server
          const response = await fetch(
            `/api/payroll/preview/${preview.payPeriod}`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch payroll preview');
          }

          const freshData = await response.json();

          // Update local cache
          await offlineStorage.savePayrollPreview({
            ...preview,
            employeeData: freshData.employeeData,
            calculations: freshData.calculations,
            syncStatus: 'synced',
            lastSync: new Date().toISOString(),
          });

          result.syncedItems++;
        } catch (error) {
          console.error(
            `Failed to sync payroll preview ${preview.previewId}:`,
            error
          );
          result.failedItems++;
        }
      }
    } catch (error) {
      console.error('Failed to sync payroll previews:', error);
      result.success = false;
    }

    return result;
  }

  // Process sync queue for other operations
  private async processSyncQueue(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      conflicts: [],
    };

    try {
      const queueItems = await offlineStorage.getSyncQueue();

      for (const item of queueItems) {
        if (item.attempts >= this.maxRetries) {
          console.warn(`Max retries reached for sync item ${item.id}`);
          continue;
        }

        try {
          await this.processSyncQueueItem(item);
          await offlineStorage.removeSyncQueueItem(item.id);
          result.syncedItems++;
        } catch (error) {
          const nextAttempt = item.attempts + 1;
          const delay =
            this.retryIntervals[
              Math.min(nextAttempt - 1, this.retryIntervals.length - 1)
            ];

          await offlineStorage.updateSyncQueueItem(item.id, {
            attempts: nextAttempt,
            lastAttempt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Schedule retry
          setTimeout(() => this.processSyncQueueItem(item), delay);
          result.failedItems++;
        }
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
      result.success = false;
    }

    return result;
  }

  // Process individual sync queue item
  private async processSyncQueueItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'punch_event':
        const response = await fetch('/api/punch-events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data),
        });
        if (!response.ok) {
          throw new Error('Failed to sync punch event');
        }
        break;

      case 'employee_data':
        const empResponse = await fetch(
          `/api/employees/${item.data.employeeId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data),
          }
        );
        if (!empResponse.ok) {
          throw new Error('Failed to sync employee data');
        }
        break;

      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  // Resolve conflicts manually
  async resolveConflicts(resolutions: ConflictResolution[]): Promise<void> {
    for (const resolution of resolutions) {
      try {
        switch (resolution.resolution) {
          case 'use_local':
            // Re-queue local data for sync
            await offlineStorage.addToSyncQueue('punch_event', resolution.id);
            break;

          case 'use_server':
            // Mark local as synced (server wins)
            await offlineStorage.updatePunchEventSyncStatus(
              resolution.id,
              'synced'
            );
            break;

          case 'merge':
            // Use merged data
            if (resolution.mergedData) {
              const response = await fetch(
                '/api/punch-events/resolve-conflict',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    clientEventId: resolution.id,
                    resolvedData: resolution.mergedData,
                  }),
                }
              );

              if (!response.ok) {
                throw new Error('Failed to resolve conflict');
              }

              await offlineStorage.updatePunchEventSyncStatus(
                resolution.id,
                'synced'
              );
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to resolve conflict ${resolution.id}:`, error);
      }
    }
  }

  // Background sync - called periodically when online
  async backgroundSync(): Promise<void> {
    if (!navigator.onLine || this.syncInProgress) return;

    try {
      const queueItems = await offlineStorage.getSyncQueue();
      if (queueItems.length > 0) {
        console.log(`Background sync: ${queueItems.length} items in queue`);
        await this.syncAll();
      }
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  // Auto-sync when connectivity is restored
  setupAutoSync(): void {
    // Listen for online events
    window.addEventListener('online', () => {
      console.log('Connection restored, starting sync...');
      this.syncAll().then(result => {
        console.log('Auto-sync completed:', result);

        // Dispatch custom event for UI updates
        window.dispatchEvent(
          new CustomEvent('syncCompleted', { detail: result })
        );
      });
    });

    // Periodic background sync (every 5 minutes when online)
    setInterval(
      () => {
        if (navigator.onLine) {
          this.backgroundSync();
        }
      },
      5 * 60 * 1000
    );

    // Sync on page visibility change (when app regains focus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.backgroundSync();
      }
    });
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingItems: number;
    lastSync: string | null;
    hasConflicts: boolean;
  }> {
    const stats = await offlineStorage.getStorageStats();
    const pendingEvents = await offlineStorage.getPendingPunchEvents();
    const queueItems = await offlineStorage.getSyncQueue();

    return {
      isOnline: navigator.onLine,
      pendingItems: pendingEvents.length + queueItems.length,
      lastSync: localStorage.getItem('lastSyncTime'),
      hasConflicts: pendingEvents.some(e => e.syncStatus === 'conflict'),
    };
  }

  // Force sync (user initiated)
  async forcSync(): Promise<SyncResult> {
    console.log('Force sync initiated...');
    const result = await this.syncAll();

    if (result.success) {
      localStorage.setItem('lastSyncTime', new Date().toISOString());
    }

    return result;
  }
}

// Singleton instance
export const syncService = new SyncService();

// Auto-setup sync listeners
syncService.setupAutoSync();

export type { SyncResult, ConflictResolution };
