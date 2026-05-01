import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function setupPushNotifications(uid: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  // Register the FCM service worker and send it the firebase config
  const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'FIREBASE_CONFIG',
      config: firebaseConfig,
    });
  }

  try {
    const messaging = getMessaging();
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (token) {
      await setDoc(doc(db, 'users', uid), { fcmToken: token }, { merge: true });
    }

    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification ?? {};
      new Notification(title ?? 'EchoMap', {
        body: body ?? 'An Echo is nearby!',
        icon: '/icons/icon-192.svg',
      });
    });
  } catch {
    // FCM setup fails in dev without HTTPS/VAPID — safe to swallow
  }
}

export function showLocalNotification(title: string, body: string, tag: string): void {
  if (Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/icons/icon-192.svg', tag });
}
