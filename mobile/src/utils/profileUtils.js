import axios from '../api/axios';
import { API_ENDPOINTS, API_URL } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default/fallback avatar options
export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=U&background=2196f3&color=fff&size=256';
export const AVATAR_BACKGROUND_COLORS = ['2196f3', '4CAF50', 'FFC107', 'E91E63', '9C27B0', '3F51B5'];

// In-memory cache for immediate access without AsyncStorage delays
const profileImageMemoryCache = {};

// AsyncStorage key prefix
const CACHE_KEY_PREFIX = 'avatar_cache_';

// Add a memory cache for profile images fetched from GET_IMAGES endpoint
let globalProfileImagesCache = [];
let lastFetchTime = 0;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize profile image cache from AsyncStorage
 * This should be called when the app starts
 */
export const initProfileImageCache = async () => {
  try {
    // Get all AsyncStorage keys
    const keys = await AsyncStorage.getAllKeys();
    const avatarKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
    
    // Load all avatar cache entries into memory
    for (const key of avatarKeys) {
      const email = key.substring(CACHE_KEY_PREFIX.length);
      const url = await AsyncStorage.getItem(key);
      if (url) {
        profileImageMemoryCache[email] = url;
      }
    }
    
    console.log(`Initialized avatar cache with ${Object.keys(profileImageMemoryCache).length} entries`);
  } catch (error) {
    console.error('Error initializing profile image cache:', error);
  }
};

/**
 * Get a user's profile image by email with improved caching
 * @param {string} email - User email
 * @returns {Promise<string>} - Profile image URL
 */
export const getProfileImageByEmail = async (email) => {
  if (!email) {
    return generateFallbackAvatar(email);
  }
  
  try {
    // First check memory cache for instant access
    if (profileImageMemoryCache[email]) {
      const cachedUrl = profileImageMemoryCache[email];
      
      // Only return cached Cloudinary URLs, not fallbacks
      if (cachedUrl.includes('cloudinary.com')) {
        const cloudinaryIdMatch = cachedUrl.match(/\/upload\/v\d+\/([^/]+)\./);
        const cloudinaryId = cloudinaryIdMatch ? cloudinaryIdMatch[1] : 'unknown';
        console.log('➡️ USING CACHED CLOUDINARY URL');
        console.log('📧 EMAIL:', email);
        console.log('☁️ CLOUDINARY ID:', cloudinaryId);
        return cachedUrl;
      }
    }
    
    // Try direct fetch with fetch API for more debugging
    try {
      // Try a more direct API endpoint first - ProfileImage model
      const directUrl = `${API_URL}/profile-images/by-email/${encodeURIComponent(email)}`;
      console.log('🔍 Fetching profile image from:', directUrl);
      
      const response = await fetch(directUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 API response data:', JSON.stringify(data).substring(0, 200));
        
        if (data.success && data.data && data.data.profileImage) {
          const imageUrl = data.data.profileImage;
          
          // Verify this is indeed a Cloudinary URL
          if (imageUrl.includes('cloudinary.com')) {
            // Extract and log Cloudinary ID
            const cloudinaryIdMatch = imageUrl.match(/\/upload\/v\d+\/([^/]+)\./);
            const cloudinaryId = cloudinaryIdMatch ? cloudinaryIdMatch[1] : 'unknown';
            console.log('✅ FOUND CLOUDINARY IMAGE IN API');
            console.log('📧 EMAIL:', email);
            console.log('☁️ CLOUDINARY ID:', cloudinaryId);
            console.log('🖼️ IMAGE URL:', imageUrl);
            
            // Cache it
            profileImageMemoryCache[email] = imageUrl;
            await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${email}`, imageUrl);
            return imageUrl;
          } else {
            console.log('❌ API returned non-Cloudinary URL:', imageUrl);
          }
        } else {
          console.log('❌ API response does not contain profileImage data');
        }
      } else {
        console.log(`❌ API request failed with status ${response.status}`);
      }
    } catch (directFetchError) {
      console.log(`❌ API request error: ${directFetchError.message}`);
    }
    
    // If direct fetch failed, try alternative endpoint formats as fallback
    // This is our last resort before returning a fallback avatar
    const alternativeEndpoints = [
      `${API_URL}/users/profile-image/${encodeURIComponent(email)}`,
      `http://10.0.2.2:5008/api/profile-images/by-email/${encodeURIComponent(email)}`,
      API_ENDPOINTS.USERS.PROFILE_IMAGE(email)
    ];
    
    for (const endpoint of alternativeEndpoints) {
      try {
        console.log('🔄 Trying alternative endpoint:', endpoint);
        
        const altResponse = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log('📊 Alt API response:', JSON.stringify(altData).substring(0, 100));
          
          let imageUrl = null;
          
          // Try different response formats
          if (altData.data && altData.data.profileImage) {
            imageUrl = altData.data.profileImage;
          } else if (altData.profileImage) {
            imageUrl = altData.profileImage;
          }
          
          if (imageUrl && imageUrl.includes('cloudinary.com')) {
            // Extract and log Cloudinary ID for alternative endpoint
            const cloudinaryIdMatch = imageUrl.match(/\/upload\/v\d+\/([^/]+)\./);
            const cloudinaryId = cloudinaryIdMatch ? cloudinaryIdMatch[1] : 'unknown';
            console.log('✅ FOUND CLOUDINARY IMAGE IN ALT API');
            console.log('📧 EMAIL:', email);
            console.log('☁️ CLOUDINARY ID:', cloudinaryId);
            console.log('🖼️ IMAGE URL:', imageUrl);
            
            // Cache it
            profileImageMemoryCache[email] = imageUrl;
            await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${email}`, imageUrl);
            return imageUrl;
          } else if (imageUrl) {
            console.log('❌ Alternative API returned non-Cloudinary URL:', imageUrl);
          }
        }
      } catch (altError) {
        console.log(`❌ Alternative API request error: ${altError.message}`);
      }
    }
    
    // If we got here, we couldn't find a Cloudinary URL
    console.log('⚠️ No Cloudinary URL found for email:', email);
    const fallbackImage = generateFallbackAvatar(email);
    return fallbackImage;
  } catch (error) {
    console.error(`❌ Critical error fetching profile image: ${error.message}`);
    return generateFallbackAvatar(email);
  }
};

/**
 * Generate a fallback avatar URL
 * @param {string} identifier - Email or name to use for the avatar
 * @returns {string} - Fallback avatar URL
 */
const generateFallbackAvatar = (identifier) => {
  if (!identifier) return DEFAULT_AVATAR;
  
  // Select a consistent color based on the identifier
  const colorIndex = Math.abs(
    identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % AVATAR_BACKGROUND_COLORS.length;
  
  const bgColor = AVATAR_BACKGROUND_COLORS[colorIndex];
  
  if (identifier.includes('@')) {
    const name = identifier.split('@')[0];
    // Capitalize first letter of each word
    const formattedName = name
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
      
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=${bgColor}&color=fff&size=256`;
  }
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(identifier.charAt(0).toUpperCase())}&background=${bgColor}&color=fff&size=256`;
};

/**
 * Reset the profile image cache for a specific email
 * @param {string} email - User email (optional, if not provided, clear all cache)
 */
export const resetProfileImageCache = async (email) => {
  try {
    if (email) {
      // Clear specific email from both caches
      delete profileImageMemoryCache[email];
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${email}`);
      console.log(`Cleared cache for ${email}`);
    } else {
      // Clear all avatar cache
      Object.keys(profileImageMemoryCache).forEach(key => delete profileImageMemoryCache[key]);
      
      // Get all AsyncStorage keys related to avatars
      const keys = await AsyncStorage.getAllKeys();
      const avatarKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(avatarKeys);
      console.log(`Cleared entire avatar cache (${avatarKeys.length} entries)`);
    }
  } catch (error) {
    console.error('Error clearing profile image cache:', error);
  }
};

/**
 * Check if a URL is a UI Avatars fallback URL
 * @param {string} url - The URL to check
 * @returns {boolean} - Whether the URL is a UI Avatars URL
 */
const isUiAvatarUrl = (url) => {
  return url && typeof url === 'string' && url.includes('ui-avatars.com');
};

/**
 * Get avatar URL with appropriate fallbacks - DIRECT METHOD
 * This is a synchronous function that returns immediately with the best available option
 * @param {Object} user - User object 
 * @returns {string} - Avatar URL
 */
export const getAvatarUrl = (user) => {
  if (!user) return DEFAULT_AVATAR;
  
  // Direct fields first (synchronous, immediate)
  // Add timestamp to prevent caching issues
  const timestamp = `?t=${Date.now()}`;
  
  // Check for real profile images first (not UI Avatar fallbacks)
  if (user.profileImage && !isUiAvatarUrl(user.profileImage)) {
    // Only add timestamp if not already present
    return user.profileImage.includes('?') ? user.profileImage : user.profileImage + timestamp;
  }
  
  if (user.avatar && !isUiAvatarUrl(user.avatar)) {
    return user.avatar.includes('?') ? user.avatar : user.avatar + timestamp;
  }
  
  if (user.image && !isUiAvatarUrl(user.image)) {
    return user.image.includes('?') ? user.image : user.image + timestamp;
  }
  
  if (user.profile?.avatar && !isUiAvatarUrl(user.profile.avatar)) {
    return user.profile.avatar.includes('?') ? user.profile.avatar : user.profile.avatar + timestamp;
  }
  
  if (user.profile?.profileImage && !isUiAvatarUrl(user.profile.profileImage)) {
    return user.profile.profileImage.includes('?') ? user.profile.profileImage : user.profile.profileImage + timestamp;
  }
  
  // Check memory cache for email-based avatar (still synchronous)
  if (user.email && profileImageMemoryCache[user.email]) {
    const cachedUrl = profileImageMemoryCache[user.email];
    // Prefer cache only if it's not a UI Avatar
    if (!isUiAvatarUrl(cachedUrl)) {
      return cachedUrl.includes('?') ? cachedUrl : cachedUrl + timestamp;
    }
  }
  
  // Now check existing UI Avatar URLs if we haven't found anything better
  if (user.profileImage) {
    return user.profileImage.includes('?') ? user.profileImage : user.profileImage + timestamp;
  }
  
  if (user.avatar) {
    return user.avatar.includes('?') ? user.avatar : user.avatar + timestamp;
  }
  
  if (user.profile?.avatar) {
    return user.profile.avatar.includes('?') ? user.profile.avatar : user.profile.avatar + timestamp;
  }
  
  if (user.profile?.profileImage) {
    return user.profile.profileImage.includes('?') ? user.profile.profileImage : user.profile.profileImage + timestamp;
  }
  
  if (user.email && profileImageMemoryCache[user.email]) {
    const cachedUrl = profileImageMemoryCache[user.email];
    return cachedUrl.includes('?') ? cachedUrl : cachedUrl + timestamp;
  }
  
  // Use name or initials for fallback avatar
  if (user.firstName && user.lastName) {
    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    
    // Select a consistent color based on the user's name
    const nameFull = `${user.firstName}${user.lastName}`;
    const colorIndex = Math.abs(
      nameFull.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % AVATAR_BACKGROUND_COLORS.length;
    
    const bgColor = AVATAR_BACKGROUND_COLORS[colorIndex];
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=256${timestamp}`;
  }
  
  if (user.name) {
    // Get initials from name (first letter of each word)
    const initials = user.name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2);
      
    // Select a consistent color based on the name
    const colorIndex = Math.abs(
      user.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % AVATAR_BACKGROUND_COLORS.length;
    
    const bgColor = AVATAR_BACKGROUND_COLORS[colorIndex];
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=256${timestamp}`;
  }
  
  if (user.email) {
    // Start async fetch but don't wait for it
    getProfileImageByEmail(user.email).catch(() => {});
    
    // Get first character of email username
    const initial = user.email.split('@')[0].charAt(0).toUpperCase();
    
    // Select a consistent color based on the email
    const colorIndex = Math.abs(
      user.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % AVATAR_BACKGROUND_COLORS.length;
    
    const bgColor = AVATAR_BACKGROUND_COLORS[colorIndex];
    
    // Return immediately with a fallback
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${bgColor}&color=fff&size=256${timestamp}`;
  }
  
  // Ultimate fallback
  return DEFAULT_AVATAR + `?t=${Date.now()}`;
};

/**
 * Get profile image using the same approach as the profile screen
 * This checks all profile images and finds the one with matching email
 * @param {string} email - User email 
 * @returns {Promise<string>} - Profile image URL
 */
export const getProfileImageFromGlobal = async (email) => {
  if (!email) {
    return generateFallbackAvatar(email);
  }
  
  try {
    const currentTime = Date.now();
    
    // Refresh cache if it's expired or empty
    if (globalProfileImagesCache.length === 0 || currentTime - lastFetchTime > CACHE_EXPIRY) {
      try {
        const api = require('../api/axios').default;
        const { API_ENDPOINTS } = require('../constants/api');
        
        const response = await api.get(API_ENDPOINTS.PROFILE.GET_IMAGES);
        
        if (response?.data?.success && response.data.data.length > 0) {
          globalProfileImagesCache = response.data.data;
          lastFetchTime = currentTime;
        }
      } catch (error) {
        console.log('Failed to refresh profile image cache:', error.message);
      }
    }
    
    // Find the matching active image from cache
    const activeImage = globalProfileImagesCache.find(img => 
      img.isActive && img.email === email
    );
    
    if (activeImage && activeImage.imageUrl) {
      return activeImage.imageUrl;
    }
    
    // Fall back to original function if not found in cache
    return await getProfileImageByEmail(email);
  } catch (error) {
    console.error('Error in getProfileImageFromGlobal:', error.message);
    // Fall back to original function
    return await getProfileImageByEmail(email);
  }
};

/**
 * Clears the profile image cache to force fresh loading
 * This should be called after the user updates their profile image
 */
export const clearProfileImageCache = () => {
  globalProfileImagesCache = [];
  lastFetchTime = 0;
  // Also clear memory cache for individual emails
  Object.keys(profileImageMemoryCache).forEach(key => delete profileImageMemoryCache[key]);
  console.log('Profile image cache cleared');
}; 