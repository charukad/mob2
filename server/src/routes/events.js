const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events');

// GET all events
router.get('/', eventsController.getEvents);

// GET featured events
router.get('/featured', eventsController.getFeaturedEvents);

// GET event categories
router.get('/categories', eventsController.getEventCategories);

// GET events by date
router.get('/date', eventsController.getEventsByDate);

// GET events dates for calendar
router.get('/dates', eventsController.getEventDates);

// GET events in date range
router.get('/upcoming-range', eventsController.getUpcomingEventsInRange);

// GET event by ID
router.get('/:id', eventsController.getEventById);

// POST save event
router.post('/:id/save', eventsController.saveEvent);

module.exports = router; 