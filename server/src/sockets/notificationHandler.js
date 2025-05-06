/**
 * Set up notification-related socket event handlers
 * @param {object} io - Socket.io server instance
 * @param {object} socket - Socket instance for the connected client
 */
module.exports = (io, socket) => {
  // Mark a notification as read
  socket.on('markNotificationRead', async (notificationId) => {
    try {
      console.log(`[Socket] User ${socket.user._id} marking notification as read: ${notificationId}`);
        
        // Emit event back to the client
        socket.emit('notificationMarkedRead', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      socket.emit('notificationError', 'Failed to mark notification as read');
    }
  });

  // Mark all notifications as read
  socket.on('markAllNotificationsRead', async () => {
    try {
      console.log(`[Socket] User ${socket.user._id} marking all notifications as read`);
      
      // Emit event back to the client with the count of updated notifications
      socket.emit('allNotificationsMarkedRead', {
        count: 5 // Mock count
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      socket.emit('notificationError', 'Failed to mark all notifications as read');
    }
  });

  // Get unread notification count
  socket.on('getUnreadNotificationCount', async () => {
    try {
      console.log(`[Socket] User ${socket.user._id} requesting unread notification count`);
      
      // Emit mock count back to the client
      socket.emit('unreadNotificationCount', 3);
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      socket.emit('notificationError', 'Failed to get unread notification count');
    }
  });

  // Subscribe to real-time notifications for specific locations
  socket.on('subscribeToLocationUpdates', (locationIds) => {
    if (Array.isArray(locationIds)) {
      // Join location-specific rooms for real-time updates
      locationIds.forEach(locationId => {
        socket.join(`location:${locationId}`);
      });
      
      console.info(`User ${socket.user._id} subscribed to locations: ${locationIds.join(', ')}`);
      socket.emit('locationSubscriptionSuccess', locationIds);
    }
  });

  // Unsubscribe from location updates
  socket.on('unsubscribeFromLocationUpdates', (locationIds) => {
    if (Array.isArray(locationIds)) {
      // Leave location-specific rooms
      locationIds.forEach(locationId => {
        socket.leave(`location:${locationId}`);
      });
      
      console.info(`User ${socket.user._id} unsubscribed from locations: ${locationIds.join(', ')}`);
    }
  });

  // Subscribe to itinerary updates (for collaborative itineraries)
  socket.on('subscribeToItineraryUpdates', (itineraryId) => {
    socket.join(`itinerary:${itineraryId}`);
    console.info(`User ${socket.user._id} subscribed to itinerary: ${itineraryId}`);
    socket.emit('itinerarySubscriptionSuccess', itineraryId);
  });

  // Unsubscribe from itinerary updates
  socket.on('unsubscribeFromItineraryUpdates', (itineraryId) => {
    socket.leave(`itinerary:${itineraryId}`);
    console.info(`User ${socket.user._id} unsubscribed from itinerary: ${itineraryId}`);
  });

  // Listen for weather/safety alerts subscription
  socket.on('subscribeToAlerts', (regions) => {
    if (Array.isArray(regions)) {
      // Join region-specific alert channels
      regions.forEach(region => {
        socket.join(`alerts:${region}`);
      });
      
      console.info(`User ${socket.user._id} subscribed to alerts for regions: ${regions.join(', ')}`);
      socket.emit('alertSubscriptionSuccess', regions);
    }
  });
};