const express = require('express');
const router = express.Router();
const axios = require('axios');

// Get Google Maps API key from environment variables
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyA-2OvXggOlxKWuByjgQq6cwYj8TrWnvHo';

// Location categories with icons
const locationCategories = [
  { _id: 'cat1', name: 'Historical', icon: 'landmark', placeType: 'tourist_attraction,museum' },
  { _id: 'cat2', name: 'Nature', icon: 'tree', placeType: 'natural_feature,park' },
  { _id: 'cat3', name: 'Beaches', icon: 'umbrella-beach', placeType: 'natural_feature' },
  { _id: 'cat4', name: 'Religious', icon: 'place-of-worship', placeType: 'hindu_temple,mosque,church,place_of_worship' },
  { _id: 'cat5', name: 'Adventure', icon: 'hiking', placeType: 'park,amusement_park' }
];

// Helper function to format Places API results to our location format
const formatPlaceToLocation = (place, type = 'other') => ({
  _id: place.place_id,
  name: place.name,
  shortDescription: place.types?.join(', ').replace(/_/g, ' ') || '',
  description: place.formatted_address || place.vicinity || '',
  images: place.photos ? [
    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photoreference=${place.photos[0].photo_reference}&key=${googleMapsApiKey}`
  ] : [],
  address: {
    city: '',
    province: '',
    country: 'Sri Lanka'
  },
  location: {
    coordinates: [
      place.geometry?.location?.lng || 0, 
      place.geometry?.location?.lat || 0
    ],
    city: '',
    region: '',
    address: place.formatted_address || place.vicinity || ''
  },
  averageRating: place.rating || 0,
  type: type,
  googlePlaceId: place.place_id
});

// Main locations endpoint - popular locations in Sri Lanka
router.get('/locations', async (req, res) => {
  try {
    // Get popular locations in Sri Lanka
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=popular+attractions+in+sri+lanka&region=lk&key=${googleMapsApiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK' || !response.data.results) {
      return res.status(200).json({
        success: true,
        data: {
          locations: []
        }
      });
    }
    
    const locations = response.data.results.map(place => formatPlaceToLocation(place));
    
    res.status(200).json({
      success: true,
      data: {
        locations
      }
    });
  } catch (error) {
    console.error('Error fetching popular locations:', error.message);
    res.status(200).json({
      success: true,
      data: {
        locations: [],
        error: "Error fetching locations from Google Places API"
      }
    });
  }
});

// Categories endpoint
router.get('/locations/categories', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      categories: locationCategories
    }
  });
});

// Nearby locations endpoint
router.get('/locations/nearby', async (req, res) => {
  // Get latitude and longitude from query parameters, with defaults if not provided
  const lat = parseFloat(req.query.lat) || 7.2906;
  const lng = parseFloat(req.query.lng) || 80.6337;
  const radius = parseFloat(req.query.radius) || 5000; // meters
  const type = req.query.type;
  
  try {
    // Build the Google Places API URL for nearby search
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    url += `?location=${lat},${lng}`;
    url += `&radius=${radius}`;
    url += `&key=${googleMapsApiKey}`;
    
    // Add type parameter if provided
    if (type) {
      const category = locationCategories.find(cat => cat.name.toLowerCase() === type.toLowerCase());
      if (category && category.placeType) {
        url += `&type=${category.placeType.split(',')[0]}`;
      }
    }
    
    // Make request to Google Places API
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK' || !response.data.results) {
      return res.status(200).json({
        success: true,
        data: {
          locations: []
        }
      });
    }
    
    // Map Google Places results to our location format and add distance
    const locations = response.data.results.map(place => {
      const placeLat = place.geometry.location.lat;
      const placeLng = place.geometry.location.lng;
      
      // Calculate distance in kilometers (approximate using Haversine formula)
      const R = 6371; // Earth's radius in km
      const dLat = (placeLat - lat) * Math.PI / 180;
      const dLon = (placeLng - lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(placeLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      const distance = R * c; // Distance in km
      
      const locationObj = formatPlaceToLocation(place, type);
      return {
        ...locationObj,
        distance: parseFloat(distance.toFixed(1))
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        locations
      }
    });
    
  } catch (error) {
    console.error('Error fetching nearby locations:', error.message);
    res.status(200).json({
      success: true,
      data: {
        locations: [],
        error: "Error fetching nearby locations from Google Places API"
      }
    });
  }
});

// Location search endpoint with Google Places API integration
router.get('/locations/search', async (req, res) => {
  const { query, type } = req.query;
  console.log(`Search request received: query=${query}, type=${type}`);
  
  try {
    // Use empty results if no query is provided
    if (!query) {
      return res.status(200).json({
        success: true,
        data: {
          locations: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalResults: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    }
    
    // Default to Sri Lanka coordinates for location bias
    const lat = req.query.lat || 7.8731;  // Default to Sri Lanka's latitude
    const lng = req.query.lng || 80.7718; // Default to Sri Lanka's longitude
    
    // Build the Google Places API URL
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    url += `?query=${encodeURIComponent(query + ' sri lanka')}`;
    url += `&location=${lat},${lng}`; // Bias results to this location
    url += `&radius=50000`; // 50km radius
    url += `&region=lk`; // Bias to Sri Lanka
    url += `&key=${googleMapsApiKey}`;
    
    // Add type filter if provided
    if (type) {
      // Map our types to Google types
      const typeMap = {
        'historical': 'tourist_attraction',
        'nature': 'natural_feature',
        'religious': 'hindu_temple,mosque,church,place_of_worship',
        'beach': 'natural_feature',
        'cultural': 'museum',
        'adventure': 'park'
      };
      
      if (typeMap[type]) {
        url += `&type=${typeMap[type]}`;
      }
    }
    
    // Make request to Google Places API
    const response = await axios.get(url);
    console.log(`Google Places API status: ${response.data.status}`);
    
    // Handle case when API returns no results
    if (response.data.status !== 'OK' || !response.data.results || response.data.results.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          locations: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalResults: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    }
    
    // Map Google Places results to our location format
    const locations = response.data.results.map(place => formatPlaceToLocation(place, type));
    
    res.status(200).json({
      success: true,
      data: {
        locations,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalResults: locations.length,
          hasNext: !!response.data.next_page_token,
          hasPrev: false,
          nextPageToken: response.data.next_page_token || null
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching from Google Places API:', error.message);
    res.status(200).json({
      success: true,
      data: {
        locations: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalResults: 0,
          hasNext: false,
          hasPrev: false
        },
        error: "Error connecting to Google Places API"
      }
    });
  }
});

module.exports = router; 