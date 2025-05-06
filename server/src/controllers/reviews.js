const Review = require('../models/Review');
const User = require('../models/User');
const Guide = require('../models/Guide');
const Vehicle = require('../models/Vehicle');
const Location = require('../models/Location');
const errorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

// Helper function to get entity
const getEntity = async (entityType, entityId) => {
  try {
    let entity;
    switch (entityType) {
      case 'guide':
        entity = await Guide.findById(entityId).populate('user', 'name');
        break;
      case 'vehicle':
        entity = await Vehicle.findById(entityId);
        break;
      case 'location':
        entity = await Location.findById(entityId);
        break;
      default:
        throw new Error('Invalid entity type');
    }
    
    if (!entity) {
      throw new Error('Entity not found');
    }
    
    return entity;
  } catch (error) {
    throw error;
  }
};

// Calculate review summary for an entity
const calculateReviewSummary = async (entityType, entityId) => {
  try {
    // Get all published reviews for the entity
    const reviews = await Review.find({
      entityType,
      entityId,
      status: 'published'
    });
    
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      };
    }
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    // Calculate rating distribution
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    
    reviews.forEach(review => {
      const roundedRating = Math.round(review.rating);
      distribution[roundedRating]++;
    });
    
    return {
      averageRating,
      totalReviews: reviews.length,
      distribution
    };
  } catch (error) {
    throw error;
  }
};

// Format review for response
const formatReviewResponse = async (review, userId) => {
  try {
    const formattedReview = review.toObject();
    
    // Add user info if not anonymous
    if (!review.anonymous) {
      const user = await User.findById(review.user);
      formattedReview.user = {
        id: user._id,
        name: user.name,
        avatar: user.profileImage,
        reviewCount: await Review.countDocuments({ 
          user: user._id, 
          status: 'published' 
        })
      };
    } else {
      formattedReview.user = {
        name: 'Anonymous User',
        avatar: null,
        reviewCount: 0
      };
    }
    
    // Get entity details
    let entityName = '';
    try {
      const entity = await getEntity(review.entityType, review.entityId);
      entityName = review.entityType === 'guide' 
        ? entity.user.name 
        : entity.name;
    } catch (error) {
      entityName = 'Unknown Entity';
    }
    
    formattedReview.entity = {
      id: review.entityId,
      type: review.entityType,
      name: entityName
    };
    
    // Add helpful votes info
    formattedReview.helpfulCount = review.helpfulVotes.length;
    formattedReview.foundHelpful = userId 
      ? review.helpfulVotes.includes(userId) 
      : false;
    
    // Add ownership info
    formattedReview.isOwn = userId && review.user.equals(userId);
    
    // Add response owner info if there's a response
    if (formattedReview.response && formattedReview.response.user) {
      const responseUser = await User.findById(formattedReview.response.user);
      formattedReview.response.userName = responseUser ? responseUser.name : 'Unknown User';
    }
    
    // Clean up fields
    delete formattedReview.helpfulVotes;
    delete formattedReview.reports;
    
    return formattedReview;
  } catch (error) {
    throw error;
  }
};

// @desc    Get reviews for an entity
// @route   GET /api/reviews/:entityType/:entityId
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    
    // Validate entityType
    if (!['guide', 'vehicle', 'location', 'event', 'activity'].includes(entityType)) {
      return next(new errorResponse('Invalid entity type', 400));
    }
    
    // Validate entityId
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return next(new errorResponse('Invalid entity ID', 400));
    }
    
    // Verify entity exists
    try {
      await getEntity(entityType, entityId);
    } catch (error) {
      return next(new errorResponse('Entity not found', 404));
    }
    
    // Get reviews for entity
    const reviews = await Review.find({
      entityType,
      entityId,
      status: 'published'
    }).sort({ createdAt: -1 });
    
    // Format reviews for response
    const formattedReviews = await Promise.all(
      reviews.map(review => formatReviewResponse(review, req.user ? req.user.id : null))
    );
    
    // Get review summary
    const summary = await calculateReviewSummary(entityType, entityId);
    
    res.status(200).json({
      success: true,
      reviews: formattedReviews,
      summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's own reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res, next) => {
  try {
    // Get user's reviews
    const reviews = await Review.find({
      user: req.user.id,
      status: { $ne: 'deleted' }
    }).sort({ createdAt: -1 });
    
    // Format reviews for response
    const formattedReviews = await Promise.all(
      reviews.map(review => formatReviewResponse(review, req.user.id))
    );
    
    res.status(200).json({
      success: true,
      reviews: formattedReviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a review
// @route   POST /api/reviews/:entityType/:entityId
// @access  Private
exports.createReview = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { 
      rating, 
      text, 
      photos, 
      anonymous, 
      detailedRatings 
    } = req.body;
    
    // Validate entityType
    if (!['guide', 'vehicle', 'location', 'event', 'activity'].includes(entityType)) {
      return next(new errorResponse('Invalid entity type', 400));
    }
    
    // Validate entityId
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return next(new errorResponse('Invalid entity ID', 400));
    }
    
    // Verify entity exists
    try {
      await getEntity(entityType, entityId);
    } catch (error) {
      return next(new errorResponse('Entity not found', 404));
    }
    
    // Check if user has already reviewed this entity
    const existingReview = await Review.findOne({
      user: req.user.id,
      entityType,
      entityId
    });
    
    if (existingReview) {
      return next(
        new errorResponse('You have already reviewed this entity', 400)
      );
    }
    
    // Create review
    const review = await Review.create({
      user: req.user.id,
      entityType,
      entityId,
      rating,
      text,
      photos,
      anonymous: anonymous || false,
      detailedRatings,
      // Check if user has booked/visited this entity
      verified: false // This would be determined by business logic
    });
    
    // Format review for response
    const formattedReview = await formatReviewResponse(review, req.user.id);
    
    // Get updated review summary
    const summary = await calculateReviewSummary(entityType, entityId);
    
    res.status(201).json({
      success: true,
      review: formattedReview,
      summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      rating, 
      text, 
      photos, 
      anonymous, 
      detailedRatings 
    } = req.body;
    
    // Find review
    const review = await Review.findById(id);
    
    if (!review) {
      return next(new errorResponse('Review not found', 404));
    }
    
    // Check if user owns the review
    if (review.user.toString() !== req.user.id) {
      return next(
        new errorResponse('You can only update your own reviews', 401)
      );
    }
    
    // Update review
    review.rating = rating || review.rating;
    review.text = text || review.text;
    review.photos = photos || review.photos;
    review.anonymous = anonymous !== undefined ? anonymous : review.anonymous;
    review.detailedRatings = detailedRatings || review.detailedRatings;
    review.updatedAt = Date.now();
    
    await review.save();
    
    // Format review for response
    const formattedReview = await formatReviewResponse(review, req.user.id);
    
    // Get updated review summary
    const summary = await calculateReviewSummary(review.entityType, review.entityId);
    
    res.status(200).json({
      success: true,
      review: formattedReview,
      summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find review
    const review = await Review.findById(id);
    
    if (!review) {
      return next(new errorResponse('Review not found', 404));
    }
    
    // Check if user owns the review
    if (review.user.toString() !== req.user.id) {
      return next(
        new errorResponse('You can only delete your own reviews', 401)
      );
    }
    
    // Soft delete review
    review.status = 'deleted';
    await review.save();
    
    // Get updated review summary
    const summary = await calculateReviewSummary(review.entityType, review.entityId);
    
    res.status(200).json({
      success: true,
      id: review._id,
      summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
exports.markReviewAsHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find review
    const review = await Review.findById(id);
    
    if (!review) {
      return next(new errorResponse('Review not found', 404));
    }
    
    // Check if review is published
    if (review.status !== 'published') {
      return next(new errorResponse('Review is not available', 400));
    }
    
    // Check if user is trying to mark their own review as helpful
    if (review.user.toString() === req.user.id) {
      return next(
        new errorResponse('You cannot mark your own review as helpful', 400)
      );
    }
    
    // Check if user has already marked this review as helpful
    const hasVoted = review.helpfulVotes.includes(req.user.id);
    
    if (hasVoted) {
      // Remove user's vote
      review.helpfulVotes = review.helpfulVotes.filter(
        userId => userId.toString() !== req.user.id
      );
    } else {
      // Add user's vote
      review.helpfulVotes.push(req.user.id);
    }
    
    await review.save();
    
    res.status(200).json({
      success: true,
      reviewId: review._id,
      helpfulCount: review.helpfulVotes.length,
      foundHelpful: !hasVoted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report a review
// @route   POST /api/reviews/:id/report
// @access  Private
exports.reportReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find review
    const review = await Review.findById(id);
    
    if (!review) {
      return next(new errorResponse('Review not found', 404));
    }
    
    // Check if review is published
    if (review.status !== 'published') {
      return next(new errorResponse('Review is not available', 400));
    }
    
    // Check if user has already reported this review
    const hasReported = review.reports.some(
      report => report.user.toString() === req.user.id
    );
    
    if (hasReported) {
      return next(
        new errorResponse('You have already reported this review', 400)
      );
    }
    
    // Add user's report
    review.reports.push({
      user: req.user.id,
      reason: reason || 'Inappropriate content',
      date: Date.now()
    });
    
    // If review has multiple reports, flag it for review
    if (review.reports.length >= 3) {
      review.status = 'flagged';
    }
    
    await review.save();
    
    res.status(200).json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to a review (for business owners)
// @route   POST /api/reviews/:id/reply
// @access  Private (for business owners/guides)
exports.replyToReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    
    if (!reply || reply.trim() === '') {
      return next(new errorResponse('Reply text is required', 400));
    }
    
    // Find review
    const review = await Review.findById(id);
    
    if (!review) {
      return next(new errorResponse('Review not found', 404));
    }
    
    // Check if user is authorized to reply (entity owner)
    // This would need to be customized based on your business logic
    let isAuthorized = false;
    
    if (review.entityType === 'guide') {
      const guide = await Guide.findById(review.entityId);
      isAuthorized = guide && guide.user.toString() === req.user.id;
    } else if (review.entityType === 'vehicle') {
      const vehicle = await Vehicle.findById(review.entityId);
      isAuthorized = vehicle && vehicle.owner.toString() === req.user.id;
    }
    // Add other entity types as needed
    
    if (!isAuthorized) {
      return next(
        new errorResponse('You are not authorized to reply to this review', 401)
      );
    }
    
    // Add or update response
    review.response = {
      text: reply,
      user: req.user.id,
      date: Date.now()
    };
    
    await review.save();
    
    // Format response for API
    const formattedResponse = {
      text: review.response.text,
      date: review.response.date,
      userName: req.user.name
    };
    
    res.status(200).json({
      success: true,
      reviewId: review._id,
      response: formattedResponse
    });
  } catch (error) {
    next(error);
  }
};