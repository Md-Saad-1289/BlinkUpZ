// Notification utility for managing push notifications

const NOTIFICATION_PERMISSION_KEY = 'blinkupz_notification_permission';

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator;
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

// Register service worker for push
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Check for push subscription
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        // Subscribe to push notifications
        await subscribeToPush(registration);
      }
      
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
    // Note: In production, you would get this from your server
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    
    // Send subscription to server
    // await fetch('/api/notifications/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription)
    // });
    
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
    await registerServiceWorker();
    showLocalNotification('Notifications Enabled', 'You will now receive message notifications!');
  }
  return granted;
};

// Disable notifications
export const disableNotifications = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
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