import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_URL, API_URL_OPTIONS } from '../constants/api';
import { checkInternetConnectivity, getNetworkState } from '../utils/networkUtils';
import offlineService from '../services/offlineService';

// Create an axios instance with the correct baseURL
const api = axios.create({
  baseURL: API_URL, // Uses environment-appropriate URL
  timeout: 45000, // 45 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Helper for handling network conditions
const checkNetworkConnection = async () => {
  // Use our enhanced network check
  return await checkInternetConnectivity();
};

// Try multiple API URLs to find one that works
const tryMultipleApiUrls = async (originalRequest) => {
  // Only try multiple URLs in development
  if (!__DEV__) return null;

  // List of possible URLs to try
  for (const baseUrl of API_URL_OPTIONS) {
    try {
      console.log(`[API] Trying alternative API URL: ${baseUrl}`);
      
      // Create a fresh axios instance with this URL
      const altApi = axios.create({
        ...originalRequest,
        baseURL: baseUrl,
        timeout: 5000, // shorter timeout for testing
      });
      
      // Make a basic request to see if this URL works
      const response = await altApi.get('/health', {
        validateStatus: (status) => status < 500 // Accept any non-server error
      });
      
      if (response.status < 500) {
        console.log(`[API] Found working API URL: ${baseUrl}`);
        
        // Save this URL for future use
        await AsyncStorage.setItem('workingApiUrl', baseUrl);
        
        // Update the default baseURL for future requests
        api.defaults.baseURL = baseUrl;
        
        // Return the working URL
        return baseUrl;
      }
    } catch (error) {
      // This URL didn't work, try the next one
    }
  }
  
  // No working URL found
  return null;
};

// Initialize offlineService
offlineService.init().catch(err => {
  console.error('[API] Failed to initialize offline service:', err);
});

// Add request logging in dev mode only
if (__DEV__) {
  api.interceptors.request.use(
    config => {
      console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, 
        config.data ? JSON.stringify(config.data) : '');
      return config;
    },
    error => {
      console.log('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    response => {
      console.log(`✅ API Response: ${response.status} ${response.config.url.split('/').pop()}`);
      return response;
    },
    error => {
      console.log(`❌ API Error: ${error.message || 'Unknown error'}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log('Data:', error.response.data);
      } else if (error.request) {
        console.log('No response received:', error.request);
      }
      return Promise.reject(error);
    }
  );
}

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      // Get network state from offlineService (faster than doing a fresh check)
      const isConnected = offlineService.isNetworkAvailable();
      
      // If offline, queue non-critical requests for later
      if (!isConnected && !config.bypassOfflineCheck && !config.isAuthRequest) {
        console.log(`[API] Device offline. Request to ${config.url} queued.`);
        
        // Queue the request for later
        if (config.offlineSupport !== false) {
          offlineService.queueAction({
            type: 'API_REQUEST',
            method: config.method,
            url: config.url,
            data: config.data,
            headers: config.headers,
            critical: config.isCritical || false,
          });
        }
        
        throw new Error('No internet connection available');
      }
      
      // For critical requests, do a fresh network check
      if (config.isCritical && !isConnected) {
        // Double-check connectivity with a fresh check
        const freshCheck = await checkNetworkConnection();
        if (!freshCheck) {
          throw new Error('No internet connection available');
        }
      }

      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Don't override Content-Type for FormData (file uploads)
      if (config.data instanceof FormData) {
        config.headers['Content-Type'] = 'multipart/form-data';
      }
      
      return config;
    } catch (error) {
      if (__DEV__) {
        console.error('Request interceptor error:', error);
      }
      return Promise.reject({
        message: error.message || 'Failed to prepare request',
        isNetworkError: error.message === 'No internet connection available',
        originalError: error
      });
    }
  },
  (error) => {
    if (__DEV__) {
      console.error('Request interceptor error:', error);
    }
    return Promise.reject({
      message: error.message || 'Failed to prepare request',
      originalError: error
    });
  }
);

// Add a response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      const originalRequest = error.config;
      
      // Log detailed error information for debugging
      if (__DEV__) {
        console.log('API Error Details:', {
          url: originalRequest?.url,
          method: originalRequest?.method,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          headers: originalRequest?.headers || {},
        });
      }
      
      // Handle network errors
      if (!error.response) {
        // Check if device is actually offline
        const isConnected = await getNetworkState(true);
        
        if (!isConnected) {
          // Queue the request for later if enabled
          if (originalRequest && originalRequest.offlineSupport !== false) {
            console.log(`[API] Queuing failed request for when network is available:`, originalRequest.url);
            
            offlineService.queueAction({
              type: 'API_REQUEST',
              method: originalRequest.method,
              url: originalRequest.url,
              data: originalRequest.data,
              headers: originalRequest.headers,
              critical: originalRequest.isCritical || false,
            });
          }
          
          return Promise.reject({
            ...error,
            isNetworkError: true,
            message: 'No internet connection. Please check your network settings.'
          });
        }
        
        // If we're online but still getting network errors, try alternative URLs
        if (originalRequest && !originalRequest._urlRetried) {
          originalRequest._urlRetried = true;
          
          // Try alternative URLs
          const workingUrl = await tryMultipleApiUrls(originalRequest);
          
          if (workingUrl) {
            console.log(`[API] Retrying request with working URL: ${workingUrl}`);
            originalRequest.baseURL = workingUrl;
            return api(originalRequest);
          }
          
          // If no working URL and this is an auth request, try the '/test-login' endpoint
          if (originalRequest.isAuthRequest && !originalRequest._testLoginTried) {
            originalRequest._testLoginTried = true;
            
            try {
              // This is a special development fallback
              if (__DEV__) {
                console.log('[API] Trying development test login endpoint');
                
                // Extract credentials from original request
                const loginData = originalRequest.data || {};
                
                // Make a request to the test login endpoint
                const testLoginResponse = await axios({
                  method: 'post',
                  url: `${originalRequest.baseURL}/test-login`,
                  data: loginData,
                  timeout: 5000,
                });
                
                if (testLoginResponse.status === 200) {
                  console.log('[API] Development test login successful');
                  return testLoginResponse;
                }
              }
            } catch (testLoginError) {
              console.error('[API] Test login attempt failed:', testLoginError.message);
            }
          }
        }
        
        // If we've reached here, we're likely online but having connection issues with server
        return Promise.reject({
          ...error,
          isNetworkError: true,
          message: 'Network error. Unable to connect to the server. Please check if the server is running.'
        });
      }
      
      // If the error status is 401 and there is no originalRequest._retry flag,
      // it means the token has expired and we need to refresh it
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          
          if (!refreshToken) {
            // No refresh token available, user must login again
            await AsyncStorage.removeItem('authToken');
            return Promise.reject({
              ...error,
              isAuthError: true,
              message: 'Session expired. Please login again.'
            });
          }
          
          // Create a fresh axios instance for token refresh to avoid interceptors
          const refreshAxios = axios.create({
            baseURL: API_URL,
            timeout: 10000,
          });
          
          // Attempt to refresh the token
          const response = await refreshAxios.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
            refreshToken
          });
          
          if (response.data?.token) {
            const newToken = response.data.token;
            const newRefreshToken = response.data.refreshToken;
            
            // Save the new tokens
            await AsyncStorage.setItem('authToken', newToken);
            await AsyncStorage.setItem('refreshToken', newRefreshToken);
            
            // Update the original request with the new token
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            
            // Retry the original request with the new token
            return api(originalRequest);
          } else {
            throw new Error('Invalid token refresh response');
          }
        } catch (refreshError) {
          console.error('[API] Token refresh failed:', refreshError.message);
          
          // Clear tokens as they're invalid
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('refreshToken');
          
          return Promise.reject({
            ...error,
            isAuthError: true,
            message: 'Authentication failed. Please login again.'
          });
        }
      }
      
      // Handle other error cases
      if (error.response.status === 403) {
        return Promise.reject({
          ...error,
          isAuthError: true,
          message: 'You do not have permission to access this resource.'
        });
      }
      
      // Return the original error if we can't handle it
      return Promise.reject(error);
    } catch (handlerError) {
      console.error('[API] Error in response interceptor:', handlerError);
      // Return the original error if our handler fails
      return Promise.reject(error);
    }
  }
);

export default api;