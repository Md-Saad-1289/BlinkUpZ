import { serverUrl } from '../config.js';

// Notification utility for managing push notifications

const NOTIFICATION_PERMISSION_KEY = 'blinkupz_notification_permission';

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, permission);
  return permission === 'granted';
};

// Get current permission status
export const getNotificationPermission = () => {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Show a local notification (for when app is in foreground)
export const showLocalNotification = (title, body, icon = '/logo.png', onClick) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon,
      badge: icon,
      vibrate: [100, 50, 100],
      tag: 'blinkupz-message',
      requireInteraction: true
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }
  return null;
};

const getVapidPublicKey = async () => {
  const response = await fetch(`${serverUrl}/api/user/notifications/public-key`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch VAPID public key');
  }
  const data = await response.json();
  return data.publicKey;
};

const sendSubscriptionToServer = async (subscription) => {
  await fetch(`${serverUrl}/api/user/notifications/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(subscription)
  });
};

const removeSubscriptionFromServer = async (endpoint) => {
  await fetch(`${serverUrl}/api/user/notifications/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ endpoint })
  });
};

// Register service worker for push
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Subscribe to push notifications
const subscribeToPush = async (registration) => {
  try {
    const vapidPublicKey = await getVapidPublicKey();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    await sendSubscriptionToServer(subscription);
    console.log('Push subscription successful');
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
};

// Helper to convert VAPID key
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Request permission and show test notification
export const enableNotifications = async () => {
  const granted = await requestNotificationPermission();
  if (granted) {
    const registration = await registerServiceWorker();
    if (registration) {
      await subscribeToPush(registration);
    }
    showLocalNotification('Notifications Enabled', 'You will now receive message notifications!');
  }
  return granted;
};

// Disable notifications
export const disableNotifications = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      try {
        await removeSubscriptionFromServer(subscription.endpoint);
      } catch (error) {
        console.error('Failed to remove push subscription from server:', error);
      }

      try {
        await subscription.unsubscribe();
      } catch (error) {
        console.error('Failed to unsubscribe from push:', error);
      }
    }
  }

  localStorage.removeItem(NOTIFICATION_PERMISSION_KEY);
};

export default {
  isPushSupported,
  requestNotificationPermission,
  getNotificationPermission,
  showLocalNotification,
  registerServiceWorker,
  enableNotifications,
  disableNotifications
};