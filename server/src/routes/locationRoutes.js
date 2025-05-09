const express = require('express');
const router = express.Router();
const axios = require('axios');
const { responseWrapper } = require('../utils/responseWrapper');
const Location = require('../models/Location');

// Mock locations from the data
const mockLocations = require('../data/locations');

// Log all requests for debugging
router.use((req, res, next) => {
  console.log(`[LocationRoutes] ${req.method} ${req.originalUrl}`);
  next();
});

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get all locations
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/', async (req, res) => {
  try {
    console.log('[LocationRoutes] Getting all locations');
    // Try to get locations from the database
    let locations = await Location.find({});
    
    // If no locations in database, use mock data
    if (!locations || locations.length === 0) {
      locations = mockLocations;
    }
    
    return responseWrapper(res, 200, 'Locations found', { locations });
  } catch (error) {
    console.error('Location fetch error:', error);
    return responseWrapper(res, 500, error.message);
  }
});

/**
 * @swagger
 * /api/locations/search:
 *   get:
 *     summary: Search locations
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/search', async (req, res) => {
  try {
    console.log('[LocationRoutes] Searching locations:', req.query);
    const { query, type } = req.query;
    
    // Use Google Places API for search
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return responseWrapper(res, 500, 'Google Maps API key not configured');
    }
    
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    const params = {
      query: `${query} Sri Lanka`,
      key: apiKey,
      region: 'lk'
    };
    
    if (type) {
      params.type = type;
    }
    
    const response = await axios.get(url, { params });
    
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      // If Google Places API fails, fall back to mock data
      let filteredLocations = mockLocations;
      
      if (query) {
        filteredLocations = mockLocations.filter(location => 
          location.name.toLowerCase().includes(query.toLowerCase()) || 
          location.description.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      if (type) {
        filteredLocations = filteredLocations.filter(location => 
          location.category === type
        );
      }
      
      return responseWrapper(res, 200, 'Locations found from mock data', { 
        locations: filteredLocations,
        hasNext: false
      });
    }
    
    // Transform Google Places results to match our app's location format
    const locations = response.data.results.map(place => ({
      id: place.place_id,
      name: place.name,
      description: place.formatted_address,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      photos: place.photos ? place.photos.map(photo => ({
        url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
      })) : [],
      rating: place.rating || 0,
      category: place.types && place.types.length > 0 ? place.types[0] : 'tourist_attraction',
      isGooglePlace: true
    }));
    
    return responseWrapper(res, 200, 'Locations found', { 
      locations, 
      hasNext: !!response.data.next_page_token,
      nextPageToken: response.data.next_page_token
    });
  } catch (error) {
    console.error('Location search error:', error);
    
    // Fall back to mock data on error
    let filteredLocations = mockLocations;
    
    if (req.query.query) {
      filteredLocations = mockLocations.filter(location => 
        location.name.toLowerCase().includes(req.query.query.toLowerCase()) || 
        location.description.toLowerCase().includes(req.query.query.toLowerCase())
      );
    }
    
    return responseWrapper(res, 200, 'Locations found from mock data (API error fallback)', { 
      locations: filteredLocations,
      hasNext: false
    });
  }
});

/**
 * @swagger
 * /api/locations/categories:
 *   get:
 *     summary: Get all location categories
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/categories', async (req, res) => {
  try {
    console.log('[LocationRoutes] Getting categories');
    // Extract unique categories and types from mock data
    const categories = [...new Set(mockLocations.map(loc => loc.category))];
    const types = [...new Set(mockLocations.map(loc => loc.type))];
    
    return responseWrapper(res, 200, 'Categories found', { 
      categories,
      types
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    return responseWrapper(res, 500, error.message);
  }
});

/**
 * @swagger
 * /api/locations/featured:
 *   get:
 *     summary: Get featured locations
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/featured', async (req, res) => {
  try {
    console.log('[LocationRoutes] Getting featured locations');
    // Get featured locations from mock data
    const featured = mockLocations.filter(loc => loc.isFeatured);
    
    return responseWrapper(res, 200, 'Featured locations found', { 
      locations: featured
    });
  } catch (error) {
    console.error('Featured fetch error:', error);
    return responseWrapper(res, 500, error.message);
  }
});

/**
 * @swagger
 * /api/locations/nearby:
 *   get:
 *     summary: Get nearby locations
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Radius in kilometers
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/nearby', async (req, res) => {
  try {
    console.log('[LocationRoutes] Getting nearby locations:', req.query);
    const { lat, lng, radius = 50, limit = 20 } = req.query;
    
    if (!lat || !lng) {
      return responseWrapper(res, 400, 'Latitude and longitude are required');
    }
    
    // Use mock data for nearby locations
    // In a real implementation, this would query the database using geospatial queries
    // For now, we'll return all locations and simulate "nearby" by random sorting
    
    const allLocations = [...mockLocations];
    
    // Randomize order to simulate nearby locations
    const shuffled = allLocations.sort(() => 0.5 - Math.random());
    const nearbyLocations = shuffled.slice(0, Math.min(limit, shuffled.length));
    
    return responseWrapper(res, 200, 'Nearby locations found', { 
      locations: nearbyLocations
    });
  } catch (error) {
    console.error('Nearby locations error:', error);
    return responseWrapper(res, 500, error.message);
  }
});

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Get a location by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Location not found
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[LocationRoutes] Getting location by ID: ${id}`);
    
    // Check if this is a Google Places ID (they usually start with 'ChIJ')
    if (id.startsWith('ChIJ')) {
      console.log(`[LocationRoutes] Fetching Google Place details for: ${id}`);
      // Forward to Google Places API for details
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('[LocationRoutes] Missing Google Maps API key');
        return responseWrapper(res, 500, 'Google Maps API key not configured');
      }
      
      const url = 'https://maps.googleapis.com/maps/api/place/details/json';
      console.log(`[LocationRoutes] Making request to Google Places API: ${url}`);
      
      try {
        const response = await axios.get(url, {
          params: {
            place_id: id,
            key: apiKey,
            fields: 'name,formatted_address,geometry,photos,rating,types,url,website,formatted_phone_number,opening_hours'
          },
          timeout: 10000 // 10 second timeout
        });
        
        console.log(`[LocationRoutes] Google Places API response status: ${response.data.status}`);
        
        if (response.data.status !== 'OK') {
          console.error(`[LocationRoutes] Google Places API error: ${response.data.status} - ${response.data.error_message || 'No details'}`);
          return responseWrapper(res, 404, `Location not found. Google API status: ${response.data.status}`);
        }
        
        // Transform Google Places result to match our app's location format
        const place = response.data.result;
        const location = {
          id: place.place_id,
          name: place.name,
          description: `Located at ${place.formatted_address}`,
          address: place.formatted_address,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          photos: place.photos ? place.photos.map(photo => ({
            url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${apiKey}`
          })) : [],
          rating: place.rating || 0,
          category: place.types && place.types.length > 0 ? place.types[0] : 'tourist_attraction',
          contact: place.formatted_phone_number || '',
          website: place.website || '',
          isGooglePlace: true
        };
        
        console.log(`[LocationRoutes] Successfully processed Google Place: ${place.name}`);
        
        return responseWrapper(res, 200, 'Location found', { location });
      } catch (googleError) {
        console.error('[LocationRoutes] Google Places API request error:', googleError.message);
        
        // Handle axios errors
        if (googleError.response) {
          // Request made and server responded with a non-2xx status
          console.error(`[LocationRoutes] Google API error response: ${googleError.response.status}`);
          return responseWrapper(res, 500, `Google API error: ${googleError.response.status}`);
        } else if (googleError.request) {
          // Request made but no response received
          console.error('[LocationRoutes] Google API request timeout or network error');
          return responseWrapper(res, 500, 'Failed to connect to Google API. Please try again.');
        } else {
          // Something else happened
          return responseWrapper(res, 500, `Google API error: ${googleError.message}`);
        }
      }
    }
    
    // If not a Google Place, try to find in our database
    let location = await Location.findById(id);
    
    // If not found in database, try mock data
    if (!location) {
      console.log(`[LocationRoutes] Location not found in DB, checking mock data for: ${id}`);
      location = mockLocations.find(loc => loc.id === id);
    }
    
    if (!location) {
      console.log(`[LocationRoutes] Location not found: ${id}`);
      return responseWrapper(res, 404, 'Location not found');
    }
    
    console.log(`[LocationRoutes] Successfully found location: ${location.name}`);
    return responseWrapper(res, 200, 'Location found', { location });
  } catch (error) {
    console.error('[LocationRoutes] Location fetch error:', error);
    return responseWrapper(res, 500, error.message || 'Internal server error');
  }
});

module.exports = router; 