import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/axios';
import { API_ENDPOINTS } from '../../constants/api';

// Async thunks for authentication actions
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('[Auth] Login attempt for:', credentials.email);
      
      // First check if we have cached login data for this user
      const cachedEmail = await AsyncStorage.getItem('lastLoginEmail');
      const cachedAuthData = await AsyncStorage.getItem('cachedAuthData');
      
      // Check for cached auth data when offline
      if (cachedEmail === credentials.email && cachedAuthData) {
        // Get network state
        const NetInfo = require('@react-native-community/netinfo').default;
        const networkState = await NetInfo.fetch();
        
        // If we're offline but have cached credentials, use them temporarily
        // More lenient check - only consider offline if definitely offline
        if (!networkState.isConnected || networkState.isInternetReachable === false) {
          console.log('[Auth] Using cached auth data for offline login');
          try {
            const parsedData = JSON.parse(cachedAuthData);
            
            // Store a flag indicating this is offline mode
            await AsyncStorage.setItem('isOfflineMode', 'true');
            
            return {
              ...parsedData,
              isOfflineLogin: true
            };
          } catch (parseError) {
            console.error('[Auth] Error parsing cached auth data:', parseError);
            // Continue with normal login flow
          }
        }
      }
      
      // Attempt normal login with better error logging
      console.log('[Auth] Making API login request to:', API_ENDPOINTS.AUTH.LOGIN);
      
      try {
        const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, credentials, {
          isAuthRequest: true, // Mark as auth request for special handling
          timeout: 15000, // Longer timeout for login
        });
        
        console.log('[Auth] Login successful for:', credentials.email);
        
        // Store tokens and user data in AsyncStorage
        await AsyncStorage.setItem('authToken', response.data.token);
        
        // Only store refreshToken if it exists in the response
        if (response.data.refreshToken) {
          await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        } else {
          // Remove any existing refreshToken to avoid inconsistencies
          await AsyncStorage.removeItem('refreshToken');
        }
        
        // Cache credentials for offline login
        await AsyncStorage.setItem('lastLoginEmail', credentials.email);
        await AsyncStorage.setItem('cachedAuthData', JSON.stringify(response.data));
        
        // Remove offline mode flag if it exists
        await AsyncStorage.removeItem('isOfflineMode');
        
        // Save user data for consistent access across the app
        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          
          // Also save in userData format for compatibility with other systems
          const userData = {
            user: response.data.user,
            token: response.data.token,
            refreshToken: response.data.refreshToken || null // Make sure refreshToken is null if not present
          };
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          
          console.log('[Auth] User data saved to AsyncStorage during login');
        } else {
          console.error('[Auth] Login response missing user data');
        }
        
        // Make sure we return a consistent object structure even if refreshToken is missing
        return {
          ...response.data,
          refreshToken: response.data.refreshToken || null // Ensure refreshToken is null when missing
        };
      } catch (apiError) {
        // Enhanced error logging for debugging
        console.error('[Auth] API Login error:', JSON.stringify({
          status: apiError.response?.status,
          data: apiError.response?.data,
          message: apiError.message,
          url: apiError.config?.url,
        }));
        
        // Re-throw to be handled by the outer catch
        throw apiError;
      }
    } catch (error) {
      // Check if this is a network error
      if (error.isNetworkError || error.message?.includes('network') || 
          error.message?.includes('internet') || !error.response) {
        console.error('[Auth] Login network error:', error.message);
        
        // Try to find cached credentials as fallback
        try {
          const cachedEmail = await AsyncStorage.getItem('lastLoginEmail');
          const cachedAuthData = await AsyncStorage.getItem('cachedAuthData');
          
          if (cachedEmail === credentials.email && cachedAuthData) {
            console.log('[Auth] Network error during login, using cached credentials');
            const parsedData = JSON.parse(cachedAuthData);
            
            // Store a flag indicating this is offline mode
            await AsyncStorage.setItem('isOfflineMode', 'true');
            
            return {
              ...parsedData,
              isOfflineLogin: true,
              message: 'Logged in using cached credentials. Some features may be limited until you reconnect.'
            };
          }
        } catch (cacheError) {
          console.error('[Auth] Error accessing cached credentials:', cacheError);
        }
        
        return rejectWithValue(
          'No internet connection. Please check your network settings and try again.'
        );
      }
      
      // For specific 401 errors (invalid credentials), provide a clearer error message
      if (error.response?.status === 401) {
        console.error('[Auth] Login failed - Invalid credentials for:', credentials.email);
        return rejectWithValue(
          'Invalid email or password. Please check your credentials and try again.'
        );
      }
      
      console.error('[Auth] Login error:', error.response?.data || error.message);
      return rejectWithValue(
        error.response?.data?.message || 'Login failed. Please try again.'
      );
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Email verification failed. Please try again.'
      );
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Password reset request failed. Please try again.'
      );
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Password reset failed. Please try again.'
      );
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Remove tokens from AsyncStorage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      return null;
    } catch (error) {
      return rejectWithValue('Logout failed');
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      // Check if token exists
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        return rejectWithValue('No authentication token');
      }
      
      // Get user profile
      const response = await api.get(API_ENDPOINTS.AUTH.ME);
      return response.data.data.user;
    } catch (error) {
      // Remove invalid tokens
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load user profile'
      );
    }
  }
);

export const restoreAuthToken = createAsyncThunk(
  'auth/restoreAuthToken',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Check if token exists in AsyncStorage
      const token = await AsyncStorage.getItem('authToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      console.log('Restoring auth tokens from AsyncStorage');
      console.log('Token exists in AsyncStorage:', !!token);
      console.log('Refresh token exists in AsyncStorage:', !!refreshToken);
      
      if (token && refreshToken) {
        // If tokens exist in AsyncStorage but not in Redux state, load the user
        console.log('Found tokens in AsyncStorage, loading user data');
        
        try {
          // Try to load user data, but don't fail if it doesn't work
          await dispatch(loadUser());
          console.log('User data loaded successfully');
        } catch (userError) {
          // If loading user fails, we'll still return the tokens
          // This ensures we can at least try to make API calls with the existing token
          console.log('Warning: Could not load user data, but tokens were found');
          console.log('Using tokens without verified user data');
        }
        
        return { token, refreshToken, forceAuthenticated: true };
      } else {
        console.log('No tokens found in AsyncStorage');
        return null;
      }
    } catch (error) {
      console.error('Error restoring auth tokens:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch }) => {
    try {
      // Try to get user data from AsyncStorage
      const userString = await AsyncStorage.getItem('user');
      const tokenString = await AsyncStorage.getItem('authToken');
      
      // If both user and token exist, dispatch loginSuccess
      if (userString && tokenString) {
        const user = JSON.parse(userString);
        const token = tokenString;
        console.log('[Auth] Initializing auth state from storage');
        
        // Dispatch login success to set the auth state
        return { user, token };
      }
      
      // No saved auth, return null
      return null;
    } catch (error) {
      console.error('[Auth] Error initializing auth state:', error);
      return null;
    }
  }
);

// Add this helper function inside the slice, before the reducer
const syncUserToStorage = async (user, token) => {
  try {
    if (user && token) {
      // Store user and token data consistently across different storage locations
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('authToken', token);
      
      // Store the user ID directly for easier access
      if (user._id) {
        await AsyncStorage.setItem('userId', user._id);
        console.log('[Auth] User ID saved to AsyncStorage:', user._id);
      }
      
      // Also store in userData format for compatibility
      const userData = { user, token };
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      console.log('[Auth] User data synced to AsyncStorage');
    } else if (!user && !token) {
      // Clear all auth data on logout
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userId');
      
      console.log('[Auth] User data cleared from AsyncStorage');
    }
  } catch (error) {
    console.error('[Auth] Error syncing user data to storage:', error);
  }
};

// Initial state
const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  authError: null,
  emailVerified: false,
  passwordResetSent: false,
  passwordResetSuccess: false,
  message: null,
};

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.authError = null;
    },
    clearAuthMessage: (state) => {
      state.message = null;
    },
    resetAuthState: (state) => {
      state.emailVerified = false;
      state.passwordResetSent = false;
      state.passwordResetSuccess = false;
      state.message = null;
      state.authError = null;
    },
    updateProfile: (state, action) => {
      if (action.payload.guide) {
        // If we're updating guide info, make sure we properly merge it
        state.user = {
          ...state.user,
          guide: {
            ...(state.user?.guide || {}),
            ...action.payload.guide
          }
        };
      } else if (action.payload.vehicleOwner) {
        // If we're updating vehicle owner info, make sure we properly merge it
        state.user = {
          ...state.user,
          vehicleOwner: {
            ...(state.user?.vehicleOwner || {}),
            ...action.payload.vehicleOwner
          }
        };
      } else if (action.payload._id && action.payload.email) {
        // We received a full user object from the API, replace the entire user
        state.user = action.payload;
      } else {
        // For other profile updates
        state.user = { ...state.user, ...action.payload };
      }
    },
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      state.loading = false;
      
      // Sync to AsyncStorage
      syncUserToStorage(action.payload.user, action.payload.token);
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      
      // Clear from AsyncStorage
      syncUserToStorage(null, null);
    },
  },
  extraReducers: (builder) => {
    builder
      // Register cases
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.authError = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.message = action.payload.message;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.authError = action.payload;
      })
      
      // Login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.authError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        
        // Ensure user data is synced to storage
        syncUserToStorage(action.payload.user, action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.authError = action.payload;
      })
      
      // Verify email cases
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.authError = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.emailVerified = true;
        state.message = action.payload.message;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.authError = action.payload;
      })
      
      // Forgot password cases
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.authError = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.passwordResetSent = true;
        state.message = action.payload.message;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.authError = action.payload;
      })
      
      // Reset password cases
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.authError = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.passwordResetSuccess = true;
        state.message = action.payload.message;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.authError = action.payload;
      })
      
      // Load user cases
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(loadUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      })
      
      // Restore auth token
      .addCase(restoreAuthToken.fulfilled, (state, action) => {
        if (action.payload) {
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          
          // Force authentication state if tokens are valid
          if (action.payload.forceAuthenticated) {
            state.isAuthenticated = true;
          }
          
          console.log('Auth tokens restored to Redux state');
          console.log('isAuthenticated set to:', state.isAuthenticated);
        }
      })
      .addCase(restoreAuthToken.rejected, (state, action) => {
        console.log('Failed to restore auth tokens:', action.payload);
      })
      
      // Add handler for initialize auth
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
      });
  },
});

export const { clearAuthError, clearAuthMessage, resetAuthState, updateProfile } = authSlice.actions;

export default authSlice.reducer;