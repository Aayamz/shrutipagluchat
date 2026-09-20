const CACHE_NAME = 'shrutipagluchat-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/chat',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Track active conversation per client
const activeChats = new Map();

function getClientId(client) {
  return client.id || client.url;
}

// Install Event - cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event - receive messages from clients (e.g., SET_ACTIVE_CHAT)
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  const { type, conversationId, focused } = event.data;

  if (type === 'SET_ACTIVE_CHAT') {
    const clientId = event.source?.id || 'unknown';
    if (focused && conversationId) {
      activeChats.set(clientId, conversationId);
    } else {
      activeChats.delete(clientId);
    }
  }
});

// Push Event - receive Web Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const targetConversationId = data.conversationId;

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        let shouldSuppressNotification = false;

        for (let client of windowClients) {
          // Suppress notification if tab is visible AND currently viewing targetConversationId
          // Check both URL and tracked activeChats state (more reliable for SPA navigation)
          const clientId = client.id || client.url;
          const trackedChat = activeChats.get(clientId);
          const urlMatches = targetConversationId && client.url.includes(`c=${targetConversationId}`);

          if (
            client.visibilityState === 'visible' &&
            targetConversationId &&
            (trackedChat === targetConversationId || urlMatches)
          ) {
            shouldSuppressNotification = true;
            break;
          }
        }

        if (shouldSuppressNotification) {
          return; // Suppress notification when tab is actively focused on this conversation!
        }

        const title = data.title || 'ShrutiPagluChat';
        const options = {
          body: data.body || 'New message received',
          icon: data.icon || '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [100, 50, 100],
          data: {
            url: data.url || `/chat?c=${targetConversationId || ''}`,
          },
          tag: `shrutipagluchat-${targetConversationId || 'general'}`,
          renotify: true,
        };

        return self.registration.showNotification(title, options);
      })
    );
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if open client tab exists
      for (let client of windowClients) {
        if (client.url.includes('/chat') && 'focus' in client) {
          return client.focus();
        }
      }
      // If no tab open, open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Fetch Event - network-first fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and non-API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        return response || caches.match('/');
      });
    })
  );
});