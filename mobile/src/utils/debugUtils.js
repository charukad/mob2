/**
 * Debug and Environment Utilities
 * Provides logging, error handling, and environment configuration
 */

// Environment configuration - centralizes all environment-specific settings
export const ENV = {
  // Environment detection
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
  
  // Feature flags
  enableVerboseLogging: __DEV__, // Only enable verbose logging in development
  enableDebugUI: __DEV__, // Show debug UI elements only in development
  enableNetworkLogger: __DEV__, // Log network requests in development
  
  // Service configuration
  services: {
    // Socket service configuration
    socket: {
      enableReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      logEvents: __DEV__,
    },
    
    // API service configuration  
    api: {
      timeout: 45000, // 45 seconds
      retryCount: 3,
      retryDelay: 1000,
      logRequests: __DEV__,
      logResponses: __DEV__,
    },
    
    // Cache configuration
    cache: {
      enabled: true,
      expiration: 15 * 60 * 1000, // 15 minutes
    }
  },
  
  // Application constants
  constants: {
    appName: 'SriLankaGuide',
    appNamespace: 'lk.guide.travel',
    timeZone: 'Asia/Colombo',
  }
};

/**
 * Logging utilities - prefixes all logs with app name and handles log levels
 */
const Logger = {
  enabled: ENV.enableVerboseLogging,
  prefix: `🧭 ${ENV.constants.appName}`,
  
  log(message, data, forceLog = false) {
    if (!this.enabled && !forceLog) return;
    
    if (data !== undefined) {
      console.log(`${this.prefix} | ${message}`, data);
    } else {
      console.log(`${this.prefix} | ${message}`);
    }
  },
  
  warn(message, data) {
    if (!this.enabled) return;
    
    if (data !== undefined) {
      console.warn(`⚠️ ${this.prefix} | ${message}`, data);
    } else {
      console.warn(`⚠️ ${this.prefix} | ${message}`);
    }
  },
  
  error(message, error) {
    // Always log errors regardless of environment
    if (error) {
      console.error(`❌ ${this.prefix} | ${message}`, error);
    } else {
      console.error(`❌ ${this.prefix} | ${message}`);
    }
  },
  
  group(title) {
    if (!this.enabled) return;
    console.group(`${this.prefix} | ${title}`);
  },
  
  groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  },
};

export const logger = Logger;

/**
 * User & Authentication Debug Utilities
 */

/**
 * Log current Redux auth state with improved formatting
 * @param {Object} authState - The auth state from Redux
 */
export const logAuthState = (authState) => {
  if (!ENV.enableVerboseLogging) return;
  
  const { user, isAuthenticated, token } = authState || {};
  
  logger.group('Auth Debug Info');
  logger.log('Is Authenticated:', isAuthenticated);
  logger.log('Has Token:', !!token);
  
  if (user) {
    logger.log('User ID:', user._id);
    logger.log('User Role:', user.role);
    logger.log('User Email:', user.email);
    
    if (user.role === 'vehicleOwner') {
      logger.log('VehicleOwner Info:', user.vehicleOwner || 'Not found');
    } else if (user.role === 'guide') {
      logger.log('Guide Info:', user.guide || 'Not found');
    } else if (user.role === 'tourist') {
      logger.log('Tourist Info:', user.tourist || 'Not found');
    }
  } else {
    logger.log('User data is missing');
  }
  
  logger.groupEnd();
};

/**
 * Check if there's a mismatch between role in user object and the nested role-specific object
 * @param {Object} user - User object from Redux state
 * @returns {boolean} - True if there's a mismatch
 */
export const checkRoleMismatch = (user) => {
  if (!user) return false;
  
  const { role } = user;
  
  switch (role) {
    case 'vehicleOwner':
      if (!user.vehicleOwner) {
        logger.warn('Role mismatch: User has vehicleOwner role but missing vehicleOwner data');
        return true;
      }
      break;
    case 'guide':
      if (!user.guide) {
        logger.warn('Role mismatch: User has guide role but missing guide data');
        return true;
      }
      break;
    case 'tourist':
      if (!user.tourist) {
        logger.warn('Role mismatch: User has tourist role but missing tourist data');
        return true;
      }
      break;
    default:
      logger.warn(`Unknown role: ${role}`);
      return true;
  }
  
  return false;
};

/**
 * Network utility functions
 */
export const network = {
  /**
   * Format API errors for consistent error handling
   * @param {Error} error - The error from API call
   * @param {String} context - Where the error occurred
   * @returns {Object} Formatted error object
   */
  formatApiError(error, context = 'API') {
    const formatted = {
      message: error?.message || 'Unknown error',
      code: error?.response?.status,
      context,
      timestamp: new Date().toISOString(),
    };
    
    // Add response data if available
    if (error?.response?.data) {
      formatted.data = error.response.data;
    }
    
    // Add network info
    if (error?.isNetworkError) {
      formatted.isNetworkError = true;
    }
    
    // Add authentication info
    if (error?.isAuthError || formatted.code === 401) {
      formatted.isAuthError = true;
    }
    
    logger.error(`${context} Error:`, formatted);
    return formatted;
  }
};

/**
 * Debug UI utils - features only shown in development mode
 */
export const debugUI = {
  shouldShow() {
    return ENV.enableDebugUI;
  },
  
  getDebugInfo() {
    if (!ENV.enableDebugUI) return null;
    
    return {
      environment: __DEV__ ? 'Development' : 'Production',
      version: '1.0.0', // This should be replaced with actual app version
      buildNumber: '1', // This should be replaced with actual build number
    };
  }
};

// Export all utilities
export default {
  ENV,
  logger,
  logAuthState,
  checkRoleMismatch,
  network,
  debugUI
}; 