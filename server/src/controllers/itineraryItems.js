const Itinerary = require('../models/Itinerary');
const ItineraryItem = require('../models/ItineraryItem');
const Location = require('../models/Location');
const cloudinaryService = require('../services/cloudinary');
const errorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const axios = require('axios');

/**
 * @desc    Get all items for an itinerary
 * @route   GET /api/itineraries/:itineraryId/items
 * @access  Private
 */
exports.getItineraryItems = async (req, res) => {
  try {
    const { itineraryId } = req.params;
    
    // Check if itinerary exists and user has access
    const itinerary = await Itinerary.findById(itineraryId);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check authorization
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(c => c.userId.toString() === req.user._id.toString()) &&
      !itinerary.isPublic
    ) {
      return res.status(403).json(
        errorResponse('Not authorized to access this itinerary', 403)
      );
    }
    
    // Filter by day if provided
    const filter = { itineraryId };
    if (req.query.day) {
      filter.day = parseInt(req.query.day, 10);
    }
    
    // Get items sorted by startTime
    const items = await ItineraryItem.find(filter)
      .sort({ startTime: 1 })
      .populate({
        path: 'location.locationId',
        select: 'name images type address',
        model: Location
      });
    
    res.status(200).json({
      status: 'success',
      data: { items }
    });
  } catch (error) {
    console.error('Error getting itinerary items:', error);
    res.status(500).json(
      errorResponse('Server error retrieving itinerary items', 500)
    );
  }
};

/**
 * @desc    Get an itinerary item by ID
 * @route   GET /api/itineraries/:itineraryId/items/:id
 * @access  Private
 */
exports.getItineraryItemById = async (req, res) => {
  try {
    const { itineraryId, id } = req.params;
    
    // Check if itinerary exists and user has access
    const itinerary = await Itinerary.findById(itineraryId);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check authorization
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(c => c.userId.toString() === req.user._id.toString()) &&
      !itinerary.isPublic
    ) {
      return res.status(403).json(
        errorResponse('Not authorized to access this itinerary', 403)
      );
    }
    
    // Get item
    const item = await ItineraryItem.findById(id).populate({
      path: 'location.locationId',
      select: 'name images type address description entranceFee openingHours',
      model: Location
    });
    
    if (!item || item.itineraryId.toString() !== itineraryId) {
      return res.status(404).json(
        errorResponse('Itinerary item not found', 404)
      );
    }
    
    res.status(200).json({
      status: 'success',
      data: { item }
    });
  } catch (error) {
    console.error('Error getting itinerary item by ID:', error);
    res.status(500).json(
      errorResponse('Server error retrieving itinerary item', 500)
    );
  }
};

/**
 * @desc    Create a new itinerary item
 * @route   POST /api/itineraries/:itineraryId/items
 * @access  Private
 */
exports.createItineraryItem = async (req, res) => {
  try {
    const { itineraryId } = req.params;
    
    // Check if itinerary exists and user has access
    const itinerary = await Itinerary.findById(itineraryId);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check if user is owner or has edit permissions
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(
        c => c.userId.toString() === req.user._id.toString() && c.permissions === 'edit'
      )
    ) {
      return res.status(403).json(
        errorResponse('Not authorized to add items to this itinerary', 403)
      );
    }
    
    // If location is provided, fetch location data
    if (req.body.location && req.body.location.locationId) {
      const location = await Location.findById(req.body.location.locationId)
        .select('name location address');
      
      if (location) {
        req.body.location.name = location.name;
        req.body.location.coordinates = location.location;
        req.body.location.address = `${location.address.city}, Sri Lanka`;
      }
    }
    
    // Create itinerary item
    const item = await ItineraryItem.create({
      ...req.body,
      itineraryId
    });
    
    res.status(201).json({
      status: 'success',
      data: { item }
    });
  } catch (error) {
    console.error('Error creating itinerary item:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
      return res.status(400).json(
        errorResponse('Validation error', 400, { errors: messages })
      );
    }
    
    res.status(500).json(
      errorResponse('Server error creating itinerary item', 500)
    );
  }
};

/**
 * @desc    Update an itinerary item
 * @route   PUT /api/itineraries/:itineraryId/items/:id
 * @access  Private
 */
exports.updateItineraryItem = async (req, res) => {
  try {
    const { itineraryId, id } = req.params;
    
    // Check if itinerary exists and user has access
    const itinerary = await Itinerary.findById(itineraryId);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check if user is owner or has edit permissions
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(
        c => c.userId.toString() === req.user._id.toString() && c.permissions === 'edit'
      )
    ) {
      return res.status(403).json(
        errorResponse('Not authorized to update items in this itinerary', 403)
      );
    }
    
    // Check if item exists and belongs to the itinerary
    let item = await ItineraryItem.findById(id);
    
    if (!item || item.itineraryId.toString() !== itineraryId) {
      return res.status(404).json(
        errorResponse('Itinerary item not found', 404)
      );
    }
    
    // If location is changed and locationId is provided, fetch location data
    if (
      req.body.location && 
      req.body.location.locationId && 
      (!item.location.locationId || 
        req.body.location.locationId !== item.location.locationId.toString())
    ) {
      const location = await Location.findById(req.body.location.locationId)
        .select('name location address');
      
      if (location) {
        req.body.location.name = location.name;
        req.body.location.coordinates = location.location;
        req.body.location.address = `${location.address.city}, Sri Lanka`;
      }
    }
    
    // Update item
    item = await ItineraryItem.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: { item }
    });
  } catch (error) {
    console.error('Error updating itinerary item:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
      return res.status(400).json(
        errorResponse('Validation error', 400, { errors: messages })
      );
    }
    
    res.status(500).json(
      errorResponse('Server error updating itinerary item', 500)
    );
  }
};

/**
 * @desc    Delete an itinerary item
 * @route   DELETE /api/itineraries/:itineraryId/items/:id
 * @access  Private
 */
exports.deleteItineraryItem = async (req, res) => {
  try {
    const { itineraryId, id } = req.params;
    
    // Check if itinerary exists and user has access
    const itinerary = await Itinerary.findById(itineraryId);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check if user is owner or has edit permissions
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(
        c => c.userId.toString() === req.user._id.toString() && c.permissions === 'edit'
      )
    ) {
      return res.status(403).json(
        errorResponse('Not authorized to delete items from this itinerary', 403)
      );
    }
    
    // Check if item exists and belongs to the itinerary
    const item = await ItineraryItem.findById(id);
    
    if (!item || item.itineraryId.toString() !== itineraryId) {
      return res.status(404).json(
        errorResponse('Itinerary item not found', 404)
      );
    }
    
    // Delete the item
    await item.deleteOne();
    
    res.status(200).json({
      status: 'success',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting itinerary item:', error);
    res.status(500).json(
      errorResponse('Server error deleting itinerary item', 500)
    );
  }
};

/**
 * @desc    Upload photos for an itinerary item
 * @route   POST /api/itineraries/:itineraryId/items/:id/photos
 * @access  Private
 */
exports.uploadItemPhotos = async (req, res) => {
  try {
    const { itineraryId, id } = req.params;
    
    // Check if itinerary exists and user has access
    const itinerary = await Itinerary.findById(itineraryId);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check if user is owner or has edit permissions
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(
        c => c.userId.toString() === req.user._id.toString() && c.permissions === 'edit'
      )
    ) {
      return res.status(403).json(
        errorResponse('Not authorized to update items in this itinerary', 403)
      );
    }
    
    // Check if item exists and belongs to the itinerary
    const item = await ItineraryItem.findById(id);
    
    if (!item || item.itineraryId.toString() !== itineraryId) {
      return res.status(404).json(
        errorResponse('Itinerary item not found', 404)
      );
    }
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(
        errorResponse('Please upload at least one photo', 400)
      );
    }
    
    // Upload files to Cloudinary
    const uploadPromises = req.files.map(file => {
      return cloudinaryService.uploadFile(
        file.path,
        'sri-lanka-tourism/itineraries/items',
        {
          resource_type: 'image',
          public_id: `itinerary_item_${item._id}_${Date.now()}`
        }
      );
    });
    
    const uploadResults = await Promise.all(uploadPromises);
    
    // Get photo URLs
    const photoUrls = uploadResults.map(result => result.secure_url);
    
    // Add photos to item
    item.photos = [...item.photos, ...photoUrls];
    await item.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        photos: item.photos
      }
    });
  } catch (error) {
    console.error('Error uploading item photos:', error);
    res.status(500).json(
      errorResponse('Server error uploading item photos', 500)
    );
  }
};

/**
 * @desc    Calculate route between two locations
 * @route   POST /api/itineraries/:itineraryId/calculate-route
 * @access  Private
 */
exports.calculateRoute = async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json(
        errorResponse('Origin and destination coordinates are required', 400)
      );
    }
    
    // Use Google Maps API to calculate route
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: mode,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
    
    if (response.data.status !== 'OK') {
      return res.status(400).json(
        errorResponse(`Error calculating route: ${response.data.status}`, 400)
      );
    }
    
    // Extract route information
    const route = response.data.routes[0];
    const leg = route.legs[0];
    
    // Format polyline for route visualization
    const points = decodePolyline(route.overview_polyline.points);
    
    const routeData = {
      distance: {
        value: leg.distance.value, // In meters
        text: leg.distance.text
      },
      duration: {
        value: leg.duration.value, // In seconds
        text: leg.duration.text
      },
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      steps: leg.steps.map(step => ({
        distance: step.distance.text,
        duration: step.duration.text,
        instructions: step.html_instructions,
        maneuver: step.maneuver
      })),
      polyline: points
    };
    
    res.status(200).json({
      status: 'success',
      data: { route: routeData }
    });
  } catch (error) {
    console.error('Error calculating route:', error);
    res.status(500).json(
      errorResponse('Server error calculating route', 500)
    );
  }
};

// Decode Google Maps polyline
function decodePolyline(encoded) {
  if (!encoded) {
    return [];
  }
  
  let points = [];
  let index = 0, lat = 0, lng = 0;
  
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    
    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    
    points.push([lng / 1e5, lat / 1e5]); // [longitude, latitude]
  }
  
  return points;
}