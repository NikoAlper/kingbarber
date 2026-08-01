importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC8TsniuLodonZfiiSr1Bi0dEGKVZJmVWk",
  authDomain: "kingbarber-d5486.firebaseapp.com",
  projectId: "kingbarber-d5486",
  storageBucket: "kingbarber-d5486.firebasestorage.app",
  messagingSenderId: "1013120080170",
  appId: "1:1013120080170:web:30df53a820d22e4708e653"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'King Barber';
  const body  = payload.notification?.body  || '';
  self.registration.showNotification(title, {
    body,
    icon: './icons/logo-192.png',
    badge: './icons/logo-192.png'
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('admin.html') && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow('./admin.html');
    })
  );
});

const CACHE_NAME = 'king-barber-v9';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.webmanifest',
  './icons/logo-32.png',
  './icons/logo-round-64.png',
  './icons/logo-180.png',
  './icons/logo-192.png',
  './icons/logo-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)
        .then(cached => cached || (event.request.mode === 'navigate'
          ? caches.match('./index.html')
          : Promise.reject(new Error('offline')))))
  );
});
