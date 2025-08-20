// Service Worker for Greek Internet Speed Optimization
// Aggressive caching strategy for sub-2 second loads

const CACHE_NAME = 'payrollsync-v1';
const GREEK_OPTIMIZATION_CACHE = 'greek-assets-v1';

// Critical resources to cache immediately for Greek users
const CRITICAL_RESOURCES = [
  '/',
  '/css/critical.css',
  '/js/essential.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

// Greek payroll specific routes to cache aggressively
const PAYROLL_ROUTES = [
  '/dashboard',
  '/employees',
  '/payroll',
  '/ergani-compliance',
  '/error-tracking',
  '/zero-trust-security',
];

// Static assets that benefit from long-term caching
const STATIC_ASSETS = [
  '/images/logos/',
  '/images/icons/',
  '.js',
  '.css',
  '.woff2',
  '.woff',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache critical resources immediately
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // Cache Greek-specific assets
      caches.open(GREEK_OPTIMIZATION_CACHE).then((cache) => {
        return cache.addAll(PAYROLL_ROUTES.map(route => route));
      })
    ])
  );
  
  // Skip waiting to activate immediately for performance
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== GREEK_OPTIMIZATION_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Greek internet optimization: Cache-first for static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(GREEK_OPTIMIZATION_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
    return;
  }

  // Network-first for API calls (real-time payroll data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses for offline functionality
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for offline Greek payroll access
          return caches.match(request);
        })
    );
    return;
  }

  // Stale-while-revalidate for HTML pages (fast loading + freshness)
  if (request.destination === 'document') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });

          // Return cached version immediately, update in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Default network-first strategy
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Helper function to identify static assets for aggressive caching
function isStaticAsset(pathname) {
  return STATIC_ASSETS.some(pattern => {
    if (pattern.startsWith('/')) {
      return pathname.startsWith(pattern);
    }
    return pathname.endsWith(pattern);
  });
}

// Background sync for Greek payroll data when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'greek-payroll-sync') {
    event.waitUntil(syncGreekPayrollData());
  }
});

async function syncGreekPayrollData() {
  // Sync critical Greek payroll data when connection is restored
  const payrollEndpoints = [
    '/api/employees',
    '/api/payroll/current',
    '/api/ergani/status',
  ];

  for (const endpoint of payrollEndpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(endpoint, response.clone());
      }
    } catch (error) {
      console.log(`Failed to sync ${endpoint}:`, error);
    }
  }
}

// Push notifications for critical payroll alerts
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'PayrollSync notification',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/badge-72x72.png',
    tag: 'payroll-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard',
        icon: '/images/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/images/icons/dismiss-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('PayrollSync Alert', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});