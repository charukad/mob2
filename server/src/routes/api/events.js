const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  getFeaturedEvents,
  getEventCategories,
  getEventsByDate,
  getEventDates,
  saveEvent
} = require('../../controllers/events');

// Base routes
router.get('/', getEvents);
router.get('/featured', getFeaturedEvents);
router.get('/categories', getEventCategories);
router.get('/date', getEventsByDate);
router.get('/dates', getEventDates);
router.get('/:id', getEventById);
router.post('/:id/save', saveEvent);

module.exports = router; 