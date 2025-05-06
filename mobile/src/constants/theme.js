// src/constants/theme.js
import { Platform } from 'react-native';
import { MD3LightTheme } from 'react-native-paper';

// Define colors with descriptive names
export const COLORS = {
  // Primary and accent colors
  primary: '#2196F3',
  secondary: '#FFC107',
  accent: '#FF4081',
  
  // UI colors
  background: '#FFFFFF',
  surface: '#F5F5F5',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#03A9F4',
  
  // Text colors
  text: '#212121',
  textLight: '#757575',
  
  // Utility colors
  white: '#FFFFFF',
  black: '#000000',
  gray: '#9E9E9E',
  lightGray: '#E0E0E0',
  divider: '#EEEEEE',
};

// Define typography scale
export const FONTS = {
  h1: { fontSize: 24, fontWeight: 'bold' },
  h2: { fontSize: 22, fontWeight: 'bold' },
  h3: { fontSize: 18, fontWeight: 'bold' },
  h4: { fontSize: 16, fontWeight: 'bold' },
  body1: { fontSize: 16 },
  body2: { fontSize: 15 },
  body3: { fontSize: 14 },
  body4: { fontSize: 12 },
  body3Bold: { fontSize: 14, fontWeight: 'bold' },
  body4Bold: { fontSize: 12, fontWeight: 'bold' },
};

// Define spacing scale for consistent layout
export const SIZES = {
  base: 8,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  padding: 16,
  radius: 8,
};

// Define spacing using the SIZES scale
export const spacing = {
  xs: SIZES.xs,
  sm: SIZES.sm,
  md: SIZES.md,
  lg: SIZES.lg,
  xl: SIZES.xl,
};

// Create the React Native Paper theme by extending MD3LightTheme
const paperTheme = {
  ...MD3LightTheme,
  dark: false,
  roundness: SIZES.radius,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    accent: COLORS.accent,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    text: COLORS.text,
    onSurface: COLORS.text,
    disabled: COLORS.textLight,
    placeholder: COLORS.textLight,
    backdrop: COLORS.background,
    notification: COLORS.accent,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    regular: {
      fontFamily: Platform.select({
        web: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
        ios: 'System',
        default: 'sans-serif',
      }),
      fontWeight: '400',
    },
    medium: {
      fontFamily: Platform.select({
        web: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
        ios: 'System',
        default: 'sans-serif-medium',
      }),
      fontWeight: '500',
    },
    bold: {
      fontFamily: Platform.select({
        web: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
        ios: 'System',
        default: 'sans-serif',
      }),
      fontWeight: '700',
    },
    bodySmall: {
      fontFamily: Platform.select({
        web: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
        ios: 'System',
        default: 'sans-serif',
      }),
      fontWeight: '400',
      fontSize: 12,
    },
  },
  animation: {
    scale: 1.0,
  },
};

// Export the theme object as default
export default paperTheme;