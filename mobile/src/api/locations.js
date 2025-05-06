import api from './axios';
import { API_ENDPOINTS } from '../constants/api';

// Get all locations with pagination and filters
export const getLocations = async (params = {}) => {
  try {
    const response = await api.get(API_ENDPOINTS.LOCATIONS.LIST, {
      params,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get featured locations
export const getFeaturedLocations = async (limit = 6) => {
  try {
    const response = await api.get(API_ENDPOINTS.LOCATIONS.FEATURED, {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get location by ID
export const getLocationById = async (id) => {
  try {
    const response = await api.get(API_ENDPOINTS.LOCATIONS.DETAILS(id));
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Search locations
export const searchLocations = async (query, page = 1, limit = 20) => {
  try {
    const response = await api.get(API_ENDPOINTS.LOCATIONS.SEARCH, {
      params: { query, page, limit },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get nearby locations
export const getNearbyLocations = async (lat, lng, radius = 10, limit = 10) => {
  try {
    const response = await api.get(API_ENDPOINTS.LOCATIONS.NEARBY, {
      params: { lat, lng, radius, limit },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get location categories and types
export const getLocationCategories = async () => {
  try {
    const response = await api.get(API_ENDPOINTS.LOCATIONS.CATEGORIES);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};