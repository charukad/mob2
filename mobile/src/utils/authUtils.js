import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreAuthToken } from '../store/slices/authSlice';

/**
 * Checks if user has valid authentication tokens in storage
 * @returns {Promise<boolean>} True if valid tokens exist
 */
export const checkAuthTokens = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    return !!(token && refreshToken);
  } catch (error) {
    console.error('Error checking auth tokens:', error);
    return false;
  }
};

/**
 * Initialize authentication state from storage
 * @param {Function} dispatch Redux dispatch function
 * @returns {Promise<void>}
 */
export const initializeAuth = async (dispatch) => {
  try {
    console.log('Initializing auth state from storage');
    const hasTokens = await checkAuthTokens();
    
    if (hasTokens) {
      console.log('Found tokens in storage, restoring auth state');
      await dispatch(restoreAuthToken());
    } else {
      console.log('No auth tokens found in storage');
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
  }
};

/**
 * Debug the current authentication state
 * @param {Object} state Redux auth state
 * @returns {Promise<Object>} Authentication status
 */
export const debugAuthState = async (state) => {
  try {
    const storageToken = await AsyncStorage.getItem('authToken');
    const storageRefreshToken = await AsyncStorage.getItem('refreshToken');
    
    const reduxToken = state.token;
    const reduxRefreshToken = state.refreshToken;
    const isAuthenticated = state.isAuthenticated;
    
    const status = {
      storage: {
        token: !!storageToken,
        refreshToken: !!storageRefreshToken,
        tokenFirstChars: storageToken ? storageToken.substring(0, 10) + '...' : 'none',
      },
      redux: {
        token: !!reduxToken,
        refreshToken: !!reduxRefreshToken,
        isAuthenticated,
        tokenFirstChars: reduxToken ? reduxToken.substring(0, 10) + '...' : 'none',
      },
      syncStatus: {
        tokensMatch: !!storageToken && !!reduxToken && 
                    storageToken.substring(0, 10) === reduxToken.substring(0, 10),
        refreshTokensMatch: !!storageRefreshToken && !!reduxRefreshToken,
        isStateConsistent: (!!reduxToken === isAuthenticated)
      }
    };
    
    console.log('Auth state debug info:', status);
    return status;
  } catch (error) {
    console.error('Error debugging auth state:', error);
    return { error: error.message };
  }
}; 