/**
 * PayrollSync Service Worker
 * Provides offline functionality and push notifications
 */

const CACHE_NAME = 'payrollsync-v1.0.0';
const API_CACHE = 'payrollsync-api-v1';

// Critical files for offline functionality
const OFFLINE_ESSENTIALS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Core app shell
  '/static/js/bundle.js',
  '/static/css/main.css',
  // Offline pages
  '/payroll/offline',
  '/time/offline', 
  '/employees/offline'
];

// Greek payroll specific caches
const PAYROLL_DATA = [
  '/api/employees/basic',
  '/api/payroll/current-period',
  '/api/compliance/status',
  '/api/time/recent-punches'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('PayrollSync SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PayrollSync SW: Caching offline essentials');
        return cache.addAll(OFFLINE_ESSENTIALS);
      })
      .then(() => {
        console.log('PayrollSync SW: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('PayrollSync SW: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
              console.log('PayrollSync SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('PayrollSync SW: Taking control');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static resources
  event.respondWith(handleStaticRequest(request));
});

// API request handler - network first, cache fallback
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request);
    
    // Cache successful responses for offline use
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('PayrollSync SW: Network failed, trying cache for:', url.pathname);
    
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'sw-cache');
      return response;
    }
    
    // Return offline API response for critical endpoints
    return getOfflineApiResponse(url.pathname);
  }
}

// Navigation request handler
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('PayrollSync SW: Offline navigation request');
    
    // Return cached page or offline fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return caches.match('/offline.html');
  }
}

// Static resource handler
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    return await fetch(request);
  } catch (error) {
    console.log('PayrollSync SW: Failed to fetch:', request.url);
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Offline API responses for critical functionality
function getOfflineApiResponse(pathname) {
  const offlineData = {
    '/api/employees/basic': {
      employees: [],
      message: 'Employee data not available offline',
      offline: true
    },
    '/api/payroll/current-period': {
      period: 'January 2025',
      status: 'draft',
      message: 'Payroll data cached from last sync',
      offline: true
    },
    '/api/compliance/status': {
      ergani: 'unknown',
      efka: 'unknown', 
      apd: 'unknown',
      message: 'Compliance status not available offline',
      offline: true
    },
    '/api/time/recent-punches': {
      punches: [],
      message: 'Time data not available offline',
      offline: true
    }
  };

  const data = offlineData[pathname] || {
    message: 'This feature requires internet connection',
    offline: true
  };

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'X-Served-By': 'sw-offline'
    }
  });
}

// Background sync for Greek payroll deadlines
self.addEventListener('sync', (event) => {
  console.log('PayrollSync SW: Background sync triggered');
  
  if (event.tag === 'payroll-deadline-sync') {
    event.waitUntil(syncPayrollDeadlines());
  }
  
  if (event.tag === 'ergani-sync') {
    event.waitUntil(syncErganiStatus());
  }
});

// Push notification handler for Greek compliance alerts
self.addEventListener('push', (event) => {
  console.log('PayrollSync SW: Push notification received');
  
  const options = {
    body: 'PayrollSync notification',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/images/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/images/action-dismiss.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    
    // Greek payroll specific notifications
    if (payload.type === 'ergani-deadline') {
      options.title = 'ΕΡΓΑΝΗ ΙΙ Deadline Reminder';
      options.body = payload.message || 'ERGANI II filing is due soon';
      options.tag = 'ergani-deadline';
      options.requireInteraction = true;
    } else if (payload.type === 'payroll-ready') {
      options.title = 'Payroll Ready for Review';
      options.body = payload.message || 'Monthly payroll calculations complete';
      options.tag = 'payroll-ready';
    } else if (payload.type === 'efka-reminder') {
      options.title = 'ΕΦΚΑ Payment Due';
      options.body = payload.message || 'Social security contributions payment due';
      options.tag = 'efka-reminder';
      options.requireInteraction = true;
    } else {
      options.title = payload.title || 'PayrollSync';
      options.body = payload.body || 'New notification';
    }
  }

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('PayrollSync SW: Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const tag = event.notification.tag;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Route to appropriate page based on notification type
  let targetUrl = '/';
  
  if (tag === 'ergani-deadline') {
    targetUrl = '/compliance/ergani';
  } else if (tag === 'payroll-ready') {
    targetUrl = '/payroll/review';
  } else if (tag === 'efka-reminder') {
    targetUrl = '/compliance/efka';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Sync payroll deadlines with Greek calendar
async function syncPayrollDeadlines() {
  try {
    console.log('PayrollSync SW: Syncing Greek payroll deadlines');
    
    // Fetch Greek payroll calendar
    const response = await fetch('/api/compliance/greek-calendar');
    
    if (response.ok) {
      const deadlines = await response.json();
      
      // Schedule notifications for upcoming deadlines
      deadlines.forEach(deadline => {
        if (deadline.daysUntil <= 7 && deadline.daysUntil > 0) {
          scheduleDeadlineNotification(deadline);
        }
      });
    }
  } catch (error) {
    console.error('PayrollSync SW: Failed to sync deadlines:', error);
  }
}

// Sync ERGANI status
async function syncErganiStatus() {
  try {
    console.log('PayrollSync SW: Syncing ERGANI status');
    
    const response = await fetch('/api/compliance/ergani/status');
    
    if (response.ok) {
      const status = await response.json();
      
      // Cache for offline use
      const cache = await caches.open(API_CACHE);
      cache.put('/api/compliance/status', new Response(JSON.stringify(status)));
      
      // Notify if action required
      if (status.requiresAction) {
        self.registration.showNotification('ΕΡΓΑΝΗ ΙΙ Action Required', {
          body: status.message,
          icon: '/images/icon-192x192.png',
          tag: 'ergani-action'
        });
      }
    }
  } catch (error) {
    console.error('PayrollSync SW: Failed to sync ERGANI:', error);
  }
}

// Schedule deadline notification
function scheduleDeadlineNotification(deadline) {
  const now = Date.now();
  const notificationTime = deadline.date - (2 * 24 * 60 * 60 * 1000); // 2 days before
  
  if (notificationTime > now) {
    setTimeout(() => {
      self.registration.showNotification(`${deadline.type} Deadline`, {
        body: `Due: ${deadline.description}`,
        icon: '/images/icon-192x192.png',
        tag: `deadline-${deadline.id}`,
        requireInteraction: true
      });
    }, notificationTime - now);
  }
}