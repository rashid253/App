// Service Worker for Digital Business App - FIXED VERSION
const APP_VERSION = 'v5.0';
const CACHE_NAME = 'business-app-cache-' + APP_VERSION;

// Files to cache immediately
const PRECACHE_FILES = [
  './',
  './card.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install event - Cache essential files
self.addEventListener('install', event => {
  console.log('[SW] Install event v5.0');
  
  // Force the waiting service worker to become active
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(PRECACHE_FILES)
          .then(() => {
            console.log('[SW] All files cached successfully');
          })
          .catch(error => {
            console.log('[SW] Cache error:', error);
          });
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event v5.0');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete all old caches
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network first, cache fallback
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Supabase API calls
  if (request.url.includes('supabase.co')) {
    return;
  }
  
  // For HTML pages - try network first, then cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the response for future
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(error => {
          // Network failed, try cache
          console.log('[SW] Network failed, trying cache:', error);
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return card.html for all HTML requests
              return caches.match('./card.html');
            });
        })
    );
    return;
  }
  
  // For other resources - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Update cache in background
          fetch(request)
            .then(response => {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseClone));
            })
            .catch(() => { /* Ignore background update errors */ });
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Don't cache external resources that failed
            if (!response.ok) return response;
            
            // Cache successful responses
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
            return response;
          })
          .catch(error => {
            console.log('[SW] Fetch failed:', error);
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push received');
  
  const options = {
    body: 'New update from Business App',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: './card.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification
