const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const itinerariesController = require('../../controllers/itineraries');
const itineraryItemsController = require('../../controllers/itineraryItems');
const { protect } = require('../../middleware/auth');
const validationMiddleware = require('../../middleware/validation');
const { uploadSingleImage, uploadMultipleImages } = require('../../middleware/upload');

// Public routes
router.get('/public', itinerariesController.getPublicItineraries);

// All other routes are protected
router.use(protect);

// Itinerary routes
router.get('/', itinerariesController.getItineraries);

router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('startDate').isISO8601().toDate().withMessage('Start date must be a valid date'),
    body('endDate').isISO8601().toDate().withMessage('End date must be a valid date'),
    validationMiddleware
  ],
  itinerariesController.createItinerary
);

router.get('/:id', itinerariesController.getItineraryById);
router.put('/:id', itinerariesController.updateItinerary);
router.delete('/:id', itinerariesController.deleteItinerary);

router.post(
  '/:id/cover-image',
  uploadSingleImage('coverImage'),
  itinerariesController.uploadCoverImage
);

router.post(
  '/:id/collaborators',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('permissions').isIn(['view', 'edit']).withMessage('Permissions must be either "view" or "edit"'),
    validationMiddleware
  ],
  itinerariesController.addCollaborator
);

router.delete(
  '/:id/collaborators/:userId',
  itinerariesController.removeCollaborator
);

router.get('/:id/daily-summary', itinerariesController.getDailySummary);

// Itinerary items routes
router.get('/:itineraryId/items', itineraryItemsController.getItineraryItems);

router.post(
  '/:itineraryId/items',
  [
    body('type').isIn(['activity', 'transport', 'accommodation', 'meal', 'rest', 'other']).withMessage('Invalid item type'),
    body('title').notEmpty().withMessage('Title is required'),
    body('day').isInt({ min: 1 }).withMessage('Day must be a positive integer'),
    body('startTime').isISO8601().toDate().withMessage('Start time must be a valid date'),
    body('endTime').isISO8601().toDate().withMessage('End time must be a valid date'),
    validationMiddleware
  ],
  itineraryItemsController.createItineraryItem
);

router.get('/:itineraryId/items/:id', itineraryItemsController.getItineraryItemById);
router.put('/:itineraryId/items/:id', itineraryItemsController.updateItineraryItem);
router.delete('/:itineraryId/items/:id', itineraryItemsController.deleteItineraryItem);

router.post(
  '/:itineraryId/items/:id/photos',
  uploadMultipleImages('photos', 5),
  itineraryItemsController.uploadItemPhotos
);

router.post(
  '/:itineraryId/calculate-route',
  [
    body('origin').notEmpty().withMessage('Origin coordinates are required'),
    body('destination').notEmpty().withMessage('Destination coordinates are required'),
    body('mode').optional().isIn(['driving', 'walking', 'bicycling', 'transit']).withMessage('Invalid travel mode'),
    validationMiddleware
  ],
  itineraryItemsController.calculateRoute
);

module.exports = router;