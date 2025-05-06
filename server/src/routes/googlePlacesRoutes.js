const express = require('express');
const router = express.Router();
const axios = require('axios');
const { responseWrapper } = require('../utils/responseWrapper');

/**
 * @swagger
 * /api/google/places/search:
 *   get:
 *     summary: Proxy for Google Places API search
 *     description: Searches for places using the Google Places API
 *     parameters:
 *       - in: query
 *         name: query
 *         description: Search query
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         description: Latitude,longitude
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: radius
 *         description: Search radius in meters
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/search', async (req, res) => {
  try {
    const { query, location, radius, type } = req.query;
    
    if (!query && !location) {
      return responseWrapper(res, 400, 'Query or location is required');
    }
    
    // Google Places API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return responseWrapper(res, 500, 'Google Maps API key not configured');
    }
    
    // Determine which Google API endpoint to use
    let url = '';
    let params = {
      key: apiKey,
    };
    
    if (query && !location) {
      // Use Text Search API
      url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
      params.query = query;
      params.region = 'lk'; // Sri Lanka region bias
    } else if (location) {
      // Use Nearby Search API
      url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
      params.location = location;
      params.radius = radius || 50000; // Default to 50km
      
      if (query) {
        params.keyword = query;
      }
      
      if (type) {
        params.type = type;
      }
    }
    
    // Make request to Google Places API
    const response = await axios.get(url, { params });
    
    // Return the results
    return responseWrapper(res, 200, 'Places found', {
      places: response.data.results,
      status: response.data.status,
      next_page_token: response.data.next_page_token
    });
  } catch (error) {
    console.error('Google Places API Error:', error.message);
    return responseWrapper(res, 500, error.message);
  }
});

/**
 * @swagger
 * /api/google/places/photo:
 *   get:
 *     summary: Proxy for Google Places Photos API
 *     description: Gets a photo from the Google Places Photos API
 *     parameters:
 *       - in: query
 *         name: photoreference
 *         description: Photo reference from Places API
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: maxwidth
 *         description: Maximum width of the photo
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: maxheight
 *         description: Maximum height of the photo
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.get('/photo', async (req, res) => {
  try {
    const { photoreference, maxwidth, maxheight } = req.query;
    
    if (!photoreference) {
      return responseWrapper(res, 400, 'Photo reference is required');
    }
    
    // Google Places API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return responseWrapper(res, 500, 'Google Maps API key not configured');
    }
    
    // Build URL for Google Places Photos API
    let url = 'https://maps.googleapis.com/maps/api/place/photo';
    const params = {
      photoreference,
      key: apiKey,
    };
    
    if (maxwidth) params.maxwidth = maxwidth;
    if (maxheight) params.maxheight = maxheight;
    
    // Make request to Google Places Photos API
    const response = await axios.get(url, { 
      params,
      responseType: 'stream'
    });
    
    // Set headers from the response
    res.set('Content-Type', response.headers['content-type']);
    
    // Pipe the image data directly to the response
    response.data.pipe(res);
  } catch (error) {
    console.error('Google Places Photo API Error:', error.message);
    return responseWrapper(res, 500, error.message);
  }
});

module.exports = router; 