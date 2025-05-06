// src/utils/themeUtils.js

// Import the original theme exports
import paperTheme, { COLORS, FONTS, SIZES, spacing } from '../constants/theme';

// Re-export COLORS as colors to match the import statements in components
export const colors = COLORS;

// Re-export other theme properties for consistency and convenience
export { COLORS, FONTS, SIZES, spacing };

// Fallback values for cases where colors might still be undefined
export const fallbackColors = {
  primary: '#2196F3',
  secondary: '#FFC107',
  accent: '#FF4081',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#03A9F4',
  text: '#212121',
  textLight: '#757575',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9E9E9E',
  lightGray: '#E0E0E0',
  divider: '#EEEEEE',
};

/**
 * A safe way to access color values that prevents "undefined" errors
 * @param {string} colorName - The name of the color to retrieve
 * @returns {string} - The color value or a fallback
 */
export function getColor(colorName) {
  // Try to get from COLORS first
  if (COLORS && COLORS[colorName]) {
    return COLORS[colorName];
  }
  
  // Fall back to the predefined fallbacks
  return fallbackColors[colorName] || '#FFFFFF';
}

/**
 * Creates styles with safe color references
 * @param {Object} styleObj - Object with style definitions
 * @returns {Object} - Same styles with safe color references
 */
export function createSafeStyles(styleObj) {
  const safeStyles = {};
  
  // Process each style property
  for (const [key, value] of Object.entries(styleObj)) {
    // If the value is an object (a style definition), process it
    if (typeof value === 'object' && value !== null) {
      const safeStyle = { ...value };
      
      // Process color properties to ensure they're safe
      for (const [prop, propValue] of Object.entries(safeStyle)) {
        // If the property appears to be a color reference to colors.X
        if (typeof propValue === 'string' && propValue.startsWith('colors.')) {
          const colorName = propValue.split('.')[1];
          safeStyle[prop] = getColor(colorName);
        }
      }
      
      safeStyles[key] = safeStyle;
    } else {
      safeStyles[key] = value;
    }
  }
  
  return safeStyles;
}

// Export the paper theme as default
export default paperTheme;