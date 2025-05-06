const Alert = require('../models/Alert');
const AlertSubscription = require('../models/AlertSubscription');
const Location = require('../models/Location');
const User = require('../models/User');
const Itinerary = require('../models/Itinerary');
const pushService = require('../services/push');
const weatherService = require('../services/weather');
const errorResponse = require('../utils/errorResponse');

// @desc    Get alerts for the user
// @route   GET /api/alerts
// @access  Private
exports.getAlerts = async (req, res, next) => {
  try {
    // Get user's current and upcoming itineraries
    const itineraries = await Itinerary.find({
      user: req.user.id,
      endDate: { $gte: new Date() }
    });
    
    // Extract location IDs from itineraries
    const itineraryLocationIds = [];
    itineraries.forEach(itinerary => {
      itinerary.activities.forEach(activity => {
        if (activity.location) {
          itineraryLocationIds.push(activity.location);
        }
      });
    });
    
    // Get user's alert subscriptions
    const subscriptions = await AlertSubscription.find({
      user: req.user.id,
      active: true
    });
    
    const subscriptionLocationIds = subscriptions.map(sub => sub.location);
    
    // Combine location IDs from itineraries and subscriptions
    const relevantLocationIds = [...new Set([
      ...itineraryLocationIds,
      ...subscriptionLocationIds
    ])];
    
    // Get alerts relevant to these locations that haven't been dismissed by the user
    const alerts = await Alert.find({
      $and: [
        {
          $or: [
            { affectedLocations: { $in: relevantLocationIds } },
            { targetUsers: req.user.id },
            { targetUsers: { $size: 0 } } // Global alerts
          ]
        },
        { dismissedBy: { $ne: req.user.id } },
        { active: true },
        { 
          $or: [
            { expiresAt: { $gt: new Date() } },
            { expiresAt: null }
          ]
        }
      ]
    }).sort({ severity: -1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      alerts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Dismiss an alert
// @route   POST /api/alerts/:id/dismiss
// @access  Private
exports.dismissAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return next(
        new errorResponse('Alert not found', 404)
      );
    }
    
    // Add user to dismissedBy array if not already there
    if (!alert.dismissedBy.includes(req.user.id)) {
      alert.dismissedBy.push(req.user.id);
      await alert.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Alert dismissed successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Subscribe to alerts for locations
// @route   POST /api/alerts/subscribe
// @access  Private
exports.subscribeToAlerts = async (req, res, next) => {
  try {
    const { locationIds } = req.body;
    
    if (!locationIds || !Array.isArray(locationIds)) {
      return next(
        new errorResponse('Location IDs array is required', 400)
      );
    }
    
    // Validate that locations exist
    const locations = await Location.find({
      _id: { $in: locationIds }
    });
    
    if (locations.length !== locationIds.length) {
      return next(
        new errorResponse('One or more locations not found', 404)
      );
    }
    
    // Create or update subscriptions
    const subscriptionPromises = locations.map(async location => {
      let subscription = await AlertSubscription.findOne({
        user: req.user.id,
        location: location._id
      });
      
      if (subscription) {
        // Update existing subscription
        subscription.active = true;
        await subscription.save();
      } else {
        // Create new subscription
        subscription = await AlertSubscription.create({
          user: req.user.id,
          location: location._id,
          alertTypes: ['weather', 'safety', 'traffic', 'health', 'transportation']
        });
      }
      
      return subscription;
    });
    
    await Promise.all(subscriptionPromises);
    
    // Get updated list of subscriptions
    const subscriptions = await AlertSubscription.find({
      user: req.user.id,
      active: true
    }).populate('location', 'name');
    
    res.status(200).json({
      success: true,
      subscriptions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Unsubscribe from alerts for locations
// @route   POST /api/alerts/unsubscribe
// @access  Private
exports.unsubscribeFromAlerts = async (req, res, next) => {
  try {
    const { locationIds } = req.body;
    
    if (!locationIds || !Array.isArray(locationIds)) {
      return next(
        new errorResponse('Location IDs array is required', 400)
      );
    }
    
    // Deactivate subscriptions
    await AlertSubscription.updateMany(
      {
        user: req.user.id,
        location: { $in: locationIds }
      },
      {
        active: false
      }
    );
    
    // Get updated list of subscriptions
    const subscriptions = await AlertSubscription.find({
      user: req.user.id,
      active: true
    }).populate('location', 'name');
    
    res.status(200).json({
      success: true,
      subscriptions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get alert subscriptions
// @route   GET /api/alerts/subscriptions
// @access  Private
exports.getSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await AlertSubscription.find({
      user: req.user.id,
      active: true
    }).populate('location', 'name latitude longitude');
    
    res.status(200).json({
      success: true,
      subscriptions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get relevant locations for alerts
// @route   GET /api/alerts/relevant-locations
// @access  Private
exports.getRelevantLocations = async (req, res, next) => {
  try {
    // Get user's current and upcoming itineraries
    const itineraries = await Itinerary.find({
      user: req.user.id,
      endDate: { $gte: new Date() }
    }).populate('activities.location', 'name latitude longitude');
    
    // Extract locations from itineraries
    const itineraryLocations = [];
    itineraries.forEach(itinerary => {
      itinerary.activities.forEach(activity => {
        if (activity.location) {
          itineraryLocations.push({
            id: activity.location._id,
            name: activity.location.name,
            latitude: activity.location.latitude,
            longitude: activity.location.longitude
          });
        }
      });
    });
    
    // Get user's alert subscriptions
    const subscriptions = await AlertSubscription.find({
      user: req.user.id,
      active: true
    }).populate('location', 'name latitude longitude');
    
    const subscriptionLocations = subscriptions.map(sub => ({
      id: sub.location._id,
      name: sub.location.name,
      latitude: sub.location.latitude,
      longitude: sub.location.longitude
    }));
    
    // Combine locations, removing duplicates by ID
    const locationMap = new Map();
    
    [...itineraryLocations, ...subscriptionLocations].forEach(location => {
      if (location.id) {
        locationMap.set(location.id.toString(), location);
      }
    });
    
    const locations = Array.from(locationMap.values());
    
    res.status(200).json({
      success: true,
      locations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current routes from active itineraries
// @route   GET /api/alerts/current-routes
// @access  Private
exports.getCurrentRoutes = async (req, res, next) => {
  try {
    // Get the user's active itinerary (current date falls within start/end dates)
    const today = new Date();
    
    const activeItineraries = await Itinerary.find({
      user: req.user.id,
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).populate('activities.location', 'name latitude longitude');
    
    // Extract routes from itineraries
    const routes = [];
    
    activeItineraries.forEach(itinerary => {
      // Group activities by day
      const activitiesByDay = new Map();
      
      itinerary.activities.forEach(activity => {
        const day = new Date(activity.date).toISOString().split('T')[0];
        
        if (!activitiesByDay.has(day)) {
          activitiesByDay.set(day, []);
        }
        
        activitiesByDay.get(day).push(activity);
      });
      
      // For each day, create a route from sorted activities
      activitiesByDay.forEach((activities, day) => {
        // Sort activities by startTime
        activities.sort((a, b) => {
          return new Date(`${day}T${a.startTime}`) - new Date(`${day}T${b.startTime}`);
        });
        
        // Create route from ordered activities
        const route = activities
          .filter(activity => activity.location) // Only include activities with locations
          .map(activity => ({
            locationId: activity.location._id,
            name: activity.location.name,
            latitude: activity.location.latitude,
            longitude: activity.location.longitude,
            startTime: activity.startTime,
            endTime: activity.endTime
          }));
        
        if (route.length > 1) {
          routes.push({
            day,
            points: route
          });
        }
      });
    });
    
    res.status(200).json({
      success: true,
      routes
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get travel advisories
// @route   GET /api/alerts/travel-advisories
// @access  Private
exports.getTravelAdvisories = async (req, res, next) => {
  try {
    // This would typically fetch from an external API or database
    // For this implementation, we'll return sample data
    
    const advisories = [
      {
        id: 'advisory-001',
        title: 'Flooding in Southern Provinces',
        description: 'Heavy rainfall has caused flooding in parts of Southern Sri Lanka. Some roads may be impassable.',
        type: 'safety',
        severity: 'medium',
        location: 'Southern Province',
        latitude: 6.0535,
        longitude: 80.2210,
        source: 'Sri Lanka Disaster Management Center',
        timestamp: new Date().toISOString(),
        affectedAreas: 'Galle, Matara, Hambantota districts',
        recommendations: 'Avoid travel to affected areas. Check road conditions before departing.'
      },
      {
        id: 'advisory-002',
        title: 'Planned Demonstrations in Colombo',
        description: 'Peaceful demonstrations are planned in central Colombo on Friday afternoon. Expect road closures and increased security presence.',
        type: 'safety',
        severity: 'low',
        location: 'Colombo',
        latitude: 6.9271,
        longitude: 79.8612,
        source: 'Sri Lanka Police Department',
        timestamp: new Date().toISOString(),
        affectedAreas: 'Colombo Fort, Pettah, Galle Face Green',
        recommendations: 'Avoid demonstration areas. Allow extra time for travel in the city.'
      }
    ];
    
    res.status(200).json({
      success: true,
      advisories
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get traffic alerts
// @route   POST /api/alerts/traffic
// @access  Private
exports.getTrafficAlerts = async (req, res, next) => {
  try {
    const { routes } = req.body;
    
    if (!routes || !Array.isArray(routes)) {
      return next(
        new errorResponse('Routes array is required', 400)
      );
    }
    
    // This would typically fetch from an external API based on routes
    // For this implementation, we'll return sample data
    
    const trafficAlerts = [
      {
        id: 'traffic-001',
        title: 'Heavy Traffic on Galle Road',
        description: 'Construction causing delays between Bambalapitiya and Kollupitiya. Expect 20-30 minute delays.',
        type: 'traffic',
        severity: 'medium',
        location: 'Colombo',
        latitude: 6.9010,
        longitude: 79.8535,
        source: 'Sri Lanka Traffic Police',
        timestamp: new Date().toISOString(),
        recommendations: 'Consider Marine Drive as an alternative route.'
      },
      {
        id: 'traffic-002',
        title: 'Road Closure on Kandy Road',
        description: 'Temporary road closure due to landslide clearing operations. Road expected to reopen by evening.',
        type: 'traffic',
        severity: 'high',
        location: 'Kandy',
        latitude: 7.2906,
        longitude: 80.6337,
        source: 'Road Development Authority',
        timestamp: new Date().toISOString(),
        recommendations: 'Use alternative routes via Peradeniya.'
      }
    ];
    
    res.status(200).json({
      success: true,
      trafficAlerts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get health advisories
// @route   GET /api/alerts/health
// @access  Private
exports.getHealthAdvisories = async (req, res, next) => {
  try {
    // This would typically fetch from an external API or database
    // For this implementation, we'll return sample data
    
    const healthAdvisories = [
      {
        id: 'health-001',
        title: 'Dengue Fever Advisory',
        description: 'Increased cases of dengue fever reported in Western Province. Take precautions against mosquito bites.',
        type: 'health',
        severity: 'medium',
        location: 'Western Province',
        latitude: 6.9271,
        longitude: 79.8612,
        source: 'Sri Lanka Ministry of Health',
        timestamp: new Date().toISOString(),
        recommendations: 'Use mosquito repellent, wear long sleeves, and stay in accommodations with screens or air conditioning.'
      }
    ];
    
    res.status(200).json({
      success: true,
      healthAdvisories
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new alert (internal)
// @access  Private (internal)
exports.createAlert = async (alertData) => {
  try {
    const alert = await Alert.create(alertData);
    
    // Send push notifications to relevant users
    let targetUsers = [];
    
    // If targeting specific users
    if (alertData.targetUsers && alertData.targetUsers.length > 0) {
      targetUsers = alertData.targetUsers;
    } 
    // If targeting users by affected locations
    else if (alertData.affectedLocations && alertData.affectedLocations.length > 0) {
      // Get subscriptions for these locations
      const subscriptions = await AlertSubscription.find({
        location: { $in: alertData.affectedLocations },
        active: true,
        alertTypes: alertData.type
      });
      
      // Extract user IDs from subscriptions
      targetUsers = [...new Set(subscriptions.map(sub => sub.user))];
      
      // Also find users with active itineraries in affected locations
      const today = new Date();
      
      const itineraries = await Itinerary.find({
        'activities.location': { $in: alertData.affectedLocations },
        startDate: { $lte: today.setDate(today.getDate() + 7) }, // Within next 7 days
        endDate: { $gte: today }
      });
      
      // Add users from itineraries
      const itineraryUsers = itineraries.map(itinerary => itinerary.user);
      targetUsers = [...new Set([...targetUsers, ...itineraryUsers])];
    }
    
    // Send push notifications to target users
    if (targetUsers.length > 0) {
      const pushPromises = targetUsers.map(userId => 
        pushService.sendPushNotification(
          userId,
          alertData.title,
          {
            type: 'alert',
            alert: alert,
            navigationRoute: 'Alerts'
          }
        )
      );
      
      await Promise.all(pushPromises);
    }
    
    return alert;
  } catch (err) {
    console.error('Error creating alert:', err);
    return null;
  }
};