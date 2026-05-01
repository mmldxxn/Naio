// Firebase Messaging Service Worker
// Handles background push notifications from FCM

importScripts('https://www.gstatic.com/firebasejs/11.5.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.5.0/firebase-messaging-compat.js');

// Firebase config is injected at runtime via the main app's messaging setup.
// This SW receives the config via postMessage from the main thread.
let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    firebase.initializeApp(event.data.config);
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const { title, body, icon } = payload.notification ?? {};
      self.registration.showNotification(title ?? 'EchoMap', {
        body: body ?? 'An Echo is nearby!',
        icon: icon ?? '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        tag: payload.data?.echoId ?? 'echomap-notification',
        data: payload.data,
      });
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const echoId = event.notification.data?.echoId;
  const url = echoId ? `/map?echo=${echoId}` : '/map';
  event.waitUntil(clients.openWindow(url));
});
