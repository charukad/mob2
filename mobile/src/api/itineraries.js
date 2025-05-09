import api from './axios';
import { API_ENDPOINTS } from '../constants/api';

// Get all itineraries for the current user
export const getItineraries = async (params = {}) => {
  try {
    const response = await api.get(API_ENDPOINTS.ITINERARIES.LIST, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get a single itinerary by ID
export const getItineraryById = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.ITINERARIES.DETAILS(id));
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Create a new itinerary
export const createItinerary = async (itineraryData) => {
  try {
    console.log('API Call: Creating itinerary with endpoint:', API_ENDPOINTS.ITINERARIES.CREATE);
    
    // For FormData, log the keys being sent
    if (itineraryData instanceof FormData) {
      const formDataKeys = [];
      for (let pair of itineraryData.entries()) {
        if (pair[0] === 'coverImage') {
          formDataKeys.push('coverImage: [FILE]');
        } else {
          formDataKeys.push(`${pair[0]}: ${pair[1]}`);
        }
      }
      console.log('FormData contents:', formDataKeys);
    } else {
      console.log('Request payload:', itineraryData);
    }
    
    const response = await api.post(API_ENDPOINTS.ITINERARIES.CREATE, itineraryData);
    console.log('Itinerary created successfully. Server response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Create itinerary API error:', error);
    
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      console.error('Server error response:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });
      throw {
        message: error.response.data?.message || 'Server error',
        status: error.response.status,
        response: error.response.data,
        type: 'server_error'
      };
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      throw {
        message: 'No response from server. Please check your internet connection.',
        request: error.request,
        type: 'network_error'
      };
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
      throw {
        message: error.message || 'Error setting up the request',
        type: 'request_setup_error'
      };
    }
  }
};

// Update an itinerary
export const updateItinerary = async (id, itineraryData) => {
  try {
    const response = await api.put(API_ENDPOINTS.ITINERARIES.UPDATE(id), itineraryData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Delete an itinerary
export const deleteItinerary = async (id) => {
  try {
    const response = await api.delete(API_ENDPOINTS.ITINERARIES.DELETE(id));
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Upload a cover image for an itinerary
export const uploadCoverImage = async (id, imageUri) => {
  try {
    const formData = new FormData();
    
    // Create file object from URI
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('coverImage', {
      uri: imageUri,
      name: filename,
      type,
    });
    
    const response = await api.post(
      `${API_ENDPOINTS.ITINERARIES.UPDATE(id)}/cover-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get itinerary items
export const getItineraryItems = async (itineraryId, params = {}) => {
  try {
    const response = await api.get(API_ENDPOINTS.ITINERARIES.ITEMS(itineraryId), {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get an itinerary item by ID
export const getItineraryItemById = async (itineraryId, itemId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.ITINERARIES.ITEMS(itineraryId)}/${itemId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Create a new itinerary item
export const createItineraryItem = async (itineraryId, itemData) => {
  try {
    const response = await api.post(API_ENDPOINTS.ITINERARIES.ITEMS(itineraryId), itemData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update an itinerary item
export const updateItineraryItem = async (itineraryId, itemId, itemData) => {
  try {
    const response = await api.put(`${API_ENDPOINTS.ITINERARIES.ITEMS(itineraryId)}/${itemId}`, itemData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Delete an itinerary item
export const deleteItineraryItem = async (itineraryId, itemId) => {
  try {
    const response = await api.delete(`${API_ENDPOINTS.ITINERARIES.ITEMS(itineraryId)}/${itemId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Calculate route between locations
export const calculateRoute = async (itineraryId, originCoords, destinationCoords, mode = 'driving') => {
  try {
    const response = await api.post(`${API_ENDPOINTS.ITINERARIES.ITEMS(itineraryId)}/calculate-route`, {
      origin: originCoords,
      destination: destinationCoords,
      mode,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get daily summary for an itinerary
export const getDailySummary = async (itineraryId) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.ITINERARIES.DETAILS(itineraryId)}/daily-summary`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get public itineraries
export const getPublicItineraries = async (params = {}) => {
  try {
    const response = await api.get(`${API_ENDPOINTS.ITINERARIES.LIST}/public`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};