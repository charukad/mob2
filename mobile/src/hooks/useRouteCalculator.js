import { useState, useEffect } from 'react';
import axios from 'axios';

// This would be a real API key in a production app
// Note: In production, API keys should be secured on the backend
const API_KEY = 'your_google_directions_api_key';

/**
 * Custom hook for calculating routes between locations
 */
const useRouteCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  
  /**
   * Calculate a route between two points
   * @param {Object} origin - Origin coordinates {latitude, longitude}
   * @param {Object} destination - Destination coordinates {latitude, longitude}
   * @param {String} mode - Travel mode (driving, walking, bicycling, transit)
   * @param {Array} waypoints - Optional waypoints [{latitude, longitude}, ...]
   */
  const calculateRoute = async (origin, destination, mode = 'driving', waypoints = []) => {
    if (!origin || !destination) {
      setError('Origin and destination are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would be a call to the Google Directions API
      // For now, let's simulate a response with mock data
      
      // Convert coordinates to strings
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;
      
      console.log(`Calculating route from ${originStr} to ${destinationStr} via ${mode}`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock polyline between the two points
      const steps = 10;
      const latDiff = destination.latitude - origin.latitude;
      const lngDiff = destination.longitude - origin.longitude;
      
      const polyline = Array.from({ length: steps + 1 }, (_, i) => ({
        latitude: origin.latitude + (latDiff * i / steps),
        longitude: origin.longitude + (lngDiff * i / steps),
      }));
      
      // Calculate mock distance and duration
      // In a real app, this would come from the API response
      const distanceInKm = calculateHaversineDistance(origin, destination);
      
      // Estimate duration based on mode and distance
      let durationInMinutes;
      switch (mode) {
        case 'walking':
          durationInMinutes = distanceInKm * 12; // Approx. 5 km/h
          break;
        case 'bicycling':
          durationInMinutes = distanceInKm * 4; // Approx. 15 km/h
          break;
        case 'transit':
          durationInMinutes = distanceInKm * 3; // Approx. 20 km/h (including stops)
          break;
        case 'driving':
        default:
          durationInMinutes = distanceInKm * 1.5; // Approx. 40 km/h (including traffic)
          break;
      }
      
      // Format results
      const routeResult = {
        polyline,
        legs: [{
          distance: {
            text: `${distanceInKm.toFixed(1)} km`,
            value: distanceInKm * 1000, // meters
          },
          duration: {
            text: formatDuration(durationInMinutes),
            value: durationInMinutes * 60, // seconds
          },
          steps: generateMockSteps(origin, destination, polyline, mode),
        }],
      };
      
      setRoute(routeResult);
      setDistance(routeResult.legs[0].distance);
      setDuration(routeResult.legs[0].duration);
      setLoading(false);
    } catch (err) {
      console.error('Error calculating route:', err);
      setError('Failed to calculate route. Please try again.');
      setLoading(false);
    }
  };
  
  /**
   * Calculate a route with multiple stops
   * @param {Array} points - Array of coordinate objects [{latitude, longitude}, ...]
   * @param {String} mode - Travel mode (driving, walking, bicycling, transit)
   */
  const calculateRouteWithMultipleStops = async (points, mode = 'driving') => {
    if (!points || points.length < 2) {
      setError('At least two points are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const origin = points[0];
      const destination = points[points.length - 1];
      const waypoints = points.slice(1, points.length - 1);
      
      await calculateRoute(origin, destination, mode, waypoints);
    } catch (err) {
      console.error('Error calculating multi-stop route:', err);
      setError('Failed to calculate route. Please try again.');
      setLoading(false);
    }
  };
  
  /**
   * Calculate route for a specific day in an itinerary
   * @param {Array} activities - Array of activities with location coordinates
   * @param {String} mode - Travel mode (driving, walking, bicycling, transit)
   */
  const calculateDayRoute = (activities, mode = 'driving') => {
    if (!activities || activities.length < 2) {
      setError('At least two activities with locations are required');
      return;
    }
    
    // Filter activities with location information
    const pointsWithLocation = activities
      .filter(activity => 
        activity.location && 
        activity.location.coordinates &&
        activity.location.coordinates.latitude &&
        activity.location.coordinates.longitude
      )
      .map(activity => ({
        latitude: activity.location.coordinates.latitude,
        longitude: activity.location.coordinates.longitude,
        title: activity.title,
      }));
    
    if (pointsWithLocation.length < 2) {
      setError('At least two activities with valid locations are required');
      return;
    }
    
    // Calculate route with the filtered points
    calculateRouteWithMultipleStops(pointsWithLocation, mode);
  };
  
  /**
   * Calculate optimized route (traveling salesman approximation)
   * @param {Array} points - Array of coordinate objects [{latitude, longitude}, ...]
   * @param {String} mode - Travel mode (driving, walking, bicycling, transit)
   */
  const calculateOptimizedRoute = async (points, mode = 'driving') => {
    if (!points || points.length < 2) {
      setError('At least two points are required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // In a real app, this would use the Google Directions API with optimize:true
      // For now, let's just use a simple nearest neighbor algorithm
      
      const optimizedPoints = [points[0]]; // Start with the first point
      const remainingPoints = [...points.slice(1)];
      
      while (remainingPoints.length > 0) {
        const lastPoint = optimizedPoints[optimizedPoints.length - 1];
        
        // Find nearest neighbor
        let nearestIndex = 0;
        let nearestDistance = calculateHaversineDistance(lastPoint, remainingPoints[0]);
        
        for (let i = 1; i < remainingPoints.length; i++) {
          const distance = calculateHaversineDistance(lastPoint, remainingPoints[i]);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = i;
          }
        }
        
        // Add nearest point to optimized route
        optimizedPoints.push(remainingPoints[nearestIndex]);
        remainingPoints.splice(nearestIndex, 1);
      }
      
      // Calculate route with optimized points
      await calculateRouteWithMultipleStops(optimizedPoints, mode);
    } catch (err) {
      console.error('Error calculating optimized route:', err);
      setError('Failed to calculate optimized route. Please try again.');
      setLoading(false);
    }
  };
  
  // Helper function to calculate distance between two points using Haversine formula
  const calculateHaversineDistance = (point1, point2) => {
    const R = 6371; // Earth radius in km
    const dLat = toRad(point2.latitude - point1.latitude);
    const dLon = toRad(point2.longitude - point1.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(point1.latitude)) * Math.cos(toRad(point2.latitude)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Helper function to convert degrees to radians
  const toRad = (degrees) => {
    return degrees * Math.PI / 180;
  };
  
  // Helper function to format duration
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} mins`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} mins`;
  };
  
  // Helper function to generate mock route steps
  const generateMockSteps = (origin, destination, polyline, mode) => {
    // In a real app, steps would come from the Directions API
    // For now, we'll create some mock steps
    
    const steps = [
      {
        distance: {
          text: '0.5 km',
          value: 500
        },
        duration: {
          text: '2 mins',
          value: 120
        },
        instructions: `Head northeast on Main Street`,
        travel_mode: mode.toUpperCase()
      },
      {
        distance: {
          text: '1.2 km',
          value: 1200
        },
        duration: {
          text: '5 mins',
          value: 300
        },
        instructions: `Turn right onto Park Avenue`,
        travel_mode: mode.toUpperCase()
      },
      {
        distance: {
          text: '0.8 km',
          value: 800
        },
        duration: {
          text: '3 mins',
          value: 180
        },
        instructions: `Continue onto Lake Road`,
        travel_mode: mode.toUpperCase()
      }
    ];
    
    return steps;
  };
  
  return {
    loading,
    error,
    route,
    distance,
    duration,
    calculateRoute,
    calculateRouteWithMultipleStops,
    calculateDayRoute,
    calculateOptimizedRoute,
  };
};

export default useRouteCalculator;