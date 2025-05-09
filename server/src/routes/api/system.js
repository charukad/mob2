const express = require('express');
const router = express.Router();
const systemController = require('../../controllers/system');
const { protect, authorize } = require('../../middleware/auth');

// Public health check
router.get('/health', systemController.healthCheck);

// Database status - restrict in production
if (process.env.NODE_ENV === 'production') {
  router.use('/db-status', protect, authorize('admin'));
}
router.get('/db-status', systemController.dbStatus);

// Check MongoDB connection
router.get('/check-mongodb', systemController.checkMongoDB);

module.exports = router; 