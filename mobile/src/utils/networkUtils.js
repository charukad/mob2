import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Network check timeout
const NETWORK_CHECK_TIMEOUT = 3000;

// Flag to bypass network checks (for local development)
let bypassNetworkChecks = false;

/**
 * Bypass all network connectivity checks
 * This is useful for local development when internet is not available
 * but the local server is reachable
 * @param {boolean} bypass - Whether to bypass checks
 */
export const setBypassNetworkChecks = (bypass) => {
  bypassNetworkChecks = bypass;
  console.log(`[Network] Network checks ${bypass ? 'BYPASSED' : 'ENABLED'}`);
  
  // Store the setting
  AsyncStorage.setItem('bypassNetworkChecks', String(bypass))
    .catch(err => console.error('[Network] Error saving bypass setting:', err));
    
  return bypass;
};

/**
 * Initialize network utilities
 */
export const initNetworkUtils = async () => {
  try {
    // Load bypass setting
    const bypassSetting = await AsyncStorage.getItem('bypassNetworkChecks');
    if (bypassSetting === 'true') {
      bypassNetworkChecks = true;
      console.log('[Network] Network checks BYPASSED (loaded from storage)');
    }
  } catch (err) {
    console.error('[Network] Error loading bypass setting:', err);
  }
};

// Initialize immediately
initNetworkUtils();

/**
 * Enhanced network connectivity check with timeout and direct fetch test
 * @returns {Promise<boolean>} Whether internet is reachable
 */
export const checkInternetConnectivity = async () => {
  // If bypass is enabled, always return true
  if (bypassNetworkChecks) {
    return true;
  }
  
  try {
    // Check connection to local server first (if in development)
    if (__DEV__) {
      try {
        // Get API URL
        const { API_URL } = require('../constants/api');
        
        // Try to connect to the local server
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        console.log(`[Network] Checking local server at ${API_URL}`);
        const response = await fetch(`${API_URL}/health`, {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok || response.status === 404) {
          // If we get any response (even 404), the server is reachable
          console.log('[Network] Local server is reachable');
          return true;
        }
      } catch (localError) {
        console.log('[Network] Local server check failed:', localError.message);
        // Continue with other checks
      }
    }
  
    // First try NetInfo (fast but sometimes unreliable)
    const networkStatePromise = NetInfo.fetch();
    
    // Create a timeout promise for NetInfo
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network check timeout')), NETWORK_CHECK_TIMEOUT);
    });
    
    // Race the network check against the timeout
    const networkState = await Promise.race([networkStatePromise, timeoutPromise]);
    
    // If NetInfo definitely says we're offline, trust it and return false
    if (!networkState.isConnected) {
      return false;
    }
    
    // If NetInfo says we're definitely online, trust it and return true
    if (networkState.isConnected && networkState.isInternetReachable === true) {
      return true;
    }
    
    // If NetInfo is uncertain (isInternetReachable is null), perform a direct fetch test
    try {
      // Try to fetch Google's homepage (very reliable and fast)
      const controller = new AbortController();
      const fetchTimeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(fetchTimeoutId);
      return response.ok;
    } catch (fetchError) {
      // If fetch fails, we're definitely offline
      console.log('[Network] Fetch test failed:', fetchError.message);
      return false;
    }
  } catch (error) {
    console.log('[Network] Network check failed:', error.message);
    
    // If NetInfo fails, fall back to a direct fetch test
    try {
      const controller = new AbortController();
      const fetchTimeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(fetchTimeoutId);
      return response.ok;
    } catch (fetchError) {
      console.log('[Network] Fallback fetch test failed:', fetchError.message);
      return false;
    }
  }
};

/**
 * Add network state event listener with improved reliability
 * @param {Function} callback Function to call on network state change
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNetworkChanges = (callback) => {
  let lastKnownState = null;
  
  // Set up periodic fetch check to supplement NetInfo
  const fetchCheckInterval = setInterval(async () => {
    try {
      const controller = new AbortController();
      const fetchTimeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(fetchTimeoutId);
      
      // If fetch successful and last state was offline or unknown, update to online
      if (response.ok && (lastKnownState === false || lastKnownState === null)) {
        lastKnownState = true;
        callback(true);
      }
    } catch (error) {
      // Don't update to offline based on fetch failure alone
      // This just serves as a supplementary check for coming back online
    }
  }, 30000); // Every 30 seconds to avoid excessive requests
  
  // Subscribe to NetInfo events
  const unsubscribe = NetInfo.addEventListener(state => {
    // Definitely offline
    if (!state.isConnected) {
      lastKnownState = false;
      callback(false);
      return;
    }
    
    // Definitely online
    if (state.isConnected && state.isInternetReachable === true) {
      lastKnownState = true;
      callback(true);
      return;
    }
    
    // Uncertain - don't trigger state change for null isInternetReachable
    // Let the periodic fetch check handle this case
  });
  
  // Return combined cleanup function
  return () => {
    clearInterval(fetchCheckInterval);
    unsubscribe();
  };
};

/**
 * Gets last known network state from storage or performs a check
 * @param {boolean} forceCheck Force a fresh check even if we have cached state
 * @returns {Promise<boolean>} Network state 
 */
export const getNetworkState = async (forceCheck = false) => {
  try {
    if (!forceCheck) {
      // Try to get cached network state first (faster response)
      const cachedState = await AsyncStorage.getItem('networkState');
      if (cachedState !== null) {
        return cachedState === 'true';
      }
    }
    
    // If no cached state or force check, check network
    const isConnected = await checkInternetConnectivity();
    
    // Cache the result for next time
    await AsyncStorage.setItem('networkState', String(isConnected));
    
    return isConnected;
  } catch (error) {
    console.log('[Network] Error getting network state:', error);
    return false; // Assume offline on error
  }
};

/**
 * Try to determine if we're in a development environment
 * @returns {boolean} True if in development
 */
export const isLocalDevelopment = () => {
  return __DEV__ && Platform.OS !== 'web';
};

/**
 * Get the appropriate server URL based on network conditions
 * @returns {Promise<string|null>} The best API URL to use or null if all fail
 */
export const getWorkingApiUrl = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem('workingApiUrl');
    if (savedUrl) {
      return savedUrl;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Debug utility to test direct connectivity to the server
 * Bypasses the NetInfo check to directly attempt a connection
 * @param {string} serverUrl - The server URL to check
 * @returns {Promise<{success: boolean, message: string, latency?: number}>}
 */
export const debugServerConnection = async (serverUrl) => {
  const startTime = Date.now();
  try {
    // Make a simple fetch with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${serverUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      return {
        success: true,
        message: `Server connected successfully. Latency: ${latency}ms`,
        latency
      };
    } else {
      return {
        success: false,
        message: `Server returned error: ${response.status} ${response.statusText}`,
        latency
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    
    // Check if it's a timeout
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Connection timed out after 5 seconds',
        latency
      };
    }
    
    return {
      success: false,
      message: `Connection error: ${error.message}`,
      latency
    };
  }
};

/**
 * Run a complete connectivity diagnostic
 * @returns {Promise<Object>} Diagnostic results
 */
export const runNetworkDiagnostic = async () => {
  try {
    // Get network state from NetInfo
    const networkState = await NetInfo.fetch();
    
    // Get server URLs to test
    const { API_URL, API_URL_OPTIONS } = require('../constants/api');
    
    // Test each server URL
    const serverTests = [];
    const urlsToTest = [API_URL, ...API_URL_OPTIONS];
    
    for (const url of new Set(urlsToTest)) {
      const result = await debugServerConnection(url);
      serverTests.push({
        url,
        ...result
      });
    }
    
    return {
      netInfo: {
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        type: networkState.type,
        details: networkState.details,
      },
      ourDetermination: {
        isConnected: networkState.isConnected && (networkState.isInternetReachable !== false)
      },
      serverTests,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}; 