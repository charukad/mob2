const Guide = require('../models/Guide');
const User = require('../models/User');
const cloudinaryService = require('../services/cloudinary');
const errorResponse = require('../utils/errorResponse');

/**
 * @desc    Get guide profile
 * @route   GET /api/guides/profile
 * @access  Private (Guide only)
 */
exports.getGuideProfile = async (req, res) => {
  try {
    // Check if user is a guide
    if (req.user.role !== 'guide') {
      return res.status(403).json(
        errorResponse('Access denied. User is not a guide', 403)
      );
    }

    // Find guide profile by email first, then by userId if not found
    let guide = await Guide.findOne({ email: req.user.email });
    
    // If not found by email, try userId
    if (!guide) {
      guide = await Guide.findOne({ userId: req.user._id });
      
      // If found by userId but no email, update to add email
      if (guide && !guide.email) {
        guide.email = req.user.email;
        await guide.save();
        console.log('Added email to existing guide profile:', req.user.email);
      }
    }

    if (!guide) {
      // No profile found, return default empty values
      return res.status(200).json({
        status: 'success',
        data: { 
          guide: {
            email: req.user.email,
            userId: req.user._id,
            expertise: [],
            languages: [],
            experience: 0,
            bio: '',
            serviceAreas: [],
            isVerified: false,
            verificationStatus: 'unsubmitted',
            isProfileComplete: false
          } 
        }
      });
    }

    // Calculate profile completeness
    const isProfileComplete = 
      guide.bio && 
      guide.bio.length > 10 && 
      guide.languages && guide.languages.length > 0 && 
      guide.expertise && guide.expertise.length > 0 &&
      guide.serviceAreas && guide.serviceAreas.length > 0;

    res.status(200).json({
      status: 'success',
      data: { 
        guide: {
          _id: guide._id,
          userId: guide.userId, 
          email: guide.email,
          bio: guide.bio || '',
          experience: guide.experience || 0,
          languages: guide.languages || [],
          expertise: guide.expertise || [],
          serviceAreas: guide.serviceAreas || [],
          rates: guide.rates || { hourly: 0, daily: 0 },
          isVerified: guide.isVerified || false,
          verificationStatus: guide.verificationStatus || 'unsubmitted'
        }
      }
    });
  } catch (error) {
    console.error('Error getting guide profile:', error);
    res.status(500).json(
      errorResponse('Server error retrieving guide profile', 500)
    );
  }
};

/**
 * @desc    Update guide profile
 * @route   PUT /api/guides/profile
 * @access  Private (Guide only)
 */
exports.updateGuideProfile = async (req, res) => {
  try {
    // Check if user is a guide
    if (req.user.role !== 'guide') {
      return res.status(403).json(
        errorResponse('Access denied. User is not a guide', 403)
      );
    }

    const {
      nic,
      licenseNumber,
      licenseExpiry,
      expertise,
      languages,
      experience,
      bio,
      serviceAreas,
      rates
    } = req.body;

    // Fields to update
    const updateFields = {
      email: req.user.email // Ensure email is always updated
    };

    if (nic) updateFields.nic = nic;
    if (licenseNumber) updateFields.licenseNumber = licenseNumber;
    if (licenseExpiry) updateFields.licenseExpiry = licenseExpiry;
    if (expertise) updateFields.expertise = expertise;
    if (languages) updateFields.languages = languages;
    if (experience !== undefined) updateFields.experience = experience;
    if (bio) updateFields.bio = bio;
    if (serviceAreas) updateFields.serviceAreas = serviceAreas;
    if (rates) {
      if (!updateFields.rates) updateFields.rates = {};
      if (rates.hourly) updateFields.rates.hourly = rates.hourly;
      if (rates.daily) updateFields.rates.daily = rates.daily;
      if (rates.currency) updateFields.rates.currency = rates.currency;
    }

    // Find guide by email first
    let guide = await Guide.findOne({ email: req.user.email });
    
    if (guide) {
      // Update existing guide profile
      guide = await Guide.findByIdAndUpdate(
        guide._id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );
      console.log('Updated existing guide profile for:', req.user.email);
      
      // Log the guide data that is being sent to the client
      console.log('GUIDE DATA BEING SENT TO CLIENT:', JSON.stringify({
        id: guide._id,
        email: guide.email,
        bio: guide.bio,
        experience: guide.experience,
        languages: guide.languages,
        expertise: guide.expertise,
        serviceAreas: guide.serviceAreas,
        rates: guide.rates
      }, null, 2));
    } else {
      // Try to find by userId
      guide = await Guide.findOne({ userId: req.user._id });
      
      if (guide) {
        // Update existing guide profile and add email
        guide = await Guide.findByIdAndUpdate(
          guide._id,
          { $set: updateFields },
          { new: true, runValidators: true }
        );
        console.log('Updated existing guide profile and added email for:', req.user.email);
      } else {
        // Create new guide profile
        updateFields.userId = req.user._id;
        guide = await Guide.create(updateFields);
        console.log('Created new guide profile for:', req.user.email);
      }
    }

    res.status(200).json({
      status: 'success',
      data: { 
        guide: {
          _id: guide._id,
          userId: guide.userId,
          email: guide.email,
          bio: guide.bio || '',
          experience: guide.experience || 0,
          languages: guide.languages || [],
          expertise: guide.expertise || [],
          serviceAreas: guide.serviceAreas || [],
          rates: guide.rates || { hourly: 0, daily: 0 },
          isVerified: guide.isVerified || false,
          verificationStatus: guide.verificationStatus || 'unsubmitted'
        }
      }
    });
  } catch (error) {
    console.error('Error updating guide profile:', error);
    res.status(500).json(
      errorResponse('Server error updating guide profile', 500)
    );
  }
};

/**
 * @desc    Upload verification documents
 * @route   POST /api/guides/verification-documents
 * @access  Private (Guide only)
 */
exports.uploadVerificationDocuments = async (req, res) => {
  try {
    // Check if user is a guide
    if (req.user.role !== 'guide') {
      return res.status(403).json(
        errorResponse('Access denied. User is not a guide', 403)
      );
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(
        errorResponse('Please upload at least one document', 400)
      );
    }

    // Upload files to Cloudinary
    const uploadPromises = req.files.map(file => {
      return cloudinaryService.uploadFile(
        file.path,
        'sri-lanka-tourism/guides/verification-documents',
        {
          resource_type: 'auto',
          public_id: `guide_${req.user._id}_${Date.now()}`
        }
      );
    });

    const uploadResults = await Promise.all(uploadPromises);

    // Format document data
    const documents = uploadResults.map((result, index) => ({
      type: String, // URL to stored document
      description: req.body.descriptions ? req.body.descriptions[index] : 'Verification document'
    }));

    // Add documents to guide profile
    const guide = await Guide.findOneAndUpdate(
      { userId: req.user._id },
      { $push: { verificationDocuments: { $each: documents } } },
      { new: true }
    );

    if (!guide) {
      return res.status(404).json(
        errorResponse('Guide profile not found', 404)
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        documents: guide.verificationDocuments
      }
    });
  } catch (error) {
    console.error('Error uploading verification documents:', error);
    res.status(500).json(
      errorResponse('Server error uploading verification documents', 500)
    );
  }
};

/**
 * @desc    Update guide availability
 * @route   PUT /api/guides/availability
 * @access  Private (Guide only)
 */
exports.updateAvailability = async (req, res) => {
  try {
    // Check if user is a guide
    if (req.user.role !== 'guide') {
      return res.status(403).json(
        errorResponse('Access denied. User is not a guide', 403)
      );
    }

    const {
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      unavailableDates
    } = req.body;

    // Fields to update
    const updateFields = {};

    if (monday !== undefined) updateFields['availability.monday'] = monday;
    if (tuesday !== undefined) updateFields['availability.tuesday'] = tuesday;
    if (wednesday !== undefined) updateFields['availability.wednesday'] = wednesday;
    if (thursday !== undefined) updateFields['availability.thursday'] = thursday;
    if (friday !== undefined) updateFields['availability.friday'] = friday;
    if (saturday !== undefined) updateFields['availability.saturday'] = saturday;
    if (sunday !== undefined) updateFields['availability.sunday'] = sunday;
    if (unavailableDates) updateFields['availability.unavailableDates'] = unavailableDates;

    // Update guide availability
    const guide = await Guide.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateFields },
      { new: true }
    );

    if (!guide) {
      return res.status(404).json(
        errorResponse('Guide profile not found', 404)
      );
    }

    res.status(200).json({
      status: 'success',
      data: {
        availability: guide.availability
      }
    });
  } catch (error) {
    console.error('Error updating guide availability:', error);
    res.status(500).json(
      errorResponse('Server error updating guide availability', 500)
    );
  }
};

/**
 * @desc    Get guide by ID
 * @route   GET /api/guides/:id
 * @access  Public
 */
exports.getGuideById = async (req, res) => {
  try {
    // Find guide by ID
    const guide = await Guide.findById(req.params.id)
      .populate('userId', 'firstName lastName email avatar')
      .populate('reviews');

    if (!guide) {
      // Try finding by userId
      const guideByUserId = await Guide.findOne({ userId: req.params.id })
        .populate('userId', 'firstName lastName email avatar')
        .populate('reviews');

      if (!guideByUserId) {
        return res.status(404).json(
          errorResponse('Guide not found', 404)
        );
      }

      // Calculate profile completeness
      const isProfileComplete = 
        guideByUserId.bio && 
        guideByUserId.bio.length > 10 && 
        guideByUserId.languages && guideByUserId.languages.length > 0 && 
        guideByUserId.expertise && guideByUserId.expertise.length > 0 &&
        guideByUserId.serviceAreas && guideByUserId.serviceAreas.length > 0;

      return res.status(200).json({
        status: 'success',
        data: { 
          guide: {
            ...guideByUserId.toObject(),
            isProfileComplete
          } 
        }
      });
    }

    // Calculate profile completeness
    const isProfileComplete = 
      guide.bio && 
      guide.bio.length > 10 && 
      guide.languages && guide.languages.length > 0 && 
      guide.expertise && guide.expertise.length > 0 &&
      guide.serviceAreas && guide.serviceAreas.length > 0;

    res.status(200).json({
      status: 'success',
      data: { 
        guide: {
          ...guide.toObject(),
          isProfileComplete
        } 
      }
    });
  } catch (error) {
    console.error('Error getting guide by ID:', error);
    res.status(500).json(
      errorResponse('Server error retrieving guide', 500)
    );
  }
};

/**
 * @desc    Get list of guides
 * @route   GET /api/guides
 * @access  Public
 */
exports.getGuides = async (req, res) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Add filters for expertise, language, location if provided
    if (req.query.expertise) {
      filter.expertise = { $in: req.query.expertise.split(',') };
    }
    if (req.query.language) {
      filter.languages = { $in: req.query.language.split(',') };
    }
    if (req.query.location) {
      filter.serviceAreas = { $in: req.query.location.split(',') };
    }

    // Add filter for verified guides if requested
    if (req.query.verified === 'true') {
      filter.isVerified = true;
    }

    // Execute query
    const guides = await Guide.find(filter)
      .populate('userId', 'firstName lastName email avatar')
      .sort(req.query.sort || '-averageRating')
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Guide.countDocuments(filter);
    
    // Add profile completeness info to each guide
    const guidesWithCompletion = guides.map(guide => {
      const isProfileComplete = 
        guide.bio && 
        guide.bio.length > 10 && 
        guide.languages && guide.languages.length > 0 && 
        guide.expertise && guide.expertise.length > 0 &&
        guide.serviceAreas && guide.serviceAreas.length > 0;
        
      return {
        ...guide.toObject(),
        isProfileComplete
      };
    });

    res.status(200).json({
      status: 'success',
      results: guides.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      },
      data: {
        guides: guidesWithCompletion
      }
    });
  } catch (error) {
    console.error('Error getting guides:', error);
    res.status(500).json(
      errorResponse('Server error retrieving guides', 500)
    );
  }
};

/**
 * @desc    Submit guide profile for verification
 * @route   POST /api/guides/submit-verification
 * @access  Private (Guide only)
 */
exports.submitForVerification = async (req, res) => {
  try {
    // Check if user is a guide
    if (req.user.role !== 'guide') {
      return res.status(403).json(
        errorResponse('Access denied. User is not a guide', 403)
      );
    }
    
    const guide = await Guide.findOne({ userId: req.user._id });
    
    if (!guide) {
      return res.status(404).json(
        errorResponse('Guide profile not found', 404)
      );
    }
    
    // Check if guide has submitted required information
    if (!guide.licenseNumber || !guide.nic || guide.verificationDocuments.length === 0) {
      return res.status(400).json(
        errorResponse('Please complete your profile with license number, NIC, and verification documents before submitting for verification', 400)
      );
    }
    
    // Update verification status to pending
    guide.verificationStatus = 'pending';
    await guide.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Your profile has been submitted for verification. You will be notified once the process is complete.',
      data: {
        verificationStatus: guide.verificationStatus
      }
    });
  } catch (error) {
    console.error('Error submitting guide for verification:', error);
    res.status(500).json(
      errorResponse('Server error submitting for verification', 500)
    );
  }
};