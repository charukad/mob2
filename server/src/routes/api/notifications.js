const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationSettings,
  updateNotificationSettings,
  resetNotificationSettings,
  registerDevice
} = require('../../controllers/notifications');

// Base route: /api/notifications

// Get notifications and handle unread count
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);

// Mark notifications as read
router.patch('/:id/read', protect, markAsRead);
router.patch('/read-all', protect, markAllAsRead);

// Delete notifications
router.delete('/:id', protect, deleteNotification);
router.delete('/clear-all', protect, clearAllNotifications);

// Notification settings
router.get('/settings', protect, getNotificationSettings);
router.put('/settings', protect, updateNotificationSettings);
router.post('/settings/reset', protect, resetNotificationSettings);

// Device registration for push notifications
router.post('/register-device', protect, registerDevice);

module.exports = router;