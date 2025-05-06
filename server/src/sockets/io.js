let io;

/**
 * Initialize Socket.io with the HTTP server
 * @param {object} httpServer - HTTP server instance
 * @returns {object} Socket.io server instance
 */
exports.init = (httpServer) => {
  io = require('socket.io')(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? ['https://srilankaguide.com', 'https://www.srilankaguide.com']
        : '*', // Allow all origins in development
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'], // Support both WebSocket and long-polling
    pingTimeout: 60000, // Increase ping timeout to handle unreliable mobile connections
    pingInterval: 25000 // Time between pings
  });
  
  // Log socket events in development mode
  if (process.env.NODE_ENV !== 'production') {
    io.engine.on('connection_error', (err) => {
      console.log('Socket.io connection error:', err);
  });
  }
  
  return io;
};

/**
 * Get the Socket.io server instance
 * @returns {object} Socket.io server instance
 */
exports.getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  
  return io;
};