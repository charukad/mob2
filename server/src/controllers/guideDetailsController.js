const GuideDetails = require('../models/GuideDetails');
const User = require('../models/User');
const errorResponse = require('../utils/errorResponse');

/**
 * @desc    Get guide details
 * @route   GET /api/guides/profile
 * @access  Private (Guide Only)
 */
exports.getGuideDetails = async (req, res) => {
  try {
    // Check if user is a guide
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'guide') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Only guides can access this resource.',
          code: 403
        }
      });
    }

    // Find guide details by email
    let guideDetails = await GuideDetails.findOne({ email: req.user.email });

    // If no details found, return empty defaults
    if (!guideDetails) {
      return res.status(200).json({
        success: true,
        data: {
          email: req.user.email,
          serviceAreas: [],
          languages: [],
          expertise: [],
          experience: 0,
          bio: '',
          isProfileComplete: false
        }
      });
    }

    // Calculate profile completeness
    const isProfileComplete = 
      guideDetails.bio && 
      guideDetails.bio.length > 10 && 
      guideDetails.serviceAreas.length > 0 && 
      guideDetails.languages.length > 0 && 
      guideDetails.expertise.length > 0;

    res.status(200).json({
      success: true,
      data: {
        ...guideDetails.toObject(),
        isProfileComplete
      }
    });
  } catch (error) {
    console.error('Get guide details error:', error);
    res.status(500).json(errorResponse('Failed to get guide details', 500));
  }
};

/**
 * @desc    Update guide details
 * @route   PUT /api/guides/profile
 * @access  Private (Guide Only)
 */
exports.updateGuideDetails = async (req, res) => {
  try {
    // Check if user is a guide
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'guide') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Only guides can update their profile.',
          code: 403
        }
      });
    }

    // Validate input
    const { serviceAreas, languages, expertise, experience, bio, hourlyRate, dailyRate } = req.body;

    // Find existing guide details by email
    let guideDetails = await GuideDetails.findOne({ email: req.user.email });

    if (guideDetails) {
      // Update existing record
      console.log('Updating existing guide details for:', req.user.email);
      
      // Update fields if provided
      if (serviceAreas) guideDetails.serviceAreas = serviceAreas;
      if (languages) guideDetails.languages = languages;
      if (expertise) guideDetails.expertise = expertise;
      if (experience !== undefined) guideDetails.experience = experience;
      if (bio) guideDetails.bio = bio;
      if (hourlyRate !== undefined) guideDetails.hourlyRate = hourlyRate;
      if (dailyRate !== undefined) guideDetails.dailyRate = dailyRate;
      
      await guideDetails.save();
    } else {
      // Create new record
      console.log('Creating new guide details for:', req.user.email);
      guideDetails = await GuideDetails.create({
        email: req.user.email,
        userId: req.user.id,
        serviceAreas: serviceAreas || [],
        languages: languages || [],
        expertise: expertise || [],
        experience: experience || 0,
        bio: bio || '',
        hourlyRate: hourlyRate || 0,
        dailyRate: dailyRate || 0
      });
    }

    // Calculate profile completeness
    const isProfileComplete = 
      guideDetails.bio && 
      guideDetails.bio.length > 10 && 
      guideDetails.serviceAreas.length > 0 && 
      guideDetails.languages.length > 0 && 
      guideDetails.expertise.length > 0;

    res.status(200).json({
      success: true,
      data: {
        ...guideDetails.toObject(),
        isProfileComplete
      },
      message: 'Guide profile updated successfully'
    });
  } catch (error) {
    console.error('Update guide details error:', error);
    res.status(500).json(errorResponse('Failed to update guide details', 500));
  }
};

/**
 * @desc    Get guide details by ID (for public profile)
 * @route   GET /api/guides/:id
 * @access  Public
 */
exports.getGuideDetailsById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('firstName lastName email avatar role');
    
    if (!user || user.role !== 'guide') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Guide not found',
          code: 404
        }
      });
    }

    // Find guide details by email
    const guideDetails = await GuideDetails.findOne({ email: user.email });

    if (!guideDetails) {
      return res.status(200).json({
        success: true,
        data: {
          guide: user,
          details: {
            serviceAreas: [],
            languages: [],
            expertise: [],
            experience: 0,
            bio: '',
            isProfileComplete: false
          }
        }
      });
    }

    // Calculate profile completeness
    const isProfileComplete = 
      guideDetails.bio && 
      guideDetails.bio.length > 10 && 
      guideDetails.serviceAreas.length > 0 && 
      guideDetails.languages.length > 0 && 
      guideDetails.expertise.length > 0;

    // Prepare public profile data
    const publicProfile = {
      guide: user,
      details: {
        serviceAreas: guideDetails.serviceAreas,
        languages: guideDetails.languages,
        expertise: guideDetails.expertise,
        experience: guideDetails.experience,
        bio: guideDetails.bio,
        hourlyRate: guideDetails.hourlyRate,
        dailyRate: guideDetails.dailyRate,
        isVerified: guideDetails.isVerified,
        isProfileComplete
      }
    };

    res.status(200).json({
      success: true,
      data: publicProfile
    });
  } catch (error) {
    console.error('Get guide details by ID error:', error);
    res.status(500).json(errorResponse('Failed to get guide details', 500));
  }
};

/**
 * @desc    Get all guides
 * @route   GET /api/guides
 * @access  Public
 */
exports.getAllGuides = async (req, res) => {
  try {
    // Find all users with guide role
    const guideUsers = await User.find({ role: 'guide' })
      .select('firstName lastName email avatar role');

    // Get guide details for all guides
    const guides = await Promise.all(
      guideUsers.map(async (user) => {
        const details = await GuideDetails.findOne({ email: user.email });
        
        // If no details, return minimal info
        if (!details) {
          return {
            guide: user,
            details: {
              serviceAreas: [],
              languages: [],
              expertise: [],
              experience: 0,
              bio: '',
              isProfileComplete: false
            }
          };
        }

        // Calculate profile completeness
        const isProfileComplete = 
          details.bio && 
          details.bio.length > 10 && 
          details.serviceAreas.length > 0 && 
          details.languages.length > 0 && 
          details.expertise.length > 0;

        return {
          guide: user,
          details: {
            serviceAreas: details.serviceAreas,
            languages: details.languages,
            expertise: details.expertise,
            experience: details.experience,
            bio: details.bio,
            hourlyRate: details.hourlyRate,
            dailyRate: details.dailyRate,
            isVerified: details.isVerified,
            isProfileComplete
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      count: guides.length,
      data: guides
    });
  } catch (error) {
    console.error('Get all guides error:', error);
    res.status(500).json(errorResponse('Failed to get guides', 500));
  }
}; 