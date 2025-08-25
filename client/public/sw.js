// Minimal Service Worker - Production Safety
// Prevents stale HTML/assets and clears old caches

self.addEventListener('install', () => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clear ALL caches to prevent stale assets
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    
    // Take control of all clients immediately
    await self.clients.claim();
  })());
});

// No fetch handler = network default (no stale index.html or assets)
// This ensures fresh content on every request