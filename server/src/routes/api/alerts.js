const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getAlerts,
  dismissAlert,
  subscribeToAlerts,
  unsubscribeFromAlerts,
  getSubscriptions,
  getRelevantLocations,
  getCurrentRoutes,
  getTravelAdvisories,
  getTrafficAlerts,
  getHealthAdvisories
} = require('../../controllers/alerts');

// Base route: /api/alerts

// Get alerts and dismiss
router.get('/', protect, getAlerts);
router.post('/:id/dismiss', protect, dismissAlert);

// Alert subscriptions
router.post('/subscribe', protect, subscribeToAlerts);
router.post('/unsubscribe', protect, unsubscribeFromAlerts);
router.get('/subscriptions', protect, getSubscriptions);

// Location and route data for alerts
router.get('/relevant-locations', protect, getRelevantLocations);
router.get('/current-routes', protect, getCurrentRoutes);

// Alert type-specific endpoints
router.get('/travel-advisories', protect, getTravelAdvisories);
router.post('/traffic', protect, getTrafficAlerts);
router.get('/health', protect, getHealthAdvisories);

module.exports = router;