// GeoStrat Service Worker v1.0
// Caches game assets for offline play

const CACHE_NAME = 'geostrat-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/game.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&display=swap'
];

// Install — cache all core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', event => {
  // Skip non-GET and API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('api.anthropic.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: return cached version
        return caches.match(event.request)
          .then(cached => cached || caches.match('/game.html'));
      })
  );
});

// Background sync for multiplayer state (future)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-game-state') {
    event.waitUntil(syncGameState());
  }
});

async function syncGameState() {
  // Placeholder for future real-time sync
  console.log('[GeoStrat SW] Syncing game state...');
}

// Push notifications for war alerts (future)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '⚠ GEOSTRAT ALERT';
  const options = {
    body: data.body || 'Your NSC requires attention.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'geostrat-alert',
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || '/game.html' },
    actions: [
      { action: 'enter', title: '▶ Enter War Room' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action !== 'dismiss') {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
