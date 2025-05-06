const Vehicle = require('../models/Vehicle');
const VehicleOwner = require('../models/VehicleOwner');
const User = require('../models/User');
const cloudinaryService = require('../services/cloudinary');
const errorResponse = require('../utils/errorResponse');

/**
 * @desc    Register a new vehicle
 * @route   POST /api/vehicles
 * @access  Private (Vehicle Owner only)
 */
exports.registerVehicle = async (req, res) => {
  try {
    // Check if user is a vehicle owner
    if (req.user.role !== 'vehicleOwner') {
      return res.status(403).json(
        errorResponse('Access denied. Only vehicle owners can register vehicles', 403)
      );
    }
    
    // Temporarily bypassing verification check for development
    /*
    // Check if vehicle owner is verified
    const vehicleOwner = await VehicleOwner.findOne({ userId: req.user._id });
    
    if (!vehicleOwner || !vehicleOwner.isVerified) {
      return res.status(403).json(
        errorResponse('Your account must be verified before registering vehicles', 403)
      );
    }
    */
    
    console.log('Vehicle registration data received:', JSON.stringify(req.body));
    console.log('User ID:', req.user._id);
    
    // Create new vehicle
    try {
      const vehicle = await Vehicle.create({
        ownerId: req.user._id,
        ownerEmail: req.user.email,
        ...req.body
      });
      
      console.log('Vehicle created successfully:', vehicle._id);
      
      res.status(201).json({
        status: 'success',
        data: { vehicle }
      });
    } catch (createError) {
      console.error('Mongoose validation error details:', createError);
      
      if (createError.name === 'ValidationError') {
        // Return specific validation errors
        const validationErrors = {};
        
        for (const field in createError.errors) {
          validationErrors[field] = createError.errors[field].message;
        }
        
        return res.status(400).json({
          status: 'error',
          message: 'Validation error',
          errors: validationErrors
        });
      }
      
      if (createError.code === 11000) {
        // Duplicate key error (likely registration number)
        return res.status(400).json(
          errorResponse('A vehicle with this registration number already exists', 400)
        );
      }
      
      throw createError; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error registering vehicle:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    res.status(500).json(
      errorResponse(`Server error registering vehicle: ${error.message}`, 500)
    );
  }
};

/**
 * @desc    Get all vehicles owned by the user
 * @route   GET /api/vehicles/my-vehicles
 * @access  Private (Vehicle Owner only)
 */
exports.getMyVehicles = async (req, res) => {
  try {
    console.log(`[MY VEHICLES] User ${req.user._id} (${req.user.email}) requesting their vehicles`);
    
    // Check if user is a vehicle owner
    if (req.user.role !== 'vehicleOwner') {
      console.log(`[MY VEHICLES] Access denied - user role is ${req.user.role}, not vehicleOwner`);
      return res.status(403).json(
        errorResponse('Access denied. User is not a vehicle owner', 403)
      );
    }
    
    // Get all vehicles owned by the user
    const vehicles = await Vehicle.find({ ownerId: req.user._id });
    
    console.log(`[MY VEHICLES] Found ${vehicles.length} vehicles for user ${req.user._id}`);
    
    // Log each vehicle for debugging
    if (vehicles.length > 0) {
      console.log('[MY VEHICLES] Vehicle details:');
      vehicles.forEach((vehicle, index) => {
        console.log(`[MY VEHICLES] Vehicle ${index + 1}: ID=${vehicle._id}, Make=${vehicle.make}, Model=${vehicle.model}, isVerified=${vehicle.isVerified}, verificationStatus=${vehicle.verificationStatus}`);
      });
    } else {
      console.log('[MY VEHICLES] No vehicles found for this user');
    }
    
    res.status(200).json({
      status: 'success',
      count: vehicles.length,
      data: { vehicles }
    });
  } catch (error) {
    console.error('Error getting vehicles:', error);
    res.status(500).json(
      errorResponse('Server error retrieving vehicles', 500)
    );
  }
};

/**
 * @desc    Get a vehicle by ID
 * @route   GET /api/vehicles/:id
 * @access  Public
 */
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate({
        path: 'ownerId',
        select: 'firstName lastName profileImage',
        model: User
      });
    
    if (!vehicle) {
      return res.status(404).json(
        errorResponse('Vehicle not found', 404)
      );
    }
    
    // If the vehicle is not verified, only the owner can view it
    if (!vehicle.isVerified && (!req.user || vehicle.ownerId._id.toString() !== req.user._id.toString())) {
      return res.status(403).json(
        errorResponse('This vehicle is not yet verified or available for public viewing', 403)
      );
    }
    
    res.status(200).json({
      status: 'success',
      data: { vehicle }
    });
  } catch (error) {
    console.error('Error getting vehicle by ID:', error);
    res.status(500).json(
      errorResponse('Server error retrieving vehicle', 500)
    );
  }
};

/**
 * @desc    Update a vehicle
 * @route   PUT /api/vehicles/:id
 * @access  Private (Vehicle Owner only)
 */
exports.updateVehicle = async (req, res) => {
  try {
    // Find vehicle
    let vehicle = await Vehicle.findById(req.params.id);
    
    // Check if vehicle exists
    if (!vehicle) {
      return res.status(404).json(
        errorResponse('Vehicle not found', 404)
      );
    }
    
    // Check ownership
    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json(
        errorResponse('Access denied. You do not own this vehicle', 403)
      );
    }
    
    // Update vehicle
    vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: { vehicle }
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json(
      errorResponse('Server error updating vehicle', 500)
    );
  }
};

/**
 * @desc    Delete a vehicle
 * @route   DELETE /api/vehicles/:id
 * @access  Private (Vehicle Owner only)
 */
exports.deleteVehicle = async (req, res) => {
  try {
    // Find vehicle
    const vehicle = await Vehicle.findById(req.params.id);
    
    // Check if vehicle exists
    if (!vehicle) {
      return res.status(404).json(
        errorResponse('Vehicle not found', 404)
      );
    }
    
    // Check ownership
    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json(
        errorResponse('Access denied. You do not own this vehicle', 403)
      );
    }
    
    // Delete vehicle
    await vehicle.deleteOne();
    
    res.status(200).json({
      status: 'success',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json(
      errorResponse('Server error deleting vehicle', 500)
    );
  }
};

/**
 * @desc    Upload vehicle photos
 * @route   POST /api/vehicles/:id/photos
 * @access  Private (Vehicle Owner only)
 */
exports.uploadVehiclePhotos = async (req, res) => {
  console.log(`[Vehicle ${req.params.id}] Received request to upload photos.`);
  try {
    // Find vehicle
    const vehicle = await Vehicle.findById(req.params.id);
    
    // Check if vehicle exists
    if (!vehicle) {
      console.log(`[Vehicle ${req.params.id}] Vehicle not found for photo upload.`);
      return res.status(404).json(
        errorResponse('Vehicle not found', 404)
      );
    }
    
    // Check ownership
    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      console.log(`[Vehicle ${req.params.id}] User ${req.user._id} is not owner. Access denied.`);
      return res.status(403).json(
        errorResponse('Access denied. You do not own this vehicle', 403)
      );
    }
    
    // Check if files were uploaded with express-fileupload
    if (!req.files || !req.files.photos) {
      console.error(`[Vehicle ${req.params.id}] No files found in req.files.photos`);
      return res.status(400).json(
        errorResponse('Please upload at least one photo file', 400)
      );
    }
    
    // Handle both single file and array of files
    const files = Array.isArray(req.files.photos) ? req.files.photos : [req.files.photos];
    
    console.log(`[Vehicle ${req.params.id}] Received ${files.length} files via express-fileupload.`);
    console.log(`[Vehicle ${req.params.id}] File details:`, files.map(f => ({ name: f.name, size: f.size })));
    
    // Upload files to Cloudinary
    const uploadPromises = files.map(file => {
      console.log(`[Vehicle ${req.params.id}] Starting Cloudinary upload for: ${file.name}`);
      return cloudinaryService.uploadFile(
        file.tempFilePath,
        'sri-lanka-tourism/vehicles/photos',
        {
          resource_type: 'image',
          public_id: `vehicle_${vehicle._id}_${Date.now()}_${file.name}` // More unique public_id
        }
      ).catch(uploadError => {
        // Catch individual upload errors
        console.error(`[Vehicle ${req.params.id}] Cloudinary upload failed for ${file.name}:`, uploadError);
        return { error: true, file: file.name, message: uploadError.message }; // Return error object
      });
    });
    
    const uploadResults = await Promise.all(uploadPromises);
    console.log(`[Vehicle ${req.params.id}] Cloudinary upload results:`, uploadResults);
    
    // Filter out any failed uploads and extract URLs
    const successfulUploads = uploadResults.filter(result => !result.error);
    const photoUrls = successfulUploads.map(result => result.secure_url);
    const failedUploads = uploadResults.filter(result => result.error);
    
    if (photoUrls.length === 0) {
      console.error(`[Vehicle ${req.params.id}] All Cloudinary uploads failed.`);
      const errorMessages = failedUploads.map(f => `${f.file}: ${f.message}`).join('; ');
      return res.status(500).json(errorResponse(`Failed to upload photos to storage: ${errorMessages}`, 500));
    }
    
    console.log(`[Vehicle ${req.params.id}] Successfully uploaded ${photoUrls.length} photos. URLs:`, photoUrls);
    if (failedUploads.length > 0) {
      console.warn(`[Vehicle ${req.params.id}] Failed to upload ${failedUploads.length} photos:`, failedUploads);
    }
    
    // Add photos to vehicle
    const originalPhotoCount = vehicle.photos.length;
    vehicle.photos = [...vehicle.photos, ...photoUrls];
    console.log(`[Vehicle ${req.params.id}] Updating vehicle photos. Before: ${originalPhotoCount}, After: ${vehicle.photos.length}`);
    
    // Save the vehicle
    try {
      await vehicle.save();
      console.log(`[Vehicle ${req.params.id}] Vehicle saved successfully with new photos.`);
    } catch (saveError) {
      console.error(`[Vehicle ${req.params.id}] Error saving vehicle after adding photos:`, saveError);
      // Attempt to remove the just-uploaded photos from Cloudinary if save fails?
      // For now, just return an error.
      return res.status(500).json(errorResponse('Failed to save vehicle after photo upload', 500));
    }
    
    // Send success response
    let message = `${photoUrls.length} photos uploaded successfully.`;
    if (failedUploads.length > 0) {
      message += ` ${failedUploads.length} photos failed to upload.`;
    }
    
    res.status(200).json({
      status: 'success',
      message,
      data: {
        photos: vehicle.photos
      }
    });
  } catch (error) {
    console.error(`[Vehicle ${req.params.id}] Unexpected error in uploadVehiclePhotos:`, error);
    res.status(500).json(
      errorResponse('Server error during vehicle photo upload', 500)
    );
  }
};

/**
 * @desc    Submit vehicle for verification
 * @route   POST /api/vehicles/:id/submit-verification
 * @access  Private (Vehicle Owner only)
 */
exports.submitForVerification = async (req, res) => {
  try {
    // Find vehicle
    const vehicle = await Vehicle.findById(req.params.id);
    
    // Check if vehicle exists
    if (!vehicle) {
      return res.status(404).json(
        errorResponse('Vehicle not found', 404)
      );
    }
    
    // Check ownership
    if (vehicle.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json(
        errorResponse('Access denied. You do not own this vehicle', 403)
      );
    }
    
    // Check if vehicle has photos
    if (vehicle.photos.length === 0) {
      return res.status(400).json(
        errorResponse('Please upload at least one photo of the vehicle before submitting for verification', 400)
      );
    }
    
    // Update verification status to pending
    vehicle.verificationStatus = 'pending';
    await vehicle.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Your vehicle has been submitted for verification. You will be notified once the process is complete.',
      data: {
        verificationStatus: vehicle.verificationStatus
      }
    });
  } catch (error) {
    console.error('Error submitting vehicle for verification:', error);
    res.status(500).json(
      errorResponse('Server error submitting vehicle for verification', 500)
    );
  }
};

/**
 * @desc    Search vehicles
 * @route   GET /api/vehicles/search
 * @access  Public
 */
exports.searchVehicles = async (req, res) => {
  try {
    console.log('[VEHICLE SEARCH] Received request with params:', JSON.stringify(req.query));
    
    // Extract query parameters
    const {
      type,
      capacity,
      features,
      includesDriver,
      minRating,
      location,
      radius,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      showUnverified = 'true' // New parameter to control showing unverified vehicles
    } = req.query;
    
    const skipIndex = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter query - REMOVE isVerified filter to show all vehicles
    const filterQuery = {};
    
    // Add isVerified filter only if showUnverified is false
    if (showUnverified !== 'true') {
      filterQuery.isVerified = true;
      console.log('[VEHICLE SEARCH] Only showing verified vehicles');
    } else {
      console.log('[VEHICLE SEARCH] Showing all vehicles including unverified ones');
    }
    
    if (type) {
      filterQuery.type = type;
      console.log(`[VEHICLE SEARCH] Filtering by type: ${type}`);
    }
    
    if (capacity) {
      try {
        const capacityValue = parseInt(capacity);
        filterQuery['capacity.passengers'] = { $gte: capacityValue };
        console.log(`[VEHICLE SEARCH] Filtering by capacity >= ${capacityValue}`);
      } catch (parseError) {
        console.error(`[VEHICLE SEARCH] Error parsing capacity: ${parseError.message}`);
        // Continue with other filters, don't apply invalid filter
      }
    }
    
    if (features) {
      try {
        const featuresList = features.split(',');
        filterQuery.features = { $all: featuresList };
        console.log(`[VEHICLE SEARCH] Filtering by features: ${featuresList.join(', ')}`);
      } catch (parseError) {
        console.error(`[VEHICLE SEARCH] Error parsing features: ${parseError.message}`);
      }
    }
    
    if (includesDriver !== undefined) {
      filterQuery.includesDriver = includesDriver === 'true';
      console.log(`[VEHICLE SEARCH] Filtering by includesDriver: ${includesDriver}`);
    }
    
    if (minRating) {
      try {
        const ratingValue = parseFloat(minRating);
        filterQuery.averageRating = { $gte: ratingValue };
        console.log(`[VEHICLE SEARCH] Filtering by minRating >= ${ratingValue}`);
      } catch (parseError) {
        console.error(`[VEHICLE SEARCH] Error parsing minRating: ${parseError.message}`);
      }
    }
    
    // Location-based search
    if (location && radius) {
      try {
        const [lat, lng] = location.split(',').map(coord => parseFloat(coord));
        const radiusInKm = parseFloat(radius);
        
        if (isNaN(lat) || isNaN(lng) || isNaN(radiusInKm)) {
          console.error(`[VEHICLE SEARCH] Invalid location coordinates or radius: lat=${lat}, lng=${lng}, radius=${radiusInKm}`);
        } else {
          filterQuery.location = {
            $geoWithin: {
              $centerSphere: [
                [lng, lat],
                radiusInKm / 6371 // Convert km to radians
              ]
            }
          };
          console.log(`[VEHICLE SEARCH] Filtering by location: lat=${lat}, lng=${lng}, radius=${radiusInKm}km`);
        }
      } catch (locError) {
        console.error(`[VEHICLE SEARCH] Error parsing location data: ${locError.message}`);
      }
    }
    
    // Date filtering
    if (startDate && endDate) {
      try {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          console.error(`[VEHICLE SEARCH] Invalid date format: startDate=${startDate}, endDate=${endDate}`);
        } else {
          filterQuery['availability.unavailableDates'] = {
            $not: {
              $elemMatch: {
                $gte: startDateObj,
                $lte: endDateObj
              }
            }
          };
          console.log(`[VEHICLE SEARCH] Filtering by dates: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}`);
        }
      } catch (dateError) {
        console.error(`[VEHICLE SEARCH] Error parsing dates: ${dateError.message}`);
      }
    }
    
    console.log(`[VEHICLE SEARCH] Final filter query: ${JSON.stringify(filterQuery)}`);
    
    // Get total count
    let total = 0;
    try {
      total = await Vehicle.countDocuments(filterQuery);
      console.log(`[VEHICLE SEARCH] Total matching vehicles: ${total}`);
    } catch (countError) {
      console.error(`[VEHICLE SEARCH] Error counting documents: ${countError.message}`);
      // Continue with the search anyway, using total = 0
    }
    
    // Get vehicles with pagination
    let vehicles = [];
    try {
      vehicles = await Vehicle.find(filterQuery)
        .sort({ averageRating: -1 })
        .skip(skipIndex)
        .limit(parseInt(limit))
        .populate({
          path: 'ownerId',
          select: 'firstName lastName profileImage',
          model: User
        });
      
      console.log(`[VEHICLE SEARCH] Retrieved ${vehicles.length} vehicles for page ${page}`);
      
      // Log some details about the first few vehicles for debugging
      if (vehicles.length > 0) {
        const sampleVehicles = vehicles.slice(0, Math.min(3, vehicles.length));
        console.log(`[VEHICLE SEARCH] Sample vehicles: ${JSON.stringify(sampleVehicles.map(v => ({
          id: v._id,
          make: v.make,
          model: v.model,
          type: v.type,
          isAvailable: v.isAvailable,
          isVerified: v.isVerified, // Add verification status to log
          verificationStatus: v.verificationStatus // Add verification status string
        })))}`);
      }
    } catch (findError) {
      console.error(`[VEHICLE SEARCH] Error finding vehicles: ${findError.message}`);
      console.error(findError.stack);
      return res.status(500).json(
        errorResponse(`Error retrieving vehicles: ${findError.message}`, 500)
      );
    }
    
    // Calculate pagination details
    const totalPages = Math.ceil(total / parseInt(limit));
    
    // For empty results, check if there are any vehicles in the database at all
    if (vehicles.length === 0) {
      try {
        const anyVehicles = await Vehicle.exists({});
        if (!anyVehicles) {
          console.log('[VEHICLE SEARCH] No vehicles found in the database at all');
        } else {
          console.log('[VEHICLE SEARCH] No vehicles match the filter criteria, but vehicles exist in the database');
        }
      } catch (checkError) {
        console.error(`[VEHICLE SEARCH] Error checking if any vehicles exist: ${checkError.message}`);
      }
    }
    
    // Send response
    return res.status(200).json({
      status: 'success',
      data: {
        count: vehicles.length,
        total,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        vehicles
      }
    });
  } catch (error) {
    console.error('[VEHICLE SEARCH] Uncaught error in search function:', error);
    console.error(error.stack);
    
    // Try to determine the specific cause of the error
    let errorMessage = 'Server error searching vehicles';
    let errorCode = 500;
    
    if (error.name === 'CastError') {
      errorMessage = `Invalid parameter format: ${error.message}`;
      errorCode = 400;
    } else if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${error.message}`;
      errorCode = 400;
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate entry error';
      errorCode = 400;
    }
    
    return res.status(errorCode).json(
      errorResponse(errorMessage, errorCode)
    );
  }
};

/**
 * @desc    Get vehicles by owner email
 * @route   GET /api/vehicles/by-email/:email
 * @access  Private
 */
exports.getVehiclesByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`[VEHICLES BY EMAIL] Looking for vehicles with ownerEmail: ${email}`);
    
    // First check if email parameter is valid
    if (!email) {
      console.log('[VEHICLES BY EMAIL] No email parameter provided');
      return res.status(400).json({
        status: 'error',
        message: 'Email parameter is required'
      });
    }
    
    // Debug: Check all available vehicles first
    const allVehicles = await Vehicle.find({});
    console.log(`[VEHICLES BY EMAIL] Total vehicles in database: ${allVehicles.length}`);
    console.log('[VEHICLES BY EMAIL] All vehicles:', JSON.stringify(allVehicles.map(v => ({
      id: v._id,
      reg: v.registrationNumber,
      make: v.make,
      ownerEmail: v.ownerEmail,
      ownerId: v.ownerId,
      isVerified: v.isVerified,
      verificationStatus: v.verificationStatus
    }))));
    
    // Get all vehicles with the specified owner email - don't filter by verification status
    const vehicles = await Vehicle.find({ ownerEmail: email });
    console.log(`[VEHICLES BY EMAIL] Found ${vehicles.length} vehicles with ownerEmail: ${email}`);
    
    // Log detailed vehicle info
    vehicles.forEach((v, i) => {
      console.log(`[VEHICLES BY EMAIL] Vehicle ${i+1}: ID=${v._id}, Make=${v.make}, Model=${v.model}, isVerified=${v.isVerified}, Status=${v.verificationStatus}`);
    });
    
    if (vehicles.length === 0) {
      // If no vehicles found with email, check if any vehicles have this owner ID
      const user = await User.findOne({ email });
      if (user) {
        console.log(`[VEHICLES BY EMAIL] Found user with email ${email}, userId: ${user._id}`);
        const vehiclesByOwnerId = await Vehicle.find({ ownerId: user._id });
        console.log(`[VEHICLES BY EMAIL] Found ${vehiclesByOwnerId.length} vehicles with ownerId: ${user._id}`);
        
        // Log detailed vehicle info for vehicles found by ownerId
        vehiclesByOwnerId.forEach((v, i) => {
          console.log(`[VEHICLES BY EMAIL] Vehicle by ownerId ${i+1}: ID=${v._id}, Make=${v.make}, Model=${v.model}, isVerified=${v.isVerified}, Status=${v.verificationStatus}`);
        });
        
        if (vehiclesByOwnerId.length > 0) {
          // Update these vehicles to include the email
          console.log('[VEHICLES BY EMAIL] Updating vehicles to include ownerEmail');
          for (const vehicle of vehiclesByOwnerId) {
            vehicle.ownerEmail = email;
            await vehicle.save();
          }
          
          return res.status(200).json({
            status: 'success',
            count: vehiclesByOwnerId.length,
            message: 'Vehicles found by ownerId and updated with email',
            data: { vehicles: vehiclesByOwnerId }
          });
        }
      }
    }
    
    res.status(200).json({
      status: 'success',
      count: vehicles.length,
      data: { vehicles }
    });
  } catch (error) {
    console.error('Error getting vehicles by email:', error);
    res.status(500).json(
      errorResponse('Server error retrieving vehicles', 500)
    );
  }
};