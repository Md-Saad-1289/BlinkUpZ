import webpush from 'web-push';
import User from '../models/user.model.js';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@blinkupz.com';
const pushEnabled = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('Web Push is not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.');
}

export const getVapidPublicKey = () => vapidPublicKey;

export const isPushEnabled = () => pushEnabled;

export const sendPushNotification = async (userId, payload) => {
  if (!pushEnabled) return;

  const user = await User.findById(userId).select('pushSubscriptions');
  if (!user || !Array.isArray(user.pushSubscriptions) || user.pushSubscriptions.length === 0) {
    return;
  }

  const invalidEndpoints = [];

  await Promise.all(user.pushSubscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      console.error('Push send failed for', userId, error.statusCode || error.message || error);
      if (error.statusCode === 410 || error.statusCode === 404) {
        invalidEndpoints.push(subscription.endpoint);
      }
    }
  }));

  if (invalidEndpoints.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $pull: {
        pushSubscriptions: { endpoint: { $in: invalidEndpoints } }
      }
    });
  }
};
