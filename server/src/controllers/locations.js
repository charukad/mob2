const Location = require('../models/Location');
const cloudinaryService = require('../services/cloudinary');
const errorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all locations
 * @route   GET /api/locations
 * @access  Public
 */
exports.getLocations = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skipIndex = (page - 1) * limit;
    
    // Build filter query
    const filterQuery = { isVerified: true };
    
    if (req.query.type) {
      filterQuery.type = req.query.type;
    }
    
    if (req.query.category) {
      filterQuery.category = req.query.category;
    }
    
    if (req.query.tags) {
      filterQuery.tags = { $in: req.query.tags.split(',') };
    }
    
    if (req.query.city) {
      filterQuery['address.city'] = req.query.city;
    }
    
    // Get total count
    const total = await Location.countDocuments(filterQuery);
    
    // Get locations with pagination
    const locations = await Location.find(filterQuery)
      .select('name shortDescription type category location images averageRating reviewCount')
      .sort({ isFeatured: -1, averageRating: -1 })
      .skip(skipIndex)
      .limit(limit);
    
    // Calculate pagination details
    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      status: 'success',
      data: {
        count: locations.length,
        total,
        pagination: {
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        locations
      }
    });
  } catch (error) {
    console.error('Error getting locations:', error);
    res.status(500).json(
      errorResponse('Server error retrieving locations', 500)
    );
  }
};

/**
 * @desc    Get featured locations
 * @route   GET /api/locations/featured
 * @access  Public
 */
exports.getFeaturedLocations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;
    
    const featuredLocations = await Location.find({
      isVerified: true,
      isFeatured: true
    })
      .select('name shortDescription type category location images averageRating')
      .sort({ averageRating: -1 })
      .limit(limit);
    
    res.status(200).json({
      status: 'success',
      data: { 
        locations: featuredLocations 
      }
    });
  } catch (error) {
    console.error('Error getting featured locations:', error);
    res.status(500).json(
      errorResponse('Server error retrieving featured locations', 500)
    );
  }
};

/**
 * @desc    Get location by ID
 * @route   GET /api/locations/:id
 * @access  Public
 */
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    
    if (!location) {
      return res.status(404).json(
        errorResponse('Location not found', 404)
      );
    }
    
    // Increment visits count
    location.visitsCount += 1;
    await location.save();
    
    res.status(200).json({
      status: 'success',
      data: { location }
    });
  } catch (error) {
    console.error('Error getting location by ID:', error);
    res.status(500).json(
      errorResponse('Server error retrieving location', 500)
    );
  }
};

/**
 * @desc    Create new location
 * @route   POST /api/locations
 * @access  Private (Admin only)
 */
exports.createLocation = async (req, res) => {
  try {
    // Create location
    const location = await Location.create({
      ...req.body,
      createdBy: req.user._id
    });
    
    res.status(201).json({
      status: 'success',
      data: { location }
    });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json(
      errorResponse('Server error creating location', 500)
    );
  }
};

/**
 * @desc    Update location
 * @route   PUT /api/locations/:id
 * @access  Private (Admin only)
 */
exports.updateLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!location) {
      return res.status(404).json(
        errorResponse('Location not found', 404)
      );
    }
    
    res.status(200).json({
      status: 'success',
      data: { location }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json(
      errorResponse('Server error updating location', 500)
    );
  }
};

/**
 * @desc    Delete location
 * @route   DELETE /api/locations/:id
 * @access  Private (Admin only)
 */
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    
    if (!location) {
      return res.status(404).json(
        errorResponse('Location not found', 404)
      );
    }
    
    await location.deleteOne();
    
    res.status(200).json({
      status: 'success',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json(
      errorResponse('Server error deleting location', 500)
    );
  }
};

/**
 * @desc    Upload location images
 * @route   POST /api/locations/:id/images
 * @access  Private (Admin only)
 */
exports.uploadLocationImages = async (req, res) => {
  try {
    // Find location
    const location = await Location.findById(req.params.id);
    
    if (!location) {
      return res.status(404).json(
        errorResponse('Location not found', 404)
      );
    }
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(
        errorResponse('Please upload at least one image', 400)
      );
    }
    
    // Get captions and isMain flags if provided
    const captions = req.body.captions ? JSON.parse(req.body.captions) : [];
    const isMainArr = req.body.isMain ? JSON.parse(req.body.isMain) : [];
    
    // Upload files to Cloudinary
    const uploadPromises = req.files.map(file => {
      return cloudinaryService.uploadFile(
        file.path,
        'sri-lanka-tourism/locations',
        {
          resource_type: 'image',
          public_id: `location_${location._id}_${Date.now()}`
        }
      );
    });
    
    const uploadResults = await Promise.all(uploadPromises);
    
    // Format image data
    const imageData = uploadResults.map((result, index) => ({
      url: result.secure_url,
      caption: captions[index] || '',
      isMain: isMainArr[index] === true
    }));
    
    // If at least one image is marked as main, update all other images
    if (imageData.some(img => img.isMain)) {
      location.images.forEach(img => {
        img.isMain = false;
      });
    }
    
    // Add images to location
    location.images = [...location.images, ...imageData];
    
    // Ensure only one image is marked as main
    const mainImages = location.images.filter(img => img.isMain);
    if (mainImages.length > 1) {
      // Keep only the last one as main
      for (let i = 0; i < mainImages.length - 1; i++) {
        const img = location.images.find(img => img.url === mainImages[i].url);
        if (img) {
          img.isMain = false;
        }
      }
    }
    
    await location.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        images: location.images
      }
    });
  } catch (error) {
    console.error('Error uploading location images:', error);
    res.status(500).json(
      errorResponse('Server error uploading location images', 500)
    );
  }
};

/**
 * @desc    Upload panoramic images
 * @route   POST /api/locations/:id/panoramic
 * @access  Private (Admin only)
 */
exports.uploadPanoramicImages = async (req, res) => {
  try {
    // Find location
    const location = await Location.findById(req.params.id);
    
    if (!location) {
      return res.status(404).json(
        errorResponse('Location not found', 404)
      );
    }
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(
        errorResponse('Please upload at least one panoramic image', 400)
      );
    }
    
    // Get captions if provided
    const captions = req.body.captions ? JSON.parse(req.body.captions) : [];
    
    // Upload files to Cloudinary
    const uploadPromises = req.files.map(file => {
      return cloudinaryService.uploadFile(
        file.path,
        'sri-lanka-tourism/locations/panoramic',
        {
          resource_type: 'image',
          public_id: `location_panoramic_${location._id}_${Date.now()}`
        }
      );
    });
    
    const uploadResults = await Promise.all(uploadPromises);
    
    // Format image data
    const imageData = uploadResults.map((result, index) => ({
      url: result.secure_url,
      caption: captions[index] || ''
    }));
    
    // Add images to location
    location.panoramicImages = [...location.panoramicImages, ...imageData];
    await location.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        panoramicImages: location.panoramicImages
      }
    });
  } catch (error) {
    console.error('Error uploading panoramic images:', error);
    res.status(500).json(
      errorResponse('Server error uploading panoramic images', 500)
    );
  }
};

/**
 * @desc    Search locations
 * @route   GET /api/locations/search
 * @access  Public
 */
exports.searchLocations = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    const skipIndex = (parseInt(page) - 1) * parseInt(limit);
    
    if (!query) {
      return res.status(400).json(
        errorResponse('Search query is required', 400)
      );
    }
    
    // Text search
    const locations = await Location.find(
      { 
        $text: { $search: query },
        isVerified: true
      },
      { score: { $meta: 'textScore' } }
    )
      .select('name shortDescription type category location images averageRating')
      .sort({ score: { $meta: 'textScore' } })
      .skip(skipIndex)
      .limit(parseInt(limit));
    
    // Get total count
    const total = await Location.countDocuments({
      $text: { $search: query },
      isVerified: true
    });
    
    // Calculate pagination details
    const totalPages = Math.ceil(total / parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: {
        count: locations.length,
        total,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        },
        locations
      }
    });
  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json(
      errorResponse('Server error searching locations', 500)
    );
  }
};

/**
 * @desc    Get nearby locations
 * @route   GET /api/locations/nearby
 * @access  Public
 */
exports.getNearbyLocations = async (req, res) => {
  try {
    const { lat, lng, radius = 10, limit = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json(
        errorResponse('Latitude and longitude coordinates are required', 400)
      );
    }
    
    const locations = await Location.find({
      isVerified: true,
      location: {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(lng), parseFloat(lat)],
            parseFloat(radius) / 6371 // Convert km to radians
          ]
        }
      }
    })
      .select('name shortDescription type category location images averageRating')
      .limit(parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: {
        count: locations.length,
        locations
      }
    });
  } catch (error) {
    console.error('Error getting nearby locations:', error);
    res.status(500).json(
      errorResponse('Server error retrieving nearby locations', 500)
    );
  }
};

/**
 * @desc    Get location categories and types
 * @route   GET /api/locations/categories
 * @access  Public
 */
exports.getLocationCategories = async (req, res) => {
  try {
    // Get distinct categories
    const categories = await Location.distinct('category');
    
    // Get distinct types
    const types = await Location.distinct('type');
    
    res.status(200).json({
      status: 'success',
      data: { categories, types }
    });
  } catch (error) {
    console.error('Error getting location categories:', error);
    res.status(500).json(
      errorResponse('Server error retrieving location categories', 500)
    );
  }
};