// src/utils/SafeStyleSheet.js
import { StyleSheet } from 'react-native';

// Default fallback values for commonly used style properties
const defaultStyles = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  fontSize: 14,
  padding: 0,
  margin: 0,
  borderWidth: 0,
  borderColor: 'transparent',
};

/**
 * Creates a StyleSheet with fallback values to prevent undefined errors
 * @param {Object} styles - Style definitions
 * @returns {Object} - StyleSheet with fallback protection
 */
export function createSafeStyleSheet(styles) {
  // Process each style definition to add fallbacks
  const processedStyles = {};
  
  for (const [key, style] of Object.entries(styles)) {
    // Ensure style is an object
    const safeStyle = typeof style === 'object' && style !== null ? {...style} : {};
    
    // Create a proxy that returns default values for undefined properties
    processedStyles[key] = new Proxy(safeStyle, {
      get: (target, prop) => {
        if (prop in target) {
          return target[prop];
        }
        return defaultStyles[prop] || undefined;
      }
    });
  }
  
  return StyleSheet.create(processedStyles);
}

export default createSafeStyleSheet;