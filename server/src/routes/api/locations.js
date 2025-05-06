const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const locationsController = require('../../controllers/locations');
const { protect, authorize } = require('../../middleware/auth');
const validationMiddleware = require('../../middleware/validation');
const { uploadMultipleImages } = require('../../middleware/upload');

// Public routes
router.get('/', locationsController.getLocations);
router.get('/featured', locationsController.getFeaturedLocations);
router.get('/search', locationsController.searchLocations);
router.get('/nearby', locationsController.getNearbyLocations);
router.get('/categories', locationsController.getLocationCategories);
router.get('/:id', locationsController.getLocationById);

// Protected routes - Admin only
router.use(protect, authorize('admin'));

// Create location
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Location name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('type').isIn([
      'beach',
      'mountain',
      'temple',
      'historical',
      'museum',
      'park',
      'wildlife',
      'waterfall',
      'viewpoint',
      'hotel',
      'restaurant',
      'shopping',
      'entertainment',
      'other'
    ]).withMessage('Invalid location type'),
    body('category').isIn([
      'nature',
      'culture',
      'adventure',
      'relaxation',
      'food',
      'accommodation',
      'shopping',
      'entertainment',
      'other'
    ]).withMessage('Invalid category'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('location.coordinates').isArray().withMessage('Coordinates must be an array'),
    body('location.coordinates').custom(coords => {
      if (coords.length !== 2) {
        throw new Error('Coordinates must contain longitude and latitude');
      }
      return true;
    }),
    validationMiddleware
  ],
  locationsController.createLocation
);

// Update location
router.put('/:id', locationsController.updateLocation);

// Delete location
router.delete('/:id', locationsController.deleteLocation);

// Upload location images
router.post(
  '/:id/images',
  uploadMultipleImages('images', 10),
  locationsController.uploadLocationImages
);

// Upload panoramic images
router.post(
  '/:id/panoramic',
  uploadMultipleImages('images', 5),
  locationsController.uploadPanoramicImages
);

module.exports = router;