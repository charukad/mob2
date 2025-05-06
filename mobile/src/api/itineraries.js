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
    const response = await api.post(API_ENDPOINTS.ITINERARIES.CREATE, itineraryData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
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