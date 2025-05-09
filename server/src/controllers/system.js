const mongoose = require('mongoose');
const errorResponse = require('../utils/errorResponse');

/**
 * @desc    Health check endpoint
 * @route   GET /api/system/health
 * @access  Public
 */
exports.healthCheck = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json(
      errorResponse('Server error', 500)
    );
  }
};

/**
 * @desc    MongoDB connection status
 * @route   GET /api/system/db-status
 * @access  Public (in development), Private (in production)
 */
exports.dbStatus = async (req, res) => {
  try {
    // Check MongoDB connection state
    const state = mongoose.connection.readyState;
    
    // Map connection state to human-readable value
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    const connected = state === 1;
    
    res.status(200).json({
      status: 'success',
      data: {
        connected,
        state: stateMap[state],
        dbName: mongoose.connection.name,
        host: mongoose.connection.host,
        models: Object.keys(mongoose.models)
      }
    });
  } catch (error) {
    console.error('DB status check error:', error);
    res.status(500).json(
      errorResponse('Server error checking database status', 500)
    );
  }
};

/**
 * @desc    Check MongoDB connection
 * @route   GET /api/system/check-mongodb
 * @access  Public
 */
exports.checkMongoDB = async (req, res) => {
  try {
    // Ping the database to verify connection
    await mongoose.connection.db.admin().ping();
    
    // Get server info
    const serverInfo = await mongoose.connection.db.admin().serverInfo();
    
    res.status(200).json({
      status: 'success',
      connected: true,
      data: {
        version: serverInfo.version,
        uptime: serverInfo.uptime,
        connections: await mongoose.connection.db.admin().serverStatus().then(info => info.connections)
      }
    });
  } catch (error) {
    console.error('MongoDB check error:', error);
    res.status(500).json({
      status: 'error',
      connected: false,
      message: error.message
    });
  }
}; 