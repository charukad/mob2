const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');
const User = require('../models/User');
const errorResponse = require('../utils/errorResponse');
const pushService = require('../services/push');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50);
    
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false 
    });
    
    res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false 
    });
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return next(
        new errorResponse('Notification not found', 404)
      );
    }
    
    // Make sure user owns notification
    if (notification.user.toString() !== req.user.id) {
      return next(
        new errorResponse('Not authorized to update this notification', 401)
      );
    }
    
    notification.read = true;
    await notification.save();
    
    res.status(200).json({
      success: true,
      id: notification._id,
      read: notification.read
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return next(
        new errorResponse('Notification not found', 404)
      );
    }
    
    // Make sure user owns notification
    if (notification.user.toString() !== req.user.id) {
      return next(
        new errorResponse('Not authorized to delete this notification', 401)
      );
    }
    
    await notification.remove();
    
    res.status(200).json({
      success: true,
      id: req.params.id
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear all notifications
// @route   DELETE /api/notifications/clear-all
// @access  Private
exports.clearAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get notification settings
// @route   GET /api/notifications/settings
// @access  Private
exports.getNotificationSettings = async (req, res, next) => {
  try {
    let settings = await NotificationSettings.findOne({ 
      user: req.user.id 
    });
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await NotificationSettings.create({
        user: req.user.id
      });
    }
    
    res.status(200).json({
      success: true,
      ...settings.toObject()
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update notification settings
// @route   PUT /api/notifications/settings
// @access  Private
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    let settings = await NotificationSettings.findOne({ 
      user: req.user.id 
    });
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await NotificationSettings.create({
        user: req.user.id,
        ...req.body
      });
    } else {
      // Update settings
      settings = await NotificationSettings.findOneAndUpdate(
        { user: req.user.id },
        req.body,
        { new: true, runValidators: true }
      );
    }
    
    res.status(200).json({
      success: true,
      ...settings.toObject()
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset notification settings to defaults
// @route   POST /api/notifications/settings/reset
// @access  Private
exports.resetNotificationSettings = async (req, res, next) => {
  try {
    // Delete current settings
    await NotificationSettings.findOneAndDelete({ 
      user: req.user.id 
    });
    
    // Create new settings with defaults
    const settings = await NotificationSettings.create({
      user: req.user.id
    });
    
    res.status(200).json({
      success: true,
      ...settings.toObject()
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Register device for push notifications
// @route   POST /api/notifications/register-device
// @access  Private
exports.registerDevice = async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    
    if (!token || !platform) {
      return next(
        new errorResponse('Token and platform are required', 400)
      );
    }
    
    let settings = await NotificationSettings.findOne({ 
      user: req.user.id 
    });
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await NotificationSettings.create({
        user: req.user.id,
        deviceTokens: [{
          token,
          platform,
          lastUsed: new Date()
        }]
      });
    } else {
      // Check if token already exists
      const tokenExists = settings.deviceTokens.find(
        device => device.token === token
      );
      
      if (tokenExists) {
        // Update last used timestamp
        tokenExists.lastUsed = new Date();
      } else {
        // Add new token
        settings.deviceTokens.push({
          token,
          platform,
          lastUsed: new Date()
        });
      }
      
      await settings.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Device registered successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a notification (internal use only)
// @access  Private (internal)
exports.createNotification = async (
  userId, 
  message, 
  type, 
  options = {}
) => {
  try {
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Get user's notification settings
    const settings = await NotificationSettings.findOne({ user: userId });
    
    // Check if user has disabled this type of notification
    if (settings) {
      // Check for category-specific settings
      let isDisabled = false;
      
      if (type === 'weather' || type === 'safety' || 
          type === 'traffic' || type === 'health') {
        isDisabled = !settings.categories.alerts[type];
      } else if (type === 'like' || type === 'comment' || 
                type === 'mention' || type === 'follow') {
        isDisabled = !settings.categories.social[type === 'mention' ? 'mentions' : 
                                                type === 'like' ? 'likes' : 
                                                type === 'comment' ? 'comments' : 'follows'];
      } else if (type === 'booking' || type === 'confirmation' || 
                type === 'reminder' || type === 'cancellation') {
        isDisabled = !settings.categories.bookings[type === 'booking' ? 'confirmations' : 
                                                 type === 'reminder' ? 'reminders' : 
                                                 type === 'cancellation' ? 'cancellations' : 'changes'];
      } else if (type === 'message') {
        isDisabled = !settings.categories.messages.newMessages;
      }
      
      // If notification type is disabled, don't create it
      if (isDisabled) {
        return null;
      }
      
      // Check if in quiet hours
      if (settings.quietHoursEnabled) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
        
        const startTime = settings.quietHours.start;
        const endTime = settings.quietHours.end;
        
        // Check if current time is within quiet hours
        // This is a simplified check and doesn't handle day boundaries well
        const isQuietHours = (startTime <= endTime) 
          ? (currentTime >= startTime && currentTime <= endTime)
          : (currentTime >= startTime || currentTime <= endTime);
        
        // If in quiet hours, don't send push notification (but still create notification)
        if (isQuietHours) {
          options.skipPush = true;
        }
      }
    }
    
    // Create notification
    const notification = await Notification.create({
      user: userId,
      message,
      type,
      senderAvatar: options.senderAvatar || null,
      sender: options.sender || null,
      relatedModel: options.relatedModel || null,
      relatedId: options.relatedId || null,
      navigationRoute: options.navigationRoute || null,
      navigationParams: options.navigationParams || null
    });
    
    // Send push notification if enabled
    if (!options.skipPush && settings && settings.pushEnabled) {
      await pushService.sendPushNotification(
        userId,
        message,
        {
          type: 'notification',
          notification: {
            id: notification._id,
            type,
            navigationRoute: options.navigationRoute || null,
            navigationParams: options.navigationParams || null
          }
        }
      );
    }
    
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    return null;
  }
};