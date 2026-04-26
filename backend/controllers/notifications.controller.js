import User from '../models/user.model.js';
import { getVapidPublicKey } from '../utils/push.js';

export const getPublicVapidKey = (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(500).json({ message: 'Push notifications are not configured on the server.' });
  }
  res.status(200).json({ publicKey });
};

export const subscribePush = async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Subscription payload is required.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.pushSubscriptions = user.pushSubscriptions || [];
    const exists = user.pushSubscriptions.some((sub) => sub.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    res.status(201).json({ message: 'Push subscription saved.' });
  } catch (error) {
    console.error('subscribePush error:', error);
    res.status(500).json({ message: 'Failed to save push subscription.' });
  }
};

export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Subscription endpoint is required.' });
    }

    await User.findByIdAndUpdate(req.userId, {
      $pull: {
        pushSubscriptions: { endpoint }
      }
    });

    res.status(200).json({ message: 'Push subscription removed.' });
  } catch (error) {
    console.error('unsubscribePush error:', error);
    res.status(500).json({ message: 'Failed to remove push subscription.' });
  }
};
