const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./email');
const smsService = require('./sms');
const socketIO = require('../sockets/io'); // We'll create this next

/**
 * Create a new notification and send it through selected channels
 * @param {string} userId - ID of the user to notify
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data for the notification
 * @param {string} priority - Priority level (low, medium, high)
 * @param {Date} expiresAt - Expiration date for temporary notifications
 * @param {boolean} sendEmail - Whether to send email notification
 * @param {boolean} sendSMS - Whether to send SMS notification
 * @param {boolean} sendPush - Whether to send push notification
 * @returns {Object} Created notification
 */
exports.sendNotification = async ({
  userId,
  type,
  title,
  message,
  data = {},
  priority = 'medium',
  expiresAt = null,
  sendEmail = false,
  sendSMS = false,
  sendPush = true
}) => {
  try {
    // Get user to check notification preferences
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    // Create notification in database
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      priority,
      expiresAt
    });
    
    // Send real-time notification via Socket.io if user is online
    if (sendPush && user.notificationSettings.push) {
      socketIO.getIO().to(userId.toString()).emit('newNotification', notification);
    }
    
    // Send email notification if enabled
    if (sendEmail && user.notificationSettings.email) {
      await emailService.sendNotificationEmail(
        user.email,
        user.firstName,
        title,
        message,
        type
      );
    }
    
    // Send SMS notification if enabled
    if (sendSMS && user.notificationSettings.sms && user.phoneNumber) {
      await smsService.sendNotificationSMS(
        user.phoneNumber,
        `${title}: ${message}`
      );
    }
    
    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send notifications to multiple users
 * @param {Array} userIds - Array of user IDs to notify
 * @param {Object} notificationParams - Notification parameters
 */
exports.broadcastNotification = async (userIds, notificationParams) => {
  try {
    const notifications = [];
    
    for (const userId of userIds) {
      try {
        const notification = await this.sendNotification({
          userId,
          ...notificationParams
        });
        
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to send notification to user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }
    
    return notifications;
  } catch (error) {
    console.error('Error broadcasting notifications:', error);
    throw error;
  }
};

/**
 * Send notification to all users in a specific area
 * @param {Object} coordinates - Geographical coordinates (longitude, latitude)
 * @param {number} radiusKm - Radius in kilometers
 * @param {Object} notificationParams - Notification parameters
 */
exports.sendAreaNotification = async (coordinates, radiusKm, notificationParams) => {
  try {
    // Find users in the specified area
    // For this to work, User model should have location field with geospatial index
    const users = await User.find({
      'location': {
        $geoWithin: {
          $centerSphere: [
            [coordinates.longitude, coordinates.latitude],
            radiusKm / 6371 // Convert km to radians (Earth's radius is ~6371 km)
          ]
        }
      }
    });
    
    const userIds = users.map(user => user._id);
    
    // Broadcast notification to all users in the area
    return await this.broadcastNotification(userIds, notificationParams);
  } catch (error) {
    console.error('Error sending area notification:', error);
    throw error;
  }
};

/**
 * Send notification to all users subscribed to a specific topic
 * @param {string} topic - Topic name (e.g., location ID, event type)
 * @param {Object} notificationParams - Notification parameters
 */
exports.sendTopicNotification = async (topic, notificationParams) => {
  // Use Socket.io to broadcast to a room
  const io = socketIO.getIO();
  
  // Create a payload for the notification
  const payload = {
    ...notificationParams,
    topic,
    timestamp: new Date()
  };
  
  // Broadcast to the topic room
  io.to(`topic:${topic}`).emit('topicNotification', payload);
  
  return payload;
};

/**
 * Send a safety or weather alert to a specific region
 * @param {string} region - Region identifier
 * @param {string} alertType - Type of alert ('weather' or 'safety')
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} severity - Alert severity ('info', 'warning', 'danger')
 * @param {Object} data - Additional data
 */
exports.sendRegionAlert = async (region, alertType, title, message, severity, data = {}) => {
  const io = socketIO.getIO();
  
  const alertPayload = {
    type: alertType,
    title,
    message,
    severity,
    region,
    timestamp: new Date(),
    data
  };
  
  // Send to all users subscribed to this region's alerts
  io.to(`alerts:${region}`).emit('regionAlert', alertPayload);
  
  return alertPayload;
};