const messageHandler = require('./messageHandler');
const notificationHandler = require('./notificationHandler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Set up socket.io event handlers
 * @param {object} io - Socket.io server instance
 */
module.exports = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        console.log('No token provided for socket connection');
        // In development mode, allow connection without token for testing
        if (process.env.NODE_ENV === 'development') {
          socket.user = { _id: '12345', email: 'test@example.com' };
          return next();
        }
        return next(new Error('Authentication error'));
      }
      
      // Verify token
      try {
        const decoded = jwt.verify(token, 'srilanka_tourism_secret_key_for_development_only');
      
        // Simple user object for testing
        socket.user = { 
          _id: decoded.id || '12345',
          email: decoded.email || 'test@example.com'
        };
        
        console.log(`Socket authenticated for user: ${socket.user._id}`);
        next();
      } catch (jwtError) {
        console.error('JWT verification error:', jwtError);
        // In development mode, allow connection with invalid token
        if (process.env.NODE_ENV === 'development') {
          socket.user = { _id: '12345', email: 'test@example.com' };
          return next();
        }
        return next(new Error('Invalid token'));
      }
    } catch (error) {
      console.error('Socket auth error:', error);
      if (process.env.NODE_ENV === 'development') {
        socket.user = { _id: '12345', email: 'test@example.com' };
        return next();
      }
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);
    
    // Join user to a room based on their ID for private messages
    socket.join(socket.user._id.toString());
    
    // Initialize message handlers
    messageHandler(io, socket);
    
    // Initialize notification handlers
    notificationHandler(io, socket);
    
    // Update user's online status
    User.findByIdAndUpdate(socket.user._id, { isOnline: true, lastActive: new Date() })
      .catch(err => console.error('Error updating user online status:', err));
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user._id}`);
      
      // Update user's offline status and last active timestamp
      User.findByIdAndUpdate(socket.user._id, { isOnline: false, lastActive: new Date() })
        .catch(err => console.error('Error updating user offline status:', err));
    });
  });
};