const Itinerary = require('../models/Itinerary');
const ItineraryItem = require('../models/ItineraryItem');
const User = require('../models/User');
const Location = require('../models/Location');
const cloudinaryService = require('../services/cloudinary');
const errorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

/**
 * @desc    Get all itineraries for the current user
 * @route   GET /api/itineraries
 * @access  Private
 */
exports.getItineraries = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skipIndex = (page - 1) * limit;
    
    // Filters
    const filters = { touristId: req.user._id };
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    // Get total count
    const total = await Itinerary.countDocuments(filters);
    
    // Get itineraries with select fields
    const itineraries = await Itinerary.find(filters)
      .sort({ startDate: 1 })
      .skip(skipIndex)
      .limit(limit)
      .select('title description startDate endDate coverImage status isPublic');
    
    // Calculate pagination details
    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      status: 'success',
      data: {
        count: itineraries.length,
        total,
        pagination: {
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        itineraries
      }
    });
  } catch (error) {
    console.error('Error getting itineraries:', error);
    res.status(500).json(
      errorResponse('Server error retrieving itineraries', 500)
    );
  }
};

/**
 * @desc    Get a single itinerary by ID
 * @route   GET /api/itineraries/:id
 * @access  Private
 */
exports.getItineraryById = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id)
      .populate({
        path: 'items',
        options: { sort: { day: 1, startTime: 1 } }
      });
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check if user is authorized to view this itinerary
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(c => c.userId.toString() === req.user._id.toString()) &&
      !itinerary.isPublic
    ) {
      return res.status(403).json(
        errorResponse('You are not authorized to view this itinerary', 403)
      );
    }
    
    res.status(200).json({
      status: 'success',
      data: { itinerary }
    });
  } catch (error) {
    console.error('Error getting itinerary by ID:', error);
    res.status(500).json(
      errorResponse('Server error retrieving itinerary', 500)
    );
  }
};

/**
 * @desc    Create a new itinerary
 * @route   POST /api/itineraries
 * @access  Private
 */
exports.createItinerary = async (req, res) => {
  try {
    // Create itinerary
    const itinerary = await Itinerary.create({
      ...req.body,
      touristId: req.user._id
    });
    
    res.status(201).json({
      status: 'success',
      data: { itinerary }
    });
  } catch (error) {
    console.error('Error creating itinerary:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
      return res.status(400).json(
        errorResponse('Validation error', 400, { errors: messages })
      );
    }
    
    res.status(500).json(
      errorResponse('Server error creating itinerary', 500)
    );
  }
};

/**
 * @desc    Update an itinerary
 * @route   PUT /api/itineraries/:id
 * @access  Private
 */
exports.updateItinerary = async (req, res) => {
  try {
    let itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check ownership or edit permission
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(
        c => c.userId.toString() === req.user._id.toString() && c.permissions === 'edit'
      )
    ) {
      return res.status(403).json(
        errorResponse('You are not authorized to update this itinerary', 403)
      );
    }
    
    // Update itinerary
    itinerary = await Itinerary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: { itinerary }
    });
  } catch (error) {
    console.error('Error updating itinerary:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
      return res.status(400).json(
        errorResponse('Validation error', 400, { errors: messages })
      );
    }
    
    res.status(500).json(
      errorResponse('Server error updating itinerary', 500)
    );
  }
};

/**
 * @desc    Delete an itinerary
 * @route   DELETE /api/itineraries/:id
 * @access  Private
 */
exports.deleteItinerary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check ownership
    if (itinerary.touristId.toString() !== req.user._id.toString()) {
      return res.status(403).json(
        errorResponse('You are not authorized to delete this itinerary', 403)
      );
    }
    
    // Delete all associated itinerary items first
    await ItineraryItem.deleteMany({ itineraryId: itinerary._id });
    
    // Delete the itinerary
    await itinerary.deleteOne();
    
    res.status(200).json({
      status: 'success',
      data: {}
    });
  } catch (error) {
    console.error('Error deleting itinerary:', error);
    res.status(500).json(
      errorResponse('Server error deleting itinerary', 500)
    );
  }
};

/**
 * @desc    Upload cover image for itinerary
 * @route   POST /api/itineraries/:id/cover-image
 * @access  Private
 */
exports.uploadCoverImage = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check ownership or edit permission
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(
        c => c.userId.toString() === req.user._id.toString() && c.permissions === 'edit'
      )
    ) {
      return res.status(403).json(
        errorResponse('You are not authorized to update this itinerary', 403)
      );
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json(
        errorResponse('Please upload an image', 400)
      );
    }
    
    // Upload image to Cloudinary
    const result = await cloudinaryService.uploadFile(
      req.file.path,
      'sri-lanka-tourism/itineraries',
      {
        resource_type: 'image',
        public_id: `itinerary_${itinerary._id}_${Date.now()}`
      }
    );
    
    // Update itinerary with cover image URL
    itinerary.coverImage = result.secure_url;
    await itinerary.save();
    
    res.status(200).json({
      status: 'success',
      data: { coverImage: itinerary.coverImage }
    });
  } catch (error) {
    console.error('Error uploading cover image:', error);
    res.status(500).json(
      errorResponse('Server error uploading cover image', 500)
    );
  }
};

/**
 * @desc    Add a collaborator to an itinerary
 * @route   POST /api/itineraries/:id/collaborators
 * @access  Private
 */
exports.addCollaborator = async (req, res) => {
  try {
    const { email, permissions } = req.body;
    
    if (!email) {
      return res.status(400).json(
        errorResponse('Email is required', 400)
      );
    }
    
    // Find the itinerary
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check ownership
    if (itinerary.touristId.toString() !== req.user._id.toString()) {
      return res.status(403).json(
        errorResponse('Only the owner can add collaborators', 403)
      );
    }
    
    // Find the user to add as collaborator
    const collaborator = await User.findOne({ email });
    
    if (!collaborator) {
      return res.status(404).json(
        errorResponse('User not found with that email', 404)
      );
    }
    
    // Check if user is already a collaborator
    if (
      itinerary.collaborators.some(
        c => c.userId.toString() === collaborator._id.toString()
      )
    ) {
      return res.status(400).json(
        errorResponse('User is already a collaborator', 400)
      );
    }
    
    // Check if user is the owner
    if (collaborator._id.toString() === itinerary.touristId.toString()) {
      return res.status(400).json(
        errorResponse('You cannot add yourself as a collaborator', 400)
      );
    }
    
    // Add collaborator
    itinerary.collaborators.push({
      userId: collaborator._id,
      permissions: permissions || 'view'
    });
    
    await itinerary.save();
    
    res.status(200).json({
      status: 'success',
      data: { collaborator: collaborator.email }
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json(
      errorResponse('Server error adding collaborator', 500)
    );
  }
};

/**
 * @desc    Remove a collaborator from an itinerary
 * @route   DELETE /api/itineraries/:id/collaborators/:userId
 * @access  Private
 */
exports.removeCollaborator = async (req, res) => {
  try {
    // Find the itinerary
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check ownership
    if (itinerary.touristId.toString() !== req.user._id.toString()) {
      return res.status(403).json(
        errorResponse('Only the owner can remove collaborators', 403)
      );
    }
    
    // Find and remove collaborator
    const collaboratorIndex = itinerary.collaborators.findIndex(
      c => c.userId.toString() === req.params.userId
    );
    
    if (collaboratorIndex === -1) {
      return res.status(404).json(
        errorResponse('Collaborator not found', 404)
      );
    }
    
    itinerary.collaborators.splice(collaboratorIndex, 1);
    await itinerary.save();
    
    res.status(200).json({
      status: 'success',
      data: {}
    });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json(
      errorResponse('Server error removing collaborator', 500)
    );
  }
};

/**
 * @desc    Get itinerary daily summary
 * @route   GET /api/itineraries/:id/daily-summary
 * @access  Private
 */
exports.getDailySummary = async (req, res) => {
  try {
    const itinerary = await Itinerary.findById(req.params.id);
    
    if (!itinerary) {
      return res.status(404).json(
        errorResponse('Itinerary not found', 404)
      );
    }
    
    // Check if user is authorized to view this itinerary
    if (
      itinerary.touristId.toString() !== req.user._id.toString() &&
      !itinerary.collaborators.some(c => c.userId.toString() === req.user._id.toString()) &&
      !itinerary.isPublic
    ) {
      return res.status(403).json(
        errorResponse('You are not authorized to view this itinerary', 403)
      );
    }
    
    // Get all itinerary items
    const items = await ItineraryItem.find({ itineraryId: itinerary._id })
      .sort({ day: 1, startTime: 1 });
    
    // Group items by day
    const days = [];
    const durationDays = itinerary.durationDays;
    
    for (let dayIndex = 1; dayIndex <= durationDays; dayIndex++) {
      const dayItems = items.filter(item => item.day === dayIndex);
      
      // Calculate day date
      const dayDate = new Date(itinerary.startDate);
      dayDate.setDate(dayDate.getDate() + dayIndex - 1);
      
      // Calculate total distance for the day
      const totalDistance = dayItems
        .filter(item => item.type === 'transport' && item.transport && item.transport.distance)
        .reduce((sum, item) => sum + item.transport.distance, 0);
      
      // Calculate total cost for the day
      const totalCost = dayItems
        .filter(item => item.cost && item.cost.amount)
        .reduce((sum, item) => sum + item.cost.amount, 0);
      
      // Group items by type
      const activities = dayItems.filter(item => item.type === 'activity').length;
      const meals = dayItems.filter(item => item.type === 'meal').length;
      const transports = dayItems.filter(item => item.type === 'transport').length;
      
      days.push({
        dayNumber: dayIndex,
        date: dayDate,
        totalItems: dayItems.length,
        totalDistance,
        totalCost,
        currency: itinerary.budget.currency,
        summary: {
          activities,
          meals,
          transports,
        },
        weather: itinerary.weatherForecast.find(w => {
          const weatherDate = new Date(w.date);
          return weatherDate.toDateString() === dayDate.toDateString();
        }),
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { days }
    });
  } catch (error) {
    console.error('Error getting daily summary:', error);
    res.status(500).json(
      errorResponse('Server error retrieving daily summary', 500)
    );
  }
};

/**
 * @desc    Get public itineraries
 * @route   GET /api/itineraries/public
 * @access  Public
 */
exports.getPublicItineraries = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skipIndex = (page - 1) * limit;
    
    // Filters
    const filters = { isPublic: true };
    
    if (req.query.duration) {
      const [minDays, maxDays] = req.query.duration.split('-').map(Number);
      
      if (minDays && maxDays) {
        filters.$expr = {
          $and: [
            { $gte: [{ $subtract: ['$endDate', '$startDate'] }, minDays * 24 * 60 * 60 * 1000] },
            { $lte: [{ $subtract: ['$endDate', '$startDate'] }, maxDays * 24 * 60 * 60 * 1000] }
          ]
        };
      }
    }
    
    // Get total count
    const total = await Itinerary.countDocuments(filters);
    
    // Get public itineraries
    const itineraries = await Itinerary.find(filters)
      .sort({ createdAt: -1 })
      .skip(skipIndex)
      .limit(limit)
      .select('title description startDate endDate coverImage touristId')
      .populate({
        path: 'touristId',
        select: 'firstName lastName profileImage',
        model: User
      });
    
    // Calculate pagination details
    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      status: 'success',
      data: {
        count: itineraries.length,
        total,
        pagination: {
          currentPage: page,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        itineraries
      }
    });
  } catch (error) {
    console.error('Error getting public itineraries:', error);
    res.status(500).json(
      errorResponse('Server error retrieving public itineraries', 500)
    );
  }
};