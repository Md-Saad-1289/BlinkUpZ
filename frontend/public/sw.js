// Service Worker for Push Notifications
const CACHE_NAME = 'blinkupz-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'BlinkUpZ';
  const options = {
    body: data.body || 'You have a new message',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'mark_read', title: 'Mark as Read' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'reply') {
    // Handle reply action
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else if (event.action === 'mark_read') {
    // Handle mark read action
    fetch('/api/chat/messages/seen', {
      method: 'PUT',
      credentials: 'include'
    });
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Handle background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Sync any offline messages when back online
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  for (const request of requests) {
    if (request.url.includes('/api/chat/')) {
      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response);
      }
    }
  }
}