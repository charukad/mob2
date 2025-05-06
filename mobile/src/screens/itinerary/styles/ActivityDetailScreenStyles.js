// src/screens/itinerary/styles/ActivityDetailScreenStyles.js
import { StyleSheet, Dimensions } from 'react-native';

// Standalone hardcoded color palette
// This avoids circular dependencies with the main theme system
const ActivityColors = {
  primary: '#2196F3',
  error: '#F44336',
  background: '#FFFFFF', 
  surface: '#F5F5F5',
  text: '#212121',
  textLight: '#757575',
  gray: '#9E9E9E',
  lightGray: '#E0E0E0',
  divider: '#EEEEEE',
  white: '#FFFFFF',
  black: '#000000',
  
  // Activity type specific colors
  visitColor: '#2196F3',      // Using primary as default
  foodColor: '#FF8C00',       // Orange
  transportColor: '#4682B4',  // Steel Blue
  accommodationColor: '#8A2BE2', // Purple
  activityColor: '#32CD32',   // Lime Green
  otherColor: '#708090'       // Slate Gray
};

// Standalone activity type definitions
const ActivityTypes = {
  visit: {
    icon: 'map-marker',
    color: ActivityColors.visitColor,
    label: 'Visit'
  },
  food: {
    icon: 'food-fork-drink',
    color: ActivityColors.foodColor,
    label: 'Food'
  },
  transport: {
    icon: 'car',
    color: ActivityColors.transportColor,
    label: 'Transport'
  },
  accommodation: {
    icon: 'bed',
    color: ActivityColors.accommodationColor,
    label: 'Accommodation'
  },
  activity: {
    icon: 'hiking',
    color: ActivityColors.activityColor,
    label: 'Activity'
  },
  other: {
    icon: 'dots-horizontal',
    color: ActivityColors.otherColor,
    label: 'Other'
  }
};

const screenWidth = Dimensions.get('window').width;

// Component styles
const activityDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ActivityColors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: ActivityColors.error,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  carouselContainer: {
    height: 250,
  },
  carouselImage: {
    width: screenWidth,
    height: 250,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: ActivityColors.white,
  },
  defaultImageContainer: {
    height: 200,
    backgroundColor: ActivityColors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ActivityColors.primary,
  },
  contentContainer: {
    padding: 16,
  },
  typeBadgeContainer: {
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: ActivityColors.primary,
  },
  typeBadgeText: {
    color: ActivityColors.white,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 8,
  },
  durationText: {
    color: ActivityColors.textLight,
    marginLeft: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    marginLeft: 8,
  },
  divider: {
    marginBottom: 16,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    lineHeight: 24,
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationCard: {
    padding: 16,
    backgroundColor: ActivityColors.lightGray,
    borderRadius: 8,
  },
  locationName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationAddress: {
    color: ActivityColors.textLight,
    marginBottom: 12,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ActivityColors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  directionsText: {
    color: ActivityColors.white,
    marginLeft: 8,
  },
  costContainer: {
    marginBottom: 16,
  },
  costContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: ActivityColors.primary,
    marginLeft: 8,
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesCard: {
    padding: 16,
    backgroundColor: ActivityColors.lightGray,
    borderRadius: 8,
  },
  notes: {
    lineHeight: 24,
  },
});

// Export everything needed by the component
export {
  activityDetailStyles as styles,
  ActivityColors as colors,
  ActivityTypes as ACTIVITY_TYPES,
  screenWidth
};