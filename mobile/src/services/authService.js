import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../constants/api';

/**
 * AuthService - Utilities for handling user authentication and user ID retrieval
 */
class AuthService {
  /**
   * Get the current user ID from various storage locations with fallbacks
   * @param {boolean} forceRefresh - Whether to force a refresh from the server if local values are missing
   * @returns {Promise<string|null>} The user ID or null if not found
   */
  async getCurrentUserId(forceRefresh = false) {
    try {
      // First attempt: Direct userId from AsyncStorage (most reliable)
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        console.log('[AuthService] User ID found in AsyncStorage:', userId);
        return userId;
      }
      
      // Second attempt: Try to get from user object
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        try {
          const userData = JSON.parse(userString);
          if (userData && userData._id) {
            const userIdFromUser = userData._id;
            console.log('[AuthService] Retrieved user ID from user object:', userIdFromUser);
            
            // Save for future use
            await AsyncStorage.setItem('userId', userIdFromUser);
            return userIdFromUser;
          }
        } catch (parseError) {
          console.error('[AuthService] Error parsing user data:', parseError);
        }
      }
      
      // Third attempt: Check for userData format
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          if (userData && userData.user && userData.user._id) {
            const userIdFromUserData = userData.user._id;
            console.log('[AuthService] Retrieved user ID from userData:', userIdFromUserData);
            
            // Save for future use
            await AsyncStorage.setItem('userId', userIdFromUserData);
            return userIdFromUserData;
          }
        } catch (parseError) {
          console.error('[AuthService] Error parsing userData:', parseError);
        }
      }
      
      // Final attempt: If we have a token and forceRefresh is enabled, try to get from server
      if (forceRefresh) {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          try {
            console.log('[AuthService] Attempting to retrieve user ID from server...');
            const response = await axios.get(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000
            });
            
            if (response.data && response.data.data && response.data.data.user && response.data.data.user._id) {
              const userIdFromServer = response.data.data.user._id;
              console.log('[AuthService] Retrieved user ID from server:', userIdFromServer);
              
              // Save all relevant user data for future use
              await AsyncStorage.setItem('userId', userIdFromServer);
              await AsyncStorage.setItem('user', JSON.stringify(response.data.data.user));
              
              const userData = {
                user: response.data.data.user,
                token
              };
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
              
              return userIdFromServer;
            }
          } catch (error) {
            console.error('[AuthService] Error retrieving user ID from server:', error);
          }
        }
      }
      
      // If we get here, no user ID was found
      console.warn('[AuthService] No user ID found after all recovery attempts');
      return null;
    } catch (error) {
      console.error('[AuthService] Error in getCurrentUserId:', error);
      return null;
    }
  }
  
  /**
   * Verifies if the user is authenticated with valid credentials
   * @returns {Promise<boolean>} True if user is authenticated
   */
  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await this.getCurrentUserId();
      
      return !!(token && userId);
    } catch (error) {
      console.error('[AuthService] Error checking authentication:', error);
      return false;
    }
  }
  
  /**
   * Clears all authentication data
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      const keys = [
        'authToken', 
        'refreshToken', 
        'user', 
        'userData', 
        'userId'
      ];
      
      await AsyncStorage.multiRemove(keys);
      console.log('[AuthService] All auth data cleared');
    } catch (error) {
      console.error('[AuthService] Error during logout:', error);
    }
  }
}

export default new AuthService(); 