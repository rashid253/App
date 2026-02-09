// ===== FIXED SERVICE WORKER REGISTRATION =====
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    console.log('Registering Service Worker...');
    
    // Wait for page to load
    window.addEventListener('load', function() {
      // First, check if we need to clean old service workers
      navigator.serviceWorker.getRegistrations().then(registrations => {
        // Unregister ALL old service workers
        for (let registration of registrations) {
          registration.unregister();
          console.log('Unregistered old service worker');
        }
        
        // Clear ALL caches
        return caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log('Deleting cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        });
      }).then(() => {
        // Wait a bit before registering new one
        setTimeout(() => {
          // Register NEW service worker
          navigator.serviceWorker.register('./sw.js', {
            scope: './',
            updateViaCache: 'none'
          })
          .then(registration => {
            console.log('✅ Service Worker registered successfully!');
            console.log('Scope:', registration.scope);
            
            // Force it to activate immediately
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
              console.log('New service worker found!');
              const newWorker = registration.installing;
              
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New content available!');
                  showNotification('🔄 App updated! Please refresh.');
                }
              });
            });
          })
          .catch(error => {
            console.log('❌ Service Worker registration failed:', error);
            showNotification('⚠️ PWA features limited. Please refresh page.');
          });
        }, 500);
      }).catch(error => {
        console.log('Error during cleanup:', error);
      });
    });
  } else {
    console.log('❌ Service Worker not supported');
  }
}
