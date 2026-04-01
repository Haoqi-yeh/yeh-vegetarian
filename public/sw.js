// Service Worker for Web Push notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '吃素日提醒 🌿';
  const options = {
    body: data.body || '今天是農曆初一或十五，記得吃素喔！',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'vegetarian-reminder',
    requireInteraction: true,
    actions: [
      { action: 'find-restaurant', title: '找素食餐廳' },
      { action: 'dismiss', title: '知道了' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'find-restaurant') {
    event.waitUntil(
      self.clients.openWindow('/?tab=map')
    );
  } else {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});
