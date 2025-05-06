const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const vehiclesController = require('../../controllers/vehicles');
const { protect, authorize } = require('../../middleware/auth');
const validationMiddleware = require('../../middleware/validation');
const { uploadMultipleImages } = require('../../middleware/upload');
const fileUpload = require('express-fileupload');

// Create fileUpload middleware instance
const fileUploadMiddleware = fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
});

// Custom error handling middleware for vehicle search
const handleSearchErrors = (req, res, next) => {
  try {
    console.log('[VEHICLE ROUTE] Received search request from IP:', req.ip);
    console.log('[VEHICLE ROUTE] Query parameters:', JSON.stringify(req.query));
    
    // Validate specific parameters if needed
    const { page, limit } = req.query;
    if (page && isNaN(parseInt(page))) {
      console.error(`[VEHICLE ROUTE] Invalid page parameter: ${page}`);
      return res.status(400).json({
        status: 'error',
        message: 'Page parameter must be a number'
      });
    }
    
    if (limit && isNaN(parseInt(limit))) {
      console.error(`[VEHICLE ROUTE] Invalid limit parameter: ${limit}`);
      return res.status(400).json({
        status: 'error',
        message: 'Limit parameter must be a number'
      });
    }
    
    // Log user information if available
    if (req.user) {
      console.log(`[VEHICLE ROUTE] Search request from authenticated user: ${req.user._id} (${req.user.email})`);
    } else {
      console.log('[VEHICLE ROUTE] Search request from unauthenticated user');
    }
    
    // Continue to the controller if validation passes
    next();
  } catch (error) {
    console.error('[VEHICLE ROUTE] Error in search middleware:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error processing vehicle search request'
    });
  }
};

// Public routes
router.get('/search', handleSearchErrors, vehiclesController.searchVehicles);

// Protected routes
router.use(protect);

// Route with parameters
router.get('/by-email/:email', vehiclesController.getVehiclesByEmail);
router.get('/my-vehicles', authorize('vehicleOwner'), vehiclesController.getMyVehicles);

// Get vehicle by ID (this should come after all specific routes to avoid conflicts)
router.get('/:id', vehiclesController.getVehicleById);

router.post(
  '/',
  [
    authorize('vehicleOwner'),
    (req, res, next) => {
      console.log('[POST /api/vehicles] Request body before validation:', JSON.stringify(req.body));
      console.log('[POST /api/vehicles] Data types: year=', typeof req.body.year, ', capacity.passengers=', typeof req.body.capacity?.passengers);
      next();
    },
    body('type').isIn(['car', 'van', 'suv', 'bus', 'motorcycle', 'tuk-tuk', 'bicycle', 'other']).withMessage('Invalid vehicle type'),
    body('make').notEmpty().withMessage('Vehicle make is required'),
    body('model').notEmpty().withMessage('Vehicle model is required'),
    body('year').isInt({ min: 1950, max: new Date().getFullYear() }).withMessage('Invalid year'),
    body('registrationNumber').notEmpty().withMessage('Registration number is required'),
    body('capacity.passengers').isInt({ min: 1 }).withMessage('Passenger capacity must be at least 1'),
    validationMiddleware
  ],
  vehiclesController.registerVehicle
);

router.put(
  '/:id',
  [
    authorize('vehicleOwner'),
    body('type').optional().isIn(['car', 'van', 'suv', 'bus', 'motorcycle', 'tuk-tuk', 'bicycle', 'other']).withMessage('Invalid vehicle type'),
    body('make').optional().notEmpty().withMessage('Vehicle make cannot be empty'),
    body('model').optional().notEmpty().withMessage('Vehicle model cannot be empty'),
    body('year').optional().isInt({ min: 1950, max: new Date().getFullYear() }).withMessage('Invalid year'),
    body('registrationNumber').optional().notEmpty().withMessage('Registration number cannot be empty'),
    body('capacity.passengers').optional().isInt({ min: 1 }).withMessage('Passenger capacity must be at least 1'),
    validationMiddleware
  ],
  vehiclesController.updateVehicle
);

router.delete('/:id', authorize('vehicleOwner'), vehiclesController.deleteVehicle);

router.post(
  '/:id/photos',
  authorize('vehicleOwner'),
  fileUploadMiddleware,
  vehiclesController.uploadVehiclePhotos
);

router.post(
  '/:id/submit-verification',
  authorize('vehicleOwner'),
  vehiclesController.submitForVerification
);

module.exports = router;