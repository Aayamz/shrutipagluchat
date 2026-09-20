const CACHE_NAME = 'shrutipagluchat-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/chat',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

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

// Store active chat info per client
const activeChats = new Map();

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_ACTIVE_CHAT') {
    const clientId = event.source.id;
    activeChats.set(clientId, {
      conversationId: event.data.conversationId,
      focused: Boolean(event.data.focused),
    });
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
          const clientChatInfo = activeChats.get(client.id);
          // Suppress notification if user is actively viewing this exact conversation
          if (
            client.visibilityState === 'visible' &&
            client.focused &&
            clientChatInfo &&
            clientChatInfo.conversationId === targetConversationId &&
            clientChatInfo.focused
          ) {
            shouldSuppressNotification = true;
            break;
          }
        }

        if (shouldSuppressNotification) {
          return; // Do NOT pop notification when active chat is focused!
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
    console.error('Error parsing push event data:', err);
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
