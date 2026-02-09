// Service Worker for Digital Business App
const CACHE_NAME = 'digital-business-app-v3';
const urlsToCache = [
  './',
  './card.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap',
  'https://unpkg.com/@supabase/supabase-js@2'
];

// Install event
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing v3...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache opened:', CACHE_NAME);
        return cache.addAll(urlsToCache).catch(error => {
          console.log('[Service Worker] Cache addAll error:', error);
          // Cache individual files if addAll fails
          return Promise.all(
            urlsToCache.map(url => {
              return cache.add(url).catch(err => {
                console.log(`[Service Worker] Failed to cache ${url}:`, err);
              });
            })
          );
        });
      })
      .then(() => {
        console.log('[Service Worker] All resources pre-cached');
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating v3...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network first, then cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  const requestUrl = new URL(event.request.url);
  
  // Skip Supabase and external API calls
  if (requestUrl.hostname.includes('supabase.co')) {
    return;
  }
  
  // Skip external fonts and CDNs (let browser handle them)
  if (requestUrl.hostname.includes('fonts.googleapis.com') ||
      requestUrl.hostname.includes('fonts.gstatic.com') ||
      requestUrl.hostname.includes('cdnjs.cloudflare.com') ||
      requestUrl.hostname.includes('unpkg.com')) {
    return;
  }
  
  // For same-origin requests, try network first, then cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If valid response, cache it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            
            // If not in cache and it's an HTML request, return card.html
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./card.html');
            }
            
            // Return offline page for HTML requests
            if (event.request.destination === 'document' ||
                event.request.url.endsWith('.html') ||
                event.request.url === self.location.origin + '/' ||
                event.request.url.includes('card.html')) {
              return caches.match('./card.html');
            }
            
            // For other requests, return error
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received:', event);
  
  const title = 'Digital Business App';
  const options = {
    body: 'You have a new notification!',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: './card.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  const urlToOpen = new URL('./card.html', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Check if there's already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background sync
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Message event for updates
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});

// Function to sync orders (placeholder)
function syncOrders() {
  return Promise.resolve();
}

// Periodic sync (optional)
self.addEventListener('periodicsync', event => {
  console.log('[Service Worker] Periodic sync:', event.tag);
});
