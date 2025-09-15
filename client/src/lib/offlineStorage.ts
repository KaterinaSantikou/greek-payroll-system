/**
 * Offline Storage Service - IndexedDB wrapper for offline-first mobile operations
 * Handles punch events, payroll previews, and sync queue management
 */

interface OfflinePunchEvent {
  clientEventId: string;
  employeeId: string;
  propertyId: string;
  timestamp: string;
  type: 'in' | 'out' | 'break_in' | 'break_out';
  method: string;
  latitude?: number;
  longitude?: number;
  sourceDeviceId?: string;
  syncStatus: 'pending' | 'synced' | 'failed' | 'conflict';
  syncAttempts: number;
  syncError?: string;
  createdAt: string;
}

interface OfflinePayrollPreview {
  previewId: string;
  payPeriod: string;
  employeeData: any[];
  calculations: any;
  syncStatus: 'pending' | 'synced' | 'outdated';
  lastSync: string;
  createdAt: string;
}

interface SyncQueueItem {
  id: string;
  type: 'punch_event' | 'payroll_preview' | 'employee_data';
  data: any;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'PayrollSyncOffline';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Punch Events Store
        if (!db.objectStoreNames.contains('punchEvents')) {
          const punchStore = db.createObjectStore('punchEvents', {
            keyPath: 'clientEventId',
          });
          punchStore.createIndex('employeeId', 'employeeId');
          punchStore.createIndex('timestamp', 'timestamp');
          punchStore.createIndex('syncStatus', 'syncStatus');
        }

        // Payroll Previews Store
        if (!db.objectStoreNames.contains('payrollPreviews')) {
          const payrollStore = db.createObjectStore('payrollPreviews', {
            keyPath: 'previewId',
          });
          payrollStore.createIndex('payPeriod', 'payPeriod');
          payrollStore.createIndex('syncStatus', 'syncStatus');
        }

        // Sync Queue Store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
          });
          syncStore.createIndex('type', 'type');
          syncStore.createIndex('attempts', 'attempts');
        }

        // Employee Cache Store (for offline access)
        if (!db.objectStoreNames.contains('employeeCache')) {
          const empStore = db.createObjectStore('employeeCache', {
            keyPath: 'employeeId',
          });
          empStore.createIndex('propertyId', 'defaultPropertyId');
          empStore.createIndex('lastSync', 'lastSync');
        }

        // App Settings Store
        if (!db.objectStoreNames.contains('appSettings')) {
          db.createObjectStore('appSettings', { keyPath: 'key' });
        }
      };
    });
  }

  // Punch Events Methods
  async savePunchEvent(event: OfflinePunchEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['punchEvents'], 'readwrite');
    const store = transaction.objectStore('punchEvents');

    await new Promise<void>((resolve, reject) => {
      const request = store.put(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add to sync queue if offline
    if (!navigator.onLine) {
      await this.addToSyncQueue('punch_event', event);
    }
  }

  async getPendingPunchEvents(): Promise<OfflinePunchEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['punchEvents'], 'readonly');
    const store = transaction.objectStore('punchEvents');
    const index = store.index('syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updatePunchEventSyncStatus(
    clientEventId: string,
    status: 'synced' | 'failed' | 'conflict',
    error?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['punchEvents'], 'readwrite');
    const store = transaction.objectStore('punchEvents');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(clientEventId);
      getRequest.onsuccess = () => {
        const event = getRequest.result;
        if (event) {
          event.syncStatus = status;
          event.syncAttempts = (event.syncAttempts || 0) + 1;
          if (error) event.syncError = error;

          const putRequest = store.put(event);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Event not found, might have been synced already
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Payroll Preview Methods
  async savePayrollPreview(preview: OfflinePayrollPreview): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['payrollPreviews'], 'readwrite');
    const store = transaction.objectStore('payrollPreviews');

    return new Promise<void>((resolve, reject) => {
      const request = store.put(preview);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPayrollPreview(
    payPeriod: string
  ): Promise<OfflinePayrollPreview | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['payrollPreviews'], 'readonly');
    const store = transaction.objectStore('payrollPreviews');
    const index = store.index('payPeriod');

    return new Promise((resolve, reject) => {
      const request = index.get(payPeriod);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPayrollPreviews(): Promise<OfflinePayrollPreview[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['payrollPreviews'], 'readonly');
    const store = transaction.objectStore('payrollPreviews');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue Methods
  async addToSyncQueue(type: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const queueItem: SyncQueueItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      data,
      attempts: 0,
    };

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise<void>((resolve, reject) => {
      const request = store.put(queueItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueItem(
    id: string,
    updates: Partial<SyncQueueItem>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          Object.assign(item, updates);
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Employee Cache Methods
  async cacheEmployee(employee: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const employeeWithSync = {
      ...employee,
      lastSync: new Date().toISOString(),
    };

    const transaction = this.db.transaction(['employeeCache'], 'readwrite');
    const store = transaction.objectStore('employeeCache');

    return new Promise<void>((resolve, reject) => {
      const request = store.put(employeeWithSync);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedEmployee(employeeId: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['employeeCache'], 'readonly');
    const store = transaction.objectStore('employeeCache');

    return new Promise((resolve, reject) => {
      const request = store.get(employeeId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Utility Methods
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stores = [
      'punchEvents',
      'payrollPreviews',
      'syncQueue',
      'employeeCache',
      'appSettings',
    ];
    const transaction = this.db.transaction(stores, 'readwrite');

    await Promise.all(
      stores.map(storeName => {
        return new Promise<void>((resolve, reject) => {
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );
  }

  async getStorageStats(): Promise<{
    punchEvents: number;
    payrollPreviews: number;
    syncQueue: number;
    cachedEmployees: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(
      ['punchEvents', 'payrollPreviews', 'syncQueue', 'employeeCache'],
      'readonly'
    );

    const counts = await Promise.all([
      this.getStoreCount(transaction.objectStore('punchEvents')),
      this.getStoreCount(transaction.objectStore('payrollPreviews')),
      this.getStoreCount(transaction.objectStore('syncQueue')),
      this.getStoreCount(transaction.objectStore('employeeCache')),
    ]);

    return {
      punchEvents: counts[0],
      payrollPreviews: counts[1],
      syncQueue: counts[2],
      cachedEmployees: counts[3],
    };
  }

  private getStoreCount(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorageService();

// Auto-initialize when the module is loaded
offlineStorage.init().catch(console.error);

export type { OfflinePunchEvent, OfflinePayrollPreview, SyncQueueItem };
