const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');

// Import API routes
const authRoutes = require('./api/auth');
const userRoutes = require('./api/users');
const touristRoutes = require('./api/tourists');
const guideRoutes = require('./api/guides');
const vehicleOwnersRoutes = require('./api/vehicleOwners');
const vehiclesRoutes = require('./api/vehicles');
const postsRoutes = require('./api/posts');
const eventsRoutes = require('./api/events');
const messageRoutes = require('./messageRoutes');
const googlePlacesRoutes = require('./googlePlacesRoutes');
const locationRoutes = require('./locationRoutes');

// Use routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tourists', touristRoutes);
router.use('/guides', guideRoutes);
router.use('/vehicle-owners', vehicleOwnersRoutes);
router.use('/vehicles', vehiclesRoutes);
router.use('/posts', postsRoutes);
router.use('/events', eventsRoutes);
router.use('/', messageRoutes); // This will register message routes under /api/
router.use('/google/places', googlePlacesRoutes); // Register Google Places routes
router.use('/locations', locationRoutes); // Register Location routes

// API Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date(),
  });
});

// Vehicle-specific health check route to help troubleshoot vehicle feed issues
router.get('/vehicles-health', async (req, res) => {
  try {
    // Check if the Vehicle model exists and can be accessed
    const vehicleCount = await Vehicle.countDocuments({});
    
    // Check if vehicles exist but might not be accessible via search
    const verifiedVehicleCount = await Vehicle.countDocuments({ isVerified: true });
    
    res.status(200).json({
      status: 'success',
      timestamp: new Date(),
      data: {
        totalVehicles: vehicleCount,
        verifiedVehicles: verifiedVehicleCount,
        percentVerified: vehicleCount > 0 ? Math.round((verifiedVehicleCount / vehicleCount) * 100) : 0,
        hasVerifiedVehicles: verifiedVehicleCount > 0,
        hasAnyVehicles: vehicleCount > 0,
        databaseConnected: true,
        searchEndpoint: '/api/vehicles/search',
        vehicleEndpoint: '/api/vehicles/:id',
        vehicleModelFields: Object.keys(Vehicle.schema.paths).slice(0, 10) // First 10 fields
      }
    });
  } catch (error) {
    console.error('Vehicle health check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error checking vehicle health',
      error: error.message,
      databaseConnected: false
    });
  }
});

module.exports = router;